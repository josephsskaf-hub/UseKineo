// KINEO-META95-REGUA-1910 — NOTA DE PIXEL do vídeo MONTADO (a régua da meta 95 que olha a tela, não o texto).
//
// O juiz de coerência (v5 e v2) só lê texto: não vê legenda, rosto que troca, mão derretida, texto inventado, quadro preto,
// produto redesenhado. No diagnóstico de 19/10 o Dino que vira menino levou 95, e "no wreckage" narrado sobre um destroço
// passou com 80. Esta nota olha o MP4 FINAL — o que o cliente recebe — em TODOS os produtos (filmes de todos os motores,
// Ads v2, UGC/avatar, clipes).
//
// Como, sem ffmpeg no servidor (não há ffmpeg/sharp/canvas no package.json):
//   1. quadros: fal `fal-ai/workflow-utilities/extract-nth-frame` (US$ 0,001 por segundo de computação) — um quadro a cada
//      N, com N = duração × 24 fps / 8 (todos os renders de hoje saem a 24 fps; a 30 fps o passo cobre o vídeo inteiro do
//      mesmo jeito porque pedimos até 10 e escolhemos 8 espaçados). Reserva: `fal-ai/ffmpeg-api/extract-frame`
//      (first/middle/last — 3 quadros) quando o primeiro falha;
//   2. juiz de visão: gpt-4o com detail "low" (85 tokens por imagem), 2 leituras em paralelo e nota = média — medido no
//      calibrador de 19/10: US$ 0,015 por vídeo (as 2 leituras), estável entre rodadas (±4). O gpt-4o-mini (US$ 0,004) aprovava
//      quase tudo com 100 e não viu o Dino que vira menino em 2 de 3 rodadas; o gpt-4.1-mini "high" punia legenda em tudo.
//      REGUA95_PIXEL_MODEL troca o modelo sem mexer no código;
//   3. regras de CÓDIGO por cima do modelo (a nota nasce aqui, não da confiança no modelo): quadro quase preto pelo tamanho
//      do JPEG, rosto/mão deformada em 2+ quadros, personagem que troca, produto infiel (Ads), legenda ilegível.
// Custo alvo ≤ US$ 0,03 por vídeo: ~US$ 0,015 da visão + ~US$ 0,002–0,005 da fal (estimado pelo tempo; docs/REGUA-95-2026-10-19.md). Roda DEPOIS da entrega
// (cron /api/cron/regua-95); erro = sem nota, nunca exceção. KINEO-FILME15-PERFEITO-2610: o portão Seedance15 também
// chama esta régua antes de entregar; o chamador exige evidência completa e trata erro como falha com estorno.
import type { ProdutoRegua } from '@/lib/regua95/coherenceV2'
import { usdFromUsage } from '@/lib/regua95/coherenceV2'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { assessEvidence, inspectFrameEvidence, isScore, objectRecord, type EvidenceAssessment } from '@/lib/regua95/evidence'

export const PIXEL_SCORE_EVENT = 'pixel_score'
export const PIXEL_SCORE_VERSION = 'regua95_pixel_v1'
export const PIXEL_FRAMES = 8
/** Leituras do juiz de visão por vídeo (média). */
export const PIXEL_READINGS = 2
/** Modelo de visão padrão (calibrado em 19/10: docs/REGUA-95-2026-10-19.md); REGUA95_PIXEL_MODEL troca sem deploy de código. */
export const PIXEL_MODEL_DEFAULT: string = AI_TEXT_MODELS.writer // o id gpt-4o do registro (lib/aiModels.ts): o mesmo modelo, papel de juiz de visão
export const PIXEL_FPS_ASSUMED = 24
export const FAL_NTH_FRAME_MODEL = 'fal-ai/workflow-utilities/extract-nth-frame'
export const FAL_EXTRACT_FRAME_MODEL = 'fal-ai/ffmpeg-api/extract-frame'
/** JPEG de 1080×1920 a q80 com conteúdo pesa 60-150 KB; um quadro preto/vazio pesa poucos KB. */
export const NEAR_BLACK_JPEG_BYTES = 12_000
/** US$ por segundo de computação da fal (página do modelo). */
export const FAL_USD_PER_COMPUTE_SECOND = 0.001

