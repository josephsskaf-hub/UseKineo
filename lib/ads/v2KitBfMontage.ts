// KINEO-KIT-BF-1910 — a OFERTA na montagem do "Close do produto real" (o porquê: lib/ads/v2KitBf.ts). Puro: recebe o `source` do
// Creatomate que buildAdV2CloseRealSource (lib/ads/v2CloseReal.ts) JÁ montou e devolve outro com:
//   · o SELO da oferta no gancho (0 → fim do gancho): pílula amarela no CANTO, fora do produto (a caixa REAL do recorte, com o zoom do
//     gancho) e fora das legendas que aparecem no gancho, inteira na zona segura do Meta (14%–65% da altura);
//   · a oferta GRANDE no cartão final, entre o nome e o botão da chamada: o fundo do cartão passa a ser o do kit (o mesmo gradiente da
//     embalagem com o produto numa caixa mais alta, lib/ads/v2KitBfServer.ts), o nome sobe junto e o botão desce para baixo da oferta,
//     tudo até 65%. Sem o fundo do kit (falhou) o cartão fica como estava (não cabe sem cobrir nada).
// Oferta vazia = o MESMO objeto (montagem idêntica, byte a byte). Só propriedades que a casa já usa em produção (as do botão do cartão:
// background_color / background_x_padding / background_y_padding / background_border_radius) — nada de propriedade nunca exercitada.
// v2CloseReal.ts NÃO é tocado: o kit é uma camada por cima do source pronto.
import {
  ADS_V2_CLOSE_REAL_CAPTION_PRODUCT_GAP,
  ADS_V2_CLOSE_REAL_CAPTION_WIDTH,
  ADS_V2_CLOSE_REAL_CARD_TRACKS,
  ADS_V2_CLOSE_REAL_CTA_PAD_Y,
  ADS_V2_CLOSE_REAL_CTA_RADIUS,
  ADS_V2_CLOSE_REAL_HOOK_ZOOM_END,
  ADS_V2_CLOSE_REAL_PRODUCT_BOX,
  ADS_V2_CLOSE_REAL_TRACKS,
  adsV2CloseRealCaptionLines2,
} from '@/lib/ads/v2CloseReal'
import { ADS_V2_OVERLAY_CHAR_EM, ADS_V2_OVERLAY_LINE_HEIGHT, ADS_V2_OVERLAY_PILL_PAD, ADS_V2_SAFE_BOTTOM, ADS_V2_SAFE_TOP, adsV2OverlayLines } from '@/lib/ads/adV2Montage'
import { adsV2KitBfOffer } from '@/lib/ads/v2KitBf'

/** A caixa do produto no fundo do cartão COM oferta (mais alta e um pouco menor que ADS_V2_CLOSE_REAL_CARD_PRODUCT_BOX: abre lugar para a oferta). */
export const ADS_V2_KIT_BF_CARD_PRODUCT_BOX = { x0: 0.32, x1: 0.68, y0: 0.15, y1: 0.36 } as const
/** Do pé do produto ao centro do nome (≡ 0,44 → 0,505 do cartão de sempre). */
export const ADS_V2_KIT_BF_CARD_NAME_GAP = 0.065
/** Respiro nome → oferta e oferta → botão (fração da altura). */
export const ADS_V2_KIT_BF_CARD_GAP = 0.02
export const ADS_V2_KIT_BF_CARD_BUTTON_GAP = 0.022
/** A escada da fonte da oferta no cartão (fração da altura): a maior que cabe. */
export const ADS_V2_KIT_BF_CARD_FONT_MAX = 0.064
export const ADS_V2_KIT_BF_CARD_FONT_MIN = 0.03
/** A escada da fonte do selo do gancho. */
export const ADS_V2_KIT_BF_BADGE_FONT_MAX = 0.034
export const ADS_V2_KIT_BF_BADGE_FONT_MIN = 0.02
/** O canto do selo (borda a 5% da lateral). */
export const ADS_V2_KIT_BF_BADGE_EDGE = 0.05
/** Folga do selo para as legendas. */
export const ADS_V2_KIT_BF_BADGE_TEXT_GAP = 0.01
/** Largura média de um caractere do selo (em fontes): mais larga que a das legendas (0,58) — a conta erra para o lado seguro. */
export const ADS_V2_KIT_BF_CHAR_EM = 0.62
/** As folgas da pílula (relativas à fonte, como no botão: background_*_padding do Creatomate). */
export const ADS_V2_KIT_BF_PAD_X = '50%'
export const ADS_V2_KIT_BF_PAD_Y = '30%'
/** As cores da oferta (amarelo de liquidação, texto quase preto: contraste ≥ 12:1). */
export const ADS_V2_KIT_BF_BG = '#FFD400'
export const ADS_V2_KIT_BF_INK = '#111111'
/** Trilhas novas (as do Close real vão de 1 a 10). */
export const ADS_V2_KIT_BF_TRACKS = { cardOffer: 11, badge: 12 } as const

