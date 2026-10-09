// Margem por plano: preço de hoje x 20% off, mensal e anual, com a taxa da Stripe da casa (2,9% + US$ 0,30) e três
// cenários de custo: uso real medido (45% dos créditos a US$ 0,10/cr), uso total (100% a US$ 0,10/cr) e pior caso
// (100% no motor mais caro por crédito: filme Kling 2.5, US$ 8,40 / 60 cr = US$ 0,14/cr).
import { offlineModules } from './gpt24h-offline-support.mjs'
const load = offlineModules({})
const CP = load('lib/checkoutPricing.ts')
const net = (g) => CP.netAfterStripeUsd(g)
const tiers = [['starter', 'Starter'], ['basic', 'Creator'], ['pro', 'Studio']]
const USO_REAL = 665 / 1470 // 12 assinantes, 30 dias, créditos debitados / créditos do plano
const CUSTO_MEDIO = 0.10
const CUSTO_PIOR = 8.40 / 60
const cen = (cr) => ({ real: cr * USO_REAL * CUSTO_MEDIO, total: cr * CUSTO_MEDIO, pior: cr * CUSTO_PIOR })
const pct = (n, c) => `${Math.round(((n - c) / n) * 100)}%`
const rows = []
for (const [t, nome] of tiers) {
  const cr = CP.TIER_CREDITS[t]
  const m = CP.TIER_PRICES[t].usd / 100
  const a = CP.ANNUAL_PRICES[t].usd / 100
  const c = cen(cr)
  const linha = (rotulo, brutoMes, liquidoMes) => rows.push(`| ${nome} | ${rotulo} | $${brutoMes.toFixed(2)} | $${liquidoMes.toFixed(2)} | ${pct(liquidoMes, c.real)} | ${pct(liquidoMes, c.total)} | ${pct(liquidoMes, c.pior)} |`)
  linha('mensal hoje', m, net(m))
  linha('mensal −20%', m * 0.8, net(m * 0.8))
  linha('anual hoje (−30%)', a / 12, net(a) / 12)
  linha('anual −20% (em vez de −30%)', (m * 12 * 0.8) / 12, net(m * 12 * 0.8) / 12)
}
console.log(`créditos: ${tiers.map(([t]) => CP.TIER_CREDITS[t]).join('/')} · uso real ${(USO_REAL * 100).toFixed(0)}%`)
console.log('| Plano | Cobrança | Preço/mês | Líquido Stripe/mês | Margem uso real | Margem uso total | Margem pior caso |')
console.log('|---|---|---|---|---|---|---|')
for (const r of rows) console.log(r)
for (const [t, nome] of tiers) {
  const c = cen(CP.TIER_CREDITS[t])
  console.log(`${nome}: custo/mês real $${c.real.toFixed(2)} · total $${c.total.toFixed(2)} · pior $${c.pior.toFixed(2)}`)
}