export type Frame = { url: string; t: number | null; bytes: number | null }
export type PixelDetail = 'low' | 'high' | 'auto'
/** US$ por milhão de tokens (entrada/saída) dos modelos de visão aceitos (REGUA95_PIXEL_MODEL). */
export const PIXEL_MODEL_RATES: Record<string, { inPerM: number; outPerM: number }> = {
  [AI_TEXT_MODELS.utility]: { inPerM: 0.15, outPerM: 0.6 },
  [AI_TEXT_MODELS.writer]: { inPerM: 2.5, outPerM: 10 },
  [AI_TEXT_MODELS.research]: { inPerM: 0.4, outPerM: 1.6 },
}

/** Passo de quadros: duração × fps / PIXEL_FRAMES, entre 1 e 300 (limite da fal). */
export function frameIntervalFor(seconds: number | null | undefined, fps = PIXEL_FPS_ASSUMED): number {
  const s = typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? seconds : 15
  return Math.max(1, Math.min(300, Math.floor((s * fps) / PIXEL_FRAMES)))
}

/** k itens espaçados (primeiro e último incluídos) — de 10 quadros sobram 8 cobrindo o vídeo todo. */
export function pickEvenly<T>(items: T[], k: number): T[] {
  if (items.length <= k) return items.slice()
  const out: T[] = []
  for (let i = 0; i < k; i++) out.push(items[Math.round((i * (items.length - 1)) / (k - 1))])
  return out
}

type FalImage = { url?: unknown; file_size?: unknown }

/**
 * Quadros do MP4 final pela fal. Devolve null quando não deu (sem chave, HTTP != 200, sem imagens). Nunca lança.
 * `fetchImpl` injetável (guardião e calibrador).
 */
export async function extractFramesFal(
  videoUrl: string,
  seconds: number | null | undefined,
  opts?: { fetchImpl?: typeof fetch; falKey?: string; timeoutMs?: number; fps?: number; exactFrameTimes?: boolean },
): Promise<{ frames: Frame[]; via: 'nth_frame' | 'extract_frame'; ms: number; usd: number } | null> {
  const key = opts?.falKey ?? process.env.FAL_KEY ?? process.env.FAL_API_KEY
  if (!key || !videoUrl) return null
  const doFetch = opts?.fetchImpl ?? fetch
  const started = Date.now()
  const call = async (model: string, body: Record<string, unknown>): Promise<FalImage[] | null> => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 90_000)
    try {
      const res = await doFetch(`https://fal.run/${model}`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { images?: FalImage[] }
      return Array.isArray(data.images) ? data.images : null
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }
  // The free15 delivery gate knows the signed composition's frame rate. Keep
  // legacy sampling/timestamps unchanged when these optional fields are absent.
  const fps = typeof opts?.fps === 'number' && Number.isFinite(opts.fps) && opts.fps > 0 ? opts.fps : PIXEL_FPS_ASSUMED
  const interval = frameIntervalFor(seconds, fps)
  const nth = await call(FAL_NTH_FRAME_MODEL, { video_url: videoUrl, frame_interval: interval, max_frames: PIXEL_FRAMES + 2, output_format: 'jpg', quality: 80 })
  const asFrames = (imgs: FalImage[], tOf: (i: number) => number | null): Frame[] =>
    imgs
      .map((im, i) => ({ url: typeof im?.url === 'string' ? im.url : '', t: tOf(i), bytes: typeof im?.file_size === 'number' ? im.file_size : null }))
      .filter((f) => f.url)
  if (nth && nth.length > 0) {
    const all = asFrames(nth, (i) => opts?.exactFrameTimes ? (i * interval) / fps : Math.round(((i * interval) / fps) * 10) / 10)
    const ms = Date.now() - started
    return { frames: pickEvenly(all, PIXEL_FRAMES), via: 'nth_frame', ms, usd: (ms / 1000) * FAL_USD_PER_COMPUTE_SECOND }
  }
  // Reserva: 3 quadros (primeiro, meio, último).
  const tipos = ['first', 'middle', 'last'] as const
  const res3 = await Promise.all(tipos.map((frame_type) => call(FAL_EXTRACT_FRAME_MODEL, { video_url: videoUrl, frame_type })))
  const s = typeof seconds === 'number' && seconds > 0 ? seconds : null
  const frames: Frame[] = []
  res3.forEach((imgs, i) => {
    const im = imgs?.[0]
    if (im && typeof im.url === 'string') frames.push({ url: im.url, t: s == null ? null : i === 0 ? 0 : i === 1 ? opts?.exactFrameTimes ? s / 2 : Math.round(s * 5) / 10 : opts?.exactFrameTimes ? Math.max(0, Math.ceil(s * fps) - 1) / fps : s, bytes: typeof im.file_size === 'number' ? im.file_size : null })
  })
  if (frames.length === 0) return null
  const ms = Date.now() - started
  return { frames, via: 'extract_frame', ms, usd: (ms / 1000) * FAL_USD_PER_COMPUTE_SECOND * 3 }
}

