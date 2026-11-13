// KINEO-SO-GENTE-NA-FICHA-0411 + KINEO-EMBALAGEM-SEM-LETRA-0411 [TRAVA 8.2 — fundador 04/11: "Concerta tudo, melhora todos os proximos videos"] — guardião sem rede e sem custo.
// Caso real: breakthroughs2026 (04/11, pagante, 1º filme, Seedance 1.5, generation a3b48be4): "Building" e "Bay" viraram personagens humanos; homem de colete e mulher de chapéu em cena; folha de US$ 1,33.
// Caso real: manobiayousaf (04/11, 55221671): farmácia com placa "FNSSFOCA" e frascos com rótulos sem sentido.
// Prova executando o código real; cada regra nova tem um mutante que fica vermelho. Quem é personagem de verdade continua.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
let falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const carrega = (arq, alvo = null, mutar = null) => createOfflineLoader({ source: (rel, t) => (mutar && rel === alvo ? mutar(t) : t) })(arq)

const FOLHA = 'lib/cinematic/folhaDePersonagem.ts'
const EPOCA = 'lib/cinematic/elencoEpoca.ts'
const CONF = 'lib/cinematic/conferenciaDoElenco.ts'
const SUP = 'lib/cinematic/superficieSemTexto.ts'
const CITADO = 'lib/cinematic/citadoNaoAge.ts'

const LITUYA = `HOOK (0-2s): [Pexels: aerial ocean waves] Imagine a wave... taller than the Empire State Building itself.

MICRO REWARD 1: [Pexels: alaska coastline aerial] It happened in Lituya Bay, Alaska, on July 9, 1958. A massive 8.3 magnitude earthquake triggered a colossal landslide, hurling about 90 million tons of rock into the bay. The impact displaced an unimaginable amount of water, creating a wave that reached an astounding 1,720 feet high—towering over the Empire State Building, which stands at 1,454 feet tall.

MICRO REWARD 2: [Pexels: mountain landslide] The bay's unique geography played a crucial role in this phenomenon. With steep walls and a narrow inlet, Lituya Bay acted like a funnel, focusing the energy of the landslide and amplifying the wave's height.

MICRO REWARD 3: [Pexels: lone fishing boat] Incredibly, three fishing boats were in Lituya Bay when the wave struck.

PAYOFF: [Pexels: empire state building aerial] The Empire State Building stands at 1,454 feet. This wave reached 1,720 feet—266 feet taller. Nature's power... truly overwhelming.`
const FALAS = ['Imagine a wave... taller than the Empire State Building itself.', 'It happened in Lituya Bay, Alaska, on July 9, 1958.', 'Lituya Bay acted like a funnel.', 'The Empire State Building stands at 1,454 feet.']
const PLANOS = ['A towering wave above the ocean.', 'Aerial view of a narrow bay in Alaska.', 'Steep cliffs around a narrow inlet.', 'A giant wave over a steep bay.']
const ESSENCIAL = 'HOOK: Think beyond the 72-hour kit.\n\nPAYOFF: Essential: ready-to-eat foods... No cooking needed if electricity fails. Sound: Dramatic record scratch. Moral: stay ready.'
const fic = (nome, origem = 'deterministica', protagonista = false) => ({ nome, nucleo: nome, tipo: 'humano', canonica: `${nome}, a person`, origem, protagonista, genero: null })

// ── A. a lista, sem depender da leitura (rede de segurança) ─────────────────────────────────────────────────────────────
function provaLista(folha, epoca) {
  const e = []
  const nomes = folha.elencoDeterministico(LITUYA).map((f) => f.nome)
  if (nomes.some((n) => /^(?:Building|Bay|Empire|State)$/.test(n))) e.push('A1 Lituya: lugar virou ficha ' + nomes)
  const nomeados = epoca.personagensNomeados(`${LITUYA} ${FALAS.join(' ')}`).map((p) => p.nome)
  if (nomeados.some((n) => /Building|Bay/.test(n))) e.push('A2 Lituya: lugar virou personagem da época ' + nomeados)
  const rotulos = epoca.personagensNomeados(ESSENCIAL).map((p) => p.nome)
  if (rotulos.some((n) => /Essential|Sound|Moral/.test(n))) e.push('A3 rótulo virou personagem ' + rotulos)
  return e
}
{
  const r = provaLista(carrega(FOLHA), carrega(EPOCA))
  checa('A lista: Building, Bay, Essential, Sound e Moral não viram gente ' + r.join(' | '), r.length === 0)
  const mut = (t) => t.replace(/PALAVRAS_NUNCA_NOME: readonly string\[\] = '[^']*'/, "PALAVRAS_NUNCA_NOME: readonly string[] = 'zzz'")
  const m = provaLista(carrega(FOLHA, CITADO, mut), carrega(EPOCA, CITADO, mut))
  checa('A mutante: sem a lista, volta a falhar', m.length > 0)
  const folha = carrega(FOLHA), epoca = carrega(EPOCA)
  for (const [texto, nome] of [['Dino heard a noise. Dino ran away.', 'Dino'], ['Tommy waved. Tommy laughed.', 'Tommy']]) checa(`A nome real fica na folha: ${nome}`, folha.elencoDeterministico(texto).some((f) => f.nome === nome))
  checa('A nome real fica na época: James Turner', epoca.personagensNomeados('In 1953, James Turner vanished. His car was found running.').some((p) => p.nome === 'James Turner'))
}

