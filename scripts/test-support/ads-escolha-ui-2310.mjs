// KINEO-ADS-ESCOLHA-2310 — actual client component, in-memory hooks/transports; no browser, DB, credentials or provider.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { semAdsEscolhaPublico2410 } from './desfaz-ads-escolha-publico-2410.mjs' // KINEO-ADS-ESCOLHA-PUBLICO-2410 — old UI contracts run after exact layer restoration.
import { createOfflineLoader } from './offline-ts-loader.mjs' // KINEO-IDIOMAS-FORMATOS-2410 — resolve actual shared pure modules through the existing isolated loader.

const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
const COMPONENT = 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx'
const SIMPLE = 'app/(dashboard)/ads/v2/AdsV2Simple.tsx'
const CATALOG = 'lib/ads/cena/escolhaCatalog.ts'
const BASE = '36a5286aa9bc8aa16e8b4c72edc42fbf1d1ac7a7'
const ID = '00000000-0000-4000-8000-000000000001'
const FORM = { foto: 'https://offline.invalid/product.jpg', frase: 'Stride; leve.', oferta: 'Oferta digitada', beneficios: 'Leve.', cta: 'Conheça o Stride.', language: 'pt', formato: 'product', voice_mode: 'narrated', rota: '', presenter_id: 'amara', category: 'footwear', scenario_id: 'footwear_beach' }
const STILLS = [1, 2, 3, 4].map(n => ({ id: `still-${n}`, url: `https://offline.invalid/${n}.jpg`, reasons: ['Mãos: confira.'] }))
const compilerOptions = { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }

function compile(text, file) {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.ES2020, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  assert.equal(ast.parseDiagnostics.length, 0, `UI source must parse: ${file}`)
  return ts.transpileModule(text, { compilerOptions }).outputText
}
function nodeText(node) {
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (node == null || typeof node === 'boolean') return ''
  return typeof node === 'object' ? nodeText(node.props?.children) : String(node)
}
function walk(node, result = []) {
  if (Array.isArray(node)) for (const child of node) walk(child, result)
  else if (node && typeof node === 'object' && node.props) { result.push(node); walk(node.props.children, result) }
  return result
}

