// KINEO-PAREDE-MENSAL-1111 — guardião da parede de crédito que abre no MENSAL (decisão do fundador; interruptor em
// lib/offers/paredeMensal1111.ts). Prova: (1) o interruptor decide a aba e volta ao anual com 'off'; (2) o modal usa o
// interruptor e grava qual aba abriu na impressão 'menu'; (3) o anual segue a um clique com "save 30%" e "Save $X/yr";
// (4) o /pricing e os preços não mudam. Cada mutante tem de derrubar a bateria.
// Rodar: node scripts/test-parede-mensal-1111.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')

const LIB = 'lib/offers/paredeMensal1111.ts'
const UPGRADE = 'components/offers/ConversionUpgrade.tsx'
const PRICING = 'app/pricing/PricingClient.tsx'
const PRICES = 'lib/checkoutPricing.ts'
const MRR = 'lib/offers/mrrConversion.ts'
const SRC = Object.fromEntries([LIB, UPGRADE, PRICING, PRICES, MRR].map((p) => [p, rd(p)]))

function loadLib(src) {
  const exports = {}
  const code = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(code, { exports, require: (id) => { throw new Error('import inesperado: ' + id) } }, { filename: LIB })
  return exports
}

function battery(src) {
  const p = []
  let lib
  try { lib = loadLib(src[LIB]) } catch (e) { return [`a lib não carrega sozinha: ${e.message}`] }
  // (1) interruptor
  if (lib.KINEO_PAREDE_MENSAL_1111 !== 'on') p.push('interruptor não está ligado (o commit entrega a parede no mensal)')
  if (lib.paredeBillingInicial() !== 'monthly') p.push("ligado, a parede não abre no mensal")
  if (lib.paredeBillingInicial('on') !== 'monthly') p.push("'on' não dá mensal")
  if (lib.paredeBillingInicial('off') !== 'annual') p.push("'off' não volta ao anual (a volta fácil quebrou)")
  const meta = lib.paredeViewMetadata()
  if (meta?.billing_default !== 'monthly' || meta?.billing_default_version !== 'parede_mensal_1111') p.push('a impressão da parede não grava billing_default=monthly + versão')
  if (lib.paredeViewMetadata('off')?.billing_default !== 'annual') p.push("com 'off' a impressão não grava annual (o corte antes/depois some)")
  // (2) o modal obedece ao interruptor e mede
  const up = src[UPGRADE]
  if (!up.includes("import { paredeBillingInicial, paredeViewMetadata } from '@/lib/offers/paredeMensal1111'")) p.push('o modal não importa o interruptor')
  if (!up.includes('useState<ConversionBilling>(paredeBillingInicial())')) p.push('a aba inicial do modal não vem do interruptor')
  if (/useState<ConversionBilling>\('(annual|monthly)'\)/.test(up)) p.push('aba inicial digitada no modal (passa por cima do interruptor)')
  if (!up.includes('const PAREDE_VIEW_META: Record<string, string> = paredeViewMetadata()')) p.push('a medida da parede não é constante de módulo (efeito instável)')
  if (!up.includes("useOfferObservation('upgrade', 'menu', true, PAREDE_VIEW_META)")) p.push("a impressão 'menu' da parede não carrega billing_default")
  if (!up.includes("void trackEvent('conversion_offer_viewed', { ...conversionMetadata(surface, offer), ...(extra ?? {}) })")) p.push('conversion_offer_viewed não leva o extra')
  if (!up.includes('}, [enabled, surface, offer, extra])')) p.push('o efeito da impressão perdeu o extra nas dependências')
  // (3) o anual continua a um clique, com a economia
  if (!up.includes("(['monthly', 'annual'] as const).map(value =>")) p.push('o seletor perdeu uma das duas abas')
  if (!up.includes('`Annual · save ${ANNUAL_DISCOUNT_PERCENT}%`')) p.push('o anual perdeu o "save 30%"')
  if (!up.includes('Save {plan.annualSaving}/yr')) p.push('o anual perdeu o "Save $X/yr"')
  if (!up.includes('onClick={() => onUpgrade(tier, billing)}')) p.push('o botão do plano não leva a aba escolhida ao checkout')
  // (4) /pricing e preços intocados
  if (src[PRICING].includes('paredeMensal1111')) p.push('o /pricing passou a ler o interruptor da parede')
  // KINEO-PRECOS-PREVIA-1411 [CEO 14/11, reancoragem sem afrouxar] — a assinatura ganhou `watchPreview = false`; o que se protege é o padrão ANUAL
  if (!src[PRICING].includes("export default function PricingClient({ initialBilling = 'annual'")) p.push('o /pricing deixou de nascer no anual')
  const bloco = (nome) => (src[PRICES].split(`export const ${nome}: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {`)[1] ?? '').split('\n}\n')[0]
  for (const [tier, mensal, anual] of [['starter', 900, 7600], ['basic', 1900, 16000], ['pro', 5900, 49600]]) {
    if (!bloco('TIER_PRICES').includes(`${tier}: { usd: ${mensal} }`)) p.push(`preço mensal do ${tier} mudou`)
    if (!bloco('ANNUAL_PRICES').includes(`${tier}: { usd: ${anual} }`)) p.push(`preço anual do ${tier} mudou`)
  }
  if (!src[MRR].includes("return { offer_version: MRR_CONVERSION_VERSION, offer_id: offer, offer_surface: surface }")) p.push('conversionMetadata mudou de forma (quebra o histórico do funil)')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS parede abre no mensal pelo interruptor; anual a um clique; impressão grava a aba; /pricing e preços intocados' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['interruptor desligado', muta(LIB, "= 'on' as 'on' | 'off'", "= 'off' as 'on' | 'off'")],
  ["'on' devolve anual", muta(LIB, "return chave === 'on' ? 'monthly' : 'annual'", "return 'annual'")],
  ["'off' não volta", muta(LIB, "return chave === 'on' ? 'monthly' : 'annual'", "return 'monthly'")],
  ['medida sem versão', muta(LIB, 'billing_default_version: PAREDE_MENSAL_VERSION', "billing_default_version: ''")],
  ['modal digita o mensal', muta(UPGRADE, 'useState<ConversionBilling>(paredeBillingInicial())', "useState<ConversionBilling>('monthly')")],
  ['modal volta ao anual fixo', muta(UPGRADE, 'useState<ConversionBilling>(paredeBillingInicial())', "useState<ConversionBilling>('annual')")],
  ['impressão sem a aba', muta(UPGRADE, "useOfferObservation('upgrade', 'menu', true, PAREDE_VIEW_META)", "useOfferObservation('upgrade', 'menu')")],
  ['extra jogado fora', muta(UPGRADE, '{ ...conversionMetadata(surface, offer), ...(extra ?? {}) }', 'conversionMetadata(surface, offer)')],
  ['anual some do seletor', muta(UPGRADE, "(['monthly', 'annual'] as const).map(value =>", "(['monthly'] as const).map(value =>")],
  ['anual sem save 30%', muta(UPGRADE, '`Annual · save ${ANNUAL_DISCOUNT_PERCENT}%`', "'Annual'")],
  ['plano ignora a aba', muta(UPGRADE, 'onClick={() => onUpgrade(tier, billing)}', "onClick={() => onUpgrade(tier, 'annual')}")],
  ['/pricing no mensal', muta(PRICING, "export default function PricingClient({ initialBilling = 'annual'", "export default function PricingClient({ initialBilling = 'monthly'")],
  ['Starter mais barato', muta(PRICES, 'export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {\n  starter: { usd: 900 }', 'export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {\n  starter: { usd: 700 }')],
  ['anual do Creator mais barato', muta(PRICES, 'basic: { usd: 16000 }', 'basic: { usd: 12000 }')],
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
