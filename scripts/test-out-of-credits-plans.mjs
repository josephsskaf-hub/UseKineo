// sprint-assinaturas #13 — o 402 do /images e do /audio para quem NAO pode
// comprar recarga (trial/free/starter) — nunca mais um pack que o checkout
// recusa com topup_requires_creator_plus.
// node scripts/test-out-of-credits-plans.mjs
// Executa o modulo puro (lib/credits/outOfCreditsPlans.ts) com as tabelas
// REAIS lidas de lib/checkoutPricing.ts / topupEligibility.ts e prova os dois
// clientes + o modal por leitura (o que abre, quando, e o que nunca faz).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓', msg) } else { fail++; console.log('  ✗', msg) } }
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const tsjs = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 } }).outputText

// --- tabelas reais, extraidas dos arquivos que a Stripe cobra ---------------
const pricing = read('lib/checkoutPricing.ts')
const tierCreditsBlock = pricing.slice(pricing.indexOf('export const TIER_CREDITS'), pricing.indexOf('}', pricing.indexOf('export const TIER_CREDITS')))
const tierPricesBlock = pricing.slice(pricing.indexOf('export const TIER_PRICES'), pricing.indexOf('}\n', pricing.indexOf('export const TIER_PRICES')))
const num = (block, key) => { const m = block.replace(/\/\/.*$/gm, '').match(new RegExp(`\\b${key}:\\s*(\\d+)`)); return m ? Number(m[1]) : NaN }
const usd = (block, key) => { const m = block.replace(/\/\/.*$/gm, '').match(new RegExp(`\\b${key}:\\s*\\{\\s*usd:\\s*(\\d+)`)); return m ? Number(m[1]) : NaN }
const TIER_CREDITS = { starter: num(tierCreditsBlock, 'starter'), basic: num(tierCreditsBlock, 'basic'), pro: num(tierCreditsBlock, 'pro') }
const TIER_PRICES = { starter: { usd: usd(tierPricesBlock, 'starter') }, basic: { usd: usd(tierPricesBlock, 'basic') }, pro: { usd: usd(tierPricesBlock, 'pro') } }
ok(Object.values(TIER_CREDITS).every(Number.isFinite) && Object.values(TIER_PRICES).every((p) => Number.isFinite(p.usd)), `tabelas lidas: credits ${JSON.stringify(TIER_CREDITS)} prices ${JSON.stringify(TIER_PRICES)}`)

const tmpDir = path.join(root, 'scripts', '.out-of-credits-test')
fs.mkdirSync(tmpDir, { recursive: true })
const w = (name, code) => { const p = path.join(tmpDir, name); fs.writeFileSync(p, code); return p }
w('topupEligibility.mjs', tsjs(read('lib/growth/topupEligibility.ts')))
w('checkoutPricing.mjs', `export const TIER_CREDITS = ${JSON.stringify(TIER_CREDITS)};
export const TIER_PRICES = ${JSON.stringify(TIER_PRICES)};
export function formatCheckoutMoney(currency, amountMinor) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountMinor / 100) }`)
const src = read('lib/credits/outOfCreditsPlans.ts')
  .replace("'@/lib/checkoutPricing'", "'./checkoutPricing.mjs'")
  .replace("'@/lib/growth/topupEligibility'", "'./topupEligibility.mjs'")
const modPath = w('outOfCreditsPlans.mjs', tsjs(src))
const m = await import(`file://${modPath}?t=${Date.now()}`)
fs.rmSync(tmpDir, { recursive: true, force: true })

console.log('destino por plano (mesma regra do checkout)')
ok(m.outOfCreditsDestination('basic') === 'topup', 'Creator -> recarga')
ok(m.outOfCreditsDestination('pro') === 'topup', 'Studio -> recarga')
ok(m.outOfCreditsDestination('basic_trial') === 'topup', 'basic_trial -> recarga (tabela do checkout)')
ok(m.outOfCreditsDestination('PRO ') === 'topup', 'normaliza caixa/espaco')
ok(m.outOfCreditsDestination('starter') === 'pricing', 'Starter -> planos (checkout recusaria o pack)')
ok(m.outOfCreditsDestination('free') === 'pricing', 'free -> planos')
ok(m.outOfCreditsDestination('trial') === 'pricing', 'trial -> planos')
ok(m.outOfCreditsDestination(undefined) === 'pricing', 'plano desconhecido -> planos (destino seguro)')
ok(m.outOfCreditsDestination(null) === 'pricing', 'null -> planos')