export interface AdsV2KitBfBox { x0: number; y0: number; x1: number; y1: number }
type El = Record<string, unknown>

const pct = (s: string): number => { const n = parseFloat(String(s ?? '')); return Number.isFinite(n) ? n / 100 : 0 }
const r4 = (n: number) => Math.round(n * 10000) / 10000
const pos = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
const hit = (a: AdsV2KitBfBox, b: AdsV2KitBfBox, gap: number) => a.x0 < b.x1 + gap && a.x1 > b.x0 - gap && a.y0 < b.y1 + gap && a.y1 > b.y0 - gap

/** O tamanho da pílula de texto de uma linha (frações do quadro). Pura. */
export function adsV2KitBfPill(text: string, fontPx: number, W: number, H: number): { w: number; h: number } {
  const padX = pct(ADS_V2_KIT_BF_PAD_X), padY = pct(ADS_V2_KIT_BF_PAD_Y)
  const lines = String(text).split('\n')
  const longest = Math.max(1, ...lines.map((l) => l.length))
  return { w: (longest * fontPx * ADS_V2_KIT_BF_CHAR_EM + 2 * padX * fontPx) / W, h: (fontPx * (lines.length * ADS_V2_OVERLAY_LINE_HEIGHT + 2 * padY)) / H }
}

/** As formas do texto do selo (pura): a linha inteira e, com espaço, em 2 linhas cortadas no espaço mais perto do meio ("Frete\ngrátis"). */
export function adsV2KitBfBadgeTexts(offer: string): string[] {
  const t = String(offer ?? '').trim()
  const spaces = [...t.matchAll(/ /g)].map((m) => m.index as number)
  if (!spaces.length) return [t]
  const cut = spaces.reduce((b, i) => (Math.abs(i - t.length / 2) < Math.abs(b - t.length / 2) ? i : b), spaces[0])
  return [t, `${t.slice(0, cut)}\n${t.slice(cut + 1)}`]
}

/**
 * Onde o produto mora no gancho (pura): a caixa REAL do recorte (rect do PNG do gancho, 1080×1920) ou, sem ela (a foto inteira no gancho),
 * a caixa do gancho inteira — com o zoom do gancho (100% → ADS_V2_CLOSE_REAL_HOOK_ZOOM_END, âncora no meio e no topo da caixa).
 */
export function adsV2KitBfHookSpan(heroRect: { x: number; y: number; w: number; h: number } | null | undefined, heroW: number = 1080, heroH: number = 1920): AdsV2KitBfBox {
  const B = ADS_V2_CLOSE_REAL_PRODUCT_BOX
  const base = heroRect && pos(heroRect.w) && pos(heroRect.h) ? { x0: heroRect.x / heroW, x1: (heroRect.x + heroRect.w) / heroW, y0: heroRect.y / heroH, y1: (heroRect.y + heroRect.h) / heroH } : { x0: B.x0, x1: B.x1, y0: B.y0, y1: B.y1 }
  const z = pct(ADS_V2_CLOSE_REAL_HOOK_ZOOM_END) || 1
  const ax = 0.5, ay = B.y0
  const xs = [base.x0, base.x1, ax + (base.x0 - ax) * z, ax + (base.x1 - ax) * z]
  const ys = [base.y0, base.y1, ay + (base.y0 - ay) * z, ay + (base.y1 - ay) * z]
  const c = (n: number) => r4(Math.min(1, Math.max(0, n)))
  return { x0: c(Math.min(...xs)), x1: c(Math.max(...xs)), y0: c(Math.min(...ys)), y1: c(Math.max(...ys)) }
}

