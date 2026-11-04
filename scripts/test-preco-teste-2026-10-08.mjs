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
  // KINEO-PRECO-MERCADO-0411 — re-ancorado na tabela de 04/11 (9 / 19 / 59, anual 50%); o que este guardião vigia segue igual.
  t('A1 mensal: Starter 900 · Creator 1900 · Studio 5900', M.starter === 900 && M.basic === 1900 && M.pro === 5900)
  t('A2 intro = mensal (nenhum 1º mês com desconto reaparece)', usdDe(intro, 'starter') === M.starter && usdDe(intro, 'basic') === M.basic)
  t('A3 anual: 5400 · 11400 · 35400', A.starter === 5400 && A.basic === 11400 && A.pro === 35400)
  t('A4 anual a 50% ± 0,5 ponto de 12 mensalidades nos três planos', ['starter', 'basic', 'pro'].every((x) => Math.abs((1 - A[x] / (M[x] * 12)) * 100 - 50) <= 0.5))
  t('A5 marca da decisão junto da tabela', src.cp.includes('KINEO-PRECO-MERCADO-0411 — fundador 04/11'))
  t('A6 BRL: Starter R$ 44,90 / anual R$ 269,90 · Creator R$ 94,90 / anual R$ 569,90 · Studio R$ 294,90 / anual R$ 1.769,90',
    src.sc.includes('  starter: { monthly: 4490, annual: 26990 },\n  basic: { monthly: 9490, annual: 56990 },\n  pro: { monthly: 29490, annual: 176990 },'))

  // B. espelhos puros
  t('B1 entryPolicy (módulo puro) diz "Plans start at $9/month" e não guarda o preço antigo', src.ep.includes('Plans start at $9/month') && !src.ep.includes('Plans start at $9.90/month') && !src.ep.includes('Plans start at $12.90/month'))
  const ocupados = ((src.offer.match(/ONE_TIME_USD_MINOR_OCCUPIED: readonly number\[\] = \[([^\]]*)\]/) || [])[1] || '').split(',').map((s) => Number(s.trim())).filter(Number.isFinite)
  t('B2 Studio Ads: mensais e anuais de hoje ocupados; 1990 (= o passe), 2990, 10800 e 25000 fora',
    [900, 1900, 5400, 5900, 11400, 35400].every((n) => ocupados.includes(n)) && ![1990, 2990, 10800, 25000].some((n) => ocupados.includes(n)))

  // C. efeitos colaterais vigiados
  t('C1 clipes: a referência do Creator fica congelada em 2990 (o clipe não sobe ~50% em créditos sem decisão)',
    /export const CREATOR_PLAN_USD_CENTS = 2990\n/.test(src.clip) && src.clip.includes('DEIXOU de acompanhar o Creator'))
  t("C2 PayPal: PLAN_VERSION = 'v6' (um plano v5 cobraria o preço antigo para sempre)", src.pp.includes("const PLAN_VERSION = 'v6'"))
  t('C3 anual do 2º mês: quem paga acima do vigente recebe o menor entre a conta e o anual do site',
    src.sw.includes("  if (tier && typeof current === 'number' && monthlyMinor > current) return siteUsd === null ? null : Math.min(legacyUsd, siteUsd)\n"))
  const linha2809 = (src.llms.split('\n').find((l) => l.startsWith('- 2026-09-28: plans repriced')) || '')
  t('C4 llms.txt: a linha de 28/09 diz o preço DAQUELE dia ($12.90 / $29.90 / $54.90), não o vigente',
    linha2809.includes('Starter $12.90 / Creator $29.90 / Studio $54.90') && !linha2809.includes('formatCheckoutMoney'))
  t('C5 llms.txt: a entrada de 09/10 diz o preço DAQUELE dia, não o vigente',
    src.llms.includes('- 2026-10-09: Starter and Creator went back to $9.90 / $19.90 per month'))
  t('C6 "Prices as of" das páginas citáveis anda junto: HUB_REVIEWED_ISO = 2026-10-09', /export const HUB_REVIEWED_ISO = '2026-10-09'\n/.test(src.hub))

  // D. textos e doc
  t('D1 GPT "Kineo Video Maker": nenhum preço antigo; Starter US$9 e Creator $19 no texto de colar',
    !/12[.,]90|9\.90/.test(src.gpt) && src.gpt.includes('Paid plans from US$9/month.') && src.gpt.includes('Creator $19/month (85)'))
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
  ['Starter volta a 1290 sem decisão', mut('cp', '  starter: { usd: 900 },\n  basic: { usd: 1900 },\n  pro: { usd: 5900 },', '  starter: { usd: 1290 },\n  basic: { usd: 1900 },\n  pro: { usd: 5900 },')],
  ['Creator fica em 2990 (só o Starter caiu)', mut('cp', '  starter: { usd: 900 },\n  basic: { usd: 1900 },\n  pro: { usd: 5900 },', '  starter: { usd: 900 },\n  basic: { usd: 2990 },\n  pro: { usd: 5900 },')],
  ['Studio cai junto para 3990', mut('cp', '  basic: { usd: 1900 },\n  pro: { usd: 5900 },', '  basic: { usd: 1900 },\n  pro: { usd: 3990 },')],
  ['anual do Creator esquecido em 25000', mut('cp', 'basic: { usd: 11400 }', 'basic: { usd: 25000 }')],
  ['intro do Starter fica em 1290 (desconto de 1º mês ao contrário)', mut('cp', '  starter: { usd: 900 },\n  basic: { usd: 1900 },\n}', '  starter: { usd: 1290 },\n  basic: { usd: 1900 },\n}')],
  ['BRL do Creator esquecido em R$ 149,90', mut('sc', 'basic: { monthly: 9490, annual: 56990 }', 'basic: { monthly: 14990, annual: 125990 }')],
  ['entryPolicy volta a $12.90', mut('ep', 'Plans start at $9/month', 'Plans start at $12.90/month')],
  ['1990 entra na lista do Studio Ads (colide com o passe)', mut('offer', '900, 1290,', '900, 1290, 1990,')],
  ['referência dos clipes acompanha o Creator (clipe sobe ~50% em créditos)', mut('clip', 'export const CREATOR_PLAN_USD_CENTS = 2990\n', 'export const CREATOR_PLAN_USD_CENTS = 1990\n')],
  ['PayPal fica na v5', mut('pp', "const PLAN_VERSION = 'v6'", "const PLAN_VERSION = 'v5'")],
  ['o teto do anual do 2º mês some', mut('sw', "  if (tier && typeof current === 'number' && monthlyMinor > current) return siteUsd === null ? null : Math.min(legacyUsd, siteUsd)\n", '')],
  ['llms.txt reescreve 28/09 com o preço vigente', mut('llms', 'Starter $12.90 / Creator $29.90 / Studio $54.90', "Starter ${formatCheckoutMoney('usd', TIER_PRICES.starter.usd)} / Creator $29.90 / Studio $54.90")],
  ['"Prices as of" fica em 6 de outubro', mut('hub', "export const HUB_REVIEWED_ISO = '2026-10-09'", "export const HUB_REVIEWED_ISO = '2026-10-06'")],
  ['GPT volta a dizer US$12.90', mut('gpt', 'Paid plans from US$9/month.', 'Paid plans from US$12.90/month.')],
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