/** O que o vídeo deveria mostrar — o "brief" do juiz de visão, por produto. */
export type PixelContext = {
  product: ProdutoRegua
  engine?: string | null
  /** o que a pessoa pediu (ideia original, brief do anúncio, prompt do clipe) */
  asked: string
  /** a fala do vídeo, se houver */
  narration?: string | null
  /** a fala por cena, em ordem (filmes) — o juiz casa quadro × fala pela ordem */
  spokenByScene?: string[] | null
  /** fotos reais do produto (Ads/UGC, até 3) para conferir fidelidade — o produto pode aparecer como QUALQUER uma delas */
  productPhotoUrls?: string[] | null
  /** língua da fala/legenda esperada (ex.: "pt", "en", "hi") */
  language?: string | null
  /** Opt-in from the free15 signed RenderScript, never inferred from the image. */
  expectedKineoWatermark?: boolean
}

export const PIXEL_ISSUES = ['subject_missing', 'deformed_face_or_hand', 'invented_text', 'near_black', 'repeated', 'caption_illegible', 'caption_broken', 'product_unfaithful', 'ugc_eyes_mouth_hands', 'off_topic'] as const
export type PixelIssue = (typeof PIXEL_ISSUES)[number]

export type PixelFrameVerdict = { i: number; t: number | null; subject: string; score: number; issues: PixelIssue[]; note: string }

export type PixelResult = EvidenceAssessment & {
  version: string
  score: number | null
  frames: PixelFrameVerdict[]
  /** Located defects from both readings, so averaging cannot lose the repair target. */
  defect_frames?: PixelFrameVerdict[]
  /** Extra evidence consumed only by the free15 gate; historical score fields stay unchanged. */
  gate_evidence?: { identity_changed: boolean; caption_illegible: boolean; caption_language_wrong: boolean }
  identity_consistent: boolean | null
  /** Located changes retained for the free15 pre-delivery repair; frame indices are 1-based. */
  identity_changes?: Array<{ from: number; to: number; what: string }>
  caption_present: boolean | null
  caption_legible: boolean | null
  caption_language_ok: boolean | null
  product_faithful: boolean | null
  caps: string[]
  cap_limit: number
  summary: string
  /** nota de cada leitura (a média é `score`) */
  readings: number[]
  frame_via: 'nth_frame' | 'extract_frame' | 'local' | null
  frame_count: number
  /** URLs dos quadros julgados (os da fal expiram em dias; data: URLs do calibrador não são gravados) */
  frame_urls: string[]
  model: string | null
  usd_frames: number
  usd_vision: number
  usd: number
  ms: number
}

