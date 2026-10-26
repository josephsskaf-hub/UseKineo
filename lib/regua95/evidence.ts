// Validation of evidence, not a new scoring rubric. Historical event/version IDs stay intact.
export const EVIDENCE_VALIDATION = '2026-10-26' as const
export type EvidenceCoverage = {
  expected_frames: number | null
  judged_frames: number | null
  unique_frames: number | null
  expected_readings: number
  valid_readings: number
  readings_identical: boolean
  independent_readings: false
  audio_evaluated: false
}
export type EvidenceAssessment = {
  evidence_validation: typeof EVIDENCE_VALIDATION
  evidence_status: 'complete' | 'incomplete'
  evidence_reasons: string[]
  coverage: EvidenceCoverage
}
export const isScore = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100
export const objectRecord = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}

export function assessEvidence(reasons: string[], coverage: Omit<EvidenceCoverage, 'independent_readings' | 'audio_evaluated'>): EvidenceAssessment {
  const unique = [...new Set(reasons)]
  return { evidence_validation: EVIDENCE_VALIDATION, evidence_status: unique.length ? 'incomplete' : 'complete', evidence_reasons: unique, coverage: { ...coverage, independent_readings: false, audio_evaluated: false } }
}

/** Never match by array position: repeated/missing indexes are missing evidence. */
export function inspectFrameEvidence(
  parsed: unknown,
  frames: Array<{ url: string; t: number | null }>,
  expectedFrames: number,
  validRow: (row: Record<string, unknown>) => boolean,
): EvidenceAssessment {
  const raw = objectRecord(parsed).frames
  const rows = Array.isArray(raw) ? raw.map(objectRecord) : []
  const indexes = rows.map((r) => r.i)
  const judged = frames.filter((_, i) => rows.filter((r) => r.i === i + 1).length === 1 && validRow(rows.find((r) => r.i === i + 1)!)).length
  const unique = new Set(frames.map((f) => f.url)).size
  const reasons: string[] = []
  if (!frames.length) reasons.push('frames_missing')
  if (frames.length < expectedFrames) reasons.push('frames_below_plan')
  if (unique < frames.length) reasons.push('duplicate_frame_urls')
  if (!Array.isArray(raw) || rows.length !== frames.length || judged !== frames.length) reasons.push('frame_response_incomplete')
  if (new Set(indexes).size !== indexes.length || indexes.some((i) => !Number.isInteger(i) || Number(i) < 1 || Number(i) > frames.length)) reasons.push('frame_indexes_invalid')
  return assessEvidence(reasons, { expected_frames: expectedFrames, judged_frames: judged, unique_frames: unique, expected_readings: 1, valid_readings: judged === frames.length && frames.length > 0 ? 1 : 0, readings_identical: false })
}
