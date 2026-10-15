// KINEO-VS-NOVOS-1610 — guardião das comparações /vs dos 5 nomes que o ChatGPT cita e a Kineo não (15/10/2026):
// Google Flow e Dreamina (páginas novas, molde das irmãs de 13/10), CapCut (enriquecida), Creatify (enriquecida, molde do
// Ads) e Arcads (nova, molde do Ads). Offline: executa os módulos REAIS (páginas, sitemap, /llms.txt) sem rede/banco.
//
// Regras (cada uma com mutante que TEM de ficar vermelho, com prova de que o mutante foi aplicado):
//   R1 páginas de Shorts (flow, dreamina, capcut): estáticas, H1 = pergunta, canonical, título ≤60, descrição ≤155, resumo
//      citável de 3 linhas, "When to pick X instead", FAQPage JSON-LD = FAQ visível, cada fato com texto + fonte + data na
//      mesma célula, links para página de motor e /ads/for/online-stores;
//   R2 páginas do Ads (creatify, arcads): mesmo molde (AdsComparisonPage), título ≤60, descrição ≤155, canonical, OG 1200×630,
//      resumo de 3 linhas, fatos com fonte + data na mesma célula, "When to pick X instead", FAQPage JSON-LD = FAQ visível,
//      link para /ads/for/online-stores e página de motor, pessoa de IA sempre rotulada;
//   R3 nenhum preço NOSSO digitado: os arquivos novos/tocados não têm "$<n>", "USD <n>", "<n> credits" nem "<n>/month"; a
//      página mostra o preço das fontes únicas (checkoutPricing, buyCreatorCopy, adsSegmentOffer);
//   R4 todo fato externo tem `// fonte: <URL> (lido em <data>)` logo acima com a MESMA URL e a data da leitura; número de
//      concorrente só existe no módulo de fatos;
//   R5 sitemap (lastmod = data da leitura) e /llms.txt citam as páginas novas; as linhas do Ads somem com o Studio Ads desligado;
//   R6 nada de vencedor universal, promessa proibida ou nota/depoimento inventado.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { React, root, source, offlineModules, renderToStaticMarkup, escapeHtml } from './gpt24h-offline-support.mjs'
import { moduleAt } from './gpt-5h-test-support.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

globalThis.fetch = () => { throw Error('Network forbidden in vs-novos-1610 test') }

const BASE = 'https://www.usekineo.com'
const FACTS = 'lib/seo/vsNovos1610.ts'
const ANSWERS = 'lib/growth/vsAlternativeAnswers.ts'
const VS_COMPONENT = 'components/VsAlternativeComparison.tsx'
const ADS_LIB = 'lib/growth/adsComparisons.ts'
const ADS_COMPONENT = 'components/AdsComparisonPage.tsx'
const SITEMAP = 'app/sitemap.ts'
const LLMS = 'app/llms.txt/route.ts'
const SHORTS = { flow: 'app/vs/google-flow-alternatives-finished-shorts/page.tsx', dreamina: 'app/vs/dreamina-alternatives-narrated-shorts/page.tsx', capcut: 'app/vs/capcut-alternatives-no-editing-shorts/page.tsx' }
const ADS = { creatify: 'app/vs/creatify-alternative/page.tsx', arcads: 'app/vs/arcads-alternative/page.tsx' }
const BANNED = [/unlimited/i, /priority queue/i, /1080p/i, /premium voices?/i, /forever storage/i, /testimonial/i, /★/, /\b[1-5](\.\d)?\s*\/\s*5\b/,
  /\brated\s+[1-5]/i, /customers? (say|love)/i, /\bthe best\b/i, /\b#1\b/, /better than (google flow|dreamina|capcut|creatify|arcads)/i, /\bbeats\b/i, /guarantee(d|s)? (results|sales|roas)/i]

const kineoFacts = await moduleAt('lib/kineoFacts.ts')
const canon = offlineModules()('lib/freeTierOffer.ts')
const read = (p, rep) => (rep[p] ?? source(p)).replace(/\r\n/g, '\n')
const codeOnly = (text) => text.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/ .*$/gm, '')

