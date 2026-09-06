#!/usr/bin/env node
/**
 * KINEO-MEMORIA-SERIE — 04/09/2026 — O CARTÃO "YOUR NEXT EPISODE IS WRITTEN"
 * PASSA A TER MEMÓRIA, E A GENTE PASSA A SABER SE ELE EXISTE
 *
 * O QUE ESTE TESTE PROTEGE, E POR QUE:
 *
 * A régua da casa (30 dias, externos, medido em 04/09): quem fez 1 filme paga
 * 0,3%; 2-3 filmes 1,8%; 4-7 filmes 15,4%. O cartão do episódio 2 é a peça
 * feita para mover a pessoa do filme 1 ao 2 — e `next_episode_clicked` = 1
 * evento em 30 dias, 1 pessoa, com 413 pessoas na tela de filme pronto, sem
 * NENHUM evento de exposição ou falha. Três defeitos, todos lidos no código:
 *   1. `videos.script` vazio em 774/774 filmes — a memória da série não existia;
 *      o conteúdo real que existe é `videos.topic` (média 399 chars).
 *   2. `alreadyDone` nasceu morto: nenhum caller no repo jamais preencheu.
 *   3. O caller mandava a ORDEM (`topic`) e jogava fora a NARRAÇÃO
 *      (`voiceover_script`, no mesmo objeto); com `lastFastRenderRef` vazio o
 *      cartão nem aparecia.
 *
 * O que este arquivo tranca (rota EXECUTADA de verdade com Supabase e OpenAI
 * falsos, mais leitura estrutural dos dois arquivos reais):
 *   1. a leitura do filme de origem é OWNER-SCOPED (`.eq('user_id'` na mesma
 *      cadeia) — estrutural E comportamental (o Supabase falso grava os filtros
 *      e um vídeo de OUTRA pessoa não vira memória);
 *   2. a rota não usa service key em lugar nenhum;
 *   3. `previousTopic` vazio + `fromVideoId` válido NÃO dá 400;
 *   4. `alreadyDone` é montado no servidor, exclui o de origem, passa por
 *      `normalizeSeriesSeed`, dedup case-insensitive, teto 6 (e 8 no total);
 *   5. `normalizeSeriesSeed` REAL limpa a ordem antiga — "ALREADY COVERED"
 *      nunca carrega "Create the next episode in the same Short series about";
 *   6-9. o caller manda `voiceover_script` (fallback `topic`), manda
 *      `fromVideoId`, não morre sem `lastFastRenderRef`, emite os 3 eventos e
 *      preserva a regra do `prompt` cru;
 *  10. trava de qualidade do fundador: nenhum caminho proibido no diff;
 *  11. o contrato antigo (MARCADORES, cooldown 45s, gpt-4o-mini, 4000,
 *      temMarcadores, TITLE:) continua inteiro — estrutural e executado.
 *
 * Rodar: node scripts/test-serie-memoria-2026-09-04.mjs   (sem rede, sem custo)
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (path) => readFileSync(join(root, path), 'utf8')

// ═══ sprint-retencao #9 (04/09) — O GUARDIÃO ESTAVA VERMELHO POR MOTIVO
// NENHUM, E GUARDIÃO QUE GRITA SEMPRE NÃO GUARDA NADA ══════════════════════
//
// Este arquivo mediu o diff contra um SHA CONGELADO (`463fc378`) e exigiu que
// só três arquivos aparecessem nele. Numa fila COMPARTILHADA (Codex + duas
// sessões de Claude no mesmo `entrega-atual`) isso é impossível de satisfazer:
// às 22:20 BRT o teste listava 25 arquivos "fora", quase todos do Codex, e
// estava 136/138 desde as 18:20 — ou seja, a trava de qualidade do fundador
// ("os vídeos têm saído nota 9, NÃO QUERO QUE MEXA NISSO") passou quatro horas
// sem ninguém conseguindo lê-la, porque o vermelho era rotina. Era o pedido
// aberto #95(b)/#97 nos PEDIDOS-ENTRE-PISTAS.
//
// Duas mudanças, ambas registradas como REVERSÍVEIS:
//   · a base deixa de ser um SHA à mão e passa a ser o merge-base com
//     origin/main — o que ESTA fila acrescenta, seja qual for a ponta;
//   · `app/api/compose/**` sai da lista cega e vira regra de CONTEÚDO. A frase
//     do fundador nomeia o que decide COMO O FILME FICA (régua de segundos,
//     escolha de motor, prompt de cena, custo) e autoriza explicitamente
//     "continuidade de série". Gravar a narração do episódio no banco, depois
//     do filme pronto, não muda um pixel de filme nenhum — bloquear isso era
//     mais duro que a ordem; liberar o arquivo inteiro seria mais frouxo. A
//     regra abaixo bloqueia os SÍMBOLOS do motor dentro desses arquivos e
//     libera o resto. Se o fundador disser "a pasta inteira é proibida", basta
//     devolver /^app\/api\/compose\// à lista.
const BASE_COMMIT = (() => {
  try {
    return execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { cwd: root, encoding: 'utf8' }).trim()
  } catch { return '463fc378' }
})()
// Dentro de app/api/compose/**, só estes símbolos são intocáveis — são eles
// que decidem como o filme fica.
const SIMBOLOS_DO_MOTOR = /(secondsOf|secondsFor|clipCountForDuration|creditCostFor|wordsPerSecond|WORDS_PER_SECOND|scenePrompt|negative_prompt|fal-ai\/|MIN_COVERAGE)/
const CAMINHOS_PROIBIDOS = [
  /^lib\/compose\.ts$/,
  /^lib\/hollywood\//,
  /^lib\/cinematic\//,
  /^lib\/broll\//,
  /^lib\/lyriaMusic/,
  /^lib\/narrationFit/,
  /analyze-idea/,
  /generate-script/,
  /generate-video-/,
]

let checks = 0
const fails = []
function ok(value, label) {
  checks += 1
  if (value) return
  fails.push(label)
  console.error(`  x ${label}`)
}
function equal(actual, expected, label) {
  ok(Object.is(actual, expected) || JSON.stringify(actual) === JSON.stringify(expected),
    label + ' — esperado ' + JSON.stringify(expected) + ', veio ' + JSON.stringify(actual))
}
const secao = (t) => console.log(`\n── ${t}`)
const j = (v) => JSON.stringify(v)

function loadTs(path, mocks = {}) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(path + ': import inesperado ' + id)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

console.log('\nKINEO serie / memoria — o episodio N sabe o que os episodios 1..N-1 falaram\n')

const ROTA = 'app/api/next-episode/route.ts'
const CLIENTE = 'app/(dashboard)/generate/GenerateClient.tsx'
const rota = read(ROTA)
const cliente = read(CLIENTE)

// O bloco do efeito no caller: do ref de dedup até o marcador do bloco seguinte.
const iniBloco = cliente.indexOf('const nextEpisodeAskedForRef = useRef')
const fimBloco = cliente.indexOf('KINEO-CREDITO-POR-POSTAR-2026-08-21', iniBloco)
ok(iniBloco > 0 && fimBloco > iniBloco, 'achei o bloco do efeito de proximo episodio no GenerateClient')
const bloco = cliente.slice(iniBloco, fimBloco)

// ═══ 1. OWNER-SCOPED (estrutural) ═══════════════════════════════════════════
secao('1. a leitura do filme de origem e restrita ao dono')
{
  const idxEqId = rota.indexOf(".eq('id', origemId)")
  ok(idxEqId > 0, "a rota le o filme de origem por `.eq('id', origemId)`")
  // A mesma cadeia = do `await supabase` anterior ate o terminador da query.
  const iniCadeia = rota.lastIndexOf('await supabase', idxEqId)
  const fimCadeia = rota.indexOf('.maybeSingle()', idxEqId)
  const cadeia = iniCadeia > 0 && fimCadeia > idxEqId ? rota.slice(iniCadeia, fimCadeia) : ''
  ok(cadeia.includes(".from('videos')"), 'a cadeia de origem le a tabela videos')
  ok(/\.eq\('user_id',\s*userId\)/.test(cadeia), "OWNER-SCOPED: `.eq('user_id', userId)` esta NA MESMA CADEIA da leitura do filme de origem (risco de seguranca da rodada)")
  ok(/fromVideoId\?:\s*string/.test(rota), 'o corpo aceita `fromVideoId?: string`')
  ok(/body\.fromVideoId/.test(rota), 'a rota le `body.fromVideoId`')
  ok(/UUID_RE\.test\(fromVideoId\)/.test(rota), 'uuid invalido nao vai ao banco (UUID_RE)')
  // A lista de "ja feitos" tambem e do dono.
  const idxStatus = rota.indexOf(".eq('status', 'completed')")
  const iniLista = rota.lastIndexOf('await supabase', idxStatus)
  const listaCadeia = idxStatus > 0 ? rota.slice(iniLista, idxStatus + 40) : ''
  ok(/\.eq\('user_id',\s*userId\)/.test(listaCadeia), "a lista de filmes concluidos tambem e `.eq('user_id', userId)`")
}

// ═══ 2. SEM SERVICE KEY ═════════════════════════════════════════════════════
secao('2. a rota nao usa service key')
ok(!/SUPABASE_SERVICE_ROLE_KEY|service_role|createAdminClient|createServiceClient|serviceKey|supabaseAdmin/i.test(rota), 'nenhuma referencia a service key/admin client na rota')
ok(/createClient\(\)/.test(rota) && /from '@\/lib\/supabase\/server'/.test(rota), 'a rota usa o createClient() autenticado de @/lib/supabase/server')
ok((rota.match(/createClient\(\)/g) ?? []).length === 1, 'um unico client — o mesmo que faz getUser()')

// ═══ 3. 400 SO DEPOIS DO FALLBACK (estrutural) ══════════════════════════════
secao('3. previousTopic vazio + fromVideoId valido nao devolve 400')
{
  const idxMemoria = rota.indexOf('await lerMemoriaSerie(supabase, user.id')
  const idx400 = rota.indexOf("'previousTopic is required'")
  const idxAnterior = rota.indexOf('const anterior =')
  ok(idxMemoria > 0 && idx400 > idxMemoria, 'a memoria e lida ANTES do 400')
  ok(idxAnterior > idxMemoria && idxAnterior < idx400, '`anterior` e montado entre a memoria e o 400')
  const linhaAnterior = rota.slice(idxAnterior, rota.indexOf('\n', idxAnterior))
  ok(/\|\|\s*memoria\.topicOrigem/.test(linhaAnterior), '`anterior` cai em `memoria.topicOrigem` quando o cliente nao mandou nada')
  ok(/\.slice\(0,\s*4000\)/.test(linhaAnterior), 'o corte em 4000 continua')
}

// ═══ 4. alreadyDone MONTADO NO SERVIDOR (estrutural) ════════════════════════
secao('4. alreadyDone: servidor monta, exclui a origem, normaliza, teto 6/8')
{
  ok(/\[\.\.\.memoria\.jaFeitos,\s*\.\.\.jaFeitosCliente\]/.test(rota), 'a uniao comeca pelo que o SERVIDOR sabe (`[...memoria.jaFeitos, ...jaFeitosCliente]`)')
  ok(/if \(origemId && linha\.id === origemId\) continue/.test(rota), 'o filme de origem e EXCLUIDO da lista (ele ja e o EPISODE 1)')
  ok(/normalizeSeriesSeed\(linha\.topic \|\| linha\.title\)/.test(rota), 'cada item passa por normalizeSeriesSeed (topic primeiro, title como fallback)')
  ok(/import \{ normalizeSeriesSeed \} from '@\/lib\/seriesContinuation'/.test(rota), 'normalizeSeriesSeed vem de @/lib/seriesContinuation (a funcao pura do A3)')
  ok(/const MAX_JA_FEITOS_SERVIDOR = 6\b/.test(rota) && />= MAX_JA_FEITOS_SERVIDOR\) break/.test(rota), 'teto de 6 no que o servidor monta')
  ok(/const jaFeitosFinal = jaFeitos\.slice\(0, 8\)/.test(rota), 'o `.slice(0, 8)` continua como teto final')
  ok(/ALREADY COVERED — do not repeat these:\\n\$\{jaFeitosFinal\.map/.test(rota), 'a lista "ALREADY COVERED" e a uniao final (jaFeitosFinal), nao so a do cliente')
  ok(/\.eq\('status', 'completed'\)/.test(rota) && /\.order\('created_at', \{ ascending: false \}\)/.test(rota) && /\.limit\(LIMITE_LEITURA_MEMORIA\)/.test(rota) && /LIMITE_LEITURA_MEMORIA = 12\b/.test(rota), 'a leitura e completed / created_at desc / limit 12')
  ok(/Write EPISODE \$\{episodeNumber\}\./.test(rota), 'o prompt nomeia o episodio ("Write EPISODE ${episodeNumber}.")')
  ok(/Math\.max\(2, memoria\.totalConcluidos \+ 1\)/.test(rota), 'episodeNumber = concluidos + 1, minimo 2')
  ok(/hadMemory: memoria\.hadMemory/.test(rota) && /alreadyDoneCount: jaFeitosFinal\.length/.test(rota) && /episodeNumber,/.test(rota), 'a resposta devolve episodeNumber, hadMemory e alreadyDoneCount')
  ok(/title: titulo \|\| `Episode \$\{episodeNumber\}`/.test(rota), 'o fallback do titulo acompanha o numero')
  ok((rota.match(/console\.warn\('\[next-episode\] memoria/g) ?? []).length >= 4, 'toda leitura de banco falha fechada com console.warn (4 pontos: erro e throw, x2 leituras)')
}

// ═══ 5. normalizeSeriesSeed REAL limpa o andaime ════════════════════════════
secao('5. normalizeSeriesSeed executada de verdade')
const serie = loadTs('lib/seriesContinuation.ts')
const ordemAntiga = (seed) =>
  `Create the next episode in the same Short series about "${seed}". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.`
const ANDAIME = /create the next episode in the same short series about|keep the topic and format|do not repeat the previous episode|completely new hook/i
{
  const n = serie.normalizeSeriesSeed(ordemAntiga('Every night at 3:17 AM, someone knocks'))
  equal(n, 'Every night at 3:17 AM, someone knocks', 'a ordem antiga vira so o assunto')
  ok(!ANDAIME.test(n), 'sem andaime')
  const n2 = serie.normalizeSeriesSeed(ordemAntiga(ordemAntiga('Chernobyl')))
  equal(n2, 'Chernobyl', 'aninhada duas vezes tambem')
  equal(serie.normalizeSeriesSeed(ordemAntiga('Untitled Short')), '', 'degenerada vira vazio (e sera descartada da lista)')
  equal(serie.normalizeSeriesSeed('Title: The Boiling River'), 'The Boiling River', 'rotulo Title: sai')
  const longa = 'The Boiling River of the Amazon is so hot that it cooks any animal that falls in, and nobody knew why until 2011. Then a young geologist ignored every warning and went there anyway to measure it.'
  const nl = serie.normalizeSeriesSeed(longa)
  ok(nl.length <= 180 && longa.startsWith(nl), 'topic longo (399 chars de media no banco) corta em <=180 na fronteira')
}

// ═══ EXECUCAO REAL DA ROTA (Supabase e OpenAI falsos) ═══════════════════════
secao('rota executada: Supabase falso grava filtros; OpenAI falso grava o prompt')

const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'
const vid = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`
const dia = (n) => new Date(Date.UTC(2026, 8, 1, 12, n)).toISOString()
// Fixture: U1 tem 10 concluidos (v1 = origem) + 1 falhado; U2 tem 1.
const VIDEOS = [
  { id: vid(1), user_id: U1, status: 'completed', created_at: dia(10), title: 'The Boiling River', topic: 'The Boiling River of the Amazon is so hot that it cooks any animal that falls in, and nobody knew why until 2011.' },
  { id: vid(2), user_id: U1, status: 'completed', created_at: dia(9), title: ordemAntiga('Every night at 3:17 AM, someone knocks').slice(0, 120), topic: ordemAntiga('Every night at 3:17 AM, someone knocks') },
  { id: vid(3), user_id: U1, status: 'completed', created_at: dia(8), title: null, topic: 'Title: Chernobyl' },
  { id: vid(4), user_id: U1, status: 'completed', created_at: dia(7), title: null, topic: 'CHERNOBYL' }, // duplicata (case)
  { id: vid(5), user_id: U1, status: 'failed', created_at: dia(6), title: null, topic: 'Nunca entregue — nao pode entrar' },
  { id: vid(6), user_id: U1, status: 'completed', created_at: dia(5), title: null, topic: 'Pompeii\'s last day.' },
  { id: vid(7), user_id: U1, status: 'completed', created_at: dia(4), title: null, topic: 'What happened to Flight MH370?' },
  { id: vid(8), user_id: U1, status: 'completed', created_at: dia(3), title: 'Untitled Short', topic: null }, // degenerada
  { id: vid(9), user_id: U1, status: 'completed', created_at: dia(2), title: null, topic: 'The 1972 Andes crash: 72 days of survival' },
  { id: vid(10), user_id: U1, status: 'completed', created_at: dia(1), title: null, topic: 'Batalha de Los Angeles 1942' },
  { id: vid(11), user_id: U1, status: 'completed', created_at: dia(0), title: null, topic: 'El misterio del Triángulo de las Bermudas' },
  { id: vid(99), user_id: U2, status: 'completed', created_at: dia(11), title: null, topic: 'O filme de OUTRA pessoa' },
]

function fakeSupabase(userId, modo = 'ok') {
  const queries = []
  const builder = () => {
    const q = { table: null, eqs: [], single: false, limit: null, count: null }
    queries.push(q)
    const self = {
      select: (_cols, opts) => { q.count = opts?.count ?? null; return self },
      eq: (col, val) => { q.eqs.push([col, val]); return self },
      order: () => self,
      limit: (n) => { q.limit = n; return self },
      maybeSingle: () => { q.single = true; return self },
      then: (resolve, reject) => {
        if (modo === 'throw') return reject(new Error('supabase caiu'))
        if (modo === 'error') return resolve({ data: null, error: { message: 'PGRST303 JWT issued at future' }, count: null })
        let rows = VIDEOS.filter((v) => q.eqs.every(([c, val]) => v[c] === val))
        rows = rows.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        const total = rows.length
        if (q.single) return resolve({ data: rows[0] ?? null, error: null })
        if (q.limit) rows = rows.slice(0, q.limit)
        return resolve({ data: rows, error: null, count: q.count ? total : null })
      },
    }
    return self
  }
  return {
    queries,
    client: {
      auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
      from: (table) => { const b = builder(); queries[queries.length - 1].table = table; return b },
    },
  }
}

const SCRIPT_BOM = `TITLE: The Lake That Turns Animals To Stone
HOOK
There is a lake in Tanzania where birds land and never leave.
MICRO REWARD
Lake Natron has a pH close to ammonia and water that reaches sixty degrees Celsius.
ESCALATION
Animals that die in it are preserved, calcified by the sodium carbonate that gives the water its red color.
PAYOFF
And yet millions of flamingos breed there every year, because nothing else can reach their nests.`

let fetchCapturado = null
let fetchResposta = () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: SCRIPT_BOM } }] }) })
globalThis.fetch = async (url, init) => {
  fetchCapturado = { url, body: JSON.parse(init.body) }
  return fetchResposta()
}
process.env.OPENAI_API_KEY = 'test-key'
const warns = []
const warnOriginal = console.warn
console.warn = (...a) => { warns.push(a.join(' ')) }
const errOriginal = console.error
const errosRota = []

let supabaseAtual = null
const NextResponse = { json: (body, init) => ({ status: init?.status ?? 200, body }) }
// O modulo de marcadores entra REAL, nao dublado: ele e puro (zero imports) e
// e ele que decide se o roteiro do episodio N nasce rotulado. Dublar aqui
// esconderia justamente o comportamento que a rota passou a depender no #0.
const marcadores = loadTs('lib/nextEpisodeMarkers.ts')
const rotaMod = loadTs(ROTA, {
  'next/server': { NextRequest: class {}, NextResponse },
  '@/lib/supabase/server': { createClient: () => supabaseAtual.client },
  '@/lib/seriesContinuation': serie,
  '@/lib/nextEpisodeMarkers': marcadores,
})

// O cooldown de 45s por user_id e REAL e intacto (a secao 11b prova). Para
// chamar a rota varias vezes com o mesmo dono, o relogio anda 60s por chamada
// — salvo quando o teste pede `semAvancarRelogio` para provar o 429.
const dateNowReal = Date.now
let relogio = dateNowReal()
Date.now = () => relogio
let userSeq = 0
async function chamar(corpo, { userId, modo = 'ok', semUser = false, semAvancarRelogio = false } = {}) {
  if (!semAvancarRelogio) relogio += 60_000
  const uid = semUser ? null : (userId ?? `${String(++userSeq).padStart(8, '0')}-0000-4000-8000-000000000000`)
  supabaseAtual = fakeSupabase(uid, modo)
  fetchCapturado = null
  console.error = (...a) => { errosRota.push(a.join(' ')) }
  try {
    const res = await rotaMod.POST({ json: async () => corpo })
    return { res, queries: supabaseAtual.queries, prompt: fetchCapturado?.body?.messages?.[1]?.content ?? '', sistema: fetchCapturado?.body?.messages?.[0]?.content ?? '', modelo: fetchCapturado?.body?.model }
  } finally {
    console.error = errOriginal
  }
}
const listaCoberta = (prompt) => {
  const m = prompt.match(/ALREADY COVERED — do not repeat these:\n([\s\S]*?)\n\nWrite EPISODE/)
  return m ? m[1].split('\n').map((l) => l.replace(/^- /, '')) : []
}

// ── 3 (comportamental): previousTopic vazio + fromVideoId do dono ───────────
secao('3b. executado: previousTopic vazio + fromVideoId do dono → 200 com memoria')
{
  const r = await chamar({ previousTopic: '', fromVideoId: vid(1), language: 'en' }, { userId: U1 })
  equal(r.res.status, 200, 'nao deu 400: o servidor buscou videos.topic')
  ok(r.prompt.includes(VIDEOS[0].topic), 'EPISODE 1 no prompt = videos.topic do filme de origem')
  equal(r.res.body.hadMemory, true, 'hadMemory=true')
  equal(r.res.body.episodeNumber, 11, 'episodeNumber = 10 concluidos + 1 (o falhado nao conta)')
  ok(/Write EPISODE 11\./.test(r.prompt), 'o prompt diz "Write EPISODE 11."')
  equal(r.res.body.title, 'The Lake That Turns Animals To Stone', 'TITLE: separado do script (contrato antigo)')
  ok(!/TITLE:/.test(r.res.body.script), 'o script nao carrega o titulo')
  ok(typeof r.res.body.words === 'number' && r.res.body.words > 40, 'words continua vindo')
  equal(r.modelo, 'gpt-4o-mini', 'modelo intacto')
  ok(r.sistema.includes('150 to 165 words'), 'o texto do `sistema` nao mudou (150-165 palavras)')
  // Os filtros que o Supabase falso viu:
  const qOrigem = r.queries.find((q) => q.single)
  ok(!!qOrigem && qOrigem.table === 'videos', 'houve UMA leitura single do filme de origem')
  ok(!!qOrigem && qOrigem.eqs.some(([c, v]) => c === 'id' && v === vid(1)), 'filtrada por id')
  ok(!!qOrigem && qOrigem.eqs.some(([c, v]) => c === 'user_id' && v === U1), 'OWNER-SCOPED (executado): a query de origem levou `user_id` = quem esta logado')
  const qLista = r.queries.find((q) => !q.single)
  ok(!!qLista && qLista.eqs.some(([c, v]) => c === 'user_id' && v === U1) && qLista.eqs.some(([c, v]) => c === 'status' && v === 'completed'), 'a lista levou user_id + status=completed')
  equal(qLista?.limit, 12, 'limit 12')
  equal(qLista?.count, 'exact', 'count exact (para o episodeNumber)')
  // A lista "ALREADY COVERED":
  const cob = listaCoberta(r.prompt)
  equal(r.res.body.alreadyDoneCount, 6, 'alreadyDoneCount = 6 (7 unicos disponiveis, teto do servidor 6)')
  equal(cob.length, 6, 'a lista no prompt tem 6 itens')
  ok(!cob.some((t) => t.includes('Boiling River')), 'o filme de ORIGEM nao esta em "ja cobri" (ele e o EPISODE 1)')
  ok(cob.includes('Every night at 3:17 AM, someone knocks'), 'a ordem antiga entrou LIMPA (so o assunto)')
  ok(!cob.some((t) => ANDAIME.test(t)), 'nenhum item carrega "Create the next episode in the same Short series about…"')
  ok(cob.includes('Chernobyl'), 'rotulo Title: saiu')
  equal(cob.filter((t) => t.toLowerCase() === 'chernobyl').length, 1, 'duplicata case-insensitive (CHERNOBYL) descartada')
  ok(!cob.some((t) => /Nunca entregue/.test(t)), 'filme com status failed nao entra')
  ok(!cob.some((t) => /untitled/i.test(t)), 'semente degenerada (Untitled Short) descartada')
  ok(cob.includes('Pompeii\'s last day.') && cob.includes('What happened to Flight MH370?'), 'os mais recentes vem primeiro')
  ok(!cob.includes('El misterio del Triángulo de las Bermudas'), 'o 7o unico (mais antigo) ficou fora pelo teto de 6')
}

// ── narracao do cliente tem prioridade sobre videos.topic ───────────────────
secao('cliente manda a narracao → ela e o EPISODE 1, nao o topic do banco')
{
  const r = await chamar({ previousTopic: 'NARRACAO REAL DO FILME, palavra por palavra.', fromVideoId: vid(1), language: 'en' }, { userId: U1 })
  equal(r.res.status, 200, '200')
  ok(r.prompt.includes('NARRACAO REAL DO FILME'), 'EPISODE 1 = narracao do cliente')
  ok(!r.prompt.includes('so hot that it cooks'), 'videos.topic NAO substituiu a narracao')
  equal(r.res.body.hadMemory, true, 'mas a memoria (alreadyDone/episodeNumber) veio do servidor mesmo assim')
  equal(r.res.body.episodeNumber, 11, 'episodeNumber 11')
}

// ── uniao com o que o cliente mandou: dedup + teto 8 ────────────────────────
secao('alreadyDone do cliente entra na uniao, sem duplicata, teto 8')
{
  const r = await chamar({ previousTopic: 'x', fromVideoId: vid(1), alreadyDone: ['chernobyl', 'Tema do cliente 1', 'Tema do cliente 2', 'Tema do cliente 3', '', 42], language: 'en' }, { userId: U1 })
  const cob = listaCoberta(r.prompt)
  equal(r.res.body.alreadyDoneCount, 8, '6 do servidor + 3 do cliente (1 duplicado, 1 vazio, 1 nao-string) = 8 pelo teto')
  equal(cob.length, 8, '8 itens no prompt')
  equal(cob.filter((t) => t.toLowerCase() === 'chernobyl').length, 1, '"chernobyl" do cliente nao duplicou o do servidor')
  ok(cob.slice(0, 6).every((t) => !/Tema do cliente/.test(t)), 'os 6 do servidor vem ANTES dos do cliente (servidor = fonte de verdade)')
}

// ── filme de OUTRA pessoa: nao vira memoria; sem previousTopic → 400 ───────
secao('1b. executado: fromVideoId de outra pessoa nao vira memoria')
{
  const r = await chamar({ previousTopic: '', fromVideoId: vid(99), language: 'en' }, { userId: U1 })
  equal(r.res.status, 400, 'sem narracao e com filme alheio → 400 (o filtro de dono devolveu nada)')
  ok(!r.prompt, 'o GPT nao foi chamado')
  const r2 = await chamar({ previousTopic: 'minha narracao', fromVideoId: vid(99), language: 'en' }, { userId: U1 })
  equal(r2.res.status, 200, 'com narracao → 200, mas...')
  equal(r2.res.body.hadMemory, false, 'hadMemory=false (nao leu o filme alheio)')
  ok(!r2.prompt.includes('OUTRA pessoa'), 'o topic alheio nao vazou para o prompt')
  const cob = listaCoberta(r2.prompt)
  ok(!cob.some((t) => /OUTRA pessoa/.test(t)), 'nem para a lista "ja cobri"')
  equal(r2.res.body.episodeNumber, 11, 'a lista do proprio U1 continua valendo')
}

// ── uuid invalido / sem fromVideoId / sem nada ──────────────────────────────
secao('bordas: uuid invalido, sem id, sem nada')
{
  const r = await chamar({ previousTopic: 'narracao', fromVideoId: "x' OR 1=1 --", language: 'en' }, { userId: U1 })
  equal(r.res.status, 200, 'uuid invalido → segue sem memoria de origem')
  ok(!r.queries.some((q) => q.single), 'uuid invalido NAO foi ao banco pela query de origem')
  equal(r.res.body.hadMemory, false, 'hadMemory=false')
  const r2 = await chamar({ previousTopic: 'narracao', language: 'en' })
  equal(r2.res.status, 200, 'sem fromVideoId: o caminho antigo continua (200)')
  equal(r2.res.body.episodeNumber, 2, 'sem filmes concluidos → episodeNumber 2')
  equal(r2.res.body.alreadyDoneCount, 0, 'sem lista')
  ok(!/ALREADY COVERED/.test(r2.prompt) && /Write EPISODE 2\./.test(r2.prompt), 'prompt sem lista e "Write EPISODE 2." — byte a byte o de antes')
  const r3 = await chamar({ previousTopic: '', language: 'en' })
  equal(r3.res.status, 400, 'sem nada → 400 (so depois dos dois caminhos)')
  const r4 = await chamar({ previousTopic: '', fromVideoId: vid(2), language: 'en' }, { userId: U1 })
  equal(r4.res.status, 200, 'origem = v2 (a ordem antiga no topic) → 200')
  ok(r4.prompt.includes(VIDEOS[1].topic), 'EPISODE 1 = o topic cru de v2 (o GPT le a ordem inteira, isso e o fallback)')
  ok(!listaCoberta(r4.prompt).some((t) => /3:17 AM/.test(t)), 'e v2 saiu da lista "ja cobri"')
  ok(listaCoberta(r4.prompt).some((t) => /Boiling River/.test(t)), 'v1 entrou na lista (agora ele nao e a origem)')
}

// ── falha fechada: banco com erro / banco lancando ─────────────────────────
secao('e. falha fechada: Supabase com erro ou lancando NAO derruba a rota')
{
  warns.length = 0
  const r = await chamar({ previousTopic: 'narracao', fromVideoId: vid(1), language: 'en' }, { userId: U1, modo: 'error' })
  equal(r.res.status, 200, 'erro do Supabase → 200 mesmo assim')
  equal(r.res.body.hadMemory, false, 'sem memoria')
  equal(r.res.body.episodeNumber, 2, 'episodeNumber cai para 2')
  ok(warns.some((w) => /memoria/.test(w)), 'logou console.warn')
  warns.length = 0
  const r2 = await chamar({ previousTopic: 'narracao', fromVideoId: vid(1), language: 'en' }, { userId: U1, modo: 'throw' })
  equal(r2.res.status, 200, 'Supabase lancando → 200 mesmo assim')
  ok(warns.length >= 2, 'os dois try/catch avisaram')
  const r3 = await chamar({ previousTopic: '', fromVideoId: vid(1), language: 'en' }, { userId: U1, modo: 'error' })
  equal(r3.res.status, 400, 'erro do banco + cliente sem narracao → 400 limpo, nao 500')
}

// ── 11 (executado): o contrato antigo ───────────────────────────────────────
secao('11b. executado: cooldown, marcadores, 401')
{
  const uid = '99999999-9999-4999-8999-999999999999'
  const a = await chamar({ previousTopic: 'narracao', language: 'en' }, { userId: uid })
  equal(a.res.status, 200, '1a chamada 200')
  const b = await chamar({ previousTopic: 'narracao', language: 'en' }, { userId: uid, semAvancarRelogio: true })
  equal(b.res.status, 429, '2a chamada do mesmo user em <45s → 429 (cooldown intacto)')
  ok(b.res.body.retryAfterMs > 40_000, 'retryAfterMs perto de 45s')
  const antes = fetchResposta
  fetchResposta = () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'TITLE: x\nHOOK\nsem os outros marcadores' } }] }) })
  const c = await chamar({ previousTopic: 'narracao', fromVideoId: vid(1), language: 'en' }, { userId: U1 })
  equal(c.res.status, 502, 'script sem os 4 marcadores → 502 (temMarcadores intacto)')
  fetchResposta = antes
  const d = await chamar({ previousTopic: 'narracao', language: 'en' }, { semUser: true })
  equal(d.res.status, 401, 'sem usuario → 401 antes de qualquer banco')
  const e = await chamar({ previousTopic: 'a'.repeat(5000), language: 'en' })
  ok(e.prompt.includes('a'.repeat(4000)) && !e.prompt.includes('a'.repeat(4001)), 'corte em 4000 (executado)')
}
console.warn = warnOriginal
Date.now = dateNowReal

// ═══ 11 (estrutural): o contrato antigo continua no arquivo ═════════════════
secao('11. estrutural: o contrato antigo continua no arquivo')
ok(/const MARCADORES = \['HOOK', 'MICRO REWARD', 'ESCALATION', 'PAYOFF'\] as const/.test(rota), 'MARCADORES intactos')
ok(/const COOLDOWN_MS = 45_000/.test(rota), 'cooldown 45s')
ok(/model: 'gpt-4o-mini'/.test(rota) && /temperature: 0\.8/.test(rota), 'gpt-4o-mini, temperatura 0.8')
// KINEO-EPISODIO2-MARCADORES-2026-09-05: o #0 SUBSTITUIU de proposito o 502
// seco de `temMarcadores` pelo portao `garantirMarcadores` — era esse 502 que
// matava 12 de 16 episodios. Continuar exigindo a chamada morta deixava este
// guardiao VERMELHO para sempre por causa de uma entrega CORRETA, e guardiao
// vermelho por motivo falso ensina a ignorar vermelho. Trava-se o contrato
// novo, que e mais exigente que o antigo: portao chamado, 502 so no
// irrecuperavel, e o texto que segue tem de ser o ROTULADO.
ok(/import \{ garantirMarcadores \} from '@\/lib\/nextEpisodeMarkers'/.test(rota), 'o portao de marcadores vem do modulo puro @/lib/nextEpisodeMarkers')
ok(/const garantido = garantirMarcadores\(script\)/.test(rota), 'a rota chama garantirMarcadores(script)')
ok(/if \(!garantido\) \{/.test(rota) && /status: 502/.test(rota), 'so o irrecuperavel (garantido null) continua virando 502')
// Pinado na LINHA QUE ENTREGA, nao em "garantido.script existe em algum
// lugar": `garantido.script` aparece 2x (contagem de palavras e resposta), e
// um match solto passava mesmo trocando a contagem pelo texto cru. O que nao
// pode regredir e o que VAI PARA O CLIENTE.
ok(/script: garantido\.script/.test(rota), 'o script ENTREGUE ao cliente e o ROTULADO, nao o cru')
ok(/\/\^\\s\*TITLE\\s\*:\/i\.test\(linhas\[0\]/.test(rota), 'separacao de TITLE:')
ok(/ALREADY COVERED — do not repeat these:/.test(rota), 'a frase de exclusao tem a MESMA forma')
ok(/t\.slice\(0, 120\)/.test(rota), 'cada item da lista cortado em 120 como antes')
ok(/150 to 165 words of narration total\. This is a contract: shorter fails\./.test(rota), 'contrato 150-165 palavras no `sistema`')

// ═══ 6-9. O CALLER ═════════════════════════════════════════════════════════
secao('6. o caller manda voiceover_script como fonte, topic como fallback')
ok(/const narracao = \(inputs\?\.voiceover_script \?\? ''\)\.trim\(\)/.test(bloco), '`narracao` = lastFastRenderRef.voiceover_script')
ok(/const base = narracao \|\| \(inputs\?\.topic \?\? ''\)\.trim\(\)/.test(bloco), '`base` = narracao, senao topic')
ok(/previousTopic: base,/.test(bloco), 'previousTopic = base (a narracao)')
ok(!/previousTopic: \(?lastFastRenderRef\.current\?\.topic/.test(bloco), 'previousTopic NAO e mais o topic direto')
ok(/const inputs = lastFastRenderRef\.current\b/.test(bloco), 'le o objeto FastRenderInputs')
ok(/voiceover_script: string/.test(cliente.slice(cliente.indexOf('interface FastRenderInputs'), cliente.indexOf('interface FastRenderInputs') + 400)), 'FastRenderInputs continua tendo voiceover_script')

secao('7. o caller manda fromVideoId e nao morre sem lastFastRenderRef')
ok(/fromVideoId: videoId \?\? undefined/.test(bloco), 'o corpo do fetch leva `fromVideoId`')
ok(/const videoId = publicVideoId\b/.test(bloco), 'videoId = publicVideoId (o handle duravel)')
ok(/if \(!base && !videoId\) return/.test(bloco), 'so desiste sem base E sem id')
ok(!/if \(!base\) return/.test(bloco), 'o antigo `if (!base) return` (que matava o cartao) SUMIU')
ok(/const chave = videoId \|\| base/.test(bloco) && /nextEpisodeAskedForRef\.current === chave\) return/.test(bloco), 'dedup por `publicVideoId || base`')
ok(/if \(base && nextEpisodeAskedForRef\.current === base\) return/.test(bloco), 'id chegando depois de uma chamada pelo tema nao dispara 2a chamada')
ok(/\}, \[phase\]\)/.test(bloco), 'deps do efeito continuam [phase]')

secao('8. os tres eventos novos, com o idiom trackEvent do arquivo')
ok(/import \{[^}]*\btrackEvent\b[^}]*\} from '@\/lib\/analytics'/.test(cliente), 'trackEvent importado de @/lib/analytics')
ok(/trackEvent\('next_episode_requested', \{ video_id: videoId, had_narration: Boolean\(narracao\) \}\)/.test(bloco), 'next_episode_requested { video_id, had_narration }')
ok(/trackEvent\('next_episode_ready', \{\s*video_id: videoId,\s*words: [^,]+,\s*episode_number: [^,]+,\s*had_memory: [^,]+,\s*already_done_count: [^,]+,?\s*\}\)/.test(bloco), 'next_episode_ready { video_id, words, episode_number, had_memory, already_done_count }')
ok((bloco.match(/trackEvent\('next_episode_failed', \{ video_id: videoId, status: /g) ?? []).length === 2, 'next_episode_failed { video_id, status } nos dois ramos (!ok e sem script)')
{
  const idxReq = bloco.indexOf("trackEvent('next_episode_requested'")
  const idxFetch = bloco.indexOf("fetch('/api/next-episode'")
  ok(idxReq > 0 && idxReq < idxFetch, 'requested e emitido ANTES do fetch')
  const cleanup = bloco.slice(bloco.indexOf('return () => {'), bloco.indexOf('}, [phase])'))
  ok(!/trackEvent/.test(cleanup), 'nada e emitido no cleanup/cancelamento')
  ok(/if \(cancelado\) return\s*\n\s*if \(!r\.ok\)/.test(bloco), 'cancelado nao emite failed')
}
ok(/trackEvent\('next_episode_clicked'/.test(cliente), 'o evento antigo de clique continua (startNextEpisode intocado)')

secao('9. a regra do prompt cru continua')
ok(/NUNCA CAIR NO `prompt` CRU/.test(bloco), 'o comentario "NUNCA CAIR NO `prompt` CRU" esta no bloco')
ok(/VIRAL_STARTER_TOPICS/.test(bloco), '...com o motivo (VIRAL_STARTER_TOPICS na volta da Stripe)')
ok(!/previousTopic: prompt\b/.test(bloco) && !/\bbase = .*\bprompt\b/.test(bloco) && !/narracao \|\| prompt/.test(bloco), 'o `prompt` cru NAO e usado como fonte em lugar nenhum do bloco')
ok(/const \[nextEpisode, setNextEpisode\] = useState<\{ title: string; script: string \} \| null>/.test(cliente), 'o estado do cartao nao mudou de forma (UI intocada)')

// ═══ 10. TRAVA DE QUALIDADE DO FUNDADOR ════════════════════════════════════
secao('10. trava de qualidade: nenhum caminho proibido no diff')
{
  let tocados = []
  try {
    const diff = execFileSync('git', ['diff', '--name-only', BASE_COMMIT], { cwd: root, encoding: 'utf8' })
    const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8' })
    tocados = [...new Set([
      ...diff.split('\n'),
      ...status.split('\n').map((l) => l.slice(3).trim()),
    ])].map((p) => p.trim().replace(/\\/g, '/')).filter(Boolean)
    ok(true, `git diff contra ${BASE_COMMIT} leu ${tocados.length} caminho(s)`)
  } catch (e) {
    ok(false, 'git diff falhou: ' + (e.message || e))
  }
  const proibidos = tocados.filter((p) => CAMINHOS_PROIBIDOS.some((re) => re.test(p)))
  ok(proibidos.length === 0, `NENHUM caminho proibido tocado (fundador 03/09: "os videos tem saido nota 9, NAO QUERO QUE MEXA NISSO")${proibidos.length ? ' — tocados: ' + proibidos.join(', ') : ''}`)

  // app/api/compose/** por CONTEUDO: metadata e persistencia passam, simbolo
  // do motor nao. Ver o bloco de comentario no topo do arquivo.
  const compose = tocados.filter((p) => /^app\/api\/compose\//.test(p))
  const composeComMotor = compose.filter((p) => {
    try {
      const hunks = execFileSync('git', ['diff', '-U0', BASE_COMMIT, '--', p], { cwd: root, encoding: 'utf8' })
      return hunks.split('\n').filter((l) => /^[+-][^+-]/.test(l)).some((l) => SIMBOLOS_DO_MOTOR.test(l))
    } catch { return true }
  })
  ok(composeComMotor.length === 0,
    `app/api/compose: nenhuma linha do MOTOR alterada${compose.length ? ` (${compose.length} arquivo(s) tocado(s), so metadata/persistencia)` : ''}${composeComMotor.length ? ' — com motor: ' + composeComMotor.join(', ') : ''}`)

  // A checagem antiga era "so estes 3 arquivos no diff" — impossivel numa fila
  // compartilhada, onde o diff carrega Codex e a outra sessao. O que importa e
  // que a ENTREGA esteja presente; o que os outros trazem e problema do teste
  // deles. (Mesma correcao que o test-despacho-vazio ja fez na sua 8.3.)
  // E, depois que a entrega ENTRA na main, ela some do diff — o certo passa a
  // ser "os 3 arquivos existem na arvore". As secoes 1 a 9 acima ja provam o
  // CONTEUDO deles; aqui so se garante que nenhum sumiu.
  const meus = [ROTA, CLIENTE, 'scripts/test-serie-memoria-2026-09-04.mjs']
  const ausentes = meus.filter((p) => !existsSync(join(root, p)))
  ok(ausentes.length === 0, `os 3 arquivos DESTA entrega estao na arvore${ausentes.length ? ' — faltam: ' + ausentes.join(', ') : ''}`)
}

console.log(`\n${checks - fails.length}/${checks} verificacoes passaram${fails.length ? ` — ${fails.length} FALHARAM` : ''}\n`)
process.exit(fails.length ? 1 : 0)
