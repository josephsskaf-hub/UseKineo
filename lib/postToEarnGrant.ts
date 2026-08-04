// lib/postToEarnGrant.ts — KINEO-POST-TO-EARN-2026-08-04
//
// O MOTOR que decide e paga a recompensa de Post to Earn. Server-only: usa o
// service role. As regras/números vivem em lib/postToEarn.ts (client-safe).
//
// ⚠️ ISTO GASTA DINHEIRO DE VERDADE. O arquivo foi escrito assumindo que
// alguém VAI tentar roubar, porque vai: a recompensa é automática, o input é
// uma URL pública e qualquer pessoa pode criar contas. As travas, em ordem de
// execução:
//
//   1. VERIFICAÇÃO REAL (não confia no formato da URL) — oEmbed do YouTube.
//      Uma string que "parece" um link de Short não vale nada: o id tem 11
//      caracteres do alfabeto base64url e é trivial inventar um. O oEmbed só
//      responde 200 para vídeo que EXISTE e está PÚBLICO — vídeo privado,
//      removido ou inventado cai fora. É o mesmo endpoint sem chave que
//      app/api/wall/refresh já usa (reuso, não reimplementação).
//
//   2. INTERESSE PROVADO — a conta precisa ter ≥1 vídeo gerado na Kineo.
//      Fecha a conta descartável criada só para colar link de terceiro.
//
//   3. DEDUPE GLOBAL — post_to_earn_claims.youtube_video_id é UNIQUE no
//      mundo. `posted_shorts` NÃO servia para isso: o unique de lá é
//      (user_id, youtube_video_id), ou seja, dez contas colando o mesmo
//      vídeo seriam dez linhas legítimas e dez pagamentos.
//
//   4. JANELA ROLANTE — 2 recompensas por 7 dias por usuário.
//
//   5. TETO VITALÍCIO — 30 créditos por usuário, e depois disso loga.
//
//   6. DISJUNTOR GLOBAL — 100 créditos/dia somando todo mundo.
//
// IDEMPOTÊNCIA: o INSERT do claim é a autorização. Ele acontece ANTES do
// crédito e é protegido pelo índice único global; quem perde a corrida recebe
// 23505 e devolve 'already_claimed' sem creditar. Se o crédito falhar depois,
// o claim é desfeito — o vídeo volta a poder ser recompensado, o que é o lado
// certo para errar (perder uma recompensa é recuperável; pagar duas vezes é
// dinheiro que não volta).

import { wallAdminClient } from '@/lib/wallOfProof'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  POST_TO_EARN_CREDITS,
  POST_TO_EARN_GLOBAL_DAILY_CREDIT_CAP,
  POST_TO_EARN_LIFETIME_CREDIT_CAP,
  POST_TO_EARN_MAX_PER_WINDOW,
  POST_TO_EARN_WINDOW_DAYS,
  postToEarnMessage,
  type PostToEarnReason,
  type PostToEarnResult,
} from '@/lib/postToEarn'

/** Timeout do oEmbed. A verificação não pode segurar a resposta do save. */
const OEMBED_TIMEOUT_MS = 6_000

/** Teto de linhas lidas nas contagens. Blindagem contra um estado corrompido
 *  virar uma leitura gigante — nenhum usuário legítimo passa de 10 claims. */
const CLAIM_READ_LIMIT = 500

type ClaimRow = { id: string; credits: number | null; created_at: string }

function result(reason: PostToEarnReason, credits: number, remaining: number): PostToEarnResult {
  return {
    granted: reason === 'granted',
    credits: reason === 'granted' ? credits : 0,
    reason,
    remainingThisWeek: Math.max(0, remaining),
    message: postToEarnMessage(reason, credits),
  }
}

/**
 * Confirma no YouTube que o vídeo existe e é PÚBLICO, e traz o canal.
 *
 * `null` significa "não deu para confirmar" e nunca é tratado como sucesso:
 * na dúvida, não paga. Um 404/401 do oEmbed é vídeo privado/removido/falso.
 */
