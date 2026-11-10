// KINEO-RECREATE-TRAVA-1011 [fundador 10/11: "tem que fazer tudo funcionar agora. Sem erros"] — trava "não trocou".
//
// O defeito (docs/RECREATE-CANARIO-2026-11-10.md): quando o minimax/h3-max/recast não consegue trocar a pessoa, ele devolve o
// vídeo-base ORIGINAL com status de sucesso, sem avisar (Outfit Morph 0 de 4; Elevator: a mulher 0 de 2). Sem esta trava o
// produto cobraria 40 créditos por um vídeo igual ao da vitrine.
//
// Como olha DENTRO do vídeo sem ffmpeg no servidor — reaproveitando o que a régua 95 já usa (lib/regua95/pixelScore.ts):
//   1. quadros do RESULTADO: fal `fal-ai/workflow-utilities/extract-nth-frame` (síncrono, fal.run; US$ 0,001 por segundo de
//      computação), frame_interval 84 → quadros 0, 84 e 168 (0 s, 3,5 s e 7,0 s a 24 fps); usamos o 84 e o 168;
//   2. quadros do VÍDEO-BASE nos MESMOS números: pré-gerados com ffmpeg na casa (lib/recreate/assets/check/<id>-1|2.jpg) — de
//      graça e determinístico; vão ao modelo como data: URL;
//   3. juiz de visão: o gpt-4o da casa (AI_TEXT_MODELS.writer, o mesmo da régua), saída JSON: por pessoa, "é a MESMA do quadro-
//      base?" e "parece a foto de referência?". A DECISÃO é código (decideSwap), não confiança no modelo.
// Regra: alguma pessoa esperada continua a do vídeo-base → falha + estorno (todas = unchanged; só uma de duas = partial: o
// cliente pagou pelas duas). Todas trocadas → entrega. Checagem que falha (sem chave, timeout, quadro ausente, resposta
// incompleta ou contraditória) → ENTREGA como "unverified": nunca estorna às cegas nem reprova vídeo bom.
// Custo por checagem: ~US$ 0,005 de quadros + ~US$ 0,015-0,02 de visão (4 quadros "high" + 1-2 fotos). Tempo: teto de 40 s.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { usdFromUsage } from '@/lib/regua95/coherenceV2'
import { FAL_NTH_FRAME_MODEL, FAL_USD_PER_COMPUTE_SECOND, PIXEL_MODEL_RATES } from '@/lib/regua95/pixelScore'
import { RECREATE_CHECK_FRAMES, RECREATE_FORMATS, type RecreateFormat } from './formats'
import { RECREATE_MODEL, RECREATE_PROVIDER_ORIGIN } from './generation'

export type SwapCheckResult = 'swapped' | 'unchanged' | 'partial' | 'unverified'
export type SwapPerson = { person: number; same_as_base: boolean | null; matches_photo: boolean | null; note: string }
export interface SwapVerdict {
  result: SwapCheckResult
  /** short machine reason: e.g. all_swapped, all_kept, 1_of_2_kept, vision_failed, frames_unavailable */
  reason: string
  format: string | null
  persons: SwapPerson[]
  model: string | null
  usd: number
  ms: number
}

export const RECREATE_SWAP_CHECK_EVENT = 'recreate_swap_check'
/** failure_reason written by markFailed when the result kept the base person(s). The status route maps both to 'not_swapped'. */
export const RECREATE_NOT_SWAPPED = { unchanged: 'swap_unchanged', partial: 'swap_partial' } as const
export const isRecreateNotSwappedReason = (reason: unknown) => reason === RECREATE_NOT_SWAPPED.unchanged || reason === RECREATE_NOT_SWAPPED.partial
/** Check lock kept in clips.failure_reason while status='processing' (no new column): one actor checks; stale after 2 min. */
export const SWAP_CHECK_LOCK_PREFIX = 'swapcheck_'
export const SWAP_CHECK_LOCK_STALE_MS = 120_000
/** Whole check (frames + vision) must fit the 60 s status route after persist. Over budget = unverified (delivered). */
export const SWAP_CHECK_BUDGET_MS = 40_000
export const SWAP_CHECK_FRAMES_TIMEOUT_MS = 18_000
export const SWAP_CHECK_VISION_TIMEOUT_MS = 20_000
export const SWAP_CHECK_MODEL_DEFAULT: string = AI_TEXT_MODELS.writer

export const swapCheckLock = (now: number) => SWAP_CHECK_LOCK_PREFIX + String(Math.max(0, Math.floor(now))).padStart(13, '0')