function loader(rep) {
  const base = offlineModules({ replacements: rep, mocks: { 'lib/kineoFacts.ts': kineoFacts, 'components/OrganicCtaLink.tsx': { __esModule: true, default: ({ children, source: s, placement, ...props }) => React.createElement('a', { ...props, 'data-source': s }, children) } } })
  const buy = base('lib/growth/buyCreatorOffer.ts')
  const cta = ({ page }) => React.createElement('a', { href: buy.buyCreatorHref(page), 'data-buy': 'creator' }, `${buy.buyCreatorCopy('en').button} · ${buy.buyCreatorCopy('en').priceLine}`)
  const load = offlineModules({
    replacements: rep,
    mocks: {
      'lib/kineoFacts.ts': kineoFacts,
      'components/OrganicCtaLink.tsx': base('components/OrganicCtaLink.tsx'),
      'components/BuyCreatorCta.tsx': { __esModule: true, default: cta },
    },
  })
  return { load, buy }
}

const ldOf = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
const faqOk = (h, faqs) => {
  const faq = ldOf(h).find((x) => x['@type'] === 'FAQPage')
  if (!faq || faq.mainEntity.length !== faqs.length) return false
  return faq.mainEntity.every((q, i) => q.name === faqs[i].question && q.acceptedAnswer.text === faqs[i].answer
    && h.includes(`<summary>${escapeHtml(q.name)}</summary>`) && h.includes(escapeHtml(q.acceptedAnswer.text)))
}
/** Frases que falam do apresentador de IA DA KINEO sem dizer "labeled as AI" na mesma frase. */
const unlabeledPresenter = (text) => text.replace(/\s+/g, ' ').split(/(?<=[.;])\s/).filter((x) => /AI presenter/i.test(x) && !/labeled as AI/i.test(x))
const titleOf = (meta) => (typeof meta.title === 'string' ? meta.title : meta.title?.absolute) ?? ''

