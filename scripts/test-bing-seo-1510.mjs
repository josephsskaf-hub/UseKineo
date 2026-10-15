// KINEO-BING-SEO-1510 — guardião dos avisos do Bing Webmaster (15/10), das 3 páginas que ganharam resposta direta e do
// IndexNow que passou a disparar a cada mudança de lastmod.
//
// Provas (renderizando as páginas REAIS offline — sem rede, sem banco, sem Next):
//   B1  título ≤ 60 e description entre 120 e 160 RENDERIZADOS (com os números que vêm do código) na home, no faceless,
//       no Seedance e no Veo ([engine]), no /can-you-monetize-ai-videos, no /best-ai-shorts-generators e no
//       /text-to-video-shorts;
//   B2  alt presente e não vazio em toda <img> dos componentes de imagem da home (vitrine, Trending, menu, galeria);
//   B3  FAQ visível = FAQPage JSON-LD nas páginas tocadas (cada pergunta e resposta do JSON-LD está no texto visível, e a
//       pergunta da consulta do Bing está nas duas);
//   B4  fonte + data em cada fato externo (URL https oficial e checkedOn AAAA-MM-DD), e a fonte aparece no HTML;
//   B5  nenhum preço da Kineo digitado: os literais de texto do módulo e dos trechos novos não têm "$9", "35 credits",
//       "/month" com número; os créditos e US$ vêm de creditCostForDuration / TIER_PRICES / TIER_CREDITS;
//   B6  IndexNow dispara: a rota do cron, executada offline com sitemap e banco simulados, ENVIA ao api.indexnow.org as
//       URLs cujo lastmod mudou desde o retrato (com ?confirm=SEND), NÃO envia nem grava sem o token, respeita o teto de
//       24 h, grava o retrato só depois do envio real e deixa fora do retrato o que não coube; o vercel.json agenda com
//       ?confirm=SEND; o sitemap carimba as páginas tocadas com o lastmod da rodada;
//   B7  o desfaz dos guardiões antigos (scripts/test-support/desfaz-bing-seo-1510.mjs) devolve a base byte a byte e lança
//       quando um bloco aparece duas vezes.
// Mutantes (cada um TEM de deixar vermelho; o guardião prova que a troca foi aplicada antes de medir).
// Uso: node scripts/test-bing-seo-1510.mjs
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import vm from 'node:vm'
import { React, root, source, offlineModules, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

const require = createRequire(resolve(root, 'package.json'))
const ts = require('typescript')

const MOD = 'lib/seo/bingSeo1510.ts'
const PATHS_MOD = 'lib/seo/bingSeo1510Paths.ts'
const ALT_MOD = 'lib/ui/posterAlt.ts'
const HOME = 'app/page.tsx'
const FACELESS = 'app/faceless-youtube-shorts-generator/page.tsx'
const ENGINE_PAGE = 'app/ai-video-generator/[engine]/page.tsx'
const MONETIZE = 'app/can-you-monetize-ai-videos/page.tsx'
const ROUNDUP = 'app/best-ai-shorts-generators/page.tsx'
const T2V = 'app/text-to-video-shorts/page.tsx'
const SITEMAP = 'app/sitemap.ts'
const ROUTE = 'app/api/cron/submit-indexnow/route.ts'
const INDEXNOW = 'lib/indexnow.ts'
const IMG_FILES = ['components/TrendingRow.tsx', 'app/examples/ExamplesGallery.tsx', 'components/NavEngineItem.tsx', 'components/home/HomeImageGallery.tsx', 'app/KineoLanding.tsx']
const OFICIAIS = ['support.google.com', 'flowshorts.app', 'autoshorts.ai', 'www.revid.ai']

// ── o mundo de render: fonte real + trocas + fronteiras de UI/banco simuladas ─────────────────────────────────────────
function mundo(rep = {}) {
  const plain = (name) => function Mock({ children }) { return React.createElement('div', { 'data-offline-boundary': name }, children) }
  const ui = ['Footer', 'AgencyVolumeBridge', 'StickyFreeShortCTA', 'WallMedia', 'ScriptToSeedanceBridge', 'BuyCreatorCta', 'PaidSeedanceBridge']
  const mocks = {
    ...Object.fromEntries(ui.map((n) => [`components/${n}.tsx`, { __esModule: true, default: plain(n) }])),
    'components/OrganicCtaLink.tsx': { __esModule: true, default: ({ children, source: _s, placement: _p, analyticsEvent: _a, focusTargetId: _f, ...props }) => React.createElement('a', props, children) },
    'app/youtube-shorts-from-topic/TopicGeneratorForm.tsx': { __esModule: true, default: plain('TopicGeneratorForm') },
    'app/text-to-video-shorts/TextToVideoIntentForm.tsx': { __esModule: true, default: plain('TextToVideoIntentForm') },
    'app/examples/ExampleVideoPlayer.tsx': { __esModule: true, default: plain('ExampleVideoPlayer') },
    'app/can-you-monetize-ai-videos/OriginalityRecipeBuilder.tsx': { __esModule: true, default: plain('OriginalityRecipeBuilder') },
    'lib/engineWall.ts': { getEngineRenders: async () => [], getHouseEngineExamples: () => [] },
    'lib/engineBenchmarkStats.ts': { getEngineBenchmarkStats: async () => ({ rows: [], totalFilms: 0, windowDays: 90, measuredOn: '2026-10-15', measured: false }) },
    'lib/studyStats.ts': { STUDY_REVALIDATE_SECONDS: 86400 },
    // o kineoFacts puxa node:crypto (ads): o fato pós-filme vem da fonte real dele; NOT_A_FIT não muda nada aqui
    'lib/kineoFacts.ts': { ENGINE_FACTS: [], AFTER_THE_FILM_FACT: offlineModules()('lib/growth/afterTheFilmFacts.ts').AFTER_THE_FILM_FACT, NOT_A_FIT: [] },
  }
  return offlineModules({ replacements: rep, mocks })
}

/** O sitemap REAL com as fronteiras que os guardiões da casa já simulam (o mesmo conjunto do test-geo-rodada3). */
function sitemapReal(rep = {}) {
  return offlineModules({
    replacements: rep,
    mocks: {
      'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: [] },
      'app/alternatives/[competitor]/page.tsx': { COMPETITOR_SLUGS: [] },
      'lib/publicExamples.ts': { PUBLIC_EXAMPLES: [] },
      'lib/comparisons.ts': { CANONICAL_SLUGS: [] },
      'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
      'lib/publicSurfacePolicy.ts': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false },
      'lib/seo/intentPages.ts': { INTENT_HUB_PATH: '/ai-video-generator/for', INTENT_SLUGS: [], intentPagePath: (x) => x },
      'lib/growth/citationAnswers.ts': { CITATION_ANSWER_LINKS: [], CITATION_REVIEW_DATE: '2026-09-27' },
      'lib/seo/freeShortsGeneratorLangs.ts': { FREE_SHORTS_LANGS: [] },
    },
  })(SITEMAP).default()
}