const PRODUCT_RULES: Record<ProdutoRegua, string> = {
  filme:
    'This is a narrated short FILM. For each frame, check it shows the subject of the line being spoken around that moment (frames are in time order; scenes are in the same order as the spoken lines), with no deformed faces/hands, no invented readable text inside the image (burned-in captions at the bottom/middle are expected and are NOT invented text), not black, not a repeat of the previous frame. Recurring characters must stay the SAME (same species, age, face, clothes); a character turning into someone else is the worst defect.',
  ads:
    'This is a product AD. The REFERENCE PRODUCT PHOTOS (first images, if given) are the real product: in frames where the product appears, label, shape, color and logo must match one of them (redesigned, misspelled or melted packaging = product_unfaithful). Overlay text and captions should be legible and spelled right; no invented gibberish text.',
  ugc:
    'This is a UGC/avatar ad: a person talks to camera, usually holding the product. Check eyes (open, natural, looking right), mouth (natural, no melted teeth), hands (5 fingers, holding the product naturally) — any glitch = ugc_eyes_mouth_hands. If REFERENCE PRODUCT PHOTOS are given (first images), the product in hand must match one of them. The same person must stay the same across frames. The short caption/phrase at the TOP is part of this ad format (a short phrase, split over two lines or two blocks, small letters): it is never caption_broken; flag caption_illegible only when it truly cannot be read.', // KINEO-META95-UGC-1910 — o falso "legenda partida" do R3 (nota 9 do fundador levou 88)
  clipe:
    'This is a short AI CLIP / effect made from a prompt. Check each frame shows what the prompt asked, with no deformed faces/hands, no invented readable text, no black frames, and the same subject kept across frames.',
}

/** Mensagens do juiz de visão (conteúdo multimodal). Exportado para o guardião. */
export function buildPixelMessages(ctx: PixelContext, frames: Frame[], detail: PixelDetail = 'low') {
  const system =
    'You are a strict video QA reviewer measuring whether a delivered video is a 95+/100 video. You see frames sampled in time order from the FINAL MP4 the customer received. ' +
    PRODUCT_RULES[ctx.product] +
    ' CAPTIONS: burned-in captions are part of the product; flag caption_broken when a caption block is a single orphan word, ends on a preposition/article ("STRAIGHT AT", "GRIDS FOR"), cuts a phrase awkwardly, or covers the center of the subject; flag caption_illegible when it is hard to read (contrast, size, overlap). Text that is not a caption/overlay of the brief (random words, "UNTITLED", gibberish signage) is invented_text. ' +
    ' Score EACH frame 0-100 and be harsh: reserve 100 for frames a professional editor would ship untouched; 90-99 = tiny cosmetic flaw; 70-89 = a visible flaw (soft deformation, weak match to the line, awkward or hard-to-read caption); below 70 = a defect a viewer notices at once (wrong subject, melted hand/face, character changed, gibberish text, black frame, product redesigned). ' +
    `Issue codes (use only these): ${PIXEL_ISSUES.join(', ')}. ` +
    'First name the main subject of EACH frame in a few English words (species, age, look: e.g. "purple cartoon dinosaur", "human child in pajamas", "amber perfume bottle"), THEN compare those subjects across frames: a recurring character or product whose species/age/face/look changes is an identity change. ' +
    'Reply ONLY with JSON: {"frames":[{"i": frame index starting at 1, "subject": main subject in a few English words, "score": 0-100, "issues": [codes], "note": short Brazilian Portuguese note naming what you see (max 90 chars)}], ' +
    '"identity_changes": [{"from": frame i, "to": frame j, "what": short Brazilian Portuguese description}] (empty when none), "identity_consistent": true|false|null (null when no recurring character/product), "caption_present": true|false, "caption_legible": true|false|null, "caption_language_ok": true|false|null (does the caption script/language match the expected language), ' +
    '"product_faithful": true|false|null (null when not an ad or the product never shows), "summary": one sentence in Brazilian Portuguese (max 160 chars)}.'
  const refs = (ctx.productPhotoUrls ?? []).filter((u) => typeof u === 'string' && u).slice(0, 3)
  const lines: string[] = []
  lines.push(`PRODUCT: ${ctx.product}${ctx.engine ? ` (engine ${ctx.engine})` : ''}`)
  lines.push(`WHAT WAS ASKED:\n"""${String(ctx.asked ?? '').slice(0, 1500)}"""`)
  if (ctx.narration) lines.push(`NARRATION:\n"""${String(ctx.narration).slice(0, 1500)}"""`)
  if (ctx.spokenByScene && ctx.spokenByScene.length) lines.push(`SPOKEN LINE PER SCENE (in order): ${ctx.spokenByScene.map((s, i) => `[${i + 1}] ${String(s).replace(/\s+/g, ' ').slice(0, 200)}`).join(' ')}`)
  if (ctx.language) lines.push(`EXPECTED LANGUAGE: ${ctx.language}`)
  if (ctx.product === 'filme' && ctx.expectedKineoWatermark === true) lines.push('EXPECTED EDITOR OVERLAY: the signed montage places the exact watermark "usekineo.com/free" at the TOP of the frame. This matching top watermark is intentional, not invented_text or a spoken caption. Continue flagging letters/gibberish generated INSIDE objects, screens, documents and signs; this exception applies only to the matching editor watermark.')
  lines.push(`FRAMES (${frames.length}, in time order${frames.some((f) => f.t != null) ? `: ${frames.map((f, i) => `#${i + 1}@${f.t ?? '?'}s`).join(' ')}` : ''}).${refs.length ? ` The FIRST ${refs.length} image(s) are REFERENCE PRODUCT PHOTOS uploaded by the customer (not frames); the product in the video is faithful when it matches ANY of them (a cropped or zoomed real photo is faithful).` : ''}`)
  const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: PixelDetail } }> = [{ type: 'text', text: lines.join('\n\n') }]
  for (const u of refs) content.push({ type: 'image_url', image_url: { url: u, detail } })
  for (const f of frames) content.push({ type: 'image_url', image_url: { url: f.url, detail } })
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content },
  ]
}

