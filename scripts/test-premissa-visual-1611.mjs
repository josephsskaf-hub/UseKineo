// KINEO-PREMISSA-VISUAL-1611 — guardião do conserto do revisor de 16/11 (filme 224c4659, 1º filme de cliente, Kling 4 grátis 15 s, nota 5,
// CENA_FORA_DO_PEDIDO): "In this town, nobody had a shadow... until one boy woke up with two." O planejador escreveu a premissa nas cenas, mas
// o corte do plano do Kling 4 (lib/cinematic/filmQuality.ts promptCurtoDoFilmeKling4, ramo da ficha sem elenco) tirou a última oração da ação
// — a das sombras — e deixou "Light: Moonlight shines through the window." na frente de todo plano, até o da manhã seguinte.
// Prova: (1) o texto REAL do claim: desligado = byte a byte o que foi ao motor; ligado = a oração da premissa inteira nos planos 1 e final,
// com a ficha inteira, a proteção de texto e dentro do orçamento; (2) controles: ação que já cabia, ação sem luz própria (a luz do pedido é a
// única), elenco nomeado, sem ficha, ação que não cabe nem sem a luz — ligado ≡ desligado, no filme grátis e no pago; (3) o lugar não é
// tocado por esta regra. Sem rede, sem banco.
// Rodar: npx tsx scripts/test-premissa-visual-1611.mjs
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PREMISSA_VISUAL_1611, premissaVisualLigada } from '../lib/cinematic/filmQuality.ts'
import { promptDaCenaKling4, promptDaCenaKling4Com, KLING4_ORCAMENTO_DA_CAMADA } from '../lib/cinematic/cenaKling4.ts'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ', m) } else { fail++; console.log('  FALHA', m) } }
const n = (s) => Array.from(s).length

// a mesma lib com o interruptor desligado (cópia temporária ao lado da original, para os imports '@/…' resolverem igual)
const aqui = dirname(fileURLToPath(import.meta.url))
const original = resolve(aqui, '../lib/cinematic/filmQuality.ts')
const copia = resolve(aqui, `../lib/cinematic/_filmQuality_premissa_off_${process.pid}.ts`)
const fonte = readFileSync(original, 'utf8')
const LIGADO = "export const PREMISSA_VISUAL_1611: 'off' | 'all' = 'all'"
ok(fonte.includes(LIGADO), 'o interruptor está na lib, ligado')
writeFileSync(copia, fonte.replace(LIGADO, LIGADO.replace("= 'all'", "= 'off'")))
let desligado
try { desligado = (await import(pathToFileURL(copia).href)).promptCurtoDoFilmeKling4 } finally { unlinkSync(copia) }

const STYLE = { look: 'photoreal', suffix: ', same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, energetic, natural, documentary, consistent color grade across all scenes', lookPhrase: 'photorealistic, ultra-detailed' }
// a camada inteira da rota (sem moldura, sem o eixo do filme grátis, corte, eixo se couber), com a lib ligada e com a desligada
const ligadoNaRota = (p, i, gratis = true) => promptDaCenaKling4(p, STYLE, i, gratis)
const desligadoNaRota = (p, i, gratis = true) => promptDaCenaKling4Com(desligado, p, STYLE, i, gratis)

