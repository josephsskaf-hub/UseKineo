// KINEO-BING-SEO-1510 — os avisos do Bing Webmaster (relatório do Cowork, 15/10, só leitura) e as consultas com CTR 0%.
//
// O QUE O BING VIU (3 meses: 107 cliques, 7,1 mil impressões, CTR 1,51%):
//   · avisos: título > 60 na home e em /faceless-youtube-shorts-generator; description fora de 120–160 na home, no
//     Seedance, no Veo e no faceless; ~25 imagens da home sem alt descritivo;
//   · "does youtube pay for ai generated videos" — 152 impressões, 0 cliques, posição 7,2 → /can-you-monetize-ai-videos
//     (a única página da casa que responde política de monetização de vídeo feito com IA);
//   · "best fully automated ai youtube shorts pricing flowshorts autoshorts revid" — 109 impressões, 0 cliques, posição 7,0
//     → /best-ai-shorts-generators (o comparativo de ferramentas com preço; o único que cita AutoShorts e Revid);
//   · "what is the best ai tool for creating youtube shorts from text?" — 38 impressões, 0 cliques, posição 3,9 →
//     /text-to-video-shorts (título "AI YouTube Shorts From Text"). O Bing não diz a URL de cada consulta no relatório que
//     o Cowork leu; a escolha é a página cuja intenção casa com a consulta. Nenhuma URL nova: enriquecer a que já ranqueia.
//
// REGRAS DE VERDADE (as mesmas de lib/seo/paginasMotor1610.ts):
//   · preço/crédito da Kineo nunca digitado — vem de cheapestAnswer()/kineoCostRows() (creditCostForDuration, TIER_PRICES,
//     TIER_CREDITS) e de PLANS;
//   · fato de terceiro só com URL e data da leitura (FONTES_1610_BING abaixo). Onde a página pública não mostra o número,
//     a frase diz "not published" em vez de inventar. Sem vencedor universal, sem nota, sem ranking de qualidade;
//   · nenhuma promessa de monetização: a decisão é do YouTube, canal a canal.
// MÓDULO PURO: só imports relativos de módulos puros — o guardião scripts/test-bing-seo-1510.mjs o executa isolado.
import { cheapestAnswer, cheapestCreditPlan, usd } from './paginasMotor1610'
import { TIER_CREDITS, TIER_PRICES } from '../checkoutPricing'
import { PLANS } from '../pricing'
import { FREE_FILM_LABEL, GRANT_COUNTRY_CLAUSE, TRIAL_SEEDANCE15_FILMS } from '../freeTierOffer'

export const BING_SEO_1510_MARK = 'KINEO-BING-SEO-1510'
/** Data da leitura das fontes externas e da revisão do texto. */
export const BING_SEO_1510_CHECKED_ISO = '2026-10-15'
export const BING_SEO_1510_CHECKED_LABEL = '15 October 2026'
/** O lastmod e a lista de páginas tocadas moram num arquivo sem imports (app/sitemap.ts o importa). */
export { BING_SEO_1510_LASTMOD_ISO, BING_SEO_1510_PATHS } from './bingSeo1510Paths'

/** Limites que o Bing aplica (Site Scan / SEO Reports): título até 60; description entre 120 e 160. */
export const TITLE_MAX = 60
export const DESCRIPTION_MIN = 120
export const DESCRIPTION_MAX = 160

// ─── metadados (texto fixo; o guardião mede o comprimento RENDERIZADO, com os números que vêm do código) ─────────────
export const HOME_TITLE_1510 = 'Kineo AI — Faceless YouTube Shorts: Veo 3.1, Kling, Seedance'
export const HOME_DESCRIPTION_1510 =
  'Pick an engine — Veo 3.1, Kling 3, Kling 2.5 or Seedance 1.5 — type a topic and get a finished faceless YouTube Short with script, voice and captions.'
export const FACELESS_TITLE_1510 = 'Faceless YouTube Shorts Generator: Cost per Short | Kineo'
export const FACELESS_DESCRIPTION_1510 =
  'Type a topic or paste a script and get a finished faceless YouTube Short: script, AI voiceover, scenes, captions and music. Dated price per Short, every model.'
export const MONETIZE_TITLE_1510 = 'Does YouTube Pay for AI-Generated Videos? (2026 Rules)'
export const MONETIZE_DESCRIPTION_1510 =
  'Yes, if the channel is in the Partner Program and the video is original. YouTube does not pay for mass-produced, templated AI content. Official rules, dated.'
