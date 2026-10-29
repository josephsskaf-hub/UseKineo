// Real free-redo state machine, claim/source HMACs and provider inputs; infrastructure is synthetic.
// No environment files, live database, network, TTS or paid render are available.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from '../scripts/test-support/offline-ts-loader.mjs'

const ROOT = path.resolve(process.env.KLING4_REDO_TEST_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(ROOT)
const clone = value => JSON.parse(JSON.stringify(value))
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8')
const forbidden = () => { throw Error('Offline test forbids external service work') }
const load = createOfflineLoader({ globals: { Date, Math, JSON, Promise, fetch: forbidden } })
const C = load('lib/freeRedo/core.ts')
const F = load('lib/freeRedo/filmServer.ts')
const B = load('lib/cinematic/claim.ts')
const R = load('lib/cinematic/refazerGratis2810.ts')
const G = load('lib/free15Gate.ts')

const SECRET = 'offline-kling4-redo-signature-key'
const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const VIDEO = '33333333-3333-4333-8333-333333333333'
const GEN = 'generation-kling4-free-redo-2810'
const RENDER = 'original-render-kling4-2810'
const KMODEL = 'kling/v4/image-to-video'
const SMODEL = 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video'
const T2V = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
const KURL = 'https://media.example.invalid/original-kling4.mp4'
const KREQUEST = 'original-kling-request'
const STILLS = [0, 1, 2].map(i => `https://storage.example.invalid/approved-scene-${i}.webp`)
const PROMPTS = [
  'A fictional woman opens the old blue door and discovers a sunlit garden.',
  'The same fictional woman walks beside the garden fountain, a silver key in hand.',
  'The same fictional woman smiles at the open gate as the sunrise lights the trees.',
]
const NARRATION = 'She opened the blue door. A silver key led her through the garden. At sunrise, the gate was open.'
function source() {
  return { output_format: 'mp4', width: 1080, height: 1920, frame_rate: 30, duration: 16.3,
    elements: [
      { type: 'shape', track: 1, time: 0, duration: 16.3, fill_color: '#000000' },
      { type: 'video', track: 2, time: 0, duration: 16.3, source: KURL, trim_start: 0, loop: true,
        volume: '0%', fit: 'cover', width: '100%', height: '100%', x: '50%', y: '50%' },
      { type: 'audio', track: 4, time: 0, duration: 16.3, source: 'https://storage.example.invalid/original-narration.mp3', volume: '100%' },
      { type: 'audio', track: 8, time: 0, duration: 16.3, source: 'https://storage.example.invalid/original-score.mp3', volume: '12%', loop: true },
      { type: 'text', track: 5, time: 0, duration: 4.5, text: 'She opened the blue door.' },
      { type: 'text', track: 5, time: 4.5, duration: 6, text: 'A silver key led her through the garden.' },
      { type: 'text', track: 5, time: 10.5, duration: 5.8, text: 'At sunrise, the gate was open.' },
      { type: 'text', track: 9, time: 0, duration: 16.3, text: 'usekineo.com/free' },
    ] }
}

// Adapted from the repository's existing first-film redo fixture: PK, owner/status CAS and render uniqueness are real constraints.
function fakeDb(seed) {
  const tables = { events: clone(seed.events), videos: clone(seed.videos) }, touched = new Set(), hooks = { beforeInsert: null }
  let seq = 0
  const field = (row, key) => {
    const match = /^(\w+)->>(\w+)$/.exec(key)
    if (!match) return row[key]
    const value = row[match[1]]?.[match[2]]
    return value === undefined || value === null ? null : String(value)
  }
  return { tables, touched, hooks, from(table) {
    touched.add(table)
    assert.ok(['events', 'videos'].includes(table), 'free redo never touches credits or another table')
    const st = { operation: 'select', filters: [], row: null, patch: null, single: false, selecting: false, order: null, ascending: false, limit: null }
    const matches = row => st.filters.every(([key, value, op]) => op === 'in' ? value.includes(field(row, key))
      : field(row, key) === value || typeof value !== 'string' && field(row, key) === String(value))
    const run = () => {
      const rows = tables[table]
      if (st.operation === 'insert') {
        const row = clone(st.row)
        if (!row.id) row.id = table === 'videos' ? `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}` : `event-${++seq}`
        hooks.beforeInsert?.(table, row, tables)
        if (rows.some(other => other.id === row.id || table === 'videos' && row.render_id && other.render_id === row.render_id)) return { data: null, error: { code: '23505' } }
        row.created_at ??= new Date(Date.parse('2026-10-29T12:00:00Z') + (++seq) * 1000).toISOString()
        rows.push(row)
        return { data: st.selecting ? { id: row.id } : null, error: null }
      }
      if (st.operation === 'update') {
        const hits = rows.filter(matches)
        hits.forEach(row => Object.assign(row, clone(st.patch)))
        return { data: st.single ? hits[0] ? { id: hits[0].id } : null : hits.map(row => ({ id: row.id })), error: null }
      }
      let found = rows.filter(matches).map(clone)
      if (st.order) found.sort((a, b) => a[st.order] < b[st.order] ? st.ascending ? -1 : 1 : st.ascending ? 1 : -1)
      if (st.limit !== null) found = found.slice(0, st.limit)
      return { data: st.single ? found[0] ?? null : found, error: null }
    }
    const q = {
      select() { if (st.operation !== 'select') st.selecting = true; return q },
      eq(key, value) { st.filters.push([key, value, 'eq']); return q },
      in(key, values) { st.filters.push([key, values, 'in']); return q },
      order(key, { ascending }) { st.order = key; st.ascending = ascending; return q },
      limit(n) { st.limit = n; return q },
      maybeSingle() { st.single = true; return Promise.resolve(run()) },
      insert(row) { st.operation = 'insert'; st.row = row; return q },
      update(value) { st.operation = 'update'; st.patch = value; return q },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
    }
    return q
  } }
}

function claimRow({ seconds = [5, 5, 5], stills = STILLS, mutateResponse } = {}) {
  let start = 0
  const plan = seconds.map((duration, i) => {
    const scene = { prompt: PROMPTS[i], text: `Narration scene ${i + 1}.`, description: `Visual scene ${i + 1}.`,
      still_url: stills[i], start_seconds: start, duration_seconds: duration }
    start += duration
    return scene
  })
  const response = { generationId: GEN, quality: 'cinematic_ai', duration: 15, aspect: '9:16',
    fal_model: KMODEL, fal_models: [KMODEL], fal_request_ids: [KREQUEST], scenes: ['Combined three-shot film'],
    voiceover_script: NARRATION, scene_captions: [''],
    scene_fal_inputs: [{ multi_prompt: seconds.map((duration, i) => ({ prompt: PROMPTS[i], duration })), duration: 15,
      resolution: '720p', start_image_url: stills[0], middle_image_urls: stills.slice(1).filter(Boolean) }],
    kling4_trial: { version: 'kling4_trial_2810', engine_used: 'kling4', country: 'BR', cost_usd: 2.355, scene_plan: plan },
  }
  mutateResponse?.(response)
  const id = B.cinematicClaimId(OWNER, GEN)
  const metadata = { generation_id: GEN, status: 'settled', fingerprint: 'a'.repeat(64), credit_cost: 9,
    quality: 'cinematic_ai', engine: 'seedance', fal_request_ids: [KREQUEST], fal_models: [KMODEL],
    authorized_completed_urls: [KURL], response, response_hash: B.cinematicValueHash(response),
    resolution_reason: 'credits_debited', resolution_reference: 'cinematic-redo-fixture',
    started_at: '2026-10-28T10:00:00Z', completed_at: '2026-10-28T10:03:00Z', resolved_at: '2026-10-28T10:03:01Z',
  }
  metadata.authority = B.signCinematicClaim(SECRET, { claimId: id, userId: OWNER, generationId: GEN, status: metadata.status,
    fingerprint: metadata.fingerprint, creditCost: metadata.credit_cost, quality: metadata.quality, engine: metadata.engine,
    falRequestIds: metadata.fal_request_ids, falModels: metadata.fal_models, authorizedCompletedUrls: metadata.authorized_completed_urls,
    responseHash: metadata.response_hash, resolutionReason: metadata.resolution_reason, resolutionReference: metadata.resolution_reference })
  const row = { id, name: B.CINEMATIC_CLAIM_EVENT, user_id: OWNER, session_id: GEN, path: B.CINEMATIC_CLAIM_PATH,
    metadata, created_at: '2026-10-28T10:00:00Z' }
  assert.equal(B.verifyCinematicClaimRow({ row, secret: SECRET, userId: OWNER, generationId: GEN }).ok, true)
  return row
}

function world(options = {}) {
  const originalSource = options.source ?? source()
  const birth = claimRow(options)
  const metadata = C.filmSourceMetadata({ secret: SECRET, userId: OWNER, renderId: RENDER, generationId: GEN, quality: 'cinematic_ai', source: originalSource })
  const events = [birth, { id: 'signed-original-source', name: C.FILM_SOURCE_EVENT, user_id: OWNER,
    path: '/api/compose', session_id: GEN, metadata, created_at: '2026-10-28T10:05:00Z' }]
  const videos = [{ id: VIDEO, user_id: OWNER, status: 'completed', render_id: RENDER, title: 'Garden film', topic: 'Garden',
    quality_mode: 'cinematic_ai', duration: 16, platform: 'TikTok', youtube_description: 'Original description',
    video_url: 'https://storage.example.invalid/finished-original.mp4', credits_used: 9, created_at: '2026-10-28T10:06:00Z' }]
  const db = fakeDb({ events, videos }), log = { submits: [], renders: [], events: [], deadChecks: [], persisted: [] }
  let owner = 0
  const d = { db, secret: SECRET, now: () => Date.parse('2026-10-29T12:00:00Z'), random: () => .25,
    newOwner: () => `offline-worker-${++owner}`,
    loadClaim: identity => B.loadVerifiedCinematicClaim({ db, secret: SECRET, ...identity }),
    submitScene: async (model, input) => {
      assert.ok(model === SMODEL || model === T2V, 'a Kling4 redo can only submit Seedance 1.5')
      log.submits.push(clone({ model, input }))
      await Promise.resolve()
      return `seedance-redo-${log.submits.length}`
    },
    pollScene: async (model, requestId) => {
      assert.ok(model === SMODEL || model === T2V)
      return { status: 'done', url: `https://media.example.invalid/${requestId}.mp4` }
    },
    submitRender: async src => { log.renders.push(clone(src)); return `redo-render-${log.renders.length}` },
    pollRender: async renderId => ({ status: 'succeeded', url: `https://render.example.invalid/${renderId}.mp4`, snapshotUrl: null,
      error: null, durationSeconds: options.renderSeconds ?? 16.3, exactDurationSeconds: options.exactSeconds ?? options.renderSeconds ?? 16.3 }),
    persist: async args => { log.persisted.push(clone(args)); return { videoUrl: `https://storage.example.invalid/${args.renderId}.mp4`,
      thumbnailUrl: null, measuredSeconds: Object.hasOwn(options, 'measuredSeconds') ? options.measuredSeconds : 16.3 } },
    deadUrls: async urls => { log.deadChecks.push([...urls]); return options.deadKling && urls.includes(KURL) ? [KURL] : [] },
    event: async event => { log.events.push(clone(event)); return true },
  }
  return { d, db, log, originalSource: clone(originalSource) }
}

async function redo(w, videoId, sceneIndex) {
  const post = await F.iniciarRefacaoFilme(w.d, { userId: OWNER, videoId, sceneIndex, model: KMODEL, duration: 30, prompt: 'forged browser field' })
  assert.equal(post.status, 202, JSON.stringify(post.body))
  await F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId })
  const done = await F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId })
  return { post, done, id: done.body.new_video_id }
}
const sourceRows = (w, renderId) => w.db.tables.events.filter(row => row.name === C.FILM_SOURCE_EVENT && row.metadata?.render_id === renderId)
const videoElements = src => src.elements.filter(el => el.type === 'video')
const otherElements = src => src.elements.filter(el => el.type !== 'video')
function at(src, time) {
  const clips = videoElements(src).filter(el => time >= Number(el.time || 0) && time < Number(el.time || 0) + Number(el.duration))
  assert.equal(clips.length, 1, `exactly one visible shot at ${time}s`)
  const el = clips[0]
  return { source: el.source, sourceTime: Number(el.trim_start || 0) + time - Number(el.time || 0), el }
}
function exactWindow(src, start, duration, replacement) {
  assert.equal(src.duration, 16.3)
  assert.deepEqual(otherElements(src), otherElements(source()), 'voice, score, captions, watermark and background are byte-equivalent')
  for (const t of [start + .1, start + duration - .1]) {
    assert.equal(at(src, t).source, replacement)
    assert.equal(at(src, t).el.volume, '0%', 'Seedance native audio never overlays original narration')
  }
  if (start > 0) { assert.equal(at(src, start - .1).source, KURL); assert.ok(Math.abs(at(src, start - .1).sourceTime - (start - .1)) < 1e-8) }
  if (start + duration < 15) { const t = start + duration + .1; assert.equal(at(src, t).source, KURL); assert.ok(Math.abs(at(src, t).sourceTime - t) < 1e-8) }
  assert.equal(at(src, 15.2).source, KURL, 'original looped tail remains Kling footage')
  assert.ok(Math.abs(at(src, 15.2).sourceTime - .2) < 1e-8, 'tail uses source offset zero after 15s wrap')
}
let checks = 0
async function check(name, fn) { await fn(); checks++; console.log('PASS ' + name) }

