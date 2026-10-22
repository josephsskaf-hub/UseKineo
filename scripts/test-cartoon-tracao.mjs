// KINEO-CARTOON-TRACAO-2210 — offline guardian: actual campaign route/helper, public pages and exact undo.
// All tables are fixtures. No credentials or environment files are read; provider requests are captured in memory.
// --mutants writes ONE exact mutant at a time and restores the original Buffer in finally, byte for byte.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const ROUTE = 'app/api/admin/send-kids-launch/route.ts'
const HELPER = 'lib/growth/kidsLaunchEmail.ts'
const PAGE = 'components/kidsCartoon/KidsCartoonPages.tsx'
const BASE = '796333e9a07ee0c83bb414312a062b63f8fc32bb'
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 << 20, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
const profile = (id, patch = {}) => ({ id, email: `${id}@example.test`, email_opted_out: false, signup_country: 'US', last_country: null, created_at: '2026-10-22T12:00:00Z', ...patch })
const event = (id, user, name) => ({ id, user_id: user, name, created_at: '2026-10-22T12:00:00Z' })
const unavailable = what => { throw new Error('Offline guardian forbids ' + what) }
let checks = 0
const ok = (condition, label) => { assert.ok(condition, label); checks++ }

// Query-executing PostgREST double. Inclusive range + 1000-row ceiling + stable total ORDER are exercised.
function memoryDb(tables, options = {}) {
  const calls = [], writes = []
  let reads = 0
  return {
    tables, calls, writes,
    from(table) {
      let bounds = [0, 999], filters = [], order = [], inserted = null, counted = false
      const q = {
        select(_cols, opts) { counted = !!opts?.count; return q },
        eq(k, v) { filters.push(r => r[k] === v); return q },
        in(k, values) { filters.push(r => values.includes(r[k])); return q },
        gte(k, v) { filters.push(r => r[k] >= v); return q },
        order(k, { ascending = true } = {}) { order.push([k, ascending]); return q },
        range(from, to) { bounds = [from, to]; return q },
        limit(n) { bounds = [0, n - 1]; return q },
        insert(row) { inserted = row; return q },
        delete() { unavailable('deleting durable claims') },
        update() { unavailable('updating production profiles or credits') },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (inserted) {
              const rows = Array.isArray(inserted) ? inserted : [inserted]
              if (options.claimError && rows.some(r => r.name === 'kids_launch_email_claim')) return { data: null, error: { code: 'XX000' } }
              if (options.stampError && rows.some(r => r.name === 'kids_launch_email_sent')) return { data: null, error: { code: 'XX000' } }
              if (rows.some(r => r.id && (tables[table] ?? []).some(v => v.id === r.id))) return { data: null, error: { code: '23505' } }
              for (const r of rows) { const row = { id: `insert-${writes.length}`, created_at: new Date().toISOString(), ...r }; (tables[table] ??= []).push(row); writes.push({ table, row }) }
              return { data: null, error: null }
            }
            if (++reads > 1000) throw new Error('Unbounded query loop')
            const call = { table, bounds: [...bounds], order: order.map(r => [...r]), counted }
            calls.push(call)
            options.beforeRead?.(call, tables, calls)
            if (options.failTable === table && bounds[0] >= (options.failFrom ?? 0)) return { data: null, error: { message: 'fixture unavailable' }, count: null }
            let rows = [...(tables[table] ?? [])].filter(row => filters.every(f => f(row)))
            if (options.quotaError && counted) return { data: null, error: { message: 'quota unavailable' }, count: null }
            if (counted) return { data: null, error: null, count: options.quotaCount ?? rows.length }
            const offset = rows.length ? calls.length * 137 % rows.length : 0
            rows = rows.slice(offset).concat(rows.slice(0, offset))
            for (const [key] of order) if (rows.some(r => !Object.hasOwn(r, key))) return { data: null, error: { message: 'missing order key ' + key } }
            rows.sort((a, b) => { for (const [key, asc] of order) { const n = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0; if (n) return asc ? n : -n } return 0 })
            return { data: rows.slice(bounds[0], Math.min(bounds[1] + 1, bounds[0] + 1000)), error: null }
          }).then(resolve, reject)
        },
      }
      return q
    },
  }
}

