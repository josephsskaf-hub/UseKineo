// KINEO-SPRINT-12H-2026-07-29 — regression test for the caption chunker.
//
// ⚠️ READ THIS FIRST: unlike every other file in scripts/, this one touches
// NOTHING. No Supabase, no service role, no network, no env var. It is pure
// logic over a hardcoded fixture and is safe to run at any time:
//
//     node scripts/test-caption-chunker.mjs
//
// WHY IT EXISTS
// The homepage proof reel shipped for weeks with the caption `IT IT'S CALLED`
// burned into it. Root cause: Whisper's word-level tokens carry no punctuation,
// so buildCaptionsFromWhisperWords() sliced a fixed number of words and walked
// straight through a full stop. The fixture below is that exact sentence.
//
// It also guards the fix itself. The first version of the anti-stutter guard
// stemmed a trailing `'s`, which made `it` and `It's` compare equal and
// silently DELETED a spoken word from the caption. This test caught it before
// it reached a customer. That is the invariant that matters most here: a
// caption may be re-split any way we like, but it may never LOSE a word the
// narrator said.
//
// LEGENDAS-R1 (2026-09-14, MOTOR-AUTO-20260914) — este arquivo NÃO carrega
// mais uma cópia do algoritmo. Ele extrai de lib/compose.ts a função REAL
// `buildCaptionsFromWhisperWords` com as dependências puras dela
// (normalizeCaptionWord, round3, CAPTION_SYNC_OFFSET) e de lib/openai.ts o
// `pickHighlightWord` real (cleanWord, STOPWORDS, HIGHLIGHT_CANDIDATES),
// transpila e executa numa VM sem importar módulo nenhum — zero side effect,
// zero credencial, zero rede. Quem chama a função no produto (INSPECIONADO por
// grep, NÃO executado aqui): lib/compose.ts:2511 (clássico direto),
// :3113 (bloco Hollywood) e :3167 (fala nativa por clipe), todos com
// ctaTailSeconds=0 e maxWords=CAPTION_WORDS_PER_CHUNK.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(RAIZ, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const compose = rd('lib/compose.ts')
const openai = rd('lib/openai.ts')

// ── extração das fatias reais ───────────────────────────────────────────────
// Cada fatia vai do marcador de abertura (linha em coluna 0) até o primeiro
// fechamento em coluna 0. Se o marcador sumir, o guardião morre aqui — não
// existe fallback para cópia.
function fatia(src, abre, fecha, rotulo) {
  const ini = src.indexOf(abre)
  if (ini < 0) throw new Error(`fatia "${rotulo}": marcador de abertura não encontrado: ${abre}`)
  const fim = src.indexOf(fecha, ini)
  if (fim < 0) throw new Error(`fatia "${rotulo}": fechamento não encontrado`)
  return src.slice(ini, fim + fecha.length)
}
const F = {
  offset: (() => { const m = compose.match(/^const CAPTION_SYNC_OFFSET = [^\n]+$/m); if (!m) throw new Error('CAPTION_SYNC_OFFSET não encontrado'); return m[0] })(),
  normalize: fatia(compose, '\nfunction normalizeCaptionWord(w: string): string {', '\n}\n', 'normalizeCaptionWord'),
  round3: fatia(compose, '\nfunction round3(v: number): number {', '\n}\n', 'round3'),
  build: fatia(compose, '\nexport function buildCaptionsFromWhisperWords(', '\n}\n', 'buildCaptionsFromWhisperWords'),
  candidates: fatia(openai, '\nconst HIGHLIGHT_CANDIDATES = [', '\n]\n', 'HIGHLIGHT_CANDIDATES'),
  stopwords: fatia(openai, '\nconst STOPWORDS = new Set([', '\n])\n', 'STOPWORDS'),
  cleanWord: fatia(openai, '\nfunction cleanWord(w: string): string {', '\n}\n', 'cleanWord'),
  pick: fatia(openai, '\nexport function pickHighlightWord(caption: string): string | null {', '\n}\n', 'pickHighlightWord'),
}
const FONTE = [F.candidates, F.stopwords, F.cleanWord, F.pick, F.offset, F.normalize, F.round3, F.build].join('\n')