await check('signed Kling birth exposes three server-owned Seedance redo scenes', async () => {
  const w = world()
  const reply = await F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId: VIDEO })
  assert.equal(reply.status, 200, JSON.stringify(reply.body))
  assert.equal(reply.body.free_total, 2)
  assert.equal(reply.body.scenes.length, 3)
  const verified = await w.d.loadClaim({ userId: OWNER, generationId: GEN })
  assert.equal(verified.ok, true)
  const scenes = C.cenasDoFilme(verified.claim, OWNER, w.originalSource)
  assert.equal(scenes.length, 3)
  scenes.forEach((scene, i) => {
    assert.equal(scene.index, i)
    assert.equal(scene.model, SMODEL)
    assert.equal(scene.seconds, 5)
    assert.equal(scene.input.image_url, STILLS[i])
    assert.equal(scene.input.prompt, PROMPTS[i])
    assert.equal(scene.input.resolution, '720p')
    assert.equal(scene.input.aspect_ratio, '9:16')
    assert.equal(scene.input.generate_audio, false)
    assert.deepEqual(clone(scene.interval), { start: i * 5, duration: 5, originalUrl: KURL, originalSeconds: 15 })
  })
})

await check('first scene redo splices only scene 2 and preserves exact before/after/tail footage', async () => {
  const w = world(), originalVideo = clone(w.db.tables.videos[0])
  const first = await redo(w, VIDEO, 1)
  assert.ok(first.id)
  assert.equal(w.log.submits.length, 1)
  const submitted = w.log.submits[0]
  assert.equal(submitted.model, SMODEL)
  assert.equal(submitted.input.image_url, STILLS[1])
  assert.ok(submitted.input.prompt.startsWith(PROMPTS[1]))
  assert.equal(submitted.input.multi_prompt, undefined)
  assert.equal(Number(submitted.input.duration), 5)
  assert.equal(submitted.input.generate_audio, false)
  exactWindow(w.log.renders[0], 5, 5, 'https://media.example.invalid/seedance-redo-1.mp4')
  assert.deepEqual(w.db.tables.videos[0], originalVideo, 'original delivered video is never overwritten')
  assert.deepEqual(w.originalSource, source(), 'original source is immutable')
  const next = w.db.tables.videos.find(video => video.id === first.id)
  assert.equal(next.credits_used, 0)
  const rows = sourceRows(w, 'redo-render-1')
  assert.equal(rows.length, 1)
  assert.equal(C.verifyFilmSource(SECRET, OWNER, 'redo-render-1', rows[0].metadata).ok, true)
  assert.deepEqual(rows[0].metadata.source, w.log.renders[0], 'v2 HMAC covers the exact source submitted to render')
  assert.equal(C.verifyFilmChain(SECRET, OWNER, 'redo-render-1', rows[0].metadata).chain.seq, 2)
  assert.ok(w.log.deadChecks[0].includes(KURL), 'remaining Kling intervals must be alive before buying a redo')
})

