// KINEO-ATRIBUTOS-DO-PEDIDO-1311 [CEO 13/11, item 3.1; revisão da CEO 14/11, bloqueios 1 e 2] — guardião.
// Prova OFFLINE, EXECUTANDO o código real, com o pedido e os planos REAIS do e3c00f5c (13/11, nota 5: "teens … navy uniforms" → crianças
// de vermelho; o azul-marinho só no plano 2) e o pedido do Milo (982a6aeb/9e938ae7: "orange kitten … heavy rain"):
//   (A) extração só do que é do GRUPO e do cenário: roupa colada a gente no plural; idade sem adulto ao lado; clima afirmado, um só;
//   (N) o que NÃO pode entrar (revisão da CEO): roupa de UMA pessoa; "grandfather … kids"; "no rain"; "storm passes… sun comes out";
//       "Snow White" / "Jon Snow" / "Purple Rain"; roteiro colado longo (mais de 60 palavras, sem ser a ideia);
//   (B) todo plano com gente ganha o que falta, amarrado ao grupo ("The students wear navy uniforms."); o clima vai como tempo LÁ FORA;
//       plano que já diz fica igual; idempotente; a frase vai ANTES da ficha final;
//   (C) o texto que vai ao Kling 4 (promptDaCenaKling4) leva o atributo nos 3 planos;
//   (D) a rota chama a camada antes das imagens-chave, diz se o pedido é a ideia e grava a conferência no evento;
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
const PEDIDO_MILO = 'Create a complete 15-second cinematic 3D animated animal film for YouTube Shorts.\n\nA tiny adorable fluffy orange kitten named Milo sees a frightened baby yellow duckling trapped in a puddle during heavy rain. Milo immediately runs towards the puddle, splashing through the water, and gently carries the duckling to a dry doorstep. The mother duck arrives and the duckling hugs Milo, sealing a new friendship that warms everyone who watches the two little animals together in the storm drain alley.'
const PLANO_MILO = `Film visual medium: ${LOOK}. Milo, the kitten, leaps gracefully into a shimmering puddle, cradling a soaked duckling in his paws as he swims towards the shore. The same main character appears in this scene, consistent design: a tiny adorable fluffy orange kitten named Milo.${TAIL}`
const LONGO = `${'The old town wakes slowly as bakers open their doors and the tram bells ring across the square. '.repeat(5)}In the last scene a woman walks home in heavy rain.`

