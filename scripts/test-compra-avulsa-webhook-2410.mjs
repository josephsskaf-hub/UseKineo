// KINEO-COMPRA-AVULSA-2410 — execute the actual POST declaration, with imports/ancillary I/O injected.
// This tests signature gating, event dedupe/crash resume and routing into the real fulfillment module.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const FILE = 'app/api/stripe/webhook/route.ts'
const raw = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
const UID = '00000000-0000-4000-8000-000000000001'
async function run(scenario = {}, override = raw) {
  const ast = ts.createSourceFile(FILE, override, ts.ScriptTarget.Latest, true)
  const post = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'POST')
  assert.ok(post)
  const code = ts.transpileModule(post.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const actions = [], receipts = new Set(), seen = new Set(scenario.duplicate ? ['evt_offline'] : [])
  let balance = 0, purchaseEvents = 0
  const session = { id: 'cs_offline', mode: 'payment', payment_status: scenario.pending ? 'unpaid' : 'paid', currency: 'usd', amount_total: 900, client_reference_id: UID, metadata: { pack: 'one_time_ad', pack_credits: '41', supabase_user_id: UID, one_time_item_version: 'one_time_item_v1', browser_session_id: 'offline-browser', surface: 'pricing' } }
  if (scenario.invalid) session.amount_total = 1
  const db = {
    from: table => {
      assert.equal(table, 'stripe_events', 'one-time branch never reaches legacy profile writes')
      return {
        insert: async ({ id }) => { actions.push('dedupe'); if (seen.has(id)) return { error: { code: '23505' } }; seen.add(id); return { error: null } },
        delete: () => ({ eq: async (_column, id) => { seen.delete(id); return { error: null } } }),
      }
    },
    rpc: async (name, args) => {
      assert.equal(name, 'fulfill_one_time_item'); actions.push('grant')
      if (scenario.rpcError) return { error: { code: 'offline' } }
      if (receipts.has(args.p_session_id)) return { error: null, data: false }
      receipts.add(args.p_session_id); balance += args.p_credits; purchaseEvents++
      return { error: null, data: true }
    },
  }
  const M = createOfflineLoader()('lib/stripe/oneTimeItemFulfillment.ts')
  const exports = {}
  const noop = async () => {}
  const C = class extends Error {}
  const context = {
    exports, process: { env: { STRIPE_WEBHOOK_SECRET: 'offline-placeholder' } },
    console: { log() {}, warn() {}, error() {} },
    NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) },
    stripe: { webhooks: { constructEvent: () => { actions.push('signature'); if (scenario.badSignature) throw new Error('invalid signature'); return { id: 'evt_offline', type: scenario.type ?? 'checkout.session.completed', data: { object: session } } } } },
    getAdminClient: () => db,
    checkoutPaymentIsSettled: value => value === 'paid' || value === 'no_payment_required',
    recordAsyncCheckoutState: async () => actions.push('pending'), recordPaymentSuccess: noop,
    markTrialConverted: async () => actions.push('trial_converted'),
    fulfillOneTimeItem: M.fulfillOneTimeItem, isOneTimeItemSession: M.isOneTimeItemSession,
    isKidsPackSession: () => false, isDfyOrderSession: () => false, isDfyFilms3Session: () => false,
    recordAffiliateCommission: async () => { const previous = actions.filter(x => x === 'affiliate').length; actions.push('affiliate'); if (scenario.affiliateError && previous === 0) throw new C('retry affiliate') },
    RetryableEntitlementError: C, RetryableAffiliateLedgerError: C, RetryableCheckoutAnalyticsError: C,
  }
  vm.runInNewContext(code, context, { timeout: 5000 })
  const req = { text: async () => '{}', headers: { get: () => scenario.missingSignature ? null : 'offline-signature' } }
  const first = await exports.POST(req)
  const second = scenario.repeat ? await exports.POST(req) : null
  return { first, second, actions, balance, purchaseEvents }
}
async function proofs(text = raw) {
  for (const type of ['checkout.session.completed', 'checkout.session.async_payment_succeeded']) {
    const result = await run({ type, repeat: true }, text)
    assert.equal(result.first.status, 200); assert.equal(result.second.status, 200)
    assert.equal(result.balance, 41); assert.equal(result.purchaseEvents, 1)
    assert.equal(result.actions[0], 'signature')
    assert.equal(result.actions.filter(x => x === 'grant').length, 2, 'same event may resume through atomic receipt')
    assert.ok(result.actions.indexOf('trial_converted') > result.actions.indexOf('grant'))
  }
  const crash = await run({ duplicate: true }, text)
  assert.equal(crash.first.status, 200); assert.equal(crash.balance, 41, 'event acquired before crash resumes delivery')
  const pending = await run({ pending: true }, text)
  assert.equal(pending.first.status, 200); assert.equal(pending.balance, 0); assert.ok(pending.actions.includes('pending'))
  assert.ok(!pending.actions.includes('trial_converted'))
  for (const scenario of [{ badSignature: true }, { missingSignature: true }]) {
    const result = await run(scenario, text)
    assert.equal(result.first.status, 400); assert.equal(result.balance, 0)
    assert.ok(!result.actions.includes('dedupe'), 'signature checked before any database work')
  }
  for (const scenario of [{ invalid: true }, { rpcError: true }]) {
    const result = await run(scenario, text)
    assert.equal(result.first.status, 500); assert.equal(result.balance, 0)
  }
  const affiliateRetry = await run({ affiliateError: true, repeat: true }, text)
  assert.equal(affiliateRetry.first.status, 500); assert.equal(affiliateRetry.second.status, 200)
  assert.equal(affiliateRetry.balance, 41); assert.equal(affiliateRetry.purchaseEvents, 1)
  const events = readFileSync('app/api/events/route.ts', 'utf8')
  assert.match(events, /const SERVER_ONLY_EVENTS = new Set\(\[[\s\S]*?'one_time_item_purchased'/)
}
await proofs()
console.log('PASS actual webhook POST: signed immediate/async, unpaid, duplicates, crash resume, failure and browser purchase forgery protection')
if (process.argv.includes('--mutants')) for (const [before, after] of [
  ['!isOneTimeItemSession(duplicateSession) && ', ''],
  ['await fulfillOneTimeItem(supabase, session)', 'void 0'],
  ['if (!checkoutSettled) {', 'if (false && !checkoutSettled) {'],
  ["if (!sig) {", 'if (false && !sig) {'],
]) {
  assert.ok(raw.includes(before)); await assert.rejects(() => proofs(raw.replace(before, after)))
  console.log('KILLED', before)
}
