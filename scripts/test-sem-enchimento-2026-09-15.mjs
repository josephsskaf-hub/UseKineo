// KINEO-SEM-ENCHIMENTO-2026-09-15 — ensaios de $0 de 15/09 no caminho clássico (Seedance 1.5
// faroleiro, Kling 2.5 trem, modo ideia, 60 s): o modelo devolveu 6 cenas para 7 e a 7ª saiu
// como "Here is something most people do not know about <PEDIDO INTEIRO>" (206 palavras,
// 317 no total contra 186 esperadas): o compose reescreveria a narração e repetiria cena. O
// hollywood filtra o FILLER_LINE_RE; o clássico não. Este guardião executa a generateScenes
// REAL (lib/runway.ts, OpenAI mockado, mesma técnica do test-visual-contract) e prova:
//   (a) na origin/main a 7ª cena é o enchimento com o pedido inteiro (reprodução);
//   (b) no candidato a cena que falta nasce de uma DIVISÃO da cena mais longa em fronteira de
//       frase: mesmas palavras, mesma ordem, nenhum "Here is something", 1 chamada só;
//   (c) sem cena divisível, o enchimento é CURTO (≤ 12 palavras de tema, sem "Create a…");
//   (d) o teto de cenas (safeCount) e a contagem de chamadas ao modelo não mudam.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(join(root, p), 'utf8')
const parseSrc = (name, src) => ts.createSourceFile(name, src, ts.ScriptTarget.Latest, true)
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
function find(source, predicate) {
  let found
  function visit(node) { if (!found && predicate(node)) found = node; if (!found) ts.forEachChild(node, visit) }
  visit(source)
  assert.ok(found, 'Actual source node missing')
  return found
}
const functionSource = (source, name) => find(source, n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(source)
const noNetwork = () => { throw new Error('Network is forbidden in this test') }
function execute(source, globals = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, console: { log() {}, warn() {}, error() {} }, process: { env: {} }, fetch: noNetwork, ...globals })
  return exports
}
const allowed = new Set(['lib/aspect.ts', 'lib/cinematic/sceneStyle.ts', 'lib/cinematic/visualMode.ts', 'lib/cinematic/visualPromptPolicy.ts', 'lib/engineFit.ts'])
const cache = new Map()
function load(path) {
  path = path.replaceAll('\\', '/')
  if (cache.has(path)) return cache.get(path)
  assert.ok(allowed.has(path), `Unexpected dependency: ${path}`)
  const exports = execute(read(path), { require(id) { if (id === 'node:crypto') return { createHmac }; return load(join(dirname(path), id + '.ts')) } })
  cache.set(path, exports)
  return exports
}
const policy = load('lib/cinematic/visualPromptPolicy.ts')
const aspect = load('lib/aspect.ts')
const wordsOf = (t) => (t ?? '').trim().split(/\s+/).filter(Boolean).length

function planner(runwaySrc, prompt, count, response) {
  let calls = 0
  const src = parseSrc('runway.ts', runwaySrc)
  const api = execute(functionSource(src, 'shortCaptionFromVoiceover') + '\n' + functionSource(src, 'generateScenes'), {
    ...aspect, ...policy, detectVisualCategory: () => undefined,
    openai: { chat: { completions: { create: async () => { calls++; return { choices: [{ message: { content: JSON.stringify(response) } }] } } } } },
  })
  return { run: () => api.generateScenes(prompt, count), calls: () => calls }
}
const cena = (i, a, b) => ({ description: `shot ${i}`, voiceover: b ? `${a} ${b}` : a, caption: `c${i}`, negativeVisualPrompt: 'x', visualIntent: 'y', visualCategory: 'general_documentary', scenePurpose: i === 1 ? 'HOOK' : 'EXPLANATION', stockSearchQuery: `q${i}`, searchKeywords: `k${i}` })

const PEDIDO_KLING = read('docs/coordination/motores/ROTEIROS-TESTE-2026-09-15.md').split('## 2. Kling 2.5')[1].split('```')[1].trim()
checa('o pedido do Kling 2.5 (roteiro controlado) foi lido do doc: começa com "Create a 60-second"', PEDIDO_KLING.startsWith('Create a 60-second fictional cinematic mystery in English.'))
const SEIS = [
  cena(1, 'A night train stops at an abandoned station.', 'Its brakes hiss into the dark.'),
  cena(2, 'A woman traveling alone notices that every clock has stopped.', 'The hands point at different hours.'),
  cena(3, 'She sees a red suitcase outside, identical to hers.', 'Nobody is near it.'),
  cena(4, 'Through the window she watches someone in her coat pick it up.', 'The stranger turns around.'),
  cena(5, 'It is an older version of herself.', 'The train starts moving before she can react.'),
  cena(6, 'Inside her own suitcase she finds a ticket for this station, dated thirty years in the future.'),
]
const palavrasSeis = SEIS.reduce((a, s) => a + wordsOf(s.voiceover), 0)

console.log('== (a) reprodução na origin/main ==')
{
  let main = null
  try { main = execFileSync('git', ['show', 'origin/main:lib/runway.ts'], { cwd: root, maxBuffer: 32 * 1024 * 1024 }).toString() } catch {}
  if (main && !main.includes('KINEO-SEM-ENCHIMENTO-2026-09-15')) {
    const p = planner(main, PEDIDO_KLING, 7, SEIS)
    const r = await p.run()
    const setima = r[6]?.voiceover ?? ''
    checa(`main: 6 cenas para 7 → a 7ª é o enchimento com o PEDIDO INTEIRO (${wordsOf(setima)} palavras, começa "Here is something most people do not know about Create a 60-second")`, r.length === 7 && /^Here is something most people do not know about Create a 60-second/.test(setima) && wordsOf(setima) > 150 && p.calls() === 1)
  } else {
    checa('reprodução na main pulada (origin/main já traz o conserto, ou git indisponível)', true)
  }
}

