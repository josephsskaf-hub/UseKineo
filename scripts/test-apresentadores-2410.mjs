// KINEO-APRESENTADORES-2410 — actual catalog, public choices, legacy plan and rotation; no providers.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { generationJob } from './lib/apresentadores-admin2410.mjs'
import { createHash } from 'node:crypto'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const JSON_FILE = 'lib/ads/presenterCandidates2410.json'
const actualRows = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'))
const rows = actualRows.map(p => ({ ...p, status: 'pending', reviewedBy: null, reviewedAt: null, checks: { eyesOpen: false, naturalHands: false, neutralClothes: false, identityMatch: false, voiceMatch: false }, portrait: null, facePortrait: null, voiceSample: null, assetHashes: null }))
const plain = v => JSON.parse(JSON.stringify(v))
const existing = ['sofia', 'amara', 'rahul', 'kenji', 'jade', 'robert']
function world(data = rows, source = null) {
  const load = createOfflineLoader({ mocks: { './presenterCandidates2410.json': data }, source })
  return { C: load('lib/ads/presenterCandidates2410'), P: load('lib/ads/v2Presenter'), E: load('lib/ads/cena/escolhaCatalog'), R: load('lib/ads/cena/presenters95'), V: load('lib/ads/v2PresenterV2'), L: load('lib/textLanguage') }
}
const promoted = p => ({ ...plain(p), status: 'approved', reviewedBy: 'Joseph Skaf', reviewedAt: '2026-10-24T18:00:00.000Z',
  checks: Object.fromEntries(Object.keys(p.checks).map(k => [k, true])),
  portrait: `/ads/presenters/${p.id}.webp`, facePortrait: `/ads/presenters/${p.id}-face.webp`, voiceSample: `/ads/presenters/${p.id}-voice.mp3`,
  assetHashes: { portrait: 'a'.repeat(64), facePortrait: 'b'.repeat(64), voiceSample: 'c'.repeat(64) } })

assert(rows.length >= 12, 'the prepared batch is retained as the catalog grows')
assert.equal(new Set(rows.map(p => p.id)).size, 12)
assert(rows.filter(p => p.gender === 'woman').length >= 6)
assert(rows.filter(p => p.gender === 'man').length >= 6)
assert.equal(Math.min(...rows.map(p => p.ageMin)), 20)
assert.equal(Math.max(...rows.map(p => p.ageMax)), 65)
assert(rows.every(p => p.status === 'pending' && !p.portrait && !p.facePortrait && !p.voiceSample && !p.assetHashes))
const W = world()
assert.deepEqual(plain(W.E.CENA_ESCOLHA_PRESENTERS.map(p => p.id)), existing)
assert.equal(W.P.ADS_V2_PRESENTER_LIBRARY.length, 12)
assert.equal(W.C.PRESENTER_CANDIDATES_APPROVED_2410.length, 0)
for (const p of rows) {
  assert.match(p.id, /^[a-z]+$/)
  assert(!W.P.adsV2PresenterById(p.id))
  assert(!W.E.escolhaPresenter(p.id))
  assert.equal(W.V.adsV2PresenterV2Visible(p.id, false), false)
  const prompt = W.C.presenterCandidatePortraitPrompt2410(p)
  assert.equal(generationJob(p).body.prompt, prompt)
  assert.equal(generationJob(p).voice.voiceId, W.V.adsV2PresenterV2VoiceFor('pt', p.gender, p.id).voiceId)
  assert(prompt.length <= 2000 && prompt.includes('eyes fully OPEN') && prompt.includes('natural fingers') && prompt.includes('Natural daylight'))
}

