// KINEO-ROBO-IA-1011 — guardião do registro de leitura de robô de IA (lib/seo/aiFetchLog.ts + middleware.ts).
// Prova as travas do CEO (09/11): trecho TRAVA 8.2 intacto byte a byte; nunca atrasa nem muda a resposta;
// teto de volume por id determinístico; nada de IP/query; fora de visitantes e funil; interruptor por ambiente.
// Rodar: node scripts/test-robo-ia-1011.mjs   (Node 23.6+ lê o .ts direto)
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

const mod = await import('../lib/seo/aiFetchLog.ts')
const { classifyAiFetcher, buildAiFetchRow, aiFetchEventId, inTrainingSample, ipInAnthropicEgress, registrarLeituraDeRoboIa, AI_FETCHERS } = mod

// ── (a) trecho TRAVA 8.2 do middleware igual byte a byte ao de origin/main 632899864 ──────────────────────────────
const mw = fs.readFileSync('middleware.ts', 'utf8').replace(/\r\n/g, '\n')
const a = mw.indexOf('  // KINEO-5-LINGUAS-0311 [TRAVA 8.2')
const fim = 'return linguaResponse\n  }\n'
const b = mw.indexOf(fim, a)
assert.ok(a > 0 && b > a, 'trecho TRAVA 8.2 encontrado')
const trava = mw.slice(a, b + fim.length)
assert.equal(createHash('sha256').update(trava).digest('hex'), 'ad67020cfeee48e457977a05bcdcceae0acb68f988b03da4ad53c8cdaa53beb4', 'TRAVA 8.2 intacta')

// ── (b) a chamada é a 1ª instrução do middleware, sem await e sem usar retorno ────────────────────────────────────
const corpo = mw.slice(mw.indexOf('export async function middleware(request: NextRequest, event: NextFetchEvent) {'))
assert.ok(corpo.length > 0, 'middleware recebe o NextFetchEvent')
const primeiraInstrucao = corpo.split('\n').slice(1).find((l) => l.trim() && !l.trim().startsWith('//'))
assert.equal(primeiraInstrucao.trim(), 'registrarLeituraDeRoboIa(request, (p) => event.waitUntil(p))', 'chamada isolada no topo')
assert.equal((mw.match(/registrarLeituraDeRoboIa\(/g) || []).length, 1, 'uma chamada só')
assert.ok(!/await\s+registrarLeituraDeRoboIa|=\s*registrarLeituraDeRoboIa/.test(mw), 'sem await e sem usar o retorno')

// ── classificação: só a lista fechada ──────────────────────────────────────────────────────────────────────────
const UA = {
  claudeUser: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)',
  claudeSearch: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://www.anthropic.com)',
  claudeBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  chatgptUser: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  oai: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  gpt: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  pplx: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  pplxUser: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  google: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
}
assert.deepEqual(AI_FETCHERS.map((f) => f.bot), ['Claude-User', 'Claude-SearchBot', 'ClaudeBot', 'ChatGPT-User', 'OAI-SearchBot', 'GPTBot', 'Perplexity-User', 'PerplexityBot'], 'lista fechada de 8')
assert.equal(classifyAiFetcher(UA.claudeUser).bot, 'Claude-User')
assert.equal(classifyAiFetcher(UA.claudeSearch).bot, 'Claude-SearchBot')
assert.equal(classifyAiFetcher(UA.claudeBot).bot, 'ClaudeBot')
assert.equal(classifyAiFetcher(UA.chatgptUser).bot, 'ChatGPT-User')
assert.equal(classifyAiFetcher(UA.oai).bot, 'OAI-SearchBot')
assert.equal(classifyAiFetcher(UA.gpt).bot, 'GPTBot')
assert.equal(classifyAiFetcher(UA.pplx).bot, 'PerplexityBot')
assert.equal(classifyAiFetcher(UA.pplxUser).bot, 'Perplexity-User')
for (const u of [UA.chrome, UA.google, '', null, 'xClaude-Userx/1.0', 'MyClaudeBotClone']) assert.equal(classifyAiFetcher(u), null, `não é robô de IA: ${u}`)

