// KINEO-CORTESIA-2026-10-03 — CONTA CORTESIA: regra pura (sem imports), uma fonte para a rota do admin, o cron de
// validade, o pacote de demonstração dos parceiros (lib/partnerPack.ts) e o placar do admin.
//
// O BURACO (medido 02/10): crédito dado por /api/admin/grant-credits só soma saldo. A conta free continua recusada nos
// motores (app/api/generate-video-cinematic/route.ts: `isPaidUser = has_paid || PAID_PLANS.has(plan)`), então o
// "presente" virava saldo que não roda Seedance/Kling/Veo. O remendo era trocar o plano à mão para *_trial — sem
// rastro, sem data de fim, sem plano anterior guardado, e contando como trial de $1 no painel.
//
// O QUE A CORTESIA É:
//   · nível SÓ creator_trial ou studio_trial (nunca plano cheio: plano cheio é o que a Stripe vende e o que o
//     painel conta como pagante/MRR — isPayingPlan() em app/api/admin/_shared/mrr.ts já exclui *_trial);
//   · créditos + validade em dias + motivo obrigatório; grava o plano anterior e a data de fim (courtesy_grants);
//   · só para conta SEM plano (free/nulo): cortesia por cima de assinante rebaixaria quem paga;
//   · fora do MRR, de "pagantes", das cartas de cobrança e de renovação (as de cobrança/renovação nascem de evento da
//     Stripe; cortesia não tem assinatura) — e o placar do admin mostra o plano REAL (maskCourtesyPlans);
//   · vencida, o cron app/api/cron/courtesy-expire volta o plano anterior (dry-run por padrão).
//
// SALDO QUE SOBRA NO VENCIMENTO = DECISÃO DO FUNDADOR. Interruptor COURTESY_LEFTOVER_RULE abaixo. 'keep' (hoje) não
// mexe no saldo; 'remove_courtesy_leftover' (recomendação) tira só o que sobrou DA CORTESIA — o saldo que a pessoa já
// tinha antes fica, e quem virou pagante no meio nunca perde crédito.

export const COURTESY_LEVELS = ['creator_trial', 'studio_trial'] as const
export type CourtesyLevel = (typeof COURTESY_LEVELS)[number]

/** Teto de créditos por cortesia (um Kling 3 ≈ 150cr; a demonstração cabe folgada). */
export const COURTESY_MAX_CREDITS = 300
/** Teto de validade em dias. */
export const COURTESY_MAX_DAYS = 90
/** Teto de vencimentos por rodada do cron. */
export const COURTESY_EXPIRE_MAX_PER_RUN = 50

export type CourtesyLeftoverRule = 'keep' | 'remove_courtesy_leftover'
/** ⚠ DECISÃO DO FUNDADOR — ver o topo. Recomendação: 'remove_courtesy_leftover'. */
export const COURTESY_LEFTOVER_RULE: CourtesyLeftoverRule = 'remove_courtesy_leftover' // fundador aprovou 05/10 (decisão I)

export type CourtesySource = 'admin' | 'partner_pack'
export type CourtesyStatus = 'active' | 'expired' | 'superseded' | 'revoked'

export interface CourtesyGrantRow {
  id: string
  user_id: string
  level: string
  previous_plan: string | null
  credits_granted: number
  credits_before: number
  had_paid_before: boolean
  ends_at: string
  status: string
}

export interface CourtesyProfile {
  id: string
  plan: string | null
  video_credits: number | null
  has_paid?: boolean | null
}

const norm = (v: string | null | undefined) => (v ?? '').toString().trim().toLowerCase()

export function isCourtesyLevel(v: unknown): v is CourtesyLevel {
  return typeof v === 'string' && (COURTESY_LEVELS as readonly string[]).includes(v)
}

/** Conta sem plano nenhum (free ou nulo) — a única que pode receber cortesia. */
export function isPlanlessAccount(plan: string | null | undefined): boolean {
  const p = norm(plan)
  return p === '' || p === 'free'
}

export type CourtesyRequest = { level: CourtesyLevel; credits: number; days: number; reason: string }

