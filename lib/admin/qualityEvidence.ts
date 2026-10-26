import { EVIDENCE_VALIDATION, type EvidenceCoverage } from '@/lib/regua95/evidence'
import { TASK_FULFILLMENT_VERSION, type FulfillmentResult } from '@/lib/regua95/taskFulfillmentCanary'

export type TaskCanaryTarget = { videoId: string; generationId: string; coherenceEventId: string; pixelEventId: string }
export function readSavedTaskResult(value: unknown): FulfillmentResult | null {
  const result = record(value)
  if (result.version !== TASK_FULFILLMENT_VERSION || result.calibration_status !== 'not_calibrated' || !['yes', 'no', 'unknown'].includes(String(result.task_fulfilled)) || result.audio_evaluated !== false || !Array.isArray(result.findings) || !Array.isArray(result.incomplete_reasons)) return null
  const findings = result.findings.map(record)
  if (findings.some((f) => typeof f.scene !== 'number' || !Number.isInteger(f.scene) || f.scene < 1 || typeof f.requested !== 'string' || !f.requested.trim() || typeof f.observed !== 'string' || !f.observed.trim() || typeof f.defect !== 'string' || !f.defect.trim() || !['instruction_narrated', 'wrong_prop', 'action_not_shown', 'request_not_met'].includes(String(f.kind)) || !['task_failure', 'scene_defect', 'cosmetic'].includes(String(f.severity)) || (f.frame !== null && (!count(f.frame) || f.frame < 1)) || (f.time !== null && (typeof f.time !== 'number' || !Number.isFinite(f.time) || f.time < 0)))) return null
  if (result.numerical_score !== null && !validScore(result.numerical_score)) return null
  if (typeof result.original_request_verified !== 'boolean' || typeof result.score_basis !== 'string' || !result.score_basis.trim() || result.incomplete_reasons.some((r) => typeof r !== 'string')) return null
  if ((result.task_fulfilled === 'unknown' && result.numerical_score !== null) || (result.task_fulfilled === 'no' && (!findings.length || result.numerical_score === 100)) || (result.task_fulfilled === 'yes' && findings.some((f) => f.severity !== 'cosmetic'))) return null
  if (findings.some((f) => (f.frame === null) !== (f.time === null) || (['wrong_prop', 'action_not_shown'].includes(String(f.kind)) && f.frame === null))) return null
  if (result.task_fulfilled !== 'unknown' && result.incomplete_reasons.length > 0) return null
  if (result.task_fulfilled === 'no' && !findings.some((f) => f.severity !== 'cosmetic')) return null
  const severity = findings.some((f) => f.severity === 'task_failure') ? 'task_failure' : findings.some((f) => f.severity === 'scene_defect') ? 'scene_defect' : findings.length ? 'cosmetic' : 'no_observed_defect'
  const anchors = { task_failure: 0, scene_defect: 60, cosmetic: 90, no_observed_defect: 100 }
  if (result.score_basis !== severity || (result.task_fulfilled !== 'unknown' && result.numerical_score !== anchors[severity])) return null
  return result as unknown as FulfillmentResult
}

/** A consistent judge pair is still not proof it belongs to the real row being displayed. */
export function assessmentMatchesDelivery(
  assessment: { key: string; video_id: string | null; generation_id: string | null; user_id: string | null } | null | undefined,
  delivery: { video_id: string; generation_id: string | null; user_id: string },
): boolean {
  return !!assessment && !!delivery.video_id && !!delivery.generation_id && !!delivery.user_id && assessment.key === delivery.video_id && assessment.video_id === delivery.video_id && assessment.generation_id === delivery.generation_id && assessment.user_id === delivery.user_id
}

export type QualityJudge = 'coerencia' | 'pixel' | 'ugc'
export type JudgeState = 'missing' | 'historical' | 'incomplete' | 'complete'
export type JudgeReadout = {
  state: JudgeState
  score: number | null
  reasons: string[]
  coverage: EvidenceCoverage | null
  fidelityBasis: string | null
}
export type QualityReadout = {
  state: 'complete' | 'incomplete' | 'historical'
  score: number | null
  required: QualityJudge[]
  missing: QualityJudge[]
  historical: QualityJudge[]
}

const validScore = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100
const count = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0
const record = (x: unknown): Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : {}

