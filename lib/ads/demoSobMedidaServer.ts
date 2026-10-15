// KINEO-DEMO-SOB-MEDIDA-1510 — o lado SERVIDOR da máquina de demo sob medida (o porquê e as regras: lib/ads/demoSobMedida.ts).
//
// FLUXO (POST /api/admin/demo, só admin, só conta da casa):
//   porta do teto da semana (evento demo_sob_medida_created, semana ISO de Brasília; contagem que falha = FECHADO) → saldo da
//   fal (recusa por saldo nas últimas 6 h = não começa) → créditos da casa ≥ Comercial 15 s → leitor de link de sempre
//   (lib/ads/v2Link.ts adsV2LinkImport: host público, tempo e bytes limitados) → moderação do texto → até 3 fotos JPG/PNG:
//   a original e o recorte 9:16 (lib/ads/demoPhoto.tsx) no user_footage da CASA, cada uma com a moderação de imagem →
//   cartão final (o gerador do servidor de lib/shopify/card.tsx) → a marca (ad_brands da casa, nome = marca) → rascunho pelo
//   contrato do POST /api/ads/v2/orders (modo simples, Comercial 15 s, loja, produto) → adsV2PlanFor (o MESMO corpo do /plan)
//   → adsV2StartFor com dry_run (ensaio de US$ 0) → adsV2StartFor (o MESMO /start: saldo, trava, débito, envio à fal) →
//   evento demo_sob_medida_created. A requisição NÃO espera o vídeo.
// DEPOIS DA ENTREGA (advanceDemosSobMedida: cron ads-v2-advance + a própria tela /admin/demo, idempotente):
//   pedido 'delivered' → 4:5 e 1:1 dos MESMOS clipes (lib/ads/v2PostDeliveryServer.ts: Creatomate, nunca a fal, 0 crédito)
//   → avanço das versões → link de aprovação com o nome da marca (token DERIVADO da chave de serviço + pedido: a tela mostra o
//   link de novo sem gravá-lo) → evento demo_sob_medida_delivered quando nenhum formato está montando.
// NADA aqui debita, estorna ou chama a fal diretamente: o dinheiro e a fal são o /plan e o /start de sempre.
import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration'
import { quarantineObject } from '@/lib/safety/quarantine'
import { ensureFootageBucket, FOOTAGE_PUBLIC_PREFIX, FOOTAGE_QUOTA_PAID, totalFootageBytes, USER_FOOTAGE_BUCKET } from '@/lib/userFootage'
import { adsGate, type AdsAccessLoad } from '@/lib/ads/serverAccess'
import { adsV2LinkImport, type AdsV2LinkFail } from '@/lib/ads/v2Link'
import { sanitizeCreateOrderBody, ADS_V2_SENTENCE_MAX_CHARS } from '@/lib/ads/v2Contract'
import { adsV2Credits } from '@/lib/ads/v2Tiers'
import { adsV2PlanFor } from '@/lib/ads/v2PlanCore'
import { adsV2StartFor } from '@/lib/ads/v2StartCore'
import { adsV2SceneForDraft } from '@/lib/ads/v2SceneServer'
import { loadAdsV2Order, loadAdsV2Shots, type AdsV2OrderRow } from '@/lib/ads/v2Advance'
import { renderShopEndCard } from '@/lib/shopify/card'
import { renderDemoPhoto916 } from '@/lib/ads/demoPhoto'
import { readFalBalancePanel, falRefusalIsFresh } from '@/lib/supplier/falBalancePanel'
import { AD_BRANDS_TABLE, adBrandLimit, adBrandWebsite } from '@/lib/ads/brands'
import { mintApprovalToken } from '@/lib/ads/v2ApprovalToken'
import { parseInterfaceLanguage } from '@/lib/ui/interfaceLanguage'
import { ADS_V2_APPROVAL_DAYS, ADS_V2_EDIT_MAX_RENDERING, ADS_V2_EDIT_MAX_VERSIONS, adsV2MissingFormats, adsV2RendersPath, type AdsV2EditResolved } from '@/lib/ads/v2PostDelivery'
import { advanceAdsV2Versions, buildVersionSource, countRenderingVersions, editBaseFromOrder, loadAdsV2Versions, submitAdsV2Version, type AdsV2VersionRow } from '@/lib/ads/v2PostDeliveryServer'
import {
  DEMO_CARD_CTA,
  DEMO_EVENT_CREATED,
  DEMO_EVENT_DELIVERED,
  DEMO_FOLLOW_DAYS,
  DEMO_MAX_PHOTOS,
  DEMO_SECONDS,
  DEMO_TIER,
  DEMO_WEEKLY_CAP,
  demoCapDecision,
  demoMessage,
  demoSafeLink,
  demoSentence,
  demoStatus,
  demoWeekLabel,
  demoWeekStart,
  isDemoSobMedidaBrief,
  type DemoBody,
  type DemoStatus,
  type DemoVoiceLang,
} from '@/lib/ads/demoSobMedida'

