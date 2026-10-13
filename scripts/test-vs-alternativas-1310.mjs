// KINEO-VS-ALTERNATIVAS-1310 — guardião das 4 páginas /vs "alternativa a X" (Pictory, Synthesia, CapCut, OpusClip).
// Offline: executa os módulos REAIS (páginas, sitemap, /llms.txt) sem rede, banco, Stripe nem navegador.
//
// Regras (cada uma com mutante que TEM de ficar vermelho, e prova de que o mutante foi aplicado):
//   R1 cada página existe, é estática, renderiza no molde da página do InVideo (H1 = pergunta, canonical, OG, FAQPage
//      JSON-LD com toda FAQ visível) e mostra a tabela do concorrente com cada fato + link da fonte + data;
//   R2 cada página está no sitemap (com a data da leitura) e no /llms.txt; e na lista de guias do hub;
//   R3 nenhum preço digitado: nem da Kineo nem do concorrente fora do módulo de fatos; a página mostra o Starter/Creator
//      das fontes únicas e o WELCOME20 só com o interruptor ligado;
//   R4 nenhuma promessa proibida (copy que mente) e nenhum depoimento/nota inventado;
//   R5 todo fato de concorrente tem o comentário `// fonte: <URL> (lido em <data>)` com a MESMA URL e data do campo;
//   R6 o botão grátis "Make your first film free" usa o MESMO destino/campanha da página do InVideo (citacoes_01_<id>).
import assert from 'node:assert/strict'
import { React, root, source, offlineModules, renderToStaticMarkup, escapeHtml } from './gpt24h-offline-support.mjs'
import { moduleAt } from './gpt-5h-test-support.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

process.env.KINEO_REVERSE_TRIAL_ENABLED = 'true'
globalThis.fetch = () => { throw Error('Network forbidden in vs alternatives test') }

const BASE = 'https://www.usekineo.com'
const FACTS_FILE = 'lib/seo/vsAlternatives1310.ts'
const ANSWERS_FILE = 'lib/growth/vsAlternativeAnswers.ts'
const COMPONENT_FILE = 'components/VsAlternativeComparison.tsx'
const SITEMAP_FILE = 'app/sitemap.ts'
const LLMS_FILE = 'app/llms.txt/route.ts'
const LINKS_FILE = 'components/CitationAnswerLinks.tsx'
const INVIDEO_PAGE = 'app/vs/invideo-alternatives-faceless-shorts/page.tsx'
const BANNED = [/unlimited/i, /priority queue/i, /1080p/i, /premium voices?/i, /12 characters/i, /forever storage/i, /stored forever/i,
  /testimonial/i, /★/, /\b[1-5](\.\d)?\s*\/\s*5\b/, /\brated\s+[1-5]/i, /customers? (say|love)/i]

const kineoFacts = await moduleAt('lib/kineoFacts.ts')
const canon = offlineModules()('lib/freeTierOffer.ts')
const promo = offlineModules()('lib/growth/publicPromoTruth.ts')
const read = (p, rep) => (rep[p] ?? source(p)).replace(/\r\n/g, '\n')

/** Um mundo: os módulos reais, com a fonte de um mutante quando houver. */
function world({ rep = {}, cardEntry = false, welcomeLive = true } = {}) {
  const offer = canon.buildFreeTierOffer(true)
  const freeTier = cardEntry
    ? { ...canon, getFreeTierOffer: () => ({ ...offer, cardEntry: true, copy: { ...offer.copy, ctaPrimary: 'Start your trial fixture →' } }) }
    : { ...canon, getFreeTierOffer: () => offer }
  const load = offlineModules({
    replacements: rep,
    mocks: {
      'lib/kineoFacts.ts': kineoFacts,
      'lib/freeTierOffer.ts': freeTier,
      'lib/growth/publicPromoTruth.ts': { ...promo, WELCOME20_SITE_OFFER_LIVE: welcomeLive },
      'components/OrganicCtaLink.tsx': { __esModule: true, default: ({ children, source: src, placement, ...props }) => React.createElement('a', { ...props, 'data-source': src, 'data-placement': placement }, children) },
    },
  })
  // O botão de compra é 'use client' (telemetria do checkout); aqui ele renderiza o MESMO texto e link do módulo real.
  const buy = load('lib/growth/buyCreatorOffer.ts')
  const cta = ({ page }) => React.createElement('a', { href: buy.buyCreatorHref(page), 'data-buy': 'creator' }, `${buy.buyCreatorCopy('en').button} · ${buy.buyCreatorCopy('en').priceLine}`)
  return { load, buy, freeTier, rep, cta }
}
function loadWith(w) {
  return offlineModules({
    replacements: w.rep,
    mocks: {
      'lib/kineoFacts.ts': kineoFacts,
      'lib/freeTierOffer.ts': w.freeTier,
      'lib/growth/publicPromoTruth.ts': w.load('lib/growth/publicPromoTruth.ts'),
      'components/OrganicCtaLink.tsx': w.load('components/OrganicCtaLink.tsx'),
      'components/BuyCreatorCta.tsx': { __esModule: true, default: w.cta },
    },
  })
}

