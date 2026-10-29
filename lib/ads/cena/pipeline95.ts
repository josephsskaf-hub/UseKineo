import { aplicarQualidadeDoAnuncio, qualidadeDoAnuncioParaJuiz } from './filmQuality' // KINEO-QUALIDADE-TODOS-MOTORES-2910
import { STILL_CRITIC_IDENTIDADE } from '@/lib/cinematic/criticoStill' // KINEO-QUALIDADE-TODOS-MOTORES-2910
// KINEO-ADS-CENA-95-2110 — best-of-2 durável, quadro antes da escolha, duas rodadas por família e orçamento registrado.
import { cena95BaseRequests, cena95VideoRequests, cena95WindowSpeech, type Cena95Request } from './adapters95' // KINEO-ADS-CENA-95-PACING-2110
import type { Cena95Plan } from './plan95'
import type { CenaJson } from './plan'
import type { CenaRoute } from './adapters'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { CENA_CATALOG } from './catalog'
import type { Cena95Composition } from './composition95' // KINEO-ADS-CENA-95-PACING-2110
export const CENA95_MIN_SCORE = 95
export const CENA95_MAX_ROUNDS = 2
export const CENA95_JOB_MS = 25 * 60_000
export interface Cena95Frame { url: string; t: number | null }
export interface Cena95Verdict { approved: boolean; score: number; reasons: string[] }
export interface Cena95Job extends Cena95Request { index: number; round: number; status: 'new' | 'submitting' | 'pending' | 'done' | 'failed'; requestId?: string; claimedAt?: number; url?: string; frames?: Cena95Frame[]; frameClaimedAt?: number; judgeClaims?: Record<string, number>; verdicts?: Record<string, Cena95Verdict> }
export interface Cena95Clip { url: string; kind: 'hook' | 'use' | 'close'; seconds: number; keepSeconds: number; start: number; trimStart?: number; hasSpeech: boolean; photoReference?: string }
export interface Cena95AudioClip { url: string; start: number; seconds: number; keepSeconds: number; trimStart?: number; hasSpeech: boolean }
export interface Cena95State { version: 'KINEO-ADS-CENA-95-2110'; phase: 'base' | 'videos' | 'ready' | 'failed'; plan: Cena95Plan; route: CenaRoute; rounds: Record<Cena95Request['family'], number>; jobs: Cena95Job[]; baseUrl?: string; reason?: string; selectedClips: Cena95Clip[]; nativeAudioClips: Cena95AudioClip[]; budgetMaxUsd: number; reservedUsd: number; reservations: { id: string; component: string; usd: number; at: number }[]; videoTokens: { input: number; output: number; measuredCalls: number }; voiceClaimedAt?: number; voiceUrl?: string; voiceSeconds?: number; musicClaimedAt?: number; musicHandle?: { requestId: string; statusUrl: string; responseUrl: string }; musicUrl?: string; musicState?: 'done' | 'skipped'; captionTimingSource?: string; words?: { word: string; start: number; end: number }[] }
export interface Cena95Deps { now(): number; save(s: Cena95State): Promise<void>; json: CenaJson; submit(j: Cena95Job): Promise<{ kind: 'accepted'; requestId: string } | { kind: 'ambiguous' | 'rejected' }>; poll(j: Cena95Job): Promise<{ state: string; url: string | null }>; persist(j: Cena95Job): Promise<string | null>; frames(j: Cena95Job): Promise<Cena95Frame[] | null>; event(name: string, data: Record<string, unknown>): Promise<void>; canSpend?(minimumMs: number): boolean; maxJobsPerStep?: number }
export function newCena95State(plan: Cena95Plan, route: CenaRoute) {
  const budgetMaxUsd = plan.quality95.costs[route].budgetMaxUsd
  if (!(Number.isFinite(budgetMaxUsd) && budgetMaxUsd > 0)) throw new Error('cena95_cost_budget_required')
  const score95: Cena95State = { version: 'KINEO-ADS-CENA-95-2110', phase: 'base', plan, route, rounds: { base: 1, person0: 1, person1: 1, close: 1 }, jobs: [], selectedClips: [], nativeAudioClips: [], budgetMaxUsd, reservedUsd: 0, reservations: [], videoTokens: { input: 0, output: 0, measuredCalls: 0 } }
  return { plan, route, phase: 'images' as const, imageRound: 1, videoAttempt: 1, jobs: [], score95 }
}
export async function reserveCena95(s: Cena95State, d: Pick<Cena95Deps, 'save' | 'now'>, id: string, component: string, usd: number): Promise<void> {
  if (s.reservations.some(r => r.id === id)) return
  if (!(Number.isFinite(usd) && usd >= 0) || s.reservedUsd + usd > s.budgetMaxUsd + 0.000001) throw new Error('cena95_budget_exhausted')
  s.reservations.push({ id, component, usd, at: d.now() }); s.reservedUsd = Math.round((s.reservedUsd + usd) * 1e8) / 1e8
  await d.save(s)
}
function json(raw: unknown): Record<string, unknown> { const r = typeof raw === 'string' ? JSON.parse(raw) : raw; if (!r || typeof r !== 'object') throw new Error('judge_json'); return r as Record<string, unknown> }
export function judgeCena95(raw: unknown, kind: 'base' | 'person' | 'close', narrated: boolean, composition?: Cena95Composition, speakingExpected?: boolean): Cena95Verdict { // KINEO-ADS-CENA-95-PACING-2110
  let r: Record<string, unknown>; try { r = json(raw) } catch { return { approved: false, score: 0, reasons: ['judge_json'] } }
  const productClose = kind !== 'close' && composition?.productDominant === true // KINEO-ADS-CENA-95-PACING-2110
  const checkFace = !productClose || !narrated || composition?.faceRequired === true || r.face_visible === true // KINEO-ADS-CENA-95-PACING-2110
  const required = ['product_faithful', 'product_whole', 'no_invented_text', ...(kind === 'close' ? ['no_hands', 'no_people', 'no_extra_objects'] : ['real_scale', 'no_extra_hands', 'own_hands_attached', 'five_fingers', ...(checkFace ? ['natural_face'] : []), 'same_actor', 'same_wardrobe', 'correct_wrist', 'no_extra_people', 'nothing_near_face', ...(narrated && checkFace ? ['mouth_closed'] : []), ...(productClose ? ['product_dominant', 'no_full_body'] : [])]), ...(kind === 'person' ? ['motion_visible', ...(!narrated ? [speakingExpected === false ? 'mouth_closed' : 'mouth_speaking'] : [])] : [])] // KINEO-ADS-CENA-95-PACING-2110
  const reasons = required.filter(k => r[k] !== true), score = typeof r.score === 'number' && Number.isFinite(r.score) && r.score >= 0 && r.score <= 100 ? r.score : 0
  if (productClose && typeof r.face_visible !== 'boolean') reasons.push('face_visibility_unknown') // KINEO-ADS-CENA-95-PACING-2110
  if (productClose && (!narrated || composition?.faceRequired) && r.face_visible !== true) reasons.push('face_visible') // KINEO-ADS-CENA-95-PACING-2110
  if (score < CENA95_MIN_SCORE) reasons.push('score')
  return { approved: reasons.length === 0, score, reasons }
}
const rejected = (why: string): Cena95Verdict => ({ approved: false, score: 0, reasons: [why] })
async function retry(s: Cena95State, family: Cena95Request['family'], d: Cena95Deps, reason: string): Promise<void> {
  if (s.rounds[family] >= CENA95_MAX_ROUNDS) { s.phase = 'failed'; s.reason = reason; await d.save(s); return }
  s.rounds[family]++; await d.save(s); await d.event('ads_cena95_retry', { family, round: s.rounds[family], reason })
}
function current(s: Cena95State, family: Cena95Request['family']) { return s.jobs.filter(j => j.family === family && j.round === s.rounds[family]) }
function add(s: Cena95State, requests: Cena95Request[]) { for (const r of requests) if (!current(s, r.family).some(j => j.candidate === r.candidate)) s.jobs.push({ ...r, index: 100 + s.jobs.length, round: s.rounds[r.family], status: 'new' }) }
function sample(frames: Cena95Frame[], start: number, end: number): Cena95Frame[] {
  const eligible = frames.filter(f => typeof f.t === 'number' && Number.isFinite(f.t) && f.t >= start && f.t <= end && /^https:\/\//.test(f.url)).sort((a, b) => a.t! - b.t!)
  if (eligible.length < 3 || new Set(eligible.map(f => f.url)).size !== eligible.length || new Set(eligible.map(f => f.t)).size !== eligible.length) return []
  const chosen = [eligible[0], eligible[Math.floor((eligible.length - 1) / 2)], eligible[eligible.length - 1]], span = end - start
  return chosen[0].t! > start + span * 0.25 || chosen[2].t! < end - span * 0.25 || chosen[1].t! - chosen[0].t! < span * 0.15 || chosen[2].t! - chosen[1].t! < span * 0.15 ? [] : chosen
}
function windows(s: Cena95State, j: Cena95Job): { key: string; start: number; end: number }[] {
  if (j.family === 'base') return [{ key: 'base', start: 0, end: 0 }]
  if (j.family === 'close') return [{ key: 'close', start: 0, end: 5 }]
  if (j.family === 'person0' && (s.route === 'kling3' || s.route === 'veo31')) return [{ key: 'hook', start: 0, end: 3 }, { key: 'use', start: 3, end: s.route === 'veo31' ? 8 : 10 }]
  return [{ key: j.family === 'person0' ? 'hook' : 'use', start: 0, end: j.family === 'person0' ? 3 : s.route === 'veo31' ? 2 : 7 }]
}
async function assess(s: Cena95State, j: Cena95Job, d: Cena95Deps): Promise<void> {
  if (j.kind === 'video' && !j.frames) {
    if (d.canSpend && !d.canSpend(50_000)) return
    if (j.frameClaimedAt) { j.verdicts = Object.fromEntries(windows(s, j).map(w => [w.key, rejected('frame_submit_unconfirmed')])); await d.save(s); return }
    j.frameClaimedAt = d.now(); await reserveCena95(s, d, `frames-${j.index}`, 'frame_extraction_reserve', 0.012); await d.save(s)
    try { j.frames = (await d.frames(j)) ?? [] } catch { j.frames = [] }
    await d.save(s)
  }
  for (const w of windows(s, j)) {
    j.verdicts ??= {}; j.judgeClaims ??= {}
    if (j.verdicts[w.key]) continue
    if (d.canSpend && !d.canSpend(25_000)) return
    const frames = j.kind === 'image' ? [{ url: j.url!, t: 0 }] : sample(j.frames!, w.start, w.end)
    if (!frames.length || j.judgeClaims[w.key]) { j.verdicts[w.key] = rejected('frames_or_judge_unavailable'); await d.save(s); continue }
    j.judgeClaims[w.key] = d.now(); await reserveCena95(s, d, `judge-${j.index}-${w.key}`, 'vision_token_reserve', 0.04608); await d.save(s)
    const kind = j.family === 'base' ? 'base' : j.family === 'close' ? 'close' : 'person'
    try {
      const composition = s.plan.quality95.composition // KINEO-ADS-CENA-95-PACING-2110 — ausente conserva o juiz dos pedidos antigos.
      const speakingExpected = kind === 'person' && s.plan.voice_mode === 'talking' && s.plan.script.normalization ? cena95WindowSpeech(s.plan.script, s.route, w.start + (j.family === 'person1' ? s.route === 'veo31' ? 8 : 3 : 0), w.end + (j.family === 'person1' ? s.route === 'veo31' ? 8 : 3 : 0)) : undefined // KINEO-ADS-CENA-95-PACING-2110
      const productRule = composition?.productDominant ? ` PRODUCT COMPOSITION: ${composition.framing} product_dominant=true only if the whole product is the focal subject in EVERY frame, at real scale; no_full_body=true only when there is no head-to-toe or wide athlete/lifestyle framing. face_visible=true if ANY supplied frame shows a face or mouth, false only when all frames exclude them; uncertain visibility must return face_visible=null, never false. ${composition.faceRequired ? 'The cropped lower face and mouth must remain visible throughout EVERY frame; natural_face judges the visible face, including a partial face.' : 'A hands/forearms/relevant-body-part crop without a face is permitted. Do not require an unseen face or mouth. If any face appears it MUST be natural, and every visible mouth MUST be closed. When no face appears, return face_visible=false and natural_face=false,mouth_closed=false; only these absent-face checks are inapplicable.'} same_actor and same_wardrobe MUST still match the approved reference and shared base for every VISIBLE body/clothing part; judge skin, connected arms and visible sleeves or clothing hem. Do not invent evidence about hidden parts, and reject a mismatch, uncertain visible identity or uncertain visible clothing.` : '' // KINEO-ADS-CENA-95-PACING-2110
      const call = { model: AI_TEXT_MODELS.adsRetry, maxOutputTokens: 512, system: 'Judge ALL supplied frames against the product and approved actor references. JSON booleans: product_faithful,product_whole,no_invented_text,real_scale,no_extra_hands,own_hands_attached,five_fingers,natural_face,same_actor,same_wardrobe,correct_wrist,no_extra_people,nothing_near_face,mouth_closed,mouth_speaking,motion_visible,no_hands,no_people,no_extra_objects,product_dominant,no_full_body,face_visible,score(0-100). Every required criterion must hold in EVERY frame. Occlusion, unknown, ambiguous anatomy/label/identity or unjudgeable fingers means false. Never let a high score override a failed criterion. Printed original product text is allowed; invented overlay text is not.', text: `Kind=${kind}; segment=${w.key}; category=${s.plan.category}; expected real scale=${composition?.scale ?? CENA_CATALOG[s.plan.category].scale}; locked wardrobe=${s.plan.quality95.wardrobe}; wrist=${s.plan.continuity?.productWrist ?? 'preserve anatomy'}; mode=${s.plan.voice_mode}. ${kind === 'close' ? 'NO hands or people or new objects; only the original customer product photo animated gently.' : `Exactly the approved actor, same outfit, connected hands with five fingers and no extra hand; physically realistic product scale relative to the body; ${composition?.productDominant ? 'apply the product crop rules below' : 'a natural face'}; nothing near face. Narrated visible mouths must be closed. ${speakingExpected === false ? "This talking segment has no supplied spoken words: require mouth_closed=true and no invented speech; do not require mouth_speaking." : "In talking video, mouth_speaking must show the actor actually speaking throughout the person shot."}${productRule}`}`, images: [s.plan.input.foto, ...(kind === 'close' ? [] : [s.plan.input.actorUrl!, ...(s.baseUrl ? [s.baseUrl] : [])]), ...frames.map(f => f.url)], onUsage: (u: { prompt_tokens?: number; completion_tokens?: number }) => { if (Number.isFinite(u.prompt_tokens) && Number.isFinite(u.completion_tokens)) { s.videoTokens.input += u.prompt_tokens!; s.videoTokens.output += u.completion_tokens!; s.videoTokens.measuredCalls++ } } } // KINEO-ADS-CENA-95-PACING-2110
      call.system += kind === 'close' ? ' Keep the photographic medium of the original product reference.' : ` ${STILL_CRITIC_IDENTIDADE} ${qualidadeDoAnuncioParaJuiz(s.plan, 'Image1 is the product, Image2 is the approved actor; the final supplied images are candidate frames')}` // KINEO-QUALIDADE-TODOS-MOTORES-2910 — reuse the existing judge request.
      j.verdicts[w.key] = judgeCena95(await d.json(call), kind, s.plan.voice_mode === 'narrated', composition, speakingExpected) // KINEO-ADS-CENA-95-PACING-2110
    } catch { j.verdicts[w.key] = rejected('judge_unavailable') }
    await d.save(s); await d.event('ads_cena95_candidate_judged', { family: j.family, candidate: j.candidate, round: j.round, segment: w.key, ...j.verdicts[w.key] })
  }
}
function best(jobs: Cena95Job[], key: string): Cena95Job | undefined { return jobs.filter(j => j.status === 'done' && j.verdicts?.[key]?.approved).sort((a, b) => b.verdicts![key].score - a.verdicts![key].score || a.candidate - b.candidate)[0] }
function pair(jobs: Cena95Job[]): Cena95Job | undefined { return jobs.filter(j => j.status === 'done' && j.verdicts?.hook?.approved && j.verdicts.use?.approved).sort((a, b) => Math.min(b.verdicts!.hook.score, b.verdicts!.use.score) - Math.min(a.verdicts!.hook.score, a.verdicts!.use.score) || a.candidate - b.candidate)[0] }
function selection(s: Cena95State): Cena95Request['family'] | null {
  const talking = s.plan.voice_mode === 'talking', p0 = current(s, 'person0'), p1 = current(s, 'person1')
  const h = talking && s.route !== 'seedance2' ? pair(p0) : best(p0, 'hook'), u = s.route === 'seedance2' ? best(p1, 'use') : talking ? h : best(p0, 'use')
  if (!h || !u) return s.route === 'seedance2' && h ? 'person1' : 'person0'
  const tail = s.route === 'veo31' ? best(p1, 'use') : null
  if (s.route === 'veo31' && !tail) return 'person1'
  const c = best(current(s, 'close'), 'close'); if (!c) return 'close'
  const clip = (j: Cena95Job, kind: Cena95Clip['kind'], start: number, keepSeconds: number, trimStart = 0): Cena95Clip => ({ url: j.url!, kind, start, seconds: j.seconds, keepSeconds, trimStart, hasSpeech: j.family !== 'close' && talking, ...(kind === 'close' ? { photoReference: j.photoReference } : {}) })
  s.selectedClips = [clip(h, 'hook', 0, 3), ...(s.route === 'veo31' ? [clip(u, 'use', 3, 5, 3), clip(tail!, 'use', 8, 2)] : [clip(u, 'use', 3, 7, s.route === 'kling3' ? 3 : 0)]), clip(c, 'close', 10, 5)]
  s.nativeAudioClips = !talking ? [] : s.route === 'kling3' ? [{ url: h.url!, start: 0, seconds: h.seconds, keepSeconds: 15, trimStart: 0, hasSpeech: true }] : s.route === 'veo31' ? [{ url: h.url!, start: 0, seconds: 8, keepSeconds: 8, hasSpeech: true }, { url: tail!.url!, start: 8, seconds: 8, keepSeconds: 7, hasSpeech: true }] : [{ url: h.url!, start: 0, seconds: 4, keepSeconds: 3, hasSpeech: true }, { url: u.url!, start: 3, seconds: 12, keepSeconds: 12, hasSpeech: true }]
  return null
}
/** One bounded advancement. All non-idempotent intentions and the cost reservation precede the effect. */
export async function stepCena95(s: Cena95State, d: Cena95Deps): Promise<void> {
  if (!s.plan.filmQuality) aplicarQualidadeDoAnuncio(s.plan) // KINEO-QUALIDADE-TODOS-MOTORES-2910 — CENA95_LIVE=false; historical plans still inherit the shared contract.
  if (s.phase === 'failed' || s.phase === 'ready') return
  const requests = s.phase === 'base' ? cena95BaseRequests(s.plan) : cena95VideoRequests(s.plan, s.route, s.baseUrl!)
  add(s, requests); await d.save(s)
  const active = s.jobs.filter(j => j.round === s.rounds[j.family] && (s.phase === 'base' ? j.family === 'base' : j.family !== 'base'))
  const fresh = active.filter(j => j.status === 'new')
  if (fresh.length) {
    for (const j of fresh.slice(0, d.maxJobsPerStep ?? fresh.length)) { if (d.canSpend && !d.canSpend(35_000)) return; j.status = 'submitting'; j.claimedAt = d.now(); await reserveCena95(s, d, `model-${j.index}`, j.kind, j.unitUsd); await d.save(s)
      const r = await d.submit(j)
      if (r.kind === 'accepted') { j.requestId = r.requestId; j.status = 'pending' } else if (r.kind === 'rejected') j.status = 'failed'
      await d.save(s)
    }
    return
  }
  for (const j of active.filter(j => j.status === 'submitting')) if (d.now() - (j.claimedAt ?? 0) > 20 * 60_000) { s.phase = 'failed'; s.reason = 'cena95_submit_unconfirmed'; await d.save(s); return }
  const pending = active.filter(j => j.status === 'pending').slice(0, d.maxJobsPerStep ?? active.length)
  if (pending.length) {
    if (d.canSpend && !d.canSpend(35_000)) return
    const results = await Promise.all(pending.map(j => d.poll(j)))
    for (let i = 0; i < pending.length; i++) { const j = pending[i], r = results[i]
      if (r.state === 'failed') j.status = 'failed'
      else if (r.state === 'done' && r.url) { j.url = r.url; const stored = await d.persist(j); if (stored) { j.url = stored; j.status = 'done' } else if (d.now() - (j.claimedAt ?? 0) > CENA95_JOB_MS) j.status = 'failed' }
      else if (d.now() - (j.claimedAt ?? 0) > CENA95_JOB_MS) j.status = 'failed'
      await d.save(s)
    }
    return
  }
  if (active.some(j => j.status === 'submitting')) return
  for (const j of active.filter(j => j.status === 'done')) if (windows(s, j).some(w => !j.verdicts?.[w.key])) { await assess(s, j, d); return }
  if (s.phase === 'base') { const b = best(current(s, 'base'), 'base'); if (!b) return retry(s, 'base', d, 'cena95_base_rejected'); s.baseUrl = b.url; s.phase = 'videos'; await d.save(s); return }
  const missing = selection(s)
  if (missing) return retry(s, missing, d, `cena95_${missing}_rejected`)
  s.phase = 'ready'; await d.save(s)
}
