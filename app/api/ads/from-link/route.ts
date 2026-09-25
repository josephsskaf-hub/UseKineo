// KINEO-ADS-LINK-2026-09-26 — "cole o link do seu site ou produto" (item 1 da pesquisa de concorrentes, fundador 26/09:
// "vamos fazer do 1 ao 6"). O servidor baixa a página, lê título, descrição, preço, imagens e o ícone (lib/ads/linkReader,
// puro), salva as imagens na pasta da PRÓPRIA conta (user-footage/<uid>/…, a mesma porta do upload) com moderação, e
// devolve a frase + a mídia para o modo IA. Não grava o pedido (quem grava é o PATCH de /api/ads/orders), não gera vídeo,
// não cobra crédito.
// Segurança: login, interruptor do modo IA, acesso ao Studio Ads, pedido do dono em rascunho, teto diário, só http(s)
// público (IP/host interno recusado ANTES e DEPOIS do DNS, a cada redirecionamento), tempo e tamanho limitados, só JPG/PNG
// pelos bytes, cota de armazenamento, moderação do texto e de cada imagem (barrada vai para a quarentena).
import { NextRequest, NextResponse } from 'next/server'
import { lookup } from 'node:dns/promises'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'
import { quarantineObject } from '@/lib/safety/quarantine'
import { adsGate, loadAdsAccess, isMissingAdsTable } from '@/lib/ads/serverAccess'
import { adsAutoVisible } from '@/lib/ads/autoBrief'
import { isPrivateHost, linkSentence, readLinkFacts, safeLinkUrl } from '@/lib/ads/linkReader'
import type { AdsMediaItem } from '@/lib/ads/types'
import { ensureFootageBucket, footageAdminClient, FOOTAGE_PUBLIC_PREFIX, FOOTAGE_QUOTA_PAID, totalFootageBytes, USER_FOOTAGE_BUCKET } from '@/lib/userFootage'

export const maxDuration = 60
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const ADS_LINK_DAILY_CAP = 20
const ADS_LINK_EVENT = 'ads_link_read'
const PAGE_MAX_BYTES = 1_500_000
const IMAGE_MAX_BYTES = 8 * 1024 * 1024
const FETCH_TIMEOUT_MS = 8000
const UA = 'Mozilla/5.0 (compatible; KineoLinkReader/1.0; +https://www.usekineo.com)'

/** O host resolve só para endereços públicos? */
async function publicHost(u: URL): Promise<boolean> {
  if (isPrivateHost(u.hostname)) return false
  try {
    const addrs = await lookup(u.hostname, { all: true })
    return addrs.length > 0 && addrs.every((a) => !isPrivateHost(a.address))
  } catch { return false }
}

/** GET com redirecionamento MANUAL (cada salto é validado de novo) e corpo limitado. */
async function safeGet(start: URL, accept: string, maxBytes: number): Promise<{ url: URL; type: string; body: Uint8Array } | null> {
  let url = start
  for (let hop = 0; hop < 4; hop++) {
    if (!(await publicHost(url))) return null
    const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': UA, Accept: accept }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: 'no-store' })
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location')
      const nu = next ? safeLinkUrl(new URL(next, url).toString()) : null
      if (!nu) return null
      url = nu
      continue
    }
    if (!res.ok || !res.body) return null
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) { await reader.cancel().catch(() => {}); if (maxBytes === PAGE_MAX_BYTES) break; return null }
      chunks.push(value)
    }
    const body = new Uint8Array(Math.min(size, maxBytes))
    let off = 0
    for (const c of chunks) { const n = Math.min(c.byteLength, body.length - off); body.set(c.subarray(0, n), off); off += n; if (off >= body.length) break }
    return { url, type: (res.headers.get('content-type') ?? '').toLowerCase(), body }
  }
  return null
}