for (const secondScene of [1, 0]) await check(`second free redo can choose scene ${secondScene + 1}; third is unavailable`, async () => {
  const w = world()
  const first = await redo(w, VIDEO, 1)
  const available = await F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId: first.id })
  assert.equal(available.body.scenes.length, 3)
  assert.equal(available.body.scenes.find(scene => scene.index === 1).clip_url, 'https://media.example.invalid/seedance-redo-1.mp4')
  const second = await redo(w, first.id, secondScene)
  assert.ok(second.id)
  assert.equal(w.log.submits.length, 2)
  assert.ok(w.log.submits.every(submit => submit.model === SMODEL))
  assert.equal(w.log.submits[1].input.image_url, STILLS[secondScene])
  assert.deepEqual(otherElements(w.log.renders[1]), otherElements(source()))
  assert.equal(at(w.log.renders[1], secondScene * 5 + 1).source, 'https://media.example.invalid/seedance-redo-2.mp4')
  if (secondScene === 0) assert.equal(at(w.log.renders[1], 6).source, 'https://media.example.invalid/seedance-redo-1.mp4', 'first redo survives a later edit to another scene')
  assert.equal(sourceRows(w, 'redo-render-2').length, 0, 'version 3 never receives a new free-redo source')
  const used = await F.iniciarRefacaoFilme(w.d, { userId: OWNER, videoId: first.id, sceneIndex: 2 })
  assert.equal(used.status, 409)
  const third = await F.iniciarRefacaoFilme(w.d, { userId: OWNER, videoId: second.id, sceneIndex: 0 })
  assert.equal(third.status, 409)
  const total = await F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId: VIDEO, lite: true })
  assert.equal(total.body.free_left, 0)
  assert.equal(total.body.free_used, 2)
  assert.equal(w.log.submits.length, 2)
  assert.ok(w.db.tables.videos.filter(video => video.id !== VIDEO).every(video => video.credits_used === 0))
  assert.deepEqual([...w.db.touched].sort(), ['events', 'videos'])
})

