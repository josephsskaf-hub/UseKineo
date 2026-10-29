// KINEO-AMOSTRA-ANUNCIO-K4-2910 — real controllers/runtime + embedded SQL, entirely offline.
// Optional --workspace <path> reads another checkout; --pglite-module <path> uses an installed test dependency.
// No source edits, .env, credentials or provider calls.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createEscolhaWorld, escolhaFixture } from './test-ads-escolha-2310.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { createRequire } from 'node:module'

const workspaceArg = process.argv.indexOf('--workspace')
if (workspaceArg >= 0) process.chdir(process.argv[workspaceArg + 1])
const pgliteArg = process.argv.indexOf('--pglite-module')
const { PGlite } = createRequire(import.meta.url)(pgliteArg >= 0 ? process.argv[pgliteArg + 1] : '@electric-sql/pglite')
const ROOT = 'lib/ads/cena/', USER = { id: '10000000-0000-4000-8000-000000000001', email: 'external@example.org' }
const plain = value => JSON.parse(JSON.stringify(value))
const same = (a, b, why) => assert.deepEqual(plain(a), plain(b), why)
const forbidden = name => () => { assert.fail('Offline forbidden boundary: ' + name) }
const promo = Object.fromEntries(['reserveKling4Promo', 'validateKling4PromoStart', 'verifyKling4PromoReservation', 'recordKling4PaidUse'].map(name => [name, forbidden(name)]))
const promoSource = Object.keys(promo).map(name => `export function ${name}(){throw new Error('Forbidden sample promo: ${name}')}`).join('\n')
const sampleBoundary = `
export async function escolhaSampleAccountOk(){return true}
export async function reserveEscolhaSample(admin,args){const r=await admin.rpc('reserve_ads_escolha_sample',args);return r.data.code==='ok'?{ok:true}:{ok:false,error:r.data.code,status:r.data.code==='ads_sample_used'?409:429}}
export async function hasEscolhaSampleReservation(admin,args){const r=await admin.rpc('has_ads_escolha_sample',args);return r.data.code==='ok'}
export async function markEscolhaSampleUpsell(){throw new Error('Unexpected upgrade')}`

async function controller(live, reason = 'subscriber') {
  const claims = new Map()
  const policyPath = 'lib/kling4PaidPolicy.ts'
  const policy = readFileSync(policyPath, 'utf8').replace("process.env.KLING4_PAID_LIVE === 'true'", String(live))
  const w = createEscolhaWorld({
    [policyPath]: policy,
    [ROOT + 'escolhaSampleServer.ts']: sampleBoundary,
    'lib/kling4PromoServer.ts': promoSource,
  }, { current: true, user: USER, ownerId: USER.id, reason, plan: reason === 'subscriber' ? 'creator' : 'free', balance: 0,
    rpc: async (name, args) => {
      assert.ok(['reserve_ads_escolha_sample', 'has_ads_escolha_sample'].includes(name), 'no promo or credit RPC: ' + name)
      const claim = claims.get(args.actorId)
      if (name === 'has_ads_escolha_sample') return { data: { code: claim === args.orderId ? 'ok' : 'missing' } }
      if (claim && claim !== args.orderId) return { data: { code: 'ads_sample_used' } }
      claims.set(args.actorId, args.orderId); return { data: { code: 'ok' } }
    },
  })
  // The client deliberately asks for another engine; the server still decides the sample route.
  const body = { ...escolhaFixture('en'), sample: true, rota: live ? 'kling3' : 'kling4' }
  const planned = await w.post(body, false)
  assert.equal(planned.status, 201, JSON.stringify(planned))
  const route = live ? 'kling4' : 'kling3', id = planned.body.order_id
  assert.equal(planned.body.engine_used, route); assert.equal(planned.body.credits, 0)
  assert.equal(w.tables.ads_v2_orders[0].plan.cena.route, route)
  let stills
  for (let i = 0; i < 5; i++) { stills = await w.post({ stage: 'stills', order_id: id }, false); if (stills.body.stage === 'choose') break }
  assert.equal(stills.body.stage, 'choose', JSON.stringify(stills)); assert.equal(stills.body.stills.length, 2)
  assert.equal((await w.post({ stage: 'stills', order_id: id, regenerate: true }, false)).status, 429)
  const selected = stills.body.stills[1]
  const started = await w.post({ stage: 'render', order_id: id, still_id: selected.id, kling4_expect_promo: true, kling4_expected_engine: route }, false)
  assert.equal(started.status, 202, JSON.stringify(started)); assert.equal(started.body.credits, 0)
  assert.equal(started.body.kling4_promo, false); assert.equal(started.body.notice, undefined)
  const order = w.tables.ads_v2_orders[0]
  assert.equal(order.credits_charged, 0); assert.match(order.billing_ref, /^adssample-escolha-/)
  assert.equal(order.plan.cena.keyframe, selected.url)
  assert.equal((await w.post({ stage: 'render', order_id: id, still_id: selected.id }, false)).status, 202)
  assert.equal(w.effects.filter(e => e[0] === 'debit').length, 0)
  assert.equal(w.effects.filter(e => e[0] === 'queue').length, 2, 'only the two allowed stills, no duplicate effects')
  return { w, order: plain(order) }
}