// ═══ (1) O CASO REAL — cinematic_submission_claim.response.kling4_trial.scene_plan do filme 224c4659 (16/11 16:29 UTC) ═══
const FICHA = 'the boy, exactly as the author wrote: "blocky Roblox boy"; appearance anchors: 8-12, short brown, clean-shaven, light skin, wearing gray t-shirt, blue jeans; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing'
const RECORRENTE = 'Recurring characters, identical face, hair and costume in every scene where they appear: the boy is exactly as the author wrote: "blocky Roblox boy"; appearance anchors: 8-12, short brown, clean-shaven, light skin, wearing gray t-shirt, blue jeans; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing.'
const MOLDURA = ' 9:16 vertical framing, subject framed in the upper two-thirds with the lower third clear for captions, smooth camera motion, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, energetic, natural, documentary, consistent color grade across all scenes, characters act naturally within the scene without addressing the viewer, 9:16 vertical framing'
const CAUDA = `${MOLDURA} The same main character appears in this scene, consistent design: ${FICHA}. Lighting as the customer asked: Moonlight shines through the window. Setting as the customer asked: a dark bedroom.`
const CENAS = [
  `Film visual medium: photorealistic, ultra-detailed. Medium shot, subject centered and clearly readable, slow push-in. Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. photorealistic, ultra-detailed. In a dimly lit bedroom, a boy stirs awake, two distinct shadows stretching across the floor in the moonlight. ${RECORRENTE}${CAUDA}`,
  `Film visual medium: photorealistic, ultra-detailed. Close-up on a telling detail of the action, shallow depth of field, gentle rack focus. photorealistic, ultra-detailed. On a small town street, the boy stands in the center, townsfolk gaze at him in awe, while a cloaked stranger whispers ominously from the side. The same main character appears in this scene, consistent design: the stranger, a man in his early thirties, with wavy chestnut hair and high cheekbones. His dark eyes are piercing. He wears a long grey wool coat and a black scarf, adding an air of mystery; a real person filmed in photorealistic live action, natural skin texture and real fabric clothing. ${RECORRENTE}${CAUDA}`,
  `Film visual medium: photorealistic, ultra-detailed. Clear well-lit shot of the final moment with the subject fully recognizable, slow pull-back. photorealistic, ultra-detailed. A quiet morning scene shows empty streetlights casting no shadows, revealing the boy standing alone, his shadow completely gone. ${RECORRENTE}${CAUDA}`,
]
// o que FOI ao motor (scene_fal_inputs[0].multi_prompt, planos 1 e 4; o "Wide shot." é do plano variado, posto depois desta camada)
const ENVIADO_1 = 'Photoreal film. Wide shot. Light: Moonlight shines through the window. Identity: the boy, exactly as the author wrote: "blocky Roblox boy"; appearance anchors: 8-12, short brown, clean-shaven, light skin, wearing gray t-shirt, blue jeans; a real person filmed in photorealistic live action. In a dimly lit bedroom, a boy stirs awake, two distinct shadows stretching, no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'
const ENVIADO_4 = 'Photoreal film. Light: Moonlight shines through the window. Identity: the boy, exactly as the author wrote: "blocky Roblox boy"; appearance anchors: 8-12, short brown, clean-shaven, light skin, wearing gray t-shirt, blue jeans; a real person filmed in photorealistic live action. A quiet morning scene shows empty streetlights casting no shadows, no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'

console.log('\n(1) o caso real, filme 224c4659')
ok(desligadoNaRota(CENAS[0], 0) === ENVIADO_1.replace('Wide shot. ', ''), 'desligado, plano 1: byte a byte o que foi ao motor (premissa cortada em "two distinct shadows stretching,")')
ok(desligadoNaRota(CENAS[2], 2) === ENVIADO_4, 'desligado, plano final: byte a byte o que foi ao motor (sem "his shadow completely gone")')
ok(!/his shadow completely gone/.test(ENVIADO_4) && !/across the floor/.test(ENVIADO_1), 'o defeito: a oração da premissa não foi ao motor')

const p1 = ligadoNaRota(CENAS[0], 0), p2 = ligadoNaRota(CENAS[1], 1), p3 = ligadoNaRota(CENAS[2], 2)
ok(premissaVisualLigada() && PREMISSA_VISUAL_1611 === 'all', 'ligado para todos')
ok(p1.includes('a boy stirs awake, two distinct shadows stretching across the floor in the moonlight'), 'plano 1: as duas sombras, a oração inteira')
ok(p3.includes('revealing the boy standing alone, his shadow completely gone'), 'plano final: o menino sozinho, a sombra sumiu')
for (const [nome, p] of [['plano 1', p1], ['plano final', p3]]) {
  ok(p.includes('wearing gray t-shirt, blue jeans; a real person filmed in photorealistic live action.'), `${nome}: a ficha do menino continua inteira, antes da ação`)
  ok(p.endsWith(', no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'), `${nome}: a proteção de texto e a boca fechada continuam`)
  ok(n(p) <= KLING4_ORCAMENTO_DA_CAMADA, `${nome}: dentro do orçamento da camada (${n(p)} ≤ ${KLING4_ORCAMENTO_DA_CAMADA})`)
  ok(!/Recurring characters|\.\s*,/.test(p), `${nome}: sem pedaço da frase seguinte nem pontuação solta`)
  ok(p.startsWith('Photoreal film. Identity: the boy'), `${nome}: o meio na frente; a luz do pedido cedeu à ação`)
}
ok(!/Moonlight/.test(p3), 'plano final ("A quiet morning…"): não leva mais a luz da lua da cena 1')
ok(p2 === desligadoNaRota(CENAS[1], 1) && p2.includes('Light: Moonlight shines through the window.'), 'plano do meio (a ação já cabia): igual ao de antes, com lugar e luz')

