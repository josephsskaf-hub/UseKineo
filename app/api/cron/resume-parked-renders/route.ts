// ═══ KINEO-FILA-QUEDA-FAL-2810 — retoma os filmes ESTACIONADOS quando a fal volta (saldo/capacidade) ═══
//
// O par do `render_parked` que a rota /api/generate-video-cinematic grava quando a fal recusa TODAS as cenas por saldo
// (403/402 balance_quota) ou capacidade (429 rate_limit) sem nenhum gasto possível (ver lib/filaQuedaFal). A cada 5 min:
//   1. lê os estacionados das últimas 26 h, mais velho primeiro, e os marcadores `render_parked_closed`;
//   2. vencido (≥ 24 h) → fecha 'expired' + e-mail honesto (nada cobrado; o crédito voltou no estacionamento);
//      pedido mais novo da MESMA conta depois do estacionamento (generation_dispatch_received) → fecha 'superseded' em
//      silêncio: a pessoa já fez outro filme, nunca dois filmes pelo mesmo clique;
//   3. aluga a tentativa (`render_parked_taken`, id determinístico por tentativa: duas rodadas colidem no 23505) e chama a
//      rota por HTTP no modo serviço (Bearer CRON_SECRET + x-kineo-service-user — o contrato do finish-orphan-jobs; por HTTP,
//      e não em processo, porque ninguém pode importar a rota cinematic: o webpack a mandaria para um chunk compartilhado e a
//      trava do plano B do planejador, que lê a pilha, perderia o caminho — scripts/test-llm-fallback-2026-09-28.mjs), com o
//      pedido guardado + generationId novo e determinístico por tentativa (re-POST da mesma tentativa cai no claim/replay de
//      sempre, nunca em débito duplo) + x-kineo-service-country (o país do clique, para a cota grátis por país decidir igual);
//   4. 2xx → fecha 'resumed' (o finish-stranded-renders monta e manda "Your film is ready", como para quem fechou a aba);
//      503 queued/parked → a fal continua fora: PARA a passada (uma recusa já prova); 429/pending/5xx → fica para a
//      próxima; outro 4xx (saldo da conta mudou, regra do produto) → fecha 'failed' + e-mail honesto.
// Teto PARKED_MAX_RESUMES_PER_RUN por passada (cada retomada é um despacho inteiro). ?confirm=SEND manda e-mails;
// sem ele, só lista (os fechamentos e retomadas acontecem igual: são o produto, não campanha).
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { composerUrl } from '@/lib/lifecycle/composerUrl'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import {
  PARKED_EVENT, PARKED_LEASE_EVENT, PARKED_CLOSED_EVENT, PARKED_TTL_MS, PARKED_MAX_RESUMES_PER_RUN, PARKED_VERSION,
  classificarRespostaDaRetomada, corpoDaRetomada, decidirRetomada, type PedidoEstacionado, type ResumeDecision,
} from '@/lib/filaQuedaFal'
import { decidirAluguelSemFechamento, ehDespachoDaSerie, estacionadoRetomavel, estacionadoSuperavel } from '@/lib/filaQuedaFal' // KINEO-SERIE-AUTO-ETAPA1-0111 — só o original é retomado; série não é 'pedido novo'; aluguel que já cobrou nunca ganha a tentativa N+1
import { idDaRetomada, idDoAluguel, idDoFechamento } from '@/lib/filaQuedaFalIds' // KINEO-SERIE-AUTO-ETAPA1-0111 — os ids moram num módulo importável (a série precisa do id 'parked-…' da tentativa N)
import { cinematicClaimId } from '@/lib/cinematic/claim' // KINEO-SERIE-AUTO-ETAPA1-0111
import { CINEMATIC_CLAIM_EVENT } from '@/lib/cinematic/claim' // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
import { aluguelPodeTerCobrado, desfechoComCobranca, leituraDaCobranca, podeDizerNadaCobrado, situacaoDaTentativa, passouDoLimiteDeEspera, PARKED_LEASE_MAX_PAGES, PARKED_LEASE_PAGE, type LeituraDaCobranca, type SituacaoDaTentativa } from '@/lib/filaQuedaFal' // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — nenhuma tentativa N+1 (nem e-mail "nothing was charged") sem LER a cobrança da tentativa N; claim parado é reconectado pelo MESMO id

