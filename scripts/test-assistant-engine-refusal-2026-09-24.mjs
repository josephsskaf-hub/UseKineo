// Offline execution of GET /make: database, cookies and events are local mocks.
// No HTTP request, credential, render or payment. Mutants never modify the worktree.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const source = read('app/make/route.ts')
let checks = 0
function check(condition, message) { assert.ok(condition, message); checks++ }
function harness(routeSource = source) {
  const state = { events: [], inserts: [], lookups: [], counts: { ip: 0, global: 0 }, existing: null, duplicate: false, unavailable: false }
  const cache = new Map()
  const stubs = {
    'node:crypto': { createHash },
    crypto: { randomBytes: () => ({ toString: () => 'offlineToken0123456789ABCD' }) },
    'next/server': { NextResponse: { redirect: (url, status) => ({ url, status }) } },
    'next/headers': { cookies: () => ({ get: () => ({ value: 'offline-session' }) }) },
    '@/lib/serverEvents': { writeServerEvent: async event => state.events.push(event) },
    '@/lib/gptHandoffStore': {
      clientIp: () => 'local-test', hashIp: () => 'hashed-test',
      countRecentHandoffs: async () => state.counts,
      isLikelyBot: agent => agent === 'test-bot',
      findHandoffByPayloadHash: async hash => { state.lookups.push(hash); return state.duplicate && state.lookups.length > 1 ? { token: 'racingToken0123456789' } : state.existing },
      insertHandoff: async row => { state.inserts.push(row); return state.unavailable ? { ok: false, error: 'offline failure' } : state.duplicate ? { ok: false, duplicate: true } : { ok: true } },
    },
  }
  function load(rel) {
    const file = rel.endsWith('.ts') ? rel : `${rel}.ts`
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }; cache.set(file, module)
    const raw = file === 'app/make/route.ts' ? routeSource : read(file)
    const js = ts.transpileModule(raw, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const require = spec => {
      if (Object.hasOwn(stubs, spec)) return stubs[spec]
      if (spec.startsWith('@/')) return load(spec.slice(2))
      if (spec.startsWith('.')) return load(resolve(root, dirname(file), spec).slice(root.length + 1).replace(/\\/g, '/'))
      throw new Error(`Unmocked dependency: ${spec}`)
    }
    vm.runInNewContext(js, { module, exports: module.exports, require, URL, URLSearchParams, Date, console: { log() {}, error() {}, warn() {} }, process: { env: {} } })
    return module.exports
  }
  const route = load('app/make/route.ts')
  return { state, load, call: async (input, agent = 'human') => {
    const url = new URL('https://offline.invalid/make')
    Object.entries(input).forEach(([k, v]) => url.searchParams.set(k, String(v)))
    return route.GET({ nextUrl: url, headers: new Headers({ 'user-agent': agent }) })
  } }
}
const words = (n, topic = 'stock market investing money wealth finance') => Array.from({ length: n }, (_, i) => topic.split(' ')[i % topic.split(' ').length]).join(' ')
const input = (script, engine = 'fast', language = 'en') => ({ script, engine, language, duration: 90 })
async function rejection(routeSource = source) {
  for (const [data, slug] of [
    [input(words(265)), 'script_too_long_for_kineo1'],
    [input(words(160), 'hollywood', 'hi'), 'engine_language'],
    [input(words(160), 'h3', 'fr'), 'engine_language'],
  ]) {
    const h = harness(routeSource); const r = await h.call(data)
    check(r.status === 302 && r.url === `https://offline.invalid/chatgpt-to-youtube-shorts?handoff_error=${slug}`, 'closed refusal redirect')
    check(h.state.lookups.length === 0 && h.state.inserts.length === 0, 'refusal before lookup/write')
    check(h.state.events.length === 1 && h.state.events[0].name === 'gpt_handoff_refused', 'refusal event only')
    const metadata = h.state.events[0].metadata
    check(metadata.channel === 'assistant_link' && !('script' in metadata) && !('topic' in metadata) && !('ip' in metadata), 'event excludes content and PII')
  }
}
await rejection()
for (const data of [input(words(255)), input(words(265), 'seedance'), input(words(160), 'h3', 'pt'), input(words(160), 'hollywood', 'es')]) {
  const h = harness(); const started = Date.now(); const r = await h.call(data)
  check(r.status === 302 && r.url.includes('/go/'), 'eligible input reaches existing handoff')
  check(h.state.inserts.length === 1 && h.state.inserts[0].script === data.script, 'script preserved')
  const row = h.state.inserts[0]
  check(Date.parse(row.expires_at) >= started + h.load('lib/gptHandoff').HANDOFF_TTL_MS, 'TTL preserved')
  const parsed = h.load('lib/gptHandoff').parseAssistantLinkQuery(new URLSearchParams(data)).value
  check(row.payload_hash === h.load('lib/gptHandoff').handoffPayloadHash(parsed, 'assistant_link'), 'canonical payload hash preserved')
}
for (const mode of ['bot', 'ip', 'global']) {
  const h = harness()
  if (mode === 'ip') h.state.counts.ip = 1e6
  if (mode === 'global') h.state.counts.global = 1e6
  const r = await h.call(input(words(265)), mode === 'bot' ? 'test-bot' : 'human')
  check(h.state.inserts.length === 0 && h.state.lookups.length === 0 && h.state.events.length === 0, `${mode} exits before engine guard`)
  check(r.url.endsWith(mode === 'bot' ? '/chatgpt-to-youtube-shorts' : 'handoff_error=rate_limited'), `${mode} existing destination`)
}
for (const mode of ['reuse', 'race', 'unavailable']) {
  const h = harness()
  if (mode === 'reuse') h.state.existing = { token: 'existingToken0123456789' }
  if (mode === 'race') h.state.duplicate = true
  if (mode === 'unavailable') h.state.unavailable = true
  const r = await h.call(input(words(255)))
  check(r.url.endsWith(mode === 'reuse' ? '/go/existingToken0123456789' : mode === 'race' ? '/go/racingToken0123456789' : 'handoff_error=unavailable'), `${mode} preserved`)
  if (mode === 'reuse') check(h.state.inserts.length === 0, 'reuse does not insert')
}
const page = read('app/chatgpt-to-youtube-shorts/page.tsx')
check(page.includes('script_too_long_for_kineo1:') && page.includes('engine_language:'), 'both slugs have visible messages')
check(page.includes('${DURATION_FOLLOWS_SCRIPT_CEILING_SECONDS}'), 'visible ceiling derives from engine policy')
for (const mutation of [
  s => s.replace('if (engineRefusal) {', 'if (false && engineRefusal) {'),
  s => s.replace('handoffEngineRefusal(input)', "handoffEngineRefusal({ ...input, engineHint: 'seedance' })"),
  s => s.replace("return landing(origin, engineRefusal.reason", "return landing(origin + '/' + input.script, engineRefusal.reason"),
]) {
  let rejected = false
  try { await rejection(mutation(source)) } catch { rejected = true }
  check(rejected, 'bypass/privacy mutant rejected')
}
console.log(`PASS ${checks} checks; 3 bypass/privacy mutants rejected; all I/O mocked.`)
