// ═══ KINEO-SAIDA-REGIAO-2026-10-07 (b) — O PASSE AVULSO NA MOEDA LOCAL PARA QUEM NASCE 'region_paid_only' ═══════════════
//
// O passe existe desde 05/10 (KINEO-PASSE-AVULSO-2026-10-05): ?pack=starter, PACK_PRICE_MINOR (US$ 4,99) = PACK_CREDITS
// (35 cr) = exatamente 1 filme Seedance 1.5 de 60 s, pagamento ÚNICO (mode 'payment'). Ele passa a aparecer para quem é
// 'region_paid_only' em dois momentos — na parede (o crédito acabou) e logo depois do filme grátis ficar pronto — no
// preço da MOEDA EM QUE A STRIPE VAI COBRAR.
//
// UM PREÇO SÓ, NENHUM NÚMERO NOVO: regionPassPrice() faz exatamente a chamada do checkout do pack
// (app/api/stripe/checkout/route.ts buildPackAndRedirect: resolveSettlementCurrency com o país do IP e o idioma, sem
// forçar moeda, e settlementAmountMinor sobre PACK_PRICE_MINOR.usd). Hoje isso dá BRL para o Brasil (R$ 24,90, a fórmula
// da casa usdToBrlMinor) e USD para o resto. INR NÃO: o ramo INR do checkout morreu em 19/08 (KINEO-USD-ONLY) e a fórmula
// da casa não cobre a rúpia — a Índia vê e paga US$ 4,99. O guardião executa as duas pontas (oferta e checkout) e exige o
// mesmo número.
//
// CONTA SEM PLANO COMPRA: o pack é outro SKU que a recarga. buildTopupAndRedirect recusa quem não é basic/pro
// (canPurchaseCreditTopup); buildPackAndRedirect não olha plano nenhum, e o webhook (Path A) soma pack_credits e grava
// has_paid. O guardião prova com banco e Stripe falsos.
//
// SEM LOGIN: não se aplica a esta coorte e o caminho não é compatível. 'region_paid_only' é um carimbo de CONTA (nasce no
// cadastro, pelo país do IP) — quem vê esta oferta já está logado. E a compra de convidado (lib/growth/guestCheckout.ts)
// só existe para assinatura: isGuestCheckoutSession exige mode 'subscription', o webhook só cria conta no Path B; uma
// sessão de pack sem dono seria dinheiro sem entrega. O pack continua pedindo o login antes (o de hoje).
//
// Módulo sem rede e sem banco (o navegador lê o texto; a rota lê a régua e o preço). Interruptor: REGION_PASS_OFFER_LIVE
// em lib/freeFilmPolicy.ts — o mesmo lugar do filme grátis.
import { PACK_ADVERTISED_SECONDS, PACK_CREDITS, PACK_PRICE_MINOR } from './checkoutPricing'
import {
  formatSettlementMoney,
  resolveSettlementCurrency,
  settlementAmountMinor,
  type SettlementCurrency,
  type SettlementReason,
} from './settlementCurrency'
import { REGION_PASS_OFFER_LIVE, REGION_PAID_ONLY_TRIAL_STATUS } from './freeFilmPolicy'

export const REGION_PASS_VERSION = 'region_pass_v1' as const

/** As telas onde o passe aparece: a parede do Studio, o /pricing (onde a prévia e a faixa levam) e o filme grátis pronto. */
export type RegionPassSurface = 'wall' | 'pricing' | 'after_film'
export const REGION_PASS_SURFACES: readonly RegionPassSurface[] = ['wall', 'pricing', 'after_film']
export function isRegionPassSurface(raw: unknown): raw is RegionPassSurface {
  return typeof raw === 'string' && (REGION_PASS_SURFACES as readonly string[]).includes(raw)
}

/** Eventos de SERVIDOR (app/api/region-pass; estão em SERVER_ONLY_EVENTS de app/api/events/route.ts). */
export const REGION_PASS_OFFER_SHOWN_EVENT = 'region_pass_offer_shown'
export const REGION_PASS_OFFER_CLICKED_EVENT = 'region_pass_offer_clicked'

/** O SKU que o checkout grava (checkout_*.metadata.sku e a metadata.pack da sessão → payment_success.metadata.pack). */
export const REGION_PASS_SKU = 'starter10' as const
/** A chave ?pack= do checkout. */
export const REGION_PASS_PACK_PARAM = 'starter' as const