const unesc = (s) => s.replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const texto = (html) => unesc(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const norm = (s) => String(s).replace(/\s+/g, ' ').trim()
function faqLd(html) {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const j = JSON.parse(m[1])
    const nodes = Array.isArray(j['@graph']) ? j['@graph'] : [j]
    for (const n of nodes) if (n['@type'] === 'FAQPage') return n.mainEntity.map((x) => ({ q: x.name, a: x.acceptedAnswer.text }))
  }
  return null
}
/** Literais de TEXTO (string, template sem as expressões, JSX) de um trecho, sem comentários. */
function literais(rel, src) {
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const out = []
  const visit = (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text)
    else if (ts.isTemplateExpression(n)) { out.push(n.head.text); for (const sp of n.templateSpans) out.push(sp.literal.text) }
    else if (ts.isJsxText(n)) out.push(n.text)
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}
const PRECO_DIGITADO = /\$\s?\d|\b\d+(?:\.\d+)?\s*(?:credits?|cr)\b|\b\d+\s*\/\s*mo(?:nth)?\b/i
/** Os blocos novos da rodada nas páginas (linhas com o marcador e o JSX logo abaixo dele, até a linha em branco). */
function trechosDaRodada(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const out = []
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('KINEO-BING-SEO-1510')) continue
    const bloco = []
    for (let j = i; j < lines.length && lines[j].trim() !== ''; j++) bloco.push(lines[j])
    out.push(bloco.join('\n'))
  }
  return out.join('\n')
}
/** Toda <img> JSX de um arquivo e o atributo alt dela: null = sem alt; '' = alt vazio; 'expr' = expressão. */
function imgsComAlt(rel, src) {
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const out = []
  const visit = (n) => {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === 'img') {
      const alt = n.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === 'alt')
      let v = null
      if (alt) {
        const init = alt.initializer
        if (!init) v = ''
        else if (ts.isStringLiteral(init)) v = init.text
        else if (ts.isJsxExpression(init) && init.expression && (ts.isStringLiteral(init.expression) || ts.isNoSubstitutionTemplateLiteral(init.expression))) v = init.expression.text
        else v = 'expr'
      }
      out.push({ line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, alt: v })
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}

// ── carregador da ROTA do cron com fronteiras externas simuladas (next/server, supabase-js, fetch) ──────────────────────
function carregarRota(rep, { env, fetchImpl, admin, videos }) {
  const cache = new Map()
  const externos = {
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    '@supabase/supabase-js': { createClient: () => admin },
  }
  const mocks = { 'lib/publicVideos.ts': { listIndexablePublicVideos: async () => videos, PUBLIC_BASE_URL: 'https://www.usekineo.com' } }
  function load(relative) {
    let file = resolve(root, relative)
    if (!/\.(ts|tsx)$/.test(file)) file += readable(file + '.ts') ? '.ts' : '.tsx'
    const key = file.slice(root.length + 1).replace(/\\/g, '/')
    if (Object.hasOwn(mocks, key)) return mocks[key]
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }
    cache.set(file, module)
    const input = rep[key] ?? readFileSync(file, 'utf8')
    const code = ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    const localRequire = (name) => {
      if (Object.hasOwn(externos, name)) return externos[name]
      if (name.startsWith('@/')) return load(name.slice(2))
      if (name.startsWith('.')) return load(resolve(dirname(file), name))
      throw new Error(`rota offline recusa dependência: ${name}`)
    }
    vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, process: { env }, console: { ...console, error: () => {} }, URL, URLSearchParams, Date, Intl, fetch: fetchImpl, AbortController, setTimeout, clearTimeout, Promise, Set, Map, JSON, Number, Math, Object, Array, String }, { filename: key })
    return module.exports
  }
  return load(ROUTE)
}
function readable(f) { try { readFileSync(f); return true } catch { return false } }

