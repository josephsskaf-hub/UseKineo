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
// KINEO-CLOSE-REAL-AJUSTE-1910 — AJUSTE pós-canário (de1c0d72): as frases viraram LEGENDAS no tempo da voz (adsV2CloseRealCaptions: 1 por plano, sem buraco),
// KINEO-CLOSE-REAL-AJUSTE-1910 — maiores (4,5% da altura), o gancho com zoom 100→112%, a foto do gancho no FIM dos planos e o cartão próprio (nome + chamada).
// VOZ: a voz por língua do apresentador v2 (PT-BR = Portuguese_ConfidentWoman na fal-ai/minimax/speech-2.8-hd); música com ducking (25% sob a
// voz, 70% depois). AMOSTRA GRÁTIS (lib/ads/sample.ts): este é o ÚNICO formato da amostra, e ela sai com marca-d'água.
// CUSTO-ALVO ≈ US$ 0,30: voz ~0,03 + recorte ≤0,01 + Creatomate ~0,13 + música 0,08 + texto 0,01 (adsV2CloseRealUsd).
//
// LIB PURA (só `import type` e a montagem pura lib/ads/adV2Montage.ts): roda no navegador (a escolha da tela) e no guardião
// scripts/test-close-real-1910.mjs. O lado servidor (recorte + fundo) mora em lib/ads/v2CloseRealServer.ts.
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import type { AdsV2PlannedShot } from '@/lib/ads/v2ShotLists'
import { ADS_V2_FRAME_RATE, ADS_V2_MONTAGE_FADE, ADS_V2_OVERLAY_LINE_HEIGHT, ADS_V2_OVERLAY_PILL_PAD, ADS_V2_OVERLAY_WIDTH, ADS_V2_RECT_PATH, ADS_V2_SAFE_BOTTOM, ADS_V2_SAFE_TOP, ADS_V2_VOICE_START, ADS_V2_MUSIC_VOLUME_NO_VOICE, ADS_V2_MUSIC_VOLUME_WITH_VOICE, ADS_V2_MUSIC_RISE_AFTER_VOICE, adsV2OverlayFontSize, adsV2OverlayLines, adsV2PackshotElements, ADS_V2_OVERLAY_CHAR_EM } from '@/lib/ads/adV2Montage' // KINEO-CLOSE-REAL-AJUSTE-1910 — + ADS_V2_OVERLAY_CHAR_EM (a quebra das legendas maiores)

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
export const ADS_V2_CLOSE_REAL_HOOK_ZOOM_END = '112%' // KINEO-CLOSE-REAL-AJUSTE-1910 — canário de1c0d72: 100→106% em 3 s parecia foto parada (YDIF 0,09); 112% com ease se vê
/** KINEO-CLOSE-REAL-AJUSTE-1910 — o zoom do gancho cresce a partir do TOPO do produto (a borda de cima fica parada: o produto nunca sobe para dentro das legendas). */
export const ADS_V2_CLOSE_REAL_HOOK_ZOOM_EASING = 'ease-in-out' // KINEO-CLOSE-REAL-AJUSTE-1910

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

