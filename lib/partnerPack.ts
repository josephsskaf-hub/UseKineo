// KINEO-PARTNERS-PACOTE-2026-10-03 — "Kineo Partners": o PACOTE DE DEMONSTRAÇÃO do parceiro, regra pura (sem imports).
//
// O parceiro (afiliado) precisa CRIAR com a Kineo para ter o que postar. O pacote chega pela conta cortesia
// (lib/courtesy.ts), em duas etapas:
//   etapa 1 — ao entrar no programa: PARTNER_PACK_STAGE1_CREDITS no nível PARTNER_PACK_LEVEL por PARTNER_PACK_DAYS;
//   etapa 2 — depois que ele registra no painel o link de 1 post PÚBLICO com o link/cupom dele e o admin APROVA com 1
//             clique (nada automático): +PARTNER_PACK_STAGE2_CREDITS.
// 1 pacote por afiliado (único no banco). Conta que já paga não recebe (cortesia nunca por cima de plano).
// Comissão e termos NÃO mudam aqui: taxa recorrente em AFFILIATE_COMMISSION_RATE (lib/affiliateCommission.ts; 40% desde 06/10).
//
// ⚠ PARTNER_PACK_LIVE = false: com ele desligado a entrada NÃO dá nada sozinha — é dinheiro (crédito de motor),
// decisão do fundador. Desligado, o admin ainda pode dar a etapa 1 a um parceiro escolhido, pela lista de parceiros.

export const PARTNER_PACK_LIVE = false
export const PARTNER_PACK_LEVEL = 'creator_trial' as const
export const PARTNER_PACK_STAGE1_CREDITS = 25
export const PARTNER_PACK_STAGE2_CREDITS = 25
export const PARTNER_PACK_DAYS = 30
export const PARTNER_PACK_TOTAL_CREDITS = PARTNER_PACK_STAGE1_CREDITS + PARTNER_PACK_STAGE2_CREDITS

export const PARTNER_PACK_STAGE1_REASON = 'Kineo Partners — pacote de demonstração (etapa 1, entrada no programa)'
export const PARTNER_PACK_STAGE2_REASON = 'Kineo Partners — pacote de demonstração (etapa 2, post público aprovado)'

export type PartnerPostStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface PartnerPackRow {
  id: string
  affiliate_id: string
  user_id: string
  courtesy_grant_id: string | null
  stage1_at: string | null
  post_url: string | null
  post_status: string
  post_submitted_at: string | null
  post_reviewed_at: string | null
  stage2_at: string | null
}

export type PartnerPackEligibility = { ok: true } | { ok: false; reason: 'already_has_pack' | 'account_pays' | 'affiliate_inactive' }

/** Conta sem plano (free/nulo) é a única que recebe o pacote — mesma régua da cortesia. */
function planless(plan: string | null | undefined): boolean {
  const p = (plan ?? '').toString().trim().toLowerCase()
  return p === '' || p === 'free'
}

export function partnerPackEligibility(input: {
  affiliateStatus: string | null | undefined
  plan: string | null | undefined
  existingPack: boolean
}): PartnerPackEligibility {
  if (input.existingPack) return { ok: false, reason: 'already_has_pack' }
  if (input.affiliateStatus !== 'active') return { ok: false, reason: 'affiliate_inactive' }
  if (!planless(input.plan)) return { ok: false, reason: 'account_pays' }
  return { ok: true }
}

/** Entrada no programa entrega a etapa 1 sozinha? Só com o interruptor ligado. */
export function shouldGrantPackOnApply(live: boolean = PARTNER_PACK_LIVE): boolean {
  return live === true
}

const BLOCKED_HOST = /(^|\.)(usekineo\.com|shortsforgeai\.com|shortsforgeai\.vercel\.app|localhost)$/i

/**
 * Link do post público. Só https, host público (nada de IP, localhost ou a nossa própria casa — o post é DELE, numa
 * rede/site dele), até 500 caracteres. Não visita o link: quem confere é o admin.
 */
export function normalizePartnerPostUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text || text.length > 500) return null
  let url: URL
  try { url = new URL(text) } catch { return null }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase()
  if (!host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || BLOCKED_HOST.test(host)) return null
  if (url.username || url.password) return null
  return url.toString()
}

/** O parceiro pode registrar (ou trocar) o link? Só depois da etapa 1 e enquanto não foi aprovado. */
export function canSubmitPartnerPost(pack: Pick<PartnerPackRow, 'stage1_at' | 'post_status'> | null): boolean {
  if (!pack || !pack.stage1_at) return false
  return pack.post_status === 'none' || pack.post_status === 'rejected' || pack.post_status === 'pending'
}

