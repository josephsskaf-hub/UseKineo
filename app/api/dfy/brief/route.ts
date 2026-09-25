// KINEO-FLUXO-NOVO-2026-09-25 — o briefing de quem pagou Express/Pro (Kineo Empresas).
//
// GET  ?session_id=cs_…  → estado do pedido + formulário pré-preenchido com os 3 campos do Payment Link.
// POST { session_id, brief } → grava/sobrescreve o briefing (evento de servidor `dfy_brief_submitted`,
//                              id determinístico) e, na 1ª vez, avisa o fundador.
//
// QUEM AUTORIZA: SÓ a Stripe (checkout.sessions.retrieve), nunca a tabela `events`. O redirect do Payment
// Link pode chegar ANTES do webhook que grava dfy_order_paid; perguntar ao banco mandaria o comprador
// recém-pago para um "pedido não encontrado". A regra de "é pedido Empresas" é a MESMA do webhook
// (lib/growth/dfySession.ts). Sem login: quem paga pelo link pode não ter conta.
//
// O session_id na URL funciona como senha do pedido: a resposta é no-store, a página é noindex e
// no-referrer, o e-mail sai mascarado e cada sessão regrava no máximo DFY_BRIEF_MAX_EDITS vezes.
// Nada aqui concede crédito, plano ou has_paid.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { CHECKOUT_SESSION_PATTERN } from '@/lib/growth/verifiedCheckoutPurchase'
import { DFY_TIERS, type DfyTier } from '@/lib/growth/dfyOffer'
import { dfySessionTier, isDfyOrderSession } from '@/lib/growth/dfySession'
import {
  DFY_BRIEF_EVENT,
  DFY_BRIEF_MAX_EDITS,
  DFY_BRIEF_PATH,
  DFY_BRIEF_VERSION,
  briefEventId,
  maskEmail,
  missingBriefFields,
  prefillFromCustomFields,
  sanitizeBrief,
} from '@/lib/growth/dfyBrief'
import { alertFounderDfyBrief } from '@/lib/founderAlert'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const MAX_BODY_CHARS = 20_000

function reply(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

type Verified =
  | { ok: true; session: Stripe.Checkout.Session; tier: DfyTier | null }
  | { ok: false; state: 'invalid' | 'not_found' | 'pending' | 'unavailable'; status: number }

/**
 * A ÚNICA porta: a sessão existe na Stripe, é um pedido Empresas pela regra do webhook, está completa e paga.
 * Sessão que não é pedido Empresas responde igual a sessão inexistente (a rota não vira oráculo de checkout alheio).
 */
const HITS = new Map<string, { n: number; reset: number }>()
const HIT_WINDOW_MS = 10 * 60_000
const HIT_MAX = 40

/** Teto por IP (memória da instância): quem inventa ids em laço não gasta a cota de leitura da Stripe da conta. */
function overLimit(req: NextRequest): boolean {
  const ip = (req.headers?.get?.('x-forwarded-for') ?? '').split(',')[0].trim() || 'sem-ip'
  const now = Date.now()
  const h = HITS.get(ip)
  if (!h || h.reset < now) { HITS.set(ip, { n: 1, reset: now + HIT_WINDOW_MS }); return false }
  h.n++
  return h.n > HIT_MAX
}

async function verifyPaidDfySession(sessionId: string): Promise<Verified> {
  if (!CHECKOUT_SESSION_PATTERN.test(sessionId)) return { ok: false, state: 'invalid', status: 400 }
  if (!process.env.STRIPE_SECRET_KEY) return { ok: false, state: 'unavailable', status: 503 }
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {}, { timeout: 5_000, maxNetworkRetries: 0 })
  } catch (error) {
    // Sem corpo da Stripe, sem PII no log nem na resposta.
    const missing = error instanceof Error && 'code' in error && (error as { code?: unknown }).code === 'resource_missing'
    return missing ? { ok: false, state: 'not_found', status: 404 } : { ok: false, state: 'unavailable', status: 503 }
  }
  if (session.id !== sessionId || session.mode !== 'payment' || !isDfyOrderSession(session)) {
    return { ok: false, state: 'not_found', status: 404 }
  }
  if (session.status === 'expired') return { ok: false, state: 'not_found', status: 404 }
  // Meio lento (Pix/SEPA/boleto com Adaptive Pricing): a sessão fecha 'complete' e 'unpaid'. Só pago abre o formulário.
  if (session.status !== 'complete' || session.payment_status !== 'paid') return { ok: false, state: 'pending', status: 200 }
  return { ok: true, session, tier: dfySessionTier(session) }
}

type BriefRowMeta = { brief?: unknown; first_submitted_at?: unknown; updated_at?: unknown; edits?: unknown }

