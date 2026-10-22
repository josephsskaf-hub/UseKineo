// KINEO-ADS-CENA-95-2110 — previsão completa por tarifas publicadas, não fatura nem custo real medido.
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { FAL_USD_PER_COMPUTE_SECOND } from '@/lib/regua95/pixelScore'
import { ADS_V2_FRAME_RATE } from '../adV2Montage'
import { CENA_KEYFRAME_USD, type CenaRoute, type CenaVoiceMode } from './adapters'
export const CENA95_COST_CHECKED_AT = '2026-10-21'
export const CENA95_COST_SOURCES = {
  kling: 'https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video',
  seedance: 'https://fal.ai/models/bytedance/seedance-2.0/image-to-video',
  seedanceReference: 'https://fal.ai/models/bytedance/seedance-2.0/reference-to-video',
  veo: 'https://fal.ai/models/fal-ai/veo3.1/reference-to-video',
  veoClose: 'https://fal.ai/models/fal-ai/veo3.1/image-to-video',
  keyframes: 'https://fal.ai/models/fal-ai/nano-banana-pro/edit',
  voice: 'https://fal.ai/models/fal-ai/minimax/speech-2.8-hd',
  music: 'https://fal.ai/models/fal-ai/lyria3/pro',
  compute: 'https://fal.ai/models/fal-ai/workflow-utilities/extract-nth-frame',
  planning: 'https://developers.openai.com/api/docs/models/gpt-4o-mini',
  judge: 'https://developers.openai.com/api/docs/models/gpt-4o',
  visionTokens: 'https://developers.openai.com/api/docs/guides/images-vision',
  renderCredits: 'https://creatomate.com/docs/account/how-are-credits-calculated',
  renderPricing: 'https://creatomate.com/docs/account/how-does-the-pricing-work',
} as const
export interface Cena95RenderTariff { usdPerCredit: number; source: string; checkedAt: string; basis: 'published_plan_allocation' | 'provided_account_tariff'; label: string }
/** Alocação do Essential público ($54/2000 créditos), NÃO o plano/contrato real da conta Kineo. */
export const CENA95_ESSENTIAL_PUBLIC: Readonly<Cena95RenderTariff> = { usdPerCredit: 54 / 2000, source: CENA95_COST_SOURCES.renderPricing, checkedAt: CENA95_COST_CHECKED_AT, basis: 'published_plan_allocation', label: 'Public Essential monthly allowance allocation; actual account unknown' }
export const CENA95_UNIT_RATES = {
  klingSilent: 0.112, klingNative: 0.168, seedance720: 0.3034, veoSilent: 0.2, veoNative: 0.4,
  minimaxPerCharacter: 0.1 / 1000, lyria3PerAudio: 0.08,
  planningInputPerMillion: 0.15, planningOutputPerMillion: 0.6,
  judgeInputPerMillion: 2.5, judgeOutputPerMillion: 10,
} as const
export interface Cena95TokenBudgets {
  /** Texto por chamada; a imagem high do classificador é adicionada separadamente. */
  planningInput: number; planningOutput: number;
  /** Entrada total (texto+imagens) por leitura do juiz. */
  judgeInput: number; judgeOutput: number;
}
export interface Cena95CostOptions {
  characters: number; planningCalls?: number; judgeCalls?: number;
  tokenBudgets?: Partial<Cena95TokenBudgets>;
  /** Reserva total explícita de processamento por job, não previsão de tempo de CPU observado. */
  computeSeconds?: number;
  render?: { width: number; height: number; fps: number; seconds: number };
  /** null indica tarifa desconhecida e impede declarar previsão completa. O default é o perfil público identificado. */
  renderTariff?: Cena95RenderTariff | null;
}
export interface Cena95CostPart { component: string; quantity: number; maxQuantity: number; unit: string; unitUsd: number; usd: number; maxUsd: number; source: string; basis: string }
const r6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000
function integer(v: unknown, min: number, max: number, field: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new Error(`cena95_cost_bad_${field}`)
  return v
}
export function cena95RenderCredits(render: { width: number; height: number; fps: number; seconds: number }): number {
  integer(render.width, 1, 7680, 'width'); integer(render.height, 1, 7680, 'height'); integer(render.fps, 1, 120, 'fps')
  if (!Number.isFinite(render.seconds) || render.seconds <= 0 || render.seconds > 3600) throw new Error('cena95_cost_bad_render_seconds')
  return Math.max(1, Math.ceil(render.width * render.height * render.fps * render.seconds / 100_000_000))
}
export function estimateCena95Cost(route: CenaRoute, mode: CenaVoiceMode, options: Cena95CostOptions) {
  if (!['kling3', 'seedance2', 'veo31'].includes(route) || !['narrated', 'talking'].includes(mode)) throw new Error('cena95_cost_bad_route_or_mode')
  const characters = integer(options.characters, mode === 'narrated' ? 1 : 0, 10_000, 'characters')
  const normalJudgeCalls = route === 'veo31' ? 9 : 7, maxJudgeCalls = normalJudgeCalls * 2
  const planningCalls = integer(options.planningCalls ?? 2, 2, 3, 'planning_calls'), judgeCalls = integer(options.judgeCalls ?? normalJudgeCalls, normalJudgeCalls, maxJudgeCalls, 'judge_calls')
  const t = { planningInput: 8192, planningOutput: 2048, judgeInput: 16384, judgeOutput: 512, ...options.tokenBudgets }
  for (const [key, value] of Object.entries(t)) integer(value, 1, 128_000, 'tokens_' + key)
  // High/auto gpt-4o-mini: 2833 base + no máximo 8 tiles de 5667, após as duas reduções oficiais.
  const classifierImageTokens = 2833 + 8 * 5667
  if (t.planningInput + classifierImageTokens + t.planningOutput > 128_000 || t.planningOutput > 16_384 || t.judgeInput + t.judgeOutput > 128_000) throw new Error('cena95_cost_token_budget_exceeds_context')
  const computeSeconds = integer(options.computeSeconds ?? 120, 1, 3600, 'compute_seconds')
  const render = options.render ?? { width: 1080, height: 1920, fps: ADS_V2_FRAME_RATE, seconds: 15 }, credits = cena95RenderCredits(render)
  const tariff = options.renderTariff === undefined ? CENA95_ESSENTIAL_PUBLIC : options.renderTariff
  if (!tariff || !Number.isFinite(tariff.usdPerCredit) || tariff.usdPerCredit <= 0 || !/^https:\/\/\S+$/u.test(tariff.source) || !/^\d{4}-\d{2}-\d{2}$/u.test(tariff.checkedAt) || !['published_plan_allocation', 'provided_account_tariff'].includes(tariff.basis) || !tariff.label) throw new Error('cena95_cost_render_tariff_unverified')
  const rates = CENA95_UNIT_RATES, parts: Cena95CostPart[] = []
  const add = (component: string, quantity: number, maxQuantity: number, unit: string, unitUsd: number, source: string, basis: string) => parts.push({ component, quantity, maxQuantity, unit, unitUsd, usd: r6(quantity * unitUsd), maxUsd: r6(maxQuantity * unitUsd), source, basis })
  const peopleSeconds = route === 'kling3' ? (mode === 'narrated' ? 20 : 30) : route === 'veo31' ? 32 : mode === 'narrated' ? 22 : 32
  const closeSeconds = route === 'veo31' ? 6 : 5
  const peopleRate = route === 'kling3' ? (mode === 'narrated' ? rates.klingSilent : rates.klingNative) : route === 'veo31' ? (mode === 'narrated' ? rates.veoSilent : rates.veoNative) : rates.seedance720
  const closeRate = route === 'kling3' ? rates.klingSilent : route === 'veo31' ? rates.veoSilent : rates.seedance720
  const videoSource = route === 'kling3' ? CENA95_COST_SOURCES.kling : route === 'veo31' ? CENA95_COST_SOURCES.veo : CENA95_COST_SOURCES.seedanceReference
  add('keyframes', 2, 4, 'candidate image', CENA_KEYFRAME_USD, CENA95_COST_SOURCES.keyframes, 'two candidates; at most two rounds')
  add('people_video', peopleSeconds, peopleSeconds * 2, 'generated second', peopleRate, videoSource, route === 'kling3' ? 'two multi-shot candidates, 10s narrated or 15s native talking' : route === 'veo31' ? 'two candidates × two 8s clips; selected timeline keeps 8+7' : 'two 4s hooks keep3 + two 7s narrated or 12s native use clips')
  add('real_product_close', closeSeconds, closeSeconds * 2, 'generated second', closeRate, route === 'veo31' ? CENA95_COST_SOURCES.veoClose : route === 'seedance2' ? CENA95_COST_SOURCES.seedance : CENA95_COST_SOURCES.kling, 'single-image real product i2v, silent; keep5; maximum two tries')
  add('planning_text_input', planningCalls * t.planningInput, 3 * t.planningInput, 'token', rates.planningInputPerMillion / 1_000_000, CENA95_COST_SOURCES.planning, `declared text-token budget; model=${AI_TEXT_MODELS.ads}`)
  add('classifier_image_input', classifierImageTokens, classifierImageTokens, 'image token', rates.planningInputPerMillion / 1_000_000, CENA95_COST_SOURCES.visionTokens, 'one high-detail product photo; conservative maximum8tiles, not measured usage')
  add('planning_output', planningCalls * t.planningOutput, 3 * t.planningOutput, 'token', rates.planningOutputPerMillion / 1_000_000, CENA95_COST_SOURCES.planning, 'declared maximum per response; no cache discount assumed')
  add('judge_input', judgeCalls * t.judgeInput, maxJudgeCalls * t.judgeInput, 'token', rates.judgeInputPerMillion / 1_000_000, CENA95_COST_SOURCES.judge, `total text+image input-token budget; model=${AI_TEXT_MODELS.adsRetry}`)
  add('judge_output', judgeCalls * t.judgeOutput, maxJudgeCalls * t.judgeOutput, 'token', rates.judgeOutputPerMillion / 1_000_000, CENA95_COST_SOURCES.judge, `${normalJudgeCalls} nominal reads, ${maxJudgeCalls} maximum reads`)
  add('narrated_voice', mode === 'narrated' ? characters : 0, mode === 'narrated' ? characters : 0, 'submitted character including pause marker', rates.minimaxPerCharacter, CENA95_COST_SOURCES.voice, mode === 'narrated' ? 'one MiniMax synthesis; uncertain POST never repeated' : 'native video speech; no TTS or extra lip-sync')
  add('music', 1, 1, 'Lyria3 Pro audio', rates.lyria3PerAudio, CENA95_COST_SOURCES.music, 'reuse lib/lyriaMusic; one generated instrumental, never Lyria2')
  add('frame_extraction', computeSeconds, computeSeconds, 'reserved compute second', FAL_USD_PER_COMPUTE_SECOND, CENA95_COST_SOURCES.compute, 'explicit total compute reserve for all frame jobs; not observed CPU duration or provider invoice')
  add('creatomate', credits, credits, 'render API credit', tariff.usdPerCredit, tariff.source, tariff.label)
  const totalUsd = r6(parts.reduce((sum, p) => sum + p.usd, 0)), budgetMaxUsd = r6(parts.reduce((sum, p) => sum + p.maxUsd, 0))
  return {
    marker: 'KINEO-ADS-CENA-95-2110' as const, route, voice_mode: mode, estimated: true as const, complete: true as const,
    currency: 'USD' as const, checkedAt: CENA95_COST_CHECKED_AT, totalUsd, budgetMaxUsd,
    actualTotalUsd: null, actualStatus: 'not_measured' as const, breakdown: parts,
    assumptions: { tokenBudgets: t, classifierImageTokens, planningCalls, maxPlanningCalls: 3, judgeCalls, maxJudgeCalls, computeSeconds, computeBudgetIsMeasured: false, render, renderCredits: credits, renderTariff: { ...tariff }, generatedPeopleSeconds: peopleSeconds, generatedCloseSeconds: closeSeconds, keyframeCandidates: 2, maxKeyframeCandidates: 4, videoRounds: 1, maxVideoRounds: 2 },
    notes: ['Provider pipeline forecast before taxes, not a paid amount or guaranteed invoice ceiling.', 'Text/vision tokens and compute reserves are declared budgets, not measurements; actual usage must be recorded separately.', 'USD per Creatomate credit uses the identified tariff profile; the actual Kineo account plan is unknown.', 'Seedance public page conflicts: UI0.3034/s versus table/formula0.3024/s; forecast chooses the higher0.3034/s.', 'No new transcription call is planned: MiniMax returns no word timestamps; caption timing uses the separate documented fallback.'],
  }
}

