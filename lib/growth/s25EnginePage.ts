// KINEO-S25-ABRE-2026-10-06 — os NÚMEROS e o TEXTO da página /ai-video-generator/seedance-2-5 (aposta A do fundador: o
// 2.5 é a isca — quem procura "Seedance 2.5" acha a página e, para usar, precisa assinar). Texto da sessão CEO (06/10),
// com TODO número saído da fonte — nenhum preço, crédito ou contagem digitado aqui:
//   · custo do 2.5 por duração → lib/credits/engineCost.ts creditCostForDuration('cinematic_s25', true, s): a MESMA função
//     que a rota do filme cobra; durações que ele aceita → lib/durationByEngine.ts supportedDurationsFor('s25');
//   · Seedance 1.5 ("mais filmes por mês") → creditCostForDuration('cinematic_ai', true, s) na menor duração dele
//     (SEEDANCE_DURATIONS[0]);
//   · planos → lib/checkoutPricing.ts TIER_PRICES / TIER_CREDITS / ANNUAL_PRICES (USD, a moeda das páginas públicas) e o
//     nome de lib/pricing.ts PLANS;
//   · "about $X" → créditos × preço do plano ÷ créditos do plano; no anual, o preço do ano ÷ 12 (os créditos do anual
//     chegam mês a mês, os mesmos TIER_CREDITS).
// O que a página NÃO diz, de propósito (conferido no código em 06/10):
//   · resolução nenhuma (sessão CEO: "não prometa 1080p");
//   · Enhance incluso: não existe Enhance por cena na estrada s25, e o automático do filme pronto (só na conta da casa,
//     /api/compose/status) saiu do 2.5 a pedido do fundador ("se eu quiser, aperto o botão"). A frase é "Enhance available
//     with one click" — o botão manual da Library, por vídeo;
//   · "o 2.5 não tem voz": o modelo TEM áudio próprio (generate_audio, padrão true na fal) — a Kineo o desliga e quem
//     fala é a narração da casa, palavra por palavra. A página diz exatamente isso;
//   · "In our October tests the 35-second option ran 45–50 seconds": os 3 filmes de teste de 06/10 mediram 39,8 / 43,4 /
//     45,8 s — a faixa não bate, então a frase saiu (volta com o número que a sessão CEO confirmar).
// Módulo PURO (só imports relativos de módulos puros): o guardião scripts/test-s25-abre-2026-10-06.mjs o executa isolado.
import { ANNUAL_PRICES, TIER_CREDITS, TIER_PRICES, formatCheckoutMoney, type CheckoutTier } from '../checkoutPricing'
import { creditCostForDuration } from '../credits/engineCost'
import { SEEDANCE_DURATIONS, supportedDurationsFor } from '../durationByEngine'
import { PLANS } from '../pricing'

export const S25_PAGE_SLUG = 'seedance-2-5'
/** A opção que a página destaca ("the 35-second option", texto da sessão CEO) e a referência de 60 s da casa. */
export const S25_FEATURED_SECONDS = 35
export const S25_REFERENCE_SECONDS = 60
/** A frase do Enhance (sessão CEO, 06/10): o botão do filme pronto, nunca "incluso". */
export const S25_ENHANCE_LINE = 'Enhance available with one click'
const PAID_TIERS: readonly CheckoutTier[] = ['starter', 'basic', 'pro']

/** Créditos de um filme do 2.5 nesta duração — a função do cobrador. */
export function s25FilmCredits(seconds: number): number {
  return creditCostForDuration('cinematic_s25', true, seconds)
}

/** ≈ US$ de N créditos no plano: mensal = preço ÷ créditos; anual = (preço do ano ÷ 12) ÷ créditos do mês. */
export function creditsToUsd(credits: number, tier: CheckoutTier, billing: 'monthly' | 'annual'): string {
  const centsPerMonth = billing === 'annual' ? ANNUAL_PRICES[tier].usd / 12 : TIER_PRICES[tier].usd
  return formatCheckoutMoney('usd', Math.round((credits * centsPerMonth) / TIER_CREDITS[tier]))
}

