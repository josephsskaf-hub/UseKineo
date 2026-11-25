// KINEO-FORMA-NOS-FILMES-2511 — guardião que EXECUTA as três peças com a rede FALSA (nada sai da máquina: OpenAI, fal e bucket são falsos):
//   1. a pergunta de forma (head_check) nos filmes da CASA: FORMA_DA_FOLHA_2511 = 'internal' e formaNoFilme; o trecho REAL da rota que julga as folhas,
//      executado contra a base (5b924b758) — a casa: o cachorro-robô reprova e recebe a folha nova de sempre; cliente, 'off' e 'sonda': byte a byte a base;
//   2. o relato do conferente cego (tracos_nao_julgados: 'sem_descricao' | 'sem_aparencia' | 'nenhum_julgavel', além de 'negacao');
//   3. as palavras de negação da revisora (volta 5 §2), uma a uma, cada uma com um mutante que a tira.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const J = 'lib/cinematic/juizDaFolha2411.ts', routeFile = 'app/api/generate-video-cinematic/route.ts', CRITICO = 'lib/cinematic/criticoStill.ts'
const BASE = '5b924b758' // a origin/main em que esta entrega nasceu (a volta 5 da ficha publicada)
const local = file => readFileSync(file, 'utf8').replaceAll('\r\n', '\n')
const daBase = file => execSync(`git show ${BASE}:${file}`, { encoding: 'utf8', maxBuffer: 64 << 20 }).replaceAll('\r\n', '\n')
const GLOBALS = { AbortSignal, AbortController, setTimeout, clearTimeout }
const load = (source) => createOfflineLoader({ source, globals: GLOBALS })
const igual = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m)
const CASA = 'josephsskaf@gmail.com', CLIENTE = 'cliente@example.org'
const chave = (de, para) => (t) => t.replace(`export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = '${de}'`, `export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = '${para}'`)
const juizPublico = (t) => t.replace("export const JUIZ_DA_FOLHA_2411: ModoJuizDaFolha2411 = 'internal'", "export const JUIZ_DA_FOLHA_2411: ModoJuizDaFolha2411 = 'public'")

const BASE_SRC = { [J]: daBase(J), [routeFile]: daBase(routeFile) }
const baseCom = (...fs) => load((file, src) => { const k = file.replaceAll('\\', '/'); const t = BASE_SRC[k] ?? src; return k === J ? fs.reduce((x, f) => f(x), t) : t })('@/' + J)
const JB = baseCom()

const ficha = (nome, tipo, canonica) => ({ nome, nucleo: nome, tipo, protagonista: true, origem: 'autor', genero: null, canonica })
const BOLT = ficha('Bolt', 'criatura', 'Bolt, exactly as the author wrote: "small round orange robot with big blue eyes"; drawn in the film\'s own look (stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic), the same character design in every scene')
const SLOCUM = ficha('Joshua Slocum', 'humano', 'Joshua Slocum, the first man to sail around the world alone; as the request describes: "old bearded sailor"')
const EMBER = ficha('Ember', 'criatura', 'Ember, an anthropomorphic dragon character: a small green dragon with leathery wings')
const ELIAS = ficha('Elias Ward', 'humano', 'Elias Ward, exactly as the author wrote: "gray-bearded lighthouse keeper in a navy coat"')
const NEGA = ficha('Bolt', 'criatura', 'Bolt, exactly as the author wrote: "small round orange robot, not a dog"')
const DB = 'small round orange robot with big blue eyes'
const tr = (trait, category, visible = 'yes', appearance = 'yes') => ({ trait, category, visible, ...(appearance === undefined ? {} : { appearance }) })
const TRACOS_SIM = [tr('small', 'size'), tr('round', 'shape'), tr('orange', 'color'), tr('robot', 'species'), tr('big blue eyes', 'feature')]
const SLOCUM_SIM = [tr('old', 'feature'), tr('bearded', 'feature'), tr('sailor', 'role', 'unclear', 'no')]
// as cabeças da sonda das 06:07 (o formato do head_check): c1 = cabeça de cachorro; c2/c4 = robô; gente = homem
const C1_CAO = { resembles: 'dog', animal_ears: 'yes', nose: 'yes', snout_or_muzzle: 'yes', fur: 'no' }
const ROBO = { resembles: 'robot', animal_ears: 'no', nose: 'no', snout_or_muzzle: 'no', fur: 'no' }
const HOMEM = { resembles: 'man', animal_ears: 'no', nose: 'yes', snout_or_muzzle: 'no', fur: 'yes' }
const leituraJson = (head, traits = TRACOS_SIM, medium = 'cartoon_3d') => JSON.stringify({ medium, characters: 1, traits, ...(head ? { head_check: head } : {}) })

