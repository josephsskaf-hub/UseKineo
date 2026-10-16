// KINEO-GUIAS-IA-1610 — conteúdo das guias /guides/<slug> (texto em inglês do GPT de 16/10/2026, conferido no código).
//
// REGRA DA CASA (a mesma de lib/growth/adsStoreGuide.ts): nenhum número NOSSO é digitado aqui. Preço, créditos, segundos,
// formatos, línguas, motores, reembolso e amostra grátis são LIDOS das fontes que o produto usa para cobrar e montar.
// Os números de CONCORRENTE moram só aqui, cada um com a URL oficial de preço e a data da consulta (16/10/2026).
//
// O que o texto do GPT dizia e o código desmentiu (corrigido aqui; prova no relatório da tarefa KINEO-GUIAS-IA-1610):
//   · motores: "Seedance 1.5, Seedance 2.5, Kling 2.5, Kling 3, Veo 3.1 and MiniMax" → lista canônica VIDEO_ENGINE_LIST_COPY;
//   · "the free film trial is not a free Studio Ads render" → o Studio Ads tem amostra grátis própria (lib/ads/sample.ts);
//   · níveis do Studio Ads: os nomes diferem entre o modo simples e o completo do montador → a guia descreve sem nomear;
//   · 16 línguas: a lista sai de NARRATION_LANGUAGES; os motores de voz própria só falam en/pt/es (HOLLYWOOD_LANGUAGES);
//   · tradução automática, dublagem de vídeo enviado e clone de voz NÃO existem no fluxo de filme → a guia diz que não.
import { STARTER_MONTH, STARTER_CREDITS } from '@/lib/marketingPrice'
import { FREE_FILM_LABEL, GRANT_COUNTRY_CLAUSE, TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import { MONEY_BACK_GUARANTEE } from '@/lib/checkoutPricing'
import { NARRATION_LANGUAGES, HOLLYWOOD_LANGUAGES } from '@/lib/textLanguage'
import { VIDEO_ENGINE_LIST_COPY } from '@/lib/engineLaunch'
import { ADS_V2_FORMATS } from '@/lib/ads/v2ShotLists'
import { ADS_V2_TIER_IDS, adsV2Credits } from '@/lib/ads/v2Tiers'
import { ADS_V2_SCREEN_SECONDS } from '@/lib/ads/v2Screen'
import { ADS_SAMPLE_LIVE } from '@/lib/ads/sample'
import { buildProductSurfaceSignupHref } from '@/lib/growth/productSurfaceIntent'
import type { GuiaIaSlug } from '@/lib/seo/guiasIa1610Paths'

export type GuiaIaRow = { tool: string; price: string; workflow: string; source?: string; internal?: string }
export type GuiaIa = {
  slug: GuiaIaSlug
  /** 'film' → /studio (Seedance, o filme do teste grátis); 'ads' → /ads (Studio Ads); 'automate' → conversa de 15 min. */
  cta: 'film' | 'ads' | 'automate'
  title: string
  description: string
  h1: string
  answer: readonly string[]
  stepsHeading: string
  steps: readonly string[]
  afterSteps: readonly string[]
  compareHeading: string
  compareIntro: string
  compareColumn: string
  rows: readonly GuiaIaRow[]
  compareFootnote: string
  notBest: readonly string[]
  faqs: readonly { q: string; a: string }[]
  related: readonly { href: string; label: string }[]
  ctaLabel: string
  ctaNote: string
  closingHeading: string
  closingText: string
}

// ─── Fatos da Kineo (derivados) ──────────────────────────────────────────────────────────────────────────────────────
const FREE_FILM = `New accounts${GRANT_COUNTRY_CLAUSE} get ${TRIAL_GRANT_CREDITS_COPY} free credits, enough for one ${FREE_FILM_LABEL}. Trial films carry a watermark; any paid plan exports clean MP4s.`
const adCredits = ADS_V2_TIER_IDS.map((tier) => adsV2Credits(tier, ADS_V2_SCREEN_SECONDS))
const AD_CREDITS_RANGE = `${Math.min(...adCredits)}–${Math.max(...adCredits)}`
const AD_COST = `A ${ADS_V2_SCREEN_SECONDS}-second Studio Ads ad costs ${AD_CREDITS_RANGE} credits depending on the level you choose; Starter includes ${STARTER_CREDITS} credits a month.`
const FREE_AD = ADS_SAMPLE_LIVE
  ? `Free and trial accounts can make one free ${ADS_V2_SCREEN_SECONDS}-second Studio Ads sample (one per account, while the daily number of free samples lasts); more ads need a paid plan.`
  : 'Studio Ads is available on paid plans.'
const AD_FORMATS = ADS_V2_FORMATS.join(', ')
const LANG_NAMES = NARRATION_LANGUAGES.map((l) => l.name.replace(/\s*\(.*\)$/, ''))
const LANG_LIST = `${LANG_NAMES.slice(0, -1).join(', ')} and ${LANG_NAMES[LANG_NAMES.length - 1]}`
const OWN_VOICE_LANGS = HOLLYWOOD_LANGUAGES.map((code) => NARRATION_LANGUAGES.find((l) => l.code === code)?.name.replace(/\s*\(.*\)$/, '') ?? code)
const OWN_VOICE_LANG_LIST = `${OWN_VOICE_LANGS.slice(0, -1).join(', ')} and ${OWN_VOICE_LANGS[OWN_VOICE_LANGS.length - 1]}`

// ─── Concorrentes (preço público consultado em 16/10/2026 na página oficial de preços) ────────────────────────────────
const SRC = {
  runway: 'https://runwayml.com/pricing',
  creatify: 'https://creatify.ai/pricing',
  canva: 'https://www.canva.com/pricing/',
  capcut: 'https://www.capcut.com/pricing',
  predis: 'https://predis.ai/pricing/',
  heygen: 'https://www.heygen.com/pricing',
  elevenlabs: 'https://elevenlabs.io/pricing',
  descript: 'https://www.descript.com/pricing',
} as const
const R = {
  runway: { tool: 'Runway Standard', price: '$15/month, monthly', source: SRC.runway },
  creatify: { tool: 'Creatify Standard', price: '$12/month equivalent, annual plan shown', source: SRC.creatify },
  canva: { tool: 'Canva Pro', price: '$144/year per person', source: SRC.canva },
  canvaBusiness: { tool: 'Canva Business', price: '$250/year per person', source: SRC.canva },
  creatifyPro: { tool: 'Creatify Pro', price: '$44/month equivalent, annual plan shown', source: SRC.creatify },
  capcut: { tool: 'CapCut Pro', price: '$19.99/month in its official guide; varies by country and platform', source: SRC.capcut },
  predis: { tool: 'Predis.ai Core', price: '$230/year', source: SRC.predis },
  heygen: { tool: 'HeyGen Creator', price: '$29/month, monthly', source: SRC.heygen },
  elevenlabs: { tool: 'ElevenLabs Starter', price: '$6/month, regular price', source: SRC.elevenlabs },
  descriptHobby: { tool: 'Descript Hobbyist', price: '$24/person/month', source: SRC.descript },
  descriptBusiness: { tool: 'Descript Business', price: '$65/person/month', source: SRC.descript },
} as const
const kineoRow = (workflow: string): GuiaIaRow => ({ tool: 'Kineo Starter', price: `${STARTER_MONTH}, monthly`, workflow, internal: '/pricing' })

const REFUND_FAQ = { q: 'Is there a refund window?', a: `${MONEY_BACK_GUARANTEE} Renewals are not covered.` }
const ADS_ACCESS_FAQ = { q: 'Can I try the ad workflow for free?', a: `${FREE_AD} ${AD_COST}` }

const ADS_CTA = { ctaLabel: 'Try Studio Ads', ctaNote: FREE_AD }

// ─── Kineo Automate (serviço feito por nós) ──────────────────────────────────────────────────────────────────────────
// Números aprovados pelo fundador em 16/10/2026 (mensagem do coordenador da tarefa KINEO-GUIAS-IA-1610). Não existe página
// /automate nem preço em código: este bloco é a ÚNICA fonte destes números no site. Mudou a oferta → muda aqui.
// Proibido acrescentar: revisões além das edições abaixo, promessa de ROAS/vendas, publicação ou compra de mídia.
export const AUTOMATE = {
  price: 'US$790/month',
  adsPerMonth: 16,
  adsPerWeek: 4,
  seconds: 15,
  perAd: 'about $49 per ad',
  firstBatchBusinessDays: 3,
  edits: 'lines, end card, music and shot order',
  pilotPrice: 'US$490 one-time',
  pilot: 'covers 20 ads from up to 10 products in 3 formats, one A/B/C test set, and 5 ads in one extra language',
  contact: 'mailto:joseph@usekineo.com?subject=Kineo%20Automate%20%E2%80%94%2015-minute%20call',
} as const
const AUTOMATE_PACKAGE = `Package A is ${AUTOMATE.price}: ${AUTOMATE.adsPerMonth} ads a month (${AUTOMATE.adsPerWeek} a week, about ${AUTOMATE.seconds} seconds each), each delivered in ${AD_FORMATS}, plus one A/B/C test set a week, in one language (${AUTOMATE.perAd}).`
const AUTOMATE_PILOT = `A 14-day pilot costs ${AUTOMATE.pilotPrice}, credited toward the first month; it ${AUTOMATE.pilot}.`
const AUTOMATE_FAQ = {
  q: 'Can Kineo make the ads for me every week?',
  a: `Yes, through Kineo Automate, a done-for-you service. ${AUTOMATE_PACKAGE} You approve each ad through a private link; publishing and media buying stay with you.`,
}
const AUTOMATE_CTA = { ctaLabel: 'Book a 15-minute call', ctaNote: `${AUTOMATE_PILOT} Kineo does not promise sales or ad results.` }
const FILM_CTA = { ctaLabel: 'Try Kineo free', ctaNote: FREE_FILM }

export const GUIAS_IA: Record<GuiaIaSlug, GuiaIa> = {
  // ── Página 11 do GPT ─────────────────────────────────────────────────────────────────────────────────────────────
  'ai-product-video-accuracy': {
    slug: 'ai-product-video-accuracy', cta: 'ads', ...ADS_CTA,
    title: 'AI Product Video Accuracy: Keep Your Product Honest',
    description: 'Learn how to check AI product videos for accurate packaging, color and features. Compare tools without assuming perfect product fidelity.',
    h1: 'How to Keep AI Product Videos Accurate',
    answer: [
      'Use the actual product as your reference and judge an AI video against a written accuracy checklist. Kineo Studio Ads builds a product ad from your own photos, but no tool, Kineo included, guarantees perfect prompt adherence or product fidelity.',
      'Separate cosmetic problems from material misrepresentation. An unusual background may be acceptable; an extra button, an altered label or an invented product function changes what the buyer believes they are purchasing.',
    ],
    stepsHeading: 'Review a product video in Kineo',
    steps: [
      'List the details that must remain unchanged: product name, shape, color, packaging and verified features.',
      `Open Studio Ads and add clear photos of the real product or paste the product page link, then write a factual brief.`,
      'Review the proposed shots, on-screen wording and voice-over before rendering.',
      'Inspect the finished video against the original photos, pausing wherever important details appear.',
      'Reject or remake any shot that creates a misleading impression of the product.',
      'Check the final call to action against the destination page.',
    ],
    afterSteps: ['Keep the approved source images beside the video during review. Memory is a weak reference for small packaging or design changes.'],
    compareHeading: 'Compare approaches',
    compareIntro: 'Generation and editing tools carry different accuracy risks.',
    compareColumn: 'Approach to evaluate',
    rows: [kineoRow('Ads generated from your own product photos, reviewed before rendering'), { ...R.canva, workflow: 'Editing original assets' }, { ...R.capcut, workflow: 'Editing original footage' }, { ...R.runway, workflow: 'Generative production and editing' }],
    compareFootnote: 'This is not an accuracy benchmark, and no tool is ranked here.',
    notBest: ['Use real footage when an exact demonstration is essential. Choose conventional editing when you cannot accept any generative change to the product’s visible details.'],
    faqs: [
      { q: 'Which generator is the most accurate?', a: 'No controlled comparison is claimed here. Test each tool with the same product photos and the same pass-or-fail checklist.' },
      { q: 'Can a better prompt guarantee accuracy?', a: 'No. The result still needs inspection against the real product.' },
      { q: 'Should I generate text printed on packaging?', a: 'For critical wording, keep the real photo of the packaging or use a controlled text overlay instead of generated lettering.' },
      { q: 'What if a shot looks attractive but changes the product?', a: 'Do not use it as a factual product representation. Remake it or remove it.' },
      ADS_ACCESS_FAQ,
    ],
    related: [
      { href: '/ads/for/online-stores', label: 'Video ads for online stores' },
      { href: '/guides/ai-dropshipping-video-ads', label: 'Dropshipping video ads, step by step' },
      { href: '/pricing', label: 'Check current plans' },
    ],
    closingHeading: 'Test against your real product',
    closingText: 'Use non-sensitive photos of a product you sell, then judge the result with your own accuracy checklist.',
  },

  // ── Página 13 do GPT ─────────────────────────────────────────────────────────────────────────────────────────────
  'ai-dropshipping-video-ads': {
    slug: 'ai-dropshipping-video-ads', cta: 'ads', ...ADS_CTA,
    title: 'AI Video Ads for Dropshipping: Step by Step',
    description: 'Create a dropshipping video ad using authorized product assets and verified claims. Compare tools and follow a practical Kineo workflow.',
    h1: 'How to Create an AI Video Ad for a Dropshipping Product',
    answer: [
      'Build a dropshipping video ad from authorized product photos, verified features and a clear destination page. Kineo Studio Ads can produce the creative, but it cannot establish that a supplier’s product quality, shipping promise or performance claim is true.',
      'The product page and the video should describe the same offer. Avoid advertising a variant, delivery condition or feature that the buyer will not receive.',
    ],
    stepsHeading: 'Create the ad in Kineo',
    steps: [
      'Confirm that you have permission to use the supplier’s photos and branding.',
      'Verify the product variant, specifications, price and shipping information.',
      'Prepare a brief with one use case and one call to action.',
      'Open Studio Ads and paste the product page link (Shopify, Amazon, Etsy or another product page) or add the authorized photos. Check the name, photos and price it reads before continuing.',
      'Review the proposed shots and voice-over, then generate and compare the product shown with the real item.',
      'Check the destination page, download the ad and publish it through your own ad account.',
    ],
    afterSteps: [
      'A practical structure: show the product, explain a verified use, demonstrate only what you can support and invite the viewer to inspect the product page.',
      'If the link brings in missing or wrong information, switch to a manual brief and your own photos. Do not let missing information become an invented claim.',
    ],
    compareHeading: 'Compare alternatives',
    compareIntro: 'The price of creative software does not include product verification or advertising performance.',
    compareColumn: 'Relevant workflow',
    rows: [kineoRow('Ads from a product link or your own photos'), { ...R.creatify, workflow: 'Product-URL and ad workflows' }, { ...R.predis, workflow: 'Ecommerce content creation' }, { ...R.canva, workflow: 'Manual editing of your assets' }],
    compareFootnote: 'Entry prices buy different allowances; compare the credits or exports each plan includes.',
    notBest: ['If the ad depends on a real stress test, installation demonstration or customer experience, film the real thing. Do not generate a customer story from someone who never used the product.'],
    faqs: [
      { q: 'Can I use a supplier’s images automatically?', a: 'Use them only when you have permission. Reading a product link does not grant usage rights.' },
      { q: 'Can AI create customer reviews for the ad?', a: 'Do not present invented reviews or experiences as real.' },
      { q: 'Can I advertise the shipping times a supplier gives me?', a: 'Only after verifying that they apply to the destination and the current offer.' },
      { q: 'Will Kineo find a winning product?', a: 'No. Kineo makes the video; product selection and sales results are outside what it does.' },
      ADS_ACCESS_FAQ,
      AUTOMATE_FAQ,
    ],
    related: [
      { href: '/ads/for/online-stores', label: 'Video ads for online stores' },
      { href: '/guides/ai-product-video-accuracy', label: 'Keep AI product videos accurate' },
      { href: '/vs/creatify-alternative', label: 'Creatify alternative for narrated ads' },
    ],
    closingHeading: 'Start with an accurate brief',
    closingText: 'Pick one product you have the rights to advertise and make a first ad from its real photos.',
  },

  // ── Página 15 do GPT ─────────────────────────────────────────────────────────────────────────────────────────────
  'ai-personal-care-product-ads': {
    slug: 'ai-personal-care-product-ads', cta: 'ads', ...ADS_CTA,
    title: 'AI Video Ads for Small Personal Care Brands',
    description: 'Make personal care product ads from verified facts and real assets. Compare AI tools and avoid invented reviews or results.',
    h1: 'How to Make AI Video Ads for a Personal Care Brand',
    answer: [
      'Kineo Studio Ads can turn a personal care product’s photos and approved information into a short video ad with music, a voice-over and your logo. Keep the message grounded in what the product is and how it is used, without inventing customer experiences or treatment results.',
      'A small brand can start with a clear product introduction. Packaging, texture and instructions communicate more honestly than an unsupported before-and-after story.',
    ],
    stepsHeading: 'Build the ad in Kineo',
    steps: [
      'Choose the actual product, packaging and variant to feature.',
      'Collect authorized photos and the exact claims your business has approved.',
      'Write a brief focused on one use occasion or one verified product characteristic.',
      'Open Studio Ads, add the photos and your logo, and review the proposed voice-over and shots.',
      'Inspect the rendered packaging, product texture and any generated people.',
      'Remove wording or imagery that implies an outcome you cannot substantiate.',
    ],
    afterSteps: ['Illustrative brief: “Introduce this moisturizer using the supplied packaging photos. Mention only the verified product description and approved application instructions. End with the product page.”'],
    compareHeading: 'Compare alternatives',
    compareIntro: 'An AI presenter is not evidence that a real person used the product.',
    compareColumn: 'Relevant approach',
    rows: [kineoRow('Ads from your product photos, optional AI presenter'), { ...R.heygen, workflow: 'Avatar-led presentation' }, { ...R.creatify, workflow: 'AI ad creation' }, { ...R.canva, workflow: 'Editing supplied brand assets' }],
    compareFootnote: 'Entry prices buy different allowances and are not equal production packages.',
    notBest: [
      'Use genuine recordings when the ad depends on texture, application technique or a documented customer experience.',
      'If your message needs clinical evidence or specialist review, complete that review before producing the creative.',
    ],
    faqs: [
      { q: 'Can I make an ad without appearing on camera?', a: 'Yes. The ad is built from product photos and does not require you on camera.' },
      { q: 'Can AI create a customer review for the ad?', a: 'Do not present an invented experience as a real customer’s.' },
      { q: 'Should I generate before-and-after results?', a: 'No. Do not use fabricated transformations as product evidence.' },
      { q: 'Can I use an AI presenter?', a: 'Studio Ads offers an optional AI presenter for vertical 9:16 ads that holds your product and speaks the voice-over. Label it as AI and never imply a genuine customer endorsement.' },
      ADS_ACCESS_FAQ,
      AUTOMATE_FAQ,
    ],
    related: [
      { href: '/ads/for/online-stores', label: 'Video ads for online stores' },
      { href: '/ads/for/salons-and-beauty', label: 'Video ads for salons and beauty services' },
      { href: '/guides/ai-product-video-accuracy', label: 'Keep AI product videos accurate' },
    ],
    closingHeading: 'Start with the product facts',
    closingText: 'Build your first brief using only information your business can stand behind.',
  },

  // ── Página 7 do GPT ──────────────────────────────────────────────────────────────────────────────────────────────
  'ai-clothing-brand-video': {
    slug: 'ai-clothing-brand-video', cta: 'ads', ...ADS_CTA,
    title: 'AI Video Ads for Clothing Brands: What to Check',
    description: 'Create clothing-brand video ads from real assets. Compare tools and learn how to review garment details, fit and generated motion.',
    h1: 'How to Make AI Video Ads for a Clothing Brand',
    answer: [
      'Kineo Studio Ads can turn supplied clothing photos into a short promotional video. Review garment color, construction, print and shape carefully, because attractive generated movement is not proof of accurate fit or fabric behavior.',
      'Choose the purpose before choosing the effect. A collection announcement needs different evidence from a demonstration of stretch, sizing or waterproofing.',
    ],
    stepsHeading: 'Create the ad in Kineo',
    steps: [
      'Select authorized photos of the actual product and the correct variant.',
      'Write a brief naming the intended customer, verified product details and destination page.',
      `Open Studio Ads, add the photos and your logo, and choose a level and a format (${AD_FORMATS}).`,
      'Review the proposed shots, on-screen wording and voice-over.',
      'Generate the ad and compare it with the original photos.',
      'Reject any version that changes the garment or implies an unverified product characteristic.',
    ],
    afterSteps: ['For a collection announcement, a useful brief might be: “Introduce this collection using the supplied photos. Mention only the verified fabric and available colors. End with the collection page.”'],
    compareHeading: 'Compare alternatives',
    compareIntro: 'Check the output and the allowance for your specific garment before choosing.',
    compareColumn: 'Relevant approach',
    rows: [kineoRow('Ads from product photos'), { ...R.canva, workflow: 'Editing original brand assets' }, { ...R.creatify, workflow: 'AI product-ad creation' }, { ...R.runway, workflow: 'Generative creative workflows' }],
    compareFootnote: 'Entry prices buy different allowances and are not equal production packages.',
    notBest: ['Use real product footage when buyers need to judge fit, fabric movement, sizing or construction. A real model demonstration may be essential; a generated sequence should not imply a fit test that never happened.'],
    faqs: [
      { q: 'Do I need to appear on camera?', a: 'No. The ad is built around your product photos.' },
      { q: 'Can AI change the appearance of clothing?', a: 'Yes, generated motion can alter details. Treat it as a review risk and compare the result with the real garment.' },
      { q: 'Is this a virtual try-on service?', a: 'No. Studio Ads animates your product photos into an ad; it does not show how a garment fits a specific body.' },
      { q: 'Can I start from my store’s product page?', a: 'Yes. Studio Ads can read the name, photos and price from a product link (Shopify, Amazon, Etsy or another product page). Check what it imported before generating.' },
      ADS_ACCESS_FAQ,
      AUTOMATE_FAQ,
    ],
    related: [
      { href: '/ads/for/online-stores', label: 'Video ads for online stores' },
      { href: '/guides/ai-product-video-accuracy', label: 'Keep AI product videos accurate' },
      { href: '/pricing', label: 'Check current plans' },
    ],
    closingHeading: 'Test your visual direction',
    closingText: 'Start with one garment and authorized photos, then judge every shot against the real piece.',
  },

  // ── Página 3 do GPT ──────────────────────────────────────────────────────────────────────────────────────────────
  'ai-tech-product-ads': {
    slug: 'ai-tech-product-ads', cta: 'film', ...FILM_CTA,
    title: 'AI Video Ads for Tech Products: A Practical Guide',
    description: 'Plan a cinematic tech-product ad without inventing features. Compare AI video tools and learn when real product footage works better.',
    h1: 'How to Make an AI Video Ad for a Technology Product',
    answer: [
      'Kineo can create a narrated promotional film around a technology product’s verified benefits. Generated scenes should illustrate the story; they should not be presented as proof of features, interfaces or physical behavior the product does not have.',
      'Start by separating what you can demonstrate from what you want to communicate. A real screen recording shows how software works; an illustrative scene shows the situation in which someone would use it.',
    ],
    stepsHeading: 'Build the ad in Kineo',
    steps: [
      'List the product’s verified features, intended buyer and destination page.',
      'Write a short narration with one problem, one relevant benefit and one next step.',
      'For a conceptual narrated film, open the Studio, paste the approved script and choose “Use my script as is”.',
      `Choose a narration language, a format and an engine (the Studio offers ${VIDEO_ENGINE_LIST_COPY}), then review the credit cost shown before generating.`,
      'Check every generated scene against the product facts.',
      'If accurate product photography matters more than a concept, use Studio Ads with authorized product photos instead and review the proposed shots before rendering.',
    ],
    afterSteps: ['Illustrative brief: “Introduce a scheduling app to a busy shop owner. Explain the verified booking feature. End by inviting viewers to see the actual product demo.”'],
    compareHeading: 'Compare alternatives',
    compareIntro: 'Model access and generation allowances differ between these plans.',
    compareColumn: 'Relevant workflow',
    rows: [kineoRow('Narrated films and photo-based ads'), { ...R.runway, workflow: 'Creative generation and editing' }, { ...R.creatify, workflow: 'Product-ad creation' }, { ...R.canva, workflow: 'Editing supplied product assets' }],
    compareFootnote: 'Entry prices buy different allowances and are not equal production packages.',
    notBest: ['Choose real capture and editing when the buying decision depends on exact software interactions, engineering behavior or measurable product performance. Do not substitute an attractive generated sequence for a genuine demonstration.'],
    faqs: [
      { q: 'Can AI invent my software interface?', a: 'It can produce imagery, but invented interface details must not be represented as the real product.' },
      { q: 'Which engine is best for my ad?', a: 'No universal winner is claimed. Compare outputs from the same brief; costs differ by engine and duration and are shown before you generate.' },
      { q: 'Do I need an actor?', a: 'No. A narrated concept film or a photo-based product ad does not need anyone on camera.' },
      { q: 'Can I include my logo?', a: 'Studio Ads adds your logo on the closing card. Inspect the placement in the finished ad.' },
      { q: 'Will the ad increase sales?', a: 'That requires a real campaign test; this guide makes no performance promise.' },
      REFUND_FAQ,
    ],
    related: [
      { href: '/ai-video-generator', label: 'Compare the video engines' },
      { href: '/guides/ai-product-video-accuracy', label: 'Keep AI product videos accurate' },
      { href: '/pricing', label: 'Check current plans' },
    ],
    closingHeading: 'Test the visual direction',
    closingText: 'Make a short test film from an approved script before committing to a production workflow.',
  },

  // ── Página 19 do GPT ─────────────────────────────────────────────────────────────────────────────────────────────
  'elevenlabs-alternatives-narrated-video': {
    slug: 'elevenlabs-alternatives-narrated-video', cta: 'film', ...FILM_CTA,
    title: 'ElevenLabs Alternatives for Narrated AI Videos',
    description: 'Compare ElevenLabs, Kineo, Descript and HeyGen by the output you need: voice, editing, avatars or a finished narrated video.',
    h1: 'Is Kineo an Alternative to ElevenLabs?',
    answer: [
      'Kineo is an alternative workflow when your goal is a finished narrated short video rather than a voice track you still have to edit. It is not a cheaper or more capable replacement for every ElevenLabs feature.',
      'Kineo also has a separate voice tool that includes ElevenLabs v3 alongside MiniMax, Dia and Kokoro, charged in credits per 1,000 characters. The first question is what you need to deliver: a narration track, an edited recording, a presenter video or a new faceless film.',
    ],
    stepsHeading: 'Test Kineo as a complete-video workflow',
    steps: [
      'Choose a script you would otherwise narrate in a separate voice tool.',
      'Open the Studio, paste the approved wording and choose “Use my script as is” so it is narrated word for word.',
      `Select a narration language, a format and an engine; the Studio offers ${VIDEO_ENGINE_LIST_COPY}.`,
      'Review the credit cost shown, then generate.',
      'Evaluate the complete result: voice, visuals, captions and the corrections still required.',
    ],
    afterSteps: ['Compare the work needed to reach an approved video. Do not judge the whole workflow by the quality of one spoken sentence.'],
    compareHeading: 'Compare alternatives',
    compareIntro: 'ElevenLabs also offers image and video features; it is not an audio-only product.',
    compareColumn: 'Main reason to evaluate it',
    rows: [kineoRow('Finished narrated films, plus a separate voice tool'), { ...R.elevenlabs, workflow: 'Voice tools and broader creative features' }, { ...R.descriptHobby, workflow: 'Text-based editing and AI speech' }, { ...R.heygen, workflow: 'Avatar-led videos' }],
    compareFootnote: 'Credits and characters are counted differently by each vendor and cannot be compared one to one.',
    notBest: ['If you need a cloned voice, detailed speech controls, a voice API or audio-only delivery at volume, a dedicated voice platform is the more direct choice. Voice cloning is not part of Kineo’s film workflow.'],
    faqs: [
      { q: 'Is Kineo cheaper than ElevenLabs Starter?', a: `No. Kineo Starter is ${STARTER_MONTH} and ElevenLabs Starter was $6/month at its regular price on October 16, 2026; the included workflows differ.` },
      { q: 'Does Kineo offer voice cloning?', a: 'Not in the film workflow described here. Use a dedicated voice platform if a cloned voice is a requirement.' },
      { q: 'Can Kineo create visuals as well as narration?', a: 'Yes. The film workflow delivers a narrated video with visuals and captions.' },
      { q: 'Can I generate only an audio file in Kineo?', a: 'Yes. Kineo’s voice tool generates standalone speech with ElevenLabs v3, MiniMax, Dia or Kokoro, saved to your library for download.' },
      { q: 'Which platform sounds more natural?', a: 'No controlled voice-quality comparison is claimed here. Test the same approved passage in each tool.' },
    ],
    related: [
      { href: '/ai-voice-generator', label: 'Kineo voice generator' },
      { href: '/guides/multilingual-video-narration', label: 'Multilingual video narration' },
      { href: '/pricing', label: 'Check current plans' },
    ],
    closingHeading: 'Compare the output you need',
    closingText: 'Use the same approved passage in each tool and judge the complete deliverable.',
  },

  // ── Página 18 do GPT ─────────────────────────────────────────────────────────────────────────────────────────────
  'multilingual-video-narration': {
    slug: 'multilingual-video-narration', cta: 'film', ...FILM_CTA,
    title: 'Multilingual Video Narration: A Practical AI Workflow',
    description: 'Create new narrated videos in supported languages. Compare Kineo with dubbing and avatar tools, and learn what needs human review.',
    h1: 'Should You Use AI Narration or Video Dubbing?',
    answer: [
      `Use multilingual narration when you are creating a new video from an approved script; use a dubbing tool when you need to translate the speech in footage you already have. Kineo narrates in ${NARRATION_LANGUAGES.length} languages, but it does not translate a pasted script or dub an uploaded video.`,
      'For a course preview or a social explainer, a separately reviewed script in each language is a practical starting point. Keep the same objective while letting the wording and pacing suit the language.',
    ],
    stepsHeading: 'Create a language version in Kineo',
    steps: [
      'Choose a short lesson or promotional message with a clear objective.',
      'Prepare an approved script in the target language, or start from an idea and let Kineo write the narration in that language.',
      'Have a competent speaker review terminology, names and the call to action.',
      'Open the Studio, select the matching narration language and paste the script with “Use my script as is”; a pasted script is narrated as written, not translated.',
      `Choose the format and engine and check the credit cost shown. Engines with their own built-in voice currently narrate in ${OWN_VOICE_LANG_LIST} only.`,
      'Review narration, captions and meaning before publishing each language version.',
    ],
    afterSteps: [`Narration languages available today: ${LANG_LIST}.`, 'Repeat the review for each language. A correct source script does not make every translated version correct.'],
    compareHeading: 'Compare alternatives',
    compareIntro: 'Check each plan’s language support and usage allowance.',
    compareColumn: 'Workflow to evaluate',
    rows: [kineoRow('New narrated short videos'), { ...R.elevenlabs, workflow: 'Speech and dubbing tools' }, { ...R.heygen, workflow: 'Avatars and translation workflows' }, { ...R.descriptBusiness, workflow: 'Editing with dubbing and translation' }],
    compareFootnote: 'Entry prices buy different allowances and are not equal production packages.',
    notBest: ['If you need an existing instructor video dubbed while preserving the original performance, use a dedicated dubbing product. Full-course localization and translated lip-sync of uploaded videos are not Kineo features.'],
    faqs: [
      { q: 'Does Kineo automatically translate my script?', a: 'No. A pasted script is narrated as written. If you start from an idea instead, the narration is written directly in the language you select.' },
      { q: `Which ${NARRATION_LANGUAGES.length} languages are available?`, a: `${LANG_LIST}. Engines with their own built-in voice currently support ${OWN_VOICE_LANG_LIST}.` },
      { q: 'Can I dub an existing lecture in Kineo?', a: 'No. Kineo creates new narrated videos; it does not dub uploaded footage.' },
      { q: 'Should a human review each version?', a: 'Yes, particularly terminology, meaning and pronunciation.' },
      { q: 'Will the same video length work in every language?', a: 'Do not assume identical spoken timing. Review each version.' },
    ],
    related: [
      { href: '/ai-video-generator/for/spanish', label: 'AI video generator in Spanish' },
      { href: '/guides/elevenlabs-alternatives-narrated-video', label: 'ElevenLabs alternatives for narrated videos' },
      { href: '/pricing', label: 'Check current plans' },
    ],
    closingHeading: 'Test one language first',
    closingText: 'Create a short test film from a passage your reviewer has already approved.',
  },

  // ── Página 14 do GPT (Automate: números aprovados pelo fundador em 16/10) ───────────────────────────────────────────
  'weekly-video-ads-approval': {
    slug: 'weekly-video-ads-approval', cta: 'automate', ...AUTOMATE_CTA,
    title: 'Weekly Video Ads with Approval: Kineo Automate',
    description: 'Plan weekly business video ads with private-link approval. Compare Kineo Automate with software and managed-production alternatives.',
    h1: 'How to Keep Weekly Video Ads Moving Without Losing Approval',
    answer: [
      `Kineo Automate is a done-for-you service for weekly product video ads. ${AUTOMATE_PACKAGE} You approve every ad through a private link with no login, and publishing and media buying stay with you.`,
      'A useful weekly process gives each video a distinct job. Rotate the buyer’s question, the product use case or the verified offer instead of changing only colors and background music.',
    ],
    stepsHeading: 'How the Kineo Automate workflow runs',
    steps: [
      'Book a 15-minute call and share the business brief: audience, products, approved claims, brand assets and destination links.',
      `Agree on the month’s content queue: ${AUTOMATE.adsPerMonth} ads, ${AUTOMATE.adsPerWeek} a week, each answering a different buyer question.`,
      `Receive the first batch within ${AUTOMATE.firstBatchBusinessDays} business days and review each ad through the private approval link, with no login.`,
      'Check facts, product appearance, pronunciation and the call to action before approving.',
      `Request the edits included after delivery: ${AUTOMATE.edits}. A new voice-over counts as a new ad.`,
      'Download the approved ads and publish them in your own ad accounts. Approval does not publish anything.',
    ],
    afterSteps: [
      AUTOMATE_PILOT,
      'An illustrative weekly sequence could cover a product introduction, a genuine use case and an answer to a common buying question. It is a planning example, not a promised result.',
    ],
    compareHeading: 'Compare alternatives',
    compareIntro: 'Software subscriptions are not equivalent to a managed production service.',
    compareColumn: 'Operating model',
    rows: [
      { tool: 'Kineo Automate, package A', price: `${AUTOMATE.price}`, workflow: 'Done-for-you weekly ads with private-link approval' },
      kineoRow('Make the ads yourself in Studio Ads'),
      { ...R.creatifyPro, workflow: 'Self-service ad software' },
      { ...R.predis, workflow: 'Content software; confirm approval-plan availability' },
      { ...R.canvaBusiness, workflow: 'In-house creation and approvals' },
    ],
    compareFootnote: 'Creatify also offers a separate Studio service with a sales-led quote.',
    notBest: [
      'If you want direct control of every edit, self-service software fits better, including Kineo Studio Ads on any paid plan.',
      'If you need media buying, campaign management or a sales guarantee, Automate does not include them; compare an agency that does.',
    ],
    faqs: [
      { q: 'Is Automate the Starter subscription?', a: `No. Starter (${STARTER_MONTH}) is self-service: you make the ads yourself. Automate package A is ${AUTOMATE.price}, made for you.` },
      { q: 'How many ads are included each week?', a: AUTOMATE_PACKAGE },
      { q: 'What edits are included?', a: `After delivery: ${AUTOMATE.edits}. A new voice-over counts as a new ad.` },
      { q: 'Does approval automatically publish the ad?', a: 'No. Approval and publication are separate; publishing and media buying stay with you.' },
      { q: 'Is approval by link unique to Kineo?', a: 'No. Other products also provide approval workflows.' },
      { q: 'Is there a trial?', a: AUTOMATE_PILOT },
      { q: 'Do you promise a return on ad spend?', a: 'No. Kineo delivers the creative; results depend on your offer, audience and campaign.' },
    ],
    related: [
      { href: '/business-video-ads', label: 'Business video ads: make or order' },
      { href: '/ads/for/online-stores', label: 'Video ads for online stores' },
      { href: '/guides/ai-product-video-accuracy', label: 'Keep AI product videos accurate' },
    ],
    closingHeading: 'Talk it through in 15 minutes',
    closingText: 'Bring one product and its approved claims; we will tell you whether the weekly service or self-service Studio Ads fits better.',
  },
}

export const GUIAS_IA_LIST: readonly GuiaIa[] = Object.values(GUIAS_IA)

/** CTA de cada guia: padrão de utm da casa para SEO (buildProductSurfaceSignupHref / adsSegmentCta) com origem `guide`. */
export function guiaIaCtaHref(guide: GuiaIa): string {
  if (guide.cta === 'automate') return AUTOMATE.contact // sem /automate nem agenda no repo: e-mail comercial (fundador 16/10)
  if (guide.cta === 'ads') {
    const q = new URLSearchParams({ utm_source: 'guide', utm_medium: 'organic', utm_campaign: guide.slug, intent_campaign: guide.slug, go: 'maker' })
    return `/ads?${q.toString()}`
  }
  return buildProductSurfaceSignupHref({ surface: 'seedance', campaign: guide.slug, utmSource: 'guide' })
}
