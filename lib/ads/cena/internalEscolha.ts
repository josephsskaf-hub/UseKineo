// KINEO-ADS-ESCOLHA-2310 — plan → four persisted stills → explicit choice → existing v2 debit/start.
// KINEO-ADS-ESCOLHA-PUBLICO-2410 — same access gate, reserved photo allowance and server transition funnel.
import type { CenaInternalDeps } from './internal'
import type { AdsV2Caller } from '../v2PlanCore'
import { isAdsInternalEmail } from '../access'
import { cenaEnabled } from './catalog'
import { cenaInput } from './plan'
import { cenaAssertVoiceRoute, cenaResolveRoute, isCenaRoute } from './adapters'
import { planCenaEscolha, preflightCenaEscolha } from './escolhaPlan'
import { escolhaPresenter, escolhaScenario } from './escolhaCatalog'
import { escolhaOf, newEscolhaFlow, stepEscolhaStills, chooseEscolhaStill, escolhaView, restartEscolhaStills, escolhaPhotoRound, type EscolhaStillDeps, type EscolhaStored } from './escolhaStills'
import { cena95ModerationFailure } from './moderation95'
import { newCenaState } from './pipeline'
import { planShots } from '../v2ShotLists'
import { v2Fail, v2Json } from '../v2Server'
import { adsV2Credits } from '../v2Tiers'
import { isUuid } from '../v2Contract'
import { adsGate, type AdsAccessLoad } from '../serverAccess'
import { escolhaPhotoEligibility, reserveEscolhaPhotos } from './escolhaQuota'
import { writeEscolhaEvent } from './escolhaEvents'