/** Read-only presentation of persisted evidence; never reassess a model or relabel historical scores as validated. */
export function readJudgeEvidence(metadata: Record<string, unknown> | null | undefined, judge: QualityJudge = 'coerencia'): JudgeReadout {
  if (!metadata) return { state: 'missing', score: null, reasons: [], coverage: null, fidelityBasis: null }
  const score = validScore(metadata.score) ? metadata.score : null
  const reasons = Array.isArray(metadata.evidence_reasons) ? metadata.evidence_reasons.filter((s): s is string => typeof s === 'string').slice(0, 12) : []
  const fidelityBasis = typeof metadata.fidelity_basis === 'string' ? metadata.fidelity_basis : metadata.idea_source === 'roteiro' ? 'supplied_script' : metadata.idea_source === 'script_written_janela' ? 'unverified_window' : null
  if (metadata.evidence_validation !== EVIDENCE_VALIDATION) return { state: score === null ? 'incomplete' : 'historical', score, reasons: [score === null ? 'score_unavailable' : 'historical_evidence_not_validated'], coverage: null, fidelityBasis }
  const raw = record(metadata.coverage)
  const frameFieldsValid = [raw.expected_frames, raw.judged_frames, raw.unique_frames].every((v) => v === null || count(v))
  const fieldsValid = frameFieldsValid && count(raw.expected_readings) && raw.expected_readings > 0 && count(raw.valid_readings) && typeof raw.readings_identical === 'boolean' && raw.independent_readings === false && raw.audio_evaluated === false
  if (!fieldsValid) return { state: 'incomplete', score, reasons: [...reasons, 'coverage_metadata_missing'], coverage: null, fidelityBasis }
  const coverage = raw as unknown as EvidenceCoverage
  const readingsComplete = coverage.valid_readings >= coverage.expected_readings
  const needsFrames = judge === 'pixel' || judge === 'ugc'
  const framesComplete = !needsFrames && coverage.expected_frames === null || (coverage.expected_frames !== null && coverage.expected_frames > 0 && coverage.judged_frames !== null && coverage.unique_frames !== null && coverage.judged_frames >= coverage.expected_frames && coverage.unique_frames >= coverage.expected_frames)
  const complete = metadata.evidence_status === 'complete' && score !== null && readingsComplete && framesComplete && reasons.length === 0
  return { state: complete ? 'complete' : 'incomplete', score, reasons: complete ? [] : [...new Set([...reasons, ...(!readingsComplete ? ['readings_incomplete'] : []), ...(!framesComplete ? ['frames_below_plan'] : []), ...(score === null ? ['score_unavailable'] : [])])], coverage, fidelityBasis }
}

/** Required dimensions differ by product. An absent mandatory judge cannot borrow another judge's good score. */
export function combineQualityEvidence(product: string, judges: Partial<Record<QualityJudge, JudgeReadout>>): QualityReadout {
  const required: QualityJudge[] = product === 'filme' ? ['coerencia', 'pixel'] : product === 'ugc' ? ['pixel', 'ugc'] : product === 'ads' || product === 'clipe' ? ['pixel'] : []
  const missing = required.filter((name) => !judges[name] || judges[name]!.state === 'missing' || judges[name]!.state === 'incomplete')
  const historical = required.filter((name) => judges[name]?.state === 'historical')
  const complete = required.length > 0 && missing.length === 0 && historical.length === 0
  return { state: complete ? 'complete' : missing.length || !required.length ? 'incomplete' : 'historical', score: complete ? Math.min(...required.map((name) => judges[name]!.score!)) : null, required, missing, historical }
}

export function evidenceReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    historical_evidence_not_validated: 'Nota histórica: a cobertura ainda não foi validada por esta versão.',
    coverage_metadata_missing: 'O registro não confirma a cobertura da avaliação.',
    frames_missing: 'Não há quadros suficientes para inspecionar o vídeo.',
    frames_below_plan: 'Foram inspecionados menos quadros que o previsto.',
    duplicate_frame_urls: 'Há quadros repetidos na amostra recebida.',
    frame_response_incomplete: 'O avaliador não respondeu sobre todos os quadros.',
    frame_indexes_invalid: 'Não foi possível ligar cada resposta ao seu quadro.',
    readings_incomplete: 'Faltou uma das leituras previstas.',
    score_unavailable: 'A evidência não permite fechar uma nota.',
    request_provenance_unverified: 'Não foi possível confirmar o pedido original desta geração.',
  }
  return labels[reason] ?? 'Um item obrigatório da evidência não foi confirmado.'
}
