// KINEO-CITADO-NAO-AGE-0311 [TRAVA 8.2 — fundador 03/11: "já pode arrumar"] — guardião sem rede e sem custo, com o roteiro REAL.
// Caso: historyhideshere, 03/11, filme cd0a0700, generation 4704e3f6: "A mystery woman filmed Kennedy's assassination…" deu ficha só a "Kennedy, a woman…";
// a camada de época pôs "F. Kennedy, a woman … sandy-blond hair in two braids" na cena 1 (só a câmera) e "Investigators, a woman … ponytail" na cena 5.
// Prova nas duas camadas (ficha e época) e no preparo único das duas estradas; mutantes ficam vermelhos. Nome que age continua com ficha.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
let falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }

const FOLHA = 'lib/cinematic/folhaDePersonagem.ts'
const EPOCA = 'lib/cinematic/elencoEpoca.ts'
const QUAL = 'lib/cinematic/filmQuality.ts'
const AJUSTE = 'lib/cinematic/personagemAjuste.ts'
const carrega = (arq, alvo = null, mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === alvo ? mutar(t) : t) })(arq)

const ROTEIRO = `HOOK (0-2s): [Pexels: vintage movie camera] A mystery woman filmed Kennedy's assassination — but vanished forever.

MICRO REWARD 1: [Pexels: 1960s Dallas street] Dallas, Texas, November 22, 1963. In bright midday sun, President John F. Kennedy's open-top motorcade rolls slowly through Dealey Plaza as crowds cheer along Elm Street.

MICRO REWARD 2: [Pexels: woman with headscarf filming] Watching from the curb stands a woman in a long coat, a headscarf tied beneath her chin, holding a movie camera to her face. As shots ring out and the crowd scatters in panic, she keeps filming.

MICRO REWARD 3: [Pexels: Zapruder film footage] She appears in the famous Zapruder film and other footage of that day — one of the closest witnesses to the assassination, calmly recording it from mere feet away.

ESCALATION: [Pexels: chaotic crowd scattering] Then she lowers the camera, turns, and walks into the chaos, vanishing into history. Investigators appealed for her to come forward for years.

RHYTHM: [Pexels: missing person archive] Never found. Unclaimed. Lost.

PAYOFF: [Pexels: old film canisters] Her film — possibly the clearest view ever taken of the most investigated murder of the twentieth century — has never been found, and her identity remains unknown. Follow for more mysteries.`
const CORRIDO = ROTEIRO.replace(/^[A-Z0-9 ()-]+:\s*\[[^\]]*\]\s*/gm, '').replace(/\s*\n+\s*/g, ' ')
const PLANOS = [
  'A close-up of a vintage movie camera, its lens glinting in the light.',
  'Wide shot of Dealey Plaza bustling with excited crowds under the bright midday sun.',
  'A medium shot of a woman in a long coat and headscarf, poised at the curb, intensely filming the motorcade with her vintage camera.',
  'A medium shot of the woman in a long coat and headscarf, calmly filming the assassination from mere feet away.',
  'A chaotic crowd scattering across the plaza.',
  'A somber shot of empty shelves in a dimly lit archive.',
  'A close-up of old film canisters on a dark surface.',
]
const FALAS = ["A mystery woman filmed Kennedy's assassination — but vanished forever.", "Dallas, Texas, November 22, 1963. President John F. Kennedy's open-top motorcade rolls slowly.", 'Watching from the curb stands a woman in a long coat, a headscarf tied beneath her chin.', 'She appears in the famous Zapruder film.', 'Investigators appealed for her to come forward for years.', 'Never found. Unclaimed. Lost.', 'Her film has never been found.']

const nomesFicha = (A, t) => A.elencoDoRoteiro(t).map((f) => f.nome)
const nomesEpoca = (E, t) => E.personagensNomeados(t, null, false).map((p) => p.nome)

function provasFicha(A) {
  const e = []
  const elenco = A.elencoDoRoteiro(ROTEIRO)
  if (elenco.length !== 1 || elenco[0].nome !== 'the mystery woman' || !elenco[0].protagonista) e.push('a ficha não é da mulher: ' + JSON.stringify(elenco.map((f) => f.nome)))
  if (elenco.some((f) => /kennedy/i.test(f.nome))) e.push('Kennedy segue no elenco')
  return e
}
function provasEpoca(E) {
  const e = []
  const n = nomesEpoca(E, ROTEIRO), c = nomesEpoca(E, CORRIDO)
  if (n.length || c.length) e.push('nomes indevidos: ' + JSON.stringify([n, c]))
  const a = E.aplicarElencoEEpoca({ prompts: PLANOS, falas: FALAS, contextoOriginal: ROTEIRO, contextoFiltro: CORRIDO, modo: 'character_story', tagFaceless: false })
  if (/Named character|sandy|braids|ponytail/.test(a.prompts[0])) e.push('a cena 1 ganhou gente: ' + a.prompts[0].slice(0, 120))
  if (/Investigators, a/.test(a.prompts.join(' '))) e.push('Investigators virou personagem')
  if (!a.relato.elenco.some((p) => p.nome === 'the woman' && p.cenas_inseridas.includes(3))) e.push('a mulher não entrou na cena 3: ' + JSON.stringify(a.relato.elenco))
  return e
}
function provasQualidade(Q, A) {
  const e = []
  const ficha = A.elencoDoRoteiro(ROTEIRO)[0]
  const r = Q.prepararQualidadeDoFilme({ prompts: PLANOS, falas: FALAS, contextoOriginal: ROTEIRO, contextoFiltro: CORRIDO, modo: 'character_story', tagFaceless: false, style: { look: 'photorealistic', lookPhrase: 'photorealistic, ultra-detailed' }, elenco: [ficha], preservarElenco: true, aplicarContrato: false })
  if (/the woman, a woman in her thirties/.test(r.prompts[2])) e.push('a cena 3 tem duas descrições da mesma pessoa')
  if (!r.prompts[2].includes(ficha.canonica)) e.push('a cena 3 não usa a ficha')
  if (/sandy|braids/.test(r.prompts[0])) e.push('a loira de tranças voltou na cena 1')
  return e
}