await check('concurrent scene clicks and completion polls create one submit, one render and one version', async () => {
  const w = world()
  const [a, b] = await Promise.all([0, 1].map(sceneIndex => F.iniciarRefacaoFilme(w.d, { userId: OWNER, videoId: VIDEO, sceneIndex })))
  assert.equal(a.status, 202); assert.equal(b.status, 202)
  assert.equal(w.log.submits.length, 1)
  await Promise.all([0, 1].map(() => F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId: VIDEO })))
  await Promise.all([0, 1].map(() => F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId: VIDEO })))
  assert.equal(w.log.renders.length, 1)
  assert.equal(w.db.tables.videos.length, 2)
  assert.equal(sourceRows(w, 'redo-render-1').length, 1)
})

for (const { time, index, textOnly } of [{ time: 10, index: 1, textOnly: false }, { time: 13, index: 2, textOnly: true }]) {
  await check(`automatic pixel repair locates virtual Kling scene ${index + 1} at ${time}s and preserves other intervals`, async () => {
    const w = world({ seconds: [9, 3, 3], stills: textOnly ? [STILLS[0], STILLS[1], null] : STILLS })
    const verified = await w.d.loadClaim({ userId: OWNER, generationId: GEN })
    assert.equal(verified.ok, true)
    const scenes = src => C.cenasDoFilme(verified.claim, OWNER, src)
    const original = { url: 'https://render.example.invalid/pre-gate.mp4', snapshotUrl: null, durationSeconds: 16.3 }
    const clean = { score: 95, cap_limit: 100, caps: [], evidence_status: 'complete', caption_language_ok: true,
      caption_legible: true, identity_consistent: true, frames: [{ i: 0, t: time, score: 95, issues: [] }] }
    const defective = { ...clean, score: 50, cap_limit: 50, caps: ['invented_text'], frames: [{ i: 0, t: time, score: 50, issues: ['invented_text'] }] }
    let state = { version: G.FREE15_GATE_VERSION, status: 'ready', source: clone(w.originalSource),
      captionElements: source().elements.filter(el => el.type === 'text' && el.track === 5), captionEvidence: null,
      minimumSeconds: 15, attempted: false, reason: 'awaiting_delivery', updatedAt: w.d.now() }
    assert.equal(G.decideFree15Gate(state, original, defective, scenes(state.source)).sceneIndex, index,
      'a shared Kling URL must not cause the first virtual scene to win')
    let judgments = 0
    const deps = {
      now: w.d.now,
      read: async () => clone(state),
      move: async (before, after) => {
        if (JSON.stringify(before) !== JSON.stringify(state)) return false
        state = clone(after)
        return true
      },
      judge: async () => clone(judgments++ === 0 ? defective : clean), scenes,
      submitScene: scene => w.d.submitScene(scene.model, scene.input),
      pollScene: (scene, requestId) => w.d.pollScene(scene.model, requestId),
      submitRender: w.d.submitRender,
      pollRender: async id => ({ ...await w.d.pollRender(id), durationSeconds: 16.3 }),
    }
    assert.equal((await G.advanceFree15Gate(deps, original)).status, 'pending')
    assert.equal(w.log.submits.length, 1)
    assert.equal(w.log.submits[0].model, textOnly ? T2V : SMODEL)
    assert.equal(w.log.submits[0].input.image_url, textOnly ? undefined : STILLS[index])
    assert.equal(Number(w.log.submits[0].input.duration), 4)
    assert.equal(w.log.submits[0].input.generate_audio, false)
    await Promise.all([G.advanceFree15Gate(deps, original), G.advanceFree15Gate(deps, original)])
    assert.equal(w.log.renders.length, 1)
    exactWindow(w.log.renders[0], index === 1 ? 9 : 12, 3, 'https://media.example.invalid/seedance-redo-1.mp4')
    const done = await G.advanceFree15Gate(deps, original)
    assert.equal(done.status, 'passed')
    assert.equal(done.media.durationSeconds, 16.3)
    assert.deepEqual(clone(done.source), w.log.renders[0])
    assert.equal((await G.advanceFree15Gate(deps, original)).status, 'passed')
    assert.equal(w.log.submits.length, 1, 'the automatic repair remains one paid scene across concurrent/replayed polls')
    assert.deepEqual(w.originalSource, source())
  })
}