const clamp = (n: unknown): number => {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}
const bool = (x: unknown): boolean | null => (x === true ? true : x === false ? false : null)

/**
 * Do JSON do modelo para a nota. A NOTA nasce aqui:
 *   base = média das notas por quadro; tetos de código (cada um nomeado em `caps`):
 *   · quadro quase preto (JPEG < 12 KB, medido, não opinado) → teto 60;
 *   · personagem/produto que troca entre quadros → teto 70;
 *   · rosto/mão deformada (ou olhos/boca/mãos no UGC) em 2+ quadros → teto 75;
 *   · produto infiel (Ads/UGC) → teto 70;
 *   · legenda presente e ilegível, ou na língua/escrita errada → teto 85;
 *   · quadro fora do assunto em 2+ quadros → teto 80;
 *   · texto inventado (não é legenda nem texto do brief) em 1+ quadro → teto 85;
 *   · legenda partida/órfã (palavra sozinha, bloco que termina em preposição) em 2+ quadros → teto 88 (nunca no UGC: KINEO-META95-UGC-1910).
 */
export function normalizePixel(
  parsed: Record<string, unknown>,
  ctx: { product: ProdutoRegua; frames: Frame[]; via: PixelResult['frame_via']; model: string | null; usdFrames: number; usdVision: number; ms: number },
): PixelResult {
  parsed = objectRecord(parsed)
  const evidence = inspectFrameEvidence(parsed, ctx.frames, PIXEL_FRAMES, (r) =>
    isScore(r.score) && typeof r.subject === 'string' && !!r.subject.trim() && Array.isArray(r.issues) &&
    r.issues.every((c) => typeof c === 'string' && (PIXEL_ISSUES as readonly string[]).includes(c)) &&
    typeof r.note === 'string' && (r.score === 100 && r.issues.length === 0 || !!r.note.trim()))
  const raw = Array.isArray(parsed.frames) ? (parsed.frames as Array<Record<string, unknown>>) : []
  const verdicts: PixelFrameVerdict[] = ctx.frames.map((f, idx) => {
    const r = raw.find((x) => x?.i === idx + 1) ?? null
    const issues = Array.isArray(r?.issues) ? (r!.issues as unknown[]).filter((c): c is PixelIssue => typeof c === 'string' && (PIXEL_ISSUES as readonly string[]).includes(c)) : []
    const nearBlack = typeof f.bytes === 'number' && f.bytes > 0 && f.bytes < NEAR_BLACK_JPEG_BYTES
    if (nearBlack && !issues.includes('near_black')) issues.push('near_black')
    return { i: idx + 1, t: f.t, subject: typeof r?.subject === 'string' ? r.subject.trim().slice(0, 60) : '', score: r ? clamp(r.score) : 0, issues, note: typeof r?.note === 'string' ? r.note.trim().slice(0, 120) : r ? '' : 'sem leitura do juiz para este quadro' }
  })
  const caps: string[] = []
  let capLimit = 100
  let score = verdicts.length ? Math.round(verdicts.reduce((a, v) => a + v.score, 0) / verdicts.length) : 0
  const cap = (limit: number, why: string) => {
    capLimit = Math.min(capLimit, limit)
    if (score > limit) score = limit
    caps.push(`${why} (teto ${limit})`)
  }
  const count = (code: PixelIssue) => verdicts.filter((v) => v.issues.includes(code)).length
  const trocas = Array.isArray(parsed.identity_changes) ? (parsed.identity_changes as Array<Record<string, unknown>>).filter((x) => x && typeof x === 'object') : []
  // a troca nomeada pelo modelo (quadro a quadro) vale mais que o booleano: "consistent: true" com uma troca listada = troca.
  const identity = trocas.length > 0 ? false : bool(parsed.identity_consistent)
  const captionPresent = bool(parsed.caption_present)
  const captionLegible = bool(parsed.caption_legible)
  const captionLang = bool(parsed.caption_language_ok)
  const productFaithful = ctx.product === 'ads' || ctx.product === 'ugc' ? bool(parsed.product_faithful) : null
  if (count('near_black') > 0) cap(60, `${count('near_black')} quadro(s) quase preto(s)`)
  if (identity === false) cap(70, 'personagem ou produto troca entre quadros')
  const deformed = verdicts.filter((v) => v.issues.includes('deformed_face_or_hand') || v.issues.includes('ugc_eyes_mouth_hands')).length
  if (deformed >= 2) cap(75, `rosto/mão deformado em ${deformed} quadros`)
  if (productFaithful === false || count('product_unfaithful') >= 2) cap(70, 'produto diferente da foto real')
  if (captionPresent === true && (captionLegible === false || captionLang === false)) cap(85, captionLang === false ? 'legenda na língua/escrita errada' : 'legenda ilegível')
  const missingSubject = verdicts.filter((v) => v.issues.includes('off_topic') || v.issues.includes('subject_missing')).length
  if (missingSubject >= 2) cap(80, `${missingSubject} quadros sem o sujeito da fala`)
  if (count('repeated') >= 3) cap(85, `${count('repeated')} quadros repetidos`)
  if (count('invented_text') >= 1) cap(85, `texto inventado na imagem em ${count('invented_text')} quadro(s)`)
  // KINEO-META95-UGC-1910 — no UGC/apresentador a frase curta no alto é o formato: legenda só pesa se for ilegível (teto 85 acima).
  if (ctx.product !== 'ugc' && count('caption_broken') >= 2) cap(88, `legenda partida/órfã em ${count('caption_broken')} quadros`)
  if (identity === false && !trocas.some((t) => Number.isInteger(t.from) && Number.isInteger(t.to) && Number(t.from) >= 1 && Number(t.to) >= 1 && Number(t.from) <= ctx.frames.length && Number(t.to) <= ctx.frames.length && t.from !== t.to && typeof t.what === 'string' && !!t.what.trim())) evidence.evidence_reasons.push('identity_defect_not_located')
  if (productFaithful === false && count('product_unfaithful') === 0) evidence.evidence_reasons.push('product_defect_not_located')
  if (captionPresent === true && (captionLegible === false || captionLang === false) && !verdicts.some((v) => (v.issues.includes('caption_illegible') || v.issues.includes('caption_broken')) && v.note.trim())) evidence.evidence_reasons.push('caption_defect_not_located')
  const validated = assessEvidence(evidence.evidence_reasons, evidence.coverage)
  return {
    ...validated,
    version: PIXEL_SCORE_VERSION,
    score: validated.evidence_status === 'complete' ? score : null,
    frames: verdicts,
    readings: validated.evidence_status === 'complete' ? [score] : [],
    identity_consistent: identity,
    identity_changes: trocas.filter(t => Number.isInteger(t.from) && Number.isInteger(t.to) && Number(t.from) >= 1 && Number(t.to) >= 1 && Number(t.from) <= ctx.frames.length && Number(t.to) <= ctx.frames.length && t.from !== t.to && typeof t.what === 'string' && !!t.what.trim()).map(t => ({ from: Number(t.from), to: Number(t.to), what: String(t.what).slice(0, 160) })),
    caption_present: captionPresent,
    caption_legible: captionLegible,
    caption_language_ok: captionLang,
    product_faithful: productFaithful,
    caps,
    cap_limit: capLimit,
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 200) : '',
    frame_via: ctx.via,
    frame_count: ctx.frames.length,
    frame_urls: ctx.frames.map((f) => f.url).filter((u) => /^https?:\/\//.test(u)).slice(0, 10),
    model: ctx.model,
    usd_frames: Math.round(ctx.usdFrames * 1e6) / 1e6,
    usd_vision: Math.round(ctx.usdVision * 1e6) / 1e6,
    usd: Math.round((ctx.usdFrames + ctx.usdVision) * 1e6) / 1e6,
    ms: ctx.ms,
  }
}