/** JPG ou PNG pelos BYTES (nunca pelo cabeçalho do site). */
function imageExt(b: Uint8Array): 'jpg' | 'png' | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
  return null
}

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 })
    const { admin, reason } = await loadAdsAccess(user.id, user.email)
    if (!adsAutoVisible(reason)) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    const gate = adsGate(reason)
    if (gate !== 'ok') return NextResponse.json({ error: 'Studio Ads needs the Studio Ads pass or a paid plan.', reason: gate }, { status: 403 })

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const orderId = typeof body?.order_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.order_id) ? body.order_id : null
    if (!orderId) return NextResponse.json({ error: 'order_id_invalid' }, { status: 400 })
    const target = safeLinkUrl(body?.url)
    if (!target) return NextResponse.json({ error: 'link_invalid', message: 'Paste a public website or product link (https://…).' }, { status: 400 })

    const { data: order, error } = await admin.from('ads_orders').select('id, status').eq('id', orderId).eq('user_id', user.id).maybeSingle()
    if (error) {
      if (isMissingAdsTable(error.code)) return NextResponse.json({ error: 'Studio Ads is not ready yet.' }, { status: 503 })
      return NextResponse.json({ error: 'Could not load the order.' }, { status: 500 })
    }
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    if (order.status !== 'draft') return NextResponse.json({ error: 'This order can no longer be edited.' }, { status: 409 })

    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const { count } = await admin.from('events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('name', ADS_LINK_EVENT).gte('created_at', since)
    if ((count ?? 0) >= ADS_LINK_DAILY_CAP) return NextResponse.json({ error: 'daily_limit' }, { status: 429 })

    const page = await safeGet(target, 'text/html,application/xhtml+xml', PAGE_MAX_BYTES).catch(() => null)
    if (!page || !/html|xml/.test(page.type)) {
      await writeServerEvent({ name: ADS_LINK_EVENT, userId: user.id, path: '/api/ads/from-link', metadata: { order_id: orderId, host: target.hostname, ok: false, why: 'page_unreachable', ms: Date.now() - started } })
      return NextResponse.json({ error: 'link_unreachable', message: 'We could not open that page (it may block automatic reading). Paste your text and photos instead.' }, { status: 422 })
    }
    const facts = readLinkFacts(new TextDecoder('utf-8').decode(page.body), page.url.toString())
    const text = linkSentence(facts)

    const safety = await moderateContent({ surface: 'ads_brief', stage: 'input', userId: user.id, text, meta: { order_id: orderId, mode: 'link' } })
    if (!safety.ok) return NextResponse.json({ error: moderationRefusalMessage(safety.reason), code: safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}` }, { status: moderationRefusalStatus(safety.reason) })

    // Imagens + logo → pasta da conta, com moderação e cota.
    const store = footageAdminClient()
    await ensureFootageBucket(store)
    let room = FOOTAGE_QUOTA_PAID - (await totalFootageBytes(user.id))
    const saved: AdsMediaItem[] = []
    let logo: AdsMediaItem | null = null
    let skipped = 0
    const wanted = [...(facts.logo ? [{ src: facts.logo, isLogo: true }] : []), ...facts.images.map((src) => ({ src, isLogo: false }))]
    for (let i = 0; i < wanted.length; i++) {
      const w = wanted[i]
      const u = safeLinkUrl(w.src)
      const img = u ? await safeGet(u, 'image/jpeg,image/png;q=0.9,*/*;q=0.1', IMAGE_MAX_BYTES).catch(() => null) : null
      const ext = img ? imageExt(img.body) : null
      if (!img || !ext || img.body.byteLength < 2000 || img.body.byteLength > room) { skipped++; continue }
      const path = `${user.id}/clip-${Date.now()}-${i}.${ext}`
      const up = await store.storage.from(USER_FOOTAGE_BUCKET).upload(path, img.body, { contentType: ext === 'png' ? 'image/png' : 'image/jpeg', upsert: false })
      if (up.error) { skipped++; continue }
      const url = `${FOOTAGE_PUBLIC_PREFIX()}${path}`
      const mod = await moderateContent({ surface: 'footage', stage: 'upload', userId: user.id, imageUrls: [url], meta: { path, source: 'ads_link', order_id: orderId } })
      if (!mod.ok) {
        if (mod.reason === 'blocked') await quarantineObject(store, { bucket: USER_FOOTAGE_BUCKET, path, label: 'footage-bloqueado' }).catch(() => null)
        else await store.storage.from(USER_FOOTAGE_BUCKET).remove([path]).catch(() => null)
        skipped++
        continue
      }
      const row = await store.from('user_footage').insert({ user_id: user.id, url, kind: 'image', size_bytes: img.body.byteLength }).select('id, url').single()
      if (row.error || !row.data) { skipped++; continue }
      room -= img.body.byteLength
      const item: AdsMediaItem = { footageId: row.data.id as string, url: row.data.url as string, kind: 'image', isLogo: w.isLogo, bytes: img.body.byteLength, width: null, height: null, seconds: null }
      if (w.isLogo) logo = item
      else saved.push(item)
    }

    await writeServerEvent({
      name: ADS_LINK_EVENT,
      userId: user.id,
      path: '/api/ads/from-link',
      metadata: { order_id: orderId, host: facts.host, ok: true, images_found: facts.images.length, images_saved: saved.length, logo: Boolean(logo), skipped, price: Boolean(facts.price), ms: Date.now() - started },
    })
    return NextResponse.json({ text, facts: { title: facts.title, siteName: facts.siteName, price: facts.price, host: facts.host }, media: saved, logo, skipped })
  } catch (e) {
    console.warn('[ads/from-link] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 502 })
  }
}
