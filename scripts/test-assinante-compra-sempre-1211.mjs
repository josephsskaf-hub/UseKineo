// KINEO-ASSINANTE-COMPRA-SEMPRE-1211 — guardião: todo assinante pago compra crédito pela barra com QUALQUER saldo (dono 12/11: "não
// importa se ele fica com 0 ou 1 ou 3 de saldo, quero TODOS que são sub podendo comprar"); free, cortesia e teste não veem.
// Prova: (1) a regra pura: assinante com saldo 0, 1, 3 e 200 é comprador; free, sem Stripe, _trial não são; (2) a rota GET dá o botão
// a todo assinante (button = qa || subscriber) e o checkout aceita o botão e a barra pela MESMA regra (recargaAssinanteSubscriber),
// com o preço da fonte única; (3) a entrada sempre visível: o chip da barra lateral (que é a mesma gaveta do celular) e o link do desenho
// perguntam ao servidor e abrem a MESMA barra (CreditsTopupModal com `recarga`); quem não é assinante segue no caminho de antes;
// (4) "Buy credits" ≥ 12 px, sem preço na entrada, nada começa sozinho. Rodar: node scripts/test-assinante-compra-sempre-1211.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/billing/recargaAssinante.ts'
const ROUTE = 'app/api/billing/recarga-assinante/route.ts'
const CHECKOUT = 'lib/stripe/recargaAssinanteCheckout.ts'
const ENTRY = 'components/billing/BuyCreditsEntry.tsx'
const SIDEBAR = 'components/Sidebar.tsx'
const PANEL = 'components/AccountPanel.tsx'
const KIDS = 'components/kidsCartoon/KidsCartoonTemplate.tsx'
const SRC = Object.fromEntries([LIB, ROUTE, CHECKOUT, ENTRY, SIDEBAR, KIDS, PANEL].map((p) => [p, rd(p)]))

function loadLib(src) {
  const cache = new Map()
  function get(p) {
    if (cache.has(p)) return cache.get(p)
    const exports = {}
    cache.set(p, exports)
    const code = ts.transpileModule(src[p] ?? rd(p), { compilerOptions: { module: 1, target: 9 } }).outputText
    vm.runInNewContext(code, { exports, console, URL, URLSearchParams, process: { env: {} }, require: (id) => {
      if (id.startsWith('@/')) return get(id.slice(2) + '.ts')
      if (id.startsWith('.')) return get(relative(root, resolve(root, dirname(p), id)).split('\\').join('/') + '.ts')
      return {}
    } }, { filename: p })
    return exports
  }
  return get(LIB)
}

