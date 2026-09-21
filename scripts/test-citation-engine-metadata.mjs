import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const file = 'app/ai-video-generator/[engine]/page.tsx'
const current = fs.readFileSync(file, 'utf8')
const previous = execFileSync('git', ['show', '560b5e2f:' + file], { encoding: 'utf8' })
const load = createOfflineLoader()
const { ENGINES, ENGINE_SLUGS } = load('lib/growth/enginePageCatalog.ts')
const { enginePaused } = load('lib/engineLaunch.ts')
const { TRIAL_CREDITS_SHOWN } = load('lib/freeTierOffer.ts')
const { creditsPerReferenceVideo } = load('lib/marketingPrice.ts')
// KINEO-MOTORES-16-LINGUAS-2026-09-21: generateMetadata passou a citar o hreflang das 13 línguas nos 3 motores traduzidos.
const { LOCALIZED_ENGINE_SLUGS, engineAlternates } = load('lib/seo/enginePageLangs.ts')
function ast(source) { return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX) }
function metadata(source) {
  const tree = ast(source)
  const functions = tree.statements.filter(node => ts.isFunctionDeclaration(node) && ['generateMetadata', 'engineCostLabel'].includes(node.name?.text))
  assert.equal(functions.length, 2)
  const js = ts.transpileModule(functions.map(node => node.getText(tree)).join('\n'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, ENGINES, enginePaused, TRIAL_CREDITS_SHOWN, URL, BASE: 'https://www.usekineo.com', LOCALIZED_ENGINE_SLUGS, engineAlternates }, { timeout: 2000 })
  return exports.generateMetadata
}
const before = metadata(previous), after = metadata(current)
assert.match(before({ params: { engine: 'seedance' } }).description, /Watch real user renders/)
for (const slug of ENGINE_SLUGS) {
  const engine = ENGINES[slug]
  const result = after({ params: { engine: slug } })
  const old = before({ params: { engine: slug } })
  assert.equal(result.alternates.canonical, old.alternates.canonical)
  assert.equal(result.openGraph.url, old.openGraph.url)
  assert.equal(result.openGraph.description, result.description)
  assert.equal(result.twitter.description, result.description)
  assert.equal(result.openGraph.title, result.title)
  assert.equal(result.twitter.title, result.title)
  assert.doesNotMatch(result.description, /real user renders|demo reel/i)
  const pause = enginePaused(engine.param)
  if (pause) {
    assert.match(result.title, /Temporarily Paused/)
    assert.match(result.description, /temporarily paused/)
    assert.ok(result.description.includes(pause.alternative.label))
    assert.doesNotMatch(result.description, /Free trial|complete narrated/)
  } else {
    assert.equal(result.title, old.title)
    const cost = creditsPerReferenceVideo(engine.qualityMode)
    assert.ok(result.description.includes(cost + ' credits'))
    assert.ok(result.description.includes('60-second'))
    assert.ok(result.description.includes('Free trial: ' + TRIAL_CREDITS_SHOWN + ' credits, no card'))
    assert.equal(result.description.includes('not enough'), TRIAL_CREDITS_SHOWN < cost)
  }
}
assert.equal(Object.keys(after({ params: { engine: 'not-a-real-engine' } })).length, 0)
// The visible page and all destinations remain exactly the same AST text.
const pageBody = source => {
  const tree = ast(source)
  return tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'EnginePage').getText(tree).replace(/\r\n/g, '\n')
}
// KINEO-GALERIA-DA-CASA-2026-09-21 — fundador ("Vamos de B"): a página ganhou a vitrine da casa por motor, colada ao
// formulário. A trava continua valendo para TODO o resto: tirado esse bloco (as 2 linhas do `house` e a seção
// `{house.length > 0 && (...)}`), o corpo da página tem de ser byte a byte o da base 560b5e2f.
const semGaleriaDaCasa = (body) => {
  const lines = body.split('\n')
  const out = []
  let skippingSection = false
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    // as 2 linhas do `house` (comentário + const)
    if (/^  \/\/ KINEO-GALERIA-DA-CASA-2026-09-21/.test(l)) { i += 1; continue }
    // a seção JSX inteira, do comentário de abertura até o `)}` que fecha `{house.length > 0 && (` (+ linha em branco)
    if (/^        \{\/\* KINEO-GALERIA-DA-CASA-2026-09-21/.test(l)) { skippingSection = true; continue }
    if (skippingSection) { if (l === '        )}') { skippingSection = false; if (lines[i + 1] === '') i += 1 } continue }
    out.push(l)
  }
  return out.join('\n')
}
assert.notEqual(pageBody(current), pageBody(previous), 'a galeria da casa existe na página atual')
assert.equal(semGaleriaDaCasa(pageBody(current)), pageBody(previous))
console.log('PASS: actual metadata, canonical URLs, pause policy and credit coverage for ' + ENGINE_SLUGS.length + ' engine pages; visible page unchanged')

// Exercise the hub's actual metadata object, not a copied expected object.
const hubFile = 'app/ai-video-generator/page.tsx'
const hubCurrent = fs.readFileSync(hubFile, 'utf8')
const hubPrevious = execFileSync('git', ['show', '7bd95b83:' + hubFile], { encoding: 'utf8' })
function hubMetadata(source) {
  const tree = ast(source)
  const declarations = tree.statements.filter(node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(declaration => ['HUB_DESCRIPTION', 'metadata'].includes(declaration.name.getText(tree))))
  const js = ts.transpileModule(declarations.map(node => node.getText(tree)).join('\n'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, URL, BASE: 'https://www.usekineo.com' }, { timeout: 2000 })
  return exports.metadata
}
const hubBefore = hubMetadata(hubPrevious), hubAfter = hubMetadata(hubCurrent)
assert.match(hubBefore.description, /Real user renders/)
assert.doesNotMatch(hubAfter.description, /real user renders|demo reel|rendered by each/i)
assert.equal(hubAfter.openGraph.description, hubAfter.description)
assert.equal(hubAfter.title, hubBefore.title)
assert.equal(hubAfter.alternates.canonical, hubBefore.alternates.canonical)
assert.equal(hubAfter.openGraph.url, hubBefore.openGraph.url)
const hubBody = source => {
  const tree = ast(source)
  return tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'EngineHubPage').getText(tree).replace(/\r\n/g, '\n')
}
assert.equal(hubBody(hubCurrent), hubBody(hubPrevious))
console.log('PASS: hub metadata no longer promises absent videos; canonical links and visible page unchanged')
