// KINEO-PAUSA-VOLUNTARIA-1111 [fundador 11/11: "Pode fazer todas" — alternativa 2 de docs/MELHORIAS-RECEITA-E-CLIENTES-
// 2026-11-11.md]: na tela de cancelar ("Before you go", components/billing/CancelSaveFlow.tsx), depois do motivo, a opção
// "Pause for 1 month": 1 mês só, sem cobrança, os créditos ficam guardados, a cobrança volta sozinha no mês seguinte e a
// pessoa pode voltar antes. SÓ dentro do fluxo de cancelar (nunca botão solto: não tirar receita de quem pagaria parado).
// NÃO aprovado: crédito acumulando de um mês para o outro — continua "sem acúmulo" (lib/credits/renewalBalance.ts).
//
// O RECURSO DA STRIPE (docs.stripe.com/billing/subscriptions/pause-payment, lido em 11/11): `pause_collection` com
// behavior 'void' e `resumes_at`. A assinatura CONTINUA `active` (não precisa do modo flexível), as faturas geradas
// durante a pausa são anuladas (nenhuma cobrança, nenhum invoice.payment_succeeded → nenhuma renovação de créditos), e
// depois de `resumes_at` a cobrança volta sozinha. Voltar antes = tirar o pause_collection.
//
// O MÊS PAUSADO, NA PRÁTICA:
//   · a fatura da próxima renovação (fim do período pago) é anulada: nada cobrado;
//   · o plano e o saldo ficam como estão (sem renovação, o saldo não zera — "os créditos ficam guardados"); nenhum
//     crédito novo entra no mês pausado;
//   · `resumes_at` = fim do período + 3 dias (folga para a fatura de renovação nascer e ser anulada); a renovação
//     seguinte (fim do período + 1 mês) é cobrada normalmente e a renovação de sempre aplica a cota sem acúmulo;
//   · voltar antes do fim do período = a renovação de sempre acontece na data de sempre. Voltar depois que a fatura do
//     mês pausado já foi anulada não cobra nada na hora: a próxima cobrança segue na data marcada (para crédito na hora,
//     a recarga do assinante existe).
//
// Regras puras: a rota (app/api/billing/pausa-voluntaria), a tela e o guardião (scripts/test-pausa-voluntaria-1111.mjs)
// leem daqui.

/** Interruptor próprio. 'off' = a main (nada muda, nenhuma leitura) · 'internal' = SÓ a lista exata da casa vê, em
 *  conferência, e NADA muda na Stripe · 'public' = assinante elegível pausa de verdade. Nasce 'internal'. */
export type PausaVoluntariaRelease = 'off' | 'internal' | 'public'
export const PAUSA_VOLUNTARIA_1111_RELEASE: PausaVoluntariaRelease = 'internal'

export const PAUSA_VOLUNTARIA_VERSION = 'pausa_voluntaria_v1_1111' as const
export const PAUSA_VOLUNTARIA_API = '/api/billing/pausa-voluntaria'

/** Eventos de SERVIDOR (estão em SERVER_ONLY_EVENTS de app/api/events/route.ts). */
export const PAUSA_VOLUNTARIA_EVENTS = {
  offered: 'subscription_pause_offered',
  accepted: 'subscription_pause_accepted',
  resumed: 'subscription_pause_resumed',
} as const

/** Os motivos em que a pausa aparece (o "caro" já tem a troca para o Starter; "qualidade" tem o suporte). */
export const PAUSA_VOLUNTARIA_REASONS: readonly string[] = ['unused_credits', 'just_testing', 'other']

/** Uma pausa a cada 12 meses por pessoa. */
export const PAUSA_VOLUNTARIA_JANELA_DIAS = 365
/** Folga depois do fim do período para a fatura da renovação nascer e ser anulada. */
export const PAUSA_VOLUNTARIA_FOLGA_DIAS = 3

export type PausaBlock = 'no_subscription' | 'unknown_plan' | 'not_active' | 'annual' | 'canceling' | 'trial' | 'already_paused' | 'paused_recently' | 'no_period'

export interface PausaInput {
  tier: string | null
  inTrial: boolean
  hasStripeSubscription: boolean
  status: string | null
  interval: string | null
  cancelAtPeriodEnd: boolean
  /** a assinatura já tem pause_collection */
  pausedNow: boolean
  /** já pausou nos últimos 12 meses (evento de servidor); null = leitura falhou (não oferece) */
  pausedRecently: boolean | null
  /** fim do período pago (ISO) */
  periodEnd: string | null
}

