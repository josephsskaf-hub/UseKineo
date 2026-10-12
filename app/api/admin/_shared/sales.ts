// ═══ KINEO-BUSINESS-POS-AMOSTRA-2026-10-12 — VENDAS de verdade: "última venda" e "vendas 7 d" pela régua única ═══
//
// O CASO (08/10): um cliente trocou do Starter mensal para o anual e pagou US$ 67,85 na Stripe (fatura de
// `subscription_update`). O razão gravou `plan_switched_to_annual` (+ `subscription_update_invoice_paid`, sem user_id),
// e quem contava venda só por `payment_success` (o evento do CHECKOUT) leu "0 vendas em 9 dias". Dinheiro entrou; o
// painel não viu.
//
// O QUE É VENDA AQUI: todo evento que o servidor grava quando a Stripe confirmou dinheiro, com valor > 0:
//   · payment_success                    — checkout pago (assinatura nova, pacote, passe, Empresas). Chave: a sessão.
//   · subscription_invoice_paid          — fatura de renovação/conversão (subscription_cycle e afins). Chave: a fatura.
//   · subscription_update_invoice_paid   — TODA fatura de troca de plano paga (o webhook grava, sem user_id). Chave: a fatura.
//   · plan_switched_to_annual            — a troca para o anual (/api/admin/switch-to-annual), com o valor cobrado. Chave: a fatura.
//   · business_upgrade_credits_granted   — a subida para o Business (lib/billing/trocaBusiness.ts BUSINESS_UPGRADE_GRANTED_EVENT;
//                                          a chave de idempotência dele é "troca_business_granted:…"). Chave: a fatura.
// SEM DUPLICAR: a mesma fatura aparece em até 3 eventos (troca para o anual = plan_switched_to_annual + a fatura de
// subscription_update). Uma venda = uma chave (fatura `in_…` ou sessão `cs_…`); os eventos da mesma chave se FUNDEM:
// vale o dono que algum deles conhece, o rótulo mais específico e o maior valor (nunca a soma).
// O 1º pagamento de assinatura nova não duplica: o webhook pula a fatura `subscription_create` (fica só o payment_success).
//
// Módulo PURO (sem import): entra no /admin/overview e no guardião scripts/test-business-depois-da-amostra.mjs.

/** Os nomes de evento que carregam dinheiro confirmado pela Stripe (para os fetchAllRows das telas). */
export const SALE_EVENT_NAMES = [
  'payment_success',
  'subscription_invoice_paid',
  'subscription_update_invoice_paid',
  'plan_switched_to_annual',
  'business_upgrade_credits_granted',
] as const

export type SaleKind = 'checkout' | 'renewal' | 'plan_change' | 'annual_switch' | 'business_upgrade'

export type SaleEvent = {
  id?: string | null
  user_id: string | null
  name: string
  created_at?: string | null
  metadata?: Record<string, unknown> | null
}

export type Sale = {
  key: string
  at: string
  userId: string | null
  kind: SaleKind
  amountMinor: number
  currency: string
  usd: number
  /** os eventos que viraram esta venda (auditoria). */
  events: string[]
}

export type SalesSummary = {
  last: Sale | null
  d7: { count: number; usd: number }
  d30: { count: number; usd: number }
  /** vendas que só a régua nova enxerga (não são payment_success) nos 7 d — para o rótulo dizer de onde veio o número. */
  d7NotCheckout: number
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : 0
}
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** Rótulo mais específico vence quando a mesma fatura chega por dois eventos. */
const KIND_RANK: Record<SaleKind, number> = { checkout: 1, renewal: 1, plan_change: 0, annual_switch: 2, business_upgrade: 2 }

