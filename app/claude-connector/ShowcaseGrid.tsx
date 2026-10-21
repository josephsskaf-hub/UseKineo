'use client'

// KINEO-MCP-STUDIO-AJUSTE-2010 — a vitrine da /claude-connector (fundador 20/10: a página escura com vídeos velhos estava
// "muito feia"): 9 vídeos numa grade limpa — 3 anúncios UGC, 3 anúncios de produto (Close real / Studio Ads) e 3 filmes.
// NENHUM render novo: só clipes que o site JÁ serve em público e já usa — os 3 cards da home (lib/ui/homeThreeCards.ts),
// as amostras de apresentador e de estilo do Studio Ads (lib/ads/v2Flow.ts ADS_V2_START_FROM) e os filmes da porta da home
// (lib/ui/homeTwoDoors.ts, motor conferido lá). Todos 9:16, mudos, em loop, playsInline, com pôster. LEVE: o vídeo só
// recebe `src` quando a grade chega perto da tela (IntersectionObserver); antes disso, e sem JS, aparece o pôster. Quadro 4:5
// (recorte central do 9:16) numa grade de até 960 px: as 3 fileiras cabem sem virar um paredão no computador.
// Selo honesto: o produto/motor real do clipe, nunca preço.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { MCP_PALETTE as C } from './palette'

export type ShowcaseClip = { src: string; poster: string; title: string; badge: string }
export type ShowcaseGroup = { key: 'ugc' | 'product' | 'films'; label: string; line: string; href: string; clips: readonly ShowcaseClip[] }

export const SHOWCASE_GROUPS: readonly ShowcaseGroup[] = [
  {
    key: 'ugc',
    label: 'UGC ads',
    line: 'An AI person holds the product and tells why to buy.',
    href: '/ads',
    clips: [
      { src: '/previews/home-card-ugc-presenter.mp4', poster: '/posters/home-card-ugc-presenter.webp', title: 'Perfume, told by an AI presenter', badge: 'Studio Ads · Kling Avatar' },
      { src: '/ads/presenters/sofia.mp4', poster: '/ads/presenters/sofia.webp', title: 'Sofia, UGC presenter', badge: 'Studio Ads · UGC' },
      { src: '/ads/presenters/amara.mp4', poster: '/ads/presenters/amara.webp', title: 'Amara, UGC in the snow', badge: 'Studio Ads · UGC' },
    ],
  },
  {
    key: 'product',
    label: 'Product ads',
    line: 'Real product photos become a ready-to-run ad.',
    href: '/ads',
    clips: [
      { src: '/previews/home-card-close-real-en.mp4', poster: '/posters/home-card-close-real-en.webp', title: 'LUME perfume, real product close-up', badge: 'Studio Ads · Close' },
      { src: '/ads-styles/product_closeup.mp4', poster: '/ads-styles/product_closeup.jpg', title: 'Product close-up in the rain', badge: 'Studio Ads' },
      { src: '/ads-styles/giant_product.mp4', poster: '/ads-styles/giant_product.jpg', title: 'Giant product in neon', badge: 'Studio Ads' },
    ],
  },
  {
    key: 'films',
    label: 'Films',
    line: 'Type an idea, get a narrated Short in minutes.',
    href: '/studio',
    clips: [
      { src: '/previews/home-card-film-flannan.mp4', poster: '/posters/home-card-film-flannan.webp', title: 'The Flannan Isles lighthouse', badge: 'Seedance 1.5' },
      { src: '/previews/door-07252598-1392-4226-b5d5-d02bd892d69b.mp4', poster: '/posters/door-07252598-1392-4226-b5d5-d02bd892d69b.webp', title: 'The deep-sea robot', badge: 'Kling 3' },
      { src: '/previews/door-d16781b8-0557-4c7e-b339-3bf048ff700c.mp4', poster: '/posters/door-d16781b8-0557-4c7e-b339-3bf048ff700c.webp', title: 'Titanic', badge: 'Veo 3.1' },
    ],
  },
]

export default function ShowcaseGrid() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setNear(true)
        io.disconnect()
      }
    }, { rootMargin: '300px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const tile: CSSProperties = { position: 'relative', aspectRatio: '4 / 5', borderRadius: 18, overflow: 'hidden', background: C.placeholder, border: `1px solid ${C.line}`, boxShadow: C.shadowHi, minWidth: 0 }
  const badge: CSSProperties = { position: 'absolute', left: 8, top: 8, maxWidth: 'calc(100% - 16px)', background: C.overlay, color: C.onOverlay, borderRadius: 999, padding: '4px 9px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
  const caption: CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 10px 10px', background: `linear-gradient(180deg, transparent, ${C.overlay})`, color: C.onOverlay, fontSize: 'clamp(0.72rem, 2.6vw, 0.86rem)', fontWeight: 650, lineHeight: 1.25 }

  return (
    <div ref={ref} style={{ display: 'grid', gap: 'clamp(22px, 4vw, 34px)', maxWidth: 960, margin: '0 auto' }}>
      {SHOWCASE_GROUPS.map((g) => (
        <div key={g.key}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
            <p style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>
              {g.label} <span style={{ fontWeight: 500, color: C.muted, fontSize: '0.92rem' }}>· {g.line}</span>
            </p>
            <a href={g.href} style={{ color: C.accent, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Open in Kineo →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'clamp(8px, 2vw, 16px)' }}>
            {g.clips.map((c) => (
              <figure key={c.src} style={{ ...tile, margin: 0 }}>
                <video
                  src={near ? c.src : undefined}
                  poster={c.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="none"
                  aria-label={`${c.title} — made with Kineo (${c.badge})`}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <span style={badge}>{c.badge}</span>
                <figcaption style={caption}>{c.title}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
