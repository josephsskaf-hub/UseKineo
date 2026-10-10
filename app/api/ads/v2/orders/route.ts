// KINEO-ADS-V2-2026-09-28 — pedidos do anúncio v2 (tabela própria public.ads_v2_orders; o v1 e ads_orders ficam
// intactos). GET lista os pedidos da conta (ou um, com os planos); POST cria o RASCUNHO: nível, duração, 1 frase OU o
// link do negócio, idioma, narração (padrão ligada) e, opcionalmente, logo, cartão final e fotos com o tipo marcado.
// Nada aqui chama fornecedor pago nem cobra crédito.
// ETAPA 3 — PATCH (tela /ads/v2): só narração e cartão final, só em rascunho/planejado, com os mesmos portões do POST.
// Tabela não aplicada (migrations_pending/2026-09-29_ads_v2.sql) = 503 'not_ready', nunca 500.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { adsGate, isMissingAdsTable, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { isUuid, sanitizeAssetsBody, sanitizeCreateOrderBody, sanitizePatchBody } from '@/lib/ads/v2Contract'
import { adsV2Credits } from '@/lib/ads/v2Tiers'
import { adsV2View, loadAdsV2Order, loadAdsV2Shots } from '@/lib/ads/v2Advance'
import { ownedFootage, v2Fail, v2Json } from '@/lib/ads/v2Server'
// KINEO-ADS-AMOSTRA-2026-10-09 — a amostra grátis abre o POST e o PATCH para a conta free/trial que ainda não usou a dela;
// o rascunho da amostra só nasce no nível e na duração da amostra (o /start confere de novo antes de qualquer custo).
import { adsSampleLevelOk, adsSampleOpen } from '@/lib/ads/serverAccess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const { admin, ...ws } = await loadAdsAccess(user.id, user.email, { workspace: true })
    const uid: string = ws.ownerId ?? user.id // KINEO-EQUIPE-BUSINESS-2026-10-10 — workspace: membro do Business age na conta do DONO (stub/chamador antigo = pessoal)
    const id = req.nextUrl.searchParams.get('id')
    if (id) {
      if (!isUuid(id)) return v2Fail('bad_order_id', 400)
      const { order, error } = await loadAdsV2Order(admin, id.toLowerCase(), uid)
      if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('orders_failed', 502)
      if (!order) return v2Fail('order_not_found', 404)
      const shots = (await loadAdsV2Shots(admin, order.id)) ?? []
      return v2Json({ order: adsV2View(order, shots), plan: order.plan, brief: order.brief, card_url: order.card_url, photos: order.photos })
    }
    const { data, error } = await admin
      .from('ads_v2_orders')
      .select('id, status, tier, seconds, sector, credits_charged, video_id, parent_order_id, retake_idx, error, created_at, updated_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('orders_failed', 502)
    return v2Json({ orders: data ?? [] })
  } catch (e) {
    console.warn('[ads/v2/orders GET] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('orders_failed', 502)
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const { admin, reason, ...ws } = await loadAdsAccess(user.id, user.email, { workspace: true })
    const uid: string = ws.ownerId ?? user.id // KINEO-EQUIPE-BUSINESS-2026-10-10 — workspace: membro do Business age na conta do DONO (stub/chamador antigo = pessoal)
    const gate = adsGate(reason)
    const sample = gate === 'no_access' && await adsSampleOpen(admin, uid, reason) // KINEO-ADS-AMOSTRA-2026-10-09
    if (gate !== 'ok' && !sample) {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/v2/orders', metadata: { reason: gate } })
      return v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403)
    }
    if (!adsV2Visible(user.email)) return v2Fail('v2_closed', 403)

    const body = await req.json().catch(() => null)
    const parsed = sanitizeCreateOrderBody(body)
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const assets = sanitizeAssetsBody(body)
    if (!assets.ok) return v2Fail(assets.error, 400)
    const o = parsed.value
    const a = assets.value
    // KINEO-ADS-AMOSTRA-2026-10-09 — a amostra só existe em um nível e uma duração.
    if (gate !== 'ok' && sample && !adsSampleLevelOk(o.tier, o.seconds)) return v2Fail('sample_level_only', 403)

    const ids = [a.logo_footage_id, a.card_footage_id, ...(a.photos ?? []).map((p) => p.footage_id)].filter((x): x is string => !!x)
    const own = await ownedFootage(admin, uid, ids)
    if (!own) return v2Fail('orders_failed', 502)
    if (a.logo_footage_id && !own.get(a.logo_footage_id)?.isImage) return v2Fail('logo_invalid', 400)
    if (a.card_footage_id && !own.get(a.card_footage_id)?.isPng) return v2Fail('card_invalid', 400)
    const photos = (a.photos ?? []).map((p) => ({ footage_id: p.footage_id, kind: p.kind, url: own.get(p.footage_id)?.isImage ? own.get(p.footage_id)!.url : '' }))
    if (photos.some((p) => !p.url)) return v2Fail('media_not_owned', 400)

    // KINEO-ADS-MODO-SIMPLES-2026-09-29 — o brief do modo simples leva o modo, as frases (liga/desliga), o preço e o
    // contato que a PESSOA escreveu. research_from: rascunho anterior DESTA conta; se a frase for idêntica, a pesquisa
    // gravada (ok, ou "nada achado") é copiada — trocar voz, frases, preço, contato ou nível não paga outra pesquisa.
    const brief: Record<string, unknown> = { sentence: o.sentence, link: o.link }
    if (o.mode === 'simple') {
      brief.mode = 'simple'
      brief.overlays = o.overlays !== false
      brief.price = o.price ?? null
      brief.contact = o.contact ?? null
      if (o.research_from) {
        const prev = await admin.from('ads_v2_orders').select('brief').eq('id', o.research_from).eq('user_id', uid).maybeSingle()
        const pb = (prev.data as { brief: Record<string, unknown> | null } | null)?.brief ?? null
        const pr = pb?.research as { status?: unknown; why?: unknown } | undefined
        // Revisão 29/09: "nada achado" / "tudo descartado" também é resultado da MESMA frase — trocar o nível não paga
        // outra busca. Falha de fornecedor (timeout, openai_5xx) não é copiada: aí vale tentar de novo.
        const reusable = !!pr && (pr.status === 'ok' || (pr.status === 'failed' && (pr.why === 'nothing_found' || pr.why === 'all_dropped')))
        if (pb && pb.sentence === o.sentence && reusable) brief.research = { ...pr, copied_from: o.research_from, selected: undefined }
      }
    }

    const ins = await admin
      .from('ads_v2_orders')
      .insert({
        user_id: uid,
        ...(ws.role === 'member' ? { created_by: user.id } : {}), // KINEO-EQUIPE-BUSINESS-2026-10-10 — quem criou (auditoria; NULL = o dono)
        status: 'draft',
        tier: o.tier,
        seconds: o.seconds,
        sector: o.sector,
        brief,
        language: o.language,
        narration: o.narration,
        logo_footage_id: a.logo_footage_id,
        card_footage_id: a.card_footage_id,
        card_url: a.card_footage_id ? own.get(a.card_footage_id)!.url : null,
        photos: photos.length ? photos : null,
      })
      .select('id')
      .maybeSingle()
    if (ins.error) return isMissingAdsTable(ins.error.code) ? v2Fail('not_ready', 503) : v2Fail('orders_failed', 502)
    const orderId = String((ins.data as { id: string }).id)
    const credits = adsV2Credits(o.tier, o.seconds)
    await writeServerEvent({
      name: 'ads_v2_order_created',
      userId: uid,
      path: '/api/ads/v2/orders',
      metadata: {
        order_id: orderId, tier: o.tier, seconds: o.seconds, sector: o.sector, has_link: Boolean(o.link), has_sentence: Boolean(o.sentence), narration: o.narration, photos: photos.length, credits,
        mode: o.mode === 'simple' ? 'simple' : 'full', overlays: o.overlays !== false, has_price: Boolean(o.price), has_contact: Boolean(o.contact), research_copied: Boolean(brief.research),
      },
    })
    // KINEO-EQUIPE-BUSINESS-2026-10-10 — rastro de auditoria: o MEMBRO agiu no workspace do dono (o pedido e a cobrança são do dono).
    if (ws.role === 'member') await writeServerEvent({ name: 'ads_order_by_member', userId: user.id, path: '/api/ads/v2/orders', metadata: { owner_id: uid, action: 'create', order_id: orderId, tier: o.tier, seconds: o.seconds, credits } })
    return v2Json({ order_id: orderId, status: 'draft', credits }, 201)
  } catch (e) {
    console.warn('[ads/v2/orders POST] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('orders_failed', 502)
  }
}

