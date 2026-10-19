// KINEO-CLOSE-REAL-1910 — o formato nº 2 da Biblioteca de Formatos do Studio Ads: "CLOSE DO PRODUTO REAL" (fundador 19/10: "close real grátis,
// KINEO-CLOSE-REAL-1910 — pode fazer"; docs/POR-QUE-OS-CONCORRENTES-SAO-MELHORES-2026-10-19.md, passos R2 e E1).
//
// O QUE É: anúncio de 15 s, 9:16, feito SÓ com as fotos reais que o cliente enviou — ZERO IA de vídeo e ZERO IA de imagem sobre o produto
// (rótulo 100% fiel por construção). A única coisa que toca a foto é o recorte do fundo (BiRefNet, o mesmo da trava do produto), e ele
// NÃO redesenha: tira o fundo e cola o produto, pixel a pixel, sobre um fundo na cor da embalagem (lib/ads/v2CloseRealServer.ts).
//
// ESTRUTURA DE 15 s (adsV2CloseRealTimeline):
//   · 0–3 s   GANCHO no 1º quadro: o produto recortado sobre o fundo na cor dele + a 1ª frase de tela já no quadro 0 (sem fade de entrada);
//   · 3–12,5 s 3 planos das fotos reais com movimento de câmera feito na montagem (Ken Burns: o MESMO padrão do Kineo 1 em produção) e um
//             PUNCH-IN (corte seco para um enquadramento mais perto) no meio de cada plano;
//   · 12,5–15 s cartão final com marca e chamada (o PNG de sempre, lib/ads/endCard.ts).
//   Voz mais longa = os planos esticam (até 4,5 s cada): passar do alvo é bom; amputar a fala, nunca.
// FRASES: as que o Ads já escreve (plan.overlays), uma por plano, no terço de CIMA da zona segura — nada acima de 14% nem abaixo de 65% da
// altura (os 14% de cima e os 35% de baixo que o Meta pede vazios: ADS_V2_SAFE_TOP / ADS_V2_SAFE_BOTTOM). Frase repetida e palavra repetida
// colada ("perfume Perfume Atheeri") saem, o mesmo cuidado do apresentador (adsV2CategoryRepeatFix, lib/ads/v2Brief.ts).
// VOZ: a voz por língua do apresentador v2 (PT-BR = Portuguese_ConfidentWoman na fal-ai/minimax/speech-2.8-hd); música com ducking (25% sob a
// voz, 70% depois). AMOSTRA GRÁTIS (lib/ads/sample.ts): este é o ÚNICO formato da amostra, e ela sai com marca-d'água.
// CUSTO-ALVO ≈ US$ 0,30: voz ~0,03 + recorte ≤0,01 + Creatomate ~0,13 + música 0,08 + texto 0,01 (adsV2CloseRealUsd).
//
// LIB PURA (só `import type` e a montagem pura lib/ads/adV2Montage.ts): roda no navegador (a escolha da tela) e no guardião
// scripts/test-close-real-1910.mjs. O lado servidor (recorte + fundo) mora em lib/ads/v2CloseRealServer.ts.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import type { AdsV2PlannedShot } from '@/lib/ads/v2ShotLists'
import { ADS_V2_FRAME_RATE, ADS_V2_MONTAGE_FADE, ADS_V2_OVERLAY_LINE_HEIGHT, ADS_V2_OVERLAY_PILL_PAD, ADS_V2_OVERLAY_WIDTH, ADS_V2_RECT_PATH, ADS_V2_SAFE_BOTTOM, ADS_V2_SAFE_TOP, ADS_V2_VOICE_START, ADS_V2_MUSIC_VOLUME_NO_VOICE, ADS_V2_MUSIC_VOLUME_WITH_VOICE, ADS_V2_MUSIC_RISE_AFTER_VOICE, adsV2OverlayFontSize, adsV2OverlayLines, adsV2PackshotElements } from '@/lib/ads/adV2Montage'

/** KINEO-CLOSE-REAL-1910 — interruptor ÚNICO. false = a escolha some da tela, o /plan ignora o pedido e a amostra volta ao caminho de antes. */
export const ADS_V2_CLOSE_REAL_LIVE = true
/** O id do formato no corpo do /plan (`close_real: true`) e na tela. */
export const ADS_V2_CLOSE_REAL_ID = 'close_real'
/** Só vertical e só 15 s (a estrutura foi desenhada para isso; o Meta/TikTok/Reels pedem 9:16). */
export const ADS_V2_CLOSE_REAL_FORMAT = '9:16'
export const ADS_V2_CLOSE_REAL_SECONDS = 15

// ── a linha do tempo ─────────────────────────────────────────────────────────────────────────────────────────────────
/** O gancho: o produto recortado sobre o fundo na cor dele, com a 1ª frase já no quadro 0. */
export const ADS_V2_CLOSE_REAL_HOOK_SECONDS = 3
/** Planos das fotos reais depois do gancho (3 → 4 planos no total, com o gancho). */
export const ADS_V2_CLOSE_REAL_PHOTO_SHOTS = 3
/** O cartão final (o mesmo do anúncio de sempre, ADS_V2_CARD_SECONDS). */
export const ADS_V2_CLOSE_REAL_CARD_SECONDS = 2.5
/** Teto de um plano de foto quando a voz pede mais tempo (o corte do Kineo 1 de 02/09: até 4,5 s). */
export const ADS_V2_CLOSE_REAL_SHOT_MAX = 4.5
/** Folga depois do fim da voz antes do cartão. */
export const ADS_V2_CLOSE_REAL_VOICE_PAD = 0.2
/** Onde, dentro do plano, entra o punch-in (fração do plano). */
export const ADS_V2_CLOSE_REAL_PUNCH_AT = 0.55

