// Local-only proof for two grant labels. Real JSX is extracted without executing
// routes, fetching account media, opening a browser or touching environment files.
const fs = require('fs'), path = require('path'), vm = require('vm')
const assert = require('assert/strict'), crypto = require('crypto')
const { execFileSync } = require('child_process')
const ts = require('typescript'), React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = process.cwd(), baseline = '9bf0525e799e311191aa076593daed6b7b4aff86'
const folder = 'docs/citacoes-grant-20260911', catalog = 'lib/growth/enginePageCatalog.ts'
const route = 'app/ai-video-generator/[engine]/page.tsx', hub = 'app/ai-video-generator/page.tsx'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const old = file => execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, encoding: 'utf8' })
const normalize = text => text.replace(/\r\n/g, '\n')
const plain = value => JSON.parse(JSON.stringify(value))
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const checks = [], check = (name, fn) => { fn(); checks.push(name) }
let networkAttempts = 0
const rejectNetwork = () => { networkAttempts++; throw new Error('Network blocked') }
function loader(catalogText) {
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const box = { exports: {} }; cache.set(file, box.exports)
    const text = file === catalog ? catalogText : read(file)
    const output = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
    vm.runInNewContext(output, {
      module: box, exports: box.exports, require: id => {
        const resolved = path.resolve(id.startsWith('@/') ? path.join(root, id.slice(2)) : path.join(root, path.dirname(file), id)) + '.ts'
        assert.ok(resolved.startsWith(path.join(root, 'lib') + path.sep))
        return load(path.relative(root, resolved).replaceAll('\\', '/'))
      },
      process: { env: { NODE_ENV: 'test', KINEO_REVERSE_TRIAL_ENABLED: 'true' } },
      URL, URLSearchParams, fetch: rejectNetwork, XMLHttpRequest: rejectNetwork, WebSocket: rejectNetwork,
    }, { filename: file, timeout: 10000 })
    return box.exports
  }
  return load
}
const beforeText = normalize(old(catalog)), afterText = normalize(read(catalog))
check('source delta is exactly two tier values', () => assert.equal(afterText, beforeText
  .replace("creditCost: KLING_COST,\n    tier: 'Studio'", "creditCost: KLING_COST,\n    tier: 'Starter'")
  .replace("creditCost: VEO_COST,\n    tier: 'Studio'", "creditCost: VEO_COST,\n    tier: 'Creator'")))
const before = loader(beforeText), after = loader(afterText)
const beforeCatalog = before(catalog), afterCatalog = after(catalog)
const prices = after('lib/checkoutPricing.ts'), marketing = after('lib/marketingPrice.ts')
const offer = after('lib/freeTierOffer.ts')
const grants = [['starter', 'Starter'], ['basic', 'Creator'], ['pro', 'Studio']].map(([key, label]) => ({ label, credits: prices.TIER_CREDITS[key] }))
const targets = ['kling', 'veo']
check('first sufficient monthly grant comes from current helpers', () => {
  assert.deepEqual(grants.map(item => item.credits), [60, 150, 300])
  assert.equal(marketing.creditsPerReferenceVideo('cinematic_kling'), 50)
  assert.equal(marketing.creditsPerReferenceVideo('cinematic_veo'), 100)
  for (const slug of targets) {
    const engine = afterCatalog.ENGINES[slug]
    const cost = marketing.creditsPerReferenceVideo(engine.qualityMode)
    assert.equal(engine.creditCost, cost)
    assert.equal(engine.tier, grants.find(grant => grant.credits >= cost).label)
  }
})
check('all other catalog fields and slugs remain identical', () => {
  const expected = plain(beforeCatalog)
  expected.ENGINES.kling.tier = 'Starter'; expected.ENGINES.veo.tier = 'Creator'
  assert.deepEqual(plain(afterCatalog), expected)
})
check('route/hub and protected sources remain byte-identical', () => {
  for (const file of [route, hub, 'lib/checkoutPricing.ts', 'lib/marketingPrice.ts', 'lib/freeTierOffer.ts', 'lib/enginePlanGate.ts', 'lib/entryPolicy.ts']) assert.equal(normalize(read(file)), normalize(old(file)), file)
})

