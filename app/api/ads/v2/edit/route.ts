// KINEO-ADS-POS-ENTREGA-1510 — o EDITOR RÁPIDO do anúncio entregue (lib/ads/v2PostDelivery.ts tem o porquê).
// GET ?order_id=…  → o que a tela precisa para editar: frases, planos (miniatura, tipo, ordem), música, cartão, voz travada.
// POST            → aplica: frases, cartão (PNG novo do /api/footage), música e ordem dos planos sobre os MESMOS clipes; uma
//                   versão nova (ads_v2_versions) montada no Creatomate. NUNCA chama a fal, voz, modelo, débito ou estorno.
// Tabela não aplicada (migrations_pending/20261015120000_ads_v2_pos_entrega.sql) = 503 'not_ready', nunca 500.
import { NextRequest } from 'next/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { isMissingAdsTable } from '@/lib/ads/serverAccess'
import { isUuid } from '@/lib/ads/v2Contract'
import { loadAdsV2Order, loadAdsV2Shots } from '@/lib/ads/v2Advance'
import { ownedFootage, v2Fail, v2Json } from '@/lib/ads/v2Server'
import { moderateTopic } from '@/lib/safety/topicModeration'
import { posEntregaAuth } from '@/lib/ads/v2PostDeliveryAuth'
import {
  ADS_V2_EDIT_CREDITS,
  ADS_V2_EDIT_CREDITS_PROPOSED,
  ADS_V2_EDIT_MAX_RENDERING,
  ADS_V2_EDIT_MAX_VERSIONS,
  ADS_V2_EDIT_TRACKS,
  adsV2EditIsEmpty,
  adsV2EditUsd,
  mergeAdsV2Edits,
  sanitizeAdsV2EditBody,
  type AdsV2EditResolved,
} from '@/lib/ads/v2PostDelivery'
import { adsV2LibraryTrack } from '@/lib/ads/v2Music'
import {
  buildVersionSource,
  countRenderingVersions,
  editBaseFromOrder,
  isMissingPosEntregaTable,
  loadAdsV2Versions,
  submitAdsV2Version,
  adsV2VersionView,
} from '@/lib/ads/v2PostDeliveryServer'
import { posErr } from '@/lib/ads/v2PostDelivery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

