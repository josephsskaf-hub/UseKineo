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
import { stripe } from '@/lib/stripe'
// KINEO-MRR-PRECO-PAGO-2026-09-28 — taxa FIXA da casa para fatura em reais (nunca o câmbio do dia).
import { BRL_PER_USD_HOUSE } from '@/lib/settlementCurrency'

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
  autopilot_lite: PLANS.autopilot_lite.price, // KINEO-AUTOPILOT-LITE-2026-09-16
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
type StripeMrr = { mrr: number; counted: number; perSubscription: Array<{ id: string; usd: number; status: string }> }
const STRIPE_MRR_TTL_MS = 5 * 60 * 1000
const stripeMrrCache = new Map<string, { at: number; value: StripeMrr | null }>()

/** Cache de 5 min: quatro telas do admin abrindo em sequência não fazem 48 chamadas à Stripe. */
export async function stripeMrrUsd(subscriptionIds: string[]): Promise<StripeMrr | null> {
  const key = [...subscriptionIds].sort().join(',')
  const hit = stripeMrrCache.get(key)
  if (hit && Date.now() - hit.at < STRIPE_MRR_TTL_MS) return hit.value
  const value = await stripeMrrUsdUncached(subscriptionIds)
  stripeMrrCache.set(key, { at: Date.now(), value })
  return value
}

