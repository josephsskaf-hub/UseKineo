// KINEO-ORIGEM-DO-ELENCO-0311 [TRAVA 8.2 — fundador 03/11: "Conserta a etnia agora, universal de todas as etnias"] — guardião.
// + KINEO-LEGENDA-NUMERO-CARREGA-0311 (item 2 da mesma ordem).
// Prova OFFLINE (sem OpenAI, sem fal, sem banco), EXECUTANDO o código REAL transpilado, com a forma real do caso enzojimcua (03/11, vídeo 23a1412e,
// ficha "the weathered soldier" origem 'autor') e as respostas CRUAS da API gravadas pela calibração (docs/calibracao/KINEO-ORIGEM-DO-ELENCO-0311.json):
//   A. CALIBRAÇÃO — 34 casos, todos os continentes: origem certa com evidência do texto; sem âncora nada muda; sem lista de povos no código;
//   B. VALIDAÇÃO — evidência fora do texto, cor no lugar de origem, nome no lugar de origem, baixa confiança, erro/prazo/JSON inválido = nada;
//   C. PALAVRAS DO CLIENTE — aparência dita fica intacta; origem dita e já na ficha fica intacta; origem dita fora da ficha (o caso real) entra;
//   D. FICHA — linha respeitosa, gênero/idade certos, cada personagem a sua, idempotente, nome real nunca no prompt, época sem a lista ocidental;
//   E. CENAS — documentário sem ficha recebe a origem; sem gente/[faceless]/apresentador não; parâmetro ausente = byte a byte; Kling 4 mantém a marca;
//   F. JUÍZES — crítico do still e pixel perguntam só com a marca, reprovam e capam; sem marca, byte a byte;
//   G. ROTA — a leitura entra nas duas estradas, antes da trava, e o evento sai;
//   H. LEGENDA — "EN 1945 PERO UN" não fecha mais no artigo, com os tempos reais do filme;
//   M. MUTANTES — cada regra fica vermelha quando quebrada.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { CASOS_ORIGEM } from './test-support/casos-origem-do-elenco-0311.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const troca = (src, de, para) => { if (!src.includes(de)) throw new Error('mutante: trecho ausente — ' + de.slice(0, 80)); return src.split(de).join(para) }
const globals = { AbortController, setTimeout: () => 0, clearTimeout() {}, Date, Math, JSON, Promise }
const GRAVADO = JSON.parse(fs.readFileSync('docs/calibracao/KINEO-ORIGEM-DO-ELENCO-0311.json', 'utf8'))
const F = { o: 'lib/cinematic/origemDoElenco.ts', e: 'lib/cinematic/elencoEpoca.ts', q: 'lib/cinematic/filmQuality.ts', k: 'lib/cinematic/cenaKling4.ts', t: 'lib/cinematic/elencoTrava.ts', c: 'lib/cinematic/criticoStill.ts', p: 'lib/regua95/pixelScore.ts', h: 'lib/regua95/perguntasHonestas.ts', j: 'lib/cinematic/juizFicha.ts', comp: 'lib/compose.ts' }
const mundo = (mut = {}) => {
  const load = createOfflineLoader({ env: { OPENAI_API_KEY: 'sk-teste' }, globals, mocks: { '@fal-ai/client': { fal: { config() {} } } }, evaluationTimeoutMs: 60000, source: (rel, text) => (mut[rel] ? mut[rel](text) : text) })
  return { O: load(F.o), E: load(F.e), Q: load(F.q), K: load(F.k), T: load(F.t), C: load(F.c), P: load(F.p), H: load(F.h), J: load(F.j), load }
}
const respostaFalsa = (conteudo, status = 200) => async () => ({ ok: status < 400, status, json: async () => ({ choices: [{ message: { content: conteudo } }] }) })
const FICHA_SORTEADA = { nome: 'the person', nucleo: 'person', tipo: 'humano', origem: 'deterministica', protagonista: true, genero: 'man', canonica: 'the person, a man in their early thirties with straight sandy-blond hair, freckles and a small nose, wearing a grey wool coat' }
const STYLE = { look: 'photoreal', lookPhrase: 'photorealistic, ultra-detailed', suffix: ', photorealistic, ultra-detailed.' }
const NADA = { origin: null, evidence: null, evidence_type: 'none', confidence: 'high' }
const pessoa = (o) => ({ role: 'soldier', name: null, is_group: false, is_human: true, origin: null, evidence: null, evidence_type: 'none', confidence: 'high', stated_by_text: 'none', stated_words: null, ...o })
const leituraDe = async (O, texto, json, ideia) => O.pedirOrigemDoElenco(texto, ideia, { fetchImpl: respostaFalsa(JSON.stringify(json)) })

