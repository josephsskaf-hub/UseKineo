// KINEO-ADMIN-RAPIDO-1710 — guardião do /admin mais rápido (docs/AUDITORIA-VELOCIDADE-2026-10-17.md, parte B).
//
// Prova, lendo os arquivos (readFileSync, sem alias @/) e rodando os trechos que dá para rodar isolados:
//   R1  Funil: a fase 1 (auth, profiles, leads, videos, click_events, checkout_abandoned, sonda, Stripe) é UM Promise.all;
//       as 5 leituras de events (contagem + 4 readAll) são OUTRO; nenhum `await readAll(` sobrou em série; a sonda
//       count:'exact' sobre events inteira saiu.
//   R2  Funil: as 78 contagens viram UMA chamada agrupada (RPC admin_event_name_counts) com volta às contagens exatas
//       quando o RPC não existe — rodado com um banco falso nos dois caminhos.
//   R3  Stripe com cache curto: _shared/stripeCache (10 min) — rodado de verdade: 2ª chamada não chama a Stripe, chamadas
//       simultâneas dividem uma leitura, erro não fica no cache, TTL vencido relê; o Funil (rodado) e a Visão geral usam.
//   R4  Visão geral: banco + checkout_started + sessions numa onda; assinaturas do MRR em lotes paralelos; memo de 2 min
//       usado pela rota /api/admin/ceo (polling e /admin/leads).
//   R5  Régua do MRR INTOCADA: os trechos da régua em _shared/mrr.ts são byte a byte os do pai (hash), a conta por
//       assinatura é a mesma, e compute.ts continua somando subscriberMrr(paidMonthlyUsdByUser) de _shared/mrr.
//   R6  /admin/coerencia: abrir só LÊ (maxCompute: 0); o juiz roda no botão (POST /api/admin/coerencia/avaliar, gate de
//       admin) ou no cron quality-radar, que continua no vercel.json.
//   R7  /admin/demo: o GET não chama advanceDemosSobMedida; o PATCH (gate de admin) chama; o cron ads-v2-advance continua
//       chamando, na MESMA frequência do vercel.json.
//   R8  Polling: Funil 30 s → 5 min, Visão geral e Oportunidades 60 s → 5 min, com pausa de aba escondida.
//   R9  Coortes: profiles filtrados no banco (ilike 'active') e videos/events em fatias paralelas.
//   R10 Migrations: os 4 índices com os nomes de produção e IF NOT EXISTS CONCURRENTLY; o RPC com a mesma regra.
// Depois, cada mutante é aplicado (provado por diferença de texto) e tem de deixar pelo menos a verificação-alvo VERMELHA.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const ts = (await import(path.join(RAIZ, 'node_modules/typescript/lib/typescript.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'))).default

const F = {
  funnel: 'app/api/admin/funnel/route.ts',
  cache: 'app/api/admin/_shared/stripeCache.ts',
  ceo: 'app/api/admin/ceo/compute.ts',
  ceoRoute: 'app/api/admin/ceo/route.ts',
  mrr: 'app/api/admin/_shared/mrr.ts',
  coerPage: 'app/admin/coerencia/page.tsx',
  coerRoute: 'app/api/admin/coerencia/avaliar/route.ts',
  coerBtn: 'app/admin/coerencia/AvaliarPendentes.tsx',
  demoRoute: 'app/api/admin/demo/route.ts',
  demoClient: 'app/admin/demo/DemoClient.tsx',
  adsCron: 'app/api/cron/ads-v2-advance/route.ts',
  vercel: 'vercel.json',
  funnelClient: 'app/(dashboard)/admin/funnel/FunnelClient.tsx',
  ceoClient: 'app/(dashboard)/admin/ceo/CeoClient.tsx',
  leads: 'app/admin/leads/LeadsClient.tsx',
  cohort: 'app/admin/trial-cohort/page.tsx',
  idx: 'supabase/migrations/20261017110000_events_indices.sql',
  rpc: 'supabase/migrations/20261017120000_admin_event_name_counts.sql',
}
const REAL = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, rd(p)]))