export function validateCourtesyRequest(
  input: { level?: unknown; credits?: unknown; days?: unknown; reason?: unknown },
  profile: CourtesyProfile | null,
  activeGrant: boolean,
): { ok: true; value: CourtesyRequest } | { ok: false; error: string } {
  if (!isCourtesyLevel(input.level)) return { ok: false, error: `Nível inválido: só ${COURTESY_LEVELS.join(' ou ')} (nunca plano cheio).` }
  const credits = Number(input.credits)
  if (!Number.isInteger(credits) || credits < 0 || credits > COURTESY_MAX_CREDITS) {
    return { ok: false, error: `Créditos: inteiro de 0 a ${COURTESY_MAX_CREDITS}.` }
  }
  const days = Number(input.days)
  if (!Number.isInteger(days) || days < 1 || days > COURTESY_MAX_DAYS) {
    return { ok: false, error: `Validade: de 1 a ${COURTESY_MAX_DAYS} dias.` }
  }
  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
  if (reason.length < 3) return { ok: false, error: 'Escreva o motivo — ele fica no histórico.' }
  if (!profile) return { ok: false, error: 'Conta não encontrada.' }
  if (activeGrant) return { ok: false, error: 'Esta conta já tem uma cortesia ativa.' }
  if (!isPlanlessAccount(profile.plan)) {
    return { ok: false, error: `A conta já tem plano (${profile.plan}). Cortesia só para conta sem plano — nunca por cima de quem paga.` }
  }
  return { ok: true, value: { level: input.level, credits, days, reason: reason.slice(0, 500) } }
}

export function courtesyEndsAt(nowMs: number, days: number): string {
  return new Date(nowMs + days * 24 * 60 * 60 * 1000).toISOString()
}

/** Cortesia ainda dentro do prazo (o cron é quem devolve o plano; isto só lê o relógio). */
export function isCourtesyActive(grant: Pick<CourtesyGrantRow, 'status' | 'ends_at'> | null | undefined, nowMs: number): boolean {
  if (!grant || grant.status !== 'active') return false
  const end = Date.parse(grant.ends_at)
  return Number.isFinite(end) && end > nowMs
}

export type CourtesyExpiryPlan =
  | { action: 'wait' }
  | { action: 'supersede'; reason: 'plan_changed' }
  | { action: 'revert'; plan: string; creditsRemoved: number; balanceAfter: number; becamePaying: boolean }

/**
 * O que o cron faz com UMA cortesia. Nunca rebaixa quem trocou de plano no meio (comprou assinatura → 'supersede',
 * perfil intocado). Quem comprou pacote avulso no meio (has_paid virou true) volta ao plano anterior, mas não perde
 * crédito nenhum, qualquer que seja a regra.
 */
export function planCourtesyExpiry(
  grant: CourtesyGrantRow,
  profile: CourtesyProfile,
  nowMs: number,
  rule: CourtesyLeftoverRule = COURTESY_LEFTOVER_RULE,
): CourtesyExpiryPlan {
  if (grant.status !== 'active') return { action: 'wait' }
  const end = Date.parse(grant.ends_at)
  if (!Number.isFinite(end) || end > nowMs) return { action: 'wait' }
  if (norm(profile.plan) !== norm(grant.level)) return { action: 'supersede', reason: 'plan_changed' }
  const balance = typeof profile.video_credits === 'number' ? profile.video_credits : 0
  const becamePaying = profile.has_paid === true && grant.had_paid_before !== true
  let creditsRemoved = 0
  if (rule === 'remove_courtesy_leftover' && !becamePaying) {
    const leftover = balance - (grant.credits_before ?? 0)
    creditsRemoved = Math.max(0, Math.min(grant.credits_granted ?? 0, leftover))
  }
  const previous = norm(grant.previous_plan)
  return {
    action: 'revert',
    plan: isPlanlessAccount(previous) ? 'free' : previous,
    creditsRemoved,
    balanceAfter: balance - creditsRemoved,
    becamePaying,
  }
}

/**
 * Placar do admin: quem está em cortesia ativa aparece com o plano REAL de antes (free), nunca como trial de $1,
 * pagante ou MRR. Só mascara quando o plano do perfil ainda é o nível da cortesia (se a pessoa assinou no meio, o
 * plano dela é verdade e conta).
 */
export function maskCourtesyPlans<T extends { id: string; plan?: string | null }>(
  profiles: T[],
  activeGrants: Array<Pick<CourtesyGrantRow, 'user_id' | 'level' | 'previous_plan'>>,
): T[] {
  if (!activeGrants.length) return profiles
  const byUser = new Map(activeGrants.map((g) => [g.user_id, g]))
  return profiles.map((p) => {
    const g = byUser.get(p.id)
    if (!g || norm(p.plan) !== norm(g.level)) return p
    return { ...p, plan: isPlanlessAccount(g.previous_plan) ? 'free' : g.previous_plan }
  })
}
