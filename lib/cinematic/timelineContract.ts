/** Shared timeline arithmetic. No network, padding, loop, or billing decisions. */
export type TimelineScene = { engine: string; seconds: number }

export function cinematicSceneSeconds(c: TimelineScene): number {
  const valid = Number.isFinite(c.seconds) && c.seconds > 0
  if (c.engine === 'host') return valid ? Math.min(20, Math.max(2, c.seconds)) : 10
  if (c.engine === 'dialogue') return valid ? Math.min(15, Math.max(3, c.seconds)) : 10
  if (c.engine === 'cinematic') return valid ? Math.min(15, Math.max(4, c.seconds)) : 8
  return valid ? Math.min(13, Math.max(2, c.seconds)) : 10
}

export function minimumFilmSeconds(requested: number): number {
  return Number.isFinite(requested) && requested > 0 ? Math.min(90, requested) : 0
}

/** Allocate actual provider footage before submission, bounded by spoken text.
 * Never invent a mute payoff scene merely to make the sum pass. */
export function fitCinematicPlanFloor<T extends { type: string; seconds: number; voiceover?: string | null }>(
  scenes: T[], requested: number, supportCap: number,
): T[] {
  const result = scenes.map(scene => ({ ...scene }))
  let total = result.reduce((sum, scene) => sum + scene.seconds, 0)
  for (const scene of result) {
    if (total >= requested) break
    if (scene.type === 'dialogue') continue
    const words = (scene.voiceover ?? '').trim().split(/\s+/).filter(Boolean).length
    if (!words) continue
    const cap = Math.min(scene.type === 'cinematic' ? 8 : supportCap, Math.ceil(words / 2.3) + 1)
    const extra = Math.max(0, Math.min(cap - scene.seconds, requested - total))
    scene.seconds += extra
    total += extra
  }
  return result
}

/** Trim only genuine spare footage; never shorten the user's contracted film. */
export function trimNarratedSupport(
  scenes: TimelineScene[], sceneIndex: number, audioSeconds: number, requested: number,
): number {
  const scene = scenes[sceneIndex]
  if (!scene) return 0
  const current = cinematicSceneSeconds(scene)
  if (scene.engine !== 'support' || !Number.isFinite(audioSeconds) || audioSeconds <= 0) return current
  const total = scenes.reduce((sum, c) => sum + cinematicSceneSeconds(c), 0)
  const available = Math.max(0, total - minimumFilmSeconds(requested))
  const speechFit = Math.max(3, Math.ceil((audioSeconds + 0.6) * 1000) / 1000)
  return Math.round((current - Math.min(available, Math.max(0, current - speechFit))) * 1000) / 1000
}

export class CinematicTimelineError extends Error {
  constructor(readonly actualSeconds: number, readonly requestedSeconds: number) {
    super('cinematic_timeline_too_short')
    this.name = 'CinematicTimelineError'
  }
}

export function assertCinematicTimeline(scenes: TimelineScene[], requested: number): void {
  const total = scenes.reduce((sum, c) => sum + cinematicSceneSeconds(c), 0)
  const minimum = minimumFilmSeconds(requested)
  if (minimum > 0 && total + 0.001 < minimum) throw new CinematicTimelineError(total, minimum)
}

/** URLs have already passed the claim's equality/ownership check in compose.
 * Recover scene indexes from that signed claim, not the caller's compacted arrays.
 * This also covers the cron, which historically filtered URLs but kept metadata full-size.
 */
export function signedSceneMetadata(
  response: Record<string, unknown>, authorizedUrls: Array<string | null>, clipUrls: string[], requireAdvanced = false,
): Record<string, unknown[]> {
  const indexes: number[] = []
  authorizedUrls.forEach((url, i) => { if (typeof url === 'string' && url.length > 0) indexes.push(i) })
  if (indexes.length !== clipUrls.length || indexes.some((i, n) => authorizedUrls[i] !== clipUrls[n])) {
    throw new Error('cinematic_scene_alignment_mismatch')
  }
  const aligned: Record<string, unknown[]> = {}
  for (const key of ['scene_engines', 'scene_seconds', 'scene_narrations', 'scene_dialogues', 'scene_captions']) {
    const source = response[key]
    if (requireAdvanced && (!Array.isArray(source) || source.length !== authorizedUrls.length)) {
      throw new Error('cinematic_scene_metadata_invalid')
    }
    if (requireAdvanced && Array.isArray(source) && indexes.some(i =>
      key === 'scene_seconds'
        ? typeof source[i] !== 'number' || !Number.isFinite(source[i]) || source[i] <= 0
        : key === 'scene_engines'
          ? !['support', 'cinematic', 'host', 'dialogue'].includes(source[i])
          : source[i] !== null && typeof source[i] !== 'string'
    )) throw new Error('cinematic_scene_metadata_invalid')
    if (Array.isArray(source)) aligned[key] = indexes.map(i => source[i] ?? null)
  }
  return aligned
}

// ═══ KINEO-SILENCIO-NA-CENA-2026-09-11 — A RÉGUA QUE FALTAVA ═══════════════
// O portão media buraco ENTRE cenas (cena sem texto), nunca sobra DENTRO da
// cena. O canário do faroleiro (Kling 3, 11/09) passou com mute_seconds 0 e
// saiu com ~17,5 s sem narração, incluindo silêncio digital absoluto: uma cena
// de 4 s carregava duas palavras ("I didn't") — 3,2 s calados contados como
// "cena com história". Ordem do fundador: "está aprovado, pode fazer".
//
// Régua: por cena, silêncio = max(0, segundos − palavras ÷ wps), com o wps da
// família (2,3 no caminho avançado; 3,1 no clássico). Reprova acima de 1,5 s
// numa cena isolada ou 8 s no total. Puro: sem I/O, sem relógio.
export const SILENCE_SCENE_MAX_SECONDS = 1.5
export const SILENCE_TOTAL_MAX_SECONDS = 8

export type SilenceScene = { type: string; seconds: number; voiceover?: string | null; dialogueLine?: string | null }

export function sceneSpokenWords(scene: SilenceScene): number {
  const text = scene.type === 'dialogue' || scene.type === 'host' ? scene.dialogueLine : scene.voiceover
  return String(text ?? '').trim().split(/\s+/).filter(Boolean).length
}

/** Segundos sem fala DENTRO da cena (0 quando a fala preenche o clipe). */
export function sceneSilenceSeconds(scene: SilenceScene, wps: number): number {
  const seconds = Number.isFinite(scene.seconds) ? Math.max(0, scene.seconds) : 0
  const spoken = sceneSpokenWords(scene) / Math.max(0.5, wps)
  return Math.max(0, Math.round((seconds - spoken) * 10) / 10)
}

export interface SilenceReport {
  perScene: number[]
  total: number
  worst: number
  worstScene: number
  ok: boolean
  /** Palavras que faltam para calar o silêncio total no wps da família. */
  wordsToAdd: number
}

export function planSilenceReport(scenes: readonly SilenceScene[], wps: number): SilenceReport {
  const perScene = scenes.map((s) => sceneSilenceSeconds(s, wps))
  const total = Math.round(perScene.reduce((a, b) => a + b, 0) * 10) / 10
  let worst = 0
  let worstScene = 0
  perScene.forEach((v, i) => { if (v > worst) { worst = v; worstScene = i + 1 } })
  const ok = worst <= SILENCE_SCENE_MAX_SECONDS && total <= SILENCE_TOTAL_MAX_SECONDS
  return { perScene, total, worst, worstScene, ok, wordsToAdd: ok ? 0 : Math.ceil(total * wps) }
}