// ── KINEO-CLOSE-REAL-AJUSTE-1910 — as LEGENDAS em sincronia com a voz (canário de1c0d72, 19/10: só 2 frases, a 2ª 8 s depois da fala e a tela
// KINEO-CLOSE-REAL-AJUSTE-1910 — vazia de 3,0 a 11,3 s). Agora: 1 frase curta por plano (gancho + 3 planos = até 4), cada uma entrando quando a voz
// KINEO-CLOSE-REAL-AJUSTE-1910 — começa a dizê-la. A voz não tem marca de tempo por palavra: o tempo de cada palavra sai da PROPORÇÃO de caracteres
// KINEO-CLOSE-REAL-AJUSTE-1910 — da narração sobre a duração medida da voz (com a pausa do ponto e da vírgula), como o resto da casa faz. A divisão
// KINEO-CLOSE-REAL-AJUSTE-1910 — em frases procura o ponto final, depois a vírgula, e o corte de plano mais perto; as janelas cobrem o anúncio
// KINEO-CLOSE-REAL-AJUSTE-1910 — inteiro (nenhum plano sem frase). A frase do gancho é o título que o Ads já escreve (com " · " no lugar do travessão).
// KINEO-CLOSE-REAL-AJUSTE-1910 — Tamanho de anúncio (legenda UGC do Meta/TikTok): fonte de 4,5% da altura, negrito, pílula escura, até 5 palavras
// KINEO-CLOSE-REAL-AJUSTE-1910 — por linha, dentro da zona segura (14–65%) e sempre ACIMA do produto do gancho.
/** KINEO-CLOSE-REAL-AJUSTE-1910 — a fonte da legenda em fração da ALTURA do quadro (86 px em 1920): o teto e o piso. */
export const ADS_V2_CLOSE_REAL_CAPTION_FONT = 0.045 // KINEO-CLOSE-REAL-AJUSTE-1910
export const ADS_V2_CLOSE_REAL_CAPTION_FONT_MIN = 0.036 // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — até 3 linhas na fonte cheia e 5 palavras por linha; a largura da caixa (fração da largura). */
export const ADS_V2_CLOSE_REAL_CAPTION_MAX_LINES = 3 // KINEO-CLOSE-REAL-AJUSTE-1910
export const ADS_V2_CLOSE_REAL_CAPTION_LINE_WORDS = 5 // KINEO-CLOSE-REAL-AJUSTE-1910
export const ADS_V2_CLOSE_REAL_CAPTION_WIDTH = 0.9 // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — palavras de uma legenda tirada da fala (frase curta: cabe em 2–3 linhas; 4 só na fonte mínima, ainda acima do produto). */
export const ADS_V2_CLOSE_REAL_CAPTION_MAX_CHARS = 54 // KINEO-CLOSE-REAL-AJUSTE-1910 — e no máximo ~54 caracteres (3 linhas de ~18 na fonte cheia): palavra comprida divide melhor a fala
export const ADS_V2_CLOSE_REAL_CAPTION_MAX_WORDS = 10 // KINEO-CLOSE-REAL-AJUSTE-1910 — uma frase falada inteira de anúncio de 15 s (30 palavras em 4 planos ≈ 7,5)
/** KINEO-CLOSE-REAL-AJUSTE-1910 — o topo da legenda (fração da altura): a marca-d'água da amostra mora entre 14% e este número. */
export const ADS_V2_CLOSE_REAL_CAPTION_TOP = 0.175 // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — a troca de legenda que cai a até 0,35 s de um corte de plano entra NO corte (o olho lê os dois juntos). */
export const ADS_V2_CLOSE_REAL_CAPTION_SNAP = 0.35 // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — o menor tempo de uma legenda na tela (s). */
export const ADS_V2_CLOSE_REAL_CAPTION_MIN_SECONDS = 0.8 // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — a marca-d'água da amostra: presa pelo TOPO em 14% (logo acima das legendas, nunca sobre o produto). */
export const ADS_V2_CLOSE_REAL_WATERMARK_TOP = 0.14 // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — o travessão/hífen entre dois pedaços vira " · " ("Perfume LUME - Fragrâncias" → "Perfume LUME · Fragrâncias"); "9 - 18h" fica. Pura. */
export function adsV2CloseRealDash(text: string): string { // KINEO-CLOSE-REAL-AJUSTE-1910
  return String(text ?? '').replace(/(\p{L})\s+[-–—]\s+(?=\p{L})/gu, (_all: string, a: string) => a + ' · ').replace(/\s+/g, ' ').trim() // KINEO-CLOSE-REAL-AJUSTE-1910
} // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — as linhas da legenda (quebra por palavra, estimada): cabe na largura E no máximo 5 palavras por linha. Pura. */
export function adsV2CloseRealCaptionLines(text: string, fontPx: number, frameW: number): string[] { // KINEO-CLOSE-REAL-AJUSTE-1910
  const perLine = Math.max(4, Math.floor((frameW * ADS_V2_CLOSE_REAL_CAPTION_WIDTH * 0.94) / (fontPx * ADS_V2_OVERLAY_CHAR_EM))) // KINEO-CLOSE-REAL-AJUSTE-1910 — 94%: a pílula come 3% de cada lado
  const lines: string[][] = [] // KINEO-CLOSE-REAL-AJUSTE-1910
  for (const word of String(text ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)) { // KINEO-CLOSE-REAL-AJUSTE-1910
    const last = lines.length ? lines[lines.length - 1] : null // KINEO-CLOSE-REAL-AJUSTE-1910
    if (last && last.length < ADS_V2_CLOSE_REAL_CAPTION_LINE_WORDS && [...last, word].join(' ').length <= perLine) last.push(word) // KINEO-CLOSE-REAL-AJUSTE-1910
    else lines.push([word]) // KINEO-CLOSE-REAL-AJUSTE-1910
  } // KINEO-CLOSE-REAL-AJUSTE-1910
  return lines.map((l) => l.join(' ')) // KINEO-CLOSE-REAL-AJUSTE-1910
} // KINEO-CLOSE-REAL-AJUSTE-1910
// KINEO-CLOSE-REAL-AJUSTE-1910 — o lugar e o tamanho da legenda: a maior fonte (4,5% → 3,6% da altura) em que ela cabe em 3 linhas.
// KINEO-CLOSE-REAL-AJUSTE-1910 — Presa pela BASE (y_anchor 100%); o topo em ADS_V2_CLOSE_REAL_CAPTION_TOP (abaixo da marca-d'água da amostra). Pura.
export function adsV2CloseRealCaptionGeometry(text: string, frameW: number, frameH: number): { y: string; y_anchor: string; width: string; font_size: number; lines: number; box: AdsV2CloseRealTextBox } { // KINEO-CLOSE-REAL-AJUSTE-1910
  const r4 = (n: number) => Math.round(n * 10000) / 10000 // KINEO-CLOSE-REAL-AJUSTE-1910
  const sizes: number[] = [] // KINEO-CLOSE-REAL-AJUSTE-1910
  for (let f = ADS_V2_CLOSE_REAL_CAPTION_FONT; f >= ADS_V2_CLOSE_REAL_CAPTION_FONT_MIN - 1e-9; f -= 0.0015) sizes.push(Math.round(f * frameH)) // KINEO-CLOSE-REAL-AJUSTE-1910
  const fit = (max: number) => sizes.find((px) => adsV2CloseRealCaptionLines(text, px, frameW).length <= max) // KINEO-CLOSE-REAL-AJUSTE-1910
  const fontPx = fit(ADS_V2_CLOSE_REAL_CAPTION_MAX_LINES) ?? sizes[sizes.length - 1] // KINEO-CLOSE-REAL-AJUSTE-1910 — o MESMO tamanho em todas as legendas (4,5%); só desce se a frase passar de 3 linhas
  const wrapped = adsV2CloseRealCaptionLines(text, fontPx, frameW) // KINEO-CLOSE-REAL-AJUSTE-1910 — nenhuma palavra cortada: a legenda nasce com ≤ 10 palavras (no pior caso, 4 linhas na fonte mínima)
  const lineH = (fontPx * ADS_V2_OVERLAY_LINE_HEIGHT) / frameH // KINEO-CLOSE-REAL-AJUSTE-1910
  const top = ADS_V2_CLOSE_REAL_CAPTION_TOP // KINEO-CLOSE-REAL-AJUSTE-1910
  const bottom = top + ADS_V2_OVERLAY_PILL_PAD + wrapped.length * lineH // KINEO-CLOSE-REAL-AJUSTE-1910
  return { y: `${r4(bottom * 100)}%`, y_anchor: '100%', width: `${r4(ADS_V2_CLOSE_REAL_CAPTION_WIDTH * 100)}%`, font_size: fontPx, lines: wrapped.length, box: { top: r4(top), bottom: r4(bottom + ADS_V2_OVERLAY_PILL_PAD) } } // KINEO-CLOSE-REAL-AJUSTE-1910
} // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — uma legenda: o texto, a janela na tela e quando a voz começa a dizê-la (null = sem voz). */
export interface AdsV2CloseRealCaption { text: string; start: number; end: number; spokenAt: number | null } // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — o fim da legenda sem o ponto/vírgula solto ("…para você." → "…para você"; "!" e "?" ficam). Pura. */
function captionText(words: readonly string[]): string { // KINEO-CLOSE-REAL-AJUSTE-1910
  return words.join(' ').replace(/[.,;:…]+$/u, '').trim() // KINEO-CLOSE-REAL-AJUSTE-1910
} // KINEO-CLOSE-REAL-AJUSTE-1910
// KINEO-CLOSE-REAL-AJUSTE-1910 — as legendas do anúncio (puro). Com narração e voz medida: a fala dividida em até 1 frase por plano (programação
// KINEO-CLOSE-REAL-AJUSTE-1910 — dinâmica: corta no ponto final > vírgula > palavra, perto do corte de plano, ≤ 8 palavras), cada uma entrando quando a voz a começa; a do gancho é
// KINEO-CLOSE-REAL-AJUSTE-1910 — o título (`headline`) quando existe. Sem voz: as frases de tela (`overlays`) repartidas pelos planos. As janelas cobrem [0, fim dos planos] sem buraco.
export function adsV2CloseRealCaptions(i: { narration?: string | null; voiceSeconds?: number | null; headline?: string | null; overlays?: readonly (string | null | undefined)[] | null; timeline: AdsV2CloseRealTimeline }): AdsV2CloseRealCaption[] { // KINEO-CLOSE-REAL-AJUSTE-1910
  const r3 = (n: number) => Math.round(n * 1000) / 1000 // KINEO-CLOSE-REAL-AJUSTE-1910
  const t = i.timeline // KINEO-CLOSE-REAL-AJUSTE-1910
  const planStarts = [0, ...t.starts] // KINEO-CLOSE-REAL-AJUSTE-1910
  const P = planStarts.length // KINEO-CLOSE-REAL-AJUSTE-1910
  const cuts = planStarts.slice(1) // KINEO-CLOSE-REAL-AJUSTE-1910
  const clean = (s: unknown): string => adsV2CloseRealPhrases([adsV2CloseRealDash(typeof s === 'string' ? s : '')])[0] ?? '' // KINEO-CLOSE-REAL-AJUSTE-1910 — sem palavra repetida colada e sem travessão colando dois pedaços
  const words = String(i.narration ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean) // KINEO-CLOSE-REAL-AJUSTE-1910
  const vs = typeof i.voiceSeconds === 'number' && Number.isFinite(i.voiceSeconds) && i.voiceSeconds > 0 ? i.voiceSeconds : 0 // KINEO-CLOSE-REAL-AJUSTE-1910
  if (words.length >= 2 && vs > 0) { // KINEO-CLOSE-REAL-AJUSTE-1910
    // KINEO-CLOSE-REAL-AJUSTE-1910 — 1. o tempo de cada palavra: proporção de caracteres (+ a pausa do ponto e da vírgula) sobre a voz medida, a partir de 0,3 s.
    const weight = words.map((w) => w.length + 1 + (/[.!?…]$/u.test(w) ? 4 : /[,;:]$/u.test(w) ? 2 : 0)) // KINEO-CLOSE-REAL-AJUSTE-1910
    const total = weight.reduce((a, b) => a + b, 0) // KINEO-CLOSE-REAL-AJUSTE-1910
    const at: number[] = [] // KINEO-CLOSE-REAL-AJUSTE-1910
    let acc = 0 // KINEO-CLOSE-REAL-AJUSTE-1910
    for (const w of weight) { at.push(ADS_V2_VOICE_START + (vs * acc) / total); acc += w } // KINEO-CLOSE-REAL-AJUSTE-1910
    // KINEO-CLOSE-REAL-AJUSTE-1910 — 2. a divisão em K frases (K = planos, ou menos se a fala é curta) que minimiza: tamanho fora do alvo, corte fora de pontuação, distância ao corte de plano.
    const n = words.length // KINEO-CLOSE-REAL-AJUSTE-1910
    const K = Math.max(1, Math.min(Math.max(P, Math.ceil(words.join(' ').length / ADS_V2_CLOSE_REAL_CAPTION_MAX_CHARS)), 2 * P, Math.floor(n / 2))) // KINEO-CLOSE-REAL-AJUSTE-1910 — 1 por plano; mais só se a fala for longa demais para caber (palavras compridas), nunca frase de 1 palavra só
    const target = n / K // KINEO-CLOSE-REAL-AJUSTE-1910
    const endPenalty = (b: number) => (b >= n ? 0 : /[.!?…]$/u.test(words[b - 1]) ? 0 : /[,;:]$/u.test(words[b - 1]) ? 2 : 8) // KINEO-CLOSE-REAL-AJUSTE-1910 — corta no ponto final; depois na vírgula; no meio da frase, só sem outro jeito
    const innerStops = (a: number, b: number) => { let k = 0; for (let x = a; x < b - 1; x++) if (/[.!?…]$/u.test(words[x])) k++; return k } // KINEO-CLOSE-REAL-AJUSTE-1910 — duas frases faladas coladas numa legenda
    const cost = (j: number, a: number, b: number) => { const len = b - a; return 50 * Math.max(0, len - ADS_V2_CLOSE_REAL_CAPTION_MAX_WORDS) + (len < 2 ? 50 : 0) + 0.3 * (len - target) ** 2 + endPenalty(b) + 3 * innerStops(a, b) + 0.5 * Math.max(0, words.slice(a, b).join(' ').length - ADS_V2_CLOSE_REAL_CAPTION_MAX_CHARS) + (j > 0 && j < P ? 2.5 * Math.abs(at[a] - planStarts[j]) : 0) } // KINEO-CLOSE-REAL-AJUSTE-1910
    const best: number[][] = Array.from({ length: K + 1 }, () => Array(n + 1).fill(Infinity)) // KINEO-CLOSE-REAL-AJUSTE-1910
    const from: number[][] = Array.from({ length: K + 1 }, () => Array(n + 1).fill(-1)) // KINEO-CLOSE-REAL-AJUSTE-1910
    best[0][0] = 0 // KINEO-CLOSE-REAL-AJUSTE-1910
    for (let j = 0; j < K; j++) for (let a = 0; a < n; a++) { if (!Number.isFinite(best[j][a])) continue; for (let b = a + 1; b <= n; b++) { const c = best[j][a] + cost(j, a, b); if (c < best[j + 1][b]) { best[j + 1][b] = c; from[j + 1][b] = a } } } // KINEO-CLOSE-REAL-AJUSTE-1910
    const bounds: number[] = [n] // KINEO-CLOSE-REAL-AJUSTE-1910
    for (let j = K, b = n; j > 0; j--) { b = from[j][b]; bounds.unshift(b) } // KINEO-CLOSE-REAL-AJUSTE-1910
    // KINEO-CLOSE-REAL-AJUSTE-1910 — 3. as janelas: cada frase entra quando a voz a começa (no corte de plano, se cair a até 0,35 s dele); a 1ª no quadro 0; a última até o cartão.
    const spoken = bounds.slice(0, K).map((a) => r3(at[a])) // KINEO-CLOSE-REAL-AJUSTE-1910
    const starts = spoken.map((s, j) => { if (j === 0) return 0; const near = cuts.reduce((m, c) => (Math.abs(c - s) < Math.abs(m - s) ? c : m), Infinity); return Math.abs(near - s) <= ADS_V2_CLOSE_REAL_CAPTION_SNAP ? near : s }) // KINEO-CLOSE-REAL-AJUSTE-1910
    for (let j = 1; j < K; j++) starts[j] = r3(Math.min(Math.max(starts[j], starts[j - 1] + ADS_V2_CLOSE_REAL_CAPTION_MIN_SECONDS), t.content - ADS_V2_CLOSE_REAL_CAPTION_MIN_SECONDS * (K - j))) // KINEO-CLOSE-REAL-AJUSTE-1910
    const headline = clean(i.headline) // KINEO-CLOSE-REAL-AJUSTE-1910
    return bounds.slice(0, K).map((a, j) => ({ text: j === 0 && headline ? headline : clean(captionText(words.slice(a, bounds[j + 1]))), start: starts[j], end: j === K - 1 ? t.content : starts[j + 1], spokenAt: spoken[j] })).reduce<AdsV2CloseRealCaption[]>((out, c) => { if (c.text) out.push(c); else if (out.length) out[out.length - 1].end = c.end; return out }, []) // KINEO-CLOSE-REAL-AJUSTE-1910 — legenda vazia (rara) = a anterior fica até o fim dela: nenhum buraco
  } // KINEO-CLOSE-REAL-AJUSTE-1910
  // KINEO-CLOSE-REAL-AJUSTE-1910 — Sem voz: as frases de tela, cada uma num bloco de planos seguidos (n frases em P planos), sem buraco.
  const phrases = adsV2CloseRealPhrases((Array.isArray(i.overlays) ? i.overlays : []).map((o) => adsV2CloseRealDash(typeof o === 'string' ? o : ''))).slice(0, P) // KINEO-CLOSE-REAL-AJUSTE-1910
  const ends = [...cuts, t.content] // KINEO-CLOSE-REAL-AJUSTE-1910
  return phrases.map((text, k) => { const p0 = Math.floor((k * P) / phrases.length), p1 = Math.floor(((k + 1) * P) / phrases.length) - 1; return { text, start: planStarts[p0], end: ends[p1], spokenAt: null } }) // KINEO-CLOSE-REAL-AJUSTE-1910
} // KINEO-CLOSE-REAL-AJUSTE-1910
// ── KINEO-CLOSE-REAL-V3-1910 — RODADA 3 (canário v2 ddb44e546, 19/10: docs/RESULTADO-CANARIO-CLOSE-REAL-V2-2026-10-19.md). O que o espectador viu:
// KINEO-CLOSE-REAL-V3-1910 — (a) a legenda cortava a frase no meio ("…de Perfume LUME e sinta" | "a fragrância que encanta a todos. Para você", a 2ª em
// KINEO-CLOSE-REAL-V3-1910 — minúscula; EN "inviting you to experience…"); (b) a pílula cobria a tampa do frasco nas fotos B e C; (c) " ·" sobrando no fim
// KINEO-CLOSE-REAL-V3-1910 — da 1ª linha do título; (d) "Shop now" como etiqueta minúscula. Agora: cada legenda é UMA frase falada inteira (a que passa de
// KINEO-CLOSE-REAL-V3-1910 — 2 linhas é encurtada no fim de uma oração — vírgula, conjunção — e nunca vira 2 pedaços); a legenda mora acima do produto e,
// KINEO-CLOSE-REAL-V3-1910 — quando ele ocupa o alto do quadro, abaixo dele (até 65%, depois até 80%); o título quebra NO separador; a chamada é um botão.
/** KINEO-CLOSE-REAL-V3-1910 — no máximo 2 linhas por legenda; a fonte pode descer até 4% da altura (abaixo disso a frase falada é encurtada). */
export const ADS_V2_CLOSE_REAL_CAPTION_LINES_MAX = 2 // KINEO-CLOSE-REAL-V3-1910
export const ADS_V2_CLOSE_REAL_CAPTION_FONT_FLOOR = 0.04 // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — a folga entre a pílula e o produto, e o limite de baixo da legenda quando ela desce para baixo do produto (acima da UI do app). */
export const ADS_V2_CLOSE_REAL_CAPTION_PRODUCT_GAP = 0.015 // KINEO-CLOSE-REAL-V3-1910
export const ADS_V2_CLOSE_REAL_CAPTION_LOW_MAX = 0.8 // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — pedaço de legenda menor que isto (a legenda atravessou o corte por um triz) não muda de lugar sozinho: junta com o vizinho. */
export const ADS_V2_CLOSE_REAL_CAPTION_MIN_SEGMENT = 0.3 // KINEO-CLOSE-REAL-V3-1910
export const ADS_V2_CLOSE_REAL_CAPTION_SNAP_V3 = 0.5 // KINEO-CLOSE-REAL-V3-1910 — a troca de legenda a até 0,5 s de um corte entra NO corte (era 0,35 s): sem pedaço de meio segundo da legenda no lugar do plano vizinho
/** KINEO-CLOSE-REAL-V3-1910 — a caixa do produto em frações do QUADRO (ou da foto). */
export interface AdsV2CloseRealBox { x0: number; y0: number; x1: number; y1: number } // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — a caixa do produto numa FOTO: o tamanho da foto (px) e a caixa em frações dela (o recorte BiRefNet sem aparar). */
export interface AdsV2CloseRealPhotoBox extends AdsV2CloseRealBox { w: number; h: number } // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — as linhas da legenda respeitando a quebra pedida ("\n" do título) e, dentro de cada uma, a quebra por palavra do ajuste. Pura. */
export function adsV2CloseRealCaptionLines2(text: string, fontPx: number, frameW: number): string[] { // KINEO-CLOSE-REAL-V3-1910
  return String(text ?? '').split('\n').map((l) => l.trim()).filter(Boolean).flatMap((l) => adsV2CloseRealCaptionLines(l, fontPx, frameW)) // KINEO-CLOSE-REAL-V3-1910
} // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — a maior fonte (4,5% → 3,6% da altura) em que a legenda cabe em 2 linhas; `floor` = cabe sem descer de 4%. Sem caber = a mínima. Pura. */
export function adsV2CloseRealCaptionFit(text: string, frameW: number, frameH: number): { fontPx: number; lines: string[]; floor: boolean } { // KINEO-CLOSE-REAL-V3-1910
  const sizes: number[] = [] // KINEO-CLOSE-REAL-V3-1910
  for (let f = ADS_V2_CLOSE_REAL_CAPTION_FONT; f >= ADS_V2_CLOSE_REAL_CAPTION_FONT_MIN - 1e-9; f -= 0.0015) sizes.push(Math.round(f * frameH)) // KINEO-CLOSE-REAL-V3-1910 — a MESMA escada de fontes do ajuste
  const floorPx = Math.round(ADS_V2_CLOSE_REAL_CAPTION_FONT_FLOOR * frameH) // KINEO-CLOSE-REAL-V3-1910
  for (const px of sizes) { const lines = adsV2CloseRealCaptionLines2(text, px, frameW); if (lines.length <= ADS_V2_CLOSE_REAL_CAPTION_LINES_MAX) return { fontPx: px, lines, floor: px >= floorPx } } // KINEO-CLOSE-REAL-V3-1910
  const px = sizes[sizes.length - 1] // KINEO-CLOSE-REAL-V3-1910
  return { fontPx: px, lines: adsV2CloseRealCaptionLines2(text, px, frameW), floor: false } // KINEO-CLOSE-REAL-V3-1910
} // KINEO-CLOSE-REAL-V3-1910
// ── KINEO-CLOSE-REAL-LEGENDA-1910 — TAMANHO E ESTILO DA LEGENDA DA FALA (fundador 19/10, nota 8,5: "achei a legenda um pouco grande"; pesquisa de mercado em
// KINEO-CLOSE-REAL-LEGENDA-1910 — docs/PESQUISA-TAMANHO-LEGENDA-ADS-2026-10-19.md: a legenda falada de Arcads/Creatify mora em 2,5–3,5% da altura, o gancho em 3,5–5%;
// KINEO-CLOSE-REAL-LEGENDA-1910 — nós púnhamos 4,5% em TODAS = tamanho de gancho na fala inteira). Agora: a fala em 3,6% da altura (69 px em 1920), até 4 palavras
// KINEO-CLOSE-REAL-LEGENDA-1910 — por linha e 2 linhas (frase maior = encurtada no fim de uma oração, como na rodada 3: nunca um pedaço do meio), branca com
// KINEO-CLOSE-REAL-LEGENDA-1910 — CONTORNO preto e SEM a pílula escura (o contorno some sobre o produto e mostra mais a foto real). O título do gancho fica como
// KINEO-CLOSE-REAL-LEGENDA-1910 — estava: 4,5% → 3,6% em 2 linhas de até 5 palavras, na pílula. O contorno é o da legenda dos filmes no ar (lib/compose.ts e
// KINEO-CLOSE-REAL-LEGENDA-1910 — lib/filmes/faceless15.ts: stroke_color 'rgba(0,0,0,0.98)', stroke_width 3). Sombra: a casa NUNCA mandou shadow_* ao Creatomate
// KINEO-CLOSE-REAL-LEGENDA-1910 — (nenhuma linha do repositório) — propriedade nunca exercitada não entra sem render de validação, então a fala vai só com o contorno.
/** KINEO-CLOSE-REAL-LEGENDA-1910 — a fonte da legenda da FALA em fração da altura (fixa; o gancho segue em ADS_V2_CLOSE_REAL_CAPTION_FONT, 4,5%). */
export const ADS_V2_CLOSE_REAL_SPEECH_FONT = 0.036 // KINEO-CLOSE-REAL-LEGENDA-1910
/** KINEO-CLOSE-REAL-LEGENDA-1910 — no máximo 4 palavras por linha na legenda da fala (o gancho segue com 5). */
export const ADS_V2_CLOSE_REAL_SPEECH_LINE_WORDS = 4 // KINEO-CLOSE-REAL-LEGENDA-1910
/** KINEO-CLOSE-REAL-LEGENDA-1910 — o contorno da legenda da fala: EXATAMENTE o da legenda dos filmes no ar (lib/compose.ts, lib/filmes/faceless15.ts). */
export const ADS_V2_CLOSE_REAL_SPEECH_STROKE_COLOR = 'rgba(0,0,0,0.98)' // KINEO-CLOSE-REAL-LEGENDA-1910
export const ADS_V2_CLOSE_REAL_SPEECH_STROKE_WIDTH = 3 // KINEO-CLOSE-REAL-LEGENDA-1910
// KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — CANÁRIO DO cc5c984cc (19/10, nota 7,5 contra 8,5 da rodada 3; folhas em prints-1610/cr4-1910): o contorno de 3 px SEM
// KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — pílula some sobre foto clara (vidro com líquido dourado, seda clara, fundo bege). Conserto: o tamanho fica (3,6%, até 4
// KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — palavras por linha) e a fala volta à PÍLULA escura com as MESMAS propriedades de fundo da rodada 3 (background_color,
// KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — background_x_padding '3%', background_y_padding '2%', border_radius 14), um pouco mais opaca (0,72 em vez de 0,6: o alpha
// KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — no background_color é o de sempre da casa), e o contorno dos filmes continua por cima. Duas correções de linha junto:
// KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — (1) palavra fraca ("de", "a", "the"…, a lista do encurtamento) não fecha linha: desce para a linha de baixo; (2) as linhas
// KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — vão ao Creatomate com "\n" (como o título): o canário mostrou que, sem a quebra explícita, o motor quebrava pela largura
// KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — da caixa ("Uma experiência única de | fragrância") e os 4 por linha não valiam na tela.
/** KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — a pílula da fala: o fundo da rodada 3 com alpha 0,72; as folgas e o canto, os mesmos dela. */
export const ADS_V2_CLOSE_REAL_SPEECH_BG = 'rgba(0,0,0,0.72)' // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910
export const ADS_V2_CLOSE_REAL_SPEECH_PAD_X = '3%' // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910
export const ADS_V2_CLOSE_REAL_SPEECH_PAD_Y = '2%' // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910
export const ADS_V2_CLOSE_REAL_SPEECH_RADIUS = 14 // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910
/** KINEO-CLOSE-REAL-LEGENDA-1910 — as linhas da legenda da fala: a quebra pedida ("\n") e, dentro de cada uma, por palavra — cabe na largura E no máximo 4 palavras por linha. Pura. */
export function adsV2CloseRealSpeechLines(text: string, fontPx: number, frameW: number): string[] { // KINEO-CLOSE-REAL-LEGENDA-1910
  const perLine = Math.max(4, Math.floor((frameW * ADS_V2_CLOSE_REAL_CAPTION_WIDTH * 0.94) / (fontPx * ADS_V2_OVERLAY_CHAR_EM))) // KINEO-CLOSE-REAL-LEGENDA-1910 — ≡ adsV2CloseRealCaptionLines
  const out: string[] = [] // KINEO-CLOSE-REAL-LEGENDA-1910
  for (const l of String(text ?? '').split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean)) { // KINEO-CLOSE-REAL-LEGENDA-1910
    const lines: string[][] = [] // KINEO-CLOSE-REAL-LEGENDA-1910
    for (const word of l.split(' ')) { // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — a mesma quebra gulosa (cabe na largura E até 4 palavras) …
      const last = lines.length ? lines[lines.length - 1] : null // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910
      if (last && last.length < ADS_V2_CLOSE_REAL_SPEECH_LINE_WORDS && [...last, word].join(' ').length <= perLine) { last.push(word); continue } // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910
      let k = last ? last.length : 0 // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — … e, ao fechar a linha, as palavras fracas do fim dela ("…única de") descem para a de baixo
      while (last && k > 1 && CLOSE_REAL_WEAK_END.has(closeRealNormWord(last[k - 1]))) k-- // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — a linha nunca fica vazia
      const next = last ? [...last.slice(k), word] : [word] // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910
      if (last && k < last.length && next.length <= ADS_V2_CLOSE_REAL_SPEECH_LINE_WORDS && next.join(' ').length <= perLine) { last.splice(k); lines.push(next) } else lines.push([word]) // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — descer só se a de baixo ainda couber
    } // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910
    out.push(...lines.map((x) => x.join(' '))) // KINEO-CLOSE-REAL-LEGENDA-1910
  } // KINEO-CLOSE-REAL-LEGENDA-1910
  return out // KINEO-CLOSE-REAL-LEGENDA-1910
} // KINEO-CLOSE-REAL-LEGENDA-1910
/** KINEO-CLOSE-REAL-LEGENDA-1910 — o tamanho da legenda da fala: SEMPRE 3,6% da altura (sem escada); `floor` = cabe em 2 linhas (senão a frase falada é encurtada). Pura. */
export function adsV2CloseRealSpeechFit(text: string, frameW: number, frameH: number): { fontPx: number; lines: string[]; floor: boolean } { // KINEO-CLOSE-REAL-LEGENDA-1910
  const fontPx = Math.round(ADS_V2_CLOSE_REAL_SPEECH_FONT * frameH) // KINEO-CLOSE-REAL-LEGENDA-1910
  const lines = adsV2CloseRealSpeechLines(text, fontPx, frameW) // KINEO-CLOSE-REAL-LEGENDA-1910
  return { fontPx, lines, floor: lines.length <= ADS_V2_CLOSE_REAL_CAPTION_LINES_MAX } // KINEO-CLOSE-REAL-LEGENDA-1910
} // KINEO-CLOSE-REAL-LEGENDA-1910
/** KINEO-CLOSE-REAL-V3-1910 — conjunções que abrem uma oração nova (corta ANTES delas; a oração de antes fica inteira). Sem "que/that": a relativa não é oração solta. */
const CLOSE_REAL_JOINERS = new Set(['and', 'but', 'or', 'e', 'mas', 'ou', 'porém', 'y', 'pero', 'et', 'und', 'aber', 'oder', 'ed', 'ma']) // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — palavras em que uma legenda encurtada não pode TERMINAR (artigo, preposição, conjunção, possessivo: deixariam a frase pendurada). */
const CLOSE_REAL_WEAK_END = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'for', 'from', 'with', 'by', 'your', 'our', 'its', 'my', 'and', 'or', 'but', 'that', 'which', 'who', 'truly', 'very', 'so', 'o', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'para', 'com', 'que', 'seu', 'sua', 'seus', 'suas', 'e', 'ou', 'mas', 'te', 'se', 'muito', 'tão', 'el', 'la', 'los', 'las', 'un', 'una', 'del', 'al', 'y', 'con', 'tu', 'mi', 'le', 'les', 'des', 'du', 'et', 'au', 'aux', 'ce', 'cette', 'votre', 'der', 'die', 'das', 'den', 'dem', 'ein', 'eine', 'einen', 'und', 'mit', 'zu', 'dein', 'deine', 'il', 'lo', 'gli', 'di', 'per', 'ed', 'tuo', 'tua']) // KINEO-CLOSE-REAL-V3-1910
const closeRealNormWord = (w: string): string => String(w ?? '').toLocaleLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, '') // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910
 * KINEO-CLOSE-REAL-V3-1910 — a legenda de UMA frase falada (as palavras dela). Cabe em 2 linhas sem descer de 4% = a frase inteira. Não cabe = ENCURTADA:
 * KINEO-CLOSE-REAL-V3-1910 · 1º o maior começo que termina numa oração (antes de vírgula/ponto-e-vírgula/dois-pontos, ou antes de conjunção: "…de Perfume LUME | e sinta…");
 * KINEO-CLOSE-REAL-V3-1910 · 2º sem oração que caiba, o maior começo que cabe terminando numa palavra de conteúdo (nunca em "a", "de", "the"…). O resto da frase a voz diz; a tela não
 * KINEO-CLOSE-REAL-V3-1910 · mostra pedaço solto (nada começa no meio, nada em minúscula). Pura.
 */ // KINEO-CLOSE-REAL-V3-1910
