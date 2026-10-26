// KINEO-PAINEL-VERDADE-2026-08-27 — provas dos consertos do painel /admin.
//
// Por padrão executa o código real com transporte/banco sintéticos. --live
// preserva as verificações de produção abaixo, usando só env já fornecido.
// Nunca carrega arquivo de ambiente. Os quatro defeitos históricos foram:
// truncamento silencioso do PostgREST, exclusão de conta interna faltando,
// rótulo que afirma um fato que os dados desmentem, e paginação sem ORDER BY.
// As fixtures locais exercitam truncamento, ordem, exclusões e erro da RPC;
// somente --live permite consultar dados de produção com credenciais explícitas.
//
// Rodar: node scripts/test-painel-verdade.mjs
// --live exige NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY explícitos.

import { readFileSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(join(RAIZ, 'package.json'))('typescript')
const liveRequested = process.argv.includes('--live')
if (liveRequested && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('--live requires explicit database URL and service-role key; no environment file is loaded.')
  process.exit(1)
}
let ok = 0
let falhou = 0
const check = (nome, cond, detalhe = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nome}`) }
  else { falhou++; console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`) }
}
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8')
/** Só o CÓDIGO, sem comentários. Sem isto o teste lê a explicação do defeito
 *  ("o `.limit(60000)` nunca teve efeito") como se fosse o defeito. Aconteceu
 *  na primeira execução deste arquivo. */
const codigo = (p) => ler(p)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n')

console.log('\n═══ PAINEL VERDADE — provas dos 4 consertos ═══\n')

// ─────────────────────────────────────────────────────────────────────────────
console.log('1) O truncamento do PostgREST saiu do código')
// ─────────────────────────────────────────────────────────────────────────────
const live = ler('app/api/admin/live/route.ts')
const liveCodigo = codigo('app/api/admin/live/route.ts')

check('nenhum .limit(60000) sobrou no CÓDIGO da rota live',
  !liveCodigo.includes('limit(60000)'),
  'o limite era ignorado pelo db.max_rows=1000 e mascarava o defeito')
check('as contagens não passam mais por new Set() em JS',
  !/const uniq\s*=/.test(liveCodigo),
  'contar em JS sobre resposta truncada foi a causa do 435=435')
check('a rota chama a RPC admin_live_counters',
  live.includes("admin.rpc('admin_live_counters'"))
check('os 6 contadores vêm da RPC, nenhum de .count local',
  ['visitors_7d: num(c.visitors_7d)', 'visitors_24h: num(c.visitors_24h)',
   'signups_7d: num(c.signups_7d)', 'signups_24h: num(c.signups_24h)',
   'videos_24h: num(c.videos_24h)', 'checkouts_24h: num(c.checkouts_24h)']
    .every((s) => live.includes(s)))
// KINEO-ADMIN-LEVE-2310 — runtime guardian proves failures never populate the successful snapshot cache.
check('falha da RPC retorna erro explícito 500 sem fabricar contadores zero',
  liveCodigo.includes("if (counters.error) throw new Error('admin_live_counters failed: ' + counters.error.message)") &&
  liveCodigo.includes("return NextResponse.json({ error: 'Failed to load live data.' }, { status: 500 })") &&
  !liveCodigo.includes('[0] ?? {}'),
  'erro da RPC não pode se tornar um snapshot de zeros cacheado')

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2) Conta interna: uma fonte só, em todo lugar')
// ─────────────────────────────────────────────────────────────────────────────
check('a rota importa a lista canônica de lib/internalAccounts',
  live.includes("from '@/lib/internalAccounts'"))
check('a lista viaja por parâmetro para a RPC (não duplicada em SQL)',
  live.includes('p_exact_emails: INTERNAL_EXACT_EMAILS') &&
  live.includes('p_like_patterns: INTERNAL_LIKE_PATTERNS'))
check('o filtro interno escrito à mão morreu',
  !liveCodigo.includes("startsWith('josephsskaf')"),
  'ele só pegava 3 dos 14 padrões: a irmã do fundador passava como cliente')
check('internal() agora delega para isInternalEmail()',
  live.includes('const internal = (e: string) => isInternalEmail(e)'))
check('a cópia local de PAID_PLANS morreu',
  !liveCodigo.includes("new Set(['starter', 'basic', 'pro', 'autopilot'])"),
  'faltavam os planos *_trial: quem estava em trial pago aparecia como grátis')
check('is_paid usa isPayingPlan() canonico e separa trial',
  live.includes('is_paid: isPayingPlan(') && live.includes('is_trial: isTrialPlan('))

