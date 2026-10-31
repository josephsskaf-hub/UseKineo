// KINEO-PUBLICAR-GANHAR-3110 — guardião do "Publish & earn" (fundador 31/10: "vai publicar").
//   · a tela de filme pronto oferece "Publish your film — get 10 credits each time someone makes their own version"; o
//     cartão NUNCA publica sozinho (só o clique chama /api/video/visibility, source 'publish_earn');
//   · o cron /api/cron/remix-reward paga 10 créditos ao dono do filme de origem quando a conta que chegou por ele
//     (remix_signup) TERMINA o primeiro filme — 1x por conta indicada, teto 100/mês, nunca para si, nunca interna,
//     dry-run sem ?confirm=SEND, evento remix_reward_granted só do servidor.
// O pagador (lib/publicarGanhar3110Server.ts) roda DE VERDADE contra um banco falso em memória (readAll real, paginado).
// Cada regra roda contra o código real (tem de passar) e contra MUTANTES (cada um tem de derrubar a sua regra).
// Rodar: node scripts/test-publicar-ganhar-3110.mjs
import { readFileSync } from 'node:fs'
import crypto from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const FILES = {
  lib: 'lib/publicarGanhar3110.ts',
  server: 'lib/publicarGanhar3110Server.ts',
  readAll: 'lib/supabase/readAll.ts',
  cron: 'app/api/cron/remix-reward/route.ts',
  cta: 'components/PublishEarnCta.tsx',
  visibility: 'app/api/video/visibility/route.ts',
  events: 'app/api/events/route.ts',
  ledger: 'lib/admin/ledgerGrants.ts',
  generate: 'app/(dashboard)/generate/GenerateClient.tsx',
  vercel: 'vercel.json',
}
const REAL = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, read(p)]))

const compile = (src, requireMap = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exports = {}
  const require = (id) => {
    if (id in requireMap) return requireMap[id]
    throw new Error(`import inesperado: ${id}`)
  }
  vm.runInNewContext(js, { exports, require, console: { warn() {}, error() {}, log() {} }, Date, Map, Set, Array, Object, String, Number, Math, RegExp, Promise, Error, JSON, parseInt })
  return exports
}

// ── banco falso: from().select/eq/gte/in/order/range + insert/delete; rpc add_video_credits ──
const NOW = new Date('2026-10-31T15:00:00Z')
function fakeDb(seed, { failRpc = false, onFirstInsert = null } = {}) {
  const t = JSON.parse(JSON.stringify(seed))
  const calls = { rpc: [], inserts: 0, attempts: 0 }
  let tick = 0
  const from = (table) => {
    const st = { filters: [], order: [], range: null, op: 'select', row: null }
    const api = {
      select() { return api },
      eq(c, v) { st.filters.push((r) => r[c] === v); return api },
      gte(c, v) { st.filters.push((r) => String(r[c]) >= v); return api },
      in(c, vs) { st.filters.push((r) => vs.includes(r[c])); return api },
      order(c, o) { st.order.push([c, o.ascending]); return api },
      range(a, b) { st.range = [a, b]; return api },
      insert(row) { st.op = 'insert'; st.row = row; return api },
      delete() { st.op = 'delete'; return api },
      then(res, rej) { return Promise.resolve().then(exec).then(res, rej) },
    }
    function exec() {
      const rows = (t[table] ??= [])
      if (st.op === 'insert') {
        calls.attempts += 1
        // corrida simulada: outra rodada do cron grava um pagamento ANTES deste insert (invisível na leitura inicial)
        if (calls.attempts === 1 && onFirstInsert) onFirstInsert(rows)
        if (rows.some((r) => r.id && r.id === st.row.id)) return { error: { code: '23505', message: 'dup' } }
        calls.inserts += 1
        rows.push({ id: st.row.id ?? `gen-${tick}`, created_at: new Date(NOW.getTime() + ++tick * 1000).toISOString(), path: null, ...st.row })
        return { error: null }
      }
      if (st.op === 'delete') { t[table] = rows.filter((r) => !st.filters.every((f) => f(r))); return { error: null } }
      let out = rows.filter((r) => st.filters.every((f) => f(r)))
      for (const [c, asc] of [...st.order].reverse()) out = [...out].sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1))
      if (st.range) out = out.slice(st.range[0], st.range[1] + 1)
      return { data: out, error: null }
    }
    return api
  }
  const rpc = async (fn, args) => {
    calls.rpc.push({ fn, ...args })
    if (failRpc) return { error: { message: 'boom' } }
    t.credits = t.credits ?? {}
    t.credits[args.p_user] = (t.credits[args.p_user] ?? 0) + args.p_amount
    return { error: null }
  }
  return { db: { from, rpc }, t, calls }
}

