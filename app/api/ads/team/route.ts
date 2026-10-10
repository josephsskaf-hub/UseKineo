// KINEO-EQUIPE-BUSINESS-2026-10-10 — a EQUIPE do plano Business (lib/ads/team.ts, lib/ads/workspace.ts).
//
// GET  → quem eu sou no Studio Ads (dono/membro), o saldo do WORKSPACE (o do dono — a tela do Ads relê daqui quando a pessoa
//        é membro) e, para o dono, a lista da equipe (convites pendentes e membros ativos).
// POST → { action: 'invite', email }    dono com plano 'business' AGORA: cria o convite e devolve o link UMA vez (o banco
//                                       só guarda o hash). Teto: BUSINESS_SEATS vivos (pendentes + ativos), atômico no banco.
//        { action: 'revoke', invite_id } dono: cancela um convite pendente.
//        { action: 'remove', row_id }    dono: tira um membro ativo (o acesso cai na próxima requisição dele).
//        { action: 'leave' }             membro: sai da equipe.
//        { action: 'accept', token }     a conta logada aceita o convite: assinatura + validade + dono do token = dono da
//                                       linha + hash igual + pendente + MESMO e-mail verificado + dono ainda 'business' +
//                                       a própria conta não é 'business'. Uso único: UPDATE condicional pending → active.
// NADA AQUI manda e-mail (não há modelo transacional ainda — o dono copia o link), cobra crédito ou toca em pedido.
// Tabela ausente (migration não aplicada) = 503 'not_ready' nas escritas e GET com team_ready:false.
import { NextRequest } from 'next/server'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { footageAdminClient } from '@/lib/userFootage'
import { writeServerEvent } from '@/lib/serverEvents'
import { isMissingAdsTable, loadAdsAccess } from '@/lib/ads/serverAccess'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'
import {
  ADS_TEAM_EVENTS,
  ADS_TEAM_INVITE_DAYS,
  ADS_TEAM_JOIN_PATH,
  ADS_TEAM_TABLE,
  BUSINESS_SEATS,
  inviteExpired,
  isTeamOwnerPlan,
  nextFreeSeat,
  normalizeTeamEmail,
} from '@/lib/ads/team'
import { loadAdsWorkspaceBalance, loadAdsWorkspaceLabel } from '@/lib/ads/workspace'
import { signTeamInviteToken, teamTokenHash, verifyTeamInviteToken } from '@/lib/ads/teamInvite'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const PATH = '/api/ads/team'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TEAM_COLS = 'id, owner_id, email, seat, status, member_id, expires_at, created_at, accepted_at'

interface TeamRow {
  id: string
  owner_id: string
  email: string
  seat: number
  status: string
  member_id: string | null
  expires_at: string
  created_at: string
  accepted_at: string | null
  token_hash?: string | null
}

type Admin = ReturnType<typeof footageAdminClient>

