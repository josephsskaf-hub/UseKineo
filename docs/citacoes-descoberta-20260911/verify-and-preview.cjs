// Local source/SSR verification for four contextual links; no route/media calls.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict')
const { execFileSync } = require('child_process')
const ts = require('typescript'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const root = process.cwd(), baseline = '679b789c3381c914392a8c56ed150226a6af341e'
const folder = 'docs/citacoes-descoberta-20260911'
const route = 'app/ai-video-generator/[engine]/page.tsx', calculator = 'app/cheapest-ai-shorts-maker/page.tsx'
const targets = ['/ai-video-generator/complete-60-second-shorts-cost', '/vs/invideo-alternatives-faceless-shorts']
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const old = file => execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n')
const checks = [], check = (name, fn) => { fn(); checks.push(name) }
let networkAttempts = 0
const rejectNetwork = () => { networkAttempts++; throw new Error('Network blocked') }
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const box = { exports: {} }; cache.set(file, box.exports)
  const code = ts.transpileModule(read(file), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, { module: box, exports: box.exports, require: id => {
    const resolved = path.resolve(id.startsWith('@/') ? path.join(root, id.slice(2)) : path.join(root, path.dirname(file), id)) + '.ts'
    assert.ok(resolved.startsWith(path.join(root, 'lib') + path.sep))
    return load(path.relative(root, resolved).replaceAll('\\', '/'))
  }, process: { env: { NODE_ENV: 'test', KINEO_REVERSE_TRIAL_ENABLED: 'true' } }, URL, URLSearchParams, fetch: rejectNetwork, XMLHttpRequest: rejectNetwork, WebSocket: rejectNetwork }, { timeout: 10000 })
  return box.exports
}
function inspect(text, file) {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), nodes = [], vars = new Map()
  function visit(node) { nodes.push(node); if (ts.isVariableDeclaration(node)) vars.set(node.name.getText(ast), node.initializer?.getText(ast)); ts.forEachChild(node, visit) }
  visit(ast)
  const jsx = (tag, marker) => nodes.find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === tag && node.getText(ast).includes(marker))?.getText(ast)
  return { ast, nodes, vars, jsx }
}
const routeBefore = old(route), routeAfter = read(route), calcBefore = old(calculator), calcAfter = read(calculator)
const engine = inspect(routeAfter, route), calcOld = inspect(calcBefore, calculator), calcNew = inspect(calcAfter, calculator)
const additionNode = engine.nodes.find(node => ts.isJsxExpression(node) && node.expression && ts.isConditionalExpression(node.expression) && node.expression.condition.getText(engine.ast) === "params.engine === 'seedance'")
assert.ok(additionNode)
const addition = additionNode.getText(engine.ast), expression = additionNode.expression.getText(engine.ast)
const oldParagraph = calcOld.jsx('p', 'Every video lets you choose the engine.'), newParagraph = calcNew.jsx('p', 'Every video lets you choose the engine.')
check('only Seedance conditional and calculator paragraph changed', () => {
  assert.equal(routeAfter.replace(`        ${addition}\n\n`, ''), routeBefore)
  assert.equal(calcAfter.replace(newParagraph, oldParagraph), calcBefore)
})
check('both exact destinations exist and their sources remain unchanged', () => {
  for (const destination of targets) {
    const file = `app${destination}/page.tsx`
    assert.ok(fs.existsSync(path.join(root, file)))
    assert.equal(read(file), old(file))
  }
})
const costFunction = engine.nodes.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'engineCostLabel').getText(engine.ast)
const renderSource = `
  const CARD = ${engine.vars.get('CARD')}; ${costFunction}
  const h2 = ${calcNew.vars.get('h2')}, p = ${calcNew.vars.get('p')};
  export const engineContext = (e, params) => (<>${engine.jsx('section', 'Smallest monthly grant that covers one')}${addition}</>);
  export const engineBefore = (e) => (${engine.jsx('section', 'Smallest monthly grant that covers one')});
  export const linkAddition = (params) => (${expression});
  export const calcBefore = (FAST_CREDITS, SEEDANCE_CREDITS, KLING_CREDITS) => (<>${calcOld.jsx('h2', 'Pick the right engine')}${oldParagraph}</>);
  export const calcAfter = (FAST_CREDITS, SEEDANCE_CREDITS, KLING_CREDITS) => (<>${calcNew.jsx('h2', 'Pick the right engine')}${newParagraph}</>);
`
const box = { exports: {} }
const js = ts.transpileModule(renderSource, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
vm.runInNewContext(js, { module: box, exports: box.exports, Link: ({ children, ...props }) => React.createElement('a', props, children), require: id => { assert.equal(id, 'react/jsx-runtime'); return require(id) } }, { timeout: 10000 })
const render = (name, ...args) => renderToStaticMarkup(box.exports[name](...args))
const catalog = load('lib/growth/enginePageCatalog.ts'), pricing = load('lib/marketingPrice.ts')
const costs = ['fast', 'cinematic_ai', 'cinematic_kling'].map(quality => pricing.creditsPerReferenceVideo(quality))
const seedance = catalog.ENGINES.seedance
const seedanceBefore = render('engineBefore', seedance), seedanceAfter = render('engineContext', seedance, { engine: 'seedance' })
const calculatorBefore = render('calcBefore', ...costs), calculatorAfter = render('calcAfter', ...costs)
check('new engine paragraph renders only for Seedance', () => {
  for (const slug of catalog.ENGINE_SLUGS) {
    const html = render('linkAddition', { engine: slug })
    if (slug === 'seedance') assert.equal((html.match(/<a /g) ?? []).length, 2)
    else assert.equal(html, '')
  }
})
check('four normal links use exact guide URLs without campaigns or events', () => {
  for (const html of [render('linkAddition', { engine: 'seedance' }), calculatorAfter.slice(calculatorBefore.length - 4)]) {
    for (const destination of targets) assert.ok(html.includes(`href="${destination}"`))
    assert.ok(!/utm_|intent_campaign|organic_cta|onClick/.test(html))
  }
  for (const text of [addition, newParagraph]) {
    for (const destination of targets) assert.ok(text.includes(`<Link href="${destination}"`))
  }
})
check('calculator keeps existing paragraph, links and real credit values', () => {
  assert.ok(calculatorAfter.startsWith(calculatorBefore.slice(0, -4)))
  for (const url of ['/pricing', '/alternatives']) assert.ok(calculatorAfter.includes(`href="${url}"`))
  assert.ok(seedanceAfter.startsWith(seedanceBefore))
  assert.equal(networkAttempts, 0)
})
const doc = (html, width) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#000;color:#f5f5f7;font-family:Arial,sans-serif}*{box-sizing:border-box}main{max-width:' + width + 'px;margin:auto;padding:28px 18px 30px}</style></head><body><main>' + html + '</main></body></html>'
const pairs = [
  { label: 'Seedance · ficha técnica e referências de leitura', before: doc(seedanceBefore, 980), after: doc(seedanceAfter, 980) },
  { label: 'Calculadora · escolha de motor e referências de leitura', before: doc(calculatorBefore, 820), after: doc(calculatorAfter, 820) },
]
const data = JSON.stringify(pairs).replace(/</g, '\\u003c')
const preview = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Citações · descoberta dos guias</title><style>body{margin:0;background:#e9edf2;color:#142138;font:15px Arial,sans-serif}header{padding:22px;background:#fff}h1{font-size:23px;margin:0 0 10px}p{line-height:1.5}button{padding:10px 14px;margin-right:8px}section{padding:18px}h2{font-size:18px}h3{font-size:14px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}.frame{overflow:auto;background:#d4dce6;padding:12px}iframe{display:block;width:1100px;height:680px;border:0}body.mobile iframe{width:390px;height:920px}body.mobile .pair{grid-template-columns:repeat(2,minmax(420px,1fr))}@media(max-width:700px){.pair{display:block}.frame{margin-bottom:14px}}</style></head><body><header><h1>[Citações] Quatro links para guias existentes</h1><p>Antes/depois da base 679b789c. JSX real das duas seções, sem build, servidor ou rede. A ficha técnica preserva os estilos existentes; nenhum vídeo é carregado.</p><button id="desktop">Desktop · 1100 px</button><button id="mobile">Mobile · 390 px</button></header><main id="pairs"></main><script>const data=${data};const main=document.getElementById('pairs');for(const pair of data){const section=document.createElement('section');const h=document.createElement('h2');h.textContent=pair.label;section.appendChild(h);const grid=document.createElement('div');grid.className='pair';for(const key of ['before','after']){const frame=document.createElement('div');frame.className='frame';const label=document.createElement('h3');label.textContent=key==='before'?'ANTES':'DEPOIS';frame.appendChild(label);const iframe=document.createElement('iframe');iframe.title=pair.label+' '+key;iframe.srcdoc=pair[key];frame.appendChild(iframe);grid.appendChild(frame)}section.appendChild(grid);main.appendChild(section)}document.getElementById('desktop').onclick=()=>document.body.classList.remove('mobile');document.getElementById('mobile').onclick=()=>document.body.classList.add('mobile');</script></body></html>`
fs.writeFileSync(path.join(root, folder, 'preview.html'), preview)
fs.writeFileSync(path.join(root, folder, 'verification.json'), JSON.stringify({ classification: 'TESTADO LOCALMENTE', timeUtc: new Date().toISOString(), baseline, method: 'Source minimality, actual JSX render, real helper costs and exact existing route destinations; no route, media or external calls.', checks, targets, engineSlugsChecked: catalog.ENGINE_SLUGS, networkAttempts, generatedVideos: 0, passed: true }, null, 2) + '\n')
console.log(JSON.stringify({ passed: true, checks: checks.length, sections: pairs.length, networkAttempts }))
