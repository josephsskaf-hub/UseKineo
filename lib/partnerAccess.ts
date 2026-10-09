// KINEO-PARCEIRO-ABRE-TUDO-2026-10-09 — o PARCEIRO ATIVO usa TUDO dentro dos créditos que demos (fundador, 09/10, por voz:
// "pode abrir tudo para ele fazer o que ele quiser dentro").
//
// O BURACO (08 e 09/10): a cortesia (creator_trial/studio_trial, lib/courtesy.ts) conta como NÃO pagante — por desenho, para
// ficar fora de MRR e de "pagantes" — e as duas portas que pedem plano pago liam essa mesma régua: o Seedance 2.5 (filme e
// clipe, lib/s25Access.ts) e o Studio Ads (lib/ads/access.ts). Alan, parceiro com cortesia até 22/10, abriu o /clips em 08 e
// 09/10, viu o 2.5 trancado e saiu as duas vezes.
//
// QUEM É PARCEIRO ATIVO — as três coisas juntas:
//   1. profiles.plan é um nível de cortesia (COURTESY_LEVELS) — só então este módulo lê alguma coisa: pagante e conta grátis
//      não pagam leitura nenhuma;
//   2. cortesia ATIVA em courtesy_grants: status 'active', ends_at no futuro (isCourtesyActive) e level = o plano do perfil
//      (quem assinou no meio tem outro plano e entra pela régua de pagante);
//   3. linha em `affiliates` do mesmo user_id com status 'active'. Cortesia sem afiliado ativo segue trancada.
//
// O QUE NÃO MUDA: crédito, preço, débito e a régua de "quem paga" (isPayingPlan, MRR, pagantes). O teto em dólar é o próprio
// saldo da cortesia — o 2.5 e o Studio Ads debitam video_credits como para qualquer assinante.
//
// SÓ SERVIDOR: chave de serviço (footageAdminClient, a mesma de lib/ads/serverAccess.ts) — courtesy_grants tem RLS sem
// política e affiliates só é lido pelo servidor. FALHA FECHADA: erro de leitura, linha repetida, exceção, env faltando ou
// tempo estourado (PARTNER_READ_TIMEOUT_MS) = 'unknown' = NÃO é parceiro. Quem precisa de prova positiva de que a conta NÃO
// é parceira (a oferta da parede do Studio Ads, app/ads/page.tsx) distingue 'not_partner' de 'unknown'.
// Guardião: scripts/test-parceiro-abre-tudo-2026-10-09.mjs (executa este módulo com banco falso).
import type { SupabaseClient } from '@supabase/supabase-js'
import { footageAdminClient } from '@/lib/userFootage'
import { isCourtesyActive, isCourtesyLevel } from '@/lib/courtesy'

export type PartnerStatus = 'partner' | 'not_partner' | 'unknown'

/** Teto das duas leituras juntas. Passou disto = 'unknown' (não é parceiro). */
export const PARTNER_READ_TIMEOUT_MS = 2500

const norm = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '')

/** O plano pede a leitura de parceiro? Só nível de cortesia (creator_trial/studio_trial). */
export function partnerReadNeeded(plan: string | null | undefined): boolean {
  return isCourtesyLevel(norm(plan))
}

export interface PartnerGrantRow { level?: unknown; status?: unknown; ends_at?: unknown }
export interface PartnerAffiliateRow { status?: unknown }

/** Regra pura: com o que foi lido, a conta é parceiro ativo? */
export function partnerFromRows(input: {
  plan: string | null | undefined
  grant: PartnerGrantRow | null | undefined
  affiliate: PartnerAffiliateRow | null | undefined
  nowMs: number
}): boolean {
  const plan = norm(input.plan)
  if (!isCourtesyLevel(plan)) return false
  const g = input.grant
  if (!g || norm(g.level) !== plan) return false
  if (!isCourtesyActive({ status: typeof g.status === 'string' ? g.status : '', ends_at: typeof g.ends_at === 'string' ? g.ends_at : '' }, input.nowMs)) return false
  return input.affiliate?.status === 'active'
}

/**
 * 'partner' | 'not_partner' | 'unknown'. Plano fora da cortesia = 'not_partner' sem ler nada. `opts` existe para o guardião
 * (cliente falso, relógio, teto); a produção usa a chave de serviço, Date.now() e PARTNER_READ_TIMEOUT_MS.
 */
export async function readPartnerStatus(
  userId: string,
  plan: string | null | undefined,
  opts: { client?: Pick<SupabaseClient, 'from'>; nowMs?: number; timeoutMs?: number } = {},
): Promise<PartnerStatus> {
  if (!partnerReadNeeded(plan)) return 'not_partner'
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    if (typeof userId !== 'string' || !userId) return 'unknown'
    const client = opts.client ?? footageAdminClient()
    const leitura = Promise.all([
      client.from('courtesy_grants').select('level, status, ends_at').eq('user_id', userId).eq('status', 'active').maybeSingle(),
      client.from('affiliates').select('status').eq('user_id', userId).maybeSingle(),
    ])
    leitura.catch(() => undefined) // rejeição depois do teto não fica solta
    const estouro = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), opts.timeoutMs ?? PARTNER_READ_TIMEOUT_MS) })
    const lido = await Promise.race([leitura, estouro])
    if (lido === 'timeout') return 'unknown'
    const [grant, affiliate] = lido
    if (grant.error || affiliate.error) return 'unknown'
    const ativo = partnerFromRows({
      plan,
      grant: grant.data as PartnerGrantRow | null,
      affiliate: affiliate.data as PartnerAffiliateRow | null,
      nowMs: opts.nowMs ?? Date.now(),
    })
    return ativo ? 'partner' : 'not_partner'
  } catch {
    return 'unknown'
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/** Parceiro ativo? Falha fechada: 'unknown' = false. */
export async function isActivePartner(userId: string, plan: string | null | undefined): Promise<boolean> {
  return (await readPartnerStatus(userId, plan)) === 'partner'
}
