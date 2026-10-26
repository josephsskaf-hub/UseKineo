// KINEO-META95-UGC-1910 — JUIZ ESPECÍFICO DE UGC / APRESENTADOR da régua 95 (fundador 19/10: "Vai pra meta do 95").
//
// Por que existe: a nota de pixel (lib/regua95/pixelScore.ts) olha 8 quadros espalhados pelo vídeo inteiro. No anúncio com
// apresentador isso não pega os dois defeitos reais de 19/10 (docs/RESULTADO-VALIDA-APRESENTADOR-LIBERADO-2026-10-19.md,
// pedido af33b3c0): OLHOS FECHADOS ~1,2 s logo no gancho ("Conheça Perfume LUME" de olhos fechados) e SORRISO DE DENTES sobre
// ~1/3 da fala. E a calibração da régua deu 88 ao R3 (nota 9 do fundador) por uma "legenda partida" que não existe — a frase
// curta no alto é o formato do UGC, não defeito. Recomendação A-2 de docs/CONSISTENCIA-COMO-OS-LIDERES-GARANTEM-2026-10-19.md.
//
// O que faz (SÓ REGISTRA — log-only; não barra, não refaz, não muda nada do que o cliente recebe):
//   1. quadros DENSOS do gancho (0–3 s, 6 quadros a cada 0,5 s) + 6 quadros espalhados pela fala (3 s até o fim da voz,
//      `ads_v2_orders.voice_seconds`), numa chamada só da fal `extract-nth-frame` (passo de 0,5 s; vídeo longo = 2 chamadas);
//      quadros nas PAUSAS da voz só quando o pedido guarda os tempos dos silêncios (hoje não guarda → `pause_check: 'sem_tempos'`);
//   2. UMA leitura do gpt-4o detail low com perguntas OBJETIVAS por quadro (olhos, sorriso de dentes, boca na pausa, mão,
//      pessoa duplicada, rótulo × foto do pedido, legenda ilegível) — o modelo responde fatos; a NOTA nasce no código:
//        · olhos fechados em ≥ 2 quadros SEGUIDOS do gancho .......... teto 75
//        · olhos fechados em ≥ 3 quadros no total ..................... teto 85
//        · sorriso de dentes em ≥ 2 quadros da fala ................... teto 85
//        · boca aberta numa pausa da voz (só com os tempos) ........... teto 90
//        · mão extra/vinda da câmera (1+) ou deformada em 2+ quadros .. teto 75 (1 quadro deformado = teto 90)
//        · pessoa/corpo duplicado ...................................... teto 60
//        · rótulo diferente da foto do pedido em 2+ quadros ........... teto 70 (1 quadro = teto 85)
//        · legenda ilegível de verdade em 2+ quadros .................. teto 85 (legenda "partida"/curta no alto NÃO conta)
//      Defeito isolado que não chega a teto (1 quadro de olho fechado no gancho = piscada; 1 sorriso; meio-olho no gancho)
//      tira 2–3 pontos, sem descer de 90 por isso.
//   3. evento `ugc_score` (motivos por quadro, frame_via); o painel /admin/coerencia combina: nota UGC = a MENOR entre o
//      pixel e este juiz (lib/admin/regua95Painel.ts).
// Custo alvo ≤ US$ 0,01 por vídeo: 12–13 imagens low (85 tokens cada) + ~700 de texto ≈ 1.800 tokens de entrada (US$ 0,0045)
// + ~350 de saída compacta (US$ 0,0035) + fal ~US$ 0,001–0,002. Falha aberta: erro = sem nota, nunca exceção.
import { usdFromUsage } from '@/lib/regua95/coherenceV2'
import { FAL_USD_PER_COMPUTE_SECOND, PIXEL_MODEL_DEFAULT, PIXEL_MODEL_RATES, type Frame, type PixelDetail } from '@/lib/regua95/pixelScore'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { inspectFrameEvidence, objectRecord, type EvidenceAssessment } from '@/lib/regua95/evidence'

