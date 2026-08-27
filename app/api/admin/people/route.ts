// KINEO-ADMIN-PEOPLE-2026-08-18 — pedido do fundador (18/08): "quero ver
// todas as pessoas que entraram, as que compraram, quantos créditos têm,
// quantos usaram, PRA QUE usaram, e as datas de tudo".
//
// Fontes da verdade (nada estimado à mão):
//   · profiles         — cadastro, plano, has_paid, saldo atual (video_credits)
//   · credit_debits    — CADA gasto de crédito (amount, render_id, data);
//     refunded_at preenchido = estornado, NÃO conta como uso.
//   · events(payment_success) — data da 1ª compra.
// "Recebeu" é derivado pela identidade contábil usado + restante — é imune a
// drift porque não depende de somar cada concessão (trial, plano, topup,
// bônus) separadamente.
// "Em quê" vem do PREFIXO do render_id do débito (cinematic-/animate- =
// vídeo, img- = imagem, audio-/voice- = voz, enhance- = HD/4K).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows, isAdminEmail, serviceClient } from '../_shared/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export type PaidKind = 'active' | 'churned' | 'one_time' | null

export interface PersonRow {
  email: string
  name: string | null
  signup: string
  country: string | null
  plan: string | null
  has_paid: boolean
  // KINEO-PAIDKIND-2026-08-19 (fundador: "quem pagou 1x, quem é assinante e
  // quem saiu") — has_paid cru misturava os três e inflava o placar (10 vs os
  // 6 ativos do Stripe). Regra: plano pago atual = 'active'; tem
  // subscription_id (stripe/paddle/paypal) mas plano free = ASSINOU E SAIU =
  // 'churned'; pagou sem nunca ter subscription = pack avulso = 'one_time'.
  paid_kind: PaidKind
  is_internal: boolean
  first_paid: string | null
  credits_left: number | null
  credits_used: number
  credits_granted: number | null
  used_video: number
  used_image: number
  used_audio: number
  used_enhance: number
  used_other: number
  last_use: string | null
  debit_count: number
  // ═══ #295 — KINEO-ENTREGUE-2026-08-23 (pedido do fundador, 23/08 à noite:
  // "tem gente com 40 concedidos, 2 queimados e ZERO vídeos — quero saber o
  // que fizeram com os créditos"). ═══════════════════════════════════════════
  //
  // O painel media só um lado da conta: quanto SAIU da carteira. Faltava o
  // outro: quanto ENTROU nas mãos da pessoa. Sem ele, um cliente satisfeito
  // que gastou 40 créditos em animações e imagens é indistinguível de alguém
  // que queimou 40 créditos e não recebeu nada — e a diferença entre os dois
  // é a diferença entre um produto que funciona e um que precisa de socorro.
  //
  // Foi exatamente esse ponto cego que produziu a leitura do fundador: quem
  // usa /animate, /images ou /audio NÃO cria linha em `videos`, então aparecia
  // como "gastou e não fez nada". Medido hoje: 1.801 eventos de entrega de
  // animação (`outcome='delivered'`) para 14 pessoas que o painel mostrava
  // como zero.
  /** Vídeos realmente entregues (linhas em `videos`). */
  made_videos: number
  /** Animações observadas como entregues pelo cliente ou liquidadas pelo servidor. */
  made_animations: number
  /** Imagens entregues (linhas em `images`). */
  made_images: number
  /** Áudios entregues (linhas em `audios`). */
  made_audios: number
  /**
   * ⚠️ O alarme que o fundador procurava, calculado em vez de procurado a olho:
   * gastou crédito de VÍDEO e não tem NENHUMA entrega de nenhum tipo. Quem cai
   * aqui é candidato a estorno + e-mail, não a estatística.
   */
  burned_nothing_delivered: boolean
}

