// Offline UI contract: React SSR, hook lifecycle and real event handlers with local File fixtures and mocked I/O.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(process.env.KINEO_TEST_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
const dependency = name => require(require.resolve(name, { paths: [ROOT] }))
const ts = dependency('typescript'), React = dependency('react')
const { renderToStaticMarkup } = dependency('react-dom/server')
const jsx = dependency('react/jsx-runtime')
const UI = 'app/recreate-preview/SeuVideoRecreateClient.tsx', PAGE = 'app/recreate-preview/page.tsx'
const texts = new Map()
const read = relative => { if (!texts.has(relative)) texts.set(relative, fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g,'\n')); return texts.get(relative) }
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
let assertions = 0
function check(value, tag, detail = '') { assertions++; assert.ok(value, tag + (detail ? ': ' + detail : '')) }
function equal(actual, expected, tag) { assertions++; assert.deepEqual(actual, expected, tag) }
function identical(actual, expected, tag) { assertions++; assert.strictEqual(actual, expected, tag) }
function failIo() { throw new Error('Unexpected external dependency or I/O in offline UI guard') }
function loadModule(relative, stubs = {}, globals = {}, overrides = {}) {
  const cache = new Map()
  function load(file) {
    file = path.posix.normalize(file)
    if (file.endsWith('.css')) return {}
    if (!/\.tsx?$/.test(file)) file += fs.existsSync(path.join(ROOT, file + '.ts')) ? '.ts' : '.tsx'
    if (cache.has(file)) return cache.get(file).exports
    const source = overrides[file] ?? read(file)
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    if (parsed.parseDiagnostics.length) throw new Error('Invalid test/mutant source: ' + file)
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText
    const mod = { exports: {} }; cache.set(file, mod)
    const req = name => {
      if (Object.hasOwn(stubs, name)) return stubs[name]
      if (name === 'react/jsx-runtime') return jsx
      if (name.startsWith('@/')) return load(name.slice(2))
      if (name.startsWith('.')) return load(path.posix.join(path.posix.dirname(file), name))
      throw new Error('Unmocked dependency: ' + name + ' from ' + file)
    }
    vm.runInNewContext(js, { module: mod, exports: mod.exports, require: req, Error, TypeError, URL, URLSearchParams, File, Blob, FormData, AbortController, fetch: failIo, setTimeout: failIo, clearTimeout: failIo, console, ...globals }, { filename: file, timeout: 1500 })
    return mod.exports
  }
  return load(relative)
}
// Use the actual approved tariff and pure server rules; do not retype credit values into this guard.
const pricingSource = read('lib/checkoutPricing.ts')
const pricingAst = ts.createSourceFile('pricing.ts', pricingSource, ts.ScriptTarget.Latest, true)
const pricingDeclarations = pricingAst.statements.filter(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'recreateCreditCost' || ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'RECREATE_PRICING')).map(statement => statement.getText(pricingAst)).join('\n')
const pricing = loadModule('lib/checkoutPricing.ts', {}, {}, { 'lib/checkoutPricing.ts': pricingDeclarations })
const rules = loadModule('lib/recreate/seuVideo.ts', { '@/lib/checkoutPricing': pricing })
const helper = loadModule('lib/recreate/seuVideoClient.ts', { './seuVideo': rules, './photos': { compressPhoto: async file => file } })
const catalog = loadModule('lib/recreate/seuVideoCatalog.ts')
const release = loadModule('lib/recreate/seuVideoPreviewRelease.ts')
const signup = loadModule('lib/growth/visitanteEscreveAntes.ts')
const photo = name => new File(['photo fixture'], name + '.jpg', { type: 'image/jpeg' })
const video = name => new File(['local video fixture'], name + '.mp4', { type: 'video/mp4' })
const reference = '22222222-3333-4444-5555-666666666666'
const noRequests = h => h.calls.prepare.length + h.calls.generate.length + h.calls.status.length + h.calls.fetch.length === 0
const children = node => node?.props?.children
function nodes(node, predicate, out = []) {
  if (Array.isArray(node)) { for (const child of node) nodes(child, predicate, out); return out }
  if (!node || typeof node !== 'object') return out
  if (predicate(node)) out.push(node)
  nodes(children(node), predicate, out)
  return out
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('')
  if (node == null || typeof node === 'boolean') return ''
  return typeof node === 'object' ? text(children(node)) : String(node)
}
const by = (h, predicate) => { const found = nodes(h.tree, predicate); assert.ok(found.length, 'Missing UI test target'); return found[0] }
const button = (h, expression) => by(h, node => node.type === 'button' && expression.test(text(node)))
const generateButton = h => by(h, node => node.type === 'button' && Object.hasOwn(node.props, 'data-seu-video-generate'))
const input = (h, label) => by(h, node => node.type === 'input' && node.props['aria-label'] === label)
const textarea = h => by(h, node => node.type === 'textarea')