/** Um evento → { chave, tipo, valor, moeda, assinatura }. null = não é venda (outro nome, valor 0, troca não cobrada). */
export function saleOf(e: SaleEvent): { key: string; kind: SaleKind; amountMinor: number; currency: string; subscription: string | null } | null {
  const m = e.metadata ?? {}
  const currency = (str(m.currency) ?? 'usd').toLowerCase()
  const subscription = str(m.stripe_subscription_id) ?? str(m.subscription)
  let key: string | null = null
  let kind: SaleKind
  let amountMinor = 0
  switch (e.name) {
    case 'payment_success':
      kind = 'checkout'
      amountMinor = num(m.amount_total)
      key = str(m.stripe_session_id) ?? (e.id ? `event:${e.id}` : null)
      break
    case 'subscription_invoice_paid':
      kind = 'renewal'
      amountMinor = num(m.amount_paid)
      key = str(m.stripe_invoice_id) ?? (e.id ? `event:${e.id}` : null)
      break
    case 'subscription_update_invoice_paid':
      kind = 'plan_change'
      amountMinor = num(m.amount_paid)
      key = str(m.invoice) ?? str(m.stripe_invoice_id) ?? (e.id ? `event:${e.id}` : null)
      break
    case 'plan_switched_to_annual':
      kind = 'annual_switch'
      // só a troca que a Stripe COBROU (fatura paga); a troca recusada não é venda.
      if (str(m.invoice_status) !== null && str(m.invoice_status) !== 'paid') return null
      amountMinor = num(m.amount_charged_minor)
      key = str(m.stripe_invoice_id) ?? (e.id ? `event:${e.id}` : null)
      break
    case 'business_upgrade_credits_granted':
      kind = 'business_upgrade'
      amountMinor = num(m.amount_paid)
      key = str(m.stripe_invoice_id) ?? (e.id ? `event:${e.id}` : null)
      break
    default:
      return null
  }
  if (!key || !(amountMinor > 0)) return null
  return { key, kind, amountMinor, currency, subscription }
}

/** Centavos → USD (BRL pela taxa da casa, passada por quem chama; outras moedas: aproximação honesta, como em _shared/revenue). */
export function saleUsd(amountMinor: number, currency: string, brlPerUsd: number): number {
  const usd = currency === 'brl' && brlPerUsd > 0 ? amountMinor / 100 / brlPerUsd : amountMinor / 100
  return Math.round(usd * 100) / 100
}

/**
 * Funde os eventos em vendas (uma por chave). `userBySubscription` resolve o dono do evento sem user_id
 * (subscription_update_invoice_paid) pela assinatura do perfil. `excluded(userId)` tira conta interna.
 * Venda sem dono conhecido CONTA (o dinheiro entrou na Stripe); só a de dono interno sai.
 */
export function salesFromEvents(
  events: readonly SaleEvent[],
  opts: { brlPerUsd: number; userBySubscription?: ReadonlyMap<string, string>; excluded?: (userId: string) => boolean },
): Sale[] {
  const byKey = new Map<string, Sale>()
  for (const e of events) {
    const s = saleOf(e)
    if (!s || typeof e.created_at !== 'string') continue
    const owner = e.user_id ?? (s.subscription ? opts.userBySubscription?.get(s.subscription) ?? null : null)
    const cur = byKey.get(s.key)
    if (!cur) {
      byKey.set(s.key, { key: s.key, at: e.created_at, userId: owner, kind: s.kind, amountMinor: s.amountMinor, currency: s.currency, usd: saleUsd(s.amountMinor, s.currency, opts.brlPerUsd), events: [e.name] })
      continue
    }
    if (e.created_at < cur.at) cur.at = e.created_at
    if (!cur.userId && owner) cur.userId = owner
    if (KIND_RANK[s.kind] > KIND_RANK[cur.kind]) cur.kind = s.kind
    if (s.amountMinor > cur.amountMinor) {
      cur.amountMinor = s.amountMinor
      cur.currency = s.currency
      cur.usd = saleUsd(s.amountMinor, s.currency, opts.brlPerUsd)
    }
    if (!cur.events.includes(e.name)) cur.events.push(e.name)
  }
  const out = [...byKey.values()].filter((s) => !(s.userId && opts.excluded?.(s.userId)))
  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
}

/** "Última venda" e "vendas 7 d / 30 d" — a janela é MÓVEL a partir de `nowMs`. */
export function summarizeSales(sales: readonly Sale[], nowMs: number): SalesSummary {
  const DAY = 24 * 60 * 60 * 1000
  const win = (days: number) => {
    const since = nowMs - days * DAY
    const w = sales.filter((s) => Date.parse(s.at) >= since && Date.parse(s.at) <= nowMs)
    return { count: w.length, usd: Math.round(w.reduce((a, s) => a + s.usd, 0) * 100) / 100, list: w }
  }
  const d7 = win(7)
  const d30 = win(30)
  return {
    last: sales.find((s) => Date.parse(s.at) <= nowMs) ?? null,
    d7: { count: d7.count, usd: d7.usd },
    d30: { count: d30.count, usd: d30.usd },
    d7NotCheckout: d7.list.filter((s) => s.kind !== 'checkout').length,
  }
}

/** Rótulo curto do tipo de venda para a tela. */
export function saleKindLabel(kind: SaleKind): string {
  switch (kind) {
    case 'checkout': return 'checkout'
    case 'renewal': return 'renovação'
    case 'plan_change': return 'troca de plano'
    case 'annual_switch': return 'troca p/ anual'
    case 'business_upgrade': return 'subida p/ Business'
  }
}