export const dynamic = 'force-dynamic'
// KINEO-DATA-CACHE-2026-09-02 (regra da casa): rota só-GET nasce com revalidate=false; sem isto o marcador de fechamento
// viria do Data Cache e o mesmo filme seria retomado duas vezes (o caso dos 35 filmes do finish-orphan-jobs em 19/09).
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 300

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
/** Janela de leitura: o TTL + folga para fechar os vencidos e para esperar/reconectar a última tentativa até PARKED_HARD_STOP_MS (29 h). */ // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
const SCAN_WINDOW_MS = PARKED_TTL_MS + 6 * 60 * 60 * 1000 // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — era + 2 h: a espera/reconexão ia além e o estacionado sumia da janela sem fechamento nem e-mail

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}
/** `country` = o x-vercel-ip-country gravado no estacionamento; a rota o repõe em modo serviço (a Vercel reescreveria o original). */
function serviceHeaders(userId: string, country: string | null): Record<string, string> {
  return { 'content-type': 'application/json', authorization: `Bearer ${process.env.CRON_SECRET}`, 'x-kineo-service-user': userId, ...(country ? { 'x-kineo-service-country': country } : {}) }
}
/** Um despacho inteiro (planner + stills + POSTs) cabe em ~2 min; o teto fica abaixo do maxDuration desta rota. */
const RESUME_TIMEOUT_MS = 240_000
function isInternalOrJunkEmail(email: string): boolean {
  const e = email.toLowerCase()
  return e.startsWith('josephsskaf') || e.startsWith('josephskaf') || e.endsWith('@shortsforgeai.com') || e.startsWith('test') || e.includes('mailinator') || e.includes('yopmail') || e.includes('tempmail')
}
/** Os ids do fechamento, do aluguel N e da retomada N (fórmulas de sempre, agora em lib/filaQuedaFalIds). */ // KINEO-SERIE-AUTO-ETAPA1-0111
export { idDoFechamento, idDoAluguel, idDaRetomada } // KINEO-SERIE-AUTO-ETAPA1-0111
/** A cobrança da retomada: o débito (o mesmo render_id que a rota grava: cinematic-<claim>) E o claim de nascimento do mesmo id (o filme // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
 *  grátis de promoção não debita; o status do claim decide se o filme está a caminho ou parado). Regra pura em lib/filaQuedaFal situacaoDaTentativa. */ // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
async function cobrancaDaRetomada(admin: SupabaseClient, userId: string, resumeGenId: string): Promise<LeituraDaCobranca> { // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  const claimId = cinematicClaimId(userId, resumeGenId) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  const [d, c] = await Promise.all([ // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    admin.from('credit_debits').select('refunded_at').eq('render_id', `cinematic-${claimId}`).maybeSingle(), // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    admin.from('events').select('metadata').eq('id', claimId).eq('user_id', userId).eq('name', CINEMATIC_CLAIM_EVENT).maybeSingle(), // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  ]) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  const cm = (((c.data as { metadata?: unknown } | null)?.metadata ?? null) as { status?: unknown; credit_cost?: unknown } | null) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  return leituraDaCobranca({ // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    debito: { erro: !!d.error, existe: !!d.data, estornado: !!(d.data as { refunded_at?: string | null } | null)?.refunded_at }, // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    claim: { erro: !!c.error, status: typeof cm?.status === 'string' ? cm.status : null, creditCost: typeof cm?.credit_cost === 'number' ? cm.credit_cost : null }, // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  }) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
} // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111

type ParkedRow = { user_id: string | null; session_id: string | null; created_at: string; metadata: unknown }
type LeaseRow = { id?: string | null; session_id: string | null; created_at: string; metadata: unknown } // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
/** O POST da retomada em modo serviço. Serve à tentativa nova (id N+1) e à RECONEXÃO do mesmo id N ("retry this same generation"). */ // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
async function postarRetomada(userId: string, row: ParkedRow, pedido: PedidoEstacionado, resumeGenId: string): Promise<{ status: number; json: unknown }> { // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  let status = 0 // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  let json: unknown = null // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  try { // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    const country = (row.metadata as { country?: unknown } | null)?.country // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    const res = await fetch(`${APP_URL}/api/generate-video-cinematic`, { method: 'POST', headers: serviceHeaders(userId, typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? country : null), body: JSON.stringify(corpoDaRetomada(pedido, resumeGenId)), cache: 'no-store', signal: AbortSignal.timeout(RESUME_TIMEOUT_MS) }) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    status = res.status // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    json = await res.json().catch(() => null) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  } catch (e) { // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    console.error(`[parked] gen=${resumeGenId.slice(0, 15)} resume threw:`, e instanceof Error ? e.message : String(e)) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  } // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  return { status, json } // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
} // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
/** // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
 * TODOS os aluguéis dos estacionados lidos, mais velho primeiro, em páginas de 1000. Era um .limit(1000) do mais novo para o mais velho: // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
 * numa queda longa os aluguéis antigos caíam fora — o candidato que cobrou sumia e o N da próxima tentativa saía errado. Página que // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
 * falha ou teto de páginas atingido = leitura incompleta = a passada não decide nada (fail closed). // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
 */ // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
