import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(join(ROOT, 'package.json'))
const ts = require('typescript')
const pureCache = new Map()
export const USER = '11111111-1111-4111-8111-111111111111'
export const VIDEO = '22222222-2222-4222-8222-222222222222'
export const OTHER = '33333333-3333-4333-8333-333333333333'
export const VERSION = 'upsell_filme15_2610_v1'
export const CAMPAIGN = 'film15_full_version'
export const read = p => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const clone = value => structuredClone(value)

// Runs actual source with local tables and explicit auth/session/HTTP boundaries.
// No credentials, .env reads, live SDK clients, or provider requests are available.
export function world(overrides = {}) {
  const ctx = {
    now: Date.parse('2026-10-26T12:00:00Z'), user: { id: USER }, authError: null,
    requests: [], minted: [], disposed: 0, responseStatus: 200, mintOk: true, persistedAtDispatch: [],
    tables: {
      profiles: [{ id: USER, email: 'external@example.test', plan: 'free', has_paid: false }],
      videos: [{ id: VIDEO, user_id: USER, status: 'completed', render_id: 'source-render', script: 'The boy saves the injured bird. Together they find the way home.', topic: 'A gentle story about a boy and a bird', quality_mode: 'cinematic_ai', duration: 15, video_url: 'https://cdn.example.test/free.mp4' }],
      events: [{ id: 'source-compose', user_id: USER, name: 'compose_submission_claim', session_id: 'original-generation', metadata: { render_id: 'source-render', language: 'pt' }, created_at: '2026-10-26T11:00:00Z' }],
    },
  }
  const field = (row, key) => key.includes('->>') ? row[key.split('->>')[0]]?.[key.split('->>')[1]] : row[key]
  const db = { from(table) {
    const predicates = []; let action = 'select', payload, max = Infinity, ordering = null
    const q = {
      select() { return q },
      eq(key, value) { predicates.push(row => field(row, key) === value); return q },
      is(key, value) { predicates.push(row => value === null ? field(row, key) == null : field(row, key) === value); return q },
      in(key, values) { predicates.push(row => values.includes(field(row, key))); return q },
      not(key, operator, value) { if (operator !== 'is' || value !== null) throw new Error('unexpected predicate'); predicates.push(row => field(row, key) != null); return q },
      gte(key, value) { predicates.push(row => String(field(row, key) ?? '') >= value); return q },
      order(key, opts) { ordering = [key, opts?.ascending !== false]; return q },
      limit(value) { max = value; return q },
      insert(value) { action = 'insert'; payload = value; return q },
      update(value) { action = 'update'; payload = value; return q },
      async maybeSingle() { const out = execute(); return { ...out, data: out.data?.[0] ?? null } },
      then(resolve, reject) { return Promise.resolve().then(execute).then(resolve, reject) },
    }
    function execute() {
      const rows = ctx.tables[table] ?? (ctx.tables[table] = [])
      if (action === 'insert') {
        const items = Array.isArray(payload) ? payload : [payload]
        if (items.some(value => value.id && rows.some(row => row.id === value.id))) return { data: null, error: { code: '23505' } }
        for (const item of items) rows.push(clone(item))
        return { data: clone(items), error: null }
      }
      let selected = rows.filter(row => predicates.every(predicate => predicate(row)))
      if (ordering) selected.sort((a, b) => String(field(a, ordering[0])).localeCompare(String(field(b, ordering[0]))) * (ordering[1] ? 1 : -1))
      selected = selected.slice(0, max)
      if (action === 'update') for (const row of selected) Object.assign(row, clone(payload))
      return { data: clone(selected), error: null }
    }
    return q
  } }
  ctx.db = db
  const moduleCache = new Map()
  const mint = async (userId, email) => {
    ctx.minted.push({ userId, email })
    return ctx.mintOk ? { ok: true, session: { cookie: 'local-fixture-cookie', dispose: async () => { ctx.disposed++ } } } : { ok: false, error: 'fixture_mint_unavailable' }
  }
  const localFetch = async (url, init) => {
    const body = JSON.parse(init?.body ?? '{}'); ctx.requests.push({ url: String(url), init, body })
    if (String(url).endsWith('/api/generate-script')) return Response.json({ script: 'HOOK: [Pexels: boy sheltering an injured bird] The boy shelters the injured bird from the storm. At dawn, he carries it through the forest.\nPAYOFF: [Pexels: bird returning to the sky] The bird opens its wings, guides him toward the village, and circles above his home. He smiles as it returns to the sky.', targetSeconds: 35, stillShort: false })
    if (!String(url).endsWith('/api/generate-video-cinematic')) throw new Error('unexpected fixture endpoint')
    ctx.persistedAtDispatch.push(ctx.tables.events.some(row => row.name === 'film15_full_intent' && row.metadata.generation_id === body.generationId && row.metadata.dispatch_prompt === body.prompt))
    if (ctx.responseStatus === 200) ctx.tables.events.push({ id: load('lib/cinematic/claim.ts').cinematicClaimId(USER, body.generationId), name: 'cinematic_generation_claim', user_id: USER, metadata: { status: 'settled' } })
    return Response.json(ctx.responseStatus === 503 ? { pending: true } : {}, { status: ctx.responseStatus })
  }
  const boundary = {
    '@supabase/supabase-js': { createClient: () => { throw new Error('live Supabase is forbidden in this test') } },
    '@/lib/mcp/studioSession': { mintUserSession: mint },
    '@/lib/posResposta': { depoisDaResposta: () => false },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: ctx.user }, error: ctx.authError }) } }) },
    'next/server': { NextResponse: class extends Response {
      static json(body, init) { return new this(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json', ...init?.headers } }) }
      static redirect(url) { return new this(null, { status: 307, headers: { location: String(url) } }) }
    } },
  }
  function load(rel) {
    if (moduleCache.has(rel)) return moduleCache.get(rel).exports
    const pure = rel.startsWith('lib/') && rel !== 'lib/filmComplete/server.ts' && Object.keys(overrides).every(key => key === 'lib/filmComplete/server.ts')
    if (pure && pureCache.has(rel)) return pureCache.get(rel)
    const source = overrides[rel] ?? read(rel)
    const module = { exports: {} }; moduleCache.set(rel, module)
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: rel }).outputText
    const localRequire = id => {
      if (Object.hasOwn(boundary, id)) return boundary[id]
      if (id.startsWith('node:')) return require(id)
      if (id === '@/lib/filmComplete/server' && rel.startsWith('app/')) return { ...load('lib/filmComplete/server.ts'), filmCompleteAdmin: () => db }
      const candidate = id.startsWith('@/') ? id.slice(2) : id.startsWith('.') ? posix.normalize(posix.join(posix.dirname(rel), id)) : null
      if (candidate) {
        const file = [candidate, candidate + '.ts', candidate + '.tsx'].find(p => existsSync(join(ROOT, p)))
        if (!file) throw new Error('missing local source: ' + candidate)
        return load(file)
      }
      throw new Error('unexpected external import: ' + id)
    }
    new Function('require', 'module', 'exports', 'process', 'fetch', output)(localRequire, module, module.exports, { env: {} }, localFetch)
    if (pure) pureCache.set(rel, module.exports)
    return module.exports
  }
  ctx.load = load
  ctx.service = load('lib/filmComplete/server.ts')
  ctx.io = { now: () => ctx.now, mint, fetch: localFetch }
  ctx.pay = () => { Object.assign(ctx.tables.profiles[0], { has_paid: true, plan: 'basic' }) }
  ctx.request = (url, body, headers = {}) => ({ url, nextUrl: new URL(url), headers: new Headers(headers), json: async () => body })
  return ctx
}
