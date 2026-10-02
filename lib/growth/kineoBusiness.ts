// KINEO-NUVEM-A4-2026-10-02 — card "Kineo Business": SEM preço novo. É o plano Studio (tier 'pro') apresentado para
// empresas, com o que ele já inclui hoje para uma empresa que faz vídeo de marca:
//   · o logo da conta em todo filme e anúncio (lib/brandLogo — compose, Espaços, Ads v2);
//   · Studio Ads com 3 variações de cada anúncio (lib/ads/v2Variations.ts ADS_VARIACOES_PUBLIC);
//   · Espaços: espaço vazio → negócio pronto, vídeo antes → depois (lib/spaces/spaces.ts SPACES_PUBLIC);
//   · 10 personagens salvos (lib/characters.ts characterLimitFor('pro'));
//   · 300 créditos por mês (lib/checkoutPricing.ts TIER_CREDITS.pro) ao preço do Studio (getTierPrice('pro')).
// Nenhum número é digitado aqui: a página passa as fontes e este módulo só monta o texto.
//
// POR QUE: o pedido B2B de 01/10 (logo + mascote consistente + depoimento com atriz de IA) já cabe no Studio, mas a
// empresa não acha "Studio" na lista de planos de criador. O card dá o nome que ela procura ao plano que já existe.
//
// INTERRUPTOR: KINEO_BUSINESS_CARD_LIVE=false → o card não aparece para ninguém de fora (no /ads, conta da casa vê com
// ?preview=business; o /business-video-ads é estático e só mostra com o interruptor ligado). É oferta pública nova (um
// nome comercial novo sobre um preço existente): decisão do fundador. O checkout é o GET de sempre
// (tier=pro&billing=monthly) com from=business e intent_campaign=kineo_business para a atribuição.
//
// MÓDULO PURO (sem import em tempo de execução): o guardião executa isolado.

export const KINEO_BUSINESS_CARD_LIVE = false
export const KINEO_BUSINESS_NAME = 'Kineo Business'
export const KINEO_BUSINESS_TIER = 'pro' as const
export const KINEO_BUSINESS_INTENT_CAMPAIGN = 'kineo_business'
export const KINEO_BUSINESS_CHECKOUT_HREF = `/api/stripe/checkout?tier=${KINEO_BUSINESS_TIER}&billing=monthly&from=business&intent_campaign=${KINEO_BUSINESS_INTENT_CAMPAIGN}`

/** O card aparece? Interruptor; ou, só no /ads (dinâmico), conta da casa pedindo ?preview=business. */
export function kineoBusinessVisible(args: { live?: boolean; internal?: boolean; preview?: string | null }): boolean {
  const live = args.live ?? KINEO_BUSINESS_CARD_LIVE
  return live === true || (args.internal === true && args.preview === 'business')
}

export interface KineoBusinessFacts {
  /** Preço do Studio já formatado por formatCheckoutMoney (a página passa; nunca digitado). */
  priceLabel: string
  /** Nome canônico do plano (planName('pro')). */
  planName: string
  credits: number
  characters: number
  variationsOpen: boolean
  spacesOpen: boolean
}

export interface KineoBusinessOffer {
  name: string
  planLine: string
  priceLabel: string
  includes: string[]
  ctaLabel: string
  href: string
}

export function kineoBusinessOffer(f: KineoBusinessFacts): KineoBusinessOffer {
  if (!(Number.isInteger(f.credits) && f.credits > 0) || !(Number.isInteger(f.characters) && f.characters > 0) || !f.priceLabel) {
    throw new Error('kineo_business_bad_facts')
  }
  const includes = [
    'Your logo on every film and ad',
    f.variationsOpen ? 'Studio Ads with 3 variations of each ad' : 'Studio Ads from your own photos and logo',
    ...(f.spacesOpen ? ['Spaces: an empty space turned into your finished business, before → after'] : []),
    `${f.characters} saved characters — the same face in every video`,
    `${f.credits} credits every month`,
  ]
  return {
    name: KINEO_BUSINESS_NAME,
    planLine: `The ${f.planName} plan, set up for businesses. No new plan, no new price.`,
    priceLabel: f.priceLabel,
    includes,
    ctaLabel: `Get ${KINEO_BUSINESS_NAME} · ${f.priceLabel}/mo`,
    href: KINEO_BUSINESS_CHECKOUT_HREF,
  }
}
