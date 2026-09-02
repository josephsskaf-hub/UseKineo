// sprint-assinaturas #12 — a parede do /animate quando o saldo zera.
// node scripts/test-animate-paywall.mjs
// Executa o modulo puro (lib/animate/paywall.ts) com as tabelas REAIS lidas
// de lib/checkoutPricing.ts / topupEligibility.ts / cost.ts e prova o
// AnimateClient por leitura (o que abre, quando, e o que nunca faz).
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

const tmpDir = path.join(root, 'scripts', '.animate-paywall-test')
fs.mkdirSync(tmpDir, { recursive: true })
const w = (name, code) => { const p = path.join(tmpDir, name); fs.writeFileSync(p, code); return p }
w('cost.mjs', tsjs(read('lib/animate/cost.ts')))
w('topupEligibility.mjs', tsjs(read('lib/growth/topupEligibility.ts')))
w('checkoutPricing.mjs', `export const TIER_CREDITS = ${JSON.stringify(TIER_CREDITS)};
export const TIER_PRICES = ${JSON.stringify(TIER_PRICES)};
export function formatCheckoutMoney(currency, amountMinor) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountMinor / 100) }`)
const paywallSrc = read('lib/animate/paywall.ts')
  .replace("'@/lib/animate/cost'", "'./cost.mjs'")
  .replace("'@/lib/checkoutPricing'", "'./checkoutPricing.mjs'")
  .replace("'@/lib/growth/topupEligibility'", "'./topupEligibility.mjs'")
const modPath = w('paywall.mjs', tsjs(paywallSrc))
const m = await import(`file://${modPath}?t=${Date.now()}`)
const cost = (await import(`file://${path.join(tmpDir, 'cost.mjs')}`)).ANIMATE_COST
fs.rmSync(tmpDir, { recursive: true, force: true })

console.log('cost: uma casa so')
ok(cost === 5, `ANIMATE_COST = ${cost} (lib/animate/cost.ts)`)
const service = read('lib/animate/service.ts')
ok(!/export const ANIMATE_COST\s*=/.test(service) && service.includes("import { ANIMATE_COST } from '@/lib/animate/cost'") && service.includes('export { ANIMATE_COST }'), 'service.ts importa e re-exporta (rotas seguem funcionando)')
ok(!read('lib/animate/cost.ts').includes('import '), 'cost.ts sem import (cliente-safe)')

console.log('isOutOfAnimateCredits')
ok(m.isOutOfAnimateCredits(0, true, false) === true, '0cr logado parado = parede')
ok(m.isOutOfAnimateCredits(4, true, false) === true, '4cr (< custo) = parede')
ok(m.isOutOfAnimateCredits(5, true, false) === false, '5cr = sem parede')
ok(m.isOutOfAnimateCredits(null, true, false) === false, 'saldo desconhecido = sem parede (nao vender no escuro)')
ok(m.isOutOfAnimateCredits(0, false, false) === false, 'deslogado = sem parede (ja tem o sign in)')
ok(m.isOutOfAnimateCredits(0, true, true) === false, 'clipe rodando = sem parede (saldo provisorio)')
ok(m.isOutOfAnimateCredits(Number.NaN, true, false) === false, 'NaN = sem parede')

console.log('destino por plano (mesma regra do checkout)')
ok(m.animatePaywallDestination('basic') === 'topup', 'Creator -> recarga')
ok(m.animatePaywallDestination('pro') === 'topup', 'Studio -> recarga')
ok(m.animatePaywallDestination('PRO ') === 'topup', 'normaliza caixa/espaco como o checkout')
ok(m.animatePaywallDestination('starter') === 'pricing', 'Starter -> planos (checkout recusa topup)')
ok(m.animatePaywallDestination('free') === 'pricing', 'free -> planos')
ok(m.animatePaywallDestination(undefined) === 'pricing', 'sem plano -> planos')
ok(m.animatePaywallDestination('basic_trial') === 'topup', 'basic_trial acompanha o checkout')

console.log('motivo')
ok(m.animatePaywallReason({ phase: 'failed', lastInsufficient: true }) === 'insufficient_402', '402 -> insufficient_402')
ok(m.animatePaywallReason({ phase: 'done', lastInsufficient: false }) === 'balance_after_clip', 'clipe chegou e zerou -> balance_after_clip')
ok(m.animatePaywallReason({ phase: 'idle', lastInsufficient: false }) === 'balance_on_load', 'entrou sem saldo -> balance_on_load')
ok(m.animatePaywallReason({ phase: 'done', lastInsufficient: true }) === 'insufficient_402', '402 vence o done')

