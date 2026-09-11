// Local-only V1 verification and visual comparison. Reads code and one approved
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
const baseline = '45a6cac9d7a375b082a798afaa5e2f33d0a30c2d'
const folder = 'docs/citacoes-cost-v1-20260911'
const routePath = 'app/ai-video-generator/complete-60-second-shorts-cost/page.tsx'
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
const oldAnswers = before(answersPath).CITATION_ANSWERS
const newAnswers = after(answersPath).CITATION_ANSWERS
const oldPage = before(routePath)
const newPage = after(routePath)
const render = component => renderToStaticMarkup(React.createElement(component))
const oldMarkup = render(oldPage.default)
const newMarkup = render(newPage.default)

check('answer map is unchanged from the approved eight-page baseline', () => assert.equal(read(answersPath).replace(/\r\n/g, '\n'), beforeSource(answersPath).replace(/\r\n/g, '\n')))
const unchangedPages = Object.values(newAnswers).filter(answer => answer.id !== 'cost').map(answer => {
  const oldHtml = renderToStaticMarkup(React.createElement(before(templatePath).default, { answer: oldAnswers[answer.id] }))
  const newHtml = renderToStaticMarkup(React.createElement(after(templatePath).default, { answer }))
  check(`unchanged HTML: ${answer.path}`, () => assert.equal(newHtml, oldHtml))
  return { path: answer.path, sha256: hash(newHtml) }
})
check('exactly seven other pages retain their HTML', () => assert.equal(unchangedPages.length, 7))
check('cost page metadata and canonical remain unchanged', () => assert.deepEqual(plain(newPage.metadata), plain(oldPage.metadata)))
const freeLinks = html => [...html.matchAll(/<a [^>]*class="kc-cta"[^>]*>[\s\S]*?<\/a>/g)].map(match => match[0])
check('both free CTAs retain their exact markup and destination', () => {
  assert.equal(freeLinks(oldMarkup).length, 2)
  assert.deepEqual(freeLinks(newMarkup), freeLinks(oldMarkup))
})
check('one plan comparison replaces the old three plan cards', () => {
  assert.equal((oldMarkup.match(/class="kc-plan"/g) ?? []).length, 3)
  assert.equal((newMarkup.match(/class="kc-plan"/g) ?? []).length, 0)
  assert.equal((newMarkup.match(/data-cost-decision-version="citacoes_cost_decision_v1"/g) ?? []).length, 1)
  assert.equal((newMarkup.match(/class="kccd-engine"/g) ?? []).length, 2)
})

// Independent business fixtures for the approved Starter offer (10/09/2026).
// In particular Seedance uses two WHOLE films, not 2.4 fractional films.
const fixtures = [
  { quality: 'fast', credits: 5, films: 12, remainder: 0, allocated: '≈ $0.83' },
  { quality: 'cinematic_ai', credits: 25, films: 2, remainder: 10, allocated: '≈ $4.95' },
]
for (const expected of fixtures) {
  const card = newMarkup.match(new RegExp(`<article[^>]*aria-labelledby="kccd-${expected.quality}"[^>]*>([\\s\\S]*?)</article>`))?.[1]
  check(`whole-film allocation and remaining balance: ${expected.quality}`, () => {
    assert.ok(card)
    assert.ok(card.includes(expected.allocated))
    const quantities = [...card.matchAll(/<dd>(\d+)<\/dd>/g)].map(match => Number(match[1]))
    assert.deepEqual(quantities, [expected.credits, expected.films, expected.remainder])
    assert.ok(card.includes(`$9.90/month ÷ ${expected.films} complete films`))
  })
}
check('fee allocation, non-rollover, regeneration and currency limits are visible', () => {
  for (const text of ['not a separate price charged per render', 'counts are not combined', 'Regenerations', 'Unused monthly credits do not roll over', 'Brazilian customers pay in reais', 'USD allocated per complete film']) assert.ok(newMarkup.includes(text), text)
  assert.ok(newMarkup.includes('href="/cheapest-ai-shorts-maker"'))
})
const faq = html => html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
check('FAQ and four unverified competitors remain intact', () => {
  assert.equal(faq(newMarkup), faq(oldMarkup))
  assert.equal((newMarkup.match(/<details>/g) ?? []).length, 5)
  const table = html => html.match(/<table class="kc-table">[\s\S]*?<\/table>/)?.[0]
  assert.equal(table(newMarkup), table(oldMarkup))
})
const pictures = html => html.match(/<figure class="kc-proof">[\s\S]*?<\/figure>/)?.[0]
check('the existing allowlisted example is unchanged and no video is generated', () => {
  assert.equal(pictures(newMarkup), pictures(oldMarkup))
  assert.ok(!newMarkup.includes('<video'))
})
check('Compare plans sits in the hero with the real campaign and no invented source', () => {
  const hero = newMarkup.match(/<header class="kc-hero">[\s\S]*?<\/header>/)?.[0]
  assert.ok(hero.includes('href="/pricing?intent_campaign=citacoes_cost_decision_v1"'))
  assert.ok(hero.includes('Compare plans'))
  assert.ok(!hero.includes('utm_source='))
})
check('existing OrganicCtaLink emits the intended event under an offline stub', () => {
  const action = after('components/CitationCostDecision.tsx').CitationCostComparePlans()
  const link = action.type(action.props)
  link.props.onClick({})
  assert.deepEqual(plain(events), [['organic_cta_clicked', {
    source: 'citacoes_cost_decision_v1', placement: 'hero_compare_plans', destination: '/pricing',
  }]])
  assert.equal(link.props.href, '/pricing?intent_campaign=citacoes_cost_decision_v1')
})
check('verification made no network attempt', () => assert.equal(networkAttempts, 0))

