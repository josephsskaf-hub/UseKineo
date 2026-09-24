// KINEO-STUDIO-ADS-2026-09-25 — pedidos do Studio Ads (GET lista · POST cria rascunho · PATCH edita rascunho).
// Estado do fluxo vive AQUI (tabela ads_orders, migration 2026-09-25_studio_ads.sql). O navegador nunca escreve no
// banco: a rota confere o dono (getUser), o acesso e o interruptor (lib/ads/serverAccess.ts: passe > assinante >
// interna; desligado, só interna) e valida cada campo no módulo puro lib/ads/orderContract.ts antes de usar a chave
// de serviço. Sem a tabela (migration não aplicada) a rota responde 503 "not ready" — nunca 500, nunca finge sucesso.
// KINEO-STUDIO-ADS-REVISAO-2026-09-24 — revisão adversarial: a mídia é conferida contra user_footage DO DONO e a URL
// gravada é a do banco (nunca a do navegador); consentimento exige mídia; corpo que não é objeto vira 400; toda
// exceção vira 500 genérico sem vazar nada.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FOOTAGE_PUBLIC_PREFIX } from '@/lib/userFootage'
import { writeServerEvent } from '@/lib/serverEvents'
import { adsGate, isMissingAdsTable, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsPassLive } from '@/lib/ads/offer'
import { ADS_ORDER_MAX_DRAFTS_PER_USER, orderIsEditable, sanitizeBrief, sanitizeOrderPatch } from '@/lib/ads/orderContract'
import type { AdsMediaItem } from '@/lib/ads/types'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ORDER_COLUMNS = 'id, status, template, seconds, brief, media, script, script_angle, voice, storyboard, card_footage_id, video_id, consent_at, qa_ok, delivered_at, created_at, updated_at'
const notReady = () => NextResponse.json({ error: 'Studio Ads is not ready yet.', ready: false }, { status: 503 })
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

