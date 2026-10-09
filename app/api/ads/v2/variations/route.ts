// KINEO-ADS-3-VARIACOES-2026-09-30 — "3 variações" do anúncio v2 (lib/ads/v2Variations.ts tem o porquê e as regras).
//
// POST { order_id, expected_credits, dry_run? }       → o pedido PLANEJADO vira a variação A; B e C nascem como clones
//                                                        com o look aplicado; UM débito (3 partes) antes de qualquer fal.
// POST { action: 'choose', order_id }                   → "Escolher esta" (grava no grupo; nada é cobrado).
// GET  ?group=<id> | ?latest=1                          → o grupo e os 3 pedidos (a tela consulta cada um no /status).
//
// ORDEM DAS TRAVAS (o guardião scripts/test-ads-3-variacoes-2026-09-30.mjs confere a ordem no arquivo):
//   login → loadAdsAccess/adsGate → adsV2Visible → adsVariationsVisible (404 'not_found' ANTES de qualquer débito) →
//   pedido do dono, planejado e com cartão → moderação → preço do grupo (2,5×) = o que a tela mostrou → dry_run PARA
//   aqui → saldo ≥ preço → grupo + B/C gravados (tabela/colunas novas ausentes = 503 'not_ready', nada cobrado) →
//   chargeVariationGroup (trava as 3, cobra as 3 partes; tudo ou nada) → planos gravados → envio à fal → 202.
// Sem a opção ligada o /start de sempre continua sendo o único caminho: nada aqui é chamado por ele.
import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration'
import { adsGate, isMissingAdsTable, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { adsVariationsVisible } from '@/lib/ads/v2VariationsAccess'
import { isUuid } from '@/lib/ads/v2Contract'
import { adsV2Credits, estimateAdUsd } from '@/lib/ads/v2Tiers'
import { motionPrompt, type AdsV2MotionKind } from '@/lib/ads/v2ShotLists'
import { adsV2BillingRef, chargeAdsV2, deterministicUuid, failAdsV2Order, refundAdsV2Confirmed } from '@/lib/ads/v2Billing'
import { adsV2View, buildInitialShotRows, dispatchAdsV2Shots, loadAdsV2Order, loadAdsV2Shots, type AdsV2StoredPlan } from '@/lib/ads/v2Advance'
import {
  ADS_V2_LOOKS,
  ADS_V2_VARIATION_SLOTS,
  adsV2VariationCredits,
  adsV2VariationRefund,
  adsV2VariationShares,
  applyAdsV2Look,
  chargeVariationGroup,
  sanitizeVariationsBody,
  variationTagOf,
  type AdsV2VariationMember,
  type AdsV2VariationSlot,
  type AdsV2VariationTag,
} from '@/lib/ads/v2Variations'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

/** Prazo para abrir envios novos nesta chamada (o resto sai pelo avanço da tela/cron, como no /start). */
const DISPATCH_BUDGET_MS = 40_000
const PATH = '/api/ads/v2/variations'

/** Tabela/coluna nova ainda não aplicada (migrations_pending/2026-09-30_ads_v2_variacoes.sql). */
const isMissingVariationSchema = (code: string | undefined) => isMissingAdsTable(code) || code === '42703' || code === 'PGRST204'

const lookMotion = (kind: string, variant: number) => motionPrompt(kind as AdsV2MotionKind, variant)
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

interface MemberRow {
  id: string
  status: string
  tier: string
  seconds: number
  credits_charged: number
  video_id: string | null
  error: string | null
  variation_slot: AdsV2VariationSlot | null
  variation_group_id: string | null
}

async function groupView(admin: Awaited<ReturnType<typeof loadAdsAccess>>['admin'], userId: string, groupId: string) {
  const g = await admin.from('ads_v2_variation_groups').select('id, anchor_order_id, tier, seconds, credits_total, shares, chosen_order_id, created_at').eq('id', groupId).eq('user_id', userId).maybeSingle()
  if (g.error) return { error: g.error }
  if (!g.data) return { group: null }
  const m = await admin
    .from('ads_v2_orders')
    .select('id, status, tier, seconds, credits_charged, video_id, error, variation_slot, variation_group_id')
    .eq('variation_group_id', groupId)
    .eq('user_id', userId)
  if (m.error) return { error: m.error }
  const rows = ((m.data ?? []) as MemberRow[]).filter((r) => r.variation_slot)
  const group = g.data as { id: string; anchor_order_id: string; tier: string; seconds: number; credits_total: number; shares: number[]; chosen_order_id: string | null; created_at: string }
  const members = ADS_V2_VARIATION_SLOTS.map((slot) => {
    const r = rows.find((x) => x.variation_slot === slot)
    return r
      ? { slot, look: ADS_V2_LOOKS[slot].id, order_id: r.id, status: r.status, credits: r.credits_charged, video_id: r.video_id, error: r.status === 'failed' ? (r.error ?? 'failed') : null }
      : null
  }).filter((x): x is NonNullable<typeof x> => x !== null)
  const refunded = adsV2VariationRefund(members.map((x) => ({ credits: x.credits, failed: x.status === 'failed' })))
  return { group: { group_id: group.id, anchor_order_id: group.anchor_order_id, tier: group.tier, seconds: group.seconds, credits: group.credits_total, shares: group.shares, chosen_order_id: group.chosen_order_id, created_at: group.created_at, refunded, members } }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    if (!adsVariationsVisible(user.email)) return v2Fail('not_found', 404)
    const { admin } = await loadAdsAccess(user.id, user.email)
    let groupId = (req.nextUrl.searchParams.get('group') ?? '').toLowerCase()
    if (!groupId && req.nextUrl.searchParams.get('latest') === '1') {
      // O grupo mais novo que ainda tem variação em andamento (a tela retoma o painel das 3 sem ?group=).
      const act = await admin
        .from('ads_v2_orders')
        .select('variation_group_id, created_at')
        .eq('user_id', user.id)
        .in('status', ['generating', 'assembling'])
        .not('variation_group_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
      if (act.error) return isMissingVariationSchema(act.error.code) ? v2Fail('not_ready', 503) : v2Fail('variations_failed', 502)
      const row = ((act.data ?? []) as { variation_group_id: string | null }[])[0]
      if (!row?.variation_group_id) return v2Json({ group: null })
      groupId = row.variation_group_id
    }
    if (!isUuid(groupId)) return v2Fail('bad_group_id', 400)
    const v = await groupView(admin, user.id, groupId)
    if ('error' in v && v.error) return isMissingVariationSchema(v.error.code) ? v2Fail('not_ready', 503) : v2Fail('variations_failed', 502)
    if (!v.group) return v2Fail('group_not_found', 404)
    return v2Json({ group: v.group })
  } catch (e) {
    console.warn('[ads/v2/variations GET] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('variations_failed', 502)
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const access = await loadAdsAccess(user.id, user.email)
    const admin = access.admin
    const gate = adsGate(access.reason)
    if (gate !== 'ok') {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: PATH, metadata: { reason: gate } })
      return v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403)
    }
    if (!adsV2Visible(user.email)) return v2Fail('v2_closed', 403)
    // Interruptor das variações ANTES de qualquer débito: conta de fora com a opção desligada = 404, nada cobrado.
    if (!adsVariationsVisible(user.email)) return v2Fail('not_found', 404)

    const parsed = sanitizeVariationsBody(await req.json().catch(() => null))
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const body = parsed.value

    // ── "Escolher esta" ─────────────────────────────────────────────────────────────────────────────────────────
    if (body.action === 'choose') {
      const o = await admin.from('ads_v2_orders').select('id, status, variation_group_id').eq('id', body.order_id).eq('user_id', user.id).maybeSingle()
      if (o.error) return isMissingVariationSchema(o.error.code) ? v2Fail('not_ready', 503) : v2Fail('variations_failed', 502)
      const row = o.data as { id: string; status: string; variation_group_id: string | null } | null
      if (!row || !row.variation_group_id) return v2Fail('order_not_found', 404)
      if (row.status !== 'delivered') return v2Fail('not_delivered', 409)
      const upd = await admin.from('ads_v2_variation_groups').update({ chosen_order_id: row.id, updated_at: new Date().toISOString() }).eq('id', row.variation_group_id).eq('user_id', user.id).select('id').maybeSingle()
      if (upd.error || !upd.data) return v2Fail('variations_failed', 502)
      await writeServerEvent({ name: 'ads_v2_variation_chosen', userId: user.id, path: PATH, metadata: { group_id: row.variation_group_id, order_id: row.id } })
      return v2Json({ group_id: row.variation_group_id, chosen_order_id: row.id })
    }

    // ── começar as 3 ────────────────────────────────────────────────────────────────────────────────────────────
    const { order_id: orderId, dry_run: dryRun, expected_credits: expected } = body
    const { order: a, error } = await loadAdsV2Order(admin, orderId, user.id)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('variations_failed', 502)
    if (!a) return v2Fail('order_not_found', 404)
    if (a.status !== 'draft' && a.status !== 'planned') return v2Fail('not_startable', 409, { status: a.status })
    if (!a.plan || !Array.isArray(a.plan.shots) || a.plan.shots.length === 0) return v2Fail('plan_required', 409)
    if (!a.card_url) return v2Fail('card_required', 400)
    if (a.parent_order_id) return v2Fail('not_startable', 409)
    const tagA = variationTagOf(a.brief)
    // Só o pedido-âncora (ou um pedido comum) abre o grupo: B/C não viram âncora de outro grupo.
    if (tagA && tagA.slot !== 'A') return v2Fail('not_anchor', 409)

    // Moderação: a mesma régua do /start (o texto é o mesmo nas 3).
    const text = [a.plan.narration ?? '', ...(a.plan.overlays ?? []).map((o) => o.text)].filter(Boolean).join('\n')
    const safety = await moderateContent({ surface: 'ads_render', stage: 'input', userId: user.id, text, meta: { order_id: orderId, v2: true, variations: true } })
    if (!safety.ok) return v2Fail(safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}`, safety.reason === 'unavailable' ? 503 : 422)

    // Preço do GRUPO: 2,5 × o preço do nível (a MESMA função que a tela mostra) e as 3 partes do débito único.
    const one = adsV2Credits(a.tier, a.seconds)
    const total = adsV2VariationCredits(one)
    const shares = adsV2VariationShares(total)
    if (!dryRun && expected !== total) return v2Fail('price_changed', 409, { credits: total })

    // Plano-base: o guardado quando a A já recebeu o look (clique repetido/volta depois de recusa), senão o plano atual.
    const briefA = (a.brief ?? {}) as Record<string, unknown>
    const storedBase = briefA.variation_base_plan as AdsV2StoredPlan | undefined
    const sector = a.sector ?? 'other'
    const base: AdsV2StoredPlan = storedBase && sameJson(applyAdsV2Look(storedBase, 'A', { sector, motion: lookMotion }), a.plan) ? storedBase : a.plan
    const plans = ADS_V2_VARIATION_SLOTS.map((slot) => applyAdsV2Look(base, slot, { sector, motion: lookMotion }))
    const usdOne = estimateAdUsd({ tier: a.tier, shots: base.shots.map((s) => ({ kind: s.kind, source: s.source, styled: !!s.effect })), seconds: base.totalSeconds, presenter: !!base.presenter }) // KINEO-ESTILOS-PRODUTO-2026-10-09 — o plano com estilo custa o efeito · KINEO-ATOR-ANUNCIO-2026-10-09 — o ator custa a foto e o vídeo falado
    const usdTotal = Math.round(usdOne.totalUsd * 3 * 1000) / 1000

    if (dryRun) {
      await writeServerEvent({ name: 'ads_v2_variations_dry_run_served', userId: user.id, path: PATH, metadata: { order_id: orderId, tier: a.tier, seconds: a.seconds, credits: total, shares, usd: usdTotal } })
      return v2Json({
        dry_run: true,
        charged: false,
        order_id: orderId,
        credits: total,
        credits_single: one,
        shares,
        usd_estimate: usdTotal,
        variations: ADS_V2_VARIATION_SLOTS.map((slot, i) => ({
          slot,
          look: ADS_V2_LOOKS[slot].id,
          credits: shares[i],
          shots: plans[i].shots.map((s) => ({ idx: s.idx, kind: s.kind, source: s.source, prompt: s.prompt, scene_prompt: s.scenePrompt })),
        })),
      })
    }

    // Saldo antes de gravar qualquer coisa (chargeAdsV2 confere de novo, parte a parte).
    const prof = await admin.from('profiles').select('video_credits').eq('id', user.id).maybeSingle()
    const balance = Number((prof.data as { video_credits?: number } | null)?.video_credits ?? 0)
    if (!(balance >= total)) return v2Fail('out_of_credits', 402, { needed: total, balance })

    // Grupo e ids DETERMINÍSTICOS (o mesmo clique duas vezes = o mesmo grupo e os mesmos pedidos B/C).
    const groupId = deterministicUuid(`adsv2grp:${a.id}`)
    const ids: Record<AdsV2VariationSlot, string> = { A: a.id, B: deterministicUuid(`adsv2var:${a.id}:B`), C: deterministicUuid(`adsv2var:${a.id}:C`) }
    const tag = (slot: AdsV2VariationSlot): AdsV2VariationTag => ({ group_id: groupId, slot, look: ADS_V2_LOOKS[slot].id, anchor_order_id: a.id })
    const g = await admin
      .from('ads_v2_variation_groups')
      .upsert({ id: groupId, user_id: user.id, anchor_order_id: a.id, tier: a.tier, seconds: a.seconds, credits_total: total, shares }, { onConflict: 'id', ignoreDuplicates: true })
    if (g.error) return isMissingVariationSchema(g.error.code) ? v2Fail('not_ready', 503) : v2Fail('variations_failed', 502)
    await admin.from('ads_v2_variation_groups').update({ credits_total: total, shares, updated_at: new Date().toISOString() }).eq('id', groupId).eq('user_id', user.id)

    // A: recebe o look A, a marca e o plano-base (para o clique seguinte achar a base).
    const { variation_base_plan: _drop, ...briefClean } = briefA
    void _drop
    const updA = await admin
      .from('ads_v2_orders')
      .update({ plan: plans[0], brief: { ...briefClean, variation: tag('A'), variation_base_plan: base }, variation_group_id: groupId, variation_slot: 'A' })
      .eq('id', a.id)
      .eq('user_id', user.id)
      .in('status', ['draft', 'planned'])
      .select('id')
      .maybeSingle()
    if (updA.error) return isMissingVariationSchema(updA.error.code) ? v2Fail('not_ready', 503) : v2Fail('variations_failed', 502)
    if (!updA.data) return v2Fail('not_startable', 409)
    // B e C: pedidos v2 NORMAIS, clones da A (mesmas fotos, logo, cartão, voz, língua e texto) com o próprio look.
    for (const slot of ['B', 'C'] as const) {
      const i = slot === 'B' ? 1 : 2
      const clone = {
        tier: a.tier, seconds: a.seconds, sector: a.sector, brief: { ...briefClean, variation: tag(slot) }, language: a.language, narration: a.narration,
        logo_footage_id: a.logo_footage_id, card_footage_id: a.card_footage_id, card_url: a.card_url, photos: a.photos, plan: plans[i],
        variation_group_id: groupId, variation_slot: slot,
      }
      const ins = await admin.from('ads_v2_orders').upsert({ id: ids[slot], user_id: user.id, status: 'planned', ...clone }, { onConflict: 'id', ignoreDuplicates: true })
      if (ins.error) return isMissingVariationSchema(ins.error.code) ? v2Fail('not_ready', 503) : v2Fail('variations_failed', 502)
      // Já existia (volta depois de uma recusa): refresca o clone enquanto ainda não começou.
      const upd = await admin.from('ads_v2_orders').update(clone).eq('id', ids[slot]).eq('user_id', user.id).in('status', ['draft', 'planned']).select('id').maybeSingle()
      if (upd.error || !upd.data) return v2Fail('not_startable', 409, { slot })
    }

    // DÉBITO ÚNICO: trava as 3 e cobra as 3 partes (somam o preço do grupo); tudo ou nada.
    const members: AdsV2VariationMember[] = ADS_V2_VARIATION_SLOTS.map((slot, i) => ({ slot, orderId: ids[slot], credits: shares[i] }))
    const refs = new Map<string, string>()
    const res = await chargeVariationGroup(members, {
      async lock(m) {
        const generationId = randomUUID()
        const billingRef = adsV2BillingRef(m.orderId, generationId)
        const lock = await admin
          .from('ads_v2_orders')
          .update({ status: 'generating', generation_id: generationId, billing_ref: billingRef, credits_charged: m.credits, started_at: new Date().toISOString(), error: null })
          .eq('id', m.orderId)
          .eq('user_id', user.id)
          .in('status', ['draft', 'planned'])
          .select('id')
          .maybeSingle()
        if (lock.error) return lock.error.code === '23505' ? { ok: false, code: 'another_active', status: 409 } : { ok: false, code: 'start_failed', status: 502 }
        if (!lock.data) return { ok: false, code: 'not_startable', status: 409 }
        refs.set(m.orderId, billingRef)
        return { ok: true, billingRef }
      },
      async charge(m, billingRef) {
        const c = await chargeAdsV2(admin, { userId: user.id, billingRef, cost: m.credits })
        return c.ok ? { ok: true } : { ok: false, code: c.code, status: c.status, debitPossible: c.debitPossible, ...(c.balance !== undefined ? { balance: c.balance } : {}) }
      },
      async refund(_m, billingRef) {
        return (await refundAdsV2Confirmed(admin, { userId: user.id, billingRef })).state
      },
      async unlock(m, billingRef) {
        await admin.from('ads_v2_orders').update({ status: 'planned', generation_id: null, billing_ref: null, credits_charged: 0, started_at: null })
          .eq('id', m.orderId).eq('billing_ref', billingRef).eq('status', 'generating')
      },
      async fail(m, billingRef, reason) {
        await failAdsV2Order(admin, { id: m.orderId, user_id: user.id, billing_ref: billingRef, credits_charged: m.credits }, reason, PATH)
      },
    })
    if (!res.ok) return v2Fail(res.code, res.status, res.balance !== undefined ? { needed: total, balance: res.balance } : {})

    // Planos de cada variação (text nasce 'skipped_text'; user_video nasce 'done'). Falha aqui = só ESTA variação falha.
    for (const [i, c] of res.charged.entries()) {
      const rows = buildInitialShotRows(c.orderId, a.tier, plans[i])
      const ins = await admin.from('ads_v2_shots').upsert(rows, { onConflict: 'order_id,idx,attempt', ignoreDuplicates: true })
      if (ins.error) await failAdsV2Order(admin, { id: c.orderId, user_id: user.id, billing_ref: c.billingRef, credits_charged: c.credits }, 'shots_insert_failed', PATH)
    }

    // Envio: A primeiro (o still das pessoas da A é a referência de B e C), depois B e C, dentro do prazo.
    let sent = 0
    const views = []
    for (const c of res.charged) {
      const fresh = (await loadAdsV2Order(admin, c.orderId, user.id)).order
      if (fresh) sent += await dispatchAdsV2Shots(admin, fresh, started + DISPATCH_BUDGET_MS)
    }
    for (const c of res.charged) {
      const fresh = (await loadAdsV2Order(admin, c.orderId, user.id)).order
      const shots = (await loadAdsV2Shots(admin, c.orderId)) ?? []
      views.push({ slot: c.slot, look: ADS_V2_LOOKS[c.slot].id, ...(fresh ? adsV2View(fresh, shots) : { order_id: c.orderId, status: 'generating', credits: c.credits }) })
    }
    await writeServerEvent({
      name: 'ads_v2_variations_started',
      userId: user.id,
      path: PATH,
      metadata: {
        group_id: groupId, anchor_order_id: a.id, order_ids: res.charged.map((c) => c.orderId), billing_refs: res.charged.map((c) => c.billingRef),
        tier: a.tier, seconds: a.seconds, credits: total, credits_single: one, shares, usd_estimate: usdTotal, submitted_now: sent, ms: Date.now() - started,
      },
    })
    return v2Json({ group_id: groupId, credits: total, shares, members: views }, 202)
  } catch (e) {
    console.warn('[ads/v2/variations] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('variations_failed', 502)
  }
}
