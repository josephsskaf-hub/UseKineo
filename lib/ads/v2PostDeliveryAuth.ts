// KINEO-ADS-POS-ENTREGA-1510 — as portas das rotas da agência depois da entrega (editar, versões, formatos, aprovação): a MESMA
// régua das rotas do anúncio v2 — login, acesso pago ao Studio Ads (adsGate 'ok'; a amostra grátis fica de fora: cada montagem
// custa Creatomate à casa), o v2 visível e o WORKSPACE (membro do Business age na conta do dono).
import { createClient } from '@/lib/supabase/server'
import { adsGate, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PosEntregaAuth = { ok: true; admin: SupabaseClient; uid: string; actorId: string } | { ok: false; error: string; status: number }

export async function posEntregaAuth(): Promise<PosEntregaAuth> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthenticated', status: 401 }
  const { admin, reason, ...ws } = await loadAdsAccess(user.id, user.email, { workspace: true })
  if (adsGate(reason) !== 'ok') return { ok: false, error: 'no_access', status: 403 }
  if (!adsV2Visible(user.email)) return { ok: false, error: 'v2_closed', status: 403 }
  return { ok: true, admin, uid: ws.ownerId ?? user.id, actorId: user.id }
}
