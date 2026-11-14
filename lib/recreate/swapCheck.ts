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
//      graça e determinístico; vão ao modelo como data: URL. Lidos por import DINÂMICO de node:fs (importar este módulo não
//      puxa nada de Node; o next.config.js rastreia a pasta em toda rota que liquida clipe);
//   3. juiz de visão: o gpt-4o da casa (AI_TEXT_MODELS.writer), comparando ATRIBUTOS VISÍVEIS (cabelo, barba, tom de pele,
//      formato do rosto, óculos) entre a pessoa do quadro A e a do quadro B — nunca identificando ninguém. Roupa e cenário
//      são IGUAIS por construção e NÃO contam. A DECISÃO é código (decideSwap): "mesma pessoa" sem nenhum atributo do rosto
//      igual, ou com algum diferente, é incerto — nunca estorno.
// Regra: alguma pessoa esperada continua a do vídeo-base → falha + estorno (todas = unchanged; só uma de duas = partial: o
// cliente pagou pelas duas). Todas trocadas → entrega. Checagem que falha → ENTREGA como "unverified", com o motivo
// normalizado (refusal | null_answer | invalid_json | timeout | frames_unavailable | base_frames_unavailable | http_error |
// config) no evento recreate_swap_check.
// Custo por checagem: ~US$ 0,005 de quadros + ~US$ 0,015-0,02 de visão (4 quadros "high" + 1-2 fotos). Tempo: teto de 40 s.
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { usdFromUsage } from '@/lib/regua95/coherenceV2'
import { FAL_NTH_FRAME_MODEL, FAL_USD_PER_COMPUTE_SECOND, PIXEL_MODEL_RATES } from '@/lib/regua95/pixelScore'
import { RECREATE_CHECK_FRAMES, RECREATE_FORMATS, type RecreateFormat } from './formats'
import { RECREATE_MODEL, RECREATE_PROVIDER_ORIGIN } from './generation'
import { catalogoNoSeedance25, KLING4_EDIT_MODEL, metaPorUrl, SEEDANCE25_MODEL, SEU_VIDEO_PASTA } from './seuVideo' // KINEO-RECREATE-SEU-VIDEO-1311 · KINEO-RECREATE-KLING4-1311

export type SwapCheckResult = 'swapped' | 'unchanged' | 'partial' | 'unverified'
export type UnverifiedReason = 'refusal' | 'null_answer' | 'invalid_json' | 'timeout' | 'frames_unavailable' | 'base_frames_unavailable' | 'http_error' | 'config'
export type SwapPerson = { person: number; same_as_base: boolean | null; matches_photo: boolean | null; note: string }
export interface SwapVerdict {
  result: SwapCheckResult
  /** short machine reason: all_swapped, all_kept, 1_of_2_kept, vision_uncertain, vision_failed, … */
  reason: string
  /** only when result = 'unverified': the normalized cause the CEO session reads after deploy */
  unverified_reason: UnverifiedReason | null
  format: string | null
  persons: SwapPerson[]
  model: string | null
  usd: number
  ms: number
}

export const RECREATE_SWAP_CHECK_EVENT = 'recreate_swap_check'
/** failure_reason written when the result kept the base person(s). The status route maps both to 'not_swapped'. */
export const RECREATE_NOT_SWAPPED = { unchanged: 'swap_unchanged', partial: 'swap_partial' } as const
export const isRecreateNotSwappedReason = (reason: unknown) => reason === RECREATE_NOT_SWAPPED.unchanged || reason === RECREATE_NOT_SWAPPED.partial
/** Check lock kept in clips.failure_reason while status='processing' (no new column): one actor checks; stale after 2 min. */
export const SWAP_CHECK_LOCK_PREFIX = 'swapcheck_'
export const SWAP_CHECK_LOCK_STALE_MS = 120_000
/** Whole check (frames + vision) must fit the 60 s status route. Over budget = unverified (delivered). */
export const SWAP_CHECK_BUDGET_MS = 40_000
export const SWAP_CHECK_FRAMES_TIMEOUT_MS = 18_000
export const SWAP_CHECK_VISION_TIMEOUT_MS = 20_000
export const SWAP_CHECK_MODEL_DEFAULT: string = AI_TEXT_MODELS.writer
/** Facial attributes the vision judge compares. Clothing and scene are identical by construction and never count. */
export const SWAP_FACE_ATTRIBUTES = ['hair_color', 'hair_length', 'hair_texture', 'beard', 'skin_tone', 'face_shape', 'glasses'] as const

