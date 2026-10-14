// KINEO-ADS-POS-ENTREGA-1510 — a DECISÃO do cliente da agência (sem login): POST { token, decision: 'approve' | 'changes', comment? }.
// O token assinado é a única credencial (lib/ads/v2ApprovalToken.ts): assinatura errada = 404 sem ler o banco; vencido, desligado
// ou já decidido = recusa. Uma decisão por link (UPDATE condicional pending → approved | changes_requested). A resposta não
// devolve nada da agência nem do pedido: só o novo estado.
import { NextRequest } from 'next/server'
import { footageAdminClient } from '@/lib/userFootage'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'
import { sanitizeApprovalDecision } from '@/lib/ads/v2PostDelivery'
import { decideApproval, isMissingPosEntregaTable } from '@/lib/ads/v2PostDeliveryServer'
import { posErr } from '@/lib/ads/v2PostDelivery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const parsed = sanitizeApprovalDecision(await req.json().catch(() => null))
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret) return v2Fail('unavailable', 503)
    const r = await decideApproval(footageAdminClient(), { ...parsed.value, secret })
    if (!r.ok) return v2Fail(r.error, r.error === 'not_found' ? 404 : r.error === 'already_decided' ? 409 : 502)
    return v2Json({ status: r.status })
  } catch (e) {
    const code = (e as { code?: string } | null)?.code
    if (isMissingPosEntregaTable(code)) return v2Fail('not_found', 404)
    console.warn('[ads/v2/approval/decide] falhou:', posErr(e))
    return v2Fail('decide_failed', 502)
  }
}
