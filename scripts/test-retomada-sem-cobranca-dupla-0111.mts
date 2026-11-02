// KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — guardião do cron resume-parked-renders: nenhuma tentativa N+1 (e nenhum e-mail "Nothing was
// charged") sem LER a cobrança da tentativa N — e nenhum filme perdido por "adotar" uma tentativa que não vai a lugar nenhum.
//
// O DEFEITO 1 (revisão de 01/11, ALTO, já em produção no 124824492): a retomada classificada 'retry_later' — abort do cron em 240 s com
// a rota de filme viva até 300 s; 503 pending:true "Your AI scenes may already be processing"; 503 "automatic refund is still being
// confirmed" — gravava outcome:'retry_later' e, na rodada seguinte, a tentativa N+1 saía com idDaRetomada(gen, N+1) sem ler o débito da
// N: outro claim, outro débito, dois filmes. E o fechamento 'expired' (24 h) vinha ANTES de qualquer leitura: e-mail "Nothing was
// charged" com o débito vivo.
// O DEFEITO 2 (revisão 5 de 01/11, ALTO, no e1edb2c36): o conserto adotava QUALQUER débito vivo, sem assentamento. Débito vivo com claim
// 'pending' é o que a rota deixa quando falha sem filme (503 de estorno pendente, 503 pending ambíguo); 'done' sem 'settled' é o 503
// "safe while we finalize". Ninguém move esses claims depois (finish-stranded-renders só pega 'settled'; a varredura nunca toca 'done'):
// o parked fechava 'resumed', o cliente ficava sem filme (e, no 'done', cobrado para sempre) — e sem nenhum alerta.
// O DEFEITO 3 (revisão 6 de 01/11, ALTO, no 583bb7387): a revisão 5 RECONECTAVA (re-POST do mesmo id). Em pedido de ideia solta o roteiro é
// reescrito pelo GPT a temperature 0.7 a cada POST, a impressão digital do claim muda e a rota responde 409 "generation id belongs to a
// different cinematic request" antes de qualquer ramo útil: re-POST inútil que roda o escritor de novo; e, em verbatim, o 'pending' de
// até 2 h re-POSTado a cada passada gastava o teto da passada e travava filmes novos. Agora, regra única: 'settled' não estornado = adota;
// qualquer outro claim com débito VIVO = só ESPERA (nunca N+1, nunca re-POST) até as varreduras que já existem estornarem; no teto (29 h)
// fecha 'expired_unverified' sem e-mail ao cliente e grava o alerta do fundador (founder_alert_parked_unverified).
// O DEFEITO 4 (revisão 7 de 01/11, no fab79145c): (ALTO) o alerta do teto era só um evento que NADA lê — o cliente com claim 'done' (ou
// 'pending' fora dos ±60 s da varredura) ficava cobrado sem filme e ninguém sabia; agora o teto chama notifyFounder (e-mail do fundador +
// webhook). (MENOR) o fechamento 'failed' que falhava reabria a tentativa N+1 depois de um 4xx terminal; os estacionados eram lidos com
// .limit(100) (os já fechados contavam: o mais novo só aparecia vencido, com "never started" sem nenhuma tentativa); o e-mail dizia que o
// crédito voltou "the moment it was saved" mesmo quando uma tentativa intermediária cobrou e a varredura estornou horas depois.
//
// COMO PROVA: roda a ROTA REAL do cron (app/api/cron/resume-parked-renders/route.ts, GET) contra um PostgREST falso servido pelo `fetch`
// global (o mesmo supabase-js de produção fala HTTP com ele), uma rota de filme falsa QUE GUARDA O CLAIM (pending/done/settled/released)
// e responde a um re-POST do mesmo id como a rota real (verbatim: replay/espera; ideia solta: 409 conflict de impressão digital), a
// varredura de estorno (refund-sweep) no caso que ela alcança, e um Resend falso. Relógio controlado. Cada caso roda na rota ATUAL e numa
// CÓPIA QUEBRADA — a base 124824492 (produção), o e1edb2c36 (revisão 4), o 583bb7387 (revisão 5) ou um mutante de uma linha.
//   T1  abort em 240 s; a rota seguiu e liquidou (settled + débito) → adota (1 POST, 1 débito); base: 2 débitos.
//   T2  503 pending:true "may already be processing" (claim pending + débito vivo) e o estorno nunca vem → espera, ZERO re-POST, nenhuma
//       tentativa 2; às 29 h 'expired_unverified' + alerta do fundador, sem e-mail; base: 2 débitos; e1edb2c36: fecha 'resumed' calado;
//       583bb7387 (ideia solta): re-POSTa o id 1 e bate no 409 de impressão digital, e não grava alerta.
//   T3  503 "refund is still being confirmed" (idem); T3b o estorno chega em 3 min → a tentativa 2 sai depois do assentamento;
//       T3c a varredura de estorno (100 min) devolve o débito → a tentativa 2 sai; T3m mutante "cobrança viva = sem cobrança": 2 débitos.
//   T4  a rota cobra DEPOIS da rodada seguinte → espera o assentamento de 10 min; mutante sem a espera: 2 débitos.
//   T5  débito ilegível por 30 h → nenhuma tentativa 2, nenhum e-mail; às 29 h fecha 'expired_unverified' + alerta; e1edb2c36: nunca fecha.
//   T6  24 h com um aluguel liquidado → fecha 'resumed', SEM e-mail; base: 'expired' + "Nothing was charged". T6b a cobrança chega
//       depois da virada → espera. T6c 503 de estorno pendente às 23 h 55 → o e-mail só sai depois de a varredura estornar.
//   T7  24 h com o aluguel lido sem cobrança (assentado) → 'expired' + o e-mail honesto continua saindo.
//   T8  4xx com o débito vivo → nada de 'failed' nem e-mail; espera a varredura e a tentativa 2 é o filme; 4xx sem claim → 'failed'
//       + e-mail; 402 com claim 'done' sem débito → 'failed' + e-mail (nada cobrado, de verdade).
//   T9  'started' cujo fechamento falhou e cujo filme foi estornado → retoma; T9c 'started' de promoção liberado → retoma.
//   T10 filme grátis de promoção (claim pending de custo 0, sem débito) → não adota; assentado, a tentativa 2 é o filme (sem re-POST).
//   T11 claim 'done' com débito (503 "safe while we finalize") → espera, zero re-POST; nenhuma varredura toca 'done' (lacuna conhecida):
//       às 29 h 'expired_unverified' + alerta do fundador; e1edb2c36: 'resumed' calado; base: 2 débitos.
//   T12 1.200 aluguéis de outros estacionados: o aluguel que cobrou continua sendo lido (páginas); e1edb2c36 (limit 1000): travado.
//   T13 dois filmes com claim 'pending' e um terceiro estacionado depois: o terceiro sai na hora; 583bb7387 (verbatim): as reconexões
//       gastam o teto da passada e o terceiro fica parado.
//   T14 4xx terminal cujo fechamento 'failed' falhou → refaz o fechamento + e-mail, nenhuma tentativa 2; fab79145c: re-POSTa a N+1.
//   T15 120 estacionados já fechados na janela + um novo → o novo sai na hora; fab79145c (.limit(100)): invisível, nenhum POST.
//   P   regras puras · F o texto da rota.
// Rodar: npx tsx scripts/test-retomada-sem-cobranca-dupla-0111.mts
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.fake'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-fake'
process.env.CRON_SECRET = 'cron-secret-fake'
process.env.RESEND_API_KEY = 're_fake'
process.env.NEXT_PUBLIC_APP_URL = 'http://app.fake'