/** Ken Burns: o MESMO padrão do Kineo 1 em produção (FAST_KEN_BURNS_PATTERN, lib/compose.ts — o guardião confere o espelho). */
export const ADS_V2_CLOSE_REAL_KEN_BURNS: ReadonlyArray<{ from: string; to: string; xAnchor: string }> = [
  { from: '100%', to: '108%', xAnchor: '50%' },
  { from: '108%', to: '100%', xAnchor: '50%' },
  { from: '100%', to: '110%', xAnchor: '38%' },
  { from: '100%', to: '110%', xAnchor: '62%' },
]
/** O punch-in: corte seco para o mesmo quadro mais perto, que ainda anda um pouco (mesma propriedade `scale`). */
export const ADS_V2_CLOSE_REAL_PUNCH_FROM = '114%'
export const ADS_V2_CLOSE_REAL_PUNCH_TO = '118%'
/** O zoom lento do gancho. */
export const ADS_V2_CLOSE_REAL_HOOK_ZOOM_END = '106%'

/** Onde o produto recortado pousa no gancho (frações): abaixo das frases (que moram no terço de cima da zona segura). */
export const ADS_V2_CLOSE_REAL_PRODUCT_BOX = { x0: 0.14, x1: 0.86, y0: 0.36, y1: 0.84 } as const
/** A frase começa um pouco abaixo do topo da zona segura (respiro). */
export const ADS_V2_CLOSE_REAL_TEXT_GAP = 0.02

/** Trilhas: 1 fundo · 2 e 3 os planos (alternadas: o fade só cruza entre trilhas diferentes, a lição da R2) · 4 cartão · 5 frases · 6 marca-d'água · 7 voz · 8 música. */
export const ADS_V2_CLOSE_REAL_TRACKS = { bg: 1, shotA: 2, shotB: 3, card: 4, text: 5, watermark: 6, voice: 7, music: 8 } as const

/** A marca-d'água da amostra grátis. */
export const ADS_V2_CLOSE_REAL_WATERMARK = 'Made with Kineo · usekineo.com'
/** A fonte da marca-d'água num quadro de 1080 de largura, e a base dela (fração da altura): logo abaixo da faixa das frases, acima do produto. */
export const ADS_V2_CLOSE_REAL_WATERMARK_FONT_AT_1080 = 24
export const ADS_V2_CLOSE_REAL_WATERMARK_BOTTOM = 0.31

export interface AdsV2CloseRealTimeline {
  hook: number
  shots: number[]
  starts: number[]
  content: number
  cardStart: number
  total: number
}

/**
 * KINEO-CLOSE-REAL-1910 — a linha do tempo (pura): gancho de 3 s, `n` planos de foto e o cartão. Sem voz (ou voz curta) = 15 s cravados;
 * voz que passa do fim dos planos = os planos esticam até ADS_V2_CLOSE_REAL_SHOT_MAX. null = a voz não cabe nem assim (o chamador falha o
 * pedido com o motivo, como o voice_too_long de sempre).
 */
export function adsV2CloseRealTimeline(i: { voiceSeconds?: number | null; shots?: number; cardSeconds?: number; targetSeconds?: number }): AdsV2CloseRealTimeline | null {
  const r3 = (n: number) => Math.round(n * 1000) / 1000
  const n = Number.isInteger(i?.shots) && (i.shots as number) > 0 ? (i.shots as number) : ADS_V2_CLOSE_REAL_PHOTO_SHOTS
  const card = typeof i?.cardSeconds === 'number' && Number.isFinite(i.cardSeconds) && i.cardSeconds > 0 ? i.cardSeconds : ADS_V2_CLOSE_REAL_CARD_SECONDS
  const target = typeof i?.targetSeconds === 'number' && Number.isFinite(i.targetSeconds) && i.targetSeconds > 0 ? i.targetSeconds : ADS_V2_CLOSE_REAL_SECONDS
  const hook = ADS_V2_CLOSE_REAL_HOOK_SECONDS
  const baseContent = target - card
  const vs = typeof i?.voiceSeconds === 'number' && Number.isFinite(i.voiceSeconds) && i.voiceSeconds > 0 ? i.voiceSeconds : 0
  const voiceEnd = vs > 0 ? ADS_V2_VOICE_START + vs + ADS_V2_CLOSE_REAL_VOICE_PAD : 0
  const content = Math.max(baseContent, voiceEnd)
  const per = (content - hook) / n
  if (!(per > 0) || per > ADS_V2_CLOSE_REAL_SHOT_MAX + 1e-9) return null
  const shots: number[] = []
  const starts: number[] = []
  let t = hook
  for (let k = 0; k < n; k++) { starts.push(r3(t)); const d = k === n - 1 ? r3(content - t) : r3(per); shots.push(d); t = r3(t + d) }
  return { hook, shots, starts, content: r3(content), cardStart: r3(content), total: r3(content + card) }
}

