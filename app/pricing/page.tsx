import type { Metadata } from 'next'
import PricingClient from './PricingClient'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
// KINEO-PRICING-V6-2026-08-19 — preço derivado de TIER_PRICES via
// lib/marketingPrice.ts. Digitado à mão ele já sobreviveu a duas mudanças
// de tabela publicando um valor que o checkout não cobrava mais.
import { STARTER_MONTH } from '@/lib/marketingPrice'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

// PUSH #92 — P0 canonical bug fix. This page used to be 'use client' at L1,
// which meant it could not export `metadata` at all — it silently inherited
// the root layout's canonical (the homepage), telling Google /pricing (a
// priority: 0.9 page in sitemap.ts) is a duplicate of `/`. The client
// component body moved verbatim to ./PricingClient.tsx; this file is now a
// server component whose only job is metadata + rendering it.
export const metadata: Metadata = {
  title: 'Kineo Pricing — AI YouTube Shorts Generator Plans',
  description:
    `${ft(OFFER, 'Create up to 3 watermarked Fast videos every 24h with no card.', OFFER.copy.headline)} Paid plans start at ${STARTER_MONTH} — the same price worldwide — and unlock clean, watermark-free MP4 exports.`,
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Kineo Pricing — AI YouTube Shorts Generator Plans',
    description:
      `${ft(OFFER, 'Create up to 3 watermarked Fast videos every 24h with no card.', OFFER.copy.headline)} Paid plans start at ${STARTER_MONTH} — the same price worldwide — and unlock clean, watermark-free MP4 exports.`,
    url: 'https://www.usekineo.com/pricing',
    siteName: 'Kineo',
    images: [
      {
        url: 'https://www.usekineo.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kineo Pricing',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kineo Pricing — AI YouTube Shorts Generator Plans',
    description:
      `${ft(OFFER, 'Create up to 3 watermarked Fast videos every 24h with no card.', OFFER.copy.headline)} Paid plans start at ${STARTER_MONTH} — the same price worldwide — and unlock clean, watermark-free MP4 exports.`,
    images: ['https://www.usekineo.com/og-image.png'],
  },
}

export default function PricingPage() {
  return <PricingClient />
}
