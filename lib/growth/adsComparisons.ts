import snapshot from './adsCompetitorSnapshot.json'
import { adsSegmentOffer } from './adsSegmentPresentation'
import { ADS_NOVOS_FACTS, VS_NOVOS_REVIEWED_ISO, type AdsNovoId } from '../seo/vsNovos1610' // KINEO-VS-NOVOS-1610
import { ADS_SAMPLE_LIVE } from '../ads/sample'

export const ADS_COMPARISONS = snapshot.competitors
export const ADS_COMPARISON_ACCESS = `${snapshot.accessWindow}/${snapshot.year}`
export type AdsCompetitor = typeof ADS_COMPARISONS[number]
export const adsComparisonCta = (id: string) => `/ads?utm_source=seo&utm_medium=comparison&utm_campaign=gpt24h&utm_content=vs-${id}`
export const adsComparisonPath = (slug: string) => `/vs/${slug}`

function officialFeature(mark: string): string {
  if (mark.includes('*')) return 'Not confirmed by the official-source snapshot (third-party report only).'
  if (mark.startsWith('✓')) return `✓ Listed on the official page${mark.includes('(') ? ` ${mark.slice(mark.indexOf('('))}` : ''}`
  if (mark === '✗') return '✗ Not offered in this snapshot'
  return 'Not confirmed in this snapshot'
}

export function adsComparisonRows(c: AdsCompetitor & { accessedOn?: string }) {
  const offer = adsSegmentOffer()
  return [
    { id: 'input', label: 'Starting material', kineo: 'Your website link or brief, logo, photos and clips.', competitor: c.linkToAd.startsWith('✓') ? 'A website or product link; other input requirements not recorded.' : 'Input requirements not confirmed.' },
    { id: 'link', label: 'Link → ad', kineo: '✓ Extract the details, then check the facts before rendering.', competitor: officialFeature(c.linkToAd) },
    { id: 'formats', label: 'Formats', kineo: offer.formats, competitor: c.accessedOn ? officialFeature(c.formats) : `${officialFeature(c.formats)} — square and landscape in the research table; full format list not recorded.` },
    { id: 'captions', label: 'Captions & soundtrack', kineo: '✓ Captions and music in the finished ad.', competitor: 'Not confirmed in this snapshot.' },
    { id: 'translation', label: 'Language & translation', kineo: 'Narration in supported languages; check the script. Not automatic dubbing of an existing ad.', competitor: officialFeature(c.translation) },
    // KINEO-COPY-CONTRADICOES-1510 — era "✗ Not included in Studio Ads.": o anúncio v2 tem a pessoa de IA opcional
    // (lib/ads/v2Presenter.ts, biblioteca fechada, só 9:16). Continua fora: avatar/gêmeo digital da própria pessoa.
    { id: 'avatar', label: 'Avatar / actor', kineo: 'Optional AI presenter from a fixed library, always labeled as AI, in 9:16 only. ✗ No custom avatar or digital twin of you.', competitor: officialFeature(c.avatar) },
    { id: 'publishing-analytics', label: 'Direct publishing & analytics', kineo: '✗ Direct publishing. ✗ Ad-performance analytics. Download and publish yourself.', competitor: `Publishing: ${officialFeature(c.publishing)}. Analytics: ${officialFeature(c.analytics)}.` },
    { id: 'price', label: 'Entry price', kineo: `From ${offer.starterPrice} USD/month on Starter; Studio Ads is included. ${offer.credits} credits per ${offer.seconds}-second ad.`, competitor: c.accessedOn // KINEO-VS-NOVOS-1610 — leitura própria (Arcads): sem lista de preço pública = "not published", nada de terceiros
      ? `${c.price} on the official site (read ${c.accessedOn}); check the current terms with ${c.name}.`
      : `${c.price.replace('(anual)', '(annual billing)')} — as recorded in the official-source snapshot; check billing terms and allowances on the official page.${c.id in ADS_NOVOS_FACTS ? ' A newer reading of the official page is below.' : ''}` },
  ]
}

// ─── KINEO-VS-NOVOS-1610 — Arcads entra no MESMO molde; Creatify e Arcads ganham resumo citável, fatos novos com fonte e
// data (lib/seo/vsNovos1610.ts, lidos em 15/10/2026), "when to pick them instead" e FAQ (= FAQPage JSON-LD na página).
// A fotografia de 25-26/09 (adsCompetitorSnapshot.json) continua intacta e datada; a Arcads NÃO entra nela: os números
// daquele documento eram de terceiros ("$110*"). A Arcads nasce aqui com o que a página oficial mostrou em 15/10, e o
// preço que ela não publica fica "Not published". Preço/crédito da Kineo: sempre de adsSegmentOffer() (fontes únicas).
export type AdsComparisonEntry = AdsCompetitor & { accessedOn?: string }
export const ADS_COMPARISONS_1610: AdsComparisonEntry[] = [{
  id: 'arcads', name: ADS_NOVOS_FACTS.arcads.name, slug: 'arcads-alternative', officialUrl: ADS_NOVOS_FACTS.arcads.officialUrl,
  sourceRow: '', linkToAd: '?', avatar: '✓', variations: '?', formats: '?', brandKit: '?', publishing: '?', analytics: '?',
  translation: '✓', price: 'Not published', accessedOn: VS_NOVOS_REVIEWED_ISO,
}]
/** Todas as páginas de comparação do Ads (sitemap, rodapé "Other comparisons"). */
export const ADS_COMPARISON_PAGES: AdsComparisonEntry[] = [...ADS_COMPARISONS, ...ADS_COMPARISONS_1610]
/** A data que a página mostra: a janela da fotografia de 25-26/09, ou o dia da leitura própria. */
export const adsComparisonAccess = (c: AdsComparisonEntry) => c.accessedOn ?? ADS_COMPARISON_ACCESS

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)
const noDot = (text: string) => text.replace(/\.$/, '')
const isNovo = (id: string): id is AdsNovoId => id in ADS_NOVOS_FACTS

