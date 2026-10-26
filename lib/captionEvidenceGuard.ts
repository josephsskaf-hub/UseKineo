import { verifyObservedSpeech } from '@/lib/cinematic/speechContract'
import type { ComposeInputs } from '@/lib/compose'

/** FREE15-CAPTION-2610. Pure check of EXISTING ASR, never a transcription or repair.
 * A mismatch says the two pieces of evidence disagree, not whether TTS or ASR is wrong.
 * Strong mismatch selects canonical caption text; it never rejects the film or certifies audio.
 * Missing/unsupported evidence is explicitly unverified and keeps the existing path.
 */
export const CAPTION_EVIDENCE_VERSION = 'own-tts-caption-evidence-v1'
export interface CaptionEvidenceWord { word: string; start: number; end: number }
export interface CaptionEvidenceInput {
  quality: string
  duration: number
  ownTts: boolean
  language?: string
  script: string
  words: readonly CaptionEvidenceWord[] | undefined
}
export interface CaptionEvidenceAssessment {
  version: typeof CAPTION_EVIDENCE_VERSION
  status: 'consistent' | 'mismatch' | 'unverified' | 'not_applicable'
  reason: string
  expectedTokens: number
  observedTokens: number
  expectedCoverage: number | null
  observedCoverage: number | null
  longestExpectedGap: number
  longestObservedGap: number
}

function normalize(text: string, language: string): string {
  // Remove Latin accents only. Hindi vowels/Arabic marks are not disposable typography.
  return text.normalize('NFKD').replace(/(\p{Script=Latin})\p{M}+/gu, '$1').normalize('NFC')
    .replace(/%/g, language.startsWith('pt') ? ' por cento ' : language.startsWith('es') ? ' por ciento ' : language.startsWith('en') ? ' percent ' : ' % ')
    .replace(/\b(?:[A-Za-z]\.){2,}/g, acronym => acronym.replace(/\./g, ''))
    .toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()
}
const tokenize = (text: string): string[] => text.split(/\s+/).filter(Boolean)
const integer = (text: string): boolean => /^\d{1,6}$/.test(text)
const latin = (text: string): boolean => !/[^\p{Script=Latin}\p{N}\s]/u.test(text)
const round = (n: number): number => Math.round(n * 1000) / 1000

/** Reuse existing EN/ES/PT integer equivalence, preserving different numeric values.
 * Synthetic timestamps are used ONLY by the pure text comparator, never for captions.
 */
function equivalentText(expected: string, observed: string): boolean {
  return verifyObservedSpeech(expected, [{ word: observed, start: 0, end: 1 }]).ok
}

function alignment(a: string[], b: string[]): { a: number; b: number; gapA: number; gapB: number } {
  const width = b.length + 1, dp = new Uint16Array((a.length + 1) * width)
  const choices = new Map<number, [number, number]>()
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      const index = i * width + j
      dp[index] = Math.max(dp[(i + 1) * width + j], dp[index + 1])
      const accept = (na: number, nb: number): void => {
        const value = na + nb + dp[(i + na) * width + j + nb]
        if (value > dp[index]) { dp[index] = value; choices.set(index, [na, nb]) }
      }
      if (a[i] === b[j]) accept(1, 1)
      // Do not punish "63%" versus "sessenta e três por cento" or spoken years.
      // Bound the work and require the EXISTING comparator to agree on the value.
      if (integer(a[i])) for (let n = 1; n <= 8 && j + n <= b.length; n++) {
        if (equivalentText(a[i], b.slice(j, j + n).join(' '))) accept(1, n)
      }
      if (integer(b[j])) for (let n = 1; n <= 8 && i + n <= a.length; n++) {
        if (equivalentText(a.slice(i, i + n).join(' '), b[j])) accept(n, 1)
      }
    }
  }
  let i = 0, j = 0, endA = 0, endB = 0, matchedA = 0, matchedB = 0, gapA = 0, gapB = 0
  while (i < a.length && j < b.length) {
    const choice = choices.get(i * width + j)
    if (choice) {
      gapA = Math.max(gapA, i - endA); gapB = Math.max(gapB, j - endB)
      matchedA += choice[0]; matchedB += choice[1]
      i += choice[0]; j += choice[1]; endA = i; endB = j
    } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) i++
    else j++
  }
  return { a: matchedA, b: matchedB, gapA: Math.max(gapA, a.length - endA), gapB: Math.max(gapB, b.length - endB) }
}

