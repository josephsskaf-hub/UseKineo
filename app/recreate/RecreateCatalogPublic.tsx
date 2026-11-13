'use client'

// KINEO-MENU-RECREATE-1211 — a grade pública do /recreate (visitante). Mesma linguagem dos cartões da home e do catálogo logado: pôster
// parado, vídeo só toca com o mouse em cima (computador) ou com o toque no botão ▶ (celular). Nada começa sozinho. O cartão inteiro leva ao
// fluxo daquele modelo. Sem preço, sem nome de motor, nenhum texto abaixo de 12 px.
import Link from 'next/link'
import { useRef, useState } from 'react'
import type { RecreateCatalogItem } from '@/lib/recreate/catalogPublic'

const CSS = `
.rcp{min-height:100vh;background:#050506;color:#f5f5f7;font-family:inherit}
.rcp-nav{max-width:1200px;margin:0 auto;padding:0 16px;display:flex;align-items:center;gap:18px;min-height:64px;font-size:14px}
.rcp-nav a{color:#c3c8d1;text-decoration:none;font-weight:600}
.rcp-nav a:hover{color:#fff}
.rcp-brand{font-weight:800!important;font-size:21px;letter-spacing:-.03em;color:#f5f5f7!important;margin-right:auto}
.rcp-cta{background:#3D7BFF;color:#fff!important;padding:9px 14px;border-radius:10px}
.rcp-main{max-width:1200px;margin:0 auto;padding:20px 16px 64px}
.rcp-eyebrow{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#9aa3b2;margin:0 0 8px}
.rcp h1{font-size:clamp(28px,4.6vw,46px);line-height:1.1;letter-spacing:-.02em;margin:0 0 10px}
.rcp-lead{font-size:16px;line-height:1.55;color:#c3c8d1;margin:0 0 26px;max-width:640px}
.rcp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;list-style:none;padding:0;margin:0}
.rcp-grid>li{position:relative;min-width:0}
.rcp-card{position:relative;display:block;aspect-ratio:9/14;border-radius:14px;overflow:hidden;background:#111318 center/cover no-repeat;border:1px solid rgba(255,255,255,.08);color:#f5f5f7;text-decoration:none}
.rcp-card:focus-visible{outline:2px solid #3D7BFF;outline-offset:2px}
.rcp-card video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .25s}
.rcp-card[data-playing="1"] video{opacity:1}
.rcp-card:after{content:'';position:absolute;inset:45% 0 0;background:linear-gradient(transparent,rgba(3,5,9,.9));pointer-events:none}
.rcp-copy{position:absolute;z-index:1;left:12px;right:12px;bottom:12px;display:flex;flex-direction:column;gap:8px}
.rcp-copy b{font-size:15px;font-weight:650;line-height:1.3}
.rcp-pill{align-self:flex-start;display:inline-flex;align-items:center;justify-content:center;min-height:44px;font-size:15px;font-weight:800;padding:10px 18px;border-radius:999px;background:#fff;color:#101318;border:1px solid #fff;box-shadow:0 3px 0 #cbd0d8}
.rcp-play{position:absolute;z-index:2;top:10px;right:10px;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.28);background:rgba(3,5,9,.6);color:#fff;font-size:14px;display:grid;place-items:center;cursor:pointer;padding:0}
.rcp-foot{margin-top:28px;font-size:14px;color:#9aa3b2}
.rcp-foot a{color:#7FA6FF}
@media(max-width:640px){.rcp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.rcp-nav{gap:12px}.rcp-nav .rcp-hide-sm{display:none}.rcp-copy b{font-size:14px}}
`

function Card({ item }: { item: RecreateCatalogItem }) {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const calm = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const play = () => { void video.current?.play().catch(() => {}) }
  const stop = () => { video.current?.pause() }
  return (
    <li>
      <Link href={item.href} className="rcp-card" data-recreate-card={item.id} data-playing={playing ? '1' : '0'} aria-label={`Recreate ${item.title}`}
        style={{ backgroundImage: `url(${item.poster})` }}
        onPointerEnter={e => { if (e.pointerType === 'mouse' && !calm()) play() }}
        onPointerLeave={e => { if (e.pointerType === 'mouse') stop() }}>
        <video ref={video} src={item.video} poster={item.poster} muted loop playsInline preload="none" aria-hidden="true"
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
        <span className="rcp-copy"><b>{item.title}</b><span className="rcp-pill">Recreate ↗</span></span>
      </Link>
      <button type="button" className="rcp-play" aria-label={`${playing ? 'Pause' : 'Play'} preview of ${item.title}`} aria-pressed={playing}
        onClick={() => { if (playing) stop(); else play() }}>
        {playing ? '❚❚' : '▶'}
      </button>
    </li>
  )
}

export default function RecreateCatalogPublic({ items }: { items: RecreateCatalogItem[] }) {
  return (
    <div className="rcp" data-recreate-catalog="public">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <nav className="rcp-nav" aria-label="Main navigation">
        <Link href="/" className="rcp-brand">Kineo</Link>
        <Link href="/made-with-kineo" className="rcp-hide-sm">Made with Kineo</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/login" className="rcp-hide-sm">Log in</Link>
        <Link href={'/signup?' + new URLSearchParams({ redirect: '/recreate' }).toString()} className="rcp-cta">Get started</Link>
      </nav>
      <main className="rcp-main">
        <p className="rcp-eyebrow">Kineo Recreate</p>
        <h1>Recreate — put yourself in the clip</h1>
        <p className="rcp-lead">Pick a video from the catalog, add your photo and get your own version. Every template you can recreate today is below.</p>
        <ul className="rcp-grid" aria-label="Recreate templates">
          {items.map(item => <Card key={item.id} item={item} />)}
        </ul>
        <p className="rcp-foot">{items.length} templates · <Link href="/made-with-kineo">More made with Kineo</Link></p>
      </main>
    </div>
  )
}
