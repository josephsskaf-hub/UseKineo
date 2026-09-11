/** One scene, one speech source. No I/O, provider selection or voice fallback. */
export type SceneSpeechEngine = 'dialogue' | 'host' | 'cinematic' | 'support'

export interface ObservedSpeechWord {
  word: string
  start: number
  end: number
}

export function hasNativeSceneSpeech(engine: string): boolean {
  return engine === 'dialogue' || engine === 'host'
}

/** All advanced families use the same contract; a dialogue is never voice-over. */
export function sceneNarrationsForPlan(
  scenes: ReadonlyArray<{ type: string; voiceover?: string | null }>,
): Array<string | null> {
  return scenes.map((scene) => hasNativeSceneSpeech(scene.type) ? null : scene.voiceover?.trim() || null)
}

/** Missing metadata must not silently produce an unvoiced support scene. */
export function collectSceneNarrations(
  clips: ReadonlyArray<{ engine: SceneSpeechEngine }>,
  narrations: readonly unknown[],
): Array<{ sceneIdx: number; text: string }> {
  return clips.flatMap((clip, sceneIdx) => {
    if (hasNativeSceneSpeech(clip.engine)) return []
    const value = narrations[sceneIdx]
    const text = typeof value === 'string' ? value.trim() : ''
    if (!text) throw new Error(`Scene ${sceneIdx + 1} is missing its narration.`)
    return [{ sceneIdx, text }]
  })
}

function spokenTextKey(text: string): string {
  // Ignore typography, not words. Do not fuzzy-match, translate or replace names.
  const key = text.normalize('NFKC')
    .replace(/\b(?:[A-Za-z]\.){2,}/g, (acronym) => acronym.replace(/\./g, ''))
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()
  // Explicitly bounded ASR equivalence: English cardinal integers 0..99.
  // No guessed dates, decimals, ordinals, abbreviations or semantic rewriting.
  const units = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
  const tokens = key.split(/\s+/)
  const normalized: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const ten = tens.indexOf(tokens[i])
    if (ten >= 0) {
      const unit = units.indexOf(tokens[i + 1] ?? '')
      normalized.push(String((ten + 2) * 10 + (unit > 0 && unit < 10 ? unit : 0)))
      if (unit > 0 && unit < 10) i++
    } else {
      const unit = units.indexOf(tokens[i])
      normalized.push(unit >= 0 ? String(unit) : tokens[i])
    }
  }
  return normalized.join(' ')
}

export type SpeechVerification =
  | { ok: true }
  | { ok: false; reason: 'missing_script' | 'missing_speech' | 'invalid_timestamps' | 'script_mismatch' }

/** ASR verifies words/timing only; it cannot certify face identity or lip motion. */
export function verifyObservedSpeech(
  expected: string | undefined,
  words: readonly ObservedSpeechWord[] | undefined,
): SpeechVerification {
  const expectedKey = spokenTextKey(expected ?? '')
  if (!expectedKey) return { ok: false, reason: 'missing_script' }
  if (!words?.length || !words.some((word) => spokenTextKey(word.word))) {
    return { ok: false, reason: 'missing_speech' }
  }
  let previousStart = -1
  for (const word of words) {
    if (!Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < 0 ||
        word.end <= word.start || word.start < previousStart) {
      return { ok: false, reason: 'invalid_timestamps' }
    }
    previousStart = word.start
  }
  return spokenTextKey(words.map((word) => word.word).join(' ')) === expectedKey
    ? { ok: true }
    : { ok: false, reason: 'script_mismatch' }
}
