// KINEO-ADS-PRODUTO-NA-MAO-1610 — o interruptor do método "pessoa segurando o produto real" do lado SERVIDOR (lib/ads/v2Advance.ts o
// carrega por import DINÂMICO, só num plano novo). O /plan já só monta o plano novo para conta interna; isto confere de novo na hora
// de gastar (foto da cena): plano gravado quando o modo era outro, ou conta que deixou a lista = a vaga anima a FOTO REAL do produto.
// 'internal' = a lista EXATA das contas da casa (isAdsInternalEmail, a mesma da trava do produto); erro = desligado. Nada aqui cobra.
import { footageAdminClient } from '@/lib/userFootage'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { ADS_V2_IN_HAND_MODE, adsV2InHandOn } from '@/lib/ads/v2ProductInHand'

export async function adsV2InHandEnabled(userId: string): Promise<boolean> {
  if (ADS_V2_IN_HAND_MODE === 'all') return true
  if (ADS_V2_IN_HAND_MODE !== 'internal') return false
  try {
    const r = await footageAdminClient().auth.admin.getUserById(userId)
    return adsV2InHandOn(isAdsInternalEmail(r.data?.user?.email ?? null))
  } catch {
    return false
  }
}
