// KINEO-PRICING-V7-2026-09-09 — guardião: $14 / $29 / $59 com 60 / 150 / 300,
// anual 10×, porta de $1 dizendo o preço do Creator sem literal, e a renovação
// de quem paga o preço antigo recebendo o grant antigo (Studio $29 → 180).
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

console.log('== a fonte única ==')
const cp = rd('lib/checkoutPricing.ts')
const bloco = (nome) => { const i = cp.indexOf(`export const ${nome}`); return i < 0 ? '' : cp.slice(i, cp.indexOf('\n}', i) + 2) }
checa('TIER_PRICES = 1400 / 2900 / 5900', /starter: \{ usd: 1400 \}/.test(bloco('TIER_PRICES')) && /basic: \{ usd: 2900 \}/.test(bloco('TIER_PRICES')) && /pro: \{ usd: 5900 \}/.test(bloco('TIER_PRICES')))
checa('ANNUAL_PRICES = 10× (14000 / 29000 / 59000)', /starter: \{ usd: 14000 \}/.test(bloco('ANNUAL_PRICES')) && /basic: \{ usd: 29000 \}/.test(bloco('ANNUAL_PRICES')) && /pro: \{ usd: 59000 \}/.test(bloco('ANNUAL_PRICES')))
checa('INTRO_PRICES espelha o preço cheio (sem 1º mês)', /starter: \{ usd: 1400 \}/.test(bloco('INTRO_PRICES')) && /basic: \{ usd: 2900 \}/.test(bloco('INTRO_PRICES')))
checa('TIER_CREDITS = 60 / 150 / 300', /starter: 60,/.test(bloco('TIER_CREDITS')) && /basic: 150,/.test(bloco('TIER_CREDITS')) && /pro: 300,/.test(bloco('TIER_CREDITS')))
checa('grant legado V6 = 60 / 150 / 180', /starter: 60,\s*\n\s*basic: 150,\s*\n\s*pro: 180,/.test(bloco('LEGACY_TIER_CREDITS_V6')))

console.log('== a régua da renovação, executada ==')
{
  // transpila só o que precisa: as constantes de preço/crédito e a função
  const src = ['TIER_PRICES', 'AUTOPILOT_PRICES', 'TIER_CREDITS', 'LEGACY_TIER_CREDITS_V6'].map(bloco).join('\n')
    + '\n' + cp.slice(cp.indexOf('export function renewalCreditsFor'), cp.indexOf('\n}', cp.indexOf('export function renewalCreditsFor')) + 2)
  const js = ts.transpileModule(src.replace(/: Record<[^=]+> =/g, ' ='), { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp })
  const f = exp.renewalCreditsFor
  checa('Studio pago a $29 (fatura 2900) renova com 180', f('pro', 2900) === 180)
  checa('Studio pago a $59 (fatura 5900) renova com 300', f('pro', 5900) === 300)
  checa('Creator pago a $19 renova com 150 (grant não mudou)', f('basic', 1900) === 150)
  checa('Creator pago a $29 renova com 150', f('basic', 2900) === 150)
  checa('Starter pago a $9 renova com 60', f('starter', 900) === 60)
  checa('fatura desconhecida (null) recebe o grant vigente', f('pro', null) === 300 && f('pro', undefined) === 300)
  checa('fatura zero (cupom 100%) recebe o grant vigente, não o legado', f('pro', 0) === 300)
  checa('anual pago no preço antigo (29000 ≥ 5900) recebe o grant vigente', f('pro', 29000) === 300)
}

console.log('== quem usa a régua ==')
const wh = rd('app/api/stripe/webhook/route.ts')
checa('webhook: renovação chama renewalCreditsFor(tier, invoice.amount_paid)', /const renewalCredits = renewalCreditsFor\(renewalTier, invoice\.amount_paid\)/.test(wh))
checa('webhook: importa a função da fonte única', /renewalCreditsFor[^\n]*\} from '@\/lib\/checkoutPricing'|import \{[^}]*renewalCreditsFor[^}]*\} from '@\/lib\/checkoutPricing'/.test(wh))
checa('webhook: nenhum TIER_CREDITS[renewalTier] cru sobrou', !/TIER_CREDITS\[renewalTier\]/.test(wh))

