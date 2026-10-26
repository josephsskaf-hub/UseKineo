// KINEO-COMPRA-AVULSA-2410 — execute the actual Compose entitlement/early guards, not a retyped implementation.
// Real HMAC claim verification, owned fixtures and in-memory reads only; no env, network, provider or financial RPC.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const FILE = 'app/api/compose/route.ts'
const source = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
const load = createOfflineLoader()
const claims = load('lib/cinematic/claim.ts')
const cost = load('lib/credits/engineCost.ts').creditCostForDuration
const secret = 'offline-fixture-only-2410', userId = 'offline-buyer-2410', generationId = 'offline-film35-2410'
const model = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video', clipUrl = 'https://fixture.invalid/film35.mp4'
const copy = value => JSON.parse(JSON.stringify(value))
const json = (body, options = {}) => ({ status: options.status ?? 200, body: copy(body) })

function signedFixture(status = 'settled') {
  const unresolved = status === 'pending', released = status === 'released'
  const response = unresolved ? null : { generationId, quality: 'cinematic_ai', duration: 35, fal_request_ids: ['offline-job-2410'], fal_models: [model], submission_uncertain: false }
  const authority = {
    claimId: claims.cinematicClaimId(userId, generationId), userId, generationId, status,
    fingerprint: 'a'.repeat(64), creditCost: cost('cinematic_ai', true, 35), quality: 'cinematic_ai', engine: model,
    falRequestIds: unresolved ? [] : ['offline-job-2410'], falModels: unresolved ? [] : [model],
    authorizedCompletedUrls: unresolved ? [] : [clipUrl], responseHash: response ? claims.cinematicValueHash(response) : '',
    resolutionReason: released ? 'provider_failed_refunded' : status === 'settled' ? 'upfront_debit' : '',
    resolutionReference: released || status === 'settled' ? `cinematic-${claims.cinematicClaimId(userId, generationId)}` : '',
  }
  return {
    id: authority.claimId, name: claims.CINEMATIC_CLAIM_EVENT, user_id: userId, path: claims.CINEMATIC_CLAIM_PATH,
    session_id: generationId, created_at: '2026-10-24T12:00:00.000Z', metadata: {
      generation_id: generationId, status, fingerprint: authority.fingerprint, credit_cost: authority.creditCost,
      quality: authority.quality, engine: authority.engine, fal_request_ids: authority.falRequestIds,
      fal_models: authority.falModels, authorized_completed_urls: authority.authorizedCompletedUrls,
      response, response_hash: authority.responseHash, resolution_reason: authority.resolutionReason,
      resolution_reference: authority.resolutionReference, authority: claims.signCinematicClaim(secret, authority),
    },
  }
}
function readOnlyDb(row, options = {}) {
  return { from(table) {
    assert.equal(table, 'events', 'only the actual signed birth lookup is available')
    const filters = []
    const q = {
      select() { return q }, eq(column, value) { filters.push([column, value]); return q },
      async maybeSingle() { return { data: row && filters.every(([column, value]) => row[column] === value) ? copy(row) : null, error: options.failure ? { message: 'offline read unavailable' } : null } },
    }
    return q
  } }
}
function compile(text = source) {
  const ast = ts.createSourceFile(FILE, text, ts.ScriptTarget.Latest, true)
  function find(predicate) {
    const found = []
    function visit(node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit) }
    visit(ast); assert.equal(found.length, 1, 'production AST anchor must be unique'); return found[0]
  }
  const variable = name => find(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === name)
  const guard = condition => find(node => ts.isIfStatement(node) && node.expression.getText(ast) === condition)
  const paidGate = variable('hasPaidCreditAccess')
  const upstream = variable('cinematicUpstreamDebited')
  const loadGuard = guard('!cinematicClaimLoad.ok')
  const closedGuard = guard("cinematicBirthClaim.status !== 'settled'")
  const missingGuard = guard('clientRequestedCinematic')
  const inputsGuard = find(node => ts.isIfStatement(node) && node.expression.getText(ast).includes('!inputsMatch') && node.thenStatement.getText(ast).includes("{ error: 'These AI clips do not match their signed generation.' }"))
  const accessGuard = guard('!hasPaidCreditAccess')
  assert.ok(loadGuard.pos < closedGuard.pos && closedGuard.pos < inputsGuard.pos && inputsGuard.pos < upstream.pos && upstream.pos < paidGate.pos && paidGate.pos < accessGuard.pos,
    'ownership/status/bindings precede the existing entitlement gate')
  const snippet = `export async function run(){
    const cinematicClaimLoad = await loadVerifiedCinematicClaim({ db: composeAdmin, secret: serviceRoleKey, userId: authenticatedUserId, generationId });
    ${loadGuard.getText(ast)}
    const cinematicBirthClaim = cinematicClaimLoad.claim;
    if (cinematicBirthClaim) {
      ${closedGuard.getText(ast)}
      const trustedQuality = cinematicBirthClaim.quality;
      const authorizedUrls = cinematicBirthClaim.authorizedCompletedUrls.filter(url => typeof url === 'string' && url.length > 0);
      const inputsMatch = authorizedUrls.length === clipUrls.length && authorizedUrls.every((url,index) => url === clipUrls[index]);
      ${inputsGuard.getText(ast)}
    } else if (clientRequestedCinematic) ${missingGuard.thenStatement.getText(ast)}
    const cinematicUpstreamDebited = ${upstream.initializer.getText(ast)};
    const hasPaidCreditAccess = ${paidGate.initializer.getText(ast)};
    ${accessGuard.getText(ast)}
    return NextResponse.json({ authorized: true, cinematicUpstreamDebited });
  }`
  const code = ts.transpileModule(snippet, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  return {
    initializer: paidGate.initializer.getText(ast),
    async run(options = {}) {
      const exports = {}, row = Object.hasOwn(options, 'row') ? options.row : signedFixture()
      vm.runInNewContext(code, {
        exports, console: { error() {} }, NextResponse: { json }, generationId,
        composeAdmin: readOnlyDb(row, options), serviceRoleKey: secret, authenticatedUserId: options.userId ?? userId,
        loadVerifiedCinematicClaim: claims.loadVerifiedCinematicClaim,
        readVerifiedQualityRejection: async () => ({ refunded: true, refundConfirmed: true, claimReleased: true }),
        qualityFailureResponse: facts => json({ ...facts, qualityCheckFailed: true }, { status: 422 }),
        quality: options.quality ?? 'cinematic_ai', clientRequestedCinematic: true,
        cinematicQualities: new Set(['cinematic_ai']), clipUrls: options.clipUrls ?? [clipUrl],
        isServiceFinish: false, duration: options.duration ?? 35, estrelaSobretaxaAssinada: 0, creditCostForDuration: cost,
        isFreePlan: options.isFreePlan ?? true, hasPaid: options.hasPaid ?? true, creditBalance: options.balance ?? 0,
        ent: { isTrial: options.trial ?? false }, REVERSE_TRIAL_ENABLED: options.flag ?? false,
        body: { upstream_debited: true, has_paid: true, cinematicUpstreamDebited: true, ...options.body },
      }, { timeout: 3000 })
      return exports.run()
    },
  }
}

