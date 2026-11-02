// KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — guardião do cron resume-parked-renders: nenhuma tentativa N+1 (e nenhum e-mail "Nothing was
// charged") sem LER a cobrança da tentativa N.
//
// O DEFEITO (revisão de 01/11, ALTO, já em produção no 124824492): a retomada classificada 'retry_later' — abort do cron em 240 s com a
// rota de filme viva até 300 s; 503 pending:true "Your AI scenes may already be processing"; 503 "automatic refund is still being
// confirmed" — gravava outcome:'retry_later' e, na rodada seguinte, a tentativa N+1 saía com idDaRetomada(gen, N+1) sem ler o débito da
// N: outro claim, outro débito, dois filmes. E o fechamento 'expired' (24 h) vinha ANTES de qualquer leitura: e-mail "Nothing was
// charged" com o débito vivo, e a série lia 'expired' como falha sem cobrança (tentativa 2 por cima).
//
// COMO PROVA: roda a ROTA REAL do cron (app/api/cron/resume-parked-renders/route.ts, GET) contra um PostgREST falso servido pelo
// `fetch` global (o mesmo supabase-js de produção fala HTTP com ele), uma rota de filme falsa (cobra, aborta, 503, 4xx…) e um Resend
// falso. Relógio controlado (Date.now). Cada caso roda na rota ATUAL e numa CÓPIA QUEBRADA — a rota e o lib da base 124824492 (o que
// está em produção) ou um mutante de uma linha — e a cópia quebrada tem de cobrar duas vezes / mentir no e-mail.
//   T1  abort em 240 s com o débito vivo → adota (1 POST, 1 débito); base: tentativa 2 e 2 débitos.
//   T2  503 pending:true "may already be processing" com débito vivo → adota; base: 2 débitos.
//   T3  503 "refund is still being confirmed" e o débito segue vivo → adota; T3b o estorno se confirma → aí a tentativa 2 sai (1 vivo).
//   T4  a rota cobra DEPOIS da rodada seguinte (abort, débito aos 5 min 20 s do aluguel) → espera o assentamento de 10 min; mutante
//       sem a espera: 2 débitos.
//   T5  débito ilegível (banco instável) por 25 h → nenhuma tentativa 2, nenhum fechamento, nenhum e-mail.
//   T6  24 h com um aluguel retry_later de débito vivo → fecha 'resumed' (a série segue o id 'parked-…'), SEM e-mail; base: 'expired'
//       + "Nothing was charged" com o débito vivo. T6b a cobrança chega depois da virada das 24 h → espera, nunca o e-mail falso.
//   T7  24 h com o aluguel lido sem cobrança (assentado) → 'expired' + o e-mail honesto continua saindo.
//   T8  4xx que chegou depois do débito → nada de 'failed' nem e-mail; a rodada seguinte adota; 4xx sem débito → 'failed' + e-mail.
//   T9  'started' cujo fechamento falhou e cujo filme foi estornado → retoma (tentativa 2); base: adotava às cegas e o filme se perdia.
//   T10 filme grátis de promoção (claim pending de custo 0, sem débito) → adota pelo claim; mutante que ignora o claim: 2 filmes.
//   F   o texto da rota: leitura antes do vencido, 4xx passa pela cobrança, e os trechos que o test-fila-queda-fal-2810 confere.
// Rodar: npx tsx scripts/test-retomada-sem-cobranca-dupla-0111.mts
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.fake'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-fake'
process.env.CRON_SECRET = 'cron-secret-fake'
process.env.RESEND_API_KEY = 're_fake'
process.env.NEXT_PUBLIC_APP_URL = 'http://app.fake'

const { NextRequest } = await import('next/server')
const { cinematicClaimId } = await import('../lib/cinematic/claim')
const { idDaRetomada, idDoFechamento } = await import('../lib/filaQuedaFalIds')
const L = await import('../lib/filaQuedaFal')

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const BASE = '124824492'
const ROTA = 'app/api/cron/resume-parked-renders/route.ts'
const LIB = 'lib/filaQuedaFal.ts'
const USER = '11111111-2222-4333-8444-555555555555'
const GEN = '7d3f0c2a-9b1e-4c55-8a10-000000000001'
const MIN = 60_000
const H = 60 * MIN
const T0 = Date.UTC(2026, 10, 2, 12, 0)
const REFUND_PENDENTE = 'No AI scenes started and your automatic refund is still being confirmed. Please retry this same generation.'
const PROCESSANDO = 'Your AI scenes may already be processing. Please wait a moment before retrying.'

