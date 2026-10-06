// Offline integration tests: real dispatcher, connector, store and page code.
// Only infrastructure is replaced. No production credentials or network calls.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire, registerHooks } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Ajv from 'ajv'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const nextServerUrl = pathToFileURL(require.resolve('next/server')).href
globalThis.fetch = async () => { throw new Error('Network is forbidden in these tests') }
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://offline.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'offline-test-placeholder'
const state = { rows: [], events: [], unavailable: false, signedIn: false, moderationUnavailable: false, moderationBlocked: false, moderationInputs: [] }
function query() {
  const filters = []
  let update, insert, head = false, single = false
  const q = {
    select(_cols, opts) { head = opts?.head ?? false; return q },
    eq(k, v) { filters.push(row => row[k] === v); return q },
    gte(k, v) { filters.push(row => row[k] >= v); return q },
    gt(k, v) { filters.push(row => row[k] > v); return q },
    lte(k, v) { filters.push(row => row[k] <= v); return q },
    limit() { return q },
    maybeSingle() { single = true; return q },
    update(value) { update = value; return q },
    insert(value) { insert = value; return q },
    then(resolve, reject) {
      try {
        if (state.unavailable) return Promise.resolve({ error: { message: 'offline database failure' } }).then(resolve, reject)
        const selected = state.rows.filter(row => filters.every(f => f(row)))
        if (update) selected.forEach(row => Object.assign(row, update))
        if (insert) {
          if (insert.payload_hash && state.rows.some(row => row.payload_hash === insert.payload_hash)) {
            return Promise.resolve({ error: { code: '23505', message: 'duplicate payload hash' } }).then(resolve, reject)
          }
          state.rows.push({ created_at: new Date().toISOString(), id: String(state.rows.length), click_count: 0, ...insert })
        }
        return Promise.resolve({ error: null, count: head ? selected.length : null, data: single ? selected[0] ?? null : selected }).then(resolve, reject)
      } catch (e) { return Promise.reject(e).then(resolve, reject) }
    },
  }
  return q
}
globalThis.__kineoTest = {
  db: { from: query },
  events: async event => { if (state.eventsDown) throw Error('Offline events sink unavailable'); state.events.push(event); return true },
  client: () => ({ auth: { getUser: async () => ({ data: { user: state.signedIn ? { id: 'test-user', email: 'tester@example.invalid' } : null } }) }, from: query }),
  cookies: () => ({ get: () => undefined, getAll: () => [] }),
  headers: () => new Headers(),
  link: ({ children, ...props }) => React.createElement('a', props, children),
  moderation: async ({ input }) => {
    state.moderationInputs.push(input)
    if (state.moderationUnavailable) throw Error('Offline moderation unavailable')
    return { results: [{ categories: { sexual: state.moderationBlocked }, category_scores: { sexual: state.moderationBlocked ? 1 : 0, 'sexual/minors': 0 } }] }
  },
}
const mocks = {
  '@supabase/supabase-js': 'export const createClient = () => globalThis.__kineoTest.db',
  '@/lib/serverEvents': 'export const writeServerEvent = globalThis.__kineoTest.events',
  '@/lib/supabase/server': 'export const createClient = globalThis.__kineoTest.client',
  'next/headers': 'export const cookies = globalThis.__kineoTest.cookies; export const headers = globalThis.__kineoTest.headers',
  'next/navigation': 'export const notFound = () => { throw new Error("notFound") }; export const redirect = u => { throw new Error("redirect:"+u) }',
  'next/link': 'export default globalThis.__kineoTest.link',
  '@/components/PostFilmCreatorOffer': 'export default () => null',
  '@/components/Footer': 'export default () => null',
  '@/lib/openai': 'export const openai = { moderations: { create: globalThis.__kineoTest.moderation } }',
}
const beforePage = execFileSync('git', ['show', 'HEAD:app/go/[token]/page.tsx'], { cwd: root, encoding: 'utf8' })
const beforePrivacy = execFileSync('git', ['show', 'HEAD:app/privacy/page.tsx'], { cwd: root, encoding: 'utf8' })
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: `offline:${specifier}`, shortCircuit: true }
    if (specifier === 'before-page') return { url: pathToFileURL(path.join(root, 'app/go/[token]/before-page.tsx')).href, shortCircuit: true }
    if (specifier === 'before-privacy') return { url: pathToFileURL(path.join(root, 'app/privacy/before-privacy.tsx')).href, shortCircuit: true }
    if (specifier.startsWith('@/') || (specifier.startsWith('.') && context.parentURL?.startsWith('file:'))) {
      const abs = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
      const file = [abs, abs + '.ts', abs + '.tsx', abs + '.js', path.join(abs, 'index.ts')].find(f => fs.existsSync(f) && fs.statSync(f).isFile())
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    if (specifier === 'next/server') return { url: nextServerUrl, shortCircuit: true }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url.startsWith('offline:')) return { format: 'module', source: mocks[url.slice(8)], shortCircuit: true }
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      const source = url.endsWith('/before-page.tsx') ? beforePage : url.endsWith('/before-privacy.tsx') ? beforePrivacy : fs.readFileSync(fileURLToPath(url), 'utf8')
      return { format: 'module', source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, shortCircuit: true }
    }
    if (url.endsWith('/openaiEgress.json')) return { format: 'module', source: 'export default ' + fs.readFileSync(fileURLToPath(url), 'utf8').replace(/^\uFEFF/, ''), shortCircuit: true }
    return next(url, context)
  },
})

