// Local evidence/preview only. No credentials, route calls or production scripts.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict')
const { execFileSync } = require('child_process')
const ts = require('typescript'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const root = process.cwd(), baseline = 'fac4ec98573fd5a106d6861dffded8e53b5e733a'
const file = 'app/cheapest-ai-shorts-maker/page.tsx', folder = 'docs/citacoes-calculadora-20260911'
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n')
const before = execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8', cwd: root }).replace(/\r\n/g, '\n')
const after = read(file)
const changes = [
  ['{ CHECKOUT_CURRENCY_DISCLOSURE, creditsPerReferenceVideo }', '{ creditsPerReferenceVideo }'],
  ['${CHECKOUT_CURRENCY_DISCLOSURE}', 'Prices shown here are in USD. Customers in Brazil pay in BRL (reais); check checkout for the amount in reais.'],
  ['Paid plans unlock clean exports and premium AI engines.', 'Paid plans unlock clean exports.'],
  ['USD prices matched to Checkout', 'USD reference prices · Brazil pays in BRL'],
]
let expected = before
for (const [old, next] of changes) { assert.equal(expected.split(old).length, 2); expected = expected.replace(old, next) }
assert.equal(after, expected, 'Only the requested import and three copy replacements may change')
let networkAttempts = 0
const rejectNetwork = () => { networkAttempts++; throw new Error('Network disabled in local preview') }
function createLoader(flag) {
  const cache = new Map()
  return function load(name) {
    if (cache.has(name)) return cache.get(name)
    const box = { exports: {} }; cache.set(name, box.exports)
    const js = ts.transpileModule(read(name), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
    vm.runInNewContext(js, { module: box, exports: box.exports, process: { env: { NODE_ENV: 'test', KINEO_REVERSE_TRIAL_ENABLED: String(flag) } }, URL, URLSearchParams, fetch: rejectNetwork, XMLHttpRequest: rejectNetwork, WebSocket: rejectNetwork, require: id => {
      const resolved = path.resolve(id.startsWith('@/') ? path.join(root, id.slice(2)) : path.join(root, path.dirname(name), id)) + '.ts'
      assert.ok(resolved.startsWith(path.join(root, 'lib') + path.sep), 'Only pure local library dependencies')
      return load(path.relative(root, resolved).replaceAll('\\', '/'))
    } }, { timeout: 10000 })
    return box.exports
  }
}
function compile(source, flag) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), nodes = []
  function visit(n) { nodes.push(n); ts.forEachChild(n, visit) } visit(ast)
  const jsx = (tag, marker) => nodes.filter(n => ts.isJsxElement(n) && n.openingElement.tagName.getText(ast) === tag && n.getText(ast).includes(marker)).sort((a, b) => a.getText(ast).length - b.getText(ast).length)[0].getText(ast)
  const chip = jsx('p', 'OFFER.copy.chip')
  const faqGrid = jsx('div', '{FAQ.map')
  const augmented = source + '\nexport const previewChip = () => (' + chip + ');\nexport const previewFaq = () => (' + faqGrid + ');\nexport const previewAnswers = FAQ;\n'
  const box = { exports: {} }, load = createLoader(flag)
  const stubs = new Set(['@/components/StickyFreeShortCTA', '@/components/Footer', '@/components/OrganicCtaLink', '@/app/youtube-shorts-from-topic/TopicGeneratorForm', './ShortCostCalculator', '@/components/AgencyVolumeBridge'])
  const js = ts.transpileModule(augmented, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(js, { module: box, exports: box.exports, require: id => {
    if (id === 'react/jsx-runtime') return require(id)
    if (id === 'next/link') return ({ children, ...props }) => React.createElement('a', props, children)
    if (stubs.has(id)) return () => null
    if (id.startsWith('@/lib/')) return load(id.slice(2) + '.ts')
    throw new Error('Unexpected import: ' + id)
  }, fetch: rejectNetwork, XMLHttpRequest: rejectNetwork, WebSocket: rejectNetwork }, { timeout: 10000 })
  return box.exports
}
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
const evidence = []
let rendered
for (const flag of [false, true]) {
  const old = compile(before, flag), next = compile(after, flag)
  for (const [state, value] of [['before', old], ['after', next]]) {
    const html = renderToStaticMarkup(value.default())
    const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
    const faqHtml = renderToStaticMarkup(value.previewFaq())
    assert.equal(jsonLd.mainEntity.length, value.previewAnswers.length)
    for (const entry of jsonLd.mainEntity) {
      assert.ok(faqHtml.includes('>' + escape(entry.name) + '</div>'))
      assert.ok(faqHtml.includes('>' + escape(entry.acceptedAnswer.text) + '</div>'))
    }
    evidence.push({ flag, state, faqCount: value.previewAnswers.length, htmlJsonLdAgree: true })
  }
  for (let i = 1; i < old.previewAnswers.length - 1; i++) assert.equal(JSON.stringify(next.previewAnswers[i]), JSON.stringify(old.previewAnswers[i]))
  assert.ok(next.previewAnswers[0].a.startsWith(old.previewAnswers[0].a.split('Kineo lists and charges plan prices')[0]))
  assert.equal(next.previewAnswers.at(-1).a, old.previewAnswers.at(-1).a.replace(changes[2][0], changes[2][1]))
  if (flag) rendered = { old, next }
}
assert.equal(networkAttempts, 0)
const card = answer => '<div style="background:#161618;border:1px solid #2a2a2d;border-radius:14px;padding:16px 18px"><div style="font-weight:700;color:#f5f5f7">' + escape(answer.q) + '</div><div style="font-size:14px;color:#86868b;margin-top:6px;line-height:1.6">' + escape(answer.a) + '</div></div>'
const contexts = [
  { label: 'Chip de moeda abaixo dos CTAs', before: renderToStaticMarkup(rendered.old.previewChip()), after: renderToStaticMarkup(rendered.next.previewChip()) },
  { label: 'FAQ · moeda da compra', before: card(rendered.old.previewAnswers[0]), after: card(rendered.next.previewAnswers[0]) },
  { label: 'FAQ · teste e exportação limpa', before: card(rendered.old.previewAnswers.at(-1)), after: card(rendered.next.previewAnswers.at(-1)) },
]
const srcdoc = html => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;background:#000;color:#f5f5f7;font-family:Arial,sans-serif}main{max-width:820px;padding:20px;margin:auto}</style></head><body><main>' + html + '</main></body></html>'
const pairs = contexts.map(c => ({ label: c.label, before: srcdoc(c.before), after: srcdoc(c.after) }))
const data = JSON.stringify(pairs).replace(/</g, '\\u003c')
const preview = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Citações · copy factual da calculadora</title><style>body{margin:0;background:#e9edf2;color:#142138;font:15px Arial,sans-serif}header{padding:22px;background:#fff}h1{font-size:23px;margin:0 0 10px}p{line-height:1.5}button{padding:10px 14px;margin-right:8px}section{padding:18px}h2{font-size:18px}h3{font-size:14px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}.frame{overflow:auto;background:#d4dce6;padding:12px}iframe{display:block;width:1100px;height:250px;border:0}body.mobile iframe{width:390px;height:490px}body.mobile .pair{grid-template-columns:repeat(2,minmax(420px,1fr))}@media(max-width:700px){.pair{display:block}.frame{margin-bottom:14px}}</style></head><body><header><h1>[Citações] Moeda e acesso na calculadora</h1><p>FATO CONFIRMADO · comparação do código na base fac4ec98 com a alteração local de 11/09/2026. Três frases, com copy de trial derivada de flag ON. TESTADO LOCALMENTE · recortes estáticos; validação Next/browser e publicação ficam com a pista principal.</p><button id="desktop">Desktop · 1100 px</button><button id="mobile">Mobile · 390 px</button></header><main id="pairs"></main><script>const data=${data};for(const pair of data){const section=document.createElement('section');const h=document.createElement('h2');h.textContent=pair.label;section.appendChild(h);const grid=document.createElement('div');grid.className='pair';for(const key of ['before','after']){const frame=document.createElement('div');frame.className='frame';const label=document.createElement('h3');label.textContent=key==='before'?'ANTES':'DEPOIS';frame.appendChild(label);const iframe=document.createElement('iframe');iframe.title=pair.label+' '+key;iframe.srcdoc=pair[key];frame.appendChild(iframe);grid.appendChild(frame)}section.appendChild(grid);document.getElementById('pairs').appendChild(section)}document.getElementById('desktop').onclick=()=>document.body.classList.remove('mobile');document.getElementById('mobile').onclick=()=>document.body.classList.add('mobile');</script></body></html>`
fs.writeFileSync(path.join(root, folder, 'preview.html'), preview)
fs.writeFileSync(path.join(root, folder, 'verification.json'), JSON.stringify({ classification: 'TESTADO LOCALMENTE', timeUtc: new Date().toISOString(), baseline, source: file, sourceOnlyExpectedFourReplacements: true, unchangedMiddleFaqAnswers: true, flags: evidence, sections: 3, viewports: [1100, 390], networkAttempts, method: 'One-time structural verification and static SSR of real page body with unrelated child components omitted. Pure offer/credit helpers evaluated from actual source. Root will verify full Next route and browser.', passed: true }, null, 2) + '\n')
console.log(JSON.stringify({ passed: true, contexts: contexts.length, flags: evidence, networkAttempts }))