async function proofs(text = source) {
  const route = compile(text)
  let checks = 0
  for (const flag of [false, true]) {
    const result = await route.run({ flag })
    assert.equal(result.status, 200, 'one paid 35s film consumed the exact 21 credits and must finish, independently of trial rollback')
    assert.equal(result.body.authorized, true); checks++
  }
  // Complete truth table uses the actual production initializer; only the newly approved paid+verified term is added.
  for (const isFreePlan of [false, true]) for (const hasPaid of [false, true]) for (const creditBalance of [0, 1])
  for (const isTrial of [false, true]) for (const flag of [false, true]) for (const settled of [false, true]) {
    const actual = vm.runInNewContext(route.initializer, { isFreePlan, hasPaid, creditBalance, ent: { isTrial }, REVERSE_TRIAL_ENABLED: flag, cinematicUpstreamDebited: settled })
    const expected = !isFreePlan || hasPaid && creditBalance > 0 || isTrial || flag && settled || hasPaid && settled
    assert.equal(actual, expected, 'no unrelated free/paid/trial entitlement changes'); checks++
  }
  assert.equal((await route.run({ flag: false, hasPaid: false })).status, 402, 'unpaid accounts do not gain the new exact-balance entitlement')
  assert.equal((await route.run({ flag: false, row: null })).status, 400, 'a forged body cannot replace a missing server claim')
  assert.equal((await route.run({ flag: true, row: null })).status, 400)
  assert.equal((await route.run({ userId: 'foreign-owner' })).status, 400, 'the real query binds authenticated owner, never body user')
  for (const status of ['pending', 'done', 'released']) {
    const result = await route.run({ row: signedFixture(status) })
    assert.equal(result.status, status === 'released' ? 422 : 409, 'refunded/released and unfinished signed births do not enter the new entitlement')
    if (status === 'released') assert.equal(result.body.refundConfirmed, true)
    checks++
  }
  for (const mutate of [
    row => { row.metadata.authority = 'f'.repeat(64) },
    row => { row.metadata.credit_cost = 1 },
    row => { row.metadata.response.duration = 90 },
    row => { row.metadata.authorized_completed_urls = ['https://fixture.invalid/foreign.mp4'] },
    row => { row.metadata.response.fal_request_ids = ['foreign-job'] },
  ]) {
    const row = signedFixture(); mutate(row)
    assert.equal((await route.run({ row })).status, 503, 'the actual HMAC verifier rejects altered authority before the paid gate'); checks++
  }
  assert.equal((await route.run({ clipUrls: ['https://fixture.invalid/unowned.mp4'] })).status, 400)
  assert.equal((await route.run({ duration: 60 })).status, 400, 'a paid 35s claim cannot be reused for a longer movie')
  assert.equal((await route.run({ quality: 'cinematic_veo' })).status, 400)
  assert.equal((await route.run({ failure: true })).status, 503, 'unreadable financial authority fails closed')
  return checks + 8
}
const checks = await proofs()
console.log(`PASS exact-balance delivery: ${checks} actual AST/HMAC checks; trial ON/OFF, owned 21-credit birth, missing/forged/released proof and binding rejection; no network`)
if (process.argv.includes('--mutants')) {
  const line = source.split('\n').find(value => value.includes('(hasPaid && cinematicUpstreamDebited) || // KINEO-COMPRA-AVULSA-2410'))
  assert.ok(line)
  for (const [name, mutant] of [
    ['remove exact-balance paid clause', source.replace(line + '\n', '')],
    ['remove paid account requirement', source.replace('(hasPaid && cinematicUpstreamDebited) || // KINEO-COMPRA-AVULSA-2410', '(cinematicUpstreamDebited) || // KINEO-COMPRA-AVULSA-2410')],
    ['remove settled proof requirement', source.replace('(hasPaid && cinematicUpstreamDebited) || // KINEO-COMPRA-AVULSA-2410', '(hasPaid) || // KINEO-COMPRA-AVULSA-2410')],
  ]) {
    assert.notEqual(mutant, source)
    await assert.rejects(() => proofs(mutant), undefined, 'mutant survived: ' + name)
    console.log('KILLED ' + name)
  }
}
