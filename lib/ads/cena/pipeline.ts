// KINEO-ADS-CENA-2110 — máquina durável, sem SDK: cada intenção é salva ANTES do efeito; não reenvia POST ambíguo.
import { cenaKeyframeRequest, cenaVideoRequests, type CenaRoute } from './adapters'
import { CENA_JUDGE_QUESTION, judgeCena, type CenaJson, type CenaPlan, type CenaVerdict } from './plan'
export const CENA_KEYFRAME_ROUNDS = 2
export const CENA_VIDEO_ATTEMPTS = 2
export const CENA_JOB_MS = 25 * 60_000
export const CENA_AMBIGUOUS_MS = 20 * 60_000
export interface CenaJob {
  endpoint: string; input: Record<string, unknown>; kind: 'image' | 'video'; index: number; seconds: number; keepSeconds: number;
  status: 'new' | 'submitting' | 'pending' | 'done' | 'failed'; requestId?: string; claimedAt?: number; url?: string; verdict?: CenaVerdict;
}
export interface CenaState { plan: CenaPlan; route: CenaRoute; phase: 'images' | 'judge' | 'video' | 'ready' | 'failed'; imageRound: number; videoAttempt: number; jobs: CenaJob[]; keyframe?: string; reason?: string; voiceUrl?: string; voiceClaimedAt?: number }
export interface CenaDeps {
  now(): number; save(state: CenaState): Promise<void>; json: CenaJson;
  submit(job: CenaJob): Promise<{ kind: 'accepted'; requestId: string } | { kind: 'ambiguous' | 'rejected' }>;
  poll(job: CenaJob): Promise<{ state: 'pending' | 'processing' | 'done' | 'failed'; url: string | null }>;
  persist(job: CenaJob, attempt: number): Promise<string | null>;
  event(name: string, metadata: Record<string, unknown>): Promise<void>;
}
export function newCenaState(plan: CenaPlan, route: CenaRoute): CenaState { return { plan, route, phase: 'images', imageRound: 1, videoAttempt: 1, jobs: [] } }
export function cenaOf(plan: unknown): CenaState | null {
  const c = plan && typeof plan === 'object' ? (plan as { cena?: CenaState }).cena : null
  return c?.plan?.marker === 'KINEO-ADS-CENA-2110' && ['kling3', 'seedance2', 'veo31'].includes(c.route) ? c : null
}
function images(s: CenaState): CenaJob[] {
  return s.plan.keyframePrompts.map((prompt, index) => ({ ...cenaKeyframeRequest({ productUrl: s.plan.input.foto, prompt, actorUrl: s.plan.input.actorUrl, attempt: s.imageRound }), index, kind: 'image', seconds: 0, keepSeconds: 0, status: 'new' }))
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
  if (s.phase === 'failed' || s.phase === 'ready') return
  if (s.phase === 'judge') {
    for (const j of s.jobs.filter(j => j.kind === 'image' && !j.verdict)) {
      let verdict: CenaVerdict
      try { verdict = judgeCena(await d.json({ model: 'gpt-4o', system: CENA_JUDGE_QUESTION, text: 'Image 1 = exact customer product. Image 2 = candidate. Fail closed for ambiguous hand ownership or product fidelity.', images: [s.plan.input.foto, j.url!] })) }
      catch { verdict = { approved: false, score: 0, reasons: ['judge_unavailable'] } }
      j.verdict = verdict; await d.save(s)
      await d.event('ads_cena_keyframe_judged', { index: j.index, round: s.imageRound, ...verdict })
    }
    const best = s.jobs.filter(j => j.kind === 'image' && j.verdict?.approved).sort((a, b) => b.verdict!.score - a.verdict!.score)[0]
    if (!best?.url) return failed(s, 'cena_keyframes_rejected', d)
    s.keyframe = best.url; s.phase = 'video'; await d.save(s); return
  }
  const kind = s.phase === 'images' ? 'image' : 'video'
  if (!s.jobs.some(j => j.kind === kind)) {
    const jobs: CenaJob[] = kind === 'image' ? images(s) : cenaVideoRequests(s.route, { keyframeUrl: s.keyframe!, productUrl: s.plan.input.foto, prompt: s.plan.videoPrompt, language: s.plan.input.language, segmentPrompts: s.plan.segmentPrompts }).map((j, index) => ({ endpoint: j.endpoint, input: j.input, seconds: j.seconds, keepSeconds: j.keepSeconds, index, kind: 'video', status: 'new' }))
    s.jobs.push(...jobs); await d.save(s)
  }
  const j = s.jobs.find(j => j.kind === kind && j.status !== 'done')
  if (!j) { s.phase = kind === 'image' ? 'judge' : 'ready'; await d.save(s); return }
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
  if (d.now() - (j.claimedAt ?? 0) > CENA_JOB_MS) { j.status = 'failed'; await d.save(s); return }
  const result = await d.poll(j)
  if (result.state === 'failed') { j.status = 'failed'; await d.save(s); return }
  if (result.state !== 'done' || !result.url) return
  j.url = result.url
  const url = await d.persist(j, kind === 'image' ? s.imageRound : s.videoAttempt)
  if (!url) return // cópia transitória: tenta novamente sem criar outro job pago
  j.url = url; j.status = 'done'; await d.save(s)
}
