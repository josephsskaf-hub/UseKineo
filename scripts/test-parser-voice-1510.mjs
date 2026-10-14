#!/usr/bin/env node
// ═══ KINEO-PARSER-VOICE-1510 [TRAVA 8.2 — vai do fundador 15/10] ═══════════════════════════════════════════════════════
//
// O DEFEITO: `parseUserScript` APAGAVA da narração a linha de fala rotulada que tivesse "voice" (ou eyes, hair, color,
// tall, antennae, features…) EM QUALQUER LUGAR — inclusive dentro do [Pexels: …]:
//     PAYOFF: [Pexels: x] Her voice was gone.         → sumia
// Causa exata: `isCharacterSheetLine` (KINEO-BRIEF-NAO-E-FALA-2026-09-12) lê "PAYOFF:" como NOME de personagem
// (SHEET_NAME_HEAD = Maiúscula + letras + ":") e o resto como FICHA, porque SHEET_VOCAB tem voice/eyes/color/tall…
// O cleanNarration descarta a linha inteira. O escritor (generate-script, scriptWordCount) conta essas palavras; a régua
// da guarda (parseUserScript().narration) não — o roteiro "encolhe" entre o escritor e o portão.
// Duas primas da mesma classe, consertadas juntas:
//   · `isVoiceSpecLine` lia "Narration: Her voice was gone." como FICHA DE VOZ (≤16 palavras + "voice") e apagava a fala;
//   · `isInstructionLine` lia "Make no mistake, this voice changed history." como INSTRUÇÃO (verbo + "voice") e apagava.
// Medido em produção (30 dias, contas externas): 5 de 65 roteiros do escritor no caminho rápido (fast_scene_plan),
// 5 pessoas, perderam 93 de 483 palavras faladas (até 30 de 80 num roteiro).
//
// Este guardião EXECUTA o parseUserScript REAL (lib/scriptParser.ts transpilado) e o scriptWordCount REAL do escritor
// (recortado de app/api/generate-script/route.ts). Rodar: node scripts/test-parser-voice-1510.mjs — sem rede, sem custo.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semParserVoice1510, desfazParserVoice1510, FORMA_PARSER_VOICE_1510, MARCA_PARSER_VOICE_1510 } from './test-support/desfaz-parser-voice-1510.mjs'
import { desfazParceiroEyebible1410 } from './test-support/desfaz-parceiro-eyebible-1410.mjs' // reancorado KINEO-PARCEIRO-EYEBIBLE-1410 [TRAVA 8.2 — vai do fundador 14/10]

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = '5980f2189e429ded5f89b4a808f17efd1606925f' // origin/main do dia, antes do conserto
const ARQ = 'lib/scriptParser.ts'

let falhas = 0
let total = 0
function checa(nome, cond, detalhe = '') {
  total++
  if (cond) console.log(`  ok   ${nome}`)
  else { falhas++; console.log(`  FALHOU ${nome}${detalhe ? ' — ' + detalhe : ''}`) }
}
const secao = (t) => console.log(`\n── ${t}`)

function carregar(src, nome) {
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const d = mkdtempSync(join(tmpdir(), 'kineo-parser-voice-'))
  writeFileSync(join(d, nome + '.cjs'), out)
  return createRequire(join(d, 'x.cjs'))(join(d, nome + '.cjs'))
}
const fonte = readFileSync(join(RAIZ, ARQ), 'utf8')
const P = carregar(fonte, 'scriptParser')
let fonteBase = null
try { fonteBase = execFileSync('git', ['-C', RAIZ, 'show', `${BASE}:${ARQ}`], { encoding: 'utf8' }) } catch { fonteBase = null }

// O contador do ESCRITOR, recortado da rota real (função pura, sem import).
const rotaEscritor = readFileSync(join(RAIZ, 'app/api/generate-script/route.ts'), 'utf8').replace(/\r\n/g, '\n')
const iniEsc = rotaEscritor.indexOf('function scriptWordCount(text: string): number {')
const fimEsc = iniEsc < 0 ? -1 : rotaEscritor.indexOf('\n}\n', iniEsc)
const fonteEsc = iniEsc >= 0 && fimEsc > iniEsc ? rotaEscritor.slice(iniEsc, fimEsc + 2) + '\nmodule.exports = { scriptWordCount }\n' : null
const scriptWordCount = fonteEsc ? carregar(fonteEsc, 'escritor').scriptWordCount : null
const guardaUsaOParser = /const falaNaReguaDaGuarda = \(t: string\) => parseUserScript\(t\)\.narration\.split\(\/\\s\+\/\)\.filter\(Boolean\)\.length/.test(rotaEscritor)

