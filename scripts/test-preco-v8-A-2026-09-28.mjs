// KINEO-PRECO-V8-A-2026-09-28 — guardião da ESCADA 13/30/55 (opção A):
// KINEO-ANUAL-40OFF-2026-10-05 — re-ancorado: o anual deixou de ser 10× o mensal e passou a 12 × mensal × 0,60 (40% off,
// decisão do fundador 04-05/10): USD 9290/21500/39500, BRL 46790/107990/197990. Mensal, intro, créditos e escada legada
// seguem os da V8-A; os mutantes do anual apontam para os números novos.
// KINEO-ANUAL-30-2026-10-08 — re-ancorado de novo: o fundador baixou o anual para 30% off (12 × mensal × 0,70):
// USD 10800/25000/46000, BRL 54590/125990/230990. O anual de 40% já vendido (9290/21500/39500) ficou abaixo do vigente
// e virou degrau legado da escada (LEGACY_ANNUAL_40OFF_PRICES_USD → 60/150/300); os mutantes do anual seguem os números.
// KINEO-PRECO-TESTE-2026-10-08 — re-ancorado para o teste de 7 dias (fundador 08/10, "tudo sim" + "abaixar o Creator também"):
// Starter US$9,90 · Creator US$19,90 · Studio US$54,90 (intocado); anual 30% off = 8300/16700/46000; BRL 4990/9990/27490,
// anual 41990/83990/230990. O crédito mais barato da casa passa a ser o do Creator (19,90/150 = 0,1327), não o do Studio.
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
  t('TIER_PRICES = 990 / 1990 / 5490 (texto; teste de 7 dias desde KINEO-PRECO-TESTE-2026-10-08)', /starter: \{ usd: 990 \},\n  basic: \{ usd: 1990 \},\n  pro: \{ usd: 5490 \},/.test(bloco('TIER_PRICES')))
  t('ANNUAL_PRICES = 8300 / 16700 / 46000 (texto; 30% off sobre o mensal do teste)', /starter: \{ usd: 8300 \},\n  basic: \{ usd: 16700 \},\n  pro: \{ usd: 46000 \},/.test(bloco('ANNUAL_PRICES')))
  t('escada legada: LEGACY_ANNUAL_40OFF_PRICES_USD 9290/21500/39500 (o anual de 40% off vendido de 05/10 a 08/10, texto)', /starter: 9290,\n  basic: 21500,\n  pro: 39500,/.test(bloco('LEGACY_ANNUAL_40OFF_PRICES_USD')))
  t('INTRO_PRICES = 990 / 1990 (texto)', /starter: \{ usd: 990 \},\n  basic: \{ usd: 1990 \},\n\}/.test(bloco('INTRO_PRICES')))
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
  const M = { starter: 990, basic: 1990, pro: 5490 }
  const C = { starter: 60, basic: 150, pro: 300 }
  t('executado: TIER_PRICES 990/1990/5490', tiers.every((x) => CP.TIER_PRICES[x].usd === M[x] && CP.getTierPrice(x, 'usd') === M[x] && CP.monthlyPriceMinor(x, 'usd') === M[x]))
  const A = { starter: 8300, basic: 16700, pro: 46000 } // 12 × mensal × 0,70 arredondado limpo (fundador, 08/10; mensal do teste)
  t('executado: anual = 12 × mensal × 0,70 (±0,5 pt) e annualSavingsPercent = 30', tiers.every((x) => CP.ANNUAL_PRICES[x].usd === A[x] && CP.getAnnualPrice(x, 'usd') === A[x] && Math.abs((1 - A[x] / (M[x] * 12)) * 100 - 30) <= 0.5 && CP.annualSavingsPercent(x) === 30) && CP.ANNUAL_DISCOUNT_PERCENT === 30)
  t('executado: intro = mensal → hasIntroOffer false nos dois tiers', ['starter', 'basic'].every((x) => CP.INTRO_PRICES[x].usd === M[x] && CP.hasIntroOffer(x, 'usd') === false && CP.introDiscountMinor(x, 'usd') === 0))
  t('executado: créditos 60/150/300', tiers.every((x) => CP.TIER_CREDITS[x] === C[x]))
  const problemas = CP.checkPricingInvariants()
  t('executado: checkPricingInvariants() vazio com o engineCost real (' + problemas.join(' | ') + ')', Array.isArray(problemas) && problemas.length === 0)
  const margem = (x) => { const net = CP.netAfterStripeUsd(M[x] / 100); return Math.round(((net - CP.worstCaseCogsUsd(C[x])) / net) * 100) }
  // KINEO-PRECO-TESTE-2026-10-08 — no teste ($9,90 / $19,90) a margem do pior caso cai para 33 / 12 % (Studio intacto, 37).
  // O Creator a 12% é o número que vai ao fundador junto com a decisão: positivo, mas fino (era 42% a $29,90).
  t('executado: margem pior caso 33 / 12 / 37 % (teste de 08/10, recalculados pelas funções da fonte: ' + tiers.map(margem).join('/') + ')', margem('starter') === 33 && margem('basic') === 12 && margem('pro') === 37)
  t('executado: todo top-up custa mais por crédito que o plano mais barato (no teste, Creator 19,90/150 = 0,1327)', Math.abs(CP.CHEAPEST_PLAN_USD_PER_CREDIT - 0.1327) < 0.0005 && Object.keys(CP.TOPUP_CREDITS).every((id) => CP.TOPUP_USD_PRICES[id] / 100 / CP.TOPUP_CREDITS[id] > CP.CHEAPEST_PLAN_USD_PER_CREDIT))
  // escada legada, executada
  const r = CP.renewalCreditsFor
  t('renovação: Studio pago a $39,90 (V5 restaurada) MANTÉM 300', r('pro', 3990) === 300)
  t('renovação: Studio pago a $29 (V6) recebe 180; Creator $15 (V6) 150; Starter $7 (V6) 60', r('pro', 2900) === 180 && r('basic', 1500) === 150 && r('starter', 700) === 60)
  t('renovação: fatura no preço vigente ou acima recebe o grant vigente (5490, 5900 → 300; 1990 e 2990 (V8-A) → 150; 990 e 1290 (V8-A) → 60)', r('pro', 5490) === 300 && r('pro', 5900) === 300 && r('basic', 1990) === 150 && r('basic', 2990) === 150 && r('starter', 990) === 60 && r('starter', 1290) === 60)
  t('renovação: fatura desconhecida/zero recebe o grant vigente', r('pro', null) === 300 && r('pro', undefined) === 300 && r('pro', 0) === 300)
  t('renovação: Creator $19,90 e Starter $9,90 (V5) mantêm 150 / 60', r('basic', 1990) === 150 && r('starter', 990) === 60)
  t('legacyCreditsForUsd anual: $399 (V5) → 300; $395 (anual 40% off) → 300; $394 → 180; $290 (V6) → 180; $99 → 60', CP.legacyCreditsForUsd('pro', 39900, 'annual') === 300 && CP.legacyCreditsForUsd('pro', 39500, 'annual') === 300 && CP.legacyCreditsForUsd('pro', 39400, 'annual') === 180 && CP.legacyCreditsForUsd('pro', 29000, 'annual') === 180 && CP.legacyCreditsForUsd('starter', 9900, 'annual') === 60)
  t('annualRefillCredits: anual V5 ($99/$199/$399) mantém 60/150/300; abaixo do piso → V6; vigente (8300/16700/46000), o de 30% sobre a V8-A (10800/25000), o de 40% off (9290/21500/39500) e o V8-A antigo (54900) → 60/150/300', AR.annualRefillCredits('starter', 8300, 'usd') === 60 && AR.annualRefillCredits('basic', 16700, 'usd') === 150 && AR.annualRefillCredits('starter', 9900, 'usd') === 60 && AR.annualRefillCredits('basic', 19900, 'usd') === 150 && AR.annualRefillCredits('pro', 39900, 'usd') === 300 && AR.annualRefillCredits('pro', 29000, 'usd') === 180 && AR.annualRefillCredits('pro', 54900, 'usd') === 300 && AR.annualRefillCredits('starter', 10800, 'usd') === 60 && AR.annualRefillCredits('basic', 25000, 'usd') === 150 && AR.annualRefillCredits('pro', 46000, 'usd') === 300 && AR.annualRefillCredits('starter', 9290, 'usd') === 60 && AR.annualRefillCredits('basic', 21500, 'usd') === 150 && AR.annualRefillCredits('pro', 39500, 'usd') === 300)

  // 3. BRL
  t('BRL: tabela = usdToBrlMinor(mensal) para cada tier (4990 / 9990 / 27490)', tiers.every((x) => SC.BRL_PLAN_PRICES_MINOR[x].monthly === SC.usdToBrlMinor(M[x])) && SC.BRL_PLAN_PRICES_MINOR.starter.monthly === 4990 && SC.BRL_PLAN_PRICES_MINOR.basic.monthly === 9990 && SC.BRL_PLAN_PRICES_MINOR.pro.monthly === 27490)
  t('BRL: anual = 12 × mensal × 0,70 até ,90 (41990 / 83990 / 230990)', tiers.every((x) => SC.BRL_PLAN_PRICES_MINOR[x].annual === SC.brlAnnualFromMonthly(SC.BRL_PLAN_PRICES_MINOR[x].monthly)) && SC.BRL_PLAN_PRICES_MINOR.starter.annual === 41990 && SC.BRL_PLAN_PRICES_MINOR.basic.annual === 83990 && SC.BRL_PLAN_PRICES_MINOR.pro.annual === 230990 && SC.BRL_ANNUAL_PAID_FRACTION === 0.7)
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
  t('Studio Ads OCCUPIED (o array, não o comentário): anuais 8300/16700/46000, Autopilot 29900 e mensais 990/5490 dentro; o Creator mensal 1990 (= o passe) fora; 2990/10800/25000/12900/54900/19900/39900 e os de 40% (9290/21500/39500) fora', [8300, 16700, 46000, 29900, 990, 5490, 9900].every((n) => ocupados.includes(n)) && ![1990, 2990, 10800, 25000, 12900, 54900, 19900, 39900, 9290, 21500, 39500].some((n) => ocupados.includes(n)))
  t('webhook: comentário diz que a lista de ambíguos ficou vazia e cita os anuais novos', /AMBIGUOUS_ONE_TIME_USD_AMOUNTS = \{\} \(vazia desde V8-A/.test(src.wh) && /anuais \(mode:'subscription' hoje\): 8300\/16700\/46000/.test(src.wh))
  return f
}

