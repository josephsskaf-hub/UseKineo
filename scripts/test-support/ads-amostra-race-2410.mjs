// KINEO-AMOSTRA-ANUNCIO-2410 — real runtime/controller, delayed NULL-lease contender and in-memory source mutant.
// SDKs, transport and storage are injected offline. No source mutation on disk, env or provider calls.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createOfflineLoader } from './offline-ts-loader.mjs'

const RUNTIME = 'lib/ads/cena/runtime.ts', plain = x => JSON.parse(JSON.stringify(x))
const read = (path, over) => over[path] ?? readFileSync(path, 'utf8').replace(/\r\n/g, '\n')

async function raceWorld(over = {}, readMode = 'fresh') {
  const effects = [], now = Date.now(), owner = '20000000-0000-4000-8000-000000000001', id = '30000000-0000-4000-8000-000000000001'
  let row
  const admin = {
    auth: { admin: { getUserById: async userId => { assert.equal(userId, owner); return { data: { user: { id: owner, email: 'real-customer@example.org' } }, error: null } } } },
    from(table) {
      assert.equal(table, 'ads_v2_orders', 'runtime only touches its leased order')
      let operation = 'read', patch, projection, filters = [], executed = false
      const q = {
        update(value) { operation = 'update'; patch = plain(value); return q },
        select(value) { projection = value; return q },
        eq(key, value) { filters.push(r => r[key] === value); return q },
        is(key, value) { filters.push(r => (r[key] ?? null) === value); return q },
        async execute() {
          assert.equal(executed, false, 'each query executes once'); executed = true
          if (!filters.every(f => f(row))) return { data: null, error: null }
          if (operation === 'read') {
            assert.equal(projection, 'plan'); assert.ok(row.assembly_lease_at, 'fresh state is read only under the acquired lease')
            effects.push(['fresh-read', row.assembly_lease_at])
            if (readMode === 'null') return { data: null, error: null }
            if (readMode === 'error') return { data: null, error: { code: 'OFFLINE_READ_FAILURE' } }
            return { data: { plan: plain(row.plan) }, error: null }
          }
          if (Object.hasOwn(patch, 'plan')) effects.push(['save', plain(patch.plan)])
          else effects.push([patch.assembly_lease_at === null ? 'release' : 'claim', patch.assembly_lease_at])
          Object.assign(row, patch)
          return { data: projection ? { id: row.id } : null, error: null }
        },
        maybeSingle() { return q.execute() },
        then(a, b) { return q.execute().then(a, b) },
      }
      return q
    },
  }
  const forbidden = label => { effects.push([label]); throw new Error('Offline unexpected ' + label) }
  const mocks = {
    '@/lib/openai': { openai: { chat: { completions: { create: () => forbidden('model') } } } },
    '../v2Billing': { failAdsV2Order: async () => { effects.push(['failed-order']); return { won: false } } },
    '../v2Shots': {
      submitShotOnce: async () => { effects.push(['video-submit']); return { kind: 'accepted', requestId: 'duplicate-receipt' } },
      pollFalJob: async (_endpoint, receipt) => { effects.push(['video-poll', receipt]); return { state: 'pending', url: null } },
      persistShotClip: async () => forbidden('video-copy'),
    },
    '../v2Images': { persistSceneImage: async () => forbidden('image-copy') },
    '@/lib/serverEvents': { writeServerEvent: async event => effects.push(['event', event.name]) },
    '@/lib/compose': {
      CreatomateSubmitError: class extends Error {}, estimateMp3DurationSeconds: () => 7,
      submitCreatomateRender: async () => { effects.push(['montage-submit']); return 'duplicate-montage' },
      uploadVoiceoverToSupabase: async () => { effects.push(['voice-upload']); return 'https://offline.example/duplicate.mp3' },
    },
    '@/lib/ttsFallback': { synthesizeTtsFallback: async () => { effects.push(['tts-submit']); return Buffer.from('offline-audio') } },
    '@/lib/lyriaMusic': { submeterLyria: async () => forbidden('music-submit'), lyriaPromptFor: () => 'offline music', esperarLyria: async () => forbidden('music-poll') },
  }
  const load = createOfflineLoader({ mocks, globals: { Error }, source: (path, source) => over[path] ?? source })
  const planner = load('lib/ads/cena/escolhaPlan.ts'), pipeline = load('lib/ads/cena/pipeline.ts')
  const plan = await planner.planCenaEscolha({ foto: 'https://offline.example/product.png', frase: 'GLOW.', cta: 'Saiba mais.', language: 'pt', formato: 'ugc', beneficios: [], voice_mode: 'narrated' }, 'kling3', async call => call.images.length ? { category: 'skincare', product: 'GLOW', benefits: [], offer: '', confidence: .99 } : { hooks: ['Conhece GLOW?', 'Já viu GLOW?', 'Vamos conhecer GLOW?'], use: 'Conheça GLOW.', benefit: 'Veja os detalhes.', cta: 'Saiba mais.' }, { presenter_id: 'sofia', scenario_id: 'skincare_bathroom', sample: true })
  const stale = pipeline.newCenaState(plan, 'kling3')
  stale.phase = 'video'; stale.keyframe = 'https://offline.example/chosen.png'; stale.keyframes = [stale.keyframe, stale.keyframe]
  const oldOrder = { id, user_id: owner, status: 'generating', assembly_lease_at: null, plan: { staleOnly: true, cena: plain(stale) } }
  const winner = plain(stale)
  winner.voiceUrl = 'https://offline.example/already-paid-voice.mp3'
  winner.voiceClaimedAt = now - 1000
  winner.escolhaMedia = { marker: 'KINEO-ADS-ESCOLHA-2310', voice: { status: 'done', attempt: 1, seconds: 7, text: plan.script.narration }, music: { status: 'done', url: 'https://offline.example/library.mp3' } }
  winner.jobs = [{ endpoint: 'fal-ai/kling-video/v3/pro/image-to-video', input: { duration: '8', generate_audio: false }, kind: 'video', index: 0, seconds: 8, keepSeconds: 8, status: 'pending', requestId: 'already-accepted-receipt', claimedAt: now - 1000 }]
  // The earlier winner has SAVED its accepted receipt and RELEASED the NULL lease.
  // The delayed caller still holds oldOrder with no voice or jobs, and can legitimately win the NULL lease next.
  row = { ...plain(oldOrder), plan: { winnerOnly: 'preserve this outer plan field too', cena: winner } }
  await load(RUNTIME).advanceCenaOrder(admin, oldOrder, Date.now() + 60_000)
  return { effects, row, oldOrder }
}