function provas(L) {
  const erros = []
  const m = L(ARQ), c = L('lib/cinematic/cenaKling4.ts'), st = L('lib/cinematic/sceneStyle.ts')
  const attr = (t, o) => m.atributosDoPedido(t, o)
  // (A)
  const a = attr(PEDIDO_TIME)
  if (!a || a.idade !== 'teenagers' || JSON.stringify(a.roupa) !== JSON.stringify([{ grupo: 'students', roupa: 'navy uniforms' }]) || a.clima !== null) erros.push('A time: ' + JSON.stringify(a))
  const milo = attr(PEDIDO_MILO, { ehIdeia: true })
  if (!milo || milo.clima !== 'heavy rain' || milo.roupa.length || milo.idade) erros.push('A Milo (ideia): ' + JSON.stringify(milo))
  if (attr('A jaguar in the rainforest under a rainbow')) erros.push('A rainforest/rainbow viraram chuva')
  if (attr('Teens and kids at the beach')?.idade) erros.push('A idade em conflito escolheu uma')
  if (JSON.stringify(attr('Navy-uniformed students run across the yard.')?.roupa) !== JSON.stringify([{ grupo: 'students', roupa: 'navy uniforms' }])) erros.push('A "navy-uniformed students"')
  if (attr('Players wearing a red kit celebrate.')?.roupa[0]?.roupa !== 'red kits') erros.push('A peça no singular colada a grupo no plural: ' + JSON.stringify(attr('Players wearing a red kit celebrate.')))
  // (N) o que não pode entrar
  if (attr('A woman in a red dress meets a man in a black suit.')) erros.push('N roupa de UMA pessoa virou de todos: ' + JSON.stringify(attr('A woman in a red dress meets a man in a black suit.')))
  if (attr('A grandfather telling stories to kids by the fire.')) erros.push('N o avô virou criança: ' + JSON.stringify(attr('A grandfather telling stories to kids by the fire.')))
  if (attr('A teacher and her teenage students in the lab.')?.idade) erros.push('N a professora virou adolescente')
  if (attr('A sunny picnic with no rain at all.')) erros.push('N "no rain" virou chuva: ' + JSON.stringify(attr('A sunny picnic with no rain at all.')))
  if (attr('A picnic without any rain.')) erros.push('N "without any rain" virou chuva')
  if (attr('The storm passes and the sun comes out over the farm.')) erros.push('N "storm passes… sun comes out" virou tempestade em tudo: ' + JSON.stringify(attr('The storm passes and the sun comes out over the farm.')))
  if (attr('It rains until the rain stops and the kids play.')?.clima) erros.push('N "until the rain stops" virou chuva em tudo')
  for (const nome of ['Snow White wakes up in the forest.', 'The story of Jon Snow at the wall.', 'A dancer performs to Purple Rain on stage.', 'A documentary about Desert Storm veterans.']) if (attr(nome)?.clima) erros.push('N nome próprio virou clima: ' + nome)
  if (attr('Rain on the city and snow on the mountains.')?.clima || attr('A sunny beach day with light rain on the horizon.')?.clima) erros.push('N dois estados de tempo no pedido e um deles foi a todo plano')
  if (attr('A kitten in heavy rain during the storm.')?.clima !== 'heavy rain') erros.push('N chuva forte + tempestade (o mesmo tempo) deixou de valer')
  if (attr(LONGO)) erros.push('N roteiro colado longo (sem ser a ideia) recebeu atributo')
  if (attr(LONGO, { ehIdeia: true })?.clima !== 'heavy rain') erros.push('N a ideia longa do cliente perdeu a chuva')
  if (attr('Heavy rain falls on the old harbor at night.')?.clima !== 'heavy rain' || attr('Snow covers the village.')?.clima !== 'snow') erros.push('N clima no começo da frase deixou de valer')
  // (B)
  const r = m.atributosEmTodoPlano(PLANOS_TIME, PEDIDO_TIME)
  if (!r.prompts[0].includes('The students wear navy uniforms.') || r.prompts[0].includes('The people in this shot are teenagers')) erros.push('B plano 1 (já diz teenage, falta navy): ' + JSON.stringify(r.relato.planos[0]))
  if (!r.prompts[1].includes('The people in this shot are teenagers.') || r.prompts[1].includes('The students wear')) erros.push('B plano 2 (já diz navy, falta a idade): ' + JSON.stringify(r.relato.planos[1]))
  if (!r.prompts[2].includes('The students wear navy uniforms. The people in this shot are teenagers.')) erros.push('B plano 3 (falta tudo): ' + JSON.stringify(r.relato.planos[2]))
  if (r.prompts.some((p) => /Everyone shown/.test(p))) erros.push('B voltou o "Everyone shown"')
  if (m.atributosEmTodoPlano(r.prompts, PEDIDO_TIME).relato.mudou) erros.push('B não é idempotente')
  const pm = m.comAtributosNaCena(PLANO_MILO, milo).prompt
  if (!pm.includes('Weather outside, wherever the sky is visible: heavy rain. The same main character appears in this scene')) erros.push('B o clima não foi antes da ficha final (ou não é "lá fora"): ' + pm.slice(0, 400))
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
checa(`A, N, B e C verdes${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
const iCamada = rota.indexOf("atributosEmTodoPlano(classicScenePrompts, pedidoDoCliente, { ehIdeia: typeof body.original_idea === 'string' && body.original_idea.trim().length > 0 })")
const iFicha = rota.indexOf('if (kling4TrialCandidate && fichaAntesDoRenderLigada() && !qualidadeHerdada) {')
const iStills = rota.indexOf('const sceneStills: (string | null)[] = new Array(scenes.length).fill(null)')
checa('D a camada roda antes do juiz da ficha e das imagens-chave, pelo PEDIDO, dizendo se ele é a ideia do cliente', iCamada > 0 && iCamada < iFicha && iFicha < iStills)
checa('D a conferência vai ao evento (só servidor)', rota.includes('name: ATRIBUTOS_EVENTO') && lf(fs.readFileSync('app/api/events/route.ts', 'utf8')).includes("'cinematic_request_attributes',"))
const MUTANTES = [
  ['a frase vai depois da ficha final (o Kling 4 descarta)', (s) => s.replace("const novo = i >= 0 ? `${p.slice(0, i).replace(/\\s+$/u, '')} ${frases.join(' ')} ${p.slice(i)}` :", 'const novo =')],
  ['só o 1º plano', (s) => s.replace('const saidas = prompts.map((p) => comAtributosNaCena(p, a))', 'const saidas = prompts.map((p, i) => (i === 0 ? comAtributosNaCena(p, a) : { prompt: p, faltava: [] }))')],
  ['rainforest vira chuva', (s) => s.replace("['rain', /(?<![\\p{L}])(?:rain|raining|rainy)(?![\\p{L}])/giu]", "['rain', /rain/giu]")],
  ['sem a idade', (s) => s.replace("const faltaIdade = gente && a.idade && !dizIdade(p, a.idade) ? a.idade : null", 'const faltaIdade = null')],
  ['adulto ao lado não conta', (s) => s.replace('const idades = ADULTO_RE.test(t) ? [] :', 'const idades = false ? [] :')],
  ['a negação não conta ("no rain" chove)', (s) => s.replace('if (NEGACAO_ANTES_RE.test(t.slice(Math.max(0, i - 40), i))) return false', '')],
  ['a mudança de tempo não conta', (s) => s.replace('if (MUDANCA_RE.test(f.texto)) return false', '')],
  ['nome próprio vira clima', (s) => s.replace('if (maiuscula && (!inicioDeFrase || /^\\s+\\p{Lu}/u.test(t.slice(i + palavra.length)))) return false', '')],
  ['roteiro longo recebe atributo', (s) => s.replace('if (!o.ehIdeia && palavras(t) > PEDIDO_CURTO_MAX_PALAVRAS) return null', '')],
  ['dois estados de tempo valem', (s) => s.replace('const clima = unicos.length === 1 && !TEMPO_BOM_RE.test(t) ? unicos[0] : null', 'const clima = unicos.length >= 1 ? unicos[0] : null')],
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
