// RODAR COM TSX (com `node` puro dá ERR_MODULE_NOT_FOUND nos imports .ts): npx tsx scripts/test-cena-fora-do-pedido-1111.mjs
// KINEO-CENA-FORA-DO-PEDIDO-1111 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião do "giant" de coisa que virava personagem.
// Revisor 10/11 23:25 BRT, 1º filme grátis de 15 s (Kling 4 grátis). Prova no banco (SELECT em events: cinematic_submission_claim.response):
//   · 2176bed6 (ursinho, geração 03d002f3): personagem.elenco = [the baby bear, {nome:"the giant", tipo:"criatura", origem:"deterministica"}]; as
//     imagens-chave 2 e 3 levaram "the giant, a small towering giant with a rough weathered face, enormous hands and crude cloth garments" e a
//     folha dele. O roteiro não tem gigante: o escritor de cenas escreveu "a giant carrot" e SEM_NOME_RE leu "a giant" como o ser. → CONSERTADO AQUI.
//   · b23b3e7f (álcool, geração bf8989ad) e 26e1f8b4 (Adão e Eva, geração 40543daf): outras causas (nº de planos; idade da ficha). Fora daqui.
// VOLTA 2 (revisão adversarial 11/11 reprovou a 1ª: a regra "só é o ser se seguido de verbo da lista" derrubava gigante-personagem de verdade).
// Lógica invertida: o padrão é o da BASE (giant = o ser); só é adjetivo colado a uma coisa óbvia (lista fechada). Critério de aceite, todo aqui:
// as entradas da revisora (itens 1–8, os 2 filmes de 15 s e o "lonely giant") IDÊNTICAS à base; o ursinho curado; zero mudança sem "giant".
// A BASE é o arquivo de produção com o recibo desfeito (scripts/test-support/desfaz-cena-fora-do-pedido-1111-fontes.json) — vale antes e depois
// de publicar. Base e mutantes são cópias temporárias importadas do mesmo diretório. Sem rede, sem banco, sem fornecedor.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { elencoDeterministico } from '../lib/cinematic/folhaDePersonagem.ts'
import { elencoDoRoteiro } from '../lib/cinematic/personagemAjuste.ts'
import { elencoDoFilme15 } from '../lib/filmes/filme15Elenco.ts'
import { semCenaForaDoPedido1111 } from './test-support/desfaz-cena-fora-do-pedido-1111.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ', m) } else { fail++; console.log('  FALHA', m) } }
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const FOLHA = 'lib/cinematic/folhaDePersonagem.ts'
const MARCA = 'KINEO-CENA-FORA-DO-PEDIDO-1111'

