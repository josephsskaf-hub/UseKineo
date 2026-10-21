// KINEO-ADS-QUALIDADE-2110 — Studio Ads com cara de anúncio que vende, para QUALQUER produto (fundador 21/10, nota 7 no UGC e 4 no Product Ad:
// KINEO-ADS-QUALIDADE-2110 — "não tá natural… a pessoa encostando na mulher um produto… o outro tá só o braço do relógio… o cartão final muito feio").
// LIB PURA (só importa lib/ads/v2BolaFix, também pura): entra no servidor (v2Advance, v2Brief) e no apresentador v2 (import dinâmico).
//   1. A POSE do apresentador: o produto na altura do peito, virado para a câmera, segurado pela mão, longe do rosto, no tamanho real por tipo
//      (pote/frasco/caixa/tênis/bolsa/aparelho) — linha do prompt da foto + a leitura da visão (encostando no rosto, flutuando, escala errada) que a escolha usa.
//   2. O MOVIMENTO: a atuação viva (sobrancelhas, acenos, ombros, o produto chega perto da lente no nome) + um punch-in no meio da fala (corte de UGC,
//      só a animação 'scale' que a casa já usa) e o gancho de 0,7 s com o produto (esconde o piscar longo do 1º segundo do motor).
//   3. O CARTÃO FINAL v3 montado no Creatomate (não mais o PNG da tela): o produto INTEIRO grande no alto sobre o próprio fundo desfocado, painel escuro
//      embaixo com o nome em branco, a OFERTA digitada num selo amarelo e a chamada num botão branco (na língua do anúncio). Serve ao UGC e ao Product Ads.
//   4. O ROTEIRO do Product Ads: todo benefício/oferta digitado aparece na fala; frase genérica ("stunning design", "elevate your style", "X, for you") volta.

import { adsV2BusinessName, adsV2CleanBusiness } from '@/lib/ads/v2BolaFix'

export const MARCA_ADS_QUALIDADE_2110 = 'KINEO-ADS-QUALIDADE-2110'

const r3 = (n: number): number => Math.round(n * 1000) / 1000
const pct = (f: number): string => `${r3(f * 100)}%`
const isHttps = (u: unknown): u is string => typeof u === 'string' && /^https:\/\/\S+$/i.test(u.trim())
const clean = (s: unknown): string => String(s ?? '').replace(/\s+/g, ' ').trim()

// (a pose, a leitura da pose e a atuação viva moram em lib/ads/v2PresenterV2.ts, que não pode ter import de valor)

// ── 2. o movimento ─────────────────────────────────────────────────────────────────────────────────────────────────
/** KINEO-ADS-QUALIDADE-2110 — o gancho: o produto inteiro na tela por 0,7 s enquanto a voz já começa (o motor fecha os olhos no 1º segundo). */
export const ADS_V2_PRESENTER_HOOK_SECONDS = 0.7
/** KINEO-ADS-QUALIDADE-2110 — o punch-in de UGC no meio da fala (o mesmo clipe, mais perto). */
export const ADS_V2_PRESENTER_PUNCH = { at: 0.5, scale: 1.12, fallbackScale: 1.06, ax: 0.5, ay: 0.42, minCut: 5 } as const
/** KINEO-ADS-QUALIDADE-2110 — onde e quanto aproximar (pura). O produto (retângulo em frações) tem de caber inteiro na janela aproximada; senão menos zoom; senão nada. */
export function adsV2PresenterPunch(cut: number, rect: { x0: number; y0: number; x1: number; y1: number } | null | undefined): { at: number; scale: number; ax: number; ay: number } | null {
  if (!(typeof cut === 'number' && Number.isFinite(cut) && cut >= ADS_V2_PRESENTER_PUNCH.minCut)) return null
  const P = ADS_V2_PRESENTER_PUNCH
  const fits = (s: number): boolean => {
    if (!rect || ![rect.x0, rect.y0, rect.x1, rect.y1].every((n) => typeof n === 'number' && Number.isFinite(n))) return true
    const x0 = P.ax - P.ax / s, x1 = P.ax + (1 - P.ax) / s, y0 = P.ay - P.ay / s, y1 = P.ay + (1 - P.ay) / s
    return rect.x0 >= x0 + 0.01 && rect.x1 <= x1 - 0.01 && rect.y0 >= y0 + 0.01 && rect.y1 <= y1 - 0.01
  }
  const scale = fits(P.scale) ? P.scale : fits(P.fallbackScale) ? P.fallbackScale : 0
  if (!scale) return null
  return { at: r3(Math.max(2.5, Math.min(cut - 2, cut * P.at))), scale, ax: P.ax, ay: P.ay }
}
/** KINEO-ADS-QUALIDADE-2110 — o vídeo do apresentador em 1 ou 2 pedaços (puro): antes do punch um zoom lento; depois o punch-in. Mesma trilha, o som continua. */
export function adsV2PresenterVideoElements(i: { url: string; track: number; duration: number; cut: number; rect?: { x0: number; y0: number; x1: number; y1: number } | null }): Record<string, unknown>[] {
  const base = { type: 'video', track: i.track, source: i.url.trim(), fit: 'cover', loop: false, x: '50%', y: '50%', width: '100%', height: '100%', volume: '100%' }
  const p = adsV2PresenterPunch(i.cut, i.rect ?? null)
  if (!p) return [{ ...base, time: 0, duration: r3(i.duration), trim_start: 0, animations: [{ type: 'scale', fade: false, start_scale: '100%', end_scale: '104%', x_anchor: pct(ADS_V2_PRESENTER_PUNCH.ax), y_anchor: pct(ADS_V2_PRESENTER_PUNCH.ay), easing: 'linear' }] }]
  const s = r3(p.scale * 100)
  return [
    { ...base, time: 0, duration: p.at, trim_start: 0, animations: [{ type: 'scale', fade: false, start_scale: '100%', end_scale: '103%', x_anchor: pct(p.ax), y_anchor: pct(p.ay), easing: 'linear' }] },
    { ...base, time: p.at, duration: r3(i.duration - p.at), trim_start: p.at, animations: [{ type: 'scale', fade: false, start_scale: `${s}%`, end_scale: `${r3(s + 3)}%`, x_anchor: pct(p.ax), y_anchor: pct(p.ay), easing: 'linear' }] },
  ]
}

