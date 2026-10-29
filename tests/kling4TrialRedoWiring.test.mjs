// Real UI handlers and route adapters, with all auth/provider/storage dependencies offline.
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
const forbidden = () => { throw new Error('Offline redo wiring guard forbids unmocked external work') }
const VIDEO = '11111111-1111-4111-8111-111111111111'
const SEEDANCE = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
const json = value => JSON.parse(JSON.stringify(value))
class NextResponse extends Response {
  static json(body, init = {}) { return new NextResponse(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } }) }
}
function compile(source, globals = {}) {
  const exports = {}
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { exports, console: { log() {}, warn() {}, error() {} }, URL, Response, Request, AbortController, AbortSignal, ...globals }, { timeout: 5000 })
  return exports
}
function loader(mocks = {}, env = {}, { network = forbidden } = {}) {
  const cache = new Map()
  const builtins = { 'node:crypto': crypto, 'next/server': { NextResponse, NextRequest: Request } }
  const load = path => {
    if (cache.has(path)) return cache.get(path)
    const result = compile(read(path), {
      process: { env }, fetch: network, setTimeout: forbidden, clearTimeout() {},
      require(specifier) {
        if (Object.hasOwn(mocks, specifier)) return mocks[specifier]
        if (Object.hasOwn(builtins, specifier)) return builtins[specifier]
        if (specifier.startsWith('@/')) return load(specifier.slice(2) + '.ts')
        if (specifier.startsWith('.')) return load(join(dirname(path), specifier) + '.ts')
        return forbidden()
      },
    })
    cache.set(path, result)
    return result
  }
  return load
}

test('actual thumbnail handler seeks the selected virtual shot and leaves legacy previews unchanged', () => {
  const path = 'components/video/SceneRedoPanel.tsx'
  const ast = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let expression
  const walk = node => { if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'onLoadedMetadata') expression = node.initializer?.expression?.getText(ast); ts.forEachChild(node, walk) }
  walk(ast)
  assert.ok(expression, 'actual video metadata handler exists')
  const { cenasDoPainel } = loader()('lib/cinematic/refazerCena.ts')
  for (const start of [0, 9, 12]) {
    const scene = cenasDoPainel({ scenes: [{ index: 1, clip_url: 'https://fal.media/test/original.mp4', preview_start: start, seconds: 3 }] })[0]
    const { handler } = compile(`export const handler = ${expression}`, { c: scene })
    const player = { currentTime: 7 }
    handler({ currentTarget: player })
    assert.equal(player.currentTime, start)
    assert.doesNotThrow(() => handler({ currentTarget: { set currentTime(value) { throw new Error('seeking unavailable') } } }))
  }
  for (const invalid of [undefined, -1, NaN, Infinity, 90, '12']) {
    const scene = cenasDoPainel({ scenes: [{ index: 1, clip_url: 'https://fal.media/test/original.mp4', preview_start: invalid }] })[0]
    const { handler } = compile(`export const handler = ${expression}`, { c: scene })
    const player = { currentTime: 7 }; handler({ currentTarget: player })
    assert.equal(player.currentTime, 7, 'invalid/missing interval cannot seek the player')
  }
})

test('actual redo click posts only film and scene IDs to the free-redo endpoint', async () => {
  const path = 'components/video/SceneRedoPanel.tsx'
  const ast = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let callback
  const walk = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'confirmar') callback = node.initializer?.arguments?.[0]?.getText(ast); ts.forEachChild(node, walk) }
  walk(ast); assert.ok(callback)
  const load = loader(), helpers = load('lib/cinematic/refazerCena.ts'), policy = load('lib/cinematic/refazerGratis2810.ts')
  for (const fixture of [{ videoId: VIDEO, selected: 2, busy: false }, { videoId: VIDEO, selected: null, busy: false }, { videoId: VIDEO, selected: 2, busy: true }, { videoId: 'invalid', selected: 2, busy: false }]) {
    const calls = [], occupied = [], applied = []
    const { click } = compile(`export const click = ${callback}`, {
      ...helpers, ...policy, escolhida: fixture.selected, ocupado: fixture.busy, videoId: fixture.videoId, filmId: VIDEO,
      cenas: [{ index: 0 }, { index: 1 }, { index: 2 }], saldo: { firstFilm: true, freeLeft: 2 },
      FREE_REDO_FILM_PATH: '/api/free-redo/film', t: { failed: 'Offline error' },
      setOcupado: value => occupied.push(value), setNota() {}, trackEvent: async () => {}, aplicar: value => applied.push(value),
      fetch: async (url, options) => { calls.push({ url, options }); return { json: async () => ({ estado: 'working' }) } },
    })
    await click()
    const allowed = fixture.videoId === VIDEO && fixture.selected !== null && !fixture.busy
    assert.equal(calls.length, allowed ? 1 : 0)
    if (allowed) {
      assert.equal(calls[0].url, '/api/free-redo/film')
      assert.equal(calls[0].options.method, 'POST')
      assert.deepEqual(JSON.parse(calls[0].options.body), { videoId: VIDEO, sceneIndex: 2 })
      assert.deepEqual(occupied, [true, false])
      assert.deepEqual(json(applied), [{ estado: 'working' }])
    }
  }
})