async function stripeMrrUsdUncached(subscriptionIds: string[]): Promise<{
  mrr: number
  counted: number
  perSubscription: Array<{ id: string; usd: number; status: string }>
} | null> {
  const secret = process.env.STRIPE_SECRET_KEY
  const ids = subscriptionIds.filter((s) => typeof s === 'string' && s.startsWith('sub_'))
  if (!secret || ids.length === 0) return null
  try {
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
  const p = normalizePlan(plan).replace('_trial', '').replace('_pilot', '').replace('_lite', '') // KINEO-AUTOPILOT-LITE: família Autopilot
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

// ═══ KINEO-ADMIN-FONTE-UNICA-2026-09-08 ═══════════════════════════════════════
// Ordem do fundador (08/09 09:50): "arruma o administrador de forma completa, pra
// não ter esse tipo de erro mais". O erro: 16 lugares do admin e das campanhas
// tinham a própria tabela de "plano pago" — umas sem *_trial, outras sem
// autopilot, outras sem creator/studio — e cada tela contava um cliente
// diferente. Daqui em diante NENHUM arquivo fora deste define plano pago; o
// guardião scripts/test-admin-fonte-unica-2026-09-08.mjs falha se voltar.
//
// Vocabulário (use o nome certo, os três significam coisas diferentes):
//   isPaidPlan   = tem relação paga com a casa (inclui *_trial e pilot).
//                  Use para EXCLUIR de campanha/oferta.
//   isPayingPlan = paga mensalidade AGORA (exclui *_trial). Use para
//                  "pagantes" e MRR.
//   isTrialPlan  = está no trial de $1 (cartão na Stripe, cobra no dia 8).

/** Paga mensalidade agora. Trial de $1 NÃO é pagante até o dia 8. */
export function isPayingPlan(plan: string | null | undefined): boolean {
  return isPaidPlan(plan) && !isTrialPlan(plan)
}

export type AccountClass = 'internal' | 'paying' | 'trial_1usd' | 'card_required' | 'free'

/** Uma conta, uma classe. `isInternal` é a régua da casa (lib/internalAccounts). */
export function classifyAccount(
  p: { email?: string | null; plan?: string | null; trial_status?: string | null },
  isInternal: (email: string) => boolean,
): AccountClass {
  if (p.email && isInternal(p.email)) return 'internal'
  if (isPayingPlan(p.plan)) return 'paying'
  if (isTrialPlan(p.plan)) return 'trial_1usd'
  if (normalizePlan(p.trial_status) === 'card_required') return 'card_required'
  return 'free'
}

type EventMeta = Record<string, unknown> | null | undefined
const metaTrue = (m: EventMeta, k: string) => m?.[k] === true || m?.[k] === 'true' || m?.[k] === '1'

/** Entrou no trial de $1 (dinheiro, mas NÃO assinante). */
export function isTrialEntryEvent(name: string, metadata: EventMeta): boolean {
  return name === 'payment_success' && metaTrue(metadata, 'card_trial')
}

/**
 * Assinante NOVO: checkout de assinatura sem ser o $1, ou a primeira fatura
 * cobrada depois do trial (subscription_invoice_paid com trial_conversion).
 * Renovação de quem já pagava NÃO é assinante novo.
 */
export function isNewSubscriberEvent(name: string, metadata: EventMeta): boolean {
  if (name === 'subscription_invoice_paid') return metaTrue(metadata, 'trial_conversion')
  if (name !== 'payment_success') return false
  if (metaTrue(metadata, 'card_trial')) return false
  if (metadata?.kind === 'dfy') return false // KINEO-EMPRESAS-COCKPIT-2026-09-24 — pedido Empresas: dinheiro, não assinante
  const mode = typeof metadata?.checkout_mode === 'string' ? metadata.checkout_mode : null
  const tier = typeof metadata?.tier === 'string' ? metadata.tier : null
  const pack = metadata?.pack
  return mode === 'subscription' || (tier !== null && !pack)
}

// ═══ KINEO-MRR-PRECO-PAGO-2026-09-28 ═════════════════════════════════════════
// A V8-A (28/09) subiu a tabela para 12,90 / 29,90 / 54,90 e os ~11 assinantes
// continuam pagando o que assinaram: 9,90 e 19,90 da V5, 7,00 e 29,00 da V6,
// um cupom de 15,92. PLAN_PRICE_USD responde "quanto custa HOJE", e o painel
// somava os antigos no preço novo: US$ 276,90 na tela contra ~US$ 170 que
// entra de fato. stripeMrrUsd() existia para isso, mas devolve null ao menor
// tropeço (uma assinatura que a Stripe não devolve derruba o lote inteiro) e
// a tela caía na tabela em silêncio, com cara de número exato.
//
// A régua daqui em diante — a mesma para TODA superfície do admin:
//   · cada assinante vale a ÚLTIMA fatura que pagou: `subscription_invoice_paid`
//     (renovação ou conversão do trial) ou o `payment_success` do checkout de
//     assinatura, o que for mais recente;
//   · em USD; fatura em BRL ÷ taxa da casa (lib/settlementCurrency), nunca o
//     câmbio do dia; anual ÷ 12;
//   · só cai na TABELA quando não há valor recorrente conhecido: nenhum evento
//     com valor, só o 1º mês com desconto (`intro`), ou o valor é de outra
//     família de plano (trocou de plano e a fatura nova ainda não veio);
//   · quem cai na tabela é CONTADO no rótulo (paidMrrSourceLabel), para o
//     número nunca parecer exato sem ser.
// stripeMrrUsd() fica como conferência ao vivo, no rótulo — não como o número.
//   · KINEO-MRR-TROCA-ANUAL-2026-10-08: a troca do mensal para o anual (/api/admin/switch-to-annual,
//     evento `plan_switched_to_annual`) vira a régua da pessoa — anual ÷ 12 — e as próximas faturas da
//     MESMA assinatura herdam 'annual'. Sem isso o painel mostrava o mensal antigo até a renovação anual.

/** Os dois nomes de evento que carregam valor pago de assinatura (para os `fetchAllRows` das telas). */
export const MRR_PAID_EVENT_NAMES = ['payment_success', 'subscription_invoice_paid', 'plan_switched_to_annual'] as const

export type PaidAmountEvent = {
  user_id: string | null
  name: string
  created_at?: string | null
  metadata?: Record<string, unknown> | null
}

export type PaidBilling = 'monthly' | 'annual'

export type PaidMonthly = {
  /** Mensalidade em USD (anual ÷ 12; BRL ÷ taxa da casa), arredondada ao centavo. */
  usd: number
  source: 'invoice' | 'checkout'
  tier: string | null
  billing: PaidBilling
  amountMinor: number
  currency: string
  at: string
}

const metaNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : 0
}
const metaString = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : null)