async function provaCalibracao(M) {
  const { O } = M, erros = []
  const regioes = new Set()
  for (const caso of CASOS_ORIGEM) {
    const g = GRAVADO.respostas.find((r) => r.id === caso.id)
    if (!g || !g.crua) { erros.push('sem resposta gravada ' + caso.id); continue }
    regioes.add(caso.regiao)
    const r = await O.pedirOrigemDoElenco(caso.prompt, caso.ideia, { fetchImpl: respostaFalsa(g.crua) })
    if (!r.ok) { erros.push('leitura recusada ' + caso.id + ' ' + r.erro); continue }
    const origens = [r.leitura.geral?.origem, ...r.leitura.personagens.map((p) => p.origem)].filter(Boolean)
    if (caso.origem === null && origens.length > 0 && !caso.opcional) erros.push(`${caso.id}: não devia ter origem, veio ${origens}`)
    if (caso.origem && !caso.opcional && !origens.some((o) => caso.origem.test(o))) erros.push(`${caso.id}: origem errada ${origens}`)
    if (caso.misto && r.leitura.geral) erros.push(`${caso.id}: misto com origem geral`)
    const filme = O.montarOrigemDoFilme(r, caso.prompt, caso.ideia)
    const ficha = caso.ficha ?? FICHA_SORTEADA
    const fora = O.elencoComOrigem([ficha], filme)
    if (caso.tocaFicha === true && fora.trocas.length !== 1) erros.push(`${caso.id}: a ficha devia mudar (${fora.decisoes[0].motivo})`)
    if (caso.tocaFicha === false && (fora.trocas.length !== 0 || fora.elenco[0].canonica !== ficha.canonica)) erros.push(`${caso.id}: a ficha devia ficar intacta (${fora.decisoes[0].origem})`)
    // nome de pessoa real nunca entra na linha
    const linha = /origin:[^;]*/.exec(fora.elenco[0].canonica)?.[0] ?? ''
    for (const p of r.leitura.personagens) if (p.nome && p.tipo === 'known_person') for (const w of p.nome.split(/\s+/)) if (/^\p{Lu}\p{Ll}{2,}/u.test(w) && new RegExp(`\\b${w}\\b`).test(linha)) erros.push(`${caso.id}: nome real na linha: ${w}`)
  }
  for (const r of ['África', 'Sul da Ásia', 'Oriente Médio', 'América Latina', 'Indígena', 'Leste da Ásia', 'Europa', 'América do Norte', 'negativo', 'cliente']) if (!regioes.has(r)) erros.push('região fora da calibração: ' + r)
  if (CASOS_ORIGEM.length < 15) erros.push('menos de 15 casos')
  return erros
}

async function provaValidacao(M) {
  const { O } = M, erros = []
  const T = 'A soldier walked out of the jungle after 29 years. Onoda had never surrendered.'
  const invalidos = [
    ['evidência fora do texto', pessoa({ origin: 'Japanese', evidence: 'samurai', evidence_type: 'place' })],
    ['cor no lugar de origem', pessoa({ origin: 'White', evidence: 'Onoda', evidence_type: 'known_person' })],
    ['corpo no lugar de origem', pessoa({ origin: 'Pale skinned', evidence: 'Onoda', evidence_type: 'known_person' })],
    ['vaga', pessoa({ origin: 'Western', evidence: 'Onoda', evidence_type: 'known_person' })],
    ['nome no lugar de origem', pessoa({ origin: 'Onoda', evidence: 'Onoda', evidence_type: 'known_person' })],
    ['baixa confiança', pessoa({ origin: 'Japanese', evidence: 'Onoda', evidence_type: 'known_person', confidence: 'low' })],
    ['pessoa sem certeza', pessoa({ origin: 'Japanese', evidence: 'Onoda', evidence_type: 'known_person', confidence: 'medium' })],
    ['tipo none', pessoa({ origin: 'Japanese', evidence: 'Onoda', evidence_type: 'none' })],
    ['evidência curta', pessoa({ origin: 'Japanese', evidence: 'a', evidence_type: 'place' })],
    ['cliente disse sem as palavras no texto', pessoa({ origin: 'Japanese', evidence: 'Onoda', evidence_type: 'known_person', stated_by_text: 'origin', stated_words: 'teniente japonés' })],
    ['não humano', pessoa({ is_human: false, origin: 'Japanese', evidence: 'Onoda', evidence_type: 'known_person' })],
  ]
  for (const [nome, p] of invalidos) {
    const r = await leituraDe(O, T, { reasoning: 'x', characters: [p], overall: NADA })
    const filme = O.montarOrigemDoFilme(r, T)
    if (!filme) { erros.push('B leitura caiu: ' + nome); continue }
    const fora = O.elencoComOrigem([FICHA_SORTEADA], filme)
    if (fora.trocas.length > 0 || fora.elenco[0].canonica !== FICHA_SORTEADA.canonica) erros.push('B aplicou: ' + nome)
  }
  // overall inválido: nada
  const rg = await leituraDe(O, T, { reasoning: 'x', characters: [], overall: { origin: 'Japanese', evidence: 'Tokyo', evidence_type: 'place', confidence: 'high' } })
  if (O.montarOrigemDoFilme(rg, T).leitura.geral) erros.push('B geral com evidência fora do texto')
  // falha segura: nada muda, nunca lança, no máximo 2 tentativas, 4xx sem 2ª
  let n = 0
  const conta = (status) => async () => { n++; return { ok: false, status, json: async () => ({}) } }
  for (const [nome, opts, esperado] of [['500', { fetchImpl: conta(500), prazoTotalMs: 1e9 }, 2], ['429', { fetchImpl: conta(429) }, 1]]) { n = 0; const r = await O.pedirOrigemDoElenco(T, null, opts); if (r.ok || r.leitura || n !== esperado) erros.push(`B falha ${nome}: tentativas ${n}`); if (O.montarOrigemDoFilme(r, T) !== null) erros.push('B falha virou filme ' + nome) }
  const quebrada = await O.pedirOrigemDoElenco(T, null, { fetchImpl: async () => { throw new Error('rede') }, prazoTotalMs: 1e9 })
  if (quebrada.ok) erros.push('B rede quebrada não falhou seguro')
  const lixo = await O.pedirOrigemDoElenco(T, null, { fetchImpl: respostaFalsa('{oi'), tentativasExtras: 0 })
  if (lixo.ok) erros.push('B JSON inválido aceito')
  const formato = await O.pedirOrigemDoElenco(T, null, { fetchImpl: respostaFalsa('{"a":1}'), tentativasExtras: 0 })
  if (formato.ok) erros.push('B formato errado aceito')
  // a chamada tem o contrato combinado (temperature 0, json_schema estrito, gpt-4o-mini, o texto sem pistas)
  let corpo = null
  await O.pedirOrigemDoElenco('[Pexels: selva] Onoda se rindió.', 'Ideia', { fetchImpl: async (_u, init) => { corpo = JSON.parse(init.body); return respostaFalsa(JSON.stringify({ reasoning: '', characters: [], overall: NADA }))() } })
  if (!corpo || corpo.temperature !== 0 || corpo.model !== 'gpt-4o-mini' || corpo.response_format?.json_schema?.strict !== true) erros.push('B contrato da chamada')
  if (corpo && corpo.messages.at(-1).content.includes('Pexels')) erros.push('B pista de busca foi ao modelo')
  // nenhuma lista de povos no código: a validação é de forma + evidência
  for (const povo of ['Diné', 'Ashkenazi Jewish', 'Black American', 'Roma', 'Nez Perce', "Ni'ihau", 'Hmong', 'Irish', 'Swedish']) if (O.origemBemFormada(povo) !== povo) erros.push('B forma recusou povo: ' + povo)
  if (O.origemBemFormada('Roma people') !== 'Roma') erros.push('B "people" no fim')
  return erros
}