// ── 3. o produto inteiro sobre o próprio fundo desfocado + o cartão final v3 ─────────────────────────────────────────
/** KINEO-ADS-QUALIDADE-2110 — o fundo é a própria foto (nunca mais o "retângulo no fundo marrom"). */
export const ADS_V2_SOFT_BG_BLUR = 0 // desligado: blur_radius nunca foi exercitado num render nosso (regra da casa); ligar só depois de UM render de validação
/** KINEO-ADS-QUALIDADE-2110 — o fundo SEM propriedade nova: a própria foto em cover (sem véu) preenche o quadro; a foto inteira (contain) vem por cima. */
export const ADS_V2_SOFT_BG_FRAME = { x: '50%', y: '50%', width: '100%', height: '100%' } as const // rodada 1 (pedido 194e9b50): o canto ampliado 4× saiu PRETO no Creatomate; a própria foto em cover (o fundo liso do packshot emenda com a foto inteira)
export const ADS_V2_SOFT_BG_VEIL = 'rgba(0,0,0,0)' // sem véu: o fundo e as bordas da foto inteira se emendam (véu escuro desenharia o retângulo de novo)
/** KINEO-ADS-QUALIDADE-2110 — a foto INTEIRA do produto (contain: nada cortado) sobre a mesma foto em cover, ampliada e desfocada, as 3 na MESMA trilha (como o adsV2PackshotElements de produção). `box` = onde o produto mora (frações). */
export function adsV2SoftPackshotElements(url: string, track: number, time: number, duration: number, opts: { box?: { y: number; h: number; w?: number }; zoomEnd?: string; extra?: Record<string, unknown> } = {}): Record<string, unknown>[] {
  const source = url.trim()
  const extra = opts.extra ?? {}
  const box = opts.box ?? { y: 0.5, h: 1, w: 1 }
  return [
    { type: 'image', track, time, duration, source, fit: 'cover', ...ADS_V2_SOFT_BG_FRAME, ...(ADS_V2_SOFT_BG_BLUR > 0 ? { blur_radius: ADS_V2_SOFT_BG_BLUR } : {}), ...extra },
    { type: 'shape', track, time, duration, x: '50%', y: '50%', width: '100%', height: '100%', path: 'M 0 0 L 100 0 L 100 100 L 0 100 L 0 0 Z', fill_color: ADS_V2_SOFT_BG_VEIL, ...extra },
    { type: 'image', track, time, duration, source, fit: 'contain', x: '50%', y: pct(box.y), width: pct(box.w ?? 1), height: pct(box.h), ...extra, animations: [{ type: 'scale', fade: false, start_scale: '100%', end_scale: opts.zoomEnd ?? '106%', easing: 'linear' }] },
  ]
}