export function assessOwnTtsCaptionEvidence(input: CaptionEvidenceInput): CaptionEvidenceAssessment {
  const result: CaptionEvidenceAssessment = {
    version: CAPTION_EVIDENCE_VERSION, status: 'unverified', reason: 'missing_evidence',
    expectedTokens: 0, observedTokens: 0, expectedCoverage: null, observedCoverage: null,
    longestExpectedGap: 0, longestObservedGap: 0,
  }
  const finish = (status: CaptionEvidenceAssessment['status'], reason: string): CaptionEvidenceAssessment => ({ ...result, status, reason })
  if (input.quality !== 'cinematic_ai' || input.duration !== 15 || input.ownTts !== true) return finish('not_applicable', 'outside_own_tts_seedance15')
  if (typeof input.script !== 'string' || !input.script.trim() || !Array.isArray(input.words) || !input.words.length) return result
  if (input.script.length > 8000 || input.words.length > 250) return finish('unverified', 'evidence_too_large')
  let lastStart = -1
  for (const w of input.words) {
    // ASR can emit a zero-width word (present in the owned canary); it still supplies
    // text evidence. This guard never edits or certifies caption timing.
    if (!w || typeof w.word !== 'string' || !Number.isFinite(w.start) || !Number.isFinite(w.end) || w.start < 0 || w.end < w.start || w.start < lastStart) return finish('unverified', 'invalid_timestamps')
    lastStart = w.start
  }
  const spokenText = input.words.map(w => w.word).join(' ')
  if (spokenText.length > 8000) return finish('unverified', 'evidence_too_large')
  const expected = normalize(input.script, input.language ?? ''), observed = normalize(spokenText, input.language ?? '')
  const a = tokenize(expected), b = tokenize(observed)
  result.expectedTokens = a.length; result.observedTokens = b.length
  if (!a.length || !b.length) return result
  if (a.length > 200 || b.length > 200) return finish('unverified', 'evidence_too_large')
  if (equivalentText(expected, observed)) {
    result.expectedCoverage = result.observedCoverage = 1
    return finish('consistent', 'text_equivalent_not_audio_certification')
  }
  // A Latin token heuristic has no calibrated claim on other writing systems.
  if (!latin(expected) || !latin(observed)) return finish('unverified', 'writing_system_not_calibrated')
  if (!/^(pt|en|es)(?:-|$)/i.test(input.language ?? '')) return finish('unverified', 'language_not_calibrated')
  if (a.length < 12 || b.length < 4) return finish('unverified', 'too_little_text')
  // Decimal/ordinal/date readings need a richer number contract. Never call them wrong here.
  if (/\d[.,:/]\d|\d\s*[ºª]/u.test(input.script)) return finish('unverified', 'numeric_form_not_calibrated')
  const match = alignment(a, b)
  const recall = match.a / a.length, precision = match.b / b.length
  result.expectedCoverage = round(recall); result.observedCoverage = round(precision)
  result.longestExpectedGap = match.gapA; result.longestObservedGap = match.gapB
  // Conservative engineering gates, not a quality score or a calibrated ASR accuracy claim.
  if (a.length - match.a >= 8 && b.length - match.b >= 6 && recall < 0.7 && precision < 0.75) return finish('mismatch', 'broad_text_disagreement')
  if (match.gapA >= 8 && recall < 0.8) return finish('mismatch', 'substantial_script_omission')
  if (match.gapB >= 8 && precision < 0.7) return finish('mismatch', 'substantial_unexpected_speech')
  if (match.gapA >= 6 && match.gapB >= 6 && recall < 0.85 && precision < 0.85) return finish('mismatch', 'corrupted_passage')
  return finish('unverified', 'partial_alignment_not_proof')
}

export interface CaptionAlignment {
  version: 'own-tts-caption-source-v2'
  source: 'existing_caption_path' | 'canonical_tts_script'
  timing: 'existing' | 'approximate'
  evidence_status: 'unverified'
  reason: string
  measured_audio_seconds: number | null
}

const captionElement = (value: unknown): boolean => !!value && typeof value === 'object' &&
  (value as { type?: unknown }).type === 'text' && [5, 7].includes(Number((value as { track?: unknown }).track))

/** Founder listened to C and approved its voice/images (26/10). ASR disagreement
 * is not a failed film. Use the EXISTING builder's proportional caption fallback,
 * then replace ONLY caption elements: ASR also guides cuts, which must not change.
 * This is synchronous source assembly, never a render/provider call. Raw ASR stays
 * untouched. Approximate captions are not independent evidence that speech is correct.
 */
export function selectOwnTtsCaptionSource(input: {
  source: Record<string, unknown>
  compose: ComposeInputs
  evidence: CaptionEvidenceAssessment
  build: (compose: ComposeInputs) => Record<string, unknown>
  decorate?: (source: Record<string, unknown>) => void
}): { source: Record<string, unknown>; alignment: CaptionAlignment | null } {
  const { source, compose, evidence } = input
  if (evidence.status === 'not_applicable') return { source, alignment: null }
  const measured = compose.realAudioDuration
  const validDuration = typeof measured === 'number' && Number.isFinite(measured) && measured > 4 && measured <= 90
  const alignment: CaptionAlignment = {
    version: 'own-tts-caption-source-v2', source: 'existing_caption_path', timing: 'existing',
    evidence_status: 'unverified', reason: evidence.reason,
    measured_audio_seconds: validDuration ? measured : null,
  }
  if (evidence.status !== 'mismatch') return { source, alignment }
  if (!validDuration) return { source, alignment: { ...alignment, reason: 'measured_duration_unavailable' } }
  if (compose.quality !== 'cinematic_ai' || compose.duration !== 15 || !compose.voiceoverScript.trim() || !Array.isArray(source.elements)) {
    return { source, alignment: { ...alignment, reason: 'canonical_fallback_unavailable' } }
  }
  let canonical: Record<string, unknown>
  try {
    canonical = input.build({ ...compose, whisperWords: undefined })
    input.decorate?.(canonical)
  } catch {
    // A local fallback cannot turn an otherwise assembled film into a failed render.
    return { source, alignment: { ...alignment, reason: 'canonical_assembly_unavailable' } }
  }
  const captions = Array.isArray(canonical.elements) ? canonical.elements.filter(captionElement) : []
  if (!captions.length) return { source, alignment: { ...alignment, reason: 'canonical_captions_unavailable' } }
  let inserted = false
  const elements = source.elements.flatMap(element => {
    if (!captionElement(element)) return [element]
    if (inserted) return []
    inserted = true
    return captions
  })
  if (!inserted) elements.push(...captions)
  return {
    source: { ...source, elements },
    alignment: { ...alignment, source: 'canonical_tts_script', timing: 'approximate', reason: 'asr_disagreement_script_caption_fallback' },
  }
}