function trechoDaRota(route) {
  const ini = route.indexOf('      if (juizDaFolhaLigado(JUIZ_DA_FOLHA_2411, user.email) && kling4TrialCandidate && !qualidadeHerdada')
  assert.ok(ini > 0, 'o trecho do conferente na rota')
  return route.slice(ini, route.indexOf('\n      }\n', ini) + 9)
}
// O trecho REAL da rota, com a OpenAI falsa (o corpo enviado é gravado; a resposta vem pela URL da folha) e a fal falsa.
async function filmeNaRota(route, j, { email, elencoP, respostas, look = 'animated3d' }) {
  const corpos = [], gerados = [], folhaDe = new Map(elencoP.map((f) => [f.nome, `https://x.org/folha-${f.nome.split(' ')[0]}.png`]))
  const fetchImpl = async (_u, o) => { const b = JSON.parse(o.body); corpos.push(o.body); const url = b.messages[1].content[1].image_url.url
    const r = respostas[url]; assert.ok(r !== undefined, 'leitura sem resposta: ' + url); return { ok: true, json: async () => ({ choices: [{ message: { content: r } }], usage: { prompt_tokens: 3000, completion_tokens: 120 } }) } }
  const escopo = { visualParaImagemOuReserva: texto => texto, epocaVisual: null, aplicarEpocaVisual: (p) => p, juizDaFolhaLigado: j.juizDaFolhaLigado, JUIZ_DA_FOLHA_2411: j.JUIZ_DA_FOLHA_2411, user: { email }, kling4TrialCandidate: true, qualidadeHerdada: null, ensaioPersonagemFixo: false,
    folhaDe, elencoP, julgarAFolha: j.julgarAFolha, isStylizedLook: (s) => s.look !== 'photoreal', styleAnchor: { look, lookPhrase: look === 'photoreal' ? 'photorealistic, ultra-detailed' : 'stylized 3D animated film look' },
    desenhoInfantil: { ativo: false }, lerAFolha: (d, u, o) => j.lerAFolha(d, u, { ...(o ?? {}), apiKey: 'k', fetchImpl }),
    generateCinematicSceneStill: async (a) => { gerados.push(a.scenePrompt); return `https://x.org/nova-${gerados.length}.png` }, promptDaFolha: (f) => 'Character reference sheet: ' + f.canonica,
    generationSeed: 7, aspectRequested: '9:16', folhasReprovadas2411: new Set(), folhaSemNome2511: false, formaNoFilme: j.formaNoFilme, FORMA_DA_FOLHA_2511: j.FORMA_DA_FOLHA_2511 }
  const corpo = ts.transpile('return (async () => {\n' + trechoDaRota(route) + '\nreturn { folhasReprovadas2411, juizDaFolhaRelato2411 } })()', { target: ts.ScriptTarget.ES2022 })
  const r = await Function(...Object.keys(escopo), 'let juizDaFolhaRelato2411 = null\n' + corpo)(...Object.values(escopo))
  return { corpos, gerados, folhas: Object.fromEntries(folhaDe), reprovadas: [...r.folhasReprovadas2411], relato: r.juizDaFolhaRelato2411 }
}

const NEGACOES_NOVAS = [['instead', 'a red beanie instead of a hat'], ['except', 'dressed in everything except a hat'], ['exceto', 'tudo azul, exceto o chapéu'], ['excepto', 'todo negro excepto los zapatos'],
  ['tampouco', 'tampouco usa chapéu'], ['tampoco', 'tampoco lleva sombrero'], ['zero', 'a man with zero tattoos'], ['minus', 'a man minus the hat'], ['devoid', 'a face devoid of wrinkles']]
const PARES_NOVOS = [ // [o trecho que o mutante tira, a frase]
  ["['free', new Set(['from'])], ", 'skin free from tattoos'], ["['rather', new Set(['than'])], ", 'a robot rather than a dog'], ["['anything', new Set(['but'])],", 'a robot, anything but a dog'],
  [["['em', new Set(['vez', 'lugar'])]", "['em', new Set(['lugar'])]"], 'um robô em vez de um cachorro'], [["['em', new Set(['vez', 'lugar'])]", "['em', new Set(['vez'])]"], 'um gorro em lugar de chapéu'],
  [["new Set(['invés', 'inves'])", "new Set(['inves'])"], 'de tênis ao invés de botas'], [["new Set(['invés', 'inves'])", "new Set(['invés'])"], 'de tenis ao inves de botas'],
  [["['en', new Set(['vez', 'lugar'])]", "['en', new Set(['lugar'])]"], 'un robot en vez de un perro'], [["['en', new Set(['vez', 'lugar'])]", "['en', new Set(['vez'])]"], 'en lugar de sombrero, una boina'],
  ["['nada', new Set(['de'])],", 'nada de sombrero, bufanda roja'],
  [["new Set(['o', 'a', 'os', 'as'])", "new Set(['a', 'os', 'as'])"], 'tudo azul, menos o chapéu'], [["new Set(['o', 'a', 'os', 'as'])", "new Set(['o', 'os', 'as'])"], 'tudo preto, menos a gravata'],
  [["new Set(['o', 'a', 'os', 'as'])", "new Set(['o', 'a', 'as'])"], 'tudo branco, menos os sapatos'], [["new Set(['o', 'a', 'os', 'as'])", "new Set(['o', 'a', 'os'])"], 'tudo verde, menos as botas'],
  [["['w', new Set(['o'])]", "['w', new Set([])]"], 'a man w/o glasses']]
