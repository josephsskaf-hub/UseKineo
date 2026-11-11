// KINEO-PAUSA-VOLUNTARIA-1111 — guardião da pausa de 1 mês na tela de cancelar. Prova:
//   A. regras puras: quem pode pausar (mensal, ativa, sem teste, sem cancelamento marcado, não pausada, 1 por 12 meses,
//      período conhecido), as datas (a cobrança do fim do período é pulada, resumes_at = fim + 3 dias, próxima cobrança =
//      fim + 1 mês, com fim de mês certo), o pause_collection (void + resumes_at), os motivos em que aparece;
//   B. interruptor: nasce 'internal'; 'off' = nenhuma leitura nem escrita; casa = conferência sem tocar na Stripe;
//   C. rota EXECUTADA com banco e Stripe falsos: GET oferece com datas; POST pause grava o pause_collection na PRÓPRIA
//      assinatura e o evento; recusas (teste, anual, cancelando, já pausou em 12 meses, dono diferente); resume só de
//      quem está pausado;
//   D. tela: o cartão só aparece depois de um dos 3 motivos, nunca solto; "Resume now" só quando pausada; nenhum texto
//      promete crédito acumulando;
//   E. eventos de servidor;
//   F. mutantes.
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

const FILES = { lib: 'lib/billing/pausaVoluntaria.ts', route: 'app/api/billing/pausa-voluntaria/route.ts', ui: 'components/billing/CancelSaveFlow.tsx', events: 'app/api/events/route.ts' }
const SRC = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, read(f)]))
const HOUSE = 'josephsskaf@gmail.com'
const USER = { id: '33333333-3333-4333-8333-333333333333', email: 'sub@example.com' }
const END = Math.floor(Date.parse('2026-11-29T10:00:00.000Z') / 1000)

function modulo(code, req = {}, env = {}) {
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  vm.runInNewContext(js, { module: m, exports: m.exports, require: (id) => { if (id in req) return req[id]; throw new Error('import inesperado ' + id) }, process: { env }, console: { error: () => {}, log: () => {}, warn: () => {} }, Date, Math, JSON, Number, String, Object, Array, Promise, Error, URL })
  return m.exports
}