// ── Os textos reais (cinematic_submission_claim.response: prompt e as 3 descrições de cena, 10/11) ───────────────────────────
const URSINHO = {
  prompt: 'HOOK: [Pexels: colorful garden with huge carrot] A baby bear finds an enormous magical carrot in the garden!\n\nMICRO REWARD 2: [Pexels: bear flying into flowers] The carrot pops out, sending him flying into flowers!\n\nPAYOFF: [Pexels: butterflies flying from carrot] A bunny helps him up, and hundreds of butterflies burst from the carrot!',
  visuals: [
    'A close-up shot of the bear standing in a lush garden, its eyes wide with curiosity as it investigates an enormous, brightly colored carrot partially buried in the soil, surrounded by vibrant green plants and flowers, capturing the whimsical nature of the scene.',
    'A drone shot capturing a vibrant garden scene where a giant carrot is dramatically uprooted from the ground, sending the bear soaring into the air amidst a flurry of colorful flowers blooming around it, emphasizing the wild and magical aspect of the moment.',
    'A tracking shot following a small, friendly bunny as it rushes to help the bear stand up, surrounded by a whirlwind of colorful butterflies that emerge from the giant carrot, creating a visually stunning and joyful climax to the scene.',
  ],
}
const ALCOOL = {
  prompt: "HOOK (0-2s): [Pexels: desert landscape] Did you know this country bans alcohol sales?\n\nMICRO REWARD 1: [Pexels: city street market] In Saudi Arabia, buying alcohol is strictly illegal.\n\nMICRO REWARD 2: [Pexels: police checkpoint] Violators face hefty fines and possible imprisonment.\n\nPAYOFF: [Pexels: desert sunset view] But... expatriates still find ways to obtain it through black markets.",
  visuals: [
    'A vast desert landscape under a clear blue sky, with golden sand dunes stretching into the horizon, bathed in warm sunlight.',
    'A bustling city street market in Saudi Arabia, vendors displaying colorful goods, while a police checkpoint looms in the background, ensuring compliance.',
    'A shadowy figure in the desert, discreetly exchanging a small package under the cover of dusk, with sand dunes in the background.',
  ],
}
const ADAO = {
  prompt: "HOOK (0-2s): [Pexels: animated garden scene] Adam and Eve's story—like you've never heard it.\n\nMICRO REWARD 2: [Pexels: animated snake slithering] The serpent? It could actually speak—confusing Eve in her own language.\n\nPAYOFF: [Pexels: animated angel with flaming sword] The real twist? Their exit wasn't just punishment... it was a new beginning!",
  visuals: [
    'A close-up shot of Adam and Eve standing together in a lush garden, with Eve looking curiously at a serpent coiled around a tree, symbolizing temptation and the pivotal moment in their story.',
    'A sweeping drone shot over a lush, vibrant garden filled with diverse plants and flowers, capturing the essence of paradise where Eve meets the serpentine figure that to her.',
    'A sweeping aerial shot of Adam and Eve walking away from the garden at sunrise, with the sun illuminating their path, symbolizing new beginnings and hope.',
  ],
}
// ── Filmes de 15 s da revisão adversarial (gigante É personagem): têm de sair idênticos à base ───────────────────────────────
const JOAO = {
  prompt: 'Jack trades the family cow for magic beans. Jack climbs the beanstalk into the clouds. Up there, a giant guards a golden goose. Jack grabs the goose and runs.',
  visuals: ['Jack climbing a huge green beanstalk into the clouds.', 'A wide shot of a giant sitting at a huge wooden table inside a stone castle, Jack hiding behind a jug.', 'Jack running with a golden goose while the giant chases him.'],
}
const DAVI = {
  prompt: 'A shepherd boy walks into the valley with only a sling. A giant in bronze armor towers over the army. One stone flies. The giant falls to the ground.',
  visuals: ['A shepherd boy holding a sling in a dusty valley.', 'A giant in bronze armor towers over the soldiers, the shepherd boy small in front of him.', 'The giant falls to the ground as the shepherd boy lowers his sling.'],
}
const SOLITARIO = {
  prompt: 'A lonely giant looks for a friend in the mountains.',
  visuals: ['A lonely giant walks alone across snowy mountains.', 'The giant sits by a frozen lake, looking at his reflection.', 'The giant smiles as a small bird lands on his hand.'],
}
const EGOISTA = {
  prompt: 'The selfish giant builds a wall around his garden. Winter never leaves. One day a small boy climbs the wall, and the giant melts.',
  visuals: ['The selfish giant builds a tall stone wall around a garden.', 'A small boy sits in a tree covered in snow while the giant watches.', 'The giant lifts the small boy into the blossoming tree.'],
}

