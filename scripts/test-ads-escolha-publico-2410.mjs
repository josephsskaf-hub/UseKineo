// KINEO-ADS-ESCOLHA-PUBLICO-2410 — raw production controllers/builders, offline boundaries, mutants and exact undo.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { createEscolhaWorld, escolhaFixture } from './test-ads-escolha-2310.mjs'
import { PACING_HOUSE, PACING_ORDER } from './test-support/ads-cena-95-pacing-fixtures-2110.mjs'
import * as Undo from './test-support/desfaz-ads-escolha-publico-2410.mjs'
import { runEscolhaUiProof } from './test-support/ads-escolha-ui-2310.mjs'
import { semTrafego2310 } from './test-support/desfaz-trafego-2310.mjs' // KINEO-TRAFEGO-2310 — exact restoration only inside the historical undo proof; runtime and mutants remain raw.

const F = {
  catalog: 'lib/ads/cena/catalog.ts', core: 'lib/ads/cena/internalEscolha.ts', route: 'app/api/ads/v2/cena/route.ts',
  quota: 'lib/ads/cena/escolhaQuota.ts', events: 'lib/ads/cena/escolhaEvents.ts', stills: 'lib/ads/cena/escolhaStills.ts',
  plan: 'lib/ads/cena/escolhaPlan.ts', layout: 'lib/ads/cena/escolhaCaptionLayout.ts', montage: 'lib/ads/cena/escolhaMontage.ts',
  sql: 'supabase/migrations/20261024035403_ads_escolha_photo_quota.sql', start: 'lib/ads/v2StartCore.ts',
  billing: 'lib/ads/v2Billing.ts', advance: 'lib/ads/v2Advance.ts', notify: 'lib/ads/cena/escolhaNotify.ts', sink: 'app/api/events/route.ts',
}
const USER = { ...PACING_HOUSE, email: 'external-customer@example.org' }
const plain = x => JSON.parse(JSON.stringify(x)), read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const equal = (a, b, message) => assert.deepEqual(plain(a), plain(b), message)
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\r\n/g, '\n')
const world = (over = {}, opts = {}) => createEscolhaWorld(over, { current: true, user: USER, reason: 'subscriber', plan: 'pro', ...opts })
const queues = w => w.effects.filter(e => e[0] === 'queue')
const events = w => w.effects.filter(e => e[0] === 'event' && e[1].name?.startsWith('ads_escolha_')).map(e => e[1])
const noDebit = w => assert.equal(w.effects.filter(e => e[0] === 'debit').length, 0, 'photo planning/preview never debit video credits')
function loader(over = {}, mocks = {}) { return createOfflineLoader({ mocks, globals: { Response, Request, Error, Date }, source: (p, s) => over[p] ?? s }) }
function actualFunction(file, name, bindings, over = {}) {
  const raw = over[file] ?? read(file), ast = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name)
  assert.ok(node, 'actual production function exists: ' + name)
  const source = node.getText(ast).replace(/^export\s+/u, ''), code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  return new Function(...Object.keys(bindings), code + `\nreturn ${name}`)(...Object.values(bindings))
}
async function prepare(over = {}, opts = {}) {
  const w = world(over, opts), p = await w.post(escolhaFixture(), false)
  assert.equal(p.status, 201, JSON.stringify(p))
  let r
  for (let n = 0; n < 6; n++) { r = await w.post({ stage: 'stills', order_id: p.body.order_id }, false); assert.ok([200, 202].includes(r.status), JSON.stringify(r)); if (r.body.stage === 'choose') break }
  assert.equal(r.body.stage, 'choose', 'current public route reaches explicit customer choice')
  return { w, p, r }
}

async function accessProof(over = {}) {
  const c = loader(over)(F.catalog)
  assert.equal(c.ADS_CENA_LIVE, 'public', 'approved rollout switch is public')
  for (const internal of [false, true]) {
    assert.equal(c.cenaEnabled(internal), true, 'public switch admits both house and customers')
    assert.equal(c.cenaEnabled(internal, 'public'), true)
    assert.equal(c.cenaEnabled(internal, 'internal'), internal)
    assert.equal(c.cenaEnabled(internal, 'off'), false)
    assert.equal(c.cenaEnabled(internal, 'invalid'), false)
  }
  for (const [opts, status] of [[{ user: null }, 401], [{ reason: 'none', plan: 'free' }, 403], [{ gate: 'closed' }, 403]]) {
    const w = world(over, opts), r = await w.post(escolhaFixture(), false)
    assert.equal(r.status, status, 'existing login/paywall/closed Studio gate remains authoritative')
    assert.equal(w.calls.length, 0, 'denial happens before any model request'); assert.equal(queues(w).length, 0); noDebit(w)
  }
  for (const reason of ['pass', 'subscriber', 'partner', 'internal']) {
    const w = world(over, { reason }), r = await w.post(escolhaFixture(), false)
    assert.equal(r.status, 201, `current Studio access ${reason} can plan the public choice flow`)
    assert.equal(r.body.plan.voice_mode, 'narrated'); assert.equal(w.tables.ads_v2_orders[0].plan.cena.route, 'kling3')
    noDebit(w)
  }
  const direct = world(over), r = await direct.load(F.core).internalCenaEscolhaFor(USER, escolhaFixture(), { admin: direct.admin, json: direct.json, moderate: async () => true, start: async () => { throw Error('unauthorized') } })
  assert.equal(r.status, 403, 'direct external core caller requires verified Studio access')
  const tamper = world(over), forced = await tamper.post({ ...escolhaFixture(), voice_mode: 'talking', rota: 'seedance2' }, false)
  assert.equal(forced.status, 201); assert.equal(forced.body.plan.voice_mode, 'narrated'); assert.equal(tamper.tables.ads_v2_orders[0].plan.cena.route, 'kling3', 'public request cannot move the approved flow to a different engine')
}