// ── B. a conferência pela leitura ───────────────────────────────────────────────────────────────────────────────────────
{
  const c = carrega(CONF)
  const lida = (nome, ...sup) => ({ protagonist: nome ? { name: nome } : null, supporting: sup.map((name) => ({ name })), places_and_orgs: [] })
  checa('B sem leitura (erro/prazo): null, nada é retirado', c.conferenciaDaLeitura(null) === null && c.elencoConferido([fic('Moral', 'deterministica', true)], null).elenco.length === 1)
  const nada = c.conferenciaDaLeitura(lida(null))
  checa('B a leitura diz "ninguém": conferência vazia, não null', nada !== null && nada.nomes.length === 0)
  const r1 = c.elencoConferido([fic('Building', 'deterministica', true), fic('Bay')], nada)
  checa('B Lituya: Building e Bay saem', r1.elenco.length === 0 && r1.removidos.join() === 'Building,Bay')
  const r2 = c.elencoConferido([fic('Moral', 'deterministica', true), fic('Onoda')], c.conferenciaDaLeitura(lida('Hiroo Onoda')))
  checa('B Moral sai, Onoda fica e assume o protagonismo', r2.elenco.length === 1 && r2.elenco[0].nome === 'Onoda' && r2.elenco[0].protagonista === true)
  const r3 = c.elencoConferido([fic('the woman', 'deterministica', true), fic('Krishna', 'mitica'), fic('Dino', 'autor')], nada)
  checa('B papel sem nome, figura mítica e ficha do autor nunca saem', r3.elenco.length === 3 && r3.removidos.length === 0)
  const r4 = c.elencoConferido([fic('Tommy', 'deterministica', true)], c.conferenciaDaLeitura(lida('Tommy')))
  checa('B quem a leitura leu fica igual', r4.elenco.length === 1 && r4.elenco[0].protagonista === true && r4.removidos.length === 0)
  checa('B escrita latina: inglês, português e espanhol sim', c.escritaLatina('Serafina, agente da divisão, avança.') && c.escritaLatina(LITUYA))
  checa('B escrita não latina: árabe e híndi não conferem', !c.escritaLatina('في الساعة الثالثة فجراً، سمع أحمد طرقاً') && !c.escritaLatina('रात के ठीक 3 बजे, रिया के कमरे का दरवाज़ा') && !c.escritaLatina(''))
  const mut = carrega(CONF, CONF, (t) => t.replace("removidos.push(f.nome)\n    return false", 'return true'))
  checa('B mutante: quem não retira fica vermelho', mut.elencoConferido([fic('Building', 'deterministica', true)], nada).elenco.length === 1)
  const mut2 = carrega(CONF, CONF, (t) => t.replace(" || f.origem === 'autor'", ''))
  checa('B mutante: ficha do autor retirada fica vermelho', mut2.elencoConferido([fic('Dino', 'autor')], nada).elenco.length === 0)
}

// ── C. a camada de época não insere quem a leitura não leu ─────────────────────────────────────────────────────────────
{
  const e = carrega(EPOCA)
  const ctx = `${LITUYA} ${FALAS.join(' ')}`
  const r = e.aplicarElencoEEpoca({ prompts: PLANOS, falas: FALAS, contextoOriginal: ctx, contextoFiltro: ctx, modo: 'character_story', tagFaceless: false, elencoSemantico: { nomes: [], protagonista: '' } })
  checa('C Lituya: nenhum "Named character" no prompt', !r.prompts.some((p) => /Named character/.test(p)) && r.relato.elenco.every((x) => !x.nomeado))
  const t = 'Tommy waved at the pup. Tommy laughed. Laughter erupts!'
  const r2 = e.aplicarElencoEEpoca({ prompts: ['A sunny park.'], falas: [t], contextoOriginal: t, contextoFiltro: t, modo: 'character_story', tagFaceless: false, elencoSemantico: { nomes: ['Tommy'], protagonista: 'Tommy' } })
  checa('C Tommy entra, Laughter não', r2.prompts[0].includes('Tommy') && !/Laughter,/.test(r2.prompts[0]))
}