async function provaCliente(M) {
  const { O, T: Tr } = M, erros = []
  const ONODA = CASOS_ORIGEM.find((c) => c.id === 'onoda_real')
  const crua = GRAVADO.respostas.find((r) => r.id === 'onoda_real').crua
  const r = await O.pedirOrigemDoElenco(ONODA.prompt, ONODA.ideia, { fetchImpl: respostaFalsa(crua) })
  const filme = O.montarOrigemDoFilme(r, ONODA.prompt, ONODA.ideia)
  const fora = O.elencoComOrigem([ONODA.ficha], filme)
  const c = fora.elenco[0].canonica
  if (!c.startsWith(ONODA.ficha.canonica)) erros.push('C palavras do autor mudaram: ' + c)
  if (!/origin: an? Japanese (?:person|man), with the natural features of Japanese people/.test(c)) erros.push('C caso real sem a linha: ' + c)
  if (fora.decisoes[0].motivo !== 'palavra_do_cliente_fora_da_ficha') erros.push('C motivo do caso real: ' + fora.decisoes[0].motivo)
  if (/Onoda|Hiroo/.test(c)) erros.push('C nome real na ficha')
  // aparência dita: intacta, inclusive com lugar forte
  const tok = 'A red-haired girl gets lost in Tokyo.'
  const rr = await leituraDe(O, tok, { reasoning: '', characters: [pessoa({ role: 'girl', origin: 'Japanese', evidence: 'Tokyo', evidence_type: 'place', stated_by_text: 'appearance', stated_words: 'red-haired girl' })], overall: { origin: 'Japanese', evidence: 'Tokyo', evidence_type: 'place', confidence: 'high' } })
  const fTok = O.montarOrigemDoFilme(rr, tok)
  const girl = { nome: 'the girl', nucleo: 'girl', tipo: 'humano', origem: 'autor', protagonista: true, genero: 'woman', canonica: 'the girl, a red-haired girl' }
  if (O.elencoComOrigem([girl], fTok).trocas.length !== 0) erros.push('C aparência do cliente foi tocada')
  if (fTok.leitura.geral) erros.push('C geral sobrevive à aparência dita')
  if (O.origemParaCenas(fTok).frase('A girl walks through a crowded street') !== '') erros.push('C cena recebeu origem apesar da aparência dita')
  // ficha do autor com as palavras do cliente, mesmo que o modelo as perca
  const cli = 'A tall woman with red hair walks in Lagos.'
  const rr2 = await leituraDe(O, cli, { reasoning: '', characters: [pessoa({ role: 'woman', origin: 'Nigerian', evidence: 'Lagos', evidence_type: 'place' })], overall: NADA })
  const w = { nome: 'the woman', nucleo: 'woman', tipo: 'humano', origem: 'autor', protagonista: true, genero: 'woman', canonica: 'the woman, a tall woman with red hair' }
  if (O.elencoComOrigem([w], O.montarOrigemDoFilme(rr2, cli)).trocas.length !== 0) erros.push('C "red hair" do cliente perdeu para a leitura')
  // a aparência sorteada sai; a escrita pelo cliente fica; vale para todo povo
  const s = O.fichaComOrigem(FICHA_SORTEADA, 'Nigerian', 'um texto').canonica
  if (/sandy-blond|freckles/.test(s) || !/straight hair/.test(s) || !/grey wool coat/.test(s)) erros.push('C sorteio não saiu: ' + s)
  const s2 = O.fichaComOrigem({ ...FICHA_SORTEADA, canonica: 'the person, a man with red hair' }, 'Irish', 'a man with red hair').canonica
  if (!/red hair/.test(s2)) erros.push('C cabelo escrito pelo cliente saiu')
  void Tr
  return erros
}