const narra = (s) => P.parseUserScript(s).narration
const palavras = (s) => String(s).split(/\s+/).filter(Boolean).length
const ABRE = 'HOOK: [Pexels: ship at sea] The ship vanished in 1872.'

// ═══ (a) o caso do defeito ═══════════════════════════════════════════════════════════════════════════════════════════
secao('(a) o caso relatado: "PAYOFF: [Pexels: x] Her voice was gone."')
{
  const roteiro = `${ABRE}\nPAYOFF: [Pexels: x] Her voice was gone.`
  const r = P.parseUserScript(roteiro)
  checa('a narração completa guarda "Her voice was gone." palavra por palavra', r.narration === 'The ship vanished in 1872. Her voice was gone.', JSON.stringify(r.narration))
  checa('o segmento do PAYOFF e a narração dizem a mesma fala', r.segments.length === 2 && r.segments[1].voiceover === 'Her voice was gone.', JSON.stringify(r.segments))
  if (fonteBase) {
    const B = carregar(fonteBase, 'scriptParserBase')
    checa('controle: a BASE (5980f218) apagava a linha (o defeito é real, não inventado pelo teste)', B.parseUserScript(roteiro).narration === 'The ship vanished in 1872.', JSON.stringify(B.parseUserScript(roteiro).narration))
  } else checa('a base 5980f218 está no repositório para o controle', false)
}

// ═══ (b) frase falada com a palavra no meio — fica, verbatim ═══════════════════════════════════════════════════════════
secao('(b) frase falada com voice/camera/music/scene… no meio, sob qualquer rótulo de beat: fica verbatim')
{
  const PALAVRAS = ['voice', 'voiceover', 'Voice', 'VOICE', 'music', 'sound', 'sfx', 'scene', 'visual', 'camera', 'caption', 'narrator', 'narration',
    'eyes', 'hair', 'color', 'tall', 'features', 'expression', 'accent', 'design', 'creature', 'antennae']
  const ROTULOS = ['PAYOFF: [Pexels: x] ', 'PAYOFF: ', 'ESCALATION: ', 'RHYTHM: [Pexels: intense eyes closeup] ', 'MICRO REWARD 1: ', 'Payoff: ', '']
  const perdidas = []
  for (const w of PALAVRAS) for (const rot of ROTULOS) {
    const frase = `In the end, the ${w} was all that remained of her.`
    const n = narra(`${ABRE}\n${rot}${frase}`)
    if (!n.includes(frase)) perdidas.push(`${rot}${frase} → ${n}`)
  }
  checa(`${PALAVRAS.length * ROTULOS.length} combinações rótulo × palavra: nenhuma frase perdida`, perdidas.length === 0, `${perdidas.length} perdidas; ex.: ${perdidas.slice(0, 2).join(' | ')}`)
  const FRASES = [
    'The camera never lied.', 'The music stopped at midnight.', 'No sound came from the cave.', 'The scene was silent.',
    'Every visual clue pointed north.', 'The narrator was lying all along.', 'His narration fooled millions.', 'The voiceover never came.',
    'Make no mistake, this voice changed history.', 'I need you to hear her voice one more time.', 'I want you to picture the scene.',
    'Imagine hearing your own voice warning you about the future.',
  ]
  for (const f of FRASES) for (const rot of ['', 'PAYOFF: ', 'ESCALATION: [Pexels: dark cave] ']) {
    checa(`"${rot}${f}" → a frase sai inteira`, narra(`${ABRE}\n${rot}${f}`) === `The ship vanished in 1872. ${f}`, JSON.stringify(narra(`${ABRE}\n${rot}${f}`)))
  }
  // Roteiro de cinema (2+ rótulos de fala): a fala com "voice" e verbo de narrativa NÃO é ficha de voz.
  const cinema = 'Scene 1\nVisual: an empty deck.\nNarration: Her voice was gone.\nScene 2\nVisual: a lantern.\nVoiceover: Nobody ever heard it again.'
  checa('roteiro de cinema: "Narration: Her voice was gone." é fala (não ficha de voz)', narra(cinema) === 'Her voice was gone. Nobody ever heard it again.', JSON.stringify(narra(cinema)))
  checa('isVoiceSpecLine("Narration: Her voice was gone.") = false', P.isVoiceSpecLine('Narration: Her voice was gone.') === false)
}