// Fixture-only state selection follows hook declarations in the real component instead of hard-coded hook indexes.
function hookStateNames(source) {
  const ast = ts.createSourceFile(UI, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const component = ast.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'SeuVideoRecreateClient')
  if (!component?.body) throw new Error('Cannot find the real fixture component')
  const names = []
  for (const statement of component.body.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isArrayBindingPattern(declaration.name) && declaration.initializer && ts.isCallExpression(declaration.initializer) && ts.isIdentifier(declaration.initializer.expression) && declaration.initializer.expression.text === 'useState') {
        const binding = declaration.name.elements[0]
        if (!ts.isBindingElement(binding) || !ts.isIdentifier(binding.name)) throw new Error('Unsupported fixture state declaration')
        names.push(binding.name.text)
      }
    }
  }
  return names
}
function harness(options = {}, override) {
  const stateNames = options.stateOverrides ? hookStateNames(override ?? read(UI)) : []
  for (const name of Object.keys(options.stateOverrides || {})) if (!stateNames.includes(name)) throw new Error('Unknown fixture state: ' + name)
  const h = { hooks: [], cursor: 0, stateCursor: 0, dirty: true, pending: [], tree: null, props: { signedIn: false, generationAllowed: false, accountKey: null, ...options.props }, calls: { prepare: [], generate: [], status: [], fetch: [], save: [], restore: [], clear: [], navigate: [], urls: [], revoked: [] }, timers: new Map(), storage: new Map(options.initialStorage || []), checkedQueue: [...(options.checkedQueue || [])], generateQueue: [...(options.generateQueue || [])], statusQueue: [...(options.statusQueue || [])], restoreQueue: [...(options.restoreQueue || [])] }
  const state = initial => {
    const index = h.cursor++, stateName = stateNames[h.stateCursor++]
    if (!h.hooks[index]) h.hooks[index] = { kind: 'state', value: options.stateOverrides && Object.hasOwn(options.stateOverrides, stateName) ? options.stateOverrides[stateName] : typeof initial === 'function' ? initial() : initial }
    const slot = h.hooks[index]
    return [slot.value, value => { const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; h.dirty = true } }]
  }
  const useRef = initial => { const index = h.cursor++; return h.hooks[index] ||= { current: initial } }
  const useMemo = (create, deps) => { const index = h.cursor++; if (!h.hooks[index] || !same(h.hooks[index].deps, deps)) h.hooks[index] = { value: create(), deps }; return h.hooks[index].value }
  const useEffect = (create, deps) => {
    const index = h.cursor++, previous = h.hooks[index]
    if (!previous || !same(previous.deps, deps)) { const slot = { kind: 'effect', deps, create, cleanup: previous?.cleanup }; h.hooks[index] = slot; h.pending.push(slot) }
  }
  let uuid = 0, nextTimer = 0
  class LocalURL extends URL {}
  LocalURL.createObjectURL = file => { const url = 'blob:local-fixture-' + h.calls.urls.length; h.calls.urls.push({ file, url }); return url }
  LocalURL.revokeObjectURL = url => h.calls.revoked.push(url)
  const fakeClient = {
    async prepareSeuVideo(value, signal) {
      h.calls.prepare.push({ value, signal })
      const next = h.checkedQueue.shift()
      if (next instanceof Error) throw next
      return next || { video_path: 'recreate-uploads/fixture/video.mp4', people: value.people, seconds: 6, fps: 30, width: 540, height: 960, bytes: value.file.size, generated_seconds: 6, credits: helper.estimateSeuVideoCredits(6), prompt: helper.defaultSeuVideoPrompt(value.people), needs_plan: false, shortfall: 0 }
    },
    async generateSeuVideo(value, signal) {
      h.calls.generate.push({ value, signal })
      const next = h.generateQueue.shift()
      if (next instanceof Error) throw next
      return next || { clip: { id: 'fixture-clip', status: 'pending', refundConfirmed: false }, replay: false, key: value.key }
    },
    async getSeuVideoStatus(id, signal) {
      h.calls.status.push({ id, signal })
      const next = h.statusQueue.shift()
      if (next instanceof Error) throw next
      return next || { id, status: 'pending', refundConfirmed: false }
    },
  }
  const draft = {
    async saveSeuVideoDraft(value) { h.calls.save.push(value); if (options.saveError) throw options.saveError; return options.savePromise ? await options.savePromise : options.saveResult !== false },
    async restoreSeuVideoDraft(value) { h.calls.restore.push(value); if (options.restoreError) throw options.restoreError; return h.restoreQueue.length ? await h.restoreQueue.shift() : options.restored || null },
    getSeuVideoDraftRef: () => options.missingRef ? null : reference,
    async clearSeuVideoDraft(value) { h.calls.clear.push(value) },
  }
  const globals = {
    URL: LocalURL,
    crypto: { randomUUID: () => '11111111-2222-4333-8444-' + String(++uuid).padStart(12, '0') },
    window: { location: { assign: destination => h.calls.navigate.push(destination) } },
    sessionStorage: { getItem: key => h.storage.get(key) || null, setItem: (key, value) => h.storage.set(key, value), removeItem: key => h.storage.delete(key) },
    fetch: async (url, init) => { h.calls.fetch.push({ url, init }); return { ok: true, blob: async () => new Blob(['public reference fixture'], { type: 'video/mp4' }) } },
    setTimeout: (callback, delay) => { const id = ++nextTimer; h.timers.set(id, { callback, delay }); return id },
    clearTimeout: id => h.timers.delete(id),
  }
  const stubs = {
    react: { ...React, useState: state, useRef, useMemo, useEffect },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/lib/recreate/seuVideo': {...rules,SEU_VIDEO_SOM_ORIGINAL:options.originalAudio??rules.SEU_VIDEO_SOM_ORIGINAL},
    '@/lib/recreate/seuVideoCatalog': catalog,
    '@/lib/recreate/seuVideoPreviewRelease': release,
    '@/lib/growth/visitanteEscreveAntes': signup,
    '@/lib/recreate/seuVideoClient': { ...helper, createSeuVideoClient: () => fakeClient, validateSeuVideoFile: async file => ({ file, seconds: 6, estimatedCredits: helper.estimateSeuVideoCredits(6) }) },
    '@/lib/recreate/seuVideoDraft': draft,
  }
  const Component = loadModule(UI, stubs, globals, override ? { [UI]: override } : {}).default
  h.render = () => { h.cursor = 0; h.stateCursor = 0; h.dirty = false; h.tree = Component(h.props); return h.tree }
  h.effects = () => { const work = h.pending.splice(0); for (const slot of work) { slot.cleanup?.(); slot.cleanup = slot.create() } }
  h.flush = async () => { for (let turn = 0; turn < 30; turn++) { if (h.dirty) h.render(); h.effects(); await Promise.resolve(); await Promise.resolve() } if (h.dirty) throw new Error('Hook runner did not settle') }
  h.replay = () => { for (const slot of h.hooks) if (slot?.kind === 'effect') { slot.cleanup?.(); slot.cleanup = slot.create() } }
  h.unmount = () => { for (const slot of h.hooks) if (slot?.kind === 'effect') slot.cleanup?.() }
  h.click = async target => { target.props.onClick(); await h.flush() }
  h.render()
  return h
}
async function selectPhoto(h, slot, file) {
  const container = nodes(h.tree, node => node.props?.className === 'sv-photo')[slot]
  const picker = nodes(container, node => node.type === 'button' && /^(Add|Change) photo$/.test(text(node)))[0]
  await h.click(picker)
  input(h, 'Choose person photo').props.onChange({ target: { files: [file], value: 'fixture' } })
  await h.flush()
}
async function ready(h, options = {}) {
  await h.flush()
  if (options.catalog) { by(h, node => node.type === 'video' && node.props['aria-label'] === 'Selected reference video').props.onLoadedMetadata({ currentTarget: { duration: 6 } }); await h.flush() }
  else { input(h, 'Choose reference video file').props.onChange({ target: { files: [options.video || video('private-input')], value: 'fixture' } }); await h.flush() }
  await selectPhoto(h, 0, options.photo || photo('private-person'))
  by(h, node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } })
  await h.flush()
  check(!generateButton(h).props.disabled, 'ready-explicit-generate')
}
async function pageScenario(override) {
  for (const [user, allowed] of [[null, false], [{ id: 'house', email: 'house@fixture.invalid' }, true], [{ id: 'customer', email: 'customer@fixture.invalid' }, false]]) {
    let authCalls = 0
    const page = loadModule(PAGE, {
      'next/navigation': { notFound() { const error = new Error('not-found-fixture'); error.code = 'NOT_FOUND'; throw error } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { async getUser() { authCalls++; return { data: { user } } } } }) },
      '@/lib/recreate/access': { releaseVisible: (email, state) => state === 'public' || state === 'internal' && email === 'house@fixture.invalid' },
      '@/lib/recreate/seuVideo': rules,
      '@/lib/recreate/seuVideoPreviewRelease': release,
      './SeuVideoRecreateClient': { __esModule: true, default: () => null },
    }, {}, override ? { [PAGE]: override } : {})
    const element = await page.default({ searchParams: { example: 'selfie-confete', draft: reference } })
    equal(element.props.signedIn, !!user, 'page-auth-props')
    equal(element.props.generationAllowed, allowed, 'page-internal-action-gate')
    equal(element.props.accountKey, user?.id ?? null, 'page-account-owner')
    equal(element.props.initialExample, 'selfie-confete', 'page-public-example')
    equal(element.props.draftRef, reference, 'page-opaque-draft')
    equal(page.metadata.robots.index, false, 'preview-noindex')
    equal(page.metadata.robots.googleBot.index, false, 'preview-google-noindex')
    equal(authCalls, 1, 'page-one-auth-read')
  }
  let authCalls = 0
  const disabled = loadModule(PAGE, {
    'next/navigation': { notFound() { const error = new Error('not-found-fixture'); error.code = 'NOT_FOUND'; throw error } },
    '@/lib/supabase/server': { createClient() { authCalls++; failIo() } },
    '@/lib/recreate/access': { releaseVisible: () => false },
    '@/lib/recreate/seuVideo': rules,
    '@/lib/recreate/seuVideoPreviewRelease': { ...release, SEU_VIDEO_PREVIEW_ENABLED: false },
    './SeuVideoRecreateClient': { __esModule: true, default: () => null },
  }, {}, override ? { [PAGE]: override } : {})
  let error; try { await disabled.default({}) } catch (caught) { error = caught }
  check(error?.code === 'NOT_FOUND', 'preview-flag-off')
  equal(authCalls, 0, 'disabled-preview-no-auth')
  for (const file of ['app/sitemap.ts', 'app/llms.txt/route.ts']) check(!read(file).includes('/recreate-preview'), 'preview-excluded-' + file)
}
async function mountScenario(override) {
  for (const props of [{ signedIn: false, generationAllowed: false }, { signedIn: true, generationAllowed: true, accountKey: 'house' }, { signedIn: true, generationAllowed: false, accountKey: 'customer' }]) {
    const h = harness({ props }, override)
    const html = renderToStaticMarkup(h.tree)
    check(html.includes('Recreate with your video') && html.includes('480p') && html.includes('silent'), 'ssr-useful-before-effects')
    check(!/Seedance|bytedance|Minimax|fal-ai/i.test(html), 'ssr-no-engine-details')
    equal(nodes(h.tree, node => node.type === 'progress').length, 0, 'ssr-no-fake-progress')
    await h.flush()
    check(noRequests(h), 'mount-zero-api')
    await ready(h)
    textarea(h).props.onChange({ target: { value: helper.defaultSeuVideoPrompt(1) + ' A calm camera movement.' } })
    await h.flush()
    await h.click(button(h, /Use the suggested instruction/))
    check(noRequests(h) && h.calls.save.length === 0 && h.calls.navigate.length === 0, 'edit-zero-api-or-auth')
    h.unmount()
    check(h.calls.revoked.length > 0, 'local-object-url-cleanup')
  }
}
async function metadataRaceScenario(override) {
  const h = harness({}, override)
  const metadata = by(h, node => node.type === 'video' && node.props['aria-label'] === 'Selected reference video')
  // Cached media may dispatch metadata before passive source effects run. No second event is guaranteed.
  metadata.props.onLoadedMetadata({ currentTarget: { duration: 6 } })
  h.render()
  const credits = helper.estimateSeuVideoCredits(6)
  check(credits !== null && text(generateButton(h)).includes(credits + ' credits'), 'metadata-before-effects-estimates-cost')
  await h.flush()
  check(text(generateButton(h)).includes(credits + ' credits'), 'metadata-before-effects-keeps-cost')
  check(noRequests(h) && h.calls.navigate.length === 0, 'metadata-race-stays-local')
  h.unmount()
}
async function audioScenario(override) {
  for(const originalAudio of [true,false])for(const pending of [false,true]){
    const h=harness({originalAudio,stateOverrides:{restoring:false,...(pending?{clip:{id:'audio-fixture',status:'pending',refundConfirmed:false}}:{})}},override)
    const copy=text(h.tree)
    check(originalAudio?copy.includes('Original audio when available'):!copy.includes('Original audio when available')&&/Silent video|No sound is generated/.test(copy),'audio-copy-follows-server-switch')
    check(noRequests(h),'audio-state-does-not-generate')
  }
}
async function hydrationMetadataScenario(override) {
  function videoElement(src, readyState = 4, duration = 6.583333) {
    const listeners = new Map()
    return {
      readyState, duration, listeners,
      getAttribute: name => name === 'src' ? src : null,
      addEventListener(name, listener) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(listener) },
      removeEventListener(name, listener) { listeners.get(name)?.delete(listener) },
      dispatch(name) { for (const listener of listeners.get(name) || []) listener() },
    }
  }
  function attach(h, element) {
    const node = by(h, item => item.type === 'video' && item.props['aria-label'] === 'Selected reference video')
    // React 18 keeps ref on the element; React 19 exposes it in props. Avoid warning getters in either version.
    const domRef = Object.getOwnPropertyDescriptor(node.props, 'ref')?.value ?? Object.getOwnPropertyDescriptor(node, 'ref')?.value
    check(domRef && typeof domRef === 'object', 'hydration-reference-has-dom-ref')
    domRef.current = element
  }
  const credits = helper.estimateSeuVideoCredits(6.583333)
  const cached = harness({}, override), cachedVideo = videoElement(catalog.SEU_VIDEO_CATALOG[0].src)
  attach(cached, cachedVideo)
  // No JSX onLoadedMetadata call: SSR media finished loading before React attached its event handlers.
  await cached.flush()
  check(text(generateButton(cached)).includes(credits + ' credits'), 'hydration-ready-metadata-keeps-cost')
  equal(cachedVideo.listeners.get('loadedmetadata')?.size, 1, 'hydration-metadata-listener-installed')
  check(noRequests(cached), 'hydration-ready-metadata-no-api')
  cached.unmount()
  equal(cachedVideo.listeners.get('loadedmetadata')?.size, 0, 'hydration-metadata-listener-cleaned')
  const late = harness({}, override), lateVideo = videoElement(catalog.SEU_VIDEO_CATALOG[0].src, 0, NaN)
  attach(late, lateVideo); await late.flush()
  check(!/credits/.test(text(generateButton(late))), 'hydration-unready-metadata-no-invented-cost')
  lateVideo.readyState = 1; lateVideo.duration = 6.583333; lateVideo.dispatch('loadedmetadata'); await late.flush()
  check(text(generateButton(late)).includes(credits + ' credits'), 'hydration-later-metadata-updates-cost')
  late.unmount()
  const stale = harness({}, override)
  attach(stale, videoElement(catalog.SEU_VIDEO_CATALOG[1].src)); await stale.flush()
  check(!/credits/.test(text(generateButton(stale))), 'hydration-previous-source-metadata-rejected')
  check(noRequests(stale), 'hydration-source-check-no-api')
  stale.unmount()
}
async function slotsScenario(override) {
  const h = harness({}, override); await h.flush()
  await h.click(by(h, node => node.type === 'button' && node.props['aria-label'] === '3 people'))
  await selectPhoto(h, 2, photo('third-first'))
  by(h, node => node.type === 'video').props.onLoadedMetadata({ currentTarget: { duration: 6 } })
  by(h, node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } })
  await h.flush()
  check(generateButton(h).props.disabled, 'photo-three-does-not-fill-one-two')
  await h.click(generateButton(h))
  check(h.calls.save.length === 0 && noRequests(h) && h.calls.navigate.length === 0, 'incomplete-slots-no-submission')
  await selectPhoto(h, 0, photo('first')); await selectPhoto(h, 1, photo('second'))
  check(!generateButton(h).props.disabled, 'all-distinct-slots-complete')
  await h.click(by(h, node => node.type === 'button' && node.props['aria-label'] === 'Remove photo 2'))
  check(generateButton(h).props.disabled, 'removed-photo-blocks-generate')
  await h.click(generateButton(h))
  check(h.calls.save.length === 0 && noRequests(h), 'removed-photo-cannot-submit')
  h.unmount()
}
async function authScenario(override) {
  const h = harness({}, override); const file = video('sensitive-name'), face = photo('sensitive-person')
  await ready(h, { video: file, photo: face })
  check(h.calls.navigate.length === 0 && noRequests(h), 'auth-only-on-generate')
  await h.click(generateButton(h))
  equal(h.calls.navigate.length, 1, 'guest-generate-goes-signup')
  const url = new URL(h.calls.navigate[0], 'https://fixture.invalid')
  equal(url.pathname, '/signup', 'guest-uses-existing-signup')
  const destination = new URL(url.searchParams.get('redirect'), 'https://fixture.invalid')
  equal(destination.pathname, '/recreate-preview', 'auth-returns-preview')
  equal(destination.searchParams.get('draft'), reference, 'auth-opaque-local-draft')
  check(!h.calls.navigate[0].includes('sensitive') && !destination.searchParams.has('prompt'), 'auth-no-customer-input-in-url')
  identical(h.calls.save[0].source.file, file, 'auth-keeps-original-video')
  identical(h.calls.save[0].photos[0], face, 'auth-keeps-original-photo')
  check(noRequests(h), 'guest-generate-no-upload-or-render')
  for (const failure of [{ saveResult: false }, { saveError: new Error('Browser storage is unavailable. Keep this page open.') }, { missingRef: true }]) {
    const blocked = harness(failure, override); await ready(blocked); await blocked.click(generateButton(blocked))
    equal(blocked.calls.navigate.length, 0, 'storage-failure-stays-local')
    check(noRequests(blocked), 'storage-failure-no-upload')
    check(/could not|keep this page|not been sent/i.test(text(blocked.tree)), 'storage-failure-explained')
  }
  const external = harness({ props: { signedIn: true, generationAllowed: false, accountKey: 'customer' } }, override)
  await ready(external); await external.click(generateButton(external))
  check(noRequests(external) && external.calls.save.length === 0 && external.calls.navigate.length === 0, 'external-account-no-personal-upload')
  check(/approved accounts only/.test(text(external.tree)), 'external-account-explained')
}
async function restoreScenario(override) {
  const original = { source: { kind: 'upload', file: video('restored') }, photos: [photo('restored-face')], people: 1, prompt: helper.defaultSeuVideoPrompt(1), consent: true, requestKey: 'restored-request-key' }
  let firstResolve
  const first = new Promise(resolve => { firstResolve = resolve })
  const h = harness({ props: { draftRef: reference }, restoreQueue: [first, Promise.resolve(original)] }, override)
  h.effects(); h.replay(); firstResolve({ ...original, prompt: original.prompt + ' Stale first effect.' }); await h.flush()
  equal(textarea(h).props.value, original.prompt, 'strictmode-late-restore-ignored')
  equal(h.calls.restore.length, 2, 'strictmode-repeats-safe-restore')
  check(noRequests(h) && h.calls.clear.length === 0 && h.calls.navigate.length === 0, 'restore-never-starts-or-consumes')
  check(!generateButton(h).props.disabled, 'restored-files-ready-for-review')
  const newTab = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'house', draftRef: reference }, restored: original, initialStorage: [['kineo:recreate:seu-video:active:house', JSON.stringify({ id: 'old-unrelated-job', at: Date.now() })]] }, override); await newTab.flush()
  check(noRequests(newTab) && nodes(newTab.tree, node => node.type === 'textarea').length === 1, 'explicit-draft-wins-old-job')
  equal(newTab.calls.restore[0], reference, 'new-tab-restores-explicit-opaque-reference')
  equal(textarea(newTab).props.value, original.prompt, 'new-tab-preserves-instruction')
  check(noRequests(newTab) && newTab.calls.clear.length === 0, 'new-tab-never-autostarts')
  for (const options of [{ restoreError: new Error('unavailable') }, { restored: null }]) {
    const missing = harness({ ...options, props: { draftRef: reference } }, override); await missing.flush()
    check(noRequests(missing) && missing.calls.navigate.length === 0 && generateButton(missing).props.disabled, 'restore-failure-stays-local')
    check(/unavailable|expired|could not be restored/.test(text(missing.tree)), 'restore-failure-explained')
  }
}
async function restoreRaceScenario(override) {
  let finishRestore
  const restoration = new Promise(resolve => { finishRestore = resolve })
  const h = harness({ restoreQueue: [restoration] }, override)
  await h.flush()
  check(generateButton(h).props.disabled && textarea(h).props.disabled, 'restore-pending-blocks-editor')
  await h.click(by(h, node => node.type === 'button' && node.props['aria-label'] === '3 people'))
  equal(nodes(h.tree, node => node.props?.className === 'sv-photo').length, 1, 'restore-pending-blocks-people-handler')
  input(h, 'Choose reference video file').props.onChange({ target: { files: [video('too-early')], value: 'fixture' } }); await h.flush()
  equal(by(h, node => node.type === 'video').props.src, catalog.SEU_VIDEO_CATALOG[0].src, 'restore-pending-blocks-source-handler')
  await h.click(generateButton(h))
  check(noRequests(h) && h.calls.save.length === 0 && h.calls.navigate.length === 0, 'restore-pending-no-side-effects')
  finishRestore(null); await h.flush()
  const deferred = new Map()
  let finishSave
  const savePromise = new Promise(resolve => { finishSave = resolve })
  for (const signedIn of [false, true]) {
    const waiting = harness({ props: { signedIn, generationAllowed: signedIn, accountKey: signedIn ? 'house' : null }, savePromise }, override)
    await ready(waiting); await waiting.click(generateButton(waiting)); waiting.unmount(); deferred.set(signedIn, waiting)
  }
  finishSave(true)
  for (const waiting of deferred.values()) {
    await waiting.flush()
    check(waiting.calls.navigate.length === 0 && noRequests(waiting), 'unmount-during-save-no-auth-or-upload')
  }
}
async function quoteScenario(override) {
  const changedPrompt = helper.defaultSeuVideoPrompt(1) + ' Keep the camera still.'
  const checked = { video_path: 'recreate-uploads/fixture/checked.mp4', people: 1, seconds: 12, fps: 30, width: 540, height: 960, bytes: 20, generated_seconds: 12, credits: helper.estimateSeuVideoCredits(12), prompt: changedPrompt, needs_plan: false, shortfall: 0 }
  const h = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'house' }, checkedQueue: [checked] }, override)
  await ready(h, { catalog: true }); await h.click(generateButton(h))
  equal(h.calls.generate.length, 0, 'quote-change-needs-reconfirmation')
  equal(textarea(h).props.value, changedPrompt, 'quote-and-prompt-updated-together')
  check(text(generateButton(h)).includes(String(checked.credits)), 'confirmed-quote-shown')
  equal(h.calls.fetch[0].url, catalog.SEU_VIDEO_CATALOG[0].src, 'catalog-reference-public-src')
  check(h.calls.prepare[0].value.file instanceof File && h.calls.prepare[0].value.file.name === catalog.SEU_VIDEO_CATALOG[0].id + '.mp4', 'catalog-reference-file-origin')
  await h.click(generateButton(h))
  equal(h.calls.prepare.length, 1, 'confirmed-check-reused')
  equal(h.calls.generate.length, 1, 'second-confirmation-generates-once')
  identical(h.calls.generate[0].value.checked, checked, 'generation-uses-exact-check')
  equal(h.calls.generate[0].value.prompt, changedPrompt, 'generation-uses-reviewed-prompt')
  equal(h.calls.generate[0].value.confirmedCredits, checked.credits, 'generation-uses-confirmed-credits')
  const edited = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'house' } }, override); await ready(edited)
  const ownPrompt = helper.defaultSeuVideoPrompt(1) + ' Keep the red coat.'
  textarea(edited).props.onChange({ target: { value: ownPrompt } }); await edited.flush(); await edited.click(generateButton(edited))
  equal(edited.calls.generate[0]?.value.prompt, ownPrompt, 'edited-instruction-preserved')
}
async function retryScenario(override) {
  const unknown = new helper.SeuVideoClientError('Uncertain fixture; check My videos.', 'network', 'generate', 503, 'unknown')
  const h = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'house' }, generateQueue: [unknown] }, override)
  const face = photo('stable-photo'), file = video('stable-video'); await ready(h, { photo: face, video: file }); await h.click(generateButton(h))
  check(/Retry Generate/.test(text(generateButton(h))), 'unknown-request-can-retry')
  check(textarea(h).props.disabled, 'unknown-request-locks-inputs')
  equal(h.calls.clear.length, 0, 'unknown-request-keeps-draft')
  await h.click(generateButton(h))
  equal(h.calls.prepare.length, 1, 'uncertain-retry-no-new-prepare')
  equal(h.calls.generate.length, 2, 'uncertain-retry-same-operation')
  const [a, b] = h.calls.generate.map(call => call.value)
  equal(a.key, b.key, 'uncertain-retry-same-key')
  identical(a.checked, b.checked, 'uncertain-retry-same-checked')
  identical(a.photos[0], face, 'uncertain-retry-original-file')
  identical(a.photos[0], b.photos[0], 'uncertain-retry-same-photo-file')
  identical(h.calls.prepare[0].value.file, file, 'uncertain-retry-original-video-file')
  equal(h.calls.clear.length, 1, 'accepted-request-cleans-draft-only-after-acceptance')
}
async function refusalScenario(override) {
  const error = new helper.SeuVideoClientError('Check My videos for the final billing status.', 'refused_face', 'generate', 502, 'unknown')
  const h = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'house' }, generateQueue: [error] }, override)
  await ready(h); await h.click(generateButton(h))
  check(!/nothing was charged|you were not charged|credits were (?:returned|refunded)/i.test(text(h.tree)), 'unknown-refusal-no-billing-certainty')
  check(/My videos|same request|not confirm|could not confirm/i.test(text(h.tree)), 'unknown-refusal-next-step')
}
async function statusScenario(override) {
  const states = [
    { id: 'fixture-clip', status: 'failed', credits_refunded: 0, refundConfirmed: false, reason: 'engine_refused' },
    { id: 'fixture-clip', status: 'failed', credits_refunded: 0, refundConfirmed: false, reason: 'engine_refused' },
    { id: 'fixture-clip', status: 'failed', credits_refunded: helper.estimateSeuVideoCredits(6), refundConfirmed: true, reason: 'engine_refused' },
  ]
  const h = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'house' }, statusQueue: states }, override)
  await ready(h); await h.click(generateButton(h))
  check(/not been confirmed/.test(text(h.tree)) && !/credits were returned/.test(text(h.tree)), 'failed-without-confirmed-refund')
  equal(nodes(h.tree, node => node.type === 'a' && Object.hasOwn(node.props, 'download')).length, 0, 'failed-no-output-download')
  await h.click(button(h, /^Refresh status$/))
  check(/credits were returned/.test(text(h.tree)), 'confirmed-refund-displayed')
  equal(h.calls.generate.length, 1, 'refresh-status-never-generates')
  const pending = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'house' }, statusQueue: [new Error('status offline')] }, override)
  await ready(pending); await pending.click(generateButton(pending))
  const progress = by(pending, node => node.type === 'progress')
  check(progress.props.value === undefined, 'pending-no-invented-progress-percentage')
  check(/3–4 minutes/.test(text(pending.tree)), 'pending-honest-wait')
  await pending.click(button(pending, /^Refresh status$/))
  equal(pending.calls.generate.length, 1, 'status-error-refresh-never-generates')
  const output = 'https://media-fixture.supabase.co/storage/v1/object/public/renders/clips/house0001/owned-result.mp4'
  const done = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'house' }, statusQueue: [{ id: 'fixture-clip', status: 'done', video_url: output, refundConfirmed: false }] }, override)
  await ready(done); await done.click(generateButton(done))
  equal(by(done, node => node.type === 'video').props.src, loadModule('lib/videoPrimeiroQuadro.ts').comPrimeiroQuadro(output), 'done-output-first-frame-from-owned-status')
  equal(by(done, node => node.type === 'a' && Object.hasOwn(node.props, 'download')).props.href, loadModule('lib/downloadNosso.ts').downloadHref(output,'kineo-recreate-fixture-clip.mp4','recreate-preview'), 'done-download-through-owned-domain')
  equal(nodes(done.tree, node => node.type === 'progress').length, 0, 'done-removes-progress')
  equal(done.calls.generate.length, 1, 'done-does-not-restart-generation')
  const unchanged=harness({props:{signedIn:true,generationAllowed:true,accountKey:'house'},stateOverrides:{restoring:false,clip:{id:'not-swapped-fixture',status:'failed',reason:'not_swapped',credits_refunded:0,refundConfirmed:false}}},override)
  check(text(unchanged.tree).includes("We couldn't put you in this video. Try a clearer photo or another video."),'not-swapped-has-actionable-message')
  check(/not been confirmed/.test(text(unchanged.tree))&&!/Nothing was charged/.test(text(unchanged.tree)),'not-swapped-keeps-refund-uncertainty')
}
async function recheckScenario(override) {
  for (const gate of [{ needs_plan: true, shortfall: 0 }, { needs_plan: false, shortfall: 1 }]) {
    const blocked = { video_path: 'recreate-uploads/fixture/gated.mp4', people: 1, seconds: 6, fps: 30, width: 540, height: 960, bytes: 20, generated_seconds: 6, credits: helper.estimateSeuVideoCredits(6), prompt: helper.defaultSeuVideoPrompt(1), ...gate }
    const h = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'house' }, checkedQueue: [blocked] }, override)
    await ready(h); await h.click(generateButton(h))
    equal(h.calls.generate.length, 0, 'known-plan-credit-gate-no-generation')
    const actions = nodes(h.tree, node => node.type === 'button' && /check again|recheck|refresh (?:availability|balance|cost|credits)|check (?:availability|balance|cost|credits)/i.test(text(node)))
    check(actions.length > 0, 'known-plan-credit-gate-can-recheck')
    await h.click(actions[0]); await h.click(generateButton(h))
    check(h.calls.prepare.length === 2 && h.calls.generate.length === 1, 'known-plan-credit-recheck-recovers')
  }
}