/** Reads RAW sources relative to the caller's workspace, optionally applying an explicit source mutation. Never runs on import. */
export async function runEscolhaUiProof({ source = text => text, current: rawCurrent = false, scenario = null } = {}) {
  const read = file => source(rawCurrent ? readFileSync(resolve(process.cwd(), file), 'utf8') : semAdsEscolhaPublico2410(readFileSync(resolve(process.cwd(), file), 'utf8'), file), file)
  const pure = createOfflineLoader({ source: (file, text) => source(rawCurrent ? text : semAdsEscolhaPublico2410(text, file), file) }) // KINEO-IDIOMAS-FORMATOS-2410 — current:true retains every current language/format source.
  const componentCode = compile(read(COMPONENT), COMPONENT)
  const catalog = {}
  new Function('exports', compile(read(CATALOG), CATALOG))(catalog)
  const tiers = {}; new Function('exports', compile(read('lib/ads/v2Tiers.ts'), 'lib/ads/v2Tiers.ts'))(tiers)
  const checks = []
  const check = (value, message) => { assert.ok(value, message); checks.push(message) }

  function client({ form = FORM, saved = null, owner = 'user-a:owner-a', query = '', lang = 'pt', internalControls = true } = {}) {
    const states = [], refs = [], effects = [], responses = [], requests = [], timers = new Map()
    const storageKey = `kineo:ads-escolha:v1:${owner}`
    const storage = new Map(saved ? [[storageKey, JSON.stringify(saved)]] : [])
    let stateIndex = 0, refIndex = 0, effectIndex = 0, pending = [], changed = false, tree, timerId = 0
    const hooks = {
      ...React,
      useState(initial) {
        const index = stateIndex++
        if (!(index in states)) states[index] = index === 0 ? structuredClone(form) : initial
        return [states[index], value => { const next = typeof value === 'function' ? value(states[index]) : value; if (next !== states[index]) { states[index] = next; changed = true } }]
      },
      useRef(value) { const index = refIndex++; return refs[index] ?? (refs[index] = { current: value }) },
      useEffect(callback, dependencies) {
        const index = effectIndex++, old = effects[index]
        if (!old || !dependencies || dependencies.some((value, n) => value !== old.dependencies?.[n])) pending.push(() => { old?.cleanup?.(); effects[index] = { dependencies, cleanup: callback() } })
      },
    }
    const localRequire = id => id === 'react' ? hooks
      : id === 'react-dom' ? { createPortal: value => value }
        : id.includes('escolhaCatalog') ? catalog
          : id.includes('v2Tiers') ? tiers
          : id === '@/lib/textLanguage' || id.includes('escolhaShots') ? pure(id) // KINEO-IDIOMAS-FORMATOS-2410 — real catalogue/token/format exports, never empty stubs or alias fallback to Node.
          : id.includes('uploadFootage') ? { uploadFootage() { throw new Error('upload_not_exercised_offline') }, AdsUploadError: class extends Error {} }
            : id.includes('interfaceLanguage') ? { INTERFACE_LANGUAGE_OPTIONS: [{ code: 'pt', native: 'Português' }, { code: 'en', native: 'English' }] }
              : require(id)
    const transport = async (url, options = {}) => {
      requests.push({ url, body: options.body ? JSON.parse(options.body) : null })
      const response = responses.shift()
      assert.ok(response, 'unexpected unstubbed UI transport')
      return { ok: response[0] >= 200 && response[0] < 300, status: response[0], json: async () => response[1] }
    }
    const module = { exports: {} }
    new Function('require', 'module', 'exports', 'fetch', 'localStorage', 'window', componentCode)(localRequire, module, module.exports, transport,
      { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
      { location: { search: query, href: `https://offline.invalid/ads/v2${query}` }, history: { replaceState() {} }, setTimeout: callback => { timers.set(++timerId, callback); return timerId }, clearTimeout: id => timers.delete(id) })
    function render() {
      for (let round = 0; round < 8; round++) {
        changed = false; stateIndex = refIndex = effectIndex = 0; pending = []
        tree = module.exports.default({ lang, internalControls, ownerKey: owner, resume: true, onBalance: async () => {} })
        for (const effect of pending) effect()
        if (!changed) return tree
      }
      throw new Error('UI hook fixture did not settle')
    }
    async function settle() { for (let n = 0; n < 12; n++) await Promise.resolve(); render() }
    async function click(label) {
      const button = walk(tree).find(node => node.type === 'button' && nodeText(node).includes(label))
      assert.ok(button && !button.props.disabled, `enabled UI button: ${label}`)
      button.props.onClick(); await settle()
    }
    async function poll() { const callback = [...timers.values()].at(-1); assert.ok(callback, 'UI poll must be scheduled'); callback(); await settle() }
    return { states, responses, requests, storage, storageKey, timers, render, click, poll, nodes: () => walk(tree) }
  }

  if (scenario) return scenario({ client, read, check, nodeText, walk, compile }) // KINEO-ADS-ESCOLHA-PUBLICO-2410 — new raw UI proof reuses only the offline hook boundary.
  const ui = client(); ui.render()
  check(ui.requests.length === 0, 'UI does not automatically plan or render')
  ui.responses.push([201, { order_id: ID, stage: 'planned', plan: { script: { narration: 'Narração final.' } } }])
  await ui.click('Confirmar escolhas')
  check(ui.requests[0].body.presenter_id === 'amara' && ui.requests[0].body.scenario_id === 'footwear_beach' && ui.requests[0].body.category === 'footwear', 'UI sends the exact chosen person, scene and category')
  check(ui.requests[0].body.rota === 'kling3' && ui.requests[0].body.voice_mode === 'narrated', 'UI normalizes narrated and Kling defaults')
  check(ui.requests[0].body.beneficios[0] === 'Leve.', 'UI preserves typed benefits')
  check(ui.states[1] === 'planned' && ui.states[5] === 'Narração final.', 'UI accepts plan201 and shows actual narration')
  check(ui.nodes().filter(node => node.type === 'input' && node.props.name === 'ace-person').every(node => node.props.disabled), 'UI locks the chosen person after planning')
  ui.responses.push([202, { order_id: ID, stage: 'stills', stills: STILLS.slice(0, 1), charged: false }])
  await ui.click('Preparar quatro')
  check(ui.states[1] === 'stills' && ui.requests.at(-1).body.stage === 'stills', 'UI starts stills only and accepts pending202')
  ui.responses.push([200, { order_id: ID, stage: 'choose', stills: STILLS, narration_used: 'A mesma fala.', quality_notes: [{ message: 'Joelho: confira.' }] }])
  await ui.poll()
  check(ui.states[1] === 'choose' && ui.states[3].length === 4, 'UI polling exposes all four stills for choice')
  check(!ui.requests.some(request => request.body?.stage === 'render'), 'UI never starts a video before explicit still choice')
  ui.nodes().find(node => node.type === 'input' && node.props.name === 'ace-still' && node.props.value === 'still-3').props.onChange(); ui.render()
  ui.responses.push([202, { order_id: ID, status_url: `/api/ads/v2/status?order_id=${ID}` }])
  await ui.click('Gerar vídeo com esta foto')
  check(ui.requests.at(-1).body.still_id === 'still-3' && ui.requests.filter(request => request.body?.stage === 'render').length === 1, 'UI sends exactly the selected still to one render request')
  ui.responses.push([200, { order_id: ID, status: 'delivered', video: { video_url: 'https://offline.invalid/result.mp4' }, narration_used: 'A mesma fala.', quality_notes: [{ message: 'Nota real.' }] }])
  await ui.poll()
  check(ui.states[1] === 'delivered' && ui.states[8].endsWith('result.mp4'), 'UI normal status polling shows delivered video')
  check(ui.states[6][0].message === 'Nota real.', 'UI retains human quality notes from the response')
  const saved = JSON.parse(ui.storage.get(ui.storageKey))
  check(!!saved, 'UI persists the order under authenticated user and owner')
  const reload = client({ saved }); reload.render()
  check(reload.states[1] === 'rendering' && reload.states[2] === ID, 'UI reload rechecks a delivered order instead of showing an empty player')
  const other = client({ owner: 'user-b:owner-a' }); other.render()
  check(other.states[2] === '' && other.requests.length === 0, 'UI does not resume another user local order')
  for (const status of [401, 403]) {
    const denied = client({ saved: { ...saved, stage: 'stills', still_id: '' } }); denied.render()
    denied.responses.push([status, { error: 'forbidden' }]); await denied.poll()
    check(denied.states[12] === true && denied.states[2] === '' && denied.storage.size === 0 && denied.timers.size === 0, `UI clears a pending order, storage and polls after auth${status}`)
  }
  const mismatch = client(); mismatch.render(); mismatch.responses.push([400, { error: 'escolha_scenario_category_mismatch' }]); await mismatch.click('Confirmar escolhas')
  check(mismatch.states[9].includes('outra categoria'), 'UI explains the category mismatch')
  const talking = client({ form: { ...FORM, voice_mode: 'talking' } }); talking.render(); talking.responses.push([201, { order_id: ID, stage: 'planned' }]); await talking.click('Confirmar escolhas')
  check(talking.requests[0].body.rota === 'veo31', 'UI defaults explicit talking to Veo without changing the voice mode')
  const unsupported = client({ form: { ...FORM, voice_mode: 'talking', rota: 'kling3' } }); unsupported.render()
  check(unsupported.nodes().find(node => node.type === 'button' && nodeText(node).includes('Confirmar escolhas')).props.disabled, 'UI clearly blocks unsupported Kling native speech language')

  const oldId = '00000000-0000-4000-8000-000000000099'
  const existing = client({ saved, query: `?order=${oldId}` }); existing.render()
  check(existing.states[2] === oldId && existing.requests.length === 0, 'UI explicit order link takes precedence over another locally saved order')
  existing.responses.push([200, { order_id: oldId, status: 'generating', narration_used: 'Fala já paga e preservada.' }]); await existing.poll()
  check(existing.states[1] === 'rendering' && existing.requests.every(request => request.body === null && request.url.includes(oldId)), 'UI existing legacy generating order uses GET status only')
  existing.responses.push([200, { order_id: oldId, status: 'delivered', narration_used: 'Fala já paga e preservada.', video: { video_url: 'https://offline.invalid/existing.mp4' } }]); await existing.poll()
  check(existing.states[1] === 'delivered' && existing.states[8].endsWith('existing.mp4') && existing.states[5] === 'Fala já paga e preservada.' && existing.requests.every(request => request.body === null), 'UI delivers an existing legacy order without any stills or render POST')
  const previousPlan = client({ query: `?order=${oldId}` }); previousPlan.render()
  previousPlan.responses.push([200, { order_id: oldId, status: 'planned' }]); await previousPlan.poll()
  check(previousPlan.states[1] === 'failed' && previousPlan.states[9].includes('fluxo anterior') && !previousPlan.nodes().some(node => node.type === 'button' && /Preparar quatro|Gerar vídeo com esta foto/u.test(nodeText(node))) && previousPlan.requests.every(request => request.body === null), 'UI old planned order requires a new plan and cannot receive stills or render POST')
  const choiceLink = client({ query: `?order=${ID}` }); choiceLink.render()
  choiceLink.responses.push([200, { order_id: ID, status: 'planned', stage: 'choose', presenter_id: 'sofia', scenario_id: 'perfume_evening', stills: STILLS, selected_still_id: 'still-2', narration_used: 'Fala já planejada.' }]); await choiceLink.poll()
  check(choiceLink.states[1] === 'choose' && choiceLink.states[0].presenter_id === 'sofia' && choiceLink.states[0].scenario_id === 'perfume_evening' && choiceLink.states[0].category === 'perfume' && choiceLink.states[4] === 'still-2', 'UI new choice link restores exact server person, scenario and selected still')
  choiceLink.responses.push([202, { order_id: ID }]); await choiceLink.click('Gerar vídeo com esta foto')
  check(choiceLink.requests.filter(request => request.body).length === 1 && choiceLink.requests.at(-1).body.stage === 'render' && choiceLink.requests.at(-1).body.still_id === 'still-2', 'UI new choice link renders the same order only after explicit confirmation, without replanning')

  const partial = client({ saved: { ...saved, stage: 'stills', stills: [], still_id: '' } }); partial.render()
  partial.responses.push([200, { order_id: ID, stage: 'choose', stills: STILLS.slice(0, 3), charged: false }]); await partial.poll()
  const partialVisible = partial.states[3].length === 3 && partial.states[4] === '' && partial.nodes().some(node => node.type === 'p' && nodeText(node) === 'O fornecedor retornou 3 fotos. Você pode escolher uma opção disponível.') && !partial.requests.some(request => request.body?.stage === 'render')
  partial.nodes().find(node => node.type === 'input' && node.props.name === 'ace-still' && node.props.value === 'still-2').props.onChange(); partial.render()
  partial.responses.push([202, { order_id: ID }]); await partial.click('Gerar vídeo com esta foto')
  check(partialVisible && partial.requests.filter(request => request.body?.stage === 'render').length === 1 && partial.requests.at(-1).body.still_id === 'still-2', 'UI partial supplier result explains three stills without auto-selection and renders exactly the explicitly chosen available still')

  const legacy = execFileSync('git', ['show', `${BASE}:${SIMPLE}`], { cwd: process.cwd(), encoding: 'utf8' }).replace(/\r\n/gu, '\n')
  const current = read(SIMPLE).replace(/\r\n/gu, '\n')
  check(legacy.split('export function AdsV2SimpleSession({')[1] === current.split('function AdsV2SimpleLegacySession({ // KINEO-ADS-ESCOLHA-2310 — original body below, unchanged.')[1], 'UI preserves the original legacy session body byte for byte')
  const ast = ts.createSourceFile(SIMPLE, current, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX)
  const wrapper = ast.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'AdsV2SimpleSession')
  assert.ok(wrapper, 'actual exported UI wrapper exists')
  const module = { exports: {} }, choice = () => null, previous = () => null
  new Function('require', 'module', 'exports', 'AdsV2Escolha', 'AdsV2SimpleLegacySession', compile(wrapper.getText(ast), SIMPLE))(require, module, module.exports, choice, previous)
  const props = { lang: 'pt', resume: true, escolhaOwnerKey: 'user-a:owner-a', escolhaInternal: false }
  const off = module.exports.AdsV2SimpleSession(props)
  check(off.type === previous && JSON.stringify(off.props) === JSON.stringify(props), 'UI flag off returns the unchanged legacy component and props')
  return { checks: checks.length, assertions: checks, network: 'in-memory transport only', browser: 'not used; no visual claim' }
}