async function provaFicha(M) {
  const { O, T: Tr, J } = M, erros = []
  const f = (o) => ({ ...FICHA_SORTEADA, ...o })
  const linha = (o, or) => O.fichaComOrigem(f(o), or, '').canonica
  if (!/origin: a Japanese man, with the natural features of Japanese people/.test(linha({}, 'Japanese'))) erros.push('D homem')
  if (!/origin: an Irish woman,/.test(linha({ genero: 'woman', canonica: 'the person, a woman in her thirties' }, 'Irish'))) erros.push('D mulher/an')
  if (!/origin: a Malian girl,/.test(linha({ genero: 'woman', canonica: 'the person, a girl about nine years old' }, 'Malian'))) erros.push('D menina não virou mulher')
  if (!/origin: a Quechua boy,/.test(linha({ genero: 'man', canonica: 'the person, a boy about nine years old' }, 'Quechua'))) erros.push('D menino não virou homem')
  if (!/origin: a Roma person,/.test(linha({ genero: null, canonica: 'the person, a violinist' }, 'Roma'))) erros.push('D sem gênero')
  const uma = O.fichaComOrigem(FICHA_SORTEADA, 'Japanese', '')
  if (O.fichaComOrigem(uma, 'Japanese', '') !== uma || (uma.canonica.match(/origin:/g) ?? []).length !== 1) erros.push('D não idempotente')
  for (const x of [{ tipo: 'animal' }, { tipo: 'criatura' }, { origem: 'mitica' }]) if (O.fichaComOrigem(f(x), 'Japanese', '').canonica !== FICHA_SORTEADA.canonica) erros.push('D tocou ' + JSON.stringify(x))
  if (O.fichaComOrigem(FICHA_SORTEADA, null, '') !== FICHA_SORTEADA) erros.push('D sem origem mudou')
  // cada personagem a sua (elenco inteiro, inclusive coadjuvante)
  const T = 'An American soldier arrives in Hiroshima and meets a Japanese nurse.'
  const r = await leituraDe(O, T, { reasoning: '', characters: [pessoa({ role: 'soldier', origin: 'American', evidence: 'American soldier', evidence_type: 'nationality', stated_by_text: 'origin', stated_words: 'American soldier' }), pessoa({ role: 'nurse', origin: 'Japanese', evidence: 'Japanese nurse', evidence_type: 'nationality', stated_by_text: 'origin', stated_words: 'Japanese nurse' })], overall: NADA })
  const filme = O.montarOrigemDoFilme(r, T)
  const fora = O.elencoComOrigem([f({ nome: 'the soldier', nucleo: 'soldier', canonica: 'the soldier, a man in his thirties' }), f({ nome: 'the nurse', nucleo: 'nurse', protagonista: false, genero: 'woman', canonica: 'the nurse, a woman in her twenties' })], filme)
  if (!/American man/.test(fora.elenco[0].canonica) || !/Japanese woman/.test(fora.elenco[1].canonica)) erros.push('D misto: ' + fora.elenco.map((e) => e.canonica))
  // o mesmo papel com duas origens: ninguém adivinha
  const r2 = await leituraDe(O, 'The American soldier fights the Japanese soldier.', { reasoning: '', characters: [pessoa({ origin: 'American', evidence: 'American soldier', evidence_type: 'nationality' }), pessoa({ origin: 'Japanese', evidence: 'Japanese soldier', evidence_type: 'nationality' })], overall: NADA })
  const f2 = O.montarOrigemDoFilme(r2, 'The American soldier fights the Japanese soldier.')
  if (O.elencoComOrigem([f({ nome: 'the soldier', nucleo: 'soldier', canonica: 'the soldier, a man' })], f2).trocas.length !== 0) erros.push('D ambíguo adivinhou')
  if (/in this shot/.test(O.origemParaCenas(f2).frase('A soldier in the rain'))) erros.push('D frase ambígua')
  // o apresentador não é personagem: a origem geral não vale para ele
  const T3 = 'Mansa Musa crossed the Sahara.'
  const r3 = await leituraDe(O, T3, { reasoning: '', characters: [pessoa({ role: 'king', name: 'Mansa Musa', origin: 'Malian', evidence: 'Mansa Musa', evidence_type: 'known_person' })], overall: { origin: 'Malian', evidence: 'Mansa Musa', evidence_type: 'known_person', confidence: 'high' } })
  const fp = O.montarOrigemDoFilme(r3, T3, null, { presenter: true })
  if (O.elencoComOrigem([f({ nome: 'the host', nucleo: 'host', canonica: 'the host, a man' }), f({ nome: 'the guest', nucleo: 'guest', canonica: 'the guest, a man' })], fp).trocas.length !== 0) erros.push('D apresentador recebeu a origem geral')
  // a trava do estilo e a época preservam a origem; a época não veste fedora em quem tem origem
  const filmeOnoda = O.montarOrigemDoFilme(await leituraDe(O, 'In 1945 Onoda fought on.', { reasoning: '', characters: [pessoa({ name: 'Onoda', origin: 'Japanese', evidence: 'Onoda', evidence_type: 'known_person' })], overall: { origin: 'Japanese', evidence: 'Onoda', evidence_type: 'known_person', confidence: 'high' } }), 'In 1945 Onoda fought on.')
  const comOrigem = O.elencoComOrigem([f({ nome: 'the soldier', nucleo: 'soldier', canonica: 'the soldier, a man in a uniform' })], filmeOnoda)
  const travada = Tr.travarEstiloDoElenco(comOrigem.elenco, STYLE, 'In 1945 Onoda fought on.').elenco[0].canonica
  if (!/natural features of Japanese people/.test(travada) || !/filmed in photorealistic/.test(travada)) erros.push('D trava perdeu a origem: ' + travada)
  if (/fedora|trench/i.test(travada) || !/period-accurate 1940s hairstyle and clothing true to their own place and role/.test(travada)) erros.push('D figurino ocidental: ' + travada)
  const semOrigem = Tr.travarEstiloDoElenco([f({ nome: 'the soldier', nucleo: 'soldier', canonica: 'the soldier, a man in a uniform' })], STYLE, 'In 1945 a soldier fought on.').elenco[0].canonica
  if (!/fedoras/.test(semOrigem)) erros.push('D sem origem a época mudou')
  // os pares de troca reescrevem o prompt já escrito (o caminho do filme de 15 s)
  const antes = `A man walks. The same main character appears in this scene, consistent design: ${FICHA_SORTEADA.canonica}.`
  const depois = J.trocarFichaNoPrompt(antes, Tr.trocasDaFicha(O.elencoComOrigem([FICHA_SORTEADA], filmeOnoda).trocas, STYLE))
  if (!/natural features of Japanese people/.test(depois) || /sandy-blond/.test(depois)) erros.push('D troca no prompt: ' + depois)
  // a ficha nova começa pela antiga: a troca não duplica a linha nova, nem refeita, nem na forma sem o nome
  const pares = [[FICHA_SORTEADA.canonica, `${FICHA_SORTEADA.canonica}; origin: a Japanese man, with the natural features of Japanese people`]]
  const sem = FICHA_SORTEADA.canonica.replace(/^[^,]+,\s*/, '')
  const trocadoFicha = J.trocarFichaNoPrompt(`${FICHA_SORTEADA.canonica}.`, pares), trocadoSemNome = J.trocarFichaNoPrompt(`x ${sem}.`, pares)
  if ((trocadoFicha.match(/origin:/g) ?? []).length !== 1 || (trocadoSemNome.match(/origin:/g) ?? []).length !== 1) erros.push('D troca duplicou: ' + trocadoFicha + ' | ' + trocadoSemNome)
  if (J.trocarFichaNoPrompt(trocadoFicha, pares) !== trocadoFicha) erros.push('D troca não idempotente')
  if (/\u0000/.test(trocadoFicha + trocadoSemNome)) erros.push('D marcador vazou')
  // o planejador hollywood sem elenco
  if (!/natural features of Japanese people/.test(O.sheetComOrigem('a man in his sixties', filmeOnoda)) || O.sheetComOrigem(null, filmeOnoda) !== null) erros.push('D sheet')
  // o relato do evento
  const rel = O.relatoDaOrigem({ generationId: 'g', engine: 'seedance', resposta: await leituraDe(O, 'In 1945 Onoda fought on.', { reasoning: '', characters: [], overall: NADA }), filme: null, decisoes: [] })
  if (rel.applied !== false || rel.origin !== null || rel.generation_id !== 'g' || rel.engine !== 'seedance') erros.push('D relato sem origem: ' + JSON.stringify(rel))
  const rel2 = O.relatoDaOrigem({ generationId: 'g', engine: 'seedance', resposta: { ok: false, leitura: null, erro: 'prazo', ms: 4000, tentativas: 2, model: 'm' }, filme: null, decisoes: [] })
  if (rel2.motive !== 'prazo' || rel2.applied) erros.push('D relato do prazo')
  return erros
}

