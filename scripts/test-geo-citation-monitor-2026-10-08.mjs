// KINEO-GEO-CITACAO-SEMANAL-2026-10-08 — guardião do monitor semanal de citação no ChatGPT.
// Roda com `node scripts/test-geo-citation-monitor-2026-10-08.mjs`: sem rede, sem banco, sem OpenAI e sem alias '@/'
// (lê os arquivos com readFileSync e transpila com o typescript do repo; a OpenAI e o banco são falsos).
//
// Prova, EXECUTANDO o código:
//   A. a função pura (lib/geo/citationMonitor.ts → analyzeCitationAnswer) com respostas de exemplo: menção, citação,
//      chip de citação, homônimo kineo.studio, domínio parecido, concorrentes, entrada inválida;
//   B. o teto de 12 chamadas por execução: com a lista fixa, com 20 perguntas e com o plano sem corte, o modelo falso
//      é chamado no máximo 12 vezes, sempre com maxRetries 0 e timeout; uma pergunta que falha não derruba as outras;
//      a 2ª rodada da mesma semana não chama nada;
//   C. a entrada no vercel.json dispara de verdade: existe uma vez, toda segunda 12:00 UTC, carrega o token que a rota
//      exige — e a rota chamada com o path EXATO do vercel.json faz a rodada real (sem o token, só ensaio);
//   D. a autenticação: sem cabeçalho, com segredo errado ou sem CRON_SECRET → 401, nenhuma chamada, nenhuma escrita.
// E mais: os dois eventos no SERVER_ONLY_EVENTS do sink /api/events e a consulta docs/queries/GEO-CITACOES.sql lendo
// só chaves que a rota grava de verdade.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const check = async (nome, condicao) => {
  let v = false
  try {
    v = typeof condicao === 'function' ? !!(await condicao()) : !!condicao
  } catch (e) {
    falhas.push(`${nome} (lançou: ${e.message})`)
    return
  }
  if (v) ok++
  else falhas.push(nome)
}
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const F = {
  lib: 'lib/geo/citationMonitor.ts',
  rota: 'app/api/cron/geo-citation-monitor/route.ts',
  vercel: 'vercel.json',
  sink: 'app/api/events/route.ts',
  sql: 'docs/queries/GEO-CITACOES.sql',
}
for (const p of Object.values(F)) await check(`arquivo existe: ${p}`, existsSync(join(RAIZ, p)))

// ── carregador: transpila TS → CJS; '@/x' vira o arquivo x.ts do repo, salvo quando há stub ─────────────────────────
function makeLoader(stubs = {}) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const js = ts.transpileModule(rd(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:')) return nodeRequire(spec)
      if (spec.startsWith('@/')) return load(`${spec.slice(2)}.ts`)
      throw new Error(`sem stub: ${spec} (em ${rel})`)
    }
    new Function('exports', 'require', 'module', js)(module.exports, req, module)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}

const L = makeLoader()(F.lib)
const ROTA_SRC = rd(F.rota)

// ═══ A. A FUNÇÃO PURA ═══════════════════════════════════════════════════════════════════════════════════════════════
const A = (texto, urls) => L.analyzeCitationAnswer(texto, urls)
const KINEO_URL = 'https://www.usekineo.com/ai-video-generator/seedance'

