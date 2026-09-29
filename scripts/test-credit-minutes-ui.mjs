// Offline integration: real JSX and billing-backed minutes. No requests, credentials or payments.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { renderPage } from './preview-ux-complete.mjs'

let checks = 0
const check = (value, label) => { assert.ok(value, label); checks++ }
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
function pure(file, imports = {}) {
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: 1, target: 9 } }).outputText, {
    module, exports: module.exports, require: id => { if (id in imports) return imports[id]; throw Error(id) },
  })
  return module.exports
}
const cost = pure('lib/credits/engineCost.ts')
const minutes = pure('lib/credits/creditMinutes.ts', { '@/lib/credits/engineCost': cost })
const summary = (credits, language = 'en', live = false) => renderPage('components/CreditMinutesSummary.tsx', false, { interfaceLanguage: language }, { credits, live })
for (const credits of [50, 60, 80, 150, 300, 2000]) {
  check(minutes.minutesLine(credits).split(" \u00b7 ").every(part=>summary(credits).includes(part)), `real summary uses source for ${credits}`)
}
check(summary(0) === '', 'no misleading minutes for zero balance')
check(['12 min of Kineo 1','2 min of Seedance 1.5'].every(part=>summary(60).includes(part)), 'current pass is 60 credits')
check(!summary(60).includes('Kling 3'), 'omit engine below half a minute')
check(summary(150, 'en', true).includes('aria-live="polite"'), 'slider announces updates')
check(['30 min de Kineo 1','6 min de Seedance 1.5','1 min de Kling 3'].every(part=>summary(150,'pt').includes(part)), 'Portuguese template')
check(summary(80, 'pt').includes('0,5 min de Kling 3'), 'localized half-minute decimal')
const copy = JSON.parse(read('lib/ui/refinementCopy.json'))
for (const language of Object.keys(copy)) {
  const html = summary(150, language)
  check(html.includes(`lang="${language}"`) && html.includes('Seedance 1.5'), `${language} retains engine labels`)
  check(!html.includes('{minutes}') && !html.includes('{engine}'), `${language} replaces both placeholders`)
  check(html.includes(copy[language]['Alternative uses of the same credits, not added together.']), `${language} explains alternatives`)
}

// Exercise the actual range handler, then render its resulting controlled amount.
let nextAmount = null
const controls = []
const props = { onClose() {}, surface: 'offline_minutes_test' }
const fixture = { amount: 50, currency: 'usd', captureControls: controls, onStateChange: (name, value) => { if (name === 'amount') nextAmount = value } }
renderPage('components/CreditsTopupModal.tsx', false, fixture, props)
const range = controls.find(c => c.type === 'input' && c.props.type === 'range')
check(!!range, 'actual popup range captured')
for (const amount of [150, 300, 2000, 50]) {
  range.props.onChange({ target: { value: String(amount) } })
  check(nextAmount === amount, 'range changes amount to ' + amount)
  const html = renderPage('components/CreditsTopupModal.tsx', false, { amount: nextAmount, currency: 'usd' }, props)
  check(minutes.minutesLine(amount).split(" \u00b7 ").every(part=>html.includes(part)), 'popup rerenders minutes for ' + amount)
}

// Same plan grant for monthly/annual: minutes never multiply the credits.
for (const billing of ['monthly', 'annual']) {
  const html = renderPage('app/pricing/PricingClient.tsx', false, { billing, currency: 'usd', demoOffer: true })
  for (const credits of [60, 150, 300]) check(minutes.minutesLine(credits).split(" \u00b7 ").every(part=>html.includes(part)), `${billing} plan ${credits}`)
}

