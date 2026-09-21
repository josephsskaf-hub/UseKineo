// ═══ KINEO-RECEITA-LIQUIDA-2026-09-21 — o dinheiro que ENTROU, não só o MRR ═══
//
// Fundador (21/09): "independentemente do MRR das assinaturas, tem as pessoas que fazem top-up e ficam comprando;
// é outra entrada de dinheiro que o admin não mostra — muita gente comprando, principalmente quem já assina."
// O admin só tinha MRR (assinaturas vivas × preço) e uma contagem de "one-time purchases" por evento. Este módulo
// lê a Stripe — a única fonte que sabe o que foi COBRADO e o que ficou depois da taxa — e devolve, por janela:
// bruto, líquido (balance_transaction.net), assinaturas × avulsos, compradores, e quantos compradores de pacote
// já são assinantes (a observação do fundador, medida). Conta interna fora (lib/internalAccounts). Nunca inventa:
// sem chave/erro → null, e a tela diz que não sabe.
//
// Moeda: a conta Stripe é brasileira, então balance_transaction vem em BRL para tudo que liquidou em reais e em
// USD para o resto; a exibição converte BRL→USD pela taxa da casa (lib/settlementCurrency, revista dia 9).
import { stripe } from '@/lib/stripe'
import { isInternalEmail } from '@/lib/internalAccounts'
import { BRL_PER_USD_HOUSE } from '@/lib/settlementCurrency'

export type RevenueWindow = {
  days: number
  charges: number
  grossUsd: number
  netUsd: number
  subscriptionsNetUsd: number
  packsNetUsd: number
  packsCount: number
  packsBuyers: number
  /** compradores de pacote que também pagaram fatura de assinatura nos últimos 90 d */
  packsBuyersSubscribers: number
  refundedUsd: number
}
export type NetRevenue = {
  computedAt: string
  scannedCharges: number
  windows: { d7: RevenueWindow; d30: RevenueWindow; mtd: RevenueWindow; d90: RevenueWindow }
  brlPerUsd: number
}

const LOOKBACK_DAYS = 90
const MAX_CHARGES = 1000
const TTL_MS = 5 * 60 * 1000
let cache: { at: number; value: NetRevenue | null } | null = null

function toUsd(amountMinor: number, currency: string): number {
  const c = (currency || 'usd').toLowerCase()
  if (c === 'usd') return amountMinor / 100
  if (c === 'brl') return amountMinor / 100 / BRL_PER_USD_HOUSE
  return amountMinor / 100 // outras moedas: aproximação honesta (hoje só usd/brl liquidam)
}

type Row = { at: number; customer: string | null; email: string | null; grossUsd: number; netUsd: number; refundedUsd: number; oneTime: boolean }

function summarize(rows: Row[], sinceMs: number, days: number, subscriberCustomers: Set<string>): RevenueWindow {
  const w = rows.filter((r) => r.at >= sinceMs)
  const packs = w.filter((r) => r.oneTime)
  const buyers = new Set(packs.map((r) => r.customer ?? r.email ?? '').filter(Boolean))
  const round = (n: number) => Math.round(n * 100) / 100
  return {
    days,
    charges: w.length,
    grossUsd: round(w.reduce((a, r) => a + r.grossUsd, 0)),
    netUsd: round(w.reduce((a, r) => a + r.netUsd, 0)),
    subscriptionsNetUsd: round(w.filter((r) => !r.oneTime).reduce((a, r) => a + r.netUsd, 0)),
    packsNetUsd: round(packs.reduce((a, r) => a + r.netUsd, 0)),
    packsCount: packs.length,
    packsBuyers: buyers.size,
    packsBuyersSubscribers: [...buyers].filter((b) => subscriberCustomers.has(b)).length,
    refundedUsd: round(w.reduce((a, r) => a + r.refundedUsd, 0)),
  }
}

export async function stripeNetRevenue(): Promise<NetRevenue | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  const value = await stripeNetRevenueUncached()
  cache = { at: Date.now(), value }
  return value
}

async function stripeNetRevenueUncached(): Promise<NetRevenue | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null
  const now = Date.now()
  const since = Math.floor((now - LOOKBACK_DAYS * 86400_000) / 1000)
  const rows: Row[] = []
  const subscriberCustomers = new Set<string>()
  try {
    let lidas = 0
    await stripe.charges
      .list({ created: { gte: since }, limit: 100, expand: ['data.balance_transaction'] })
      .autoPagingEach((ch) => {
        if (++lidas > MAX_CHARGES) return false
        if (ch.status !== 'succeeded' || !ch.paid) return
        const email = (ch.billing_details?.email ?? ch.receipt_email ?? '').toLowerCase() || null
        if (email && isInternalEmail(email)) return
        const customer = typeof ch.customer === 'string' ? ch.customer : ch.customer?.id ?? null
        const bt = ch.balance_transaction
        const btObj = bt && typeof bt !== 'string' ? bt : null
        const grossUsd = toUsd(ch.amount - (ch.amount_refunded ?? 0), ch.currency)
        // net da Stripe já desconta taxa; se houve estorno depois, ele aparece como balance_transaction própria (fora
        // desta lista) — aqui o líquido é ajustado pelo que foi devolvido para não somar dinheiro que saiu.
        const netUsd = btObj ? toUsd(btObj.net, btObj.currency) - toUsd(ch.amount_refunded ?? 0, ch.currency) : grossUsd
        const refundedUsd = toUsd(ch.amount_refunded ?? 0, ch.currency)
        const oneTime = !ch.invoice
        if (!oneTime && customer) subscriberCustomers.add(customer)
        if (!oneTime && email) subscriberCustomers.add(email)
        rows.push({ at: ch.created * 1000, customer, email, grossUsd, netUsd, refundedUsd, oneTime })
      })
  } catch (e) {
    console.warn('[receita] Stripe indisponível:', e instanceof Error ? e.message : String(e))
    return null
  }
  const d = new Date(now)
  const mtdSince = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
  return {
    computedAt: new Date(now).toISOString(),
    scannedCharges: rows.length,
    brlPerUsd: BRL_PER_USD_HOUSE,
    windows: {
      d7: summarize(rows, now - 7 * 86400_000, 7, subscriberCustomers),
      d30: summarize(rows, now - 30 * 86400_000, 30, subscriberCustomers),
      mtd: summarize(rows, mtdSince, Math.max(1, Math.ceil((now - mtdSince) / 86400_000)), subscriberCustomers),
      d90: summarize(rows, now - 90 * 86400_000, 90, subscriberCustomers),
    },
  }
}
