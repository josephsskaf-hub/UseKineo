// KINEO-EMPRESAS-DFY-2026-09-23 — "quer que a gente faça?" no instante em que
// alguém escreve um pedido de anúncio de empresa dentro do Studio.
//
// POR QUE ISTO EXISTE. Nove pedidos de anúncio de empresa foram escritos no
// Studio em setembro (2 em julho, 1 em agosto), metade vindos do ChatGPT com
// briefing completo (produto, público, CTA). Todos receberam um Short de
// curiosidades e saíram com 0 crédito. Em 23/09 o fundador mandou VENDER ANTES
// DE CONSTRUIR: Payment Link da Stripe, cartão no Studio, os 3 primeiros
// pedidos operados à mão. Em 24/09 o preço virou DOIS DEGRAUS (ver abaixo).
//
// O QUE ESTE MÓDULO É: puro. Sem import de servidor, sem React, sem Supabase.
// Ele decide (a) se um texto parece um pedido comercial, (b) quais degraus
// estão ligados e (c) monta o link de pagamento com a identidade da conta. Quem
// PINTA o cartão é o GenerateClient; quem REGISTRA o pagamento é o webhook da
// Stripe (id do link, metadata kind=dfy ou valor aceito; sem conceder plano nem
// crédito).
//
// INTERRUPTOR: `DFY_TIERS.<degrau>.url` vazia = degrau desligado; sem degrau
// ligado o cartão some. O código subiu pausado em 24/09 ~03h BRT e foi LIGADO
// em 24/09 ~04h BRT com os dois links que o Cowork criou no painel da Stripe
// (relatório: docs/KINEO-EMPRESAS-STRIPE-2026-09-23.md, seção v2).
//
// REGEX ESTRITA, DE PROPÓSITO. A regex larga da análise de 23/09 pegou 39
// pessoas em 90 dias e 27 eram falso positivo ("billionaires fly commercial
// airplanes", Mônaco, oração, fast food). A estrita deixou ~11, todas pedidos
// reais. Aqui a palavra "restaurant" sozinha NÃO basta: precisa de intenção de
// anúncio, de posse ("my/our …") ou de chamada para ação.

// ═══ KINEO-EMPRESAS-DOIS-DEGRAUS-2026-09-24 — Express US$35 · Pro US$75 ═══
// Fundador (24/09, madrugada), depois de ler os 11 pedidos de anúncio de empresa
// dos últimos 90 dias: "preço dos degraus: express 35 usd, pro 75 usd". O US$100
// único (referência de 23/09) morreu: 5 dos 11 pedidos vinham da Índia e 1 da
// Nigéria, onde US$100 é preço de agência; os outros 5 (EUA, Espanha, Holanda,
// Alemanha, Jordânia) pagam US$75-300 por isso no Fiverr. Dois mundos, dois
// degraus. Cada degrau é um Payment Link próprio na Stripe (o Cowork cria no
// painel; roteiro em docs/COWORK-STRIPE-LINK-EMPRESAS-2026-09-23.md).
// LIGADO EM 24/09 ~04h BRT (Cowork, painel da Stripe, conta live; nada foi pago):
//   Express plink_1UJ4BgIah5dxzSBf8RGTiutr · prod_VJhVCgZceVl4ZA · price_1UJ463Iah5dxzSBf23DeBebq
//   Pro     plink_1UJ4FXIah5dxzSBf8hU9ggtE · prod_VJhWGOO930edEf · price_1UJ47nIah5dxzSBfIlgvnq3V
//   Os dois: quantidade 1 fixa, sem promo, sem endereço, e-mail + 3 campos de texto
//   obrigatórios, confirmação personalizada, metadata kind=dfy · tier=<degrau> ·
//   product=kineo_empresas_v2. O link de US$100 (plink_1UJ23X…) está DESATIVADO na
//   Stripe ("The link is no longer active") e fica só na lista LEGADA do webhook.
// Degrau com `url` vazia volta a ficar desligado; cartão some sem degrau ligado.
export type DfyTier = 'express' | 'pro'
export interface DfyTierSpec {
  tier: DfyTier
  name: string
  priceMinor: number
  /** Payment Link da Stripe (buy.stripe.com/…). Vazio = degrau desligado. */
  url: string
  /** plink_… do degrau. O webhook reconhece o pedido por este id ANTES de metadata e valor. */
  linkId: string
  hours: number
  revisions: number
  engines: string
  detail: string
}
export const DFY_TIERS: Record<DfyTier, DfyTierSpec> = {
  express: {
    tier: 'express',
    name: 'Express',
    priceMinor: 3500,
    url: 'https://buy.stripe.com/8x2eVddNbcHRfqH34ygjC0x',
    linkId: 'plink_1UJ4BgIah5dxzSBf8RGTiutr',
    hours: 48,
    revisions: 1,
    engines: 'Kineo 1 or Seedance',
    detail: 'Script from your brief, narration in your language, captions, music, your logo and photos where the format allows. 1 revision, 48 h.',
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    priceMinor: 7500,
    url: 'https://buy.stripe.com/28E14n38x0Z9guL6gKgjC0y',
    linkId: 'plink_1UJ4FXIah5dxzSBf8hU9ggtE',
    hours: 72,
    revisions: 2,
    engines: 'Seedance or Kling 3',
    detail: 'Same characters across scenes, script written for you, narration in your language, captions, music, your logo and photos where the format allows. 2 revisions, 72 h.',
  },
}
/** Link de US$100 de 23/09 (plink), desativado em 24/09. Reconhecido pelo webhook só por segurança. */
export const DFY_LEGACY_PAYMENT_LINK_IDS: readonly string[] = ['plink_1UJ23XIah5dxzSBfyfKlmOGV']
export const DFY_LEGACY_PRICE_USD_MINOR = 10000
/** Valores exatos que o webhook aceita como pedido (3º critério, só em sessão de Payment Link). 3500/7500 coincidem com bulk20/bulk50 da casa: sessões da casa carregam metadata.pack e nunca payment_link, então não se confundem. */
export const DFY_ACCEPTED_AMOUNTS_USD_MINOR: readonly number[] = [DFY_TIERS.express.priceMinor, DFY_TIERS.pro.priceMinor, DFY_LEGACY_PRICE_USD_MINOR]
export const DFY_OFFER_VERSION = 'dfy_card_v2'
/** Teto de pedidos abertos ao mesmo tempo (regra 24/08: nunca prometer o que não se executa). */
export const DFY_MAX_OPEN_ORDERS = 3

