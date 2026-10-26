// KINEO-ADS-CENA-95-PLAN-FAILED-2110 — HTTP + runtime JSON reais, transportes e histórico exclusivamente em dublês.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { CALIBRATION_CASES, DEFAULT_FOUNDER_PHOTOS } from './ads-cena-calibracao-2110.mjs'
import { semAdsCena95PlanFailed2110, ADS_CENA_95_PLAN_FAILED_BASE, ADS_CENA_95_PLAN_FAILED_FILES, ADS_CENA_95_PLAN_FAILED_NEW, ADS_CENA_95_PLAN_FAILED_MARK } from './test-support/desfaz-ads-cena-95-plan-failed-2110.mjs'
import { semRoteiroCurto2210 } from './test-support/desfaz-roteiro-curto-2210.mjs'
import { semPaginasIaClaras2110 } from './test-support/desfaz-paginas-ia-claras-2110.mjs' // KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]
import { semAdsCena95Pacing2110 } from './test-support/desfaz-ads-cena-95-pacing-2110.mjs' // KINEO-ADS-CENA-95-PACING-2110
import { semAfiliado50_2610 } from './test-support/desfaz-afiliado50-2610.mjs'

const F = { internal: 'lib/ads/cena/internal.ts', plan: 'lib/ads/cena/plan95.ts', script: 'lib/ads/cena/script95.ts', contract: 'lib/ads/cena/script95Contract.ts', captions: 'lib/ads/cena/captions95.ts', catalog: 'lib/ads/cena/catalog.ts', route: 'app/api/admin/ads-cena/route.ts' }
const read = p => semAdsCena95Pacing2110(semPaginasIaClaras2110(semAfiliado50_2610(p, readFileSync(p, 'utf8')).replace(/\r\n/g, '\n'), p), p) // KINEO-ADS-CENA-95-PACING-2110 — régua BUG1 antes dos mutantes e do seu desfaz exato.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 25 }).replace(/\r\n/g, '\n')
const plain = x => JSON.parse(JSON.stringify(x))
const same = (a, b) => assert.deepEqual(plain(a), plain(b))
const house = { id: 'offline-founder', email: 'josephsskaf@gmail.com' }
const forbidden = () => { throw new Error('OFFLINE: unexpected provider, write or render') }
const server = { v2Json: (body, status = 200) => new Response(JSON.stringify(body), { status }), v2Fail: (error, status, extra = {}) => new Response(JSON.stringify({ error, ...extra }), { status }) }

// Representative fixtures from the founder's descriptions. The literal production JSONs and model replies were NOT supplied.
// Deliberately exercise real chat.completions content:string, usage and field types, rather than passing a ready Cena95Script.
const cases = CALIBRATION_CASES.filter(c => ['creamUGCpt', 'shoeProducten'].includes(c.role)).map(c => ({
  name: c.role, category: c.category, product: c.product,
  body: { foto: DEFAULT_FOUNDER_PHOTOS[c.role], frase: c.product + '; ' + c.benefit, oferta: c.offer, beneficios: [c.benefit], language: c.language, formato: c.formato, rota: 'kling3', voice_mode: 'narrated', dry_run: true },
  script: { hooks: [...c.hooks], pain: c.pain, demonstration: c.demonstration, benefit: c.benefit, offer: c.offer, cta: c.cta },
}))
cases.push({ name: 'glowUGCen', category: 'skincare', product: 'GLOW face cream',
  body: { foto: DEFAULT_FOUNDER_PHOTOS.creamUGCpt, frase: 'GLOW face cream; Light texture.', oferta: 'Free shipping.', beneficios: ['Light texture.'], language: 'en', formato: 'ugc', rota: 'kling3', voice_mode: 'narrated', dry_run: true },
  script: { hooks: ['Cream feels heavy?', 'Time for skincare?', 'Your skincare step?'], pain: 'Looking for a simple step to include in your daily skincare routine at home?', demonstration: "Watch GLOW face cream applied to the same person's forearm in a bright bathroom.", benefit: 'Light texture.', offer: 'Free shipping.', cta: 'Order GLOW face cream.' },
})
const noFacts = { ...cases[2], name: 'glowWithoutInventedBenefits', body: { foto: cases[2].body.foto, frase: 'GLOW face cream', language: 'en', formato: 'ugc', rota: 'kling3', voice_mode: 'narrated', dry_run: true }, script: { ...cases[2].script, demonstration: "Watch GLOW face cream being applied to the same person's forearm in a bright bathroom, with its original container visible.", benefit: '', offer: '' } }