export type EscolhaEffects = Pick<EscolhaStillDeps, 'submit' | 'poll' | 'persist'>
export interface EscolhaInternalDeps extends CenaInternalDeps {
  access?: AdsAccessLoad;
  escolhaEffects?(userId: string, orderId: string): Promise<EscolhaEffects>;
  now?(): number;
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export async function internalCenaEscolhaFor(user: AdsV2Caller, body: unknown, d: EscolhaInternalDeps): Promise<Response> {
  if (!cenaEnabled(isAdsInternalEmail(user.email))) return v2Fail('cena_internal_only', 403)
  const internal = isAdsInternalEmail(user.email)
  const gate = d.access ? adsGate(d.access.reason) : internal ? 'ok' : 'no_access'
  if (gate !== 'ok') return v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403)
  const uid = d.access?.ownerId ?? user.id
  if (!record(body)) return v2Fail('cena_bad_body', 400)
  const stage = body.stage ?? 'plan', now = d.now ?? Date.now
  if (!['plan', 'stills', 'choose', 'render'].includes(String(stage))) return v2Fail('cena_bad_stage', 400)
  if (body.dry_run !== undefined && typeof body.dry_run !== 'boolean') return v2Fail('cena_bad_dry_run', 400)
  if (body.regenerate !== undefined && typeof body.regenerate !== 'boolean') return v2Fail('cena_bad_regenerate', 400)
  try {
    if (stage === 'plan') {
      if (body.rota !== undefined && !isCenaRoute(body.rota)) return v2Fail('cena_bad_route', 400)
      const presenter = escolhaPresenter(body.presenter_id), scenario = escolhaScenario(body.scenario_id)
      if (!presenter) return v2Fail('cena_presenter_required', 400)
      if (!scenario || body.category !== undefined && body.category !== scenario.category) return v2Fail('cena_scenario_required', 400)
      // A browser cannot substitute an unapproved reference URL for the selected library presenter.
      const input = cenaInput({ ...body, ...(!internal ? { voice_mode: 'narrated' } : {}), actorUrl: `https://www.usekineo.com${presenter.portrait}` })
      const route = cenaResolveRoute(input.voice_mode!, internal ? body.rota : 'kling3')
      cenaAssertVoiceRoute(route, input.voice_mode!, input.language)
      const first = cena95ModerationFailure(await d.moderate([input.frase, input.oferta, input.cta, ...(input.beneficios ?? [])].filter(Boolean).join('\n')))
      if (first) return v2Fail(first.error, first.status)
      const plan = await planCenaEscolha(input, route, d.json, { presenter_id: presenter.id, scenario_id: scenario.id, category: scenario.category })
      preflightCenaEscolha(plan, route)
      const safety = cena95ModerationFailure(await d.moderate(plan.script.narration))
      if (safety) return v2Fail(safety.error, safety.status)
      const response = { engine: 'KINEO-ADS-ESCOLHA-2310', stage: 'planned', charged: false, plan, narration_used: plan.script.narration, quality_notes: plan.quality_notes ?? [], credits: adsV2Credits('commercial', 15) }
      if (body.dry_run === true) return v2Json({ ...response, dry_run: true })
      const skeleton = planShots({ sector: 'store', tier: 'commercial', seconds: 15, photos: [{ id: '00000000-0000-4000-8000-000000000001', url: input.foto, kind: 'text' }] })
      const stored = { ...skeleton, overlays: [], narration: plan.script.narration, cena: newCenaState(plan, route), escolhaFlow: newEscolhaFlow(), escolhaActorId: user.id }
      const ins = await d.admin.from('ads_v2_orders').insert({ user_id: uid, status: 'planned', tier: 'commercial', seconds: 15, sector: 'store', language: input.language, narration: true, card_url: input.foto, photos: [], brief: { sentence: input.frase, business: plan.product, offer: plan.input.oferta, kind: input.formato, cena: true, voice_mode: plan.voice_mode }, plan: stored }).select('id').maybeSingle()
      if (ins.error || !ins.data) return v2Fail('cena_order_failed', 503)
      await writeEscolhaEvent('plan', uid, String(ins.data.id), stored)
      return v2Json({ ...response, order_id: String(ins.data.id) }, 201)
    }
    if (!isUuid(body.order_id)) return v2Fail('bad_order_id', 400)
    const r = await d.admin.from('ads_v2_orders').select('*').eq('id', body.order_id).eq('user_id', uid).maybeSingle()
    if (r.error) return v2Fail('cena_order_failed', 503)
    if (!r.data) return v2Fail('order_not_found', 404)
    const order = r.data, loaded = escolhaOf(order.plan)
    if (!loaded) return v2Fail('cena_choice_plan_required', 409)
    let stored = loaded
    preflightCenaEscolha(stored.cena.plan, stored.cena.route)
    if (order.status !== 'planned') {
      if (stage === 'render' && ['generating', 'assembling', 'delivered'].includes(order.status) && stored.escolhaFlow.selectedStillId === body.still_id) return v2Json({ order_id: order.id, status: order.status, charged: order.credits_charged > 0, status_url: `/api/ads/v2/status?order_id=${order.id}`, ...escolhaView(stored) }, 202)
      return v2Fail('not_startable', 409, { status: order.status })
    }
    if (body.dry_run === true) {
      if (stage === 'choose' || stage === 'render') {
        if (stored.escolhaFlow.stage === 'chosen' && body.still_id !== stored.escolhaFlow.selectedStillId) return v2Fail('cena_choice_locked', 409)
        chooseEscolhaStill(JSON.parse(JSON.stringify(stored)) as EscolhaStored, body.still_id)
      }
      return v2Json({ dry_run: true, charged: false, order_id: order.id, plan: stored.cena.plan, ...escolhaView(stored) })
    }
    // The existing assembly lease is also usable while planned. No generating state, credit intent or debit yet.
    const oldLease = order.assembly_lease_at as string | null, token = new Date(now()).toISOString()
    if (oldLease && now() - Date.parse(oldLease) < 5 * 60_000) return v2Json({ order_id: order.id, charged: false, busy: true, ...escolhaView(stored) }, 202)
    let q = d.admin.from('ads_v2_orders').update({ assembly_lease_at: token }).eq('id', order.id).eq('user_id', uid).eq('status', 'planned')
    q = oldLease ? q.eq('assembly_lease_at', oldLease) : q.is('assembly_lease_at', null)
    const won = await q.select('id').maybeSingle()
    if (won.error) return v2Fail('cena_stills_busy', 503)
    if (!won.data) return v2Fail('cena_stills_busy', 409)
    const save = async () => {
      const s = await d.admin.from('ads_v2_orders').update({ plan: stored }).eq('id', order.id).eq('user_id', uid).eq('status', 'planned').eq('assembly_lease_at', token).select('id').maybeSingle()
      if (s.error || !s.data) throw new Error('cena_choice_lease_lost')
    }
    try {
      // A released null lease is reusable. A contender may have read an older plan before the previous winner saved it.
      const fresh = await d.admin.from('ads_v2_orders').select('plan').eq('id', order.id).eq('user_id', uid).eq('status', 'planned').eq('assembly_lease_at', token).maybeSingle()
      const latest = !fresh.error && fresh.data ? escolhaOf(fresh.data.plan) : null
      if (!latest) throw new Error('cena_choice_lease_lost')
      stored = latest
      preflightCenaEscolha(stored.cena.plan, stored.cena.route)
      if (stage === 'stills') {
        if (body.regenerate === true && escolhaPhotoRound(stored.escolhaFlow) >= 2) return v2Fail('cena_photo_round_limit', 429, { limit: 2 })
        const needsPhoto = body.regenerate === true || !stored.escolhaFlow.stills.length || stored.escolhaFlow.stills.some(j => j.status === 'new' || j.status === 'failed' && j.attempt < 2)
        if (needsPhoto) {
          const eligible = await escolhaPhotoEligibility(d.admin, uid, d.access)
          if (!eligible.ok) return v2Fail(eligible.error, eligible.status, { needed: eligible.needed, ...('balance' in eligible ? { balance: eligible.balance } : {}) })
          const reserved = await reserveEscolhaPhotos(d.admin, { orderId: order.id, ownerId: uid, actorId: user.id, leaseAt: token })
          if (!reserved.ok) return v2Fail(reserved.error, reserved.status, { ...('limit' in reserved ? { limit: reserved.limit, reset_at: reserved.reset_at } : {}) })
        }
        if (body.regenerate === true) { restartEscolhaStills(stored.cena.plan, stored.escolhaFlow); await save() }
        const before = stored.escolhaFlow.stage
        const effects = d.escolhaEffects ? await d.escolhaEffects(uid, order.id) : (await import('./escolhaTransport')).escolhaEffects(uid, order.id)
        await stepEscolhaStills(stored.cena.plan, stored.escolhaFlow, { ...effects, now, json: d.json, save: async flow => { stored.escolhaFlow = flow; await save() } })
        if (before !== stored.escolhaFlow.stage && stored.escolhaFlow.stage === 'choose') await writeEscolhaEvent('stills_ready', uid, order.id, stored, { photo_round: escolhaPhotoRound(stored.escolhaFlow) })
        if (before !== stored.escolhaFlow.stage && stored.escolhaFlow.stage === 'failed') await writeEscolhaEvent('failed', uid, order.id, stored, { stage: 'stills', reason: stored.escolhaFlow.reason })
      } else {
        if (stored.escolhaFlow.stage === 'chosen' && body.still_id !== stored.escolhaFlow.selectedStillId) return v2Fail('cena_choice_locked', 409)
        const wasChosen = stored.escolhaFlow.stage === 'chosen'
        chooseEscolhaStill(stored as EscolhaStored, body.still_id)
        await save()
        if (!wasChosen) await writeEscolhaEvent('chosen', uid, order.id, stored, { still_id: body.still_id, photo_round: escolhaPhotoRound(stored.escolhaFlow) })
      }
    } finally {
      await d.admin.from('ads_v2_orders').update({ assembly_lease_at: null }).eq('id', order.id).eq('user_id', uid).eq('status', 'planned').eq('assembly_lease_at', token)
    }
    if (stage === 'render') {
      const started = await d.start(order.id), result = await started.json() as Record<string, unknown>
      return v2Json({ ...result, ...escolhaView(stored) }, started.status)
    }
    return v2Json({ order_id: order.id, charged: false, ...escolhaView(stored) }, stored.escolhaFlow.stage === 'stills' ? 202 : 200)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'cena_plan_failed'
    console.warn('[ads-cena] escolha_failed', message)
    if (message === 'escolha_script_language_unavailable') return v2Fail(message, 502, { reason: message, reason_detail: 'Não foi possível preparar um roteiro no idioma escolhido. Nenhuma foto ou vídeo foi gerado. Tente novamente.' })
    if (message.startsWith('escolha_')) return v2Fail(message, message.includes('core_exceeds') ? 422 : message.includes('changed') ? 409 : 400, { reason: message.slice(0, 200), reason_detail: message.includes('core_exceeds') ? 'O nome e o CTA obrigatório não cabem em 15 segundos. Encurte o texto para continuar.' : message.slice(0, 1000) })
    if (/^cena_(bad_|presenter_|scenario_|still_|stills_not_ready|choice_|required_text)/u.test(message)) return v2Fail(message, message.includes('not_ready') || message.includes('locked') || message.includes('lease') ? 409 : 400, { reason: message.slice(0, 200) })
    return v2Fail('cena_plan_failed', 502, { reason: message.slice(0, 200), reason_detail: message.slice(0, 1000) })
  }
}
