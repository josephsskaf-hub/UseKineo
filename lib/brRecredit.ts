// KINEO-BRASIL-VOLTA-2026-10-03 — contas BR que nasceram 'region_paid_only' entre a saída B (29/09) e a volta do Brasil à
// lista (03/10). A política só age na CONCESSÃO do trial (lib/reverseTrial.ts), então quem se cadastrou nesse intervalo
// ficou com 0 crédito mesmo depois de o BR voltar. A rota admin app/api/admin/br-recredit lista quem seria recreditado e
// quanto custaria — DRY-RUN por padrão; só aplica com ?confirm=APPLY. Aplicar é decisão do fundador.
//
// MÓDULO PURO (sem import): o guardião executa a régua.

export const BR_RECREDIT_SINCE_ISO = '2026-09-29T00:00:00.000Z'
export const BR_RECREDIT_CONFIRM = 'APPLY'
/** Teto por chamada (proteção contra aplicar a base inteira por engano). */
export const BR_RECREDIT_MAX_PER_CALL = 200

export interface BrRecreditProfile {
  id: string
  trial_status: string | null
  has_paid: boolean | null
  plan: string | null
  video_credits: number | null
  created_at: string | null
}

/** Quem entra: país do evento de exclusão = BR, ainda region_paid_only, sem pagar, plano grátis, criado depois de 29/09. */
export function brRecreditEligible(p: BrRecreditProfile | null | undefined, excludedCountry: string | null | undefined): boolean {
  if (!p || typeof p.id !== 'string') return false
  if ((excludedCountry ?? '').trim().toUpperCase() !== 'BR') return false
  if (p.trial_status !== 'region_paid_only') return false
  if (p.has_paid === true) return false
  const plan = typeof p.plan === 'string' ? p.plan.trim().toLowerCase() : 'free'
  if (plan !== 'free' && plan !== '') return false
  const created = typeof p.created_at === 'string' ? Date.parse(p.created_at) : NaN
  return Number.isFinite(created) && created >= Date.parse(BR_RECREDIT_SINCE_ISO)
}

/**
 * O que o APPLY grava numa conta: o MESMO grant do trial de lib/reverseTrial.ts (trial_status 'active', fim pela variante,
 * +créditos do trial, trial_credits_granted), com a guarda compare-and-set em trial_status='region_paid_only' (nunca
 * sobrescreve um trial real nem quem pagou no meio do caminho).
 */
export function brRecreditPatch(args: { balance: number | null; grantCredits: number; variantDays: number; variant: string; now: number }): Record<string, unknown> {
  return {
    trial_status: 'active',
    trial_ends_at: new Date(args.now + args.variantDays * 24 * 60 * 60 * 1000).toISOString(),
    trial_variant: args.variant,
    video_credits: (args.balance ?? 0) + args.grantCredits,
    trial_credits_granted: args.grantCredits,
  }
}

/** Custo em créditos do recrédito (contas × créditos do trial) — o custo em US$ depende de quantos viram filme. */
export function brRecreditCreditsTotal(accounts: number, grantCredits: number): number {
  return Math.max(0, Math.floor(accounts)) * grantCredits
}
