// KINEO-FICHA-SEM-NOME-2511 · KINEO-FORMA-DA-FOLHA-2511 · KINEO-SONDA-DA-FOLHA-2511 — guardião que EXECUTA as três peças com a rede FALSA (nada sai da máquina):
//   1. a folha sem o nome próprio (lib/cinematic/folhaDePersonagem canonicaSemNome / quemNaFolha / promptDaFolha) e o interruptor
//      (lib/cinematic/fichaSemNome2511); os 2 trechos REAIS da rota que pedem a folha (a folha do filme e a folha nova do conferente);
//   2. a pergunta de FORMA do conferente (lib/cinematic/juizDaFolha2411), que fica 'sonda' (fora do filme);
//   3. a sonda da casa (lib/cinematic/sondaDaFolha2511 e app/api/admin/sonda-folha), com o modo "só ler".
// A base é a origin/main (c76e0badc, a sonda no ar): os módulos dela são lidos por `git show` e executados lado a lado.
// Volta 3 [CEO 25/11]: a sonda das 04:02 provou que o NOME é a causa (2 de 2 sementes) → a casa pede a folha sem o nome ('internal'), com os 3 defeitos do
// §4 da revisora fechados (o sujeito, as aspas intocadas, gênero e idade). O cliente continua byte a byte a main. A pergunta de forma abstrata errou 2 de 2
// (o leitor disse "corpo yes, outra no" nas cabeças de bicho): sai, e entram perguntas concretas da cabeça; continua fora do filme até a sonda de leitura
// provar nas 4 folhas que já existem. As leituras abaixo são o que EU (Opus 5.5) vi em sonda/QUATRO-FICHAS.jpg, no formato novo: provam a REGRA, não o
// gpt-4o-mini (isso só o modo "só ler" da sonda prova, ≈ US$ 0,0006 por folha).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const F = 'lib/cinematic/folhaDePersonagem.ts', SN = 'lib/cinematic/fichaSemNome2511.ts', J = 'lib/cinematic/juizDaFolha2411.ts', SO = 'lib/cinematic/sondaDaFolha2511.ts'
const routeFile = 'app/api/generate-video-cinematic/route.ts', sondaRoute = 'app/api/admin/sonda-folha/route.ts'
const local = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n')
// KINEO-FORMA-NOS-FILMES-2511: a base deste guardião fica FIXA na af8af5c13 (a main de antes da volta 5). Com a volta 5 publicada (5b924b758) a origin/main já
// tem a ficha por tipo e o conferente sem profissão, e cada "= a main" daqui passaria a comparar o código com ele mesmo (e o "defeito, reproduzido" quebraria).
const BASE_DO_GUARDIAO = 'af8af5c13'
const daMain = file => execSync(`git show ${BASE_DO_GUARDIAO}:${file}`, { encoding: 'utf8', maxBuffer: 64 << 20 }).replaceAll('\r\n', '\n')
const GLOBALS = { AbortSignal, AbortController, setTimeout, clearTimeout }
const load = (source) => createOfflineLoader({ source, globals: GLOBALS })
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
const CASA = 'josephsskaf@gmail.com', CLIENTE = 'cliente@example.org'

const MAIN = { [F]: daMain(F), [J]: daMain(J) }
const main = load((file, src) => MAIN[file.replaceAll('\\', '/')] ?? src)
const FM = main('@/' + F), JM = main('@/' + J)