// ── linha: método, host, query, caminho interno, campos nulos, sem IP ────────────────────────────────────────────
const t0 = new Date('2026-11-10T13:20:00Z')
const base = { method: 'GET', hostname: 'www.usekineo.com', pathname: '/pricing', userAgent: UA.claudeUser, forwardedFor: '160.79.105.7, 10.0.0.1', now: t0 }
const row = await buildAiFetchRow(base)
assert.equal(row.name, 'ai_fetch')
assert.equal(row.path, '/pricing')
assert.equal(row.session_id, null, 'session_id nulo → fora de visitantes/funil (admin_live_counters e admin_numeros_empresa exigem session_id)')
assert.equal(row.user_id, null)
assert.deepEqual(Object.keys(row.metadata).sort(), ['bot', 'bucket', 'family', 'ip_anthropic', 'kind', 'method'])
assert.equal(row.metadata.ip_anthropic, true)
assert.ok(!JSON.stringify(row).includes('160.79') && !JSON.stringify(row).includes('10.0.0.1'), 'IP nunca gravado')
assert.equal((await buildAiFetchRow({ ...base, forwardedFor: '8.8.8.8' })).metadata.ip_anthropic, false, 'UA falso fora da faixa marcado')
assert.equal(await buildAiFetchRow({ ...base, method: 'POST' }), null, 'só GET/HEAD')
assert.ok(await buildAiFetchRow({ ...base, method: 'head' }))
assert.equal(await buildAiFetchRow({ ...base, hostname: 'kineo-git-x.vercel.app' }), null, 'preview não grava')
assert.equal(await buildAiFetchRow({ ...base, userAgent: UA.chrome }), null, 'gente não grava')
assert.equal(await buildAiFetchRow({ ...base, pathname: '/_next/data/x.json' }), null)
assert.equal((await buildAiFetchRow({ ...base, pathname: '/pricing?email=a@b.com#x' })).path, '/pricing', 'query nunca gravada')
assert.equal((await buildAiFetchRow({ ...base, userAgent: UA.chatgptUser })).metadata.ip_anthropic, undefined, 'faixa só para a Anthropic')

// ── (c) teto de volume: id determinístico por robô + página + hora (usuário) ou dia (busca/treino) ─────────────────
const idA = row.id
assert.match(idA, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, 'UUID válido')
assert.equal((await buildAiFetchRow({ ...base, now: new Date('2026-11-10T13:59:59Z') })).id, idA, 'mesma hora = mesma linha')
assert.notEqual((await buildAiFetchRow({ ...base, now: new Date('2026-11-10T14:00:00Z') })).id, idA, 'hora nova = linha nova (Claude-User)')
const s1 = await buildAiFetchRow({ ...base, userAgent: UA.claudeSearch, now: new Date('2026-11-10T01:00:00Z') })
const s2 = await buildAiFetchRow({ ...base, userAgent: UA.claudeSearch, now: new Date('2026-11-10T23:00:00Z') })
assert.equal(s1.id, s2.id, 'busca: 1 linha por dia')
assert.notEqual(s1.id, await aiFetchEventId('Claude-SearchBot', '/pricing', '2026-11-11'))
assert.notEqual(idA, (await buildAiFetchRow({ ...base, pathname: '/facts' })).id, 'página diferente = linha diferente')
let amostra = 0
for (let i = 0; i < 2000; i++) if (await inTrainingSample('/p/' + i)) amostra++
assert.ok(amostra > 120 && amostra < 280, `treino amostrado ~1/10 (${amostra}/2000)`)
const dentro = ['/p/0', '/p/1', '/p/2', '/p/3', '/p/4', '/p/5', '/p/6', '/p/7', '/p/8', '/p/9', '/p/10', '/p/11', '/p/12', '/p/13', '/p/14', '/p/15', '/p/16', '/p/17', '/p/18', '/p/19', '/p/20', '/p/21', '/p/22', '/p/23', '/p/24', '/p/25', '/p/26', '/p/27', '/p/28', '/p/29']
let algumFora = false
for (const p of dentro) {
  const r = await buildAiFetchRow({ ...base, pathname: p, userAgent: UA.claudeBot })
  if ((r !== null) !== (await inTrainingSample(p))) assert.fail('treino segue o sorteio fixo da página')
  if (r === null) algumFora = true
}
assert.ok(algumFora, 'ClaudeBot não grava toda página')

// ── faixa da Anthropic = espelho de lib/mcp/kineoMcp.ts ───────────────────────────────────────────────────────
const mcp = fs.readFileSync('lib/mcp/kineoMcp.ts', 'utf8')
assert.ok(mcp.includes("ANTHROPIC_EGRESS = { base: ipv4ToInt('160.79.104.0') as number, prefix: 21 }"), 'faixa do kineoMcp não mudou')
assert.equal(ipInAnthropicEgress('160.79.111.255'), true)
assert.equal(ipInAnthropicEgress('160.79.112.0'), false)
assert.equal(ipInAnthropicEgress('::ffff:160.79.104.1'), true)