// ── relógio ──────────────────────────────────────────────────────────────────────────────────────────────────────────
let clock = T0
Date.now = () => clock
const iso = (ms: number) => new Date(ms).toISOString()

// ── o mundo: banco, rota de filme e Resend falsos atrás do fetch global ────────────────────────────────────────────────
type Row = Record<string, unknown>
type Comportamento = 'ok' | 'abort-charged' | 'abort-late-charge' | 'abort-no-charge' | 'pending-processing' | 'refund-pending' | 'refund-pending-confirma' | 'parked' | 'bad-request-charged' | 'bad-request' | 'promo-abort'
class Mundo {
  tables: Record<string, Row[]> = { events: [], credit_debits: [], profiles: [{ id: USER, email: 'cliente@exemplo.com', email_opted_out: false }] }
  failSelect = new Set<string>()
  failInsertIds = new Set<string>()
  emails: { subject: string; text: string }[] = []
  posts: { generationId: string; at: number }[] = []
  agenda: { at: number; fn: () => void }[] = []
  comportamentos: Comportamento[] = []
  seq = 0
}
let mundo = new Mundo()
const renderIdDe = (gen: string) => `cinematic-${cinematicClaimId(USER, gen)}`
const debitar = (gen: string, refunded = false) => mundo.tables.credit_debits.push({ render_id: renderIdDe(gen), user_id: USER, refunded_at: refunded ? iso(clock) : null, created_at: iso(clock) })
const estornar = (gen: string) => { for (const d of mundo.tables.credit_debits) if (d.render_id === renderIdDe(gen)) d.refunded_at = iso(clock) }
const vivos = () => mundo.tables.credit_debits.filter((d) => !d.refunded_at)
const evs = (name: string) => mundo.tables.events.filter((e) => e.name === name)
const fechamentos = () => evs(L.PARKED_CLOSED_EVENT)
const alugueis = () => evs(L.PARKED_LEASE_EVENT)
const nadaCobradoEnviado = () => mundo.emails.filter((e) => /Nothing was charged/.test(e.text))

function rotaDeFilme(gen: string, c: Comportamento): { abort?: true; status?: number; json?: unknown } {
  mundo.tables.events.push({ id: `disp-${++mundo.seq}`, name: 'generation_dispatch_received', user_id: USER, created_at: iso(clock), metadata: { generation_id: gen } })
  switch (c) {
    case 'ok': debitar(gen); return { status: 200, json: { ok: true, generationId: gen } }
    case 'abort-charged': debitar(gen); return { abort: true }
    case 'abort-late-charge': mundo.agenda.push({ at: clock + 5 * MIN + 20_000, fn: () => debitar(gen) }); return { abort: true }
    case 'abort-no-charge': return { abort: true }
    case 'pending-processing': debitar(gen); return { status: 503, json: { pending: true, error: PROCESSANDO } }
    case 'refund-pending': debitar(gen); return { status: 503, json: { error: REFUND_PENDENTE } }
    case 'refund-pending-confirma': debitar(gen); mundo.agenda.push({ at: clock + 3 * MIN, fn: () => estornar(gen) }); return { status: 503, json: { error: REFUND_PENDENTE } }
    case 'parked':
      debitar(gen, true)
      mundo.tables.events.push({ id: `child-${++mundo.seq}`, name: L.PARKED_EVENT, user_id: USER, session_id: gen, created_at: iso(clock), metadata: { reason: 'capacity', refunded: true, request: { prompt: 'x', duration: 60 } } })
      return { status: 503, json: { queued: true, parked: true, error: L.PARKED_MESSAGE } }
    case 'bad-request-charged': debitar(gen); return { status: 400, json: { error: 'Invalid request.' } }
    case 'bad-request': return { status: 400, json: { error: 'Invalid request.' } }
    case 'promo-abort':
      mundo.tables.events.push({ id: cinematicClaimId(USER, gen), name: 'cinematic_submission_claim', user_id: USER, path: '/api/generate-video-cinematic', session_id: gen, created_at: iso(clock), metadata: { generation_id: gen, status: 'pending', credit_cost: 0 } })
      return { abort: true }
  }
}

