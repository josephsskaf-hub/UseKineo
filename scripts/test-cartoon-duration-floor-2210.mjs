// KINEO-CARTOON-CONSISTENCIA-2210 — composição REAL offline + metadados de claim verificado em dublê; zero rede/render/crédito.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const FILE = 'lib/kidsCartoon/cartoonDuration.ts'
const text = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
const load = (override) => createOfflineLoader({ source: (p, s) => p === FILE && override ? override : s })
const L = load(), C = L('lib/compose.ts'), K = L(FILE)
const urls = ['https://offline.example/one.mp4', 'https://offline.example/two.mp4', 'https://offline.example/three.mp4']
const words = 'Ollie sees a little bird beside the river. He carries a soft leaf to make a tiny boat. The bird smiles and steps inside. Ollie gently pushes the boat toward the shore. Together they learn that small acts of kindness matter.'.split(' ')
const response = { duration: 15, fal_model: 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video', kids_cartoon: { character: 'ollie', captions: true }, clip_seconds: [6, 6, 6] }
const claim = { quality: 'cinematic_ai', response, authorizedCompletedUrls: urls }
const copy = (x) => JSON.parse(JSON.stringify(x))
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const fixture = (seconds, media = urls) => C.buildCreatomateSource({
  clipUrls: media, clipSeconds: [6, 6, 6], clipSpeech: { narrationWords: words, wordStarts: [0, 14, 28] },
  voiceoverUrl: 'https://offline.example/narrator.mp3', voiceoverScript: words.join(' '), sceneCaptions: [],
  duration: 15, quality: 'cinematic_ai', realAudioDuration: seconds,
  musicUrl: 'https://offline.example/music.mp3', watermark: true,
})
let proofs = 0
const check = (name, condition) => { assert.ok(condition, name); proofs++ }
function outcome(module, seconds) {
  const before = fixture(seconds)
  const beforeJSON = JSON.stringify(before)
  const result = module.enforceCartoonDurationFloor(before, { verifiedClaim: claim, clipUrls: urls })
  const after = result.source, video = after.elements.filter(e => e.type === 'video' && Number(e.track) === 2)
  const track = (source, n) => source.elements.filter(e => Number(e.track) === n)
  const clipsFit = video.length === 3 && video.every(e => e.loop === false && Number(e.trim_start) + Number(e.duration) <= 6.001)
  let end = 0, continuous = true
  for (const e of video) { if (e.time > end + 0.001) continuous = false; end = Math.max(end, e.time + e.duration) }
  return { before, after, result, floor: after.duration >= 15, noFreeze: clipsFit && continuous && end >= 15,
    voice: eq(track(before, 4), track(after, 4)), captions: eq(track(before, 5), track(after, 5)) && eq(track(before, 7), track(after, 7)),
    unchangedInput: JSON.stringify(before) === beforeJSON,
    bed: track(after, 8).every(e => e.duration === 15 && e.loop === true),
    watermark: track(after, 9).every(e => e.duration === 15),
  }
}
for (const seconds of [13.5, 14.2]) {
  const r = outcome(K, seconds)
  check(`${seconds}s reproduces the old short output`, r.before.duration === seconds)
  check(`${seconds}s becomes a full 15s timeline`, r.floor && r.after.duration === 15 && r.result.applied)
  check(`${seconds}s uses three real clips within their signed trim limits`, r.noFreeze)
  check(`${seconds}s preserves narration, spoken captions and original input`, r.voice && r.captions && r.unchangedInput)
  check(`${seconds}s extends only the existing music bed and full-film watermark`, r.bed && r.watermark)
}
const already = fixture(15.7)
check('a complete in-bounds cartoon retains the identical source object', K.enforceCartoonDurationFloor(already, { verifiedClaim: claim, clipUrls: urls }).source === already)
for (const other of [null, { ...claim, response: { ...response, kids_cartoon: undefined } },
  { ...claim, response: { ...response, duration: 35 } }, { ...claim, quality: 'cinematic_veo' },
  { ...claim, response: { ...response, fal_model: 'fal-ai/veo3.1' } }]) {
  const source = fixture(13.5)
  check('outside the signed 15s Seedance cartoon, the identical source is returned', K.enforceCartoonDurationFloor(source, { verifiedClaim: other, clipUrls: urls }).source === source)
}
const forgedUrls = urls.map(u => u.replace('/one.', '/foreign.'))
const rejectsOwnership = (module) => { try { module.enforceCartoonDurationFloor(fixture(13.5, forgedUrls), { verifiedClaim: claim, clipUrls: forgedUrls }); return false } catch (error) { return error.name === 'CartoonDurationError' } }
check('a matching caller-supplied timeline cannot replace signed clip ownership', rejectsOwnership(K))
const duplicatedUrls = [urls[0], urls[0], urls[0]]
assert.throws(() => K.enforceCartoonDurationFloor(fixture(13.5, duplicatedUrls), { verifiedClaim: { ...claim, authorizedCompletedUrls: duplicatedUrls }, clipUrls: duplicatedUrls }), { name: 'CartoonDurationError' })
check('three copies of one media URL cannot pretend to be 18s of unique footage', true)
for (const bad of [{ ...claim, response: { ...response, clip_seconds: undefined } },
  { ...claim, response: { ...response, clip_seconds: [5, 5, 5] } },
  { ...claim, response: { ...response, clip_seconds: [6, 6] }, authorizedCompletedUrls: urls.slice(0, 2) }]) {
  const source = fixture(13.5), snapshot = JSON.stringify(source)
  assert.throws(() => K.enforceCartoonDurationFloor(source, { verifiedClaim: bad, clipUrls: bad.authorizedCompletedUrls }), { name: 'CartoonDurationError' })
  check('missing/insufficient signed footage fails without mutating the source', snapshot === JSON.stringify(source))
}
assert.throws(() => K.enforceCartoonDurationFloor(fixture(18), { verifiedClaim: claim, clipUrls: urls }), { name: 'CartoonDurationError' })
check('even an existing long source cannot hide repeated footage beyond the signed capacity', true)
const looped = fixture(15)
looped.elements.find(e => e.type === 'video' && Number(e.track) === 2).loop = true
check('a looping cartoon is rebuilt with only bounded moving clips', K.enforceCartoonDurationFloor(looped, { verifiedClaim: claim, clipUrls: urls }).source.elements.filter(e => e.type === 'video' && Number(e.track) === 2).every(e => e.loop === false))
const trimmed = copy(fixture(14.2))
trimmed.elements.filter(e => e.type === 'video' && Number(e.track) === 2).forEach(e => { e.trim_start = 4; e.duration = 4.8 })
check('a source whose prior trims exceed the media is replanned inside the 6s clips', K.enforceCartoonDurationFloor(trimmed, { verifiedClaim: claim, clipUrls: urls }).source.elements.filter(e => e.type === 'video' && Number(e.track) === 2).every(e => e.trim_start + e.duration <= 6.001))
const route = readFileSync('app/api/compose/route.ts', 'utf8')
const hook = route.indexOf('enforceCartoonDurationFloor(source, { verifiedClaim: cinematicBirthClaim, clipUrls: composeClipUrls })')
check('the shared browser/recovery compose enforces the final source after formatting and before provider submission',
  hook > route.indexOf('const faceless15Relato = aplicarFaceless15(') && hook > route.indexOf('const desenhoAssinado = desenhoDoClaim(') &&
  hook < route.indexOf('renderId = await submitCreatomateOnce(source, submissionKey)', hook) &&
  route.slice(hook, route.indexOf('// Step 5', hook)).includes("code: 'cinematic_timeline_too_short'"))

const mutants = [
  ['floor removed', 'const MINIMUM_SECONDS = 15', 'const MINIMUM_SECONDS = 0', m => !outcome(m, 13.5).floor],
  ['ordinary films changed', " || !desenhoDoClaim(claim.response)", '', m => { const source = fixture(13.5); return m.enforceCartoonDurationFloor(source, { verifiedClaim: { ...claim, response: { ...response, kids_cartoon: undefined } }, clipUrls: urls }).source !== source }],
  ['video loop enabled', 'trim_start: slot.trimStart, loop: false', 'trim_start: slot.trimStart, loop: true', m => !outcome(m, 14.2).noFreeze],
  ['narration stretched', "(element.type === 'audio' && track === 8)", "(element.type === 'audio' && (track === 8 || track === 4))", m => !outcome(m, 13.5).voice],
  ['signed ownership bypassed', 'const clipSeconds = alignSignedClipSecondsWith(claim.response, claim.authorizedCompletedUrls, input.clipUrls, SEEDANCE_SHORT_CLIP_STEPS)', 'const clipSeconds = input.clipUrls.map(() => 6)', m => !rejectsOwnership(m)],
]
for (const [name, from, to, red] of mutants) {
  assert.equal(text.split(from).length - 1, 1, `unique mutation: ${name}`)
  const mutated = text.replace(from, to)
  check(`mutant applied and rejected by the product proof: ${name}`, mutated !== text && red(load(mutated)(FILE)))
}
console.log(`KINEO-CARTOON-CONSISTENCIA-2210 duration: ${proofs} proofs; ${mutants.length}/${mutants.length} mutants rejected; no provider call.`)
