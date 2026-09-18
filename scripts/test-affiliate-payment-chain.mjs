// Offline integration: actual attribution/finalizer, Checkout affiliate block,
// webhook commission function and ledger; only SDK/network/database are mocked.
// This is NOT a Stripe TEST purchase or an HTTP/signature end-to-end test.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import * as crypto from 'node:crypto'
import ts from 'typescript'
const read = (file) => fs.readFileSync(file, 'utf8')
let checks = 0
const eq = (a, b, why) => { assert.deepEqual(a, b, why); checks++ }
const ok = (a, why) => { assert.ok(a, why); checks++ }
const CODE = 'ABCD2345', CLICK = '11111111-1111-4111-8111-111111111111'
const initialTime = Date.parse('2026-09-16T12:00:00Z')
let now = initialTime
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])) } static now() { return now } }
function compile(source, imports = {}, globals = {}) {
  const box = { exports: {} }
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInNewContext(js, {
    module: box, exports: box.exports, Date: Clock, URL, URLSearchParams, Set, Map, Error, Number, String,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-only' } },
    console: { log() {}, warn() {}, error() {} },
    require: (id) => { if (Object.hasOwn(imports, id)) return imports[id]; throw Error(`Unmocked import: ${id}`) },
    ...globals,
  })
  return box.exports
}
function declaration(file, name) {
  const text = read(file), ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const node = ast.statements.find((n) => (ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n)) && n.name?.text === name)
  assert.ok(node, `actual declaration ${name}`)
  return node.getText(ast)
}
class Query {
  constructor(db, table) { this.db = db; this.table = table; this.filters = []; this.op = 'select'; this.columns = '*' }
  select(columns = '*') { this.columns = columns; return this }
  eq(key, value) { this.filters.push((row) => row[key] === value); return this }
  limit(n) { this.max = n; return this }
  update(value) { this.op = 'update'; this.value = value; return this }
  insert(value) { this.op = 'insert'; this.value = value; return this }
  async run() {
    const list = this.db.tables[this.table]
    assert.ok(list, `Unexpected table ${this.table}`)
    let rows = list.filter((r) => this.filters.every((f) => f(r)))
    if (this.op === 'insert') {
      if (this.table === 'affiliate_referrals' && this.db.race) {
        list.push({ id: 'ref-race', ...this.value, affiliate_id: 'aff-first' }); this.db.race = false
        return { data: null, error: { code: '23505' } }
      }
      const conflict = this.table === 'affiliate_referrals'
        ? list.some((r) => r.referred_user_id === this.value.referred_user_id)
        : this.table === 'affiliate_commissions' && list.some((r) => r.provider === this.value.provider && r.external_id === this.value.external_id)
      if (conflict) return { data: null, error: { code: '23505' } }
      const row = { id: this.table === 'affiliate_clicks' ? CLICK : `${this.table}-${list.length}`, ...this.value }
      if (this.table === 'affiliate_clicks') row.created_at = new Clock().toISOString()
      list.push(row); rows = [row]
    } else if (this.op === 'update') {
      rows.forEach((r) => Object.assign(r, this.value))
    }
    if (this.max) rows = rows.slice(0, this.max)
    const data = rows.map((r) => this.columns === '*' ? { ...r } : Object.fromEntries(this.columns.split(',').map((c) => [c.trim(), r[c.trim()]])))
    return { data, error: null }
  }
  async maybeSingle() { const r = await this.run(); return { ...r, data: r.data?.[0] ?? null } }
  async single() { return this.maybeSingle() }
  then(resolve, reject) { return this.run().then(resolve, reject) }
}
function setup() {
  now = initialTime
  const db = { tables: {
    profiles: [{ id: 'buyer', affiliate_id: null }],
    affiliates: [{ id: 'aff-1', code: CODE, user_id: 'owner', status: 'active', commission_rate: 0.3 }, { id: 'aff-first', code: 'WXYZ2345', user_id: 'owner-first', status: 'active', commission_rate: 0.3 }],
    affiliate_clicks: [{ id: CLICK, affiliate_id: 'aff-1', created_at: new Clock(now - 3600000).toISOString() }],
    affiliate_referrals: [], affiliate_commissions: [],
  }, from(table) { return new Query(this, table) } }
  const user = { id: 'buyer', email: 'buyer@example.test', createdAt: new Clock(now - 1800000).toISOString() }
  const attribution = compile(read('lib/affiliateAttribution.ts'), {
    '@supabase/supabase-js': { createClient: () => db }, '@/lib/affiliateCode': compile(read('lib/affiliateCode.ts')),
  })
  const events = []
  const finalizer = compile(read('lib/affiliateSignupFinalization.ts'), {
    'server-only': {}, '@/lib/affiliateAttribution': attribution,
    '@/lib/serverEvents': { writeServerEvent: async (event) => { events.push(event); return true } },
  })
  const ledger = compile(read('lib/affiliateLedger.ts'))
  const checkoutSource = read('app/api/stripe/checkout/route.ts')
  const begin = checkoutSource.indexOf("const rwReferral = req.cookies.get('rewardful_referral')?.value")
  const end = checkoutSource.indexOf('// KINEO-CHECKOUT-IDEMPOTENCY', begin)
  assert.ok(begin > 0 && end > begin, 'real checkout metadata block located')
  const checkout = compile(
    declaration('app/api/stripe/checkout/route.ts', 'resolveCustomAffiliateBeforeSubscription') +
    `\nexport async function run(req, user, profile) { const sessionParams = {metadata:{}, subscription_data:{metadata:{}}}; ${checkoutSource.slice(begin, end)}; return sessionParams; }`, {}, attribution,
  )
  const payment = compile(
    declaration('app/api/stripe/webhook/route.ts', 'RetryableAffiliateLedgerError') + '\n' +
    declaration('app/api/stripe/webhook/route.ts', 'recordAffiliateCommission') + '\nexport { recordAffiliateCommission };', {}, {
      ...ledger, resolveAffiliateByCoupon: async () => { throw Error('Coupon path not simulated by this harness') },
    },
  )
  const signup = () => finalizer.finalizeAffiliateSignupAttribution({ rawCode: CODE, rawClickId: CLICK, user, source: 'auth_callback' })
  const visitAndSignup = async () => {
    db.tables.affiliate_clicks.length = 0
    const route = compile(read('app/a/[code]/route.ts'), {
      'next/server': { NextResponse: { redirect: (url) => {
        const result = { location: String(url), writes: [] }
        result.cookies = { set: (name, value, options) => result.writes.push({ name, value, options }) }
        return result
      } } },
      crypto,
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/affiliateDestinations': compile(read('lib/affiliateDestinations.ts')),
      '@/lib/affiliateAttribution': attribution,
    })
    now = initialTime - 3600000
    let response
    try {
      response = await route.GET({
        nextUrl: new URL(`https://www.usekineo.com/a/${CODE}?to=script`),
        cookies: { get: () => undefined },
        headers: { get: (key) => key === 'user-agent' ? 'Mozilla/5.0' : '' },
      }, { params: { code: CODE } })
    } finally { now = initialTime }
    const cookies = Object.fromEntries(response.writes.map((cookie) => [cookie.name, cookie.value]))
    const result = await finalizer.finalizeAffiliateSignupAttribution({
      rawCode: cookies.sf_aff, rawClickId: cookies.sf_aff_click, user, source: 'auth_callback',
    })
    return { response, result }
  }
  const checkoutRun = (cookies = {}) => checkout.run({ cookies: { get: (key) => cookies[key] ? { value: cookies[key] } : undefined } }, { ...user, created_at: user.createdAt }, db.tables.profiles[0])
  const pay = (overrides = {}) => payment.recordAffiliateCommission(db, { userId: user.id, externalId: 'cs_test_offline_initial', amountGross: 990, currency: 'usd', type: 'initial', paymentKind: 'subscription', attributionSystem: 'custom', ...overrides })
  return { db, user, attribution, events, signup, visitAndSignup, checkoutRun, pay }
}