const sample = after('lib/publicExamples.ts').PUBLIC_EXAMPLES[0]
const poster = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'public', sample.posterPath)).toString('base64')
const doc = markup => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:#07090d;font-family:Arial,sans-serif}</style></head><body>' + markup.replaceAll(sample.posterPath, poster) + '</body></html>'
const payload = JSON.stringify({ before: doc(oldMarkup), after: doc(newMarkup) }).replace(/</g, '\\u003c')
const preview = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Citações · custo V1 · antes e depois</title><style>body{margin:0;background:#e9edf2;color:#142138;font:15px Arial,sans-serif}header{padding:20px;background:white;border-bottom:1px solid #b8c6d5}h1{font-size:22px;margin:0 0 8px}p{margin:8px 0;line-height:1.45}button{padding:9px 13px;margin:8px 8px 0 0;font:inherit}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:18px}.frame{overflow:auto;background:#d4dce6;padding:12px}h2{font-size:15px;margin:0 0 12px}iframe{width:1100px;height:2300px;border:0;display:block;background:#07090d}body.mobile iframe{width:390px;height:2300px}body.mobile .pair{grid-template-columns:repeat(2,minmax(420px,1fr))}@media(max-width:700px){.pair{display:block}.frame{margin-bottom:16px}}</style></head><body><header><h1>[Citações] Custo por filme completo · V1</h1><p>Comparação dos componentes React reais. Antes: base 45a6cac9. Depois: quadro Starter e ação Compare plans somente no guia de custo. Sem build, servidor ou rede para visualizar.</p><p>Filmes completos, saldo restante e custo alocado. O poster é a mesma amostra pública autorizada, embutida neste arquivo. Links não são testes de aquisição.</p><button id="desktop">Desktop · 1100 px</button><button id="mobile">Mobile · 390 px</button></header><main class="pair"><section class="frame"><h2>ANTES · três cards de planos e CTA grátis</h2><iframe id="before" title="Antes"></iframe></section><section class="frame"><h2>DEPOIS · custo por filme e comparação de planos</h2><iframe id="after" title="Depois"></iframe></section></main><script>const docs=${payload};document.getElementById('before').srcdoc=docs.before;document.getElementById('after').srcdoc=docs.after;document.getElementById('desktop').onclick=()=>document.body.classList.remove('mobile');document.getElementById('mobile').onclick=()=>document.body.classList.add('mobile');</script></body></html>`
fs.writeFileSync(path.join(root, folder, 'preview.html'), preview)
const result = {
  classification: 'TESTADO LOCALMENTE', timeUtc: new Date().toISOString(), baseline,
  method: 'Actual TSX components rendered offline; seven defaults compared byte-for-byte, independent whole-film fixtures, unchanged trial/FAQ/example and real OrganicCtaLink with analytics stub.',
  checks, fixtures, unchangedPages, networkAttempts, externalClicks: 0, generatedVideos: 0,
  beforeSha256: hash(oldMarkup), afterSha256: hash(newMarkup), passed: true,
}
fs.writeFileSync(path.join(root, folder, 'verification.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ passed: true, checks: checks.length, unchangedPages: unchangedPages.length, networkAttempts, preview: path.join(root, folder, 'preview.html') }))
