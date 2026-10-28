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
import { createHash } from 'node:crypto'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { composerUrl } from '@/lib/lifecycle/composerUrl'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import {
  PARKED_EVENT, PARKED_LEASE_EVENT, PARKED_CLOSED_EVENT, PARKED_TTL_MS, PARKED_MAX_RESUMES_PER_RUN, PARKED_VERSION,
  classificarRespostaDaRetomada, corpoDaRetomada, decidirRetomada, uuidDeHex, type PedidoEstacionado, type ResumeDecision,
} from '@/lib/filaQuedaFal'

export const dynamic = 'force-dynamic'
// KINEO-DATA-CACHE-2026-09-02 (regra da casa): rota só-GET nasce com revalidate=false; sem isto o marcador de fechamento
// viria do Data Cache e o mesmo filme seria retomado duas vezes (o caso dos 35 filmes do finish-orphan-jobs em 19/09).
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 300

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
/** Janela de leitura: o TTL + folga para fechar os vencidos. */
const SCAN_WINDOW_MS = PARKED_TTL_MS + 2 * 60 * 60 * 1000

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
const idDe = (...parts: string[]) => uuidDeHex(createHash('sha256').update(JSON.stringify(['kineo:fila-queda-fal:v1', ...parts])).digest('hex').slice(0, 32))
/** Id do marcador de fechamento: UM por filme estacionado (a 2ª rodada cai no 23505 e não manda e-mail repetido). */
export const idDoFechamento = (genId: string) => idDe('closed', genId)
/** Id do aluguel da tentativa N. */
export const idDoAluguel = (genId: string, attempt: number) => idDe('lease', genId, String(attempt))
/** generationId da retomada N: determinístico, logo o mesmo claim se a rodada repetir a mesma tentativa. */
export const idDaRetomada = (genId: string, attempt: number) => `parked-${idDe('resume', genId, String(attempt)).replace(/-/g, '').slice(0, 24)}`

type ParkedRow = { user_id: string | null; session_id: string | null; created_at: string; metadata: unknown }

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

  const { data: parkedRows, error } = await admin.from('events').select('user_id, session_id, created_at, metadata').eq('name', PARKED_EVENT).gte('created_at', desde).order('created_at', { ascending: true }).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const parked = ((parkedRows ?? []) as ParkedRow[]).filter((r) => r.user_id && r.session_id)
  if (parked.length === 0) return NextResponse.json({ ok: true, mode: confirm ? 'SEND' : 'DRY_RUN', scanned: 0, results: [] })
  const genIds = parked.map((r) => String(r.session_id))
  const userIds = [...new Set(parked.map((r) => String(r.user_id)))]
  const minParkedAt = parked[0].created_at
  const [{ data: closedRows }, { data: leaseRows }, { data: dispatchRows }] = await Promise.all([
    admin.from('events').select('session_id').eq('name', PARKED_CLOSED_EVENT).in('session_id', genIds).limit(500),
    admin.from('events').select('session_id, created_at, metadata').eq('name', PARKED_LEASE_EVENT).in('session_id', genIds).order('created_at', { ascending: false }).limit(1000),
    admin.from('events').select('user_id, created_at, metadata').eq('name', 'generation_dispatch_received').in('user_id', userIds).gt('created_at', minParkedAt).limit(1000),
  ])
  const closed = new Set((closedRows ?? []).map((r) => String(r.session_id)))
  const leases = new Map<string, { n: number; openAtMs: number | null }>()
  for (const l of leaseRows ?? []) {
    const sid = String(l.session_id)
    const cur = leases.get(sid) ?? { n: 0, openAtMs: null }
    cur.n += 1
    const md = (l.metadata ?? {}) as { outcome?: unknown }
    const t = Date.parse(String(l.created_at))
    if (md.outcome === undefined && Number.isFinite(t)) cur.openAtMs = Math.max(cur.openAtMs ?? 0, t)
    leases.set(sid, cur)
  }
  const lastDispatchByUser = new Map<string, number>()
  for (const d of dispatchRows ?? []) {
    // A nossa própria retomada também grava generation_dispatch_received (generation_id 'parked-…'): não é pedido novo da pessoa.
    if (String((d.metadata as { generation_id?: unknown } | null)?.generation_id ?? '').startsWith('parked-')) continue
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
    const lease = leases.get(genId) ?? { n: 0, openAtMs: null }
    // Pedido mais novo da MESMA conta depois do estacionamento (a pessoa já fez outro filme) — as retomadas 'parked-…' ficaram de fora acima.
    const newerDispatch = (lastDispatchByUser.get(userId) ?? 0) > parkedAtMs
    const decision = decidirRetomada({ parkedAtMs, nowMs: now, closed: closed.has(genId), newerDispatch, openLeaseAtMs: lease.openAtMs })
    if (decision === 'closed' || decision === 'leased') { results.push({ generation: g8, decision }); continue }
    const pedido = pedidoDe(row.metadata)
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
    const attempt = lease.n + 1
    const leaseId = idDoAluguel(genId, attempt)
    const { error: leaseErr } = await admin.from('events').insert({ id: leaseId, user_id: userId, name: PARKED_LEASE_EVENT, path: '/api/cron/resume-parked-renders', session_id: genId, metadata: { version: PARKED_VERSION, attempt } })
    if (leaseErr) { results.push({ generation: g8, decision: (leaseErr as { code?: string }).code === '23505' ? 'leased' : 'lease_failed' }); continue }
    resumed += 1
    const resumeGenId = idDaRetomada(genId, attempt)
    let status = 0
    let json: unknown = null
    try {
      const country = (row.metadata as { country?: unknown } | null)?.country
      const res = await fetch(`${APP_URL}/api/generate-video-cinematic`, { method: 'POST', headers: serviceHeaders(userId, typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? country : null), body: JSON.stringify(corpoDaRetomada(pedido, resumeGenId)), cache: 'no-store', signal: AbortSignal.timeout(RESUME_TIMEOUT_MS) })
      status = res.status
      json = await res.json().catch(() => null)
    } catch (e) {
      console.error(`[parked] gen=${g8} resume threw:`, e instanceof Error ? e.message : String(e))
    }
    const outcome = classificarRespostaDaRetomada(status, json)
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