// Approved fixtures enter BOTH public and legacy catalogs; reject/incomplete approval never does.
for (const p of rows) {
  const A = world(rows.map(row => row.id === p.id ? promoted(row) : row))
  assert.equal(A.E.CENA_ESCOLHA_PRESENTERS.length, 7)
  assert(A.E.escolhaPresenter(p.id) && A.P.adsV2PresenterById(p.id))
  assert.equal(A.V.adsV2PresenterV2Visible(p.id, false), true)
  const picked = A.V.adsV2PresenterV2GatePick({ presenterId: p.id, person: 0, internal: false, library: A.P.ADS_V2_PRESENTER_LIBRARY })
  assert.equal(picked.presenterId, p.id)
  for (const lang of A.L.NARRATION_LANGUAGES.filter(l => l.minimaxBoost)) {
    const voice = A.V.adsV2PresenterV2VoiceFor(lang.code, p.gender, p.id)
    assert.equal(voice.engine, 'minimax')
    assert.equal(voice.languageBoost, lang.minimaxBoost)
    assert.equal(A.V.adsV2PresenterV2VoiceIdOf(lang.code, p.gender, { engine: 'minimax' }, p.id), 'minimax:' + voice.voiceId)
  }
  assert.equal(A.V.adsV2PresenterV2SampleFor(A.P.adsV2PresenterById(p.id), 'pt'), `/ads/presenters/${p.id}-voice.mp3`)
  assert.equal(A.V.adsV2PresenterV2SampleFor(A.P.adsV2PresenterById(p.id), 'ja'), null)
  for (const broken of [{ status: 'rejected' }, { reviewedBy: 'someone else' }, { assetHashes: null }, { facePortrait: null }, { reviewedAt: null }, { checks: { ...promoted(p).checks, eyesOpen: false } }]) {
    const B = world(rows.map(row => row.id === p.id ? { ...promoted(row), ...broken } : row))
    assert(!B.E.escolhaPresenter(p.id) && !B.P.adsV2PresenterById(p.id), JSON.stringify(broken))
  }
}

// No category can exhaust a three-person history while only the existing six are live.
for (const category of Object.keys(W.R.CENA95_ACTORS)) {
  let recent = []
  for (let i = 0; i < 24; i++) {
    const pick = W.R.chooseCena95Presenter(category, 'external-customer', recent)
    assert(existing.includes(pick.id) && !recent.slice(0, 3).includes(pick.id))
    recent = [pick.id, ...recent]
  }
  for (const p of rows) assert.throws(() => W.R.chooseCena95Presenter(category, 'external-customer', [], `https://www.usekineo.com/ads/presenters/${p.id}.webp`))
}

// Promotion guard checks actual shipped bytes, not just status strings.
const REAL = world(actualRows)
const approvedActual = actualRows.filter(p => p.status === 'approved')
assert.equal(REAL.E.CENA_ESCOLHA_PRESENTERS.length, existing.length + approvedActual.length)
assert.equal(REAL.P.ADS_V2_PRESENTER_LIBRARY.length, 12 + approvedActual.length)
for (const p of actualRows) {
  assert(['pending', 'approved', 'rejected'].includes(p.status))
  assert.equal(REAL.C.presenterCandidateApproved2410(p), p.status === 'approved', 'every recorded approval must be complete: ' + p.id)
  assert.equal(!!REAL.E.escolhaPresenter(p.id), p.status === 'approved', 'actual public gate: ' + p.id)
}
for (const p of REAL.C.PRESENTER_CANDIDATES_APPROVED_2410) for (const field of ['portrait', 'facePortrait', 'voiceSample']) {
  const bytes = fs.readFileSync('public' + p[field])
  assert.equal(createHash('sha256').update(bytes).digest('hex'), p.assetHashes[field])
}

// Executable mutant controls: each weakened rule must break the behavioral contract.
const file = 'lib/ads/presenterCandidates2410.ts', raw = fs.readFileSync(file, 'utf8')
for (const [from, to, bad] of [
  ["p.status === 'approved'", 'true', { status: 'rejected' }],
  ["p.reviewedBy === 'Joseph Skaf'", 'true', { reviewedBy: 'someone else' }],
  ['p.checks[k] === true', 'true', { checks: { ...promoted(rows[0]).checks, eyesOpen: false } }],
]) {
  assert.equal(raw.split(from).length, 2)
  const fixture = { ...promoted(rows[0]), ...bad }
  const M = world([fixture, ...rows.slice(1)], (path, text) => path === file ? raw.replace(from, to) : text)
  assert(M.E.escolhaPresenter(fixture.id), 'mutant applied and erroneously admits an unreviewed candidate')
  assert(!world([fixture, ...rows.slice(1)]).E.escolhaPresenter(fixture.id), 'real guard kills mutant')
}
console.log('PASS: 12 pending; 6 unchanged public choices; approve/reject and incomplete-review gates; 444 voice selections; rotation; actual asset hashes; 3 mutants killed.')