function classify(renderId: string | null): 'video' | 'image' | 'audio' | 'enhance' | 'other' {
  const p = (renderId ?? '').toLowerCase()
  if (p.startsWith('enhance')) return 'enhance'
  if (p.startsWith('img') || p.startsWith('image')) return 'image'
  if (p.startsWith('audio') || p.startsWith('voice') || p.startsWith('tts')) return 'audio'
  if (p.startsWith('cinematic') || p.startsWith('animate') || p.startsWith('video') || p.startsWith('compose') || p.startsWith('fast')) return 'video'
  return 'other'
}

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

    const [profiles, debits, payEvents, videoRows, imageRows, audioRows, animateRows] = await Promise.all([
      fetchAllRows<{
        id: string
        email: string | null
        name: string | null
        plan: string | null
        has_paid: boolean | null
        video_credits: number | null
        created_at: string | null
        signup_country: string | null
        last_country: string | null
        stripe_subscription_id: string | null
        paddle_subscription_id: string | null
        paypal_subscription_id: string | null
      }>(admin, 'profiles', 'id, email, name, plan, has_paid, video_credits, created_at, signup_country, last_country, stripe_subscription_id, paddle_subscription_id, paypal_subscription_id'),
      fetchAllRows<{
        user_id: string | null
        render_id: string | null
        amount: number | null
        created_at: string | null
        refunded_at: string | null
      }>(admin, 'credit_debits', 'user_id, render_id, amount, created_at, refunded_at'),
      fetchAllRows<{ user_id: string | null; created_at: string | null }>(
        admin,
        'events',
        'user_id, created_at',
        { column: 'name', values: ['payment_success'] },
      ),
      // #295 — o lado ENTREGUE da conta. Uma leitura por produto, todas via
      // fetchAllRows (que pagina) — nunca `.limit()` cru: a lição do
      // truncamento silencioso do PostgREST em ~1.000 linhas custou uma
      // campanha inteira em 22/08, e `videos` já passa de 1.300 linhas.
      fetchAllRows<{ user_id: string | null }>(admin, 'videos', 'user_id'),
      fetchAllRows<{ user_id: string | null }>(admin, 'images', 'user_id'),
      fetchAllRows<{ user_id: string | null }>(admin, 'audios', 'user_id'),
      // Animação não tem tabela própria. O nome antigo permanece no histórico;
      // novos polls usam `animate_client_poll_observed`, separado da autoridade
      // financeira `animate_job_settled`, que agora é exclusiva do servidor.
      // Por isso conta-se `session_id` DISTINTO, não linhas — contar linhas
      // aqui publicaria "1.801 animações" e destruiria a credibilidade do
      // painel inteiro.
      fetchAllRows<{ user_id: string | null; session_id: string | null; metadata: { outcome?: string } | null }>(
        admin,
        'events',
        'user_id, session_id, metadata',
        { column: 'name', values: ['animate_job_settled', 'animate_client_poll_observed'] },
      ),
    ])

    type Agg = {
      used: number
      video: number
      image: number
      audio: number
      enhance: number
      other: number
      last: string | null
      n: number
    }
    const byUser = new Map<string, Agg>()
    for (const d of debits) {
      if (!d.user_id) continue
      if (d.refunded_at) continue // estorno não é uso
      const amt = typeof d.amount === 'number' ? d.amount : 0
      const agg = byUser.get(d.user_id) ?? { used: 0, video: 0, image: 0, audio: 0, enhance: 0, other: 0, last: null, n: 0 }
      agg.used += amt
      agg[classify(d.render_id)] += amt
      agg.n += 1
      if (!agg.last || (d.created_at ?? '') > agg.last) agg.last = d.created_at ?? agg.last
      byUser.set(d.user_id, agg)
    }

    // #295 — contagem de ENTREGAS por pessoa, por produto.
    const countBy = (rows: { user_id: string | null }[]) => {
      const m = new Map<string, number>()
      for (const r of rows) {
        if (!r.user_id) continue
        m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1)
      }
      return m
    }
    const videosBy = countBy(videoRows)
    const imagesBy = countBy(imageRows)
    const audiosBy = countBy(audioRows)
    // Animações: um job = um session_id; só conta quem foi ENTREGUE.
    const animateJobs = new Map<string, Set<string>>()
    for (const r of animateRows) {
      if (!r.user_id || r.metadata?.outcome !== 'delivered') continue
      const key = r.session_id ?? 'sem-sessao'
      const set = animateJobs.get(r.user_id) ?? new Set<string>()
      set.add(key)
      animateJobs.set(r.user_id, set)
    }

    const firstPaid = new Map<string, string>()
    for (const e of payEvents) {
      if (!e.user_id || !e.created_at) continue
      const cur = firstPaid.get(e.user_id)
      if (!cur || e.created_at < cur) firstPaid.set(e.user_id, e.created_at)
    }

    const PAID_PLANS = new Set(['starter', 'basic', 'pro', 'autopilot'])
    const isInternal = (email: string) => {
      const e = email.toLowerCase()
      return e.startsWith('josephsskaf') || e.startsWith('josephskaf') || e.endsWith('@shortsforgeai.com')
    }
    const people: PersonRow[] = profiles
      .filter((p) => !!p.email)
      .map((p) => {
        const agg = byUser.get(p.id)
        const used = agg?.used ?? 0
        const left = typeof p.video_credits === 'number' ? p.video_credits : null
        const hasSub = !!(p.stripe_subscription_id || p.paddle_subscription_id || p.paypal_subscription_id)
        const planPaid = PAID_PLANS.has((p.plan ?? '').toLowerCase())
        const paidKind: PaidKind = p.has_paid !== true ? null : planPaid ? 'active' : hasSub ? 'churned' : 'one_time'
        return {
          email: p.email as string,
          name: p.name ?? null,
          signup: p.created_at ?? '',
          country: p.signup_country ?? p.last_country ?? null,
          plan: p.plan ?? null,
          has_paid: p.has_paid === true,
          paid_kind: paidKind,
          is_internal: isInternal(p.email as string),
          first_paid: firstPaid.get(p.id) ?? null,
          credits_left: left,
          credits_used: used,
          credits_granted: left === null ? null : used + left,
          used_video: agg?.video ?? 0,
          used_image: agg?.image ?? 0,
          used_audio: agg?.audio ?? 0,
          used_enhance: agg?.enhance ?? 0,
          used_other: agg?.other ?? 0,
          last_use: agg?.last ?? null,
          debit_count: agg?.n ?? 0,
          // #295 — o lado entregue.
          made_videos: videosBy.get(p.id) ?? 0,
          made_animations: animateJobs.get(p.id)?.size ?? 0,
          made_images: imagesBy.get(p.id) ?? 0,
          made_audios: audiosBy.get(p.id) ?? 0,
          burned_nothing_delivered:
            (agg?.video ?? 0) > 0 &&
            (videosBy.get(p.id) ?? 0) === 0 &&
            (animateJobs.get(p.id)?.size ?? 0) === 0 &&
            (imagesBy.get(p.id) ?? 0) === 0 &&
            (audiosBy.get(p.id) ?? 0) === 0,
        }
      })
      .sort((a, b) => (a.signup < b.signup ? 1 : -1))

    // Placar espelha o Stripe: conta interna (fundador/teste) fica FORA de
    // todas as contagens de dinheiro.
    const ext = people.filter((p) => !p.is_internal)
    const summary = {
      total: ext.length,
      active_subs: ext.filter((p) => p.paid_kind === 'active').length,
      churned: ext.filter((p) => p.paid_kind === 'churned').length,
      one_time: ext.filter((p) => p.paid_kind === 'one_time').length,
      credits_in_circulation: ext.reduce((s, p) => s + (p.credits_left ?? 0), 0),
      credits_used_total: ext.reduce((s, p) => s + p.credits_used, 0),
      // #295 — o placar de ENTREGA, que é o que diz se o produto funcionou.
      made_videos_total: ext.reduce((s, p) => s + p.made_videos, 0),
      made_animations_total: ext.reduce((s, p) => s + p.made_animations, 0),
      made_images_total: ext.reduce((s, p) => s + p.made_images, 0),
      made_audios_total: ext.reduce((s, p) => s + p.made_audios, 0),
      /** Pessoas que gastaram crédito de vídeo e não receberam NADA. */
      burned_nothing_delivered: ext.filter((p) => p.burned_nothing_delivered).length,
      /** Créditos presos nessas pessoas — a conta do prejuízo, em uma linha. */
      burned_credits: ext
        .filter((p) => p.burned_nothing_delivered)
        .reduce((s, p) => s + p.credits_used, 0),
    }

    return NextResponse.json({ people, summary })
  } catch (e) {
    console.error('[admin/people] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Failed to load people.' }, { status: 500 })
  }
}