console.log('href')
ok(m.outOfCreditsPricingHref('images') === '/pricing?utm_source=images&utm_medium=paywall&utm_campaign=images_out_of_credits', 'images utm')
ok(m.outOfCreditsPricingHref('audio') === '/pricing?utm_source=audio&utm_medium=paywall&utm_campaign=audio_out_of_credits', 'audio utm')

console.log('linhas de plano derivadas (nunca digitadas)')
const rows2 = m.planRowsForUnit(2) // FLUX Dev = 2cr; MiniMax <=1000 chars = 2cr
ok(rows2.length === 3 && rows2.map((r) => r.tier).join() === 'starter,basic,pro', '3 linhas, ordem de preco')
ok(rows2[0].units === Math.floor(TIER_CREDITS.starter / 2), `Starter = ${rows2[0].units} unidades a 2cr (${TIER_CREDITS.starter}/2)`)
ok(rows2[1].units === Math.floor(TIER_CREDITS.basic / 2), `Creator = ${rows2[1].units} unidades a 2cr`)
ok(rows2[2].units === Math.floor(TIER_CREDITS.pro / 2), `Studio = ${rows2[2].units} unidades a 2cr`)
ok(rows2[1].highlighted && !rows2[0].highlighted && !rows2[2].highlighted, 'so o Creator destacado')
ok(rows2[0].price === `$${(TIER_PRICES.starter.usd / 100).toFixed(2)}`, `preco Starter da tabela: ${rows2[0].price}`)
ok(rows2[2].price === `$${(TIER_PRICES.pro.usd / 100).toFixed(2)}`, `preco Studio da tabela: ${rows2[2].price}`)
const rows5 = m.planRowsForUnit(5) // Nano Banana Pro
ok(rows5[0].units === Math.floor(TIER_CREDITS.starter / 5) && rows5[2].units === Math.floor(TIER_CREDITS.pro / 5), 'custo 5 recalcula as unidades')
ok(m.planRowsForUnit(0)[0].units === TIER_CREDITS.starter, 'custo 0 vira 1 (nunca Infinity)')
ok(m.planRowsForUnit(Number.NaN)[0].units === TIER_CREDITS.starter, 'custo NaN vira 1')
ok(m.planRowsForUnit(2.9)[0].units === Math.floor(TIER_CREDITS.starter / 2), 'custo fracionado arredonda para baixo')
ok(m.planRowsForUnit(1e9)[0].units === 0, 'custo absurdo = 0 unidades (nao quebra)')

console.log('copy honesta')
ok(m.planRowLabel('images', rows2[0]) === `${TIER_CREDITS.starter} cr/mo = ${rows2[0].units} images`, `label imagens: "${m.planRowLabel('images', rows2[0])}"`)
ok(m.planRowLabel('audio', rows2[0]).endsWith(' audio clips'), 'label audio usa "audio clips"')
ok(m.unitNoun('images', 1) === 'image' && m.unitNoun('audio', 1) === 'audio clip', 'singular certo')
ok(m.outOfCreditsHeadline('images', 3) === 'Out of credits — the 3 images you just made are yours.', 'titulo com numero real (3 imagens)')
ok(m.outOfCreditsHeadline('audio', 1) === 'Out of credits — the 1 audio clip you just made is yours.', 'titulo singular (1 clipe)')
ok(!m.outOfCreditsHeadline('images', 0).includes('0'), 'nunca imprime "0 images"')
ok(m.outOfCreditsHeadline('audio', -2) === m.outOfCreditsHeadline('audio', 0), 'negativo = zero')
const bodyP = m.outOfCreditsBody({ product: 'images', destination: 'pricing', credits: 1, unitCost: 2 })
ok(bodyP.startsWith('You have 1 credit and this image costs 2.'), `corpo planos: "${bodyP}"`)
ok(bodyP.includes('refills every month') && !/pack/i.test(bodyP), 'corpo planos nao fala em pack')
const bodyT = m.outOfCreditsBody({ product: 'audio', destination: 'topup', credits: 0, unitCost: 2 })
ok(bodyT.startsWith('You have 0 credits and this clip costs 2.') && bodyT.includes('plan stays the same'), `corpo recarga: "${bodyT}"`)
ok(m.outOfCreditsBody({ product: 'images', destination: 'pricing', credits: null, unitCost: 2 }).startsWith('You are out of credits'), 'saldo desconhecido = frase sem numero inventado')
const forbidden = /priority|1080p|premium voice|forever storage|12 characters|every engine unlocked/i
ok(!forbidden.test(src) && !forbidden.test(read('components/OutOfCreditsPlansModal.tsx')), 'sem promessa da lista de copy que mente')
ok(!/\$\s?\d/.test(src.replace(/\/\/.*$/gm, '')) && !/\b(40|90|180)\b/.test(src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), 'nenhum preco/credito digitado no modulo')

