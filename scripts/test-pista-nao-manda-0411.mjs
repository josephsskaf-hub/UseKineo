// KINEO-PISTA-NAO-MANDA-0411 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião: a fala manda, a pista [Pexels: …] só ajuda.
// Caso real: mahrafariha2526, bcd18c51 (Seedance 1.5, 03/11, 1º filme, nota 4,5): "HOOK: [Pexels: foggy forest] A plane vanished—unsolved for 70 years!" saiu com floresta, nenhum avião em 8 quadros.
// Regressões que reprovaram a 1ª versão (descarte por palavra em comum): 0c80c50f (Léo só é leãozinho na pista), 280e433e (o "algo terrível" só está na pista), 40a217a3 (as criaturas só estão na pista),
// e falas com pronome ou nome ("She sank…", "Max got lost…"). A decisão é de quem lê o sentido: a pista continua chegando, junto com a regra. Executa o texto REAL dos prompts. Sem rede, sem custo.
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
let falhas = 0
const checa = (n, c, extra = '') => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n + (extra ? ' -> ' + extra : '')) } }
const H = 'lib/cinematic/pistaNaoManda.ts'
const S = 'lib/cinematic/speechImageAlign.ts'
const carrega = (mutar = null) => createOfflineLoader({ env: { OPENAI_API_KEY: 'k' }, source: (rel, t) => (mutar ? mutar(rel, t) : t) })
const load = carrega()
const P = load(H)
const A = load(S)
const { parseUserScript } = load('lib/scriptParser.ts')
const lf = (t) => t.replace(/\r\n/g, '\n')
const rota = lf(readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
const router = lf(readFileSync('lib/hollywood/router.ts', 'utf8'))

// O descritor REAL da rota: lista de cenas, sistema e mensagem do usuário, recortados do código e executados.
const iLista = rota.indexOf('const list = scenes\n')
const iUser = rota.indexOf('const userMsg = `Topic:', iLista)
const iFim = rota.indexOf('\n', iUser)
const corpo = rota.slice(iLista, iFim).replace(/\/\/ PEDIDO-FIEL-2610[^\n]*$/, '')
const monta = new Function('scenes', 'topic', 'lote', 'temMarcaDeBusca', 'REGRA_DA_PISTA', 'visualDescriptionDirection', 'visualPolicy', 'kling4Gratis', 'desenhoProtagonista', 'aspectSpec', 'NO_TEXT_OBJECT_DIRECTION', 'REGRAS_DO_ESCRITOR_DE_CENAS', `${corpo}\nreturn { system, userMsg }`)
const descritor = (roteiro, Pk = P) => {
  const cenas = parseUserScript(roteiro).segments.map((s) => ({ description: s.pexelsQuery, voiceover: s.voiceover, stockSearchQuery: s.pexelsQuery }))
  return monta(cenas, roteiro, undefined, Pk.temMarcaDeBusca, Pk.REGRA_DA_PISTA, () => 'look.', {}, false, null, () => ({ promptFraming: 'x' }), 'y', 'z')
}

const AVIAO = 'HOOK: [Pexels: foggy forest] A plane vanished—unsolved for 70 years!\n\nMICRO REWARD 1: [Pexels: old archive flight documents] In 1950, Northwest Flight 2501 vanished over Lake Michigan.\n\nMICRO REWARD 2: [Pexels: search boats on water] Despite searches, no wreckage was ever found.\n\nPAYOFF: [Pexels: aerial view of Lake Michigan] The leading theory: turbulence caused a crash, leaving us with just the mystery.' // bcd18c51
const LEO = 'HOOK (0-2s): [Pexels: leãozinho acenando] Oiii, amiguinhos! Eu sou o Léo! Hoje vamos descobrir as cores!\n\nMICRO REWARD 1: [Pexels: maçã vermelha] Olha o que eu encontrei! Uma maçã VERMELHA! Vamos falar juntos?\n\nMICRO REWARD 2: [Pexels: girassol e borboleta] Uma flor AMARELA! E uma borboleta AZUL!\n\nPAYOFF: [Pexels: leãozinho dançando arco-íris] Vermelho, amarelo e azul! Aprender é muito legal! Até a próxima aventura!' // 0c80c50f
const TOMMY = 'HOOK (0-2s): [Pexels: crianças disputando brinquedo] Tommy e Lily queriam brincar com o mesmo brinquedo.\n\nMICRO REWARD 1: [Pexels: brinquedo quebrado no chão] De repente, aconteceu algo terrível!\n\nPAYOFF: [Pexels: crianças brincando juntas felizes] Tommy e Lily finalmente aprenderam... compartilhar é muito melhor do que brigar! Eles descobriram que a diversão fica ainda maior quando dividimos e respeitamos uns aos outros.' // 280e433e
const JAY = 'HOOK: [Pexels: teenager shocked face] "BROOO!\n\nMICRO REWARD 1: [Pexels: cartoon cash burst] Jay opens his banking app.\n\nMICRO REWARD 2: [Pexels: giant emoji creature] Jay opens a game app.\n\nPAYOFF: [Pexels: glowing purple app] Jay hides behind the couch.' // 40a217a3
const TITANIC = 'HOOK: [Pexels: Titanic ship sinking] She sank in under three hours.\n\nMICRO REWARD 1: [Pexels: iceberg at night] The warning never reached the bridge.\n\nPAYOFF: [Pexels: ocean wreck underwater] Over 1,500 people never came home.'
const MAX = '[Pexels: golden retriever puppy] Max got lost on a Tuesday.\n\n[Pexels: dog running road] He walked for three days.\n\n[Pexels: dog reunited owner] Then he scratched at his own front door.'
const PROSA = 'A plane vanished over Lake Michigan in 1950. Nobody ever found the wreckage.'

console.log('a pista continua chegando ao escritor, cena a cena e no tópico')
const CHEGA = [
  ['0c80c50f', LEO, ['visual hint: leãozinho acenando', 'visual hint: leãozinho dançando arco-íris', 'Topic: HOOK (0-2s): [Pexels: leãozinho acenando]']],
  ['280e433e', TOMMY, ['visual hint: brinquedo quebrado no chão', '[Pexels: brinquedo quebrado no chão]']],
  ['40a217a3', JAY, ['visual hint: giant emoji creature', '[Pexels: giant emoji creature]']],
  ['Titanic', TITANIC, ['visual hint: Titanic ship sinking', 'visual hint: iceberg at night', '[Pexels: Titanic ship sinking]']],
  ['Max', MAX, ['visual hint: golden retriever puppy', 'visual hint: dog running road', '[Pexels: dog reunited owner]']],
]
for (const [nome, roteiro, trechos] of CHEGA) {
  const { userMsg, system } = descritor(roteiro)
  for (const t of trechos) checa(`${nome}: chega "${t}"`, userMsg.includes(t), userMsg.slice(0, 200))
  checa(`${nome}: o descritor leu a regra`, system.includes(P.REGRA_DA_PISTA))
}

console.log('a fala fica como está')
const av = descritor(AVIAO)
checa('bcd18c51: a fala vai inteira e a cena continua com a sua pista', av.userMsg.includes('narration: A plane vanished—unsolved for 70 years!\n  visual hint: foggy forest'), av.userMsg.slice(0, 300))
checa('a soma das falas continua sendo a narração inteira', parseUserScript(AVIAO).segments.map((s) => s.voiceover).join(' ') === parseUserScript(AVIAO).narration)

console.log('a regra diz os dois lados')
checa('a fala com sujeito concreto manda: o avião, nunca a floresta sozinha', P.REGRA_DA_PISTA.includes('"A plane vanished" + "foggy forest" = the plane') && P.REGRA_DA_PISTA.includes('never the forest alone'))
checa('a fala vaga, com pronome ou com nome usa a pista', /vague or only a pronoun or a name, the term says what it refers to, so use it/.test(P.REGRA_DA_PISTA))
checa('a pista só sai quando contradiz', P.REGRA_DA_PISTA.includes('Leave the term out only where it contradicts the line.'))
checa('os exemplos não trazem as histórias dos clientes para outros filmes (Léo, Titanic)', !/Léo|Leo\b|Titanic|Max\b/.test(P.REGRA_DA_PISTA))

console.log('o supervisor recebe a mesma regra')
const cenaAv = [{ voiceover: 'A plane vanished—unsolved for 70 years!', shot: 'A dense, foggy forest envelops the frame' }]
const msgsAv = A.buildAlignMessages({ topic: AVIAO, scenes: cenaAv })
checa('bcd18c51: o supervisor leu a regra', msgsAv[0].content.includes(P.REGRA_DA_PISTA))
checa('o FILM TOPIC dele continua com as marcas (Léo só é leãozinho ali)', A.buildAlignMessages({ topic: LEO, scenes: cenaAv })[1].content.includes('[Pexels: leãozinho acenando]'))
const copia = lf(readFileSync(S, 'utf8')).match(/const REGRA_DA_PISTA =\n([\s\S]*?)\n\nexport const/)?.[1]
const original = lf(readFileSync(H, 'utf8')).match(/export const REGRA_DA_PISTA =\n([\s\S]*?)\n*$/)?.[1]
checa('a cópia do módulo sem imports é literal', !!copia && copia.trim() === original.trim())

console.log('controles: roteiro sem marca não muda')
checa('descritor em prosa: sem a regra', !descritor(PROSA).system.includes('KINEO-PISTA-NAO-MANDA-0411'))
checa('supervisor em prosa: sem a regra', !A.buildAlignMessages({ topic: PROSA, scenes: cenaAv })[0].content.includes('KINEO-PISTA-NAO-MANDA-0411'))
checa('as variantes do parser contam como marca', ['[pexels - a b] x', '[PEXELS: c] y', '[ Pexels: d] z'].every((t) => P.temMarcaDeBusca(t)) && !P.temMarcaDeBusca(PROSA))

console.log('a ligação no código real: nada de descarte em código')
checa('a rota não troca a pista da cena', !/cenasComPistaQueServe|pistaReserva|semMarcasDeBusca|PISTA_NAO_MANDA_EVENTO/.test(rota))
checa('o planejador não apaga a marca', !router.includes('semMarcasDeBusca'))
checa('o descritor lê o tópico inteiro', rota.includes('const userMsg = `Topic: ${topic.slice(0, 12000)}'))
checa('as 3 chamadas do supervisor leem o pedido', (rota.match(/alignShotsToSpeech\(\{\s*topic: prompt,/g) ?? []).length === 3)
checa('a regra entra no descritor só em roteiro marcado', rota.includes('${temMarcaDeBusca(topic) ? `\n- ${REGRA_DA_PISTA}` : \'\'}'))
checa('o planejador hollywood lê a ideia com a regra', router.includes("`Idea/topic: ${String(idea ?? '').slice(0, SCENE_WRITER_INPUT_MAX_CHARS)}${temMarcaDeBusca(String(idea ?? '')) ? `\\n\\n${REGRA_DA_PISTA}` : ''}"))
const kineo1 = readFileSync('app/api/generate-video-fast/route.ts', 'utf8')
checa('Kineo 1 não importa a regra: lá a pista busca no banco de imagens', !kineo1.includes('pistaNaoManda'))

console.log('mutantes têm de ficar vermelhos')
const provas = (L) => {
  const Pm = L(H), Am = L(S)
  if (!descritor(AVIAO, Pm).system.includes(Pm.REGRA_DA_PISTA)) return 'descritor sem a regra'
  if (descritor(PROSA, Pm).system.includes('KINEO-PISTA-NAO-MANDA-0411')) return 'prosa recebeu a regra'
  if (!Am.buildAlignMessages({ topic: AVIAO, scenes: cenaAv })[0].content.includes('KINEO-PISTA-NAO-MANDA-0411')) return 'supervisor sem a regra'
  if (Am.buildAlignMessages({ topic: PROSA, scenes: cenaAv })[0].content.includes('KINEO-PISTA-NAO-MANDA-0411')) return 'supervisor em prosa com a regra'
  if (!/never the forest alone/.test(Pm.REGRA_DA_PISTA)) return 'regra sem o lado da fala'
  if (!/so use it/.test(Pm.REGRA_DA_PISTA)) return 'regra sem o lado da pista'
  return null
}
checa('o código de hoje passa nas provas', provas(load) === null, String(provas(load)))
const MUTANTES = [
  ['descritor nunca vê a regra', (rel, t) => (rel === H ? t.replace("return /\\[\\s*pexels/i.test(String(texto ?? ''))", 'return false') : t)],
  ['regra para todo roteiro', (rel, t) => (rel === H ? t.replace("return /\\[\\s*pexels/i.test(String(texto ?? ''))", 'return true') : t)],
  ['supervisor sem a regra', (rel, t) => (rel === S ? t.replace("(/\\[\\s*pexels/i.test(input.topic) ? REGRA_DA_PISTA + ' ' : '') +", "'' +") : t)],
  ['supervisor sempre com a regra', (rel, t) => (rel === S ? t.replace("(/\\[\\s*pexels/i.test(input.topic) ? REGRA_DA_PISTA + ' ' : '') +", "REGRA_DA_PISTA + ' ' +") : t)],
  ['regra perde o lado da fala', (rel, t) => (rel === H ? t.replace(', never the forest alone', '') : t)],
  ['regra perde o lado da pista', (rel, t) => (rel === H ? t.replace(', so use it', '') : t)],
]
for (const [nome, m] of MUTANTES) {
  let e
  try { e = provas(carrega(m)) } catch (x) { e = 'lançou: ' + x.message }
  checa(`mutante "${nome}" fica vermelho`, e !== null)
}

console.log(`\n${falhas === 0 ? 'VERDE' : 'VERMELHO'}: ${ok} ok, ${falhas} falha(s)`)
process.exit(falhas === 0 ? 0 : 1)