function inspect(file) {
  const text = read(file), ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const nodes = [], variables = new Map()
  function visit(node) {
    nodes.push(node)
    if (ts.isVariableDeclaration(node)) variables.set(node.name.getText(ast), node.initializer?.getText(ast))
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return {
    text, ast, variables,
    section: marker => nodes.find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'section' && node.getText(ast).includes(marker))?.getText(ast),
    paragraph: marker => nodes.find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'p' && node.getText(ast).includes(marker))?.getText(ast),
    fn: name => nodes.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)?.getText(ast),
  }
}
const engineSource = inspect(route), hubSource = inspect(hub)
const parts = {
  hero: engineSource.paragraph('{tierNote}'),
  technical: engineSource.section('Smallest monthly grant that covers one'),
  comparison: engineSource.section('Every engine, side by side'),
  hub: hubSource.section('perEngine.map'),
}
for (const [name, text] of Object.entries(parts)) assert.ok(text, `missing real JSX ${name}`)
const renderSource = `
  const CARD = ${engineSource.variables.get('CARD')};
  ${engineSource.fn('engineCostLabel')}
  export const hero = (e, TRIAL_CREDITS_SHOWN, OFFER, ft) => { const tierNote = ${engineSource.variables.get('tierNote')}; return (${parts.hero}); };
  export const technical = (e) => (${parts.technical});
  export const comparison = (ENGINES, ENGINE_SLUGS, params) => (${parts.comparison});
  export const hub = (ENGINES, perEngine) => (${parts.hub});
`
const compiled = ts.transpileModule(renderSource, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const renderBox = { exports: {} }
vm.runInNewContext(compiled, { module: renderBox, exports: renderBox.exports, Link: ({ children, ...props }) => React.createElement('a', props, children), WallMedia: () => { throw new Error('No media in local preview') }, require: id => {
  assert.equal(id, 'react/jsx-runtime'); return require(id)
} }, { timeout: 10000 })
const render = (kind, ...args) => renderToStaticMarkup(renderBox.exports[kind](...args))
function surfaces(data, load) {
  const engineOffer = load('lib/freeTierOffer.ts')
  return [
    ...targets.flatMap(slug => [
      { label: `${slug} · nota no hero`, html: render('hero', data.ENGINES[slug], engineOffer.TRIAL_CREDITS_SHOWN, engineOffer.getFreeTierOffer(), engineOffer.swapFreeTierCopy) },
      { label: `${slug} · ficha técnica`, html: render('technical', data.ENGINES[slug]) },
    ]),
    { label: 'Duas linhas do comparativo · também exibidas nos demais motores', html: render('comparison', data.ENGINES, targets, { engine: 'seedance' }) },
    { label: 'Dois cards do hub · sem mídia carregada', html: render('hub', data.ENGINES, targets.map(slug => ({ slug, videos: [] }))) },
  ]
}
const oldSurfaces = surfaces(beforeCatalog, before), newSurfaces = surfaces(afterCatalog, after)
check('all six surface contexts render the changed grant', () => {
  assert.equal(newSurfaces.length, 6)
  for (let i = 0; i < newSurfaces.length; i++) assert.notEqual(newSurfaces[i].html, oldSurfaces[i].html)
  for (const [slug, label] of [['kling', 'Starter'], ['veo', 'Creator']]) {
    const offset = targets.indexOf(slug) * 2
    assert.ok(newSurfaces[offset].html.includes(`covered by the ${label} monthly grant`))
    assert.ok(newSurfaces[offset + 1].html.includes(`>${label}</td>`))
    assert.ok(newSurfaces[4].html.includes(`>${label}</td>`))
    assert.ok(newSurfaces[5].html.includes(`60s · ${label}`))
  }
})
check('tier change leaves free-CTA eligibility unchanged and network blocked', () => {
  for (const slug of targets) {
    const eligible = e => e.tier === 'Free' || offer.TRIAL_CREDITS_SHOWN >= e.creditCost
    assert.equal(eligible(beforeCatalog.ENGINES[slug]), eligible(afterCatalog.ENGINES[slug]))
  }
  assert.equal(networkAttempts, 0)
})
const doc = html => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#000;color:#f5f5f7;font-family:Arial,sans-serif}*{box-sizing:border-box}main{max-width:980px;margin:auto;padding:28px 18px 30px}</style></head><body><main>' + html + '</main></body></html>'
const pairs = newSurfaces.map((item, index) => ({ label: item.label, before: doc(oldSurfaces[index].html), after: doc(item.html) }))
const data = JSON.stringify(pairs).replace(/</g, '\\u003c')
const preview = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Citações · menor grant mensal</title><style>body{margin:0;background:#e9edf2;color:#142138;font:15px Arial,sans-serif}header{padding:22px;background:#fff}h1{font-size:23px;margin:0 0 10px}p{line-height:1.5}button{padding:10px 14px;margin-right:8px}section{padding:18px}h2{font-size:18px}h3{font-size:14px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}.frame{overflow:auto;background:#d4dce6;padding:12px}iframe{display:block;width:1100px;height:620px;border:0}body.mobile iframe{width:390px;height:820px}body.mobile .pair{grid-template-columns:repeat(2,minmax(420px,1fr))}@media(max-width:700px){.pair{display:block}.frame{margin-bottom:14px}}</style></head><body><header><h1>[Citações] Menor grant mensal · antes/depois</h1><p>Base 9bf0525e. Kling passa a Starter; Veo passa a Creator. JSX e estilos reais dos consumidores intactos, sem carregar mídias. Todas as superfícies derivadas dos dois valores estão abaixo; as tabelas mantêm seu comportamento de layout existente.</p><button id="desktop">Desktop · 1100 px</button><button id="mobile">Mobile · 390 px</button></header><main id="pairs"></main><script>const data=${data};const main=document.getElementById('pairs');for(const pair of data){const section=document.createElement('section');const h=document.createElement('h2');h.textContent=pair.label;section.appendChild(h);const grid=document.createElement('div');grid.className='pair';for(const key of ['before','after']){const frame=document.createElement('div');frame.className='frame';const label=document.createElement('h3');label.textContent=key==='before'?'ANTES':'DEPOIS';frame.appendChild(label);const iframe=document.createElement('iframe');iframe.title=pair.label+' '+key;iframe.srcdoc=pair[key];frame.appendChild(iframe);grid.appendChild(frame)}section.appendChild(grid);main.appendChild(section)}document.getElementById('desktop').onclick=()=>document.body.classList.remove('mobile');document.getElementById('mobile').onclick=()=>document.body.classList.add('mobile');</script></body></html>`
fs.writeFileSync(path.join(root, folder, 'preview.html'), preview)
fs.writeFileSync(path.join(root, folder, 'verification.json'), JSON.stringify({
  classification: 'TESTADO LOCALMENTE', timeUtc: new Date().toISOString(), baseline,
  method: 'Exact two-value source delta, smallest sufficient monthly grant from real helpers, evaluated catalog equality, and actual consumer JSX for all affected surfaces without route/media execution.',
  checks, grants, costs: targets.map(slug => ({ slug, credits: afterCatalog.ENGINES[slug].creditCost, minimumPlan: afterCatalog.ENGINES[slug].tier })),
  surfaces: pairs.map((pair, index) => ({ label: pair.label, beforeSha256: hash(oldSurfaces[index].html), afterSha256: hash(newSurfaces[index].html) })),
  networkAttempts, generatedVideos: 0, passed: true,
}, null, 2) + '\n')
console.log(JSON.stringify({ passed: true, checks: checks.length, surfaces: pairs.length, networkAttempts }))