// ── As entradas da revisão adversarial (itens 1–8): elenco IDÊNTICO ao da base ────────────────────────────────────────────────
const VERBOS = ['roars', 'sits', 'stands', 'eats', 'falls', 'comes', 'goes', 'grabs', 'chases', 'climbs', 'appears', 'emerges', 'looks down', 'lifts', 'carries', 'stomps', 'walks', 'sleeps', 'wakes', 'smiles', 'laughs', 'cries', 'runs', 'jumps', 'hides', 'waits', 'rocks the cradle', 'waves at the village', 'plants a tree', 'leaves the valley']
const REVISORA = [
  ...VERBOS.map((v) => `The giant ${v}.`), ...VERBOS.map((v) => `Suddenly a giant ${v} near the village.`), // 1
  'A giant carrying a lantern walks through the fog.', 'Imagine a giant living next door.', 'A giant wearing crude cloth garments sits by a fire.', 'Wide shot of a giant\nwalking over the hills', // 2
  'A friendly giant helps the villagers rebuild.', 'A sad giant sits on a hill.', 'A shy giant peeks over the wall.', 'The old giant coughs in his cave.', // 3
  'The giant inside the castle sleeps.', 'the giant above the clouds watches the town', 'The giant behind Jack raises a club.', 'The giant quickly hides.', 'The giant only wants a friend.', 'The giant he feared was gentle.', 'The giant cannot fit through the door.', "The giant doesn't see Jack.", "The giant isn't angry.", // 4
  'A lonely giant looks for a friend in the mountains.', // 6
  'The giant bends down and picks up the boy.', 'The giant picks up the cow and smiles.', // 7
  'David faces the giant Goliath.', 'The giant Goliath laughs at David.', 'Andre the Giant enters the ring.', // 8
  'A giant walks across the valley and the ground shakes.', 'Jack climbs the beanstalk and meets a giant in the castle.', 'The giant, angry and hungry, roared at the village.', 'Deep in the hills lives the giant who guards the bridge.',
  'A friendly giant named Tom lifts the house.', 'Nobody in the village had ever seen the giant.', 'Every night a giant sleeps under the old bridge.', 'The giant eats a carrot.', 'A giant holds a giant carrot.', 'The giant and the pumpkin farmer.',
  'The giant carries a tree on his shoulder.', 'A giant, hungry and tired, finds an apple.', 'The giant rocks the cradle.', 'The giant waves goodbye.', 'The tech giant announced record profits.', 'A giant wave hits the fishing boat at night.',
  ...JOAO.visuals, JOAO.prompt, ...DAVI.visuals, DAVI.prompt, ...SOLITARIO.visuals, ...EGOISTA.visuals, EGOISTA.prompt,
]
const SEM_GIGANTE = [ // textos sem a palavra "giant": zero mudança
  ALCOOL.prompt, ...ALCOOL.visuals, ADAO.prompt, ...ADAO.visuals, URSINHO.prompt, URSINHO.visuals[0],
  'A sad Indian boy sits by the window. Ravan rolls his eyes. Ravan: "Not again."', 'A tired commuter waits for the last train.',
  'A little girl hands the key to an elderly man.', 'A ghost flight vanished over the Pacific in 1962.', 'The brave fox crosses the frozen river.',
  'Dino heard a noise under the bed. Dino opened the dinosaur blanket.', 'A young woman opens a bakery in Lisbon and the whole street lines up.',
  'Uma menina encontra uma chave azul no jardim do avô.', 'A dragon sleeps on a pile of gold while a knight tiptoes past.',
  'A street vendor sells fruit while a crowd of shoppers walks by and a police officer watches.',
  'A dragon cake sits on the table.', 'The bear carrot patch is empty.', 'A monster pumpkin wins the fair.', 'The fairy flower opens at dawn.', 'A robot tree blinks in the lab.',
]
const COISA = [ // prova de adjetivo: "giant" colado a uma coisa da lista (com cor/adjetivo da lista no meio) nunca dá o ser
  'A drone shot of a garden where a giant carrot is dramatically uprooted from the ground.', 'colorful butterflies that emerge from the giant carrot',
  'A giant, glowing carrot rises from the soil.', 'A giant and juicy carrot sits on the table.', 'A giant carved pumpkin glows on the porch.', 'The giant orange carrots fill the cart.',
  'The camera reveals a giant-sized pumpkin in the field.', 'A giant mushroom glows in the dark forest.', 'A GIANT CARROT appears in the garden.', 'the giant pumpkins of the county fair',
  'A huge giant carrot rolls down the hill.', 'A giant birthday cake waits in the kitchen.', 'A giant beanstalk grows overnight.',
]

