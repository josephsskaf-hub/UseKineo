// KINEO-RECEITA-LIQUIDA-2026-09-21 — guardião: o admin mostra o dinheiro cobrado (Stripe), assinaturas × avulsos, líquido.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

// Executa o módulo com uma Stripe de mentira: 4 cobranças (1 interna, 1 fatura de assinatura, 2 pacotes — 1 delas do
// assinante — e 1 estorno parcial), líquido vindo do balance_transaction em BRL e USD.
function roda(src, charges, env = { STRIPE_SECRET_KEY: 'sk_test' }) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  const stripe = { charges: { list: () => ({ autoPagingEach: async (fn) => { for (const c of charges) { const r = fn(c); if (r === false) break } } }) } }
  const req = (n) => {
    if (n === '@/lib/stripe') return { stripe }
    if (n === '@/lib/internalAccounts') return { isInternalEmail: (e) => e === 'josephsskaf@gmail.com' }
    if (n === '@/lib/settlementCurrency') return { BRL_PER_USD_HOUSE: 5 }
    throw new Error('import inesperado ' + n)
  }
  new Function('module', 'exports', 'require', 'process', js)(m, m.exports, req, { env })
  return m.exports
}
const now = Math.floor(Date.now() / 1000)
const bt = (net, currency) => ({ net, currency, fee: 0, amount: net })
const charges = [
  { status: 'succeeded', paid: true, created: now - 3600, amount: 1990, amount_refunded: 0, currency: 'usd', invoice: 'in_1', customer: 'cus_A', billing_details: { email: 'a@x.com' }, balance_transaction: bt(1900, 'usd') },
  { status: 'succeeded', paid: true, created: now - 7200, amount: 1290, amount_refunded: 0, currency: 'usd', invoice: null, customer: 'cus_A', billing_details: { email: 'a@x.com' }, balance_transaction: bt(1200, 'usd') },
  { status: 'succeeded', paid: true, created: now - 86400 * 3, amount: 4990, amount_refunded: 0, currency: 'brl', invoice: null, customer: 'cus_B', billing_details: { email: 'b@x.com' }, balance_transaction: bt(4700, 'brl') },
  { status: 'succeeded', paid: true, created: now - 86400 * 10, amount: 1290, amount_refunded: 1290, currency: 'usd', invoice: null, customer: 'cus_C', billing_details: { email: 'c@x.com' }, balance_transaction: bt(1200, 'usd') },
  { status: 'succeeded', paid: true, created: now - 3600, amount: 99900, amount_refunded: 0, currency: 'usd', invoice: null, customer: 'cus_I', billing_details: { email: 'josephsskaf@gmail.com' }, balance_transaction: bt(99000, 'usd') },
  { status: 'failed', paid: false, created: now - 3600, amount: 1990, amount_refunded: 0, currency: 'usd', invoice: 'in_2', customer: 'cus_D', billing_details: { email: 'd@x.com' }, balance_transaction: null },
]

console.log('1) módulo de receita (Stripe = fonte; conta interna fora; líquido do balance_transaction)')
const src = rd('app/api/admin/_shared/revenue.ts')
const R = roda(src, charges)
const r = await R.stripeNetRevenue()
checa('devolve janelas 7/30/mtd/90', r && r.windows.d7 && r.windows.d30 && r.windows.mtd && r.windows.d90)
checa('conta interna e cobrança falha ficam fora (4 cobranças válidas em 30 d)', r.windows.d30.charges === 4)
checa('líquido 30 d = 19,00 + 12,00 + 47,00/5 + (12,00 − 12,90 estornado) = 39,50', Math.abs(r.windows.d30.netUsd - 39.5) < 0.01)
checa('assinaturas 30 d = 19,00 (só a cobrança com fatura)', Math.abs(r.windows.d30.subscriptionsNetUsd - 19) < 0.01)
checa('avulsos 30 d = 12,00 + 9,40 − 0,90 = 20,50; 3 compras; 3 compradores; 1 já assina (cus_A)', Math.abs(r.windows.d30.packsNetUsd - 20.5) < 0.01 && r.windows.d30.packsCount === 3 && r.windows.d30.packsBuyers === 3 && r.windows.d30.packsBuyersSubscribers === 1)
checa('7 d não inclui o pacote de 10 dias atrás nem o BRL de 3 dias? (BRL de 3 d entra; 10 d não): 3 cobranças', r.windows.d7.charges === 3)
checa('estorno contado', Math.abs(r.windows.d30.refundedUsd - 12.9) < 0.01)
checa('sem chave → null (nunca inventa)', (await roda(src, charges, {}).stripeNetRevenue()) === null)
checa('cache de 5 min (segunda chamada não relê a Stripe)', src.includes('const TTL_MS = 5 * 60 * 1000') && src.includes('if (cache && Date.now() - cache.at < TTL_MS) return cache.value'))
checa('lista com expand do balance_transaction, janela de 90 d e teto de páginas', src.includes("expand: ['data.balance_transaction']") && src.includes('const LOOKBACK_DAYS = 90') && src.includes('if (++lidas > MAX_CHARGES) return false'))
checa('avulso = cobrança SEM fatura', src.includes('const oneTime = !ch.invoice'))

console.log('2) o card no /admin/overview')
const page = rd('app/admin/overview/page.tsx')
checa('carrega a receita junto com o MRR da Stripe', page.includes('const [stripeMrr, revenue] = await Promise.all([stripeMrrUsd(payingSubscriptionIds), stripeNetRevenue()])'))
checa('Kpi "Receita líquida 30 d" com bruto/assinaturas/avulsos/7 d/mês', page.includes('label="Receita líquida 30 d"') && page.includes('fmtMoney(m.revenue.windows.d30.netUsd)') && page.includes('assinaturas ${fmtMoney(m.revenue.windows.d30.subscriptionsNetUsd)}'))
checa('Kpi "Avulsos (pacotes) 30 d" com compras/compradores/já assinam/90 d', page.includes('label="Avulsos (pacotes) 30 d"') && page.includes('já assinam') && page.includes('m.revenue.windows.d90.packsNetUsd'))
checa('Stripe indisponível → tela diz que não sabe (sem número inventado)', page.includes("'Stripe indisponível agora — sem número inventado'"))

console.log('3) mutantes')
const semInterno = roda(src.replace('if (email && isInternalEmail(email)) return\n', ''), charges)
checa('mutante (conta interna contada) é pego', (await semInterno.stripeNetRevenue()).windows.d30.charges === 5)
const semEstorno = roda(src.replace('toUsd(btObj.net, btObj.currency) - toUsd(ch.amount_refunded ?? 0, ch.currency)', 'toUsd(btObj.net, btObj.currency)'), charges)
checa('mutante (estorno ignorado no líquido) é pego', Math.abs((await semEstorno.stripeNetRevenue()).windows.d30.netUsd - 39.5) > 0.5)

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
