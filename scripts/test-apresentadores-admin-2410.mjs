// Offline safety tests: temporary files + loopback only. No credentials, .env, paid requests or production writes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, copyFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { get } from 'node:http'
import { CATALOG, CHECKS, FOUNDER, loadCatalog, updateCatalog, inspectAssets, decide, generationJob, buildPlan, importCandidate, generateCandidates, startAdmin, webpSize, renderAdmin } from './lib/apresentadores-admin2410.mjs'

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixtureEntry = (index) => ({ id: `candidate${index}`, name: `Pessoa ${index}`, gender: index % 2 ? 'woman' : 'man', ageMin: 25, ageMax: 30, tag: 'casual', look: 'an adult with a plain shirt', ethnicity: 'Teste', style: 'Estudante', pronoun: 'She', voiceProfile: 'young', status: 'pending', reviewedBy: null, reviewedAt: null, checks: Object.fromEntries(CHECKS.map(key => [key, false])), portrait: null, facePortrait: null, voiceSample: null, assetHashes: null })
async function fixture(t, { assets = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'kineo-presenters-2410-'))
  assert.equal(dirname(root), resolve(tmpdir()))
  t.after(async () => { assert.equal(dirname(root), resolve(tmpdir())); await rm(root, { recursive: true, force: true }) })
  await mkdir(join(root, 'lib', 'ads'), { recursive: true })
  await writeFile(join(root, CATALOG), JSON.stringify(Array.from({ length: 12 }, (_, index) => fixtureEntry(index))))
  if (assets) {
    await mkdir(join(root, 'public', 'ads', 'presenters'), { recursive: true })
    for (const suffix of ['', '-face']) await copyFile(join(sourceRoot, 'public', 'ads', 'presenters', 'sofia.webp'), join(root, 'public', 'ads', 'presenters', `candidate0${suffix}.webp`))
    await copyFile(join(sourceRoot, 'public', 'ads', 'presenters', 'sofia-voice.mp3'), join(root, 'public', 'ads', 'presenters', 'candidate0-voice.mp3'))
  }
  return root
}
const review = (catalog, action = 'approve') => ({ id: 'candidate0', action, expectedHash: catalog.hash, reviewedBy: FOUNDER, founderAcknowledgement: true, checks: Object.fromEntries(CHECKS.map(key => [key, true])) })

