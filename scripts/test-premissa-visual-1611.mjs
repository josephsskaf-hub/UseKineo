// KINEO-PREMISSA-VISUAL-1611 (volta 2) — guardião do conserto do revisor de 16/11 (filme 224c4659, 1º filme de cliente, Kling 4 grátis 15 s,
// nota 5, CENA_FORA_DO_PEDIDO): "In this town, nobody had a shadow... until one boy woke up with two." O planejador escreveu a premissa nas
// cenas, mas a frase de luz da CENA 1 de um pedido escrito por cenas virou a luz do filme ("Light: Moonlight shines through the window." na
// frente de todo plano, até o da manhã seguinte) e esses 44 caracteres tiraram do plano do Kling 4 a última oração da ação — a das sombras.
// A volta 1 (54ee8b1d1) tirava a linha "Light:" no compactador e foi REPROVADA: a luz do cliente sumia ou era contradita e a cena fundida
// ficava sem luz. A volta 2 não toca no compactador: a regra fica na FONTE (lib/cinematic/pessoaDoPedido.ts luzDoPedido) — a frase de luz
// narrada dentro de uma cena numerada é daquela cena, não do filme.
// Prova: (1) o texto REAL (pedido + cenas do claim): desligado = byte a byte o que foi ao motor; ligado = a oração da premissa inteira nos
// planos 1 e final; (2) controles de luzDoPedido: pedido sem cenas numeradas, uma cena só, luz como direção ou antes da 1ª cena — ligado ≡
// desligado; (3) os achados da revisão: a luz do cliente NUNCA sai do plano no compactador (nome "Dawn", "morning coffee", "neon-green",
// frase que contradiz a luz, frase terminada em ! ? … ou sem ponto); (4) a cena fundida leva a luz nas duas metades. Sem rede, sem banco.
// Rodar: npx tsx scripts/test-premissa-visual-1611.mjs
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { luzDoPedido, comLuzDoPedido, lugarDoPedido, comLugarDoPedido, lugarDasCenas, LUZ_POR_CENA_1611, luzPorCenaLigada } from '../lib/cinematic/pessoaDoPedido.ts'
import { promptDaCenaKling4, KLING4_ORCAMENTO_DA_CAMADA } from '../lib/cinematic/cenaKling4.ts'
import { promptDaSecao } from '../lib/kling4QuatroPlanos.ts'

let pass = 0, fail = 0
const ok = (c, m, extra) => { if (c) { pass++; console.log('  ok   ', m) } else { fail++; console.log('  FALHA', m, extra ?? '') } }
const n = (s) => Array.from(s).length

// a mesma lib com o interruptor desligado (cópia temporária ao lado da original, para os imports '@/…' resolverem igual)
const aqui = dirname(fileURLToPath(import.meta.url))
const original = resolve(aqui, '../lib/cinematic/pessoaDoPedido.ts')
const copia = resolve(aqui, `../lib/cinematic/_pessoaDoPedido_luz_por_cena_off_${process.pid}.ts`)
const fonte = readFileSync(original, 'utf8')
const LIGADO = "export const LUZ_POR_CENA_1611: 'off' | 'all' = 'all'"
ok(fonte.includes(LIGADO) && luzPorCenaLigada() && LUZ_POR_CENA_1611 === 'all', 'o interruptor está na lib, ligado para todos')
writeFileSync(copia, fonte.replace(LIGADO, LIGADO.replace("= 'all'", "= 'off'")))
let luzAntes, lugarAntes
try { const m = await import(pathToFileURL(copia).href); luzAntes = m.luzDoPedido; lugarAntes = m.lugarDoPedido } finally { unlinkSync(copia) }
ok(!/PREMISSA_VISUAL_1611|classeDaLuz/.test(readFileSync(resolve(aqui, '../lib/cinematic/filmQuality.ts'), 'utf8')), 'o compactador do Kling 4 não tem regra que tire a luz (a volta 1 saiu)')

const STYLE = { look: 'photoreal', suffix: ', same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, energetic, natural, documentary, consistent color grade across all scenes', lookPhrase: 'photorealistic, ultra-detailed' }

