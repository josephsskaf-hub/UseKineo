// KINEO-VS-NOVOS-1610 — as comparações /vs dos 5 nomes que o ChatGPT (chat sem memória, teste do fundador 15/10/2026) cita
// e a Kineo não: Google Flow, Dreamina e CapCut (Shorts) · Creatify e Arcads (anúncio de produto).
//
// POR QUÊ: o canal que paga é o ChatGPT de país rico; quem pergunta "X alternative" / "X vs Kineo" hoje não acha a Kineo.
// Nada de molde novo: Flow e Dreamina entram no molde das irmãs de 13/10 (CitationAnswerPage + VsAlternativeComparison,
// URL /vs/<x>-alternatives-<ângulo>); CapCut já tinha página (13/10) e só ganha fatos novos; Creatify já tinha página no
// molde do Ads (AdsComparisonPage, URL /vs/<x>-alternative) e Arcads nasce nele.
//
// ESTE MÓDULO É PURO (sem import), como lib/seo/vsAlternatives1310.ts: sitemap, llms.txt e páginas leem daqui. Os fatos de
// concorrente moram SÓ aqui, cada um com o comentário `// fonte: <URL> (lido em <data>)` logo acima e a MESMA URL no campo
// `url` — o guardião scripts/test-vs-novos-1610.mjs reprova fato sem fonte, fonte divergente e número de concorrente
// digitado fora deste arquivo. Preço que a página oficial não mostra em USD (Flow, Dreamina, CapCut: a página abre na moeda
// da região do visitante) ou não mostra de jeito nenhum (Arcads) fica como "not published" — nada de número de terceiros.
// Preço/crédito da Kineo NUNCA entra aqui: vem de citationAnswers.ts / buyCreatorOffer.ts / adsSegmentPresentation.ts.

export const VS_NOVOS_MARK = 'KINEO-VS-NOVOS-1610'
/** Dia em que os fatos destes 5 concorrentes foram lidos nas páginas oficiais (o "Reviewed" e o lastmod do sitemap). */
export const VS_NOVOS_REVIEWED_ISO = '2026-10-15'

export type VsNovosSourcedFact = { text: string; label: string; url: string; checkedOn: string }

// ─── Shorts (molde das irmãs de 13/10) ───────────────────────────────────────────────────────────────────────────────
export type VsNovoId = 'flow' | 'dreamina'

export const VS_NOVOS_PAGES: Record<VsNovoId, { path: string; label: string }> = {
  flow: { path: '/vs/google-flow-alternatives-finished-shorts', label: 'Google Flow alternatives for finished Shorts' },
  dreamina: { path: '/vs/dreamina-alternatives-narrated-shorts', label: 'Dreamina alternatives for narrated Shorts' },
}
export const VS_NOVOS_IDS = Object.keys(VS_NOVOS_PAGES) as VsNovoId[]
export const VS_NOVOS_LINKS = VS_NOVOS_IDS.map((id) => VS_NOVOS_PAGES[id])

export type VsNovoCompetitor = {
  name: string
  start: VsNovosSourcedFact
  output: VsNovosSourcedFact
  /** Preço de entrada mensal em USD — ou a frase honesta de por que não há número. */
  price: VsNovosSourcedFact
  free: VsNovosSourcedFact
}

