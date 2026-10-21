'use client'

// KINEO-MCP-STUDIO-AJUSTE-2010 — a vitrine da /claude-connector (fundador 20/10: a página escura com vídeos velhos estava
// "muito feia"): 9 vídeos numa grade limpa — 3 anúncios UGC, 3 anúncios de produto (Close real / Studio Ads) e 3 filmes.
// NENHUM render novo: só clipes que o site JÁ serve em público e já usa — os 3 cards da home (lib/ui/homeThreeCards.ts),
// as amostras de apresentador e de estilo do Studio Ads (lib/ads/v2Flow.ts ADS_V2_START_FROM) e os filmes da porta da home
// (lib/ui/homeTwoDoors.ts, motor conferido lá). Todos 9:16, mudos, em loop, playsInline, com pôster. LEVE: o vídeo só
// recebe `src` quando a grade chega perto da tela (IntersectionObserver); antes disso, e sem JS, aparece o pôster. Quadro 4:5
// … (era 4:5) — KINEO-MCP-STUDIO-AJUSTE-2010, polimento: quadro 9:16 INTEIRO (nenhum letreiro gravado no clipe fica cortado na
// borda), grade de até 720 px; o título vai ABAIXO do quadro (fora do vídeo, nada de texto por cima do letreiro do clipe) e no
// vídeo fica só um selo curto do motor/produto, no canto de baixo, que cabe inteiro a 390 px.
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
      { src: '/previews/home-card-ugc-presenter.mp4', poster: '/posters/home-card-ugc-presenter.webp', title: 'Perfume, told by an AI presenter', badge: 'Kling Avatar' },
      { src: '/ads/presenters/sofia.mp4', poster: '/ads/presenters/sofia.webp', title: 'Sofia, UGC presenter', badge: 'Studio Ads' },
      { src: '/ads/presenters/amara.mp4', poster: '/ads/presenters/amara.webp', title: 'Amara, UGC in the snow', badge: 'Studio Ads' },
    ],
  },
  {
    key: 'product',
    label: 'Product ads',
    line: 'Real product photos become a ready-to-run ad.',
    href: '/ads',
    clips: [
      { src: '/previews/home-card-close-real-en.mp4', poster: '/posters/home-card-close-real-en.webp', title: 'LUME perfume, real product close-up', badge: 'Studio Ads' },
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

const SHOWCASE_PT = { // KINEO-PAGINAS-CONECTOR-2110
  ugc: { label: 'Anúncios UGC', line: 'Uma pessoa de IA apresenta o produto.', titles: ['Perfume com apresentadora de IA', 'Sofia, apresentadora UGC', 'Amara, UGC na neve'] }, // KINEO-PAGINAS-CONECTOR-2110
  product: { label: 'Anúncios de produto', line: 'Fotos reais viram um anúncio pronto.', titles: ['Perfume LUME em close real', 'Produto em close na chuva', 'Produto gigante em neon'] }, // KINEO-PAGINAS-CONECTOR-2110
  films: { label: 'Filmes', line: 'Uma ideia vira um Short narrado.', titles: ['O farol das Ilhas Flannan', 'O robô do fundo do mar', 'Titanic'] }, // KINEO-PAGINAS-CONECTOR-2110
} as const // KINEO-PAGINAS-CONECTOR-2110
export default function ShowcaseGrid({ locale = 'en' }: { locale?: 'en' | 'pt' } = {}) { // KINEO-PAGINAS-CONECTOR-2110
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

  const tile: CSSProperties = { position: 'relative', aspectRatio: '9 / 16', borderRadius: 16, overflow: 'hidden', background: C.placeholder, border: `1px solid ${C.line}`, boxShadow: C.shadowHi, minWidth: 0 }
  const badge: CSSProperties = { position: 'absolute', left: 6, bottom: 6, background: C.overlay, color: C.onOverlay, borderRadius: 999, padding: '3px 7px', fontSize: 'clamp(9px, 2.4vw, 10.5px)', fontWeight: 700, letterSpacing: '0.01em', whiteSpace: 'nowrap', lineHeight: 1.3 }
  const caption: CSSProperties = { margin: '8px 2px 0', color: C.body, fontSize: 'clamp(0.74rem, 2.6vw, 0.88rem)', fontWeight: 600, lineHeight: 1.3 }

  return (
    <div ref={ref} style={{ display: 'grid', gap: 'clamp(22px, 4vw, 34px)', maxWidth: 720, margin: '0 auto' }}>
      {SHOWCASE_GROUPS.map((g) => (
        <div key={g.key}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
            <p style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>
              {locale === 'pt' ? SHOWCASE_PT[g.key].label : g.label} <span style={{ fontWeight: 500, color: C.muted, fontSize: '0.92rem' }}>· {locale === 'pt' ? SHOWCASE_PT[g.key].line : g.line}</span> {/* KINEO-PAGINAS-CONECTOR-2110 */}
            </p>
            <a href={g.href} style={{ color: C.accent, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{locale === 'pt' ? 'Abrir na Kineo →' : 'Open in Kineo →'}</a> {/* KINEO-PAGINAS-CONECTOR-2110 */}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'clamp(8px, 2vw, 16px)' }}>
            {g.clips.map((c, index) => ( // KINEO-PAGINAS-CONECTOR-2110
              <figure key={c.src} style={{ margin: 0, minWidth: 0 }}>
                <div style={tile}>
                  <video
                    src={near ? c.src : undefined}
                    poster={c.poster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-label={locale === 'pt' ? `${SHOWCASE_PT[g.key].titles[index]} — feito na Kineo (${c.badge})` : `${c.title} — made with Kineo (${c.badge})` /* KINEO-PAGINAS-CONECTOR-2110 */}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <span style={badge}>{c.badge}</span>
                </div>
                <figcaption style={caption}>{locale === 'pt' ? SHOWCASE_PT[g.key].titles[index] : c.title}</figcaption> {/* KINEO-PAGINAS-CONECTOR-2110 */}
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
