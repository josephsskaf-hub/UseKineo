// Offline evidence for exactly three catalog answers. Never executes the route's
// media loader: the FAQ section's actual JSX is extracted and rendered locally.
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const assert = require('assert/strict')
const crypto = require('crypto')
const { execFileSync } = require('child_process')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = process.cwd()
const baseline = 'f6e4e3e69b4d87e94789575dfdd155074019d3b7'
const catalogPath = 'lib/growth/enginePageCatalog.ts'
const routePath = 'app/ai-video-generator/[engine]/page.tsx'
const folder = 'docs/citacoes-faq-20260911'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const oldSource = file => execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, encoding: 'utf8' })
const normalize = text => text.replace(/\r\n/g, '\n')
const plain = value => JSON.parse(JSON.stringify(value))
const checks = []
const check = (name, fn) => { fn(); checks.push(name) }
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
let networkAttempts = 0
const rejectNetwork = () => { networkAttempts++; throw new Error('Network is blocked') }

function loader(catalogSource, publicFlag) {
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const box = { exports: {} }
    cache.set(file, box.exports)
    const source = file === catalogPath ? catalogSource : read(file)
    const compiled = ts.transpileModule(source, { fileName: file, compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
    } }).outputText
    const requireLocal = id => {
      if (id === '@/lib/engineLaunch') return { S25_PUBLIC: publicFlag }
      const resolved = path.resolve(id.startsWith('@/') ? path.join(root, id.slice(2)) : path.join(root, path.dirname(file), id)) + '.ts'
      assert.ok(resolved.startsWith(path.join(root, 'lib') + path.sep), `local library only: ${id}`)
      return load(path.relative(root, resolved).replaceAll('\\', '/'))
    }
    vm.runInNewContext(compiled, {
      module: box, exports: box.exports, require: requireLocal,
      process: { env: { NODE_ENV: 'test', KINEO_REVERSE_TRIAL_ENABLED: 'true' } },
      URL, URLSearchParams, fetch: rejectNetwork, XMLHttpRequest: rejectNetwork, WebSocket: rejectNetwork,
    }, { filename: file, timeout: 10000 })
    return box.exports
  }
  return load
}

const targets = [['kling', 0], ['veo', 0], ['seedance', 2]]
const beforeText = oldSource(catalogPath)
const afterText = read(catalogPath)
const scenarios = [false, true].map(flag => {
  const before = loader(beforeText, flag)(catalogPath)
  const after = loader(afterText, flag)(catalogPath)
  const expected = plain(before)
  for (const [slug, index] of targets) {
    assert.notEqual(after.ENGINES[slug].faq[index].a, before.ENGINES[slug].faq[index].a)
    expected.ENGINES[slug].faq[index].a = after.ENGINES[slug].faq[index].a
  }
  check(`only the three answers changed: S25_PUBLIC=${flag}`, () => assert.deepEqual(plain(after), expected))
  return { flag, engineCount: after.ENGINE_SLUGS.length, unchangedScopeSha256: hash(JSON.stringify(expected)) }
})
const current = loader(afterText, false)
const before = loader(beforeText, false)(catalogPath)
const after = current(catalogPath)
const offer = current('lib/freeTierOffer.ts')
const prices = current('lib/marketingPrice.ts')
const gate = current('lib/enginePlanGate.ts')

check('current independent credit fixtures and whole-film coverage', () => {
  assert.equal(offer.TRIAL_CREDITS_SHOWN, 30)
  assert.equal(prices.MARKETING_REFERENCE_SECONDS, 60)
  for (const [quality, credits, covered] of [['cinematic_ai', 25, 1], ['cinematic_kling', 50, 0], ['cinematic_veo', 100, 0]]) {
    assert.equal(prices.creditsPerReferenceVideo(quality), credits)
    assert.equal(offer.trialFilmsForEngine(credits), covered)
  }
})
check('present-day entry is free and current account gate allows all three engines', () => {
  assert.equal(current('lib/entryPolicy.ts').CARD_ENTRY_ONLY, false)
  for (const engine of ['seedance', 'kling', 'veo']) {
    assert.equal(gate.decideEngineGate({ engine, plan: 'free', profileCreatedAt: '2026-09-11T00:00:00.000Z' }).allowed, true)
  }
})
check('Kling and Veo explain insufficient balance independently of access', () => {
  for (const slug of ['kling', 'veo']) {
    const text = after.ENGINES[slug].faq[0].a
    assert.ok(text.includes('30 free credits'))
    assert.ok(text.includes('every engine unlocked and no card required'))
    assert.ok(text.includes(`${slug === 'kling' ? 50 : 100} credits`))
    assert.ok(text.includes('does not cover one complete reference film'))
    assert.ok(text.includes('paid plan with enough credits'))
  }
})
check('Seedance comparison replaces subjective ranking with budget and cost', () => {
  const text = after.ENGINES.seedance.faq[2].a
  for (const fragment of ['25 credits with Seedance 1.5', '50 with Kling 2.5', '100 with Veo 3.1', 'covers a complete Seedance reference film', 'remaining credits']) assert.ok(text.includes(fragment))
  assert.ok(!/stronger|best-value|lowest-cost|flagship|most expensive/.test(text))
})
check('all three repaired answers state the current watermark terms without old restrictions', () => {
  for (const [slug, index] of targets) {
    const text = after.ENGINES[slug].faq[index].a
    assert.ok(text.includes('Free-trial films carry a watermark; a paid plan unlocks clean downloads.'))
    assert.ok(!/80|Studio|\$/.test(text))
  }
})
check('route and finance/access sources are byte-identical to baseline', () => {
  for (const file of [routePath, 'lib/freeTierOffer.ts', 'lib/marketingPrice.ts', 'lib/entryPolicy.ts', 'lib/enginePlanGate.ts', 'lib/checkoutPricing.ts', 'lib/credits/engineCost.ts', 'app/llms.txt/route.ts']) assert.equal(normalize(read(file)), normalize(oldSource(file)), file)
})

