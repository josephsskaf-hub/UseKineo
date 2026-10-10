// KINEO-EQUIPE-BUSINESS-2026-10-10 — o WORKSPACE do Studio Ads: em nome de QUEM a pessoa logada faz anúncio.
//
// UM RESOLVEDOR SÓ (resolveAdsWorkspace). Toda rota /api/ads/v2/*, /api/ads/brand-kit, a página /ads/v2, a porta /ads e o
// /api/footage (SÓ com purpose 'ads') perguntam por ele através de loadAdsAccess(user.id, user.email, { workspace: true })
// (lib/ads/serverAccess.ts). A resposta:
//   · { role: 'owner', ownerId: user.id }  — toda conta sem equipe (e todo dono). Nada muda para ela.
//   · { role: 'member', ownerId: <dono> }  — membro ATIVO de uma equipe cujo dono TEM plano 'business' AGORA.
// Membro age DENTRO do workspace do dono: pedido nasce com user_id = dono (created_by = membro), cobrança (chargeAdsV2)
// sai do saldo do dono, a entrega cai na biblioteca do dono e o kit da marca é o do dono. O papel é relido a cada
// requisição: caiu o plano do dono, o membro volta a ser só ele mesmo (sem acesso, se for free) na próxima chamada.
//
// FALHA FECHADA PARA O LADO PESSOAL: tabela ausente (migration não aplicada), erro de leitura, dono sem 'business', duas
// equipes ativas (o índice não deixa) = a conta pessoal. O resolvedor NUNCA dá mais do que a conta já tinha por si.
// A própria conta 'business' é sempre dona do próprio workspace (um dono de Business nunca vira membro de outro).
//
// O TOKEN do link do convite mora em lib/ads/teamInvite.ts (node:crypto fica FORA deste módulo, que lib/ads/serverAccess.ts
// importa em toda rota do Ads).
import type { SupabaseClient } from '@supabase/supabase-js'
import { ADS_TEAM_TABLE, isTeamOwnerPlan, type AdsWorkspaceRole } from '@/lib/ads/team'

export interface AdsWorkspace {
  /** A conta que paga, guarda e é dona dos pedidos (o dono do Business, ou a própria pessoa). */
  ownerId: string
  /** Quem está clicando (sempre o user.id da sessão). */
  actorId: string
  role: AdsWorkspaceRole
  /** Plano do dono efetivo (para membro: sempre 'business'). null = não lido. */
  ownerPlan: string | null
}

export function personalWorkspace(userId: string, plan: unknown = null): AdsWorkspace {
  return { ownerId: userId, actorId: userId, role: 'owner', ownerPlan: typeof plan === 'string' ? plan : null }
}

/**
 * O resolvedor. `ownPlan` = o plano da própria conta (já lido por quem chama). Lê a equipe ativa da pessoa e o plano do
 * dono — duas leituras, só para quem não é 'business'. Qualquer dúvida = conta pessoal.
 */
export async function resolveAdsWorkspace(admin: SupabaseClient, userId: string, ownPlan: unknown): Promise<AdsWorkspace> {
  const personal = personalWorkspace(userId, ownPlan)
  if (isTeamOwnerPlan(ownPlan)) return personal
  try {
    const m = await admin.from(ADS_TEAM_TABLE).select('owner_id').eq('member_id', userId).eq('status', 'active').limit(2)
    if (m.error || !Array.isArray(m.data) || m.data.length !== 1) return personal
    const ownerId = String((m.data[0] as { owner_id?: unknown }).owner_id ?? '')
    if (!ownerId || ownerId === userId) return personal
    const o = await admin.from('profiles').select('id, plan').eq('id', ownerId).maybeSingle()
    const plan = (o.data as { plan?: unknown } | null)?.plan
    if (o.error || !isTeamOwnerPlan(plan)) return personal
    return { ownerId, actorId: userId, role: 'member', ownerPlan: String(plan) }
  } catch {
    return personal
  }
}

/** Nome que o membro vê no aviso ("Working in X's workspace"): o negócio do kit da marca do dono, senão o e-mail dele. */
export async function loadAdsWorkspaceLabel(admin: SupabaseClient, ownerId: string): Promise<string | null> {
  try {
    const kit = await admin.from('ads_brand_kits').select('business').eq('user_id', ownerId).maybeSingle()
    const business = (kit.data as { business?: unknown } | null)?.business
    if (!kit.error && typeof business === 'string' && business.trim()) return business.trim().slice(0, 60)
  } catch {
    // sem kit: cai no e-mail
  }
  try {
    const p = await admin.from('profiles').select('email').eq('id', ownerId).maybeSingle()
    const email = (p.data as { email?: unknown } | null)?.email
    return !p.error && typeof email === 'string' && email.trim() ? email.trim().slice(0, 80) : null
  } catch {
    return null
  }
}

/** Saldo do workspace (o do DONO). null = não deu para ler ("não sei", nunca 0). */
export async function loadAdsWorkspaceBalance(admin: SupabaseClient, ownerId: string): Promise<number | null> {
  try {
    const prof = await admin.from('profiles').select('video_credits').eq('id', ownerId).maybeSingle()
    const n = Number((prof.data as { video_credits?: unknown } | null)?.video_credits)
    return !prof.error && prof.data && Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/** Campos de auditoria do que o MEMBRO cria (pedido, arquivo). Dono = nada (a coluna só é tocada quando há membro). */
export function createdByFields(ws: { role: AdsWorkspaceRole; actorId: string }): { created_by?: string } {
  return ws.role === 'member' ? { created_by: ws.actorId } : {}
}
