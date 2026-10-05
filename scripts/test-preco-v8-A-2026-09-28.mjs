// KINEO-PRECO-V8-A-2026-09-28 — guardião da ESCADA 13/30/55 (opção A):
// KINEO-ANUAL-40OFF-2026-10-05 — re-ancorado: o anual deixou de ser 10× o mensal e passou a 12 × mensal × 0,60 (40% off,
// decisão do fundador 04-05/10): USD 9290/21500/39500, BRL 46790/107990/197990. Mensal, intro, créditos e escada legada
// seguem os da V8-A; os mutantes do anual apontam para os números novos.
//   Starter US$12,90 · Creator US$29,90 · Studio US$54,90 (60/150/300 cr; anual 10×; intro = mensal; BRL pela fórmula da casa).
// Decisão do fundador (28/09): "subir um pouco o preço, 3 degraus como o mercado". INERTE até o "vai"
// (branch codex/preco-v8-A-0928, não enfileirada). Doc: docs/DECISAO-PRECOS-V8-2026-09-28.md.
//
// O que prova (readFileSync, sem alias @/, sem rede, sem banco):
//   1. TEXTO-FONTE: TIER_PRICES / ANNUAL_PRICES / INTRO_PRICES / TIER_CREDITS / escada legada V5 / AMBIGUOUS vazia;
//   2. EXECUTADO (lib/checkoutPricing.ts transpilado com o engineCost REAL): anual = 10× o mensal, intro = mensal
//      (hasIntroOffer false), checkPricingInvariants() vazio, margem pior caso 49/42/37 % (netAfterStripeUsd −
//      worstCaseCogsUsd, sobre o líquido), escada legada: renewalCreditsFor, legacyCreditsForUsd (anual),
//      renewalCreditsForInvoice em BRL (lib/settlementCurrency.ts) e annualRefillCredits (lib/billing/annualRefill.ts);
//   3. BRL: BRL_PLAN_PRICES_MINOR[t].monthly === usdToBrlMinor(TIER_PRICES[t].usd), anual 10×, checkSettlementInvariants vazio;
//   4. LITERAIS ESPELHADOS nos módulos puros (lib/entryPolicy.ts "$12.90/month", lib/enginePlanGate.ts "$54.90/mo") iguais a
//      formatCheckoutMoney da fonte; superfícies derivadas (CTA do GenerateClient, carta da cota semanal) sem "$9.90" digitado;
//      ONE_TIME_USD_MINOR_OCCUPIED do Studio Ads com os anuais novos e sem os velhos; comentário do webhook atualizado;
//   5. MUTANTES em memória: cada número trocado (mensal, anual, intro, BRL, grant legado, literal espelhado, ambíguos)
//      deixa pelo menos uma verificação vermelha — prova de que o guardião vigia, não só descreve.
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

const FONTES = {
  cp: 'lib/checkoutPricing.ts',
  sc: 'lib/settlementCurrency.ts',
  ar: 'lib/billing/annualRefill.ts',
  ep: 'lib/entryPolicy.ts',
  eg: 'lib/enginePlanGate.ts',
  offer: 'lib/ads/offer.ts',
  gc: 'app/(dashboard)/generate/GenerateClient.tsx',
  carta: 'app/api/admin/send-weekly-quota/route.ts',
  wh: 'app/api/stripe/webhook/route.ts',
}
const PRISTINO = Object.fromEntries(Object.entries(FONTES).map(([k, p]) => [k, rd(p)]))

// ── carregador: transpila .ts → CJS e resolve '@/lib/x' e './x' com as MESMAS fontes (pristinas ou mutadas) ──────────
function carregador(src) {
  const cache = new Map()
  const load = (file) => {
    if (cache.has(file)) return cache.get(file)
    const chave = Object.keys(FONTES).find((k) => FONTES[k] === file)
    const code = chave ? src[chave] : rd(file)
    const js = ts.transpileModule(code, { compilerOptions: { module: 1, target: 9 } }).outputText
    const exp = {}
    cache.set(file, exp)
    const req = (id) => {
      if (id.startsWith('@/lib/')) return load('lib/' + id.slice(6) + '.ts')
      if (id.startsWith('./')) return load('lib/' + id.slice(2) + '.ts')
      throw new Error('import inesperado: ' + id)
    }
    vm.runInNewContext(js, { exports: exp, require: req, process: { env: {} }, console: { warn: () => {}, log: () => {}, error: () => {} }, Math, Date, Number, String, Array, Object, Set, Map, Intl }, { filename: file })
    return exp
  }
  return load
}