await check('done replay restores a missing v2 signed chain without another scene or render', async () => {
  const w = world(), first = await redo(w, VIDEO, 1)
  const saved = clone(sourceRows(w, 'redo-render-1')[0])
  const rowIndex = w.db.tables.events.findIndex(row => row.id === saved.id)
  w.db.tables.events.splice(rowIndex, 1)
  assert.equal((await F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId: first.id })).status, 409)
  const replay = await F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId: VIDEO })
  assert.equal(replay.body.new_video_id, first.id)
  const restored = sourceRows(w, 'redo-render-1')
  assert.equal(restored.length, 1)
  assert.deepEqual(restored[0].metadata, saved.metadata, 'recovery signs exactly the same v2 source and chain')
  assert.equal(C.verifyFilmSource(SECRET, OWNER, 'redo-render-1', restored[0].metadata).ok, true)
  assert.equal(C.verifyFilmChain(SECRET, OWNER, 'redo-render-1', restored[0].metadata).chain.seq, 2)
  const available = await F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId: first.id })
  assert.equal(available.status, 200)
  assert.equal(available.body.free_left, 1)
  assert.equal(available.body.scenes.length, 3)
  assert.equal(w.log.submits.length, 1)
  assert.equal(w.log.renders.length, 1)
  assert.equal(w.db.tables.videos.length, 2)
  const second = await redo(w, first.id, 0)
  assert.ok(second.id, 'the recovered chain really permits the second free redo')
  assert.equal(w.log.submits.length, 2)
})