export const ROUNDUP_TITLE_1510 = '13 Best AI Tools for YouTube Shorts (2026): Prices Compared'
export const ROUNDUP_DESCRIPTION_1510 =
  'Compare 13 AI tools for YouTube Shorts, plus FlowShorts, AutoShorts and Revid pricing: published plans, cost per Short and what each automates. Sources dated.'
export const TEXT_TO_VIDEO_TITLE_1510 = 'Best AI Tool for YouTube Shorts From Text? (2026 Answer)'

/**
 * A description do /text-to-video-shorts responde a pergunta e termina com a linha do teste grátis DA OFERTA
 * (OFFER.copy.planLimitLine — a fonte única; o guardião test-citation-entry-truth-2026-09-30 exige que ela venha de lá).
 * O texto fixo tem 98 caracteres para caber em 120–160 com as duas versões da oferta (23 e 60 caracteres).
 */
export function textToVideoDescription1510(planLimitLine: string): string {
  return `It depends on your text: Kineo turns a topic or a script into a finished, narrated Short. Trial: ${planLimitLine}.`
}

// ─── fontes externas (lidas em 15/10/2026) ───────────────────────────────────────────────────────────────────────────
export interface FonteExterna { label: string; url: string; checkedOn: string }
const on = BING_SEO_1510_CHECKED_ISO

/** As páginas OFICIAIS do YouTube (Google Help) que sustentam a resposta sobre monetização de vídeo feito com IA. */
export const YOUTUBE_FONTES_1510 = {
  monetization: { label: 'YouTube channel monetization policies (YouTube Help)', url: 'https://support.google.com/youtube/answer/1311392?hl=en', checkedOn: on },
  genAiDisclosure: { label: 'Disclosing use of GenAI content (YouTube Help)', url: 'https://support.google.com/youtube/answer/14328491?hl=en', checkedOn: on },
  ypp: { label: 'YouTube Partner Program overview & eligibility (YouTube Help)', url: 'https://support.google.com/youtube/answer/72851?hl=en', checkedOn: on },
} as const satisfies Record<string, FonteExterna>

/** Os números do YPP lidos em YOUTUBE_FONTES_1510.ypp (rota dos Shorts para a divisão de receita de anúncios). */
export const YPP_SHORTS_1510 = { subscribers: 1000, shortsViews: '10 million', days: 90, watchHours: 4000, watchHoursMonths: 12 } as const
/** O dia em que o YouTube trocou o nome da regra "repetitious content" para "inauthentic content" (página de políticas). */
export const INAUTHENTIC_RENAME_1510 = 'July 15, 2025'

export interface MonetizationAnswer1510 { summary: [string, string, string]; does: string[]; doesNot: string[]; sources: FonteExterna[] }
export function monetizationAnswer1510(): MonetizationAnswer1510 {
  const y = YPP_SHORTS_1510
  return {
    summary: [
      `Yes, YouTube can pay for AI-generated videos: using AI is not by itself a reason to lose monetization — YouTube says disclosing AI content alone won’t affect a video’s eligibility to earn money — but the channel must be in the YouTube Partner Program (for Shorts: ${y.subscribers.toLocaleString('en-US')} subscribers and ${y.shortsViews} qualified Shorts views in the last ${y.days} days).`,
      `What YouTube does not pay for is “inauthentic content” (renamed from “repetitious content” on ${INAUTHENTIC_RENAME_1510}): mass-produced or repetitive videos, including AI-generated videos made from generic templates, and reused content with no meaningful change.`,
      'What counts is your own contribution: an original script or angle in every video, narration or commentary that adds something, real editing and value for the viewer — plus YouTube’s disclosure when realistic AI shows something that did not happen. No tool, Kineo included, can guarantee monetization.',
    ],
    does: [
      'Writes a new script for each topic you type, or narrates your own script word for word.',
      'Builds the film around that script: AI voiceover, generated scenes, captions and music, as a vertical MP4 you review before posting.',
      'Lets you choose the engine and length per video, so a series does not have to be one template repeated.',
    ],
    doesNot: [
      'It does not guarantee YouTube Partner Program approval or any payout — YouTube reviews each channel.',
      'It does not mark the AI disclosure for you: that setting is chosen in YouTube Studio when you upload.',
      'It does not make a channel original by itself: the angle, the research and the series idea are yours. Kineo narrates with an AI voice.',
    ],
    sources: [YOUTUBE_FONTES_1510.monetization, YOUTUBE_FONTES_1510.genAiDisclosure, YOUTUBE_FONTES_1510.ypp],
  }
}

