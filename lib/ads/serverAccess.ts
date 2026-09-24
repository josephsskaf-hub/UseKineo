// KINEO-STUDIO-ADS-2026-09-25 — leitura do acesso ao Studio Ads NO SERVIDOR (chave de serviço), compartilhada pelas
// rotas /api/ads/*. Só chamar DEPOIS de conferir o dono com getUser, passando o e-mail VERIFICADO dele.
// Decide com lib/ads/access.ts (puro): passe > assinante > interna; trial e free fora. Sem a coluna do passe
// (migration não aplicada, 42703) decide sem ela. Erro de leitura = 'none' (falha fechada).
// KINEO-STUDIO-ADS-REVISAO-2026-09-24 — `adsGate` junta acesso e interruptor: desligado (NEXT_PUBLIC_ADS_PASS_LIVE
// !== '1') só a conta interna passa, como no checkout. "Desligado" quer dizer desligado.
import { footageAdminClient } from '@/lib/userFootage'
import { adsAccessReason, ADS_ACCESS_SELECT, type AdsAccessFields, type AdsAccessReason } from '@/lib/ads/access'
import { adsPassLive } from '@/lib/ads/offer'

export async function loadAdsAccess(userId: string, authEmail: string | null | undefined): Promise<{ admin: ReturnType<typeof footageAdminClient>; reason: AdsAccessReason }> {
  const admin = footageAdminClient()
  const withColumn = await admin.from('profiles').select(ADS_ACCESS_SELECT).eq('id', userId).maybeSingle()
  if (!withColumn.error) return { admin, reason: adsAccessReason(withColumn.data as AdsAccessFields | null, authEmail) }
  if (withColumn.error.code === '42703') {
    const without = await admin.from('profiles').select('id, plan').eq('id', userId).maybeSingle()
    return { admin, reason: without.error ? 'none' : adsAccessReason((without.data as AdsAccessFields | null) ?? null, authEmail) }
  }
  return { admin, reason: 'none' }
}

/** O que a rota deve fazer: 'ok', 'no_access' (403 com botão do passe) ou 'closed' (desligado; 403 "opens soon"). */
export function adsGate(reason: AdsAccessReason): 'ok' | 'no_access' | 'closed' {
  if (reason === 'none') return 'no_access'
  if (!adsPassLive() && reason !== 'internal') return 'closed'
  return 'ok'
}

export const isMissingAdsTable = (code: string | undefined) => code === '42P01' || code === 'PGRST205'
