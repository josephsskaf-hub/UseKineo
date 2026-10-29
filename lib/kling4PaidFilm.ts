import { buildKling4TrialInput, submitKling4TrialVideo, type Kling4TrialJob } from '@/lib/kling4Trial'

/** The paid film reuses the trial's proven 15-second queue payload and transport. */
export const KLING4_PAID_FILM_DURATIONS = [15, 30, 60] as const
export type Kling4PaidFilmSeconds = typeof KLING4_PAID_FILM_DURATIONS[number]
export type Kling4PaidScene = { prompt: string; seconds: number; approvedStillUrl?: string | null }
export type Kling4PaidChunk = {
  index: number; seconds: 15; narration: string; prompts: string[]; approvedStills: (string | null)[]
  model: string; input: Record<string, unknown>
}

export function isKling4PaidFilmSeconds(value: unknown): value is Kling4PaidFilmSeconds {
  return typeof value === 'number' && (KLING4_PAID_FILM_DURATIONS as readonly number[]).includes(value)
}

/** No text is discarded. Each chunk owns a disjoint slice of the original spoken words. */
export function prepareKling4PaidFilm(args: {
  seconds: number; narration: string; scenes: readonly Kling4PaidScene[]
}): Kling4PaidChunk[] {
  if (!isKling4PaidFilmSeconds(args.seconds)) throw new Error('kling4_paid_duration_not_offered')
  if (!args.scenes.length || args.scenes.length > 60 || args.scenes.some(scene =>
    !scene.prompt.trim() || !Number.isFinite(scene.seconds) || scene.seconds <= 0)) throw new Error('kling4_paid_invalid_plan')
  const words = args.narration.trim().split(/\s+/u).filter(Boolean)
  if (!words.length) throw new Error('kling4_paid_missing_narration')
  const count = args.seconds / 15
  if (words.length < count) throw new Error('kling4_paid_missing_narration')
  const total = args.scenes.reduce((sum, scene) => sum + scene.seconds, 0)
  if (!Number.isFinite(total) || total <= 0) throw new Error('kling4_paid_invalid_plan')
  let cursor = 0
  const timeline = args.scenes.map(scene => {
    const start = cursor
    cursor += scene.seconds * args.seconds / total
    return { ...scene, start, end: cursor }
  })
  return Array.from({ length: count }, (_, index) => {
    const start = index * 15
    const shots = timeline.filter(scene => scene.end > start + 0.000001 && scene.start < start + 15 - 0.000001)
    if (!shots.length || shots.length > 15) throw new Error('kling4_paid_invalid_chunk')
    const prompts = shots.map(scene => scene.prompt.trim())
    const approvedStills = shots.map(scene => scene.approvedStillUrl || null)
    const narration = words.slice(Math.round(index * words.length / count), Math.round((index + 1) * words.length / count)).join(' ')
    const built = buildKling4TrialInput(prompts, approvedStills)
    return { index, seconds: 15 as const, narration, prompts, approvedStills, model: built.model, input: built.input }
  })
}

/** Submit once per signed slot. A lost receipt must stop the film, never buy that chunk twice. */
export async function submitKling4PaidFilm(
  chunks: readonly Kling4PaidChunk[],
  deps: {
    apiKey: string
    submit?: typeof submitKling4TrialVideo
    onAccepted: (chunk: Kling4PaidChunk, job: Kling4TrialJob) => Promise<void>
  },
): Promise<Kling4TrialJob[]> {
  if (!deps.apiKey || !chunks.length || ![1, 2, 4].includes(chunks.length)) throw new Error('kling4_paid_preflight_failed')
  // Validate the complete plan before the first provider POST.
  for (const [index, chunk] of chunks.entries()) {
    if (chunk.index !== index || chunk.seconds !== 15 || !chunk.narration.trim()) throw new Error('kling4_paid_preflight_failed')
    const built = buildKling4TrialInput(chunk.prompts, chunk.approvedStills)
    if (built.model !== chunk.model || JSON.stringify(built.input) !== JSON.stringify(chunk.input)) throw new Error('kling4_paid_preflight_failed')
  }
  const jobs: Kling4TrialJob[] = []
  for (const chunk of chunks) {
    const job = await (deps.submit ?? submitKling4TrialVideo)({ prompts: chunk.prompts, approvedStills: chunk.approvedStills }, { apiKey: deps.apiKey })
    // Durable binding is required before a later chunk can incur a second charge.
    await deps.onAccepted(chunk, job)
    jobs.push(job)
  }
  return jobs
}