export async function verifyPublicYouTubeVideo(
  youtubeId: string,
): Promise<{ title: string | null; channelTitle: string | null } | null> {
  const target = `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OEMBED_TIMEOUT_MS)
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (!res.ok) return null
    const json = (await res.json()) as { title?: unknown; author_name?: unknown }
    const title = typeof json.title === 'string' ? json.title.trim().slice(0, 200) : null
    const channelTitle =
      typeof json.author_name === 'string' ? json.author_name.trim().slice(0, 80) : null
    return { title: title || null, channelTitle: channelTitle || null }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Avalia as travas e, se tudo passar, credita.
 *
 * NUNCA lança: o link do usuário já foi salvo quando isto roda, e uma falha
 * na recompensa não pode transformar um save bem-sucedido em erro na tela.
 */
export async function grantPostToEarn(args: {
  userId: string
  youtubeId: string
  ip: string | null
}): Promise<PostToEarnResult> {
  const { userId, youtubeId, ip } = args
  const admin = wallAdminClient()
  if (!admin) {
    console.error('[post-to-earn] service role not configured — no reward evaluated')
    return result('unavailable', 0, 0)
  }

  const reject = async (reason: PostToEarnReason, remaining: number, detail?: string) => {
    // Instrumentação: sem isto o programa é fé. `reason` é a métrica que diz
    // se a regra está barrando fraude ou frustrando usuário honesto.
    void writeServerEvent({
      name: 'post_to_earn_rejected',
      userId,
      metadata: { reason, youtube_video_id: youtubeId, ...(detail ? { detail } : {}) },
    })
    return result(reason, 0, remaining)
  }

  try {
    // ── Trava 1: o vídeo existe e é público? ────────────────────────────────
    const meta = await verifyPublicYouTubeVideo(youtubeId)
    if (!meta) return await reject('not_public', POST_TO_EARN_MAX_PER_WINDOW)

    // ── Trava 2: a conta provou interesse (gerou ao menos 1 vídeo)? ─────────
    const { count: videoCount, error: videoErr } = await admin
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (videoErr) {
      console.error('[post-to-earn] video count failed:', videoErr.message)
      return await reject('unavailable', POST_TO_EARN_MAX_PER_WINDOW, 'video_count_failed')
    }
    if (!videoCount || videoCount < 1) {
      return await reject('no_video_yet', POST_TO_EARN_MAX_PER_WINDOW)
    }

    // ── Travas 4 e 5: janela rolante + teto vitalício (pré-checagem) ────────
    const windowStart = new Date(Date.now() - POST_TO_EARN_WINDOW_DAYS * 86_400_000)
    const { data: myClaimsRaw, error: claimsErr } = await admin
      .from('post_to_earn_claims')
      .select('id, credits, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(CLAIM_READ_LIMIT)
    if (claimsErr) {
      console.error('[post-to-earn] claims read failed:', claimsErr.message)
      return await reject('unavailable', POST_TO_EARN_MAX_PER_WINDOW, 'claims_read_failed')
    }
    const myClaims = (myClaimsRaw ?? []) as ClaimRow[]
    const inWindow = myClaims.filter((c) => new Date(c.created_at) >= windowStart)
    const lifetimeCredits = myClaims.reduce((sum, c) => sum + (c.credits ?? 0), 0)
    const remaining = POST_TO_EARN_MAX_PER_WINDOW - inWindow.length

    if (lifetimeCredits >= POST_TO_EARN_LIFETIME_CREDIT_CAP) {
      console.log(
        `[post-to-earn] lifetime cap reached: user ${userId} at ${lifetimeCredits}/${POST_TO_EARN_LIFETIME_CREDIT_CAP} credits`,
      )
      return await reject('lifetime_cap', 0)
    }
    if (inWindow.length >= POST_TO_EARN_MAX_PER_WINDOW) {
      return await reject('weekly_cap', 0)
    }

    // ── Trava 6: disjuntor global do dia ────────────────────────────────────
    const dayStart = new Date(Date.now() - 86_400_000).toISOString()
    const { data: todayRaw, error: todayErr } = await admin
      .from('post_to_earn_claims')
      .select('credits')
      .gte('created_at', dayStart)
      .limit(5_000)
    if (todayErr) {
      console.error('[post-to-earn] global cap read failed:', todayErr.message)
      return await reject('unavailable', remaining, 'global_read_failed')
    }
    const todayCredits = ((todayRaw ?? []) as { credits: number | null }[]).reduce(
      (sum, r) => sum + (r.credits ?? 0),
      0,
    )
    if (todayCredits + POST_TO_EARN_CREDITS > POST_TO_EARN_GLOBAL_DAILY_CREDIT_CAP) {
      console.error(
        `[post-to-earn] GLOBAL DAILY CAP hit: ${todayCredits}/${POST_TO_EARN_GLOBAL_DAILY_CREDIT_CAP} credits in 24h — rewards paused`,
      )
      return await reject('global_cap', remaining)
    }

    // ── Trava 3 + IDEMPOTÊNCIA: o claim ─────────────────────────────────────
    // Este INSERT é a autorização de pagamento. O índice único global em
    // youtube_video_id garante que exatamente UMA requisição no universo
    // chega à linha seguinte para este vídeo.
    const { data: claimRows, error: claimErr } = await admin
      .from('post_to_earn_claims')
      .insert({
        user_id: userId,
        youtube_video_id: youtubeId,
        credits: POST_TO_EARN_CREDITS,
        channel_title: meta.channelTitle,
        ip: ip ? ip.slice(0, 64) : null,
      })
      .select('id')
    if (claimErr) {
      // 23505 = unique_violation: alguém (talvez o próprio usuário, talvez
      // outra conta) já foi pago por este vídeo. É o caminho FELIZ da trava.
      if (claimErr.code === '23505') return await reject('already_claimed', remaining)
      console.error('[post-to-earn] claim insert failed:', claimErr.code, claimErr.message)
      return await reject('unavailable', remaining, 'claim_insert_failed')
    }
    const claimId = (claimRows as { id: string }[] | null)?.[0]?.id
    if (!claimId) {
      console.error('[post-to-earn] claim insert returned no id')
      return await reject('unavailable', remaining, 'claim_no_id')
    }

    // Fecha a corrida da janela: dois links DIFERENTES enviados ao mesmo tempo
    // passam os dois pela pré-checagem acima. Relemos a janela agora que a
    // linha existe e mantemos apenas as N mais ANTIGAS — critério determinístico,
    // então de duas requisições simultâneas exatamente uma sobrevive (e não
    // zero, como faria um "se estourou, todo mundo cai").
    const { data: recheckRaw, error: recheckErr } = await admin
      .from('post_to_earn_claims')
      .select('id, credits, created_at')
      .eq('user_id', userId)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: true })
      .limit(CLAIM_READ_LIMIT)
    if (!recheckErr && recheckRaw) {
      const rows = recheckRaw as ClaimRow[]
      const position = rows.findIndex((r) => r.id === claimId)
      if (position >= POST_TO_EARN_MAX_PER_WINDOW) {
        await admin.from('post_to_earn_claims').delete().eq('id', claimId)
        return await reject('weekly_cap', 0, 'race_lost')
      }
    }

    // ── Pagamento ───────────────────────────────────────────────────────────
    // add_video_credits é o mesmo RPC (SECURITY DEFINER) usado pelos webhooks
    // de pagamento — a fonte de verdade de crédito do produto é profiles.
    // video_credits e ninguém escreve nela por fora deste caminho.
    const { error: creditErr } = await admin.rpc('add_video_credits', {
      p_user: userId,
      p_amount: POST_TO_EARN_CREDITS,
    })
    if (creditErr) {
      // Desfaz a autorização: sem crédito, não pode ficar claim de pé, senão o
      // vídeo fica queimado para sempre sem nunca ter pago.
      console.error('[post-to-earn] credit grant FAILED, rolling back claim:', creditErr.message)
      await admin.from('post_to_earn_claims').delete().eq('id', claimId)
      return await reject('unavailable', remaining, 'credit_rpc_failed')
    }

    // Espelho legível no card do wall + amarração do claim à linha que o
    // originou (auditoria). Best-effort dos dois lados: a fonte de verdade é o
    // claim, e uma falha aqui não desfaz um crédito já concedido.
    try {
      const { data: mirrored } = await admin
        .from('posted_shorts')
        .update({ rewarded_at: new Date().toISOString(), reward_credits: POST_TO_EARN_CREDITS })
        .eq('user_id', userId)
        .eq('youtube_video_id', youtubeId)
        .select('id')
      const postedShortId = (mirrored as { id: string }[] | null)?.[0]?.id
      if (postedShortId) {
        await admin
          .from('post_to_earn_claims')
          .update({ posted_short_id: postedShortId })
          .eq('id', claimId)
      }
    } catch {
      /* non-blocking */
    }

    console.log(
      `[post-to-earn] +${POST_TO_EARN_CREDITS} credits to ${userId} for ${youtubeId} (lifetime ${lifetimeCredits + POST_TO_EARN_CREDITS}/${POST_TO_EARN_LIFETIME_CREDIT_CAP})`,
    )
    void writeServerEvent({
      name: 'post_to_earn_claimed',
      userId,
      metadata: {
        credits: POST_TO_EARN_CREDITS,
        youtube_video_id: youtubeId,
        lifetime_credits: lifetimeCredits + POST_TO_EARN_CREDITS,
        channel_title: meta.channelTitle,
      },
    })

    return result('granted', POST_TO_EARN_CREDITS, remaining - 1)
  } catch (err) {
    console.error('[post-to-earn] unexpected:', err instanceof Error ? err.message : String(err))
    return result('unavailable', 0, 0)
  }
}