export async function proveEscolhaSampleRace(over = {}) {
  const w = await raceWorld(over)
  const paid = w.effects.filter(e => ['tts-submit', 'voice-upload', 'video-submit', 'montage-submit', 'music-submit'].includes(e[0]))
  assert.equal(paid.length, 0, 'a delayed NULL-lease contender must reuse the winner voice and accepted Kling receipt')
  assert.equal(w.effects.filter(e => e[0] === 'fresh-read').length, 1, 'read durable state under the newly acquired lease')
  assert.deepEqual(w.effects.filter(e => e[0] === 'video-poll'), [['video-poll', 'already-accepted-receipt']])
  assert.equal(w.row.plan.cena.jobs[0].requestId, 'already-accepted-receipt')
  assert.equal(w.row.plan.cena.voiceUrl, 'https://offline.example/already-paid-voice.mp3')
  assert.equal(w.oldOrder.plan.winnerOnly, 'preserve this outer plan field too', 'subsequent saves merge the freshly read outer plan')
  assert.equal(w.row.assembly_lease_at, null, 'the winner releases only its own token')
  assert.equal(w.effects.some(e => e[0] === 'failed-order'), false)
  for (const mode of ['null', 'error']) {
    const failed = await raceWorld(over, mode)
    assert.deepEqual(failed.effects.map(e => e[0]), ['claim', 'fresh-read', 'release'], `fresh ${mode} read must fail closed before TTS, poll, video or save`)
    assert.equal(failed.row.plan.cena.jobs[0].requestId, 'already-accepted-receipt')
    assert.equal(failed.row.plan.winnerOnly, 'preserve this outer plan field too')
    assert.equal(failed.row.assembly_lease_at, null)
  }
  return { staleNullLease: true, failedReads: ['null', 'error'], paidSubmissions: 0 }
}

export async function proveEscolhaSampleRaceMutant(over = {}) {
  const source = read(RUNTIME, over), ast = ts.createSourceFile(RUNTIME, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), matches = []
  function visit(node) { if (ts.isIfStatement(node) && node.expression.getText(ast) === 'isEscolhaSamplePlan(state.plan)') matches.push(node); ts.forEachChild(node, visit) }
  visit(ast); assert.equal(matches.length, 1, 'the post-claim sample reread mutant applies exactly once')
  const node = matches[0], mutated = source.slice(0, node.getStart(ast)) + '{ /* mutant: use the delayed old NULL-lease snapshot */ }' + source.slice(node.end)
  assert.notEqual(mutated, source)
  let failure
  try { await proveEscolhaSampleRace({ ...over, [RUNTIME]: mutated }) } catch (error) { failure = error }
  assert.ok(failure, 'removing the fresh reread must fail the real runtime behavior')
  assert.equal(failure.code, 'ERR_ASSERTION', `syntax/import/incidental runtime errors do not kill this mutant: ${failure.stack}`)
  return { killed: 1, diskMutations: 0 }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await proveEscolhaSampleRace(); await proveEscolhaSampleRaceMutant()
  console.log('VERDE: sample runtime delayed NULL-lease contender + null/error reads + behavioral mutant (offline)')
}