function memoryDb(tables, effects) {
  return {
    auth: { admin: { getUserById: async () => ({ data: { user: USER }, error: null }) } },
    rpc: forbidden('runtime RPC'),
    from(table) {
      let change, filters = [], single = false
      const q = {
        select() { return q }, update(value) { change = plain(value); return q },
        eq(key, value) { filters.push(row => row[key] === value); return q },
        is(key, value) { filters.push(row => (row[key] ?? null) === value); return q },
        in(key, values) { filters.push(row => values.includes(row[key])); return q },
        async execute() {
          const rows = (tables[table] ?? []).filter(row => filters.every(test => test(row)))
          if (change) for (const row of rows) Object.assign(row, plain(change))
          effects.push(['db', table, change ?? null])
          return { data: plain(single ? rows[0] ?? null : rows), error: null }
        },
        maybeSingle() { single = true; return q.execute() },
        then(a, b) { return q.execute().then(a, b) },
      }
      return q
    },
  }
}

async function mediaAndRuntime(order) {
  const effects = [], row = plain(order), tables = { ads_v2_orders: [row], videos: [] }
  const admin = memoryDb(tables, effects)
  const mocks = {
    '@/lib/openai': { openai: {} },
    '@/lib/kling4PromoServer': promo,
    '@/lib/kling4PromoCarry': { ensureKling4PromoBudgetToday: forbidden('promo carry') },
    '@/lib/ads/kling4Voice': { assertKling4AdVoiceText() {}, synthesizeKling4AdVoice: async () => { effects.push(['voice']); return Buffer.from('audio') } },
    '@/lib/avatar/voice': { TTS_28_MODEL: 'offline-model', voiceInputFor: value => value },
    '@/lib/ttsFallback': { ttsFallbackInput: text => ({ text }), synthesizeTtsFallback: async () => { effects.push(['voice']); return Buffer.from('audio') } },
    '@/lib/serverEvents': { writeServerEvent: async () => {} },
    '@/lib/credits/renderIntent': { recordRenderIntent: forbidden('credit intent') },
    '@/lib/credits/debit': { debitVideoCredits: forbidden('credit debit') },
    '@/lib/credits/refund': { refundRenderCredits: forbidden('credit refund for free sample') },
    '../v2Images': { persistSceneImage: forbidden('extra image') },
    '../v2Shots': {
      submitShotOnce: async (endpoint, input) => { effects.push(['video', endpoint, plain(input)]); return { kind: 'accepted', requestId: 'accepted-once' } },
      pollFalJob: async (_endpoint, receipt) => { effects.push(['poll', receipt]); return { state: 'pending', url: null } },
      persistShotClip: forbidden('unexpected clip copy'),
    },
    '@/lib/compose': { CreatomateSubmitError: class extends Error {}, estimateMp3DurationSeconds: () => 7,
      uploadVoiceoverToSupabase: async () => 'https://offline.example/voice.mp3', submitCreatomateRender: forbidden('unexpected montage') },
    '@/lib/lyriaMusic': { submeterLyria: forbidden('paid music'), lyriaPromptFor: forbidden('paid music'), esperarLyria: forbidden('paid music') },
  }
  const load = createOfflineLoader({ mocks, globals: { Error } })
  const state = row.plan.cena, builder = load(ROOT + 'escolhaVideo.ts')
  const request = builder.escolhaVideoRequests(state.plan, state.route, state.keyframe)[0]
  assert.equal(request.seconds, 8); assert.equal(request.keepSeconds, 8); assert.equal(request.offsetSeconds, 0)
  assert.equal(request.input.start_image_url, state.keyframe)
  if (state.route === 'kling4') {
    assert.equal(request.endpoint, 'kling/v4/image-to-video'); assert.equal(request.input.duration, 8)
    assert.equal(request.input.resolution, '720p'); same(request.input.multi_prompt.map(s => s.duration), [3, 3, 2])
    for (const unsupported of ['generate_audio', 'aspect_ratio', 'image_url']) assert.equal(unsupported in request.input, false)
  } else {
    assert.equal(request.input.duration, '8'); assert.equal(request.input.generate_audio, false)
    same(request.input.multi_prompt.map(s => s.duration), ['3', '3', '2'])
  }
  const full = load(ROOT + 'escolhaPlan.ts').fullEscolhaPlan(state.plan)
  const paidRequest = builder.escolhaVideoRequests(full, state.route, state.keyframe)[0]
  assert.equal(paidRequest.seconds, 15); assert.equal(Number(paidRequest.input.duration), 15, 'paid path retains full duration')
  for (const route of ['veo31', 'seedance2']) assert.throws(() => builder.escolhaVideoRequests(state.plan, route, state.keyframe), /sample_requires/)
  const talking = plain(state.plan); talking.voice_mode = talking.input.voice_mode = 'talking'
  assert.throws(() => builder.escolhaVideoRequests(talking, state.route, state.keyframe), /sample_requires/)
  const runtime = load(ROOT + 'runtime.ts')
  await runtime.advanceCenaOrder(admin, plain(row), Date.now() + 60_000)
  assert.equal(effects.filter(e => e[0] === 'voice').length, 1)
  assert.equal(effects.filter(e => e[0] === 'video').length, 1)
  assert.equal(row.plan.cena.jobs[0].requestId, 'accepted-once')
  await runtime.advanceCenaOrder(admin, plain(row), Date.now() + 60_000)
  assert.equal(effects.filter(e => e[0] === 'video').length, 1, 'poll path keeps original accepted request')
  assert.ok(effects.some(e => e[0] === 'poll' && e[1] === 'accepted-once'))
  assert.equal(effects.filter(e => e[0] === 'voice').length, 1, 'sample never buys another narration')
  const finished = plain(row.plan.cena); finished.phase = 'ready'
  finished.jobs[0].status = 'done'; finished.jobs[0].url = 'https://offline.example/result.mp4'; finished.jobs[0].measuredSeconds = 8
  const montage = load(ROOT + 'escolhaMontage.ts').buildCenaEscolhaMontage(finished)
  assert.equal(montage.duration, 8); assert.equal(montage.width / montage.height, 9 / 16)
  assert.ok(montage.elements.some(e => e.text === 'usekineo.com' && e.duration === 8 && e.opacity === '100%'))
  assert.ok(montage.elements.filter(e => e.type === 'video').every(e => e.volume === '0%'))
  const refund = await load('lib/ads/v2Billing.ts').failAdsV2Order(admin, row, 'offline confirmed video failure')
  same(refund, { won: true, refund: 'skipped', amount: 0 }, 'free sample never mints a refund credit')
  assert.equal(row.status, 'failed')
  // A too-long measured voice fails once, before any video; no second paid TTS attempt.
  const tooLong = plain(order.plan.cena); let voices = 0
  const media = load(ROOT + 'escolhaMedia.ts')
  const deps = { now: () => 1, save: async () => {}, synthesize: async () => { voices++; return { audio: 'x', seconds: 9 } }, upload: forbidden('long voice upload'), submitMusic: forbidden('paid music'), pollMusic: forbidden('paid music') }
  assert.equal(await media.stepCenaEscolhaMedia(tooLong, deps), 'failed')
  assert.equal(await media.stepCenaEscolhaMedia(tooLong, deps), 'failed'); assert.equal(voices, 1)
}