/** A campanha que viaja do clique ao payment_success (intent_campaign): o placar separa o passe de região dos outros. */
export function regionPassIntentCampaign(surface: RegionPassSurface): string {
  return `region_pass_${surface}_v1`
}

/** O checkout de sempre do pack, devolvendo ao Studio (resume=wall_v1&pack=…: a volta que espera o crédito cair). */
export function regionPassCheckoutHref(surface: RegionPassSurface): string {
  return `/api/stripe/checkout?pack=${REGION_PASS_PACK_PARAM}&return=studio&intent_campaign=${regionPassIntentCampaign(surface)}`
}

/** O botão navega para a NOSSA rota (grava o clique no servidor) e ela redireciona ao checkout acima. */
export function regionPassGoHref(surface: RegionPassSurface): string {
  return `/api/region-pass?surface=${surface}&go=1`
}

/**
 * Quem vê: conta 'region_paid_only' que COMPROVADAMENTE não pagou (has_paid === false, o predicado estreito do cobrador —
 * leitura nula não abre a porta) e plano grátis, com o interruptor ligado.
 */
export function regionPassOfferEligible(
  row: { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null } | null | undefined,
  live: boolean = REGION_PASS_OFFER_LIVE,
): boolean {
  if (!live || !row || row.trial_status !== REGION_PAID_ONLY_TRIAL_STATUS) return false
  if (row.has_paid !== false) return false
  const plan = typeof row.plan === 'string' ? row.plan.trim().toLowerCase() : 'free'
  return plan === 'free' || plan === ''
}

export interface RegionPassPrice {
  currency: SettlementCurrency
  reason: SettlementReason
  amountMinor: number
  label: string
  usdMinor: number
  usdLabel: string
  credits: number
  seconds: number
}

/**
 * O preço do passe na moeda em que a sessão da Stripe VAI nascer — a mesma chamada do buildPackAndRedirect: país do IP
 * (ausente → 'US', como lá) e idioma do navegador, sem `forced` (o link do passe não carrega ?currency=).
 */
export function regionPassPrice(input: { ipCountry: string | null | undefined; acceptLanguage: string | null | undefined }): RegionPassPrice {
  const usdMinor = PACK_PRICE_MINOR.usd
  const settlement = resolveSettlementCurrency({ ipCountry: input.ipCountry ?? 'US', acceptLanguage: input.acceptLanguage ?? null })
  const amountMinor = settlementAmountMinor(usdMinor, settlement.currency)
  return {
    currency: settlement.currency,
    reason: settlement.reason,
    amountMinor,
    label: formatSettlementMoney(settlement.currency, amountMinor),
    usdMinor,
    usdLabel: formatSettlementMoney('usd', usdMinor),
    credits: PACK_CREDITS.starter,
    seconds: PACK_ADVERTISED_SECONDS.starter,
  }
}

/** O que a rota devolve ao cartão (só exibição: o checkout re-resolve tudo no servidor). */
export interface RegionPassOffer {
  eligible: true
  surface: RegionPassSurface
  price: RegionPassPrice
  href: string
  balance: number | null
  version: typeof REGION_PASS_VERSION
}

/** O pack de sempre, sem a campanha nem o evento da região (quem não é da régua nunca é barrado de comprar). */
export const PLAIN_PASS_CHECKOUT_HREF = `/api/stripe/checkout?pack=${REGION_PASS_PACK_PARAM}&return=studio`

export type RegionPassDecision =
  | { kind: 'json'; status: number; body: Record<string, unknown>; event: null | { name: string; metadata: Record<string, unknown> } }
  | { kind: 'redirect'; location: string; event: null | { name: string; metadata: Record<string, unknown> } }

/**
 * A decisão inteira da rota app/api/region-pass (pura: a rota só lê sessão, perfil e cabeçalhos, e executa o que sai daqui).
 *   · sem `go`: JSON com a oferta (elegível → evento region_pass_offer_shown com a moeda e o valor mostrados);
 *   · com `go`: o clique — elegível → evento region_pass_offer_clicked e o checkout com a campanha da região; qualquer
 *     outro caso → o checkout de sempre do pack, sem evento (esta rota nunca impede uma compra).
 */
