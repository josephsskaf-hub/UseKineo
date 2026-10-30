// KINEO-REVISOR-RESTO-3010 — guardião sem rede com os textos reais da revisão de 30/10:
// (a) "Kali and Kameron are ready to play… toy plane… play table" saía com uma mulher adulta e sem a Kali;
// (b) Tsutomu Yamaguchi (Hiroshima/Nagasaki, 1945) saía galã ocidental de cabelo castanho.
import { personagensNomeados, historiaInfantil, epocaDaHistoria, povoDaHistoria } from '../lib/cinematic/elencoEpoca'

let ok = 0, falhas = 0
const check = (nome: string, cond: boolean) => { if (cond) { ok++; console.log(`ok   ${ok + falhas} ${nome}`) } else { falhas++; console.log(`FAIL ${ok + falhas} ${nome}`) } }

const K = `Kali and Kameron are ready to play!\n\nKali swoops her toy plane high above the play table.\n\nKameron points to the toy boat bobbing with a friendly toot-toot!\n\nWhat will they choose next? The boat or the train... stay tuned for their guessing game!`
const infantil = historiaInfantil(K, K)
const kids = personagensNomeados(K, null, infantil)
check('brinquedo e mesa de brincar = história de criança', infantil)
check('Kali e Kameron entram no elenco', ['Kali', 'Kameron'].every((n) => kids.some((p) => p.nome === n)))
check('nenhum dos dois vira adulto', kids.every((p) => /about nine years old/.test(p.descricao) && !/thirties|woman|man\b/.test(p.descricao)))
check('"toy company" sem brincadeira não vira conto infantil', !historiaInfantil('The toy company reported record profits.', 'The toy company reported record profits.'))

const Y = `In August 1945, Tsutomu Yamaguchi was in Hiroshima on a business trip when the first atomic bomb exploded. Badly burned, he returned home to Nagasaki. Three days later, his boss refused to believe him — and then a second flash filled the sky.`
const y = personagensNomeados(Y, epocaDaHistoria(Y))[0]
check('Yamaguchi é japonês', /a Japanese man/.test(y?.descricao ?? ''))
check('cabelo preto liso, não castanho', /short straight black hair/.test(y?.descricao ?? '') && !/brown hair/.test(y?.descricao ?? ''))
check('roupa da década segue valendo', /period-accurate 1940s clothing/.test(y?.descricao ?? ''))
check('soldado americano em Hiroshima: sem povo (ambíguo)', povoDaHistoria('American soldiers arrived in Hiroshima in 1945.') === null)
check('dois povos no texto: sem povo', povoDaHistoria('A trader sailed from Tokyo to Shanghai.') === null)
check('história sem lugar: sem povo', povoDaHistoria('James opened the door and froze.') === null)

console.log(`${falhas ? '🔴' : '🟢'} revisor-resto-3010: ${ok}/${ok + falhas}`)
if (falhas) process.exit(1)
