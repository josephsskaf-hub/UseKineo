// KINEO-ADS-POS-ENTREGA-1510 — APROVAÇÃO do cliente da agência (lado da agência, com login).
// GET  [?order_id=…]                         → as aprovações da conta (estado, comentário do cliente, quando decidiu).
// POST { order_id, version_id?, brand_name, lang? } → link privado NOVO (o token aparece UMA vez; o banco guarda só o hash).
// POST { action: 'revoke', approval_id }     → desliga o link (a página passa a dizer "link inválido").
// O lado do cliente (sem login) é a página /approve/<token> e POST /api/ads/v2/approval/decide.
import { NextRequest } from 'next/server'
import { isMissingAdsTable } from '@/lib/ads/serverAccess'
import { isUuid } from '@/lib/ads/v2Contract'
import { loadAdsV2Order } from '@/lib/ads/v2Advance'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'
import { writeServerEvent } from '@/lib/serverEvents'
import { parseInterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import { posEntregaAuth } from '@/lib/ads/v2PostDeliveryAuth'
import { ADS_V2_APPROVAL_DAYS, sanitizeApprovalBrand } from '@/lib/ads/v2PostDelivery'
import { ADS_V2_APPROVAL_COLS, createAdsV2Approval, isMissingPosEntregaTable, loadAdsV2Versions } from '@/lib/ads/v2PostDeliveryServer'
import { posErr } from '@/lib/ads/v2PostDelivery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

interface ApprovalListRow { id: string; order_id: string; version_id: string | null; status: string; comment: string | null; brand_name: string; created_at: string; decided_at: string | null; viewed_at: string | null; revoked_at: string | null; expires_at: string }

export async function GET(req: NextRequest) {
  try {
    const auth = await posEntregaAuth()
    if (!auth.ok) return v2Fail(auth.error, auth.status)
    const { admin, uid } = auth
    const orderId = (req.nextUrl.searchParams.get('order_id') ?? '').toLowerCase()
    let q = admin.from('ads_v2_approvals').select(ADS_V2_APPROVAL_COLS).eq('user_id', uid).order('created_at', { ascending: false }).limit(50)
    if (orderId) {
      if (!isUuid(orderId)) return v2Fail('bad_order_id', 400)
      q = q.eq('order_id', orderId)
    }
    const { data, error } = await q
    if (error) return isMissingPosEntregaTable(error.code) ? v2Json({ approvals: [], ready: false }) : v2Fail('approvals_failed', 502)
    const rows = (data ?? []) as ApprovalListRow[]
    const expired = (r: ApprovalListRow) => r.status === 'pending' && Date.parse(r.expires_at) <= Date.now()
    return v2Json({
      ready: true,
      approvals: rows.map((r) => ({ id: r.id, order_id: r.order_id, version_id: r.version_id, status: r.revoked_at ? 'revoked' : expired(r) ? 'expired' : r.status, comment: r.comment, brand_name: r.brand_name, created_at: r.created_at, decided_at: r.decided_at, viewed: Boolean(r.viewed_at) })),
    })
  } catch (e) {
    console.warn('[ads/v2/approval GET] falhou:', posErr(e))
    return v2Fail('approvals_failed', 502)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await posEntregaAuth()
    if (!auth.ok) return v2Fail(auth.error, auth.status)
    const { admin, uid } = auth
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== 'object') return v2Fail('bad_body', 400)

    if (body.action === 'revoke') {
      if (!isUuid(body.approval_id)) return v2Fail('bad_approval_id', 400)
      const r = await admin.from('ads_v2_approvals').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', String(body.approval_id).toLowerCase()).eq('user_id', uid).is('revoked_at', null).select('id, order_id').maybeSingle()
      if (r.error) return isMissingPosEntregaTable(r.error.code) ? v2Fail('not_ready', 503) : v2Fail('approvals_failed', 502)
      if (!r.data) return v2Fail('approval_not_found', 404)
      await writeServerEvent({ name: 'ads_v2_approval_revoked', userId: uid, path: '/api/ads/v2/approval', metadata: { approval_id: (r.data as { id: string }).id, order_id: (r.data as { order_id: string }).order_id } })
      return v2Json({ ok: true })
    }

    if (!isUuid(body.order_id)) return v2Fail('bad_order_id', 400)
    const brand = sanitizeApprovalBrand(body.brand_name)
    if (!brand) return v2Fail('bad_brand_name', 400)
    const lang = parseInterfaceLanguage(body.lang)
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret) return v2Fail('unavailable', 503)
    const { order, error } = await loadAdsV2Order(admin, String(body.order_id).toLowerCase(), uid)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('approvals_failed', 502)
    if (!order) return v2Fail('order_not_found', 404)
    if (order.status !== 'delivered' || !order.video_id) return v2Fail('not_delivered', 409)

    // O vídeo: o da entrega, ou uma versão PRONTA deste pedido.
    let versionId: string | null = null
    let videoId: string = order.video_id
    let videoUrl: string | null = null
    if (body.version_id !== undefined && body.version_id !== null && body.version_id !== 'original') {
      if (!isUuid(body.version_id)) return v2Fail('bad_version_id', 400)
      const vs = await loadAdsV2Versions(admin, order.id, uid)
      if (vs.error) return isMissingPosEntregaTable(vs.error.code) ? v2Fail('not_ready', 503) : v2Fail('approvals_failed', 502)
      const v = vs.rows.find((r) => r.id === String(body.version_id).toLowerCase())
      if (!v || v.status !== 'delivered' || !v.video_id || !v.video_url) return v2Fail('version_not_ready', 409)
      versionId = v.id
      videoId = v.video_id
      videoUrl = v.video_url
    } else {
      const v = await admin.from('videos').select('video_url').eq('id', order.video_id).eq('user_id', uid).maybeSingle()
      videoUrl = (v.data as { video_url?: string } | null)?.video_url ?? null
    }
    if (!videoUrl) return v2Fail('video_not_found', 404)
    try {
      const made = await createAdsV2Approval(admin, { userId: uid, order, versionId, videoId, videoUrl, brand, lang, secret })
      const origin = req.nextUrl.origin
      return v2Json({ approval_id: made.id, url: `${origin}/approve#${made.token}`, expires_at: made.expires_at, days: ADS_V2_APPROVAL_DAYS })
    } catch (e) {
      const m = posErr(e)
      if (m.startsWith('approval_insert_failed') && isMissingPosEntregaTable(m.split(':')[1])) return v2Fail('not_ready', 503)
      if (m === 'share_video_not_in_bucket') return v2Fail('video_not_ready', 409)
      console.warn('[ads/v2/approval POST] falhou:', m)
      return v2Fail('approvals_failed', 502)
    }
  } catch (e) {
    console.warn('[ads/v2/approval POST] falhou:', posErr(e))
    return v2Fail('approvals_failed', 502)
  }
}
