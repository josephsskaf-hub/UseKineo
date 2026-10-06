// KINEO-PRECOS-DOIS-PRODUTOS-2026-10-05 — o /pricing com DOIS produtos (decisão do fundador, 04/10):
//   PRODUTO 1 = CLIPES (porta de entrada) — "Clips — per second": um clipe, uma cena, sem narração;
//   PRODUTO 2 = FILME NARRADO (premium)  — "Narrated films — per film": o que a casa sempre vendeu.
//
// NENHUM NÚMERO DIGITADO. Cada célula sai da MESMA função que a rota cobra:
//   · clipe  → lib/clips/clipPricing.ts clipCreditCost (que já respeita CLIP_PRECO_MERCADO_PUBLIC) nas durações REAIS de
//              lib/clips/clipCatalog.ts (Veo não faz 5/10 s: mostra 6/8 s — selo honesto, nunca "5 s" para entregar 6);
//   · filme  → lib/credits/engineCost.ts creditCostForDuration(qualidade do filme do motor, pago, segundos), só nas
//              durações que lib/durationByEngine.ts supportedDurationsFor diz que o servidor aceita (30 s só na estrada
//              hollywood; o Seedance 1.5 não tem 30). A qualidade do filme de cada motor é CLIP_COSTS[motor].filmQuality —
//              o mesmo espelho que o guardião dos clipes confere contra creditCostFor. Se o Seedance subir de 25 para 35
//              cr/60 s (branch do CEO codex/seedance-35cr-0410), esta tabela acompanha sozinha;
//   · "≈ US$" → créditos × US$/crédito do Creator, que o componente DERIVA de TIER_PRICES.basic / TIER_CREDITS.basic;
//   · "quanto cada plano faz" → floor(créditos do plano ÷ custo), com os créditos de TIER_CREDITS.
// Quem pode ver cada motor (pausa, Seedance 2.5 interno, durações curtas) chega de fora (lib/engineLaunch.ts no
// componente): este módulo é PURO — só imports RELATIVOS de módulos puros — e o guardião
// scripts/test-precos-dois-produtos-2026-10-05.mjs o executa isolado.
//
// INTERRUPTOR: PRECOS_DOIS_PRODUTOS_PUBLIC=false → a página de preços que o público vê HOJE não muda (decisão do
// fundador). true → as duas tabelas aparecem logo abaixo de "One-time credits" no /pricing.
import { CLIP_ENGINES, CLIP_ENGINE_ORDER, nearestAcceptedSeconds, offeredSecondsFor, type ClipEngineKey } from './clips/clipCatalog'
import { CLIP_COSTS, clipCreditCost } from './clips/clipPricing'
import { creditCostForDuration, type Quality } from './credits/engineCost'
import { SHORT_TARGETS_NEW, isSeedance15, supportedDurationsFor } from './durationByEngine'

export const PRECOS_DOIS_PRODUTOS_PUBLIC = true // fundador 05/10: ligar tudo

/** Colunas da tabela de clipes (alvo; a célula mostra o valor REAL que o motor entrega). */
export const TWO_PRODUCTS_CLIP_TARGETS: readonly number[] = [5, 10]
/** Colunas da tabela de filmes. */
export const TWO_PRODUCTS_FILM_SECONDS: readonly number[] = [15, 30, 60, 90]
/** Duração de referência do "quanto cada plano faz". */
export const TWO_PRODUCTS_PLAN_CLIP_TARGET = 5
export const TWO_PRODUCTS_PLAN_FILM_SECONDS = 60

export interface TwoProductsPlan {
  tier: 'starter' | 'basic' | 'pro'
  label: string
  usdCentsMonthly: number
  credits: number
}

export interface TwoProductsVisibility {
  /** O motor aparece no catálogo público (não pausado; Seedance 2.5 só com S25_PUBLIC). */
  engineListed: (engine: ClipEngineKey) => boolean
  /** KINEO-S25-ABRE-2026-10-06 — o CLIPE avulso do motor está à venda para o público? Ausente = a mesma régua de engineListed.
   *  Existe porque o filme do Seedance 2.5 abriu (só para quem paga) e o clipe dele não (segue só da casa, s25ClipVisible). */
  clipListed?: (engine: ClipEngineKey) => boolean
  /** DURACOES_CURTAS_PUBLIC (15/30 s fora do Seedance). */
  shortDurations: boolean
  /** SEEDANCE_15S_PUBLIC (15 s do Seedance 1.5). */
  seedance15s: boolean
}

export interface PriceCell {
  seconds: number
  credits: number
  usdCents: number
}

export interface ClipRow {
  engine: ClipEngineKey
  label: string
  /** Uma célula por alvo de TWO_PRODUCTS_CLIP_TARGETS (null = o motor não chega perto do alvo). */
  cells: (PriceCell | null)[]
}

export interface FilmRow {
  engine: ClipEngineKey
  label: string
  quality: Quality
  /** Uma célula por coluna de TWO_PRODUCTS_FILM_SECONDS (null = duração que o motor não aceita). */
  cells: (PriceCell | null)[]
}

