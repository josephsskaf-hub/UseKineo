// Read-only, offline UI guards. No credentials, network, provider calls or paid renders.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const root = resolve(process.env.KLING4_TEST_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..'))
const require = createRequire(import.meta.url)
const ts = require('typescript')
const read = path => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const forbidden = () => { throw new Error('Offline notice guard forbids network or SDK access') }
const BASE_TIME = Date.parse('2026-10-28T12:00:00.000Z')
const iso = value => new Date(value).toISOString()
const lease = (now = BASE_TIME, available = true) => ({ available, utcDay: iso(now).slice(0, 10), checkedAt: iso(now), validUntil: iso(now + 15000) })

function runtime({ language = 'en', live = true, now = BASE_TIME, response = null } = {}) {
  let clock = now, selectedLanguage = language, cursor = 0, dirty = false, mounted = true, tree = null, Component, focused = true
  let reply = response ?? lease(now), pendingFetch = null, sequence = 0, stateWrites = 0
  const slots = [], effects = [], timers = new Map(), cache = new Map(), requests = []
  const listeners = { window: new Map(), document: new Map() }
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((item, i) => Object.is(item, b[i]))
  const hook = make => { const index = cursor++; if (!(index in slots)) slots[index] = make(); return [index, slots[index]] }
  const jsx = (type, props, key) => ({ type, props: props ?? {}, key })
  const React = {
    createElement: (type, props, ...children) => jsx(type, { ...props, children: children.length > 1 ? children : children[0] }),
    Fragment: 'fragment',
    createContext: value => ({ value }),
    useContext: () => ({ language: selectedLanguage, dict: null, choose() {} }),
    useState(initial) {
      const [i, value] = hook(() => typeof initial === 'function' ? initial() : initial)
      return [value, next => { stateWrites++; const value = typeof next === 'function' ? next(slots[i]) : next; if (!Object.is(slots[i], value)) { slots[i] = value; if (mounted) dirty = true } }]
    },
    useRef: initial => hook(() => ({ current: initial }))[1],
    useEffect(effect, deps) {
      const [i, previous] = hook(() => ({ deps: undefined, cleanup: null }))
      if (!sameDeps(previous.deps, deps)) { previous.cleanup?.(); slots[i] = { deps, cleanup: null }; effects.push(() => { slots[i].cleanup = effect() }) }
    },
    useMemo(make, deps) {
      const [i, value] = hook(() => ({ deps, value: make() }))
      if (!sameDeps(value.deps, deps)) slots[i] = { deps, value: make() }
      return slots[i].value
    },
    useCallback(callback, deps) { return React.useMemo(() => callback, deps) },
  }
  const schedule = (callback, delay, repeat = false) => { const id = ++sequence; timers.set(id, { callback, at: clock + Number(delay || 0), delay: Number(delay || 0), repeat }); return id }
  const eventTarget = kind => ({
    addEventListener(name, callback) { if (!listeners[kind].has(name)) listeners[kind].set(name, new Set()); listeners[kind].get(name).add(callback) },
    removeEventListener(name, callback) { listeners[kind].get(name)?.delete(callback) },
  })
  const document = { ...eventTarget('document'), visibilityState: 'visible', hidden: false, hasFocus: () => focused }
  const window = { ...eventTarget('window') }
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])) } static now() { return clock } }
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options })
    if (pendingFetch) return await pendingFetch
    if (reply instanceof Error) throw reply
    return { ok: true, json: async () => reply }
  }
  const mocks = { react: { ...React, default: React, __esModule: true }, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' } }
  function load(path) {
    if (cache.has(path)) return cache.get(path)
    if (extname(path) === '.json') { const data = JSON.parse(read(path)); cache.set(path, data); return data }
    const exports = {}; cache.set(path, exports)
    let source = read(path)
    if (!live && path === 'lib/kling4TrialPolicy.ts') source = source.replace('export const KLING4_TRIAL_LIVE = true', 'export const KLING4_TRIAL_LIVE = false')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    vm.runInNewContext(code, {
      exports, console, Date: ClockDate, URL, AbortController, AbortSignal,
      fetch: fetchImpl, window, document, process: { env: {} },
      setTimeout: (fn, ms) => schedule(fn, ms), clearTimeout: id => timers.delete(id),
      setInterval: (fn, ms) => schedule(fn, ms, true), clearInterval: id => timers.delete(id),
      require(specifier) {
        if (Object.hasOwn(mocks, specifier)) return mocks[specifier]
        if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return forbidden()
        const base = specifier.startsWith('@/') ? specifier.slice(2) : join(dirname(path), specifier)
        const target = extname(base) ? base : existsSync(join(root, base + '.ts')) ? base + '.ts' : base + '.tsx'
        return load(target)
      },
    }, { filename: path, timeout: 5000 })
    return exports
  }
  const render = () => { cursor = 0; dirty = false; tree = Component({ surface: 'home' }); for (const effect of effects.splice(0)) effect(); return tree }
  const text = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : typeof node.type === 'function' ? text(node.type(node.props)) : text(node.props?.children)
  const flush = async () => { for (let i = 0; i < 30; i++) { await Promise.resolve(); if (dirty && mounted) render() } }
  return {
    load, requests, document, window, stateWrites: () => stateWrites,
    mount() { const module = load('components/Kling4TrialNotice.tsx'); Component = module.default ?? module.Kling4TrialNotice; render(); return text(tree) },
    text: () => text(tree), flush,
    response(value) { reply = value },
    hold() { let resolve; pendingFetch = new Promise(done => { resolve = done }); return value => { pendingFetch = null; resolve(value) } },
    async language(value) { selectedLanguage = value; render(); await flush() },
    async event(kind, name) { if (kind === 'window' && name === 'blur') focused = false; if (kind === 'window' && name === 'focus') focused = true; for (const fn of listeners[kind].get(name) ?? []) fn({ type: name }); await flush() },
    async advance(ms) {
      const end = clock + ms
      for (let guard = 0; guard < 100; guard++) {
        const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
        if (!next) break
        const [id, timer] = next; clock = timer.at; timers.delete(id)
        if (timer.repeat) timers.set(id, { ...timer, at: clock + timer.delay })
        timer.callback(); await flush()
      }
      clock = end; if (dirty) render(); await flush()
    },
    unmount() { mounted = false; for (const slot of slots) slot?.cleanup?.() },
  }
}