export const VS_NOVOS_COMPETITORS: Record<VsNovoId, VsNovoCompetitor> = {
  flow: {
    name: 'Google Flow',
    // fonte: https://support.google.com/flow/answer/16526234?hl=en (lido em 2026-10-15)
    start: { text: 'A prompt per shot; each generation is a Veo 3.1 clip of 4, 6 or 8 seconds that you can extend.', label: 'Flow credits help page', url: 'https://support.google.com/flow/answer/16526234?hl=en', checkedOn: '2026-10-15' },
    // fonte: https://support.google.com/flow/answer/16526234?hl=en (lido em 2026-10-15)
    output: { text: 'Generated video clips and extends, priced in Flow credits per generation (Veo 3.1 Fast: 20 credits; Quality: 100).', label: 'Flow credits help page', url: 'https://support.google.com/flow/answer/16526234?hl=en', checkedOn: '2026-10-15' },
    // fonte: https://one.google.com/about/google-ai-plans/ (lido em 2026-10-15)
    price: { text: 'Bundled with Google AI Plus, Pro and Ultra (200, 1,000 and 10,000 or 25,000 Flow credits a month). The plans page showed no USD price in our region, so no figure is quoted here.', label: 'Google AI plans page', url: 'https://one.google.com/about/google-ai-plans/', checkedOn: '2026-10-15' },
    // fonte: https://support.google.com/flow/answer/16526234?hl=en (lido em 2026-10-15)
    free: { text: 'Without a subscription: 50 Flow credits a day to try it; unused daily credits do not roll over.', label: 'Flow credits help page', url: 'https://support.google.com/flow/answer/16526234?hl=en', checkedOn: '2026-10-15' },
  },
  dreamina: {
    name: 'Dreamina',
    // fonte: https://dreamina.capcut.com/pricing/dreamina-price (lido em 2026-10-15)
    start: { text: 'A text prompt or an image: text to video, image to video, talking avatars and image generation.', label: 'Pricing page', url: 'https://dreamina.capcut.com/pricing/dreamina-price', checkedOn: '2026-10-15' },
    // fonte: https://dreamina.capcut.com/pricing/dreamina-price (lido em 2026-10-15)
    output: { text: 'Generated clips (plans are counted in 10-second videos) on models such as Seedance 2.5, Seedance 2.0, Veo 3.1 and Sora 2.', label: 'Pricing page', url: 'https://dreamina.capcut.com/pricing/dreamina-price', checkedOn: '2026-10-15' },
    // fonte: https://dreamina.capcut.com/pricing/dreamina-price (lido em 2026-10-15)
    price: { text: 'Shown in the visitor’s local currency with first-month promotions; no recurring USD monthly price was shown to us, so none is quoted here.', label: 'Pricing page', url: 'https://dreamina.capcut.com/pricing/dreamina-price', checkedOn: '2026-10-15' },
    // fonte: https://dreamina.capcut.com/pricing/dreamina-price (lido em 2026-10-15)
    free: { text: 'A free option with available credits; removing the Dreamina watermark in downloads is listed as a paid-plan benefit.', label: 'Pricing page', url: 'https://dreamina.capcut.com/pricing/dreamina-price', checkedOn: '2026-10-15' },
  },
}

/** Fatos novos da CapCut (a página de 13/10 continua com os dela; estes entram como linhas a mais na mesma tabela). */
export const VS_NOVOS_CAPCUT_EXTRA: { aiVideo: VsNovosSourcedFact; editor: VsNovosSourcedFact } = {
  // fonte: https://www.capcut.com/pricing (lido em 2026-10-15)
  aiVideo: { text: 'An AI video maker (“turn text into a video and choose its visual style”); the paid Pro plan adds Seedance 2.0 Mini generation with a monthly seconds allowance.', label: 'Pricing page', url: 'https://www.capcut.com/pricing', checkedOn: '2026-10-15' },
  // fonte: https://www.capcut.com/pricing (lido em 2026-10-15)
  editor: { text: 'A full editor around it: templates, captions, dubbing, AI voice, upscaling and long-video-to-shorts tools.', label: 'Pricing page', url: 'https://www.capcut.com/pricing', checkedOn: '2026-10-15' },
}

// ─── Anúncio de produto (molde do Ads: AdsComparisonPage) ────────────────────────────────────────────────────────────
export type AdsNovoId = 'creatify' | 'arcads'
export type AdsNovoFacts = {
  name: string
  officialUrl: string
  actors: VsNovosSourcedFact
  input: VsNovosSourcedFact
  price: VsNovosSourcedFact
  free: VsNovosSourcedFact
  extra: VsNovosSourcedFact
}

