// KINEO-ADS-POS-ENTREGA-1510 — "Get 9:16 + 4:5 + 1:1" (POST { order_id, base_version_id? }): os formatos que faltam, montados de
// uma vez com os MESMOS clipes (e as mesmas edições da versão de partida). Plano que só existe em 9:16 (efeito, ator) vai com fundo
// suave; frases e cartão final no quadro (adsV2CardFrame). Idempotente por formato: formato já pedido (montando ou pronto) a
// partir da mesma base não é montado de novo. Nada aqui cobra ou chama a fal.
import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { isMissingAdsTable } from '@/lib/ads/serverAccess'
import { loadAdsV2Order, loadAdsV2Shots } from '@/lib/ads/v2Advance'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'
import { posEntregaAuth } from '@/lib/ads/v2PostDeliveryAuth'
import { ADS_V2_EDIT_CREDITS, ADS_V2_EDIT_MAX_RENDERING, ADS_V2_EDIT_MAX_VERSIONS, adsV2MissingFormats, sanitizeAdsV2FormatsBody, type AdsV2EditResolved } from '@/lib/ads/v2PostDelivery'
import { buildVersionSource, countRenderingVersions, editBaseFromOrder, isMissingPosEntregaTable, loadAdsV2Versions, submitAdsV2Version, adsV2VersionView } from '@/lib/ads/v2PostDeliveryServer'
import { posErr } from '@/lib/ads/v2PostDelivery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const auth = await posEntregaAuth()
    if (!auth.ok) return v2Fail(auth.error, auth.status)
    const { admin, uid } = auth
    const parsed = sanitizeAdsV2FormatsBody(await req.json().catch(() => null))
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const { orderId, baseVersionId } = parsed.value
    const { order, error } = await loadAdsV2Order(admin, orderId, uid)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('formats_failed', 502)
    if (!order) return v2Fail('order_not_found', 404)
    const b = editBaseFromOrder(order, (await loadAdsV2Shots(admin, order.id)) ?? [])
    if (!b.ok) return v2Fail(b.error, 409)
    const versions = await loadAdsV2Versions(admin, order.id, uid)
    if (versions.error) return isMissingPosEntregaTable(versions.error.code) ? v2Fail('not_ready', 503) : v2Fail('formats_failed', 502)
    const baseVersion = baseVersionId ? versions.rows.find((v) => v.id === baseVersionId) ?? null : null
    if (baseVersionId && (!baseVersion || baseVersion.status !== 'delivered')) return v2Fail('base_version_not_found', 404)
    const have = baseVersion?.format ?? b.base.format
    const already = new Set(versions.rows.filter((v) => v.kind === 'format' && v.status !== 'failed' && (v.base_version_id ?? null) === (baseVersion?.id ?? null)).map((v) => v.format))
    const todo = adsV2MissingFormats(have).filter((f) => !already.has(f))
    if (todo.length === 0) return v2Json({ versions: versions.rows.filter((v) => v.kind === 'format' && (v.base_version_id ?? null) === (baseVersion?.id ?? null)).map(adsV2VersionView), credits: ADS_V2_EDIT_CREDITS, already: true })
    if (versions.rows.length + todo.length > ADS_V2_EDIT_MAX_VERSIONS) return v2Fail('max_versions', 409, { max: ADS_V2_EDIT_MAX_VERSIONS })
    const rendering = await countRenderingVersions(admin, uid)
    if (rendering === null) return v2Fail('formats_failed', 502)
    if (rendering + todo.length > ADS_V2_EDIT_MAX_RENDERING) return v2Fail('too_many_rendering', 429, { max: ADS_V2_EDIT_MAX_RENDERING })
    const under = baseVersion?.edits ?? {}
    const edit: AdsV2EditResolved = {
      overlays: Array.isArray(under.overlays) ? under.overlays : null,
      cardUrl: typeof under.cardUrl === 'string' ? under.cardUrl : null,
      music: typeof under.music === 'string' ? under.music : 'keep',
      order: Array.isArray(under.order) ? under.order : null,
    }
    const batchId = randomUUID()
    const out = []
    for (const format of todo) {
      let source: Record<string, unknown>
      try {
        source = buildVersionSource(b.base, edit, format, order.language)
      } catch (e) {
        return v2Fail('montage_invalid', 400, { detail: posErr(e).slice(0, 120), versions: out.map(adsV2VersionView) })
      }
      try {
        out.push(await submitAdsV2Version(admin, { order, userId: uid, kind: 'format', format, edit, source, baseVersionId: baseVersion?.id ?? null, batchId }))
      } catch (e) {
        const m = posErr(e)
        if (m.startsWith('version_insert_failed') && isMissingPosEntregaTable(m.split(':')[1])) return v2Fail('not_ready', 503)
        return v2Fail('montage_rejected', 502, { versions: out.map(adsV2VersionView) })
      }
    }
    return v2Json({ versions: out.map(adsV2VersionView), credits: ADS_V2_EDIT_CREDITS })
  } catch (e) {
    console.warn('[ads/v2/formats] falhou:', posErr(e))
    return v2Fail('formats_failed', 502)
  }
}
