// KINEO-ESTADO-NEGADO-1311 [CEO 13/11, item 3.2] — guardião.
// Prova OFFLINE, EXECUTANDO o código real, com as falas e os planos REAIS dos 2 filmes da casa (ae1da6de faroleiros; 3a316ecb FAA):
//   (A) a fala que nega/desliga o objeto vira o estado positivo e visual: farol apagado, lareira fria, grade arrancada, aviões no chão;
//       as falas que NÃO negam não disparam ("the fire is burning", "he stayed grounded", "the light shines");
//   (B) o estado vai na frente do plano (depois da trava do estilo), só na cena cuja fala diz; idempotente;
//   (C) o texto que vai ao Kling 4 (promptDaCenaKling4) mantém o estado;
//   (D) a rota chama a camada pela fala de cada cena, antes das imagens-chave, e grava o evento;
//   (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const ARQ = 'lib/cinematic/estadoNegado1311.ts'
const globals = { AbortController, setTimeout, clearTimeout }
const carrega = (mutar = null) => createOfflineLoader({ globals, source: (rel, text) => (mutar && rel === ARQ ? mutar(text) : text) })

const LOOK = 'photorealistic, ultra-detailed'
const TAIL = ', faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, 9:16 vertical framing'
// faroleiros (ae1da6de): as falas das cenas 2, 4 e 5 e os planos que o claim gravou
const FAROL = [
  ['Three keepers in wool coats live there alone. One night, a passing steamship notices the light is dark.', `Film visual medium: ${LOOK}. Three distant silhouettes of keepers in wool coats stand by the lighthouse, while a darkened steamship looms ominously on the horizon, its lights extinguished.${TAIL}`, ['farol_apagado']],
  ['The clock has stopped. The fire is cold. The beds are empty. One keeper\'s coat was left behind.', `Film visual medium: ${LOOK}. A macro shot of a stopped clock on the lighthouse wall, dust settling on the cold hearth, and an empty bed with a discarded wool coat draped over it.${TAIL}`, ['fogo_frio']],
  ['On the west cliff, iron railings are torn out of the rock. No bodies were ever found.', `Film visual medium: ${LOOK}. A low-angle shot of torn iron railings on the cliff's edge, overlooking the turbulent sea below, evoking a sense of foreboding and unanswered questions.${TAIL}`, ['grade_quebrada']],
]
// FAA (3a316ecb): cena 2
const FAA = ['Planes already in the air could land. Planes on the ground could not take off.', `Film visual medium: ${LOOK}. A wide shot of planes circling in the sky, with one descending to land, while others hover above the airport, unable to take off.${TAIL}`, ['avioes_no_chao']]
const NAO = ['The fire is burning bright in the hearth.', 'He stayed grounded after the win.', 'The light shines across the bay.', 'Why did the FAA just change its rules?', 'A dark and stormy night at sea.']