/** O admin pode aprovar? Só post pendente, etapa 1 feita, etapa 2 ainda não dada. */
export function canApprovePartnerPost(pack: Pick<PartnerPackRow, 'stage1_at' | 'post_status' | 'stage2_at' | 'post_url'> | null): boolean {
  return Boolean(pack && pack.stage1_at && !pack.stage2_at && pack.post_status === 'pending' && pack.post_url)
}

export type PartnerPackStage = 0 | 1 | 2

export function partnerPackStage(pack: Pick<PartnerPackRow, 'stage1_at' | 'stage2_at'> | null): PartnerPackStage {
  if (!pack || !pack.stage1_at) return 0
  return pack.stage2_at ? 2 : 1
}

/** Créditos usados desde a cortesia: soma dos débitos não estornados a partir do início dela. */
export function creditsUsedSince(debits: Array<{ amount: number | null; created_at: string | null; refunded_at: string | null }>, sinceIso: string | null): number {
  if (!sinceIso) return 0
  let used = 0
  for (const d of debits) {
    if (d.refunded_at || !d.created_at || d.created_at < sinceIso) continue
    used += Math.max(0, Number(d.amount) || 0)
  }
  return used
}

// ── Lista de parceiros do admin (pura: a rota só lê as tabelas e entrega aqui) ──
export interface PartnerListRow {
  affiliate_id: string
  code: string
  name: string | null
  email: string | null
  status: string
  joined_at: string | null
  plan: string | null
  pack_id: string | null
  stage: PartnerPackStage
  post_status: string
  post_url: string | null
  courtesy_ends_at: string | null
  credits_used: number
  referrals: number
  paying_referrals: number
  can_grant_stage1: boolean
  can_review_post: boolean
}

export function buildPartnerRows(input: {
  affiliates: Array<{ id: string; code: string; name: string | null; email: string | null; status: string; user_id: string | null; created_at: string | null }>
  packs: PartnerPackRow[]
  grants: Array<{ id: string; starts_at: string | null; ends_at: string | null; status: string }>
  profiles: Array<{ id: string; plan: string | null }>
  referrals: Array<{ affiliate_id: string; status: string | null }>
  debits: Array<{ user_id: string | null; amount: number | null; created_at: string | null; refunded_at: string | null }>
}): PartnerListRow[] {
  const packBy = new Map(input.packs.map((p) => [p.affiliate_id, p]))
  const grantBy = new Map(input.grants.map((g) => [g.id, g]))
  const planBy = new Map(input.profiles.map((p) => [p.id, p.plan]))
  const refs = new Map<string, { all: number; paid: number }>()
  for (const r of input.referrals) {
    const c = refs.get(r.affiliate_id) ?? { all: 0, paid: 0 }
    c.all += 1
    if (r.status === 'paid') c.paid += 1
    refs.set(r.affiliate_id, c)
  }
  const debitsBy = new Map<string, Array<{ amount: number | null; created_at: string | null; refunded_at: string | null }>>()
  for (const d of input.debits) {
    if (!d.user_id) continue
    const list = debitsBy.get(d.user_id) ?? []
    list.push(d)
    debitsBy.set(d.user_id, list)
  }
  return input.affiliates.map((a) => {
    const pack = packBy.get(a.id) ?? null
    const grant = pack?.courtesy_grant_id ? grantBy.get(pack.courtesy_grant_id) ?? null : null
    const plan = a.user_id ? planBy.get(a.user_id) ?? null : null
    const c = refs.get(a.id) ?? { all: 0, paid: 0 }
    return {
      affiliate_id: a.id,
      code: a.code,
      name: a.name,
      email: a.email,
      status: a.status,
      joined_at: a.created_at,
      plan,
      pack_id: pack?.id ?? null,
      stage: partnerPackStage(pack),
      post_status: pack?.post_status ?? 'none',
      post_url: pack?.post_url ?? null,
      courtesy_ends_at: grant && grant.status === 'active' ? grant.ends_at : null,
      credits_used: a.user_id ? creditsUsedSince(debitsBy.get(a.user_id) ?? [], pack?.stage1_at ?? null) : 0,
      referrals: c.all,
      paying_referrals: c.paid,
      can_grant_stage1: partnerPackEligibility({ affiliateStatus: a.status, plan, existingPack: Boolean(pack) }).ok,
      can_review_post: canApprovePartnerPost(pack),
    }
  })
}