// ── a bateria: devolve a lista de falhas para uma dada versão das fontes (pristina ou mutada) ───────────────────────
function avalia(src) {
  const f = []
  const t = (n, c) => { if (!c) f.push(n) }
  const cp = src.cp
  const bloco = (nome) => { const i = cp.indexOf(`export const ${nome}`); const j = cp.indexOf(' = {', i); return i < 0 ? '' : cp.slice(j, cp.indexOf('\n}', j) + 2) }

  // 1. texto-fonte
  t('TIER_PRICES = 1290 / 2990 / 5490 (texto)', /starter: \{ usd: 1290 \},\n  basic: \{ usd: 2990 \},\n  pro: \{ usd: 5490 \},/.test(bloco('TIER_PRICES')))
  t('ANNUAL_PRICES = 9290 / 21500 / 39500 (texto; 40% off desde KINEO-ANUAL-40OFF-2026-10-05)', /starter: \{ usd: 9290 \},\n  basic: \{ usd: 21500 \},\n  pro: \{ usd: 39500 \},/.test(bloco('ANNUAL_PRICES')))
  t('INTRO_PRICES = 1290 / 2990 (texto)', /starter: \{ usd: 1290 \},\n  basic: \{ usd: 2990 \},\n\}/.test(bloco('INTRO_PRICES')))
  t('TIER_CREDITS = 60 / 150 / 300 (texto)', /starter: 60,\n  basic: 150,\n  pro: 300,/.test(bloco('TIER_CREDITS')))
  t('escada legada: LEGACY_V5_PRICES_USD 990/1990/3990 e LEGACY_TIER_CREDITS_V5 60/150/300 (texto)', /starter: 990,\n  basic: 1990,\n  pro: 3990,/.test(bloco('LEGACY_V5_PRICES_USD')) && /starter: 60,\n  basic: 150,\n  pro: 300,/.test(bloco('LEGACY_TIER_CREDITS_V5')))
  t('AMBIGUOUS_ONE_TIME_USD_AMOUNTS vazia (Starter anual saiu de 9900)', /AMBIGUOUS_ONE_TIME_USD_AMOUNTS: ReadonlySet<number> = new Set<number>\(\[\]\)/.test(cp))
  t('cabeçalho KINEO-PRECO-V8-A-2026-09-28 com a tabela antiga → nova', /KINEO-PRECO-V8-A-2026-09-28 — ESCADA 13\/30\/55/.test(cp) && /\$9,90  \/ anual \$99  \/ 60cr  \| \$12,90 \/ anual \$129 \/ 60cr/.test(cp))

  // 2. executado
  let CP, SC, AR
  try {
    const load = carregador(src)
    CP = load('lib/checkoutPricing.ts')
    SC = load('lib/settlementCurrency.ts')
    AR = load('lib/billing/annualRefill.ts')
  } catch (e) {
    f.push('as três libs carregam sem erro: ' + String(e && e.message))
    return f
  }
  const tiers = ['starter', 'basic', 'pro']
  const M = { starter: 1290, basic: 2990, pro: 5490 }
  const C = { starter: 60, basic: 150, pro: 300 }
  t('executado: TIER_PRICES 1290/2990/5490', tiers.every((x) => CP.TIER_PRICES[x].usd === M[x] && CP.getTierPrice(x, 'usd') === M[x] && CP.monthlyPriceMinor(x, 'usd') === M[x]))
  const A = { starter: 9290, basic: 21500, pro: 39500 } // 12 × mensal × 0,60 arredondado limpo (fundador)
  t('executado: anual = 12 × mensal × 0,60 (±0,5 pt) e annualSavingsPercent = 40', tiers.every((x) => CP.ANNUAL_PRICES[x].usd === A[x] && CP.getAnnualPrice(x, 'usd') === A[x] && Math.abs((1 - A[x] / (M[x] * 12)) * 100 - 40) <= 0.5 && CP.annualSavingsPercent(x) === 40) && CP.ANNUAL_DISCOUNT_PERCENT === 40)
  t('executado: intro = mensal → hasIntroOffer false nos dois tiers', ['starter', 'basic'].every((x) => CP.INTRO_PRICES[x].usd === M[x] && CP.hasIntroOffer(x, 'usd') === false && CP.introDiscountMinor(x, 'usd') === 0))
  t('executado: créditos 60/150/300', tiers.every((x) => CP.TIER_CREDITS[x] === C[x]))
  const problemas = CP.checkPricingInvariants()
  t('executado: checkPricingInvariants() vazio com o engineCost real (' + problemas.join(' | ') + ')', Array.isArray(problemas) && problemas.length === 0)
  const margem = (x) => { const net = CP.netAfterStripeUsd(M[x] / 100); return Math.round(((net - CP.worstCaseCogsUsd(C[x])) / net) * 100) }
  t('executado: margem pior caso 49 / 42 / 37 % (fatos do fundador, recalculados pelas funções da fonte: ' + tiers.map(margem).join('/') + ')', margem('starter') === 49 && margem('basic') === 42 && margem('pro') === 37)
  t('executado: todo top-up custa mais por crédito que o plano mais barato (Studio 54,90/300 = 0,183)', Math.abs(CP.CHEAPEST_PLAN_USD_PER_CREDIT - 0.183) < 0.0005 && Object.keys(CP.TOPUP_CREDITS).every((id) => CP.TOPUP_USD_PRICES[id] / 100 / CP.TOPUP_CREDITS[id] > CP.CHEAPEST_PLAN_USD_PER_CREDIT))
  // escada legada, executada
  const r = CP.renewalCreditsFor
  t('renovação: Studio pago a $39,90 (V5 restaurada) MANTÉM 300', r('pro', 3990) === 300)
  t('renovação: Studio pago a $29 (V6) recebe 180; Creator $15 (V6) 150; Starter $7 (V6) 60', r('pro', 2900) === 180 && r('basic', 1500) === 150 && r('starter', 700) === 60)
  t('renovação: fatura no preço vigente ou acima recebe o grant vigente (5490, 5900 → 300; 2990 → 150; 1290 → 60)', r('pro', 5490) === 300 && r('pro', 5900) === 300 && r('basic', 2990) === 150 && r('starter', 1290) === 60)
  t('renovação: fatura desconhecida/zero recebe o grant vigente', r('pro', null) === 300 && r('pro', undefined) === 300 && r('pro', 0) === 300)
  t('renovação: Creator $19,90 e Starter $9,90 (V5) mantêm 150 / 60', r('basic', 1990) === 150 && r('starter', 990) === 60)
  t('legacyCreditsForUsd anual: $399 (V5) → 300; $290 (V6) → 180; $99 → 60', CP.legacyCreditsForUsd('pro', 39900, 'annual') === 300 && CP.legacyCreditsForUsd('pro', 29000, 'annual') === 180 && CP.legacyCreditsForUsd('starter', 9900, 'annual') === 60)
  t('annualRefillCredits: anual V5 ($99/$199/$399) mantém 60/150/300; abaixo do piso → V6; vigente (9290/21500/39500) e o V8-A antigo (54900) → vigente', AR.annualRefillCredits('starter', 9900, 'usd') === 60 && AR.annualRefillCredits('basic', 19900, 'usd') === 150 && AR.annualRefillCredits('pro', 39900, 'usd') === 300 && AR.annualRefillCredits('pro', 29000, 'usd') === 180 && AR.annualRefillCredits('pro', 54900, 'usd') === 300 && AR.annualRefillCredits('starter', 9290, 'usd') === 60 && AR.annualRefillCredits('basic', 21500, 'usd') === 150 && AR.annualRefillCredits('pro', 39500, 'usd') === 300)

  // 3. BRL
  t('BRL: tabela = usdToBrlMinor(mensal) para cada tier (6490 / 14990 / 27490)', tiers.every((x) => SC.BRL_PLAN_PRICES_MINOR[x].monthly === SC.usdToBrlMinor(M[x])) && SC.BRL_PLAN_PRICES_MINOR.starter.monthly === 6490 && SC.BRL_PLAN_PRICES_MINOR.basic.monthly === 14990 && SC.BRL_PLAN_PRICES_MINOR.pro.monthly === 27490)
  t('BRL: anual = 12 × mensal × 0,60 até ,90 (46790 / 107990 / 197990)', tiers.every((x) => SC.BRL_PLAN_PRICES_MINOR[x].annual === SC.brlAnnualFromMonthly(SC.BRL_PLAN_PRICES_MINOR[x].monthly)) && SC.BRL_PLAN_PRICES_MINOR.starter.annual === 46790 && SC.BRL_PLAN_PRICES_MINOR.basic.annual === 107990 && SC.BRL_PLAN_PRICES_MINOR.pro.annual === 197990)
  const probBrl = SC.checkSettlementInvariants({ starter: CP.TIER_PRICES.starter.usd, basic: CP.TIER_PRICES.basic.usd, pro: CP.TIER_PRICES.pro.usd })
  t('BRL: checkSettlementInvariants(TIER_PRICES) vazio (' + probBrl.join(' | ') + ')', probBrl.length === 0)
  t('BRL: piso legado V5 4990/9990/19990 e a régua com moeda: R$ 199,90 → 300, R$ 149,90 → 180, R$ 274,90 → 300, Starter R$ 49,90 → 60', SC.LEGACY_V5_BRL_PLAN_PRICES_MINOR.pro === 19990 && SC.renewalCreditsForInvoice('pro', 19990, 'brl') === 300 && SC.renewalCreditsForInvoice('pro', 14990, 'brl') === 180 && SC.renewalCreditsForInvoice('pro', 27490, 'brl') === 300 && SC.renewalCreditsForInvoice('starter', 4990, 'brl') === 60)

  // 4. literais espelhados e superfícies
  const starterLabel = CP.formatCheckoutMoney('usd', CP.TIER_PRICES.starter.usd)
  const proLabel = CP.formatCheckoutMoney('usd', CP.TIER_PRICES.pro.usd)
  t(`entryPolicy (puro): "Plans start at ${starterLabel}/month" espelha TIER_PRICES.starter`, src.ep.includes(`Plans start at ${starterLabel}/month`) && !/^import /m.test(src.ep))
  t(`enginePlanGate (puro): "(${proLabel}/mo, every engine)" espelha TIER_PRICES.pro`, src.eg.includes(`(${proLabel}/mo, every engine)`) && !/^import /m.test(src.eg))
  t('GenerateClient: CTA "See plans — from …" derivado de getTierPrice, sem "$9.90" digitado', src.gc.includes("See plans — from {formatCheckoutMoney('usd', getTierPrice('starter', 'usd'))}/mo") && !src.gc.includes('See plans — from $9.90'))
  t('carta da cota semanal: Starter derivado de TIER_PRICES (sem "$9.90/month" digitado)', src.carta.includes("const STARTER_USD = formatCheckoutMoney('usd', TIER_PRICES.starter.usd)") && (src.carta.match(/Starter is \$\{STARTER_USD\}\/month/g) || []).length === 2 && !/Starter is \$\d/.test(src.carta))
  const ocupados = ((src.offer.match(/ONE_TIME_USD_MINOR_OCCUPIED: readonly number\[\] = \[([^\]]*)\]/) || [])[1] || '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))
  t('Studio Ads OCCUPIED (o array, não o comentário): anuais 9290/21500/39500, Autopilot 29900 e mensais 2990/5490 dentro; 12900/54900/19900/39900 fora', [9290, 21500, 39500, 29900, 2990, 5490, 9900].every((n) => ocupados.includes(n)) && ![12900, 54900, 19900, 39900].some((n) => ocupados.includes(n)))
  t('webhook: comentário diz que a lista de ambíguos ficou vazia e cita os anuais novos', /AMBIGUOUS_ONE_TIME_USD_AMOUNTS = \{\} \(vazia desde V8-A/.test(src.wh) && /9290\/21500\/39500/.test(src.wh))
  return f
}