export function decideRegionPassRequest(input: {
  userId: string | null
  profile: { trial_status?: string | null; has_paid?: boolean | null; plan?: string | null; video_credits?: number | null } | null
  surface: unknown
  go: boolean
  ipCountry: string | null
  acceptLanguage: string | null
  live?: boolean
}): RegionPassDecision {
  const live = input.live ?? REGION_PASS_OFFER_LIVE
  const surface = isRegionPassSurface(input.surface) ? input.surface : null
  if (input.go) {
    if (!surface) return { kind: 'redirect', location: PLAIN_PASS_CHECKOUT_HREF, event: null }
    if (!input.userId || !regionPassOfferEligible(input.profile, live)) {
      return { kind: 'redirect', location: PLAIN_PASS_CHECKOUT_HREF, event: null }
    }
    const price = regionPassPrice({ ipCountry: input.ipCountry, acceptLanguage: input.acceptLanguage })
    return {
      kind: 'redirect',
      location: regionPassCheckoutHref(surface),
      event: {
        name: REGION_PASS_OFFER_CLICKED_EVENT,
        metadata: { surface, currency: price.currency, amount_minor: price.amountMinor, usd_minor: price.usdMinor, settlement_reason: price.reason, sku: REGION_PASS_SKU, intent_campaign: regionPassIntentCampaign(surface), country: input.ipCountry, version: REGION_PASS_VERSION },
      },
    }
  }
  if (!input.userId) return { kind: 'json', status: 401, body: { eligible: false, reason: 'unauthenticated' }, event: null }
  if (!surface) return { kind: 'json', status: 400, body: { eligible: false, reason: 'bad_surface' }, event: null }
  if (!live) return { kind: 'json', status: 200, body: { eligible: false, reason: 'off' }, event: null }
  if (!regionPassOfferEligible(input.profile, live)) return { kind: 'json', status: 200, body: { eligible: false, reason: 'not_eligible' }, event: null }
  const price = regionPassPrice({ ipCountry: input.ipCountry, acceptLanguage: input.acceptLanguage })
  const balance = typeof input.profile?.video_credits === 'number' ? input.profile.video_credits : null
  const offer: RegionPassOffer = { eligible: true, surface, price, href: regionPassGoHref(surface), balance, version: REGION_PASS_VERSION }
  return {
    kind: 'json',
    status: 200,
    body: offer as unknown as Record<string, unknown>,
    event: {
      name: REGION_PASS_OFFER_SHOWN_EVENT,
      metadata: { surface, currency: price.currency, amount_minor: price.amountMinor, usd_minor: price.usdMinor, settlement_reason: price.reason, sku: REGION_PASS_SKU, balance, country: input.ipCountry, version: REGION_PASS_VERSION },
    },
  }
}

// ─── Texto (pt/en/es; as outras línguas da interface caem no inglês, como as faixas da região) ──────────────────────
export interface RegionPassCopy {
  kicker: string
  title: (price: string) => string
  afterFilmTitle: (price: string) => string
  body: (seconds: number, credits: number) => string
  cta: (price: string) => string
  chargedIn: (currencyCode: string) => string
}
export const REGION_PASS_COPY: { en: RegionPassCopy; pt: RegionPassCopy; es: RegionPassCopy } = {
  en: {
    kicker: 'ONE FILM · NO SUBSCRIPTION',
    title: (p) => `Your next film for ${p}`,
    afterFilmTitle: (p) => `Liked it? Your next film for ${p}`,
    body: (s, c) => `A ${s}-second Seedance 1.5 film from your own idea — ${c} credits, paid once. No watermark, no renewal.`,
    cta: (p) => `Make my next film · ${p}`,
    chargedIn: (code) => `Charged in ${code}.`,
  },
  pt: {
    kicker: 'UM FILME · SEM ASSINATURA',
    title: (p) => `Seu próximo filme por ${p}`,
    afterFilmTitle: (p) => `Gostou? Seu próximo filme por ${p}`,
    body: (s, c) => `Um filme de ${s} segundos no Seedance 1.5, a partir da sua ideia — ${c} créditos, pagos uma vez. Sem marca d’água, sem renovação.`,
    cta: (p) => `Fazer meu próximo filme · ${p}`,
    chargedIn: (code) => `Cobrado em ${code}.`,
  },
  es: {
    kicker: 'UNA PELÍCULA · SIN SUSCRIPCIÓN',
    title: (p) => `Tu próxima película por ${p}`,
    afterFilmTitle: (p) => `¿Te gustó? Tu próxima película por ${p}`,
    body: (s, c) => `Una película de ${s} segundos en Seedance 1.5, a partir de tu idea — ${c} créditos, un solo pago. Sin marca de agua, sin renovación.`,
    cta: (p) => `Hacer mi próxima película · ${p}`,
    chargedIn: (code) => `Cobrado en ${code}.`,
  },
}
