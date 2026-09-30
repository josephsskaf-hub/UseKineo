// KINEO-ADMIN-AFILIADOS-2026-09-30 — números do /admin/affiliates, em conta pura (sem import: o guardião
// scripts/test-admin-afiliados-2026-09-30.mjs carrega este arquivo cru no Node).
//
// Pedido do fundador (30/09): "reconstruir a página dos afiliados… pra eu conseguir enxergar os dados melhor". A tela
// antiga mostrava só totais da vida inteira, sem tempo, sem conversão, sem receita, e lia as tabelas com um select
// simples (corte silencioso em 1000 linhas). Aqui: janelas de 7/30 dias, visitantes únicos (ip_hash), funil
// clique → cadastro → pagante, receita e comissão POR MOEDA (a conta Stripe cobra em USD e BRL — somar centavos de
// moedas diferentes mente), série diária, últimos cliques e indicações de cada afiliado.

export interface DashAffiliateRow {
  id: string
  name: string | null
  email: string | null
  code: string
  status: string | null
  commission_rate: number | null
  coupon_code: string | null
  created_at: string | null
}
export interface DashClickRow {
  affiliate_id: string | null
  landing_path: string | null
  referrer: string | null
  ip_hash: string | null
  created_at: string | null
}
export interface DashReferralRow {
  affiliate_id: string | null
  email: string | null
  status: string | null
  first_touch_at: string | null
  converted_at: string | null
}
export interface DashCommissionRow {
  affiliate_id: string | null
  amount_gross: number | null
  commission_amount: number | null
  currency: string | null
  status: string | null
  created_at: string | null
}

/** Centavos por moeda (minúscula): { usd: 1990, brl: 4990 }. */
export type MoneyByCurrency = Record<string, number>

export interface DashAffiliate {
  id: string
  name: string | null
  email: string | null
  code: string
  status: string | null
  commission_rate: number | null
  coupon_code: string | null
  created_at: string | null
  /** Conta da casa (e-mail de admin): aparece na tabela com selo, mas fica FORA de todo total, série e funil —
   *  o único "pagante" da história (30/09) era o teste do fundador pelo próprio código. */
  internal: boolean
  clicks: number
  clicks7: number
  clicksPrev7: number
  clicks30: number
  visitors: number
  lastClickAt: string | null
  signups: number
  signups30: number
  paid: number
  /** Venda bruta atribuída (comissões não anuladas). */
  gross: MoneyByCurrency
  /** Comissão pendente ou aprovada = a pagar. */
  owed: MoneyByCurrency
  /** Comissão já paga ao afiliado. */
  paidOut: MoneyByCurrency
  /** Comissão anulada (estorno/cancelamento). */
  voided: MoneyByCurrency
  /** Cliques por dia, últimos 14 dias (o último item é hoje, UTC). */
  spark: number[]
  recentClicks: { at: string; path: string | null; referrer: string | null }[]
  referrals: { email: string | null; status: string | null; firstTouchAt: string | null; convertedAt: string | null }[]
}

export interface AffiliateDashboard {
  generatedAt: string
  totals: {
    /** Afiliados de fora (sem a conta da casa). */
    affiliates: number
    /** Contas da casa que estão na tabela mas fora dos totais. */
    internal: number
    active: number
    pending: number
    /** Afiliados com pelo menos 1 clique nos últimos 30 dias. */
    working30: number
    clicks: number
    clicks7: number
    clicksPrev7: number
    clicks30: number
    visitors: number
    /** Cliques com ip_hash gravado. Sem AFFILIATE_IP_SALT na Vercel o link não grava o IP (app/a/[code]/route.ts):
     *  "pessoas" só vale quando quase todo clique tem hash — a tela confere a cobertura antes de mostrar. */
    hashedClicks: number
    signups: number
    signups30: number
    paid: number
    gross: MoneyByCurrency
    owed: MoneyByCurrency
    paidOut: MoneyByCurrency
    voided: MoneyByCurrency
  }
  /** Últimos 30 dias (UTC), do mais antigo para hoje. */
  daily: { day: string; clicks: number; signups: number }[]
  destinationClicks: Record<string, number>
  affiliates: DashAffiliate[]
}

