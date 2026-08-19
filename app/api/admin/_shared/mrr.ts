// KINEO-ADMIN-CEO-2026-08-03 — MRR / plan helpers: the single source of truth
// for "what does this profiles.plan value cost per month?".
//
// WHY THIS FILE EXISTS: the CEO screen used to hardcode PRO_PRICE = 9.90 and
// BASIC_PRICE = 4.90 — two prices that do not exist anywhere in the product
// (Starter is $9.90, Creator is $24.90, Studio is $37.90; $4.90 is the ONE-OFF
// first-month pack, not a subscription). It also counted only 'pro' | 'basic',
// so a Starter or an Autopilot customer contributed $0 to MRR. Every number on
// every admin surface now derives from lib/pricing.PLANS through here, so a
// price change in one place updates the whole panel.
//
// The company's official metric (docs/METAS.md, fixed by the founder 02/08) is
// ACTIVE PAID PLAN — `profiles.plan is not null and plan <> 'free'` with the
// internal accounts filtered out. NOT `has_paid`, which counts anyone who ever
// paid including refunds.

// ⚠️⚠️ KINEO-MRR-STRIPE-2026-08-19 — ESTE ARQUIVO PASSOU A MENTIR HOJE, E O
// MOTIVO É INSTRUTIVO O BASTANTE PARA FICAR ESCRITO.
//
// A tabela abaixo deriva de lib/pricing.PLANS, que hoje passou a derivar de
// checkoutPricing (V6: $7/$15/$29). Isso consertou 20 telas de marketing e
// QUEBROU esta: os 6 assinantes atuais assinaram ENTRE 09/07 e 10/08, e a
// Stripe mantém o preço original de cada assinatura para sempre. Eles pagam
// $24.90, $19.90 e $9.90 — não $15 e $7.
//
// Resultado medido: o painel CEO exibia MRR $66.00 quando a receita real é
// $94.40. O fundador estava olhando o número mais importante da empresa,
// subestimado em 30%, no dia em que ele mais precisava lê-lo.
//
// A LIÇÃO É A MESMA DO DIA, com um giro: derivar da fonte única é certo para
// o preço que a gente COBRA de quem chega agora, e errado para o preço que a
// gente RECEBE de quem já assinou. São duas perguntas diferentes:
//   · "quanto custa o Creator?"        → checkoutPricing (preço de tabela)
//   · "quanto essa pessoa me paga?"    → STRIPE (contrato assinado)
// MRR é a segunda. A única fonte honesta é a assinatura.
//
// mrrForPlan() FICA, porque é o fallback quando a Stripe não responde e porque
// telas de projeção ("se todos fossem Creator...") querem preço de tabela. Mas
// toda superfície que anuncia RECEITA deve preferir stripeMrrUsd().
import { PLANS } from '@/lib/pricing'
import Stripe from 'stripe'

// Monthly USD per stored plan value. Keys must cover every value the Stripe
// webhook / checkout route / PayPal webhook can write to profiles.plan —
// this set mirrors PAID_PLANS in app/api/admin/users/route.ts (kept there
// verbatim on purpose: that file is CRLF and carries the paginate-past-500 fix
// from f812f06; do not "tidy" it into an import without redoing the EOL work).
//
// Trials count at full price: the card is on file and Stripe will bill it, so
// treating them as $0 would under-report committed revenue. Same convention as
// app/admin/overview (Push #482).
export const PLAN_PRICE_USD: Record<string, number> = {
  starter: PLANS.starter.price,
  starter_trial: PLANS.starter.price,
  // 'basic' is the stored value for the plan the UI calls CREATOR ($24.90).
  basic: PLANS.basic.price,
  basic_trial: PLANS.basic.price,
  creator: PLANS.basic.price,
  creator_trial: PLANS.basic.price,
  // 'pro' is the stored value for the plan the UI calls STUDIO ($37.90).
  pro: PLANS.pro.price,
  pro_trial: PLANS.pro.price,
  studio: PLANS.pro.price,
  studio_trial: PLANS.pro.price,
  autopilot: PLANS.autopilot.price,
  autopilot_trial: PLANS.autopilot.price,
  // KINEO-PILOT-99-2026-07-26 — the pilot is a ONE-OFF $99, not a
  // subscription. It must be a KEY (so the buyer counts as a paying customer)
  // with VALUE 0 (so it never inflates MRR).
  autopilot_pilot: 0,
}

/** Every plan value that means "this is a paying customer". */
export const PAID_PLANS = new Set(Object.keys(PLAN_PRICE_USD))

