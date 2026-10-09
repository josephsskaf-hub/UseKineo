#!/usr/bin/env node
// KINEO-PRECO-TESTE-2026-10-08 — guardião do teste de 7 dias: Starter US$ 9,90 e Creator US$ 19,90 (Studio US$ 54,90).
// Decisão do fundador (08/10 ~23h BRT): "tudo sim" + "abaixar o valor do plano Creator também". Doc:
// docs/DECISAO-PRECO-TESTE-2026-10-08.md. O guardião da escada inteira (invariantes executados, escada legada, margem)
// segue sendo scripts/test-preco-v8-A-2026-09-28.mjs (re-ancorado no mesmo commit); este aqui vigia o que SÓ este teste
// mexeu e que nenhum outro guardião olharia:
//   A. a fonte: mensal 990/1990/5490, intro = mensal, anual 8300/16700/46000 (30% ± 0,5), BRL 4990/41990 · 9990/83990;
//   B. os espelhos puros: "Plans start at $9.90/month" (entryPolicy) e a lista de valores ocupados do Studio Ads;
//   C. os efeitos colaterais que a mudança NÃO pode ter: o clipe não fica mais caro em créditos (referência congelada
//      em 2990), o PayPal não reaproveita plano v4 (v5), o anual do 2º mês nunca passa do anual do site (teto),
//      o llms.txt não reescreve a história de 28/09 com o preço de hoje, o "Prices as of" anda junto;
//   D. o texto do GPT colado à mão pelo fundador sem o preço antigo, e o doc com o plano de medição.
//   E. mutantes em memória: cada um tem de deixar pelo menos uma verificação vermelha.
// readFileSync puro (sem alias @/, sem rede, sem banco); CRLF normalizado.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

const FONTES = {
  cp: 'lib/checkoutPricing.ts',
  sc: 'lib/settlementCurrency.ts',
  ep: 'lib/entryPolicy.ts',
  clip: 'lib/clips/clipPricing.ts',
  pp: 'lib/paypal.ts',
  sw: 'lib/billing/annualSwitch.ts',
  llms: 'app/llms.txt/route.ts',
  hub: 'lib/seo/citableHubPages.ts',
  offer: 'lib/ads/offer.ts',
  gpt: 'docs/GPT-INSTRUCOES-V3-COLAR-2026-09-24.txt',
  doc: 'docs/DECISAO-PRECO-TESTE-2026-10-08.md',
}
const PRISTINO = Object.fromEntries(Object.entries(FONTES).map(([k, rel]) => [k, existsSync(join(ROOT, rel)) ? rd(rel) : '']))

function bloco(src, nome) {
  const i = src.indexOf(`export const ${nome}`)
  if (i < 0) return ''
  const j = src.indexOf(' = {', i)
  return src.slice(j, src.indexOf('\n}', j) + 2)
}
const usdDe = (b, tier) => Number((new RegExp(`\\n  ${tier}: \\{ usd: (\\d+) \\}`).exec(b) || [])[1])