test('plan prepares twelve existing-route jobs without generating', () => {
  const plan = buildPlan(Array.from({ length: 12 }, (_, i) => fixtureEntry(i)))
  assert.equal(plan.jobs.length, 12)
  for (const job of plan.jobs) {
    assert.equal(job.endpoint, '/api/images/generate')
    assert.equal(job.body.model, 'nanobanana')
    assert.equal(job.body.size, 'portrait_16_9')
    assert.match(job.body.prompt, /eyes fully OPEN/)
    assert.match(job.body.prompt, /Natural daylight/)
    assert.ok(job.body.prompt.length <= 2000)
  }
})
test('generation fails closed before credentials or network without allow-paid', async () => {
  await assert.rejects(generateCandidates('/nonexistent', { id: 'candidate0' }, {}), /--allow-paid/)
  await assert.rejects(generateCandidates('/nonexistent', { id: 'candidate0', all: true, allowPaid: true }, {}), /exatamente/)
})
test('explicit future generation reuses the route, keeps cookie first-party and never silently retries', async (t) => {
  const root = await fixture(t)
  const originalFetch = globalThis.fetch
  const calls = []
  const image = await readFile(join(sourceRoot, 'public', 'ads', 'presenters', 'sofia.webp'))
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options })
    return calls.length === 1 ? Response.json({ url: 'https://assets.example.test/source.webp' }) : new Response(image, { headers: { 'Content-Type': 'image/webp' } })
  }
  t.after(() => { globalThis.fetch = originalFetch })
  const env = { KINEO_BASE_URL: 'https://www.usekineo.com', KINEO_FOUNDER_COOKIE: 'test-session=offline-fixture' }
  await assert.rejects(generateCandidates(root, { id: 'candidate0', allowPaid: true }, { ...env, KINEO_BASE_URL: 'https://untrusted.example' }), /cookie nunca/)
  assert.equal(calls.length, 0)
  const results = await generateCandidates(root, { id: 'candidate0', allowPaid: true }, env)
  assert.equal(results.length, 1)
  assert.equal(calls.length, 2)
  assert.equal(calls[0].url, 'https://www.usekineo.com/api/images/generate')
  assert.equal(JSON.parse(calls[0].options.body).model, 'nanobanana')
  assert.equal(calls[0].options.headers.Cookie, env.KINEO_FOUNDER_COOKIE)
  assert.equal(calls[1].options.headers, undefined)
  assert.deepEqual(await readFile(results[0].file), image)
  await assert.rejects(generateCandidates(root, { id: 'candidate0', allowPaid: true }, env), /já existe/)
  assert.equal(calls.length, 2)
  assert.equal((await loadCatalog(root)).entries[0].status, 'pending')
})
test('invalid and duplicate candidate ids are refused', async (t) => {
  const root = await fixture(t)
  const catalog = await loadCatalog(root)
  catalog.entries[0].id = '../outside'
  await writeFile(join(root, CATALOG), JSON.stringify(catalog.entries))
  await assert.rejects(loadCatalog(root), /ID/)
})
test('missing assets block approval, including founder-confirmed checks', async (t) => {
  const root = await fixture(t)
  await assert.rejects(decide(root, review(await loadCatalog(root))), /Aprovação bloqueada/)
  assert.equal((await loadCatalog(root)).entries[0].status, 'pending')
})
test('founder identity and every check are mandatory', async (t) => {
  const root = await fixture(t, { assets: true })
  const catalog = await loadCatalog(root)
  await assert.rejects(decide(root, { ...review(catalog), reviewedBy: 'Other' }), /Joseph Skaf/)
  await assert.rejects(decide(root, { ...review(catalog), founderAcknowledgement: false }), /Joseph Skaf/)
  await assert.rejects(decide(root, { ...review(catalog), checks: { ...review(catalog).checks, voiceMatch: false } }), /todos os itens/)
})
test('approval binds actual fullbody, face and voice bytes; reject and undo are reversible', async (t) => {
  const root = await fixture(t, { assets: true })
  const before = await loadCatalog(root)
  const approved = await decide(root, review(before))
  const entry = approved.entries[0]
  assert.equal(entry.status, 'approved')
  assert.equal(entry.reviewedBy, FOUNDER)
  assert.ok(Number.isFinite(Date.parse(entry.reviewedAt)))
  assert.deepEqual(Object.keys(entry.assetHashes), ['portrait', 'facePortrait', 'voiceSample'])
  assert.ok(Object.values(entry.assetHashes).every(value => /^[a-f0-9]{64}$/.test(value)))
  assert.equal((await inspectAssets(root, entry)).approvalCurrent, true)
  const rejected = await decide(root, review(approved, 'reject'))
  assert.equal(rejected.entries[0].status, 'rejected')
  assert.equal(rejected.entries[0].assetHashes, null)
  const undone = await decide(root, review(rejected, 'undo'))
  assert.equal(undone.entries[0].status, 'pending')
  assert.equal(undone.entries[0].reviewedBy, null)
  assert.ok(Object.values(undone.entries[0].checks).every(value => !value))
})
test('stale decisions and concurrent lock cannot overwrite another review', async (t) => {
  const root = await fixture(t)
  const before = await loadCatalog(root)
  await decide(root, review(before, 'reject'))
  await assert.rejects(decide(root, review(before, 'undo')), /catálogo mudou/)
  await writeFile(join(root, `${CATALOG}.lock`), '')
  await assert.rejects(updateCatalog(root, (await loadCatalog(root)).hash, (entries) => entries), /ocupado/)
  assert.equal((await loadCatalog(root)).entries[0].status, 'rejected')
})
test('changed audio bytes invalidate the previous approved hash', async (t) => {
  const root = await fixture(t, { assets: true })
  const catalog = await decide(root, review(await loadCatalog(root)))
  const audioPath = join(root, 'public', 'ads', 'presenters', 'candidate0-voice.mp3')
  const bytes = await readFile(audioPath)
  bytes[bytes.length - 1] ^= 1
  await writeFile(audioPath, bytes)
  const inspected = await inspectAssets(root, catalog.entries[0])
  assert.equal(inspected.ready, true)
  assert.equal(inspected.approvalCurrent, false)
})
test('safe local import revokes approval and keeps rejected candidates rejected', async (t) => {
  const root = await fixture(t, { assets: true })
  const approved = await decide(root, review(await loadCatalog(root)))
  const source = join(sourceRoot, 'public', 'ads', 'presenters', 'sofia.webp')
  const imported = await importCandidate(root, { id: 'candidate0', source, faceSource: source })
  assert.equal(imported.entries[0].status, 'pending')
  assert.equal(imported.entries[0].assetHashes, null)
  const rejected = await decide(root, review(imported, 'reject'))
  assert.equal(rejected.entries[0].status, 'rejected')
  const stillRejected = await importCandidate(root, { id: 'candidate0', voiceSource: join(sourceRoot, 'public', 'ads', 'presenters', 'sofia-voice.mp3') })
  assert.equal(stillRejected.entries[0].status, 'rejected')
  assert.ok(approved.hash !== imported.hash)
})
test('import refuses env paths, malformed images and unknown candidates', async (t) => {
  const root = await fixture(t)
  await assert.rejects(importCandidate(root, { id: 'candidate0', source: '.env.local', faceSource: 'other.webp' }), /\.env/)
  const bad = join(root, 'bad.webp')
  await writeFile(bad, 'not an image')
  await assert.rejects(importCandidate(root, { id: 'candidate0', source: bad, faceSource: bad }), /WebP/)
  await assert.rejects(importCandidate(root, { id: '../outside', source: bad }), /desconhecido/)
  assert.equal(webpSize(Buffer.from('not an image')), null)
})
test('UI escapes catalog text and never fabricates a missing preview', () => {
  const html = renderAdmin([{ ...fixtureEntry(0), name: '<script>alert(1)</script>' }], {}, { staticPreview: true })
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.match(html, /Imagem não gerada/)
  assert.match(html, /Amostra de voz pendente/)
  assert.ok(!html.includes('<img'))
})
test('HTTP server only binds loopback and rejects foreign host/origin and CSRF', async (t) => {
  const root = await fixture(t)
  const { server, origin } = await startAdmin(root)
  t.after(() => new Promise((accept) => { server.closeAllConnections(); server.close(accept) }))
  assert.equal(server.address().address, '127.0.0.1')
  const response = await fetch(origin)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/)
  const html = await response.text()
  const token = html.match(/const token="([a-f0-9]+)"/)[1]
  assert.equal((await fetch(origin, { headers: { Origin: 'https://evil.example' } })).status, 403)
  const foreignHost = await new Promise((accept, reject) => { get(origin, { headers: { Host: 'evil.example' } }, (reply) => { reply.resume(); accept(reply.statusCode) }).once('error', reject) })
  assert.equal(foreignHost, 403)
  assert.equal((await fetch(`${origin}/decision`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' })).status, 403)
  const body = review(await loadCatalog(root), 'reject')
  const decision = await fetch(`${origin}/decision`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: JSON.stringify(body) })
  assert.equal(decision.status, 200)
  assert.equal((await loadCatalog(root)).entries[0].status, 'rejected')
  assert.equal((await fetch(`${origin}/asset/../outside/portrait`)).status, 404)
})
