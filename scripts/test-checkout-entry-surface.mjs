#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel) {
  const output = ts.transpileModule(read(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'URL', output)(
    (id) => { throw new Error(`unexpected import: ${id}`) },
    module,
    module.exports,
    URL,
  )
  return module.exports
}

let checks = 0
const equal = (actual, expected, message) => {
  assert.equal(actual, expected, message)
  checks++
}
const ok = (value, message) => {
  assert.ok(value, message)
  checks++
}

const policy = loadTs('lib/growth/checkoutEntrySurface.ts')
const classify = (referer) => policy.classifyCheckoutEntrySurface(referer, 'https://www.usekineo.com')

equal(policy.CHECKOUT_ENTRY_SURFACE_VERSION, 'checkout_entry_surface_v1', 'version is stable')
equal(classify(null), 'missing', 'missing Referer is explicit')
equal(classify('not a url'), 'invalid', 'malformed Referer fails closed')
equal(classify('https://example.com/pricing'), 'cross_origin', 'cross-origin Referer is never trusted')
equal(classify('https://www.usekineo.com/'), 'home', 'home is classified')
equal(classify('https://www.usekineo.com/pricing?prompt=never-store-this'), 'pricing', 'query string never changes or leaks from pricing')
equal(classify('https://www.usekineo.com/pricing/'), 'pricing', 'trailing slash is normalized')
equal(classify('https://www.usekineo.com/checkout/cancelled?tier=pro'), 'checkout_cancelled', 'cancel recovery is distinct')
equal(classify('https://www.usekineo.com/signup'), 'signup', 'signup is distinct')
equal(classify('https://www.usekineo.com/login'), 'login', 'login is distinct')
equal(classify('https://www.usekineo.com/dashboard'), 'dashboard_home', 'dashboard home is distinct')
equal(classify('https://www.usekineo.com/studio'), 'studio', 'studio launcher is distinct')
equal(classify('https://www.usekineo.com/studio/create?prompt=secret'), 'studio_create', 'creation page is classified without query data')
equal(classify('https://www.usekineo.com/history'), 'history', 'history is distinct')
equal(classify('https://www.usekineo.com/account'), 'account', 'account is distinct')
equal(classify('https://www.usekineo.com/audio'), 'dashboard_tool', 'dashboard tools share a closed bucket')
equal(classify('https://www.usekineo.com/ai-video-generator'), 'public_landing', 'SEO pages share a closed public bucket')
equal(
  policy.classifyCheckoutEntrySurface('https://usekineo.com/pricing', 'https://usekineo.com'),
  'pricing',
  'classification follows the request origin without hardcoding a legacy host',
)

const route = read('app/api/stripe/checkout/route.ts')
ok(route.includes("from '@/lib/growth/checkoutEntrySurface'"), 'real checkout route imports the policy')
ok(route.includes("req.headers.get('referer')"), 'real request supplies its Referer')
ok(route.includes('checkout_entry_surface: checkoutEntrySurface'), 'server event metadata receives the closed surface')
ok(route.includes('checkout_entry_surface_version: CHECKOUT_ENTRY_SURFACE_VERSION'), 'server event metadata receives the version')
equal((route.match(/req\.headers\.get\('referer'\)/g) ?? []).length, 1, 'raw Referer is read in one audited place')
equal((route.match(/checkout_entry_surface:/g) ?? []).length, 1, 'entry surface is attached only to event context')
equal(route.includes('referer:'), false, 'raw Referer is never written as metadata')

console.log(`Checkout entry surface: ${checks}/${checks} checks passed`)