function avalia(src) {
  const f = []
  const t = (nome, cond) => { if (!cond) f.push(nome) }

  // A. a fonte
  const tier = bloco(src.cp, 'TIER_PRICES')
  const intro = bloco(src.cp, 'INTRO_PRICES')
  const anual = bloco(src.cp, 'ANNUAL_PRICES')
  const M = { starter: usdDe(tier, 'starter'), basic: usdDe(tier, 'basic'), pro: usdDe(tier, 'pro') }
  const A = { starter: usdDe(anual, 'starter'), basic: usdDe(anual, 'basic'), pro: usdDe(anual, 'pro') }
  t('A1 mensal: Starter 990 · Creator 1990 · Studio 5490 (o Studio não entrou na decisão)', M.starter === 990 && M.basic === 1990 && M.pro === 5490)
  t('A2 intro = mensal (nenhum 1º mês com desconto reaparece)', usdDe(intro, 'starter') === M.starter && usdDe(intro, 'basic') === M.basic)
  t('A3 anual: 8300 · 16700 · 46000', A.starter === 8300 && A.basic === 16700 && A.pro === 46000)
  t('A4 anual a 30% ± 0,5 ponto de 12 mensalidades nos três planos', ['starter', 'basic', 'pro'].every((x) => Math.abs((1 - A[x] / (M[x] * 12)) * 100 - 30) <= 0.5))
  t('A5 marca do teste no cabeçalho da tabela', src.cp.includes('KINEO-PRECO-TESTE-2026-10-08 — STARTER E CREATOR DE VOLTA A $9,90 / $19,90 (TESTE DE 7 DIAS)'))
  t('A6 BRL: Starter R$ 49,90 / anual R$ 419,90 · Creator R$ 99,90 / anual R$ 839,90 · Studio intocado',
    src.sc.includes('  starter: { monthly: 4990, annual: 41990 },\n  basic: { monthly: 9990, annual: 83990 },\n  pro: { monthly: 27490, annual: 230990 },'))

  // B. espelhos puros
  t('B1 entryPolicy (módulo puro) diz "Plans start at $9.90/month" e não guarda o preço antigo', src.ep.includes('Plans start at $9.90/month') && !src.ep.includes('Plans start at $12.90/month'))
  const ocupados = ((src.offer.match(/ONE_TIME_USD_MINOR_OCCUPIED: readonly number\[\] = \[([^\]]*)\]/) || [])[1] || '').split(',').map((s) => Number(s.trim())).filter(Number.isFinite)
  t('B2 Studio Ads: 990, 8300 e 16700 ocupados; 1990 (= o passe), 2990, 10800 e 25000 fora',
    [990, 8300, 16700, 46000].every((n) => ocupados.includes(n)) && ![1990, 2990, 10800, 25000].some((n) => ocupados.includes(n)))

  // C. efeitos colaterais vigiados
  t('C1 clipes: a referência do Creator fica congelada em 2990 (o clipe não sobe ~50% em créditos sem decisão)',
    /export const CREATOR_PLAN_USD_CENTS = 2990\n/.test(src.clip) && src.clip.includes('DEIXOU de acompanhar o Creator'))
  t("C2 PayPal: PLAN_VERSION = 'v5' (um plano v4 cobraria $12,90 / $29,90 para sempre)", src.pp.includes("const PLAN_VERSION = 'v5'"))
  t('C3 anual do 2º mês: quem paga acima do vigente recebe o menor entre a conta e o anual do site',
    src.sw.includes("  if (tier && typeof current === 'number' && monthlyMinor > current) return siteUsd === null ? null : Math.min(legacyUsd, siteUsd)\n"))
  const linha2809 = (src.llms.split('\n').find((l) => l.startsWith('- 2026-09-28: plans repriced')) || '')
  t('C4 llms.txt: a linha de 28/09 diz o preço DAQUELE dia ($12.90 / $29.90 / $54.90), não o vigente',
    linha2809.includes('Starter $12.90 / Creator $29.90 / Studio $54.90') && !linha2809.includes('formatCheckoutMoney'))
  t('C5 llms.txt: entrada de 09/10 com o preço vigente lido da fonte',
    src.llms.includes("- 2026-10-09: Starter and Creator went back to ${formatCheckoutMoney('usd', TIER_PRICES.starter.usd)} / ${formatCheckoutMoney('usd', TIER_PRICES.basic.usd)} per month"))
  t('C6 "Prices as of" das páginas citáveis anda junto: HUB_REVIEWED_ISO = 2026-10-09', /export const HUB_REVIEWED_ISO = '2026-10-09'\n/.test(src.hub))

  // D. textos e doc
  t('D1 GPT "Kineo Video Maker": nenhum $12.90; Starter US$9.90 e Creator $19.90 no texto de colar',
    !/12[.,]90/.test(src.gpt) && src.gpt.includes('Paid plans from US$9.90/month.') && src.gpt.includes('Creator $19.90/month (150)'))
  t('D2 doc da decisão com a tabela medida, a margem do Creator e a data de medir',
    src.doc.includes('| **assinaram** | **4** | **1** |') && src.doc.includes('**12%**') && src.doc.includes('Como medir (16/10)'))
  return f
}