export const UGC_SCORE_EVENT = 'ugc_score'
export const UGC_SCORE_VERSION = 'regua95_ugc_v1'
/** Passo dos quadros do gancho e da grade da fala (s). */
export const UGC_STEP_SECONDS = 0.5
/** O gancho: os primeiros 3 s (o que o espectador vê antes de decidir ficar). */
export const UGC_HOOK_SECONDS = 3
export const UGC_HOOK_FRAMES = 6
export const UGC_SPEECH_FRAMES = 6
/** Quadros de pausa (só com os tempos dos silêncios no pedido). */
export const UGC_PAUSE_FRAMES = 2
export const UGC_FPS_ASSUMED = 24
/** A grade de 0,5 s numa chamada só cobre até 20 s de fala (40 quadros); acima disso a fala vai numa 2ª chamada espaçada. */
export const UGC_GRID_MAX_FRAMES = 40
export const UGC_MODEL_DEFAULT: string = PIXEL_MODEL_DEFAULT // o gpt-4o do registro (lib/aiModels.ts), o mesmo do pixel
export const UGC_FAL_NTH_FRAME_MODEL = 'fal-ai/workflow-utilities/extract-nth-frame'

export type UgcZone = 'gancho' | 'fala' | 'pausa'
export type UgcEyes = 'open' | 'closed' | 'half' | 'na'
export type UgcHand = 'ok' | 'deformed' | 'extra' | 'na'
export type UgcLabel = 'match' | 'different' | 'unreadable' | 'na'
export type UgcCaption = 'ok' | 'illegible' | 'none'
export type UgcMouth = 'open' | 'closed' | 'na'

/** Um quadro pedido: tempo no MP4 final e zona. */
export type UgcFramePlan = { t: number; zone: UgcZone }

export type UgcFrameVerdict = {
  i: number
  t: number | null
  zone: UgcZone
  eyes: UgcEyes
  grin: boolean
  mouth: UgcMouth
  hand: UgcHand
  dup: boolean
  label: UgcLabel
  caption: UgcCaption
  note: string
}

export type UgcContext = {
  /** o que a pessoa pediu / a fala (para o juiz saber o que é o produto e a língua) */
  asked: string
  narration?: string | null
  /** fotos reais do produto do pedido (a 1ª vai ao juiz como referência do rótulo) */
  productPhotoUrls?: string[] | null
  /** fim da voz no MP4 final (s); null = a pessoa fala o vídeo inteiro (avatar) */
  speechSeconds?: number | null
  /** meio de cada silêncio da voz (s), quando o pedido guarda; hoje nenhum pedido guarda → sem checagem de pausa */
  pausesSeconds?: number[] | null
  engine?: string | null
  language?: string | null
}

export type UgcResult = EvidenceAssessment & {
  version: string
  score: number | null
  frames: UgcFrameVerdict[]
  caps: string[]
  /** "0,5 s gancho: olhos fechados" — um motivo por quadro com defeito (o que o painel e o evento mostram) */
  motivos: string[]
  /** pontos tirados por defeito isolado (sem teto) */
  leves: number
  pause_check: 'ok' | 'sem_tempos'
  label_check: 'com_foto' | 'sem_foto'
  speech_seconds: number | null
  summary: string
  frame_via: 'nth_frame' | 'local' | null
  frame_count: number
  frame_urls: string[]
  model: string | null
  usd_frames: number
  usd_vision: number
  usd: number
  ms: number
}

const r1 = (n: number) => Math.round(n * 10) / 10
const finitePos = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0

/**
 * Os quadros que o juiz vê: 6 do gancho (0; 0,5; …; 2,5 s), 6 espalhados na fala (de 3 s até o fim da voz − 0,25 s, na grade
 * de 0,5 s) e, se houver os tempos, até 2 nas pausas. Puro (o calibrador usa o mesmo plano com ffmpeg local).
 */