const PATH = '/api/admin/demo'
export type DemoResult = { status: number; body: Record<string, unknown> }
const out = (status: number, body: Record<string, unknown>): DemoResult => ({ status, body })
const errOf = (e: unknown) => (e && typeof (e as { message?: unknown }).message === 'string' ? (e as { message: string }).message : String(e))

async function readCore(res: Response): Promise<DemoResult> {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, body }
}

// ── teto da semana ───────────────────────────────────────────────────────────────────────────────────────────────────
/** Demos criadas nesta semana (todas as contas). null = a leitura falhou (a porta fecha). */
export async function demoWeekCount(admin: SupabaseClient, now: Date): Promise<number | null> {
  try {
    const r = await admin.from('events').select('id', { count: 'exact', head: true }).eq('name', DEMO_EVENT_CREATED).gte('created_at', demoWeekStart(now).toISOString())
    return r.error || typeof r.count !== 'number' ? null : r.count
  } catch {
    return null
  }
}

// ── o link de aprovação da demo (derivado; nunca gravado) ────────────────────────────────────────────────────────────
/** O nonce do link da demo: HMAC(chave de serviço, pedido). Só quem tem a chave de serviço refaz o link. */
export function demoApprovalRandom(secret: string, orderId: string): (n: number) => Buffer {
  const seed = createHmac('sha256', secret).update(`kineo-demo-approval:v1:${orderId}`).digest()
  return (n: number) => seed.subarray(0, n)
}
export function demoApprovalToken(secret: string, orderId: string): { token: string; hash: string } {
  return mintApprovalToken(secret, demoApprovalRandom(secret, orderId))
}

// ── mídia no user_footage da casa ────────────────────────────────────────────────────────────────────────────────────
/** Guarda a imagem no user_footage DA CONTA, com a moderação de imagem (barrada → quarentena). null = não entrou. */
async function saveDemoImage(admin: SupabaseClient, uid: string, bytes: Uint8Array, ext: 'jpg' | 'png', label: string, meta: Record<string, unknown>): Promise<{ footage_id: string; url: string } | null> {
  const path = `${uid}/clip-${Date.now()}-${label}.${ext}`
  const up = await admin.storage.from(USER_FOOTAGE_BUCKET).upload(path, bytes, { contentType: ext === 'png' ? 'image/png' : 'image/jpeg', upsert: false })
  if (up.error) return null
  const url = `${FOOTAGE_PUBLIC_PREFIX()}${path}`
  const mod = await moderateContent({ surface: 'footage', stage: 'upload', userId: uid, imageUrls: [url], meta: { path, size_bytes: bytes.byteLength, source: 'demo_sob_medida', ...meta } })
  if (!mod.ok) {
    if (mod.reason === 'blocked') await quarantineObject(admin, { bucket: USER_FOOTAGE_BUCKET, path, label: 'footage-bloqueado' }).catch(() => null)
    else await admin.storage.from(USER_FOOTAGE_BUCKET).remove([path]).catch(() => null)
    return null
  }
  const row = await admin.from('user_footage').insert({ user_id: uid, url, kind: 'image', size_bytes: bytes.byteLength }).select('id, url').maybeSingle()
  if (row.error || !row.data) return null
  return { footage_id: String((row.data as { id: string }).id), url: String((row.data as { url: string }).url) }
}