const A0 = carrega(AJUSTE), E0 = carrega(EPOCA), Q0 = carrega(QUAL)
const e1 = provasFicha(A0)
checa(`1 ficha: a protagonista é a mulher, Kennedy é só citado${e1.length ? ': ' + e1.join(' · ') : ''}`, e1.length === 0)
const e2 = provasEpoca(E0)
checa(`2 época: nada de Kennedy mulher nem Investigators; a mulher nas cenas dela${e2.length ? ': ' + e2.join(' · ') : ''}`, e2.length === 0)
const e3 = provasQualidade(Q0, A0)
checa(`3 preparo das duas estradas: uma descrição por pessoa${e3.length ? ': ' + e3.join(' · ') : ''}`, e3.length === 0)

// Nunca piorar: nome que age, fala, é apresentado ou abre a história continua com ficha.
const FICAM = [
  ['Kennedy age depois de citado', "A sniper watched Kennedy's car from the window. Kennedy waved to the crowd. Kennedy smiled.", 'Kennedy'],
  ['apresentado com "named"', "A boy named Tommy found the dog. Tommy ran home. Tommy's mother cried.", 'Tommy'],
  ['aposto logo depois do papel', "A soldier, Hiroo, refused to surrender. Hiroo's war lasted decades. Hiroo's rifle stayed clean.", 'Hiroo'],
  ['fala', "The old man looked at her. Rosa: stay with me. Rosa's hands shook. Rosa cried.", 'Rosa'],
  ['descrito com aposto', "The nurse saved Lincoln's life. Lincoln, the president, thanked her. Lincoln's letter survived.", 'Lincoln'],
  ['história sem papel na abertura', "Kennedy's motorcade rolled through Dallas. Kennedy's car slowed. A woman filmed it.", 'Kennedy'],
  ['protagonista nomeado', "Abraham Lincoln walked into the theater. Lincoln's wife smiled. Lincoln sat down.", 'Lincoln'],
]
for (const [rotulo, texto, nome] of FICAM) {
  const naFicha = nomesFicha(A0, texto).some((n) => n.includes(nome))
  const naEpoca = nomesEpoca(E0, texto).some((n) => n.includes(nome))
  checa(`4 fica na ficha e na época (${rotulo})`, naFicha && naEpoca)
}
const N = carrega('lib/cinematic/citadoNaoAge.ts')
const V = /^(?:filmed|saved|watched|told)\b/
checa('5 outro citado na abertura sai ("A young nurse saved Churchill\'s life")', N.nomeSoCitado("A young nurse saved Churchill's life. Churchill's wife wrote to her.", 'Churchill', V) === true)
checa('5b sem verbo depois do papel a regra não vale', N.papelQueAbre("A woman in a long coat and Kennedy's car.", V) === null)
checa('5c grupo não é nome; sobrenome no plural é', N.GRUPOS_NAO_NOME.includes('investigators') && !N.GRUPOS_NAO_NOME.includes('rogers'))

// Mutantes: cada metade do conserto, tirada sozinha, deixa o caso vermelho.
const srcF = fs.readFileSync(FOLHA, 'utf8'), srcE = fs.readFileSync(EPOCA, 'utf8'), srcQ = fs.readFileSync(QUAL, 'utf8')
const mF = (t) => t.replace('if (nomeSoCitado(semTags, nome, VERBO_RE)) continue', '')
checa('mutante: a ficha volta a aceitar o citado', mF(srcF) !== srcF && provasFicha(carrega(AJUSTE, FOLHA, mF)).length > 0)
const mE = (t) => t.replace('.filter((c) => !nomeSoCitado(texto, c.nome, VERBO_RE))', '')
checa('mutante: a época volta a aceitar o citado', mE(srcE) !== srcE && provasEpoca(carrega(EPOCA, EPOCA, mE)).length > 0)
const mQ = (t) => t.replace('mesmoPersonagem(e.nome, ficha.nome)', 'e.nome.toLowerCase() === ficha.nome.toLowerCase()')
checa('mutante: duas descrições da mesma pessoa', mQ(srcQ) !== srcQ && provasQualidade(carrega(QUAL, QUAL, mQ), A0).length > 0)
const mG = (t) => t.replace('for (const palavra of GRUPOS_NAO_NOME) NAO_NOME.add(palavra)', '')
const comGrupo = 'Investigators appealed for her. Investigators searched for years. Investigators gave up.'
checa('mutante: grupo volta a ser nome', mG(srcE) !== srcE && nomesEpoca(E0, comGrupo).length === 0 && nomesEpoca(carrega(EPOCA, EPOCA, mG), comGrupo).length > 0)

console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