// ─── ferramentas de Shorts "totalmente automáticas": FlowShorts, AutoShorts, Revid (preço público) ─────────────────────
export interface AutomationTool1510 {
  id: 'flowshorts' | 'autoshorts' | 'revid'
  name: string
  /** O que a ferramenta entrega, como a própria página descreve. */
  delivers: string
  /** O preço público como a página oficial mostra; "Not published…" quando ela não mostra. */
  publicPrice: string
  /** Custo por Short calculado em código a partir do preço publicado; null = a página não dá base. */
  perShort: string | null
  sources: FonteExterna[]
}

/** Números lidos nas páginas oficiais em 15/10/2026. */
export const FONTES_AUTOMACAO_1510 = {
  flowshorts: {
    url: 'https://flowshorts.app/', // FAQ da home (FAQPage): "Plans start at $19/month (2 videos/week), $39/month (30 videos/month), or $69/month (60 videos/month)"
    plans: [
      { usdMonthly: 19, videosPerWeek: 2 },
      { usdMonthly: 39, videosPerMonth: 30 },
      { usdMonthly: 69, videosPerMonth: 60 },
    ],
    freeTier: true,
  },
  autoshorts: {
    url: 'https://autoshorts.ai/', // a home não mostra plano; não há rota pública de preço (os planos ficam em /dashboard/billing, depois do login)
  },
  revid: {
    url: 'https://www.revid.ai/pricing',
    growth: { usdMonthly: 39, usdMonthlyYearly: 32, credits: 2000 },
    ultra: { usdMonthly: 199, usdMonthlyYearly: 166, credits: 12000 },
  },
} as const

const WEEKS_PER_MONTH = 52 / 12
function dollars(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}

export function automationTools1510(): AutomationTool1510[] {
  const f = FONTES_AUTOMACAO_1510.flowshorts
  const perVideo = f.plans.map((p) => p.usdMonthly / ('videosPerWeek' in p ? p.videosPerWeek * WEEKS_PER_MONTH : p.videosPerMonth))
  const cheapestPer = Math.min(...perVideo)
  const priciestPer = Math.max(...perVideo)
  const r = FONTES_AUTOMACAO_1510.revid
  return [
    {
      id: 'flowshorts',
      name: 'FlowShorts',
      delivers: 'AI-generated short videos with auto-posting to YouTube, TikTok and Instagram on every plan.',
      publicPrice: f.plans.map((p) => `${dollars(p.usdMonthly)}/month (${'videosPerWeek' in p ? `${p.videosPerWeek} videos/week` : `${p.videosPerMonth} videos/month`})`).join(', ') + (f.freeTier ? '; a free tier to start.' : '.'),
      perShort: `${usd(Math.round(cheapestPer * 100))}–${usd(Math.round(priciestPer * 100))} per video, from its plan prices and video counts.`,
      sources: [{ label: 'FlowShorts home page (pricing FAQ)', url: f.url, checkedOn: on }],
    },
    {
      id: 'autoshorts',
      name: 'AutoShorts',
      delivers: 'Faceless videos generated and posted to TikTok and YouTube on a schedule.',
      publicPrice: 'Not published on a public page: its plans appear inside the dashboard after sign-up.',
      perShort: null,
      sources: [{ label: 'AutoShorts home page', url: FONTES_AUTOMACAO_1510.autoshorts.url, checkedOn: on }],
    },
    {
      id: 'revid',
      name: 'Revid',
      delivers: 'Short videos from a script, prompt or URL, with publishing to TikTok, Instagram and YouTube, post stats and an Auto-Mode.',
      publicPrice: `Growth ${dollars(r.growth.usdMonthly)}/month (${dollars(r.growth.usdMonthlyYearly)}/month billed yearly) with ${r.growth.credits.toLocaleString('en-US')} AI credits; Ultra ${dollars(r.ultra.usdMonthly)}/month (${dollars(r.ultra.usdMonthlyYearly)}/month yearly) with ${r.ultra.credits.toLocaleString('en-US')} credits; free credits on sign-up.`,
      perShort: null,
      sources: [{ label: 'Revid pricing', url: r.url, checkedOn: on }],
    },
  ]
}