// ── (b) e (e) nunca atrasa nem muda a resposta; erro engolido; interruptor ──────────────────────────────────────
const env = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, sw: process.env.AI_FETCH_LOG }
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://exemplo.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste'
delete process.env.AI_FETCH_LOG
const chamadas = []
const fetchOriginal = globalThis.fetch
globalThis.fetch = (url, init) => { chamadas.push({ url, init }); return new Promise(() => {}) } // nunca resolve: prova que ninguém espera
const req = (ua, extra = {}) => {
  const h = new Map(Object.entries({ 'user-agent': ua, host: 'www.usekineo.com', 'x-forwarded-for': '160.79.104.9', ...extra }))
  return { method: 'GET', nextUrl: { pathname: '/pricing' }, headers: { get: (k) => h.get(k.toLowerCase()) ?? null } }
}
const promessas = []
const wait = (p) => promessas.push(p)

// gente: nada acontece
const r1 = registrarLeituraDeRoboIa(req(UA.chrome), wait)
assert.equal(r1, undefined)
assert.equal(promessas.length, 0, 'gente não gera trabalho')

// robô: volta na hora (síncrono), trabalho só no waitUntil
const reqRobo = req(UA.claudeUser)
const antes = JSON.stringify([...['user-agent', 'host', 'x-forwarded-for'].map((k) => reqRobo.headers.get(k))])
const r2 = registrarLeituraDeRoboIa(reqRobo, wait)
assert.equal(r2, undefined, 'não devolve nada que o middleware possa usar como resposta')
assert.equal(promessas.length, 1, 'um trabalho entregue ao waitUntil')
assert.equal(JSON.stringify([...['user-agent', 'host', 'x-forwarded-for'].map((k) => reqRobo.headers.get(k))]), antes, 'pedido intacto')
await new Promise((r) => setTimeout(r, 50))
assert.equal(chamadas.length, 1)
assert.equal(chamadas[0].url, 'https://exemplo.supabase.co/rest/v1/events?on_conflict=id')
assert.equal(chamadas[0].init.method, 'POST')
assert.equal(chamadas[0].init.headers.Prefer, 'resolution=ignore-duplicates,return=minimal', 'duplicata ignorada no banco')
const corpoPost = JSON.parse(chamadas[0].init.body)
assert.equal(corpoPost.name, 'ai_fetch')
assert.equal(corpoPost.session_id, null)

// falha de rede engolida
globalThis.fetch = () => Promise.reject(new Error('rede caiu'))
const p3 = []
registrarLeituraDeRoboIa(req(UA.claudeUser), (p) => p3.push(p))
await assert.doesNotReject(p3[0], 'falha de gravação engolida')

// cabeçalho que explode também não quebra
assert.doesNotThrow(() => registrarLeituraDeRoboIa({ method: 'GET', nextUrl: { pathname: '/' }, headers: { get: () => { throw new Error('x') } } }, wait))

// interruptor
process.env.AI_FETCH_LOG = 'off'
const p4 = []
registrarLeituraDeRoboIa(req(UA.claudeUser), (p) => p4.push(p))
assert.equal(p4.length, 0, 'AI_FETCH_LOG=off desliga')

globalThis.fetch = fetchOriginal
for (const [k, v] of [['NEXT_PUBLIC_SUPABASE_URL', env.url], ['SUPABASE_SERVICE_ROLE_KEY', env.key], ['AI_FETCH_LOG', env.sw]]) {
  if (v === undefined) delete process.env[k]
  else process.env[k] = v
}

// ── mutantes: as travas do texto-fonte precisam continuar lá ─────────────────────────────────────────────────────
const fonte = fs.readFileSync('lib/seo/aiFetchLog.ts', 'utf8')
for (const trecho of ['on_conflict=id', 'resolution=ignore-duplicates', 'session_id: null', 'user_id: null', '.catch(() => undefined)', "=== 'off'"]) {
  assert.ok(fonte.includes(trecho), `trava presente na fonte: ${trecho}`)
}
assert.ok(!/await\s+fetch|await\s+work/.test(fonte), 'nenhum await no caminho da resposta')

console.log('PASS: TRAVA 8.2 intacta, chamada isolada sem await, 8 robôs, sem IP/query, 1 linha por robô+página+período, treino ~1/10, falha engolida, interruptor')
