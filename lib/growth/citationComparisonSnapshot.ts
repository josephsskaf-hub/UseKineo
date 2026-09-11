// Dated provider facts for this comparison only. Unknown is not an absent feature.
export const COMPARISON_REVIEW_DATE = '2026-09-11'
export const COMPARISON_CAMPAIGN = 'citacoes_comparison_decision_v2'

export type ComparisonSource = {
  label: string
  url: string
  checkedOn: string
}
export type ComparisonFact = {
  text: string
  status: 'verified' | 'unknown' | 'conflict'
  sources: readonly ComparisonSource[]
}
export type ComparisonProvider = {
  name: string
  workflow: ComparisonFact
  price: ComparisonFact
  trial: ComparisonFact
  engines: ComparisonFact
  duration: ComparisonFact
  watermark: ComparisonFact
}

const source = (label: string, url: string): ComparisonSource => ({ label, url, checkedOn: COMPARISON_REVIEW_DATE })
const fact = (text: string, sources: readonly ComparisonSource[], status: ComparisonFact['status'] = 'verified'): ComparisonFact => ({ text, sources, status })
const pictoryPricing = source('Pricing', 'https://pictory.ai/pricing/')
const pictorySignup = source('Signup', 'https://app.pictory.ai/signup?nav=mega')
const pictoryCard = source('Verification', 'https://app.pictory.ai/cards/')
const pictoryModels = source('AI Studio', 'https://kb.pictory.ai/en/articles/12507673-ai-studio-overview')
const pictoryMark = source('Watermark help', 'https://kb.pictory.ai/en/articles/8468876-how-to-remove-the-pictory-watermark-and-branding-from-my-video')
const descriptPricing = source('Pricing', 'https://www.descript.com/pricing')
const descriptModels = source('Model access', 'https://help.descript.com/generative-media/models')
const descriptExport = source('Export help', 'https://help.descript.com/export-and-share/video-gif')
const descriptShare = source('Web-link help', 'https://help.descript.com/export-and-share/share-page')
const descriptEditor = source('Editor page', 'https://www.descript.com/tools/video-editor')
const heygenPricing = source('Pricing', 'https://www.heygen.com/pricing')
const heygenDuration = source('Duration guide', 'https://www.heygen.com/blog/heygen-creator-plan-maximum-video-length')
const heygenMark = source('Watermark help', 'https://help.heygen.com/en/articles/11057301-how-to-remove-the-heygen-watermark')
const heygenTool = source('Tool page', 'https://www.heygen.com/tool/free-ai-video-generator-no-watermark')
const opusPricing = source('Pricing', 'https://www.opus.pro/pricing')
const opusCredits = source('Credit help', 'https://help.opus.pro/docs/article/plans-and-credits')
const opusLength = source('Clip presets', 'https://help.opus.pro/docs/article/select-clip-length')
const opusClipping = source('Clipping guide', 'https://help.opus.pro/docs/article/clip-anything-prompt-manual')

// Public primary sources checked 11 September 2026; no account/export validation.
// A plan-specific gap stays unknown even when a site lists models elsewhere.
export const COMPARISON_PROVIDERS: readonly ComparisonProvider[] = [
  {
    name: 'Pictory',
    workflow: fact('Script or URL to video with stock footage.', [pictoryPricing]),
    price: fact('Starter: USD 29/month, billed monthly.', [pictoryPricing]),
    trial: fact('14 days, 3 projects, up to 5 min each from script/URL. Card requirement: [CONFIRMAR]; signup and verification pages conflict.', [pictoryPricing, pictorySignup, pictoryCard], 'conflict'),
    engines: fact('Stock-based workflow; visual model access in Starter: [CONFIRMAR].', [pictoryPricing, pictoryModels], 'unknown'),
    duration: fact('Starter: up to 30 min from script/URL. Other export workflows: [CONFIRMAR].', [pictoryPricing], 'unknown'),
    watermark: fact('Trial downloads are marked; paid plans remove the mark.', [pictoryMark]),
  },
  {
    name: 'Descript',
    workflow: fact('Text-based editor with Underlord assistance.', [descriptPricing]),
    price: fact('Hobbyist: USD 24/person/month, billed monthly.', [descriptPricing]),
    trial: fact('Free: 60 min of media processed per month; no card required.', [descriptPricing]),
    engines: fact('Underlord editing; specific models included in Hobbyist: [CONFIRMAR].', [descriptPricing, descriptModels], 'unknown'),
    duration: fact('Hobbyist: up to 1 hour via web link. Local MP4 maximum: [CONFIRMAR].', [descriptPricing, descriptShare, descriptExport], 'unknown'),
    watermark: fact('Hobbyist exports without a watermark. Free: [CONFIRMAR]; export help and the editor page conflict.', [descriptPricing, descriptExport, descriptEditor], 'conflict'),
  },
  {
    name: 'HeyGen',
    workflow: fact('Avatar-led video presentations.', [heygenPricing]),
    price: fact('Creator: USD 29/month, billed monthly.', [heygenPricing]),
    trial: fact('Free: 3 videos/month, up to 1 min each; no card required.', [heygenPricing]),
    engines: fact('Avatar IV is listed for Creator.', [heygenPricing]),
    duration: fact('Creator: up to 30 min per video; individual features can have separate limits.', [heygenPricing, heygenDuration]),
    watermark: fact('Creator includes watermark removal. Free: [CONFIRMAR]; official pages conflict.', [heygenPricing, heygenMark, heygenTool], 'conflict'),
  },
  {
    name: 'OpusClip',
    workflow: fact('Finds clips in an existing recording.', [opusClipping]),
    price: fact('Starter: USD 15/month, billed monthly.', [opusPricing]),
    trial: fact('Free: 60 processing credits/month; clips exportable for 3 days. A no-card trial is also advertised.', [opusPricing, opusCredits]),
    engines: fact('AI clipping; model inclusion in Starter: [CONFIRMAR].', [opusPricing, opusClipping], 'unknown'),
    duration: fact('Maximum finished export: [CONFIRMAR]. Clip presets reach 10–15 min; they do not establish a global maximum.', [opusPricing, opusLength], 'unknown'),
    watermark: fact('Free clips are marked; Starter includes removal.', [opusPricing]),
  },
]