/** Recreate row → its catalog format and reference photos, read from the fingerprint submitClip wrote (no new column). */
export function recreateRowContext(row: { model: string; fingerprint: string }): { format: RecreateFormat; photos: string[] } | null {
  if (row.model !== RECREATE_MODEL) return null
  try {
    const parsed: unknown = JSON.parse(row.fingerprint)
    if (!Array.isArray(parsed) || parsed[1] !== RECREATE_MODEL || !parsed[2] || typeof parsed[2] !== 'object') return null
    const input = parsed[2] as Record<string, unknown>
    const format = RECREATE_FORMATS.find(f => f.type === 'swap' && RECREATE_PROVIDER_ORIGIN + f.preview === input.video_url) ?? null
    const photos = Array.isArray(input.reference_image_urls) ? input.reference_image_urls.filter((u): u is string => typeof u === 'string' && /^https:\/\//.test(u)) : []
    return format && photos.length === format.photoSlots ? { format, photos } : null
  } catch {
    return null
  }
}

const bool = (x: unknown): boolean | null => (x === true ? true : x === false ? false : null)

/** The DECISION (code, not the model): any expected person still the base person → refund; all replaced → deliver. */
export function decideSwap(parsed: unknown, slots: number): { result: SwapCheckResult; reason: string; persons: SwapPerson[] } {
  const raw = parsed && typeof parsed === 'object' && Array.isArray((parsed as { persons?: unknown }).persons) ? (parsed as { persons: unknown[] }).persons : []
  const persons: SwapPerson[] = []
  for (let k = 1; k <= slots; k++) {
    const r = raw.find(p => p && typeof p === 'object' && (p as { person?: unknown }).person === k) as Record<string, unknown> | undefined
    persons.push({ person: k, same_as_base: bool(r?.same_as_base), matches_photo: bool(r?.matches_photo), note: typeof r?.note === 'string' ? r.note.slice(0, 120) : '' })
  }
  if (slots < 1 || raw.length === 0) return { result: 'unverified', reason: 'vision_incomplete', persons }
  // Same as base AND like the photo is a contradiction: that person's answer is unknown, never a verdict.
  const kept = persons.filter(p => p.same_as_base === true && p.matches_photo !== true).length
  const replaced = persons.filter(p => p.same_as_base === false).length
  if (kept === slots) return { result: 'unchanged', reason: 'all_kept', persons }
  if (kept > 0) return { result: 'partial', reason: `${kept}_of_${slots}_kept`, persons }
  if (replaced === slots) return { result: 'swapped', reason: 'all_swapped', persons }
  return { result: 'unverified', reason: 'vision_uncertain', persons }
}

type Image = { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' } }
/** Exported for the guardian: base frames, result frames, then one reference photo per person, in this order. */
export function buildSwapCheckMessages(slots: number, base: [string, string], result: [string, string], photos: string[]) {
  const system =
    'You verify an AI face-swap delivery. A template video had its people replaced by the people in customer reference photos. ' +
    'Sometimes the swap silently fails and the ORIGINAL person stays. Judge face identity only: ignore expression, pose, motion blur, ' +
    'small lighting/colour shifts and clothing (clothing is kept on purpose). Hair and face shape count as identity. ' +
    'Reply ONLY with JSON: {"persons":[{"person": 1-based index, "same_as_base": true|false|null, "matches_photo": true|false|null, "note": "max 15 words"}]}. ' +
    'Use null only when that person is not visible enough in the RESULT frames to decide.'
  const who = slots === 1 ? 'There is 1 person to replace.' : `There are ${slots} people to replace. Person 1 is the LEFTMOST person in the BASE frames, person ${slots} the RIGHTMOST.`
  const text = [
    who,
    'Images, in order: BASE frame A and BASE frame B (the original template, before the swap); RESULT frame A and RESULT frame B (the delivered video at the same moments);',
    `then ${photos.length === 1 ? 'the REFERENCE PHOTO of person 1' : photos.map((_, i) => `the REFERENCE PHOTO of person ${i + 1}`).join(', ')}.`,
    'For EACH person answer: same_as_base = is the person in the RESULT frames the same individual as in the BASE frames? matches_photo = does the RESULT person look like that person\'s reference photo?',
  ].join('\n')
  const img = (url: string, detail: 'high' | 'low'): Image => ({ type: 'image_url', image_url: { url, detail } })
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: [{ type: 'text' as const, text }, ...base.map(u => img(u, 'high')), ...result.map(u => img(u, 'high')), ...photos.map(u => img(u, 'low'))] },
  ]
}

export interface SwapCheckOpts {
  fetchImpl?: typeof fetch
  readFileImpl?: (file: string) => Promise<Buffer>
  falKey?: string
  apiKey?: string
  model?: string
  budgetMs?: number
}

async function timed<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try { return await run(ctrl.signal) } catch { return null } finally { clearTimeout(timer) }
}