/** Banco simulado: só a tabela `events`, com a cadeia que a rota usa (select/eq/gte/order/limit e insert). */
function bancoFalso(rows) {
  const inserts = []
  const from = (table) => {
    if (table !== 'events') throw new Error('tabela inesperada: ' + table)
    const f = { name: null, gte: null }
    const q = {
      select: () => q,
      eq: (col, v) => { if (col === 'name') f.name = v; return q },
      gte: (_col, v) => { f.gte = v; return q },
      order: () => q,
      limit: (n) => {
        const data = rows.filter((r) => r.name === f.name && (!f.gte || r.created_at >= f.gte)).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, n)
        return Promise.resolve({ data, error: null })
      },
      insert: (list) => { inserts.push(...(Array.isArray(list) ? list : [list])); return Promise.resolve({ error: null }) },
    }
    return q
  }
  return { client: { from }, inserts }
}

function sitemapXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset>${entries.map((e) => `<url><loc>${e.url}</loc><lastmod>${new Date(e.lastModified).toISOString()}</lastmod></url>`).join('')}</urlset>`
}

async function rodarCron({ rep = {}, query = '', snapshot = null, sent24h = 0, videos = [], sitemapEntries }) {
  const posts = []
  const fetchImpl = async (url, init) => {
    if (String(url).endsWith('/sitemap.xml')) return { ok: true, status: 200, text: async () => sitemapXml(sitemapEntries) }
    if (String(url).startsWith('https://api.indexnow.org/')) { posts.push(JSON.parse(init.body)); return { status: 200, text: async () => '' } }
    throw new Error('fetch inesperado: ' + url)
  }
  const now = new Date().toISOString()
  const rows = []
  if (snapshot) rows.push({ name: 'indexnow_snapshot', created_at: new Date(Date.now() - 3600e3).toISOString(), metadata: { snapshot } })
  if (sent24h) rows.push({ name: 'indexnow_submitted', created_at: now, metadata: { submitted: sent24h } })
  const db = bancoFalso(rows)
  const env = { CRON_SECRET: 's', NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }
  const route = carregarRota(rep, { env, fetchImpl, admin: db.client, videos })
  const req = { headers: { get: (h) => (h === 'authorization' ? 'Bearer s' : null) }, nextUrl: { searchParams: new URLSearchParams(query) } }
  const res = await route.GET(req)
  return { res, posts, inserts: db.inserts }
}

// ── as provas ──────────────────────────────────────────────────────────────────────────────────────────────────────────
async function verificar(rep = {}) {
  const falhas = []
  const ok = (cond, msg) => { if (!cond) falhas.push(msg) }
  const tentar = async (msg, fn) => { try { await fn() } catch (e) { falhas.push(`${msg}: ${e.message}`) } }
  const src = (p) => rep[p] ?? source(p)
  const L = mundo(rep)
  const M = L(MOD)
  const { creditCostForDuration } = L('lib/credits/engineCost.ts')
  const { TIER_PRICES, TIER_CREDITS } = L('lib/checkoutPricing.ts')
  const titleOk = (t) => typeof t === 'string' && t.length > 0 && t.length <= M.TITLE_MAX
  const descOk = (d) => typeof d === 'string' && d.length >= M.DESCRIPTION_MIN && d.length <= M.DESCRIPTION_MAX
  const tituloDe = (m) => (typeof m.title === 'string' ? m.title : m.title?.absolute)

  // ── B1 — títulos e descriptions RENDERIZADOS
  // a home não roda offline (next/headers + Supabase): a prova é que a metadata dela É a constante medida aqui.
  await tentar('home: metadata', async () => {
    const h = src(HOME)
    ok(/\btitle: HOME_TITLE_1510,/.test(h) && /\bdescription: HOME_DESCRIPTION_1510,/.test(h), 'home: metadata usa HOME_TITLE_1510 e HOME_DESCRIPTION_1510')
    ok(/import \{ HOME_DESCRIPTION_1510, HOME_TITLE_1510 \} from '@\/lib\/seo\/bingSeo1510'/.test(h), 'home: as constantes vêm do módulo da rodada')
    ok(titleOk(M.HOME_TITLE_1510), `home: título ≤ 60 (${M.HOME_TITLE_1510.length})`)
    ok(descOk(M.HOME_DESCRIPTION_1510), `home: description 120–160 (${M.HOME_DESCRIPTION_1510.length})`)
    ok(!/Kineo 1/.test(M.HOME_DESCRIPTION_1510), 'home: description sem o motor aposentado')
  })
  for (const [nome, rel] of [['faceless', FACELESS], ['monetize', MONETIZE], ['roundup', ROUNDUP], ['text-to-video', T2V]]) {
    await tentar(`${nome}: metadata`, async () => {
      const m = L(rel).metadata
      ok(titleOk(tituloDe(m)), `${nome}: título renderizado ≤ 60 (${tituloDe(m)?.length}: ${tituloDe(m)})`)
      ok(descOk(m.description), `${nome}: description renderizada 120–160 (${m.description?.length})`)
    })
  }
  await tentar('[engine]: metadata', async () => {
    const page = L(ENGINE_PAGE)
    const { ENGINES } = L('lib/growth/enginePageCatalog.ts')
    for (const slug of ['seedance', 'veo']) {
      const m = page.generateMetadata({ params: { engine: slug } })
      ok(titleOk(m.title), `${slug}: título ≤ 60 (${m.title.length})`)
      ok(descOk(m.description), `${slug}: description 120–160 (${m.description.length})`)
    }
    const sd = page.generateMetadata({ params: { engine: 'seedance' } }).description
    ok(sd.includes(`${creditCostForDuration('cinematic_ai', true, 60)} credits per 60-second Short`), 'seedance: crédito da description = creditCostForDuration (60 s)')
    ok(sd === ENGINES.seedance.metaDescription, 'seedance: a meta própria do catálogo é a que vai ao ar')
  })
  await tentar('text-to-video: a description responde e segue a oferta nas duas versões', async () => {
    const canonical = offlineModules()('lib/freeTierOffer.ts')
    for (const ligada of [false, true]) {
      const offer = canonical.buildFreeTierOffer(ligada)
      const Lx = offlineModules({ replacements: rep, mocks: { 'lib/freeTierOffer.ts': { ...canonical, getFreeTierOffer: () => offer } } })
      const d = Lx(T2V).metadata.description
      ok(d === Lx(MOD).textToVideoDescription1510(offer.copy.planLimitLine) && d.includes(offer.copy.planLimitLine), `text-to-video (oferta ${ligada ? 'ligada' : 'desligada'}): description da rodada com a linha do teste grátis da oferta`)
      ok(descOk(d), `text-to-video (oferta ${ligada ? 'ligada' : 'desligada'}): description 120–160 (${d.length})`)
      ok(/^It depends on your text/.test(d), 'text-to-video: a description responde a pergunta (depende do texto)')
    }
  })

  // ── B2 — alt
  for (const rel of IMG_FILES) {
    const imgs = imgsComAlt(rel, src(rel))
    ok(imgs.length > 0, `${rel}: tem <img> para conferir`)
    for (const i of imgs) ok(i.alt !== null && i.alt !== '', `${rel}:${i.line}: <img> com alt descritivo (achado: ${i.alt === null ? 'sem alt' : 'alt vazio'})`)
  }
  await tentar('alt: helpers', async () => {
    const A = L(ALT_MOD)
    ok(A.posterAlt1510({ title: 'The island nobody visits' }) === 'Poster frame from the Short “The island nobody visits”', 'alt da capa = título real do Short')
    ok(A.posterAlt1510({ title: '  ' }).length > 10 && A.navThumbAlt1510('Veo 3.1') === 'Veo 3.1 preview frame', 'alt sem título e da miniatura: descritivos')
    const { HOME_GALLERY_IMAGES } = L('components/home/HomeImageGallery.tsx')
    ok(HOME_GALLERY_IMAGES.length > 0 && HOME_GALLERY_IMAGES.every((g) => typeof g.alt === 'string' && g.alt.trim().length >= 12), 'galeria da home: todo alt descritivo')
  })

  // ── B3/B4 — páginas renderizadas: resposta no topo, FAQ visível = JSON-LD, fontes com data
  const render = async (rel, props) => { const P = L(rel); const el = await P.default(props ?? {}); return renderToStaticMarkup(el) }
  const faqConfere = (nome, html, pergunta) => {
    const ld = faqLd(html), vis = texto(html)
    ok(ld && ld.length > 0, `${nome}: FAQPage JSON-LD presente`)
    for (const f of ld ?? []) {
      ok(vis.includes(norm(f.q)), `${nome}: pergunta do JSON-LD visível — ${f.q.slice(0, 60)}`)
      ok(vis.includes(norm(f.a)), `${nome}: resposta do JSON-LD visível — ${f.q.slice(0, 60)}`)
    }
    if (pergunta) ok((ld ?? []).some((f) => f.q === pergunta) && vis.includes(pergunta), `${nome}: a pergunta "${pergunta}" no JSON-LD e na página`)
    return { ld, vis }
  }
  await tentar('monetize: render', async () => {
    const html = await render(MONETIZE)
    const { vis } = faqConfere('monetize', html, 'Does YouTube pay for AI-generated videos?')
    const a = M.monetizationAnswer1510()
    ok(a.summary.length === 3 && a.summary.every((l) => vis.includes(norm(l))), 'monetize: resposta em 3 frases visível')
    const at = html.indexOf('data-kineo="bing-seo-1510-answer"'), h1 = html.indexOf('</h1>')
    ok(at > h1 && h1 > 0 && at - h1 < 200, 'monetize: a resposta vem logo depois do H1')
    ok(/inauthentic content/.test(vis) && /mass-produced/.test(vis), 'monetize: cita a regra "inauthentic content" (produção em massa)')
    ok(/can guarantee monetization/.test(vis) && !/\bwill (?:get|be) monetized\b|guaranteed monetization/i.test(vis), 'monetize: nenhuma promessa de monetização')
    ok(a.does.every((d) => vis.includes(norm(d))) && a.doesNot.every((d) => vis.includes(norm(d))), 'monetize: o que a Kineo faz e o que não faz, visíveis')
    for (const s of a.sources) ok(html.includes(s.url) && vis.includes(`checked ${s.checkedOn}`), `monetize: fonte com data no HTML — ${s.url}`)
  })
  await tentar('roundup: render', async () => {
    const html = await render(ROUNDUP)
    const { vis } = faqConfere('roundup', html, 'How much do FlowShorts, AutoShorts and Revid cost?')
    const a = M.automationAnswer1510()
    ok(a.summary.every((l) => vis.includes(norm(l))), 'roundup: resposta em 3 frases visível')
    const at = html.indexOf('data-kineo="bing-seo-1510-automation"'), quick = html.indexOf('The quick answer: choose by what you already have')
    ok(at > 0 && at < quick, 'roundup: a resposta da automação vem antes do mapa "quick answer" (topo da página)')
    for (const t of M.automationTools1510()) {
      ok(vis.includes(norm(t.publicPrice)) && vis.includes(norm(t.delivers)), `roundup: ${t.name} — preço público e entrega visíveis`)
      for (const s of t.sources) ok(html.includes(s.url) && vis.includes(`checked ${s.checkedOn}`), `roundup: ${t.name} — fonte com data no HTML`)
    }
    ok(vis.includes(norm(M.kineoAutomationRow1510().perShort)), 'roundup: custo por Short da Kineo visível')
    ok(!/\b(?:the best|winner|#1)\b[^.]{0,40}\b(?:FlowShorts|AutoShorts|Revid)\b/i.test(a.summary.join(' ')) && /No tool is best for every channel/.test(a.summary[2]), 'roundup: sem vencedor universal')
  })
  await tentar('text-to-video: render', async () => {
    const html = await render(T2V)
    const { vis } = faqConfere('text-to-video', html, 'What is the best AI tool for creating YouTube Shorts from text?')
    const a = M.textToVideoAnswer1510()
    ok(a.summary.length === 3 && a.summary.every((l) => vis.includes(norm(l))), 'text-to-video: resposta em 3 frases visível')
    ok(/weigh this answer accordingly/.test(a.summary[2]), 'text-to-video: declara que a resposta é da própria Kineo')
  })
  await tentar('faceless: render', async () => { faqConfere('faceless', await render(FACELESS)) })
  await tentar('seedance: render', async () => { faqConfere('seedance', renderToStaticMarkup(await L(ENGINE_PAGE).default({ params: { engine: 'seedance' } }))) })

  // B4 — toda fonte externa: https, host oficial, data ISO
  const fontes = [...Object.values(M.YOUTUBE_FONTES_1510), ...M.automationTools1510().flatMap((t) => t.sources)]
  ok(fontes.length >= 6, `B4: ${fontes.length} fontes externas`)
  for (const f of fontes) {
    let host = ''
    try { const u = new URL(f.url); host = u.protocol === 'https:' ? u.hostname : '' } catch {}
    ok(OFICIAIS.includes(host), `B4: fonte oficial https — ${f.url}`)
    ok(/^\d{4}-\d{2}-\d{2}$/.test(f.checkedOn ?? ''), `B4: data da leitura — ${f.url}`)
  }
  ok(M.automationTools1510().every((t) => t.publicPrice && (t.perShort === null || /per video/.test(t.perShort))), 'B4: preço público dito (ou "Not published") e custo por Short só onde há base')
  ok(/^Not published/.test(M.automationTools1510().find((t) => t.id === 'autoshorts').publicPrice), 'B4: AutoShorts sem preço público = "Not published", não um número de blog')

  // ── B5 — nenhum preço da Kineo digitado
  for (const [rel, txt] of [[MOD, src(MOD)], [PATHS_MOD, src(PATHS_MOD)], [MONETIZE, trechosDaRodada(src(MONETIZE))], [ROUNDUP, trechosDaRodada(src(ROUNDUP))], [T2V, trechosDaRodada(src(T2V))]]) {
    const ruins = literais(rel.endsWith('x') ? rel : rel.replace(/\.ts$/, '.ts'), txt).filter((l) => PRECO_DIGITADO.test(l))
    ok(ruins.length === 0, `B5: ${rel} sem preço digitado (${ruins.slice(0, 3).map((r) => JSON.stringify(r.trim().slice(0, 60))).join(', ')})`)
  }
  await tentar('B5: números da Kineo derivados', async () => {
    const k = M.kineoAutomationRow1510()
    const c60 = creditCostForDuration('cinematic_ai', true, 60)
    const plan = M.automationAnswer1510() && L('lib/seo/paginasMotor1610.ts').cheapestCreditPlan()
    const cents = Math.round((c60 * TIER_PRICES[plan.tier].usd) / TIER_CREDITS[plan.tier])
    ok(k.perShort.startsWith(`${c60} credits for a 60-second`) && k.perShort.includes(`$${(cents / 100).toFixed(2)}`), 'B5: custo por Short = creditCostForDuration × preço do crédito')
    ok(k.publicPrice.includes(`with ${TIER_CREDITS.starter} credits`) && k.publicPrice.includes(`$${(TIER_PRICES.starter.usd / 100).toFixed(2)}`), 'B5: plano de entrada = TIER_PRICES/TIER_CREDITS')
  })

  // ── B6 — IndexNow
  await tentar('B6: funções puras', async () => {
    const I = L(INDEXNOW)
    const now = Date.parse('2026-10-16T12:00:00Z')
    const cur = [{ loc: 'https://www.usekineo.com/a', lastmod: '2026-10-15T12:00:00.000Z' }, { loc: 'https://www.usekineo.com/b', lastmod: '2026-09-17T05:00:00.000Z' }, { loc: 'https://www.usekineo.com/c', lastmod: '2026-10-15T12:00:00.000Z' }]
    ok(JSON.stringify(I.changedSinceSnapshot(cur, null, now)) === JSON.stringify(['https://www.usekineo.com/a', 'https://www.usekineo.com/c']), 'B6: primeira execução = só lastmod dentro da janela')
    const prev = { 'https://www.usekineo.com/a': '2026-10-01T00:00:00.000Z', 'https://www.usekineo.com/b': '2026-09-17T05:00:00.000Z', 'https://www.usekineo.com/c': '2026-10-15T12:00:00.000Z' }
    ok(JSON.stringify(I.changedSinceSnapshot(cur, prev, now)) === JSON.stringify(['https://www.usekineo.com/a']), 'B6: com retrato = só o lastmod que mudou')
    const snap = I.nextSnapshot(cur, prev, ['https://www.usekineo.com/a'], new Set())
    ok(snap['https://www.usekineo.com/a'] === '2026-10-01T00:00:00.000Z', 'B6: o que não coube no envio mantém o lastmod antigo no retrato')
    ok(I.nextSnapshot(cur, prev, ['https://www.usekineo.com/a'], new Set(['https://www.usekineo.com/a']))['https://www.usekineo.com/a'] === '2026-10-15T12:00:00.000Z', 'B6: o que foi enviado avança no retrato')
    ok(I.remainingDailyBudget(0) === I.INDEXNOW_DAILY_URL_CAP && I.remainingDailyBudget(I.INDEXNOW_DAILY_URL_CAP + 5) === 0 && I.INDEXNOW_DAILY_URL_CAP <= 10000, 'B6: teto de 24 h (≤ 10.000 do protocolo)')
    const xml = '<urlset><url><loc>https://www.usekineo.com/x?a=1&amp;b=2</loc><lastmod>2026-10-15</lastmod></url></urlset>'
    ok(JSON.stringify(I.parseSitemapXml(xml)) === JSON.stringify([{ loc: 'https://www.usekineo.com/x?a=1&b=2', lastmod: '2026-10-15' }]), 'B6: leitura do sitemap')
  })
  await tentar('B6: sitemap carimba as páginas tocadas', async () => {
    const entries = sitemapReal(rep)
    const P = L(PATHS_MOD)
    const stamp = Date.parse(P.BING_SEO_1510_LASTMOD_ISO)
    for (const p of P.BING_SEO_1510_PATHS) {
      const url = p === '/' ? 'https://www.usekineo.com' : `https://www.usekineo.com${p}`
      const e = entries.find((x) => x.url === url)
      ok(e && new Date(e.lastModified).getTime() >= stamp, `B6: sitemap carimba ${p} com lastmod ≥ ${P.BING_SEO_1510_LASTMOD_ISO}`)
    }
  })
  await tentar('B6: a rota do cron', async () => {
    const entries = sitemapReal(rep)
    const P = L(PATHS_MOD)
    const tocadas = P.BING_SEO_1510_PATHS.map((p) => (p === '/' ? 'https://www.usekineo.com' : `https://www.usekineo.com${p}`))
    const antes = Object.fromEntries(entries.map((e) => [e.url, tocadas.includes(e.url) ? '2026-09-17T05:00:00.000Z' : new Date(e.lastModified).toISOString()]))
    // (a) sem o token: ensaio — nada enviado, nada gravado, mas a lista é a certa
    const a = await rodarCron({ rep, snapshot: antes, sitemapEntries: entries })
    ok(a.res.body.dryRun === true && a.posts.length === 0 && a.inserts.length === 0, 'B6: sem ?confirm=SEND não envia nem grava (ensaio)')
    ok(JSON.stringify([...(a.res.body.urls ?? [])].map((u) => new URL(u).toString()).sort()) === JSON.stringify([...tocadas].map((u) => new URL(u).toString()).sort()), `B6: o ensaio lista exatamente as páginas cujo lastmod mudou (${(a.res.body.urls ?? []).length})`)
    // (b) com o token: ENVIA ao IndexNow só o que mudou e grava envio + retrato
    const b = await rodarCron({ rep, query: 'confirm=SEND', snapshot: antes, sitemapEntries: entries })
    const lista = b.posts[0]?.urlList ?? []
    ok(b.posts.length === 1 && b.posts[0].host === 'www.usekineo.com', 'B6: com ?confirm=SEND o IndexNow DISPARA (1 POST ao api.indexnow.org)')
    ok(JSON.stringify([...lista].sort()) === JSON.stringify([...tocadas].map((u) => new URL(u).toString()).sort()), 'B6: o POST leva exatamente as URLs alteradas')
    const snap = b.inserts.find((i) => i.name === 'indexnow_snapshot')?.metadata?.snapshot ?? {}
    ok(b.inserts.some((i) => i.name === 'indexnow_submitted' && i.metadata.submitted === lista.length) && tocadas.every((u) => snap[u] && snap[u] !== '2026-09-17T05:00:00.000Z'), 'B6: grava o envio e avança o retrato só depois do envio real')
    // (c) nada mudou: no-op
    const c = await rodarCron({ rep, query: 'confirm=SEND', snapshot: snap, sitemapEntries: entries })
    ok(c.posts.length === 0 && c.res.body.skipped === 'no new indexable videos in window', 'B6: sem lastmod novo, nenhum POST (sem spam)')
    // (d) teto de 24 h esgotado: não envia e não avança o retrato
    const L1 = L(INDEXNOW)
    const d = await rodarCron({ rep, query: 'confirm=SEND', snapshot: antes, sent24h: L1.INDEXNOW_DAILY_URL_CAP, sitemapEntries: entries })
    ok(d.posts.length === 0 && d.inserts.length === 0, 'B6: teto de 24 h respeitado')
    // (e) vídeo consentido novo entra com os 2 hubs
    const v = { pageUrl: 'https://www.usekineo.com/v/abc', publishedAt: new Date().toISOString() }
    const e = await rodarCron({ rep, query: 'confirm=SEND', snapshot: snap, videos: [v], sitemapEntries: entries })
    const le = e.posts[0]?.urlList ?? []
    ok(le.includes(v.pageUrl) && le.includes('https://www.usekineo.com/scripts') && le.includes('https://www.usekineo.com/wall'), 'B6: vídeo consentido novo + hubs')
  })
  await tentar('B6: agendamento', async () => {
    const vj = JSON.parse(src('vercel.json'))
    const cron = (vj.crons ?? []).find((c) => c.path.split('?')[0] === '/api/cron/submit-indexnow')
    ok(cron && cron.path.includes('confirm=SEND'), 'B6: vercel.json agenda o cron COM ?confirm=SEND (senão é ensaio eterno)')
    ok(cron && /^\d+ \* \* \* \*$/.test(cron.schedule), 'B6: o cron roda de hora em hora (o deploy chega ao Bing na hora seguinte)')
    ok(/get\('confirm'\) === 'SEND'/.test(src(ROUTE)), 'B6: a rota exige o token (o guardião do cron eterno o lê)')
  })
  // ── B7 — o desfaz que os guardiões antigos usam (reancoragem byte a byte): devolve a base e lança no conserto pela metade
  await tentar('B7: desfaz', async () => {
    const D = await import('./test-support/desfaz-bing-seo-1510.mjs')
    for (const rel of D.ARQUIVOS_BING_SEO_1510) {
      const cur = src(rel)
      const sem = D.semBingSeo1510(rel, cur)
      ok(!sem.includes('KINEO-BING-SEO-1510'), `B7: ${rel} sem a rodada não guarda a marca`)
      const base = baseDe(rel)
      if (base !== null && !rep[rel]) ok(sem.replace(/\r\n/g, '\n') === base, `B7: ${rel} sem a rodada = base byte a byte`)
      const trocas = JSON.parse(source('scripts/test-support/desfaz-bing-seo-1510-trocas.json'))[rel]
      let lancou = false
      try { D.semBingSeo1510(rel, cur + trocas[0][1]) } catch { lancou = true }
      ok(lancou, `B7: ${rel} com bloco repetido faz o desfaz lançar`)
    }
  })
  return falhas
}

