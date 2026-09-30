// KINEO-ADS-3-VARIACOES-2026-09-30 — quem VÊ e USA as "3 variações" do anúncio v2.
//
// Mesmo padrão de lib/ads/v2Access.ts: com ADS_VARIACOES_PUBLIC = false, só as contas da casa pela lista EXATA de
// isAdsInternalEmail (sem apelido). Chamar SEMPRE com o e-mail VERIFICADO do auth (getUser). A rota
// /api/ads/v2/variations responde 404 'not_found' com isto ANTES de qualquer débito; a página só mostra a opção a quem
// passa aqui. O acesso ao Studio Ads (adsGate) e ao v2 (adsV2Visible) continuam sendo conferidos antes.
import { isAdsInternalEmail } from '@/lib/ads/access'
import { ADS_VARIACOES_PUBLIC, adsVariationsVisibleFor } from '@/lib/ads/v2Variations'

export function adsVariationsVisible(email: string | null | undefined): boolean {
  return adsVariationsVisibleFor(ADS_VARIACOES_PUBLIC, isAdsInternalEmail(email))
}
