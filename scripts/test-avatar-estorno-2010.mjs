// KINEO-AVATAR-ESTORNO-2010 [TRAVA 8.2 — vai do fundador 20/10 "vai pra tudo"]
// Código real + assinaturas reais + banco dublê. Nenhum SDK, rede ou credencial real.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semAvatarEstorno2010, AVATAR_ESTORNO_2010_BASE as BASE, REGRAS_AVATAR_ESTORNO_2010 as REGRAS } from './test-support/desfaz-avatar-estorno-2010.mjs'
import { semMenuUgc2010 } from './test-support/desfaz-menu-ugc-2010.mjs'
const ROOT = path.resolve(import.meta.dirname, '..')
process.chdir(ROOT)
const lf = s => String(s).replace(/\r\n/g, '\n')
const rd = p => lf(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 })
const BASE_INTEGRACAO = 'f53733122fbdd8393a9950444ab70e0695c3c9f1' // reancorado na integração 21/10: a camada foi mesclada sobre esta origin/main (bebê/verbatim/home vieram depois de 9d4d0ffc1 e ficam); refund.ts/reservation.ts/composeHold.ts são idênticos nas duas bases
const base = p => lf(git('show', `${BASE_INTEGRACAO}:${p}`))
const F = 'lib/credits/refund.ts', R = 'lib/avatar/reservation.ts'
const SECRET = 'segredo-falso-avatar-estorno-2010', USER = 'pessoa-externa-duble', GEN = 'avatar-estorno-2010'
const NOW = Date.parse('2026-10-20T23:00:00Z'), OLD = new Date(NOW - 7 * 3600000).toISOString()
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [NOW])) } static now() { return NOW } }
const C = createOfflineLoader()('@/lib/avatar/claim')
const claimId = C.avatarClaimId(USER, GEN), REF = `avatar-${claimId}`

