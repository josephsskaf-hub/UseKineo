// KINEO-SHOPIFY-2026-10-13 — o anúncio de 15 s do produto, feito DENTRO do admin da Shopify (etapa 2; a etapa 1 abria o site
// numa aba nova e seria reprovada pelo requisito 2.2.2).
//
// POST { product_id, tier, style?, action:'plan' }  → o produto vira o pedido na conta Kineo da loja e é PLANEJADO (sem cobrar):
//   fotos do produto (CDN da Shopify → NOSSO storage, travas do link-import) → cartão final (PNG do servidor) → rascunho pelo
//   contrato do /api/ads/v2/orders → adsV2PlanFor (o MESMO corpo do /api/ads/v2/plan: moderação, teto do dia, amostra, posse das
//   fotos, régua anti-invenção). Devolve o texto, o custo e o saldo para a tela mostrar ANTES de gastar.
// POST { action:'start', order_id, extra? } → adsV2StartFor (o MESMO corpo do /api/ads/v2/start: saldo, trava, chargeAdsV2,
//   amostra sem débito, estorno). Plano pago sem saldo + extra:true = 1 anúncio extra de US$ 7 pelo medidor da Shopify
//   (lib/shopify/billing.ts chargeExtraAd: tetos nossos por dia/mês), que concede os créditos que o /start debita. Nenhum caminho
//   paralelo de dinheiro: esta rota não debita, não estorna e não chama a fal.
//
// ORDEM DAS TRAVAS: interruptor (404) → porta da loja (lib/shopify/request.ts: credenciais, sessão, token da loja, conta) →
// corpo (400) → acesso da conta (gate do Studio Ads; free = só a amostra, só no nível dela) → ... como acima.
import { NextRequest } from 'next/server'
import { shopifyAppLive, shopifyNotFound, sanitizeShopAdBody, SHOPIFY_EXTRA_AD, type ShopifyPlanId } from '@/lib/shopify/core'
import { shopJson, shopRequestContext } from '@/lib/shopify/request'
import { shopAdsAccess } from '@/lib/shopify/account'
import { chargeExtraAd } from '@/lib/shopify/billing'
import { createShopDraft, importProductPhotos, readProductForAd, saveShopCard } from '@/lib/shopify/adFlow'
import { adsGate, adsSampleOpen } from '@/lib/ads/serverAccess'
import { ADS_SAMPLE_FOOTAGE_MAX_BYTES, ADS_SAMPLE_TIER } from '@/lib/ads/sample'
import { adsV2Credits } from '@/lib/ads/v2Tiers'
import { loadAdsV2Order } from '@/lib/ads/v2Advance'
import { adsV2PlanFor } from '@/lib/ads/v2PlanCore'
import { adsV2StartFor } from '@/lib/ads/v2StartCore'
import { FOOTAGE_QUOTA_PAID } from '@/lib/userFootage'
import { writeServerEvent } from '@/lib/serverEvents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 120

/** O corpo JSON da resposta do núcleo (NextResponse) — a tela recebe o mesmo `error` que o site receberia. */
async function readCore(res: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, body }
}

