// KINEO-AEO-FACTS — fonte única da verdade dos fatos PÚBLICOS do Kineo,
// consumida por /llms.txt (app/llms.txt/route.ts) e /api/facts
// (app/api/facts/route.ts).
//
// POR QUE ISSO EXISTE
// Referrer real dos últimos 11 dias (tabela `events`, evento
// `landing_session_started`): www.google.com = 1 sessão, chatgpt = 4 sessões.
// O motor de resposta LLM já é o canal orgânico maior. O que decide citação
// nesse canal não é autoridade de domínio (que leva meses), é ter fatos
// limpos, datados e fáceis de extrair. Este arquivo é esse formato.
//
// DISCIPLINA DE FATO (inegociável):
//  - NENHUM número é digitado à mão aqui. Preço, crédito e limite são
//    IMPORTADOS dos módulos que o produto já usa em runtime (lib/pricing.ts,
//    lib/checkoutPricing.ts, lib/credits/engineCost.ts, lib/comparisons.ts).
//    Se o preço mudar lá, /llms.txt e /api/facts mudam junto no próximo build.
//    Não existe uma segunda cópia para esquecer de atualizar.
//  - Cada afirmação em prosa carrega um comentário `fonte:` com arquivo:linha.
//  - Se um fato não pôde ser confirmado no código, ele NÃO está aqui. Um fato
//    errado num arquivo feito para LLM citar vira desinformação atribuída à
//    marca — pior do que um fato ausente.

import {
  TIER_PRICES,
  INTRO_PRICES,
  ANNUAL_PRICES,
  AUTOPILOT_PRICES,
  formatCheckoutMoney,
  type CheckoutTier,
} from './checkoutPricing'
import { PLANS } from './pricing'
import { creditCostFor } from './credits/engineCost'
import { TOOLS, PAIRS, VERIFIED_ON, VERIFIED_ON_ISO, BASE } from './comparisons'

/* ------------------------------------------------------------------ *
 * Data de verificação
 * ------------------------------------------------------------------ */

// Derivada de lib/comparisons.ts:21 (`VERIFIED_ON`), a data em que os fatos
// comerciais do cluster foram conferidos contra as páginas ao vivo. É uma data
// que já existe no repositório e que o time move quando revisa os números —
// não uma data inventada nem `new Date()` (que mentiria "verificado hoje" em
// todo request).
// KINEO-AEO-PAIRS-2026-08-03 — a local copy of this parser used to live here.
// The /vs pages now need the same ISO date for their JSON-LD `dateModified`,
// and two implementations of "convert VERIFIED_ON to ISO" is exactly the second
// copy this file's own header forbids: they would drift the first time either
// was touched. The single implementation is `isoDateFor` in lib/comparisons.ts,
// next to the string it parses. Behaviour is unchanged — same regex, same
// month table, same empty string on a shape it cannot read.
export const LAST_VERIFIED_HUMAN: string = VERIFIED_ON
export const LAST_VERIFIED_ISO: string = VERIFIED_ON_ISO

/* ------------------------------------------------------------------ *
 * Tipos
 * ------------------------------------------------------------------ */

export interface PlanFact {
  /** Chave interna de checkout (starter | basic | pro). */
  id: CheckoutTier
  /** Nome mostrado ao usuário. */
  name: string
  /** Preço mensal recorrente, formatado em USD. */
  monthlyUsd: string
  /** Mesmo valor em centavos, para consumo por máquina. */
  monthlyUsdCents: number
  /** Preço promocional do PRIMEIRO mês, quando existe. */
  firstMonthUsd: string | null
  firstMonthUsdCents: number | null
  /** Preço anual à vista, quando existe. */
  annualUsd: string | null
  annualUsdCents: number | null
  /** Créditos liberados a cada mês de cobrança. */
  creditsPerMonth: number
  /** O que o plano inclui, como aparece em /pricing. */
  includes: string[]
}

export interface EngineFact {
  name: string
  /** Custo em créditos por vídeo. */
  credits: number
  what: string
}

