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
const lease = (now = BASE_TIME) => ({ paidLive: true, promoLive: true, publicOfferLive: true, promoAvailable: true, reason: 'available', checkedAt: iso(now), validUntil: iso(now + 15000), expiresAt: iso(now + 86400000) })

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
  const render = () => { cursor = 0; dirty = false; tree = Component({ surface: 'pricing' }); for (const effect of effects.splice(0)) effect(); return tree }
  const text = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : typeof node.type === 'function' ? text(node.type(node.props)) : text(node.props?.children)
  const flush = async () => { for (let i = 0; i < 30; i++) { await Promise.resolve(); if (dirty && mounted) render() } }
  return {
    load, requests, document, window, stateWrites: () => stateWrites,
    mount() { const module = load('components/Kling4PaidNotice.tsx'); Component = module.default ?? module.Kling4PaidNotice; render(); return text(tree) },
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


test('offer, zero price and engine label require a complete current server lease', () => {
 const m=runtime().load('lib/kling4PaidPresentation.ts'), v=lease();
 assert.equal(m.kling4PromoVisible(v,BASE_TIME),true);
 assert.equal(m.kling4PaidName(v,BASE_TIME),'Kling 4.0');
 assert.equal(m.kling4PromoZeroCredits(v,60,BASE_TIME),true);
 for(const next of [null,{}, {...v,paidLive:false},{...v,promoLive:false},{...v,publicOfferLive:false,promoAvailable:false},{...v,checkedAt:iso(BASE_TIME+1)},{...v,validUntil:iso(BASE_TIME)},{...v,validUntil:iso(BASE_TIME+16001)},{...v,expiresAt:'bad'},{...v,expiresAt:iso(BASE_TIME)}]) assert.equal(m.kling4PromoVisible(next,BASE_TIME),false,JSON.stringify(next));
 for(const seconds of [0,-1,61,90,NaN,Infinity])assert.equal(m.kling4PromoZeroCredits(v,seconds,BASE_TIME),false);
 assert.equal(m.kling4PaidName({...v,paidLive:false},BASE_TIME),'Kling 3');
 assert.equal(m.kling4PaidName(v,BASE_TIME+15000),'Kling 3');
 assert.equal(m.kling4PromoZeroCredits({...v,promoAvailable:false},15,BASE_TIME),false);
});
test('server public offer is separate from a signed-in subscriber free quota',()=>{
 const m=runtime().load('lib/kling4PaidPresentation.ts');
 assert.equal(m.kling4PromoVisible({...lease(),promoAvailable:false},BASE_TIME),true);
 assert.equal(m.kling4PromoZeroCredits({...lease(),promoAvailable:false},15,BASE_TIME),false);
 assert.equal(m.kling4PromoVisible({...lease(),publicOfferLive:false},BASE_TIME),true);
});
test('copy starts hidden, appears from server and disappears after switch-off or expiry',async()=>{
 const ui=runtime();assert.equal(ui.mount(),'');await ui.flush();assert.match(ui.text(),/Kling 4\.0 free for 30 days/);
 assert.equal(ui.requests[0].url,'/api/kling4-paid/availability');assert.equal(ui.requests[0].options.cache,'no-store');
 ui.response({...lease(BASE_TIME+15000),promoLive:false});await ui.advance(15000);assert.equal(ui.text(),'');ui.unmount();
});
test('budget exhaustion replaces the promotion headline with an honest normal-credit notice',async()=>{
 const ui=runtime({response:{...lease(),publicOfferLive:false,promoAvailable:false,reason:'global_cap'}});ui.mount();await ui.flush();assert.match(ui.text(),/Regular credits apply/);assert.doesNotMatch(ui.text(),/free for 30 days/);ui.unmount();
});
test('network failure, backgrounding and delayed replies cannot resurrect an expired offer',async()=>{
 const ui=runtime();ui.mount();await ui.flush();ui.response(new Error('offline'));await ui.advance(15000);assert.equal(ui.text(),'');
 const release=ui.hold();await ui.event('window','focus');await ui.event('window','blur');release({ok:true,json:async()=>lease(BASE_TIME+15000)});await ui.flush();assert.equal(ui.text(),'');ui.unmount();
});
test('every authored Kling 4 phrase renders through the actual UiLabel dictionary in all 16 interface languages',async()=>{
 const d=JSON.parse(read('lib/ui/refinementCopy.json')), pure=runtime().load('lib/kling4PaidPresentation.ts');
 assert.equal(Object.keys(d).length,16);
 for(const language of Object.keys(d)){
  for(const phrase of Object.values(pure.KLING4_PAID_COPY)){assert.equal(typeof d[language][phrase],'string',language+':'+phrase);assert.ok(d[language][phrase].length>0);}
  const ui=runtime({language});ui.mount();await ui.flush();assert.ok(ui.text().includes(d[language][pure.KLING4_PAID_COPY.offer]),language);assert.ok(ui.text().includes(d[language][pure.KLING4_PAID_COPY.cap]),language);ui.unmount();
 }
});
test('all touched product surfaces use verified promotion copy and old film heroes keep their recorded engine',()=>{
 for(const p of ['app/(dashboard)/studio/StudioClient.tsx','app/(dashboard)/generate/GenerateClient.tsx','app/pricing/PricingClient.tsx','app/(dashboard)/ads/v2/AdsV2Escolha.tsx','components/Kling4PaidEnginePage.tsx'])assert.match(read(p),/Kling4PaidNotice/);
 const studio=read('app/(dashboard)/studio/StudioClient.tsx');assert.match(studio,/name=\{scriptMode === 'clip' \? 'Seedance 1.5' : ENGINES.find/);
 const ads=read('app/(dashboard)/ads/v2/AdsV2Escolha.tsx');assert.match(ads,/route = orderId && orderEngine \? orderEngine : sampleMode \? kling4Availability\?\.paidLive \? 'kling4' : 'kling3'/);assert.match(ads,/data-kineo="ads-sample-engine"/);
 const schema=JSON.parse(read('public/gpt/openapi.json'));assert.equal(schema.paths['/api/kling4-paid/availability'].get.operationId,'getKling4Availability');
 assert.match(read('lib/growth/citationAnswers.ts'),/CITATION_KLING4_PAID_ANSWER/);
 assert.match(read('lib/kineoFacts.ts'),/kling4Paid: kling4PaidCitation\(\)/);
 assert.match(read('lib/kineoFacts.ts'),/name: 'Seedance 1.5'/);
 assert.match(read('app/llms.txt/route.ts'),/kling4PaidLlmsSection\(\)/);
});

test('the actual supplier badge overrides quality and never relabels an old Kling 3 film',()=>{
 const {engineLabelFor}=runtime().load('lib/engineLabel.ts');
 assert.equal(engineLabelFor('cinematic_hollywood','kling4'),'Kling 4.0');
 assert.equal(engineLabelFor('cinematic_hollywood','seedance15_fallback'),'Seedance 1.5');
 assert.equal(engineLabelFor('cinematic_ai','kling4'),'Kling 4.0');
 assert.equal(engineLabelFor('cinematic_hollywood',null),'Kling 3');
 assert.equal(engineLabelFor('cinematic_hollywood','unrecognized_supplier'),null);
 for(const p of ['app/(dashboard)/history/HistoryClient.tsx','app/(dashboard)/library/LibraryClient.tsx','app/(dashboard)/my-videos/MyVideosClient.tsx'])assert.match(read(p),/engineLabelFor\([^,]+, [^)]+\.engine_used\)/);
 assert.match(read('components/library/VideoCollection.tsx'),/engine_used/);assert.match(read('app/api/videos/route.ts'),/engine_used/);
});
