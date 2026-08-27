'use client'

// KINEO-UX10-2026-08-15 #6/#9 — fileira Trending com setas de navegacao no
// desktop (a fileira deslizava sem nenhuma affordance) + fade na borda
// indicando continuacao. Os cards ganham shimmer enquanto o video nao chega.
import Link from 'next/link'
import { useRef } from 'react'
import WallMedia from '@/components/WallMedia'
import type { WallVideo } from '@/lib/engineWall'

export default function TrendingRow({ videos }: { videos: WallVideo[] }) {
  const rowRef = useRef<HTMLDivElement | null>(null)
  const nudge = (dir: number) => {
    const el = rowRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }
  return (
    <div className="tr-wrap">
      <button type="button" className="tr-nav tr-prev" aria-label="Scroll back" onClick={() => nudge(-1)}>‹</button>
      <div className="tr-row" ref={rowRef}>
        {videos.map((v) => (
          <Link key={v.id} href={v.href ?? `/v/${v.id}`} className="tr-card">
            <span className="tr-media" aria-hidden="true"><WallMedia src={v.videoUrl} /></span>
            <span className="tr-badge">{v.badge}</span>
            <span className="tr-title">{v.title}</span>
          </Link>
        ))}
      </div>
      <button type="button" className="tr-nav tr-next" aria-label="Scroll forward" onClick={() => nudge(1)}>›</button>
    </div>
  )
}