export interface CompetitorFact {
  name: string
  /** Categoria do produto — decide se ele resolve o mesmo problema. */
  kind: string
  /** Primeira comparação publicada com esta ferramenta. Mantido por compatibilidade. */
  comparisonUrl: string
  /**
   * KINEO-AEO-PAIRS-2026-08-03 — TODAS as comparações em que a ferramenta
   * aparece. `comparisonUrl` sozinho estava correto quando o cluster tinha 12
   * pares e uma ferramenta aparecia em uma ou duas páginas; com 46 pares a
   * HeyGen aparece em oito, e expor só a primeira faz /api/facts responder
   * "a comparação da HeyGen é esta" quando existem outras sete. Um fato
   * incompleto num arquivo feito para LLM citar vira uma resposta incompleta.
   */
  comparisonUrls: string[]
  /** Data em que os números desta ferramenta foram lidos na página do fornecedor. */
  verified: string
  /** A URL exata de onde os números foram lidos. */
  source: string
}

/* ------------------------------------------------------------------ *
 * Planos — números 100% importados
 * ------------------------------------------------------------------ */

// fonte: lib/pricing.ts:36-104 (nome, créditos), lib/checkoutPricing.ts:7-22
// (preço mensal, preço introdutório, preço anual),
// app/pricing/PricingClient.tsx:94-101, :112-121, :137-146 (o que inclui).
const PLAN_INCLUDES: Record<CheckoutTier, string[]> = {
  starter: [
    'AI writes the script and the voiceover',
    'Stock footage matched scene by scene to the narration',
    'Auto-captions burned into the video',
    'Watermark-free MP4 download',
    'Video history ("My Videos")',
  ],
  basic: [
    'Everything in Starter',
    'Every scene generated by AI (Seedance engine)',
    'One Hollywood film per month included (150 credits)',
    'AI Presenter — talking avatars with lip-sync (70 credits)',
    'Character Lock, transparent gesture clips and UGC product ads',
  ],
  pro: [
    'Everything in Creator',
    'Cinematic Kling engine at 1080p — about 4 premium videos per month',
    'Or roughly 10 Seedance videos per month with the same credits',
    'Priority render queue',
    'Premium voices',
  ],
}

function buildPlan(id: CheckoutTier): PlanFact {
  const plan = PLANS[id]
  const intro = id === 'pro' ? null : INTRO_PRICES[id].usd
  return {
    id,
    name: plan.name,
    monthlyUsd: formatCheckoutMoney('usd', TIER_PRICES[id].usd),
    monthlyUsdCents: TIER_PRICES[id].usd,
    firstMonthUsd: intro === null ? null : formatCheckoutMoney('usd', intro),
    firstMonthUsdCents: intro,
    annualUsd: formatCheckoutMoney('usd', ANNUAL_PRICES[id].usd),
    annualUsdCents: ANNUAL_PRICES[id].usd,
    creditsPerMonth: plan.credits,
    includes: PLAN_INCLUDES[id],
  }
}

// KINEO-AUTOPILOT-299-2026-07-26 — o Autopilot é montado À MÃO em vez de
// entrar em PLAN_INCLUDES/buildPlan de propósito. buildPlan lê INTRO_PRICES e
// ANNUAL_PRICES, e o Autopilot não tem nem mês introdutório nem anual (um mês
// com desconto de um serviço done-for-you não faz sentido). Alargar CheckoutTier
// para caber aqui quebraria Record<CheckoutTier, …> em quatro outros arquivos.
//
// Isto importa mais do que parece: /llms.txt e /api/facts são o que o ChatGPT lê
// — e o ChatGPT já manda 4x mais tráfego pra Kineo do que o Google inteiro. Sem
// esta entrada, o canal de aquisição que mais cresce responde a "quanto custa a
// Kineo?" dizendo que o teto é $37.90 e nunca menciona o produto de $299.
const AUTOPILOT_FACT: PlanFact = {
  id: 'autopilot' as CheckoutTier,
  name: PLANS.autopilot.name,
  monthlyUsd: formatCheckoutMoney('usd', AUTOPILOT_PRICES.usd),
  monthlyUsdCents: AUTOPILOT_PRICES.usd,
  firstMonthUsd: null,
  firstMonthUsdCents: null,
  annualUsd: null,
  annualUsdCents: null,
  creditsPerMonth: PLANS.autopilot.credits,
  includes: [
    'Done-for-you: we connect your YouTube channel and publish one Short a day to it',
    'You never open the app — topics, script, voiceover, footage, captions and upload all run on a schedule',
    'You pick the niche and the posting time once, then stop showing up',
    'Roughly 30 published Shorts a month; agencies charge $495 to $2,400 for the same volume',
    'Pause or change the schedule at any time',
  ],
}