async function run(rep = {}) {
  const fails = []
  const fail = (rule, msg) => fails.push(`${rule} ${msg}`)
  const { load, buy } = loader(rep)
  let facts
  try { facts = load(FACTS) } catch (e) { fail('R4', `módulo de fatos: ${e.message}`); return fails }
  const day = facts.VS_NOVOS_REVIEWED_ISO
  if (day !== '2026-10-15') fail('R4', `data da leitura ${day}`)

  // ── R1 · Shorts ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const answersMod = load(ANSWERS)
  const answers = { ...answersMod.VS_NOVOS_ANSWERS, capcut: answersMod.VS_ALTERNATIVE_ANSWERS.capcut }
  const html = {}
  const citation = load('lib/growth/citationAnswers.ts')
  for (const [id, file] of Object.entries(SHORTS)) {
    let mod
    try { mod = load(file) } catch (e) { fail('R1', `${id}: página não carrega (${e.message})`); continue }
    const a = answers[id]
    if (!a) { fail('R1', `${id}: sem resposta`); continue }
    if (mod.dynamic !== 'force-static') fail('R1', `${id}: não é force-static`)
    const h = renderToStaticMarkup(React.createElement(mod.default))
    html[id] = h
    const t = titleOf(mod.metadata)
    if (!t || t.length > 60) fail('R1', `${id}: título ${t.length} > 60 ("${t}")`)
    const d = mod.metadata.description ?? ''
    if (!d || d.length > 155) fail('R1', `${id}: descrição ${d.length} > 155`)
    if (mod.metadata.alternates?.canonical !== `${BASE}${a.path}`) fail('R1', `${id}: canonical`)
    if (!h.includes(`<h1>${escapeHtml(a.question)}</h1>`)) fail('R1', `${id}: H1 não é a pergunta`)
    if (!h.includes(`Reviewed ${day}`)) fail('R1', `${id}: "Reviewed" não é a data da leitura (${day})`) // CapCut incluída (CEO 15/10)
    const direct = h.match(/<div class="kc-direct">([\s\S]*?)<\/div>/)?.[1] ?? ''
    if (a.answer.length !== 3 || (direct.match(/<p>/g) ?? []).length !== 3) fail('R1', `${id}: resumo citável não tem 3 linhas`)
    const name = id === 'capcut' ? 'CapCut' : facts.VS_NOVOS_COMPETITORS[id].name
    if (!h.includes(`<h2>When to pick ${escapeHtml(name)} instead</h2>`)) fail('R1', `${id}: sem "When to pick ${name} instead"`)
    if (!faqOk(h, a.faqs)) fail('R1', `${id}: FAQ ≠ FAQPage JSON-LD`)
    const cells = id === 'capcut' ? Object.values(facts.VS_NOVOS_CAPCUT_EXTRA) : ['start', 'output', 'price', 'free'].map((k) => facts.VS_NOVOS_COMPETITORS[id][k])
    for (const f of cells) {
      const cell = `<td>${escapeHtml(f.text)}<span class="kc-source"><br/><a href="${escapeHtml(f.url)}" rel="nofollow noopener noreferrer">${escapeHtml(f.label)}</a> (${f.checkedOn})</span></td>`
      if (!h.includes(cell)) fail('R1', `${id}: fato sem texto/fonte/data na mesma célula: ${f.text.slice(0, 40)}`)
    }
    if (!h.includes('href="/ads/for/online-stores"')) fail('R1', `${id}: sem link para /ads/for/online-stores`)
    if (!/href="\/ai-video-generator\/[a-z0-9-]+"/.test(h)) fail('R1', `${id}: sem link para página de motor`)
    for (const bad of unlabeledPresenter(h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' '))) fail('R1', `${id}: apresentador de IA sem rótulo: "${bad.slice(0, 70)}"`)
  }

  // ── R2 · Ads ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  const adsLib = load(ADS_LIB)
  const adsOffer = load('lib/growth/adsSegmentPresentation.ts').adsSegmentOffer()
  for (const [id, file] of Object.entries(ADS)) {
    let mod
    try { mod = load(file) } catch (e) { fail('R2', `${id}: página não carrega (${e.message})`); continue }
    const h = renderToStaticMarkup(React.createElement(mod.default))
    html[id] = h
    const entry = adsLib.ADS_COMPARISON_PAGES.find((c) => c.id === id)
    const e = entry && adsLib.adsComparisonEnrichment(entry)
    if (!e) { fail('R2', `${id}: sem enriquecimento`); continue }
    const t = titleOf(mod.metadata)
    if (!t || t.length > 60) fail('R2', `${id}: título ${t.length} > 60`)
    if ((mod.metadata.description ?? '').length > 155) fail('R2', `${id}: descrição > 155`)
    if (mod.metadata.alternates?.canonical !== `${BASE}/vs/${id}-alternative`) fail('R2', `${id}: canonical`)
    try {
      const png = readFileSync(resolve(root, `public/og/vs-${id}.png`))
      if (png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) fail('R2', `${id}: OG fora de 1200×630`)
    } catch { fail('R2', `${id}: OG ausente`) }
    const sum = h.match(/data-ads-vs-summary="[a-z]+">[\s\S]*?<ol[^>]*>([\s\S]*?)<\/ol>/)?.[1] ?? ''
    if ((sum.match(/<li>/g) ?? []).length !== 3) fail('R2', `${id}: resumo citável não tem 3 linhas`)
    if (!h.includes(`When to pick ${escapeHtml(e.name)} instead</h2>`)) fail('R2', `${id}: sem "When to pick ${e.name} instead"`)
    if (!faqOk(h, e.faqs)) fail('R2', `${id}: FAQ ≠ FAQPage JSON-LD`)
    for (const row of e.facts) {
      const f = row.them
      const want = `<td>${escapeHtml(f.text)}<span class="source"><br/><a href="${escapeHtml(f.url)}" rel="nofollow noopener noreferrer">${escapeHtml(f.label)}</a> (${f.checkedOn})</span></td>`
      // a classe do CSS module vira o próprio nome no loader offline; aceita qualquer nome de classe na mesma posição
      const re = new RegExp(want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('class="source"', 'class="[^"]*"'))
      if (!re.test(h)) fail('R2', `${id}.${row.id}: fato sem texto/fonte/data na mesma célula`)
      if (f.checkedOn !== day) fail('R2', `${id}.${row.id}: data ${f.checkedOn}`)
    }
    if (!h.includes('href="/ads/for/online-stores"')) fail('R2', `${id}: sem link para /ads/for/online-stores`)
    if (!/href="\/ai-video-generator\/[a-z0-9-]+"/.test(h)) fail('R2', `${id}: sem link para página de motor`)
    const text = h.replace(/<[^>]+>/g, ' ')
    for (const bad of unlabeledPresenter(text)) fail('R2', `${id}: pessoa de IA da Kineo sem rótulo: "${bad.slice(0, 70)}"`)
    // CEO 15/10: nenhum preço velho do concorrente (fotografia de 25-26/09) ao lado da leitura nova, e a coluna da Kineo descreve o
    // anúncio de hoje (v2), nunca o "N credits per 35-second ad" nem o "35 / 60-second ad" do clássico.
    const snap = adsLib.ADS_COMPARISONS.find((c) => c.id === id)
    if (snap && text.includes(snap.price)) fail('R2', `${id}: preço da fotografia de 25-26/09 (${snap.price}) ainda na página`)
    if (text.includes(`${adsOffer.credits} credits per ${adsOffer.seconds}-second ad`) || text.includes(`${adsOffer.durations}-second ad`)) fail('R2', `${id}: texto velho do anúncio clássico na coluna da Kineo`)
    if (!text.includes(`about ${adsOffer.v2Seconds} seconds`)) fail('R2', `${id}: o anúncio de hoje (~${adsOffer.v2Seconds} s) não aparece`)
    if (id === 'arcads' && !/Not published/.test(text)) fail('R2', 'arcads: preço não publicado deixou de dizer "Not published"')
    if (id === 'arcads' && /\$\s?110/.test(text)) fail('R2', 'arcads: número de terceiros na página')
  }

  // ── R3 · nenhum preço nosso digitado ─────────────────────────────────────────────────────────────────────────────────
  const priceLiteral = /(\$\s?\d|USD\s?\d|\d+(\.\d+)?\s?(\/mo\b|\/month|per month|a month)|\b\d+\s?credits\b)/i
  const novosAnswers = read(ANSWERS, rep).split('KINEO-VS-NOVOS-1610 — Google Flow e Dreamina (15/10/2026)')[1] ?? ''
  const adsNovos = read(ADS_LIB, rep).split('// ─── KINEO-VS-NOVOS-1610')[1] ?? ''
  for (const [label, text] of [[`${ANSWERS} (seção 1610)`, novosAnswers], [`${ADS_LIB} (seção 1610)`, adsNovos], [VS_COMPONENT, read(VS_COMPONENT, rep)], [ADS_COMPONENT, read(ADS_COMPONENT, rep)], ...Object.values({ ...SHORTS, ...ADS }).map((f) => [f, read(f, rep)])]) {
    const m = codeOnly(text).match(priceLiteral)
    if (m) fail('R3', `${label}: preço digitado "${m[0]}"`)
  }
  if (!novosAnswers || !adsNovos) fail('R3', 'âncora da seção 1610 sumiu')
  const factsSrc = read(FACTS, rep)
  if (/^import /m.test(factsSrc)) fail('R3', `${FACTS}: deixou de ser puro (tem import)`)
  if (/Kineo[^.\n]{0,60}(\$|USD)\s?\d/.test(factsSrc)) fail('R3', `${FACTS}: preço da Kineo digitado`)
  const prices = load('lib/checkoutPricing.ts')
  const starterUsd = prices.formatCheckoutMoney('usd', prices.getTierPrice('starter', 'usd', 'standard'))
  const creatorLine = buy.buyCreatorCopy('en').priceLine
  const offer = load('lib/growth/adsSegmentPresentation.ts').adsSegmentOffer()
  for (const id of Object.keys(SHORTS)) {
    const h = html[id]; if (!h) continue
    if (!h.includes(escapeHtml(creatorLine))) fail('R3', `${id}: preço do Creator não é o da fonte única`)
    if (!h.includes(escapeHtml(citation.CITATION_PLANS[0].price))) fail('R3', `${id}: Starter não é o da fonte única`)
  }
  for (const id of Object.keys(ADS)) {
    const h = html[id]; if (!h) continue
    if (!h.includes(escapeHtml(starterUsd)) || !h.includes(escapeHtml(offer.v2Levels))) fail('R3', `${id}: preço/créditos do Studio Ads não vêm das fontes únicas`)
  }

  // ── R4 · todo fato externo com fonte e data ──────────────────────────────────────────────────────────────────────────
  const lines = factsSrc.split('\n')
  const factLines = lines.map((l, i) => ({ l, i })).filter(({ l }) => /^\s+[a-zA-Z]+: \{ text: /.test(l))
  if (factLines.length !== 2 * 4 + 2 + 2 * 5) fail('R4', `esperava 20 fatos, achei ${factLines.length}`)
  for (const { l, i } of factLines) {
    const url = l.match(/url: '([^']+)'/)?.[1]
    const checked = l.match(/checkedOn: '([^']+)'/)?.[1]
    const c = (lines[i - 1] ?? '').match(/^\s+\/\/ fonte: (https:\/\/\S+) \(lido em (\d{4}-\d{2}-\d{2})\)$/)
    if (!c) { fail('R4', `fato sem comentário de fonte: ${l.trim().slice(0, 60)}`); continue }
    if (c[1] !== url) fail('R4', `fonte do comentário ≠ url do fato (${c[1]} vs ${url})`)
    if (c[2] !== checked || checked !== day) fail('R4', `data da fonte ≠ data do fato (${c[2]} vs ${checked})`)
  }
  const allFacts = [...Object.values(facts.VS_NOVOS_COMPETITORS).flatMap((c) => [c.start, c.output, c.price, c.free]), ...Object.values(facts.VS_NOVOS_CAPCUT_EXTRA), ...Object.values(facts.ADS_NOVOS_FACTS).flatMap((c) => [c.actors, c.input, c.price, c.free, c.extra])]
  const numbers = new Set(allFacts.flatMap((f) => f.text.match(/\d[\d,.]*\d|\d/g) ?? []).filter((n) => n.length >= 2 && !/^\d\.\d$/.test(n))) // versões de modelo (2.5, 3.1) não são números do concorrente
  for (const [label, text] of [[`${ANSWERS} (seção 1610)`, novosAnswers], [`${ADS_LIB} (seção 1610)`, adsNovos], [VS_COMPONENT, read(VS_COMPONENT, rep)], [ADS_COMPONENT, read(ADS_COMPONENT, rep)]]) {
    const code = codeOnly(text)
    for (const n of numbers) if (new RegExp(`(^|[^\\w.,])${n.replace(/[.,]/g, '\\$&')}([^\\w]|$)`).test(code.replace(/\b(u003c|1610|2026|1310)\b/g, ''))) fail('R4', `${label}: número de concorrente "${n}" digitado fora do módulo de fatos`)
  }

  // ── R5 · sitemap e /llms.txt ─────────────────────────────────────────────────────────────────────────────────────────
  try {
    const altSrc = source('app/alternatives/[competitor]/page.tsx')
    const altSlugs = [...altSrc.slice(altSrc.indexOf('export const COMPETITORS'), altSrc.indexOf('export const COMPETITOR_SLUGS')).matchAll(/^ {2}'?([a-z0-9-]+)'?: \{$/gm)].map((m) => m[1])
    const sm = offlineModules({
      replacements: rep,
      mocks: {
        'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: [] },
        'app/alternatives/[competitor]/page.tsx': { COMPETITOR_SLUGS: altSlugs },
        'lib/publicExamples.ts': { PUBLIC_EXAMPLES: [] },
        'lib/comparisons.ts': { CANONICAL_SLUGS: [] },
        'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
        'lib/publicSurfacePolicy.ts': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false },
        'lib/seo/intentPages.ts': { INTENT_HUB_PATH: '/ai-video-generator/for', INTENT_SLUGS: [], intentPagePath: (x) => x },
        'lib/growth/citationAnswers.ts': { CITATION_ANSWER_LINKS: citation.CITATION_ANSWER_LINKS, CITATION_REVIEW_DATE: citation.CITATION_REVIEW_DATE },
        'lib/seo/freeShortsGeneratorLangs.ts': { FREE_SHORTS_LANGS: [] },
        'lib/kineoFacts.ts': kineoFacts,
      },
    })(SITEMAP).default()
    const want = [...facts.VS_NOVOS_LINKS.map((l) => l.path), '/vs/arcads-alternative', ...facts.VS_NOVOS_ENRICHED_PATHS]
    for (const path of want) {
      const hits = sm.filter((x) => x.url === `${BASE}${path}`)
      if (hits.length !== 1) fail('R5', `sitemap: ${path} aparece ${hits.length}×`)
      else if (new Date(hits[0].lastModified).toISOString().slice(0, 10) !== day) fail('R5', `sitemap ${path} com lastmod ${hits[0].lastModified}`)
    }
    if (sm.filter((x) => x.url === `${BASE}/vs/creatify-alternative`).length !== 1) fail('R5', 'sitemap: creatify sumiu ou duplicou')
  } catch (e) { fail('R5', `sitemap não executa: ${e.message}`) }
  try {
    const transform = (rel, raw) => (rep[rel] ?? raw).replace(/\r\n/g, '\n')
    const ll = createOfflineLoader({ env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true' }, globals: { Response }, source: transform })
    const body = ll(LLMS).GET()
    const t = typeof body === 'string' ? body : await body.text()
    for (const id of facts.VS_NOVOS_IDS) if (!t.includes(`- [${facts.VS_NOVOS_PAGES[id].label}](${BASE}${facts.VS_NOVOS_PAGES[id].path}): `)) fail('R5', `/llms.txt sem ${id}`)
    const adsOn = t.includes('Business video ads you make yourself') // a seção do Studio Ads só existe com o interruptor ligado
    for (const p of Object.values(facts.ADS_NOVOS_PATHS)) if (t.includes(`${BASE}${p})`) !== adsOn) fail('R5', `/llms.txt: ${p} ${adsOn ? 'ausente com o Studio Ads ligado' : 'presente com o Studio Ads desligado'}`)
    if (facts.vsNovosLlmsLines(BASE, false).includes('Studio Ads')) fail('R5', 'linhas sem Ads ainda citam Studio Ads')
  } catch (e) { fail('R5', `/llms.txt não executa: ${e.message}`) }

  // ── R6 · nada de vencedor universal nem promessa proibida ────────────────────────────────────────────────────────────
  for (const [id, h] of Object.entries(html)) {
    const text = h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')
    for (const re of BANNED) if (re.test(text)) fail('R6', `${id}: promessa/vencedor proibido ${re}`)
  }
  for (const [label, text] of [[FACTS, factsSrc], [`${ANSWERS} (seção 1610)`, novosAnswers], [`${ADS_LIB} (seção 1610)`, adsNovos]]) {
    for (const re of BANNED) if (re.test(codeOnly(text))) fail('R6', `${label}: promessa proibida ${re}`)
  }
  return fails
}

const results = []
let ok = true, count = 0
const real = await run()
results.push(`${real.length ? 'FAIL' : 'PASS'} mundo real${real.length ? '\n   ' + real.join('\n   ') : ''}`)
if (real.length) ok = false; else count++

const sub = (file, from, to) => {
  const raw = source(file).replace(/\r\n/g, '\n')
  if (!raw.includes(from)) throw new Error(`mutante não aplica em ${file}: ${from.slice(0, 70)}`)
  const out = raw.split(from).join(to)
  assert.notEqual(out, raw)
  return { [file]: out }
}
const MUTANTS = [
  ['M1 fato sem comentário de fonte', 'R4', () => sub(FACTS, "    // fonte: https://www.arcads.ai/ (lido em 2026-10-15)\n    extra:", '    extra:')],
  ['M2 fonte do comentário ≠ url', 'R4', () => sub(FACTS, "    // fonte: https://creatify.ai/pricing (lido em 2026-10-15)\n    price:", "    // fonte: https://creatify.ai/ (lido em 2026-10-15)\n    price:")],
  ['M3 data do fato ≠ data da leitura', 'R4', () => sub(FACTS, "free: { text: 'Without a subscription: 50 Flow credits a day to try it; unused daily credits do not roll over.', label: 'Flow credits help page', url: 'https://support.google.com/flow/answer/16526234?hl=en', checkedOn: '2026-10-15' }", "free: { text: 'Without a subscription: 50 Flow credits a day to try it; unused daily credits do not roll over.', label: 'Flow credits help page', url: 'https://support.google.com/flow/answer/16526234?hl=en', checkedOn: '2026-10-01' }")],
  ['M4 preço da Kineo digitado no Ads', 'R3', () => sub(ADS_LIB, 'Studio Ads is included in any paid plan from ${offer.starterPrice} USD/month;', 'Studio Ads is included in any paid plan from $9.90/month;')],
  ['M5 número do concorrente digitado na resposta', 'R4', () => sub(ANSWERS, '`Google Flow access: ${flow.free.text}', '`Google Flow access: Without a subscription: 50 Flow credits a day.')],
  ['M6 FAQ do Ads sem JSON-LD', 'R2', () => sub(ADS_COMPONENT, "{faqSchema ? <script type=\"application/ld+json\"", "{false ? <script type=\"application/ld+json\"")],
  ['M7 título acima de 60', 'R1', () => sub(FACTS, "label: 'Google Flow alternatives for finished Shorts' }", "label: 'Google Flow alternatives for a finished narrated vertical Short' }")],
  ['M8 descrição acima de 155', 'R1', () => sub(ANSWERS, "Dated sources, honest limits, free first film.',", "Dated sources, honest limits, free first film, and a long tail that pushes this description well past the limit.',")],
  ['M9 Arcads fora do sitemap', 'R5', () => sub(SITEMAP, '...ADS_COMPARISONS_1610.map(({ slug }) => adsComparisonPath(slug))', '...ADS_COMPARISONS_1610.slice(1).map(({ slug }) => adsComparisonPath(slug))')],
  ['M10 Flow fora do /llms.txt', 'R5', () => sub(FACTS, 'const shorts = VS_NOVOS_IDS.map(', 'const shorts = VS_NOVOS_IDS.slice(1).map(')],
  ['M11 fonte some da célula do Ads', 'R2', () => sub(ADS_COMPONENT, '<a href={row.them.url} rel="nofollow noopener noreferrer">{row.them.label}</a>', '<a href="https://example.com" rel="nofollow noopener noreferrer">{row.them.label}</a>')],
  ['M12 "when to pick" some da Flow', 'R1', () => sub(ANSWERS, "heading: 'When to pick Google Flow instead',", "heading: 'Why Kineo wins',")],
  ['M13 vencedor universal na FAQ do Ads', 'R6', () => sub(ADS_LIB, "alternative?`, answer: `For a different job.", "alternative?`, answer: `Yes, and the best one.")],
  ['M14 resumo com 2 linhas', 'R1', () => sub(ANSWERS, "      `Pick Flow for shot-by-shot control", "      // `Pick Flow for shot-by-shot control")],
  ['M16 preço velho ($39) do Creatify de volta', 'R2', () => sub(ADS_LIB, "        ? `${ADS_NOVOS_FACTS[c.id as AdsNovoId].price.text} (official page, read ${VS_NOVOS_REVIEWED_ISO}); check billing terms on the official page.`", "        ? `${c.price} — as recorded in the official-source snapshot.`")],
  ['M17 "N credits per 35-second ad" de volta', 'R2', () => sub(ADS_LIB, 'A ${offer.v2Seconds}-second ad uses ${offer.v2Levels} credits, depending on the level.`, competitor: c.accessedOn', '${offer.credits} credits per ${offer.seconds}-second ad.`, competitor: c.accessedOn')],
  ['M18 CapCut volta para 13/10', 'R1', () => sub(SHORTS.capcut, 'reviewDate={VS_NOVOS_REVIEWED_ISO}', "reviewDate={'2026-10-13'}")],
  ['M19 CapCut com lastmod velho no sitemap', 'R5', () => sub(SITEMAP, 'lastModified: VS_NOVOS_ENRICHED_PATHS.includes(path) ? VS_NOVOS_REVIEWED_ISO : VS_ALT_REVIEWED_ISO,', 'lastModified: VS_ALT_REVIEWED_ISO,')],
  ['M15 pessoa de IA sem rótulo no Ads', 'R2', () => sub(ADS_LIB, "Any AI presenter is optional and always labeled as AI.`", "Any AI presenter is optional.`")],
]
for (const [name, rule, make] of MUTANTS) {
  let rep
  try { rep = make() } catch (e) { results.push(`FAIL ${name}: ${e.message}`); ok = false; continue }
  let fails
  try { fails = await run(rep) } catch (e) { fails = [`${rule} quebrou: ${e.message}`] }
  const red = fails.some((f) => f.startsWith(rule + ' '))
  results.push(`${red ? 'PASS' : 'FAIL'} mutante ${name} → ${red ? `vermelho em ${rule}` : `NÃO ficou vermelho em ${rule} (${fails.join(' | ') || 'verde'})`}`)
  if (red) count++; else ok = false
}

console.log(results.join('\n'))
if (!ok) { console.log(`FAIL vs-novos-1610 (${count} ok)`); process.exit(1) }
console.log(`PASS vs-novos-1610: mundo real + ${MUTANTS.length} mutantes vermelhos; root ${root}`)