/** Um filtro do PostgREST (eq/gt/gte/lt/lte/in/like/not.like/is) sobre uma linha. */
function casa(row: Row, col: string, expr: string): boolean {
  const neg = expr.startsWith('not.')
  const e = neg ? expr.slice(4) : expr
  const dot = e.indexOf('.')
  const op = e.slice(0, dot)
  const v = e.slice(dot + 1)
  const cel = row[col]
  const s = cel === null || cel === undefined ? null : String(cel)
  let r: boolean
  if (op === 'eq') r = s === v
  else if (op === 'gt') r = s !== null && s > v
  else if (op === 'gte') r = s !== null && s >= v
  else if (op === 'lt') r = s !== null && s < v
  else if (op === 'lte') r = s !== null && s <= v
  else if (op === 'in') r = s !== null && v.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, '')).includes(s)
  else if (op === 'like') r = s !== null && new RegExp('^' + v.split('%').map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(s)
  else if (op === 'is') r = v === 'null' ? s === null : false
  else throw new Error('filtro não suportado: ' + expr)
  return neg ? !r : r
}
const json = (body: unknown, status = 200) => new Response(status === 204 ? null : body === '' ? '' : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
async function rest(url: URL, init: RequestInit | undefined): Promise<Response> {
  const table = url.pathname.replace('/rest/v1/', '')
  const rows = (mundo.tables[table] ??= [])
  const method = (init?.method ?? 'GET').toUpperCase()
  const filtros: [string, string][] = []
  for (const [k, v] of url.searchParams) if (!['select', 'order', 'limit', 'offset', 'columns'].includes(k)) filtros.push([k, v])
  const sel = (r: Row) => filtros.every(([c, e]) => casa(r, c, e))
  if (method === 'GET') {
    if (mundo.failSelect.has(table)) return json({ message: 'canceling statement due to statement timeout', code: '57014', details: null, hint: null }, 500)
    let out = rows.filter(sel)
    const order = url.searchParams.get('order')
    if (order) { const [col, dir] = order.split('.'); out = [...out].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : String(a[col]) > String(b[col]) ? 1 : 0) * (dir === 'desc' ? -1 : 1)) }
    const lim = url.searchParams.get('limit')
    if (lim) out = out.slice(0, Number(lim))
    return json(out.map((r) => ({ ...r })))
  }
  const body = init?.body ? JSON.parse(String(init.body)) : null
  if (method === 'POST') {
    for (const r of (Array.isArray(body) ? body : [body]) as Row[]) {
      const row: Row = { created_at: iso(clock), ...r }
      if (row.id === undefined) row.id = `auto-${++mundo.seq}`
      if (mundo.failInsertIds.has(String(row.id))) return json({ message: 'connection reset', code: '08006', details: null, hint: null }, 500)
      if (rows.some((x) => x.id === row.id)) return json({ message: 'duplicate key value violates unique constraint', code: '23505', details: null, hint: null }, 409)
      rows.push(row)
    }
    return json('', 201)
  }
  if (method === 'PATCH') { for (const r of rows.filter(sel)) Object.assign(r, body); return json('', 204) }
  throw new Error('método não suportado: ' + method)
}
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.origin === 'http://supabase.fake') return rest(url, init)
  if (url.href === 'http://app.fake/api/generate-video-cinematic') {
    const gen = String(JSON.parse(String(init?.body)).generationId)
    mundo.posts.push({ generationId: gen, at: clock })
    const c = mundo.comportamentos[mundo.posts.length - 1] ?? 'ok'
    const r = rotaDeFilme(gen, c)
    if (r.abort) throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    return json(r.json, r.status)
  }
  if (url.href === 'https://api.resend.com/emails') { const b = JSON.parse(String(init?.body)); mundo.emails.push({ subject: b.subject, text: b.text }); return json({ id: 'em_' + mundo.emails.length }) }
  throw new Error('fetch inesperado: ' + url.href)
}) as typeof fetch

