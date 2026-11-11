// KINEO-PRICING-MENSAL-1111 — guardião do /pricing que abre no MENSAL (decisão do fundador; interruptor PRÓPRIO em
// lib/growth/pricingPlanChoiceAttribution.ts, separado do da parede). Prova: (1) o interruptor decide a aba sem parâmetro e
// volta ao anual com 'off'; (2) ?billing=annual, promos mensais e a chave do handoff seguem como antes; (3) a impressão
// pricing_view grava billing_default + versão; (4) o anual segue a um clique com o "Save X%"; (5) os dois interruptores
// são independentes; (6) nenhum preço muda. Cada mutante tem de derrubar a bateria.
// Rodar: node scripts/test-pricing-mensal-1111.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')

const HANDOFF = 'lib/growth/pricingPlanChoiceAttribution.ts'
const PRICING = 'app/pricing/PricingClient.tsx'
const PAGE = 'app/pricing/page.tsx'
const PAREDE = 'lib/offers/paredeMensal1111.ts'
const UPGRADE = 'components/offers/ConversionUpgrade.tsx'
const PRICES = 'lib/checkoutPricing.ts'
const SRC = Object.fromEntries([HANDOFF, PRICING, PAGE, PAREDE, UPGRADE, PRICES].map((p) => [p, rd(p)]))

function load(src, filename) {
  const exports = {}
  const code = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(code, { exports, require: (id) => { throw new Error('import inesperado: ' + id) } }, { filename })
  return exports
}

