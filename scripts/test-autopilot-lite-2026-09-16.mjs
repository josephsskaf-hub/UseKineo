// KINEO-AUTOPILOT-LITE-2026-09-16 — guardião do plano semanal (fundador 16/09: "vamos fazer esse Autopilot Lite…
// tudo integrado… um vídeo por semana"). Prova: (a) o tier existe na fonte única de preço com os invariantes
// financeiros rodando de verdade; (b) o robô entende cadência semanal (7 dias, 1 por slot) e o plano tem direito;
// (c) checkout, webhook, API de agendas, cron, UI, facts (llms) e MRR conhecem 'autopilot_lite'.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

// carregador com resolução de '@/lib/...' (transpila cada módulo uma vez)
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const req = (id) => {
    if (id.startsWith('@/lib/')) return load(id.slice(2) + '.ts')
    if (id.startsWith('./')) return load('lib/' + id.slice(2) + '.ts')
    throw new Error('import inesperado ' + id)
  }
  const js = ts.transpileModule(rd(file), { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: req, process: { env: {} }, console, Math, Date, Number, Set, Map }, { filename: file })
  return exports
}

console.log('== (a) preço e invariantes ==')
const CP = load('lib/checkoutPricing.ts')
checa('AUTOPILOT_LITE_PRICES.usd = 5900 (US$ 59, decisão do fundador)', CP.AUTOPILOT_LITE_PRICES.usd === 5900)
checa('TIER_CREDITS.autopilot_lite = 160 e o legado também', CP.TIER_CREDITS.autopilot_lite === 160 && CP.LEGACY_TIER_CREDITS_V6.autopilot_lite === 160)
checa('monthlyPriceMinor conhece o Lite; Autopilot e Studio intactos', CP.monthlyPriceMinor('autopilot_lite', 'usd') === 5900 && CP.monthlyPriceMinor('autopilot', 'usd') === 29900 && CP.monthlyPriceMinor('pro', 'usd') === 3990)
checa('renewalCreditsFor: fatura cheia → 160; fatura menor que o preço → legado (160)', CP.renewalCreditsFor('autopilot_lite', 5900) === 160 && CP.renewalCreditsFor('autopilot_lite', 5000) === 160)
const problemas = CP.checkPricingInvariants()
checa(`checkPricingInvariants() sem problemas com o Lite dentro (${problemas.length})`, Array.isArray(problemas) && problemas.length === 0)
checa('o Lite senta entre Studio e Autopilot no preço (39,90 < 59 < 299)', CP.TIER_PRICES.pro.usd < CP.AUTOPILOT_LITE_PRICES.usd && CP.AUTOPILOT_LITE_PRICES.usd < CP.AUTOPILOT_PRICES.usd)

console.log('== (b) robô: cadência semanal ==')
const C = load('lib/autopilot/config.ts')
checa("'autopilot_lite' tem direito ao robô e NÃO é plano com prazo", C.AUTOPILOT_PAID_PLANS.has('autopilot_lite') && !C.AUTOPILOT_TIME_BOXED_PLANS.has('autopilot_lite') && C.isAutopilotEntitled({ plan: 'autopilot_lite' }) === true)
checa('cadência nasce do plano: Lite = 7 dias, Autopilot/pilot = 1', C.intervalDaysForPlan('autopilot_lite') === 7 && C.intervalDaysForPlan('autopilot') === 1 && C.intervalDaysForPlan('autopilot_pilot') === 1 && C.intervalDaysForPlan(null) === 1)
checa('normalizeIntervalDays só conhece 1 e 7', C.normalizeIntervalDays(7) === 7 && C.normalizeIntervalDays('7') === 7 && C.normalizeIntervalDays(3) === 1 && C.normalizeIntervalDays(null) === 1)
checa('Lite é sempre 1 por slot (pedido de 3/dia vira 1)', C.clampPostsPerDayForPlan(3, 'autopilot_lite') === 1 && C.clampPostsPerDayForPlan(3, 'autopilot') === 3)
const from = new Date('2026-09-16T15:30:00Z')
const prox = C.computeNextRunAt({ from, postHourUtc: 14, postsPerDay: 1, intervalDays: 7 })
checa(`semanal: próxima run = 7 dias depois, na hora agendada (${prox.toISOString()})`, prox.toISOString() === '2026-09-23T14:00:00.000Z')
const diario = C.computeNextRunAt({ from, postHourUtc: 14, postsPerDay: 1 })
checa(`diário continua igual: amanhã na hora agendada (${diario.toISOString()})`, diario.toISOString() === '2026-09-17T14:00:00.000Z')
const proxDeNull = C.computeNextRunAt({ from: new Date('2026-09-16T13:00:00Z'), postHourUtc: 14, postsPerDay: 1, intervalDays: 7 })
checa('semanal a partir de antes da hora: ainda assim +7 dias (nunca hoje de novo)', proxDeNull.toISOString() === '2026-09-23T14:00:00.000Z')