/** Centavos na moeda da fatura → USD por mês. Outras moedas: aproximação honesta (hoje só usd/brl liquidam), mesma regra de _shared/revenue. */
export function paidMinorToMonthlyUsd(amountMinor: number, currency: string | null | undefined, billing: PaidBilling): number {
  const cur = (currency ?? 'usd').toLowerCase()
  const usd = cur === 'brl' ? amountMinor / 100 / BRL_PER_USD_HOUSE : amountMinor / 100
  const monthly = billing === 'annual' ? usd / 12 : usd
  return Math.round(monthly * 100) / 100
}

/** Checkout de ASSINATURA que cobrou a mensalidade cheia: nem o $1 do trial, nem pacote, nem Empresas, nem 1º mês `intro`. */
export function isRecurringCheckoutEvent(name: string, metadata: EventMeta): boolean {
  if (name !== 'payment_success') return false
  if (!isNewSubscriberEvent(name, metadata)) return false
  if (metaTrue(metadata, 'intro')) return false
  return metaNumber(metadata?.amount_total) > 0
}

/** Fatura de assinatura paga (renovação ou conversão do trial) com valor. Rateio de troca de plano não é mensalidade. */
export function isPaidInvoiceEvent(name: string, metadata: EventMeta): boolean {
  if (name !== 'subscription_invoice_paid') return false
  if (metaString(metadata?.billing_reason) === 'subscription_update') return false
  return metaNumber(metadata?.amount_paid) > 0
}

/** KINEO-MRR-TROCA-ANUAL-2026-10-08 — troca do mensal para o anual feita pelo admin, com o valor anual no razão. */
export function isAnnualSwitchEvent(name: string, metadata: EventMeta): boolean {
  return name === 'plan_switched_to_annual' && metaNumber(metadata?.annual_minor) > 0
}

/**
 * user_id → última mensalidade paga. Percorre em ordem cronológica; o mais
 * recente vence. A fatura não diz se é anual: herda o `billing` do checkout da
 * mesma assinatura (ou da mesma pessoa); sem nada, mensal.
 */
export function paidMonthlyUsdByUser(events: PaidAmountEvent[]): Map<string, PaidMonthly> {
  const sorted = events
    .filter((e): e is PaidAmountEvent & { user_id: string; created_at: string } => typeof e.user_id === 'string' && typeof e.created_at === 'string')
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
  const billingBySub = new Map<string, PaidBilling>()
  const billingByUser = new Map<string, PaidBilling>()
  const out = new Map<string, PaidMonthly>()
  for (const e of sorted) {
    const m = e.metadata ?? null
    const sub = metaString(m?.stripe_subscription_id)
    if (isRecurringCheckoutEvent(e.name, m)) {
      const billing: PaidBilling = metaString(m?.billing) === 'annual' ? 'annual' : 'monthly'
      if (sub) billingBySub.set(sub, billing)
      billingByUser.set(e.user_id, billing)
      const amountMinor = metaNumber(m?.amount_total)
      const currency = metaString(m?.currency) ?? 'usd'
      out.set(e.user_id, { usd: paidMinorToMonthlyUsd(amountMinor, currency, billing), source: 'checkout', tier: metaString(m?.tier), billing, amountMinor, currency, at: e.created_at })
    } else if (isPaidInvoiceEvent(e.name, m)) {
      const billing: PaidBilling = (sub ? billingBySub.get(sub) : undefined) ?? billingByUser.get(e.user_id) ?? 'monthly'
      const amountMinor = metaNumber(m?.amount_paid)
      const currency = metaString(m?.currency) ?? 'usd'
      out.set(e.user_id, { usd: paidMinorToMonthlyUsd(amountMinor, currency, billing), source: 'invoice', tier: metaString(m?.tier), billing, amountMinor, currency, at: e.created_at })
    } else if (isAnnualSwitchEvent(e.name, m)) {
      // A troca para o anual: a pessoa passa a valer o anual ÷ 12, e a assinatura fica marcada como anual
      // para as faturas seguintes (a renovação do ano que vem não diz o intervalo).
      if (sub) billingBySub.set(sub, 'annual')
      billingByUser.set(e.user_id, 'annual')
      const amountMinor = metaNumber(m?.annual_minor)
      const currency = metaString(m?.currency) ?? 'usd'
      out.set(e.user_id, { usd: paidMinorToMonthlyUsd(amountMinor, currency, 'annual'), source: 'invoice', tier: metaString(m?.tier), billing: 'annual', amountMinor, currency, at: e.created_at })
    }
  }
  return out
}

