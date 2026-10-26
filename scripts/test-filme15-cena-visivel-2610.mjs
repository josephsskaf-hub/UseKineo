// KINEO-FILME15-PERFEITO-2610: the real signed builder has micro-overlapping shots.
// Run its output through the actual delivery gate; no provider/env/network.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const file = 'lib/free15Gate.ts'
const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const clone = value => JSON.parse(JSON.stringify(value))
const load = createOfflineLoader({ mocks: { '@/lib/narration/niche-mapping': { selectPersonaForScript: () => null } } })
const compose = load('@/lib/compose')
const urls = [0, 1, 2].map(i => `https://fixture.invalid/clip-${i}.mp4`)
const source = compose.buildCreatomateSource({
  clipUrls: urls, clipSeconds: [6, 6, 6], voiceoverUrl: 'https://fixture.invalid/voice.mp3',
  voiceoverScript: 'A girl opens the gate. She finds the golden key. She returns home.',
  sceneCaptions: [], duration: 15, realAudioDuration: 15, quality: 'cinematic_ai', seedanceShortFilm: true,
  musicUrl: null, watermark: false, endCard: false,
})
const shots = source.elements.filter(e => e.type === 'video' && e.track === 2)
assert.equal(shots.length, 3)
const scenes = urls.map((clipUrl, index) => ({ index, clipUrl, model: 'seedance', input: {}, seconds: 6 }))
const state = { version: 'free15-gate-v1', status: 'ready', source, attempted: false, captionElements: [], captionEvidence: null, reason: '', updatedAt: 0 }
const media = { url: 'https://fixture.invalid/final.mp4', snapshotUrl: null, durationSeconds: 15 }
const verdict = t => ({ score: 85, cap_limit: 85, caps: ['invented text'], evidence_status: 'complete', identity_consistent: true,
  caption_legible: true, caption_language_ok: true, frames: [{ i: 1, t, issues: ['invented_text'], note: 'Invented sign in this shot.' }] })

function contract(gate) {
  for (let i = 1; i < shots.length; i++) {
    const cut = shots[i].time
    assert.ok(shots[i - 1].time + shots[i - 1].duration > cut, 'actual builder overlaps outgoing tail')
    for (const t of [cut, cut + 0.02, cut + 0.05]) {
      assert.equal(gate.decideFree15Gate(state, media, verdict(t), scenes).sceneIndex, i, `visible incoming scene at ${t}s`)
    }
    assert.equal(gate.decideFree15Gate(state, media, verdict(cut - 0.001), scenes).sceneIndex, i - 1, 'before the cut belongs to outgoing shot')
  }
  assert.equal(gate.decideFree15Gate(state, media, verdict(1), scenes).sceneIndex, 0)
  assert.equal(gate.decideFree15Gate(state, media, verdict(null), scenes).kind, 'fail', 'missing time cannot buy an arbitrary scene')
  assert.equal(gate.decideFree15Gate(state, media, verdict(100), scenes).kind, 'fail', 'out-of-timeline evidence cannot buy an arbitrary scene')
}
const gate = load('@/lib/free15Gate')
contract(gate)
assert.deepEqual(clone(source.elements.filter(e => e.type === 'video')), clone(shots), 'gate leaves assembled source intact')
const before = 'return hits.reduce<{ index: number; start: number } | undefined>((visible, hit) =>\n    !visible || hit.start >= visible.start ? hit : visible, undefined)?.index'
assert.equal(raw.split(before).length, 2, 'mutant replaces exactly the production visibility choice')
const mutant = raw.replace(before, 'return hits[0]?.index')
const mutatedGate = createOfflineLoader({ source: (name, text) => name === file ? mutant : text })(file)
assert.throws(() => contract(mutatedGate), assert.AssertionError, 'old first-hit policy must fail the same cut contract')
console.log('PASS actual builder cut/overlap visibility; old first-hit mutant rejected')