/** Julga quadros já extraídos (fal no servidor; ffmpeg local no calibrador). Falha aberta: null. */
export async function judgeFrames(
  ctx: PixelContext,
  frames: Frame[],
  opts?: { fetchImpl?: typeof fetch; model?: string; apiKey?: string; timeoutMs?: number; via?: PixelResult['frame_via']; usdFrames?: number; startedAt?: number; detail?: PixelDetail; readings?: number },
): Promise<PixelResult | null> {
  const started = opts?.startedAt ?? Date.now()
  const n = Math.max(1, Math.min(3, opts?.readings ?? PIXEL_READINGS))
  const leituras = (await Promise.all(Array.from({ length: n }, () => judgeFramesOnce(ctx, frames, { ...opts, usdFrames: 0, startedAt: started })))).filter((r): r is PixelResult => r !== null)
  return combinePixelReadings(leituras, { usdFrames: opts?.usdFrames ?? 0, ms: Date.now() - started, expectedReadings: Math.max(n, PIXEL_READINGS) })
}

/**
 * Junta as leituras do juiz de visão (a de temperatura 0 com imagens ainda oscila: no calibrador, o mesmo Dino levou 70 e
 * 88 em duas rodadas). A média nunca ultrapassa um teto fundamentado de qualquer leitura. Evidência incompleta = null;
 * duas respostas iguais são registradas como concordantes, não como avaliações independentes.
 */
