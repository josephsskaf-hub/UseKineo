// sprint-assinaturas #20 — o e-mail `downgraded_loss` para quem QUEIMOU o trial
// inteiro e tem filme entregue.
//
// O caso (zareshahi0, chatgpt.com, 02/09): 1o video do trial em Seedance 60s =
// 25cr = o trial inteiro. `trial_expired credit_cap` aos 4 min de conta, filme
// na Library as 08:15 UTC (Fase 3 do cron), e as 08:25 o e-mail de perda —
// "Here's what you just lost access to" — 10 minutos DEPOIS de a pessoa ter,
// pela 1a vez, um filme de 62s pronto nas maos. Medido 14d (externos): 401
// `downgraded_loss` enviados, 36 para quem bateu no teto de credito e 29 desses
// com video entregue; 4 checkouts depois do e-mail, 1 pagante. E o lead mais
// quente da casa (gastou tudo E recebeu) lendo uma lista de perdas.
//
// Este modulo e a parte pura: (1) decidir quem esta nesse caso — so linha
// 'downgraded' (revogacao provada), concessao > 0, gasto >= concessao e >= 1
// video em `videos`; (2) quantos filmes COMO ESSE cada plano compra por mes,
// derivado de TIER_CREDITS e do custo REAL do ultimo filme (nunca digitado);
// (3) o substantivo honesto ("62-second film" so quando a duracao existe).
// Sem preco literal (regra do cron: /pricing resolve a moeda), sem cupom, sem
// credito, sem mudanca de trial. Falha fechada: qualquer duvida = e-mail de
// hoje, byte a byte.
import { TIER_CREDITS, type CheckoutTier } from '@/lib/checkoutPricing'

/** sprint-assinaturas #21: 'offer_with_film' e o corpo do D5 (COMEBACK50)
 *  para quem tem video entregue — o D5 padrao grava 'standard'. */
export type LossBody = 'never_ran' | 'burned_with_film' | 'standard' | 'offer_with_film'

export interface BurnedWithFilmInput {
  status: string
  granted: number
  used: number
  videosMade: number
}

/** true = a revogacao aconteceu ('downgraded'), houve concessao, o gasto
 *  chegou (ou passou) a concessao e existe >= 1 video entregue. */
export function isBurnedWithFilm(input: BurnedWithFilmInput): boolean {
  if (input.status !== 'downgraded') return false
  if (!Number.isFinite(input.granted) || input.granted <= 0) return false
  if (!Number.isFinite(input.used) || input.used < input.granted) return false
  return Number.isFinite(input.videosMade) && input.videosMade >= 1
}

export interface FilmPlanRow {
  tier: CheckoutTier
  name: string
  credits: number
  films: number
}

const TIER_NAMES: Record<CheckoutTier, string> = { starter: 'Starter', basic: 'Creator', pro: 'Studio' }

/** Custo saneado do filme: inteiro >= 1, ou null quando desconhecido (0/NaN/
 *  negativo) — null significa "nao afirme nada sobre filmes por plano". */
export function sanitizeFilmCost(cost: unknown): number | null {
  if (typeof cost !== 'number' || !Number.isFinite(cost)) return null
  const n = Math.floor(cost)
  return n >= 1 ? n : null
}

/** Quantos filmes ao custo informado cada plano compra por mes (grant mensal
 *  TIER_CREDITS). Null quando o custo e desconhecido ou quando NENHUM plano
 *  compra ao menos 1 — uma linha "Starter: 0 films" venderia contra nos. */
export function filmsPerPlan(cost: unknown): FilmPlanRow[] | null {
  const c = sanitizeFilmCost(cost)
  if (c === null) return null
  const rows = (['starter', 'basic', 'pro'] as CheckoutTier[]).map((tier) => ({
    tier,
    name: TIER_NAMES[tier],
    credits: TIER_CREDITS[tier],
    films: Math.floor(TIER_CREDITS[tier] / c),
  }))
  if (rows.every((r) => r.films < 1)) return null
  return rows
}

/** "62-second film" quando a duracao e conhecida (inteiro >= 1s); "film"
 *  caso contrario. Nunca inventa segundos. */
export function filmNoun(durationSeconds: unknown): string {
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds)) return 'film'
  const s = Math.round(durationSeconds)
  return s >= 1 ? `${s}-second film` : 'film'
}

/** Linha de plano no plural certo: "Starter — 1 film like that a month". */
export function filmPlanLine(row: FilmPlanRow): string {
  return `${row.name} — ${row.films} ${row.films === 1 ? 'film' : 'films'} like that a month`
}

/** Qual corpo o `downgraded_loss` manda — gravado no evento para que a
 *  medicao saiba o que a pessoa LEU (o #19 nao conseguiu provar qual saiu). */
export function lossBodyFor(input: { neverRan: boolean; burnedWithFilm: boolean }): LossBody {
  if (input.neverRan) return 'never_ran'
  if (input.burnedWithFilm) return 'burned_with_film'
  return 'standard'
}
