// KINEO-KIT-BF-1910 — KIT BLACK FRIDAY, parte 1, no formato "Close do produto real" do Studio Ads (fundador 19/10, "3 decisões sim";
// pesquisa em docs/MERCADO-SEMANA-19-E-26-OUT-2026.md: o que as agências compram para a BF é OFERTA NA TELA + 3 a 5 VARIAÇÕES por produto,
// com o material pronto até 31/10).
//
// LIB PURA (só um import de tipo): o servidor (/plan, o texto do anúncio), a tela e o guardião scripts/test-kit-bf-1910.mjs leem este arquivo.
//
// 1. CARTÃO DE OFERTA — campo opcional "Oferta" (até 24 caracteres: "−30%", "Frete grátis", "Só até 27/11", "Compre 2 leve 3"):
//    · vai ao texto do negócio como "Offer: …" e ao brief.offer (a régua anti-invenção passa a ACEITAR exatamente esse número/prazo, e nenhum outro);
//    · a narração cita a oferta UMA vez (o pedido ao modelo diz isso; adsV2KitBfOfferOnce garante em código: faltou = entra uma frase curta
//      antes do fecho; repetida = as repetições saem);
//    · a montagem (lib/ads/v2KitBfMontage.ts) põe um SELO no gancho (canto, fora do produto e das legendas) e a oferta GRANDE no cartão
//      final, entre o nome e o botão.
//    Oferta vazia = nada muda: nem o texto, nem o pedido ao modelo, nem a montagem (o guardião compara byte a byte).
//    Só para quem tem o Studio Ads de verdade: na amostra grátis a oferta é ignorada no servidor e o campo não aparece (a amostra não muda).
// 2. LOTE DE VARIAÇÕES — "Gerar 1 · 3 · 5": mesmo produto, fotos e oferta; muda o ÂNGULO do roteiro (oferta falada / problema→solução /
//    presente / prova social / novidade) e a ORDEM das fotos. Cada variação é um pedido Close real NORMAL, planejado e cobrado pelas
//    mesmas funções do anúncio único — pelo modo LOTE que já existe (/api/ads/v2/batch: N × /plan, fila, cada linha cobrada inteira
//    quando começa, batch_id em brief.batch). Créditos = N × o preço do nível (adsV2Credits), sem desconto novo (preço é do fundador).
//    O roteiro de cada variação sai de UMA chamada gpt-4o-mini da casa (scripts:false: sem as 2 versões extras).
// 3. FORMATO 4:5 — NÃO entra nesta parte: a montagem do Close real é 9:16 de ponta a ponta (o gancho é um PNG 1080×1920 com o produto na
//    caixa ADS_V2_CLOSE_REAL_PRODUCT_BOX, as legendas usam a zona segura 14%–65% do 9:16 e o cartão também). 4:5 pede um gancho e um cartão
//    próprios e a régua das legendas refeita — anotado para a parte 2 (ADS_V2_KIT_BF_FORMAT_NOTE).
import type { InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

export const ADS_V2_KIT_BF_MARK = 'KINEO-KIT-BF-1910'
/** O teto do campo "Oferta" (o selo do gancho precisa caber no canto). */
export const ADS_V2_KIT_BF_OFFER_MAX = 24
/** Quantas variações a tela oferece (1 = o anúncio de sempre). */
export const ADS_V2_KIT_BF_COUNTS = [1, 3, 5] as const
export type AdsV2KitBfCount = (typeof ADS_V2_KIT_BF_COUNTS)[number]
export const ADS_V2_KIT_BF_FORMAT_NOTE = '4:5 fica para a parte 2: o Close real é 9:16 de ponta a ponta (gancho 1080×1920, zona segura 14%–65%, cartão).'

// ── os ângulos ──────────────────────────────────────────────────────────────────────────────────────────────────────
export type AdsV2KitBfAngle = 'offer' | 'problem' | 'gift' | 'social' | 'new' | 'classic'
export const ADS_V2_KIT_BF_ANGLES: readonly AdsV2KitBfAngle[] = ['offer', 'problem', 'gift', 'social', 'new', 'classic']
/** Com oferta: a 1ª variação é a oferta falada. Sem oferta, a oferta falada nunca entra (seria desconto inventado) e o 5º é o texto de sempre. */
const POOL_WITH_OFFER: readonly AdsV2KitBfAngle[] = ['offer', 'problem', 'gift', 'social', 'new']
const POOL_NO_OFFER: readonly AdsV2KitBfAngle[] = ['problem', 'gift', 'social', 'new', 'classic']

/** Regras de cada ângulo no pedido ao modelo (inglês, como o resto do pedido). Nenhuma autoriza número, nota, prazo ou depoimento. */
export const ADS_V2_KIT_BF_ANGLE_RULES: Readonly<Record<AdsV2KitBfAngle, string>> = {
  offer: 'Angle "spoken offer": open with the customer\'s offer in the first sentence, then what the product is, then a crisp call to action.',
  problem: 'Angle "problem → solution": open with a small everyday problem that this product solves (only what the brief supports), then present the product as the answer, then the call to action.',
  gift: 'Angle "gift idea": present the product as a gift for someone special this season. Never invent who it is for, a price or a deadline.',
  social: 'Angle "why people choose it": say what makes it worth choosing, using only what the brief says. Never invent ratings, reviews, numbers, testimonials, customer counts, rankings or "best-seller".',
  new: 'Angle "discovery": present the product as something worth discovering now. Never say it is new or a launch unless the brief says so.',
  classic: 'Angle "benefit": lead with the main benefit of the product, then the call to action.',
}

/** Os ângulos das N variações (puro): N ≤ 1 = nenhum (o anúncio de sempre); 3 ou 5 = distintos, na ordem da BF. */
export function adsV2KitBfAngles(n: number, hasOffer: boolean): AdsV2KitBfAngle[] {
  if (!Number.isInteger(n) || n <= 1) return []
  return (hasOffer ? POOL_WITH_OFFER : POOL_NO_OFFER).slice(0, Math.min(n, POOL_WITH_OFFER.length))
}

/** O total das N variações (puro): N × o preço do nível — nenhum desconto, nenhum número digitado. null = sem preço. */
export function adsV2KitBfTotal(n: number, credits: number | null): number | null {
  if (credits === null || !Number.isFinite(credits) || credits <= 0) return null
  const k = (ADS_V2_KIT_BF_COUNTS as readonly number[]).includes(n) ? n : 1
  return k * credits
}

/**
 * A ordem das fotos da variação `variant` (pura): a 1ª (a do produto: o gancho sai dela) fica; as outras giram e, depois de uma volta
 * inteira, invertem — variações distintas sempre que há fotos para isso. variant 0 = a ordem de sempre (o mesmo array).
 */
export function adsV2KitBfPhotoOrder(photos: readonly string[], variant: number): string[] {
  const list = Array.isArray(photos) ? [...photos] : []
  if (!Number.isInteger(variant) || variant <= 0 || list.length < 3) return list
  const [head, ...rest] = list
  const L = rest.length
  const r = variant % L
  let turned = [...rest.slice(r), ...rest.slice(0, r)]
  if (Math.floor(variant / L) % 2 === 1) turned = turned.reverse()
  return [head, ...turned]
}

// ── a oferta ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Caracteres que a régua do texto recusa (decoração) ou que quebrariam a voz/o selo: saem da oferta. */
const OFFER_DROP = /[[\]{}#*_<>|\\`~^]|[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{FE0F}\u{200B}-\u{200D}]/gu

/** A oferta limpa (pura): espaços juntos, sem controle nem decoração. '' = null. Passou do teto = null (quem confere o teto é adsV2KitBfFromBody). */
export function adsV2KitBfOffer(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.normalize('NFC').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(OFFER_DROP, '').replace(/\s+/g, ' ').trim()
  if (!t || t.length > ADS_V2_KIT_BF_OFFER_MAX) return null
  return t
}

export interface AdsV2KitBfInput {
  /** A oferta digitada (limpa); null = sem oferta. */
  offer: string | null
  /** O ângulo da variação; null = o anúncio de sempre. */
  angle: AdsV2KitBfAngle | null
  /** A posição da variação no lote (0…4): gira a ordem das fotos. */
  variant: number
}
export const ADS_V2_KIT_BF_NONE: AdsV2KitBfInput = { offer: null, angle: null, variant: 0 }

/**
 * Lê offer / kit_angle / kit_variant do corpo CRU do /plan (o contrato sanitizePlanBody não muda). Só vale no Close real de quem tem o
 * Studio Ads (paid); fora disso, as chaves são ignoradas (a amostra e os outros formatos ficam como estão). Pura.
 */
export function adsV2KitBfFromBody(body: unknown, ctx: { closeReal: boolean; paid: boolean }): { ok: true; value: AdsV2KitBfInput } | { ok: false; error: string } {
  const b = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
  if (!ctx.closeReal || !ctx.paid) return { ok: true, value: ADS_V2_KIT_BF_NONE }
  let offer: string | null = null
  if (b.offer !== undefined && b.offer !== null && b.offer !== '') {
    if (typeof b.offer !== 'string') return { ok: false, error: 'bad_offer' }
    const clean = b.offer.normalize('NFC').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(OFFER_DROP, '').replace(/\s+/g, ' ').trim()
    if (clean.length > ADS_V2_KIT_BF_OFFER_MAX) return { ok: false, error: 'bad_offer' }
    offer = clean || null
  }
  let angle: AdsV2KitBfAngle | null = null
  if (b.kit_angle !== undefined && b.kit_angle !== null) {
    if (typeof b.kit_angle !== 'string' || !(ADS_V2_KIT_BF_ANGLES as readonly string[]).includes(b.kit_angle)) return { ok: false, error: 'bad_kit_angle' }
    angle = b.kit_angle as AdsV2KitBfAngle
  }
  if (angle === 'offer' && !offer) return { ok: false, error: 'kit_angle_needs_offer' }
  let variant = 0
  if (b.kit_variant !== undefined && b.kit_variant !== null) {
    if (typeof b.kit_variant !== 'number' || !Number.isInteger(b.kit_variant) || b.kit_variant < 0 || b.kit_variant >= POOL_WITH_OFFER.length) return { ok: false, error: 'bad_kit_variant' }
    variant = b.kit_variant
  }
  return { ok: true, value: { offer, angle, variant } }
}

/** O que fica gravado no plano do pedido (plan.kitBf) — só com oferta ou ângulo. */
export interface AdsV2KitBfStored { v: 1; offer: string | null; angle: AdsV2KitBfAngle | null; variant: number }
export function adsV2KitBfStored(k: AdsV2KitBfInput): AdsV2KitBfStored | null {
  return k.offer || k.angle ? { v: 1, offer: k.offer, angle: k.angle, variant: k.variant } : null
}
/** O kit gravado no plano (puro). null = pedido sem kit (a montagem de sempre). */
export function adsV2KitBfOfPlan(plan: unknown): AdsV2KitBfStored | null {
  const k = plan && typeof plan === 'object' ? (plan as { kitBf?: unknown }).kitBf : null
  if (!k || typeof k !== 'object') return null
  const s = k as Partial<AdsV2KitBfStored>
  if (s.v !== 1) return null
  const offer = adsV2KitBfOffer(s.offer)
  const angle = typeof s.angle === 'string' && (ADS_V2_KIT_BF_ANGLES as readonly string[]).includes(s.angle) ? (s.angle as AdsV2KitBfAngle) : null
  if (!offer && !angle) return null
  return { v: 1, offer, angle, variant: typeof s.variant === 'number' && Number.isInteger(s.variant) && s.variant >= 0 ? s.variant : 0 }
}

/** O texto do negócio com a oferta (o brief e a régua de honestidade passam a conhecê-la). Sem oferta = o mesmo texto. */
export function adsV2KitBfTextWithOffer(text: string, offer: string | null): string {
  if (!offer || !text) return text
  const line = `Offer: ${offer}`
  return text.split('\n').includes(line) ? text : `${text}\n${line}`
}

/** Põe a oferta digitada no brief.offer (muta e devolve o mesmo objeto): é ela que a régua anti-invenção lê. Sem oferta = nada. */
export function adsV2KitBfBriefOffer<T extends { offer?: string | null }>(brief: T, offer: string | null): T {
  if (!offer || !brief || typeof brief !== 'object') return brief
  const cur = typeof brief.offer === 'string' ? brief.offer.trim() : ''
  if (!cur) brief.offer = offer
  else if (!cur.includes(offer)) brief.offer = `${offer} · ${cur}`
  return brief
}

/** As linhas que o kit acrescenta ao pedido do texto (puro). Sem oferta e sem ângulo = nenhuma. */
export function adsV2KitBfRuleLines(k: Pick<AdsV2KitBfInput, 'offer' | 'angle'> | null | undefined): string[] {
  if (!k) return []
  const out: string[] = []
  if (k.offer) out.push(`narration: say the customer's offer "${k.offer}" exactly ONCE — never twice, never another number, discount, date or deal. Keep its words as written (you may only read symbols aloud, e.g. "-30%" as "30% off").`)
  if (k.offer) out.push(`overlays: the 2nd phrase may be the offer "${k.offer}" exactly as written.`)
  if (k.angle) out.push(ADS_V2_KIT_BF_ANGLE_RULES[k.angle])
  return out
}

/** O pedido do texto com as linhas do kit, logo antes da linha da resposta (puro). Sem kit = O MESMO objeto (byte a byte). */
export function adsV2KitBfCopyMessages<M extends { system: string; user: string }>(msgs: M, k: Pick<AdsV2KitBfInput, 'offer' | 'angle'> | null | undefined): M {
  const lines = adsV2KitBfRuleLines(k)
  if (!lines.length) return msgs
  const cut = msgs.system.lastIndexOf('\nAnswer with JSON only:')
  const system = cut >= 0 ? `${msgs.system.slice(0, cut)}\n${lines.join('\n')}${msgs.system.slice(cut)}` : `${msgs.system}\n${lines.join('\n')}`
  return { ...msgs, system }
}

// ── a oferta na fala: UMA vez ───────────────────────────────────────────────────────────────────────────────────────
const SPOKEN_PCT: Readonly<Record<string, (n: string) => string>> = {
  en: (n) => `${n}% off`, pt: (n) => `${n}% de desconto`, es: (n) => `${n}% de descuento`, fr: (n) => `${n} % de réduction`, de: (n) => `${n} % Rabatt`,
  it: (n) => `${n}% di sconto`, nl: (n) => `${n}% korting`, pl: (n) => `${n}% zniżki`, tr: (n) => `%${n} indirim`, ru: (n) => `скидка ${n}%`,
  uk: (n) => `знижка ${n}%`, ar: (n) => `خصم ${n}%`, ur: (n) => `${n}% رعایت`, hi: (n) => `${n}% की छूट`, id: (n) => `diskon ${n}%`, vi: (n) => `giảm ${n}%`,
}
/** A oferta como a voz diz (pura): "−30%" → "30% de desconto" na língua da fala; o resto como foi escrito. */
export function adsV2KitBfSpokenOffer(offer: string, language: string | null | undefined): string {
  const m = /^[−–-]\s*(\d{1,3})\s*%$/u.exec(String(offer ?? '').trim())
  const say = m ? SPOKEN_PCT[String(language ?? 'en').toLowerCase().slice(0, 2)] : undefined
  return m && say ? say(m[1]) : String(offer ?? '').trim()
}
const normWords = (s: string): string => String(s ?? '').toLocaleLowerCase().normalize('NFD').replace(/\p{M}+/gu, '').replace(/[^\p{L}\p{N}%]+/gu, ' ').trim()
/** A frase cita a oferta? Com dígitos: todos os números da oferta, na ordem, como números inteiros. Sem dígitos: as palavras dela, juntas. Pura. */
export function adsV2KitBfMentions(sentence: string, offer: string): boolean {
  const digits = String(offer ?? '').match(/\d+/g)
  if (digits && digits.length) {
    const nums = String(sentence ?? '').match(/\d+/g) ?? []
    let i = 0
    for (const n of nums) if (i < digits.length && n === digits[i]) i++
    return i === digits.length
  }
  const key = normWords(offer)
  if (!key) return false
  return ` ${normWords(sentence)} `.includes(` ${key} `)
}
/** As frases da fala, com a pontuação e o espaço de cada uma (juntas = o texto). Pura. */
export function adsV2KitBfSentences(text: string): string[] {
  return String(text ?? '').match(/[^.!?…]+(?:[.!?…]+["'”’»)]*)?\s*/gu) ?? []
}
/**
 * A narração cita a oferta EXATAMENTE uma vez (pura). 0 vezes = entra "<oferta falada>." antes da última frase (o fecho/chamada continua
 * por último); 2+ vezes = só a 1ª frase que cita fica. Sem oferta ou sem narração = o mesmo texto.
 */
export function adsV2KitBfOfferOnce(narration: string | null | undefined, offer: string | null, language: string | null | undefined): { text: string; fix: 'inserted' | 'deduped' | null } {
  const text = typeof narration === 'string' ? narration : ''
  if (!offer || !text.trim()) return { text, fix: null }
  const parts = adsV2KitBfSentences(text)
  const hits = parts.map((p) => adsV2KitBfMentions(p, offer))
  const n = hits.filter(Boolean).length
  if (n === 1) return { text, fix: null }
  if (n > 1) {
    let seen = false
    const kept = parts.filter((p, i) => { if (!hits[i]) return true; if (seen) return false; seen = true; return true })
    return { text: kept.join('').replace(/\s+/g, ' ').trim(), fix: 'deduped' }
  }
  const spoken = adsV2KitBfSpokenOffer(offer, language)
  const line = `${spoken.charAt(0).toLocaleUpperCase()}${spoken.slice(1)}${/[.!?…]$/u.test(spoken) ? '' : '.'}`
  const trimmed = parts.map((p) => p.trim()).filter(Boolean)
  const out = trimmed.length <= 1 ? [...trimmed, line] : [...trimmed.slice(0, -1), line, trimmed[trimmed.length - 1]]
  return { text: out.join(' ').replace(/\s+/g, ' ').trim(), fix: 'inserted' }
}
/** O mesmo, no texto do anúncio ({narration, overlays}). Sem oferta = o mesmo objeto. */
export function adsV2KitBfOfferOnceCopy<C extends { narration?: string | null }>(copy: C, offer: string | null, language: string | null | undefined): C {
  if (!offer || !copy || typeof copy.narration !== 'string' || !copy.narration.trim()) return copy
  const r = adsV2KitBfOfferOnce(copy.narration, offer, language)
  return r.fix ? { ...copy, narration: r.text } : copy
}

// ── a tela (16 línguas) ─────────────────────────────────────────────────────────────────────────────────────────────
export interface AdsV2KitBfCopy {
  title: string
  offerLabel: string
  offerPlaceholder: string
  offerHint: string
  /** Sugestões rápidas (cada uma ≤ 24 caracteres). */
  chips: [string, string, string, string]
  countLabel: string
  /** {c} = créditos de UM anúncio. */
  countHint: string
  /** {n} variações · {c} créditos no total. */
  go: string
  /** {n} = quantas. */
  writing: string
  starting: string
  failed: string
  angles: Record<AdsV2KitBfAngle, string>
}

export const ADS_V2_KIT_BF_COPY: Record<InterfaceLanguage, AdsV2KitBfCopy> = {
  en: { title: 'Black Friday kit', offerLabel: 'Offer (optional)', offerPlaceholder: 'e.g. 30% off', offerHint: 'Shows as a badge at the start and big on the final card; the voice says it once. Empty = no offer.', chips: ['−30%', 'Free shipping', 'Until Nov 27', 'Buy 2 get 3'], countLabel: 'Variations', countHint: 'Same product, photos and offer; each one changes the script angle and the photo order. Each variation is one ad ({c} credits).', go: 'Generate {n} variations · {c} credits', writing: 'Writing {n} scripts…', starting: 'Queuing the variations…', failed: 'Could not prepare the variations. Nothing was charged.', angles: { offer: 'Spoken offer', problem: 'Problem → solution', gift: 'Gift idea', social: 'Why people choose it', new: 'Discovery', classic: 'Benefit' } },
  pt: { title: 'Kit Black Friday', offerLabel: 'Oferta (opcional)', offerPlaceholder: 'ex.: −30%', offerHint: 'Aparece como selo no começo e grande no cartão final; a voz fala 1 vez. Vazio = sem oferta.', chips: ['−30%', 'Frete grátis', 'Só até 27/11', 'Compre 2 leve 3'], countLabel: 'Variações', countHint: 'Mesmo produto, fotos e oferta; cada uma muda o ângulo do roteiro e a ordem das fotos. Cada variação é um anúncio ({c} créditos).', go: 'Gerar {n} variações · {c} créditos', writing: 'Escrevendo {n} roteiros…', starting: 'Pondo as variações na fila…', failed: 'Não deu para preparar as variações. Nada foi cobrado.', angles: { offer: 'Oferta falada', problem: 'Problema → solução', gift: 'Presente', social: 'Por que escolhem', new: 'Novidade', classic: 'Benefício' } },
  es: { title: 'Kit Black Friday', offerLabel: 'Oferta (opcional)', offerPlaceholder: 'ej.: −30%', offerHint: 'Sale como sello al inicio y grande en la tarjeta final; la voz la dice 1 vez. Vacío = sin oferta.', chips: ['−30%', 'Envío gratis', 'Solo hasta el 27/11', 'Compra 2 lleva 3'], countLabel: 'Variaciones', countHint: 'Mismo producto, fotos y oferta; cada una cambia el ángulo del guion y el orden de las fotos. Cada variación es un anuncio ({c} créditos).', go: 'Generar {n} variaciones · {c} créditos', writing: 'Escribiendo {n} guiones…', starting: 'Poniendo las variaciones en la cola…', failed: 'No se pudieron preparar las variaciones. No se cobró nada.', angles: { offer: 'Oferta hablada', problem: 'Problema → solución', gift: 'Regalo', social: 'Por qué lo eligen', new: 'Novedad', classic: 'Beneficio' } },
  fr: { title: 'Kit Black Friday', offerLabel: 'Offre (facultatif)', offerPlaceholder: 'ex. : −30 %', offerHint: 'S’affiche en badge au début et en grand sur la carte finale ; la voix la dit 1 fois. Vide = sans offre.', chips: ['−30 %', 'Livraison offerte', 'Jusqu’au 27/11', '3 pour le prix de 2'], countLabel: 'Variantes', countHint: 'Même produit, photos et offre ; chaque variante change l’angle du script et l’ordre des photos. Chaque variante est une pub ({c} crédits).', go: 'Générer {n} variantes · {c} crédits', writing: 'Écriture de {n} scripts…', starting: 'Mise en file des variantes…', failed: 'Impossible de préparer les variantes. Rien n’a été débité.', angles: { offer: 'Offre parlée', problem: 'Problème → solution', gift: 'Idée cadeau', social: 'Pourquoi on le choisit', new: 'Découverte', classic: 'Bénéfice' } },
  de: { title: 'Black-Friday-Kit', offerLabel: 'Angebot (optional)', offerPlaceholder: 'z. B. −30 %', offerHint: 'Erscheint als Badge am Anfang und groß auf der Endkarte; die Stimme sagt es 1-mal. Leer = kein Angebot.', chips: ['−30 %', 'Gratis Versand', 'Nur bis 27.11.', 'Kauf 2, nimm 3'], countLabel: 'Varianten', countHint: 'Gleiches Produkt, Fotos und Angebot; jede ändert den Blickwinkel des Skripts und die Fotoreihenfolge. Jede Variante ist eine Anzeige ({c} Credits).', go: '{n} Varianten erstellen · {c} Credits', writing: '{n} Skripte werden geschrieben…', starting: 'Varianten werden eingereiht…', failed: 'Die Varianten konnten nicht vorbereitet werden. Nichts wurde berechnet.', angles: { offer: 'Gesprochenes Angebot', problem: 'Problem → Lösung', gift: 'Geschenkidee', social: 'Warum man es wählt', new: 'Entdeckung', classic: 'Vorteil' } },
  it: { title: 'Kit Black Friday', offerLabel: 'Offerta (facoltativa)', offerPlaceholder: 'es.: −30%', offerHint: 'Appare come badge all’inizio e in grande nella scheda finale; la voce la dice 1 volta. Vuoto = nessuna offerta.', chips: ['−30%', 'Spedizione gratis', 'Solo fino al 27/11', 'Prendi 3 paghi 2'], countLabel: 'Varianti', countHint: 'Stesso prodotto, foto e offerta; ognuna cambia l’angolo del copione e l’ordine delle foto. Ogni variante è un annuncio ({c} crediti).', go: 'Genera {n} varianti · {c} crediti', writing: 'Scrittura di {n} copioni…', starting: 'Metto in coda le varianti…', failed: 'Impossibile preparare le varianti. Nessun addebito.', angles: { offer: 'Offerta parlata', problem: 'Problema → soluzione', gift: 'Idea regalo', social: 'Perché lo scelgono', new: 'Scoperta', classic: 'Beneficio' } },
  nl: { title: 'Black Friday-kit', offerLabel: 'Aanbieding (optioneel)', offerPlaceholder: 'bv. −30%', offerHint: 'Verschijnt als badge aan het begin en groot op de eindkaart; de stem zegt het 1 keer. Leeg = geen aanbieding.', chips: ['−30%', 'Gratis verzending', 'Alleen t/m 27/11', '3 halen, 2 betalen'], countLabel: 'Varianten', countHint: 'Zelfde product, foto’s en aanbieding; elke variant verandert de invalshoek van het script en de fotovolgorde. Elke variant is één advertentie ({c} credits).', go: '{n} varianten maken · {c} credits', writing: '{n} scripts schrijven…', starting: 'Varianten in de wachtrij zetten…', failed: 'De varianten konden niet worden voorbereid. Er is niets afgeschreven.', angles: { offer: 'Gesproken aanbieding', problem: 'Probleem → oplossing', gift: 'Cadeau-idee', social: 'Waarom mensen kiezen', new: 'Ontdekking', classic: 'Voordeel' } },
  pl: { title: 'Zestaw Black Friday', offerLabel: 'Oferta (opcjonalnie)', offerPlaceholder: 'np. −30%', offerHint: 'Pojawia się jako plakietka na początku i duża na karcie końcowej; głos mówi ją 1 raz. Puste = bez oferty.', chips: ['−30%', 'Darmowa dostawa', 'Tylko do 27.11', 'Kup 2, weź 3'], countLabel: 'Warianty', countHint: 'Ten sam produkt, zdjęcia i oferta; każdy wariant zmienia kąt scenariusza i kolejność zdjęć. Każdy wariant to jedna reklama ({c} kredytów).', go: 'Utwórz {n} warianty · {c} kredytów', writing: 'Piszę {n} scenariusze…', starting: 'Dodaję warianty do kolejki…', failed: 'Nie udało się przygotować wariantów. Nic nie pobrano.', angles: { offer: 'Oferta głosem', problem: 'Problem → rozwiązanie', gift: 'Pomysł na prezent', social: 'Dlaczego go wybierają', new: 'Odkrycie', classic: 'Korzyść' } },
  tr: { title: 'Black Friday kiti', offerLabel: 'Teklif (isteğe bağlı)', offerPlaceholder: 'örn. %30 indirim', offerHint: 'Başta rozet olarak, son kartta büyük görünür; ses 1 kez söyler. Boş = teklif yok.', chips: ['−%30', 'Ücretsiz kargo', '27/11’e kadar', '3 al 2 öde'], countLabel: 'Varyasyonlar', countHint: 'Aynı ürün, fotoğraflar ve teklif; her biri senaryonun açısını ve fotoğraf sırasını değiştirir. Her varyasyon bir reklamdır ({c} kredi).', go: '{n} varyasyon oluştur · {c} kredi', writing: '{n} senaryo yazılıyor…', starting: 'Varyasyonlar sıraya alınıyor…', failed: 'Varyasyonlar hazırlanamadı. Hiçbir ücret alınmadı.', angles: { offer: 'Sesli teklif', problem: 'Sorun → çözüm', gift: 'Hediye fikri', social: 'Neden tercih ediliyor', new: 'Keşif', classic: 'Fayda' } },
  ru: { title: 'Набор Black Friday', offerLabel: 'Предложение (необязательно)', offerPlaceholder: 'напр. −30%', offerHint: 'Показывается значком в начале и крупно на финальной карточке; голос называет его 1 раз. Пусто = без предложения.', chips: ['−30%', 'Бесплатная доставка', 'Только до 27.11', '3 по цене 2'], countLabel: 'Варианты', countHint: 'Тот же товар, фото и предложение; каждый вариант меняет угол сценария и порядок фото. Каждый вариант — одна реклама ({c} кредитов).', go: 'Создать {n} варианта · {c} кредитов', writing: 'Пишем {n} сценария…', starting: 'Ставим варианты в очередь…', failed: 'Не удалось подготовить варианты. Ничего не списано.', angles: { offer: 'Предложение голосом', problem: 'Проблема → решение', gift: 'Идея подарка', social: 'Почему выбирают', new: 'Открытие', classic: 'Польза' } },
  uk: { title: 'Набір Black Friday', offerLabel: 'Пропозиція (необов’язково)', offerPlaceholder: 'напр. −30%', offerHint: 'Показується значком на початку і великою на фінальній картці; голос називає її 1 раз. Порожньо = без пропозиції.', chips: ['−30%', 'Безкоштовна доставка', 'Лише до 27.11', '3 за ціною 2'], countLabel: 'Варіанти', countHint: 'Той самий товар, фото і пропозиція; кожен варіант змінює кут сценарію і порядок фото. Кожен варіант — одна реклама ({c} кредитів).', go: 'Створити {n} варіанти · {c} кредитів', writing: 'Пишемо {n} сценарії…', starting: 'Ставимо варіанти в чергу…', failed: 'Не вдалося підготувати варіанти. Нічого не списано.', angles: { offer: 'Пропозиція голосом', problem: 'Проблема → рішення', gift: 'Ідея подарунка', social: 'Чому обирають', new: 'Відкриття', classic: 'Користь' } },
  ar: { title: 'مجموعة الجمعة البيضاء', offerLabel: 'العرض (اختياري)', offerPlaceholder: 'مثال: −30%', offerHint: 'يظهر كشارة في البداية وبحجم كبير في البطاقة الأخيرة؛ ويقوله الصوت مرة واحدة. فارغ = بلا عرض.', chips: ['−30%', 'شحن مجاني', 'حتى 27/11 فقط', 'اشترِ 2 وخذ 3'], countLabel: 'النسخ', countHint: 'المنتج والصور والعرض نفسها؛ كل نسخة تغيّر زاوية النص وترتيب الصور. كل نسخة إعلان واحد ({c} رصيد).', go: 'إنشاء {n} نسخ · {c} رصيد', writing: 'جارٍ كتابة {n} نصوص…', starting: 'جارٍ وضع النسخ في الطابور…', failed: 'تعذّر تجهيز النسخ. لم يُخصم شيء.', angles: { offer: 'عرض منطوق', problem: 'مشكلة ← حل', gift: 'فكرة هدية', social: 'لماذا يختارونه', new: 'اكتشاف', classic: 'فائدة' } },
  ur: { title: 'بلیک فرائیڈے کٹ', offerLabel: 'آفر (اختیاری)', offerPlaceholder: 'مثلاً −30%', offerHint: 'شروع میں بیج کی طرح اور آخری کارڈ پر بڑی دکھتی ہے؛ آواز اسے 1 بار کہتی ہے۔ خالی = کوئی آفر نہیں۔', chips: ['−30%', 'مفت ڈیلیوری', 'صرف 27/11 تک', '2 خریدیں 3 پائیں'], countLabel: 'ورژن', countHint: 'وہی پروڈکٹ، تصاویر اور آفر؛ ہر ورژن اسکرپٹ کا زاویہ اور تصاویر کی ترتیب بدلتا ہے۔ ہر ورژن ایک اشتہار ہے ({c} کریڈٹ)۔', go: '{n} ورژن بنائیں · {c} کریڈٹ', writing: '{n} اسکرپٹ لکھے جا رہے ہیں…', starting: 'ورژن قطار میں لگائے جا رہے ہیں…', failed: 'ورژن تیار نہیں ہو سکے۔ کچھ چارج نہیں ہوا۔', angles: { offer: 'بولی گئی آفر', problem: 'مسئلہ ← حل', gift: 'تحفے کا خیال', social: 'لوگ کیوں چنتے ہیں', new: 'دریافت', classic: 'فائدہ' } },
  hi: { title: 'ब्लैक फ़्राइडे किट', offerLabel: 'ऑफ़र (वैकल्पिक)', offerPlaceholder: 'जैसे −30%', offerHint: 'शुरुआत में बैज की तरह और आख़िरी कार्ड पर बड़ा दिखता है; आवाज़ इसे 1 बार बोलती है। ख़ाली = कोई ऑफ़र नहीं।', chips: ['−30%', 'फ़्री डिलीवरी', 'सिर्फ़ 27/11 तक', '2 ख़रीदें 3 पाएँ'], countLabel: 'वैरिएशन', countHint: 'वही प्रोडक्ट, फ़ोटो और ऑफ़र; हर वैरिएशन स्क्रिप्ट का एंगल और फ़ोटो का क्रम बदलता है। हर वैरिएशन एक विज्ञापन है ({c} क्रेडिट)।', go: '{n} वैरिएशन बनाएँ · {c} क्रेडिट', writing: '{n} स्क्रिप्ट लिखी जा रही हैं…', starting: 'वैरिएशन कतार में लग रहे हैं…', failed: 'वैरिएशन तैयार नहीं हो सके। कुछ चार्ज नहीं हुआ।', angles: { offer: 'बोला गया ऑफ़र', problem: 'समस्या → समाधान', gift: 'तोहफ़े का आइडिया', social: 'लोग क्यों चुनते हैं', new: 'खोज', classic: 'फ़ायदा' } },
  id: { title: 'Kit Black Friday', offerLabel: 'Penawaran (opsional)', offerPlaceholder: 'mis. −30%', offerHint: 'Muncul sebagai lencana di awal dan besar di kartu akhir; suara menyebutnya 1 kali. Kosong = tanpa penawaran.', chips: ['−30%', 'Gratis ongkir', 'Hanya s.d. 27/11', 'Beli 2 dapat 3'], countLabel: 'Variasi', countHint: 'Produk, foto, dan penawaran sama; tiap variasi mengubah sudut naskah dan urutan foto. Tiap variasi adalah satu iklan ({c} kredit).', go: 'Buat {n} variasi · {c} kredit', writing: 'Menulis {n} naskah…', starting: 'Memasukkan variasi ke antrean…', failed: 'Variasi tidak bisa disiapkan. Tidak ada biaya.', angles: { offer: 'Penawaran diucapkan', problem: 'Masalah → solusi', gift: 'Ide hadiah', social: 'Kenapa orang memilihnya', new: 'Penemuan', classic: 'Manfaat' } },
  vi: { title: 'Bộ Black Friday', offerLabel: 'Ưu đãi (tùy chọn)', offerPlaceholder: 'vd: −30%', offerHint: 'Hiện thành huy hiệu ở đầu và cỡ lớn ở thẻ cuối; giọng đọc nói 1 lần. Để trống = không ưu đãi.', chips: ['−30%', 'Miễn phí giao hàng', 'Chỉ đến 27/11', 'Mua 2 tặng 1'], countLabel: 'Biến thể', countHint: 'Cùng sản phẩm, ảnh và ưu đãi; mỗi biến thể đổi góc kịch bản và thứ tự ảnh. Mỗi biến thể là một quảng cáo ({c} tín dụng).', go: 'Tạo {n} biến thể · {c} tín dụng', writing: 'Đang viết {n} kịch bản…', starting: 'Đang xếp hàng các biến thể…', failed: 'Không chuẩn bị được các biến thể. Không bị trừ gì.', angles: { offer: 'Ưu đãi nói ra', problem: 'Vấn đề → giải pháp', gift: 'Ý tưởng quà tặng', social: 'Vì sao mọi người chọn', new: 'Khám phá', classic: 'Lợi ích' } },
}

/** As frases do kit na língua da interface (desconhecida = inglês). */
export function adsV2KitBfCopy(lang: string | null | undefined): AdsV2KitBfCopy {
  return (typeof lang === 'string' && (ADS_V2_KIT_BF_COPY as Record<string, AdsV2KitBfCopy>)[lang]) || ADS_V2_KIT_BF_COPY.en
}