test('regenerate-scene remains a prompt-only text operation with zero Fal or render submissions', async () => {
  for (const failure of [false, true]) {
    let textCalls = 0, videoCalls = 0, renderCalls = 0, networkCalls = 0
    const mocks = {
      '@/lib/aiModels': { AI_TEXT_MODELS: { scenePlannerLight: 'offline-text-model' } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) } }) },
      '@/lib/openai': { openai: { chat: { completions: { create: async () => { textCalls++; if (failure) throw new Error('offline text failure'); return { choices: [{ message: { content: JSON.stringify({ brollPrompt: 'A golden key lies behind a red wooden door.', pexelsQuery: 'golden key', visualMood: 'dark', shotType: 'macro' }) } }] } } } } } },
      '@/lib/broll/prompt-builder': { buildScenePrompt: () => ({ brollPrompt: 'A golden key is revealed inside an ancient wooden chest.', pexelsQuery: 'golden key', negativePrompt: 'text' }) },
      '@/lib/broll/relevance-score': { scoreRelevance: async () => 95 },
      '@/lib/falQueue': { submitFalQueueOnce: async () => { videoCalls++; return 'forbidden' } },
      '@/lib/compose': { submitCreatomateRender: async () => { renderCalls++; return 'forbidden' } },
    }
    const { POST } = loader(mocks, { OPENAI_API_KEY: 'offline-placeholder' }, { network: () => { networkCalls++; return forbidden() } })('app/api/regenerate-scene/route.ts')
    const result = await POST(new Request('https://offline.test/api/regenerate-scene', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sceneNumber: 2, narration: 'The girl found a golden key.', niche: 'story', currentPrompt: 'A closed chest.', globalStyle: { mood: 'dark', lighting: 'warm', cameraStyle: 'slow' }, model: 'kling/v4/image-to-video', render: true }) }))
    assert.equal(result.status, 200)
    const body = await result.json()
    assert.equal(typeof body.brollPrompt, 'string')
    assert.equal(body.sceneNumber, 2)
    assert.equal(body.request_id, undefined); assert.equal(body.render_id, undefined); assert.equal(body.fal_request_ids, undefined)
    assert.equal(textCalls, 1); assert.equal(videoCalls, 0); assert.equal(renderCalls, 0); assert.equal(networkCalls, 0)
  }
})

test('the real free-redo route binds the authenticated owner and drops forged provider, price and prompt fields', async () => {
  const starts = [], polls = [], paid = []
  let user = { id: 'verified-owner' }
  const db = {}
  const mocks = {
    '@fal-ai/client': { fal: { config: forbidden, queue: { status: forbidden, result: forbidden } } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/cinematic/claim': { loadVerifiedCinematicClaim: forbidden },
    '@/lib/falQueue': { submitFalQueueOnce: async (model, input) => { paid.push({ model, input }); return 'offline-seedance' } },
    '@/lib/compose': { submitCreatomateRender: forbidden, pollCreatomateRender: forbidden },
    '@/lib/renderAssets': { persistRenderAssets: forbidden },
    '@/lib/serverEvents': { writeServerEvent: async () => true },
    '@/lib/freeRedo/core': { MARCA_REFAZER_1910: 'offline-redo-marker' },
    '@/lib/freeRedo/filmServer': {
      iniciarRefacaoFilme: async (deps, args) => { starts.push(json(args)); assert.equal(deps.db, db); await deps.submitScene(SEEDANCE, { prompt: 'Only the verified server decides this scene', duration: '4', resolution: '720p', aspect_ratio: '9:16', generate_audio: false }); return { status: 200, body: { estado: 'working' } } },
      acompanharRefacaoFilme: async (_deps, args) => { polls.push(json(args)); return { status: 200, body: { estado: 'working' } } },
    },
  }
  const route = loader(mocks, { NEXT_PUBLIC_SUPABASE_URL: 'https://offline.test', SUPABASE_SERVICE_ROLE_KEY: 'offline-placeholder', FAL_KEY: 'offline-placeholder' })('app/api/free-redo/film/route.ts')
  const malicious = { videoId: VIDEO, sceneIndex: 2, userId: 'forged-owner', model: 'kling/v4/image-to-video', prompt: 'forged prompt', duration: 30, credits: 0, free: true, render: true }
  const result = await route.POST(new Request('https://offline.test/api/free-redo/film', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(malicious) }))
  assert.equal(result.status, 200)
  assert.deepEqual(starts, [{ userId: 'verified-owner', videoId: VIDEO, sceneIndex: 2 }])
  assert.equal(paid.length, 1); assert.equal(paid[0].model, SEEDANCE); assert.equal(paid[0].input.generate_audio, false)
  const url = new URL('https://offline.test/api/free-redo/film?videoId=' + VIDEO + '&lite=1&userId=forged-owner&model=kling/v4/text-to-video')
  assert.equal((await route.GET({ nextUrl: url })).status, 200)
  assert.deepEqual(polls, [{ userId: 'verified-owner', videoId: VIDEO, lite: true }])
  user = null
  assert.equal((await route.POST(new Request('https://offline.test/api/free-redo/film', { method: 'POST', body: JSON.stringify(malicious) }))).status, 401)
  assert.equal(starts.length, 1); assert.equal(paid.length, 1)
})