export function isDfyLinkUrl(url: string): boolean {
  return /^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\/[A-Za-z0-9_\-/]+$/.test(url)
}

/** Degraus ligados (url válida), na ordem Express → Pro. */
export function liveDfyTiers(tiers: Record<DfyTier, DfyTierSpec> = DFY_TIERS): DfyTierSpec[] {
  return (['express', 'pro'] as DfyTier[]).map((t) => tiers[t]).filter((t) => isDfyLinkUrl(t.url))
}

/** O cartão existe quando pelo menos um degrau está ligado; com `tier`, pergunta por aquele degrau. */
export function isDfyOfferLive(tier?: DfyTier, tiers: Record<DfyTier, DfyTierSpec> = DFY_TIERS): boolean {
  return tier ? isDfyLinkUrl(tiers[tier].url) : liveDfyTiers(tiers).length > 0
}

/** Todos os ids de Payment Link que o webhook trata como pedido Empresas (degraus + legado). */
export function dfyPaymentLinkIds(tiers: Record<DfyTier, DfyTierSpec> = DFY_TIERS): string[] {
  return [...(['express', 'pro'] as DfyTier[]).map((t) => tiers[t].linkId).filter(Boolean), ...DFY_LEGACY_PAYMENT_LINK_IDS]
}

/** Degrau de um id de link (null para o legado de US$100 e para desconhecidos). */
export function dfyTierForLink(linkId: string | null | undefined, tiers: Record<DfyTier, DfyTierSpec> = DFY_TIERS): DfyTier | null {
  if (!linkId) return null
  return ((['express', 'pro'] as DfyTier[]).find((t) => tiers[t].linkId && tiers[t].linkId === linkId)) ?? null
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
 * Link de pagamento do degrau, com a identidade da conta. O Payment Link da
 * Stripe aceita `client_reference_id` (alfanumérico, `-` e `_`, ≤200) e
 * `prefilled_email` pela URL; o webhook resolve `client_reference_id` para
 * `user_id` (app/api/stripe/webhook/route.ts). `utm_source` viaja só para o
 * painel da Stripe. `url` explícita serve aos guardiões; sem ela, lê o degrau.
 */
export function dfyPaymentLink(input: {
  tier: DfyTier
  userId: string | null | undefined
  email?: string | null
  source?: string
  url?: string
}): string | null {
  const base = input.url ?? DFY_TIERS[input.tier].url
  if (!isDfyLinkUrl(base)) return null
  const params = new URLSearchParams()
  const ref = (input.userId ?? '').trim()
  if (/^[A-Za-z0-9_-]{1,200}$/.test(ref)) params.set('client_reference_id', ref)
  const email = (input.email ?? '').trim()
  if (email && email.length <= 254 && email.includes('@')) params.set('prefilled_email', email)
  params.set('utm_source', (input.source ?? 'studio_dfy_card').slice(0, 40))
  return `${base}?${params.toString()}`
}

/** "35" para 3500, "99.90" para 9990: nunca "99.9". */
export function dfyPriceLabel(minor: number): string {
  const value = minor / 100
  return Number.isInteger(value) ? `US$${value}` : `US$${value.toFixed(2)}`
}

export interface DfyCardOption { tier: DfyTier; cta: string; detail: string; priceMinor: number }

/** Copy do cartão: um botão por degrau LIGADO (Express → Pro). Sem degrau ligado, `options` vem vazio e o cartão não existe. */
export function dfyCardCopy(tiers: Record<DfyTier, DfyTierSpec> = DFY_TIERS): { eyebrow: string; title: string; body: string; fine: string; options: DfyCardOption[] } {
  const options = liveDfyTiers(tiers).map((t) => ({
    tier: t.tier,
    priceMinor: t.priceMinor,
    cta: `${t.name} — ${dfyPriceLabel(t.priceMinor)}, ${t.hours} h →`,
    detail: `${t.engines}. ${t.detail}`,
  }))
  return {
    eyebrow: 'Looks like an ad for your business',
    title: 'Want a human editor to make it?',
    body: 'We write the script from your brief, pick the right engine, add narration in your language, captions and music, and use your logo and photos where the format allows.',
    fine: 'Or keep going and render it yourself right now.',
    options,
  }
}