function battery(src) {
  const p = []
  let L
  try { L = loadLib(src) } catch (e) { return [`a regra não carrega: ${e.message}`] }
  const SUB = { plan: 'starter', stripe_subscription_id: 'sub_123', video_credits: 0 }
  for (const saldo of [0, 1, 3, 200]) if (!L.recargaAssinanteSubscriber({ ...SUB, video_credits: saldo })) p.push(`assinante com saldo ${saldo} não é comprador`)
  for (const plan of ['basic', 'pro']) if (!L.recargaAssinanteSubscriber({ ...SUB, plan })) p.push(`assinante ${plan} não é comprador`)
  if (L.recargaAssinanteSubscriber({ ...SUB, plan: 'free', stripe_subscription_id: null })) p.push('free é comprador')
  if (L.recargaAssinanteSubscriber({ ...SUB, plan: 'basic_trial' })) p.push('teste/cortesia é comprador')
  if (L.recargaAssinanteSubscriber({ ...SUB, stripe_subscription_id: null })) p.push('plano sem assinatura da Stripe é comprador')
  if (!L.RECARGA_ASSINANTE_BACK_PREFIXES.includes('/kids-cartoon') || L.recargaAssinanteBack('/kids-cartoon') !== '/kids-cartoon') p.push('quem compra no desenho não volta ao desenho')
  // (2) rota e checkout: a mesma regra, para botão e barra
  if (!src[ROUTE].includes('  const button = qa || subscriber\n')) p.push('a rota ainda exige saldo zerado para o botão')
  if (!src[CHECKOUT].includes('const eligible = recargaAssinanteSubscriber(profile)')) p.push('o checkout não usa a regra de assinante para botão e barra')
  if (/recargaAssinanteEligible\(/u.test(src[CHECKOUT])) p.push('o checkout ainda testa saldo zerado')
  if (!src[CHECKOUT].includes("const unitAmount = kind === 'button' ? RECARGA_ASSINANTE_1111.usdMinor : sliderPriceUsdMinor(credits)")) p.push('o preço deixou de vir da fonte única')
  // (3) entrada sempre visível, decidida pelo servidor
  const e = src[ENTRY]
  if (!e.includes('fetch(`${RECARGA_ASSINANTE_API}?surface=${encodeURIComponent(surface)}`')) p.push('a entrada não pergunta ao servidor')
  if (!e.includes("if (alive && o && o.show === true && typeof o.go === 'string'")) p.push('a entrada pinta sem o "show" do servidor')
  if (!e.includes('<CreditsTopupModal surface={`buy_credits_${surface}`} recarga={{ go: offer.go, back, qa: offer.qa }}')) p.push('a entrada não abre a MESMA barra da recarga')
  if (!/fontSize: 1[2-9]/u.test(e.slice(e.indexOf('data-kineo="buy-credits-entry"')))) p.push('"Buy credits" abaixo de 12 px')
  if (/\$\d|US\$|credits for/u.test(e.slice(e.indexOf('export default function BuyCreditsLink')))) p.push('preço na entrada (só na barra)')
  const s = src[SIDEBAR]
  if (!s.includes("const recargaChip = useRecargaEntrada('sidebar_chip', Boolean(isLoggedIn) && planResolved)")) p.push('o chip da barra lateral não pergunta ao servidor')
  const clique = s.slice(s.indexOf('const handleCreditChipClick = () => {'), s.indexOf("router.push('/pricing')"))
  if (!/if \(recargaChip\) \{[\s\S]*setShowTopup\(true\)\n\s*return\n\s*\}\n\s*if \(topupEligible\)/u.test(clique)) p.push('o assinante do chip ainda vai para /pricing')
  if (!s.includes('? <BuyCreditsModal offer={recargaChip} surface={topupSurface} onClose={() => setShowTopup(false)} />')) p.push('o chip não abre a barra da recarga')
  if (!s.includes(': <CreditsTopupModal surface="sidebar_chip" onClose={() => setShowTopup(false)} />)}')) p.push('quem não assina perdeu o caminho de antes no chip')
  if (!s.includes("data-topup-eligibility={planResolved ? (recargaChip ? 'recarga' : topupEligible ? 'eligible' : 'ineligible') : 'loading'}")) p.push('o chip não marca o estado da recarga')
  if (!s.includes("fontSize: recargaChip && !creditsReadFailed ? 12 : '0.6rem'")) p.push('"Buy credits" do chip abaixo de 12 px')
  if (!s.includes("onBuyCredits={recargaChip ? () => {") || !s.includes("setTopupSurface('account_panel'); setShowTopup(true) } : null}")) p.push('o painel da conta não abre a barra para o assinante')
  const pn = src[PANEL]
  if (!pn.includes("{onBuyCredits ? (") || !pn.includes("onClick={() => { onClose(); onBuyCredits() }}") || !pn.includes("{t('Buy credits')}")) p.push('o painel da conta não tem "Buy credits"')
  const k = src[KIDS]
  if (!k.includes('{!semPlano && !visitante && costLine.enough !== false ? <BuyCreditsLink surface="kids_cartoon"')) p.push('o desenho não mostra "Buy credits" ao assinante com saldo')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS assinante compra com qualquer saldo (0, 1, 3, 200); free/teste não; chip e desenho abrem a mesma barra; servidor decide' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from.slice(0, 80)}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['rota volta a exigir zerado', muta(ROUTE, '  const button = qa || subscriber\n', '  const button = qa || zeroed\n')],
  ['checkout volta a exigir zerado no botão', muta(CHECKOUT, 'const eligible = recargaAssinanteSubscriber(profile)', "const eligible = kind === 'button' ? recargaAssinanteEligible(profile, 9) : recargaAssinanteSubscriber(profile)")],
  ['entrada pinta para todos', muta(ENTRY, "if (alive && o && o.show === true && typeof o.go === 'string'", "if (alive && o && typeof o.go === 'string'")],
  ['chip do assinante vai à /pricing', muta(SIDEBAR, '    if (recargaChip) { // KINEO-ASSINANTE-COMPRA-SEMPRE-1211', '    if (false) { // KINEO-ASSINANTE-COMPRA-SEMPRE-1211')],
  ['chip abre a barra antiga', muta(SIDEBAR, '? <BuyCreditsModal offer={recargaChip} surface={topupSurface}', '? <CreditsTopupModal surface="sidebar_chip"')],
  ['painel sem Buy credits', muta(SIDEBAR, "onBuyCredits={recargaChip ? () => {", "onBuyCredits={false ? () => {")],
  ['texto pequeno', muta(ENTRY, "fontSize: 13, fontWeight: 700, textDecoration: 'underline'", "fontSize: 10, fontWeight: 700, textDecoration: 'underline'")],
  ['desenho sem Buy credits', muta(KIDS, '{!semPlano && !visitante && costLine.enough !== false ? <BuyCreditsLink', '{false ? <BuyCreditsLink')],
  ['volta do desenho perdida', muta(LIB, ", '/kids-cartoon', '/images'", ", '/images'")],
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
