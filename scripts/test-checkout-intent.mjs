import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const sourcePath = path.join(root, 'lib/growth/checkoutIntent.ts')
const routePath = path.join(root, 'app/api/stripe/checkout/route.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const route = fs.readFileSync(routePath, 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const module = { exports: {} }
const context = vm.createContext({ module, exports: module.exports, require: createRequire(import.meta.url) })
new vm.Script(output, { filename: sourcePath }).runInContext(context)
const { classifyCheckoutIntent, checkoutIntentMetadata } = module.exports

const cases = [
  [{ videosOk: 2, creditsIntact: true, hadFinishedScript: false }, 'desire'],
  [{ videosOk: 1, creditsIntact: null, hadFinishedScript: null }, 'desire'],
  [{ videosOk: 0, creditsIntact: true, hadFinishedScript: true }, 'ready_script'],
  [{ videosOk: 0, creditsIntact: false, hadFinishedScript: true }, 'ready_script'],
  [{ videosOk: 0, creditsIntact: true, hadFinishedScript: false }, 'activation_defect'],
  [{ videosOk: 0, creditsIntact: false, hadFinishedScript: false }, 'unknown'],
  [{ videosOk: 0, creditsIntact: null, hadFinishedScript: false }, 'unknown'],
  [{ videosOk: null, creditsIntact: true, hadFinishedScript: false }, 'unknown'],
  [{ videosOk: 0, creditsIntact: true, hadFinishedScript: null }, 'unknown'],
]

let passed = 0
for (const [input, expected] of cases) {
  assert.equal(classifyCheckoutIntent(input), expected)
  passed += 1
}

const metadata = checkoutIntentMetadata({ videosOk: 0, creditsIntact: true, hadFinishedScript: true })
assert.equal(JSON.stringify(metadata), JSON.stringify({
  checkout_intent_class: 'ready_script',
  checkout_intent_classifier: 'checkout-intent-v1',
  videos_ok: 0,
  credits_intact: true,
  had_finished_script: true,
}))
passed += 1

assert.match(route, /readCheckoutIntentSnapshot\(user\.id, browserSessionId, profile\)/)
assert.match(route, /\.eq\('status', 'completed'\)/)
assert.match(route, /metadata\.input_type === 'finished_script'/)
assert.match(route, /metadata\.script_mode === 'verbatim'/)
assert.match(route, /\.eq\('session_id', browserSessionId\)/)
assert.match(route, /\.\.\.checkoutIntentMetadata\(intentSnapshot\)/)
assert.doesNotMatch(route, /had_finished_script:\s*(?:topic|prompt|script)/)
passed += 7

console.log(`checkout-intent: ${passed}/${passed}`)