async function eligibilityProof(over = {}) {
  const Q = loader(over)(F.quota), calls = []
  const profile = (data, error = null) => ({
    from(table) {
      assert.equal(table, 'profiles')
      return { select(columns) {
        assert.equal(columns, 'video_credits, plan')
        return { eq(key, id) { calls.push([key, id]); return { maybeSingle: async () => ({ data, error }) } } }
      } }
    },
  })
  for (const balance of [0, 40, -1, 'not-a-number']) {
    const r = await Q.escolhaPhotoEligibility(profile({ video_credits: balance, plan: 'free' }), USER.id)
    assert.equal(r.ok, false, 'insufficient balance cannot purchase free-to-customer photo effects'); assert.equal(r.status, 402); assert.equal(r.needed, 41)
  }
  for (const balance of [41, 42, '41']) assert.equal((await Q.escolhaPhotoEligibility(profile({ video_credits: balance, plan: 'free' }), USER.id)).ok, true)
  assert.equal((await Q.escolhaPhotoEligibility(profile(null, { code: 'offline-failure' }), USER.id)).status, 503, 'profile failure closes the photo gate')
  for (const plan of ['pro', 'business', 'studio']) assert.equal((await Q.escolhaPhotoEligibility(profile({ video_credits: 0, plan }), USER.id)).ok, true, 'existing plan with Studio Ads meets preview eligibility')
  assert.equal((await Q.escolhaPhotoEligibility(profile({ video_credits: 0, plan: 'free' }), USER.id, { ownerPlan: null, reason: 'partner' })).ok, true)
  for (const [balance, plan, reason, expected] of [[40, 'free', 'pass', 402], [41, 'free', 'pass', 202], [0, 'pro', 'subscriber', 202]]) {
    const w = world(over, { balance, plan, reason }), p = await w.post(escolhaFixture(), false)
    assert.equal(p.status, 201); const r = await w.post({ stage: 'stills', order_id: p.body.order_id }, false)
    assert.equal(r.status, expected, JSON.stringify(r)); assert.equal(queues(w).length, expected === 202 ? 4 : 0, 'photo eligibility is enforced on the real staged controller before provider submission'); noDebit(w)
  }
}

