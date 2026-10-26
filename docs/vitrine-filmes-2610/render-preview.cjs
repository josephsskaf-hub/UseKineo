// Offline visual artifact: real TSX -> React SSR. No app server, env loader or network.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const cp = require('node:child_process')
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const ts = require('typescript')
const React = require('react')
const jsx = require('react/jsx-runtime')
const { renderToStaticMarkup } = require('react-dom/server')
const ROOT = path.resolve(__dirname, '../..')
const BASE = '62213b008292f110117d1abbe20c157efdb55902'
// Optional group/kind/output arguments create a small screenshot target.
const snapshotGroup = process.argv[2], snapshotKind = process.argv[3], outputName = process.argv[4] || 'PREVIEW.html'
assert(/^[A-Z0-9-]+\.html$/.test(outputName), 'Output must be an HTML filename in this artifact directory')
const sources = []
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const denied = () => { throw Error('Preview forbids network, storage and generation') }
const noOp = () => {}
const Link = ({ children, prefetch, replace, scroll, ...props }) => React.createElement('a', props, children)
let locale = 'pt', state = 'off', hook = 0, activeFilms = []
const id = '11111111-1111-4111-8111-111111111111'
const publicPath = '/made-with-kineo/o-oceano-em-uma-frase-' + id
const hooks = { ...React, useEffect: noOp, useRef: () => ({ current: null }), useState: initial => {
  const values = [{ published: state === 'on', path: state === 'on' ? publicPath : null }, 'ready', 0]
  return [hook < values.length ? values[hook++] : initial, noOp]
} }
function read(file, before = false) {
  assert(/^(app|components|lib)\//.test(file) && !file.includes('..') && !file.includes('.env'))
  const source = (before ? cp.execFileSync('git', ['show', `${BASE}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 5e6 }) : fs.readFileSync(path.join(ROOT, file), 'utf8')).replace(/\r\n/g, '\n')
  sources.push({ file, version: before ? BASE : 'candidate', sha256: createHash('sha256').update(source).digest('hex') })
  return source
}
const cache = new Map()
function load(spec, parent = '') {
  if (spec === 'react') return hooks
  if (spec === 'react/jsx-runtime') return jsx
  if (spec === 'next/link') return { __esModule: true, default: Link }
  if (spec === 'next/navigation') return { notFound: denied, redirect: denied }
  if (spec === '@/components/InterfaceLanguage') return { useInterfaceLanguage: () => locale }
  if (spec === '@/lib/supabase/server') return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id } } }) } }) }
  if (spec === '@/lib/madeWithKineoServer') return { getShowcaseFilms: async () => ({ films: activeFilms, hasNext: false }), getShowcaseFilm: async () => activeFilms[0] ?? null }
  if (spec.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }
  let file = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? path.posix.join(path.posix.dirname(parent), spec) : spec
  assert(/^(app|components|lib)\//.test(file), `Unexpected import ${spec}`)
  if (!/\.tsx?$/.test(file)) file += ['.ts', '.tsx'].find(ext => fs.existsSync(path.join(ROOT, file + ext))) || ''
  if (cache.has(file)) return cache.get(file)
  const exports = {}; cache.set(file, exports)
  const code = ts.transpileModule(read(file), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { exports, require: name => load(name, file), URL, URLSearchParams, process: { env: {} }, fetch: denied,
    setTimeout: denied, console: { log: noOp, error: noOp, warn: noOp } }, { filename: file, timeout: 3000 })
  return exports
}
const render = element => { hook = 0; return renderToStaticMarkup(element) }
function excerpt(file, before, predicate) {
  const source = read(file, before), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), found = []
  function visit(node) { if (ts.isJsxElement(node) && predicate(node, ast)) found.push(node); ts.forEachChild(node, visit) }
  visit(ast); assert.equal(found.length, 1, `Unique excerpt ${file}`)
  return found[0].getText(ast)
}
function renderExcerpt(source, context) {
  const exports = {}
  const code = ts.transpileModule(`exports.View=()=>(${source});`, { fileName: 'excerpt.tsx', compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, require: name => { assert.equal(name, 'react/jsx-runtime'); return jsx }, ...context, fetch: denied }, { timeout: 3000 })
  return render(React.createElement(exports.View))
}
const styles = read('app/made-with-kineo/showcase.module.css')
const poster = name => 'data:image/webp;base64,' + fs.readFileSync(path.join(ROOT, 'public/posters', name)).toString('base64')
const films = [
  { id, slug: 'o-oceano-em-uma-frase-' + id, title: 'O oceano em uma frase', theme: 'Uma onda e a força tranquila da natureza', language: 'pt', engine: 'Seedance 1.5', inputWordCount: 9, generationSeconds: 180, durationSeconds: 15, playbackUrl: 'data:video/mp4;base64,', posterUrl: poster('arena-seedance.webp'), publishedAt: '2026-10-26T12:00:00.000Z', isInternal: false },
  { id: '22222222-2222-4222-8222-222222222222', slug: 'uma-historia-no-olhar-22222222-2222-4222-8222-222222222222', title: 'Uma história no olhar', theme: 'Um encontro imaginário perto do mar', language: 'es', engine: 'Kling 3', inputWordCount: 12, generationSeconds: 242, durationSeconds: 15, playbackUrl: 'data:video/mp4;base64,', posterUrl: poster('arena-kling3.webp'), publishedAt: '2026-10-26T12:00:00.000Z', isInternal: true },
  { id: '33333333-3333-4333-8333-333333333333', slug: 'luz-entre-as-montanhas-33333333-3333-4333-8333-333333333333', title: 'Luz entre as montanhas', theme: 'Um novo dia na paisagem', language: null, engine: 'Veo 3.1', inputWordCount: 8, generationSeconds: null, durationSeconds: 15, playbackUrl: 'data:video/mp4;base64,', posterUrl: poster('arena-veo31.webp'), publishedAt: '2026-10-26T12:00:00.000Z', isInternal: false },
].map(film => ({ ...film, thumbnailUrl: film.posterUrl }))
const { MadeWithKineoGallery, MadeWithKineoFilm } = load('@/components/MadeWithKineo')
const Consent = load('@/components/ShowcaseConsent').default
const Manage = load('@/app/made-with-kineo/manage/page').default
const NotFound = load('@/app/not-found').default
const before404 = render(React.createElement(NotFound))
const utility = `.rounded-lg{border-radius:8px}.px-3{padding-left:12px;padding-right:12px}.py-2{padding-top:8px;padding-bottom:8px}.text-xs{font-size:12px}.font-bold{font-weight:700}.flex{display:flex}.items-center{align-items:center}.gap-2{gap:8px}.flex-wrap{flex-wrap:wrap}.flex-1{flex:1}.text-center{text-align:center}`
const frameCss = `*{box-sizing:border-box}html,body{margin:0;background:#080d16;color:#edf3ff;font-family:Arial,Helvetica,sans-serif}body{--border:#303746;--text:#f6f8fc;--text2:#c6d3e6;--surface:#111722;--muted:#a5b7cf}a{color:#83c3ff}button{font:inherit}button:disabled{opacity:.6}.context{padding:28px;max-width:100%;margin:auto}.context h2{font-size:24px;letter-spacing:-.5px}.notice{padding:14px;border:1px dashed #465870;color:#a5b7cf;line-height:1.6;font-size:13px}.download{display:inline-block;margin:12px 0;padding:13px 22px;border:0;border-radius:12px;background:#2997ff;color:white;font-weight:700}.fixture{background:#101824;border:1px solid #283448;padding:22px;border-radius:18px;max-width:520px;margin:18px auto}.fixture h3{font-weight:500}.fixture video{width:100%;max-height:190px;object-fit:cover;border-radius:12px}.stateLabel{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#7fbdf3}.sideStates{display:flex;gap:24px}.sideStates>div{min-width:0;flex:1}@media(max-width:560px){.sideStates{display:block}.context{padding:20px}}${utility}`
function doc(markup) { return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${frameCss}${styles}</style><body>${markup}</body></html>` }
function screen(markup, kind, height) {
  const width = kind === 'desktop' ? 1120 : 390, scale = kind === 'desktop' ? .5 : 1
  // Inline the repeated 404 snapshot to avoid a renderer process per identical
  // sandboxed frame. Its 100vh resolves to the known comparison-frame height.
  if (markup === before404) return `<div class="screen ${kind}" style="height:${height * scale}px;width:${width * scale}px"><div style="width:${width}px;height:${height}px;transform:scale(${scale});transform-origin:top left;font-family:Arial,Helvetica,sans-serif">${markup.replace('min-height:100vh', `min-height:${height}px`)}</div></div>`
  return `<div class="screen ${kind}" style="height:${height * scale}px;width:${width * scale}px"><iframe loading="lazy" sandbox="allow-same-origin" title="${kind} — recorte renderizado offline" width="${width}" height="${height}" style="transform:scale(${scale})" srcdoc="${escape(doc(markup))}"></iframe></div>`
}
function pair(before, after, kind, height, label) {
  if (snapshotKind && snapshotKind !== 'all' && snapshotKind !== kind) return ''
  return `<div class="pair ${kind}"><div><p class="label">ANTES · ${label} · ${kind === 'desktop' ? '1120px' : '390px'}</p>${screen(before, kind, height)}</div><div><p class="label after">DEPOIS · ${label} · ${kind === 'desktop' ? '1120px' : '390px'}</p>${screen(after, kind, height)}</div></div>`
}
function group(key, title, note, body) { return `<section class="group" data-group="${key}" id="${key}"><h2>${title}</h2><p class="note">${note}</p>${body}</section>` }
async function main() {
  activeFilms = films
  const galleryDesktop = render(await MadeWithKineoGallery({ locale: 'pt' }))
  activeFilms = [films[2]]
  const galleryMobile = render(await MadeWithKineoGallery({ locale: 'pt' }))
  activeFilms = []
  const empty = render(await MadeWithKineoGallery({ locale: 'pt' }))
  activeFilms = films
  const film = render(await MadeWithKineoFilm({ locale: 'pt', slug: films[0].slug }))
  const consentOff = (() => { state = 'off'; return render(React.createElement(Consent, { videoId: id })) })()
  const consentOn = (() => { state = 'on'; return render(React.createElement(Consent, { videoId: id })) })()
  state = 'on'
  const manage = render(await Manage({ searchParams: { videoId: id } }))
  const postBefore = `<div class="context"><p class="stateLabel">Filme pronto · contexto simplificado</p><h2>Seu arquivo está com você.</h2><button class="download">⬇ Download MP4</button><p class="notice">Neste ponto não havia controle de consentimento para aparecer na vitrine. O download era entregue normalmente.</p></div>`
  const postAfter = `<div class="context"><p class="stateLabel">Filme pronto · contexto simplificado</p><h2>Seu arquivo está com você.</h2><button class="download">⬇ Download MP4</button><div class="sideStates"><div><p class="stateLabel">Estado inicial · desligado</p>${consentOff}</div><div><p class="stateLabel">Após consentimento explícito · público</p>${consentOn}</div></div></div>`
  const myFile = 'app/(dashboard)/my-videos/MyVideosClient.tsx'
  const myPredicate = node => node.openingElement.tagName.getText() === 'div' && node.openingElement.getText().includes('flex items-center gap-2 flex-wrap') && node.getText().includes("'⬇ Download clean MP4'")
  const context = { Link, v: { id, video_url: 'data:video/mp4;base64,' }, isDownloading: false, isWatermarkedFastAsset: () => false, onDownload: noOp }
  const myBefore = renderExcerpt(excerpt(myFile, true, myPredicate), context)
  const myAfter = renderExcerpt(excerpt(myFile, false, myPredicate), context)
  const card = content => `<div class="context"><p class="stateLabel">My Videos · recorte dos controles reais</p><article class="fixture"><video poster="${films[0].posterUrl}" preload="none"></video><h3>O oceano em uma frase</h3>${content}</article></div>`
  const exFile = 'app/examples/page.tsx'
  const exLink = renderExcerpt(excerpt(exFile, false, node => node.openingElement.tagName.getText() === 'p' && node.getText().includes('Made with Kineo — films shared by their creators')), { Link })
  const ex = content => `<div class="context"><p class="stateLabel">/examples · contexto simplificado</p><h2>Watch what Kineo actually makes.</h2><div class="notice">Exemplos da casa e anúncios demonstrativos — blocos existentes preservados.</div>${content}<div class="notice">Review existente preservado.</div></div>`
  let groups = [
    group('gallery', '01 · Galeria pública', 'As rotas eram inexistentes. Depois: grade com consentimento explícito; primeiro cartão com tempo medido, segundo marcado como equipe e terceiro com língua/tempo desconhecidos. Mobile usa somente o terceiro fixture para mostrar a honestidade dos dados sem uma captura longa demais.', pair(before404, galleryDesktop, 'desktop', 1340, 'galeria preenchida') + pair(before404, galleryMobile, 'mobile', 1130, 'galeria preenchida') + pair(before404, empty, 'desktop', 960, 'galeria vazia') + pair(before404, empty, 'mobile', 920, 'galeria vazia')),
    group('film', '02 · Uma página por filme', 'O mesmo componente real do detalhe, com player, tema, língua, motor, tempo renderizado e CTA. O vídeo é demonstrativo; o poster vem de uma amostra da casa já versionada.', pair(before404, film, 'desktop', 930, 'detalhe do filme') + pair(before404, film, 'mobile', 1130, 'detalhe do filme')),
    group('consent', '03 · Consentimento depois do download', 'O controle real é renderizado com dois estados simulados de privacidade salva. Desligado por padrão; o estado Público mostra retirada, consequência sobre /v e link de gestão. O entorno do download é simplificado e não reproduz o restante da tela.', pair(postBefore, postAfter, 'desktop', 750, 'pós-download') + pair(postBefore, postAfter, 'mobile', 1040, 'pós-download')),
    group('manage', '04 · Retirada posterior pelo dono', 'Página real /made-with-kineo/manage com o controle salvo como Público. O título da página permanece em inglês conforme a implementação; o controle segue a língua da interface.', pair(before404, manage, 'desktop', 900, 'gestão de privacidade') + pair(before404, manage, 'mobile', 880, 'gestão de privacidade')),
    group('links', '05 · Caminhos para encontrar e gerenciar', 'My Videos usa os trechos JSX reais antes/depois da base. /examples mostra o link novo real entre blocos preservados, com contexto simplificado. As cores e utilitários essenciais foram incluídos inline para a comparação offline.', pair(card(myBefore), card(myAfter), 'desktop', 660, 'My Videos') + pair(card(myBefore), card(myAfter), 'mobile', 550, 'My Videos') + pair(ex(''), ex(exLink), 'desktop', 440, '/examples') + pair(ex(''), ex(exLink), 'mobile', 470, '/examples')),
  ]
  if (snapshotGroup) groups = groups.filter(group => group.includes(`data-group="${snapshotGroup}"`))
  const outer = `*{box-sizing:border-box}body{margin:0;background:#edf1f6;color:#142035;font:15px/1.6 Arial,sans-serif}body>header{max-width:1180px;margin:0 auto;padding:35px 10px 20px}h1{font-size:30px;line-height:1.15;letter-spacing:-1px;margin-bottom:14px}h2{font-size:25px;font-weight:600;margin:0 0 10px;letter-spacing:-.6px}.intro{max-width:1000px;color:#536178}nav{display:flex;gap:20px;flex-wrap:wrap}nav a{color:#135dba;text-decoration:none}.group{max-width:1180px;margin:20px auto 50px;padding:24px 10px;border-top:1px solid #c7d0de}.note{color:#536178;margin:0 0 22px;max-width:1100px;font-size:14px}.pair[hidden],.group[hidden]{display:none!important}.pair{display:grid;gap:30px;justify-content:center;margin:0 0 30px}.pair.desktop{grid-template-columns:560px 560px}.pair.mobile{grid-template-columns:390px 390px}.label{margin:0 0 8px;font-weight:700;font-size:11px;letter-spacing:1px;color:#6c7584}.label.after{color:#0a60b9}.screen{border-radius:14px;overflow:hidden;border:1px solid #c5cede;background:#080d16;box-shadow:0 4px 14px #1231}.screen iframe{display:block;border:0;transform-origin:top left;background:#080d16}.foot{max-width:1180px;margin:0 auto;padding:15px 10px 40px;color:#536178;font-size:13px}@media(max-width:950px){.pair{display:flex;flex-direction:column;align-items:center}.group{padding-left:20px;padding-right:20px}}`
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kineo · vitrine antes/depois · 26/10</title><style>${outer}</style><body><header><p>FATO CONFIRMADO · IMPLEMENTADO / PREVIEW LOCAL · 26/10/2026</p><h1>Feito com Kineo — comparação visual</h1><p style="font-size:12px;color:#536178">DADOS VISUAIS SIMULADOS · Sem clientes, consentimentos ou resultados reais.</p><p class="intro">Todas as seções alteradas, antes/depois, desktop e mobile. HTML dos componentes reais com <strong>dados visuais simulados</strong>; não são clientes, consentimentos ou resultados de produção. Os posters pertencem às amostras da casa já no repositório. Sem build, servidor, fontes ou recursos externos.</p><p class="intro">Tempo e contagem são fixtures para inspeção: no produto, intervalo de render medido e palavras do tema salvo. Onde não há dado, aparece “Não registrado”. O preview não comprova publicação, indexação, tráfego ou pagamento.</p><nav>${groups.map((_, i) => `<a href="#${['gallery','film','consent','manage','links'][i]}">${['Galeria','Filme','Consentimento','Privacidade','Links'][i]}</a>`).join('')}</nav></header>${groups.join('')}<p class="foot">Base imutável: ${BASE}. Estado UI: 925e12e2a. Componentes: MadeWithKineo, ShowcaseConsent e ManagePage; controles My Videos e link /examples extraídos de JSX. Iframes mantêm os breakpoints reais de 1120px e 390px. Fonte e hashes em preview-provenance.json.</p><script>const parameters=new URLSearchParams(location.search),mode=parameters.get('mode'),group=parameters.get('group');if(mode){document.querySelectorAll('.pair').forEach(x=>{if(!x.classList.contains(mode))x.hidden=true})}if(group){document.querySelectorAll('.group').forEach(x=>{x.hidden=x.dataset.group!==group});document.querySelector('body>header').style.paddingTop='15px';document.querySelector('body>header .intro').style.display='none';document.querySelectorAll('body>header .intro')[1].style.display='none';}</script></body></html>`
  fs.writeFileSync(path.join(__dirname, outputName), html)
  fs.writeFileSync(path.join(__dirname, 'preview-provenance.json'), JSON.stringify({ date: '2026-10-26', base: BASE, uiCommit: '925e12e2a', sources, fixtures: 'SIMULATED; no real customer, consent, timings or word counts', postDownloadContext: 'simplified; only ShowcaseConsent is the actual component', network: 'forbidden in renderer; data-only posters and empty data video in HTML' }, null, 2) + '\n')
  console.log(JSON.stringify({ html: outputName, sections: groups.length, sources: sources.length, bytes: Buffer.byteLength(html), network: 'none' }))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