console.log('== a porta fala o preço do Creator sem literal ==')
const ep = rd('lib/entryPolicy.ts')
checa('entryPolicy segue PURA (sem import): o preço é literal espelhado, guardado aqui', !/^import /m.test(ep))
const creatorUsd = Number((cp.match(/basic: \{ usd: (\d+) \}/) || [])[1]) / 100
checa('chip/headline/sentence dizem exatamente $' + creatorUsd + ' (= TIER_PRICES.basic)', creatorUsd === 29 && (ep.match(/then \$29\/mo'|Then \$29\/month|continues at \$29\/month/g) || []).length === 3)
checa('nenhum "$19" literal sobrou na copy da porta', !/\$19\b/.test(ep.replace(/\/\/[^\n]*/g, '')))
const studioUsd = Number((cp.match(/pro: \{ usd: (\d+) \}/) || [])[1]) / 100
checa('enginePlanGate diz exatamente $' + studioUsd + ' (= TIER_PRICES.pro) e segue puro', studioUsd === 59 && /\(\$59\/mo, every engine\)/.test(rd('lib/enginePlanGate.ts')) && !/^import /m.test(rd('lib/enginePlanGate.ts')))

console.log('== as outras superfícies ==')
const eng = rd('app/ai-video-generator/[engine]/page.tsx')
checa('página dos motores: Studio (${STUDIO_USD}/month) derivado, sem "($29/month)"', /\$\{STUDIO_USD\}\/month/.test(eng) && !eng.includes('($29/month)') && /const STUDIO_USD = `\$\$\{TIER_PRICES\.pro\.usd \/ 100\}`/.test(eng))
const ll = rd('app/llms.txt/route.ts')
checa('llms.txt: changelog 2026-09-09 com os três preços derivados', /- 2026-09-09: plans repriced/.test(ll) && /Starter \\\$\$\{TIER_PRICES\.starter\.usd \/ 100\}/.test(ll) && /Studio \\\$\$\{TIER_PRICES\.pro\.usd \/ 100\} \(300 credits/.test(ll))
checa('llms.txt: a entrada de 08/09 está marcada como superada e sem preço literal', /2026-09-08 \(prices superseded on 2026-09-09/.test(ll) && !/Starter \\\$9\b/.test(ll))
checa('placar: marco anda para 2026-09-09T00:00:00.000Z', /export const VERSAO_B_SINCE = '2026-09-09T00:00:00\.000Z'/.test(rd('lib/admin/versaoBFunnel.ts')))
checa('PayPal e Dodo derivam da fonte única', /TIER_PRICES\.starter\.usd/.test(rd('lib/paypalCatalog.ts')) && /TIER_PRICES\[DODO_SKU_TO_TIER\[sku\]\]\.usd/.test(rd('lib/dodoCatalog.ts')))
checa('admin: PLAN_PRICE_USD vem de PLANS (que vem de TIER_PRICES)', /starter: PLANS\.starter\.price/.test(rd('app/api/admin/_shared/mrr.ts')) && /price: TIER_PRICES\.pro\.usd \/ 100/.test(rd('lib/pricing.ts')))
checa('docs vivas: TAAFT e kit de afiliados nos preços novos', /Starter \$14 · Creator \$29 · Studio \$59/.test(rd('docs/TAAFT-LISTING-2026-09-03.md')) && /\$29\/mês → \$11,60/.test(rd('docs/KIT-AFILIADOS-2026-09-08.md')))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — preço V7 ($14/$29/$59 · 60/150/300) na fonte única, na porta, na renovação legada e nas superfícies')
