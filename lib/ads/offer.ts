// KINEO-STUDIO-ADS-2026-09-25 — o passe do Studio Ads (fonte única de preço, créditos e acesso).
//
// DECISÕES DO FUNDADOR (24/09 ~07h30 BRT, docs/DECISIONS.md): nome "Studio Ads"; acesso por
// passe ÚNICO "US$19" com 60 créditos (28/09: passe B, 90 créditos pelo mesmo preço); assinante pago entra sem passe; entrega imediata com
// um humano confere o 1º anúncio (27/09: a promessa de "24 h" e de "versão corrigida" CAIU — decisão do fundador;
// fica "A human checks your first ad"). Este módulo é PURO (sem import): quem cobra
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
// 28/09: passe B do fundador ("B, vai para as duas") — o mesmo US$19,90 passa de 60 para 90 créditos: paga 2 anúncios novos
// (Photo motion ou Commercial), 1 Cinema, ou os anúncios clássicos. O webhook concede o metadata.pack_credits gravado quando a
// sessão foi aberta (app/api/stripe/webhook/route.ts, creditsToAdd), nunca esta constante no momento do pagamento.
export const ADS_PASS_CREDITS = 90
/** Dias de acesso ao Studio Ads concedidos pelo passe (coluna profiles.ads_access_until). */
export const ADS_PASS_ACCESS_DAYS = 365
/** Nome EXATO da coluna que o webhook escreve e o gate lê (migration 2026-09-25_studio_ads.sql). */
export const ADS_ACCESS_COLUMN = 'ads_access_until' as const

/** Valores one-time (centavos USD) já usados por outros SKUs da casa — o passe não pode cair em nenhum.
 *  KINEO-PRECO-V8-A-2026-09-28 — anuais passaram de 9900/19900/39900 para 12900/29900/54900 (9900 fica: piloto);
 *  os mensais novos (1290 = topup120 também, 2990, 5490) entram pelo mesmo motivo que o 29900 do Autopilot já estava. */
export const ONE_TIME_USD_MINOR_OCCUPIED: readonly number[] = [
  290, 490, 590, 900, 1290, 1490, 1900, 2990, 3500, 4900, 5490, 5990, 7500, 9900, 10000, 12900, 29900, 54900,
]

/** Kineo 1 de 60 s custa 5 créditos (lib/credits/engineCost.ts); o passe (90 cr desde 28/09) cobre 18 anúncios de 60 s ou 30 de 35 s. */
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

// ═══ MIRROR: preço de cada nível do anúncio v2 (Studio Ads) por anúncio de ADS_V2_SCREEN_SECONDS (15 s) ═══
// Fonte: lib/ads/v2Tiers.ts adsV2Credits(tier, ADS_V2_SCREEN_SECONDS) e o nome em lib/ads/v2Screen.ts ADS_V2_TIER_COPY, na ordem
// de ADS_V2_TIER_IDS — derivados de verdade em lib/ads/v2Levels.ts (ADS_V2_LEVEL_PRICES). Este arquivo é PURO (sem import; os
// guardiões o executam cru), então a copy do passe (adsPassCopy → /llms.txt e /api/facts) lê este espelho; o guardião
// scripts/test-passe-b-90-creditos-2026-09-28.mjs prova que ele é IGUAL ao derivado. A página /ads passa os níveis derivados.
export interface AdsLevelPrice {
  readonly name: string
  readonly credits: number
}
export const ADS_V2_LEVEL_PRICES_MIRROR: readonly AdsLevelPrice[] = [
  { name: 'Photo motion', credits: 34 },
  { name: 'Commercial', credits: 41 },
  { name: 'Cinema', credits: 51 },
]
// ═══ END MIRROR ═══

/**
 * Quantos anúncios NOVOS um saldo paga, nível a nível, em palavras: 90 → "2 new ads (Photo motion or Commercial), 1 Cinema";
 * 60 → "1 new ad at any level"; abaixo do nível mais barato → ''. Níveis com a mesma contagem se juntam; nunca promete
 * mais do que floor(créditos / preço do nível).
 */
