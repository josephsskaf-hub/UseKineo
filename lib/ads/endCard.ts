// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — cartão final do anúncio (logo + nome + oferta + chamada + contato),
// desenhado no navegador num <canvas> 1080×1920 e enviado como PNG pelo /api/footage (card_footage_id do render).
// Cliente puro (sem import de servidor).
//
// ZONA SEGURA: o Kineo 1 aplica "cover" + Ken Burns até 110 % ancorado em 38 %/62 % e as legendas moram embaixo.
// Todo texto e o logo ficam dentro da caixa x 8–92 %, y 12–64 %; o fundo cobre a tela inteira para o zoom não
// mostrar borda. Se o conteúdo não couber, a fonte encolhe (até 55 %) antes de cortar linha.
// CORS: o logo vem do File local (URL blob:) quando existe; senão da URL pública com crossOrigin='anonymous'
// definido ANTES do src — senão o canvas fica "tainted" e o toBlob lança SecurityError.
import type { AdsBrief } from '@/lib/ads/types'

export const END_CARD_WIDTH = 1080
export const END_CARD_HEIGHT = 1920
/** Caixa segura em fração da tela (x 8–92 %, y 12–64 %). */
export const END_CARD_SAFE = { x0: 0.08, x1: 0.92, y0: 0.12, y1: 0.64 } as const

export interface EndCardInput {
  logo: HTMLImageElement | ImageBitmap | null
  business: string
  offer: string
  ctaLabel: string
  contact: string
  /** Cor de destaque (padrão: o azul da casa). */
  accent?: string
}

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif'
const DEFAULT_ACCENT = '#2997ff'

/** Rótulo do botão do cartão por chamada e idioma (fallback em inglês; a tela deixa a pessoa editar). */
const CTA_LABELS: Record<AdsBrief['cta'], Record<string, string>> = {
  call: { en: 'Call us', pt: 'Ligue agora', es: 'Llámanos', fr: 'Appelez-nous', de: 'Ruf uns an', it: 'Chiamaci', nl: 'Bel ons', id: 'Hubungi kami' },
  whatsapp: { en: 'Message us on WhatsApp', pt: 'Chame no WhatsApp', es: 'Escríbenos por WhatsApp', fr: 'Écrivez-nous sur WhatsApp', de: 'Schreib uns auf WhatsApp', it: 'Scrivici su WhatsApp', nl: 'App ons via WhatsApp', id: 'Chat via WhatsApp' },
  visit: { en: 'Visit us', pt: 'Venha nos visitar', es: 'Visítanos', fr: 'Venez nous voir', de: 'Besuch uns', it: 'Vieni a trovarci', nl: 'Kom langs', id: 'Kunjungi kami' },
  buy: { en: 'Buy now', pt: 'Compre agora', es: 'Compra ahora', fr: 'Achetez maintenant', de: 'Jetzt kaufen', it: 'Acquista ora', nl: 'Koop nu', id: 'Beli sekarang' },
  book: { en: 'Book now', pt: 'Agende agora', es: 'Reserva ahora', fr: 'Réservez maintenant', de: 'Jetzt buchen', it: 'Prenota ora', nl: 'Boek nu', id: 'Pesan sekarang' },
  signup: { en: 'Sign up', pt: 'Inscreva-se', es: 'Inscríbete', fr: 'Inscrivez-vous', de: 'Jetzt anmelden', it: 'Iscriviti', nl: 'Schrijf je in', id: 'Daftar sekarang' },
}

export function endCardCtaLabel(cta: AdsBrief['cta'], language: string | null | undefined): string {
  const byLang = CTA_LABELS[cta] ?? CTA_LABELS.call
  const lang = (language ?? 'en').slice(0, 2).toLowerCase()
  return byLang[lang] ?? byLang.en
}

function font(weight: number, size: number): string {
  return `${weight} ${Math.round(size)}px ${FONT_STACK}`
}

/** Quebra por palavra com measureText; palavra maior que a linha é quebrada por caractere. Máximo de `maxLines`, com reticências. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const words = clean.split(' ')
  const lines: string[] = []
  let line = ''
  const pushWord = (word: string) => {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate
      return
    }
    if (line) {
      lines.push(line)
      line = ''
    }
    if (ctx.measureText(word).width <= maxWidth) {
      line = word
      return
    }
    // Palavra sozinha maior que a linha (URL longa, telefone sem espaço): quebra por caractere.
    let chunk = ''
    for (const ch of word) {
      if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
        lines.push(chunk)
        chunk = ch
      } else chunk += ch
    }
    line = chunk
  }
  for (const w of words) pushWord(w)
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
  kept[maxLines - 1] = `${last.replace(/\s+$/, '')}…`
  return kept
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y, x + w, y + rr, rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr, rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y, x + rr, y, rr)
  ctx.closePath()
}

function sourceSize(src: HTMLImageElement | ImageBitmap): { w: number; h: number } {
  if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) return { w: src.naturalWidth || src.width, h: src.naturalHeight || src.height }
  return { w: src.width, h: src.height }
}

/** O logo é escuro sobre fundo transparente? Então ganha uma placa clara, senão some no fundo escuro. */
function logoNeedsPlate(src: HTMLImageElement | ImageBitmap): boolean {
  try {
    const probe = document.createElement('canvas')
    probe.width = 48
    probe.height = 48
    const pctx = probe.getContext('2d', { willReadFrequently: true } as CanvasRenderingContext2DSettings)
    if (!pctx) return false
    pctx.drawImage(src, 0, 0, 48, 48)
    const { data } = pctx.getImageData(0, 0, 48, 48)
    let transparent = 0
    let opaque = 0
    let lum = 0
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a < 32) { transparent++; continue }
      opaque++
      lum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
    }
    const total = transparent + opaque
    if (!opaque || transparent / total < 0.1) return false
    return lum / opaque < 0.38
  } catch {
    return false
  }
}

