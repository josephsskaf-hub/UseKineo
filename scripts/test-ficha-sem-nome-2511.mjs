// KINEO-FICHA-SEM-NOME-2511 · KINEO-FORMA-DA-FOLHA-2511 · KINEO-SONDA-DA-FOLHA-2511 — guardião que EXECUTA as três peças com a rede FALSA (nada sai da máquina):
//   1. a folha sem o nome próprio (lib/cinematic/folhaDePersonagem canonicaSemNome / serDoSujeito / promptDaFolha) e o interruptor
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
const daMain = file => execSync(`git show origin/main:${file}`, { encoding: 'utf8', maxBuffer: 64 << 20 }).replaceAll('\r\n', '\n')
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
// [nome do caso, ficha, o começo esperado da canônica sem nome]
const CASOS = [
  ['Bolt', BOLT, 'a robot, exactly as the author wrote: "small round orange robot with big blue eyes"; drawn'],
  ['Bolt (sem aspas)', ficha('Bolt', 'criatura', null, 'Bolt, small round orange robot with big blue eyes, exactly as the author wrote'), 'a robot, small round orange robot with big blue eyes, exactly'],
  ['possessivo', ficha('Bolt', 'criatura', null, 'Bolt, a small robot; Bolt\'s eyes are blue'), 'a robot, a small robot; the robot\'s eyes are blue'],
  ['Elias (gênero da ficha)', ELIAS, 'a man, kept the old lighthouse alone'],
  ['Mara (gênero + idade escrita)', MARA, 'a young woman, a young radio operator; the young woman wears an olive green suit'],
  ['Le Prince', PRINCE, 'a man, exactly as the author wrote: "bearded inventor in an 1880s suit"'],
  ['Ember (o núcleo antes de "character")', EMBER, 'a dragon, an anthropomorphic dragon character: a small green dragon'],
  ['Max (fronteira)', ficha('Max', 'animal', null, 'Max, a dog from Maxwell Street'), 'a dog, a dog from Maxwell Street'],
  ['Rex (fora da lista)', ficha('Rex', 'animal', null, 'Rex, a friendly companion'), 'an animal, a friendly companion'],
  ['Zork', ficha('Zork', 'criatura', null, 'Zork, a small glowing thing'), 'a creature, a small glowing thing'],
  ['Fang (bicho num tipo criatura: o tipo vence)', ficha('Fang', 'criatura', null, 'Fang, a shadow wolf'), 'a creature, a shadow wolf'],
  ['Zed (o tipo vence)', ficha('Zed', 'criatura', null, 'Zed, a tall pirate'), 'a creature, a tall pirate'],
  ['Juno', autor('Juno', 'animal', null, 'golden retriever with a red bandana'), 'an animal, exactly as the author wrote: "golden retriever with a red bandana"'],
  // §4 da revisora, perigoso 1: o sujeito, não o 1º bicho
  ['Jack (pirata, homem)', autor('Jack', 'humano', 'man', 'a pirate with a parrot on his shoulder'), 'a man, exactly as the author wrote: "a pirate with a parrot on his shoulder"'],
  ['Jack (pirata, sem gênero)', autor('Jack', 'humano', null, 'a pirate with a parrot on his shoulder'), 'a pirate, exactly'],
  ['Lia', autor('Lia', 'humano', null, 'a girl hugging a teddy bear'), 'a girl, exactly'],
  ['Tom', autor('Tom', 'humano', 'man', 'a boy walking his dog'), 'a boy, exactly'],
  ['Nina (o nome dentro das aspas curvas fica)', ficha('Nina', 'humano', 'woman', 'Nina, exactly as the author wrote: “Nina wears a red hat”'), 'a woman, exactly as the author wrote: “Nina wears a red hat”'],
  ['Nina (aspas curvas)', ficha('Nina', 'humano', 'woman', 'Nina, exactly as the author wrote: “a woman with a giant red umbrella”'), 'a woman, exactly as the author wrote: “a woman with a giant red umbrella”'],
  ['Leo', autor('Leo', 'humano', 'man', 'a boy in a dinosaur costume'), 'a boy, exactly'],
  ['Sir Kay', autor('Sir Kay', 'humano', 'man', 'a knight on a white horse'), 'a man, exactly'],
  ['Rex (o cachorro que sonha)', autor('Rex', 'animal', null, 'a dog who dreams of being a dragon'), 'a dog, exactly'],
  ['Pip', autor('Pip', 'animal', null, 'a tiny mouse in a giant world'), 'a mouse, exactly'],
  ['Nora (a palavra de gente antes do núcleo)', autor('Nora', 'humano', 'woman', 'a little girl detective'), 'a little girl, exactly'],
  ['Granny (idade escrita)', autor('Granny', 'humano', 'woman', 'an elderly woman knitting'), 'an elderly woman, exactly'],
  ['Kip (plural)', autor('Kip', 'animal', null, 'two puppies'), 'a puppy, exactly'],
  // §4, perigoso 2: o texto do autor entre aspas fica literal (e o hífen é parte da palavra)
  ['Rose', autor('Rose', 'humano', 'woman', 'a little girl with Rose-gold curls'), 'a little girl, exactly as the author wrote: "a little girl with Rose-gold curls"'],
  ['Angel', autor('Angel', 'humano', 'woman', 'Angel wings on her back'), 'a woman, exactly as the author wrote: "Angel wings on her back"'],
  ['Mark', autor('Mark', 'humano', 'man', 'a man with a birth Mark on his cheek'), 'a man, exactly as the author wrote: "a man with a birth Mark on his cheek"'],
  ['Sky', ficha('Sky', 'humano', null, 'Sky, exactly as the author wrote: "a girl with Sky-blue eyes"; Sky-themed room'), 'a girl, exactly as the author wrote: "a girl with Sky-blue eyes"; Sky-themed room'],
  ['Jo March', autor('Jo March', 'humano', 'woman', 'a girl born in March'), 'a girl, exactly as the author wrote: "a girl born in March"'],
  ['Bolt logo', autor('Bolt', 'criatura', null, 'a robot with a Bolt logo on his chest'), 'a robot, exactly as the author wrote: "a robot with a Bolt logo on his chest"'],
]
const IGUAIS = [BOY, ficha('The Captain', 'humano', 'man', 'The Captain, an old sailor'), ficha('Nemo', 'animal', null, 'a small orange fish with white stripes'), ficha('boy', 'humano', null, 'boy, a sad boy of about 8'),
  ficha('Rose', 'humano', 'woman', 'exactly as the author wrote: "Rose wears a red coat"')] // o nome SÓ dentro das aspas: fica (o texto do autor não é tocado)

