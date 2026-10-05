// Sprint Showcase Clipes 06/10: executes the real GET and access policy, offline.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROUTE = 'app/api/clips/route.ts'
const NOW = '2026-10-06T12:00:00.000Z'
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [NOW])) }
  static now() { return Date.parse(NOW) }
}
const plain = value => JSON.parse(JSON.stringify(value))
const forbidden = () => { throw Error('Unexpected paid/network/storage operation') }
const deps = {
  '@fal-ai/client': { fal: new Proxy({}, { get: () => forbidden }) },
  '@/lib/credits/debit': { debitVideoCredits: forbidden },
  '@/lib/credits/refund': { refundRenderCredits: forbidden },
  '@/lib/safety/contentModeration': { moderateContent: forbidden },
  '@/lib/safety/moderationPolicy': {},
  '@/lib/animate/remoteImage': { downloadPublicAnimateImage: forbidden },
  '@/lib/serverEvents': { writeServerEvent: forbidden },
  '@/lib/falAlert': {},
  '@/lib/growth/homeClipsFirstServer': { homeVariantStamp: forbidden },
}
async function run({ mutate = null, cutoff = null, rollback = false } = {}) {
  let signedIn = false, reads = 0
  const account = { userId: 'test-person', email: null, plan: 'free', createdAt: NOW, balance: 0 }
  const source = (file, text) => {
    if (cutoff && file === 'lib/enginePlanGate.ts') text = text.replace('2099-01-01T00:00:00.000Z', cutoff)
    if (rollback && file === 'lib/clips/clipLaunch.ts') text = text.replace('CLIP_GUEST_AS_NEW_ACCOUNT = true', 'CLIP_GUEST_AS_NEW_ACCOUNT = false')
    return mutate ? mutate(file, text) : text
  }
  const server = createOfflineLoader({ mocks: deps, globals: { Date: FixedDate }, source })('lib/clips/clipServer.ts')
  const load = createOfflineLoader({
    globals: { Date: FixedDate },
    source,
    mocks: {
      ...deps,
      'next/server': { NextResponse: { json: (body, init = {}) => ({ body: plain(body), status: init.status ?? 200, headers: init.headers }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'test-person' } : null } }) } }) },
      '@/lib/clips/clipServer': {
        ...server,
        clipsAdmin: () => { reads++; return {} },
        loadClipAccount: async () => { reads++; return account },
        listClips: async () => { reads++; return [] },
        submitDepsFor: forbidden,
      },
    },
  })
  const route = load(ROUTE)
  const guest = await route.GET()
  assert.equal(guest.status, 200)
  assert.equal(guest.headers['Cache-Control'], 'no-store')
  assert.equal(guest.body.signed_in, false)
  assert.equal(guest.body.balance, null)
  assert.deepEqual(guest.body.clips, [])
  assert.equal(reads, 0, 'Guest catalog cannot read account, balance or jobs')
  const denied = await route.POST({ json: forbidden, headers: { get: forbidden } })
  assert.equal(denied.status, 401, 'Guest cannot reach paid POST')
  assert.equal(reads, 0)
  signedIn = true
  const fresh = await route.GET()
  assert.equal(fresh.status, 200)
  if (!rollback) {
    assert.deepEqual(guest.body.engines, fresh.body.engines, 'Guest engines = real new account engines, including credit quotes')
    assert.deepEqual(guest.body.effects, fresh.body.effects, 'Guest effects = real new account effects')
  }
  if (!cutoff && !rollback) assert.equal(guest.body.effects.length, 9)
  if (cutoff || rollback) assert.equal(guest.body.effects.length, 2, 'The guest still respects a future gate/rollback')
  assert.ok(!guest.body.engines.some(e => e.key === 'omni' || e.key === 's25'), 'Paused/internal engines stay hidden')
  assert.equal(server.engineAccessFor({ email: null, plan: null, createdAt: null })('kling').ok, false, 'Missing real profile still fails closed')
  return guest.body
}
function checkPrices(source) {
  const fx = source.slice(source.indexOf('{effects.map'), source.indexOf('</section>', source.indexOf('{effects.map')))
  const engines = source.slice(source.indexOf('{engines.map'), source.indexOf('</div>}', source.indexOf('{engines.map')))
  assert.ok(fx.includes('{fx.engine_label}'))
  assert.ok(!/\b(?:credits|seconds)\b/.test(fx), 'Effect cards only show the engine badge')
  assert.ok(!/\bcredits\b|minCost/.test(engines), 'Engine cards do not show prices')
  assert.ok(/photoUrl \? <>\{t\('generate'\)\} · \{effect.credits\} \{t\('credits'\)\}/.test(source))
  assert.ok(/<>\{t\('generate'\)\} · \{cost \?\? '—'\} \{t\('credits'\)\}/.test(source))
  assert.ok(!source.includes('<div className="val">'), 'Price lives on the Generate button')
}

await run()
await run({ cutoff: '2026-01-01T00:00:00.000Z' })
await run({ rollback: true })
const ui = fs.readFileSync('app/(dashboard)/clips/ClipsClient.tsx', 'utf8')
checkPrices(ui)
const mutants = [
  ['null birthdate', ROUTE, 'CLIP_GUEST_AS_NEW_ACCOUNT ? new Date().toISOString() : null', 'null', false],
  ['guest promoted to Studio', ROUTE, 'plan: null, createdAt:', "plan: 'pro', createdAt:", true],
  ['guest bypasses access', ROUTE, 'publicClipEffects((engine) => guest(engine).ok)', 'publicClipEffects(() => true)', true],
  ['anonymous POST loses auth gate', ROUTE, "if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401, headers: NO_STORE })", '', false],
]
for (const [name, file, before, after, withGate] of mutants) {
  assert.ok(fs.readFileSync(file, 'utf8').includes(before), 'Mutation anchor: ' + name)
  await assert.rejects(() => run({
    cutoff: withGate ? '2026-01-01T00:00:00.000Z' : null,
    mutate: (p, text) => p === file ? text.replace(before, after) : text,
  }), undefined, 'Mutant must fail: ' + name)
  console.log('Mutant rejected: ' + name)
}
assert.throws(() => checkPrices(ui.replace('{fx.engine_label}', '{fx.engine_label} {fx.credits} cr')), undefined, 'Card price mutant')
assert.throws(() => checkPrices(ui.replace('{effect.credits}', '')), undefined, 'Missing Generate quote mutant')
console.log('PASS: actual guest GET = new account, 9 effects; active gate, rollback, no billing, 6 mutants.')