function battery(src) {
  const p = []
  let h, parede
  try { h = load(src[HANDOFF], HANDOFF) } catch (e) { return [`o handoff não carrega sozinho: ${e.message}`] }
  try { parede = load(src[PAREDE], PAREDE) } catch (e) { return [`a lib da parede não carrega sozinha: ${e.message}`] }
  // (1) interruptor
  if (h.KINEO_PRICING_MENSAL_1111 !== 'on') p.push('interruptor do /pricing não está ligado (o commit entrega o /pricing no mensal)')
  if (h.PRICING_MENSAL_VERSION !== 'pricing_mensal_1111') p.push('versão da medida mudou')
  if (h.pricingDefaultBilling() !== 'monthly') p.push('ligado, o /pricing não abre no mensal')
  if (h.pricingDefaultBilling('off') !== 'annual') p.push("'off' não volta ao anual (a volta fácil quebrou)")
  if (h.pricingBillingHandoff({}).initialBilling !== 'monthly') p.push('sem parâmetro, o /pricing não abre no mensal')
  // (2) o resto do handoff igual
  if (h.pricingBillingHandoff({ billing: 'annual' }).initialBilling !== 'annual') p.push('?billing=annual explícito deixou de abrir no anual')
  if (h.pricingBillingHandoff({ billing: 'monthly' }).initialBilling !== 'monthly') p.push('?billing=monthly deixou de abrir no mensal')
  if (h.pricingBillingHandoff({ billing: 'annual', promo: 'first50' }).initialBilling !== 'monthly') p.push('FIRST50 deixou de vencer o anual')
  if (h.pricingBillingHandoff({ billing: 'annual', promo: 'COMEBACK50' }).initialBilling !== 'monthly') p.push('COMEBACK50 deixou de vencer o anual')
  if (h.pricingBillingHandoff({ billing: 'weekly' }).initialBilling !== h.pricingDefaultBilling()) p.push('billing desconhecido não cai no padrão do interruptor')
  if (h.pricingBillingHandoff({}).key !== 'default:') p.push('a chave do handoff mudou (resetaria a escolha manual)')
  if (!src[HANDOFF].includes('requestedBilling ?? pricingDefaultBilling()')) p.push('o handoff não usa o interruptor')
  if (/requestedBilling \?\? '(annual|monthly)'/.test(src[HANDOFF])) p.push('aba digitada no handoff (passa por cima do interruptor)')
  if (!src[PAGE].includes('initialBilling={handoff.initialBilling}')) p.push('a página não passa a aba do handoff ao PricingClient')
  // (3) medida
  const pc = src[PRICING]
  if (!pc.includes("import { PRICING_MENSAL_VERSION } from '@/lib/growth/pricingPlanChoiceAttribution'")) p.push('o /pricing não importa a versão da medida')
  if (!pc.includes("void trackEvent('pricing_view', { ...(intentCampaign ? { source: intentCampaign } : {}), ...(MRR_CONVERSION_ENABLED ? conversionMetadata('pricing') : {}), billing_default: initialBilling, billing_default_version: PRICING_MENSAL_VERSION })")) p.push('pricing_view não grava billing_default + versão')
  if (!pc.includes('const [billing, setBilling] = useState<PricingPlanChoiceBilling>(initialBilling)')) p.push('a aba da página não nasce do handoff')
  // (4) o anual segue a um clique, com o selo
  if (!pc.includes("onClick={() => setBilling('monthly')}") || !pc.includes("onClick={() => setBilling('annual')}")) p.push('o seletor perdeu uma das duas abas')
  if (!pc.includes('<>Save {ANNUAL_DISCOUNT_PERCENT}%</>')) p.push('o anual perdeu o "Save X%"')
  // (5) interruptores independentes
  if (src[HANDOFF].includes("from '@/lib/offers/paredeMensal1111'") || pc.includes("from '@/lib/offers/paredeMensal1111'")) p.push('o /pricing passou a ler o interruptor da PAREDE')
  if (src[UPGRADE].includes('KINEO_PRICING_MENSAL_1111') || src[UPGRADE].includes('pricingDefaultBilling')) p.push('a parede passou a ler o interruptor do /pricing')
  if (parede.paredeBillingInicial('off') !== 'annual' || parede.paredeBillingInicial('on') !== 'monthly') p.push('o interruptor da parede mudou de comportamento')
  // (6) preços intocados
  const bloco = (nome) => (src[PRICES].split(`export const ${nome}: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {`)[1] ?? '').split('\n}\n')[0]
  for (const [tier, mensal, anual] of [['starter', 900, 7600], ['basic', 1900, 16000], ['pro', 5900, 49600]]) {
    if (!bloco('TIER_PRICES').includes(`${tier}: { usd: ${mensal} }`)) p.push(`preço mensal do ${tier} mudou`)
    if (!bloco('ANNUAL_PRICES').includes(`${tier}: { usd: ${anual} }`)) p.push(`preço anual do ${tier} mudou`)
  }
  if (!src[PRICES].includes('export const ANNUAL_DISCOUNT_PERCENT = 30')) p.push('o desconto do anual mudou')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS /pricing abre no mensal pelo interruptor próprio; ?billing e promos iguais; pricing_view grava a aba; anual a um clique; parede independente; preços intocados' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['interruptor desligado', muta(HANDOFF, "export const KINEO_PRICING_MENSAL_1111 = 'on' as 'on' | 'off'", "export const KINEO_PRICING_MENSAL_1111 = 'off' as 'on' | 'off'")],
  ["'on' devolve anual", muta(HANDOFF, "return chave === 'on' ? 'monthly' : 'annual'", "return 'annual'")],
  ["'off' não volta", muta(HANDOFF, "return chave === 'on' ? 'monthly' : 'annual'", "return 'monthly'")],
  ['handoff digita o anual', muta(HANDOFF, 'requestedBilling ?? pricingDefaultBilling()', "requestedBilling ?? 'annual'")],
  ['handoff digita o mensal', muta(HANDOFF, 'requestedBilling ?? pricingDefaultBilling()', "requestedBilling ?? 'monthly'")],
  ['?billing=annual ignorado', muta(HANDOFF, "input.billing === 'monthly' || input.billing === 'annual'", "input.billing === 'monthly'")],
  ['promo mensal some', muta(HANDOFF, "promo === 'FIRST50' || promo === 'COMEBACK50' ? promo : ''", "''")],
  ['chave do handoff muda', muta(HANDOFF, "key: `${requestedBilling ?? 'default'}:${monthlyPromo}`", "key: `${requestedBilling ?? 'padrao'}:${monthlyPromo}`")],
  ['impressão sem a aba', muta(PRICING, ', billing_default: initialBilling, billing_default_version: PRICING_MENSAL_VERSION })', ' })')],
  ['impressão grava a aba errada', muta(PRICING, 'billing_default: initialBilling,', "billing_default: 'monthly',")],
  ['anual some do seletor', muta(PRICING, "onClick={() => setBilling('annual')}", 'onClick={() => undefined}')],
  ['anual sem Save X%', muta(PRICING, '<>Save {ANNUAL_DISCOUNT_PERCENT}%</>', '<>Save</>')],
  ['/pricing lê a parede', muta(HANDOFF, 'export const PRICING_MENSAL_VERSION', "import { paredeBillingInicial } from '@/lib/offers/paredeMensal1111'\nexport const PRICING_MENSAL_VERSION")],
  ['parede lê o /pricing', muta(UPGRADE, 'useState<ConversionBilling>(paredeBillingInicial())', 'useState<ConversionBilling>(pricingDefaultBilling())')],
  ['Starter mais barato', muta(PRICES, 'export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {\n  starter: { usd: 900 }', 'export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {\n  starter: { usd: 700 }')],
  ['anual com desconto maior', muta(PRICES, 'export const ANNUAL_DISCOUNT_PERCENT = 30', 'export const ANNUAL_DISCOUNT_PERCENT = 40')],
]
let killed = 0
for (const [nome, src] of MUTANTES) {
  let p
  try { p = battery(src) } catch (e) { p = [`lançou: ${e.message}`] }
  if (p.length > 0) killed++
  else { failed++; console.log(`SOBREVIVEU mutante: ${nome}`) }
}
console.log(`mutantes: ${killed}/${MUTANTES.length} mortos`)
if (failed) { console.log('FAIL'); process.exit(1) }
console.log('OK')
