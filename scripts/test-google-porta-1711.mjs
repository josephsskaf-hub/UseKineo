// KINEO-GOOGLE-PORTA-1711 — navigation, attribution and ranked content contract.
// Offline: no credentials, browser, database, generation or network.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { React, root, source, offlineModules, renderToStaticMarkup } from './gpt24h-offline-support.mjs'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const component = 'components/seo/GoogleCreatorDoor.tsx'
const pages = [
  // KINEO-CITACOES-HORAS-1711 (CEO, 17/11): recibo reancorado por UMA linha nova na lista 'Keep going' (link para a página das 4.000 horas). Título, H1, texto e tabelas iguais.
  ['how-much-do-youtube-shorts-pay', '91ddf6615623477906c9e7436e8aaa240585e9b0be71c1fc7f895e6fc1058c3b'],
  ['youtube-shorts-rpm-by-niche', 'be4ed2613d63b070dd32133f85c38926d338658d97607504a0f4b89f40135974'],
]

// Receipts from origin/main 999f2de68, 17/11: title, H1, prose, tables,
// metadata and structured-data literals stay intact; ignore the added door.
function contentReceipt(name, text) {
  const file = ts.createSourceFile(name, text.replace(/\r\n/g, '\n'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const literals = []
  function visit(node) {
    if (ts.isImportDeclaration(node)) return
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'CitationIdeaForm') {
      assert.equal(name, 'app/how-much-do-youtube-shorts-pay/page.tsx', 'Form exception only on payout article')
      const attrs = node.attributes.properties
      assert.equal(attrs.length, 1, 'Citation form has one explicit attribute')
      assert.ok(ts.isJsxAttribute(attrs[0]) && attrs[0].name.getText(file) === 'article' && attrs[0].initializer && ts.isStringLiteral(attrs[0].initializer) && attrs[0].initializer.text === 'pay', 'Exact payout form caller')
      return
    }
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'GoogleCreatorDoor') return
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isJsxText(node)) {
      if (node.text.trim()) literals.push(node.text.trim())
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return createHash('sha256').update(JSON.stringify(literals)).digest('hex')
}

function findAnchor(element) {
  if (!React.isValidElement(element)) return null
  if (element.type === 'a') return element
  return React.Children.toArray(element.props.children).map(findAnchor).find(Boolean)
}

function prove(overrides = {}) {
  const calls = []
  const load = offlineModules({ replacements: overrides, mocks: {
    'lib/analytics.ts': { trackClosedEvent: (...args) => { calls.push(args); return Promise.resolve('stored') } },
  } })
  const Door = load(component).default
  const doorSource = overrides[component] ?? source(component)
  assert.ok(!/create_intent|autoanalyze|generate-video|\/api\/compose|preventDefault|useEffect|onMouseEnter/.test(doorSource), 'Door must only navigate on explicit click')
  assert.ok(!/\$\s*\d|\b(?:Kling|MiniMax|Seedance)\b/.test(doorSource), 'No literal price or engine/free-film promise')
  for (const [slug, receipt] of pages) {
    const file = `app/${slug}/page.tsx`
    const text = overrides[file] ?? source(file)
    assert.equal(contentReceipt(file, text), receipt, `${slug}: ranked and cited content preserved`)
    const mount = `<GoogleCreatorDoor sourcePage="/${slug}" />`
    assert.equal(text.split(mount).length, 2, 'One door per article')
    const h1End = text.indexOf('</h1>')
    const introEnd = text.indexOf('</p>', text.indexOf('</p>', h1End) + 4) + 4
    assert.ok(text.indexOf(mount) > introEnd && text.indexOf(mount) < text.indexOf('<h2', introEnd), 'Door follows intact introduction, before article sections/tables')
    const element = Door({ sourcePage: `/${slug}` })
    const anchor = findAnchor(element)
    assert.ok(anchor)
    assert.equal(anchor.props.href, '/for-creators', 'Exact destination, no query or creation contract')
    assert.equal(anchor.props.target, undefined, 'Normal same-tab navigation')
    const before = calls.length
    const html = renderToStaticMarkup(element)
    assert.equal(calls.length, before, 'Rendering never tracks a click or starts work')
    assert.ok(html.includes('faceless channel') && html.includes('narrated film with captions'))
    anchor.props.onClick()
    assert.equal(calls.length, before + 1, 'One dedicated event per click')
    const [event, metadata, path] = calls.at(-1)
    assert.equal(event, 'google_creator_door_clicked')
    assert.equal(path, `/${slug}`)
    assert.deepEqual({ ...metadata }, { source_page: `/${slug}`, destination: '/for-creators', placement: 'article_intro', version: 'google_porta_1711' })
  }
}

prove()
console.log('PASS: both article doors preserve content, navigate only and attribute one explicit click')
const base = source(component)
const pay = 'app/how-much-do-youtube-shorts-pay/page.tsx'
const rpm = 'app/youtube-shorts-rpm-by-niche/page.tsx'
const mutants = [
  ['automatic generation in URL', { [component]: base.replace('href="/for-creators"', 'href="/for-creators?create_intent=fast"') }],
  ['lost origin', { [component]: base.replace('source_page: sourcePage', "source_page: '/wrong-page'") }],
  ['click omitted', { [component]: base.replace("void trackClosedEvent('google_creator_door_clicked',", "void Promise.resolve('google_creator_door_clicked',") }],
  ['H1 rewritten', { [pay]: source(pay).replace('How Much Do YouTube Shorts Pay? (2026)', 'A different H1') }],
  ['intro rewritten', { [rpm]: source(rpm).replace('Not all Shorts views are worth the same money.', 'All Shorts pay the same.') }],
  ['table changed', { [rpm]: source(rpm).replace("rpm: '$0.15–$0.40+'", "rpm: '$9.00'") }],
  ['door omitted', { [pay]: source(pay).replace('<GoogleCreatorDoor sourcePage="/how-much-do-youtube-shorts-pay" />', '') }],
]
for (const [name, mutation] of mutants) {
  assert.throws(() => prove(mutation), undefined, `Mutant must fail: ${name}`)
  console.log(`PASS: rejects ${name}`)
}
console.log(`PASS: ${mutants.length} regression mutants rejected; root=${root}`)