function setup(options = {}) {
  const tables = options.tables ?? { profiles: [profile('one')], events: [], kids_orders: [], email_send_log: [] }
  const db = options.db ?? memoryDb(tables, options)
  const sends = [], ledgers = [], suppressionCalls = []
  const loader = createOfflineLoader({
    env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', ...(options.providerKey === false ? {} : { RESEND_API_KEY: 'fixture-sender' }) },
    mocks: {
      'next/server': { NextRequest: class {}, NextResponse: { json: (body, opts) => ({ body, status: opts?.status ?? 200, headers: opts?.headers }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: options.user === undefined ? { id: 'founder', email: 'josephsskaf@gmail.com' } : options.user } }) } }) },
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/serverEvents': { writeServerEvent: async () => unavailable('telemetry writes') },
      '@/lib/lifecycle/suppression': { loadLifecycleSuppression: async (_db, ids) => { suppressionCalls.push(ids); return { degraded: !!options.suppressionError, eventsDegraded: !!options.eventsDegraded, isSuppressed: id => (options.suppressed ?? []).includes(id) } } },
      '@/lib/email/quota': { dailyCap: () => 100, recordResendResponse: async input => { ledgers.push(input); if (options.ledgerThrows) throw new Error('fixture ledger failed') } },
    },
    globals: {
      AbortSignal,
      setTimeout: fn => { fn(); return 0 },
      fetch: async (url, init) => {
        assert.equal(url, 'https://api.resend.com/emails')
        sends.push({ body: JSON.parse(init.body), headers: init.headers })
        if (options.timeout) throw new Error('fixture timeout: delivery unknown')
        return { ok: !options.rejected, status: options.rejected ? 429 : 200, json: async () => ({ id: 'fixture-message' }) }
      },
    },
  })
  const handler = loader(ROUTE).GET
  return { db, tables, sends, ledgers, suppressionCalls, loader, async run(query = '') { return handler({ nextUrl: new URL('https://www.usekineo.com/api/admin/send-kids-launch' + query), headers: { get: key => options.headers?.[key] ?? null } }) } }
}