const { NextRequest } = await import('next/server')
const { cinematicClaimId } = await import('../lib/cinematic/claim')
const { idDaRetomada, idDoFechamento, idDoAluguel } = await import('../lib/filaQuedaFalIds')
const L = await import('../lib/filaQuedaFal')

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const BASE = '124824492'
const ANTERIOR = 'e1edb2c36'
const REV5 = '583bb7387'
const REV6 = 'fab79145c'
const FUNDADOR = 'josephsskaf@gmail.com'
const ROTA = 'app/api/cron/resume-parked-renders/route.ts'
const LIB = 'lib/filaQuedaFal.ts'
const USER = '11111111-2222-4333-8444-555555555555'
const GEN = '7d3f0c2a-9b1e-4c55-8a10-000000000001'
const MIN = 60_000
const H = 60 * MIN
const T0 = Date.UTC(2026, 10, 2, 12, 0)
const HOLD_MS = 2 * H // ACTIVE_COMPOSE_CREDIT_HOLD_TTL_MS: o claim 'pending' que a rota estorna e libera no re-POST
const REFUND_PENDENTE = 'No AI scenes started and your automatic refund is still being confirmed. Please retry this same generation.'
const PROCESSANDO = 'Your AI scenes may already be processing. Reconnecting to the same protected submission.'
const FINALIZANDO = 'Your AI scenes are safe while we finalize the submission.'

// ── relógio ──────────────────────────────────────────────────────────────────────────────────────────────────────────
let clock = T0
Date.now = () => clock
const iso = (ms: number) => new Date(ms).toISOString()

// ── o mundo: banco, rota de filme e Resend falsos atrás do fetch global ────────────────────────────────────────────────
type Row = Record<string, unknown>
type Comportamento = 'ok' | 'abort-charged' | 'abort-late-charge' | 'abort-no-charge' | 'pending-processing' | 'refund-pending' | 'refund-pending-confirma'
  | 'finalizando' | 'parked' | 'bad-request-charged' | 'bad-request' | 'insuficiente' | 'promo-abort' | 'promo-ok'
class Mundo {
  tables: Record<string, Row[]> = { events: [], credit_debits: [], profiles: [{ id: USER, email: 'cliente@exemplo.com', email_opted_out: false }] }
  failSelect = new Set<string>()
  failInsertIds = new Set<string>()
  emails: { subject: string; text: string; at: number }[] = [] // só os do CLIENTE
  fundador: { subject: string; text: string; at: number }[] = [] // os avisos ao fundador (notifyFounder)
  posts: { generationId: string; at: number; repost: boolean }[] = []
  agenda: { at: number; fn: () => void }[] = []
  comportamentos: Comportamento[] = []
  semSaldo = false
  ideia = false
  varredura = false
  maxVivos = 0
  seq = 0
}
let mundo = new Mundo()
const claimIdDe = (gen: string) => cinematicClaimId(USER, gen)
const renderIdDe = (gen: string) => `cinematic-${claimIdDe(gen)}`
const claimDe = (gen: string) => mundo.tables.events.find((e) => e.id === claimIdDe(gen) && e.name === 'cinematic_submission_claim')
const statusDe = (gen: string) => (claimDe(gen)?.metadata as { status?: string } | undefined)?.status ?? null
function setClaim(gen: string, status: string, cost = 25) {
  const c = claimDe(gen)
  if (c) { (c.metadata as Row).status = status; return }
  mundo.tables.events.push({ id: claimIdDe(gen), name: 'cinematic_submission_claim', user_id: USER, path: '/api/generate-video-cinematic', session_id: gen, created_at: iso(clock), metadata: { generation_id: gen, status, credit_cost: cost, started_at: iso(clock) } })
}
const debitoDe = (gen: string) => mundo.tables.credit_debits.find((d) => d.render_id === renderIdDe(gen))
const debitar = (gen: string, refunded = false) => { if (!debitoDe(gen)) mundo.tables.credit_debits.push({ render_id: renderIdDe(gen), user_id: USER, amount: 25, refunded_at: refunded ? iso(clock) : null, created_at: iso(clock) }) }
const estornar = (gen: string) => { const d = debitoDe(gen); if (d && !d.refunded_at) d.refunded_at = iso(clock) }
const vivos = () => mundo.tables.credit_debits.filter((d) => !d.refunded_at)
const evs = (name: string) => mundo.tables.events.filter((e) => e.name === name)
const fechamentos = () => evs(L.PARKED_CLOSED_EVENT)
const alugueis = () => evs(L.PARKED_LEASE_EVENT).filter((l) => l.session_id === GEN)
const nadaCobradoEnviado = () => mundo.emails.filter((e) => /Nothing was charged/.test(e.text))
const primeiros = () => mundo.posts.filter((p) => !p.repost)
const reposts = () => mundo.posts.filter((p) => p.repost)
/** O filme está a caminho: claim liquidado (o finish-stranded-renders monta) e débito não estornado (ou promoção de custo 0). */
const aCaminho = (gen: string) => statusDe(gen) === 'settled' && !debitoDe(gen)?.refunded_at
/** Cobrado sem filme: débito vivo cujo claim não está liquidado. */
const cobradoSemFilme = () => vivos().filter((d) => { const gen = String(claimDe2(String(d.render_id))?.session_id ?? ''); return statusDe(gen) !== 'settled' })
const claimDe2 = (renderId: string) => mundo.tables.events.find((e) => e.name === 'cinematic_submission_claim' && `cinematic-${e.id}` === renderId)

/** A rota de filme em modo serviço. Primeiro POST de um id = o comportamento da vez; re-POST do mesmo id = o acquire da rota real. */
function rotaDeFilme(gen: string): { abort?: true; status?: number; json?: unknown } {
  mundo.tables.events.push({ id: `disp-${++mundo.seq}`, name: 'generation_dispatch_received', user_id: USER, created_at: iso(clock), metadata: { generation_id: gen } })
  const existente = claimDe(gen)
  if (existente) {
    mundo.posts.push({ generationId: gen, at: clock, repost: true })
    // pedido de ideia solta: o escritor (GPT a 0.7) reescreve o roteiro → outra impressão digital → claim.ts:718 + route.ts:2996-2997
    if (mundo.ideia) return { status: 409, json: { error: 'generation id belongs to a different cinematic request' } }
    const md = existente.metadata as { status: string; credit_cost: number; started_at: string }
    if (md.status === 'pending') {
      if (clock - Date.parse(md.started_at) <= HOLD_MS) return { status: 409, json: { error: 'This AI generation is already being submitted.', pending: true, retry_after_ms: 2500 } }
      const tinha = !!debitoDe(gen)
      estornar(gen); md.status = 'released'
      return { status: 409, json: { error: tinha ? 'Your previous AI submission expired and 25 credits were refunded automatically. Please start a new generation.' : 'Your previous AI submission expired before charging. Please start a new generation.', start_new_generation: true } }
    }
    if (md.status === 'released') return { status: 409, json: { error: 'This AI generation was safely closed. Please start a new one.' } }
    if (md.status === 'done') {
      if (mundo.semSaldo && !debitoDe(gen)) return { status: 402, json: { error: 'Your AI scenes were reserved, but 25 credits could not be confirmed. Add credits and retry this same generation.', resume_same_generation: true } }
      if (md.credit_cost > 0) debitar(gen)
      md.status = 'settled'
      return { status: 200, json: { ok: true, generationId: gen } }
    }
    return { status: 200, json: { ok: true, generationId: gen } }
  }
  mundo.posts.push({ generationId: gen, at: clock, repost: false })
  const c = mundo.comportamentos[primeiros().length - 1] ?? 'ok'
  switch (c) {
    case 'ok': setClaim(gen, 'settled'); debitar(gen); return { status: 200, json: { ok: true, generationId: gen } }
    case 'abort-charged': setClaim(gen, 'settled'); debitar(gen); return { abort: true }
    case 'abort-late-charge': setClaim(gen, 'pending'); mundo.agenda.push({ at: clock + 5 * MIN + 20_000, fn: () => { debitar(gen); setClaim(gen, 'settled') } }); return { abort: true }
    case 'abort-no-charge': setClaim(gen, 'released'); return { abort: true }
    case 'pending-processing': setClaim(gen, 'pending'); debitar(gen); return { status: 503, json: { pending: true, retry_after_ms: 3000, error: PROCESSANDO } }
    case 'refund-pending': setClaim(gen, 'pending'); debitar(gen); return { status: 503, json: { error: REFUND_PENDENTE } }
    case 'refund-pending-confirma': setClaim(gen, 'pending'); debitar(gen); mundo.agenda.push({ at: clock + 3 * MIN, fn: () => estornar(gen) }); return { status: 503, json: { error: REFUND_PENDENTE } }
    case 'finalizando': setClaim(gen, 'done'); debitar(gen); return { status: 503, json: { pending: true, retry_after_ms: 2500, error: FINALIZANDO } }
    case 'parked':
      setClaim(gen, 'released'); debitar(gen, true)
      mundo.tables.events.push({ id: `child-${++mundo.seq}`, name: L.PARKED_EVENT, user_id: USER, session_id: gen, created_at: iso(clock), metadata: { reason: 'capacity', refunded: true, request: { prompt: 'x', duration: 60 } } })
      return { status: 503, json: { queued: true, parked: true, error: L.PARKED_MESSAGE } }
    case 'bad-request-charged': setClaim(gen, 'pending'); debitar(gen); return { status: 400, json: { error: 'Invalid request.' } }
    case 'bad-request': return { status: 400, json: { error: 'Invalid request.' } }
    case 'insuficiente': setClaim(gen, 'done'); mundo.semSaldo = true; return { status: 402, json: { error: 'Your AI scenes were reserved, but 25 credits could not be confirmed. Add credits and retry this same generation.', resume_same_generation: true } }
    case 'promo-abort': setClaim(gen, 'pending', 0); return { abort: true }
    case 'promo-ok': setClaim(gen, 'settled', 0); return { status: 200, json: { ok: true, generationId: gen } }
  }
}
/** A varredura sweepAbandonedCinematicDebits, no caso que alcança o 'pending': débito > 100 min, claim pending nascido a ≤ 60 s. */
function varrer() {
  for (const d of vivos()) {
    const c = claimDe2(String(d.render_id))
    if (c && (c.metadata as { status?: string }).status === 'pending' && clock - Date.parse(String(d.created_at)) > 100 * MIN && Math.abs(Date.parse(String(c.created_at)) - Date.parse(String(d.created_at))) <= 60_000) d.refunded_at = iso(clock)
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
    if (order) {
      const chaves = order.split(',').map((o) => { const [col, dir] = o.split('.'); return { col, dir } })
      out = [...out].sort((a, b) => { for (const { col, dir } of chaves) { const x = String(a[col]), y = String(b[col]); if (x !== y) return (x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1) } return 0 })
    }
    const off = Number(url.searchParams.get('offset') ?? 0)
    const lim = url.searchParams.get('limit')
    out = out.slice(off, lim ? off + Number(lim) : undefined)
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
    const r = rotaDeFilme(String(JSON.parse(String(init?.body)).generationId))
    if (r.abort) throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    return json(r.json, r.status)
  }
  if (url.href === 'https://api.resend.com/emails') { const b = JSON.parse(String(init?.body)); ((b.to ?? []) as string[]).includes(FUNDADOR) ? mundo.fundador.push({ subject: b.subject, text: b.text, at: clock }) : mundo.emails.push({ subject: b.subject, text: b.text, at: clock }); return json({ id: 'em_' + mundo.emails.length }) }
  throw new Error('fetch inesperado: ' + url.href)
}) as typeof fetch

