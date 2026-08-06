// lib/postToEarnGrant.ts — KINEO-POST-TO-EARN-2026-08-04
//                          KINEO-P2E-FIX-2026-08-07
//
// O MOTOR que decide e paga a recompensa de Post to Earn. Server-only: usa o
// service role. As regras/números vivem em lib/postToEarn.ts (client-safe).
//
// ── O QUE QUEBROU (diagnóstico de 07/08/2026) ───────────────────────────────
// `post_to_earn_claims` tinha ZERO linhas desde o lançamento, com 3 Shorts
// reais no /wall. Motivo: este motor só era chamado por
// app/api/posted-shorts/route.ts (source='pasted'), e:
//   · as 2 entradas do fundador vieram de app/api/youtube/upload/route.ts
//     (source='direct_upload'), que gravava em posted_shorts e NUNCA chamava
//     esta função — o caminho do upload direto não tinha recompensa nenhuma;
//   · a 1 entrada colada (Juliana, 01/08) é ANTERIOR ao commit que criou o
//     Post to Earn (b1f05a7, 04/08).
// Ou seja: o único caminho que pagava nunca recebeu tráfego. Não era bug de
// verificação, de RLS nem de try/catch — era um caminho desconectado.
//
// A correção conecta o upload direto (source) e acrescenta o que faltava para
// o programa ser honesto: ATRIBUIÇÃO. Antes, "vídeo público + a conta gerou
// algum vídeo" pagava — um usuário podia colar qualquer vídeo antigo do
// próprio canal, sem nenhuma relação com a Kineo, e receber. Agora o crédito
// automático exige prova de que o Short é da Kineo; quando a prova não é
// obtível, o claim entra na fila `pending` e um humano decide.
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
//      mundo (índice parcial: claims `rejected` liberam o vídeo de novo).
//      `posted_shorts` NÃO servia para isso: o unique de lá é
//      (user_id, youtube_video_id), ou seja, dez contas colando o mesmo
//      vídeo seriam dez linhas legítimas e dez pagamentos.
//
//   4. JANELA ROLANTE — 2 recompensas por 7 dias por usuário. Claims
//      `pending` OCUPAM vaga na janela: senão, um script encheria a fila de
//      revisão de graça.
//
//   5. TETO VITALÍCIO — 30 créditos por usuário, e depois disso loga.
//
//   6. DISJUNTOR GLOBAL — 100 créditos/dia somando todo mundo.
//
//   7. ATRIBUIÇÃO (novo) — o vídeo é da Kineo? Só `granted` com prova.
//
// IDEMPOTÊNCIA: o INSERT do claim é a autorização. Ele acontece ANTES do
// crédito e é protegido pelo índice único global; quem perde a corrida recebe
// 23505 e devolve 'already_claimed' sem creditar. Se o crédito falhar depois,
// o claim é desfeito — o vídeo volta a poder ser recompensado, o que é o lado
// certo para errar (perder uma recompensa é recuperável; pagar duas vezes é
// dinheiro que não volta).
//
// INSTRUMENTAÇÃO: todo desfeito — concessão, fila, recusa e erro — grava um
// evento COM MOTIVO, e o await é proposital: `void` numa função serverless
// perde a escrita quando o runtime congela depois da resposta, que é
// exatamente como um programa de recompensa falha em silêncio.

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
  type PostToEarnSource,
} from '@/lib/postToEarn'

/** Timeout das chamadas ao YouTube. A verificação não pode segurar a resposta
 *  do save — o link do usuário já está gravado quando isto roda. */
const OEMBED_TIMEOUT_MS = 6_000

/** Teto de linhas lidas nas contagens. Blindagem contra um estado corrompido
 *  virar uma leitura gigante — nenhum usuário legítimo passa de 10 claims. */
const CLAIM_READ_LIMIT = 500