await check('A1 Kineo nomeada + chip usekineo.com: menciona, cita, URL sem utm_source=openai, concorrente pelo domínio', () => {
  const r = A(
    'Good options:\n1. **Kineo** — turns one prompt into a narrated Short ([usekineo.com](https://www.usekineo.com/ai-video-generator/seedance?utm_source=openai))\n2. **InVideo AI** — template editor ([invideo.io](https://invideo.io/make/ai-youtube-shorts-generator/?utm_source=openai))',
    ['https://www.usekineo.com/ai-video-generator/seedance?utm_source=openai', 'https://invideo.io/make/ai-youtube-shorts-generator/?utm_source=openai'],
  )
  return r.mentions_kineo === true && r.cites_usekineo === true && igual(r.usekineo_urls, [KINEO_URL]) && igual(r.competitors_mentioned, ['InVideo'])
})
await check('A2 só concorrentes: nada de Kineo; "in video", "canvas" e "financial runway" não viram InVideo/Canva/Runway', () => {
  const r = A('Try CapCut, HeyGen and Runway Gen-4 for Shorts. Captions in video help; a canvas helps; mind your financial runway.', ['https://www.capcut.com/tools/free-ai-video-generator?utm_source=openai'])
  const r2 = A('Mind your financial runway and add captions in video on a blank canvas.', [])
  return r.mentions_kineo === false && r.cites_usekineo === false && igual(r.usekineo_urls, []) && igual(r.competitors_mentioned, ['CapCut', 'HeyGen', 'Runway']) && igual(r2.competitors_mentioned, [])
})
await check('A3 homônimo: "Kineo" + kineo.studio (sem usekineo) NÃO é a Kineo — vira concorrente "kineo.studio (homônimo)"', () => {
  const r = A('Kineo is an AI tool that turns articles into videos ([kineo.studio](https://kineo.studio/?utm_source=openai)).', ['https://kineo.studio/?utm_source=openai'])
  const r2 = A('Kineo (kineo.com) is an e-learning company.', [])
  return r.mentions_kineo === false && r.cites_usekineo === false && igual(r.competitors_mentioned, ['kineo.studio (homônimo)']) && r2.mentions_kineo === false
})
await check('A4 domínio parecido não é citação: usekineo.com.evil.io, notusekineo.com, usekineo.co, ?u=usekineo.com', () => {
  const r = A('Some sites copy names: https://usekineo.com.evil.io/page and others.', ['https://usekineo.com.evil.io/x', 'https://notusekineo.com/', 'http://evil.io/?u=usekineo.com', 'https://usekineo.co/'])
  return r.cites_usekineo === false && igual(r.usekineo_urls, []) && r.mentions_kineo === false
})
await check('A5 chip de citação sozinho: cita usekineo.com mas NÃO conta como menção', () => {
  const r = A('Seedance 1.5 has limited free access on some platforms ([usekineo.com](https://www.usekineo.com/ai-video-generator/seedance?utm_source=openai)).', ['https://www.usekineo.com/ai-video-generator/seedance?utm_source=openai'])
  return r.mentions_kineo === false && r.cites_usekineo === true && igual(r.usekineo_urls, [KINEO_URL]) && igual(r.competitors_mentioned, ['Seedance'])
})
await check('A6 nomeada sem link: menciona, não cita ("usekineo.com" escrito sem protocolo é nome, não link)', () => {
  const r = A('You can also try Kineo (usekineo.com), which makes faceless Shorts.', [])
  const r2 = A('KineoAI makes Shorts.', [])
  return r.mentions_kineo === true && r.cites_usekineo === false && igual(r.usekineo_urls, []) && r2.mentions_kineo === true
})
await check('A7 URL solta no texto e subdomínio contam como citação; mesma página com e sem utm/fragmento conta 1 vez', () => {
  const r = A('Start at https://www.usekineo.com/studio. Or https://www.usekineo.com/studio?utm_source=openai#top', ['https://app.usekineo.com/x?utm_source=chatgpt.com'])
  return r.cites_usekineo === true && igual(r.usekineo_urls, ['https://app.usekineo.com/x', 'https://www.usekineo.com/studio']) && r.mentions_kineo === false
})
await check('A8 domínio mais específico vence: dreamina.capcut.com é Dreamina, não CapCut', () => igual(A('Options below.', ['https://dreamina.capcut.com/ai-tool/video']).competitors_mentioned, ['Dreamina']))
await check('A9 entrada inválida nunca lança e devolve tudo falso/vazio', () => {
  const vazio = { mentions_kineo: false, cites_usekineo: false, usekineo_urls: [], competitors_mentioned: [] }
  return [A(null, null), A(42, 'x'), A('', [null, 5, 'notaurl', 'javascript:alert(1)', 'ftp://usekineo.com/x']), A(undefined, undefined)].every((r) => igual(r, vazio))
})
await check('A10 lista de concorrentes: nomes únicos, ≥ 1 padrão cada, nenhum regex com a flag g, os 12 do fundador no topo', () => {
  const C = L.GEO_COMPETITORS
  const nomes = C.map((c) => c.name)
  const fundador = ['InVideo', 'Pictory', 'CapCut', 'Revid', 'Fliki', 'Synthesia', 'HeyGen', 'Higgsfield', 'Pika', 'Runway', 'Kling', 'Veo']
  return new Set(nomes).size === nomes.length && C.every((c) => c.patterns.length > 0 && c.patterns.every((re) => re instanceof RegExp && !re.global)) && igual(nomes.slice(0, 12), fundador) &&
    C.every((c) => c.hosts.every((h) => h === h.toLowerCase() && !h.startsWith('www.')))
})
await check('A11 flattenResponseOutput junta o texto, as URLs das anotações e conta as buscas; entrada inválida = vazio', () => {
  const f = L.flattenResponseOutput([
    { type: 'web_search_call', id: 'ws', status: 'completed' },
    { type: 'message', content: [{ type: 'output_text', text: 'a', annotations: [{ type: 'url_citation', url: 'https://x.com/1' }, { type: 'file_citation', file_id: 'f' }] }, { type: 'output_text', text: 'b', annotations: [{ type: 'url_citation', url: 'https://y.com/2' }] }] },
  ])
  const v = L.flattenResponseOutput(null)
  return f.text === 'a\nb' && igual(f.urls, ['https://x.com/1', 'https://y.com/2']) && f.searches === 1 && v.text === '' && v.urls.length === 0 && v.searches === 0
})
await check('A12 semana = segunda 00:00 UTC (a mesma do date_trunc(\'week\') do Postgres)', () =>
  L.geoWeekStart(Date.parse('2026-10-08T15:00:00Z')) === '2026-10-05' && L.geoWeekStart(Date.parse('2026-10-12T12:00:00Z')) === '2026-10-12' && L.geoWeekStart(Date.parse('2026-10-11T23:59:59Z')) === '2026-10-05')
