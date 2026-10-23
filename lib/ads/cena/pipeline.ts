// KINEO-ADS-CENA-2110 — máquina durável, sem SDK: cada intenção é salva ANTES do efeito; não reenvia POST ambíguo.
// KINEO-ADS-CENA-AJUSTE-2110 — propaga o modo explícito sem reinterpretar trabalhos legados em andamento.
import { cenaKeyframeRequest, cenaVideoRequests, type CenaRoute } from './adapters'
import { CENA_JUDGE_QUESTION, judgeCena, type CenaJson, type CenaPlan, type CenaVerdict } from './plan'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { CENA_CATALOG } from './catalog' // KINEO-ADS-CENA-SEGUE-2110
import { addAjusteQuality, type AjusteQualityNote } from './ajusteQuality' // KINEO-ADS-CENA-SEGUE-2110
export const CENA_KEYFRAME_ROUNDS = 2
export const CENA_VIDEO_ATTEMPTS = 2
export const CENA_JOB_MS = 25 * 60_000
export const CENA_AMBIGUOUS_MS = 20 * 60_000
export interface CenaJob {
  endpoint: string; input: Record<string, unknown>; kind: 'image' | 'video'; index: number; seconds: number; keepSeconds: number;
  status: 'new' | 'submitting' | 'pending' | 'done' | 'failed'; requestId?: string; claimedAt?: number; url?: string; verdict?: CenaVerdict & { category_match?: boolean; category?: string }; measuredSeconds?: number; // KINEO-ADS-CENA-SEGUE-2110
}
export interface CenaState { plan: CenaPlan; route: CenaRoute; phase: 'images' | 'judge' | 'video' | 'ready' | 'failed'; imageRound: number; videoAttempt: number; jobs: CenaJob[]; keyframe?: string; keyframes?: [string, string]; reason?: string; voiceUrl?: string; voiceClaimedAt?: number; quality_notes?: AjusteQualityNote[] } // KINEO-ADS-CENA-SEGUE-2110
export interface CenaDeps {
  now(): number; save(state: CenaState): Promise<void>; json: CenaJson;
  submit(job: CenaJob): Promise<{ kind: 'accepted'; requestId: string } | { kind: 'ambiguous' | 'rejected' }>;
  poll(job: CenaJob): Promise<{ state: 'pending' | 'processing' | 'done' | 'failed'; url: string | null }>;
  persist(job: CenaJob, attempt: number): Promise<string | null>;
  event(name: string, metadata: Record<string, unknown>): Promise<void>;
}
export function newCenaState(plan: CenaPlan, route: CenaRoute): CenaState { const state: CenaState = { plan, route, phase: 'images', imageRound: 1, videoAttempt: 1, jobs: [] }; if (plan.ajusteLive?.version === 'KINEO-ADS-CENA-RETOMADA-2110') for (const note of plan.quality_notes ?? []) addAjusteQuality(state, note); return state } // KINEO-ADS-CENA-SEGUE-2110
export function cenaOf(plan: unknown): CenaState | null {
  const c = plan && typeof plan === 'object' ? (plan as { cena?: CenaState }).cena : null
  return c?.plan?.marker === 'KINEO-ADS-CENA-2110' && ['kling3', 'seedance2', 'veo31'].includes(c.route) ? c : null
}
function images(s: CenaState): CenaJob[] {
  return s.plan.keyframePrompts.flatMap((prompt, slot) => [0, 1].map(candidate => ({ ...cenaKeyframeRequest({ productUrl: s.plan.input.foto, prompt: `${prompt} Composition candidate ${candidate + 1}.`, actorUrl: s.plan.input.actorUrl, attempt: s.imageRound }), index: slot * 2 + candidate, kind: 'image' as const, seconds: 0, keepSeconds: 0, status: 'new' as const })))
}
async function failed(s: CenaState, reason: string, d: CenaDeps): Promise<void> {
  if (s.phase === 'video' && s.videoAttempt < CENA_VIDEO_ATTEMPTS) {
    s.videoAttempt++; s.jobs = s.jobs.filter(j => j.kind === 'image');
    await d.event('ads_cena_video_retry', { attempt: s.videoAttempt, reason })
  } else if ((s.phase === 'images' || s.phase === 'judge') && s.imageRound < CENA_KEYFRAME_ROUNDS) {
    s.imageRound++; s.phase = 'images'; s.jobs = []
    await d.event('ads_cena_keyframe_retry', { round: s.imageRound, reason })
  } else { s.phase = 'failed'; s.reason = reason }
  await d.save(s)
}
/** Um passo limitado, retomado pela tela/cron. Nunca debita créditos: o pedido foi cobrado uma vez no start v2. */
export async function stepCena(s: CenaState, d: CenaDeps): Promise<void> {
  const ajuste = s.plan.ajusteLive?.version === 'KINEO-ADS-CENA-RETOMADA-2110' // KINEO-ADS-CENA-SEGUE-2110
  if (ajuste && s.phase === 'failed' && s.reason === 'cena_keyframes_rejected' && s.jobs.some(j => j.kind === 'image' && j.status === 'done' && j.url)) { s.phase = 'judge'; delete s.reason; addAjusteQuality(s, { stage: 'keyframe', code: 'quality_failure_recovered', message: 'Existing paid images from an earlier quality-only rejection are reused while the order is still generating; no image is resubmitted.' }); await d.save(s) } // KINEO-ADS-CENA-SEGUE-2110 — runtime calls this only for generating orders; refunded/failed orders never enter it.
  if (s.phase === 'failed' || s.phase === 'ready') return // KINEO-ADS-CENA-SEGUE-2110
  if (s.phase === 'judge') {
    for (const j of s.jobs.filter(j => j.kind === 'image' && !j.verdict && (!ajuste || j.status === 'done' && j.url))) { // KINEO-ADS-CENA-SEGUE-2110
      let verdict: NonNullable<CenaJob['verdict']> // KINEO-ADS-CENA-SEGUE-2110
      const expectsUgcFace = s.plan.ajusteLive?.version === 'KINEO-ADS-CENA-RETOMADA-2110' && s.plan.input.formato === 'ugc' // KINEO-ADS-CENA-RETOMADA-2110
      try { const raw = await d.json({ model: AI_TEXT_MODELS.adsRetry, system: CENA_JUDGE_QUESTION, text: `Image 1 = exact customer product. Image 2 = candidate. Image 3 = actor identity. Fail closed for ambiguous hand ownership, actor or product fidelity.${expectsUgcFace ? ' Also return ugc_face_visible: true ONLY if the creator natural face and upper torso are visible together with the whole product. Hands-only, unseen face or ambiguity means false.' : ''}${s.plan.continuity ? ` Also return wardrobe_match: true ONLY if the visible clothing matches this exact expected wardrobe: ${s.plan.continuity.wardrobe}. Unknown or hidden clothing means false.${s.plan.continuity.productWrist === 'left' ? ' Also return product_wrist_match: true ONLY if the watch is visibly on the actor LEFT wrist; right, mirrored, hidden or ambiguous means false.' : ''}` : ''}${ajuste ? ` Also return category_match:true/false and category from ${Object.keys(CENA_CATALOG).join('|')}, or unknown. Compare category_match against the actual customer photograph in Image1, never against an uncertain enum. Plan category hint: ${s.plan.category}; other means unknown. category_match:false ONLY for an explicitly different product category from Image1, never for uncertainty, occlusion, hands, fidelity or score. Other visual checks are advisory quality evidence.` : ''}`, images: [s.plan.input.foto, j.url!, ...(s.plan.input.actorUrl ? [s.plan.input.actorUrl] : [])] }); verdict = judgeCena(raw, s.plan.continuity, expectsUgcFace); if (ajuste) { const r = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown>; if (typeof r?.category_match === 'boolean') verdict.category_match = r.category_match; if (typeof r?.category === 'string') verdict.category = r.category.trim().toLowerCase() } } // KINEO-ADS-CENA-SEGUE-2110
      catch { verdict = { approved: false, score: 0, reasons: ['judge_unavailable'] } }
      j.verdict = verdict; if (ajuste) addAjusteQuality(s, { stage: 'keyframe', code: 'keyframe_judged', message: verdict.approved ? 'Candidate judged; selection uses the highest available score.' : 'Candidate retained with visual reservations; quality alone does not cancel the scene.', score: verdict.score, candidate: j.index, slot: Math.floor(j.index / 2), round: s.imageRound, reasons: verdict.reasons }); await d.save(s) // KINEO-ADS-CENA-SEGUE-2110
      await d.event('ads_cena_keyframe_judged', { index: j.index, round: s.imageRound, ...verdict })
    }
    if (ajuste) { // KINEO-ADS-CENA-SEGUE-2110
      for (const j of s.jobs.filter(j => j.kind === 'image' && j.status === 'failed')) addAjusteQuality(s, { stage: 'keyframe', code: 'keyframe_provider_failed', message: 'This image candidate was unavailable; existing candidates remain eligible and are not discarded.', candidate: j.index, slot: Math.floor(j.index / 2), round: s.imageRound }) // KINEO-ADS-CENA-SEGUE-2110
      const existing = s.jobs.filter(j => j.kind === 'image' && j.status === 'done' && j.url), eligible = existing.filter(j => j.verdict?.category_match !== false && !(j.verdict?.category && s.plan.category !== 'other' && j.verdict.category !== 'other' && Object.hasOwn(CENA_CATALOG, j.verdict.category) && j.verdict.category !== s.plan.category)).sort((a, b) => (b.verdict?.score ?? 0) - (a.verdict?.score ?? 0) || a.index - b.index) // KINEO-ADS-CENA-SEGUE-2110
      for (const j of existing.filter(j => !eligible.includes(j))) addAjusteQuality(s, { stage: 'keyframe', code: 'keyframe_category_wrong', message: `Candidate explicitly belongs to a different category than ${s.plan.category}.`, candidate: j.index, slot: Math.floor(j.index / 2), round: s.imageRound, score: j.verdict?.score, reasons: j.verdict?.reasons }) // KINEO-ADS-CENA-SEGUE-2110
      if (!eligible.length) { s.phase = 'failed'; s.reason = existing.length ? 'cena_keyframes_wrong_category' : 'cena_images_unavailable'; await d.save(s); return } // KINEO-ADS-CENA-SEGUE-2110
      const chosen = [0, 1].map(slot => eligible.find(j => Math.floor(j.index / 2) === slot) ?? eligible[0]) // KINEO-ADS-CENA-SEGUE-2110
      for (const [slot, j] of chosen.entries()) addAjusteQuality(s, { stage: 'keyframe', code: Math.floor(j.index / 2) === slot ? 'keyframe_selected' : 'keyframe_slot_reused', message: Math.floor(j.index / 2) === slot ? 'Highest-score available candidate selected, including any recorded reservations.' : 'Existing eligible image reused for a slot without a surviving image.', candidate: j.index, slot, round: s.imageRound, score: j.verdict?.score, selected: true, reasons: j.verdict?.reasons }) // KINEO-ADS-CENA-SEGUE-2110
      s.keyframes = [chosen[0].url!, chosen[1].url!]; s.keyframe = chosen[0].url; s.phase = 'video'; await d.save(s); return // KINEO-ADS-CENA-SEGUE-2110
    } // KINEO-ADS-CENA-SEGUE-2110
    const best = [0, 1].map(slot => s.jobs.filter(j => j.kind === 'image' && Math.floor(j.index / 2) === slot && j.verdict?.approved).sort((a, b) => b.verdict!.score - a.verdict!.score)[0])
    if (best.some(j => !j?.url)) return failed(s, 'cena_keyframes_rejected', d)
    s.keyframes = [best[0].url!, best[1].url!]; s.keyframe = best[0].url; s.phase = 'video'; await d.save(s); return
  }
  const kind = s.phase === 'images' ? 'image' : 'video'
  if (!s.jobs.some(j => j.kind === kind)) {
    const jobs: CenaJob[] = kind === 'image' ? images(s) : cenaVideoRequests(s.route, { keyframeUrl: s.keyframes![0], endKeyframeUrl: s.keyframes![1], productUrl: s.plan.input.foto, prompt: s.plan.videoPrompt, language: s.plan.input.language, segmentPrompts: s.plan.segmentPrompts, voiceMode: s.plan.voice_mode }).map((j, index) => ({ endpoint: j.endpoint, input: j.input, seconds: j.seconds, keepSeconds: j.keepSeconds, index, kind: 'video', status: 'new' }))
    s.jobs.push(...jobs); await d.save(s)
  }
  const j = s.jobs.find(j => j.kind === kind && j.status !== 'done' && !(ajuste && kind === 'image' && j.status === 'failed')) // KINEO-ADS-CENA-SEGUE-2110
  if (!j) { if (ajuste && kind === 'image' && !s.jobs.some(job => job.kind === 'image' && job.status === 'done' && job.url)) return failed(s, 'cena_image_failed', d); s.phase = kind === 'image' ? 'judge' : 'ready'; await d.save(s); return } // KINEO-ADS-CENA-SEGUE-2110
  if (j.status === 'failed') return failed(s, `cena_${kind}_failed`, d)
  if (j.status === 'submitting') {
    // Pode existir job pago sem recibo: não repetir esse efeito. Estorna; não chama isso de falha confirmada do modelo.
    if (d.now() - (j.claimedAt ?? 0) > CENA_AMBIGUOUS_MS) { s.phase = 'failed'; s.reason = 'cena_submit_unconfirmed'; await d.save(s) }
    return
  }
  if (j.status === 'new') {
    j.status = 'submitting'; j.claimedAt = d.now(); await d.save(s)
    const result = await d.submit(j)
    if (result.kind === 'accepted') { j.requestId = result.requestId; j.status = 'pending'; await d.save(s) }
    else if (result.kind === 'rejected') { j.status = 'failed'; await d.save(s) }
    return
  }
  const result = await d.poll(j)
  if (result.state === 'failed') { j.status = 'failed'; await d.save(s); return }
  if (result.state !== 'done' || !result.url) {
    // A aba/cron pode retomar depois do prazo com o vídeo já pronto. Consulte antes de abandonar trabalho pago.
    if (d.now() - (j.claimedAt ?? 0) > CENA_JOB_MS) { j.status = 'failed'; await d.save(s) }
    return
  }
  j.url = result.url
  const url = await d.persist(j, kind === 'image' ? s.imageRound : s.videoAttempt)
  if (!url) return // cópia transitória: tenta novamente sem criar outro job pago
  j.url = url; j.status = 'done'; await d.save(s)
}
