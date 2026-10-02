// KINEO-LACOS-POST-TO-EARN-2026-10-02 — guardião (laços C4): a fila `pending` do "Cole o link e ganhe" tem porta.
// Prova executando app/api/admin/post-to-earn/route.ts com banco falso: (1) a guarda é a das rotas irmãs (não-admin
// = 403, sem tocar no banco); (2) GET lista paginada por status, sem `ip`; (3) aprovar = update condicional
// pending→granted ANTES do add_video_credits, crédito do valor da fonte (POST_TO_EARN_CREDITS), rastro
// admin_credits_granted; (4) idempotente: repetir ou aprovar em paralelo paga UMA vez; (5) crédito falhou → o claim
// volta para pending; (6) recusar exige motivo e grava 'rejected'; (7) mutante: sem o update condicional, o paralelo
// paga duas vezes e o guardião pega. Estilo readFileSync + transpile.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function compile(src, mocks = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(js, {
    module: mod, exports: mod.exports, URL, URLSearchParams, Promise, Date, Number, Math, Array, Object, JSON, Error,
    console: { log() {}, warn() {}, error() {} }, process: { env: {} },
    require: (id) => { if (Object.hasOwn(mocks, id)) return mocks[id]; throw new Error('import inesperado: ' + id) },
  })
  return mod.exports
}

const P2E = compile(read('lib/postToEarn.ts'))
const PREMIO = P2E.POST_TO_EARN_CREDITS
const ROUTE = 'app/api/admin/post-to-earn/route.ts'
const SRC = read(ROUTE)
const UID = '11111111-1111-4111-8111-111111111111'
const CID = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`

function fakeDb(state) {
  return {
    touched: () => state.touched,
    rpc: async (name, args) => { state.touched = true; state.rpc.push({ name, args }); return { error: state.rpcFail ? { message: 'rpc down' } : null } },
    from(table) {
      state.touched = true
      const q = { op: 'select', filters: [], vals: null, rng: null, cols: null }
      const rows = () => (state.tables[table] ||= [])
      const match = () => rows().filter((r) => q.filters.every(([c, v]) => r[c] === v))
      const run = () => {
        if (q.op === 'insert') { rows().push(...(Array.isArray(q.vals) ? q.vals : [q.vals])); return { data: null, error: null } }
        if (q.op === 'update') { const m = match(); m.forEach((r) => Object.assign(r, q.vals)); return { data: m.map((r) => ({ id: r.id })), error: null } }
        const m = match()
        const proj = (r) => (q.cols ? Object.fromEntries(q.cols.map((c) => [c, r[c]])) : { ...r })
        return { data: (q.rng ? m.slice(q.rng[0], q.rng[1] + 1) : m).map(proj), error: null, count: m.length }
      }
      Object.assign(q, {
        select(cols) { if (q.op === 'select' && typeof cols === 'string' && cols !== '*') q.cols = cols.split(',').map((c) => c.trim()); return q }, order() { return q },
        update(v) { q.op = 'update'; q.vals = v; return q },
        insert(v) { q.op = 'insert'; q.vals = v; return q },
        eq(c, v) { q.filters.push([c, v]); return q },
        range(a, b) { q.rng = [a, b]; return q },
        maybeSingle: async () => ({ data: run().data[0] ?? null, error: null }),
        then(res, rej) { return Promise.resolve().then(run).then(res, rej) },
      })
      return q
    },
  }
}
function setup({ admin = true, rpcFail = false, claims, src = SRC } = {}) {
  const state = {
    touched: false, rpc: [], rpcFail,
    tables: {
      post_to_earn_claims: claims ?? [
        { id: CID(1), user_id: UID, youtube_video_id: 'vid00000001', credits: 0, status: 'pending', reason: 'no_youtube_api_key', verification: 'no_youtube_api_key', ip: '203.0.113.9', created_at: '2026-09-20T00:00:00Z' },
        { id: CID(2), user_id: UID, youtube_video_id: 'vid00000002', credits: 0, status: 'pending', reason: 'no_kineo_credit_link', ip: '203.0.113.9', created_at: '2026-09-21T00:00:00Z' },
        { id: CID(3), user_id: UID, youtube_video_id: 'vid00000003', credits: 3, status: 'granted', reason: null, ip: null, created_at: '2026-09-01T00:00:00Z' },
      ],
      events: [], posted_shorts: [{ user_id: UID, youtube_video_id: 'vid00000001' }],
    },
  }
  const db = fakeDb(state)
  const R = compile(src, {
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: admin ? { email: 'founder@example.test' } : { email: 'cliente@example.test' } } }) } }) },
    '../_shared/db': { isAdminEmail: (e) => e === 'founder@example.test', serviceClient: () => db },
    '@/lib/postToEarn': P2E,
  })
  const post = (body) => R.POST({ json: async () => body })
  const get = (qs = '') => R.GET({ url: `https://www.usekineo.com/api/admin/post-to-earn${qs}` })
  const claim = (n) => state.tables.post_to_earn_claims.find((c) => c.id === CID(n))
  return { state, post, get, claim }
}

console.log('== 1. guarda ==')
{
  const { post, get, state } = setup({ admin: false })
  const a = await get(); const b = await post({ claim_id: CID(1), action: 'approve' })
  ok(a.status === 403 && b.status === 403 && !state.touched, 'não-admin: 403 no GET e no POST, sem tocar no banco')
}
ok(/import \{ isAdminEmail, serviceClient \} from '\.\.\/_shared\/db'/.test(SRC) && /if \(!user \|\| !isAdminEmail\(user\.email\)\)/.test(SRC) && /if \(!user \|\| !isAdminEmail\(user\.email\)\)/.test(read('app/api/admin/grant-credits/route.ts')), 'a guarda é a mesma da rota irmã grant-credits')

