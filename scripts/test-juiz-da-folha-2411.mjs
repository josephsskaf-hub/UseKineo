// KINEO-JUIZ-DA-FOLHA-2411 — guardião que EXECUTA o módulo real (lib/cinematic/juizDaFolha2411.ts: o pedido, a leitura, a regra por eixo, o laço com uma folha
// nova e a tolerância do meio) com a rede FALSA (o modelo e o gerador são funções do teste: nada sai da máquina, nenhum centavo), o trecho REAL da rota que
// julga as folhas e a admissão REAL da referência única.
// As LEITURAS das duas folhas da prova paga 4 (docs/canais/2026-11-24/prova-4: FOLHA-bolt.jpg e FOLHA-ember.jpg) são o que eu (Opus 5.5) vi nas imagens,
// escritas no formato que o modelo devolve. Elas provam a REGRA, não o gpt-4o-mini: o que o modelo de produção diria de cada imagem só o
// scripts/ensaio-juiz-da-folha-2411.mjs prova (precisa da chave; ~US$ 0,002; quem roda é a CEO).
// v3 [revisora 24/11, VOLTA, docs/revisoes-2311/CEO-JUIZ-DA-FOLHA-2411.md §11]: só o traço que é do AUTOR (palavra por palavra, sem negação) conta e vai à
// folha nova; sem descrição do autor o eixo traços não julga (os 3 filmes provados da manhã continuam ligando); folha sem personagem reprova; o custo grava a
// folha nova e o relato a 1ª leitura; o veredito pronto do modelo é ignorado; o prazo da leitura é 8 s; o ensaio do personagem fixo não roda o juiz.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const modulo = 'lib/cinematic/juizDaFolha2411.ts'
const routeFile = 'app/api/generate-video-cinematic/route.ts'
const local = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n')
const load = (source, globals = {}) => createOfflineLoader({ source, globals: { AbortSignal, ...globals } })
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
const CASA = 'josephsskaf@gmail.com', CLIENTE = 'cliente@example.org'
const FOLHA_USD = 0.015

const BOLT = { nome: 'Bolt', nucleo: 'Bolt', tipo: 'criatura', protagonista: true, canonica: 'Bolt, exactly as the author wrote: "small round orange robot with big blue eyes"; drawn in the film\'s own look (stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic), the same character design in every scene' }
const EMBER = { nome: 'Ember', nucleo: 'Ember', tipo: 'criatura', protagonista: true, canonica: 'Ember, a small green dragon with a long, slender scaled body and a horned reptilian head. Her leathery bat-like wings are orange, and she has sharp claws and a long spiked tail. A distinctive feature is her bright, expressive eyes; a living creature filmed in photorealistic live action, with real textures, weight and natural light' }
const ELIAS = { nome: 'Elias', nucleo: 'Elias', tipo: 'humano', protagonista: true, canonica: 'Elias, exactly as the author wrote: "gray-bearded lighthouse keeper in a navy coat"; a real person filmed in photorealistic live action' }
// os 3 filmes provados da manhã (scripts/test-support/referencia-unica-public-2411-filmes.json): a canônica como foi gravada
const PROVADOS = JSON.parse(readFileSync('scripts/test-support/referencia-unica-public-2411-filmes.json', 'utf8')).filmes.map(f => f.personagem)
// FOLHA-bolt.jpg: um robô alto, laranja, de olhos azuis grandes, com cabeça, focinho e orelhas de cachorro; render 3D de animação
const LEITURA_BOLT = { medium: 'cartoon_3d', characters: 1, traits: [{ trait: 'small', category: 'size', visible: 'no' }, { trait: 'round', category: 'shape', visible: 'no' }, { trait: 'orange', category: 'color', visible: 'yes' }, { trait: 'robot', category: 'species', visible: 'yes' }, { trait: 'big blue eyes', category: 'feature', visible: 'yes' }] }
const BOLT_CERTO = { ...LEITURA_BOLT, traits: LEITURA_BOLT.traits.map(t => ({ ...t, visible: 'yes' })) }
// FOLHA-ember.jpg: a canônica do Ember NÃO tem descrição do autor (origem modelo): o juiz julga só um personagem e o meio
const TRACOS_EMBER = [{ trait: 'small green dragon', category: 'species', visible: 'yes' }, { trait: 'leathery bat-like wings are orange', category: 'feature', visible: 'no' }]
const EMBER_REALISTA = { medium: 'photo_or_realistic_render', characters: 1, traits: TRACOS_EMBER }
const EMBER_CARTUM = { medium: 'cartoon_3d', characters: 1, traits: TRACOS_EMBER }
const ELIAS_DESENHO = { medium: 'cartoon_2d', characters: 1, traits: [{ trait: 'gray-bearded', category: 'feature', visible: 'yes' }, { trait: 'navy coat', category: 'clothing', visible: 'yes' }] }
const resposta = o => JSON.stringify(o)

// O trecho REAL da rota que julga as folhas (logo depois do Map folhaDe), com a rede falsa.
function julgarNaRota(route, j, { email, folhaDe, elencoP, look = 'photoreal', infantil = false, candidato = true, herdada = null, fixo = false, ler, gerar }) {
  const ini = route.indexOf('      if (juizDaFolhaLigado(JUIZ_DA_FOLHA_2411, user.email) && kling4TrialCandidate && !qualidadeHerdada')
  assert.ok(ini > route.indexOf('const folhaDe = new Map<string, string>(') && ini < route.indexOf('if (qualitySnapshot) qualitySnapshot.characterReferences = Array.from(folhaDe'), 'o juiz julga a folha antes do retrato e das imagens-chave')
  const fim = route.indexOf('\n      }\n', ini) + 9
  const escopo = { epocaVisual: null, aplicarEpocaVisual: load()('@/lib/cinematic/epocaVisual2411').aplicarEpocaVisual, juizDaFolhaLigado: j.juizDaFolhaLigado, JUIZ_DA_FOLHA_2411: j.JUIZ_DA_FOLHA_2411, user: { email }, kling4TrialCandidate: candidato, qualidadeHerdada: herdada, ensaioPersonagemFixo: fixo, folhaDe, elencoP,
    julgarAFolha: j.julgarAFolha, isStylizedLook: s => s.look === 'animated3d' || s.look === 'anime' || s.look === 'illustration', styleAnchor: { look, lookPhrase: look === 'photoreal' ? 'photorealistic, ultra-detailed' : 'stylized 3D animated film look' },
    desenhoInfantil: { ativo: infantil }, lerAFolha: ler, generateCinematicSceneStill: gerar, promptDaFolha: (f) => 'Character reference sheet: ' + f.canonica, generationSeed: 7, aspectRequested: '9:16', folhasReprovadas2411: new Set(), folhaSemNome2511: false /* KINEO-FICHA-SEM-NOME-2511 (o guardião dele: test-ficha-sem-nome-2511) */ }
  const corpo = ts.transpile('return (async () => {\n' + route.slice(ini, fim) + '\nreturn { folhasReprovadas2411, juizDaFolhaRelato2411 } })()', { target: ts.ScriptTarget.ES2022 })
  return Function(...Object.keys(escopo), 'let juizDaFolhaRelato2411 = null\n' + corpo)(...Object.values(escopo))
}