console.log('OutOfCreditsPlansModal (leitura)')
const modal = read('components/OutOfCreditsPlansModal.tsx')
ok(modal.includes("from '@/lib/credits/outOfCreditsPlans'") && modal.includes('planRowsForUnit(unitCost)'), 'modal deriva as linhas do modulo')
ok(modal.includes('outOfCreditsPricingHref(product)') && modal.includes('href={href}'), 'CTA vai ao /pricing com utm')
ok(modal.includes('`${product}_paywall_shown`') && modal.includes('`${product}_paywall_cta`'), 'eventos images_/audio_paywall_shown e _cta')
const modalCode = modal.replace(/\/\/.*$/gm, '')
ok(!modalCode.includes('CreditsTopupModal') && !modalCode.includes('useCheckoutLaunch') && !modalCode.includes('/api/stripe/checkout'), 'modal de planos NUNCA abre checkout de pack')
ok(modal.includes("e.key === 'Escape'") && modal.includes('aria-modal="true"'), 'fecha no Esc, dialog acessivel')
ok(!/\b(40|90|180)\s*(cr|credits)/i.test(modalCode) && !/\$\s?\d/.test(modalCode), 'nenhum credito/preco digitado no modal')

for (const [file, product, unitExpr] of [
  ['app/(dashboard)/images/ImagesClient.tsx', 'images', 'unitCost={unitCost}'],
  ['app/(dashboard)/audio/AudioClient.tsx', 'audio', 'unitCost={credits}'],
]) {
  console.log(`${product}: cliente (leitura)`)
  const c = read(file)
  ok(c.includes("import OutOfCreditsPlansModal from '@/components/OutOfCreditsPlansModal'") && c.includes("outOfCreditsDestination } from '@/lib/credits/outOfCreditsPlans'"), 'importa modal + regra')
  ok(c.includes("if (outOfCreditsDestination(plan) === 'topup') setShowTopup(true)") && c.includes('else setShowPlans(true)'), 'openCreditsWall decide pela regra do checkout')
  const direct = c.split('\n').filter((l) => l.includes('setShowTopup(true)') && !l.includes('outOfCreditsDestination'))
  ok(direct.length === 0, `nenhum setShowTopup(true) direto sobrou (${direct.length})`)
  ok(!/not enough credits\/i\.test\(m\)\) setShowTopup/.test(c), '402 -> openCreditsWall, nao mais direto ao pack')
  ok(c.includes('onClick={openCreditsWall}'), '"Add credits →" do erro tambem decide pela regra')
  ok(c.includes(`product="${product}"`) && c.includes(unitExpr) && c.includes('madeThisSession={madeThisSession}'), `modal montado com custo real (${unitExpr}) e contagem da visita`)
  ok(c.includes("const [plan, setPlan] = useState<string>('free')"), "plano nasce 'free' (= planos, destino seguro)")
  ok(c.includes("fetch('/api/credits', { cache: 'no-store' })") && c.includes("typeof d?.plan === 'string'"), 'plano vem de /api/credits (mesma fonte do /animate)')
  ok(c.includes('setMadeThisSession((n) => n + 1)'), 'sucesso incrementa a contagem da visita')
  ok(c.includes(`surface="${product}_402"`), 'Creator/Studio seguem no CreditsTopupModal (surface intacta)')
}
const img = read('app/(dashboard)/images/ImagesClient.tsx')
ok(img.includes('const unitCost = Number.parseInt(eng.credits, 10) || 1'), 'imagens: custo da unidade = motor selecionado (ex.: "5 cr" -> 5)')
ok((img.match(/test\(m\)\) openCreditsWall\(\)/g) || []).length === 3, 'imagens: generate + edit + upscale passam pela parede (3 pontos de 402)')

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
