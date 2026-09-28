// KINEO-ADS-V2-2026-09-28 — início do anúncio v2 (especificação, seção 5, passos 3 e 4).
//
// ORDEM DAS TRAVAS (guardião scripts/test-ads-v2-servidor-2026-09-28.mjs confere a ordem no arquivo):
//   login → loadAdsAccess/adsGate → adsV2Visible (403 'v2_closed' ANTES de qualquer débito) → pedido do dono,
//   planejado e com cartão → moderação (a mesma régua do v1: narração + frases de tela) → dry_run devolve plano e
//   custo e PARA (ensaio de US$ 0: sem débito, sem fal) → saldo → trava condicional draft|planned→generating (o
//   índice único parcial faz o "um anúncio por vez" atômico) → débito confirmado no ledger → planos gravados →
//   envio à fal (imagens das cenas antes do vídeo) → 202. O avanço (tela + cron) faz o resto.
import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration'
import { adsGate, isMissingAdsTable, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { sanitizeStartBody } from '@/lib/ads/v2Contract'
import { adsV2Credits, estimateAdUsd } from '@/lib/ads/v2Tiers'
import { adsV2BillingRef, chargeAdsV2, failAdsV2Order } from '@/lib/ads/v2Billing'
import { adsV2View, buildInitialShotRows, dispatchAdsV2Shots, loadAdsV2Order, loadAdsV2Shots } from '@/lib/ads/v2Advance'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

/** Prazo para abrir envios novos nesta chamada (o resto sai pelo avanço da tela/cron). */
const DISPATCH_BUDGET_MS = 40_000

export async function POST(req: NextRequest) {
  const started = Date.now()
  let locked: { id: string; user_id: string; billing_ref: string | null } | null = null
  let admin: Awaited<ReturnType<typeof loadAdsAccess>>['admin'] | null = null
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const access = await loadAdsAccess(user.id, user.email)
    admin = access.admin
    const gate = adsGate(access.reason)
    if (gate !== 'ok') {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/v2/start', metadata: { reason: gate } })
      return v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403)
    }
    // Interruptor do v2 ANTES de qualquer débito.
    if (!adsV2Visible(user.email)) return v2Fail('v2_closed', 403)

    const parsed = sanitizeStartBody(await req.json().catch(() => null))
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const { order_id: orderId, dry_run: dryRun } = parsed.value

    const { order, error } = await loadAdsV2Order(admin, orderId, user.id)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('start_failed', 502)
    if (!order) return v2Fail('order_not_found', 404)
    if (order.status !== 'draft' && order.status !== 'planned') return v2Fail('not_startable', 409, { status: order.status })
    const plan = order.plan
    if (!plan || !Array.isArray(plan.shots) || plan.shots.length === 0) return v2Fail('plan_required', 409)
    if (!order.card_url) return v2Fail('card_required', 400)

    // Moderação (a régua do v1, superfície ads_render): o texto que vira VOZ e TELA.
    const text = [plan.narration ?? '', ...(plan.overlays ?? []).map((o) => o.text)].filter(Boolean).join('\n')
    const safety = await moderateContent({ surface: 'ads_render', stage: 'input', userId: user.id, text, meta: { order_id: orderId, v2: true } })
    if (!safety.ok) return v2Fail(safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}`, safety.reason === 'unavailable' ? 503 : 422)

    const cost = adsV2Credits(order.tier, order.seconds)
    const usd = estimateAdUsd({ tier: order.tier, shots: plan.shots.map((s) => ({ kind: s.kind, source: s.source })), seconds: plan.totalSeconds })

    // ENSAIO DE US$ 0: plano + custo, sem débito e sem fal. Para aqui.
    if (dryRun) {
      await writeServerEvent({ name: 'ads_v2_dry_run_served', userId: user.id, path: '/api/ads/v2/start', metadata: { order_id: orderId, tier: order.tier, seconds: order.seconds, credits: cost, usd: usd.totalUsd, shots: plan.shots.length } })
      return v2Json({
        dry_run: true,
        charged: false,
        order_id: orderId,
        credits: cost,
        usd_estimate: usd,
        total_seconds: plan.totalSeconds,
        narration: plan.narration,
        overlays: plan.overlays,
        shots: plan.shots.map((s) => ({ idx: s.idx, role: s.role, kind: s.kind, source: s.source, cut_seconds: s.cutSeconds, prompt: s.prompt, scene_prompt: s.scenePrompt })),
      })
    }

    // Saldo antes da trava (o RPC de débito não recusa saldo curto; chargeAdsV2 confere de novo).
    const prof = await admin.from('profiles').select('video_credits').eq('id', user.id).maybeSingle()
    const balance = Number((prof.data as { video_credits?: number } | null)?.video_credits ?? 0)
    if (!(balance >= cost)) return v2Fail('out_of_credits', 402, { needed: cost, balance })

    // Trava condicional: só um início por pedido; o índice único parcial deixa só UM anúncio ativo por conta.
    const generationId = randomUUID()
    const billingRef = adsV2BillingRef(orderId, generationId)
    const lock = await admin
      .from('ads_v2_orders')
      .update({ status: 'generating', generation_id: generationId, billing_ref: billingRef, credits_charged: cost, started_at: new Date().toISOString(), error: null })
      .eq('id', orderId)
      .eq('user_id', user.id)
      .in('status', ['draft', 'planned'])
      .select('id')
      .maybeSingle()
    if (lock.error) return lock.error.code === '23505' ? v2Fail('another_active', 409) : v2Fail('start_failed', 502)
    if (!lock.data) return v2Fail('not_startable', 409)
    locked = { id: orderId, user_id: user.id, billing_ref: billingRef }

    // Débito com o padrão confiável (intenção → saldo → débito → releitura do ledger).
    const charge = await chargeAdsV2(admin, { userId: user.id, billingRef, cost })
    if (!charge.ok) {
      if (!charge.debitPossible) {
        // Provado que nada foi debitado: o pedido volta a 'planned' (só esta geração).
        await admin.from('ads_v2_orders').update({ status: 'planned', generation_id: null, billing_ref: null, credits_charged: 0, started_at: null })
          .eq('id', orderId).eq('generation_id', generationId).eq('status', 'generating')
      } else {
        await failAdsV2Order(admin, locked, `charge_${charge.code}`, '/api/ads/v2/start')
      }
      locked = null
      return v2Fail(charge.code, charge.status, charge.balance !== undefined ? { needed: cost, balance: charge.balance } : {})
    }

    // Planos da geração (text nasce 'skipped_text' e nunca vai à fal).
    const rows = buildInitialShotRows(orderId, order.tier, plan)
    const ins = await admin.from('ads_v2_shots').upsert(rows, { onConflict: 'order_id,idx,attempt', ignoreDuplicates: true })
    if (ins.error) {
      await failAdsV2Order(admin, locked, 'shots_insert_failed', '/api/ads/v2/start')
      locked = null
      return v2Fail('start_failed', 502)
    }
    locked = null

    const fresh = (await loadAdsV2Order(admin, orderId, user.id)).order
    const sent = fresh ? await dispatchAdsV2Shots(admin, fresh, started + DISPATCH_BUDGET_MS) : 0
    await writeServerEvent({
      name: 'ads_v2_started',
      userId: user.id,
      path: '/api/ads/v2/start',
      metadata: {
        order_id: orderId, generation_id: generationId, billing_ref: billingRef, tier: order.tier, seconds: order.seconds, credits: cost,
        usd_estimate: usd.totalUsd, shots: rows.length, text_shots: rows.filter((r) => r.kind === 'text').length, submitted_now: sent, ms: Date.now() - started,
      },
    })
    const shots = (await loadAdsV2Shots(admin, orderId)) ?? []
    return v2Json(fresh ? { ...adsV2View(fresh, shots), usd_estimate: usd } : { order_id: orderId, status: 'generating' }, 202)
  } catch (e) {
    console.warn('[ads/v2/start] falhou:', e instanceof Error ? e.message : String(e))
    if (locked && admin) await failAdsV2Order(admin, locked, `exception:${e instanceof Error ? e.message : String(e)}`, '/api/ads/v2/start').catch(() => null)
    return v2Fail('start_failed', 502)
  }
}