async function quotaProof(over = {}) {
  const Q = loader(over)(F.quota), args = { orderId: PACING_ORDER, ownerId: USER.id, actorId: '00000000-0000-4000-8000-000000000099', leaseAt: '2026-10-24T12:00:00.000Z' }
  assert.equal(Q.ESCOLHA_DAILY_PHOTO_ORDERS, 6)
  for (const result of [{ data: { code: 'ok' }, error: null }, { data: [{ code: 'ok' }], error: null }]) {
    const db = { rpc: async (name, sent) => { assert.equal(name, 'reserve_ads_escolha_photos'); equal(sent, { p_order_id: args.orderId, p_owner_id: args.ownerId, p_actor_id: args.actorId, p_lease_at: args.leaseAt }, 'actor/owner/order/lease are derived on the server; browser time cannot alter daily allowance'); return result } }
    assert.equal((await Q.reserveEscolhaPhotos(db, args)).ok, true)
  }
  for (const data of [null, {}, { code: 'unrecognized' }]) assert.equal((await Q.reserveEscolhaPhotos({ rpc: async () => ({ data, error: null }) }, args)).status, 503)
  assert.equal((await Q.reserveEscolhaPhotos({ rpc: async () => ({ data: { code: 'ok' }, error: { code: 'missing-rpc' } }) }, args)).status, 503)
  assert.equal((await Q.reserveEscolhaPhotos({ rpc: async () => { throw Error('offline') } }, args)).status, 503)
  const limit = await Q.reserveEscolhaPhotos({ rpc: async () => ({ data: { code: 'cena_photo_daily_limit', reset_at: '2026-10-25T00:00:00Z' }, error: null }) }, args)
  assert.equal(limit.status, 429); assert.equal(limit.limit, 6); assert.equal(limit.reset_at, '2026-10-25T00:00:00Z')
  for (const [code, status] of [['cena_photo_daily_limit', 429], ['cena_photo_quota_unavailable', 503]]) {
    const w = world(over, { rpc: async () => ({ data: { code }, error: null }) }), p = await w.post(escolhaFixture(), false)
    const r = await w.post({ stage: 'stills', order_id: p.body.order_id }, false)
    assert.equal(r.status, status, JSON.stringify(r)); assert.equal(queues(w).length, 0, 'reservation denial precedes every paid photo boundary'); noDebit(w)
  }
  // This inspects the prepared migration; it does not claim a real Postgres execution or an applied schema.
  const sql = over[F.sql] ?? read(F.sql)
  assert.match(sql, /pg_advisory_xact_lock\([^\n]*p_actor_id/u, 'concurrent requests serialize by authenticated person')
  assert.match(sql, /user_id = p_owner_id for update/u, 'reservation locks the owned order')
  assert.match(sql, /assembly_lease_at is distinct from p_lease_at/u, 'stale worker cannot reserve photos')
  assert.match(sql, /date_trunc\('day', now\(\) at time zone 'UTC'\) at time zone 'UTC'/u, 'day boundary uses the database UTC clock')
  assert.match(sql, /where actor_id = p_actor_id and requested_at >= v_day and requested_at < v_day \+ interval '1 day'/u, 'quota counts people across workspaces and only the same UTC day')
  assert.match(sql, /if v_count >= 6 then/u, 'seventh distinct photo order is denied')
  assert.ok(sql.indexOf('if exists(select 1') < sql.indexOf('select count(*)'), 'same order resumes before counting a new daily reservation')
  assert.match(sql, /primary key \(order_id, request_day\)/u, 'one durable reservation per order and UTC day')
  assert.match(sql, /request_day = \(v_day at time zone 'UTC'\)::date/u, 'a resumed old order consumes one new allowance on a new UTC day')
  assert.match(sql, /enable row level security/u); assert.match(sql, /revoke all on public.ads_escolha_photo_requests from public, anon, authenticated/u)
  assert.match(sql, /revoke all on function public.reserve_ads_escolha_photos\(uuid,uuid,uuid,timestamptz\) from public, anon, authenticated/u)
  assert.match(sql, /grant execute on function[^\n]*to service_role/u)
  assert.match(sql, /revoke all on public.ads_escolha_ready_notices from public, anon, authenticated/u, 'delivery outbox is service-only')
  assert.match(sql, /create trigger ads_escolha_delivery_notice after update of status on public.ads_v2_orders/u, 'the delivery transaction durably queues its notice before application code can crash')
  assert.match(sql, /new\.status = 'delivered' and old\.status is distinct from new\.status/u, 'notice trigger only follows a real terminal transition')
  assert.match(sql, /insert into public\.ads_escolha_ready_notices\(order_id\) values \(new\.id\) on conflict \(order_id\) do nothing/u)
  assert.ok(!/on delete cascade|references public\.ads_v2_orders/iu.test(sql), 'deleting a draft cannot erase the paid photo allowance ledger')
}

async function qualityProof(over = {}) {
  const judge = { score: 93, reasons: ['Product and visible anatomy look good.'], anatomy: { limbs_attached: true, normal_joints: true, five_fingers: null, no_reversed_knees: null, no_reversed_hands: true }, same_face: true, same_outfit: true, product_boxes: [[.2, .59, .7, .8]], face_boxes: [[.35, .12, .65, .3]] }
  const { w, p, r } = await prepare(over, { judge })
  assert.equal(r.body.stills.length, 4)
  for (const j of r.body.stills) { assert.equal(j.score, 93, 'hidden knees/hands retain the visible-quality score'); assert.ok(j.reasons.some(s => s.startsWith('anatomy:unassessed:'))) }
  assert.ok(queues(w).every(q => /CLOSED/iu.test(q[2].prompt)), 'every opening skincare photo asks for a closed jar')
  for (const q of queues(w)) assert.ok(!/applies a small amount|applies? cream to their own face|already open|lid off/iu.test(q[2].prompt), 'still prompt never starts the later skincare opening/application action')
  const chosen = await w.post({ stage: 'choose', order_id: p.body.order_id, still_id: r.body.stills[2].id }, false)
  assert.equal(chosen.status, 200); noDebit(w)
  const stored = w.tables.ads_v2_orders[0].plan
  assert.ok(stored.cena.plan.escolha.captionGrounding, 'the chosen preview keeps its measured geometry')
  equal(stored.cena.plan.escolha.captionGrounding.product, judge.product_boxes, 'selected preview persists the observed product bounds')
  assert.equal(stored.cena.plan.escolha.captionGrounding.imageUrl, stored.cena.keyframe, 'geometry is bound to the exact customer-selected reference')
  const L = w.load(F.layout), grounding = L.parseEscolhaGrounding(judge, stored.cena.keyframe), layout = L.escolhaCaptionLayout(stored.cena.plan.escolha.captionLane, grounding)
  assert.ok(layout, 'an empty interval exists'); assert.notEqual(layout.center, 70, 'product occupying default band relocates captions')
  const half = layout.height / 1920 / 2, y = layout.center / 100
  for (const b of [...judge.product_boxes, ...judge.face_boxes]) assert.ok(y + half <= b[1] - .025 || y - half >= b[3] + .025, 'full caption rectangle avoids observed product/face with clearance')
  for (const invalid of [null, {}, { product_boxes: [[0, 0, 1, 2]] }, { product_boxes: [[.4, .8, .2, .9]] }, { product_boxes: [[0, 0, 1]] }]) assert.equal(L.parseEscolhaGrounding(invalid, 'https://offline.invalid/ref.jpg'), undefined)
  assert.equal(L.escolhaCaptionLayout('bottom'), null, 'unknown geometry never claims a safe guessed lane')
  assert.equal(L.escolhaCaptionLayout('bottom', L.parseEscolhaGrounding({ product_boxes: [[0, 0, 1, 1]] }, stored.cena.keyframe)), null, 'no free interval never covers the product')
  const state = stored.cena
  Object.assign(state, { phase: 'ready', voiceUrl: 'https://offline.invalid/voice.mp3', escolhaMedia: { voice: { status: 'done', seconds: 11 }, music: { status: 'done', url: 'https://offline.invalid/music.mp3' } }, jobs: [{ kind: 'video', index: 0, status: 'done', url: 'https://offline.invalid/video.mp4', seconds: 15, measuredSeconds: 15 }] })
  const source = w.load(F.montage).buildCenaEscolhaMontage(state), captions = source.elements.filter(e => e.track === 40)
  assert.ok(captions.length, 'actual montage draws captions in the observed safe interval')
  for (const e of captions) { assert.equal(parseFloat(e.y), layout.center); assert.equal(e.height, layout.height); assert.ok(e.time + e.duration <= 13); assert.equal(e.stroke_width, 7) }
  const final = source.elements.filter(e => [44, 45, 46].includes(e.track))
  assert.ok(final.length >= 3, 'final name/offer/CTA remain inside the moving scene')
  for (const e of final) {
    const center = parseFloat(e.y) / 100, height = typeof e.height === 'number' ? e.height : String(e.text).split('\n').length * Number(e.font_size) * 1.1
    for (const box of [...judge.product_boxes, ...judge.face_boxes]) assert.ok(center + height / 1920 / 2 <= box[1] - .025 || center - height / 1920 / 2 >= box[3] + .025, 'final copy group also avoids the observed product and face')
    assert.equal(e.time, 13); assert.equal(e.duration, 2)
  }
  for (const copy of [state.plan.product, state.plan.input.oferta, state.plan.input.cta]) assert.ok(final.some(e => String(e.text).replace(/\s+/gu, ' ') === copy), 'product/offer/CTA literal copy survives safe group movement: ' + copy)
  const wrong = plain(state); wrong.keyframe = 'https://offline.invalid/other-preview.jpg'
  assert.equal(w.load(F.montage).buildCenaEscolhaMontage(wrong).elements.filter(e => e.track === 40).length, 0, 'geometry from a different preview is not reused')
  const bad = await prepare(over, { judge: { ...judge, anatomy: { ...judge.anatomy, no_reversed_knees: false } } })
  assert.ok(bad.r.body.stills.every(j => j.score <= 25 && j.reasons.includes('anatomy:no_reversed_knees:false')), 'actual visible bad anatomy remains penalized')
}

async function roundsProof(over = {}) {
  const { w, p, r } = await prepare(over), id = p.body.order_id
  assert.equal(r.body.photo_round, 1); assert.equal(r.body.max_photo_rounds, 2); assert.equal(r.body.can_regenerate, true); assert.equal(queues(w).length, 4)
  const repeat = await w.post({ stage: 'stills', order_id: id }, false)
  assert.equal(repeat.status, 200); assert.equal(queues(w).length, 4, 'poll/reload does not buy another round')
  const second = await w.post({ stage: 'stills', order_id: id, regenerate: true }, false)
  assert.equal(second.status, 202, JSON.stringify(second)); assert.equal(second.body.photo_round, 2)
  let complete
  for (let n = 0; n < 5; n++) { complete = await w.post({ stage: 'stills', order_id: id }, false); if (complete.body.stage === 'choose') break }
  assert.equal(complete.body.stage, 'choose'); assert.equal(complete.body.can_regenerate, false); assert.equal(queues(w).length, 8, 'two requested rounds submit at most eight paid stills')
  assert.equal(new Set(complete.body.stills.map(j => j.id)).size, 4); assert.ok(complete.body.stills.every(j => j.id.startsWith('still-r2-')))
  assert.throws(() => w.load(F.stills).restartEscolhaStills(w.tables.ads_v2_orders[0].plan.cena.plan, w.tables.ads_v2_orders[0].plan.escolhaFlow), /cena_photo_round_limit/, 'round helper also rejects direct third rounds')
  const denied = await w.post({ stage: 'stills', order_id: id, regenerate: true }, false)
  assert.equal(denied.status, 429, JSON.stringify(denied)); assert.equal(denied.body.error, 'cena_photo_round_limit'); assert.equal(queues(w).length, 8); noDebit(w)
  const failures = world(over, { providerFailed: true }), plan = await failures.post(escolhaFixture(), false)
  let failed
  for (let n = 0; n < 9; n++) failed = await failures.post({ stage: 'stills', order_id: plan.body.order_id }, false)
  assert.equal(failed.body.stage, 'failed'); assert.equal(queues(failures).length, 8); assert.equal(failed.body.photo_round, 2); assert.equal(failed.body.can_regenerate, false)
  const third = await failures.post({ stage: 'stills', order_id: plan.body.order_id, regenerate: true }, false)
  assert.equal(third.status, 429); assert.equal(queues(failures).length, 8, 'confirmed provider retries and manual regeneration share the same two-round budget')
}

async function eventsProof(over = {}) {
  const { w, p, r } = await prepare(over), id = p.body.order_id
  await w.post({ stage: 'stills', order_id: id }, false)
  assert.equal(events(w).filter(e => e.name === 'ads_escolha_plan').length, 1)
  assert.equal(events(w).filter(e => e.name === 'ads_escolha_stills_ready').length, 1, 'ready event is a transition, never a poll impression')
  const still = r.body.stills[1].id
  for (let n = 0; n < 2; n++) assert.equal((await w.post({ stage: 'choose', order_id: id, still_id: still }, false)).status, 200)
  assert.equal(events(w).filter(e => e.name === 'ads_escolha_chosen').length, 1, 'replayed customer choice is not another actor')
  const render = await w.post({ stage: 'render', order_id: id, still_id: still }, false)
  assert.equal(render.status, 202, JSON.stringify(render)); assert.equal(w.effects.filter(e => e[0] === 'debit').length, 1)
  await w.post({ stage: 'render', order_id: id, still_id: still }, false)
  assert.equal(events(w).filter(e => e.name === 'ads_escolha_render_started').length, 1, 'render event belongs to the credit/start winner')
  assert.equal(w.effects.filter(e => e[0] === 'debit').length, 1, 'replayed render never debits twice')
  const expected = ['plan', 'stills_ready', 'chosen', 'render_started', 'delivered', 'failed']
  const E = w.load(F.events), stored = w.tables.ads_v2_orders[0].plan, before = events(w).length
  for (const stage of expected) await E.writeEscolhaEvent(stage, USER.id, id, stored, { user_id: 'forged', category: 'forged', scenario_id: 'forged' })
  assert.equal(events(w).length, before + expected.length)
  for (const e of events(w)) { assert.equal(e.userId, USER.id); assert.equal(e.metadata.user_id, USER.id); assert.equal(e.metadata.category, 'skincare'); assert.equal(e.metadata.scenario_id, 'skincare_bathroom'); assert.equal(e.metadata.order_id, id) }
  const count = events(w).length
  assert.equal(await E.writeEscolhaEvent('delivered', USER.id, id, { legacy: true }), false); assert.equal(events(w).length, count, 'legacy jobs do not manufacture a choice funnel')
  assert.match(over[F.billing] ?? read(F.billing), /writeEscolhaEvent\('failed'/u, 'existing refund winner emits the failed funnel transition')
  assert.match(over[F.advance] ?? read(F.advance), /writeEscolhaEvent\('delivered'/u, 'existing delivery winner emits the delivered funnel transition')
}

async function terminalProof(over = {}) {
  const { w } = await prepare(over), row = w.tables.ads_v2_orders[0], stored = row.plan
  w.tables.videos = []; Object.assign(row, { status: 'assembling', billing_ref: 'offline-billing', creatomate_render_id: 'offline-render', video_id: null, credits_charged: 41, assembly_submit_at: new Date().toISOString(), started_at: new Date().toISOString() })
  const notice = [], E = w.load(F.events)
  const deliver = actualFunction(F.advance, 'pollAssembly', {
    pollCreatomateRender: async () => ({ status: 'succeeded', url: 'https://offline.invalid/supplier.mp4', durationSeconds: 15 }),
    persistRenderAssets: async () => ({ videoUrl: 'https://offline.invalid/stored.mp4', thumbnailUrl: null, measuredSeconds: 15 }),
    businessName: () => 'GLOW', ADS_V2_QUALITY: 'ads_v2', randomUUID: () => '00000000-0000-4000-8000-000000000098',
    nowIso: () => new Date().toISOString(), ageMs: () => 1000, ADS_V2_CREATOMATE_MAX_MS: 60_000,
    failAdsV2Order: () => { throw Error('unexpected offline failure') },
    writeEscolhaEvent: E.writeEscolhaEvent, writeServerEvent: async e => w.effects.push(['event', plain(e)]),
    notifyEscolhaDelivered: async (_db, order) => notice.push(plain(order)),
  }, over)
  const original = plain(row)
  await deliver(w.admin, original); await deliver(w.admin, original)
  assert.equal(row.status, 'delivered'); assert.equal(w.tables.videos.length, 1)
  assert.equal(events(w).filter(e => e.name === 'ads_escolha_delivered').length, 1, 'actual terminal delivery winner emits once')
  assert.equal(notice.length, 1, 'actual delivery winner queues exactly one transactional notice')
  assert.equal(notice[0].status, 'delivered'); assert.ok(notice[0].video_id)
  const other = { ...plain(original), status: 'generating', video_id: null, plan: stored }
  Object.assign(row, other); w.tables.videos = []; let refunds = 0
  const fail = actualFunction(F.billing, 'failAdsV2Order', {
    refundAdsV2Confirmed: async () => { refunds++; return { state: 'refunded', amount: 41 } },
    isAdsSampleRef: () => false, writeEscolhaEvent: E.writeEscolhaEvent,
    writeServerEvent: async e => w.effects.push(['event', plain(e)]),
  }, over)
  assert.equal((await fail(w.admin, other, 'offline-provider-failed')).won, true)
  assert.equal((await fail(w.admin, other, 'offline-provider-failed')).won, false)
  assert.equal(refunds, 1, 'actual failed-state winner retains the automatic refund path')
  const failed = events(w).filter(e => e.name === 'ads_escolha_failed')
  assert.equal(failed.length, 1); assert.equal(failed[0].metadata.credits_returned, 41); assert.equal(failed[0].metadata.refund, 'refunded')
  const sink = over[F.sink] ?? read(F.sink), ast = ts.createSourceFile(F.sink, sink, ts.ScriptTarget.Latest, true)
  const declaration = ast.statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(ast) === 'SERVER_ONLY_EVENTS'))
  assert.ok(declaration)
  const values = new Function(declaration.getText(ast) + ';return SERVER_ONLY_EVENTS')()
  for (const name of ['plan', 'stills_ready', 'chosen', 'render_started', 'delivered', 'failed', 'ready_email_sent']) assert.ok(values.has('ads_escolha_' + name), 'browser event sink refuses forged choice funnel state: ' + name)
}

async function noticeProof(over = {}) {
  const { w } = await prepare(over), row = { ...w.tables.ads_v2_orders[0], status: 'delivered', language: 'pt', video_id: '00000000-0000-4000-8000-000000000098' }
  function noticeWorld(options = {}) {
    const notices = [], sent = [], writes = [], event = []; let claims = 0
    const db = {
      auth: { admin: { getUserById: async id => { assert.equal(id, USER.id); return { data: { user: { email: USER.email } }, error: null } } } },
      from(table) {
        let insert, change, single = false; const filters = []
        const q = {
          select() { return q }, upsert(v) { insert = v; return q }, update(v) { change = v; return q },
          eq(k, v) { filters.push(r => r[k] === v); return q }, is(k, v) { filters.push(r => (r[k] ?? null) === v); return q },
          or() { filters.push(r => !r.claimed_at || Date.parse(r.claimed_at) < Date.now() - 5 * 60_000); return q },
          async execute() {
            if (table === 'profiles') return { data: { email_opted_out: options.optOut === true }, error: null }
            assert.equal(table, 'ads_escolha_ready_notices')
            if (insert && !notices.some(r => r.order_id === insert.order_id)) notices.push({ ...insert, claimed_at: null, sent_at: null, closed_at: null })
            const rows = notices.filter(r => filters.every(f => f(r)))
            if (change) for (const r of rows) { Object.assign(r, change); writes.push(plain(change)) }
            return { data: single ? plain(rows[0] ?? null) : plain(rows), error: null }
          },
          maybeSingle() { single = true; return q.execute() }, then(a, b) { return q.execute().then(a, b) },
        }; return q
      },
    }
    const run = actualFunction(F.notify, 'notifyEscolhaDelivered', {
      escolhaOf: w.load(F.stills).escolhaOf, isUuid: v => typeof v === 'string' && /^[0-9a-f-]{36}$/u.test(v), process: { env: options.noKey ? {} : { RESEND_API_KEY: 'offline-fixture-only' } },
      claimEmailSlot: async () => { claims++; return { allowed: options.allowed !== false } }, recordResendResponse: async () => {},
      emailFooterText: () => '\nOffline footer', unsubscribeHeaders: () => ({}), writeServerEvent: async e => event.push(plain(e)),
      AbortSignal: { timeout: () => null }, fetch: async (url, request) => { assert.equal(url, 'https://api.resend.com/emails'); sent.push(plain(request)); return { ok: options.sendFailure !== true } },
    }, over)
    return { run: order => run(db, order), notices, sent, writes, event, claims: () => claims }
  }
  for (const invalid of [{ ...row, status: 'generating' }, { ...row, video_id: null }, { ...row, plan: { legacy: true } }]) { const n = noticeWorld(); assert.equal(await n.run(invalid), false); assert.equal(n.sent.length, 0); assert.equal(n.notices.length, 0, 'only delivered choice orders enter the notice outbox') }
  const missing = noticeWorld({ noKey: true }); assert.equal(await missing.run(row), false); assert.equal(missing.notices.length, 1); assert.equal(missing.sent.length, 0, 'missing mail config preserves a retryable notice without sending')
  const optedOut = noticeWorld({ optOut: true }); assert.equal(await optedOut.run(row), false); assert.equal(optedOut.sent.length, 0); assert.ok(optedOut.notices[0].closed_at, 'opt out closes the notice without external contact')
  const blocked = noticeWorld({ allowed: false }); assert.equal(await blocked.run(row), false); assert.equal(blocked.sent.length, 0, 'existing email quota remains authoritative')
  for (const language of ['pt', 'en']) {
    const n = noticeWorld(); assert.equal(await n.run({ ...row, language }), true)
    n.notices[0].claimed_at = new Date(Date.now() - 6 * 60_000).toISOString()
    assert.equal(await n.run({ ...row, language }), false, 'closed sent notice remains closed even after its claim expires')
    assert.equal(n.sent.length, 1, 'replayed delivery cannot send twice')
    assert.equal(n.sent[0].headers['Idempotency-Key'], 'ads-escolha-ready-' + row.id)
    const body = JSON.parse(n.sent[0].body)
    assert.equal(body.to, USER.email); assert.equal(body.from, 'Kineo <hello@usekineo.com>'); assert.match(body.text, new RegExp('https://www\\.usekineo\\.com/ads/v2\\?order=' + row.id, 'u'))
    assert.equal(body.subject, language === 'pt' ? 'Seu anúncio está pronto' : 'Your ad is ready'); assert.ok(n.notices[0].sent_at); assert.ok(n.notices[0].closed_at); assert.equal(n.event.length, 1)
  }
  const retried = [], lookup = [{ ...row }, { ...row, id: '00000000-0000-4000-8000-000000000099', status: 'generating' }]
  const retryDb = { from(table) {
    const filters = [], q = {
      select() { return q }, is(k, value) { assert.equal(table, 'ads_escolha_ready_notices'); assert.equal(k, 'closed_at'); assert.equal(value, null); return q },
      gte(k) { assert.equal(k, 'delivered_at'); return q }, order(k, value) { assert.equal(k, 'claimed_at'); assert.equal(value.nullsFirst, true); return q }, limit(n) { assert.equal(n, 6); return q },
      eq(k, value) { filters.push(r => r[k] === value); return q },
      async maybeSingle() { return { data: lookup.find(r => filters.every(f => f(r))) ?? null, error: null } },
      then(a, b) { assert.equal(table, 'ads_escolha_ready_notices'); return Promise.resolve({ data: lookup.map(r => ({ order_id: r.id })), error: null }).then(a, b) },
    }; return q
  } }
  const retry = actualFunction(F.notify, 'retryEscolhaNotices', { notifyEscolhaDelivered: async (_db, order) => retried.push(order) }, over)
  await retry(retryDb, Date.now() + 60_000)
  assert.equal(retried.length, 1); assert.equal(retried[0].status, 'delivered', 'retry outbox never emails a still-generating order')
}

async function uiProof(over = {}) {
  return runEscolhaUiProof({ current: true, source: (text, file) => over[file] ?? text, scenario: async ({ client, read: uiRead, check, nodeText, compile }) => {
    for (const lang of ['pt', 'en']) {
      const ui = client({ lang, internalControls: false }); ui.render()
      check(ui.requests.length === 0, 'public UI only acts on explicit customer click')
      const text = ui.nodes().map(nodeText).join(' ')
      check(text.includes('~10 min') && (lang === 'pt' ? text.includes('e-mail') : text.includes('email')), 'PT/EN shows estimated time and delivery notice')
      check(ui.nodes().filter(n => n.type === 'input' && n.props.name === 'ace-person').length >= 4, 'public UI offers curated person previews')
      check(ui.nodes().filter(n => n.type === 'img').length >= 5, 'public UI displays person and scenario preview images')
      check(!ui.nodes().some(n => n.type === 'option' && ['seedance2', 'veo31'].includes(n.props.value)), 'public UI keeps approved narrated Kling flow')
      ui.responses.push([201, { order_id: PACING_ORDER, stage: 'planned', credits: 41 }]); await ui.click(lang === 'pt' ? 'Confirmar escolhas' : 'Confirm choices')
      assert.equal(ui.requests[0].body.rota, 'kling3'); assert.equal(ui.requests[0].body.voice_mode, 'narrated')
      const plannedText = ui.nodes().map(nodeText).join(' ')
      check(plannedText.includes('41') && (lang === 'pt' ? plannedText.includes('grátis') : plannedText.includes('free')), 'UI separates free previews from the canonical 41-credit render')
      const stills = [1, 2, 3, 4].map(n => ({ id: 'still-' + n, url: `https://offline.invalid/${n}.png` }))
      ui.responses.push([200, { order_id: PACING_ORDER, stage: 'choose', stills, photo_round: 1, max_photo_rounds: 2, can_regenerate: true }]); await ui.click(lang === 'pt' ? 'Preparar quatro' : 'Prepare four')
      check(!ui.requests.some(r => r.body?.stage === 'render'), 'previews never start an automatic video')
      ui.responses.push([202, { order_id: PACING_ORDER, stage: 'stills', photo_round: 2, max_photo_rounds: 2 }]); await ui.click(lang === 'pt' ? 'Preparar outra rodada' : 'Prepare another free round')
      assert.equal(ui.requests.at(-1).body.regenerate, true, 'second round is an explicit request')
      ui.responses.push([200, { order_id: PACING_ORDER, stage: 'choose', stills, photo_round: 2, max_photo_rounds: 2, can_regenerate: false }]); await ui.poll()
      check(!ui.nodes().some(n => n.type === 'button' && /Preparar outra rodada|Prepare another free round/u.test(nodeText(n))), 'UI removes another-round action after the second round')
    }
    const stills = [1, 2, 3, 4].map(n => ({ id: 'still-' + n, url: `https://offline.invalid/${n}.png`, reasons: ['PRIVATE_TECHNICAL_NOTE'] }))
    const locked = client({ internalControls: false }); locked.render()
    locked.responses.push([201, { order_id: PACING_ORDER, stage: 'planned', narration_used: 'Fala aprovada.', quality_notes: [{ message: 'PRIVATE_TECHNICAL_NOTE' }] }]); await locked.click('Confirmar escolhas')
    locked.responses.push([200, { order_id: PACING_ORDER, stage: 'choose', stills, photo_round: 1, max_photo_rounds: 2 }]); await locked.click('Preparar quatro')
    check(!locked.nodes().map(nodeText).join(' ').includes('PRIVATE_TECHNICAL_NOTE'), 'public UI hides internal model diagnostics and review reasons')
    locked.nodes().find(n => n.type === 'input' && n.props.name === 'ace-still' && n.props.value === 'still-2').props.onChange(); locked.render()
    locked.responses.push([402, { error: 'out_of_credits', stage: 'chosen', selected_still_id: 'still-2', stills, photo_round: 1 }]); await locked.click('Gerar vídeo com esta foto')
    check(locked.nodes().filter(n => n.type === 'input' && n.props.name === 'ace-still').every(n => n.props.disabled), 'render credit failure keeps the server-locked selected photo')
    check(!locked.nodes().some(n => n.type === 'button' && /Preparar outra rodada/u.test(nodeText(n))), 'server-locked choice cannot request another photo round after a credit failure')
    check(locked.states[4] === 'still-2' && locked.nodes().map(nodeText).join(' ').includes('41'), 'credit failure preserves exact selected reference and explains the required balance')
    const failed = client({ internalControls: false }); failed.render()
    failed.responses.push([201, { order_id: PACING_ORDER, stage: 'planned' }]); await failed.click('Confirmar escolhas')
    failed.responses.push([200, { order_id: PACING_ORDER, stage: 'failed', reason: 'cena_preview_provider_failed', photo_round: 1, max_photo_rounds: 2 }]); await failed.click('Preparar quatro')
    check(failed.nodes().some(n => n.type === 'button' && /Tentar outra rodada grátis/u.test(nodeText(n))), 'first-round technical failure exposes the authorized second round')
    failed.responses.push([429, { error: 'cena_photo_daily_limit', reason_detail: 'PRIVATE_TECHNICAL_NOTE' }]); await failed.click('Tentar outra rodada grátis')
    check(failed.states[1] === 'failed' && failed.nodes().some(n => n.type === 'button' && /Tentar outra rodada grátis/u.test(nodeText(n))), 'quota denial while retrying preserves the failed-photo recovery state')
    check(!failed.nodes().map(nodeText).join(' ').includes('PRIVATE_TECHNICAL_NOTE') && failed.nodes().map(nodeText).join(' ').includes('seis pedidos'), 'daily limit is explained in customer language')
    const simple = uiRead('app/(dashboard)/ads/v2/AdsV2Simple.tsx'), ast = ts.createSourceFile('simple.tsx', simple, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const wrapper = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'AdsV2SimpleSession'), module = { exports: {} }, choice = () => null, legacy = () => null
    new Function('require', 'module', 'exports', 'AdsV2Escolha', 'AdsV2SimpleLegacySession', compile(wrapper.getText(ast), 'simple.tsx'))(name => { if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) }; throw Error('unexpected UI require ' + name) }, module, module.exports, choice, legacy)
    const props = { escolhaInternal: true, escolhaOwnerKey: 'actor:owner', escolhaTestControls: false, lang: 'pt' }
    assert.equal(module.exports.AdsV2SimpleSession(props).type, choice, 'enabled paid Studio customer enters the choice flow by default')
    assert.equal(module.exports.AdsV2SimpleSession({ ...props, sample: true }).type, legacy, 'free sample never bypasses the current Studio paywall into paid choice effects')
    assert.equal(module.exports.AdsV2SimpleSession({ ...props, escolhaInternal: false }).type, legacy, 'off keeps the entire legacy component available')
  } })
}

