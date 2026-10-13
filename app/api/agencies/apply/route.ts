// KINEO-AGENCIAS-2026-10-13 — inscrição do programa de agências (formulário de /agencies).
//
// POST { name, agency, website, email, client_count, note?, company_phone_ext? (armadilha) }
//   → grava UMA linha em public.agency_applications (service role; a tabela não tem policy para anon/authenticated)
//   → avisa o fundador por e-mail (lib/supplier/notify.ts: Resend, remetente RESEND_FROM_EMAIL, + webhook opcional).
// NÃO cria conta, NÃO cria afiliado, NÃO concede crédito: o fundador responde e decide (regra de 24/08 — nada de promessa
// que o produto não executa sozinho; o que a página promete é "respondemos por e-mail").
//
// Teto em 3 camadas: memória por IP (instância), banco por IP (hash) por hora, banco por e-mail por dia. A resposta nunca
// ecoa os dados enviados nem diz se o e-mail já existia.
import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notifyFounder } from '@/lib/supplier/notify'
import {
  AGENCY_APPLICATIONS_TABLE,
  AGENCY_APPLY_MAX_PER_EMAIL_DAY,
  AGENCY_APPLY_MAX_PER_IP_HOUR,
  agencyApplicationAlert,
  isAgencyHoneypotHit,
  sanitizeAgencyApplication,
} from '@/lib/growth/agencyProgram'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const MAX_BODY_CHARS = 6_000
const NOTIFY_TIMEOUT_MS = 4_000

function reply(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' },
  })
}

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function clientIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip')?.trim() || 'sem-ip'
}

// Camada 1: memória da instância (barra laço rápido antes de tocar no banco).
const HITS = new Map<string, { n: number; reset: number }>()
const HIT_WINDOW_MS = 10 * 60_000
const HIT_MAX = 6
function overMemoryLimit(ip: string): boolean {
  const now = Date.now()
  if (HITS.size > 5_000) HITS.clear()
  const h = HITS.get(ip)
  if (!h || h.reset < now) { HITS.set(ip, { n: 1, reset: now + HIT_WINDOW_MS }); return false }
  h.n++
  return h.n > HIT_MAX
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  if (overMemoryLimit(ip)) return reply({ ok: false, error: 'rate_limited' }, 429)

  const raw = await req.text().catch(() => '')
  if (raw.length > MAX_BODY_CHARS) return reply({ ok: false, error: 'too_large' }, 413)
  let body: unknown = {}
  try { body = JSON.parse(raw || '{}') } catch { return reply({ ok: false, error: 'invalid' }, 400) }

  // Robô: responde igual a sucesso e não grava nada.
  if (isAgencyHoneypotHit(body)) return reply({ ok: true })

  const parsed = sanitizeAgencyApplication(body)
  if (!parsed.ok) return reply({ ok: false, error: 'invalid', fields: parsed.invalid }, 400)
  const app = parsed.value

  const db = adminDb()
  if (!db) return reply({ ok: false, error: 'applications_unavailable' }, 503)

  const ipHash = createHash('sha256').update(`kineo-agencies:${ip}`).digest('hex')
  const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString()

  try {
    // Camadas 2 e 3: banco (vale entre instâncias).
    const [byIp, byEmail] = await Promise.all([
      db.from(AGENCY_APPLICATIONS_TABLE).select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', hourAgo),
      db.from(AGENCY_APPLICATIONS_TABLE).select('id', { count: 'exact', head: true }).eq('email', app.email).gte('created_at', dayAgo),
    ])
    const readError = byIp.error ?? byEmail.error
    if (readError) {
      // 42P01 = a tabela ainda não existe (migration 20261013120000_agency_program.sql não aplicada).
      if (readError.code === '42P01' || readError.code === 'PGRST205') return reply({ ok: false, error: 'applications_unavailable' }, 503)
      console.error('[agencies/apply] leitura do teto falhou:', readError.code)
      return reply({ ok: false, error: 'unavailable' }, 503)
    }
    if ((byIp.count ?? 0) >= AGENCY_APPLY_MAX_PER_IP_HOUR) return reply({ ok: false, error: 'rate_limited' }, 429)
    // Mesmo e-mail no mesmo dia: já está na fila; não duplica a linha nem o e-mail ao fundador.
    if ((byEmail.count ?? 0) >= AGENCY_APPLY_MAX_PER_EMAIL_DAY) return reply({ ok: true })

    const userAgent = (req.headers.get('user-agent') ?? '').slice(0, 300) || null
    const source = (req.headers.get('referer') ?? '').slice(0, 120) || null
    const { data: inserted, error: insertError } = await db
      .from(AGENCY_APPLICATIONS_TABLE)
      .insert({ ...app, ip_hash: ipHash, user_agent: userAgent, source })
      .select('id')
      .single()
    if (insertError || !inserted?.id) {
      if (insertError?.code === '42P01' || insertError?.code === 'PGRST205') return reply({ ok: false, error: 'applications_unavailable' }, 503)
      console.error('[agencies/apply] insert falhou:', insertError?.code)
      return reply({ ok: false, error: 'unavailable' }, 503)
    }

    // Aviso ao fundador com teto de tempo; a inscrição já está gravada, então falha de aviso não vira erro para a agência.
    const { subject, text } = agencyApplicationAlert(app)
    let timer: ReturnType<typeof setTimeout> | null = null
    const timeout = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), NOTIFY_TIMEOUT_MS) })
    try {
      const res = await Promise.race([notifyFounder(subject, text), timeout])
      if (res !== 'timeout' && res.delivered) {
        await db.from(AGENCY_APPLICATIONS_TABLE).update({ notified_at: new Date().toISOString() }).eq('id', inserted.id)
      } else {
        console.error('[agencies/apply] aviso ao fundador não confirmado:', res === 'timeout' ? 'timeout' : 'failed')
      }
    } catch (e) {
      console.error('[agencies/apply] aviso lançou:', e instanceof Error ? e.message : String(e))
    } finally {
      if (timer) clearTimeout(timer)
    }
    return reply({ ok: true })
  } catch (e) {
    console.error('[agencies/apply] inesperado:', e instanceof Error ? e.message : String(e))
    return reply({ ok: false, error: 'unavailable' }, 503)
  }
}