/** 'swapcheck_<13-digit ms>[_nonce]' — lexicographic order of the digits = time order (stale comparison in SQL). */
export const swapCheckLock = (now: number, nonce?: string) => SWAP_CHECK_LOCK_PREFIX + String(Math.max(0, Math.floor(now))).padStart(13, '0') + (nonce ? '_' + nonce : '')
/** Another actor holds a still-valid check lock on this row. */
export function swapCheckBusy(failureReason: string | null | undefined, now: number): boolean {
  const m = typeof failureReason === 'string' ? /^swapcheck_(\d{13})/.exec(failureReason) : null
  return !!m && now - Number(m[1]) < SWAP_CHECK_LOCK_STALE_MS
}

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

const yesNo = (x: unknown): boolean | null => (x === 'yes' || x === true ? true : x === 'no' || x === false ? false : null)

/**
 * One person's answer → booleans, with the code rule on top of the model: "same person" counts only when at least one
 * facial attribute was seen as the same and none as different; "different person" only when at least one facial attribute
 * differs. Anything else (all unclear, only clothing/scene, contradictions) is null = uncertain.
 */
export function readPerson(r: Record<string, unknown> | undefined, k: number): SwapPerson {
  const attrs = r?.base_vs_result && typeof r.base_vs_result === 'object' ? (r.base_vs_result as Record<string, unknown>) : {}
  const same = SWAP_FACE_ATTRIBUTES.filter(a => attrs[a] === 'same').length
  const diff = SWAP_FACE_ATTRIBUTES.filter(a => attrs[a] === 'different').length
  const said = yesNo(r?.same_person)
  const sameAsBase = said === true ? (same > 0 && diff === 0 ? true : null) : said === false ? (diff > 0 ? false : null) : null
  return { person: k, same_as_base: sameAsBase, matches_photo: yesNo(r?.result_vs_photo), note: typeof r?.note === 'string' ? r.note.slice(0, 120) : '' }
}

/** The DECISION (code, not the model): any expected person still the base person → refund; all replaced → deliver. */
// KINEO-RECREATE-KLING-NAO-TROCOU-1311 [CEO 13/11 22:46, item B] — o Kling 4.0 edição MANTÉM a cena (roupa, cenário, enquadramento): ali "a
// mesma pessoa da base" já é a prova de que não trocou, mesmo quando o juiz também diz "parece a foto" (rosto parecido com o da foto na mesma
// roupa). Caso real: clip 19e29401 saiu unverified (same_as_base true + matches_photo true), entregou e cobrou 40 créditos sem trocar.
// Com `cenaMantida`, same_as_base true = mantida (unchanged/partial → falha + estorno). Sem a opção, a regra é byte a byte a de antes.
export function decideSwap(parsed: unknown, slots: number, opts: { cenaMantida?: boolean } = {}): { result: SwapCheckResult; reason: string; persons: SwapPerson[] } {
  const raw = parsed && typeof parsed === 'object' && Array.isArray((parsed as { persons?: unknown }).persons) ? (parsed as { persons: unknown[] }).persons : []
  const persons: SwapPerson[] = []
  for (let k = 1; k <= slots; k++) {
    const r = raw.find(p => p && typeof p === 'object' && (p as { person?: unknown }).person === k) as Record<string, unknown> | undefined
    persons.push(readPerson(r, k))
  }
  if (slots < 1 || raw.length === 0) return { result: 'unverified', reason: 'vision_incomplete', persons }
  // Same as base AND like the photo is a contradiction: that person's answer is unknown, never a verdict.
  const kept = persons.filter(p => p.same_as_base === true && (opts.cenaMantida === true || p.matches_photo !== true)).length // KINEO-RECREATE-KLING-NAO-TROCOU-1311
  const replaced = persons.filter(p => p.same_as_base === false).length
  if (kept === slots) return { result: 'unchanged', reason: 'all_kept', persons }
  if (kept > 0) return { result: 'partial', reason: `${kept}_of_${slots}_kept`, persons }
  if (replaced === slots) return { result: 'swapped', reason: 'all_swapped', persons }
  return { result: 'unverified', reason: 'vision_uncertain', persons }
}