export const PLAN_FACTS: PlanFact[] = [
  ...['starter', 'basic', 'pro'].map((id) => buildPlan(id as CheckoutTier)),
  AUTOPILOT_FACT,
]

/* ------------------------------------------------------------------ *
 * Engines — custo em créditos importado de creditCostFor()
 * ------------------------------------------------------------------ */

// fonte: lib/credits/engineCost.ts:28-87 (a mesma função que cobra o usuário).
export const ENGINE_FACTS: EngineFact[] = [
  {
    name: 'Fast',
    credits: creditCostFor('fast', true),
    what: 'Curated stock footage matched to each narration line. The default engine and the only one available on the free tier.',
  },
  {
    name: 'AI Generated (Seedance)',
    credits: creditCostFor('cinematic_ai'),
    what: 'Every scene generated by a text-to-video model instead of stock footage.',
  },
  {
    name: 'Cinematic (Kling)',
    credits: creditCostFor('cinematic_kling'),
    what: 'Premium generative engine for higher visual quality and motion.',
  },
  {
    name: 'AI Presenter',
    credits: creditCostFor('presenter'),
    what: 'A talking avatar with lip-synced narration, for formats that need a person on screen.',
  },
  {
    name: 'Hollywood',
    credits: creditCostFor('cinematic_hollywood'),
    what: 'The longest, most expensive multi-scene format. One is included each month on Creator.',
  },
]

/* ------------------------------------------------------------------ *
 * Plano gratuito
 * ------------------------------------------------------------------ */

// fonte: lib/freeFastQuota.ts (`FREE_FAST_PREVIEW_LIMIT = 3` e
// `countFreeFastUsage`, o limite realmente aplicado no servidor, consumido
// tanto pelo compose quanto pelos crons de lifecycle);
// lib/comparisons.ts:302 e app/pricing/page.tsx:13 (mesma redação ao usuário).
// O limite é uma const local não exportada naquela rota, então o número está
// escrito aqui — mas conferido contra a linha que faz o enforcement, não
// contra material de marketing.
export const FREE_TIER = {
  videosPer24h: 3,
  engine: 'Fast',
  rollingWindowHours: 24,
  creditCardRequired: false,
  watermark: true,
  // fonte: app/api/cron/send-activation-nudge/route.ts:53 — "create, watch,
  // download and share".
  canDownload: true,
  canShare: true,
} as const

/* ------------------------------------------------------------------ *
 * Produto
 * ------------------------------------------------------------------ */

