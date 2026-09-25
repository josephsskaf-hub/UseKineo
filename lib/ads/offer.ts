// KINEO-STUDIO-ADS-2026-09-25 — o passe do Studio Ads (fonte única de preço, créditos e acesso).
//
// DECISÕES DO FUNDADOR (24/09 ~07h30 BRT, docs/DECISIONS.md): nome "Studio Ads"; acesso por
// passe ÚNICO "US$19" com 60 créditos; assinante pago entra sem passe; entrega imediata com
// revisão humana do 1º anúncio em 24 h. Este módulo é PURO (sem import): quem cobra
// (app/api/stripe/checkout), quem concede (webhook, Path A) e quem pinta (/ads, /ads/new)
// leem daqui — nunca digitam o número.
//
// CENTAVOS: 1990, não 1900. O "US$19" da decisão segue a convenção da casa de terminar em
// ,90 (US$9,90 / 19,90 / 39,90) e, sobretudo, 1900 é o valor do bulk10 (lib/checkoutPricing
// BULK_PACKS): o webhook resolve venda por valor quando falta metadata, e dois SKUs no mesmo
// centavo viram o mesmo pedido. Lista dos valores one-time já ocupados abaixo; o guardião
// scripts/test-ads-fundacao-2026-09-25.mjs prova que o passe não colide.
//
// INTERRUPTOR: desde 24/09 (~20h28 BRT, "pode ligar") o passe está LIGADO em código (ADS_PASS_LIVE_IN_CODE,
// abaixo). Desligar de emergência: NEXT_PUBLIC_ADS_PASS_LIVE=0 na Vercel + deploy ("env nova só vale em deploy
// novo"). O mesmo interruptor tira o Studio Ads do /llms.txt e do /api/facts.

export const ADS_PRODUCT_NAME = 'Studio Ads' as const
export const ADS_OFFER_VERSION = 'studio_ads_v1' as const

/** SKU one-time no checkout da casa (`?pack=ads_pass`; metadata.pack = ADS_PASS_ID). */
export const ADS_PASS_ID = 'ads_pass' as const
export const ADS_PASS_USD_MINOR = 1990
export const ADS_PASS_CREDITS = 60
/** Dias de acesso ao Studio Ads concedidos pelo passe (coluna profiles.ads_access_until). */
export const ADS_PASS_ACCESS_DAYS = 365
/** Nome EXATO da coluna que o webhook escreve e o gate lê (migration 2026-09-25_studio_ads.sql). */
export const ADS_ACCESS_COLUMN = 'ads_access_until' as const

/** Valores one-time (centavos USD) já usados por outros SKUs da casa — o passe não pode cair em nenhum. */
export const ONE_TIME_USD_MINOR_OCCUPIED: readonly number[] = [
  290, 490, 590, 900, 1290, 1490, 1900, 3500, 4900, 5990, 7500, 9900, 10000, 19900, 29900, 39900,
]

/** Kineo 1 de 60 s custa 5 créditos (lib/credits/engineCost.ts); o passe cobre 12 anúncios de 60 s ou 20 de 35 s. */
export const KINEO1_60S_CREDITS = 5
export const KINEO1_35S_CREDITS = 3

// KINEO-STUDIO-ADS-LIGADO-2026-09-24 — fundador 24/09 ~20h BRT, depois do teste da padaria: "pode ligar". A conta da Vercel
// que o Claude usa não tem permissão para criar env de produção (403), então o interruptor passa a morar no CÓDIGO, como
// CARD_TRIAL_LIVE: true = aberto. Desligar de emergência sem mexer no código: NEXT_PUBLIC_ADS_PASS_LIVE=0 na Vercel + deploy.
export const ADS_PASS_LIVE_IN_CODE = true

export function adsPassLive(): boolean {
  const env = process.env.NEXT_PUBLIC_ADS_PASS_LIVE
  if (env === '0') return false
  return env === '1' || ADS_PASS_LIVE_IN_CODE
}

/** "US$19.90" — sem ".00" fantasma, sem inventar arredondamento. */
export function adsPassPriceLabel(minor: number = ADS_PASS_USD_MINOR): string {
  const value = minor / 100
  return Number.isInteger(value) ? `US$${value}` : `US$${value.toFixed(2)}`
}

/** Data de expiração do acesso a partir de `from` (UTC, dias inteiros). */
export function adsAccessUntil(from: Date, days: number = ADS_PASS_ACCESS_DAYS): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
}

/** Quantos anúncios o passe cobre, por duração — para a página nunca prometer mais do que o crédito paga. */
export function adsCoveredByPass(seconds: 35 | 60, credits: number = ADS_PASS_CREDITS): number {
  const cost = seconds === 60 ? KINEO1_60S_CREDITS : KINEO1_35S_CREDITS
  return Math.floor(credits / cost)
}

/** Copy pública do passe — lida pela página /ads e, via lib/growth/studioAdsFacts.ts, pelo /llms.txt e pelo /api/facts;
 *  tudo que está aqui é executado pelo produto. */
export function adsPassCopy() {
  return {
    name: ADS_PRODUCT_NAME,
    price: adsPassPriceLabel(),
    headline: 'Your photos, your logo, your offer — a narrated vertical ad, today.',
    includes: [
      // Verificação da Research (24/09): 6 dos 8 modelos são de 35 s; o "12 de 60 s" só vale nos modelos longos.
      `${ADS_PASS_CREDITS} credits (about ${adsCoveredByPass(35)} ads of 35 s, or ${adsCoveredByPass(60)} of 60 s with the longer models, on Kineo 1)`,
      'Script written from your brief, narration in your language, captions and original music',
      'Your photos and clips inside the film, your logo and call to action on the last frame',
      'A human editor reviews your first ad within 24 hours and sends a corrected version if anything is off',
      // KINEO-SEM-PROMESSA-DE-EXPIRACAO-2026-09-25 — "credits do not expire" era falso para quem tem plano (a renovação zera o crédito comprado).
      'One-time payment, no subscription',
    ],
    excludes: [
      'Presenter or avatar videos, cloned voices and product shots inside generated scenes are not part of this pass yet',
      'Square and landscape cuts, 15-second ads and ads with the original audio of your clip are coming next',
    ],
  }
}
