// In-memory IndexedDB/Storage tests. No browser, network, credential, provider or upload is used.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const options = {}, args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  const flag = args[i], value = args[++i]
  assert(['--root', '--deps'].includes(flag) && value && !value.startsWith('--'), 'Usage: node scripts/test-seu-video-draft-1311.mjs [--root checkout] [--deps dependency-root]')
  options[flag.slice(2)] = value
}
const ROOT = path.resolve(options.root ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
const DEPS = path.resolve(options.deps ?? ROOT)
const require = createRequire(import.meta.url), ts = require(require.resolve('typescript', { paths: [DEPS] }))
const MODULE = 'lib/recreate/seuVideoDraft.ts'
const FILE_TYPE = 'lib/recreate/seuVideoFileType.ts'
const compiled = new Map()
function read(file) {
  // Missing runtime files must fail: never substitute a sibling checkout or historical source.
  return fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n')
}
let checks = 0
function check(id, value, message) { assert(value, '[' + id + '] ' + message); checks++ }
function session() { return { map: new Map(), failGet: false, failSet: false, failRemove: false, lie: false, getItem(key) { if (this.failGet) throw Error('storage unavailable'); return this.map.get(key) ?? null }, setItem(key, value) { if (this.failSet) throw Error('storage unavailable'); if (!this.lie) this.map.set(key, String(value)) }, removeItem(key) { if (this.failRemove) throw Error('storage unavailable'); this.map.delete(key) } } }
function database() {
  const state = { rows: new Map(), quota: false, failOpen: false, failRead: false, failDelete: false, log: [], opened: 0, closed: 0, indexes: new Set() }
  function db() {
    state.opened++
    const result = { objectStoreNames: { contains: () => true }, close() { state.closed++ }, createObjectStore() { return store(null) }, transaction() {
      const tx = { objectStore: () => store(tx) }; return tx
    } }
    return result
  }
  function store(tx) {
    function request(action, key, complete = true) {
      const r = {}; state.log.push({ action, key: typeof key === 'object' ? key?.id : key })
      queueMicrotask(() => {
        if (action === 'put' && state.quota || action === 'get' && state.failRead || action === 'delete' && state.failDelete) {
          const error = new Error('storage failed'); error.name = action === 'put' ? 'QuotaExceededError' : 'AbortError'; r.error = error; tx.error = error; r.onerror?.(); tx.onabort?.(); return
        }
        r.result = action === 'get' ? structuredClone(state.rows.get(key)) : action === 'put' ? (state.rows.set(key.id, structuredClone(key)), key.id) : action === 'clear' ? state.rows.clear() : state.rows.delete(key)
        r.onsuccess?.(); if (complete) queueMicrotask(() => tx.oncomplete?.())
      }); return r
    }
    return { indexNames: { contains: name => state.indexes.has(name) }, createIndex(name) { state.indexes.add(name) }, get: key => request('get', key), put: value => request('put', value), delete: key => request('delete', key), clear: () => request('clear'), index(name) {
      return { openKeyCursor(range) {
        state.log.push({ action: 'expired-keys', index: name })
        const keys = [...state.rows.values()].filter(row => typeof row.at === 'number' && (range.open ? row.at < range.upper : row.at <= range.upper)).map(row => row.id)
        const r = {}; let i = 0
        function advance() {
          const key = keys[i]
          r.result = key === undefined ? null : { primaryKey: key, delete: () => request('delete', key, false), continue() { i++; queueMicrotask(advance) } }
          r.onsuccess?.(); if (key === undefined) queueMicrotask(() => tx.oncomplete?.())
        }
        queueMicrotask(advance); return r
      } }
    } }
  }
  return { state, open() {
    const r = {}; queueMicrotask(() => {
      if (state.failOpen) { r.error = Error('IDB unavailable'); r.onerror?.(); return }
      r.result = db(); r.transaction = { objectStore: () => store(null) }; r.onupgradeneeded?.(); r.onsuccess?.()
    }); return r
  } }
}
function world({ storage = session(), idb = database(), override = null } = {}) {
  let now = Date.UTC(2026, 10, 13, 22)
  class Clock extends Date { static now() { return now } }
  const cache = new Map()
  function load(file) {
    file = file.replace(/^@\//, ''); if (!/\.(?:ts|json)$/.test(file)) file += '.ts'
    if (cache.has(file)) return cache.get(file)
    const source = file === MODULE && typeof override === 'string' ? override : override && typeof override === 'object' && Object.hasOwn(override, file) ? override[file] : read(file)
    if (file.endsWith('.json')) return JSON.parse(source)
    const key = file + '\0' + source
    if (!compiled.has(key)) { const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true); assert.equal(ast.parseDiagnostics.length, 0, 'source parses'); compiled.set(key, ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText) }
    const exports = {}; cache.set(file, exports)
    vm.runInNewContext(compiled.get(key), { exports, require(name) { if (name.startsWith('@/')) return load(name.slice(2)); if (name.startsWith('.')) return load(path.posix.normalize(path.posix.join(path.posix.dirname(file), name))); throw Error('External import forbidden: ' + name) }, Blob, File, URL, URLSearchParams, Date: Clock, crypto, indexedDB: idb, IDBKeyRange: { upperBound: (upper, open) => ({ upper, open }) }, sessionStorage: storage, process: { env: {} }, fetch() { throw Error('Network forbidden') } }, { filename: file, timeout: 5000 })
    return exports
  }
  return { api: load(MODULE), load, storage, idb, tick(ms) { now += ms } }
}
function draft(extra = {}) { return { source: { kind: 'upload', file: new File(['movie bytes'], 'source.mov', { type: 'video/quicktime', lastModified: 100 }) }, photos: [new File(['face bytes'], 'face.webp', { type: 'image/webp', lastModified: 200 })], prompt: 'Keep @Video1. Replace the person with @Image1.\nKeep the camera.', people: 1, consent: true, requestKey: crypto.randomUUID(), ...extra } }
async function rejectsCode(id, operation, api, code) { let error; try { await operation() } catch (e) { error = e } check(id, error instanceof api.SeuVideoDraftStorageError && error.code === code, 'typed ' + code + ' error, not silent loss') }
async function verify(override = null) {
  const a = world({ override }), original = draft()
  check('empty', await a.api.restoreSeuVideoDraft() === null && a.idb.state.log.length === 0, 'empty tab never searches IndexedDB')
  check('save', await a.api.saveSeuVideoDraft(original), 'valid local File draft saved')
  const ref = a.api.getSeuVideoDraftRef()
  check('identity', /^[a-f0-9-]{36}$/.test(ref), 'opaque random reference available')
  check('privacy', [...a.storage.map.values()].every(value => !/source\.mov|face\.webp|Video1|http|secret|signed|requestKey/.test(value)), 'sessionStorage contains random references only')
  const [r1, r2] = await Promise.all([a.api.restoreSeuVideoDraft(), a.api.restoreSeuVideoDraft()])
  check('idempotent', r1 && r2 && a.idb.state.rows.size === 1 && a.api.getSeuVideoDraftRef() === ref, 'StrictMode/concurrent reads never consume the draft')
  check('identity', r1.requestKey === original.requestKey && r1.prompt === original.prompt && r1.people === 1 && r1.consent === true, 'exact editable text and idempotency key survive')
  check('files', r1.source.file instanceof File && r1.photos[0] instanceof File && await r1.source.file.text() === 'movie bytes' && await r1.photos[0].text() === 'face bytes' && r1.source.file.type === 'video/quicktime' && r1.photos[0].name === 'face.webp', 'Blob content/type/name reconstructed as Files')
  r1.photos.length = 0; check('idempotent', (await a.api.restoreSeuVideoDraft()).photos.length === 1, 'caller mutations cannot change the persisted draft')
  const b = world({ idb: a.idb, override })
  a.idb.state.log.length = 0
  check('namespace', await b.api.restoreSeuVideoDraft() === null && a.idb.state.log.length === 0, 'new email tab cannot discover another tab draft without an explicit ref')
  b.storage.map.set('kineo:seu-video:tab:v1', crypto.randomUUID()); b.storage.map.set('kineo:seu-video:reference:v1', a.storage.map.get('kineo:seu-video:reference:v1'))
  check('namespace', await b.api.restoreSeuVideoDraft() === null, 'copied pointer from a different namespace is not implicitly trusted')
  b.storage.map.delete('kineo:seu-video:reference:v1')
  const beforeReads = a.idb.state.log.filter(x => x.action === 'get').length
  const email = await b.api.restoreSeuVideoDraft(ref)
  check('email', email.requestKey === original.requestKey && email.source.file instanceof File && b.api.getSeuVideoDraftRef() === ref, 'explicit reference restores and adopts the same draft after email auth')
  check('email', a.idb.state.log.filter(x => x.action === 'get').length === beforeReads + 1, 'explicit restore looks up only the supplied identity')
  check('email', (await b.api.restoreSeuVideoDraft()).prompt === original.prompt, 'adopted ref supports later idempotent reads')
  await rejectsCode('ref', () => b.api.restoreSeuVideoDraft('https://storage.invalid/signed?token=secret'), b.api, 'corrupt')
  await rejectsCode('ref', () => b.api.clearSeuVideoDraft('../other-draft'), b.api, 'corrupt')

  const fileTypes = world({ override }), contentType = fileTypes.load(FILE_TYPE).seuVideoContentType
  for (const [name, type, expected] of [['source.mp4', '', 'video/mp4'], ['source.mov', '', 'video/quicktime'], ['SOURCE.MP4', 'application/octet-stream', 'video/mp4'], ['SOURCE.MOV', 'application/octet-stream', 'video/quicktime']]) {
    const file = new File(['unchanged movie bytes'], name, { type, lastModified: 123 })
    const editable = draft({ source: { kind: 'upload', file } })
    check('generic-mime', contentType(file) === expected, 'generic MIME inferred from approved extension only')
    check('generic-mime', await fileTypes.api.saveSeuVideoDraft(editable), 'generic MIME selected by the client can be saved: ' + name + '/' + type)
    const restored = await fileTypes.api.restoreSeuVideoDraft()
    check('generic-mime', restored?.source.kind === 'upload' && restored.source.file instanceof File && restored.source.file.type === type && restored.source.file.name === name && restored.source.file.lastModified === 123 && await restored.source.file.text() === 'unchanged movie bytes' && restored.requestKey === editable.requestKey, 'roundtrip preserves the original bytes, metadata and key without rewriting MIME')
  }
  const longName = new File(['long-name movie bytes'], 'x'.repeat(220) + '.MOV', { type: '' })
  check('generic-mime', await fileTypes.api.saveSeuVideoDraft(draft({ source: { kind: 'upload', file: longName } })), 'long generic-MIME video name can be saved')
  const restoredLongName = await fileTypes.api.restoreSeuVideoDraft()
  check('generic-mime', restoredLongName?.source.kind === 'upload' && restoredLongName.source.file.name.length <= 200 && restoredLongName.source.file.name.endsWith('.MOV') && restoredLongName.source.file.type === '' && await restoredLongName.source.file.text() === 'long-name movie bytes', 'bounded filename preserves the suffix needed for restoring generic MIME')
  for (const [name, type] of [['fake.mp4', 'video/webm'], ['fake.mov', 'video/webm'], ['fake.webm', 'video/mp4'], ['fake.webm', 'application/octet-stream'], ['fake.mp4', 'image/png'], ['fake.bin', ''], ['fake.bin', 'application/octet-stream']]) {
    const file = new File(['unapproved bytes'], name, { type })
    check('file-type-rejection', contentType(file) === null && !await fileTypes.api.saveSeuVideoDraft(draft({ source: { kind: 'upload', file } })), 'explicit incompatible MIME or extension cannot masquerade as MP4/MOV: ' + name + '/' + type)
  }
  const savedGeneric = fileTypes.idb.state.rows.get(fileTypes.api.getSeuVideoDraftRef())
  savedGeneric.source.file.blob = new Blob(['webm bytes'], { type: 'video/webm' })
  savedGeneric.source.file.name = 'masquerade.mp4'
  await rejectsCode('file-type-rejection', () => fileTypes.api.restoreSeuVideoDraft(), fileTypes.api, 'corrupt')

  const shared = database(), firstTab = world({ idb: shared, override }), secondTab = world({ idb: shared, override })
  const named = draft({ genders: ['woman'] })
  check('genders', await firstTab.api.saveSeuVideoDraft(named), 'save per-photo choice')
  check('genders', (await firstTab.api.restoreSeuVideoDraft()).genders.join() === 'woman', 'restore exact choice')
  check('genders', !(await firstTab.api.saveSeuVideoDraft(draft({ genders: [] }))), 'reject incomplete choices')
  const partial = draft({ people: 3, photos: [1,2,3].map(n => new File(['face'+n], n+'.jpg', { type: 'image/jpeg' })), genders: ['woman', null, 'man'] })
  check('optional-genders', await firstTab.api.saveSeuVideoDraft(partial), 'optional unknown slots persist with partial explicit choices')
  const partialRef = firstTab.api.getSeuVideoDraftRef()
  check('optional-genders', JSON.stringify((await firstTab.api.restoreSeuVideoDraft()).genders) === '["woman",null,"man"]', 'no filtering or shifting of optional slots')
  const otherTab = world({ idb: shared, override })
  check('optional-genders', JSON.stringify((await otherTab.api.restoreSeuVideoDraft(partialRef)).genders) === '["woman",null,"man"]', 'partial choices survive explicit email return in a new tab')
  for (const gender of ['', 'robot', 2, undefined]) check('optional-genders', !await firstTab.api.saveSeuVideoDraft(draft({ genders: [gender] })), 'null is the only unknown value; arbitrary choices are rejected')
  await secondTab.api.saveSeuVideoDraft(draft())
  await secondTab.api.clearSeuVideoDraftsOnLogout()
  check('logout', shared.state.rows.size === 0 && await firstTab.api.restoreSeuVideoDraft() === null, 'logout clears local media across tabs')
  const catalog = world({ override })
  check('catalog', await catalog.api.saveSeuVideoDraft(draft({ source: { kind: 'catalog', id: 'selfie-confete' } })), 'canonical public swap stores its ID only')
  check('catalog', (await catalog.api.restoreSeuVideoDraft()).source.id === 'selfie-confete', 'catalog restored without storing/downloading its remote video')
  check('catalog', await catalog.api.saveSeuVideoDraft(draft({ source: { kind: 'catalog', id: 'danca-corredor' } })), 'curated public dance source accepted')
  for (const source of catalog.load('lib/recreate/seuVideoCatalog.ts').SEU_VIDEO_CATALOG) {
    check('catalog', await catalog.api.saveSeuVideoDraft(draft({ source: { kind: 'catalog', id: source.id } })) && (await catalog.api.restoreSeuVideoDraft()).source.id === source.id, 'every canonical approved source roundtrips: ' + source.id)
    const saved = catalog.idb.state.rows.get(catalog.api.getSeuVideoDraftRef())
    check('privacy', Object.keys(saved.source).sort().join() === 'id,kind', 'catalog stores identity only, never media URL')
  }
  await catalog.api.saveSeuVideoDraft(draft({ source: { kind: 'catalog', id: 'danca-corredor' } }))
  for (const bad of [draft({ source: { kind: 'catalog', id: 'https://signed.invalid/movie.mp4' } }), draft({ source: { kind: 'catalog', id: 'not-canonical' } }), draft({ source: { kind: 'catalog', id: 'selfie-confete', signedUrl: 'secret' } }), draft({ serverResult: { order: 'private' } }), draft({ photos: [], people: 1 }), draft({ photos: draft().photos, people: 2 }), draft({ consent: 'yes' }), draft({ prompt: 'x'.repeat(901) }), draft({ requestKey: 'https://secret.invalid' }), draft({ source: { kind: 'upload', file: new File(['x'], 'x.webm', { type: 'video/webm' }) } }), draft({ photos: [new File(['x'], 'x.svg', { type: 'image/svg+xml' })] })]) check('validation', await catalog.api.saveSeuVideoDraft(bad) === false, 'invalid/remote/server payload rejected before replacing a good draft')
  const bigVideo = new File(['x'], 'big.mp4', { type: 'video/mp4' }); Object.defineProperty(bigVideo, 'size', { value: 100 * 1024 * 1024 + 1 })
  const bigPhoto = new File(['x'], 'big.jpg', { type: 'image/jpeg' }); Object.defineProperty(bigPhoto, 'size', { value: 8 * 1024 * 1024 + 1 })
  check('validation', !await catalog.api.saveSeuVideoDraft(draft({ source: { kind: 'upload', file: bigVideo } })) && !await catalog.api.saveSeuVideoDraft(draft({ photos: [bigPhoto] })), 'canonical byte ceilings enforced')
  check('validation', (await catalog.api.restoreSeuVideoDraft()).source.id === 'danca-corredor', 'invalid writes preserve the previous draft')
  check('validation', await catalog.api.saveSeuVideoDraft(draft({ people: 3, photos: [1,2,3].map(n => new File(['face' + n], n + '.png', { type: 'image/png' })), prompt: 'x'.repeat(900), consent: false })), 'three photos, full prompt limit and unchecked consent persist without inventing validation state')
  const three = await catalog.api.restoreSeuVideoDraft()
  check('files', three.photos.length === 3 && await three.photos[2].text() === 'face3' && three.prompt.length === 900 && three.consent === false, 'all three files and exact consent/text survive')

  a.idb.state.quota = true
  check('quota', await a.api.saveSeuVideoDraft(draft({ prompt: 'new private draft' })) === false, 'quota failure blocks auth handoff')
  a.idb.state.quota = false
  check('quota', (await a.api.restoreSeuVideoDraft()).prompt === original.prompt && a.api.getSeuVideoDraftRef() === ref, 'atomic failed overwrite keeps earlier bytes and reference')
  const unavailable = world({ override }); unavailable.storage.failSet = true
  check('storage', await unavailable.api.saveSeuVideoDraft(original) === false && unavailable.idb.state.rows.size === 0, 'blocked sessionStorage never claims a saved draft')
  const lie = world({ override }); lie.storage.lie = true
  check('storage', await lie.api.saveSeuVideoDraft(original) === false, 'storage readback detects discarded writes')
  const noDb = world({ override }); noDb.idb.state.failOpen = true
  check('storage', await noDb.api.saveSeuVideoDraft(original) === false && noDb.api.getSeuVideoDraftRef() === null, 'unavailable IDB never leaves a claimed saved reference')
  a.idb.state.failRead = true; await rejectsCode('storage', () => a.api.restoreSeuVideoDraft(), a.api, 'unavailable'); a.idb.state.failRead = false
  a.idb.state.failDelete = true; await rejectsCode('storage', () => a.api.clearSeuVideoDraft(), a.api, 'unavailable'); a.idb.state.failDelete = false
  check('storage', a.api.getSeuVideoDraftRef() === ref && a.idb.state.rows.has(ref), 'failed clear preserves pointer and data for recovery')

  const corrupt = world({ override }); await corrupt.api.saveSeuVideoDraft(original)
  const corruptRef = corrupt.api.getSeuVideoDraftRef(), row = corrupt.idb.state.rows.get(corruptRef)
  row.source = { kind: 'upload', file: { blob: new Blob(['html'], { type: 'text/html' }), name: 'x.mp4', lastModified: 1 } }
  await rejectsCode('corrupt', () => corrupt.api.restoreSeuVideoDraft(), corrupt.api, 'corrupt')
  const adoptedBefore = b.api.getSeuVideoDraftRef()
  // Same-origin persistent DB is shared; explicit corrupt refs never replace an unrelated good ref.
  const third = world({ idb: corrupt.idb, storage: b.storage, override })
  await rejectsCode('corrupt', () => third.api.restoreSeuVideoDraft(corruptRef), third.api, 'corrupt')
  check('corrupt', third.api.getSeuVideoDraftRef() === adoptedBefore, 'corrupt explicit reference cannot be adopted')
  await corrupt.api.clearSeuVideoDraft(); check('clear', corrupt.idb.state.rows.size === 0, 'explicit clear can remove corrupt payload bytes')
  const badPointer = world({ override }); await badPointer.api.saveSeuVideoDraft(original); const savedRef = badPointer.api.getSeuVideoDraftRef()
  badPointer.storage.map.set('kineo:seu-video:reference:v1', '{broken')
  await rejectsCode('corrupt', () => badPointer.api.restoreSeuVideoDraft(), badPointer.api, 'corrupt')
  await badPointer.api.clearSeuVideoDraft(savedRef)
  check('clear', badPointer.idb.state.rows.size === 0 && badPointer.api.getSeuVideoDraftRef() === null, 'explicit known ref can clear bytes despite a corrupted local pointer')
  const own = world({ idb: a.idb, override }); await own.api.saveSeuVideoDraft(draft({ prompt: 'another tab own draft' })); const ownRef = own.api.getSeuVideoDraftRef()
  await own.api.clearSeuVideoDraft(ref)
  check('namespace', own.api.getSeuVideoDraftRef() === ownRef && (await own.api.restoreSeuVideoDraft()).prompt === 'another tab own draft', 'explicit clear of another known ref preserves this tab own draft')
  await a.api.saveSeuVideoDraft(original)
  const expired = world({ override }); await expired.api.saveSeuVideoDraft(original); expired.tick(2 * 60 * 60 * 1000 + 1)
  check('ttl', await expired.api.restoreSeuVideoDraft() === null && expired.idb.state.rows.size === 0 && expired.api.getSeuVideoDraftRef() === null, 'expired private files and pointer are cleaned')
  await b.api.clearSeuVideoDraft(ref)
  check('clear', !a.idb.state.rows.has(ref) && b.api.getSeuVideoDraftRef() === null && await a.api.restoreSeuVideoDraft() === null, 'clear from adopted tab clears same bytes; old pointer cannot resurrect them')
  check('cleanup', a.idb.state.opened === a.idb.state.closed, 'successful and failed transactions close their DB connection')
}
await verify(); const baseline = checks, original = read(MODULE), fileTypeOriginal = read(FILE_TYPE)
const mutants = [
  ['unknown slots become mandatory', 'optional-genders', original.replace("value === null || value === 'man'", "value === 'man'")],
  ['restored partial slots compacted', 'optional-genders', original.replace('genders: [...record.genders]', 'genders: record.genders.filter(Boolean)')],
  ['restore consumes early', 'idempotent', original.replace('await expire()\n    if (explicitRef !== undefined) adopt', "await transaction('readwrite', store => store.delete(id))\n    await expire()\n    if (explicitRef !== undefined) adopt")],
  ['TTL ignored', 'ttl', original.replace('Date.now() - at <= TTL', 'true')],
  ['WebM accepted', 'file-type-rejection', original.replace('seuVideoContentType({ name, type: blob.type }) !== null', 'true')],
  ['generic MIME rejected before extension inference', 'generic-mime', { [FILE_TYPE]: fileTypeOriginal.replace("type !== '' && type !== 'application/octet-stream'", 'true') }],
  ['explicit WebM MIME gets extension fallback', 'file-type-rejection', { [FILE_TYPE]: fileTypeOriginal.replace("type !== '' && type !== 'application/octet-stream'", 'false') }],
  ['quota reported as success', 'quota', original.replace('} catch {} return false }', '} catch {} return true }')],
  ['cross-tab implicit pointer trusted', 'namespace', original.replace('return ref.tab === tab(false) ?', 'return true ?')],
  ['unknown server data accepted', 'validation', original.replace("!only(source, ['kind', 'id'])", 'false')],
  ['catalog allowlist bypassed', 'validation', original.replace('seuVideoCatalogItem(id) !== null', 'true')],
  ['idempotency key lost on return', 'identity', original.replace('...(record.requestKey === undefined ? {} : { requestKey: record.requestKey })', '...{}')],
]
for (const [name, id, mutant] of mutants) {
  assert.notEqual(typeof mutant === 'string' ? mutant : mutant[FILE_TYPE], typeof mutant === 'string' ? original : fileTypeOriginal, 'Mutation must apply: ' + name)
  let error; try { await verify(mutant) } catch (e) { error = e }
  assert(error instanceof assert.AssertionError, 'Only AssertionError counts; execution errors never kill mutants: ' + name + ' ' + error?.stack)
  assert(error.message.startsWith('[' + id + ']'), name + ': wrong guard: ' + error.message)
  console.log('MUTANT REJECTED [' + id + '] ' + name)
}
console.log('SeuVideoDraft: ' + baseline + ' offline assertions; ' + mutants.length + '/' + mutants.length + ' targeted mutants rejected; no browser/network/render')