// ── as frases (zona segura do Meta) ────────────────────────────────────────────────────────────────────────────────────
/** A caixa de uma frase em frações do quadro (top/bottom incluem a pílula). */
export interface AdsV2CloseRealTextBox { top: number; bottom: number }

/** KINEO-CLOSE-REAL-1910 — o lugar e o tamanho da frase: presa pela BASE (y_anchor 100%, a âncora das legendas em produção), no terço de cima da zona segura. Pura. */
export function adsV2CloseRealOverlayGeometry(text: string, frameW: number, frameH: number): { y: string; y_anchor: string; width: string; font_size: number; box: AdsV2CloseRealTextBox } {
  const r4 = (n: number) => Math.round(n * 10000) / 10000
  const fontPx = adsV2OverlayFontSize(text, frameW)
  const lineH = (fontPx * ADS_V2_OVERLAY_LINE_HEIGHT) / frameH
  const lines = Math.max(1, adsV2OverlayLines(text, fontPx, frameW).length)
  const top = ADS_V2_SAFE_TOP + ADS_V2_CLOSE_REAL_TEXT_GAP
  const bottom = top + ADS_V2_OVERLAY_PILL_PAD + lines * lineH
  return { y: `${r4(bottom * 100)}%`, y_anchor: '100%', width: `${r4(ADS_V2_OVERLAY_WIDTH * 100)}%`, font_size: fontPx, box: { top: r4(top), bottom: r4(bottom + ADS_V2_OVERLAY_PILL_PAD) } }
}

/** KINEO-CLOSE-REAL-1910 — a caixa da frase está inteira na zona segura do Meta (nada nos 14% de cima nem nos 35% de baixo)? Pura. */
export function adsV2CloseRealInSafeZone(box: AdsV2CloseRealTextBox): boolean {
  return box.top >= ADS_V2_SAFE_TOP - 1e-9 && box.bottom <= ADS_V2_SAFE_BOTTOM + 1e-9
}

/**
 * KINEO-CLOSE-REAL-1910 — as frases do formato, na ordem: sem vazias, sem palavra repetida colada ("perfume Perfume Atheeri" → "Perfume Atheeri",
 * sem distinguir maiúscula) e sem frase repetida (a mesma frase em 2 planos = a categoria dita duas vezes). Pura.
 */