console.log('== (c) fiação ==')
const ck = rd('app/api/stripe/checkout/route.ts')
checa('checkout: ?tier=autopilot_lite é aceito, mensal, sem intro, cobra pelo caminho do Autopilot', ck.includes("tierParam === 'autopilot_lite' ? 'autopilot_lite'") && ck.includes("if (tier === 'autopilot_lite') {\n    billing = 'monthly'\n    intro = false\n  }") && ck.includes("autopilot_lite: {\n    name: 'Kineo — Autopilot Lite',") && rd('lib/settlementCurrency.ts').includes("if (tier === 'autopilot_lite') return settlementAmountMinor(usdMinor, currency)"))
const wh = rd('app/api/stripe/webhook/route.ts')
checa('webhook: as 3 cadeias de tier reconhecem autopilot_lite (1ª compra, troca, renovação)', (wh.match(/=== 'autopilot_lite' \? 'autopilot_lite'/g) || []).length === 2 && wh.includes("currentSubscription.metadata?.tier === 'autopilot_lite'"))
const api = rd('app/api/autopilot/schedules/route.ts')
checa('API de agendas: interval_days vem do PLANO no POST e no PATCH, e sai no GET', api.includes('const intervalDays = intervalDaysForPlan(profile?.plan)') && api.includes('interval_days: intervalDays,') && api.includes('intervalDays: intervalDaysForPlan(profile?.plan), // KINEO-AUTOPILOT-LITE') && api.includes('intervalDays: normalizeIntervalDays(row.interval_days)'))
const cron = rd('app/api/cron/autopilot-generate/route.ts')
checa('cron: lê interval_days e avança a agenda com a cadência da linha', cron.includes('next_run_at, interval_days') && cron.includes('intervalDays: normalizeIntervalDays(schedule.interval_days)'))
checa('migração no repositório: coluna interval_days (1|7)', rd('supabase/migrations/20260916160000_autopilot_lite_interval_days.sql').includes('check (interval_days in (1, 7))'))
const ui = rd('app/(dashboard)/autopilot/AutopilotClient.tsx')
checa('UI do Autopilot: semanal mostra "one episode a week" e esconde "Shorts per day"', ui.includes('Posting one episode a week at') && ui.includes("{schedule.intervalDays !== 7 && (<div>"))
const pc = rd('app/pricing/PricingClient.tsx')
checa('/pricing: card do Lite acima do Autopilot, com CTA para tier=autopilot_lite e sem anual', pc.includes('id="autopilot-lite"') && pc.indexOf('id="autopilot-lite"') < pc.indexOf('id="autopilot" className') && pc.includes("handleBuy('autopilot_lite')") && pc.includes("const isAutopilotFamily = tier === 'autopilot' || tier === 'autopilot_lite'"))
const facts = rd('lib/kineoFacts.ts')
checa('facts/llms.txt: Lite descrito como semanal, entre os planos', facts.includes("id: 'autopilot_lite' as CheckoutTier") && facts.includes('AUTOPILOT_LITE_FACT,\n  AUTOPILOT_FACT,'))
const mrr = rd('app/api/admin/_shared/mrr.ts')
checa('MRR: Lite precificado e contado na família Autopilot', mrr.includes('autopilot_lite: PLANS.autopilot_lite.price') && mrr.includes(".replace('_lite', '')"))
checa('entitlement genérico: qualquer plano ≠ free já é pagante (isPayingProfile), sem lista nova', /plan\s*!==\s*'free'|!== 'free'/.test(rd('lib/reverseTrial.ts')))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
