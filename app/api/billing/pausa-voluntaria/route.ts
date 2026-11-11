// KINEO-PAUSA-VOLUNTARIA-1111 [fundador 11/11: "Pode fazer todas"] — a pausa de 1 mês da tela de cancelar
// (components/billing/CancelSaveFlow.tsx), decidida no SERVIDOR (lib/billing/pausaVoluntaria.ts):
//   · GET ?offer=1  → { show:false } | { show:true, qa, possible, skippedCharge, nextCharge, pausedUntil, credits } e, quando
//                     a pausa é oferecida de fato, o evento subscription_pause_offered;
//   · POST { action:'pause' }  → re-decide; 'qa' (casa) responde sem tocar na Stripe; 'real' grava pause_collection
//                                (behavior 'void', resumes_at) na PRÓPRIA assinatura (dono conferido pela metadata) e o
//                                evento subscription_pause_accepted;
//   · POST { action:'resume' } → tira o pause_collection (só de quem está pausado) e grava subscription_pause_resumed.
// Interruptor 'off' = nenhuma leitura, nenhum evento, nenhuma escrita.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { writeServerEvent } from '@/lib/serverEvents'
import { releaseVisible } from '@/lib/recreate/access'
import { saveTierOfPlan } from '@/lib/billing/salvaCancelamento'
import {
  PAUSA_VOLUNTARIA_1111_RELEASE,
  PAUSA_VOLUNTARIA_API,
  PAUSA_VOLUNTARIA_EVENTS,
  PAUSA_VOLUNTARIA_JANELA_DIAS,
  PAUSA_VOLUNTARIA_VERSION,
  pausaDecision,
  pausaMode,
  pauseCollectionParams,
} from '@/lib/billing/pausaVoluntaria'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }
const HIDE = () => NextResponse.json({ show: false }, { headers: NO_STORE })

type Live = {
  subscriptionId: string | null
  status: string | null
  interval: string | null
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
  pausedUntil: string | null
  pausedNow: boolean
}

async function lerTudo(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const db = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: profile, error } = await db.from('profiles').select('plan, stripe_subscription_id, video_credits').eq('id', userId).maybeSingle()
  if (error) return null
  const p = profile as { plan?: string | null; stripe_subscription_id?: string | null; video_credits?: number | null } | null
  const { tier, inTrial } = saveTierOfPlan(p?.plan)
  const live: Live = { subscriptionId: p?.stripe_subscription_id ? String(p.stripe_subscription_id) : null, status: null, interval: null, periodEnd: null, cancelAtPeriodEnd: false, pausedUntil: null, pausedNow: false }
  if (live.subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(live.subscriptionId)
      const owner = sub.metadata?.supabase_user_id
      if (owner === userId) {
        live.status = sub.status ?? null
        live.interval = sub.items?.data?.[0]?.price?.recurring?.interval ?? null
        live.periodEnd = typeof sub.current_period_end === 'number' ? new Date(sub.current_period_end * 1000).toISOString() : null
        live.cancelAtPeriodEnd = sub.cancel_at_period_end === true
        const pc = sub.pause_collection as { resumes_at?: number | null } | null
        live.pausedNow = Boolean(pc)
        live.pausedUntil = pc && typeof pc.resumes_at === 'number' ? new Date(pc.resumes_at * 1000).toISOString() : null
      } else {
        live.subscriptionId = null // dono diferente = como se não houvesse assinatura
      }
    } catch {
      live.subscriptionId = null // Stripe não respondeu = não oferece
    }
  }
  const since = new Date(Date.now() - PAUSA_VOLUNTARIA_JANELA_DIAS * 86_400_000).toISOString()
  const { data: prior, error: priorErr } = await db.from('events').select('id').eq('user_id', userId).eq('name', PAUSA_VOLUNTARIA_EVENTS.accepted).gte('created_at', since).limit(1)
  const pausedRecently = priorErr || !Array.isArray(prior) ? null : prior.length > 0
  const decision = pausaDecision({ tier, inTrial, hasStripeSubscription: Boolean(live.subscriptionId), status: live.status, interval: live.interval, cancelAtPeriodEnd: live.cancelAtPeriodEnd, pausedNow: live.pausedNow, pausedRecently, periodEnd: live.periodEnd })
  return { tier, live, decision, credits: typeof p?.video_credits === 'number' ? p.video_credits : null }
}

