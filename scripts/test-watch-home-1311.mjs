#!/usr/bin/env node
// KINEO-WATCH-HOME-1311 — guardião offline da Etapa 1 (fundador/CEO, 13/11).
// Executa os renderizadores TSX reais em um mundo sem rede, banco, efeitos ou credenciais.
// A home anterior vem do commit de partida, não de HTML refeito pelo teste.
// Filhos fora da área tocada recebem stubs explícitos; Citation*, FAQ e Footer são reais.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const rootArg = process.argv.indexOf('--root')
const ROOT = rootArg >= 0 ? path.resolve(process.argv[rootArg + 1]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(ROOT, 'package.json'))
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const ts = require('typescript')
const BASE = '7b71edb2d9e9'
const LANDING = 'app/KineoLanding.tsx'
const HOME = 'app/page.tsx'
const PREVIEW = 'app/watch-preview/page.tsx'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const read = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const exists = (rel) => fs.existsSync(path.join(ROOT, rel))
const compiled = new Map()
const priorLanding = lf(execFileSync('git', ['show', `${BASE}:${LANDING}`], { cwd: ROOT, encoding: 'utf8' }))
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const textOnly = (s) => decode(s.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()

// React SSR always generates quoted attributes. These helpers inspect only that generated HTML.
function attrs(tag) {
  const out = {}
  for (const m of tag.matchAll(/\s([^\s=/>]+)(?:="([^"]*)")?/g)) out[m[1]] = decode(m[2] ?? '')
  return out
}
function anchors(html) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ ...attrs(m[1]), label: textOnly(m[2]), html: m[0] }))
}
function namedImportSource(rel, name, source = read) {
  const ast = ts.createSourceFile(rel, source(rel), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  for (const n of ast.statements) if (ts.isImportDeclaration(n) && n.importClause) {
    const names = n.importClause.namedBindings
    if ((n.importClause.name?.text === name) || (names && ts.isNamedImports(names) && names.elements.some((e) => e.name.text === name))) {
      return resolveFile(n.moduleSpecifier.text, rel)
    }
  }
  throw new Error(`Import não encontrado: ${name} em ${rel}`)
}
function resolveFile(id, parent) {
  const base = id.startsWith('@/') ? id.slice(2) : id.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(parent), id)) : null
  if (!base) throw new Error(`Dependência não permitida: ${id} em ${parent}`)
  for (const rel of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) if (exists(rel) && fs.statSync(path.join(ROOT, rel)).isFile()) return rel
  throw new Error(`Arquivo não encontrado: ${id} em ${parent}`)
}

