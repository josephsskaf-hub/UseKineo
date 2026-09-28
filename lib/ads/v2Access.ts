// KINEO-ADS-V2-2026-09-28 — quem VÊ e USA o anúncio v2 (etapa 2, servidor).
//
// Enquanto ADS_V2_PUBLIC = false (lib/ads/v2Tiers.ts), só as contas da casa pela lista EXATA de isAdsInternalEmail
// (lib/ads/access.ts — sem apelido, sem padrão LIKE). Chamar SEMPRE com o e-mail VERIFICADO do auth (getUser), nunca
// com profiles.email (editável pelo cliente). A rota /api/ads/v2/start responde 403 'v2_closed' com isto ANTES de
// qualquer débito; o acesso ao Studio Ads (passe/assinante/interna) continua sendo conferido antes por adsGate.
import { isAdsInternalEmail } from '@/lib/ads/access'
import { ADS_V2_PUBLIC } from '@/lib/ads/v2Tiers'

export function adsV2Visible(email: string | null | undefined): boolean {
  return ADS_V2_PUBLIC || isAdsInternalEmail(email)
}
