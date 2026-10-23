// KINEO-ADS-ESCOLHA-2310 — four persisted previews; the human alone selects the video reference.
import { cenaKeyframeRequest } from './adapters'
import { cenaHttps, type CenaPlan, type CenaJson } from './plan'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { addAjusteQuality, type AjusteQualityNote } from './ajusteQuality'
import { CENA_AMBIGUOUS_MS, CENA_JOB_MS, type CenaJob, type CenaState } from './pipeline'

export const ESCOLHA_MARK = 'KINEO-ADS-ESCOLHA-2310'
export interface EscolhaStill extends CenaJob { id: string; attempt: number; falUrl?: string; copyStartedAt?: number }
export interface EscolhaFlow {
  marker: typeof ESCOLHA_MARK;
  stage: 'planned' | 'stills' | 'choose' | 'chosen' | 'failed';
  stills: EscolhaStill[]; selectedStillId?: string; reason?: string;
  quality_notes?: AjusteQualityNote[];
}
export interface EscolhaStored { cena: CenaState; escolhaFlow: EscolhaFlow; [key: string]: unknown }
export function escolhaOf(stored: unknown): EscolhaStored | null {
  const p = stored as EscolhaStored | null
  return p?.escolhaFlow?.marker === ESCOLHA_MARK && p.cena?.plan?.escolha?.marker === ESCOLHA_MARK ? p : null
}
export function newEscolhaFlow(): EscolhaFlow { return { marker: ESCOLHA_MARK, stage: 'planned', stills: [] } }
export const ESCOLHA_JUDGE = `Rank this preview; do NOT veto it. Compare the customer product and selected presenter reference with this generated image. Return JSON {"score":0,"reasons":["specific visible defect or strength"],"anatomy":{"limbs_attached":true,"normal_joints":true,"five_fingers":true,"no_reversed_knees":true,"no_reversed_hands":true},"same_face":true,"same_outfit":true}. Inspect the entire visible adult head to feet: arms, legs, hands, feet, joint direction, knees bending naturally (never backwards), five fingers on each visible hand, wrists not inverted and limbs connected to the correct body. Unknown or hidden anatomy must be null, not invented true. Score 0–100 for product fidelity, anatomy, one recognizable selected face, same reference outfit, category-appropriate use, aspirational clean brand-ad lighting, readable unchanged product label outside the reserved caption band. Facial skincare must be applied to the person's own FACE, never forearm. Narrated mode: mouth closed. No extra faces, unrelated dishes, clutter, invented label text, collage, quadrants or split screen. The worst anatomy belongs last; uncertainty is a review note, never a cancellation.`
export interface EscolhaStillDeps {
  now(): number; save(flow: EscolhaFlow): Promise<void>; json: CenaJson;
  submit(job: EscolhaStill): Promise<{kind:'accepted';requestId:string}|{kind:'ambiguous'|'rejected'}>;
  poll(job: EscolhaStill): Promise<{state:'pending'|'processing'|'done'|'failed';url:string|null}>;
  persist(job: EscolhaStill): Promise<string|null>;
}
function previews(plan: CenaPlan): EscolhaStill[] {
  return Array.from({ length: 4 }, (_, index) => {
    const request = cenaKeyframeRequest({ productUrl: plan.input.foto, actorUrl: plan.escolha!.actorUrl, prompt: `${plan.keyframePrompts[0]} Preview ${index + 1} of four: a subtle alternative camera angle, same person, same clothes, same scene and product.`, attempt: 1 })
    if (plan.category === 'skincare') request.input.prompt = String(request.input.prompt).replace('Nothing touches the face.', "Only the selected person's own fingertips apply facial skincare to that same person's own face; the jar stays away from the face.")
    return {
    ...request,
    id: `still-${index + 1}`, attempt: 1, index, kind: 'image', seconds: 0, keepSeconds: 0, status: 'new',
  }})
}
function verdict(raw: unknown) {
  try {
    const r = typeof raw === 'string' ? JSON.parse(raw) : raw
    let score = typeof r?.score === 'number' && Number.isFinite(r.score) ? Math.max(0, Math.min(100, r.score)) : 0
    const reasons = Array.isArray(r?.reasons) ? r.reasons.filter((s: unknown): s is string => typeof s === 'string').slice(0, 12).map((s: string) => s.slice(0, 300)) : ['Judge supplied no usable reasons; review visually.']
    const checks = ['limbs_attached', 'normal_joints', 'five_fingers', 'no_reversed_knees', 'no_reversed_hands']
    const bad = checks.filter(k => r?.anatomy?.[k] === false), unknown = checks.filter(k => r?.anatomy?.[k] !== true && r?.anatomy?.[k] !== false)
    if (bad.length) { score = Math.min(score, Math.max(0, 25 - bad.length * 5)); reasons.push(...bad.map(k => `anatomy:${k}:false`)) }
    if (unknown.length) { score = Math.min(score, 25); reasons.push(`anatomy:unassessed:${unknown.join(',')}`) }
    if (r?.same_face === false || r?.same_outfit === false) { score = Math.min(score, 20); reasons.push('Selected face or outfit differs; review before choosing.') }
    return { approved: true, score, reasons }
  } catch { return { approved: true, score: 0, reasons: ['Judge response unavailable; review visually.'] } }
}
/** One bounded sweep. Intent precedes each paid image effect; ambiguous submissions never repeat. */
export async function stepEscolhaStills(plan: CenaPlan, flow: EscolhaFlow, d: EscolhaStillDeps): Promise<void> {
  if (flow.stage === 'chosen' || flow.stage === 'choose' || flow.stage === 'failed') return
  if (!plan.escolha || plan.escolha.marker !== ESCOLHA_MARK) throw new Error('cena_choice_plan_required')
  if (!flow.stills.length) { flow.stills = previews(plan); flow.stage = 'stills'; await d.save(flow) }
  for (const j of flow.stills) {
    if (j.status === 'failed' && j.attempt < 2) {
      j.attempt++; j.status = 'new'; delete j.requestId; delete j.claimedAt; delete j.url; delete j.falUrl; delete j.copyStartedAt
      await d.save(flow)
    }
    if (j.status === 'new') {
      j.status = 'submitting'; j.claimedAt = d.now(); await d.save(flow)
      let r: Awaited<ReturnType<EscolhaStillDeps['submit']>>
      try { r = await d.submit(j) } catch { r = { kind: 'ambiguous' } }
      if (r.kind === 'accepted') { j.requestId = r.requestId; j.status = 'pending' }
      else if (r.kind === 'rejected') j.status = 'failed'
      await d.save(flow)
      continue
    }
    if (j.status === 'submitting') {
      if (d.now() - (j.claimedAt ?? d.now()) > CENA_AMBIGUOUS_MS) {
        // Receipt missing: a paid request may exist. No retry can be proved safe.
        j.status = 'failed'; j.attempt = 2
        addAjusteQuality(flow, { stage: 'keyframe', candidate: j.index, code: 'preview_submit_unconfirmed', message: 'Image submission has no receipt. It was not resubmitted.' })
        await d.save(flow)
      }
      continue
    }
    if (j.status === 'pending') {
      let r: Awaited<ReturnType<EscolhaStillDeps['poll']>>
      try { r = j.falUrl ? { state: 'done', url: j.falUrl } : await d.poll(j) } catch { continue }
      if (r.state === 'failed') { j.status = 'failed'; await d.save(flow); continue }
      if (r.state !== 'done' || !cenaHttps(r.url)) {
        if (d.now() - (j.claimedAt ?? d.now()) > CENA_JOB_MS) { j.status = 'failed'; j.attempt = 2; await d.save(flow) }
        continue
      }
      j.url = r.url
      if (j.copyStartedAt === undefined) { j.copyStartedAt = d.now(); j.falUrl = r.url; await d.save(flow) }
      if (d.now() - j.copyStartedAt > CENA_JOB_MS) {
        j.status = 'failed'; j.attempt = 2
        addAjusteQuality(flow, { stage: 'keyframe', candidate: j.index, code: 'preview_copy_failed', message: 'Generated image could not be copied within the technical deadline. The paid generation was not repeated.' })
        await d.save(flow); continue
      }
      let url: string | null = null
      try { url = await d.persist(j) } catch { continue }
      if (!cenaHttps(url) || url === r.url || url === plan.input.foto) continue
      j.url = url; j.status = 'done'; await d.save(flow)
    }
    if (j.status === 'done' && j.url && !j.verdict) {
      let raw: unknown
      try { raw = await d.json({ model: AI_TEXT_MODELS.adsRetry, system: ESCOLHA_JUDGE, text: JSON.stringify({ category: plan.category, format: plan.input.formato, voice_mode: plan.voice_mode, scenario: plan.setting, captionLane: plan.escolha.captionLane }), images: [plan.input.foto, plan.escolha.actorUrl, j.url] }) }
      catch { raw = null }
      j.verdict = verdict(raw)
      addAjusteQuality(flow, { stage: 'keyframe', code: 'preview_ranked', message: j.verdict.reasons.join(' ') || 'Review this preview visually.', score: j.verdict.score, reasons: j.verdict.reasons, candidate: j.index, round: j.attempt })
      await d.save(flow)
    }
  }
  const complete = flow.stills.length === 4 && flow.stills.every(j => j.status === 'done' && j.url && j.verdict || j.status === 'failed' && j.attempt >= 2)
  if (complete) {
    const available = flow.stills.filter(j => j.status === 'done' && j.url && j.verdict).length
    if (available) {
      flow.stage = 'choose'
      if (available < 4) addAjusteQuality(flow, { stage: 'keyframe', code: 'preview_partial_provider_failure', message: `The provider returned ${available} of four preview images after the bounded retry. All available images remain selectable; no video has started or been charged.` })
    } else {
      flow.stage = 'failed'
      flow.reason = flow.quality_notes?.some(n => n.code === 'preview_copy_failed') ? 'cena_preview_copy_failed' : flow.quality_notes?.some(n => n.code === 'preview_submit_unconfirmed') ? 'cena_preview_submit_unconfirmed' : 'cena_preview_provider_failed'
    }
  }
  await d.save(flow)
}
export function chooseEscolhaStill(stored: EscolhaStored, stillId: unknown): EscolhaStill {
  const f = stored.escolhaFlow
  if (f.stage !== 'choose' && f.stage !== 'chosen') throw new Error('cena_stills_not_ready')
  const j = f.stills.find(j => j.id === stillId && j.status === 'done' && cenaHttps(j.url))
  if (!j) throw new Error('cena_still_not_found')
  f.stage = 'chosen'; f.selectedStillId = j.id
  // All video takes use the very same, human-selected reference. Ranking never selects implicitly.
  stored.cena.keyframe = j.url; stored.cena.keyframes = [j.url!, j.url!]; stored.cena.phase = 'video'; stored.cena.jobs = []
  for (const note of f.quality_notes ?? []) addAjusteQuality(stored.cena, note)
  addAjusteQuality(stored.cena, { stage: 'keyframe', code: 'preview_chosen_by_customer', candidate: j.index, score: j.verdict?.score, reasons: j.verdict?.reasons, selected: true, message: 'Customer selected this exact preview as the reference for every video take.' })
  return j
}
/** Used before the existing credit/debit claim, including direct /start calls. */
export function escolhaReadyForStart(stored: unknown): boolean {
  const p = escolhaOf(stored)
  if (!p || p.escolhaFlow.stage !== 'chosen') return false
  const j = p.escolhaFlow.stills.find(j => j.id === p.escolhaFlow.selectedStillId && j.status === 'done' && cenaHttps(j.url))
  return !!j && p.cena.phase === 'video' && p.cena.keyframe === j.url && p.cena.keyframes?.every(url => url === j.url) === true && p.cena.jobs.length === 0
}
export function escolhaView(stored: unknown) {
  const p = escolhaOf(stored)
  if (!p) return {}
  const review: { quality_notes?: AjusteQualityNote[] } = {}
  for (const note of [...(p.cena.plan.quality_notes ?? []), ...(p.escolhaFlow.quality_notes ?? []), ...(p.cena.quality_notes ?? [])]) addAjusteQuality(review, note)
  return { stage: p.escolhaFlow.stage, selected_still_id: p.escolhaFlow.selectedStillId ?? null, presenter_id: p.cena.plan.escolha!.presenterId, scenario_id: p.cena.plan.escolha!.scenarioId,
    stills: p.escolhaFlow.stills.filter(j => j.status === 'done' && j.url).map(j => ({ id: j.id, url: j.url!, score: j.verdict?.score ?? 0, reasons: j.verdict?.reasons ?? [] })).sort((a, b) => anatomyIssues(a.reasons) - anatomyIssues(b.reasons) || b.score - a.score || a.id.localeCompare(b.id)),
    narration_used: p.cena.plan.script.narration, quality_notes: review.quality_notes ?? [], ...(p.escolhaFlow.reason ? { reason: p.escolhaFlow.reason, reason_detail: p.escolhaFlow.quality_notes?.at(-1)?.message ?? 'The image provider could not produce four usable preview URLs. No video was started or charged.' } : {}) }
}
function anatomyIssues(reasons: string[]): number { return reasons.filter(r => /^anatomy:.*:false$/u.test(r) || r.startsWith('Selected face or outfit differs')).length }
