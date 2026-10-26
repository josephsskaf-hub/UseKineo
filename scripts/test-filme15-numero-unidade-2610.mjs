// KINEO-FILME15-PERFEITO-2610 — measured number/unit split; offline, no providers.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))
const FILE = 'lib/filmes/faceless15.ts'
const source = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
const load = transform => createOfflineLoader({ source: (p, text) => p === FILE && transform ? transform(text) : text })
const F = load()('@/lib/filmes/faceless15')
const W = (text, { pause = 0, punctuated = true } = {}) => {
  let time = 0
  return text.split(/\s+/).map((word, i, words) => {
    const item = { word, start: Math.round(time * 1000) / 1000, end: Math.round((time + 0.3) * 1000) / 1000,
      ...(punctuated ? { sentenceEnd: i === words.length - 1 || /[.!?]$/.test(word) } : {}) }
    time += 0.3 + (/^\d/.test(word) ? pause : 0)
    return item
  })
}
const assertPairs = (module, text, options) => {
  const words = W(text, options), before = JSON.stringify(words)
  const blocks = module.agruparLegendaFaceless15(words, 99)
  assert.equal(blocks.flatMap(b => b.words).map(w => w.word).join(' '), text, 'all original tokens preserved')
  assert.equal(JSON.stringify(words), before, 'input timestamps/text untouched')
  assert.ok(blocks.every(b => b.words.length >= 2 && b.words.length <= 5), '2..5 words; no new orphan')
  for (let i = 0; i < words.length - 1; i++) if (/^\d/.test(words[i].word)) {
    assert.ok(blocks.some(b => b.words.some((w, j) => w.word === words[i].word && b.words[j + 1]?.word === words[i + 1].word)), 'numeric unit stays in same block')
  }
  return blocks
}
// Two short adjacent captions from production case 8da074c197bc, already in the
// anonymized visual audit: "CRIE UM VÍDEO DE 50" / "SEGUNDOS SOBRE 3 CIDADES ANTIGAS".
// Only the measured 50/segundos boundary is reproduced; no whole customer script.
const REAL_EXCERPT = 'Crie um vídeo de 50 segundos sobre cidades antigas'
assertPairs(F, REAL_EXCERPT)
for (const text of [
  'We waited for exactly 50 seconds before the alarm',
  'Esperamos durante exatamente 50 segundos antes do alarme',
  'Esperamos durante exactamente 50 segundos antes de salir',
  'We waited for exactly 1.5 minutes before the alarm',
  'Esperamos durante exatamente 1,5 minutos antes do alarme',
  'O trem percorreu exatamente 50 quilômetros durante a noite',
]) assertPairs(F, text)
// A long ASR pause with no punctuation is not a real full stop between a value/unit.
assertPairs(F, REAL_EXCERPT, { punctuated: false, pause: 0.4 })
// An explicit sentence boundary remains authoritative (do not invent a merged phrase).
const separate = F.agruparLegendaFaceless15(W('The answer was 50. Seconds later they left.'), 99)
assert.ok(!separate.some(b => b.text.includes('50. Seconds')))
// An incompatible custom maximum preserves the existing hard size/anti-orphan
// partition. Default 5 always has room for an explicit two-token value/unit.
assert.equal(F.partirFraseFaceless15(4, [false, false, false, false], [0, 0, 0, 0], 3, [false, true, false]).join(','), '2,2')
// Without a recognized unit, the rule must be a no-op against the pre-fix module.
const helperAnchor = '  !!left && !!right && !fechaFrase(left) && /^\\d+(?:[.,]\\d+)*$/.test(normPalavra(left.word)) && UNIDADES_FACELESS15.has(normPalavra(right.word))'
assert.equal(source.split(helperAnchor).length - 1, 1, 'mutant applies exactly once')
const base = load(s => s.replace(helperAnchor, '  false'))('@/lib/filmes/faceless15')
for (const text of ['The old town was quiet before the storm arrived', 'Some quiet towns simply vanished overnight', 'We counted exactly 50 people before the show began']) {
  assert.equal(JSON.stringify(F.agruparLegendaFaceless15(W(text), 99)), JSON.stringify(base.agruparLegendaFaceless15(W(text), 99)))
}
assert.throws(() => assertPairs(base, REAL_EXCERPT), /numeric unit stays in same block/, 'applied mutant restores measured defect')
assert.throws(() => assertPairs(base, REAL_EXCERPT, { punctuated: false, pause: 0.4 }), /numeric unit stays in same block/, 'applied mutant restores pause split')
// The canonical repair calls the same grouping path and inherits the fix.
const C = load()('@/lib/free15CanonicalCaptions')
const captions = C.buildFree15CanonicalCaptions({ script: REAL_EXCERPT, audioSeconds: 15, source: { elements: [] } })
assert.ok(captions.some(e => /50 SEGUNDOS/.test(e.text)))
assert.equal(captions.map(e => e.text).join(' '), REAL_EXCERPT.toUpperCase())
console.log('PASS: real 50/segundos split, EN/PT/ES measures, decimal, pause, explicit sentence, token/size preservation, canonical repair, applied red mutant.')