interface Layout {
  scale: number
  logoBox: { w: number; h: number } | null
  nameLines: string[]
  offerLines: string[]
  ctaLines: string[]
  contactLines: string[]
  sizes: { name: number; offer: number; cta: number; contact: number }
  gaps: { afterLogo: number; afterName: number; afterOffer: number }
  pill: { w: number; h: number; padY: number }
  height: number
}

function measureLayout(ctx: CanvasRenderingContext2D, input: EndCardInput, scale: number, boxW: number): Layout {
  const sizes = { name: 78 * scale, offer: 54 * scale, cta: 50 * scale, contact: 44 * scale }
  const gaps = { afterLogo: 56 * scale, afterName: 34 * scale, afterOffer: 60 * scale }
  let logoBox: Layout['logoBox'] = null
  if (input.logo) {
    const { w, h } = sourceSize(input.logo)
    if (w > 0 && h > 0) {
      const maxW = boxW * 0.62
      const maxH = 300 * scale
      const k = Math.min(maxW / w, maxH / h)
      logoBox = { w: w * k, h: h * k }
    }
  }
  ctx.font = font(800, sizes.name)
  const nameLines = wrapText(ctx, input.business, boxW, 3)
  ctx.font = font(700, sizes.offer)
  const offerLines = wrapText(ctx, input.offer, boxW, 3)
  const pillInnerW = boxW - 2 * 44 * scale
  ctx.font = font(800, sizes.cta)
  const ctaLines = wrapText(ctx, input.ctaLabel, pillInnerW, 2)
  ctx.font = font(600, sizes.contact)
  const contactLines = wrapText(ctx, input.contact, pillInnerW, 2)
  const lh = (s: number) => s * 1.22
  const padY = 34 * scale
  const pillH = ctaLines.length * lh(sizes.cta) + (contactLines.length ? 12 * scale + contactLines.length * lh(sizes.contact) : 0) + padY * 2
  ctx.font = font(800, sizes.cta)
  const ctaW = Math.max(0, ...ctaLines.map((l) => ctx.measureText(l).width))
  ctx.font = font(600, sizes.contact)
  const contactW = Math.max(0, ...contactLines.map((l) => ctx.measureText(l).width))
  const pillW = Math.min(boxW, Math.max(ctaW, contactW) + 2 * 64 * scale)
  const hasPill = ctaLines.length + contactLines.length > 0

  let height = 0
  if (logoBox) height += logoBox.h + (logoBox && (nameLines.length || offerLines.length || hasPill) ? gaps.afterLogo : 0)
  if (nameLines.length) height += nameLines.length * lh(sizes.name) + (offerLines.length || hasPill ? gaps.afterName : 0)
  if (offerLines.length) height += offerLines.length * lh(sizes.offer) + (hasPill ? gaps.afterOffer : 0)
  if (hasPill) height += pillH
  return { scale, logoBox, nameLines, offerLines, ctaLines, contactLines, sizes, gaps, pill: { w: pillW, h: hasPill ? pillH : 0, padY }, height }
}

