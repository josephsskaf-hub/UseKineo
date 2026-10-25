// KINEO-TRENDING-CAPAS-2510 — external, offline visual renderer only.
// Reads source and public assets; writes only this renderer's sibling HTML.
// No application server/build, env file, database, generation, or network access.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { createRequire } = require('node:module')
const { execFileSync } = require('node:child_process')

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '../..'))
const DEPS = createRequire(path.join(ROOT, 'package.json'))
const React = DEPS('react')
const ts = DEPS('typescript')
const { renderToStaticMarkup } = DEPS('react-dom/server')
const BASE = '7ab62db2b10bea45b0c550879c7353f03caf3a6a'
const CARD = 'app/trending/TrendingCard.tsx'
const CSS = 'app/trending/trending.css'
const OUTPUT = path.join(__dirname, 'PREVIEW.html')
// Fixed catalogue fixtures, in the topic order requested for the screenshot.
// This is not a claim about the current rotating block or today's research file.
const IDS = ['bill-02', 'mon-01', 'tech-01', 'mys-02', 'cou-03', 'ai-01', 'space-01', 'psy-02']
const HOUSE_FILM_ID = 'f3de57b0-3486-4400-ba72-c9390774d426'
const denyNetwork = () => { throw new Error('Network access is forbidden in this offline renderer') }
global.fetch = denyNetwork