export const ADS_NOVOS_FACTS: Record<AdsNovoId, AdsNovoFacts> = {
  creatify: {
    name: 'Creatify',
    officialUrl: 'https://creatify.ai/pricing',
    // fonte: https://creatify.ai/pricing (lido em 2026-10-15)
    actors: { text: '300 realistic AI actors on Standard; 1,500 AI actors plus 3 custom avatars on Pro and Max.', label: 'Pricing page', url: 'https://creatify.ai/pricing', checkedOn: '2026-10-15' },
    // fonte: https://creatify.ai/pricing (lido em 2026-10-15)
    input: { text: 'URL to Video, AI Avatar, Ad Clone and image ads are listed among its creation tools.', label: 'Pricing page', url: 'https://creatify.ai/pricing', checkedOn: '2026-10-15' },
    // fonte: https://creatify.ai/pricing (lido em 2026-10-15)
    price: { text: 'Standard: USD 15/month for 55 credits a month (USD 12/month shown with the annual-plan discount).', label: 'Pricing page', url: 'https://creatify.ai/pricing', checkedOn: '2026-10-15' },
    // fonte: https://creatify.ai/pricing (lido em 2026-10-15)
    free: { text: 'Free plan: 10 monthly credits, up to 2 video ads; exports include a watermark.', label: 'Pricing page', url: 'https://creatify.ai/pricing', checkedOn: '2026-10-15' },
    // fonte: https://creatify.ai/pricing (lido em 2026-10-15)
    extra: { text: 'Ad Insights, an Ad Launcher and an AI Performance Agent for Meta, TikTok and AppLovin appear in its plan comparison.', label: 'Pricing page', url: 'https://creatify.ai/pricing', checkedOn: '2026-10-15' },
  },
  arcads: {
    name: 'Arcads',
    officialUrl: 'https://www.arcads.ai/',
    // fonte: https://www.arcads.ai/ (lido em 2026-10-15)
    actors: { text: 'A library of 1,000+ AI actors, or your own AI avatar; actors can hold your product, show your app and wear your clothes.', label: 'Official site', url: 'https://www.arcads.ai/', checkedOn: '2026-10-15' },
    // fonte: https://www.arcads.ai/ (lido em 2026-10-15)
    input: { text: 'Talking AI actors, AI video models (such as Seedance and Kling) and tools to edit, translate, extend, subtitle and swap actors.', label: 'Official site', url: 'https://www.arcads.ai/', checkedOn: '2026-10-15' },
    // fonte: https://www.arcads.ai/ (lido em 2026-10-15)
    price: { text: 'Not published: the official site shows no price list (arcads.ai/pricing returned not found when we checked).', label: 'Official site', url: 'https://www.arcads.ai/', checkedOn: '2026-10-15' },
    // fonte: https://www.arcads.ai/ (lido em 2026-10-15)
    free: { text: 'The site says a free trial is available; its terms are not stated on the page.', label: 'Official site', url: 'https://www.arcads.ai/', checkedOn: '2026-10-15' },
    // fonte: https://www.arcads.ai/ (lido em 2026-10-15)
    extra: { text: 'Translation in more than 30 languages.', label: 'Official site', url: 'https://www.arcads.ai/', checkedOn: '2026-10-15' },
  },
}

/** O ângulo honesto de cada página nova, numa frase (linha do /llms.txt). Sem preço: o número mora na página, com fonte. */
const VS_NOVOS_ANGLE: Record<VsNovoId, string> = {
  flow: 'Google Flow generates Veo clips shot by shot for you to assemble; Kineo turns one idea into a finished narrated vertical film with captions.',
  dreamina: 'Dreamina generates clips and images on Seedance and other models; Kineo delivers a finished narrated vertical film with captions and music from one idea.',
}
const ADS_NOVOS_ANGLE: Record<AdsNovoId, string> = {
  creatify: 'Creatify is an AI-actor ad platform with ad launching and analytics; Kineo Studio Ads assembles a narrated ad from your link, photos and logo.',
  arcads: 'Arcads specializes in AI actors (1,000+) speaking your script; Kineo Studio Ads assembles a narrated ad from your link, photos and logo.',
}
export const ADS_NOVOS_PATHS: Record<AdsNovoId, string> = { creatify: '/vs/creatify-alternative', arcads: '/vs/arcads-alternative' }

/** As linhas do /llms.txt (seção de páginas-chave), no mesmo formato das irmãs de 13/10. As do Ads só com o Studio Ads
 *  público (o llms.txt cala o Studio Ads quando o passe está desligado — test-ads-aeo-2026-09-24, regra 2b). */
export function vsNovosLlmsLines(base: string, includeAds: boolean): string {
  const shorts = VS_NOVOS_IDS.map((id) => `- [${VS_NOVOS_PAGES[id].label}](${base}${VS_NOVOS_PAGES[id].path}): ${VS_NOVOS_ANGLE[id]} ${VS_NOVOS_COMPETITORS[id].name} facts are read on its own pages, dated ${VS_NOVOS_REVIEWED_ISO} and linked.`)
  const ads = (Object.keys(ADS_NOVOS_PATHS) as AdsNovoId[]).map((id) => `- [${ADS_NOVOS_FACTS[id].name} alternative for narrated video ads](${base}${ADS_NOVOS_PATHS[id]}): ${ADS_NOVOS_ANGLE[id]} ${ADS_NOVOS_FACTS[id].name} facts are read on its official site, dated ${VS_NOVOS_REVIEWED_ISO} and linked.`)
  return [...shorts, ...(includeAds ? ads : [])].join('\n')
}