async function provaCenas(M) {
  const { O, E, Q, K } = M, erros = []
  const T = 'In 1945 Onoda fought on in the jungle.'
  const filme = O.montarOrigemDoFilme(await leituraDe(O, T, { reasoning: '', characters: [pessoa({ name: 'Onoda', origin: 'Japanese', evidence: 'Onoda', evidence_type: 'known_person' })], overall: { origin: 'Japanese', evidence: 'Onoda', evidence_type: 'known_person', confidence: 'high' } }), T)
  const inj = O.origemParaCenas(filme)
  const prompts = ['An old man in a uniform stands in the jungle.', 'A dense empty jungle at dawn, mist between the trees. No people, no human figures and no faces anywhere in this shot.', 'A rusted rifle on a rock.']
  const base = { prompts, falas: ['a', 'b', 'c'], contextoOriginal: T, contextoFiltro: T, modo: 'documentary_faceless', tagFaceless: false }
  const com = E.aplicarElencoEEpoca({ ...base, origemDoElenco: inj })
  if (!/^.*natural features of Japanese people/.test(com.prompts[0])) erros.push('E cena com gente sem origem: ' + com.prompts[0])
  if (/natural features/.test(com.prompts[1]) || /natural features/.test(com.prompts[2])) erros.push('E cena sem gente recebeu origem')
  if (/fedoras/.test(com.prompts[0]) || !/true to their own place and role/.test(com.prompts[0])) erros.push('E cena com origem vestiu a lista ocidental: ' + com.prompts[0])
  if (!/fedoras/.test(com.prompts[1])) erros.push('E cena sem origem perdeu a régua de época')
  // ausente = byte a byte
  const sem = E.aplicarElencoEEpoca(base)
  if (JSON.stringify(sem) !== JSON.stringify(E.aplicarElencoEEpoca({ ...base, origemDoElenco: null }))) erros.push('E null ≠ ausente')
  if (sem.prompts.some((p) => /natural features/.test(p))) erros.push('E ausente pôs origem')
  for (const [nome, extra] of [['faceless', { tagFaceless: true }], ['presenter', { modo: 'presenter' }]]) if (E.aplicarElencoEEpoca({ ...base, ...extra, origemDoElenco: inj }).prompts.some((p) => /natural features/.test(p))) erros.push('E ' + nome + ' recebeu origem')
  // grupo sem ficha, com a origem só dele
  const T2 = 'An American pilot lands. The villagers of Oaxaca hide him.'
  const f2 = O.montarOrigemDoFilme(await leituraDe(O, T2, { reasoning: '', characters: [pessoa({ role: 'pilot', origin: 'American', evidence: 'American pilot', evidence_type: 'nationality' }), pessoa({ role: 'villagers', is_group: true, origin: 'Mexican', evidence: 'Oaxaca', evidence_type: 'place' })], overall: NADA }), T2)
  const fr = O.origemParaCenas(f2).frase('Villagers carry a stretcher through the rain.')
  if (!/^The villagers in this shot are Mexican, with the natural features of Mexican people\. $/.test(fr)) erros.push('E grupo: ' + fr)
  if (O.origemParaCenas(f2).frase('A stone bridge in the rain.') !== '') erros.push('E frase em cena sem o papel')
  // a descrição do personagem nomeado lido do texto (sem o povo da tabela quando discorda)
  const nov = inj.descricao({ nome: 'Onoda', genero: 'man', tipo: 'humano', descricao: 'Onoda, a Chinese man in his thirties with short straight black hair, freckles and a small nose' }, 'Chinese')
  if (!nov || /Chinese/.test(nov) || !/origin: a Japanese man/.test(nov) || !/; /.test(nov) === false && /;/.test(nov)) erros.push('E descrição: ' + nov)
  // estradas: prepararQualidadeDoFilme repassa; Kling 4 mantém a marca dentro do orçamento
  const qual = Q.prepararQualidadeDoFilme({ ...base, style: STYLE, elenco: [], origemDoElenco: inj, aplicarContrato: false })
  if (!/natural features of Japanese people/.test(qual.prompts[0])) erros.push('E prepararQualidade não repassou')
  for (const [nome, p] of [['frase', qual.prompts[0]], ['ficha', Q.prepararQualidadeDoFilme({ ...base, modo: 'character_story', style: STYLE, aplicarContrato: false, elenco: [{ ...O.fichaComOrigem({ ...FICHA_SORTEADA, nome: 'the man', nucleo: 'man', canonica: `the man, ${'a very long description with a grey coat and boots '.repeat(5)}` }, 'Japanese', ''), protagonista: true }] }).prompts[0]]]) {
    const k = K.promptDaCenaKling4(p, STYLE, 0)
    if (!/natural features of Japanese people/.test(k)) erros.push('E Kling 4 perdeu a marca (' + nome + '): ' + k)
    if (Array.from(k).length > K.KLING4_ORCAMENTO_DA_CAMADA) erros.push('E Kling 4 estourou: ' + Array.from(k).length)
  }
  // duas origens no Kling 4: sem a marca (o juiz não pergunta), com as duas ditas
  const dois = Q.promptCurtoDoFilmeKling4('Film visual medium: x. Two people. a, with the natural features of Japanese people; b, with the natural features of American people.', STYLE)
  if (!/People: Japanese, American\./.test(dois)) erros.push('E Kling 4 duas origens: ' + dois)
  // sem marca: o Kling 4 é byte a byte o de antes
  const semOrigemK = createOfflineLoader({ globals, source: (rel, text) => (rel === F.q ? troca(text, '${origemCurta}`', '`') : text) })(F.q)
  const pl = 'Film visual medium: x. A soldier walks. Period setting: 1945 (1940s). Mouth closed.'
  if (Q.promptCurtoDoFilmeKling4(pl, STYLE) !== semOrigemK.promptCurtoDoFilmeKling4(pl, STYLE)) erros.push('E Kling 4 mudou sem marca')
  return erros
}

