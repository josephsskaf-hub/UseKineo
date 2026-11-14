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
const rules = loadModule('lib/recreate/seuVideoRules.ts', { '@/lib/checkoutPricing': pricing })
const serverRules = loadModule('lib/recreate/seuVideo.ts', { '@/lib/checkoutPricing': pricing })
const helper = loadModule('lib/recreate/seuVideoClient.ts', { './seuVideoRules': rules, './photos': { compressPhoto: async file => file } })
const presentation = Object.freeze({ resolution:'720p',audio:'silent',waitLabel:'About 2 minutes',minSeconds:3,maxSeconds:15,minSide:700,maxBytes:100*1024*1024,minFps:24,maxFps:60 })
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
  const h = { hooks: [], cursor: 0, stateCursor: 0, dirty: true, pending: [], tree: null, props: { signedIn: false, generationAllowed: false, accountKey: null, presentation:options.presentation??{...presentation,audio:options.originalAudio?'original':'silent'}, ...options.props }, calls: { prepare: [], generate: [], status: [], fetch: [], save: [], restore: [], clear: [], navigate: [], urls: [], revoked: [] }, timers: new Map(), storage: new Map(options.initialStorage || []), checkedQueue: [...(options.checkedQueue || [])], generateQueue: [...(options.generateQueue || [])], statusQueue: [...(options.statusQueue || [])], restoreQueue: [...(options.restoreQueue || [])] }
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
    async loadReferenceFile(src,id,signal) { if(options.referenceError)throw options.referenceError;const response=await globals.fetch(src,{signal,credentials:'same-origin'});return new File([await response.blob()],id+'.mp4',{type:'video/mp4'}) },
    async prepareSeuVideo(value, signal) {
      h.calls.prepare.push({ value, signal })
      const next = h.checkedQueue.shift()
      if (next instanceof Error) throw next
      return next || { video_path: 'recreate-uploads/fixture/video.mp4', people: value.people, seconds: 6, fps: 30, width: 720, height: 1280, bytes: value.file.size, generated_seconds: 6, credits: helper.estimateSeuVideoCredits(6), prompt: rules.promptPorGeneroOpcional(Array.from({length:value.people},(_,i)=>value.genders?.[i]??null),value.positions), presentation:h.props.presentation, genders:value.genders, needs_plan: false, shortfall: 0 }
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
      return next || options.defaultStatus || { id, status: 'pending', refundConfirmed: false }
    },
  }
  const draft = {
    async saveSeuVideoDraft(value) { h.calls.save.push(value); if (options.saveError) throw options.saveError; return options.savePromise ? await options.savePromise : options.saveResult !== false },
    async restoreSeuVideoDraft(value) { h.calls.restore.push(value); if (options.restoreError) throw options.restoreError; return h.restoreQueue.length ? await h.restoreQueue.shift() : options.restored || null },
    getSeuVideoDraftRef: () => options.authRef ? (h.calls.save.length&&options.saveResult!==false?reference:options.authRef==='none'?null:'old-draft-reference') : options.missingRef ? null : reference,
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
    '@/components/create/CreateTabs': {__esModule:true,default:props=>React.createElement('a',{href:props.recreateHref},'Recreate')},
    '@/components/create/CreateNavConta': {__esModule:true,default:()=>React.createElement('a',{href:'/library'},'My videos')},
    '@/components/KineoBolt': { KineoBrandIcon: () => React.createElement('span',{'aria-hidden':true},'ϟ') },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/lib/recreate/seuVideoRules': rules,
    '@/lib/recreate/seuVideoCatalog': catalog,
    '@/lib/recreate/seuVideoPreviewRelease': release,
    '@/lib/growth/visitanteEscreveAntes': signup,
    '@/lib/recreate/seuVideoClient': { ...helper, createSeuVideoClient: options => { h.clientPresentation=options.presentation; h.clientDeps=options; return fakeClient }, validateSeuVideoFile: async file => ({ file, seconds: 6, estimatedCredits: helper.estimateSeuVideoCredits(6) }) },
    '@/lib/recreate/seuVideoDraft': draft,
  }
  const Component = loadModule(UI, stubs, globals, override ? { [UI]: override } : {}).default
  h.render = () => { h.cursor = 0; h.stateCursor = 0; h.dirty = false; h.tree = Component(h.props); return h.tree }
  h.effects = () => { const work = h.pending.splice(0); for (const slot of work) { slot.cleanup?.(); slot.cleanup = slot.create() } }
  h.flush = async () => { for (let turn = 0; turn < 30; turn++) { if (h.dirty) h.render(); h.effects(); await Promise.resolve(); await Promise.resolve() } if (h.dirty) throw new Error('Hook runner did not settle') }
  h.replay = () => { for (const slot of h.hooks) if (slot?.kind === 'effect') { slot.cleanup?.(); slot.cleanup = slot.create() } }
  h.unmount = () => { for (const slot of h.hooks) if (slot?.kind === 'effect') slot.cleanup?.() }
  h.click = async target => { target.props.onClick(); await h.flush() }
  h.nextTimer = async () => { const next=h.timers.entries().next().value;if(!next)return false;h.timers.delete(next[0]);next[1].callback();await h.flush();return true }
  h.render()
  return h
}
async function selectPhoto(h, slot, file, gender='man') {
  const container = nodes(h.tree, node => node.props?.className === 'sv-photo')[slot]
  const picker = nodes(container, node => node.type === 'button' && /^(Add|Change) photo$/.test(text(node)))[0]??nodes(container,node=>node.props?.className==='sv-photo-drop')[0]
  await h.click(picker)
  input(h, 'Choose person photo').props.onChange({ target: { files: [file], value: 'fixture' } })
  await h.flush()
  if(gender)await h.click(by(h,node=>node.type==='button'&&node.props['aria-label']===`Photo ${slot+1}: ${gender==='man'?'Man':'Woman'}`))
}
async function ready(h, options = {}) {
  await h.flush()
  if (options.catalog) { by(h, node => node.type === 'video' && node.props['aria-label'] === 'Selected reference video').props.onLoadedMetadata({ currentTarget: { duration: 6 } }); await h.flush() }
  else { input(h, 'Choose reference video file').props.onChange({ target: { files: [options.video || video('private-input')], value: 'fixture' } }); await h.flush() }
  await selectPhoto(h, 0, options.photo || photo('private-person'),Object.hasOwn(options,'gender')?options.gender:'man')
  by(h, node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } })
  await h.flush()
  if(!options.allowDisabled)check(!generateButton(h).props.disabled, 'ready-explicit-generate')
}
async function pageScenario(override) {
  for (const [user, allowed] of [[null, false], [{ id: 'house', email: 'house@fixture.invalid' }, true], [{ id: 'customer', email: 'customer@fixture.invalid' }, false]]) {
    let authCalls = 0
    const page = loadModule(PAGE, {
      'next/navigation': { notFound() { const error = new Error('not-found-fixture'); error.code = 'NOT_FOUND'; throw error } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { async getUser() { authCalls++; return { data: { user } } } } }) },
      '@/lib/recreate/access': { releaseVisible: (email, state) => state === 'public' || state === 'internal' && email === 'house@fixture.invalid' },
      '@/lib/recreate/seuVideo': serverRules,
      '@/lib/recreate/seuVideoPresentation': {seuVideoPresentation:()=>presentation},
      '@/lib/recreate/seuVideoPreviewRelease': release,
      './SeuVideoRecreateClient': { __esModule: true, default: () => null },
    }, {}, override ? { [PAGE]: override } : {})
    const element = await page.default({ searchParams: { example: 'selfie-confete', draft: reference } })
    equal(element.props.signedIn, !!user, 'page-auth-props')
    equal(element.props.generationAllowed, allowed, 'page-internal-action-gate')
    equal(element.props.accountKey, user?.id ?? null, 'page-account-owner')
    equal(element.props.initialExample, 'selfie-confete', 'page-public-example')
    equal(element.props.draftRef, reference, 'page-opaque-draft')
    identical(element.props.presentation,presentation,'page-public-presentation')
    equal(page.metadata.robots.index, false, 'preview-noindex')
    equal(page.metadata.robots.googleBot.index, false, 'preview-google-noindex')
    equal(authCalls, 1, 'page-one-auth-read')
  }
  let authCalls = 0
  const disabled = loadModule(PAGE, {
    'next/navigation': { notFound() { const error = new Error('not-found-fixture'); error.code = 'NOT_FOUND'; throw error } },
    '@/lib/supabase/server': { createClient() { authCalls++; failIo() } },
    '@/lib/recreate/access': { releaseVisible: () => false },
    '@/lib/recreate/seuVideo': serverRules,
    '@/lib/recreate/seuVideoPresentation': {seuVideoPresentation:()=>presentation},
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
    check(html.includes('Recreate with your video') && html.includes(helper.defaultSeuVideoPrompt(1)), 'ssr-useful-before-effects')
    check(!/Seedance|bytedance|Minimax|fal-ai/i.test(html), 'ssr-no-engine-details')
    equal(nodes(h.tree, node => node.type === 'progress').length, 0, 'ssr-no-fake-progress')
    await h.flush()
    check(noRequests(h), 'mount-zero-api')
    await ready(h)
    textarea(h).props.onChange({ target: { value: helper.defaultSeuVideoPrompt(1) + ' A calm camera movement.' } })
    await h.flush()
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
    check(pending?(originalAudio?copy.includes('Original audio when available'):!copy.includes('Original audio when available')&&/Silent video|No sound is generated/.test(copy)):!copy.includes('Original audio when available')&&!/Silent video/.test(copy),'audio-copy-follows-server-switch')
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
  for(const number of [1,2])await h.click(by(h,node=>node.type==='button'&&node.props['aria-label']===`Photo ${number}: Man`))
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
  await h.click(by(h,node=>node.type==='button'&&node.props['aria-label']==='Photo 2: Man'))
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
  equal(Array.from(h.calls.save[0].genders),['man'],'auth-keeps-gender-selection')
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
  const original = { source: { kind: 'upload', file: video('restored') }, photos: [photo('restored-face')], genders:['man'], people: 1, prompt: helper.genderSeuVideoPrompt(['man']), consent: true, requestKey: 'restored-request-key' }
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
  for (const signedIn of [false]) {
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
  const changedPrompt = helper.genderSeuVideoPrompt(['man']) + ' Keep the camera still.'
  const checked = { video_path: 'recreate-uploads/fixture/checked.mp4', people: 1, seconds: 12, fps: 30, width: 540, height: 960, bytes: 20, generated_seconds: 12, credits: helper.estimateSeuVideoCredits(12), prompt: changedPrompt, needs_plan: false, shortfall: 0 }
  const h = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'house' }, checkedQueue: [checked] }, override)
  await ready(h, { catalog: true }); await h.click(generateButton(h))
  equal(h.calls.generate.length, 0, 'quote-change-needs-reconfirmation')
  equal(textarea(h).props.value, changedPrompt, 'quote-and-prompt-updated-together')
  check(text(generateButton(h)).includes(String(checked.credits)), 'confirmed-quote-shown')
  equal(by(h,node=>node.props?.['data-seu-video-cost']).props['data-seu-video-cost'],'confirmed','checked-cost-is-not-estimate')
  equal(h.calls.fetch[0].url, catalog.SEU_VIDEO_CATALOG[0].src, 'catalog-reference-public-src')
  check(h.calls.prepare[0].value.file instanceof File && h.calls.prepare[0].value.file.name === catalog.SEU_VIDEO_CATALOG[0].id + '.mp4', 'catalog-reference-file-origin')
  await h.click(generateButton(h))
  equal(h.calls.prepare.length, 1, 'confirmed-check-reused')
  equal(h.calls.generate.length, 1, 'second-confirmation-generates-once')
  identical(h.calls.generate[0].value.checked, checked, 'generation-uses-exact-check')
  equal(h.calls.generate[0].value.prompt, changedPrompt, 'generation-uses-reviewed-prompt')
  equal(h.calls.generate[0].value.confirmedCredits, checked.credits, 'generation-uses-confirmed-credits')
  equal(h.calls.generate[0].value.promptEdited,true,'gender-prompt-sent-as-explicit-instruction')
  equal(Array.from(h.calls.generate[0].value.genders),['man'],'generation-keeps-reviewed-gender')
  const edited = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'house' } }, override); await ready(edited)
  const ownPrompt = helper.genderSeuVideoPrompt(['man']) + ' Keep the red coat.'
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
  check(text(pending.tree).includes(presentation.waitLabel), 'pending-honest-wait')
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
  check(text(unchanged.tree).includes('The person in your video was not replaced. Try a clearer photo or another video.'),'not-swapped-has-actionable-message')
  check(/not been confirmed/.test(text(unchanged.tree))&&!/Nothing was charged/.test(text(unchanged.tree)),'not-swapped-keeps-refund-uncertainty')
}
async function recheckScenario(override) {
  for (const gate of [{ needs_plan: true, shortfall: 0 }, { needs_plan: false, shortfall: 1 }]) {
    const blocked = { video_path: 'recreate-uploads/fixture/gated.mp4', people: 1, seconds: 6, fps: 30, width: 720, height: 1280, bytes: 20, generated_seconds: 6, credits: helper.estimateSeuVideoCredits(6), prompt: helper.genderSeuVideoPrompt(['man']), ...gate }
    const h = harness({ props: { signedIn: true, generationAllowed: true, accountKey: 'house' }, checkedQueue: [blocked] }, override)
    await ready(h); await h.click(generateButton(h))
    equal(h.calls.generate.length, 0, 'known-plan-credit-gate-no-generation')
    const actions = nodes(h.tree, node => node.type === 'button' && /check again|recheck|refresh (?:availability|balance|cost|credits)|check (?:availability|balance|cost|credits)/i.test(text(node)))
    check(actions.length > 0, 'known-plan-credit-gate-can-recheck')
    await h.click(actions[0]); await h.click(generateButton(h))
    check(h.calls.prepare.length === 2 && h.calls.generate.length === 1, 'known-plan-credit-recheck-recovers')
  }
}
async function genderScenario(override) {
  const exactMan=helper.genderSeuVideoPrompt(['man']),exactWoman=helper.genderSeuVideoPrompt(['woman'])
  equal(rules.promptPorGeneroOpcional(['man']),exactMan,'optional-helper-preserves-complete-legacy')
  equal(rules.promptPorGeneroOpcional([null]),helper.defaultSeuVideoPrompt(1),'optional-helper-preserves-neutral-default')
  const h=harness({props:{signedIn:true,generationAllowed:true,accountKey:'house'}},override);await h.flush()
  check(nodes(h.tree,node=>node.props?.className==='sv-gender-option').every(node=>node.props['aria-pressed']===false),'gender-never-assumed')
  equal(textarea(h).props.value,helper.defaultSeuVideoPrompt(1),'gender-neutral-prompt-prefilled')
  await ready(h,{gender:null,allowDisabled:true})
  check(!generateButton(h).props.disabled,'gender-optional-button-enabled')
  check(noRequests(h),'gender-editing-never-uploads')
  await h.click(by(h,node=>node.props?.['aria-label']==='Photo 1: Man'))
  equal(textarea(h).props.value,exactMan,'gender-man-exact-approved-prompt')
  await h.click(by(h,node=>node.props?.['aria-label']==='Photo 1: Woman'))
  equal(textarea(h).props.value,exactWoman,'gender-woman-exact-approved-prompt')
  const custom=exactWoman+' Keep the blue scarf.'
  textarea(h).props.onChange({target:{value:custom}});await h.flush()
  await h.click(by(h,node=>node.props?.['aria-label']==='Photo 1: Man'))
  equal(textarea(h).props.value,custom,'gender-choice-preserves-edited-instruction')
  const pair=harness({},override);await ready(pair)
  await pair.click(by(pair,node=>node.props?.['aria-label']==='2 people'))
  check(textarea(pair).props.value.includes('with the man from @Image1: his')&&textarea(pair).props.value.includes('with the person from @Image2: their'),'gender-partial-uses-neutral-only-for-unknown')
  await selectPhoto(pair,1,photo('second-person'),'woman')
  const two=textarea(pair).props.value
  check(two.includes('the person on the left in @Video1 with the man from @Image1: his')&&two.includes('the person on the right in @Video1 with the woman from @Image2: her'),'gender-pair-position-photo-mapping')
  await pair.click(by(pair,node=>node.props?.['aria-label']==='3 people'))
  await selectPhoto(pair,2,photo('third-person'),'man')
  check(textarea(pair).props.value.includes('the person in the center in @Video1 with the woman from @Image2')&&textarea(pair).props.value.includes('the person on the right in @Video1 with the man from @Image3'),'gender-trio-position-photo-mapping')
  equal(nodes(pair.tree,node=>node.props?.className==='sv-position-label').map(text),['Person on the left in the video','Person in the center in the video','Person on the right in the video'],'gender-positions-visible-per-photo')
  await selectPhoto(pair,1,photo('replacement-person'),null)
  check(!generateButton(pair).props.disabled&&!by(pair,node=>node.props?.['aria-label']==='Photo 2: Woman').props['aria-pressed'],'new-photo-clears-choice-without-blocking')
  check(noRequests(pair),'gender-editing-never-uploads')
  const restored={source:{kind:'upload',file:video('legacy')},photos:[photo('legacy-face')],people:1,prompt:custom,consent:true,requestKey:'legacy-draft-key'}
  const legacy=harness({restored},override);await legacy.flush()
  equal(textarea(legacy).props.value,custom,'legacy-draft-preserves-edit')
  check(!generateButton(legacy).props.disabled,'legacy-draft-does-not-require-gender')
  const unknown=harness({props:{signedIn:true,generationAllowed:true,accountKey:'house'}},override);await ready(unknown,{gender:null});await unknown.click(generateButton(unknown))
  equal(unknown.calls.prepare.length,1,'gender-optional-reaches-check')
  equal(unknown.calls.generate.length,1,'gender-optional-can-generate-neutral')
}
async function suggestionsScenario(override) {
  const checked=(genders,prompt,people=1)=>({video_path:'owned/checked.mp4',people,seconds:6,fps:30,width:720,height:1280,bytes:20,generated_seconds:6,credits:helper.estimateSeuVideoCredits(6),prompt,suggested_genders:genders,prompt_source:'sugestao',needs_plan:false,shortfall:0})
  const h=harness({props:{signedIn:true,generationAllowed:true,accountKey:'house'},checkedQueue:[checked(['woman'],helper.genderSeuVideoPrompt(['woman']))]},override)
  const face=photo('suggested');await ready(h,{gender:null,photo:face})
  check(noRequests(h),'suggestions-no-io-before-generate')
  await h.click(generateButton(h))
  identical(h.calls.prepare[0].value.photos[0],face,'suggestions-prepares-current-photo-after-generate')
  check(by(h,node=>node.props?.['aria-label']==='Photo 1: Woman').props['aria-pressed'],'suggestions-fill-empty-slot')
  equal(h.calls.generate.length,0,'suggestions-require-review')
  await h.click(generateButton(h))
  equal(h.calls.prepare.length,1,'suggestions-no-second-check')
  equal(h.calls.generate[0].value.prompt,helper.genderSeuVideoPrompt(['woman']),'suggestions-submit-reviewed-prompt')
  const positions=['on the left','on the right']
  for(const suggestions of [['man',null],[null,null],[null,'man']]){
    const conflict=harness({generateQueue:[new helper.SeuVideoClientError('Fixture stops after payload','fixture','generate',400,'not-started')],props:{signedIn:true,generationAllowed:true,accountKey:'house'},checkedQueue:[checked(suggestions,rules.promptPorGeneroOpcional(suggestions,positions),2)]},override)
    await ready(conflict,{gender:'woman'});await conflict.click(by(conflict,node=>node.props?.['aria-label']==='2 people'));await selectPhoto(conflict,1,photo('unknown'),null)
    const expected=rules.promptPorGeneroOpcional(['woman',suggestions[1]],positions)
    check(textarea(conflict).props.value.includes('with the woman from @Image1: her')&&textarea(conflict).props.value.includes('with the person from @Image2: their'),'partial-choice-written-before-check')
    await conflict.click(generateButton(conflict))
    equal(textarea(conflict).props.value,expected,'partial-conflict-keeps-woman-and-neutral')
    check(!by(conflict,node=>node.props?.['aria-label']==='Photo 1: Man').props['aria-pressed'],'suggestions-never-replace-manual-choice')
    if(!conflict.calls.generate.length){check(suggestions[1]==='man','partial-new-suggestion-requires-review');await conflict.click(generateButton(conflict))}
    equal(conflict.calls.generate[0]?.value.prompt,expected,'partial-conflict-submits-canonical-choice')
  }
  const explicitPrompt=helper.genderSeuVideoPrompt(['woman'])+' Keep the red dress.'
  const explicit=harness({props:{signedIn:true,generationAllowed:true,accountKey:'house'},checkedQueue:[checked(['man'],explicitPrompt)]},override)
  await ready(explicit,{gender:'woman'});await explicit.click(generateButton(explicit))
  equal(textarea(explicit).props.value,explicitPrompt,'complete-manual-keeps-server-description')
  const custom=helper.defaultSeuVideoPrompt(1)+' Keep the green scarf.'
  const edited=harness({props:{signedIn:true,generationAllowed:true,accountKey:'house'},checkedQueue:[checked(['woman'],helper.genderSeuVideoPrompt(['woman']))]},override)
  await ready(edited,{gender:null});textarea(edited).props.onChange({target:{value:custom}});await edited.flush();await edited.click(generateButton(edited))
  equal(edited.calls.generate.length,0,'suggestion-only-change-still-requires-review')
  equal(textarea(edited).props.value,custom,'suggestions-preserve-edited-text')
  await edited.click(generateButton(edited));equal(edited.calls.generate[0].value.prompt,custom,'suggestions-send-exact-edited-text')
  const guest=harness({},override);await ready(guest,{gender:null});await guest.click(generateButton(guest))
  equal(Array.from(guest.calls.save[0].genders),[null],'optional-choice-persists-before-auth')
  check(noRequests(guest),'guest-handoff-never-prepares-files')
}
async function expiredAuthScenario(override) {
  const expired=()=>new helper.SeuVideoClientError('Sign in','auth','check',401,'not-started')
  for(const saveResult of[true,false])for(const authRef of['old','none']){
    const h=harness({saveResult,authRef,props:{signedIn:true,generationAllowed:true,accountKey:'expired'},checkedQueue:[expired()]},override)
    const face=photo('fresh-after-auth');await ready(h,{photo:face,gender:null})
    const own=helper.defaultSeuVideoPrompt(1)+' Keep my current edit.'
    textarea(h).props.onChange({target:{value:own}});await h.flush();await h.click(generateButton(h))
    equal(h.calls.save.length,1,'expired-auth-saves-current-files')
    identical(h.calls.save[0].photos[0],face,'expired-auth-keeps-current-file')
    equal(h.calls.save[0].prompt,own,'expired-auth-keeps-current-text')
    equal(Array.from(h.calls.save[0].genders),[null],'expired-auth-keeps-optional-choice')
    equal(h.calls.navigate.length,saveResult?1:0,'expired-auth-storage-failure-blocks-navigation')
    if(saveResult)check(h.calls.navigate[0].includes(reference)&&!h.calls.navigate[0].includes('old-draft-reference'),'expired-auth-uses-current-reference')
    if(!saveResult)check(text(h.tree).includes('Could not save your files'),'expired-auth-storage-message')
    equal(h.calls.generate.length,0,'expired-auth-never-generates')
  }
}
async function signedInStorageScenario(override) {
  for(const failure of [{saveResult:false},{saveError:new Error('storage unavailable')}]){
    const h=harness({...failure,props:{signedIn:true,generationAllowed:true,accountKey:'house'}},override);await ready(h);await h.click(generateButton(h))
    equal(h.calls.save.length,0,'signed-in-generation-does-not-require-idb')
    equal(h.calls.generate.length,1,'signed-in-storage-failure-still-generates')
  }
}
async function automaticRestoreScenario(override) {
  for(const original of [{genders:undefined,prompt:helper.defaultSeuVideoPrompt(1)},{genders:['man'],prompt:helper.genderSeuVideoPrompt(['man'])}]){
    const draft={source:{kind:'upload',file:video('automatic')},photos:[photo('automatic')],people:1,consent:true,requestKey:'automatic-request-key',...original}
    const h=harness({restored:draft},override);await h.flush()
    await h.click(by(h,node=>node.props?.['aria-label']==='Photo 1: Woman'))
    equal(textarea(h).props.value,helper.genderSeuVideoPrompt(['woman']),'automatic-restored-prompt-follows-gender')
    check(noRequests(h),'automatic-restore-does-not-generate')
  }
  const fresh=harness({},override);await fresh.flush()
  await fresh.click(by(fresh,node=>node.props?.['aria-label']==='Photo 1: Woman'))
  const before=textarea(fresh).props.value
  await selectPhoto(fresh,0,photo('first-photo'),null)
  check(by(fresh,node=>node.props?.['aria-label']==='Photo 1: Woman').props['aria-pressed'],'first-photo-keeps-prior-gender-choice')
  equal(textarea(fresh).props.value,before,'first-photo-keeps-generated-instruction')
  await selectPhoto(fresh,0,photo('replacement-photo'),null)
  check(!by(fresh,node=>node.props?.['aria-label']==='Photo 1: Woman').props['aria-pressed'],'replacement-photo-needs-gender-review')
}
async function recoverableRefusalScenario(override) {
  for(const code of ['engine_refused','provider_rejected','provider_failed','not_swapped','swap_unchanged']){
    const message='Server refusal: the person was not replaced. Nothing was charged. Try another photo.'
    const error=new helper.SeuVideoClientError(message,code,'generate',502,'not-started')
    const h=harness({props:{signedIn:true,generationAllowed:true,accountKey:'house'},generateQueue:[error]},override)
    await ready(h);await h.click(generateButton(h))
    check(text(h.tree).includes(message),'known-refusal-keeps-server-message')
    check(!textarea(h).props.disabled&&!/Retry Generate/.test(text(generateButton(h))),'known-refusal-unlocks-editor')
    equal(h.calls.clear.length,1,'known-refusal-clears-local-draft')
    equal(h.calls.generate.length,1,'known-refusal-does-not-auto-retry')
    await h.click(generateButton(h))
    equal(h.calls.prepare.length,2,'known-refusal-starts-new-explicit-check')
    check(h.calls.generate[0].value.key!==h.calls.generate[1].value.key,'known-refusal-new-explicit-request-key')
  }
  const serverMessage='The person was not replaced. Your credits were returned.'
  const failed=harness({stateOverrides:{restoring:false,clip:{id:'message-fixture',status:'failed',reason:'not_swapped',message:serverMessage,credits_refunded:pricing.recreateCreditCost(10),refundConfirmed:true}}},override)
  check(text(failed.tree).includes(serverMessage),'failed-status-keeps-server-message')
}
const flowPresentation={...presentation,defaultPrompts:{1:serverRules.promptDoSeuVideo(serverRules.SEU_VIDEO_MOTOR,1),2:serverRules.promptDoSeuVideo(serverRules.SEU_VIDEO_MOTOR,2,['on the left','on the right']),3:serverRules.promptDoSeuVideo(serverRules.SEU_VIDEO_MOTOR,3,['on the left','in the center','on the right'])}}
const flowProps={currentFlow:true,signedIn:true,generationAllowed:true,accountKey:'house'}
function flowChecked(suggestions=[null],extra={}){return{video_path:'owned/flow.mp4',people:1,seconds:6,fps:30,width:720,height:1280,bytes:20,generated_seconds:6,credits:helper.estimateSeuVideoCredits(6),prompt:flowPresentation.defaultPrompts[1],genders:[null],suggested_genders:suggestions,needs_plan:false,shortfall:0,...extra}}
async function currentFlowScenario(override){
  const h=harness({presentation:flowPresentation,props:{currentFlow:true}},override);await h.flush()
  equal(textarea(h).props.value,flowPresentation.defaultPrompts[1],'flow-current-engine-prefilled')
  equal(nodes(h.tree,n=>n.props?.className==='sv-gender-option').length,0,'flow-no-gender-decision-before-check')
  const large=by(h,n=>n.props?.className==='sv-photo-drop');check(large.type==='button'&&large.props.onDrop&&large.props.onPaste,'flow-large-photo-entry')
  const one=photo('drop'),two=photo('paste');large.props.onDrop({preventDefault(){},dataTransfer:{files:[one]}});await h.flush()
  identical(h.calls.urls.at(-1)?.file,one,'flow-drop-same-slot')
  by(h,n=>n.props?.className==='sv-photo-drop').props.onPaste({preventDefault(){},clipboardData:{files:[],items:[{kind:'file',getAsFile:()=>two}]}});await h.flush()
  identical(h.calls.urls.at(-1)?.file,two,'flow-paste-same-slot')
  await h.click(by(h,n=>n.props?.['aria-label']==='3 people'))
  const third=photo('third-slot'),middle=photo('middle-slot')
  nodes(h.tree,n=>n.props?.className==='sv-photo-drop')[2].props.onDrop({preventDefault(){},dataTransfer:{files:[third]}});await h.flush()
  nodes(h.tree,n=>n.props?.className==='sv-photo-drop')[1].props.onPaste({preventDefault(){},clipboardData:{files:[middle],items:[]}});await h.flush()
  check(h.calls.urls.slice(-3).map(v=>v.file).every((file,i)=>file===[two,middle,third][i]),'flow-input-methods-preserve-three-slots')
  equal(textarea(h).props.value,flowPresentation.defaultPrompts[3],'flow-three-people-canonical-prompt')
  check(noRequests(h),'flow-local-photo-methods-never-upload')
  const css=read('app/recreate-preview/seu-video-current-flow.css')
  check(!/#[0-9a-f]{3,8}\b/i.test(css)&&css.includes('var(--rc-primary)')&&css.includes('var(--rc-bg)'),'flow-uses-current-theme-tokens')
  check(css.includes('position:fixed')&&css.includes('.sv-generate-area')&&css.includes('.sv-job-dock'),'flow-action-and-state-fixed')
  check([...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].every(m=>Number(m[1])>=12),'flow-readable-type')
  for(const flowBasePath of['/recreate','/recreate-flow-preview']){
    const guest=harness({presentation:flowPresentation,props:{currentFlow:true,flowBasePath}},override);await ready(guest,{gender:null});await guest.click(generateButton(guest))
    const target=new URL(guest.calls.navigate[0],'https://fixture.invalid').searchParams.get('redirect')
    check(target.startsWith(flowBasePath+'/your-video?')&&!target.includes('private-person'),'flow-auth-returns-to-current-route')
    check(noRequests(guest)&&guest.calls.save.length===1,'flow-guest-only-local-draft')
    const tabs=harness({presentation:flowPresentation,props:{...flowProps,flowBasePath,createTabs:true}},override)
    check(nodes(tabs.tree,n=>n.props?.active==='recreate'&&n.props?.recreateHref===flowBasePath).length===1,'flow-tabs-preserve-preview-location')
  }
}
async function currentGenderScenario(override){
  const h=harness({presentation:flowPresentation,props:flowProps,checkedQueue:[flowChecked()]},override);await ready(h,{gender:null})
  check(!generateButton(h).props.disabled,'flow-first-generate-does-not-require-gender')
  await h.click(generateButton(h));equal(h.calls.generate.length,0,'flow-unknown-check-needs-choice')
  check(generateButton(h).props.disabled&&nodes(h.tree,n=>n.props?.className==='sv-gender-option').length===2,'flow-unknown-only-after-check')
  await h.click(by(h,n=>n.props?.['aria-label']==='Photo 1: Woman'))
  await h.click(generateButton(h));equal(h.calls.prepare.length,1,'flow-manual-choice-reuses-check')
  equal(h.calls.generate[0].value.genders[0],'woman','flow-explicit-choice-submitted')
  const known=harness({presentation:flowPresentation,props:flowProps,checkedQueue:[flowChecked(['woman'],{prompt:helper.genderSeuVideoPrompt(['woman'])})]},override);await ready(known,{gender:null});await known.click(generateButton(known))
  equal(known.calls.generate.length,0,'flow-suggestion-requires-review')
  equal(nodes(known.tree,n=>n.props?.className==='sv-gender-option').length,0,'flow-known-suggestion-is-not-an-extra-decision')
  check(nodes(known.tree,n=>n.props?.className==='sv-gender-edit').some(n=>/Woman/.test(text(n))),'flow-known-choice-can-be-corrected')
}
async function currentQueueScenario(override){
  for(const position of[3,null]){
    const h=harness({presentation:flowPresentation,props:flowProps,stateOverrides:{restoring:false,clip:{id:'queued',status:'pending',queued:true,queue_position:position,refundConfirmed:false}}},override)
    const title=nodes(h.tree,n=>n.type==='h2'&&/In line/.test(text(n)))[0]
    check(title,'flow-queue-title-uses-server-position')
    equal(text(title),'In line'+(position?' · position '+position:''),'flow-queue-title-uses-server-position')
    check(nodes(h.tree,n=>n.props?.className==='sv-job-dock').some(n=>text(n).includes('In line')),'flow-queue-always-visible')
  }
  const failure=harness({presentation:flowPresentation,props:flowProps,stateOverrides:{restoring:false,clip:{id:'queue-failed',status:'failed',reason:'queue_failed',message:'We returned your credits.',credits_refunded:0,refundConfirmed:false}}},override)
  check(!text(failure.tree).includes('We returned your credits.')&&text(failure.tree).includes('not been confirmed'),'flow-no-unconfirmed-refund-claim')
  for(const code of['queue_full','swap_cap']){
    const error=new helper.SeuVideoClientError('Server refusal. Nothing was charged.',code,'generate',429,'not-started',undefined,{charged:false,retryAfterSeconds:180})
    const h=harness({presentation:flowPresentation,props:flowProps,checkedQueue:[flowChecked(['woman'],{prompt:helper.genderSeuVideoPrompt(['woman'])})],generateQueue:[error]},override)
    const face=photo('429');await ready(h,{gender:null,photo:face});await h.click(generateButton(h));await h.click(generateButton(h))
    equal(h.calls.generate.length,1,'flow-429-no-automatic-retry')
    equal(h.calls.clear.length,0,'flow-429-keeps-local-recovery')
    check(!textarea(h).props.disabled&&text(h.tree).includes('Server refusal.'),'flow-429-shows-server-instruction')
    await h.click(generateButton(h));equal(h.calls.prepare.length,1,'flow-429-keeps-check')
    equal(h.calls.generate[0].value.key,h.calls.generate[1].value.key,'flow-429-retry-keeps-key')
    identical(h.calls.generate[1].value.photos[0],face,'flow-429-keeps-files')
  }
  const done=harness({presentation:flowPresentation,props:flowProps,checkedQueue:[flowChecked(['woman'],{prompt:helper.genderSeuVideoPrompt(['woman'])})],generateQueue:[{clip:{id:'replayed',status:'done',refundConfirmed:false},replay:true}],statusQueue:[{id:'replayed',status:'done',video_url:'https://storage.fixture.invalid/generated/result.mp4',refundConfirmed:false}]},override)
  await ready(done,{gender:null});await done.click(generateButton(done));await done.click(generateButton(done))
  equal(done.calls.status.length,1,'flow-done-replay-resolves-status-once')
  equal(done.calls.generate.length,1,'flow-done-replay-never-posts-again')
  check(nodes(done.tree,n=>n.type==='video'&&n.props['aria-label']==='Your generated video').length===1,'flow-done-replay-shows-result')
  for(const status of[{id:'replayed',status:'done',refundConfirmed:false},new Error('Temporary status failure')]){
    const unresolved=harness({presentation:flowPresentation,props:flowProps,checkedQueue:[flowChecked(['woman'],{prompt:helper.genderSeuVideoPrompt(['woman'])})],generateQueue:[{clip:{id:'replayed',status:'done',refundConfirmed:false},replay:true}],statusQueue:[status,{id:'replayed',status:'done',video_url:'https://storage.fixture.invalid/generated/result.mp4',refundConfirmed:false}]},override)
    await ready(unresolved,{gender:null});await unresolved.click(generateButton(unresolved));await unresolved.click(generateButton(unresolved))
    check([...unresolved.storage.values()].some(value=>JSON.parse(value).id==='replayed'),'flow-done-without-url-keeps-recovery-pointer')
    equal(unresolved.calls.status.length,1,'flow-done-without-url-no-automatic-loop')
    await unresolved.click(button(unresolved,/^Refresh status$/))
    equal(unresolved.calls.generate.length,1,'flow-done-without-url-refresh-never-posts')
    check(![...unresolved.storage.values()].some(value=>JSON.parse(value).id==='replayed'),'flow-done-url-clears-recovery-pointer')
  }
}
async function currentPhaseScenario(override){
  let finish;const waiting=new Promise(resolve=>{finish=resolve})
  const h=harness({presentation:flowPresentation,props:flowProps,checkedQueue:[waiting]},override);await ready(h,{gender:null});await h.click(generateButton(h));h.clientDeps.onPhase('video-upload');await h.flush()
  check(text(generateButton(h)).includes('Uploading video'),'flow-upload-state-visible-in-dock')
  h.unmount();finish(flowChecked());await h.flush();equal(h.calls.generate.length,0,'flow-unmounted-prepare-never-generates')
  const timeout=harness({presentation:flowPresentation,props:flowProps,referenceError:new helper.SeuVideoClientError('Reference timed out. Try again.','timeout','local')},override);await ready(timeout,{catalog:true,gender:null});await timeout.click(generateButton(timeout))
  check(!textarea(timeout).props.disabled&&text(timeout.tree).includes('Reference timed out'),'flow-reference-timeout-unlocks-editor')
  equal(timeout.calls.prepare.length,0,'flow-reference-timeout-does-not-upload')
  const checkTimeout=harness({presentation:flowPresentation,props:flowProps,checkedQueue:[new helper.SeuVideoClientError('Check timed out.','timeout','check')]},override);await ready(checkTimeout,{gender:null});await checkTimeout.click(generateButton(checkTimeout))
  check(!textarea(checkTimeout).props.disabled&&text(checkTimeout.tree).includes('Check timed out'),'flow-check-timeout-releases-busy')
  for(const code of['timeout','future_unknown_code']){
    const uncertain=new helper.SeuVideoClientError('Unknown result',code,'generate',503,'unknown')
    const h=harness({presentation:flowPresentation,props:flowProps,checkedQueue:[flowChecked(['woman'],{prompt:helper.genderSeuVideoPrompt(['woman'])})],generateQueue:[uncertain]},override);await ready(h,{gender:null});await h.click(generateButton(h));await h.click(generateButton(h))
    check(/Retry Generate/.test(text(generateButton(h)))&&textarea(h).props.disabled,'flow-uncertain-release-busy-preserves-snapshot')
    await h.click(generateButton(h));equal(h.calls.prepare.length,1,'flow-uncertain-retry-keeps-check');equal(h.calls.generate[0].value.key,h.calls.generate[1].value.key,'flow-uncertain-retry-keeps-key')
  }
}
async function publicPresentationScenario(override) {
  check(!read(UI).includes("from '@/lib/recreate/seuVideo'"),'browser-ui-imports-public-rules-only')
  const facts={...presentation,resolution:'1080p',audio:'original',waitLabel:'About 4 minutes'}
  const h=harness({presentation:facts},override);await h.flush()
  const copy=text(h.tree)
  equal(h.clientPresentation,facts,'public-current-requirements-reach-client')
  check(!copy.includes('MP4 or MOV')&&!copy.includes('Use the suggested instruction')&&!copy.includes('Nothing starts until'),'editor-redundant-help-removed')
  const css=read('app/recreate-preview/seu-video.css');check(!css.includes('dashed')&&[...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].every(m=>Number(m[1])>=12),'css-solid-borders-and-readable-type')
  check(nodes(h.tree,node=>node.props?.className==='sv-permission').some(node=>text(node)==='I have permission to use these files.'),'consent-authorizes-selected-files')
  await ready(h)
  const estimate=by(h,node=>node.props?.['data-seu-video-cost'])
  check(estimate.props['data-seu-video-cost']==='estimated'&&/Estimated/.test(text(estimate)),'local-cost-labelled-estimated')
}
async function pollingCapScenario(override) {
  for(const status of ['pending','failed']){
    const h=harness({props:{signedIn:true,generationAllowed:true,accountKey:'house'},defaultStatus:{id:'fixture-clip',status,credits_refunded:0,refundConfirmed:false}},override)
    await ready(h);await h.click(generateButton(h))
    for(let count=0;count<75;count++)if(!await h.nextTimer())break
    check(h.timers.size===0&&h.calls.status.length<=60&&h.calls.status.length>1,'automatic-polling-has-finite-budget')
    check(/Automatic status checks paused/.test(text(h.tree)),'polling-cap-explained')
    const before=h.calls.status.length;await h.click(button(h,/^Refresh status$/))
    check(h.calls.status.length>before&&h.timers.size>0,'polling-cap-allows-explicit-refresh')
    equal(h.calls.generate.length,1,'polling-cap-never-regenerates')
    h.unmount()
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
const scenarios = { currentFlow:currentFlowScenario,currentGender:currentGenderScenario,currentQueue:currentQueueScenario,currentPhase:currentPhaseScenario,page: pageScenario, mount: mountScenario, metadataRace: metadataRaceScenario, hydrationMetadata: hydrationMetadataScenario, audio:audioScenario, slots: slotsScenario, auth: authScenario, restore: restoreScenario, restoreRace: restoreRaceScenario, quote: quoteScenario, retry: retryScenario, refusal: refusalScenario, status: statusScenario, recheck: recheckScenario,gender:genderScenario,suggestions:suggestionsScenario,expiredAuth:expiredAuthScenario,signedInStorage:signedInStorageScenario,automaticRestore:automaticRestoreScenario,recoverableRefusal:recoverableRefusalScenario,presentation:publicPresentationScenario,pollingCap:pollingCapScenario }
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
  ['flow drop discarded','currentFlow',replaceOnce(uiSource,'choosePhoto(e.dataTransfer.files[0])','void e.dataTransfer.files[0]'),/flow-drop-same-slot/],
  ['flow paste discarded','currentFlow',replaceOnce(uiSource,'photoSlot.current=i;choosePhoto(file)','photoSlot.current=i;void file'),/flow-paste-same-slot/],

  ['flow prompt ignores server','currentFlow',replaceOnce(uiSource,'presentation.defaultPrompts?.[count as 1|2|3]??legacySuggestedPrompt(values,count)','legacySuggestedPrompt(values,count)'),/flow-current-engine-prefilled/],
  ['flow unknown choice bypasses review','currentGender',replaceOnce(uiSource,'if(changedCost||changedPrompt||changedGenders||(currentFlow&&merged.some(value=>value===null)))','if(changedCost||changedPrompt||changedGenders)'),/flow-unknown-check-needs-choice/],
  ['flow queue hides position','currentQueue',replaceOnce(uiSource,'<h2>{currentFlow&&clip.queued?','<h2>{false?'),/flow-queue-title-uses-server-position/],
  ['flow refund copied without evidence','currentQueue',replaceOnce(uiSource,'currentFlow&&!clip.refundConfirmed?', 'false?'),/flow-no-unconfirmed-refund-claim/],
  ['flow done replay skips status','currentQueue',replaceOnce(uiSource,"(clipStatus==='done'&&(!currentFlow||!!clip?.video_url))","clipStatus==='done'"),/flow-done-replay-resolves-status-once/],
  ['flow done without URL loses recovery','currentQueue',replaceOnce(uiSource,"accountKey&&(!currentFlow||result.status!=='done'||!!result.video_url)","accountKey"),/flow-done-without-url-keeps-recovery-pointer/],

  ['manual partial ignored without API suggestion','suggestions',replaceOnce(uiSource,'const checkedPrompt=manualPartial?','const checkedPrompt=manualPartial&&suggestions?.some(Boolean)?'),/partial-conflict-keeps-woman-and-neutral/],

  ['expired auth keeps stale draft','expiredAuth',replaceOnce(uiSource,'const saved=await saveSeuVideoDraft({source,photos:readyPhotos,genders,prompt:valid.prompt,people,consent,requestKey:keyRef.current??undefined})','const saved=true'),/expired-auth-saves-current-files/],
  ['expired auth ignores storage failure','expiredAuth',replaceOnce(uiSource,"if(!saved)throw new Error('Could not save your files on this device. Keep this page open and try again.')","if(false)throw new Error('Could not save your files on this device. Keep this page open and try again.')"),/expired-auth-storage-failure-blocks-navigation/],

  ['initial prompt blank','gender',replaceOnce(uiSource,'useState(()=>suggestedPrompt([],1))',"useState('')"),/gender-neutral-prompt-prefilled/],
  ['suggestion overwrites manual','suggestions',replaceOnce(uiSource,'genders[i]??suggestions?.[i]??null','suggestions?.[i]??genders[i]??null'),/partial-conflict-keeps-woman-and-neutral|suggestions-never-replace-manual-choice/],
  ['partial conflict ignored','suggestions',replaceOnce(uiSource,'const checkedPrompt=manualPartial?','const checkedPrompt=manualPartial&&merged.every(Boolean)?'),/partial-conflict-keeps-woman-and-neutral/],
  ['suggestions overwrite edited text','suggestions',replaceOnce(uiSource,'const changedPrompt=!promptEdited&&checkedPrompt!==prompt','const changedPrompt=checkedPrompt!==prompt'),/suggestions-preserve-edited-text/],
  ['suggestion-only update skips review','suggestions',replaceOnce(uiSource,'if(changedCost||changedPrompt||changedGenders||(currentFlow&&merged.some(value=>value===null)))','if(changedCost||changedPrompt)'),/suggestion-only-change-still-requires-review/],
  ['original audio switch ignored', 'audio', replaceOnce(uiSource,"const audioNote=display.audio==='silent'", "const audioNote=display.audio==='original'"), /audio-copy-follows-server-switch/],
  ['not swapped outcome hidden', 'status', replaceOnce(uiSource,"clip.reason==='not_swapped'",'false'), /not-swapped-has-actionable-message/],
  ['done download bypasses owned domain', 'status', replaceOnce(uiSource, "href={downloadHref(clip.video_url,'kineo-recreate-'+clip.id+'.mp4','recreate-preview')}", 'href={clip.video_url}'), /done-download-through-owned-domain/],
  ['done preview loses first frame', 'status', replaceOnce(uiSource, 'src={comPrimeiroQuadro(clip.video_url)}', 'src={clip.video_url}'), /done-output-first-frame-from-owned-status/],
  ['public action', 'page', replaceOnce(pageSource, 'generationAllowed={!!user&&releaseVisible(user.email,SEU_VIDEO_RELEASE)}', 'generationAllowed={!!user}'), /page-internal-action-gate/],
  ['index preview', 'page', replaceOnce(pageSource, 'index:false,follow:true,googleBot', 'index:true,follow:true,googleBot'), /preview-noindex/],
  ['disable switch ignored', 'page', replaceOnce(pageSource, 'if(!SEU_VIDEO_PREVIEW_ENABLED)notFound()', 'if(false)notFound()'), /preview-flag-off/],
  ['photo slots auto-filled', 'slots', replaceOnce(uiSource, 'Array.from({length:people},(_,i)=>current[i]??null)', 'Array.from({length:people},(_,i)=>current[i]??file)'), /photo-three-does-not-fill-one-two/],
  ['removed photo retained', 'slots', replaceOnce(uiSource, 'n===index?null:file', 'n===index?file:file'), /removed-photo-blocks-generate/],
  ['auth starts before Generate', 'auth', replaceOnce(uiSource, 'useEffect(()=>{alive.current=true;', "useEffect(()=>{window.location.assign('/signup');alive.current=true;"), /auth-only-on-generate/],
  ['storage failure ignored', 'auth', replaceOnce(uiSource, "if(!saved)throw new Error('Could not save your files on this device. Keep this page open and try again. Your files have not been sent.')", "if(false)throw new Error('Could not save your files on this device. Keep this page open and try again. Your files have not been sent.')"), /storage-failure-stays-local/],
  ['external account sends files', 'auth', replaceOnce(uiSource, 'if(signedIn&&!generationAllowed)', 'if(false)'), /external-account-no-personal-upload/],
  ['restore starts generation', 'restore', replaceOnce(uiSource, 'setSource(d.source);setPhotos(d.photos);', 'void client.generateSeuVideo({});setSource(d.source);setPhotos(d.photos);'), /restore-never-starts-or-consumes/],
  ['uncertain retry loses checked', 'retry', replaceOnce(uiSource, 'let prepared=checked', 'let prepared=null'), /uncertain-retry-no-new-prepare/],
  ['uncertain retry changes key', 'retry', replaceOnce(uiSource, 'if(!keyRef.current)keyRef.current=', 'if(true)keyRef.current='), /uncertain-retry-same-key/],
  ['unknown refusal asserts no charge', 'refusal', replaceOnce(uiSource, "if(e.outcome==='unknown'){setMessage('Could not confirm whether this request started. Keep this page open and retry the same request, or check My videos.');return}", "if(e.outcome==='unknown'){setMessage('Nothing was charged.');return}"), /unknown-refusal-no-billing-certainty/],
  ['unconfirmed refund reported', 'status', replaceOnce(uiSource, 'clip.refundConfirmed?`${clip.credits_refunded} credits were returned.`', 'true?`${clip.credits_refunded} credits were returned.`'), /failed-without-confirmed-refund/],
  ['changed quote skips confirmation', 'quote', replaceOnce(uiSource, 'if(changedCost||changedPrompt||changedGenders||(currentFlow&&merged.some(value=>value===null)))', 'if(false)'), /quote-change-needs-reconfirmation/],
  ['changed prompt stays stale', 'quote', replaceOnce(uiSource, 'if(changedPrompt)setPrompt(checkedPrompt)', 'if(false)setPrompt(checkedPrompt)'), /quote-and-prompt-updated-together/],
  ['restoration unlocks editor early', 'restoreRace', replaceOnce(uiSource, 'const locked=restoring||busy||uncertain||!!clip', 'const locked=busy||uncertain||!!clip'), /restore-pending-blocks-editor/],
  ['late save navigates after unmount', 'restoreRace', replaceOnce(uiSource, 'if(!alive.current||controller.signal.aborted)return\n        if(!saved)', 'if(false)return\n        if(!saved)'), /unmount-during-save-no-auth-or-upload/],
  ['old active job replaces explicit draft', 'restore', replaceOnce(uiSource, 'if(!signedIn||!accountKey||draftRef)return', 'if(!signedIn||!accountKey)return'), /explicit-draft-wins-old-job/],
  ['stale StrictMode restore overwrites current draft', 'restore', replaceOnce(uiSource, 'void restoreSeuVideoDraft(draftRef).then(d=>{\n      if(cancelled)return', 'void restoreSeuVideoDraft(draftRef).then(d=>{\n      if(false)return'), /strictmode-late-restore-ignored/],
  ['source effect erases cached metadata', 'metadataRace', replaceOnce(uiSource, "let cancelled=false\n    if(source.kind==='catalog'){", "let cancelled=false\n    setSeconds(null);setLocalError('')\n    if(source.kind==='catalog'){"), /metadata-before-effects-keeps-cost/],
  ['hydration omits initial metadata read', 'hydrationMetadata', replaceOnce(uiSource, "    read()\n    video.addEventListener('loadedmetadata',read)", "    video.addEventListener('loadedmetadata',read)"), /hydration-ready-metadata-keeps-cost/],
  ['hydration omits later metadata listener', 'hydrationMetadata', replaceOnce(uiSource, "    video.addEventListener('loadedmetadata',read)", "    // Fixture mutant: listener omitted."), /hydration-metadata-listener-installed/],
  ['hydration accepts previous video metadata', 'hydrationMetadata', replaceOnce(uiSource, "if(!video||video.getAttribute('src')!==expected)return", "if(!video)return"), /hydration-previous-source-metadata-rejected/],
  ['optional gender blocks Generate','gender',replaceOnce(uiSource,'&&consent&&prompt.trim().length>0',"&&genders.every(Boolean)&&consent&&prompt.trim().length>0"),/gender-optional-button-enabled/],
  ['gender choice overwrites edited text','gender',replaceOnce(uiSource,'setGenders(next);if(!promptEdited)setPrompt(suggestedPrompt(next,people));else','setGenders(next);if(true)setPrompt(suggestedPrompt(next,people));else'),/gender-choice-preserves-edited-instruction/],
  ['gender instruction loses explicit flag','quote',replaceOnce(uiSource,'promptEdited:true,genders,consent:true','promptEdited:false,genders,consent:true'),/gender-prompt-sent-as-explicit-instruction/],
  ['known refusal loses server message','recoverableRefusal',replaceOnce(uiSource,'void clearSeuVideoDraft().catch(()=>{});setMessage(e.message);return',"void clearSeuVideoDraft().catch(()=>{});setMessage('Generic failure');return"),/known-refusal-keeps-server-message/],
  ['known refusal remains uncertain','recoverableRefusal',replaceOnce(uiSource,'setUncertain(e.outcome===\'unknown\'||e.code===\'idempotency_conflict\')','setUncertain(true)'),/known-refusal-unlocks-editor/],
  ['known refusal keeps persisted files','recoverableRefusal',replaceOnce(uiSource,'setChecked(null);void clearSeuVideoDraft().catch(()=>{});setMessage(e.message)','setChecked(null);setMessage(e.message)'),/known-refusal-clears-local-draft/],
  ['failed status hides server message','recoverableRefusal',replaceOnce(uiSource,':clip.message)??(clip.reason',":undefined)??(clip.reason"),/failed-status-keeps-server-message/],
  ['estimated cost presented as confirmed','presentation',replaceOnce(uiSource,"{checked?'':'Estimated '}","{checked?'':''}"),/local-cost-labelled-estimated/],
  ['permission consent hidden','presentation',replaceOnce(uiSource,'I have permission to use these files.','Continue.'),/consent-authorizes-selected-files/],
  ['polling budget disabled','pollingCap',replaceOnce(uiSource,'pollBudget.current.checks>=MAX_STATUS_CHECKS','false'),/automatic-polling-has-finite-budget/],
  ['automatic restored prompt misclassified as user edit','automaticRestore',replaceOnce(uiSource,'setPromptEdited(!automatic)','setPromptEdited(true)'),/automatic-restored-prompt-follows-gender/],
  ['first photo discards prior gender choice','automaticRestore',replaceOnce(uiSource,'const replacing=photos[photoSlot.current]!=null','const replacing=true'),/first-photo-keeps-prior-gender-choice/],
]
for (const [name, scenario, altered, expected] of mutants) {
  let caught
  try { await scenarios[scenario](altered) } catch (error) { caught = error }
  check(caught?.code === 'ERR_ASSERTION' && expected.test(caught.message), 'mutant-intended-contract', name + (caught ? ' (' + caught.message + ')' : ' survived'))
}
console.log('Recreate own-video UI: ' + Object.keys(scenarios).length + ' scenarios, ' + baseline + ' baseline assertions, ' + mutants.length + ' meaningful mutants rejected. SSR/handlers only; no browser, server, backend or paid generation.')
}