console.log('== 2. GET lista paginada ==')
{
  const { get } = setup()
  const r = await get('?status=pending&limit=1&page=0')
  ok(r.status === 200 && r.body.total === 2 && r.body.claims.length === 1 && r.body.has_more === true, 'pendentes: total 2, página de 1, has_more')
  ok(r.body.claims.every((c) => !('ip' in c)) && r.body.claims[0].watch_url.startsWith('https://www.youtube.com/shorts/'), 'sem ip; com o link do Short para revisar')
  const g = await get('?status=granted')
  ok(g.body.status === 'granted' && g.body.total === 1, 'filtro por status (granted)')
  ok((await get('?status=lixo')).body.status === 'pending', 'status inválido cai em pending')
  ok(r.body.reward_credits === PREMIO, `o prêmio exibido vem da fonte (${PREMIO})`)
}

console.log('== 3-4. aprovar, uma vez só ==')
{
  const { post, state, claim } = setup()
  const r = await post({ claim_id: CID(1), action: 'approve' })
  const c = claim(1)
  ok(r.status === 200 && c.status === 'granted' && c.credits === PREMIO && c.reviewed_by === 'founder@example.test' && c.granted_at, 'aprovar: granted, créditos da fonte, revisor e data')
  ok(state.rpc.length === 1 && state.rpc[0].name === 'add_video_credits' && state.rpc[0].args.p_user === UID && state.rpc[0].args.p_amount === PREMIO, 'aprovar: add_video_credits(p_user, p_amount) uma vez')
  const ev = state.tables.events.map((e) => e.name)
  const adm = state.tables.events.find((e) => e.name === 'admin_credits_granted')
  ok(ev.includes('admin_credits_granted') && adm.metadata.amount === PREMIO && adm.metadata.claim_id === CID(1) && adm.metadata.granted_by && ev.includes('post_to_earn_claimed'), 'rastro: admin_credits_granted (quanto, quem, claim) + post_to_earn_claimed')
  ok(state.tables.posted_shorts[0].reward_credits === PREMIO, 'espelho no card do /wall')
  const again = await post({ claim_id: CID(1), action: 'approve' })
  ok(again.body.already === true && state.rpc.length === 1, 'repetir o clique: devolve o estado, não paga de novo')
  const rej = await post({ claim_id: CID(1), action: 'reject', reason: 'mudei de ideia' })
  ok(rej.body.already === true && claim(1).status === 'granted', 'recusar um claim já pago não muda nada')
}
{
  const { post, state } = setup()
  const [a, b] = await Promise.all([post({ claim_id: CID(2), action: 'approve' }), post({ claim_id: CID(2), action: 'approve' })])
  ok(state.rpc.length === 1 && [a.status, b.status].sort().join(',') === '200,409', 'duas abas aprovando juntas: uma paga, a outra recebe 409')
}

console.log('== 5. crédito falhou → volta para pending ==')
{
  const { post, state, claim } = setup({ rpcFail: true })
  const r = await post({ claim_id: CID(1), action: 'approve' })
  const c = claim(1)
  ok(r.status === 500 && c.status === 'pending' && c.credits === 0 && c.granted_at === null && c.reviewed_by === null && c.reason === 'no_youtube_api_key' && c.verification === 'no_youtube_api_key', 'o claim volta inteiro para pending (com o motivo original)')
  ok(!state.tables.events.some((e) => e.name === 'admin_credits_granted'), 'sem crédito, sem evento de concessão')
}
ok(SRC.indexOf(".eq('status', 'pending')\n      .select('id')\n    if (winErr)") > 0 && SRC.indexOf('if (winErr)') < SRC.indexOf("admin.rpc('add_video_credits'"), 'fonte: o update condicional vem ANTES do crédito')

console.log('== 6. recusar ==')
{
  const { post, state, claim } = setup()
  const semMotivo = await post({ claim_id: CID(2), action: 'reject' })
  ok(semMotivo.status === 400 && claim(2).status === 'pending', 'recusar sem motivo: 400, nada muda')
  const r = await post({ claim_id: CID(2), action: 'reject', reason: 'sem link de crédito na descrição' })
  ok(r.status === 200 && claim(2).status === 'rejected' && claim(2).reason === 'sem link de crédito na descrição' && state.rpc.length === 0, 'recusar: rejected + motivo, nenhum crédito')
  ok(state.tables.events.some((e) => e.name === 'post_to_earn_rejected' && e.metadata.reason === 'admin_rejected'), 'recusa vira evento com motivo')
  ok((await post({ claim_id: 'nao-e-uuid', action: 'approve' })).status === 400 && (await post({ claim_id: CID(1), action: 'pagar' })).status === 400, 'claim_id e action validados')
}
ok(!/'approved'/.test(SRC.replace(/\/\/.*$/gm, '')), "status 'approved' não existe na constraint (granted/pending/rejected) e não é usado")

console.log('== 7. mutante ==')
{
  const mut = SRC.replace(".eq('id', claimId)\n      .eq('status', 'pending')\n      .select('id')\n    if (winErr)", ".eq('id', claimId)\n      .select('id')\n    if (winErr)")
  const { post, state } = setup({ src: mut })
  await Promise.all([post({ claim_id: CID(2), action: 'approve' }), post({ claim_id: CID(2), action: 'approve' })])
  ok(mut !== SRC && state.rpc.length === 2, 'mutante: sem o update condicional, o paralelo paga duas vezes — a prova 3-4 pega')
}

console.log(`\n  ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