async function ownPlan(admin: Admin, userId: string): Promise<{ plan: string | null; error: boolean }> {
  const { data, error } = await admin.from('profiles').select('id, plan').eq('id', userId).maybeSingle()
  if (error) return { plan: null, error: true }
  const plan = (data as { plan?: unknown } | null)?.plan
  return { plan: typeof plan === 'string' ? plan : null, error: false }
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const ws = await loadAdsAccess(user.id, user.email, { workspace: true })
    const admin = ws.admin
    const credits = await loadAdsWorkspaceBalance(admin, ws.ownerId)
    if (ws.role === 'member') {
      return v2Json({ role: 'member', owner_label: await loadAdsWorkspaceLabel(admin, ws.ownerId), credits, seats: BUSINESS_SEATS, team_ready: true })
    }
    const business = isTeamOwnerPlan(ws.ownerPlan)
    const { data, error } = await admin.from(ADS_TEAM_TABLE).select(TEAM_COLS).eq('owner_id', user.id).in('status', ['pending', 'active']).order('seat', { ascending: true })
    if (error) {
      if (isMissingAdsTable(error.code)) return v2Json({ role: 'owner', business, credits, seats: BUSINESS_SEATS, team: [], team_ready: false })
      return v2Fail('team_failed', 502)
    }
    const now = new Date()
    const team = ((data ?? []) as TeamRow[]).map((r) => ({
      id: r.id,
      email: r.email,
      seat: r.seat,
      status: r.status === 'pending' && inviteExpired(r.expires_at, now) ? 'expired' : r.status,
      member_id: r.member_id,
      expires_at: r.expires_at,
      accepted_at: r.accepted_at,
    }))
    return v2Json({ role: 'owner', business, credits, seats: BUSINESS_SEATS, team, team_ready: true })
  } catch (e) {
    console.warn('[ads/team GET] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('team_failed', 502)
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const action = typeof body?.action === 'string' ? body.action : ''
    const admin = footageAdminClient()

    // ── convidar (só o dono do Business) ─────────────────────────────────────────────────────────────────────────
    if (action === 'invite') {
      const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!secret) return v2Fail('unavailable', 503)
      const own = await ownPlan(admin, user.id)
      if (own.error) return v2Fail('team_failed', 502)
      if (!isTeamOwnerPlan(own.plan)) return v2Fail('business_only', 403)
      const email = normalizeTeamEmail(body?.email)
      if (!email) return v2Fail('bad_email', 400)
      if (email === normalizeTeamEmail(user.email)) return v2Fail('own_email', 400)
      // Convite pendente vencido libera a vaga antes da conta.
      const nowIso = new Date().toISOString()
      const exp = await admin.from(ADS_TEAM_TABLE).update({ status: 'expired', token_hash: null, ended_at: nowIso }).eq('owner_id', user.id).eq('status', 'pending').lt('expires_at', nowIso)
      if (exp.error) return isMissingAdsTable(exp.error.code) ? v2Fail('not_ready', 503) : v2Fail('team_failed', 502)
      const live = await admin.from(ADS_TEAM_TABLE).select('id, email, seat, status').eq('owner_id', user.id).in('status', ['pending', 'active'])
      if (live.error) return isMissingAdsTable(live.error.code) ? v2Fail('not_ready', 503) : v2Fail('team_failed', 502)
      const rows = (live.data ?? []) as { email: string; seat: number }[]
      if (rows.some((r) => r.email === email)) return v2Fail('already_invited', 409)
      const seat = rows.length >= BUSINESS_SEATS ? null : nextFreeSeat(rows.map((r) => r.seat))
      if (seat === null) return v2Fail('seats_full', 409, { seats: BUSINESS_SEATS })
      const id = randomUUID()
      const expiresAtSeconds = Math.floor(Date.now() / 1000) + ADS_TEAM_INVITE_DAYS * 24 * 3600
      const token = signTeamInviteToken({ inviteId: id, ownerId: user.id, expiresAtSeconds, secret })
      const ins = await admin.from(ADS_TEAM_TABLE).insert({
        id,
        owner_id: user.id,
        email,
        seat,
        status: 'pending',
        token_hash: teamTokenHash(token),
        expires_at: new Date(expiresAtSeconds * 1000).toISOString(),
      })
      // 23505 = outra aba pegou a mesma vaga / o mesmo e-mail no mesmo instante (o índice do banco é o teto de verdade).
      if (ins.error) return ins.error.code === '23505' ? v2Fail('seats_full', 409, { seats: BUSINESS_SEATS }) : isMissingAdsTable(ins.error.code) ? v2Fail('not_ready', 503) : v2Fail('team_failed', 502)
      await writeServerEvent({ name: ADS_TEAM_EVENTS.inviteCreated, userId: user.id, path: PATH, metadata: { invite_id: id, seat, email_domain: email.split('@')[1] ?? null, expires_at: new Date(expiresAtSeconds * 1000).toISOString() } })
      // TODO(KINEO-EQUIPE-BUSINESS-2026-10-10): e-mail transacional do convite. Hoje o dono copia o link (mostrado UMA vez).
      return v2Json({ invite_id: id, seat, email, path: `${ADS_TEAM_JOIN_PATH}?token=${encodeURIComponent(token)}`, expires_at: new Date(expiresAtSeconds * 1000).toISOString() }, 201)
    }

    // ── cancelar convite pendente (dono) ─────────────────────────────────────────────────────────────────────────
    if (action === 'revoke') {
      const inviteId = typeof body?.invite_id === 'string' ? body.invite_id.toLowerCase() : ''
      if (!UUID_RE.test(inviteId)) return v2Fail('bad_invite_id', 400)
      const upd = await admin.from(ADS_TEAM_TABLE).update({ status: 'revoked', token_hash: null, ended_at: new Date().toISOString() }).eq('id', inviteId).eq('owner_id', user.id).eq('status', 'pending').select('id').maybeSingle()
      if (upd.error) return isMissingAdsTable(upd.error.code) ? v2Fail('not_ready', 503) : v2Fail('team_failed', 502)
      if (!upd.data) return v2Fail('invite_not_found', 404)
      return v2Json({ ok: true })
    }

    // ── tirar um membro (dono; vale mesmo depois de o plano cair) ────────────────────────────────────────────────
    if (action === 'remove') {
      const rowId = typeof body?.row_id === 'string' ? body.row_id.toLowerCase() : ''
      if (!UUID_RE.test(rowId)) return v2Fail('bad_member_id', 400)
      const upd = await admin.from(ADS_TEAM_TABLE).update({ status: 'removed', ended_at: new Date().toISOString() }).eq('id', rowId).eq('owner_id', user.id).eq('status', 'active').select('id, member_id').maybeSingle()
      if (upd.error) return isMissingAdsTable(upd.error.code) ? v2Fail('not_ready', 503) : v2Fail('team_failed', 502)
      if (!upd.data) return v2Fail('member_not_found', 404)
      await writeServerEvent({ name: ADS_TEAM_EVENTS.memberRemoved, userId: user.id, path: PATH, metadata: { row_id: rowId, member_id: (upd.data as { member_id: string | null }).member_id, by: 'owner' } })
      return v2Json({ ok: true })
    }

    // ── sair da equipe (membro) ──────────────────────────────────────────────────────────────────────────────────
    if (action === 'leave') {
      const upd = await admin.from(ADS_TEAM_TABLE).update({ status: 'left', ended_at: new Date().toISOString() }).eq('member_id', user.id).eq('status', 'active').select('id, owner_id').maybeSingle()
      if (upd.error) return isMissingAdsTable(upd.error.code) ? v2Fail('not_ready', 503) : v2Fail('team_failed', 502)
      if (!upd.data) return v2Fail('not_in_team', 404)
      const row = upd.data as { id: string; owner_id: string }
      await writeServerEvent({ name: ADS_TEAM_EVENTS.memberRemoved, userId: row.owner_id, path: PATH, metadata: { row_id: row.id, member_id: user.id, by: 'member' } })
      return v2Json({ ok: true })
    }

    // ── aceitar o convite (a conta logada) ───────────────────────────────────────────────────────────────────────
    if (action === 'accept') {
      const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!secret) return v2Fail('unavailable', 503)
      const token = typeof body?.token === 'string' ? body.token.trim() : ''
      const check = verifyTeamInviteToken(token, { secret, nowSeconds: Math.floor(Date.now() / 1000) })
      if (!check.ok) return v2Fail(check.reason === 'expired' ? 'invite_expired' : 'invite_invalid', check.reason === 'expired' ? 410 : 400)
      if (check.ownerId === user.id) return v2Fail('own_team', 400)
      const inv = await admin.from(ADS_TEAM_TABLE).select(`${TEAM_COLS}, token_hash`).eq('id', check.inviteId).eq('owner_id', check.ownerId).maybeSingle()
      if (inv.error) return isMissingAdsTable(inv.error.code) ? v2Fail('not_ready', 503) : v2Fail('team_failed', 502)
      const row = inv.data as TeamRow | null
      const hash = teamTokenHash(token)
      // O token tem de ser O DESTE convite (hash igual), do MESMO dono, ainda pendente e no prazo.
      if (!row || row.status !== 'pending' || !row.token_hash || !sameHash(row.token_hash, hash) || inviteExpired(row.expires_at)) return v2Fail('invite_invalid', 410)
      const mine = normalizeTeamEmail(user.email)
      if (!mine || mine !== row.email) return v2Fail('email_mismatch', 403, { invited: row.email.replace(/^(.).*(@.*)$/, '$1…$2') })
      const ownerPlan = await ownPlan(admin, check.ownerId)
      if (ownerPlan.error) return v2Fail('team_failed', 502)
      if (!isTeamOwnerPlan(ownerPlan.plan)) return v2Fail('owner_not_business', 409)
      const me = await ownPlan(admin, user.id)
      if (me.error) return v2Fail('team_failed', 502)
      // Quem já é dono de um Business usa o próprio workspace (o resolvedor nunca o trataria como membro).
      if (isTeamOwnerPlan(me.plan)) return v2Fail('you_are_business', 409)
      const nowIso = new Date().toISOString()
      const upd = await admin
        .from(ADS_TEAM_TABLE)
        .update({ status: 'active', member_id: user.id, accepted_at: nowIso, token_hash: null })
        .eq('id', row.id)
        .eq('owner_id', check.ownerId)
        .eq('status', 'pending')
        .eq('token_hash', hash)
        .gt('expires_at', nowIso)
        .select('id')
        .maybeSingle()
      // 23505 = esta conta já é membro ativo de outra equipe (índice ads_team_members_one_team).
      if (upd.error) return upd.error.code === '23505' ? v2Fail('already_in_team', 409) : v2Fail('team_failed', 502)
      if (!upd.data) return v2Fail('invite_invalid', 410)
      await writeServerEvent({ name: ADS_TEAM_EVENTS.memberJoined, userId: check.ownerId, path: PATH, metadata: { invite_id: row.id, member_id: user.id, seat: row.seat } })
      return v2Json({ ok: true, owner_label: await loadAdsWorkspaceLabel(admin, check.ownerId) })
    }

    return v2Fail('bad_action', 400)
  } catch (e) {
    console.warn('[ads/team POST] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('team_failed', 502)
  }
}
