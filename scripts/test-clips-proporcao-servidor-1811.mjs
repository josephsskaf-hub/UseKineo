import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

// Valid grayscale PNGs with different IHDR dimensions. The route receives only the storage URL.
function png(width, height) {
  function chunk(type, bytes) {
    const payload = Buffer.concat([Buffer.from(type), bytes])
    let crc = 0xffffffff
    for (const byte of payload) {
      crc ^= byte
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
    }
    const out = Buffer.alloc(12 + bytes.length)
    out.writeUInt32BE(bytes.length)
    payload.copy(out, 4)
    out.writeUInt32BE(~crc >>> 0, out.length - 4)
    return out
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.alloc((width + 1) * height))), chunk('IEND', Buffer.alloc(0))])
}

const user = { id: '11111111-2222-3333-4444-555555555555', email: 'author@example.test' }
const storage = 'https://storage.example.test'
const photo = storage + '/storage/v1/object/public/renders/images/' + user.id + '/product.png'
const avatar = storage + '/storage/v1/object/public/avatars/' + user.id + '/room.png'
const h3 = 'minimax/h3-max-turbo/image-to-video'
const account = { userId: user.id, balance: 100, email: user.email, plan: 'studio' }
const ads = { engine: 'seedance', seconds: 5, aspect: '9:16', prompt: 'Rotate the product', image_url: photo }
const spaces = createOfflineLoader()('@/lib/spaces/spaces')
const room = { engine: spaces.SPACE_CLIP_ENGINE, seconds: spaces.SPACE_CLIP_SECONDS, aspect: '9:16',
  prompt: spaces.buildSpaceMotionPrompt(spaces.SPACE_KINDS[0]), image_url: avatar }

function world(bytes, rejectFirst = false) {
  const calls = [], models = []
  let existing = null
  const mocks = {
    '@fal-ai/client': {}, '@/lib/s25Access': {}, '@/lib/partnerAccess': {},
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    '@/lib/animate/remoteImage': { downloadPublicAnimateImage: async url => {
      calls.push('read')
      assert.ok(url === photo || url === avatar)
      return { buffer: bytes }
    } },
    '@/lib/credits/debit': { debitVideoCredits: async () => { calls.push('debit'); return { data: 90 } } },
    '@/lib/safety/contentModeration': {}, '@/lib/safety/topicModeration': {}, '@/lib/falAlert': {},
    '@/lib/recreate/invasorServer': {}, '@/lib/recreate/movimentoJuiz': {}, '@/lib/recreate/guias': {},
    '@/lib/recreate/generation': {}, '@/lib/recreate/seuVideo': {}, '@/lib/recreate/swapCheck': {},
    '@/lib/safety/quarantine': {}, '@/lib/credits/refund': {}, '@/lib/serverEvents': { writeServerEvent: async () => true },
    '@/lib/growth/homeClipsFirstServer': { homeVariantStamp: () => ({}) },
    'next/server': { NextResponse: Response },
  }
  const env = { NEXT_PUBLIC_SUPABASE_URL: storage }
  const server = createOfflineLoader({ mocks, env })('@/lib/clips/clipServer')
  const real = server.submitDepsFor({ admin: {}, userSupabase: {}, account })
  const deps = { ...real, engineAccess: () => ({ ok: true }), findByKey: async () => existing,
    countActive: async () => 0, moderate: async () => { calls.push('moderate'); return { ok: true } },
    insertPending: async row => { calls.push('insert'); existing = row; return { ok: true } },
    submit: async model => { calls.push('submit'); models.push(model)
      return rejectFirst && models.length === 1 ? { ok: false, ambiguous: false, error: 'rejected' } : { ok: true, requestId: 'queued' }
    },
    refund: async () => { calls.push('refund'); return 1 }, switchEngine: async () => true,
    markSubmitted: async () => true, markFailed: async () => true, event: async () => {}, queue: undefined,
  }
  const route = createOfflineLoader({ env, mocks: { ...mocks,
    '@/lib/clips/clipServer': { ...server, clipsAdmin: () => ({}), loadClipAccount: async () => account, submitDepsFor: () => deps },
  } })('@/app/api/clips/route')
  async function post(body, key = 'producao-test-0001') {
    return route.POST(new Request('https://site.example.test/api/clips', { method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(body) }))
  }
  return { post, calls, models }
}

for (const [w, h] of [[39, 100], [100, 39]]) {
  const t = world(png(w, h))
  const res = await t.post({ ...ads, width: 100, height: 100 })
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.code, 'image_aspect')
  assert.match(body.error, /crop/i)
  assert.deepEqual(t.calls, ['read'])
}
for (const [w, h] of [[40, 100], [100, 40], [90, 160], [160, 90]]) {
  const t = world(png(w, h))
  assert.equal((await t.post(ads)).status, 202)
  assert.equal((await t.post(ads)).status, 200)
  assert.deepEqual(t.calls, ['read', 'moderate', 'insert', 'debit', 'submit'])
  assert.deepEqual(t.models, [h3])
}
{
  const t = world(Buffer.from([0xff, 0xd8, 0xff]))
  const res = await t.post(ads)
  assert.equal(res.status, 400)
  assert.equal((await res.json()).code, 'image')
  assert.deepEqual(t.calls, ['read'])
}
{
  const t = world(null)
  assert.equal((await t.post({ ...ads, image_url: photo.replace(user.id, 'someone-else') })).status, 403)
  assert.deepEqual(t.calls, [])
  assert.equal((await t.post({ ...ads, image_url: null })).status, 202)
  assert.deepEqual(t.calls, ['moderate', 'insert', 'debit', 'submit'])
}
{
  // The effect catalog chooses the effective model even when a caller supplies another engine.
  const t = world(png(30, 100))
  const refused = await t.post({ ...ads, effect: 'bring_to_life', engine: 'kling' })
  assert.equal(refused.status, 400)
  assert.equal((await refused.json()).code, 'image_aspect')
  assert.deepEqual(t.calls, ['read'])
  const accepted = await t.post({ ...ads, effect: 'wings' })
  assert.equal(accepted.status, 202)
  assert.deepEqual(t.calls, ['read', 'read', 'moderate', 'insert', 'debit', 'submit'])
  assert.notEqual(t.models[0], h3)
}
for (const rejectFirst of [false, true]) {
  const t = world(png(30, 100), rejectFirst)
  assert.equal((await t.post(room, 'spaces-test-0001')).status, rejectFirst ? 502 : 202)
  assert.deepEqual(t.models, ['fal-ai/kling-video/v2.5-turbo/pro/image-to-video'])
  assert.deepEqual(t.calls, ['read', 'moderate', 'insert', 'debit', 'submit', ...(rejectFirst ? ['refund'] : [])])
}
{
  const t = world(png(90, 160), true)
  assert.equal((await t.post(room, 'spaces-test-0002')).status, 202)
  assert.deepEqual(t.models, ['fal-ai/kling-video/v2.5-turbo/pro/image-to-video', h3])
}
console.log('PASS POST /api/clips: uploaded bytes, inclusive boundaries, unreadable input, ownership, text, replay, Ads and Spaces fallback.')