export interface AdsV2EndCardV3 { title: string; offer: string; cta: string; contact: string }
const OFFER_RE = /%|\b(off|free|sale|deal|promo|discount|coupon|code|only|save|gr[áa]tis|frete|desconto|cupom|promo[çc][ãa]o|oferta|apenas|leve|descuento|env[íi]o|rebaja|solo|ahorra)\b|[$€£]|R\$|\b\d+\s*x\s*\d+\b|\b2x1\b/i
const CTA_KIND: Readonly<Record<string, Record<string, string>>> = {
  call: { en: 'Call now', pt: 'Ligue agora', es: 'Llama ahora' },
  whatsapp: { en: 'Message us on WhatsApp', pt: 'Chame no WhatsApp', es: 'Escríbenos por WhatsApp' },
  visit: { en: 'Visit us today', pt: 'Venha nos visitar', es: 'Visítanos hoy' },
  book: { en: 'Book now', pt: 'Agende agora', es: 'Reserva ahora' },
  signup: { en: 'Sign up now', pt: 'Inscreva-se', es: 'Inscríbete' },
}
const cap = (s: string): string => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s)
/** KINEO-ADS-QUALIDADE-2110 — as partes da oferta digitada (vírgula/ponto e vírgula), limpas. Pura. */
export function adsV2OfferParts(offer: unknown): string[] {
  return clean(offer).split(/\s*[,;]\s*|\s+[—–]\s+|\s*·\s*/).map((p) => p.replace(/^[\s.!-]+|[\s.!]+$/g, '')).filter((p) => p.length >= 2 && p.length <= 60)
}
/** KINEO-ADS-QUALIDADE-2110 — o selo do cartão: as partes que SÃO oferta (desconto, frete grátis, preço), até 30 caracteres. Sem oferta = ''. Pura. */
export function adsV2EndCardOffer(offer: unknown): string {
  const all = adsV2OfferParts(offer)
  const parts = all.filter((p) => OFFER_RE.test(p))
  let out = ''
  for (const p of parts) { const next = out ? `${out} · ${p}` : p; if (next.length > 30) break; out = next }
  if (!out && all[0]) out = all[0].slice(0, 30).trim()
  return cap(out)
}
/** KINEO-ADS-QUALIDADE-2110 — o título do cartão: o nome; nome de 1 palavra + o que vende curto ("Pulse" + "smartwatch") = os dois. Pura. */
export function adsV2EndCardTitle(business: unknown): string {
  const name = adsV2BusinessName(business)
  const parts = adsV2CleanBusiness(business).split(/\s+[—–-]\s+|\s*·\s*/)
  const sells = clean(parts[1] ?? '')
  const t = name && name.split(' ').length === 1 && sells && sells.split(' ').length <= 3 && !sells.toLowerCase().includes(name.toLowerCase()) ? `${name} ${sells}` : name
  return cap(t).slice(0, 48).trim()
}
/** KINEO-ADS-QUALIDADE-2110 — o que o cartão diz (pura): título, selo da oferta, chamada (a do pedido, na língua) e o contato. Sem título = null (fica o cartão do pedido). */
export function adsV2EndCardV3Of(i: { business: unknown; offer: unknown; ctaKind?: unknown; contact?: unknown; language?: unknown; buyLabel: string }): AdsV2EndCardV3 | null {
  const title = adsV2EndCardTitle(i.business)
  if (!title) return null
  const lang = String(i.language ?? 'en').toLowerCase().slice(0, 2)
  const kind = typeof i.ctaKind === 'string' ? i.ctaKind : 'buy'
  const cta = kind !== 'buy' && CTA_KIND[kind] ? CTA_KIND[kind][lang] ?? CTA_KIND[kind].en : clean(i.buyLabel) || 'Shop now'
  const contact = clean(i.contact).slice(0, 40)
  return { title, offer: adsV2EndCardOffer(i.offer), cta, contact }
}
/** KINEO-ADS-QUALIDADE-2110 — o desenho do cartão v3 (frações do quadro). Tudo acima de 80% (a interface do TikTok/Reels mora embaixo). */
export const ADS_V2_END_CARD_V3 = { productY: 0.3, productH: 0.5, productW: 0.94, panelTop: 0.58, panelFill: 'rgba(12,12,14,0.9)', titleY: 0.64, titleFont: 0.056, titleFontMin: 0.034, offerY: 0.71, offerFont: 0.036, offerFill: '#111111', offerBg: '#FFD23F', ctaY: 0.78, ctaFont: 0.04, ctaFill: '#111111', ctaBg: '#ffffff', contactY: 0.84, contactFont: 0.024 } as const
const CHAR_EM = 0.56
/** KINEO-ADS-QUALIDADE-2110 — os elementos do cartão final v3 (puro). Usa as trilhas track..track+7. */
export function adsV2EndCardV3Elements(i: { productUrl: string; card: AdsV2EndCardV3; fontFamily: string; width: number; height: number; time: number; duration: number; track: number; fade?: number }): Record<string, unknown>[] {
  if (!isHttps(i.productUrl)) throw new Error('ads_v2_end_card_v3_bad_product')
  const L = ADS_V2_END_CARD_V3, W = i.width, H = i.height, time = r3(i.time), duration = r3(i.duration)
  const enter = { enter_transition: { type: 'fade', duration: i.fade ?? 0.25 } }
  const els: Record<string, unknown>[] = adsV2SoftPackshotElements(i.productUrl, i.track, time, duration, { box: { y: L.productY, h: L.productH, w: L.productW }, zoomEnd: '104%', extra: enter })
  els.push({ type: 'shape', track: i.track + 3, time, duration, x: '50%', y: pct((L.panelTop + 1) / 2), width: '100%', height: pct(1 - L.panelTop), path: 'M 0 0 L 100 0 L 100 100 L 0 100 L 0 0 Z', fill_color: L.panelFill, ...enter })
  const title = clean(i.card.title)
  let tpx = Math.round(L.titleFont * H)
  while (tpx > Math.round(L.titleFontMin * H) && Math.ceil((title.length * tpx * CHAR_EM) / (0.86 * W)) > 2) tpx -= 2
  const text = (track: number, y: number, t: string, px: number, more: Record<string, unknown>): Record<string, unknown> => ({ type: 'text', track, time, duration, text: t, x: '50%', y: pct(y), x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', width: '86%', font_family: i.fontFamily, font_size: px, font_weight: '800', line_height: '110%', ...more, ...enter })
  els.push(text(i.track + 4, L.titleY, title, tpx, { fill_color: '#ffffff' }))
  const offer = clean(i.card.offer)
  const slots = offer ? [L.offerY, L.ctaY, L.contactY] : [L.offerY, L.contactY - 0.065, L.contactY]
  if (offer) els.push(text(i.track + 5, slots[0], offer, Math.round(L.offerFont * H), { fill_color: L.offerFill, background_color: L.offerBg, background_x_padding: '5%', background_y_padding: '2%', border_radius: 18 }))
  const cta = clean(i.card.cta)
  if (cta) els.push(text(i.track + 6, offer ? slots[1] : slots[0], cta, Math.round(L.ctaFont * H), { fill_color: L.ctaFill, background_color: L.ctaBg, background_x_padding: '9%', background_y_padding: '2.4%', border_radius: 60 }))
  const contact = clean(i.card.contact)
  if (contact) els.push(text(i.track + 7, offer ? slots[2] : slots[1], contact, Math.round(L.contactFont * H), { fill_color: 'rgba(255,255,255,0.85)', font_weight: '600' }))
  return els
}

// ── 4. o roteiro: todo benefício digitado na fala; nada de frase genérica ─────────────────────────────────────────
const STOP = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'your', 'you', 'all', 'our', 'por', 'para', 'com', 'sem', 'uma', 'um', 'the', 'del', 'los', 'las', 'con', 'una', 'que', 'mais', 'más', 'muito', 'very', 'more'])
const tokens = (s: string): string[] => clean(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9%]+/).filter(Boolean)
/** KINEO-ADS-QUALIDADE-2110 — os benefícios/ofertas que a pessoa DIGITOU (pura): as partes da oferta + o "o que vende" do negócio quando é frase (≥ 2 palavras). */
export function adsV2TypedBenefits(brief: { business?: unknown; offer?: unknown } | null | undefined): string[] {
  const out: string[] = []
  const parts = adsV2CleanBusiness(brief?.business).split(/\s+[—–-]\s+|\s*·\s*/)
  const sells = clean(parts[1] ?? '')
  if (sells.split(' ').length >= 2) out.push(sells)
  for (const p of adsV2OfferParts(brief?.offer)) out.push(p)
  const seen = new Set<string>()
  return out.filter((b) => { const k = b.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 4)
}
/** KINEO-ADS-QUALIDADE-2110 — os benefícios que a fala NÃO diz (pura): todo número tem de aparecer e ≥ 60% das palavras de conteúdo. */
export function adsV2MissingBenefits(narration: unknown, benefits: readonly string[]): string[] {
  const have = new Set(tokens(String(narration ?? '')))
  return benefits.filter((b) => {
    const t = tokens(b).filter((w) => /\d/.test(w) || (w.length >= 3 && !STOP.has(w)))
    if (t.length === 0) return false
    if (t.some((w) => /\d/.test(w) && !have.has(w) && !have.has(w.replace('%', '')))) return true
    return t.filter((w) => have.has(w)).length / t.length < 0.6
  })
}
const GENERIC_RE = /\b(stunning design|sleek design|elegant design|elevate your (?:style|look|game|routine|day|everyday)|take (?:it|your \w+) to the next level|next level|game[- ]changer|must[- ]have|look no further|upgrade your (?:life|style|look)|perfect for (?:any|every) occasion|you deserve (?:it|the best)|treat yourself|like never before|experience the (?:difference|future)|redefin\w+|unleash|ultimate|revolutionary|intuitive features|modern look|sleek look|stylish look|upgrade your w+|take a closer look|look and feel|premium quality|high[- ]quality|top[- ]notch|cutting[- ]edge|innovative|state[- ]of[- ]the[- ]art|everyday essential|perfect companion|you'll love|ends soon|last chance|hurry|limited time|don't miss out|while (?:it|they|supplies) lasts?|eleve seu estilo|design deslumbrante|design incr[íi]vel|imperd[íi]vel|n[ãa]o perca|eleva tu estilo|dise[ñn]o impresionante)\b/i
/** KINEO-ADS-QUALIDADE-2110 — as frases genéricas da fala (pura): os clichês e o fecho "X, for you". */
export function adsV2GenericFiller(narration: unknown, typed: readonly string[] = []): string[] {
  const n = clean(narration)
  const out: string[] = []
  const said = typed.join(' ').toLowerCase()
  const g = n.match(new RegExp(GENERIC_RE.source, 'gi'))
  if (g) out.push(...g.filter((m) => !said.includes(m.toLowerCase())))
  const forYou = n.match(/(?:^|[.!?]\s+)([^.!?]{1,30},\s*(?:for you|para voc[êe]|para ti))[.!?]?\s*$/i)
  if (forYou) out.push(forYou[1].trim())
  return out.slice(0, 4)
}
/** KINEO-ADS-QUALIDADE-2110 — a regra do roteiro de PRODUTO (pedido ao modelo). Sem benefício digitado = só a parte do genérico. */
export function adsV2BenefitRule(benefits: readonly string[]): string {
  const say = benefits.length ? `say every benefit and offer the customer typed, each one clearly and with its exact numbers: ${benefits.map((b) => `"${b}"`).join(', ')}. ` : ''
  return `narration: ${say}Say each offer exactly as typed and never add urgency the customer did not type ("ends soon", "last chance", "hurry", "limited time"). Never describe qualities the customer did not type (design, look, features, quality, comfort): fill the time with the typed benefits said again in other words, the product name and a clear call to action ("Order yours today"). Never use generic filler such as "stunning design", "intuitive features", "elevate your style", "upgrade your tech", "take a closer look", "must-have" or a closing "<name>, for you". Write full sentences without dashes (—).`
}
/** KINEO-ADS-QUALIDADE-2110 — os motivos de correção do roteiro de produto (puros): benefício faltando, frase genérica, travessão. */
export function adsV2BenefitWhy(narration: unknown, benefits: readonly string[]): string[] {
  const why: string[] = []
  const miss = adsV2MissingBenefits(narration, benefits)
  if (miss.length) why.push(`narration: say ${miss.map((b) => `"${b}"`).join(', ')} — the customer typed ${miss.length > 1 ? 'them' : 'it'}; keep the exact numbers.`)
  const gen = adsV2GenericFiller(narration, benefits)
  if (gen.length) why.push(`narration: remove the generic filler (${gen.map((g) => `"${g}"`).join(', ')}) and say a concrete fact from the brief instead.`)
  if (/[—–]/.test(String(narration ?? ''))) why.push('narration: do not use dashes (—); write full sentences.')
  return why
}
