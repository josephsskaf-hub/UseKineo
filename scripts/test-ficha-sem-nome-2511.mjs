// KINEO-FICHA-SEM-NOME-2511 · KINEO-FORMA-DA-FOLHA-2511 · KINEO-SONDA-DA-FOLHA-2511 — guardião que EXECUTA as três peças com a rede FALSA (nada sai da máquina):
//   1. a folha sem o nome próprio (lib/cinematic/folhaDePersonagem canonicaSemNome / promptDaFolha) e o interruptor (lib/cinematic/fichaSemNome2511);
//      os 2 trechos REAIS da rota que pedem a folha (a folha do filme e a folha nova do conferente);
//   2. a pergunta de FORMA do conferente (lib/cinematic/juizDaFolha2411: especieDaDescricao, o pedido, a leitura, a decisão, a folha nova, o laço);
//   3. a sonda da casa (lib/cinematic/sondaDaFolha2511 e app/api/admin/sonda-folha).
// Cliente e 'off': byte a byte contra a origin/main (os módulos da main são lidos por `git show` e executados lado a lado).
// [CEO 25/11, volta 2: causa antes do conserto] FICHA_SEM_NOME_2511 = 'off' e FORMA_DA_FOLHA_2511 = 'sonda': NENHUM filme muda (casa e cliente byte a byte a
// main: a folha, o pedido, a leitura, o corpo à OpenAI e o relato); só a sonda pergunta a forma e aceita `sem_nome`. O caminho 'on' de cada peça segue
// executado (num 2º mundo com a chave trocada) para a volta 3.
// O caso: Bolt addef2b6 / ab9a1d7a (folha com cabeça de cachorro, conferente aprovou). O que o FLUX desenha sem o nome só a sonda paga prova.
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
const BOLT = { nome: 'Bolt', nucleo: 'Bolt', tipo: 'criatura', protagonista: true, origem: 'autor', genero: null,
  canonica: 'Bolt, exactly as the author wrote: "small round orange robot with big blue eyes"; drawn in the film\'s own look (stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic), the same character design in every scene' }
const ELIAS = { nome: 'Elias', nucleo: 'Elias', tipo: 'humano', protagonista: true, origem: 'deterministica', genero: 'man', canonica: 'Elias, kept the old lighthouse alone for thirty years, exactly as the author wrote; appearance anchors: 50-60, gray, short, clean-shaven, light skin, wearing button-up shirt; a real person' }
const MARA = { nome: 'Mara Quinn', nucleo: 'Mara', tipo: 'humano', protagonista: false, origem: 'autor', genero: 'woman', canonica: 'Mara Quinn, a young radio operator; Mara wears an olive green suit' }
const PRINCE = { nome: 'Louis Le Prince', nucleo: 'Louis', tipo: 'humano', protagonista: true, origem: 'autor', genero: 'man', canonica: 'Louis Le Prince, exactly as the author wrote: "bearded inventor in an 1880s suit"' }
const EMBER = { nome: 'Ember', nucleo: 'Ember', tipo: 'criatura', protagonista: true, origem: 'modelo', genero: null, canonica: 'Ember, an anthropomorphic dragon character: a small green dragon with leathery wings' }
const BOY = { nome: 'the boy', nucleo: 'boy', tipo: 'humano', protagonista: true, origem: 'deterministica', genero: 'man', canonica: 'the boy, a sad Indian boy of about 8' }
const CORPUS = [BOLT, ELIAS, MARA, PRINCE, EMBER, BOY,
  { ...BOLT, canonica: 'Bolt, a small robot; Bolt\'s eyes are blue' }, { nome: 'Max', nucleo: 'Max', tipo: 'animal', protagonista: true, origem: 'autor', genero: null, canonica: 'Max, a dog from Maxwell Street' },
  { nome: 'Rex', nucleo: 'Rex', tipo: 'animal', protagonista: true, origem: 'autor', genero: null, canonica: 'Rex, a friendly companion' },
  { nome: 'Zork', nucleo: 'Zork', tipo: 'criatura', protagonista: true, origem: 'autor', genero: null, canonica: 'Zork, a small glowing thing' },
  { nome: 'The Captain', nucleo: 'Captain', tipo: 'humano', protagonista: true, origem: 'autor', genero: 'man', canonica: 'The Captain, an old sailor' },
  { nome: 'Nemo', nucleo: 'Nemo', tipo: 'animal', protagonista: true, origem: 'autor', genero: null, canonica: 'a small orange fish with white stripes' }]

// a leitura do Bolt addef2b6: todos os traços do autor "yes" (o modelo viu robô, pequeno, redondo, laranja, olhos) — e a cabeça de cachorro
const TRACOS_SIM = ['small', 'round', 'orange', 'robot', 'big blue eyes'].map((trait, i) => ({ trait, category: ['size', 'shape', 'color', 'species', 'feature'][i], visible: 'yes' }))
const leituraJson = (kind) => JSON.stringify({ medium: 'cartoon_3d', characters: 1, traits: TRACOS_SIM, ...(kind ? { kind_check: kind } : {}) })
const CACHORRO = { body_and_head_match: 'yes', other_kind_parts: 'yes' }, LIMPA = { body_and_head_match: 'yes', other_kind_parts: 'no' }