async function sqlProof() {
  const db = new PGlite(), uuid = n => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`, lease = '2026-10-29T12:00:00Z'
  const query = async (sql, args = []) => (await db.query(sql, args)).rows
  const scalar = async (sql, args = []) => Object.values((await query(sql, args))[0])[0]
  const plan = route => ({ cena: { ...(route === undefined ? {} : { route }), plan: { escolha: { marker: 'KINEO-ADS-ESCOLHA-2310', sample: 'KINEO-AMOSTRA-ANUNCIO-2410' } } } })
  const add = async (n, actor = uuid(n + 1000), route = 'kling4') => { await query('insert into ads_v2_orders(id,user_id,status,assembly_lease_at,plan) values($1,$2,$3,$4,$5)', [uuid(n), actor, 'planned', lease, plan(route)]); return actor }
  const reserve = async (n, actor = uuid(n + 1000), owner = actor, at = lease) => scalar('select reserve_ads_escolha_sample($1,$2,$3,$4,false)', [uuid(n), actor, owner, at])
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create table ads_v2_orders(id uuid primary key,user_id uuid,status text,assembly_lease_at timestamptz,plan jsonb,video_id uuid,credits_charged integer,billing_ref text);
      create table events(id uuid primary key default gen_random_uuid(),name text,user_id uuid,path text,metadata jsonb,created_at timestamptz default now());
      grant usage on schema public to service_role; grant select,insert,update on ads_v2_orders,events to service_role;`)
    await db.exec(readFileSync('supabase/migrations/20261024175246_ads_escolha_sample.sql', 'utf8'))
    await db.exec(readFileSync('supabase/migrations/20261028120000_ads_escolha_sample_cap_2500.sql', 'utf8'))
    await add(1, uuid(1001), 'kling3')
    await query('update ads_v2_orders set plan=$2 where id=$1', [uuid(1), plan(undefined)])
    assert.equal((await reserve(1)).estimate_cents, 150)
    await db.exec(readFileSync('supabase/migrations/20261029204633_ads_escolha_sample_kling4_budget.sql', 'utf8'))
    const replay = await reserve(1); assert.equal(replay.replay, true); assert.equal(replay.estimate_cents, 150)
    await add(2); assert.equal((await reserve(2)).estimate_cents, 186)
    await add(3, uuid(1002)); assert.equal((await reserve(3, uuid(1002))).code, 'ads_sample_used')
    await query("update ads_v2_orders set status='failed' where id=$1", [uuid(2)])
    assert.equal((await reserve(3, uuid(1002))).code, 'ads_sample_used', 'failure never restores lifetime sample')
    await query('delete from ads_v2_orders where id=$1', [uuid(2)])
    assert.equal((await reserve(3, uuid(1002))).code, 'ads_sample_used', 'deletion never restores lifetime sample')
    await add(4, uuid(1004), 'veo31'); assert.equal((await reserve(4)).code, 'ads_sample_unavailable')
    await add(5); assert.equal((await reserve(5, uuid(1005), uuid(9999))).code, 'ads_sample_unavailable')
    assert.equal((await reserve(5, uuid(1005), uuid(1005), '2026-10-29T12:00:01Z')).code, 'ads_sample_unavailable')
    // Explicit unknown engine cannot borrow the cheap legacy allowance.
    await query('update ads_v2_orders set plan=$2 where id=$1', [uuid(5), plan('not-a-model')]); assert.equal((await reserve(5)).code, 'ads_sample_unavailable')
    await add(6, uuid(1006), 'kling3'); assert.equal((await reserve(6)).estimate_cents, 150)
    for (let n = 10; n < 20; n++) { await add(n); assert.equal((await reserve(n)).code, 'ok') }
    assert.equal(await scalar('select reserved_cents from ads_escolha_sample_days'), 2346)
    await add(20); assert.equal((await reserve(20)).code, 'ads_sample_cap'); assert.equal(await scalar('select reserved_cents from ads_escolha_sample_days'), 2346)
    await add(21, uuid(1021), 'kling3'); assert.equal((await reserve(21)).code, 'ok'); assert.equal(await scalar('select reserved_cents from ads_escolha_sample_days'), 2496)
    const claimCount = await scalar('select count(*)::int from ads_escolha_samples')
    assert.equal(claimCount, 14); assert.equal(await scalar("select count(*)::int from events where name='ads_sample_started'"), claimCount)
    await db.exec('set role service_role')
    await assert.rejects(query('delete from ads_escolha_samples where false'), /permission denied/)
    await db.exec('reset role')
  } finally { await db.close() }
}

