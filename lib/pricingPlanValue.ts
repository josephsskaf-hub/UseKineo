// KINEO-PRECOS-CARTAO-VALOR-2026-10-09 — o que cada plano COMPRA, em coisas, dentro do cartão do /pricing.
//
// Pedido do fundador (09/10, ~01h BRT, com os prints da InVideo ao lado do nosso cartão): "mostrar quantos clipes a gente
// consegue fazer com cada motor, quantas imagens do Nano Banana... se a decisão está ficando no preço, a gente tem que deixar
// mais claro o que a gente entrega pelo aquele valor". A InVideo põe no topo do cartão "190 credits/mo = 76 Nano Banana Pro
// generations ~ 7 Seedance 2 fast videos"; o nosso cartão abria com "1 film of 60s OR 12 clips of 5s" e letra miúda.
//
// NENHUM NÚMERO DIGITADO. Cada linha sai das funções que a rota cobra, pelo modelo que o /pricing já usa nas tabelas de
// "Clips — per second" e "Narrated films — per film" (lib/pricingTwoProducts.ts buildTwoProductsModel → clipCreditCost e
// creditCostForDuration, só nos motores e durações que o público vê). A imagem chega por argumento (o custo do Nano Banana
// Pro é o da rota /api/images/generate; o espelho é lib/marketingPrice.ts IMG_NANOBANANA_CR, e o guardião confere os dois).
// Contagem = floor(créditos do plano ÷ custo): "≈" na tela porque o pool é um só e a pessoa mistura.
//
// MÓDULO PURO (só import relativo de módulo puro): o guardião scripts/test-precos-cartao-valor-2026-10-09.mjs o executa
// isolado, com o modelo real.
import { TWO_PRODUCTS_CLIP_TARGETS, TWO_PRODUCTS_FILM_SECONDS, type TwoProductsModel } from './pricingTwoProducts'

/** A ordem do cartão: os motores que vendem primeiro (o topo do catálogo é o motivo de assinar). */
export const PLAN_VALUE_CLIP_ORDER: readonly string[] = ['hollywood', 'veo', 's25', 'kling', 'h3', 'seedance', 'omni']
/** Quantas linhas de clipe o cartão mostra (o resto mora na tabela completa logo abaixo). */
export const PLAN_VALUE_CARD_CLIP_LINES = 3
/** O clipe de referência do cartão (o alvo; a duração REAL vem do motor — o Veo entrega 6 s). */
export const PLAN_VALUE_CLIP_TARGET = 5
/** O filme de referência do cartão. */
export const PLAN_VALUE_FILM_SECONDS = 60

export interface PlanValueClip {
  engine: string
  label: string
  seconds: number
  creditsEach: number
  count: number
}

export interface PlanValueFilm {
  engine: string
  label: string
  seconds: number
  creditsEach: number
  count: number
}

export interface PlanValue {
  credits: number
  images: { label: string; creditsEach: number; count: number }
  /** Todos os clipes visíveis, na ordem do cartão. */
  clips: PlanValueClip[]
  /** Todos os filmes de 60 s visíveis, do mais barato ao mais caro. */
  films: PlanValueFilm[]
}

const rank = (engine: string) => {
  const i = PLAN_VALUE_CLIP_ORDER.indexOf(engine)
  return i < 0 ? PLAN_VALUE_CLIP_ORDER.length : i
}

/** O que `credits` compra por mês: imagens Nano Banana Pro, clipes por motor e filmes de 60 s por motor. */
export function planValueFor(credits: number, model: TwoProductsModel, image: { label: string; creditsEach: number }): PlanValue {
  const safeCredits = Number.isFinite(credits) && credits > 0 ? Math.floor(credits) : 0
  const clipCol = TWO_PRODUCTS_CLIP_TARGETS.indexOf(PLAN_VALUE_CLIP_TARGET)
  const filmCol = TWO_PRODUCTS_FILM_SECONDS.indexOf(PLAN_VALUE_FILM_SECONDS)
  const count = (each: number) => (each > 0 ? Math.floor(safeCredits / each) : 0)

  const clips: PlanValueClip[] = model.clips
    .map((row): PlanValueClip | null => {
      const cell = clipCol >= 0 ? row.cells[clipCol] : null
      return cell ? { engine: row.engine, label: row.label, seconds: cell.seconds, creditsEach: cell.credits, count: count(cell.credits) } : null
    })
    .filter((x): x is PlanValueClip => x !== null)
    .sort((a, b) => rank(a.engine) - rank(b.engine))

  const films: PlanValueFilm[] = model.films
    .map((row): PlanValueFilm | null => {
      const cell = filmCol >= 0 ? row.cells[filmCol] : null
      return cell ? { engine: row.engine, label: row.label, seconds: cell.seconds, creditsEach: cell.credits, count: count(cell.credits) } : null
    })
    .filter((x): x is PlanValueFilm => x !== null)
    .sort((a, b) => a.creditsEach - b.creditsEach)

  return {
    credits: safeCredits,
    images: { label: image.label, creditsEach: image.creditsEach, count: count(image.creditsEach) },
    clips,
    films,
  }
}

/** As linhas do cartão: imagens, os N primeiros clipes (só os que o plano paga ≥ 1) e o filme de 60 s mais barato. */
export function planValueCardLines(value: PlanValue): { images: PlanValue['images']; clips: PlanValueClip[]; film: PlanValueFilm | null } {
  return {
    images: value.images,
    clips: value.clips.filter((c) => c.count >= 1).slice(0, PLAN_VALUE_CARD_CLIP_LINES),
    film: value.films.find((f) => f.count >= 1) ?? null,
  }
}
