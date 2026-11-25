// KINEO-RETOMADA-SEM-RAJADA-2511 — guardião da retomada espaçada do filme estacionado (cron resume-parked-renders). Roda a ROTA REAL do cron contra
// um PostgREST falso servido pelo `fetch` global, uma rota de filme falsa e a API de cobrança da fal falsa, com RELÓGIO FALSO, em três versões: a
// atual ('on'), a atual com 'off' e a da origin/main. Linhas do tempo reexecutadas (docs/semana-2/RETOMADA-DO-ESTACIONADO-2511.md):
//   R1 31/10 · estacionado por saldo, toda retomada responde o 503 "Your credit charge could not be confirmed" (o débito em modo serviço quebrado):
//      main = um POST a cada 10 min por 24 h (cada retry_later espera o assentamento de 10 min; em 31/10, sem essa trava, eram de 5 em 5) e o
//      'expired' no fim; 'on' = 4 POSTs (aos 15, 25, 35 e 55 min) e o 'failed' com o e-mail honesto aos 75 min (3 erros nossos seguidos E 60 min desde o 1º).
//   R2 08/11 · fal pausada por 5 h, estacionado por saldo, sem FAL_BILLING_KEY: de hora em hora; o filme sai no máximo 60 min depois da main, 1 débito.
//   R3 08/11 · com a chave e o saldo lido zerado até a recarga das 5 h: 0 POST sem saldo; a retomada até 5 min depois da recarga; 1 aviso de saldo
//      baixo por dia; o evento do dia; a chave nunca aparece em evento nem em log.
//   R4 03/11 · capacidade, fal fora por 50 min: tentativas aos 5, 10, 20, 40 e 60 min; o filme sai aos 60.
//   R5 · a fal que volta logo (7 min): o filme sai aos 10 min, igual à main.
//   R6 · erro nosso com capacidade: 5, 15, 25 e 45 min e o fechamento aos 65 (60 min desde o 1º erro).
//   R11 · 03/11 REAL (ee22bac0, 71abeb5f): estacionado às 19:26:54 UTC por saldo; o débito em modo serviço responde 503 até o deploy do conserto (success às
//      20:05:00), a fal fica pausada até 20:13: a main entregou às 20:18; a ponta TEM de entregar (antes da volta 1 ela fechava 'failed' às 20:13).
//   P · as regras puras de cada versão: a contagem do erro nosso para no 1º "outro"; 4xx e abort não são erro nosso; a janela de 60 min.
//   R7 · a trava da cobrança com 'on': a tentativa que cobrou depois do abort é adotada (1 POST, 1 débito); o 503 de estorno pendente nunca abre a N+1.
//   R8 · o evento do dia: um só por dia (duas passadas no mesmo minuto), a casa fora, outro no dia seguinte.
//   R9 · o saldo sem estacionado: uma leitura por hora; sem a chave, nenhuma leitura e nenhum evento.
//   R10 · 'off' = a main, passada a passada (os POSTs e as decisões de R1 e R4).
// Rodar: npx tsx scripts/test-retomada-sem-rajada-2511.mts
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.fake'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-fake'
process.env.CRON_SECRET = 'cron-secret-fake'
process.env.RESEND_API_KEY = 're_fake'
process.env.NEXT_PUBLIC_APP_URL = 'http://app.fake'
delete process.env.FAL_BILLING_KEY

const { NextRequest } = await import('next/server')
const { cinematicClaimId } = await import('../lib/cinematic/claim')
const L = await import('../lib/filaQuedaFal')
const Ids = await import('../lib/filaQuedaFalIds')
const S = await import('../lib/retomadaSemRajada2511')

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const ROTA = 'app/api/cron/resume-parked-renders/route.ts', LIB = 'lib/filaQuedaFal.ts'
const USER = '11111111-2222-4333-8444-555555555555', CASA_ID = '99999999-2222-4333-8444-555555555555'
const GEN = '7d3f0c2a-9b1e-4c55-8a10-000000000001', GEN_CASA = '7d3f0c2a-9b1e-4c55-8a10-000000000002'
const MIN = 60_000, H = 60 * MIN
const T0 = Date.UTC(2026, 9, 31, 8, 33, 31) // 31/10 08:33:31 UTC, o estacionamento de 499fbd8d
const CHAVE = 'fal-billing-key-SEGREDO-0123456789'
const DEBITO_503 = 'Your credit charge could not be confirmed. Nothing was submitted.'
const REFUND_PENDENTE = 'No AI scenes started and your automatic refund is still being confirmed. Please retry this same generation.'

