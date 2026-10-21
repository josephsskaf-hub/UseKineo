// KINEO-MCP-DESENHO-2110 — contrato offline do formato cartoon no conector Kineo Studio.
// Executa o dispatcher e studioTools REAIS, com banco, sessão e as duas rotas em memória.
// Zero credencial, rede, banco, OpenAI, fal ou render. Mutantes são cópias em pasta temporária,
// executadas por subprocessos: cada mutante precisa deixar a MESMA prova funcional vermelha.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import { execFileSync, spawnSync } from 'node:child_process'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  MARCA_MCP_DESENHO_2110 as MARK, MCP_DESENHO_2110_BASE as BASE,
  MCP_DESENHO_2110_ARQUIVOS, MCP_DESENHO_2110_NOVOS, semMcpDesenho2110,
} from './test-support/desfaz-mcp-desenho-2110.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OVERLAY = process.env.KINEO_TEST_CARTOON_OVERLAY || null
const PROBE = process.argv.includes('--probe')
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const raw = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (rel) => { try { return lf(git('show', `${BASE}:${rel}`)) } catch { return null } }
let pass = 0, fail = 0
const ok = (condition, name) => { condition ? pass++ : fail++; console.log(`${condition ? '  ok  ' : '  FAIL '}${name}`) }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Qualquer fuga do I/O injetado falha imediatamente, inclusive em subprocessos mutantes.
const denyNetwork = () => { throw new Error('KINEO-MCP-DESENHO-2110: external network forbidden') }
globalThis.fetch = denyNetwork
http.request = http.get = https.request = https.get = net.connect = net.createConnection = denyNetwork
const pick = (abs) => [abs, abs + '.ts', abs + '.tsx', path.join(abs, 'index.ts')].find((p) => fs.existsSync(p) && fs.statSync(p).isFile())
registerHooks({
  resolve(specifier, context, nextResolve) {
    let abs = null
    if (specifier.startsWith('@/')) abs = path.join(ROOT, specifier.slice(2))
    else if (/^\.\.?\//.test(specifier) && context.parentURL?.startsWith('file:') && context.parentURL.includes('/lib/')) abs = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
    if (abs) {
      const rel = path.relative(ROOT, abs)
      const overlay = OVERLAY && !rel.startsWith('..') ? pick(path.join(OVERLAY, rel)) : null
      const target = overlay || pick(abs)
      if (target) return { url: pathToFileURL(target).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const load = (rel) => import(pathToFileURL(OVERLAY && fs.existsSync(path.join(OVERLAY, rel)) ? path.join(OVERLAY, rel) : path.join(ROOT, rel)).href)
const M = await load('lib/mcp/studioMcp.ts')
const T = await load('lib/mcp/studioTools.ts')
const K = await load('lib/kidsCartoon/kidsCartoon.ts')
const E = await load('lib/credits/engineCost.ts')
const C = await load('lib/cinematic/claim.ts')
const USER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const ORIGIN = 'https://studio.test.invalid'
const PUBLIC = 'https://www.usekineo.com'
const STORY = 'Leo finds a little seed and plants it beside the garden. He shares water with his friends and smiles when a tiny green leaf appears.'

function world() {
  const tables = { profiles: [{ id: USER, plan: 'pro', video_credits: 100, has_paid: true }], mcp_studio_jobs: [], events: [], videos: [] }
  const clock = { t: Date.parse('2026-10-21T12:00:00Z') }
  const posts = [], reads = [], writes = []
  const ledger = { credits: 100, debits: new Set() }
  const stats = { mint: 0, dispose: 0, create: 0 }
  let storyAnswer = () => json(200, { script: STORY })
  let cinematicAnswer = (body) => {
    if (!ledger.debits.has(body.generationId)) { ledger.debits.add(body.generationId); ledger.credits -= E.creditCostForDuration('cinematic_ai', true, body.duration) }
    setClaim(body.generationId, 'settled')
    return json(200, { credits_charged: E.creditCostForDuration('cinematic_ai', true, body.duration), falRequestIds: ['fake-scene'] })
  }
  const get = (row, col) => col.includes('->>') ? String(row[col.split('->>')[0]]?.[col.split('->>')[1]] ?? '') : row[col] ?? null
  function from(table) {
    const state = { filters: [], op: 'select', single: false, head: false, columns: null, order: null, limit: null }
    const matches = (row) => state.filters.every(([op, col, value]) => {
      const actual = get(row, col)
      if (op === 'eq') return actual !== null && String(actual) === String(value)
      if (op === 'is') return actual === value
      if (op === 'in') return value.map(String).includes(String(actual))
      if (op === 'gte') return actual !== null && String(actual) >= String(value)
      return false
    })
    const run = () => {
      const rows = tables[table] ??= []
      if (state.op === 'insert') {
        if (state.row.idempotency_key && rows.some((r) => r.user_id === state.row.user_id && r.idempotency_key === state.row.idempotency_key)) return { data: null, error: { message: 'duplicate' } }
        const row = { id: `row-${writes.length}`, created_at: new Date(clock.t).toISOString(), ...state.row }
        rows.push(row); writes.push({ table, row }); return { data: null, error: null }
      }
      if (state.op === 'update') { for (const row of rows.filter(matches)) Object.assign(row, state.patch); writes.push({ table, patch: state.patch }); return { data: null, error: null } }
      reads.push({ table, filters: state.filters.slice() })
      let hit = rows.filter(matches)
      if (state.order) { const [col, ascending] = state.order; hit = hit.slice().sort((a, b) => String(get(a, col)).localeCompare(String(get(b, col))) * (ascending ? 1 : -1)) }
      if (state.limit !== null) hit = hit.slice(0, state.limit)
      const projected = state.columns && state.columns !== '*' ? hit.map((row) => Object.fromEntries(state.columns.split(',').map((col) => [col.trim(), row[col.trim()]]))) : hit
      return state.head ? { count: hit.length, error: null } : { data: state.single ? projected[0] ?? null : projected, error: null }
    }
    const q = {
      select(cols, opts) { state.columns = cols; state.head = opts?.head === true; return q },
      eq(col, val) { state.filters.push(['eq', col, val]); return q },
      is(col, val) { state.filters.push(['is', col, val]); return q },
      in(col, val) { state.filters.push(['in', col, val]); return q },
      gte(col, val) { state.filters.push(['gte', col, val]); return q },
      order(col, opts) { state.order = [col, opts?.ascending !== false]; return q },
      limit(n) { state.limit = n; return q },
      maybeSingle() { state.single = true; return q }, single() { state.single = true; return q },
      insert(row) { state.op = 'insert'; state.row = row; return q },
      update(patch) { state.op = 'update'; state.patch = patch; return q },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
    }
    return q
  }
  function json(status, data) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } }) }
  function setClaim(gen, status) {
    const current = tables.events.find((row) => row.name === C.CINEMATIC_CLAIM_EVENT && row.session_id === gen)
    if (current) current.metadata.status = status
    else tables.events.push({ id: C.cinematicClaimId(USER, gen), name: C.CINEMATIC_CLAIM_EVENT, user_id: USER, session_id: gen, metadata: { status }, created_at: new Date(clock.t).toISOString() })
  }
  const ctx = { db: { from }, userId: USER, email: 'external@example.invalid', origin: ORIGIN, publicOrigin: PUBLIC }
  const io = {
    mint: async (user, email) => { stats.mint++; if (user !== USER || email !== ctx.email) throw new Error('wrong session owner'); return { ok: true, session: { cookie: 'sb-test-auth-token=fake-cookie', accessToken: 'fake-access', dispose: async () => { stats.dispose++ } } } },
    fetch: async (url, init) => {
      const body = JSON.parse(init.body)
      const pathname = new URL(url).pathname
      posts.push({ url, pathname, init, body })
      if (new URL(url).origin !== ORIGIN || init.method !== 'POST') throw new Error('unexpected route')
      if (pathname === '/api/kids-cartoon/story') return storyAnswer(body)
      if (pathname === '/api/generate-video-cinematic') return cinematicAnswer(body)
      throw new Error(`unexpected path: ${pathname}`)
    },
    now: () => clock.t,
    sleep: async (ms) => { clock.t += ms },
  }
  const deps = {
    user: { id: USER, email: ctx.email }, pausedEngines: [], plansUrl: `${PUBLIC}/pricing?utm_source=claude_studio_connector`,
    counts: async () => ({ toolCallsLastHour: 0, createsLastHour: 0, activeJobs: 0 }),
    balance: () => T.studioBalance(ctx), account: () => T.studioAccount(ctx, deps.pausedEngines),
    createVideo: async (input, estimate) => { stats.create++; return T.studioCreateVideo(ctx, input, estimate, io) },
    videoStatus: (id) => T.studioVideoStatus(ctx, id, io), listVideos: (limit) => T.studioListVideos(ctx, limit),
  }
  const call = (name, args = {}) => M.handleStudioMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, deps)
  return { tables, posts, reads, writes, clock, ledger, stats, ctx, io, deps, call, json, setClaim,
    story(fn) { storyAnswer = fn }, cinematic(fn) { cinematicAnswer = fn },
  }
}
const cartoon = (extra = {}) => ({ format: 'cartoon', character: 'leo', story_idea: 'learns to share seeds with a little friend', language: 'en', duration: 15, ...extra })
const content = (r) => r.response?.result?.structuredContent
const succeeded = (r) => r.response?.result && r.response.result.isError !== true

// A. Catálogo, schema e validação passam pelo mesmo contrato do template.
const tools = M.buildStudioTools({ pausedEngines: [] })
const create = tools.find((t) => t.name === 'kineo_create_video')
const accountTool = tools.find((t) => t.name === 'kineo_account')
ok(create?.inputSchema.properties.format.enum.includes('cartoon') && same(create.inputSchema.properties.character.enum, K.KIDS_CHARACTERS.map((c) => c.id)) && create.inputSchema.properties.story_idea.type === 'string', 'A1 schema anuncia cartoon, seis personagens e story_idea')
ok(create?.description.includes('3D kids cartoon story with the same character in every scene') && accountTool?.description.includes('cartoon'), 'A2 tools descrevem o desenho em inglês')
for (const character of K.KIDS_CHARACTERS.map((c) => c.id)) for (const language of K.KIDS_CARTOON_LANGUAGES) for (const duration of K.KIDS_CARTOON_DURATIONS) {
  const v = M.validateCreateInput(cartoon({ character, language, duration }), [])
  ok(v.ok && v.value.format === 'cartoon' && v.value.cartoon?.character === character && v.value.cartoon?.language === language && v.value.cartoon?.duration === duration && v.value.engine === K.KIDS_CARTOON_ENGINE && v.value.aspect === '9:16' && v.value.scriptMode === 'verbatim', `A3 ${character}/${language}/${duration}: normalizado no produto infantil`)
}
for (const language of K.KIDS_CARTOON_LANGUAGES) for (const blank of [undefined, '', '  ']) {
  const v = M.validateCreateInput(cartoon({ story_idea: blank, language }), [])
  const expected = K.validateKidsCartoonRequest({ character: 'leo', language, duration: 15, ideaId: K.KIDS_IDEAS[0].id })
  ok(v.ok && expected.ok && same(v.value.cartoon, expected.value), `A4 ideia vazia usa pronta na língua ${language} (${String(blank)})`)
}
for (const invalid of [
  { character: 'unknown' }, { character: undefined }, { language: 'fr' }, { language: 'pt-BR' }, { language: null }, { duration: null }, { duration: 30 }, { duration: 60 },
  { story_idea: 'https://example.invalid/story' }, { story_idea: 'short' }, { story_idea: 'x'.repeat(K.KIDS_IDEA_MAX_CHARS + 1) },
  { story_idea: 12 }, { engine: 'veo' }, { engine: 'kling' }, { aspect: '16:9' }, { script_mode: 'ai' }, { script: 'a bypass script' }, { idea: 'bypass idea' },
]) ok(!M.validateCreateInput(cartoon(invalid), []).ok, `A5 entrada recusada ${JSON.stringify(invalid).slice(0, 95)}`)
ok(!M.validateCreateInput(cartoon(), ['seedance']).ok, 'A6 Seedance pausado bloqueia cartoon')
{
  const v = M.validateCreateInput(cartoon({ title: '  Tiny garden  ', idempotency_key: 'cartoon-request-0001' }), [])
  ok(v.ok && v.value.title === 'Tiny garden' && v.value.idempotencyKey === 'cartoon-request-0001', 'A7 título e idempotência preservados')
}
for (const paused of [[], ['seedance']]) {
  const w = world(); w.deps.pausedEngines = paused
  const r = await w.call('kineo_account')
  const f = content(r)?.formats?.find((f) => f.format === 'cartoon')
  ok(succeeded(r) && f?.engine === K.KIDS_CARTOON_ENGINE && f.description === '3D kids cartoon story with the same character in every scene' && same(f.characters.map(({ id, name }) => ({ id, name })), K.KIDS_CHARACTERS.map(({ id, name }) => ({ id, name }))) && same(f.languages, [...K.KIDS_CARTOON_LANGUAGES]), `A8 account catálogo real (${paused.join() || 'ativo'})`)
  ok(f && same(f.durations, K.KIDS_CARTOON_DURATIONS.map((seconds) => ({ seconds, credits: E.creditCostForDuration('cinematic_ai', true, seconds) }))) && f.available === !paused.includes('seedance'), `A9 preço da fonte do site mesmo pausado (${paused.join() || 'ativo'})`)
}

// B. Despacho real: história -> cinematic, mesma sessão, regra infantil e saldo.
for (const language of K.KIDS_CARTOON_LANGUAGES) for (const duration of K.KIDS_CARTOON_DURATIONS) {
  const w = world(); const r = await w.call('kineo_create_video', cartoon({ language, duration }))
  ok(succeeded(r) && same(w.posts.map((p) => p.pathname), ['/api/kids-cartoon/story', '/api/generate-video-cinematic']), `B1 ${language}/${duration}: história antes do filme`)
  const [story, film] = w.posts
  const validated = M.validateCreateInput(cartoon({ language, duration }), [])
  ok(story && validated.ok && same(story.body, validated.value.cartoon) && film?.body.prompt === STORY && film.body.kids_cartoon === 'leo' && film.body.script_mode === 'verbatim' && film.body.engine === 'seedance' && film.body.duration === duration && film.body.language === language, `B2 ${language}/${duration}: roteiro/estilo/personagem sem reescrita`)
  ok(w.posts.length === 2 && w.posts.every((p) => new Headers(p.init.headers).get('cookie') === 'sb-test-auth-token=fake-cookie' && p.init.cache === 'no-store') && w.stats.mint === 1 && w.stats.dispose === 1 && w.tables.mcp_studio_jobs[0]?.user_id === USER && w.tables.mcp_studio_jobs[0]?.format === 'cartoon', `B3 ${language}/${duration}: mesma sessão e job da pessoa`)
  const cost = E.creditCostForDuration('cinematic_ai', true, duration)
  ok(content(r)?.credits_charged === cost && w.ledger.credits === 100 - cost && w.ledger.debits.size === 1, `B4 ${language}/${duration}: mesma cobrança da rota`)
}
for (const credits of [0, E.creditCostForDuration('cinematic_ai', true, 35) - 1]) {
  const w = world(); w.tables.profiles[0].video_credits = credits
  const r = await w.call('kineo_create_video', cartoon({ duration: 35 }))
  ok(!succeeded(r) && r.trace.refused === 'no_balance' && content(r)?.plans_url === w.deps.plansUrl && w.posts.length === 0 && w.stats.mint === 0 && w.stats.create === 0 && w.writes.length === 0, `B5 saldo ${credits}: planos antes da história e de qualquer cobrança`)
}
for (const [name, fn, readable] of [
  ['regra infantil', (w) => w.json(422, { error: K.KIDS_REFUSAL_MESSAGE.en, reason: 'kids_cartoon_content', script: STORY }), 'Kids cartoons must stay innocent'],
  ['moderação', (w) => w.json(422, { error: 'This story idea was refused by moderation. Try a gentle story.', reason: 'topic_moderation', script: STORY }), 'refused by moderation'],
  ['servidor 503', (w) => w.json(503, { error: 'Story writer unavailable. Try again soon.', script: STORY }), 'Story writer unavailable'],
  ['JSON inválido', () => new Response('{oops', { status: 200 }), null],
  ['sem roteiro', (w) => w.json(200, {}), null],
  ['roteiro vazio', (w) => w.json(200, { script: '   ' }), null],
  ['roteiro não string', (w) => w.json(200, { script: ['invalid'] }), null],
  ['roteiro acima do template', (w) => w.json(200, { script: 'x'.repeat(K.KIDS_HANDOFF_PROMPT_MAX_CHARS + 1) }), null],
  ['JSON null', (w) => w.json(200, null), null],
  ['JSON array', (w) => w.json(200, [{ script: STORY }]), null],
  ['falha transporte', () => { throw new Error('secret fake transport diagnostic') }, null],
]) {
  const w = world(); w.story(() => fn(w))
  const r = await w.call('kineo_create_video', cartoon())
  ok(!succeeded(r) && w.posts.length === 1 && w.posts[0].pathname === '/api/kids-cartoon/story' && w.tables.mcp_studio_jobs.length === 0 && w.ledger.debits.size === 0 && w.stats.dispose === 1, `B6 ${name}: nenhum cinematic/job/crédito e sessão encerrada`)
  ok(!succeeded(r) && /Nothing was charged|nothing was charged/.test(JSON.stringify(r.response?.result)) && (!readable || JSON.stringify(r.response?.result).includes(readable)) && !JSON.stringify(r.response?.result).includes('secret fake transport'), `B7 ${name}: recusa legível sem diagnóstico interno`)
}
{
  const w = world(); const r = await w.call('kineo_create_video', cartoon({ story_idea: '' }))
  const request = K.validateKidsCartoonRequest(w.posts[0]?.body)
  ok(succeeded(r) && w.posts[0]?.body.ideaId === K.KIDS_IDEAS[0].id && w.posts[0]?.body.idea === '' && request.ok && request.value.idea === K.KIDS_IDEAS[0].en && request.value.ideaId === K.KIDS_IDEAS[0].id, 'B8 ideia pronta passa pela MESMA rota de história e mantém sua atribuição')
}
{
  const w = world(); w.cinematic(() => w.json(402, { error: 'Not enough credits.', reason: 'insufficient_credits', balance: 0 }))
  const r = await w.call('kineo_create_video', cartoon())
  ok(!succeeded(r) && content(r)?.plans_url === w.deps.plansUrl && w.tables.mcp_studio_jobs.length === 0 && w.stats.dispose === 1, 'B9 saldo negado na rota também devolve planos')
}

// C. O corpo salvo/retransmitido mantém personagem e roteiro sem escrever outra história.
{
  const w = world(); let filmPosts = 0
  w.cinematic((b) => { filmPosts++; w.setClaim(b.generationId, 'done'); return w.json(503, { pending: true, retry_after_ms: 1000 }) })
  const args = cartoon({ character: 'ollie', idempotency_key: 'cartoon-replay-0001', title: 'Ollie garden' })
  const first = await w.call('kineo_create_video', args)
  const job = w.tables.mcp_studio_jobs[0]
  const original = w.posts.find((p) => p.pathname === '/api/generate-video-cinematic')?.body
  ok(!succeeded(first) && job?.dispatch?.replay && same(job.dispatch.replay, original) && original?.kids_cartoon === 'ollie' && original.prompt === STORY && filmPosts === T.STUDIO_PENDING_REPLAYS + 1, 'C1 pending salva/reenvia o mesmo roteiro e personagem')
  w.clock.t += T.STUDIO_STATUS_REPLAY_AFTER_MS + 1000
  w.cinematic((b) => { filmPosts++; w.setClaim(b.generationId, 'settled'); return w.json(200, { credits_charged: E.creditCostForDuration('cinematic_ai', true, 15) }) })
  const status = await w.call('kineo_video_status', { job_id: job?.generation_id || 'missing-job' })
  const again = await w.call('kineo_create_video', args)
  ok(succeeded(status) && content(status)?.reconnected === true && filmPosts === T.STUDIO_PENDING_REPLAYS + 2 && succeeded(again) && content(again)?.reused === true && w.posts.filter((p) => p.pathname === '/api/kids-cartoon/story').length === 1 && w.posts.filter((p) => p.pathname === '/api/generate-video-cinematic').every((p) => same(p.body, original)), 'C2 status/idempotência reutilizam corpo, sem nova história')
}
{
  const w = world(); const r = await w.call('kineo_create_video', cartoon({ title: 'The seed' }))
  const gen = content(r)?.job_id
  w.tables.events.push({ id: 'compose-test', user_id: USER, name: 'compose_submission_claim', session_id: gen, metadata: { render_id: 'render-own' } })
  w.tables.videos.push({ id: 'video-own', user_id: USER, render_id: 'render-own', title: null, status: 'completed', video_url: 'https://video.invalid/own.mp4', created_at: new Date(w.clock.t).toISOString(), duration: 15 })
  w.tables.videos.push({ id: 'video-other', user_id: OTHER, render_id: 'render-other', title: 'Other account', status: 'completed', video_url: 'https://video.invalid/other.mp4', created_at: new Date(w.clock.t + 1000).toISOString() })
  const status = await w.call('kineo_video_status', { job_id: gen })
  const list = await w.call('kineo_list_videos', { limit: 5 })
  ok(succeeded(status) && content(status)?.status === 'completed' && content(status)?.video_url === 'https://video.invalid/own.mp4' && w.tables.videos[0].title === 'The seed', 'C3 status do cartoon pronto entrega vídeo/título da conta')
  ok(succeeded(list) && !JSON.stringify(content(list)).includes('Other account') && JSON.stringify(content(list)).includes('video-own') && w.reads.every((q) => q.filters.some(([, col, value]) => (col === 'user_id' || col === 'id') && value === USER)), 'C4 biblioteca e leituras continuam escopadas pela pessoa')
}
{
  const w = world(); const r = await w.call('kineo_create_video', { format: 'film', script: 'A gentle landscape.', duration: 15 })
  ok(succeeded(r) && w.posts.length === 1 && w.posts[0].pathname === '/api/generate-video-cinematic' && !('kids_cartoon' in w.posts[0].body), 'C5 filme comum conserva o caminho anterior')
  for (const format of ['ugc_ad', 'product_ad', 'kids_cartoon']) {
    const x = world(); const r = await x.call('kineo_create_video', { format, idea: 'a gentle landscape' })
    ok(!succeeded(r) && r.trace.refused === 'format_not_available' && x.posts.length === 0, `C6 ${format} legado segue indisponível sem cobrar`)
  }
}

if (!PROBE) {
  // D. Escopo exato e desfaz encadeado, sem tocar /api/mcp nem o pipeline do site.
  const untouched = (rel, bytes = Buffer.from(raw(rel))) => bytes.equals(execFileSync('git', ['-C', ROOT, 'cat-file', '--filters', `${BASE}:${rel}`], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }))
  for (const rel of ['app/api/mcp/route.ts', 'lib/mcp/kineoMcp.ts', 'lib/mcp/chatgptContract.ts', 'app/api/kids-cartoon/story/route.ts', 'app/api/generate-video-cinematic/route.ts', 'lib/kidsCartoon/kidsCartoon.ts', 'lib/credits/engineCost.ts']) ok(base(rel) !== null && untouched(rel), `D1 ${rel} byte a byte (checkout com filtros Git)` )
  const changedByte = Buffer.from(raw('app/api/mcp/route.ts')); changedByte[0] ^= 1
  ok(!untouched('app/api/mcp/route.ts', changedByte), 'D1b um byte modificado no /api/mcp torna a comparação vermelha')
  for (const rel of MCP_DESENHO_2110_ARQUIVOS) {
    const text = raw(rel)
    ok(text.includes(MARK) && lf(semMcpDesenho2110(text, rel)) === base(rel) && semMcpDesenho2110(text.replace(/\r?\n/g, '\r\n'), rel) === base(rel)?.replace(/\n/g, '\r\n'), `D2 ${rel}: desfaz exato e preserva CRLF`)
  }
  for (const rel of MCP_DESENHO_2110_NOVOS) ok(base(rel) === null && raw(rel).includes(MARK), `D3 ${rel} novo marcado`)
  const changed = new Set([...git('diff', '--name-only', BASE).trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard').trim().split('\n')].filter(Boolean))
  const allowed = [...MCP_DESENHO_2110_ARQUIVOS, ...MCP_DESENHO_2110_NOVOS]
  ok([...changed].every((p) => allowed.includes(p)), `D4 diff só declarado (${[...changed].filter((p) => !allowed.includes(p)).join(', ') || 'ok'})`)
  const commits = git('log', '--format=%s', `${BASE}..HEAD`).trim().split('\n').filter(Boolean)
  ok(commits.every((s) => s.startsWith('KINEO-MCP-DESENHO-2110 [TRAVA 8.2 — vai do fundador 20/10 "quero vender via MCP via Claude e GPT"]')), 'D5 assuntos dos commits usam prefixo autorizado')
  const chain = raw('scripts/test-support/desfaz-mcp-studio-ajuste-2010.mjs')
  ok(/export function semMcpStudioAjuste2010\(texto, p\) \{\r?\n  texto = semMcpDesenho2110\(texto, p\)/.test(chain), 'D6 camada mais nova sai primeiro no ajuste do Studio')
  let threw = false
  try { semMcpDesenho2110(raw('scripts/test-mcp-studio-2010.mjs') + `\n// extra ${MARK}`, 'scripts/test-mcp-studio-2010.mjs') } catch { threw = true }
  ok(threw && semMcpDesenho2110('unchanged', 'other/file') === 'unchanged' && semMcpDesenho2110(null, 'lib/mcp/studioMcp.ts') === null, 'D7 acréscimo fora do contrato falha; fora do alvo é idempotente')

  // M. Mutantes reais em arquivos temporários, jamais no produto/working tree.
  const mutant = (name, rel, mutate, expectedFailure) => {
    const original = raw(rel)
    const mutated = mutate(original)
    if (mutated === original) { ok(false, `${name} âncora não aplicada`); return }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kineo-mcp-desenho-2110-'))
    try {
      for (const file of ['lib/mcp/studioMcp.ts', 'lib/mcp/studioTools.ts']) { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), file === rel ? mutated : raw(file)) }
      const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--probe'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, KINEO_TEST_CARTOON_OVERLAY: dir }, timeout: 60_000, maxBuffer: 2 << 20 })
      const output = `${result.stdout || ''}\n${result.stderr || ''}`
      ok(result.status !== 0 && output.includes(`FAIL ${expectedFailure}`), `${name} → vermelho na mesma prova ${expectedFailure}`)
      if (result.status === 0 || !output.includes(`FAIL ${expectedFailure}`)) console.log(output.slice(-3500))
    } finally { fs.rmSync(dir, { recursive: true, force: true }) }
  }
  // Âncoras ficam perto do comportamento: uma mudança legítima exige reavaliar a prova, nunca falso verde.
  mutant('M1 sem personagem no filme', 'lib/mcp/studioTools.ts', (s) => s.replace('body.kids_cartoon = input.cartoon.character', "body.kids_cartoon = 'mia'"), 'B2')
  mutant('M2 reescreve história no cinematic', 'lib/mcp/studioTools.ts', (s) => s.replace(/body\.prompt = ([^\n;]+)/, "body.prompt = 'Changed narration'"), 'B2')
  mutant('M3 aceita saldo insuficiente', 'lib/mcp/studioMcp.ts', (s) => s.replace('if (!bal.canRender || bal.credits < estimate)', 'if (false)'), 'B5')
  mutant('M4 preço do account inventado', 'lib/mcp/studioMcp.ts', (s) => s.replace(/credits: estimateCredits\(KIDS_CARTOON_ENGINE, seconds\)/g, 'credits: -123'), 'A9')
  mutant('M7 status perde o corpo salvo na projeção SQL', 'lib/mcp/studioTools.ts', (s) => s.replace("select('id, generation_id, engine, duration, credits, status, created_at, format, dispatch')", "select('id, generation_id, engine, duration, credits, status, created_at, format')"), 'C2')
  mutant('M6 ignora recusa HTTP da história', 'lib/mcp/studioTools.ts', (s) => s.replace('if (!storyRes.ok)', 'if (false)'), 'B6 regra infantil')
  mutant('M5 aceita roteiro vazio', 'lib/mcp/studioTools.ts', (s) => s.replace(/!script\b/g, 'false'), 'B6 roteiro vazio')
}
console.log(`\n${fail ? 'VERMELHO' : 'VERDE'} KINEO-MCP-DESENHO-2110: ${pass} ok, ${fail} falha(s)${PROBE ? ' (subprocesso)' : ''}`)
process.exit(fail ? 1 : 0)