const LOOK = { lookPhrase: 'stylized 3D animated film look' }
// a ficha e o look EXATOS da sonda das 04:02 (parecer §3, os 4 corpos)
const LOOK_DA_PROVA = { lookPhrase: 'stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic' }
const ficha = (nome, tipo, genero, canonica) => ({ nome, nucleo: nome, tipo, protagonista: true, origem: 'autor', genero, canonica })
const BOLT = ficha('Bolt', 'criatura', null, 'Bolt, exactly as the author wrote: "small round orange robot with big blue eyes"; drawn in the film\'s own look (stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic), the same character design in every scene')
const ELIAS = ficha('Elias', 'humano', 'man', 'Elias, kept the old lighthouse alone for thirty years, exactly as the author wrote; appearance anchors: 50-60, gray, short, clean-shaven, light skin, wearing button-up shirt; a real person')
const MARA = ficha('Mara Quinn', 'humano', 'woman', 'Mara Quinn, a young radio operator; Mara wears an olive green suit')
const PRINCE = ficha('Louis Le Prince', 'humano', 'man', 'Louis Le Prince, exactly as the author wrote: "bearded inventor in an 1880s suit"')
const EMBER = ficha('Ember', 'criatura', null, 'Ember, an anthropomorphic dragon character: a small green dragon with leathery wings')
const BOY = ficha('the boy', 'humano', 'man', 'the boy, a sad Indian boy of about 8')
const autor = (nome, tipo, genero, texto) => ficha(nome, tipo, genero, `${nome}, exactly as the author wrote: "${texto}"`)
// Volta 4 [CEO 25/11 05:02, DECISAO-FICHA-SEM-NOME-2511]: o código não adivinha o ser — o nome vira "this character" (gente com gênero conhecido: "this male
// character" / "this female character"). [rótulo, ficha, a canônica sem nome ESPERADA, inteira]. As da revisora são as que o parecer dela lista (§4 da 1ª
// volta e §1 da volta 3; o parecer não enumera as 67 uma a uma); as minhas vêm das voltas 2 e 3.
const M = 'this male character', W = 'this female character', X = 'this character'
const pelaAutora = (quem, texto) => `${quem}, exactly as the author wrote: "${texto}"`
const A = (rotulo, nome, tipo, genero, texto, quem) => [rotulo, autor(nome, tipo, genero, texto), pelaAutora(quem, texto)]
const CASOS_V4 = [
  // da revisora — a regra do sujeito errava o ser; agora não há ser a errar
  A('Jack pirata (man)', 'Jack', 'humano', 'man', 'a pirate with a parrot on his shoulder', M),
  A('Jack pirata (sem gênero)', 'Jack', 'humano', null, 'a pirate with a parrot on his shoulder', X),
  ['Jack sem aspas', ficha('Jack', 'humano', 'man', 'Jack, a pirate with a parrot on his shoulder'), `${M}, a pirate with a parrot on his shoulder`],
  A('Jack parrot-loving', 'Jack', 'humano', 'man', 'a parrot-loving pirate', M),
  A('Lia hugging', 'Lia', 'humano', null, 'a girl hugging a teddy bear', X),
  A('Lia cuddling', 'Lia', 'humano', 'woman', 'a girl cuddling a teddy bear', W),
  A('Rose-gold', 'Rose', 'humano', 'woman', 'a little girl with Rose-gold curls', W),
  ['Mara Quinn', MARA, `${W}, a young radio operator; ${W} wears an olive green suit`],
  ['Mara cedd1250', ficha('Mara', 'humano', 'woman', 'Mara, caught a faint call on the radio, exactly as the author wrote; appearance anchors: 20-30, long wavy brown, clean-shaven, light skin, wearing olive green suit; a real person'),
    `${W}, caught a faint call on the radio, exactly as the author wrote; appearance anchors: 20-30, long wavy brown, clean-shaven, light skin, wearing olive green suit; a real person`],
  ['Mara cedd1250 (sem gênero)', ficha('Mara', 'humano', null, 'Mara, caught a faint call on the radio, exactly as the author wrote'), `${X}, caught a faint call on the radio, exactly as the author wrote`],
  A('Pip', 'Pip', 'animal', null, 'a tiny mouse in a giant world', X),
  A('Rex sonha', 'Rex', 'animal', null, 'a dog who dreams of being a dragon', X),
  A('Nina guarda-chuva', 'Nina', 'humano', 'woman', 'a woman with a giant red umbrella', W),
  A('Sir Kay', 'Sir Kay', 'humano', 'man', 'a knight on a white horse', M),
  A('pescador (man)', 'Finn', 'humano', 'man', 'a tall old fisherman', M),
  A('pescador (sem gênero)', 'Finn', 'humano', null, 'a tall old fisherman', X),
  A('bat boy', 'Babe', 'humano', 'man', 'a bat boy for the Yankees', M),
  ['Wolf of Wall Street (man)', ficha('Jordan', 'humano', 'man', 'Jordan, the Wolf of Wall Street, a broker'), `${M}, the Wolf of Wall Street, a broker`],
  ['Wolf of Wall Street (sem gênero)', ficha('Jordan', 'humano', null, 'Jordan, the Wolf of Wall Street, a broker'), `${X}, the Wolf of Wall Street, a broker`],
  A('hawk-eyed', 'Sam', 'humano', null, 'a hawk-eyed detective', X),
  A('cat burglar', 'Max', 'humano', null, 'a cat burglar in black', X),
  ['Hope (dez anos)', ficha('Hope', 'humano', 'woman', 'Hope walks to school; Hope is ten'), `${W} walks to school; ${W} is ten`],
  ['Will (will minúsculo fica)', ficha('Will', 'humano', 'man', 'Will, a boy who will win; Will smiles'), `${M}, a boy who will win; ${M} smiles`],
  ['Mark (marks fica)', ficha('Mark', 'humano', 'man', 'Mark, a man who marks the walls; Mark wears a cap'), `${M}, a man who marks the walls; ${M} wears a cap`],
  ['Ana Clara', ficha('Ana', 'humano', 'woman', 'Ana, a girl; Ana Clara is her sister'), `${W}, a girl; ${W} Clara is her sister`],
  ['possessivo reto', ficha('Bolt', 'criatura', null, 'Bolt, a small robot; Bolt\'s eyes are blue'), `${X}, a small robot; ${X}'s eyes are blue`],
  ['possessivo curvo', ficha('Bolt', 'criatura', null, 'Bolt, a small robot; Bolt’s eyes are blue'), `${X}, a small robot; ${X}’s eyes are blue`],
  ['nome BOLT', ficha('BOLT', 'criatura', null, 'BOLT, a small robot'), `${X}, a small robot`],
  ['Олег', ficha('Олег', 'humano', 'man', 'Олег, a fisherman'), `${M}, a fisherman`],
  ['Zork', ficha('Zork', 'criatura', null, 'Zork, a small glowing thing'), `${X}, a small glowing thing`],
  ['Rex companheiro', ficha('Rex', 'animal', null, 'Rex, a friendly companion'), `${X}, a friendly companion`],
  ['Kai cabelo', ficha('Kai', 'humano', null, 'Kai, with black hair'), `${X}, with black hair`],
  ['Leo little boy', ficha('Leo', 'humano', 'man', 'Leo, a little boy'), `${M}, a little boy`],
  ['Lia 8 anos', ficha('Lia', 'humano', 'woman', 'Lia, an 8-year-old girl'), `${W}, an 8-year-old girl`],
  ['Bea bebê', ficha('Bea', 'humano', 'woman', 'Bea, a baby with a pink bow'), `${W}, a baby with a pink bow`],
  ['Kai 7 anos (a idade fica no texto)', ficha('Kai', 'humano', 'man', 'Kai, a 7-year-old with curly hair'), `${M}, a 7-year-old with curly hair`],
  ['Kai aged 7', ficha('Kai', 'humano', 'man', 'Kai, aged 7, curly hair'), `${M}, aged 7, curly hair`],
  ['Nina nurse (elenco man)', ficha('Nina', 'humano', 'man', 'Nina, a nurse'), `${M}, a nurse`],
  ['Nina nurse (sem gênero)', ficha('Nina', 'humano', null, 'Nina, a nurse'), `${X}, a nurse`],
  A('cat chasing a mouse', 'Tom', 'animal', null, 'a cat chasing a mouse', X),
  A('dog chasing a cat', 'Rex', 'animal', null, 'a dog chasing a cat', X),
  A('fox stalking a rabbit', 'Red', 'animal', null, 'a fox stalking a rabbit', X),
  A('robot fighting a dragon', 'Bolt', 'criatura', null, 'a robot fighting a dragon', X),
  A('robot fixing radios', 'Bolt', 'criatura', null, 'a robot fixing old radios', X),
  A('mother cradling', 'May', 'humano', 'woman', 'a mother cradling her baby', W),
  A('grandmother stroller', 'Ruth', 'humano', 'woman', 'a grandmother pushing a baby stroller', W),
  A('father reading', 'Joe', 'humano', 'man', 'a father reading to his son', M),
  A('woman teaching', 'Ann', 'humano', 'woman', 'a woman teaching a boy to swim', W),
  ['aspas que não são do autor (curvas)', ficha('Rose', 'humano', 'woman', 'Rose, a girl with “Rose” written on her shirt'), `${W}, a girl with “Rose” written on her shirt`],
  ['aspas que não são do autor (retas)', ficha('Bolt', 'criatura', null, 'Bolt, a robot. "Bolt" is written on him'), `${X}, a robot. "Bolt" is written on him`],
  A('nome só nas aspas do autor (limite declarado)', 'Bolt', 'criatura', null, 'Bolt is a small orange robot', X),
  A('Cooper', 'Cooper', 'humano', 'man', 'man in a dark suit and black tie', M),
  ['Le Prince', PRINCE, pelaAutora(M, 'bearded inventor in an 1880s suit')],
  ['Slocum', ficha('Joshua Slocum', 'humano', 'man', 'Joshua Slocum, the first man to sail around the world alone; as the request describes: "old bearded sailor"'), `${M}, the first man to sail around the world alone; as the request describes: "old bearded sailor"`],
  ['Elias', ELIAS, ELIAS.canonica.replace(/^Elias/, M)],
  ['Ember', EMBER, EMBER.canonica.replace(/^Ember/, X)],
  A('Juno', 'Juno', 'animal', null, 'golden retriever with a red bandana', X),
  A('Tom e o cachorro', 'Tom', 'humano', 'man', 'a boy walking his dog', M),
  A('Leo fantasia', 'Leo', 'humano', 'man', 'a boy in a dinosaur costume', M),
  A('Angel wings', 'Angel', 'humano', 'woman', 'Angel wings on her back', W),
  A('birth Mark', 'Mark', 'humano', 'man', 'a man with a birth Mark on his cheek', M),
  ['Sky-blue e Sky-themed', ficha('Sky', 'humano', null, 'Sky, exactly as the author wrote: "a girl with Sky-blue eyes"; Sky-themed room'), `${X}, exactly as the author wrote: "a girl with Sky-blue eyes"; Sky-themed room`],
  A('born in March', 'Jo March', 'humano', 'woman', 'a girl born in March', W),
  ['Jo (parte de 2 letras fica)', ficha('Jo March', 'humano', 'woman', 'Jo March, a girl; Jo wears a hat; March loves books'), `${W}, a girl; Jo wears a hat; ${W} loves books`],
  A('Bolt logo', 'Bolt', 'criatura', null, 'a robot with a Bolt logo on his chest', X),
  ['Al (o nome inteiro de 2 letras troca)', ficha('Al', 'humano', 'man', 'Al, a man; Al smiles'), `${M}, a man; ${M} smiles`],
  // as minhas
  ['Bolt', BOLT, BOLT.canonica.replace(/^Bolt/, X)],
  ['Bolt (sem aspas)', ficha('Bolt', 'criatura', null, 'Bolt, small round orange robot with big blue eyes, exactly as the author wrote'), `${X}, small round orange robot with big blue eyes, exactly as the author wrote`],
  ['Max (fronteira)', ficha('Max', 'animal', null, 'Max, a dog from Maxwell Street'), `${X}, a dog from Maxwell Street`],
  ['Zed', ficha('Zed', 'criatura', null, 'Zed, a tall pirate'), `${X}, a tall pirate`],
  ['Fang', ficha('Fang', 'criatura', null, 'Fang, a shadow wolf'), `${X}, a shadow wolf`],
  A('Nora', 'Nora', 'humano', 'woman', 'a little girl detective', W),
  A('Granny', 'Granny', 'humano', 'woman', 'an elderly woman knitting', W),
  A('Kip plural', 'Kip', 'animal', null, 'two puppies', X),
  ['Nina (o nome dentro das aspas curvas fica)', ficha('Nina', 'humano', 'woman', 'Nina, exactly as the author wrote: “Nina wears a red hat”'), `${W}, exactly as the author wrote: “Nina wears a red hat”`],
  ['Nina (aspas curvas)', ficha('Nina', 'humano', 'woman', 'Nina, exactly as the author wrote: “a woman with a giant red umbrella”'), `${W}, exactly as the author wrote: “a woman with a giant red umbrella”`],
  ['Rex (gênero de bicho não entra)', ficha('Rex', 'animal', 'man', 'Rex, a brave dog'), `${X}, a brave dog`],
  ['Bolt (gênero de criatura não entra)', ficha('Bolt', 'criatura', 'woman', 'Bolt, a small robot'), `${X}, a small robot`],
  ['Mary-Jane (o nome com hífen troca inteiro)', ficha('Mary-Jane', 'humano', 'woman', 'Mary-Jane, a girl; Mary-Jane wears red'), `${W}, a girl; ${W} wears red`],
  ['Mary-Jane (a parte "Mary" sozinha fica)', ficha('Mary-Jane', 'humano', 'woman', 'Mary-Jane, a girl; Mary wears red'), `${W}, a girl; Mary wears red`],
  ['Anna (Ann não casa dentro de Anna)', ficha('Ann', 'humano', 'woman', "Ann, a girl; Anna's sister"), `${W}, a girl; Anna's sister`],
  ['JoAnn (Ann não casa no fim de outra palavra)', ficha('Ann', 'humano', 'woman', 'Ann, a girl; JoAnn and Lee-Ann are her friends'), `${W}, a girl; JoAnn and Lee-Ann are her friends`],
  ['Maxine (Max não casa dentro de Maxine)', ficha('Max', 'humano', 'man', 'Max, a boy; Maxine is his friend'), `${M}, a boy; Maxine is his friend`],
  ['Louis Le Prince (as partes)', ficha('Louis Le Prince', 'humano', 'man', 'Louis Le Prince, an inventor; Louis builds a camera; Prince smiles; Le Havre'), `${M}, an inventor; ${M} builds a camera; ${M} smiles; Le Havre`],
  ['Sir Kay (parte de 3 letras troca)', ficha('Sir Kay', 'humano', 'man', 'Sir Kay, a knight; Kay rides a horse'), `${M}, a knight; ${M} rides a horse`],
  ['Dr. Ross', ficha('Dr. Ross', 'humano', 'woman', 'Dr. Ross, a doctor; Ross wears a coat'), `${W}, a doctor; ${W} wears a coat`],
  ['C-3PO', ficha('C-3PO', 'criatura', null, 'C-3PO, a golden robot'), `${X}, a golden robot`],
  ['Zoë', ficha('Zoë', 'humano', 'woman', 'Zoë, a dancer'), `${W}, a dancer`],
  ['Bolt (nome no fim da frase)', ficha('Bolt', 'criatura', null, 'a robot named Bolt'), `a robot named ${X}`],
  ['Bolt-like (hífen depois)', ficha('Bolt', 'criatura', null, 'Bolt, a robot; a Bolt-like antenna'), `${X}, a robot; a Bolt-like antenna`],
  ['Bolt maiúsculo no texto (caixa diferente fica)', ficha('Bolt', 'criatura', null, 'Bolt, a robot; BOLT on his chest'), `${X}, a robot; BOLT on his chest`],
  ['duas aspas do autor', ficha('Mia', 'humano', 'woman', 'Mia, exactly as the author wrote: "Mia smiles"; as the request describes: "a girl named Mia"'), `${W}, exactly as the author wrote: "Mia smiles"; as the request describes: "a girl named Mia"`],
  ['nome em toda parte fora das aspas', ficha('Gus', 'animal', null, 'Gus, a pug; Gus runs; Gus\'s bed; Gus.'), `${X}, a pug; ${X} runs; ${X}'s bed; ${X}.`],
  ['Marta (gênero de gente sem aspas)', ficha('Marta', 'humano', 'woman', 'Marta, 50-60, gray hair'), `${W}, 50-60, gray hair`],
]
// Volta 5 [CEO 25/11, sonda 2: a Mara sem gênero virou rapaz]: gente SEM gênero no elenco mantém o nome — a canônica fica byte a byte a de hoje.
const semGenero = f => f.tipo === 'humano' && f.genero !== 'man' && f.genero !== 'woman'
const CASOS = CASOS_V4.map(([r, f, e]) => (semGenero(f) ? [r + ' — gente sem gênero: o nome fica', f, f.canonica] : [r, f, e]))
const IGUAIS = [BOY, ficha('The Captain', 'humano', 'man', 'The Captain, an old sailor'), ficha('Nemo', 'animal', null, 'a small orange fish with white stripes'), ficha('boy', 'humano', null, 'boy, a sad boy of about 8'),
  ficha('Rose', 'humano', 'woman', 'exactly as the author wrote: "Rose wears a red coat"'), // o nome SÓ dentro das aspas: fica (o texto do autor não é tocado)
  ficha('Bolt', 'criatura', null, 'BOLT, a small robot'), // a caixa diferente não troca (anotação da revisora)
  ficha('ハナ', 'humano', 'woman', 'ハナ, a girl')] // escrita sem maiúscula: não é tratada como nome próprio (anotação da revisora)