export function combinePixelReadings(leituras: PixelResult[], ctx: { usdFrames: number; ms: number; expectedReadings?: number }): PixelResult | null {
  if (leituras.length === 0) return null
  const validas = leituras.filter((r): r is PixelResult & { score: number } => isScore(r.score) && r.evidence_status === 'complete')
  const dura = validas.length ? validas.reduce((a, b) => (b.score < a.score ? b : a), validas[0]) : leituras[0]
  const expectedReadings = ctx.expectedReadings ?? PIXEL_READINGS
  const reasons = leituras.flatMap((r) => r.evidence_reasons)
  if (validas.length < expectedReadings) reasons.push('readings_below_plan')
  const signatures = validas.map((r) => JSON.stringify({ frames: r.frames, caps: r.caps, summary: r.summary }))
  const evidence = assessEvidence(reasons, { ...dura.coverage, expected_readings: expectedReadings, valid_readings: validas.length, readings_identical: signatures.length > 1 && new Set(signatures).size === 1 })
  const capLimit = Math.min(...leituras.map((r) => r.cap_limit))
  const usdVision = leituras.reduce((a, r) => a + r.usd_vision, 0)
  return {
    ...dura,
    ...evidence,
    score: evidence.evidence_status === 'complete' ? Math.min(capLimit, Math.round(validas.reduce((a, r) => a + r.score, 0) / validas.length)) : null,
    cap_limit: capLimit,
    caps: [...new Set(leituras.flatMap((r) => r.caps))],
    identity_changes: leituras.flatMap(r => r.identity_changes ?? []),
    gate_evidence: { identity_changed: leituras.some(r => r.identity_consistent === false), caption_illegible: leituras.some(r => r.caption_legible === false), caption_language_wrong: leituras.some(r => r.caption_language_ok === false) },
    defect_frames: leituras.flatMap(r => r.frames.filter(f => f.issues.length > 0)),
    readings: validas.map((r) => r.score),
    usd_frames: Math.round(ctx.usdFrames * 1e6) / 1e6,
    usd_vision: Math.round(usdVision * 1e6) / 1e6,
    usd: Math.round((ctx.usdFrames + usdVision) * 1e6) / 1e6,
    ms: ctx.ms,
  }
}