export function adsV2CloseRealCaptionWords(words: readonly string[], frameW: number = 1080, frameH: number = 1920): string[] { // KINEO-CLOSE-REAL-V3-1910
  const ws = (Array.isArray(words) ? words : []).filter((w) => typeof w === 'string' && w.trim()).map((w) => w.trim()) // KINEO-CLOSE-REAL-V3-1910
  const fits = (k: number): boolean => { const f = adsV2CloseRealSpeechFit(captionText(ws.slice(0, k)), frameW, frameH); return f.floor && f.lines.length <= ADS_V2_CLOSE_REAL_CAPTION_LINES_MAX } // KINEO-CLOSE-REAL-LEGENDA-1910 — a frase falada cabe em 2 linhas de até 4 palavras a 3,6% (era: adsV2CloseRealCaptionFit, 2 linhas de até 5 a ≥ 4%); o encurtamento por oração segue igual
  if (ws.length === 0 || fits(ws.length)) return ws // KINEO-CLOSE-REAL-V3-1910
  const weak = (k: number): boolean => CLOSE_REAL_WEAK_END.has(closeRealNormWord(ws[k - 1])) // KINEO-CLOSE-REAL-V3-1910
  for (let k = ws.length - 1; k >= 3; k--) { const clause = /[,;:–—]$/u.test(ws[k - 1]) || CLOSE_REAL_JOINERS.has(closeRealNormWord(ws[k])); if (clause && !weak(k) && fits(k)) return ws.slice(0, k) } // KINEO-CLOSE-REAL-V3-1910
  for (let k = ws.length - 1; k >= 2; k--) if (!weak(k) && fits(k)) return ws.slice(0, k) // KINEO-CLOSE-REAL-V3-1910
  return ws.slice(0, Math.min(2, ws.length)) // KINEO-CLOSE-REAL-V3-1910
} // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — o título do gancho: o separador " · " vira a QUEBRA de linha ("Perfume LUME\nUnique Fragrances"); sem caber em 2 linhas, só a 1ª parte. Pura. */
export function adsV2CloseRealHeadline(text: unknown, frameW: number = 1080, frameH: number = 1920): string { // KINEO-CLOSE-REAL-V3-1910
  const clean = adsV2CloseRealPhrases([adsV2CloseRealDash(typeof text === 'string' ? text : '')])[0] ?? '' // KINEO-CLOSE-REAL-V3-1910
  const parts = clean.split(/\s+·\s+/u).map((p) => p.replace(/^·\s*|\s*·$/gu, '').trim()).filter(Boolean) // KINEO-CLOSE-REAL-V3-1910
  if (parts.length < 2) return parts[0] ?? '' // KINEO-CLOSE-REAL-V3-1910
  const two = `${parts[0]}\n${parts.slice(1).join(' ')}` // KINEO-CLOSE-REAL-V3-1910
  return adsV2CloseRealCaptionFit(two, frameW, frameH).lines.length <= ADS_V2_CLOSE_REAL_CAPTION_LINES_MAX ? two : parts[0] // KINEO-CLOSE-REAL-V3-1910
} // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910
 * KINEO-CLOSE-REAL-V3-1910 — as legendas da rodada 3 (pura). Com narração e voz medida: UMA legenda por FRASE falada (adsV2CloseRealCaptionWords), cada uma
 * KINEO-CLOSE-REAL-V3-1910 · entrando quando a voz a começa (no corte de plano, se cair a até 0,35 s dele); a do gancho é o título (adsV2CloseRealHeadline) no quadro 0; a última vai
 * KINEO-CLOSE-REAL-V3-1910 · até o cartão; sem buraco. Fala de 1 frase só com título: o título fica no gancho e a frase entra no 1º corte. Sem voz: as frases de tela do ajuste, com o
 * KINEO-CLOSE-REAL-V3-1910 · título quebrado no separador. O tempo de cada palavra é o MESMO do ajuste (proporção de caracteres + a pausa do ponto e da vírgula).
 */ // KINEO-CLOSE-REAL-V3-1910