// ── as rotas: a ATUAL, a da BASE (produção) e os mutantes ─────────────────────────────────────────────────────────────
type Get = (req: InstanceType<typeof NextRequest>) => Promise<Response>
const temporarios: string[] = []
const troca = (src: string, de: string, para: string, nome: string) => { if (!src.includes(de)) throw new Error(`mutante ${nome}: trecho não encontrado: ${de.slice(0, 90)}`); return src.split(de).join(para) }
async function rotaDe(nome: string, rota: string, lib: string | null): Promise<Get> {
  let src = rota
  if (lib !== null) {
    const libArq = `lib/__mutante_rscd_${nome}.ts`
    fs.writeFileSync(libArq, lib); temporarios.push(libArq)
    src = troca(src, "from '@/lib/filaQuedaFal'", `from '@/lib/__mutante_rscd_${nome}'`, nome)
  }
  const arq = `app/api/cron/resume-parked-renders/__mutante_rscd_${nome}.ts`
  fs.writeFileSync(arq, src); temporarios.push(arq)
  return (await import(`../${arq}`)).GET as Get
}
const atual = (await import('../app/api/cron/resume-parked-renders/route')).GET as Get
const rotaAtual = rd(ROTA)
const libAtual = rd(LIB)
const git = (a: string[]) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r\n/g, '\n')
let base: Get, semEspera: Get, filtroVelho: Get, quatroCentosCego: Get, semClaim: Get, startedCego: Get
try {
  base = await rotaDe('base', git(['show', `${BASE}:${ROTA}`]), git(['show', `${BASE}:${LIB}`]))
  semEspera = await rotaDe('sem_espera', rotaAtual, troca(libAtual, 'export const PARKED_DEBIT_SETTLE_MS = PARKED_LEASE_TTL_MS', 'export const PARKED_DEBIT_SETTLE_MS = 0', 'sem_espera'))
  filtroVelho = await rotaDe('filtro_velho', troca(rotaAtual, '!aluguelPodeTerCobrado(md.outcome)', "(md.outcome !== undefined && md.outcome !== 'started')", 'filtro_velho'), null)
  quatroCentosCego = await rotaDe('4xx_cego', rotaAtual, troca(libAtual, "  if (outcome !== 'failed') return outcome\n", '  return outcome\n', '4xx_cego'))
  semClaim = await rotaDe('sem_claim', rotaAtual, troca(libAtual, "  if (input.claim.status === 'done' || input.claim.status === 'settled') return 'live'\n  if (input.claim.status === 'pending' && input.claim.creditCost === 0) return 'live'\n", '', 'sem_claim'))
  startedCego = await rotaDe('started_cego', rotaAtual, troca(libAtual, "candidatos.filter((c) => c.iniciado && c.debito === 'none')", 'candidatos.filter((c) => c.iniciado)', 'started_cego'))
} finally {
  for (const f of temporarios) { try { fs.unlinkSync(f) } catch { /* já foi */ } }
}