const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const OWNER = uid(1), OWNER_EMAIL = 'maker.one@gmail.com'
const VIDEO = uid(900)
const signup = (referred, at = '2026-10-30T10:00:00Z', src = VIDEO) => ({ id: `s-${referred}`, name: 'remix_signup', user_id: referred, created_at: at, path: '/api/remix/signup', metadata: { source_video_id: src } })
const film = (user, status = 'completed') => ({ id: `v-${user}-${status}`, user_id: user, status })
const prof = (id, email) => ({ id, email })
const baseSeed = (extra = {}) => ({
  events: [...(extra.events ?? [])],
  videos: [{ id: VIDEO, user_id: OWNER, status: 'completed' }, ...(extra.videos ?? [])],
  profiles: [prof(OWNER, OWNER_EMAIL), ...(extra.profiles ?? [])],
})
const paid = (owner, referred, credits, at, path = '/api/cron/remix-reward') => ({ id: `p-${referred}`, name: 'remix_reward_granted', user_id: owner, created_at: at, path, metadata: { referred_user_id: referred, credits, granted: true } })

function rules(S) {
  const R = []
  const rule = async (id, fn) => { let okv = false; try { okv = !!(await fn()) } catch { okv = false } R.push([id, okv]) }
  const L = (() => { try { return compile(S.lib) } catch { return {} } })()
  const RA = (() => { try { return compile(S.readAll, { '../serverEvents': { writeServerEvent: async () => true } }) } catch { return {} } })()
  const SV = (() => {
    try {
      return compile(S.server, {
        'node:crypto': crypto,
        '@/lib/supabase/readAll': RA,
        '@/lib/internalAccounts': { isInternalEmail: (e) => /@kineo\.internal$/.test(String(e ?? '')) },
        './publicarGanhar3110': L,
      })
    } catch { return {} }
  })()
  const run = async (seed, opts = {}) => {
    const f = fakeDb(seed, opts)
    const res = await SV.runRemixRewards(f.db, { dryRun: opts.dryRun ?? false, now: NOW })
    return { ...f, res }
  }

  return (async () => {
    // ── a tela: oferta honesta, publica só no clique ──────────────────────────────────────────────────
    await rule('T1 a copy diz o número de verdade: 10 créditos por versão, até 100 por mês', () =>
      L.REMIX_REWARD_CREDITS === 10 && L.REMIX_REWARD_MONTHLY_CAP === 100
      && /10 credits each time someone makes their own version/.test(L.PUBLISH_EARN_COPY.body) && /up to 100 credits a month/.test(L.PUBLISH_EARN_COPY.body)
      && /Nothing is public until you press/.test(L.PUBLISH_EARN_COPY.fine))
    await rule('T2 o cartão NUNCA publica sozinho: o fetch de visibilidade só existe em publish(), e publish só no onClick', () => {
      const c = S.cta
      const effects = [...c.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[/g)].map((m) => m[1]).join('\n') + [...c.matchAll(/useEffect\(\(\) => \{[^\n]*\}, \[/g)].map((m) => m[0]).join('\n')
      const fetches = c.split("fetch('/api/video/visibility'").length - 1
      const pub = c.slice(c.indexOf('async function publish()'), c.indexOf('async function copy()'))
      const calls = (c.match(/\bpublish\(\)/g) ?? []).length
      return fetches === 1 && pub.includes("fetch('/api/video/visibility'") && !/publish\(|fetch\(/.test(effects)
        && calls === 1 && /onClick=\{publish\}/.test(c) && pub.includes("action: 'publish'") && pub.includes('source: PUBLISH_EARN_SOURCE')
    })
    await rule('T3 placar: publish_cta_shown ao aparecer (1x por filme), publish_cta_clicked no clique', () =>
      /useEffect\(\(\) => \{\n    if \(shownRef\.current === videoId\) return[\s\S]*?trackEvent\('publish_cta_shown'/.test(S.cta)
      && S.cta.slice(S.cta.indexOf('async function publish()')).includes("trackEvent('publish_cta_clicked'"))
    await rule('T4 publicado: mostra o link /v/<id> com Copiar e Compartilhar', () =>
      /buildPublishedVideoSharePath\(videoId/.test(S.cta) && S.cta.includes('{url}') && S.cta.includes('onClick={share}') && S.cta.includes('onClick={copy}'))
    await rule('T5 a rota de visibilidade aceita a origem publish_earn (e continua exigindo dono + filme pronto)', () =>
      /VISIBILITY_SOURCES = \[[^\]]*'publish_earn'/.test(S.visibility) && S.visibility.includes("row.user_id !== user.id") && S.visibility.includes("row.status !== 'completed'"))
    await rule('T6 a tela de filme pronto monta o cartão com o filme salvo e marca publicado no sucesso', () =>
      /<PublishEarnCta[\s\S]{0,200}videoId=\{publicVideoId\}[\s\S]{0,200}onPublished=\{\(\) => setPublicPagePublished\(true\)\}/.test(S.generate)
      && /import PublishEarnCta from '@\/components\/PublishEarnCta'/.test(S.generate))

    // ── o pagamento ───────────────────────────────────────────────────────────────────────────────────
    const R1 = uid(11), R2 = uid(12)
    await rule('P1 conta indicada terminou o 1º filme → dono ganha 10 pelo RPC atômico, com evento auditável', async () => {
      const { res, t, calls } = await run(baseSeed({ events: [signup(R1)], videos: [film(R1)], profiles: [prof(R1, 'new.person@yahoo.com')] }))
      const ev = t.events.find((e) => e.name === 'remix_reward_granted')
      return res.granted === 1 && calls.rpc.length === 1 && calls.rpc[0].fn === 'add_video_credits' && calls.rpc[0].p_user === OWNER && calls.rpc[0].p_amount === 10
        && ev && ev.user_id === OWNER && ev.path === '/api/cron/remix-reward' && ev.metadata.source_video_id === VIDEO && ev.metadata.referred_user_id === R1 && ev.metadata.credits === 10
    })
    await rule('P2 sem filme COMPLETO (só processing/failed) → nenhum crédito', async () => {
      const { res, calls } = await run(baseSeed({ events: [signup(R1)], videos: [film(R1, 'processing'), film(R1, 'failed')], profiles: [prof(R1, 'a@b.co')] }))
      return res.granted === 0 && calls.rpc.length === 0 && res.skipped.no_completed_film === 1
    })
    await rule('P3 nunca para si mesmo: mesma conta, ou mesma caixa de e-mail (pontos/+etiqueta do Gmail)', async () => {
      const noEmail = baseSeed({ events: [signup(OWNER)] }); noEmail.profiles = [] // só o id prova "mesma conta"
      const a = await run(noEmail)
      const b = await run(baseSeed({ events: [signup(R1)], videos: [film(R1)], profiles: [prof(R1, 'Maker.One+alt@googlemail.com')] }))
      return a.calls.rpc.length === 0 && a.res.skipped.self === 1 && b.calls.rpc.length === 0 && b.res.skipped.self === 1
    })
    await rule('P4 conta interna (dono ou indicado) não ganha', async () => {
      const { calls, res } = await run(baseSeed({ events: [signup(R1)], videos: [film(R1)], profiles: [prof(R1, 'qa@kineo.internal')] }))
      return calls.rpc.length === 0 && res.skipped.internal === 1
    })
    await rule('P5 teto do mês: 12 indicados prontos → só 10 pagos (100 créditos); 95 já pagos no mês → nada', async () => {
      const many = Array.from({ length: 12 }, (_, i) => uid(100 + i))
      const a = await run(baseSeed({ events: many.map((r, i) => signup(r, `2026-10-2${i % 9}T0${i % 9}:00:00Z`)), videos: many.map((r) => film(r)), profiles: many.map((r, i) => prof(r, `p${i}@x.co`)) }))
      const old = [paid(OWNER, uid(500), 50, '2026-10-02T00:00:00Z'), paid(OWNER, uid(501), 45, '2026-10-03T00:00:00Z'), paid(OWNER, uid(502), 90, '2026-09-20T00:00:00Z')]
      const b = await run(baseSeed({ events: [...old, signup(R1)], videos: [film(R1)], profiles: [prof(R1, 'q@x.co')] }))
      const c = await run(baseSeed({ events: [paid(OWNER, uid(500), 90, '2026-10-02T00:00:00Z'), signup(R1)], videos: [film(R1)], profiles: [prof(R1, 'q@x.co')] }))
      const d = (used) => L.decideRemixReward({ referredUserId: R1, ownerUserId: OWNER, referredCompletedFilms: 1, alreadyRewarded: false, ownerCreditsThisMonth: used, ownerInternal: false, referredInternal: false })
      return a.res.granted === 10 && a.t.credits[OWNER] === 100 && a.res.skipped.monthly_cap === 2
        && b.calls.rpc.length === 0 && b.res.skipped.monthly_cap === 1 && c.res.granted === 1
        && d(95).grant === false && d(95).reason === 'monthly_cap' && d(90).grant === true && d(100).grant === false
    })
    await rule('P13 corrida do teto: outra rodada pagou no meio do caminho → a linha que estoura é apagada e não credita', async () => {
      const onFirstInsert = (rows) => rows.push(paid(OWNER, uid(700), 95, new Date(NOW.getTime() - 1000).toISOString()))
      const { res, t, calls } = await run(baseSeed({ events: [signup(R1)], videos: [film(R1)], profiles: [prof(R1, 'n@x.co')] }), { onFirstInsert })
      return res.granted === 0 && calls.rpc.length === 0 && res.skipped.monthly_cap === 1
        && !t.events.some((e) => e.name === 'remix_reward_granted' && e.metadata?.referred_user_id === R1)
    })
    await rule('P6 idempotente: rodar de novo não paga duas vezes; corrida (id já no banco) dá 23505 e não credita', async () => {
      const seed = baseSeed({ events: [signup(R1)], videos: [film(R1)], profiles: [prof(R1, 'n@x.co')] })
      const first = await run(seed)
      const second = fakeDb(first.t)
      const r2 = await SV.runRemixRewards(second.db, { dryRun: false, now: NOW })
      const race = await run(baseSeed({ events: [signup(R1), { id: SV.remixRewardClaimId(R1), name: 'something_else', user_id: OWNER, created_at: '2026-10-31T00:00:00Z', path: null, metadata: {} }], videos: [film(R1)], profiles: [prof(R1, 'n@x.co')] }))
      return first.res.granted === 1 && r2.granted === 0 && second.calls.rpc.length === 0 && second.calls.attempts === 0
        && race.calls.rpc.length === 0 && race.res.granted === 0
        && SV.remixRewardClaimId(R1) === SV.remixRewardClaimId(R1) && SV.remixRewardClaimId(R1) !== SV.remixRewardClaimId(R2)
        && /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(SV.remixRewardClaimId(R1))
    })
    await rule('P7 crédito falhou → a autorização é apagada (a conta pode ser paga na próxima rodada)', async () => {
      const { t, res } = await run(baseSeed({ events: [signup(R1)], videos: [film(R1)], profiles: [prof(R1, 'n@x.co')] }), { failRpc: true })
      return res.granted === 0 && !t.events.some((e) => e.name === 'remix_reward_granted') && res.skipped.credit_failed === 1
    })
    await rule('P8 evento forjado (fora do path do cron) não bloqueia nem conta no teto', async () => {
      const forged = [paid(OWNER, R1, 10, '2026-10-30T00:00:00Z', '/api/events'), paid(OWNER, uid(600), 100, '2026-10-30T00:00:00Z', null)]
      const { res } = await run(baseSeed({ events: [...forged, signup(R1)], videos: [film(R1)], profiles: [prof(R1, 'n@x.co')] }))
      return res.granted === 1
    })
    await rule('P9 dry-run: relata quem ganharia, sem inserir evento e sem crédito', async () => {
      const { res, calls } = await run(baseSeed({ events: [signup(R1)], videos: [film(R1)], profiles: [prof(R1, 'n@x.co')] }), { dryRun: true })
      return res.dry_run === true && res.would_grant === 1 && res.granted === 0 && calls.rpc.length === 0 && calls.inserts === 0
    })
    await rule('P10 cron: dry-run sem ?confirm=SEND; Bearer CRON_SECRET ou admin; vercel.json arma com confirm=SEND', () =>
      /const dryRun = req\.nextUrl\.searchParams\.get\('confirm'\) !== 'SEND'/.test(S.cron) && /runRemixRewards\(admin, \{ dryRun \}\)/.test(S.cron)
      && S.cron.includes('Bearer ${secret}') && S.cron.includes('isAdminEmail(user.email)')
      && JSON.parse(S.vercel).crons.some((c) => c.path === '/api/cron/remix-reward?confirm=SEND'))
    await rule('P11 remix_reward_granted é só do servidor (o navegador não cunha) e o razão do /admin soma o crédito', () => {
      const m = S.events.match(/const SERVER_ONLY_EVENTS = new Set\(\[([\s\S]*?)\n\]\)/)
      if (!m || !/'remix_reward_granted'/.test(m[1])) return false
      const LG = compile(S.ledger)
      return LG.LEDGER_GRANT_EVENTS.includes('remix_reward_granted')
        && LG.ledgerGrantDelta('remix_reward_granted', { credits: 10, granted: true }) === 10
        && LG.ledgerGrantDelta('remix_reward_granted', { credits: 10 }) === 0
    })
    await rule('P12 leituras de eventos paginadas e ordenadas (readAll), nunca .limit()', () =>
      (S.server.match(/readAll</g) ?? []).length >= 6 && !/\.limit\(/.test(S.server) && /\.order\('created_at', \{ ascending: true \}\)/.test(S.server))
    return R
  })()
}

const mutate = (k, from, to) => {
  const S = { ...REAL }
  if (!S[k].includes(from)) throw new Error(`mutante sem alvo em ${k}: ${from.slice(0, 60)}`)
  S[k] = S[k].split(from).join(to)
  return S
}
const MUTANTS = [
  ['T2', () => mutate('cta', "  useEffect(() => { setState('idle'); setCopied(false) }, [videoId])", "  useEffect(() => { setState('idle'); setCopied(false); void publish() }, [videoId])")],
  ['T2', () => mutate('cta', 'onClick={publish}', 'onClick={() => undefined}')],
  ['T3', () => mutate('cta', "trackEvent('publish_cta_clicked'", "trackEvent('publish_clicked'")],
  ['T5', () => mutate('visibility', ", 'publish_earn'", '')],
  ['T6', () => mutate('generate', 'onPublished={() => setPublicPagePublished(true)}', 'onPublished={() => undefined}')],
  ['P2', () => mutate('lib', "  if (!(Number(i.referredCompletedFilms) >= 1)) return { grant: false, reason: 'no_completed_film' }\n", '')],
  ['P3', () => mutate('lib', "  if (referred === owner) return { grant: false, reason: 'self' }\n", '')],
  ['P3', () => mutate('lib', "  if (a && b && a === b) return { grant: false, reason: 'self' }\n", '')],
  ['P4', () => mutate('lib', 'if (i.ownerInternal || i.referredInternal)', 'if (false)')],
  ['P5', () => mutate('lib', 'used + REMIX_REWARD_CREDITS > REMIX_REWARD_MONTHLY_CAP', 'used > 10 * REMIX_REWARD_MONTHLY_CAP')],
  ['P13', () => mutate('server', "if (over) { await admin.from('events').delete().eq('id', claimId); skip('monthly_cap'); continue }", '')],
  ['P6', () => mutate('server', 'alreadyRewarded: rewarded.has(referred),', 'alreadyRewarded: false,')],
  ['P6', () => mutate('server', "    if (claimErr) { skip(claimErr.code === '23505' ? 'already_rewarded' : 'claim_failed'); rewarded.add(referred); continue }", '')],
  ['P7', () => mutate('server', "if (creditErr) { await admin.from('events').delete().eq('id', claimId); skip('credit_failed'); continue }", "if (creditErr) { skip('credit_failed'); continue }")],
  ['P8', () => mutate('server', 'const isPaid = (r: EventRow) => r.path === REMIX_REWARD_PATH && md(r).granted === true', 'const isPaid = (r: EventRow) => md(r).granted === true')],
  ['P9', () => mutate('server', '    if (opts.dryRun) {', '    if (false) {')],
  ['P10', () => mutate('cron', "const dryRun = req.nextUrl.searchParams.get('confirm') !== 'SEND'", 'const dryRun = false')],
  ['P11', () => mutate('events', "  'remix_reward_granted',", '')],
  ['P12', () => mutate('server', ".eq('name', 'remix_signup').gte('created_at', since)\n    .order('created_at', { ascending: true })", ".eq('name', 'remix_signup').gte('created_at', since).limit(1000)")],
]

let fail = 0
const real = await rules(REAL)
for (const [id, okv] of real) { console.log(`${okv ? 'ok  ' : 'FAIL'} ${id}`); if (!okv) fail++ }
for (const [target, make] of MUTANTS) {
  let res
  try { res = await rules(make()) } catch (e) { console.log(`FAIL mutante ${target}: ${e.message}`); fail++; continue }
  const r = res.find(([id]) => id.startsWith(target + ' '))
  const killed = r && !r[1]
  console.log(`${killed ? 'ok  ' : 'FAIL'} mutante derruba ${target}`)
  if (!killed) fail++
}
console.log(fail ? `\n${fail} falha(s)` : `\nKINEO-PUBLICAR-GANHAR-3110: ${real.length} regras + ${MUTANTS.length} mutantes — tudo verde`)
process.exit(fail ? 1 : 0)