/** A marca da demo no ad_brands DA CASA (nome = marca): a que já existe, ou uma nova. Sem a tabela / no teto = null (o pedido segue). */
async function ensureDemoBrand(admin: SupabaseClient, uid: string, brand: string, fields: { website: string | null; price: string | null; voice: DemoVoiceLang }): Promise<string | null> {
  try {
    const q = await admin.from(AD_BRANDS_TABLE).select('id, name').eq('owner_id', uid).is('archived_at', null).limit(200)
    if (q.error) return null
    const rows = (q.data ?? []) as { id: string; name: string }[]
    const hit = rows.find((r) => String(r.name ?? '').trim().toLowerCase() === brand.toLowerCase())
    if (hit) return hit.id
    if (rows.length >= adBrandLimit(null, true)) return null
    const ins = await admin.from(AD_BRANDS_TABLE).insert({ owner_id: uid, name: brand, website: fields.website, price: fields.price, voice_language: fields.voice }).select('id').maybeSingle()
    return !ins.error && ins.data ? String((ins.data as { id: string }).id) : null
  } catch {
    return null
  }
}

// ── criar ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface DemoCreateCtx {
  admin: SupabaseClient
  user: { id: string; email: string | null }
  access: AdsAccessLoad
  body: DemoBody
  now: Date
  started: number
}

