'use client'

// KINEO-CARDS-GIRO-2410 — compatibility entry; the playlist and framing now live with all four home cards.
import HomeCardCycleMedia from '@/components/home/HomeCardCycleMedia'
import { HOME_CARD_TRAILERS_0411 } from '@/lib/ui/homeCardsTrailer0411' // KINEO-CARDS-TRAILER-4-0411

export default function HomeProductAdsReel({ language }: { language: string }) {
  return <HomeCardCycleMedia card="product_ads" language={language} playlist={HOME_CARD_TRAILERS_0411.product_ads} />
}