export interface PlanYield {
  tier: TwoProductsPlan['tier']
  label: string
  credits: number
  clips: { cheapest: { engine: string; seconds: number; count: number } | null; priciest: { engine: string; seconds: number; count: number } | null }
  films: { cheapest: { engine: string; count: number } | null; priciest: { engine: string; count: number } | null }
}

export interface TwoProductsModel {
  usdPerCredit: number
  clips: ClipRow[]
  films: FilmRow[]
  plans: PlanYield[]
}

const cell = (seconds: number, credits: number, usdPerCredit: number): PriceCell => ({
  seconds,
  credits,
  usdCents: Math.round(credits * usdPerCredit * 100),
})

/** Duração REAL do clipe para o alvo da coluna, só se o motor a oferece. */
export function clipSecondsForTarget(engine: ClipEngineKey, target: number): number | null {
  const real = nearestAcceptedSeconds(CLIP_ENGINES[engine].falSeconds, target)
  return real !== null && offeredSecondsFor(engine).includes(real) ? real : null
}

/** Durações de filme que o servidor aceita E que a tela mostra para o público. */
export function filmSecondsFor(engine: ClipEngineKey, vis: TwoProductsVisibility): number[] {
  const accepted = supportedDurationsFor(engine)
  return accepted.filter((s) => {
    if (isSeedance15(engine)) return s >= 35 || vis.seedance15s
    return !(SHORT_TARGETS_NEW as readonly number[]).includes(s) || vis.shortDurations
  })
}

export function buildTwoProductsModel(args: { creator: TwoProductsPlan; plans: readonly TwoProductsPlan[]; visibility: TwoProductsVisibility }): TwoProductsModel {
  const usdPerCredit = args.creator.usdCentsMonthly / 100 / args.creator.credits
  const engines = CLIP_ENGINE_ORDER.filter((engine) => args.visibility.engineListed(engine))
  const clipListed = args.visibility.clipListed ?? (() => true) // KINEO-S25-ABRE-2026-10-06

  const clips: ClipRow[] = engines.filter((engine) => clipListed(engine)).map((engine) => ({
    engine,
    label: CLIP_ENGINES[engine].label,
    cells: TWO_PRODUCTS_CLIP_TARGETS.map((target) => {
      const seconds = clipSecondsForTarget(engine, target)
      return seconds === null ? null : cell(seconds, clipCreditCost(engine, seconds, false), usdPerCredit)
    }),
  }))

  const films: FilmRow[] = engines.map((engine) => {
    const quality = CLIP_COSTS[engine].filmQuality as Quality
    const offered = filmSecondsFor(engine, args.visibility)
    return {
      engine,
      label: CLIP_ENGINES[engine].label,
      quality,
      cells: TWO_PRODUCTS_FILM_SECONDS.map((seconds) =>
        offered.includes(seconds) ? cell(seconds, creditCostForDuration(quality, true, seconds), usdPerCredit) : null,
      ),
    }
  })

  const clipRef = clips
    .map((row) => {
      const seconds = clipSecondsForTarget(row.engine, TWO_PRODUCTS_PLAN_CLIP_TARGET)
      return seconds === null ? null : { engine: row.label, seconds, credits: clipCreditCost(row.engine, seconds, false) }
    })
    .filter((x): x is { engine: string; seconds: number; credits: number } => x !== null)
  const filmRef = films
    .filter((row) => filmSecondsFor(row.engine, args.visibility).includes(TWO_PRODUCTS_PLAN_FILM_SECONDS))
    .map((row) => ({ engine: row.label, credits: creditCostForDuration(row.quality, true, TWO_PRODUCTS_PLAN_FILM_SECONDS) }))
  const pick = <T extends { credits: number }>(list: T[], dir: 1 | -1): T | null =>
    list.reduce<T | null>((best, x) => (best === null || (x.credits - best.credits) * dir < 0 ? x : best), null)
  const clipLow = pick(clipRef, 1)
  const clipHigh = pick(clipRef, -1)
  const filmLow = pick(filmRef, 1)
  const filmHigh = pick(filmRef, -1)

  const plans: PlanYield[] = args.plans.map((plan) => ({
    tier: plan.tier,
    label: plan.label,
    credits: plan.credits,
    clips: {
      cheapest: clipLow ? { engine: clipLow.engine, seconds: clipLow.seconds, count: Math.floor(plan.credits / clipLow.credits) } : null,
      priciest: clipHigh ? { engine: clipHigh.engine, seconds: clipHigh.seconds, count: Math.floor(plan.credits / clipHigh.credits) } : null,
    },
    films: {
      cheapest: filmLow ? { engine: filmLow.engine, count: Math.floor(plan.credits / filmLow.credits) } : null,
      priciest: filmHigh ? { engine: filmHigh.engine, count: Math.floor(plan.credits / filmHigh.credits) } : null,
    },
  }))

  return { usdPerCredit, clips, films, plans }
}
