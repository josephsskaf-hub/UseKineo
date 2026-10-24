'use client'

// KINEO-CARDS-GIRO-2410 — compatibility entry; the playlist and framing now live with all four home cards.
import HomeCardCycleMedia from '@/components/home/HomeCardCycleMedia'

export default function HomeProductAdsReel({ language }: { language: string }) {
  return <HomeCardCycleMedia card="product_ads" language={language} />
}
