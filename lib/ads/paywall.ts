// KINEO-ADS-PAREDE-2026-10-06 — A PAREDE DO STUDIO ADS PASSA A VENDER (tarefa 8 da sprint "MRR hoje", relançada 06/10).
//
// O QUE ERA (medido em 06/10, 30 dias): 8 contas logadas bateram em ads_access_denied (5 no /ads/v2, 3 no /ads/new), todas
// de plano free, todas devolvidas a /ads?from=v2|new — uma faixa de uma linha ("Pick Starter or the pass below") em cima da
// página inteira de marketing, com o botão do plano lá embaixo, na seção Price. ZERO cliques em qualquer porta do Studio Ads,
// zero pagamentos. As outras 31 linhas do evento são o painel ANÔNIMO do /ads/new (outcome 'anonymous_panel'; desde a virada
// do v2 só o ?classic=1 chega lá): visitante que viu o painel da IA, não uma parede — e sem session_id nada as ligava a nada.
//
// O QUE PASSA A SER: quem chega por uma porta da parede vê, no lugar da faixa, a OFERTA — "Studio Ads is included in every
// paid plan", o plano de entrada com preço e quantos anúncios os créditos dele pagam por mês, o botão do checkout desse plano
// com intent_campaign=ads_paywall (o GET de app/api/stripe/checkout lê e grava em checkout_attempted/started; sem sessão ele
// leva ao /signup e retoma a compra) e, se o Payment Link do Express estiver ligado (lib/growth/dfyOffer.ts DFY_TIERS.express.url),
// "Prefer we make it for you? Express <preço> · <prazo>". SEM PASSE na oferta, para todo mundo — a conta 'region_paid_only'
// vê exatamente a mesma (o trial_status só etiqueta a medição). Preço de plano NÃO muda: tudo sai das fontes.
//
// QUEM VÊ (adsPaywallVisible): interruptor ligado, Studio Ads aberto (adsPassLive), ?from= exatamente uma das portas da parede
// (ADS_PAYWALL_DOORS) e:
//   · logado → adsGate 'no_access' E PROVA POSITIVA: o perfil foi relido com sucesso nesta visita e o motivo relido é 'none'.
//     loadAdsAccess devolve 'none' também quando a leitura FALHA (falha fechada para o montador); para uma oferta de assinatura
//     isso seria vender plano a quem já assina. Leitura que falha = "não sei" = a faixa antiga fica.
//   · anônimo → só quando o getUser CONFIRMOU que não há sessão (sem erro, ou AuthSessionMissingError). Erro de auth (JWT, rede)
//     ou leitura que estourou o tempo da página = "não sei" = nada de oferta.
// Assinante, passe, conta interna, Studio Ads fechado e porta desconhecida: nunca.
//
// MÓDULO PURO (sem import): o componente de cliente (app/ads/AdsPaywall.tsx) importa daqui e o guardião
// scripts/test-ads-parede-2026-10-06.mjs executa este arquivo cru. As FONTES (preço, créditos, custo de anúncio, Express)
// entram por argumento — quem as junta é lib/ads/paywallSources.ts, no servidor. Nenhum número da oferta nasce aqui.

/** Interruptor de reversão. false = a parede volta a ser a faixa de uma linha de /ads (KINEO-ADS-PORTA-PLANO-2026-09-27). */
export const ADS_PAYWALL_LIVE = true

/** Versão da peça nos eventos, para o denominador nunca misturar duas copies. */
export const ADS_PAYWALL_VERSION = 'ads_paywall_v1' as const

/** A origem que o checkout grava (intent_campaign; o sanitizador do checkout aceita [A-Za-z0-9._~-]{1,100}). */
export const ADS_PAYWALL_CAMPAIGN = 'ads_paywall' as const

/** Impressão (1 por montagem, com o conteúdo mostrado) e primeiro gesto {choice}. Navegador; lista fechada em lib/ads/events.ts. */
export const ADS_PAYWALL_VIEWED_EVENT = 'ads_paywall_viewed' as const
export const ADS_PAYWALL_CLICKED_EVENT = 'ads_paywall_clicked' as const

