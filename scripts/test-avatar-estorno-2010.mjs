// KINEO-AVATAR-ESTORNO-2010 [TRAVA 8.2 — vai do fundador 20/10 "vai pra tudo"]
// Código real + assinaturas reais + banco dublê. Nenhum SDK, rede ou credencial real.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semAvatarEstorno2010, AVATAR_ESTORNO_2010_BASE as BASE, REGRAS_AVATAR_ESTORNO_2010 as REGRAS } from './test-support/desfaz-avatar-estorno-2010.mjs'
import { semMenuUgc2010 } from './test-support/desfaz-menu-ugc-2010.mjs'
const ROOT = path.resolve(import.meta.dirname, '..')
process.chdir(ROOT)
const lf = s => String(s).replace(/\r\n/g, '\n')
const rd = p => lf(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 })
const base = p => lf(git('show', `${BASE}:${p}`))
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
  return { credit_debits: [{ render_id: REF, user_id: USER, amount, created_at: age, kind, refunded_at: refunded }], events: [{ id: claimId, user_id: USER, name: C.AVATAR_CLAIM_EVENT, path: C.AVATAR_CLAIM_PATH, session_id: GEN, metadata }], videos: [] }
}
const contains = (obj, sub) => obj != null && Object.entries(sub).every(([k, v]) => v && typeof v === 'object' ? contains(obj[k], v) : obj[k] === v)
function database(rows, errors = {}) {
  const state = { rows, rpc: [], paid: 0, audits: [] }
  return { state,
    from(table) {
      let predicates = [], single = false, max = Infinity, op = 'select'
      const q = {
        select() { return q }, order() { return q }, limit(n) { max = n; return q },
        eq(k, v) { predicates.push(r => r[k] === v); return q },
        is(k, v) { return q.eq(k, v) },
        like(k, v) { predicates.push(r => String(r[k]).startsWith(v.replace(/%$/, ''))); return q },
        lt(k, v) { predicates.push(r => r[k] < v); return q },
        gte(k, v) { predicates.push(r => r[k] >= v); return q },
        contains(k, v) { predicates.push(r => contains(r[k], v)); return q },
        maybeSingle() { single = true; return q },
        insert(value) { op = 'insert'; state.audits.push(value); return q },
        then(resolve, reject) {
          if (errors[table]) return Promise.resolve({ data: null, error: { message: 'erro simulado' } }).then(resolve, reject)
          const found = (rows[table] ?? []).filter(r => predicates.every(p => p(r))).slice(0, max).map(r => structuredClone(r))
          return Promise.resolve({ data: op === 'insert' ? null : single ? found[0] ?? null : found, error: null }).then(resolve, reject)
        },
      }
      return q
    },
    async rpc(name, args) {
      assert.equal(name, 'refund_render_credits')
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
  runtime.mod = createOfflineLoader({
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://banco.invalid', SUPABASE_SERVICE_ROLE_KEY: SECRET }, globals: { Date: Clock },
    mocks: { '@supabase/supabase-js': { createClient: () => runtime.db }, '@/lib/reverseTrial': { recordReverseTrialRefundForRender: async () => {} }, '@/lib/cinematic/claim': { CINEMATIC_CLAIM_EVENT: 'cinematic_submission_claim', releaseCinematicClaim: async () => false } },
    source: (p, raw) => overrides[p] ?? raw,
  })('@/lib/credits/refund')
  runtimes.set(overrides, runtime)
  return runtime.mod
}
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
    const again = await mod.sweepAbandonedAvatarDebits()
    assert.equal(again.refunded, 0); assert.equal(again.creditsReturned, 0); assert.equal(db.state.audits.length, 1)
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
]) await check(`MUTANTE aplicado → vermelho: ${name}`, async () => {
  const src = rd(file); assert.ok(src.includes(before), 'âncora presente')
  // O primeiro mutante usa o caminho antigo real, sem introduzir erro de sintaxe/identificador.
  const mutant = name.startsWith('volta a confundir') ? base(F) : src.replace(before, after)
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