const DAY = 86_400_000
const dayKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10)
const ts = (iso: string | null | undefined): number | null => {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}
const addMoney = (m: MoneyByCurrency, currency: string | null | undefined, cents: number | null | undefined): void => {
  const c = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0
  if (c === 0) return
  const k = (currency ?? 'usd').trim().toLowerCase() || 'usd'
  m[k] = (m[k] ?? 0) + c
}
const mergeMoney = (into: MoneyByCurrency, from: MoneyByCurrency): void => {
  for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v
}

export function buildAffiliateDashboard(input: {
  affiliates: readonly DashAffiliateRow[]
  clicks: readonly DashClickRow[]
  referrals: readonly DashReferralRow[]
  commissions: readonly DashCommissionRow[]
  /** Balde do destino de cada clique (lib/affiliateDestinations.ts affiliateDestinationBucket). */
  bucketOf: (landingPath: string | null) => string
  /** Todos os baldes possíveis, para os zerados também aparecerem. */
  buckets: readonly string[]
  /** E-mails da casa (minúsculos): afiliado com um destes fica fora dos totais. */
  internalEmails?: readonly string[]
  nowMs: number
}): AffiliateDashboard {
  const internal = new Set((input.internalEmails ?? []).map((e) => e.trim().toLowerCase()))
  const now = input.nowMs
  const todayStart = Date.parse(dayKey(now) + 'T00:00:00.000Z')
  const since7 = now - 7 * DAY
  const since14 = now - 14 * DAY
  const since30 = now - 30 * DAY

  const dailyKeys: string[] = []
  for (let i = 29; i >= 0; i--) dailyKeys.push(dayKey(todayStart - i * DAY))
  const daily = new Map(dailyKeys.map((d) => [d, { day: d, clicks: 0, signups: 0 }]))
  const destinationClicks: Record<string, number> = Object.fromEntries(input.buckets.map((b) => [b, 0]))

  const byId = new Map<string, DashAffiliate>()
  const ipsByAff = new Map<string, Set<string>>()
  const allIps = new Set<string>()
  for (const a of input.affiliates) {
    byId.set(a.id, {
      id: a.id, name: a.name, email: a.email, code: a.code, status: a.status, commission_rate: a.commission_rate,
      coupon_code: a.coupon_code, created_at: a.created_at, internal: internal.has((a.email ?? '').trim().toLowerCase()),
      clicks: 0, clicks7: 0, clicksPrev7: 0, clicks30: 0, visitors: 0, lastClickAt: null, signups: 0, signups30: 0, paid: 0,
      gross: {}, owed: {}, paidOut: {}, voided: {}, spark: new Array(14).fill(0), recentClicks: [], referrals: [],
    })
    ipsByAff.set(a.id, new Set())
  }

  let hashedClicks = 0
  const sortedClicks = [...input.clicks].sort((x, y) => (ts(y.created_at) ?? 0) - (ts(x.created_at) ?? 0))
  for (const c of sortedClicks) {
    if (!c.affiliate_id) continue
    const a = byId.get(c.affiliate_id)
    if (!a) continue
    const t = ts(c.created_at)
    a.clicks++
    if (!a.internal) {
      const bucket = input.bucketOf(c.landing_path)
      destinationClicks[bucket] = (destinationClicks[bucket] ?? 0) + 1
    }
    if (c.ip_hash) { ipsByAff.get(a.id)!.add(c.ip_hash); if (!a.internal) { allIps.add(c.ip_hash); hashedClicks++ } }
    if (t !== null) {
      if (t > since7) a.clicks7++
      else if (t > since14) a.clicksPrev7++
      if (t > since30) a.clicks30++
      const idx = 13 - Math.floor((todayStart - Date.parse(dayKey(t) + 'T00:00:00.000Z')) / DAY)
      if (idx >= 0 && idx < 14) a.spark[idx]++
      const d = daily.get(dayKey(t))
      if (d && !a.internal) d.clicks++
      if (!a.lastClickAt) a.lastClickAt = c.created_at
    }
    if (a.recentClicks.length < 8 && c.created_at) a.recentClicks.push({ at: c.created_at, path: c.landing_path, referrer: c.referrer })
  }

  const sortedRefs = [...input.referrals].sort((x, y) => (ts(y.first_touch_at) ?? 0) - (ts(x.first_touch_at) ?? 0))
  for (const r of sortedRefs) {
    if (!r.affiliate_id) continue
    const a = byId.get(r.affiliate_id)
    if (!a) continue
    a.signups++
    const t = ts(r.first_touch_at)
    if (t !== null && t > since30) a.signups30++
    if (t !== null && !a.internal) { const d = daily.get(dayKey(t)); if (d) d.signups++ }
    if (r.status === 'paid') a.paid++
    a.referrals.push({ email: r.email, status: r.status, firstTouchAt: r.first_touch_at, convertedAt: r.converted_at })
  }

  for (const c of input.commissions) {
    if (!c.affiliate_id) continue
    const a = byId.get(c.affiliate_id)
    if (!a) continue
    const s = (c.status ?? '').toLowerCase()
    if (s === 'void') { addMoney(a.voided, c.currency, c.commission_amount); continue }
    addMoney(a.gross, c.currency, c.amount_gross)
    if (s === 'pending' || s === 'approved') addMoney(a.owed, c.currency, c.commission_amount)
    else if (s === 'paid') addMoney(a.paidOut, c.currency, c.commission_amount)
  }

  const list = [...byId.values()]
  const gross: MoneyByCurrency = {}, owed: MoneyByCurrency = {}, paidOut: MoneyByCurrency = {}, voided: MoneyByCurrency = {}
  for (const a of list) a.visitors = ipsByAff.get(a.id)!.size
  // Totais: só afiliados de fora (a conta da casa aparece na tabela, não no placar).
  const ext = list.filter((a) => !a.internal)
  const sum = (k: 'clicks' | 'clicks7' | 'clicksPrev7' | 'clicks30' | 'signups' | 'signups30' | 'paid') => ext.reduce((s, a) => s + a[k], 0)
  for (const a of ext) { mergeMoney(gross, a.gross); mergeMoney(owed, a.owed); mergeMoney(paidOut, a.paidOut); mergeMoney(voided, a.voided) }
  // Quem traz mais agora primeiro: cliques em 30 dias, depois total, depois pagantes. Conta da casa no fim.
  list.sort((x, y) => Number(x.internal) - Number(y.internal) || y.clicks30 - x.clicks30 || y.paid - x.paid || y.clicks - x.clicks || (x.code < y.code ? -1 : 1))

  const statusOf = (a: DashAffiliate) => (a.status ?? '').toLowerCase()
  return {
    generatedAt: new Date(now).toISOString(),
    totals: {
      affiliates: ext.length,
      internal: list.length - ext.length,
      active: ext.filter((a) => statusOf(a) === 'active').length,
      pending: list.filter((a) => statusOf(a) === 'pending').length,
      working30: ext.filter((a) => a.clicks30 > 0).length,
      clicks: sum('clicks'), clicks7: sum('clicks7'), clicksPrev7: sum('clicksPrev7'), clicks30: sum('clicks30'),
      visitors: allIps.size,
      hashedClicks,
      signups: sum('signups'), signups30: sum('signups30'), paid: sum('paid'),
      gross, owed, paidOut, voided,
    },
    daily: dailyKeys.map((d) => daily.get(d)!),
    destinationClicks,
    affiliates: list,
  }
}