/** As portas da parede: os redirects sem acesso de /ads/v2, /ads/new e /ads/producao, e o tile "Business ad" do /studio. */
export const ADS_PAYWALL_DOORS: readonly string[] = ['v2', 'new', 'producao', 'studio']

/** O perfil RELIDO com sucesso nesta visita. `reason` = adsAccessReason (lib/ads/access.ts); trialStatus só etiqueta a medição. */
export interface AdsPaywallProof {
  reason: string
  trialStatus: string | null
}

export interface AdsPaywallViewer {
  signedIn: boolean
  gate: 'ok' | 'no_access' | 'closed' | null
  /** true só quando o getUser respondeu "sem sessão" (adsPaywallNoSession). Timeout e erro de auth = false. */
  noSession: boolean
  proof: AdsPaywallProof | null
}

/** O getUser confirmou que não há ninguém logado? (sem erro, ou o erro é exatamente "sessão ausente"). */
export function adsPaywallNoSession(error: unknown): boolean {
  if (error === null || error === undefined) return true
  return typeof error === 'object' && (error as { name?: unknown }).name === 'AuthSessionMissingError'
}

/** Quem vê a oferta da parede. */
export function adsPaywallVisible(input: { live: boolean; from: string | null; viewer: AdsPaywallViewer; enabled?: boolean }): boolean {
  if (!(input.enabled ?? ADS_PAYWALL_LIVE)) return false
  if (!input.live) return false
  if (input.from === null || !ADS_PAYWALL_DOORS.includes(input.from)) return false
  const v = input.viewer
  if (v.signedIn) return v.gate === 'no_access' && v.proof !== null && v.proof.reason === 'none'
  return v.noSession === true
}

export interface AdsPaywallPlan {
  tier: string
  name: string
  priceMinor: number
  credits: number
}

export interface AdsPaywallSources {
  /** Planos de assinatura self-serve (TIER_PRICES/TIER_CREDITS); o de menor mensalidade que abre o Studio Ads é a oferta. */
  plans: readonly AdsPaywallPlan[]
  /** Planos que abrem o Studio Ads (lib/ads/access.ts ADS_SUBSCRIBER_PLANS). */
  opensAds: readonly string[]
  formatMoney: (minor: number) => string
  /** Créditos de UM anúncio novo em cada nível (adsV2Credits, o mesmo que /api/ads/v2/start debita). */
  newAdCredits: readonly number[]
  /** Duração de referência do anúncio novo (ADS_V2_SCREEN_SECONDS). */
  newAdSeconds: number
  /** Créditos e duração do anúncio clássico mais curto (KINEO1_35S_CREDITS e o menor ADS_MODELS[].seconds). */
  classicAdCredits: number
  classicAdSeconds: number
  /** O degrau Express do serviço feito por nós; href null = url vazia/inválida = degrau desligado. */
  express: { name: string; priceLabel: string; hours: number; href: string | null } | null
}

export interface AdsPaywallOffer {
  version: typeof ADS_PAYWALL_VERSION
  tier: string
  planName: string
  priceMinor: number
  priceLabel: string
  credits: number
  /** Anúncios novos por mês em QUALQUER nível: o nível mais caro decide (nunca promete mais do que o crédito paga). */
  newAds: number
  newAdSeconds: number
  classicAds: number
  classicAdSeconds: number
  checkoutHref: string
  express: { name: string; priceLabel: string; hours: number; href: string } | null
}

/** O plano de entrada: o de menor mensalidade entre os válidos (preço e créditos positivos) que abrem o Studio Ads. */
export function adsPaywallEntryPlan(plans: readonly AdsPaywallPlan[], opensAds: readonly string[]): AdsPaywallPlan | null {
  const valid = plans.filter((p) => opensAds.includes(p.tier) && Number.isFinite(p.priceMinor) && p.priceMinor > 0 && Number.isFinite(p.credits) && p.credits > 0)
  if (valid.length === 0) return null
  return valid.reduce((best, p) => (p.priceMinor < best.priceMinor ? p : best))
}