test('visibility accepts only a current, short, same-day capacity lease and live switch', () => {
  const { kling4TrialNoticeVisible: visible } = runtime().load('lib/kling4TrialNotice.ts')
  const valid = lease()
  assert.equal(visible(valid, BASE_TIME), true)
  assert.equal(visible(valid, BASE_TIME, false), false)
  assert.equal(visible(valid, BASE_TIME + 15000), false)
  for (const invalid of [null, {}, { ...valid, available: false }, { ...valid, available: 'true' }, { ...valid, utcDay: '2026-10-27' }, { ...valid, checkedAt: 'invalid' }, { ...valid, validUntil: 'invalid' }, { ...valid, checkedAt: iso(BASE_TIME + 1) }, { ...valid, validUntil: iso(BASE_TIME + 15001) }]) assert.equal(visible(invalid, BASE_TIME), false, JSON.stringify(invalid))
  const beforeMidnight = Date.parse('2026-10-28T23:59:59.000Z')
  assert.equal(visible(lease(beforeMidnight), beforeMidnight + 1001), false, 'previous-day capacity cannot survive UTC midnight')
})

test('notice never appears before a fresh capacity result and hides when capacity is exhausted', async () => {
  const ui = runtime()
  assert.equal(ui.mount(), '')
  await ui.flush()
  assert.match(ui.text(), /Kling 4\.0/)
  assert.equal(ui.requests[0].url, '/api/kling4-trial/availability')
  assert.equal(ui.requests[0].options.cache, 'no-store')
  ui.response(lease(BASE_TIME + 15000, false))
  await ui.advance(15000)
  assert.equal(ui.text(), '')
  ui.unmount()
})

test('an unreadable refresh removes the claim and never reuses a cached positive result', async () => {
  const ui = runtime()
  ui.mount(); await ui.flush()
  assert.match(ui.text(), /Kling 4\.0/)
  ui.response(new Error('offline database unavailable'))
  await ui.advance(15000)
  assert.equal(ui.text(), '')
  ui.unmount()
})

test('flag false renders no claim and makes no availability request', async () => {
  const ui = runtime({ live: false })
  ui.mount(); await ui.flush(); await ui.advance(60000)
  assert.equal(ui.text(), '')
  assert.equal(ui.requests.length, 0)
  ui.unmount()
})

test('an expired lease stays hidden while its replacement is still unreadable', async () => {
  const ui = runtime()
  ui.mount(); await ui.flush()
  assert.match(ui.text(), /Kling 4\.0/)
  const release = ui.hold()
  await ui.advance(15000)
  assert.equal(ui.text(), '')
  release({ ok: true, json: async () => lease(BASE_TIME + 15000, false) })
  await ui.flush()
  assert.equal(ui.text(), '')
  ui.unmount()
})

test('blur and hidden tabs immediately remove the claim and require a fresh result on return', async () => {
  for (const mode of ['blur', 'hidden']) {
    const ui = runtime()
    ui.mount(); await ui.flush()
    assert.match(ui.text(), /Kling 4\.0/)
    if (mode === 'blur') await ui.event('window', 'blur')
    else { ui.document.visibilityState = 'hidden'; ui.document.hidden = true; await ui.event('document', 'visibilitychange') }
    assert.equal(ui.text(), '', mode)
    const release = ui.hold()
    if (mode === 'blur') await ui.event('window', 'focus')
    else { ui.document.visibilityState = 'visible'; ui.document.hidden = false; await ui.event('document', 'visibilitychange') }
    assert.equal(ui.text(), '', 'returning to the page cannot restore the old lease')
    release({ ok: true, json: async () => lease(BASE_TIME, false) }); await ui.flush()
    assert.equal(ui.text(), '')
    ui.unmount()
  }
})

