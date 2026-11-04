// KINEO-SUJEITO-LIMPO-0411 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião sem rede e sem custo, com as falas REAIS dos claims de 01-04/11.
// Defeito (CENA_FORA_DO_PEDIDO, 1º filme): qualquer maiúscula no meio da fala ia para a frente do prompt: "Texas and November clearly visible as the subject of this shot."
// A direção é SUBTRAIR: só sai um único nome próprio limpo e isolado; na dúvida, nada. Venus continua. Mutantes ficam vermelhos.
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
let falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const QUAL = 'lib/cinematic/filmQuality.ts'
const carrega = (mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === QUAL ? mutar(t) : t) })(QUAL)
const FRASE = 'clearly visible as the subject of this shot'
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Fala real → nada pode sair (cliente, o que saía antes)
const LIXO = [
  ['gabriela.bn3 "Gabiê and Achados"', 'Encontre na Gabiê Achados & Variedades!'],
  ['gabriela.bn3 "São" (emoji)', '😍 São peças delicadas, práticas e perfeitas para complementar seus penteados.'],
  ['gabriela.bn3 "São" (quebra de linha)', 'Meninas, olha que lindo esse kit de presilhas! 😍\n\nSão peças delicadas, práticas e perfeitas para complementar seus penteados.'],
  ['historyhideshere "Texas and November"', "Dallas, Texas, November 22, 1963. In bright midday sun, President John F. Kennedy's open-top motorcade rolls slowly through Dealey Plaza as crowds cheer along Elm Street."],
  ['mahrafariha "Northwest and Flight"', 'In 1950, Northwest Flight 2501 vanished over Lake Michigan.'],
  ['enzojimcua "Segunda and Guerra"', '“La Segunda Guerra Mundial terminó en 1945... pero un soldado no se enteró.”'],
  ['hansak "World and War"', 'One man stopped World War 3... by doing nothing.'],
  ['claim real "Flannan and Isles"', 'In 1953, the Flannan Isles Lighthouse keepers vanished without a trace.'],
  ['claim real "Kommander"', 'Attempting to unplug this so-called "Kale Kommander."'],
  ['claim real "German"', 'Then a German-born cartoonist named Thomas Nast brought it back.'],
  ['claim real "Tuesday"', 'So this Tuesday, while millions of Americans line up at the polls, remember: the farthest voting booth floats above the clouds.'],
  ['claim real "November and House"', "In November 2017, voters in Virginia's ninety-fourth House district chose between two candidates."],
  ['claim real alemão "Wagen and Motor"', 'Ein schwarzer Wagen, Motor noch warm, Fahrertür offen.'],
  ['alemão: substantivo comum isolado', 'Kommissarin Emma Berger steht um drei Uhr nachts in einer leeren Tiefgarage.'],
  // as 3 frases que reprovaram a tentativa de reconstruir
  ['the Second World War', 'During the Second World War the city burned.'],
  ['Sexta-feira Santa', 'Na Sexta-feira Santa tudo parou.'],
  // pátrio fora de qualquer lista
  ['the Roman army', 'They feared the Roman army most of all.'],
  ['a Viking ship', 'They found a Viking ship under the ice.'],
  ['Mongol', 'It fell to a Mongol raid.'],
  ['Aztec', 'Gold from the Aztec empire vanished.'],
  // mês e dia em outras línguas
  ['mês pt', 'Tudo mudou em Novembro.'],
  ['dia es', 'Todo cambió el Lunes.'],
  ['mês en isolado', 'It all changed in March.'],
  ['nome, nome', 'It happened in Dallas, Texas.'],
  ['dois nomes limpos nunca viram "X and Y"', 'From Paris, the road ends in Tokyo!'],
]
const Q = carrega()
for (const [n, fala] of LIXO) {
  const s = Q.sujeitosDaFala(fala)
  checa(`${n}: nada sai (${JSON.stringify(s)})`, s.length === 0)
  const p = Q.comSujeitoDaFala('A breathtaking view of the sky', fala, [])
  checa(`${n}: prompt intacto`, p === 'A breathtaking view of the sky')
}