function trechoDaRota(route, ini, fim) { const a = route.indexOf(ini); const b = route.indexOf(fim, a); assert.ok(a > 0 && b > a, 'trecho não achado: ' + ini.slice(0, 60)); return route.slice(a, b) }

async function suite(change) {
  const pares = change ? (Array.isArray(change[1]) ? change[1] : [[change[1], change[2]]]) : []
  const source = (file, src) => change && file.replaceAll('\\', '/') === change[0] ? pares.reduce((t, [de, para]) => t.split(de).join(para), src) : src
  const m = load(source)
  const L = m('@/' + F), S = m('@/' + SN), j = m('@/' + J), so = m('@/' + SO)
  const route = source(routeFile, local(routeFile)), rotaSonda = source(sondaRoute, local(sondaRoute))

  // ── 1. a folha sem o nome ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  assert.equal(L.canonicaSemNome(BOLT), 'a robot, exactly as the author wrote: "small round orange robot with big blue eyes"; drawn in the film\'s own look (stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic), the same character design in every scene')
  assert.equal(L.canonicaSemNome(CORPUS[6]), 'a robot, a small robot; the robot\'s eyes are blue', 'a 2ª ocorrência e o possessivo')
  assert.ok(L.canonicaSemNome(ELIAS).startsWith('a person, kept the old lighthouse'), 'gente: "a person"')
  assert.equal(L.canonicaSemNome(MARA), 'a person, a young radio operator; the person wears an olive green suit', 'o nome inteiro e cada parte')
  assert.equal(L.canonicaSemNome(PRINCE), 'a person, exactly as the author wrote: "bearded inventor in an 1880s suit"')
  assert.equal(L.canonicaSemNome(EMBER), 'a dragon, an anthropomorphic dragon character: a small green dragon with leathery wings')
  assert.equal(L.canonicaSemNome(BOY), BOY.canonica, 'sem nome próprio ("the boy"): fica')
  assert.equal(L.canonicaSemNome(CORPUS[7]), 'a dog, a dog from Maxwell Street', 'fronteira de palavra (Maxwell fica)')
  assert.equal(L.canonicaSemNome(CORPUS[8]), 'an animal, a friendly companion', 'sem ser escrito: o tipo, com "an"')
  assert.equal(L.canonicaSemNome(CORPUS[9]), 'a creature, a small glowing thing')
  assert.equal(L.canonicaSemNome(CORPUS[10]), CORPUS[10].canonica, '"The Captain" é papel, não nome')
  assert.equal(L.canonicaSemNome(CORPUS[11]), CORPUS[11].canonica, 'o nome fora da canônica: a mesma')
  assert.equal(L.canonicaSemNome({ nome: 'Zed', tipo: 'criatura', canonica: 'Zed, a tall pirate' }), 'a person, a tall pirate', 'gente escrita vence o tipo')
  assert.equal(L.canonicaSemNome({ nome: 'boy', tipo: 'humano', canonica: 'boy, a sad boy of about 8' }), 'boy, a sad boy of about 8', 'nome minúsculo é papel')
  for (const f of CORPUS) {
    assert.equal(L.promptDaFolha(f, LOOK), FM.promptDaFolha(f, LOOK), 'byte a byte com a main: ' + f.nome)
    assert.equal(L.promptDaFolha(f, LOOK, false), FM.promptDaFolha(f, LOOK), 'semNome falso = a main: ' + f.nome)
    assert.equal(L.promptDaFolha(f, null), FM.promptDaFolha(f, null))
    assert.equal(L.promptDaFolha(f, LOOK, true), FM.promptDaFolha({ ...f, canonica: L.canonicaSemNome(f) }, LOOK), 'sem nome: só a canônica muda')
  }
  assert.ok(!/\bBolt\b/.test(L.promptDaFolha(BOLT, LOOK, true)) && /nobody else: a robot, exactly as the author wrote/.test(L.promptDaFolha(BOLT, LOOK, true)))
  assert.ok(L.promptDaFolha(BOLT, LOOK).includes('nobody else: Bolt, exactly as the author wrote'))

  // o interruptor
  assert.equal(S.FICHA_SEM_NOME_2511, 'off', 'volta 2: nenhum filme sem o nome')
  assert.equal(S.fichaSemNomeLigada('internal', CASA), true)
  for (const e of [CLIENTE, 'joseph@usekineo.com', 'xjosephsskaf@gmail.com', '', null, undefined]) assert.equal(S.fichaSemNomeLigada('internal', e), false, String(e))
  assert.equal(S.fichaSemNomeLigada('off', CASA), false)
  assert.equal(S.fichaSemNomeLigada('public', CLIENTE), true)

  // a rota: a chave nasce antes do bloco; as 2 folhas a recebem; nenhuma folha sem ela
  const linha = trechoDaRota(route, '    const folhaSemNome2511 = ', '\n')
  assert.ok(route.indexOf(linha) < route.indexOf('    // >>> KINEO-META95-PERSONAGEM-2010 bloco'), 'a chave nasce antes do bloco')
  const chave = (email) => Function('fichaSemNomeLigada', 'FICHA_SEM_NOME_2511', 'user', ts.transpile(linha + '\nreturn folhaSemNome2511'))(S.fichaSemNomeLigada, S.FICHA_SEM_NOME_2511, { email })
  assert.equal(chave(CASA), false, "'off': nem a casa"); assert.equal(chave(CLIENTE), false); assert.equal(chave(null), false)
  assert.equal(route.split('promptDaFolha(f, styleAnchor, folhaSemNome2511)').length - 1, 2, 'as 2 folhas (a do filme e a nova do conferente)')
  assert.equal(route.split('promptDaFolha(f, styleAnchor)').length - 1, 0, 'nenhuma folha com o nome por esquecimento')
  // a folha do filme, executada (o trecho REAL)
  const folhaDoFilme = trechoDaRota(route, '      const folhasP = await Promise.all(', '\n')
  const pedirFolhas = async (folhaSemNome2511, elencoP) => {
    const pedidos = []
    const corpo = ts.transpile('return (async () => {\n' + folhaDoFilme + '\nreturn folhasP })()', { target: ts.ScriptTarget.ES2022 })
    const folhas = await Function('elencoP', 'qualidadeHerdada', 'referenciaDaCena', 'generateCinematicSceneStill', 'promptDaFolha', 'styleAnchor', 'folhaSemNome2511', 'generationSeed', 'aspectRequested', corpo)(
      elencoP, null, () => assert.fail('herdada'), async (a) => { pedidos.push(a); return 'https://x.org/folha.png' }, L.promptDaFolha, LOOK, folhaSemNome2511, 7, '9:16')
    assert.equal(folhas.length, elencoP.length)
    return pedidos
  }
  const casa = await pedirFolhas(chave(CASA), [BOLT, MARA]), cliente = await pedirFolhas(chave(CLIENTE), [BOLT, MARA]), ligada = await pedirFolhas(true, [BOLT, MARA])
  for (const [quem, ps] of [['casa', casa], ['cliente', cliente]]) igual(ps.map(p => p.scenePrompt), [FM.promptDaFolha(BOLT, LOOK), FM.promptDaFolha(MARA, LOOK)], quem + ': byte a byte o da main')
  igual(ligada.map(p => p.scenePrompt), [L.promptDaFolha(BOLT, LOOK, true), L.promptDaFolha(MARA, LOOK, true)], "a chave ligada (volta 3): a folha sem o nome")
  assert.ok(ligada.every(p => !/\b(?:Bolt|Mara|Quinn)\b/.test(p.scenePrompt)))
  igual(cliente.map(p => [p.seed, p.styleSuffix, p.pollWindowMs, p.aspect]), ligada.map(p => [p.seed, p.styleSuffix, p.pollWindowMs, p.aspect]), 'só o texto muda')
  // a folha nova do conferente, executada (o trecho REAL do juiz)
  const juizNaRota = trechoDaRota(route, '      if (juizDaFolhaLigado(JUIZ_DA_FOLHA_2411, user.email) && kling4TrialCandidate && !qualidadeHerdada', '        juizDaFolhaRelato2411 = julgadas.map((j) => j.relato)\n')
  const folhaNova = async (folhaSemNome2511, primeira) => {
    const gerados = []
    const ler = async (d, url) => ({ leitura: j.lerLeituraDaFolha(url.includes('nova') ? leituraJson(LIMPA) : primeira, true), custoUsd: 0.001, erro: null })
    const corpo = ts.transpile('return (async () => {\n' + juizNaRota + '\n} return null })()', { target: ts.ScriptTarget.ES2022 })
    await Function('juizDaFolhaLigado', 'JUIZ_DA_FOLHA_2411', 'user', 'kling4TrialCandidate', 'qualidadeHerdada', 'ensaioPersonagemFixo', 'folhaDe', 'elencoP', 'julgarAFolha', 'isStylizedLook', 'styleAnchor', 'desenhoInfantil', 'lerAFolha',
      'generateCinematicSceneStill', 'promptDaFolha', 'generationSeed', 'aspectRequested', 'folhasReprovadas2411', 'folhaSemNome2511', corpo)(
      j.juizDaFolhaLigado, j.JUIZ_DA_FOLHA_2411, { email: CASA }, true, null, false, new Map([['Bolt', 'https://x.org/folha.png']]), [BOLT], j.julgarAFolha, () => true, LOOK, { ativo: false }, ler,
      async (a) => { gerados.push(a.scenePrompt); return 'https://x.org/nova.png' }, L.promptDaFolha, 7, '9:16', new Set(), folhaSemNome2511)
    return gerados
  }
  const SEM_SMALL = JSON.stringify({ medium: 'cartoon_3d', characters: 1, traits: TRACOS_SIM.map(t => t.trait === 'small' ? { ...t, visible: 'no' } : t), kind_check: LIMPA })
  igual(await folhaNova(false, leituraJson(CACHORRO)), [], "o filme (forma 'sonda'): a cabeça de cachorro NÃO reprova, como na main")
  igual(await folhaNova(false, SEM_SMALL), [FM.promptDaFolha(BOLT, LOOK) + ' Exactly as the author wrote, clearly visible: small. Rendered in stylized 3D animated film look.'], 'a folha nova do filme: byte a byte a main')
  igual(await folhaNova(true, SEM_SMALL), [L.promptDaFolha(BOLT, LOOK, true) + ' Exactly as the author wrote, clearly visible: small. Rendered in stylized 3D animated film look.'], 'a chave ligada: a folha nova sem o nome')

  // ── 2. a FORMA no conferente ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  for (const [d, e] of [['small round orange robot with big blue eyes', 'robot'], ['small round orange robots', 'robot'], ['a red dragon with big wings', 'dragon'], ['old bearded sailor', 'person'],
    ['man in a dark suit and black tie', 'person'], ['a golden dog with a red bandana', 'dog'], ['a robot dog', null], ['a cat-like robot', null], ['a robot-like toy', null], ['half man half wolf', null], ['part dragon part robot', null],
    ['a robot and a dragon', null], ['small round orange robot, not a dog', null], ['a robot without ears', null], ['', null], ['   ', null], ['bright orange and round', null], ['a boy riding a horse', null]]) assert.equal(j.especieDaDescricao(d, 'on'), e, d)
  for (const modo of [undefined, 'sonda', 'off']) assert.equal(j.especieDaDescricao('small round orange robot', modo), null, 'o filme não pergunta: ' + modo)
  assert.equal(j.FORMA_DA_FOLHA_2511, 'sonda')
  igual([j.formaNaSonda(), j.formaNaSonda('sonda'), j.formaNaSonda('on'), j.formaNaSonda('off')], ['on', 'on', 'on', 'off'], 'a sonda pergunta, salvo com a chave off')
  const DB = 'small round orange robot with big blue eyes'
  // o pedido: só com o ser escrito; sem ele, byte a byte a main
  const comSer = JSON.stringify(j.pedidoAoJuizDaFolha(DB, 'https://x.org/f.png', 'robot').messages)
  assert.ok(comSer.includes('kind_check') && comSer.includes('those of a robot') && comSer.includes('other than a robot') && comSer.includes('own body (not clothing, not objects)'))
  assert.ok(!/e\.g\.|for example|such as|like this|FAIL|reject/i.test(comSer), 'sem exemplo e sem ordem de reprovar')
  for (const d of [DB, '', 'old bearded sailor']) igual(j.pedidoAoJuizDaFolha(d, 'https://x.org/f.png'), JM.pedidoAoJuizDaFolha(d, 'https://x.org/f.png'), 'sem o ser = a main: ' + d)
  // a leitura: perguntada e fora do formato = leitura falhou; não perguntada = byte a byte a main
  for (const raw of [leituraJson(null), leituraJson({ body_and_head_match: 'maybe', other_kind_parts: 'no' }), leituraJson({ body_and_head_match: 'yes' }), leituraJson('yes')]) assert.equal(j.lerLeituraDaFolha(raw, true), null, raw)
  igual(j.lerLeituraDaFolha(leituraJson(CACHORRO), true).forma, { corpo: 'yes', outra: 'yes' })
  for (const raw of [leituraJson(null), leituraJson(CACHORRO), leituraJson({ x: 1 })]) igual(j.lerLeituraDaFolha(raw), JM.lerLeituraDaFolha(raw), 'não perguntada = a main')
  // a decisão
  const dec = (kind, d = DB, foto = false, modo = 'on') => j.decidirDaFolha(j.lerLeituraDaFolha(leituraJson(kind), true) ?? j.lerLeituraDaFolha(leituraJson(kind)), foto, d, modo)
  { const v = j.decidirDaFolha(j.lerLeituraDaFolha(leituraJson(CACHORRO), true), false, DB); igual([v.forma, v.especie, j.folhaPassa(v)], ['nao_julgada', null, true], 'o filme: a forma não julga (como a main)')
    for (const k of [CACHORRO, LIMPA, null]) { const l = j.lerLeituraDaFolha(leituraJson(k)); const a = j.decidirDaFolha(l, false, DB), b = JM.decidirDaFolha(JM.lerLeituraDaFolha(leituraJson(k)), false, DB)
      igual([a.tracos, a.meio, a.ausentes, a.descartados, j.folhaPassa(a), j.instrucaoDaFolhaNova(a, 'x')], [b.tracos, b.meio, b.ausentes, b.descartados, JM.folhaPassa(b), JM.instrucaoDaFolhaNova(b, 'x')], 'o veredito do filme = a main') } }
  const vCao = dec(CACHORRO)
  igual([vCao.tracos, vCao.meio, vCao.forma, vCao.especie, j.folhaPassa(vCao)], ['ok', 'ok', 'outra_especie', 'robot', false], 'o Bolt addef2b6: traços ok, forma reprova')
  igual([dec({ body_and_head_match: 'no', other_kind_parts: 'no' }).forma, j.folhaPassa(dec({ body_and_head_match: 'no', other_kind_parts: 'no' }))], ['nao_e', false])
  igual([dec(LIMPA).forma, j.folhaPassa(dec(LIMPA))], ['ok', true])
  igual([dec({ body_and_head_match: 'unclear', other_kind_parts: 'unclear' }).forma, j.folhaPassa(dec({ body_and_head_match: 'unclear', other_kind_parts: 'unclear' }))], ['ok', true], '"unclear" não reprova')
  for (const d of ['a robot dog', 'a cat-like robot', '', 'small round orange robot, not a dog']) igual([dec(CACHORRO, d).forma, j.folhaPassa(dec(CACHORRO, d))], ['nao_julgada', true], 'híbrido, vazio e negação não julgam: ' + d)
  igual(j.decidirDaFolha(j.lerLeituraDaFolha(leituraJson(null)), false, DB, 'on').forma, 'nao_julgada', 'leitura sem a forma (decisão direta): não julga')
  // a folha nova
  assert.equal(j.instrucaoDaFolhaNova(vCao, LOOK.lookPhrase), ' Its body and head are entirely those of a robot. Rendered in stylized 3D animated film look.')
  assert.equal(j.instrucaoDaFolhaNova({ ...vCao, especie: 'owl' }, 'x'), ' Its body and head are entirely those of an owl. Rendered in x.')
  assert.equal(j.instrucaoDaFolhaNova(dec(LIMPA), 'x'), '', 'passou: nada')
  // a rede, falsa: o pedido leva a pergunta só com o ser; resposta sem ela = leitura falhou; sem o ser = o corpo da main
  const rede = async (mod, descricao, conteudo, forma) => { const corpos = []; const r = await mod.lerAFolha(descricao, 'https://x.org/f.png', { apiKey: 'k', ...(forma ? { forma } : {}), fetchImpl: async (_u, o) => { corpos.push(o.body); return { ok: true, json: async () => ({ choices: [{ message: { content: conteudo } }], usage: { prompt_tokens: 100, completion_tokens: 50 } }) } } }); return { r, corpos } }
  const r1 = await rede(j, DB, leituraJson(null), 'on')
  assert.ok(r1.corpos[0].includes('kind_check')); igual([r1.r.leitura, r1.r.erro], [null, 'resposta_ilegivel'], 'perguntada e não respondida: leitura falhou')
  igual((await rede(j, DB, leituraJson(CACHORRO), 'on')).r.leitura.forma, { corpo: 'yes', outra: 'yes' })
  for (const d of [DB, 'old bearded sailor', '', 'a robot dog']) { const a = await rede(j, d, leituraJson(null)), b = await rede(JM, d, leituraJson(null)); igual([a.corpos, a.r], [b.corpos, b.r], 'o filme: byte a byte a main: ' + d); const c = await rede(j, d, leituraJson(CACHORRO)), e = await rede(JM, d, leituraJson(CACHORRO)); igual([c.corpos, c.r], [e.corpos, e.r]) }
  // o laço
  const fila = (...ks) => { const q = [...ks]; return async () => { const k = q.shift(); assert.ok(k !== undefined, 'leitura a mais'); return { leitura: j.lerLeituraDaFolha(leituraJson(k), true), custoUsd: 0.001, erro: null } } }
  const gerou = []
  const julgarCom = (mod, ks, ficha = BOLT, foto = false) => mod.julgarAFolha({ ficha, url: 'https://x.org/folha-1.png', filmeFotorreal: foto, lookPhrase: LOOK.lookPhrase }, { ler: fila(...ks), gerar: async (i) => { gerou.push(i); return 'https://x.org/nova.png' } })
  const jOn = load((file, src) => { const t = source(file, src); return file.replaceAll('\\', '/') === J ? t.replace("FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'sonda'", "FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'on'") : t })('@/' + J)
  const julgar = (ks, ficha, foto) => julgarCom(jOn, ks, ficha, foto)
  for (const ks of [[CACHORRO], [CACHORRO, CACHORRO], [LIMPA], [null]]) {
    const filaM = (mod, ...q) => { const r = [...q]; return async () => { const k = r.shift(); return { leitura: mod.lerLeituraDaFolha(leituraJson(k)), custoUsd: 0.001, erro: null } } }
    const arg = { ficha: BOLT, url: 'https://x.org/folha-1.png', filmeFotorreal: false, lookPhrase: LOOK.lookPhrase }
    const a = await j.julgarAFolha(arg, { ler: filaM(j, ...ks), gerar: async () => 'https://x.org/nova.png' }), b = await JM.julgarAFolha(arg, { ler: filaM(JM, ...ks), gerar: async () => 'https://x.org/nova.png' })
    igual(a, b, 'o filme: o relato e a folha = a main ' + JSON.stringify(ks)) }
  gerou.length = 0
  let r = await julgar([CACHORRO, LIMPA])
  igual([r.url, r.relato.forma, r.relato.forma_1, r.relato.tentativa, r.relato.regerou, r.relato.tracos], ['https://x.org/nova.png', 'ok', 'outra_especie', 2, true, 'ok'], 'cachorro na 1ª, robô na 2ª: serve a nova')
  igual(gerou, [' Its body and head are entirely those of a robot. Rendered in stylized 3D animated film look.'])
  r = await julgar([CACHORRO, CACHORRO])
  igual([r.url, r.relato.forma, r.relato.serve], [null, 'outra_especie', false], 'cachorro 2 vezes: não serve')
  r = await julgar([LIMPA])
  igual([r.url, r.relato.forma, r.relato.tentativa], ['https://x.org/folha-1.png', 'ok', 1])
  // a tolerância do meio não salva a forma (criatura em animação num filme de foto, com cachorro)
  r = await julgar([CACHORRO, CACHORRO], BOLT, true)
  igual([r.url, r.relato.meio], [null, 'meio'], 'tolerância só com a forma certa')
  r = await julgar([LIMPA, LIMPA], BOLT, true)
  igual([r.url, r.relato.meio], ['https://x.org/nova.png', 'meio_tolerado'], 'a tolerância de antes continua')

  // ── 3. a sonda ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const corpoOk = { nome: 'Bolt', tipo: 'criatura', canonica: BOLT.canonica, look_phrase: LOOK.lookPhrase, filme_fotorreal: false, sem_nome: true, seed: 42 }
  igual(so.lerPedidoDaSonda(corpoOk), { nome: 'Bolt', tipo: 'criatura', canonica: BOLT.canonica, lookPhrase: LOOK.lookPhrase, filmeFotorreal: false, semNome: true, seed: 42 })
  for (const ruim of [null, 'x', { ...corpoOk, seed: 1.5 }, { ...corpoOk, seed: -1 }, { ...corpoOk, seed: undefined }, { ...corpoOk, tipo: 'robo' }, { ...corpoOk, sem_nome: 'sim' }, { ...corpoOk, filme_fotorreal: 1 },
    { ...corpoOk, canonica: 'x'.repeat(1201) }, { ...corpoOk, nome: '' }, { ...corpoOk, look_phrase: 'a\u0007b' }]) assert.equal(so.lerPedidoDaSonda(ruim), null, JSON.stringify(ruim)?.slice(0, 60))
  const est = so.novoEstadoDaSonda()
  assert.equal(so.admitirSonda(est, CLIENTE, 'a'), 'nao_e_da_casa'); igual([est.ocupada, est.chamadas, est.feitas.size], [false, 0, 0], 'cliente não reserva nada')
  assert.equal(so.admitirSonda(est, 'xjosephsskaf@gmail.com', 'a'), 'nao_e_da_casa')
  assert.equal(so.admitirSonda(est, CASA, 'a'), 'ok')
  assert.equal(so.admitirSonda(est, CASA, 'b'), 'ocupada', 'uma por vez')
  so.liberarSonda(est)
  assert.equal(so.admitirSonda(est, CASA, 'a'), 'repetida', 'o mesmo pedido não repete')
  for (let i = 1; i < so.SONDA_DA_FOLHA_TETO_POR_INSTANCIA; i++) { assert.equal(so.admitirSonda(est, CASA, 'k' + i), 'ok'); so.liberarSonda(est) }
  assert.equal(so.admitirSonda(est, CASA, 'outra'), 'teto')
  assert.equal(so.SONDA_DA_FOLHA_TETO_POR_INSTANCIA, 8)
  assert.notEqual(so.chaveDaSonda(so.lerPedidoDaSonda(corpoOk)), so.chaveDaSonda(so.lerPedidoDaSonda({ ...corpoOk, sem_nome: false })), 'com e sem o nome são 2 pedidos')
  assert.notEqual(so.chaveDaSonda(so.lerPedidoDaSonda(corpoOk)), so.chaveDaSonda(so.lerPedidoDaSonda({ ...corpoOk, seed: 43 })))
  const sonda = async (corpo, respostas = {}) => {
    const log = { gerar: [], guardar: [], ler: [] }
    const res = await so.rodarSondaDaFolha(so.lerPedidoDaSonda(corpo), {
      gerar: async (p, s) => { log.gerar.push([p, s]); return 'falha' in respostas ? null : 'https://v3.fal.media/f.png' },
      guardar: async (u) => { log.guardar.push(u); return 'semBucket' in respostas ? null : 'https://nosso.bucket/f.png' },
      ler: async (d, u) => { log.ler.push([d, u]); return 'semLeitura' in respostas ? { leitura: null, custoUsd: 0.000559, erro: 'timeout' } : { leitura: j.lerLeituraDaFolha(leituraJson(CACHORRO), true), custoUsd: 0.000559, erro: null } },
    })
    return { res, log }
  }
  let s = await sonda(corpoOk)
  igual(s.log.gerar, [[L.promptDaFolha(BOLT, LOOK, true), 42]], 'UMA folha, sem o nome, com a semente pedida')
  igual(s.log.guardar, ['https://v3.fal.media/f.png']); igual(s.log.ler, [[DB, 'https://nosso.bucket/f.png']], 'o conferente lê a folha do NOSSO bucket')
  igual([s.res.url, s.res.custo_usd, s.res.especie, s.res.veredito.forma, s.res.erro, s.res.descricao], ['https://nosso.bucket/f.png', 0.025559, 'robot', 'outra_especie', null, DB], 'a sonda julga a forma (o filme não), reprovou e NÃO regerou; a folha a US$ 0,025 do catálogo')
  assert.equal(so.SONDA_FOLHA_USD, 0.025); assert.equal(L.PERSONAGEM_FOLHA_USD, FM.PERSONAGEM_FOLHA_USD, 'a constante do filme não muda nesta volta')
  s = await sonda({ ...corpoOk, sem_nome: false })
  igual(s.log.gerar[0][0], FM.promptDaFolha(BOLT, LOOK), 'com o nome: a folha de hoje, byte a byte')
  s = await sonda(corpoOk, { falha: 1 }); igual([s.res.erro, s.res.custo_usd, s.log.guardar.length, s.log.ler.length], ['folha_falhou', 0.025, 0, 0])
  s = await sonda(corpoOk, { semBucket: 1 }); igual([s.res.erro, s.res.url, s.log.ler.length], ['bucket_falhou', null, 0], 'sem bucket, sem leitura')
  s = await sonda(corpoOk, { semLeitura: 1 }); igual([s.res.erro, s.res.veredito, s.res.custo_usd], ['timeout', null, 0.025559])
  // a rota da sonda: lida (Next não roda offline). A trava antes de qualquer chamada; a vez liberada no finally; nada de banco nem de crédito
  assert.ok(/const admissao = admitirSonda\(estado, user\.email, chaveDaSonda\(pedido\)\)\n\s+if \(admissao !== 'ok'\) return/.test(rotaSonda), 'a trava vem antes da chamada paga')
  assert.ok(rotaSonda.indexOf('admitirSonda(') < rotaSonda.indexOf('rodarSondaDaFolha('))
  assert.ok(/\} finally \{\n\s+liberarSonda\(estado\)\n\s+\}/.test(rotaSonda), 'a vez é liberada mesmo com erro')
  assert.ok(rotaSonda.includes("if (!user) return NextResponse.json({ erro: 'nao_e_da_casa' }, { status: 403 })"))
  assert.ok(!/\.from\(|\.insert\(|\.rpc\(|debitVideoCredits|\.env\.local/.test(rotaSonda), 'sem banco e sem crédito')
  assert.ok(rotaSonda.includes('persistFastStill(url') && rotaSonda.includes('generateCinematicSceneStill({ scenePrompt: prompt'))
  assert.ok(rotaSonda.includes('lerAFolha(descricao, url, { forma: formaNaSonda() })'), 'a sonda pergunta a forma')
}

await suite(null)

// nenhum arquivo de navegador importa as peças do servidor (lib/internalAccounts)
const deNavegador = execSync('git grep -l -E "^.use client" -- app components lib', { encoding: 'utf8' }).split('\n').filter(Boolean)
for (const f of deNavegador) assert.ok(!/fichaSemNome2511|sondaDaFolha2511|juizDaFolha2411/.test(local(f)), 'arquivo de navegador importa o servidor: ' + f)

const mutants = [
  // 1. a folha sem o nome
  [F, "  if (!new RegExp(fonte, 'u').test(c)) return c\n", "  return c\n"],
  [F, "const partes = [nome, ...nome.split(' ').filter((p) => p.length >= 3 && /^\\p{Lu}/u.test(p) && p !== nome)]", 'const partes = [nome]'],
  [F, "})(?![\\\\p{L}\\\\p{N}])`", '})`'],
  [F, "  if (!/^\\p{Lu}/u.test(nome) || /^the\\s/i.test(nome)) return c\n", "  if (/^the\\s/i.test(nome)) return c\n"],
  [F, " || /^the\\s/i.test(nome)) return c", ') return c'],
  [F, "/^[aeiou]/.test(ser) ? 'an' : 'a'", "'a'"],
  [F, ": `the ${ser}`; primeira = false", ": `a ${ser}`; primeira = false"],
  [F, "(PESSOA_RE.test(resto) || ficha.tipo === 'humano' ? 'person'", "(ficha.tipo === 'humano' ? 'person'"],
  [F, "ficha.tipo === 'animal' ? 'animal' : 'creature'", "'creature'"],
  [F, '${semNome ? canonicaSemNome(ficha) : ficha.canonica}', '${ficha.canonica}'],
  [F, '${semNome ? canonicaSemNome(ficha) : ficha.canonica}', '${canonicaSemNome(ficha)}'],
  [SN, "export const FICHA_SEM_NOME_2511: ModoFichaSemNome2511 = 'off'", "export const FICHA_SEM_NOME_2511: ModoFichaSemNome2511 = 'internal'"], // a casa recebe a troca com os defeitos do §4
  [SN, "modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))", "modo !== 'off'"],
  [routeFile, 'promptDaFolha(f, styleAnchor, folhaSemNome2511), styleSuffix: \'\', seed: (generationSeed + 7_919 * (101', 'promptDaFolha(f, styleAnchor), styleSuffix: \'\', seed: (generationSeed + 7_919 * (101'],
  [routeFile, 'promptDaFolha(f, styleAnchor, folhaSemNome2511) + instrucao', 'promptDaFolha(f, styleAnchor) + instrucao'],
  [routeFile, 'const folhaSemNome2511 = fichaSemNomeLigada(FICHA_SEM_NOME_2511, user.email)', 'const folhaSemNome2511 = true'],
  // 2. a forma
  [J, ' || HIBRIDO_RE.test(d)) return null', ') return null'],
  [J, '  return seres.size === 1 ? [...seres][0] : null', '  return seres.size >= 1 ? [...seres][0] : null'],
  [J, " || temNegacao(d) || HIBRIDO_RE.test(d)) return null", " || HIBRIDO_RE.test(d)) return null"],
  [J, "  if (GENTE_RE.test(d)) seres.add('person')\n", ''],
  [J, "  if (modo !== 'on' || !d.trim()", "  if (!d.trim()"],
  [J, "export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'sonda'", "export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'off'"], // a sonda deixa de perguntar
  [J, "export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'sonda'", "export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'on'"], // o filme passa a perguntar
  [J, "(modo === 'off' ? 'off' : 'on')", 'modo'], // a sonda herda o 'sonda' e não pergunta
  [J, "...(FORMA_DA_FOLHA_2511 === 'on' ? {", '...(true ? {'], // o relato do filme ganha chaves
  [J, 'especieDaDescricao(descricao, opts.forma ?? FORMA_DA_FOLHA_2511)', 'especieDaDescricao(descricao, FORMA_DA_FOLHA_2511)'], // a sonda não consegue pedir a forma
  [J, 'const especie = especieDaDescricao(descricao, modoForma) // KINEO-FORMA-DA-FOLHA-2511\n  const formaV', 'const especie = especieDaDescricao(descricao) // KINEO-FORMA-DA-FOLHA-2511\n  const formaV'],
  [SO, 'decidirDaFolha(r.leitura, p.filmeFotorreal, descricao, modoForma)', 'decidirDaFolha(r.leitura, p.filmeFotorreal, descricao)'], // a sonda decide sem a forma
  [SO, 'especieDaDescricao(descricao, modoForma)', 'especieDaDescricao(descricao)'],
  [SO, 'export const SONDA_FOLHA_USD = 0.025', 'export const SONDA_FOLHA_USD = 0.015'], // o preço velho
  [sondaRoute, 'lerAFolha(descricao, url, { forma: formaNaSonda() })', 'lerAFolha(descricao, url)'],
  [J, '    (especie ? ` Also answer "kind_check"', '    (false ? ` Also answer "kind_check"'],
  [J, '    (especie ? ` Also answer "kind_check"', '    (true ? ` Also answer "kind_check"'],
  [J, '  if (exigeForma && !forma) return null\n', ''],
  [J, '  return exigeForma ? { meio, personagens, tracos, forma } : { meio, personagens, tracos }', '  return { meio, personagens, tracos, forma }'],
  [J, "l.forma.corpo === 'no' ? 'nao_e' : ", ''],
  [J, "l.forma.outra === 'yes' ? 'outra_especie' : ", ''],
  [J, " && formaPassa(v)\n", '\n'],
  [J, "v.forma === 'ok' || v.forma === 'nao_julgada'", "v.forma !== 'nao_e'"],
  [J, '  const ser = !formaPassa(v) && v.especie ?', '  const ser = false ?'],
  [J, "lerLeituraDaFolha(data.choices?.[0]?.message?.content ?? '', especie !== null)", "lerLeituraDaFolha(data.choices?.[0]?.message?.content ?? '', false)"],
  [J, 'pedidoAoJuizDaFolha(descricao, url, especie)', 'pedidoAoJuizDaFolha(descricao, url)'],
  [J, 'formaPassa(v2) /* KINEO-FORMA-DA-FOLHA-2511 */ && ', ''],
  [J, "forma_1: v1 ? v1.forma : 'sem_leitura' as const", "forma_1: 'ok' as const"],
  // 3. a sonda
  [SO, "  if (!contaDaCasaExata(email)) return 'nao_e_da_casa'\n", ''],
  [SO, "  if (estado.ocupada) return 'ocupada'\n", ''],
  [SO, "  if (estado.feitas.has(chave)) return 'repetida'\n", ''],
  [SO, 'if (estado.chamadas >= SONDA_DA_FOLHA_TETO_POR_INSTANCIA)', 'if (estado.chamadas >= 999)'],
  [SO, 'promptDaFolha(ficha, { lookPhrase: p.lookPhrase }, p.semNome)', 'promptDaFolha(ficha, { lookPhrase: p.lookPhrase })'],
  [SO, '  const url = await deps.guardar(falUrl).catch(() => null)', '  const url = falUrl'],
  [SO, '(SONDA_FOLHA_USD + r.custoUsd)', '(r.custoUsd)'],
  [SO, 'JSON.stringify([p.nome, p.tipo, p.canonica, p.lookPhrase, p.semNome, p.seed])', 'JSON.stringify([p.nome, p.tipo, p.canonica, p.lookPhrase, p.seed])'],
  [sondaRoute, '  } finally {\n    liberarSonda(estado)\n  }', '  } finally {\n  }'],
  [sondaRoute, "  if (!user) return NextResponse.json({ erro: 'nao_e_da_casa' }, { status: 403 })\n", ''],
]
let mortos = 0
for (const mutant of mutants) {
  for (const [de] of Array.isArray(mutant[1]) ? mutant[1] : [[mutant[1]]]) assert.ok(local(mutant[0]).includes(de), 'mutante não aplica: ' + de)
  await assert.rejects(suite(mutant), err => err instanceof assert.AssertionError, 'SOBREVIVEU: ' + mutant[1])
  mortos++
}
console.log(`PASS KINEO-FICHA-SEM-NOME-2511 + FORMA-DA-FOLHA-2511 + SONDA-DA-FOLHA-2511 (volta 2: só a sonda): nenhum filme muda (casa e cliente byte a byte a main: folha, pedido, leitura, corpo à OpenAI, relato); a chave ligada (volta 3) pede a folha sem o nome próprio ("a robot", "the robot"); as 2 folhas da rota (filme e nova do conferente) executadas; o conferente pergunta a FORMA pelo ser único do autor (híbrido, negação, dois seres e sem ser = não julga), o Bolt addef2b6 reprova em 'outra_especie' e a folha nova pede o corpo e a cabeça do robô; a tolerância do meio não salva a forma; a sonda: só a casa, uma por vez, sem repetir, teto 8, UMA folha no nosso bucket e UMA leitura, sem banco; ${mortos}/${mutants.length} mutantes mortos.`)