function provaJuizes(M) {
  const { C, P, H } = M, erros = []
  const COM = 'Film visual medium: photorealistic, ultra-detailed. The main person, if one is shown in this shot, is Japanese, with the natural features of Japanese people. An old man in a uniform.'
  const SEM = 'Film visual medium: photorealistic, ultra-detailed. An old man in a uniform.'
  const e = (prompt) => ({ indice: 0, url: 'https://f/s.jpg', mostra: 'x', fala: 'y', prompt, seed: 1 })
  const c = C.contextoDoCritico0311(COM)
  if (c.origem !== 'Japanese') erros.push('F contexto: ' + JSON.stringify(c))
  if ('origem' in C.contextoDoCritico0311(SEM)) erros.push('F sem marca criou o campo')
  if ('origem' in C.contextoDoCritico0311(`${COM} b, with the natural features of American people.`)) erros.push('F duas origens perguntadas')
  const texto = JSON.stringify(C.montarPedidoAoCritico(e(COM), 'u').messages)
  if (!/\(9\) ORIGIN/.test(texto) || !/"origin"|\\"origin\\"/.test(texto)) erros.push('F crítico não pergunta')
  if (/ORIGIN/.test(JSON.stringify(C.montarPedidoAoCritico(e(SEM), 'u').messages))) erros.push('F crítico perguntou sem a marca')
  const raw = JSON.stringify({ verdict: 'FAIL', issues: ['origin'], reason: 'looks European', score: 40 })
  const base = C.lerRespostaDoCritico(raw)
  const r = C.aplicarPerguntas0311(base, raw, c)
  if (r.veredito !== 'FAIL' || !r.problemas.includes('origem')) erros.push('F FAIL origem: ' + JSON.stringify(r))
  const r2 = C.aplicarPerguntas0311(base, raw, C.contextoDoCritico0311(SEM))
  if (r2.problemas.includes('origem') || r2.veredito !== 'PASS') erros.push('F origin sem marca contou')
  const inst = C.instrucaoDoCritico(['origem'])
  if (!/origin and natural features/.test(inst) || /\bno\b|\bnot\b/i.test(inst)) erros.push('F instrução: ' + inst)
  // pixel
  const frames = Array.from({ length: 8 }, (_, i) => ({ url: `https://f/q${i + 1}.jpg`, t: i * 2, bytes: 80000 }))
  const ctx = { product: 'filme', asked: 'x', narration: 'y', promptByScene: [COM, COM, COM], perguntasHonestas: true }
  const sis = P.buildPixelMessages(ctx, frames, 'low')[0].content
  if (!/\(vi\) ORIGIN — the story's person is Japanese/.test(sis) || !/wrong_origin/.test(sis)) erros.push('F pixel não pergunta')
  const sisSem = P.buildPixelMessages({ ...ctx, promptByScene: [SEM, SEM, SEM] }, frames, 'low')[0].content
  if (/ORIGIN|wrong_origin/.test(sisSem)) erros.push('F pixel perguntou sem a marca')
  if (/ORIGIN/.test(P.buildPixelMessages({ ...ctx, promptByScene: [COM, `${SEM} b, with the natural features of American people.`] }, frames, 'low')[0].content)) erros.push('F pixel: duas origens perguntadas')
  if (H.contextoDasPerguntas0311({ promptByScene: [COM] }).origem !== 'Japanese' || 'origem' in H.contextoDasPerguntas0311({ promptByScene: [SEM] })) erros.push('F leitura irmã')
  const quadros = (fn) => ({ frames: frames.map((f, i) => ({ i: i + 1, subject: 'older man', score: 100, issues: fn(i), note: fn(i).length ? 'outra origem' : '' })), identity_changes: [], identity_consistent: true, caption_present: true, caption_legible: true, caption_language_ok: true, product_faithful: null, summary: 's' })
  const norm = (parsed, honest) => P.normalizePixel(parsed, { product: 'filme', frames, via: 'nth_frame', model: 'm', usdFrames: 0, usdVision: 0, ms: 1, ...(honest ? { perguntasHonestas: true } : {}) })
  const dois = norm(quadros((i) => (i < 3 ? ['wrong_origin'] : [])), true)
  if (dois.score > 75 || !dois.caps.some((x) => /outra origem/.test(x)) || dois.evidence_status !== 'complete') erros.push('F teto: ' + JSON.stringify([dois.score, dois.caps, dois.evidence_status, dois.evidence_reasons]))
  if (norm(quadros((i) => (i === 2 ? ['wrong_origin'] : [])), true).caps.some((x) => /outra origem/.test(x))) erros.push('F 1 quadro capou')
  return erros
}

function provaLegenda(load) {
  const erros = []
  const C = load(F.comp)
  const w = (word, start, end, sentenceEnd) => ({ word, start, end, ...(sentenceEnd ? { sentenceEnd: true } : {}) })
  // os tempos do filme entregue (render c3c073dc): "un" fecha por pausa medida
  const real = [w('La', 0, 0.24), w('Segunda', 0.24, 0.66), w('Guerra', 0.66, 0.92), w('Mundial', 0.92, 1.38), w('terminó', 1.38, 1.86), w('en', 1.86, 2.14), w('1945', 2.14, 4.5), w('pero', 4.6, 4.7), w('un', 4.7, 4.7), w('soldado', 4.98, 5.38), w('no', 5.38, 5.64), w('se', 5.64, 5.88), w('enteró.', 5.88, 6.5, true)]
  const a = C.buildCaptionsFromWhisperWords(real, 20, 0, 5).map((c) => c.text)
  if (a.includes('en 1945 pero un') || !a.includes('en 1945 pero un soldado')) erros.push('H pausa no artigo: ' + a.join(' / '))
  // o mesmo com o fim de segmento carimbado por tempo no artigo
  const carimbo = real.map((x) => (x.word === 'un' ? { ...x, sentenceEnd: true, end: 4.97 } : x))
  const b = C.buildCaptionsFromWhisperWords(carimbo, 20, 0, 5).map((c) => c.text)
  if (b.some((t) => /\bun$/.test(t))) erros.push('H carimbo no artigo: ' + b.join(' / '))
  // frase de verdade continua fechando: pontuação própria, ou a próxima em maiúscula
  const fim = [w('what', 0, 0.2), w('is', 0.2, 0.4), w('it', 0.4, 0.6), w('for', 0.6, 0.8, true), w('Nobody', 1.2, 1.6), w('knew.', 1.6, 2, true)]
  const c = C.buildCaptionsFromWhisperWords(fim, 3, 0, 5).map((x) => x.text)
  if (c.length !== 2 || c[0] !== 'what is it for') erros.push('H fim de frase em palavra-função: ' + c.join(' / '))
  const pont = [w('He', 0, 0.2), w('came,', 0.2, 0.4), w('and', 0.4, 0.6), w('left', 0.6, 0.8, true)]
  if (C.buildCaptionsFromWhisperWords(pont, 2, 0, 5).map((x) => x.text).join('|') !== 'He came,|and left') erros.push('H vírgula parou de fechar')
  // sem pausa nem carimbo: byte a byte
  const liso = [w('the', 0, 0.2), w('old', 0.2, 0.4), w('man', 0.4, 0.6), w('walks', 0.6, 0.8), w('to', 0.8, 1), w('the', 1, 1.2), w('sea', 1.2, 1.4, true)]
  if (C.buildCaptionsFromWhisperWords(liso, 2, 0, 4).map((x) => x.text).join('|') !== 'the old man walks|to the sea') erros.push('H corte comum mudou')
  return erros
}

function provaRota() {
  const erros = []
  const r = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
  const pos = (t) => r.indexOf(t)
  for (const t of ['pedirOrigemDoElenco(prompt, body.original_idea)', 'origemLigadaNoFilme({ herdada: !!qualidadeHerdada', 'estrela: estrelaAtiva || !!estrelaFicha', 'tagFaceless: tagFacelessPresente, desenhoInfantil: desenhoInfantil.ativo', 'name: EVENTO_ORIGEM_DO_ELENCO', 'origemDoElenco: origemNasCenas, // KINEO-ORIGEM-DO-ELENCO-0311', 'origemDoElenco: origemNasCenas /* KINEO-ORIGEM-DO-ELENCO-0311', 'sheetComOrigem(plan.characterSheet, origemDoFilme)', "presenter: classicVisualMode === 'presenter'"]) if (pos(t) < 0) erros.push('G rota sem: ' + t)
  if (!(pos('const origemNoPedido = ') > 0 && pos('const origemNoPedido = ') < pos('const travaEstiloDoPedido = '))) erros.push('G origem depois da trava do pedido')
  if (!(pos('const origemNaCena = ') > 0 && pos('const origemNaCena = ') < pos('const travaEstiloDaCena = '))) erros.push('G origem depois da trava da cena')
  if ((r.match(/pedirOrigemDoElenco\(/g) ?? []).length !== 1) erros.push('G mais de uma chamada por filme')
  if (!/classicVisualPolicy\.character = fichaDoProtagonista\(personagemElenco\.elenco\); const secundariosComOrigem/.test(r)) erros.push('G a estrada clássica não relê a ficha com origem')
  if (!/paresDaOrigem = trocasDaFicha\(origemNaCena\.trocas, styleAnchor\)/.test(r)) erros.push('G o filme de 15 s não troca a ficha nos prompts')
  return erros
}

const roda = async (mut = {}) => {
  const M = mundo(mut)
  return [...await provaCalibracao(M), ...await provaValidacao(M), ...await provaCliente(M), ...await provaFicha(M), ...await provaCenas(M), ...provaJuizes(M), ...provaLegenda(M.load)]
}

const M0 = mundo()
for (const [nome, prova] of [['A calibração (respostas reais gravadas)', () => provaCalibracao(M0)], ['B validação em código + falha segura', () => provaValidacao(M0)], ['C palavras do cliente', () => provaCliente(M0)], ['D ficha, elenco inteiro, época', () => provaFicha(M0)], ['E cenas sem ficha + Kling 4', () => provaCenas(M0)], ['F juízes', async () => provaJuizes(M0)], ['H legenda', async () => provaLegenda(M0.load)], ['G rota', async () => provaRota()]]) {
  const erros = await prova()
  checa(nome, erros.length === 0)
  for (const e of erros) console.log('     - ' + e)
}

const MUTANTES = [
  ['evidência não confere o texto', { [F.o]: (t) => troca(t, "letras.length >= (latina ? 3 : 2) && citaNoTexto(texto, evidencia)", 'true') }],
  ['aceita qualquer forma de origem', { [F.o]: (t) => troca(t, '!FORMA_DA_ORIGEM_RE.test(o) || ORIGEM_VAGA_RE.test(o) || DESCRICAO_DE_CORPO_RE.test(o)', 'false') }],
  ['nome vira origem', { [F.o]: (t) => troca(t, "if (normaliza(origem).split(' ').some((w) => nomes.includes(w))) return { origem: null, evidencia: null, motivo: 'origem_igual_ao_nome' }", '') }],
  ['aparência do cliente perde', { [F.o]: (t) => troca(t, "if (c.dito === 'appearance') return nada('cliente_disse')", '') }],
  ['origem dita fora da ficha não entra (o caso real)', { [F.o]: (t) => troca(t, "return c.origem ? { origem: c.origem, evidencia: c.evidencia, motivo: 'palavra_do_cliente_fora_da_ficha' } : nada('cliente_disse')", "return nada('cliente_disse')") }],
  ['palavras do autor ignoradas', { [F.o]: (t) => troca(t, "if (fichaTemPalavraDoCliente(f, filme.texto)) return nada('cliente_disse')", '') }],
  ['sorteio de aparência fica', { [F.o]: (t) => troca(t, 'const [desc, ...resto] = semAparenciaInventada(f.canonica, textoDoCliente)', 'const [desc, ...resto] = String(f.canonica)') }],
  ['criança vira homem', { [F.o]: (t) => troca(t, "/\\bgirl\\b/i.test(desc) ? 'girl' : /\\bboy\\b/i.test(desc) ? 'boy' : /\\b(?:child|kid|toddler|baby)\\b/i.test(desc) ? 'child'\n    : f.genero", 'f.genero') }],
  ['geral vale para apresentador', { [F.o]: (t) => troca(t, 'if (geral && filme.usarGeral) return citaNoTexto', 'if (geral) return citaNoTexto') }],
  ['ambíguo adivinha', { [F.o]: (t) => troca(t, "if (new Set(candidatos.map((c) => normaliza(c.origem))).size > 1) return nada('ambiguo')", '') }],
  ['falha vira filme', { [F.o]: (t) => troca(t, 'if (!resposta || !resposta.ok || !resposta.leitura) return null', 'if (!resposta) return null') }],
  ['cena sem gente recebe origem', { [F.e]: (t) => troca(t, "if (prompts[i].includes('No people, no human figures and no faces anywhere in this shot') || !(GENTE_NO_PROMPT_RE.test(semNegacao) || MULTIDAO_NO_PROMPT_RE.test(semNegacao) || PESSOA_RE.test(semNegacao))) continue", '') }],
  ['[faceless] recebe origem', { [F.e]: (t) => troca(t, "args.origemDoElenco && !args.tagFaceless && args.modo !== 'presenter' ? args.origemDoElenco : null", 'args.origemDoElenco') }],
  ['cena veste a lista ocidental', { [F.e]: (t) => troca(t, 'if (args.origemDoElenco && r.aplicada === \'longa\' && r.prompt.includes(\'natural features of \'))', 'if (false)') }],
  ['ficha veste a lista ocidental', { [F.t]: (t) => troca(t, "if (c.includes('natural features of ')) return", 'if (false) return') }],
  ['Kling 4 perde a marca', { [F.q]: (t) => troca(t, '${origemCurta}`', '`') }],
  ['crítico não lê a resposta', { [F.c]: (t) => troca(t, ", ...(c.origem ? ['origin'] : [])", '') }],
  ['crítico pergunta sem marca', { [F.c]: (t) => troca(t, 'if (c.origem) partes.push', 'partes.push') }],
  ['pixel sem teto', { [F.p]: (t) => troca(t, "if (ctx.perguntasHonestas === true && count('wrong_origin') >= 2)", 'if (false)') }],
  ['pixel capa com 1 quadro', { [F.p]: (t) => troca(t, "count('wrong_origin') >= 2", "count('wrong_origin') >= 1") }],
  ['pixel pergunta com duas origens', { [F.h]: (t) => troca(t, 'origens.length === 1 ? { origem: origens[0] } : {}', 'origens.length ? { origem: origens[0] } : {}') }],
  ['troca da ficha duplica', { [F.j]: (t) => troca(troca(t, ".split(depois).join(PROTEGE).split(antes).join(PROTEGE)", ".split(antes).join(depois)"), ".split(semNomeDepois).join(PROTEGE_SEM_NOME).split(semNomeAntes).join(PROTEGE_SEM_NOME)", ".split(semNomeAntes).join(semNomeDepois)") }],
  ['legenda: artigo fecha de novo', { [F.comp]: (t) => troca(t, "if ((w.sentenceEnd === true || nx.start - w.end >= 0.28) && q && terminaEmPalavraFuncao(p)", 'if (false && q && terminaEmPalavraFuncao(p)') }],
  ['legenda: frase de verdade emenda', { [F.comp]: (t) => troca(t, " && !/^[^\\p{L}\\p{N}]*\\p{Lu}/u.test(q)", '') }],
]
for (const [nome, mut] of MUTANTES) {
  let vermelho
  try { vermelho = (await roda(mut)).length > 0 } catch (e) { console.log('     (erro) ' + e.message); vermelho = e.message.startsWith('mutante') ? false : true }
  checa('M ' + nome + ' fica vermelho', vermelho)
}

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { for (const f of falhas) console.log(' - ' + f); process.exit(1) }
