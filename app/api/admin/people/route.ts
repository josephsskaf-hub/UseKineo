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

    const [profiles, debits, payEvents] = await Promise.all([
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
    }

    return NextResponse.json({ people, summary })
  } catch (e) {
    console.error('[admin/people] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Failed to load people.' }, { status: 500 })
  }
}