async function request(c, options = {}, over = {}) {
  const calls = [], warnings = [], history = [], effects = []
  let scriptCalls = 0
  const db = { from(table) {
    assert.equal(table, 'ads_v2_orders')
    const q = { select: value => { history.push(['select', value]); return q }, eq: (...a) => { history.push(['eq', ...a]); return q }, order: (...a) => { history.push(['order', ...a]); return q }, limit: n => { history.push(['limit', n]); return Promise.resolve({ error: options.historyError ? { message: 'offline' } : null, data: [{ plan: null }, { plan: { shots: [] } }, { plan: { cena: { plan: {} } } }] }) }, insert: forbidden, update: forbidden, delete: forbidden }
    return q
  } }
  const mockOpenai = { chat: { completions: { create: async (args, transport) => {
    calls.push(plain({ args, transport }))
    assert.equal(args.response_format.type, 'json_object'); assert.equal(transport.maxRetries, 0)
    if (options.error) throw new Error(options.error)
    const content = args.messages[1].content, vision = content.some(x => x.type === 'image_url')
    let value
    if (vision) value = { category: c.category, confidence: .99, product: c.product, offer: '', benefits: [], photo_is_isolated_product: options.badPhoto ? false : true }
    else {
      scriptCalls++
      value = plain(c.script)
      if (options.invalidAlways || options.repairFirst && scriptCalls === 1 || options.contractAware && !args.messages[0].content.includes('ALL THREE hooks')) value.hooks[1] = 'What about your next daily routine?'
      if (options.schemaAware && !args.messages[0].content.includes('plain strings, never arrays or objects')) value.benefit = [value.benefit]
      if (options.repairFirst && scriptCalls === 2) {
        const data = JSON.parse(content.find(x => x.type === 'text').text)
        assert.equal(data.repair.reason, 'cena95_hook_too_long')
        assert.equal(data.repair.hookWordCounts[1], 6)
        assert.equal(data.repair.previousDraft.hooks[1], 'What about your next daily routine?')
        assert.ok(data.repair.selectedWords >= 39 && data.repair.selectedWords <= 42)
      }
    }
    return { id: 'chatcmpl-offline', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(value) }, finish_reason: 'stop' }], usage: { prompt_tokens: 300, completion_tokens: 120, total_tokens: 420 } }
  } } } }
  const mocks = {
    '@/lib/openai': { openai: mockOpenai }, '@/lib/ads/v2Server': server,
    '@/lib/ads/v2Billing': { failAdsV2Order: forbidden }, '@/lib/ads/v2Shots': { submitShotOnce: forbidden, pollFalJob: forbidden, persistShotClip: forbidden }, '@/lib/ads/v2Images': { persistSceneImage: forbidden },
    '@/lib/compose': { CreatomateSubmitError: Error, estimateMp3DurationSeconds: forbidden, submitCreatomateRender: forbidden, uploadVoiceoverToSupabase: forbidden }, '@/lib/ttsFallback': { synthesizeTtsFallback: forbidden }, '@/lib/serverEvents': { writeServerEvent: forbidden },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: options.unauthenticated ? null : options.external ? { ...house, email: 'outsider@example.com' } : house } }) } }) },
    '@/lib/ads/serverAccess': { loadAdsAccess: async () => ({ admin: db }) }, '@/lib/ads/v2StartCore': { adsV2StartFor: () => { effects.push('start'); return forbidden() } },
    '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: options.moderated !== false }) },
    '../_shared/db': { isAdminEmail: email => email === house.email },
  }
  for (const name of ['v2Server', 'v2Billing', 'v2Shots', 'v2Images']) mocks['../' + name] = mocks['@/lib/ads/' + name]
  const load = createOfflineLoader({ mocks, globals: { Response, Request, Error, console: { log() {}, error() {}, warn: (...args) => warnings.push(args) } }, source: (p, text) => over[p] ?? semAdsCena95Pacing2110(semPaginasIaClaras2110(text, p), p) }) // KINEO-ADS-CENA-95-PACING-2110 — override mutado não passa pelo desfaz.
  const POST = load(F.route).POST
  const response = await POST(new Request('https://offline.example/api/admin/ads-cena', { method: 'POST', body: JSON.stringify(c.body) }))
  return { status: response.status, body: await response.json(), calls, scriptCalls, warnings, history, effects, load }
}