export function planUgcFrames(input: { seconds: number | null | undefined; speechSeconds?: number | null; pausesSeconds?: number[] | null }): UgcFramePlan[] {
  const videoEnd = finitePos(input.seconds) ? input.seconds : 12
  const speechEnd = finitePos(input.speechSeconds) ? Math.min(input.speechSeconds, videoEnd) : videoEnd
  const out: UgcFramePlan[] = []
  for (let k = 0; k < UGC_HOOK_FRAMES; k++) {
    const t = r1(k * UGC_STEP_SECONDS)
    if (t < speechEnd) out.push({ t, zone: 'gancho' })
  }
  const ini = UGC_HOOK_SECONDS
  const fim = speechEnd - 0.25
  if (fim >= ini) {
    const vistos = new Set<number>()
    for (let k = 0; k < UGC_SPEECH_FRAMES; k++) {
      const alvo = ini + ((fim - ini) * k) / (UGC_SPEECH_FRAMES - 1)
      let t = speechEnd <= 20 ? r1(Math.round(alvo / UGC_STEP_SECONDS) * UGC_STEP_SECONDS) : r1(alvo)
      if (t >= speechEnd) t = r1(t - UGC_STEP_SECONDS) // a grade arredondou para depois do fim da fala (ex.: avatar no último quadro)
      if (t >= ini && t < speechEnd && !vistos.has(t)) { vistos.add(t); out.push({ t, zone: 'fala' }) }
    }
  }
  const pausas = (input.pausesSeconds ?? []).filter((p) => finitePos(p) && p < speechEnd + 0.7).slice(0, UGC_PAUSE_FRAMES)
  for (const p of pausas) out.push({ t: r1(p), zone: 'pausa' })
  return out.sort((a, b) => a.t - b.t || (a.zone === 'pausa' ? 1 : -1))
}

type FalImage = { url?: unknown; file_size?: unknown }

/**
 * Quadros do plano pela fal (extract-nth-frame; quadro k da resposta = tempo k × passo / 24). Fala até 20 s = UMA chamada
 * (grade de 0,5 s); mais longa = gancho numa chamada e fala noutra, espaçada. Pausa fora da grade vai ao quadro de grade
 * mais próximo. Devolve null quando não deu (sem chave, HTTP != 200, sem imagens). Nunca lança.
 */
export async function extractUgcFramesFal(
  videoUrl: string,
  plan: UgcFramePlan[],
  opts?: { fetchImpl?: typeof fetch; falKey?: string; timeoutMs?: number },
): Promise<{ frames: Array<Frame & { zone: UgcZone }>; via: 'nth_frame'; ms: number; usd: number; calls: number } | null> {
  const key = opts?.falKey ?? process.env.FAL_KEY ?? process.env.FAL_API_KEY
  if (!key || !videoUrl || plan.length === 0) return null
  const doFetch = opts?.fetchImpl ?? fetch
  const started = Date.now()
  const call = async (interval: number, maxFrames: number): Promise<FalImage[] | null> => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 90_000)
    try {
      const res = await doFetch(`https://fal.run/${UGC_FAL_NTH_FRAME_MODEL}`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl, frame_interval: interval, max_frames: maxFrames, output_format: 'jpg', quality: 80 }),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { images?: FalImage[] }
      return Array.isArray(data.images) && data.images.length > 0 ? data.images : null
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }
  const lastT = Math.max(...plan.map((p) => p.t))
  const gridInterval = Math.max(1, Math.round(UGC_STEP_SECONDS * UGC_FPS_ASSUMED))
  const grids: Array<{ interval: number; images: FalImage[] }> = []
  let calls = 0
  const gridNeeded = Math.floor(lastT / UGC_STEP_SECONDS) + 1
  if (gridNeeded <= UGC_GRID_MAX_FRAMES) {
    calls++
    const imgs = await call(gridInterval, gridNeeded)
    if (imgs) grids.push({ interval: gridInterval, images: imgs })
  } else {
    calls++
    const hook = await call(gridInterval, UGC_HOOK_FRAMES)
    if (hook) grids.push({ interval: gridInterval, images: hook })
    const longInterval = Math.max(1, Math.min(300, Math.floor((lastT * UGC_FPS_ASSUMED) / (UGC_SPEECH_FRAMES * 2))))
    calls++
    const fala = await call(longInterval, Math.min(UGC_GRID_MAX_FRAMES, Math.floor((lastT * UGC_FPS_ASSUMED) / longInterval) + 1))
    if (fala) grids.push({ interval: longInterval, images: fala })
  }
  if (grids.length === 0) return null
  const frames: Array<Frame & { zone: UgcZone }> = []
  for (const p of plan) {
    let best: { url: string; t: number; bytes: number | null; d: number } | null = null
    for (const g of grids) {
      g.images.forEach((im, k) => {
        const t = r1((k * g.interval) / UGC_FPS_ASSUMED)
        const d = Math.abs(t - p.t)
        if (typeof im?.url === 'string' && im.url && (best === null || d < best.d)) best = { url: im.url, t, bytes: typeof im.file_size === 'number' ? im.file_size : null, d }
      })
    }
    const b = best as { url: string; t: number; bytes: number | null; d: number } | null
    if (b && b.d <= 1.0) frames.push({ url: b.url, t: b.t, bytes: b.bytes, zone: p.zone })
  }
  if (frames.length === 0) return null
  const ms = Date.now() - started
  return { frames, via: 'nth_frame', ms, usd: (ms / 1000) * FAL_USD_PER_COMPUTE_SECOND, calls }
}