// ═══ (2) CONTROLES — fora do caso (ação longa COM luz própria que só cabe sem a linha da luz), nada muda ═══
console.log('\n(2) controles: ligado ≡ desligado')
const CONTROLES = {
  'ficha curta, ação curta, luz e lugar (cabe tudo)': `Film visual medium: photorealistic, ultra-detailed. A woman sips coffee by the window, smiling at her phone.${MOLDURA} The same main character appears in this scene, consistent design: a young woman with long braids, cream blouse and black trousers. Lighting as the customer asked: soft natural daylight. Setting as the customer asked: a stylish coffee shop.`,
  'ficha longa do cliente, ação curta com luz própria (já cabe)': `Film visual medium: photorealistic, ultra-detailed. A boy opens a small wooden box in the moonlight.${MOLDURA} The same main character appears in this scene, consistent design: ${FICHA}. Lighting as the customer asked: Moonlight shines through the window.`,
  'ação longa SEM luz própria: a luz do pedido é a única e fica': `Film visual medium: photorealistic, ultra-detailed. A quiet scene shows empty benches along the river path, revealing the boy standing alone, his kite completely gone.${MOLDURA} The same main character appears in this scene, consistent design: ${FICHA}. Lighting as the customer asked: Moonlight shines through the window.`,
  'ação com luz própria que não cabe nem sem a linha da luz': `Film visual medium: photorealistic, ultra-detailed. In a dimly lit bedroom a boy slowly stirs awake under a heavy quilt while two distinct long shadows stretch from his small body across the wooden floor and climb the far wall behind the wardrobe in the cold blue moonlight of the winter night as the curtains move.${MOLDURA} The same main character appears in this scene, consistent design: ${FICHA}. Lighting as the customer asked: Moonlight shines through the window. Setting as the customer asked: a dark bedroom.`,
  'sem ficha, sem elenco (objeto)': `Film visual medium: photorealistic, ultra-detailed. A close-up of the bamboo lid being twisted tight on the glass bottle in the morning sunlight, followed by a hand smoothly placing the bottle into a stylish bag.${MOLDURA} Lighting as the customer asked: soft natural daylight. Setting as the customer asked: a bright kitchen.`,
  'elenco nomeado (outro ramo do corte)': `Film visual medium: photorealistic, ultra-detailed. Named characters in this shot: Luca, a boy of ten with curly black hair, red sweater, corduroy trousers and worn leather boots, carrying a heavy cardboard box up the stairs; Nonna, an elderly woman with a grey bun, floral apron over a dark dress and round glasses — clearly visible in frame. Luca carries a heavy box up a narrow stairwell at night while Nonna watches from the doorway, the hallway crowded with moving boxes and old furniture.${MOLDURA} Lighting as the customer asked: Moonlight shines through the window. Setting as the customer asked: a dark bedroom.`,
  'sem proteção de texto': 'Film visual medium: photorealistic, ultra-detailed. A fishing boat rocks on grey water at dawn, gulls circling overhead. The same main character appears in this scene, consistent design: an old fisherman with a white beard and a yellow raincoat. Lighting as the customer asked: Moonlight shines through the window.',
}
for (const [nome, p] of Object.entries(CONTROLES)) for (const gratis of [true, false]) ok(ligadoNaRota(p, 1, gratis) === desligadoNaRota(p, 1, gratis), `${nome} (${gratis ? 'grátis' : 'pago'})`)
const semLuzPropria = ligadoNaRota(CONTROLES['ação longa SEM luz própria: a luz do pedido é a única e fica'], 1)
ok(semLuzPropria.includes('Light: Moonlight shines through the window.') && !semLuzPropria.includes('his kite completely gone'), 'ação sem luz própria: a linha "Light:" continua (o corte é o de antes)')

// ═══ (3) O LUGAR — esta regra não mexe nele ═══
console.log('\n(3) o lugar segue a regra dele')
ok(!p1.includes('Place:') && !desligadoNaRota(CENAS[0], 0).includes('Place:'), 'plano 1: o lugar já cedia antes (regra do lugar) e continua igual')
ok(p2.includes('Place: a dark bedroom.'), 'plano do meio: o lugar fica como estava')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