/** Desenha o cartão final no canvas (redimensiona para 1080×1920). */
export function drawEndCard(canvas: HTMLCanvasElement, input: EndCardInput): void {
  canvas.width = END_CARD_WIDTH
  canvas.height = END_CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unsupported')
  const W = END_CARD_WIDTH
  const H = END_CARD_HEIGHT
  const accent = input.accent || DEFAULT_ACCENT

  // Fundo: gradiente escuro + brilho suave da cor de destaque (cobre a tela toda por causa do zoom).
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0d1422')
  bg.addColorStop(0.55, '#090d15')
  bg.addColorStop(1, '#05070b')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, H * 0.36, 40, W / 2, H * 0.36, W * 0.95)
  glow.addColorStop(0, hexToRgba(accent, 0.22))
  glow.addColorStop(1, hexToRgba(accent, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  const x0 = W * END_CARD_SAFE.x0
  const x1 = W * END_CARD_SAFE.x1
  const y0 = H * END_CARD_SAFE.y0
  const y1 = H * END_CARD_SAFE.y1
  const boxW = x1 - x0
  const boxH = y1 - y0
  const cx = W / 2

  let layout = measureLayout(ctx, input, 1, boxW)
  for (let s = 0.94; layout.height > boxH && s >= 0.55; s -= 0.06) layout = measureLayout(ctx, input, s, boxW)

  let y = y0 + Math.max(0, (boxH - layout.height) / 2)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const lh = (s: number) => s * 1.22
  const hasText = layout.nameLines.length || layout.offerLines.length || layout.pill.h

  if (input.logo && layout.logoBox) {
    const { w, h } = layout.logoBox
    const lx = cx - w / 2
    if (logoNeedsPlate(input.logo)) {
      const pad = 28 * layout.scale
      ctx.fillStyle = 'rgba(255,255,255,0.94)'
      roundRect(ctx, lx - pad, y - pad, w + pad * 2, h + pad * 2, 28 * layout.scale)
      ctx.fill()
    }
    ctx.save()
    roundRect(ctx, lx, y, w, h, 18 * layout.scale)
    ctx.clip()
    ctx.drawImage(input.logo, lx, y, w, h)
    ctx.restore()
    y += h + (hasText ? layout.gaps.afterLogo : 0)
  }

  if (layout.nameLines.length) {
    ctx.fillStyle = '#ffffff'
    ctx.font = font(800, layout.sizes.name)
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 18
    for (const l of layout.nameLines) {
      ctx.fillText(l, cx, y)
      y += lh(layout.sizes.name)
    }
    ctx.shadowBlur = 0
    if (layout.offerLines.length || layout.pill.h) y += layout.gaps.afterName
  }

  if (layout.offerLines.length) {
    ctx.fillStyle = lighten(accent)
    ctx.font = font(700, layout.sizes.offer)
    for (const l of layout.offerLines) {
      ctx.fillText(l, cx, y)
      y += lh(layout.sizes.offer)
    }
    if (layout.pill.h) y += layout.gaps.afterOffer
  }

  if (layout.pill.h) {
    const pw = layout.pill.w
    const ph = layout.pill.h
    const px = cx - pw / 2
    const grad = ctx.createLinearGradient(px, y, px + pw, y + ph)
    grad.addColorStop(0, lighten(accent, 0.12))
    grad.addColorStop(1, accent)
    ctx.fillStyle = grad
    ctx.shadowColor = hexToRgba(accent, 0.45)
    ctx.shadowBlur = 40
    roundRect(ctx, px, y, pw, ph, Math.min(ph / 2, 64 * layout.scale))
    ctx.fill()
    ctx.shadowBlur = 0
    let ty = y + layout.pill.padY
    ctx.fillStyle = '#ffffff'
    ctx.font = font(800, layout.sizes.cta)
    for (const l of layout.ctaLines) {
      ctx.fillText(l, cx, ty)
      ty += lh(layout.sizes.cta)
    }
    if (layout.contactLines.length) {
      ty += 12 * layout.scale
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.font = font(600, layout.sizes.contact)
      for (const l of layout.contactLines) {
        ctx.fillText(l, cx, ty)
        ty += lh(layout.sizes.contact)
      }
    }
  }
}

/** KINEO-ADS-ESTILO-2026-09-26 — o cartão 9:16 inteiro dentro de outro formato (1:1, 4:5, 16:9): escalado para caber na
 *  altura, centralizado, com as laterais pintadas na cor do fundo do próprio cartão. Nada do texto é cortado. */
export function fitCardToFormat(card: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  if (width === card.width && height === card.height) return card
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('canvas_unsupported')
  let fill = '#0b1018'
  try {
    const p = card.getContext('2d')?.getImageData(2, 2, 1, 1).data
    if (p) fill = `rgb(${p[0]},${p[1]},${p[2]})`
  } catch { /* canvas contaminado: fica o escuro padrão */ }
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, width, height)
  const scale = Math.min(width / card.width, height / card.height)
  const w = Math.round(card.width * scale)
  const h = Math.round(card.height * scale)
  ctx.drawImage(card, Math.round((width - w) / 2), Math.round((height - h) / 2), w, h)
  return out
}

/** Exporta o canvas como File PNG ('end-card.png'). Rejeita se o canvas estiver contaminado (logo sem CORS). */
export function toPngFile(canvas: HTMLCanvasElement): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('encode_failed'))
        resolve(new File([blob], 'end-card.png', { type: 'image/png' }))
      }, 'image/png')
    } catch (e) {
      reject(e instanceof Error ? e : new Error('encode_failed'))
    }
  })
}

/** Carrega o logo para desenhar: URL local (blob:) sem CORS; URL pública com crossOrigin definido ANTES do src. */
export function loadLogoImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!src.startsWith('blob:') && !src.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('logo_load_failed'))
    img.src = src
  })
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex) ?? [41, 151, 255]
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`
}

function lighten(hex: string, amount = 0.35): string {
  const rgb = parseHex(hex) ?? [41, 151, 255]
  const mix = rgb.map((c) => Math.round(c + (255 - c) * amount))
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`
}