async function happyProof(over = {}) {
  for (const c of cases) {
    const r = await request(c, { contractAware: true, schemaAware: true }, over)
    assert.equal(r.status, 200, c.name + ': ' + JSON.stringify(r.body))
    assert.equal(r.body.dry_run, true); assert.equal(r.body.charged, false)
    assert.equal(r.body.plan.category, c.category); assert.equal(r.body.plan.product, c.product)
    assert.equal(r.body.plan.input.voice_mode, 'narrated'); assert.equal(r.body.rota, 'kling3')
    assert.equal(r.body.plan.script.offer, c.body.oferta)
    assert.ok(r.body.plan.script.narration.includes(c.body.beneficios[0]))
    assert.equal(r.body.plan.quality95.planningUsage.calls, 2)
    assert.equal(r.body.plan.quality95.planningUsage.measuredCalls, 2)
    assert.ok(r.body.costs.kling3.totalUsd > 0); assert.ok(r.body.costs.kling3.budgetMaxUsd >= r.body.costs.kling3.totalUsd)
    assert.equal(r.scriptCalls, 1); assert.equal(r.effects.length, 0); assert.equal(r.warnings.length, 0)
    assert.ok(r.history.some(x => x[0] === 'limit' && x[1] === 3), 'histórico legado sem ator continua válido')
  }
}
async function noFactsProof(over = {}) {
  const r = await request(noFacts, {}, over)
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.plan.script.benefit, '')
  const s = r.body.plan.script, C = r.load(F.captions)
  const windows = C.cena95NarratedWindows(s, 'en', 14.7)
  assert.equal(windows.length, 3); assert.ok(windows.every(w => w.end > w.start && w.text))
  assert.ok(Math.abs(windows[2].start - windows[1].end - .35) < .00001)
  assert.equal(windows.map(w => w.text).join(' '), s.narration)
  const captions = C.cena95Captions({ text: s.narration, language: 'en', speechWindows: windows })
  assert.equal(captions.words.length, s.words)
}
async function repairProof(over = {}) {
  const r = await request(cases[0], { repairFirst: true }, over)
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.scriptCalls, 2)
  assert.equal(r.body.plan.quality95.planningUsage.calls, 3); assert.equal(r.body.plan.quality95.planningUsage.measuredCalls, 3)
}
async function diagnosticProof(over = {}) {
  const reason = 'offline_provider_error:' + 'x'.repeat(220)
  const r = await request(cases[0], { error: reason }, over)
  assert.equal(r.status, 502); assert.equal(r.body.error, 'cena_plan_failed'); assert.equal(r.body.reason, reason.slice(0, 200))
  same(r.warnings, [['[ads-cena] plan_failed', reason]]); assert.equal(r.effects.length, 0)
}
await happyProof(); console.log('ok HTTP dry_run: creme PT, tênis EN, GLOW EN; respostas GPT simuladas como content:string; histórico antigo sem ator')
await noFactsProof(); console.log('ok pedido sem benefício/oferta não inventa propriedades; legenda e pausa até o áudio medido')
await repairProof(); console.log('ok reparo único recebe rascunho, causa e contagens; teto de três chamadas de planejamento mantido')
await diagnosticProof(); console.log('ok causa502 limitada a200 caracteres + warn solicitado')