export async function GET(req: NextRequest) {
  if (PAUSA_VOLUNTARIA_1111_RELEASE === 'off') return HIDE()
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return HIDE()
  const all = await lerTudo(user.id)
  if (!all) return HIDE()
  const house = releaseVisible(user.email, 'internal')
  const mode = pausaMode({ release: PAUSA_VOLUNTARIA_1111_RELEASE, house, eligible: all.decision.possible || all.live.pausedNow })
  if (mode === 'hide') return HIDE()
  const qa = mode === 'qa'
  // A conferência da casa vê o cartão mesmo sem assinatura de verdade: datas de amostra (fim do período daqui a 10 dias).
  const d = qa && !all.decision.possible
    ? pausaDecision({ tier: 'basic', inTrial: false, hasStripeSubscription: true, status: 'active', interval: 'month', cancelAtPeriodEnd: false, pausedNow: false, pausedRecently: false, periodEnd: new Date(Date.now() + 10 * 86_400_000).toISOString() })
    : all.decision
  if (req.nextUrl.searchParams.get('offer') === '1' && d.possible) {
    await writeServerEvent({ name: PAUSA_VOLUNTARIA_EVENTS.offered, userId: user.id, path: PAUSA_VOLUNTARIA_API, metadata: { tier: all.tier, qa, skipped_charge: d.skippedCharge, next_charge: d.nextCharge, credits: all.credits, version: PAUSA_VOLUNTARIA_VERSION } })
  }
  return NextResponse.json({
    show: true,
    qa,
    possible: d.possible,
    block: d.possible ? null : d.block,
    skippedCharge: d.possible ? d.skippedCharge : null,
    nextCharge: d.possible ? d.nextCharge : null,
    pausedNow: all.live.pausedNow,
    pausedUntil: all.live.pausedUntil,
    credits: all.credits,
  }, { headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  if (PAUSA_VOLUNTARIA_1111_RELEASE === 'off') return NextResponse.json({ error: 'not_available' }, { status: 404 })
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let body: { action?: unknown } = {}
  try { body = await req.json() } catch { /* vazio */ }
  const action = body.action === 'pause' || body.action === 'resume' ? body.action : null
  if (!action) return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  const all = await lerTudo(user.id)
  if (!all) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  const house = releaseVisible(user.email, 'internal')
  const mode = pausaMode({ release: PAUSA_VOLUNTARIA_1111_RELEASE, house, eligible: action === 'pause' ? all.decision.possible : all.live.pausedNow })
  if (mode === 'hide') return NextResponse.json({ error: 'not_eligible', block: all.decision.possible ? null : all.decision.block }, { status: 409 })
  // A conferência da casa nunca muda a Stripe.
  if (mode === 'qa') return NextResponse.json({ ok: true, qa: true, action })
  const subscriptionId = all.live.subscriptionId as string

  if (action === 'pause') {
    const d = all.decision
    if (!d.possible) return NextResponse.json({ error: 'not_eligible', block: d.block }, { status: 409 })
    try {
      await stripe.subscriptions.update(subscriptionId, { pause_collection: pauseCollectionParams(d.resumesAt) })
    } catch (e) {
      console.error('[pausa-voluntaria] pause failed:', e instanceof Error ? e.message.slice(0, 200) : String(e))
      return NextResponse.json({ error: 'stripe_failed' }, { status: 502 })
    }
    await writeServerEvent({ name: PAUSA_VOLUNTARIA_EVENTS.accepted, userId: user.id, path: PAUSA_VOLUNTARIA_API, metadata: { subscription_ref: subscriptionId, tier: all.tier, skipped_charge: d.skippedCharge, resumes_at: d.resumesAt, next_charge: d.nextCharge, credits: all.credits, version: PAUSA_VOLUNTARIA_VERSION } })
    return NextResponse.json({ ok: true, action, skippedCharge: d.skippedCharge, nextCharge: d.nextCharge })
  }

  if (!all.live.pausedNow) return NextResponse.json({ error: 'not_paused' }, { status: 409 })
  try {
    await stripe.subscriptions.update(subscriptionId, { pause_collection: '' })
  } catch (e) {
    console.error('[pausa-voluntaria] resume failed:', e instanceof Error ? e.message.slice(0, 200) : String(e))
    return NextResponse.json({ error: 'stripe_failed' }, { status: 502 })
  }
  await writeServerEvent({ name: PAUSA_VOLUNTARIA_EVENTS.resumed, userId: user.id, path: PAUSA_VOLUNTARIA_API, metadata: { subscription_ref: subscriptionId, tier: all.tier, paused_until: all.live.pausedUntil, version: PAUSA_VOLUNTARIA_VERSION } })
  return NextResponse.json({ ok: true, action })
}