export async function POST(req: NextRequest) {
  if (!shopifyAppLive()) return shopifyNotFound()
  const started = Date.now()
  const gateIn = await shopRequestContext(req)
  if (!gateIn.ok) return gateIn.res
  const { ctx } = gateIn
  const body = sanitizeShopAdBody(await req.json().catch(() => null))
  if (!body.ok) return shopJson({ error: body.error }, 400)
  const user = { id: ctx.userId, email: ctx.email }
  const access = await shopAdsAccess(ctx.userId, ctx.email, ctx.link)
  const plan = (ctx.link.plan_handle as ShopifyPlanId | null) ?? null

  if (body.action === 'start') {
    const { order, error } = await loadAdsV2Order(ctx.admin, body.orderId, ctx.userId)
    if (error) return shopJson({ error: 'not_ready' }, 503)
    if (!order) return shopJson({ error: 'order_not_found' }, 404)
    // Plano pago sem saldo: o anúncio extra (US$ 7) só com o pedido EXPLÍCITO da tela (o botão mostra o preço antes).
    if (adsGate(access.reason) === 'ok') {
      const cost = adsV2Credits(order.tier, order.seconds as 15 | 20 | 30)
      const prof = await ctx.admin.from('profiles').select('video_credits').eq('id', ctx.userId).maybeSingle()
      const balance = Number((prof.data as { video_credits?: number } | null)?.video_credits ?? 0)
      if (!(balance >= cost)) {
        const extraOk = (plan === 'starter' || plan === 'business') && cost <= SHOPIFY_EXTRA_AD.maxCredits
        if (!body.extra) return shopJson({ error: 'out_of_credits', needed: cost, balance, extra_available: extraOk, extra_usd: SHOPIFY_EXTRA_AD.usd }, 402)
        const charged = await chargeExtraAd(ctx.admin, { link: ctx.link, plan, userId: ctx.userId, orderId: order.id, credits: cost }) // US$ 7 = os créditos de UM anúncio inteiro (o saldo que já havia fica)
        if (!charged.ok) return shopJson({ error: charged.error }, charged.error === 'daily_cap' || charged.error === 'monthly_cap' ? 429 : charged.error === 'billing_busy' ? 409 : 402)
      }
    }
    const out = await readCore(await adsV2StartFor(user, access, async () => ({ order_id: order.id }), started))
    if (out.status === 202) await writeServerEvent({ name: 'shopify_ad_started', userId: ctx.userId, path: '/api/shopify/ads', metadata: { shop: ctx.shop, order_id: order.id, extra: body.extra } })
    return shopJson(out.body, out.status)
  }

  // ── action 'plan' ────────────────────────────────────────────────────────────────────────────────────────────────
  // Portas baratas ANTES de baixar foto ou desenhar cartão (o /plan confere tudo de novo).
  const gate = adsGate(access.reason)
  const sample = gate === 'no_access' && (await adsSampleOpen(access.admin, ctx.userId, access.reason))
  if (gate === 'closed') return shopJson({ error: 'closed' }, 403)
  if (gate !== 'ok' && !sample) return shopJson({ error: 'plan_required' }, 402)
  if (gate !== 'ok' && body.tier !== ADS_SAMPLE_TIER) return shopJson({ error: 'sample_level_only', sample_tier: ADS_SAMPLE_TIER }, 403)

  const product = await readProductForAd(ctx.shop, ctx.accessToken, body.productId)
  if (!product) return shopJson({ error: 'shopify_unavailable' }, 502)
  if ('missing' in product) return shopJson({ error: 'product_not_found' }, 404)
  if (!product.photoUrls.length) return shopJson({ error: 'no_photos' }, 422)
  const imported = await importProductPhotos(ctx.admin, ctx.userId, ctx.shop, product.photoUrls, gate === 'ok' ? FOOTAGE_QUOTA_PAID : ADS_SAMPLE_FOOTAGE_MAX_BYTES)
  if (!imported.photos.length) return shopJson({ error: 'photos_unavailable', skipped: imported.skipped }, 422)
  const card = await saveShopCard(ctx.admin, ctx.userId, ctx.shop, { business: product.shopName, offer: product.price, contact: product.shopHost })
  if (!card) return shopJson({ error: 'card_failed' }, 502)
  const draft = await createShopDraft(ctx.admin, ctx.userId, { tier: body.tier, product, cardFootageId: card.footage_id, cardUrl: card.url })
  if (!draft.ok) return shopJson({ error: draft.error }, draft.error === 'not_ready' ? 503 : 502)
  await writeServerEvent({ name: 'ads_v2_order_created', userId: ctx.userId, path: '/api/shopify/ads', metadata: { order_id: draft.orderId, tier: body.tier, seconds: 15, sector: 'store', has_link: Boolean(product.link), has_sentence: true, narration: true, photos: imported.photos.length, credits: adsV2Credits(body.tier, 15), mode: 'simple', overlays: true, has_price: Boolean(product.price), has_contact: Boolean(product.shopHost), research_copied: false, source: 'shopify', shop: ctx.shop } })

  const planBody = {
    mode: 'simple',
    order_id: draft.orderId,
    sector: 'store',
    logo_footage_id: null,
    photos: imported.photos.map((p) => ({ footage_id: p.footage_id, kind: 'product' })),
    videos: [],
    card_footage_id: card.footage_id,
    facts: [],
    ...(body.style ? { style: body.style } : {}),
  }
  const out = await readCore(await adsV2PlanFor(user, access, async () => planBody, started))
  if (out.status !== 200) return shopJson({ ...out.body, order_id: draft.orderId }, out.status)
  const prof = await ctx.admin.from('profiles').select('video_credits').eq('id', ctx.userId).maybeSingle()
  const balance = Number((prof.data as { video_credits?: number } | null)?.video_credits ?? 0)
  const cost = Number(out.body.credits ?? 0)
  await writeServerEvent({ name: 'shopify_ad_planned', userId: ctx.userId, path: '/api/shopify/ads', metadata: { shop: ctx.shop, order_id: draft.orderId, tier: body.tier, style: body.style, sample, photos: imported.photos.length } })
  return shopJson({
    order_id: draft.orderId,
    product: product.title,
    narration: out.body.narration ?? null,
    overlays: out.body.overlays ?? [],
    credits: cost,
    balance,
    sample,
    style: out.body.style ?? null,
    extra_available: gate === 'ok' && balance < cost && (plan === 'starter' || plan === 'business') && cost <= SHOPIFY_EXTRA_AD.maxCredits,
    extra_usd: SHOPIFY_EXTRA_AD.usd,
  })
}