await check('A13 custo: teto de uma rodada cheia < US$ 0,50 (centavos), 12 buscas a US$ 0,025 + tokens', () =>
  L.estimateGeoUsd({ searches: 12, inputTokens: 12_000, outputTokens: 7_200 }) === 0.3163 && L.geoCostCeilingUsd(12) === 0.3163 && L.geoCostCeilingUsd(12) < 0.5)

// ═══ mundo falso para EXECUTAR a rota ══════════════════════════════════════════════════════════════════════════════
const SEGREDO = 'segredo-de-teste-geo'
const ENV_OK = { CRON_SECRET: SEGREDO, NEXT_PUBLIC_SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_ROLE_KEY: 'svc-falso', OPENAI_API_KEY: 'sk-falso' }
const FRESH = () => {}
const resposta = (texto, urls) => ({
  status: 'completed',
  output: [
    { type: 'web_search_call', id: 'ws_1', status: 'completed' },
    { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: texto, annotations: urls.map((url) => ({ type: 'url_citation', url, title: 't', start_index: 0, end_index: 1 })) }] },
  ],
  usage: { input_tokens: 400, output_tokens: 250 },
})
const respostaPara = (pergunta) => {
  if (pergunta === 'is Seedance 1.5 free') return resposta('Yes on some sites: **Kineo** gives a free 15 s film ([usekineo.com](https://www.usekineo.com/ai-video-generator/seedance?utm_source=openai)).', ['https://www.usekineo.com/ai-video-generator/seedance?utm_source=openai'])
  if (pergunta === 'kineo ai video') return resposta('Kineo turns articles into videos ([kineo.studio](https://kineo.studio/?utm_source=openai)).', ['https://kineo.studio/?utm_source=openai'])
  return resposta('Try InVideo AI or CapCut ([invideo.io](https://invideo.io/?utm_source=openai)).', ['https://invideo.io/?utm_source=openai'])
}
function fakeOpenai({ falhar = {}, atraso = 0 } = {}) {
  const calls = []
  let emVoo = 0
  let maxEmVoo = 0
  const openai = {
    responses: {
      create: async (params, opts) => {
        calls.push({ params, opts })
        emVoo++
        maxEmVoo = Math.max(maxEmVoo, emVoo)
        try {
          await new Promise((r) => setTimeout(r, atraso))
          const f = falhar[params.input]
          if (f === '429') { const e = new Error('Rate limit reached'); e.status = 429; throw e }
          if (f === 'timeout') { const e = new Error('Request timed out.'); e.name = 'APIConnectionTimeoutError'; throw e }
          if (f === 'vazia') return { status: 'incomplete', output: [{ type: 'web_search_call', id: 'ws', status: 'completed' }], usage: { input_tokens: 100, output_tokens: 0 } }
          return respostaPara(params.input)
        } finally {
          emVoo--
        }
      },
    },
  }
  return { openai, calls, maxEmVoo: () => maxEmVoo }
}
function fakeDb({ insertFalha = null } = {}) {
  const rows = []
  const ops = []
  const clients = []
  const ids = new Set()
  const createClient = (url, key, opts) => {
    clients.push({ url, key, opts })
    return {
      from: (table) => ({
        insert: async (row) => {
          ops.push({ op: 'insert', table, row })
          if (insertFalha) return { data: null, error: { code: insertFalha, message: 'falha falsa' } }
          if (row.id && ids.has(row.id)) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "events_pkey"' } }
          if (row.id) ids.add(row.id)
          rows.push({ table, ...row })
          return { data: null, error: null }
        },
        update: (patch) => ({
          eq: async (col, val) => {
            ops.push({ op: 'update', table, patch, col, val })
            const r = rows.find((x) => x.table === table && x[col] === val)
            if (r) Object.assign(r, patch)
            return { data: null, error: null }
          },
        }),
        select: () => { throw new Error('a rota não lê o banco') },
      }),
    }
  }
  return { rows, ops, clients, createClient }
}
function rota({ db, oa, lib }) {
  const stubs = {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    '@supabase/supabase-js': { createClient: db.createClient },
    '@/lib/lifecycle/freshFetch': { freshFetch: FRESH },
    '@/lib/openai': { openai: oa.openai },
  }
  if (lib) stubs['@/lib/geo/citationMonitor'] = lib
  return makeLoader(stubs)(F.rota)
}
const pedido = (path, auth) => ({ nextUrl: new URL(`https://www.usekineo.com${path}`), headers: { get: (k) => (String(k).toLowerCase() === 'authorization' ? auth ?? null : null) } })
async function chamar({ path, auth = `Bearer ${SEGREDO}`, env = ENV_OK, db = fakeDb(), oa = fakeOpenai(), lib } = {}) {
  const antes = {}
  for (const k of Object.keys(ENV_OK)) { antes[k] = process.env[k]; delete process.env[k] }
  Object.assign(process.env, env)
  try {
    const res = await rota({ db, oa, lib }).GET(pedido(path, auth))
    return { res, db, oa }
  } finally {
    for (const k of Object.keys(ENV_OK)) { if (antes[k] === undefined) delete process.env[k]; else process.env[k] = antes[k] }
  }
}
const checks = (db) => db.rows.filter((r) => r.name === L.GEO_CHECK_EVENT)
const resumos = (db) => db.rows.filter((r) => r.name === L.GEO_SUMMARY_EVENT)
const REAL = `${L.GEO_ROUTE_PATH}?confirm=SEND`
const perguntas20 = Array.from({ length: 20 }, (_, i) => ({ id: `q${i + 1}`, text: `question number ${i + 1}` }))