async function lerAlugueis(admin: SupabaseClient, genIds: string[]): Promise<LeaseRow[] | null> { // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  const out: LeaseRow[] = [] // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  for (let p = 0; p < PARKED_LEASE_MAX_PAGES; p++) { // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    const { data, error } = await admin.from('events').select('id, session_id, created_at, metadata').eq('name', PARKED_LEASE_EVENT).in('session_id', genIds).order('created_at').order('id').range(p * PARKED_LEASE_PAGE, (p + 1) * PARKED_LEASE_PAGE - 1) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    if (error) return null // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    const rows = (data ?? []) as LeaseRow[] // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    out.push(...rows) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    if (rows.length < PARKED_LEASE_PAGE) return out // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  } // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  return null // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
} // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111

function pedidoDe(metadata: unknown): PedidoEstacionado | null {
  const m = (metadata && typeof metadata === 'object' ? metadata : {}) as { request?: unknown }
  const r = m.request as PedidoEstacionado | undefined
  return r && typeof r === 'object' && typeof r.prompt === 'string' && r.prompt.length > 0 && Number.isFinite(Number(r.duration)) ? r : null
}

// E-mail honesto: nada foi cobrado, o crédito voltou no dia, e o caminho de 1 clique para fazer o filme agora.
function buildEmail(userId: string, kind: 'expired' | 'failed', prompt: string) {
  const url = composerUrl({ base: APP_URL, campaign: kind === 'expired' ? 'parked_expired' : 'parked_failed', prompt })
  const oQue = kind === 'expired'
    ? "Our video engine stayed paused for longer than we promised, so the film you asked for yesterday never started."
    : "Our video engine is back, but your saved film couldn't start automatically (your account or balance changed since you asked for it)."
  const text = `Hey,

${oQue}

Nothing was charged — the credits for that film went back to your account the moment it was saved, and they are still there.

Your script is kept: one click opens it in the Studio so you can render it now: ${url}

If anything looks off, hit reply. It lands with a real person.

Kineo Team
usekineo.com`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;">
  <p>Hey,</p>
  <p>${oQue}</p>
  <p><strong>Nothing was charged</strong> — the credits for that film went back to your account the moment it was saved, and they are still there.</p>
  <p>Your script is kept: one click opens it in the Studio so you can render it now.</p>
  <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#2997ff;color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">Render it now →</a></p>
  <p>If anything looks off, hit reply. It lands with a real person.</p>
  <p style="margin:0 0 2px">Kineo Team</p>
  <p style="margin:0"><a href="https://www.usekineo.com" style="color:#2997ff">usekineo.com</a></p>
</div>${emailFooterHtml(userId)}`
  return { text: `${text}${emailFooterText(userId)}`, html }
}

async function enviarEmail(admin: SupabaseClient, userId: string, kind: 'expired' | 'failed', prompt: string, confirm: boolean): Promise<string> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return 'no_resend_key'
  const { data: prof } = await admin.from('profiles').select('email, email_opted_out').eq('id', userId).maybeSingle()
  const email = (prof?.email ?? '') as string
  if (!email || isInternalOrJunkEmail(email) || prof?.email_opted_out === true) return 'skipped_account'
  if (!confirm) return 'dry_run'
  const { text, html } = buildEmail(userId, kind, prompt)
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [email], reply_to: 'hello@usekineo.com', subject: kind === 'expired' ? "Your saved film didn't start — nothing was charged" : "Your saved film couldn't start — nothing was charged", text, html, headers: unsubscribeHeaders(userId) }),
    })
    return res.ok ? 'sent' : `failed_${res.status}`
  } catch { return 'threw' }
}

/** Fecha UMA vez (id determinístico). 'repetido' = outra rodada fechou antes: nada de e-mail duplicado. */
async function fechar(admin: SupabaseClient, row: ParkedRow, outcome: string, extra: Record<string, unknown>): Promise<'novo' | 'repetido' | 'erro'> {
  const genId = String(row.session_id)
  const { error } = await admin.from('events').insert({ id: idDoFechamento(genId), user_id: row.user_id, name: PARKED_CLOSED_EVENT, path: '/api/cron/resume-parked-renders', session_id: genId, metadata: { version: PARKED_VERSION, outcome, parked_at: row.created_at, ...extra } })
  return !error ? 'novo' : (error as { code?: string }).code === '23505' ? 'repetido' : 'erro'
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })
  const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: freshFetch } })
  const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
  const now = Date.now()
  const desde = new Date(now - SCAN_WINDOW_MS).toISOString()

  const { data: parkedRows, error } = await admin.from('events').select('user_id, session_id, created_at, metadata').eq('name', PARKED_EVENT).not('session_id', 'like', 'parked-%').gte('created_at', desde).order('created_at', { ascending: true }).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const parked = ((parkedRows ?? []) as ParkedRow[]).filter((r) => r.user_id && r.session_id && estacionadoRetomavel(r.session_id)) // KINEO-SERIE-AUTO-ETAPA1-0111 — a linha FILHA (a rota re-estacionou a tentativa N) nunca é retomada: só o original
  if (parked.length === 0) return NextResponse.json({ ok: true, mode: confirm ? 'SEND' : 'DRY_RUN', scanned: 0, results: [] })
  const genIds = parked.map((r) => String(r.session_id))
  const userIds = [...new Set(parked.map((r) => String(r.user_id)))]
  const minParkedAt = parked[0].created_at
  const [{ data: closedRows, error: closedErr }, leaseRows, { data: dispatchRows }] = await Promise.all([ // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    admin.from('events').select('session_id').eq('name', PARKED_CLOSED_EVENT).in('session_id', genIds).limit(500),
    lerAlugueis(admin, genIds), // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    admin.from('events').select('user_id, created_at, metadata').eq('name', 'generation_dispatch_received').in('user_id', userIds).gt('created_at', minParkedAt).limit(1000),
  ])
  if (closedErr || leaseRows === null) return NextResponse.json({ error: 'parked lease/close read incomplete — nothing decided this pass' }, { status: 503 }) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — sem a lista inteira, a tentativa N+1 poderia nascer por cima de uma que cobrou
  const closed = new Set((closedRows ?? []).map((r) => String(r.session_id)))
  const leases = new Map<string, { n: number; maxAttempt: number; openAtMs: number | null }>() // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 (maxAttempt: o N vem do maior número gravado, não da contagem)
  for (const l of leaseRows) {
    const sid = String(l.session_id)
    const cur = leases.get(sid) ?? { n: 0, maxAttempt: 0, openAtMs: null }
    cur.n += 1
    const md = (l.metadata ?? {}) as { outcome?: unknown; attempt?: unknown }
    const t = Date.parse(String(l.created_at))
    if (md.outcome === undefined && Number.isFinite(t)) cur.openAtMs = Math.max(cur.openAtMs ?? 0, t)
    if (Number.isInteger(Number(md.attempt)) && Number(md.attempt) > cur.maxAttempt) cur.maxAttempt = Number(md.attempt) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    leases.set(sid, cur)
  }
  // Aluguéis que podem já ter cobrado sem fechamento 'resumed': 'started' cujo fechamento falhou, ou SEM desfecho (o cron morreu no POST). // KINEO-SERIE-AUTO-ETAPA1-0111
  // E 'retry_later' (abort em 240 s com a rota viva até 300 s; 503 pending; 503 de estorno pendente): só fica de fora o desfecho que PROVA estorno. // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  const semFechamento = new Map<string, { attempt: number; iniciado: boolean; resumeId: string | null; atMs: number; md: Record<string, unknown>; reconexaoRecusada: boolean }[]>() // KINEO-SERIE-AUTO-ETAPA1-0111 // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
  for (const l of leaseRows) { // KINEO-SERIE-AUTO-ETAPA1-0111
    const md = (l.metadata ?? {}) as { outcome?: unknown; attempt?: unknown; resume_generation_id?: unknown; reconnect_result?: unknown } // KINEO-SERIE-AUTO-ETAPA1-0111
    const a = Number(md.attempt) // KINEO-SERIE-AUTO-ETAPA1-0111
    if (!Number.isInteger(a) || a < 1 || !aluguelPodeTerCobrado(md.outcome)) continue // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — era: (md.outcome !== undefined && md.outcome !== 'started'), e o 'retry_later' abria a N+1 sem ler o débito
    const lista = semFechamento.get(String(l.session_id)) ?? [] // KINEO-SERIE-AUTO-ETAPA1-0111
    lista.push({ attempt: a, iniciado: md.outcome === 'started', resumeId: typeof md.resume_generation_id === 'string' && md.resume_generation_id ? md.resume_generation_id : null, atMs: Date.parse(String(l.created_at)), md: md as Record<string, unknown>, reconexaoRecusada: md.reconnect_result === 'failed' }) // KINEO-SERIE-AUTO-ETAPA1-0111 // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 (atMs: a rota cobra até 300 s depois do aluguel)
    semFechamento.set(String(l.session_id), lista) // KINEO-SERIE-AUTO-ETAPA1-0111
  } // KINEO-SERIE-AUTO-ETAPA1-0111
  const lastDispatchByUser = new Map<string, number>()
  for (const d of dispatchRows ?? []) {
    // A nossa própria retomada também grava generation_dispatch_received (generation_id 'parked-…'): não é pedido novo da pessoa.
    if (String((d.metadata as { generation_id?: unknown } | null)?.generation_id ?? '').startsWith('parked-')) continue
    if (ehDespachoDaSerie((d.metadata as { generation_id?: unknown } | null)?.generation_id)) continue // KINEO-SERIE-AUTO-ETAPA1-0111 — o episódio da série automática nasce da agenda, não é "a pessoa fez outro filme"
    const t = Date.parse(String(d.created_at))
    if (Number.isFinite(t)) lastDispatchByUser.set(String(d.user_id), Math.max(lastDispatchByUser.get(String(d.user_id)) ?? 0, t))
  }

  const results: Array<{ generation: string; decision: ResumeDecision | string; outcome?: string; status?: number; email?: string }> = []
  let resumed = 0
  let providerDown = false
  for (const row of parked) {
    const genId = String(row.session_id)
    const userId = String(row.user_id)
    const g8 = genId.slice(0, 8)
    const parkedAtMs = Date.parse(row.created_at)
    const lease = leases.get(genId) ?? { n: 0, maxAttempt: 0, openAtMs: null }
    // Pedido mais novo da MESMA conta depois do estacionamento (a pessoa já fez outro filme) — as retomadas 'parked-…' ficaram de fora acima.
    const newerDispatch = estacionadoSuperavel(genId) && (lastDispatchByUser.get(userId) ?? 0) > parkedAtMs // KINEO-SERIE-AUTO-ETAPA1-0111 — episódio da série nunca é 'superseded'
    const decision = decidirRetomada({ parkedAtMs, nowMs: now, closed: closed.has(genId), newerDispatch, openLeaseAtMs: lease.openAtMs })
    if (decision === 'closed' || decision === 'leased') { results.push({ generation: g8, decision }); continue }
    const pedido = pedidoDe(row.metadata)
    // Um aluguel anterior já pode ter cobrado (sem fechamento gravado): aquela retomada É o filme — nunca a tentativa N+1 por cima. // KINEO-SERIE-AUTO-ETAPA1-0111
    // Lido ANTES do vencido/substituído: o fechamento 'expired' manda "Nothing was charged" e a série lê 'expired' como falha sem cobrança. // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    const candidatos = semFechamento.get(genId) ?? [] // KINEO-SERIE-AUTO-ETAPA1-0111
    if (candidatos.length > 0) { // KINEO-SERIE-AUTO-ETAPA1-0111
      const lidos: { attempt: number; iniciado: boolean; resumeId: string; atMs: number; md: Record<string, unknown>; reconexaoRecusada: boolean; leitura: LeituraDaCobranca; situacao: SituacaoDaTentativa }[] = [] // KINEO-SERIE-AUTO-ETAPA1-0111 // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
      for (const c of candidatos) { const resumeId = c.resumeId ?? idDaRetomada(genId, c.attempt); const leitura = await cobrancaDaRetomada(admin, userId, resumeId); lidos.push({ ...c, resumeId, leitura, situacao: situacaoDaTentativa({ leitura, iniciado: c.iniciado, atMs: c.atMs, nowMs: now, reconexaoRecusada: c.reconexaoRecusada }) }) } // KINEO-SERIE-AUTO-ETAPA1-0111 // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — débito E claim: 'settled' = a caminho; 'done'/'pending' parado = reconecta; o resto só depois do assentamento
      const d = decidirAluguelSemFechamento(lidos) // KINEO-SERIE-AUTO-ETAPA1-0111 // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
      const situacoes = lidos.map((x) => `${x.attempt}:${x.situacao}`) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
      if ((d.acao === 'esperar' || d.acao === 'reconectar') && passouDoLimiteDeEspera(parkedAtMs, now)) { // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — nada fica estacionado para sempre; sem leitura limpa, sem e-mail "nothing was charged"
        const f = await fechar(admin, row, 'expired_unverified', { attempts: lease.n, situacoes }) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        console.error(`[parked] gen=${g8} expired_unverified (${situacoes.join(' ')}) — cobrança não confirmada em ${Math.round((now - parkedAtMs) / 3_600_000)} h; conferir à mão`) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        results.push({ generation: g8, decision: 'expired_unverified', outcome: f, email: 'none' }) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        continue // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
      } // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
      if (d.acao === 'esperar') { results.push({ generation: g8, decision: d.motivo === 'debito_pode_chegar' ? 'lease_debit_settling' : d.motivo === 'estorno_pendente' ? 'lease_refund_pending' : 'lease_debit_unreadable' }); continue } // KINEO-SERIE-AUTO-ETAPA1-0111 // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
      if (d.acao === 'retomar' && !podeDizerNadaCobrado(lidos)) { results.push({ generation: g8, decision: 'lease_debit_unreadable' }); continue } // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — trava dupla: nada segue com cobrança viva/ilegível
      if (d.acao === 'adotar') { // KINEO-SERIE-AUTO-ETAPA1-0111
        const c = lidos.find((x) => x.attempt === d.attempt)! // KINEO-SERIE-AUTO-ETAPA1-0111
        if (!c.iniciado) await admin.from('events').update({ metadata: { ...c.md, version: PARKED_VERSION, attempt: c.attempt, outcome: 'started', resume_generation_id: c.resumeId, recovered: true } }).eq('id', idDoAluguel(genId, c.attempt)) // KINEO-SERIE-AUTO-ETAPA1-0111
        const f = await fechar(admin, row, 'resumed', { attempts: lease.n, resume_generation_id: c.resumeId, recovered: true }) // KINEO-SERIE-AUTO-ETAPA1-0111
        results.push({ generation: g8, decision: 'resume_recovered', outcome: f }) // KINEO-SERIE-AUTO-ETAPA1-0111
        continue // KINEO-SERIE-AUTO-ETAPA1-0111
      } // KINEO-SERIE-AUTO-ETAPA1-0111
      if (d.acao === 'reconectar') { // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — claim 'done' (cenas na fal, falta liquidar) ou 'pending' (a rota libera depois do prazo): re-POST do MESMO id, nunca o N+1
        const c = lidos.find((x) => x.attempt === d.attempt)! // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        if (!pedido) { results.push({ generation: g8, decision: 'reconnect_no_request' }); continue } // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        if (PARKED_MAX_RESUMES_PER_RUN <= resumed) { results.push({ generation: g8, decision: 'reconnect_deferred_budget' }); continue } // o mesmo teto por passada da tentativa nova // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        resumed += 1 // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        const r = await postarRetomada(userId, row, pedido, c.resumeId) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        const resp = classificarRespostaDaRetomada(r.status, r.json) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        const erroR = typeof (r.json as { error?: unknown } | null)?.error === 'string' ? String((r.json as { error: string }).error).slice(0, 200) : null // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        await admin.from('events').update({ metadata: { ...c.md, version: PARKED_VERSION, attempt: c.attempt, resume_generation_id: c.resumeId, ...(resp === 'started' ? { outcome: 'started', recovered: true } : {}), reconnect_result: resp, reconnect_status: r.status, reconnect_error: erroR, reconnect_at: new Date(now).toISOString(), reconnects: (Number(c.md.reconnects) || 0) + 1 } }).eq('id', idDoAluguel(genId, c.attempt)) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        console.log(`[parked] gen=${g8} reconnect attempt=${c.attempt} (${c.situacao}) → ${resp} (http ${r.status})${erroR ? ` ${erroR.slice(0, 80)}` : ''}`) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        if (resp === 'started') { const f = await fechar(admin, row, 'resumed', { attempts: lease.n, resume_generation_id: c.resumeId, recovered: true, reconnected: true, status: r.status }); results.push({ generation: g8, decision: 'reconnect_resumed', outcome: f }) } // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        else results.push({ generation: g8, decision: 'reconnect', outcome: resp, status: r.status }) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
        continue // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
      } // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
      for (const c of lidos) await admin.from('events').update({ metadata: { ...c.md, version: PARKED_VERSION, attempt: c.attempt, outcome: 'lost_no_charge', status: null, resume_generation_id: c.resumeId, debit: c.leitura.debito, claim: c.leitura.claim } }).eq('id', idDoAluguel(genId, c.attempt)) // KINEO-SERIE-AUTO-ETAPA1-0111
    } // KINEO-SERIE-AUTO-ETAPA1-0111
    if (decision === 'expired' || decision === 'superseded' || !pedido) {
      const outcome = !pedido ? 'invalid_request' : decision
      const fechado = await fechar(admin, row, outcome, { attempts: lease.n })
      let email = 'none'
      if (fechado === 'novo' && decision === 'expired' && pedido) email = await enviarEmail(admin, userId, 'expired', pedido.prompt, confirm)
      results.push({ generation: g8, decision: outcome, outcome: fechado, email })
      continue
    }
    if (providerDown) { results.push({ generation: g8, decision: 'provider_down_wait' }); continue }
    if (resumed >= PARKED_MAX_RESUMES_PER_RUN) { results.push({ generation: g8, decision: 'deferred_budget' }); continue }
    const attempt = Math.max(lease.n, lease.maxAttempt) + 1 // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    const leaseId = idDoAluguel(genId, attempt)
    const { error: leaseErr } = await admin.from('events').insert({ id: leaseId, user_id: userId, name: PARKED_LEASE_EVENT, path: '/api/cron/resume-parked-renders', session_id: genId, metadata: { version: PARKED_VERSION, attempt } })
    if (leaseErr) { results.push({ generation: g8, decision: (leaseErr as { code?: string }).code === '23505' ? 'leased' : 'lease_failed' }); continue }
    resumed += 1
    const resumeGenId = idDaRetomada(genId, attempt)
    const { status, json } = await postarRetomada(userId, row, pedido, resumeGenId) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    const resposta = classificarRespostaDaRetomada(status, json) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111
    const outcome = desfechoComCobranca(resposta, resposta === 'failed' ? situacaoDaTentativa({ leitura: await cobrancaDaRetomada(admin, userId, resumeGenId), iniciado: false, nowMs: now, rotaRespondeu: true, reconexaoRecusada: true }) : null) // KINEO-RETOMADA-SEM-COBRANCA-DUPLA-0111 — 4xx só é terminal com a tentativa 'sem_cobranca' (nem débito vivo, nem filme a caminho); senão retry_later, nunca "nothing was charged"
    const erro = typeof (json as { error?: unknown } | null)?.error === 'string' ? String((json as { error: string }).error).slice(0, 200) : null
    await admin.from('events').update({ metadata: { version: PARKED_VERSION, attempt, outcome, status, resume_generation_id: resumeGenId, error: erro } }).eq('id', leaseId)
    let email = 'none'
    if (outcome === 'started') await fechar(admin, row, 'resumed', { attempts: attempt, resume_generation_id: resumeGenId, status })
    else if (outcome === 'failed') { const f = await fechar(admin, row, 'failed', { attempts: attempt, status, error: erro }); if (f === 'novo') email = await enviarEmail(admin, userId, 'failed', pedido.prompt, confirm) }
    else if (outcome === 'provider_down') providerDown = true
    console.log(`[parked] gen=${g8} attempt=${attempt} → ${outcome} (http ${status})${erro ? ` ${erro.slice(0, 80)}` : ''}`)
    results.push({ generation: g8, decision: 'resume', outcome, status, email })
  }
  return NextResponse.json({ ok: true, mode: confirm ? 'SEND' : 'DRY_RUN', scanned: parked.length, resumed, provider_down: providerDown, results })
}