const cases = {
  async dryRun() {
    const c = setup({ providerKey: false }), r = await c.run()
    ok(r.status === 200 && r.body.mode === 'DRY_RUN' && r.body.eligible_people === 1 && r.body.next_batch_size === 1, 'default counts unique eligible people')
    ok(c.sends.length === 0 && c.db.writes.length === 0 && c.ledgers.length === 0 && !c.db.calls.some(v => v.table === 'email_send_log'), 'dry-run requires no provider key, sends nothing and writes no quota/claim/stamp')
    ok(r.headers['Cache-Control'] === 'no-store', 'dry-run response never cached')
    for (const query of ['?confirm=send&limit=1', '?confirm=SEND%20&limit=1', '?limit=1']) ok((await c.run(query)).body.mode === 'DRY_RUN' && c.sends.length === 0, 'only exact uppercase SEND confirms: ' + query)
  },
  async confirmation() {
    for (const limit of ['', '0', '-1', '1.5', '61', '01', '1e1', 'Infinity']) {
      const c = setup(), r = await c.run('?confirm=SEND' + (limit ? '&limit=' + limit : ''))
      ok(r.status === 400 && c.sends.length === 0 && c.db.writes.length === 0, 'SEND rejects invalid/missing explicit integer limit: ' + limit)
    }
    for (const user of [null, { id: 'stranger', email: 'external@example.test' }]) {
      const c = setup({ user }), r = await c.run('?confirm=SEND&limit=1')
      ok(r.status === 403 && c.sends.length === 0 && c.db.calls.length === 0, 'nonadmin cannot preview or send')
    }
    for (const headers of [{ 'sec-fetch-site': 'cross-site' }, { origin: 'https://unrelated.example.test' }]) {
      const c = setup({ headers }), r = await c.run('?confirm=SEND&limit=1')
      ok(r.status === 403 && c.sends.length === 0 && c.db.writes.length === 0, 'cross-site request cannot send with an admin cookie')
    }
  },
  async cohort() {
    const ps = [profile('pt', { signup_country: ' br ' }), profile('en'), profile('pt-fallback', { signup_country: null, last_country: 'BR' }),
      profile('duplicate', { email: ' EN@EXAMPLE.TEST ' }), profile('internal', { email: 'josephsskaf+fixture@gmail.com' }),
      profile('optout', { email_opted_out: true }), profile('optout-alias', { email: 'OPTOUT@example.test' }),
      profile('buyer'), profile('buyer-alias', { email: 'BUYER@example.test' }), profile('sent'), profile('claimed'), profile('suppressed')]
    const tables = { profiles: ps, kids_orders: [{ id: 'order', user_id: 'buyer', kind: 'pack', status: 'cancelled' }],
      events: [event('sent', 'sent', 'kids_launch_email_sent'), event('claimed', 'claimed', 'kids_launch_email_claim')], email_send_log: [] }
    const c = setup({ tables, suppressed: ['suppressed'] }), r = await c.run()
    ok(r.body.eligible_people === 3 && r.body.by_language.pt === 2 && r.body.by_language.en === 1, 'dedupe normalized emails; internal/opt-out/buyer aliases/prior launch/suppression excluded; BR profile chooses PT')
    const H = c.loader(HELPER)
    ok(H.kidsLaunchClaimId(' EN@example.test ') === H.kidsLaunchClaimId('en@example.test'), 'claim shared across case/space aliases')
    ok(H.kidsLaunchClaimId('different@example.test') !== H.kidsLaunchClaimId('en@example.test'), 'different people reserve different claims')
    for (const language of ['pt', 'en']) {
      const m = H.kidsLaunchEmail('pt', language), footer = c.loader('lib/emailSuppression.ts')
      ok(m.text.endsWith(footer.emailFooterText('pt')) && m.html.endsWith(footer.emailFooterHtml('pt')), 'house unsubscribe footer in both bodies: ' + language)
      ok(m.text.includes(language === 'pt' ? '/desenho-infantil-3d-com-ia' : '/ai-kids-cartoon-videos'), 'correct localized landing: ' + language)
      ok(!/earn money|ganhe dinheiro|income guaranteed|renda garantida/i.test(m.text), 'no income promise: ' + language)
    }
  },
  async pagination() {
    const ps = Array.from({ length: 1105 }, (_, i) => profile('p' + String(i).padStart(4, '0')))
    const tables = { profiles: ps, kids_orders: Array.from({ length: 1001 }, (_, i) => ({ id: 'o' + String(i).padStart(4, '0'), user_id: ps[i].id })),
      events: Array.from({ length: 1001 }, (_, i) => event('e' + String(i).padStart(4, '0'), i === 1000 ? ps[1104].id : 'absent-' + i, 'kids_launch_email_sent')), email_send_log: [] }
    const c = setup({ tables }), r = await c.run()
    ok(r.status === 200 && r.body.eligible_people === 103, 'profiles, orders and sent stamps after row 1000 are read without truncation')
    ok(['profiles', 'kids_orders', 'events'].every(table => c.db.calls.some(call => call.table === table && call.bounds[0] === 1000)), 'all three cohorts page beyond 1000')
    ok(c.suppressionCalls.every(ids => ids.length <= 100), 'suppression handles bounded groups')
    for (const table of ['profiles', 'kids_orders', 'events']) {
      const f = setup({ tables, failTable: table, failFrom: 1000 }), e = await f.run('?confirm=SEND&limit=1')
      ok(e.status === 503 && f.sends.length === 0 && f.db.writes.length === 0, 'page 2 error fails closed before writes: ' + table)
    }
  },
  async failClosed() {
    for (const options of [{ suppressionError: true }, { eventsDegraded: true }, { quotaError: true }, { quotaCount: 60 }, { providerKey: false }]) {
      const c = setup(options), r = await c.run('?confirm=SEND&limit=1')
      ok([409, 503].includes(r.status) && c.sends.length === 0 && c.db.writes.length === 0, 'unavailable suppression/quota/sender never reserves or sends ' + JSON.stringify(options))
    }
    const c = setup({ claimError: true }); await c.run('?confirm=SEND&limit=1')
    ok(c.sends.length === 0, 'claim failure prevents provider call')
  },
  async sendOnce() {
    const c = setup({ tables: { profiles: [profile('br', { signup_country: 'BR' }), profile('en')], kids_orders: [], events: [], email_send_log: [] } })
    const r = await c.run('?confirm=SEND&limit=1')
    ok(r.body.sent === 1 && c.sends.length === 1 && c.ledgers.length === 1, 'explicit send obeys limit and records provider response')
    ok(c.db.writes.map(w => w.row.name).join(',') === 'kids_launch_email_claim,kids_launch_email_sent', 'claim before send, accepted stamp after provider acceptance')
    ok(c.sends[0].headers['Idempotency-Key'] === c.db.writes[0].row.id, 'provider idempotency key equals durable normalized-person claim')
    ok(c.sends[0].body.subject.includes('1º episódio grátis') && c.sends[0].body.headers['List-Unsubscribe'], 'BR gets Portuguese subject plus house unsubscribe headers')
    await c.run('?confirm=SEND&limit=1'); await c.run('?confirm=SEND&limit=1')
    ok(c.sends.length === 2 && c.db.writes.filter(w => w.row.name === 'kids_launch_email_sent').length === 2, 'repeated batches never resend a sent person')
  },
  async concurrent() {
    const db = memoryDb({ profiles: [profile('one')], kids_orders: [], events: [], email_send_log: [] })
    const a = setup({ db }), b = setup({ db })
    await Promise.all([a.run('?confirm=SEND&limit=1'), b.run('?confirm=SEND&limit=1')])
    ok(a.sends.length + b.sends.length === 1 && db.writes.filter(w => w.row.name === 'kids_launch_email_claim').length === 1, 'concurrent admin calls claim one person exactly once')
  },
  async unresolved() {
    for (const options of [{ timeout: true }, { rejected: true }, { stampError: true }, { ledgerThrows: true }]) {
      const c = setup(options); await c.run('?confirm=SEND&limit=1'); await c.run('?confirm=SEND&limit=1')
      ok(c.sends.length === 1 && c.db.writes.filter(w => w.row.name === 'kids_launch_email_claim').length === 1, 'ambiguous/rejected/stamp/ledger failure keeps claim and never retries blindly ' + JSON.stringify(options))
      if (options.timeout || options.rejected || options.ledgerThrows) ok(!c.db.writes.some(w => w.row.name === 'kids_launch_email_sent'), 'unaccepted/unresolved provider never writes sent event ' + JSON.stringify(options))
    }
  },
  async recheck() {
    for (const mode of ['optout', 'order']) {
      const tables = { profiles: [profile('one'), profile('alias', { email: 'ONE@example.test' })], events: [], kids_orders: [], email_send_log: [] }
      let reread = false
      const c = setup({ tables, beforeRead(call, state, calls) {
        if (call.table === 'profiles' && calls.filter(v => v.table === 'profiles').length > 1 && !reread) {
          reread = true
          if (mode === 'optout') state.profiles[1].email_opted_out = true
          else state.kids_orders.push({ id: 'new-order', user_id: 'alias', status: 'active' })
        }
      } })
      await c.run('?confirm=SEND&limit=1')
      ok(reread && c.sends.length === 0 && c.db.writes.length === 0, 'fresh alias ' + mode + ' before claim cancels send')
    }
  },
  async publicPages() {
    const React = (await import('react')).default, { renderToStaticMarkup } = await import('react-dom/server'), jsxRuntime = await import('react/jsx-runtime')
    const loader = createOfflineLoader({ mocks: {
      react: React, 'react/jsx-runtime': await import('react/jsx-runtime'),
      'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
      '@/components/Footer': { __esModule: true, default: () => null },
      '@/components/ugc/UgcVideo': { __esModule: true, default: () => null },
      '@/components/kidsCartoon/KidsCtaLink': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
      '@/components/kidsCartoon/KidsVendaCards': { KidsVendaCards: () => null },
      '@/components/ugc/UgcPages': { UGC_PAGE_CSS: '' },
    }, source: (_p, text) => text, globals: { React } })
    // The house loader preserves JSX by default; use the pure exported copy/metadata for public contract checks.
    const source = read(PAGE)
    const ts = (await import('typescript')).default
    const vm = await import('node:vm')
    const compile = text => {
      const code = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
      const exports = {}
      vm.runInNewContext(code, { exports, require: spec => spec === 'react/jsx-runtime' ? jsxRuntime : loader(spec), process: { env: {} }, console: { log() {}, warn() {}, error() {} } }, { timeout: 5000 })
      return exports
    }
    const exports = compile(source), previous = compile(git('show', BASE + ':' + PAGE))
    const K = createOfflineLoader()('lib/kidsVenda/kidsVenda.ts')
    const settlement = createOfflineLoader()('lib/settlementCurrency.ts')
    for (const lang of ['en', 'pt']) {
      const copy = exports.kidsPageCopy(lang)
      const answer = Array.isArray(copy.summary) ? copy.summary[0] : copy.summary
      ok(typeof answer === 'string' && answer.trim().split(/\s+/).length >= 40 && answer.trim().split(/\s+/).length <= 60, 'direct answer 40–60 words ' + lang)
      ok(copy.faqs.length === 5, 'exactly five FAQs ' + lang)
      const citation = exports.kidsPageCitation(lang)
      ok(citation.headers.length === 5 && citation.rows.length === 3 && citation.rows.every(row => row.length === 5), 'offer table has all five requested columns and three real options ' + lang)
      ok(citation.rows[1][3].includes(K.kidsPriceLabel(K.KIDS_PRICES.autopilot.usdMinor)) && citation.rows[2][3].includes(K.kidsPriceLabel(K.KIDS_PRICES.pack.usdMinor)), 'offer prices come from canonical live values ' + lang)
      ok(['autopilot', 'pack'].every(kind => citation.currencyNote.includes(settlement.formatSettlementMoney('brl', settlement.settlementAmountMinor(K.KIDS_PRICES[kind].usdMinor, 'brl')))), 'Brazil charges reais from exact house conversion ' + lang)
      ok(citation.currencyNote.includes(lang === 'pt' ? 'reais' : 'reais'), 'Brazil currency note is explicit ' + lang)
      const html = renderToStaticMarkup(React.createElement(exports.KidsCartoonPage, { lang }))
      ok(html.includes('<table') && html.includes('2026-10-22'), 'SSR has citable offer table plus updated date ' + lang)
      ok(/15/.test(html) && /30/.test(html), 'table includes actual duration and episode quantity ' + lang)
      const metadata = exports.kidsPageMetadata(lang)
      ok(JSON.stringify(metadata) === JSON.stringify(previous.kidsPageMetadata(lang)), 'title/description/canonical/hreflang/robots metadata remain exactly unchanged ' + lang)
      ok(JSON.stringify(metadata.alternates).includes(lang === 'pt' ? '/desenho-infantil-3d-com-ia' : '/ai-kids-cartoon-videos'), 'canonical retains localized URL ' + lang)
    }
    ok(K.KIDS_PRICES.autopilot.usdMinor === 2900 && K.KIDS_PRICES.pack.usdMinor === 4900, 'canonical offer still 29/49 USD')
  },
  async instagram() {
    const text = read('docs/CARTOON-INSTAGRAM-2210.md')
    const posts = [...text.matchAll(/^## P\d{2} — (Reel|Carrossel):[^\n]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)]
    ok(posts.length === 12, 'Instagram has twelve complete posts')
    ok(posts.filter(p => p[1] === 'Reel').length === 6 && posts.filter(p => p[1] === 'Carrossel').length === 6, 'Instagram has six Reels plus six carousels')
    for (const [index, post] of posts.entries()) {
      const body = post[2]
      ok(/Legenda PT, com hashtags:/.test(body) && /Legenda EN, com hashtags:/.test(body), 'PT and EN captions for post ' + (index + 1))
      ok(/Gancho do primeiro segundo/.test(body) && /Episódio\/tema/.test(body) && /CTA:/.test(body) && /BRT/.test(body) && /#/.test(body), 'hook/theme/CTA/hashtags/BRT for post ' + (index + 1))
      if (post[1] === 'Reel') ok(/Leo/.test(body), 'Reel uses Leo ' + (index + 1))
    }
    ok(text.includes('BRT') && text.includes('usekineo.com') && !/renda garantida|ganhe dinheiro|guaranteed income|earn money/i.test(text), 'BRT, website CTA and no income promise')
  },
  async exactUndo() {
    const { semCartoonTracao2210: undo, CARTOON_TRACAO_HUNKS: hunks, CARTOON_TRACAO_MARK: marker } = await import('./test-support/desfaz-cartoon-tracao-2210.mjs')
    const expected = [PAGE, 'lib/lifecycle/emailEvents.ts', '.github/workflows/guardiao.yml', 'scripts/test-support/desfaz-kids-venda-2010.mjs', 'scripts/test-support/desfaz-ads-cena-95-plan-failed-2110.mjs', 'scripts/test-support/desfaz-ads-cena-95-pacing-2110.mjs', 'scripts/test-ads-cena-95-pacing-2110.mjs']
    ok(JSON.stringify(Object.keys(hunks)) === JSON.stringify(expected), 'undo has exact seven existing task sources, no unrelated source')
    for (const [file, changes] of Object.entries(hunks)) {
      const candidate = read(file), base = git('show', BASE + ':' + file).replace(/\r\n/g, '\n')
      ok(undo(candidate, file) === base, 'exact reverse to immutable base: ' + file)
      ok(undo(candidate.replace(/\n/g, '\r\n'), file) === base.replace(/\n/g, '\r\n'), 'CRLF exact reverse: ' + file)
      ok(undo(base, file) === base && undo(candidate, file.replace(/\//g, '\\')) === base, 'base idempotence plus Windows paths: ' + file)
      ok(undo('// outside edit\n' + candidate, file) === '// outside edit\n' + base, 'edits outside exact task hunks survive: ' + file)
      assert.throws(() => assert.equal(undo('X' + candidate, file), base), assert.AssertionError, 'one-character mutation outside task hunks remains red against the immutable base: ' + file)
      checks++
      // Context-sensitive replacements must never hide later edits inside an owned hunk.
      for (const [index, hunk] of changes.entries()) {
        ok(candidate.split(hunk.after).length === 2, 'candidate hunk applies once: ' + file + '#' + index)
        const at = candidate.indexOf(hunk.after), offset = Math.floor(hunk.after.length / 2)
        const changed = candidate.slice(0, at + offset) + (candidate[at + offset] === 'X' ? 'Y' : 'X') + candidate.slice(at + offset + 1)
        for (const malformed of [changed, candidate.replace(hunk.after, ''), candidate + '\n' + hunk.after]) {
          const marked = malformed.includes(marker) ? malformed : malformed + '\n// ' + marker
          assert.throws(() => undo(marked, file), /expected exactly 1 candidate match/, 'tampered/missing/duplicate hunk is rejected')
          checks++
        }
      }
    }
    ok(undo('outside ' + marker, 'unrelated.ts') === 'outside ' + marker, 'unrelated source untouched')
    for (const file of [ROUTE, HELPER, 'docs/CARTOON-INSTAGRAM-2210.md', 'scripts/test-cartoon-tracao.mjs', 'scripts/test-support/desfaz-cartoon-tracao-2210.mjs', 'scripts/test-support/desfaz-cartoon-tracao-2210-hunks.json']) {
      let existed = true
      try { git('cat-file', '-e', BASE + ':' + file) } catch { existed = false }
      ok(fs.existsSync(file) && !existed, 'new task file absent at base: ' + file)
    }
  },
  async historicalHashChain() {
    const { semCartoonTracao2210: undo } = await import('./test-support/desfaz-cartoon-tracao-2210.mjs')
    const { compileOffline } = await import('./test-support/truncamento-dedupe-offline.mjs')
    const pacingFile = 'scripts/test-support/desfaz-ads-cena-95-pacing-2110.mjs'
    const dependencies = { 'node:fs': { readFileSync: fs.readFileSync }, 'node:crypto': await import('node:crypto'), 'node:path': await import('node:path'), 'node:url': await import('node:url'), './desfaz-cartoon-tracao-2210.mjs': { semCartoonTracao2210: undo } }
    const compile = source => compileOffline(source.replace('fileURLToPath(import.meta.url)', JSON.stringify(path.join(ROOT, pacingFile))), dependencies).semAdsCena95Pacing2110
    const source = read(pacingFile), pacing = compile(source)
    const file = 'scripts/test-support/desfaz-ads-cena-95-plan-failed-2110.mjs'
    const snapshots = JSON.parse(read('scripts/test-support/desfaz-ads-cena-95-pacing-2110-fontes.json'))
    ok(pacing(read(file), file) === snapshots[file].before, 'direct pacing callers remove exact Cartoon delta before preserving the historical hash')
    const unrelated = 'X' + undo(read(file), file)
    assert.throws(() => pacing(unrelated, file), /fonte divergente/, 'historical whole-source hash still rejects any other edit')
    checks++
    const withoutAdapter = compile(source.replace('texto = semCartoonTracao2210(texto, file)', 'texto = texto'))
    assert.throws(() => withoutAdapter(read(file), file), /fonte divergente/, 'in-memory mutant removing direct adapter breaks the actual direct caller')
    checks++
    const withoutStrictHash = compile(source.replace('if (hash !== known.afterHash) throw', 'if (false) throw'))
    ok(withoutStrictHash(unrelated, file) === snapshots[file].before, 'in-memory mutant bypassing historical hash wrongly accepts unrelated edit and is detected')
  },
  async scope() {
    const { CARTOON_TRACAO_HUNKS: hunks } = await import('./test-support/desfaz-cartoon-tracao-2210.mjs')
    const allowed = new Set([...Object.keys(hunks), ROUTE, HELPER,
      'scripts/test-cartoon-tracao.mjs', 'scripts/test-support/desfaz-cartoon-tracao-2210.mjs', 'scripts/test-support/desfaz-cartoon-tracao-2210-hunks.json',
      'docs/CARTOON-INSTAGRAM-2210.md', 'docs/CARTOON-TRACAO-2210.md',
      'docs/previews/cartoon-tracao-2210.html', 'docs/previews/cartoon-tracao-2210-en-desktop.png', 'docs/previews/cartoon-tracao-2210-en-mobile.png',
      'docs/previews/cartoon-tracao-2210-pt-desktop.png', 'docs/previews/cartoon-tracao-2210-pt-mobile.png'])
    const changed = git('diff', '--name-only', BASE).trim().split('\n').filter(Boolean)
    const untracked = git('ls-files', '--others', '--exclude-standard').trim().split('\n').filter(Boolean)
    const assertScope = files => assert.ok(files.length > 0 && files.every(file => allowed.has(file)), 'finite Cartoon scope violated: ' + files.filter(file => !allowed.has(file)).join(', '))
    assertScope([...changed, ...untracked]); checks++
    assert.throws(() => assertScope([...changed, 'lib/compose.ts']), assert.AssertionError, 'in-memory scope mutant adding an unrelated production path is red'); checks++
    assert.throws(() => assertScope([...changed, 'docs/unrelated.md']), assert.AssertionError, 'in-memory scope mutant adding an unrelated document is red'); checks++
    const subjects = git('log', '--format=%s', BASE + '..HEAD').trim().split('\n').filter(Boolean)
    ok(subjects.length > 0 && subjects.every(subject => subject.includes('[TRAVA 8.2 — vai do fundador 22/10 "de 1 ao 4, vamos dar tração em todas"]')), 'all current task commits carry the full founder authorization token')
  },
}

const selectedCase = process.argv.find(a => a.startsWith('--case='))?.slice(7)
if (selectedCase) {
  assert.ok(cases[selectedCase], 'known case'); await cases[selectedCase](); console.log(`PASS ${selectedCase}: ${checks} checks`)
} else {
  for (const [name, run] of Object.entries(cases)) {
    if (process.argv.includes('--campaign-only') && ['publicPages', 'instagram'].includes(name)) continue
    await run(); console.log('PASS ' + name)
  }
  for (const p of ['lib/engineWall.ts', 'lib/homeVideoCuration.ts', 'lib/kidsVenda/kidsVenda.ts']) ok(read(p) === git('show', BASE + ':' + p).replace(/\r\n/g, '\n'), 'protected source unchanged: ' + p)
  const events = createOfflineLoader()('lib/lifecycle/emailEvents.ts').LIFECYCLE_EMAIL_EVENT_NAMES
  ok(events.includes('kids_launch_email_sent') && !events.includes('kids_launch_email_claim'), 'canonical suppression registers sent only, never attempt/claim')
  if (process.argv.includes('--mutants')) {
    const mutants = [
      ['dry-run sends', ROUTE, "const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'", 'const confirm = true', 'dryRun'],
      ['optional send limit', ROUTE, 'if (confirm && (!rawLimit ||', 'if (false && (!rawLimit ||', 'confirmation'],
      ['admin bypass', ROUTE, "if (!user || !ADMIN_EMAILS.has((user.email ?? '').trim().toLowerCase()))", 'if (false)', 'confirmation'],
      ['optout alias ignored', HELPER, 'p.email_opted_out || blockedIds.has(p.id)', 'blockedIds.has(p.id)', 'cohort'],
      ['internal account admitted', HELPER, '|| isInternalEmail(email)', '|| false', 'cohort'],
      ['dedupe removed', HELPER, '|| used.has(email)', '|| false', 'cohort'],
      ['BR language wrong', HELPER, "=== 'BR' ? 'pt' : 'en'", "=== 'ZZ' ? 'pt' : 'en'", 'cohort'],
      ['suppression degraded ignored', ROUTE, 'if (suppression.degraded || suppression.eventsDegraded)', 'if (false)', 'failClosed'],
      ['quota bypass', ROUTE, "if (quota.error || typeof quota.count !== 'number' || quota.count + selected.length > Math.floor(dailyCap() * 0.6))", 'if (false)', 'failClosed'],
      ['claim failure ignored', ROUTE, 'if (claim.error) {', 'if (false) {', 'concurrent'],
      ['recheck removed', ROUTE, 'const fresh = await prepare(admin, aliases)', 'const fresh = { recipients }', 'recheck'],
      ['provider rejection stamped', ROUTE, "if (!res.ok) { results.push({ id: current.id, outcome: 'provider_rejected_no_retry' }); break }", '', 'unresolved'],
      ['pagination truncates', 'lib/supabase/readAll.ts', 'if (data.length < POSTGREST_PAGE_SIZE)', 'if (true)', 'pagination'],
      ['citation price drift', PAGE, 'const monthly = kidsPriceLabel(KIDS_PRICES.autopilot.usdMinor)', 'const monthly = kidsPriceLabel(KIDS_PRICES.autopilot.usdMinor + 100)', 'publicPages'],
      ['Brazil charged USD', PAGE, "const monthlyBrl = formatSettlementMoney('brl', settlementAmountMinor(KIDS_PRICES.autopilot.usdMinor, 'brl'))", "const monthlyBrl = formatSettlementMoney('usd', settlementAmountMinor(KIDS_PRICES.autopilot.usdMinor, 'usd'))", 'publicPages'],
      ['sixth FAQ', PAGE, 'faqs: (pt ? [', "faqs: (pt ? [{ q: 'extra question', a: 'extra answer' },", 'publicPages'],
      ['changed canonical title', PAGE, 'title: { absolute: c.title }', "title: { absolute: 'Changed title' }", 'publicPages'],
    ]
    for (const [name, file, from, to, target] of mutants) {
      const absolute = path.join(ROOT, file), before = fs.readFileSync(absolute), candidate = before.toString('utf8')
      assert.equal(candidate.split(from).length - 1, 1, 'mutant applies once: ' + name)
      let killed = false
      try {
        fs.writeFileSync(absolute, candidate.replace(from, to))
        try { await cases[target]() } catch (error) { killed = error instanceof assert.AssertionError; if (!killed) throw error }
      } finally {
        fs.writeFileSync(absolute, before)
        assert.deepEqual(fs.readFileSync(absolute), before, 'byte-exact disk restore: ' + name)
      }
      ok(killed, 'behavior kills disk mutant: ' + name)
      console.log('MUTANT KILLED + BYTE-EXACT RESTORE ' + name)
    }
  }
  console.log(`cartoon-tracao: ${checks} checks passed; fixture-only, no real provider/network/database`)
}
