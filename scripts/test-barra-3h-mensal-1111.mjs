// KINEO-BARRA-3H-MENSAL-1111 — guardião da barra das 3 h no MENSAL (oferta; decisão do fundador) + a linha dos 30% no modal da parede.
// Prova: (1) o interruptor decide o que a barra anuncia, e só anuncia o mensal com a oferta mensal viva; 'off' = a barra de 04/11;
// (2) o link do mensal é o /pricing SEM billing; (3) a releitura segue a janela da oferta anunciada; (4) shown/clicked gravam a
// oferta; (5) o modal lê a MESMA fonte do /pricing e mostra o preço do 1º mês com a conta da Stripe; (6) preços e o /pricing
// intocados. Cada mutante tem de derrubar a bateria.
// Rodar: node scripts/test-barra-3h-mensal-1111.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/billing/barra3hMensal1111.ts'
const MENSAL = 'lib/billing/monthlyFirstMonthOffer.ts'
const ANUAL = 'lib/billing/annualWelcomeOffer.ts'
const BAR = 'components/AnnualWelcomeBar.tsx'
const UPGRADE = 'components/offers/ConversionUpgrade.tsx'
const PRICING = 'app/pricing/PricingClient.tsx'
const SRC = Object.fromEntries([LIB, MENSAL, ANUAL, BAR, UPGRADE, PRICING].map((p) => [p, rd(p)]))

function loader(src) {
  const cache = new Map()
  function get(p) {
    if (cache.has(p)) return cache.get(p)
    const exports = {}
    cache.set(p, exports)
    const code = ts.transpileModule(src[p] ?? rd(p), { compilerOptions: { module: 1, target: 9 } }).outputText
    vm.runInNewContext(code, { exports, console, process: { env: {} }, require: (id) => {
      if (id.startsWith('@/')) return get(id.slice(2) + '.ts')
      if (id.startsWith('.')) return get(relative(root, resolve(root, dirname(p), id)) + '.ts')
      throw new Error('import inesperado: ' + id)
    } }, { filename: p })
    return exports
  }
  return get
}

