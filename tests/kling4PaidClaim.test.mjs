// Signed claim guards; mock ledger only, no Supabase connection or provider requests.
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
const cache = new Map()
let proof = false
let proofCalls = []
function load(path) {
  if (cache.has(path)) return cache.get(path)
  const exports = {}
  cache.set(path, exports)
  const code = ts.transpileModule(readFileSync(join(root, path), 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText
  vm.runInNewContext(code, { exports, Buffer, console,
    require(specifier) {
      if (specifier === 'node:crypto') return crypto
      if (specifier === '@/lib/kling4PromoServer') return { verifyKling4PromoReservation: async (_db, identity) => {
        proofCalls.push(identity)
        if (proof === 'unavailable') throw new Error('offline')
        return proof
      } }
      if (specifier.startsWith('@/')) return load(specifier.slice(2) + '.ts')
      throw new Error('Unmocked import forbidden: ' + specifier)
    },
  }, { filename: path, timeout: 5000 })
  return exports
}
const lib = load('lib/cinematic/claim.ts')
const identity = { secret: 'offline-hmac-key', userId: '00000000-0000-4000-8000-000000000001', generationId: 'paid-film-000001' }
const intent = { fingerprint: lib.cinematicRequestFingerprint({ script: 'test' }), creditCost: 0,
  quality: 'cinematic_hollywood', engine: lib.KLING4_PROMO_CLAIM_ENGINE, promoSeconds: 15 }
function database() {
  let row = null
  let writes = 0
  let update = null
  const query = {
    insert(value) { row = value; writes++; return query },
    update(value) { update = value; writes++; return query },
    select() { return query }, eq() { return query },
    maybeSingle: async () => { if (update && row) { row = { ...row, ...update }; update = null } return { data: row, error: null } },
  }
  return { from: () => query, row: () => row, writes: () => writes }
}

test('all ordinary engines and qualities still reject zero credit claims', async () => {
  proof = true; proofCalls = []
  for (const change of [{ engine: 'hollywood' }, { quality: 'cinematic_ai' }, { creditCost: -1 }, { engine: 'kling4' }]) {
    const db = database()
    const result = await lib.acquireCinematicClaim({ ...identity, ...intent, ...change, db })
    assert.equal(result.kind, 'error')
    assert.equal(db.writes(), 0)
  }
  assert.equal(proofCalls.length, 0)
})

test('zero claims require a matching service ledger proof and offered duration before any write', async () => {
  for (const allowed of [false, 'unavailable']) {
    proof = allowed; proofCalls = []
    const db = database()
    assert.equal((await lib.acquireCinematicClaim({ ...identity, ...intent, db })).kind, 'error')
    assert.equal(db.writes(), 0)
    assert.equal(proofCalls.length, 1)
    assert.deepEqual(JSON.parse(JSON.stringify(proofCalls[0])), { userId: identity.userId, jobId: identity.generationId, kind: 'film', seconds: 15 })
  }
  proof = true; proofCalls = []
  for (const promoSeconds of [undefined, 0, 35, 90]) {
    const db = database()
    assert.equal((await lib.acquireCinematicClaim({ ...identity, ...intent, promoSeconds, db })).kind, 'error')
    assert.equal(db.writes(), 0)
  }
  assert.equal(proofCalls.length, 0)
})

test('approved promotion acquires a verifiable zero claim; another engine cannot reuse its signed fields', async () => {
  proof = true
  const db = database()
  const result = await lib.acquireCinematicClaim({ ...identity, ...intent, db })
  assert.equal(result.kind, 'acquired')
  assert.equal(result.claim.creditCost, 0)
  assert.equal(lib.verifyCinematicClaimRow({ ...identity, row: db.row() }).ok, true)
  const changed = JSON.parse(JSON.stringify(db.row()))
  changed.metadata.engine = 'hollywood'
  assert.equal(lib.verifyCinematicClaimRow({ ...identity, row: changed }).ok, false)
})

test('zero response must prove promotion, requested seconds and only real Kling4 models', async () => {
  proof = true
  for (const change of [
    { kling4_paid: undefined },
    { kling4_paid: { version: 'kling4_paid_2810', promo: false, seconds: 15, engine_used: 'kling4' } },
    { fal_models: ['fal-ai/kling-video/v3/pro/text-to-video'] },
    { duration: 60 },
  ]) {
    const db = database()
    await lib.acquireCinematicClaim({ ...identity, ...intent, db })
    const response = { generationId: identity.generationId, quality: intent.quality, duration: 15,
      fal_request_ids: ['paid-job-1'], fal_models: ['kling/v4/text-to-video'],
      kling4_paid: { version: 'kling4_paid_2810', promo: true, seconds: 15, engine_used: 'kling4' }, ...change }
    const result = await lib.completeCinematicClaim({ ...identity, ...intent, db, response,
      falRequestIds: response.fal_request_ids, falModels: response.fal_models })
    assert.equal(result.ok, false)
  }
  const db = database()
  await lib.acquireCinematicClaim({ ...identity, ...intent, db })
  const response = { generationId: identity.generationId, quality: intent.quality, duration: 15,
    fal_request_ids: ['paid-job-1'], fal_models: ['kling/v4/text-to-video'],
    kling4_paid: { version: 'kling4_paid_2810', promo: true, seconds: 15, engine_used: 'kling4' } }
  const complete = await lib.completeCinematicClaim({ ...identity, ...intent, db, response,
    falRequestIds: response.fal_request_ids, falModels: response.fal_models })
  assert.equal(complete.ok, true)
  const settled = await lib.settleCinematicClaim({ ...identity, db, reason: 'provider_submitted_promo', renderId: `cinematic-${lib.cinematicClaimId(identity.userId, identity.generationId)}` })
  assert.equal(settled.ok, true)
  assert.equal(settled.claim.resolutionReason, 'provider_submitted_promo')
})
