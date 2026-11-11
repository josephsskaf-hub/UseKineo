// KINEO-BARRA-DE-CREDITOS-2026-09-23 — guardião da barra de créditos (fundador: "vai com mínimo 50, escada aprovada,
// pode liberar"). Prova, em TODOS os degraus: (1) faixa 50–2.000 de 10 em 10, nada fora disso tem preço; (2) a escada
// aprovada (0,199 até 100 → 0,149 em 1.000 → plana até 2.000, etiqueta ,90) e preço nunca cai quando a quantidade sobe;
// (3) nenhum degrau fica mais barato por crédito que o plano mais barato (assinar segue valendo mais a pena); (4) em
// reais, pela fórmula da casa; (5) a rota da Stripe recalcula o preço no servidor, grava pack_credits para o webhook e
// recusa quantidade inválida sem trocar de pacote; (6) o pop-up usa a MESMA função e nunca manda preço; (7) mutantes.
// KINEO-RECARGA-ASSINANTE-1111 [fundador 11/11: "eu aprovo a escada de 9 dólares até 500 dólares… só para assinantes"] —
// REANCORADO na escada nova: 60–3.700 de 10 em 10; 60 = US$ 9 (o botão do aviso de sem crédito, a mesma constante) → linha
// reta até US$ 0,135 em 2.000 → plana até 3.700 = US$ 500; dólar inteiro (sem ",90"). (4) passou a provar a margem com
// cartão internacional em TODOS os degraus (a barra do assinante cobra só em USD).
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
function roda(src, req = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) })
  return m.exports
}
const SLIDER_SRC = rd('lib/credits/creditSlider.ts')
// KINEO-RECARGA-ASSINANTE-1111 — o engineCost passou a importar o custo do Kling 4.0 (já quebrava assim na origin/main).
const K4POLICY = roda(rd('lib/kling4PaidPolicy.ts'))
const K4PRICING = roda(rd('lib/kling4PaidPricing.ts'))
const COST = roda(rd('lib/credits/engineCost.ts'), { '@/lib/kling4PaidPolicy': K4POLICY, '@/lib/kling4PaidPricing': K4PRICING })
const AUTO = roda(rd('lib/autopilot/config.ts'), { '@/lib/credits/engineCost': COST })
const PRICING = roda(rd('lib/checkoutPricing.ts'), { '@/lib/credits/engineCost': COST, '@/lib/autopilot/config': AUTO })
const SETTLE = roda(rd('lib/settlementCurrency.ts'), { './checkoutPricing': PRICING })

function provas(S) {
  const R = []
  const degraus = []
  for (let c = S.CREDIT_SLIDER_MIN; c <= S.CREDIT_SLIDER_MAX; c += S.CREDIT_SLIDER_STEP) degraus.push(c)
  R.push(['(1) faixa aprovada: 60–3.700 de 10 em 10 (o mínimo é o botão)', S.CREDIT_SLIDER_MIN === 60 && S.CREDIT_SLIDER_MAX === 3700 && S.CREDIT_SLIDER_STEP === 10 && S.CREDIT_SLIDER_MIN === S.RECARGA_ASSINANTE_1111.credits])
  R.push(['(1) fora da faixa ou fora do passo não tem preço', [0, 40, 50, 55, 65, 355, 3710, 5000, -50, '1e3', 'abc', null, 100.5].every((x) => S.sliderPriceUsdMinor(x) === null)])
  R.push(['(1) quantidade como texto da URL é aceita só se limpa', S.normalizeSliderCredits('300') === 300 && S.normalizeSliderCredits(' 300 ') === 300 && S.normalizeSliderCredits('300abc') === null])
  // KINEO-RECARGA-ASSINANTE-1111 — a tabela de 28/09 (50=9,90 · 100=19,90 · 300=58,90 · 500=96,90 · 1.000=188,90 · 2.000=377,90) saiu.
  const tabela = { 60: 900, 350: 5200, 2000: 27000, 3700: 50000 }
  R.push(['(2) conferência do fundador (60=$9 · 350=$52 · 700=$100–102 · 2.000=$270 · 3.700=$500)', Object.entries(tabela).every(([c, v]) => S.sliderPriceUsdMinor(Number(c)) === v) && S.sliderPriceUsdMinor(700) >= 10000 && S.sliderPriceUsdMinor(700) <= 10200])
  R.push(['(2) o 1º degrau é EXATAMENTE o botão (uma fonte só)', S.sliderPriceUsdMinor(S.CREDIT_SLIDER_MIN) === S.RECARGA_ASSINANTE_1111.usdMinor && S.RECARGA_ASSINANTE_1111.usdMinor === 900])
  R.push(['(2) todo preço em dólar inteiro', degraus.every((c) => S.sliderPriceUsdMinor(c) % 100 === 0)])
  R.push(['(2) mais créditos nunca custam menos no total', degraus.every((c, i) => i === 0 || S.sliderPriceUsdMinor(c) >= S.sliderPriceUsdMinor(degraus[i - 1]))])
  R.push(['(2) por crédito nunca sobe quando a quantidade sobe', degraus.every((c, i, a) => i === 0 || S.sliderRatePerCredit(c) <= S.sliderRatePerCredit(a[i - 1]) + 1e-12)])
  const margens = degraus.map((c) => S.netAfterStripeIntlCardUsd(S.sliderPriceUsdMinor(c) / 100) - Math.max(PRICING.worstCaseCogsUsd(c), c * PRICING.WORST_CASE_USD_PER_CREDIT))
  R.push([`(4) líquido com cartão internacional acima do pior custo em TODOS os degraus (menor sobra $${Math.min(...margens).toFixed(2)})`, margens.every((m) => m > 0)])
  const piorDegrau = Math.min(...degraus.map((c) => S.sliderPriceUsdMinor(c) / 100 / c))
  R.push([`(3) nenhum degrau abaixo do plano mais barato por crédito (pior degrau $${piorDegrau.toFixed(4)} > plano $${PRICING.CHEAPEST_PLAN_USD_PER_CREDIT.toFixed(4)})`, piorDegrau > PRICING.CHEAPEST_PLAN_USD_PER_CREDIT])
  return R
}
const S = roda(SLIDER_SRC)
for (const [n, c] of provas(S)) checa(n, c)
checa('(4) a barra do assinante cobra só em USD (moeda nunca vem do IP nem da URL)', rd('lib/stripe/recargaAssinanteCheckout.ts').includes("price_data: { currency: 'usd',"))