// ═══ (c) direção de verdade continua saindo ═══════════════════════════════════════════════════════════════════════════
secao('(c) diretiva de verdade continua saindo (rótulo no começo da linha ou entre colchetes)')
{
  const FICA = 'The ship sank.'
  const DIRETIVAS = [
    'VOICE: deep male', 'Voice: deep male', 'voice: deep male narrator', '[Music: epic]', '[voice: whisper]', 'Camera: slow push in',
    '**Camera:** slow push in', 'Music: epic orchestral', 'SFX: thunder', 'Sound: waves crashing', 'Visual: a dark cave', 'Caption: MISSING',
    'Scene 2', 'Narrator: deep male voice, calm', 'Voiceover: Natural American English, energetic and conversational.',
    'Lumi: pequena criatura azul com olhos grandes. Voz infantil feminina.', 'Max: a tall man with grey hair, wearing a coat, deep voice.',
    'Make a 30 second video about sharks with a deep voice.', 'Crie um vídeo sobre tubarões com voz grave.', 'Create a cinematic scene in a dramatic style.',
  ]
  for (const d of DIRETIVAS) {
    const n = narra(`${d}\n${FICA}`)
    checa(`"${d}" sai; a fala fica`, n === FICA, JSON.stringify(n))
  }
  checa('isVoiceSpecLine("Voiceover: Natural American English, energetic and conversational.") continua true', P.isVoiceSpecLine('Voiceover: Natural American English, energetic and conversational.') === true)
  checa('isCharacterSheetLine("Lumi: pequena criatura azul com olhos grandes. Voz infantil feminina.") continua true', P.isCharacterSheetLine('Lumi: pequena criatura azul com olhos grandes. Voz infantil feminina.') === true)
  checa('isCharacterSheetLine("PAYOFF: [Pexels: x] Her voice was gone.") = false', P.isCharacterSheetLine('PAYOFF: [Pexels: x] Her voice was gone.') === false)
  checa('isInstructionLine não mudou: "Make no mistake, this voice changed history." ainda é instrução para o brief (só a narração deixa de apagar)', P.isInstructionLine('Make no mistake, this voice changed history.') === true)
}

// ═══ (d) a régua da guarda = a conta do escritor ═════════════════════════════════════════════════════════════════════
secao('(d) a régua da guarda (parseUserScript) conta o MESMO número de palavras que o escritor (scriptWordCount)')
{
  checa('o scriptWordCount real foi recortado de app/api/generate-script/route.ts', typeof scriptWordCount === 'function')
  checa('a guarda do escritor mede parseUserScript(t).narration (falaNaReguaDaGuarda)', guardaUsaOParser)
  // Roteiros do escritor REAIS (fast_scene_plan, contas externas, 30 dias até 14/10) que perdiam palavras na base.
  const REAIS = {
    '0e499160 (perdia 30 de 80)': 'HOOK (0-2s): [Pexels: futuristic city skyline] What would you do if your future self sent you a message?\n\nMICRO REWARD 1: [Pexels: smartphone screen closeup] In 2018, a man claimed to receive a voice note from himself, dated 2025.\n\nMICRO REWARD 2: [Pexels: people reading in library] Researchers found that 40% of people believe in some form of time travel.\n\nMICRO REWARD 3: [Pexels: complex equations on chalkboard] The theory of retrocausality suggests our actions can affect the past!\n\nESCALATION: [Pexels: clock gears turning] Imagine the stakes — hearing your own voice...\n\nRHYTHM: [Pexels: intense eyes closeup] Warning. Urgent. Real.\n\nPAYOFF: [Pexels: person listening to headphones] Imagine hearing your own voice warning you about the future... What would you change? Follow for more mind-bending insights.',
    '67ad01ae (perdia 3 de 106)': "HOOK (0-2s): [Pexels: historic new york skyline] New York wasn't always the city of skyscrapers.\n\nMICRO REWARD 1: [Pexels: old brick buildings] In the 1700s and 1800s, Manhattan was mostly filled with low-rise buildings made of brick and stone.\n\nMICRO REWARD 2: [Pexels: construction steel frame] But everything changed in the late 19th century with the invention of the steel frame and the spread of elevators.\n\nMICRO REWARD 3: [Pexels: vintage new york construction] These innovations made it possible to build higher than ever before.\n\nESCALATION: [Pexels: chrysler building aerial] In the 1930s, the Chrysler Building and Empire State Building became symbols of this new era.\n\nRHYTHM: [Pexels: modern new york skyline] Tall. Bold. Transformative.\n\nPAYOFF: [Pexels: new york skyline sunset] Today, New York's skyline is one of the most recognizable in the world... but it all started with one simple idea: If we can build higher, why stop? Follow for more.",
    'cfd6ccf4 (perdia 22 de 69)': "HOOK (0-2s): [Pexels: colorful playground] Three babies discover a world of colors!\n\nMICRO REWARD 1: [Pexels: red ball on grass] What color is this? ... It's red! Can you say red?\n\nMICRO REWARD 2: [Pexels: blue ball near slide] What color is this? ... It's blue! Can you say blue?\n\nMICRO REWARD 3: [Pexels: yellow ball under tree] What color is this? ... It's yellow! Can you say yellow?\n\nESCALATION: [Pexels: green ball in sandbox] What's next? A new color appears...\n\nRHYTHM: [Pexels: close-up of excited children] Exciting. Fun. Learning.\n\nPAYOFF: [Pexels: green ball rolling to kids] What color is this? ... It's green! Can you say green? Bravo! You know the colors!",
    'dcf6c871 (perdia 28 de 100)': "HOOK (0-2s): [Pexels: cockroach crawling closeup] Did you know a cockroach can survive for weeks without its head?\n\nMICRO REWARD 1: [Pexels: cockroach breathing closeup] Cockroaches don't breathe through their mouths. They breathe through tiny openings all over their bodies.\n\nMICRO REWARD 2: [Pexels: insect nerve network diagram] Their brain doesn't control every movement either — clusters of nerves spread through the body keep reflexes running on their own.\n\nMICRO REWARD 3: [Pexels: insect circulatory system diagram] Unlike us, cockroaches have low-pressure circulatory systems, so losing the head doesn't mean bleeding out.\n\nESCALATION: [Pexels: cockroach graveyard] So what actually kills them? Starvation, dehydration, or infection.\n\nRHYTHM: [Pexels: moving cockroach antennae closeup] Starvation. Dehydration. Infection.\n\nPAYOFF: [Pexels: severed cockroach head] And here's the creepiest part: the severed head itself... can keep moving its antennae for hours. Nature is seriously weird. Follow for more creepy facts.",
    'sintético: o caso relatado': `${ABRE}\nMICRO REWARD 1: [Pexels: radio] She sang on the radio every night.\nESCALATION: [Pexels: empty studio] Then one night the camera caught something.\nPAYOFF: [Pexels: x] Her voice was gone.`,
  }
  for (const [nome, roteiro] of Object.entries(REAIS)) {
    const r = P.parseUserScript(roteiro)
    const escritor = scriptWordCount ? scriptWordCount(roteiro) : -1
    const guarda = palavras(r.narration)
    const segs = r.segments.reduce((a, s) => a + palavras(s.voiceover), 0)
    checa(`${nome}: guarda ${guarda} = escritor ${escritor} = segmentos ${segs}`, escritor > 0 && guarda === escritor && segs === escritor)
  }
}

