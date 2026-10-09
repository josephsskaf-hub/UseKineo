#!/usr/bin/env node
// KINEO-ANUNCIO-MOTOR-2026-10-07 — guardião da CÓPIA do anúncio no Google Search por nome de motor.
// Regra do fundador: todo preço ou número citado no anúncio sai do código, nada inventado. Este guardião lê os CSVs do
// Google Ads Editor (docs/anuncio-google-motores-2026-10-07/) e confere cada número contra as MESMAS funções que cobram
// e que as páginas de destino mostram (TIER_PRICES/TIER_CREDITS, ENGINE_GEO das páginas de motor, hubEngines do
// /seedance-kling-veo-in-one-place). Se um preço mudar no código, este guardião fica vermelho ANTES de o anúncio mentir.
// Também prende: limites do Google (título ≤ 30, descrição ≤ 90, caminho ≤ 15, sitelink ≤ 25/35), anúncio "seguro" sem
// marca de terceiro, campanha importada PAUSADA (nada gasta sem o clique do fundador), orçamento/lance/locais, URLs finais
// nas páginas reais com o utm_campaign do grupo, e negativas que não bloqueiam as próprias palavras-chave.
// Executa os módulos reais com um carregador próprio (transpile + resolução de '@/' e relativos), sem import com alias.

import { readFileSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const CR = new RegExp(String.fromCharCode(13), 'g')
const read = (rel) => readFileSync(join(root, rel), 'utf8').replace(CR, '')

const cache = new Map()
function fileFor(rel) {
  for (const cand of [rel, `${rel}.ts`, `${rel}.tsx`, `${rel}/index.ts`]) {
    const abs = join(root, cand)
    if (existsSync(abs) && statSync(abs).isFile()) return cand
  }
  return null
}
function load(rel) {
  if (cache.has(rel)) return cache.get(rel).exports
  const out = ts.transpileModule(read(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: join(root, rel),
  }).outputText
  const mod = { exports: {} }
  cache.set(rel, mod)
  const req = (spec) => {
    let target = null
    if (spec.startsWith('@/')) target = spec.slice(2)
    else if (spec.startsWith('./') || spec.startsWith('../')) target = posix.normalize(posix.join(posix.dirname(rel), spec))
    if (target) {
      const f = fileFor(target)
      if (!f) throw new Error(`módulo não encontrado: ${spec} (de ${rel})`)
      return load(f)
    }
    return requireFromRepo(spec)
  }
  new Function('require', 'module', 'exports', out)(req, mod, mod.exports)
  return mod.exports
}

let passed = 0
const failures = []
const check = (ok, label) => { if (ok) passed += 1; else failures.push(label) }

function parseCsv(rel) {
  const text = read(rel)
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1 }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [header, ...body] = rows
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

// ═══ Fonte: o código ════════════════════════════════════════════════════════════════════════════════════════════════════
const pricing = load('lib/checkoutPricing.ts')
const catalog = load('lib/growth/enginePageCatalog.ts')
const hub = load('lib/seo/citableHubPages.ts')
const money = (cents) => `$${(cents / 100).toFixed(2)}`
const PRICE = { starter: money(pricing.TIER_PRICES.starter.usd), creator: money(pricing.TIER_PRICES.basic.usd), studio: money(pricing.TIER_PRICES.pro.usd) }
const CREDITS = { starter: pricing.TIER_CREDITS.starter, creator: pricing.TIER_CREDITS.basic }
const geo = (slug) => catalog.ENGINE_GEO[slug]
const S25 = geo('seedance-2-5')
const K3 = geo('kling-3')
const VEO = geo('veo')
check(Boolean(S25 && K3 && VEO), 'as três páginas de motor do anúncio têm camada citável (motor no ar, não pausado)')
const engines = hub.hubEngines()
const film60 = engines.map((e) => e.geo.rows.film60.credits)

// ═══ Os CSVs ════════════════════════════════════════════════════════════════════════════════════════════════════════════
const DIR = 'docs/anuncio-google-motores-2026-10-07'
const campaign = parseCsv(`${DIR}/1-campanha.csv`)
const locations = parseCsv(`${DIR}/2-locais.csv`)
const groups = parseCsv(`${DIR}/3-grupos.csv`)
const keywords = parseCsv(`${DIR}/4-palavras-chave.csv`)
const negatives = parseCsv(`${DIR}/5-negativas.csv`)
const ads = parseCsv(`${DIR}/6-anuncios.csv`)
const sitelinks = parseCsv(`${DIR}/7-sitelinks.csv`)

// Campanha: importada PAUSADA, Search só no Google, US$ 18/dia, Maximizar cliques com teto de US$ 1, inglês, 4 países.
const c = campaign[0] ?? {}
check(campaign.length === 1, 'uma campanha')
check(c['Campaign Status'] === 'Paused', 'a campanha entra PAUSADA: nada gasta antes do clique final do fundador')
check(c['Campaign Type'] === 'Search' && c.Networks === 'Google search', 'Search, só na rede de pesquisa do Google (sem parceiros, sem Display)')
check(c.Budget === '18.00' && c['Budget type'] === 'Daily', 'orçamento US$ 18/dia')
check(c['Bid Strategy Type'] === 'Maximize clicks' && c['Maximum CPC bid limit'] === '1.00', 'Maximizar cliques com teto de CPC de US$ 1,00')
check(c.Languages === 'en', 'idioma inglês')
check(c['Final URL suffix'] === 'utm_term={keyword}&utm_content={creative}', 'sufixo leva a palavra-chave e o anúncio para o banco')
check(JSON.stringify(locations.map((l) => l['Location ID']).sort()) === JSON.stringify(['2036', '2124', '2826', '2840']), 'locais: EUA 2840, Reino Unido 2826, Canadá 2124, Austrália 2036')

// Grupos, URLs finais e utm_campaign.
const EXPECTED = {
  'G1 - Seedance 2.5': { path: '/ai-video-generator/seedance-2-5', camp: 'motor-seedance-2-5' },
  'G2 - Kling 3': { path: '/ai-video-generator/kling-3', camp: 'motor-kling-3' },
  'G3 - Veo 3.1': { path: '/ai-video-generator/veo', camp: 'motor-veo-3-1' },
  'G4 - Seedance + Kling + Veo in one app': { path: '/seedance-kling-veo-in-one-place', camp: 'motor-3-em-1' },
}
check(JSON.stringify(groups.map((g) => g['Ad Group']).sort()) === JSON.stringify(Object.keys(EXPECTED).sort()), 'os 4 grupos')
check(catalog.isIndexableEngineSlug('seedance-2-5') && catalog.isIndexableEngineSlug('kling-3') && catalog.isIndexableEngineSlug('veo'), 'as páginas de destino de motor estão publicadas e indexáveis')
check(hub.HUB_PAGES.oneplace.path === '/seedance-kling-veo-in-one-place', 'a página "3 em 1" é a do hub publicado')
for (const ad of ads) {
  const want = EXPECTED[ad['Ad Group']]
  const url = new URL(ad['Final URL'])
  check(Boolean(want) && url.origin === 'https://www.usekineo.com' && url.pathname === want.path, `URL final do grupo ${ad['Ad Group']}: ${url.pathname}`)
  check(url.searchParams.get('utm_source') === 'google' && url.searchParams.get('utm_medium') === 'cpc' && url.searchParams.get('utm_campaign') === want?.camp, `utm do anúncio ${ad['Ad Group']}`)
}
for (const s of sitelinks) {
  const url = new URL(s['Final URL'])
  check(url.searchParams.get('utm_campaign') === EXPECTED[s['Ad Group']]?.camp && url.searchParams.get('utm_medium') === 'cpc', `sitelink "${s['Link Text']}" leva o utm do próprio grupo (${s['Ad Group']})`)
}

// Limites do Google, palavras vetadas e marca.
const BRAND = /seedance|kling|veo|google|bytedance|kuaishou|minimax|gemini|tiktok|youtube|runway|higgsfield/i
const headlines = (ad) => Array.from({ length: 15 }, (_, i) => ad[`Headline ${i + 1}`])
const descriptions = (ad) => Array.from({ length: 4 }, (_, i) => ad[`Description ${i + 1}`])
check(ads.length === 8, '2 anúncios responsivos por grupo (A com o motor, B seguro)')
for (const [i, ad] of ads.entries()) {
  const tag = `${ad['Ad Group']} #${i % 2 === 0 ? 'A' : 'B'}`
  const h = headlines(ad)
  const d = descriptions(ad)
  check(h.every((x) => x && x.length <= 30) && new Set(h).size === 15, `${tag}: 15 títulos distintos, ≤ 30`)
  check(d.every((x) => x && x.length <= 90), `${tag}: 4 descrições ≤ 90`)
  check(ad['Path 1'].length <= 15 && ad['Path 2'].length <= 15, `${tag}: caminho ≤ 15`)
  check(!h.some((x) => /!/.test(x)), `${tag}: sem exclamação em título`)
  check(![...h, ...d].some((x) => /\bfree\b|\bbest\b|#1|\bofficial\b|\bunlimited\b|guarantee/i.test(x)), `${tag}: sem free/best/#1/official/unlimited`)
  if (i % 2 === 1) check(!BRAND.test([...h, ...d, ad['Path 1'], ad['Path 2']].join(' ')), `${tag}: anúncio seguro sem marca de terceiro`)
}
for (const s of sitelinks) check(s['Link Text'].length <= 25 && s['Description Line 1'].length <= 35 && s['Description Line 2'].length <= 35 && !BRAND.test(Object.values(s).slice(2, 5).join(' ')), `sitelink "${s['Link Text']}": limites e sem marca`)

// ═══ Cada número do anúncio = o número do código ═══════════════════════════════════════════════════════════════════════
const copy = [...ads.flatMap((ad) => [...headlines(ad), ...descriptions(ad)]), ...sitelinks.flatMap((s) => [s['Description Line 1'], s['Description Line 2']])]
const allowedPrices = new Set(Object.values(PRICE))
for (const m of copy.join(' ').match(/\$\d+\.\d{2}/g) ?? []) check(allowedPrices.has(m), `preço ${m} existe em TIER_PRICES`)
const has = (text) => copy.some((x) => x.includes(text))
const say = (text, truth, label) => check(!has(text) || truth, `${label}: "${text}"`)
check(has(`Plans From ${PRICE.starter} a Month`) && has(`Creator Plan: ${PRICE.creator} a Month`), 'os títulos de preço usam TIER_PRICES de hoje')
say('for 60 credits', CREDITS.starter === 60, 'Starter = 60 créditos')
// KINEO-PRECO-TESTE-2026-10-08 — Creator a $19,90 no teste de 7 dias (o gerador do anúncio foi atualizado no mesmo commit).
say('Creator: $19.90/month for 150 credits', PRICE.creator === '$19.90' && CREDITS.creator === 150, 'Creator = US$ 19,90 por 150 créditos')
say('Creator ($19.90, 150 credits)', PRICE.creator === '$19.90' && CREDITS.creator === 150, 'Creator = US$ 19,90 por 150 créditos')
say('Studio ($54.90', PRICE.studio === '$54.90', 'Studio = US$ 54,90')
say('Seedance 2.5 Clips: 8 Credits', S25?.rows.clip.credits === 8, 'clipe do Seedance 2.5 = 8 créditos')
say('A 5-second Seedance 2.5 clip costs 8 credits', S25?.rows.clip.credits === 8 && S25?.rows.clip.seconds === 5, 'clipe do 2.5 = 5 s por 8 créditos')
say('35-Second Film: 88 Credits', S25?.rows.film35.credits === 88, 'filme de 35 s do 2.5 = 88 créditos')
say('Kling 3 Clips: 6 Credits', K3?.rows.clip.credits === 6, 'clipe do Kling 3 = 6 créditos')
say('A 5-second Kling 3 clip costs 6 credits', K3?.rows.clip.credits === 6 && K3?.rows.clip.seconds === 5, 'clipe do Kling 3 = 5 s por 6 créditos')
say('Veo 3.1 Clips: 6 Credits', VEO?.rows.clip.credits === 6, 'clipe do Veo 3.1 = 6 créditos')
say('A 6-second Veo 3.1 clip costs 6 credits', VEO?.rows.clip.credits === 6 && VEO?.rows.clip.seconds === 6, 'clipe do Veo 3.1 = 6 s por 6 créditos')
say('60-Second Film: 100 Credits', VEO?.rows.film60.credits === 100, 'filme de 60 s do Veo 3.1 = 100 créditos')
say('film costs 100 credits', VEO?.rows.film60.credits === 100, 'filme de 60 s do Veo 3.1 = 100 créditos')
say('60-Second Film: 150 Credits', S25?.rows.film60.credits === 150 && K3?.rows.film60.credits === 150, 'filme de 60 s do 2.5 e do Kling 3 = 150 créditos')
say('film costs 150', S25?.rows.film60.credits === 150 && K3?.rows.film60.credits === 150, 'filme de 60 s = 150 créditos')
say('35 to 150 credits', Math.min(...film60) === 35 && Math.max(...film60) === 150, 'faixa do filme de 60 s no hub = 35 a 150')
say('6 AI Video Models', engines.length === 6, 'o hub tem 6 modelos')
say('Six', engines.length === 6, 'o hub tem 6 modelos')
say('6 Video Models', engines.length === 6, 'o hub tem 6 modelos')
// REANCORADO KINEO-GEO-RODADA3-2026-10-08 (com motivo): a página de destino trocou a faixa digitada "Usually 8–25 minutes" pelo
// tempo MEDIDO do Kineo AI Video Index (rodada 3 de GEO, 08/10); a manchete "Usually Ready in 8-25 Minutes" perdeu o lastro e
// saiu. No lugar, "Film Ready in Minutes", conferida contra o MESMO JSON do índice (a edição que lib/seo/aiVideoIndexTimes.ts
// declara): mediana e p90 de cada motor dos anúncios (2.5, Kling 3, Veo 3.1) abaixo de 60 min. Faixa de minutos digitada não volta.
const edicaoIndice = (read('lib/seo/aiVideoIndexTimes.ts').match(/edition: '(\d{4}-\d{2})'/) ?? [])[1]
const indice = edicaoIndice ? JSON.parse(read(`data/ai-video-index/${edicaoIndice}.json`)) : { engines: [] }
const tempoMedido = (q) => { const r = indice.engines.find((x) => x.qualityMode === q); return r?.customers?.minutesToFilm ?? r?.house?.minutesToFilm ?? null }
const emMinutos = ['cinematic_s25', 'cinematic_hollywood', 'cinematic_veo'].every((q) => { const t = tempoMedido(q); return Boolean(t) && t.median < 60 && t.p90 < 60 })
say('Film Ready in Minutes', emMinutos, 'prazo = minutos MEDIDOS no índice (mediana e p90 < 60 min no 2.5, Kling 3 e Veo 3.1)')
check(!/\d+\s*[-–]\s*\d+\s*Minutes/i.test(copy.join(' ')), 'nenhuma faixa de minutos digitada na cópia (o tempo é o medido do índice)')
say('Veo 3.1 Fast', /Veo 3\.1 Fast/.test(VEO?.answerLead ?? ''), 'a página diz que roda o Veo 3.1 Fast')
say('Seedance 2.5 runs on paid plans', S25?.paidPlansOnly === true, 'o 2.5 é só de plano pago')
// As frases-chave TÊM de estar na cópia (senão as checagens acima passariam por ausência).
for (const text of ['Seedance 2.5 Clips: 8 Credits', '35-Second Film: 88 Credits', 'Kling 3 Clips: 6 Credits', 'Veo 3.1 Clips: 6 Credits', '60-Second Film: 100 Credits', '60-Second Film: 150 Credits', '35 to 150 credits', '6 AI Video Models', 'Film Ready in Minutes', 'Veo 3.1 Fast', 'for 60 credits']) {
  check(has(text), `a cópia afirma "${text}" (checado contra o código acima)`)
}
// Todo "<n> credits" e todo "<n>-second" da cópia é um número que o código produz hoje — inclusive os que ninguém previu.
const allowedCredits = new Set([S25?.rows.clip.credits, S25?.rows.film35.credits, S25?.rows.film60.credits, K3?.rows.clip.credits, K3?.rows.film60.credits, VEO?.rows.clip.credits, VEO?.rows.film60.credits, CREDITS.starter, CREDITS.creator, Math.min(...film60), Math.max(...film60)].map(String))
for (const m of copy.join(' ').matchAll(/\b(\d+) [Cc]redits\b/g)) check(allowedCredits.has(m[1]), `"${m[0]}" é um número de créditos do código (${[...allowedCredits].join('/')})`)
const allowedSeconds = new Set([S25?.rows.clip.seconds, K3?.rows.clip.seconds, VEO?.rows.clip.seconds, S25?.rows.film35.seconds, S25?.rows.film60.seconds].map(String))
for (const m of copy.join(' ').matchAll(/\b(\d+)-[Ss]econd\b/g)) check(allowedSeconds.has(m[1]), `"${m[0]}" é uma duração do código (${[...allowedSeconds].join('/')})`)
const numbersInCopy = new Set((copy.join(' ').match(/\b\d+(?:\.\d+)?\b/g) ?? []))
const KNOWN = new Set(['1', '2', '3', '5', '6', '8', '9', '16', '25', '35', '60', '88', '100', '150', '9.90', '19.90', '54.90', '2026', '1.5', '2.5', '3.1'])
check([...numbersInCopy].every((n) => KNOWN.has(n)), `nenhum número fora da lista conferida: ${[...numbersInCopy].filter((n) => !KNOWN.has(n)).join(', ')}`)

// ═══ Palavras-chave e negativas ════════════════════════════════════════════════════════════════════════════════════════
check(keywords.every((k) => ['Exact', 'Phrase'].includes(k['Criterion Type'])), 'só correspondência exata e de frase (nada de ampla)')
for (const g of Object.keys(EXPECTED)) check(keywords.filter((k) => k['Ad Group'] === g).length >= 12, `${g}: palavras-chave suficientes`)
const broadNeg = negatives.filter((n) => n['Criterion Type'] === 'Campaign Negative Broad').map((n) => n.Keyword)
const phraseNeg = negatives.filter((n) => n['Criterion Type'] === 'Campaign Negative Phrase').map((n) => n.Keyword)
for (const must of ['free', 'download', 'github', 'api', 'jobs', 'wiki', 'crack']) check(broadNeg.includes(must), `negativa obrigatória: ${must}`)
check(phraseNeg.includes('api key') && phraseNeg.includes('open source'), 'negativas de frase: api key, open source')
const blocked = keywords.filter((k) => broadNeg.some((n) => k.Keyword.split(/\s+/).includes(n)) || phraseNeg.some((n) => ` ${k.Keyword} `.includes(` ${n} `)))
check(blocked.length === 0, `nenhuma negativa bloqueia palavra-chave da campanha: ${blocked.map((k) => k.Keyword).join(', ')}`)

const total = passed + failures.length
if (failures.length) {
  for (const f of failures) console.error(`✗ ${f}`)
  console.error(`\n${failures.length} de ${total} verificações da cópia do anúncio por motor FALHARAM`)
  process.exit(1)
}
console.log(`\n${passed}/${total} verificações da cópia do anúncio por motor ok`)