export function adsV2CloseRealPhrases(texts: readonly (string | null | undefined)[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of Array.isArray(texts) ? texts : []) {
    if (typeof raw !== 'string') continue
    const words = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
    const kept: string[] = []
    for (const w of words) { const prev = kept[kept.length - 1]; if (prev && prev.toLocaleLowerCase() === w.toLocaleLowerCase()) { kept[kept.length - 1] = w; continue } kept.push(w) }
    const text = kept.join(' ')
    const key = text.toLocaleLowerCase()
    if (!text || seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out
}

/** KINEO-CLOSE-REAL-1910 — em qual plano cada frase entra (0 = gancho; k = k-ésimo plano de foto). 3 frases: gancho, 1º e último plano; 2: gancho e último. Pura. */
export function adsV2CloseRealPhraseSlots(phrases: number, photoShots: number = ADS_V2_CLOSE_REAL_PHOTO_SHOTS): number[] {
  if (phrases <= 0) return []
  if (phrases === 1) return [0]
  if (phrases === 2) return [0, photoShots]
  const slots = [0, 1, photoShots]
  for (let k = 2; slots.length < phrases && k < photoShots; k++) slots.splice(slots.length - 1, 0, k)
  return slots.slice(0, Math.min(phrases, photoShots + 1))
}

// ── o que o pedido guarda (ads_v2_orders.plan.closeReal) ─────────────────────────────────────────────────────────────
export interface AdsV2CloseRealPlan {
  v: 1
  /** A foto marcada como PRODUTO (o recorte do gancho sai dela; da original, quando a tela mandou). null = sem foto de produto: o gancho é a 1ª foto inteira. */
  product: { footageId: string; url: string; originalFootageId?: string; originalUrl?: string } | null
  /** As fotos reais dos planos, na ordem (cicla quando há menos fotos que planos). */
  photos: string[]
}

const HTTPS_RE = /^https:\/\/\S+$/i

/** KINEO-CLOSE-REAL-1910 — o plano do formato a partir das fotos do pedido (puro). null = nenhuma foto https usável. */
export function planAdsV2CloseReal(photos: readonly { footage_id?: string | null; kind?: string | null; url?: string | null; original_footage_id?: string | null; original_url?: string | null }[] | null | undefined): AdsV2CloseRealPlan | null {
  const usable = (Array.isArray(photos) ? photos : []).filter((p) => p && typeof p.footage_id === 'string' && p.footage_id && typeof p.url === 'string' && HTTPS_RE.test(p.url.trim()))
  if (usable.length === 0) return null
  const prod = usable.find((p) => p.kind === 'product') ?? null
  const ordered = prod ? [prod, ...usable.filter((p) => p !== prod)] : usable
  const product = prod
    ? { footageId: prod.footage_id as string, url: (prod.url as string).trim(), ...(typeof prod.original_footage_id === 'string' && prod.original_footage_id && typeof prod.original_url === 'string' && HTTPS_RE.test(prod.original_url.trim()) ? { originalFootageId: prod.original_footage_id, originalUrl: prod.original_url.trim() } : {}) }
    : null
  return { v: 1, product, photos: ordered.map((p) => (p.url as string).trim()) }
}

/** KINEO-CLOSE-REAL-1910 — o Close real gravado no plano do pedido, valendo (interruptor ligado). null = pedido de outro formato. Pura. */
export function adsV2CloseRealOf(plan: unknown): AdsV2CloseRealPlan | null {
  if (!ADS_V2_CLOSE_REAL_LIVE) return null
  const c = plan && typeof plan === 'object' ? (plan as { closeReal?: unknown }).closeReal : null
  if (!c || typeof c !== 'object') return null
  const cr = c as Partial<AdsV2CloseRealPlan>
  if (cr.v !== 1 || !Array.isArray(cr.photos) || cr.photos.length === 0 || !cr.photos.every((u) => typeof u === 'string' && HTTPS_RE.test(u))) return null
  if (cr.product !== null && cr.product !== undefined && (typeof cr.product !== 'object' || typeof cr.product.url !== 'string' || !HTTPS_RE.test(cr.product.url))) return null
  return { v: 1, product: cr.product ?? null, photos: cr.photos as string[] }
}

/**
 * KINEO-CLOSE-REAL-1910 — os planos do pedido viram as FOTOS REAIS paradas (kind 'text': nasce 'skipped_text', sem motor, sem prompt — nunca vai
 * à fal; o CHECK ads_v2_shots_text_never_ai repete a regra no banco). Estilo, cena criada, pessoa segurando e produto na mão saem junto. Pura.
 */
export function adsV2CloseRealShots(shots: AdsV2PlannedShot[], photos: readonly { footage_id: string; kind: string; url: string }[]): AdsV2PlannedShot[] {
  const usable = (Array.isArray(photos) ? photos : []).filter((p) => p && typeof p.footage_id === 'string' && p.footage_id && typeof p.url === 'string' && HTTPS_RE.test(p.url))
  if (usable.length === 0 || !Array.isArray(shots)) return shots
  let k = 0
  return shots.map((s) => {
    if (s.kind === 'user_video') return s
    const p = usable[k++ % usable.length]
    const out = { ...s, kind: 'text', source: 'client_photo', sourceFootageId: p.footage_id, imageUrl: p.url, referenceFootageIds: [], referenceUrls: [], scenePrompt: null, prompt: null, movementVariant: 0, cutStart: 0 } as AdsV2PlannedShot & { inHand?: unknown }
    delete out.effect
    delete out.presenterHolds
    delete out.inHand
    delete out.packshot
    return out
  })
}

// ── o custo ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Partes do custo (US$): voz MiniMax ~0,03 · recorte BiRefNet ≤0,01 (ADS_V2_CUTOUT_USD_MAX) · Creatomate ~0,13 · música (Lyria) 0,08 · texto (GPT) 0,01. */
export const ADS_V2_CLOSE_REAL_USD_PARTS = { voice: 0.03, cutout: 0.01, creatomate: 0.13, music: 0.08, gpt: 0.01 } as const
/** KINEO-CLOSE-REAL-1910 — o custo do anúncio (puro): nenhum motor de vídeo, nenhuma imagem gerada. */
export function adsV2CloseRealUsd(): { videoUsd: 0; imageUsd: 0; totalUsd: number } {
  const p = ADS_V2_CLOSE_REAL_USD_PARTS
  return { videoUsd: 0, imageUsd: 0, totalUsd: Math.round((p.voice + p.cutout + p.creatomate + p.music + p.gpt) * 1000) / 1000 }
}

// ── a montagem (Creatomate) ─────────────────────────────────────────────────────────────────────────────────────────
export interface AdV2CloseRealInput {
  width: number
  height: number
  /** O gancho: o PNG do produto recortado sobre o fundo na cor dele (lib/ads/v2CloseRealServer.ts). null = o recorte falhou: a foto real inteira (packshot). */
  heroUrl: string | null
  /** A foto real do produto (ou a 1ª foto): o gancho de reserva. */
  heroFallbackUrl: string
  /** As fotos reais dos planos, na ordem (cicla). */
  photos: readonly string[]
  /** As frases, na ordem (adsV2CloseRealPhrases limpa de novo aqui). */
  phrases: readonly string[]
  fontFamily: string
  cardUrl: string
  cardSeconds?: number
  musicUrl: string | null
  musicTrimStart?: number
  voiceUrl?: string | null
  voiceSeconds?: number | null
  /** A marca-d'água (só a amostra grátis). null/ausente = sem marca. */
  watermark?: string | null
}

const isHttps = (u: unknown): u is string => typeof u === 'string' && HTTPS_RE.test(u.trim())
const pos = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

/** KINEO-CLOSE-REAL-1910 — o `source` do Creatomate do Close real (puro). Só propriedades que a casa já usa em produção. Lança com o motivo. */
export function buildAdV2CloseRealSource(input: AdV2CloseRealInput): Record<string, unknown> {
  const r3 = (n: number) => Math.round(n * 1000) / 1000
  const { width, height } = input
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width % 2 || height % 2) throw new Error('ads_v2_close_real_bad_size')
  const photos = (Array.isArray(input.photos) ? input.photos : []).filter(isHttps).map((u) => u.trim())
  if (photos.length === 0) throw new Error('ads_v2_close_real_no_photos')
  if (!isHttps(input.heroFallbackUrl)) throw new Error('ads_v2_close_real_bad_hero')
  if (input.heroUrl !== null && input.heroUrl !== undefined && !isHttps(input.heroUrl)) throw new Error('ads_v2_close_real_bad_hero')
  if (!isHttps(input.cardUrl)) throw new Error('ads_v2_close_real_bad_card')
  const fontFamily = typeof input.fontFamily === 'string' && input.fontFamily.trim() ? input.fontFamily.trim() : ''
  if (!fontFamily) throw new Error('ads_v2_close_real_bad_font')
  const voiceUrl = input.voiceUrl ?? null
  const hasVoice = voiceUrl !== null && voiceUrl !== ''
  if (hasVoice && !isHttps(voiceUrl)) throw new Error('ads_v2_close_real_bad_voice')
  if (hasVoice && !pos(input.voiceSeconds)) throw new Error('ads_v2_close_real_voice_unmeasured')
  const t = adsV2CloseRealTimeline({ voiceSeconds: hasVoice ? input.voiceSeconds : null, cardSeconds: input.cardSeconds })
  if (!t) throw new Error(`ads_v2_close_real_voice_too_long:${r3(input.voiceSeconds ?? 0)}`)
  const T = ADS_V2_CLOSE_REAL_TRACKS
  const F = ADS_V2_MONTAGE_FADE
  const elements: Record<string, unknown>[] = []
  elements.push({ type: 'shape', track: T.bg, time: 0, duration: t.total, x: '50%', y: '50%', width: '100%', height: '100%', path: ADS_V2_RECT_PATH, fill_color: '#000000' })
  // 1. O gancho (0 → 3 s): o produto recortado sobre o fundo na cor dele, sem fade de entrada (o 1º quadro já é o anúncio).
  const hookDur = r3(t.hook + F)
  if (isHttps(input.heroUrl)) {
    elements.push({ type: 'image', track: T.shotA, time: 0, duration: hookDur, source: input.heroUrl.trim(), fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', animations: [{ type: 'scale', fade: false, start_scale: '100%', end_scale: ADS_V2_CLOSE_REAL_HOOK_ZOOM_END, x_anchor: '50%', y_anchor: '50%', easing: 'ease-out' }] })
  } else {
    elements.push(...adsV2PackshotElements(input.heroFallbackUrl, T.shotA, 0, hookDur))
  }
  // 2. Os planos das fotos reais: Ken Burns + punch-in no meio; trilhas alternadas para o dissolve cruzar de verdade.
  t.shots.forEach((d, k) => {
    const src = photos[k % photos.length]
    const track = k % 2 === 0 ? T.shotB : T.shotA
    const kb = ADS_V2_CLOSE_REAL_KEN_BURNS[k % ADS_V2_CLOSE_REAL_KEN_BURNS.length]
    const start = t.starts[k]
    const wide = r3(d * ADS_V2_CLOSE_REAL_PUNCH_AT)
    const tight = r3(d - wide + F) // o último pedaço fica F a mais por baixo do plano seguinte (ou do cartão)
    const frame = { fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%' }
    elements.push({ type: 'image', track, time: start, duration: wide, source: src, ...frame, enter_transition: { type: 'fade', duration: F }, animations: [{ type: 'scale', fade: false, start_scale: kb.from, end_scale: kb.to, x_anchor: kb.xAnchor, y_anchor: '50%', easing: 'ease-out' }] })
    elements.push({ type: 'image', track, time: r3(start + wide), duration: tight, source: src, ...frame, animations: [{ type: 'scale', fade: false, start_scale: ADS_V2_CLOSE_REAL_PUNCH_FROM, end_scale: ADS_V2_CLOSE_REAL_PUNCH_TO, x_anchor: kb.xAnchor, y_anchor: '50%', easing: 'ease-out' }] })
  })
  // 3. O cartão final (logo real), até o último quadro.
  const cardSeconds = r3(t.total - t.cardStart)
  elements.push({ type: 'image', track: T.card, time: t.cardStart, duration: cardSeconds, source: input.cardUrl.trim(), fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', enter_transition: { type: 'fade', duration: F } })
  // 4. As frases: uma por plano, no terço de cima da zona segura; a do gancho já no quadro 0.
  const phrases = adsV2CloseRealPhrases(input.phrases ?? []).slice(0, t.shots.length + 1)
  const slots = adsV2CloseRealPhraseSlots(phrases.length, t.shots.length)
  phrases.forEach((text, i) => {
    const slot = slots[i]
    if (slot === undefined) return
    const start = slot === 0 ? 0 : r3(t.starts[slot - 1] + 0.1)
    const end = slot === 0 ? t.hook : r3(t.starts[slot - 1] + t.shots[slot - 1])
    if (!(end > start)) return
    const geo = adsV2CloseRealOverlayGeometry(text, width, height)
    elements.push({ type: 'text', track: T.text, time: start, duration: r3(end - start), text, x: '50%', y: geo.y, x_anchor: '50%', y_anchor: geo.y_anchor, x_alignment: '50%', width: geo.width, font_family: fontFamily, font_size: geo.font_size, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.55)', stroke_width: 2, background_color: 'rgba(0,0,0,0.55)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 10, ...(slot === 0 ? {} : { enter_transition: { type: 'fade', duration: 0.2 } }) })
  })
  // 5. A marca-d'água (só a amostra grátis): o anúncio inteiro, pequena, centrada entre as frases e o produto.
  const wm = typeof input.watermark === 'string' ? input.watermark.trim() : ''
  if (wm) {
    elements.push({ type: 'text', track: T.watermark, time: 0, duration: t.total, text: wm, x: '50%', y: `${r3(ADS_V2_CLOSE_REAL_WATERMARK_BOTTOM * 100)}%`, x_anchor: '50%', y_anchor: '100%', x_alignment: '50%', width: '80%', font_family: fontFamily, font_size: Math.round((ADS_V2_CLOSE_REAL_WATERMARK_FONT_AT_1080 * width) / 1080), font_weight: '800', line_height: '110%', fill_color: '#ffffff', background_color: 'rgba(0,0,0,0.35)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 10 })
  }
  // 6. Voz (a partir de 0,3 s) e música com ducking: 25% sob a voz, sobe para 70% logo depois.
  if (hasVoice) elements.push({ type: 'audio', track: T.voice, time: ADS_V2_VOICE_START, duration: r3(input.voiceSeconds as number), source: (voiceUrl as string).trim(), volume: '100%' })
  if (input.musicUrl) {
    if (!isHttps(input.musicUrl)) throw new Error('ads_v2_close_real_bad_music')
    const trim = input.musicTrimStart ?? 0
    if (!(typeof trim === 'number' && Number.isFinite(trim) && trim >= 0)) throw new Error('ads_v2_close_real_bad_music_trim')
    const source = input.musicUrl.trim()
    // O Creatomate não aceita `loop` junto com `trim_start` no áudio (a lição do 2º canário, lib/ads/adV2Montage.ts): um OU outro.
    const musicEl = (time: number, duration: number, start: number, volume: string, fadeIn: number, fadeOut: number): Record<string, unknown> => ({ type: 'audio', track: T.music, time: r3(time), duration: r3(duration), source, volume, ...(start > 0 ? { trim_start: r3(start) } : { loop: true }), audio_fade_in: fadeIn, audio_fade_out: fadeOut })
    const rise = hasVoice ? r3(ADS_V2_VOICE_START + (input.voiceSeconds as number) + ADS_V2_MUSIC_RISE_AFTER_VOICE) : 0
    if (hasVoice && rise < t.total - 0.5) {
      elements.push(musicEl(0, rise, trim, ADS_V2_MUSIC_VOLUME_WITH_VOICE, 0.5, 0.3))
      elements.push(musicEl(rise, t.total - rise, trim + rise, ADS_V2_MUSIC_VOLUME_NO_VOICE, 0.6, 1))
    } else {
      elements.push(musicEl(0, t.total, trim, hasVoice ? ADS_V2_MUSIC_VOLUME_WITH_VOICE : ADS_V2_MUSIC_VOLUME_NO_VOICE, 0.5, 1))
    }
  }
  return { output_format: 'mp4', width, height, frame_rate: ADS_V2_FRAME_RATE, duration: t.total, snapshot_time: 1, elements }
}

// ── a escolha da tela (os formatos padrão) ──────────────────────────────────────────────────────────────────────────
/** KINEO-CLOSE-REAL-1910 — os formatos da tela: os 2 padrão (Apresentador e Close real) e o caminho antigo (estilos e cenas de IA) como opção avançada. */
export type AdsV2AdFormat = 'presenter' | 'close_real' | 'advanced'
export const ADS_V2_AD_FORMATS_DEFAULT: readonly AdsV2AdFormat[] = ['presenter', 'close_real']
/** O formato que a tela abre (puro): a amostra é SEMPRE o Close real; quem paga abre no Apresentador (com ele no ar), senão no Close real. */
export function adsV2DefaultAdFormat(i: { sample: boolean; presenterPublic: boolean }): AdsV2AdFormat {
  if (i.sample) return 'close_real'
  return i.presenterPublic ? 'presenter' : 'close_real'
}
/** O formato que vale (puro): a amostra não escolhe — é o Close real. */
export function adsV2EffectiveAdFormat(choice: AdsV2AdFormat | null | undefined, sample: boolean): AdsV2AdFormat {
  if (sample) return 'close_real'
  return choice === 'presenter' || choice === 'close_real' || choice === 'advanced' ? choice : 'presenter'
}

export interface AdsV2AdFormatCopy {
  title: string
  presenter: { name: string; line: string }
  close_real: { name: string; line: string }
  advanced: string
  advancedNote: string
  closeRealNote: string
}

export const ADS_V2_AD_FORMAT_COPY: Record<InterfaceLanguage, AdsV2AdFormatCopy> = {
  en: { title: 'Ad format', presenter: { name: 'Presenter', line: 'A person talks about your product, holding it.' }, close_real: { name: 'Real product close-up', line: 'Only your real photos, with camera moves. 100% faithful label.' }, advanced: 'Advanced: AI styles and scenes', advancedNote: 'AI styles and scenes can redraw details of the product.', closeRealNote: 'Vertical 9:16, 15 s. Your product is never redrawn by AI.' },
  pt: { title: 'Formato do anúncio', presenter: { name: 'Apresentador', line: 'Uma pessoa fala do seu produto com ele na mão.' }, close_real: { name: 'Close do produto real', line: 'Só as suas fotos reais, com movimento de câmera. Rótulo 100% fiel.' }, advanced: 'Avançado: estilos e cenas de IA', advancedNote: 'Estilos e cenas de IA podem redesenhar detalhes do produto.', closeRealNote: 'Vertical 9:16, 15 s. O produto nunca é redesenhado por IA.' },
  es: { title: 'Formato del anuncio', presenter: { name: 'Presentador', line: 'Una persona habla de tu producto con él en la mano.' }, close_real: { name: 'Primer plano del producto real', line: 'Solo tus fotos reales, con movimiento de cámara. Etiqueta 100% fiel.' }, advanced: 'Avanzado: estilos y escenas de IA', advancedNote: 'Los estilos y escenas de IA pueden redibujar detalles del producto.', closeRealNote: 'Vertical 9:16, 15 s. La IA nunca redibuja tu producto.' },
  fr: { title: 'Format de la pub', presenter: { name: 'Présentateur', line: 'Une personne parle de votre produit en le tenant.' }, close_real: { name: 'Gros plan du vrai produit', line: 'Uniquement vos vraies photos, avec des mouvements de caméra. Étiquette 100 % fidèle.' }, advanced: 'Avancé : styles et scènes IA', advancedNote: 'Les styles et scènes IA peuvent redessiner des détails du produit.', closeRealNote: 'Vertical 9:16, 15 s. Votre produit n’est jamais redessiné par l’IA.' },
  de: { title: 'Anzeigenformat', presenter: { name: 'Sprecher', line: 'Eine Person spricht über dein Produkt und hält es in der Hand.' }, close_real: { name: 'Nahaufnahme des echten Produkts', line: 'Nur deine echten Fotos, mit Kamerabewegung. Etikett 100 % originalgetreu.' }, advanced: 'Erweitert: KI-Stile und -Szenen', advancedNote: 'KI-Stile und -Szenen können Details des Produkts neu zeichnen.', closeRealNote: 'Hochformat 9:16, 15 s. Dein Produkt wird nie von KI neu gezeichnet.' },
  it: { title: 'Formato dell’annuncio', presenter: { name: 'Presentatore', line: 'Una persona parla del tuo prodotto tenendolo in mano.' }, close_real: { name: 'Primo piano del prodotto reale', line: 'Solo le tue foto reali, con movimenti di camera. Etichetta fedele al 100%.' }, advanced: 'Avanzato: stili e scene IA', advancedNote: 'Stili e scene IA possono ridisegnare dettagli del prodotto.', closeRealNote: 'Verticale 9:16, 15 s. Il prodotto non viene mai ridisegnato dall’IA.' },
  nl: { title: 'Advertentieformaat', presenter: { name: 'Presentator', line: 'Iemand vertelt over je product en houdt het vast.' }, close_real: { name: 'Close-up van het echte product', line: 'Alleen je echte foto’s, met camerabeweging. Etiket 100% getrouw.' }, advanced: 'Geavanceerd: AI-stijlen en -scènes', advancedNote: 'AI-stijlen en -scènes kunnen details van het product hertekenen.', closeRealNote: 'Verticaal 9:16, 15 s. Je product wordt nooit door AI hertekend.' },
  pl: { title: 'Format reklamy', presenter: { name: 'Prezenter', line: 'Osoba mówi o Twoim produkcie, trzymając go w ręce.' }, close_real: { name: 'Zbliżenie prawdziwego produktu', line: 'Tylko Twoje prawdziwe zdjęcia, z ruchem kamery. Etykieta w 100% wierna.' }, advanced: 'Zaawansowane: style i sceny AI', advancedNote: 'Style i sceny AI mogą przerysować szczegóły produktu.', closeRealNote: 'Pionowo 9:16, 15 s. AI nigdy nie przerysowuje produktu.' },
  tr: { title: 'Reklam formatı', presenter: { name: 'Sunucu', line: 'Bir kişi ürününü elinde tutarak anlatır.' }, close_real: { name: 'Gerçek ürün yakın çekimi', line: 'Yalnızca gerçek fotoğrafların, kamera hareketiyle. Etiket %100 aslına uygun.' }, advanced: 'Gelişmiş: yapay zekâ stilleri ve sahneleri', advancedNote: 'Yapay zekâ stilleri ve sahneleri ürünün ayrıntılarını yeniden çizebilir.', closeRealNote: 'Dikey 9:16, 15 sn. Ürünün asla yapay zekâ ile yeniden çizilmez.' },
  ru: { title: 'Формат рекламы', presenter: { name: 'Ведущий', line: 'Человек рассказывает о товаре, держа его в руке.' }, close_real: { name: 'Крупный план реального товара', line: 'Только ваши реальные фото с движением камеры. Этикетка на 100% как в жизни.' }, advanced: 'Расширенно: ИИ-стили и сцены', advancedNote: 'ИИ-стили и сцены могут перерисовать детали товара.', closeRealNote: 'Вертикально 9:16, 15 с. ИИ никогда не перерисовывает ваш товар.' },
  uk: { title: 'Формат реклами', presenter: { name: 'Ведучий', line: 'Людина розповідає про товар, тримаючи його в руці.' }, close_real: { name: 'Великий план справжнього товару', line: 'Лише ваші справжні фото з рухом камери. Етикетка на 100% як у житті.' }, advanced: 'Розширено: ШІ-стилі та сцени', advancedNote: 'ШІ-стилі та сцени можуть перемалювати деталі товару.', closeRealNote: 'Вертикально 9:16, 15 с. ШІ ніколи не перемальовує ваш товар.' },
  ar: { title: 'شكل الإعلان', presenter: { name: 'مقدّم', line: 'شخص يتحدث عن منتجك وهو يحمله.' }, close_real: { name: 'لقطة قريبة للمنتج الحقيقي', line: 'صورك الحقيقية فقط مع حركة كاميرا. الملصق مطابق 100%.' }, advanced: 'متقدم: أنماط ومشاهد بالذكاء الاصطناعي', advancedNote: 'قد تعيد أنماط ومشاهد الذكاء الاصطناعي رسم تفاصيل المنتج.', closeRealNote: 'عمودي 9:16، 15 ثانية. لا يعيد الذكاء الاصطناعي رسم منتجك أبدًا.' },
  ur: { title: 'اشتہار کا فارمیٹ', presenter: { name: 'پریزینٹر', line: 'ایک شخص آپ کا پروڈکٹ ہاتھ میں لے کر اس کے بارے میں بات کرتا ہے۔' }, close_real: { name: 'اصل پروڈکٹ کا کلوز اپ', line: 'صرف آپ کی اصل تصاویر، کیمرے کی حرکت کے ساتھ۔ لیبل 100% درست۔' }, advanced: 'ایڈوانسڈ: AI اسٹائلز اور مناظر', advancedNote: 'AI اسٹائلز اور مناظر پروڈکٹ کی تفصیلات دوبارہ بنا سکتے ہیں۔', closeRealNote: 'عمودی 9:16، 15 سیکنڈ۔ AI آپ کا پروڈکٹ کبھی دوبارہ نہیں بناتا۔' },
  hi: { title: 'विज्ञापन फ़ॉर्मैट', presenter: { name: 'प्रेज़ेंटर', line: 'एक व्यक्ति आपका प्रोडक्ट हाथ में लेकर उसके बारे में बताता है।' }, close_real: { name: 'असली प्रोडक्ट का क्लोज़-अप', line: 'सिर्फ़ आपकी असली फ़ोटो, कैमरा मूवमेंट के साथ। लेबल 100% असली।' }, advanced: 'एडवांस्ड: AI स्टाइल और सीन', advancedNote: 'AI स्टाइल और सीन प्रोडक्ट की बारीकियाँ दोबारा बना सकते हैं।', closeRealNote: 'वर्टिकल 9:16, 15 सेकंड। AI आपका प्रोडक्ट कभी दोबारा नहीं बनाता।' },
  id: { title: 'Format iklan', presenter: { name: 'Presenter', line: 'Seseorang membicarakan produkmu sambil memegangnya.' }, close_real: { name: 'Close-up produk asli', line: 'Hanya foto aslimu, dengan gerakan kamera. Label 100% sesuai.' }, advanced: 'Lanjutan: gaya dan adegan AI', advancedNote: 'Gaya dan adegan AI bisa menggambar ulang detail produk.', closeRealNote: 'Vertikal 9:16, 15 dtk. Produkmu tidak pernah digambar ulang oleh AI.' },
  vi: { title: 'Định dạng quảng cáo', presenter: { name: 'Người dẫn', line: 'Một người cầm sản phẩm và nói về nó.' }, close_real: { name: 'Cận cảnh sản phẩm thật', line: 'Chỉ ảnh thật của bạn, có chuyển động máy quay. Nhãn đúng 100%.' }, advanced: 'Nâng cao: phong cách và cảnh AI', advancedNote: 'Phong cách và cảnh AI có thể vẽ lại chi tiết sản phẩm.', closeRealNote: 'Dọc 9:16, 15 giây. AI không bao giờ vẽ lại sản phẩm của bạn.' },
}

/** Frases da escolha de formato na língua da interface (língua desconhecida = inglês). */
export function adsV2AdFormatCopy(lang: InterfaceLanguage | string | null | undefined): AdsV2AdFormatCopy {
  return (typeof lang === 'string' && (ADS_V2_AD_FORMAT_COPY as Record<string, AdsV2AdFormatCopy>)[lang]) || ADS_V2_AD_FORMAT_COPY.en
}
