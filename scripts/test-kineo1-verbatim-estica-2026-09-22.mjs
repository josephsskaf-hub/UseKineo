// KINEO1-VERBATIM-ESTICA-2026-09-22 — guardião: "Use my script as is" vale para prosa no Kineo 1 e o roteiro manda na
// duração (fundador 22/09: "Estica então"). Caso Emily: 215 palavras, script_mode 'verbatim', prosa sem [Pexels:] →
// caía no modo IA e era reescrita.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src) => { const exports = {}; vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText, { exports, require: () => ({}), console, Math, Number, Set, Map, Array, JSON, Object, RegExp, String }); return exports }

const EMILY = `If you wake up at exactly 3:00 AM and hear someone knocking at your bedroom door, whatever you do… don’t open it.

A college student named Emily thought this was just another stupid internet rule.

Until one night, she woke up at exactly 3:00 AM.

Three slow knocks came from her bedroom door.

Then she heard her mother whisper from the hallway, “Emily… open the door.”

There was only one problem.

Her mother had died three years earlier.

Emily froze and stayed completely silent.

The knocking stopped.

Then her phone lit up with a notification from her security camera.

“Person detected inside bedroom.”

Her hands started shaking.

Because the bedroom door was still locked…

and whatever had been knocking was never outside.

The next morning, Emily disappeared.

The only thing police found was her phone.

The final security recording was timestamped 3:01 AM.

And in the video, something was standing behind her bed.

So if you wake up tonight at exactly 3:00 AM…

whatever you hear, don’t look behind you.`
const palavras = (s) => s.replace(/\s+/g, ' ').trim().split(' ')

console.log('== (1) a prosa vira blocos SEM tocar numa palavra ==')
const B = roda(rd('lib/proseBlocks.ts'))
const blocos = B.splitProseIntoBlocks(EMILY, 6)
checa('6 blocos para 6 cenas', blocos.length === 6)
checa('junção dos blocos = as palavras exatas da Emily (nada reescrito, nada perdido, mesma ordem)', palavras(blocos.join(' ')).join(' ') === palavras(EMILY).join(' '))
checa('nenhum bloco vazio e o 1º começa no gancho, o último termina em "behind you."', blocos.every((b) => b.trim().length > 0) && blocos[0].startsWith('If you wake up at exactly 3:00 AM') && blocos[5].endsWith('don’t look behind you.'))
const tamanhos = blocos.map((b) => palavras(b).length)
checa('blocos de tamanho parecido (nenhum com menos de 15 % do total)', Math.min(...tamanhos) >= palavras(EMILY).length * 0.08 && Math.max(...tamanhos) <= palavras(EMILY).length * 0.4)
checa('com mais cenas que frases, uma frase por bloco; texto vazio → []', B.splitProseIntoBlocks('One. Two. Three.', 9).length === 3 && B.splitProseIntoBlocks('', 4).length === 0)
checa('busca de reserva pega o conteúdo, pula o nome próprio do meio da frase', B.fallbackStockQuery('Three slow knocks came from her bedroom door.') === 'three slow knocks bedroom' && !/emily/.test(B.fallbackStockQuery('A college student named Emily thought this was just another stupid internet rule.')))

console.log('== (2) o roteiro manda na duração — para cima, até 90 s ==')
const D = roda(rd('lib/durationFollowsScript.ts'))
const cabe = (speech) => [35, 45, 60, 90].filter((d) => speech / d >= 0.95).sort((a, b) => b - a)[0] ?? null
checa('Emily: 215 palavras a 2,81 pal/s = 76 s, seletor 60 → fica em 60 (a fala enche 60; o compose estica o filme até o texto acabar)', D.decideDurationFollowsScriptUp({ ownScript: true, requestedSeconds: 60, speechSeconds: 76.5, largestFitting: cabe(76.5) }) === null)
const sobe = D.decideDurationFollowsScriptUp({ ownScript: true, requestedSeconds: 35, speechSeconds: 76.5, largestFitting: cabe(76.5) })
checa('seletor 35 com 76 s de fala → sobe para 60', sobe?.kind === 'up' && sobe.from === 35 && sobe.to === 60 && sobe.speechSeconds === 77)
checa('95 s de fala no seletor 60 → sobe para 90', D.decideDurationFollowsScriptUp({ ownScript: true, requestedSeconds: 60, speechSeconds: 95, largestFitting: cabe(95) })?.to === 90)
const longo = D.decideDurationFollowsScriptUp({ ownScript: true, requestedSeconds: 60, speechSeconds: 110, largestFitting: cabe(110) })
checa('110 s de fala → recusa honesta (teto 90 × 1,15 = 103,5)', longo?.kind === 'too_long' && longo.maxSeconds === 90)
checa('roteiro da IA (não próprio) nunca sobe nem recusa', D.decideDurationFollowsScriptUp({ ownScript: false, requestedSeconds: 35, speechSeconds: 95, largestFitting: 90 }) === null)
checa('a descida de 19/09 continua intacta (Axel: 34 s no seletor 60 → 35)', D.decideDurationFollowsScript({ fitOk: false, ownScript: true, requestedSeconds: 60, speechSeconds: 34, largestFitting: 35, floorSeconds: 35 })?.to === 35)