// ═══ (1) O CASO REAL — script_written.original_idea e cinematic_submission_claim.response (kling4_trial.scene_plan) do filme 224c4659 ═══
const IDEIA = `Pisanje
IN THIS TOWN, NOBODY HAS A SHADOW
Scene 1 — Hook (0–5 s)
Narrator: “In this town, nobody had a shadow. Until one boy woke up with two.”
Visual: A blocky Roblox boy wakes up in a dark bedroom. Moonlight shines through the window. Two shadows move behind him.
Scene 2 — The discovery (5–15 s)
Narrator: “At first, everyone thought he was special. Then one of his shadows started moving on its own.”
Visual: The boy walks through a small Roblox town. One shadow follows him. The other stays completely still.
Scene 3 — The warning (15–28 s)
Narrator: “That night, a stranger knocked on his door and whispered, ‘Whatever you do, don't turn around.’”
Visual: A mysterious blocky character stands outside the house in heavy rain.
Scene 4 — The twist (28–43 s)
Narrator: “But the boy looked behind him anyway. And for the first time, he saw what had been following everyone in town.”
Visual: Every villager stands motionless under streetlights. Their shadows slowly turn toward the boy.
Scene 5 — The ending (43–55 s)
Narrator: “The next morning, the town was normal again. Except now… nobody could see the boy's shadow.”
Visual: The boy walks away as the camera tilts down to reveal an empty space where his shadow should be.
END TEXT: “PART 2?”`
const FICHA = 'the boy, exactly as the author wrote: "blocky Roblox boy"; appearance anchors: 8-12, short brown, clean-shaven, light skin, wearing gray t-shirt, blue jeans; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing'
const RECORRENTE = 'Recurring characters, identical face, hair and costume in every scene where they appear: the boy is exactly as the author wrote: "blocky Roblox boy"; appearance anchors: 8-12, short brown, clean-shaven, light skin, wearing gray t-shirt, blue jeans; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing.'
const MOLDURA = ' 9:16 vertical framing, subject framed in the upper two-thirds with the lower third clear for captions, smooth camera motion, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, energetic, natural, documentary, consistent color grade across all scenes, characters act naturally within the scene without addressing the viewer, 9:16 vertical framing'
// a tela manda só os 600 primeiros caracteres da ideia (GenerateClient: original_idea: ideia.slice(0, 600)): o pedido que a rota leu
const PEDIDO = IDEIA.slice(0, 600)
// as 3 cenas do claim ANTES da luz e do lugar do pedido (a rota põe a luz e depois o lugar no fim de cada cena)
const BASES = [
  `Film visual medium: photorealistic, ultra-detailed. Medium shot, subject centered and clearly readable, slow push-in. Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. photorealistic, ultra-detailed. In a dimly lit bedroom, a boy stirs awake, two distinct shadows stretching across the floor in the moonlight. ${RECORRENTE}${MOLDURA} The same main character appears in this scene, consistent design: ${FICHA}.`,
  `Film visual medium: photorealistic, ultra-detailed. Close-up on a telling detail of the action, shallow depth of field, gentle rack focus. photorealistic, ultra-detailed. On a small town street, the boy stands in the center, townsfolk gaze at him in awe, while a cloaked stranger whispers ominously from the side. The same main character appears in this scene, consistent design: the stranger, a man in his early thirties, with wavy chestnut hair and high cheekbones. His dark eyes are piercing. He wears a long grey wool coat and a black scarf, adding an air of mystery; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing. ${RECORRENTE}${MOLDURA} The same main character appears in this scene, consistent design: ${FICHA}.`,
  `Film visual medium: photorealistic, ultra-detailed. Clear well-lit shot of the final moment with the subject fully recognizable, slow pull-back. photorealistic, ultra-detailed. A quiet morning scene shows empty streetlights casting no shadows, revealing the boy standing alone, his shadow completely gone. ${RECORRENTE}${MOLDURA} The same main character appears in this scene, consistent design: ${FICHA}.`,
]
// o caminho da rota no filme grátis: luz do pedido, lugar do pedido, camada do Kling 4
const planos = (luz, lugar) => BASES.map((b, i) => promptDaCenaKling4(comLugarDoPedido(comLuzDoPedido(b, luz), lugar), STYLE, i, true))
// o que FOI ao motor (scene_fal_inputs[0].multi_prompt, planos 1 e 4; o "Wide shot." é do plano variado, posto depois desta camada)
const ENVIADO_1 = 'Photoreal film. Wide shot. Light: Moonlight shines through the window. Identity: the boy, exactly as the author wrote: "blocky Roblox boy"; appearance anchors: 8-12, short brown, clean-shaven, light skin, wearing gray t-shirt, blue jeans; a real person filmed in photorealistic live action. In a dimly lit bedroom, a boy stirs awake, two distinct shadows stretching, no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'
const ENVIADO_4 = 'Photoreal film. Light: Moonlight shines through the window. Identity: the boy, exactly as the author wrote: "blocky Roblox boy"; appearance anchors: 8-12, short brown, clean-shaven, light skin, wearing gray t-shirt, blue jeans; a real person filmed in photorealistic live action. A quiet morning scene shows empty streetlights casting no shadows, no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'