function run(opts = {}) {
  const fails = []
  const fail = (rule, msg) => fails.push(`${rule} ${msg}`)
  const w = world(opts)
  const load = loadWith(w)
  const facts = load(FACTS_FILE)
  const citation = load('lib/growth/citationAnswers.ts')
  let answers
  try { answers = load(ANSWERS_FILE).VS_ALTERNATIVE_ANSWERS } catch (e) { fail('R1', `answers module: ${e.message}`); return fails }
  const ids = facts.VS_ALTERNATIVE_IDS
  if (JSON.stringify([...ids].sort()) !== JSON.stringify(['capcut', 'opusclip', 'pictory', 'synthesia'])) fail('R1', `ids ${ids}`)

  // ── R1 · páginas ────────────────────────────────────────────────────────────────────────────────────────────────
  const html = {}
  for (const id of ids) {
    const answer = answers[id]
    const page = facts.VS_ALTERNATIVE_PAGES[id]
    const file = `app${page.path}/page.tsx`
    if (!/^\/vs\/[a-z-]+-alternatives-[a-z-]+$/.test(page.path)) fail('R1', `${id}: slug fora do padrão ${page.path}`)
    let mod
    try { mod = load(file) } catch (e) { fail('R1', `${id}: página não carrega (${e.message})`); continue }
    if (mod.dynamic !== 'force-static') fail('R1', `${id}: não é force-static`)
    if (answer.path !== page.path || answer.id !== id) fail('R1', `${id}: answer.path/id ≠ página`)
    const h = renderToStaticMarkup(React.createElement(mod.default))
    html[id] = h
    if (!h.includes(`<h1>${escapeHtml(answer.question)}</h1>`)) fail('R1', `${id}: H1 não é a pergunta`)
    if (mod.metadata?.alternates?.canonical !== `${BASE}${page.path}`) fail('R1', `${id}: canonical`)
    if (mod.metadata?.openGraph?.url !== `${BASE}${page.path}` || !mod.metadata?.openGraph?.title) fail('R1', `${id}: OG`)
    if (!h.includes('class="kc-answer"') || !h.includes('data-kineo="vs-alternative-comparison"')) fail('R1', `${id}: fora do molde da página do InVideo`)
    const ld = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    const faq = ld ? JSON.parse(ld[1]) : null
    if (faq?.['@type'] !== 'FAQPage' || faq.mainEntity.length !== answer.faqs.length) fail('R1', `${id}: FAQPage JSON-LD`)
    else if (!faq.mainEntity.every((q) => h.includes(escapeHtml(q.name)) && h.includes(escapeHtml(q.acceptedAnswer.text)))) fail('R1', `${id}: FAQ marcada e invisível`)
    const c = facts.VS_COMPETITORS[id]
    for (const k of ['start', 'output', 'price', 'free']) {
      const f = c[k]
      // a célula inteira: o fato, o link DA SUA fonte e a data, juntos (outra linha com a mesma URL não salva esta)
      const cell = `<td>${escapeHtml(f.text)}<span class="kc-source"><br/><a href="${escapeHtml(f.url)}" rel="nofollow noopener noreferrer">${escapeHtml(f.label)}</a> (${f.checkedOn})</span></td>`
      if (!h.includes(cell)) fail('R1', `${id}.${k}: fato sem texto/fonte/data na mesma célula`)
    }
    if (!h.includes(`Reviewed ${facts.VS_ALT_REVIEWED_ISO}`)) fail('R1', `${id}: data de revisão`)
  }

  // ── R2 · sitemap, /llms.txt e lista de guias ────────────────────────────────────────────────────────────────────
  try {
    const altSrc = source('app/alternatives/[competitor]/page.tsx')
    const altSlugs = [...altSrc.slice(altSrc.indexOf('export const COMPETITORS'), altSrc.indexOf('export const COMPETITOR_SLUGS')).matchAll(/^ {2}'?([a-z0-9-]+)'?: \{$/gm)].map((m) => m[1])
    const sm = offlineModules({
      replacements: w.rep,
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
        'lib/freeTierOffer.ts': w.freeTier,
      },
    })(SITEMAP_FILE).default()
    for (const id of ids) {
      const path = facts.VS_ALTERNATIVE_PAGES[id].path
      const e = sm.find((x) => x.url === `${BASE}${path}`)
      if (!e) fail('R2', `sitemap sem ${path}`)
      else if (new Date(e.lastModified).toISOString().slice(0, 10) !== facts.VS_ALT_REVIEWED_ISO) fail('R2', `sitemap ${path} com lastmod ${e.lastModified}`)
    }
    if (sm.filter((x) => ids.some((id) => x.url === `${BASE}${facts.VS_ALTERNATIVE_PAGES[id].path}`)).length !== ids.length) fail('R2', 'sitemap com página duplicada')
  } catch (e) { fail('R2', `sitemap não executa: ${e.message}`) }
  try {
    const transform = (rel, raw) => (w.rep[rel] ?? raw).replace(/\r\n/g, '\n')
    const ll = createOfflineLoader({ env: { NODE_ENV: 'production', KINEO_REVERSE_TRIAL_ENABLED: 'true' }, globals: { Response }, source: transform })
    const body = ll(LLMS_FILE).GET()
    const text = typeof body.text === 'function' ? null : body
    return Promise.resolve(text ?? body.text()).then((t) => {
      for (const id of ids) {
        const page = facts.VS_ALTERNATIVE_PAGES[id]
        if (!t.includes(`- [${page.label}](${BASE}${page.path}): `)) fail('R2', `/llms.txt sem ${page.path}`)
      }
      return finish()
    })
  } catch (e) { fail('R2', `/llms.txt não executa: ${e.message}`); return finish() }

  function finish() {
    try {
      const hub = renderToStaticMarkup(React.createElement(load(LINKS_FILE).default))
      for (const id of ids) if (!hub.includes(`href="${facts.VS_ALTERNATIVE_PAGES[id].path}"`)) fail('R2', `lista de guias sem ${id}`)
    } catch (e) { fail('R2', `lista de guias: ${e.message}`) }

    // ── R3 · preço nunca digitado ───────────────────────────────────────────────────────────────────────────────────
    const pageFiles = ids.map((id) => `app${facts.VS_ALTERNATIVE_PAGES[id].path}/page.tsx`)
    const priceLiteral = /(\$\s?\d|USD\s?\d|\d+(\.\d+)?\s?(\/mo\b|\/month|per month|a month)|\b\d+\s?credits\b)/i
    for (const file of [ANSWERS_FILE, COMPONENT_FILE, ...pageFiles]) {
      const code = read(file, w.rep).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n')
      const m = code.match(priceLiteral)
      if (m) fail('R3', `${file}: preço digitado "${m[0]}"`)
    }
    // no módulo de fatos: só fatos de concorrente (nenhum preço da Kineo, nenhum import)
    const factsSrc = read(FACTS_FILE, w.rep)
    if (/^import /m.test(factsSrc)) fail('R3', `${FACTS_FILE}: deixou de ser puro (tem import)`)
    if (/Kineo[^.\n]{0,40}(\$|USD)\s?\d/.test(factsSrc)) fail('R3', `${FACTS_FILE}: preço da Kineo digitado`)
    const copy = w.buy.buyCreatorCopy('en')
    const starter = citation.CITATION_PLANS[0]
    for (const id of ids) {
      const h = html[id]
      if (!h) continue
      if (!h.includes(escapeHtml(copy.priceLine))) fail('R3', `${id}: preço do Creator não é o da fonte única (${copy.priceLine})`)
      if (!h.includes(escapeHtml(starter.price))) fail('R3', `${id}: preço do Starter não é o da fonte única`)
      if (!h.includes(escapeHtml(canon.FREE_FILM_LABEL))) fail('R3', `${id}: o filme grátis não vem de FREE_FILM_LABEL`)
      const wantFirst = opts.welcomeLive !== false
      if (/first month/i.test(h) !== wantFirst) fail('R3', `${id}: WELCOME20 ${wantFirst ? 'sumiu com o interruptor ligado' : 'aparece com o interruptor desligado'}`)
    }

    // ── R4 · promessas proibidas ────────────────────────────────────────────────────────────────────────────────────
    for (const id of ids) {
      const text = (html[id] ?? '').replace(/<[^>]+>/g, ' ')
      for (const re of BANNED) if (re.test(text)) fail('R4', `${id}: promessa proibida ${re}`)
    }
    for (const file of [FACTS_FILE, ANSWERS_FILE]) {
      const code = read(file, w.rep).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
      for (const re of BANNED) if (re.test(code)) fail('R4', `${file}: promessa proibida ${re}`)
    }

    // ── R5 · todo fato de concorrente com fonte ─────────────────────────────────────────────────────────────────────
    const lines = factsSrc.split('\n')
    const factLines = lines.map((l, i) => ({ l, i })).filter(({ l }) => /^\s+(start|output|price|free): \{ text: /.test(l))
    if (factLines.length !== ids.length * 4) fail('R5', `esperava ${ids.length * 4} fatos, achei ${factLines.length}`)
    for (const { l, i } of factLines) {
      const url = l.match(/url: '([^']+)'/)?.[1]
      const day = l.match(/checkedOn: '([^']+)'/)?.[1]
      const prev = lines[i - 1] ?? ''
      const c = prev.match(/^\s+\/\/ fonte: (https:\/\/\S+) \(lido em (\d{4}-\d{2}-\d{2})\)$/)
      if (!c) { fail('R5', `fato sem comentário de fonte: ${l.trim().slice(0, 60)}`); continue }
      if (c[1] !== url) fail('R5', `fonte do comentário ≠ url do fato (${c[1]} vs ${url})`)
      if (c[2] !== day || day !== facts.VS_ALT_REVIEWED_ISO) fail('R5', `data da fonte ≠ data do fato (${c[2]} vs ${day})`)
    }
    // o número do concorrente só existe no módulo de fatos
    for (const id of ids) {
      for (const n of facts.VS_COMPETITORS[id].price.text.match(/USD \d+/g) ?? []) {
        for (const file of [ANSWERS_FILE, COMPONENT_FILE]) if (read(file, w.rep).includes(n)) fail('R5', `${file}: "${n}" digitado fora do módulo de fatos`)
      }
    }

    // ── R6 · o botão grátis: mesmo destino e campanha da página do InVideo ─────────────────────────────────────────
    const invideoHref = citation.citationSignupHref(citation.CITATION_ANSWERS.invideo)
    for (const id of ids) {
      const h = html[id]
      if (!h) continue
      const hero = h.match(/<header class="kc-hero">[\s\S]*?<\/header>/)?.[0] ?? ''
      const a = [...hero.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)][0]
      const href = a?.[1].match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&')
      const src = a?.[1].match(/data-source="([^"]+)"/)?.[1]
      const want = invideoHref.split('citacoes_01_invideo').join(`citacoes_01_${id}`)
      const label = opts.cardEntry ? 'Start your trial fixture →' : 'Make your first film free →'
      if (!a || a[2] !== label) fail('R6', `${id}: botão do topo "${a?.[2]}" (esperado "${label}")`)
      if (href !== want) fail('R6', `${id}: destino ${href} ≠ padrão do InVideo ${want}`)
      if (src !== `citacoes_01_${id}`) fail('R6', `${id}: source ${src}`)
      if (!/data-buy="creator"/.test(h)) fail('R6', `${id}: sem o botão do Creator`)
    }
    return fails
  }
}