console.log('== pristino ==')
const base = avalia(PRISTINO)
for (const n of base) falhas.push(n)
// KINEO-ANUAL-30-2026-10-08 — 32 → 33: entrou a verificação do texto do degrau legado do anual de 40% off.
ok += 33 - base.length
console.log(`  ${33 - base.length} de 33 verificações verdes`)

console.log('== mutantes (cada um tem de ficar vermelho) ==')
const mut = (chave, de, para) => { const s = { ...PRISTINO }; if (!s[chave].includes(de)) throw new Error(`mutante sem alvo: ${chave} não contém ${JSON.stringify(de)}`); s[chave] = s[chave].split(de).join(para); return s }
const MUTANTES = [
  ['mensal do Starter volta a 1290 (V8-A, fim do teste sem decisão)', mut('cp', 'starter: { usd: 990 }', 'starter: { usd: 1290 }')],
  // KINEO-ANUAL-30-2026-10-08 — os alvos do anual seguem os números novos (46000 / 230990) + dois mutantes da decisão de 08/10.
  ['anual do Studio volta a 54900 (10× da V8-A)', mut('cp', 'pro: { usd: 46000 }', 'pro: { usd: 54900 }')],
  ['anual do Studio volta aos 40% off (39500)', mut('cp', 'pro: { usd: 46000 }', 'pro: { usd: 39500 }')],
  ['degrau legado do anual de 40% off sai da escada (Studio de $395 leria como V6)', mut('cp', 'Math.min(LEGACY_V5_PRICES_USD[tier] * 10, LEGACY_ANNUAL_40OFF_PRICES_USD[tier])', 'LEGACY_V5_PRICES_USD[tier] * 10')],
  ['intro do Creator vira 990 (1º mês com desconto reaparece)', mut('cp', 'basic: { usd: 1990 },\n}', 'basic: { usd: 990 },\n}')],
  ['anual do Creator fica no 30% da V8-A (25000) com o mensal a 1990', mut('cp', 'basic: { usd: 16700 }', 'basic: { usd: 25000 }')],
  ['tabela BRL do Studio volta a 19990', mut('sc', 'pro: { monthly: 27490, annual: 230990 }', 'pro: { monthly: 19990, annual: 143990 }')],
  ['anual BRL do Studio volta a 10× (274900)', mut('sc', 'pro: { monthly: 27490, annual: 230990 }', 'pro: { monthly: 27490, annual: 274900 }')],
  // KINEO-BUSINESS-84-2026-10-09 — re-ancorado: a escada legada V5 ganhou a linha do Business (500) antes do "}"; o mutante
  // segue mirando o Studio da V5 (300 → 180), e a âncora inclui a linha nova para continuar única no arquivo.
  ['grant legado V5 do Studio cai para 180', mut('cp', '  pro: 300,\n  autopilot: 400,\n  autopilot_lite: 160,\n  business: 500, // KINEO-BUSINESS-84-2026-10-09 — sem preço legado: toda fatura do Business comprou 500\n}', '  pro: 180,\n  autopilot: 400,\n  autopilot_lite: 160,\n  business: 500, // KINEO-BUSINESS-84-2026-10-09 — sem preço legado: toda fatura do Business comprou 500\n}')],
  ['literal espelhado do entryPolicy volta a $12.90', mut('ep', 'Plans start at $9.90/month', 'Plans start at $12.90/month')],
  ['9900 volta à lista de ambíguos (entrada obsoleta)', mut('cp', 'new Set<number>([])', 'new Set<number>([9900])')],
]
for (const [nome, src] of MUTANTES) {
  const fm = avalia(src)
  checa(`mutante "${nome}" fica vermelho (${fm.length} verificações acusam)`, fm.length >= 1)
  console.log(`  ${fm.length >= 1 ? '✓' : '✗'} ${nome}: ${fm.length} acusação(ões)`)
}

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const x of falhas) console.log('  ✗ ' + x); process.exit(1) }
console.log('OK — preço do teste (9,90 / 19,90 / 54,90 · 60/150/300 · anual 30% off · BRL 49,90/99,90/274,90) na fonte, nos invariantes, na escada legada e nas superfícies')
