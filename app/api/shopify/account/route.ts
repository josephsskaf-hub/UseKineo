// KINEO-SHOPIFY-2026-10-13 — o resumo da conta Kineo da loja para a tela embutida: plano, saldo, amostra grátis, níveis e preço
// de cada um, estilos, o anúncio extra (US$ 7, tetos) e o endereço da página de planos da Shopify.
//
// O plano é relido na Partner API (lib/shopify/billing.ts syncShopPlan, que também concede o crédito do ciclo — idempotente por
// loja + ciclo) quando a tela volta da página de planos (`plan_handle` na URL: só DISPARA a releitura; o plano NUNCA vem dela)
// ou quando a última leitura passou de 10 min. A Partner API fora do ar não derruba a tela: vale o plano gravado.
import { NextRequest } from 'next/server'
import { shopifyAppLive, shopifyNotFound, pricingPlansUrl, SHOPIFY_EXTRA_AD, SHOPIFY_PLANS, attachMediaEnabled, type ShopifyPlanId } from '@/lib/shopify/core'
// Acréscimos do fundador (13/10): posicionamento por plano, lembrete semanal dentro do app e o cartão de avaliação sem incentivo.
import { SHOPIFY_PLAN_PITCH, appStoreReviewUrl, showReviewCard, weeklyAdReady } from '@/lib/shopify/core'
import { shopJson, shopRequestContext } from '@/lib/shopify/request'
import { shopAdsAccess } from '@/lib/shopify/account'
import { extraAdUsage, syncShopPlan } from '@/lib/shopify/billing'
import { adsGate, adsSampleOpen } from '@/lib/ads/serverAccess'
import { ADS_SAMPLE_TIER } from '@/lib/ads/sample'
import { ADS_V2_TIER_IDS, adsV2Credits } from '@/lib/ads/v2Tiers'
import { ADS_V2_STYLES, ADS_V2_STYLES_PUBLIC } from '@/lib/ads/v2Styles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 30

const PLAN_REFRESH_MS = 10 * 60 * 1000

export async function GET(req: NextRequest) {
  if (!shopifyAppLive()) return shopifyNotFound()
  const gateIn = await shopRequestContext(req)
  if (!gateIn.ok) return gateIn.res
  const { ctx } = gateIn
  let link = ctx.link
  const back = req.nextUrl.searchParams.has('plan_handle')
  const stale = !link.plan_checked_at || Date.now() - Date.parse(link.plan_checked_at) > PLAN_REFRESH_MS
  let granted = 0
  if (back || stale) {
    const s = await syncShopPlan(ctx.admin, ctx.shop)
    if (s.state === 'synced') {
      link = s.link
      granted = s.credits
    }
  }
  const access = await shopAdsAccess(ctx.userId, ctx.email, link)
  const gate = adsGate(access.reason)
  const sample = gate === 'no_access' && (await adsSampleOpen(access.admin, ctx.userId, access.reason))
  const prof = await ctx.admin.from('profiles').select('video_credits').eq('id', ctx.userId).maybeSingle()
  const usage = await extraAdUsage(ctx.admin, ctx.shop)
  const plan = (link.plan_handle as ShopifyPlanId | null) ?? 'free'
  const credits = Number((prof.data as { video_credits?: number } | null)?.video_credits ?? 0)
  // O último anúncio COMEÇADO (lembrete semanal) e quantos foram ENTREGUES (o cartão de avaliação só depois do 1º). Só leitura.
  const last = await ctx.admin.from('ads_v2_orders').select('started_at').eq('user_id', ctx.userId).not('started_at', 'is', null).order('started_at', { ascending: false }).limit(1)
  const lastStartedAt = !last.error && Array.isArray(last.data) ? ((last.data[0] as { started_at?: string | null } | undefined)?.started_at ?? null) : null
  const done = await ctx.admin.from('ads_v2_orders').select('id', { count: 'exact', head: true }).eq('user_id', ctx.userId).eq('status', 'delivered')
  const deliveredAds = done.error ? 0 : done.count ?? 0
  const reviewUrl = appStoreReviewUrl()
  return shopJson({
    plan,
    plan_status: link.plan_status,
    plan_credits: SHOPIFY_PLANS[plan]?.credits ?? 0,
    granted_now: granted,
    credits,
    pitch: SHOPIFY_PLAN_PITCH,
    weekly_ready: !last.error && weeklyAdReady({ plan, credits, lastStartedAt, now: new Date() }),
    delivered_ads: deliveredAds,
    review_url: reviewUrl,
    review_card: showReviewCard({ reviewUrl, deliveredAds }),
    access: gate,
    sample_available: sample,
    sample_tier: ADS_SAMPLE_TIER,
    tiers: ADS_V2_TIER_IDS.map((id) => ({ id, credits: adsV2Credits(id, 15) })),
    styles: ADS_V2_STYLES_PUBLIC ? ADS_V2_STYLES.map((s) => ({ key: s.key, label: s.label, one_line: s.oneLine })) : [],
    extra: { usd: SHOPIFY_EXTRA_AD.usd, max_credits: SHOPIFY_EXTRA_AD.maxCredits, daily_cap: SHOPIFY_EXTRA_AD.dailyCap, monthly_cap: SHOPIFY_EXTRA_AD.monthlyCap, used_today: usage?.today ?? null, used_month: usage?.month ?? null },
    pricing_url: pricingPlansUrl(ctx.shop, (process.env.SHOPIFY_APP_HANDLE ?? '').trim() || 'kineo-ads'),
    attach_media: attachMediaEnabled(),
  })
}