const { handleMcpMessage } = await import('../lib/mcp/kineoMcp.ts')
const { createConnectorHandoff } = await import('../lib/mcp/connectorHandoff.ts')
const { chatgptRateIdentity } = await import('../lib/mcp/chatgptIdentity.ts')
const { hashIp, insertHandoff, findHandoff } = await import('../lib/gptHandoffStore.ts')
const { PAUSED_ENGINE_KEYS } = await import('../lib/engineLaunch.ts')
const { STUDIO_PATH } = await import('../lib/gptHandoff.ts')
const { default: GoPage } = await import('../app/go/[token]/page.tsx')
let checks = 0
async function check(name, fn) { await fn(); checks++; console.log('PASS ' + name) }
const ctx = { ip: '192.0.2.1', origin: 'https://www.usekineo.com', userAgent: 'offline-test', channel: 'chatgpt_plugin', rateLimitKey: 'chatgpt:subject:user-a', checkContent: async () => null }
const script = 'A quiet garden wakes as sunlight reaches the leaves. A small bird lands beside a flower and listens. Every morning brings another chance to notice the world around us. Look closely and enjoy this peaceful moment.'
const input = { script, durationSec: 15, engineHint: 'seedance', language: 'en', aspect: '9:16' }
const deps = { profile: 'chatgpt', pausedEngines: PAUSED_ENGINE_KEYS, facts: () => { throw Error('Commercial facts must not be read') }, createHandoff: args => createConnectorHandoff(args, ctx) }
const rpc = async (method, params = {}, custom = deps) => (await handleMcpMessage({ jsonrpc: '2.0', id: 1, method, params }, custom)).response
const tools = (await rpc('tools/list')).result.tools
const ajv = new Ajv({ allErrors: true })
const validators = Object.fromEntries(tools.map(t => [t.name, ajv.compile(t.outputSchema)]))
function schema(tool, result) { assert(validators[tool](result.structuredContent), JSON.stringify(validators[tool].errors)) }