// sem negação: continuam julgadas (por isso "rather", "menos" e "salvo" sozinhos ficaram de fora)
const NAO_NEGAM = ['a rather tall man in a red coat', 'menos de 30 anos, cabelo cacheado', 'um homem salvo do naufrágio, de barba', 'salva-vidas de camiseta vermelha', 'a free spirit with a red scarf',
  'em casa, de pijama azul', 'ao lado do cachorro, de boné', 'en casa, con sombrero', 'a robot that can do anything, orange', 'a W-shaped logo on a blue shirt', 'a 10 year old girl in a yellow dress', 'a man with a hat',
  'a woman with zebra stripes', 'a gloomy minstrel',
  'a robot in hook (0-2s): orange', 'a 2.0 robot, orange', 'a cat with 0 whiskers' /* "0" fora da lista: no corpus real era sempre marcação de tempo */]

async function suite(change) {
  const pares = change ? (Array.isArray(change[1]) ? change[1] : [[change[1], change[2]]]) : []
  const muda = (file, src) => change && file.replaceAll('\\', '/') === change[0] ? pares.reduce((t, [de, para]) => t.split(de).join(para), src) : src
  const tipCom = (...fs) => load((file, src) => { const k = file.replaceAll('\\', '/'); const t = muda(k, src); return k === J ? fs.reduce((x, f) => f(x), t) : t })('@/' + J)
  const j = tipCom(), critico = load()('@/' + CRITICO)
  const route = muda(routeFile, local(routeFile)), routeBase = BASE_SRC[routeFile]

  // ── 1. a chave ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  assert.equal(j.FORMA_DA_FOLHA_2511, 'internal')
  igual([j.formaNoFilme('internal', CASA), j.formaNoFilme('on', CLIENTE), j.formaNoFilme('on', CASA)], ['on', 'on', 'on'])
  for (const e of [CLIENTE, 'joseph@usekineo.com', 'xjosephsskaf@gmail.com', '', null, undefined]) assert.equal(j.formaNoFilme('internal', e), 'off', String(e))
  for (const m of ['off', 'sonda']) assert.equal(j.formaNoFilme(m, CASA), 'off', m)
  igual([j.formaNaSonda(), j.formaNaSonda('internal'), j.formaNaSonda('off')], ['on', 'on', 'off'], 'a sonda pergunta como antes')
  assert.ok(route.includes('const formaDoFilme2511 = formaNoFilme(FORMA_DA_FOLHA_2511, user.email)'), 'a rota lê a chave com o e-mail do usuário')

  // ── 1b. o filme da CASA: o trecho REAL da rota ─────────────────────────────────────────────────────────────────────────────────────────
  // o Bolt da prova (addef2b6): a 1ª folha com cabeça de cachorro (traços TODOS "yes": o conferente de antes aprovava), a nova é robô
  let f = await filmeNaRota(route, j, { email: CASA, elencoP: [BOLT], respostas: { 'https://x.org/folha-Bolt.png': leituraJson(C1_CAO), 'https://x.org/nova-1.png': leituraJson(ROBO) } })
  assert.equal(f.corpos.length, 2); for (const c of f.corpos) assert.ok(c.includes('head_check') && c.includes('snout_or_muzzle'), 'o head_check vai ao leitor')
  igual(f.gerados, ['Character reference sheet: ' + BOLT.canonica + ' Its body and head are entirely those of a robot. Rendered in stylized 3D animated film look.'], 'a folha nova de sempre (instrucaoDaFolhaNova)')
  igual([f.folhas, f.reprovadas], [{ Bolt: 'https://x.org/nova-1.png' }, []], 'a folha nova serve')
  igual([f.relato[0].forma_1, f.relato[0].forma, f.relato[0].tentativa, f.relato[0].regerou, f.relato[0].tracos_1, f.relato[0].tracos_nao_julgados], ['outra_especie', 'ok', 2, true, 'ok', null])
  const b = await filmeNaRota(routeBase, JB, { email: CASA, elencoP: [BOLT], respostas: { 'https://x.org/folha-Bolt.png': leituraJson(C1_CAO) } })
  igual([b.corpos.length, b.gerados, b.folhas, b.corpos.some((c) => c.includes('head_check'))], [1, [], { Bolt: 'https://x.org/folha-Bolt.png' }, false], 'a base: o cachorro-robô servia')
  // cachorro duas vezes: o mesmo tratamento da reprovação (a admissão não lê a folha)
  f = await filmeNaRota(route, j, { email: CASA, elencoP: [BOLT], respostas: { 'https://x.org/folha-Bolt.png': leituraJson(C1_CAO), 'https://x.org/nova-1.png': leituraJson({ ...C1_CAO, resembles: 'puppy dog' }) } })
  igual([f.folhas, f.reprovadas, f.relato[0].serve, f.relato[0].forma, f.gerados.length], [{ Bolt: 'https://x.org/folha-Bolt.png' }, ['Bolt'], false, 'outra_especie', 1], 'reprovada 2 vezes: não serve')
  // volta 2 [revisora (a)]: perguntada e sem head_check legível = a forma não é julgada ('sem_resposta') e a folha segue como na main — os 6 formatos tortos, no Bolt e no Elias
  const TORTOS = { 'sem head_check': null, 'head_check null': 'NULL', 'sem fur': { ...ROBO, fur: undefined }, 'resembles vazio': { ...ROBO, resembles: '' }, 'nose maybe': { ...ROBO, nose: 'maybe' }, 'head_check em texto': 'a robot head' }
  const comTorto = (h, traits, medium) => { const o = JSON.parse(leituraJson(null, traits, medium)); if (h === 'NULL') o.head_check = null; else if (h !== null) o.head_check = h; return JSON.stringify(o) }
  for (const [nome, h] of Object.entries(TORTOS)) {
    for (const [fi, look, traits, medium, url] of [[BOLT, 'animated3d', TRACOS_SIM, 'cartoon_3d', 'https://x.org/folha-Bolt.png'], [ELIAS, 'photoreal', [tr('gray-bearded', 'feature'), tr('navy coat', 'clothing')], 'photo_or_realistic_render', 'https://x.org/folha-Elias.png']]) {
      const resp = { [url]: comTorto(h, traits, medium) }
      f = await filmeNaRota(route, j, { email: CASA, look, elencoP: [fi], respostas: resp })
      const bb = await filmeNaRota(routeBase, JB, { email: CASA, look, elencoP: [fi], respostas: resp })
      assert.ok(f.corpos[0].includes('head_check'), nome + ': perguntada')
      igual([f.folhas, f.reprovadas, f.gerados.length, f.relato[0].serve, f.relato[0].tracos, f.relato[0].forma], [bb.folhas, bb.reprovadas, 0, true, 'ok', 'sem_resposta'], `${fi.nome} ${nome}: serve como na main, forma 'sem_resposta'`)
    }
  }
  // sem head_check nas DUAS leituras (a 1ª reprova por traço): a nova serve, a forma fica 'sem_resposta'
  f = await filmeNaRota(route, j, { email: CASA, elencoP: [BOLT], respostas: { 'https://x.org/folha-Bolt.png': leituraJson(null, TRACOS_SIM.map((t) => (t.trait === 'small' ? { ...t, visible: 'no' } : t))), 'https://x.org/nova-1.png': leituraJson(null) } })
  igual([f.folhas, f.relato[0].forma_1, f.relato[0].forma, f.relato[0].tentativa], [{ Bolt: 'https://x.org/nova-1.png' }, 'sem_resposta', 'sem_resposta', 2], 'sem head_check nas duas: a nova serve')
  // fantasia e máscara: a gente não é perguntada (H8 da revisora)
  for (const d of ['a man in a mask', 'a boy in a costume', 'a girl in a superhero costume']) assert.equal(j.especieDaDescricao(d, 'on'), null, 'não pergunta: ' + d)
  // robô certo: serve de primeira, sem folha nova
  f = await filmeNaRota(route, j, { email: CASA, elencoP: [BOLT], respostas: { 'https://x.org/folha-Bolt.png': leituraJson(ROBO) } })
  igual([f.folhas, f.gerados.length, f.relato[0].forma, f.relato[0].custo_usd], [{ Bolt: 'https://x.org/folha-Bolt.png' }, 0, 'ok', critico.custoDoCriticoUsd({ prompt_tokens: 3000, completion_tokens: 120 }, 1, 0)])
  // gente: o homem do Slocum serve (nariz e barba são de gente); orelha de bicho reprova
  f = await filmeNaRota(route, j, { email: CASA, look: 'photoreal', elencoP: [SLOCUM], respostas: { 'https://x.org/folha-Joshua.png': leituraJson(HOMEM, SLOCUM_SIM, 'photo_or_realistic_render') } })
  igual([f.reprovadas, f.relato[0].forma, f.corpos[0].includes('head_check')], [[], 'ok', true], 'Slocum: gente serve')
  f = await filmeNaRota(route, j, { email: CASA, look: 'photoreal', elencoP: [SLOCUM], respostas: { 'https://x.org/folha-Joshua.png': leituraJson({ ...HOMEM, animal_ears: 'yes' }, SLOCUM_SIM, 'photo_or_realistic_render'), 'https://x.org/nova-1.png': leituraJson(HOMEM, SLOCUM_SIM, 'photo_or_realistic_render') } })
  igual([f.folhas, f.relato[0].forma_1, f.gerados[0].endsWith(' Its body and head are entirely those of a person. Rendered in photorealistic, ultra-detailed.')], [{ 'Joshua Slocum': 'https://x.org/nova-1.png' }, 'outra_especie', true])
  // criatura sem descrição: não é perguntada; o Elias ("lighthouse keeper" é gente): perguntado, a cabeça de homem serve
  f = await filmeNaRota(route, j, { email: CASA, elencoP: [EMBER, ELIAS], look: 'photoreal', respostas: { 'https://x.org/folha-Ember.png': leituraJson(null, [], 'photo_or_realistic_render'), 'https://x.org/folha-Elias.png': leituraJson(HOMEM, [tr('gray-bearded', 'feature'), tr('lighthouse keeper', 'species', 'no'), tr('navy coat', 'clothing')], 'photo_or_realistic_render') } })
  igual([f.corpos.map((c) => c.includes('head_check')), f.reprovadas, f.relato.map((r) => r.forma)], [[false, true], [], ['nao_julgada', 'ok']], 'Ember: não pergunta; Elias: gente, serve')
  for (const d of ['a robot dog', 'a toy robot', 'a golden retriever with a red bandana', 'a small green dragon']) assert.equal(j.especieDaDescricao(d, 'on'), null, 'bicho, criatura, híbrido e brinquedo: não pergunta: ' + d)

  // ── 1c. fora da casa e com a chave em 'off' / 'sonda': byte a byte a base ───────────────────────────────────────────────────────────────
  const RESP = { 'https://x.org/folha-Bolt.png': leituraJson(C1_CAO), 'https://x.org/nova-1.png': leituraJson(ROBO), 'https://x.org/folha-Joshua.png': leituraJson(HOMEM, SLOCUM_SIM, 'photo_or_realistic_render') }
  // tudo o que vai à OpenAI e à fal, as folhas, as reprovadas e o relato: iguais; no relato, só o motivo do item 2 (tracos_nao_julgados) pode diferir, e a seção 2 o prova
  const semMotivo = (rs) => rs && rs.map((r) => ({ ...r, tracos_nao_julgados: 0 }))
  const mesmo = (a, z, m) => igual([a.corpos, a.gerados, a.folhas, a.reprovadas, semMotivo(a.relato)], [z.corpos, z.gerados, z.folhas, z.reprovadas, semMotivo(z.relato)], m)
  for (const para of ['off', 'sonda']) {
    const jk = tipCom(chave('internal', para))
    mesmo(await filmeNaRota(route, jk, { email: CASA, elencoP: [BOLT, SLOCUM], respostas: RESP }), await filmeNaRota(routeBase, JB, { email: CASA, elencoP: [BOLT, SLOCUM], respostas: RESP }), `a casa com '${para}': a base`)
  }
  const cliente = await filmeNaRota(route, j, { email: CLIENTE, elencoP: [BOLT], respostas: RESP })
  igual([cliente.corpos.length, cliente.relato, cliente.folhas], [0, null, { Bolt: 'https://x.org/folha-Bolt.png' }], 'cliente: o conferente nem roda')
  // e se o conferente um dia for 'public': o cliente continua sem a forma (byte a byte a base com o conferente público)
  const jPub = tipCom(juizPublico), jbPub = baseCom(juizPublico)
  for (const email of [CLIENTE, null]) mesmo(await filmeNaRota(route, jPub, { email, elencoP: [BOLT, SLOCUM], respostas: RESP }), await filmeNaRota(routeBase, jbPub, { email, elencoP: [BOLT, SLOCUM], respostas: RESP }), 'conferente público, fora da casa: a base')
  // o laço sem o modo (quem não é a rota) = 'off'
  const ler1 = async () => ({ leitura: j.lerLeituraDaFolha(leituraJson(C1_CAO), true), custoUsd: 0.001, erro: null })
  const semModo = await j.julgarAFolha({ ficha: BOLT, url: 'https://x.org/f.png', filmeFotorreal: false, lookPhrase: 'x' }, { ler: ler1, gerar: async () => assert.fail('folha nova') })
  igual([semModo.url, 'forma' in semModo.relato], ['https://x.org/f.png', false], "sem args.forma: 'off'")

  // ── 1d. o custo extra (o pedido com e sem o head_check; a conta vai no commit) ───────────────────────────────────────────────────────────
  const com = j.pedidoAoJuizDaFolha(DB, 'https://x.org/f.png', 'robot'), sem = j.pedidoAoJuizDaFolha(DB, 'https://x.org/f.png')
  const extraEntrada = Math.ceil((com.caracteres - sem.caracteres) / 4)
  assert.ok(extraEntrada > 100 && extraEntrada < 250, 'o head_check custa ~' + extraEntrada + ' tokens de entrada')
  globalThis.__custo = { extraEntrada, entradaUsd: extraEntrada * critico.STILL_CRITIC_USD_POR_TOKEN_ENTRADA, leituraUsd: critico.custoDoCriticoUsd(null, com.imagens, com.caracteres) }

  // ── 2. o relato do conferente cego ───────────────────────────────────────────────────────────────────────────────────────────────────
  const fila = (...q) => { const r = [...q]; return async () => { const k = r.shift(); assert.ok(k !== undefined, 'leitura a mais'); return { leitura: k === null ? null : j.lerLeituraDaFolha(k), custoUsd: 0.001, erro: null } } }
  const relato = async (fi, foto, ...q) => (await j.julgarAFolha({ ficha: fi, url: 'https://x.org/f.png', filmeFotorreal: foto, lookPhrase: 'x' }, { ler: fila(...q), gerar: async () => 'https://x.org/nova.png' })).relato
  const semCampo = TRACOS_SIM.map(({ appearance, ...t }) => t)
  const casos = [
    ['folha certa, traços julgados', BOLT, false, [leituraJson(null)], null, true],
    ['sem "appearance" (formato antigo)', BOLT, false, [leituraJson(null, semCampo)], 'sem_aparencia', true],
    ['"appearance" fora de yes/no', BOLT, false, [leituraJson(null, TRACOS_SIM.map((t) => ({ ...t, appearance: 'YES' })))], 'sem_aparencia', true],
    ['só "no" em aparência', BOLT, false, [leituraJson(null, TRACOS_SIM.map((t) => ({ ...t, appearance: 'no' })))], 'nenhum_julgavel', true],
    ['só papel, mesmo com "yes"', BOLT, false, [leituraJson(null, [tr('robot', 'role', 'no'), tr('small', 'role')])], 'nenhum_julgavel', true],
    ['só traço inventado', BOLT, false, [leituraJson(null, [tr('dog ears', 'feature', 'no'), tr('tall', 'size')])], 'nenhum_julgavel', true],
    ['nenhum traço', BOLT, false, [leituraJson(null, [])], 'nenhum_julgavel', true],
    ['"species" de gente só', ELIAS, true, [leituraJson(null, [tr('lighthouse keeper', 'species', 'no')], 'photo_or_realistic_render')], 'nenhum_julgavel', true],
    ['gente com aparência', ELIAS, true, [leituraJson(null, [tr('gray-bearded', 'feature'), tr('lighthouse keeper', 'species', 'no')], 'photo_or_realistic_render')], null, true],
    ['sem descrição do autor', EMBER, false, [leituraJson(null)], 'sem_descricao', true],
    ['negação', NEGA, false, [leituraJson(null)], 'negacao', true],
    ['sem leitura', BOLT, false, [null], null, false],
    ['negação sem leitura (o de antes)', NEGA, false, [null], 'negacao', false],
    // a 2ª leitura é a que conta
    ['1ª julgada e reprovada, 2ª sem "appearance"', BOLT, false, [leituraJson(null, TRACOS_SIM.map((t) => (t.trait === 'small' ? { ...t, visible: 'no' } : t))), leituraJson(null, semCampo)], 'sem_aparencia', true],
    ['1ª cega e de meio errado, 2ª julgada', ELIAS, true, [leituraJson(null, [{ trait: 'gray-bearded', category: 'feature', visible: 'yes' }], 'cartoon_2d'), leituraJson(null, [tr('gray-bearded', 'feature')], 'photo_or_realistic_render')], null, true],
    ['meio errado 2 vezes, a 2ª cega', ELIAS, true, [leituraJson(null, [tr('gray-bearded', 'feature')], 'cartoon_2d'), leituraJson(null, [{ trait: 'navy coat', category: 'clothing', visible: 'no' }], 'cartoon_2d')], 'sem_aparencia', false],
    ['um traço sem o campo, os outros julgados', BOLT, false, [leituraJson(null, [semCampo[0], ...TRACOS_SIM.slice(1)])], null, true],
    ['Ember tolerado (meio)', EMBER, true, [leituraJson(null), leituraJson(null)], 'sem_descricao', true],
  ]
  for (const [nome, fi, foto, q, esperado, serve] of casos) {
    const r = await relato(fi, foto, ...q)
    igual([r.tracos_nao_julgados, r.serve], [esperado, serve], nome)
    const rb = (await JB.julgarAFolha({ ficha: fi, url: 'https://x.org/f.png', filmeFotorreal: foto, lookPhrase: 'x' }, { ler: (() => { const k = [...q]; return async () => { const x = k.shift(); return { leitura: x === null ? null : JB.lerLeituraDaFolha(x), custoUsd: 0.001, erro: null } } })(), gerar: async () => 'https://x.org/nova.png' })).relato
    igual({ ...r, tracos_nao_julgados: 0 }, { ...rb, tracos_nao_julgados: 0 }, 'só o motivo muda, o veredito é o da base: ' + nome)
  }
  // a folha nova pedida e não saída: o relato lê a 1ª leitura
  const r0 = (await j.julgarAFolha({ ficha: ELIAS, url: 'https://x.org/f.png', filmeFotorreal: true, lookPhrase: 'x' }, { ler: fila(leituraJson(null, [{ trait: 'navy coat', category: 'clothing', visible: 'no' }], 'cartoon_2d')), gerar: async () => null })).relato
  igual([r0.serve, r0.regerou, r0.tracos_nao_julgados], [false, false, 'sem_aparencia'], 'a folha nova não saiu: a 1ª leitura conta')
  assert.equal(j.tracosNaoJulgados(null, ''), null); assert.equal(j.tracosNaoJulgados(null, 'a robot without ears'), 'negacao')

  // ── 3. a negação: as palavras da revisora ────────────────────────────────────────────────────────────────────────────────────────────
  const fraseDe = [...NEGACOES_NOVAS.map(([, fr]) => fr), ...PARES_NOVOS.map(([, fr]) => fr)]
  for (const fr of fraseDe) {
    assert.equal(j.temNegacao(fr), true, 'nega: ' + fr); assert.equal(JB.temNegacao(fr), false, 'a base não pegava: ' + fr)
    const ultimo = fr.split(/[^\p{L}\p{N}]+/u).filter(Boolean).at(-1), l = j.lerLeituraDaFolha(leituraJson(null, [tr(ultimo, 'clothing', 'no')]))
    igual([j.decidirDaFolha(l, false, fr).tracos, JB.decidirDaFolha(JB.lerLeituraDaFolha(leituraJson(null, [tr(ultimo, 'clothing', 'no')])), false, fr).tracos], ['ok', 'traco'], 'o traço negado não reprova (na base, "clearly visible: ' + ultimo + '"): ' + fr)
    assert.equal(j.instrucaoDaFolhaNova(j.decidirDaFolha(l, false, fr), 'x'), '', 'nada vai a "clearly visible": ' + fr)
  }
  for (const fr of NAO_NEGAM) igual([j.temNegacao(fr), JB.temNegacao(fr)], [false, false], 'continua julgada: ' + fr)
  // lado seguro, declarado: "pelo menos o" cega
  assert.equal(j.temNegacao('pelo menos o chapéu vermelho'), true, 'lado seguro: pelo menos o')
}