console.log('\n(1) o caso real, filme 224c4659')
ok(/Scene 2 — /.test(PEDIDO) && !/outside the house/.test(PEDIDO), 'o pedido que a rota leu vai até a cena 2 (a casa da cena 3 ficou de fora)')
ok(luzAntes(PEDIDO) === 'Moonlight shines through the window' && lugarAntes(PEDIDO) === 'a dark bedroom', 'desligado: a luz e o lugar da cena 1 eram os do filme', JSON.stringify([luzAntes(PEDIDO), lugarAntes(PEDIDO)]))
const antes = planos(luzAntes(PEDIDO), lugarAntes(PEDIDO))
ok(antes[0] === ENVIADO_1.replace('Wide shot. ', ''), 'desligado, plano 1: byte a byte o que foi ao motor (premissa cortada em "two distinct shadows stretching,")', antes[0])
ok(antes[2] === ENVIADO_4, 'desligado, plano final: byte a byte o que foi ao motor (sem "his shadow completely gone")', antes[2])
ok(luzDoPedido(PEDIDO) === null && lugarDoPedido(PEDIDO) === null, 'ligado: a luz e o lugar da cena 1 não viram os do filme', JSON.stringify([luzDoPedido(PEDIDO), lugarDoPedido(PEDIDO)]))
ok(luzDoPedido(IDEIA) === null && lugarDoPedido(IDEIA) === null, 'ligado, pedido inteiro (1.247 caracteres): idem')
ok(lugarDasCenas(['dark bedroom moonlight', 'small town street, rainy doorstep', 'empty streetlights'], PEDIDO) === null, 'e o lugar do filme pelas cenas também é nenhum (quarto e rua): cada plano fica com o lugar que o planejador escreveu')
const agora = planos(luzDoPedido(PEDIDO), lugarDoPedido(PEDIDO))
ok(agora[0].includes('a boy stirs awake, two distinct shadows stretching across the floor in the moonlight.'), 'plano 1: as duas sombras, a oração inteira', agora[0])
ok(agora[2].includes('revealing the boy standing alone, his shadow completely gone.'), 'plano final: o menino sozinho, a sombra sumiu', agora[2])
ok(!/Moonlight shines/.test(agora[2]) && agora.every((p) => !/Place: a dark bedroom/.test(p)), 'plano final ("A quiet morning…"): sem a lua da cena 1; nenhum plano com o quarto da cena 1 imposto')
for (const [nome, p] of [['plano 1', agora[0]], ['plano do meio', agora[1]], ['plano final', agora[2]]]) {
  ok(p.startsWith('Photoreal film. ') && p.endsWith(' Mouth closed, no speaking.') && /no readable text/.test(p), `${nome}: meio, proteção de texto e boca fechada continuam`)
  ok(n(p) <= KLING4_ORCAMENTO_DA_CAMADA, `${nome}: dentro do orçamento da camada (${n(p)} ≤ ${KLING4_ORCAMENTO_DA_CAMADA})`)
}
for (const i of [0, 2]) ok(agora[i].includes('wearing gray t-shirt, blue jeans; a real person filmed in photorealistic live action.'), `plano ${i === 0 ? '1' : 'final'}: a ficha do menino continua inteira, antes da ação`)
ok(agora[1].includes('the boy stands in the center') && agora[1].includes('a cloaked stranger whispers ominously from the side'), 'plano do meio: a ação inteira, como antes')