// ═══ B. O TETO DE 12 CHAMADAS ═══════════════════════════════════════════════════════════════════════════════════════
await check('B1 teto = 12; a lista fixa tem de 10 a 12 perguntas em inglês, ids e textos únicos, com os 8 exemplos do fundador', () => {
  const Q = L.GEO_QUESTIONS
  const fundador = ['best AI video generator for YouTube Shorts', 'is Seedance 1.5 free', 'free AI video generator from text', 'faceless AI video generator', 'Kling 3 online', 'Seedance 2.5 online', 'AI video generator with narration and captions', 'kineo ai video']
  return L.GEO_MAX_CALLS_PER_RUN === 12 && Q.length >= 10 && Q.length <= 12 && new Set(Q.map((q) => q.id)).size === Q.length && new Set(Q.map((q) => q.text)).size === Q.length &&
    Q.every((q) => /^[a-z0-9-]+$/.test(q.id) && /^[\x20-\x7E]+$/.test(q.text)) && fundador.every((t) => Q.some((q) => q.text === t))
})
await check('B2 geoPlan corta qualquer lista no teto (20 → 12)', () => L.geoPlan(perguntas20).length === 12 && L.geoPlan(L.GEO_QUESTIONS).length === L.GEO_QUESTIONS.length)
const real = await chamar({ path: REAL })
await check('B3 rodada real com a lista fixa: 1 chamada por pergunta (≤ 12), modelo/ferramenta/saída pequena/maxRetries 0/timeout em CADA chamada', () => {
  const c = real.oa.calls
  return real.res.status === 200 && c.length === L.GEO_QUESTIONS.length && c.length <= 12 && c.every(({ params, opts }) =>
    params.model === L.GEO_MODEL && params.tools?.length === 1 && params.tools[0].type === 'web_search_preview' && params.tool_choice?.type === 'web_search_preview' &&
    params.store === false && params.max_output_tokens === L.GEO_MAX_OUTPUT_TOKENS && params.max_output_tokens <= 800 && params.instructions === L.GEO_INSTRUCTIONS &&
    opts?.maxRetries === 0 && typeof opts?.timeout === 'number' && opts.timeout > 0 && opts.timeout <= 60_000)
})
await check('B4 com 20 perguntas na lista: 12 chamadas, 12 eventos de pergunta', async () => {
  const r = await chamar({ path: REAL, lib: { ...L, GEO_QUESTIONS: perguntas20 } })
  return r.res.status === 200 && r.oa.calls.length === 12 && checks(r.db).length === 12 && r.res.body.calls === 12
})
await check('B5 mesmo com o plano SEM corte (20), o contador barra a 13ª antes de gastar: 12 chamadas, 8 eventos call_cap', async () => {
  const r = await chamar({ path: REAL, lib: { ...L, GEO_QUESTIONS: perguntas20, geoPlan: (q) => q.slice() } })
  const capped = checks(r.db).filter((x) => x.metadata.ok === false && x.metadata.error === 'call_cap')
  return r.oa.calls.length === 12 && checks(r.db).length === 20 && capped.length === 8
})
await check('B6 orçamento de tempo: ceil(12 / paralelo) × timeout ≤ orçamento da rodada < maxDuration da rota', () => {
  const md = Number((ROTA_SRC.match(/^export const maxDuration = (\d+)$/m) ?? [])[1])
  const pior = Math.ceil(L.GEO_MAX_CALLS_PER_RUN / L.GEO_CONCURRENCY) * L.GEO_CALL_TIMEOUT_MS
  return md > 0 && L.GEO_CONCURRENCY >= 1 && pior <= L.GEO_RUN_BUDGET_MS && L.GEO_RUN_BUDGET_MS < md * 1000
})
await check('B7 paralelismo de verdade e limitado: nunca mais de GEO_CONCURRENCY chamadas no ar', async () => {
  const oa = fakeOpenai({ atraso: 5 })
  const r = await chamar({ path: REAL, oa })
  return r.res.status === 200 && oa.maxEmVoo() > 1 && oa.maxEmVoo() <= L.GEO_CONCURRENCY
})
await check('B8 uma pergunta que falha não derruba as outras (429, timeout e resposta vazia viram ok:false; 9 seguem)', async () => {
  const oa = fakeOpenai({ falhar: { 'Kling 3 online': '429', 'Veo 3.1 online': 'timeout', 'Seedance 2.5 online': 'vazia' } })
  const r = await chamar({ path: REAL, oa })
  const ev = checks(r.db)
  const erro = (t) => ev.find((x) => x.metadata.question === t)?.metadata.error
  return r.res.status === 200 && oa.calls.length === 12 && ev.length === 12 && ev.filter((x) => x.metadata.ok === true).length === 9 &&
    erro('Kling 3 online') === 'openai_429' && erro('Veo 3.1 online') === 'timeout' && erro('Seedance 2.5 online') === 'empty_incomplete' &&
    r.res.body.answered === 9 && r.res.body.failed === 3
})
await check('B9 1 rodada por semana: a 2ª chamada na mesma semana não chama a OpenAI nem grava; force=1 roda de novo', async () => {
  const db = fakeDb()
  await chamar({ path: REAL, db })
  const n = db.rows.length
  const oa2 = fakeOpenai()
  const r2 = await chamar({ path: REAL, db, oa: oa2 })
  const oa3 = fakeOpenai()
  const r3 = await chamar({ path: `${REAL}&force=1`, db, oa: oa3 })
  return n === L.GEO_QUESTIONS.length + 1 && r2.res.status === 200 && r2.res.body.skipped === 'already_ran_this_week' && oa2.calls.length === 0 &&
    r3.res.status === 200 && oa3.calls.length === L.GEO_QUESTIONS.length && resumos(db).length === 2
})
await check('B10 banco fora do ar na trava: 503 e NENHUMA chamada paga', async () => {
  const r = await chamar({ path: REAL, db: fakeDb({ insertFalha: '08006' }) })
  return r.res.status === 503 && r.oa.calls.length === 0
})
await check('B11 sem OPENAI_API_KEY: 500 antes de gravar a trava da semana', async () => {
  const env = { ...ENV_OK }
  delete env.OPENAI_API_KEY
  const r = await chamar({ path: REAL, env })
  return r.res.status === 500 && r.oa.calls.length === 0 && r.db.ops.length === 0
})

