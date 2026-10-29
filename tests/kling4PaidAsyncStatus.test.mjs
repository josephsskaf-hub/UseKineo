// Offline signed-claim and queue tests: network and paid provider calls are forbidden.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import * as crypto from 'node:crypto'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const modules = new Map()
let carryAllowed = true
let carryCalls = 0
const forbidden = () => { throw new Error('Offline guard forbids network or unmocked dependencies') }
function load(path) {
  if (modules.has(path)) return modules.get(path)
  const exports = {}
  modules.set(path, exports)
  const code = ts.transpileModule(readFileSync(join(root, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, { exports, Buffer, console, URL, AbortSignal, fetch: forbidden, process: { env: {} },
    require(specifier) {
      if (specifier === 'node:crypto') return crypto
      if (specifier === '@/lib/kling4PromoServer') return { verifyKling4PromoReservation: async () => true, validateKling4PromoStart: async () => ({ isFree: true }) }
      if (specifier === '@/lib/kling4PromoCarry') return { ensureKling4PromoBudgetToday: async () => { carryCalls++; return carryAllowed } }
      if (specifier.startsWith('@/')) return load(specifier.slice(2) + '.ts')
      return forbidden()
    },
  }, { filename: path, timeout: 5000 })
  return exports
}
const claims = load('lib/cinematic/claim.ts')
const status = load('lib/kling4PaidAsyncStatus.ts')
const fallbackModel = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
const identity = { secret: 'offline-hmac', userId: '00000000-0000-4000-8000-000000000001', generationId: 'paid-status-gen1' }
const spoken = 'The captain opens the blue cabin door. He finds a red map beside the lamp. Outside the ship a silver bird lands.'
function dbMock() {
  let row = null
  const slots = new Map()
  const db = { from: () => {
    let insert = null, update = null
    const filters = []
    const query = {
      insert(value) { insert = value; return query }, update(value) { update = value; return query },
      select() { return query }, eq(key, value) { filters.push([key,value]); return query },
      async maybeSingle() {
        if (insert) {
          if (row) return { error: { code: '23505' } }
          row = insert
        }
        const matches = row && filters.every(([key,value]) => key === 'metadata->>authority' ? row.metadata.authority === value : row[key] === value)
        if (!matches && filters.length) return { data: null, error: null }
        if (update) row = { ...row, ...update }
        return { data: row, error: null }
      },
    }
    return query
  }, async rpc(name, args) {
    const key = `${args.p_phase}:${args.p_scene_index}`
    if (name === 'claim_kling4_paid_scene') {
      if (slots.has(key)) return { data: { code: 'existing', ...slots.get(key) } }
      slots.set(key, { token: args.p_claim_token, state: 'pending', request_id: null, model: null })
      return { data: { code: 'claimed' } }
    }
    if (name === 'finish_kling4_paid_scene') {
      const current = slots.get(key)
      if (!current || current.token !== args.p_claim_token) return { data: { code: 'not_owner' } }
      if (current.state !== 'pending') return { data: { code: 'frozen' } }
      slots.set(key, { ...current, state: args.p_state, request_id: args.p_request_id, model: args.p_model })
      return { data: { code: 'ok' } }
    }
    if (name === 'read_kling4_paid_scenes') {
      const ordered = Array.from({ length: args.p_count }, (_, index) => slots.get(`${args.p_phase}:${index}`))
      if (ordered.some(x => !x || x.state === 'pending')) return { data: { code: 'pending' } }
      return { data: { code: 'finalized', request_ids: ordered.map(x => x.request_id), states: ordered.map(x => x.state) } }
    }
    throw new Error('unexpected RPC ' + name)
  }, slots, row: () => row }
  return db
}
async function fixture({ seconds = 15, promo = false, reserve = true } = {}) {
  const db = dbMock()
  const count = seconds / 15
  const ids = Array.from({ length: count }, (_, i) => `original-${i}`)
  const models = ids.map(() => 'kling/v4/text-to-video')
  const intent = { ...identity, db, fingerprint: claims.cinematicRequestFingerprint({ script: spoken }),
    creditCost: promo ? 0 : 45, quality: 'cinematic_hollywood', engine: promo ? 'kling4-promo-v1' : 'kling4', promoSeconds: seconds }
  assert.equal((await claims.acquireCinematicClaim(intent)).kind, 'acquired')
  const response = { generationId: identity.generationId, quality: intent.quality, duration: seconds, aspect: '9:16',
    voiceover_script: spoken, fal_request_ids: ids, fal_models: models,
    kling4_paid: { version: 'kling4_paid_2810', promo, seconds, engine_used: 'kling4',
      submitted_at: '2026-10-28T12:00:00.000Z', fallback_budget_reserved: reserve,
      chunk_scenes: ids.map((_, i) => ({ prompt: `Captain in cabin, story beat ${i}.`, duration: 15 })),
      fallback_prompts: Array.from({ length: seconds / 5 }, (_, i) => `Captain story, original five-second scene ${i + 1}.`) } }
  assert.equal((await claims.completeCinematicClaim({ ...intent, response, falRequestIds: ids, falModels: models })).ok, true)
  const settled = await claims.settleCinematicClaim({ ...identity, db, reason: promo ? 'provider_submitted_promo' : 'provider_submitted_and_debited',
    renderId: `cinematic-${claims.cinematicClaimId(identity.userId, identity.generationId)}` })
  assert.equal(settled.ok, true)
  return { ...identity, db, claim: settled.claim, now: Date.parse('2026-10-28T12:00:01Z') }
}
const current = async args => ({ ...args, claim: (await claims.loadVerifiedCinematicClaim(args)).claim })

test('paid 60s waits for all four clips before exposing completion, then returns real Kling URLs', async () => {
  const f = await fixture({ seconds: 60 })
  let posts = 0
  const pending = await status.advanceKling4PaidStatus(f, { poll: async id => ({ status: id === 'original-3' ? 'processing' : 'done', url: 'https://fal.media/test.mp4' }), submit: async () => { posts++; return 'never' } })
  assert.equal(pending.kind, 'pending')
  assert.equal(f.db.row().metadata.authorized_completed_urls.every(x => x === null), true)
  const ready = await status.advanceKling4PaidStatus(f, { poll: async id => ({ status: 'done', url: `https://fal.media/${id}.mp4` }) })
  assert.equal(ready.kind, 'ready')
  assert.equal(ready.clips.length, 4)
  assert.equal(posts, 0)
})

test('provider failure freezes a once-only Seedance backup without debiting or losing spoken words', async () => {
  const f = await fixture()
  let posts = 0
  const submittedPrompts = []
  const result = await status.advanceKling4PaidStatus(f, { poll: async () => ({ status: 'failed', url: null }),
    submit: async input => { posts++; submittedPrompts.push(input.prompt); assert.equal(input.duration, 6); return `backup-${posts}` } })
  assert.equal(result.kind, 'ordinary')
  assert.equal(posts, 3)
  assert.equal(result.claim.creditCost, 45)
  assert.equal(result.claim.response.scene_narrations.join(' '), spoken)
  const expectedPrompts = JSON.parse(JSON.stringify(f.claim.response.kling4_paid.fallback_prompts))
  assert.deepEqual(submittedPrompts, expectedPrompts)
  assert.equal(new Set(submittedPrompts).size, 3, 'three original five-second scenes must not repeat the combined 15-second prompt')
  assert.deepEqual(JSON.parse(JSON.stringify(result.claim.response.scenes)), expectedPrompts)
  assert.deepEqual(JSON.parse(JSON.stringify(result.claim.response.scene_fal_inputs.map(input => input.prompt))), expectedPrompts)
  assert.equal(result.claim.response.engine_label, 'Seedance 1.5')
  assert.equal(result.claim.falModels.every(x => x === fallbackModel), true)
  assert.equal(status.kling4PaidPollIdsMatch(['original-0'], result.claim), true)
  assert.equal(status.kling4PaidPollIdsMatch(['foreign-id'], result.claim), false)
  const replay = await status.advanceKling4PaidStatus(await current(f), { submit: async () => { posts++; throw new Error('must not repeat') } })
  assert.equal(replay.kind, 'ordinary')
  assert.equal(posts, 3)
})

test('fallback marker requires exactly one nonempty prompt per original five-second interval', async () => {
  for (const seconds of [15, 30, 60]) {
    const f = await fixture({ seconds })
    assert.equal(status.kling4PaidMarker(f.claim).fallback_prompts.length, seconds / 5)
    for (const fallback_prompts of [undefined, [], ['one'], Array(seconds / 5).fill(''), Array(seconds / 5).fill(null)]) {
      const bad = { ...f.claim, response: { ...f.claim.response, kling4_paid: { ...f.claim.response.kling4_paid, fallback_prompts } } }
      assert.equal(status.kling4PaidMarker(bad), null)
    }
  }
})

test('subscriber promo remains zero-credit through real signed fallback binding', async () => {
  const f = await fixture({ promo: true, seconds: 30 })
  let posts = 0
  const result = await status.advanceKling4PaidStatus(f, { poll: async () => ({ status: 'failed', url: null }), submit: async () => `backup-${++posts}` })
  assert.equal(result.kind, 'ordinary')
  assert.equal(posts, 6)
  assert.equal(result.claim.creditCost, 0)
  assert.equal(result.claim.resolutionReason, 'provider_submitted_promo')
  assert.equal(claims.verifyCinematicClaimRow({ ...identity, row: f.db.row() }).ok, true)
})

test('current-day promo cap refusal leaves zero new POSTs and can resume the same free fallback later', async () => {
  const f = await fixture({ promo: true })
  let posts = 0
  carryAllowed = false; carryCalls = 0
  const deps = { poll: async () => ({ status: 'failed', url: null }), submit: async () => `backup-${++posts}` }
  const blocked = await status.advanceKling4PaidStatus(f, deps)
  assert.equal(blocked.kind, 'pending')
  assert.equal(posts, 0)
  assert.equal(f.db.slots.size, 0, 'a denied day must not freeze a never-posted slot')
  carryAllowed = true; carryCalls = 0
  const resumed = await status.advanceKling4PaidStatus(await current(f), deps)
  assert.equal(resumed.kind, 'ordinary')
  assert.equal(posts, 3)
  assert.equal(carryCalls, 3, 'each potential POST rechecks the current UTC day')
  assert.equal(resumed.claim.creditCost, 0)
  assert.equal(resumed.claim.resolutionReason, 'provider_submitted_promo')
})

test('durable accepted promo backup receipts remain deliverable after the current-day cap is exhausted', async () => {
  const f = await fixture({ promo: true })
  const started = await claims.replaceKling4PaidBinding({ ...f, expectedAuthority: f.claim.authority,
    response: { ...f.claim.response, kling4_paid: { ...f.claim.response.kling4_paid,
      fallback_started: true, fallback_reason: 'provider_failed', original_request_ids: [...f.claim.falRequestIds] } },
    falRequestIds: f.claim.falRequestIds, falModels: f.claim.falModels, authorizedCompletedUrls: [null], reason: 'start_fallback' })
  assert.equal(started.ok, true)
  for (let i = 0; i < 3; i++) f.db.slots.set(`fallback:${i}`, { state: 'accepted', request_id: `durable-${i}`, model: fallbackModel })
  carryAllowed = false; carryCalls = 0
  const repaired = await status.advanceKling4PaidStatus({ ...f, claim: started.claim }, { submit: forbidden })
  assert.equal(repaired.kind, 'ordinary')
  assert.equal(carryCalls, 0, 'existing receipts incur no new provider cost')
  assert.equal(repaired.claim.creditCost, 0)
  carryAllowed = true
})

test('timeout uses the same eight-minute trial deadline and requires prepaid fallback budget', async () => {
  const f = await fixture()
  const timeout = { ...f, now: Date.parse('2026-10-28T12:08:00Z') }
  let polls = 0, posts = 0
  const result = await status.advanceKling4PaidStatus(timeout, { poll: async () => { polls++; throw new Error('not needed') }, submit: async () => `backup-${++posts}` })
  assert.equal(result.kind, 'ordinary')
  assert.equal(polls, 0)
  assert.equal(posts, 3)
  const withoutReserve = await fixture({ reserve: false })
  const refused = await status.advanceKling4PaidStatus(withoutReserve, { poll: async () => ({ status: 'failed', url: null }), submit: async () => { posts++; return 'must-not-run' } })
  assert.equal(refused.kind, 'pending')
  assert.equal(posts, 3)
})

test('an uncertain missing initial receipt waits for the durable deadline without another Kling POST', async () => {
  const f = await fixture()
  const altered = await claims.replaceKling4PaidBinding({ ...f, expectedAuthority: f.claim.authority,
    response: { ...f.claim.response, fal_request_ids: [null], submission_uncertain: true },
    falRequestIds: [null], falModels: f.claim.falModels, authorizedCompletedUrls: [null], reason: 'uncertain_initial_receipt' })
  assert.equal(altered.ok, true)
  let posts = 0
  const args = { ...f, claim: altered.claim }
  const deps = { poll: forbidden, submit: async () => `backup-${++posts}` }
  assert.equal((await status.advanceKling4PaidStatus(args, deps)).kind, 'pending')
  assert.equal(posts, 0)
  assert.equal((await status.advanceKling4PaidStatus({ ...args, now: Date.parse('2026-10-28T12:08:00Z') }, deps)).kind, 'ordinary')
  assert.equal(posts, 3)
})

test('concurrent polls cannot repeat backup POSTs and ambiguous submissions are frozen', async () => {
  const f = await fixture()
  let posts = 0
  const deps = { poll: async () => ({ status: 'failed', url: null }), submit: async () => `backup-${++posts}` }
  await Promise.all([status.advanceKling4PaidStatus(f, deps), status.advanceKling4PaidStatus(f, deps)])
  assert.equal(posts, 3)
  const lost = await fixture()
  let lostPosts = 0
  const failure = await status.advanceKling4PaidStatus(lost, { poll: deps.poll, submit: async () => { lostPosts++; throw new Error('receipt lost') } })
  assert.equal(failure.kind, 'fallback_empty')
  assert.equal(lostPosts, 3)
  assert.equal(failure.claim.response.kling4_paid.fallback_ambiguous, true)
  assert.equal(failure.claim.response.submission_uncertain, false)
  await status.advanceKling4PaidStatus(await current(lost), { submit: async () => { lostPosts++; return 'never' } })
  assert.equal(lostPosts, 3)
})
