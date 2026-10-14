// KINEO-PRECOS-LIMPEZA-1510 — guardião da limpeza do /pricing (fundador 15/10/2026, olhando a página: "não faz sentido
// nenhum mais estar na tela"). Saíram TRÊS blocos, e só eles:
//   1. o cartão do Business (faixa AgencyVolumeBridge entry="pricing": "FOR BUSINESSES, AGENCIES AND FREELANCERS",
//      "Making video ads for a product — yours or a client's?", botão "See the Business plan →");
//   2. a seção "MADE WITH KINEO" — "This is what a plan buys" (2 filmes VEO 3.1 / KLING 2.5 + legenda do Kling 3);
//   3. a seção "COMPARE PLANS" — "What you get at each tier" (a tabela Free/Starter/Creator/Studio + a nota de rodapé).
// Prova, com o JSX real renderizado offline (scripts/preview-ux-complete.mjs) e com git:
//   (a) os 3 títulos (e seus sobretítulos/botões) sumiram da árvore renderizada do /pricing e do fonte;
//   (b) os cartões de plano e os botões de compra continuam (Starter/Creator/Studio + o bloco Business com handleBuy);
//   (c) nenhuma constante de preço/plano mudou nesta entrega: as libs de preço, a rota da Stripe e as funções
//       buildPricing/handleBuy do PricingClient são idênticas à base (o pai do commit que trouxe este guardião; antes do
//       commit, o merge-base com origin/main) — e não há edição solta nelas na árvore de trabalho.
// Mutantes rodados à mão na entrega (tabela de volta → vermelho; preço mexido em lib/checkoutPricing.ts → vermelho).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { renderPage } from './preview-ux-complete.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const git = (...args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; console.log('  ok  ' + nome) } else { falhas.push(nome); console.log('  FAIL ' + nome) } }
const conta = (s, agulha) => s.split(agulha).length - 1