// Evaluate the real pass description expression only, never the payment route.
const route = read('app/api/stripe/checkout/route.ts')
const pass = route.slice(route.indexOf('async function buildAdsPassAndRedirect'))
const template = pass.match(/description: (`[^`]+`)/)[1]
const description = vm.runInNewContext(template, { ADS_PASS_CREDITS: 60, minutesLine: minutes.minutesLine })
check(description.includes(minutes.minutesLine(60)), 'Stripe pass description uses the shared conversion')
check(description.includes('One-time payment, no subscription.'), 'pass keeps its payment terms')
const baseRoute = execFileSync('git', ['show', 'd3c21742:app/api/stripe/checkout/route.ts'], { encoding: 'utf8' }).replace(/\r\n/g, '\n')
const restoredRoute = route
  .replace("import { minutesLine } from '@/lib/credits/creditMinutes'\n", '')
  .replace(' ${minutesLine(ADS_PASS_CREDITS)} (alternative uses of the same credits).', '')
  .replace('    // A copy-only deploy must not reuse a Stripe key with different product parameters.\n    description: sessionParams.line_items?.[0]?.price_data?.product_data?.description,\n', '')
  // KINEO-STRIPE-ATRASO-2026-09-28 — o conserto do past_due (import da regra única + grantsAccess) tem guardião próprio
  // (scripts/test-stripe-atraso-2-meses-2026-09-28.mjs); aqui ele é desfeito para esta comparação seguir provando que a
  // mudança dos minutos foi só copy.
  .replace(/\/\/ KINEO-STRIPE-ATRASO-2026-09-28[^\n]*\n\/\/[^\n]*\nimport \{ stripeSubscriptionKeepsAccess \} from '@\/lib\/billing\/subscriptionAccess'\n/, '')
  .replace(/    \/\/ KINEO-STRIPE-ATRASO-2026-09-28[^\n]*\n(?:    \/\/[^\n]*\n){2}    const grantsAccess = stripeSubscriptionKeepsAccess\(existingCustomerSubscription\.status\)\n/, "    const grantsAccess = existingCustomerSubscription.status === 'active' || existingCustomerSubscription.status === 'trialing'\n")
check(restoredRoute === baseRoute, 'checkout change is only display copy and its idempotency signature')
check(read('app/ads/page.tsx').includes('<CreditMinutesSummary credits={ADS_PASS_CREDITS} />'), 'pass review uses current grant')
check(read('components/pricing/PricingAdsBlock.tsx').includes('<CreditMinutesSummary credits={pass.credits} />'), 'pricing pass uses offer model grant')

// Pin the founder freeze, checking real source files rather than a second price table.
// 28/09: passe B do fundador (90 cr) — a ÚNICA mudança de cobrança autorizada desde o congelamento é a linha do passe em
// checkPricingInvariants (60 → 90 créditos, mesmo US$19,90). Ela é desfeita aqui antes da comparação: qualquer outro byte
// de lib/checkoutPricing.ts que mudar continua vermelho.
const PASSE_B_ROW_NOW = "    // 28/09: passe B do fundador (90 cr pelo mesmo US$19,90).\n    { id: 'pack:ads_pass', usdMinor: 1990, credits: 90, advertisedQuality: 'cinematic_ai' },"
const PASSE_B_ROW_FROZEN = "    { id: 'pack:ads_pass', usdMinor: 1990, credits: 60, advertisedQuality: 'cinematic_ai' },"
// KINEO-PRECO-V8-A-2026-09-28 — reancorado com motivo: a escada 13/30/55 do fundador (28/09: "subir um pouco o preço, 3 degraus
// como o mercado") é a SEGUNDA mudança de cobrança autorizada desde o congelamento, e ela reescreve tabelas (TIER/ANNUAL/INTRO),
// a lista de ambíguos e a escada legada de lib/checkoutPricing.ts — não uma linha que dê para desfazer antes de comparar. O pino
// desse arquivo passa a ser o SHA-256 do TEXTO (um SHA de commit desta branch morreria no rebase do enfileirar.sh); qualquer byte
// que mudar depois continua vermelho, que é o que o congelamento quer. engineCost e creditSlider seguem pinados ao commit do
// congelamento (nada mudou neles). PASSE_B_ROW_FROZEN fica como registro do que era a linha antes do passe B.
const PRICING_V8A_SHA256 = '47d79ff31ea2a4352c0aad7349424aecf6c36d3bc0703037a1d111519f18ce4a'
void PASSE_B_ROW_FROZEN
// KINEO-PRECO-V8-A-2026-09-28 — creditSlider sai do pino por commit: o fundador subiu o piso da barra de 0,149 para 0,189 junto com
// o vai da escada 12,90/29,90/54,90 ("barra de crédito mais cara"). Passa a ser pinado ao SHA-256 do texto, como o checkoutPricing.
const SLIDER_V8A_SHA256 = 'ed09e5e147764874186148ede44e567b366153575738dd2a98c4e2b28363fc21'
check(createHash('sha256').update(read('lib/credits/creditSlider.ts')).digest('hex') === SLIDER_V8A_SHA256, 'unchanged billing source (pinned to the V8-A text of 28/09 by sha256): lib/credits/creditSlider.ts')
for (const file of ['lib/credits/engineCost.ts']) {
  const base = execFileSync('git', ['show', `d3c21742:${file}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n')
  check(read(file) === base, 'unchanged billing source: ' + file)
}
check(createHash('sha256').update(read('lib/checkoutPricing.ts')).digest('hex') === PRICING_V8A_SHA256, 'unchanged billing source (pinned to the V8-A text of 28/09 by sha256): lib/checkoutPricing.ts')
check(read('lib/checkoutPricing.ts').split(PASSE_B_ROW_NOW).length === 2, 'passe B: the pass row in checkPricingInvariants says 90 credits (28/09)')
// KINEO-ADS-SPRINT16H-2026-09-27 — lib/ads/offer.ts changed COPY only on 27/09 (the founder dropped "within 24 hours" and
// "corrected version"; square/landscape cuts exist since 26/09). The byte pin for that file now freezes its BILLING SURFACE
// (every exported number, the price label, the coverage figures and the credits line of the pass copy), evaluated from the
// frozen commit and from the working file: a price or credit change still fails here, a sentence change does not.
{
  const file = 'lib/ads/offer.ts'
  const pureSource = source => {
    const module = { exports: {} }
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: 1, target: 9 } }).outputText, { module, exports: module.exports, require: id => { throw Error(id) } })
    return module.exports
  }
  const frozen = pureSource(execFileSync('git', ['show', `d3c21742:${file}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n'))
  const now = pureSource(read(file))
  const surface = m => JSON.stringify({
    id: m.ADS_PASS_ID, minor: m.ADS_PASS_USD_MINOR, credits: m.ADS_PASS_CREDITS, days: m.ADS_PASS_ACCESS_DAYS, occupied: m.ONE_TIME_USD_MINOR_OCCUPIED,
    k60: m.KINEO1_60S_CREDITS, k35: m.KINEO1_35S_CREDITS, live: m.ADS_PASS_LIVE_IN_CODE, label: m.adsPassPriceLabel(),
    c35: m.adsCoveredByPass(35), c60: m.adsCoveredByPass(60), name: m.adsPassCopy().name, price: m.adsPassCopy().price, creditsLine: m.adsPassCopy().includes[0],
  })
  // 28/09: passe B do fundador (90 cr) — os créditos do passe, a cobertura derivada deles e a linha de créditos da copy mudaram
  // por decisão; o resto da superfície (SKU, preço, dias, valores ocupados, custos do Kineo 1, interruptor, rótulo) segue congelado.
  // KINEO-PRECO-V8-A-2026-09-28 — a lista de valores ocupados acompanha a escada 13/30/55 (anuais 12900/29900/54900 no lugar
  // de 9900/19900/39900; mensais 2990/5490 entram): sai da comparação congelada; o passe (1990) segue fora dela por test-ads-fundacao.
  const semPasse = m => { const s = JSON.parse(surface(m)); delete s.credits; delete s.c35; delete s.c60; delete s.creditsLine; delete s.occupied; return JSON.stringify(s) }
  check(semPasse(now) === semPasse(frozen), 'unchanged billing surface: ' + file)
  check(now.ADS_PASS_CREDITS === 90 && now.adsCoveredByPass(35) === Math.floor(90 / now.KINEO1_35S_CREDITS) && now.adsCoveredByPass(60) === Math.floor(90 / now.KINEO1_60S_CREDITS), 'passe B: 90 credits and the coverage computed from them')
  check(now.adsPassCopy().includes[0].startsWith(`${now.ADS_PASS_CREDITS} credits: ${now.adsCoverageLine()}`), 'passe B: the credits line of the pass copy is computed')
}
console.log(`Credit minutes UI: ${checks} checks passed; offline, no payments.`)