export interface KineoAutomationRow1510 { name: string; publicPrice: string; delivers: string; perShort: string }
/** A linha da Kineo na mesma tabela — tudo do código (preço do plano, créditos do filme, US$ ao preço do crédito). */
export function kineoAutomationRow1510(): KineoAutomationRow1510 {
  const a = cheapestAnswer()
  const plan = cheapestCreditPlan()
  const starter = TIER_PRICES.starter.usd
  return {
    name: 'Kineo',
    publicPrice: `${PLANS.starter.name} ${dollars(starter / 100)}/month with ${TIER_CREDITS.starter} credits; ${PLANS.basic.name} ${dollars(TIER_PRICES.basic.usd / 100)}/month with ${TIER_CREDITS.basic}; ${PLANS.pro.name} ${dollars(TIER_PRICES.pro.usd / 100)}/month with ${TIER_CREDITS.pro}.${TRIAL_SEEDANCE15_FILMS >= 1 ? ` New accounts${GRANT_COUNTRY_CLAUSE} get one ${FREE_FILM_LABEL}.` : ''}`,
    delivers: 'One finished narrated Short per render: the script (or yours word for word), AI voiceover, generated scenes, captions and music, as a vertical MP4.',
    perShort: `${a.cheapest.c60} credits for a 60-second ${a.cheapest.name} film — about ${a.cheapest.usd60} at the ${plan.line}; ${a.cheapest.c15} credits for 15 seconds.`,
  }
}

export interface AutomationAnswer1510 { summary: [string, string, string]; faq: { q: string; a: string }[] }
export function automationAnswer1510(): AutomationAnswer1510 {
  const tools = automationTools1510()
  const flow = tools.find((t) => t.id === 'flowshorts') as AutomationTool1510
  const k = kineoAutomationRow1510()
  const a = cheapestAnswer()
  return {
    summary: [
      `Fully automated Shorts tools price by plan: FlowShorts publishes ${flow.publicPrice.replace(/; a free tier to start\.$/, '')} — about ${flow.perShort?.replace(/ per video.*$/, '')} per video — and auto-posts; Revid sells credit plans from $${FONTES_AUTOMACAO_1510.revid.growth.usdMonthly}/month; AutoShorts does not publish its prices on a public page.`,
      `Kineo prices the finished film instead: ${a.cheapest.c60} credits for a narrated 60-second ${a.cheapest.name} Short, about ${a.cheapest.usd60} at the ${cheapestCreditPlan().line}, with the script, voice, scenes, captions and music done.`,
      'No tool is best for every channel: plan-priced tools fit a fixed posting volume, and Kineo’s per-film credits fit when you pick the engine and length video by video. Prices read on the official pages on ' + BING_SEO_1510_CHECKED_LABEL + '.',
    ],
    faq: [
      {
        q: 'How much do FlowShorts, AutoShorts and Revid cost?',
        a: `On their official pages (read ${BING_SEO_1510_CHECKED_LABEL}): FlowShorts ${flow.publicPrice} Revid ${tools.find((t) => t.id === 'revid')?.publicPrice} AutoShorts: ${tools.find((t) => t.id === 'autoshorts')?.publicPrice.replace(/^N/, 'n')} On Kineo: ${k.publicPrice}`,
      },
      {
        q: 'What does one AI YouTube Short cost on each of them?',
        a: `FlowShorts: ${flow.perShort} Revid and AutoShorts do not publish a fixed cost per video. Kineo: ${k.perShort}`,
      },
    ],
  }
}

// ─── /text-to-video-shorts: a pergunta da posição 3,9 ──────────────────────────────────────────────────────────────────
export function textToVideoAnswer1510(): { summary: [string, string, string]; faq: { q: string; a: string } } {
  const a = cheapestAnswer()
  const plan = cheapestCreditPlan()
  const free = TRIAL_SEEDANCE15_FILMS >= 1 ? `New accounts${GRANT_COUNTRY_CLAUSE} can try it with one ${FREE_FILM_LABEL}. ` : ''
  const summary: [string, string, string] = [
    'The best AI tool for turning text into a YouTube Short depends on the text: for a topic or a script you want back as a finished narrated Short in one step, use a text-to-Short generator such as Kineo; to cut a long recording into clips, a re-clipper; for a presenter talking to camera, an avatar tool.',
    `On Kineo a finished 60-second Short costs ${a.cheapest.c60} credits on ${a.cheapest.name} — about ${a.cheapest.usd60} at the ${plan.line} — with the script (or yours word for word), AI voiceover, generated scenes, captions and music.`,
    `${free}We make Kineo, so weigh this answer accordingly and compare the 13-tool roundup before you choose.`,
  ]
  return { summary, faq: { q: 'What is the best AI tool for creating YouTube Shorts from text?', a: summary.join(' ') } }
}
