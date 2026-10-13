// KINEO-SHOPIFY-2026-10-13 — a porta do site para o anúncio que nasceu no app da Shopify.
//
// /shopify/open?link=<página pública do produto> (montado por lib/shopify/core.ts adHandoffPath):
//   interruptor (404) → link https válido (400) → sem login na Kineo = /login?redirect=<esta mesma porta> (o link sobrevive ao
//   login; a página /ads/v2 manda para /login?redirect=/ads/v2 e perderia o link) → com login = /ads/v2?from=shopify&link=…,
//   onde o modo simples põe o link no campo e lê as fotos (AdsV2Simple.tsx, KINEO-SHOPIFY-2026-10-13).
// Nenhum crédito, pedido ou chamada à Shopify aqui.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adHandoffPath, productLinkForAd, shopifyAppLive, shopifyNotFound } from '@/lib/shopify/core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!shopifyAppLive()) return shopifyNotFound()
  const link = productLinkForAd(req.nextUrl.searchParams.get('link'))
  if (!link) return NextResponse.json({ error: 'invalid_link' }, { status: 400 })
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const dest = req.nextUrl.clone()
  dest.search = ''
  if (!user) {
    dest.pathname = '/login'
    dest.searchParams.set('redirect', adHandoffPath(link))
  } else {
    dest.pathname = '/ads/v2'
    dest.searchParams.set('from', 'shopify')
    dest.searchParams.set('link', link)
  }
  return NextResponse.redirect(dest, 302)
}