/**
 * A base do desfaz: o arquivo no PAI do commit que criou as trocas (ou no HEAD, antes do commit). Se outro commit mexeu no
 * arquivo depois, a igualdade byte a byte deixa de ser a pergunta certa — devolve null e a prova vira só "blocos uma vez".
 */
function baseDe(rel) {
  const git = (args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 })
  try {
    const nasc = git(['log', '--diff-filter=A', '--format=%H', '-1', '--', 'scripts/test-support/desfaz-bing-seo-1510-trocas.json']).trim()
    if (nasc) {
      const depois = git(['log', '--format=%H', `${nasc}..HEAD`, '--', rel]).trim()
      if (depois) return null
      return git(['show', `${nasc}^:${rel}`]).replace(/\r\n/g, '\n')
    }
    return git(['show', `HEAD:${rel}`]).replace(/\r\n/g, '\n')
  } catch {
    return null
  }
}

// ── execução: verde na árvore real, vermelho em cada mutante ───────────────────────────────────────────────────────────
const base = await verificar()
for (const f of base) console.log('FAIL', f)
console.log(base.length === 0 ? 'PASS árvore real: todas as provas B1–B7' : `FAIL árvore real: ${base.length} falha(s)`)

function trocar(rel, de, para) {
  const s = source(rel)
  if (!s.includes(de)) throw new Error(`mutante não aplicável em ${rel}: âncora ausente — ${de.slice(0, 60)}`)
  const out = s.split(de).join(para)
  if (out === s) throw new Error(`mutante não mudou ${rel}`)
  return { [rel]: out }
}
const NL = (rel) => (source(rel).includes('\r\n') ? '\r\n' : '\n')
const MUTANTES = [
  ['título da home longo', () => trocar(MOD, "'Kineo AI — Faceless YouTube Shorts: Veo 3.1, Kling, Seedance'", "'Kineo AI — Faceless YouTube Shorts: Veo 3.1, Kling 3, Seedance 1.5 and more'")],
  ['description do monetize curta', () => trocar(MOD, "'Yes, if the channel is in the Partner Program and the video is original. YouTube does not pay for mass-produced, templated AI content. Official rules, dated.'", "'Yes, with rules.'")],
  ['meta do Seedance some (volta a padrão de 248)', () => trocar('lib/growth/enginePageCatalog.ts', '    metaDescription: `Seedance 1.5 in Kineo:', '    metaDescriptionX: `Seedance 1.5 in Kineo:')],
  ['alt vazio volta no Trending', () => trocar('components/TrendingRow.tsx', 'alt={posterAlt1510(video)}', 'alt=""')],
  ['FAQ visível perde a pergunta do Bing', () => { const nl = NL(MONETIZE); return trocar(MONETIZE, `{QA.map((item, i) => (${nl}            <section key={i}`, `{QA.slice(1).map((item, i) => (${nl}            <section key={i}`) }],
  ['preço digitado no módulo', () => trocar(MOD, 'On Kineo a finished 60-second Short costs ${a.cheapest.c60} credits on', 'On Kineo a finished 60-second Short costs 35 credits on')],
  ['description do text-to-video longa demais com a oferta ligada', () => trocar(MOD, 'It depends on your text: Kineo turns a topic or a script into a finished, narrated Short. Trial:', 'It depends on your text: Kineo turns a topic or a script into a finished, narrated vertical YouTube Short. Trial:')],
  ['fonte não oficial e sem data', () => { const nl = NL(MOD); return trocar(MOD, `url: 'https://www.revid.ai/pricing',${nl}`, `url: 'http://revid.example/pricing',${nl}`) }],
  ['cron ignora o token (envia em ensaio)', () => trocar(ROUTE, '    !confirmed ||', '    false ||')],
  ['cron não compara lastmod', () => trocar(INDEXNOW, 'if (previous[e.loc] !== e.lastmod) out.push(e.loc)', 'if (false) out.push(e.loc)')],
  ['retrato marca como enviado o que não coube', () => trocar(INDEXNOW, 'if (!pending.has(e.loc)) out[e.loc] = e.lastmod', 'out[e.loc] = e.lastmod; if (false) out[e.loc] = e.lastmod')],
  ['cron sem ?confirm=SEND no vercel.json', () => trocar('vercel.json', '"/api/cron/submit-indexnow?confirm=SEND"', '"/api/cron/submit-indexnow"')],
  ['sitemap não carimba as páginas tocadas', () => trocar(SITEMAP, 'if (!paths.has(path)) return e', 'return e')],
]
// 'fonte sem data' troca a URL por uma não oficial e http — a prova B4 tem de reprovar.
let mortos = 0
for (const [nome, fazer] of MUTANTES) {
  let rep
  try { rep = fazer() } catch (e) { console.log(`FAIL mutante "${nome}" não aplicado: ${e.message}`); process.exitCode = 1; continue }
  // morto = alguma falha NOVA em relação à árvore real (uma falha herdada não conta como morte)
  const f = (await verificar(rep)).filter((x) => !base.includes(x))
  if (f.length > 0) { mortos++; console.log(`PASS mutante "${nome}" deixa vermelho (${f[0].slice(0, 90)})`) }
  else { console.log(`FAIL mutante "${nome}" passou VERDE`); process.exitCode = 1 }
}
console.log(`${mortos}/${MUTANTES.length} mutantes mortos`)
if (base.length > 0) process.exitCode = 1
