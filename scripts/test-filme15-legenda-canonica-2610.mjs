// KINEO-FILME15-PERFEITO-2610 — canonical repair, offline; synthetic cases + short production excerpt.
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))
const load = createOfflineLoader()
const C = load('@/lib/free15CanonicalCaptions')
const F = load('@/lib/filmes/faceless15')
assert.equal(C.FREE15_CANONICAL_CAPTION_TIMING, 'approximate')
const source = { duration: 15, elements: [
  { type: 'video', track: 2, source: 'https://offline/scene.mp4', time: 0, duration: 15 },
  { type: 'audio', track: 4, source: 'https://offline/voice.mp3', time: 0, duration: 14.8 },
  { type: 'text', track: 5, text: 'BROKEN', time: 0, duration: 14.8, y: '62%', font_family: 'Example Font', font_size: 64, fill_color: '#ffffff' },
  { type: 'text', track: 9, text: 'watermark', time: 0, duration: 15 },
] }
const before = JSON.stringify(source)
const clean = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
for (const script of [
  'Some lines kept sending messages with the batteries unplugged.',
  'Telegraph wires sparked and shocked their operators.',
  'A tempestade atingiu o centro da cidade inteira.',
  'La lluvia cayó sobre la ciudad del norte.',
  'It was in the very very beginning.',
  // Read-only production audit 26/10, anonymized case a81b4f7bf7be: proportional F1
  // rendered "COM ORELHAS FLEXÍVEIS E" / "REAÇÕES HILÁRIAS!". No whole user script.
  'Com orelhas flexíveis e reações hilárias!',
]) {
  const captions = C.buildFree15CanonicalCaptions({ script, audioSeconds: 14.8, source })
  assert.equal(clean(captions.map(e => e.text).join(' ')), clean(script), 'canonical text preserved')
  assert.equal(captions[0].time, 0)
  for (let i = 0; i < captions.length; i++) {
    const e = captions[i], words = e.text.split(/\s+/)
    assert.equal(e.track, 5)
    assert.ok(words.length >= 2 && words.length <= 5, e.text)
    assert.equal(e.y, '62%'); assert.equal(e.font_family, 'Example Font')
    assert.ok(!e.text.includes('[color'), 'no simulated karaoke evidence')
    const end = Math.round((e.time + e.duration) * 1000) / 1000
    assert.equal(end, captions[i + 1]?.time ?? 14.8, 'contiguous full narration window')
    if (i < captions.length - 1) assert.ok(!F.FACELESS15_PALAVRAS_QUE_NAO_FECHAM.has(words.at(-1).toLowerCase()))
  }
}
assert.equal(JSON.stringify(source), before, 'source, voice and clips unchanged')
assert.equal(C.buildFree15CanonicalCaptions({ script: 'Hello world', audioSeconds: NaN, source }).length, 0)
const compact = C.buildFree15CanonicalCaptions({ script: '他找到一个秘密。', audioSeconds: 14.8, source })
assert.equal(compact.length, 1); assert.equal(compact[0].text, 'BROKEN', 'compact writing systems retain existing path')
// Execute the real compose fallback block: only captions may change, and only
// the signed 15s Seedance birth can opt into this initial repair.
const route = fs.readFileSync('app/api/compose/route.ts', 'utf8')
const start = route.indexOf('    // KINEO-FILME15-PERFEITO-2610: production caption audit')
const end = route.indexOf('    if (captionSelection.alignment)', start)
assert.ok(start > 0 && end > start)
const js = ts.transpileModule(route.slice(start, end), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const run = new (Object.getPrototypeOf(async function() {}).constructor)('source', 'quality', 'cinematicBirthClaim', 'legendaWords', 'captionSelection', 'scaledScript', 'realAudioDuration', 'isSeedanceShortClaim', 'require', js + '\nreturn source')
const G = load('@/lib/free15Gate'), D = load('@/lib/durationByEngine')
const requireLocal = name => name === '@/lib/free15CanonicalCaptions' ? C : name === '@/lib/free15Gate' ? G : assert.fail('Unexpected provider import: ' + name)
const birth = { response: { duration: 15, fal_model: 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video' } }
const script = 'Com orelhas flexíveis e reações hilárias!'
for (const [words, alignment] of [[undefined, null], [[{ word: 'evidence' }], { source: 'canonical_tts_script' }]]) {
  const result = await run(source, 'cinematic_ai', birth, words, { alignment }, script, 14.8, D.isSeedanceShortClaim, requireLocal)
  assert.deepEqual(JSON.parse(JSON.stringify(result.elements.filter(e => e.track !== 5))), source.elements.filter(e => e.track !== 5))
  const captions = result.elements.filter(e => e.track === 5)
  assert.equal(clean(captions.map(e => e.text).join(' ')), clean(script))
  assert.ok(!captions.slice(0, -1).some(e => /\be$/i.test(e.text)), 'real proportional fallback no longer ends on E')
}
for (const [quality, claim, words] of [['cinematic_ai', { response: { ...birth.response, duration: 35 } }, undefined], ['cinematic_kling', birth, undefined], ['cinematic_ai', birth, [{ word: 'intact ASR' }]]]) {
  assert.equal(await run(source, quality, claim, words, { alignment: null }, script, 14.8, D.isSeedanceShortClaim, requireLocal), source, 'outside scoped fallback: exact original source')
}
console.log('PASS: canonical EN/PT/ES, no orphan/connector, contiguous approximate timing, styles, voice/cuts immutable, compact fallback.')