/** Result frames 84 and 168 from the provider MP4 (fal, synchronous). null when unavailable. Never throws. */
export async function extractCheckFrames(videoUrl: string, opts: SwapCheckOpts = {}): Promise<{ frames: [string, string]; usd: number } | null> {
  const key = opts.falKey ?? process.env.FAL_KEY ?? process.env.FAL_API_KEY
  if (!key || !/^https:\/\//.test(videoUrl)) return null
  const started = Date.now()
  const images = await timed(SWAP_CHECK_FRAMES_TIMEOUT_MS, async signal => {
    const res = await (opts.fetchImpl ?? fetch)(`https://fal.run/${FAL_NTH_FRAME_MODEL}`, {
      method: 'POST', signal,
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: videoUrl, frame_interval: RECREATE_CHECK_FRAMES[0], max_frames: 3, output_format: 'jpg', quality: 85 }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { images?: Array<{ url?: unknown }> }
    return Array.isArray(data.images) ? data.images.map(i => (typeof i?.url === 'string' ? i.url : '')) : null
  })
  if (!images || images.length < 3 || !images[1] || !images[2]) return null
  return { frames: [images[1], images[2]], usd: ((Date.now() - started) / 1000) * FAL_USD_PER_COMPUTE_SECOND }
}

/** Base frames from the repo (traced into every settling route by next.config.js). null when unreadable. */
export async function baseCheckFrames(format: RecreateFormat, opts: SwapCheckOpts = {}): Promise<[string, string] | null> {
  if (!format.checkFrames) return null
  try {
    const read = opts.readFileImpl ?? ((file: string) => readFile(file))
    const files = [1, 2].map(n => path.join(process.cwd(), 'lib/recreate/assets/check', `${format.id}-${n}.jpg`))
    const bytes = await Promise.all(files.map(f => read(f)))
    if (bytes.some(b => !b || b.length < 2000)) return null
    return [`data:image/jpeg;base64,${bytes[0].toString('base64')}`, `data:image/jpeg;base64,${bytes[1].toString('base64')}`]
  } catch {
    return null
  }
}

/**
 * The whole check for one delivered Recreate clip. NEVER throws and never exceeds the budget: any failure is 'unverified'
 * (the caller delivers). Only 'unchanged' and 'partial' make the caller fail + refund.
 */
export async function runSwapCheck(row: { model: string; fingerprint: string }, providerVideoUrl: string, opts: SwapCheckOpts = {}): Promise<SwapVerdict> {
  const started = Date.now()
  const ctx = recreateRowContext(row)
  const verdict = (result: SwapCheckResult, reason: string, extra: Partial<SwapVerdict> = {}): SwapVerdict => ({ result, reason, format: ctx?.format.id ?? null, persons: [], model: null, usd: 0, ms: Date.now() - started, ...extra })
  if (!ctx) return verdict('unverified', 'row_context_unknown')
  const work = (async (): Promise<SwapVerdict> => {
    const [base, result] = await Promise.all([baseCheckFrames(ctx.format, opts), extractCheckFrames(providerVideoUrl, opts)])
    if (!base) return verdict('unverified', 'base_frames_unavailable', { usd: result?.usd ?? 0 })
    if (!result) return verdict('unverified', 'result_frames_unavailable')
    const key = opts.apiKey ?? process.env.OPENAI_API_KEY
    if (!key) return verdict('unverified', 'vision_key_missing', { usd: result.usd })
    const model = opts.model ?? process.env.RECREATE_SWAP_CHECK_MODEL ?? SWAP_CHECK_MODEL_DEFAULT
    const answer = await timed(SWAP_CHECK_VISION_TIMEOUT_MS, async signal => {
      const res = await (opts.fetchImpl ?? fetch)('https://api.openai.com/v1/chat/completions', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, temperature: 0, max_tokens: 300, response_format: { type: 'json_object' }, messages: buildSwapCheckMessages(ctx.format.photoSlots, base, result.frames, ctx.photos) }),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
      return { parsed: JSON.parse(data.choices?.[0]?.message?.content ?? '') as unknown, usd: usdFromUsage(data.usage, PIXEL_MODEL_RATES[model] ?? PIXEL_MODEL_RATES[AI_TEXT_MODELS.writer]) }
    })
    if (!answer) return verdict('unverified', 'vision_failed', { model, usd: result.usd })
    const decided = decideSwap(answer.parsed, ctx.format.photoSlots)
    return verdict(decided.result, decided.reason, { persons: decided.persons, model, usd: Math.round((result.usd + answer.usd) * 1e6) / 1e6 })
  })().catch(() => verdict('unverified', 'check_error'))
  let timer: ReturnType<typeof setTimeout> | undefined
  const overBudget = new Promise<SwapVerdict>(resolve => { timer = setTimeout(() => resolve(verdict('unverified', 'check_timeout')), opts.budgetMs ?? SWAP_CHECK_BUDGET_MS) })
  try { return await Promise.race([work, overBudget]) } finally { clearTimeout(timer) }
}
