// KINEO-GEO-RODADA3-2026-10-08 — guardião da rodada 3 de GEO (sessão CEO 08/10: o ChatGPT trouxe 46% dos cadastros e 100% dos
// pagantes em 28 dias). Executa o código REAL, offline (sem rede, sem banco, sem render pago), com um carregador próprio
// (readFileSync + typescript + vm; resolve '@/' e relativos; nenhum import com alias neste arquivo), e prova:
//   R1 RESPOSTA NO COMEÇO — as 4 páginas que respondem as perguntas da rodada (modelos, InVideo, CapCut, melhor gerador) abrem,
//      logo depois do H1, com a resposta direta em DUAS frases, com os números MEDIDOS (contados aqui, do JSON do índice) e o
//      preço da fonte; a seção traz a tabela medida, o preço do concorrente com link e "checked on 2026-10-08", links para
//      motor, /pricing e /studio, e canonical próprio;
//   R2 FAQ EM JSON-LD — todo <script type="application/ld+json"> das 5 páginas (4 respostas + timer) faz parse; o FAQPage tem
//      as perguntas da rodada (e a do timer: "How many words is a 60-second YouTube Short?") e elas estão visíveis;
//   R3 SÓ FILME DA CASA — todo id de vídeo nos arquivos da rodada e no HTML das páginas está na lista permitida
//      (lib/publicExamples.ts + CURATED/PREVIEWS de lib/engineWall.ts, nunca o EXCLUDED); filme de seção = vitrine do fundador;
//   R4 COPY DE TEMPO VELHA SUMIU — sem a faixa de minutos nas páginas de motor (inglês e 13 línguas) e no llms.txt, sem a
//      mediana velha do Kineo 1 no /alternatives, sem a faixa no GenerateClient; e no lugar o número MEDIDO (o do JSON);
//   R5 A FERRAMENTA USA AS RÉGUAS DO REPO — o timer importa as réguas (speechRate/narrationFit/persona), não tem número de
//      régua digitado, dá os valores que o servidor aplica (a mesma fórmula do ensaio do Seedance/Veo, conferida na rota),
//      ~138 palavras/60 s em inglês (narrador de mistério) e ~147 em português (documental), e não chama API;
//   R6 OS BOTÕES LEVAM O UTM — "Make one like this" embaixo de cada filme da casa (Seedance, 7 nichos e as seções da rodada):
//      placement house_film_remix, utm_content house_film_remix no cadastro E no Studio, a ideia do filme, o motor dele, sem
//      create_intent (nada renderiza sozinho);
//   R7 SITEMAP, LLMS.TXT E PING — lastmod real das páginas da rodada (sem tocar no carimbo da rodada 2); a seção do llms.txt;
//      o ping do IndexNow (ensaio offline) escolhe EXATAMENTE as URLs novas e alteradas;
//   R8 ESPELHO DO TEMPO = JSON — lib/seo/aiVideoIndexTimes.ts igual ao JSON da edição, campo a campo (conta feita aqui);
//   R9 FATOS DE TERCEIROS — InVideo/CapCut/OpusClip/HeyGen com URL oficial e "checked on 2026-10-08"; as rotas diretas
//      relidas hoje batem com MARKET_QUOTES/FONTES_DIRETAS (um fato, um número);
//   R10 TRIAL SEM "EVERY ENGINE" — /facts e /llms.txt não dizem mais que o teste libera todo motor (promessa morta em 05/10):
//      dizem o saldo e o filme que ele paga, das constantes de lib/freeTierOffer.ts.
// Cada regra tem mutante EM MEMÓRIA que precisa ficar VERMELHO pelo motivo certo — e cada mutação é PROVADA por grep no texto
// mutado (a âncora some, o texto novo aparece) antes de rodar. Controles (a fonte muda junto) precisam ficar VERDES.
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import nodeCrypto from 'node:crypto'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const requireRepo = createRequire(join(ROOT, 'package.json'))
const ts = requireRepo('typescript')
const React = requireRepo('react')
const jsxRuntime = requireRepo('react/jsx-runtime')
const { renderToStaticMarkup } = requireRepo('react-dom/server')
const CR = new RegExp(String.fromCharCode(13), 'g')
const rd = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(CR, '')
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