type Image = { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' } }
/** Exported for the guardian: base frames, result frames, then one reference photo per person, in this order. */
export function buildSwapCheckMessages(slots: number, base: [string, string], result: [string, string], photos: string[], subject?: string, redrawn = false) { // KINEO-RECREATE-SEU-VIDEO-1311 — + redrawn
  const attrs = SWAP_FACE_ATTRIBUTES.map(a => `"${a}": "same"|"different"|"unclear"`).join(', ')
  let system = // KINEO-RECREATE-SEU-VIDEO-1311 — era: const system =
    'You are a video quality checker comparing VISIBLE APPEARANCE in still frames. Do not identify anyone, do not name anyone and do not ' +
    'guess who anyone is: only compare how the depicted people look. ' +
    'A template video was edited so that each depicted person should now look like the person in a customer reference photo. Sometimes the ' +
    'edit silently fails and the frames still show the ORIGINAL appearance. ' +
    'IMPORTANT: clothing, accessories other than glasses, pose, background, lighting, camera and motion are IDENTICAL between template and edit ' +
    'BY CONSTRUCTION, so they are NOT evidence that it is the same depicted person. Judge only face and head attributes: hair colour, hair ' +
    'length, hair texture, beard, skin tone, face shape, glasses. ' +
    `Reply ONLY with JSON: {"persons":[{"person": 1-based index, "base_vs_result": {${attrs}}, "same_person": "yes"|"no"|"uncertain", ` +
    '"result_vs_photo": "yes"|"no"|"uncertain", "note": "max 15 words, attributes only"}]}. ' +
    '"same_person" answers: is the person depicted in the RESULT frames visually the same depicted person as in the TEMPLATE frames? ' +
    '"result_vs_photo" answers: does the person in the RESULT frames visually resemble that person\'s reference photo? Use "uncertain" when the face is too small or hidden.'
  // KINEO-RECREATE-SEU-VIDEO-1311 — o Seedance 2.5 REDESENHA a cena (corredor e enquadramento mudam): roupa e cenário deixam de ser iguais
  // "por construção"; continuam sem contar. Sem redrawn, o texto é byte a byte o de antes.
  if (redrawn) system = system.replace(/IMPORTANT: clothing[^]*?BY CONSTRUCTION, so they are NOT evidence that it is the same depicted person\./, 'IMPORTANT: this edit REDRAWS the whole scene, so clothing, background, lighting, framing, camera and pose may differ between template and edit; they are NOT evidence either way.')
  // KINEO-RECREATE-ELEVADOR-1011 — a format that replaces one person of several: compare ONLY that person, ignore the others.
  const who =slots === 1 && subject ? `There is 1 person to compare: ${subject} in the TEMPLATE frames. Other people in the frames were NOT meant to change: ignore them completely.` : slots === 1 ? 'There is 1 person to compare.' : `There are ${slots} people to compare. Person 1 is the LEFTMOST person in the TEMPLATE frames, person ${slots} the RIGHTMOST.`
  const text = [
    who,
    'Images, in order: TEMPLATE frame A and TEMPLATE frame B (before the edit); RESULT frame A and RESULT frame B (the edited video at the same moments);',
    `then ${photos.map((_, i) => `the REFERENCE PHOTO for person ${i + 1}`).join(', ')}.`,
    'For each person, first fill base_vs_result attribute by attribute (template person vs result person), then answer same_person and result_vs_photo.',
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

type Timed<T> = { ok: true; value: T } | { ok: false; timeout: boolean }
async function timed<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<Timed<T>> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try { return { ok: true, value: await run(ctrl.signal) } } catch { return { ok: false, timeout: ctrl.signal.aborted } } finally { clearTimeout(timer) }
}

/** Result frames 84 and 168 from the provider MP4 (fal, synchronous). Never throws. */
export async function extractCheckFrames(videoUrl: string, opts: SwapCheckOpts = {}, interval: number = RECREATE_CHECK_FRAMES[0]): Promise<{ frames: [string, string]; usd: number } | { frames: null; why: UnverifiedReason }> { // KINEO-RECREATE-SEU-VIDEO-1311 — + interval (o Seedance e o vídeo do cliente não são 24 fps fixos)
  const key = opts.falKey ?? process.env.FAL_KEY ?? process.env.FAL_API_KEY
  if (!key || !/^https:\/\//.test(videoUrl)) return { frames: null, why: 'config' }
  const started = Date.now()
  const got = await timed(SWAP_CHECK_FRAMES_TIMEOUT_MS, async signal => {
    const res = await (opts.fetchImpl ?? fetch)(`https://fal.run/${FAL_NTH_FRAME_MODEL}`, {
      method: 'POST', signal,
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: videoUrl, frame_interval: interval, max_frames: 3, output_format: 'jpg', quality: 85 }), // KINEO-RECREATE-SEU-VIDEO-1311 — era: frame_interval: RECREATE_CHECK_FRAMES[0]
    })
    if (!res.ok) return null
    const data = (await res.json()) as { images?: Array<{ url?: unknown }> }
    return Array.isArray(data.images) ? data.images.map(i => (typeof i?.url === 'string' ? i.url : '')) : null
  })
  if (!got.ok) return { frames: null, why: got.timeout ? 'timeout' : 'frames_unavailable' }
  const images = got.value
  if (!images || images.length < 3 || !images[1] || !images[2]) return { frames: null, why: 'frames_unavailable' }
  return { frames: [images[1], images[2]], usd: ((Date.now() - started) / 1000) * FAL_USD_PER_COMPUTE_SECOND }
}

/** Base frames from the repo. node:fs is imported HERE (dynamic), so importing this module pulls nothing from Node. */
export async function baseCheckFrames(format: RecreateFormat, opts: SwapCheckOpts = {}): Promise<[string, string] | null> {
  if (!format.checkFrames) return null
  try {
    const read = opts.readFileImpl ?? (async (file: string) => (await import('node:fs/promises')).readFile(file))
    const files = [1, 2].map(n => `${process.cwd()}/lib/recreate/assets/check/${format.id}-${n}.jpg`)
    const bytes = await Promise.all(files.map(f => read(f)))
    if (bytes.some(b => !b || b.length < 2000)) return null
    return [`data:image/jpeg;base64,${bytes[0].toString('base64')}`, `data:image/jpeg;base64,${bytes[1].toString('base64')}`]
  } catch {
    return null
  }
}

/** OpenAI answer → parsed JSON or the normalized reason it is unusable. */
export function readVisionAnswer(data: unknown): { parsed: unknown } | { why: UnverifiedReason } {
  const msg = (data as { choices?: Array<{ message?: { content?: unknown; refusal?: unknown } }> })?.choices?.[0]?.message
  if (typeof msg?.refusal === 'string' && msg.refusal.trim()) return { why: 'refusal' }
  const content = typeof msg?.content === 'string' ? msg.content.trim() : ''
  if (!content) return { why: 'null_answer' }
  try {
    return { parsed: JSON.parse(content) as unknown }
  } catch {
    return { why: /\b(sorry|can['’]?t|cannot|unable|not able)\b/i.test(content) ? 'refusal' : 'invalid_json' }
  }
}

/**
 * The whole check for one delivered Recreate clip. NEVER throws and never exceeds the budget: any failure is 'unverified'
 * (the caller delivers). Only 'unchanged' and 'partial' make the caller fail + refund.
 */
// ═══ KINEO-RECREATE-SEU-VIDEO-1311 [CEO 13/11: "o motor pode gerar sem trocar e sem dar erro… a trava 'não trocou' tem de rodar também
// neste caminho, com estorno"] — a mesma trava no Seedance 2.5: o Recreate "com o seu vídeo" e os 3 formatos do catálogo da Entrega C.
// Diferenças: (1) o Seedance REDESENHA a cena, então o juiz é avisado de que roupa e cenário mudam e não contam (redrawn); (2) no "seu
// vídeo" os quadros-base vêm do PRÓPRIO vídeo do cliente (mesmo extrator da fal), a 35% e 70% da duração; (3) o número do quadro sai do
// fps real de cada vídeo (lido do cabeçalho por Range). A decisão (decideSwap) e o estorno (clipFlow) são os mesmos.
export const usaTravaNaoTrocou = (model: unknown): boolean => model === RECREATE_MODEL || model === SEEDANCE25_MODEL || model === KLING4_EDIT_MODEL // KINEO-RECREATE-KLING4-1311 — + Kling 4.0 edição
export const SEU_VIDEO_SUJEITO_CHECAGEM = 'the main person (the largest and most central person)'
export type SwapRowContext = { formatId: string; format: RecreateFormat | null; photos: string[]; slots: number; subject?: string; baseVideoUrl: string | null; redrawn: boolean }
/** Linha → o que a trava precisa (Recast como antes; Seedance: catálogo da Entrega C ou o vídeo do cliente no nosso bucket). */
export function swapRowContext(row: { model: string; fingerprint: string }): SwapRowContext | null {
  const recast = recreateRowContext(row)
  if (recast) return { formatId: recast.format.id, format: recast.format, photos: recast.photos, slots: recast.format.photoSlots, subject: recast.format.swapSubject, baseVideoUrl: null, redrawn: false }
  // KINEO-RECREATE-KLING4-1311 — o Kling 4.0 edição MANTÉM a cena: quadros-base do próprio vídeo do cliente, sem o aviso de cena redesenhada.
  if (row.model === KLING4_EDIT_MODEL) {
    try {
      const parsed: unknown = JSON.parse(row.fingerprint)
      if (!Array.isArray(parsed) || parsed[1] !== KLING4_EDIT_MODEL || !parsed[2] || typeof parsed[2] !== 'object') return null
      const input = parsed[2] as Record<string, unknown>
      const video = typeof input.video_url === 'string' ? input.video_url : ''
      const photos = Array.isArray(input.image_urls) ? input.image_urls.filter((u): u is string => typeof u === 'string' && /^https:\/\//.test(u)) : []
      if (photos.length < 1 || photos.length > 3) return null
      if (!new RegExp(`^https://[^/]+/storage/v1/object/public/renders/${SEU_VIDEO_PASTA}/[0-9a-f-]{36}/[0-9a-f-]{36}\\.(?:mp4|mov)$`).test(video)) return null
      return { formatId: 'seu-video', format: null, photos, slots: photos.length, subject: photos.length === 1 ? SEU_VIDEO_SUJEITO_CHECAGEM : undefined, baseVideoUrl: video, redrawn: false }
    } catch {
      return null
    }
  }
  if (row.model !== SEEDANCE25_MODEL) return null
  try {
    const parsed: unknown = JSON.parse(row.fingerprint)
    if (!Array.isArray(parsed) || parsed[1] !== SEEDANCE25_MODEL || !parsed[2] || typeof parsed[2] !== 'object') return null
    const input = parsed[2] as Record<string, unknown>
    const video = Array.isArray(input.video_urls) && typeof input.video_urls[0] === 'string' ? input.video_urls[0] : ''
    const photos = Array.isArray(input.image_urls) ? input.image_urls.filter((u): u is string => typeof u === 'string' && /^https:\/\//.test(u)) : []
    if (photos.length < 1 || photos.length > 3) return null
    const format = RECREATE_FORMATS.find(f => f.type === 'swap' && catalogoNoSeedance25(f.id) && RECREATE_PROVIDER_ORIGIN + f.preview === video) ?? null
    if (format) return photos.length === format.photoSlots ? { formatId: format.id, format, photos, slots: format.photoSlots, subject: format.swapSubject, baseVideoUrl: null, redrawn: true } : null
    if (!new RegExp(`^https://[^/]+/storage/v1/object/public/renders/${SEU_VIDEO_PASTA}/[0-9a-f-]{36}/[0-9a-f-]{36}\\.(?:mp4|mov)$`).test(video)) return null
    return { formatId: 'seu-video', format: null, photos, slots: photos.length, subject: photos.length === 1 ? SEU_VIDEO_SUJEITO_CHECAGEM : undefined, baseVideoUrl: video, redrawn: true }
  } catch {
    return null
  }
}
/** O intervalo do extrator (quadros 0, n e 2n) para cair em `segundos` no fps real do vídeo. */
export const intervaloPara = (segundos: number, fps: number | null | undefined) => Math.max(1, Math.round(segundos * (typeof fps === 'number' && fps > 0 ? fps : 24)))
type QuadrosBase = [string, string] | Awaited<ReturnType<typeof extractCheckFrames>> | null

export async function runSwapCheck(row: { model: string; fingerprint: string }, providerVideoUrl: string, opts: SwapCheckOpts = {}): Promise<SwapVerdict> {
  const started = Date.now()
  const ctx = swapRowContext(row) // KINEO-RECREATE-SEU-VIDEO-1311 — era: recreateRowContext(row)
  const verdict = (result: SwapCheckResult, reason: string, extra: Partial<SwapVerdict> = {}): SwapVerdict => ({ result, reason, unverified_reason: null, format: ctx?.formatId ?? null, persons: [], model: null, usd: 0, ms: Date.now() - started, ...extra })
  const unverified = (why: UnverifiedReason, reason: string, extra: Partial<SwapVerdict> = {}) => verdict('unverified', reason, { ...extra, unverified_reason: why })
  if (!ctx) return unverified('config', 'row_context_unknown')
  const work = (async (): Promise<SwapVerdict> => {
    let baseRaw: QuadrosBase
    let result: Awaited<ReturnType<typeof extractCheckFrames>>
    if (!ctx.redrawn && !ctx.baseVideoUrl) { // KINEO-RECREATE-KLING4-1311 — era: if (!ctx.redrawn) (o Kling não redesenha, mas os quadros-base vêm do vídeo do cliente)
      [baseRaw, result] = await Promise.all([baseCheckFrames(ctx.format as RecreateFormat, opts), extractCheckFrames(providerVideoUrl, opts)])
    } else { // KINEO-RECREATE-SEU-VIDEO-1311 — Seedance: o momento de cada quadro pelo fps real; no "seu vídeo", os quadros-base do próprio original
      const f = opts.fetchImpl ?? fetch
      const [mb, mr] = await Promise.all([ctx.baseVideoUrl ? metaPorUrl(ctx.baseVideoUrl, f) : Promise.resolve(null), metaPorUrl(providerVideoUrl, f)])
      const t = ctx.baseVideoUrl ? (mb ? mb.segundos * 0.35 : 0) : RECREATE_CHECK_FRAMES[0] / 24
      ;[baseRaw, result] = await Promise.all([
        ctx.baseVideoUrl ? (mb && t > 0 ? extractCheckFrames(ctx.baseVideoUrl, opts, intervaloPara(t, mb.fps)) : Promise.resolve(null)) : baseCheckFrames(ctx.format as RecreateFormat, opts),
        extractCheckFrames(providerVideoUrl, opts, intervaloPara(t > 0 ? t : RECREATE_CHECK_FRAMES[0] / 24, mr?.fps)),
      ])
    }
    const base = !baseRaw ? null : Array.isArray(baseRaw) ? baseRaw : baseRaw.frames
    const baseUsd = baseRaw && !Array.isArray(baseRaw) && baseRaw.frames ? baseRaw.usd : 0
    const framesUsd = (result.frames ? result.usd : 0) + baseUsd // KINEO-RECREATE-SEU-VIDEO-1311 — era: result.frames ? result.usd : 0
    if (!base) return unverified('base_frames_unavailable', 'base_frames_unavailable', { usd: framesUsd })
    if (!result.frames) return unverified(result.why, 'result_frames_unavailable')
    const key = opts.apiKey ?? process.env.OPENAI_API_KEY
    if (!key) return unverified('config', 'vision_key_missing', { usd: framesUsd })
    const model = opts.model ?? process.env.RECREATE_SWAP_CHECK_MODEL ?? SWAP_CHECK_MODEL_DEFAULT
    const got = await timed(SWAP_CHECK_VISION_TIMEOUT_MS, async signal => {
      const res = await (opts.fetchImpl ?? fetch)('https://api.openai.com/v1/chat/completions', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, temperature: 0, max_tokens: 600, response_format: { type: 'json_object' }, messages: buildSwapCheckMessages(ctx.slots, base, result.frames, ctx.photos, ctx.subject, ctx.redrawn) }), // KINEO-RECREATE-SEU-VIDEO-1311 — era: (ctx.format.photoSlots, …, ctx.format.swapSubject)
      })
      if (!res.ok) return null
      return (await res.json()) as { usage?: { prompt_tokens?: number; completion_tokens?: number } }
    })
    if (!got.ok) return unverified(got.timeout ? 'timeout' : 'http_error', 'vision_failed', { model, usd: framesUsd })
    if (!got.value) return unverified('http_error', 'vision_failed', { model, usd: framesUsd })
    const usd = Math.round((framesUsd + usdFromUsage(got.value.usage, PIXEL_MODEL_RATES[model] ?? PIXEL_MODEL_RATES[AI_TEXT_MODELS.writer])) * 1e6) / 1e6
    const answer = readVisionAnswer(got.value)
    if ('why' in answer) return unverified(answer.why, 'vision_unusable', { model, usd })
    const decided = decideSwap(answer.parsed, ctx.slots, { cenaMantida: row.model === KLING4_EDIT_MODEL }) // KINEO-RECREATE-SEU-VIDEO-1311 — era: ctx.format.photoSlots · KINEO-RECREATE-KLING-NAO-TROCOU-1311 — no Kling, mesma pessoa = não trocou
    const extra = { persons: decided.persons, model, usd }
    return decided.result === 'unverified' ? unverified('null_answer', decided.reason, extra) : verdict(decided.result, decided.reason, extra)
  })().catch(() => unverified('http_error', 'check_error'))
  let timer: ReturnType<typeof setTimeout> | undefined
  const overBudget = new Promise<SwapVerdict>(resolve => { timer = setTimeout(() => resolve(unverified('timeout', 'check_timeout')), opts.budgetMs ?? SWAP_CHECK_BUDGET_MS) })
  try { return await Promise.race([work, overBudget]) } finally { clearTimeout(timer) }
}

// KINEO-RECREATE-ABRE-1011 — resíduo da revisão: a trava grava `failed` (com 0 estornado) ANTES de estornar. Se o processo morrer
// entre os dois passos, a linha fica failed com credits_refunded=0 e a varredura comum (só pending/processing) nunca volta nela.
// A varredura de estornos chama isto para essas linhas: o estorno é idempotente pela billing_reference (o RPC devolve > 0 só
// uma vez), e o valor só é gravado onde ainda está 0 — rodar de novo não estorna de novo.
export const SWAP_REFUND_SWEEP_REASONS = [RECREATE_NOT_SWAPPED.unchanged, RECREATE_NOT_SWAPPED.partial] as const
export type SwapRefundRow = { id: string; billing_reference: string; failure_reason: string | null; credits_refunded: number; status: string }
export async function sweepSwapRefunds(
  rows: SwapRefundRow[],
  deps: { refund(billingReference: string): Promise<number>; setRefunded(id: string, refunded: number): Promise<void> },
): Promise<{ scanned: number; refunded: number; creditsReturned: number }> {
  const out = { scanned: 0, refunded: 0, creditsReturned: 0 }
  for (const row of rows) {
    if (row.status !== 'failed' || row.credits_refunded !== 0 || !isRecreateNotSwappedReason(row.failure_reason)) continue
    out.scanned += 1
    const amount = await deps.refund(row.billing_reference)
    if (amount > 0) {
      await deps.setRefunded(row.id, amount)
      out.refunded += 1
      out.creditsReturned += amount
    }
  }
  return out
}