let ok = 0
const falhas = []
const base = avalia(PRISTINO)
const TOTAL = 17
ok += TOTAL - base.length
falhas.push(...base)
console.log(`== pristino: ${TOTAL - base.length} de ${TOTAL} verdes ==`)

const mut = (chave, de, para) => {
  const s = { ...PRISTINO }
  if (s[chave].split(de).length !== 2) throw new Error(`mutante sem alvo único: ${chave} → ${JSON.stringify(de).slice(0, 80)}`)
  s[chave] = s[chave].replace(de, para)
  return s
}
const MUTANTES = [
  ['Starter volta a 1290 sem decisão', mut('cp', '  starter: { usd: 990 },\n  basic: { usd: 1990 },\n  pro: { usd: 5490 },', '  starter: { usd: 1290 },\n  basic: { usd: 1990 },\n  pro: { usd: 5490 },')],
  ['Creator fica em 2990 (só o Starter caiu)', mut('cp', '  starter: { usd: 990 },\n  basic: { usd: 1990 },\n  pro: { usd: 5490 },', '  starter: { usd: 990 },\n  basic: { usd: 2990 },\n  pro: { usd: 5490 },')],
  ['Studio cai junto para 3990', mut('cp', '  basic: { usd: 1990 },\n  pro: { usd: 5490 },', '  basic: { usd: 1990 },\n  pro: { usd: 3990 },')],
  ['anual do Creator esquecido em 25000', mut('cp', 'basic: { usd: 16700 }', 'basic: { usd: 25000 }')],
  ['intro do Starter fica em 1290 (desconto de 1º mês ao contrário)', mut('cp', '  starter: { usd: 990 },\n  basic: { usd: 1990 },\n}', '  starter: { usd: 1290 },\n  basic: { usd: 1990 },\n}')],
  ['BRL do Creator esquecido em R$ 149,90', mut('sc', 'basic: { monthly: 9990, annual: 83990 }', 'basic: { monthly: 14990, annual: 125990 }')],
  ['entryPolicy volta a $12.90', mut('ep', 'Plans start at $9.90/month', 'Plans start at $12.90/month')],
  ['Creator mensal 1990 entra na lista do Studio Ads (colide com o passe)', mut('offer', '900, 990, 1290,', '900, 990, 1290, 1990,')],
  ['referência dos clipes acompanha o Creator (clipe sobe ~50% em créditos)', mut('clip', 'export const CREATOR_PLAN_USD_CENTS = 2990\n', 'export const CREATOR_PLAN_USD_CENTS = 1990\n')],
  ['PayPal fica na v4', mut('pp', "const PLAN_VERSION = 'v5'", "const PLAN_VERSION = 'v4'")],
  ['o teto do anual do 2º mês some', mut('sw', "  if (tier && typeof current === 'number' && monthlyMinor > current) return siteUsd === null ? null : Math.min(legacyUsd, siteUsd)\n", '')],
  ['llms.txt reescreve 28/09 com o preço vigente', mut('llms', 'Starter $12.90 / Creator $29.90 / Studio $54.90', "Starter ${formatCheckoutMoney('usd', TIER_PRICES.starter.usd)} / Creator $29.90 / Studio $54.90")],
  ['"Prices as of" fica em 6 de outubro', mut('hub', "export const HUB_REVIEWED_ISO = '2026-10-09'", "export const HUB_REVIEWED_ISO = '2026-10-06'")],
  ['GPT volta a dizer US$12.90', mut('gpt', 'Paid plans from US$9.90/month.', 'Paid plans from US$12.90/month.')],
]
for (const [nome, src] of MUTANTES) {
  const fm = avalia(src)
  if (fm.length >= 1) ok++
  else falhas.push(`mutante "${nome}" passou verde — o guardião não vigia isso`)
  console.log(`  ${fm.length >= 1 ? '✓' : '✗'} mutante: ${nome} (${fm.length} acusação(ões))`)
}

console.log(`\n  verificações: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) {
  for (const x of falhas) console.log('  ✗ ' + x)
  process.exit(1)
}
console.log('OK — teste de preço de 08/10 (Starter 9,90 · Creator 19,90 · Studio 54,90) na fonte, nos espelhos e sem efeito colateral')