// as leituras das 4 folhas da sonda (o que eu vi em QUATRO-FICHAS.jpg), no formato novo
const TRACOS_SIM = ['small', 'round', 'orange', 'robot', 'big blue eyes'].map((trait, i) => ({ trait, category: ['size', 'shape', 'color', 'species', 'feature'][i], visible: 'yes', appearance: 'yes' }))
const DB0 = 'small round orange robot with big blue eyes'
const leituraJson = (head) => JSON.stringify({ medium: 'cartoon_3d', characters: 1, traits: TRACOS_SIM, ...(head ? { head_check: head } : {}) })
const C1_CAO = { resembles: 'dog', animal_ears: 'yes', nose: 'yes', snout_or_muzzle: 'yes', fur: 'no' } // c1: orelhas caídas, focinho, nariz preto
const C3_BICHO = { resembles: 'cat', animal_ears: 'yes', nose: 'yes', snout_or_muzzle: 'no', fur: 'no' } // c3: orelhas pontudas, nariz pequeno
const ROBO = { resembles: 'robot', animal_ears: 'no', nose: 'no', snout_or_muzzle: 'no', fur: 'no' } // c2 e c4
const VELHA = { body_and_head_match: 'yes', other_kind_parts: 'no' } // a resposta das 04:02, no formato antigo

function trechoDaRota(route, ini, fim) { const a = route.indexOf(ini); const b = route.indexOf(fim, a); assert.ok(a > 0 && b > a, 'trecho não achado: ' + ini.slice(0, 60)); return route.slice(a, b) }

