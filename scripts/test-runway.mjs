// Default: offline regression fixtures; no credentials or network.
// Paid smoke test, only when explicitly requested:
//   RUNWAY_API_KEY=xxx node scripts/test-runway.mjs --live [prompt]
// KINEO-LEVA-2410: the full test suite must never start paid generations.
import assert from 'node:assert/strict'

const RUNWAY_BASE = 'https://api.dev.runwayml.com/v1'
const RUNWAY_VERSION = '2024-11-06'

const DEFAULT_PROMPT = 'Dark mysterious ocean at night, cinematic, 4K'

// The live smoke and offline fixtures exercise the same requests and polling.
function runner({ apiKey, fetch, sleep, now, log }) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'X-Runway-Version': RUNWAY_VERSION,
    'Content-Type': 'application/json',
  }
  async function postTask(path, payload) {
    log(`POST ${path} payload:`, JSON.stringify(payload))
    const res = await fetch(`${RUNWAY_BASE}${path}`, {
      method: 'POST', headers, body: JSON.stringify(payload),
    })
    const text = await res.text()
    log(`${path} → status=${res.status}`)
    log(`${path} body:`, text.slice(0, 800))
    if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
    const data = JSON.parse(text)
    if (!data.id) throw new Error(`${path} returned no task id`)
    return data.id
  }
  async function poll(id, maxMs = 90_000) {
    const deadline = now() + maxMs
    while (now() < deadline) {
      const res = await fetch(`${RUNWAY_BASE}/tasks/${id}`, { headers })
      const data = await res.json()
      log(`task ${id} status=${data.status} progress=${data.progress ?? 'n/a'}`)
      if (data.status === 'SUCCEEDED') return data
      if (data.status === 'FAILED' || data.status === 'CANCELLED') {
        throw new Error(`task ${id} ${data.status}: ${data.failure ?? '(no detail)'}`)
      }
      await sleep(2000)
    }
    throw new Error(`task ${id} timed out`)
  }
  async function run(prompt = DEFAULT_PROMPT) {
    const imgTaskId = await postTask('/text_to_image', {
      model: 'gen4_image', promptText: prompt, ratio: '720:1280',
    })
    const imageUrl = extractUrl(await poll(imgTaskId))
    if (!imageUrl) throw new Error('No image URL in text_to_image output')
    log('IMAGE URL:', imageUrl)
    const vidTaskId = await postTask('/image_to_video', {
      model: 'gen4_turbo', promptImage: imageUrl, promptText: prompt,
      ratio: '720:1280', duration: 10,
    })
    const videoUrl = extractUrl(await poll(vidTaskId, 180_000))
    log('VIDEO URL:', videoUrl)
    log('OK — Runway end-to-end pipeline works.')
    return { imageUrl, videoUrl }
  }
  return { postTask, poll, run }
}

function extractUrl(task) {
  const out = task.output
  if (Array.isArray(out)) return typeof out[0] === 'string' ? out[0] : out[0]?.url ?? null
  if (typeof out === 'string') return out
  if (out && typeof out === 'object') return out.url ?? null
  return null
}

function fixture(responses) {
  let time = 0
  const calls = [], waits = []
  const api = runner({
    apiKey: 'OFFLINE_FIXTURE', log() {}, now: () => time,
    sleep: async (ms) => { waits.push(ms); time += ms },
    fetch: async (url, init) => {
      calls.push({ url, ...init })
      assert.ok(responses.length, 'unexpected request: fixture exhausted')
      const { status = 200, body } = responses.shift()
      return { ok: status >= 200 && status < 300, status,
        text: async () => JSON.stringify(body), json: async () => body }
    },
  })
  return { ...api, calls, waits }
}