const fileEvidence = []
const assetEvidence = new Map()
function git(args, binary = false) {
  return execFileSync('git', args, { cwd: ROOT, encoding: binary ? undefined : 'utf8', maxBuffer: 12 * 1024 * 1024 })
}
function read(file, before) {
  assert(!file.startsWith('/') && !file.includes('..') && !file.includes('.env'), `Unsafe source: ${file}`)
  const content = before ? git(['show', `${BASE}:${file}`]) : fs.readFileSync(path.join(ROOT, file), 'utf8')
  fileEvidence.push({ file, variant: before ? BASE : 'working-tree', sha256: crypto.createHash('sha256').update(content).digest('hex') })
  return content
}
function assetDataUrl(url, before) {
  assert(/^\/(posters|trending\/topics)\/[a-zA-Z0-9_.-]+\.(webp|png|jpe?g|svg)$/.test(url), `Unexpected asset: ${url}`)
  const key = `${before ? 'base' : 'after'}:${url}`
  if (assetEvidence.has(key)) return assetEvidence.get(key).dataUrl
  const file = `public${url}`
  let bytes
  try { bytes = before ? git(['show', `${BASE}:${file}`], true) : fs.readFileSync(path.join(ROOT, file)) }
  catch (error) { throw new Error(`Asset not ready: ${file}. Integrate the authored assets before rendering. ${error.message}`) }
  const ext = path.extname(url).slice(1)
  if (ext === 'svg') {
    const svg = bytes.toString('utf8')
    assert(!/<script\b|<foreignObject\b|(?:href|src)\s*=\s*["'](?:https?:|\/\/)|url\(\s*["']?(?:https?:|\/\/)/i.test(svg), `SVG has non-offline content: ${url}`)
  }
  const mime = { svg: 'image/svg+xml', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' }[ext]
  const dataUrl = `data:${mime};base64,${bytes.toString('base64')}`
  assetEvidence.set(key, { path: url, variant: before ? BASE : 'working-tree', bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), dataUrl })
  return dataUrl
}

function renderer(before) {
  const cache = new Map()
  const allowed = new Set([CARD, 'lib/viralTopics.ts', 'lib/publicExamples.ts', 'lib/engineLabel.ts', 'lib/ads/v2Styles.ts', 'lib/trending/topicCovers.ts'])
  const hooks = { ...React, useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useRef: value => ({ current: value }), useEffect() {} }
  function load(file) {
    assert(allowed.has(file), `Module outside the offline allowlist: ${file}`)
    if (cache.has(file)) return cache.get(file)
    const box = { exports: {} }
    cache.set(file, box.exports)
    const result = ts.transpileModule(read(file, before), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } })
    vm.runInNewContext(result.outputText, {
      module: box, exports: box.exports, URL, URLSearchParams, console, fetch: denyNetwork,
      process: { env: { NODE_ENV: 'production' } },
      require(id) {
        if (id === 'react') return hooks
        if (id === 'react/jsx-runtime') return DEPS(id)
        if (id === 'next/link') return { __esModule: true, default: ({ children, prefetch, ...props }) => React.createElement('a', props, children) }
        if (id === '@/components/InterfaceLanguage') return { UiLabel: ({ children }) => React.createElement(React.Fragment, null, children), useInterfaceLanguage: () => 'en' }
        const next = id.startsWith('@/') ? `${id.slice(2)}.ts` : path.posix.join(path.posix.dirname(file), `${id}.ts`)
        return load(next)
      },
    }, { filename: file, timeout: 3000 })
    return box.exports
  }

  // Load the actual pure URL helpers instead of maintaining a second copy of their logic.
  function topicHref() {
    const source = read('lib/trending/trendingNow.ts', before)
    const tree = ts.createSourceFile('trendingNow.ts', source, ts.ScriptTarget.Latest, true)
    const wanted = new Set(['topicScriptForStudio', 'trendingTopicHref'])
    const constants = new Set(['TRENDING_TOPIC_ENGINE', 'TRENDING_TOPIC_DURATION'])
    const parts = tree.statements.filter(node => {
      if (ts.isFunctionDeclaration(node)) return wanted.has(node.name?.text)
      if (ts.isVariableStatement(node)) return node.declarationList.declarations.some(d => ts.isIdentifier(d.name) && constants.has(d.name.text))
      return false
    }).map(node => node.getText(tree))
    assert.equal(parts.length, 4, 'Expected two real URL helpers and their two constants')
    const box = { exports: {} }
    vm.runInNewContext(ts.transpileModule(parts.join('\n'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module: box, exports: box.exports, URLSearchParams }, { timeout: 3000 })
    return box.exports.trendingTopicHref
  }

  const catalogue = load('lib/viralTopics.ts')
  const showcase = load('lib/publicExamples.ts').FOUNDER_SHOWCASE
  const engineLabelFor = load('lib/engineLabel.ts').engineLabelFor
  const hrefFor = topicHref()
  const covers = before ? null : load('lib/trending/topicCovers.ts')
  const Component = load(CARD).default
  const cards = IDS.map((id, index) => {
    const topic = catalogue.getViralTopicById(id)
    assert(topic, `Unknown fixture topic: ${id}`)
    const film = id === 'mys-02' ? showcase.find(f => f.id === HOUSE_FILM_ID) : null
    if (id === 'mys-02') assert(film, 'Canonical Dyatlov house film is missing')
    // Explicit fixture mapper mirrors filmTopicCards; IDs/order and first pick are fixed for comparison.
    const card = { key: topic.id, title: topic.title, sub: topic.hook, engine: film ? engineLabelFor(film.engine) : null,
      video: film ? film.previewPath : null, poster: film ? assetDataUrl(film.posterPath, before) : null,
      href: hrefFor(topic), badge: index === 0 ? 'pick' : null,
      ...(film ? { houseFilm: true } : { scriptReady: true, ...(!before ? { illustration: assetDataUrl(covers.topicCoverFor(topic.vertical), false) } : {}) }),
    }
    return { topic: { id, title: topic.title, vertical: topic.vertical }, card }
  })
  const markup = cards.map(({ card }) => renderToStaticMarkup(React.createElement(Component, { block: 'film-topics', card }))).join('')
  assert.equal((markup.match(/<article\b/g) || []).length, 8)
  assert.equal((markup.match(/<video\b/g) || []).length, 1)
  assert(!/<video\b[^>]*\ssrc=/.test(markup), 'Video playback must remain disabled')
  assert.equal((markup.match(/class="tr-topic-image"/g) || []).length, before ? 0 : 7)
  assert(!/\b(?:src|poster)="(?!data:)/.test(markup), 'Every media asset must be embedded')
  return { markup, cards: cards.map(({ topic }) => topic), css: read(CSS, before), shellCss: read('app/examples/ExamplesGallery.module.css', before) }
}

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
function frameDocument(variant) {
  const html = `<main class="page trending-page"><div class="tr-wrap"><section id="film-topics" class="tr-block" data-trending-block="film-topics" aria-labelledby="film-topics-title"><div class="tr-block-head"><h2 id="film-topics-title">Film topics</h2><p>Ideas with a script ready. Open one in the Studio and make the film.</p></div><div class="tr-grid">${variant.markup}</div></section></div></main>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; media-src 'none'; form-action 'none'; base-uri 'none'"><style>*{box-sizing:border-box}html,body{margin:0;padding:0}body{font:14px/1.5 Arial,sans-serif;--bg:#f7f9fc;--text:#17273b;--text2:#17273b;--muted:#586c83;--border:#d5e0ec;--card:#fff;--accent:#1766d3;--accent-soft:#eaf2ff;--on-accent:#fff}${variant.shellCss}\n${variant.css}</style></head><body>${html}</body></html>`
}

function main() {
  const before = renderer(true), after = renderer(false)
  assert.deepEqual(before.cards, after.cards, 'Comparison fixtures must preserve catalogue text')
  const coverNames = ['billionaire', 'money', 'ai', 'psychology', 'mystery', 'history', 'science', 'country', 'health', 'space', 'nature', 'technology', 'crime', 'default']
  const contactSheet = `<section id="covers" style="margin-bottom:32px"><h2 style="font-size:20px">Galeria das capas · ativos editoriais</h2><p style="font-size:13px;color:#53677f">Contato visual das 14 capas locais; esta galeria é material de revisão e não faz parte da página do produto.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:12px">${coverNames.map(name => `<figure style="margin:0;min-width:0"><img src="${assetDataUrl(`/trending/topics/${name}.svg`, false)}" alt="Capa editorial ${escape(name)}" width="180" height="320" style="display:block;width:100%;height:auto;aspect-ratio:9/16;border-radius:9px;border:1px solid #bdcadd"><figcaption style="font-size:11px;margin-top:6px;text-align:center">${escape(name)}</figcaption></figure>`).join('')}</div></section>`
  const head = git(['rev-parse', 'HEAD']).trim()
  const manifest = { generatedAt: new Date().toISOString(), sourceRoot: ROOT, base: BASE, afterHead: head, afterIncludesWorkingTree: true, fixtures: after.cards,
    firstCardPickFixture: IDS[0], media: '7 embedded editorial SVGs; actual Dyatlov poster; video playback disabled',
    files: fileEvidence, assets: [...assetEvidence.values()].map(({ dataUrl, ...entry }) => entry) }
  const pair = (device, width) => `<section class="comparison" id="${device}" data-viewport="${width}"><h2>${device === 'desktop' ? 'Desktop · 1440 px' : 'Celular · 390 px'}</h2><div class="pair">${[['before', 'ANTES', before], ['after', 'DEPOIS', after]].map(([key, label, variant]) => `<article class="panel"><h3>${label}</h3><p class="caption">${key === 'before' ? 'Temas sem filme: texto sobre fundo.' : 'Temas sem filme: capa ilustrativa com selo.'}</p><div class="device"><iframe title="${label} — Film topics — ${device}" width="${width}" height="300" sandbox="allow-same-origin" scrolling="no" srcdoc="${escape(frameDocument(variant))}"></iframe></div></article>`).join('')}</div></section>`
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-src 'self' about:; connect-src 'none'; media-src 'none'; form-action 'none'; base-uri 'none'"><title>Kineo · Trending · antes e depois · 25/10</title><style>*{box-sizing:border-box}body{margin:0;background:#e9edf3;color:#18293d;font:15px/1.5 Arial,sans-serif}header{background:#fff;border-bottom:1px solid #cbd5e1;padding:24px clamp(16px,3vw,44px)}h1{margin:0;font-size:28px;letter-spacing:-.035em}header p{max-width:1050px;margin:8px 0 0;font-size:13px;color:#53677f}.notice{padding:10px 14px;margin-top:12px;background:#eef5ff;border:1px solid #c7dcf4;border-radius:8px;max-width:1050px}nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}nav a{color:#155ec1;text-decoration:none;border:1px solid #bfd0e3;border-radius:8px;padding:7px 12px;font-size:13px}main{padding:20px clamp(12px,2vw,28px) 32px}.comparison{margin-bottom:32px}.comparison>h2{font-size:20px;margin:0 0 12px}.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}.panel{min-width:0}.panel h3{font-size:13px;letter-spacing:.1em;margin:0}.caption{font-size:12px;color:#53677f;margin:4px 0 10px}.device{overflow:hidden;border:1px solid #bdcadd;border-radius:12px;background:#fff}.device iframe{display:block;border:0;transform-origin:top left}#mobile .pair{grid-template-columns:390px 390px;justify-content:center}#mobile .device{width:390px}details{background:#fff;border:1px solid #bdcadd;border-radius:10px;padding:14px;font-size:12px}details p{overflow-wrap:anywhere}footer{padding:0 28px 28px;font-size:12px;color:#53677f}@media(max-width:840px){.pair,#mobile .pair{grid-template-columns:minmax(0,1fr)}#mobile .device{width:min(390px,100%)}.panel{margin-bottom:12px}}</style></head><body><header><h1>Trending · imagens nos temas de filme</h1><p>Comparação do componente real <strong>TrendingCard.tsx</strong> e do CSS: antes no commit ${BASE}; depois nos arquivos atuais da entrega. Mesmos oito temas nos dois lados.</p><div class="notice"><strong>PRÉVIA LOCAL.</strong> Capas editoriais identificadas como ilustrativas. Dyatlov mantém seu pôster real. O primeiro cartão tem a seleção “Today’s pick” como fixture para conferir a convivência dos selos.</div><nav><a href="#desktop">Ver desktop</a><a href="#mobile">Ver celular</a><a href="#evidence">Fontes e limites</a></nav></header><main>${pair('desktop', 1440)}${pair('mobile', 390)}<details id="evidence"><summary>Fontes e limites desta comparação</summary><p>SSR do TSX real, com idioma inglês e efeitos de cliente desativados. Os temas vêm do catálogo real; ordem e seleção do primeiro cartão são fixtures explícitas. A função topicCoverFor real escolhe as capas após a alteração. Fontes, CSS e imagens são incorporados; nenhuma conexão externa é necessária.</p><p>Este arquivo mostra apenas a seção afetada, Film topics. Não executa autenticação, links Make mine, rotação de temas, vídeo, fallback de imagem nem tradução. Não comprova publicação, geração ou conversão. Arial é a fonte local de fallback do preview; não foi baixada fonte remota.</p><p>Depois: HEAD ${head}, mais alterações locais presentes na geração. Data: ${escape(manifest.generatedAt)}. Os hashes dos arquivos e ativos estão no manifesto incorporado.</p></details></main><footer>TESTADO LOCALMENTE · sem build, servidor de aplicação, banco, arquivo de ambiente ou geração paga.</footer><script id="preview-evidence" type="application/json">${JSON.stringify(manifest).replaceAll('<', '\\u003c')}</script><script>(()=>{function resize(){document.querySelectorAll('.comparison').forEach(section=>{const width=Number(section.dataset.viewport);section.querySelectorAll('.device').forEach(device=>{const frame=device.querySelector('iframe');frame.style.width=width+'px';const scale=Math.min(1,device.clientWidth/width);const doc=frame.contentDocument;if(doc){doc.querySelectorAll('a').forEach(a=>a.onclick=e=>e.preventDefault());}const height=Math.max(300,doc?.documentElement.scrollHeight||1800);frame.style.height=height+'px';frame.style.transform='scale('+scale+')';device.style.height=(height*scale)+'px';})})}document.querySelectorAll('iframe').forEach(frame=>frame.addEventListener('load',()=>{resize();frame.contentDocument?.querySelectorAll('img').forEach(img=>img.addEventListener('load',resize));}));window.addEventListener('resize',resize);resize();setTimeout(resize,200);setTimeout(resize,800);})();</script></body></html>`
  const finalHtml = html.replace('<details id="evidence">', contactSheet + '<details id="evidence">')
  fs.writeFileSync(OUTPUT, finalHtml, 'utf8')
  console.log(JSON.stringify({ output: OUTPUT, base: BASE, head, bytes: Buffer.byteLength(finalHtml), cardsPerView: IDS.length, views: 4, coverContactSheet: coverNames.length, embeddedAssets: assetEvidence.size, fixtureIds: IDS, network: 'blocked', limitations: 'SSR only; fixture selection; video and click-through disabled' }))
}

try { main() } catch (error) { console.error(error.message); process.exitCode = 1 }