/** Mensagens do juiz (perguntas objetivas por quadro, resposta compacta). Exportado para o guardião e o calibrador. */
export function buildUgcMessages(ctx: UgcContext, frames: Array<Frame & { zone: UgcZone }>, detail: PixelDetail = 'low') {
  const ref = (ctx.productPhotoUrls ?? []).find((u) => typeof u === 'string' && u) ?? null
  const system =
    'You check a UGC / avatar ad: ONE person talks to the camera, usually holding a product. You get frames from the FINAL MP4 with time and zone ' +
    '(HOOK = first 3 seconds, SPEECH = while talking, PAUSE = a silence in the voice). Answer ONLY objective questions per frame; do not grade beauty or style. ' +
    'eyes: "open" | "closed" (both eyelids shut or nearly shut) | "half" (heavy, half-closed lids) | "na" (no face visible). ' +
    'grin: true ONLY when the person smiles wide showing the upper teeth (a grin); teeth briefly visible while pronouncing a word = false. ' +
    'mouth: PAUSE frames only — "open" (lips apart) | "closed"; other frames "na". ' +
    'hand: "ok" (every visible hand has 5 normal fingers) | "deformed" (missing, extra, fused or melted fingers, impossible wrist) | "extra" (a third hand/arm, a hand coming from the camera, a hand with no body) | "na" (no hand visible). Motion blur on a moving hand is "ok". ' +
    'dup: true when the same person, face or body part appears twice, or a second body that should not be there. ' +
    `label: ${ref ? 'the FIRST image is the REFERENCE PRODUCT PHOTO from the order (not a frame) — ' : ''}"match" (product label/logo readable and the same as the reference) | "different" (other text, misspelled, redesigned logo/shape/color) | "unreadable" (product visible but the label cannot be read: angle, blur, small) | "na" (product not in frame${ref ? '' : ', or no reference photo'}). ` +
    'caption: on-screen text — "ok" | "illegible" (truly cannot be read: contrast, size, cut by the frame edge) | "none". The short phrase at the TOP is part of this ad format: a short phrase, a phrase split over two lines or two blocks, or small letters are "ok", never a defect. ' +
    'note: ONLY when something is wrong, short Brazilian Portuguese (max 50 chars); otherwise "". ' +
    'Reply ONLY with compact JSON: {"frames":[{"i":1,"eyes":"open","grin":false,"mouth":"na","hand":"ok","dup":false,"label":"match","caption":"ok","note":""}],"summary":"one Brazilian Portuguese sentence, max 120 chars"}.'
  const lines: string[] = []
  lines.push(`WHAT WAS ASKED: """${String(ctx.asked ?? '').slice(0, 600)}"""`)
  if (ctx.narration) lines.push(`SPOKEN TEXT: """${String(ctx.narration).slice(0, 600)}"""`)
  if (ctx.language) lines.push(`LANGUAGE: ${ctx.language}`)
  const zoneEn: Record<UgcZone, string> = { gancho: 'HOOK', fala: 'SPEECH', pausa: 'PAUSE' }
  lines.push(`FRAMES (${frames.length}, in order): ${frames.map((f, i) => `#${i + 1}@${f.t ?? '?'}s ${zoneEn[f.zone]}`).join(' · ')}`)
  const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: PixelDetail } }> = [{ type: 'text', text: lines.join('\n') }]
  if (ref) content.push({ type: 'image_url', image_url: { url: ref, detail } })
  for (const f of frames) content.push({ type: 'image_url', image_url: { url: f.url, detail } })
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content },
  ]
}