// ── decisões escritas AQUI, de forma independente da lib (a lib tem de bater com elas) ─────────────────────────────────
const BASE = 'https://www.usekineo.com'
const DIA = '2026-10-08' // sessão CEO: preços de terceiros com "checked on 2026-10-08"
const R2_STAMP = new Date('2026-10-08T12:00:00.000Z').toISOString() // carimbo da rodada 2 (o guardião dela exige)
const PLACEMENT = 'house_film_remix'
const LABEL = 'Make one like this →'
const JSON_REL = 'data/ai-video-index/2026-10.json'
const UNKNOWN_MAX = 20 // regra do índice v2
const TIMER_QUESTION = 'How many words is a 60-second YouTube Short?'
const PREFIX = {
  models: 'Seedance 2.5 vs Veo 3.1 vs Kling 3 for Shorts:',
  invideo: 'Kineo vs InVideo AI:',
  capcut: 'Kineo vs CapCut:',
  best: 'The best AI video generator for YouTube Shorts in 2026',
}
const PAGE_PATH = { models: '/seedance-vs-veo-vs-kling', invideo: '/alternatives/invideo', capcut: '/alternatives/capcut', best: '/best-ai-shorts-generators', timer: '/youtube-shorts-script-timer' }
// sessão CEO: "~138 palavras em inglês e ~147 em português para 60 s" (o que o ensaio do Seedance/Veo aplica)
const CEO_PALAVRAS_60S = { en: 138, pt: 147 }
const OLD = {
  faixaMotor: /(^|[^0-9.,])8\s*(–|-|à|إلى|سے|से)\s*25([^0-9]|$)/,
  faixa37: /\b3\s*[–-]\s*7\s*min/i,
  mediana42: /4\.2-minute|6\.6-minute/,
  faixa35: /~3-5 min/,
  trial: /every engine (is )?unlocked|all engines (are )?unlocked|unlocks every listed engine/i,
}
const DECIMAL_COMMA = ['fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'id', 'vi']
const FILES = {
  answers: 'lib/seo/geoRodada3Answers.ts',
  r3: 'lib/seo/geoRodada3.ts',
  section: 'components/GeoRodada3Sections.tsx',
  measured: 'lib/seo/measuredRenderTime.ts',
  measuredEdition: 'lib/seo/measuredRenderTimeEdition.ts',
  times: 'lib/seo/aiVideoIndexTimes.ts',
  timerLib: 'lib/growth/scriptTimerEngines.ts',
  timerClient: 'app/youtube-shorts-script-timer/ScriptTimerClient.tsx',
  timerPage: 'app/youtube-shorts-script-timer/page.tsx',
  models: 'app/seedance-vs-veo-vs-kling/page.tsx',
  best: 'app/best-ai-shorts-generators/page.tsx',
  alt: 'app/alternatives/[competitor]/page.tsx',
  altHub: 'app/alternatives/page.tsx',
  seedanceSections: 'components/SeedanceAnswerSections.tsx',
  nicheFilm: 'components/NicheHouseFilm.tsx',
  enginePage: 'app/ai-video-generator/[engine]/page.tsx',
  s25Page: 'app/ai-video-generator/seedance-2-5/page.tsx',
  langPage: 'app/ai-video-generator/[engine]/[lang]/page.tsx',
  langs: 'lib/seo/enginePageLangs.ts',
  citation: 'lib/seo/engineCitation.ts',
  catalog: 'lib/growth/enginePageCatalog.ts',
  niche: 'app/free-ai-shorts/[niche]/page.tsx',
  generate: 'app/(dashboard)/generate/GenerateClient.tsx',
  llms: 'app/llms.txt/route.ts',
  facts: 'app/facts/page.tsx',
  sitemap: 'app/sitemap.ts',
  hub: 'lib/seo/citableHubPages.ts',
  market: 'lib/clips/clipPriceVsMarket.ts',
  route: 'app/api/generate-video-cinematic/route.ts',
  ping: 'scripts/indexnow-ping-geo-rodada3-2026-10-08.mjs',
}

// ── carregador mínimo: TS/TSX/JSON/CSS, '@/…' e relativos; `rep` troca a fonte (mutantes); `mocks` substitui módulos ───────
// A transpilação é guardada por (arquivo, fonte): mundos diferentes reaproveitam o JS de quem não mudou (a instância do módulo,
// não — cada mundo carrega a sua).
const TRANSPILADO = new Map()
function carregador({ rep = {}, mocks = {}, env = {} } = {}) {
  const cache = new Map()
  const stubs = {
    react: React,
    'react/jsx-runtime': jsxRuntime,
    'react/jsx-dev-runtime': jsxRuntime,
    'next/link': { __esModule: true, default: ({ href, children, prefetch, ...rest }) => React.createElement('a', { href: String(href), ...rest }, children) },
    'next/navigation': { notFound() { throw new Error('NEXT_NOT_FOUND') }, permanentRedirect() { throw new Error('NEXT_REDIRECT') }, redirect() { throw new Error('NEXT_REDIRECT') }, usePathname: () => '/', useRouter: () => ({ push() {}, replace() {}, prefetch() {}, refresh() {} }), useSearchParams: () => new URLSearchParams() },
    'next/cache': { unstable_cache: (fn) => fn, revalidatePath() {}, revalidateTag() {}, unstable_noStore() {} },
    'next/image': { __esModule: true, default: ({ priority, fill, ...p }) => React.createElement('img', p) },
    'node:crypto': nodeCrypto,
    crypto: nodeCrypto,
  }
  const src = (rel) => (has(rep, rel) ? rep[rel] : rd(rel))
  const exists = (rel) => has(rep, rel) || has(mocks, rel) || existsSync(join(ROOT, rel))
  const resolve = (spec, from) => {
    const base = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? posix.normalize(posix.join(posix.dirname(from), spec)) : null
    if (base === null) throw new Error(`import inesperado em ${from}: ${spec}`)
    for (const ext of ['', '.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) {
      const c = base + ext
      if (/\.(tsx?|json|css)$/.test(c) && exists(c)) return c
    }
    throw new Error(`não achei ${spec} (em ${from})`)
  }
  const load = (rel) => {
    if (has(mocks, rel)) return mocks[rel]
    if (cache.has(rel)) return cache.get(rel).exports
    if (rel.endsWith('.css')) return new Proxy({}, { get: (_, p) => (p === '__esModule' ? false : String(p)) })
    if (rel.endsWith('.json')) { const v = JSON.parse(src(rel)); cache.set(rel, { exports: v }); return v }
    const mod = { exports: {} }
    cache.set(rel, mod)
    const fonte = src(rel)
    const chave = `${rel}\u0000${fonte}`
    if (!TRANSPILADO.has(chave)) {
      TRANSPILADO.set(chave, ts.transpileModule(fonte, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
        fileName: rel,
      }).outputText)
    }
    const js = TRANSPILADO.get(chave)
    const req = (spec) => (has(stubs, spec) ? stubs[spec] : load(resolve(spec, rel)))
    vm.runInNewContext(js, {
      exports: mod.exports, module: mod, require: req,
      process: { env: { NODE_ENV: 'production', ...env } },
      console: { log() {}, warn() {}, error() {}, info() {} },
      URL, URLSearchParams, Intl, Date, Response, Headers, TextEncoder, TextDecoder, Buffer,
      setTimeout: () => 0, clearTimeout() {},
      fetch: () => { throw new Error('rede proibida no guardião') },
    }, { filename: rel, timeout: 20000 })
    return mod.exports
  }
  return load
}

const plain = (name) => function Mock({ children }) { return React.createElement('div', { 'data-offline-boundary': name }, children) }
const ctaMock = { __esModule: true, default: ({ children, source, placement, analyticsEvent, focusTargetId, href, ...props }) => React.createElement('a', { href: String(href), ...props, 'data-source': source, 'data-placement': placement }, children) }
const BENCH = {
  rows: [
    { qualityMode: 'cinematic_ai', films: 120, people: 60, medianSeconds: 44 },
    { qualityMode: 'cinematic_veo', films: 4, people: 3, medianSeconds: 61 },
    { qualityMode: 'cinematic_kling', films: 3, people: 2, medianSeconds: 60 },
  ],
  totalFilms: 127, windowDays: 90, measuredOn: '2026-10-07', measured: true,
}
/** O mundo de render: fonte real + trocas `rep` + fronteiras de UI/banco simuladas (nada de cliente, nada de rede). */
function mundo(world = {}) {
  const rep = world.rep ?? {}
  const pe = carregador({ rep })('lib/publicExamples.ts')
  const vitrine = [...pe.ENGINE_PAGE_LEAD, ...pe.FOUNDER_SHOWCASE, ...pe.PUBLIC_ENGINE_EXAMPLES]
  const mocks = {
    'components/Footer.tsx': { __esModule: true, default: plain('Footer') },
    'components/StickyFreeShortCTA.tsx': { __esModule: true, default: plain('StickyFreeShortCTA') },
    'components/ScriptToSeedanceBridge.tsx': { __esModule: true, default: plain('ScriptToSeedanceBridge') },
    'components/AgencyVolumeBridge.tsx': { __esModule: true, default: plain('AgencyVolumeBridge') },
    'components/WallMedia.tsx': { __esModule: true, default: plain('WallMedia') },
    'components/OrganicCtaLink.tsx': ctaMock,
    'app/youtube-shorts-from-topic/TopicGeneratorForm.tsx': { __esModule: true, default: plain('TopicGeneratorForm') },
    'app/free-ai-shorts/[niche]/LocalBusinessAdBrief.tsx': { __esModule: true, default: plain('LocalBusinessAdBrief') },
    'lib/engineWall.ts': {
      getEngineRenders: async () => [],
      getHouseEngineExamples: (engine, limit) => {
        const seen = new Set()
        return vitrine.filter((v) => v.engine === engine && !seen.has(v.id) && seen.add(v.id)).slice(0, limit)
          .map((v) => ({ ...v, videoUrl: v.previewPath ?? v.arenaPreviewPath ?? v.videoPath, posterUrl: v.posterPath ?? v.arenaPosterPath, badge: engine }))
      },
    },
    'lib/engineBenchmarkStats.ts': { getEngineBenchmarkStats: async () => BENCH },
    'lib/studyStats.ts': { STUDY_REVALIDATE_SECONDS: 86400 },
    'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
    ...(world.mocks ?? {}),
  }
  return carregador({ rep, mocks, env: { KINEO_REVERSE_TRIAL_ENABLED: 'true', ...(world.env ?? {}) } })
}

// ── texto e HTML ───────────────────────────────────────────────────────────────────────────────────────────────────
const unesc = (s) => s.replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const texto = (html) => unesc(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const frases = (t) => t.split(/(?<=[.!?])\s+(?=[A-Z“"(])/).filter(Boolean)
const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1))
const ldBlocos = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1])
function primeiroParagrafoDepoisDoH1(html) {
  const i = html.indexOf('</h1>')
  if (i < 0) return ''
  const m = html.slice(i).match(/<p\b[^>]*>([\s\S]*?)<\/p>/)
  return m ? texto(m[1]) : ''
}
function secaoR3(html, key) {
  const i = html.indexOf(`<section data-kineo="geo-r3-${key}"`)
  if (i < 0) return ''
  const j = html.indexOf('</section>', i)
  return html.slice(i, j + '</section>'.length)
}
const tagsRemix = (html) => [...html.matchAll(/<a\b[^>]*data-placement="house_film_remix"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ tag: m[0], label: texto(m[1]), href: unesc((m[0].match(/href="([^"]+)"/) ?? [])[1] ?? '') }))
const render = async (el) => renderToStaticMarkup(await el)

// ── os números independentes: o JSON do índice, contado aqui ───────────────────────────────────────────────────────────
function medidos(json, indexOrder) {
  const out = {}
  for (const meta of indexOrder) {
    const e = json.engines.find((x) => x.qualityMode === meta.qualityMode)
    if (!e) continue
    if (e.customers) {
      const rel = e.customers.reliability
      out[meta.qualityMode] = { name: meta.name, source: 'customers', m: e.customers.minutesToFilm.median, p90: e.customers.minutesToFilm.p90, s: e.customers.durationSeconds.median, rel: rel && rel.pct !== null && rel.unknownPct <= UNKNOWN_MAX ? rel.pct : null }
    } else if (e.house) {
      out[meta.qualityMode] = { name: meta.name, source: 'house', m: e.house.minutesToFilm.median, p90: e.house.minutesToFilm.p90, s: e.house.durationSeconds.median, rel: null }
    }
  }
  const lead = indexOrder.map((x) => out[x.qualityMode]).find((x) => x && x.source === 'customers') ?? null
  return { por: out, lead }
}
const jsonDa = (world) => world.json ?? JSON.parse(rd(JSON_REL))

/** A lista permitida de ids de vídeo: lib/publicExamples.ts inteiro + CURATED e PREVIEWS de lib/engineWall.ts (menos o EXCLUDED). */
function idsPermitidos(rep = {}) {
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
  const pe = has(rep, 'lib/publicExamples.ts') ? rep['lib/publicExamples.ts'] : rd('lib/publicExamples.ts')
  const wall = rd('lib/engineWall.ts')
  const bloco = (ini, fim) => { const i = wall.indexOf(ini); const j = wall.indexOf(fim, i); return i >= 0 && j > i ? wall.slice(i, j) : '' }
  const excl = new Set([...bloco('const EXCLUDED', '])').matchAll(UUID)].map((m) => m[0].toLowerCase()))
  const ids = [...pe.matchAll(UUID), ...bloco('const CURATED', 'const ALL_CURATED').matchAll(UUID), ...bloco('const PREVIEWS', '])').matchAll(UUID)].map((m) => m[0].toLowerCase())
  return new Set(ids.filter((id) => !excl.has(id)))
}
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

// ═══ as regras ═════════════════════════════════════════════════════════════════════════════════════════════════════════
async function paginasDaRodada(world) {
  const load = mundo(world)
  const A = load(FILES.answers)
  const answers = { models: A.modelsAnswer(), invideo: A.invideoAnswer(), capcut: A.capcutAnswer(), best: A.bestGeneratorAnswer() }
  const alt = load(FILES.alt)
  const html = {
    models: await render(load(FILES.models).default()),
    invideo: await render(alt.default({ params: { competitor: 'invideo' } })),
    capcut: await render(alt.default({ params: { competitor: 'capcut' } })),
    best: await render(load(FILES.best).default()),
    timer: await render(load(FILES.timerPage).default()),
  }
  const meta = {
    models: await load(FILES.models).generateMetadata(),
    invideo: alt.generateMetadata({ params: { competitor: 'invideo' } }),
    capcut: alt.generateMetadata({ params: { competitor: 'capcut' } }),
    best: load(FILES.best).metadata,
    timer: load(FILES.timerPage).metadata,
  }
  return { load, A, answers, html, meta }
}

/** R1 — a resposta direta em duas frases logo depois do H1, com os números medidos; a seção com tabela, fonte, links e canonical. */
async function regraR1(world = {}) {
  const p = []
  const { load, answers, html, meta } = await paginasDaRodada(world)
  const lib = load('lib/seo/aiVideoIndex.ts')
  const { por, lead } = medidos(jsonDa(world), lib.INDEX_ENGINES)
  const cost = load('lib/credits/engineCost.ts')
  if (!lead) p.push('R1: o JSON do índice não tem motor com renders de cliente (a regra presume que tem)')
  for (const key of ['models', 'invideo', 'capcut', 'best']) {
    const a = answers[key]
    if (!a) { p.push(`R1 ${key}: sem resposta (null)`); continue }
    const first = primeiroParagrafoDepoisDoH1(html[key])
    const f = frases(first)
    if (first !== a.lead) p.push(`R1 ${key}: o 1º parágrafo depois do H1 não é a resposta direta («${first.slice(0, 90)}»)`)
    if (f.length !== 2) p.push(`R1 ${key}: a resposta tem ${f.length} frases (são 2)`)
    if (!(f[0] ?? '').startsWith(PREFIX[key])) p.push(`R1 ${key}: a 1ª frase não começa por «${PREFIX[key]}»`)
    const duas = f.slice(0, 2).join(' ')
    // os números medidos, contados AQUI no JSON
    if (key === 'models') {
      for (const q of ['cinematic_s25', 'cinematic_veo', 'cinematic_hollywood']) {
        const e = por[q]
        if (e && !duas.includes(`${fmt(e.m)} minutes on ${e.name}`)) p.push(`R1 models: sem a mediana medida de ${e.name} (${fmt(e.m)}) nas 2 frases`)
        const cr = cost.creditCostForDuration(q, true, 60)
        if (!duas.includes(`${cr}`)) p.push(`R1 models: sem o preço de 60 s de ${q} (${cr} créditos) nas 2 frases`)
      }
    } else if (lead) {
      if (!duas.includes(`median ${fmt(lead.m)} minutes`)) p.push(`R1 ${key}: sem a mediana medida (${fmt(lead.m)} min) nas 2 frases`)
      if (lead.rel !== null && !duas.includes(`${fmt(lead.rel)}%`)) p.push(`R1 ${key}: sem a confiabilidade medida (${fmt(lead.rel)}%) nas 2 frases`)
      if (key === 'best' && !duas.includes(`${fmt(lead.s)}-second film`)) p.push('R1 best: sem a duração mediana medida nas 2 frases')
    }
    // a seção: tabela medida, fonte com data, links internos
    const sec = secaoR3(html[key], key)
    if (!sec) { p.push(`R1 ${key}: sem a seção da rodada 3`); continue }
    const ts2 = texto(sec)
    if (!/<table/.test(sec)) p.push(`R1 ${key}: seção sem tabela`)
    if (key === 'models') {
      for (const q of ['cinematic_s25', 'cinematic_veo', 'cinematic_hollywood']) {
        const e = por[q]
        if (e && !ts2.includes(`${fmt(e.m)} min median · 90% within ${fmt(e.p90)} min`)) p.push(`R1 models: tabela sem o tempo medido de ${e.name}`)
      }
      if (!ts2.includes(`Direct route (checked on ${DIA})`)) p.push('R1 models: rota direta sem "checked on 2026-10-08"')
    } else if (lead) {
      if (!ts2.includes(`${fmt(lead.m)} min median · 90% within ${fmt(lead.p90)} min`)) p.push(`R1 ${key}: tabela sem o tempo medido`)
      if (key !== 'best' && lead.rel !== null && !ts2.includes(`${fmt(lead.rel)}% of started renders finished`)) p.push(`R1 ${key}: tabela sem a confiabilidade medida`)
    }
    if (!(a.sources.length > 0 && a.sources.every((s) => sec.includes(`href="${s.url.replace(/&/g, '&amp;')}"`) && s.checkedOn === DIA && ts2.includes(`(checked on ${DIA})`)))) p.push(`R1 ${key}: fonte do concorrente sem link oficial ou sem "checked on ${DIA}"`)
    if (!sec.includes('href="/pricing"') || !sec.includes('href="/studio"') || !/href="\/ai-video-generator\/[a-z0-9-]+"/.test(sec)) p.push(`R1 ${key}: seção sem link para motor, /pricing e /studio`)
    const canon = meta[key]?.alternates?.canonical
    if (canon !== `${BASE}${PAGE_PATH[key]}`) p.push(`R1 ${key}: canonical ${canon}`)
  }
  const canonTimer = meta.timer?.alternates?.canonical
  if (canonTimer !== `${BASE}${PAGE_PATH.timer}`) p.push(`R1 timer: canonical ${canonTimer}`)
  return p
}

/** R2 — todo JSON-LD faz parse; o FAQPage tem as perguntas da rodada e elas estão visíveis. */
async function regraR2(world = {}) {
  const p = []
  const { answers, html } = await paginasDaRodada(world)
  const esperado = { models: answers.models?.faq ?? [], invideo: answers.invideo?.faq ?? [], capcut: answers.capcut?.faq ?? [], best: answers.best?.faq ?? [], timer: [{ q: TIMER_QUESTION }] }
  for (const key of Object.keys(esperado)) {
    const blocos = ldBlocos(html[key])
    if (!blocos.length) { p.push(`R2 ${key}: sem JSON-LD`); continue }
    const parsed = []
    for (const b of blocos) { try { parsed.push(JSON.parse(b)) } catch (err) { p.push(`R2 ${key}: JSON-LD não faz parse (${String(err.message).slice(0, 60)})`) } }
    const faq = parsed.find((x) => x && x['@type'] === 'FAQPage')
    if (!faq) { p.push(`R2 ${key}: sem FAQPage`); continue }
    const visivel = texto(html[key])
    for (const e of esperado[key]) {
      const item = (faq.mainEntity ?? []).find((x) => x.name === e.q)
      if (!item || !item.acceptedAnswer?.text) p.push(`R2 ${key}: FAQPage sem «${e.q}»`)
      else if (!visivel.includes(e.q) || !visivel.includes(item.acceptedAnswer.text)) p.push(`R2 ${key}: «${e.q}» no JSON-LD mas não visível`)
    }
  }
  return p
}

/** R3 — nenhum id de vídeo fora da lista permitida (arquivos da rodada + HTML); filme de seção = vitrine do fundador. */
async function regraR3(world = {}) {
  const p = []
  const permitidos = idsPermitidos(world.rep)
  const rep = world.rep ?? {}
  for (const rel of [FILES.answers, FILES.r3, FILES.section, FILES.measured, FILES.measuredEdition, FILES.times, FILES.timerLib, FILES.timerClient, FILES.timerPage, FILES.models, FILES.best, FILES.alt, FILES.seedanceSections, FILES.nicheFilm]) {
    const s = has(rep, rel) ? rep[rel] : rd(rel)
    for (const m of s.matchAll(UUID_RE)) if (!permitidos.has(m[0].toLowerCase())) p.push(`R3: id de vídeo fora da lista permitida em ${rel}: ${m[0]}`)
  }
  const { load, answers, html } = await paginasDaRodada(world)
  const pe = load('lib/publicExamples.ts')
  const vitrine = [...pe.ENGINE_PAGE_LEAD, ...pe.FOUNDER_SHOWCASE]
  for (const key of ['models', 'invideo', 'capcut', 'best']) {
    for (const m of html[key].matchAll(UUID_RE)) if (!permitidos.has(m[0].toLowerCase())) p.push(`R3 ${key}: id de vídeo fora da lista permitida no HTML: ${m[0]}`)
    for (const f of answers[key]?.films ?? []) {
      const v = vitrine.find((x) => x.id === f.id)
      if (!v || v.ownershipEvidence !== 'founder_confirmed_owned' || v.engine !== f.engine) p.push(`R3 ${key}: filme ${f.id} fora da vitrine do fundador`)
    }
  }
  const seedance = await render(load(FILES.enginePage).default({ params: { engine: 'seedance' } }))
  for (const m of seedance.matchAll(UUID_RE)) if (!permitidos.has(m[0].toLowerCase())) p.push(`R3 seedance: id fora da lista permitida: ${m[0]}`)
  return p
}

/** R4 — sem a copy de tempo velha; no lugar, o número medido (contado aqui, do JSON). Quatro partes (a–d), para cada
 *  mutante rodar só a sua. */
function contextoR4(world) {
  const load = mundo(world)
  const lib = load('lib/seo/aiVideoIndex.ts')
  const { por, lead } = medidos(jsonDa(world), lib.INDEX_ENGINES)
  return { load, por, lead, cat: load(FILES.catalog) }
}
/** R4a — páginas de motor em inglês (inclusive a rota própria do Seedance 2.5) e a seção dos motores do llms.txt. */
async function regraR4a(world = {}) {
  const p = []
  const { load, por, cat } = contextoR4(world)
  for (const slug of cat.INDEXABLE_ENGINE_SLUGS) {
    const e = cat.ENGINES[slug]
    const html = slug === 'seedance-2-5' ? await render(load(FILES.s25Page).default()) : await render(load(FILES.enginePage).default({ params: { engine: slug } }))
    const t = texto(html)
    if (OLD.faixaMotor.test(t)) p.push(`R4 ${slug}: a faixa de minutos velha voltou à página de motor`)
    if (OLD.faixa37.test(t)) p.push(`R4 ${slug}: "3–7 min" na página de motor`)
    const m = por[e.qualityMode]
    if (m && !t.includes(`Median ${fmt(m.m)} min from request to finished film, 90% within ${fmt(m.p90)} min`)) p.push(`R4 ${slug}: sem o tempo medido do motor (${fmt(m.m)}/${fmt(m.p90)})`)
    const ld = ldBlocos(html).map((b) => { try { return JSON.parse(b) } catch { return null } }).find((x) => x && x['@type'] === 'FAQPage')
    const whereCost = (ld?.mainEntity ?? []).find((x) => /^Where can I use /.test(x.name))
    if (m && !(whereCost?.acceptedAnswer?.text ?? '').includes(`a median ${fmt(m.m)} minutes from request to MP4`)) p.push(`R4 ${slug}: FAQ citável sem o tempo medido`)
  }
  const llms = await carregadorLlms(world)
  const ini = llms.indexOf('## Where to use each video engine online')
  const secao = ini >= 0 ? llms.slice(ini, llms.indexOf('\n## ', ini + 5)) : ''
  if (!secao || OLD.faixaMotor.test(secao) || /usually takes/.test(secao)) p.push('R4 llms.txt: a seção dos motores ainda tem a faixa velha (ou sumiu)')
  for (const slug of cat.INDEXABLE_ENGINE_SLUGS) {
    const geo = cat.ENGINE_GEO[slug]
    const m = geo ? por[geo.quality] : null
    const linha = secao.split('\n').find((l) => l.startsWith(`- [Where to use ${geo?.name} online]`)) ?? ''
    if (m && !linha.includes(`Measured time to a finished narrated video: median ${fmt(m.m)} minutes (`)) p.push(`R4 llms.txt: linha do ${geo.name} sem o tempo medido`)
  }
  return p
}
/** R4b — as páginas traduzidas (Seedance 1.5 e Veo 3.1 × 13 línguas): sem a faixa, com a mediana medida na vírgula da língua. */
async function regraR4b(world = {}) {
  const p = []
  const { load, por, cat } = contextoR4(world)
  const langs = load(FILES.langs)
  for (const slug of langs.LOCALIZED_ENGINE_SLUGS) {
    if (!cat.INDEXABLE_ENGINE_SLUGS.includes(slug)) continue
    const m = por[cat.ENGINES[slug].qualityMode]
    for (const code of langs.ENGINE_LANG_CODES) {
      const t = texto(await render(load(FILES.langPage).default({ params: { engine: slug, lang: code } })))
      if (OLD.faixaMotor.test(t)) p.push(`R4 ${slug}/${code}: a faixa de minutos velha voltou à página traduzida`)
      const local = m ? (DECIMAL_COMMA.includes(code) ? fmt(m.m).replace('.', ',') : fmt(m.m)) : null
      if (local && !t.includes(local)) p.push(`R4 ${slug}/${code}: sem a mediana medida (${local}) na página traduzida`)
    }
  }
  return p
}
/** R4c — /alternatives (todas as páginas e o hub) e o roundup: a mediana velha e a faixa saíram; "How fast" é a medida. */
async function regraR4c(world = {}) {
  const p = []
  const { load, lead } = contextoR4(world)
  const alt = load(FILES.alt)
  for (const slug of alt.COMPETITOR_SLUGS) {
    const t = texto(await render(alt.default({ params: { competitor: slug } })))
    if (OLD.mediana42.test(t)) p.push(`R4 /alternatives/${slug}: a mediana velha do Kineo 1 voltou`)
    if (OLD.faixa37.test(t)) p.push(`R4 /alternatives/${slug}: "3–7 minutes" voltou`)
    if (slug === 'submagic' && lead && !t.includes(`A median of ${fmt(lead.m)} minutes from request to a finished, downloadable Short, and 90% finish within ${fmt(lead.p90)} minutes`)) p.push('R4 /alternatives/submagic: "How fast is it?" sem o tempo medido')
  }
  const hubT = texto(await render(load(FILES.altHub).default()))
  if (OLD.faixa37.test(hubT) || OLD.mediana42.test(hubT)) p.push('R4 /alternatives (hub): copy de tempo velha')
  const bestT = texto(await render(load(FILES.best).default()))
  if (OLD.faixa37.test(bestT)) p.push('R4 /best-ai-shorts-generators: "3–7 minutes" voltou')
  return p
}
/** R4d — a fonte da camada citável e o GenerateClient (SÓ TEXTO), sem comentários: sem a faixa, com o número do JSON. */
async function regraR4d(world = {}) {
  const p = []
  const { lead } = contextoR4(world)
  const cit = semComentario(world, FILES.citation, false)
  if (OLD.faixaMotor.test(cit) || /ENGINE_GEO_FILM_MINUTES/.test(cit)) p.push('R4 engineCitation: a faixa digitada voltou')
  const gen = semComentario(world, FILES.generate, true)
  if (OLD.faixa37.test(gen)) p.push('R4 GenerateClient: "3-7 minutes" (ou 3–7 min) voltou ao texto')
  if (OLD.faixa35.test(gen)) p.push('R4 GenerateClient: "~3-5 min" voltou ao texto do Seedance')
  if (lead) {
    const m = fmt(lead.m)
    const p90 = fmt(lead.p90)
    const motor = lead.name // o motor-manchete do índice (o 1º com renders de cliente), lido do JSON
    for (const frase of [`${motor} films take a measured median of ${m} minutes`, `Half of ${motor} films finish within ${m} minutes, and 9 in 10 within ${p90}`, `median ${m} min to the finished film`, `median ${m} min per ${motor} film`, `the median ${motor} film takes ${m} minutes`]) {
      if (!gen.includes(frase)) p.push(`R4 GenerateClient: sem o número medido «${frase}» (o texto tem de seguir o JSON do índice)`)
    }
  }
  return p
}
const SEM_COMENTARIO = new Map()
/** A fonte transpilada SEM comentários (o que vai para o navegador): um comentário que cita a frase velha não conta. */
function semComentario(world, rel, tsx) {
  const fonte = has(world.rep ?? {}, rel) ? world.rep[rel] : rd(rel)
  const chave = `${rel}\u0000${fonte}`
  if (!SEM_COMENTARIO.has(chave)) SEM_COMENTARIO.set(chave, ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: tsx ? ts.JsxEmit.Preserve : undefined, removeComments: true }, fileName: rel }).outputText)
  return SEM_COMENTARIO.get(chave)
}

async function carregadorLlms(world = {}) {
  const load = carregador({ rep: world.rep ?? {}, mocks: world.llmsMocks ?? {}, env: { KINEO_REVERSE_TRIAL_ENABLED: 'true' } })
  return await load(FILES.llms).GET().text()
}

/** R5 — o timer usa as réguas do repo (sem número próprio), dá o que o servidor aplica e não chama API. */
async function regraR5(world = {}) {
  const p = []
  const rep = world.rep ?? {}
  const fonte = (rel) => (has(rep, rel) ? rep[rel] : rd(rel))
  // 1) estático: nenhum número de régua digitado (AST), as importações das réguas, nada de API
  const numeros = (rel, permitidos) => {
    const sf = ts.createSourceFile(rel, fonte(rel), ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const achados = []
    const anda = (n) => {
      if (ts.isVariableDeclaration(n) && n.name.getText(sf) === 'PAGE_CSS') return
      if (ts.isImportDeclaration(n)) return
      if (ts.isNumericLiteral(n) && !permitidos.includes(Number(n.text))) achados.push(n.text)
      const textos = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || n.kind === ts.SyntaxKind.JsxText ? [n.text]
        : ts.isTemplateExpression(n) ? [n.head.text, ...n.templateSpans.map((s) => s.literal.text)] : []
      for (const t0 of textos) {
        // nomes de motor ("Seedance 2.5", "Veo 3.1", "Kling 2.5") não são número de régua
        const t = t0.replace(/\b(Seedance|Kling|Veo|MiniMax|Omni|Gemini|Sora)\s*\d+(\.\d+)?/g, (_m, nome) => nome)
        for (const m of t.matchAll(/(?<![\w.])\d+\.\d+(?![\w.])/g)) achados.push(`"${m[0]}" em texto`)
        for (const m of t.matchAll(/\b(77|81|82|86|132|138|140|147|159|186|197|207|210|221)\b(?!-)/g)) achados.push(`"${m[0]}" em texto`)
        for (const m of t.matchAll(/\b\d+%/g)) achados.push(`"${m[0]}" em texto`)
      }
      ts.forEachChild(n, anda)
    }
    anda(sf)
    return achados
  }
  for (const [rel, perm] of [[FILES.timerLib, [0, 1, 35, 60, 90, 100]], [FILES.timerClient, [0, 1, 2, 13, 60, 100, 5000]], [FILES.timerPage, [0, 1200, 630]]]) {
    const n = numeros(rel, perm)
    if (n.length) p.push(`R5 ${rel}: número de régua digitado (${n.slice(0, 4).join(', ')})`)
  }
  const lib = fonte(FILES.timerLib)
  if (!/^import \{ minCoverageFor \} from '\.\.\/narrationFit'$/m.test(lib)) p.push('R5: o timer não importa o piso de cobertura do cobrador (narrationFit)')
  if (!/^import \{ SPEECH_RATE_BASE, speechFamilyForQuality, speechRateFor, type SpeechFamily \} from '\.\.\/speechRate'$/m.test(lib)) p.push('R5: o timer não importa as réguas de lib/speechRate.ts')
  if (!/^import \{ selectPersonaForScript \} from '\.\.\/narration\/niche-mapping'$/m.test(lib)) p.push('R5: o timer não usa a persona que o compose escolhe')
  const cli = fonte(FILES.timerClient)
  if (/\bfetch\s*\(|['"`]\/api\//.test(cli)) p.push('R5: o timer chama API (tem de rodar só no navegador)')
  if (!cli.includes("import { COMPOSE_RESCALE_TOLERANCE } from '@/lib/cinematic/classicDryRun'") || !cli.includes("import { FILM_SECONDS, estimateByEngineFamily, type FilmSeconds } from '@/lib/growth/scriptTimerEngines'")) p.push('R5: o cliente do timer não usa as réguas da lib / do ensaio')
  if (!/studioScriptHref\(\{ text: fits \? script : '', campaign: CAMPAIGN, utmContent: MAKE_FILM_CONTENT, engine: 'seedance', scriptMode: 'verbatim', duration: target \}\)/.test(cli)) p.push('R5: "Make this film" não abre o Studio com o roteiro (verbatim, Seedance, duração escolhida)')
  // 2) a fórmula que o SERVIDOR aplica no ensaio do Seedance/Veo (a ferramenta tem de seguir esta; se a rota mudar, vermelho)
  const route = fonte(FILES.route)
  if (!route.includes("const narrationRate = speechRateFor({ family: hollywoodPath ? 'hollywood' : 'classic', speed: parsedScript.speed, language: narrationLanguage.language, voice: classicPersona?.voice, personaSpeed: classicPersona?.defaultSpeed })")) p.push('R5: a régua do servidor mudou (narrationRate) — o timer tem de seguir o que o motor aplica')
  if (!route.includes("selectPersonaForScript(prompt, typeof body.vertical === 'string' && body.vertical.trim() ? body.vertical.trim().toLowerCase() : undefined, 'cinematic', narrationLanguage.language)")) p.push('R5: a persona do ensaio clássico mudou na rota')
  if ((route.match(/verbatim, wordsPerSecond: narrationRate\.wordsPerSecond/g) ?? []).length < 2) p.push('R5: o ensaio do Seedance/Veo deixou de medir com narrationRate')
  // 3) execução: as constantes são as do conector (WORDS_PER_SECOND_CLASSIC/HOLLYWOOD) e do cobrador; os valores, os do servidor
  const load = carregador({ rep })
  const T = load(FILES.timerLib)
  const SR = load('lib/speechRate.ts')
  const NF = load('lib/narrationFit.ts')
  const GH = load('lib/gptHandoff.ts')
  const NM = load('lib/narration/niche-mapping.ts')
  const SP = load('lib/scriptParser.ts')
  const TL = load('lib/textLanguage.ts')
  if (SR.SPEECH_RATE_BASE.classic !== GH.WORDS_PER_SECOND_CLASSIC || SR.SPEECH_RATE_BASE.hollywood !== GH.WORDS_PER_SECOND_HOLLYWOOD || GH.WORDS_PER_SECOND_HOLLYWOOD !== NF.WORDS_PER_SECOND) p.push('R5: as réguas do repo divergem entre si (speechRate × gptHandoff/kineoMcp × narrationFit)')
  if (T.CONNECTOR_CLASSIC_PLANNING_PACE !== GH.WORDS_PER_SECOND_CLASSIC) p.push('R5: o passo do conector citado na página ≠ WORDS_PER_SECOND_CLASSIC')
  const amostras = {
    en: 'HOOK\nThe ship vanished without a trace. Nobody ever found the crew, and the mystery is still unsolved today after more than a century of searching the ocean.',
    pt: 'O navio foi encontrado à deriva no oceano. A mesa do jantar estava posta, mas não havia ninguém a bordo e ninguém sabe dizer o que aconteceu com a tripulação.',
    rapido: 'speed: 1.2\nThe ship vanished without a trace. Nobody ever found the crew, and the mystery is still unsolved today after more than a century of searching.',
  }
  for (const [nome, script] of Object.entries(amostras)) {
    const r = T.estimateByEngineFamily(script)
    const narr = SP.parseUserScript(script).narration
    const lang = TL.resolveNarrationLanguage(null, narr).language
    const persona = NM.selectPersonaForScript(script, undefined, 'cinematic', lang)
    const servidor = SR.speechRateFor({ family: 'classic', speed: SP.parseSpeed(script), language: lang, voice: persona.voice, personaSpeed: persona.defaultSpeed }).wordsPerSecond
    const hw = SR.speechRateFor({ family: 'hollywood', speed: SP.parseSpeed(script) }).wordsPerSecond
    const classic = r.families.find((f) => f.family === 'classic')
    const hollywood = r.families.find((f) => f.family === 'hollywood')
    if (!classic || classic.wordsPerSecond !== servidor) p.push(`R5 ${nome}: passo clássico ${classic?.wordsPerSecond} ≠ o do ensaio do servidor (${servidor})`)
    if (!hollywood || hollywood.wordsPerSecond !== hw) p.push(`R5 ${nome}: passo hollywood ${hollywood?.wordsPerSecond} ≠ ${hw}`)
    for (const f of [classic, hollywood].filter(Boolean)) {
      for (const c of f.capacity) {
        if (c.words !== Math.round(c.seconds * f.wordsPerSecond) || c.minimum !== Math.ceil(c.seconds * NF.minCoverageFor(c.seconds) * f.wordsPerSecond)) p.push(`R5 ${nome}: capacidade de ${c.seconds} s ≠ régua (${c.words}/${c.minimum})`)
      }
      if (JSON.stringify(f.capacity.map((c) => c.seconds)) !== '[35,60,90]') p.push(`R5 ${nome}: durações ≠ 35/60/90`)
      if (f.basis !== 'estimate') p.push(`R5 ${nome}: sem o selo "estimate"`)
    }
  }
  // 4) os números que a sessão CEO citou: ~138 (inglês, narrador de mistério) e ~147 (português, documental) para 60 s
  const fatos = T.scriptTimerRulerFacts()
  if (fatos.mystery.words60 !== CEO_PALAVRAS_60S.en || fatos.documentary.words60 !== CEO_PALAVRAS_60S.pt) p.push(`R5: 60 s = ${fatos.mystery.words60}/${fatos.documentary.words60} palavras (a sessão CEO mediu ~${CEO_PALAVRAS_60S.en}/~${CEO_PALAVRAS_60S.pt}; régua do ensaio mudou?)`)
  // 5) a FAQ da página: a pergunta do ChatGPT, com os números das réguas (render protegido: o que já foi achado acima fica)
  let html = ''
  try { html = await render(mundo(world)(FILES.timerPage).default()) } catch (err) { p.push(`R5: a página do timer não renderiza offline (${String(err?.message ?? err).slice(0, 80)})`) }
  const faq = ldBlocos(html).map((b) => { try { return JSON.parse(b) } catch { return null } }).find((x) => x && x['@type'] === 'FAQPage')
  const q = (faq?.mainEntity ?? []).find((x) => x.name === TIMER_QUESTION)
  const a = q?.acceptedAnswer?.text ?? ''
  if (!q || !a.includes(`About ${fatos.mystery.words60} to ${fatos.documentary.words60} spoken words`) || !a.includes('estimate')) p.push('R5: a FAQ "How many words is a 60-second YouTube Short?" sem os números das réguas (ou sem "estimate")')
  // 6) o href de "Make this film": Studio com o roteiro, verbatim, sem auto-render
  const G = load(FILES.r3)
  const href = G.studioScriptHref({ text: amostras.en, campaign: 'growth_script_timer_20260828', utmContent: 'script_timer_make_film', engine: 'seedance', scriptMode: 'verbatim', duration: 60 })
  const u = new URL(href, BASE)
  const d = new URL(u.searchParams.get('redirect') ?? '/', BASE)
  if (u.pathname !== '/signup' || d.pathname !== '/studio' || d.searchParams.get('prompt') !== amostras.en.trim() || d.searchParams.get('script_mode') !== 'verbatim' || d.searchParams.get('engine') !== 'seedance' || d.searchParams.get('duration') !== '60' || u.searchParams.has('create_intent') || d.searchParams.has('create_intent')) p.push('R5: "Make this film" não leva o roteiro ao Studio do jeito certo (ou dispara render)')
  return p
}

/** R6 — "Make one like this": placement e utm_content house_film_remix, a ideia e o motor do filme, sem create_intent. */
async function regraR6(world = {}) {
  const p = []
  const load = mundo(world)
  const ideas = load('lib/seo/houseFilmIdeas.ts')
  const cat = load(FILES.catalog)
  const G = load(FILES.r3)
  // o mapa motor → ?engine= do Studio bate com o catálogo
  for (const [q, param] of Object.entries(G.STUDIO_ENGINE_FOR_FILM)) {
    const e = Object.values(cat.ENGINES).find((x) => x.qualityMode === q)
    if (!e || e.param !== param) p.push(`R6: STUDIO_ENGINE_FOR_FILM[${q}] = ${param} ≠ catálogo (${e?.param})`)
  }
  const confere = (onde, link, film, campaign) => {
    if (link.label !== LABEL) p.push(`R6 ${onde}: rótulo «${link.label}»`)
    let u, d
    try { u = new URL(link.href, BASE); d = new URL(u.searchParams.get('redirect') ?? '/', BASE) } catch { p.push(`R6 ${onde}: href inválido`); return }
    if (u.pathname !== '/signup' || d.pathname !== '/studio') p.push(`R6 ${onde}: não abre o Studio pelo cadastro`)
    if (u.searchParams.get('utm_content') !== PLACEMENT || d.searchParams.get('utm_content') !== PLACEMENT) p.push(`R6 ${onde}: sem utm_content=${PLACEMENT} no cadastro e no Studio`)
    if (u.searchParams.get('intent_campaign') !== campaign || d.searchParams.get('intent_campaign') !== campaign) p.push(`R6 ${onde}: campanha ≠ ${campaign}`)
    if (d.searchParams.get('prompt') !== film.idea) p.push(`R6 ${onde}: não leva a ideia real do filme`)
    if (d.searchParams.get('engine') !== G.STUDIO_ENGINE_FOR_FILM[film.engine]) p.push(`R6 ${onde}: motor ≠ o que renderizou o filme`)
    if (u.searchParams.has('create_intent') || d.searchParams.has('create_intent') || d.searchParams.has('autoanalyze')) p.push(`R6 ${onde}: dispara render sozinho (create_intent/autoanalyze)`)
  }
  // página do Seedance 1.5: um botão por filme da galeria
  const seedance = await render(load(FILES.enginePage).default({ params: { engine: 'seedance' } }))
  const filmes = ideas.seedanceGalleryFilms()
  const links = tagsRemix(seedance)
  if (filmes.length === 0 || links.length !== filmes.length) p.push(`R6 seedance: ${links.length} botões "Make one like this" para ${filmes.length} filmes`)
  links.forEach((l, i) => filmes[i] && confere(`seedance #${i + 1}`, l, filmes[i], 'seo_engine_seedance'))
  // os 7 nichos com filme da casa
  const niche = load(FILES.niche)
  for (const slug of ideas.NICHE_HOUSE_FILM_SLUGS) {
    const film = ideas.nicheHouseFilm(slug)
    const html = renderToStaticMarkup(niche.default({ params: { niche: slug } }))
    const ls = tagsRemix(html)
    if (!film || ls.length !== 1) { p.push(`R6 nicho ${slug}: ${ls.length} botões "Make one like this"`); continue }
    confere(`nicho ${slug}`, ls[0], film, `push63_niche_${slug}`)
  }
  // as seções da rodada 3: cada filme com o botão, na campanha da página
  const { answers, html } = await paginasDaRodada(world)
  for (const key of ['models', 'invideo', 'capcut', 'best']) {
    const a = answers[key]
    const ls = tagsRemix(secaoR3(html[key], key))
    if (!a || a.films.length === 0 || ls.length !== a.films.length) { p.push(`R6 ${key}: ${ls.length} botões para ${a?.films.length ?? 0} filmes`); continue }
    ls.forEach((l, i) => confere(`${key} #${i + 1}`, l, a.films[i], a.campaign))
  }
  return p
}

/** R7 — sitemap (lastmod real), llms.txt (a seção da rodada) e o ping do IndexNow (ensaio offline, lista exata). */
async function sitemapDe(world = {}) {
  const load = mundo(world)
  const nicheSlugs = load(FILES.niche).NICHE_SLUGS
  const altSrc = has(world.rep ?? {}, FILES.alt) ? world.rep[FILES.alt] : rd(FILES.alt)
  const altSlugs = [...altSrc.slice(altSrc.indexOf('export const COMPETITORS'), altSrc.indexOf('export const COMPETITOR_SLUGS')).matchAll(/^ {2}'?([a-z0-9-]+)'?: \{$/gm)].map((m) => m[1])
  const sm = carregador({
    rep: world.rep ?? {},
    mocks: {
      'app/free-ai-shorts/[niche]/page.tsx': { NICHE_SLUGS: nicheSlugs },
      'app/alternatives/[competitor]/page.tsx': { COMPETITOR_SLUGS: altSlugs },
      'lib/publicExamples.ts': { PUBLIC_EXAMPLES: [] },
      'lib/comparisons.ts': { CANONICAL_SLUGS: [] },
      'lib/scriptLibrary.ts': { SCRIPT_VERTICAL_SLUGS: [] },
      'lib/publicSurfacePolicy.ts': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false },
      'lib/seo/intentPages.ts': { INTENT_HUB_PATH: '/ai-video-generator/for', INTENT_SLUGS: [], intentPagePath: (x) => x },
      'lib/growth/citationAnswers.ts': { CITATION_ANSWER_LINKS: [{ path: '/vs/invideo-alternatives-faceless-shorts', label: 'x' }, { path: '/ai-video-generator/free-youtube-shorts', label: 'y' }], CITATION_REVIEW_DATE: '2026-09-27' },
      'lib/seo/freeShortsGeneratorLangs.ts': { FREE_SHORTS_LANGS: [] },
    },
  })(FILES.sitemap).default()
  return { sm, nicheSlugs, altSlugs, load }
}
async function regraR7(world = {}) {
  const p = []
  const { sm, altSlugs, load } = await sitemapDe(world)
  const G = load(FILES.r3)
  const cat = load(FILES.catalog)
  const langs = load(FILES.langs)
  const ideas = load('lib/seo/houseFilmIdeas.ts')
  const stamp = new Date(G.GEO_RODADA3_LAST_MODIFIED_ISO).toISOString()
  if (G.GEO_RODADA3_REVIEWED_ISO !== DIA || !G.GEO_RODADA3_LAST_MODIFIED_ISO.startsWith(DIA) || stamp === R2_STAMP) p.push('R7: data/carimbo da rodada 3 inválidos (ou iguais ao da rodada 2)')
  const lm = (path) => { const e = sm.find((x) => x.url === `${BASE}${path}`); return e ? new Date(e.lastModified).toISOString() : null }
  const r3Paths = [
    ...G.GEO_RODADA3_STATIC_PATHS,
    ...G.GEO_RODADA3_ALTERNATIVE_SLUGS.map((s) => `/alternatives/${s}`),
    ...cat.INDEXABLE_ENGINE_SLUGS.filter((s) => s !== 'seedance').map((s) => `/ai-video-generator/${s}`),
    ...langs.LOCALIZED_ENGINE_SLUGS.filter((s) => cat.INDEXABLE_ENGINE_SLUGS.includes(s)).flatMap((s) => langs.ENGINE_LANG_CODES.map((c) => `/ai-video-generator/${s}/${c}`)),
  ]
  for (const path of r3Paths) if (lm(path) !== stamp) p.push(`R7 sitemap: ${path} com lastmod ${lm(path)} (esperado o carimbo da rodada 3)`)
  const r2Paths = ['/ai-video-generator/seedance', ...ideas.NICHE_HOUSE_FILM_SLUGS.map((s) => `/free-ai-shorts/${s}`)]
  for (const path of r2Paths) if (lm(path) !== R2_STAMP) p.push(`R7 sitemap: ${path} perdeu o carimbo da rodada 2 (${lm(path)})`)
  for (const path of ['/pricing', '/ai-video-generator', '/alternatives/heygen', '/kineo-vs-kineo-studio', '/ai-video-index']) if (lm(path) === stamp) p.push(`R7 sitemap: re-datou página que a rodada 3 não tocou (${path})`)
  // a lista das alternativas que mudaram = os blocos do arquivo que usam o tempo medido
  const altSrc = has(world.rep ?? {}, FILES.alt) ? world.rep[FILES.alt] : rd(FILES.alt)
  const corpo = altSrc.slice(altSrc.indexOf('export const COMPETITORS'), altSrc.indexOf('export const COMPETITOR_SLUGS'))
  const marcas = [...corpo.matchAll(/^ {2}'?([a-z0-9-]+)'?: \{$/gm)].map((m) => ({ slug: m[1], i: m.index }))
  const mudaram = marcas.filter((m, k) => corpo.slice(m.i, k + 1 < marcas.length ? marcas[k + 1].i : corpo.length).includes('PRODUCT_TIME.')).map((m) => m.slug).sort()
  if (JSON.stringify([...G.GEO_RODADA3_ALTERNATIVE_SLUGS].sort()) !== JSON.stringify(mudaram)) p.push(`R7: GEO_RODADA3_ALTERNATIVE_SLUGS ≠ os blocos que usam o tempo medido (${mudaram.length} vs ${G.GEO_RODADA3_ALTERNATIVE_SLUGS.length})`)
  if (altSlugs.length < mudaram.length) p.push('R7: lista de concorrentes não lida')
  // llms.txt: a seção da rodada, com as respostas e o timer
  const llms = await carregadorLlms(world)
  const A = mundo(world)(FILES.answers)
  const ini = llms.indexOf(`## Direct answers with Kineo's measured numbers (updated ${DIA})`)
  const secao = ini >= 0 ? llms.slice(ini, llms.indexOf('\n## ', ini + 5)) : ''
  if (!secao) p.push('R7 llms.txt: sem a seção da rodada 3')
  for (const [nome, a, path] of [['models', A.modelsAnswer(), PAGE_PATH.models], ['invideo', A.invideoAnswer(), PAGE_PATH.invideo], ['capcut', A.capcutAnswer(), PAGE_PATH.capcut], ['best', A.bestGeneratorAnswer(), PAGE_PATH.best]]) {
    if (!a || !secao.includes(`](${BASE}${path}): ${a.lead}`)) p.push(`R7 llms.txt: a resposta ${nome} não está na seção (com o link e a resposta)`)
  }
  const fatos = load(FILES.timerLib).scriptTimerRulerFacts()
  if (!secao.includes(`](${BASE}${PAGE_PATH.timer}): `) || !secao.includes(`About ${fatos.mystery.words60}–${fatos.documentary.words60} spoken words fill 60 seconds`)) p.push('R7 llms.txt: o timer não está na seção (ou sem os números das réguas)')
  if (!llms.includes(`- ${DIA}: engine pages (in ${langs.ENGINE_LANG_CODES.length + 1} languages), the comparison pages and the Studio now quote the measured render time`)) p.push('R7 llms.txt: sem a novidade datada da rodada 3')
  return p
}
async function regraPing(world = {}) {
  const p = []
  let sm, load
  try { ({ sm, load } = await sitemapDe(world)) } catch (err) { return { p: [`ping: o sitemap não carregou (${String(err?.message ?? err).slice(0, 160)})`], deveTer: [] } }
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset>${sm.map((x) => `<url><loc>${x.url}</loc><lastmod>${new Date(x.lastModified).toISOString()}</lastmod></url>`).join('')}</urlset>`
  const dir = mkdtempSync(join(tmpdir(), 'kineo-indexnow-r3-'))
  writeFileSync(join(dir, 'sitemap.xml'), xml)
  const pingRel = FILES.ping
  let script = join(ROOT, pingRel)
  if (has(world.rep ?? {}, pingRel)) { script = join(dir, 'ping.mjs'); writeFileSync(script, world.rep[pingRel].replace("const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')", `const ROOT = ${JSON.stringify(ROOT)}`)) }
  let saida = null
  try { saida = JSON.parse(execFileSync(process.execPath, [script, '--sitemap-file', join(dir, 'sitemap.xml')], { cwd: ROOT, encoding: 'utf8' }).split('\nNada foi enviado.')[0]) } catch (err) { p.push(`ping offline falhou: ${String(err?.message ?? err).slice(0, 160)}`) }
  const G = load(FILES.r3)
  const cat = load(FILES.catalog)
  const langs = load(FILES.langs)
  const ideas = load('lib/seo/houseFilmIdeas.ts')
  const naoNoMapa = new Set()
  const noMapa = (path) => { const ok2 = sm.some((x) => x.url === `${BASE}${path}`); if (!ok2) naoNoMapa.add(path); return ok2 }
  const deveTer = [
    ...G.GEO_RODADA3_STATIC_PATHS.filter(noMapa),
    ...G.GEO_RODADA3_ALTERNATIVE_SLUGS.map((s) => `/alternatives/${s}`).filter(noMapa),
    ...cat.INDEXABLE_ENGINE_SLUGS.map((s) => `/ai-video-generator/${s}`),
    ...langs.LOCALIZED_ENGINE_SLUGS.filter((s) => cat.INDEXABLE_ENGINE_SLUGS.includes(s)).flatMap((s) => langs.ENGINE_LANG_CODES.map((c) => `/ai-video-generator/${s}/${c}`)),
    ...ideas.NICHE_HOUSE_FILM_SLUGS.map((s) => `/free-ai-shorts/${s}`),
    '/llms.txt',
  ].map((path) => `${BASE}${path}`).sort()
  const veio = [...(saida?.urlList ?? [])].sort()
  if (saida?.mode !== 'ensaio-offline' || JSON.stringify(veio) !== JSON.stringify(deveTer)) p.push(`ping escolheu ${veio.length} URLs (esperado ${deveTer.length})${naoNoMapa.size ? ` [fora do mapa: ${[...naoNoMapa].join(', ')}]` : ''}: sobrou ${veio.filter((u) => !deveTer.includes(u)).slice(0, 3).join(' ')} faltou ${deveTer.filter((u) => !veio.includes(u)).slice(0, 3).join(' ')}`)
  const s = has(world.rep ?? {}, pingRel) ? world.rep[pingRel] : rd(pingRel)
  if (!(s.includes("const submit = args.includes('--submit')") && s.indexOf('await fetch(ENDPOINT') > s.indexOf('if (!submit) {'))) p.push('ping não é ensaio por padrão')
  return { p, deveTer }
}

/** R8 — o espelho do tempo (lib/seo/aiVideoIndexTimes.ts) = o JSON da edição, campo a campo (conta feita aqui). */
function regraR8(world = {}) {
  const p = []
  const load = carregador({ rep: world.rep ?? {} })
  const lib = load('lib/seo/aiVideoIndex.ts')
  const espelho = load(FILES.times).AI_VIDEO_INDEX_TIMES
  const json = jsonDa(world)
  const { por } = medidos(json, lib.INDEX_ENGINES)
  if (espelho.edition !== json.edition || espelho.measuredAt !== json.measuredAt) p.push('R8: espelho com edição/data ≠ JSON')
  const esperado = lib.INDEX_ENGINES.filter((m) => por[m.qualityMode]).map((m) => por[m.qualityMode])
  if (espelho.engines.length !== esperado.length) p.push(`R8: espelho com ${espelho.engines.length} motores (JSON: ${esperado.length})`)
  espelho.engines.forEach((e, i) => {
    const x = esperado[i]
    if (!x || e.engine !== x.name || e.source !== x.source || e.medianMinutes !== x.m || e.p90Minutes !== x.p90 || e.medianSeconds !== x.s || e.reliabilityPct !== x.rel) p.push(`R8: espelho ≠ JSON em ${e.engine} (${JSON.stringify(e)})`)
  })
  // os 4 rótulos do índice que o espelho carrega (para as páginas de motor não importarem o índice inteiro) = os do índice
  if (espelho.indexName !== lib.AI_VIDEO_INDEX_NAME || espelho.indexPath !== lib.AI_VIDEO_INDEX_PATH || espelho.testRendersLabel !== lib.TEST_RENDERS_LABEL || espelho.editionLabel !== lib.editionLabel(json.edition)) p.push('R8: rótulos do espelho ≠ índice (nome, caminho, mês da edição ou rótulo da casa)')
  // a regra de derivação (lib/seo/measuredRenderTimeEdition.ts) também tem de bater (é ela que documenta o espelho)
  const M = load(FILES.measuredEdition)
  let derivado = null
  try { derivado = M.timesFromEdition(lib.parseEdition(json)) } catch (err) { p.push(`R8: edição inválida (${err.message})`) }
  if (derivado && JSON.stringify(derivado) !== JSON.stringify(espelho)) p.push('R8: espelho ≠ timesFromEdition(JSON)')
  const src = has(world.rep ?? {}, FILES.times) ? world.rep[FILES.times] : rd(FILES.times)
  if (/^import (?!type )/m.test(src)) p.push('R8: o espelho importa código em tempo de execução (só dados + import type)')
  // desempenho: quem cita tempo (toda página de motor, o catálogo, o llms.txt) carrega measuredRenderTime; ele lê SÓ o espelho
  const srcM = has(world.rep ?? {}, FILES.measured) ? world.rep[FILES.measured] : rd(FILES.measured)
  const importsM = [...srcM.matchAll(/^import (?!type )[^\n]*from '([^']+)'/gm)].map((m) => m[1])
  if (JSON.stringify(importsM) !== JSON.stringify(['./aiVideoIndexTimes'])) p.push(`R8: measuredRenderTime importa em tempo de execução ${importsM.join(', ') || '(nada)'} — só o espelho é permitido`)
  return p
}

/** R9 — fatos de terceiros com URL oficial e a data de hoje; as rotas diretas batem com a tabela de mercado da casa. */
function regraR9(world = {}) {
  const p = []
  const load = carregador({ rep: world.rep ?? {} })
  const G = load(FILES.r3)
  const H = load(FILES.hub)
  const MK = load(FILES.market)
  const CIT = load(FILES.citation)
  for (const [nome, f] of [['InVideo', H.INVIDEO_FACTS], ['CapCut', G.CAPCUT_FACTS], ['OpusClip', G.OPUSCLIP_FACTS], ['HeyGen', G.HEYGEN_FACTS]]) {
    if (f.checkedOn !== DIA || !/^https:\/\//.test(f.url)) p.push(`R9: ${nome} sem URL oficial ou sem "checked on ${DIA}" (${f.checkedOn})`)
  }
  const D = G.DIRECT_MODEL_ROUTES_2026_10_08
  const q = (id) => MK.MARKET_QUOTES.find((x) => x.id === id)
  const k3 = q('runway-k3-standard')
  const s25 = q('runway-s25-pro-720p')
  if (D.checkedOn !== DIA) p.push('R9: rotas diretas sem a data de hoje')
  if (!k3 || k3.creditsPerSecond !== D.kling3CreditsPerSecond || k3.plan.usdCentsMonthly !== D.runwayStandard.usdCentsMonthly || k3.plan.creditsMonthly !== D.runwayStandard.creditsMonthly) p.push('R9: Kling 3 na Runway ≠ MARKET_QUOTES (dois números para o mesmo fato)')
  if (!s25 || s25.creditsPerSecond !== D.seedance25CreditsPerSecond720p || s25.plan.usdCentsMonthly !== D.runwayPro.usdCentsMonthly || s25.plan.creditsMonthly !== D.runwayPro.creditsMonthly) p.push('R9: Seedance 2.5 na Runway ≠ MARKET_QUOTES')
  if (CIT.FONTES_DIRETAS.geminiVeoFast.usdPerSecondFrom !== D.veo31FastUsdPerSecond720p) p.push('R9: Veo 3.1 Fast na Gemini API ≠ FONTES_DIRETAS')
  return p
}

/** R10 — /facts e /llms.txt sem "every engine is unlocked" (promessa morta em 05/10): o saldo e o filme que ele paga. */
async function regraR10(world = {}) {
  const p = []
  const llms = await carregadorLlms(world)
  if (OLD.trial.test(llms)) p.push('R10 llms.txt: ainda promete que o teste libera todo motor')
  const load = mundo(world)
  const offer = load('lib/freeTierOffer.ts')
  const html = renderToStaticMarkup(load(FILES.facts).default())
  const t = texto(html)
  if (OLD.trial.test(t)) p.push('R10 /facts: ainda promete que o teste libera todo motor')
  const faq = ldBlocos(html).map((b) => { try { return JSON.parse(b) } catch { return null } }).find((x) => x && x['@type'] === 'FAQPage')
  const resp = (faq?.mainEntity ?? []).find((x) => x.name === 'Can I try every Kineo video engine for free?')?.acceptedAnswer?.text ?? (t.match(/Can I try every Kineo video engine for free\? (.{0,600})/) ?? [])[1] ?? ''
  if (!resp.startsWith('No.') || !resp.includes(`free ${offer.TRIAL_FREE_FILM_SECONDS}-second film (Seedance 1.5)`)) p.push('R10 /facts: a resposta "Can I try every engine for free?" não diz "No." com o filme que o teste paga')
  if (!llms.includes('- Trial engine access: the trial balance pays for the free film below')) p.push('R10 llms.txt: a linha do acesso do teste não diz o que o saldo paga')
  return p
}

// ═══ execução ══════════════════════════════════════════════════════════════════════════════════════════════════════════
const REGRAS = { R1: regraR1, R2: regraR2, R3: regraR3, R4a: regraR4a, R4b: regraR4b, R4c: regraR4c, R4d: regraR4d, R5: regraR5, R6: regraR6, R7: regraR7, R8: regraR8, R9: regraR9, R10: regraR10 }
async function roda(nomes, world = {}) {
  const out = []
  for (const n of nomes) {
    try { out.push(...(await REGRAS[n](world))) } catch (err) { out.push(`${n}: a regra lançou (${String(err?.message ?? err).slice(0, 200)})`) }
  }
  return out
}

console.log('TESTE geo-rodada3 — respostas citáveis, tempo medido, timer por motor, "Make one like this", sitemap/llms/ping (08/10)')
for (const n of Object.keys(REGRAS)) {
  const r = await roda([n])
  ok(r.length === 0, `${n} ${REGRAS[n].toString().match(/\/\*\* ([^*]+?) \*\//)?.[1] ?? ''}`.trim() + (r.length ? ' → ' + r.slice(0, 6).join(' | ') : ''))
}
const ping = await regraPing()
ok(ping.p.length === 0, `PING do IndexNow (ensaio offline) escolhe EXATAMENTE as ${ping.deveTer.length} URLs novas e alteradas` + (ping.p.length ? ' → ' + ping.p.join(' | ') : ''))
console.log('  URLs para o IndexNow: ' + ping.deveTer.join(' '))

// ── mutantes e controles: cada mutação é PROVADA por grep no texto mutado antes de rodar ───────────────────────────────
const provas = []
function troca(rel, de, para, extra = {}) {
  const src = has(extra, rel) ? extra[rel] : rd(rel)
  const n = src.split(de).length - 1
  if (n !== 1) throw new Error(`âncora do mutante ${n === 0 ? 'ausente' : 'ambígua'} em ${rel}: ${de.slice(0, 80)}`)
  const mutado = src.split(de).join(para)
  // prova por grep: o texto novo está lá e a âncora sumiu (quando o novo não a contém)
  const aplicou = mutado.includes(para) && (para.includes(de) || !mutado.includes(de)) && mutado !== src
  if (!aplicou) throw new Error(`mutação NÃO aplicada em ${rel}`)
  provas.push(para ? `${rel}: «${para.replace(/\s+/g, ' ').slice(0, 70)}»` : `${rel}: removeu «${de.replace(/\s+/g, ' ').trim().slice(0, 70)}»`)
  return { ...extra, [rel]: mutado }
}
const jsonVigente = () => JSON.parse(rd(JSON_REL))
const PRICING = 'lib/checkoutPricing.ts'

const controles = [
  ['K1 a edição muda (JSON + espelho + GenerateClient juntos) → tempo e copy acompanham', ['R4a', 'R4b', 'R4c', 'R4d', 'R8'], () => {
    const j = jsonVigente()
    const json = { ...j, engines: j.engines.map((e) => (e.qualityMode === 'cinematic_ai' ? { ...e, customers: { ...e.customers, minutesToFilm: { ...e.customers.minutesToFilm, median: 6.1 } } } : e)) }
    let rep = troca(FILES.times, "source: 'customers', medianMinutes: 5.9,", "source: 'customers', medianMinutes: 6.1,")
    let gen = rd(FILES.generate)
    for (const [a, b] of [['films take a measured median of 5.9 minutes', 'films take a measured median of 6.1 minutes'], ['Half of Seedance 1.5 films finish within 5.9 minutes', 'Half of Seedance 1.5 films finish within 6.1 minutes'], ['median 5.9 min to the finished film', 'median 6.1 min to the finished film'], ['median 5.9 min per Seedance 1.5 film', 'median 6.1 min per Seedance 1.5 film'], ['the median Seedance 1.5 film takes 5.9 minutes', 'the median Seedance 1.5 film takes 6.1 minutes']]) {
      if (gen.split(a).length !== 2) throw new Error('âncora do controle K1 ausente: ' + a)
      gen = gen.split(a).join(b)
    }
    rep = { ...rep, [FILES.generate]: gen }
    return { rep, json, mocks: { 'lib/seo/aiVideoIndexEdition.ts': { AI_VIDEO_INDEX_EDITION: carregador()('lib/seo/aiVideoIndex.ts').parseEdition(json), AI_VIDEO_INDEX_DATA_FILE: JSON_REL } } }
  }],
  ['K2 preço do Creator muda na fonte → os US$ das respostas acompanham (nada digitado)', ['R1', 'R2'], () => ({
    rep: troca(PRICING, 'export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {\n  starter: { usd: 990 },\n  basic: { usd: 1990 },', 'export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {\n  starter: { usd: 990 },\n  basic: { usd: 3190 },'),
  })],
]
for (const [rotulo, regras, build] of controles) {
  let r
  try { r = await roda(regras, build()) } catch (err) { r = [`(controle lançou: ${String(err?.message ?? err).slice(0, 160)})`] }
  ok(r.length === 0, `${rotulo} → verde` + (r.length ? ' → ' + r.slice(0, 4).join(' | ') : ''))
}

const mutantes = [
  ['M1 a resposta sai do 1º parágrafo (página dos modelos)', ['R1'], () => ({ rep: troca(FILES.models, "        {models ? <p data-kineo=\"geo-r3-answer\" style={{ color: '#f5f5f7', fontSize: '1.05rem', lineHeight: 1.6, margin: '0 0 12px' }}>{models.lead}</p> : null}\n", '') }), /1º parágrafo depois do H1 não é a resposta/],
  ['M2 mediana digitada na resposta do InVideo', ['R1'], () => ({ rep: troca(FILES.answers, "`Kineo publishes its measured numbers — a median ${fmtMeasured(k.t.medianMinutes)} minutes", "`Kineo publishes its measured numbers — a median 4.2 minutes") }), /invideo: sem a mediana medida/],
  ['M3 a resposta do CapCut ganha uma 3ª frase', ['R1'], () => ({ rep: troca(FILES.answers, "; in CapCut the time is your own editing time.`", '. In CapCut the time is your own editing time.`') }), /capcut: a resposta tem 3 frases/],
  ['M4 o FAQPage das alternativas deixa de fazer parse', ['R2'], () => ({ rep: troca(FILES.alt, '<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />', '<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).slice(1) }} />') }), /JSON-LD não faz parse/],
  ['M5 a pergunta do timer some do FAQ', ['R2'], () => ({ rep: troca(FILES.timerPage, "      q: 'How many words is a 60-second YouTube Short?',", "      q: 'How long is a YouTube Short?',") }), /timer: FAQPage sem «How many words is a 60-second YouTube Short\?»/],
  ['M6 um vídeo de cliente entra na seção da rodada', ['R3'], () => ({ rep: troca(FILES.answers, "    films: onePerEngine(['cinematic_ai', 'cinematic_veo', 'cinematic_hollywood']),", "    films: [{ ...onePerEngine(['cinematic_ai'])[0], id: '0d0d0d0d-1111-4222-8333-444444444444', posterPath: '/posters/0d0d0d0d-1111-4222-8333-444444444444.webp' }],") }), /fora da lista permitida|fora da vitrine do fundador/],
  ['M7 a faixa de minutos volta à página de motor', ['R4a'], () => ({ rep: troca(FILES.citation, '    turnaround: turnaroundLine(measured), // KINEO-GEO-RODADA3-2026-10-08 — era a faixa digitada da rodada 1\n', "    turnaround: 'Usually 8–25 minutes for a narrated video — it varies with length and provider queues',\n") }), /a faixa de minutos velha voltou à página de motor/],
  ['M8 a faixa volta à página traduzida (alemão)', ['R4b'], () => ({ rep: troca(FILES.langs, 'Du tippst das Thema und lädst das Video herunter${tempoMedido(f, \'de\')}.', 'Du tippst das Thema und lädst das Video herunter, meist in 8–25 Minuten.') }), /\/de: a faixa de minutos velha voltou/],
  ['M9 a mediana velha do Kineo 1 volta ao /alternatives', ['R4c'], () => ({ rep: troca(FILES.alt, "        a: `${PRODUCT_TIME.answer} Your first one is free.`,", "        a: 'Usually 3–7 minutes from idea to a downloadable, ready-to-post Short (4.2-minute median, 6.6-minute p90, measured). Your first one is free.',") }), /submagic: a mediana velha do Kineo 1 voltou/],
  ['M10 a faixa volta ao GenerateClient', ['R4d'], () => ({ rep: troca(FILES.generate, '              Rendering — the median Seedance 1.5 film takes 5.9 minutes\n', '              Rendering — this usually takes 3-7 minutes\n') }), /GenerateClient: "3-7 minutes"/],
  ['M11 número do GenerateClient diverge do índice', ['R4d'], () => ({ rep: troca(FILES.generate, "'One idea in. A ready-to-post Short out — Seedance 1.5 films take a measured median of 5.9 minutes.'", "'One idea in. A ready-to-post Short out — Seedance 1.5 films take a measured median of 5.0 minutes.'") }), /GenerateClient: sem o número medido «Seedance 1\.5 films take a measured median of 5\.9 minutes»/],
  ['M12 o timer digita a régua hollywood', ['R5'], () => ({ rep: troca(FILES.timerLib, "  return speechRateFor({ family: 'hollywood', speed: parseSpeed(script ?? '') }).wordsPerSecond", '  return 2.3') }), /número de régua digitado/],
  ['M13 o timer ignora a persona (passo base 3,1)', ['R5'], () => ({ rep: troca(FILES.timerLib, "  const rate = speechRateFor({ family: 'classic', speed: parseSpeed(script ?? ''), language, voice: persona.voice, personaSpeed: persona.defaultSpeed })", "  const rate = speechRateFor({ family: 'classic', speed: parseSpeed(script ?? ''), language })") }), /passo clássico .* ≠ o do ensaio do servidor/],
  ['M14 a régua do servidor muda e o timer fica para trás', ['R5'], () => ({ rep: troca(FILES.route, "const narrationRate = speechRateFor({ family: hollywoodPath ? 'hollywood' : 'classic', speed: parsedScript.speed, language: narrationLanguage.language, voice: classicPersona?.voice, personaSpeed: classicPersona?.defaultSpeed })", "const narrationRate = speechRateFor({ family: hollywoodPath ? 'hollywood' : 'classic', speed: parsedScript.speed, language: narrationLanguage.language })") }), /a régua do servidor mudou/],
  ['M15 o timer passa a chamar API', ['R5'], () => ({ rep: troca(FILES.timerClient, '  const result = useMemo(() => estimateByEngineFamily(script), [script])\n', "  const result = useMemo(() => estimateByEngineFamily(script), [script])\n  void fetch('/api/script-timer')\n") }), /o timer chama API/],
  ['M16 "Make one like this" perde o utm_content', ['R6'], () => ({ rep: troca(FILES.r3, "  studio.set('utm_content', content)\n", '') }), /sem utm_content=house_film_remix/],
  ['M17 "Make one like this" dispara render (create_intent)', ['R6'], () => ({ rep: troca(FILES.r3, "  studio.set('intent_campaign', campaign)\n", "  studio.set('intent_campaign', campaign)\n  studio.set('create_intent', 'fast')\n") }), /dispara render sozinho/],
  ['M18 o botão do Seedance mede com o placement errado', ['R6'], () => ({ rep: troca(FILES.seedanceSections, '                  placement={HOUSE_FILM_REMIX_PLACEMENT}\n', '                  placement="film_idea"\n') }), /seedance: 0 botões "Make one like this"/],
  ['M19 motor do filme errado no Studio (Veo → Kling)', ['R6'], () => ({ rep: troca(FILES.r3, "  cinematic_veo: 'veo',\n", "  cinematic_veo: 'kling',\n") }), /STUDIO_ENGINE_FOR_FILM\[cinematic_veo\]|motor ≠ o que renderizou/],
  ['M20 o espelho do tempo diverge do JSON', ['R8'], () => ({ rep: troca(FILES.times, "source: 'customers', medianMinutes: 5.9,", "source: 'customers', medianMinutes: 5.8,") }), /espelho ≠ JSON/],
  ['M29 o espelho traz um rótulo do índice que o índice não usa', ['R8'], () => ({ rep: troca(FILES.times, "  indexName: 'Kineo AI Video Index',", "  indexName: 'Kineo Video Index',") }), /rótulos do espelho ≠ índice/],
  ['M30 measuredRenderTime volta a importar o índice inteiro', ['R8'], () => ({ rep: troca(FILES.measured, "import { AI_VIDEO_INDEX_TIMES } from './aiVideoIndexTimes'\n", "import { AI_VIDEO_INDEX_NAME } from './aiVideoIndex'\nimport { AI_VIDEO_INDEX_TIMES } from './aiVideoIndexTimes'\nvoid AI_VIDEO_INDEX_NAME\n") }), /measuredRenderTime importa em tempo de execução/],
  ['M21 o sitemap esquece de re-datar as alternativas', ['R7'], () => ({ rep: troca(FILES.sitemap, "    lastModified: slug === 'quso' ? '2026-07-21' : GEO_RODADA3_ALTERNATIVE_SLUGS.includes(slug) ? GEO_RODADA3_LAST_MODIFIED : LAST_MODIFIED, // KINEO-GEO-RODADA3-2026-10-08\n", "    lastModified: slug === 'quso' ? '2026-07-21' : LAST_MODIFIED,\n") }), /sitemap: \/alternatives\/opusclip com lastmod/],
  ['M22 a seção da rodada some do llms.txt', ['R7'], () => ({ rep: troca(FILES.llms, '${round3LlmsSection(BASE) /* KINEO-GEO-RODADA3-2026-10-08 — as 4 respostas e o timer, com os números medidos */}', '') }), /llms\.txt: sem a seção da rodada 3/],
  ['M23 a lista das alternativas re-datadas esquece uma', ['R7'], () => ({ rep: troca(FILES.r3, "  'opusclip', 'invideo', 'submagic',", "  'invideo', 'submagic',") }), /GEO_RODADA3_ALTERNATIVE_SLUGS ≠ os blocos/],
  ['M24 os preços da InVideo voltam à leitura velha', ['R9'], () => ({ rep: troca(FILES.hub, "  checkedOn: '2026-10-08',\n  basic:", '  checkedOn: HUB_REVIEWED_ISO,\n  basic:') }), /R9: InVideo sem URL oficial ou sem "checked on 2026-10-08"/],
  ['M25 a rota direta do Kling 3 diverge da tabela de mercado', ['R9'], () => ({ rep: troca(FILES.r3, '  kling3CreditsPerSecond: 12,', '  kling3CreditsPerSecond: 14,') }), /Kling 3 na Runway ≠ MARKET_QUOTES/],
  ['M26 /facts volta a prometer todo motor no teste', ['R10'], () => ({ rep: troca(FILES.facts, '`No. The new-account trial gives ${TRIAL_ACCESS.credits} credits', '`Every engine is unlocked during the new-account trial. The new-account trial gives ${TRIAL_ACCESS.credits} credits') }), /R10 \/facts: ainda promete/],
  ['M27 o llms.txt volta a prometer todo motor no teste', ['R10'], () => ({ rep: troca(FILES.llms, "'the trial balance pays for the free film below; a full film on any other engine needs a paid plan or a credit pack; maintenance pauses below still apply'", "'every engine is unlocked by plan; maintenance pauses below still apply'") }), /R10 llms\.txt: ainda promete/],
]
for (const [rotulo, regras, build, re] of mutantes) {
  let r
  try { r = await roda(regras, build()) } catch (err) { r = [`(mutante lançou: ${String(err?.message ?? err).slice(0, 200)})`] }
  const motivo = r.find((x) => re.test(x))
  ok(Boolean(motivo), `${rotulo} → vermelho pelo motivo certo` + (motivo ? ` (${motivo.slice(0, 110)}…)` : ` (esperado ${re}; veio: ${(r[0] ?? 'nada').slice(0, 160)})`))
}
const pingMut = await regraPing({ rep: troca(FILES.ping, '  const carimbo = Date.parse(e.lastmod) === stampMs\n', '  const carimbo = e.lastmod.startsWith(DAY)\n') })
ok(pingMut.p.some((x) => /ping escolheu/.test(x)), 'M28 o ping passa a escolher pelo DIA (pegaria URLs da rodada 2 fora do escopo) → vermelho pelo motivo certo' + (pingMut.p.length ? '' : ' (veio verde)'))
console.log(`  mutações provadas por grep (${provas.length}):`)
for (const x of provas) console.log('    · ' + x)

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
if (fail) process.exit(1)