// ── utilitários ─────────────────────────────────────────────────────────────────────────────────────────────────
const fatia = (s, de, ate) => { const a = s.indexOf(de); if (a < 0) return ''; const b = ate ? s.indexOf(ate, a + de.length) : s.length; return b < 0 ? '' : s.slice(a, b) }
const conta = (s, x) => s.split(x).length - 1
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const js = (code) => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
let n = 0
async function modulo(code) { // carrega JS de um texto, sem tocar o disco do projeto
  const url = `data:text/javascript;base64,${Buffer.from(code + `\n// ${++n}`).toString('base64')}`
  return import(url)
}
/** Uma função de topo do arquivo, inteira (até a 1ª linha "}" na coluna 0). */
const funcao = (s, cab) => { const a = s.indexOf(cab); if (a < 0) return ''; const b = s.indexOf('\n}\n', a); return b < 0 ? '' : s.slice(a, b + 3) }

// ── R5: hashes da régua do MRR no PAI (origin/main f7b955806), trechos que esta entrega NÃO pode tocar ──────────────
const REGUA_A = (s) => fatia(s, 'export const PLAN_PRICE_USD', '/**\n * MRR REAL')
const REGUA_B = (s) => fatia(s, 'export type PlanBase', null)
const HASH_A = '05c0e9c7b82eda449c7033c83ee7b7e97d447cb692efd902db6e23bebde07f44'
const HASH_B = '8ab2b1cd91b19b69e7b0e7728dea69809e062831bf5a65d54f0b71cd5880748a'
const CONTA_POR_ASSINATURA = [
  "      const alive = sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due'\n",
  '      const item = sub.items?.data?.[0]\n',
  "      const amount = typeof item?.price?.unit_amount === 'number' ? item.price.unit_amount : 0\n",
  "      const perMonth = item?.price?.recurring?.interval === 'year' ? amount / 12 : amount\n",
  '      const usd = alive ? perMonth / 100 : 0\n',
  '      if (alive) mrr += usd\n',
  '      perSubscription.push({ id, usd, status: sub.status })\n',
]