export function normalizePlan(plan: string | null | undefined): string {
  return (plan ?? '').toString().trim().toLowerCase()
}

export function isPaidPlan(plan: string | null | undefined): boolean {
  return PAID_PLANS.has(normalizePlan(plan))
}

export function isTrialPlan(plan: string | null | undefined): boolean {
  return normalizePlan(plan).endsWith('_trial')
}

/** Monthly USD this plan contributes to MRR (0 for free / one-off / unknown). */
export function mrrForPlan(plan: string | null | undefined): number {
  return PLAN_PRICE_USD[normalizePlan(plan)] ?? 0
}

/**
 * MRR REAL: soma o que a Stripe cobra de cada assinatura ativa.
 *
 * É o número que o painel CEO deve mostrar. Assinante antigo mantém o preço
 * que assinou (grandfathering automático da Stripe), então a tabela de preço
 * de hoje não sabe responder quanto ele paga.
 *
 * Devolve null quando não dá para saber (sem chave, erro de rede) — e nesse
 * caso o chamador cai no cálculo por tabela. Nunca inventa: melhor mostrar a
 * estimativa rotulada do que um número inventado com cara de exato.
 */
export async function stripeMrrUsd(subscriptionIds: string[]): Promise<{
  mrr: number
  counted: number
  perSubscription: Array<{ id: string; usd: number; status: string }>
} | null> {
  const secret = process.env.STRIPE_SECRET_KEY
  const ids = subscriptionIds.filter((s) => typeof s === 'string' && s.startsWith('sub_'))
  if (!secret || ids.length === 0) return null
  try {
    const stripe = new Stripe(secret, { apiVersion: '2025-02-24.acacia' })
    const perSubscription: Array<{ id: string; usd: number; status: string }> = []
    let mrr = 0
    for (const id of ids) {
      const sub = await stripe.subscriptions.retrieve(id)
      // Só conta assinatura que a Stripe considera viva. 'canceled'/'unpaid'
      // continuam existindo como objeto e somá-las infla o MRR com receita
      // que não vai entrar.
      const alive = sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due'
      const item = sub.items?.data?.[0]
      const amount = typeof item?.price?.unit_amount === 'number' ? item.price.unit_amount : 0
      // Anual vira mensal para o MRR não pular no mês da cobrança.
      const perMonth = item?.price?.recurring?.interval === 'year' ? amount / 12 : amount
      const usd = alive ? perMonth / 100 : 0
      if (alive) mrr += usd
      perSubscription.push({ id, usd, status: sub.status })
    }
    return { mrr, counted: perSubscription.filter((s) => s.usd > 0).length, perSubscription }
  } catch (e) {
    console.warn('[mrr] Stripe indisponível, caindo para a tabela:', e instanceof Error ? e.message : String(e))
    return null
  }
}

export type PlanBase = 'free' | 'starter' | 'creator' | 'studio' | 'autopilot'

/** Stored value → product family, using the names the founder sees in the UI. */
export function planBase(plan: string | null | undefined): PlanBase {
  const p = normalizePlan(plan).replace('_trial', '').replace('_pilot', '')
  if (p === 'starter') return 'starter'
  if (p === 'basic' || p === 'creator') return 'creator'
  if (p === 'pro' || p === 'studio') return 'studio'
  if (p === 'autopilot') return 'autopilot'
  return 'free'
}

const BASE_NAME: Record<PlanBase, string> = {
  free: 'Free',
  starter: 'Starter',
  creator: 'Creator',
  studio: 'Studio',
  autopilot: 'Autopilot',
}

/** "Creator", "Starter · trial", "Autopilot · pilot". */
export function planLabel(plan: string | null | undefined): string {
  const p = normalizePlan(plan)
  const name = BASE_NAME[planBase(p)]
  if (p.endsWith('_trial')) return `${name} · trial`
  if (p.endsWith('_pilot')) return `${name} · pilot`
  return name
}

/** Badge colour per plan family (same palette the users table already uses). */
export function planAccent(plan: string | null | undefined): string {
  switch (planBase(plan)) {
    case 'starter':
      return '#2997ff'
    case 'creator':
      return '#a78bfa'
    case 'studio':
      return '#fbbf24'
    case 'autopilot':
      return '#fb7185'
    default:
      return '#86868b'
  }
}

export function formatUsd(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** "12.5%" — or "—" when the denominator is 0 (never divide by zero on screen). */
export function pct(num: number, denom: number): string {
  if (!denom || denom <= 0) return '—'
  return `${((num / denom) * 100).toFixed(1)}%`
}