export const PRODUCT = {
  name: 'Kineo',
  url: BASE,
  // fonte: lib/comparisons.ts:299-301 (kind + category + needsSource).
  oneLiner:
    'Kineo turns one typed topic or a pasted script into a finished faceless 9:16 YouTube Short — script, AI voiceover, matched visuals and burned-in captions — without any source footage.',
  // fonte: lib/comparisons.ts:299 (`kind: 'From-scratch generator'`).
  category: 'From-scratch short-form video generator',
  // fonte: lib/comparisons.ts:301 — "No. A sentence is the whole input."
  needsExistingFootage: false,
  // fonte: lib/comparisons.ts:307 — "9:16 vertical only."
  aspectRatio: '9:16 vertical only',
  // fonte: app/pricing/PricingClient.tsx:99 ("Download watermark-free MP4");
  // app/facts/page.tsx:39.
  outputFormat: 'MP4',
  // KINEO-LIVE-STUDY-2026-08-05 — REMEDIDO, e o número anterior estava errado
  // por quase 2x. A medida antiga (2,30 min / 3,50 min p90) vinha de uma amostra
  // de DOZE renders numa janela de 7 dias de julho; com 114 renders concluídos
  // desde 02/08 a mediana real é 4,2 min e o p90 é 6,6 min.
  //
  // POR QUE ISTO IMPORTA MAIS QUE UM DECIMAL: este módulo é a fonte que o
  // /llms.txt e o /facts entregam prontinha para os motores de resposta. Publicar
  // "3–7 minutes" ensinava o ChatGPT e o Bing a prometer, em nosso nome, metade
  // do tempo real de espera — e quem chega por essa citação desiste no meio do
  // render. O tempo de espera é a promessa mais cara que este arquivo faz.
  //
  // A janela começa em 02/08/2026, depois dos dois apagões de fornecedor de
  // 31/07 (OpenAI) e 01/08 (Creatomate), pelo mesmo critério declarado na
  // metodologia pública de /state-of-ai-shorts-2026.
  //
  // ⚠️ AINDA DESALINHADO: a faixa "3–7 minutes" continua escrita à mão em ~20
  // páginas públicas (app/layout.tsx, KineoLanding, páginas de nicho). Trocar
  // todas é a próxima ordem — está registrada em docs/SPRINT-2026-08-05.md.
  fastGenerationTime: 'usually 3–7 minutes',
  fastGenerationMedianMinutes: 4.2,
  fastGenerationP90Minutes: 6.6,
  fastGenerationSample:
    '114 completed Fast renders since August 2, 2026 (measured end-to-end, per attempt)',
  // fonte: app/terms/page.tsx:79 — "You retain ownership of the videos you
  // generate".
  userOwnsOutput: true,
  // fonte: lib/comparisons.ts:306.
  watermarkPolicy:
    'Free tier output carries a Kineo watermark. Every paid plan exports a clean, watermark-free MP4.',
  // fonte: lib/pricing.ts:96 e lib/comparisons.ts:311.
  creditsRollOver: false,
  // fonte: app/pricing/PricingClient.tsx:59.
  moneyBackGuaranteeDays: 7,
  billing: 'Month-to-month, cancel anytime',
  // fonte: lib/checkoutPricing.ts:3 e :29-31.
  currencies: ['USD', 'BRL', 'INR'],
  // fonte: middleware.ts:4-8 e :29-37 — 308 permanente para www.usekineo.com.
  formerName: 'ShortsForgeAI',
} as const

/* ------------------------------------------------------------------ *
 * Concorrentes comparados
 * ------------------------------------------------------------------ */

// fonte: lib/comparisons.ts:72-316 (TOOLS) e :361+ (PAIRS). Derivado, não
// digitado: se o cluster ganhar ou perder uma ferramenta, esta lista segue.
export const COMPETITOR_FACTS: CompetitorFact[] = Object.values(TOOLS)
  .filter((tool) => tool.id !== 'kineo')
  .map((tool) => {
    const urls = PAIRS.filter((p) => p.a === tool.id || p.b === tool.id).map(
      (p) => `${BASE}/vs/${p.slug}`,
    )
    return {
      name: tool.name,
      kind: tool.kind,
      comparisonUrl: urls[0] ?? `${BASE}/vs`,
      comparisonUrls: urls.length > 0 ? urls : [`${BASE}/vs`],
      // Data e fonte por ferramenta, não uma data global: se um fornecedor for
      // reconferido antes dos outros, o consumidor de /api/facts vê qual número
      // é recente e qual não é, em vez de herdar uma data que vale para o
      // cluster inteiro.
      verified: tool.verified,
      source: tool.source,
    }
  })