console.log('numeros derivados')
ok(m.animateClipsPerMonth('starter') === Math.floor(TIER_CREDITS.starter / cost), `Starter = ${m.animateClipsPerMonth('starter')} clips (${TIER_CREDITS.starter}/${cost})`)
ok(m.animateClipsPerMonth('basic') === Math.floor(TIER_CREDITS.basic / cost), `Creator = ${m.animateClipsPerMonth('basic')} clips`)
ok(m.animateClipsPerMonth('pro') === Math.floor(TIER_CREDITS.pro / cost), `Studio = ${m.animateClipsPerMonth('pro')} clips`)
const rows = m.animatePlanRows()
ok(rows.length === 3 && rows.map((r) => r.tier).join() === 'starter,basic,pro', '3 linhas em ordem de preco')
ok(rows.map((r) => r.name).join() === 'Starter,Creator,Studio', 'nomes como o site mostra')
ok(rows[1].highlighted && !rows[0].highlighted && !rows[2].highlighted, 'Creator destacado')
ok(rows[0].price === `$${(TIER_PRICES.starter.usd / 100).toFixed(2)}` && rows[2].price === `$${(TIER_PRICES.pro.usd / 100).toFixed(2)}`, `precos da tabela: ${rows.map((r) => r.price).join(' / ')}`)
ok(rows.every((r) => r.credits === TIER_CREDITS[r.tier]), 'creditos da tabela')
ok(!/\b[1-9]\d* ?(credits|cr)\b/.test(paywallSrc.replace(/\/\/.*$/gm, '').replace(/`[^`]*`/g, '')), 'nenhum numero de credito digitado no modulo (fora de template; "0 credits" e o unico literal)')
ok(!/\$\d/.test(paywallSrc.replace(/\/\/.*$/gm, '')), 'nenhum preco digitado no modulo')

console.log('copy honesta')
ok(m.animatePaywallHeadline(5) === 'Out of credits — the 5 clips you just made are yours.', 'titulo com numero real (5)')
ok(m.animatePaywallHeadline(1) === 'Out of credits — the 1 clip you just made is yours.', 'singular')
ok(m.animatePaywallHeadline(0) === 'Out of credits — every clip you made is yours.', 'sem clipe na sessao: nunca imprime "0 clips"')
ok(m.animatePaywallHeadline(-3) === 'Out of credits — every clip you made is yours.', 'negativo = sem numero')
ok(m.animatePaywallBody('topup', 0).startsWith('You have 0 credits and a clip costs 5.') && /plan stays the same/.test(m.animatePaywallBody('topup', 0)), 'corpo topup: saldo + custo + sem trocar de plano')
ok(m.animatePaywallBody('pricing', 3).startsWith('You have 3 credits and a clip costs 5.'), 'corpo planos: saldo real')
ok(m.animatePaywallBody('pricing', 1).startsWith('You have 1 credit and'), 'singular credit')
ok(!/priority|1080p|premium voice|every engine|forever|unlock/i.test(paywallSrc), 'sem promessa da lista de copy-que-mente')
ok(!/discount|coupon|% off|first month/i.test(paywallSrc), 'sem desconto/cupom/first month')
ok(m.ANIMATE_PAYWALL_PRICING_HREF.startsWith('/pricing?') && m.ANIMATE_PAYWALL_PRICING_HREF.includes('utm_campaign=animate_out_of_credits'), 'link de planos com utm mensuravel')

console.log('AnimateClient: liga os fios')
const client = read('app/(dashboard)/animate/AnimateClient.tsx')
ok(client.includes("import CreditsTopupModal from '@/components/CreditsTopupModal'") && client.includes('surface="animate_402"'), 'popup de recarga com surface animate_402 (mesmo padrao de images/audio)')
ok(client.includes("import { ANIMATE_COST } from '@/lib/animate/cost'") && !client.includes("from '@/lib/animate/service'"), 'cliente importa o custo de cost.ts, nunca de service.ts (node:crypto)')
ok(client.includes('{ANIMATE_COST} credits · {duration}s') && !client.includes('<b>5 credits'), '"Cost per clip" derivado, nao digitado')
ok(client.includes("(credits ?? 0) >= ANIMATE_COST ? '#5cb3ff'"), 'cor do saldo compara com o custo real')
ok(client.includes("if (typeof data?.plan === 'string') setPlan(data.plan)"), 'plano vem de /api/credits')
const r402 = client.slice(client.indexOf('if (res.status === 402) {'), client.indexOf('if (!res.ok || typeof data?.request_id'))
ok(r402.includes("if (typeof data?.balance === 'number') setCredits(data.balance)") && r402.includes('setLastInsufficient(true)'), '402: saldo do servidor + motivo insufficient_402')
ok(r402.includes("if (animatePaywallDestination(plan) === 'topup') setShowTopup(true)"), '402 em Creator/Studio abre a recarga direto')
ok(!r402.includes('setShowTopup(true)\n') || r402.includes("=== 'topup') setShowTopup(true)"), '402 em trial/free NAO abre a recarga (checkout recusaria)')
ok(client.includes('setClipsThisSession((n) => n + 1)') && client.indexOf('setClipsThisSession((n) => n + 1)') > client.indexOf("reportAnimateOutcome('delivered'"), 'conta o clipe so quando ENTREGUE')
ok(client.includes("void trackEvent('animate_paywall_shown'") && client.includes("void trackEvent('animate_paywall_cta'"), 'eventos shown/cta')
ok(client.includes('paywallTrackedRef.current === paywallReason') , 'um evento por motivo por visita')
ok(client.includes("{outOfCredits && phase !== 'done' && (") && client.includes('{outOfCredits ? (') && client.includes('compact'), 'parede no formulario OU embaixo do video (nunca as duas)')
ok(client.includes('↺ Animate another'), 'botao "Animate another" continua para quem tem saldo')
ok(!/video_credits|\.update\(|stripe\./.test(client.replace(/\/\/.*$/gm, '')), 'cliente nao mexe em credito/plano/stripe')
ok(client.includes('window.location.assign(ANIMATE_PAYWALL_PRICING_HREF)'), 'CTA de planos vai para o href com utm')
ok(client.includes('setLastInsufficient(false)') && client.indexOf('setLastInsufficient(false)') > client.indexOf('function handleGenerate()'), 'novo Generate limpa o motivo 402')
ok(!client.includes('UpgradeModal'), 'nao usa o UpgradeModal (copy "priority render queue" da lista de copy-que-mente)')

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
