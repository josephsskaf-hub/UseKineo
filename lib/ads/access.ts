// KINEO-STUDIO-ADS-2026-09-25 — quem pode entrar no Studio Ads (decisões 2 e 3 do fundador, 24/09).
//
// TRÊS PORTAS, NENHUMA A MAIS:
//   'pass'     → comprou o passe: profiles.ads_access_until no futuro (escrita SÓ pelo webhook, Path A).
//   'paying'   → assinante pago (Starter/Creator/Studio) entra sem passe — decisão 3 ("sim").
//   'internal' → contas da casa, para o canário e a operação.
// Trial e free NÃO entram (decisão 3: "trial não"). O predicado de pagante é o do cobrador
// (isPayingProfile, lib/reverseTrial) — memória "predicado do cobrador não se redigita".
// Nunca `!isSubscriber`: predicado largo negado falha ABERTA quando a leitura do perfil falha
// (memória "predicado largo negado falha aberta"). Aqui, leitura ausente = 'none'.
import { isPayingProfile, type PayingProfileFields } from '@/lib/reverseTrial'
import { isInternalEmail } from '@/lib/internalAccounts'
import { ADS_ACCESS_COLUMN } from '@/lib/ads/offer'

export interface AdsAccessFields extends PayingProfileFields {
  /** profiles.ads_access_until — ISO string ou Date; null = nunca comprou o passe. */
  ads_access_until?: string | Date | null
  email?: string | null
}

export type AdsAccessReason = 'pass' | 'paying' | 'internal' | 'none'

function passUntil(row: AdsAccessFields): Date | null {
  const raw = row[ADS_ACCESS_COLUMN]
  if (!raw) return null
  const d = raw instanceof Date ? raw : new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Por que esta conta entra (ou 'none'). A ordem importa para o evento: passe > pagante > interna. */
export function adsAccessReason(row: AdsAccessFields | null | undefined, now: Date = new Date()): AdsAccessReason {
  if (!row) return 'none'
  const until = passUntil(row)
  if (until && until.getTime() > now.getTime()) return 'pass'
  if (isPayingProfile(row)) return 'paying'
  if (isInternalEmail(row.email)) return 'internal'
  return 'none'
}

export function hasAdsAccess(row: AdsAccessFields | null | undefined, now: Date = new Date()): boolean {
  return adsAccessReason(row, now) !== 'none'
}

/** Colunas que toda rota /api/ads/* seleciona do perfil antes de decidir. */
export const ADS_ACCESS_SELECT = `id, email, plan, has_paid, ${ADS_ACCESS_COLUMN}` as const