/** O GET de assinatura do checkout lê tier, billing e intent_campaign; sem sessão ele leva ao /signup e retoma esta mesma URL. */
export function adsPaywallCheckoutHref(tier: string): string {
  return `/api/stripe/checkout?tier=${encodeURIComponent(tier)}&billing=monthly&intent_campaign=${ADS_PAYWALL_CAMPAIGN}`
}

function perMonth(credits: number, cost: number): number {
  return Number.isFinite(cost) && cost > 0 ? Math.floor(credits / cost) : 0
}

/** A oferta inteira, calculada das fontes. null = não há plano válido para vender (a faixa antiga fica). */
export function adsPaywallOffer(src: AdsPaywallSources): AdsPaywallOffer | null {
  const plan = adsPaywallEntryPlan(src.plans, src.opensAds)
  if (!plan) return null
  const dearestNewAd = src.newAdCredits.length > 0 ? Math.max(...src.newAdCredits) : 0
  const express = src.express && typeof src.express.href === 'string' && src.express.href
    ? { name: src.express.name, priceLabel: src.express.priceLabel, hours: src.express.hours, href: src.express.href }
    : null
  return {
    version: ADS_PAYWALL_VERSION,
    tier: plan.tier,
    planName: plan.name,
    priceMinor: plan.priceMinor,
    priceLabel: src.formatMoney(plan.priceMinor),
    credits: plan.credits,
    newAds: perMonth(plan.credits, dearestNewAd),
    newAdSeconds: src.newAdSeconds,
    classicAds: perMonth(plan.credits, src.classicAdCredits),
    classicAdSeconds: src.classicAdSeconds,
    checkoutHref: adsPaywallCheckoutHref(plan.tier),
    express,
  }
}

/** O retrato que impressão e clique carregam (o mesmo nos dois, para o par se comparar sem adivinhação). */
export function adsPaywallShown(offer: AdsPaywallOffer, ctx: { from: string; signedIn: boolean; regionPaidOnly: boolean }) {
  return {
    version: offer.version,
    from: ctx.from,
    signed_in: ctx.signedIn,
    region_paid_only: ctx.regionPaidOnly,
    tier: offer.tier,
    price_minor: offer.priceMinor,
    credits: offer.credits,
    new_ads: offer.newAds,
    classic_ads: offer.classicAds,
    express: offer.express !== null,
  }
}

/**
 * Frases da oferta. Cada uma é chave de lib/ui/refinementCopy.json nas 16 línguas e passa por useUiCopy() no componente;
 * os marcadores {price} {plan} {s} {name} {hours} são preenchidos DEPOIS da tradução, por adsPaywallFill.
 */
export const ADS_PAYWALL_COPY = {
  title: 'Studio Ads is included in every paid plan',
  sub: 'Choose a plan and the ad maker opens on your account. The same monthly credits also make your videos.',
  perMonth: '{price}/month',
  credits: 'Credits every month',
  newAds: 'New ads from your photos (about {s} s), any level',
  classicAds: 'Classic narrated ads of {s} s',
  either: 'Pick one or mix them: both counts come from the same credits.',
  cta: 'Get {plan} · {price}/month',
  note: 'Secure Stripe checkout · cancel anytime',
  noteAnon: 'Secure Stripe checkout · you create your account first · cancel anytime',
  express: 'Prefer we make it for you? {name} {price} · {hours} h',
  expressNote: 'One-time payment · our team makes the ad from your brief',
} as const

export type AdsPaywallCopyKey = keyof typeof ADS_PAYWALL_COPY

/** Preenche {chave} sem regex: um "$" no preço nunca vira retrovisor de replace. */
export function adsPaywallFill(template: string, vars: Readonly<Record<string, string | number>>): string {
  let out = template
  for (const [key, value] of Object.entries(vars)) out = out.split(`{${key}}`).join(String(value))
  return out
}
