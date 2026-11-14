// KINEO-ATRIBUTOS-DO-PEDIDO-1311 [CEO 13/11, item 3.1] — guardião.
// Prova OFFLINE, EXECUTANDO o código real, com o pedido e os planos REAIS do e3c00f5c (13/11, nota 5: "teens … navy uniforms" → crianças
// de vermelho; o azul-marinho só no plano 2) e o pedido do Milo (982a6aeb/9e938ae7: "orange kitten … heavy rain"):
//   (A) extração: roupa com cor, faixa de idade e clima do PEDIDO; "rainforest"/"rainbow" não são chuva; idade em conflito = nenhuma;
//   (B) todo plano com gente ganha o que falta ("Everyone shown: teenagers, wearing navy uniforms."); o clima vai em todo plano; plano que já diz
//       fica igual; idempotente; a frase vai ANTES da ficha final;
//   (C) o texto que vai ao Kling 4 (promptDaCenaKling4) leva o atributo nos 3 planos;
//   (D) a rota chama a camada antes das imagens-chave e grava a conferência no evento;
//   (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const ARQ = 'lib/cinematic/atributosDoPedido1311.ts'
const globals = { AbortController, setTimeout, clearTimeout }
const carrega = (mutar = null) => createOfflineLoader({ globals, source: (rel, text) => (mutar && rel === ARQ ? mutar(text) : text) })

const PEDIDO_TIME = 'Inside a Spanish football academy cafeteria, famous players as teens.\n\nLarge windows frame the lush football pitches outside.\n\nStudents in navy uniforms chat casually, blending school with sport.\n\nLamine Yamal, Gavi, Pedri, and Jude Bellingham... a cinematic 3D scene.'
const LOOK = 'stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic'
const TAIL = ` 9:16 vertical framing, subject framed in the upper two-thirds with the lower third clear for captions, smooth camera motion, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same 3D animated art style in every scene, same character design and palette, consistent lighting, never mix with live-action or photorealism, energetic, natural, documentary, consistent color grade across all scenes, characters act naturally within the scene without addressing the viewer, 9:16 vertical framing Setting as the customer asked: an elite Spanish football high school.`
const PLANOS_TIME = [
  `Film visual medium: ${LOOK}. Medium shot, subject centered and clearly readable, slow push-in. Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. ${LOOK}. A vibrant cafeteria filled with teenage football players enjoying lunch, laughter and chatter echoing around the colorful tables.${TAIL}`,
  `Film visual medium: ${LOOK}. Close-up on a telling detail of the action, shallow depth of field, gentle rack focus. ${LOOK}. A slow pan reveals large windows showcasing lush football pitches, while navy-uniformed students converse animatedly, blending academia and sport.${TAIL}`,
  `Film visual medium: ${LOOK}. Clear well-lit shot of the final moment with the subject fully recognizable, slow pull-back. ${LOOK}. Four young football stars share a table, joking together as the camera pulls back over the cafeteria.${TAIL}`,
]
const PEDIDO_MILO = 'Create a complete 15-second cinematic 3D animated animal film for YouTube Shorts.\n\nA tiny adorable fluffy orange kitten named Milo sees a frightened baby yellow duckling trapped in a puddle during heavy rain.'
const PLANO_MILO = `Film visual medium: ${LOOK}. Milo, the kitten, leaps gracefully into a shimmering puddle, cradling a soaked duckling in his paws as he swims towards the shore. The same main character appears in this scene, consistent design: a tiny adorable fluffy orange kitten named Milo.${TAIL}`

