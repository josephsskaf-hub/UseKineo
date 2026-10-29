// Offline contract tests. All provider calls are dependency-injected and never sent.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const modules = new Map()
const forbidden = () => { throw new Error('Offline guard forbids network access') }
function load(path) {
  if (modules.has(path)) return modules.get(path)
  const exports = {}
  modules.set(path, exports)
  const code = ts.transpileModule(readFileSync(join(root, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, { exports, fetch: forbidden, AbortSignal, URL, Date,
    require: specifier => specifier.startsWith('@/') ? load(specifier.slice(2) + '.ts') : forbidden(),
  }, { filename: path, timeout: 5000 })
  return exports
}
const { prepareKling4PaidFilm: prepare, submitKling4PaidFilm: submit } = load('lib/kling4PaidFilm.ts')
const narration = 'The captain opens the blue cabin door. He finds a red map beside the lamp. Outside the ship a silver bird lands.'
const scenes = [
  { prompt: 'Captain opening the blue cabin door.', seconds: 5, approvedStillUrl: 'https://test.invalid/approved-captain.png' },
  { prompt: 'Red map beside a lamp in the same cabin.', seconds: 7, approvedStillUrl: null },
  { prompt: 'A silver bird landing outside the ship.', seconds: 5, approvedStillUrl: 'https://test.invalid/approved-bird.png' },
]

test('15/30/60 preserve all spoken words and exact paid provider seconds', () => {
  for (const seconds of [15, 30, 60]) {
    const chunks = prepare({ seconds, narration, scenes })
    assert.equal(chunks.length * 15, seconds)
    assert.equal(chunks.map(c => c.narration).join(' '), narration)
    assert.ok(chunks.every(c => c.input.duration === 15 && c.input.resolution === '720p'))
    assert.ok(chunks.every(c => c.input.multi_prompt.reduce((sum, p) => sum + p.duration, 0) === 15))
    assert.ok(chunks.every(c => c.input.multi_prompt.every(p => Array.from(p.prompt).length <= 512)))
    const prompts = chunks.flatMap(c => c.prompts).join(' ')
    for (const scene of scenes) assert.ok(prompts.includes(scene.prompt))
  }
})

test('unsupported duration, empty narration, invalid scene or excessively fragmented chunks are refused', () => {
  for (const seconds of [0, 14, 16, 35, 90, NaN, Infinity]) assert.throws(() => prepare({ seconds, narration, scenes }))
  assert.throws(() => prepare({ seconds: 15, narration: '', scenes }))
  assert.throws(() => prepare({ seconds: 15, narration, scenes: [{ prompt: 'test', seconds: NaN }] }))
  assert.throws(() => prepare({ seconds: 15, narration, scenes: Array.from({ length: 16 }, () => ({ prompt: 'test', seconds: 1 })) }))
})

test('queue submission returns receipts without polling and binds each one before next POST', async () => {
  const chunks = prepare({ seconds: 60, narration, scenes })
  const order = []
  const jobs = await submit(chunks, { apiKey: 'offline-test',
    submit: async args => {
      const index = order.filter(x => x.startsWith('post')).length
      order.push(`post-${index}`)
      assert.deepEqual(JSON.parse(JSON.stringify(args.prompts)), JSON.parse(JSON.stringify(chunks[index].prompts)))
      return { requestId: `test-job-${index}`, model: chunks[index].model, submittedAt: '2026-10-28T12:00:00Z' }
    },
    onAccepted: async (chunk, job) => { order.push(`bind-${chunk.index}`); assert.equal(job.requestId, `test-job-${chunk.index}`) },
  })
  assert.equal(jobs.length, 4)
  assert.deepEqual(order, ['post-0', 'bind-0', 'post-1', 'bind-1', 'post-2', 'bind-2', 'post-3', 'bind-3'])
})

test('uncertain POST and durable-binding errors stop without retry or later paid chunks', async () => {
  const chunks = prepare({ seconds: 60, narration, scenes })
  let posts = 0
  await assert.rejects(submit(chunks, { apiKey: 'offline-test', submit: async () => {
    posts++; throw new Error('lost receipt')
  }, onAccepted: async () => forbidden() }))
  assert.equal(posts, 1)
  posts = 0
  await assert.rejects(submit(chunks, { apiKey: 'offline-test', submit: async () => {
    posts++; return { requestId: 'accepted', model: chunks[0].model, submittedAt: '2026-10-28T12:00:00Z' }
  }, onAccepted: async () => { throw new Error('database unavailable') } }))
  assert.equal(posts, 1)
})

test('tampered later input or missing API configuration fails before any provider submission', async () => {
  let posts = 0
  const deps = { apiKey: 'offline-test', submit: async () => { posts++; return {} }, onAccepted: async () => {} }
  const chunks = prepare({ seconds: 30, narration, scenes })
  chunks[1].input.duration = 60
  await assert.rejects(submit(chunks, deps))
  await assert.rejects(submit(prepare({ seconds: 30, narration, scenes }), { ...deps, apiKey: '' }))
  assert.equal(posts, 0)
})