/** A demo nova (a rota já conferiu sessão, admin e e-mail da casa). Nunca lança. */
export async function createDemoSobMedida(ctx: DemoCreateCtx): Promise<DemoResult> {
  const { admin, user, access, body, now, started } = ctx
  try {
    // A conta da casa (o acesso de 'internal' = isAdsInternalEmail; qualquer outro motivo é recusado).
    if (access.reason !== 'internal' || adsGate(access.reason) !== 'ok') return out(403, { error: 'not_house_account' })
    const uid: string = access.ownerId ?? user.id

    // Teto da semana (contagem que não lê = fechado; 4ª só com a exceção do fundador, com motivo).
    const count = await demoWeekCount(admin, now)
    const cap = demoCapDecision(count, body.exceptionReason)
    if (!cap.ok) return out(cap.error === 'weekly_cap' ? 429 : 503, { error: cap.error, count, cap: DEMO_WEEKLY_CAP })

    // Saldo da fal ANTES (recusa por saldo nas últimas 6 h = não começa).
    const panel = await readFalBalancePanel(admin, now).catch(() => null)
    if (falRefusalIsFresh(panel, now.getTime())) return out(409, { error: 'fal_balance_refused' })
    const fal = panel ? 'ok' : 'not_measured'

    // Créditos da casa para um Comercial 15 s (o /start confere de novo).
    const cost = adsV2Credits(DEMO_TIER, DEMO_SECONDS)
    const prof = await admin.from('profiles').select('video_credits').eq('id', uid).maybeSingle()
    const balance = Number((prof.data as { video_credits?: number } | null)?.video_credits ?? 0)
    if (!(balance >= cost)) return out(402, { error: 'out_of_credits', needed: cost, balance })

    // A página do produto (o leitor de link de sempre) e a moderação do texto dela.
    const why: AdsV2LinkFail = {}
    const room = Math.max(0, FOOTAGE_QUOTA_PAID - (await totalFootageBytes(uid)))
    const read = await adsV2LinkImport(body.link, { roomBytes: room, why, max: DEMO_MAX_PHOTOS }).catch(() => null)
    if (!read) return out(422, { error: 'link_unreachable', why: why.value ?? 'unreachable', ...(why.message ? { message: why.message } : {}) })
    const safety = await moderateContent({ surface: 'ads_brief', stage: 'input', userId: user.id, text: read.text, meta: { mode: 'demo_sob_medida', host: read.host } })
    if (!safety.ok) return out(422, { error: 'moderation' })

    // As fotos: a original (a trava do produto recorta dela) e o recorte 9:16 (o quadro do anúncio). WebP fica de fora.
    if (read.images.length) await ensureFootageBucket(admin)
    const photos: { footage_id: string; kind: 'product'; original_footage_id: string }[] = []
    for (let i = 0; i < read.images.length && photos.length < DEMO_MAX_PHOTOS; i++) {
      const im = read.images[i]
      if (im.ext !== 'jpg' && im.ext !== 'png') continue
      const original = await saveDemoImage(admin, uid, im.bytes, im.ext, `demo${i}-orig`, { host: read.host })
      if (!original) continue
      const png = await renderDemoPhoto916(im.bytes, im.ext)
      const crop = png ? await saveDemoImage(admin, uid, png, 'png', `demo${i}-916`, { host: read.host }) : null
      if (!crop) continue
      photos.push({ footage_id: crop.footage_id, kind: 'product', original_footage_id: original.footage_id })
    }
    if (!photos.length) return out(422, { error: 'no_photos', candidates: read.candidates, skipped: read.skipped })

    // O cartão final (servidor) com o nome da marca, o preço e o site que a PÁGINA publicou.
    const price = read.price ? read.price.slice(0, 60) : null
    const cardPng = await renderShopEndCard({ business: body.brand, offer: price, contact: read.host.slice(0, 60), cta: DEMO_CARD_CTA[body.voice] })
    const card = cardPng ? await saveDemoImage(admin, uid, cardPng, 'png', 'demo-card', { host: read.host }) : null
    if (!card) return out(502, { error: 'card_failed' })

    // A marca (ad_brands da casa) e a cena (a régua e a moderação de sempre).
    let website: string | null = null
    try { website = adBrandWebsite(new URL(read.link).origin) ?? null } catch { website = null }
    const brandId = await ensureDemoBrand(admin, uid, body.brand, { website, price, voice: body.voice })
    const cena = await adsV2SceneForDraft({ scene: body.scene, kind: 'product' }, DEMO_TIER, user.id)
    if (!cena.ok) return readCore(cena.fail)

    // O rascunho pelo contrato do POST /api/ads/v2/orders.
    const parsed = sanitizeCreateOrderBody({ mode: 'simple', tier: DEMO_TIER, seconds: DEMO_SECONDS, sector: 'store', sentence: demoSentence(body.brand, read.sentence, read.title, ADS_V2_SENTENCE_MAX_CHARS), link: read.link, language: body.voice, narration: true, overlays: true, price, contact: read.host.slice(0, 80) })
    if (!parsed.ok) return out(400, { error: parsed.error })
    const o = parsed.value
    const ins = await admin
      .from('ads_v2_orders')
      .insert({
        user_id: uid,
        ...(brandId ? { brand_id: brandId } : {}),
        status: 'draft',
        tier: o.tier,
        seconds: o.seconds,
        sector: o.sector,
        brief: { sentence: o.sentence, link: o.link, mode: 'simple', overlays: true, price: o.price ?? null, contact: o.contact ?? null, source: 'demo_sob_medida', demo: { kind: 'sob_medida', brand: body.brand, voice: body.voice }, ...cena.fields },
        language: o.language,
        narration: true,
        logo_footage_id: null,
        card_footage_id: card.footage_id,
        card_url: card.url,
        photos: null,
      })
      .select('id')
      .maybeSingle()
    if (ins.error || !ins.data) return out(ins.error?.code === '42P01' || ins.error?.code === 'PGRST205' ? 503 : 502, { error: ins.error?.code === '42P01' || ins.error?.code === 'PGRST205' ? 'not_ready' : 'orders_failed' })
    const orderId = String((ins.data as { id: string }).id)
    await writeServerEvent({ name: 'ads_v2_order_created', userId: uid, path: PATH, metadata: { order_id: orderId, tier: o.tier, seconds: o.seconds, sector: 'store', has_link: true, has_sentence: true, narration: true, photos: photos.length, credits: cost, mode: 'simple', overlays: true, has_price: Boolean(price), has_contact: true, research_copied: false, source: 'demo_sob_medida', ...(brandId ? { brand_id: brandId } : {}) } })

    // O plano (o MESMO corpo do /plan), o ensaio de US$ 0 e o início (o MESMO /start: débito normal da casa).
    const caller = { id: user.id, email: user.email }
    const planBody = { mode: 'simple', order_id: orderId, sector: 'store', logo_footage_id: null, photos, videos: [], card_footage_id: card.footage_id, facts: [], scripts: false }
    const plan = await readCore(await adsV2PlanFor(caller, access, async () => planBody, Date.now())) // o prazo do modelo conta daqui (a leitura do link e as fotos já gastaram parte da requisição)
    if (plan.status !== 200) return out(plan.status, { ...plan.body, error: String(plan.body.error ?? 'plan_failed'), order_id: orderId })
    const dry = await readCore(await adsV2StartFor(caller, access, async () => ({ order_id: orderId, dry_run: true }), Date.now()))
    if (dry.status !== 200 || dry.body.dry_run !== true || dry.body.charged !== false) return out(dry.status === 200 ? 502 : dry.status, { error: 'dry_run_failed', detail: dry.body.error ?? null, order_id: orderId })
    const start = await readCore(await adsV2StartFor(caller, access, async () => ({ order_id: orderId }), Date.now()))
    if (start.status !== 202) return out(start.status, { error: String(start.body.error ?? 'start_failed'), order_id: orderId })

    await writeServerEvent({
      name: DEMO_EVENT_CREATED,
      userId: uid,
      path: PATH,
      metadata: {
        order_id: orderId, brand: body.brand, link: demoSafeLink(read.link), host: read.host, voice: body.voice, scene: Boolean(body.scene), week: demoWeekLabel(now),
        credits: cost, photos: photos.length, fal, ms: Date.now() - started, exception: cap.exception, ...(cap.exception ? { exception_reason: body.exceptionReason } : {}), ...(brandId ? { brand_id: brandId } : {}),
      },
    })
    return out(202, { order_id: orderId, status: 'generating', credits: cost, week: demoWeekLabel(now), count: (count ?? 0) + 1, cap: DEMO_WEEKLY_CAP, exception: cap.exception, usd_estimate: dry.body.usd_estimate ?? null })
  } catch (e) {
    console.warn('[admin/demo] falhou:', errOf(e))
    return out(502, { error: 'start_failed' })
  }
}

