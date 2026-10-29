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
const pricing = load('lib/kling4PaidPricing.ts')
const { kling4PaidReplacement } = load('lib/kling4PaidClaim.ts')
const narration = 'The captain opens the blue cabin door. He finds a red map beside the lamp. Outside the ship a silver bird lands.'
const scenes = [
  { prompt: 'Captain opening the blue cabin door.', seconds: 5, approvedStillUrl: 'https://test.invalid/approved-captain.png' },
  { prompt: 'Red map beside a lamp in the same cabin.', seconds: 7, approvedStillUrl: null },
  { prompt: 'A silver bird landing outside the ship.', seconds: 5, approvedStillUrl: 'https://test.invalid/approved-bird.png' },
]

test('central credit quotes meet 40% against the explicit full fallback and extras budget', () => {
  assert.deepEqual([15, 30, 60].map(s => pricing.kling4PaidCredits(s)), [45, 80, 150])
  assert.deepEqual([15, 30, 60].map(s => pricing.kling4PaidFalExtrasMilliUsd(s)), [568, 1036, 1972])
  for (const seconds of [15, 30, 60]) {
    const quote = pricing.kling4PaidBudget(seconds)
    assert.equal(quote.marginFloorMet, true)
    assert.ok(quote.totalMilliUsd <= quote.revenueMilliUsd * 0.6)
    assert.equal(quote.costBasis, 'bounded_fal_calls_plus_nonfal_provision')
  }
})

