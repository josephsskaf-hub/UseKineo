// KINEO-LEGENDA-FALADA-2611 — guardião da legenda do filme FALADO (CEO 26/11, geração 0345902c): a legenda mostrava "THERE IS A BOAT / IN THE STORM / THEN WE
// GIVE / THEM LIGHT / THEY CAN" e sumia em ~9,5 s. Causa: a janela da legenda era min(masterDuration, 15), e o masterDuration é o TTS da narração que no filme
// falado NÃO toca (25 palavras ≈ 9,5 s); as palavras do Whisper do clipe que começavam depois disso saíam. Prova, executando o builder REAL (lib/compose.ts
// buildCreatomateSource) agora e ANTES (o mesmo arquivo com a janela e os pedaços de antes):
//   A. o defeito reproduzido: antes, com o TTS de 9,5 s, "see us now" e a 4ª fala ficam sem legenda; agora todas as 25 palavras ditas aparecem, até 15 s;
//      e o atraso: antes "THEM LIGHT" atravessava o corte do plano 3; agora a legenda sai 0,35 s depois da última palavra dita, antes do corte;
//   B. o resto byte a byte: o filme narrado (sem falaDoMotor, TTS curto ou longo) e o falado fora do clipe do motor saem idênticos aos de antes;
//   C. mutantes, contados só por AssertionError.
// Rodar: node scripts/test-legenda-falada-2611.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const BUILDER = 'lib/compose.ts'
const local = (f) => readFileSync(f, 'utf8').replaceAll('\r\n', '\n')
const AGORA_LINHA = '      janelaDaLegenda2611,\n', ANTES_LINHA = '      Math.min(masterDuration, totalDuration),\n'
const HOLD_AGORA = '    for (const cap of capsDaLegenda2611) {', HOLD_ANTES = '    for (const cap of directCaps) {'
const ANTES = (rel, t) => { if (rel !== BUILDER) return t; assert.equal(t.split(AGORA_LINHA).length, 2, 'a janela nova está no builder (âncora)'); assert.equal(t.split(HOLD_AGORA).length, 2, 'o corte da legenda está no builder (âncora)'); return t.replace(AGORA_LINHA, ANTES_LINHA).replace(HOLD_AGORA, HOLD_ANTES) }
const mundo = (muda = (_r, t) => t) => createOfflineLoader({ source: (rel, t) => muda(rel, t.replaceAll('\r\n', '\n')), globals: { AbortSignal } })('@/' + BUILDER)

// as 4 falas do corpo da CEO, nos 4 planos do Gemini (0-5, 5-8, 8-11, 11-15 s), como o Whisper do clipe devolveu: 25 palavras
const FALAS = [['There is a boat out there in the storm.', 0.3, 4.6], ['Then we give them light.', 5.3, 7.6], ['They can see us now.', 8.4, 10.6], ['They always do, when someone watches.', 11.3, 14.4]]
const PALAVRAS = FALAS.flatMap(([frase, ini, fim]) => {
  const ws = frase.split(/\s+/), passo = (fim - ini) / ws.length
  return ws.map((w, i) => ({ word: w, start: +(ini + i * passo).toFixed(2), end: +(ini + (i + 1) * passo - 0.05).toFixed(2), sentenceEnd: i === ws.length - 1 }))
})
assert.equal(PALAVRAS.length, 25)
const base = { clipUrls: ['https://fal.media/gemini.mp4'], voiceoverUrl: 'https://x.test/v.mp3', voiceoverScript: FALAS.map((f) => f[0]).join(' '), sceneCaptions: [''], duration: 15,
  quality: 'cinematic_ai', aspect: '9:16', kling4TrialEngine: 'kling4', realAudioDuration: 9.5, musicUrl: 'https://x.test/m.mp3', whisperWords: PALAVRAS }
const legenda = (s) => s.elements.filter((e) => typeof e.text === 'string' && e.text.trim()).map((e) => ({ t: e.text, time: Number(e.time ?? 0), fim: Number(e.time ?? 0) + Number(e.duration ?? 0) }))
const temPalavra = (caps, w) => caps.some((c) => new RegExp('(?<![\\p{L}])' + w + '(?![\\p{L}])', 'iu').test(c.t))