const routeText = read(routePath)
const ast = ts.createSourceFile(routePath, routeText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let faqSection
let cardInitializer
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'section' && node.getText(ast).includes('e.faq.map')) faqSection = node.getText(ast)
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'CARD') cardInitializer = node.initializer.getText(ast)
  ts.forEachChild(node, visit)
}
visit(ast)
assert.ok(faqSection && cardInitializer)
const rendererSource = `const CARD = ${cardInitializer}; export const renderFaq = (e) => (${faqSection});`
const rendererJs = ts.transpileModule(rendererSource, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const rendererBox = { exports: {} }
vm.runInNewContext(rendererJs, { module: rendererBox, exports: rendererBox.exports, require: id => {
  assert.equal(id, 'react/jsx-runtime')
  return require(id)
} }, { timeout: 10000 })
const renderFaq = engine => renderToStaticMarkup(rendererBox.exports.renderFaq(engine))
const pairs = targets.map(([slug, index]) => {
  const oldFaq = before.ENGINES[slug].faq[index]
  const newFaq = after.ENGINES[slug].faq[index]
  const oldHtml = renderFaq({ faq: [oldFaq] })
  const newHtml = renderFaq({ faq: [newFaq] })
  check(`actual FAQ JSX renders the changed answer: ${slug}`, () => {
    assert.ok(newHtml.includes(newFaq.a))
    assert.ok(oldHtml.includes(oldFaq.q))
    assert.notEqual(newHtml, oldHtml)
  })
  return { slug, index, question: newFaq.q, before: oldHtml, after: newHtml }
})
check('no network, media loader or video generation was executed', () => assert.equal(networkAttempts, 0))
const doc = html => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#0a0a0b;color:#f5f5f7;font-family:Arial,sans-serif}*{box-sizing:border-box}main{max-width:900px;margin:auto;padding:0 20px 22px}</style></head><body><main>' + html + '</main></body></html>'
const data = JSON.stringify(pairs.map(pair => ({ slug: pair.slug, before: doc(pair.before), after: doc(pair.after) }))).replace(/</g, '\\u003c')
const preview = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Citações · três FAQs corrigidas</title><style>body{margin:0;background:#e9edf2;color:#142138;font:15px Arial,sans-serif}header{padding:22px;background:#fff}h1{font-size:23px;margin:0 0 10px}p{line-height:1.5}button{padding:10px 14px;margin-right:8px}section{padding:18px}h2{font-size:18px}h3{font-size:14px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}.frame{overflow:auto;background:#d4dce6;padding:12px}iframe{display:block;width:1100px;height:460px;border:0}body.mobile iframe{width:390px;height:580px}body.mobile .pair{grid-template-columns:repeat(2,minmax(420px,1fr))}@media(max-width:700px){.pair{display:block}.frame{margin-bottom:14px}}</style></head><body><header><h1>[Citações] Antes/depois · três FAQs de motores</h1><p>Base f6e4e3e6. JSX e estilos da seção real de FAQ, com somente a resposta tocada de cada motor. Nenhum build, servidor ou rede é necessário para visualizar. Textos antigos aparecem apenas no lado ANTES.</p><button id="desktop">Desktop · 1100 px</button><button id="mobile">Mobile · 390 px</button></header><main id="pairs"></main><script>const data=${data};const main=document.getElementById('pairs');for(const pair of data){const section=document.createElement('section');const h=document.createElement('h2');h.textContent='/ai-video-generator/'+pair.slug;section.appendChild(h);const grid=document.createElement('div');grid.className='pair';for(const key of ['before','after']){const frame=document.createElement('div');frame.className='frame';const label=document.createElement('h3');label.textContent=key==='before'?'ANTES · histórico':'DEPOIS · oferta atual';frame.appendChild(label);const iframe=document.createElement('iframe');iframe.title=pair.slug+' '+key;iframe.srcdoc=pair[key];frame.appendChild(iframe);grid.appendChild(frame)}section.appendChild(grid);main.appendChild(section)}document.getElementById('desktop').onclick=()=>document.body.classList.remove('mobile');document.getElementById('mobile').onclick=()=>document.body.classList.add('mobile');</script></body></html>`
fs.writeFileSync(path.join(root, folder, 'preview.html'), preview)
const result = {
  classification: 'TESTADO LOCALMENTE', timeUtc: new Date().toISOString(), baseline,
  method: 'Evaluate catalog against baseline with both public-engine flags; compare all fields except exactly three answers; render actual FAQ JSX extracted from unchanged route without importing media loaders.',
  checks, scenarios, changedAnswers: pairs.map(({ slug, index, question, before, after }) => ({ slug, index, question, beforeSha256: hash(before), afterSha256: hash(after) })),
  networkAttempts, generatedVideos: 0, passed: true,
}
fs.writeFileSync(path.join(root, folder, 'verification.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ passed: true, checks: checks.length, changedAnswers: pairs.length, networkAttempts }))