// ── as rotas: a ATUAL, a da BASE (produção), a da revisão 4 e os mutantes ──────────────────────────────────────────────
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
let base: Get, anterior: Get, rev5: Get, rev6: Get, semEspera: Get, filtroVelho: Get, quatroCentosCego: Get, settledCego: Get, adotaVivo: Get, reabreVivo: Get
try {
  base = await rotaDe('base', git(['show', `${BASE}:${ROTA}`]), git(['show', `${BASE}:${LIB}`]))
  anterior = await rotaDe('anterior', git(['show', `${ANTERIOR}:${ROTA}`]), git(['show', `${ANTERIOR}:${LIB}`]))
  rev5 = await rotaDe('rev5', git(['show', `${REV5}:${ROTA}`]), git(['show', `${REV5}:${LIB}`]))
  rev6 = await rotaDe('rev6', git(['show', `${REV6}:${ROTA}`]), git(['show', `${REV6}:${LIB}`]))
  semEspera = await rotaDe('sem_espera', rotaAtual, troca(libAtual, 'export const PARKED_DEBIT_SETTLE_MS = PARKED_LEASE_TTL_MS', 'export const PARKED_DEBIT_SETTLE_MS = 0', 'sem_espera'))
  filtroVelho = await rotaDe('filtro_velho', troca(rotaAtual, '!aluguelPodeTerCobrado(md.outcome)', "(md.outcome !== undefined && md.outcome !== 'started')", 'filtro_velho'), null)
  quatroCentosCego = await rotaDe('4xx_cego', rotaAtual, troca(libAtual, "  if (outcome !== 'failed') return outcome\n", '  return outcome\n', '4xx_cego'))
  settledCego = await rotaDe('settled_cego', rotaAtual, troca(libAtual, "if (l.claim === 'settled' && l.debito !== 'estornado') return 'filme'", "if (l.claim === 'settled') return 'filme'", 'settled_cego'))
  adotaVivo = await rotaDe('adota_vivo', rotaAtual, troca(libAtual, "  if (l.erro) return 'ilegivel'\n", "  if (l.erro) return 'ilegivel'\n  if (l.debito === 'vivo') return 'filme'\n", 'adota_vivo'))
  reabreVivo = await rotaDe('reabre_vivo', rotaAtual, troca(libAtual, "return l.debito === 'vivo' ? 'cobranca_viva' : 'sem_cobranca'", "return 'sem_cobranca'", 'reabre_vivo'))
} finally {
  for (const f of temporarios) { try { fs.unlinkSync(f) } catch { /* já foi */ } }
}

