// Trial only. Never retry a Kling POST: an uncertain submission may already be billable.
export const KLING4_T2V_MODEL = 'kling/v4/text-to-video'
export const KLING4_I2V_MODEL = 'kling/v4/image-to-video'
const COST_USD = 2.355 // 15 * $0.157; ledger uses exact milliUSD, not rounded display cents.

export function buildKling4TrialInput(prompts: readonly string[], firstFrame?: string | null) {
  const shots = prompts.map(p => p.trim()).filter(Boolean).slice(0, 5)
  if (!shots.length) throw new Error('kling4_empty_plan')
  const seconds = Math.floor(15 / shots.length)
  return {
    model: firstFrame ? KLING4_I2V_MODEL : KLING4_T2V_MODEL,
    input: {
      multi_prompt: shots.map((prompt, i) => ({
        prompt, duration: seconds + (i === shots.length - 1 ? 15 - seconds * shots.length : 0),
      })),
      duration: 15, resolution: '720p', aspect_ratio: '9:16',
      ...(firstFrame ? { start_image_url: firstFrame } : {}),
    },
  }
}

export type Kling4TrialVideo = { requestId: string; model: string; url: string }
class Kling4TrialPreflightError extends Error {}
type NetworkDeps = { apiKey: string; fetchImpl?: typeof fetch; now?: () => number; sleep?: (ms: number) => Promise<void>; onPost?: () => void }

/** Await a proven usable result inside the birth route's remaining budget. Every failure goes to Seedance upstream. */
export async function generateKling4TrialVideo(
  args: { prompts: readonly string[]; firstFrame?: string | null; deadline: number },
  deps: NetworkDeps,
): Promise<Kling4TrialVideo> {
  const now = deps.now ?? Date.now
  const fetcher = deps.fetchImpl ?? fetch
  const sleep = deps.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
  if (!deps.apiKey || args.deadline - now() < 1_000) throw new Kling4TrialPreflightError('kling4_unavailable')
  if (!args.prompts.some(p => p.trim())) throw new Kling4TrialPreflightError('kling4_empty_plan')
  const { model, input } = buildKling4TrialInput(args.prompts, args.firstFrame)
  let posted = false
  const call = async (url: string, method: 'GET' | 'POST', body?: unknown): Promise<Record<string, unknown>> => {
    const remaining = args.deadline - now()
    if (remaining <= 0) throw posted ? new Error('kling4_timeout') : new Kling4TrialPreflightError('kling4_timeout')
    if (method === 'POST') { posted = true; deps.onPost?.() }
    const response = await fetcher(url, {
      method, headers: { Authorization: `Key ${deps.apiKey}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(Math.max(1, Math.min(10_000, remaining))), cache: 'no-store',
    })
    if (!response.ok) throw new Error(`kling4_http_${response.status}`)
    return await response.json() as Record<string, unknown>
  }
  const submitted = await call(`https://queue.fal.run/${model}`, 'POST', input)
  const requestId = typeof submitted.request_id === 'string' ? submitted.request_id.trim() : ''
  if (!requestId) throw new Error('kling4_missing_id')
  // Fal queue retrieval uses owner/app, not the full inference endpoint.
  const base = `https://queue.fal.run/kling/v4/requests/${encodeURIComponent(requestId)}`
  while (now() < args.deadline) {
    const state = await call(`${base}/status`, 'GET')
    if (state.request_id !== requestId) throw new Error('kling4_identity_mismatch')
    if (state.error || state.status === 'FAILED') throw new Error('kling4_job_failed')
    if (state.status === 'COMPLETED') {
      const result = await call(base, 'GET')
      const video = result.video as { url?: unknown } | undefined
      const url = typeof video?.url === 'string' ? video.url : ''
      if (!/^https:\/\//.test(url) || result.error) throw new Error('kling4_missing_video')
      return { requestId, model, url }
    }
    if (state.status !== 'IN_QUEUE' && state.status !== 'IN_PROGRESS') throw new Error('kling4_unknown_status')
    await sleep(Math.min(1_500, Math.max(0, args.deadline - now())))
  }
  throw new Error('kling4_timeout')
}

export type Kling4TrialResult = {
  engineUsed: 'kling4' | 'seedance15_cap' | 'seedance15_fallback'
  costUsd: number; video?: Kling4TrialVideo; reason?: string
}

/** Reserve first. A cap, absent migration, provider error or timeout always preserves the existing film path. */
export async function orchestrateKling4Trial(deps: {
  reserve: () => Promise<{ allowed: boolean; reason?: string }>
  generate: () => Promise<Kling4TrialVideo>
}): Promise<Kling4TrialResult> {
  let reservation: { allowed: boolean; reason?: string }
  try { reservation = await deps.reserve() }
  catch { return { engineUsed: 'seedance15_fallback', costUsd: 0, reason: 'reservation_unavailable' } }
  if (!reservation.allowed) return {
    engineUsed: reservation.reason === 'cap' ? 'seedance15_cap' : 'seedance15_fallback',
    costUsd: 0, reason: reservation.reason,
  }
  try { return { engineUsed: 'kling4', costUsd: COST_USD, video: await deps.generate() } }
  catch (error) { return { engineUsed: 'seedance15_fallback', costUsd: error instanceof Kling4TrialPreflightError ? 0 : COST_USD,
    reason: error instanceof Kling4TrialPreflightError ? 'provider_not_submitted' : 'provider_failed_or_timed_out' } }
}