let clock = T0
Date.now = () => clock
const iso = (ms: number) => new Date(ms).toISOString()
type Row = Record<string, unknown>
type Comp = 'ok' | 'debito-503' | 'parked' | 'capacidade-429' | 'abort-charged' | 'refund-pending'
class Mundo {
  tables: Record<string, Row[]> = { events: [], credit_debits: [], profiles: [{ id: USER, email: 'cliente@exemplo.com', email_opted_out: false }, { id: CASA_ID, email: 'josephsskaf@gmail.com', email_opted_out: false }] }
  emails: { subject: string; text: string; at: number }[] = []
  posts: { generationId: string; at: number; repost: boolean }[] = []
  leituras: { at: number; auth: string | null }[] = []
  comp: (gen: string) => Comp = () => 'ok'
  saldo: () => number = () => 100
  seq = 0
}
let mundo = new Mundo()
const claimIdDe = (gen: string) => cinematicClaimId(USER, gen)
const renderIdDe = (gen: string) => `cinematic-${claimIdDe(gen)}`
const claimDe = (gen: string) => mundo.tables.events.find((e) => e.id === claimIdDe(gen) && e.name === 'cinematic_submission_claim')
function setClaim(gen: string, status: string) {
  const c = claimDe(gen); if (c) { (c.metadata as Row).status = status; return }
  mundo.tables.events.push({ id: claimIdDe(gen), name: 'cinematic_submission_claim', user_id: USER, path: '/api/generate-video-cinematic', session_id: gen, created_at: iso(clock), metadata: { generation_id: gen, status, credit_cost: 9, started_at: iso(clock) } })
}
const debitoDe = (gen: string) => mundo.tables.credit_debits.find((d) => d.render_id === renderIdDe(gen))
const debitar = (gen: string) => { if (!debitoDe(gen)) mundo.tables.credit_debits.push({ render_id: renderIdDe(gen), user_id: USER, amount: 9, refunded_at: null, created_at: iso(clock) }) }
const vivos = () => mundo.tables.credit_debits.filter((d) => !d.refunded_at)
const evs = (name: string) => mundo.tables.events.filter((e) => e.name === name)
const primeiros = () => mundo.posts.filter((p) => !p.repost)
function rotaDeFilme(gen: string): { abort?: true; status?: number; json?: unknown } {
  mundo.tables.events.push({ id: `disp-${++mundo.seq}`, name: 'generation_dispatch_received', user_id: USER, created_at: iso(clock), metadata: { generation_id: gen } })
  const existente = claimDe(gen)
  if (existente) { mundo.posts.push({ generationId: gen, at: clock, repost: true }); return { status: 409, json: { error: 'This AI generation was safely closed. Please start a new one.' } } }
  mundo.posts.push({ generationId: gen, at: clock, repost: false })
  switch (mundo.comp(gen)) {
    case 'ok': setClaim(gen, 'settled'); debitar(gen); return { status: 200, json: { ok: true, generationId: gen } }
    case 'debito-503': setClaim(gen, 'released'); return { status: 503, json: { error: DEBITO_503, needed: 9, balance: 0 } }
    case 'capacidade-429': setClaim(gen, 'released'); return { status: 429, json: { error: 'Two AI attempts were just refunded. Please wait a few minutes before starting another.' } }
    case 'parked':
      setClaim(gen, 'released')
      mundo.tables.events.push({ id: `child-${++mundo.seq}`, name: L.PARKED_EVENT, user_id: USER, session_id: gen, created_at: iso(clock), metadata: { reason: 'balance_quota', refunded: true, request: { prompt: 'x', duration: 15 } } })
      return { status: 503, json: { queued: true, parked: true, error: L.PARKED_MESSAGE } }
    case 'abort-charged': setClaim(gen, 'settled'); debitar(gen); return { abort: true }
    case 'refund-pending': setClaim(gen, 'pending'); debitar(gen); return { status: 503, json: { error: REFUND_PENDENTE } }
  }
}
function casa(row: Row, col: string, expr: string): boolean {
  const neg = expr.startsWith('not.'), e = neg ? expr.slice(4) : expr, dot = e.indexOf('.'), op = e.slice(0, dot), v = e.slice(dot + 1)
  const cel = row[col], s = cel === null || cel === undefined ? null : String(cel)
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
  const table = url.pathname.replace('/rest/v1/', ''), rows = (mundo.tables[table] ??= []), method = (init?.method ?? 'GET').toUpperCase()
  const filtros: [string, string][] = []
  for (const [k, v] of url.searchParams) if (!['select', 'order', 'limit', 'offset', 'columns'].includes(k)) filtros.push([k, v])
  const sel = (r: Row) => filtros.every(([c, e]) => casa(r, c, e))
  if (method === 'GET') {
    let out = rows.filter(sel)
    const order = url.searchParams.get('order')
    if (order) { const ch = order.split(',').map((o) => { const [col, dir] = o.split('.'); return { col, dir } }); out = [...out].sort((a, b) => { for (const { col, dir } of ch) { const x = String(a[col]), y = String(b[col]); if (x !== y) return (x < y ? -1 : 1) * (dir === 'desc' ? -1 : 1) } return 0 }) }
    const off = Number(url.searchParams.get('offset') ?? 0), lim = url.searchParams.get('limit')
    out = out.slice(off, lim ? off + Number(lim) : undefined)
    const accept = new Headers(init?.headers).get('accept') ?? ''
    if (accept.includes('vnd.pgrst.object')) return out.length ? json({ ...out[0] }) : json({ message: 'no rows', code: 'PGRST116' }, 406)
    return json(out.map((r) => ({ ...r })))
  }
  const body = init?.body ? JSON.parse(String(init.body)) : null
  if (method === 'POST') {
    for (const r of (Array.isArray(body) ? body : [body]) as Row[]) {
      const row: Row = { created_at: iso(clock), ...r }
      if (row.id === undefined) row.id = `auto-${++mundo.seq}`
      if (rows.some((x) => x.id === row.id)) return json({ message: 'duplicate key value violates unique constraint', code: '23505', details: null, hint: null }, 409)
      rows.push(row)
    }
    return json('', 201)
  }
  if (method === 'PATCH') { for (const r of rows.filter(sel)) Object.assign(r, body); return json('', 204) }
  throw new Error('método não suportado: ' + method)
}
const logs: string[] = []
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.origin === 'http://supabase.fake') return rest(url, init)
  if (url.href === 'http://app.fake/api/generate-video-cinematic') {
    const r = rotaDeFilme(String(JSON.parse(String(init?.body)).generationId))
    if (r.abort) throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    return json(r.json, r.status)
  }
  if (url.href === S.FAL_BILLING_URL_2511) { mundo.leituras.push({ at: clock, auth: new Headers(init?.headers).get('authorization') }); return json({ username: 'kineo', credits: { current_balance: mundo.saldo(), currency: 'USD' } }) }
  if (url.href === 'https://api.resend.com/emails') { const b = JSON.parse(String(init?.body)); if (((b.to ?? []) as string[]).includes('cliente@exemplo.com')) mundo.emails.push({ subject: b.subject, text: b.text, at: clock }); return json({ id: 'e' }) } // só o e-mail do CLIENTE conta (o aviso ao fundador fica fora)
  return json({ ok: true }) // notifyFounder e o resto: aceitos
}) as typeof fetch

