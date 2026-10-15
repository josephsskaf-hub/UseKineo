// KINEO-ORIGEM-IA-LOJAS-1610 — a página /ads/for/online-stores responde a pergunta que o ChatGPT recebe:
// "AI tool to make product video ads for my online store". Medido em 15/10 num chat temporário: a Kineo NÃO aparece
// (topo: Creatify, Arcads, Pippit, Topview, Zeely). Esta página passa a ter o que um assistente cita: resumo de 3 linhas,
// o fluxo real, o custo por anúncio e uma comparação honesta.
//
// REGRA DA CASA: nenhum número NOSSO é digitado aqui. Preço, créditos, segundos, formatos, estilos, apresentadores, lote,
// marcas e assentos são LIDOS das fontes que o produto usa para cobrar e para montar (lib/checkoutPricing.ts, lib/ads/*).
// Se o fundador reprecificar, a página acompanha sozinha (guardião: scripts/test-origem-ia-lojas-1610.mjs, com mutantes).
//
// Cada recurso citado foi conferido no código em 15/10 (não na copy):
//   · link do produto → até ADS_V2_LINK_IMPORT_MAX_IMAGES fotos + dados da página (lib/ads/v2LinkImport.ts);
//   · ADS_V2_MIN_PHOTOS..ADS_V2_MAX_PHOTOS fotos, até ADS_V2_MAX_USER_VIDEOS vídeos do cliente (v2ShotLists, v2UserVideo);
//   · níveis e créditos por adsV2Credits(tier, ADS_V2_SCREEN_SECONDS) — a MESMA função que o /start debita;
//   · estilos de produto (ADS_V2_STYLES, só 9:16) e apresentador de IA (ADS_V2_PRESENTER_LIBRARY, só 9:16, rotulado IA);
//   · formatos ADS_V2_FORMATS com os mesmos créditos; variações A/B/C; lote de até ADS_V2_BATCH_MAX_ROWS;
//   · Business: AD_BRANDS_AGENCY_LIMIT marcas e BUSINESS_SEATS colegas (lib/ads/brands.ts, lib/ads/team.ts);
//   · primeiro anúncio grátis (amostra no nível ADS_SAMPLE_TIER, teto diário global — lib/ads/sample.ts).
//
// CONCORRENTES: preço público lido NA PÁGINA OFICIAL de cada um em COMPETITORS_CHECKED_ON, sem criar conta. O que não
// estava legível vira "not published" — nunca um número de terceiro. Sem vencedor universal: cada linha diz para quem serve.
import { BUSINESS_PRICES, TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '../checkoutPricing'
import { ADS_PASS_CREDITS, ADS_PASS_USD_MINOR, adsPassLive } from '../ads/offer'
import { ADS_V2_TIER_IDS, adsV2Credits, type AdsV2Tier } from '../ads/v2Tiers'
import { ADS_V2_SCREEN_SECONDS, ADS_V2_TIER_COPY } from '../ads/v2Screen'
import { ADS_V2_FORMATS, ADS_V2_MAX_PHOTOS, ADS_V2_MIN_PHOTOS } from '../ads/v2ShotLists'
import { ADS_V2_MAX_USER_VIDEOS } from '../ads/v2UserVideo'
import { ADS_V2_LINK_IMPORT_MAX_IMAGES } from '../ads/v2LinkImport'
import { ADS_V2_STYLES, ADS_V2_STYLES_PUBLIC } from '../ads/v2Styles'
import { ADS_V2_PRESENTER_LIBRARY, ADS_V2_PRESENTER_PUBLIC } from '../ads/v2Presenter'
import { ADS_V2_VARIATION_SLOTS, ADS_VARIACOES_PUBLIC } from '../ads/v2Variations'
import { ADS_V2_BATCH_MAX_ROWS } from '../ads/v2BatchRules'
import { AD_BRANDS_AGENCY_LIMIT } from '../ads/brands'
import { BUSINESS_SEATS } from '../ads/team'
import { ADS_SAMPLE_LIVE, ADS_SAMPLE_TIER } from '../ads/sample'

export const STORE_GUIDE_SEGMENT = 'online-stores'
/** Data em que os preços dos concorrentes foram lidos nas páginas oficiais. */
export const COMPETITORS_CHECKED_ON = '2026-10-15'

/** O nível que a promessa usa (o mesmo da amostra grátis e do plano Business). */
const REFERENCE_TIER: AdsV2Tier = 'commercial'

const usd = (minor: number) => formatCheckoutMoney('usd', Math.round(minor))
const tierName = (tier: AdsV2Tier) => ADS_V2_TIER_COPY[tier].name
const levelCredits = (tier: AdsV2Tier) => adsV2Credits(tier, ADS_V2_SCREEN_SECONDS)

export interface StoreCostRow {
  plan: string
  price: string
  credits: number
  /** Anúncios de 15 s no nível de referência que cabem nos créditos (piso). */
  adsPerMonth: number
  /** Custo de UM anúncio no nível de referência = créditos do anúncio × (preço ÷ créditos do plano). */
  perAd: string
  /** O mesmo custo em centavos (para ordenar a faixa sem reler a string). */
  perAdMinor: number
  billing: string
}

function costRow(plan: string, priceMinor: number, credits: number, billing: string): StoreCostRow {
  const adCredits = levelCredits(REFERENCE_TIER)
  const perAdMinor = Math.round((priceMinor * adCredits) / credits)
  return {
    plan,
    price: usd(priceMinor),
    credits,
    adsPerMonth: Math.floor(credits / adCredits),
    perAd: usd(perAdMinor),
    perAdMinor,
    billing,
  }
}

/** Tabela de custo por anúncio, derivada da tabela de preço que a Stripe cobra. */
export function storeCostRows(): StoreCostRow[] {
  const rows: StoreCostRow[] = [
    costRow('Starter', TIER_PRICES.starter.usd, TIER_CREDITS.starter, 'per month'),
    costRow('Creator', TIER_PRICES.basic.usd, TIER_CREDITS.basic, 'per month'),
    costRow('Studio', TIER_PRICES.pro.usd, TIER_CREDITS.pro, 'per month'),
    costRow('Business', BUSINESS_PRICES.usd, TIER_CREDITS.business, 'per month'),
  ]
  if (adsPassLive()) rows.push(costRow('Studio Ads pass', ADS_PASS_USD_MINOR, ADS_PASS_CREDITS, 'one time'))
  return rows
}

/** Faixa de custo de UM anúncio no nível de referência entre as formas de comprar crédito. */
export function perAdRange(): { low: string; high: string } {
  const minors = storeCostRows().map((row) => row.perAdMinor)
  return { low: usd(Math.min(...minors)), high: usd(Math.max(...minors)) }
}

function levelLine(): string {
  return ADS_V2_TIER_IDS.map((tier) => `${tierName(tier)} ${levelCredits(tier)}`).join(', ')
}

function levelSpan(): string {
  const all = ADS_V2_TIER_IDS.map(levelCredits)
  return `${Math.min(...all)} to ${Math.max(...all)}`
}

function formatsLine(): string {
  return ADS_V2_FORMATS.join(', ')
}

/** Título ≤ 60 e descrição ≤ 155 só desta página (as outras seguem como estavam). */
export function storeGuideSeo(): { title: string; description: string } {
  return {
    title: 'AI Product Video Ads for Online Stores | Kineo',
    description: `Paste a product link or upload photos and get a ${ADS_V2_SCREEN_SECONDS}-second AI video ad in ${formatsLine()}. See the cost per ad and how Kineo compares.`,
  }
}

/** O resumo citável de 3 linhas do topo. */
export function storeGuideSummary(): string[] {
  const range = perAdRange()
  return [
    `Kineo Studio Ads turns a product link or your own product photos into a vertical video ad of about ${ADS_V2_SCREEN_SECONDS} seconds: the photos get movement, with music, a short voice-over you can turn off and your logo at the end.`,
    `One ${ADS_V2_SCREEN_SECONDS}-second ad costs ${levelSpan()} credits depending on the level (${levelLine()}); at the ${tierName(REFERENCE_TIER)} level that is about ${range.low} to ${range.high} per ad depending on how you buy credits, and you see every shot before anything is charged.`,
    `Formats ${formatsLine()} at the same credits${ADS_V2_PRESENTER_PUBLIC ? ', an optional AI presenter that holds your product (always labeled as AI)' : ''}, batches of up to ${ADS_V2_BATCH_MAX_ROWS} ads and up to ${AD_BRANDS_AGENCY_LIMIT} brands on the Business plan for agencies.`,
  ]
}

/** O fluxo real, na ordem da tela do montador (/ads/v2). */
export function storeGuideFlow(): { title: string; body: string }[] {
  const steps: { title: string; body: string }[] = [
    {
      title: 'Start from your product',
      body: `Paste your product page link and Kineo takes up to ${ADS_V2_LINK_IMPORT_MAX_IMAGES} photos and the product details from it, or upload ${ADS_V2_MIN_PHOTOS} to ${ADS_V2_MAX_PHOTOS} photos (up to ${ADS_V2_MAX_USER_VIDEOS} of your own videos can go in as video). Only use pages and photos you have the right to use.`,
    },
    {
      title: 'Pick a level',
      body: ADS_V2_TIER_IDS.map((tier) => `${tierName(tier)} (${levelCredits(tier)} credits): ${ADS_V2_TIER_COPY[tier].pitch}`).join(' '),
    },
  ]
  const extras: string[] = []
  if (ADS_V2_STYLES_PUBLIC) extras.push(`${ADS_V2_STYLES.length} product styles for the hero shot (for example a package that bursts open or a supermarket shelf), vertical only`)
  if (ADS_V2_PRESENTER_PUBLIC) extras.push(`an AI presenter (${ADS_V2_PRESENTER_LIBRARY.length} to choose from) who holds your product and speaks the voice-over, vertical only and always labeled as AI, never as a real customer`)
  if (extras.length) steps.push({ title: 'Optional extras', body: `Add ${extras.join('; or ')}.` })
  steps.push({
    title: 'Choose the format',
    body: `${formatsLine()}: vertical for Reels, TikTok and Stories, portrait and square for the Instagram and Facebook feed. Same credits in every format.`,
  })
  steps.push({
    title: 'Check the plan, then render',
    body: `See every shot, the words on screen and the voice-over before anything is charged; planning is free.${ADS_VARIACOES_PUBLIC ? ` Ask for ${ADS_V2_VARIATION_SLOTS.length} variations (${ADS_V2_VARIATION_SLOTS.join('/')}) to A/B test.` : ''} Download the finished video and post it yourself.`,
  })
  steps.push({
    title: 'Many products or many stores',
    body: `Queue a batch of up to ${ADS_V2_BATCH_MAX_ROWS} ads at once. On the Business plan an agency keeps up to ${AD_BRANDS_AGENCY_LIMIT} brands (logo, colors, contact) and works with ${BUSINESS_SEATS} teammates on the same credits.`,
  })
  return steps
}

/** Linha honesta sobre a amostra grátis (só aparece com o interruptor ligado). */
export function storeGuideFreeLine(): string | null {
  if (!ADS_SAMPLE_LIVE) return null
  return `Free and trial accounts can try one free sample ad at the ${tierName(ADS_SAMPLE_TIER)} level, while the daily number of free samples lasts.`
}

export interface StoreCompetitor {
  name: string
  does: string
  publicPrice: string
  source: string
  bestFor: string
}

// Lido nas páginas oficiais em COMPETITORS_CHECKED_ON (sem conta). Preços de terceiros NÃO entram.
export const STORE_COMPETITORS: readonly StoreCompetitor[] = [
  {
    name: 'Creatify',
    does: 'Video ads from a product URL (Shopify, Amazon, app stores) with a large library of AI actors, ad templates and bulk ads from a product feed.',
    publicPrice: 'Free plan with 10 credits a month and a watermark; Standard $15 a month, or $12 a month billed yearly, for 55 credits.',
    source: 'https://creatify.ai/pricing',
    bestFor: 'Stores that want many AI-actor variations from a product URL.',
  },
  {
    name: 'Arcads',
    does: 'UGC-style video ads with 1,000+ AI actors, including an actor holding your product, in 30+ languages.',
    publicPrice: 'Not published on its website (shown after sign-up); its homepage mentions a free trial.',
    source: 'https://www.arcads.ai/',
    bestFor: 'Brands whose ads are built around a talking UGC actor.',
  },
  {
    name: 'Pippit',
    does: 'CapCut’s marketing tool: turns a product link into social videos, with AI avatars, scheduling and publishing.',
    publicPrice: 'Free plan with daily credits; paid prices are shown in the visitor’s local currency, so we do not quote a USD figure here.',
    source: 'https://www.pippit.ai/pricing',
    bestFor: 'Sellers who also want scheduling and publishing in one place.',
  },
  {
    name: 'Topview',
    does: 'URL-to-video product ads, AI avatars with lip-sync, UGC-style videos and an API.',
    publicPrice: 'Plus $36 a month billed yearly for 100 credits; no free plan shown on the pricing page.',
    source: 'https://www.topview.ai/pricing',
    bestFor: 'Teams that want avatar ads plus API access.',
  },
  {
    name: 'Zeely',
    does: 'Creates ad videos and images and also launches and manages Facebook and Instagram campaigns (a fee of up to 12% on ad spend run through it).',
    publicPrice: 'Starter $29.95 a month for 2,500 credits.',
    source: 'https://zeely.ai/pricing',
    bestFor: 'Owners who want the tool to run their Meta campaigns too.',
  },
]

/** Onde a Kineo se encaixa — sem vencedor universal. */
export function storeGuideKineoFit(): string {
  return `Kineo fits stores that want their own product photos brought to life, with the credit cost of each ad shown before it is charged and ${formatsLine()} from the same order. It does not run or buy ad campaigns, does not post to your accounts, and its AI presenter library is smaller (${ADS_V2_PRESENTER_LIBRARY.length} people) than the actor libraries of UGC-first tools.`
}

/** FAQ extra desta página. Visível E no JSON-LD (adsSegmentFaq anexa estes itens). Sem aspas nem apóstrofos nas perguntas. */
export function storeGuideFaq(): { question: string; answer: string }[] {
  const range = perAdRange()
  const free = storeGuideFreeLine()
  return [
    {
      question: 'What is a good AI tool to make product video ads for my online store?',
      answer: `It depends on the ad you want. Kineo Studio Ads animates your own product photos (or the photos on your product page) into a ${ADS_V2_SCREEN_SECONDS}-second ad with music, voice-over and your logo. Creatify, Arcads, Pippit, Topview and Zeely are other options: Creatify and Arcads focus on AI actors, Pippit adds scheduling and publishing, Topview adds avatars and an API, and Zeely also runs Meta campaigns. Compare the public prices on each official page; there is no single best tool for every store.`,
    },
    {
      question: 'Can Kineo make a video ad from my product link?',
      answer: `Yes. Paste the product page link and Kineo takes up to ${ADS_V2_LINK_IMPORT_MAX_IMAGES} photos and the product details from the page; some shops block automatic reading, and then you upload ${ADS_V2_MIN_PHOTOS} to ${ADS_V2_MAX_PHOTOS} photos instead. Check the framing of each photo and the product details before rendering.`,
    },
    {
      question: 'How much does one product video ad cost on Kineo?',
      answer: `A ${ADS_V2_SCREEN_SECONDS}-second ad uses ${levelLine()} credits, depending on the level. At the ${tierName(REFERENCE_TIER)} level that works out to about ${range.low} to ${range.high} per ad, depending on the plan you buy credits with.${free ? ` ${free}` : ''}`,
    },
    {
      question: 'Can an AI presenter show my product in the ad?',
      answer: ADS_V2_PRESENTER_PUBLIC
        ? `Yes, optionally. An AI presenter holds your product and speaks the voice-over in ${ADS_V2_FORMATS[0]} ads. The presenter is always labeled as AI and is never presented as a real customer, and it needs the voice-over turned on and at least one product photo.`
        : 'Not at the moment. Ads are made from your own product photos.',
    },
    {
      question: 'Can an agency make ads for several online stores?',
      answer: `Yes. The Business plan keeps up to ${AD_BRANDS_AGENCY_LIMIT} brands, each with its own logo, colors and contact, includes ${BUSINESS_SEATS} teammates who use the same credits, and lets you queue batches of up to ${ADS_V2_BATCH_MAX_ROWS} ads.`,
    },
  ]
}

/** Legenda da tabela de custo (o nível e a duração de referência lidos da fonte). */
export function storeGuideCostNote(): string {
  return `Cost of one ${ADS_V2_SCREEN_SECONDS}-second ${tierName(REFERENCE_TIER)} ad (${levelCredits(REFERENCE_TIER)} credits) = plan price ÷ plan credits × ad credits. Prices in USD from the Kineo pricing table.`
}

/** Cabeçalho da coluna de anúncios por mês. */
export function storeGuideAdsColumn(): string {
  return `${tierName(REFERENCE_TIER)} ads`
}