console.log('== pristino ==')
const base = avalia(PRISTINO)
for (const n of base) falhas.push(n)
ok += 32 - base.length
console.log(`  ${32 - base.length} de 32 verificações verdes`)

console.log('== mutantes (cada um tem de ficar vermelho) ==')
const mut = (chave, de, para) => { const s = { ...PRISTINO }; if (!s[chave].includes(de)) throw new Error(`mutante sem alvo: ${chave} não contém ${JSON.stringify(de)}`); s[chave] = s[chave].split(de).join(para); return s }
const MUTANTES = [
  ['mensal do Starter volta a 990', mut('cp', 'starter: { usd: 1290 }', 'starter: { usd: 990 }')],
  ['anual do Studio volta a 54900 (10× da V8-A)', mut('cp', 'pro: { usd: 39500 }', 'pro: { usd: 54900 }')],
  ['intro do Creator vira 1990 (1º mês com desconto reaparece)', mut('cp', 'basic: { usd: 2990 },\n}', 'basic: { usd: 1990 },\n}')],
  ['tabela BRL do Studio volta a 19990', mut('sc', 'pro: { monthly: 27490, annual: 197990 }', 'pro: { monthly: 19990, annual: 143990 }')],
  ['anual BRL do Studio volta a 10× (274900)', mut('sc', 'pro: { monthly: 27490, annual: 197990 }', 'pro: { monthly: 27490, annual: 274900 }')],
  ['grant legado V5 do Studio cai para 180', mut('cp', '  pro: 300,\n  autopilot: 400,\n  autopilot_lite: 160,\n}', '  pro: 180,\n  autopilot: 400,\n  autopilot_lite: 160,\n}')],
  ['literal espelhado do entryPolicy volta a $9.90', mut('ep', 'Plans start at $12.90/month', 'Plans start at $9.90/month')],
  ['9900 volta à lista de ambíguos (entrada obsoleta)', mut('cp', 'new Set<number>([])', 'new Set<number>([9900])')],
]
for (const [nome, src] of MUTANTES) {
  const fm = avalia(src)
  checa(`mutante "${nome}" fica vermelho (${fm.length} verificações acusam)`, fm.length >= 1)
  console.log(`  ${fm.length >= 1 ? '✓' : '✗'} ${nome}: ${fm.length} acusação(ões)`)
}

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const x of falhas) console.log('  ✗ ' + x); process.exit(1) }
console.log('OK — preço V8-A (12,90 / 29,90 / 54,90 · 60/150/300 · anual 40% off · BRL 64,90/149,90/274,90) na fonte, nos invariantes, na escada legada e nas superfícies')
