// KINEO-MRR-1-3-2026-09-16 — três alavancas de receita aprovadas pelo fundador ("Vai para 1 a 3"):
// (1) a página de preços abre no ANUAL (2 meses grátis), mensal a um clique, nenhum preço mudou;
// (2) top-up em 1 clique para quem já paga — o Starter entra na recarga com os SKUs existentes, free/trial não;
// (3) garantia de 7 dias e o PRÓPRIO filme da pessoa nas superfícies de decisão (pós-render e /pricing).
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
const roda = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console }); return exp }

console.log('== (1) anual destacado ==')
const pc = rd('app/pricing/PricingClient.tsx')
const cp = rd('lib/checkoutPricing.ts')
// A1 (HANDOFF-PRICING-MONTHLY-CAMPAIGN-2026-09-16, validado em produção 18/09): a modalidade inicial vem da rota
// (campanha mensal abre mensal); a entrada comum continua no anual pelo padrão da prop.
checa('a página abre no anual (padrão da prop; campanha mensal pode abrir mensal — A1)', pc.includes("initialBilling = 'annual'") && pc.includes("useState<PricingPlanChoiceBilling>(initialBilling)"))
// KINEO-ANUAL-40OFF-2026-10-05 — o selo do botão anual virou "SAVE {ANNUAL_DISCOUNT_PERCENT}%" (anual = 40% off).
// KINEO-ANUAL-30-2026-10-08 — o selo segue lendo a constante; o número dela virou 30 (fundador 08/10).
checa('o mensal continua a um clique e o selo "SAVE {ANNUAL_DISCOUNT_PERCENT}%" (30%) segue no botão', pc.includes("onClick={() => setBilling('monthly')}") && pc.includes('SAVE {ANNUAL_DISCOUNT_PERCENT}%') && !pc.includes('2 MONTHS FREE'))
// KINEO-PRECO-V8-A-2026-09-28 — reancorado com motivo: a alavanca (1) não mudou preço em 16/09; em 28/09 o fundador subiu a
// escada para 1290/2990/5490 (anual 12900/29900/54900). A promessa desta linha é a do anual = 10× o mensal — provada
// pelos números lidos da fonte, não por literal solto.
{
  const mensal = { starter: 1290, basic: 2990, pro: 5490 }
  const anualLido = Object.fromEntries(['starter', 'basic', 'pro'].map((t) => [t, Number((cp.slice(cp.indexOf('export const ANNUAL_PRICES')).match(new RegExp(`${t}: \\{ usd: (\\d+) \\}`)) || [])[1])]))
  // KINEO-ANUAL-40OFF-2026-10-05 — re-ancorado: o anual passou de 10× para 12 × mensal × 0,60 (fundador 04-05/10),
  // arredondado limpo: 9290/21500/39500 (lido da fonte; o desconto real fica a ±0,5 ponto de 40%).
  // KINEO-ANUAL-30-2026-10-08 — re-ancorado com a decisão do fundador (08/10): 12 × mensal × 0,70, arredondado limpo:
  // 10800/25000/46000 (lido da fonte; o desconto real fica a ±0,5 ponto de 30%).
  checa('a alavanca (1) não muda o mensal: 1290/2990/5490 (V8-A) e anual = 30% off lido da fonte (10800/25000/46000)', /starter: \{ usd: 1290 \},\n  basic: \{ usd: 2990 \},\n  pro: \{ usd: 5490 \},/.test(cp) && ['starter', 'basic', 'pro'].every((t) => Math.abs((1 - anualLido[t] / (mensal[t] * 12)) * 100 - 30) <= 0.5) && anualLido.starter === 10800 && anualLido.basic === 25000 && anualLido.pro === 46000)
}
checa('o checkout recebe billing=annual só quando o toggle está no anual (autopilot nunca); mensal vai explícito (A1)', pc.includes("const billingParam = billing === 'annual' && !isAutopilotFamily ? '&billing=annual' : '&billing=monthly'") && pc.includes("const isAutopilotFamily = tier === 'autopilot' || tier === 'autopilot_lite'"))

console.log('== (2) recarga para quem já paga ==')
const elig = rd('lib/growth/topupEligibility.ts')
const E = roda(elig)
checa('starter e starter_trial recarregam; basic/pro seguem', ['starter', 'starter_trial', 'basic', 'basic_trial', 'pro', 'pro_trial'].every((p) => E.canPurchaseCreditTopup(p)))
checa('free, trial vencido, autopilot e lixo continuam FORA', ['free', 'autopilot', 'autopilot_trial', '', null, undefined, 42].every((p) => !E.canPurchaseCreditTopup(p)))
checa('o cobrador usa a MESMA função (403 topup_requires_creator_plus só para quem a função nega)', rd('app/api/stripe/checkout/route.ts').includes('if (!canPurchaseCreditTopup(profile?.plan)) {'))
checa('as duas telas de destino derivam da mesma função (sem lista própria)', /return canPurchaseCreditTopup\(plan\) \? 'topup' : 'pricing'/.test(rd('lib/credits/outOfCreditsPlans.ts')) && /return canPurchaseCreditTopup\(plan\) \? 'topup' : 'pricing'/.test(rd('lib/animate/paywall.ts')))
checa('o modal de "sem créditos" do Studio mostra a escadinha de recarga por topupPurchasable (fit → canPurchaseCreditTopup)', rd('app/(dashboard)/generate/GenerateClient.tsx').includes('topupPurchasable') && rd('lib/growth/limitPurchaseFit.ts').includes('canPurchaseCreditTopup'))

console.log('== (3) garantia + filme próprio ==')
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('garantia dita nos DOIS lugares da oferta pós-render (com o filme na tela)', (gc.match(/data-kineo="garantia-pos-render"/g) || []).length === 2 && (gc.match(/7-day money-back guarantee · cancel anytime · your films stay yours/g) || []).length === 2)
checa('/pricing lê os filmes da própria conta (/api/videos) só com sessão e mostra o primeiro concluído', pc.includes("if (signedIn !== true) return") && pc.includes("void fetch('/api/videos', { credentials: 'same-origin', cache: 'no-store' })") && pc.includes("x.status === 'completed' && typeof x.video_url === 'string' && x.video_url.startsWith('https://')"))
checa('a faixa do filme próprio existe, com vídeo mudo e a garantia, e some sem filme (falha aberta)', pc.includes('data-kineo="latest-film"') && pc.includes('{latestFilm && (') && pc.includes('7-day money-back guarantee, cancel anytime.') && pc.includes('.catch(() => {})'))
checa('a garantia da página de preços continua (FAQ + chips)', pc.includes("'Is there a money-back guarantee?'") && pc.includes("'7-day money-back guarantee'"))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
