// KINEO-SERES-PERSONIFICADOS-3010 — guardião sem rede: legume/fruta que fala é o próprio legume com rosto, nunca gente.
// Caso real 30/10 (nikolmishukov, IL): "The Secret Lives of Vegetables" saiu com casais humanos no supermercado.
import { nomesPersonificados, historiaDeSeresPersonificados, especieDoNome } from '../lib/cinematic/seresFieis'
import { personagensNomeados } from '../lib/cinematic/elencoEpoca'
import { elencoDeterministico } from '../lib/cinematic/folhaDePersonagem'

let ok = 0, falhas = 0
const check = (nome: string, cond: boolean) => { if (cond) { ok++; console.log(`ok   ${ok + falhas} ${nome}`) } else { falhas++; console.log(`FAIL ${ok + falhas} ${nome}`) } }

const VEG = `The Secret Lives of Vegetables\n\nThe supermarket lights turn off. The camera moves toward the vegetable aisle. Suddenly, Broccoli opens his eyes.\n\nNarrator: "Everyone thinks the supermarket sleeps at night... but they have NO idea what really happens here."\n\nBroccoli looks angrily at Avocado, who is sitting on a luxurious VIP shelf.\n\nBroccoli: "I've been here for THREE WEEKS! Why does HE get the VIP shelf while I'm stuck next to cabbage?!"\n\nAvocado slowly turns around, wearing sunglasses.\n\nBanana throws his employee badge onto the floor.\n\nBanana: "I'M DONE! I QUIT!"\n\nTomato looks around, then whispers to Broccoli and Banana.`
const HUMANO = /\b(?:a man|a woman|a boy|a girl|in his thirties|in her thirties|in their|hair)\b/i

const nomeados = personagensNomeados(VEG)
check('o elenco do texto real tem Broccoli', nomeados.some((p) => p.nome === 'Broccoli'))
check('nenhum vegetal nomeado vira humano', nomeados.every((p) => p.tipo !== 'humano' && !HUMANO.test(p.descricao)))
check('Broccoli é um brócolis com rosto', /anthropomorphic broccoli character/.test(nomeados.find((p) => p.nome === 'Broccoli')?.descricao ?? ''))
const fichas = elencoDeterministico(VEG)
check('a folha de personagem também não inventa gente', fichas.length > 0 && fichas.every((f) => f.tipo === 'criatura' && !HUMANO.test(f.canonica)))
check('nomesPersonificados acha os 4', ['broccoli', 'avocado', 'banana', 'tomato'].every((n) => nomesPersonificados(VEG).has(n)))

// falsos positivos: nome de gente, marca e apelido não viram comida
check('"Apple announced" sem cozinha não é maçã', !historiaDeSeresPersonificados('Apple announced a new phone today. Apple says sales grew.'))
check('Olive (menina) não está na lista', especieDoNome('Olive') === null && especieDoNome('Pepper') === null && especieDoNome('Mango') === null)
const MARIA = 'Maria opens the fridge. Maria looks at the empty kitchen and sighs.'
check('história de gente na cozinha segue humana', personagensNomeados(MARIA).every((p) => p.tipo === 'humano'))
check('um legume só, na cozinha, agindo, vira personagem', historiaDeSeresPersonificados('In the kitchen, Carrot jumps off the plate and runs.'))
check('um legume só, sem cenário de comida, não vira', !historiaDeSeresPersonificados('Carrot is a small town in the north.'))

console.log(`${falhas ? '🔴' : '🟢'} seres-personificados-3010: ${ok}/${ok + falhas}`)
if (falhas) process.exit(1)