export type PausaDecision =
  | { possible: true; resumesAt: string; skippedCharge: string; nextCharge: string }
  | { possible: false; block: PausaBlock }

const PAUSA_TIERS = ['starter', 'basic', 'pro']

/** Soma meses no calendário UTC (31/01 + 1 mês = último dia de fevereiro). */
export function addMonthsUtc(iso: string, months: number): string {
  const d = new Date(iso)
  const day = d.getUTCDate()
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, last))
  return target.toISOString()
}

/** Pode pausar? Só assinatura mensal da Stripe, ativa (não teste), sem cancelamento marcado, não pausada, sem pausa em
 *  12 meses, e com o fim do período conhecido. */
export function pausaDecision(i: PausaInput): PausaDecision {
  if (!i.hasStripeSubscription) return { possible: false, block: 'no_subscription' }
  if (!i.tier || !PAUSA_TIERS.includes(i.tier)) return { possible: false, block: 'unknown_plan' }
  if (i.inTrial || i.status === 'trialing') return { possible: false, block: 'trial' }
  if (i.status !== 'active') return { possible: false, block: 'not_active' }
  if (i.interval !== 'month') return { possible: false, block: 'annual' }
  if (i.cancelAtPeriodEnd) return { possible: false, block: 'canceling' }
  if (i.pausedNow) return { possible: false, block: 'already_paused' }
  if (i.pausedRecently !== false) return { possible: false, block: 'paused_recently' }
  const end = i.periodEnd ? Date.parse(i.periodEnd) : NaN
  if (!Number.isFinite(end)) return { possible: false, block: 'no_period' }
  const periodEnd = new Date(end).toISOString()
  return {
    possible: true,
    skippedCharge: periodEnd,
    resumesAt: new Date(end + PAUSA_VOLUNTARIA_FOLGA_DIAS * 86_400_000).toISOString(),
    nextCharge: addMonthsUtc(periodEnd, 1),
  }
}

/** Mostrar o cartão de pausa para este motivo? */
export function pausaParaMotivo(reason: string | null): boolean {
  return typeof reason === 'string' && PAUSA_VOLUNTARIA_REASONS.includes(reason)
}

/** Quem vê: 'real' = assinante elegível com 'public' · 'qa' = só a casa (lista exata, 'internal' ou 'public'), sem mexer
 *  na Stripe · 'hide' = o resto. 'off' = 'hide' para todos. */
export type PausaMode = 'real' | 'qa' | 'hide'
export function pausaMode(a: { release: PausaVoluntariaRelease; house: boolean; eligible: boolean }): PausaMode {
  if (a.release === 'off') return 'hide'
  if (a.release === 'public' && a.eligible) return 'real'
  if (a.house) return 'qa'
  return 'hide'
}

/** O pause_collection que a rota grava (behavior 'void' + resumes_at em segundos). */
export function pauseCollectionParams(resumesAtIso: string): { behavior: 'void'; resumes_at: number } {
  return { behavior: 'void', resumes_at: Math.floor(Date.parse(resumesAtIso) / 1000) }
}

/** Data curta em inglês (a tela é em inglês). */
export function pausaDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return new Date(t).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

// ── textos: a verdade, curta. Nada de "créditos acumulam". ──
export const PAUSA_VOLUNTARIA_COPY = {
  title: 'Pause for 1 month',
  body: 'No charge on {skipped}. You keep your plan and the {credits} credits in your balance — no new monthly credits during the pause. Billing restarts on its own on {next}, and you can come back earlier anytime.',
  cta: 'Pause my subscription',
  pausing: 'Pausing…',
  done: 'Done — your subscription is paused. No charge on {skipped}; billing restarts on {next}. Your credits stay in your balance.',
  pausedNow: 'Your subscription is paused until {until}. Your credits stay in your balance.',
  resumeCta: 'Resume now',
  resumed: 'Done — your subscription is active again. Your next charge is on the usual date.',
  qa: 'House check — nothing changes on Stripe',
  failed: "The pause didn't go through. Nothing was changed. Try again or email {email}.",
} as const

export function pausaFill(text: string, v: Record<string, string | number | null | undefined>): string {
  let out = text
  for (const [k, val] of Object.entries(v)) out = out.split(`{${k}}`).join(val === null || val === undefined ? '—' : String(val))
  return out
}