for (const collision of ['invalid_hmac', 'matching_signed_source', 'wrong_signed_source']) {
  await check(`source insert 23505 collision ${collision} is checked before v2 delivery`, async () => {
    const w = world()
    assert.equal((await F.iniciarRefacaoFilme(w.d, { userId: OWNER, videoId: VIDEO, sceneIndex: 1 })).status, 202)
    await F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId: VIDEO })
    let collisions = 0
    w.db.hooks.beforeInsert = (table, inserted, tables) => {
      if (table !== 'events' || inserted.name !== C.FILM_SOURCE_EVENT || inserted.metadata.render_id !== 'redo-render-1') return
      w.db.hooks.beforeInsert = null
      const competing = clone(inserted)
      if (collision === 'invalid_hmac') competing.metadata.source.elements[0].duration = 1
      if (collision === 'wrong_signed_source') {
        const wrong = clone(competing.metadata.source)
        wrong.elements = wrong.elements.filter(el => el.type !== 'audio')
        const expectedChain = C.verifyFilmChain(SECRET, OWNER, 'redo-render-1', competing.metadata).chain
        competing.metadata = C.filmSourceMetadata({ secret: SECRET, userId: OWNER, renderId: 'redo-render-1',
          generationId: GEN, quality: 'cinematic_ai', source: wrong, chain: expectedChain })
        assert.equal(C.verifyFilmSource(SECRET, OWNER, 'redo-render-1', competing.metadata).ok, true, 'wrong-content fixture really has valid source HMAC')
      }
      tables.events.push(competing)
      collisions++
    }
    const delivered = await F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId: VIDEO })
    assert.equal(collisions, 1, 'the race injects a unique-key conflict after the initial read')
    assert.equal(w.log.submits.length, 1)
    assert.equal(w.log.renders.length, 1)
    if (collision === 'matching_signed_source') {
      assert.ok(delivered.body.new_video_id)
      assert.equal(w.db.tables.videos.length, 2)
      const next = await F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId: delivered.body.new_video_id })
      assert.equal(next.status, 200)
      assert.equal(next.body.free_left, 1)
    } else {
      assert.ok(!delivered.body.new_video_id, 'a conflicting source cannot be delivered as completed')
      assert.equal(w.db.tables.videos.length, 1, 'no completed v2 may exist before its exact source is durable')
      assert.ok(!w.log.events.some(event => event.name === 'scene_redo_free_used'))
      const order = w.db.tables.events.find(row => row.id === C.filmOrderId(VIDEO))
      assert.equal(order.metadata.status, 'rendering')
      const replay = await F.acompanharRefacaoFilme(w.d, { userId: OWNER, videoId: VIDEO })
      assert.ok(!replay.body.new_video_id)
      assert.equal(w.log.submits.length, 1)
    }
  })
}