// KINEO-MOTORES-GEO-2026-10-06 — a tabela "quanto custa por vídeo / quantos por plano" é a da camada citável
// (components/EngineCitationAnswer EnginePriceCard, com ENGINE_GEO['seedance-2-5']) — uma tabela, a mesma régua das
// outras páginas de motor. Aqui fica só o que é desta página (texto da sessão CEO e a comparação com a Pika).

const juntaPlanos = (nomes: string[]): string => (nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} and ${nomes[nomes.length - 1]}`)

export interface S25PageFacts {
  cr35: number
  cr60: number
  usd35Creator: string
  usd35CreatorAnnual: string
  creatorName: string
  creatorPrice: string
  creatorCredits: number
  studioName: string
  /** Planos cujo mês paga o filme de 35 s E o de 60 s. */
  plansForBoth: string[]
  /** Planos que não pagam o de 35 s, com o filme mais curto do 2.5 que cabe (≥ 1 por mês). */
  shortOnly: Array<{ name: string; credits: number; seconds: number; filmCredits: number; count: number }>
  seedance15: { seconds: number; credits: number; starterName: string; starterPrice: string; starterFilms: number }
}

export function s25PageFacts(): S25PageFacts {
  const cr35 = s25FilmCredits(S25_FEATURED_SECONDS)
  const cr60 = s25FilmCredits(S25_REFERENCE_SECONDS)
  const shortest = Math.min(...supportedDurationsFor('s25'))
  const crShort = s25FilmCredits(shortest)
  const seedanceSeconds = SEEDANCE_DURATIONS[0]
  const seedanceCredits = creditCostForDuration('cinematic_ai', true, seedanceSeconds)
  return {
    cr35,
    cr60,
    usd35Creator: creditsToUsd(cr35, 'basic', 'monthly'),
    usd35CreatorAnnual: creditsToUsd(cr35, 'basic', 'annual'),
    creatorName: PLANS.basic.name,
    creatorPrice: formatCheckoutMoney('usd', TIER_PRICES.basic.usd),
    creatorCredits: TIER_CREDITS.basic,
    studioName: PLANS.pro.name,
    plansForBoth: PAID_TIERS.filter((t) => TIER_CREDITS[t] >= Math.max(cr35, cr60)).map((t) => PLANS[t].name),
    shortOnly: PAID_TIERS.filter((t) => TIER_CREDITS[t] < cr35 && TIER_CREDITS[t] >= crShort).map((t) => ({
      name: PLANS[t].name, credits: TIER_CREDITS[t], seconds: shortest, filmCredits: crShort, count: Math.floor(TIER_CREDITS[t] / crShort),
    })),
    seedance15: {
      seconds: seedanceSeconds,
      credits: seedanceCredits,
      starterName: PLANS.starter.name,
      starterPrice: formatCheckoutMoney('usd', TIER_PRICES.starter.usd),
      starterFilms: Math.floor(TIER_CREDITS.starter / seedanceCredits),
    },
  }
}

// ═══ Pika — fatos de TERCEIRO, com data. Conferidos na página oficial (https://pika.art/pricing) em 06/10/2026, além dos
// dois artigos que a sessão CEO trouxe (eesel.ai/blog/pika-ai-pricing, magichour.ai/blog/pika-labs-pricing). O que NÃO
// bateu com a página oficial SAIU: o plano de entrada hoje se chama "Starter" (o "Standard" é o nome antigo) e a página
// oficial diz "No watermark" nele — então NÃO afirmamos marca d'água. Fica: US$ 10/mês (US$ 8/mês no anual), licença
// comercial "Not included" no Starter, e a saída em clipes curtos. Créditos e resolução da Pika: nunca cravados aqui.
export const PIKA_CHECKED_ON = 'October 6, 2026'
export const PIKA_PRICING_URL = 'https://pika.art/pricing'
export const PIKA_ENTRY = { plan: 'Starter', monthly: '$10', annualPerMonth: '$8' } as const
/** A frase de uso comercial da Pika — só pode aparecer junto de PIKA_CHECKED_ON (o guardião confere). */
export const PIKA_COMMERCIAL_LINE = `Not included on the ${PIKA_ENTRY.monthly}/month ${PIKA_ENTRY.plan} plan`

export interface S25PikaRow { label: string; pika: string; kineo: string }

export function s25PikaRows(f: S25PageFacts = s25PageFacts()): S25PikaRow[] {
  return [
    { label: 'What you get', pika: 'Short clips you assemble yourself', kineo: 'A finished film ready to post' },
    { label: 'Narration and captions', pika: 'You add them', kineo: 'Included' },
    { label: 'Commercial use', pika: PIKA_COMMERCIAL_LINE, kineo: 'Included on every plan' },
    {
      label: 'Entry price',
      pika: `${PIKA_ENTRY.plan} ≈ ${PIKA_ENTRY.monthly}/month (${PIKA_ENTRY.annualPerMonth}/month billed yearly), for clips`,
      kineo: `${f.cr35} credits per ${S25_FEATURED_SECONDS}-second film on ${f.creatorName} (${f.creatorPrice}/month, ${f.creatorCredits} credits) or ${f.studioName}`,
    },
  ]
}

export interface S25PageCopy {
  h1: string
  lead: string
  availability: string
  moreFilms: string
  ctaLine: string
  metaTitle: string
  metaDescription: string
  faq: { q: string; a: string }[]
}

/** O texto da página, montado dos fatos acima (a página e o catálogo leem daqui). */
export function s25PageCopy(f: S25PageFacts = s25PageFacts()): S25PageCopy {
  const h1 = 'Seedance 2.5 online — finished films, not just clips'
  const shortLine = f.shortOnly
    .map((p) => ` On ${p.name} (${p.credits} credits a month) it fits ${p.count === 1 ? 'one' : p.count} ${p.seconds}-second film${p.count === 1 ? '' : 's'} (${p.filmCredits} credits).`)
    .join('')
  const moreFilmsShort = `Seedance 1.5 films start at ${f.seedance15.credits} credits (${f.seedance15.seconds} seconds)`
  return {
    h1,
    lead:
      `Use Seedance 2.5 on Kineo to turn one sentence into a finished film — every scene generated by Seedance 2.5, plus narration, captions, music and the edit — ` +
      `for ${f.cr35} credits for the ${S25_FEATURED_SECONDS}-second option (about ${f.usd35Creator} on the ${f.creatorName} plan, about ${f.usd35CreatorAnnual} on the annual plan).`,
    // "On paid plans; the free trial does not include it" vem logo abaixo, na nota de acesso da camada citável (geo.accessNote).
    availability: `Seedance 2.5 needs ${f.cr35} credits (${S25_FEATURED_SECONDS} s) or ${f.cr60} credits (${S25_REFERENCE_SECONDS} s), so those films run on ${juntaPlanos(f.plansForBoth)}.${shortLine}`,
    moreFilms: `${moreFilmsShort} — ${f.seedance15.starterFilms} films a month on the ${f.seedance15.starterPrice} ${f.seedance15.starterName} plan.`,
    ctaLine: 'Type one sentence. Get a finished 60-second video — voice, captions and music included — in minutes.',
    metaTitle: `${h1} | Kineo`,
    metaDescription: `Seedance 2.5 on Kineo: one sentence becomes a finished film with narration, captions and music — ${f.cr35} credits for ${S25_FEATURED_SECONDS} seconds, ${f.cr60} for ${S25_REFERENCE_SECONDS}. On paid plans; not in the free trial.`,
    // KINEO-MOTORES-GEO-2026-10-06 — "onde usar + quanto custa" e "é mais barato direto?" vêm da camada citável
    // (ENGINE_GEO['seedance-2-5'], lib/seo/engineCitation.ts, versão só plano pago e sem clipe); aqui, o resto da sessão CEO.
    faq: [
      {
        q: 'Is it the real Seedance 2.5?',
        a: "Yes — every scene is generated by Seedance 2.5 through fal.ai. Kineo adds the script direction, narration, captions, music and the edit. Kineo turns the model's own audio off, so the voice you hear is Kineo's narration of your script, word for word.",
      },
      {
        q: 'Why does it cost more than Seedance 1.5?',
        a: `It's a newer, heavier model that costs more per second to render. For more films per month, ${moreFilmsShort}.`,
      },
      {
        q: 'Is Enhance included?',
        a: `The film comes out with the original Seedance 2.5 scenes. ${S25_ENHANCE_LINE} on the finished film, whenever you want it.`,
      },
      {
        q: 'Can I use the videos commercially?',
        a: 'Yes, on every plan — see the terms.',
      },
    ],
  }
}