/** O preço da Kineo numa frase, só de adsSegmentOffer(). */
function kineoAdsPrice() {
  const offer = adsSegmentOffer()
  return `Studio Ads is included in any paid plan from ${offer.starterPrice} USD/month; a ${offer.v2Seconds}-second ad uses ${offer.v2Levels} credits, depending on the level.`
}

export function adsComparisonEnrichment(c: AdsComparisonEntry) {
  if (!isNovo(c.id)) return null
  const f = ADS_NOVOS_FACTS[c.id]
  const offer = adsSegmentOffer()
  const rows = adsComparisonRows(c)
  const kineoAvatar = rows.find((r) => r.id === 'avatar')!.kineo
  const kineoInput = rows.find((r) => r.id === 'input')!.kineo
  const kineoMakes = `Kineo Studio Ads starts from your website link or brief, your photos and your logo, and assembles a vertical ad of about ${offer.v2Seconds} seconds: your real photos in motion, music, a short voice-over you can turn off and your logo at the end. Any AI presenter is optional and always labeled as AI.`
  const summary: [string, string, string] = c.id === 'creatify'
    ? [`Creatify is an ad platform built around AI actors (${lowerFirst(noDot(f.actors.text))}), with ad launching and insights tools listed in its plans.`, kineoMakes, `Creatify pricing: ${f.price.text} ${kineoAdsPrice()}`]
    : [`Arcads specializes in AI actors: ${lowerFirst(noDot(f.actors.text))}. ${f.extra.text}`, kineoMakes, `Arcads pricing: ${f.price.text} ${f.free.text} ${kineoAdsPrice()}`]
  const facts = [
    { id: 'actors', label: 'AI actors', them: f.actors, kineo: kineoAvatar },
    { id: 'tools', label: 'Starting point & tools', them: f.input, kineo: kineoInput },
    { id: 'price', label: 'Entry price', them: f.price, kineo: kineoAdsPrice() },
    { id: 'free', label: 'Free option', them: f.free, kineo: ADS_SAMPLE_LIVE ? 'First ad free to try for free and trial accounts (one per account, within a daily limit).' : `No free ad right now; a one-time pass without a subscription is ${offer.passPrice}.` },
    { id: 'extra', label: c.id === 'creatify' ? 'Launching & insights' : 'Languages', them: f.extra, kineo: c.id === 'creatify' ? '✗ No direct publishing and ✗ no ad-performance analytics: download the ad and publish it yourself.' : 'Narration in the supported languages; check the script. Not automatic dubbing of an existing ad.' },
  ]
  const pickThem = c.id === 'creatify'
    ? ['You want a large library of AI actors, or custom avatars of yourself.', 'You want to launch ads and read their performance inside the same tool.', `You want a free plan to test first: ${noDot(f.free.text).replace(/^Free plan: /, '')}.`]
    : ['You want a talking AI actor, picked from a large library, to be the face of the ad.', 'You want your own AI avatar, or an actor that holds your product, shows your app or wears your clothes.', `You sell in many markets and need ${lowerFirst(noDot(f.extra.text))}.`]
  const faqs = [
    { question: `Is Kineo ${/^[aeiou]/i.test(f.name) ? 'an' : 'a'} ${f.name} alternative?`, answer: `For a different job. ${summary[0]} ${kineoMakes}` },
    { question: `How much does ${f.name} cost compared with Kineo?`, answer: `${f.name} (official page, read ${VS_NOVOS_REVIEWED_ISO}): ${f.price.text} Kineo: ${kineoAdsPrice()}` },
    { question: 'Does Kineo have AI actors or avatars?', answer: `${kineoAvatar} If a library of talking actors is the point, ${f.name} is built for it.` },
    { question: 'Can Kineo publish the ad or track its results?', answer: 'No. Download the finished ad and publish it yourself; Kineo does not connect to ad accounts or report ad performance, and it does not guarantee advertising results.' },
  ]
  return { name: f.name, reviewed: VS_NOVOS_REVIEWED_ISO, summary, facts, pickThem, faqs }
}

export function adsComparisonFaqSchema(c: AdsComparisonEntry) {
  const e = adsComparisonEnrichment(c)
  if (!e) return null
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: e.faqs.map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })),
  }
}