{
  const s = setup()
  const { response, result } = await s.visitAndSignup()
  eq(new URL(response.location).pathname, '/free-script-generator', 'real affiliate route redirects to allowlisted destination')
  eq(s.db.tables.affiliate_clicks.length, 1, 'real route creates one server click in empty simulated ledger')
  eq(result.outcome, 'attributed', 'signup consumes cookies issued by the actual link route')
  const proof = response.writes.find((cookie) => cookie.name === 'sf_aff_click')
  eq(proof.options.httpOnly, true, 'link proof remains server-only')
  eq(proof.options.maxAge, 90 * 24 * 60 * 60, 'issued cookie keeps 90-day window')
  eq((await s.checkoutRun()).metadata.affiliate_system, 'custom', 'checkout preserves the link-created custom owner')
  await s.pay()
  eq(s.db.tables.affiliate_commissions[0].affiliate_id, s.db.tables.affiliate_clicks[0].affiliate_id, 'link owner receives the simulated payment commission')
}

{
  const s = setup()
  eq((await s.signup()).outcome, 'attributed', 'server signup finalizes protected click')
  eq(s.db.tables.affiliate_referrals.length, 1, 'one canonical person referral')
  eq((await s.signup()).outcome, 'already_attributed', 'repeat signup is not a new attribution')
  eq(s.events.filter((e) => e.metadata.outcome === 'attributed').length, 1, 'one new attribution outcome for person')
  s.db.tables.profiles[0].affiliate_id = null
  const checkout = await s.checkoutRun({ rewardful_referral: 'rw-test' })
  eq(checkout.metadata.affiliate_system, 'custom', 'checkout repairs canonical referral without cookies')
  eq(checkout.subscription_data.metadata.affiliate_system, 'custom', 'renewal system owner is stored')
  eq(checkout.client_reference_id, undefined, 'custom suppresses Rewardful reference')
  await s.pay(); await s.pay()
  eq(s.db.tables.affiliate_commissions.length, 1, 'duplicated initial payment creates one debt')
  eq(s.db.tables.affiliate_commissions[0].commission_amount, 297, 'legacy30% preserved')
  eq(s.db.tables.affiliate_referrals[0].status, 'paid', 'subscription marks paid after commission')
  await s.pay({ externalId: 'in_test_offline_renewal', type: 'recurring', currency: 'brl', amountGross: 4990 })
  await s.pay({ externalId: 'in_test_offline_renewal', type: 'recurring', currency: 'brl', amountGross: 4990 })
  eq(s.db.tables.affiliate_commissions.length, 2, 'renewal replay does not duplicate debt')
  eq(s.db.tables.affiliate_commissions[1].currency, 'brl', 'BRL retained separately')
  eq(s.db.tables.affiliate_commissions[1].commission_amount, 1497, 'BRL uses minor units without conversion')
  await s.pay({ externalId: 'cs_test_rewardful', attributionSystem: 'rewardful' })
  eq(s.db.tables.affiliate_commissions.length, 2, 'Rewardful charge creates no custom debt')
}
{
  const s = setup(); s.db.race = true
  const result = await s.signup()
  eq(s.db.tables.profiles[0].affiliate_id, 'aff-first', 'race loser preserves first-touch winner')
  eq(result.outcome, 'already_attributed', 'race loser must not emit another new attribution')
  eq(s.events[0].metadata.already_attributed, true, 'diagnostic says existing canonical owner')
}
{
  const s = setup(); await s.signup()
  await s.pay({ externalId: 'in_test_before_initial', type: 'recurring' })
  await s.pay()
  await s.pay({ externalId: 'in_test_before_initial', type: 'recurring' })
  eq(s.db.tables.affiliate_commissions.length, 2, 'renewal delivered before initial remains two distinct payments')
  eq(s.db.tables.affiliate_referrals.length, 1, 'out-of-order payments never create a second person')
}
{
  const s = setup(); await s.signup()
  await s.pay({ paymentKind: 'one_time' })
  eq(s.db.tables.affiliate_referrals[0].status, 'signup', 'pack purchase is not counted as subscriber')
  eq(s.db.tables.affiliate_commissions.length, 1, 'eligible one-time commission preserved')
}
{
  const s = setup(); s.db.tables.affiliates[0].user_id = 'buyer'
  eq((await s.signup()).outcome, 'self_referral', 'self-referral rejected')
  eq(s.db.tables.affiliate_referrals.length, 0, 'self-referral creates no liability owner')
}