const pick = <T extends string>(x: unknown, ok: readonly T[], dflt: T): T => (typeof x === 'string' && (ok as readonly string[]).includes(x) ? (x as T) : dflt)
const fmtT = (t: number | null) => (t == null ? '?' : `${String(t).replace('.', ',')} s`)

/**
 * Do JSON do modelo para a nota. A NOTA nasce aqui (tetos e pontos em código, cada um nomeado em `caps` / `motivos`).
 * `frames` = os quadros julgados, na ordem do plano (com zona e tempo); `hasReference` = havia foto do produto.
 */
export function normalizeUgc(
  parsed: Record<string, unknown>,
  ctx: { frames: Array<{ url: string; t: number | null; zone: UgcZone }>; expectedFrames?: number; hasReference: boolean; hasPauses: boolean; speechSeconds: number | null; via: UgcResult['frame_via']; model: string | null; usdFrames: number; usdVision: number; ms: number },
): UgcResult {
  parsed = objectRecord(parsed)
  const evidence = inspectFrameEvidence(parsed, ctx.frames, ctx.expectedFrames ?? 12, (r) =>
    ['open', 'closed', 'half', 'na'].includes(String(r.eyes)) && typeof r.grin === 'boolean' &&
    ['ok', 'deformed', 'extra', 'na'].includes(String(r.hand)) && typeof r.dup === 'boolean' &&
    ['match', 'different', 'unreadable', 'na'].includes(String(r.label)) && ['ok', 'illegible', 'none'].includes(String(r.caption)) &&
    typeof r.note === 'string' && (r.eyes !== 'na' || r.hand !== 'na' || r.label !== 'na' || r.caption !== 'none') &&
    (!ctx.hasPauses || ctx.frames[Number(r.i) - 1]?.zone !== 'pausa' || ['open', 'closed', 'na'].includes(String(r.mouth))))
  const raw = Array.isArray(parsed.frames) ? (parsed.frames as Array<Record<string, unknown>>) : []
  const verdicts: UgcFrameVerdict[] = ctx.frames.map((f, idx) => {
    const r = raw.find((x) => x?.i === idx + 1) ?? null
    const label = pick<UgcLabel>(r?.label, ['match', 'different', 'unreadable', 'na'], 'na')
    return {
      i: idx + 1,
      t: f.t,
      zone: f.zone,
      eyes: pick<UgcEyes>(r?.eyes, ['open', 'closed', 'half', 'na'], 'na'),
      grin: r?.grin === true,
      mouth: f.zone === 'pausa' ? pick<UgcMouth>(r?.mouth, ['open', 'closed', 'na'], 'na') : 'na',
      hand: pick<UgcHand>(r?.hand, ['ok', 'deformed', 'extra', 'na'], 'na'),
      dup: r?.dup === true,
      // sem foto do pedido não há com o que comparar: "diferente" vira "na" (o modelo não pode inventar a referência)
      label: !ctx.hasReference && label === 'different' ? 'na' : label,
      caption: pick<UgcCaption>(r?.caption, ['ok', 'illegible', 'none'], 'none'),
      note: typeof r?.note === 'string' ? r.note.trim().slice(0, 80) : r ? '' : 'sem leitura do juiz para este quadro',
    }
  })
  const caps: string[] = []
  const motivos: string[] = []
  let score = 100
  let leves = 0
  const cap = (limit: number, why: string) => {
    if (score > limit) score = limit
    caps.push(`${why} (teto ${limit})`)
  }
  // ── olhos: a sequência mais longa de quadros SEGUIDOS do gancho com olhos fechados ──
  const gancho = verdicts.filter((v) => v.zone === 'gancho').sort((a, b) => (a.t ?? 0) - (b.t ?? 0))
  let run = 0
  let maxRun = 0
  for (const v of gancho) { run = v.eyes === 'closed' ? run + 1 : 0; maxRun = Math.max(maxRun, run) }
  const fechados = verdicts.filter((v) => v.eyes === 'closed').length
  const fechadosGancho = gancho.filter((v) => v.eyes === 'closed').length
  const meioGancho = gancho.filter((v) => v.eyes === 'half').length
  if (maxRun >= 2) cap(75, `olhos fechados em ${maxRun} quadros seguidos do gancho (0–3 s)`)
  if (fechados >= 3) cap(85, `olhos fechados em ${fechados} quadros`)
  if (maxRun < 2 && fechadosGancho >= 1) leves += 3 * Math.min(fechadosGancho, 1) // uma piscada pega no gancho
  leves += 2 * Math.min(meioGancho, 2)
  // ── sorriso de dentes sobre a fala (gancho + fala; a pausa é julgada pela boca) ──
  const sorrisos = verdicts.filter((v) => v.grin && v.zone !== 'pausa').length
  if (sorrisos >= 2) cap(85, `sorriso de dentes em ${sorrisos} quadros da fala`)
  else if (sorrisos === 1) leves += 3
  // ── boca aberta na pausa (só com os tempos dos silêncios) ──
  const bocaPausa = ctx.hasPauses ? verdicts.filter((v) => v.zone === 'pausa' && v.mouth === 'open').length : 0
  if (bocaPausa >= 1) cap(90, `boca aberta em ${bocaPausa} pausa(s) da voz`)
  // ── mãos ──
  const maoExtra = verdicts.filter((v) => v.hand === 'extra').length
  const maoDef = verdicts.filter((v) => v.hand === 'deformed').length
  if (maoExtra >= 1 || maoDef >= 2) cap(75, maoExtra >= 1 ? `mão extra/vinda da câmera em ${maoExtra} quadro(s)` : `mão deformada em ${maoDef} quadros`)
  else if (maoDef === 1) cap(90, 'mão deformada em 1 quadro')
  // ── pessoa duplicada ──
  const dup = verdicts.filter((v) => v.dup).length
  if (dup >= 1) cap(60, `pessoa/corpo duplicado em ${dup} quadro(s)`)
  // ── rótulo × foto do pedido ──
  const rotuloDif = verdicts.filter((v) => v.label === 'different').length // sem foto do pedido o 'different' já virou 'na' acima
  if (rotuloDif >= 2) cap(70, `rótulo diferente da foto do pedido em ${rotuloDif} quadros`)
  else if (rotuloDif === 1) cap(85, 'rótulo diferente da foto do pedido em 1 quadro')
  // ── legenda: só ilegível de verdade (a frase curta/partida no alto é o formato do UGC) ──
  const ileg = verdicts.filter((v) => v.caption === 'illegible').length
  if (ileg >= 2) cap(85, `legenda ilegível em ${ileg} quadros`)
  if (leves > 0) {
    const comLeves = Math.max(90, 100 - leves)
    if (score > comLeves) score = comLeves
  }
  for (const v of verdicts) {
    const m: string[] = []
    if (v.eyes === 'closed') m.push('olhos fechados')
    else if (v.eyes === 'half' && v.zone === 'gancho') m.push('olhos semicerrados')
    if (v.grin && v.zone !== 'pausa') m.push('sorriso de dentes')
    if (v.zone === 'pausa' && v.mouth === 'open' && ctx.hasPauses) m.push('boca aberta na pausa')
    if (v.hand === 'extra') m.push('mão extra')
    if (v.hand === 'deformed') m.push('mão deformada')
    if (v.dup) m.push('pessoa duplicada')
    if (v.label === 'different' && ctx.hasReference) m.push('rótulo diferente da foto')
    if (v.caption === 'illegible') m.push('legenda ilegível')
    if (m.length) motivos.push(`${fmtT(v.t)} ${v.zone}: ${m.join(', ')}${v.note ? ` (${v.note})` : ''}`)
  }
  return {
    ...evidence,
    version: UGC_SCORE_VERSION,
    score: evidence.evidence_status === 'complete' ? score : null,
    frames: verdicts,
    caps,
    motivos: motivos.slice(0, 14),
    leves,
    pause_check: ctx.hasPauses ? 'ok' : 'sem_tempos',
    label_check: ctx.hasReference ? 'com_foto' : 'sem_foto',
    speech_seconds: ctx.speechSeconds,
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 200) : '',
    frame_via: ctx.via,
    frame_count: ctx.frames.length,
    frame_urls: ctx.frames.map((f) => f.url).filter((u) => /^https?:\/\//.test(u)).slice(0, 14),
    model: ctx.model,
    usd_frames: Math.round(ctx.usdFrames * 1e6) / 1e6,
    usd_vision: Math.round(ctx.usdVision * 1e6) / 1e6,
    usd: Math.round((ctx.usdFrames + ctx.usdVision) * 1e6) / 1e6,
    ms: ctx.ms,
  }
}

