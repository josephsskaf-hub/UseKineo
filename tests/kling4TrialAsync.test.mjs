// Execute the asynchronous status coordinator offline. No provider calls or production database.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import * as crypto from 'node:crypto'

const root = resolve(process.env.KLING4_TEST_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..'))
const ts = createRequire(import.meta.url)('typescript')
const read = path => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const forbidden = () => { throw new Error('Offline async guard forbids unmocked network, timer or SDK access') }
const START = Date.parse('2026-10-28T12:00:00.000Z')
const KLING = 'kling/v4/image-to-video'
const SEEDANCE = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
const VIDEO = 'https://fal.media/test/kling-completed.mp4'
const clone = value => JSON.parse(JSON.stringify(value))

function offline(extra = {}, { env = {}, fetchImpl = forbidden } = {}) {
  const mocks = {
    'node:crypto': crypto,
    '@/lib/kling4TrialFallback': { ensureKling4TrialFallback: forbidden },
    ...extra,
  }
  const cache = new Map()
  const load = path => {
    if (cache.has(path)) return cache.get(path)
    const exports = {}; cache.set(path, exports)
    const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    vm.runInNewContext(code, {
      exports, console, URL, AbortController, AbortSignal, Response, Request, Buffer,
      fetch: fetchImpl, setTimeout: forbidden, clearTimeout() {}, process: { env },
      require(specifier) {
        if (Object.hasOwn(mocks, specifier)) return mocks[specifier]
        if (specifier.startsWith('@/')) return load(specifier.slice(2) + '.ts')
        if (specifier.startsWith('.')) return load(join(dirname(path), specifier) + '.ts')
        return forbidden()
      },
    }, { filename: path, timeout: 5000 })
    return exports
  }
  return load
}

function birth() {
  const marker = {
    version: 'kling4_trial_2810', engine_used: 'kling4', cost_usd: 2.355, country: 'BR',
    original_request_id: 'original-kling-id', submitted_at: new Date(START).toISOString(),
    fallback_scenes: [0, 1, 2].map(index => ({ prompt: 'Original scene ' + index, duration: 6 })),
    fallback_response: { scenes: ['Scene zero', 'Scene one', 'Scene two'], scene_captions: ['', '', ''], scene_prompts: ['Original scene 0', 'Original scene 1', 'Original scene 2'], clip_seconds: [6, 6, 6], clip_word_starts: [0, 5, 10] },
  }
  return {
    userId: 'test-user', generationId: 'test-film', quality: 'cinematic_ai', engine: 'seedance', status: 'settled',
    falRequestIds: ['original-kling-id'], falModels: [KLING], authorizedCompletedUrls: [null],
    response: { generationId: 'test-film', quality: 'cinematic_ai', duration: 15, aspect: '9:16', fal_request_ids: ['original-kling-id'], fal_models: [KLING], kling4_trial: marker },
  }
}
const args = (claim, age = 180000) => ({ db: {}, secret: 'offline-placeholder', userId: claim.userId, generationId: claim.generationId, claim, now: START + age })

function fallbackClaim(claim, ids = ['seedance-0', 'seedance-1', 'seedance-2'], ambiguous = false) {
  return {
    ...claim, falRequestIds: ids, falModels: ids.map(() => SEEDANCE), authorizedCompletedUrls: ids.map(() => null),
    response: { ...claim.response, ...claim.response.kling4_trial.fallback_response,
      fal_request_ids: ids, fal_models: ids.map(() => SEEDANCE), fal_model: SEEDANCE,
      kling4_trial: { ...claim.response.kling4_trial, engine_used: 'seedance15_fallback', fallback_finalized: true, fallback_ambiguous: ambiguous } },
  }
}

test('a three-minute queued Kling job keeps waiting instead of starting Seedance', async () => {
  const { advanceKling4TrialStatus, KLING4_TRIAL_FALLBACK_AFTER_MS } = offline()('lib/kling4TrialAsyncStatus.ts')
  assert.equal(KLING4_TRIAL_FALLBACK_AFTER_MS, 8 * 60000)
  for (const [age, status] of [[3 * 60000, 'pending'], [8 * 60000 - 1, 'processing']]) {
    let polls = 0, fallbacks = 0
    const claim = birth()
    const result = await advanceKling4TrialStatus(args(claim, age), {
      poll: async () => { polls++; return { status, url: null } },
      fallback: async () => { fallbacks++; throw new Error('unexpected fallback') },
    })
    assert.equal(result.kind, 'pending')
    assert.deepEqual(clone(result.claim.falRequestIds), ['original-kling-id'])
    assert.equal(polls, 1)
    assert.equal(fallbacks, 0)
  }
})

test('terminal provider failure and the eight-minute deadline initiate fallback for distinct reasons', async () => {
  const { advanceKling4TrialStatus } = offline()('lib/kling4TrialAsyncStatus.ts')
  for (const [age, reason] of [[180000, 'provider_failed'], [480000, 'timeout']]) {
    const claim = birth(), replacement = fallbackClaim(claim)
    let polls = 0, fallbacks = 0
    const result = await advanceKling4TrialStatus(args(claim, age), {
      poll: async () => { polls++; return { status: 'failed', url: null } },
      fallback: async input => { fallbacks++; assert.equal(input.reason, reason); return { ok: true, pending: false, claim: replacement } },
    })
    assert.equal(result.kind, 'ordinary')
    assert.equal(result.claim.response.kling4_trial.engine_used, 'seedance15_fallback')
    assert.equal(fallbacks, 1)
    assert.equal(polls, reason === 'timeout' ? 0 : 1, 'at the real deadline no extra supplier poll is necessary')
    const again = await advanceKling4TrialStatus(args(result.claim, 490000), { poll: forbidden, fallback: forbidden })
    assert.equal(again.kind, 'ordinary', 'a retargeted film never starts fallback a second time')
  }
})

test('a completed Kling result goes directly to authorized delivery without fallback', async () => {
  const { advanceKling4TrialStatus } = offline()('lib/kling4TrialAsyncStatus.ts')
  const result = await advanceKling4TrialStatus(args(birth()), { poll: async () => ({ status: 'done', url: VIDEO }), fallback: forbidden })
  assert.equal(result.kind, 'kling_done')
  assert.equal(result.url, VIDEO)
  assert.equal(result.claim.response.kling4_trial.engine_used, 'kling4')
})

test('transient polling transport errors and unavailable fallback persistence never kill the film', async () => {
  const { advanceKling4TrialStatus } = offline()('lib/kling4TrialAsyncStatus.ts')
  const claim = birth()
  assert.equal((await advanceKling4TrialStatus(args(claim), { poll: async () => { throw new Error('503 status unavailable') }, fallback: forbidden })).kind, 'pending')
  assert.equal((await advanceKling4TrialStatus(args(claim), { poll: async () => ({ status: 'failed', url: null }), fallback: async () => ({ ok: false, pending: true, claim }) })).kind, 'pending')
})

test('old synchronous and previously authorized results remain deliverable without repolling', async () => {
  const { advanceKling4TrialStatus } = offline()('lib/kling4TrialAsyncStatus.ts')
  for (const mode of ['signed_url', 'authorized']) {
    const claim = birth()
    if (mode === 'signed_url') claim.response.kling4_trial.video_url = VIDEO
    else claim.authorizedCompletedUrls = [VIDEO]
    const result = await advanceKling4TrialStatus(args(claim, 900000), { poll: forbidden, fallback: forbidden })
    assert.equal(result.kind, 'kling_done')
    assert.equal(result.url, VIDEO)
  }
})

test('a completed Kling authorization wins a simultaneous timeout fallback race', async () => {
  const { advanceKling4TrialStatus } = offline()('lib/kling4TrialAsyncStatus.ts')
  const claim = birth(), completed = birth(); completed.authorizedCompletedUrls = [VIDEO]
  const result = await advanceKling4TrialStatus(args(claim, 480000), {
    poll: forbidden, fallback: async () => ({ ok: true, claim: completed, pending: false, noAccepted: false }),
  })
  assert.equal(result.kind, 'kling_done')
  assert.equal(result.url, VIDEO)
})

test('once fallback has started, polls resume that durable operation without accepting a late Kling result', async () => {
  const { advanceKling4TrialStatus } = offline()('lib/kling4TrialAsyncStatus.ts')
  const claim = birth(); claim.response.kling4_trial.fallback_started = true; claim.response.kling4_trial.fallback_reason = 'provider_failed'
  let fallbacks = 0
  const result = await advanceKling4TrialStatus(args(claim, 180000), {
    poll: forbidden,
    fallback: async () => { fallbacks++; return { ok: true, pending: false, claim: fallbackClaim(claim), noAccepted: false } },
  })
  assert.equal(result.kind, 'ordinary')
  assert.equal(fallbacks, 1)
})

test('only three attempted fallback scenes with no accepted receipt close as an empty fallback', async () => {
  const { advanceKling4TrialStatus } = offline()('lib/kling4TrialAsyncStatus.ts')
  const claim = birth(), empty = fallbackClaim(claim, [null, null, null])
  const result = await advanceKling4TrialStatus(args(claim, 480000), {
    poll: forbidden, fallback: async () => ({ ok: true, claim: empty, pending: false, noAccepted: true }),
  })
  assert.equal(result.kind, 'fallback_empty')
  assert.equal(result.claim.falRequestIds.some(Boolean), false)
})

test('the old Kling ID follows only its signed retarget, never a different film or model family', () => {
  const { kling4TrialPollIdsMatch } = offline()('lib/kling4TrialAsyncStatus.ts')
  const original = birth(), replacement = fallbackClaim(original)
  assert.equal(kling4TrialPollIdsMatch(original.falRequestIds, original), true)
  assert.equal(kling4TrialPollIdsMatch(original.falRequestIds, replacement), true)
  assert.equal(kling4TrialPollIdsMatch(replacement.falRequestIds, replacement), true)
  for (const ids of [['different-kling-id'], ['seedance-2', 'seedance-1', 'seedance-0'], ['original-kling-id', null]]) assert.equal(kling4TrialPollIdsMatch(ids, replacement), false)
  for (const override of [{ engine_used: 'seedance15_cap' }, { version: 'forged' }, { original_request_id: 'another-film-id' }]) {
    const invalid = clone(replacement); Object.assign(invalid.response.kling4_trial, override)
    assert.equal(kling4TrialPollIdsMatch(original.falRequestIds, invalid), false)
  }
})

function fallbackWorld() {
  let current = birth()
  const slots = new Array(3).fill(null), posts = [], rpcCalls = [], phases = []
  const db = { async rpc(name, input) {
    rpcCalls.push({ name, input })
    const i = input.p_scene_index
    if (name === 'claim_kling4_trial_fallback_scene') {
      if (slots[i]) return { data: { code: 'existing', ...slots[i] }, error: null }
      slots[i] = { state: 'submitting', token: input.p_claim_token, request_id: null }
      return { data: { code: 'claimed' }, error: null }
    }
    if (name === 'finish_kling4_trial_fallback_scene') {
      if (slots[i]?.token === input.p_claim_token && slots[i].state === 'submitting') Object.assign(slots[i], { state: input.p_state, request_id: input.p_request_id })
      return { data: { code: 'ok' }, error: null }
    }
    if (name === 'finalize_kling4_trial_fallback') {
      if (slots.some(slot => !slot || slot.state === 'submitting')) return { data: { code: 'pending' }, error: null }
      return { data: { code: 'finalized', request_ids: slots.map(slot => slot.request_id), ambiguous: slots.some(slot => slot.state === 'ambiguous') }, error: null }
    }
    if (name === 'transition_kling4_trial_fallback') return { data: { code: 'ok' }, error: null }
    throw new Error('Unexpected RPC: ' + name)
  } }
  const load = offline({ '@/lib/cinematic/claim': {
    loadVerifiedCinematicClaim: async () => ({ ok: true, claim: current }),
    startKling4TrialFallback: async () => {
      phases.push('start_authority')
      if (current.authorizedCompletedUrls.some(Boolean)) return { ok: false, claim: current }
      current = { ...current, response: { ...current.response, kling4_trial: { ...current.response.kling4_trial, fallback_started: true } } }
      return { ok: true, claim: current }
    },
    switchKling4TrialToSeedanceFallback: async input => { current = fallbackClaim(current, clone(input.requestIds), input.ambiguous); return { ok: true, claim: current } },
  } })
  const helper = load('lib/kling4TrialFallback.ts')
  return { helper, db, posts, slots, rpcCalls, phases, current: () => current, replaceClaim: value => { current = value },
    input: () => ({ ...args(current), db, reason: 'timeout' }),
    submit: async input => { assert.equal(current.response.kling4_trial.fallback_started, true, 'signed fallback authority is acquired before any paid POST'); phases.push('post'); posts.push(clone(input)); await Promise.resolve(); return 'seedance-' + input.prompt.slice(-1) },
  }
}

test('concurrent failure and timeout polls submit exactly three Seedance scenes once and persist each receipt', async () => {
  const w = fallbackWorld()
  const first = w.input(), second = { ...w.input(), reason: 'provider_failed' }
  const results = await Promise.all([w.helper.ensureKling4TrialFallback({ ...first, submit: w.submit }), w.helper.ensureKling4TrialFallback({ ...second, submit: w.submit })])
  assert.equal(w.posts.length, 3)
  assert.ok(results.some(result => result.ok))
  assert.deepEqual(clone(w.current().falRequestIds), ['seedance-0', 'seedance-1', 'seedance-2'])
  for (const input of w.posts) {
    assert.equal(input.resolution, '720p'); assert.equal(input.aspect_ratio, '9:16'); assert.equal(input.generate_audio, false)
  }
  assert.equal(w.rpcCalls.filter(call => call.name === 'finish_kling4_trial_fallback_scene').length, 3)
  await w.helper.ensureKling4TrialFallback({ ...w.input(), submit: w.submit })
  assert.equal(w.posts.length, 3, 'the persisted retarget is replayed without any new paid calls')
  assert.equal(w.current().response.kling4_trial.engine_used, 'seedance15_fallback')
  assert.ok(w.rpcCalls.some(call => call.name === 'transition_kling4_trial_fallback'), 'cohort event is transitioned after the authority retarget')
})

test('fallback rereads the verified claim and spends nothing when Kling completion already won', async () => {
  const w = fallbackWorld(), stale = w.input()
  const completed = birth(); completed.authorizedCompletedUrls = [VIDEO]
  w.replaceClaim(completed)
  const result = await w.helper.ensureKling4TrialFallback({ ...stale, submit: w.submit })
  assert.equal(result.ok, true)
  assert.equal(result.claim.response.kling4_trial.engine_used, 'kling4')
  assert.equal(result.claim.authorizedCompletedUrls[0], VIDEO)
  assert.equal(w.posts.length, 0)
})

test('a Seedance receipt ambiguity preserves accepted siblings and never reposts the uncertain scene', async () => {
  const w = fallbackWorld()
  const submit = async input => { if (input.prompt.endsWith('1')) { w.posts.push(clone(input)); throw new Error('receipt lost after POST') } return w.submit(input) }
  const result = await w.helper.ensureKling4TrialFallback({ ...w.input(), submit })
  assert.equal(result.ok, true)
  assert.equal(result.ambiguous, true)
  assert.equal(result.noAccepted, false)
  assert.deepEqual(clone(result.claim.falRequestIds), ['seedance-0', null, 'seedance-2'])
  await w.helper.ensureKling4TrialFallback({ ...w.input(), submit })
  assert.equal(w.posts.length, 3)
})

test('definitive rejection of all fallback scenes produces an explicit no-accepted outcome without retrying', async () => {
  const w = fallbackWorld()
  const submit = async input => { w.posts.push(clone(input)); throw new w.helper.Kling4FallbackSubmitError(false) }
  const result = await w.helper.ensureKling4TrialFallback({ ...w.input(), submit })
  assert.equal(result.ok, true)
  assert.equal(result.noAccepted, true)
  assert.equal(result.ambiguous, false)
  await w.helper.ensureKling4TrialFallback({ ...w.input(), submit })
  assert.equal(w.posts.length, 3)
})

test('accepted Seedance receipts are durable while a sibling is still waiting', async () => {
  const w = fallbackWorld()
  let finishSibling
  const waiting = new Promise(done => { finishSibling = done })
  const submit = async input => { if (input.prompt.endsWith('1')) { w.posts.push(clone(input)); return await waiting } return w.submit(input) }
  const completion = w.helper.ensureKling4TrialFallback({ ...w.input(), submit })
  for (let i = 0; i < 20; i++) await Promise.resolve()
  assert.equal(w.slots[0].state, 'accepted')
  assert.equal(w.slots[0].request_id, 'seedance-0')
  assert.equal(w.slots[1].state, 'submitting')
  assert.equal(w.slots[2].state, 'accepted')
  finishSibling('seedance-1')
  assert.equal((await completion).ok, true)
  assert.equal(w.posts.length, 3)
})

test('a claimed slot waits for its owner then expires ambiguous without another paid POST', async () => {
  const w = fallbackWorld()
  w.slots[1] = { state: 'submitting', token: 'different-worker', request_id: null }
  const first = await w.helper.ensureKling4TrialFallback({ ...w.input(), submit: w.submit })
  assert.equal(first.pending, true)
  assert.equal(w.posts.length, 2)
  await w.helper.ensureKling4TrialFallback({ ...w.input(), submit: w.submit })
  assert.equal(w.posts.length, 2)
  w.slots[1].state = 'ambiguous' // Equivalent to the database's proven owner-timeout transition.
  const expired = await w.helper.ensureKling4TrialFallback({ ...w.input(), submit: w.submit })
  assert.equal(expired.ok, true)
  assert.equal(expired.ambiguous, true)
  assert.deepEqual(clone(expired.claim.falRequestIds), ['seedance-0', null, 'seedance-2'])
  assert.equal(w.posts.length, 2)
})

test('the real Seedance fallback submit performs one raw POST and classifies uncertain receipts', async () => {
  for (const fixture of [{ http: 200, id: 'seedance-known' }, { http: 422, ambiguous: false }, { http: 429, ambiguous: false }, { http: 503, ambiguous: true }, { http: 200, ambiguous: true }, { transport: true, ambiguous: true }]) {
    const calls = []
    const load = offline({ '@/lib/cinematic/claim': {} }, { env: { FAL_KEY: 'offline-placeholder' }, fetchImpl: async (url, options) => {
      calls.push({ url, options })
      if (fixture.transport) throw new Error('receipt lost')
      return new Response(JSON.stringify(fixture.id ? { request_id: fixture.id } : {}), { status: fixture.http })
    } })
    const helper = load('lib/kling4TrialFallback.ts')
    const input = { prompt: 'The original scene', duration: 6, resolution: '720p', aspect_ratio: '9:16', generate_audio: false }
    if (fixture.id) assert.equal(await helper.submitKling4TrialSeedanceFallback(input), fixture.id)
    else await assert.rejects(() => helper.submitKling4TrialSeedanceFallback(input), error => error instanceof helper.Kling4FallbackSubmitError && error.ambiguous === fixture.ambiguous)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://queue.fal.run/' + SEEDANCE)
    assert.equal(calls[0].options.method, 'POST')
    const posted = JSON.parse(calls[0].options.body)
    assert.equal(posted.duration, '6'); assert.equal(posted.generate_audio, false); assert.equal(posted.resolution, '720p'); assert.equal(posted.aspect_ratio, '9:16')
  }
})

test('the real browser replacement branch restores all scene vectors and blocks a fourth fallback attempt', () => {
  const load = offline(), { kling4TrialReplacement } = load('lib/kling4TrialClaim.ts')
  const filename = 'app/(dashboard)/generate/GenerateClient.tsx'
  const ast = ts.createSourceFile(filename, read(filename), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let replacementBlock = null, retryCondition = null
  const walk = node => {
    if (ts.isIfStatement(node)) {
      const condition = node.expression.getText(ast)
      if (condition === 'data.replacement !== undefined') replacementBlock = node.getText(ast)
      if (condition.includes('failedIdx.length > 0') && condition.includes('scenePromptsRef.current.length > 0') && condition.includes('hollyRetriedRef.current < 2')) retryCondition = condition
    }
    ts.forEachChild(node, walk)
  }
  walk(ast)
  assert.ok(replacementBlock && retryCondition, 'actual client replacement and existing retry guard must be located')
  const refs = Object.fromEntries(['falModelRef', 'falModelsRef', 'falQualityRef', 'sceneEnginesRef', 'scenePromptsRef', 'sceneAnchorsRef', 'sceneNarrationsRef', 'sceneSecondsRef', 'sceneDialoguesRef', 'hollyRetriedRef', 'narracaoVerbatimRef'].map(name => [name, { current: null }]))
  const setters = ['setScenes', 'setFastCaptions', 'setFastVoiceover', 'setTtsSpeed', 'setFalRequestIds']
  const exports = {}
  const code = ts.transpileModule(`export function apply(data, generationId, falRequestIds, refs, out) {
    const { ${Object.keys(refs).join(', ')} } = refs
    ${setters.map(name => `const ${name} = value => { out.${name} = value }`).join('\n')}
    const scheduleNextPoll = value => { out.scheduled = value }
    ${replacementBlock}
    out.continues = true
  }`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, kling4TrialReplacement }, { timeout: 5000 })
  const response = fallbackClaim(birth()).response
  Object.assign(response, { voiceover_script: 'Original full narration', speed: 1.2, verbatim: true, scene_seconds: [6, 6, 6] })
  const out = {}
  exports.apply({ replacement: response }, response.generationId, ['original-kling-id'], refs, out)
  assert.deepEqual(clone(out.setFalRequestIds), response.fal_request_ids)
  assert.deepEqual(clone(refs.falModelsRef.current), [SEEDANCE, SEEDANCE, SEEDANCE])
  assert.equal(refs.falModelRef.current, SEEDANCE)
  assert.equal(refs.falQualityRef.current, 'cinematic_ai')
  assert.deepEqual(clone(refs.scenePromptsRef.current), response.scene_prompts)
  assert.deepEqual(clone(out.setScenes), response.scenes)
  assert.equal(out.setFastVoiceover, 'Original full narration')
  assert.equal(out.setTtsSpeed, 1.2)
  assert.equal(refs.narracaoVerbatimRef.current, true)
  const mayRetry = vm.runInNewContext(`Boolean(${retryCondition})`, { ...refs, failedIdx: [1], cancelled: false }, { timeout: 5000 })
  assert.equal(mayRetry, false, 'the generic classic retry cannot buy a fourth or uncertain fallback scene')
  const invalidOut = {}
  exports.apply({ replacement: { ...response, generationId: 'different-film' } }, response.generationId, ['original-kling-id'], refs, invalidOut)
  assert.equal(invalidOut.setFalRequestIds, undefined)
  assert.equal(invalidOut.scheduled, 6000)
})

test('the real server retry entry rejects finalized trial fallback before any new submission', () => {
  const { kling4TrialReplacement } = offline()('lib/kling4TrialClaim.ts')
  const filename = 'app/api/retry-hollywood-scene/route.ts'
  const ast = ts.createSourceFile(filename, read(filename), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  let guard = null
  const walk = node => { if (ts.isIfStatement(node) && node.expression.getText(ast) === 'kling4TrialReplacement(loaded.claim.response, args.generationId)') guard = node.getText(ast); ts.forEachChild(node, walk) }
  walk(ast)
  assert.ok(guard)
  const exports = {}
  const code = ts.transpileModule(`export function apply(loaded, args) { const refused = () => 'refused'; ${guard}; return 'ordinary' }`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, kling4TrialReplacement }, { timeout: 5000 })
  const claim = fallbackClaim(birth())
  assert.equal(exports.apply({ claim }, { generationId: claim.generationId }), 'refused')
  assert.equal(exports.apply({ claim: birth() }, { generationId: claim.generationId }), 'ordinary', 'unrelated engines retain their existing retry flow')
})