test('the component expires the old UTC day at midnight even while new-day capacity is pending', async () => {
  const now = Date.parse('2026-10-28T23:59:55.000Z')
  const ui = runtime({ now, response: { ...lease(now), validUntil: '2026-10-29T00:00:00.000Z' } })
  ui.mount(); await ui.flush()
  assert.match(ui.text(), /Kling 4\.0/)
  const release = ui.hold()
  await ui.advance(5001)
  assert.equal(ui.text(), '')
  release({ ok: true, json: async () => lease(now + 5001, false) }); await ui.flush()
  assert.equal(ui.text(), '')
  ui.unmount()
})

test('late positive requests cannot resurrect the claim after blur, hidden tab or a newer capped response', async () => {
  const hidden = runtime()
  const finishHidden = hidden.hold()
  hidden.mount()
  hidden.document.visibilityState = 'hidden'; hidden.document.hidden = true
  await hidden.event('document', 'visibilitychange')
  finishHidden({ ok: true, json: async () => lease() }); await hidden.flush()
  assert.equal(hidden.text(), '', 'an aborted background request may still resolve but must never render')
  hidden.unmount()

  const raced = runtime()
  const finishOld = raced.hold()
  raced.mount(); await raced.event('window', 'blur')
  const finishNew = raced.hold()
  await raced.event('window', 'focus')
  finishNew({ ok: true, json: async () => lease(BASE_TIME, false) }); await raced.flush()
  assert.equal(raced.text(), '')
  finishOld({ ok: true, json: async () => lease() }); await raced.flush()
  assert.equal(raced.text(), '', 'older positive capacity cannot overwrite newer capped capacity')
  assert.equal(raced.requests.length, 2)
  raced.unmount()
})

test('expired, clock-future and overlong server leases never render on the actual component', async () => {
  for (const state of [lease(BASE_TIME - 15000), { ...lease(), checkedAt: iso(BASE_TIME + 1) }, { ...lease(), validUntil: iso(BASE_TIME + 15001) }, { ...lease(), utcDay: '2026-10-27' }]) {
    const ui = runtime({ response: state })
    assert.equal(ui.mount(), '')
    await ui.flush()
    assert.equal(ui.text(), '', JSON.stringify(state))
    ui.unmount()
  }
})

test('cleanup prevents any state update or new request after a delayed reply', async () => {
  const ui = runtime()
  const finish = ui.hold()
  ui.mount()
  const writes = ui.stateWrites()
  ui.unmount()
  finish({ ok: true, json: async () => lease() }); await ui.flush(); await ui.advance(60000)
  assert.equal(ui.stateWrites(), writes)
  assert.equal(ui.requests.length, 1)
})

test('all 16 authored translations render through the real InterfaceLanguage lookup', async () => {
  const ui = runtime()
  const { INTERFACE_LANGUAGE_OPTIONS } = ui.load('lib/ui/interfaceLanguage.ts')
  const { KLING4_TRIAL_NOTICE_COPY: copy } = ui.load('lib/kling4TrialNotice.ts')
  const translations = JSON.parse(read('lib/ui/refinementCopy.json'))
  assert.equal(INTERFACE_LANGUAGE_OPTIONS.length, 16)
  ui.mount(); await ui.flush()
  for (const { code } of INTERFACE_LANGUAGE_OPTIONS) {
    assert.equal(typeof translations[code]?.[copy], 'string', code)
    assert.ok(translations[code][copy].trim(), code)
    if (code !== 'en') assert.notEqual(translations[code][copy], copy, code + ' requires an authored translation')
    await ui.language(code)
    assert.equal(ui.text().includes(code === 'en' ? copy : translations[code][copy]), true, code)
  }
  ui.unmount()
})

test('each requested surface mounts the shared gate with no fixed Kling trial promise outside it', () => {
  for (const [path, surface] of [['app/KineoLanding.tsx', 'home'], ['app/(auth)/login/page.tsx', 'login'], ['app/(auth)/signup/page.tsx', 'signup'], ['app/pricing/PricingClient.tsx', 'pricing']]) {
    const ast = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    let localName = null, count = 0
    for (const statement of ast.statements) {
      if (ts.isImportDeclaration(statement) && statement.moduleSpecifier.text === '@/components/Kling4TrialNotice') localName = statement.importClause?.name?.text ?? statement.importClause?.namedBindings?.elements?.[0]?.name?.text
    }
    assert.ok(localName, path + ' imports the shared capacity gate')
    const walk = node => {
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(ast) === localName) {
        count++
        const attr = node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.text === 'surface')
        assert.equal(attr?.initializer?.text, surface, path + ' identifies its surface')
      }
      if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) assert.equal(/first film free.{0,25}Kling 4\.0/i.test(node.text), false, path + ' must not announce the motor outside the gate')
      ts.forEachChild(node, walk)
    }
    walk(ast)
    assert.equal(count, 1, path + ' mounts the shared notice exactly once')
  }
})