// (5) rota da Stripe
const CK = rd('app/api/stripe/checkout/route.ts')
checa('(5) ?pack=credits_custom vai para o construtor do top-up com a quantidade normalizada', CK.includes("if (packParam === CREDIT_SLIDER_PACK_ID) {\n        return await buildTopupAndRedirect(req, CREDIT_SLIDER_PACK_ID, true, normalizeSliderCredits(req.nextUrl.searchParams.get('credits')))"))
checa('(5) o preço é recalculado no servidor pela fonte única', CK.includes('const sliderUsd = topupId === CREDIT_SLIDER_PACK_ID ? sliderPriceUsdMinor(sliderCredits) : null') && CK.includes('prices: { usd: sliderUsd as number }'))
checa('(5) quantidade inválida vira erro visível (nunca outro pacote)', CK.includes("redirectError(msg, '/studio', 'slider_credits_invalid')"))
checa('(5) mesma regra de quem pode comprar e mesma moeda de liquidação do top-up', CK.includes('if (!canPurchaseCreditTopup(profile?.plan)) {') && CK.includes('const chargeAmount = settlementAmountMinor(unitAmount, chargeCurrency)'))
checa('(5) o webhook recebe os créditos pela metadata do servidor', CK.includes('pack: topupId,\n      pack_credits: String(topup.credits),'))
const WH = rd('app/api/stripe/webhook/route.ts')
checa('(5) webhook credita qualquer pacote por metadata.pack_credits', WH.includes("const metaCredits = Number(session.metadata?.pack_credits ?? 0)") && WH.includes('let creditsToAdd = metaCredits > 0 ? metaCredits : 0'))

// (6) pop-up
const MODAL = rd('components/CreditsTopupModal.tsx')
checa('(6) o pop-up mostra o preço da MESMA função que cobra', MODAL.includes('const priceMinor = sliderPriceUsdMinor(amount) ?? 0') && MODAL.includes("from '@/lib/credits/creditSlider'"))
checa('(6) a barra usa a faixa e o passo da fonte única', MODAL.includes('min={CREDIT_SLIDER_MIN}') && MODAL.includes('max={CREDIT_SLIDER_MAX}') && MODAL.includes('step={CREDIT_SLIDER_STEP}'))
const iLaunch = MODAL.indexOf('checkout.launch(CREDIT_SLIDER_PACK_ID')
checa('(6) o botão manda só a QUANTIDADE para a rota (nunca preço)', iLaunch > 0 && MODAL.slice(iLaunch, iLaunch + 160).includes('&credits=${amount}') && !/[?&](price|amount|usd)=/.test(MODAL))
checa('(6) nenhum preço digitado à mão no pop-up', !/\$\d/.test(MODAL.replace(/\$\{/g, '')))
checa('(6) não vende motor pausado (Omni)', !/Omni/.test(MODAL.replace(/\/\/.*$/gm, '')))

// (7) mutantes
function mutante(nome, de, para) {
  if (SLIDER_SRC.split(de).length !== 2) { checa(`mutante "${nome}" aplicou`, false); return }
  const m = SLIDER_SRC.replace(de, para)
  checa(`mutante "${nome}" aplicou`, m.includes(para))
  let cai = false
  try { cai = provas(roda(m)).some(([, c]) => !c) } catch { cai = true }
  checa(`mutante "${nome}" é pego`, cai)
}
mutante('piso abaixo do plano', 'const RATE_FLOOR = 0.135', 'const RATE_FLOOR = 0.12')
mutante('mínimo deixa de ser o botão', 'export const CREDIT_SLIDER_MIN = RECARGA_ASSINANTE_1111.credits', 'export const CREDIT_SLIDER_MIN = 30')
mutante('volta o ,90', '  return dollars * 100\n', '  return dollars * 100 - 10\n')
mutante('botão diferente do 1º degrau', 'export const RECARGA_ASSINANTE_1111 = { usdMinor: 900, credits: 60 } as const', 'export const RECARGA_ASSINANTE_1111 = { usdMinor: 990, credits: 60 } as const')
mutante('aceita fora do passo', '  if (n % CREDIT_SLIDER_STEP !== 0) return null\n', '')

console.log(`test-barra-de-creditos-2026-09-23: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