export function adsV2CloseRealCaptionsV3(i: { narration?: string | null; voiceSeconds?: number | null; headline?: string | null; overlays?: readonly (string | null | undefined)[] | null; timeline: AdsV2CloseRealTimeline; frameW?: number; frameH?: number }): AdsV2CloseRealCaption[] { // KINEO-CLOSE-REAL-V3-1910
  const r3 = (n: number) => Math.round(n * 1000) / 1000 // KINEO-CLOSE-REAL-V3-1910
  const W = pos(i.frameW) ? i.frameW : 1080, Hh = pos(i.frameH) ? i.frameH : 1920 // KINEO-CLOSE-REAL-V3-1910
  const t = i.timeline // KINEO-CLOSE-REAL-V3-1910
  const cuts = t.starts // KINEO-CLOSE-REAL-V3-1910
  const clean = (s: unknown): string => adsV2CloseRealPhrases([adsV2CloseRealDash(typeof s === 'string' ? s : '')])[0] ?? '' // KINEO-CLOSE-REAL-V3-1910
  const headline = adsV2CloseRealHeadline(i.headline, W, Hh) // KINEO-CLOSE-REAL-V3-1910
  const words = String(i.narration ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean) // KINEO-CLOSE-REAL-V3-1910
  const vs = typeof i.voiceSeconds === 'number' && Number.isFinite(i.voiceSeconds) && i.voiceSeconds > 0 ? i.voiceSeconds : 0 // KINEO-CLOSE-REAL-V3-1910
  if (!(words.length >= 2 && vs > 0)) { const head0 = clean(i.headline); return adsV2CloseRealCaptions(i).map((c, k) => (k === 0 && head0 && c.text === head0 && headline ? { ...c, text: headline } : c)) } // KINEO-CLOSE-REAL-V3-1910 — sem voz: as frases de tela de sempre, com o título quebrado no separador
  const weight = words.map((w) => w.length + 1 + (/[.!?…]$/u.test(w) ? 4 : /[,;:]$/u.test(w) ? 2 : 0)) // KINEO-CLOSE-REAL-V3-1910 — ≡ adsV2CloseRealCaptions
  const total = weight.reduce((a, b) => a + b, 0) // KINEO-CLOSE-REAL-V3-1910
  const at: number[] = [] // KINEO-CLOSE-REAL-V3-1910
  let acc = 0 // KINEO-CLOSE-REAL-V3-1910
  for (const w of weight) { at.push(ADS_V2_VOICE_START + (vs * acc) / total); acc += w } // KINEO-CLOSE-REAL-V3-1910
  const ranges: [number, number][] = [] // KINEO-CLOSE-REAL-V3-1910 — as frases faladas: termina no ponto final, exclamação, interrogação ou reticências
  for (let k = 0, a = 0; k < words.length; k++) if (/[.!?…]["'”’»)]*$/u.test(words[k]) || k === words.length - 1) { ranges.push([a, k + 1]); a = k + 1 } // KINEO-CLOSE-REAL-V3-1910
  let items = ranges.map(([a, b]) => ({ text: clean(captionText(adsV2CloseRealCaptionWords(words.slice(a, b), W, Hh))), spokenAt: r3(at[a]), from: r3(at[a]) })) // KINEO-CLOSE-REAL-V3-1910
  if (headline && items.length >= 2) items[0] = { ...items[0], text: headline } // KINEO-CLOSE-REAL-V3-1910 — a 1ª frase é dita sobre o gancho, onde mora o título
  else if (headline && items.length === 1) items = [{ text: headline, spokenAt: items[0].spokenAt, from: 0 }, { ...items[0], from: cuts.length ? cuts[0] : t.hook }] // KINEO-CLOSE-REAL-V3-1910
  const K = items.length // KINEO-CLOSE-REAL-V3-1910
  const starts = items.map((c, j) => { if (j === 0) return 0; const near = cuts.reduce((m, x) => (Math.abs(x - c.from) < Math.abs(m - c.from) ? x : m), Infinity); return Math.abs(near - c.from) <= ADS_V2_CLOSE_REAL_CAPTION_SNAP_V3 ? near : c.from }) // KINEO-CLOSE-REAL-V3-1910
  for (let j = 1; j < K; j++) starts[j] = r3(Math.min(Math.max(starts[j], starts[j - 1] + ADS_V2_CLOSE_REAL_CAPTION_MIN_SECONDS), t.content - ADS_V2_CLOSE_REAL_CAPTION_MIN_SECONDS * (K - j))) // KINEO-CLOSE-REAL-V3-1910
  return items.map((c, j) => ({ text: c.text, start: starts[j], end: j === K - 1 ? t.content : starts[j + 1], spokenAt: c.spokenAt })).reduce<AdsV2CloseRealCaption[]>((out, c) => { if (c.text) out.push(c); else if (out.length) out[out.length - 1].end = c.end; return out }, []) // KINEO-CLOSE-REAL-V3-1910 — legenda vazia (rara) = a anterior fica até o fim dela
} // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — '108%' → 1,08 (a escala do Ken Burns e do punch-in). Pura. */
const closeRealPct = (s: string): number => { const n = parseFloat(String(s ?? '')); return Number.isFinite(n) && n > 0 ? n / 100 : 1 } // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910
 * KINEO-CLOSE-REAL-V3-1910 — onde o produto de uma FOTO aparece no quadro durante o plano (pura): a foto em `cover` no quadro e escalada em torno de
 * KINEO-CLOSE-REAL-V3-1910 · (xAnchor, yAnchor) por cada zoom do plano (Ken Burns e punch-in): a união das caixas. null = sem caixa confiável.
 */ // KINEO-CLOSE-REAL-V3-1910
export function adsV2CloseRealProductSpan(photo: AdsV2CloseRealPhotoBox | null | undefined, frameW: number, frameH: number, zooms: readonly number[], xAnchor: number = 0.5, yAnchor: number = 0.5): AdsV2CloseRealBox | null { // KINEO-CLOSE-REAL-V3-1910
  if (!photo || !pos(photo.w) || !pos(photo.h) || !(photo.x1 > photo.x0) || !(photo.y1 > photo.y0) || !pos(frameW) || !pos(frameH)) return null // KINEO-CLOSE-REAL-V3-1910
  const s = Math.max(frameW / photo.w, frameH / photo.h), dw = photo.w * s, dh = photo.h * s, ox = (frameW - dw) / 2, oy = (frameH - dh) / 2 // KINEO-CLOSE-REAL-V3-1910
  const X0 = ox + photo.x0 * dw, X1 = ox + photo.x1 * dw, Y0 = oy + photo.y0 * dh, Y1 = oy + photo.y1 * dh, ax = xAnchor * frameW, ay = yAnchor * frameH // KINEO-CLOSE-REAL-V3-1910
  const zs = (Array.isArray(zooms) ? zooms : []).filter(pos) // KINEO-CLOSE-REAL-V3-1910
  if (!zs.length) zs.push(1) // KINEO-CLOSE-REAL-V3-1910
  const c01 = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 10000) / 10000 // KINEO-CLOSE-REAL-V3-1910
  const xs = zs.flatMap((z) => [ax + (X0 - ax) * z, ax + (X1 - ax) * z]), ys = zs.flatMap((z) => [ay + (Y0 - ay) * z, ay + (Y1 - ay) * z]) // KINEO-CLOSE-REAL-V3-1910
  return { x0: c01(Math.min(...xs) / frameW), x1: c01(Math.max(...xs) / frameW), y0: c01(Math.min(...ys) / frameH), y1: c01(Math.max(...ys) / frameH) } // KINEO-CLOSE-REAL-V3-1910
} // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — a janela de cada plano (gancho + fotos) e onde o produto mora nela. Gancho recortado = a caixa do produto do gancho com o zoom dele. Pura. */
export function adsV2CloseRealPlanWindows(i: { timeline: AdsV2CloseRealTimeline; shotPhotos: readonly string[]; photoBoxes?: Readonly<Record<string, AdsV2CloseRealPhotoBox | null>> | null; hookCutout: boolean; frameW: number; frameH: number }): { start: number; end: number; span: AdsV2CloseRealBox | null }[] { // KINEO-CLOSE-REAL-V3-1910
  const t = i.timeline, B = ADS_V2_CLOSE_REAL_PRODUCT_BOX // KINEO-CLOSE-REAL-V3-1910
  const hook = i.hookCutout ? { x0: B.x0, x1: B.x1, y0: B.y0, y1: Math.min(1, B.y0 + (B.y1 - B.y0) * closeRealPct(ADS_V2_CLOSE_REAL_HOOK_ZOOM_END)) } : null // KINEO-CLOSE-REAL-V3-1910 — o zoom do gancho cresce a partir do topo do produto
  const boxes = i.photoBoxes && typeof i.photoBoxes === 'object' ? i.photoBoxes : {} // KINEO-CLOSE-REAL-V3-1910
  const list = Array.isArray(i.shotPhotos) ? i.shotPhotos : [] // KINEO-CLOSE-REAL-V3-1910
  return [{ start: 0, end: t.hook, span: hook }, ...t.shots.map((d, k) => { const kb = ADS_V2_CLOSE_REAL_KEN_BURNS[k % ADS_V2_CLOSE_REAL_KEN_BURNS.length]; const src = list.length ? list[k % list.length] : ''; return { start: t.starts[k], end: Math.round((t.starts[k] + d) * 1000) / 1000, span: adsV2CloseRealProductSpan(Object.hasOwn(boxes, src) ? boxes[src] : null, i.frameW, i.frameH, [kb.from, kb.to, ADS_V2_CLOSE_REAL_PUNCH_FROM, ADS_V2_CLOSE_REAL_PUNCH_TO].map(closeRealPct), closeRealPct(kb.xAnchor), 0.5) } })] // KINEO-CLOSE-REAL-V3-1910 — ≡ os zooms e as âncoras que a montagem aplica no plano k
} // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910
 * KINEO-CLOSE-REAL-V3-1910 — o lugar da legenda (pura): o topo de sempre (17,5%, abaixo da marca-d'água) quando ela não toca o produto; tocando, ACIMA dele se couber (até `minTop`:
 * KINEO-CLOSE-REAL-V3-1910 · 14% sem marca-d'água), senão ABAIXO (com folga) até 65% (a zona segura do Meta), senão até 80% (acima da UI do app); nem assim, o que cobre menos (no alto ou nos 80%).
 * KINEO-CLOSE-REAL-V3-1910 · Produto ao lado (sem cruzar a largura da pílula) não conta. `span` null = o topo de sempre.
 */ // KINEO-CLOSE-REAL-V3-1910
export function adsV2CloseRealCaptionPlace(text: string, frameW: number, frameH: number, span: AdsV2CloseRealBox | null, minTop: number = ADS_V2_CLOSE_REAL_CAPTION_TOP, speech: boolean = false): { y: string; y_anchor: string; width: string; font_size: number; lines: number; box: AdsV2CloseRealTextBox; where: 'top' | 'above' | 'below' | 'low' | 'least' } { // KINEO-CLOSE-REAL-LEGENDA-1910 — + speech: a legenda da fala (3,6%, até 4 palavras por linha); sem ela, o título do gancho (4,5%) como sempre
  const r4 = (n: number) => Math.round(n * 10000) / 10000 // KINEO-CLOSE-REAL-V3-1910
  const f = speech ? adsV2CloseRealSpeechFit(text, frameW, frameH) : adsV2CloseRealCaptionFit(text, frameW, frameH) // KINEO-CLOSE-REAL-LEGENDA-1910 — a fala mede no tamanho dela (a caixa menor sai do produto com mais folga)
  const h = 2 * ADS_V2_OVERLAY_PILL_PAD + (f.lines.length * f.fontPx * ADS_V2_OVERLAY_LINE_HEIGHT) / frameH // KINEO-CLOSE-REAL-V3-1910
  const longest = Math.max(1, ...f.lines.map((l) => l.length)) // KINEO-CLOSE-REAL-V3-1910
  const halfW = Math.min(ADS_V2_CLOSE_REAL_CAPTION_WIDTH, (longest * f.fontPx * ADS_V2_OVERLAY_CHAR_EM) / frameW + 0.06) / 2 // KINEO-CLOSE-REAL-V3-1910 — a pílula: o texto mais a folga dos lados
  const G = ADS_V2_CLOSE_REAL_CAPTION_PRODUCT_GAP // KINEO-CLOSE-REAL-V3-1910
  const at = (top: number) => ({ top, bottom: top + h }) // KINEO-CLOSE-REAL-V3-1910
  const hits = (b: { top: number; bottom: number }) => !!span && span.x1 > 0.5 - halfW && span.x0 < 0.5 + halfW && b.bottom + G > span.y0 && b.top - G < span.y1 // KINEO-CLOSE-REAL-V3-1910
  let b = at(ADS_V2_CLOSE_REAL_CAPTION_TOP) // KINEO-CLOSE-REAL-V3-1910
  let where: 'top' | 'above' | 'below' | 'low' | 'least' = 'top' // KINEO-CLOSE-REAL-V3-1910
  const top0 = Math.min(ADS_V2_CLOSE_REAL_CAPTION_TOP, Math.max(ADS_V2_SAFE_TOP, minTop)) // KINEO-CLOSE-REAL-V3-1910 — o mais alto permitido (14% da zona segura; 17,5% com a marca-d'água da amostra)
  if (span && hits(b)) { // KINEO-CLOSE-REAL-V3-1910
    const above = at(span.y0 - G - h) // KINEO-CLOSE-REAL-V3-1910
    const below = at(Math.max(ADS_V2_CLOSE_REAL_CAPTION_TOP, span.y1 + G)) // KINEO-CLOSE-REAL-V3-1910
    if (above.top >= top0 - 1e-9 && !hits(above)) { b = above; where = 'above' } // KINEO-CLOSE-REAL-V3-1910 — subir um pouco (o produto que o zoom aproximou das legendas) é melhor que pular para baixo dele
    else if (below.bottom <= ADS_V2_SAFE_BOTTOM + 1e-9) { b = below; where = 'below' } // KINEO-CLOSE-REAL-V3-1910
    else if (below.bottom <= ADS_V2_CLOSE_REAL_CAPTION_LOW_MAX + 1e-9) { b = below; where = 'low' } // KINEO-CLOSE-REAL-V3-1910
    else { const high = at(top0); const low = at(ADS_V2_CLOSE_REAL_CAPTION_LOW_MAX - h); const ov = (x: { top: number; bottom: number }) => Math.max(0, Math.min(x.bottom, span.y1) - Math.max(x.top, span.y0)); b = ov(low) <= ov(high) + 1e-6 ? low : high; where = 'least' } // KINEO-CLOSE-REAL-V3-1910 — empate = embaixo (o produto que enche o quadro perde a base, nunca a tampa)
  } // KINEO-CLOSE-REAL-V3-1910
  return { y: `${r4((b.bottom - ADS_V2_OVERLAY_PILL_PAD) * 100)}%`, y_anchor: '100%', width: `${r4(ADS_V2_CLOSE_REAL_CAPTION_WIDTH * 100)}%`, font_size: f.fontPx, lines: f.lines.length, box: { top: r4(b.top), bottom: r4(b.bottom) }, where } // KINEO-CLOSE-REAL-V3-1910 — presa pela BASE do texto (y_anchor 100%), como no ajuste
} // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — a legenda cortada nos planos que ela atravessa; pedaço menor que 0,3 s junta com o vizinho mais longo (e fica no lugar dele); pedaços seguidos no mesmo lugar viram um só. Pura. */
export function adsV2CloseRealCaptionSegments(c: { start: number; end: number }, windows: readonly { start: number; end: number; span: AdsV2CloseRealBox | null }[], placeOf: (span: AdsV2CloseRealBox | null) => string): { start: number; end: number; span: AdsV2CloseRealBox | null }[] { // KINEO-CLOSE-REAL-V3-1910
  const uni = (a: AdsV2CloseRealBox | null, b: AdsV2CloseRealBox | null): AdsV2CloseRealBox | null => (!a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) }) // KINEO-CLOSE-REAL-V3-1910
  const segs = (Array.isArray(windows) ? windows : []).map((w) => ({ start: Math.max(c.start, w.start), end: Math.min(c.end, w.end), span: w.span })).filter((s) => s.end - s.start > 1e-6) // KINEO-CLOSE-REAL-V3-1910
  if (!segs.length) return [{ start: c.start, end: c.end, span: null }] // KINEO-CLOSE-REAL-V3-1910
  segs[0].start = c.start; segs[segs.length - 1].end = c.end // KINEO-CLOSE-REAL-V3-1910 — a legenda inteira coberta (as janelas encostam uma na outra)
  for (let k = 1; k < segs.length; k++) segs[k].start = segs[k - 1].end // KINEO-CLOSE-REAL-V3-1910
  for (let guard = 0; segs.length > 1 && guard < 20; guard++) { const k = segs.findIndex((s) => s.end - s.start < ADS_V2_CLOSE_REAL_CAPTION_MIN_SEGMENT - 1e-9); if (k < 0) break; const n = k === 0 ? 1 : k === segs.length - 1 ? k - 1 : segs[k - 1].end - segs[k - 1].start >= segs[k + 1].end - segs[k + 1].start ? k - 1 : k + 1; const a = Math.min(k, n), b = Math.max(k, n); segs.splice(a, 2, { start: segs[a].start, end: segs[b].end, span: segs[k === a ? b : a].span }) } // KINEO-CLOSE-REAL-V3-1910
  const out: { start: number; end: number; span: AdsV2CloseRealBox | null }[] = [] // KINEO-CLOSE-REAL-V3-1910
  for (const s of segs) { const last = out[out.length - 1]; if (last && placeOf(last.span) === placeOf(s.span)) { last.end = s.end; last.span = uni(last.span, s.span) } else out.push({ ...s }) } // KINEO-CLOSE-REAL-V3-1910
  return out // KINEO-CLOSE-REAL-V3-1910
} // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — o botão da chamada no cartão: fonte de 4% da altura, folga e canto arredondado (as propriedades da marca do clipe grátis, no ar desde 06/10). */
export const ADS_V2_CLOSE_REAL_CTA_FONT = 0.04 // KINEO-CLOSE-REAL-V3-1910
export const ADS_V2_CLOSE_REAL_CTA_PAD_X = '60%' // KINEO-CLOSE-REAL-V3-1910 — % do tamanho da fonte (Creatomate: background_*_padding é relativo à fonte; o '4%' do ajuste dava 2 px)
export const ADS_V2_CLOSE_REAL_CTA_PAD_Y = '32%' // KINEO-CLOSE-REAL-V3-1910
export const ADS_V2_CLOSE_REAL_CTA_RADIUS = '45%' // KINEO-CLOSE-REAL-V3-1910 — background_border_radius (o border_radius do ajuste não arredonda o fundo de texto)
export const ADS_V2_CLOSE_REAL_CTA_BG = 'rgba(255,255,255,0.95)' // KINEO-CLOSE-REAL-V3-1910
export const ADS_V2_CLOSE_REAL_CTA_INK = '#111111' // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — o respiro entre o nome e o botão (fração da altura). */
export const ADS_V2_CLOSE_REAL_CTA_GAP = 0.04 // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — a cor do texto do botão: o tom escuro da embalagem, se for escuro de verdade sobre o branco; senão quase preto. Pura. */
export function adsV2CloseRealCtaInk(ink: unknown): string { // KINEO-CLOSE-REAL-V3-1910
  const m = typeof ink === 'string' ? /^#([0-9a-f]{6})$/i.exec(ink.trim()) : null // KINEO-CLOSE-REAL-V3-1910
  if (!m) return ADS_V2_CLOSE_REAL_CTA_INK // KINEO-CLOSE-REAL-V3-1910
  const n = parseInt(m[1], 16), lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 // KINEO-CLOSE-REAL-V3-1910
  return lum <= 0.3 ? `#${m[1].toLowerCase()}` : ADS_V2_CLOSE_REAL_CTA_INK // KINEO-CLOSE-REAL-V3-1910 — contraste ≥ ~4,5:1 sobre o branco
} // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — o elemento do botão (puro): centralizado, abaixo do nome com respiro, inteiro na zona segura (≤ 65%), a fonte desce se a chamada for larga. */
export function adsV2CloseRealCtaButton(i: { text: string; ink?: string | null; nameText: string; track: number; time: number; duration: number; fontFamily: string; width: number; height: number; fade: number }): Record<string, unknown> { // KINEO-CLOSE-REAL-V3-1910
  const H = i.height, W = i.width // KINEO-CLOSE-REAL-V3-1910
  let px = Math.round(ADS_V2_CLOSE_REAL_CTA_FONT * H) // KINEO-CLOSE-REAL-V3-1910
  const padX = closeRealPct(ADS_V2_CLOSE_REAL_CTA_PAD_X), padY = closeRealPct(ADS_V2_CLOSE_REAL_CTA_PAD_Y) // KINEO-CLOSE-REAL-V3-1910
  while (px > Math.round(0.028 * H) && i.text.length * px * ADS_V2_OVERLAY_CHAR_EM + 2 * padX * px > 0.86 * W) px -= 2 // KINEO-CLOSE-REAL-V3-1910 — "Achetez maintenant" cabe numa linha só
  let namePx = Math.round(ADS_V2_CLOSE_REAL_CARD_NAME_FONT * H) // KINEO-CLOSE-REAL-V3-1910 — ≡ a fonte do nome na montagem
  while (i.nameText && namePx > Math.round(ADS_V2_CLOSE_REAL_CARD_NAME_FONT_MIN * H) && adsV2OverlayLines(i.nameText, namePx, W).length > 2) namePx -= 2 // KINEO-CLOSE-REAL-V3-1910
  const nameLines = i.nameText ? Math.max(1, adsV2OverlayLines(i.nameText, namePx, W).length) : 0 // KINEO-CLOSE-REAL-V3-1910
  const nameBottom = ADS_V2_CLOSE_REAL_CARD_NAME_Y + (nameLines * namePx * 1.1) / H / 2 // KINEO-CLOSE-REAL-V3-1910
  const half = (px * (1.1 + 2 * padY)) / H / 2 // KINEO-CLOSE-REAL-V3-1910 — meia altura do botão
  const cy = Math.min(ADS_V2_SAFE_BOTTOM - half, nameBottom + ADS_V2_CLOSE_REAL_CTA_GAP + half) // KINEO-CLOSE-REAL-V3-1910
  return { type: 'text', track: i.track, time: i.time, duration: i.duration, text: i.text, x: '50%', y: `${Math.round(cy * 1000000) / 10000}%`, x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', font_family: i.fontFamily, font_size: px, font_weight: '800', line_height: '110%', fill_color: adsV2CloseRealCtaInk(i.ink), background_color: ADS_V2_CLOSE_REAL_CTA_BG, background_x_padding: ADS_V2_CLOSE_REAL_CTA_PAD_X, background_y_padding: ADS_V2_CLOSE_REAL_CTA_PAD_Y, background_border_radius: ADS_V2_CLOSE_REAL_CTA_RADIUS, enter_transition: { type: 'fade', duration: i.fade } } // KINEO-CLOSE-REAL-V3-1910 — sem `width`: o fundo abraça o texto (o botão), como a marca do clipe grátis
} // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — as fotos dos planos: a do gancho (a 1ª) vai para o FIM (gancho A → B → C → A); com 2 fotos B → A → B; 1 foto = ela. Pura. */
export function adsV2CloseRealShotPhotos(photos: readonly string[]): string[] { // KINEO-CLOSE-REAL-AJUSTE-1910
  const list = (Array.isArray(photos) ? photos : []).filter((u) => typeof u === 'string' && u) // KINEO-CLOSE-REAL-AJUSTE-1910
  return list.length >= 2 ? [...list.slice(1), list[0]] : list // KINEO-CLOSE-REAL-AJUSTE-1910
} // KINEO-CLOSE-REAL-AJUSTE-1910
// ── KINEO-CLOSE-REAL-AJUSTE-1910 — o CARTÃO FINAL do Close real: o mesmo gradiente na cor da embalagem do gancho, o produto recortado pequeno, o nome e
// KINEO-CLOSE-REAL-AJUSTE-1910 — uma chamada curta na língua do pedido (o PNG azul-marinho do pedido destoava do filme e não tinha chamada). O fundo com o
// KINEO-CLOSE-REAL-AJUSTE-1910 — produto sai do servidor (lib/ads/v2CloseRealServer.ts, o mesmo recorte do gancho); o recorte falhou = o cartão do pedido.
/** KINEO-CLOSE-REAL-AJUSTE-1910 — onde o produto pousa no cartão (frações): pequeno, no alto da zona segura, acima do nome e da chamada. */
export const ADS_V2_CLOSE_REAL_CARD_PRODUCT_BOX = { x0: 0.3, x1: 0.7, y0: 0.19, y1: 0.44 } as const // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — o centro do nome e da chamada (fração da altura), a fonte de cada um (fração da altura) e a largura do nome. */
export const ADS_V2_CLOSE_REAL_CARD_NAME_Y = 0.505 // KINEO-CLOSE-REAL-AJUSTE-1910
export const ADS_V2_CLOSE_REAL_CARD_NAME_FONT = 0.052 // KINEO-CLOSE-REAL-AJUSTE-1910
export const ADS_V2_CLOSE_REAL_CARD_NAME_FONT_MIN = 0.032 // KINEO-CLOSE-REAL-AJUSTE-1910
export const ADS_V2_CLOSE_REAL_CARD_NAME_WIDTH = 0.84 // KINEO-CLOSE-REAL-AJUSTE-1910
export const ADS_V2_CLOSE_REAL_CARD_CTA_Y = 0.6 // KINEO-CLOSE-REAL-AJUSTE-1910
export const ADS_V2_CLOSE_REAL_CARD_CTA_FONT = 0.03 // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — trilhas do cartão (acima do fundo dele, na trilha 4). */
export const ADS_V2_CLOSE_REAL_CARD_TRACKS = { name: 9, cta: 10 } as const // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — a chamada curta do cartão nas 16 línguas da interface ("Compre agora"; a mesma "buy" do cartão do pedido onde ela existe). */
export const ADS_V2_CLOSE_REAL_CTA: Record<InterfaceLanguage, string> = { en: 'Shop now', pt: 'Compre agora', es: 'Compra ahora', fr: 'Achetez maintenant', de: 'Jetzt kaufen', it: 'Acquista ora', nl: 'Koop nu', pl: 'Kup teraz', tr: 'Hemen satın al', ru: 'Купить сейчас', uk: 'Купити зараз', ar: 'تسوّق الآن', ur: 'ابھی خریدیں', hi: 'अभी खरीदें', id: 'Beli sekarang', vi: 'Mua ngay' } // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — a chamada na língua do pedido (desconhecida = inglês). Pura. */
export function adsV2CloseRealCta(lang: string | null | undefined): string { // KINEO-CLOSE-REAL-AJUSTE-1910
  const k = String(lang ?? '').toLowerCase().slice(0, 2) // KINEO-CLOSE-REAL-AJUSTE-1910
  return (ADS_V2_CLOSE_REAL_CTA as Record<string, string>)[k] ?? ADS_V2_CLOSE_REAL_CTA.en // KINEO-CLOSE-REAL-AJUSTE-1910
} // KINEO-CLOSE-REAL-AJUSTE-1910
/** KINEO-CLOSE-REAL-AJUSTE-1910 — o nome do cartão = a marca do brief (a parte antes do travessão em "<nome> — <o que vende>", a régua do brandName). Pura. */
export function adsV2CloseRealCardName(business: unknown): string { // KINEO-CLOSE-REAL-AJUSTE-1910
  return (typeof business === 'string' ? business : '').split(/\s+[—–-]\s+/)[0].trim().replace(/\s*[—–-]\s*$/, '').replace(/\s+/g, ' ') // KINEO-CLOSE-REAL-AJUSTE-1910
} // KINEO-CLOSE-REAL-AJUSTE-1910
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
  /** KINEO-CLOSE-REAL-AJUSTE-1910 — o texto que a voz fala (plan.narration): as legendas saem dele, no tempo da voz. Ausente/sem voz = as frases de tela. */
  narration?: string | null // KINEO-CLOSE-REAL-AJUSTE-1910
  /** KINEO-CLOSE-REAL-AJUSTE-1910 — o cartão do formato (fundo na cor da embalagem + produto pequeno, do servidor) com o nome e a chamada. null = o cartão do pedido. */
  closeCard?: { url: string; name: string; cta: string; ink?: string | null } | null // KINEO-CLOSE-REAL-V3-1910 — + ink: a cor do texto do botão (o tom escuro da embalagem; ausente = quase preto)
  /** KINEO-CLOSE-REAL-V3-1910 — a caixa do produto em cada foto (pelo URL da foto; o recorte BiRefNet do servidor): a legenda desvia dela. Ausente/null = a regra fixa. */
  photoBoxes?: Readonly<Record<string, AdsV2CloseRealPhotoBox | null>> | null // KINEO-CLOSE-REAL-V3-1910
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
    elements.push({ type: 'image', track: T.shotA, time: 0, duration: hookDur, source: input.heroUrl.trim(), fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', animations: [{ type: 'scale', fade: false, start_scale: '100%', end_scale: ADS_V2_CLOSE_REAL_HOOK_ZOOM_END, x_anchor: '50%', y_anchor: `${ADS_V2_CLOSE_REAL_PRODUCT_BOX.y0 * 100}%`, easing: ADS_V2_CLOSE_REAL_HOOK_ZOOM_EASING }] }) // KINEO-CLOSE-REAL-AJUSTE-1910 — 100→112% com ease, a partir do topo do produto (só escala: os pixels do produto são os do recorte)
  } else {
    elements.push(...adsV2PackshotElements(input.heroFallbackUrl, T.shotA, 0, hookDur))
  }
  // 2. Os planos das fotos reais: Ken Burns + punch-in no meio; trilhas alternadas para o dissolve cruzar de verdade.
  const shotPhotos = adsV2CloseRealShotPhotos(photos) // KINEO-CLOSE-REAL-AJUSTE-1910 — a foto do gancho vai para o fim (gancho A → B → C → A)
  t.shots.forEach((d, k) => {
    const src = shotPhotos[k % shotPhotos.length] // KINEO-CLOSE-REAL-AJUSTE-1910 — era: photos[k % photos.length]
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
  const cc = input.closeCard && isHttps(input.closeCard.url) ? input.closeCard : null // KINEO-CLOSE-REAL-AJUSTE-1910 — o cartão do formato (fundo na cor da embalagem + produto pequeno); sem ele, o cartão do pedido
  elements.push({ type: 'image', track: T.card, time: t.cardStart, duration: cardSeconds, source: (cc ? cc.url : input.cardUrl).trim(), fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', enter_transition: { type: 'fade', duration: F } }) // KINEO-CLOSE-REAL-AJUSTE-1910 — era: source: input.cardUrl.trim()
  const ccName = cc ? adsV2CloseRealPhrases([cc.name])[0] ?? '' : '' // KINEO-CLOSE-REAL-AJUSTE-1910
  const ccCta = cc && typeof cc.cta === 'string' ? cc.cta.replace(/\s+/g, ' ').trim() : '' // KINEO-CLOSE-REAL-AJUSTE-1910
  if (cc && ccName) { // KINEO-CLOSE-REAL-AJUSTE-1910
    let namePx = Math.round(ADS_V2_CLOSE_REAL_CARD_NAME_FONT * height) // KINEO-CLOSE-REAL-AJUSTE-1910 — a maior fonte em que o nome cabe em 2 linhas
    while (namePx > Math.round(ADS_V2_CLOSE_REAL_CARD_NAME_FONT_MIN * height) && adsV2OverlayLines(ccName, namePx, width).length > 2) namePx -= 2 // KINEO-CLOSE-REAL-AJUSTE-1910
    elements.push({ type: 'text', track: ADS_V2_CLOSE_REAL_CARD_TRACKS.name, time: t.cardStart, duration: cardSeconds, text: ccName, x: '50%', y: `${ADS_V2_CLOSE_REAL_CARD_NAME_Y * 100}%`, x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', width: `${ADS_V2_CLOSE_REAL_CARD_NAME_WIDTH * 100}%`, font_family: fontFamily, font_size: namePx, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.35)', stroke_width: 2, enter_transition: { type: 'fade', duration: F } }) // KINEO-CLOSE-REAL-AJUSTE-1910
  } // KINEO-CLOSE-REAL-AJUSTE-1910 — fim do nome do cartão
  if (cc && ccCta) elements.push(adsV2CloseRealCtaButton({ text: ccCta, ink: cc.ink ?? null, nameText: ccName, track: ADS_V2_CLOSE_REAL_CARD_TRACKS.cta, time: t.cardStart, duration: cardSeconds, fontFamily, width, height, fade: F })) // KINEO-CLOSE-REAL-V3-1910 — a chamada vira BOTÃO (4% da altura, folga e canto arredondado de verdade, texto no tom da embalagem), abaixo do nome com respiro
  // KINEO-CLOSE-REAL-V3-1910 — 4. As legendas: 1 FRASE inteira cada (encurtada no fim de uma oração se passar de 2 linhas; nunca um pedaço que começa no meio), no tempo da voz, sem buraco; e nunca SOBRE o produto (a caixa do recorte de cada foto, com o zoom do plano).
  const captions = adsV2CloseRealCaptionsV3({ narration: hasVoice ? input.narration ?? null : null, voiceSeconds: hasVoice ? (input.voiceSeconds as number) : null, headline: (input.phrases ?? [])[0] ?? null, overlays: input.phrases ?? [], timeline: t, frameW: width, frameH: height }) // KINEO-CLOSE-REAL-V3-1910
  const capWindows = adsV2CloseRealPlanWindows({ timeline: t, shotPhotos, photoBoxes: input.photoBoxes ?? null, hookCutout: isHttps(input.heroUrl), frameW: width, frameH: height }) // KINEO-CLOSE-REAL-V3-1910 — onde o produto mora em cada plano (gancho e fotos)
  const capMinTop = typeof input.watermark === 'string' && input.watermark.trim() ? ADS_V2_CLOSE_REAL_CAPTION_TOP : ADS_V2_SAFE_TOP // KINEO-CLOSE-REAL-V3-1910 — a marca-d'água da amostra mora entre 14% e 17,5%
  const capHook = adsV2CloseRealHeadline((input.phrases ?? [])[0] ?? null, width, height) // KINEO-CLOSE-REAL-LEGENDA-1910 — o título do gancho (a 1ª legenda, quando existe): o único que fica grande e na pílula
  captions.forEach((c) => { // KINEO-CLOSE-REAL-V3-1910
    const speech = !(captions.indexOf(c) === 0 && capHook !== '' && c.text === capHook) // KINEO-CLOSE-REAL-LEGENDA-1910 — toda legenda que não é o título do gancho é legenda da fala
    for (const seg of adsV2CloseRealCaptionSegments(c, capWindows, (span) => adsV2CloseRealCaptionPlace(c.text, width, height, span, capMinTop, speech).y)) { // KINEO-CLOSE-REAL-LEGENDA-1910 — o lugar medido no tamanho de cada legenda (fala 3,6% · gancho 4,5%); a troca de lugar no corte segue igual
      const geo = adsV2CloseRealCaptionPlace(c.text, width, height, seg.span, capMinTop, speech) // KINEO-CLOSE-REAL-LEGENDA-1910
      if (speech) { elements.push({ type: 'text', track: T.text, time: r3(seg.start), duration: r3(seg.end - seg.start), text: adsV2CloseRealSpeechLines(c.text, geo.font_size, width).join('\n'), x: '50%', y: geo.y, x_anchor: '50%', y_anchor: geo.y_anchor, x_alignment: '50%', width: geo.width, font_family: fontFamily, font_size: geo.font_size, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: ADS_V2_CLOSE_REAL_SPEECH_STROKE_COLOR, stroke_width: ADS_V2_CLOSE_REAL_SPEECH_STROKE_WIDTH, background_color: ADS_V2_CLOSE_REAL_SPEECH_BG, background_x_padding: ADS_V2_CLOSE_REAL_SPEECH_PAD_X, background_y_padding: ADS_V2_CLOSE_REAL_SPEECH_PAD_Y, border_radius: ADS_V2_CLOSE_REAL_SPEECH_RADIUS }); continue } // KINEO-CLOSE-REAL-LEGENDA-PILULA-1910 — a fala: 3,6%, as linhas com "\n" (4 por linha valem na tela; palavra fraca não fecha linha), o contorno dos filmes e a PÍLULA da rodada 3 (alpha 0,72) de volta; o gancho segue na linha de baixo
      elements.push({ type: 'text', track: T.text, time: r3(seg.start), duration: r3(seg.end - seg.start), text: c.text, x: '50%', y: geo.y, x_anchor: '50%', y_anchor: geo.y_anchor, x_alignment: '50%', width: geo.width, font_family: fontFamily, font_size: geo.font_size, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.6)', stroke_width: Math.max(2, Math.round(geo.font_size / 28)), background_color: 'rgba(0,0,0,0.6)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 14 }) // KINEO-CLOSE-REAL-V3-1910 — o mesmo estilo de anúncio do ajuste; só o texto (frase inteira) e o lugar (fora do produto) mudam
    } // KINEO-CLOSE-REAL-V3-1910
  }) // KINEO-CLOSE-REAL-V3-1910
  // KINEO-CLOSE-REAL-AJUSTE-1910 — 5. A marca-d'água (só a amostra grátis): o anúncio inteiro, pequena, presa pelo topo em 14% (acima das legendas, nunca sobre o produto).
  const wm = typeof input.watermark === 'string' ? input.watermark.trim() : ''
  if (wm) {
    elements.push({ type: 'text', track: T.watermark, time: 0, duration: t.total, text: wm, x: '50%', y: `${r3(ADS_V2_CLOSE_REAL_WATERMARK_TOP * 100)}%`, x_anchor: '50%', y_anchor: '0%', x_alignment: '50%', width: '80%', font_family: fontFamily, font_size: Math.round((ADS_V2_CLOSE_REAL_WATERMARK_FONT_AT_1080 * width) / 1080), font_weight: '800', line_height: '110%', fill_color: '#ffffff', background_color: 'rgba(0,0,0,0.35)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 10 }) // KINEO-CLOSE-REAL-AJUSTE-1910 — era: base em ADS_V2_CLOSE_REAL_WATERMARK_BOTTOM (0,31), que as legendas maiores cobririam
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