await suite(null)
const C = globalThis.__custo
const mutants = [
  // 1. a chave e a rota
  [J, "export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'internal'", "export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'sonda'"], // a casa deixa de perguntar
  [J, "modo === 'on' || (modo === 'internal' && contaDaCasaExata(email)) ? 'on' : 'off'", "modo === 'on' || modo === 'internal' ? 'on' : 'off'"], // o cliente pergunta
  [J, " || (modo === 'internal' && contaDaCasaExata(email)) ? 'on'", " ? 'on'"], // a casa não pergunta
  [J, "modo === 'on' || (modo === 'internal'", "(modo === 'internal'"], // 'on' desliga
  [J, "const modoForma: ModoFormaDaFolha2511 = args.forma ?? 'off'", "const modoForma: ModoFormaDaFolha2511 = args.forma ?? 'on'"],
  [J, "const modoForma: ModoFormaDaFolha2511 = args.forma ?? 'off'", "const modoForma: ModoFormaDaFolha2511 = 'off'"], // o laço ignora o modo
  [J, 'v1 = decidirDaFolha(r1.leitura, args.filmeFotorreal, descricao, modoForma, tipo)', 'v1 = decidirDaFolha(r1.leitura, args.filmeFotorreal, descricao, FORMA_DA_FOLHA_2511, tipo)'],
  [J, 'const v2 = decidirDaFolha(r2.leitura, args.filmeFotorreal, descricao, modoForma, tipo)', 'const v2 = decidirDaFolha(r2.leitura, args.filmeFotorreal, descricao, FORMA_DA_FOLHA_2511, tipo)'], // a 2ª não confere a forma
  [J, "...(modoForma === 'on' ? {", '...(false ? {'], // o relato sem a forma
  [J, "(modo === 'off' ? 'off' : 'on')", "(modo === 'sonda' ? 'on' : 'off')"], // a sonda com 'internal' deixa de perguntar
  [J, '  return exigeForma ? { meio, personagens, tracos, forma }', '  if (exigeForma && !forma) return null\n  return exigeForma ? { meio, personagens, tracos, forma }'], // a volta 2 desfeita: a folha cai
  [J, "(l.forma === null ? 'sem_resposta' : 'nao_julgada')", "'nao_julgada'"], // o relato não conta
  [J, " || v.forma === 'sem_resposta'", ''], // sem resposta reprova
  [J, ' || NAO_JULGA_FORMA_RE.test(d)) return null', ') return null'], // H8: fantasia e máscara perguntadas
  [routeFile, 'lerAFolha(descricao, url, { forma: formaDoFilme2511 })', 'lerAFolha(descricao, url)'], // o leitor não recebe o head_check
  [routeFile, 'lookPhrase: styleAnchor.lookPhrase, forma: formaDoFilme2511 }', 'lookPhrase: styleAnchor.lookPhrase }'], // o laço não decide a forma
  [routeFile, 'formaNoFilme(FORMA_DA_FOLHA_2511, user.email)', "formaNoFilme(FORMA_DA_FOLHA_2511, 'josephsskaf@gmail.com')"], // todo e-mail vira a casa
  [routeFile, 'formaNoFilme(FORMA_DA_FOLHA_2511, user.email)', "formaNoFilme('off', user.email)"],
  // 2. o relato cego
  [J, "  if (!limpa(descricao)) return 'sem_descricao'\n", ''],
  [J, "  if (l.tracos.length > 0 && l.tracos.every((t) => t.aparencia === 'unclear')) return 'sem_aparencia'\n", ''],
  [J, 'l.tracos.length > 0 && l.tracos.every(', 'l.tracos.some('], // um traço sem o campo já cega
  [J, "t.categoria !== 'role' && tracoJulgavel(t, tipo) && tracoDoAutor", 'tracoJulgavel(t, tipo) && tracoDoAutor'], // papel conta como julgado
  [J, "t.categoria !== 'role' && tracoJulgavel(t, tipo) && tracoDoAutor", "t.categoria !== 'role' && tracoDoAutor"], // "no" e "species" de gente contam
  [J, ' && tracoDoAutor(t.traco, descricao)) ? null', ') ? null'], // traço inventado conta
  [J, '  if (temNegacao(descricao)) return \'negacao\'\n  if (!l) return null\n', '  if (!l) return null\n  if (temNegacao(descricao)) return \'negacao\'\n'], // negação sem leitura some
  [J, "tracos_nao_julgados: tracosNaoJulgados(l, descricao, tipo)", "tracos_nao_julgados: tracosNaoJulgados(l, descricao)"], // sem o tipo
  [J, 'return fim(args.url, v1, null, 1, false, r1.leitura)', 'return fim(args.url, v1, null, 1, false)'],
  [J, 'return fim(null, v1, null, null, false, r1.leitura)', 'return fim(null, v1, null, null, false)'],
  [J, 'if (folhaPassa(v2)) return fim(nova, v2, null, 2, true, r2.leitura)', 'if (folhaPassa(v2)) return fim(nova, v2, null, 2, true, r1.leitura)'],
  [J, "return fim(nova, v2, 'meio_tolerado', 2, true, r2.leitura)", "return fim(nova, v2, 'meio_tolerado', 2, true)"],
  [J, '  return fim(null, v2, null, null, true, r2.leitura)\n}', '  return fim(null, v2, null, null, true, r1.leitura)\n}'],
  // 3. cada palavra e cada locução nova
  ...NEGACOES_NOVAS.map(([w]) => (w === 'devoid' ? [J, ", 'devoid'])", '])'] : [J, `'${w}', `, ''])),
  [J, "'zero', 'minus'", "'zero', '0', 'minus'"], // o "0" volta (marcação de tempo cega)
  ...PARES_NOVOS.map(([m]) => (Array.isArray(m) ? [J, [m]] : [J, m, ''])),
]
let mortos = 0
for (const mutant of mutants) {
  for (const [de] of Array.isArray(mutant[1]) ? mutant[1] : [[mutant[1]]]) assert.ok(local(mutant[0]).includes(de), 'mutante não aplica: ' + de)
  await assert.rejects(suite(mutant), (err) => err instanceof assert.AssertionError, 'SOBREVIVEU: ' + JSON.stringify(mutant[1]).slice(0, 140))
  mortos++
}
console.log(`PASS KINEO-FORMA-NOS-FILMES-2511: FORMA_DA_FOLHA_2511 = 'internal' — no filme da CASA o head_check vai ao leitor e o cachorro-robô do Bolt reprova e recebe a folha nova de sempre (2 vezes = a admissão não lê); gente serve, bicho e criatura não são perguntados; cliente, null, 'off', 'sonda' e o conferente público fora da casa = a ${BASE} byte a byte em tudo o que vai à OpenAI e à fal, nas folhas e no relato (que só ganha o motivo); o relato diz por que não julgou (sem_descricao, sem_aparencia, nenhum_julgavel, negacao) sem mudar veredito; ${NEGACOES_NOVAS.length + PARES_NOVOS.length} negações novas, cada uma com mutante; head_check = +${C.extraEntrada} tokens de entrada (US$ ${C.entradaUsd.toFixed(6)}) por leitura; ${mortos}/${mutants.length} mutantes mortos.`)
