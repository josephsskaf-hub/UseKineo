/* Offline only: actual source/media files and VM evaluation of public catalog data. No API, env files or credentials. */
'use strict'
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { execFileSync } = require('node:child_process')
const ROOT = path.resolve(process.env.KINEO_TEST_ROOT || path.join(__dirname, '..'))
const DEPS = path.resolve(process.env.KINEO_TEST_DEPS || ROOT)
const ts = (() => {
  for (const location of [path.join(DEPS, 'node_modules/typescript')]) {
    if (fs.existsSync(location)) return require(location)
  }
  throw new Error('TypeScript is required for this offline guard.')
})()
const TARGET = 'lib/recreate/seuVideoCatalog.ts'
const REFERENCE_DIRECTORY = '/previews/galeria/seu-video-720p/'
const EXPECTED_IDS = ['selfie-confete', 'sueter-aconchegante', 'passarela', 'escolha-o-favorito', 'duelo-de-danca', 'outfit-morph', 'danca-corredor', 'friday-groove']
let assertions = 0
function check(value, message) { assertions++; assert.ok(value, message) }
function equal(actual, expected, message) { assertions++; assert.deepEqual(actual, expected, message) }
function source(relative) {
  const file = path.join(ROOT, relative)
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error('Missing runtime source: ' + relative)
  return fs.readFileSync(file, 'utf8')
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
function assetExists(url) {
  const filename = path.join(ROOT, 'public', url.slice(1))
  return fs.existsSync(filename) && fs.statSync(filename).isFile() && fs.statSync(filename).size > 0
}
const probeCache = new Map()
function rate(value) {
  const [numerator, denominator = 1] = String(value).split('/').map(Number)
  return numerator / denominator
}
function probeMedia(url) {
  if (probeCache.has(url)) return probeCache.get(url)
  // Read the actual local stream, not filenames, catalog declarations or a metadata sidecar.
  const raw = execFileSync(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,pix_fmt,width,height,avg_frame_rate,r_frame_rate,duration,nb_frames:format=duration', '-of', 'json', path.join(ROOT, 'public', url.slice(1))], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15_000 })
  const parsed = JSON.parse(raw), stream = parsed.streams?.[0]
  check(stream && typeof stream === 'object', '[media-stream] actual local video stream must exist')
  const result = { width: stream.width, height: stream.height, fps: rate(stream.avg_frame_rate), rate: rate(stream.r_frame_rate), duration: Number(stream.duration ?? parsed.format?.duration), frames: Number(stream.nb_frames), codec: stream.codec_name, pixelFormat: stream.pix_fmt }
  probeCache.set(url, result)
  return result
}
function validate(api, hasAsset = assetExists, readMedia = probeMedia) {
  check(Array.isArray(api.SEU_VIDEO_CATALOG), 'catalog must export an array')
  equal(Array.from(api.SEU_VIDEO_CATALOG, item => item.id), EXPECTED_IDS, 'curated reference IDs and priority must remain exact')
  check(new Set(api.SEU_VIDEO_CATALOG.map(item => item.id)).size === api.SEU_VIDEO_CATALOG.length, 'catalog reference IDs must be unique')
  for (const item of api.SEU_VIDEO_CATALOG) {
    check(item && typeof item.id === 'string' && typeof item.title === 'string' && item.title.trim().length > 0, 'reference identity must be usable')
    check(Object.keys(item).every(key => ['id', 'title', 'src', 'poster', 'seconds'].includes(key)), 'catalog must not leak engine, recipe, billing or request fields')
    const original = proven.get(item.id)
    check(original, 'reference must have a public people/movement source')
    check(typeof item.src === 'string' && /^\/previews\/galeria\/seu-video-720p\/[a-z0-9-]+\.mp4$/.test(item.src), 'reference video must be a local public MP4 in its dedicated 720p directory')
    equal(item.src, REFERENCE_DIRECTORY + item.id + '.mp4', 'reference video must match its canonical ID')
    equal(item.poster, original.poster, 'reference poster must match its canonical ID')
    equal(item.title, original.title, 'reference title must match the real catalog')
    check(hasAsset(item.src) && hasAsset(item.poster), 'reference media must exist and be nonempty')
    check(hasAsset(original.src), 'original media must remain available for other surfaces')
    const media = readMedia(item.src), before = readMedia(original.src)
    check(media.width === 720 && media.height === 1280, '[media-resolution] actual reference stream must be 720x1280')
    check(media.codec === 'h264' && media.pixelFormat === 'yuv420p', '[media-codec] reference must retain broadly supported H.264/yuv420p encoding')
    check(Number.isFinite(media.fps) && media.fps >= 24 && media.fps <= 60 && media.rate === media.fps, '[media-fps] actual reference frame rate must be constant and within 24–60 fps')
    equal(media.fps, before.fps, '[media-fps-preserved] reference frame rate must match its canonical original')
    check(Number.isFinite(media.duration) && media.duration >= 2 && media.duration <= 15, '[media-duration] actual reference duration must be within 2–15 seconds')
    check(Math.abs(media.duration - before.duration) <= 0.001, '[media-duration-preserved] reference must retain its original duration')
    check(Number.isInteger(media.frames) && media.frames > 0 && media.frames === before.frames, '[media-frames] every original frame must remain; no trimming or retiming')
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
  ['legacy 540p path restored', () => variant(items => { items[0].src = proven.get(items[0].id).src }), /local public MP4 in its dedicated/],
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
const mediaMutations = [
  ['undersized reference stream', value => { value.width = 540; value.height = 960 }, /\[media-resolution\]/],
  ['unsupported reference frame rate', value => { value.fps = 23; value.rate = 23 }, /\[media-fps\]/],
  ['reference frame rate changed', value => { value.fps = 30; value.rate = 30 }, /\[media-fps-preserved\]/],
  ['reference duration out of range', value => { value.duration = 16 }, /\[media-duration\]/],
  ['reference duration changed', value => { value.duration += 0.1 }, /\[media-duration-preserved\]/],
  ['reference frames trimmed', value => { value.frames-- }, /\[media-frames\]/],
]
for (const [name, mutate, expected] of mediaMutations) {
  let caught
  try { validate(api, assetExists, url => { const value = { ...probeMedia(url) }; if (url.startsWith(REFERENCE_DIRECTORY)) mutate(value); return value }) } catch (error) { caught = error }
  assert.ok(caught instanceof assert.AssertionError && expected.test(caught.message), 'Media mutant must fail its intended assertion, not execution: ' + name)
}
let missing
try { validate(api, () => false) } catch (error) { missing = error }
assert.ok(missing && missing.code === 'ERR_ASSERTION' && /media must exist and be nonempty/.test(missing.message), 'Missing media must fail the media contract')
for (const item of api.SEU_VIDEO_CATALOG) {
  const media = probeMedia(item.src)
  console.log(item.id + ': ' + media.width + 'x' + media.height + ', ' + media.fps + ' fps, ' + media.duration + ' s, ' + media.frames + ' frames')
}
console.log('Recreate own-video catalog: ' + api.SEU_VIDEO_CATALOG.length + ' public references, ' + baselineAssertions + ' baseline assertions, ' + (mutations.length + mediaMutations.length) + ' meaningful mutants rejected, missing-media scenario rejected. Offline only; actual streams read with local ffprobe.')