// ── D. letra inventada em embalagem e placa ─────────────────────────────────────────────────────────────────────────────
{
  const s = carrega(SUP)
  const frase = 'Every bottle, box and package is one plain solid colour.'
  checa('D frascos de remédio ganham rótulo liso', s.comSuperficieSemTexto('Shelves full of medicine bottles in a bathroom.').includes(frase))
  checa('D farmácia ganha placa lisa', s.comSuperficieSemTexto('A pharmacist in a small pharmacy.').includes('sign is a plain block of colour'))
  checa('D latas de comida também', s.comSuperficieSemTexto('Rows of canned vegetables.').includes(frase))
  checa('D "can" verbo não dispara', s.comSuperficieSemTexto('A man who can fly over a valley.') === 'A man who can fly over a valley.')
  checa('D cena sem superfície fica byte a byte', s.comSuperficieSemTexto('Waves crashing on a beach.') === 'Waves crashing on a beach.')
  checa('D idempotente', s.comSuperficieSemTexto(s.comSuperficieSemTexto('A jar of honey.')) === s.comSuperficieSemTexto('A jar of honey.'))
  for (const pedido of ['A neon sign that says OPEN', 'A bottle with the brand logo', 'A poster with "Happy Birthday" written on it']) checa(`D quem pede letra fica como pediu: ${pedido}`, s.comSuperficieDoPedido(pedido, pedido) === pedido)
  checa('D clipe sem pedido de letra recebe a frase', s.comSuperficieDoPedido('A girl looking at her phone', 'A girl looking at her phone').includes('every screen'.replace('every', 'Every')))
  const mut = carrega(SUP, SUP, (t) => t.replace(/\{ re: \/\\b\(\?:bottles[^\n]*\n/, '\n'))
  checa('D mutante: sem a linha da embalagem fica vermelho', !mut.comSuperficieSemTexto('A jar of honey.').includes(frase))
}

// ── E. as duas estradas e o clipe usam ─────────────────────────────────────────────────────────────────────────────────
{
  const rota = fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8').replace(/\r\n/g, '\n')
  checa('E a leitura roda fora do character_story e na estrada hollywood', /const conferirElenco = !qualidadeHerdada && !estrelaFicha && !desenhoInfantil\.ativo && !tagFacelessPresente && classicVisualMode !== 'presenter' && escritaLatina\(prompt\)/.test(rota) && (rota.includes('usarElencoSemantico || conferirElenco ? await pedirElencoSemantico(prompt)') || rota.includes('usarElencoSemantico || conferirElenco ? ((sinais1311?.elencoBruto as Awaited<ReturnType<typeof pedirElencoSemantico>> | null | undefined) ?? await pedirElencoSemantico(prompt))'))) // KINEO-PROTAGONISTA-1311 — a mesma leitura; quando o filme já a fez antes do modo (regra do protagonista), ela é reaproveitada
  checa('E a ficha do pedido usa o elenco conferido', rota.includes('elencoSemantico ? elencoSemantico.elenco : baseConferida.elenco'))
  checa('E hollywood: a camada de época recebe a conferência', rota.includes('elencoSemantico: conferenciaElenco, // KINEO-SO-GENTE-NA-FICHA-0411'))
  checa('E clássica: a camada de época recebe a conferência', rota.includes('leitura: elencoSemantico.leitura } : conferenciaElenco'))
  checa('E filme de 15 s: os visuais não devolvem o nome retirado', rota.includes('extrair: (texto: string) => elencoConferido(elencoDoRoteiro(texto), conferenciaElenco).elenco'))
  checa('E grava o evento de medição', rota.includes('name: EVENTO_CONFERENCIA_ELENCO'))
  checa('E hollywood descreve a superfície', /scene\.prompt = comSuperficie\.length <= 2500/.test(rota))
  const clipe = fs.readFileSync('app/api/generate-clip/route.ts', 'utf8')
  checa('E clipe usa a superfície respeitando o pedido', clipe.includes('comSuperficieDoPedido(buildClipPrompt('))
}

console.log(`\n${ok} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