// as leituras das 4 folhas da sonda (o que eu vi em QUATRO-FICHAS.jpg), no formato novo
const TRACOS_SIM = ['small', 'round', 'orange', 'robot', 'big blue eyes'].map((trait, i) => ({ trait, category: ['size', 'shape', 'color', 'species', 'feature'][i], visible: 'yes' }))
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

  // ── 1. a folha sem o nome ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  for (const [caso, f, comeco] of CASOS) { const r = L.canonicaSemNome(f); assert.ok(r.startsWith(comeco), `${caso}: ${r}`) }
  for (const f of IGUAIS) assert.equal(L.canonicaSemNome(f), f.canonica, 'fica igual: ' + f.canonica)
  for (const [caso, f] of CASOS) { // o texto entre aspas do autor sai idêntico; fora das aspas, nenhuma parte do nome (3+ letras) sobra solta
    const aspas = f.canonica.match(/"[^"]*"|“[^”]*”/g) ?? [], r = L.canonicaSemNome(f)
    for (const a of aspas) assert.ok(r.includes(a), caso + ': aspas intocadas')
    const fora = r.split(/"[^"]*"|“[^”]*”/).join(' ')
    for (const p of [f.nome, ...f.nome.split(' ').filter(p => p.length >= 3)]) assert.ok(!new RegExp(`(?<![\\p{L}\\p{N}-])${p}(?![\\p{L}\\p{N}-])`, 'u').test(fora), caso + ': o nome sobrou fora das aspas')
  }
  // o sujeito, direto
  igual(['a pirate with a parrot', 'a girl hugging a teddy bear', 'an anthropomorphic dragon character', 'kept the lighthouse', 'small round orange robots', ''].map(t => L.serDoSujeito({ tipo: 'criatura' }, t)),
    ['creature', 'creature', 'dragon', 'creature', 'robot', 'creature'])
  igual([L.serDoSujeito({ tipo: 'humano', genero: 'woman' }, 'a young radio operator'), L.serDoSujeito({ tipo: 'humano', genero: null }, 'an old sailor'), L.serDoSujeito({ tipo: 'humano' }, 'kept the lighthouse'),
    L.serDoSujeito({ tipo: 'humano', genero: 'man' }, 'a little girl'), L.serDoSujeito({ tipo: 'animal' }, 'a cat on a mat')], ['young woman', 'old sailor', 'person', 'little girl', 'cat'])
  // o prompt: sem o pedido = a main; com o pedido = a main com a canônica nova; o Bolt = EXATAMENTE o pedido que a sonda provou (c2 e c4)
  for (const f of [...CASOS.map(c => c[1]), ...IGUAIS]) {
    assert.equal(L.promptDaFolha(f, LOOK), FM.promptDaFolha(f, LOOK), 'byte a byte com a main: ' + f.nome)
    assert.equal(L.promptDaFolha(f, LOOK, false), FM.promptDaFolha(f, LOOK))
    assert.equal(L.promptDaFolha(f, null), FM.promptDaFolha(f, null))
    assert.equal(L.promptDaFolha(f, LOOK, true), FM.promptDaFolha({ ...f, canonica: L.canonicaSemNome(f) }, LOOK), 'sem nome: só a canônica muda')
  }
  assert.equal(L.promptDaFolha(BOLT, LOOK_DA_PROVA, true), FM.promptDaFolha(BOLT, LOOK_DA_PROVA, true), 'o Bolt da casa = o pedido das fichas c2/c4 da sonda (o robô certo)')
  assert.ok(!/\bBolt\b/.test(L.promptDaFolha(BOLT, LOOK, true)) && L.promptDaFolha(BOLT, LOOK).includes('nobody else: Bolt, exactly as the author wrote'))

  // o interruptor: 'internal' de novo
  assert.equal(S.FICHA_SEM_NOME_2511, 'internal', 'volta 3: a casa pede a folha sem o nome')
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
    const folhas = await Function('elencoP', 'qualidadeHerdada', 'referenciaDaCena', 'generateCinematicSceneStill', 'promptDaFolha', 'styleAnchor', 'folhaSemNome2511', 'generationSeed', 'aspectRequested', corpo)(
      elencoP, null, () => assert.fail('herdada'), async (a) => { pedidos.push(a); return 'https://x.org/folha.png' }, L.promptDaFolha, LOOK, folhaSemNome2511, 7, '9:16')
    assert.equal(folhas.length, elencoP.length)
    return pedidos
  }
  const casa = await pedirFolhas(chave(CASA), [BOLT, MARA]), cliente = await pedirFolhas(chave(CLIENTE), [BOLT, MARA])
  igual(cliente.map(p => p.scenePrompt), [FM.promptDaFolha(BOLT, LOOK), FM.promptDaFolha(MARA, LOOK)], 'cliente: byte a byte o da main')
  igual(casa.map(p => p.scenePrompt), [L.promptDaFolha(BOLT, LOOK, true), L.promptDaFolha(MARA, LOOK, true)], 'a casa: a folha sem o nome')
  assert.ok(casa.every(p => !/\b(?:Bolt|Mara|Quinn)\b/.test(p.scenePrompt)) && casa[1].scenePrompt.includes('nobody else: a young woman, a young radio operator'))
  igual(cliente.map(p => [p.seed, p.styleSuffix, p.pollWindowMs, p.aspect]), casa.map(p => [p.seed, p.styleSuffix, p.pollWindowMs, p.aspect]), 'só o texto muda')
  const juizNaRota = trechoDaRota(route, '      if (juizDaFolhaLigado(JUIZ_DA_FOLHA_2411, user.email) && kling4TrialCandidate && !qualidadeHerdada', '        juizDaFolhaRelato2411 = julgadas.map((j) => j.relato)\n')
  const folhaNova = async (folhaSemNome2511, primeira) => {
    const gerados = []
    const ler = async (d, url) => ({ leitura: j.lerLeituraDaFolha(url.includes('nova') ? leituraJson(ROBO) : primeira), custoUsd: 0.001, erro: null })
    const corpo = ts.transpile('return (async () => {\n' + juizNaRota + '\n} return null })()', { target: ts.ScriptTarget.ES2022 })
    await Function('juizDaFolhaLigado', 'JUIZ_DA_FOLHA_2411', 'user', 'kling4TrialCandidate', 'qualidadeHerdada', 'ensaioPersonagemFixo', 'folhaDe', 'elencoP', 'julgarAFolha', 'isStylizedLook', 'styleAnchor', 'desenhoInfantil', 'lerAFolha',
      'generateCinematicSceneStill', 'promptDaFolha', 'generationSeed', 'aspectRequested', 'folhasReprovadas2411', 'folhaSemNome2511', corpo)(
      j.juizDaFolhaLigado, j.JUIZ_DA_FOLHA_2411, { email: CASA }, true, null, false, new Map([['Bolt', 'https://x.org/folha.png']]), [BOLT], j.julgarAFolha, () => true, LOOK, { ativo: false }, ler,
      async (a) => { gerados.push(a.scenePrompt); return 'https://x.org/nova.png' }, L.promptDaFolha, 7, '9:16', new Set(), folhaSemNome2511)
    return gerados
  }
  const SEM_SMALL = JSON.stringify({ medium: 'cartoon_3d', characters: 1, traits: TRACOS_SIM.map(t => t.trait === 'small' ? { ...t, visible: 'no' } : t) })
  igual(await folhaNova(chave(CASA), leituraJson(C1_CAO)), [], "a forma continua fora do filme ('sonda'): a cabeça de cachorro não reprova no filme")
  igual(await folhaNova(chave(CASA), SEM_SMALL), [L.promptDaFolha(BOLT, LOOK, true) + ' Exactly as the author wrote, clearly visible: small. Rendered in stylized 3D animated film look.'], 'a casa: a folha nova sem o nome')
  igual(await folhaNova(false, SEM_SMALL), [FM.promptDaFolha(BOLT, LOOK) + ' Exactly as the author wrote, clearly visible: small. Rendered in stylized 3D animated film look.'], "sem a chave: a folha nova da main")

  // ── 2. a FORMA (fica 'sonda'): perguntas concretas da cabeça; robô e gente ──────────────────────────────────────────────────────────────
  assert.equal(j.FORMA_DA_FOLHA_2511, 'sonda')
  igual([j.formaNaSonda(), j.formaNaSonda('sonda'), j.formaNaSonda('on'), j.formaNaSonda('off')], ['on', 'on', 'on', 'off'])
  for (const [d, e] of [['small round orange robot with big blue eyes', 'robot'], ['small round orange robots', 'robot'], ['old bearded sailor', 'person'], ['man in a dark suit and black tie', 'person'],
    ['a red dragon with big wings', null], ['a golden dog with a red bandana', null], ['a robot dog', null], ['a cat-like robot', null], ['a robot-like toy', null], ['half man half wolf', null], ['a half-robot', null], ['a robot hybrid', null],
    ['a teddy bear', null], ['a toy robot', null], ['a humanoid robot', null], ['an android butler', null], ['a man in a bear costume', null], ['a tin man', null], ['a gingerbread man', null], ['a robot with human hands', null],
    ['a robot and a dragon', null], ['small round orange robot, not a dog', null], ['', null], ['a boy riding a horse', null]]) assert.equal(j.especieDaDescricao(d, 'on'), e, d)
  for (const modo of [undefined, 'sonda', 'off']) assert.equal(j.especieDaDescricao('small round orange robot', modo), null, 'o filme não pergunta: ' + modo)
  const DB = 'small round orange robot with big blue eyes'
  // o pedido: sem dizer o ser esperado; sem exemplo; sem ser = a main
  const sistema = j.pedidoAoJuizDaFolha(DB, 'https://x.org/f.png', 'robot').messages[0].content
  for (const k of ['"head_check"', '"resembles"', '"animal_ears"', '"nose"', '"snout_or_muzzle"', '"fur"', 'never clothing, headwear, accessories or objects']) assert.ok(sistema.includes(k), k)
  assert.ok(!/robot|kind_check|e\.g\.|for example|such as|like this|FAIL|reject/i.test(sistema), 'o pedido não diz o ser esperado, nem exemplo, nem ordem de reprovar')
  for (const d of [DB, '', 'old bearded sailor']) igual(j.pedidoAoJuizDaFolha(d, 'https://x.org/f.png'), JM.pedidoAoJuizDaFolha(d, 'https://x.org/f.png'), 'sem o ser = a main: ' + d)
  // a leitura
  for (const raw of [leituraJson(null), leituraJson(VELHA), leituraJson({ ...ROBO, resembles: '' }), leituraJson({ ...ROBO, resembles: 7 }), leituraJson({ ...ROBO, nose: 'maybe' }), leituraJson({ ...ROBO, fur: undefined }), leituraJson('yes')])
    assert.equal(j.lerLeituraDaFolha(raw, true), null, raw)
  igual(j.lerLeituraDaFolha(leituraJson({ ...C1_CAO, resembles: '  Dog ' }), true).forma, { parecido: 'dog', orelhas: 'yes', nariz: 'yes', focinho: 'yes', pelo: 'no' })
  for (const raw of [leituraJson(null), leituraJson(C1_CAO), leituraJson(VELHA)]) igual(j.lerLeituraDaFolha(raw), JM.lerLeituraDaFolha(raw), 'não perguntada = a main')
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
  assert.ok(r1.corpos[0].includes('head_check')); igual([r1.r.leitura, r1.r.erro], [null, 'resposta_ilegivel'], 'perguntada e não respondida: leitura falhou')
  igual((await rede(j, DB, leituraJson(C1_CAO), 'on')).r.leitura.forma.parecido, 'dog')
  for (const d of [DB, 'old bearded sailor', '', 'a robot dog']) { const a = await rede(j, d, leituraJson(null)), b = await rede(JM, d, leituraJson(null)); igual([a.corpos, a.r], [b.corpos, b.r], 'o filme: byte a byte a main: ' + d) }
  // o laço: no filme = a main; com 'on' (2º mundo), a forma reprova e pede o corpo do robô
  const filaM = (mod, exige, ...q) => { const r = [...q]; return async () => { const k = r.shift(); assert.ok(k !== undefined, 'leitura a mais'); return { leitura: mod.lerLeituraDaFolha(leituraJson(k), exige), custoUsd: 0.001, erro: null } } }
  const arg = (foto = false) => ({ ficha: BOLT, url: 'https://x.org/folha-1.png', filmeFotorreal: foto, lookPhrase: LOOK.lookPhrase })
  for (const ks of [[C1_CAO], [ROBO], [null]]) igual(await j.julgarAFolha(arg(), { ler: filaM(j, false, ...ks), gerar: async () => 'https://x.org/nova.png' }), await JM.julgarAFolha(arg(), { ler: filaM(JM, false, ...ks), gerar: async () => 'https://x.org/nova.png' }), 'o filme = a main')
  const jOn = load((file, src) => { const t = source(file, src); return file.replaceAll('\\', '/') === J ? t.replace("FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'sonda'", "FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'on'") : t })('@/' + J)
  const gerou = []
  const julgar = (ks, foto) => jOn.julgarAFolha(arg(foto), { ler: filaM(jOn, true, ...ks), gerar: async (i) => { gerou.push(i); return 'https://x.org/nova.png' } })
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
  assert.ok(s.log.gerar[0][0].includes('nobody else: a young woman, a young radio operator'), 'o gênero do corpo chega à folha')
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
  [F, "const partes = [nome, ...nome.split(' ').filter((p) => p.length >= 3 && /^\\p{Lu}/u.test(p) && p !== nome)]", 'const partes = [nome]'],
  [F, "})(?![\\\\p{L}\\\\p{N}-])`", "})(?![\\\\p{L}\\\\p{N}])`"], // o hífen deixa de ser parte da palavra (Sky-themed)
  [F, "})(?![\\\\p{L}\\\\p{N}-])`", '})`'],
  [F, "  if (!/^\\p{Lu}/u.test(nome) || /^the\\s/i.test(nome)) return c\n", "  if (/^the\\s/i.test(nome)) return c\n"],
  [F, " || /^the\\s/i.test(nome)) return c", ') return c'],
  [F, "/^[aeiou]/.test(ser) ? 'an' : 'a'", "'a'"],
  [F, ": `the ${ser}`; primeira = false", ": `a ${ser}`; primeira = false"],
  [F, '(i % 2 === 0 ? p.replace(new RegExp(fonte, \'gu\'), troca) : p)', "p.replace(new RegExp(fonte, 'gu'), troca)"], // as aspas são tocadas
  [F, 'const pedacos = c.split(/("[^"]*"|“[^”]*”)/)', 'const pedacos = c.split(/("[^"]*")/)'], // as aspas curvas
  [F, "  const ser = serDoSujeito(ficha, autor ? autor.slice(1, -1) : depois || pedacos.slice(primeiro + 1).join(''))", "  const ser = serDoSujeito(ficha, c)"], // o sujeito do texto inteiro
  [F, '  const corte = ws.findIndex((w) => PARA_O_SUJEITO.has(w))', '  const corte = -1'], // o sujeito não para na preposição (o pirata vira papagaio)
  [F, "  while (frase.length > 1 && GENERICOS_DO_SUJEITO.has(frase[frase.length - 1])) frase.pop()\n", ''],
  [F, "  if (ficha.tipo === 'animal') return singular(ANIMAIS, nucleo) ?? 'animal'", "  if (ficha.tipo === 'animal') return 'animal'"],
  [F, "  if (ficha.tipo === 'criatura') return singular(CRIATURAS, nucleo) ?? 'creature'", "  if (ficha.tipo === 'criatura') return singular(ANIMAIS, nucleo) ?? singular(CRIATURAS, nucleo) ?? 'creature'"],
  [F, "  if (ficha.genero === 'woman' || ficha.genero === 'man') return comIdade(ficha.genero)\n", ''], // o gênero some
  [F, '  const comIdade = (w: string) => (idade ? `${idade} ${w}` : w)', '  const comIdade = (w: string) => w'], // a idade some
  [F, '  if (gente) return comIdade(gente)\n', ''], // "a little girl" vira "a woman"
  [F, '  const gente = [...frase].reverse().find((w) => GENTE_COM_IDADE.has(w))', '  const gente = GENTE_COM_IDADE.has(nucleo) ? nucleo : undefined'], // "a girl born in March" vira "a woman"
  [F, "  return comIdade(singular(PESSOAS, nucleo) ?? 'person')", "  return comIdade('person')"],
  [F, "/s$/.test(w) && daLista(lista, w.slice(0, -1)) ? w.slice(0, -1) : /ies$/", "false ? '' : /ies$/"], // o plural com s
  [F, ": /ies$/.test(w) && daLista(lista, w.slice(0, -3) + 'y') ? w.slice(0, -3) + 'y' : null", ': null'], // o plural com ies
  [F, '${semNome ? canonicaSemNome(ficha) : ficha.canonica}', '${ficha.canonica}'],
  [F, '${semNome ? canonicaSemNome(ficha) : ficha.canonica}', '${canonicaSemNome(ficha)}'],
  [SN, "export const FICHA_SEM_NOME_2511: ModoFichaSemNome2511 = 'internal'", "export const FICHA_SEM_NOME_2511: ModoFichaSemNome2511 = 'off'"],
  [SN, "export const FICHA_SEM_NOME_2511: ModoFichaSemNome2511 = 'internal'", "export const FICHA_SEM_NOME_2511: ModoFichaSemNome2511 = 'public'"], // o cliente recebe
  [SN, "modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))", "modo !== 'off'"],
  [routeFile, 'promptDaFolha(f, styleAnchor, folhaSemNome2511), styleSuffix: \'\', seed: (generationSeed + 7_919 * (101', 'promptDaFolha(f, styleAnchor), styleSuffix: \'\', seed: (generationSeed + 7_919 * (101'],
  [routeFile, 'promptDaFolha(f, styleAnchor, folhaSemNome2511) + instrucao', 'promptDaFolha(f, styleAnchor) + instrucao'],
  [routeFile, 'const folhaSemNome2511 = fichaSemNomeLigada(FICHA_SEM_NOME_2511, user.email)', 'const folhaSemNome2511 = true'],
  // 2. a forma
  [J, "export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'sonda'", "export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'on'"], // o filme passa a perguntar
  [J, "export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'sonda'", "export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'off'"], // a sonda deixa de perguntar
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
  [J, '  if (exigeForma && !forma) return null\n', ''],
  [J, '  return exigeForma ? { meio, personagens, tracos, forma } : { meio, personagens, tracos }', '  return { meio, personagens, tracos, forma }'],
  [J, "    (especie ? ' Also answer \"head_check\"", "    (false ? ' Also answer \"head_check\""],
  [J, "    (especie ? ' Also answer \"head_check\"", "    (true ? ' Also answer \"head_check\""],
  [J, "lerLeituraDaFolha(data.choices?.[0]?.message?.content ?? '', especie !== null)", "lerLeituraDaFolha(data.choices?.[0]?.message?.content ?? '', false)"],
  [J, 'especieDaDescricao(descricao, opts.forma ?? FORMA_DA_FOLHA_2511)', 'especieDaDescricao(descricao, FORMA_DA_FOLHA_2511)'],
  [J, "...(FORMA_DA_FOLHA_2511 === 'on' ? {", '...(true ? {'],
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
  [SO, "decidirDaFolha(r.leitura, p.filmeFotorreal, descricao, modoForma), custo_usd: custo, erro: null }\n}\n", "decidirDaFolha(r.leitura, p.filmeFotorreal, descricao), custo_usd: custo, erro: null }\n}\n"],
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
console.log(`PASS KINEO-FICHA-SEM-NOME-2511 volta 3 + FORMA-DA-FOLHA-2511 + SONDA-DA-FOLHA-2511: a casa pede a folha sem o nome ('internal'), cliente e 'off' byte a byte a main; o ser é o NÚCLEO do sujeito (pirata, menina, cachorro que sonha), as aspas do autor ficam literais (Rose-gold, birth Mark, born in March), gênero e idade ficam ("a young woman", "a little girl"); o Bolt da casa = o pedido das fichas c2/c4 da sonda; a forma (fora do filme) pergunta a cabeça sem dizer o ser esperado e reprova c1 e c3, serve c2 e c4 (leituras minhas, não do gpt-4o-mini); a sonda tem o modo "só ler" (só o nosso bucket, teto próprio); ${mortos}/${mutants.length} mutantes mortos.`)