function world({ overrides = {}, user = null, flag, baseline = false } = {}) {
  const cache = new Map()
  const clicks = new Map(), events = []
  const source = (rel) => {
    let s = baseline && rel === LANDING ? priorLanding : read(rel)
    if (Object.hasOwn(overrides, rel)) s = typeof overrides[rel] === 'function' ? overrides[rel](s) : overrides[rel]
    if (flag !== undefined && /export\s+const\s+WATCH_HOME_ENABLED\s*(?::\s*boolean)?\s*=/.test(s)) s = s.replace(/(export\s+const\s+WATCH_HOME_ENABLED\s*(?::\s*boolean)?\s*=\s*)(true|false)/, `$1${flag}`)
    return s
  }
  const react = { ...React, useEffect: () => {}, useLayoutEffect: () => {} }
  const Stub = ({ children }) => children ?? null
  const passthrough = { __esModule: true, default: Stub }
  const stub = (marker) => new Proxy({ __esModule: true, default: ({ children }) => React.createElement('span', { 'data-offline-child': marker }, children) }, { get: (o, k) => o[k] ?? Stub })
  const realComponents = new Set([
    'components/seo/TrafficCitation2310.tsx', 'components/StructuredData.tsx', 'components/Footer.tsx',
    'components/KineoBolt.tsx', 'components/PublicNavDropdown.tsx', 'components/home/WatchMedia.tsx',
  ])
  const query = new Proxy({}, { get: (_, key) => key === 'then' ? (resolve) => Promise.resolve({ data: null, count: 0, error: null }).then(resolve) : () => query })
  const fakeDb = { auth: { getUser: async () => ({ data: { user }, error: null }) }, from: () => query }
  function load(rel) {
    if (cache.has(rel)) return cache.get(rel).exports
    const mod = { exports: {} }
    cache.set(rel, mod)
    const shim = (id) => {
      if (id === 'react') return react
      if (id === 'react/jsx-runtime') {
        const runtime = require(id)
        const wrap = (fn) => (type, props, ...rest) => {
          if (props?.['data-watch-card'] && props.onClick) clicks.set(props['data-watch-card'], props.onClick)
          if (props?.['data-watch-film'] && props.onClick) clicks.set('home-'+props['data-watch-film'], props.onClick)
          return fn(type, props, ...rest)
        }
        return { ...runtime, jsx: wrap(runtime.jsx), jsxs: wrap(runtime.jsxs) }
      }
      if (id === 'server-only' || id.endsWith('.css')) return {}
      if (id === 'next/link') return { __esModule: true, default: ({ children, prefetch, ...props }) => React.createElement('a', props, children) }
      if (id === 'next/image') return { __esModule: true, default: ({ priority, fill, ...props }) => React.createElement('img', props) }
      if (id === 'next/headers') return { headers: () => new Headers(), cookies: () => ({ get: () => undefined }) }
      if (id === 'next/navigation') return { usePathname: () => '/', useSearchParams: () => new URLSearchParams(), useRouter: () => ({}), redirect: (href) => { throw new Error(`Redirect inesperado: ${href}`) } }
      if (id === '@/lib/supabase/server') return { createClient: () => fakeDb }
      if (id === '@/lib/supabase/client') return { createClient: () => { throw new Error('Banco client proibido no guarda') } }
      if (id === '@/lib/engineWall') return { getEngineHero: async () => [], getTrending: async () => [] }
      if (id === '@/lib/billing/annualWelcomeBarServer') return { readAnnualWelcomeBar: async () => null }
      if (id === '@/lib/growth/homeClipsFirstServer') return { resolveHomeVariant: () => ({ variant: 'control', expose: false }) }
      if (id === '@/lib/analytics') return { trackEvent: (name, metadata) => { events.push({ name, metadata }); return Promise.resolve() } }
      if (id === '@/components/InterfaceLanguage' || id === './InterfaceLanguage') return { UiLabel: Stub, UiText: ({ children, text, template, vars = {} }) => children ?? Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), template ?? text ?? ''), InterfaceLanguageSelect: () => null, useInterfaceLanguage: () => ({ language: 'en', dict: null }) }
      if (id === '@/components/WallMedia') return { __esModule: true, default: ({ src, poster }) => React.createElement('video', { src, poster, muted: true, loop: true, playsInline: true, preload: 'none', 'data-offline-wall-media': '1' }) }
      if (id === 'node:crypto' || id === 'crypto') return require(id)
      const target = resolveFile(id, rel)
      if (target.endsWith('.json')) return JSON.parse(source(target))
      if (target.startsWith('components/') && !realComponents.has(target) && !/WatchVisitorHome/.test(target)) return stub(target)
      if (target === 'app/RevealOnScroll.tsx' || target === 'app/HomeTopicForm.tsx') return passthrough
      if (/\/supabase\//.test(target)) throw new Error(`Acesso de produção proibido: ${target}`)
      return load(target)
    }
    const code = source(rel)
    const key = rel + '\0' + code
    if (!compiled.has(key)) compiled.set(key, ts.transpileModule(code, { fileName: rel, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)
    const js = compiled.get(key)
    vm.runInNewContext(js, { module: mod, exports: mod.exports, require: shim, process: { env: {} }, console, URL, URLSearchParams, Headers, Date, Math, Intl, Buffer, fetch: () => { throw new Error('Rede proibida no guarda') } }, { filename: rel })
    return mod.exports
  }
  async function render(rel, props = {}) {
    const Component = load(rel).default
    const element = Component.constructor.name === 'AsyncFunction' ? await Component(props) : React.createElement(Component, props)
    // Next resolves async server components before React SSR; perform that phase
    // here so the authenticated preview really delegates to the actual HomePage.
    const resolveAsync = async (node) => {
      if (Array.isArray(node)) return Promise.all(node.map(resolveAsync))
      if (!React.isValidElement(node)) return node
      if (typeof node.type === 'function' && node.type.constructor.name === 'AsyncFunction') return resolveAsync(await node.type(node.props))
      return Object.hasOwn(node.props, 'children') ? React.cloneElement(node, undefined, await resolveAsync(node.props.children)) : node
    }
    return renderToStaticMarkup(await resolveAsync(element))
  }
  return { source, load, render, clicks, events }
}

function element(html, attribute) {
  const start = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*${attribute}[^>]*>`, 'i').exec(html)
  if (!start) return ''
  const tag = start[1]
  const tags = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi')
  tags.lastIndex = start.index
  let depth = 0, m
  while ((m = tags.exec(html))) {
    depth += m[0][1] === '/' ? -1 : 1
    if (depth === 0) return html.slice(start.index, tags.lastIndex)
  }
  throw new Error(`HTML sem fechamento: ${attribute}`)
}
const WATCH = 'components/home/WatchVisitorHome.tsx'
const MEDIA = 'components/home/WatchMedia.tsx'
const RELEASE = 'lib/home/watchRelease.ts'
const ACTION_RELEASE = 'lib/recreate/seuVideoRelease.ts'
const fixtureUser = { id: 'watch-offline-account', email: 'watch-offline@example.test' }
const isWatch = (html) => html.includes('data-watch-home="visitor"')
const faqQuestions = [
  'Is the video really mine to post?', 'Do I need any editing skills?', 'Is there a watermark?',
  'Can Kineo also generate images and voiceovers?', 'Can I make my videos sharper?', 'Can I use my own script?',
  'What if a generation fails?', 'Can I cancel anytime?', 'Can I run a whole channel with the same host?',
  'Can I monetize the videos?', 'Can I use the videos commercially, or for client work?',
  'How long does one video take?', 'How much does Kineo cost?', 'Which AI video engines can I use in Kineo?',
  'What is the best AI video generator for faceless YouTube channels?',
]
const productRoutes = {
  video: '/studio?intent_campaign=home_card', 'more:cartoon': '/kids-cartoon?utm_source=home_card',
  business: '/ads/v2?entry=product&utm_source=home_card', 'more:ugc': '/ads/v2?entry=ugc&utm_source=home_card',
  'more:recreate': '/recreate',
}
const forbiddenCardCopy = /\b(?:Kling|MiniMax|Seedance|Veo|Hailuo|credits?|US\$)\b|[$€£₹]|R\$/i
const canonical = world()
const clips = canonical.load('lib/clipesNos2Lugares.ts')
const recreate = canonical.load('lib/recreate/formats.ts')
const recreateEntry = canonical.load('lib/recreate/entry.ts')
const expectedIds = Array.from(clips.CLIPES_NOVOS, c => c.id)
const topIds = Array.from(clips.CLIPES_NO_TOPO)
assert.equal(topIds.length, 6, 'a ordem aprovada tem seis clipes no topo')
const baseGuest = await world({ baseline: true }).render(LANDING)
const baseAuth = await world({ baseline: true, user: fixtureUser }).render(LANDING, { initialUser: fixtureUser, initialEmail: fixtureUser.email })

// Review-only exports use exactly the SSR harness above, without hydration/network.
if (process.argv.includes('--export-only')) {
  const out=path.join(ROOT,'docs/watch-etapa1-1311/fixtures')
  fs.mkdirSync(out,{recursive:true})
  const shell=(title,html)=>`<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><style>:root{scrollbar-width:none}body{margin:0;padding:20px;font:15px/1.5 Arial;background:#101113;color:#fff;--text:#fff;--muted:#bcc0c5;--border:#444;--card:#191b1e}.reveal{opacity:1!important;transform:none!important}.fixture-label{background:#e2f77a;color:#141a07;padding:12px;font-size:14px}</style><p class="fixture-label">${title} · SSR local estático · sessão fictícia · sem autenticação ou API real</p>${html}</html>`
  fs.writeFileSync(path.join(out,'logged-before.html'),shell('Home logada antes',baseAuth))
  fs.writeFileSync(path.join(out,'logged-after.html'),shell('Home logada depois',await world({user:fixtureUser}).render(LANDING,{watchVisitor:true,initialUser:fixtureUser,initialEmail:fixtureUser.email})))
  const citation='components/seo/TrafficCitation2310.tsx'
  for(const side of ['before','after']){
    const overrides=side==='before'?{[citation]:execFileSync('git',['show',`${BASE}:${citation}`],{cwd:ROOT,encoding:'utf8'})}:{}
    const component=world({overrides}).load(citation)
    fs.writeFileSync(path.join(out,'citation-'+side+'.html'),shell('Tabelas citáveis '+side,renderToStaticMarkup(React.createElement(component.CitationDetails,{page:'home'}))))
  }
  console.log('Exported four static SSR review fixtures; no real session or API.')
  process.exit(0)
}

function stringLiterals(source, rel) {
  const values = []
  const ast = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true)
  const walk = n => { if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) values.push(n.text); ts.forEachChild(n, walk) }
  walk(ast)
  return values
}