function prova(M, A) {
  // ── A ──
  const antes = legenda(A.buildCreatomateSource({ ...base, falaDoMotor: true }))
  assert.ok(temPalavra(antes, 'boat') && !temPalavra(antes, 'watches') && !temPalavra(antes, 'someone'), 'A o defeito reproduzido: antes a 4ª fala ficava sem legenda')
  const s = M.buildCreatomateSource({ ...base, falaDoMotor: true }), caps = legenda(s)
  for (const w of ['There', 'boat', 'storm', 'light', 'see', 'now', 'always', 'someone', 'watches']) assert.ok(temPalavra(caps, w), 'A agora a legenda leva "' + w + '"')
  assert.ok(caps.some((c) => /watches/iu.test(c.t) && c.time >= 11 && c.time < 15), 'A a última fala entra no plano 4 (11–15 s)')
  assert.equal(s.duration, 15, 'A o filme falado dura 15 s')
  // o atraso: a legenda de um plano não entra no plano seguinte (cortes em 5, 8 e 11 s)
  for (const [w, corte] of [['storm', 5], ['light', 8], ['now', 11]]) { const c = caps.filter((x) => temPalavra([x], w)); assert.ok(c.length && c.every((x) => x.fim <= corte + 0.05), `A "${w}" sai antes do corte de ${corte} s (${c.map((x) => x.fim.toFixed(2))})`) }
  { const a = legenda(A.buildCreatomateSource({ ...base, falaDoMotor: true, realAudioDuration: 15.3 })); assert.ok(a.some((x) => temPalavra([x], 'light') && x.fim > 8.05), 'A o atraso reproduzido: antes "light" atravessava o corte de 8 s') }
  // ── B ──
  for (const extra of [{}, { falaDoMotor: false }, { realAudioDuration: 15.3 }, { falaDoMotor: true, kling4TrialEngine: 'seedance15_fallback' }])
    assert.equal(JSON.stringify(M.buildCreatomateSource({ ...base, ...extra })), JSON.stringify(A.buildCreatomateSource({ ...base, ...extra })), 'B byte a byte: ' + JSON.stringify(extra))
}

prova(mundo(), mundo(ANTES))
console.log('ok  A/B no código de agora')
const MUTANTES = [
  ['    const janelaDaLegenda2611 = falaDoMotorAtiva ? totalDuration : Math.min(masterDuration, totalDuration)\n', '    const janelaDaLegenda2611 = Math.min(masterDuration, totalDuration)\n'],
  ['    const janelaDaLegenda2611 = falaDoMotorAtiva ? totalDuration : Math.min(masterDuration, totalDuration)\n', '    const janelaDaLegenda2611 = totalDuration\n'],
  ['    const janelaDaLegenda2611 = falaDoMotorAtiva ? totalDuration : Math.min(masterDuration, totalDuration)\n', '    const janelaDaLegenda2611 = falaDoMotorAtiva ? 11 : Math.min(masterDuration, totalDuration)\n'],
  ['    const capsDaLegenda2611 = falaDoMotorAtiva\n', '    const capsDaLegenda2611 = false\n'],
]
let mortos = 0
for (const [de, para] of MUTANTES) {
  assert.equal(local(BUILDER).split(de).length - 1, 1, 'mutante não aplica: ' + para.trim())
  try { prova(mundo((rel, t) => (rel === BUILDER ? t.replace(de, () => para) : t)), mundo(ANTES)); assert.fail('MUTANTE VIVO: ' + para.trim()) }
  catch (e) { if (String(e?.message).startsWith('MUTANTE VIVO')) throw e; if (e?.code !== 'ERR_ASSERTION') throw new Error('mutante sem AssertionError: ' + para.trim() + ' · ' + e?.message); mortos++ }
}
console.log(`ok  ${mortos}/${MUTANTES.length} mutantes mortos por AssertionError`)
console.log('PASS KINEO-LEGENDA-FALADA-2611')