export function adsNewAdsLabel(credits: number, levels: readonly AdsLevelPrice[] = ADS_V2_LEVEL_PRICES_MIRROR): string {
  const counts = levels.map((l) => ({ name: l.name, n: Math.floor(credits / l.credits) })).filter((c) => c.n > 0)
  if (counts.length === 0) return ''
  if (counts.length === levels.length && counts.every((c) => c.n === counts[0].n)) {
    return counts[0].n === 1 ? '1 new ad at any level' : `${counts[0].n} new ads at any level`
  }
  const groups: { n: number; names: string[] }[] = []
  for (const c of [...counts].sort((a, b) => b.n - a.n)) {
    const g = groups.find((x) => x.n === c.n)
    if (g) g.names.push(c.name)
    else groups.push({ n: c.n, names: [c.name] })
  }
  return groups
    .map((g, i) => (i === 0 ? `${g.n} new ${g.n === 1 ? 'ad' : 'ads'} (${g.names.join(' or ')})` : `${g.n} ${g.names.join(' or ')}`))
    .join(', ')
}

/** "2 new ads (Photo motion or Commercial), 1 Cinema, or about 30 classic ads of 35 s" — a frase do fundador (28/09), calculada. */
export function adsCoverageLine(credits: number = ADS_PASS_CREDITS, levels: readonly AdsLevelPrice[] = ADS_V2_LEVEL_PRICES_MIRROR): string {
  const classic = `about ${adsCoveredByPass(35, credits)} classic ads of 35 s`
  const newAds = adsNewAdsLabel(credits, levels)
  return newAds ? `${newAds}, or ${classic}` : classic
}

/** Copy pública do passe — lida pela página /ads e, via lib/growth/studioAdsFacts.ts, pelo /llms.txt e pelo /api/facts;
 *  tudo que está aqui é executado pelo produto. */
export function adsPassCopy() {
  return {
    name: ADS_PRODUCT_NAME,
    price: adsPassPriceLabel(),
    headline: 'Your photos, your logo, your offer — a narrated vertical ad, today.',
    includes: [
      // Verificação da Research (24/09): 6 dos 8 modelos são de 35 s; o "N de 60 s" só vale nos modelos longos.
      // 28/09: passe B do fundador (90 cr) — a linha diz primeiro os anúncios NOVOS por nível, depois os clássicos.
      `${ADS_PASS_CREDITS} credits: ${adsCoverageLine()} (classic ads run on Kineo 1; about ${adsCoveredByPass(60)} of 60 s with the longer models)`,
      'Script written from your brief, narration in your language, captions and original music',
      'Your photos and clips inside the film, your logo and call to action on the last frame',
      // KINEO-ADS-REVISAO-2026-09-27 — fundador 27/09: sem prazo de 24 h nem "versão corrigida"; só o que o produto faz.
      'A human checks your first ad',
      // KINEO-SEM-PROMESSA-DE-EXPIRACAO-2026-09-25 — "credits do not expire" era falso para quem tem plano (a renovação zera o crédito comprado).
      'One-time payment, no subscription',
    ],
    excludes: [
      // KINEO-ADS-V2-VIRADA-2026-09-29 — com o anúncio v2 público, o anúncio de ~15 s EXISTE e o Commercial/Cinema põem o produto
      // da foto dentro de cenas criadas (lib/ads/v2Screen.ts ADS_V2_TIER_COPY): as duas meias-frases viraram mentira e saíram.
      'Presenter or avatar videos and cloned voices are not part of this pass yet',
      // KINEO-ADS-REVISAO-2026-09-27 — 1:1, 4:5 e 16:9 existem desde 26/09 (lib/ads/adStyle.ts AD_FORMATS): saíram do "ainda não".
      'Ads with the original audio of your clip are coming next',
    ],
  }
}