const base = Object.fromEntries([F.internal, F.plan, F.script, F.captions].map(p => [p, git('show', ADS_CENA_95_PLAN_FAILED_BASE + ':' + p)]))
for (const c of cases) {
  const old = await request(c, { contractAware: true }, base)
  assert.equal(old.status, 502); same(old.body, { error: 'cena_plan_failed' }); assert.equal(old.scriptCalls, 2)
}
assert.equal((await request(noFacts, {}, base)).status, 502)
console.log('ok os mesmos dublês reproduzem502 nas três entradas e no benefício ausente na base3e')
for (const options of [{ invalidAlways: true }, { badPhoto: true }, { historyError: true }, { unauthenticated: true }, { external: true }, { moderated: false }]) {
  const r = await request(cases[0], options)
  assert.equal(r.status, options.invalidAlways ? 502 : options.badPhoto ? 400 : options.historyError ? 503 : options.unauthenticated ? 401 : options.external ? 403 : 422)
  if (options.invalidAlways) { assert.equal(r.body.reason, 'cena95_hook_too_long'); assert.equal(r.scriptCalls, 2) }
  if (options.badPhoto) assert.equal(r.body.error, 'cena95_packshot_required')
  if (options.historyError) assert.equal(r.body.error, 'cena95_history_unavailable')
  if (options.unauthenticated || options.external || options.moderated === false) assert.equal(r.calls.length, 0)
  assert.equal(r.effects.length, 0)
}
const off = { [F.catalog]: read(F.catalog).replace("ADS_CENA_LIVE: 'off' | 'internal' = 'internal'", "ADS_CENA_LIVE: 'off' | 'internal' = 'off'") }
same((await request(cases[0], {}, off)).body, (await request(cases[0], {}, { ...base, ...off })).body)
assert.equal((await request(cases[0], {}, off)).calls.length, 0)
console.log('ok fail-closed, gates internos/admin, moderação, falta de foto, histórico503 e flagoff preservados')

let mutants = 0
for (const [label, proof, file, from, to] of [
  ['contrato dos três ganchos', happyProof, F.contract, 'ALL THREE hooks', 'Selected first hook'],
  ['tipos JSON ambíguos', happyProof, F.contract, 'plain strings, never arrays or objects', 'values'],
  ['reparo sem feedback', repairProof, F.plan, 'cena95ScriptRepair(previous, correction)', '{}'],
  ['causa escondida', diagnosticProof, F.internal, 'reason: message.slice(0, 200)', 'reason: undefined'],
  ['causa sem limite', diagnosticProof, F.internal, 'message.slice(0, 200)', 'message'],
  ['warn ausente', diagnosticProof, F.internal, "console.warn('[ads-cena] plan_failed', message)", 'void 0'],
  ['benefício vazio força invenção', noFactsProof, F.script, '(input.beneficios?.length && !benefit)', '!benefit'],
  ['legenda exige benefício inventado', noFactsProof, F.captions, '[parts[0], parts[1], parts[3]].some', 'parts.some'],
  ['janela vazia em áudio medido', noFactsProof, F.captions, '.filter(w => tokens(w.text).length > 0)', ''],
  ['segunda recusa vira sucesso', async over => { const r = await request(cases[0], { invalidAlways: true }, over); assert.equal(r.status, 502); assert.equal(r.body.reason, 'cena95_hook_too_long') }, F.script, 'hooks.some(h =>', '[].some(h =>'],
]) {
  const source = read(file); assert.ok(source.includes(from), 'mutante tem âncora: ' + label)
  let failed = false
  try { await proof({ [file]: source.replace(from, to) }) } catch { failed = true }
  assert.ok(failed, 'mutante precisa ficar vermelho: ' + label); mutants++; console.log('ok mutante vermelho: ' + label)
}