await check('owner, source HMAC, scene-plan HMAC and forged chain all fail before provider work', async () => {
  const stranger = world()
  assert.equal((await F.iniciarRefacaoFilme(stranger.d, { userId: OTHER, videoId: VIDEO, sceneIndex: 1 })).status, 404)
  assert.equal(stranger.log.submits.length, 0)
  const changedSource = world()
  changedSource.db.tables.events.find(row => row.name === C.FILM_SOURCE_EVENT).metadata.source.elements[1].duration = 2
  assert.equal((await F.iniciarRefacaoFilme(changedSource.d, { userId: OWNER, videoId: VIDEO, sceneIndex: 1 })).status, 409)
  assert.equal(changedSource.log.submits.length, 0)
  const changedPlan = world()
  changedPlan.db.tables.events.find(row => row.name === B.CINEMATIC_CLAIM_EVENT).metadata.response.kling4_trial.scene_plan[1].still_url = 'https://attacker.example.invalid/face.webp'
  const denied = await F.iniciarRefacaoFilme(changedPlan.d, { userId: OWNER, videoId: VIDEO, sceneIndex: 1 })
  assert.ok(denied.status >= 400)
  assert.equal(changedPlan.log.submits.length, 0)
  const forgedHash = world()
  const birth = forgedHash.db.tables.events.find(row => row.name === B.CINEMATIC_CLAIM_EVENT)
  birth.metadata.response.kling4_trial.scene_plan[1].start_seconds = 0
  birth.metadata.response_hash = B.cinematicValueHash(birth.metadata.response)
  assert.ok((await F.iniciarRefacaoFilme(forgedHash.d, { userId: OWNER, videoId: VIDEO, sceneIndex: 1 })).status >= 400)
  assert.equal(forgedHash.log.submits.length, 0)
  const forgedChain = world()
  const first = await redo(forgedChain, VIDEO, 1)
  sourceRows(forgedChain, 'redo-render-1')[0].metadata.chain.scene_index = 0
  assert.equal((await F.iniciarRefacaoFilme(forgedChain.d, { userId: OWNER, videoId: first.id, sceneIndex: 0 })).status, 409)
  assert.equal(forgedChain.log.submits.length, 1)
})

await check('missing still uses approved text-only Seedance path; 3s interval buys 4s but trims to 3s', async () => {
  const textOnly = world({ stills: [STILLS[0], STILLS[1], null] })
  await redo(textOnly, VIDEO, 2)
  assert.equal(textOnly.log.submits[0].model, T2V)
  assert.equal(textOnly.log.submits[0].input.image_url, undefined)
  assert.equal(textOnly.log.submits[0].input.generate_audio, false)
  const short = world({ seconds: [3, 3, 9] })
  await redo(short, VIDEO, 0)
  assert.equal(Number(short.log.submits[0].input.duration), 4)
  exactWindow(short.log.renders[0], 0, 3, 'https://media.example.invalid/seedance-redo-1.mp4')
})

await check('expired remaining Kling source blocks paid Seedance before dispatch', async () => {
  const w = world({ deadKling: true })
  const denied = await F.iniciarRefacaoFilme(w.d, { userId: OWNER, videoId: VIDEO, sceneIndex: 1 })
  assert.equal(denied.status, 409)
  assert.equal(w.log.submits.length, 0)
})

for (const opts of [{ renderSeconds: 14.9, measuredSeconds: 14.9 }, { renderSeconds: 15, exactSeconds: 14.9, measuredSeconds: null }]) {
  await check('raw 14.9s redo is never exposed as completed even when legacy display rounds to 15', async () => {
    const w = world(opts)
    const attempted = await redo(w, VIDEO, 1)
    assert.ok(attempted.id === null || attempted.id === undefined, 'defective output has no delivered video ID')
    assert.equal(w.db.tables.videos.length, 1)
    assert.equal(sourceRows(w, 'redo-render-1').length, 0)
    assert.ok(!w.log.events.some(event => event.name === 'scene_redo_free_used'))
  })
}

