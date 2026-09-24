// KINEO-EMPRESAS-DFY-2026-09-23 — "quer que a gente faça?" no instante em que
// alguém escreve um pedido de anúncio de empresa dentro do Studio.
//
// POR QUE ISTO EXISTE. Nove pedidos de anúncio de empresa foram escritos no
// Studio em setembro (2 em julho, 1 em agosto), metade vindos do ChatGPT com
// briefing completo (produto, público, CTA). Todos receberam um Short de
// curiosidades e saíram com 0 crédito. O fundador fixou US$100 por filme e
// US$500 por 5 (docs/product/KINEO-EMPRESAS-2026-09-23.md) e, em 23/09,
// mandou VENDER ANTES DE CONSTRUIR: Payment Link da Stripe criado por ele,
// cartão no Studio, os 3 primeiros pedidos operados à mão.
//
// O QUE ESTE MÓDULO É: puro. Sem import de servidor, sem React, sem Supabase.
// Ele decide (a) se um texto parece um pedido comercial e (b) monta o link de
// pagamento com a identidade da conta. Quem PINTA o cartão é o GenerateClient;
// quem REGISTRA o pagamento é o webhook da Stripe (metadata kind=dfy, valor
// 10000 USD, sem conceder plano nem crédito).
//
// INTERRUPTOR: `DFY_PAYMENT_LINK_URL` vazio = cartão desligado. O código sobe
// antes de o link existir; quando o fundador criar o link, uma linha liga.
//
// REGEX ESTRITA, DE PROPÓSITO. A regex larga da análise de 23/09 pegou 39
// pessoas em 90 dias e 27 eram falso positivo ("billionaires fly commercial
// airplanes", Mônaco, oração, fast food). A estrita deixou ~11, todas pedidos
// reais. Aqui a palavra "restaurant" sozinha NÃO basta: precisa de intenção de
// anúncio, de posse ("my/our …") ou de chamada para ação.

/** Payment Link da Stripe (buy.stripe.com/…). Vazio até o fundador criar. */
export const DFY_PAYMENT_LINK_URL = ''

/** US$100,00 em centavos. Nunca 9900: colide com Starter anual e piloto. */
export const DFY_PRICE_USD_MINOR = 10000
export const DFY_OFFER_VERSION = 'dfy_card_v1'
export const DFY_DELIVERY_HOURS = 72
/** Teto de pedidos abertos ao mesmo tempo (regra 24/08: nunca prometer o que não se executa). */
export const DFY_MAX_OPEN_ORDERS = 3

export function isDfyOfferLive(url: string = DFY_PAYMENT_LINK_URL): boolean {
  return /^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\/[A-Za-z0-9_\-/]+$/.test(url)
}

// Intenção explícita de anúncio/peça comercial.
const AD_INTENT =
  /\b(advertis(?:e|ing|ement)s?\b|video ad for|an ad for|ad video for|promo(?:tional)? video|promotievideo|commercial for (?:my|our|a|the)|founder[- ]story video|software demo|product demo|explainer (?:video )?for (?:my|our)|launch video for)/i
// Posse de negócio: "my/our" + substantivo de empresa.
const OWN_BUSINESS =
  /\b(?:my|our) (?:business|company|brand|store|shop|restaurant|clinic|practice|agency|startup|app|saas|product|service|salon|gym|school|course|law firm|dental (?:office|clinic)|bakery|hotel|caf[eé])\b/i
// Chamada para ação de venda.
const CTA_TERMS = /\b(?:call now|book now|order now|visit us|whatsapp us|dm us|contact us at|sign up at|shop now|learn more at|book a (?:call|demo|consult))\b/i
// PT / ES / FR / DE.
const OTHER_LANGS =
  /(?:minha empresa|meu neg[oó]cio|minha loja|minha cl[ií]nica|nossa empresa|nosso restaurante|nossa cl[ií]nica|nossa loja|v[ií]deo publicit[aá]rio|v[ií]deo institucional|propaganda (?:da|do|para) (?:minha|meu|nossa|nosso)|an[uú]ncio (?:da|do|para) (?:minha|meu|nossa|nosso)|mi negocio|mi empresa|mi tienda|mi restaurante|mi cl[ií]nica|nuestra empresa|nuestro restaurante|nuestra tienda|v[ií]deo publicitario|anuncio (?:de|para) (?:mi|nuestra|nuestro)|mon entreprise|ma boutique|mon restaurant|notre entreprise|vid[eé]o publicitaire|meine firma|mein gesch[aä]ft|unser unternehmen|werbevideo)/i

/**
 * Parece um pedido de anúncio/peça comercial do PRÓPRIO negócio?
 * Lê no máximo 4.000 caracteres; texto curto (<20) nunca casa.
 */
export function isDfyCandidate(text: string | null | undefined): boolean {
  const t = (text ?? '').slice(0, 4000)
  if (t.trim().length < 20) return false
  return AD_INTENT.test(t) || OWN_BUSINESS.test(t) || CTA_TERMS.test(t) || OTHER_LANGS.test(t)
}

/**
 * Link de pagamento com a identidade da conta. O Payment Link da Stripe aceita
 * `client_reference_id` (alfanumérico, `-` e `_`, ≤200) e `prefilled_email`
 * pela URL; o webhook resolve `client_reference_id` para `user_id`
 * (app/api/stripe/webhook/route.ts, recordPaymentSuccess). `utm_source` viaja
 * só para o painel da Stripe.
 */
export function dfyPaymentLink(input: {
  userId: string | null | undefined
  email?: string | null
  source?: string
  url?: string
}): string | null {
  const base = input.url ?? DFY_PAYMENT_LINK_URL
  if (!isDfyOfferLive(base)) return null
  const params = new URLSearchParams()
  const ref = (input.userId ?? '').trim()
  if (/^[A-Za-z0-9_-]{1,200}$/.test(ref)) params.set('client_reference_id', ref)
  const email = (input.email ?? '').trim()
  if (email && email.length <= 254 && email.includes('@')) params.set('prefilled_email', email)
  params.set('utm_source', (input.source ?? 'studio_dfy_card').slice(0, 40))
  return `${base}?${params.toString()}`
}

/** "100" para 10000, "99.90" para 9990: nunca "99.9". */
export function dfyPriceLabel(minor: number = DFY_PRICE_USD_MINOR): string {
  const value = minor / 100
  return Number.isInteger(value) ? `US$${value}` : `US$${value.toFixed(2)}`
}

export function dfyCardCopy(): { eyebrow: string; title: string; body: string; cta: string; fine: string } {
  const price = dfyPriceLabel()
  return {
    eyebrow: 'Looks like an ad for your business',
    title: 'Want a human editor to make it?',
    body: `Right engine for the job (Seedance or Kling 3), your logo and photos when the format allows, narration in your language, 1 revision. ${price}, delivered in ${DFY_DELIVERY_HOURS} h.`,
    cta: `Order it made for you — ${price} →`,
    fine: 'Or keep going and render it yourself right now.',
  }
}