const nomes = (e) => e.map((f) => f.nome)
const temGigante = (e) => e.some((f) => /\bgiant\b/i.test(f.nome) || /towering giant/i.test(f.canonica))
const J = (x) => JSON.stringify(x)
/** O caminho do 15 s (rota: elencoDoFilme15 com o elenco do pedido e os visuais do plano), com o extrator dado. */
const elenco15 = (caso, extrair) => elencoDoFilme15({ elencoDoPedido: extrair(caso.prompt), visuals: caso.visuals, extrair, completar: true }).elenco

/** A bateria inteira: compara o extrator dado com a BASE e confere a cura. Devolve as falhas. */
function bateria(extrair, extrairBase) {
  const falhas = []
  const quer = (c, m) => { if (!c) falhas.push(m) }
  // A. o caso real curado
  quer(!temGigante(extrair(URSINHO.prompt)), 'ursinho: o pedido não tem gigante')
  for (let i = 0; i < 3; i++) quer(!temGigante(extrair(URSINHO.visuals[i])), `ursinho: o visual ${i + 1} não dá "the giant"`)
  const e = elenco15(URSINHO, extrair)
  quer(!temGigante(e) && e.length === 1 && /bear/.test(e[0].nome) && e[0].tipo === 'animal' && e[0].protagonista === true, `ursinho: o elenco do filme de 15 s é só o ursinho (veio ${J(nomes(e))})`)
  // B. gigante-personagem: idêntico à base, ficha por ficha
  for (const t of REVISORA) quer(J(extrair(t)) === J(extrairBase(t)), `revisora: "${t.slice(0, 50).replace(/\n/g, ' ')}" base ${J(nomes(extrairBase(t)))} → ${J(nomes(extrair(t)))}`)
  for (const [nome, caso] of [['João e o pé de feijão', JOAO], ['Davi e Golias', DAVI], ['lonely giant', SOLITARIO], ['gigante egoísta', EGOISTA], ['álcool b23b3e7f', ALCOOL], ['Adão e Eva 26e1f8b4', ADAO]])
    quer(J(elenco15(caso, extrair)) === J(elenco15(caso, extrairBase)), `filme de 15 s ${nome}: base ${J(nomes(elenco15(caso, extrairBase)))} → ${J(nomes(elenco15(caso, extrair)))}`)
  // C. zero mudança em texto sem "giant"
  for (const t of SEM_GIGANTE) quer(J(extrair(t)) === J(extrairBase(t)), `sem giant: "${t.slice(0, 50)}" muda de elenco`)
  // D. giant de coisa nunca dá o ser
  for (const t of COISA) quer(!extrair(t).some((f) => f.nucleo === 'giant'), `coisa: "${t.slice(0, 50)}" não dá o ser gigante`)
  return falhas
}

const raiz = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const atual = lf(readFileSync(resolve(raiz, FOLHA), 'utf8'))
const base = lf(semCenaForaDoPedido1111(atual, FOLHA))
let n = 0
async function comCopia(fonte, fn) {
  const caminho = resolve(raiz, `lib/cinematic/.tmp-cena-fora-do-pedido-${process.pid}-${++n}.ts`)
  writeFileSync(caminho, fonte)
  try { return await fn(await import(pathToFileURL(caminho).href)) } finally { try { unlinkSync(caminho) } catch {} }
}