await check('actual HTTP adapter authenticates and ignores forged engine, prompt, duration and credits', async () => {
  const w = world(), heads = []
  let authUser = null
  const routeLoad = createOfflineLoader({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.invalid',
      SUPABASE_SERVICE_ROLE_KEY: SECRET,
      FAL_KEY: 'offline-provider-placeholder',
    },
    globals: {
      Date, Math, JSON, Promise, AbortSignal,
      fetch: async (url, options) => {
        assert.equal(options?.method, 'HEAD', 'route may only perform simulated asset availability checks')
        assert.ok(String(url).startsWith('https://'))
        heads.push(url)
        return { status: 200 }
      },
    },
    mocks: {
      'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200, headers: options.headers ?? {} }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: authUser } }) } }) },
      '@supabase/supabase-js': { createClient: () => w.db },
      '@fal-ai/client': { fal: {
        config() {},
        queue: {
          status: async (model, { requestId }) => {
            assert.ok(model === SMODEL || model === T2V)
            return { status: 'COMPLETED', request_id: requestId }
          },
          result: async (model, { requestId }) => ({ data: { video: { url: (await w.d.pollScene(model, requestId)).url } } }),
        },
      } },
      '@/lib/falQueue': { submitFalQueueOnce: (model, input) => w.d.submitScene(model, input) },
      '@/lib/compose': { submitCreatomateRender: w.d.submitRender, pollCreatomateRender: w.d.pollRender },
      '@/lib/renderAssets': { persistRenderAssets: w.d.persist },
      '@/lib/serverEvents': { writeServerEvent: w.d.event },
    },
  })
  const route = routeLoad('app/api/free-redo/film/route.ts')
  const request = { json: async () => ({ videoId: VIDEO, sceneIndex: 1, model: KMODEL, prompt: 'browser must not choose this', duration: 30, credits: -999 }) }
  const getRequest = { nextUrl: { searchParams: new URLSearchParams({ videoId: VIDEO }) } }
  assert.equal((await route.POST(request)).status, 401)
  assert.equal((await route.GET(getRequest)).status, 401)
  assert.equal(w.db.touched.size, 0, 'signed-out requests never obtain database access')
  authUser = { id: OTHER }
  assert.equal((await route.POST(request)).status, 404)
  assert.equal(w.log.submits.length, 0)
  authUser = { id: OWNER }
  const started = await route.POST(request)
  assert.equal(started.status, 202, JSON.stringify(started.body))
  assert.equal(started.headers['Cache-Control'], 'no-store')
  assert.equal(w.log.submits.length, 1)
  assert.equal(w.log.submits[0].model, SMODEL)
  assert.equal(w.log.submits[0].input.image_url, STILLS[1])
  assert.ok(w.log.submits[0].input.prompt.startsWith(PROMPTS[1]))
  assert.equal(Number(w.log.submits[0].input.duration), 5)
  await route.GET(getRequest)
  const delivered = await route.GET(getRequest)
  assert.equal(delivered.status, 200, JSON.stringify(delivered.body))
  assert.ok(delivered.body.new_video_id)
  assert.equal(w.db.tables.videos.find(video => video.id === delivered.body.new_video_id).credits_used, 0)
  exactWindow(w.log.renders[0], 5, 5, 'https://media.example.invalid/seedance-redo-1.mp4')
  assert.ok(heads.includes(KURL))
  assert.equal(w.log.submits.length, 1)
  assert.deepEqual([...w.db.touched].sort(), ['events', 'videos'])
})

await check('scene controls use free-redo endpoint; prompt-rewriter route is not a video renderer', async () => {
  const panel = read('components/video/SceneRedoPanel.tsx')
  assert.match(panel, /fetch\(FREE_REDO_FILM_PATH,/)
  assert.doesNotMatch(panel, /regenerate-scene/)
  const unrelated = read('app/api/regenerate-scene/route.ts')
  assert.doesNotMatch(unrelated, /submitFalQueueOnce|fal\.queue|kling\/v4/)
})

console.log(JSON.stringify({ status: 'PASS', checks, providers: 'synthetic', actualHmac: true, paidRenders: 0, network: 0, environmentFiles: 0 }))
