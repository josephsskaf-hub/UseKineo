// Trial only. Submit once and return the queue receipt; status polls rendering, never birth.
import { KLING4_TRIAL_COST_USD } from '@/lib/kling4TrialBudget'
import { narrationWordCount } from '@/lib/textLanguage'

export const KLING4_T2V_MODEL = 'kling/v4/text-to-video'
export const KLING4_I2V_MODEL = 'kling/v4/image-to-video'
export const KLING4_TRIAL_TIMEOUT_MS = 8 * 60_000

type StillReport = {
  cena: number; url_final: string; escolhida_tentativa: number
  tentativas: readonly { n: number; url: string | null; veredito: string }[]
}

/** Approval belongs to the exact selected URL at that scene, not an earlier image or original verdict. */
export function approvedKling4TrialStills(
  stills: readonly (string | null)[], reports: readonly StillReport[],
  extra: readonly { cena: number; url: string | null; veredito: string | null }[] = [],
): (string | null)[] {
  return stills.map((url, i) => {
    if (!url) return null
    const approved = reports.some(r => r.cena === i + 1 && r.url_final === url &&
      r.tentativas.some(t => t.n === r.escolhida_tentativa && t.url === url && t.veredito === 'PASS')) ||
      extra.some(r => r.cena === i + 1 && r.url === url && r.veredito === 'PASS')
    return approved ? url : null
  })
}

export type Kling4TrialTiming = { voiceovers: readonly string[]; wordsPerSecond: number }