// ── depois da entrega ────────────────────────────────────────────────────────────────────────────────────────────────
interface DemoMeta { order_id: string; brand: string; voice: DemoVoiceLang; link: string; host: string; exception: boolean; exception_reason: string | null }
function demoMetaOf(raw: unknown): DemoMeta | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Record<string, unknown>
  if (typeof m.order_id !== 'string' || typeof m.brand !== 'string') return null
  return {
    order_id: m.order_id.toLowerCase(),
    brand: m.brand,
    voice: (typeof m.voice === 'string' ? m.voice : 'en') as DemoVoiceLang,
    link: typeof m.link === 'string' ? m.link : '',
    host: typeof m.host === 'string' ? m.host : '',
    exception: m.exception === true,
    exception_reason: typeof m.exception_reason === 'string' ? m.exception_reason : null,
  }
}

const KEEP_EDIT: AdsV2EditResolved = { overlays: null, cardUrl: null, music: 'keep', order: null }

/** Os formatos que faltam (4:5 e 1:1) dos MESMOS clipes, uma vez por pedido. Devolve quantos foram enviados. */
async function demoFormats(admin: SupabaseClient, order: AdsV2OrderRow, versions: readonly AdsV2VersionRow[]): Promise<number> {
  const b = editBaseFromOrder(order, (await loadAdsV2Shots(admin, order.id)) ?? [])
  if (!b.ok) return 0
  if (versions.some((v) => v.kind === 'format' && (v.base_version_id ?? null) === null)) return 0 // já pedido uma vez (mesmo que tenha falhado): nunca remonta sozinho
  const todo = adsV2MissingFormats(b.base.format)
  if (!todo.length || versions.length + todo.length > ADS_V2_EDIT_MAX_VERSIONS) return 0
  const rendering = await countRenderingVersions(admin, order.user_id)
  if (rendering === null || rendering + todo.length > ADS_V2_EDIT_MAX_RENDERING) return 0
  const batchId = randomUUID()
  let sent = 0
  for (const format of todo) {
    try {
      const source = buildVersionSource(b.base, KEEP_EDIT, format, order.language)
      await submitAdsV2Version(admin, { order, userId: order.user_id, kind: 'format', format, edit: KEEP_EDIT, source, baseVersionId: null, batchId })
      sent++
    } catch (e) {
      console.warn(`[demo-sob-medida] formato ${format} do pedido ${order.id} falhou:`, errOf(e))
    }
  }
  return sent
}

