// KINEO-STUDIO-ADS-2026-09-25 — leitura do acesso ao Studio Ads NO SERVIDOR (chave de serviço), compartilhada pelas
// rotas /api/ads/*. Só chamar DEPOIS de conferir o dono com getUser. Decide com lib/ads/access.ts (puro):
// passe > pagante > interna; trial e free fora. Sem a coluna do passe (migration não aplicada, 42703) decide sem ela:
// pagante e interna seguem entrando, ninguém ganha acesso por engano. Erro de leitura = 'none' (falha fechada).
import { footageAdminClient } from '@/lib/userFootage'
import { adsAccessReason, ADS_ACCESS_SELECT, type AdsAccessFields, type AdsAccessReason } from '@/lib/ads/access'

export async function loadAdsAccess(userId: string): Promise<{ admin: ReturnType<typeof footageAdminClient>; reason: AdsAccessReason }> {
  const admin = footageAdminClient()
  const withColumn = await admin.from('profiles').select(ADS_ACCESS_SELECT).eq('id', userId).maybeSingle()
  if (!withColumn.error) return { admin, reason: adsAccessReason(withColumn.data as AdsAccessFields | null) }
  if (withColumn.error.code === '42703') {
    const without = await admin.from('profiles').select('id, email, plan, has_paid').eq('id', userId).maybeSingle()
    return { admin, reason: without.error ? 'none' : adsAccessReason((without.data as AdsAccessFields | null) ?? null) }
  }
  return { admin, reason: 'none' }
}

export const isMissingAdsTable = (code: string | undefined) => code === '42P01' || code === 'PGRST205'