const CLIENT = 'app/pricing/PricingClient.tsx'
const src = rd(CLIENT)
const html = renderPage(CLIENT, false, { demoOffer: true, demoShell: true, displayCurrency: 'usd', signedIn: true })
const texto = html.replace(/&#x27;|&apos;/g, "'").replace(/&amp;/g, '&')

// ── (a) os três blocos sumiram ─────────────────────────────────────────────────────────────────────────────────────
const SUMIDOS = [
  ['cartão do Business', ['Making video ads for a product', 'For businesses, agencies and freelancers', 'See the Business plan →', 'Self-service · monthly billing · cancel anytime']],
  ['MADE WITH KINEO', ['This is what a plan buys', 'MADE WITH KINEO', 'Both films below were made on Kineo', 'characters on screen speak their own lines']],
  // A nota de rodapé da tabela reusava OFFER.copy.planCardBody ("Free to start in supported countries: …"), que também é o
  // texto do cartão "Try before you pay" — esse fica. A âncora da nota é a frase que só ela tinha.
  ['COMPARE PLANS', ['What you get at each tier', 'Compare plans', 'Every paid plan unlocks clean, watermark-free MP4s', 'Saved characters (same face every video)']],
]
checa('(a) o cartão "Try before you pay" (fora dos 3 blocos) continua com o texto do free tier', texto.includes('Try before you pay') && texto.includes('Free to start in supported countries'))
checa('render real do /pricing produziu HTML com os planos (sanidade do harness)', html.length > 10000 && conta(html, 'id="plans"') === 1)
for (const [bloco, frases] of SUMIDOS) {
  const vivas = frases.filter((f) => texto.toLowerCase().includes(f.toLowerCase()))
  checa(`(a) ${bloco}: nenhuma frase do bloco na árvore renderizada${vivas.length ? ' — achou: ' + vivas.join(' | ') : ''}`, vivas.length === 0)
}
checa('(a) fonte: sem <AgencyVolumeBridge, sem import da faixa nem do rastreador do caminho Business', !/<AgencyVolumeBridge\b/.test(src) && !src.includes("from '@/components/AgencyVolumeBridge'") && !src.includes('PricingBusinessPathTelemetry'))
checa('(a) fonte: sem <table> e sem os títulos "This is what a plan buys" / "What you get at each tier"', conta(src, '<table') === 0 && conta(src, 'This is what a plan buys') === 0 && conta(src, 'What you get at each tier') === 0)
checa('(a) fonte: os 2 filmes da vitrine (9bbd5d98 / 26d25419) saíram do PricingClient', conta(src, '9bbd5d98-33e5-423f-b9cb-82f7af6c67ba') === 0 && conta(src, '26d25419-6719-47ab-b24b-df214e007fbd') === 0)
checa('(a) a faixa compartilhada segue viva nas outras páginas (só o /pricing perdeu)', existsSync(join(RAIZ, 'components/AgencyVolumeBridge.tsx')) && rd('app/KineoLanding.tsx').includes('<AgencyVolumeBridge entry="home" />'))

// ── (b) planos e botões de compra continuam ────────────────────────────────────────────────────────────────────────
const ctas = (html.match(/<button[^>]*class="pv-cta[^"]*"[^>]*>([^<]*)<\/button>/g) || []).map((b) => b.replace(/<[^>]+>/g, ''))
checa(`(b) 3 botões de plano renderizados (Starter / Creator / Studio): ${ctas.join(' · ')}`, ctas.length === 3 && /Starter/.test(ctas[0]) && /Creator/.test(ctas[1]) && /Studio/.test(ctas[2]))
checa('(b) o cartão de plano é montado pelo PlanValueCard para os 3 planos pagos', /<PlanValueCard\b/.test(src) && src.includes("from '@/components/pricing/PlanValueStage'"))
checa('(b) o bloco do plano Business com compra própria segue no /pricing (handleBuy(\'business\'))', src.includes("<PricingBusinessBlock onBuy={() => handleBuy('business')}"))
checa('(b) handleBuy existe e os botões dos planos chamam handleBuy', /\n  function handleBuy\(tier: BuyableTier/.test(src) && conta(src, 'handleBuy(') >= 3)

// ── (c) nenhum preço mudou ─────────────────────────────────────────────────────────────────────────────────────────
const PRECO = [
  'lib/checkoutPricing.ts', 'lib/marketingPrice.ts', 'lib/credits/engineCost.ts', 'lib/pricing.ts', 'lib/pricingPlanValue.ts',
  'lib/pricingTwoProducts.ts', 'lib/settlementCurrency.ts', 'lib/businessPlan.ts', 'lib/offers/mrrConversion.ts',
  'lib/growth/planSwitch.ts', 'lib/growth/guestCheckout.ts', 'lib/growth/publicPromoTruth.ts', 'lib/stripe.ts',
  'components/pricing/PlanValueStage.tsx', 'components/pricing/PricingBusinessBlock.tsx', 'app/api/stripe',
]
const SELF = 'scripts/test-precos-limpeza-1510.mjs'
const criados = git('log', '--diff-filter=A', '--format=%H', '--', SELF).trim().split('\n').filter(Boolean)
const entrega = criados.length ? criados[criados.length - 1] : null // o commit que trouxe este guardião
let base, alvo
if (entrega) { base = git('rev-parse', `${entrega}^`).trim(); alvo = entrega } else { base = git('merge-base', 'HEAD', 'origin/main').trim(); alvo = null }
const diffEntrega = alvo ? git('diff', '--name-only', base, alvo, '--', ...PRECO).trim() : git('diff', '--name-only', base, '--', ...PRECO).trim()
checa(`(c) libs de preço/plano e app/api/stripe idênticas à base ${base.slice(0, 8)}${alvo ? ' no commit ' + alvo.slice(0, 8) : ' (árvore de trabalho)'}${diffEntrega ? ' — mudou: ' + diffEntrega.replace(/\n/g, ', ') : ''}`, diffEntrega === '')
const solto = git('diff', '--name-only', 'HEAD', '--', ...PRECO).trim()
checa(`(c) nenhuma edição solta (não commitada) nas libs de preço${solto ? ' — mudou: ' + solto.replace(/\n/g, ', ') : ''}`, solto === '')
const fn = (s, re) => { const m = s.match(re); return m ? m[0] : '' }
const RE_BUILD = /\nfunction buildPricing\([\s\S]*?\n\}\n/
const RE_BUY = /\n {2}function handleBuy\([\s\S]*?\n {2}\}\n/
const antes = git('show', `${base}:${CLIENT}`)
const depois = alvo ? git('show', `${alvo}:${CLIENT}`) : src
for (const [nome, re] of [['buildPricing', RE_BUILD], ['handleBuy', RE_BUY]]) {
  const a = fn(antes, re), d = fn(depois, re)
  checa(`(c) ${nome} do PricingClient idêntica à base (${a.length} chars)`, a.length > 200 && a === d)
}
const imports = (s) => (s.match(/^import [\s\S]*?from '[^']+'/gm) || []).filter((l) => /checkoutPricing|marketingPrice|settlementCurrency|planSwitch|guestCheckout|mrrConversion|publicPromoTruth/.test(l)).join('\n')
checa('(c) os imports de preço/checkout do PricingClient não mudaram (fora o MARKETING_REFERENCE_SECONDS, que só a tabela usava)', imports(antes).replace('  MARKETING_REFERENCE_SECONDS,\n', '') === imports(depois))

console.log(`\ntest-precos-limpeza-1510: ${ok} ok, ${falhas.length} falhas`)
if (falhas.length) process.exit(1)