console.log('== (b) candidato: a cena que falta é uma divisão, não um enchimento ==')
{
  const p = planner(read('lib/runway.ts'), PEDIDO_KLING, 7, SEIS)
  const r = await p.run()
  const falas = r.map((s) => s.voiceover)
  checa(`7 cenas, 1 chamada, nenhuma começa com "Here is something" (${r.length} cenas, ${p.calls()} chamada)`, r.length === 7 && p.calls() === 1 && falas.every((f) => !/^Here is something/i.test(f)))
  checa(`as mesmas palavras, na mesma ordem: ${palavrasSeis} palavras antes e ${falas.reduce((a, f) => a + wordsOf(f), 0)} depois; texto concatenado idêntico`, falas.reduce((a, f) => a + wordsOf(f), 0) === palavrasSeis && falas.join(' ').replace(/\s+/g, ' ') === SEIS.map((s) => s.voiceover).join(' ').replace(/\s+/g, ' '))
  const idx = falas.findIndex((f) => f === 'Inside her own suitcase she finds a ticket for this station, dated thirty years in the future.')
  checa('a cena mais longa com duas frases foi dividida (cena 2 → "…stopped." + "The hands point…"), e a cena de uma frase só ficou inteira', falas[1] === 'A woman traveling alone notices that every clock has stopped.' && falas[2] === 'The hands point at different hours.' && idx === 6)
  checa('nenhuma cena passa de 40 palavras (o compose não reescreve nem repete cena por excesso)', falas.every((f) => wordsOf(f) <= 40))
  checa('a cena dividida herda a descrição/consulta da cena de origem (o visual não inventa outra coisa)', r[2].description === r[1].description && r[2].stockSearchQuery === r[1].stockSearchQuery)
}

console.log('== (b2) cenas de UMA frase: a mais longa é dividida na vírgula do meio (mesmas palavras) ==')
{
  const UMA = [
    cena(1, 'In the dead of night, a solitary train stops at an abandoned station, shrouded in mystery and silence.'),
    cena(2, 'Every clock on the platform stands frozen at exactly 3:15 AM, which amplifies the unsettling stillness of the place.'),
    cena(3, 'A red suitcase, strikingly identical to her own, sits on the deserted platform.'),
    cena(4, 'Through the glass, she watches in disbelief as an older version of herself picks up the suitcase.'),
    cena(5, 'Before she has time to react, the train suddenly pulls away.'),
    cena(6, 'Inside her suitcase lies a ticket for this very station, dated thirty years into the future.'),
  ]
  const antes = UMA.reduce((a, s) => a + wordsOf(s.voiceover), 0)
  const p = planner(read('lib/runway.ts'), PEDIDO_KLING, 7, UMA)
  const r = await p.run()
  const falas = r.map((s) => s.voiceover)
  const semPontuacao = (t) => t.toLowerCase().replace(/[.,;—–]/g, '').replace(/\s+/g, ' ').trim()
  checa(`7 cenas, nenhuma "Here is something", mesmas palavras (${antes} → ${falas.reduce((a, f) => a + wordsOf(f), 0)}) e mesma ordem`, r.length === 7 && falas.every((f) => !/^Here is something/i.test(f)) && semPontuacao(falas.join(' ')) === semPontuacao(UMA.map((s) => s.voiceover).join(' ')))
  checa('a cena 2 (a mais longa, 20 palavras) foi dividida na vírgula do meio: "…3:15 AM." + "Which amplifies…"', falas[1] === 'Every clock on the platform stands frozen at exactly 3:15 AM.' && falas[2] === 'Which amplifies the unsettling stillness of the place.' && p.calls() === 1)
}

console.log('== (c) sem cena divisível: enchimento curto, sem a instrução ==')
{
  const p = planner(read('lib/runway.ts'), PEDIDO_KLING, 4, [cena(1, 'A night train stops.')])
  const r = await p.run()
  const fillers = r.slice(1).map((s) => s.voiceover)
  checa(`3 enchimentos, cada um ≤ 20 palavras, com o tema curto e SEM "Create a 60-second": "${fillers[0]}"`, r.length === 4 && fillers.length === 3 && fillers.every((f) => wordsOf(f) <= 20 && !/Create a 60-second/i.test(f) && /^Here is something most people do not know about A night train stops at an abandoned station\.$/.test(f)))
  const q = planner(read('lib/runway.ts'), 'Mira, a young woman, enters Kyoto in 1930.', 4, [cena(1, 'Mira finds a parcel.')])
  const rq = await q.run()
  checa('pedido curto sem instrução: o tema é a própria frase ("Mira, a young woman, enters Kyoto in 1930")', rq.length === 4 && rq.slice(1).every((s) => s.voiceover === 'Here is something most people do not know about Mira, a young woman, enters Kyoto in 1930.'))
}

console.log('== (d) teto e chamadas ==')
{
  const p = planner(read('lib/runway.ts'), PEDIDO_KLING, 100, SEIS)
  const r = await p.run()
  checa(`safeCount é 12 desde 15/09 (Veo a 90 s pede 12 clipes; pediu 100 → ${r.length}) com 1 chamada`, r.length === 12 && p.calls() === 1)
  const lib = read('lib/runway.ts')
  checa('biblioteca: o enchimento com o pedido inteiro não existe mais (voiceover usa temaCurto)', lib.includes('const voiceover = `Here is something most people do not know about ${temaCurto}.`') && !lib.includes('const voiceover = `Here is something most people do not know about ${prompt}.`'))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
