// KINEO-ADS-POS-ENTREGA-1510 — a vista PÚBLICA de uma aprovação (sem login): POST { token } → { brand, video_url, status, lang, decided }.
// O token vem no FRAGMENTO do link (/approve#<token>): não vai para log de servidor, Referer nem rota de página. A resposta tem a
// lista FECHADA de chaves de lib/ads/v2PostDelivery.ts (ADS_V2_APPROVAL_PUBLIC_KEYS): nada de conta, e-mail, pedido ou preço.
import { NextRequest } from 'next/server'
import { footageAdminClient } from '@/lib/userFootage'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'
import { openApproval } from '@/lib/ads/v2PostDeliveryServer'
import { posErr } from '@/lib/ads/v2PostDelivery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 20

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { token?: unknown } | null
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret) return v2Fail('unavailable', 503)
    const view = await openApproval(footageAdminClient(), body?.token, secret)
    if (!view) return v2Fail('not_found', 404)
    return v2Json(view)
  } catch (e) {
    console.warn('[ads/v2/approval/view] falhou:', posErr(e))
    return v2Fail('not_found', 404)
  }
}
