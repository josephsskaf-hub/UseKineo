// KINEO-CITACOES-FLUXO-D11 (23/11/2026) — /ai-ugc-ads/product-photo-ads: "anúncio em vídeo pela foto do produto", com o custo
// por anúncio. Família anúncio para negócio (dia 11 do programa Citações → Fluxo, docs/CITACOES-FLUXO-15-DIAS-2026-11-13.md).
//
// POR QUÊ: a família /ai-ugc-ads fala do apresentador; quem pergunta ao ChatGPT "quanto custa um anúncio em vídeo feito da foto
// do meu produto" não tinha uma página com a conta pronta por nível e por plano.
//
// REGRAS: nenhum crédito ou dólar digitado (tudo vem das funções que cobram: adsV2Credits, ADS_V2_TIERS, TIER_CREDITS,
// planCreditSpendUsd, as travas da amostra); nenhum nome de motor; só o que está aberto ao cliente hoje. A página NÃO promete
// pessoa falando para a câmera: neste formato a voz é narração por cima das imagens.
import { ADS_V2_SECONDS, ADS_V2_TIER_IDS, ADS_V2_TIERS, adsV2Credits, type AdsV2Tier } from '@/lib/ads/v2Tiers'
import { ADS_V2_MAX_PHOTOS, ADS_V2_MIN_PHOTOS } from '@/lib/ads/v2ShotLists'
import { ADS_V2_SCREEN_SECONDS } from '@/lib/ads/v2Screen'
import { ADS_SAMPLE_LIVE } from '@/lib/ads/sample'
import { adsPassLive } from '@/lib/ads/offer'
import { TIER_CREDITS, type CheckoutTier } from '@/lib/checkoutPricing'
import { CREATOR_MO, STARTER_MO, STUDIO_MO, formatUsd, planCreditSpendUsd } from '@/lib/marketingPrice'

export const FOTO_PRODUTO_MARK = 'KINEO-CITACOES-FLUXO-D11'
export const FOTO_PRODUTO_PATH = '/ai-ugc-ads/product-photo-ads'
/** Dia em que os números foram conferidos no código ("Reviewed" na página e lastmod do sitemap). */
export const FOTO_PRODUTO_REVIEWED_ISO = '2026-11-23'
export const FOTO_PRODUTO_CAMPAIGN = 'product_photo_ads'

/** O montador do Studio Ads na entrada "produto" (a mesma do cartão AI Product Ads da home), com a campanha da página. */
export const FOTO_PRODUTO_CTA_DEST = `/ads/v2?entry=product&utm_source=seo&utm_medium=ugc_pages&utm_campaign=${FOTO_PRODUTO_CAMPAIGN}`
/** A página é estática: o botão nasce no caminho do visitante (o /signup honra ?redirect= de mesma origem; o /ads/v2 exige conta). */
export const FOTO_PRODUTO_CTA_HREF = `/signup?redirect=${encodeURIComponent(FOTO_PRODUTO_CTA_DEST)}`

const LEVEL_NAME: Record<AdsV2Tier, string> = { photo_motion: 'Photo motion', commercial: 'Commercial', cinema: 'Cinema' }
const PLANS: readonly { tier: CheckoutTier; name: string; month: string }[] = [
  { tier: 'starter', name: 'Starter', month: STARTER_MO },
  { tier: 'basic', name: 'Creator', month: CREATOR_MO },
  { tier: 'pro', name: 'Studio', month: STUDIO_MO },
]

function levelWhat(id: AdsV2Tier): string {
  const s = ADS_V2_TIERS[id]
  if (s.generatedScenes === 0) return `${s.shots} shots, all made by adding movement to your own photos.`
  const hero = s.heroCloseups > 0 ? ` With a product or food photo, the ad opens on ${s.heroCloseups} hero close-ups.` : ''
  return `${s.shots} shots: ${s.shots - s.generatedScenes} from your photos plus ${s.generatedScenes} new scenes of everyday people with the product, created from your photos.${hero}`
}

export type FotoProdutoFacts = ReturnType<typeof fotoProdutoFacts>

export function fotoProdutoFacts() {
  const levels = ADS_V2_TIER_IDS.map((id) => ({
    id,
    name: LEVEL_NAME[id],
    what: levelWhat(id),
    credits: ADS_V2_SECONDS.map((s) => ({ seconds: s, credits: adsV2Credits(id, s) })),
    credits15: adsV2Credits(id, 15),
  }))
  const plans = PLANS.map((p) => ({
    name: p.name,
    month: p.month,
    credits: TIER_CREDITS[p.tier],
    perLevel: levels.map((l) => ({ level: l.name, usd: formatUsd(planCreditSpendUsd(p.tier, l.credits15)), ads: Math.floor(TIER_CREDITS[p.tier] / l.credits15) })),
  }))
  return {
    levels,
    plans,
    minPhotos: ADS_V2_MIN_PHOTOS,
    maxPhotos: ADS_V2_MAX_PHOTOS,
    seconds: ADS_V2_SECONDS,
    sampleLive: ADS_SAMPLE_LIVE === true && adsPassLive(),
    sampleSeconds: ADS_V2_SCREEN_SECONDS,
  }
}