function exportFixtures(destination) {
  const folder = path.resolve(destination)
  if (!folder.split(path.sep).includes('docs')) throw new Error('Fixture output must be inside a docs/ directory')
  const refunded = pricing.recreateCreditCost(10)
  if (!(refunded > 0)) throw new Error('The current approved refund fixture tariff is unavailable')
  const placeholder = catalog.SEU_VIDEO_CATALOG[0]
  const fixtures = [
    { name: 'pending', label: 'Pending · andamento indeterminado', clip: { id: 'fixture-only-pending', status: 'pending', refundConfirmed: false } },
    { name: 'failed-refund-0', label: 'Failed · reembolso ainda não confirmado', clip: { id: 'fixture-only-failed-zero', status: 'failed', credits_refunded: 0, refundConfirmed: false, reason: 'engine_refused' } },
    { name: 'failed-refund-' + refunded, label: 'Failed · pessoa não trocada · reembolso confirmado pela fixture', clip: { id: 'fixture-only-failed-refunded', status: 'failed', credits_refunded: refunded, refundConfirmed: true, reason: 'not_swapped' } },
    { name: 'done-placeholder', label: 'Done · vídeo público usado como PLACEHOLDER', clip: { id: 'fixture-only-done', status: 'done', video_url: placeholder.src, refundConfirmed: false }, message: 'Fixture SSR: this public catalog video is a PLACEHOLDER, not a generated result.' },
  ]
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
  const css = read('app/recreate-preview/seu-video.css')
  const prepared = fixtures.map(fixture => {
    const h = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'fixture-only-no-real-account' }, stateOverrides: { clip: fixture.clip, restoring: false, message: fixture.message || '' } })
    const markup = renderToStaticMarkup(h.tree)
    // No flush/replay: passive effects and event handlers are never executed in fixture export mode.
    assert.ok(noRequests(h) && h.calls.restore.length === 0 && h.calls.save.length === 0 && h.calls.clear.length === 0 && h.calls.navigate.length === 0 && h.timers.size === 0, 'Fixture export must have no effects or I/O')
    assert.ok(markup.includes('data-seu-video-result="' + fixture.clip.status + '"'), 'Fixture must render the requested real JSX state')
    const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Kineo · Fixture SSR · ' + escape(fixture.name) + '</title><style>html,body{margin:0;background:#101113}.fixture-ssr-banner{position:fixed;inset:0 0 auto;z-index:10000;height:96px;box-sizing:border-box;padding:10px 16px;background:#fff2bd;color:#292310;border-bottom:2px solid #aa861a;display:flex;flex-direction:column;justify-content:center;gap:5px;font:12px/1.4 Arial,Helvetica,sans-serif}.fixture-ssr-banner strong{font-size:13px}.fixture-ssr-body{padding-top:96px}' + css + '</style></head><body data-fixture-ssr="' + escape(fixture.name) + '"><aside class="fixture-ssr-banner" id="fixture-ssr-warning" role="note"><strong>Fixture SSR · sem conta/render real · vídeo placeholder do catálogo</strong><span>' + escape(fixture.label) + ' · Controles sem JavaScript.</span></aside><div class="fixture-ssr-body" aria-describedby="fixture-ssr-warning">' + markup + '</div></body></html>\n'
    assert.ok(!/<script\b/i.test(html), 'Fixture must have no executable script')
    return { filename: path.join(folder, fixture.name + '.html'), html }
  })
  fs.mkdirSync(folder, { recursive: true })
  for (const output of prepared) fs.writeFileSync(output.filename, output.html, 'utf8')
  console.log('Exported exactly ' + prepared.length + ' SSR HTML fixtures with inline real CSS; no effects, account, API or real generation:')
  for (const output of prepared) console.log(output.filename)
}

