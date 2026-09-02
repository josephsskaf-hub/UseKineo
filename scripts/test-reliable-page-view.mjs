import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const helperPath = path.join(repoRoot, 'lib', 'growth', 'reliablePageView.ts')
const clientPath = path.join(repoRoot, 'app', 'ai-shorts-for-agencies', 'AgencyPacksClient.tsx')
const helperSource = fs.readFileSync(helperPath, 'utf8')
const clientSource = fs.readFileSync(clientPath, 'utf8')

const output = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const sandbox = {
  exports: {}, module: { exports: {} }, Promise, Set, Map, Math,
  Number, Array, window: { setTimeout },
}
sandbox.module.exports = sandbox.exports
vm.runInNewContext(output, sandbox, { filename: helperPath })
const { createReliableViewRecorder } = sandbox.module.exports

let passed = 0
async function test(name, fn) {
  await fn()
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

function memoryStorage({ throws = false, initial = {} } = {}) {
  const values = new Map(Object.entries(initial))
  let writes = 0
  return {
    get writes() { return writes },
    getItem(key) {
      if (throws) throw new Error('storage denied')
      return values.get(key) ?? null
    },
    setItem(key, value) {
      if (throws) throw new Error('storage denied')
      writes += 1
      values.set(key, value)
    },
  }
}

await test('false then true performs exactly two transports and one acknowledgement write', async () => {
  const storage = memoryStorage()
  let transports = 0
  const recorder = createReliableViewRecorder({ wait: async () => {} })
  const result = await recorder.record({
    marker: 'entry:direct:v3', storage, send: async () => (++transports === 2),
  })
  assert.equal(result, true)
  assert.equal(transports, 2)
  assert.equal(storage.writes, 1)
})

await test('concurrent mounts share one transport and one stored denominator', async () => {
  const storage = memoryStorage()
  let transports = 0
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const recorder = createReliableViewRecorder({ wait: async () => {} })
  const send = async () => { transports += 1; await gate; return true }
  const first = recorder.record({ marker: 'entry:planner:v3', storage, send })
  const second = recorder.record({ marker: 'entry:planner:v3', storage, send })
  release()
  assert.deepEqual(await Promise.all([first, second]), [true, true])
  assert.equal(transports, 1)
  assert.equal(storage.writes, 1)
})

await test('remount after acknowledgement sends nothing', async () => {
  const storage = memoryStorage()
  let transports = 0
  const recorder = createReliableViewRecorder({ wait: async () => {} })
  const send = async () => { transports += 1; return true }
  assert.equal(await recorder.record({ marker: 'entry:brief:v3', storage, send }), true)
  assert.equal(await recorder.record({ marker: 'entry:brief:v3', storage, send }), true)
  assert.equal(transports, 1)
})

await test('legacy preclaim cannot suppress the first acknowledged v3 view', async () => {
  const storage = memoryStorage({ initial: { 'kineo:agency-bulk-page:viewed:v2:direct': '1' } })
  let transports = 0
  const recorder = createReliableViewRecorder({ wait: async () => {} })
  assert.equal(await recorder.record({
    marker: 'kineo:agency-bulk-page:viewed:v3:direct',
    storage,
    send: async () => { transports += 1; return true },
  }), true)
  assert.equal(transports, 1)
  assert.equal(storage.writes, 1)
})

await test('storage denial still deduplicates after a server acknowledgement', async () => {
  const storage = memoryStorage({ throws: true })
  let transports = 0
  const recorder = createReliableViewRecorder({ wait: async () => {} })
  const send = async () => { transports += 1; return true }
  assert.equal(await recorder.record({ marker: 'entry:direct:v3', storage, send }), true)
  assert.equal(await recorder.record({ marker: 'entry:direct:v3', storage, send }), true)
  assert.equal(transports, 1)
})

await test('two failed attempts do not poison a later visit', async () => {
  const recorder = createReliableViewRecorder({ wait: async () => {} })
  let transports = 0
  assert.equal(await recorder.record({
    marker: 'entry:direct:v3', send: async () => { transports += 1; return false },
  }), false)
  assert.equal(transports, 2)
  assert.equal(await recorder.record({
    marker: 'entry:direct:v3', send: async () => { transports += 1; return true },
  }), true)
  assert.equal(transports, 3)
})

await test('attempt budget is bounded at two even if a caller asks for more', async () => {
  const recorder = createReliableViewRecorder({ wait: async () => {} })
  let transports = 0
  assert.equal(await recorder.record({
    marker: 'entry:alternative:v3', maxAttempts: 99,
    send: async () => { transports += 1; return false },
  }), false)
  assert.equal(transports, 2)
})

await test('unmount after first failure prevents the retry', async () => {
  let releaseWait
  const waiting = new Promise((resolve) => { releaseWait = resolve })
  const recorder = createReliableViewRecorder({ wait: async () => waiting })
  const controller = new AbortController()
  let transports = 0
  const result = recorder.record({
    marker: 'entry:unmount:v3', signal: controller.signal,
    send: async () => { transports += 1; return false },
  })
  await Promise.resolve()
  controller.abort()
  releaseWait()
  assert.equal(await result, false)
  assert.equal(transports, 1)
})

await test('StrictMode remount keeps retry alive through the second active lifetime', async () => {
  const first = new AbortController()
  const second = new AbortController()
  let transports = 0
  const recorder = createReliableViewRecorder({ wait: async () => {} })
  const send = async () => { transports += 1; return transports === 2 }
  const firstResult = recorder.record({ marker: 'entry:strict:v3', signal: first.signal, send })
  const secondResult = recorder.record({ marker: 'entry:strict:v3', signal: second.signal, send })
  first.abort()
  assert.deepEqual(await Promise.all([firstResult, secondResult]), [true, true])
  assert.equal(transports, 2)
})

await test('live caller uses v3 post-ack lifecycle recorder without changing the visible surface', async () => {
  assert.match(clientSource, /VIEW_MARKER = 'kineo:agency-bulk-page:viewed:v3'/)
  assert.doesNotMatch(clientSource, /VIEW_MARKER = 'kineo:agency-bulk-page:viewed:v2'/)
  assert.match(clientSource, /createReliableViewRecorder/)
  assert.match(clientSource, /const controller = new AbortController\(\)/)
  assert.match(clientSource, /signal:\s*controller\.signal/)
  assert.match(clientSource, /return \(\) => controller\.abort\(\)/)
  assert.match(clientSource, /agencyBulkViewRecorder\.record\(/)
  assert.match(clientSource, /send:\s*\(\)\s*=>\s*trackEvent\('agency_bulk_page_viewed'/)
  assert.doesNotMatch(clientSource, /sessionStorage\.setItem\(marker, '1'\)[\s\S]{0,300}trackEvent\('agency_bulk_page_viewed'/)
  assert.match(clientSource, /entry:\s*entry \?\? 'direct'/)
  assert.match(clientSource, /pack_count:\s*packs\.length/)
  assert.match(clientSource, /href=\{`\/api\/stripe\/checkout\?pack=\$\{pack\.id\}`\}/)
})

console.log(`\n${passed}/${passed} reliable page-view checks passed`)