async function requireUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function gateOrDeny(userId: string, reason: Parameters<typeof adsGate>[0], path: string) {
  const g = adsGate(reason)
  if (g === 'ok') return null
  await writeServerEvent({ name: 'ads_access_denied', userId, path, metadata: { reason: g, live: adsPassLive() } })
  return g === 'closed'
    ? NextResponse.json({ error: 'Studio Ads opens soon.', reason: 'closed' }, { status: 403 })
    : NextResponse.json({ error: 'Studio Ads needs the Studio Ads pass or a paid plan.', reason: 'no_access' }, { status: 403 })
}

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const { admin, reason } = await loadAdsAccess(user.id, user.email)
    const { data, error } = await admin.from('ads_orders').select(ORDER_COLUMNS).eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    if (error) {
      if (isMissingAdsTable(error.code)) return NextResponse.json({ access: reason, gate: adsGate(reason), live: adsPassLive(), ready: false, orders: [] })
      return NextResponse.json({ error: 'Could not load your orders.' }, { status: 500 })
    }
    return NextResponse.json({ access: reason, gate: adsGate(reason), live: adsPassLive(), ready: true, orders: data ?? [] })
  } catch (e) {
    console.warn('[ads/orders GET] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const { admin, reason } = await loadAdsAccess(user.id, user.email)
    const denied = await gateOrDeny(user.id, reason, '/api/ads/orders')
    if (denied) return denied
    const body = await req.json().catch(() => null)
    if (body !== null && !isObject(body)) return NextResponse.json({ error: 'body_must_be_object' }, { status: 400 })
    let brief = null
    if (body && 'brief' in body) {
      const r = sanitizeBrief(body.brief)
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
      brief = r.value
    }
    const drafts = await admin.from('ads_orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'draft')
    if (drafts.error) {
      if (isMissingAdsTable(drafts.error.code)) return notReady()
      return NextResponse.json({ error: 'Could not create the order.' }, { status: 500 })
    }
    if ((drafts.count ?? 0) >= ADS_ORDER_MAX_DRAFTS_PER_USER) return NextResponse.json({ error: 'Too many drafts. Finish or delete one first.' }, { status: 429 })
    const { data, error } = await admin.from('ads_orders').insert({ user_id: user.id, status: 'draft', brief }).select(ORDER_COLUMNS).single()
    if (error) {
      if (isMissingAdsTable(error.code)) return notReady()
      return NextResponse.json({ error: 'Could not create the order.' }, { status: 500 })
    }
    if (brief) await writeServerEvent({ name: 'ads_brief_saved', userId: user.id, path: '/api/ads/orders', metadata: { order_id: data.id, lang: brief.language, access: reason } })
    return NextResponse.json({ order: data }, { status: 201 })
  } catch (e) {
    console.warn('[ads/orders POST] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const { admin, reason } = await loadAdsAccess(user.id, user.email)
    const denied = await gateOrDeny(user.id, reason, '/api/ads/orders')
    if (denied) return denied
    const body = await req.json().catch(() => null)
    if (!isObject(body)) return NextResponse.json({ error: 'body_must_be_object' }, { status: 400 })
    const id = typeof body.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null
    if (!id) return NextResponse.json({ error: 'order_id_invalid' }, { status: 400 })
    const patch = sanitizeOrderPatch(body, user.id, FOOTAGE_PUBLIC_PREFIX())
    if (!patch.ok) return NextResponse.json({ error: patch.error }, { status: 400 })

    const current = await admin.from('ads_orders').select('id, status, media').eq('id', id).eq('user_id', user.id).maybeSingle()
    if (current.error) {
      if (isMissingAdsTable(current.error.code)) return notReady()
      return NextResponse.json({ error: 'Could not load the order.' }, { status: 500 })
    }
    if (!current.data) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    if (!orderIsEditable(current.data.status)) return NextResponse.json({ error: 'This order can no longer be edited.' }, { status: 409 })

    // Mídia conferida no banco: cada id tem de ser user_footage DESTA conta, e a URL gravada é a do banco.
    if (patch.value.media) {
      const ids = patch.value.media.map((m) => m.footageId)
      if (ids.length) {
        const own = await admin.from('user_footage').select('id, url, kind').eq('user_id', user.id).in('id', ids)
        if (own.error) return NextResponse.json({ error: 'Could not check your files.' }, { status: 500 })
        const byId = new Map((own.data ?? []).map((r: { id: string; url: string; kind: string }) => [r.id, r]))
        const fixed: AdsMediaItem[] = []
        for (const m of patch.value.media) {
          const row = byId.get(m.footageId)
          if (!row || row.kind !== m.kind) return NextResponse.json({ error: 'media_not_owned' }, { status: 400 })
          fixed.push({ ...m, url: row.url })
        }
        patch.value.media = fixed
      }
    }
    // Consentimento só atesta mídia que existe.
    if (patch.value.consent_at) {
      const media = patch.value.media ?? (Array.isArray(current.data.media) ? current.data.media : [])
      if (!media.length) return NextResponse.json({ error: 'consent_needs_media' }, { status: 400 })
    }

    const { data, error } = await admin.from('ads_orders').update(patch.value).eq('id', id).eq('user_id', user.id).eq('status', 'draft').select(ORDER_COLUMNS).maybeSingle()
    if (error) return NextResponse.json({ error: 'Could not save the order.' }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'This order can no longer be edited.' }, { status: 409 })

    const meta = { order_id: id, access: reason }
    if (patch.value.brief) await writeServerEvent({ name: 'ads_brief_saved', userId: user.id, path: '/api/ads/orders', metadata: { ...meta, lang: patch.value.brief.language } })
    if (patch.value.template) await writeServerEvent({ name: 'ads_template_selected', userId: user.id, path: '/api/ads/orders', metadata: { ...meta, template: patch.value.template, seconds: patch.value.seconds } })
    if (patch.value.consent_at) await writeServerEvent({ name: 'ads_consent_given', userId: user.id, path: '/api/ads/orders', metadata: meta })
    return NextResponse.json({ order: data })
  } catch (e) {
    console.warn('[ads/orders PATCH] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
