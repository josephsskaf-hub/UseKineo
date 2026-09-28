// KINEO-ADS-V2-2026-09-28 — "Refazer este plano" (especificação, seção 5, passo 6): cobrado À PARTE, com o valor que
// a tela MOSTROU antes do clique (expected_credits; preço diferente = 409 'price_changed', nada cobrado).
//
// A refação é um PEDIDO NOVO com id DETERMINÍSTICO (pai, plano, linha que será substituída), gravado ANTES do débito
// e de qualquer POST à fal. Dois cliques = o mesmo id = um débito só (chave 'adsv2redo-<id>', idempotente no ledger) e
// um pedido só (a chave primária recusa o segundo). Os planos prontos do pai são COPIADOS (sem fal), a música e a voz
// do pai são reaproveitadas, e só o plano refeito sai — com OUTRO movimento. O motor é o principal do plano (a conta
// de tentativas recomeça em 1: routeShot não confunde refação paga com falha). Plano `text` não tem refação.
// Falha terminal da refação estorna SÓ a refação; o anúncio do pai continua entregue.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { adsGate, isMissingAdsTable, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { sanitizeRetakeBody } from '@/lib/ads/v2Contract'
import { ADS_V2_ENGINES, adsV2RetakeCredits, routeShot } from '@/lib/ads/v2Tiers'
import { motionPrompt } from '@/lib/ads/v2ShotLists'
import { adsV2RetakeRef, chargeAdsV2, deterministicUuid, failAdsV2Order } from '@/lib/ads/v2Billing'
import { adsV2View, dispatchAdsV2Shots, latestShots, loadAdsV2Order, loadAdsV2Shots } from '@/lib/ads/v2Advance'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const DISPATCH_BUDGET_MS = 40_000