// Diagnostic probes expose uncorrected financial boundaries. They are not
// assertions that defects should remain, nor a green certification of policy.
const unresolved = []
{
  const s = setup(); await s.signup(); const checkout = await s.checkoutRun()
  if (!checkout.metadata.affiliate_id || !checkout.metadata.affiliate_policy_version) unresolved.push('Checkout has no immutable affiliate owner/policy snapshot')
  await s.pay()
  const convertedAt = s.db.tables.affiliate_referrals[0].converted_at
  now += 31 * 86400000
  await s.pay({ externalId: 'in_test_later', type: 'recurring' })
  if (s.db.tables.affiliate_referrals[0].converted_at !== convertedAt) unresolved.push('Renewal overwrites first converted_at; unsafe anchor for a 12-month window')
  s.db.tables.affiliates[0].commission_rate = 0.2
  try { await s.pay() } catch (e) { unresolved.push(`Changed live rate breaks initial-payment replay: ${e.message}`) }
}
{
  const s = setup(); await s.signup(); await s.pay()
  s.db.tables.profiles[0].affiliate_id = 'aff-first'
  await s.pay({ externalId: 'in_test_owner_drift', type: 'recurring' })
  if (s.db.tables.affiliate_commissions[1].affiliate_id !== s.db.tables.affiliate_referrals[0].affiliate_id) unresolved.push('Renewal follows mutable profile owner rather than canonical first touch')
}
{
  const s = setup(); await s.signup(); await s.pay()
  // State fixture represents a manually voided/refunded debt; this does NOT
  // simulate Stripe refund dispatch (there is no dedicated handler today).
  s.db.tables.affiliate_commissions[0].status = 'void'
  s.db.tables.affiliate_referrals[0].status = 'signup'
  await s.pay()
  if (s.db.tables.affiliate_referrals[0].status === 'paid') unresolved.push('Replay of void commission re-marks referral paid; refund lifecycle not reconciled')
}
const webhook = ts.createSourceFile('webhook.ts', read('app/api/stripe/webhook/route.ts'), ts.ScriptTarget.Latest, true)
const cases = []
function walk(node) { if (ts.isCaseClause(node) && ts.isStringLiteral(node.expression)) cases.push(node.expression.text); ts.forEachChild(node, walk) }
walk(webhook)
if (!cases.some((c) => /refund|dispute/.test(c))) unresolved.push('No refund/dispute case in current Stripe webhook; no refund end-to-end proof')
console.log(JSON.stringify({ contractChecksPassed: checks, knownFinancialGaps: unresolved, stripeTestPurchase: false, productionWrites: false }, null, 2))