async function admissionProof() {
  for (const route of ['kling3', 'kling4']) {
    const expected = route === 'kling4' ? 186 : 150
    for (const scenario of ['ok', 'unconfirmed', 'bad-email-date', 'antifarm', 'unknown-country', 'blocked-country', 'auth-error', 'wrong-cost', 'wrong-owner']) {
      const calls = [], orderId = '20000000-0000-4000-8000-000000000001'
      const country = scenario === 'unknown-country' ? null : scenario === 'blocked-country' ? 'IN' : 'BR'
      const load = createOfflineLoader({ mocks: {
        '../serverAccess': { adsSampleAccountOk: async () => scenario !== 'antifarm' },
        '../eligibility': { loadAdsSampleCountry: async () => country },
      } })
      const api = load(ROOT + 'escolhaSampleServer.ts')
      const admin = {
        auth: { admin: { getUserById: async () => scenario === 'auth-error' ? { error: {} } : { data: { user: { email: USER.email,
          email_confirmed_at: scenario === 'unconfirmed' ? null : scenario === 'bad-email-date' ? 'not-a-date' : '2026-10-01T12:00:00Z' } } } } },
        rpc: async (name, args) => { calls.push([name, args]); return { data: { code: 'ok', estimate_cents: scenario === 'wrong-cost' ? (route === 'kling4' ? 150 : 186) : expected } } },
      }
      const identity = { orderId, actorId: USER.id, ownerId: scenario === 'wrong-owner' ? orderId : USER.id, route, leaseAt: '2026-10-29T12:00:00Z', country }
      const result = await api.reserveEscolhaSample(admin, identity)
      assert.equal(result.ok, scenario === 'ok', route + ' admission: ' + scenario)
      assert.equal(calls.length, ['ok', 'wrong-cost'].includes(scenario) ? 1 : 0, 'blocked account never reaches reservation')
      if (calls.length) {
        assert.equal(calls[0][0], 'reserve_ads_escolha_sample')
        assert.equal('p_estimate_cents' in calls[0][1], false, 'SQL owns cost; caller cannot lower it')
        assert.equal('p_route' in calls[0][1], false, 'SQL owns route from durable order')
      }
    }
    for (const cost of [150, 186]) {
      const load = createOfflineLoader(), api = load(ROOT + 'escolhaSampleServer.ts'), orderId = '20000000-0000-4000-8000-000000000001'
      const admin = { from() { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { order_id: orderId, estimate_cents: cost } }) }; return q } }
      assert.equal(await api.hasEscolhaSampleReservation(admin, { orderId, actorId: USER.id, ownerId: USER.id, route }), cost === expected)
    }
  }
}

const pure = createOfflineLoader()('lib/ads/kling4Paid.ts')
for (const input of ['kling3', 'kling4', 'seedance2', 'veo31']) {
  assert.equal(pure.newPaidCenaRoute(input, true, true), 'kling4')
  assert.equal(pure.newPaidCenaRoute(input, true, false), 'kling3')
}
for (const live of [false, true]) {
  for (const reason of ['none', 'subscriber']) { const { order } = await controller(live, reason); await mediaAndRuntime(order) }
}
await admissionProof()
await sqlProof()
console.log('PASS KINEO-AMOSTRA-ANUNCIO-K4-2910: real routes on/off; 8s 720p approved still; 9:16 watermark; no credit/promo use on start/submit/poll/failure; one voice/video; lifetime claim and engine-aware daily cap in embedded PostgreSQL. No network or render.')