// ── o cenário: estaciona em T0, roda o cron a cada `intervalo` ────────────────────────────────────────────────────────
const req = () => new NextRequest('http://app.fake/api/cron/resume-parked-renders?confirm=SEND', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
type Res = { results?: { generation: string; decision: string; outcome?: string; email?: string }[] }
async function passe(GET: Get): Promise<Res> {
  for (const a of [...mundo.agenda].sort((x, y) => x.at - y.at)) if (a.at <= clock) { a.fn(); mundo.agenda.splice(mundo.agenda.indexOf(a), 1) }
  const log = console.log, err = console.error, warn = console.warn
  console.log = () => {}; console.error = () => {}; console.warn = () => {}
  try { const r = await GET(req()); return await r.json() as Res } finally { console.log = log; console.error = err; console.warn = warn }
}
function novoMundo(comportamentos: Comportamento[], parkedAt = T0) {
  mundo = new Mundo()
  mundo.comportamentos = comportamentos
  mundo.tables.events.push({ id: 'parked-row-1', name: L.PARKED_EVENT, user_id: USER, session_id: GEN, created_at: iso(parkedAt), metadata: { version: L.PARKED_VERSION, reason: 'balance_quota', refunded: true, request: { prompt: 'The lighthouse keeper who vanished in 1900', duration: 60, engine: 'seedance' }, country: 'US' } })
}
/** `n` rodadas, uma a cada `intervalo`, a partir de `inicio`. Devolve as decisões de cada rodada. */
async function rodadas(GET: Get, n: number, inicio: number, intervalo = 5 * MIN, antes?: (i: number) => void): Promise<string[]> {
  const out: string[] = []
  clock = inicio
  for (let i = 0; i < n; i++) {
    antes?.(i)
    const r = await passe(GET)
    out.push((r.results ?? []).map((x) => `${x.decision}${x.outcome ? ':' + x.outcome : ''}`).join(','))
    clock += intervalo
  }
  return out
}
const fechamento = () => fechamentos()[0]?.metadata as { outcome?: string; resume_generation_id?: string; recovered?: boolean } | undefined
const r1 = idDaRetomada(GEN, 1)
const r2 = idDaRetomada(GEN, 2)

// ── T1/T2/T3: retry_later com o débito vivo ──────────────────────────────────────────────────────────────────────────
console.log('T — retry_later com débito vivo: adota, nunca a tentativa N+1')
for (const [rot, c] of [['T1 abort do cron em 240 s (a rota seguiu e cobrou)', 'abort-charged'], ['T2 503 pending:true "may already be processing"', 'pending-processing'], ['T3 503 "refund is still being confirmed" e o estorno não vem', 'refund-pending']] as const) {
  novoMundo([c, 'ok', 'ok', 'ok'])
  const d = await rodadas(atual, 12, T0 + 5 * MIN)
  const f = fechamento()
  ok(mundo.posts.length === 1 && vivos().length === 1 && alugueis().length === 1 && f?.outcome === 'resumed' && f.resume_generation_id === r1 && f.recovered === true && nadaCobradoEnviado().length === 0,
    `${rot}: 1 POST, 1 débito, fechado 'resumed' com o id da tentativa 1 (1 h de rodadas; rodada 2 = ${d[1]})`)
  novoMundo([c, 'ok', 'ok', 'ok'])
  await rodadas(base, 12, T0 + 5 * MIN)
  ok(mundo.posts.length >= 2 && vivos().length >= 2, `${rot} — BASE ${BASE} (produção): ${mundo.posts.length} POSTs e ${vivos().length} débitos vivos para UM clique (o defeito, reproduzido)`)
}
{
  novoMundo(['abort-charged', 'ok'])
  await rodadas(filtroVelho, 6, T0 + 5 * MIN)
  ok(vivos().length === 2 && mundo.posts.length === 2, "T1m mutante (o filtro de antes: só lê aluguel sem desfecho ou 'started'): o retry_later abre a tentativa 2 — 2 débitos")
}
{
  novoMundo(['refund-pending-confirma', 'ok'])
  const d = await rodadas(atual, 8, T0 + 5 * MIN)
  ok(mundo.posts.length === 2 && mundo.posts[1].generationId === r2 && vivos().length === 1 && vivos()[0].render_id === renderIdDe(r2) && fechamento()?.outcome === 'resumed' && fechamento()?.resume_generation_id === r2,
    `T3b o estorno da tentativa 1 se confirma: aí sim a tentativa 2 sai — 1 débito vivo (o da 2), fechado com ela (${d[1]})`)
}

// ── T4: a rota cobra depois da rodada seguinte ───────────────────────────────────────────────────────────────────────
console.log('T4 — "sem débito" logo depois do aluguel ainda não prova nada')
{
  novoMundo(['abort-late-charge', 'ok'])
  const d = await rodadas(atual, 6, T0 + 5 * MIN)
  ok(d[1] === 'lease_debit_settling' && mundo.posts.length === 1 && vivos().length === 1 && fechamento()?.resume_generation_id === r1,
    `T4 a cobrança chega aos 5 min 20 s do aluguel: a rodada dos 5 min espera (${d[1]}), a dos 10 min adota — 1 POST, 1 débito`)
  ok(L.PARKED_DEBIT_SETTLE_MS >= L.PARKED_ROUTE_MAX_MS && L.PARKED_ROUTE_MAX_MS === 300_000 && /export const maxDuration = 300\n/.test(rd('app/api/generate-video-cinematic/route.ts')), 'T4b a espera (10 min) cobre o teto da rota de filme (maxDuration 300 s, lido na rota)')
  novoMundo(['abort-late-charge', 'ok'])
  await rodadas(semEspera, 6, T0 + 5 * MIN)
  ok(mundo.posts.length === 2 && vivos().length === 2, 'T4m mutante (sem a espera de assentamento): a tentativa 2 sai aos 5 min e a 1 cobra depois — 2 débitos')
}

// ── T5: débito ilegível ──────────────────────────────────────────────────────────────────────────────────────────────
console.log('T5 — banco instável: nada é decidido às cegas')
{
  novoMundo(['abort-charged', 'ok'])
  await rodadas(atual, 1, T0 + 5 * MIN)
  mundo.failSelect.add('credit_debits')
  const d = await rodadas(atual, 26 * 12, T0 + 10 * MIN)
  ok(mundo.posts.length === 1 && fechamentos().length === 0 && mundo.emails.length === 0 && d.slice(0, 12 * 23).every((x) => x === 'lease_debit_unreadable'),
    `T5 26 h com o débito ilegível: 1 POST, nenhum fechamento, nenhum e-mail (decisões: ${[...new Set(d)].join(' | ') || 'fora da janela'})`)
}

// ── T6/T7: a virada das 24 h ─────────────────────────────────────────────────────────────────────────────────────────
console.log('T6 — 24 h: o vencido só fecha (e só diz "nothing was charged") depois de ler a cobrança')
{
  novoMundo(['abort-charged'])
  const d = await rodadas(atual, 3, T0 + 23 * H + 55 * MIN)
  const f = fechamento()
  ok(d[1].startsWith('resume_recovered') && f?.outcome === 'resumed' && f.resume_generation_id === r1 && mundo.emails.length === 0 && mundo.posts.length === 1,
    `T6 aluguel retry_later às 23 h 55 com débito vivo, rodada das 24 h: fecha 'resumed' com o id 'parked-…' (a série segue esse filme), sem e-mail (${d[1]})`)
  novoMundo(['abort-charged'])
  await rodadas(base, 3, T0 + 23 * H + 55 * MIN)
  ok(fechamento()?.outcome === 'expired' && nadaCobradoEnviado().length === 1 && vivos().length === 1, `T6 — BASE ${BASE}: fecha 'expired' e manda "Nothing was charged" com o débito VIVO (o e-mail falso, reproduzido)`)
  novoMundo(['abort-late-charge'])
  const d2 = await rodadas(atual, 4, T0 + 23 * H + 55 * MIN)
  ok(d2[1] === 'lease_debit_settling' && fechamento()?.outcome === 'resumed' && mundo.emails.length === 0,
    `T6b a cobrança chega depois da virada das 24 h: espera (${d2[1]}) e adota — o e-mail falso nunca sai`)
  novoMundo(['abort-late-charge'])
  await rodadas(semEspera, 4, T0 + 23 * H + 55 * MIN)
  ok(fechamento()?.outcome === 'expired' && nadaCobradoEnviado().length === 1 && vivos().length === 1, 'T6m mutante (sem a espera): "Nothing was charged" sai e a cobrança chega 20 s depois')
}
{
  novoMundo(['abort-no-charge', 'abort-no-charge'])
  const d = await rodadas(atual, 4, T0 + 23 * H + 50 * MIN)
  ok(fechamento()?.outcome === 'expired' && nadaCobradoEnviado().length === 1 && vivos().length === 0 && (alugueis()[0].metadata as { outcome?: string }).outcome === 'lost_no_charge',
    `T7 aluguel sem cobrança, assentado: 'expired' + o e-mail honesto continua saindo, 1 vez (${d.join(' → ')})`)
  novoMundo(['parked', 'parked'])
  await rodadas(atual, 3, T0 + 23 * H + 55 * MIN)
  ok(fechamento()?.outcome === 'expired' && nadaCobradoEnviado().length === 1 && mundo.posts.length === 1, 'T7b a fal continuava fora (503 parked, estorno confirmado pela rota): o vencido fecha e avisa sem esperar nada')
}

// ── T8: 4xx terminal ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log('T8 — 4xx só é terminal com a cobrança lida ausente/estornada')
{
  novoMundo(['bad-request-charged', 'ok'])
  const d = await rodadas(atual, 4, T0 + 5 * MIN)
  ok(d[0] === 'resume:retry_later' && fechamento()?.outcome === 'resumed' && fechamento()?.resume_generation_id === r1 && mundo.emails.length === 0 && mundo.posts.length === 1,
    `T8 4xx depois do débito: nada de 'failed' nem "nothing was charged" (${d[0]}); a rodada seguinte adota a tentativa 1`)
  novoMundo(['bad-request-charged', 'ok'])
  await rodadas(quatroCentosCego, 4, T0 + 5 * MIN)
  ok(fechamento()?.outcome === 'failed' && nadaCobradoEnviado().length === 1 && vivos().length === 1, 'T8m mutante (4xx sem ler a cobrança): fecha failed e manda "Nothing was charged" com o débito vivo')
  novoMundo(['bad-request'])
  await rodadas(atual, 3, T0 + 5 * MIN)
  ok(fechamento()?.outcome === 'failed' && nadaCobradoEnviado().length === 1 && mundo.posts.length === 1, 'T8b 4xx sem débito: fecha failed + o e-mail honesto, 1 POST')
}

// ── T9: 'started' estornado ──────────────────────────────────────────────────────────────────────────────────────────
console.log("T9 — 'started' cujo fechamento falhou: lido, não adotado às cegas")
for (const [nome, GET] of [['atual', atual], ['started_cego', startedCego], ['base', base]] as const) {
  novoMundo(['ok', 'ok'])
  mundo.failInsertIds.add(idDoFechamento(GEN))
  await rodadas(GET, 1, T0 + 5 * MIN)
  const semFechar = fechamentos().length === 0 && (alugueis()[0].metadata as { outcome?: string }).outcome === 'started'
  mundo.failInsertIds.clear()
  estornar(r1) // o filme da tentativa 1 falhou na montagem e a varredura devolveu o crédito
  await rodadas(GET, 4, T0 + 3 * H)
  const f = fechamento()
  if (nome === 'atual') ok(semFechar && mundo.posts.length === 2 && f?.outcome === 'resumed' && f.resume_generation_id === r2 && vivos().length === 1, "T9 'started' + fechamento perdido + filme estornado: a tentativa 2 sai e é o filme (1 débito vivo)")
  else ok(semFechar && mundo.posts.length === 1 && f?.resume_generation_id === r1 && vivos().length === 0, `T9 — ${nome === 'base' ? `BASE ${BASE}` : "mutante ('started' = vivo sem ler)"}: fecha 'resumed' com o filme estornado — o cliente fica sem filme`)
}
{
  novoMundo(['ok', 'ok'])
  mundo.failInsertIds.add(idDoFechamento(GEN))
  await rodadas(atual, 1, T0 + 5 * MIN)
  mundo.failInsertIds.clear()
  await rodadas(atual, 4, T0 + 3 * H)
  ok(mundo.posts.length === 1 && fechamento()?.resume_generation_id === r1 && vivos().length === 1, "T9b 'started' + fechamento perdido + débito vivo: adota a tentativa 1 (nenhuma tentativa 2)")
}

// ── T10: filme grátis de promoção (claim sem débito) ─────────────────────────────────────────────────────────────────
console.log('T10 — sem débito, o claim decide')
{
  novoMundo(['promo-abort', 'promo-abort'])
  await rodadas(atual, 6, T0 + 5 * MIN)
  ok(mundo.posts.length === 1 && fechamento()?.resume_generation_id === r1, 'T10 claim pending de custo 0 (promoção, não debita) da tentativa 1: adotado — 1 filme')
  novoMundo(['promo-abort', 'promo-abort'])
  await rodadas(semClaim, 6, T0 + 5 * MIN)
  ok(mundo.posts.length >= 2, `T10m mutante (só o débito, ignora o claim): a tentativa 2 sai por cima do filme grátis em voo — ${mundo.posts.length} filmes para um clique`)
}

// ── P: a regra pura ──────────────────────────────────────────────────────────────────────────────────────────────────
console.log('P — regras puras de lib/filaQuedaFal')
{
  const E = (debito: [boolean, boolean, boolean], claim: [boolean, string | null, number | null]) => L.estadoDaCobranca({ debito: { erro: debito[0], existe: debito[1], estornado: debito[2] }, claim: { erro: claim[0], status: claim[1], creditCost: claim[2] } })
  ok(E([true, false, false], [false, null, null]) === 'unknown' && E([false, false, false], [true, null, null]) === 'unknown' && E([false, true, false], [false, 'released', 25]) === 'live' && E([false, true, true], [false, 'done', 25]) === 'refunded'
    && E([false, false, false], [false, 'done', 25]) === 'live' && E([false, false, false], [false, 'pending', 0]) === 'live' && E([false, false, false], [false, 'pending', 25]) === 'none' && E([false, false, false], [false, 'released', 0]) === 'none' && E([false, false, false], [false, null, null]) === 'none',
    'P1 estadoDaCobranca: leitura que falha = unknown; débito manda; sem débito, claim done/settled ou promoção pending = live; o resto = none')
  ok(['provider_down', 'lost_no_charge'].every((o) => !L.aluguelPodeTerCobrado(o)) && [undefined, 'started', 'retry_later', 'failed', 'qualquer'].every((o) => L.aluguelPodeTerCobrado(o)), 'P2 só o desfecho que PROVA estorno (503 parked, já lido) dispensa a leitura; retry_later/started/sem desfecho são lidos')
  ok(L.desfechoComCobranca('failed', 'live') === 'retry_later' && L.desfechoComCobranca('failed', 'unknown') === 'retry_later' && L.desfechoComCobranca('failed', 'none') === 'failed' && L.desfechoComCobranca('failed', 'refunded') === 'failed' && L.desfechoComCobranca('started', null) === 'started' && L.desfechoComCobranca('retry_later', null) === 'retry_later', 'P3 desfechoComCobranca: 4xx com cobrança viva/ilegível vira retry_later')
  const D = L.decidirAluguelSemFechamento
  const t = T0
  ok(D([{ attempt: 1, iniciado: false, debito: 'none', atMs: t - 5 * MIN }], t).acao === 'esperar' && D([{ attempt: 1, iniciado: false, debito: 'none', atMs: t - 10 * MIN }], t).acao === 'retomar' && D([{ attempt: 1, iniciado: false, debito: 'none', atMs: Number.NaN }], t).acao === 'esperar'
    && JSON.stringify(D([{ attempt: 1, iniciado: false, debito: 'live', atMs: t }, { attempt: 2, iniciado: false, debito: 'live', atMs: t }], t)) === '{"acao":"adotar","attempt":2}' && D([{ attempt: 1, iniciado: true, debito: 'refunded', atMs: t }], t).acao === 'retomar' && D([{ attempt: 1, iniciado: true, debito: 'unknown', atMs: t - H }], t).acao === 'esperar',
    'P4 decidirAluguelSemFechamento: ausente < 10 min (ou hora ilegível) espera; vivo adota (o mais novo); started estornado retoma; started ilegível espera')
  ok(L.podeDizerNadaCobrado([{ debito: 'none' }, { debito: 'refunded' }]) && !L.podeDizerNadaCobrado([{ debito: 'none' }, { debito: 'live' }]) && !L.podeDizerNadaCobrado([{ debito: 'unknown' }]), 'P5 podeDizerNadaCobrado: só com tudo lido ausente/estornado')
}

// ── F: o texto da rota ───────────────────────────────────────────────────────────────────────────────────────────────
console.log('F — a rota do cron')
{
  const r = rotaAtual
  const iLe = r.indexOf('const d = decidirAluguelSemFechamento(lidos, now)')
  const iVencido = r.indexOf("if (decision === 'expired' || decision === 'superseded' || !pedido) {")
  const iEmailVencido = r.indexOf("decision === 'expired' && pedido) email = await enviarEmail(admin, userId, 'expired'")
  const iNovo = r.indexOf('const leaseId = idDoAluguel(genId, attempt)')
  const iDesfecho = r.indexOf("const outcome = desfechoComCobranca(resposta, resposta === 'failed' ? await cobrancaDaRetomada(admin, userId, resumeGenId) : null)")
  const iEmailFalho = r.indexOf("if (f === 'novo') email = await enviarEmail(admin, userId, 'failed'")
  ok(iLe > 0 && iVencido > iLe && iEmailVencido > iVencido && iNovo > iVencido, 'F1 a cobrança dos aluguéis é lida ANTES do fechamento vencido/substituído e antes de qualquer aluguel novo')
  ok(iDesfecho > iNovo && iEmailFalho > iDesfecho, 'F2 o 4xx passa pela cobrança antes do fechamento failed e do e-mail')
  ok(r.includes('!aluguelPodeTerCobrado(md.outcome)') && r.includes("debito: await cobrancaDaRetomada(admin, userId, resumeId)") && !r.includes("c.iniciado ? 'live'") && r.includes(".eq('id', claimId).eq('user_id', userId).eq('name', CINEMATIC_CLAIM_EVENT).maybeSingle()"), "F3 retry_later e started são lidos; o claim do mesmo id entra na leitura")
  ok(!r.includes("from '@/app/api/generate-video-cinematic/route'") && !/generate-video-cinematic\/route['"]/.test(r), 'F4 o cron continua chamando a rota de filme por HTTP (nunca a importa)')
  ok(!fs.readdirSync('lib').some((f) => f.startsWith('__mutante_rscd_')) && !fs.readdirSync('app/api/cron/resume-parked-renders').some((f) => f.startsWith('__mutante_rscd_')), 'F5 nenhuma cópia mutada ficou no disco')
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} ok · ${fail} falhas`)
if (fail > 0) process.exit(1)
process.exit(0)