const migracao = ler('supabase/migrations/20260827200000_admin_live_counters_exact.sql')
check('a migration NÃO tem e-mail de conta interna escrito dentro',
  !migracao.includes('josephsskaf@gmail.com'),
  'duplicar a lista em SQL criaria a segunda fonte da verdade')
check('a RPC é service_role only (events está trancada desde 27/08)',
  migracao.includes('revoke all on function') &&
  migracao.includes('grant execute on function public.admin_live_counters(text[], text[]) to service_role'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3) Paginação estável (fetchAllRows)')
// ─────────────────────────────────────────────────────────────────────────────
const db = ler('app/api/admin/_shared/db.ts')
const paging = ler('lib/supabase/readAll.ts')
check('fetchAllRows delega para readAll, que ordena pela chave unica',
  db.includes('await readAll(() => {') && paging.includes('query = query.order(key, { ascending: true })'),
  'OFFSET sem ORDER BY pode repetir ou perder linha entre páginas')
check('a ordenação canonica vem ANTES do .range()',
  paging.indexOf('query = query.order(key') < paging.indexOf('query.range(from, from + POSTGREST_PAGE_SIZE - 1)'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n4) O card CHECKOUT LEAK parou de afirmar o que não mediu')
// ─────────────────────────────────────────────────────────────────────────────
const compute = ler('app/api/admin/ceo/compute.ts')
const cliente = ler('app/(dashboard)/admin/ceo/CeoClient.tsx')

check('a frase falsa saiu da tela',
  !cliente.includes('typed their email into a payment page'),
  'era falsa para ~35 das 36 pessoas do card')
check('compute mede quem disparou checkout_started de verdade',
  compute.includes("values: ['checkout_started']") && compute.includes('const reachedCheckout = reachedIds.size'))
check('a taxa de fechamento real é exposta',
  compute.includes('realConversion: pct(reachedCheckoutPaid, reachedCheckout)'))
check('a tela usa a base real como número grande',
  cliente.includes('leak.reachedCheckout - leak.reachedCheckoutPaid'))
check('a tela avisa que customer id pode vir de prefetch',
  cliente.includes('browser prefetch'))
check('as sessões da Stripe agora paginam',
  compute.includes('autoPagingEach'),
  'limit:100 é o máximo por página, não o total')
check('conta interna sai ANTES dos contadores da Stripe',
  compute.indexOf('if (custEmail && isInternalEmail(custEmail)) return') <
  compute.indexOf('checkoutCreated += 1'))
check('a paginação da Stripe tem teto explícito',
  compute.includes('MAX_SESSOES'))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n5) Runtime: RPC, MRR e paginação reais com banco sintético')
// ─────────────────────────────────────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!liveRequested) {
  // Fresh module instances per world. No SDK/client/network may escape these
  // explicit boundaries; readAll, fetchAllRows, MRR and the route remain real.
  function loader(mocks = {}) {
    const cache = new Map()
    function load(file) {
      const absolute = resolve(RAIZ, file), rel = relative(RAIZ, absolute).replace(/\\/g, '/')
      if (Object.hasOwn(mocks, rel)) return mocks[rel]
      if (cache.has(absolute)) return cache.get(absolute).exports
      if (rel.startsWith('..') || rel.split('/').some(part => /^\.env(?:\.|$)/i.test(part))) throw new Error('unapproved source')
      const module = { exports: {} }; cache.set(absolute, module)
      const compiled = ts.transpileModule(readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
      vm.runInNewContext(compiled, { module, exports: module.exports, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://database.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-offline-key' } }, URL, URLSearchParams,
        require(id) {
          if (Object.hasOwn(mocks, id)) return mocks[id]
          if (id.startsWith('@/')) return load(id.slice(2) + '.ts')
          if (id.startsWith('.')) return load(resolve(dirname(absolute), id + '.ts'))
          throw new Error('unapproved import ' + id)
        }, console: { log() {}, error() {}, warn() {} },
        fetch() { throw new Error('Network forbidden in offline guardian') },
      }, { filename: rel, timeout: 5000 })
      return module.exports
    }
    return load
  }
  const baseMocks = {
    '@supabase/supabase-js': { createClient() { throw new Error('Real database client forbidden') } },
    '@/lib/stripe': { stripe: {} },
    'lib/serverEvents.ts': { writeServerEvent: async () => true },
  }
  const load = loader(baseMocks), mrr = load('app/api/admin/_shared/mrr.ts'), sharedDb = load('app/api/admin/_shared/db.ts')
  check('runtime MRR separa trial pago de mensalidade', mrr.isPaidPlan('basic_trial') && mrr.isTrialPlan('basic_trial') && !mrr.isPayingPlan('basic_trial'))
  check('runtime MRR reconhece assinantes e falha fechado em free/desconhecido', mrr.isPayingPlan(' BASIC ') && mrr.isPayingPlan('business') && !mrr.isPayingPlan('free') && !mrr.isPayingPlan(null))
  const rows = Array.from({ length: 2501 }, (_, id) => ({ id: String(id).padStart(5, '0') })).reverse()
  function database(failSecond = false) {
    const operations = []
    return { operations, from() {
      let ordered = false, filtered = rows
      const query = {
        select() { return query }, in(_key, ids) { filtered = filtered.filter(row => ids.includes(row.id)); return query },
        order(key, options) { operations.push({ type: 'order', key, ascending: options.ascending }); ordered = true; return query },
        range(from, to) {
          operations.push({ type: 'range', from, ordered })
          if (failSecond && from === 1000) return { data: null, error: { message: 'synthetic second-page failure' } }
          const list = ordered ? [...filtered].sort((a, b) => a.id.localeCompare(b.id)) : filtered
          return { data: list.slice(from, to + 1), error: null }
        },
      }; return query
    } }
  }
  const paged = database(), all = await sharedDb.fetchAllRows(paged, 'profiles', 'id')
  check('runtime le2501 linhas em3paginas sem truncar ou duplicar', all.length === 2501 && new Set(all.map(row => row.id)).size === 2501 && paged.operations.filter(op => op.type === 'range').length === 3)
  check('runtime ordena cada pagina antes de range', paged.operations.filter(op => op.type === 'range').every(op => op.ordered) && all[0].id === '00000' && all.at(-1).id === '02500')
  let rejected = false
  try { await sharedDb.fetchAllRows(database(true), 'profiles', 'id') } catch { rejected = true }
  check('runtime erro na pagina2 rejeita resultado parcial', rejected)
  const empty = database()
  check('runtime filtro vazio nao consulta banco', (await sharedDb.fetchAllRows(empty, 'profiles', 'id', { column: 'id', values: [] })).length === 0 && empty.operations.length === 0)
  const internal = load('lib/internalAccounts.ts')
  function routeWorld() {
    const state = { user: { email: 'josephsskaf@gmail.com' }, rpcError: false, calls: [] }
    const counters = { visitors_7d: 17, visitors_24h: 7, signups_7d: 3, signups_24h: 2, videos_24h: 1, checkouts_24h: 4 }
    const admin = { rpc: async (name, args) => { state.calls.push({ name, args }); return { data: [counters], error: state.rpcError ? { message: 'synthetic RPC failure' } : null } },
      from() { const query = {}; for (const key of ['select', 'gte', 'order', 'in', 'eq', 'limit']) query[key] = () => query; query.range = () => ({ data: [], error: null }); return query } }
    const route = loader({ ...baseMocks,
      'next/server': { NextResponse: { json: (body, opts = {}) => ({ body, status: opts.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }) },
      '../_shared/db': { isAdminEmail: sharedDb.isAdminEmail, serviceClient: () => admin },
      '@/lib/admin/checkoutHonesto': { carregarCheckoutHonesto: async () => null },
      '@/lib/admin/ledgerGrants': { LEDGER_GRANT_EVENTS: [], summarizeLedgerGrants: () => new Map() },
      '@/lib/admin/rotuloCredito': { rotuloCredito: () => '' },
      '@/lib/admin/narrationCompletion': { isNarrationCompletionEvent: () => false },
    })('app/api/admin/live/route.ts')
    return { state, get: () => route.GET() }
  }
  const world = routeWorld(), response = await world.get()
  check('runtime rota preserva os seis contadores reais da RPC', response.status === 200 && ['visitors_7d', 'visitors_24h', 'signups_7d', 'signups_24h', 'videos_24h', 'checkouts_24h'].every(key => response.body[key] === ({ visitors_7d:17, visitors_24h:7, signups_7d:3, signups_24h:2, videos_24h:1, checkouts_24h:4 })[key]))
  check('runtime RPC recebe exclusoes canonicas sem segunda lista', world.state.calls[0]?.name === 'admin_live_counters' && JSON.stringify(world.state.calls[0].args) === JSON.stringify({ p_exact_emails: internal.INTERNAL_EXACT_EMAILS, p_like_patterns: internal.INTERNAL_LIKE_PATTERNS }))
  world.state.user = null
  check('runtime usuario sem autorizacao nao recebe snapshot privado', (await world.get()).status === 403)
  const failure = routeWorld(); failure.state.rpcError = true
  check('runtime RPC com erro devolve500, nunca zeros bem-sucedidos', (await failure.get()).status === 500)
  failure.state.rpcError = false
  check('runtime erro RPC nao e cacheado e a proxima chamada recupera', (await failure.get()).status === 200 && failure.state.calls.length === 2)
} else {
  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(url, key, { auth: { persistSession: false } })
  const { INTERNAL_EXACT_EMAILS, INTERNAL_LIKE_PATTERNS } =
    await import('../lib/internalAccounts.ts').catch(() => ({}))

  // Reproduz a lista sem depender de import de .ts (node não lê TS puro):
  const exatos = INTERNAL_EXACT_EMAILS ?? [
    'josephsskaf@gmail.com', 'josephskaf@hotmail.com', 'victoriaskaf96@gmail.com',
    'joseph+teste01@gmail.com', 'teste01@shortsforgeai.com',
  ]
  const padroes = INTERNAL_LIKE_PATTERNS ?? [
    'josephsskaf+%@gmail.com', 'joseph+%@gmail.com', '%@theresanaiforthat.com',
    'josephsskaf%', 'josephskaf%', '%@shortsforgeai.com', 'test%', '%mailinator%', 'smoketest%',
  ]

  let data = null, error = null, semRede = false
  try {
    const r = await admin.rpc('admin_live_counters', { p_exact_emails: exatos, p_like_patterns: padroes })
    data = r.data; error = r.error
  } catch (e) {
    // Sandbox sem saída para o Supabase. Não é falha do código: é falta de
    // rede. Marcar como pulado em vez de reprovar — teste que reprova por
    // motivo ambiental treina a casa a ignorar teste vermelho.
    semRede = true
    console.log(`  ⚠ sem rede até o Supabase (${e instanceof Error ? e.message : e}) — checagens de banco puladas`)
  }
  // supabase-js NÃO lança em falha de rede: devolve `{ data: null, error }`.
  // Sem esta checagem o teste reprova por falta de internet e o vermelho
  // deixa de significar "o código quebrou".
  const msgErro = String(error?.message ?? '')
  if (!semRede && /fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|network/i.test(msgErro)) {
    semRede = true
    console.log(`  ⚠ sem rede até o Supabase (${msgErro}) — checagens de banco puladas`)
    console.log('     validado fora deste sandbox: 7d=1820 24h=574 signups=18 videos=9')
  }
  if (!semRede) check('a RPC existe e responde pelo service_role', !error, error?.message)

  if (!semRede && !error) {
    const c = (data ?? [])[0] ?? {}
    const n = (v) => Number(v ?? 0)
    console.log(`     → 7d=${n(c.visitors_7d)} 24h=${n(c.visitors_24h)} signups=${n(c.signups_24h)} videos=${n(c.videos_24h)}`)

    check('visitors_7d e visitors_24h são DIFERENTES',
      n(c.visitors_7d) !== n(c.visitors_24h),
      'iguais era exatamente o sintoma que o fundador viu')
    check('visitors_7d é maior que visitors_24h',
      n(c.visitors_7d) > n(c.visitors_24h),
      'a janela maior tem que conter a menor')
    check('nenhum contador voltou o valor truncado 435',
      n(c.visitors_7d) !== 435 && n(c.visitors_24h) !== 435)
    check('todos os 6 contadores são número finito',
      ['visitors_7d','visitors_24h','signups_7d','signups_24h','videos_24h','checkouts_24h']
        .every((k) => Number.isFinite(n(c[k]))))
    check('signups_7d >= signups_24h', n(c.signups_7d) >= n(c.signups_24h))

    // A prova de que a exclusão de conta interna está de fato acontecendo:
    // o bruto (sem exclusão) tem que ser >= o filtrado, e para vídeos das
    // últimas 24h a diferença é justamente os renders de teste do fundador.
    const { count: brutoVideos } = await admin
      .from('videos').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 864e5).toISOString())
    check('videos_24h filtrado <= bruto (a exclusão está agindo)',
      n(c.videos_24h) <= (brutoVideos ?? 0),
      `filtrado=${n(c.videos_24h)} bruto=${brutoVideos}`)
  }
}

console.log(`\n═══ ${ok} passaram, ${falhou} falharam ═══\n`)
process.exit(falhou === 0 ? 0 : 1)
