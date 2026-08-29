#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${rel} imported unexpected module: ${id}`) },
    module,
    module.exports,
  )
  return module.exports
}

const { buildSourceConversionFunnel } = loadTs('lib/admin/sourceConversionFunnel.ts')
let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

const rows = buildSourceConversionFunnel(
  [
    { id: 'gpt-paid', source: 'chatgpt' },
    { id: 'gpt-drop', source: 'chatgpt' },
    { id: 'gpt-video', source: 'chatgpt' },
    { id: 'gpt-signup', source: 'chatgpt' },
    { id: 'gpt-paid', source: 'chatgpt' }, // duplicate profile row must not inflate a person
    { id: 'taaft-paid', source: 'taaft' },
    { id: 'direct-checkout-only', source: 'direct' },
  ],
  new Set(['gpt-paid', 'gpt-drop', 'gpt-video', 'taaft-paid']),
  new Set(['gpt-paid', 'gpt-drop', 'taaft-paid', 'direct-checkout-only']),
  new Set(['gpt-paid', 'taaft-paid', 'gpt-video']),
)

equal(rows.map((row) => row.source), ['chatgpt', 'direct', 'taaft'], 'sources sort by unique signup people then name')
const chatgpt = rows.find((row) => row.source === 'chatgpt')
ok(chatgpt, 'ChatGPT source exists')
equal(chatgpt.signups, 4, 'duplicate profile rows count one person')
equal(chatgpt.completedVideos, 3, 'completed video stage counts people')
equal(chatgpt.checkoutAfterVideo, 2, 'checkout is nested inside completed-video people')
equal(chatgpt.paidAfterCheckout, 1, 'paid is nested inside checkout people')
equal(chatgpt.signupToVideoRate, '75.0%', 'signup to delivered video rate is exact')
equal(chatgpt.videoToCheckoutRate, '66.7%', 'delivered video to checkout rate is exact')
equal(chatgpt.checkoutToPaidRate, '50.0%', 'checkout to paid rate is exact')

const direct = rows.find((row) => row.source === 'direct')
equal(direct.checkoutAfterVideo, 0, 'checkout without a completed video is not smuggled into the path')
equal(direct.videoToCheckoutRate, '—', 'zero video denominator stays unknown, never infinity')

equal(rows.every((row) => row.completedVideos <= row.signups), true, 'video stage is monotonic')
equal(rows.every((row) => row.checkoutAfterVideo <= row.completedVideos), true, 'checkout stage is monotonic')
equal(rows.every((row) => row.paidAfterCheckout <= row.checkoutAfterVideo), true, 'paid stage is monotonic')

const route = source('app/api/admin/funnel/route.ts')
const client = source('app/(dashboard)/admin/funnel/FunnelClient.tsx')
ok(route.includes('buildSourceConversionFunnel('), 'executed API route calls the person-level helper')
ok(route.includes('for (const session of externalSubscriptionSessions)'), 'real Stripe checkout sessions join the checkout actor set')
ok(route.includes('clickEventsAvailable || identityEventsAvailable || stripeSessionsAvailable'), 'checkout availability is explicit rather than false zero')
ok(route.includes('identityEventsAvailable || stripeSessionsAvailable || stripeSubscriptionsAvailable'), 'payment availability is explicit rather than false zero')
ok(client.includes('First-touch source → delivered video → subscription'), 'admin names the complete first-touch path')
ok(client.includes("src.source === 'chatgpt'"), 'ChatGPT is highlighted as the active acquisition focus')
ok(client.includes('Video + checkout'), 'admin exposes the missing checkout stage')
ok(client.includes("sourceConversion.checkoutAvailable ? fmt(src.checkoutAfterVideo) : '—'"), 'unavailable checkout data renders unknown, not zero')
ok(client.includes('Unique external people.'), 'UI declares the counting unit')

console.log(`source-conversion-funnel: ${checks}/${checks} checks passed`)