/** O link de aprovação da demo (com o nome da marca), uma vez por pedido. true = existe (já existia ou nasceu agora). */
async function demoApproval(admin: SupabaseClient, order: AdsV2OrderRow, meta: DemoMeta, secret: string): Promise<boolean> {
  const { hash } = demoApprovalToken(secret, order.id)
  const ex = await admin.from('ads_v2_approvals').select('id').eq('token_hash', hash).maybeSingle()
  if (ex.error) return false
  if (ex.data) return true
  if (!order.video_id) return false
  const v = await admin.from('videos').select('video_url').eq('id', order.video_id).eq('user_id', order.user_id).maybeSingle()
  const videoUrl = (v.data as { video_url?: string } | null)?.video_url ?? null
  if (!videoUrl) return false
  // A mesma forma do link de aprovação da agência (lib/ads/v2PostDeliveryServer.ts createAdsV2Approval), com o token DERIVADO:
  // cópia do MP4 para renders/share/<aleatório>.mp4 (o caminho de sempre tem o id da conta), linha com SÓ o hash do token.
  const path = adsV2RendersPath(videoUrl)
  if (!path) return false
  const dest = `share/${randomBytes(18).toString('base64url')}.mp4`
  const cp = await admin.storage.from('renders').copy(path, dest)
  if (cp.error) return false
  const mark = '/storage/v1/object/public/renders/'
  const shareUrl = videoUrl.slice(0, videoUrl.indexOf(mark) + mark.length) + dest
  const ins = await admin
    .from('ads_v2_approvals')
    .insert({ order_id: order.id, user_id: order.user_id, version_id: null, video_id: order.video_id, token_hash: hash, share_video_url: shareUrl, brand_name: meta.brand, lang: parseInterfaceLanguage(meta.voice), status: 'pending', expires_at: new Date(Date.now() + ADS_V2_APPROVAL_DAYS * 86_400_000).toISOString() })
    .select('id')
    .maybeSingle()
  if (ins.error || !ins.data) {
    await admin.storage.from('renders').remove([dest]).catch(() => null)
    return (ins.error as { code?: string } | null)?.code === '23505' // a outra volta (cron × tela) gravou primeiro: o link existe
  }
  await writeServerEvent({ name: 'ads_v2_approval_shared', userId: order.user_id, path: PATH, metadata: { order_id: order.id, approval_id: String((ins.data as { id: string }).id), version_id: null, video_id: order.video_id, lang: parseInterfaceLanguage(meta.voice), demo: true } })
  return true
}

/** Um passo de UMA demo entregue: formatos → avanço das versões → aprovação → evento de entregue. Nunca lança. */
export async function demoFollowUp(admin: SupabaseClient, order: AdsV2OrderRow, meta: DemoMeta, secret: string): Promise<{ formats_sent: number; approval: boolean; delivered: boolean }> {
  const res = { formats_sent: 0, approval: false, delivered: false }
  try {
    if (order.status !== 'delivered' || !order.video_id) return res
    let v = await loadAdsV2Versions(admin, order.id, order.user_id)
    if (v.error) return res
    res.formats_sent = await demoFormats(admin, order, v.rows)
    if (v.rows.some((r) => r.status === 'rendering') || res.formats_sent > 0) {
      await advanceAdsV2Versions(admin, order, order.user_id)
      v = await loadAdsV2Versions(admin, order.id, order.user_id)
    }
    res.approval = await demoApproval(admin, order, meta, secret)
    const formats = v.rows.filter((r) => r.kind === 'format' && (r.base_version_id ?? null) === null)
    if (res.approval && formats.length > 0 && !formats.some((r) => r.status === 'rendering')) {
      await writeServerEvent({ name: DEMO_EVENT_DELIVERED, userId: order.user_id, path: PATH, metadata: { order_id: order.id, brand: meta.brand, link: meta.link, formats: ['9:16', ...formats.filter((r) => r.status === 'delivered').map((r) => r.format)], formats_failed: formats.filter((r) => r.status === 'failed').map((r) => r.format) } })
      res.delivered = true
    }
  } catch (e) {
    console.warn(`[demo-sob-medida] pedido ${order.id}:`, errOf(e))
  }
  return res
}