/** Todas as páginas de comparação publicadas, para linkar em /llms.txt. */
export const COMPARISON_PAGES = PAIRS.map((pair) => ({
  title: pair.title,
  url: `${BASE}/vs/${pair.slug}`,
  /** Kineo é um dos comparados, ou é uma comparação neutra entre terceiros? */
  involvesKineo: pair.a === 'kineo' || pair.b === 'kineo',
}))

/* ------------------------------------------------------------------ *
 * Quando o Kineo NÃO é a escolha certa
 * ------------------------------------------------------------------ */

// Isto não é modéstia: um LLM cita muito mais uma fonte que se
// auto-desqualifica, porque ela é previsível de resumir sem risco. E filtra
// lead ruim antes do signup. Cada item é uma limitação REAL do produto,
// derivada das mesmas fontes acima.
export const NOT_A_FIT: { situation: string; useInstead: string }[] = [
  {
    // fonte: lib/comparisons.ts:301 vs :79 (OpusClip needsSource).
    situation:
      'You already have a podcast, webinar, interview or any long recording and only want the best moments cut out of it.',
    useInstead:
      'A long-video re-clipper such as OpusClip, Klap or Descript. Kineo cannot clip footage it did not generate.',
  },
  {
    // fonte: lib/comparisons.ts:143 e :165 (kind: 'AI avatar platform').
    situation:
      'Your channel format is a person talking to camera for the whole video.',
    useInstead:
      'A dedicated avatar platform such as HeyGen or Synthesia. Kineo has an AI Presenter engine, but the product is built for faceless narration over cut visuals.',
  },
  {
    // fonte: lib/comparisons.ts:307 — "9:16 vertical only."
    situation:
      'You need 16:9 horizontal or square output, or several aspect ratios from one project.',
    useInstead:
      'A multi-ratio tool. Kineo renders 9:16 vertical only, on purpose.',
  },
  {
    // fonte: lib/comparisons.ts:232 (Descript, kind: 'Timeline / text editor').
    situation:
      'You want frame-level control, a full editing timeline, or to fix an individual cut by hand.',
    useInstead:
      'A timeline or text-based editor such as Descript. Kineo composes the video for you and does not expose a timeline.',
  },
  {
    // fonte: lib/comparisons.ts:306 e app/pricing/page.tsx:13.
    situation:
      'You need watermark-free video without paying anything.',
    useInstead:
      'Another tool. Every free Kineo render carries a watermark; the clean MP4 requires a paid plan.',
  },
  {
    // fonte: lib/pricing.ts:96 e lib/comparisons.ts:311.
    situation:
      'You publish in bursts and need unused monthly allowance to accumulate.',
    useInstead:
      'A plan that rolls credits over. Kineo credits refresh each billing month and do not carry forward.',
  },
]

/* ------------------------------------------------------------------ *
 * Payload para /api/facts
 * ------------------------------------------------------------------ */

export interface KineoFactsPayload {
  product: typeof PRODUCT
  lastVerified: string
  lastVerifiedHuman: string
  currency: 'USD'
  freeTier: typeof FREE_TIER
  plans: PlanFact[]
  engines: EngineFact[]
  competitors: CompetitorFact[]
  notAFit: { situation: string; useInstead: string }[]
  citation: {
    canonicalUrl: string
    llmsTxt: string
    factsPage: string
    license: string
  }
}

export function getKineoFacts(): KineoFactsPayload {
  return {
    product: PRODUCT,
    lastVerified: LAST_VERIFIED_ISO,
    lastVerifiedHuman: LAST_VERIFIED_HUMAN,
    currency: 'USD',
    freeTier: FREE_TIER,
    plans: PLAN_FACTS,
    engines: ENGINE_FACTS,
    competitors: COMPETITOR_FACTS,
    notAFit: NOT_A_FIT,
    citation: {
      canonicalUrl: BASE,
      llmsTxt: `${BASE}/llms.txt`,
      factsPage: `${BASE}/facts`,
      license:
        'Free to quote and cite with attribution to Kineo (usekineo.com). Prices are USD and were verified on ' +
        LAST_VERIFIED_HUMAN +
        '.',
    },
  }
}