function tierInfo(tier: DfyTier | null) {
  const spec = tier ? DFY_TIERS[tier] : null
  return { tier, tier_name: spec?.name ?? null, hours: spec?.hours ?? null, revisions: spec?.revisions ?? null }
}

export async function GET(req: NextRequest) {
  if (overLimit(req)) return reply({ state: 'unavailable' }, 429)
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? ''
  const v = await verifyPaidDfySession(sessionId)
  if (!v.ok) return reply({ state: v.state }, v.status)

  // Leitura do briefing já enviado: é CONTEÚDO para reeditar, não autorização (essa veio da Stripe acima).
  let existing: BriefRowMeta | null = null
  const db = adminDb()
  if (db) {
    try {
      const { data } = await db.from('events').select('metadata').eq('id', briefEventId(sessionId)).maybeSingle()
      existing = ((data as { metadata?: BriefRowMeta } | null)?.metadata) ?? null
    } catch { existing = null }
  }
  const edits = typeof existing?.edits === 'number' ? existing.edits : 0
  return reply({
    state: 'ready',
    version: DFY_BRIEF_VERSION,
    ...tierInfo(v.tier),
    email: maskEmail(v.session.customer_details?.email ?? v.session.customer_email),
    prefill: prefillFromCustomFields(v.session.custom_fields),
    brief: existing?.brief ? sanitizeBrief(existing.brief) : null,
    submitted_at: typeof existing?.first_submitted_at === 'string' ? existing.first_submitted_at : null,
    edits_left: Math.max(0, DFY_BRIEF_MAX_EDITS - edits),
  })
}

export async function POST(req: NextRequest) {
  if (overLimit(req)) return reply({ state: 'unavailable' }, 429)
  const raw = await req.text().catch(() => '')
  if (raw.length > MAX_BODY_CHARS) return reply({ state: 'too_large' }, 413)
  let body: { session_id?: unknown; brief?: unknown } = {}
  try { body = JSON.parse(raw || '{}') } catch { return reply({ state: 'invalid' }, 400) }
  const sessionId = typeof body.session_id === 'string' ? body.session_id : ''

  // Stripe ANTES de qualquer escrita.
  const v = await verifyPaidDfySession(sessionId)
  if (!v.ok) return reply({ state: v.state }, v.status === 200 ? 409 : v.status)

  const brief = sanitizeBrief(body.brief)
  const missing = missingBriefFields(brief)
  if (missing.length) return reply({ state: 'incomplete', missing }, 400)

  const db = adminDb()
  if (!db) return reply({ state: 'unavailable' }, 503)
  const id = briefEventId(sessionId)
  let existing: BriefRowMeta | null = null
  try {
    const { data, error } = await db.from('events').select('metadata').eq('id', id).maybeSingle()
    if (error) return reply({ state: 'unavailable' }, 503)
    existing = ((data as { metadata?: BriefRowMeta } | null)?.metadata) ?? null
  } catch {
    return reply({ state: 'unavailable' }, 503)
  }
  const edits = (typeof existing?.edits === 'number' ? existing.edits : 0) + 1
  if (edits > DFY_BRIEF_MAX_EDITS) return reply({ state: 'too_many_edits' }, 429)

  const now = new Date().toISOString()
  const first = existing === null
  const firstSubmittedAt = typeof existing?.first_submitted_at === 'string' ? existing.first_submitted_at : now
  const email = v.session.customer_details?.email ?? v.session.customer_email ?? null
  // Id determinístico + upsert: reenviar SOBRESCREVE a mesma linha (o fundador lê sempre a última versão).
  const { error: writeError } = await db.from('events').upsert({
    id,
    name: DFY_BRIEF_EVENT,
    user_id: null,
    path: DFY_BRIEF_PATH,
    session_id: null,
    metadata: {
      source: 'dfy_brief_form',
      version: DFY_BRIEF_VERSION,
      stripe_session_id: sessionId,
      tier: v.tier,
      customer_email: email,
      brief,
      first_submitted_at: firstSubmittedAt,
      updated_at: now,
      edits,
    },
  }, { onConflict: 'id' })
  if (writeError) {
    console.error('[dfy brief] write failed:', writeError.code, writeError.message)
    return reply({ state: 'unavailable' }, 503)
  }

  // Só a 1ª gravação avisa; a reserva do alerta é 1×/sessão mesmo se duas abas enviarem juntas. Nunca lança.
  if (first) await alertFounderDfyBrief({ stripeSessionId: sessionId, tier: v.tier, email, brief })

  return reply({ state: 'saved', first, submitted_at: firstSubmittedAt, updated_at: now, edits_left: Math.max(0, DFY_BRIEF_MAX_EDITS - edits) })
}