let count = 0
const results = []
async function expectGreen(name, opts) {
  const fails = await run(opts)
  results.push(`${fails.length ? 'FAIL' : 'PASS'} ${name}${fails.length ? '\n   ' + fails.join('\n   ') : ''}`)
  if (!fails.length) count++
  return fails.length === 0
}

let ok = true
ok = await expectGreen('real, WELCOME20 vivo, trial grátis') && ok
ok = await expectGreen('real, WELCOME20 desligado', { welcomeLive: false }) && ok
ok = await expectGreen('real, entrada paga (cardEntry) troca o rótulo', { cardEntry: true }) && ok

// ── Mutantes: cada um aplicado (provado) e vermelho na regra certa ────────────────────────────────────────────────
const sub = (file, from, to) => {
  const raw = source(file).replace(/\r\n/g, '\n')
  if (!raw.includes(from)) throw new Error(`mutante não aplica em ${file}: ${from.slice(0, 60)}`)
  const out = raw.split(from).join(to)
  assert.notEqual(out, raw)
  return { [file]: out }
}
const MUTANTS = [
  ['M1 fato sem comentário de fonte', 'R5', () => sub(FACTS_FILE, "    // fonte: https://www.capcut.com/pricing (lido em 2026-10-13)\n    free:", '    free:')],
  ['M2 fonte do comentário ≠ url', 'R5', () => sub(FACTS_FILE, "    // fonte: https://www.opus.pro/pricing (lido em 2026-10-13)\n    price:", "    // fonte: https://www.opus.pro/ (lido em 2026-10-13)\n    price:")],
  ['M3 preço do concorrente digitado na resposta', 'R3', () => sub(ANSWERS_FILE, '${VS_COMPETITORS.pictory.price.text}', 'Starter: USD 29/month on monthly billing.')],
  ['M4 preço da Kineo digitado no componente', 'R3', () => sub(COMPONENT_FILE, '${creator.priceLine} (${creatorPlan.credits} credits)', '$19.90/month (140 credits)')],
  ['M5 promessa proibida na FAQ', 'R4', () => sub(ANSWERS_FILE, 'Yes. Paste your narration and choose', 'Yes, with unlimited renders. Paste your narration and choose')],
  ['M6 página fora do sitemap', 'R2', () => sub(SITEMAP_FILE, '...VS_ALTERNATIVE_LINKS.map(({ path }) => ({', '...VS_ALTERNATIVE_LINKS.slice(1).map(({ path }) => ({')],
  ['M7 página fora do /llms.txt', 'R2', () => sub(LLMS_FILE, ' vsAlternativeLlmsLines(BASE)}', " ''}")],
  ['M8 campanha do botão diferente da do InVideo', 'R6', () => sub(COMPONENT_FILE, 'href={citationSignupHref(answer)}', 'href={`/signup?intent_campaign=vs_${answer.id}`}')],
  ['M9 WELCOME20 sem interruptor (preço do 1º mês fixo)', 'R3', () => sub(ANSWERS_FILE, 'const creator = buyCreatorCopy(\'en\')', 'const creator = buyCreatorCopy(\'en\', true)')],
  ['M10 fato some da tabela', 'R1', () => sub(COMPONENT_FILE, "{ label: 'Free option', them: c.free,", "{ label: 'Free option', them: { ...c.free, url: 'https://example.com' },")],
]
for (const [name, rule, make] of MUTANTS) {
  let rep
  try { rep = make() } catch (e) { results.push(`FAIL ${name}: ${e.message}`); ok = false; continue }
  const opts = { rep, ...(name.startsWith('M9') ? { welcomeLive: false } : {}) }
  const fails = await run(opts)
  const red = fails.some((f) => f.startsWith(rule + ' '))
  results.push(`${red ? 'PASS' : 'FAIL'} mutante ${name} → ${red ? `vermelho em ${rule}` : `NÃO ficou vermelho em ${rule} (${fails.join(' | ') || 'verde'})`}`)
  if (red) count++
  else ok = false
}

console.log(results.join('\n'))
if (!ok) { console.log(`FAIL vs-alternativas-1310 (${count} ok)`); process.exit(1) }
console.log(`PASS vs-alternativas-1310: ${count} verificações (3 mundos reais + ${MUTANTS.length} mutantes vermelhos); root ${root}`)
