// KINEO-MENU-CONTA-0411 — o que o menu da conta (components/AccountPanel.tsx) decide, sem React, para o guardião
// executar de verdade (scripts/test-menu-conta-0411.mjs). Módulo sem import: nada aqui toca rede nem preço.

/** Largura do menu no desktop; no celular cabe em 100vw - 24px. Pedido: 320 a 360 px. */
export const ACCOUNT_MENU_WIDTH_PX = 344

/** Linhas de navegação, nesta ordem. Language e Appearance são controles, não links: moram no componente. */
export const ACCOUNT_MENU_LINKS = [
  { id: 'videos', href: '/history', label: 'My videos', icon: 'M4 5.5h16v13H4zM10 9.5l5 2.5-5 2.5z' },
  { id: 'profile', href: '/account?tab=profile', label: 'Profile', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8c1.5-3.4 4.5-5.3 8-5.3s6.5 1.9 8 5.3' },
  { id: 'usage', href: '/account?tab=usage', label: 'Usage & activity', icon: 'M4 19.5V12M10 19.5V5.5M16 19.5V9M21 19.5H3.5' },
  { id: 'help', href: '/support', label: 'Help', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.8M12 17.2v.1' },
  { id: 'affiliate', href: '/affiliate', label: 'Affiliate program', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM14.8 9.2c-.5-1-1.5-1.5-2.8-1.5-1.6 0-2.8.8-2.8 2.1 0 3 5.8 1.5 5.8 4.5 0 1.3-1.3 2.1-3 2.1-1.4 0-2.5-.6-3-1.6M12 6v12' },
] as const

// `plan` aqui é o valor CRU de profiles.plan, que /api/credits devolve. /api/me/plan NÃO serve: ele achata Starter em
// 'basic' e Business em 'pro' (lib/plan.ts, para os portões de motor), e o menu dizia "Creator · 40 de 85" para quem
// assinou o Starter. Plano que ninguém reconhece fica sem nome: o antigo caía em "Free", que é afirmar algo falso.
const PLAN_NAME: Record<string, string> = {
  free: 'Free',
  starter: 'Starter', starter_trial: 'Starter trial',
  basic: 'Creator', basic_trial: 'Creator trial', creator: 'Creator', creator_trial: 'Creator trial',
  pro: 'Studio', pro_trial: 'Studio trial', studio: 'Studio', studio_trial: 'Studio trial',
  autopilot: 'Autopilot', autopilot_trial: 'Autopilot trial', autopilot_pilot: 'Autopilot pilot',
  business: 'Business', // KINEO-BUSINESS-84-2026-10-09
}

/** Só quem tem um plano acima para onde ir vê "Upgrade". Studio é o topo de /pricing; Autopilot e Business são outra trilha. */
const CAN_UPGRADE = new Set(['free', 'starter', 'starter_trial', 'basic', 'basic_trial'])

export function normalizeAccountPlan(plan: unknown): string | null {
  const key = typeof plan === 'string' ? plan.trim().toLowerCase() : ''
  return key || null
}

export function accountPlanName(plan: unknown): string | null {
  const key = normalizeAccountPlan(plan)
  return key && Object.prototype.hasOwnProperty.call(PLAN_NAME, key) ? PLAN_NAME[key] : null
}

export function accountPlanCanUpgrade(plan: unknown): boolean {
  const key = normalizeAccountPlan(plan)
  return key !== null && CAN_UPGRADE.has(key)
}

/** Tem assinatura, mesmo que a Stripe não diga a data (PayPal, Paddle, Stripe fora do ar). */
export function accountPlanIsSubscribed(plan: unknown): boolean {
  const key = normalizeAccountPlan(plan)
  return key !== null && key !== 'free' && accountPlanName(key) !== null
}

export interface AccountCreditMeter {
  /** O número. null = ainda não leu; quem decide "não consegui ler" é o componente, com o rótulo da casa. */
  left: number | null
  /** Só existe quando cabe: quem acumulou mais que o grant não lê "1489 / 280". */
  of: number | null
  /** Largura da barra em %, ou null quando não existe denominador honesto (conta grátis, trial, plano sem grant). */
  pct: number | null
  low: boolean
}

export function accountCreditMeter(credits: number | null, grant: number | null): AccountCreditMeter {
  if (credits === null) return { left: null, of: null, pct: null, low: false }
  if (!grant || grant <= 0) return { left: credits, of: null, pct: null, low: false }
  return {
    left: credits,
    of: credits <= grant ? grant : null,
    pct: Math.max(credits > 0 ? 2 : 0, Math.min(100, (credits / grant) * 100)),
    low: credits <= Math.max(5, grant * 0.15),
  }
}

export interface AccountSubscriptionFacts {
  renewsAt: string | null
  cancelsAtPeriodEnd: boolean
  status: string | null
}

export type AccountRenewalLine =
  | { kind: 'renews' | 'cancels'; at: Date }
  | { kind: 'due' }
  | { kind: 'active' }
  | null

// Só afirma sobre renovação quando a Stripe respondeu: um menu que chuta data de cobrança é pior que um menu calado
// (regra de KINEO-ACCOUNT-PANEL-2026-08-19). A data é o fim do período que a Stripe devolve, então a de um anual vem
// um ano à frente sem conta nenhuma aqui. O que veio de novo: "Renews" para quem está com a cobrança recusada, ou para
// assinatura já encerrada, era falso, e o painel antigo dizia.
export function accountRenewalLine(sub: AccountSubscriptionFacts | null, subscribed: boolean): AccountRenewalLine {
  if (!sub) return null // resposta ainda não chegou: nada de "Active subscription" piscando antes da data
  if (sub.status === 'past_due' || sub.status === 'unpaid') return { kind: 'due' } // RENEWAL_NOTICE_STATUSES
  if (sub.status === 'canceled' || sub.status === 'incomplete_expired') return null
  const at = sub.renewsAt ? new Date(sub.renewsAt) : null
  if (at && !Number.isNaN(at.getTime())) return { kind: sub.cancelsAtPeriodEnd ? 'cancels' : 'renews', at }
  return subscribed ? { kind: 'active' } : null
}
