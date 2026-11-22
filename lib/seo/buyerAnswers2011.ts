import { creditCostForDuration } from '@/lib/credits/engineCost'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { FREE_FILM_ENGINE_NAME } from '@/lib/freeFilmEngine'
import { TRIAL_FREE_FILM_SECONDS } from '@/lib/freeTierOffer'
import { STANDARD_FILM_NAME } from './citacoesRotina1711'

export const BUYER_REVIEW_DATE_2011 = '2026-11-20'
export type BuyerKind2011 = 'portuguese' | 'urdu' | 'h3' | 'cost' | 'script' | 'text'
export type BuyerPage2011 = { path: string; q: string; answer: string; heading: string; labels: string[]; rows: string[][]; note: string; reviewed?: string }
const cost60 = creditCostForDuration('cinematic_ai', true, 60)
const cost15 = creditCostForDuration('cinematic_ai', true, 15)
const starter = formatCheckoutMoney('usd', TIER_PRICES.starter.usd)
export const BUYER_2011 = {
  portuguese: {
    path: '/gerador-de-shorts-gratis',
    q: 'gerador de Shorts gratis em portugues sem aparecer?',
    answer: 'Sim. Escreva uma ideia ou cole o roteiro em português: a Kineo cria um Short faceless com cenas, narração em português do Brasil, legendas, música e MP4 vertical. A amostra tem marca d’água e depende da elegibilidade regional; confira o custo antes de gerar.',
    heading: 'Ideia, roteiro ou clipe: qual caminho escolher?',
    labels: ['O que você tem', 'O que recebe', 'Limite a conferir'],
    rows: [
      ['Uma ideia em português', 'Roteiro, narração, cenas, legendas e música em um filme vertical.', 'A IA escreve o roteiro; revise fatos e pronúncia antes de postar.'],
      ['Um roteiro de narração pronto', 'Um filme construído em torno das palavras que você forneceu.', 'Use o campo de roteiro; instruções de câmera não são fala. Confira a duração e o saldo.'],
      ['Só precisa de uma cena', 'Um clipe é um pedido separado de um filme narrado completo.', 'Voz e legendas montadas em um filme não fazem parte de todo clipe.'],
    ],
    note: `A amostra elegível é um filme de ${TRIAL_FREE_FILM_SECONDS} s com marca d’água, no ${FREE_FILM_ENGINE_NAME}. Não há promessa de audiência ou pagamento por postar.`,
  },
  urdu: {
    path: '/ai-video-generator/for/urdu',
    q: 'AI video generator Urdu narration and captions?',
    answer: 'Kineo makes a faceless Urdu video from an Urdu idea or narration script: generated scenes, an Urdu voice, captions, music and a vertical MP4. Choose Urdu for the narration and review pronunciation and captions before posting; this does not require filming yourself.',
    heading: 'Compare the Urdu starting points',
    labels: ['Your input', 'What Kineo prepares', 'What to check'],
    rows: [
      ['An idea written in Urdu', 'A script, generated scenes, Urdu narration, captions and music.', 'Review names, factual claims and pronunciation.'],
      ['Your finished Urdu narration', 'A film built around the supplied narration, with captions following the voice.', 'Use the script input; keep production directions separate from spoken words.'],
      ['One scene rather than a story', 'A separate clip workflow, rather than an assembled narrated film.', 'Do not assume a raw clip includes narration and captions.'],
    ],
    note: 'Caption language follows the narration. Trial access depends on regional eligibility and the selected duration; review the displayed credit cost before generation. No audience or monetization result is promised.',
  },
  h3: {
    path: '/ai-video-generator/seedance',
    q: 'MiniMax H3 Turbo narrated film generator cost?',
    answer: `On Kineo, a finished faceless H3 Turbo film uses ${cost15} credits at 15 seconds or ${cost60} at 60 seconds, including narration, generated scenes, captions and music. Starter lists ${starter} per month for ${TIER_CREDITS.starter} credits. This is an assembled film, not the price of one raw clip.`,
    heading: 'Compare a finished film with a raw clip',
    labels: ['Starting point', 'Delivered output', 'How to compare cost'],
    rows: [
      ['An idea for a narrated film', 'Script, generated scenes, narration, captions, music and a vertical MP4.', `${cost15} credits at 15 s or ${cost60} at 60 s for the standard film; review the generation button.`],
      ['A finished narration script', 'The same film workflow built around the supplied spoken wording.', 'Requested duration and available credits still apply; a longer script needs review.'],
      ['A request for a single clip', 'One generated scene in a separate workflow.', 'A raw provider clip rate is not the cost of an assembled narrated film.'],
    ],
    note: 'Credits are shared with other creations. The amount per film allocated from a subscription is not a standalone checkout offer. USD is the reference currency; Brazil pays in BRL. Review faces, hands and continuity before posting.',
  },
  cost: {
    path: '/best-ai-shorts-generators', reviewed: '2026-11-21',
    q: 'AI Shorts generator cost per finished video?',
    answer: `On Kineo, a finished 60-second faceless Short on ${STANDARD_FILM_NAME} uses ${cost60} credits, including narration, generated scenes, captions and music. Starter lists ${starter} per month for ${TIER_CREDITS.starter} credits. That balance covers ${Math.floor(TIER_CREDITS.starter/cost60)} such film; other creations use the same balance. Compare the finished film, its requested duration and the plan, rather than a raw clip rate.`,
    heading: 'Compare the same finished film across plans',
    labels: ['Monthly plan', 'Included credits', 'USD allocated to one 60 s film'],
    rows: (['starter','basic','pro'] as const).map((tier,i) => [
      `${['Starter','Creator','Studio'][i]}: ${formatCheckoutMoney('usd',TIER_PRICES[tier].usd)}/month`,
      `${TIER_CREDITS[tier]} credits; ${cost60} for this film`,
      `About ${formatCheckoutMoney('usd',Math.round(TIER_PRICES[tier].usd*cost60/TIER_CREDITS[tier]))} at the monthly credit rate`,
    ]),
    note: 'This is a subscription credit allocation, not a standalone film checkout price. Extra attempts and other creations use the same credits. A raw clip does not necessarily include narration, captions, music or assembly. USD is the reference currency; Brazil pays in BRL. Confirm the displayed engine and credit cost before generating.',
  },
  script: {
    path: '/chatgpt', reviewed: '2026-11-21',
    q: 'turn ChatGPT script into YouTube Short?',
    answer: 'Yes. Paste the narration you wrote with ChatGPT into the script box on this page, then open Kineo Studio with the wording and duration prepared. Review the script, engine and credit cost and press Generate to make a faceless Short with scenes, voice, captions and music. Opening the handoff link prepares Studio; it does not itself generate a film.',
    heading: 'Choose what to send from ChatGPT',
    labels: ['What you have', 'What to send', 'What to review'],
    rows: [
      ['A finished narration', 'Paste the spoken script in the box below.', 'Keep the intended wording; confirm duration, language and engine in Studio.'],
      ['Only a topic', 'Use the prompt below to prepare a narration first, or start an idea in Studio.', 'An idea asks AI to write; it is different from supplying your own narration.'],
      ['A production brief with camera notes', 'Keep spoken words separate from visual directions.', 'Check the narration field before Generate so instructions are not treated as speech.'],
    ],
    note: 'You can also connect Kineo Studio to ChatGPT using the existing steps above. Connecting requires sign-in. The copy/paste path prepares Studio and generation still requires your action there. Review the finished film before uploading it; no audience or monetization result is guaranteed.',
  },
  text: {
    path: '/text-to-video-shorts', reviewed: '2026-11-21',
    q: 'AI that turns text into a finished YouTube Short with voice captions music?',
    answer: 'Yes. Kineo turns an idea or narration script into a finished vertical MP4 with generated scenes, an AI voice, captions and background music. Use an idea when you want AI to write the script, or the script field when you already have the spoken words. Review facts, pronunciation and visual continuity before posting; generation time varies by film and engine.',
    heading: 'Compare text-to-Short starting points',
    labels: ['Starting material', 'What Kineo makes', 'What remains your decision'],
    rows: [
      ['A topic or a short idea', 'A written script and an assembled narrated Short.', 'Check factual claims and the intended message.'],
      ['Your own narration script', 'Generated scenes, voice, captions and music around that narration.', 'Check that the spoken text, language, duration and credit balance fit.'],
      ['Only one scene is needed', 'A separate clip workflow, rather than an assembled narrated Short.', 'Do not compare a raw clip rate with the cost of the whole film.'],
    ],
    note: 'A finished MP4 is not an automatic upload or a guaranteed result on YouTube. Trial eligibility, watermark and duration depend on the current offer. Review the generation cost before spending credits and listen to the finished narration before posting.',
  },
} satisfies Record<BuyerKind2011, BuyerPage2011>

export function buyerReviewedPath2011(path: string): boolean {
  return Object.values(BUYER_2011).some(page => page.path === path)
}

export function buyerReviewDate2011(path: string): string | undefined {
  const page: BuyerPage2011 | undefined = Object.values(BUYER_2011).find(p => p.path === path)
  return page ? page.reviewed ?? BUYER_REVIEW_DATE_2011 : undefined
}
/** Only current standard-film cost labels; historical render/model data stays unchanged. */
export function currentFilmLabel2011(text: string): string { return text.replaceAll('Seedance 1.5', STANDARD_FILM_NAME) }