// ═══ (2) CONTROLES de luzDoPedido — só a luz narrada DENTRO de cena numerada (2+ cenas) muda ═══
console.log('\n(2) controles: ligado ≡ desligado')
const R657 = 'A beautiful 26-year-old South African woman with long neat black braids, a cream blouse and black trousers sits alone at a stylish Johannesburg coffee shop. Natural sunlight enters through large glass windows. She checks her phone and smiles.'
const CONTROLES = {
  'pedido corrido (657ad797): a frase de luz é a luz do filme': [R657, 'Natural sunlight enters through large glass windows'],
  'uma cena numerada só': ['Scene 1: A boy wakes up in a dark bedroom. Moonlight shines through the window. He looks at the floor.', 'Moonlight shines through the window'],
  'cenas numeradas com a luz ANTES da 1ª cena': ['Moonlight shines through the window in every shot.\nScene 1: A boy wakes up.\nScene 2: He walks to the door.', 'Moonlight shines through the window in every shot'],
  'cenas numeradas com a luz como direção ("Lighting: …")': ['Scene 1: A boy wakes up.\nScene 2: He walks to the door.\nLighting: soft moonlight through the window.', 'Lighting: soft moonlight through the window'],
  'cenas numeradas com direção de filmagem ("Use …")': ['Scene 1: A woman opens her bakery.\nScene 2: She serves the first customer.\nUse soft natural daylight, realistic skin texture.', 'soft natural daylight'],
  'cenas numeradas sem frase de luz': ['Scene 1: A boy wakes up in a dark bedroom.\nScene 2: He walks through a small town.', null],
  'luz em frase de ação, sem cenas': ['At sunset, the boy finds the box.', null],
  'dia numa frase, noite em outra': ['In the morning sunlight, Ana opens her bakery. At night, she counts the money alone.', null],
  '"scene" no meio da frase não é cena numerada': ['The opening scene 1 minute long shows a harbor. Soft daylight fills the room. In scene 2 minutes later a man waves.', 'Soft daylight fills the room'],
  'pedido sem luz': ['The history of the Roman Empire.', null],
}
for (const [nome, [pedido, esperado]] of Object.entries(CONTROLES)) ok(luzDoPedido(pedido) === luzAntes(pedido) && luzDoPedido(pedido) === esperado, nome, `${JSON.stringify(luzDoPedido(pedido))} × ${JSON.stringify(luzAntes(pedido))}`)
const LUGARES = {
  'pedido corrido (657ad797): o lugar é o do filme': [R657, 'a stylish Johannesburg coffee shop'],
  'uma cena numerada só': ['Scene 1: A boy wakes up in a dark bedroom. He looks at the floor.', 'a dark bedroom'],
  'cenas numeradas, TODAS citam o mesmo lugar': ['Scene 1: A boy wakes up in a dark bedroom.\nScene 2: He hides under the bed in the bedroom.', 'a dark bedroom'],
  'cenas numeradas, lugar dito antes da 1ª cena e em todas': ['Everything happens in a dark bedroom.\nScene 1: A boy wakes up in the bedroom.\nScene 2: He stares at the bedroom wall.', 'a dark bedroom'],
  'cenas numeradas, dois lugares': ['Scene 1: A boy wakes up in a dark bedroom.\nScene 2: He runs to the beach.', null],
  'história com dois lugares, sem cenas': ['The boy goes to school, then to the beach.', null],
}
for (const [nome, [pedido, esperado]] of Object.entries(LUGARES)) ok(lugarDoPedido(pedido) === lugarAntes(pedido) && lugarDoPedido(pedido) === esperado, `lugar · ${nome}`, `${JSON.stringify(lugarDoPedido(pedido))} × ${JSON.stringify(lugarAntes(pedido))}`)
const SO_NA_1 = 'Scene 1: A boy wakes up in a dark bedroom.\nScene 2: He walks through a small town.'
ok(lugarAntes(SO_NA_1) === 'a dark bedroom' && lugarDoPedido(SO_NA_1) === null, 'lugar · citado só na cena 1 de duas: era o do filme, agora é da cena', JSON.stringify(lugarDoPedido(SO_NA_1)))
// o que muda, além do caso real: a luz de uma cena numerada continua contando para o conflito de luzes
const DUAS = 'Scene 1: A boy wakes up. Moonlight shines through the window.\nScene 2: He walks to school. Bright sunlight fills the street.'
ok(luzDoPedido(DUAS) === null && luzAntes(DUAS) === null, 'duas cenas, duas luzes: nenhuma é a do filme (antes e agora)')
const COM_DIRECAO = 'Lighting: soft natural daylight.\nScene 1: A boy wakes up. Moonlight shines through the window.\nScene 2: He walks to school.'
ok(luzDoPedido(COM_DIRECAO) === null, 'direção de dia + cena com lua: a casa não escolhe (a luz da cena conta para o conflito)', JSON.stringify(luzDoPedido(COM_DIRECAO)))