await check('ChatGPT contract has no offers; schemas and noauth agree', async () => {
  assert.equal(tools.length, 2)
  assert.doesNotMatch(JSON.stringify(tools), /\b(pricing|subscription|trial|credits|USD|lastVerified|offerEffectiveSince)\b/i)
  for (const tool of tools) assert.deepEqual(tool.securitySchemes, tool._meta.securitySchemes)
  const res = (await rpc('tools/call', { name: 'kineo_facts' })).result
  schema('kineo_facts', res)
  assert(!res.structuredContent.engines.some(e => PAUSED_ENGINE_KEYS.includes(e.id)))
  assert.equal(res.structuredContent.engines.find(e => e.id === 'seedance').durations[0], 15)
})
await check('Commercial topic and malformed arguments are rejected', async () => {
  const bad = (await rpc('tools/call', { name: 'kineo_facts', arguments: { topic: 'plans' } })).result
  assert.equal(bad.isError, true); schema('kineo_facts', bad)
  assert.equal((await rpc('tools/call', { name: 'kineo_facts', arguments: [] })).error.code, -32602)
})
await check('Real handoff returns full script, server assessment and ChatGPT attribution', async () => {
  const result = (await rpc('tools/call', { name: 'create_video_handoff', arguments: input })).result
  assert(!result.isError, JSON.stringify(result)); schema('create_video_handoff', result)
  assert.equal(result.structuredContent.script, script)
  assert.equal(state.rows[0].channel, 'chatgpt_plugin')
  assert.equal(state.rows[0].ip_hash, hashIp(ctx.rateLimitKey))
  assert(!JSON.stringify(state.events).includes(script))
})
await check('Duplicate reuses token; expired resend creates new token and keeps old link expired', async () => {
  const first = state.rows[0].token
  const reused = await createConnectorHandoff(input, ctx)
  assert(reused.ok); assert(reused.data.url.endsWith(first)); assert.equal(state.rows.length, 1)
  state.rows[0].expires_at = '2020-01-01T00:00:00.000Z'
  const replaced = await createConnectorHandoff(input, ctx)
  assert(replaced.ok); assert(!replaced.data.url.endsWith(first)); assert.equal(state.rows.length, 2)
  assert.equal((await findHandoff(first)).expired, true)
  assert.equal(state.rows[0].payload_hash, null)
})
await check('Unique conflict on a live row does not erase its payload hash', async () => {
  const live = state.rows[1]
  const result = await insertHandoff({ ...live, token: 'different-token' })
  assert.equal(result.ok, false); assert.equal(result.duplicate, true); assert(live.payload_hash)
})
await check('Blocked, unavailable or missing safety review cannot save a script', async () => {
  const count = state.rows.length
  for (const checkContent of [undefined, async () => 'Blocked', async () => 'Safety service unavailable']) {
    assert.equal((await createConnectorHandoff({ ...input, topic: 'different' }, { ...ctx, checkContent })).ok, false)
  }
  state.unavailable = true
  assert.equal((await createConnectorHandoff(input, ctx)).ok, false)
  state.unavailable = false
  assert.equal(state.rows.length, count)
})
await check('Untrusted subjects cannot evade an IP bucket; trusted OpenAI subjects separate users', async () => {
  const egress = JSON.parse(fs.readFileSync(path.join(root, 'lib/mcp/openaiEgress.json'), 'utf8').replace(/^\uFEFF/, ''))
  const openaiIp = egress.prefixes.find(x => !x.includes(':')).split('/')[0]
  const a = { 'openai/subject': 'a' }, b = { 'openai/subject': 'b' }
  const ordinary = new Headers({ 'x-vercel-forwarded-for': '192.0.2.1', 'x-forwarded-for': openaiIp })
  assert.equal(chatgptRateIdentity(ordinary, a, true).key, chatgptRateIdentity(ordinary, b, true).key)
  const trusted = new Headers({ 'x-vercel-forwarded-for': openaiIp })
  assert.notEqual(chatgptRateIdentity(trusted, a, true).key, chatgptRateIdentity(trusted, b, true).key)
  assert.equal(chatgptRateIdentity(trusted, a, false).key, 'chatgpt:ip:unknown')
  assert(chatgptRateIdentity(trusted, {}, true).key.startsWith('chatgpt:ip:'))
})
await check('Claude keeps its commercial facts contract and legacy channel', async () => {
  const legacy = { pausedEngines: [], facts: () => ({ plans: { marker: 'legacy' } }), createHandoff: args => createConnectorHandoff(args, { ...ctx, channel: undefined, checkContent: undefined }) }
  assert((await rpc('tools/list', {}, legacy)).result.tools[0].description.includes('USD'))
  assert.equal((await rpc('tools/call', { name: 'kineo_facts', arguments: { topic: 'plans' } }, legacy)).result.structuredContent.plans.marker, 'legacy')
  const res = (await rpc('tools/call', { name: 'create_video_handoff', arguments: input }, legacy)).result
  assert(!res.isError); assert.equal(state.rows.at(-1).channel, 'claude_connector'); assert.equal(res.structuredContent.script, undefined)
})
await check('Handoff rejects excessive speech and emits schema-valid errors', async () => {
  const res = (await rpc('tools/call', { name: 'create_video_handoff', arguments: { ...input, script: 'hello '.repeat(100) } })).result
  assert.equal(res.isError, true); schema('create_video_handoff', res)
})
await check('Protocol negotiation, notification and unknown-method handling', async () => {
  assert.equal((await rpc('initialize', { protocolVersion: '2025-06-18' })).result.protocolVersion, '2025-06-18')
  assert.equal((await handleMcpMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, deps)).response, null)
  assert.equal((await rpc('nonexistent')).error.code, -32601)
  assert.equal((await handleMcpMessage({ jsonrpc: '1.0', method: 'ping' }, deps)).response.error.code, -32600)
  assert.equal((await handleMcpMessage({ jsonrpc: '2.0', id: [], method: 'ping' }, deps)).response.error.code, -32600)
  assert.equal((await handleMcpMessage({ jsonrpc: '2.0', id: null, method: 'ping' }, deps)).response.id, null)
})
await check('HTTP transport, moderation failures and title coverage', async () => {
  const { NextRequest } = await import('next/server')
  const route = await import('../app/api/mcp/chatgpt/route.ts')
  const post = (body, headers = {}) => route.POST(new NextRequest('https://www.usekineo.com/api/mcp/chatgpt', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }))
  assert.equal(route.GET().status, 405); assert.equal(route.OPTIONS().status, 204)
  assert.equal((await post('{')).status, 400)
  assert.equal((await post([], {})).status, 400)
  assert.equal((await post({}, { origin: 'https://untrusted.invalid' })).status, 403)
  assert.equal((await post({}, { 'mcp-protocol-version': 'unknown' })).status, 400)
  assert.equal((await post(' '.repeat(33000))).status, 413)
  assert.equal((await post({ jsonrpc: '2.0', method: 'notifications/initialized' })).status, 202)
  const call = { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'create_video_handoff', arguments: { ...input, topic: 'Garden story' } } }
  const count = state.rows.length
  state.moderationUnavailable = true
  assert.equal((await (await post(call)).json()).result.isError, true)
  state.moderationUnavailable = false; state.moderationBlocked = true
  assert.equal((await (await post(call)).json()).result.isError, true)
  assert.equal(state.rows.length, count)
  assert.equal(state.events.find(e => e.name === 'content_moderation_blocked').metadata.text, null)
  state.moderationBlocked = false
  const good = (await (await post(call)).json()).result
  assert(!good.isError); schema('create_video_handoff', good)
  assert.equal(state.moderationInputs.at(-1)[0].text, 'Garden story\n\n' + script)
})
// KINEO-CHATGPT-ADOCAO-2026-10-06 — a rota passa a contar initialize e tools/call (canal e path próprios), sem mudar
// nenhum byte da resposta que a revisão da OpenAI vê; e a medição fora do ar não derruba nada.
await check('Route counts initialize and tool calls on its own channel; responses unchanged (06/10)', async () => {
  const { NextRequest } = await import('next/server')
  const route = await import('../app/api/mcp/chatgpt/route.ts')
  const post = body => route.POST(new NextRequest('https://www.usekineo.com/api/mcp/chatgpt', { method: 'POST', body: JSON.stringify(body), headers: { 'user-agent': 'openai-mcp/1.0.0' } }))
  const same = async msg => assert.deepEqual(await (await post(msg)).json(), (await handleMcpMessage(msg, deps)).response)
  const from = state.events.length
  await same({ jsonrpc: '2.0', id: 7, method: 'initialize', params: { protocolVersion: '2025-06-18', clientInfo: { name: 'openai-mcp', version: '1.0.0' } } })
  await same({ jsonrpc: '2.0', id: 8, method: 'tools/list' })
  await same({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'kineo_facts' } })
  await same({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'kineo_facts', arguments: { topic: 'plans' } } })
  const fresh = state.events.slice(from)
  assert.deepEqual(fresh.map(e => [e.name, e.path]), [['mcp_initialized', '/api/mcp/chatgpt'], ['mcp_tool_called', '/api/mcp/chatgpt'], ['mcp_tool_called', '/api/mcp/chatgpt']])
  assert.deepEqual(fresh[0].metadata, { channel: 'chatgpt_plugin', client: 'openai-mcp/1.0.0', protocol: '2025-06-18', ua: 'openai-mcp' })
  assert.deepEqual(fresh[1].metadata, { channel: 'chatgpt_plugin', tool: 'kineo_facts', ok: true, ua: 'openai-mcp' })
  assert.deepEqual(fresh[2].metadata, { channel: 'chatgpt_plugin', tool: 'kineo_facts', ok: false, ua: 'openai-mcp' })
  state.eventsDown = true
  try {
    await same({ jsonrpc: '2.0', id: 11, method: 'initialize', params: { protocolVersion: '2025-06-18' } })
  } finally {
    state.eventsDown = false
  }
  assert(!JSON.stringify(state.events).includes(script))
})
// KINEO-CHATGPT-CONTRATO-V1-2026-10-06 — o interruptor de manutenção não mexe no tools/list em revisão; a recusa
// de motor pausado continua viva na chamada e nada é gravado.
await check('Listing keeps the reviewed engine list when the live pause list changes; calls still refuse paused engines (06/10)', async () => {
  const enumOf = async paused => (await rpc('tools/list', {}, { ...deps, pausedEngines: paused })).result.tools.find(t => t.name === 'create_video_handoff').inputSchema.properties.engineHint.enum
  const reviewed = await enumOf(PAUSED_ENGINE_KEYS)
  assert.deepEqual(await enumOf([]), reviewed)
  assert.deepEqual(await enumOf(['omni', 's25', 'h3']), reviewed)
  assert(reviewed.includes('h3') && !reviewed.includes('omni'))
  const count = state.rows.length
  const paused = (await rpc('tools/call', { name: 'create_video_handoff', arguments: { ...input, durationSec: 35, engineHint: 'h3' } }, { ...deps, pausedEngines: ['omni', 's25', 'h3'] })).result
  assert.equal(paused.isError, true); schema('create_video_handoff', paused)
  assert.match(paused.structuredContent.error, /temporarily paused/)
  assert.equal(state.rows.length, count)
})
await check('Per-user and shared global limits are enforced', async () => {
  const { RATE_LIMIT_PER_IP_PER_HOUR, RATE_LIMIT_GLOBAL_PER_HOUR } = await import('../lib/gptHandoff.ts')
  const saved = state.rows
  state.rows = Array.from({ length: RATE_LIMIT_PER_IP_PER_HOUR }, () => ({ created_at: new Date().toISOString(), ip_hash: hashIp(ctx.rateLimitKey) }))
  assert.equal((await createConnectorHandoff(input, ctx)).ok, false)
  assert.equal((await createConnectorHandoff(input, { ...ctx, rateLimitKey: 'another-user' })).ok, true)
  state.rows = Array.from({ length: RATE_LIMIT_GLOBAL_PER_HOUR }, () => ({ created_at: new Date().toISOString(), ip_hash: 'other' }))
  assert.equal((await createConnectorHandoff(input, ctx)).ok, false)
  state.rows = saved
})
await check('ChatGPT click uses existing-account login without generating media', async () => {
  const { NextRequest } = await import('next/server')
  const { GET } = await import('../app/api/gpt/handoff/go/route.ts')
  const row = state.rows.find(r => r.channel === 'chatgpt_plugin' && r.payload_hash)
  const response = await GET(new NextRequest('https://www.usekineo.com/api/gpt/handoff/go?token=' + row.token))
  assert.equal(new URL(response.headers.get('location')).pathname, '/login')
  assert.equal(new URL(response.headers.get('location')).searchParams.get('source'), 'chatgpt_plugin')
  state.signedIn = true
  const signedIn = await GET(new NextRequest('https://www.usekineo.com/api/gpt/handoff/go?token=' + row.token))
  // 06/10 — reancorado: desde KINEO-GO-STUDIO-NOVO-2026-10-01 o destino é o Studio novo (STUDIO_PATH), não /studio/create;
  // o vermelho parava o arquivo aqui e as 2 verificações seguintes (challenge e /go sem oferta) nunca rodavam. A intenção
  // fica mais estrita: o Studio abre com o roteiro salvo, verbatim, na duração e no motor salvos, com a etiqueta do app,
  // e sem nenhum parâmetro que dispare render sozinho.
  const dest = new URL(signedIn.headers.get('location'))
  assert.equal(dest.pathname, STUDIO_PATH)
  assert.equal(dest.searchParams.get('prompt'), row.script)
  assert.equal(dest.searchParams.get('script_mode'), 'verbatim')
  assert.equal(dest.searchParams.get('duration'), String(row.duration_sec))
  assert.equal(dest.searchParams.get('engine'), row.engine_hint)
  assert.equal(dest.searchParams.get('utm_source'), 'chatgpt_plugin')
  assert.equal(dest.searchParams.get('intent_campaign'), 'kineo_chatgpt_plugin')
  for (const k of ['create_intent', 'autoanalyze', 'autostart', 'auto', 'studio']) assert.equal(dest.searchParams.has(k), false, k)
  state.signedIn = false
})
await check('Domain challenge fails closed until configured; shared pages exclude checkout overlays', async () => {
  const { GET } = await import('../app/.well-known/openai-apps-challenge/route.ts')
  delete process.env.OPENAI_APPS_CHALLENGE
  assert.equal(GET().status, 404)
  process.env.OPENAI_APPS_CHALLENGE = 'offline-domain-challenge'
  assert.equal(await GET().text(), 'offline-domain-challenge')
  delete process.env.OPENAI_APPS_CHALLENGE
  const { isNonCommercialSurface } = await import('../lib/nonCommercialSurface.ts')
  for (const route of ['/go/token', '/support', '/contact', '/privacy', '/terms']) assert(isNonCommercialSurface(route))
  for (const route of ['/studio/create', '/pricing', '/government']) assert(!isNonCommercialSurface(route))
})
await check('Rendered ChatGPT landing has no offers; Claude still does', async () => {
  const chat = state.rows.find(r => r.channel === 'chatgpt_plugin' && r.payload_hash)
  const html = renderToStaticMarkup(await GoPage({ params: { token: chat.token } }))
  assert.match(html, /Script from ChatGPT/); assert.match(html, /Open in Kineo Studio/)
  assert.doesNotMatch(html, /See plans|Sign up free|Creator trial|Script from Claude/)
  const claude = state.rows.find(r => r.channel === 'claude_connector')
  const legacy = renderToStaticMarkup(await GoPage({ params: { token: claude.token } }))
  assert.match(legacy, /See plans/); assert.match(legacy, /Script from Claude/)
  if (process.env.KINEO_PREVIEW_DIR) {
    const output = path.resolve(process.env.KINEO_PREVIEW_DIR)
    fs.mkdirSync(output, { recursive: true })
    const Before = (await import('before-page')).default
    const before = renderToStaticMarkup(await Before({ params: { token: claude.token } }))
    const support = renderToStaticMarkup((await import('../app/support/page.tsx')).default())
    const privacy = renderToStaticMarkup((await import('../app/privacy/page.tsx')).default())
    const oldPrivacy = renderToStaticMarkup((await import('before-privacy')).default())
    const escaped = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
    const frame = (title, markup, width) => `<section><h2>${title}</h2><iframe title="${title}" style="width:${width}px;height:900px" srcdoc="${escaped('<style>body{margin:0}</style>' + markup)}"></iframe></section>`
    fs.writeFileSync(path.join(output, 'comparacao.html'), '<!doctype html><meta charset="utf-8"><title>Kineo — comparação local</title><style>body{font-family:Arial;background:#eee;margin:24px}iframe{border:1px solid #aaa}section{margin:16px}h2{font-size:18px}.row{display:flex;gap:16px}</style><h1>Antes e depois — ChatGPT</h1><p>Renderização do código com dados fictícios; não é produção. Oferta pós-filme não elegível nesta amostra.</p>' + [760,390].map(w => '<div class="row">' + frame('Antes — ' + w + 'px', before, w) + frame('Depois — ' + w + 'px', html, w) + '</div>').join('') + '<h1>Nova página de suporte (antes: ausente)</h1>' + [760,390].map(w => frame('Suporte — ' + w + 'px', support,w)).join('') + '<h1>Política atualizada</h1>' + [760,390].map(w => '<div class="row">' + frame('Privacidade antes — ' + w + 'px', oldPrivacy,w) + frame('Privacidade depois — ' + w + 'px', privacy,w) + '</div>').join(''))
  }
})
console.log(`${checks} offline integration checks passed; no production access.`)