/**
 * Marcas que provam atribuição na descrição/título do vídeo. São as strings
 * que lib/videoDescription.ts realmente escreve (usekineo.com) e o domínio de
 * produção usado nos CTAs (shortsforgeai.com). "kineo" solto NÃO entra na
 * lista: casaria com palavra alheia e pagaria por vídeo que não é nosso.
 */
const KINEO_ATTRIBUTION_MARKERS = ['usekineo.com', 'shortsforgeai.com', 'made with kineo']

type ClaimStatus = 'granted' | 'pending' | 'rejected'

type ClaimRow = {
  id: string
  credits: number | null
  created_at: string
  status: ClaimStatus | null
}

function result(reason: PostToEarnReason, credits: number, remaining: number): PostToEarnResult {
  return {
    granted: reason === 'granted',
    pending: reason === 'pending_review',
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

export type KineoAttribution = {
  /** True só quando existe PROVA. Ausência de prova nunca vira `true`. */
  verified: boolean
  /** Como se provou (ou por que não deu). Vai para a coluna `reason` do claim
   *  e para o evento — é o que transforma a fila de revisão em algo acionável
   *  em vez de uma caixa de links sem contexto. */
  how: string
}

/**
 * O vídeo é MESMO um Short feito com a Kineo?
 *
 * Três caminhos, em ordem de força da prova:
 *
 *   1. `direct_upload` — a própria Kineo subiu o arquivo no canal do usuário
 *      (app/api/youtube/upload). Não existe prova melhor: nós renderizamos e
 *      nós publicamos. Zero chamadas de rede.
 *   2. `pasted` + YOUTUBE_API_KEY — lê o snippet e procura o credit link que
 *      lib/videoDescription.ts escreve. É a verificação automática de verdade.
 *   3. `pasted` sem chave — SEM PROVA. Não recusa (o usuário pode estar 100%
 *      certo) e não paga (não podemos saber). Vai para revisão humana.
 *
 * NUNCA lança: qualquer falha vira `verified: false` com motivo.
 */
export async function verifyKineoAttribution(
  youtubeId: string,
  source: PostToEarnSource,
): Promise<KineoAttribution> {
  if (source === 'direct_upload') return { verified: true, how: 'direct_upload' }

  const apiKey = (process.env.YOUTUBE_API_KEY ?? '').trim()
  if (!apiKey) return { verified: false, how: 'no_youtube_api_key' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OEMBED_TIMEOUT_MS)
  try {
    const url =
      'https://www.googleapis.com/youtube/v3/videos' +
      `?part=snippet&id=${encodeURIComponent(youtubeId)}&key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (!res.ok) return { verified: false, how: `youtube_api_http_${res.status}` }
    const json = (await res.json()) as {
      items?: { snippet?: { title?: unknown; description?: unknown } }[]
    }
    const snippet = json.items?.[0]?.snippet
    if (!snippet) return { verified: false, how: 'youtube_api_no_item' }
    const haystack = `${typeof snippet.title === 'string' ? snippet.title : ''}\n${
      typeof snippet.description === 'string' ? snippet.description : ''
    }`.toLowerCase()
    const hit = KINEO_ATTRIBUTION_MARKERS.find((m) => haystack.includes(m))
    return hit
      ? { verified: true, how: `description_match:${hit}` }
      : { verified: false, how: 'no_kineo_credit_link' }
  } catch (err) {
    return {
      verified: false,
      how: err instanceof Error && err.name === 'AbortError' ? 'youtube_api_timeout' : 'youtube_api_error',
    }
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
  /** Ausente = 'pasted', o comportamento histórico desta função. */
  source?: PostToEarnSource
}): Promise<PostToEarnResult> {
  const { userId, youtubeId, ip } = args
  const source: PostToEarnSource = args.source ?? 'pasted'
  const admin = wallAdminClient()
  if (!admin) {
    console.error('[post-to-earn] service role not configured — no reward evaluated')
    return result('unavailable', 0, 0)
  }

  const reject = async (reason: PostToEarnReason, remaining: number, detail?: string) => {
    // Instrumentação: sem isto o programa é fé. `reason` é a métrica que diz
    // se a regra está barrando fraude ou frustrando usuário honesto. O await
    // é deliberado — ver o cabeçalho.
    await writeServerEvent({
      name: 'post_to_earn_rejected',
      userId,
      metadata: { reason, youtube_video_id: youtubeId, source, ...(detail ? { detail } : {}) },
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
      .select('id, credits, created_at, status')
      .eq('user_id', userId)
      .neq('status', 'rejected')
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

    // ── Trava 7: o vídeo é da Kineo? ────────────────────────────────────────
    // Decide o STATUS do claim, não se ele existe: com prova, `granted` e
    // pagamento; sem prova, `pending` com o motivo gravado. Em nenhum dos dois
    // casos o vídeo fica livre para outra conta reivindicar (o unique global
    // pega os dois status) e em nenhum deles se paga sem verificação.
    const attribution = await verifyKineoAttribution(youtubeId, source)
    const status: ClaimStatus = attribution.verified ? 'granted' : 'pending'
    const claimCredits = attribution.verified ? POST_TO_EARN_CREDITS : 0

    // ── Trava 3 + IDEMPOTÊNCIA: o claim ─────────────────────────────────────
    // Este INSERT é a autorização de pagamento. O índice único global em
    // youtube_video_id garante que exatamente UMA requisição no universo
    // chega à linha seguinte para este vídeo.
    const { data: claimRows, error: claimErr } = await admin
      .from('post_to_earn_claims')
      .insert({
        user_id: userId,
        youtube_video_id: youtubeId,
        credits: claimCredits,
        channel_title: meta.channelTitle,
        ip: ip ? ip.slice(0, 64) : null,
        status,
        source,
        verification: attribution.how,
        reason: attribution.verified ? null : attribution.how,
        granted_at: attribution.verified ? new Date().toISOString() : null,
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
      .select('id, credits, created_at, status')
      .eq('user_id', userId)
      .neq('status', 'rejected')
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

    // ── Fila de revisão ─────────────────────────────────────────────────────
    // Sem prova de atribuição não há pagamento AGORA — e o claim fica de pé,
    // com motivo, esperando um humano (post_to_earn_review no banco). Isto é o
    // oposto de falhar em silêncio: a linha existe, o motivo existe, o evento
    // existe e a mensagem na tela diz o prazo.
    if (!attribution.verified) {
      console.log(
        `[post-to-earn] PENDING review: user ${userId} video ${youtubeId} (${attribution.how}, source=${source})`,
      )
      await writeServerEvent({
        name: 'post_to_earn_pending',
        userId,
        metadata: {
          youtube_video_id: youtubeId,
          source,
          verification: attribution.how,
          claim_id: claimId,
          channel_title: meta.channelTitle,
        },
      })
      return result('pending_review', 0, remaining - 1)
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
    await writeServerEvent({
      name: 'post_to_earn_claimed',
      userId,
      metadata: {
        credits: POST_TO_EARN_CREDITS,
        youtube_video_id: youtubeId,
        lifetime_credits: lifetimeCredits + POST_TO_EARN_CREDITS,
        channel_title: meta.channelTitle,
        source,
        verification: attribution.how,
      },
    })

    return result('granted', POST_TO_EARN_CREDITS, remaining - 1)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[post-to-earn] unexpected:', detail)
    // Mesmo o caminho "nunca deveria acontecer" grava motivo: um erro que só
    // existe no log da Vercel é um erro que ninguém vê.
    await writeServerEvent({
      name: 'post_to_earn_rejected',
      userId,
      metadata: { reason: 'unavailable', youtube_video_id: youtubeId, source, detail: detail.slice(0, 200) },
    }).catch(() => {})
    return result('unavailable', 0, 0)
  }
}
