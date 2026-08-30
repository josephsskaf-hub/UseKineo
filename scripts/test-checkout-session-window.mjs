#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }
const throws = (fn, label) => { assert.throws(fn); checks += 1 }

const source = read('lib/growth/checkoutSessionWindow.ts')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleBox = { exports: {} }
vm.runInNewContext(output, {
  module: moduleBox,
  exports: moduleBox.exports,
  require: (id) => { throw new Error(`unmocked import: ${id}`) },
  Number,
  Error,
}, { filename: 'lib/growth/checkoutSessionWindow.ts' })
const policy = moduleBox.exports

equal(policy.CHECKOUT_IDEMPOTENCY_BUCKET_SECONDS, 300, 'idempotency remains in five-minute buckets')
equal(policy.RECURRING_CHECKOUT_WINDOW_HOURS, 24, 'recurring checkout remains available through one day')
equal(policy.RECURRING_CHECKOUT_WINDOW_SECONDS, 86400, 'hour contract and seconds agree')
equal(policy.RECURRING_CHECKOUT_WINDOW_VERSION, 'recurring_checkout_24h_v1', 'experiment has a stable version')
equal(policy.recurringCheckoutExpiresAt(0), 86400, 'epoch bucket receives a full-day expiry')
equal(policy.recurringCheckoutExpiresAt(123), 123 * 300 + 86400, 'expiry is deterministic from the bucket')
throws(() => policy.recurringCheckoutExpiresAt(-1), 'negative buckets fail closed')
throws(() => policy.recurringCheckoutExpiresAt(1.5), 'fractional buckets fail closed')
throws(() => policy.recurringCheckoutExpiresAt(Number.MAX_SAFE_INTEGER + 1), 'unsafe buckets fail closed')

const nowSeconds = 1_788_062_650
const bucket = Math.floor(nowSeconds / policy.CHECKOUT_IDEMPOTENCY_BUCKET_SECONDS)
const remaining = policy.recurringCheckoutExpiresAt(bucket) - nowSeconds
check(remaining <= 24 * 60 * 60, 'Stripe maximum of 24 hours is never exceeded')
check(remaining >= 23 * 60 * 60 + 55 * 60, 'buyer receives at least 23h55m')

const route = read('app/api/stripe/checkout/route.ts')
check(route.includes("from '@/lib/growth/checkoutSessionWindow'"), 'live route imports the executable policy')
check(route.includes('sessionParams.expires_at = recurringCheckoutExpiresAt(checkoutWindow)'), 'live route executes the policy')
check(!route.includes('checkoutWindow * 300 + 2 * 60 * 60'), 'legacy two-hour kill switch is gone')
check(route.includes('checkout_session_window_hours'), 'window is attributable in live checkout')
check(route.includes('checkout_session_window_version'), 'window version is attributable in live checkout')
check(route.includes('expires_at: sessionParams.expires_at'), 'expiry participates in the idempotency signature')
check(route.includes('version: 7'), 'idempotency payload changed with Stripe parameters')
check(route.includes('kineo-sub-v6:'), 'idempotency namespace changed with Stripe parameters')
check(route.includes('checkout_session_window_hours: RECURRING_CHECKOUT_WINDOW_HOURS'), 'checkout_started records the assigned window')

const webhook = read('app/api/stripe/webhook/route.ts')
check(webhook.includes('checkout_session_window_hours: session.metadata?.checkout_session_window_hours ?? null'), 'payment success preserves the window')
check(webhook.includes('checkout_session_window_version: session.metadata?.checkout_session_window_version ?? null'), 'payment success preserves the experiment version')

const resume = read('components/CheckoutResumeBanner.tsx')
check(resume.includes("fetch('/api/stripe/checkout/resume'"), 'existing resume banner can benefit from the longer live session')

const recovery = read('app/api/cron/send-recovery/route.ts')
check(recovery.includes(".from('checkout_abandoned')"), 'existing email remains tied to confirmed Stripe expiry')
check(recovery.includes(".is('recovery_sent_at', null)"), 'existing recovery dedupe remains intact')

console.log(`PASS — ${checks}/${checks} recurring checkout-window checks`)
