/* Offline only: source files, Git blobs and VM evaluation of public catalog data. No API, env files or credentials. */
'use strict'
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { execFileSync } = require('node:child_process')
const ROOT = path.resolve(process.env.KINEO_TEST_ROOT || path.join(__dirname, '..'))
const ts = (() => {
  for (const location of [path.join(ROOT, 'node_modules/typescript')]) {
    if (fs.existsSync(location)) return require(location)
  }
  throw new Error('TypeScript is required for this offline guard.')
})()
const TARGET = 'lib/recreate/seuVideoCatalog.ts'
const EXPECTED_IDS = ['selfie-confete', 'sueter-aconchegante', 'passarela', 'escolha-o-favorito', 'duelo-de-danca', 'outfit-morph', 'danca-corredor', 'friday-groove']
let assertions = 0
function check(value, message) { assertions++; assert.ok(value, message) }
function equal(actual, expected, message) { assertions++; assert.deepEqual(actual, expected, message) }
function git(args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }) }
function source(relative) {
  const file = path.join(ROOT, relative)
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : git(['show', 'HEAD:' + relative])
}
function tree(text, filename) { return ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS) }
function evaluate(text, filename) {
  const result = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true })
  check(!result.diagnostics.some(d => d.category === ts.DiagnosticCategory.Error), 'catalog TypeScript must parse')
  const module = { exports: {} }
  const deny = () => { throw new Error('I/O is forbidden in the catalog VM') }
  vm.runInNewContext(result.outputText, { module, exports: module.exports, require: deny, fetch: deny }, { filename, timeout: 1000 })
  return module.exports
}
// Extract literal catalog declarations without executing unrelated recipes, engine policies or billing modules.
function initializer(text, filename, name) {
  const ast = tree(text, filename)
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) return declaration.initializer.getText(ast)
    }
  }
  throw new Error('Missing canonical data: ' + filename + '#' + name)
}
function canonicalData() {
  const clipsPath = 'lib/clipesNos2Lugares.ts', clips = source(clipsPath)
  const current = initializer(clips, clipsPath, 'CLIPES_NOVOS')
  const archived = initializer(clips, clipsPath, 'CLIPES_FORA_DA_VITRINE_1311')
  const refs = evaluate('module.exports = [' + current + ', ' + archived + '].flat()', clipsPath)
  const remixPath = 'lib/clips/faceRemix.ts', remix = source(remixPath)
  const seconds = initializer(remix, remixPath, 'FACE_REMIX_SECONDS')
  const house = initializer(remix, remixPath, 'FACE_REMIX_HOUSE_ITEMS')
  const friday = evaluate('const FACE_REMIX_SECONDS = ' + seconds + '; module.exports = ' + house, remixPath).find(item => item.id === 'friday-groove')
  check(friday && friday.launched === true, 'Friday reference must have a publicly launched canonical source')
  return new Map([...refs.filter(item => item.pessoa === true && item.produto === 'clip').map(item => [item.id, { title: item.title, src: '/previews/galeria/' + item.id + '.mp4', poster: '/posters/galeria/' + item.id + '.webp' }]), [friday.id, { title: friday.title, src: friday.video, poster: friday.poster, seconds: friday.seconds }]])
}
const proven = canonicalData()
const inventory = new Map()
for (const line of git(['ls-tree', '-r', '--long', 'HEAD', '--', 'public/previews/galeria', 'public/posters/galeria']).split(/\r?\n/)) {
  const match = line.match(/^\d+ blob [0-9a-f]+\s+(\d+)\t(.+)$/)
  if (match) inventory.set('/' + match[2].replace(/^public\//, ''), Number(match[1]))
}
function assetExists(url) {
  const filename = path.join(ROOT, 'public', url.slice(1))
  if (fs.existsSync(filename)) return fs.statSync(filename).isFile() && fs.statSync(filename).size > 0
  return (inventory.get(url) || 0) > 0
}
function validate(api, hasAsset = assetExists) {
  check(Array.isArray(api.SEU_VIDEO_CATALOG), 'catalog must export an array')
  equal(Array.from(api.SEU_VIDEO_CATALOG, item => item.id), EXPECTED_IDS, 'curated reference IDs and priority must remain exact')
  check(new Set(api.SEU_VIDEO_CATALOG.map(item => item.id)).size === api.SEU_VIDEO_CATALOG.length, 'catalog reference IDs must be unique')
  for (const item of api.SEU_VIDEO_CATALOG) {
    check(item && typeof item.id === 'string' && typeof item.title === 'string' && item.title.trim().length > 0, 'reference identity must be usable')
    check(Object.keys(item).every(key => ['id', 'title', 'src', 'poster', 'seconds'].includes(key)), 'catalog must not leak engine, recipe, billing or request fields')
    const original = proven.get(item.id)
    check(original, 'reference must have a public people/movement source')
    check(typeof item.src === 'string' && /^\/previews\/galeria\/[a-z0-9-]+\.mp4$/.test(item.src), 'reference video must be a local public MP4')
    equal(item.src, original.src, 'reference video must match its canonical ID')
    equal(item.poster, original.poster, 'reference poster must match its canonical ID')
    equal(item.title, original.title, 'reference title must match the real catalog')
    check(hasAsset(item.src) && hasAsset(item.poster), 'reference media must exist and be nonempty')
    if (item.seconds !== undefined) {
      check(original.seconds !== undefined, 'reference duration must not be invented from legacy recipes')
      equal(item.seconds, original.seconds, 'reference duration must match its own canonical source')
    }
  }
  check(typeof api.seuVideoCatalogItem === 'function', 'catalog must export the exact lookup')
  for (const item of api.SEU_VIDEO_CATALOG) equal(api.seuVideoCatalogItem(item.id), item, 'lookup must resolve each exact curated ID')
  for (const invalid of [null, undefined, 0, true, [], {}, { toString() { throw new Error('must not coerce unknown input') } }, '', 'unknown', 'elevador', '/previews/galeria/selfie-confete.mp4', 'https://example.com/video.mp4', ' selfie-confete ', 'SELFIE-CONFETE', '__proto__', 'constructor']) {
    equal(api.seuVideoCatalogItem(invalid), null, 'lookup must reject unknown, coerced or normalized identifiers')
  }
}
const text = source(TARGET)
const ast = tree(text, TARGET)
check(!ast.statements.some(statement => ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)), 'reference catalog must stay independent of runtime and backend modules')
const api = evaluate(text, TARGET)
validate(api)
check(Object.isFrozen(api.SEU_VIDEO_CATALOG) && api.SEU_VIDEO_CATALOG.every(Object.isFrozen), 'shared allowlist must be immutable at runtime')
const baselineAssertions = assertions
function variant(change) {
  const items = Array.from(api.SEU_VIDEO_CATALOG, item => ({ ...item }))
  change(items)
  return { SEU_VIDEO_CATALOG: items, seuVideoCatalogItem: id => typeof id === 'string' ? items.find(item => item.id === id) || null : null }
}
const mutations = [
  ['lose first new reference', () => variant(items => items.shift()), /curated reference IDs and priority/],
  ['duplicate reference', () => variant(items => { items[1] = { ...items[0] } }), /curated reference IDs and priority/],
  ['private API source', () => variant(items => { items[0].src = '/api/recreate/assets/selfie-confete.mp4' }), /local public MP4/],
  ['external source', () => variant(items => { items[0].src = 'https://example.com/selfie-confete.mp4' }), /local public MP4/],
  ['wrong reference video', () => variant(items => { items[0].src = items[1].src }), /video must match its canonical ID/],
  ['wrong reference poster', () => variant(items => { items[0].poster = items[1].poster }), /poster must match its canonical ID/],
  ['missing poster', () => variant(items => { delete items[0].poster }), /poster must match its canonical ID/],
  ['invented legacy duration', () => variant(items => { items[0].seconds = 8 }), /duration must not be invented/],
  ['invented title', () => variant(items => { items[0].title = 'Guaranteed result' }), /title must match the real catalog/],
  ['engine leaked to reference data', () => variant(items => { items[0].engine = 'example' }), /must not leak engine/],
  ['unknown ID falls back to first', () => ({ ...api, seuVideoCatalogItem: id => api.seuVideoCatalogItem(id) || api.SEU_VIDEO_CATALOG[0] }), /lookup must reject unknown/],
  ['lookup normalizes whitespace', () => ({ ...api, seuVideoCatalogItem: id => api.seuVideoCatalogItem(typeof id === 'string' ? id.trim() : id) }), /lookup must reject unknown/],
  ['lookup returns wrong clip', () => ({ ...api, seuVideoCatalogItem: id => typeof id === 'string' && api.seuVideoCatalogItem(id) ? api.SEU_VIDEO_CATALOG[0] : null }), /lookup must resolve each exact/],
]
for (const [name, mutate, expected] of mutations) {
  let caught
  try { validate(mutate()) } catch (error) { caught = error }
  assert.ok(caught && caught.code === 'ERR_ASSERTION' && expected.test(caught.message), 'Mutant must fail its intended contract: ' + name)
}
let missing
try { validate(api, () => false) } catch (error) { missing = error }
assert.ok(missing && missing.code === 'ERR_ASSERTION' && /media must exist and be nonempty/.test(missing.message), 'Missing media must fail the media contract')
console.log('Recreate own-video catalog: ' + api.SEU_VIDEO_CATALOG.length + ' public references, ' + baselineAssertions + ' baseline assertions, ' + mutations.length + ' meaningful mutants rejected, missing-media scenario rejected. Offline only.')
