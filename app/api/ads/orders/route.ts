// KINEO-STUDIO-ADS-2026-09-25 — pedidos do Studio Ads (GET lista · POST cria rascunho · PATCH edita rascunho).
// Estado do fluxo vive AQUI (tabela ads_orders, migration 2026-09-25_studio_ads.sql). O navegador nunca escreve no
// banco: a rota confere o dono (getUser), o acesso (lib/ads/access.ts: passe > pagante > interna; trial e free fora)
// e valida cada campo no módulo puro lib/ads/orderContract.ts antes de usar a chave de serviço.
// Sem a tabela (migration não aplicada) a rota responde 503 "not ready" — nunca 500, nunca finge sucesso.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { footageAdminClient, FOOTAGE_PUBLIC_PREFIX } from '@/lib/userFootage'
import { writeServerEvent } from '@/lib/serverEvents'
import { adsAccessReason, ADS_ACCESS_SELECT, type AdsAccessFields } from '@/lib/ads/access'
import { adsPassLive } from '@/lib/ads/offer'
import { ADS_ORDER_MAX_DRAFTS_PER_USER, orderIsEditable, sanitizeBrief, sanitizeOrderPatch } from '@/lib/ads/orderContract'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ORDER_COLUMNS = 'id, status, template, seconds, brief, media, script, script_angle, voice, storyboard, card_footage_id, video_id, consent_at, qa_ok, delivered_at, created_at, updated_at'
const notReady = () => NextResponse.json({ error: 'Studio Ads is not ready yet.', ready: false }, { status: 503 })
const isMissingTable = (code: string | undefined) => code === '42P01' || code === 'PGRST205'

async function loadAccess(userId: string) {
  const admin = footageAdminClient()
  const withColumn = await admin.from('profiles').select(ADS_ACCESS_SELECT).eq('id', userId).maybeSingle()
  if (!withColumn.error) return { admin, reason: adsAccessReason(withColumn.data as AdsAccessFields | null) }
  // Coluna ainda não criada (42703): decide sem o passe — pagante e interna continuam entrando, ninguém ganha acesso por engano.
  if (withColumn.error.code === '42703') {
    const without = await admin.from('profiles').select('id, email, plan, has_paid').eq('id', userId).maybeSingle()
    return { admin, reason: adsAccessReason((without.data as AdsAccessFields | null) ?? null) }
  }
  return { admin, reason: 'none' as const, error: withColumn.error }
}

async function requireUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const { admin, reason } = await loadAccess(user.id)
  const { data, error } = await admin.from('ads_orders').select(ORDER_COLUMNS).eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
  if (error) {
    if (isMissingTable(error.code)) return NextResponse.json({ access: reason, live: adsPassLive(), ready: false, orders: [] })
    return NextResponse.json({ error: 'Could not load your orders.' }, { status: 500 })
  }
  return NextResponse.json({ access: reason, live: adsPassLive(), ready: true, orders: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const { admin, reason } = await loadAccess(user.id)
  if (reason === 'none') {
    await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/orders', metadata: { reason: 'no_access', live: adsPassLive() } })
    return NextResponse.json({ error: 'Studio Ads needs the Studio Ads pass or a paid plan.', reason: 'no_access' }, { status: 403 })
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  let brief = null
  if (body && 'brief' in body) {
    const r = sanitizeBrief(body.brief)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
    brief = r.value
  }
  const drafts = await admin.from('ads_orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'draft')
  if (drafts.error) {
    if (isMissingTable(drafts.error.code)) return notReady()
    return NextResponse.json({ error: 'Could not create the order.' }, { status: 500 })
  }
  if ((drafts.count ?? 0) >= ADS_ORDER_MAX_DRAFTS_PER_USER) return NextResponse.json({ error: 'Too many drafts. Finish or delete one first.' }, { status: 429 })
  const { data, error } = await admin.from('ads_orders').insert({ user_id: user.id, status: 'draft', brief }).select(ORDER_COLUMNS).single()
  if (error) {
    if (isMissingTable(error.code)) return notReady()
    return NextResponse.json({ error: 'Could not create the order.' }, { status: 500 })
  }
  if (brief) await writeServerEvent({ name: 'ads_brief_saved', userId: user.id, path: '/api/ads/orders', metadata: { order_id: data.id, lang: brief.language, access: reason } })
  return NextResponse.json({ order: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const { admin, reason } = await loadAccess(user.id)
  if (reason === 'none') {
    await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/orders', metadata: { reason: 'no_access', live: adsPassLive() } })
    return NextResponse.json({ error: 'Studio Ads needs the Studio Ads pass or a paid plan.', reason: 'no_access' }, { status: 403 })
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const id = typeof body?.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null
  if (!id) return NextResponse.json({ error: 'order_id_invalid' }, { status: 400 })
  const patch = sanitizeOrderPatch(body, user.id, FOOTAGE_PUBLIC_PREFIX())
  if (!patch.ok) return NextResponse.json({ error: patch.error }, { status: 400 })

  const current = await admin.from('ads_orders').select('id, status').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (current.error) {
    if (isMissingTable(current.error.code)) return notReady()
    return NextResponse.json({ error: 'Could not load the order.' }, { status: 500 })
  }
  if (!current.data) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  if (!orderIsEditable(current.data.status)) return NextResponse.json({ error: 'This order can no longer be edited.' }, { status: 409 })

  const { data, error } = await admin.from('ads_orders').update(patch.value).eq('id', id).eq('user_id', user.id).select(ORDER_COLUMNS).single()
  if (error) return NextResponse.json({ error: 'Could not save the order.' }, { status: 500 })

  const meta = { order_id: id, access: reason }
  if (patch.value.brief) await writeServerEvent({ name: 'ads_brief_saved', userId: user.id, path: '/api/ads/orders', metadata: { ...meta, lang: patch.value.brief.language } })
  if (patch.value.template) await writeServerEvent({ name: 'ads_template_selected', userId: user.id, path: '/api/ads/orders', metadata: { ...meta, template: patch.value.template, seconds: patch.value.seconds } })
  if (patch.value.consent_at) await writeServerEvent({ name: 'ads_consent_given', userId: user.id, path: '/api/ads/orders', metadata: meta })
  return NextResponse.json({ order: data })
}