/** A caixa de uma legenda do Close real (presa pela base: y = base − folga da pílula; largura da pílula centrada). Pura. */
export function adsV2KitBfCaptionBox(el: El, W: number, H: number): AdsV2KitBfBox | null {
  const font = typeof el.font_size === 'number' ? el.font_size : 0
  if (!pos(font) || typeof el.y !== 'string' || typeof el.text !== 'string') return null
  const lines = adsV2CloseRealCaptionLines2(el.text, font, W)
  const n = Math.max(1, lines.length)
  const bottom = pct(el.y) + (el.y_anchor === '100%' ? ADS_V2_OVERLAY_PILL_PAD : 0)
  const h = 2 * ADS_V2_OVERLAY_PILL_PAD + (n * font * ADS_V2_OVERLAY_LINE_HEIGHT) / H
  const top = el.y_anchor === '100%' ? bottom - h : el.y_anchor === '50%' ? pct(el.y) - h / 2 : pct(el.y)
  const longest = Math.max(1, ...lines.map((l) => l.length))
  const halfW = Math.min(ADS_V2_CLOSE_REAL_CAPTION_WIDTH, (longest * font * ADS_V2_OVERLAY_CHAR_EM) / W + 0.06) / 2
  return { x0: r4(0.5 - halfW), x1: r4(0.5 + halfW), y0: r4(top), y1: r4(top + h) }
}

/**
 * O lugar do selo no gancho (puro): a MAIOR fonte da escada em que a pílula cabe num canto (direito primeiro, depois o esquerdo), o mais
 * alto possível dentro de 14%–65%, sem tocar o produto (folga das legendas do Close real) nem as legendas do gancho. null = não cabe em
 * lugar nenhum sem cobrir nada (o selo fica de fora; o cartão e a voz seguem com a oferta).
 */
export function adsV2KitBfBadgePlace(offer: string, W: number, H: number, span: AdsV2KitBfBox, captions: readonly AdsV2KitBfBox[]): { px: number; side: 'right' | 'left'; box: AdsV2KitBfBox; text: string } | null {
  // as alturas candidatas: a grade fina e, de propósito, logo abaixo de cada obstáculo (legenda e produto)
  const ys = [...new Set([ADS_V2_SAFE_TOP, ...captions.map((c) => c.y1 + ADS_V2_KIT_BF_BADGE_TEXT_GAP + 1e-4), span.y1 + ADS_V2_CLOSE_REAL_CAPTION_PRODUCT_GAP + 1e-4, ...Array.from({ length: Math.ceil((ADS_V2_SAFE_BOTTOM - ADS_V2_SAFE_TOP) / 0.0025) + 1 }, (_, k) => ADS_V2_SAFE_TOP + k * 0.0025)].map((y) => r4(y)))].filter((y) => y >= ADS_V2_SAFE_TOP - 1e-9).sort((a, b) => a - b)
  for (let f = ADS_V2_KIT_BF_BADGE_FONT_MAX; f >= ADS_V2_KIT_BF_BADGE_FONT_MIN - 1e-9; f -= 0.002) {
    const px = Math.round(f * H)
    for (const text of adsV2KitBfBadgeTexts(offer)) {
      const { w, h } = adsV2KitBfPill(text, px, W, H)
      if (w > 1 - 2 * ADS_V2_KIT_BF_BADGE_EDGE) continue
      for (const side of ['right', 'left'] as const) {
        const x0 = side === 'right' ? 1 - ADS_V2_KIT_BF_BADGE_EDGE - w : ADS_V2_KIT_BF_BADGE_EDGE
        for (const y0 of ys) {
          if (y0 + h > ADS_V2_SAFE_BOTTOM + 1e-9) break
          const box = { x0: r4(x0), x1: r4(x0 + w), y0: r4(y0), y1: r4(y0 + h) }
          if (hit(box, span, ADS_V2_CLOSE_REAL_CAPTION_PRODUCT_GAP)) continue
          if (captions.some((c) => hit(box, c, ADS_V2_KIT_BF_BADGE_TEXT_GAP))) continue
          return { px, side, box, text }
        }
      }
    }
  }
  return null
}
/** O selo só no começo do gancho (antes da 1ª troca de legenda) precisa durar pelo menos isto (s); menos que isso = sem selo. */
export const ADS_V2_KIT_BF_BADGE_MIN_SECONDS = 1.2