export function fotoProdutoCopy(f: FotoProdutoFacts) {
  const cheap = f.levels[0]
  const top = f.levels[f.levels.length - 1]
  // O plano de referência da resposta: o 1º cujos créditos do mês pagam um anúncio de QUALQUER nível (o de entrada pode não pagar os níveis de cima).
  const ref = f.plans.find((p) => p.perLevel.every((x) => x.ads >= 1)) ?? f.plans[f.plans.length - 1]
  const entry = f.plans[0]
  const entryFits = entry.perLevel.filter((x) => x.ads >= 1).map((x) => x.level)
  const entryLine = entry === ref ? '' : entryFits.length > 0
    ? ` The ${entry.name} plan (${entry.month}, ${entry.credits} credits) covers ${entryFits.join(' and ')} only.`
    : ` The ${entry.name} plan (${entry.month}, ${entry.credits} credits) does not hold enough credits for one ad.`
  const secondsList = f.seconds.join(', ').replace(/, (\d+)$/, ' or $1')
  const sampleLine = f.sampleLive
    ? `A new account can get one free sample ad: ${f.sampleSeconds} seconds, in the Real product close-up format, with a small watermark. Free samples are limited per day and are not offered in every country.`
    : 'Product ads are part of every paid plan.'
  return {
    title: 'Product Photo to Video Ad: Cost per Ad | Kineo',
    description: `Turn ${f.minPhotos} to ${f.maxPhotos} product photos into a vertical video ad. See what each ad costs in credits and in dollars on every Kineo plan.`,
    eyebrow: 'AI product photo ads',
    h1: 'Turn product photos into a video ad: what each ad costs',
    question: 'How much does an AI video ad made from product photos cost?',
    answer: [
      `On Kineo, a ${f.seconds[0]}-second video ad made from your product photos costs ${cheap.credits15} to ${top.credits15} credits, depending on the level you pick. On the ${ref.name} plan (${ref.month}, ${ref.credits} credits) that works out to ${ref.perLevel[0].usd} to ${ref.perLevel[ref.perLevel.length - 1].usd} per ad.${entryLine}`,
      `You upload ${f.minPhotos} to ${f.maxPhotos} photos of the real product and write one sentence about it. Kineo returns a vertical ad with moving shots, music, a short voice-over and your logo on the final card.`,
    ],
    costHeading: `Cost per ${f.seconds[0]}-second ad, by level and plan`,
    costNote: `Dollar values are the share of the monthly plan price that the ad's credits use up; you pay the plan, not a fee per ad. Credits are shared with everything else you make on Kineo. "Ads per month" assumes the whole plan goes to ${f.seconds[0]}-second ads of that level; where a level costs more credits than the plan gives in a month, the table says so instead of a price. Prices in US dollars; the checkout may show your local currency.`,
    lengthHeading: 'Credits by length',
    lengthNote: `The same ad can run ${secondsList} seconds. Longer ads cost proportionally more credits.`,
    ioHeading: 'What you give and what you get',
    io: [
      { k: 'You provide', v: `${f.minPhotos} to ${f.maxPhotos} photos of the real product, one sentence about it (or a product link) and your logo.` },
      { k: 'You choose', v: `The level (${f.levels.map((l) => l.name).join(', ')}) and the length: ${secondsList} seconds.` },
      { k: 'You get', v: 'A vertical MP4 ready to post: moving shots of the product, music, a short voice-over you can turn off and a final card with your logo.' },
      { k: 'First ad', v: sampleLine },
    ],
    limitsHeading: 'Limits worth knowing before you start',
    limits: [
      'The voice is a voice-over on top of the images. In this format nobody speaks to the camera.',
      'The ad is built from the photos you upload: a blurry or badly lit photo gives a weaker ad.',
      'Small details such as label text, engravings and ports can drift in a generated shot, so review the ad before posting.',
      'With fewer photos than shots, the same photo is reused with a different movement each time.',
    ],
    faqs: [
      { q: 'How much does one AI product video ad cost on Kineo?', a: `A ${f.seconds[0]}-second ad costs ${f.levels.map((l) => `${l.credits15} credits at the ${l.name} level`).join(', ')}. On the ${ref.name} plan (${ref.month}) that is ${ref.perLevel.map((p) => `${p.usd} (${p.level})`).join(', ')} per ad.${entryLine} (Reviewed ${FOTO_PRODUTO_REVIEWED_ISO}.)` },
      { q: 'How many ads does a plan make per month?', a: f.plans.map((p) => `${p.name} (${p.month}, ${p.credits} credits): ${p.perLevel.map((x) => `${x.ads} at ${x.level}`).join(', ')}`).join('. ') + `. These counts are for ${f.seconds[0]}-second ads and assume the credits are not spent on anything else.` },
      { q: 'Do I need to film the product?', a: `No. ${f.minPhotos === 1 ? 'One photo is' : `${f.minPhotos} photos are`} enough to start and you can send up to ${f.maxPhotos}. With fewer photos than shots, the same photo comes back with a different movement, so more angles make a more varied ad.` },
      { q: 'Is the first ad free?', a: sampleLine },
      { q: 'Does a person appear talking about my product?', a: 'Not in this format. A product photo ad is moving shots of the product with a voice-over, music and your logo. Ads with an AI presenter are described on the AI UGC Ads page.' },
    ],
    cta: 'Make an ad from my product photos',
    pillarLink: 'See AI UGC Ads',
  }
}