export type MrrSource = 'invoice' | 'checkout' | 'table'

export type SubscriberMrr = {
  /** O que ESTA pessoa paga por mês (ou a tabela, quando `source === 'table'`). */
  usd: number
  source: MrrSource
  /** Preço de tabela de hoje para o plano dela — a linha "no preço novo". */
  tableUsd: number
  paid: PaidMonthly | null
}

/**
 * Mensalidade de UM assinante. Trial ($1) e piloto (avulso) valem 0 — não são
 * MRR. Valor pago de outra família de plano (trocou de plano) não serve: a
 * tabela entra até a fatura nova chegar.
 */
export function subscriberMrr(plan: string | null | undefined, paid: PaidMonthly | null | undefined): SubscriberMrr {
  if (!isPayingPlan(plan)) return { usd: 0, source: 'table', tableUsd: 0, paid: null }
  const tableUsd = mrrForPlan(plan)
  if (tableUsd === 0) return { usd: 0, source: 'table', tableUsd: 0, paid: null }
  const sameFamily = paid != null && (paid.tier === null || planBase(paid.tier) === planBase(plan))
  if (paid != null && sameFamily && paid.usd > 0) return { usd: paid.usd, source: paid.source, tableUsd, paid }
  return { usd: tableUsd, source: 'table', tableUsd, paid: paid ?? null }
}

export type PaidMrr = {
  /** A soma do que cada pagante paga (tabela só para quem não tem valor conhecido). */
  mrrUsd: number
  /** O mesmo grupo no preço de tabela de hoje ("se todos pagassem o preço novo"). */
  tableUsd: number
  counted: number
  fromInvoice: number
  fromCheckout: number
  fromTable: number
  perUser: Map<string, SubscriberMrr>
}

/** MRR de um grupo de perfis (já sem contas internas — a exclusão é de quem chama, via lib/internalAccounts). */
export function paidMrrForProfiles(profiles: Array<{ id: string; plan?: string | null }>, paidByUser: Map<string, PaidMonthly>): PaidMrr {
  const perUser = new Map<string, SubscriberMrr>()
  let mrrUsd = 0
  let tableUsd = 0
  let fromInvoice = 0
  let fromCheckout = 0
  let fromTable = 0
  for (const p of profiles) {
    if (!isPayingPlan(p.plan)) continue
    const s = subscriberMrr(p.plan, paidByUser.get(p.id))
    perUser.set(p.id, s)
    if (s.tableUsd === 0) continue // piloto: relação paga, MRR 0, não entra no rótulo
    mrrUsd += s.usd
    tableUsd += s.tableUsd
    if (s.source === 'invoice') fromInvoice += 1
    else if (s.source === 'checkout') fromCheckout += 1
    else fromTable += 1
  }
  return {
    mrrUsd: Math.round(mrrUsd * 100) / 100,
    tableUsd: Math.round(tableUsd * 100) / 100,
    counted: fromInvoice + fromCheckout + fromTable,
    fromInvoice,
    fromCheckout,
    fromTable,
    perUser,
  }
}

/** "11 pagantes · 2 por fatura · 8 por checkout · 1 pela tabela (sem valor pago conhecido)" — acompanha TODO número de MRR. */
export function paidMrrSourceLabel(m: Pick<PaidMrr, 'counted' | 'fromInvoice' | 'fromCheckout' | 'fromTable'>): string {
  const tabela = m.fromTable > 0 ? `${m.fromTable} pela tabela (sem valor pago conhecido)` : 'ninguém pela tabela'
  return `${m.counted} pagantes · ${m.fromInvoice} por fatura · ${m.fromCheckout} por checkout · ${tabela}`
}