/**
 * ETAPA 3 — a tela liga/desliga a narração na prévia do plano e troca o cartão final editado depois de planejar, sem
 * rodar o modelo de novo. Só rascunho/planejado (UPDATE condicional); cartão conferido no user_footage DO DONO (PNG).
 * Religar a narração de um plano feito sem ela = 409 'replan_needed' (não há texto para falar).
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    const { admin, reason, ...ws } = await loadAdsAccess(user.id, user.email, { workspace: true })
    const uid: string = ws.ownerId ?? user.id // KINEO-EQUIPE-BUSINESS-2026-10-10 — workspace: membro do Business age na conta do DONO (stub/chamador antigo = pessoal)
    const gate = adsGate(reason)
    const sample = gate === 'no_access' && await adsSampleOpen(admin, uid, reason) // KINEO-ADS-AMOSTRA-2026-10-09
    if (gate !== 'ok' && !sample) {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/v2/orders', metadata: { reason: gate, method: 'PATCH' } })
      return v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403)
    }
    if (!adsV2Visible(user.email)) return v2Fail('v2_closed', 403)

    const parsed = sanitizePatchBody(await req.json().catch(() => null))
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const p = parsed.value

    const { order, error } = await loadAdsV2Order(admin, p.order_id, uid)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('orders_failed', 502)
    if (!order) return v2Fail('order_not_found', 404)
    if (order.status !== 'draft' && order.status !== 'planned') return v2Fail('not_editable', 409)
    if (p.narration === true && !(typeof order.plan?.narration === 'string' && order.plan.narration.trim())) return v2Fail('replan_needed', 409)

    const patch: Record<string, unknown> = {}
    if (p.narration !== null) patch.narration = p.narration
    if (p.card_footage_id) {
      if (order.logo_footage_id && p.card_footage_id === order.logo_footage_id.toLowerCase()) return v2Fail('card_is_logo', 400)
      const own = await ownedFootage(admin, uid, [p.card_footage_id])
      if (!own) return v2Fail('orders_failed', 502)
      const card = own.get(p.card_footage_id)
      if (!card?.isPng) return v2Fail('card_invalid', 400)
      patch.card_footage_id = p.card_footage_id
      patch.card_url = card.url
    }
    const upd = await admin
      .from('ads_v2_orders')
      .update(patch)
      .eq('id', order.id)
      .eq('user_id', uid)
      .in('status', ['draft', 'planned'])
      .select('id, narration, card_url')
      .maybeSingle()
    if (upd.error) return isMissingAdsTable(upd.error.code) ? v2Fail('not_ready', 503) : v2Fail('orders_failed', 502)
    if (!upd.data) return v2Fail('not_editable', 409)
    const row = upd.data as { id: string; narration: boolean; card_url: string | null }
    return v2Json({ order_id: row.id, narration: row.narration, card_ready: Boolean(row.card_url) })
  } catch (e) {
    console.warn('[ads/v2/orders PATCH] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('orders_failed', 502)
  }
}
