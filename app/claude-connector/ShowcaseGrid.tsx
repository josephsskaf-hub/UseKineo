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
import { trackEvent } from '@/lib/analytics'
import { vitrineSelo, type VitrineClipe } from '@/lib/seo/vitrinePaginas1011'

export type ShowcaseClip = { src: string; poster: string; title: string; badge: string }
export type ShowcaseGroup = { key: 'ugc' | 'product' | 'films'; label: string; line: string; href: string; clips: readonly ShowcaseClip[] }

export const SHOWCASE_GROUPS: readonly ShowcaseGroup[] = [
  {
    key: 'ugc',
    label: 'UGC ads',
    line: 'An AI person shows the product while a voiceover tells why to buy.',
    href: '/ads',
    clips: [
      { src: '/previews/home-card-ugc-presenter.mp4', poster: '/posters/home-card-ugc-presenter.webp', title: 'Perfume, told by an AI presenter', badge: 'Kling Avatar' },
      // KINEO-CONECTOR-VITRINE-3110 — fundador 30/10 ("melhora os vídeos, coloca os mais atualizados"): os clipes de criador de 27/10 (Kling 3).
      { src: '/previews/home-card-novo-ugc_serum.mp4', poster: '/posters/home-card-novo-ugc_serum.webp', title: 'Serum selfie review', badge: 'Kling 3' },
      { src: '/previews/home-card-novo-ugc_unboxing.mp4', poster: '/posters/home-card-novo-ugc_unboxing.webp', title: 'Kitchen unboxing', badge: 'Kling 3' },
    ],
  },
  {
    key: 'product',
    label: 'Product ads',
    line: 'Real product photos become a ready-to-run ad.',
    href: '/ads',
    clips: [
      // KINEO-CONECTOR-VITRINE-3110 — os anúncios de produto de 27/10 (os mesmos do card da home; clipes Kling 3 conferidos no banco).
      { src: '/previews/home-card-novo-smartwatch.mp4', poster: '/posters/home-card-novo-smartwatch.webp', title: 'Smartwatch builds itself in the air', badge: 'Kling 3' },
      { src: '/previews/home-card-novo-iced_coffee.mp4', poster: '/posters/home-card-novo-iced_coffee.webp', title: 'Iced coffee in slow motion', badge: 'Kling 3' },
      { src: '/previews/home-card-novo-headphones.mp4', poster: '/posters/home-card-novo-headphones.webp', title: 'Headphones, exploded view', badge: 'Kling 3' },
    ],
  },
  {
    key: 'films',
    label: 'Films',
    line: 'Type an idea, get a narrated Short in minutes.',
    href: '/studio',
    clips: [
      // KINEO-CONECTOR-VITRINE-3110 — o filme mais novo da casa (Kling 4.0, 30/10) e o lobisomem da galeria (Kling 3) na frente; o Titanic fica.
      { src: '/previews/studio-kling4-werewolf-kid.mp4', poster: '/posters/studio-kling4-werewolf-kid.webp', title: 'The werewolf kid at the last door', badge: 'Kling 4.0' },
      { src: '/previews/galeria/werewolf.mp4', poster: '/posters/galeria/werewolf.webp', title: 'Werewolf under the full moon', badge: 'Kling 3' },
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

  const tile: CSSProperties = { position: 'relative', aspectRatio: '9 / 16', borderRadius: 16, overflow: 'hidden', background: C.placeholder, border: `1px solid ${C.line}`, boxShadow: C.shadowHi, minWidth: 0 }
  const badge: CSSProperties = { position: 'absolute', left: 6, bottom: 6, background: C.overlay, color: C.onOverlay, borderRadius: 999, padding: '3px 7px', fontSize: 'clamp(9px, 2.4vw, 10.5px)', fontWeight: 700, letterSpacing: '0.01em', whiteSpace: 'nowrap', lineHeight: 1.3 }
  const caption: CSSProperties = { margin: '8px 2px 0', color: C.body, fontSize: 'clamp(0.74rem, 2.6vw, 0.88rem)', fontWeight: 600, lineHeight: 1.3 }

  return (
    <div ref={ref} style={{ display: 'grid', gap: 'clamp(22px, 4vw, 34px)', maxWidth: 720, margin: '0 auto' }}>
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
                    aria-label={`${c.title} — made with Kineo (${c.badge})`}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <span style={badge}>{c.badge}</span>
                </div>
                <figcaption style={caption}>{c.title}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══ KINEO-VITRINE-PAGINAS-1011 [fundador 10/11: "filmes prontos da vitrine na página que o GPT cita. Vamos fazer esse"] ═══
// A faixa "Made with <motor>" das páginas de pouso que vendem: o MESMO quadro 9:16, selo no canto e título abaixo da vitrine acima,
// com a lista de cada página (lib/seo/vitrinePaginas1011.ts — motor registrado, nunca adivinhado). LEVE e SÓ NA TELA:
//   · o HTML do servidor (e quem está sem JS) recebe só o PÔSTER — nenhum <video> nasce com src, nenhum autoplay;
//   · o src entra quando a faixa chega perto da tela; o vídeo TOCA só enquanto a faixa está visível e PAUSA quando sai;
//   · preload="none" sempre.
// Clique em qualquer quadro → cadastro com a campanha da página (o mesmo href do botão principal dela), medido como organic_cta_clicked
// com placement 'vitrine'. Tom: 'light' (páginas claras), 'dark' (páginas pretas), 'site' (cores do tema do site via var(--…)).
type StripTone = 'light' | 'dark' | 'site'
const STRIP_TONES: Record<StripTone, { text: string; muted: string; line: string; placeholder: string }> = {
  light: { text: C.text, muted: C.muted, line: C.line, placeholder: C.placeholder },
  dark: { text: '#f5f5f7', muted: '#a1a1a8', line: '#2a2a2d', placeholder: '#161618' },
  site: { text: 'var(--text, #0E1116)', muted: 'var(--muted, #5A5F67)', line: 'var(--border, #E4E4E0)', placeholder: 'var(--card, #161618)' },
}

export function ShowcaseStrip({ titulo, linha, clipes, href, source, tone = 'light', id }: {
  titulo: string
  linha: string
  clipes: readonly VitrineClipe[]
  href: string
  source: string
  tone?: StripTone
  id?: string
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const perto = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); perto.disconnect() }
    }, { rootMargin: '200px 0px' })
    const tela = new IntersectionObserver((entries) => {
      const visivel = entries.some((e) => e.isIntersecting)
      el.querySelectorAll('video').forEach((v) => {
        if (visivel) { if (v.getAttribute('src')) void v.play().catch(() => { /* navegador recusou: fica o pôster */ }) } else v.pause()
      })
    }, { threshold: 0.25 })
    perto.observe(el)
    tela.observe(el)
    return () => { perto.disconnect(); tela.disconnect() }
  }, [])
  // Quando o src chega, toca se a faixa já estiver na tela (o observador de tela pode ter disparado antes do src).
  useEffect(() => {
    const el = ref.current
    if (!near || !el) return
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight && r.bottom > 0) el.querySelectorAll('video').forEach((v) => { void v.play().catch(() => {}) })
  }, [near])

  const t = STRIP_TONES[tone]
  const tile: CSSProperties = { position: 'relative', display: 'block', aspectRatio: '9 / 16', borderRadius: 14, overflow: 'hidden', background: t.placeholder, border: `1px solid ${t.line}`, minWidth: 0 }
  const badge: CSSProperties = { position: 'absolute', left: 6, bottom: 6, background: C.overlay, color: C.onOverlay, borderRadius: 999, padding: '3px 7px', fontSize: 'clamp(9px, 2.4vw, 10.5px)', fontWeight: 700, whiteSpace: 'nowrap', lineHeight: 1.3, maxWidth: 'calc(100% - 12px)', overflow: 'hidden', textOverflow: 'ellipsis' }
  const cols = clipes.length >= 6 ? 6 : clipes.length >= 4 ? clipes.length : 3
  return (
    <section ref={ref} id={id} aria-label={titulo} data-vitrine-paginas="1011" data-vitrine-source={source} style={{ margin: '28px auto 0', maxWidth: 980, textAlign: 'left' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 'clamp(1.1rem, 3vw, 1.35rem)', fontWeight: 750, letterSpacing: '-0.01em', color: t.text }}>{titulo}</h2>
      <p style={{ margin: '0 0 14px', fontSize: '0.9rem', lineHeight: 1.55, color: t.muted }}>{linha}</p>
      <div className="kvp-strip" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 'clamp(8px, 1.6vw, 14px)' }}>
        {clipes.map((c) => (
          <figure key={c.id} style={{ margin: 0, minWidth: 0 }}>
            <a
              href={href}
              style={tile}
              aria-label={`${c.title}, made with ${vitrineSelo(c)}. Start your own`}
              data-vitrine-motor={c.motor}
              onClick={() => { void trackEvent('organic_cta_clicked', { source, placement: 'vitrine', destination: href.split('?')[0], clip: c.id, motor: c.motor }) }}
            >
              <video
                src={near ? c.src : undefined}
                poster={c.poster}
                muted
                loop
                playsInline
                preload="none"
                aria-hidden="true"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <span style={badge}>{vitrineSelo(c)}</span>
            </a>
            <figcaption style={{ margin: '6px 2px 0', color: t.text, fontSize: 'clamp(0.72rem, 2.4vw, 0.84rem)', fontWeight: 600, lineHeight: 1.3 }}>{c.title}</figcaption>
          </figure>
        ))}
      </div>
      <style>{'@media (max-width: 640px){.kvp-strip{grid-template-columns:repeat(3,minmax(0,1fr))!important}}'}</style>
    </section>
  )
}