function battery(src) {
  const p = []
  let lib, mensal, anual
  try { const get = loader(src); lib = get(LIB); mensal = get(MENSAL); anual = get(ANUAL) } catch (e) { return [`os módulos não carregam: ${e.message}`] }
  // (1) interruptor e a regra do "só anuncia o que vale"
  if (lib.KINEO_BARRA_3H_MENSAL_1111 !== 'on') p.push('interruptor da barra não está ligado')
  if (lib.barra3hModo() !== (mensal.MONTHLY_FIRST_MONTH_3H_LIVE ? 'monthly' : 'annual')) p.push('ligado, a barra não segue a oferta mensal viva')
  if (lib.barra3hModo('on', true) !== 'monthly') p.push('ligado + mensal viva: a barra não anuncia o mensal')
  if (lib.barra3hModo('on', false) !== 'annual') p.push('mensal desligada: a barra anunciaria 30% que não vale')
  if (lib.barra3hModo('off', true) !== 'annual') p.push("'off' não volta à barra do anual")
  // (2) link
  if (lib.barra3hHref('monthly', anual.ANNUAL_WELCOME_BAR_HREF) !== '/pricing?from=welcome_bar') p.push('o link do mensal não é o /pricing sem billing')
  if (new URL(lib.barra3hHref('monthly', anual.ANNUAL_WELCOME_BAR_HREF), 'https://x.test').searchParams.has('billing')) p.push('o link do mensal força uma aba')
  if (lib.barra3hHref('annual', anual.ANNUAL_WELCOME_BAR_HREF) !== anual.ANNUAL_WELCOME_BAR_HREF) p.push("'off' mudou o link do anual")
  // (3) releitura
  const resp = { nowMs: 1000, offer: 'welcome_3h', endsAtMs: 5000, monthlyOffer: mensal.MONTHLY_FIRST_MONTH_OFFER_KIND, monthlyEndsAtMs: 4000 }
  const m = lib.barra3hJanela('monthly', resp)
  if (!m || m.endsAtMs !== 4000) p.push('no mensal, a barra não segue o fim da janela mensal')
  if (lib.barra3hJanela('monthly', { ...resp, monthlyOffer: null }) !== null) p.push('mensal fechada e a barra continuaria')
  if (lib.barra3hJanela('annual', resp)?.endsAtMs !== 5000) p.push('no anual, a barra não segue a janela anual')
  if (lib.barra3hJanela('annual', { ...resp, offer: null }) !== null) p.push('anual fechada e a barra continuaria')
  if (lib.barra3hJanela('monthly', null) !== null) p.push('leitura que falha não some')
  // (4) medida
  const md = lib.barra3hMetadata('monthly')
  if (md.offer !== 'monthly_first_month_3h' || md.offer_version !== 'barra_3h_mensal_1111' || lib.barra3hMetadata('annual').offer !== 'annual_welcome_3h') p.push('a medida não grava a oferta anunciada')
  const bar = src[BAR]
  if (!bar.includes('void trackEvent(ANNUAL_WELCOME_BAR_SHOWN_EVENT, { placement, surface: pathname, ...MEDIDA })') || !bar.includes('void trackEvent(ANNUAL_WELCOME_BAR_CLICKED_EVENT, { placement, surface: pathname, ...MEDIDA })')) p.push('shown/clicked não gravam a oferta')
  if (!bar.includes('href={barra3hHref(MODO, ANNUAL_WELCOME_BAR_HREF)}')) p.push('a barra não usa o link do modo')
  if (!bar.includes('<>Your {MONTHLY_FIRST_MONTH_PERCENT_OFF}% off the first month ends in {annualOfferClock(msLeft)} →</>')) p.push('falta o texto do mensal na barra')
  if (!bar.includes('<>Your {ANNUAL_WELCOME_DISCOUNT_PERCENT}% annual offer ends in {annualOfferClock(msLeft)} →</>')) p.push("'off' perdeu o texto do anual")
  if (!bar.includes('const janela = barra3hJanela(MODO, j)')) p.push('a releitura da barra não segue a oferta anunciada')
  // (5) modal da parede
  const up = src[UPGRADE]
  if (!up.includes("import { useWelcomeOffers } from '@/components/pricing/AnnualOfferCountdown'") || !up.includes('const firstMonth3hOpen = useWelcomeOffers().monthly.deadlineMs !== null')) p.push('o modal não lê a mesma fonte das 3 h do /pricing')
  if (!up.includes("{billing === 'monthly' && firstMonth3hOpen && currency && monthlyFirstMonthCoversTier(tier) ?")) p.push('o modal mostra os 30% fora do mensal/da janela/dos planos cobertos')
  if (!up.includes('formatCheckoutMoney(currency, monthlyFirstMonthMinor(getTierPrice(tier, currency, region)))')) p.push('o preço do 1º mês no modal não sai da conta da Stripe sobre o preço de lista')
  if (mensal.monthlyFirstMonthMinor(900) !== 630) p.push('a conta do 1º mês mudou (900 → 630)')
  // (6) intocados
  if (!up.includes('useState<ConversionBilling>(paredeBillingInicial())') || !up.includes('Save {plan.annualSaving}/yr')) p.push('a parede no mensal / o Save $X/yr foram mexidos')
  if (!src[PRICING].includes("export default function PricingClient({ initialBilling = 'annual' }")) p.push('o /pricing foi mexido')
  if (mensal.MONTHLY_FIRST_MONTH_PERCENT_OFF !== 30 || anual.ANNUAL_WELCOME_BAR_HREF !== '/pricing?billing=annual&from=welcome_bar') p.push('a oferta ou o link de 04/11 mudaram')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS barra das 3 h no mensal (só com a mensal viva), link sem billing, releitura da janela certa, medida; modal com os 30% da mesma fonte; intocados' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from.slice(0, 80)}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['interruptor desligado', muta(LIB, "export const KINEO_BARRA_3H_MENSAL_1111 = 'on' as 'on' | 'off'", "export const KINEO_BARRA_3H_MENSAL_1111 = 'off' as 'on' | 'off'")],
  ['anuncia 30% com a mensal desligada', muta(LIB, "return chave === 'on' && monthlyLive ? 'monthly' : 'annual'", "return chave === 'on' ? 'monthly' : 'annual'")],
  ['link força o anual', muta(LIB, "export const BARRA_3H_MONTHLY_HREF = '/pricing?from=welcome_bar'", "export const BARRA_3H_MONTHLY_HREF = '/pricing?billing=annual&from=welcome_bar'")],
  ['link força o mensal', muta(LIB, "export const BARRA_3H_MONTHLY_HREF = '/pricing?from=welcome_bar'", "export const BARRA_3H_MONTHLY_HREF = '/pricing?billing=monthly&from=welcome_bar'")],
  ['releitura do mensal pela janela anual', muta(LIB, "{ nowMs: j.nowMs, endsAtMs: j.monthlyEndsAtMs } : null", "{ nowMs: j.nowMs, endsAtMs: Number(j.endsAtMs) } : null")],
  ['mensal fechada não some', muta(LIB, 'return j.monthlyOffer === MONTHLY_FIRST_MONTH_OFFER_KIND && typeof j.monthlyEndsAtMs', 'return true && typeof j.monthlyEndsAtMs')],
  ['medida sem oferta', muta(BAR, '{ placement, surface: pathname, ...MEDIDA })', '{ placement, surface: pathname })')],
  ['barra sem texto do mensal', muta(BAR, '<>Your {MONTHLY_FIRST_MONTH_PERCENT_OFF}% off the first month ends in', '<>Your offer ends in')],
  ['barra no link fixo', muta(BAR, 'href={barra3hHref(MODO, ANNUAL_WELCOME_BAR_HREF)}', 'href={ANNUAL_WELCOME_BAR_HREF}')],
  ['modal sem a fonte', muta(UPGRADE, 'const firstMonth3hOpen = useWelcomeOffers().monthly.deadlineMs !== null', 'const firstMonth3hOpen = true')],
  ['modal mostra no anual', muta(UPGRADE, "{billing === 'monthly' && firstMonth3hOpen", '{firstMonth3hOpen')],
  ['modal com preço digitado', muta(UPGRADE, 'formatCheckoutMoney(currency, monthlyFirstMonthMinor(getTierPrice(tier, currency, region)))', "'$6.30'")],
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
