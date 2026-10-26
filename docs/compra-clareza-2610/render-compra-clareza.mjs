// Usage: node docs/compra-clareza-2610/render-compra-clareza.mjs C:/kineo-wt/compra-clareza-2610
// Read-only source snapshot -> standalone SSR evidence. No app server, API, env file or browser request.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const DIR = path.dirname(fileURLToPath(import.meta.url))
assert.ok(process.argv[2], 'Pass the candidate worktree as the sole argument')
const ROOT = path.resolve(process.argv[2])
const BASE = '563d7f30064cb0e7ee392490d0e9e48e95c4e1bc'
const require = createRequire(path.join(ROOT, 'package.json'))
const React = require('react'), jsx = require('react/jsx-runtime'), ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
const GENERATE = 'app/(dashboard)/generate/GenerateClient.tsx', STUDIO = 'app/(dashboard)/studio/StudioClient.tsx'
const sourceCache = new Map(), provenance = []
const denied = () => { throw Error('Preview forbids network, storage, navigation and generation') }
const noOp = () => {}
const sha = data => createHash('sha256').update(data).digest('hex')
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 15 * 1024 * 1024 })
function read(file, base = false) {
  assert.ok(/^(app|components|lib)\//.test(file) && !file.includes('..') && !file.includes('.env'), file)
  const key = `${base ? BASE : 'candidate'}:${file}`
  if (!sourceCache.has(key)) {
    const text = (base ? git(['show', `${BASE}:${file}`]) : readFileSync(path.join(ROOT, file), 'utf8')).replace(/\r\n/g, '\n')
    sourceCache.set(key, text)
    provenance.push({ source: key, sha256: sha(text) })
  }
  return sourceCache.get(key)
}
function loader(base = false) {
  const cache = new Map()
  function load(spec, parent = '') {
    if (spec === 'react') return React
    if (spec === 'react/jsx-runtime') return jsx
    if (spec === '@/lib/analytics') return { trackEvent: noOp } // Explicit no-op event boundary; no visual/product mock.
    let rel = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? path.posix.join(path.posix.dirname(parent), spec) : spec
    assert.ok(/^(components|lib)\//.test(rel), `Unexpected import: ${rel}`)
    if (!/\.(tsx?|json)$/.test(rel)) {
      const found = ['.ts', '.tsx'].find(ext => existsSync(path.join(ROOT, rel + ext)))
      assert.ok(found, `Missing module: ${rel}`); rel += found
    }
    if (cache.has(rel)) return cache.get(rel)
    const text = read(rel, base)
    if (rel.endsWith('.json')) { const value = JSON.parse(text); cache.set(rel, value); return value }
    const exports = {}; cache.set(rel, exports)
    const code = ts.transpileModule(text, { fileName: rel, compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText
    vm.runInNewContext(code, { exports, require: name => load(name, rel), URL, URLSearchParams,
      fetch: denied, setTimeout: denied, process: { env: {} }, console: { log: noOp, warn: noOp, error: noOp },
    }, { filename: rel, timeout: 5000 })
    return exports
  }
  return load
}
function extract(file, base, predicate, expected = 1, index = 0) {
  const text = read(file, base), ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found = []
  function visit(node) { if (predicate(node, ast)) found.push(node); ts.forEachChild(node, visit) }
  visit(ast); assert.equal(found.length, expected, `AST anchor ${file}: expected ${expected}, found ${found.length}`)
  const node = found[index]
  provenance.push({ excerpt: `${base ? BASE : 'candidate'}:${file}`, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, sha256: sha(node.getText(ast)) })
  return node.getText(ast)
}
const opening = node => ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null
const tag = node => opening(node)?.tagName.getText()
const attribute = (node, name) => opening(node)?.attributes.properties.find(x => x.name?.text === name)?.initializer?.getText()
const hasRef = name => node => ts.isJsxElement(node) && attribute(node, 'ref') === `{${name}}`
function renderSource(source, context, label) {
  const exports = {}
  const code = ts.transpileModule(`exports.View = () => (<>${source}</>);`, { fileName: `${label}.tsx`, compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText
  vm.runInNewContext(code, { exports, require: name => { assert.equal(name, 'react/jsx-runtime'); return jsx }, ...context,
    fetch: denied, window: new Proxy({}, { get: denied }), setTimeout: denied,
  }, { filename: label, timeout: 5000 })
  return renderToStaticMarkup(React.createElement(exports.View))
}
const before = loader(true), after = loader(false)
function plan(base) {
  const load = base ? before : after
  const pricing = load('lib/checkoutPricing.ts')
  const source = extract(GENERATE, base, hasRef('cleanExportDirectRef'))
  return renderSource(source, {
    cleanExportDirectRef: { current: null }, watermarkedDownloadConfirmed: true,
    wmCheckout: { pending: null }, cleanExportTrialDoor: { visible: false, reason: 'preview_no_trial' },
    cleanExportTrialDoorTelemetry: {}, startCleanExportTrialCheckout: noOp,
    CleanFilmTrialDoor: load('components/CleanFilmTrialDoor.tsx').default,
    UiLabel: load('components/InterfaceLanguage.tsx').UiLabel,
    ...(base ? {} : { RecurringPlanValue: load('components/growth/RecurringPlanValue.tsx').default }),
    planFitQuality: 'fast', duration: 60, kineo1Shown: true, capacityLocale: 'en',
    hasPaid: false, cleanExportRebuildReady: true, handleRemoveWatermark: noOp, handleBuyThisVideoOnly: noOp,
    TIER_CREDITS: pricing.TIER_CREDITS, packPriceLabel: pricing.packPriceLabel,
    postVideoIntroPrice: pricing.formatCheckoutMoney('usd', pricing.getIntroPrice('starter', 'usd', 'standard')),
  }, `plan-${base ? 'before' : 'after'}`)
}
function review(base) {
  const source = extract(GENERATE, base, hasRef('nextEpisodeTopBtnRef'), 2, 1)
  const addition = base ? '' : extract(GENERATE, false, node => tag(node) === 'ResultScriptReview')
  return renderSource(source + addition, {
    nextEpisodeTopBtnRef: { current: null }, watermarkedDownloadConfirmed: true, handleContinueSeries: noOp,
    episode2Seed: 'Continue the lighthouse story.', episode2Engine: 'cinematic_ai', publicVideoId: 'offline-fixture',
    finalVideoUrl: null, prompt: 'A fisherman discovers why an old lighthouse never goes dark.', handleReviewResultScript: noOp,
    ...(base ? {} : { ResultScriptReview: after('components/growth/ResultScriptReview.tsx').default }),
  }, `review-${base ? 'before' : 'after'}`)
}
function idea(base) {
  const source = base
    ? extract(STUDIO, true, node => ts.isJsxElement(node) && tag(node) === 'div' && attribute(node, 'className') === '"row"' && attribute(node, 'style')?.includes('marginBottom: 8'))
    : extract(STUDIO, false, node => tag(node) === 'OwnIdeaStart')
  const field = extract(STUDIO, base, node => tag(node) === 'textarea' && attribute(node, 'className') === '"studio-prompt"')
  return renderSource(source + field, {
    UiLabel: (base ? before : after)('components/InterfaceLanguage.tsx').UiLabel,
    prompt: '', scriptMode: 'ai', chatGptQuickstart: null, searchSignature: '', promptRef: { current: null },
    setPrompt: noOp, setScriptMode: noOp, setChatGptQuickstart: noOp, recordMrr: noOp,
    t: text => text, isStandaloneHttpUrl: () => false,
    ...(base ? {} : {
      OwnIdeaStart: after('components/growth/OwnIdeaStart.tsx').default,
      ...after('lib/growth/ownIdeaStart.ts'),
    }),
  }, `idea-${base ? 'before' : 'after'}`)
}

const surfaces = [
  { key: 'plan', title: '1 · Plano na prática', before: plan(true), after: plan(false),
    note: 'Depois do download confirmado. Conta gratuita com Kineo 1 elegível; último filme Kineo 1 de 60 s. Porta de trial oculta. Valores da fonte canônica em USD.',
    old: 'Caixa real da base: plano e avulso, com créditos mensais.', new: 'Mesma caixa e ações. Capacidade mensal calculada, cálculo expandido e esclarecimento do avulso.' },
  { key: 'review', title: '2 · Revisar antes de gerar', before: review(true), after: review(false),
    note: 'Saída de episódio 2 com Seedance. O roteiro é uma fixture local, sem cliente ou vídeo real. O novo editor aparece expandido para inspeção; no app começa recolhido.',
    old: 'Botão real da base. Ainda não existe o bloco ResultScriptReview.', new: 'Botão atual e componente real de revisão. Editar o roteiro não modifica o arquivo concluído.' },
  { key: 'idea', title: '3 · Começar com algo seu', before: idea(true), after: idea(false),
    note: 'Studio no modo de ideia, campo vazio e chegada sem texto protegido. Referências abertas apenas para inspeção. Imagens públicas locais da Kineo; não são resultado do roteiro sugerido.',
    old: 'Faixa original e textarea real da base.', new: 'OwnIdeaStart real e o textarea real. As referências são opcionais; o caminho de anúncio permanece separado.' },
]
assert.match(surfaces[0].after, /Up to <strong>12<\/strong> new films \/ month/)
assert.doesNotMatch(surfaces[0].before, /data-post-video-capacity/)
assert.match(surfaces[1].after, /data-result-script-review/)
assert.match(surfaces[2].after, /data-kineo="own-idea-start"/)
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
function presentation(html) {
  // These transformations affect only the static evidence: open details and remove navigable targets.
  return html.replace(/<details>/g, '<details open>').replace(/href="([^"]*)"/g, (_, href) => `href="#" data-preview-href="${href}"`)
}
function pair(surface, size) {
  return `<div class="pair" data-size="${size}">${['before', 'after'].map(side => `<article class="comparison" data-version="${side}"><header><b>${side === 'before' ? 'ANTES' : 'DEPOIS'}</b><span>${size === 'desktop' ? 'Computador · 560 px' : 'Celular · 350 px'}</span></header><p class="annotation">${esc(side === 'before' ? surface.old : surface.new)}</p><div class="surface">${presentation(surface[side])}</div></article>`).join('')}</div>`
}
const font = readFileSync(path.join(ROOT, 'public/design/business-ads-20260924/manrope-latin.woff2'))
const candidateHead = git(['rev-parse', 'HEAD']).trim(), builtAt = new Date().toISOString()
let html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><title>Kineo · compra com clareza · antes e depois</title><style>
@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');font-weight:200 800;font-display:swap}
*{box-sizing:border-box}body{margin:0;background:#edf1f7;color:#17283d;font-family:Manrope,Arial,sans-serif;padding:28px;line-height:1.5}main{max-width:1200px;margin:auto}h1{font-size:28px;line-height:1.2;margin:8px 0 12px}h2{font-size:21px;margin:0}.eyebrow{font-size:11px;letter-spacing:.12em;font-weight:800;color:#46637c}.intro,.note{max-width:950px;font-size:13px;color:#566b80}.meta{font-size:11px;overflow-wrap:anywhere;color:#64768a}.toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:20px 0}.toolbar button,.toolbar select{font:inherit;font-size:12px;min-height:36px;border:1px solid #bdcbdc;border-radius:8px;background:#fff;color:#233950;padding:6px 11px}.tabs{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0 26px}.tabs button{font:inherit;font-size:13px;font-weight:750;border:1px solid #b9c9de;border-radius:10px;background:#fff;color:#344e6c;padding:11px 15px;cursor:pointer}.tabs button[aria-selected=true]{background:#235ddd;color:white;border-color:#235ddd}.panel[hidden]{display:none}.pair{display:flex;align-items:flex-start;gap:20px;margin:24px 0 36px;flex-wrap:wrap}.comparison{min-width:0;width:560px}.pair[data-size=mobile] .comparison{width:350px}.comparison>header{display:flex;align-items:center;justify-content:space-between;font-size:11px;gap:10px}.comparison>header b{letter-spacing:.1em}.comparison>header span{color:#657a90}.annotation{font-size:12px;line-height:1.45;color:#5b6e82;min-height:36px}.surface{--font-sans:Manrope,Arial,sans-serif;--text:#162b3f;--text2:#344a60;--muted:#627488;--muted2:#607184;--border:#d8e1ea;--card:#fff;--card2:#f6f8fc;--accent:#235ddd;--accent-soft:#eaf0ff;--on-accent:#fff;--sh-card:0 2px 8px #1a365810;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:16px;padding:20px;min-width:0;box-shadow:0 8px 25px #142f4d08;overflow-wrap:anywhere;font-family:var(--font-sans)}.surface button,.surface textarea{font-family:inherit}.surface button,.surface a{cursor:default!important}.surface p{margin-top:0}.surface .row{display:flex;flex-wrap:wrap;gap:6px}.surface .pill{font:inherit;font-size:12px;min-height:34px;border:1px solid var(--border);border-radius:9px;background:var(--card2);color:var(--text2);padding:7px 10px}.surface .studio-prompt{display:block;width:100%;min-height:140px;border:1px solid var(--border);background:var(--card2);color:var(--text);border-radius:12px;padding:12px;font:inherit;font-size:14px;resize:vertical;margin-top:12px}.surface .mt-4{margin-top:16px}.surface .rounded-xl{border-radius:12px}.surface .text-xs{font-size:12px}.surface .flex{display:flex}.surface .w-full{width:100%}.surface .flex-col{flex-direction:column}.surface .items-center{align-items:center}.surface .justify-center{justify-content:center}.surface .px-5{padding-inline:20px}.surface .py-3\.5{padding-block:14px}.surface .font-black{font-weight:850}.surface .text-center{text-align:center}.foot{padding:18px 0;border-top:1px solid #ccd6e1;font-size:12px;color:#5f7288}.toast{font-size:12px;min-height:24px;color:#4c6481}.size-mobile .pair[data-size=desktop],.size-desktop .pair[data-size=mobile]{display:none}body[data-theme=dark] .surface{--text:#f5f5f7;--text2:#dadce3;--muted:#a1a1aa;--muted2:#a1a1aa;--border:#383843;--card:#161618;--card2:#202025;--accent:#2997ff;--accent-soft:#192b40;--on-accent:#fff;background:var(--card);color:var(--text)}@media(max-width:620px){body{padding:16px}h1{font-size:23px}.comparison,.pair[data-size=mobile] .comparison{width:100%}.surface{padding:15px}.tabs button{flex:1;font-size:11px;padding:9px}.pair{gap:26px}}
</style></head><body><main><div class="eyebrow">KINEO · EVIDÊNCIA LOCAL · 26/10/2026</div><h1>Como está e como fica</h1><p class="intro">As três mudanças aprovadas, renderizadas a partir dos componentes reais. “Antes” é o código da base indicada abaixo; não é uma captura de produção. As ações de compra, geração e navegação estão bloqueadas neste documento.</p><p class="meta">Base: ${BASE} · candidato: ${candidateHead} · captura das fontes: ${builtAt}. Os hashes das fontes e trechos estão no arquivo de proveniência.</p><nav class="tabs" role="tablist" aria-label="Mudança">${surfaces.map((s, i) => `<button id="tab-${s.key}" role="tab" aria-controls="panel-${s.key}" aria-selected="${i === 0}" data-tab="${s.key}">${esc(s.title)}</button>`).join('')}</nav><div class="toolbar"><label>Tamanho <select id="size"><option value="both">Computador e celular</option><option value="desktop">Computador</option><option value="mobile">Celular</option></select></label><button id="theme" type="button">Alternar claro / escuro</button><label><input id="expanded" type="checkbox" checked> Detalhes expandidos para inspeção</label></div><p class="toast" role="status" id="preview-status">Prévia local. Botões de produto não executam ações.</p>${surfaces.map((s, i) => `<section class="panel" id="panel-${s.key}" role="tabpanel" aria-labelledby="tab-${s.key}" ${i ? 'hidden' : ''}><h2>${esc(s.title)}</h2><p class="note">${esc(s.note)}</p>${pair(s, 'desktop')}${pair(s, 'mobile')}</section>`).join('')}<p class="foot">Proveniência: extração AST de GenerateClient e StudioClient; componentes RecurringPlanValue, ResultScriptReview e OwnIdeaStart executados por React SSR com seus helpers e textos reais. UiLabel usa seu contexto real padrão em inglês. Telemetria é no-op. Tema e classes utilitárias são uma moldura local de comparação; Manrope e imagens são arquivos públicos locais incorporados. Não comprova exposição, geração, pagamento ou funcionamento em produção.</p></main><script>
const args=new URLSearchParams(location.search);function chooseTab(key){document.querySelectorAll('[data-tab]').forEach(el=>el.setAttribute('aria-selected',String(el.dataset.tab===key)));document.querySelectorAll('.panel').forEach(el=>el.hidden=el.id!=='panel-'+key)}document.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click',()=>chooseTab(el.dataset.tab)));if(['plan','review','idea'].includes(args.get('tab')))chooseTab(args.get('tab'));const size=document.querySelector('#size');function resize(){document.body.classList.remove('size-desktop','size-mobile');if(size.value!=='both')document.body.classList.add('size-'+size.value)}if(['desktop','mobile'].includes(args.get('size')))size.value=args.get('size');size.addEventListener('change',resize);resize();document.querySelector('#theme').addEventListener('click',()=>document.body.dataset.theme=document.body.dataset.theme==='dark'?'light':'dark');document.body.dataset.theme=args.get('theme')==='dark'?'dark':'light';const expanded=document.querySelector('#expanded');if(args.get('expanded')==='0')expanded.checked=false;function expand(){document.querySelectorAll('.surface details').forEach(el=>el.open=expanded.checked)}expanded.addEventListener('change',expand);expand();document.addEventListener('click',event=>{const button=event.target.closest('.surface button,.surface a');if(button){event.preventDefault();event.stopPropagation();document.querySelector('#preview-status').textContent='Ação bloqueada na prévia: nenhuma geração, compra ou navegação.'}},true);
</script></body></html>`
html = html.replace(/src="(\/posters\/[^"<>]+)"/g, (_, asset) => {
  const resolved = path.resolve(ROOT, 'public', '.' + asset)
  assert.ok(resolved.startsWith(path.resolve(ROOT, 'public/posters') + path.sep), 'Owned poster path required')
  const bytes = readFileSync(resolved)
  provenance.push({ asset, sha256: sha(bytes) })
  return `src="data:image/${asset.endsWith('.png') ? 'png' : asset.endsWith('.jpg') || asset.endsWith('.jpeg') ? 'jpeg' : 'webp'};base64,${bytes.toString('base64')}"`
})
// React 19 can emit preloads for eager images; keep the standalone document entirely offline.
html = html.replace(/<link rel="preload"[^>]*>/g, '')
assert.doesNotMatch(html, /(?:src|href)="https?:\/\//)
const output = path.join(DIR, 'compra-clareza-preview.html')
writeFileSync(output, html, 'utf8')
writeFileSync(path.join(DIR, 'compra-clareza-preview-provenance.json'), JSON.stringify({
  builtAt, sourceRoot: ROOT, base: BASE, candidateHead, htmlSha256: sha(html),
  fixtures: { locale: 'en', tier: 'starter', quality: 'fast', seconds: 60, kineo1Allowed: true, hasPaid: false, trialVisible: false, cleanExportRebuildReady: true },
  effects: 'No APIs, network, credentials, generation, checkout or storage. Analytics boundary is no-op. SSR only.',
  sources: provenance,
}, null, 2) + '\n')
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(html), surfaces: surfaces.map(s => s.key), base: BASE, candidateHead, sources: provenance.length }))