console.log('== (3) a rota do Kineo 1 liga a peça ==')
const ft = rd('app/api/generate-video-fast/route.ts')
checa('body aceita script_mode; ownScript = marcadores OU script_mode verbatim; prosaVerbatim = próprio sem marcadores', ft.includes('script_mode?: string') && ft.includes("const ownScript = verbatim || body.script_mode === 'verbatim'") && ft.includes('const prosaVerbatim = ownScript && !verbatim'))
checa('a fala própria vem dos segmentos (marcadores) ou da narração inteira (prosa)', ft.includes("const falaPropria = verbatim ? parsedScript.segments.map((seg) => seg.voiceover ?? '').join(' ') : (parsedScript.narration && parsedScript.narration.trim().length > 0 ? parsedScript.narration : prompt)"))
checa('duração sobe ANTES das cenas (clipCount recalculado) e o teto recusa com script_too_long_for_engine sem gasto', ft.indexOf('decideDurationFollowsScriptUp({ ownScript') < ft.indexOf('// Step 1 — Build scenes.') && ft.includes('clipCount = clipCountForDuration(duration)\n') && ft.includes("reason: 'script_too_long_for_engine', speech_seconds: sobe.speechSeconds, max_seconds: sobe.maxSeconds, retryable: false, charged: false") && ft.includes('let clipCount = clipCountForDuration(duration)'))
checa('prosa própria vira cenas por bloco (voiceover = bloco, sem escritor de IA)', /\} else if \(prosaVerbatim\) \{[\s\S]{0,600}const blocos = splitProseIntoBlocks\(falaPropria, clipCount\)[\s\S]{0,900}voiceover: bloco,/.test(ft))
checa('o portão da fala e o voiceover do compose usam ownScript/falaPropria; o payload viaja como verbatim com speed', ft.includes('if (ownScript) { // KINEO1-VERBATIM-ESTICA') && ft.includes('const falaDoAutor = falaPropria') && ft.includes('ownScript ? falaPropria : sceneJoinedVoiceover') && ft.includes('verbatim: ownScript,') && ft.includes('speed: ownScript ? (parsedScript.speed ?? 1) : parsedScript.speed'))
checa('o alinhamento do plano de B-roll continua ligado para a prosa própria (só marcadores o dispensam)', ft.includes('if (!verbatim && brollSceneMap.size > 0) {'))
checa('evento duration_followed_script com direction up e prose', ft.includes("metadata: { engine: 'fast', direction: 'up', from: sobe.from, to: sobe.to, speech: sobe.speechSeconds, prose: prosaVerbatim"))

console.log('== mutantes ==')
{
  const src = rd('lib/durationFollowsScript.ts')
  const mut = src.replace('if (speech > ceiling * DURATION_FOLLOWS_SCRIPT_CEILING_TOLERANCE) {', 'if (false) {')
  checa('mutante (sem teto) aplicou e é pego: 110 s viraria "up 90"', mut !== src && roda(mut).decideDurationFollowsScriptUp({ ownScript: true, requestedSeconds: 60, speechSeconds: 110, largestFitting: 90 })?.kind === 'up')
}
{
  const src = rd('lib/proseBlocks.ts')
  const mut = src.replace("if (atual.length > 0) blocks.push(atual.join(' '))", '')
  const b = roda(mut).splitProseIntoBlocks(EMILY, 6)
  checa('mutante (perde o último bloco) é pego: palavras somem', mut !== src && palavras(b.join(' ')).length < palavras(EMILY).length)
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