// ═══ C. A ENTRADA DO vercel.json DISPARA DE VERDADE ═════════════════════════════════════════════════════════════════
const crons = JSON.parse(rd(F.vercel)).crons ?? []
const meus = crons.filter((c) => String(c.path).split('?')[0] === L.GEO_ROUTE_PATH)
const tokens = [...new Set([...ROTA_SRC.matchAll(/get\(\s*'confirm'\s*\)\s*===\s*'([A-Z_]+)'/g)].map((m) => m[1]))]
await check('C1 exatamente UMA entrada do monitor no vercel.json, e a rota existe no caminho dela', () => meus.length === 1 && L.GEO_ROUTE_PATH === '/api/cron/geo-citation-monitor' && existsSync(join(RAIZ, `app${L.GEO_ROUTE_PATH}/route.ts`)))
await check('C2 agenda semanal: segunda-feira 12:00 UTC ("0 12 * * 1")', () => meus.length === 1 && meus[0].schedule === '0 12 * * 1')
await check('C3 o path do cron carrega o token que a rota exige para a rodada real (lido da rota, como no test-cron-dryrun-eterno)', () =>
  meus.length === 1 && tokens.length === 1 && new URL(`https://x${meus[0].path}`).searchParams.get('confirm') === tokens[0])
await check('C4 a rota chamada com o path EXATO do vercel.json e o cabeçalho da Vercel faz a rodada real e grava', async () => {
  if (meus.length !== 1) return false
  const r = await chamar({ path: meus[0].path })
  const s = resumos(r.db)
  return r.res.status === 200 && r.res.body.dry_run === false && r.oa.calls.length === L.GEO_QUESTIONS.length && checks(r.db).length === L.GEO_QUESTIONS.length &&
    s.length === 1 && s[0].metadata.status === 'done' && s[0].metadata.answered === L.GEO_QUESTIONS.length
})
await check('C5 sem o token, a mesma rota só ensaia: plano devolvido, zero chamada, zero banco', async () => {
  const r = await chamar({ path: L.GEO_ROUTE_PATH })
  return r.res.status === 200 && r.res.body.dry_run === true && r.res.body.planned === L.GEO_QUESTIONS.length && r.res.body.questions.length === L.GEO_QUESTIONS.length &&
    r.oa.calls.length === 0 && r.db.clients.length === 0 && r.db.ops.length === 0
})