function provas(L) {
  const erros = []
  const m = L(ARQ), c = L('lib/cinematic/cenaKling4.ts'), st = L('lib/cinematic/sceneStyle.ts')
  // (A)
  const a = m.atributosDoPedido(PEDIDO_TIME)
  if (!a || a.idade !== 'teenagers' || a.roupa.join() !== 'navy uniforms' || a.clima !== null) erros.push('A time: ' + JSON.stringify(a))
  const milo = m.atributosDoPedido(PEDIDO_MILO)
  if (!milo || milo.clima !== 'heavy rain' || milo.roupa.length || milo.idade) erros.push('A Milo: ' + JSON.stringify(milo))
  if (m.atributosDoPedido('A jaguar in the rainforest under a rainbow')) erros.push('A rainforest/rainbow viraram chuva')
  if (m.atributosDoPedido('Teens and kids at the beach')?.idade) erros.push('A idade em conflito escolheu uma')
  if (m.atributosDoPedido('A woman in a red dress and a man in a dark blue suit')?.roupa.join() !== 'red dress,dark blue suit') erros.push('A roupas: ' + JSON.stringify(m.atributosDoPedido('A woman in a red dress and a man in a dark blue suit')))
  // (B)
  const r = m.atributosEmTodoPlano(PLANOS_TIME, PEDIDO_TIME)
  if (!r.prompts[0].includes('Everyone shown: wearing navy uniforms.') || r.prompts[0].includes('Everyone shown: teenagers')) erros.push('B plano 1 (já diz teenage, falta navy): ' + JSON.stringify(r.relato.planos[0]))
  if (!r.prompts[1].includes('Everyone shown: teenagers.')) erros.push('B plano 2 (já diz navy, falta a idade): ' + JSON.stringify(r.relato.planos[1]))
  if (!r.prompts[2].includes('Everyone shown: teenagers, wearing navy uniforms.')) erros.push('B plano 3 (falta tudo): ' + JSON.stringify(r.relato.planos[2]))
  if (m.atributosEmTodoPlano(r.prompts, PEDIDO_TIME).relato.mudou) erros.push('B não é idempotente')
  const pm = m.comAtributosNaCena(PLANO_MILO, milo).prompt
  if (!pm.includes('Weather in this shot: heavy rain. The same main character appears in this scene')) erros.push('B o clima não foi antes da ficha final: ' + pm.slice(0, 400))
  if (m.atributosEmTodoPlano(PLANOS_TIME, 'A quiet lake at dawn').prompts.some((p, i) => p !== PLANOS_TIME[i])) erros.push('B pedido sem atributo mexeu no plano')
  // (C) o texto que vai ao Kling 4
  const style = st.deriveStyleAnchor('stylized 3D animated film')
  r.prompts.forEach((p, i) => {
    const k = c.promptDaCenaKling4(p, style, i, true)
    if (!/navy/i.test(k) || !/teen/i.test(k)) erros.push(`C plano ${i + 1} do Kling 4 sem navy/teen: ${k.slice(0, 220)}`)
  })
  const km = c.promptDaCenaKling4(pm, style, 1, true)
  if (!/heavy rain/i.test(km)) erros.push('C o Kling 4 perdeu a chuva do Milo: ' + km)
  return erros
}

const base = provas(carrega())
checa(`A, B e C verdes nos planos reais${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
const iCamada = rota.indexOf('atributosEmTodoPlano(classicScenePrompts, pedidoDoCliente)')
const iFicha = rota.indexOf('if (kling4TrialCandidate && fichaAntesDoRenderLigada() && !qualidadeHerdada) {')
const iStills = rota.indexOf('const sceneStills: (string | null)[] = new Array(scenes.length).fill(null)')
checa('D a camada roda antes do juiz da ficha e das imagens-chave, pelo PEDIDO do cliente', iCamada > 0 && iCamada < iFicha && iFicha < iStills)
checa('D a conferência vai ao evento (só servidor)', rota.includes('name: ATRIBUTOS_EVENTO') && lf(fs.readFileSync('app/api/events/route.ts', 'utf8')).includes("'cinematic_request_attributes',"))
const MUTANTES = [
  ['a frase vai depois da ficha final (o Kling 4 descarta)', (s) => s.replace("const novo = i >= 0 ? `${p.slice(0, i).replace(/\\s+$/u, '')} ${frases.join(' ')} ${p.slice(i)}` :", 'const novo =')],
  ['só o 1º plano', (s) => s.replace('const saidas = prompts.map((p) => comAtributosNaCena(p, a))', 'const saidas = prompts.map((p, i) => (i === 0 ? comAtributosNaCena(p, a) : { prompt: p, faltava: [] }))')],
  ['rainforest vira chuva', (s) => s.replace("['rain', /(?<![\\p{L}])(?:rain|raining|rainy)(?![\\p{L}])/iu]", "['rain', /rain/iu]")],
  ['sem a idade', (s) => s.replace("const faltaIdade = gente && a.idade && !dizIdade(p, a.idade) ? a.idade : null", 'const faltaIdade = null')],
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