// ── as três rotas ─────────────────────────────────────────────────────────────────────────────────────────────────
type Get = (req: InstanceType<typeof NextRequest>) => Promise<Response>
const temporarios: string[] = []
const troca = (src: string, de: string, para: string, nome: string) => { if (!src.includes(de)) throw new Error(`${nome}: trecho não encontrado: ${de.slice(0, 90)}`); return src.split(de).join(para) }
const libs: Record<string, typeof L> = {}
async function rotaDe(nome: string, rota: string, lib: string): Promise<Get> {
  const libArq = `lib/__mutante_rsr_${nome}.ts`
  fs.writeFileSync(libArq, lib); temporarios.push(libArq)
  libs[nome] = await import(`../${libArq}`)
  const arq = `app/api/cron/resume-parked-renders/__mutante_rsr_${nome}.ts`
  fs.writeFileSync(arq, troca(rota, "from '@/lib/filaQuedaFal'", `from '@/lib/__mutante_rsr_${nome}'`, nome)); temporarios.push(arq)
  return (await import(`../${arq}`)).GET as Get
}
const git = (a: string[]) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r\n/g, '\n')
const rotaAtual = rd(ROTA), libAtual = rd(LIB)
const ON = "export const RETOMADA_ESPACADA_2511: ModoRetomadaEspacada2511 = 'on'", OFF = "export const RETOMADA_ESPACADA_2511: ModoRetomadaEspacada2511 = 'off'"
const MUTANTES: Array<[string, 'lib' | 'rota', string, string]> = [
  ['escada_de_5_em_5', 'lib', 'export const ESPERAS_FAL_FORA_2511_MS: readonly number[] = [5, 5, 10, 20, 20].map((m) => m * MIN_2511)', 'export const ESPERAS_FAL_FORA_2511_MS: readonly number[] = [5, 5, 5, 5, 5].map((m) => m * MIN_2511)'],
  ['depois_da_escada_5_min', 'lib', 'export const ESPERA_DEPOIS_DA_ESCADA_2511_MS = 60 * MIN_2511', 'export const ESPERA_DEPOIS_DA_ESCADA_2511_MS = 5 * MIN_2511'],
  ['erro_nosso_sem_teto', 'lib', 'export const ERRO_NOSSO_MAX_2511 = 3', 'export const ERRO_NOSSO_MAX_2511 = 1000'],
  ['saldo_ignorado', 'lib', "  if (saldo && i.saldoUsd !== null && i.saldoUsd < SALDO_PARA_RETOMAR_USD_2511) return { acao: 'esperar', motivo: 'saldo_zerado', ateMs: null }\n", ''],
  ['saldo_de_volta_sem_escada', 'lib', "  else if (saldo && i.saldoUsd !== null) { proxima = ultima ? ultima.atMs + (ESPERAS_FAL_FORA_2511_MS[t.length] ?? ESPERA_DEPOIS_DA_ESCADA_2511_MS) : i.parkedAtMs + ESPERAS_FAL_FORA_2511_MS[0]; motivo = 'escada' }", "  else if (saldo && i.saldoUsd !== null) return { acao: 'tentar' }"],
  ['sem_folga', 'lib', 'export const FOLGA_DA_ESCADA_2511_MS = MIN_2511', 'export const FOLGA_DA_ESCADA_2511_MS = 0'],
  ['primeira_por_saldo_5', 'lib', 'export const PRIMEIRA_POR_SALDO_2511_MS = 15 * MIN_2511', 'export const PRIMEIRA_POR_SALDO_2511_MS = 5 * MIN_2511'],
  ['classe_nao_gravada', 'rota', ', ...(espacada2511 ? { classe: classeDaTentativa2511({ outcome, status }) } : {})', ''],
  ['erro_nosso_em_qualquer_5xx_sem_classe', 'lib', "  if (md.classe === 'fal_fora' || md.classe === 'capacidade' || md.classe === 'erro_nosso' || md.classe === 'outro') return md.classe\n", ''],
  ['sem_o_dia_do_saldo', 'rota', '    if (porSaldo.length > 0) await registrarDiaDoSaldo2511(admin, { porSaldo, nowMs: now, saldoUsd: saldo2511 })\n', ''],
  ['sem_a_janela_de_60_min', 'lib', ' && i.nowMs - t[t.length - seguidos].atMs >= ERRO_NOSSO_JANELA_2511_MS) return', ') return'],
  ['erro_nosso_sem_espera', 'lib', 'proxima = ultima.atMs + (ESPERAS_ERRO_NOSSO_2511_MS[seguidos - 1] ?? ESPERA_ERRO_NOSSO_DEPOIS_2511_MS)', 'proxima = ultima.atMs'],
  ['erro_nosso_conta_tudo', 'lib', "for (let k = t.length - 1; k >= 0 && t[k].classe === 'erro_nosso'; k--) seguidos++", "for (const x of t) if (x.classe === 'erro_nosso') seguidos++"],
  ['todo_retry_later_e_erro_nosso', 'lib', "if (md.outcome === 'retry_later' && Number.isFinite(st) && st >= 500) return 'erro_nosso'", "if (md.outcome === 'retry_later') return 'erro_nosso'"],
  ['fechamento_sem_email', 'rota', "        const email = f === 'novo' ? await enviarEmail(admin, userId, 'failed', pedido.prompt, confirm) : 'none'\n", "        const email = 'none'\n"],
]
let atual: Get, off: Get, main: Get
const mutantes: Record<string, Get> = {}
try {
  atual = await rotaDe('on', rotaAtual, libAtual)
  off = await rotaDe('off', rotaAtual, troca(libAtual, ON, OFF, 'off'))
  main = await rotaDe('main', git(['show', `origin/main:${ROTA}`]), git(['show', `origin/main:${LIB}`]))
  for (const [nome, onde, de, para] of MUTANTES) mutantes[nome] = onde === 'lib' ? await rotaDe(nome, rotaAtual, troca(libAtual, de, para, nome)) : await rotaDe(nome, troca(rotaAtual, de, para, nome), libAtual)
} finally { for (const f of temporarios) { try { fs.unlinkSync(f) } catch { /* já foi */ } } }