// ═══ (e) desfaz → base byte a byte ═══════════════════════════════════════════════════════════════════════════════════
secao('(e) só linhas marcadas mudaram: desfeitas, o arquivo é a base byte a byte')
{
  const lf = (s) => String(s).replace(/\r\n/g, '\n')
  const marcadas = lf(fonte).split('\n').filter((l) => l.includes(MARCA_PARSER_VOICE_1510)).length
  checa(`${marcadas} linhas marcadas = ${FORMA_PARSER_VOICE_1510.trocas} troca + ${FORMA_PARSER_VOICE_1510.acrescimos} acréscimos`, marcadas === FORMA_PARSER_VOICE_1510.trocas + FORMA_PARSER_VOICE_1510.acrescimos)
  let desfeito = null
  try { desfeito = semParserVoice1510(desfazParceiroEyebible1410('lib/scriptParser.ts', lf(fonte))) } catch (e) { desfeito = 'ERRO: ' + e.message } // reancorado KINEO-PARCEIRO-EYEBIBLE-1410 [TRAVA 8.2 — vai do fundador 14/10]: a fala de personagem sai em memória antes
  checa('desfeito o conserto, lib/scriptParser.ts == base 5980f218 (LF)', fonteBase !== null && desfeito === lf(fonteBase), typeof desfeito === 'string' && desfeito.startsWith('ERRO') ? desfeito : '')
  checa('a forma (caminho, texto) só toca lib/scriptParser.ts', desfazParserVoice1510('lib/compose.ts', 'x // KINEO-PARSER-VOICE-1510') === 'x // KINEO-PARSER-VOICE-1510')
  let lancou = false
  try { semParserVoice1510(lf(fonte) + '\nconst intrusa = 1 // KINEO-PARSER-VOICE-1510') } catch { lancou = true }
  checa('linha marcada inesperada lança (falha fechada)', lancou)
  let lancouMetade = false
  try { semParserVoice1510(lf(fonte).split('\n').filter((l) => !l.startsWith('  if (BEAT_LABEL_HEAD.test(u))')).join('\n')) } catch { lancouMetade = true }
  checa('conserto pela metade lança (falha fechada)', lancouMetade)
  checa('idempotente na base: sem marca, o texto volta igual', fonteBase !== null && semParserVoice1510(lf(fonteBase)) === lf(fonteBase))
}

console.log(`\n${total - falhas}/${total} verificações ok`)
if (falhas) { console.log(`VERMELHO: ${falhas} falha(s)`); process.exit(1) }
console.log('VERDE')