/**
 * O cartão com a oferta (puro): nome logo abaixo do produto do fundo do kit, a oferta na maior fonte que cabe e o botão abaixo dela,
 * inteiro até 65%. null = não cabe (o cartão fica como estava).
 */
export function adsV2KitBfCardLayout(i: { offer: string; nameText: string; namePx: number; buttonPx: number; W: number; H: number; productBottom?: number }): { nameY: number; offer: { px: number; cy: number; box: AdsV2KitBfBox }; buttonCy: number; buttonBox: AdsV2KitBfBox } | null {
  const { W, H } = i
  const productBottom = typeof i.productBottom === 'number' ? i.productBottom : ADS_V2_KIT_BF_CARD_PRODUCT_BOX.y1
  const nameY = productBottom + ADS_V2_KIT_BF_CARD_NAME_GAP
  const nameLines = i.nameText ? Math.max(1, adsV2OverlayLines(i.nameText, i.namePx, W).length) : 0
  const nameBottom = nameY + (nameLines * i.namePx * ADS_V2_OVERLAY_LINE_HEIGHT) / H / 2
  const half = (i.buttonPx * (ADS_V2_OVERLAY_LINE_HEIGHT + 2 * pct(ADS_V2_CLOSE_REAL_CTA_PAD_Y))) / H / 2
  for (let f = ADS_V2_KIT_BF_CARD_FONT_MAX; f >= ADS_V2_KIT_BF_CARD_FONT_MIN - 1e-9; f -= 0.002) {
    const px = Math.round(f * H)
    const p = adsV2KitBfPill(i.offer, px, W, H)
    if (p.w > 0.9) continue
    const top = nameBottom + ADS_V2_KIT_BF_CARD_GAP
    const buttonCy = top + p.h + ADS_V2_KIT_BF_CARD_BUTTON_GAP + half
    if (buttonCy + half > ADS_V2_SAFE_BOTTOM + 1e-9) continue
    return { nameY: r4(nameY), offer: { px, cy: r4(top + p.h / 2), box: { x0: r4(0.5 - p.w / 2), x1: r4(0.5 + p.w / 2), y0: r4(top), y1: r4(top + p.h) } }, buttonCy: r4(buttonCy), buttonBox: { x0: 0, x1: 1, y0: r4(buttonCy - half), y1: r4(buttonCy + half) } }
  }
  return null
}

const pill = (o: { text: string; track: number; time: number; duration: number; x: string; xAnchor: string; y: number; px: number; fontFamily: string; enter?: unknown }): El => ({
  type: 'text', track: o.track, time: o.time, duration: o.duration, text: o.text, x: o.x, y: `${r4(o.y * 100)}%`, x_anchor: o.xAnchor, y_anchor: '50%', x_alignment: '50%',
  font_family: o.fontFamily, font_size: o.px, font_weight: '800', line_height: '110%', fill_color: ADS_V2_KIT_BF_INK, background_color: ADS_V2_KIT_BF_BG,
  background_x_padding: ADS_V2_KIT_BF_PAD_X, background_y_padding: ADS_V2_KIT_BF_PAD_Y, background_border_radius: ADS_V2_CLOSE_REAL_CTA_RADIUS, ...(o.enter ? { enter_transition: o.enter } : {}),
})

export interface AdsV2KitBfMontageInfo { badge: boolean; card: boolean }

/**
 * O source do Close real com a oferta (puro). offer vazio/null = O MESMO objeto. heroRect = a caixa do produto no PNG do gancho
 * (adsV2CloseRealHero → rect; null = a foto inteira no gancho). kitCardUrl = o fundo do cartão do kit (null = o cartão fica como estava).
 */