async function problems(overrides = {}) {
  const errors = []
  const check = (condition, label) => { if (!condition) errors.push(label) }
  // Retain the complete public-editor contracts and mutants; test closed policies separately below.
  const W = world({ overrides:{[ACTION_RELEASE]:read(ACTION_RELEASE).replace("= 'internal'","= 'public'"),...overrides} })
  const off = await W.render(LANDING, { watchVisitor: false })
  const implicitOff = await W.render(LANDING)
  const guest = await W.render(LANDING, { watchVisitor: true })
  const auth = await W.render(LANDING, { watchVisitor: true, initialUser: fixtureUser, initialEmail: fixtureUser.email })
  check(off === baseGuest && implicitOff === off, 'paridade visitante: flag OFF devolve HTML anterior')
  check(auth === baseAuth && !isWatch(auth), 'paridade logado: WATCH nunca substitui home autenticada')
  check(isWatch(guest) && !isWatch(off), 'ramo WATCH: somente visitante com flag')
  check(W.load(RELEASE).WATCH_HOME_ENABLED === false, 'lançamento: flag pública nasce desligada')

  const answer = element(guest, 'data-citation-answer="home"')
  const details = element(guest, 'data-citation-details="home"')
  const faq = element(guest, 'id="faq"')
  check(answer !== '' && answer === element(off, 'data-citation-answer="home"') && /faceless/i.test(textOnly(answer)), 'SEO resposta direta preservada e faceless visível')
  check(details !== '' && details === element(off, 'data-citation-details="home"') && (details.match(/<table\b/g) ?? []).length === 2 && (details.match(/<h3\b/g) ?? []).length === 5 && /datetime="2026-11-05"/i.test(details), 'SEO bloco citável: duas tabelas, cinco respostas e data preservados')
  check(faq !== '' && faq === element(off, 'id="faq"') && faqQuestions.every(q => textOnly(faq).includes(q)) && (faq.match(/<details\b/g) ?? []).length === 15, 'SEO FAQ completo: quinze respostas preservadas')
  // Toda a cauda deve permanecer a mesma, incluindo how/compare/niches/pricing/founder/FAQ/Footer.
  const tail = html => html.slice(html.indexOf('<p data-citation-answer="home"'))
  check(answer !== '' && tail(guest) === tail(off), 'SEO cauda completa e rodapé preservados após a parede')
  check(guest.indexOf('data-watch-home="visitor"') < guest.indexOf('data-citation-answer="home"'), 'SEO resposta vem abaixo da parede')
  const ld = W.load('components/StructuredData.tsx').FaqStructuredData()
  const json = JSON.parse(renderToStaticMarkup(ld).match(/<script[^>]*>([\s\S]*?)<\/script>/)[1])
  check(json.mainEntity.length === 13 && json.mainEntity.every(x => textOnly(faq).includes(x.name)), 'SEO treze perguntas do FAQPage visíveis na mesma home')

  const watch = element(guest, 'data-watch-home="visitor"')
  const cards = anchors(watch).filter(a => Object.hasOwn(a, 'data-watch-card'))
  check(cards.length === expectedIds.length && new Set(cards.map(a => a['data-watch-card'])).size === expectedIds.length && expectedIds.every(id => cards.some(a => a['data-watch-card'] === id)), 'catálogo completo: uma ocorrência por CLIPES_NOVOS')
  check(JSON.stringify(cards.slice(0, 6).map(a => a['data-watch-card'])) === JSON.stringify(topIds), 'topo: seis clipes na ordem CLIPES_NO_TOPO')
  check(cards.every(a => a.label.length > 0 && !forbiddenCardCopy.test(a.label)), 'cards: título e ação sem motor nem preço')
  check(cards.every(a => /^\/(?!\/)/.test(a.href ?? '')), 'cards: destino interno real')
  const swapIds = expectedIds.filter(id => recreateEntry.publicRecreatePath(id) && recreate.recreateFormat(id)?.type === 'swap')
  check(swapIds.length === 4, 'catálogo: exatamente quatro trocas públicas aprovadas')
  const previewConfig = W.load('lib/recreate/seuVideoPreviewRelease.ts')
  const references = W.load('lib/recreate/seuVideoCatalog.ts')
  const previewIds = expectedIds.filter(id => previewConfig.SEU_VIDEO_PREVIEW_ENABLED && clips.CLIPES_NOVOS.find(c => c.id === id)?.produto === 'clip' && references.seuVideoCatalogItem(id))
  check(!previewConfig.SEU_VIDEO_PREVIEW_ENABLED || previewIds.length === 6, 'catálogo: seis referências ativas no editor novo, sem promover exemplos arquivados')
  for (const a of cards) {
    const id = a['data-watch-card']
    const cta = textOnly(a.html.match(/<span class="watch-cta">([\s\S]*?)<\/span>/)?.[1] ?? '')
    const format = recreateEntry.publicRecreatePath(id) && recreate.recreateFormat(id)
    check((cta === 'Recreate') === (previewIds.includes(id) || swapIds.includes(id)) && (!format || format.type === 'swap' || cta === 'Use effect'), `rótulo aprovado de troca/efeito: ${id}`)
    if (previewIds.includes(id)) {
      const url = new URL(a.href, 'https://offline.invalid')
      check(url.pathname === previewConfig.SEU_VIDEO_PREVIEW_PATH && url.searchParams.get('example') === id && [...url.searchParams.keys()].join() === 'example', `referência abre editor antes da conta com id exato: ${id}`)
    }
  }
  for(const release of ['internal','off']){
    const closed=world({overrides:{...overrides,[ACTION_RELEASE]:read(ACTION_RELEASE).replace("= 'internal'","= '"+release+"'")}})
    const html=await closed.render(WATCH,{preview:true})
    for(const a of anchors(html).filter(a=>Object.hasOwn(a,'data-watch-card'))){
      const item=clips.CLIPES_NOVOS.find(c=>c.id===a['data-watch-card'])
      if(item?.produto!=='clip')continue
      const expected=recreateEntry.publicRecreatePath(item.id)??closed.load('lib/homeGaleria.ts').viaSignup(clips.clipeNovoDestino(item),false)
      check(a.href===expected,'política interna/off usa catálogo público sem convite de signup: '+item.id)
    }
  }
  for (const c of clips.CLIPES_NOVOS) if (['film', 'cartoon', 'ads'].includes(c.produto)) {
    const card = cards.find(a => a['data-watch-card'] === c.id)
    check(card && !/^\/(?:signup|login)\b/.test(card.href), `ideia antes da conta: ${c.id}`)
  }
  const desktop = anchors(element(watch, 'data-nav-surface="top"'))
  const mobile = anchors(element(watch, 'data-nav-surface="mobile"'))
  const nav = list => list.map(a => [a['data-nav-item'], a.href])
  check(JSON.stringify(nav(desktop)) === JSON.stringify(Object.entries(productRoutes)) && JSON.stringify(nav(mobile)) === JSON.stringify(nav(desktop)), 'navegação: quatro produtos com duas entradas Ads, mesmos destinos desktop/mobile')
  for (const card of cards) {
    const id = card['data-watch-card']
    const before = W.events.length
    W.clicks.get(id)?.()
    const event = W.events[before]
    check(W.events.length === before + 1 && event?.name === 'home_card_clicked' && event.metadata.clip_id === id && event.metadata.href === card.href && event.metadata.signed_in === false, `evento com id e destino reais: ${id}`)
    check(event?.metadata.ui_layout==='unknown','evento informa layout responsivo')
  }
  const curated = anchors(watch).filter(a=>Object.hasOwn(a,'data-watch-film'))
  const films = W.load('lib/home/watchEntry.ts').WATCH_FEATURED_FILMS
  check(curated.length===6 && curated.every((a,i)=>a['data-watch-film']===films[i].id),'seis filmes curados continuam na parede')
  for(const a of curated){
    const id='home-'+a['data-watch-film'],before=W.events.length
    W.clicks.get(id)?.()
    check(W.events.length===before+1&&W.events[before]?.metadata.clip_id===id&&W.events[before]?.metadata.href===a.href,'evento de filme curado preserva id')
  }

  const watchSrc = W.source(WATCH)
  const viewport = W.load('lib/home/watchTelemetry.ts').watchViewportMetadata
  check(viewport(390).ui_layout==='mobile'&&viewport(760).ui_layout==='mobile'&&viewport(761).ui_layout==='desktop'&&viewport(1920).viewport_width===1920&&viewport('390').ui_layout==='unknown','coorte de layout acompanha 760px sem adivinhar dispositivo')
  check(W.source('components/LandingViewTracker.tsx').includes("variant==='watch'?watchViewportMetadata(window.innerWidth):{}"),'denominador WATCH informa layout sem mudar a home antiga')
  const css = watchSrc.match(/const CSS = `([\s\S]*?)`/)?.[1] ?? ''
  check(/aspect-ratio\s*:\s*5\s*\/\s*6/.test(css) && /\.watch-card img[^{}]*\.watch-card video\s*\{[^}]*object-fit\s*:\s*contain/.test(css), 'enquadramento: card 5:6 e foto/vídeo contain')
  check(!/object-fit\s*:\s*cover/.test(css), 'enquadramento: nenhuma foto/vídeo cover na parede')
  const pxFonts = [...css.matchAll(/font-size\s*:\s*([\d.]+)px/g)].map(m => Number(m[1]))
  check(pxFonts.length > 0 && pxFonts.every(n => n >= 12) && /min-height\s*:\s*44px/.test(css), 'acessibilidade: fonte explícita mínima12 e ações44')
  check(!/\bfetch\s*\(|\/api\/|auto_?start|auto_?generate|submitToFal/.test(watchSrc), 'segurança: parede sem API nem geração automática')
  const media = W.source(MEDIA)
  const controller = W.source(namedImportSource(MEDIA, 'createWatchMediaController', W.source))
  const videos = cards.flatMap(c => [...c.html.matchAll(/<video\b([^>]*)>/g)].map(m => attrs(m[1])))
  check(/createWatchMediaController\(box, video, src/.test(media) && /IntersectionObserver/.test(controller) && /\.pause\(/.test(controller) && videos.length === cards.length && videos.every(v => v.preload === 'none' && Object.hasOwn(v, 'muted') && Object.hasOwn(v, 'playsinline') && !Object.hasOwn(v, 'src')), 'mídia: somente visível, pausa fora, mute/inline/preload none')

  const pageOff = await world({ overrides, flag: false }).render(HOME, {})
  const pageOn = await world({ overrides, flag: true }).render(HOME, {})
  const pageAuthOff = await world({ overrides, flag: false, user: fixtureUser }).render(HOME, {})
  const pageAuthOn = await world({ overrides, flag: true, user: fixtureUser }).render(HOME, {})
  check(!isWatch(pageOff) && isWatch(pageOn), 'SSR home: flag controla visitante')
  check(pageAuthOff === pageAuthOn && !isWatch(pageAuthOn), 'SSR home: flag não altera conta autenticada')
  const PreviewWorld = world({ overrides })
  const preview = await PreviewWorld.render(PREVIEW, {})
  const previewAuth = await world({ overrides, user: fixtureUser }).render(PREVIEW, {})
  check(isWatch(preview) && !isWatch(previewAuth) && previewAuth === pageAuthOff, 'prévia: visitante WATCH e conta na home autenticada')
  check(element(preview, 'id="faq"') === faq && element(preview, 'data-citation-details="home"') === details && (preview.match(/"@type":"FAQPage"/g) ?? []).length === 1, 'prévia: FAQ e tabelas visíveis, um FAQPage')
  check(PreviewWorld.load(PREVIEW).metadata?.robots?.index === false, 'prévia: noindex explícito no metadata real')
  PreviewWorld.clicks.get(topIds[0])?.()
  check(PreviewWorld.events.length === 1 && PreviewWorld.events[0].metadata.preview === true && PreviewWorld.events[0].metadata.home_variant === 'watch-preview', 'prévia: clique identificado como prévia para não misturar coortes')
  for (const rel of ['app/sitemap.ts', 'app/llms.txt/route.ts', 'app/llms-full.txt/route.ts', 'public/llms.txt', 'public/llms-full.txt'].filter(exists)) {
    const literals = /\.tsx?$/.test(rel) ? stringLiterals(W.source(rel), rel) : [W.source(rel)]
    check(!literals.some(s => /(?:^|[\s"'])\/watch-preview(?:$|[/?#\s"'])|https?:\/\/[^\s]+\/watch-preview/.test(s)), `prévia fora de índice e llms: ${rel}`)
  }
  return errors
}

// Mutação exige uma âncora única; erro de execução nunca conta como prova de rejeição.
function replacement(rel, from, to) {
  const original = read(rel)
  assert.equal(original.split(from).length - 1, 1, `âncora única do mutante em ${rel}: ${from}`)
  return { [rel]: original.replace(from, to) }
}

console.log('KINEO-WATCH-HOME-1311 — SSR offline, sem rede/banco/geração')
const baseErrors = await problems()
for (const e of baseErrors) console.error(`FALHA ${e}`)
assert.deepEqual(baseErrors, [], 'árvore real precisa passar antes dos mutantes')
const mutations = [
  ['geração interna recebe cliente público',()=>replacement('lib/home/watchEntry.ts',"SEU_VIDEO_RELEASE === 'public' && ",''),'política interna/off usa catálogo público sem convite de signup: selfie-confete'],
  ['WATCH alcança logado', () => replacement(LANDING, '{watchVisitor && !isSignedIn ? <WatchVisitorHome', '{watchVisitor ? <WatchVisitorHome'), 'paridade logado: WATCH nunca substitui home autenticada'],
  ['resposta citável retirada', () => replacement(LANDING, '<CitationDirectAnswer page="home" />', ''), 'SEO resposta direta preservada e faceless visível'],
  ['tabelas citáveis retiradas', () => replacement(LANDING, '<CitationDetails page="home" />', ''), 'SEO bloco citável: duas tabelas, cinco respostas e data preservados'],
  ['FAQ perde pergunta', () => replacement(LANDING, 'Can I use my own script?', 'Question removed'), 'SEO FAQ completo: quinze respostas preservadas'],
  ['id do clique retirado', () => replacement(WATCH, 'clip_id:c.id', 'clip_family:c.id'), `evento com id e destino reais: ${topIds[0]}`],
  ['id do card retirado', () => replacement(WATCH, 'data-watch-card={c.id}', 'data-watch-card={undefined}'), 'catálogo completo: uma ocorrência por CLIPES_NOVOS'],
  ['id de filme curado retirado',()=>replacement(WATCH,"clip_id:'home-'+film.id","clip_id:undefined"),'evento de filme curado preserva id'],
  ['layout do clique retirado',()=>replacement(WATCH,"...watchViewportMetadata(typeof window==='undefined'?undefined:window.innerWidth),card:family",'card:family'),'evento informa layout responsivo'],
  ['coorte mobile quebrada',()=>replacement('lib/home/watchTelemetry.ts','width<=760','width<390'),'coorte de layout acompanha 760px sem adivinhar dispositivo'],
  ['ordem do topo invertida', () => replacement(WATCH, 'top.map((c,i)=>card(c,i+1))', '[...top].reverse().map((c,i)=>card(c,i+1))'), 'topo: seis clipes na ordem CLIPES_NO_TOPO'],
  ['navegação móvel perde Films', () => replacement(WATCH, '{PRODUCTS.map(p=><Link key={p.item} href={p.href} prefetch={false} data-nav-item={p.item}><b', '{PRODUCTS.slice(1).map(p=><Link key={p.item} href={p.href} prefetch={false} data-nav-item={p.item}><b'), 'navegação: quatro produtos com duas entradas Ads, mesmos destinos desktop/mobile'],
  ['card de filme promete Recreate', () => replacement(WATCH, '<UiLabel>{label}</UiLabel>', '<UiLabel>Recreate</UiLabel>'), `rótulo aprovado de troca/efeito: ${clips.CLIPES_NOVOS.find(c => c.produto === 'film').id}`],
  ['referência perde id na URL', () => replacement('lib/home/watchEntry.ts', 'new URLSearchParams({ example: id })', 'new URLSearchParams({})'), 'referência abre editor antes da conta com id exato: selfie-confete'],
  ['visitante volta ao cadastro antes do editor', () => replacement('lib/home/watchEntry.ts', 'if (recreate) return recreate', 'if (recreate) return viaSignup(recreate, signedIn)'), 'referência abre editor antes da conta com id exato: selfie-confete'],
  ['fotos voltam a cortar', () => replacement(WATCH, 'object-fit:contain', 'object-fit:cover'), 'enquadramento: card 5:6 e foto/vídeo contain'],
  ['fonte 11 reaparece', () => replacement(WATCH, '.watch-intro h1{font-size:14px', '.watch-intro h1{font-size:11px'), 'acessibilidade: fonte explícita mínima12 e ações44'],
  ['noindex desligado', () => replacement(PREVIEW, 'robots: { index:false', 'robots: { index:true'), 'prévia: noindex explícito no metadata real'],
  ['prévia listada no sitemap', () => ({ 'app/sitemap.ts': read('app/sitemap.ts') + '\nexport const leakedPreview = "/watch-preview"\n' }), 'prévia fora de índice e llms: app/sitemap.ts'],
  ['parede recebe função de geração', () => replacement(WATCH, '  const [menu,setMenu]=useState(false)', "  const [menu,setMenu]=useState(false)\n  const autoGenerate=()=>fetch('/api/generate')"), 'segurança: parede sem API nem geração automática'],
]
for (const [name, mutate, expected] of mutations) {
  const errors = await problems(mutate())
  assert(errors.includes(expected), `mutante deve falhar pela regra esperada: ${name} — ${expected}; erros=${JSON.stringify(errors)}`)
  console.log(`  ok mutante: ${name}`)
}
console.log(`PASS: paridade de render/SSR, SEO, ${expectedIds.length} cards, ${topIds.length} no topo, navegação, ${mutations.length} mutantes rejeitados pela regra esperada.`)