// ── as verificações (cada uma recebe o mapa de fontes; mutantes trocam uma fonte) ──────────────────────────────────
function verificacoesEstaticas(S) {
  const V = []
  const v = (rotulo, prova) => V.push([rotulo, !!prova])
  // R1
  const get = fatia(S.funnel, 'export async function GET(req: Request) {', null)
  const fase1 = fatia(get, '    ] = await Promise.all([', '    ])\n')
  v('R1 funil: fase 1 é um Promise.all com auth, profiles, leads, videos, click_events, checkout_abandoned, sonda e Stripe',
    fase1 && fase1.includes('admin.auth.admin.listUsers') && fase1.includes(".from('profiles')") && fase1.includes(".from('leads')") && fase1.includes(".from('videos')") &&
    fase1.includes("from('click_events')") && fase1.includes("from('checkout_abandoned')") && fase1.includes("admin.from('events').select('id').limit(1)") && fase1.includes('loadFunnelStripe(days, cohortCutoff)'))
  v('R1 funil: nenhum `await readAll(` nem `await stripe.` em série dentro do GET', conta(get, 'await readAll(') === 0 && conta(get, 'await stripe.') === 0)
  v('R1 funil: a sonda count:exact sobre events inteira saiu', !S.funnel.includes("admin.from('events').select('id', { head: true, count: 'exact' }).limit(1)"))
  v('R1 funil: as 5 leituras de events correm juntas (contagem + 4 readAll em UM Promise.all)',
    get.includes('const [countResults, identities, postVideoEvents, organicEvents, retentionEvents] = await Promise.all([\n          countResultsP, identitiesP, postVideoEventsP, organicEventsP, retentionEventsP,\n        ])') &&
    ['identitiesP', 'postVideoEventsP', 'organicEventsP', 'retentionEventsP'].every((p) => get.includes(`const ${p} = readAll(() => {`)))
  // R2 (estático: o GET usa a função agrupada)
  v('R2 funil: o GET conta por countTrackedEvents (RPC agrupado), não por 78 count:exact soltos', get.includes('countTrackedEvents(admin, trackedEventNames, periodIso, Array.from(internalUserIds), externalEventFilter)') && !get.includes(".select('id', { head: true, count: 'exact' }).eq('name', name)"))
  // R3 (estático: quem usa o cache)
  const lfs = funcao(S.funnel, 'async function loadFunnelStripe(')
  v('R3 funil: sessions, subscriptions e invoices da Stripe passam por cachedAdminStripe',
    conta(lfs, 'cachedAdminStripe(') === 3 && lfs.includes('stripe.checkout.sessions.list(params)') && lfs.includes("stripe.subscriptions.list({ status: 'all'") && lfs.includes("stripe.invoices.list({ limit: 100, status: 'uncollectible' })") &&
    S.funnel.includes("import { cachedAdminStripe } from '../_shared/stripeCache'"))
  v('R3 cache: TTL de 10 min', /export const ADMIN_STRIPE_CACHE_TTL_MS = 10 \* 60 \* 1000\n/.test(S.cache))
  // R4
  const ccd = fatia(S.ceo, 'export async function computeCeoData(): Promise<CeoData | null> {', null)
  const ceoFase1 = fatia(ccd, 'await Promise.all([', '  ])\n')
  v('R4 visão geral: profiles, videos, eventos de MRR, cortesia, checkout_started e sessions da Stripe numa onda só',
    ceoFase1.includes("'profiles'") && ceoFase1.includes("'videos'") && ceoFase1.includes('MRR_PAID_EVENT_NAMES') && ceoFase1.includes('loadActiveCourtesyGrants') && ceoFase1.includes("values: ['checkout_started']") && ceoFase1.includes('sessionsP') &&
    conta(ccd, 'await fetchAllRows') === 0 && !ccd.includes('await stripe.'))
  v('R4 visão geral: sessions da Stripe com cache (cachedAdminStripe) e o teto MAX_SESSOES', fatia(S.ceo, 'async function loadCheckoutSessionsCompact', '\n}\n').includes("cachedAdminStripe('ceo:checkout-sessions:1000'") && S.ceo.includes('autoPagingEach') && S.ceo.includes('MAX_SESSOES'))
  v('R4 visão geral: conta interna sai ANTES dos contadores da Stripe', S.ceo.indexOf('if (custEmail && isInternalEmail(custEmail)) return') > 0 && S.ceo.indexOf('if (custEmail && isInternalEmail(custEmail)) return') < S.ceo.indexOf('checkoutCreated += 1'))
  v('R4 MRR ao vivo: assinaturas lidas em lotes paralelos de 10 (não uma por uma)',
    S.mrr.includes('const STRIPE_MRR_BATCH = 10') && S.mrr.includes('subs.push(...(await Promise.all(ids.slice(i, i + STRIPE_MRR_BATCH).map((id) => stripe.subscriptions.retrieve(id)))))') && !/for \(const id of ids\) \{\n\s+const sub = await stripe\.subscriptions\.retrieve/.test(S.mrr))
  v('R4 rota /api/admin/ceo (polling + /admin/leads) usa o memo computeCeoDataCached; o cálculo grava o memo',
    S.ceoRoute.includes('const data = await computeCeoDataCached()') && !S.ceoRoute.includes('await computeCeoData()') && S.ceo.includes('export const CEO_DATA_TTL_MS = 2 * 60 * 1000') && S.ceo.includes('  ceoMemo = { at: Date.now(), data: result }'))
  // R5
  v('R5 régua do MRR: PLAN_PRICE_USD…mrrForPlan byte a byte igual ao pai', sha(REGUA_A(S.mrr)) === HASH_A)
  v('R5 régua do MRR: planBase…paidMrrSourceLabel (subscriberMrr, paidMonthlyUsdByUser, MRR_PAID_EVENT_NAMES) byte a byte igual ao pai', sha(REGUA_B(S.mrr)) === HASH_B)
  v('R5 conta por assinatura (viva, item, valor, anual÷12, centavos) idêntica', CONTA_POR_ASSINATURA.every((l) => S.mrr.includes(l)))
  v('R5 compute.ts continua somando a régua de _shared/mrr (subscriberMrr + paidMonthlyUsdByUser + rótulo), sem conta própria',
    ccd.includes('const paidByUser = paidMonthlyUsdByUser(paidEvents)') && ccd.includes('const sub = subscriberMrr(p.plan, paidByUser.get(p.id))') && ccd.includes('mrrSourceLabel: paidMrrSourceLabel(mrrSources)') &&
    ccd.includes('const stripeMrr = await stripeMrrUsd(subIds)') && /\} from '\.\.\/_shared\/mrr'\n/.test(S.ceo) && !S.ceo.includes('unit_amount'))
  // R6
  v('R6 coerência: a página só lê (maxCompute: 0) e não chama o juiz', S.coerPage.includes('listFastCoherence(admin, { hours, limit: 150, engine, maxCompute: 0,') && !/maxCompute: [1-9]/.test(S.coerPage) && !S.coerPage.includes('scoreFastCoherence'))
  v('R6 coerência: botão "Avaliar pendentes" na página → POST /api/admin/coerencia/avaliar',
    S.coerPage.includes('<AvaliarPendentes hours={hours} engine={engine} casa={incluirCasa} pendentes={semNota} />') && S.coerBtn.includes("fetch('/api/admin/coerencia/avaliar', { method: 'POST'") && S.coerBtn.includes('router.refresh()'))
  v('R6 coerência: a rota do botão tem gate de admin e julga no máximo 6', S.coerRoute.includes("if (!user || !isAdminEmail(user.email?.toLowerCase() ?? '')) {") && S.coerRoute.includes('const COERENCIA_BOTAO_MAX = 6') && S.coerRoute.includes('maxCompute: COERENCIA_BOTAO_MAX') && S.coerRoute.includes('export async function POST(') && !S.coerRoute.includes('export async function GET('))
  v('R6 coerência: o cron quality-radar continua no vercel.json (a cada 15 min)', S.vercel.includes('"path": "/api/cron/quality-radar",\n      "schedule": "4,19,34,49 * * * *"'))
  // R7
  const dGet = fatia(S.demoRoute, 'export async function GET(', 'export async function PATCH(')
  const dPatch = fatia(S.demoRoute, 'export async function PATCH(', 'export async function POST(')
  v('R7 demo: o GET não roda o robô (advanceDemosSobMedida)', dGet && !dGet.includes('advanceDemosSobMedida'))
  v('R7 demo: o PATCH (gate de admin) roda o mesmo passo do cron', dPatch.includes('const gate = await adminUser()') && dPatch.includes('if (!gate.ok) return gate.res') && dPatch.includes('await advanceDemosSobMedida(admin,'))
  v('R7 demo: a tela tem o botão "Avançar agora" (PATCH) e não espera o robô a cada 60 s', S.demoClient.includes("fetch('/api/admin/demo', { method: 'PATCH'") && S.demoClient.includes('data-kineo="demo-avancar"') && !S.demoClient.includes('60_000'))
  v('R7 demo: o cron ads-v2-advance continua chamando o robô, na mesma frequência (2-57/5)', S.adsCron.includes('const demos = await advanceDemosSobMedida(admin, {') && S.vercel.includes('"path": "/api/cron/ads-v2-advance",\n      "schedule": "2-57/5 * * * *"'))
  // R8
  v('R8 polling: Funil 5 min com pausa de aba', S.funnelClient.includes('const POLL_MS = 5 * 60_000\n') && S.funnelClient.includes("setInterval(() => { if (typeof document === 'undefined' || !document.hidden) load() }, POLL_MS)"))
  v('R8 polling: Visão geral 5 min com pausa de aba', S.ceoClient.includes('const POLL_MS = 5 * 60_000\n') && S.ceoClient.includes("setInterval(() => { if (typeof document === 'undefined' || !document.hidden) void poll() }, POLL_MS)"))
  v('R8 polling: Oportunidades 5 min com pausa de aba', S.leads.includes('const POLL_MS = 5 * 60_000\n') && S.leads.includes("setInterval(() => { if (typeof document === 'undefined' || !document.hidden) load() }, POLL_MS)"))
  // R9
  v('R9 coortes: profiles filtrados no banco (ilike active) e o filtro em memória mantido', S.cohort.includes(".ilike('trial_status', 'active'), { route: '/admin/trial-cohort', table: 'profiles' })") && S.cohort.includes("const trials = profiles.filter((p) => (p.trial_status ?? '').toLowerCase() === 'active')") && !S.cohort.includes("fetchAllRows<TrialProfileRow>(admin, 'profiles'"))
  v('R9 coortes: videos e events em fatias paralelas de 15 ids', S.cohort.includes('const COHORT_ID_CHUNK = 15') && S.cohort.includes('Promise.all(fatias.map((f) => fetchAllRows<EventRow>(admin, \'events\', \'user_id, name, created_at\', { column: \'user_id\', values: f }') && S.cohort.includes('const events = eventParts.flat()'))
  // R10
  const idxOk = [
    'create index concurrently if not exists events_user_created_idx on public.events (user_id, created_at desc);',
    'create index concurrently if not exists events_name_created_idx on public.events (name, created_at desc);',
    'create index concurrently if not exists events_session_idx on public.events (session_id);',
    "create index concurrently if not exists events_generation_id_idx on public.events ((metadata->>'generation_id'));",
  ]
  v('R10 migration dos índices: os 4 nomes de produção, CONCURRENTLY IF NOT EXISTS', idxOk.every((l) => S.idx.includes(l)) && conta(S.idx.toLowerCase(), 'create index') === 4)
  v('R10 migration do RPC: mesma regra das contagens (nome, período, nulo ou fora dos internos) e só service_role',
    S.rpc.includes('where e.name = any (p_names)') && S.rpc.includes('and (p_since is null or e.created_at >= p_since)') && S.rpc.includes("and (e.user_id is null or not (e.user_id = any (coalesce(p_internal_ids, '{}'::uuid[]))))") &&
    S.rpc.includes('grant execute on function public.admin_event_name_counts(text[], timestamptz, uuid[]) to service_role;') && S.rpc.includes('revoke all on function public.admin_event_name_counts(text[], timestamptz, uuid[]) from public, anon, authenticated;'))
  return V
}