export function adsV2KitBfApplyMontage(source: Record<string, unknown>, i: { offer: string | null | undefined; heroRect?: { x: number; y: number; w: number; h: number } | null; kitCardUrl?: string | null; info?: AdsV2KitBfMontageInfo }): Record<string, unknown> {
  const offer = adsV2KitBfOffer(i.offer)
  if (!offer || !source || !Array.isArray(source.elements)) return source
  const W = typeof source.width === 'number' ? source.width : 1080
  const H = typeof source.height === 'number' ? source.height : 1920
  const T = ADS_V2_CLOSE_REAL_TRACKS
  const elements = (source.elements as El[]).map((e) => ({ ...e }))
  const font = (elements.find((e) => e.type === 'text' && typeof e.font_family === 'string')?.font_family as string | undefined) ?? 'Montserrat'
  // 1. o selo do gancho
  const hookEnd = Math.min(...elements.filter((e) => e.type === 'image' && (e.track === T.shotA || e.track === T.shotB) && typeof e.time === 'number' && (e.time as number) > 0).map((e) => e.time as number))
  let badge = false
  if (Number.isFinite(hookEnd) && hookEnd > 0) {
    const span = adsV2KitBfHookSpan(i.heroRect ?? null)
    const hookCaps = elements.filter((e) => e.type === 'text' && e.track === T.text && typeof e.time === 'number' && (e.time as number) < hookEnd - 1e-6)
    const boxesUntil = (t: number) => hookCaps.filter((e) => (e.time as number) < t - 1e-6).map((e) => adsV2KitBfCaptionBox(e, W, H)).filter((b): b is AdsV2KitBfBox => !!b)
    // o gancho inteiro; se não couber, só até a 1ª troca de legenda dentro do gancho (se isso durar ≥ ADS_V2_KIT_BF_BADGE_MIN_SECONDS)
    const firstChange = Math.min(...hookCaps.map((e) => e.time as number).filter((t) => t > 1e-6))
    const tries = [hookEnd, ...(Number.isFinite(firstChange) && firstChange >= ADS_V2_KIT_BF_BADGE_MIN_SECONDS ? [firstChange] : [])]
    for (const until of tries) {
      const place = adsV2KitBfBadgePlace(offer, W, H, span, boxesUntil(until))
      if (!place) continue
      elements.push(pill({ text: place.text, track: ADS_V2_KIT_BF_TRACKS.badge, time: 0, duration: Math.round(until * 1000) / 1000, x: place.side === 'right' ? `${r4((1 - ADS_V2_KIT_BF_BADGE_EDGE) * 100)}%` : `${r4(ADS_V2_KIT_BF_BADGE_EDGE * 100)}%`, xAnchor: place.side === 'right' ? '100%' : '0%', y: (place.box.y0 + place.box.y1) / 2, px: place.px, fontFamily: font }))
      badge = true
      break
    }
  }
  // 2. o cartão: fundo do kit, nome mais alto, a oferta grande, o botão embaixo dela
  let card = false
  const cardImg = elements.find((e) => e.type === 'image' && e.track === T.card)
  const nameEl = elements.find((e) => e.type === 'text' && e.track === ADS_V2_CLOSE_REAL_CARD_TRACKS.name)
  const btnEl = elements.find((e) => e.type === 'text' && e.track === ADS_V2_CLOSE_REAL_CARD_TRACKS.cta)
  const kitUrl = typeof i.kitCardUrl === 'string' && /^https:\/\/\S+$/i.test(i.kitCardUrl.trim()) ? i.kitCardUrl.trim() : null
  if (cardImg && nameEl && btnEl && kitUrl && typeof nameEl.font_size === 'number' && typeof btnEl.font_size === 'number') {
    const lay = adsV2KitBfCardLayout({ offer, nameText: String(nameEl.text ?? ''), namePx: nameEl.font_size, buttonPx: btnEl.font_size, W, H })
    if (lay) {
      cardImg.source = kitUrl
      nameEl.y = `${r4(lay.nameY * 100)}%`
      btnEl.y = `${r4(lay.buttonCy * 100)}%`
      elements.push(pill({ text: offer, track: ADS_V2_KIT_BF_TRACKS.cardOffer, time: nameEl.time as number, duration: nameEl.duration as number, x: '50%', xAnchor: '50%', y: lay.offer.cy, px: lay.offer.px, fontFamily: font, enter: nameEl.enter_transition }))
      card = true
    }
  }
  if (i.info) { i.info.badge = badge; i.info.card = card }
  return { ...source, elements }
}
