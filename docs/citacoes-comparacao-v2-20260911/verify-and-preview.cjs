// Local-only V2 verification and visual comparison. Reads code and one approved
// poster, executes server components in isolated memory, writes evidence here.
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
const baseline = '984a1a15a0bdd373decbb325d4f57e3c9e0a6057'
const folder = 'docs/citacoes-comparacao-v2-20260911'
const routePath = 'app/vs/invideo-alternatives-faceless-shorts/page.tsx'
const templatePath = 'components/CitationAnswerPage.tsx'
const answersPath = 'lib/growth/citationAnswers.ts'
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
const beforeSource = rel => execFileSync('git', ['show', `${baseline}:${rel}`], { cwd: root, encoding: 'utf8' })
const hash = text => crypto.createHash('sha256').update(text).digest('hex')
const plain = value => JSON.parse(JSON.stringify(value))
const checks = []
const check = (name, fn) => { fn(); checks.push(name) }
let networkAttempts = 0
const events = []
const rejectNetwork = () => { networkAttempts++; throw new Error('No network in this verification') }

function loader(overrides = {}) {
  const cache = new Map()
  function load(rel) {
    rel = rel.replaceAll('\\', '/')
    if (cache.has(rel)) return cache.get(rel).exports
    const filename = path.join(root, rel)
    const source = overrides[rel] ?? read(rel)
    const output = ts.transpileModule(source, { fileName: filename, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText
    const box = { exports: {} }
    cache.set(rel, box)
    const localRequire = id => {
      if (id === 'react' || id === 'react/jsx-runtime') return require(id)
      if (id === 'node:crypto') return crypto
      if (id === 'next/link') return ({ children, ...props }) => React.createElement('a', props, children)
      if (id === 'next/image') return props => React.createElement('img', props)
      if (id === '@/lib/analytics') return { trackEvent: (...args) => { events.push(args); return Promise.resolve() } }
      const base = id.startsWith('@/') ? path.join(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null
      assert.ok(base && base.startsWith(root + path.sep), `closed local import: ${id}`)
      const next = ['.ts', '.tsx'].map(ext => base + ext).find(file => fs.existsSync(file))
      assert.ok(next, `missing local import: ${id}`)
      return load(path.relative(root, next))
    }
    vm.runInNewContext(output, {
      module: box, exports: box.exports, require: localRequire,
      process: { env: { NODE_ENV: 'test' } }, URL, URLSearchParams,
      fetch: rejectNetwork, XMLHttpRequest: rejectNetwork, WebSocket: rejectNetwork,
    }, { filename, timeout: 10000 })
    return box.exports
  }
  return load
}

const before = loader(Object.fromEntries([routePath, templatePath, answersPath].map(rel => [rel, beforeSource(rel)])))
const after = loader()
const render = component => renderToStaticMarkup(React.createElement(component))
const oldPage = before(routePath)
const newPage = after(routePath)
const oldMarkup = render(oldPage.default)
const newMarkup = render(newPage.default)
const newAnswers = after(answersPath).CITATION_ANSWERS
const snapshot = after('lib/growth/citationComparisonSnapshot.ts')
const normalize = text => text.replace(/\r\n/g, '\n')
check('global answer map is unchanged', () => assert.equal(normalize(read(answersPath)), normalize(beforeSource(answersPath))))

// Render each actual route, including V1's cost component and hero slots.
const unchangedPages = Object.values(newAnswers).filter(answer => answer.id !== 'invideo').map(answer => {
  const route = `app${answer.path}/page.tsx`
  check(`unchanged route source: ${answer.path}`, () => assert.equal(normalize(read(route)), normalize(beforeSource(route))))
  const oldHtml = render(before(route).default)
  const newHtml = render(after(route).default)
  check(`unchanged actual route HTML: ${answer.path}`, () => assert.equal(newHtml, oldHtml))
  if (answer.id === 'cost') check('cost V1 still has both decision and campaign', () => {
    assert.ok(newHtml.includes('data-cost-decision-version="citacoes_cost_decision_v1"'))
    assert.ok(newHtml.includes('/pricing?intent_campaign=citacoes_cost_decision_v1'))
    assert.ok(newHtml.includes('Credits left in this example</dt><dd>10</dd>'))
  })
  return { path: answer.path, sha256: hash(newHtml) }
})
check('seven other routes preserved', () => assert.equal(unchangedPages.length, 7))
check('canonical, title and literal question unchanged; accurate local description', () => {
  assert.deepEqual(plain(oldPage.metadata.alternates), plain(newPage.metadata.alternates))
  assert.equal(oldPage.metadata.title, newPage.metadata.title)
  assert.equal(oldPage.metadata.openGraph.url, newPage.metadata.openGraph.url)
  assert.equal(newPage.metadata.description, newPage.metadata.openGraph.description)
  assert.ok(newPage.metadata.description.includes('dated primary sources'))
  assert.equal(newMarkup.match(/<h1>[\s\S]*?<\/h1>/)?.[0], oldMarkup.match(/<h1>[\s\S]*?<\/h1>/)?.[0])
})
const freeLinks = html => [...html.matchAll(/<a [^>]*class="kc-cta"[^>]*>[\s\S]*?<\/a>/g)].map(match => match[0]).filter(link => link.includes('Start free'))
check('two trial CTAs and destinations unchanged', () => {
  assert.equal(freeLinks(oldMarkup).length, 2)
  assert.deepEqual(freeLinks(newMarkup), freeLinks(oldMarkup))
})
const figure = html => html.match(/<figure class="kc-proof">[\s\S]*?<\/figure>/)?.[0]
check('allowlisted example and no generated video', () => {
  assert.equal(figure(newMarkup), figure(oldMarkup))
  assert.ok(!newMarkup.includes('<video'))
})
const faq = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
check('five FAQs retain four unchanged answers and visible JSON-LD parity', () => {
  const oldFaq = faq(oldMarkup).mainEntity
  const newFaq = faq(newMarkup).mainEntity
  assert.equal(newFaq.length, 5)
  assert.equal((newMarkup.match(/<details>/g) ?? []).length, 5)
  for (const index of [0, 1, 2, 4]) assert.deepEqual(newFaq[index], oldFaq[index])
  for (const entry of newFaq) assert.ok(newMarkup.includes(entry.acceptedAnswer.text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')))
})
const table = newMarkup.match(/<table class="kc-table">([\s\S]*?)<\/table>/)?.[1]
check('one comparison with five providers and six columns', () => {
  assert.ok(table)
  assert.equal((newMarkup.match(/data-comparison-version=/g) ?? []).length, 1)
  assert.equal((table.match(/scope="row"/g) ?? []).length, 5)
  assert.equal((table.match(/scope="col"/g) ?? []).length, 6)
  assert.deepEqual(plain(snapshot.COMPARISON_PROVIDERS.map(provider => provider.name)), ['Pictory', 'Descript', 'HeyGen', 'OpusClip'])
})
const primaryHosts = new Set(['pictory.ai', 'app.pictory.ai', 'kb.pictory.ai', 'www.descript.com', 'help.descript.com', 'www.heygen.com', 'help.heygen.com', 'www.opus.pro', 'help.opus.pro'])
const visibleTableText = table.replace(/<[^>]+>/g, '').replaceAll('&amp;', '&').replaceAll('&#x27;', "'").replaceAll('&quot;', '"')
for (const provider of snapshot.COMPARISON_PROVIDERS) check(`every ${provider.name} field has dated primary sources`, () => {
  for (const field of ['workflow', 'price', 'trial', 'engines', 'duration', 'watermark']) {
    const fact = provider[field]
    assert.ok(fact.text.trim().length > 0)
    assert.ok(visibleTableText.includes(fact.text), `visible field: ${provider.name}.${field}`)
    assert.ok(fact.sources.length > 0, `${provider.name}.${field}`)
    assert.ok(['verified', 'unknown', 'conflict'].includes(fact.status))
    for (const source of fact.sources) {
      assert.equal(new URL(source.url).protocol, 'https:')
      assert.ok(primaryHosts.has(new URL(source.url).hostname), source.url)
      assert.equal(source.checkedOn, '2026-09-11')
      assert.ok(table.includes(`href="${source.url}"`))
    }
  }
})

// Independent fixture values from the primary-source review on 11 September 2026.
// Deliberately distinguish monthly prices from annual effective prices, resource
// allowances from export caps, and plan-specific gaps from feature absence.
const expectedPrices = [
  ['Pictory', 29, 'Starter', 'https://pictory.ai/pricing/'],
  ['Descript', 24, 'Hobbyist', 'https://www.descript.com/pricing'],
  ['HeyGen', 29, 'Creator', 'https://www.heygen.com/pricing'],
  ['OpusClip', 15, 'Starter', 'https://www.opus.pro/pricing'],
]
for (const [name, dollars, plan, url] of expectedPrices) check(`monthly price fixture: ${name}`, () => {
  const provider = snapshot.COMPARISON_PROVIDERS.find(item => item.name === name)
  assert.equal(Number(provider.price.text.match(/USD (\d+)/)?.[1]), dollars)
  assert.ok(provider.price.text.includes(plan))
  assert.ok(provider.price.text.includes('billed monthly'))
  assert.ok(provider.price.sources.some(source => source.url === url))
  assert.ok(table.includes(provider.price.text))
})
const provider = name => snapshot.COMPARISON_PROVIDERS.find(item => item.name === name)
check('Pictory trial, scoped cap and conflicting card condition', () => {
  const item = provider('Pictory')
  assert.deepEqual(item.trial.text.match(/\d+/g).map(Number), [14, 3, 5])
  assert.ok(item.trial.text.includes('script/URL'))
  assert.equal(item.trial.status, 'conflict')
  assert.ok(item.trial.text.includes('Card requirement: [CONFIRMAR]'))
  assert.ok(item.trial.sources.some(source => source.url.endsWith('/cards/')))
  assert.ok(item.trial.sources.some(source => source.url.includes('/signup?')))
  assert.ok(item.duration.text.includes('30 min from script/URL'))
  assert.equal(item.engines.status, 'unknown')
})
check('Descript seat price, media allowance and separate export scope', () => {
  const item = provider('Descript')
  assert.ok(item.price.text.includes('/person/month'))
  assert.ok(item.trial.text.includes('60 min of media processed per month'))
  assert.ok(item.trial.text.includes('no card required'))
  assert.ok(item.duration.text.includes('1 hour via web link'))
  assert.ok(item.duration.text.includes('Local MP4 maximum: [CONFIRMAR]'))
  assert.equal(item.engines.status, 'unknown')
  assert.equal(item.watermark.status, 'conflict')
})
check('HeyGen allowances, scoped Creator engine and unresolved Free watermark', () => {
  const item = provider('HeyGen')
  assert.deepEqual(item.trial.text.match(/\d+/g).map(Number), [3, 1])
  assert.ok(item.engines.text.includes('Avatar IV'))
  assert.ok(item.engines.text.includes('Creator'))
  assert.ok(item.duration.text.includes('30 min per video'))
  assert.equal(item.watermark.status, 'conflict')
})
check('Opus resources, export window and presets never become a global cap', () => {
  const item = provider('OpusClip')
  assert.deepEqual(item.trial.text.match(/\d+/g).map(Number), [60, 3])
  assert.ok(item.trial.text.includes('processing credits/month'))
  assert.ok(item.workflow.text.includes('existing recording'))
  assert.ok(item.duration.text.includes('Maximum finished export: [CONFIRMAR]'))
  assert.ok(item.duration.text.includes('do not establish a global maximum'))
})
check('uncertainty is visible on the specific disputed or unverified part', () => {
  for (const item of snapshot.COMPARISON_PROVIDERS) {
    for (const field of ['workflow', 'price', 'trial', 'engines', 'duration', 'watermark']) {
      if (item[field].status !== 'verified') assert.ok(item[field].text.includes('[CONFIRMAR]'))
    }
  }
  assert.ok(newMarkup.includes('Reviewed 2026-09-11'))
  assert.ok(!newMarkup.includes('their current price and complete-video fit must be confirmed'))
  assert.ok(!newMarkup.includes('current price and export limits are not confirmed in this guide'))
})

check('Kineo offer and unknown maximum remain explicit', () => {
  assert.ok(table.includes('$9.90/month'))
  assert.ok(table.includes('30 free credits'))
  assert.ok(table.includes('no card required'))
  assert.ok(table.includes('60-second cost reference is not a maximum duration'))
  assert.ok(newMarkup.includes('Brazilian Kineo customers pay in reais'))
})
check('comparison CTA follows the table without forged acquisition source', () => {
  const cta = newMarkup.indexOf('href="/pricing?intent_campaign=citacoes_comparison_decision_v2"')
  assert.ok(cta > newMarkup.indexOf('</table>'))
  assert.ok(newMarkup.includes('Compare Kineo plans'))
  assert.ok(!newMarkup.includes('utm_source='))
})
check('existing CTA handler emits intended campaign under analytics stub', () => {
  const action = after('components/CitationComparisonDecision.tsx').CitationComparisonPlans()
  const link = action.type(action.props)
  link.props.onClick({})
  assert.deepEqual(plain(events), [['organic_cta_clicked', {
    source: 'citacoes_comparison_decision_v2', placement: 'comparison_plans', destination: '/pricing',
  }]])
  assert.equal(link.props.href, '/pricing?intent_campaign=citacoes_comparison_decision_v2')
})
check('network stayed blocked', () => assert.equal(networkAttempts, 0))

const sample = after('lib/publicExamples.ts').PUBLIC_EXAMPLES[0]
const poster = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'public', sample.posterPath)).toString('base64')
const doc = markup => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:#07090d;font-family:Arial,sans-serif}</style></head><body>' + markup.replaceAll(sample.posterPath, poster) + '</body></html>'
const payload = JSON.stringify({ before: doc(oldMarkup), after: doc(newMarkup) }).replace(/</g, '\\u003c')
const preview = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Citações · comparação V2 · antes e depois</title><style>body{margin:0;background:#e9edf2;color:#142138;font:15px Arial,sans-serif}header{padding:20px;background:white;border-bottom:1px solid #b8c6d5}h1{font-size:22px;margin:0 0 8px}p{margin:8px 0;line-height:1.45}button{padding:9px 13px;margin:8px 8px 0 0;font:inherit}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:18px}.frame{overflow:auto;background:#d4dce6;padding:12px}h2{font-size:15px;margin:0 0 12px}iframe{width:1100px;height:2300px;border:0;display:block;background:#07090d}body.mobile iframe{width:390px;height:2300px}body.mobile .pair{grid-template-columns:repeat(2,minmax(420px,1fr))}@media(max-width:700px){.pair{display:block}.frame{margin-bottom:16px}}</style></head><body><header><h1>[Citações] Comparação verificável · V2</h1><p>Componentes React reais. Antes: 984a1a15. Depois: fontes atuais por campo e acesso aos planos somente no guia de alternativas. Sem build, servidor ou rede para visualizar.</p><p>Preço com cobrança mensal, condições e limites separados por fluxo. A amostra pública existente está embutida; links não são testes de aquisição.</p><button id="desktop">Desktop · 1100 px</button><button id="mobile">Mobile · 390 px</button></header><main class="pair"><section class="frame"><h2>ANTES · campos de concorrentes desconhecidos</h2><iframe id="before" title="Antes"></iframe></section><section class="frame"><h2>DEPOIS · fatos, fontes, lacunas e planos</h2><iframe id="after" title="Depois"></iframe></section></main><script>const docs=${payload};document.getElementById('before').srcdoc=docs.before;document.getElementById('after').srcdoc=docs.after;document.getElementById('desktop').onclick=()=>document.body.classList.remove('mobile');document.getElementById('mobile').onclick=()=>document.body.classList.add('mobile');</script></body></html>`
fs.writeFileSync(path.join(root, folder, 'preview.html'), preview)
const result = {
  classification: 'TESTADO LOCALMENTE', timeUtc: new Date().toISOString(), baseline,
  method: 'Actual route components rendered offline, including the V1 cost route; seven HTML byte comparisons; primary-source fixture checks and existing CTA handler with analytics stub.',
  checks, unchangedPages, expectedPrices,
  sourceCoverage: plain(snapshot.COMPARISON_PROVIDERS.map(item => ({ name: item.name, fields: Object.fromEntries(['workflow', 'price', 'trial', 'engines', 'duration', 'watermark'].map(field => [field, { status: item[field].status, sources: item[field].sources }])) }))),
  networkAttempts,
  externalClicks: 0, generatedVideos: 0, beforeSha256: hash(oldMarkup), afterSha256: hash(newMarkup), passed: true,
}
fs.writeFileSync(path.join(root, folder, 'verification.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ passed: true, checks: checks.length, unchangedPages: unchangedPages.length, networkAttempts, preview: path.join(root, folder, 'preview.html') }))