// ── o cenário ─────────────────────────────────────────────────────────────────────────────────────────────────────
const req = () => new NextRequest('http://app.fake/api/cron/resume-parked-renders?confirm=SEND', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
async function passe(GET: Get): Promise<{ results?: { generation: string; decision: string; outcome?: string }[] }> {
  const log = console.log, err = console.error, warn = console.warn
  const guarda = (...a: unknown[]) => { logs.push(a.map(String).join(' ')) }
  console.log = guarda; console.error = guarda; console.warn = guarda
  try { const r = await GET(req()); return await r.json() } finally { console.log = log; console.error = err; console.warn = warn }
}
function novoMundo(reason: 'balance_quota' | 'capacity', comp: (t: number) => Comp, extra: { casa?: boolean } = {}) {
  mundo = new Mundo()
  mundo.comp = () => comp(clock - T0)
  const uid = extra.casa ? CASA_ID : USER
  mundo.tables.events.push({ id: 'parked-row-1', name: L.PARKED_EVENT, user_id: uid, session_id: extra.casa ? GEN_CASA : GEN, created_at: iso(T0), metadata: { version: L.PARKED_VERSION, reason, refunded: true, request: { prompt: 'The lighthouse keeper who vanished', duration: 15 } } })
}
const fechamento = () => evs(L.PARKED_CLOSED_EVENT)[0]?.metadata as { outcome?: string; motivo?: string } | undefined
const minutos = () => primeiros().map((p) => Math.round((p.at - T0) / MIN))
/** Passadas de 5 em 5 min de T0+5 até `ate` (ms depois de T0); devolve as decisões do estacionado, passada a passada. */
async function rodar(GET: Get, ate: number, antes?: () => void): Promise<string[]> {
  const out: string[] = []
  // as passadas reais variam de segundos (o aluguel nasce depois do começo da passada): a passada ímpar começa 900 ms depois, a par no minuto
  for (let k = 1; T0 + k * 5 * MIN <= T0 + ate; k++) { clock = T0 + k * 5 * MIN + (k % 2 ? 900 : 0); antes?.(); const r = await passe(GET); out.push((r.results ?? []).map((x) => `${x.decision}${x.outcome ? ':' + x.outcome : ''}`).join(',')) }
  return out
}
const comp31 = () => 'debito-503' as Comp
const comp08 = (t: number): Comp => (t < 5 * H ? 'parked' : 'ok')
const comp03 = (t: number): Comp => (t < 50 * MIN ? 'parked' : 'ok')
const comp07 = (t: number): Comp => (t < 7 * MIN ? 'parked' : 'ok')

async function suite(GET: Get, Lv: typeof L | null = null): Promise<string[]> {
  const f: string[] = []
  const no = (ruim: unknown, m: string) => { if (ruim) f.push(m) }
  // R1 31/10
  novoMundo('balance_quota', comp31)
  await rodar(GET, 26 * H)
  no(JSON.stringify(minutos()) !== JSON.stringify([15, 25, 35, 55]), `R1 31/10: 4 POSTs aos 15, 25, 35 e 55 min (a escada pede 5, 10 e 20 min; o assentamento de 10 min, que já existe, segura a N+1 depois de um retry_later) (foram ${primeiros().length}: ${minutos().slice(0, 6).join(',')}…)`)
  no(fechamento()?.outcome !== 'failed' || fechamento()?.motivo !== 'erro_nosso_3x' || Math.round((Date.parse(String(evs(L.PARKED_CLOSED_EVENT)[0]?.created_at)) - T0) / MIN) !== 75, 'R1 fecha "failed" (erro nosso 3x e 60 min) aos 75 min')
  no(mundo.emails.length !== 1 || vivos().length !== 0, 'R1 um e-mail honesto, nada cobrado')
  no(evs(L.PARKED_LEASE_EVENT).some((l) => (l.metadata as { outcome?: string; classe?: string }).outcome !== undefined && (l.metadata as { classe?: string }).classe !== 'erro_nosso'), 'R1 cada aluguel grava a classe erro_nosso')
  no(evs(S.EVENTO_ESTACIONADO_POR_SALDO_2511).length !== 1, 'R1 o evento do dia do saldo, um só')
  no(mundo.leituras.length !== 0 || evs(S.EVENTO_SALDO_DA_HORA_2511).length !== 0, 'R1 sem a chave: nenhuma leitura do saldo, nenhum evento da hora')
  // R2 08/11 sem a chave
  novoMundo('balance_quota', comp08)
  await rodar(GET, 8 * H)
  { const m = minutos(), entregue = m[m.length - 1]
    no(JSON.stringify(m) !== JSON.stringify([15, 75, 135, 195, 255, 315]) || fechamento()?.outcome !== 'resumed' || vivos().length !== 1, `R2 08/11 sem a chave: de hora em hora (15, 75…315), sai aos 315 min, 1 débito (foram ${m.join(',')})`)
    no(entregue - 300 > 60, 'R2 no máximo 60 min depois da volta da fal') }
  // R3 08/11 com a chave e o saldo zerado até a recarga
  process.env.FAL_BILLING_KEY = CHAVE
  try {
    novoMundo('balance_quota', comp08); mundo.saldo = () => (clock - T0 < 5 * H ? 0 : 100)
    await rodar(GET, 8 * H)
    no(JSON.stringify(minutos()) !== JSON.stringify([300]) || fechamento()?.outcome !== 'resumed' || vivos().length !== 1, `R3 com a chave: 0 POST sem saldo, a retomada aos 300 min (na passada em que o saldo volta), 1 débito (foram ${minutos().join(',')})`)
    no(mundo.leituras.length < 50 || mundo.leituras.some((l) => l.auth !== `Key ${CHAVE}`), 'R3 o saldo lido em toda passada com estacionado por saldo, com "Key <chave>"')
    no(evs(S.EVENTO_SALDO_BAIXO_2511).length !== 1, 'R3 um aviso de saldo baixo no dia')
    const tudo = JSON.stringify(mundo.tables) + logs.join('\n')
    no(tudo.includes(CHAVE), 'R3 a chave nunca aparece em evento nem em log')
  } finally { delete process.env.FAL_BILLING_KEY }
  // R3b com a chave e saldo positivo, mas a fal recusando por 50 min: a escada da fal fora, nunca de 5 em 5
  process.env.FAL_BILLING_KEY = CHAVE
  try { novoMundo('balance_quota', comp03); mundo.saldo = () => 100; await rodar(GET, 3 * H)
    no(JSON.stringify(minutos()) !== JSON.stringify([5, 10, 20, 40, 60]) || fechamento()?.outcome !== 'resumed', `R3b saldo positivo e a fal fora: 5, 10, 20, 40 e 60 min (foram ${minutos().join(',')})`) } finally { delete process.env.FAL_BILLING_KEY }
  // R4 03/11 capacidade
  novoMundo('capacity', comp03)
  await rodar(GET, 3 * H)
  no(JSON.stringify(minutos()) !== JSON.stringify([5, 10, 20, 40, 60]) || fechamento()?.outcome !== 'resumed', `R4 03/11: 5, 10, 20, 40 e 60 min, sai aos 60 (foram ${minutos().join(',')})`)
  no(evs(S.EVENTO_ESTACIONADO_POR_SALDO_2511).length !== 0, 'R4 capacidade não é saldo: nenhum evento do dia do saldo')
  // R5 a fal que volta logo
  novoMundo('capacity', comp07)
  await rodar(GET, 2 * H)
  no(JSON.stringify(minutos()) !== JSON.stringify([5, 10]) || fechamento()?.outcome !== 'resumed', `R5 a fal volta em 7 min: sai aos 10, como hoje (foram ${minutos().join(',')})`)
  // R6 erro nosso com capacidade
  novoMundo('capacity', comp31)
  await rodar(GET, 3 * H)
  no(JSON.stringify(minutos()) !== JSON.stringify([5, 15, 25, 45]) || fechamento()?.outcome !== 'failed' || Math.round((Date.parse(String(evs(L.PARKED_CLOSED_EVENT)[0]?.created_at)) - T0) / MIN) !== 65, `R6 erro nosso: 5, 15, 25 e 45 min, fecha aos 65 (foram ${minutos().join(',')})`)
  // R7 a trava da cobrança com 'on'
  novoMundo('capacity', () => 'abort-charged')
  await rodar(GET, 3 * H)
  no(primeiros().length !== 1 || vivos().length !== 1 || fechamento()?.outcome !== 'resumed', 'R7 abort que cobrou: adotado, 1 POST, 1 débito')
  novoMundo('capacity', () => 'refund-pending')
  await rodar(GET, 30 * H)
  no(primeiros().length !== 1 || mundo.posts.length !== 1 || fechamento()?.outcome !== 'expired_unverified' || mundo.emails.length !== 0, 'R7 estorno pendente que nunca vem: nenhuma N+1, nenhum re-POST, "expired_unverified" sem e-mail')
  // R8 o evento do dia
  novoMundo('balance_quota', () => 'parked')
  clock = T0 + 5 * MIN; await passe(GET); clock += 1_000; await passe(GET)
  no(evs(S.EVENTO_ESTACIONADO_POR_SALDO_2511).length !== 1, 'R8 duas passadas no mesmo minuto: um evento')
  { const md = evs(S.EVENTO_ESTACIONADO_POR_SALDO_2511)[0]?.metadata as { contas?: string[]; filmes?: number; dia?: string } | undefined
    no(JSON.stringify(md?.contas) !== JSON.stringify([USER.slice(0, 8)]) || md?.filmes !== 1 || md?.dia !== '2026-10-31', 'R8 o evento diz o dia, os filmes e as contas (8 caracteres)') }
  clock = Date.UTC(2026, 10, 1, 0, 3, 31); await passe(GET)
  no(evs(S.EVENTO_ESTACIONADO_POR_SALDO_2511).length !== 2, 'R8 no dia seguinte, outro evento')
  novoMundo('balance_quota', () => 'parked', { casa: true })
  clock = T0 + 5 * MIN; await passe(GET)
  no(evs(S.EVENTO_ESTACIONADO_POR_SALDO_2511).length !== 0, 'R8 a casa fica fora do evento do dia')
  // R9 o saldo sem estacionado
  mundo = new Mundo()
  for (clock = T0; clock < T0 + H; clock += 5 * MIN) await passe(GET)
  no(mundo.leituras.length !== 0 || mundo.tables.events.length !== 0, 'R9 sem a chave: nenhuma leitura, nenhum evento')
  process.env.FAL_BILLING_KEY = CHAVE
  try {
    mundo = new Mundo(); mundo.saldo = () => 50
    for (clock = Date.UTC(2026, 10, 2, 10, 0, 0); clock < Date.UTC(2026, 10, 2, 12, 0, 0); clock += 5 * MIN) await passe(GET)
    no(mundo.leituras.length !== 2 || evs(S.EVENTO_SALDO_DA_HORA_2511).length !== 2, `R9 com a chave: uma leitura por hora (foram ${mundo.leituras.length})`)
    no(evs(S.EVENTO_SALDO_BAIXO_2511).length !== 1 || (evs(S.EVENTO_SALDO_BAIXO_2511)[0].metadata as { saldo_usd?: number; limite_usd?: number }).limite_usd !== 75, 'R9 saldo de US$ 50 < 75: um aviso no dia')
    mundo.saldo = () => 500; mundo.leituras = []
    clock = Date.UTC(2026, 10, 3, 10, 0, 0); await passe(GET)
    no(evs(S.EVENTO_SALDO_BAIXO_2511).length !== 1 || mundo.leituras.length !== 1, 'R9 saldo alto: nenhum aviso novo')
  } finally { delete process.env.FAL_BILLING_KEY }
  // R11 03/11 real: a cron roda às :x3:31/:x8:31; o débito em modo serviço quebrado até 20:05:00 (o deploy), a fal pausada até 20:13
  { const parked = Date.UTC(2026, 10, 3, 19, 26, 54), deploy = Date.UTC(2026, 10, 3, 20, 5, 0), falVolta = Date.UTC(2026, 10, 3, 20, 13, 0)
    mundo = new Mundo(); mundo.comp = () => (clock < deploy ? 'debito-503' : clock < falVolta ? 'parked' : 'ok')
    mundo.tables.events.push({ id: 'parked-row-1', name: L.PARKED_EVENT, user_id: USER, session_id: GEN, created_at: iso(parked), metadata: { version: L.PARKED_VERSION, reason: 'balance_quota', refunded: true, request: { prompt: 'x', duration: 15 } } })
    for (let k = 0; k < 40; k++) { clock = Date.UTC(2026, 10, 3, 19, 28, 31) + k * 5 * MIN + (k % 2 ? 900 : 0); await passe(GET) }
    const saiu = primeiros().find((p) => claimDe(p.generationId) && (claimDe(p.generationId)!.metadata as { status?: string }).status === 'settled')
    no(fechamento()?.outcome !== 'resumed' || !saiu || vivos().length !== 1 || mundo.emails.length !== 0, `R11 03/11 real: o filme de ee22bac0 é ENTREGUE (1 débito, nenhum e-mail de falha) — fechamento ${fechamento()?.outcome}`)
    if (saiu) no(saiu.at > Date.UTC(2026, 10, 3, 20, 28, 31), `R11 sai até 20:28 UTC (a main: 20:18) — saiu às ${iso(saiu.at).slice(11, 16)}`) }
  // P as regras puras DESTA versão (a lib que a rota carrega)
  if (Lv) {
    const t0 = T0, E = (dt: number, classe: string) => ({ atMs: t0 + dt * MIN, classe: classe as never, status: classe === 'erro_nosso' ? 503 : null, erro: null })
    no(Lv.decidirEscada2511({ parkedAtMs: t0 - 5 * MIN, nowMs: t0 + 200 * MIN, motivo: 'capacity', tentativas: [E(0, 'erro_nosso'), E(10, 'erro_nosso'), E(20, 'fal_fora'), E(40, 'erro_nosso')], saldoUsd: null }).acao === 'fechar_erro_nosso', 'P a contagem do erro nosso para no 1º "outro" (E1)')
    no(Lv.classeDaTentativa2511({ outcome: 'retry_later', status: 409 }) !== 'outro' || Lv.classeDaTentativa2511({ outcome: 'retry_later', status: 0 }) !== 'outro' || Lv.classeDaTentativa2511({ outcome: 'retry_later', status: 503 }) !== 'erro_nosso', 'P 4xx e abort não são erro nosso; 5xx é (E5)')
    const tres = [E(0, 'erro_nosso'), E(10, 'erro_nosso'), E(20, 'erro_nosso')]
    no(Lv.decidirEscada2511({ parkedAtMs: t0 - 5 * MIN, nowMs: t0 + 59 * MIN, motivo: 'capacity', tentativas: tres, saldoUsd: null }).acao === 'fechar_erro_nosso', 'P 3 erros nossos em 20 min: não fecha antes de 60 min do 1º')
    no(Lv.decidirEscada2511({ parkedAtMs: t0 - 5 * MIN, nowMs: t0 + 60 * MIN, motivo: 'capacity', tentativas: tres, saldoUsd: null }).acao !== 'fechar_erro_nosso', 'P aos 60 min do 1º: fecha')
    { const d = Lv.decidirEscada2511({ parkedAtMs: t0 - 5 * MIN, nowMs: t0 + 30 * MIN, motivo: 'capacity', tentativas: tres, saldoUsd: null }); no(d.acao !== 'esperar' || (d as { ateMs: number }).ateMs !== t0 + 40 * MIN, 'P depois da 3ª, a próxima em 20 min (E2)') }
  }
  return f
}

// ── R10: 'off' = a main, passada a passada ────────────────────────────────────────────────────────────────────────
async function trilha(GET: Get, reason: 'balance_quota' | 'capacity', comp: (t: number) => Comp, ate: number) { novoMundo(reason, comp); const d = await rodar(GET, ate); return { d, posts: minutos(), fech: fechamento()?.outcome ?? null, emails: mundo.emails.length } }
{
  for (const [nome, reason, comp, ate] of [['R1 31/10', 'balance_quota', comp31, 26 * H], ['R4 03/11', 'capacity', comp03, 3 * H], ['R2 08/11', 'balance_quota', comp08, 8 * H]] as const) {
    const a = await trilha(off, reason, comp, ate), b = await trilha(main, reason, comp, ate)
    ok(JSON.stringify(a) === JSON.stringify(b), `R10 ${nome}: 'off' = a main, passada a passada (${a.posts.length} POSTs, ${a.fech})`)
    if (nome === 'R1 31/10') ok(b.posts.length >= 140 && b.fech === 'expired', `a main reproduz a rajada de 31/10: ${b.posts.length} POSTs e o 'expired' em 24 h`)
  }
}
// ── a rota atual ─────────────────────────────────────────────────────────────────────────────────────────────────
{ const f = await suite(atual, libs.on); for (const x of f) ok(false, x); ok(f.length === 0, `a rota atual ('on'): R1 a R11 e as regras puras verdes`) }
// ── os mutantes ──────────────────────────────────────────────────────────────────────────────────────────────────
for (const [nome] of MUTANTES) { const f = await suite(mutantes[nome], libs[nome]); ok(f.length > 0, `mutante "${nome}" é pego${f.length ? ' (' + f[0].slice(0, 70) + ')' : ''}`) }
// ── as regras puras ──────────────────────────────────────────────────────────────────────────────────────────────
ok(L.RETOMADA_ESPACADA_2511 === 'on' && L.SALDO_BAIXO_USD_2511 === 75 && L.ERRO_NOSSO_MAX_2511 === 3, "P a chave nasce 'on'; aviso a US$ 75; erro nosso 3 vezes")
ok(L.classeDaTentativa2511({ outcome: 'provider_down', status: 503 }) === 'fal_fora' && L.classeDaTentativa2511({ outcome: 'retry_later', status: 429 }) === 'capacidade' && L.classeDaTentativa2511({ outcome: 'retry_later', status: 503 }) === 'erro_nosso'
  && L.classeDaTentativa2511({ outcome: 'lost_no_charge', status: null }) === 'outro' && L.classeDaTentativa2511({ outcome: 'lost_no_charge', status: null, classe: 'erro_nosso' }) === 'erro_nosso', 'P a classe: gravada vence; fal fora, capacidade, erro nosso, outro')
ok(Ids.ehRetomadaDoRobo(Ids.idDaRetomada(GEN, 1)) && !Ids.ehRetomadaDoRobo(GEN) && !Ids.ehRetomadaDoRobo(null), "P (d) ehRetomadaDoRobo: o id 'parked-…' da retomada")
{ const r = await S.lerSaldoDaFal2511({ chave: null }); ok(r.estado === 'sem_chave', 'P sem chave: sem leitura') }
{ const r = await S.lerSaldoDaFal2511({ chave: 'k', fetchImpl: (async () => json({ credits: { current_balance: 'x' } })) as typeof fetch }); ok(r.estado === 'erro', 'P resposta torta = erro (nunca um saldo inventado)') }
const fonte = rd('lib/retomadaSemRajada2511.ts') + rotaAtual
ok(!/console\.[a-z]+\([^)]*(chave|FAL_BILLING_KEY)/i.test(fonte), 'P nenhum log com a chave')
console.log(`${fail === 0 ? '✅' : '❌'} ${pass} ok · ${fail} falha(s)`)
if (fail) process.exit(1)