// ═══ (3) OS ACHADOS DA REVISÃO — no compactador, a luz que o cliente pediu nunca sai do plano ═══
console.log('\n(3) a luz do cliente fica no plano (achados 2, 3 e 4 da revisão da volta 1)')
const FICHA_657 = 'a beautiful 26-year-old South African woman, with warm brown skin, expressive dark brown eyes, long neat black braids, wearing a cream blouse, black trousers and small gold earrings; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing'
const SOL = 'Natural sunlight enters through large glass windows', LUA = 'Moonlight shines through the window'
const cenaCom = (acao, luz) => promptDaCenaKling4(comLuzDoPedido(`Film visual medium: photorealistic, ultra-detailed. ${acao}${MOLDURA} The same main character appears in this scene, consistent design: ${FICHA_657}.`, luz), STYLE, 1, true)
const ACHADOS = [
  ['nome próprio "Dawn" não é luz', 'Dawn lifts the antique silver locket from the velvet box on the counter, turning it slowly between her fingers as her eyes widen.', SOL],
  ['"morning coffee" não é luz', 'She sets down her morning coffee beside an unopened bank statement, hesitates, then tears the envelope open with trembling hands.', SOL],
  ['"neon-green" é cor, não luz', 'She zips up her neon-green rain jacket by the door, glances back at the empty table, and pushes out into the busy street.', SOL],
  ['frase que contradiz a luz pedida (noite × sol)', 'She steps out of a taxi at night in front of the coffee shop, pauses under the awning, and looks up at the dark windows above.', SOL],
  ['frase que contradiz a luz pedida (pôr do sol × lua)', 'At sunset, she walks along the empty pier with her shoes in one hand, stopping where the boards end to watch the water below.', LUA],
  ['frase com a mesma luz pedida (repete)', 'In the moonlight, she walks along the empty pier with her shoes in one hand, stopping where the boards end to watch the water below.', LUA],
  ['1ª frase terminada em "!"', 'She tears the envelope open in the morning light and gasps at the number printed inside, her free hand flying up to her mouth!', SOL],
  ['1ª frase terminada em "?"', 'Who left the antique silver locket on her table at dawn, wrapped in brown paper and tied with a faded red ribbon from years ago?', SOL],
  ['1ª frase terminada em "…"', 'She turns the antique silver locket over in the morning light, reads the tiny engraving on the back, and slowly begins to smile…', SOL],
  ['1ª frase sem ponto final', 'She turns the antique silver locket over at night, reads the tiny engraving on the back, and slowly begins to smile', SOL],
]
for (const [nome, acao, luz] of ACHADOS) {
  const p = cenaCom(acao, luz)
  ok(p.includes(`Light: ${luz}.`) && /long neat black braids/.test(p) && /cream blouse/.test(p) && n(p) <= KLING4_ORCAMENTO_DA_CAMADA && p.endsWith(' Mouth closed, no speaking.'), nome, p)
}

// ═══ (4) A CENA FUNDIDA — as duas metades leem "Light:" do plano compactado e continuam com ela (achado 1) ═══
console.log('\n(4) a cena fundida não perde a luz')
const planoFundido = cenaCom('She steps out of a taxi at night in front of the coffee shop, pauses under the awning, and looks up at the dark windows above.', SOL)
const SECOES = [{ pexelsQuery: 'taxi door city street', voiceover: 'She arrived with nothing but a phone number.' }, { pexelsQuery: 'coffee shop window', voiceover: 'Nobody was waiting for her.' }]
for (const [i, s] of SECOES.entries()) for (const objetoConcreto of [true, false]) {
  const metade = promptDaSecao(planoFundido, s, { objetoConcreto })
  ok(metade.includes(`Light: ${SOL}.`) && /long neat black braids/.test(metade), `metade ${i + 1} (${objetoConcreto ? 'plano variado' : 'fala'}): com a luz do cliente e a ficha`, metade)
}
// no filme do caso (pedido por cenas, sem luz do filme) o lugar e a ficha seguem nas metades; nenhuma luz de outra cena entra
const metadeDoCaso = promptDaSecao(agora[1], { pexelsQuery: 'rainy doorstep', voiceover: 'That night, a stranger whispered, "Don\'t turn around."' }, { objetoConcreto: true })
ok(!/Light:/.test(metadeDoCaso) && /Identity: the stranger/.test(metadeDoCaso) && /rainy doorstep/.test(metadeDoCaso), 'filme do caso: a metade "rainy doorstep" não recebe a lua da janela do quarto', metadeDoCaso)

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