async function verificacoesRodando(S) {
  const V = []
  const v = (rotulo, prova) => V.push([rotulo, !!prova])
  // R3 — o cache, rodado
  try {
    const C = await modulo(js(S.cache))
    let cargas = 0
    const carga = async () => { cargas++; return cargas }
    const a = await C.cachedAdminStripe('k', carga)
    const b = await C.cachedAdminStripe('k', carga)
    v('R3 cache rodado: 2ª chamada da mesma chave não chama a Stripe', a === 1 && b === 1 && cargas === 1)
    C.clearAdminStripeCache(); cargas = 0
    const pendentes = []
    const lenta = () => new Promise((r) => { cargas++; pendentes.push(() => r(cargas)) })
    const p1 = C.cachedAdminStripe('k2', lenta), p2 = C.cachedAdminStripe('k2', lenta)
    await new Promise((r) => setTimeout(r, 5))
    for (const solta of pendentes) solta()
    const [x1, x2] = await Promise.all([p1, p2])
    v('R3 cache rodado: duas aberturas ao mesmo tempo = UMA leitura', x1 === 1 && x2 === 1 && cargas === 1)
    C.clearAdminStripeCache(); cargas = 0
    let erro = null
    try { await C.cachedAdminStripe('k3', async () => { cargas++; throw new Error('stripe caiu') }) } catch (e) { erro = e }
    const depois = await C.cachedAdminStripe('k3', async () => { cargas++; return 'ok' })
    v('R3 cache rodado: erro não fica guardado (a próxima abertura tenta de novo)', erro && depois === 'ok' && cargas === 2)
    C.clearAdminStripeCache(); cargas = 0
    await C.cachedAdminStripe('k4', carga, 50)
    await new Promise((r) => setTimeout(r, 70))
    const relida = await C.cachedAdminStripe('k4', carga, 50)
    v('R3 cache rodado: TTL vencido relê', relida === 2 && cargas === 2)
  } catch (e) {
    v(`R3 cache rodado (${e instanceof Error ? e.message : String(e)})`, false)
  }
  // R3 — loadFunnelStripe, rodado com uma Stripe falsa e o cache real
  try {
    const cacheSrc = js(S.cache)
    const lfs = funcao(S.funnel, 'async function loadFunnelStripe(')
    if (!lfs) throw new Error('loadFunnelStripe não achada')
    const corpo = js(`${lfs}\nexport { loadFunnelStripe }`)
    const chamadas = { sessions: 0, subs: 0, inv: 0 }
    globalThis.__stripeFalsa = {
      checkout: { sessions: { list: async () => { chamadas.sessions++; return { data: [{ id: 'cs_1' }], has_more: false } } } },
      subscriptions: { list: async () => { chamadas.subs++; return { data: [{ id: 'sub_1' }], has_more: false } } },
      invoices: { list: async () => { chamadas.inv++; return { data: [{ id: 'in_1', created: 1 }] } } },
    }
    const M = await modulo(`${cacheSrc}\nconst stripe = globalThis.__stripeFalsa\n${corpo}`)
    process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_falsa'
    const r1 = await M.loadFunnelStripe('30', Date.now() - 30 * 86400000)
    const r2 = await M.loadFunnelStripe('30', Date.now() - 30 * 86400000)
    v('R3 funil rodado: reabrir o Funil no mesmo período NÃO relê sessions/subscriptions/invoices da Stripe',
      r1.sessionsAvailable && r1.subscriptionsAvailable && r2.sessions.length === 1 && r2.subscriptions.length === 1 && chamadas.sessions === 1 && chamadas.subs === 1 && chamadas.inv === 1)
  } catch (e) {
    v(`R3 funil rodado (${e instanceof Error ? e.message : String(e)})`, false)
  }
  // R2 — countTrackedEvents, rodado nos dois caminhos
  try {
    const ctf = funcao(S.funnel, 'async function countTrackedEvents(')
    if (!ctf) throw new Error('countTrackedEvents não achada')
    const M = await modulo(js(`${ctf}\nexport { countTrackedEvents }`))
    const banco = (rpcResp) => {
      const log = { rpc: [], counts: [] }
      const q = (name) => { const f = { name }; const o = { gte(c, x) { f.gte = x; return o }, or(x) { f.or = x; return o }, then(res, rej) { log.counts.push(f); return Promise.resolve({ count: name === 'a' ? 7 : 0, error: null }).then(res, rej) } }; return o }
      return { log, admin: { rpc: async (fn, args) => { log.rpc.push({ fn, args }); return rpcResp }, from: () => ({ select: (_c, opt) => ({ eq: (_k, name) => { if (!opt || opt.count !== 'exact' || !opt.head) throw new Error('não é contagem'); return q(name) } }) }) } }
    }
    const ok = banco({ data: [{ name: 'a', n: '5' }, { name: 'b', n: 2 }], error: null })
    const r = await M.countTrackedEvents(ok.admin, ['a', 'b', 'c'], '2026-10-01T00:00:00.000Z', ['u1'], 'user_id.is.null,user_id.not.in.(u1)')
    v('R2 contagem rodada: UMA chamada agrupada (RPC) com nomes, período e internos; nome sem linha = 0; nenhuma contagem solta',
      ok.log.rpc.length === 1 && ok.log.rpc[0].fn === 'admin_event_name_counts' && JSON.stringify(ok.log.rpc[0].args) === JSON.stringify({ p_names: ['a', 'b', 'c'], p_since: '2026-10-01T00:00:00.000Z', p_internal_ids: ['u1'] }) &&
      ok.log.counts.length === 0 && JSON.stringify(r) === JSON.stringify([{ name: 'a', count: 5 }, { name: 'b', count: 2 }, { name: 'c', count: 0 }]))
    const sem = banco({ data: null, error: { message: 'Could not find the function public.admin_event_name_counts' } })
    const r2 = await M.countTrackedEvents(sem.admin, ['a', 'b'], '2026-10-01T00:00:00.000Z', ['u1'], 'user_id.is.null,user_id.not.in.(u1)')
    v('R2 contagem rodada: sem o RPC aplicado, volta às contagens exatas com o MESMO período e o MESMO filtro de internos',
      sem.log.rpc.length === 1 && sem.log.counts.length === 2 && sem.log.counts.every((c) => c.gte === '2026-10-01T00:00:00.000Z' && c.or === 'user_id.is.null,user_id.not.in.(u1)') && JSON.stringify(r2) === JSON.stringify([{ name: 'a', count: 7 }, { name: 'b', count: 0 }]))
  } catch (e) {
    v(`R2 contagem rodada (${e instanceof Error ? e.message : String(e)})`, false)
  }
  return V
}