// ═══ D. AUTENTICAÇÃO ═════════════════════════════════════════════════════════════════════════════════════════════════
const negado = (r) => r.res.status === 401 && r.oa.calls.length === 0 && r.db.clients.length === 0 && r.db.ops.length === 0
await check('D1 sem cabeçalho Authorization: 401, nenhuma chamada, nenhuma escrita', async () => negado(await chamar({ path: REAL, auth: null })))
await check('D2 segredo errado: 401', async () => negado(await chamar({ path: REAL, auth: 'Bearer outro-segredo' })))
await check('D3 falha fechada: sem CRON_SECRET, nem "Bearer undefined" nem "Bearer " passam', async () => {
  const env = { ...ENV_OK }
  delete env.CRON_SECRET
  return negado(await chamar({ path: REAL, env, auth: 'Bearer undefined' })) && negado(await chamar({ path: REAL, env, auth: 'Bearer ' })) && negado(await chamar({ path: REAL, env, auth: null }))
})
await check('D4 segredo certo: 200 (o mesmo cabeçalho que a Vercel manda)', () => real.res.status === 200 && real.res.body.ok === true)

// ═══ E. O QUE A RODADA GRAVA, E QUEM PODE GRAVAR ═══════════════════════════════════════════════════════════════════
await check('E1 1 evento geo_citation_check por pergunta + 1 geo_citation_summary com os totais; sem session_id/user_id (não é presença)', () => {
  const ev = checks(real.db)
  const s = resumos(real.db)
  const kineo = ev.find((x) => x.metadata.question === 'is Seedance 1.5 free')?.metadata
  const marca = ev.find((x) => x.metadata.question === 'kineo ai video')?.metadata
  return ev.length === L.GEO_QUESTIONS.length && s.length === 1 && real.db.rows.every((x) => x.path === L.GEO_ROUTE_PATH && !x.session_id && !x.user_id) &&
    ev.every((x) => x.metadata.ok === true && typeof x.metadata.question_id === 'string' && typeof x.metadata.mentions_kineo === 'boolean' && typeof x.metadata.cites_usekineo === 'boolean' && Array.isArray(x.metadata.competitors_mentioned) && x.metadata.week === s[0].metadata.week) &&
    kineo?.mentions_kineo === true && kineo?.cites_usekineo === true && igual(kineo?.usekineo_urls, [KINEO_URL]) &&
    marca?.mentions_kineo === false && marca?.competitors_mentioned.includes('kineo.studio (homônimo)') &&
    s[0].metadata.mentions_kineo === 1 && s[0].metadata.cites_usekineo === 1 && s[0].metadata.calls === L.GEO_QUESTIONS.length && s[0].metadata.est_usd > 0 && s[0].metadata.est_usd < 0.5
})
await check('E2 o banco é aberto com freshFetch (regra de cron novo: leitura nunca vem de cache)', () =>
  real.db.clients.length === 1 && real.db.clients[0].opts?.global?.fetch === FRESH && /^export const fetchCache = 'force-no-store'$/m.test(ROTA_SRC))