/** Julga quadros já extraídos (fal no servidor; ffmpeg local no calibrador). UMA leitura. Falha aberta: null. */
export async function judgeUgcFrames(
  ctx: UgcContext,
  frames: Array<Frame & { zone: UgcZone }>,
  opts?: { fetchImpl?: typeof fetch; model?: string; apiKey?: string; timeoutMs?: number; via?: UgcResult['frame_via']; usdFrames?: number; startedAt?: number; detail?: PixelDetail; expectedFrames?: number },
): Promise<UgcResult | null> {
  const started = opts?.startedAt ?? Date.now()
  if (frames.length === 0) return null
  const key = opts?.apiKey ?? process.env.OPENAI_API_KEY
  if (!key) return null
  const model = opts?.model ?? process.env.REGUA95_UGC_MODEL ?? UGC_MODEL_DEFAULT
  const doFetch = opts?.fetchImpl ?? fetch
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 60_000)
  try {
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0, max_tokens: 900, response_format: { type: 'json_object' }, messages: buildUgcMessages(ctx, frames, opts?.detail ?? 'low') }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '') as Record<string, unknown>
    } catch {
      return null
    }
    const hasReference = (ctx.productPhotoUrls ?? []).some((u) => typeof u === 'string' && u)
    const hasPauses = frames.some((f) => f.zone === 'pausa')
    return normalizeUgc(parsed, {
      frames, expectedFrames: opts?.expectedFrames, hasReference, hasPauses, speechSeconds: finitePos(ctx.speechSeconds) ? ctx.speechSeconds : null, via: opts?.via ?? null, model,
      usdFrames: opts?.usdFrames ?? 0, usdVision: usdFromUsage(data.usage, PIXEL_MODEL_RATES[model] ?? PIXEL_MODEL_RATES[AI_TEXT_MODELS.writer]), ms: Date.now() - started,
    })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Ponta a ponta no servidor: plano → quadros pela fal → juiz. Falha aberta: null. */
export async function scoreUgc(
  videoUrl: string,
  seconds: number | null | undefined,
  ctx: UgcContext,
  opts?: { fetchImpl?: typeof fetch; falKey?: string; apiKey?: string; model?: string },
): Promise<UgcResult | null> {
  const started = Date.now()
  const plan = planUgcFrames({ seconds, speechSeconds: ctx.speechSeconds, pausesSeconds: ctx.pausesSeconds })
  const ex = await extractUgcFramesFal(videoUrl, plan, { fetchImpl: opts?.fetchImpl, falKey: opts?.falKey })
  if (!ex) return null
  return judgeUgcFrames(ctx, ex.frames, { fetchImpl: opts?.fetchImpl, apiKey: opts?.apiKey, model: opts?.model, via: ex.via, usdFrames: ex.usd, startedAt: started, expectedFrames: plan.length })
}
