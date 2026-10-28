// Raw editor and login transport, in-memory React hooks; no credentials, network or generation.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const pure = createOfflineLoader(), C = pure('lib/ads/bfCampaign.ts')
const UI = 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx', PAGE = 'app/(dashboard)/ads/v2/page.tsx'
const compile = (raw, file) => ts.transpileModule(raw, { fileName: file, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const plain = x => JSON.parse(JSON.stringify(x))
const query = (lang, id) => new URL(C.bfTemplateHref(lang, id), 'https://offline.invalid').search
for (const lang of ['en', 'pt', 'es']) for (const id of C.BF_TEMPLATE_IDS) {
  const parsed = C.bfCampaignFromQuery(new URLSearchParams(query(lang, id)))
  assert.deepEqual(plain(parsed), { id, lang })
  const t = C.bfTemplate(lang, id)
  assert.ok(t.title && t.description && t.cta && t.hint && t.frase)
  assert.ok(/final visual text|texto visual final/.test(t.frase), 'offer belongs in final visual text, not speech')
  assert.ok(/not the voiceover|nunca na narração|nunca en la voz/.test(t.frase), 'template explicitly excludes offer from speech')
  assert.equal(/\d+\s*%|last \d+|últimas unidades|últimas unidades/i.test(t.frase + t.cta), false, 'no discount or scarcity preselected')
  assert.equal(C.bfTemplateReady(parsed, { frase: t.frase, oferta: 'Real offer', beneficios: '', cta: t.cta }), false)
  assert.equal(C.bfTemplateReady(parsed, { frase: 'My real product', oferta: '', beneficios: '', cta: t.cta }), false)
  assert.equal(C.bfTemplateReady(parsed, { frase: 'My real product', oferta: 'Real offer', beneficios: '', cta: t.cta }), true)
}
for (const q of ['', 'bf_template=unknown', 'bf_template=flash-sale&bf_lang=ar', 'bf_template=%3Cscript%3E']) assert.equal(C.bfCampaignFromQuery(new URLSearchParams(q)), null)
assert.equal(C.bfTemplateReady(null, { frase: 'Product', oferta: '', beneficios: '', cta: '' }), true, 'ordinary editor unchanged')

async function loginRedirect(searchParams) {
  const mod = { exports: {} }
  function req(id) {
    if (id === 'react/jsx-runtime') return jsx
    if (id === 'next/navigation') return { redirect(url) { throw new Error('REDIRECT:' + url) } }
    if (id === '@/lib/supabase/server') return { createClient: () => ({ auth: { getUser: async () => ({ data: {} }) } }) }
    if (id === '@/lib/ads/bfCampaign') return C
    if (id === '@/lib/ads/sampleEntry') return { adsSampleEntryOf: x => ['product', 'ugc'].includes(x) ? x : null }
    if (id === '@/lib/ads/v2Contract') return { isUuid: x => typeof x === 'string' && /^[\da-f-]{36}$/i.test(x) }
    return {}
  }
  new Function('require', 'module', 'exports', compile(readFileSync(PAGE, 'utf8'), PAGE))(req, mod, mod.exports)
  try { await mod.exports.default({ searchParams }); assert.fail('anonymous page must redirect') } catch (e) {
    assert.ok(e.message.startsWith('REDIRECT:/login?redirect='), e.message)
    return new URL(new URL(e.message.slice(9), 'https://offline.invalid').searchParams.get('redirect'), 'https://offline.invalid')
  }
}
for (const lang of ['en', 'pt', 'es']) for (const id of C.BF_TEMPLATE_IDS) {
  const target = await loginRedirect({ entry: 'product', bf_template: id, bf_lang: lang })
  assert.deepEqual(plain(C.bfCampaignFromQuery(target.searchParams)), { id, lang })
}
assert.equal((await loginRedirect({ bf_template: 'unknown', bf_lang: 'en' })).searchParams.has('bf_template'), false)

const catalog = pure('lib/ads/cena/escolhaCatalog.ts')
const FORM = { foto: 'https://offline.invalid/photo.jpg', frase: 'Real product', oferta: 'Real offer', beneficios: '', cta: 'Shop', language: 'en', formato: 'product', voice_mode: 'narrated', rota: '', presenter_id: 'amara', category: 'footwear', scenario_id: 'footwear_beach' }
function nodes(tree, result = []) { if (Array.isArray(tree)) tree.forEach(x => nodes(x, result)); else if (tree && typeof tree === 'object' && tree.props) { result.push(tree); nodes(tree.props.children, result) } return result }
function client({ q = '', saved = null, raw = readFileSync(UI, 'utf8') } = {}) {
  const state = [], refs = [], effects = [], requests = [], storage = new Map(saved ? [['kineo:ads-escolha:v1:u:o', JSON.stringify(saved)]] : [])
  let si = 0, ri = 0, ei = 0, pending, changed, tree
  const hooks = { ...React,
    useState(initial) { const i = si++; if (!(i in state)) state[i] = i === 0 ? { ...FORM } : initial; return [state[i], v => { const next = typeof v === 'function' ? v(state[i]) : v; if (next !== state[i]) { state[i] = next; changed = true } }] },
    useRef(initial) { return refs[ri++] ?? (refs[ri - 1] = { current: initial }) },
    useEffect(callback, dependencies) { const i = ei++, prev = effects[i]; if (!prev || !dependencies || dependencies.some((v, n) => v !== prev.dependencies?.[n])) pending.push(() => { prev?.cleanup?.(); effects[i] = { dependencies, cleanup: callback() } }) },
  }
  const mod = { exports: {} }, browser = new EventTarget()
  function req(id) {
    if (id === 'react') return hooks
    if (id === 'react/jsx-runtime') return jsx
    if (id === 'react-dom') return { createPortal: x => x }
    if (id === '@/components/OneTimeItemOffer') return { __esModule: true, default: () => null }
    if (id === '@/lib/oneTimeItem') return { ONE_TIME_ITEMS_LIVE: false }
    if (id === '@/lib/ads/uploadFootage') return { AdsUploadError: class extends Error {}, uploadFootage() { throw Error('offline upload forbidden') } }
    if (id.startsWith('@/')) return pure(id)
    throw Error('offline dependency forbidden:' + id)
  }
  const transport = async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return { ok: true, status: 201, json: async () => ({ order_id: '00000000-0000-4000-8000-000000000001', stage: 'planned' }) } }
  new Function('require', 'module', 'exports', 'fetch', 'localStorage', 'window', compile(raw, UI))(req, mod, mod.exports, transport,
    { getItem: k => storage.get(k) ?? null, removeItem: k => storage.delete(k), setItem: (k,v) => storage.set(k,v) },
    { location: { search: q, href: 'https://offline.invalid/ads/v2' + q }, addEventListener: browser.addEventListener.bind(browser), removeEventListener: browser.removeEventListener.bind(browser), setTimeout() { return 1 }, clearTimeout() {} })
  function render() {
    for (let n = 0; n < 10; n++) { changed = false; si = ri = ei = 0; pending = []; tree = mod.exports.default({ lang: 'en', ownerKey: 'u:o', initialSample: false, sampleAvailable: false }); pending.forEach(f => f()); if (!changed) return }
    throw Error('hooks did not settle')
  }
  return { state, requests, storage, render, nodes: () => nodes(tree) }
}
for (const lang of ['en', 'pt', 'es']) for (const id of C.BF_TEMPLATE_IDS) {
  const ui = client({ q: query(lang, id) }); ui.render()
  assert.equal(ui.requests.length, 0, 'template never automatically plans or generates')
  assert.equal(ui.state[0].frase, C.bfTemplate(lang, id).frase)
  assert.equal(ui.state[0].language, lang); assert.equal(ui.state[0].formato, 'product'); assert.equal(ui.state[0].oferta, '')
  assert.ok(ui.nodes().find(n => n.props['data-kineo'] === 'bf-template-loaded'))
  const confirm = () => ui.nodes().find(n => n.type === 'button' && String(n.props.children).includes('Confirm choices'))
  assert.equal(confirm().props.disabled, true, 'placeholder cannot be submitted')
  confirm().props.onClick(); for (let n = 0; n < 10; n++) await Promise.resolve()
  assert.equal(ui.requests.length, 0, 'even direct handler invocation cannot submit a placeholder')
  ui.state[0] = { ...ui.state[0], frase: 'Real product', oferta: '30% off through Nov 27' }; ui.render()
  assert.equal(confirm().props.disabled, false, 'real product and confirmed offer enable explicit plan')
  confirm().props.onClick(); for (let n = 0; n < 10; n++) await Promise.resolve()
  assert.equal(ui.requests.length, 1); assert.equal(ui.requests[0].body.frase, 'Real product'); assert.equal(ui.requests[0].body.language, lang)
}
const saved = { version: catalog.CENA_ESCOLHA_MARK, form: FORM, order_id: '00000000-0000-4000-8000-000000000001', stage: 'choose', stills: [], still_id: '', narration_used: '', quality_notes: [], credits: 41 }
const returning = client({ saved, q: query('pt', 'countdown') }); returning.render()
assert.equal(returning.state[0].frase, C.bfTemplate('pt', 'countdown').frase, 'explicit template opens a separate draft for returning users')
assert.equal(returning.storage.get('kineo:ads-escolha:v1:u:o'), JSON.stringify(saved), 'previous order storage remains byte-for-byte intact')
assert.equal(returning.requests.length, 0)
assert.equal(C.bfDraftStorageKey('u:o', new URLSearchParams(query('pt', 'countdown'))), 'kineo:ads-escolha:v1:u:o:bf:countdown:pt')
for (const settings of [{ saved }, { saved, q: query('es', 'flash-sale') + '&order=00000000-0000-4000-8000-000000000001' }]) {
  const ui = client(settings); ui.render(); assert.equal(ui.state[0].frase, FORM.frase); assert.equal(ui.nodes().some(n => n.props['data-kineo'] === 'bf-template-loaded'), false); assert.equal(ui.requests.length, 0)
}
assert.equal(C.bfDraftStorageKey('u:o', new URLSearchParams(query('pt', 'countdown') + '&order=00000000-0000-4000-8000-000000000001')), 'kineo:ads-escolha:v1:u:o')
console.log('ok — 9 localized templates; visual-only offers; enums; login round-trip; raw editor prefill, explicit plan, placeholder guard, independent returning-user draft and explicit-order priority; no network')