async function judgeFramesOnce(
  ctx: PixelContext,
  frames: Frame[],
  opts?: { fetchImpl?: typeof fetch; model?: string; apiKey?: string; timeoutMs?: number; via?: PixelResult['frame_via']; usdFrames?: number; startedAt?: number; detail?: PixelDetail },
): Promise<PixelResult | null> {
  const started = opts?.startedAt ?? Date.now()
  if (frames.length === 0) return null
  const key = opts?.apiKey ?? process.env.OPENAI_API_KEY
  if (!key) return null
  const model = opts?.model ?? process.env.REGUA95_PIXEL_MODEL ?? PIXEL_MODEL_DEFAULT
  const doFetch = opts?.fetchImpl ?? fetch
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 60_000)
  try {
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0, max_tokens: 1100, response_format: { type: 'json_object' }, messages: buildPixelMessages(ctx, frames, opts?.detail ?? 'low') }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '') as Record<string, unknown>
    } catch {
      return null
    }
    return normalizePixel(parsed, { product: ctx.product, frames, via: opts?.via ?? null, model, usdFrames: opts?.usdFrames ?? 0, usdVision: usdFromUsage(data.usage, PIXEL_MODEL_RATES[model] ?? PIXEL_MODEL_RATES[AI_TEXT_MODELS.writer]), ms: Date.now() - started })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Ponta a ponta no servidor: quadros pela fal → juiz de visão. Falha aberta: null. */
export async function scorePixel(
  videoUrl: string,
  seconds: number | null | undefined,
  ctx: PixelContext,
  opts?: { fetchImpl?: typeof fetch; falKey?: string; apiKey?: string; model?: string; timeoutMs?: number; fps?: number; exactFrameTimes?: boolean },
): Promise<PixelResult | null> {
  const started = Date.now()
  const ex = await extractFramesFal(videoUrl, seconds, { fetchImpl: opts?.fetchImpl, falKey: opts?.falKey, timeoutMs: opts?.timeoutMs, fps: opts?.fps, exactFrameTimes: opts?.exactFrameTimes })
  if (!ex) return null
  return judgeFrames(ctx, ex.frames, { fetchImpl: opts?.fetchImpl, apiKey: opts?.apiKey, model: opts?.model, via: ex.via, usdFrames: ex.usd, startedAt: started, timeoutMs: opts?.timeoutMs })
}