async function undoProof() {
  // KINEO-TRAFEGO-2310 — merging main on 24/10 preserves the Public2410 delivery's immutable inventory and hashes.
  // The current public routes/builders/UI and assertion-killed mutants above still read the real integrated source.
  const delivery = 'f6ddd3f4f48384a9b78a0228147f1cdeea5d410f'
  const currentMain = 'dd0abba8cc711be4bde2faaac39f0aef29f3f90d'
  const manifestPath = 'scripts/test-support/desfaz-ads-escolha-publico-2410-fontes.json'
  const table = JSON.parse(read('scripts/test-support/desfaz-ads-escolha-publico-2410-fontes.json'))
  equal(table, JSON.parse(git('show', `${currentMain}:${manifestPath}`)), 'Public2410 manifest is unchanged from the reviewed current main; never recaptured from the merge')
  const hash = s => createHash('sha256').update(s).digest('hex')
  assert.equal(Undo.ADS_ESCOLHA_PUBLICO_BASE, '07f1da96cdfdf69ade9e5514d0c4c524cb8b2294')
  assert.ok(Undo.ADS_ESCOLHA_PUBLICO_FILES.length >= 12, 'exact undo manifest covers the complete public layer')
  for (const file of Undo.ADS_ESCOLHA_PUBLICO_FILES) {
    const integrated = read(file), raw = semTrafego2310(integrated, file), before = git('show', `${Undo.ADS_ESCOLHA_PUBLICO_BASE}:${file}`), item = table.sources[file]
    const mainSource = git('show', `${currentMain}:${file}`)
    assert.equal(hash(mainSource), item.afterHash, 'reviewed current main still matches the immutable Public2410 source manifest: ' + file)
    assert.equal(raw, mainSource, 'exact Trafego removal preserves the complete current-main Public2410 source: ' + file)
    assert.equal(item.before, before); assert.equal(item.beforeHash, hash(before)); assert.equal(item.afterHash, hash(raw))
    assert.ok(raw.includes(Undo.ADS_ESCOLHA_PUBLICO_MARK), 'every modified exact source identifies the public layer: ' + file)
    assert.equal(Undo.semAdsEscolhaPublico2410(integrated, file), before, 'integrated Trafego then Public2410 chain restores exact base bytes: ' + file)
    assert.equal(Undo.semAdsEscolhaPublico2410(integrated.replace(/\n/g, '\r\n'), file), before.replace(/\n/g, '\r\n'), 'integrated chain preserves CRLF: ' + file)
    assert.equal(Undo.semAdsEscolhaPublico2410(raw, file), before, 'exact base bytes restored: ' + file)
    assert.equal(Undo.semAdsEscolhaPublico2410(before, file), before, 'idempotent: ' + file)
    assert.equal(Undo.semAdsEscolhaPublico2410(raw.replace(/\n/g, '\r\n'), file), before.replace(/\n/g, '\r\n'), 'CRLF: ' + file)
    assert.throws(() => Undo.semAdsEscolhaPublico2410(raw + '\n// divergent current source\n', file), /fonte divergente/, 'integrity mutant: ' + file)
    assert.notEqual(Undo.semAdsEscolhaPublico2410(raw.replaceAll(Undo.ADS_ESCOLHA_PUBLICO_MARK, 'REMOVED'), file), before, 'missing marker cannot certify a restore: ' + file)
  }
  for (const file of Undo.ADS_ESCOLHA_PUBLICO_NEW) { assert.ok(readFileSync(file).length > 0); assert.throws(() => git('show', `${Undo.ADS_ESCOLHA_PUBLICO_BASE}:${file}`)) }
  for (const file of Undo.ADS_ESCOLHA_PUBLICO_ARTIFACTS) { assert.ok(file.startsWith('docs/')); assert.ok(readFileSync(file).length > 0); assert.ok(git('show', `${Undo.ADS_ESCOLHA_PUBLICO_BASE}:${file}`)) }
  const actual = git('diff', '--name-only', Undo.ADS_ESCOLHA_PUBLICO_BASE, delivery).trim().split('\n').filter(Boolean)
  equal([...Undo.ADS_ESCOLHA_PUBLICO_FILES, ...Undo.ADS_ESCOLHA_PUBLICO_NEW, ...Undo.ADS_ESCOLHA_PUBLICO_ARTIFACTS].sort(), actual.sort(), 'complete immutable Public2410 delivery inventory; later Trafego and main layers have their own current-source guardians')
  assert.equal(Undo.semAdsEscolhaPublico2410('unrelated\n', 'lib/unrelated.ts'), 'unrelated\n')
}