function fixture({ status = 'done', url = '', amount = 70, age = OLD, kind = 'video', refunded = null } = {}) {
  const response = status === 'pending' ? null : { avatar_request_id: 'request-do-provedor-diferente-do-claim', engine: 'presenter', generationId: GEN, ...(url ? { completed_video_url: url } : {}) }
  const responseHash = response ? C.avatarValueHash(response) : ''
  const metadata = { generation_id: GEN, status, fingerprint: 'fp-estorno', credit_cost: 70, ...(response ? { response, response_hash: responseHash } : {}) }
  metadata.authority = C.signAvatarClaim(SECRET, { claimId, userId: USER, generationId: GEN, status, fingerprint: metadata.fingerprint, creditCost: 70, ...(responseHash ? { responseHash } : {}) })
  return { credit_debits: [{ render_id: REF, user_id: USER, amount, created_at: age, kind, refunded_at: refunded }], events: [{ id: claimId, user_id: USER, name: C.AVATAR_CLAIM_EVENT, path: C.AVATAR_CLAIM_PATH, session_id: GEN, metadata }], videos: [], avatar_jobs: [] }
}
const contains = (obj, sub) => obj != null && Object.entries(sub).every(([k, v]) => v && typeof v === 'object' ? contains(obj[k], v) : obj[k] === v)
const field = (row, key) => key.split(/->>?/).reduce((v, k) => v?.[k], row)
function database(rows, errors = {}) {
  const state = { rows, rpc: [], paid: 0, audits: [] }
  return { state,
    from(table) {
      let predicates = [], single = false, max = Infinity, op = 'select', values
      const q = {
        select() { return q }, order() { return q }, limit(n) { max = n; return q },
        eq(k, v) { predicates.push(r => field(r, k) === v); return q },
        in(k, values) { predicates.push(r => values.includes(field(r, k))); return q },
        neq(k, v) { predicates.push(r => field(r, k) !== v); return q },
        is(k, v) { predicates.push(r => v === null ? field(r, k) == null : field(r, k) === v); return q },
        like(k, v) { predicates.push(r => String(r[k]).startsWith(v.replace(/%$/, ''))); return q },
        lt(k, v) { predicates.push(r => r[k] < v); return q },
        gte(k, v) { predicates.push(r => r[k] >= v); return q },
        contains(k, v) { predicates.push(r => contains(r[k], v)); return q },
        maybeSingle() { single = true; return q },
        insert(value) { op = 'insert'; state.audits.push(value); return q },
        update(value) { op = 'update'; values = value; return q },
        delete() { op = 'delete'; return q },
        then(resolve, reject) {
          return (async () => {
            if (state.beforeQuery) await state.beforeQuery({ table, op, values })
            if (errors[table]) return { data: null, error: { message: 'erro simulado' } }
            const matching = (rows[table] ?? []).filter(r => predicates.every(p => p(r))).slice(0, max)
            if (op === 'update') for (const row of matching) Object.assign(row, structuredClone(values))
            if (op === 'delete') rows[table] = rows[table].filter(row => !matching.includes(row))
            const found = matching.map(r => structuredClone(r))
            return { data: op === 'insert' ? null : single ? found[0] ?? null : found, error: null }
          })().then(resolve, reject)
        },
      }
      return q
    },
    async rpc(name, args) {
      assert.equal(name, 'refund_render_credits')
      if (state.beforeRpc) await state.beforeRpc()
      state.rpc.push(args.p_render)
      if (errors.rpc) return { data: null, error: { message: 'RPC simulado falhou' } }
      const row = rows.credit_debits.find(d => d.render_id === args.p_render)
      if (!row || row.refunded_at) return { data: 0, error: null }
      row.refunded_at = new Date(NOW).toISOString() // UPDATE condicional atômico do RPC, só um vencedor.
      state.paid += Number(row.amount)
      return { data: Number(row.amount), error: null }
    },
  }
}
const runtimes = new WeakMap()
function load(db, overrides = {}) {
  let runtime = runtimes.get(overrides)
  if (runtime) { runtime.db = db; return runtime.mod }
  runtime = { db }
  runtime.loader = createOfflineLoader({
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://banco.invalid', SUPABASE_SERVICE_ROLE_KEY: SECRET }, globals: { Date: Clock },
    mocks: { '@supabase/supabase-js': { createClient: () => runtime.db }, '@/lib/reverseTrial': { recordReverseTrialRefundForRender: async () => {} }, '@/lib/cinematic/claim': { CINEMATIC_CLAIM_EVENT: 'cinematic_submission_claim', releaseCinematicClaim: async () => false } },
    source: (p, raw) => overrides[p] ?? raw,
  })
  runtime.mod = runtime.loader('@/lib/credits/refund')
  runtimes.set(overrides, runtime)
  return runtime.mod
}
const reservation = (db, overrides) => { load(db, overrides); return runtimes.get(overrides).loader('@/lib/avatar/reservation') }
const holds = (db, overrides) => { load(db, overrides); return runtimes.get(overrides).loader('@/lib/credits/composeHold').inspectActiveComposeCreditHolds({ db, secret: SECRET, userId: USER, currentClaimId: 'outra-geracao' }) }
const bindArgs = { userId: USER, requestId: 'request-do-provedor-diferente-do-claim', engine: 'presenter', videoUrl: 'https://entrega.invalid/avatar.mp4' }
let passed = 0
async function check(name, fn) { await fn(); passed++; console.log(`ok ${name}`) }
async function problems(overrides = {}) {
  const issues = []
  const run = async (label, fn) => { try { await fn() } catch (e) { issues.push(`${label}: ${e.message}`) } }
  await run('claimId != requestId', async () => {
    const db = database(fixture()), mod = load(db, overrides)
    const r = await mod.sweepAbandonedAvatarDebits()
    assert.equal(r.refunded, 1); assert.equal(r.creditsReturned, 70); assert.equal(db.state.paid, 70)
    assert.deepEqual(db.state.rpc, [REF]); assert.equal(db.state.audits.length, 1)
    assert.equal(db.state.audits[0].metadata.amount, 70)
    assert.equal(db.state.audits[0].metadata.billing_reference, REF)
    const hold = await holds(db, overrides)
    assert.equal(hold.ok, true); assert.equal(hold.totalHeld, 0, 'crédito devolvido fica utilizável, sem renascer como hold')
    const again = await mod.sweepAbandonedAvatarDebits()
    assert.equal(again.refunded, 0); assert.equal(again.creditsReturned, 0); assert.equal(db.state.audits.length, 1)
  })
  for (const corrupt of ['sem ledger', 'outro dono', 'outro custo', 'sem marcador']) await run(`hold não é liberado por ${corrupt}`, async () => {
    const rows = fixture({ refunded: OLD }); rows.events[0].metadata.abandoned_refund_claimed_at = OLD
    if (corrupt === 'sem ledger') rows.credit_debits = []
    if (corrupt === 'outro dono') rows.credit_debits[0].user_id = 'outra-pessoa'
    if (corrupt === 'outro custo') rows.credit_debits[0].amount = 110
    if (corrupt === 'sem marcador') delete rows.events[0].metadata.abandoned_refund_claimed_at
    const h = await holds(database(rows), overrides)
    assert.equal(h.ok, true); assert.equal(h.totalHeld, 70)
  })
  await run('pending sem request ou marca prepaid', async () => {
    const db = database(fixture({ status: 'pending' }))
    const r = await load(db, overrides).sweepAbandonedAvatarDebits()
    assert.equal(r.creditsReturned, 70); assert.equal(db.state.paid, 70)
  })
  await run('concorrência e auditoria uma vez', async () => {
    const db = database(fixture()), mod = load(db, overrides)
    const results = await Promise.all([mod.sweepAbandonedAvatarDebits(), mod.sweepAbandonedAvatarDebits()])
    assert.equal(results.reduce((n, r) => n + r.creditsReturned, 0), 70)
    assert.equal(results.reduce((n, r) => n + r.refunded, 0), 1)
    assert.equal(db.state.paid, 70); assert.equal(db.state.audits.length, 1)
    assert.equal(db.state.rpc.length, 2, 'as duas leituras viram débito aberto; só o RPC decide vencedor')
  })
  await run('entrega ganha o CAS antes do estorno', async () => {
    const db = database(fixture()), mod = load(db, overrides), reserve = reservation(db, overrides)
    let intercepted = false
    db.state.beforeQuery = async ({ op, values }) => {
      if (op !== 'update' || !values.metadata.abandoned_refund_claimed_at || intercepted) return
      intercepted = true
      const bound = await reserve.bindAvatarCompletedVideo(bindArgs)
      assert.equal(bound.ok, true)
    }
    const r = await mod.sweepAbandonedAvatarDebits()
    assert.equal(intercepted, true); assert.equal(r.creditsReturned, 0); assert.equal(db.state.paid, 0)
    assert.equal(db.state.rows.events[0].metadata.response.completed_video_url, bindArgs.videoUrl)
  })
  await run('estorno ganha contra binding que já leu o claim', async () => {
    const db = database(fixture()), mod = load(db, overrides), reserve = reservation(db, overrides)
    let intercepted = false
    db.state.beforeQuery = async ({ op, values }) => {
      if (op !== 'update' || !values.metadata.response?.completed_video_url || intercepted) return
      intercepted = true
      assert.equal((await mod.sweepAbandonedAvatarDebits()).creditsReturned, 70)
    }
    const bound = await reserve.bindAvatarCompletedVideo(bindArgs)
    assert.equal(intercepted, true); assert.equal(bound.ok, false)
    assert.equal(db.state.rows.events[0].metadata.response.completed_video_url, undefined)
    assert.equal(db.state.paid, 70)
  })
  await run('binding tardio recusado; falha RPC pode ser retentada', async () => {
    const errors = { rpc: true }, db = database(fixture(), errors), mod = load(db, overrides), reserve = reservation(db, overrides)
    assert.equal((await mod.sweepAbandonedAvatarDebits()).creditsReturned, 0)
    assert.equal((await reserve.bindAvatarCompletedVideo(bindArgs)).ok, false)
    errors.rpc = false
    assert.equal((await mod.sweepAbandonedAvatarDebits()).creditsReturned, 70)
    assert.equal((await reserve.bindAvatarCompletedVideo(bindArgs)).ok, false)
    assert.equal(db.state.rows.events[0].metadata.response.completed_video_url, undefined)
    assert.equal(db.state.audits.length, 1)
  })
  for (const writer of ['prepaid', 'settled']) await run(`${writer} tardio não apaga reserva`, async () => {
    const db = database(fixture({ status: writer === 'prepaid' ? 'pending' : 'done' })), mod = load(db, overrides), reserve = reservation(db, overrides)
    let intercepted = false
    db.state.beforeQuery = async ({ op, values }) => {
      if (op !== 'update' || values.metadata.abandoned_refund_claimed_at || intercepted) return
      if (!(writer === 'prepaid' ? values.metadata.prepaid_billing_reference : values.metadata.status === 'settled')) return
      intercepted = true
      assert.equal((await mod.sweepAbandonedAvatarDebits()).creditsReturned, 70)
    }
    const r = writer === 'prepaid' ? await reserve.markAvatarClaimPrepaid({ userId: USER, generationId: GEN }) : await reserve.settleAvatarCreditHoldForFailedRequest({ userId: USER, requestId: bindArgs.requestId })
    assert.equal(intercepted, true); assert.equal(r, false)
    assert.ok(db.state.rows.events[0].metadata.abandoned_refund_claimed_at)
  })
  const skip = [
    ['URL entregue sem videos', fixture({ url: 'https://entrega.invalid/avatar.mp4' })],
    ['settled sem URL', fixture({ status: 'settled' })],
    ['custo divergente', fixture({ amount: 110 })],
    ['recente', fixture({ age: new Date(NOW - 3600000).toISOString() })],
    ['já estornado', fixture({ refunded: OLD })],
    ['kind diferente', fixture({ kind: 'avatar' })],
  ]
  for (const [name, rows] of skip) await run(name, async () => {
    const db = database(rows), r = await load(db, overrides).sweepAbandonedAvatarDebits()
    assert.equal(r.creditsReturned, 0); assert.equal(db.state.rpc.length, 0); assert.equal(db.state.audits.length, 0)
  })
  const corrupt = [
    ['sem claim', rows => { rows.events = [] }],
    ['assinatura inválida', rows => { rows.events[0].metadata.authority = '0'.repeat(64) }],
    ['response adulterado', rows => { rows.events[0].metadata.response.engine = 'fabric' }],
    ['claim de outro dono', rows => { rows.events[0].user_id = 'outra-pessoa' }],
    ['geração divergente', rows => { rows.events[0].session_id = 'geracao-divergente' }],
    ['referência divergente', rows => { rows.credit_debits[0].render_id = 'avatar-outro-claim' }],
  ]
  for (const [name, mutate] of corrupt) await run(name, async () => {
    const rows = fixture(); mutate(rows)
    const db = database(rows), r = await load(db, overrides).sweepAbandonedAvatarDebits()
    assert.equal(r.ambiguous, 1); assert.equal(r.creditsReturned, 0); assert.equal(db.state.rpc.length, 0)
  })
  for (const field of ['videos', 'events', 'rpc', 'credit_debits']) await run(`erro ${field}`, async () => {
    const db = database(fixture(), { [field]: true }), r = await load(db, overrides).sweepAbandonedAvatarDebits()
    assert.equal(r.creditsReturned, 0); assert.equal(db.state.paid, 0); assert.equal(db.state.audits.length, 0)
  })
  for (const [name, video, expected] of [
    ['entregue', { user_id: USER, status: 'completed', created_at: OLD }, 0],
    ['outro dono', { user_id: 'outra-pessoa', status: 'completed', created_at: OLD }, 70],
    ['vídeo anterior', { user_id: USER, status: 'completed', created_at: '2026-10-01T00:00:00Z' }, 70],
    ['vídeo falhou', { user_id: USER, status: 'failed', created_at: OLD }, 70],
  ]) await run(name, async () => {
    const rows = fixture(); rows.videos.push({ id: name, ...video })
    const db = database(rows), r = await load(db, overrides).sweepAbandonedAvatarDebits()
    assert.equal(r.creditsReturned, expected); assert.equal(db.state.paid, expected)
  })
  return issues
}
await check('BASE reproduz o defeito: sufixo claimId não encontra requestId', async () => {
  const db = database(fixture())
  const r = await load(db, { [F]: base(F), [R]: base(R) }).sweepAbandonedAvatarDebits()
  assert.equal(r.creditsReturned, 0); assert.equal(db.state.paid, 0)
})
await check('dublê: abandono, pending, concorrência, repetição, entregas e falhas fechadas', async () => assert.deepEqual(await problems(), []))
function replay(src, row, db = {}, refund = null) {
  const begin = src.indexOf('    async function responseForClaimRow('), end = src.indexOf('    async function completeAvatarClaim(', begin)
  assert.ok(begin >= 0 && end > begin)
  const code = ts.transpileModule(src.slice(begin, end) + '\nexports.run = responseForClaimRow', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, avatarAdmin: db, claimId, userId: USER, generationId: GEN, AVATAR_CLAIM_EVENT: C.AVATAR_CLAIM_EVENT, AVATAR_CLAIM_PATH: C.AVATAR_CLAIM_PATH, serviceRoleKey: SECRET, requestFingerprint: 'fp-estorno', AVATAR_CREDIT_COST: 70, verifyAvatarClaim: C.verifyAvatarClaim, avatarValueHash: C.avatarValueHash, safetyUnavailable: () => ({ status: 503 }), NextResponse: { json: (body, opts = {}) => ({ body, status: opts.status ?? 200 }) }, Date: Clock, ACTIVE_RESERVATION_TTL_MS: 2 * 3600000, refundAvatarBirthDebit: refund, reservationId: 'reserva-duble', console: { error() {} } })
  return exports.run(row)
}
await check('replay real recusa reserva de estorno antes de expor resposta', async () => {
  const src = rd('app/api/generate-avatar/route.ts'), row = fixture({ url: bindArgs.videoUrl }).events[0]
  assert.equal((await replay(src, row)).status, 200)
  row.metadata.abandoned_refund_claimed_at = OLD
  assert.equal((await replay(src, row)).status, 503)
  const anchor = '      if (metadata.abandoned_refund_claimed_at) return safetyUnavailable()'
  assert.ok(src.includes(anchor)); assert.equal((await replay(src.replace(anchor, '      if (false) return safetyUnavailable()'), row)).status, 200, 'mutante do replay fica vermelho')
})
async function stalePendingRace(src) {
  const rows = fixture({ status: 'pending' }); rows.events[0].created_at = OLD
  const db = database(rows), overrides = {}, mod = load(db, overrides), reserve = reservation(db, overrides)
  let intercepted = false
  db.state.beforeRpc = async () => {
    if (intercepted) return
    intercepted = true
    assert.equal((await mod.sweepAbandonedAvatarDebits()).creditsReturned, 70)
  }
  const r = await replay(src, structuredClone(rows.events[0]), db, reserve.refundAvatarBirthDebit)
  assert.equal(intercepted, true); assert.equal(r.status, 503)
  assert.equal(db.state.rows.events.length, 1); assert.ok(db.state.rows.events[0].metadata.abandoned_refund_claimed_at)
  assert.equal(db.state.paid, 70)
}
await check('replay pending aguardando refund não apaga marker; mutante DELETE vermelho', async () => {
  const src = rd('app/api/generate-avatar/route.ts')
  await stalePendingRace(src)
  const anchor = ".is('metadata->>abandoned_refund_claimed_at', null) // KINEO-AVATAR-ESTORNO-2010 — replay pending"
  assert.ok(src.includes(anchor))
  await assert.rejects(() => stalePendingRace(src.replace(anchor, '// KINEO-AVATAR-ESTORNO-2010 — replay pending')), { code: 'ERR_ASSERTION' })
})
function complete(src, db) {
  const begin = src.indexOf('    async function completeAvatarClaim('), end = src.indexOf('    if (!dryRun) {', begin)
  assert.ok(begin >= 0 && end > begin)
  const code = ts.transpileModule(src.slice(begin, end) + '\nexports.run = completeAvatarClaim', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, avatarAdmin: db, ownsAvatarClaim: true, claimId, userId: USER, generationId: GEN, AVATAR_CLAIM_EVENT: C.AVATAR_CLAIM_EVENT, serviceRoleKey: SECRET, requestFingerprint: 'fp-estorno', AVATAR_CREDIT_COST: 70, avatarDebitConfirmed: true, avatarPrepaidAt: OLD, claimStartedAt: OLD, avatarBillingReference: () => REF, signAvatarClaim: C.signAvatarClaim, avatarValueHash: C.avatarValueHash, Date: Clock, console: { error() {}, warn() {} } })
  return exports.run({ avatar_request_id: bindArgs.requestId, engine: 'presenter', generationId: GEN })
}
async function completionRace(src) {
  const db = database(fixture()), overrides = {}, mod = load(db, overrides)
  let intercepted = false
  db.state.beforeQuery = async ({ op, values }) => {
    if (op !== 'update' || !values.metadata.started_at || intercepted) return
    intercepted = true
    assert.equal((await mod.sweepAbandonedAvatarDebits()).creditsReturned, 70)
  }
  const r = await complete(src, db)
  assert.equal(intercepted, true); assert.equal(r, false)
  assert.ok(db.state.rows.events[0].metadata.abandoned_refund_claimed_at)
}
await check('completion real com snapshot anterior não apaga reserva; mutante CAS vermelho', async () => {
  const src = rd('app/api/generate-avatar/route.ts')
  await completionRace(src)
  const anchor = ".is('metadata->>abandoned_refund_claimed_at', null) // KINEO-AVATAR-ESTORNO-2010 — CAS contra a reserva concorrente"
  assert.ok(src.includes(anchor))
  await assert.rejects(() => completionRace(src.replace(anchor, '// KINEO-AVATAR-ESTORNO-2010 — CAS contra a reserva concorrente')))
})
for (const [name, file, before, after] of [
  ['volta a confundir requestId com claimId', F, 'billingReference: renderId', "billingReference: 'avatar-' + loadedRequestId"],
  ['pending precisa indevidamente de requestId', F, "loaded.claim.status === 'settled'", "!loaded.claim.requestId || loaded.claim.status === 'settled'"],
  ['estorna URL já entregue', F, ' || loaded.claim.completedVideoUrl', ''],
  ['estorna settled', F, " || loaded.claim.status === 'settled'", ''],
  ['ignora custo do claim', F, ' || loaded.claim.creditCost !== Number(debit.amount)', ''],
  ['perde idempotência da contagem', F, 'const credits = await refundRenderCredits(renderId)', 'await refundRenderCredits(renderId); const credits = Number(debit.amount)'],
  ['ignora vídeo entregue', F, 'if (delivered) {', 'if (false) {'],
  ['estorna débito recente', F, "6 * 60 * 60 * 1000", '0'],
  ['ignora assinatura do claim', R, '!verifyAvatarClaim(args.secret, {', 'false && !verifyAvatarClaim(args.secret, {'],
  ['remove CAS contra entrega concorrente', F, ".eq('metadata->>authority', claim.authority).select('id')", ".select('id')"],
  ['permite binding com leitura anterior à reserva', R, ".is('metadata->>abandoned_refund_claimed_at', null) // KINEO-AVATAR-ESTORNO-2010 — bind e reserva", '// KINEO-AVATAR-ESTORNO-2010 — bind e reserva'],
  ['permite binding tardio', R, "if (claim.metadata.abandoned_refund_claimed_at) return { ok: false, error: 'avatar abandonment refund reserved' }", 'if (false) return { ok: false, error: \'avatar abandonment refund reserved\' }'],
  ['prepaid apaga reserva com snapshot velho', R, ".is('metadata->>abandoned_refund_claimed_at', null) // KINEO-AVATAR-ESTORNO-2010 — CAS também no marcador prepaid", '// KINEO-AVATAR-ESTORNO-2010 — CAS também no marcador prepaid'],
  ['settlement apaga reserva com snapshot velho', R, ".is('metadata->>abandoned_refund_claimed_at', null) // KINEO-AVATAR-ESTORNO-2010 — settlement tardio", '// KINEO-AVATAR-ESTORNO-2010 — settlement tardio'],
  ['crédito estornado renasce como hold', 'lib/credits/composeHold.ts', 'if (metadata.abandoned_refund_claimed_at && returnedDebit?.userId', 'if (false && metadata.abandoned_refund_claimed_at && returnedDebit?.userId'],
]) await check(`MUTANTE aplicado → vermelho: ${name}`, async () => {
  const src = rd(file); assert.ok(src.includes(before), 'âncora presente')
  // O primeiro mutante usa o caminho antigo real, sem introduzir erro de sintaxe/identificador.
  let mutant = name.startsWith('volta a confundir') ? base(F) : src.replace(before, after)
  if (name === 'permite binding tardio') mutant = mutant.replace(".is('metadata->>abandoned_refund_claimed_at', null) // KINEO-AVATAR-ESTORNO-2010 — bind e reserva", '// KINEO-AVATAR-ESTORNO-2010 — bind e reserva')
  assert.notEqual(mutant, src)
  const issues = await problems({ [file]: mutant }); assert.ok(issues.length > 0)
})
await check('desfaz EXATO de todos os arquivos, idempotência, CRLF e cadeia histórica', () => {
  for (const file of Object.keys(REGRAS)) {
    const src = rd(file), old = base(file)
    assert.equal(semAvatarEstorno2010(src, file), old, file)
    assert.equal(semAvatarEstorno2010(old, file), old)
    assert.equal(semAvatarEstorno2010(src.replace(/\n/g, '\r\n'), file), old.replace(/\n/g, '\r\n'))
    if ([F, R].includes(file)) assert.ok(!semMenuUgc2010(src, file).includes('KINEO-AVATAR-ESTORNO-2010'))
  }
  assert.equal(semAvatarEstorno2010('KINEO-AVATAR-ESTORNO-2010', 'arquivo-fora'), 'KINEO-AVATAR-ESTORNO-2010')
  assert.throws(() => semAvatarEstorno2010(rd(R).replace(/^.*const loaded = verifyAvatarClaimRow.*\n/m, ''), R))
})
console.log(`${passed} provas verdes; mutantes acima foram detectados em memória`)