async function suite(change) {
  const pares = change ? (Array.isArray(change[1]) ? change[1] : [[change[1], change[2]]]) : []
  const source = (file, src) => change && file === change[0] ? pares.reduce((t, [de, para]) => t.split(de).join(para), src) : src
  const j = load(source)('@/' + modulo)
  const route = source(routeFile, local(routeFile))

  // 1. o interruptor: 'internal' = só a lista exata da casa
  assert.equal(j.JUIZ_DA_FOLHA_2411, 'internal')
  assert.equal(j.juizDaFolhaLigado('internal', CASA), true)
  for (const e of [CLIENTE, 'joseph@usekineo.com', 'xjosephsskaf@gmail.com', '', null]) assert.equal(j.juizDaFolhaLigado('internal', e), false, String(e))
  assert.equal(j.juizDaFolhaLigado('off', CASA), false)

  // 2. o pedido e a descrição: só o que o AUTOR escreveu; sem isso, '' (a canônica sem aspas é biografia/ação)
  assert.equal(j.descricaoParaOJuiz(BOLT), 'small round orange robot with big blue eyes')
  assert.equal(j.descricaoParaOJuiz(EMBER), '', 'Ember (origem modelo): sem descrição do autor')
  igual(PROVADOS.map(p => j.descricaoParaOJuiz(p)), ['bearded inventor in an 1880s suit', 'old bearded sailor', 'man in a dark suit and black tie'], 'a do autor ou a do pedido; a biografia do Slocum ("the first man to sail around the world alone") fica de fora')
  assert.equal(j.descricaoParaOJuiz({ nome: 'Elias', canonica: 'Elias, kept the old lighthouse alone for thirty years, exactly as the author wrote; appearance anchors: 50-60, gray' }), '', 'o Elias do cedd1250: só ação, nenhuma descrição')
  const p = JSON.stringify(j.pedidoAoJuizDaFolha('small round orange robot', 'https://x.org/f.png').messages)
  assert.ok(!/e\.g\.|for example|such as|like this|FAIL|reject/i.test(p), 'sem exemplo e sem ordem de reprovar')
  assert.ok(p.includes('small round orange robot') && p.includes('https://x.org/f.png'))

  // 3. a leitura: campo a campo; fora do formato = null; o veredito pronto do modelo (J2) é ignorado
  igual(j.lerLeituraDaFolha(resposta(LEITURA_BOLT)), { meio: 'cartoon_3d', personagens: 1, tracos: LEITURA_BOLT.traits.map(t => ({ traco: t.trait, categoria: t.category, visivel: t.visible })) })
  for (const ruim of ['', 'nada', '{}', resposta({ verdict: 'PASS' }), resposta({ verdict: 'PASS', characters: 1 }), resposta({ ...LEITURA_BOLT, medium: 'painting' }), resposta({ ...LEITURA_BOLT, characters: '1' }), resposta({ ...LEITURA_BOLT, traits: null })]) assert.equal(j.lerLeituraDaFolha(ruim), null, ruim)
  igual(j.decidirDaFolha(j.lerLeituraDaFolha(resposta({ ...LEITURA_BOLT, verdict: 'PASS' })), false, j.descricaoParaOJuiz(BOLT)).tracos, 'forma_especie', 'J2: "PASS" do modelo não decide')
  assert.equal(j.lerLeituraDaFolha(resposta({ ...LEITURA_BOLT, traits: [{ trait: 'x', category: 'mood', visible: 'yes' }, { trait: 'y', category: 'color', visible: 'maybe' }] })).tracos.length, 0, 'traço fora do formato some')

  // 4. a regra POR EIXO
  const ler = o => j.lerLeituraDaFolha(resposta(o))
  const DB = j.descricaoParaOJuiz(BOLT)
  igual(j.decidirDaFolha(ler(LEITURA_BOLT), false, DB), { tracos: 'forma_especie', meio: 'ok', ausentes: ['small', 'round'], descartados: 0, forma: 'nao_julgada', especie: null }, 'Bolt: reprova em forma/espécie')
  igual(j.decidirDaFolha(ler(EMBER_REALISTA), true, ''), { tracos: 'ok', meio: 'ok', ausentes: [], descartados: 2, forma: 'nao_julgada', especie: null }, 'Ember: sem descrição do autor, os traços não julgam')
  igual(j.decidirDaFolha(ler(EMBER_CARTUM), true, ''), { tracos: 'ok', meio: 'meio', ausentes: [], descartados: 2, forma: 'nao_julgada', especie: null })
  igual(j.decidirDaFolha(ler(EMBER_CARTUM), false, ''), { tracos: 'ok', meio: 'ok', ausentes: [], descartados: 2, forma: 'nao_julgada', especie: null }, 'a mesma folha num filme desenhado: passa')
  igual(j.decidirDaFolha(ler({ ...BOLT_CERTO, characters: 2 }), false, DB).tracos, 'mais_de_um')
  igual(j.decidirDaFolha(ler({ ...BOLT_CERTO, characters: 0 }), false, DB).tracos, 'nenhum', '(3) folha sem personagem reprova')
  igual(j.decidirDaFolha(ler({ ...BOLT_CERTO, traits: BOLT_CERTO.traits.map(t => t.trait === 'orange' ? { ...t, visible: 'no' } : t) }), false, DB), { tracos: 'traco', meio: 'ok', ausentes: ['orange'], descartados: 0, forma: 'nao_julgada', especie: null })
  igual(j.decidirDaFolha(ler({ ...LEITURA_BOLT, traits: LEITURA_BOLT.traits.map(t => ({ ...t, visible: 'unclear' })) }), false, DB).tracos, 'ok', '"unclear" não reprova')
  igual(j.decidirDaFolha(ler({ medium: 'photo_or_realistic_render', characters: 1, traits: [] }), false, DB), { tracos: 'ok', meio: 'meio', ausentes: [], descartados: 0, forma: 'nao_julgada', especie: null }, 'foto num filme desenhado')
  // (1) o traço que o autor NÃO escreveu, a negação e a marca: descartados e contados, nunca reprovam nem vão à folha nova
  const inventados = [{ trait: 'dog ears', category: 'feature', visible: 'no' }, { trait: 'not a dog, no ears', category: 'species', visible: 'no' }, { trait: 'Nike logo', category: 'clothing', visible: 'no' }, { trait: 'no blue eyes', category: 'feature', visible: 'no' }]
  igual(j.decidirDaFolha(ler({ ...BOLT_CERTO, traits: [...BOLT_CERTO.traits, ...inventados] }), false, DB), { tracos: 'ok', meio: 'ok', ausentes: [], descartados: 4, forma: 'nao_julgada', especie: null }, 'inventados: descartados')
  igual(j.decidirDaFolha(ler({ ...LEITURA_BOLT, traits: [...LEITURA_BOLT.traits, ...inventados] }), false, DB).ausentes, ['small', 'round'], 'a folha nova só leva palavras do autor')
  for (const [traco, deve] of [['small round', true], ['Big Blue Eyes', true], ['blue eye', false], ['round orange', true], ['robot with big', true], ['dog ears', false], ['not round', false], ['small', true], ['', false]]) assert.equal(j.tracoDoAutor(traco, DB), deve, traco)
  assert.equal(j.tracoDoAutor('small', ''), false, 'sem descrição: nenhum traço conta')
  assert.equal(j.tracoDoAutor('no hat', 'a tall man with no hat and a red coat'), false, 'negação, mesmo escrita pelo autor, nunca vai ao FLUX')
  // [CEO 25/11 01:42, docs/semana-2/DECISAO-CONFERENTE-NEGACAO-2511.md] volta 5, regra ÚNICA: QUALQUER negação na descrição do autor = nenhum traço
  // dela conta (nada vai a "clearly visible"); sem negação = palavra por palavra, como antes. Os casos das voltas 2 a 4 (revisora e meus) com a expectativa nova.
  const COM_NEGACAO = [
    // os meus das voltas 3 e 4
    ['small round orange robot, not a dog, with no ears and without a hat', ['dog', 'a dog', 'ears', 'hat', 'a hat', 'small round', 'orange robot', 'robot']],
    ['tall man with no beard', ['beard', 'tall man', 'man']],
    ['a tall man without glasses', ['glasses', 'tall']],
    ['an old sailor who never wears a hat', ['hat', 'a hat', 'old sailor']],
    ['a woman with no glasses or hat', ['glasses', 'hat', 'woman']],
    ['a girl without a hat and scarf', ['scarf', 'hat', 'girl']],
    ['a man who does not wear any kind of hat', ['hat', 'man']],
    ['a man who doesn’t wear glasses', ['glasses', 'man']],
    ['a tall man with no hat and a red coat', ['red coat', 'tall man']],
    ['No hat. Orange robot with big blue eyes', ['orange robot', 'big blue eyes']], // negação em outra frase: agora também não julga
    ['no hat; red scarf', ['red scarf']],
    ['a tall man with no hat, and a red coat', ['red coat']],
    ['not a dog, a small round robot', ['small round robot']],
    ['not a dog but a robot', ['robot']],
    ['never without his red scarf', ['red scarf']],
    ['homem alto, sem barba', ['barba', 'homem alto']],
    ['no hat at first; then a red hat', ['hat', 'red hat']],
    ['no hat at first, then a red hat', ['red hat']],
    ['a robot without ears', ['robot without ears', 'robot']],
    ['a man with no hat, wearing a red coat', ['red coat']],
    ['a man with no hat, with a red scarf', ['red scarf']],
    ['a man without a hat, who has a red scarf', ['red scarf']],
    ['homem sem chapéu, com um casaco vermelho', ['casaco vermelho']],
    ['homem sem chapéu, e um casaco vermelho', ['casaco vermelho']],
    ['un hombre sin sombrero, con una bufanda roja', ['bufanda roja']],
    ['un hombre sin sombrero, y una bufanda roja', ['bufanda roja']],
    ['no hat, and gloves', ['gloves']],
    ['a man without a hat with a feather', ['feather']],
    // os PERIGOSOS da revisora (volta 3, §2)
    ['no hat, glasses, scarf', ['glasses', 'scarf']],
    ['a man without a hat, scarf or gloves', ['scarf', 'gloves', 'man']],
    ['a woman with no glasses, earrings, or hat', ['earrings', 'hat']],
    ['never wears a hat, a scarf, or gloves', ['scarf', 'gloves']],
    ['homem alto, sem chapéu, óculos ou cachecol', ['óculos', 'cachecol', 'homem alto']],
    ['un hombre sin sombrero, gafas ni bufanda', ['gafas', 'bufanda']],
    ['robô que jamais usa chapéu', ['chapéu', 'robô']],
    ['un hombre que jamás lleva sombrero', ['sombrero', 'hombre']],
    ['a man who doesnt wear glasses', ['glasses', 'man']],
    ['a pirate missing one eye', ['one eye', 'pirate']],
    ['a robot lacking ears', ['ears', 'robot']],
    ['a man free of tattoos', ['tattoos', 'man']],
    ['a beard-free face with blue eyes', ['beard', 'blue eyes']],
    // os certos e os seguros dela (volta 3)
    ['a beard, not long', ['beard', 'long']],
    ['a robot that is not big', ['robot', 'big']],
    ['an orange robot. Not round.', ['orange robot', 'round']],
    ['neither hat nor scarf', ['hat', 'scarf']],
    ['a robot (no ears) with blue eyes', ['blue eyes']],
    ['wearing nothing but a red scarf', ['red scarf']],
    ['a captain, none other than the hero, in a blue coat', ['blue coat']],
    ['não é um cachorro, sem orelhas', ['orelhas']],
    ['não usa nenhum chapéu', ['chapéu']],
    ['sem nenhum chapéu nem óculos', ['óculos']],
    ['no es un perro sino un robot, sin orejas', ['robot']],
    ['não é um cachorro mas um robô', ['robô']],
    ['um velho que nunca usa chapéu', ['velho', 'chapéu']],
    ['a man who doesn’t wear glasses, don’t ask', ['glasses']],
    ['A MAN WITH NO HAT', ['man', 'Hat']],
    ['not only a red scarf but also a hat', ['red scarf']],
    ['a no-nonsense librarian with round glasses', ['round glasses']],
    ['a man, no hat - just a red coat', ['red coat']],
    ['wearing none other than his blue coat', ['blue coat']],
    // os da volta 4 dela (os 3 do topo e as variações)
    ['a robot without ears, a tail, and an antenna', ['antenna', 'tail']],
    ['a man without a hat, a scarf, and a coat', ['coat']],
    ['un hombre sin sombrero, gafas, y una bufanda', ['bufanda']],
    ['never wears a hat, a scarf, and a tie', ['tie']],
    ['a woman with no glasses, earrings, and a hat', ['hat']],
    ['without his hat, in the rain, gloves', ['gloves']],
    ['not a toy, small round orange robot with big blue eyes', ['small round orange robot', 'big blue eyes']],
    ['small round orange robot with big blue eyes, no hat', ['small round', 'big blue eyes']], // negação no fim: também não julga
    ['cannot hide his red beard', ['red beard']],
    ['missing nothing, a red hat', ['red hat']],
    ['a knight with no fear and silver armor', ['silver armor']],
    ['NOT A DOG, A ROBOT WITH BLUE EYES', ['robot with blue eyes']],
    ['sem coleira, com lenço vermelho', ['lenço vermelho']],
    ['sin collar, con pañuelo rojo', ['pañuelo rojo']],
    ['a robot, no ears, blue eyes', ['blue eyes']],
    ['lack of hair, a red cap', ['red cap']],
    ['sugar-free candy robot, orange', ['orange']],
    ['a hands-free robot, blue', ['blue']],
    ['sem chapéu, sem óculos, e um cachecol', ['cachecol']],
  ]
  for (const [autor, tracos] of COM_NEGACAO) {
    assert.equal(j.temNegacao(autor), true, 'negação em "' + autor + '"')
    for (const traco of tracos) assert.equal(j.tracoDoAutor(traco, autor), false, traco + ' em "' + autor + '"')
  }
  const SEM_NEGACAO = [
    ['small round orange robot with big blue eyes', [['small round', true], ['Big Blue Eyes', true], ['blue eye', false], ['robot with big', true], ['dog ears', false], ['not round', false]]], // Bolt
    ['small robot with blue eyes', [['with', false], ['a', false], ['with blue', true], ['no', false], ['not small', false]]], // palavra vazia sozinha
    ['a hatless man', [['hat', false], ['hatless man', true]]],
    ['a free spirit with red hair', [['red hair', true]]], // "free" sem "of" e sem hífen
    ['a carefree girl in a yellow dress', [['yellow dress', true]]],
    ['big, blue eyes', [['big blue eyes', true]]],
    ['a big, blue-eyed robot', [['big blue eyed robot', true]]],
    ['Orange Robot', [['orange robot', true]]],
    ['a small, round, orange robot', [['small round orange robot', true], ['round', true]]],
    ['tall man, gray beard, navy coat', [['gray beard', true], ['navy coat', true]]],
    ['menina de 8 anos, cabelo cacheado, vestido amarelo', [['cabelo cacheado', true], ['vestido amarelo', true]]],
    ['bearded inventor in an 1880s suit', [['bearded inventor', true], ['1880s suit', true]]], // Le Prince
    ['old bearded sailor', [['old bearded sailor', true]]], // Slocum
    ['man in a dark suit and black tie', [['dark suit', true], ['black tie', true]]], // Cooper
    ['golden retriever with a red bandana', [['golden retriever', true], ['red bandana', true]]], // Juno
    ['gray-bearded old keeper in a navy coat', [['gray bearded', true], ['navy coat', true]]], // Elias com aspas
    ['   ', [['hat', false]]],
  ]
  for (const [autor, cs] of SEM_NEGACAO) {
    assert.equal(j.temNegacao(autor), false, 'sem negação em "' + autor + '"')
    for (const [traco, deve] of cs) assert.equal(j.tracoDoAutor(traco, autor), deve, traco + ' em "' + autor + '"')
  }
  { // a folha CERTA de um autor que nega: "dog: no", "ears: no", "hat: no" e até "small: no" não reprovam; nada vai ao FLUX; meio e contagem seguem julgados
    const D = 'small round orange robot, not a dog, with no ears and without a hat'
    const negados = ['dog', 'ears', 'hat', 'a hat'].map(trait => ({ trait, category: 'species', visible: 'no' }))
    igual(j.decidirDaFolha(ler({ ...BOLT_CERTO, traits: [...BOLT_CERTO.traits.slice(0, 4), ...negados] }), false, D), { tracos: 'ok', meio: 'ok', ausentes: [], descartados: 8, forma: 'nao_julgada', especie: null }, 'negação do autor: a folha certa serve')
    igual(j.decidirDaFolha(ler({ ...LEITURA_BOLT, traits: [...LEITURA_BOLT.traits.slice(0, 4), ...negados] }), false, D), { tracos: 'ok', meio: 'ok', ausentes: [], descartados: 8, forma: 'nao_julgada', especie: null }, 'nenhum traço julgado: nem "small: no" reprova')
    igual(j.decidirDaFolha(ler({ ...BOLT_CERTO, characters: 2 }), false, D).tracos, 'mais_de_um', 'a contagem segue julgada')
    igual(j.decidirDaFolha(ler({ ...BOLT_CERTO, characters: 0 }), false, D).tracos, 'nenhum')
    igual(j.decidirDaFolha(ler({ ...BOLT_CERTO, medium: 'photo_or_realistic_render' }), false, D).meio, 'meio', 'o meio segue julgado')
    igual(j.decidirDaFolha(ler({ medium: 'photo_or_realistic_render', characters: 1, traits: [{ trait: 'beard', category: 'feature', visible: 'no' }, { trait: 'tall', category: 'size', visible: 'no' }] }), true, 'tall man with no beard'), { tracos: 'ok', meio: 'ok', ausentes: [], descartados: 2, forma: 'nao_julgada', especie: null }, '"with no beard": nem barba nem altura julgadas')
  }
  assert.equal(j.instrucaoDaFolhaNova(j.decidirDaFolha(ler({ ...LEITURA_BOLT, traits: [...LEITURA_BOLT.traits, ...inventados] }), false, DB), 'stylized 3D animated film look'), ' Exactly as the author wrote, clearly visible: small; round. Rendered in stylized 3D animated film look.')
  assert.equal(j.instrucaoDaFolhaNova(j.decidirDaFolha(ler({ ...BOLT_CERTO, characters: 0 }), false, DB), 'stylized 3D animated film look'), ' Exactly one character alone in the frame. Rendered in stylized 3D animated film look.')
  // (2) sem descrição do autor, a biografia lida como traço "no" não reprova (Slocum, Elias do cedd1250)
  const BIO = { medium: 'photo_or_realistic_render', characters: 1, traits: [{ trait: 'the first man to sail around the world alone', category: 'feature', visible: 'no' }, { trait: 'kept the old lighthouse alone for thirty years', category: 'feature', visible: 'no' }] }
  igual(j.decidirDaFolha(ler(BIO), true, j.descricaoParaOJuiz(PROVADOS[1])).tracos, 'ok', 'Slocum: biografia não é traço')

  // 5. o laço e a tolerância (custo: leituras a 0,001 cada no falso + a folha nova a 0,015)
  const fila = (...rs) => { const q = [...rs]; return async () => { const r = q.shift(); return r === undefined ? assert.fail('leitura a mais') : r } }
  const chamada = o => ({ leitura: o ? ler(o) : null, custoUsd: 0.001, erro: o ? null : 'resposta_ilegivel' })
  const gerou = []
  const gerar = url => async (instrucao) => { gerou.push(instrucao); return url }
  const args = (ficha, fotorreal) => ({ ficha, url: 'https://x.org/folha-1.png', filmeFotorreal: fotorreal, lookPhrase: fotorreal ? 'photorealistic' : 'stylized 3D animated film look' })
  const NOVA = 'https://x.org/nova.png', C2 = Math.round((0.002 + FOLHA_USD) * 1e6) / 1e6, C1N = Math.round((0.001 + FOLHA_USD) * 1e6) / 1e6
  const caso = async (ficha, fotorreal, leituras, url = NOVA) => { const r = await j.julgarAFolha(args(ficha, fotorreal), { ler: fila(...leituras.map(chamada)), gerar: gerar(url) }); return [r.url, r.relato] }
  const rel = (o) => ({ tipo: 'criatura', tracos: 'ok', meio: 'ok', serve: true, tentativa: 1, regerou: false, custo_usd: 0.001, tracos_1: 'ok', meio_1: 'ok', descartados: 0, tracos_nao_julgados: null, ...o })
  { // [volta 5] ficha com negação: serve de primeira mesmo com "small: no"; o relato grava tracos_nao_julgados: 'negacao'; meio errado ainda regera
    const NEGA = { ...BOLT, canonica: 'Bolt, exactly as the author wrote: "small round orange robot, not a dog"; drawn in the film\'s own look' }
    assert.equal(j.descricaoParaOJuiz(NEGA), 'small round orange robot, not a dog')
    igual(await caso(NEGA, false, [LEITURA_BOLT]), ['https://x.org/folha-1.png', rel({ descartados: 5, tracos_nao_julgados: 'negacao' })], 'negação: nenhum traço julgado, a folha serve')
    gerou.length = 0
    igual(await caso(NEGA, false, [{ ...LEITURA_BOLT, medium: 'photo_or_realistic_render' }, LEITURA_BOLT]), [NOVA, rel({ tentativa: 2, regerou: true, custo_usd: C2, meio_1: 'meio', descartados: 10, tracos_nao_julgados: 'negacao' })], 'o meio segue julgado')
    igual(gerou, [' Rendered in stylized 3D animated film look.'], 'nada de "clearly visible" com negação')
    gerou.length = 0
  }
  igual(await caso(BOLT, false, [BOLT_CERTO]), ['https://x.org/folha-1.png', rel({})], 'passa de primeira')
  gerou.length = 0
  igual(await caso(BOLT, false, [{ ...LEITURA_BOLT, traits: [...LEITURA_BOLT.traits, ...inventados] }, BOLT_CERTO]), [NOVA, rel({ tentativa: 2, regerou: true, custo_usd: C2, tracos_1: 'forma_especie', descartados: 4 })], 'Bolt: a folha nova serve; a 1ª leitura e os descartes ficam no relato')
  igual(gerou, [' Exactly as the author wrote, clearly visible: small; round. Rendered in stylized 3D animated film look.'], '(1) a folha nova leva só palavras do autor')
  igual(await caso(BOLT, false, [LEITURA_BOLT, LEITURA_BOLT]), [null, rel({ tracos: 'forma_especie', serve: false, tentativa: null, regerou: true, custo_usd: C2, tracos_1: 'forma_especie' })], 'traços reprovados 2 vezes: não serve')
  igual(await caso(BOLT, false, [{ ...BOLT_CERTO, characters: 0 }, { ...BOLT_CERTO, characters: 0 }]), [null, rel({ tracos: 'nenhum', serve: false, tentativa: null, regerou: true, custo_usd: C2, tracos_1: 'nenhum' })], '(3) sem personagem 2 vezes: não serve')
  igual(await caso(EMBER, true, [EMBER_CARTUM, EMBER_CARTUM]), [NOVA, rel({ meio: 'meio_tolerado', tentativa: 2, regerou: true, custo_usd: C2, meio_1: 'meio', descartados: 4 })], 'criatura em animação num filme de foto: meio_tolerado')
  igual(await caso(BOLT, true, [BOLT_CERTO, { ...BOLT_CERTO, traits: BOLT_CERTO.traits.map(t => t.trait === 'orange' ? { ...t, visible: 'no' } : t) }]), [null, rel({ tracos: 'traco', meio: 'meio', serve: false, tentativa: null, regerou: true, custo_usd: C2, meio_1: 'meio' })], 'criatura com meio E traço errados na 2ª: sem tolerância')
  igual(await caso({ ...EMBER, tipo: 'animal' }, true, [EMBER_CARTUM, EMBER_CARTUM]), [NOVA, rel({ tipo: 'animal', meio: 'meio_tolerado', tentativa: 2, regerou: true, custo_usd: C2, meio_1: 'meio', descartados: 4 })])
  igual(await caso(ELIAS, true, [ELIAS_DESENHO, ELIAS_DESENHO]), [null, rel({ tipo: 'humano', meio: 'meio', serve: false, tentativa: null, regerou: true, custo_usd: C2, meio_1: 'meio' })], 'pessoa em desenho num filme de foto: não serve')
  igual(await caso(EMBER, false, [EMBER_REALISTA, EMBER_REALISTA]), [null, rel({ meio: 'meio', serve: false, tentativa: null, regerou: true, custo_usd: C2, meio_1: 'meio', descartados: 4 })], 'folha foto num filme desenhado: não serve, nunca')
  igual(await caso(BOLT, false, [null]), [null, rel({ tracos: 'sem_leitura', meio: 'sem_leitura', serve: false, tentativa: null, tracos_1: 'sem_leitura', meio_1: 'sem_leitura' })], 'não julgada = não serve')
  igual(await caso(BOLT, false, [LEITURA_BOLT, null]), [null, rel({ tracos: 'sem_leitura', meio: 'sem_leitura', serve: false, tentativa: null, regerou: true, custo_usd: C2, tracos_1: 'forma_especie' })], 'a 2ª sem leitura: não serve')
  igual(await caso(BOLT, false, [LEITURA_BOLT], null), [null, rel({ tracos: 'forma_especie', serve: false, tentativa: null, custo_usd: C1N, tracos_1: 'forma_especie' })], 'a folha nova pedida e não saída: custo gravado')
  igual(Object.keys((await j.julgarAFolha(args(BOLT, false), { ler: fila(chamada(BOLT_CERTO)), gerar: gerar(NOVA) })).relato), ['tipo', 'tracos', 'meio', 'serve', 'tentativa', 'regerou', 'custo_usd', 'tracos_1', 'meio_1', 'descartados', 'tracos_nao_julgados'], 'o claim: só código e número')
  // (2) os 3 filmes provados da manhã continuam ligando: a folha fotorreal deles serve de primeira, mesmo com a biografia lida como "no"
  for (const prov of PROVADOS) {
    const d = j.descricaoParaOJuiz(prov)
    const tracos = [...(d ? d.split(/\s+in\s+|\s+and\s+/).map(t => ({ trait: t, category: 'feature', visible: 'yes' })) : []), { trait: 'the first man to sail around the world alone', category: 'feature', visible: 'no' }, { trait: 'a man', category: 'species', visible: 'no' }]
    const [url, r] = await caso({ ...prov, tipo: 'humano' }, true, [{ medium: 'photo_or_realistic_render', characters: 1, traits: tracos }])
    assert.equal(url, 'https://x.org/folha-1.png', prov.nome + ': serve'); assert.equal(r.tentativa, 1, prov.nome)
  }

  // 6. a rota: a casa julga; cliente, 'off', herdada, fora do grátis e o ensaio do personagem fixo = nenhuma chamada
  { const folhaDe = new Map([['Bolt', 'https://x.org/folha-bolt.png']])
    const leituras = [chamada(LEITURA_BOLT), chamada(BOLT_CERTO)]
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [BOLT], look: 'animated3d', ler: async () => leituras.shift(), gerar: async () => 'https://x.org/folha-bolt-2.png' })
    assert.equal(folhaDe.get('Bolt'), 'https://x.org/folha-bolt-2.png', 'a folha nova é a folha do filme'); igual([...r.folhasReprovadas2411], [])
    igual(r.juizDaFolhaRelato2411.map(x => [x.tentativa, x.serve]), [[2, true]]) }
  { const folhaDe = new Map([['Bolt', 'https://x.org/folha-bolt.png']])
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [BOLT], look: 'animated3d', ler: async () => chamada(LEITURA_BOLT), gerar: async () => 'https://x.org/folha-bolt-2.png' })
    assert.equal(folhaDe.get('Bolt'), 'https://x.org/folha-bolt.png', 'reprovada: o caminho de hoje fica com a folha de hoje'); igual([...r.folhasReprovadas2411], ['Bolt']) }
  { const folhaDe = new Map([['Ember', 'https://x.org/folha-ember.png']])
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [EMBER], look: 'photoreal', ler: async () => chamada(EMBER_CARTUM), gerar: async () => 'https://x.org/folha-ember-2.png' })
    igual([...r.folhasReprovadas2411], [], 'Ember: meio tolerado, serve'); assert.equal(r.juizDaFolhaRelato2411[0].meio, 'meio_tolerado') }
  { const folhaDe = new Map([['Joshua Slocum', 'https://x.org/folha-slocum.png']])
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [{ ...PROVADOS[1], protagonista: true }], look: 'photoreal', ler: async () => chamada(BIO), gerar: async () => assert.fail('Slocum não regera') })
    igual([...r.folhasReprovadas2411], [], '(2) Slocum pela rota: serve'); assert.equal(folhaDe.get('Joshua Slocum'), 'https://x.org/folha-slocum.png') }
  { const folhaDe = new Map([['Ember', 'https://x.org/folha-ember.png']])
    const r = await julgarNaRota(route, j, { email: CASA, folhaDe, elencoP: [EMBER], look: 'animated3d', ler: async () => chamada(EMBER_REALISTA), gerar: async () => 'https://x.org/folha-ember-2.png' })
    igual([...r.folhasReprovadas2411], ['Ember'], 'filme desenhado (o look da rota), folha foto: não serve') }
  for (const [nome, o] of [['cliente', { email: CLIENTE }], ['herdada', { email: CASA, herdada: {} }], ['fora do grátis', { email: CASA, candidato: false }], ['personagem fixo', { email: CASA, fixo: true }]]) {
    const folhaDe = new Map([['Bolt', 'https://x.org/folha-bolt.png']])
    const r = await julgarNaRota(route, j, { folhaDe, elencoP: [BOLT], ler: async () => assert.fail(nome + ': nenhuma leitura'), gerar: async () => assert.fail(nome + ': nenhuma folha'), ...o })
    assert.equal(r.juizDaFolhaRelato2411, null, nome); assert.equal(r.folhasReprovadas2411.size, 0, nome)
  }
  { const folhaDe = new Map([['Bolt', 'https://x.org/folha-bolt.png']])
    const r = await julgarNaRota(route, { ...j, JUIZ_DA_FOLHA_2411: 'off' }, { email: CASA, folhaDe, elencoP: [BOLT], ler: async () => assert.fail('off: nenhuma leitura'), gerar: async () => assert.fail('off') })
    assert.equal(r.juizDaFolhaRelato2411, null) }

  // 7. o retrato da admissão sem a folha reprovada (e sem a imagem-chave dela): nada reprovado = o MESMO objeto
  const snap = { version: 'v', sourceGenerationId: 'x', characters: [BOLT], characterReferences: [{ nome: 'Bolt', url: 'https://x.org/f.png' }], approvedStills: [{ url: 'https://x.org/k.png', characterNames: ['Bolt'] }, { url: 'https://x.org/k2.png', characterNames: ['Zip'] }] }
  assert.equal(j.retratoSemFolhaReprovada2411(snap, new Set()), snap); assert.equal(j.retratoSemFolhaReprovada2411(snap, null), snap); assert.equal(j.retratoSemFolhaReprovada2411(null, new Set(['Bolt'])), null)
  const sem = j.retratoSemFolhaReprovada2411(snap, new Set(['Bolt']))
  igual([sem.characterReferences, sem.approvedStills.map(s => s.url)], [[], ['https://x.org/k2.png']]); igual(snap.characterReferences.length, 1, 'o retrato do filme não muda')
  assert.ok(route.includes('retratoSemFolhaReprovada2411(retratoDaReferencia2411(qualitySnapshot, folhasDaReferencia2411, folhaDaReferenciaLigada(FOLHA_DA_REFERENCIA_2411, user.email)), folhasReprovadas2411)'), 'a admissão lê o retrato sem a folha reprovada')
  assert.ok(route.includes('...(juizDaFolhaRelato2411 ? { kling4_juiz_da_folha: { versao: JUIZ_DA_FOLHA_2411_VERSAO, folhas: juizDaFolhaRelato2411 } } : {})'), 'o claim conta o juiz (só quando rodou)')

  // 8. (J11) o prazo da leitura é 8 s: o setTimeout que lerAFolha arma, lido sem esperar
  { const prazos = []
    const jt = load(source, { AbortController, setTimeout: (fn, ms) => { prazos.push(ms); return 0 }, clearTimeout: () => {} })('@/' + modulo)
    await jt.lerAFolha('small round', 'https://x.org/f.png', { apiKey: 'falsa', fetchImpl: async () => ({ ok: false, status: 429 }) })
    igual(prazos, [8000], 'o prazo da leitura é 8 s') }
}

