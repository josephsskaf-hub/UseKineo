// KINEO-LACOS-POST-TO-EARN-2026-10-02 — a fila de revisão do "Cole o link e ganhe" passa a ter porta de saída.
//
// lib/postToEarnGrant.ts põe em `pending` todo link colado sem prova automática de atribuição (sem
// YOUTUBE_API_KEY, ou sem o link de crédito na descrição) e a tela promete "um humano revisa em 24h"
// (POST_TO_EARN_PENDING_REVIEW_HOURS). Não existia rota nem tela para esse humano: medido em 02/10, 8 claims
// `pending` e 3 `granted` na história. É a mesma dívida do caso que criou /api/admin/grant-credits (#297):
// prometer o que o produto não sabe executar.
//
// Esta rota é SÓ a porta (a tela em app/admin é de outra sessão):
//   GET  ?status=pending|granted|rejected&page=0&limit=25 → lista paginada, mais antiga primeiro na fila pendente.
//   POST { claim_id, action: 'approve' | 'reject', reason? }
//     approve → update CONDICIONAL pending→granted (só uma requisição vence) ANTES de creditar; depois
//               add_video_credits (o mesmo RPC do motor); se o crédito falhar, o claim VOLTA para pending.
//               Rastro: admin_credits_granted (o mesmo padrão do grant-credits) + post_to_earn_claimed.
//     reject  → update condicional pending→rejected com o motivo (obrigatório). O índice único parcial libera o
//               vídeo para um novo claim, exatamente como a recusa automática.
// ⚠ O status de aprovado é 'granted' — a constraint post_to_earn_claims_status_check só aceita
//   granted/pending/rejected, e o motor já chama de 'granted' o claim pago.
// Guarda: a mesma das rotas irmãs (isAdminEmail + serviceClient de ../_shared/db).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { POST_TO_EARN_CREDITS } from '@/lib/postToEarn'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Mesmo motivo das outras rotas com GET (KINEO-DATA-CACHE-2026-09-02): sem isto o GET do supabase-js pode
// cair no Data Cache e a fila mostraria o estado de quando a URL foi pedida pela primeira vez.
export const fetchCache = 'force-no-store'

const STATUSES = ['pending', 'granted', 'rejected'] as const
type ClaimStatus = (typeof STATUSES)[number]
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// `ip` fica de fora de propósito: a revisão decide por vídeo, canal e motivo, não por endereço.
const CLAIM_COLUMNS =
  'id, user_id, youtube_video_id, credits, channel_title, status, source, verification, reason, created_at, granted_at, reviewed_at, reviewed_by, posted_short_id'

type ClaimRow = {
  id: string
  user_id: string
  youtube_video_id: string
  credits: number | null
  status: ClaimStatus
  reason: string | null
  verification: string | null
}

async function adminGate() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  const admin = serviceClient()
  if (!admin) return { error: NextResponse.json({ error: 'Service unavailable' }, { status: 503 }) }
  return { admin, reviewer: user.email ?? 'admin' }
}