/** Speech-weighted allocation on the provider's integer clock. Clamp short shots, then apportion the remainder. */
export function kling4TrialSceneDurations(voiceovers: readonly string[], wordsPerSecond: number): number[] {
  const n = voiceovers.length
  if (!n || n > 5 || !Number.isFinite(wordsPerSecond) || wordsPerSecond <= 0) {
    throw new Kling4TrialPreflightError('kling4_invalid_timing')
  }
  const speech = voiceovers.map(text => narrationWordCount(text) / wordsPerSecond)
  const target = new Array<number>(n).fill(3)
  let remaining = 15
  let active = speech.map((_, i) => i)
  // Water-fill: a floor-bound shot stays at three seconds; other shots share time by their actual speech weight.
  while (active.length) {
    const sum = active.reduce((total, i) => total + speech[i], 0)
    const proposed = active.map(i => sum > 0 ? remaining * speech[i] / sum : remaining / active.length)
    const floorBound = active.filter((_, k) => proposed[k] < 3)
    if (!floorBound.length) {
      active.forEach((i, k) => { target[i] = proposed[k] })
      break
    }
    for (const i of floorBound) { target[i] = 3; remaining -= 3 }
    active = active.filter(i => !floorBound.includes(i))
  }
  const seconds = target.map(s => Math.max(3, Math.floor(s)))
  const order = target.map((s, i) => ({ i, fraction: s - seconds[i] }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i)
  const spare = 15 - seconds.reduce((sum, s) => sum + s, 0)
  for (let k = 0; k < spare; k++) seconds[order[k].i]++
  return seconds
}

export function buildKling4TrialInput(
  prompts: readonly string[], approvedStills: readonly (string | null)[] = [], timing?: Kling4TrialTiming,
) {
  const shots = prompts.map(p => p.trim())
  if (!shots.length || shots.some(p => !p)) throw new Kling4TrialPreflightError('kling4_empty_plan')
  if (timing && timing.voiceovers.length !== shots.length) throw new Kling4TrialPreflightError('kling4_mismatched_timing')
  // Empty narration is the only balanced fallback. Birth always supplies its final scene voiceovers and resolved voice pace.
  const seconds = kling4TrialSceneDurations(timing?.voiceovers ?? shots.map(() => ''), timing?.wordsPerSecond ?? 1)
  const first = approvedStills[0] || null
  const middle: string[] = []
  const multiPrompt = shots.map((prompt, i) => {
    let reference = ''
    if (first) {
      if (i === 0) reference = 'Scene 1: use the start image. '
      else if (approvedStills[i] && middle.length < 8) {
        middle.push(approvedStills[i] as string)
        reference = `Scene ${i + 1}: use middle keyframe ${middle.length}. `
      } else reference = `Scene ${i + 1}: text-directed shot, no new keyframe for this scene. `
    }
    // KlingV4Shot.prompt has maxLength=512; count Unicode code points as the schema does.
    const bounded = Array.from(reference + prompt).slice(0, 512).join('')
    return { prompt: bounded, duration: seconds[i] }
  })
  return {
    model: first ? KLING4_I2V_MODEL : KLING4_T2V_MODEL,
    input: {
      multi_prompt: multiPrompt, duration: 15, resolution: '720p',
      ...(first ? { start_image_url: first, ...(middle.length ? { middle_image_urls: middle } : {}) } : { aspect_ratio: '9:16' }),
    } as Record<string, unknown>,
  }
}

export type Kling4TrialJob = { requestId: string; model: string; submittedAt: string }
class Kling4TrialPreflightError extends Error {}
type NetworkDeps = { apiKey: string; fetchImpl?: typeof fetch; now?: () => number; onPost?: () => void }

/** Exactly one POST. No status GET, rendering wait or provider retry. */
export async function submitKling4TrialVideo(
  args: { prompts: readonly string[]; approvedStills?: readonly (string | null)[]; timing?: Kling4TrialTiming }, deps: NetworkDeps,
): Promise<Kling4TrialJob> {
  if (!deps.apiKey) throw new Kling4TrialPreflightError('kling4_unavailable')
  const { model, input } = buildKling4TrialInput(args.prompts, args.approvedStills, args.timing)
  const submittedAt = new Date((deps.now ?? Date.now)()).toISOString()
  deps.onPost?.()
  const response = await (deps.fetchImpl ?? fetch)(`https://queue.fal.run/${model}`, {
    method: 'POST', headers: { Authorization: `Key ${deps.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal: AbortSignal.timeout(10_000), cache: 'no-store',
  })
  if (!response.ok) throw new Error(`kling4_http_${response.status}`)
  const receipt = await response.json() as { request_id?: unknown }
  const requestId = typeof receipt.request_id === 'string' ? receipt.request_id.trim() : ''
  if (!requestId) throw new Error('kling4_missing_id')
  return { requestId, model, submittedAt }
}

export type Kling4TrialPoll = { status: 'pending' | 'processing' | 'done' | 'failed'; url: string | null }

/** One status/result cycle. Transient lookup errors wait for the durable eight-minute deadline. */
export async function pollKling4TrialVideo(requestId: string, deps: NetworkDeps): Promise<Kling4TrialPoll> {
  const processing: Kling4TrialPoll = { status: 'processing', url: null }
  if (!deps.apiKey || !requestId) return processing
  const base = `https://queue.fal.run/kling/v4/requests/${encodeURIComponent(requestId)}`
  const get = (url: string) => (deps.fetchImpl ?? fetch)(url, {
    headers: { Authorization: `Key ${deps.apiKey}` }, signal: AbortSignal.timeout(8_000), cache: 'no-store',
  })
  try {
    const response = await get(`${base}/status`)
    if (!response.ok) return processing
    const state = await response.json() as { request_id?: unknown; status?: string; error?: unknown }
    if (state.request_id !== requestId) return processing
    if (state.status === 'FAILED' || (state.status === 'COMPLETED' && state.error)) return { status: 'failed', url: null }
    if (state.status === 'IN_QUEUE') return { status: 'pending', url: null }
    if (state.status !== 'COMPLETED') return processing
    const result = await get(base)
    if (!result.ok) return result.status === 422 || result.status === 400 ? { status: 'failed', url: null } : processing
    const data = await result.json() as { video?: { url?: unknown }; error?: unknown }
    const url = typeof data.video?.url === 'string' && /^https:\/\//.test(data.video.url) ? data.video.url : null
    return url && !data.error ? { status: 'done', url } : { status: 'failed', url: null }
  } catch { return processing }
}

export type Kling4TrialResult = {
  engineUsed: 'kling4' | 'seedance15_cap' | 'seedance15_fallback'
  costUsd: number; job?: Kling4TrialJob; reason?: string
}

/** Reserve first. A submit refusal selects Seedance without repeating Kling. */
export async function orchestrateKling4Trial(deps: {
  reserve: () => Promise<{ allowed: boolean; reason?: string }>
  submit: () => Promise<Kling4TrialJob>
}): Promise<Kling4TrialResult> {
  let reservation: { allowed: boolean; reason?: string }
  try { reservation = await deps.reserve() }
  catch { return { engineUsed: 'seedance15_fallback', costUsd: 0, reason: 'reservation_unavailable' } }
  if (!reservation.allowed) return {
    engineUsed: reservation.reason === 'cap' ? 'seedance15_cap' : 'seedance15_fallback', costUsd: 0, reason: reservation.reason,
  }
  try { return { engineUsed: 'kling4', costUsd: KLING4_TRIAL_COST_USD, job: await deps.submit() } }
  catch (error) { return { engineUsed: 'seedance15_fallback', costUsd: error instanceof Kling4TrialPreflightError ? 0 : KLING4_TRIAL_COST_USD,
    reason: error instanceof Kling4TrialPreflightError ? 'provider_not_submitted' : 'provider_submit_failed' } }
}