test('paid switch off preserves Kling3 prices; paid switch on uses the same explicit UI quote', () => {
  const source = readFileSync(join(root, 'lib/credits/engineCost.ts'), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  for (const live of [false, true]) {
    const exports = {}
    vm.runInNewContext(code, { exports, require: name => name.endsWith('kling4PaidPolicy') ? { KLING4_PAID_LIVE: live } : pricing })
    assert.deepEqual([15, 30, 60].map(s => exports.creditCostForDuration('cinematic_hollywood', true, s)), live ? [45, 80, 150] : [38, 75, 150])
    assert.equal(exports.creditCostForDuration('cinematic_ai', true, 60), 35)
  }
})

test('paid browser replacement restores only a frozen complete fallback of the same generation and spoken script', () => {
  for (const seconds of [15, 30, 60]) {
    const count = seconds / 5
    const words = narration.split(/\s+/)
    const lines = Array.from({ length: count }, (_, i) => words.slice(Math.round(i * words.length / count), Math.round((i + 1) * words.length / count)).join(' '))
    const response = { generationId: 'paid-same-generation', quality: 'cinematic_hollywood', duration: seconds, voiceover_script: narration,
      kling4_paid: { version: 'kling4_paid_2810', promo: true, seconds, engine_used: 'seedance15_fallback',
        fallback_finalized: true, fallback_budget_reserved: true, original_request_ids: Array.from({ length: seconds / 15 }, (_, i) => `original-${i}`) },
      fal_request_ids: Array.from({ length: count }, (_, i) => `backup-${i}`), fal_models: Array(count).fill('fal-ai/bytedance/seedance/v1.5/pro/text-to-video'),
      scenes: Array(count).fill('A directed shot.'), scene_captions: lines, scene_narrations: lines,
      scene_seconds: Array(count).fill(5), scene_engines: Array(count).fill('cinematic'), scene_dialogues: Array(count).fill(null) }
    assert.equal(kling4PaidReplacement(response, 'paid-same-generation'), response)
    assert.equal(kling4PaidReplacement(response, 'another-generation'), null)
    assert.equal(kling4PaidReplacement({ ...response, duration: 90 }, 'paid-same-generation'), null)
    assert.equal(kling4PaidReplacement({ ...response, scene_narrations: lines.map(() => 'Changed speech') }, 'paid-same-generation'), null)
    assert.equal(kling4PaidReplacement({ ...response, fal_models: Array(count).fill('kling/v4/text-to-video') }, 'paid-same-generation'), null)
    assert.equal(kling4PaidReplacement({ ...response, kling4_paid: { ...response.kling4_paid, fallback_finalized: false } }, 'paid-same-generation'), null)
  }
})

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

function paidRouteFixture({ seconds = 30, free = false, uncertain = false, existing = false } = {}) {
  const source = readFileSync(join(root, 'app/api/generate-video-cinematic/route.ts'), 'utf8').replace(/\r\n/g, '\n')
  const start = source.indexOf('      if (paidKling4) {\n        // The approved plan')
  const end = source.indexOf('      // ═══ KINEO-VOZ-NA-BOCA-2026-09-11 — LIGADO POR PADRÃO', start)
  assert.ok(start > 0 && end > start)
  const code = ts.transpileModule(`async function run() { let providerSubmissionMayExist=false; let cinematicSubmissionUncertain=false;
    ${source.slice(start, end)} } exports.run=run;`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const counts = { image: 0, critique: 0, post: 0, accepted: 0, bound: 0 }
  const dispatch = { totalPosts: 0 }
  const expectedModels = prepare({ seconds, narration, scenes: scenes.map((scene, i) => ({ ...scene, approvedStillUrl: i === 0 ? 'https://test.invalid/approved.png' : null })) }).map(chunk => chunk.model)
  const box = { exports: {}, paidKling4: true, verbatim: true, parsedScript: { narration, speed: 1 }, plan: { scenes, styleSheet: 'Natural light.' },
    eraSuffix: '', generationSeed: 42, user: { id: '00000000-0000-4000-8000-000000000001' }, generationId: 'paid-route-test',
    cinematicAdmin: {}, duration: seconds, requestedDuration: seconds, narrationLanguage: { language: 'en' },
    prompt: 'An adventure at sea.', claimQuality: 'cinematic_hollywood', cost: free ? 0 : pricing.kling4PaidCredits(seconds),
    paidKling4Promo: { isFree: free, reason: free ? 'ok' : 'cap' }, process: { env: { FAL_KEY: 'offline-test' } },
    silenciarFalaNoPrompt: value => value, prepareKling4PaidFilm: prepare, kling4PaidBudget: pricing.kling4PaidBudget,
    generateCinematicSceneStill: async () => { counts.image++; return 'https://test.invalid/approved.png' },
    novoFilmeDoCritico: () => ({}),
    criticarStill: async (_args, deps) => { counts.critique++; assert.equal(deps.maxRegeracoesCena, 0); return { relato: { veredito: 'PASS' } } },
    writeServerEvent: async () => true, STILL_CRITIC_EVENTO: 'cinematic_still_critic', ctxDespacho: () => dispatch,
    claimKling4PaidSlot: async (_db, i) => existing ? { code: 'existing', state: 'accepted', requestId: `existing-${i.index}`, model: expectedModels[i.index] } : { code: 'claimed', token: 'offline-token' },
    finishKling4PaidSlot: async () => { counts.bound++; return true },
    recordKling4PaidUse: async () => { counts.accepted++; return true },
    submitKling4TrialVideo: async (args, deps) => {
      counts.post++; deps.onPost(); if (uncertain) throw new Error('lost receipt')
      return { requestId: `new-${counts.post}`, model: args.approvedStills[0] ? 'kling/v4/image-to-video' : 'kling/v4/text-to-video' }
    },
    publishCinematicResponse: async (response, ids, models) => ({ response, ids, models }),
  }
  vm.runInNewContext(code, box, { timeout: 5000 })
  return { run: box.exports.run, counts }
}

test('real paid route branch queues the signed full 15/30/60 film and one approved still only', async () => {
  for (const seconds of [15, 30, 60]) {
    const fixture = paidRouteFixture({ seconds, free: true })
    const { response, ids, models } = await fixture.run()
    assert.equal(response.credits_charged, 0)
    assert.equal(response.kling4_paid.promo, true)
    assert.equal(response.kling4_paid.fallback_budget_reserved, true)
    assert.equal(response.engine_label, 'Kling 4.0')
    assert.equal(response.voiceover_script, narration)
    assert.equal(response.scene_narrations.join(' '), narration)
    assert.equal(ids.length, seconds / 15)
    assert.ok(models.every(model => model.startsWith('kling/v4/')))
    assert.equal(fixture.counts.image, 1)
    assert.equal(fixture.counts.critique, 1)
    assert.equal(fixture.counts.post, seconds / 15)
  }
})

test('real paid route preserves uncertain first receipts and reuses durable receipts without reposting', async () => {
  const lost = paidRouteFixture({ seconds: 60, uncertain: true })
  const first = await lost.run()
  assert.equal(lost.counts.post, 1)
  assert.equal(lost.counts.bound, 1)
  assert.ok(first.ids.every(id => id === null))
  assert.equal(first.response.kling4_paid.engine_used, 'kling4')
  const replay = paidRouteFixture({ seconds: 60, existing: true })
  const again = await replay.run()
  assert.equal(replay.counts.post, 0)
  assert.deepEqual(JSON.parse(JSON.stringify(again.ids)), ['existing-0', 'existing-1', 'existing-2', 'existing-3'])
})