export async function GET(req: Request) {
  try {
    const gate = await adminGate()
    if ('error' in gate) return gate.error
    const { admin } = gate

    const url = new URL(req.url)
    const rawStatus = (url.searchParams.get('status') ?? 'pending').toLowerCase()
    const status: ClaimStatus = (STATUSES as readonly string[]).includes(rawStatus) ? (rawStatus as ClaimStatus) : 'pending'
    const page = Math.max(0, Math.floor(Number(url.searchParams.get('page') ?? 0)) || 0)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT)) || DEFAULT_LIMIT))
    const from = page * limit

    // Fila pendente: a mais antiga primeiro (é a que mais estourou as 24h prometidas). Histórico: a mais nova primeiro.
    const { data, error, count } = await admin
      .from('post_to_earn_claims')
      .select(CLAIM_COLUMNS, { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: status === 'pending' })
      .order('id', { ascending: true })
      .range(from, from + limit - 1)
    if (error) throw error

    const claims = (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      watch_url: typeof row.youtube_video_id === 'string'
        ? `https://www.youtube.com/shorts/${encodeURIComponent(row.youtube_video_id)}`
        : null,
    }))
    const total = count ?? claims.length
    return NextResponse.json({
      ok: true,
      status,
      page,
      limit,
      total,
      has_more: from + claims.length < total,
      reward_credits: POST_TO_EARN_CREDITS,
      claims,
    })
  } catch (e) {
    console.error('[admin/post-to-earn GET] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Falhou ao ler a fila.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const gate = await adminGate()
    if ('error' in gate) return gate.error
    const { admin, reviewer } = gate

    const body = (await req.json().catch(() => ({}))) as { claim_id?: string; action?: string; reason?: string }
    const claimId = (body.claim_id ?? '').trim()
    const action = (body.action ?? '').trim().toLowerCase()
    const note = (body.reason ?? '').trim().slice(0, 500)
    if (!UUID.test(claimId)) return NextResponse.json({ error: 'claim_id inválido.' }, { status: 400 })
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: "action deve ser 'approve' ou 'reject'." }, { status: 400 })
    }
    if (action === 'reject' && note.length < 3) {
      return NextResponse.json({ error: 'Escreva o motivo da recusa — ele fica no claim.' }, { status: 400 })
    }

    const { data: found, error: findErr } = await admin
      .from('post_to_earn_claims')
      .select('id, user_id, youtube_video_id, credits, status, reason, verification')
      .eq('id', claimId)
      .maybeSingle()
    if (findErr) throw findErr
    const claim = found as ClaimRow | null
    if (!claim) return NextResponse.json({ error: 'Claim não encontrado.' }, { status: 404 })
    // Idempotência: só um claim `pending` muda de estado. Repetir o mesmo clique devolve o estado atual.
    if (claim.status !== 'pending') {
      return NextResponse.json({ ok: claim.status === (action === 'approve' ? 'granted' : 'rejected'), already: true, status: claim.status })
    }
    const now = new Date().toISOString()

    if (action === 'reject') {
      const { data: rows, error: rejErr } = await admin
        .from('post_to_earn_claims')
        .update({ status: 'rejected', reason: note, reviewed_at: now, reviewed_by: reviewer, credits: 0 })
        .eq('id', claimId)
        .eq('status', 'pending')
        .select('id')
      if (rejErr) throw rejErr
      if (!rows || rows.length === 0) return NextResponse.json({ ok: false, already: true, status: 'changed' }, { status: 409 })
      await admin.from('events').insert({
        user_id: claim.user_id,
        name: 'post_to_earn_rejected',
        metadata: { reason: 'admin_rejected', detail: note, claim_id: claimId, youtube_video_id: claim.youtube_video_id, reviewed_by: reviewer },
      }).then(() => undefined, (e: unknown) => console.error('[admin/post-to-earn] log da recusa falhou:', e))
      return NextResponse.json({ ok: true, status: 'rejected' })
    }

    // ── approve ─────────────────────────────────────────────────────────────
    // 1) A autorização é o update condicional: de duas abas aprovando juntas, só uma vê a linha voltar.
    const { data: won, error: winErr } = await admin
      .from('post_to_earn_claims')
      .update({
        status: 'granted',
        credits: POST_TO_EARN_CREDITS,
        granted_at: now,
        reviewed_at: now,
        reviewed_by: reviewer,
        verification: 'admin_review',
        ...(note ? { reason: note } : {}),
      })
      .eq('id', claimId)
      .eq('status', 'pending')
      .select('id')
    if (winErr) throw winErr
    if (!won || won.length === 0) return NextResponse.json({ ok: false, already: true, status: 'changed' }, { status: 409 })

    // 2) O crédito, pelo mesmo RPC do motor (lib/postToEarnGrant.ts) e dos webhooks de pagamento.
    const { error: creditErr } = await admin.rpc('add_video_credits', { p_user: claim.user_id, p_amount: POST_TO_EARN_CREDITS })
    if (creditErr) {
      // 3) Sem crédito, o claim volta para a fila — nunca fica `granted` sem ter pago.
      console.error('[admin/post-to-earn] crédito falhou, devolvendo o claim para pending:', creditErr.message)
      await admin
        .from('post_to_earn_claims')
        .update({ status: 'pending', credits: claim.credits ?? 0, granted_at: null, reviewed_at: null, reviewed_by: null, reason: claim.reason, verification: claim.verification })
        .eq('id', claimId)
        .eq('status', 'granted')
        .then(() => undefined, (e: unknown) => console.error('[admin/post-to-earn] reversão falhou:', e))
      return NextResponse.json({ error: 'O crédito falhou; o claim voltou para pending.' }, { status: 500 })
    }

    // 4) Rastro (best-effort: o crédito JÁ foi dado). admin_credits_granted no padrão do grant-credits, e
    //    post_to_earn_claimed para o programa contar a aprovação humana junto com as automáticas.
    await admin.from('events').insert([
      {
        user_id: claim.user_id,
        name: 'admin_credits_granted',
        metadata: {
          amount: POST_TO_EARN_CREDITS,
          reason: note ? `post_to_earn_review: ${note}` : 'post_to_earn_review',
          granted_by: reviewer,
          source: 'post_to_earn',
          claim_id: claimId,
          youtube_video_id: claim.youtube_video_id,
        },
      },
      {
        user_id: claim.user_id,
        name: 'post_to_earn_claimed',
        metadata: { credits: POST_TO_EARN_CREDITS, youtube_video_id: claim.youtube_video_id, verification: 'admin_review', claim_id: claimId },
      },
    ]).then(() => undefined, (e: unknown) => console.error('[admin/post-to-earn] log da aprovação falhou:', e))

    // Espelho legível no card do /wall, como o motor faz. Best-effort.
    try {
      await admin
        .from('posted_shorts')
        .update({ rewarded_at: now, reward_credits: POST_TO_EARN_CREDITS })
        .eq('user_id', claim.user_id)
        .eq('youtube_video_id', claim.youtube_video_id)
    } catch {
      /* non-blocking */
    }

    return NextResponse.json({ ok: true, status: 'granted', credits: POST_TO_EARN_CREDITS })
  } catch (e) {
    console.error('[admin/post-to-earn POST] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Falhou ao revisar o claim.' }, { status: 500 })
  }
}