/** As demos dos últimos DEMO_FOLLOW_DAYS dias ainda sem o evento de entregue: um passo de cada (cron e tela). Nunca lança. */
export async function advanceDemosSobMedida(admin: SupabaseClient, opts: { deadlineMs: number; secret: string | undefined; now?: Date }): Promise<{ scanned: number; formats_sent: number; approvals: number; delivered: number }> {
  const sum = { scanned: 0, formats_sent: 0, approvals: 0, delivered: 0 }
  if (!opts.secret) return sum
  try {
    const since = new Date((opts.now ?? new Date()).getTime() - DEMO_FOLLOW_DAYS * 86_400_000).toISOString()
    const created = await admin.from('events').select('id, user_id, metadata, created_at').eq('name', DEMO_EVENT_CREATED).gte('created_at', since).order('created_at', { ascending: false }).limit(40)
    if (created.error) return sum
    const done = await admin.from('events').select('metadata').eq('name', DEMO_EVENT_DELIVERED).gte('created_at', since).limit(200)
    if (done.error) return sum
    const delivered = new Set(((done.data ?? []) as { metadata: unknown }[]).map((r) => demoMetaOf(r.metadata)?.order_id).filter(Boolean))
    for (const ev of (created.data ?? []) as { user_id: string | null; metadata: unknown }[]) {
      if (Date.now() > opts.deadlineMs) break
      const meta = demoMetaOf(ev.metadata)
      if (!meta || delivered.has(meta.order_id) || !ev.user_id) continue
      const { order } = await loadAdsV2Order(admin, meta.order_id, ev.user_id)
      if (!order || order.status !== 'delivered' || !isDemoSobMedidaBrief(order.brief)) continue
      sum.scanned++
      const r = await demoFollowUp(admin, order, meta, opts.secret)
      sum.formats_sent += r.formats_sent
      if (r.approval) sum.approvals++
      if (r.delivered) sum.delivered++
    }
  } catch (e) {
    console.warn('[demo-sob-medida] avanço falhou:', errOf(e))
  }
  return sum
}

// ── a lista da semana (tela /admin/demo) ─────────────────────────────────────────────────────────────────────────────
export interface DemoRowView {
  order_id: string
  brand: string
  host: string
  link: string
  voice: string
  created_at: string
  status: DemoStatus
  order_status: string | null
  formats: { format: string; status: string }[]
  approval: { url: string; status: string; comment: string | null; viewed: boolean } | null
  messages: { en: string; es: string; de: string } | null
  exception: boolean
  exception_reason: string | null
}

/** As demos desta semana (semana ISO de Brasília), com estado, formatos, o link privado e o texto pronto. */
export async function listDemosOfWeek(admin: SupabaseClient, now: Date, secret: string | undefined, origin: string): Promise<{ rows: DemoRowView[]; error: boolean }> {
  const r = await admin.from('events').select('id, user_id, metadata, created_at').eq('name', DEMO_EVENT_CREATED).gte('created_at', demoWeekStart(now).toISOString()).order('created_at', { ascending: false }).limit(50)
  if (r.error) return { rows: [], error: true }
  const rows: DemoRowView[] = []
  for (const ev of (r.data ?? []) as { user_id: string | null; metadata: unknown; created_at: string }[]) {
    const meta = demoMetaOf(ev.metadata)
    if (!meta || !ev.user_id) continue
    const { order } = await loadAdsV2Order(admin, meta.order_id, ev.user_id)
    const v = order ? await loadAdsV2Versions(admin, order.id, order.user_id) : { rows: [] as AdsV2VersionRow[], error: null }
    const formats = v.rows.filter((x) => x.kind === 'format' && (x.base_version_id ?? null) === null).map((x) => ({ format: x.format, status: x.status }))
    let approval: DemoRowView['approval'] = null
    if (order && secret) {
      const t = demoApprovalToken(secret, order.id)
      const a = await admin.from('ads_v2_approvals').select('id, status, comment, viewed_at, revoked_at, expires_at').eq('token_hash', t.hash).maybeSingle()
      const row = a.data as { status: string; comment: string | null; viewed_at: string | null; revoked_at: string | null; expires_at: string } | null
      if (row) approval = { url: `${origin}/approve#${t.token}`, status: row.revoked_at ? 'revoked' : row.status === 'pending' && Date.parse(row.expires_at) <= now.getTime() ? 'expired' : row.status, comment: row.comment, viewed: Boolean(row.viewed_at) }
    }
    const status = demoStatus({ orderStatus: order?.status ?? null, formats, approval: Boolean(approval) })
    rows.push({
      order_id: meta.order_id,
      brand: meta.brand,
      host: meta.host,
      link: meta.link,
      voice: meta.voice,
      created_at: ev.created_at,
      status,
      order_status: order?.status ?? null,
      formats: [{ format: '9:16', status: order?.status === 'delivered' ? 'delivered' : order?.status ?? 'unknown' }, ...formats],
      approval,
      messages: approval && status === 'pronta' ? { en: demoMessage('en', approval.url), es: demoMessage('es', approval.url), de: demoMessage('de', approval.url) } : null,
      exception: meta.exception,
      exception_reason: meta.exception_reason,
    })
  }
  return { rows, error: false }
}