await check('E3 o navegador não cunha a medição: os dois nomes estão no SERVER_ONLY_EVENTS do sink /api/events', () => {
  const src = rd(F.sink)
  const i = src.indexOf('const SERVER_ONLY_EVENTS = new Set([')
  if (i < 0) return false
  const literal = src.slice(src.indexOf('[', i), src.indexOf('])', i) + 1).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
  const set = new Set(Function(`"use strict"; return (${literal})`)())
  return set.size > 100 && set.has(L.GEO_CHECK_EVENT) && set.has(L.GEO_SUMMARY_EVENT)
})
await check('E4 instruções ao modelo neutras (sem a marca): a medição não empurra a Kineo', () => !/kineo/i.test(L.GEO_INSTRUCTIONS) && L.GEO_INSTRUCTIONS.length > 40)
await check('E5 a consulta semanal lê geo_citation_check e só chaves de metadata que a rota grava de verdade', () => {
  const sql = rd(F.sql)
  const chaves = [...new Set([...sql.matchAll(/metadata\s*->>?\s*'([a-z_]+)'/g)].map((m) => m[1]))]
  const gravadas = new Set([...checks(real.db), ...resumos(real.db)].flatMap((x) => Object.keys(x.metadata)))
  return /name\s*=\s*'geo_citation_check'/.test(sql) && ['week', 'question_id', 'ok', 'mentions_kineo', 'cites_usekineo'].every((k) => chaves.includes(k)) && chaves.every((k) => gravadas.has(k))
})

console.log(falhas.length ? `\n✗ ${falhas.length} falha(s):\n  - ${falhas.join('\n  - ')}` : '')
console.log(`\n${falhas.length === 0 ? '✅' : '❌'} geo-citation-monitor: ${ok} verificações ok, ${falhas.length} falhas`)
process.exit(falhas.length ? 1 : 0)