async function runRoute(S, { user = USER, profile = { plan: 'basic', stripe_subscription_id: 'sub_1', video_credits: 74 }, sub = {}, prior = [], method = 'GET', url = 'https://www.usekineo.com/api/billing/pausa-voluntaria?offer=1', body = null } = {}) {
  const calls = { reads: [], updates: [], events: [], auth: 0 }
  const L = modulo(S.lib)
  const subObj = { status: 'active', items: { data: [{ price: { recurring: { interval: 'month' } } }] }, current_period_end: END, cancel_at_period_end: false, pause_collection: null, metadata: { supabase_user_id: USER.id }, ...sub }
  const db = {
    from(table) {
      calls.reads.push(table)
      const b = { select() { return b }, eq() { return b }, gte() { return b }, limit() { return Promise.resolve({ data: prior, error: null }) }, maybeSingle() { return Promise.resolve({ data: profile, error: null }) } }
      return b
    },
  }
  const NextResponse = { json: (bodyOut, init) => ({ body: bodyOut, status: init?.status ?? 200 }) }
  const R = modulo(S.route, {
    'next/server': { NextResponse },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/supabase/server': { createClient: () => { calls.auth++; return { auth: { getUser: async () => ({ data: { user } }) } } } },
    '@/lib/stripe': { stripe: { subscriptions: { retrieve: async () => subObj, update: async (id, params) => { calls.updates.push({ id, params }); return {} } } } },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { calls.events.push(e); return true } },
    '@/lib/recreate/access': { releaseVisible: (email, rel) => rel === 'public' || (rel === 'internal' && String(email).toLowerCase() === HOUSE) },
    '@/lib/billing/salvaCancelamento': { saveTierOfPlan: (plan) => { const raw = String(plan ?? '').toLowerCase(); const inTrial = raw.endsWith('_trial'); const base = raw.replace(/_trial$/, ''); return { tier: ['starter', 'basic', 'pro'].includes(base) ? base : null, inTrial } } },
    '@/lib/billing/pausaVoluntaria': L,
  }, { NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc' })
  const req = { nextUrl: new URL(url), json: async () => body ?? {} }
  const res = method === 'GET' ? await R.GET(req) : await R.POST(req)
  return { res, calls }
}
const REL = (s, v) => ({ ...s, lib: s.lib.replace("PAUSA_VOLUNTARIA_1111_RELEASE: PausaVoluntariaRelease = 'internal'", `PAUSA_VOLUNTARIA_1111_RELEASE: PausaVoluntariaRelease = '${v}'`) })

async function suite(S) {
  const out = []
  const t = (c, m) => out.push([!!c, m])
  const L = modulo(S.lib)
  const base = { tier: 'basic', inTrial: false, hasStripeSubscription: true, status: 'active', interval: 'month', cancelAtPeriodEnd: false, pausedNow: false, pausedRecently: false, periodEnd: '2026-11-29T10:00:00.000Z' }
  // A
  const d = L.pausaDecision(base)
  t(d.possible && d.skippedCharge === '2026-11-29T10:00:00.000Z' && d.resumesAt === '2026-12-02T10:00:00.000Z' && d.nextCharge === '2026-12-29T10:00:00.000Z', 'A1 pula a cobrança do fim do período; volta em +3 dias; próxima cobrança = +1 mês')
  t(L.addMonthsUtc('2026-01-31T00:00:00.000Z', 1) === '2026-02-28T00:00:00.000Z', 'A2 31/01 + 1 mês = 28/02 (fim de mês certo)')
  const blocks = [['trial', { inTrial: true }], ['annual', { interval: 'year' }], ['canceling', { cancelAtPeriodEnd: true }], ['already_paused', { pausedNow: true }], ['paused_recently', { pausedRecently: true }], ['paused_recently', { pausedRecently: null }], ['not_active', { status: 'past_due' }], ['no_subscription', { hasStripeSubscription: false }], ['unknown_plan', { tier: 'business' }], ['no_period', { periodEnd: null }]]
  t(blocks.every(([b, o]) => { const x = L.pausaDecision({ ...base, ...o }); return !x.possible && x.block === b }), 'A3 recusas: teste, anual, cancelando, já pausada, pausou em 12 meses (ou leitura falhou), atrasada, sem assinatura, plano fora, sem período')
  const pc = L.pauseCollectionParams(d.resumesAt)
  t(pc.behavior === 'void' && pc.resumes_at === Math.floor(Date.parse(d.resumesAt) / 1000), 'A4 pause_collection = void + resumes_at (a fatura do mês pausado é anulada)')
  t(['unused_credits', 'just_testing', 'other'].every((r) => L.pausaParaMotivo(r)) && !L.pausaParaMotivo('too_expensive') && !L.pausaParaMotivo('quality') && !L.pausaParaMotivo(null), 'A5 aparece só para "não usei", "só testando" e "outro"')
  // B
  t(/PAUSA_VOLUNTARIA_1111_RELEASE: PausaVoluntariaRelease = 'internal'/.test(S.lib), "B1 nasce 'internal'")
  const off = await runRoute(REL(S, 'off'), { user: { id: USER.id, email: HOUSE } })
  const offPost = await runRoute(REL(S, 'off'), { method: 'POST', body: { action: 'pause' } })
  t(off.res.body.show === false && off.calls.auth === 0 && off.calls.reads.length === 0 && offPost.calls.updates.length === 0 && offPost.res.status === 404, "B2 'off': nenhuma leitura, nenhuma escrita")
  const intCust = await runRoute(S)
  t(intCust.res.body.show === false, "B3 'internal': cliente de fora não vê")
  const intHouse = await runRoute(S, { user: { id: USER.id, email: HOUSE }, profile: { plan: 'free', stripe_subscription_id: null, video_credits: 0 } })
  t(intHouse.res.body.show === true && intHouse.res.body.qa === true && intHouse.res.body.possible === true, "B4 'internal': a casa vê o cartão em conferência (datas de amostra)")
  const housePost = await runRoute(S, { user: { id: USER.id, email: HOUSE }, method: 'POST', body: { action: 'pause' } })
  t(housePost.res.body.qa === true && housePost.calls.updates.length === 0, 'B5 conferência da casa nunca muda a Stripe')
  // C
  const P = REL(S, 'public')
  const g = await runRoute(P)
  t(g.res.body.show === true && g.res.body.possible === true && g.res.body.nextCharge === '2026-12-29T10:00:00.000Z' && g.calls.events.some((e) => e.name === 'subscription_pause_offered'), 'C1 GET: oferece com as datas e grava "oferecida"')
  const gNoOffer = await runRoute(P, { url: 'https://www.usekineo.com/api/billing/pausa-voluntaria' })
  t(gNoOffer.calls.events.length === 0, 'C2 sem ?offer=1 (só lendo o estado) não grava impressão')
  const post = await runRoute(P, { method: 'POST', body: { action: 'pause' } })
  const u = post.calls.updates[0]
  t(post.res.body.ok === true && u?.id === 'sub_1' && u?.params?.pause_collection?.behavior === 'void' && u?.params?.pause_collection?.resumes_at === Math.floor(Date.parse('2026-12-02T10:00:00.000Z') / 1000) && post.calls.events.some((e) => e.name === 'subscription_pause_accepted'), 'C3 POST pause: pause_collection void + resumes_at na própria assinatura, evento "aceita"')
  const refused = []
  for (const [label, o] of [['teste', { profile: { plan: 'basic_trial', stripe_subscription_id: 'sub_1', video_credits: 10 } }], ['anual', { sub: { items: { data: [{ price: { recurring: { interval: 'year' } } }] } } }], ['cancelando', { sub: { cancel_at_period_end: true } }], ['12 meses', { prior: [{ id: 'e1' }] }], ['dono diferente', { sub: { metadata: { supabase_user_id: 'outra-pessoa' } } }]]) {
    const r = await runRoute(P, { method: 'POST', body: { action: 'pause' }, ...o })
    if (r.calls.updates.length === 0 && r.res.status === 409) refused.push(label)
  }
  t(refused.length === 5, `C4 POST pause recusa sem tocar na Stripe: ${refused.join(', ')}`)
  const resumeNo = await runRoute(P, { method: 'POST', body: { action: 'resume' } })
  t(resumeNo.calls.updates.length === 0 && resumeNo.res.status === 409, 'C5 resume de quem não está pausado: recusa')
  const resumeYes = await runRoute(P, { method: 'POST', body: { action: 'resume' }, sub: { pause_collection: { behavior: 'void', resumes_at: END + 3 * 86400 } } })
  t(resumeYes.res.body.ok === true && resumeYes.calls.updates[0]?.params?.pause_collection === '' && resumeYes.calls.events.some((e) => e.name === 'subscription_pause_resumed'), 'C6 resume: tira o pause_collection e grava "retomada"')
  const bad = await runRoute(P, { method: 'POST', body: { action: 'cancel' } })
  t(bad.res.status === 400 && bad.calls.updates.length === 0, 'C7 ação estranha: 400, nada muda')
  // D
  t(/const pausaCard = pausa && pausa\.possible && !pausa\.pausedNow && pausaParaMotivo\(reason\) && onPause \?/.test(S.ui), 'D1 o cartão só aparece depois de um dos motivos (nunca solto)')
  t(/const pausadaCard = pausa && pausa\.pausedNow && onResume \?/.test(S.ui), 'D2 "Resume now" só quando pausada')
  t(/if \(PAUSA_VOLUNTARIA_1111_RELEASE === 'off'\) return\n/.test(S.ui), "D3 tela: 'off' não lê nada")
  t(!/roll ?over|accumulat|carry over|never expire/i.test(S.lib), 'D4 nenhum texto promete crédito acumulando ou que não expira')
  // E
  t(['subscription_pause_offered', 'subscription_pause_accepted', 'subscription_pause_resumed'].every((e) => S.events.includes(`'${e}'`)), 'E1 eventos de servidor (o navegador não forja a régua de 12 meses)')
  return out
}

for (const [c, m] of await suite(SRC)) ok(c, m)

const MUTANTS = [
  ['pausa sem limite de 12 meses', 'lib', "  if (i.pausedRecently !== false) return { possible: false, block: 'paused_recently' }\n", ''],
  ['pausa no anual', 'lib', "  if (i.interval !== 'month') return { possible: false, block: 'annual' }\n", ''],
  ['pausa de quem está cancelando', 'lib', "  if (i.cancelAtPeriodEnd) return { possible: false, block: 'canceling' }\n", ''],
  ['cobra o mês pausado', 'lib', "return { behavior: 'void', resumes_at:", "return { behavior: 'keep_as_draft' as 'void', resumes_at:"],
  ['pausa de 2 meses', 'lib', '    nextCharge: addMonthsUtc(periodEnd, 1),', '    nextCharge: addMonthsUtc(periodEnd, 2),'],
  ["'internal' muda a Stripe", 'route', "  if (mode === 'qa') return NextResponse.json({ ok: true, qa: true, action })\n", ''],
  ['dono não conferido', 'route', '      if (owner === userId) {', '      if (true) {'],
  ['pausa aparece para "caro"', 'lib', "export const PAUSA_VOLUNTARIA_REASONS: readonly string[] = ['unused_credits', 'just_testing', 'other']", "export const PAUSA_VOLUNTARIA_REASONS: readonly string[] = ['unused_credits', 'just_testing', 'other', 'too_expensive']"],
  ['cartão solto', 'ui', 'pausa.possible && !pausa.pausedNow && pausaParaMotivo(reason) && onPause ?', 'pausa.possible && !pausa.pausedNow && onPause ?'],
  ['texto promete acúmulo', 'lib', "no new monthly credits during the pause", "unused credits roll over"],
]
for (const [name, key, from, to] of MUTANTS) {
  if (!SRC[key].includes(from)) { ok(false, `mutante "${name}": trecho não encontrado`); continue }
  let caught = false
  try { caught = (await suite({ ...SRC, [key]: SRC[key].replace(from, to) })).some(([c]) => !c) } catch { caught = true }
  ok(caught, `mutante "${name}" é pego`)
}
console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