function provas(L) {
  const erros = []
  const m = L(ARQ), c = L('lib/cinematic/cenaKling4.ts'), st = L('lib/cinematic/sceneStyle.ts')
  for (const [fala, , chaves] of [...FAROL, FAA]) {
    const got = m.estadosDaFala(fala).map((e) => e.chave)
    if (got.join() !== chaves.join()) erros.push(`A "${fala.slice(0, 50)}" → ${got}`)
  }
  for (const f of NAO) if (m.estadosDaFala(f).length) erros.push(`A falso positivo: "${f}" → ${m.estadosDaFala(f).map((e) => e.chave)}`)
  if (m.estadosDaFala('Why did the FAA just stop every departing flight in America?').map((e) => e.chave).join() !== 'avioes_no_chao') erros.push('A "stop every departing flight" não disparou')
  if (m.estadosDaFala('A luz do farol estava apagada e o fogo estava frio.').map((e) => e.chave).join() !== 'farol_apagado,fogo_frio') erros.push('A português não disparou: ' + m.estadosDaFala('A luz do farol estava apagada e o fogo estava frio.').map((e) => e.chave))
  // (B)
  const filme = m.estadoNegadoNoFilme([FAROL[0][1], FAROL[1][1], FAROL[2][1]], [FAROL[0][0], FAROL[1][0], FAROL[2][0]])
  if (!filme.prompts[0].startsWith(`Film visual medium: ${LOOK}. State shown in this shot: the lighthouse lamp is switched off`)) erros.push('B farol: ' + filme.prompts[0].slice(0, 160))
  if (!filme.prompts[1].includes('State shown in this shot: a cold fireplace full of grey ashes')) erros.push('B lareira')
  if (!filme.prompts[2].includes('State shown in this shot: twisted, broken iron railings')) erros.push('B grade')
  if (m.estadoNegadoNoFilme(filme.prompts, [FAROL[0][0], FAROL[1][0], FAROL[2][0]]).relato.mudou) erros.push('B não é idempotente')
  if (m.estadoNegadoNoFilme([FAROL[1][1]], ['The keepers ate dinner together.']).prompts[0] !== FAROL[1][1]) erros.push('B fala sem estado mexeu no plano')
  const faa = m.comEstadoDaFala(FAA[1], FAA[0]).prompt
  if (!faa.includes('airplanes parked at the gates')) erros.push('B FAA sem o estado')
  // a luz apagada fora de um farol nunca inventa farol
  const cozinha = m.comEstadoDaFala('Film visual medium: photorealistic, ultra-detailed. A woman stands in a small kitchen at night.', 'She walks in and the light is off.').prompt
  if (/lighthouse/i.test(cozinha) || !cozinha.includes('the lamp is switched off and unlit')) erros.push('B luz apagada na cozinha virou farol: ' + cozinha.slice(0, 200))
  // (C) o texto do Kling 4 mantém o estado
  const style = st.deriveStyleAnchor('photorealistic documentary')
  filme.prompts.forEach((p, i) => {
    const k = c.promptDaCenaKling4(p, style, i, true)
    if (!k.includes('State shown in this shot:')) erros.push(`C plano ${i + 1} do Kling 4 perdeu o estado: ${k.slice(0, 200)}`)
  })
  return erros
}

const base = provas(carrega())
checa(`A, B e C verdes nas falas e planos reais${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
const iCamada = rota.indexOf('estadoNegadoNoFilme(classicScenePrompts, scenes.map((s) => s.voiceover ?? \'\'))')
const iStills = rota.indexOf('const sceneStills: (string | null)[] = new Array(scenes.length).fill(null)')
checa('D a rota usa a fala de cada cena, antes das imagens-chave', iCamada > 0 && iCamada < iStills)
checa('D o evento é gravado e é só do servidor', rota.includes('name: ESTADO_NEGADO_EVENTO') && lf(fs.readFileSync('app/api/events/route.ts', 'utf8')).includes("'cinematic_negated_state',"))
const MUTANTES = [
  ['luz apagada sempre vira farol', (s) => s.replace("chave === 'farol_apagado' && !FAROL_RE.test(", "false && !FAROL_RE.test(")],
  ['o estado vai no fim (o corte do Kling 4 tira)', (s) => s.replace('return { prompt: `${trava}${frase}${p.slice(trava.length)}`, chaves: estados.map((e) => e.chave) }', 'return { prompt: `${p} ${frase}`, chaves: estados.map((e) => e.chave) }')],
  ['estado em negativo ("no fire")', (s) => s.replace("'a cold fireplace full of grey ashes and charred logs, the hearth dark'", "'no fire, no flames'")],
  ['"grounded" solto vira avião no chão', (s) => s.replace('|\\b(?:planes?|aircraft|jets?|airliners?|flights?)\\b[^.!?]{0,40}\\bgrounded\\b|\\bgrounded\\s+(?:planes?|aircraft|jets?|flights?)\\b|', '|\\bgrounded\\b|')],
  ['não é idempotente', (s) => s.replace('const estados = estadosDaFala(fala, p).filter((e) => !p.includes(e.estado))', 'const estados = estadosDaFala(fala, p)')],
]
const src = lf(fs.readFileSync(ARQ, 'utf8'))
for (const [nome, fn] of MUTANTES) {
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