// Controles: tem de continuar saindo
const VENUS = 'On Venus, the year ends before a single day does!'
checa('Venus: "On Venus, ..." continua', igual(Q.sujeitosDaFala(VENUS), ['Venus']))
checa('Venus: entra na frente do fecho', Q.comSujeitoDaFala('A breathtaking view of the stars and galaxy', VENUS, []).startsWith(`Venus ${FRASE}.`))
checa('Venus: "is Venus!" continua', igual(Q.sujeitosDaFala('This planet is Venus!'), ['Venus']))
checa('Venus: "is Venus! ... the Sun." sai só Venus', igual(Q.sujeitosDaFala('This planet is Venus! But only 225 days to orbit the Sun.'), ['Venus']))
checa('cena que já mostra Venus fica igual', Q.comSujeitoDaFala('A close-up of Venus rotating', 'This planet is Venus! But only 225 days to orbit the Sun.', []) === 'A close-up of Venus rotating')
checa('Mars não é confundido com o mês francês', igual(Q.sujeitosDaFala('On Mars, the sunsets are blue.'), ['Mars']))
checa('fim de frase com reticências: "over Siberia..."', igual(Q.sujeitosDaFala('A fireball brighter than the sun exploded over Siberia...'), ['Siberia']))
checa('"In London the Great Fire began": sai só London, nunca Great/Fire', igual(Q.sujeitosDaFala('In London the Great Fire began'), ['London']))
checa('acento e preposição pt: "Na Sicília!"', igual(Q.sujeitosDaFala('Na Sicília, o vulcão acordou.'), ['Sicília']))
checa('quem tem ficha não é repetido', Q.comSujeitoDaFala('A sky', 'On Venus, the year ends.', ['Venus']) === 'A sky')
checa('fala com pronome de gente segue de fora', Q.sujeitosDaFala('On Venus, he saw nothing.').length === 0)

// Preparo único das duas estradas: o defeito some no prompt final, e Venus continua
const st = { anchor: 'x' }
const prep = (fala) => Q.prepararQualidadeDoFilme({ prompts: ['A breathtaking view of the stars and galaxy', 'A wide shot of a calm sea at dusk'], falas: [fala, 'The tide came back.'], contextoOriginal: fala, contextoFiltro: fala, modo: 'documentary_faceless', tagFaceless: true, style: st }).prompts[0]
checa('preparo: Northwest Flight não vira assunto', !prep('In 1950, Northwest Flight 2501 vanished over Lake Michigan.').includes(FRASE))
checa('preparo: Venus vira assunto', prep(VENUS).includes(`Venus ${FRASE}.`))

// Mutantes: cada regra retirada fica vermelha
const roda = (mut) => carrega(mut)
const troca = (de, para) => (t) => { if (!t.includes(de)) throw new Error('mutante não aplicou: ' + de); return t.replace(de, para) }
const MUT = [
  ['dois candidatos voltam', troca("out.size === 1 ? [...out] : []", '[...out].slice(0, 2)'), 'From Paris, the road ends in Tokyo!', (s) => s.length === 2],
  ['maiúscula antes volta a valer', troca("(/^\\p{Lu}/u.test(anterior) && !PREPOSICAO_INICIAL_0411.has(anterior))", 'false'), 'Then Dallas, Texas!', (s) => s.includes('Texas')],
  ['mês volta', troca("DATA_0411.has(m[1].normalize('NFD').replace(/\\p{M}/gu, '').toLowerCase())", 'false'), 'It all changed in March.', (s) => s.includes('March')],
  ['alemão volta', troca(' || ALEMAO_0411.test(t)', ''), 'Kommissarin Emma Berger steht um drei Uhr nachts in einer leeren Tiefgarage.', (s) => s.includes('Tiefgarage')],
  ['quebra de linha volta', troca(" || crua.slice(antes.length).includes('\\n')", ''), 'Eu vi tudo\nSão!', (s) => s.includes('São')],
  ['artigo antes volta', troca('ARTIGO_ANTES_0411.test(anterior) || ', ''), 'It fell to the Mongol.', (s) => s.includes('Mongol')],
]
for (const [n, mut, fala, vermelho] of MUT) {
  const m = roda(mut)
  checa(`mutante "${n}" é pego`, vermelho(m.sujeitosDaFala(fala)))
}

console.log(`${falhas ? '🔴' : '🟢'} sujeito-limpo-0411: ${ok}/${ok + falhas}`)
if (falhas) process.exit(1)
