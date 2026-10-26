// KINEO-AMOSTRA-ANUNCIO-2410 — execute the real personal sample controller, start/ledger and paid continuation offline.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createEscolhaWorld, escolhaFixture } from './test-ads-escolha-2310.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { runEscolhaUiProof } from './test-support/ads-escolha-ui-2310.mjs'
import { adsSampleUiScenario2410 } from './test-support/ads-amostra-ui-2410.mjs'
const ROOT = 'lib/ads/cena/', USER = { id: '10000000-0000-4000-8000-000000000001', email: 'external@example.org' }
const plain = x => JSON.parse(JSON.stringify(x))
// Admission/RPC boundaries are exercised against real SQL in test-ads-amostra-data-2410.
// Here they only stand in for the isolated database; provider/model/ledger boundaries already fail closed in the world.
const server = `export async function escolhaSampleAccountOk(a,id){return true}
export async function reserveEscolhaSample(a,args){const r=await a.rpc('reserve_ads_escolha_sample',args);return r.data?.code==='ok'?{ok:true}:{ok:false,error:r.data?.code||'ads_sample_unavailable',status:429}}
export async function hasEscolhaSampleReservation(a,args){const r=await a.rpc('has_ads_escolha_sample',args);return r.data?.code==='ok'}
export async function markEscolhaSampleUpsell(a,args){await a.rpc('upsell_ads_escolha_sample',args);return true}`
function world(over = {}, opts = {}) { return createEscolhaWorld({ [ROOT + 'escolhaSampleServer.ts']: server, ...over }, { current: true, user: USER, ownerId: USER.id, reason: 'none', plan: 'free', balance: 0, ...opts }) }
async function prepared(over = {}, opts = {}) {
  const w = world(over, opts), p = await w.post({ ...escolhaFixture(), sample: true }, false)
  assert.equal(p.status, 201, JSON.stringify(p)); assert.equal(p.body.sample, true); assert.equal(p.body.credits, 0)
  assert.equal(w.effects.filter(e => e[0] === 'debit').length, 0)
  let r
  for (let i = 0; i < 5; i++) { r = await w.post({ stage: 'stills', order_id: p.body.order_id }, false); assert.ok([200, 202].includes(r.status), JSON.stringify(r)); if (r.body.stage === 'choose') break }
  assert.equal(r.body.stage, 'choose'); assert.equal(r.body.stills.length, 2); assert.equal(r.body.max_photo_rounds, 1)
  assert.equal(w.effects.filter(e => e[0] === 'queue').length, 2)
  return { w, p, r }
}
export async function proveEscolhaSampleController(over = {}) {
  const fixture = { ...escolhaFixture(), sample: true }
  for (const reason of ['none', 'subscriber', 'pass', 'partner', 'internal']) {
    const w = world(over, { reason }), r = await w.post(fixture, false)
    assert.equal(r.status, 201, 'every logged-in account may request the personal sample: ' + JSON.stringify(r))
    const reserveIndex = w.effects.findIndex(e => e[0] === 'rpc' && e[1] === 'reserve_ads_escolha_sample')
    assert.ok(reserveIndex >= 0, 'reservation is required before planning'); assert.equal(w.effects.filter(e => e[0] === 'debit').length, 0)
    assert.ok(w.calls.length > 0)
  }
  const loggedOut = world(over, { user: null }); assert.equal((await loggedOut.post(fixture, false)).status, 401)
  const capped = world(over, { rpc: async name => ({ data: { code: name === 'reserve_ads_escolha_sample' ? 'ads_sample_cap' : 'ok' } }) })
  assert.equal((await capped.post(fixture, false)).status, 429); assert.equal(capped.calls.length, 0, 'day cap prevents ALL model calls, not only video')
  assert.equal(capped.effects.filter(e => e[0] === 'queue' || e[0] === 'debit').length, 0)
  const dry = world(over); assert.equal((await dry.post({ ...fixture, dry_run: true }, false)).status, 200); assert.equal(dry.calls.length, 0); assert.equal(dry.tables.ads_v2_orders.length, 0)
  const blocked = world({ ...over, [ROOT + 'escolhaSampleServer.ts']: server.replace('return true}', 'return false}') })
  assert.equal((await blocked.post(fixture, false)).status, 403); assert.equal(blocked.calls.length, 0)
  const { w, p, r } = await prepared(over), id = p.body.order_id, still = r.body.stills[0]
  assert.equal((await w.post({ stage: 'stills', order_id: id, regenerate: true }, false)).status, 429)
  assert.equal((await w.post({ stage: 'render', order_id: id, still_id: 'alien-still' }, false)).status, 400)
  const started = await w.post({ stage: 'render', order_id: id, still_id: still.id }, false)
  assert.equal(started.status, 202, JSON.stringify(started)); const order = w.tables.ads_v2_orders[0]
  assert.equal(order.credits_charged, 0); assert.match(order.billing_ref, /^adssample-escolha-/)
  assert.equal(w.effects.filter(e => e[0] === 'debit').length, 0, 'sample NEVER debits or refunds credits')
  assert.equal((await w.post({ stage: 'render', order_id: id, still_id: still.id }, false)).status, 202)
  assert.equal(w.tables.ads_v2_orders.length, 1, 'render replay does not create a second sample')
  order.status = 'delivered'; order.video_id = '10000000-0000-4000-8000-000000000099'
  const short = await w.post({ stage: 'upgrade', order_id: id }, false)
  assert.equal(short.status, 402, JSON.stringify(short)); assert.equal(short.body.needed, 41)
  assert.equal(w.tables.ads_v2_orders.length, 1, 'no paid order/model effects until sufficient credit')
  assert.ok(w.effects.some(e => e[0] === 'rpc' && e[1] === 'upsell_ads_escolha_sample'))
  w.tables.profiles[0].video_credits = 41
  const paid = await w.post({ stage: 'upgrade', order_id: id }, false)
  assert.equal(paid.status, 202, JSON.stringify(paid)); assert.equal(paid.body.sample, false)
  const next = w.tables.ads_v2_orders.find(o => o.id !== id)
  assert.ok(next); assert.equal(next.credits_charged, 41); assert.equal(next.seconds, 15)
  assert.equal(next.plan.cena.plan.escolha.sample, undefined)
  assert.equal(next.plan.cena.keyframe, order.plan.cena.keyframe)
  assert.equal(next.plan.cena.plan.input.foto, order.plan.cena.plan.input.foto)
  assert.equal(next.plan.cena.plan.escolha.presenterId, order.plan.cena.plan.escolha.presenterId)
  assert.equal(next.plan.cena.plan.escolha.scenarioId, order.plan.cena.plan.escolha.scenarioId)
  assert.equal(w.effects.filter(e => e[0] === 'debit').length, 1)
  const replay = await w.post({ stage: 'upgrade', order_id: id }, false)
  assert.equal(replay.body.order_id, paid.body.order_id); assert.equal(w.effects.filter(e => e[0] === 'debit').length, 1)
  const load = createOfflineLoader({ source: (p, s) => over[p] ?? s }), success = load('lib/growth/checkoutSuccessFlow.ts')
  const url = success.buildSubscriptionCheckoutSuccessUrl({ appUrl: 'https://www.usekineo.com', tier: 'starter', currency: 'usd', amount: 1290, adsSampleOrder: id })
  assert.ok(url.includes('ads_sample_order=' + id)); assert.equal(success.readCheckoutSuccessFlow(new URL(url).searchParams).destination, `/ads/v2?order=${id}&upgrade=1`)
  for (const bad of ['https://evil.example', '//evil.example', '../admin', 'invalid']) assert.equal(success.readCheckoutSuccessFlow(new URLSearchParams({ ads_sample_order: bad })).destination, '/studio')
  assert.equal(w.effects.filter(e => e[0] === 'queue').length, 2, 'upgrade reuses both choices and performs no additional still generation')
}
async function mutants() {
  const cases = [
    [ROOT + 'internalEscolha.ts', 'if (!reservation.ok) return v2Fail(reservation.error, reservation.status)', 'if (false) return v2Fail(reservation.error, reservation.status)'],
    [ROOT + 'internalEscolha.ts', "if (sampleMode && !await escolhaSampleAccountOk(d.admin, user.id))", 'if (false)'],
    [ROOT + 'internalEscolha.ts', 'if (sampleMode && body.regenerate === true)', 'if (false)'],
    ['lib/ads/v2StartCore.ts', 'const charge: AdsV2ChargeResult = sampleRun ?', 'const charge: AdsV2ChargeResult = false ?'],
    [ROOT + 'escolhaSampleUpgrade.ts', 'balance < needed', 'balance < 0'],
    [ROOT + 'escolhaSampleUpgrade.ts', 'const needed = adsV2Credits(\'commercial\', 15)', 'const needed = 40'],
    ['lib/growth/checkoutSuccessFlow.ts', '`/ads/v2?order=${sampleId.toLowerCase()}&upgrade=1`', "'/studio'"],
  ]
  for (const [file, before, after] of cases) {
    const raw = readFileSync(file, 'utf8'); assert.equal(raw.split(before).length, 2, 'unique mutant anchor: ' + before)
    let failed = false
    try { await proveEscolhaSampleController({ [file]: raw.replace(before, after) }) } catch (e) { assert.equal(e.code, 'ERR_ASSERTION', 'mutant must fail a behavioral assertion, not an import/syntax error: ' + before + ': ' + e); failed = true }
    assert.ok(failed, 'mutant survived: ' + before)
  }
  console.log('PASS sample controller: ' + cases.length + ' behavioral mutants rejected; in-memory source undo exact')
}
await proveEscolhaSampleController()
await runEscolhaUiProof({ current: true, scenario: adsSampleUiScenario2410 })
console.log('PASS actual sample controller, free/paid accounts, quota before models, zero debit, result purchase, same reference, replay and checkout return')
if (!process.argv.includes('--no-mutants')) await mutants()