async function mutant(name, file, from, to, proof) {
  const original = read(file)
  assert.equal(original.split(from).length - 1, 1, 'unique mutant anchor: ' + name)
  const changed = original.replace(from, to)
  if (/\.tsx?$/u.test(file)) { const ast = ts.createSourceFile(file, changed, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS); assert.equal(ast.parseDiagnostics.length, 0, 'mutant must parse: ' + name) }
  let error
  try { await proof({ [file]: changed }) } catch (e) { error = e }
  assert.equal(error?.code, 'ERR_ASSERTION', `mutant must die at an assertion, never at import/mock failure: ${name}: ${error?.stack ?? 'SURVIVED'}`)
  console.log('ok public mutant ' + name)
}

for (const [name, proof] of Object.entries({ accessProof, eligibilityProof, quotaProof, qualityProof, roundsProof, eventsProof, terminalProof, noticeProof, uiProof })) { await proof(); console.log('ok public ' + name) }
const mutants = [
  ['public remains house only', F.catalog, "flag === 'public'", 'false', accessProof],
  ['free bypasses Studio gate', F.route, "if (gate !== 'ok')", 'if (false)', accessProof],
  ['low balance buys free photos', F.quota, 'balance >= needed', 'balance >= 0', eligibilityProof],
  ['forty-one is rejected', F.quota, 'balance >= needed', 'balance > needed', eligibilityProof],
  ['unknown RPC opens paid boundary', F.quota, "if (r.error || !row || !['ok', 'cena_photo_daily_limit'].includes(row.code))", "if (false)", quotaProof],
  ['daily cap grows to seven', F.sql, 'if v_count >= 6 then', 'if v_count >= 7 then', quotaProof],
  ['quota serializes by workspace owner', F.sql, "'ads-escolha:' || p_actor_id::text", "'ads-escolha:' || p_owner_id::text", quotaProof],
  ['hidden knee caps score', F.stills, 'if (unknown.length) reasons.push', 'if (unknown.length) score = Math.min(score, 25); if (unknown.length) reasons.push', qualityProof],
  ['grounding from another chosen image', F.stills, 'captionGrounding = j.grounding', 'captionGrounding = undefined', qualityProof],
  ['caption returns to default product band', F.layout, 'center: centers[0] * 100', 'center: 70', qualityProof],
  ['final copy stays over the product', F.montage, 'return elements.map(e => ({ ...e, y:', 'return elements.map(e => ({ ...e, ignored_y:', qualityProof],
  ['third manual photo round allowed', F.stills, 'escolhaPhotoRound(flow) >= ESCOLHA_PHOTO_ROUNDS', 'false', roundsProof],
  ['retry budget ignores spent automatic round', F.stills, 'flow.round === 2 || flow.stills.some(j => j.attempt >= 2)', 'false', roundsProof],
  ['event metadata trusts supplied category', F.events, 'category: p.cena.plan.category', "category: 'forged'", eventsProof],
  ['choice event repeated by polling', F.core, 'if (!wasChosen) await writeEscolhaEvent', 'if (true) await writeEscolhaEvent', eventsProof],
  ['delivered event removed from actual winner', F.advance, "await writeEscolhaEvent('delivered', order.user_id, order.id, order.plan, { video_id: videoId })", 'void videoId', terminalProof],
  ['failed event removed from actual refund winner', F.billing, "await writeEscolhaEvent('failed', order.user_id, order.id, won.data.plan, { reason: reason.slice(0, 300), refund, credits_returned: amount })", 'void amount', terminalProof],
  ['transactional notice ignores closed claim', F.notify, ".eq('order_id', order.id).is('closed_at', null)", ".eq('order_id', order.id)", noticeProof],
  ['retry outbox emails a still-generating order', F.notify, ".eq('status', 'delivered')", '', noticeProof],
  ['browser can forge delivered funnel event', F.sink, "  'ads_escolha_delivered',", '', terminalProof],
  ['free sample mounts paid photos', 'app/(dashboard)/ads/v2/AdsV2Simple.tsx', ' && !props.sample', '', uiProof],
  ['UI forgets second photo round flag', 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx', '...(regenerate ? { regenerate: true } : {})', '...{}', uiProof],
  ['UI unlocks still radios after credit failure', 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx', 'disabled={!!busy || choiceLocked ||', 'disabled={!!busy ||', uiProof],
  ['UI leaks internal judge reasons', 'app/(dashboard)/ads/v2/AdsV2Escolha.tsx', 'internalControls && s.reasons?.length', 's.reasons?.length', uiProof],
]
for (const m of mutants) await mutant(...m)
await undoProof()
console.log(`ok public: ${mutants.length} assertion-killed mutants; exact undo; raw routes/builders, no network or paid calls; SQL inspected only`)