export async function POST(req: NextRequest) {
  const started = Date.now()
  // Refação cobrada e ainda sem planos gravados: uma exceção aqui falha a refação COM estorno (nunca crédito preso).
  let charged: { id: string; user_id: string; billing_ref: string; parent_order_id: string } | null = null
  let adminRef: Awaited<ReturnType<typeof loadAdsAccess>>['admin'] | null = null
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const { admin, reason } = await loadAdsAccess(user.id, user.email)
    adminRef = admin
    const gate = adsGate(reason)
    if (gate !== 'ok') {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/v2/retake', metadata: { reason: gate } })
      return v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403)
    }
    if (!adsV2Visible(user.email)) return v2Fail('v2_closed', 403)

    const parsed = sanitizeRetakeBody(await req.json().catch(() => null))
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const { order_id: parentId, idx, expected_credits: expected } = parsed.value

    const { order: parent, error } = await loadAdsV2Order(admin, parentId, user.id)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('retake_failed', 502)
    if (!parent) return v2Fail('order_not_found', 404)
    if (parent.status !== 'delivered') return v2Fail('not_delivered', 409)
    const parentShots = await loadAdsV2Shots(admin, parent.id)
    if (!parentShots) return v2Fail('retake_failed', 502)
    const latest = latestShots(parentShots)
    const target = latest.find((r) => r.idx === idx)
    if (!target) return v2Fail('bad_idx', 400)
    // REGRA DURA: texto nunca passa por IA — plano `text` não tem refação.
    if (target.kind === 'text') return v2Fail('text_not_retakable', 400)
    if (target.status !== 'done' || !target.image_url) return v2Fail('shot_not_ready', 409)
    const price = adsV2RetakeCredits(target.kind, parent.tier)
    if (price !== expected) return v2Fail('price_changed', 409, { credits: price })

    // Id determinístico gravado ANTES do débito e do POST. REVISÃO 28/09: a semente leva quantas refações DESTE plano
    // já FECHARAM (entregue/falhou/cancelada). Sem isso, a refação recusada por saldo (cancelled) ou que falhou com
    // estorno travava o plano PARA SEMPRE (o 2º clique caía no 23505 e devolvia o pedido morto como "já começou"), e
    // refazer de novo o mesmo plano devolvia a refação velha. Dois cliques juntos contam o mesmo número = o mesmo id.
    const prior = await admin
      .from('ads_v2_orders')
      .select('id, status')
      .eq('parent_order_id', parent.id)
      .eq('retake_idx', idx)
      .eq('user_id', user.id)
    if (prior.error) return isMissingAdsTable(prior.error.code) ? v2Fail('not_ready', 503) : v2Fail('retake_failed', 502)
    const closed = ((prior.data ?? []) as { status: string }[]).filter((r) => r.status === 'delivered' || r.status === 'failed' || r.status === 'cancelled').length
    const retakeId = deterministicUuid(`adsv2redo:${parent.id}:${idx}:${target.id}:${closed}`)
    const billingRef = adsV2RetakeRef(retakeId)
    const ins = await admin
      .from('ads_v2_orders')
      .insert({
        id: retakeId,
        user_id: user.id,
        status: 'generating',
        tier: parent.tier,
        seconds: parent.seconds,
        sector: parent.sector,
        brief: parent.brief,
        language: parent.language,
        narration: parent.narration,
        logo_footage_id: parent.logo_footage_id,
        card_footage_id: parent.card_footage_id,
        card_url: parent.card_url,
        photos: parent.photos,
        plan: parent.plan,
        music_url: parent.music_url,
        voice_url: parent.voice_url,
        voice_seconds: parent.voice_seconds,
        billing_ref: billingRef,
        credits_charged: price,
        generation_id: retakeId,
        started_at: new Date().toISOString(),
        parent_order_id: parent.id,
        retake_idx: idx,
      })
      .select('id')
      .maybeSingle()
    if (ins.error) {
      if (ins.error.code === '23505') {
        // Mesmo clique de novo (mesmo id) → devolve o pedido que já existe; outro anúncio ativo → 409.
        const again = (await loadAdsV2Order(admin, retakeId, user.id)).order
        if (again && again.parent_order_id === parent.id && again.retake_idx === idx) {
          return v2Json({ ...adsV2View(again, (await loadAdsV2Shots(admin, retakeId)) ?? []), already_started: true }, 202)
        }
        return v2Fail('another_active', 409)
      }
      return isMissingAdsTable(ins.error.code) ? v2Fail('not_ready', 503) : v2Fail('retake_failed', 502)
    }
    const retake = { id: retakeId, user_id: user.id, billing_ref: billingRef, parent_order_id: parent.id }

    const charge = await chargeAdsV2(admin, { userId: user.id, billingRef, cost: price })
    if (!charge.ok) {
      if (!charge.debitPossible) {
        await admin.from('ads_v2_orders').update({ status: 'cancelled', error: `charge_${charge.code}` }).eq('id', retakeId).eq('status', 'generating')
      } else {
        await failAdsV2Order(admin, retake, `charge_${charge.code}`, '/api/ads/v2/retake')
      }
      return v2Fail(charge.code, charge.status, charge.balance !== undefined ? { needed: price, balance: charge.balance } : {})
    }

    charged = retake
    // Planos: os prontos do pai copiados (sem fal); o refeito com o motor principal e OUTRO movimento.
    const engine = routeShot(target.kind, parent.tier, 1)
    const variant = target.movement_variant + 1
    const rows = latest.map((r) => {
      if (r.idx !== idx) {
        return {
          order_id: retakeId, idx: r.idx, attempt: 1, role: r.role, kind: r.kind, source: r.source, source_footage_id: r.source_footage_id,
          image_url: r.image_url, engine: r.engine, prompt: r.prompt, gen_seconds: r.gen_seconds, cut_start: r.cut_start, cut_seconds: r.cut_seconds,
          movement_variant: r.movement_variant, status: r.status, stored_url: r.stored_url, measured_seconds: r.measured_seconds, reason: 'copied_from_parent',
        }
      }
      return {
        order_id: retakeId, idx: r.idx, attempt: 1, role: r.role, kind: r.kind, source: r.source, source_footage_id: r.source_footage_id,
        image_url: r.image_url, engine, prompt: motionPrompt(r.kind as Exclude<typeof r.kind, 'text'>, variant),
        gen_seconds: engine ? ADS_V2_ENGINES[engine].genSeconds : null, cut_start: r.cut_start, cut_seconds: r.cut_seconds,
        movement_variant: variant, status: r.source === 'generated_scene' ? 'image_done' : 'pending', reason: 'paid_retake',
      }
    })
    const shotsIns = await admin.from('ads_v2_shots').upsert(rows, { onConflict: 'order_id,idx,attempt', ignoreDuplicates: true })
    if (shotsIns.error) {
      await failAdsV2Order(admin, retake, 'retake_shots_insert_failed', '/api/ads/v2/retake')
      charged = null
      return v2Fail('retake_failed', 502)
    }
    charged = null
    const fresh = (await loadAdsV2Order(admin, retakeId, user.id)).order
    const sent = fresh ? await dispatchAdsV2Shots(admin, fresh, started + DISPATCH_BUDGET_MS) : 0
    await writeServerEvent({
      name: 'ads_v2_retake_started',
      userId: user.id,
      path: '/api/ads/v2/retake',
      metadata: { order_id: retakeId, parent_order_id: parent.id, idx, kind: target.kind, engine, credits: price, billing_ref: billingRef, submitted_now: sent },
    })
    return v2Json(fresh ? adsV2View(fresh, (await loadAdsV2Shots(admin, retakeId)) ?? []) : { order_id: retakeId, status: 'generating' }, 202)
  } catch (e) {
    console.warn('[ads/v2/retake] falhou:', e instanceof Error ? e.message : String(e))
    if (charged && adminRef) await failAdsV2Order(adminRef, charged, `exception:${e instanceof Error ? e.message : String(e)}`, '/api/ads/v2/retake').catch(() => null)
    return v2Fail('retake_failed', 502)
  }
}