// ── o cenário: estaciona em T0, roda o cron a cada `intervalo` ────────────────────────────────────────────────────────
const req = () => new NextRequest('http://app.fake/api/cron/resume-parked-renders?confirm=SEND', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
type Res = { results?: { generation: string; decision: string; outcome?: string; email?: string }[] }
async function passe(GET: Get): Promise<Res> {
  for (const a of [...mundo.agenda].sort((x, y) => x.at - y.at)) if (a.at <= clock) { a.fn(); mundo.agenda.splice(mundo.agenda.indexOf(a), 1) }
  if (mundo.varredura) varrer()
  const log = console.log, err = console.error, warn = console.warn
  console.log = () => {}; console.error = () => {}; console.warn = () => {}
  try { const r = await GET(req()); return await r.json() as Res } finally { console.log = log; console.error = err; console.warn = warn; mundo.maxVivos = Math.max(mundo.maxVivos, vivos().length) }
}
function novoMundo(comportamentos: Comportamento[], parkedAt = T0) {
  mundo = new Mundo()
  mundo.comportamentos = comportamentos
  mundo.tables.events.push({ id: 'parked-row-1', name: L.PARKED_EVENT, user_id: USER, session_id: GEN, created_at: iso(parkedAt), metadata: { version: L.PARKED_VERSION, reason: 'balance_quota', refunded: true, request: { prompt: 'The lighthouse keeper who vanished in 1900', duration: 60, engine: 'seedance' }, country: 'US' } })
}
/** `n` rodadas, uma a cada `intervalo`, a partir de `inicio`. Devolve as decisões de cada rodada (só as do GEN). */
async function rodadas(GET: Get, n: number, inicio: number, intervalo = 5 * MIN, antes?: (i: number) => void): Promise<string[]> {
  const out: string[] = []
  clock = inicio
  for (let i = 0; i < n; i++) {
    antes?.(i)
    const r = await passe(GET)
    out.push((r.results ?? []).filter((x) => x.generation === GEN.slice(0, 8)).map((x) => `${x.decision}${x.outcome ? ':' + x.outcome : ''}`).join(','))
    clock += intervalo
  }
  return out
}
const fechamento = () => fechamentos().find((f) => f.session_id === GEN)?.metadata as { outcome?: string; resume_generation_id?: string; recovered?: boolean; reconnected?: boolean } | undefined
const r1 = idDaRetomada(GEN, 1)
const r2 = idDaRetomada(GEN, 2)
const alertas = () => evs(L.FOUNDER_PARKED_ALERT_EVENT).filter((e) => e.session_id === GEN)
/** Fechou no teto: 'expired_unverified', 1 alerta do fundador com o id da tentativa, nenhum e-mail ao cliente. */
const fechouNoTeto = (rid: string) => fechamento()?.outcome === 'expired_unverified' && alertas().length === 1 && ((alertas()[0].metadata as { resume_generation_ids?: string[] }).resume_generation_ids ?? []).includes(rid) && mundo.emails.length === 0
  && mundo.fundador.length === 1 && mundo.fundador[0].text.includes(rid) && mundo.fundador[0].text.includes('NÃO recebeu e-mail') && (alertas()[0].metadata as { founder_notified?: boolean }).founder_notified === true
/** O filme saiu UMA vez: fechado 'resumed' com `rid`, claim dele liquidado, nenhum débito vivo sem filme, nunca 2 débitos vivos juntos. */
const umFilme = (rid: string, debitos = 1) => fechamento()?.outcome === 'resumed' && fechamento()?.resume_generation_id === rid && aCaminho(rid) && vivos().length === debitos && cobradoSemFilme().length === 0 && mundo.maxVivos <= 1 && nadaCobradoEnviado().length === 0

// ── T1: a rota seguiu e liquidou ─────────────────────────────────────────────────────────────────────────────────────
console.log('T1 — abort do cron; a rota seguiu e liquidou: adota, nunca a tentativa N+1')
{
  novoMundo(['abort-charged', 'ok'])
  const d = await rodadas(atual, 12, T0 + 5 * MIN)
  ok(umFilme(r1) && primeiros().length === 1 && alugueis().length === 1 && fechamento()?.recovered === true, `T1 1 POST, 1 débito, fechado 'resumed' com o id da tentativa 1 (rodada 2 = ${d[1]})`)
  novoMundo(['abort-charged', 'ok'])
  await rodadas(base, 12, T0 + 5 * MIN)
  ok(primeiros().length >= 2 && vivos().length >= 2, `T1 — BASE ${BASE} (produção): ${primeiros().length} POSTs e ${vivos().length} débitos vivos para UM clique (o defeito, reproduzido)`)
  novoMundo(['abort-charged', 'ok'])
  await rodadas(filtroVelho, 6, T0 + 5 * MIN)
  ok(vivos().length === 2 && primeiros().length === 2, "T1m mutante (o filtro de antes: só lê aluguel sem desfecho ou 'started'): o retry_later abre a tentativa 2 — 2 débitos")
}

// ── T2/T3: a rota falhou sem filme e deixou o débito vivo com o claim 'pending' ───────────────────────────────────────
console.log('T2/T3 — claim pending + débito vivo: só espera (zero re-POST, nenhuma tentativa 2); no teto, alerta do fundador')
for (const [rot, c] of [['T2 503 pending:true "may already be processing"', 'pending-processing'], ['T3 503 "refund is still being confirmed" e o estorno não vem', 'refund-pending']] as const) {
  novoMundo([c, 'ok'])
  const d = await rodadas(atual, 30 * 12, T0 + 5 * MIN)
  const iFecha = d.findIndex((x) => x.startsWith('expired_unverified'))
  const fechouEm = T0 + 5 * MIN + iFecha * 5 * MIN
  ok(fechouNoTeto(r1) && reposts().length === 0 && primeiros().length === 1 && mundo.maxVivos === 1 && d[2] === 'lease_charge_live' && d.slice(2, iFecha).every((x) => x === 'lease_charge_live') && fechouEm - T0 >= L.PARKED_HARD_STOP_MS && fechouEm - T0 < L.PARKED_HARD_STOP_MS + 5 * MIN,
    `${rot}: espera (${d[2]}) sem re-POSTar e sem tentativa 2; às ${Math.round((fechouEm - T0) / H)} h fecha 'expired_unverified' + 1 alerta do fundador, nenhum e-mail`)
  novoMundo([c, 'ok'])
  await rodadas(base, 36, T0 + 5 * MIN)
  ok(mundo.maxVivos >= 2, `${rot} — BASE ${BASE}: ${mundo.maxVivos} débitos vivos ao mesmo tempo para UM clique`)
  novoMundo([c, 'ok'])
  await rodadas(anterior, 36, T0 + 5 * MIN)
  ok(fechamento()?.outcome === 'resumed' && fechamento()?.resume_generation_id === r1 && !aCaminho(r1) && primeiros().length === 1 && cobradoSemFilme().length === 1 && alertas().length === 0,
    `${rot} — ${ANTERIOR} (revisão 4): adota o débito vivo e fecha 'resumed' com o claim 'pending' — cobrado, sem filme e sem alerta a ninguém`)
  novoMundo([c, 'ok'])
  mundo.ideia = true
  await rodadas(rev5, 30 * 12, T0 + 5 * MIN)
  ok(reposts().length >= 1 && reposts().every((p) => p.generationId === r1) && alertas().length === 0 && fechamento()?.outcome === 'expired_unverified',
    `${rot} — ${REV5} (revisão 5), pedido de ideia solta: ${reposts().length} re-POST(s) do id 1 batem no 409 de impressão digital (cada um roda o escritor de novo) e o teto fecha sem alerta gravado`)
}
{
  novoMundo(['pending-processing', 'ok'])
  await rodadas(adotaVivo, 36, T0 + 5 * MIN)
  ok(fechamento()?.resume_generation_id === r1 && !aCaminho(r1) && primeiros().length === 1, "T2m mutante ('débito vivo = filme', a regra da revisão 4): o filme se perde")
}
{
  novoMundo(['pending-processing', 'ok'])
  await rodadas(reabreVivo, 6, T0 + 5 * MIN)
  ok(primeiros().length === 2 && mundo.maxVivos === 2, "T3m mutante ('cobrança viva = sem cobrança'): a tentativa 2 sai com o débito da 1 vivo — 2 débitos")
}
{
  novoMundo(['refund-pending-confirma', 'ok'])
  const d = await rodadas(atual, 8, T0 + 5 * MIN)
  ok(umFilme(r2) && primeiros().length === 2 && primeiros()[1].at - primeiros()[0].at >= L.PARKED_DEBIT_SETTLE_MS && vivos()[0].render_id === renderIdDe(r2),
    `T3b o estorno da tentativa 1 chega em 3 min: depois do assentamento a tentativa 2 sai e é o filme — 1 débito vivo (${d.slice(0, 3).join(' → ')})`)
}
{
  novoMundo(['pending-processing', 'ok'])
  mundo.varredura = true
  await rodadas(atual, 36, T0 + 5 * MIN)
  const r2em = primeiros()[1]?.at ?? 0
  ok(umFilme(r2) && reposts().length === 0 && r2em - (T0 + 5 * MIN) > 100 * MIN && r2em - (T0 + 5 * MIN) < HOLD_MS, `T3c a varredura de estorno (100 min) devolve o débito do claim parado: a tentativa 2 sai logo depois, sem re-POST, 1 débito vivo`)
}

// ── T4: a rota cobra depois da rodada seguinte ───────────────────────────────────────────────────────────────────────
console.log('T4 — "sem débito" logo depois do aluguel ainda não prova nada')
{
  novoMundo(['abort-late-charge', 'ok'])
  const d = await rodadas(atual, 6, T0 + 5 * MIN)
  ok(d[1] === 'lease_debit_settling' && umFilme(r1) && primeiros().length === 1,
    `T4 a cobrança chega aos 5 min 20 s do aluguel: a rodada dos 5 min espera (${d[1]}), a seguinte adota — 1 POST, 1 débito`)
  ok(L.PARKED_DEBIT_SETTLE_MS >= L.PARKED_ROUTE_MAX_MS && L.PARKED_ROUTE_MAX_MS === 300_000 && /export const maxDuration = 300\n/.test(rd('app/api/generate-video-cinematic/route.ts')), 'T4b a espera (10 min) cobre o teto da rota de filme (maxDuration 300 s, lido na rota)')
  novoMundo(['abort-late-charge', 'ok'])
  await rodadas(semEspera, 6, T0 + 5 * MIN)
  ok(primeiros().length === 2 && vivos().length === 2, 'T4m mutante (sem a espera de assentamento): a tentativa 2 sai aos 5 min e a 1 cobra depois — 2 débitos')
}

// ── T5: débito ilegível ──────────────────────────────────────────────────────────────────────────────────────────────
console.log('T5 — banco instável: nada é decidido às cegas, e nada fica estacionado para sempre')
{
  novoMundo(['abort-charged', 'ok'])
  await rodadas(atual, 1, T0 + 5 * MIN)
  mundo.failSelect.add('credit_debits')
  const d = await rodadas(atual, 30 * 12, T0 + 10 * MIN)
  const iFecha = d.findIndex((x) => x.startsWith('expired_unverified'))
  const fechouEm = T0 + 10 * MIN + iFecha * 5 * MIN
  ok(primeiros().length === 1 && mundo.emails.length === 0 && iFecha > 0 && d.slice(0, iFecha).every((x) => x === 'lease_debit_unreadable') && fechouEm - T0 >= L.PARKED_HARD_STOP_MS && fechouEm - T0 < L.PARKED_HARD_STOP_MS + 5 * MIN && fechouNoTeto(r1),
    `T5 30 h com o débito ilegível: 1 POST, nenhum e-mail; espera até ${Math.round((fechouEm - T0) / H)} h e fecha 'expired_unverified' + alerta do fundador (sem "nothing was charged")`)
  novoMundo(['abort-charged', 'ok'])
  await rodadas(anterior, 1, T0 + 5 * MIN)
  mundo.failSelect.add('credit_debits')
  await rodadas(anterior, 30 * 12, T0 + 10 * MIN)
  ok(fechamentos().length === 0, `T5 — ${ANTERIOR}: 30 h depois o estacionado nunca fechou (sumiu da janela de 26 h sem fechamento nem e-mail)`)
  ok(L.PARKED_HARD_STOP_MS === L.PARKED_TTL_MS + 5 * H && /const SCAN_WINDOW_MS = PARKED_TTL_MS \+ 6 \* 60 \* 60 \* 1000/.test(rotaAtual) && /export const SERIE_AUTO_PARKED_LOST_MS = PARKED_TTL_MS \+ 6 \* 60 \* 60 \* 1000/.test(rd('lib/serieAuto/serieAuto.ts')),
    'T5b o limite (29 h) fica dentro da janela de leitura do cron (30 h) e antes de a série ler os aluguéis sozinha (30 h)')
  ok(rd('lib/serieAuto/cron.ts').includes("if (!retomada && est.closed && est.closed.outcome !== 'expired_unverified') { await fail("), "T5c a série NÃO lê 'expired_unverified' como \"nada cobrado\" (não abre a tentativa 2 por cima)")
}

// ── T6/T7: a virada das 24 h ─────────────────────────────────────────────────────────────────────────────────────────
console.log('T6 — 24 h: o vencido só fecha (e só diz "nothing was charged") depois de ler a cobrança')
{
  novoMundo(['abort-charged'])
  const d = await rodadas(atual, 3, T0 + 23 * H + 55 * MIN)
  ok(d[1].startsWith('resume_recovered') && umFilme(r1) && mundo.emails.length === 0 && primeiros().length === 1,
    `T6 aluguel às 23 h 55 que liquidou, rodada das 24 h: fecha 'resumed' com o id 'parked-…', sem e-mail (${d[1]})`)
  novoMundo(['abort-charged'])
  await rodadas(base, 3, T0 + 23 * H + 55 * MIN)
  ok(fechamento()?.outcome === 'expired' && nadaCobradoEnviado().length === 1 && vivos().length === 1, `T6 — BASE ${BASE}: fecha 'expired' e manda "Nothing was charged" com o débito VIVO (o e-mail falso, reproduzido)`)
  novoMundo(['abort-late-charge'])
  const d2 = await rodadas(atual, 4, T0 + 23 * H + 55 * MIN)
  ok(d2[1] === 'lease_debit_settling' && umFilme(r1) && mundo.emails.length === 0, `T6b a cobrança chega depois da virada das 24 h: espera (${d2[1]}) e adota — o e-mail falso nunca sai`)
  novoMundo(['abort-late-charge'])
  await rodadas(semEspera, 4, T0 + 23 * H + 55 * MIN)
  ok(fechamento()?.outcome === 'expired' && nadaCobradoEnviado().length === 1 && vivos().length === 1, 'T6m mutante (sem a espera): "Nothing was charged" sai e a cobrança chega 20 s depois')
  novoMundo(['refund-pending'])
  mundo.varredura = true
  await rodadas(atual, 30, T0 + 23 * H + 55 * MIN)
  const estornoEm = Date.parse(String(debitoDe(r1)?.refunded_at ?? ''))
  ok(fechamento()?.outcome === 'expired' && nadaCobradoEnviado().length === 1 && vivos().length === 0 && Number.isFinite(estornoEm) && nadaCobradoEnviado()[0].at >= estornoEm && estornoEm - (T0 + 23 * 60 * 60_000 + 55 * 60_000) > 100 * 60_000 && primeiros().length === 1 && reposts().length === 0,
    "T6c 503 de estorno pendente às 23 h 55: espera (sem re-POST) até a varredura estornar (~25 h 40); o \"Nothing was charged\" só sai DEPOIS do estorno, 1 vez")
  ok(!/moment it was saved|still there/.test(nadaCobradoEnviado()[0]?.text ?? 'x'), 'T6d o e-mail não diz QUANDO o crédito voltou (a varredura estornou ~1 h 45 depois da cobrança)')
  novoMundo(['refund-pending'])
  mundo.varredura = true
  await rodadas(rev6, 30, T0 + 23 * H + 55 * MIN)
  ok(/the moment it was saved/.test(nadaCobradoEnviado()[0]?.text ?? ''), `T6d — ${REV6}: o e-mail diz que o crédito voltou "the moment it was saved" — mas a tentativa cobrou e só foi estornada horas depois`)
}
{
  novoMundo(['abort-no-charge', 'abort-no-charge'])
  const d = await rodadas(atual, 4, T0 + 23 * H + 50 * MIN)
  ok(fechamento()?.outcome === 'expired' && nadaCobradoEnviado().length === 1 && vivos().length === 0 && (alugueis()[0].metadata as { outcome?: string }).outcome === 'lost_no_charge',
    `T7 aluguel sem cobrança, assentado: 'expired' + o e-mail honesto continua saindo, 1 vez (${d.join(' → ')})`)
  novoMundo(['parked', 'parked'])
  await rodadas(atual, 3, T0 + 23 * H + 55 * MIN)
  ok(fechamento()?.outcome === 'expired' && nadaCobradoEnviado().length === 1 && primeiros().length === 1, 'T7b a fal continuava fora (503 parked, estorno confirmado pela rota): o vencido fecha e avisa sem esperar nada')
}

// ── T8: 4xx terminal ─────────────────────────────────────────────────────────────────────────────────────────────────
console.log('T8 — 4xx só é terminal com a tentativa lida sem cobrança')
{
  novoMundo(['bad-request-charged', 'ok'])
  mundo.varredura = true
  const d = await rodadas(atual, 36, T0 + 5 * MIN)
  ok(d[0] === 'resume:retry_later' && umFilme(r2) && !fechamentos().some((f) => (f.metadata as { outcome?: string }).outcome === 'failed') && primeiros().length === 2 && reposts().length === 0,
    `T8 4xx com o débito vivo: nada de 'failed' nem "nothing was charged" (${d[0]}); espera a varredura estornar, a tentativa 2 é o filme (sem re-POST)`)
  novoMundo(['bad-request-charged', 'ok'])
  await rodadas(quatroCentosCego, 4, T0 + 5 * MIN)
  ok(fechamento()?.outcome === 'failed' && nadaCobradoEnviado().length === 1 && vivos().length === 1, 'T8m mutante (4xx sem ler a cobrança): fecha failed e manda "Nothing was charged" com o débito vivo')
  novoMundo(['bad-request'])
  await rodadas(atual, 3, T0 + 5 * MIN)
  ok(fechamento()?.outcome === 'failed' && nadaCobradoEnviado().length === 1 && primeiros().length === 1, 'T8b 4xx sem claim nem débito: fecha failed + o e-mail honesto, 1 POST')
  novoMundo(['insuficiente', 'ok'])
  await rodadas(atual, 4, T0 + 5 * MIN)
  ok(fechamento()?.outcome === 'failed' && nadaCobradoEnviado().length === 1 && vivos().length === 0 && mundo.posts.length === 1, "T8c 402 com o claim 'done' sem débito (saldo da conta mudou): fecha failed + e-mail — nada foi cobrado de verdade, e nenhum re-POST em laço")
}

// ── T9: 'started' cujo fechamento falhou ─────────────────────────────────────────────────────────────────────────────
console.log("T9 — 'started' cujo fechamento falhou: lido, não adotado às cegas")
for (const [nome, GET] of [['atual', atual], ['settled_cego', settledCego], ['base', base]] as const) {
  novoMundo(['ok', 'ok'])
  mundo.failInsertIds.add(idDoFechamento(GEN))
  await rodadas(GET, 1, T0 + 5 * MIN)
  const semFechar = fechamentos().length === 0 && (alugueis()[0].metadata as { outcome?: string }).outcome === 'started'
  mundo.failInsertIds.clear()
  estornar(r1) // o filme da tentativa 1 falhou na montagem e a varredura devolveu o crédito
  await rodadas(GET, 4, T0 + 3 * H)
  const f = fechamento()
  if (nome === 'atual') ok(semFechar && primeiros().length === 2 && f?.outcome === 'resumed' && f.resume_generation_id === r2 && vivos().length === 1, "T9 'started' + fechamento perdido + filme estornado: a tentativa 2 sai e é o filme (1 débito vivo)")
  else ok(semFechar && primeiros().length === 1 && f?.resume_generation_id === r1 && vivos().length === 0, `T9 — ${nome === 'base' ? `BASE ${BASE}` : "mutante ('settled' = filme sem olhar o estorno)"}: fecha 'resumed' com o filme estornado — o cliente fica sem filme`)
}
{
  novoMundo(['ok', 'ok'])
  mundo.failInsertIds.add(idDoFechamento(GEN))
  await rodadas(atual, 1, T0 + 5 * MIN)
  mundo.failInsertIds.clear()
  await rodadas(atual, 4, T0 + 3 * H)
  ok(primeiros().length === 1 && umFilme(r1), "T9b 'started' + fechamento perdido + débito vivo: adota a tentativa 1 (nenhuma tentativa 2)")
}
for (const [nome, GET] of [['atual', atual], ['anterior', anterior]] as const) {
  novoMundo(['promo-ok', 'promo-ok'])
  mundo.failInsertIds.add(idDoFechamento(GEN))
  await rodadas(GET, 1, T0 + 5 * MIN)
  mundo.failInsertIds.clear()
  setClaim(r1, 'released') // o filme grátis falhou e a rota de status liberou o claim (sem débito: era promoção)
  await rodadas(GET, 4, T0 + 3 * H)
  if (nome === 'atual') ok(primeiros().length === 2 && fechamento()?.resume_generation_id === r2 && aCaminho(r2), "T9c 'started' de promoção liberado (sem débito): retoma — a tentativa 2 é o filme, igual ao 'started' estornado")
  else ok(primeiros().length === 1 && fechamento()?.resume_generation_id === r1 && !aCaminho(r1), `T9c — ${ANTERIOR}: 'started' liberado sem débito lia 'none' e era adotado — o filme grátis se perdia`)
}

// ── T10: filme grátis de promoção (claim pending de custo 0) ─────────────────────────────────────────────────────────
console.log('T10 — promoção em voo: não adota; assentada e sem débito, a tentativa 2 é o filme')
{
  novoMundo(['promo-abort', 'promo-ok'])
  const d = await rodadas(atual, 36, T0 + 5 * MIN)
  ok(d[1] === 'lease_debit_settling' && primeiros().length === 2 && reposts().length === 0 && fechamento()?.resume_generation_id === r2 && aCaminho(r2) && primeiros()[1].at - primeiros()[0].at >= L.PARKED_DEBIT_SETTLE_MS && mundo.emails.length === 0,
    `T10 claim pending de custo 0 sem débito: espera o assentamento (${d[1]}); nada cobrado → a tentativa 2 é o filme, sem re-POST — 1 filme`)
  novoMundo(['promo-abort', 'promo-ok'])
  await rodadas(anterior, 36, T0 + 5 * MIN)
  ok(primeiros().length === 1 && fechamento()?.resume_generation_id === r1 && !aCaminho(r1), `T10 — ${ANTERIOR}: adotava o claim pending de custo 0 na hora — o filme grátis se perdia`)
}

// ── T11: claim 'done' (cenas na fal, falta liquidar) ─────────────────────────────────────────────────────────────────
console.log("T11 — claim 'done' com débito: só espera; nenhuma varredura toca 'done' — o teto avisa o fundador")
{
  novoMundo(['finalizando', 'ok'])
  const d = await rodadas(atual, 30 * 12, T0 + 5 * MIN)
  ok(fechouNoTeto(r1) && reposts().length === 0 && primeiros().length === 1 && mundo.maxVivos === 1 && d[2] === 'lease_charge_live' && statusDe(r1) === 'done' && cobradoSemFilme().length === 1,
    `T11 503 "safe while we finalize": espera (${d[2]}), zero re-POST, nenhuma tentativa 2; às 29 h 'expired_unverified' + alerta do fundador com o id 1 (lacuna conhecida: o débito do 'done' só sai à mão)`)
  novoMundo(['finalizando', 'ok'])
  await rodadas(rev6, 30 * 12, T0 + 5 * MIN)
  ok(fechamento()?.outcome === 'expired_unverified' && alertas().length === 1 && mundo.fundador.length === 0 && cobradoSemFilme().length === 1,
    `T11 — ${REV6} (revisão 6): fecha 'expired_unverified' e grava um evento que nada lê — cobrado, sem filme, e nenhum aviso chega ao fundador`)
  novoMundo(['finalizando', 'ok'])
  await rodadas(anterior, 36, T0 + 5 * MIN)
  ok(fechamento()?.outcome === 'resumed' && fechamento()?.resume_generation_id === r1 && statusDe(r1) === 'done' && cobradoSemFilme().length === 1 && alertas().length === 0, `T11 — ${ANTERIOR}: adota com o claim 'done' que nunca liquida — fecha 'resumed', cobrado e sem filme, sem alerta a ninguém`)
  novoMundo(['finalizando', 'ok'])
  await rodadas(base, 12, T0 + 5 * MIN)
  ok(vivos().length >= 2, `T11 — BASE ${BASE}: a tentativa 2 sai por cima — ${vivos().length} débitos vivos`)
  novoMundo(['finalizando', 'ok'])
  mundo.ideia = true
  await rodadas(rev5, 12, T0 + 5 * MIN)
  ok(reposts().length >= 1 && reposts().every((p) => p.generationId === r1) && statusDe(r1) === 'done' && fechamento() === undefined, `T11 — ${REV5} (revisão 5), pedido de ideia solta: re-POSTa o id 1, bate no 409 de impressão digital e o 'done' não liquida — a reconexão não servia`)
}

// ── T12: lista de aluguéis completa ──────────────────────────────────────────────────────────────────────────────────
console.log('T12 — numa queda longa, o aluguel que cobrou não cai fora da leitura')
for (const [nome, GET] of [['atual', atual], ['anterior', anterior]] as const) {
  novoMundo(['abort-charged', 'ok'])
  await rodadas(GET, 1, T0 + 5 * MIN)
  for (let k = 0; k < 12; k++) {
    const g = `8e4f1d3b-9b1e-4c55-8a10-0000000001${String(k).padStart(2, '0')}`
    mundo.tables.events.push({ id: `parked-x-${k}`, name: L.PARKED_EVENT, user_id: USER, session_id: g, created_at: iso(T0 + MIN), metadata: { request: { prompt: 'x', duration: 60 } } })
    mundo.tables.events.push({ id: idDoFechamento(g), name: L.PARKED_CLOSED_EVENT, user_id: USER, session_id: g, created_at: iso(T0 + 2 * MIN), metadata: { outcome: 'expired' } })
    for (let a = 1; a <= 100; a++) mundo.tables.events.push({ id: idDoAluguel(g, a), name: L.PARKED_LEASE_EVENT, user_id: USER, session_id: g, created_at: iso(T0 + 6 * MIN + a * 1000 + k), metadata: { attempt: a, outcome: 'provider_down' } })
  }
  const d = await rodadas(GET, 4, T0 + 20 * MIN)
  if (nome === 'atual') ok(umFilme(r1) && primeiros().length === 1, `T12 1.201 aluguéis (2 páginas): o da tentativa 1, o mais velho, é lido e adotado (${d[0]})`)
  else ok(fechamento() === undefined && d.every((x) => x === 'leased') && primeiros().length === 1, `T12 — ${ANTERIOR} (limit 1000, mais novo primeiro): o aluguel que cobrou cai fora, o N sai errado e cada passada bate no 23505 — travado (${d[0]})`)
}

// ── T13: o teto da passada não é gasto com re-POST ───────────────────────────────────────────────────────────────────
console.log('T13 — dois filmes esperando não travam um terceiro')
for (const [nome, GET] of [['atual', atual], ['rev5', rev5]] as const) {
  novoMundo(['pending-processing', 'pending-processing', 'ok'])
  const GB = '7d3f0c2a-9b1e-4c55-8a10-0000000000b2'
  const GC = '7d3f0c2a-9b1e-4c55-8a10-0000000000c3'
  mundo.tables.events.push({ id: 'parked-row-b', name: L.PARKED_EVENT, user_id: USER, session_id: GB, created_at: iso(T0 + 30_000), metadata: { version: L.PARKED_VERSION, reason: 'balance_quota', refunded: true, request: { prompt: 'Second film', duration: 60 } } })
  // o terceiro estaciona às T0 + 20 min, quando os dois primeiros já passaram do assentamento
  await rodadas(GET, 12, T0 + 5 * MIN, 5 * MIN, (i) => { if (i === 3) mundo.tables.events.push({ id: 'parked-row-c', name: L.PARKED_EVENT, user_id: USER, session_id: GC, created_at: iso(clock), metadata: { version: L.PARKED_VERSION, reason: 'balance_quota', refunded: true, request: { prompt: 'Third film', duration: 60 } } }) })
  const terceiro = primeiros().find((p) => p.generationId === idDaRetomada(GC, 1))
  if (nome === 'atual') ok(!!terceiro && terceiro.at <= T0 + 25 * MIN && reposts().length === 0, 'T13 os dois primeiros esperam sem gastar o teto; o terceiro sai na primeira passada depois de estacionar')
  else ok(!terceiro && reposts().length >= 10, `T13 — ${REV5} (revisão 5, verbatim): ${reposts().length} reconexões em 1 h gastam o teto de 2 por passada; o terceiro filme fica parado`)
}

// ── T14: fechamento 'failed' perdido ─────────────────────────────────────────────────────────────────────────────────
console.log("T14 — 4xx terminal cujo fechamento 'failed' falhou: refaz o fechamento, nunca a tentativa 2")
for (const [nome, GET] of [['atual', atual], ['rev6', rev6]] as const) {
  novoMundo(['bad-request', 'ok'])
  mundo.failInsertIds.add(idDoFechamento(GEN))
  await rodadas(GET, 1, T0 + 5 * MIN)
  const semFechar = fechamentos().length === 0 && (alugueis()[0].metadata as { outcome?: string }).outcome === 'failed' && mundo.emails.length === 0
  mundo.failInsertIds.clear()
  const d = await rodadas(GET, 6, T0 + 10 * MIN)
  if (nome === 'atual') ok(semFechar && primeiros().length === 1 && fechamento()?.outcome === 'failed' && nadaCobradoEnviado().length === 1 && d.some((x) => x.startsWith('failed_recovered')), `T14 o 4xx terminal fica 'failed': refaz o fechamento + 1 e-mail honesto, 1 POST só (${d.filter(Boolean).join(' → ')})`)
  else ok(semFechar && primeiros().length === 2, `T14 — ${REV6}: o aluguel 'failed' é relido "sem cobrança" e a tentativa 2 sai depois de um erro definitivo (${primeiros().length} POSTs)`)
}

// ── T15: mais de 100 estacionados na janela ─────────────────────────────────────────────────────────────────────────
console.log('T15 — numa queda grande, o estacionado mais novo não fica invisível')
for (const [nome, GET] of [['atual', atual], ['rev6', rev6]] as const) {
  novoMundo(['ok'])
  for (let k = 0; k < 120; k++) {
    const g = `9a5e2c4d-9b1e-4c55-8a10-000000000${String(k).padStart(3, '0')}`
    mundo.tables.events.push({ id: `parked-old-${String(k).padStart(3, '0')}`, name: L.PARKED_EVENT, user_id: USER, session_id: g, created_at: iso(T0 - 3 * H + k * 1000), metadata: { request: { prompt: 'x', duration: 60 } } })
    mundo.tables.events.push({ id: idDoFechamento(g), name: L.PARKED_CLOSED_EVENT, user_id: USER, session_id: g, created_at: iso(T0 - 2 * H), metadata: { outcome: 'resumed' } })
  }
  const d = await rodadas(GET, 2, T0 + 5 * MIN)
  if (nome === 'atual') ok(umFilme(r1) && primeiros().length === 1, `T15 121 estacionados (120 já fechados): o novo é lido e retomado na 1ª passada (${d[0]})`)
  else ok(primeiros().length === 0 && d.every((x) => x === ''), `T15 — ${REV6} (.limit(100), mais velho primeiro): os 100 já fechados ocupam a leitura e o novo nem aparece — nenhum POST`)
}

// ── P: a regra pura ──────────────────────────────────────────────────────────────────────────────────────────────────
console.log('P — regras puras de lib/filaQuedaFal')
{
  const LE = (debito: [boolean, boolean, boolean], claim: [boolean, string | null]) => L.leituraDaCobranca({ debito: { erro: debito[0], existe: debito[1], estornado: debito[2] }, claim: { erro: claim[0], status: claim[1] } })
  ok(LE([true, false, false], [false, null]).erro && LE([false, false, false], [true, null]).erro && LE([false, true, true], [false, 'done']).debito === 'estornado' && LE([false, true, false], [false, 'xyz']).claim === null && !('creditCost' in LE([false, false, false], [false, 'pending'])),
    'P1 leituraDaCobranca: erro em qualquer leitura = erro; débito nenhum/vivo/estornado; status fora da lista = sem claim; o custo do claim saiu (nada mais decide por ele)')
  const S = (d: 'nenhum' | 'vivo' | 'estornado', claim: 'pending' | 'done' | 'settled' | 'released' | null, o: { iniciado?: boolean; idade?: number; respondeu?: boolean; erro?: boolean } = {}) =>
    L.situacaoDaTentativa({ leitura: { erro: !!o.erro, debito: d, claim }, iniciado: !!o.iniciado, atMs: T0 - (o.idade ?? 20 * MIN), nowMs: T0, rotaRespondeu: o.respondeu })
  ok(S('vivo', 'settled', { idade: 0 }) === 'filme' && S('nenhum', 'settled', { idade: 0 }) === 'filme' && S('estornado', 'settled') === 'sem_cobranca' && S('estornado', 'settled', { idade: MIN }) === 'assentando' && S('nenhum', null, { iniciado: true, idade: 0 }) === 'filme' && S('vivo', 'settled', { erro: true }) === 'ilegivel',
    "P2 situacaoDaTentativa: 'settled' não estornado = filme (sem esperar); estornado = sem cobrança depois do assentamento; 2xx sem rastro = filme; erro = ilegível")
  ok(S('vivo', 'pending', { idade: MIN }) === 'assentando' && (['pending', 'done', 'released', null] as const).every((c) => S('vivo', c) === 'cobranca_viva') && (['pending', 'done', 'released', null] as const).every((c) => S('nenhum', c) === 'sem_cobranca' && S('estornado', c) === 'sem_cobranca'),
    "P3 regra única: débito vivo sem 'settled' (pending/done/released/nenhum) = cobrança viva (espera); estornado ou ausente = sem cobrança (depois do assentamento)")
  ok(S('nenhum', 'released', { iniciado: true }) === 'sem_cobranca' && S('estornado', null, { iniciado: true }) === 'sem_cobranca', "P4 'started' liberado ou estornado = sem cobrança (retoma)")
  ok(S('nenhum', 'done', { idade: 0, respondeu: true }) === 'sem_cobranca' && S('vivo', 'pending', { idade: 0, respondeu: true }) === 'cobranca_viva' && S('nenhum', null, { idade: 0, respondeu: true }) === 'sem_cobranca',
    'P5 a rota respondeu (4xx): sem assentamento; sem débito vivo = sem cobrança; com débito vivo = espera')
  const D = L.decidirAluguelSemFechamento
  ok(JSON.stringify(D([{ attempt: 1, situacao: 'filme' }, { attempt: 2, situacao: 'filme' }])) === '{"acao":"adotar","attempt":2}' && JSON.stringify(D([{ attempt: 1, situacao: 'cobranca_viva' }, { attempt: 2, situacao: 'filme' }])) === '{"acao":"adotar","attempt":2}'
    && D([{ attempt: 1, situacao: 'cobranca_viva' }, { attempt: 2, situacao: 'ilegivel' }]).acao === 'esperar' && JSON.stringify(D([{ attempt: 1, situacao: 'cobranca_viva' }, { attempt: 2, situacao: 'assentando' }])) === '{"acao":"esperar","motivo":"debito_pode_chegar"}'
    && JSON.stringify(D([{ attempt: 1, situacao: 'sem_cobranca' }, { attempt: 2, situacao: 'cobranca_viva' }])) === '{"acao":"esperar","motivo":"cobranca_viva"}' && D([{ attempt: 1, situacao: 'sem_cobranca' }]).acao === 'retomar',
    'P6 decidirAluguelSemFechamento: filme adota (o mais novo); ilegível/assentando/cobrança viva esperam; tudo sem cobrança retoma — não existe mais "reconectar"')
  ok(L.desfechoComCobranca('failed', 'sem_cobranca') === 'failed' && ['filme', 'ilegivel', 'assentando', 'cobranca_viva'].every((s) => L.desfechoComCobranca('failed', s as never) === 'retry_later') && L.desfechoComCobranca('started', null) === 'started' && L.desfechoComCobranca('retry_later', null) === 'retry_later', 'P7 desfechoComCobranca: 4xx só é terminal sem cobrança')
  ok(L.podeDizerNadaCobrado([{ situacao: 'sem_cobranca' }, { situacao: 'sem_cobranca' }]) && !L.podeDizerNadaCobrado([{ situacao: 'sem_cobranca' }, { situacao: 'cobranca_viva' }]) && !L.podeDizerNadaCobrado([{ situacao: 'ilegivel' }]), 'P8 podeDizerNadaCobrado: só com tudo lido sem cobrança')
  ok(['provider_down', 'lost_no_charge'].every((o) => !L.aluguelPodeTerCobrado(o)) && [undefined, 'started', 'retry_later', 'failed', 'qualquer'].every((o) => L.aluguelPodeTerCobrado(o)), 'P9 só o desfecho que PROVA estorno (503 parked, já lido) dispensa a leitura')
  const av = L.textoDoAlertaEstacionadoSemConfirmacao({ generationId: GEN, userId: USER, hours: 29, situacoes: ['1:cobranca_viva'], resumeIds: [r1] })
  ok(av.text.includes(GEN) && av.text.includes(USER) && av.text.includes(r1) && av.text.includes('29 h') && av.text.includes('/admin/people') && av.text.includes('NÃO recebeu e-mail') && av.subject.length > 0, 'P11 o aviso ao fundador traz pedido, conta, ids, horas e o que fazer à mão dos dois lados')
  ok(!L.passouDoLimiteDeEspera(T0, T0 + L.PARKED_HARD_STOP_MS - 1) && L.passouDoLimiteDeEspera(T0, T0 + L.PARKED_HARD_STOP_MS) && !L.passouDoLimiteDeEspera(Number.NaN, T0), 'P10 passouDoLimiteDeEspera: 29 h desde o estacionamento')
}

// ── F: o texto da rota ───────────────────────────────────────────────────────────────────────────────────────────────
console.log('F — a rota do cron')
{
  const r = rotaAtual
  const iLe = r.indexOf('const d = decidirAluguelSemFechamento(lidos)')
  const iVencido = r.indexOf("if (decision === 'expired' || decision === 'superseded' || !pedido) {")
  const iEmailVencido = r.indexOf("decision === 'expired' && pedido) email = await enviarEmail(admin, userId, 'expired'")
  const iNovo = r.indexOf('const leaseId = idDoAluguel(genId, attempt)')
  const iDesfecho = r.indexOf("const outcome = desfechoComCobranca(resposta, resposta === 'failed' ? situacaoDaTentativa({ leitura: await cobrancaDaRetomada(admin, userId, resumeGenId), iniciado: false, nowMs: now, rotaRespondeu: true }) : null)")
  const iEmailFalho = r.indexOf("if (f === 'novo') email = await enviarEmail(admin, userId, 'failed'")
  ok(iLe > 0 && iVencido > iLe && iEmailVencido > iVencido && iNovo > iVencido, 'F1 a cobrança dos aluguéis é lida ANTES do fechamento vencido/substituído e antes de qualquer aluguel novo')
  ok(iDesfecho > iNovo && iEmailFalho > iDesfecho, 'F2 o 4xx passa pela cobrança antes do fechamento failed e do e-mail')
  ok(r.includes('!aluguelPodeTerCobrado(md.outcome)') && r.includes('const leitura = await cobrancaDaRetomada(admin, userId, resumeId)') && r.includes(".eq('id', claimId).eq('user_id', userId).eq('name', CINEMATIC_CLAIM_EVENT).maybeSingle()"), 'F3 retry_later e started são lidos; o claim do mesmo id entra na leitura')
  ok((r.match(/postarRetomada\(/g) ?? []).length === 2 && r.includes('const { status, json } = await postarRetomada(userId, row, pedido, resumeGenId)') && (r.match(/await fetch\(`\$\{APP_URL\}\/api\/generate-video-cinematic`/g) ?? []).length === 1 && !/reconnect|reconect|reconex/i.test(r) && !/'reconectar'/.test(libAtual),
    'F4 um só POST para a rota de filme, só na tentativa NOVA (id N+1): nenhum caminho de reconexão na rota nem na regra')
  const iTeto = r.indexOf("if (d.acao === 'esperar' && passouDoLimiteDeEspera(parkedAtMs, now)) {")
  const iEspera = r.indexOf("if (d.acao === 'esperar') {", iTeto + 1)
  const teto = iTeto > 0 && iEspera > iTeto ? r.slice(iTeto, iEspera) : ''
  ok(teto.includes("fechar(admin, row, 'expired_unverified'") && teto.includes('name: FOUNDER_PARKED_ALERT_EVENT') && teto.includes("if (f === 'novo')") && teto.includes('console.error(') && teto.includes('await notifyFounder(aviso.subject, aviso.text') && !teto.includes('enviarEmail') && L.FOUNDER_PARKED_ALERT_EVENT === 'founder_alert_parked_unverified',
    'F8 o teto fecha expired_unverified, AVISA o fundador (notifyFounder) e grava UM evento founder_alert_parked_unverified, sem e-mail ao cliente')
  ok(r.includes('await pagina(p * PARKED_LEASE_PAGE, (p + 1) * PARKED_LEASE_PAGE - 1)') && r.includes('const parkedRows = await lerTudo<ParkedRow>(') && !/ascending: true \}\)\.limit\(100\)|\.in\('session_id', genIds\)\.limit\(500\)/.test(r) && !r.includes(".eq('name', PARKED_LEASE_EVENT).in('session_id', genIds).order('created_at', { ascending: false }).limit(1000)") && r.includes("if (closedRows === null || leaseRows === null) return NextResponse.json(") && r.includes("if (parkedRows === null) return NextResponse.json("), 'F5 estacionados, fechamentos e aluguéis lidos por inteiro em páginas; leitura incompleta = a passada não decide nada')
  ok(!r.includes("from '@/app/api/generate-video-cinematic/route'") && !/generate-video-cinematic\/route['"]/.test(r), 'F6 o cron continua chamando a rota de filme por HTTP (nunca a importa)')
  ok(!fs.readdirSync('lib').some((f) => f.startsWith('__mutante_rscd_')) && !fs.readdirSync('app/api/cron/resume-parked-renders').some((f) => f.startsWith('__mutante_rscd_')), 'F7 nenhuma cópia mutada ficou no disco')
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} ok · ${fail} falhas`)
if (fail > 0) process.exit(1)
process.exit(0)