async function suite(change) {
  const pares = change ? (Array.isArray(change[1]) ? change[1] : [[change[1], change[2]]]) : []
  const source = (file, src) => change && file.replaceAll('\\', '/') === change[0] ? pares.reduce((t, [de, para]) => t.split(de).join(para), src) : src
  const m = load(source)
  const L = m('@/' + F), S = m('@/' + SN), j = m('@/' + J), so = m('@/' + SO)
  const route = source(routeFile, local(routeFile)), rotaSonda = source(sondaRoute, local(sondaRoute))

  // ── 1. a folha sem o nome: "this [male|female] character", sem adivinhar o ser ───────────────────────────────────────────────────────────
  for (const [caso, f, esperado] of CASOS) assert.equal(L.canonicaSemNome(f), esperado, caso)
  for (const f of IGUAIS) assert.equal(L.canonicaSemNome(f), f.canonica, 'fica igual: ' + f.canonica)
  for (const [caso, f] of CASOS) { const aspas = f.canonica.match(/"[^"]*"|“[^”]*”/g) ?? [], r = L.canonicaSemNome(f); for (const a of aspas) assert.ok(r.includes(a), caso + ': aspas intocadas') }
  assert.ok(CASOS.length >= 90, 'as fichas da revisora e as minhas')
  igual([L.quemNaFolha({ tipo: 'humano', genero: 'man' }), L.quemNaFolha({ tipo: 'humano', genero: 'woman' }), L.quemNaFolha({ tipo: 'humano', genero: null }), L.quemNaFolha({ tipo: 'humano' }),
    L.quemNaFolha({ tipo: 'animal', genero: 'man' }), L.quemNaFolha({ tipo: 'criatura', genero: 'woman' })], [M, W, X, X, X, X], 'o gênero só para gente; nada de ser, idade ou profissão')
  // o prompt: sem o pedido = a main; com o pedido = a main com a canônica nova
  for (const f of [...CASOS.map(c => c[1]), ...IGUAIS]) {
    assert.equal(L.promptDaFolha(f, LOOK), FM.promptDaFolha(f, LOOK), 'byte a byte com a main: ' + f.nome)
    assert.equal(L.promptDaFolha(f, LOOK, false), FM.promptDaFolha(f, LOOK))
    assert.equal(L.promptDaFolha(f, null), FM.promptDaFolha(f, null))
    assert.equal(L.promptDaFolha(f, LOOK, true), FM.promptDaFolha({ ...f, canonica: L.canonicaSemNome(f) }, LOOK), 'sem nome: só a canônica muda')
  }
  assert.ok(L.promptDaFolha(BOLT, LOOK_DA_PROVA, true).includes('nobody else: this character, exactly as the author wrote: "small round orange robot with big blue eyes"'), 'o Bolt que a CEO vai provar na sonda')
  assert.ok(!/\bBolt\b/.test(L.promptDaFolha(BOLT, LOOK, true)) && L.promptDaFolha(BOLT, LOOK).includes('nobody else: Bolt, exactly as the author wrote'))

  // o interruptor: 'off' neste commit (o texto novo ainda não foi provado)
  assert.equal(S.FICHA_SEM_NOME_2511, 'internal', 'volta 5: a casa pede a folha sem o nome onde a sonda provou')
  assert.ok(CASOS.filter(c => semGenero(c[1])).length >= 8 && CASOS.filter(c => semGenero(c[1])).every(([, f, e]) => e === f.canonica), 'gente sem gênero: o nome fica')
  assert.equal(S.fichaSemNomeLigada('internal', CASA), true)
  for (const e of [CLIENTE, 'joseph@usekineo.com', 'xjosephsskaf@gmail.com', '', null, undefined]) assert.equal(S.fichaSemNomeLigada('internal', e), false, String(e))
  assert.equal(S.fichaSemNomeLigada('off', CASA), false)
  assert.equal(S.fichaSemNomeLigada('public', CLIENTE), true)

  // a rota: a chave nasce antes do bloco; as 2 folhas a recebem; nenhuma folha sem ela
  const linha = trechoDaRota(route, '    const folhaSemNome2511 = ', '\n')
  assert.ok(route.indexOf(linha) < route.indexOf('    // >>> KINEO-META95-PERSONAGEM-2010 bloco'), 'a chave nasce antes do bloco')
  const chave = (email) => Function('fichaSemNomeLigada', 'FICHA_SEM_NOME_2511', 'user', ts.transpile(linha + '\nreturn folhaSemNome2511'))(S.fichaSemNomeLigada, S.FICHA_SEM_NOME_2511, { email })
  assert.equal(chave(CASA), true); assert.equal(chave(CLIENTE), false); assert.equal(chave(null), false)
  assert.equal(route.split('promptDaFolha(f, styleAnchor, folhaSemNome2511)').length - 1, 2, 'as 2 folhas (a do filme e a nova do conferente)')
  assert.equal(route.split('promptDaFolha(f, styleAnchor)').length - 1, 0, 'nenhuma folha com o nome por esquecimento')
  const folhaDoFilme = trechoDaRota(route, '      const folhasP = await Promise.all(', '\n')
  const pedirFolhas = async (folhaSemNome2511, elencoP) => {
    const pedidos = []
    const corpo = ts.transpile('return (async () => {\n' + folhaDoFilme + '\nreturn folhasP })()', { target: ts.ScriptTarget.ES2022 })
    const folhas = await Function('elencoP', 'qualidadeHerdada', 'referenciaDaCena', 'generateCinematicSceneStill', 'promptDaFolha', 'styleAnchor', 'folhaSemNome2511', 'generationSeed', 'aspectRequested', 'aplicarEpocaVisual', 'epocaVisual', 'visualParaImagemOuReserva', corpo)(
      elencoP, null, () => assert.fail('herdada'), async (a) => { pedidos.push(a); return 'https://x.org/folha.png' }, L.promptDaFolha, LOOK, folhaSemNome2511, 7, '9:16', createOfflineLoader()('@/lib/cinematic/epocaVisual2411').aplicarEpocaVisual, null, texto => texto)
    assert.equal(folhas.length, elencoP.length)
    return pedidos
  }
  const MARA_SEM = { ...MARA, genero: null }, ELENCO = [BOLT, MARA, MARA_SEM, ELIAS]
  const casa = await pedirFolhas(chave(CASA), ELENCO), cliente = await pedirFolhas(chave(CLIENTE), ELENCO), ligada = await pedirFolhas(true, [BOLT, MARA])
  igual(casa.map(p => p.scenePrompt), [L.promptDaFolha(BOLT, LOOK, true), L.promptDaFolha(MARA, LOOK, true), FM.promptDaFolha(MARA_SEM, LOOK), L.promptDaFolha(ELIAS, LOOK, true)], 'a casa: criatura e gente com gênero sem o nome; gente sem gênero = a main')
  assert.ok(casa[0].scenePrompt.includes('nobody else: this character, exactly') && casa[1].scenePrompt.includes('nobody else: this female character,') && casa[2].scenePrompt.includes('nobody else: Mara Quinn,') && casa[3].scenePrompt.includes('nobody else: this male character, kept'))
  igual(cliente.map(p => p.scenePrompt), ELENCO.map(f => FM.promptDaFolha(f, LOOK)), 'cliente: byte a byte o da main')
  igual(ligada.map(p => p.scenePrompt), [L.promptDaFolha(BOLT, LOOK, true), L.promptDaFolha(MARA, LOOK, true)], 'a chave ligada (depois da sonda): a folha sem o nome')
  assert.ok(ligada.every(p => !/\b(?:Bolt|Mara|Quinn)\b/.test(p.scenePrompt)) && ligada[1].scenePrompt.includes('nobody else: this female character, a young radio operator; this female character wears'))
  igual(cliente.map(p => [p.seed, p.styleSuffix, p.pollWindowMs, p.aspect]), casa.map(p => [p.seed, p.styleSuffix, p.pollWindowMs, p.aspect]), 'só o texto muda')
  const juizNaRota = trechoDaRota(route, '      if (juizDaFolhaLigado(JUIZ_DA_FOLHA_2411, user.email) && kling4TrialCandidate && !qualidadeHerdada', '        juizDaFolhaRelato2411 = julgadas.map((j) => j.relato)\n')
  const folhaNova = async (folhaSemNome2511, primeira) => {
    const gerados = []
    const ler = async (d, url) => ({ leitura: j.lerLeituraDaFolha(url.includes('nova') ? leituraJson(ROBO) : primeira), custoUsd: 0.001, erro: null })
    const corpo = ts.transpile('return (async () => {\n' + juizNaRota + '\n} return null })()', { target: ts.ScriptTarget.ES2022 })
    await Function('juizDaFolhaLigado', 'JUIZ_DA_FOLHA_2411', 'user', 'kling4TrialCandidate', 'qualidadeHerdada', 'ensaioPersonagemFixo', 'folhaDe', 'elencoP', 'julgarAFolha', 'isStylizedLook', 'styleAnchor', 'desenhoInfantil', 'lerAFolha',
      'generateCinematicSceneStill', 'promptDaFolha', 'generationSeed', 'aspectRequested', 'folhasReprovadas2411', 'folhaSemNome2511', 'aplicarEpocaVisual', 'epocaVisual', 'formaNoFilme', 'FORMA_DA_FOLHA_2511', 'visualParaImagemOuReserva', corpo)(
      j.juizDaFolhaLigado, j.JUIZ_DA_FOLHA_2411, { email: CASA }, true, null, false, new Map([['Bolt', 'https://x.org/folha.png']]), [BOLT], j.julgarAFolha, () => true, LOOK, { ativo: false }, ler,
      async (a) => { gerados.push(a.scenePrompt); return 'https://x.org/nova.png' }, L.promptDaFolha, 7, '9:16', new Set(), folhaSemNome2511, createOfflineLoader()('@/lib/cinematic/epocaVisual2411').aplicarEpocaVisual, null, j.formaNoFilme, j.FORMA_DA_FOLHA_2511, texto => texto)
    return gerados
  }
  const SEM_SMALL = JSON.stringify({ medium: 'cartoon_3d', characters: 1, traits: TRACOS_SIM.map(t => t.trait === 'small' ? { ...t, visible: 'no' } : t) })
  igual(await folhaNova(chave(CASA), leituraJson(C1_CAO)), [], 'a leitura sem head_check (a forma no filme é do test-forma-nos-filmes-2511): nada reprova pela forma')
  igual(await folhaNova(chave(CASA), SEM_SMALL), [L.promptDaFolha(BOLT, LOOK, true) + ' Exactly as the author wrote, clearly visible: small. Rendered in stylized 3D animated film look.'], 'a casa: a folha nova sem o nome')
  igual(await folhaNova(true, SEM_SMALL), [L.promptDaFolha(BOLT, LOOK, true) + ' Exactly as the author wrote, clearly visible: small. Rendered in stylized 3D animated film look.'], 'a chave ligada: a folha nova sem o nome')
  igual(await folhaNova(false, SEM_SMALL), [FM.promptDaFolha(BOLT, LOOK) + ' Exactly as the author wrote, clearly visible: small. Rendered in stylized 3D animated film look.'], "sem a chave: a folha nova da main")

  // ── 1b. o conferente sem profissão (KINEO-JUIZ-SEM-PROFISSAO-2511): as leituras REAIS da sonda 2, ficha CERTA ───────────────────────────
  const DM = 'young red-haired radio operator in a green sweater, cargo pants and brown boots', DE = 'gray-bearded lighthouse keeper in a navy coat'
  const tr = (trait, category, visible, appearance) => ({ trait, category, visible, ...(appearance ? { appearance } : {}) })
  const MARA_REAL = [tr('young', 'feature', 'yes'), tr('red-haired', 'color', 'yes'), tr('radio operator', 'feature', 'no'), tr('green sweater', 'clothing', 'yes'), tr('cargo pants', 'clothing', 'yes'), tr('brown boots', 'clothing', 'yes')]
  const ELIAS_REAL = [tr('gray-bearded', 'feature', 'yes'), tr('lighthouse keeper', 'species', 'no'), tr('navy coat', 'clothing', 'yes')]
  const foto = (traits) => j.lerLeituraDaFolha(JSON.stringify({ medium: 'photo_or_realistic_render', characters: 1, traits }))
  const decGente = (traits, d, tipo = 'humano') => j.decidirDaFolha(foto(traits), true, d, undefined, tipo)
  // a leitura real, como veio (formato antigo, sem "appearance"): não julga papel → a ficha certa serve. Na main ela reprovava.
  igual([decGente(MARA_REAL, DM).tracos, decGente(ELIAS_REAL, DE).tracos], ['ok', 'ok'], 'Mara e Elias reais: a ficha certa serve')
  igual([JM.decidirDaFolha(JM.lerLeituraDaFolha(JSON.stringify({ medium: 'photo_or_realistic_render', characters: 1, traits: MARA_REAL })), true, DM).tracos,
    JM.decidirDaFolha(JM.lerLeituraDaFolha(JSON.stringify({ medium: 'photo_or_realistic_render', characters: 1, traits: ELIAS_REAL })), true, DE).tracos], ['traco', 'forma_especie'], 'o defeito, reproduzido na main')
  // o formato novo
  const MARA_NOVA = MARA_REAL.map(t => ({ ...t, appearance: t.trait === 'radio operator' ? 'no' : 'yes' }))
  igual(decGente(MARA_NOVA, DM).tracos, 'ok', 'profissão com appearance "no": não julga')
  igual(decGente(MARA_NOVA.map(t => t.trait === 'radio operator' ? { ...t, category: 'role', appearance: 'yes' } : t), DM).tracos, 'ok', 'categoria "role": nunca julga')
  igual(decGente(ELIAS_REAL.map(t => ({ ...t, appearance: 'yes' })), DE).tracos, 'ok', '"species" de gente nunca vira forma_especie')
  igual(decGente(ELIAS_REAL.map(t => ({ ...t, appearance: 'yes' })), DE, 'criatura').tracos, 'forma_especie', '"species" de bicho e criatura continua julgada')
  igual(decGente(ELIAS_REAL.map(t => ({ ...t, appearance: 'yes', visible: t.trait === 'navy coat' ? 'no' : t.visible })), DE), { tracos: 'traco', meio: 'ok', ausentes: ['navy coat'], descartados: 0, forma: 'nao_julgada', especie: null }, 'a aparência errada continua reprovando')
  igual(decGente(MARA_NOVA.map(t => t.trait === 'radio operator' ? { ...t, appearance: 'yes' } : t), DM).tracos, 'traco', 'limite: profissão que o modelo marca como aparência ainda reprova (só a sonda "ler" mede)')
  igual(decGente(MARA_REAL.map(t => ({ ...t, appearance: 'unclear' })), DM).tracos, 'ok', '"unclear" não julga')
  // a leitura conferida: o campo novo e a categoria nova
  igual(j.lerLeituraDaFolha(JSON.stringify({ medium: 'cartoon_3d', characters: 1, traits: [tr('radio operator', 'role', 'no', 'no'), tr('red', 'color', 'yes', 'yes'), tr('x', 'color', 'yes', 'maybe')] })).tracos,
    [{ traco: 'radio operator', categoria: 'role', visivel: 'no', aparencia: 'no' }, { traco: 'red', categoria: 'color', visivel: 'yes', aparencia: 'yes' }, { traco: 'x', categoria: 'color', visivel: 'yes', aparencia: 'unclear' }])
  const pedido = j.pedidoAoJuizDaFolha(DM, 'https://x.org/f.png').messages[0].content
  for (const k of ['"appearance": "yes" | "no"', '"role"', 'job, occupation, role, activity or age', 'one full-body picture of the character alone on a plain studio background']) assert.ok(pedido.includes(k), k)
  assert.ok(!/e\.g\.|for example|such as|like this|FAIL|reject/i.test(pedido), 'sem exemplo e sem ordem de reprovar')
  // o laço inteiro, com a rede falsa (o corpo da OpenAI e a resposta real): Mara e Elias servem de primeira, sem folha nova; o Bolt c1 (traços todos "yes") serve no filme
  const MARA_F = autor('Mara Quinn', 'humano', 'woman', DM), ELIAS_F = autor('Elias Ward', 'humano', 'man', DE)
  for (const [f, traits, d] of [[MARA_F, MARA_REAL, DM], [ELIAS_F, ELIAS_REAL, DE], [ELIAS_F, ELIAS_REAL.map(t => ({ ...t, appearance: 'yes' })), DE], [MARA_F, MARA_NOVA, DM], [BOLT, TRACOS_SIM, DB0]]) {
    const novas = [], conteudo = JSON.stringify({ medium: f.tipo === 'humano' ? 'photo_or_realistic_render' : 'cartoon_3d', characters: 1, traits })
    const r = await j.julgarAFolha({ ficha: f, url: 'https://x.org/f.png', filmeFotorreal: f.tipo === 'humano', lookPhrase: 'x' }, {
      ler: (descricao, url) => j.lerAFolha(descricao, url, { apiKey: 'k', fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: conteudo } }], usage: { prompt_tokens: 100, completion_tokens: 50 } }) }) }),
      gerar: async (i) => { novas.push(i); return 'https://x.org/nova.png' } })
    igual([r.url, r.relato.tracos, r.relato.tentativa, novas.length, j.descricaoParaOJuiz(f)], ['https://x.org/f.png', 'ok', 1, 0, d], 'serve de primeira: ' + f.nome)
  }

  // ── 2. a FORMA ('internal' desde KINEO-FORMA-NOS-FILMES-2511): perguntas concretas da cabeça; robô e gente ──────────────────────────────────────────────────────────────
  assert.equal(j.FORMA_DA_FOLHA_2511, 'internal')
  igual([j.formaNaSonda(), j.formaNaSonda('sonda'), j.formaNaSonda('on'), j.formaNaSonda('off')], ['on', 'on', 'on', 'off'])
  for (const [d, e] of [['small round orange robot with big blue eyes', 'robot'], ['small round orange robots', 'robot'], ['old bearded sailor', 'person'], ['man in a dark suit and black tie', 'person'],
    ['a red dragon with big wings', null], ['a golden dog with a red bandana', null], ['a robot dog', null], ['a cat-like robot', null], ['a robot-like toy', null], ['half man half wolf', null], ['a half-robot', null], ['a robot hybrid', null],
    ['a teddy bear', null], ['a toy robot', null], ['a humanoid robot', null], ['an android butler', null], ['a man in a bear costume', null], ['a tin man', null], ['a gingerbread man', null], ['a robot with human hands', null],
    ['a robot and a dragon', null], ['small round orange robot, not a dog', null], ['', null], ['a boy riding a horse', null]]) assert.equal(j.especieDaDescricao(d, 'on'), e, d)
  for (const modo of [undefined, 'sonda', 'internal', 'off']) assert.equal(j.especieDaDescricao('small round orange robot', modo), null, 'sem o modo do filme (formaNoFilme) não pergunta: ' + modo)
  const DB = 'small round orange robot with big blue eyes'
  // o pedido: sem dizer o ser esperado; sem exemplo; sem ser = a main
  const sistema = j.pedidoAoJuizDaFolha(DB, 'https://x.org/f.png', 'robot').messages[0].content
  for (const k of ['"head_check"', '"resembles"', '"animal_ears"', '"nose"', '"snout_or_muzzle"', '"fur"', 'never clothing, headwear, accessories or objects']) assert.ok(sistema.includes(k), k)
  assert.ok(!/robot|kind_check|e\.g\.|for example|such as|like this|FAIL|reject/i.test(sistema), 'o pedido não diz o ser esperado, nem exemplo, nem ordem de reprovar')
  const semProfissao = (t) => t.replace(', "role"', '').replace('"appearance": "yes" | "no", ', '').replace(', and each job, occupation, role, activity or age)', ' and garment)').replace(', named feature, garment', ', named feature').replace(/ "role" is the category[^]*?accessory\./, '')
  for (const d of [DB, '', 'old bearded sailor']) { const a = j.pedidoAoJuizDaFolha(d, 'https://x.org/f.png'), b = JM.pedidoAoJuizDaFolha(d, 'https://x.org/f.png')
    igual(a.messages[1], b.messages[1], 'o texto do autor e a imagem = a main: ' + d); assert.equal(semProfissao(a.messages[0].content), b.messages[0].content, 'o sistema = a main mais o papel e a aparência: ' + d) }
  // a leitura
  for (const raw of [leituraJson(null), leituraJson(VELHA), leituraJson({ ...ROBO, resembles: '' }), leituraJson({ ...ROBO, resembles: 7 }), leituraJson({ ...ROBO, nose: 'maybe' }), leituraJson({ ...ROBO, fur: undefined }), leituraJson('yes')])
    { const l = j.lerLeituraDaFolha(raw, true); assert.ok(l && l.forma === null && l.tracos.length === 5, 'volta 2 da forma: sem head_check legível, a leitura fica e a forma é null: ' + raw) }
  igual(j.lerLeituraDaFolha(leituraJson({ ...C1_CAO, resembles: '  Dog ' }), true).forma, { parecido: 'dog', orelhas: 'yes', nariz: 'yes', focinho: 'yes', pelo: 'no' })
  const semAparencia = (l) => l && { ...l, tracos: l.tracos.map(({ aparencia, ...t }) => t) }
  for (const raw of [leituraJson(null), leituraJson(C1_CAO), leituraJson(VELHA)]) igual(semAparencia(j.lerLeituraDaFolha(raw)), JM.lerLeituraDaFolha(raw), 'não perguntada = a main (mais a aparência de cada traço)')
  // a decisão: as 4 folhas da sonda
  const dec = (head, d = DB) => j.decidirDaFolha(j.lerLeituraDaFolha(leituraJson(head), true), false, d, 'on')
  igual([C1_CAO, C3_BICHO, ROBO, ROBO].map(h => dec(h).forma), ['outra_especie', 'outra_especie', 'ok', 'ok'], 'c1 e c3 reprovam, c2 e c4 servem')
  for (const [h, e] of [[{ ...ROBO, nose: 'yes' }, 'outra_especie'], [{ ...ROBO, fur: 'yes' }, 'outra_especie'], [{ ...ROBO, animal_ears: 'yes' }, 'outra_especie'], [{ ...ROBO, snout_or_muzzle: 'yes' }, 'outra_especie'],
    [{ ...ROBO, resembles: 'puppy dog' }, 'outra_especie'], [{ ...ROBO, resembles: 'cartoon fox' }, 'outra_especie'], [{ resembles: 'robot', animal_ears: 'unclear', nose: 'unclear', snout_or_muzzle: 'unclear', fur: 'unclear' }, 'ok']]) igual(dec(h).forma, e, JSON.stringify(h))
  const GENTE = { resembles: 'man', animal_ears: 'no', nose: 'yes', snout_or_muzzle: 'no', fur: 'yes' }
  for (const [h, e] of [[GENTE, 'ok'], [{ ...GENTE, animal_ears: 'yes' }, 'outra_especie'], [{ ...GENTE, snout_or_muzzle: 'yes' }, 'outra_especie'], [{ ...GENTE, resembles: 'wolf' }, 'outra_especie']])
    igual(dec(h, 'old bearded sailor').forma, e, 'gente: nariz e barba são de gente; ' + JSON.stringify(h))
  for (const d of ['a robot dog', 'a toy robot', '', 'a red dragon with big wings']) igual(dec(C1_CAO, d).forma, 'nao_julgada', 'não julga: ' + d)
  igual(j.decidirDaFolha(j.lerLeituraDaFolha(leituraJson(C1_CAO), true), false, DB).forma, 'nao_julgada', 'o filme não julga')
  for (const h of [C1_CAO, ROBO, null]) { const a = j.decidirDaFolha(j.lerLeituraDaFolha(leituraJson(h)), false, DB), b = JM.decidirDaFolha(JM.lerLeituraDaFolha(leituraJson(h)), false, DB)
    igual([a.tracos, a.meio, a.ausentes, a.descartados, j.folhaPassa(a), j.instrucaoDaFolhaNova(a, 'x')], [b.tracos, b.meio, b.ausentes, b.descartados, JM.folhaPassa(b), JM.instrucaoDaFolhaNova(b, 'x')], 'o veredito do filme = a main') }
  assert.equal(j.instrucaoDaFolhaNova(dec(C1_CAO), LOOK.lookPhrase), ' Its body and head are entirely those of a robot. Rendered in stylized 3D animated film look.')
  // a rede, falsa
  const rede = async (mod, descricao, conteudo, forma) => { const corpos = []; const r = await mod.lerAFolha(descricao, 'https://x.org/f.png', { apiKey: 'k', ...(forma ? { forma } : {}), fetchImpl: async (_u, o) => { corpos.push(o.body); return { ok: true, json: async () => ({ choices: [{ message: { content: conteudo } }], usage: { prompt_tokens: 100, completion_tokens: 50 } }) } } }); return { r, corpos } }
  const r1 = await rede(j, DB, leituraJson(VELHA), 'on')
  assert.ok(r1.corpos[0].includes('head_check')); igual([r1.r.leitura?.forma, r1.r.erro], [null, null], 'perguntada e não respondida: a leitura fica, sem a forma (volta 2 da forma)')
  igual((await rede(j, DB, leituraJson(C1_CAO), 'on')).r.leitura?.forma?.parecido, 'dog')
  for (const d of [DB, 'old bearded sailor', '', 'a robot dog']) { const a = await rede(j, d, leituraJson(null)), b = await rede(JM, d, leituraJson(null)); const ca = JSON.parse(a.corpos[0]), cb = JSON.parse(b.corpos[0])
    igual([ca.model, ca.temperature, ca.max_tokens, ca.response_format, ca.messages[1], semProfissao(ca.messages[0].content), semAparencia(a.r.leitura), a.r.erro], [cb.model, cb.temperature, cb.max_tokens, cb.response_format, cb.messages[1], cb.messages[0].content, b.r.leitura, b.r.erro], 'o filme: a main mais o papel e a aparência: ' + d) }
  // o laço: no filme = a main; com 'on' (2º mundo), a forma reprova e pede o corpo do robô
  const filaM = (mod, exige, ...q) => { const r = [...q]; return async () => { const k = r.shift(); assert.ok(k !== undefined, 'leitura a mais'); return { leitura: mod.lerLeituraDaFolha(leituraJson(k), exige), custoUsd: 0.001, erro: null } } }
  const arg = (foto = false) => ({ ficha: BOLT, url: 'https://x.org/folha-1.png', filmeFotorreal: foto, lookPhrase: LOOK.lookPhrase })
  for (const ks of [[C1_CAO], [ROBO], [null]]) igual(await j.julgarAFolha(arg(), { ler: filaM(j, false, ...ks), gerar: async () => 'https://x.org/nova.png' }), await JM.julgarAFolha(arg(), { ler: filaM(JM, false, ...ks), gerar: async () => 'https://x.org/nova.png' }), 'o filme = a main')
  const jOn = j // KINEO-FORMA-NOS-FILMES-2511: o laço recebe o modo do filme em args.forma
  const gerou = []
  const julgar = (ks, foto) => jOn.julgarAFolha({ ...arg(foto), forma: 'on' }, { ler: filaM(jOn, true, ...ks), gerar: async (i) => { gerou.push(i); return 'https://x.org/nova.png' } })
  let r = await julgar([C1_CAO, ROBO])
  igual([r.url, r.relato.forma, r.relato.forma_1, r.relato.tentativa], ['https://x.org/nova.png', 'ok', 'outra_especie', 2], 'cachorro na 1ª, robô na 2ª: serve a nova')
  igual(gerou, [' Its body and head are entirely those of a robot. Rendered in stylized 3D animated film look.'])
  r = await julgar([C3_BICHO, C1_CAO]); igual([r.url, r.relato.forma], [null, 'outra_especie'], 'bicho 2 vezes: não serve')
  r = await julgar([C1_CAO, C1_CAO], true); igual([r.url, r.relato.meio], [null, 'meio'], 'a tolerância do meio não salva a forma')

  // ── 3. a sonda ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const corpoOk = { nome: 'Bolt', tipo: 'criatura', canonica: BOLT.canonica, look_phrase: LOOK.lookPhrase, filme_fotorreal: false, sem_nome: true, seed: 42 }
  igual(so.lerPedidoDaSonda(corpoOk), { nome: 'Bolt', tipo: 'criatura', genero: null, canonica: BOLT.canonica, lookPhrase: LOOK.lookPhrase, filmeFotorreal: false, semNome: true, seed: 42 })
  igual(so.lerPedidoDaSonda({ ...corpoOk, genero: 'woman' }).genero, 'woman')
  for (const ruim of [null, 'x', { ...corpoOk, seed: 1.5 }, { ...corpoOk, seed: -1 }, { ...corpoOk, seed: undefined }, { ...corpoOk, tipo: 'robo' }, { ...corpoOk, sem_nome: 'sim' }, { ...corpoOk, filme_fotorreal: 1 },
    { ...corpoOk, canonica: 'x'.repeat(1201) }, { ...corpoOk, nome: '' }, { ...corpoOk, look_phrase: 'a\u0007b' }, { ...corpoOk, genero: 'mulher' }]) assert.equal(so.lerPedidoDaSonda(ruim), null, JSON.stringify(ruim)?.slice(0, 60))
  assert.notEqual(so.chaveDaSonda(so.lerPedidoDaSonda(corpoOk)), so.chaveDaSonda(so.lerPedidoDaSonda({ ...corpoOk, sem_nome: false })), 'com e sem o nome são 2 pedidos')
  assert.notEqual(so.chaveDaSonda(so.lerPedidoDaSonda(corpoOk)), so.chaveDaSonda(so.lerPedidoDaSonda({ ...corpoOk, genero: 'man' })))
  // as travas: folha e leitura com tetos próprios, a vez é uma só
  const est = so.novoEstadoDaSonda()
  assert.equal(so.admitirSonda(est, CLIENTE, 'a'), 'nao_e_da_casa'); igual([est.ocupada, est.chamadas, est.leituras, est.feitas.size], [false, 0, 0, 0])
  assert.equal(so.admitirSonda(est, CASA, 'a'), 'ok'); assert.equal(so.admitirSonda(est, CASA, 'l', 'ler'), 'ocupada', 'uma por vez, folha ou leitura'); so.liberarSonda(est)
  assert.equal(so.admitirSonda(est, CASA, 'a'), 'repetida')
  for (let i = 1; i < so.SONDA_DA_FOLHA_TETO_POR_INSTANCIA; i++) { assert.equal(so.admitirSonda(est, CASA, 'k' + i), 'ok'); so.liberarSonda(est) }
  assert.equal(so.admitirSonda(est, CASA, 'outra'), 'teto')
  for (let i = 0; i < so.SONDA_LEITURA_TETO_POR_INSTANCIA; i++) { assert.equal(so.admitirSonda(est, CASA, 'l' + i, 'ler'), 'ok', 'a leitura tem teto próprio'); so.liberarSonda(est) }
  assert.equal(so.admitirSonda(est, CASA, 'l-mais', 'ler'), 'teto'); assert.equal(so.admitirSonda(est, CASA, 'l0', 'ler'), 'repetida')
  igual([so.SONDA_DA_FOLHA_TETO_POR_INSTANCIA, so.SONDA_LEITURA_TETO_POR_INSTANCIA, est.chamadas, est.leituras], [8, 20, 8, 20])
  // a folha
  const sonda = async (corpo, respostas = {}) => {
    const log = { gerar: [], guardar: [], ler: [] }
    const res = await so.rodarSondaDaFolha(so.lerPedidoDaSonda(corpo), {
      gerar: async (p, s) => { log.gerar.push([p, s]); return 'falha' in respostas ? null : 'https://v3.fal.media/f.png' },
      guardar: async (u) => { log.guardar.push(u); return 'semBucket' in respostas ? null : 'https://nosso.bucket/f.png' },
      ler: async (d, u) => { log.ler.push([d, u]); return 'semLeitura' in respostas ? { leitura: null, custoUsd: 0.000559, erro: 'timeout' } : { leitura: j.lerLeituraDaFolha(leituraJson(C1_CAO), true), custoUsd: 0.000559, erro: null } },
    })
    return { res, log }
  }
  let s = await sonda(corpoOk)
  igual(s.log.gerar, [[L.promptDaFolha(BOLT, LOOK, true), 42]], 'UMA folha, sem o nome, com a semente pedida')
  igual(s.log.guardar, ['https://v3.fal.media/f.png']); igual(s.log.ler, [[DB, 'https://nosso.bucket/f.png']])
  igual([s.res.url, s.res.custo_usd, s.res.especie, s.res.veredito.forma, s.res.erro], ['https://nosso.bucket/f.png', 0.025559, 'robot', 'outra_especie', null], 'a sonda julga a forma (o filme não) e NÃO regera')
  s = await sonda({ ...corpoOk, nome: 'Mara Quinn', tipo: 'humano', genero: 'woman', canonica: MARA.canonica })
  assert.ok(s.log.gerar[0][0].includes('nobody else: this female character, a young radio operator; this female character wears'), 'o gênero do corpo chega à folha')
  s = await sonda({ ...corpoOk, sem_nome: false }); igual(s.log.gerar[0][0], FM.promptDaFolha(BOLT, LOOK), 'com o nome: a folha de hoje')
  s = await sonda(corpoOk, { falha: 1 }); igual([s.res.erro, s.res.custo_usd, s.log.guardar.length, s.log.ler.length], ['folha_falhou', 0.025, 0, 0])
  s = await sonda(corpoOk, { semBucket: 1 }); igual([s.res.erro, s.res.url, s.log.ler.length], ['bucket_falhou', null, 0])
  s = await sonda(corpoOk, { semLeitura: 1 }); igual([s.res.erro, s.res.veredito, s.res.custo_usd], ['timeout', null, 0.025559])
  assert.equal(so.SONDA_FOLHA_USD, 0.025); assert.equal(L.PERSONAGEM_FOLHA_USD, FM.PERSONAGEM_FOLHA_USD, 'a constante do filme não muda')
  // o modo "só ler"
  const BASE = 'https://abc.supabase.co', URL_OK = BASE + '/storage/v1/object/public/broll/ai-still/1764043320000-ab12cd.jpg'
  const lerOk = { modo: 'ler', url: URL_OK, nome: 'Bolt', tipo: 'criatura', canonica: BOLT.canonica, filme_fotorreal: false }
  igual(so.lerPedidoDeLeitura(lerOk, BASE), { url: URL_OK, nome: 'Bolt', tipo: 'criatura', canonica: BOLT.canonica, filmeFotorreal: false })
  igual(so.lerPedidoDeLeitura(lerOk, BASE + '/'), so.lerPedidoDeLeitura(lerOk, BASE), 'a base com barra no fim')
  for (const [ruim, base] of [[{ ...lerOk, modo: undefined }, BASE], [{ ...lerOk, url: 'https://v3.fal.media/f.png' }, BASE], [{ ...lerOk, url: URL_OK.replace('https:', 'http:') }, BASE], [{ ...lerOk, url: 'https://abc.supabase.co.evil.com/storage/v1/object/public/broll/x.jpg' }, BASE],
    [{ ...lerOk, url: BASE + '/storage/v1/object/public/videos/x.mp4' }, BASE], [{ ...lerOk, url: BASE + '/storage/v1/object/public/broll/../videos/x.mp4' }, BASE], [{ ...lerOk, url: URL_OK + '?x=1' }, BASE], [{ ...lerOk, url: BASE + '/storage/v1/object/public/broll/' }, BASE],
    [lerOk, ''], [lerOk, 'http://abc.supabase.co'], [{ ...lerOk, url: 'http://abc.supabase.co/storage/v1/object/public/broll/x.jpg' }, 'http://abc.supabase.co'], [{ ...lerOk, url: '/storage/v1/object/public/broll/x.jpg' }, ''], [lerOk, 'https://abc.supabase.co/x'], [{ ...lerOk, nome: '' }, BASE], [{ ...lerOk, tipo: 'robo' }, BASE], [{ ...lerOk, filme_fotorreal: 'nao' }, BASE], [{ ...lerOk, url: 'x'.repeat(601) }, BASE]])
    assert.equal(so.lerPedidoDeLeitura(ruim, base), null, JSON.stringify(ruim).slice(0, 90) + ' @ ' + base)
  assert.notEqual(so.chaveDaLeitura(so.lerPedidoDeLeitura(lerOk, BASE)), so.chaveDaLeitura(so.lerPedidoDeLeitura({ ...lerOk, url: URL_OK.replace('1.jpg', '2.jpg').replace('ab12cd', 'ab12ce') }, BASE)))
  const leia = async (head, erro) => { const log = []; const res = await so.rodarLeituraDaSonda(so.lerPedidoDeLeitura(lerOk, BASE), { ler: async (d, u) => { log.push([d, u]); return erro ? { leitura: null, custoUsd: 0.0005, erro } : { leitura: j.lerLeituraDaFolha(leituraJson(head), true), custoUsd: 0.000559, erro: null } } }); return { res, log } }
  let l = await leia(C1_CAO)
  igual(l.log, [[DB, URL_OK]], 'UMA leitura da folha que já existe; nenhuma imagem gerada')
  igual([l.res.url, l.res.especie, l.res.veredito.forma, l.res.custo_usd, l.res.erro, 'prompt' in l.res], [URL_OK, 'robot', 'outra_especie', 0.000559, null, false])
  l = await leia(ROBO); igual(l.res.veredito.forma, 'ok')
  l = await leia(null, 'resposta_ilegivel'); igual([l.res.veredito, l.res.erro, l.res.custo_usd], [null, 'resposta_ilegivel', 0.0005])
  { const p = so.lerPedidoDeLeitura({ ...lerOk, nome: 'Elias Ward', tipo: 'humano', canonica: ELIAS_F.canonica, filme_fotorreal: true }, BASE) // a sonda lê gente como gente (a profissão não reprova)
    const r = await so.rodarLeituraDaSonda(p, { ler: async () => ({ leitura: foto(ELIAS_REAL.map(t => ({ ...t, appearance: 'yes' }))), custoUsd: 0.0006, erro: null }) })
    igual([r.veredito.tracos, r.especie], ['ok', 'person'], 'Elias d4 pela sonda: serve') }
  // a rota da sonda: lida (Next não roda offline)
  { const login = rotaSonda.indexOf("if (!user) return NextResponse.json({ erro: 'nao_e_da_casa' }, { status: 403 })"); assert.ok(login > 0 && login < rotaSonda.indexOf("=== 'ler'"), 'o login antes dos dois modos') }
  assert.ok(/const admissaoLeitura = admitirSonda\(estado, user\.email, chaveDaLeitura\(leitura\), 'ler'\)\n\s+if \(admissaoLeitura !== 'ok'\) return/.test(rotaSonda), 'a trava da leitura antes da leitura')
  assert.ok(rotaSonda.indexOf('admitirSonda(estado, user.email, chaveDaLeitura') < rotaSonda.indexOf('rodarLeituraDaSonda(leitura'))
  assert.ok(/const admissao = admitirSonda\(estado, user\.email, chaveDaSonda\(pedido\)\)\n\s+if \(admissao !== 'ok'\) return/.test(rotaSonda), 'a trava da folha antes da chamada paga')
  assert.ok(rotaSonda.indexOf('admitirSonda(estado, user.email, chaveDaSonda') < rotaSonda.indexOf('rodarSondaDaFolha('))
  assert.equal(rotaSonda.match(/\} finally \{\n\s+liberarSonda\(estado\)\n\s+\}/g)?.length, 2, 'a vez é liberada nos dois modos')
  assert.ok(rotaSonda.includes("lerPedidoDeLeitura(corpo, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')"), 'só o nosso bucket')
  assert.ok(rotaSonda.includes('lerAFolha(descricao, url, { forma: formaNaSonda() })'), 'a sonda pergunta a forma')
  assert.ok(!/\.from\(|\.insert\(|\.rpc\(|debitVideoCredits|\.env\.local/.test(rotaSonda), 'sem banco e sem crédito')
}

await suite(null)

// nenhum arquivo de navegador importa as peças do servidor (lib/internalAccounts)
const deNavegador = execSync('git grep -l -E "^.use client" -- app components lib', { encoding: 'utf8' }).split('\n').filter(Boolean)
for (const f of deNavegador) assert.ok(!/fichaSemNome2511|sondaDaFolha2511|juizDaFolha2411/.test(local(f)), 'arquivo de navegador importa o servidor: ' + f)

const mutants = [
  // 1. a folha sem o nome
  [F, "  return c.split(/(\"[^\"]*\"|“[^”]*”)/).map((p, i) => (i % 2 === 0 ? p.replace(new RegExp(fonte, 'gu'), quem) : p)).join('')", '  return c'], // o nome não é trocado
  [F, "(i % 2 === 0 ? p.replace(new RegExp(fonte, 'gu'), quem) : p)", "p.replace(new RegExp(fonte, 'gu'), quem)"], // as aspas são tocadas
  [F, 'c.split(/("[^"]*"|“[^”]*”)/)', 'c.split(/("[^"]*")/)'], // as aspas curvas são tocadas
  [F, "  if (ficha.tipo === 'humano' && ficha.genero === 'man') return 'this male character'\n", ''], // o gênero se perde
  [F, "  if (ficha.tipo === 'humano' && ficha.genero === 'woman') return 'this female character'\n", ''],
  [F, "  if (ficha.tipo === 'humano' && ficha.genero === 'man')", "  if (ficha.genero === 'man')"], // gênero inventado para bicho e criatura
  [F, "  if (ficha.tipo === 'humano' && ficha.genero === 'woman')", "  if (ficha.genero === 'woman')"],
  [F, "return 'this male character'", "return 'this female character'"],
  [F, "  return 'this character'\n}", "  return 'a robot'\n}"], // o ser adivinhado volta
  [F, "})(?![\\\\p{L}\\\\p{N}-])`", "})(?![\\\\p{L}\\\\p{N}'’-])`"], // o possessivo deixa de trocar
  [F, "})(?![\\\\p{L}\\\\p{N}-])`", "})(?![\\\\p{L}\\\\p{N}])`"], // o hífen deixa de ser parte da palavra (Sky-themed, Bolt-like)
  [F, "})(?![\\\\p{L}\\\\p{N}-])`", '})`'], // sem fronteira à direita (Maxine, Anna's)
  [F, "const fonte = `(?<![\\\\p{L}\\\\p{N}-])(?:", "const fonte = `(?:"], // sem fronteira à esquerda
  [F, 'p.length >= 3 && /^\\p{Lu}/u.test(p)', 'p.length >= 2 && /^\\p{Lu}/u.test(p)'], // a parte de 2 letras ("Jo") troca
  [F, 'p.length >= 3 && /^\\p{Lu}/u.test(p)', 'p.length >= 4 && /^\\p{Lu}/u.test(p)'], // "Kay" deixa de trocar
  [F, "const partes = [nome, ...nome.split(' ').filter((p) => p.length >= 3 && /^\\p{Lu}/u.test(p) && p !== nome)]", 'const partes = [nome]'], // as partes do nome ficam
  [F, "  if (!/^\\p{Lu}/u.test(nome) || /^the\\s/i.test(nome)) return c\n", "  if (/^the\\s/i.test(nome)) return c\n"], // papel minúsculo troca
  [F, " || /^the\\s/i.test(nome)) return c", ') return c'], // "The Captain" troca
  [F, "new RegExp(fonte, 'gu'), quem)", "new RegExp(fonte, 'u'), quem)"], // só a 1ª ocorrência
  [F, '${semNome ? canonicaSemNome(ficha) : ficha.canonica}', '${ficha.canonica}'],
  [F, '${semNome ? canonicaSemNome(ficha) : ficha.canonica}', '${canonicaSemNome(ficha)}'],
  [SN, "export const FICHA_SEM_NOME_2511: ModoFichaSemNome2511 = 'internal'", "export const FICHA_SEM_NOME_2511: ModoFichaSemNome2511 = 'off'"],
  [SN, "export const FICHA_SEM_NOME_2511: ModoFichaSemNome2511 = 'internal'", "export const FICHA_SEM_NOME_2511: ModoFichaSemNome2511 = 'public'"], // o cliente recebe
  [F, "  if (ficha.tipo === 'humano' && ficha.genero !== 'man' && ficha.genero !== 'woman') return c // volta 5: gente sem gênero conhecido fica com o nome\n", ''], // a Mara sem gênero vira rapaz
  [F, "  if (ficha.tipo === 'humano' && ficha.genero !== 'man' && ficha.genero !== 'woman') return c", "  if (ficha.genero !== 'man' && ficha.genero !== 'woman') return c"], // bicho e criatura param de trocar
  // 1b. o conferente sem profissão
  [J, "t.aparencia === 'yes' && !(tipo", "!(tipo"], // sem o campo, julga (a leitura real reprova)
  [J, "t.aparencia === 'yes' && !(tipo === 'humano' && t.categoria === 'species')\n", "t.aparencia === 'yes' && true\n"], // \"species\" de gente julgada (tracoJulgavel, KINEO-FORMA-NOS-FILMES-2511)
  [J, "!(tipo === 'humano' && t.categoria === 'species')", "!(t.categoria === 'species')"], // \"species\" de criatura deixa de ser julgada
  [J, "r?.appearance === 'yes' || r?.appearance === 'no' ? r.appearance : 'unclear'", "r?.appearance === 'no' ? 'no' : 'yes'"], // sem o campo = aparência
  [J, "const CATEGORIAS: readonly CategoriaDoTraco[] = ['species', 'shape', 'size', 'color', 'feature', 'clothing', 'role']", "const CATEGORIAS: readonly CategoriaDoTraco[] = ['species', 'shape', 'size', 'color', 'feature', 'clothing']"],
  [J, '\"appearance\": \"yes\" | \"no\", ', ''], // o pedido sem o campo
  [J, 'v1 = decidirDaFolha(r1.leitura, args.filmeFotorreal, descricao, modoForma, tipo)', 'v1 = decidirDaFolha(r1.leitura, args.filmeFotorreal, descricao, modoForma)'], // o laço sem o tipo
  [SO, 'decidirDaFolha(r.leitura, p.filmeFotorreal, descricao, modoForma, p.tipo), custo_usd: custo, erro: null }\n}\n', 'decidirDaFolha(r.leitura, p.filmeFotorreal, descricao, modoForma), custo_usd: custo, erro: null }\n}\n'], // a leitura da sonda sem o tipo
  [SN, "modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))", "modo !== 'off'"],
  [routeFile, 'promptDaFolha(f, styleAnchor, folhaSemNome2511), epocaVisual?.ficha, true)), styleSuffix: \'\', seed: (generationSeed + 7_919 * (101', 'promptDaFolha(f, styleAnchor), epocaVisual?.ficha, true)), styleSuffix: \'\', seed: (generationSeed + 7_919 * (101'],
  [routeFile, 'promptDaFolha(f, styleAnchor, folhaSemNome2511), epocaVisual?.ficha, true) + instrucao', 'promptDaFolha(f, styleAnchor), epocaVisual?.ficha, true) + instrucao'],
  [routeFile, 'const folhaSemNome2511 = fichaSemNomeLigada(FICHA_SEM_NOME_2511, user.email)', 'const folhaSemNome2511 = true'],
  // 2. a forma
  [J, "export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'internal'", "export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'off'"], // a sonda deixa de perguntar
  [J, "(modo === 'off' ? 'off' : 'on')", 'modo'],
  [J, ' || NAO_JULGA_FORMA_RE.test(d)) return null', ') return null'], // brinquedo e humanoide julgados
  [J, '  return ser && SERES_DA_FORMA.has(ser) ? ser : null', '  return ser'], // bicho e dragão julgados
  [J, ' || HIBRIDO_RE.test(d)', ''],
  [J, "const SERES_DA_FORMA = new Set(['robot', 'person'])", "const SERES_DA_FORMA = new Set(['robot'])"], // gente não julgada
  [J, "f.orelhas === 'yes' || ", ''],
  [J, "f.focinho === 'yes' || ", ''],
  [J, ' || pareceBicho(f.parecido)', ''],
  [J, "(especie === 'robot' && (f.nariz === 'yes' || f.pelo === 'yes'))", "(f.nariz === 'yes' || f.pelo === 'yes')"], // nariz e barba reprovam gente
  [J, "(especie === 'robot' && (f.nariz === 'yes' || f.pelo === 'yes'))", "(especie === 'robot' && f.pelo === 'yes')"],
  [J, "(especie === 'robot' && (f.nariz === 'yes' || f.pelo === 'yes'))", "(especie === 'robot' && f.nariz === 'yes')"],
  [J, ".split(/[^\\p{L}]+/u).some((w) => BICHO_RE.test(w))", '.split(/[^\\p{L}]+/u).slice(0, 1).some((w) => BICHO_RE.test(w))'], // "cartoon fox"
  [J, '  const forma = parecido && orelhas && nariz && focinho && pelo ? { parecido, orelhas, nariz, focinho, pelo } : null', '  const forma = orelhas && focinho ? { parecido: parecido ?? \'\', orelhas, nariz: nariz ?? \'unclear\', focinho, pelo: pelo ?? \'unclear\' } : null'],
  [J, "limpa(k.resembles).toLowerCase().slice(0, 40)", 'limpa(k.resembles).slice(0, 40)'],
  [J, '  return exigeForma ? { meio, personagens, tracos, forma }', '  if (exigeForma && !forma) return null\n  return exigeForma ? { meio, personagens, tracos, forma }'], // a volta 2 da forma desfeita
  [J, '  return exigeForma ? { meio, personagens, tracos, forma } : { meio, personagens, tracos }', '  return { meio, personagens, tracos, forma }'],
  [J, "    (especie ? ' Also answer \"head_check\"", "    (false ? ' Also answer \"head_check\""],
  [J, "    (especie ? ' Also answer \"head_check\"", "    (true ? ' Also answer \"head_check\""],
  [J, "lerLeituraDaFolha(data.choices?.[0]?.message?.content ?? '', especie !== null)", "lerLeituraDaFolha(data.choices?.[0]?.message?.content ?? '', false)"],
  [J, 'especieDaDescricao(descricao, opts.forma ?? FORMA_DA_FOLHA_2511)', 'especieDaDescricao(descricao, FORMA_DA_FOLHA_2511)'],
  [J, "...(modoForma === 'on' ? {", '...(true ? {'],
  [J, 'formaPassa(v2) /* KINEO-FORMA-DA-FOLHA-2511 */ && ', ''],
  [J, '  const ser = !formaPassa(v) && v.especie ?', '  const ser = false ?'],
  // 3. a sonda
  [SO, "  if (!contaDaCasaExata(email)) return 'nao_e_da_casa'\n", ''],
  [SO, "  if (estado.ocupada) return 'ocupada'\n", ''],
  [SO, "  if (estado.feitas.has(chave)) return 'repetida'\n", ''],
  [SO, "tipo === 'folha' ? estado.chamadas >= SONDA_DA_FOLHA_TETO_POR_INSTANCIA : estado.leituras >= SONDA_LEITURA_TETO_POR_INSTANCIA", 'estado.chamadas + estado.leituras >= SONDA_DA_FOLHA_TETO_POR_INSTANCIA'], // um teto só
  [SO, "if (tipo === 'folha') estado.chamadas++; else estado.leituras++", 'estado.chamadas++'],
  [SO, 'promptDaFolha(ficha, { lookPhrase: p.lookPhrase }, p.semNome)', 'promptDaFolha(ficha, { lookPhrase: p.lookPhrase })'],
  [SO, "origem: 'autor', protagonista: true, genero: p.genero }", "origem: 'autor', protagonista: true, genero: null }"],
  [SO, '  const url = await deps.guardar(falUrl).catch(() => null)', '  const url = falUrl'],
  [SO, '(SONDA_FOLHA_USD + r.custoUsd)', '(r.custoUsd)'],
  [SO, 'export const SONDA_FOLHA_USD = 0.025', 'export const SONDA_FOLHA_USD = 0.015'],
  [SO, "b.genero === 'man' || b.genero === 'woman' ? b.genero : undefined", "b.genero === 'man' || b.genero === 'woman' ? b.genero : null"],
  [SO, 'JSON.stringify([p.nome, p.tipo, p.genero, p.canonica, p.lookPhrase, p.semNome, p.seed])', 'JSON.stringify([p.nome, p.tipo, p.canonica, p.lookPhrase, p.semNome, p.seed])'],
  [SO, '  if (!b || b.modo !== \'ler\') return null\n', '  if (!b) return null\n'],
  [SO, '!url.startsWith(prefixo)', "!url.startsWith('https://')"],
  [SO, '/\\.\\.|[\\s?#]/.test(url.slice(prefixo.length))', 'false'],
  [SO, " || url.length === prefixo.length) return null", ') return null'],
  [SO, "if (!/^https:\\/\\/[^/]+$/.test(base) || ", 'if ('],
  [SO, ".replace(/\\/+$/, '')", ''],
  [SO, "/storage/v1/object/public/broll/`", "/storage/v1/object/public/`"], // outro bucket
  [SO, "decidirDaFolha(r.leitura, p.filmeFotorreal, descricao, modoForma, p.tipo), custo_usd: custo, erro: null }\n}\n", "decidirDaFolha(r.leitura, p.filmeFotorreal, descricao, undefined, p.tipo), custo_usd: custo, erro: null }\n}\n"], // a leitura da sonda sem a forma
  [sondaRoute, "admitirSonda(estado, user.email, chaveDaLeitura(leitura), 'ler')", 'admitirSonda(estado, user.email, chaveDaLeitura(leitura))'],
  [sondaRoute, '      return NextResponse.json(r, { status: r.erro ? 502 : 200 })\n    } finally {\n      liberarSonda(estado)\n    }', '      return NextResponse.json(r, { status: r.erro ? 502 : 200 })\n    } finally {\n    }'],
  [sondaRoute, "lerPedidoDeLeitura(corpo, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')", "lerPedidoDeLeitura(corpo, 'https://x')"],
  [sondaRoute, 'lerAFolha(descricao, url, { forma: formaNaSonda() })', 'lerAFolha(descricao, url)'],
  [sondaRoute, "  if (!user) return NextResponse.json({ erro: 'nao_e_da_casa' }, { status: 403 })\n", ''],
]
let mortos = 0
for (const mutant of mutants) {
  for (const [de] of Array.isArray(mutant[1]) ? mutant[1] : [[mutant[1]]]) assert.ok(local(mutant[0]).includes(de), 'mutante não aplica: ' + de)
  await assert.rejects(suite(mutant), err => err instanceof assert.AssertionError, 'SOBREVIVEU: ' + mutant[1])
  mortos++
}
console.log(`PASS KINEO-FICHA-SEM-NOME-2511 volta 5 + JUIZ-SEM-PROFISSAO-2511 + FORMA-DA-FOLHA-2511 + SONDA-DA-FOLHA-2511: chave 'internal' — criatura e bicho viram "this character", gente com gênero "this male/female character", gente SEM gênero mantém o nome (a ficha de hoje), em ${CASOS.length} fichas com as aspas byte a byte; cliente byte a byte a main; o conferente só julga aparência (as leituras reais da Mara e do Elias servem; o defeito reproduzido na main); a forma no laço com o modo do filme (o filme da casa: test-forma-nos-filmes-2511); a sonda e o modo "só ler"; ${mortos}/${mutants.length} mutantes mortos.`)