export async function GET(req: NextRequest) {
  try {
    const auth = await posEntregaAuth()
    if (!auth.ok) return v2Fail(auth.error, auth.status)
    const { admin, uid } = auth
    const orderId = (req.nextUrl.searchParams.get('order_id') ?? '').toLowerCase()
    if (!isUuid(orderId)) return v2Fail('bad_order_id', 400)
    const { order, error } = await loadAdsV2Order(admin, orderId, uid)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('edit_failed', 502)
    if (!order) return v2Fail('order_not_found', 404)
    const shots = (await loadAdsV2Shots(admin, order.id)) ?? []
    const b = editBaseFromOrder(order, shots)
    if (!b.ok) return v2Json({ order_id: order.id, editable: false, reason: b.error })
    const base = b.base
    let logoUrl: string | null = null
    if (order.logo_footage_id) {
      const own = await ownedFootage(admin, uid, [order.logo_footage_id])
      logoUrl = own?.get(order.logo_footage_id)?.url ?? null
    }
    const brief = order.brief ?? {}
    const seconds = base.clips.reduce((s, c) => s + c.shot.cutSeconds, 0) + 2.5
    return v2Json({
      order_id: order.id,
      editable: true,
      format: base.format,
      overlays: base.overlays.map((o) => ({ text: o.text })),
      shots: base.clips.map((c) => ({ idx: c.idx, kind: c.shot.kind, url: c.shot.url, seconds: c.shot.cutSeconds, nine_only: c.nineOnly, packshot: c.shot.packshot === true })),
      music: { current: base.musicUrl ? adsV2LibraryTrack(base.musicUrl) ?? 'custom' : 'none', tracks: ADS_V2_EDIT_TRACKS },
      voice_locked: true,
      has_voice: Boolean(base.voiceUrl),
      presenter: Boolean(base.presenter),
      card: {
        url: base.cardUrl,
        business: str(brief.business)?.split(/\s+[—–-]\s+/)[0] ?? '',
        price: str(brief.price) ?? '',
        contact: str(brief.contact) ?? '',
        logo_url: logoUrl,
        photo_url: Array.isArray(order.photos) && order.photos[0] && typeof order.photos[0].url === 'string' ? order.photos[0].url : null,
      },
      credits: ADS_V2_EDIT_CREDITS,
      proposed_credits: ADS_V2_EDIT_CREDITS_PROPOSED,
      usd_estimate: adsV2EditUsd(seconds),
    })
  } catch (e) {
    console.warn('[ads/v2/edit GET] falhou:', posErr(e))
    return v2Fail('edit_failed', 502)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await posEntregaAuth()
    if (!auth.ok) return v2Fail(auth.error, auth.status)
    const { admin, uid, actorId } = auth
    const parsed = sanitizeAdsV2EditBody(await req.json().catch(() => null))
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const { orderId, baseVersionId, spec } = parsed.value
    const { order, error } = await loadAdsV2Order(admin, orderId, uid)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('edit_failed', 502)
    if (!order) return v2Fail('order_not_found', 404)
    const shots = (await loadAdsV2Shots(admin, order.id)) ?? []
    const b = editBaseFromOrder(order, shots)
    if (!b.ok) return v2Fail(b.error, 409)

    // As versões da conta: a de partida (se houver), o teto por anúncio e o teto de montagens em andamento.
    const versions = await loadAdsV2Versions(admin, order.id, uid)
    if (versions.error) return isMissingPosEntregaTable(versions.error.code) ? v2Fail('not_ready', 503) : v2Fail('edit_failed', 502)
    if (versions.rows.length >= ADS_V2_EDIT_MAX_VERSIONS) return v2Fail('max_versions', 409, { max: ADS_V2_EDIT_MAX_VERSIONS })
    const rendering = await countRenderingVersions(admin, uid)
    if (rendering === null) return v2Fail('edit_failed', 502)
    if (rendering >= ADS_V2_EDIT_MAX_RENDERING) return v2Fail('too_many_rendering', 429, { max: ADS_V2_EDIT_MAX_RENDERING })
    const baseVersion = baseVersionId ? versions.rows.find((v) => v.id === baseVersionId) ?? null : null
    if (baseVersionId && (!baseVersion || baseVersion.status !== 'delivered')) return v2Fail('base_version_not_found', 404)

    // O cartão novo: só PNG da pasta do dono (a URL usada é a do banco, nunca a do navegador).
    let cardUrl: string | null = null
    if (spec.cardFootageId) {
      const own = await ownedFootage(admin, uid, [spec.cardFootageId])
      if (!own) return v2Fail('edit_failed', 502)
      const card = own.get(spec.cardFootageId)
      if (!card?.isPng) return v2Fail('card_invalid', 400)
      cardUrl = card.url
    }
    const fresh: AdsV2EditResolved = { overlays: spec.overlays, cardUrl, music: spec.music, order: spec.order }
    if (adsV2EditIsEmpty(fresh)) return v2Fail('nothing_changed', 400)
    // Frase nova na tela = a mesma régua de moderação do pedido (fora do ar = segue, como no pedido).
    if (spec.overlays && spec.overlays.some((t, i) => t !== (b.base.overlays[i]?.text ?? ''))) {
      const m = await moderateTopic({ entry: 'ads-v2-orders', userId: actorId, text: spec.overlays.filter(Boolean).join('\n'), language: order.language })
      if (!m.ok) return v2Fail('moderation', m.status, { message: m.message, category: m.category })
    }
    const edit = mergeAdsV2Edits(baseVersion?.edits ?? null, fresh)
    const format = baseVersion?.format ?? b.base.format
    let source: Record<string, unknown>
    try {
      source = buildVersionSource(b.base, edit, format, order.language)
    } catch (e) {
      const m = posErr(e)
      if (m === 'ads_v2_edit_voice_too_long') return v2Fail('voice_too_long', 400)
      if (m.startsWith('ads_v2_edit_')) return v2Fail(m.replace(/^ads_v2_/, '').split(':')[0], 400)
      return v2Fail('montage_invalid', 400, { detail: m.slice(0, 120) })
    }
    try {
      const v = await submitAdsV2Version(admin, { order, userId: uid, kind: 'edit', format, edit, source, baseVersionId: baseVersion?.id ?? null, batchId: null })
      return v2Json({ version: adsV2VersionView(v), credits: ADS_V2_EDIT_CREDITS })
    } catch (e) {
      const m = posErr(e)
      if (m.startsWith('version_insert_failed') || m.startsWith('version_read_failed')) {
        const code = m.split(':')[1]
        return isMissingPosEntregaTable(code) ? v2Fail('not_ready', 503) : v2Fail('edit_failed', 502)
      }
      await writeServerEvent({ name: 'ads_v2_edit_failed', userId: uid, path: '/api/ads/v2/edit', metadata: { order_id: order.id, reason: m.slice(0, 120), credits: 0 } })
      return v2Fail('montage_rejected', 502)
    }
  } catch (e) {
    console.warn('[ads/v2/edit POST] falhou:', posErr(e))
    return v2Fail('edit_failed', 502)
  }
}
