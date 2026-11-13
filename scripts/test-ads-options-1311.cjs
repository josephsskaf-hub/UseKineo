// Offline UI interaction contracts. Effects and I/O hooks are injected; option handlers
// execute against the real form state. No account, browser storage, request or generation.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ROOT = path.resolve(process.env.KINEO_TEST_ROOT || path.join(__dirname, '..'))
const React = require(path.join(ROOT, 'node_modules/react'))
const { renderToStaticMarkup } = require(path.join(ROOT, 'node_modules/react-dom/server'))
const { loader } = require(path.join(ROOT, 'docs/recreate-0911/test-recreate.cjs'))
const FILE = 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx'
const io = []
const forbidden = name => (...args) => { io.push([name, args]); throw Error('Unexpected I/O: ' + name) }
globalThis.fetch = forbidden('fetch')
let checks = 0
const check = (condition, label) => { assert.ok(condition, label); checks++ }
function all(tree, type, predicate = () => true) {
  if (Array.isArray(tree)) return tree.flatMap(child => all(child, type, predicate))
  if (!React.isValidElement(tree)) return []
  return [...(tree.type === type && predicate(tree.props) ? [tree] : []), ...all(tree.props.children, type, predicate)]
}
function fixture({ moldura = false, source, busy = '' } = {}) {
  const values = []
  let cursor = 0
  const fakeReact = { ...React, useEffect: () => {}, useRef: value => ({ current: value }), useState(initial) {
    const index = cursor++
    if (!Object.hasOwn(values, index)) {
      values[index] = typeof initial === 'function' ? initial() : initial
      // Initial state sequence is checked below; only the completed hydration and
      // an optional busy request are injected. All editable fields use real defaults.
      if (index === 11) { assert.equal(initial, false, 'ready fixture anchor'); values[index] = true }
      if (index === 10) { assert.equal(initial, '', 'busy fixture anchor'); values[index] = busy }
    }
    return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value }]
  } }
  class FixtureUploadError extends Error {}
  const stubs = {
    react: fakeReact,
    'react-dom': { createPortal: tree => tree },
    '@/components/Kling4PaidNotice': { useKling4PaidAvailability: () => null },
    '@/lib/ads/uploadFootage': { AdsUploadError: FixtureUploadError, uploadFootage: forbidden('upload') },
    '@/lib/oneTimeItem': { ONE_TIME_ITEMS_LIVE: false },
    '@/components/OneTimeItemOffer': { __esModule: true, default: () => null },
    '@/lib/ads/rascunhoDoVisitante': { guardarRascunhoDoAnuncio: forbidden('save guest draft'), lerRascunhoDoAnuncio: forbidden('read guest draft') },
    '@/lib/analytics': { trackEvent: forbidden('analytics') },
  }
  const load = loader(stubs, source ? { [FILE]: source } : {})
  const Component = load(FILE).default
  const render = () => { cursor = 0; const tree = Component({ moldura, lang: 'en', ownerKey: 'fixture-owner', guest: true }); check(all(tree, 'div', p => p['data-kineo'] === 'ads-escolha').length === 1, 'real form rendered after ready'); return tree }
  return { render, values, load }
}
function main() {
  const legacy = fixture()
  const legacyTree = legacy.render()
  const languages = legacy.load('lib/textLanguage').NARRATION_LANGUAGES
  const formats = legacy.load('lib/ads/cena/escolhaShots').CENA_ESCOLHA_FORMATS
  check(all(legacyTree, 'button', p => p.name === 'language' || p.name === 'formato').length === 0, 'legacy uses original controls')
  const oldLanguage = all(legacyTree, 'select', p => p.value === 'en')[0]
  const oldFormat = all(legacyTree, 'select', p => p.value === 'product')[0]
  check(!!oldLanguage && !!oldFormat, 'legacy format/language selects remain')
  check(all(oldLanguage, 'option').length === languages.length && all(oldFormat, 'option').length === formats.length, 'legacy catalog coverage retained')
  check(all(legacyTree, 'details', p => p['data-kineo'] === 'ads-pessoa-cena')[0].props.open === undefined, 'legacy person/scene starts closed')
  check(!all(legacyTree, 'details', p => p['data-kineo'] === 'ads-mais-opcoes')[0].props.open, 'legacy options start closed')
  if (process.env.KINEO_TEST_OPTIONS_BASELINE) {
    const before = fixture({ source: fs.readFileSync(process.env.KINEO_TEST_OPTIONS_BASELINE, 'utf8') })
    assert.equal(renderToStaticMarkup(legacyTree), renderToStaticMarkup(before.render()), 'moldura=false preserves previous rendered HTML byte for byte'); checks++
  }

  const framed = fixture({ moldura: true })
  let tree = framed.render()
  const formatButtons = all(tree, 'button', p => p.name === 'formato')
  const languageButtons = all(tree, 'button', p => p.name === 'language')
  assert.deepEqual(formatButtons.map(b => b.props.value), formats.map(f => f.id), 'all supported formats are selectable'); checks++
  assert.deepEqual(languageButtons.map(b => b.props.value), languages.map(l => l.code), 'all supported spoken languages remain selectable'); checks++
  check(all(tree, 'details', p => ['ads-pessoa-cena', 'ads-mais-opcoes'].includes(p['data-kineo'])).every(d => d.props.open), 'person, scene and options exposed in new frame')
  const optionGroups = all(tree, 'fieldset', p => p.className === 'ace-field ace-full')
  check(optionGroups.length === 2 && optionGroups.every(f => all(f, 'legend').length === 1), 'button groups have native fieldset names')
  for (const button of [...formatButtons, ...languageButtons]) {
    check(button.props.type === 'button' && button.props.style.minHeight >= 44 && button.props.style.minWidth >= 44 && button.props.style.fontSize >= 12, button.props.name + '/' + button.props.value + ': usable target and text')
    check(typeof button.props['aria-pressed'] === 'boolean' && button.props.disabled === false, button.props.name + '/' + button.props.value + ': selection and availability exposed')
  }
  check(formatButtons.filter(b => b.props['aria-pressed']).map(b => b.props.value).join() === 'product', 'current format marked')
  check(languageButtons.filter(b => b.props['aria-pressed']).map(b => b.props.value).join() === 'en', 'current language marked')

  const initial = { ...framed.values[0] }
  formatButtons.find(b => b.props.value === 'unboxing').props.onClick()
  assert.deepEqual(framed.values[0], { ...initial, formato: 'unboxing' }, 'real format handler changes only the server-consumed format field'); checks++
  tree = framed.render()
  check(all(tree, 'button', p => p.name === 'formato' && p['aria-pressed']).map(b => b.props.value).join() === 'unboxing', 'format selection updates on rerender')
  all(tree, 'button', p => p.name === 'language' && p.value === 'ja')[0].props.onClick()
  assert.deepEqual(framed.values[0], { ...initial, formato: 'unboxing', language: 'ja' }, 'real language handler preserves product/person/scene and other fields'); checks++
  tree = framed.render()
  check(all(tree, 'button', p => p.name === 'language' && p['aria-pressed']).map(b => b.props.value).join() === 'ja', 'language selection updates on rerender')

  const waiting = fixture({ moldura: true, busy: 'plan' }).render()
  check(all(waiting, 'button', p => p.name === 'formato' || p.name === 'language').every(b => b.props.disabled === true), 'in-flight request locks every option')
  assert.deepEqual(io, [], 'rendering and option changes made no requests, upload, analytics or guest draft operation'); checks++
  console.log(`OK: ${checks} offline Ads option contracts; ${formats.length} formats and ${languages.length} spoken languages; real selection handlers preserve all other form fields. Legacy HTML${process.env.KINEO_TEST_OPTIONS_BASELINE ? ' matches baseline' : ' controls preserved'}.`)
}
try { main() } catch (error) { console.error(error); process.exitCode = 1 }