function carrega(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, require: () => { throw new Error('require proibido na fatia') } })
  if (typeof exp.buildCaptionsFromWhisperWords !== 'function') throw new Error('fatia não exportou buildCaptionsFromWhisperWords')
  return exp
}
const real = carrega(FONTE)
const build = real.buildCaptionsFromWhisperWords

const W = (word, start, end, sentenceEnd) => ({ word, start, end, ...(sentenceEnd ? { sentenceEnd: true } : {}) })

let failures = 0
let total = 0
function check(label, ok, detail) {
  total++
  console.log(`  ${ok ? '✅' : '❌'} ${label}${ok ? '' : ` — ${detail}`}`)
  if (!ok) failures++
}
const textos = (caps) => caps.map((c) => c.text)
const emitidas = (caps) => textos(caps).join(' ').split(/\s+/).filter(Boolean)

// ── 0. a prova de que é o código real que roda ──────────────────────────────
console.log('0. fatia real de lib/compose.ts + lib/openai.ts\n')
check('a fatia contém a assinatura real (words, totalAudioDuration, ctaTailSeconds, maxWords = 7)', /buildCaptionsFromWhisperWords\(\n\s+words: WhisperWord\[\],\n\s+totalAudioDuration: number,\n\s+ctaTailSeconds: number,\n\s+maxWords = 7,/.test(F.build), F.build.slice(0, 200))
check('a fatia usa normalizeCaptionWord, round3, CAPTION_SYNC_OFFSET e pickHighlightWord (nada injetado)', ['normalizeCaptionWord(', 'round3(', 'CAPTION_SYNC_OFFSET', 'pickHighlightWord('].every((s) => F.build.includes(s)), 'dependência ausente')
check('a fatia inteira não tem import nem require', !/^\s*import |require\(/m.test(FONTE), 'import/require na fatia')
{
  // mutante: se a fatia de verdade decide o resultado, trocar o limiar de pausa
  // muda a segmentação — prova que não há cópia escondida sendo executada.
  const mut = carrega(FONTE.replace('const SENTENCE_GAP_SECONDS = 0.28', 'const SENTENCE_GAP_SECONDS = 99'))
  const fx = [W('a', 0, 0.1), W('b', 0.6, 0.7)]
  check('mutante (pausa 0,28→99) muda o resultado → o código executado é o extraído', textos(build(fx, 2, 0, 7)).length === 2 && textos(mut.buildCaptionsFromWhisperWords(fx, 2, 0, 7)).length === 1, `real=${JSON.stringify(textos(build(fx, 2, 0, 7)))} mut=${JSON.stringify(textos(mut.buildCaptionsFromWhisperWords(fx, 2, 0, 7)))}`)
}
{
  // chamadores: declarados por grep, NÃO executados.
  const linhas = compose.split('\n')
  const calls = linhas.map((l, i) => (l.includes('buildCaptionsFromWhisperWords(') && !l.includes('export function') && !l.trim().startsWith('//') ? i + 1 : 0)).filter(Boolean)
  check('3 chamadores em lib/compose.ts (clássico direto, bloco Hollywood, fala por clipe) — inspecionados por grep', calls.length === 3, `linhas ${JSON.stringify(calls)}`)
  const wpc = compose.match(/^const CAPTION_WORDS_PER_CHUNK = (\d+)$/m)
  check('todos os chamadores passam ctaTailSeconds=0 e maxWords=CAPTION_WORDS_PER_CHUNK', calls.every((n) => { const bloco = linhas.slice(n - 1, n + 8).join('\n'); return /CAPTION_WORDS_PER_CHUNK/.test(bloco) && /,\s*0,/.test(bloco.replace(/\/\*[\s\S]*?\*\//g, '')) }) && !!wpc, `CAPTION_WORDS_PER_CHUNK=${wpc?.[1]}`)
  console.log(`  ℹ chamadores: ${calls.map((n) => `compose.ts:${n}`).join(', ')} · CAPTION_WORDS_PER_CHUNK=${wpc?.[1]} · maxWords padrão da função = 7`)
}
console.log('')

// ── 1. o fixture original ("…think for it. It's called Fugu") ───────────────
// Note the 0.42s silence after "it" — that gap is the audible full stop, and
// the sentenceEnd flag is what markSentenceEnds() recovers from the Whisper
// SEGMENT stream. Either signal alone is enough to split correctly.
const FIXTURE = [
  W('An', 0.0, 0.14),
  W('AI', 0.14, 0.4),
  W('that', 0.4, 0.6),
  W('hires', 0.6, 0.92),
  W('other', 0.92, 1.18),
  W('AIs', 1.18, 1.52),
  W('to', 1.52, 1.66),
  W('think', 1.66, 1.96),
  W('for', 1.96, 2.12),
  W('it', 2.12, 2.3, true),
  W("It's", 2.72, 2.98),
  W('called', 2.98, 3.3),
  W('Fugu', 3.3, 3.8, true),
]

console.log('1. caption chunker — "…think for it. It\'s called Fugu" (função real)\n')
for (const maxWords of [1, 3, 7]) {
  const caps = build(FIXTURE, 4.0, 0, maxWords)
  const captions = textos(caps)
  console.log(`maxWords=${maxWords}: ${JSON.stringify(captions)}`)
  check('no chunk straddles the full stop', !captions.some((c) => /\bit\s+it'?s?\b/i.test(c)), 'a caption contains "it It\'s"')
  const emitted = emitidas(caps)
  const spoken = FIXTURE.map((w) => w.word)
  const missing = spoken.filter((w) => !emitted.includes(w))
  check('every spoken word survives', missing.length === 0, `dropped ${JSON.stringify(missing)}`)
  check('order preserved', emitted.join(' ') === spoken.join(' '), `got "${emitted.join(' ')}"`)
  check(`nenhum chunk passa de maxWords=${maxWords}`, caps.every((c) => c.text.split(/\s+/).length <= maxWords), JSON.stringify(captions))
  check('karaoke: words[] na mesma ordem e com o mesmo texto do chunk', caps.every((c) => c.words.map((w) => w.word).join(' ') === c.text), JSON.stringify(caps.map((c) => c.words.map((w) => w.word))))
  check('karaoke: start monotônico dentro do chunk e ≥ time do chunk (1º chunk sem offset)', caps.every((c, i) => c.words.every((w, j) => (j === 0 || w.start >= c.words[j - 1].start) && (i === 0 ? w.start >= c.time : true))), JSON.stringify(caps.map((c) => [c.time, c.words.map((w) => w.start)])))
  console.log('')
}

// ── 2. fronteiras: sentenceEnd × pausa × teto ──────────────────────────────
console.log('2. fronteiras\n')
{
  const semFlag = [W('one', 0, 0.2), W('two', 0.2, 0.4), W('three', 0.8, 1.0), W('four', 1.0, 1.2)] // pausa 0,4 s, sem sentenceEnd
  check('pausa ≥ 0,28 s fecha o grupo sem sentenceEnd', JSON.stringify(textos(build(semFlag, 2, 0, 7))) === '["one two","three four"]', JSON.stringify(textos(build(semFlag, 2, 0, 7))))
  const soFlag = [W('one', 0, 0.2), W('two', 0.2, 0.4, true), W('three', 0.42, 0.6), W('four', 0.6, 0.8)] // gap 0,02 s
  check('sentenceEnd fecha o grupo sem pausa audível', JSON.stringify(textos(build(soFlag, 2, 0, 7))) === '["one two","three four"]', JSON.stringify(textos(build(soFlag, 2, 0, 7))))
  const nada = Array.from({ length: 9 }, (_, i) => W(`w${i}`, i * 0.2, i * 0.2 + 0.2))
  check('sem sinal nenhum, só o teto maxWords=4 fecha (9 palavras → 4+4+1)', JSON.stringify(textos(build(nada, 2, 0, 4)).map((t) => t.split(' ').length)) === '[4,4,1]', JSON.stringify(textos(build(nada, 2, 0, 4))))
  const primeiro = build(nada, 2, 0, 4)
  check('1º chunk sem CAPTION_SYNC_OFFSET; os seguintes com +0,15', primeiro[0].time === 0 && primeiro[1].time === 0.95 && primeiro[2].time === 1.75, JSON.stringify(primeiro.map((c) => c.time)))
  check('duração do chunk termina onde o próximo começa (raw), arredondada a 3 casas', primeiro[0].duration === 0.8 && primeiro[1].duration === 0.8, JSON.stringify(primeiro.map((c) => c.duration)))
}
console.log('')

// ── 3. janela CTA e entradas vazias ─────────────────────────────────────────
console.log('3. janela CTA e vazios\n')
{
  check('entrada vazia → []', JSON.stringify(build([], 10, 0, 4)) === '[]', JSON.stringify(build([], 10, 0, 4)))
  const tarde = [W('late', 5, 5.3), W('later', 5.3, 5.6)]
  check('todas as palavras a partir do fim da janela (audio 6 s, CTA 1 s) → []', JSON.stringify(build(tarde, 6, 1, 4)) === '[]', JSON.stringify(build(tarde, 6, 1, 4)))
  const misto = [W('in', 0, 0.3), W('window', 0.3, 0.6, true), W('cta', 5, 5.3), W('tail', 5.3, 5.6)]
  const caps = build(misto, 6, 1, 4)
  check('palavra com start ≥ fim da janela é excluída; as anteriores ficam', JSON.stringify(textos(caps)) === '["in window"]', JSON.stringify(textos(caps)))
  check('último chunk é clampado ao fim da janela (time+duration ≤ 5)', caps.every((c) => c.time + c.duration <= 5 + 1e-9), JSON.stringify(caps.map((c) => [c.time, c.duration])))
  check('CTA maior que o áudio → janela 0 → []', JSON.stringify(build(misto, 0.5, 2, 4)) === '[]', JSON.stringify(build(misto, 0.5, 2, 4)))
}
console.log('')

// ── 4. acentos EN/PT/ES verbatim + normalizador ─────────────────────────────
console.log('4. acentos EN/PT/ES\n')
{
  const pt = [W('A', 0, 0.1), W('avalanche', 0.1, 0.6), W('é', 0.6, 0.7), W('rápida.', 0.7, 1.2, true), W('Então', 1.5, 1.8), W('João', 1.8, 2.1), W('correu', 2.1, 2.5, true)]
  const es = [W('¿Qué', 0, 0.2), W('pasó', 0.2, 0.5), W('mañana?', 0.5, 0.9, true), W('Él', 1.2, 1.4), W('corrió', 1.4, 1.8, true)]
  const en = [W('The', 0, 0.1), W('café', 0.1, 0.4), W('naïve', 0.4, 0.8), W('résumé', 0.8, 1.2, true)]
  for (const [nome, fx] of [['PT', pt], ['ES', es], ['EN', en]]) {
    const caps = build(fx, 3, 0, 4)
    const em = emitidas(caps)
    const sp = fx.map((w) => w.word)
    check(`${nome}: cada palavra acentuada sai verbatim (sem perder nem transliterar)`, em.join(' ') === sp.join(' '), `got "${em.join(' ')}"`)
  }
  const n = (w) => { const exp = {}; vm.runInNewContext(ts.transpileModule(F.normalize + '\nexports.n = normalizeCaptionWord', { compilerOptions: { module: 1, target: 9 } }).outputText, { exports: exp }); return exp.n(w) }
  console.log(`  ℹ normalizeCaptionWord: "é"→"${n('é')}" · "à"→"${n('à')}" · "óleo"→"${n('óleo')}" · "Leo"→"${n('Leo')}" · "às"→"${n('às')}" · "és"→"${n('és')}" · "It's"→"${n("It's")}" · "it."→"${n('it.')}"`)
  check('normalizador não reduz duas palavras DIFERENTES ao mesmo valor: "é"≠"à", "óleo"≠"Leo", "às"≠"és"', n('é') !== n('à') && n('óleo') !== n('Leo') && n('às') !== n('és'), `é=${JSON.stringify(n('é'))} à=${JSON.stringify(n('à'))} óleo=${JSON.stringify(n('óleo'))} Leo=${JSON.stringify(n('Leo'))} às=${JSON.stringify(n('às'))} és=${JSON.stringify(n('és'))}`)
  check('normalizador continua igualando o stutter real "it." ≡ "It" e "it" ≢ "It\'s"', n('it.') === n('It') && n('it') !== n("It's"), `${n('it.')} / ${n('It')} / ${n("It's")}`)
}
console.log('')

// ── 5. controle (a) do Board: "é" no fim de um grupo, "à" no início do outro ─
console.log('5. controle (a) — grupo termina em "é", o seguinte começa em "à" + outra palavra\n')
{
  // maxWords=2 fecha o 1º grupo em "é"; o 2º grupo é ["à", "praia"].
  const fx = [W('Ela', 0, 0.2), W('é', 0.2, 0.4), W('à', 0.45, 0.55), W('praia', 0.55, 0.9)]
  const caps = build(fx, 1.5, 0, 2)
  const em = emitidas(caps)
  console.log(`  esperado: ["Ela é","à praia"] · real: ${JSON.stringify(textos(caps))}`)
  check('controle (a): "à" NÃO é apagada por normalização vazia ("é"→"" ≡ "à"→"")', em.join(' ') === 'Ela é à praia', `real "${em.join(' ')}"`)
  check('controle (a): karaoke words[] do 2º chunk também preserva "à"', caps[1] && caps[1].words[0]?.word === 'à', JSON.stringify(caps[1]?.words))
  // irmão: "óleo" fecha um grupo e "Leo" abre o seguinte — palavras diferentes.
  const fx2 = [W('o', 0, 0.1), W('óleo', 0.1, 0.4), W('Leo', 0.45, 0.6), W('viu', 0.6, 0.8)]
  const caps2 = build(fx2, 1.5, 0, 2)
  check('irmão: "óleo" | "Leo viu" — "Leo" (nome) não é apagado como stutter de "óleo"', emitidas(caps2).join(' ') === 'o óleo Leo viu', `real "${emitidas(caps2).join(' ')}"`)
  // o stutter REAL continua sendo removido (o motivo do guard existir).
  const fx3 = [W('think', 0, 0.2), W('it', 0.2, 0.3, true), W('it', 0.31, 0.4), W('works', 0.4, 0.7)]
  check('stutter real "it | it works" continua removido (guard preservado)', JSON.stringify(textos(build(fx3, 1, 0, 4))) === '["think it","works"]', JSON.stringify(textos(build(fx3, 1, 0, 4))))
}
console.log('')

// ── 6. controle (b) do Board: último token em 0,95 s numa janela de 1 s ─────
console.log('6. controle (b) — dois grupos, último token começa em 0,95 s, janela 1,0 s, offset +0,15\n')
{
  const fx = [W('first', 0, 0.3, true), W('last', 0.95, 1.0)]
  const caps = build(fx, 1.0, 0, 4)
  console.log(`  esperado: nenhum elemento com time ≥ 1,0 · real: ${JSON.stringify(caps.map((c) => ({ text: c.text, time: c.time, duration: c.duration })))}`)
  check('controle (b): nenhum elemento começa depois da janela (time < 1,0)', caps.every((c) => c.time < 1.0), JSON.stringify(caps.map((c) => c.time)))
  check('controle (b): a palavra "last" não some do caption', emitidas(caps).includes('last'), JSON.stringify(textos(caps)))
  check('controle (b): a palavra que começa dentro da janela começa NO instante falado (0,95) quando o offset a empurraria para fora', caps[1]?.time === 0.95, `time=${caps[1]?.time}`)
  // e quando o offset cabe, ele continua sendo aplicado (o clamp não mata o offset).
  const folga = [W('first', 0, 0.3, true), W('last', 0.5, 0.8)]
  check('offset +0,15 continua aplicado quando cabe na janela (0,5 → 0,65)', build(folga, 1.0, 0, 4)[1]?.time === 0.65, `time=${build(folga, 1.0, 0, 4)[1]?.time}`)
}
console.log('')

console.log(failures === 0 ? `PASS — ${total}/${total} verificações` : `FAIL — ${failures} de ${total} verificações`)
process.exit(failures === 0 ? 0 : 1)