for (const file of ADS_CENA_95_PLAN_FAILED_FILES) {
  const actual = semPaginasIaClaras2110(read(file), file), before = git('show', ADS_CENA_95_PLAN_FAILED_BASE + ':' + file)
  assert.equal(semAdsCena95PlanFailed2110(actual, file), before, 'desfaz exato: ' + file)
  assert.equal(semAdsCena95PlanFailed2110(before, file), before, 'idempotente: ' + file)
  assert.equal(semAdsCena95PlanFailed2110(actual.replace(/\n/g, '\r\n'), file), before.replace(/\n/g, '\r\n'), 'CRLF: ' + file)
  assert.throws(() => semAdsCena95PlanFailed2110(actual + '\n// mutant\n', file), /fonte divergente/)
  assert.notEqual(semAdsCena95PlanFailed2110(actual.replaceAll(ADS_CENA_95_PLAN_FAILED_MARK, 'REMOVED'), file), before)
}
assert.equal(semAdsCena95PlanFailed2110('unrelated', 'lib/other.ts'), 'unrelated')
const short = 'scripts/test-support/desfaz-roteiro-curto-2210.mjs'
assert.equal(semAdsCena95PlanFailed2110(read(short), short), git('show', ADS_CENA_95_PLAN_FAILED_BASE + ':' + short))
const older = 'scripts/test-support/desfaz-ads-cena-95-2110.mjs'
assert.equal(semRoteiroCurto2210(read(older), older), git('show', 'f3532d7d2:' + older))
const deliveryHead = git('log', '--format=%H%x09%s', ADS_CENA_95_PLAN_FAILED_BASE + '..HEAD').trim().split('\n').find(line => { const subject = line.slice(line.indexOf('\t') + 1); return (subject.startsWith(ADS_CENA_95_PLAN_FAILED_MARK + ' ') || subject.startsWith(ADS_CENA_95_PLAN_FAILED_MARK + ': ')) && subject.includes('[TRAVA 8.2 — vai do fundador 21/10 "quero chegar a 9.5 de mínimo"]') })?.split('\t')[0] // KINEO-ADS-CENA-95-PACING-2110 — só a entrega BUG1 com marca/fronteira e autorização exatas.
assert.ok(deliveryHead, 'commit final marcado e autorizado da entrega BUG1 existe') // KINEO-ADS-CENA-95-PACING-2110
for (const p of ['lib/engineWall.ts', 'lib/homeVideoCuration.ts', 'lib/checkoutPricing.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2Tiers.ts', 'app/api/admin/ads-cena/route.ts']) assert.equal(git('diff', ADS_CENA_95_PLAN_FAILED_BASE, deliveryHead, '--', p), '', 'intocado: ' + p) // KINEO-ADS-CENA-95-PACING-2110 — mesma proteção no commit histórico BUG1, inclusive sua rota intocada.
const declared = new Set([...ADS_CENA_95_PLAN_FAILED_FILES, ...ADS_CENA_95_PLAN_FAILED_NEW])
const changed = git('diff', ADS_CENA_95_PLAN_FAILED_BASE, deliveryHead, '--name-only').trim().split('\n').filter(Boolean) // KINEO-ADS-CENA-95-PACING-2110 — preservar o escopo exato de BUG1, sem unir os arquivos da camada nova.
assert.ok(changed.every(p => declared.has(p)), 'escopo exato: ' + changed.filter(p => !declared.has(p)).join(','))
for (const file of ADS_CENA_95_PLAN_FAILED_NEW) assert.ok(read(file).length)
const fingerprint = createHash('sha256').update(JSON.stringify(cases.map(c => ({ body: c.body, script: c.script })))).digest('hex')
console.log('ok desfaz exato, CRLF, camada mais nova primeiro, arquivos protegidos e escopo; fixtures_sha256=' + fingerprint)
console.log(ADS_CENA_95_PLAN_FAILED_MARK + ': verde; ' + mutants + ' mutantes vermelhos; offline, sem render/DB/cobrança')