async function offline() {
  const tests = [
    ['image → polling → video uses the original payloads and headers', async () => {
      const imageUrl = 'https://fixture.invalid/image.png'
      const videoUrl = 'https://fixture.invalid/video.mp4'
      const responses = [
        { body: { id: 'image-1' } }, { body: { status: 'RUNNING' } },
        { body: { status: 'SUCCEEDED', output: [imageUrl] } },
        { body: { id: 'video-1' } }, { body: { status: 'PENDING' } },
        { body: { status: 'SUCCEEDED', output: [{ url: videoUrl }] } },
      ]
      const f = fixture(responses)
      assert.deepEqual(await f.run('Fixture prompt'), { imageUrl, videoUrl })
      assert.equal(responses.length, 0)
      assert.deepEqual(f.waits, [2000, 2000])
      assert.deepEqual(f.calls.map((c) => c.url), [
        `${RUNWAY_BASE}/text_to_image`, `${RUNWAY_BASE}/tasks/image-1`,
        `${RUNWAY_BASE}/tasks/image-1`, `${RUNWAY_BASE}/image_to_video`,
        `${RUNWAY_BASE}/tasks/video-1`, `${RUNWAY_BASE}/tasks/video-1`,
      ])
      assert.deepEqual(JSON.parse(f.calls[0].body), {
        model: 'gen4_image', promptText: 'Fixture prompt', ratio: '720:1280',
      })
      assert.deepEqual(JSON.parse(f.calls[3].body), {
        model: 'gen4_turbo', promptImage: imageUrl, promptText: 'Fixture prompt',
        ratio: '720:1280', duration: 10,
      })
      assert.deepEqual(f.calls.map((c) => c.method ?? 'GET'), ['POST', 'GET', 'GET', 'POST', 'GET', 'GET'])
      for (const c of f.calls) assert.deepEqual(c.headers, {
        Authorization: 'Bearer OFFLINE_FIXTURE', 'X-Runway-Version': '2024-11-06',
        'Content-Type': 'application/json',
      })
    }],
    ['POST refuses HTTP errors and missing task IDs', async () => {
      await assert.rejects(fixture([{ status: 401, body: {} }]).postTask('/text_to_image', {}), /failed: 401/)
      await assert.rejects(fixture([{ body: {} }]).postTask('/image_to_video', {}), /returned no task id/)
    }],
    ['FAILED and CANCELLED tasks stop without another request', async () => {
      for (const status of ['FAILED', 'CANCELLED']) {
        const f = fixture([{ body: { status, failure: 'fixture rejection' } }])
        await assert.rejects(f.poll('rejected'), new RegExp(`${status}: fixture rejection`))
        assert.equal(f.calls.length, 1)
        assert.deepEqual(f.waits, [])
      }
      await assert.rejects(fixture([{ body: { status: 'FAILED' } }]).poll('empty'), /FAILED: \(no detail\)/)
    }],
    ['polling times out using the injected clock and sleep', async () => {
      const f = fixture([{ body: { status: 'PENDING' } }, { body: { status: 'RUNNING' } }])
      await assert.rejects(f.poll('slow', 4000), /task slow timed out/)
      assert.equal(f.calls.length, 2)
      assert.deepEqual(f.waits, [2000, 2000])
    }],
    ['missing image output stops before the video POST', async () => {
      const f = fixture([{ body: { id: 'empty' } }, { body: { status: 'SUCCEEDED', output: [] } }])
      await assert.rejects(f.run(), /No image URL in text_to_image output/)
      assert.equal(f.calls.length, 2)
      assert.equal(JSON.parse(f.calls[0].body).promptText, DEFAULT_PROMPT)
    }],
    ['output extraction covers all supported response shapes and empty outputs', async () => {
      for (const output of ['url', ['url'], [{ url: 'url' }], { url: 'url' }]) {
        assert.equal(extractUrl({ output }), 'url')
      }
      for (const output of [undefined, null, [], {}, [{}], 0]) assert.equal(extractUrl({ output }), null)
    }],
  ]
  for (const [name, test] of tests) { await test(); console.log('OK ' + name) }
  console.log(`Runway: ${tests.length} offline fixture groups passed; no live API calls.`)
}

async function main() {
  if (!process.argv.includes('--live')) return offline()
  const apiKey = process.env.RUNWAY_API_KEY
  if (!apiKey) throw new Error('Missing RUNWAY_API_KEY env var; --live requires an explicit key.')
  const prompt = process.argv.slice(2).filter((arg) => arg !== '--live')[0] ?? DEFAULT_PROMPT
  await runner({ apiKey, fetch: globalThis.fetch, now: Date.now,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)), log: console.log }).run(prompt)
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
