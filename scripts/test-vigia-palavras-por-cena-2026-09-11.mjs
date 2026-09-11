// KINEO-VIGIA-PALAVRAS-POR-CENA-2026-09-11 — guardião: o escritor de cenas do
// Kineo 1 recebe a duração em palavras, e o texto do prompt sem opção fica
// byte-idêntico ao de antes.
//
// O que ele protege (medido em 14 dias de Kineo 1 de conta externa):
//   60 s → 56 filmes / 41 pessoas, ~85-120 palavras (6 cenas × ~14);
//   90 s →  9 filmes /  9 pessoas, ~100 palavras (9 × ~13) — 37 s de fala.
// O compose então reescrevia o CORPO da narração com gpt-4o-mini para 3,1
// pal/s × duração (scaleVoiceoverScript), depois de o footage ter sido
// escolhido para as frases originais: render 59e1c0ce (11/09 21:44 UTC) tem
// 17 clipes escolhidos para 114 palavras tocando sob ~279 palavras que
// ninguém planejou. A régua da casa (CLAUDE.md, clássico 3,1 pal/s: 35 s =
// 100-115 · 60 s = 175-195 · 90 s = 265-290) passa a valer NA ORIGEM.
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
const roda = (src, extra = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, require: () => ({}), ...extra })
  return exp
}

const runway = rd('lib/runway.ts')
const fast = rd('app/api/generate-video-fast/route.ts')
const compose = rd('lib/compose.ts')

console.log('== 1. lib/runway.ts — generateScenes executada: a regra segue a faixa, e sem faixa é o texto antigo ==')
checa('generateScenes aceita o 4º parâmetro writerOptions',
  /export async function generateScenes\(prompt: string, count = 4, visualPolicy\?: VisualPromptPolicy, writerOptions\?: SceneWriterOptions\)/.test(runway))
checa('o campo 8 do schema usa ${voiceoverRule}, não um literal',
  runway.includes('8. "voiceover" — one narration line (${voiceoverRule}). MUST include') &&
  !runway.includes('one narration line (10-22 words). MUST include'))
// Executa a função de verdade (mesma técnica do test-visual-contract do Codex):
// fatia generateScenes + shortCaptionFromVoiceover, openai falso que captura o
// system prompt, e lê a linha do campo 8 que o modelo receberia.
const fatia = (nome) => {
  const i = runway.indexOf(`export async function ${nome}(`) >= 0 ? runway.indexOf(`export async function ${nome}(`) : runway.indexOf(`export function ${nome}(`)
  let depth = 0, j = runway.indexOf('{', i)
  for (; j < runway.length; j++) { if (runway[j] === '{') depth++; else if (runway[j] === '}') { depth--; if (depth === 0) break } }
  return runway.slice(i, j + 1)
}
async function pedeAoEscritor(opts) {
  let request = null
  const api = roda(fatia('shortCaptionFromVoiceover') + '\n' + fatia('generateScenes'), {
    detectVisualCategory: () => undefined,
    openai: { chat: { completions: { create: async (input) => { request = input; return { choices: [{ message: { content: '[]' } }] } } } } },
  })
  try { await api.generateScenes('Why the ocean glows at night', 9, undefined, opts) } catch { /* "no scenes" é esperado */ }
  const sys = request?.messages?.find((m) => m.role === 'system')?.content ?? ''
  return sys.split('\n').find((l) => l.startsWith('8. "voiceover"')) ?? ''
}
const semFaixa = await pedeAoEscritor(undefined)
const comFaixa = await pedeAoEscritor({ wordsPerScene: [27, 35] })
const piso = await pedeAoEscritor({ wordsPerScene: [2, 3] })
checa('sem faixa → "one narration line (10-22 words)" (byte-idêntico ao prompt antigo)', semFaixa.includes('one narration line (10-22 words). MUST include'))
checa('com faixa → "27-35 words — this line alone must fill its ~10-second scene"', comFaixa.includes('one narration line (27-35 words — this line alone must fill its ~10-second scene when spoken; two sentences are fine). MUST include'))
checa('piso 6 e teto ≥ piso', piso.includes('one narration line (6-6 words'))
checa('as três chamadas chegaram ao modelo com a linha do campo 8', semFaixa && comFaixa && piso)

console.log('== 2. o chamador do Kineo 1 passa a faixa da duração ==')
const chamada = fast.indexOf('scenes = await generateScenes(prompt.slice(0, 1200), clipCount, undefined, {')
checa('generateScenes do caminho GPT recebe wordsPerScene', chamada > 0 &&
  fast.slice(chamada, chamada + 200).includes('wordsPerScene: wordsPerSceneFor(duration, clipCount)'))
checa('a chamada fica no ramo NÃO-verbatim (else do `if (verbatim)`)',
  fast.lastIndexOf('if (verbatim) {', chamada) > 0 &&
  fast.lastIndexOf('} else {', chamada) > fast.lastIndexOf('if (verbatim) {', chamada))
checa('targetWordCount importado de @/lib/compose (fonte única com o escalador)',
  fast.includes("import { targetWordCount } from '@/lib/compose'"))
checa('wordsPerSceneFor NÃO é exportado (arquivo de rota do Next só exporta handlers)',
  /\nfunction wordsPerSceneFor\(/.test(fast) && !/export function wordsPerSceneFor/.test(fast))

console.log('== 3. a aritmética casa com a régua da casa e com a tolerância do escalador ==')
const tIni = compose.indexOf('const TTS_WORDS_PER_SECOND')
const tFim = compose.indexOf('export async function scaleVoiceoverScript')
checa('targetWordCount e TTS_WORDS_PER_SECOND localizados em lib/compose.ts', tIni > 0 && tFim > tIni)
const { targetWordCount } = roda(compose.slice(tIni, tFim))
const fIni = fast.indexOf('function wordsPerSceneFor(')
const fFim = fast.indexOf('\n}\n', fIni) + 3
const { wordsPerSceneFor } = roda('export ' + fast.slice(fIni, fFim), { targetWordCount })
const casos = [
  [90, 9, [27, 35], [265, 290]],
  [60, 6, [27, 35], [175, 195]],
  [35, 4, [24, 30], [100, 115]],
  [45, 5, [25, 31], [130, 155]],
]
for (const [s, n, esperado, regua] of casos) {
  const r = wordsPerSceneFor(s, n)
  checa(`${s} s / ${n} cenas → ${esperado.join('-')} por cena (saiu ${r.join('-')})`, r[0] === esperado[0] && r[1] === esperado[1])
  const total = [r[0] * n, r[1] * n]
  checa(`${s} s: total ${total[0]}-${total[1]} cobre a régua ${regua.join('-')}`, total[0] <= regua[1] && total[1] >= regua[0])
  const alvo = targetWordCount(s)
  checa(`${s} s: qualquer resposta na faixa fica dentro dos ±15% do escalador (alvo ${alvo})`,
    total[0] >= Math.floor(alvo * 0.85) && total[1] <= Math.ceil(alvo * 1.15))
}
checa('piso 6 palavras por cena mesmo com duração absurda', wordsPerSceneFor(5, 9)[0] === 6)

console.log('== 4. o defeito medido: 114 palavras para 90 s ficavam FORA da tolerância → reescrita ==')
checa('114 palavras < 85% de 279 (o escalador reescrevia)', 114 < Math.floor(targetWordCount(90) * 0.85))
checa('9 cenas × 27-35 = 243-315 ≥ 85% de 279 (o escalador não reescreve mais)', 9 * 27 >= Math.floor(targetWordCount(90) * 0.85))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