export const CENA95_ACTUAL_COMPONENTS = ['keyframes', 'people_video', 'real_product_close', 'planning_input', 'planning_output', 'judge_input', 'judge_output', 'narrated_voice', 'music', 'frame_extraction', 'creatomate'] as const
export type Cena95ActualComponent = typeof CENA95_ACTUAL_COMPONENTS[number]
export interface Cena95MeasuredEntry {
  id: string; component: Cena95ActualComponent; quantity: number; unitUsd: number;
  measurementSource: string; measuredAt: string; tariffSource: string;
  tariffConfirmed: boolean; tariffBasis: 'confirmed_account' | 'public_reference';
}
export interface Cena95ActualUsage { voice_mode: CenaVoiceMode; completed: boolean; pendingIntents?: number; entries: Cena95MeasuredEntry[] }
/** Unidades reais + tarifa confirmada continuam diferentes de uma fatura emitida pelo fornecedor. */
export function actualCena95Cost(usage: Cena95ActualUsage) {
  if (!['narrated', 'talking'].includes(usage.voice_mode) || !Array.isArray(usage.entries)) throw new Error('cena95_actual_bad_usage')
  const missing: string[] = [], seen = new Set<string>(), valid: Cena95MeasuredEntry[] = []
  if (usage.completed !== true) missing.push('pipeline_not_complete')
  const pending = usage.pendingIntents ?? 0
  if (!Number.isInteger(pending) || pending < 0 || pending > 0) missing.push('pending_or_unknown_intents')
  for (const item of usage.entries) {
    if (!item.id || seen.has(item.id)) throw new Error('cena95_actual_duplicate_or_missing_id')
    seen.add(item.id)
    if (!CENA95_ACTUAL_COMPONENTS.includes(item.component)) throw new Error('cena95_actual_unknown_component')
    const measured = Number.isFinite(item.quantity) && item.quantity >= 0 && !!item.measurementSource && /^\d{4}-\d{2}-\d{2}T/u.test(item.measuredAt)
    const tariff = Number.isFinite(item.unitUsd) && item.unitUsd > 0 && !!item.tariffSource && item.tariffConfirmed === true && item.tariffBasis === 'confirmed_account'
    if (!measured) missing.push(item.component + ':units_unmeasured')
    if (!tariff) missing.push(item.component + ':tariff_unconfirmed')
    if (measured && tariff) valid.push(item)
  }
  for (const component of CENA95_ACTUAL_COMPONENTS) {
    if (component === 'narrated_voice' && usage.voice_mode === 'talking') continue
    if (!usage.entries.some(item => item.component === component)) missing.push(component)
  }
  const partialMeasuredUsd = r6(valid.reduce((sum, item) => sum + item.quantity * item.unitUsd, 0))
  return { actualTotalUsd: missing.length ? null : partialMeasuredUsd, partialMeasuredUsd, missing: [...new Set(missing)], invoicedUsd: null, basis: 'measured_units_and_confirmed_tariffs_not_invoice' as const }
}