await suite(null)
const mutants = [
  [modulo, "export const JUIZ_DA_FOLHA_2411: ModoJuizDaFolha2411 = 'internal'", "export const JUIZ_DA_FOLHA_2411: ModoJuizDaFolha2411 = 'public'"], // escapa para o cliente
  [modulo, "modo === 'internal' && contaDaCasaExata(email)", "modo === 'internal'"],
  [modulo, ": forma.length ? 'forma_especie' :", ':'], // o cachorro-robô vira só traço
  [modulo, "ausentes(['species', 'shape', 'size'])", "ausentes(['species'])"], // forma e tamanho não contam
  [modulo, "outros.length ? 'traco' : 'ok'", "'ok'"],
  [modulo, "(filmeFotorreal ? cartum : l.meio === 'photo_or_realistic_render') ? 'meio' : 'ok'", "'ok'"], // o meio não conta
  [modulo, "(filmeFotorreal ? cartum : l.meio === 'photo_or_realistic_render') ? 'meio' : 'ok'", "(filmeFotorreal ? l.meio === 'photo_or_realistic_render' : cartum) ? 'meio' : 'ok'"],
  [modulo, "l.personagens > 1 ? 'mais_de_um' : ", ''],
  [modulo, "t.visivel === 'no' && cats.includes(t.categoria)", "t.visivel !== 'yes' && cats.includes(t.categoria)"], // "unclear" reprova
  [modulo, "  if (!r1.leitura) return fim(null, null, null, null, false)", "  if (!r1.leitura) return fim(args.url, null, null, 1, false)"], // a folha não julgada serve
  [modulo, "  if (!r2.leitura) return fim(null, null, null, null, true)\n", "  if (!r2.leitura) return fim(nova, null, null, 2, true)\n"],
  [modulo, "  return fim(null, v2, null, null, true)\n}", "  return fim(nova, v2, null, 2, true)\n}"], // a 2ª reprovada serve
  [modulo, "v2.tracos === 'ok' && formaPassa(v2)", "formaPassa(v2)"],
  [modulo, "v2.meio === 'meio' && args.filmeFotorreal && (tipo === 'animal' || tipo === 'criatura')", "v2.meio === 'meio' && (tipo === 'animal' || tipo === 'criatura')"],
  [modulo, "args.filmeFotorreal && (tipo === 'animal' || tipo === 'criatura')", "args.filmeFotorreal"],
  [modulo, "if (v2.tracos === 'ok' && formaPassa(v2) /* KINEO-FORMA-DA-FOLHA-2511 */ && v2.meio === 'meio' && args.filmeFotorreal && (tipo === 'animal' || tipo === 'criatura'))", 'if (false)'],
  [modulo, "return fim(nova, v2, 'meio_tolerado', 2, true)", 'return fim(nova, v2, null, 2, true)'],
  [modulo, "Exactly as the author wrote, clearly visible: ${v.ausentes.join('; ')}.", 'Better character.'],
  [modulo, ".filter((r) => !reprovadas.has(r?.nome))", ''],
  [modulo, ".filter((s) => !(Array.isArray(s?.characterNames) && s.characterNames.some((n) => reprovadas.has(n))))", ''],
  // v3 — os bloqueios e os vivos da revisora
  [modulo, 'const doAutor = l.tracos.filter((t) => tracoDoAutor(t.traco, descricao))', 'const doAutor = l.tracos'], // (1) o texto livre do modelo decide e vai à folha nova
  // [volta 5] a regra única e cada família da lista
  [modulo, ' || temNegacao(descricao)) return false', ') return false'], // a regra ignorada
  [modulo, 'return ws.some((w, i) =>', 'return ws.slice(0, 1).some((w, i) =>'], // só a 1ª palavra conferida
  [modulo, "'no', 'not', 'without', 'never', 'non', 'nor', 'none', 'neither', 'nothing', 'sans', 'missing', 'lacking', 'lacks', 'lack',", ''], // família: inglês
  [modulo, "'dont', 'doesnt', 'isnt', 'arent', 'wasnt', 'werent', 'cant', 'cannot', 'wont', 'didnt', 'hasnt', 'havent',", ''], // família: n't sem apóstrofo
  [modulo, " || /n't$/.test(w)", ''], // família: n't com apóstrofo
  [modulo, "'sem', 'não', 'nao', 'nem', 'nunca', 'jamais', 'nenhum', 'nenhuma',", ''], // família: português
  [modulo, "'sin', 'ni', 'jamás', 'ningún', 'ninguno', 'ninguna'", ''], // família: espanhol
  [modulo, " || (w === 'free' && ws[i + 1] === 'of')", ''], // família: free of
  [modulo, " || /[\\p{L}\\p{N}]-free(?![\\p{L}\\p{N}])/u.test(minusculo(texto))", ''], // família: -free
  [modulo, "/[\\p{L}\\p{N}]-free(", "/free("], // -free sem hífen ("a free spirit", "carefree" negariam)
  [modulo, "'without', ", ''], // palavra a palavra: without
  [modulo, "'missing', ", ''], // missing
  [modulo, "'lacking', ", ''], // lacking
  [modulo, "'doesnt', ", ''], // doesnt
  [modulo, "'sem', ", ''], // sem
  [modulo, ", 'nunca', ", ', '], // nunca
  [modulo, ", 'jamais', ", ', '], // jamais
  [modulo, "'sin', ", ''], // sin
  [modulo, ", 'jamás', ", ', '], // jamás
  [modulo, ".replace(/’/g, \"'\")", ''], // apóstrofo curvo
  [modulo, ' || k.every((w) => VAZIAS.has(w))', ''], // "with" sozinho vira traço
  [modulo, 'if (k.every((w, j) => autor[i + j] === w)) return true', 'if (k.some((w, j) => autor[i + j] === w)) return true'], // basta uma palavra do traço
  [modulo, "tracos_nao_julgados: temNegacao(descricao) ? 'negacao' as const : null", 'tracos_nao_julgados: null'], // o relato não conta a negação
  [modulo, "  return limpa(descricaoDoAutor(ficha.canonica) ?? '')", "  return limpa(descricaoDoAutor(ficha.canonica) ?? String(ficha.canonica ?? '').split(';')[0])"], // (2) a biografia vira traço
  [modulo, "l.personagens < 1 ? 'nenhum' : ", ''], // (3) folha sem personagem passa
  [modulo, "v.tracos === 'mais_de_um' || v.tracos === 'nenhum' ?", "v.tracos === 'mais_de_um' ?"], // (3) a folha nova não pede o personagem
  [modulo, '  custo += PERSONAGEM_FOLHA_USD // a folha nova (FLUX) é paga quando pedida, saia ou não\n', ''], // a folha nova fora do custo
  [modulo, "tracos_1: v1 ? v1.tracos : 'sem_leitura' as const", "tracos_1: 'ok' as const"], // a 1ª leitura fora do relato
  [modulo, '  if (!o || typeof o !== \'object\') return null\n', '  if (!o || typeof o !== \'object\') return null\n  if (o.verdict === \'PASS\') return { meio: \'other\', personagens: 1, tracos: [] }\n'], // J2: o veredito pronto do modelo
  [modulo, 'export const JUIZ_DA_FOLHA_TIMEOUT_MS = 8_000', 'export const JUIZ_DA_FOLHA_TIMEOUT_MS = 80_000'], // J11
  [routeFile, '        for (const j of julgadas) { if (j.url) folhaDe.set(j.nome, j.url); else folhasReprovadas2411.add(j.nome) }', '        for (const j of julgadas) { if (j.url) folhaDe.set(j.nome, j.url) }'],
  [routeFile, '        for (const j of julgadas) { if (j.url) folhaDe.set(j.nome, j.url); else', '        for (const j of julgadas) { if (false) folhaDe.set(j.nome, j.url); else'],
  [routeFile, 'if (juizDaFolhaLigado(JUIZ_DA_FOLHA_2411, user.email) && kling4TrialCandidate && !qualidadeHerdada', 'if (kling4TrialCandidate && !qualidadeHerdada'], // o cliente paga a leitura
  [routeFile, ' && !ensaioPersonagemFixo /* [revisora, v3] o ensaio do personagem fixo fica como hoje */', ''], // o juiz roda no ensaio do personagem fixo
  [routeFile, 'filmeFotorreal: !isStylizedLook(styleAnchor) && !desenhoInfantil.ativo,', 'filmeFotorreal: true,'],
]
let mortos = 0
for (const mutant of mutants) {
  for (const [de] of Array.isArray(mutant[1]) ? mutant[1] : [[mutant[1]]]) assert.ok(local(mutant[0]).includes(de), 'mutante não aplica: ' + de)
  await assert.rejects(suite(mutant), err => err instanceof assert.AssertionError, 'SOBREVIVEU: ' + mutant[1])
  mortos++
}
console.log(`PASS KINEO-JUIZ-DA-FOLHA-2411 v5: descrição do autor com QUALQUER negação = nenhum traço julgado (tracos_nao_julgados: 'negacao'), meio e contagem seguem; 'internal' (só a casa exata); por eixo; só traço do AUTOR conta e vai à folha nova (inventado e negação descartados); sem descrição do autor os traços não julgam (Le Prince, Slocum e Cooper servem); folha sem personagem reprova; custo com a folha nova; 1ª leitura no relato; veredito pronto ignorado; prazo 8 s; personagem fixo, cliente, 'off', herdada e fora do grátis = nenhuma chamada; ${mortos}/${mutants.length} mutantes mortos.`)