const arguments_ = process.argv.slice(2)
if (arguments_.length) {
  if (arguments_.length !== 2 || arguments_[0] !== '--export-fixtures') throw new Error('Usage: node scripts/test-recreate-seu-video-ui-1311.mjs [--export-fixtures <docs/folder>]')
  exportFixtures(arguments_[1])
} else {
const scenarios = { page: pageScenario, mount: mountScenario, metadataRace: metadataRaceScenario, hydrationMetadata: hydrationMetadataScenario, audio:audioScenario, slots: slotsScenario, auth: authScenario, restore: restoreScenario, restoreRace: restoreRaceScenario, quote: quoteScenario, retry: retryScenario, refusal: refusalScenario, status: statusScenario, recheck: recheckScenario }
const failures = []
for (const [name, run] of Object.entries(scenarios)) {
  try { await run(); console.log('PASS ' + name) } catch (error) { failures.push({ name, error }); console.error('FAIL ' + name + ': ' + error.message) }
}
if (failures.length) throw new AggregateError(failures.map(value => value.error), 'UI baseline failed: ' + failures.map(value => value.name).join(', '))
const baseline = assertions
function replaceOnce(original, anchor, replacement) {
  const count = original.split(anchor).length - 1
  if (count !== 1) throw new Error('Mutant anchor must match exactly once: ' + anchor)
  return original.replace(anchor, replacement)
}
const uiSource = read(UI), pageSource = read(PAGE)
const mutants = [
  ['original audio switch ignored', 'audio', replaceOnce(uiSource,'480p · {SEU_VIDEO_SOM_ORIGINAL?', '480p · {false?'), /audio-copy-follows-server-switch/],
  ['not swapped outcome hidden', 'status', replaceOnce(uiSource,"clip.reason==='not_swapped'",'false'), /not-swapped-has-actionable-message/],
  ['done download bypasses owned domain', 'status', replaceOnce(uiSource, "href={downloadHref(clip.video_url,'kineo-recreate-'+clip.id+'.mp4','recreate-preview')}", 'href={clip.video_url}'), /done-download-through-owned-domain/],
  ['done preview loses first frame', 'status', replaceOnce(uiSource, 'src={comPrimeiroQuadro(clip.video_url)}', 'src={clip.video_url}'), /done-output-first-frame-from-owned-status/],
  ['public action', 'page', replaceOnce(pageSource, 'generationAllowed={!!user&&releaseVisible(user.email,SEU_VIDEO_RELEASE)}', 'generationAllowed={!!user}'), /page-internal-action-gate/],
  ['index preview', 'page', replaceOnce(pageSource, 'index:false,follow:true,googleBot', 'index:true,follow:true,googleBot'), /preview-noindex/],
  ['disable switch ignored', 'page', replaceOnce(pageSource, 'if(!SEU_VIDEO_PREVIEW_ENABLED)notFound()', 'if(false)notFound()'), /preview-flag-off/],
  ['photo slots auto-filled', 'slots', replaceOnce(uiSource, 'Array.from({length:people},(_,i)=>current[i]??null)', 'Array.from({length:people},(_,i)=>current[i]??file)'), /photo-three-does-not-fill-one-two/],
  ['removed photo retained', 'slots', replaceOnce(uiSource, 'n===i?null:file', 'n===i?file:file'), /removed-photo-blocks-generate/],
  ['auth starts before Generate', 'auth', replaceOnce(uiSource, 'useEffect(()=>{alive.current=true;', "useEffect(()=>{window.location.assign('/signup');alive.current=true;"), /auth-only-on-generate/],
  ['storage failure ignored', 'auth', replaceOnce(uiSource, 'if(!saved)throw new Error', 'if(false)throw new Error'), /storage-failure-stays-local/],
  ['external account sends files', 'auth', replaceOnce(uiSource, 'if(signedIn&&!generationAllowed)', 'if(false)'), /external-account-no-personal-upload/],
  ['restore starts generation', 'restore', replaceOnce(uiSource, 'setSource(d.source);setPhotos(d.photos);', 'void client.generateSeuVideo({});setSource(d.source);setPhotos(d.photos);'), /restore-never-starts-or-consumes/],
  ['uncertain retry loses checked', 'retry', replaceOnce(uiSource, 'let prepared=checked', 'let prepared=null'), /uncertain-retry-no-new-prepare/],
  ['uncertain retry changes key', 'retry', replaceOnce(uiSource, 'if(!keyRef.current)keyRef.current=', 'if(true)keyRef.current='), /uncertain-retry-same-key/],
  ['unknown refusal asserts no charge', 'refusal', replaceOnce(uiSource, "if(e.outcome==='unknown'){setMessage('Could not confirm whether this request started. Keep this page open and retry the same request, or check My videos.');return}", "if(e.outcome==='unknown'){setMessage('Nothing was charged.');return}"), /unknown-refusal-no-billing-certainty/],
  ['unconfirmed refund reported', 'status', replaceOnce(uiSource, 'clip.refundConfirmed?`${clip.credits_refunded} credits were returned.`', 'true?`${clip.credits_refunded} credits were returned.`'), /failed-without-confirmed-refund/],
  ['changed quote skips confirmation', 'quote', replaceOnce(uiSource, 'if(changedCost||changedPrompt)', 'if(false)'), /quote-change-needs-reconfirmation/],
  ['changed prompt stays stale', 'quote', replaceOnce(uiSource, 'if(changedPrompt)setPrompt(prepared.prompt)', 'if(false)setPrompt(prepared.prompt)'), /quote-and-prompt-updated-together/],
  ['restoration unlocks editor early', 'restoreRace', replaceOnce(uiSource, 'const locked=restoring||busy||uncertain||!!clip', 'const locked=busy||uncertain||!!clip'), /restore-pending-blocks-editor/],
  ['late save navigates after unmount', 'restoreRace', replaceOnce(uiSource, 'if(!alive.current||controller.signal.aborted)return', 'if(false)return'), /unmount-during-save-no-auth-or-upload/],
  ['old active job replaces explicit draft', 'restore', replaceOnce(uiSource, 'if(!signedIn||!accountKey||draftRef)return', 'if(!signedIn||!accountKey)return'), /explicit-draft-wins-old-job/],
  ['stale StrictMode restore overwrites current draft', 'restore', replaceOnce(uiSource, 'void restoreSeuVideoDraft(draftRef).then(d=>{\n      if(cancelled)return', 'void restoreSeuVideoDraft(draftRef).then(d=>{\n      if(false)return'), /strictmode-late-restore-ignored/],
  ['source effect erases cached metadata', 'metadataRace', replaceOnce(uiSource, "let cancelled=false\n    if(source.kind==='catalog'){", "let cancelled=false\n    setSeconds(null);setLocalError('')\n    if(source.kind==='catalog'){"), /metadata-before-effects-keeps-cost/],
  ['hydration omits initial metadata read', 'hydrationMetadata', replaceOnce(uiSource, "    read()\n    video.addEventListener('loadedmetadata',read)", "    video.addEventListener('loadedmetadata',read)"), /hydration-ready-metadata-keeps-cost/],
  ['hydration omits later metadata listener', 'hydrationMetadata', replaceOnce(uiSource, "    video.addEventListener('loadedmetadata',read)", "    // Fixture mutant: listener omitted."), /hydration-metadata-listener-installed/],
  ['hydration accepts previous video metadata', 'hydrationMetadata', replaceOnce(uiSource, "if(!video||video.getAttribute('src')!==expected)return", "if(!video)return"), /hydration-previous-source-metadata-rejected/],
]
for (const [name, scenario, altered, expected] of mutants) {
  let caught
  try { await scenarios[scenario](altered) } catch (error) { caught = error }
  check(caught?.code === 'ERR_ASSERTION' && expected.test(caught.message), 'mutant-intended-contract', name + (caught ? ' (' + caught.message + ')' : ' survived'))
}
console.log('Recreate own-video UI: ' + Object.keys(scenarios).length + ' scenarios, ' + baseline + ' baseline assertions, ' + mutants.length + ' meaningful mutants rejected. SSR/handlers only; no browser, server, backend or paid generation.')
}