await comCopia(base, async (modBase) => {
  const B = modBase.elencoDeterministico
  console.log('1. a base (produção com o recibo desfeito) reproduz o defeito')
  ok(!base.includes(MARCA) && base !== atual, 'a base não tem a marca desta entrega')
  const eBase = elenco15(URSINHO, B)
  ok(J(nomes(eBase)) === J(['the baby bear', 'the giant']) && /towering giant with a rough weathered face, enormous hands and crude cloth garments/.test(eBase[1].canonica), `na base o elenco do ursinho é o do claim: ${J(nomes(eBase))}`)
  ok(B('The giant roars.').some((f) => f.nucleo === 'giant') && J(nomes(elenco15(JOAO, B))) === J(['Jack', 'the giant']), 'na base "The giant roars." e João e o pé de feijão têm o gigante (o que a volta 1 derrubava)')

  console.log(`2. produção: ursinho curado; ${REVISORA.length} entradas da revisora + 6 filmes de 15 s idênticos à base; ${SEM_GIGANTE.length} textos sem "giant" idênticos; ${COISA.length} "giant" de coisa`)
  const falhas = bateria(elencoDeterministico, B)
  ok(falhas.length === 0, `bateria verde${falhas.length ? ' — ' + falhas.slice(0, 12).join(' | ') : ''}`)
  const pelaRota = elenco15(URSINHO, elencoDoRoteiro)
  ok(!temGigante(pelaRota) && pelaRota.length === 1 && !pelaRota.some((f) => /rough weathered face|crude cloth garments/.test(f.canonica)), `ursinho pela rota (elencoDoRoteiro → elencoDoFilme15): elenco = ${J(nomes(pelaRota))}`)
  const gigantes = REVISORA.filter((t) => elencoDeterministico(t).some((f) => f.nucleo === 'giant' && /towering giant/.test(f.canonica))).length
  ok(gigantes >= 60, `o gigante-personagem continua com a ficha de gigante em ${gigantes} das entradas da revisora`)

  console.log('3. mutantes (a mesma bateria tem de ficar vermelha)')
  const muta = (de, para) => { if (atual.split(de).length !== 2) throw new Error('mutante: âncora ausente ou repetida: ' + de.slice(0, 60)); return atual.replace(de, () => para) }
  const MUTANTES = [
    ['M1 sem o olhar à frente (= base)', muta('${SER_COMO_ADJETIVO}${GIGANTE_DE_COISA}`', '${SER_COMO_ADJETIVO}`'), /^ursinho|^coisa/],
    ['M2 o olhar à frente vale para qualquer ser (sem o lookbehind de giant)', muta('(?!(?<=\\bgiant)(?:-sized?)?', '(?!(?:-sized?)?'), /^sem giant/],
    ['M3 qualquer palavra depois de giant é coisa (a regra larga)', muta("const COISA_GIGANTE = 'carrot|", "const COISA_GIGANTE = '[a-z]+|carrot|"), /^revisora|^filme de 15 s/],
    ['M4 qualquer palavra no meio (giant … carrot)', muta("const COR_OU_ADJETIVO_DA_COISA = 'orange|", "const COR_OU_ADJETIVO_DA_COISA = '[a-z]+|orange|"), /^revisora: "(?:The giant eats a carrot|A giant holds a giant carrot)/],
    ['M5 sem a vírgula/cor no meio (giant, glowing carrot)', muta('(?:,?\\s+(?:and\\s+)?(?:${COR_OU_ADJETIVO_DA_COISA}))*,?\\s+', '\\s+'), /^coisa: "A giant, glowing carrot/],
  ]
  for (const [nome, fonte, esperado] of MUTANTES) await comCopia(fonte, async (mod) => { const f = bateria(mod.elencoDeterministico, B); ok(f.some((x) => esperado.test(x)), `${nome}: vermelho (${f.length} falha(s))`) })
})

console.log('4. escopo do arquivo')
ok(base.split('\n').filter((l) => !/^const SEM_NOME_RE = /.test(l)).join('\n') === atual.split('\n').filter((l) => !l.includes(MARCA)).join('\n'), 'fora das linhas marcadas o arquivo é a base, byte a byte')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