async function todas(S) { return [...verificacoesEstaticas(S), ...(await verificacoesRodando(S))] }

// ── rodada real ─────────────────────────────────────────────────────────────────────────────────────────────────
let falhas = 0
console.log('TESTE KINEO-ADMIN-RAPIDO-1710 — /admin mais rápido (funil, coortes, visão geral, oportunidades, coerência, demo)')
const real = await todas(REAL)
for (const [rotulo, prova] of real) { console.log(`  ${prova ? '✓' : '✗'} ${rotulo}`); if (!prova) falhas++ }

// ── mutantes: cada um tem de ser APLICADO (texto mudou) e deixar a verificação-alvo vermelha ─────────────────────────
const MUTANTES = [
  ['funil volta a ler profiles em série', 'funnel', "      readAll(() => admin\n        .from('profiles')", "      await readAll(() => admin\n        .from('profiles')", 'R1 funil: nenhum `await readAll(`'],
  ['funil volta a sonda count exact', 'funnel', "      admin.from('events').select('id').limit(1),", "      admin.from('events').select('id', { head: true, count: 'exact' }).limit(1),", 'R1 funil: a sonda count:exact'],
  ['funil lê identities fora do Promise.all', 'funnel', '        const identitiesP = readAll(() => {', '        const identitiesP = await readAll(() => {', 'R1 funil: nenhum `await readAll(`'],
  ['contagem pula o RPC', 'funnel', "    const { data, error } = await admin.rpc('admin_event_name_counts', { p_names: names, p_since: periodIso, p_internal_ids: internalIds })", "    const { data, error } = { data: null, error: { message: 'pulado' } }", 'R2 contagem rodada: UMA chamada agrupada'],
  ['contagem de fallback esquece os internos', 'funnel', '    if (externalEventFilter) query = query.or(externalEventFilter)\n    const result = await query', '    const result = await query', 'R2 contagem rodada: sem o RPC aplicado'],
  ['cache guarda nada', 'cache', '      done.set(key, { at: Date.now(), value })\n', '', 'R3 cache rodado: 2ª chamada'],
  ['cache guarda o erro', 'cache', '    try {\n      const value = await load()', '    try {\n      const value = await load().catch((e) => e)', 'R3 cache rodado: erro não fica guardado'],
  ['cache sem dedupe de chamadas simultâneas', 'cache', '  if (running) return running as Promise<T>\n', '', 'R3 cache rodado: duas aberturas'],
  ['funil chama a Stripe sem cache', 'funnel', "    cachedAdminStripe('funnel:subscriptions:all', async () => {", "    (async (_k: string, f: () => Promise<Stripe.Subscription[]>) => f())('funnel:subscriptions:all', async () => {", 'R3 funil rodado'],
  ['visão geral lê checkout_started em série', 'ceo', "  // KINEO-ADMIN-RAPIDO-1710 — checkoutEvents já veio na fase 1 (mesma leitura: values: ['checkout_started']).\n", "  const checkoutEvents2 = await fetchAllRows<{ user_id: string | null }>(admin, 'events', 'id, user_id', { column: 'name', values: ['checkout_started'] }, '/api/admin/ceo')\n", 'R4 visão geral: profiles, videos'],
  ['MRR ao vivo volta a ler uma por uma', 'mrr', '      subs.push(...(await Promise.all(ids.slice(i, i + STRIPE_MRR_BATCH).map((id) => stripe.subscriptions.retrieve(id)))))', '      for (const id of ids.slice(i, i + STRIPE_MRR_BATCH)) subs.push(await stripe.subscriptions.retrieve(id))', 'R4 MRR ao vivo'],
  ['rota CEO ignora o memo', 'ceoRoute', '    const data = await computeCeoDataCached()', '    const data = await computeCeoData()', 'R4 rota /api/admin/ceo'],
  ['régua: anual deixa de virar mensal', 'mrr', "      const perMonth = item?.price?.recurring?.interval === 'year' ? amount / 12 : amount\n", '      const perMonth = amount\n', 'R5 conta por assinatura'],
  ['régua: subscriberMrr muda', 'mrr', 'export function subscriberMrr(', 'export function subscriberMrr(/* mexido */', 'R5 régua do MRR: planBase'],
  ['régua: preço de tabela muda', 'mrr', 'export const PLAN_PRICE_USD: Record<string, number> = {', 'export const PLAN_PRICE_USD: Record<string, number> = { mexido: 1,', 'R5 régua do MRR: PLAN_PRICE_USD'],
  ['compute faz conta própria', 'ceo', '    const sub = subscriberMrr(p.plan, paidByUser.get(p.id))', '    const sub = { usd: 0, tableUsd: 0, source: \'table\' as const }', 'R5 compute.ts continua'],
  ['coerência volta a julgar ao abrir', 'coerPage', 'listFastCoherence(admin, { hours, limit: 150, engine, maxCompute: 0,', 'listFastCoherence(admin, { hours, limit: 150, engine, maxCompute: 6,', 'R6 coerência: a página só lê'],
  ['rota do botão sem gate', 'coerRoute', "    if (!user || !isAdminEmail(user.email?.toLowerCase() ?? '')) {", '    if (!user) {', 'R6 coerência: a rota do botão'],
  ['demo: GET volta a rodar o robô', 'demoRoute', '    // KINEO-ADMIN-RAPIDO-1710 — GET só lê (o avanço é do cron ads-v2-advance ou do PATCH).\n', '    await advanceDemosSobMedida(admin, { deadlineMs: Date.now() + 20_000, secret, now })\n', 'R7 demo: o GET não roda'],
  ['demo: PATCH sem gate', 'demoRoute', '    const gate = await adminUser()\n    if (!gate.ok) return gate.res\n    const admin = serviceClient()\n    if (!admin) return json({ error: \'unavailable\' }, 503)\n    const step', '    const admin = serviceClient()\n    if (!admin) return json({ error: \'unavailable\' }, 503)\n    const step', 'R7 demo: o PATCH'],
  ['demo: cron muda de frequência', 'vercel', '"path": "/api/cron/ads-v2-advance",\n      "schedule": "2-57/5 * * * *"', '"path": "/api/cron/ads-v2-advance",\n      "schedule": "*/1 * * * *"', 'R7 demo: o cron ads-v2-advance'],
  ['funil volta a 30 s', 'funnelClient', 'const POLL_MS = 5 * 60_000\n', 'const POLL_MS = 30_000\n', 'R8 polling: Funil'],
  ['visão geral sem pausa de aba', 'ceoClient', "setInterval(() => { if (typeof document === 'undefined' || !document.hidden) void poll() }, POLL_MS)", 'setInterval(poll, POLL_MS)', 'R8 polling: Visão geral'],
  ['coortes voltam a ler todos os profiles', 'cohort', ".ilike('trial_status', 'active'), { route", ", { route", 'R9 coortes: profiles filtrados'],
  ['índice com nome errado', 'idx', 'events_session_idx on', 'events_session_id_idx on', 'R10 migration dos índices'],
  ['RPC sem o filtro de internos', 'rpc', "    and (e.user_id is null or not (e.user_id = any (coalesce(p_internal_ids, '{}'::uuid[]))))\n", '', 'R10 migration do RPC'],
]
console.log('\n── mutantes (cada um precisa ser aplicado e ficar vermelho)')
for (const [nome, chave, de, para, alvo] of MUTANTES) {
  const original = REAL[chave]
  if (!original.includes(de) || conta(original, de) !== 1) { console.log(`  ✗ mutante "${nome}": âncora não achada ou repetida em ${F[chave]}`); falhas++; continue }
  const mutado = original.replace(de, para)
  if (mutado === original) { console.log(`  ✗ mutante "${nome}": não aplicou`); falhas++; continue }
  const S = { ...REAL, [chave]: mutado }
  const res = await todas(S)
  const alvoRes = res.filter(([r]) => r.startsWith(alvo))
  const pegou = alvoRes.length > 0 && alvoRes.some(([, p]) => !p)
  console.log(`  ${pegou ? '✓' : '✗'} mutante "${nome}" → vermelho em "${alvo}…"`)
  if (!pegou) falhas++
}

console.log(`\n═══ ${falhas === 0 ? 'TUDO VERDE' : `${falhas} FALHA(S)`} ═══`)
process.exit(falhas === 0 ? 0 : 1)