export const ESCOLHA_UI_MUTANTS = Object.freeze([
  { name: 'video_before_choice', file: COMPONENT, from: '{ stage: action, order_id: orderId,', to: "{ stage: action === 'stills' ? 'render' : action, order_id: orderId," },
  { name: 'ignore_selected_still', file: COMPONENT, from: '{ still_id: stillId }', to: '{ still_id: stills[0]?.id }' },
  { name: 'ignore_auth_stop', file: COMPONENT, from: 'if (denied(r.status)) return', to: 'if (false && denied(r.status)) return' },
  { name: 'off_mounts_new_ui', file: SIMPLE, from: 'props.escolhaInternal === true', to: 'props.escolhaInternal !== true' },
])

/** Four source mutants must parse and die in actual behavioral assertions, never at import or unstubbed transport. */
export async function runEscolhaUiMutants() {
  const killed = []
  for (const mutant of ESCOLHA_UI_MUTANTS) {
    const raw = semAdsEscolhaPublico2410(readFileSync(resolve(process.cwd(), mutant.file), 'utf8'), mutant.file)
    assert.equal(raw.split(mutant.from).length - 1, 1, `unique UI mutation anchor: ${mutant.name}`)
    const changed = raw.replace(mutant.from, mutant.to)
    compile(changed, mutant.file)
    let failure
    try { await runEscolhaUiProof({ source: (text, file) => file === mutant.file ? changed : text }) } catch (error) { failure = error }
    assert.equal(failure?.code, 'ERR_ASSERTION', `UI mutant must fail an assertion: ${mutant.name}`)
    assert.ok(!/unstubbed|must parse|Cannot find module|enabled UI button/u.test(failure.message), `UI mutant must die behaviorally: ${mutant.name}: ${failure.message}`)
    killed.push({ name: mutant.name, code: failure.code, assertion: failure.message.split('\n')[0] })
  }
  return { mutants: killed.length, killed }
}
