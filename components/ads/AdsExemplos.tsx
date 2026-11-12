'use client'

// KINEO-ADS-EXEMPLOS-1111 — a seção "Ads made with Kineo" da /ads: anúncios prontos, leves.
// Peso: só a capa (≤ 30 KB) baixa na abertura. O <video> da prévia (mudo, ≤ 400 KB) só MONTA quando o cartão chega perto da
// tela (IntersectionObserver, 200 px) e só toca visível; com "reduzir movimento" fica a capa. O anúncio inteiro, com som, só
// baixa no clique, no player (nada toca com som sozinho). Sem motor e sem preço no cartão; texto ≥ 12 px; 2 colunas em 375 px.
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { ADS_EXEMPLOS, ADS_EXEMPLO_OPENED_EVENT, type AdsExemplo } from '@/lib/ads/adsExemplos'

const CSS = `
.kex-grid{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
.kex-card{display:grid;gap:8px;width:100%;padding:8px 8px 12px;border:1px solid var(--border);border-radius:16px;background:var(--card);color:var(--text);text-align:left;font:inherit;cursor:pointer}
.kex-card:hover{border-color:var(--accent)}
.kex-card:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.kex-media{position:relative;aspect-ratio:9/16;border-radius:11px;overflow:hidden;background:var(--card2,var(--card))}
.kex-media img,.kex-media video{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover}
.kex-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:44px;height:44px;border-radius:50%;background:rgba(0,0,0,.55);display:grid;place-items:center;pointer-events:none}
.kex-play::before{content:'';margin-left:4px;border-style:solid;border-width:9px 0 9px 14px;border-color:transparent transparent transparent #fff}
.kex-format{justify-self:start;font-size:12px;font-weight:700;line-height:1;padding:5px 8px;border-radius:999px;background:var(--accent-soft,rgba(41,151,255,.12));color:var(--accent)}
.kex-title{font-size:14px;font-weight:700;line-height:1.3}
.kex-secs{font-size:12px;color:var(--muted)}
.kex-dialog{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.78)}
.kex-player{position:relative;width:min(420px,100%);max-height:100%;display:grid;gap:10px}
.kex-player video{width:100%;max-height:calc(100vh - 120px);aspect-ratio:9/16;border-radius:14px;background:#000}
.kex-player p{margin:0;color:#fff;font-size:14px;font-weight:700}
.kex-close{justify-self:end;min-height:40px;padding:8px 14px;border:1px solid rgba(255,255,255,.4);border-radius:10px;background:transparent;color:#fff;font:inherit;font-size:14px;cursor:pointer}
@media (max-width:480px){.kex-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
`

function Previa({ item }: { item: AdsExemplo }) {
  const box = useRef<HTMLSpanElement | null>(null)
  const vid = useRef<HTMLVideoElement | null>(null)
  const [montado, setMontado] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    let reduzir = false
    try { reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { reduzir = false }
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } }
    if (reduzir || nav.connection?.saveData || typeof IntersectionObserver === 'undefined') return // fica a capa
    const perto = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setMontado(true); perto.disconnect() } }, { rootMargin: '200px 0px' })
    perto.observe(el)
    return () => perto.disconnect()
  }, [])
  useEffect(() => {
    const v = vid.current
    if (!montado || !v) return
    const visivel = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => { /* fica a capa */ }); else v.pause() }, { threshold: 0.3 })
    visivel.observe(v)
    return () => visivel.disconnect()
  }, [montado])
  return (
    <span className="kex-media" ref={box}>
      {/* eslint-disable-next-line @next/next/no-img-element -- capa estática de 30 KB, sem otimizador */}
      <img src={item.poster} alt="" width={432} height={768} loading="lazy" decoding="async" />
      {montado ? <video ref={vid} src={item.preview} poster={item.poster} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} /> : null}
      <span className="kex-play" aria-hidden="true" />
    </span>
  )
}

export function AdsExemplosGrid() {
  const [aberto, setAberto] = useState<AdsExemplo | null>(null)
  const fechar = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!aberto) return
    fechar.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(null) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto])
  const abrir = (item: AdsExemplo) => {
    setAberto(item)
    void trackEvent(ADS_EXEMPLO_OPENED_EVENT, { key: item.key, format: item.format })
  }
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <ul className="kex-grid" data-kineo="ads-exemplos">
        {ADS_EXEMPLOS.map((item) => (
          <li key={item.key}>
            <button type="button" className="kex-card" onClick={() => abrir(item)} aria-label={`Watch "${item.title}", ${item.format}, ${item.seconds} seconds, with sound`}>
              <Previa item={item} />
              <span className="kex-format">{item.format}</span>
              <span className="kex-title">{item.title}</span>
              <span className="kex-secs">{item.seconds} s · vertical 9:16</span>
            </button>
          </li>
        ))}
      </ul>
      {aberto ? (
        <div className="kex-dialog" role="dialog" aria-modal="true" aria-label={aberto.title} onClick={(e) => { if (e.target === e.currentTarget) setAberto(null) }}>
          <div className="kex-player">
            <button type="button" className="kex-close" ref={fechar} onClick={() => setAberto(null)}>Close ✕</button>
            {/* O som só existe aqui, depois do clique da pessoa. */}
            <video key={aberto.key} src={aberto.full} poster={aberto.poster} controls autoPlay playsInline preload="auto" />
            <p>{aberto.title} · {aberto.format} · {aberto.seconds} s</p>
          </div>
        </div>
      ) : null}
    </>
  )
}
