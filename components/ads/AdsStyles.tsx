'use client'

// KINEO-ESTILOS-PRODUTO-2026-10-09 — a escolha de ESTILO do anúncio (/ads/v2, os dois modos) e a faixa de estilos das
// páginas públicas (/business e /ads). Tudo vem de lib/ads/v2Styles.ts: chaves, nomes em inglês, prévias e as frases nas
// 16 línguas. A prévia de cada cartão é o vídeo feito PELO PRÓPRIO efeito (public/ads-styles/<chave>.mp4, regra da casa).
//
// Celular: uma fileira com rolagem horizontal e encaixe (scroll-snap), dentro de um fieldset com min-width:0 — sem isso
// o fieldset estica até o conteúdo e a página inteira ganha rolagem lateral. Cores só pelos tokens da tela que hospeda
// (--ads-* no /ads/v2; --text/--card/--border/--accent nas páginas públicas), então claro e escuro seguem sozinhos.
// Movimento: o vídeo só toca visível (IntersectionObserver) e nunca toca com "reduzir movimento" (fica o pôster).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ADS_V2_STYLES,
  ADS_V2_STYLE_CATEGORY_IDS,
  adsV2StylesIn,
  type AdsV2StyleCategory,
  type AdsV2StyleChoice,
  type AdsV2StyleCopy,
  type AdsV2StyleKey,
} from '@/lib/ads/v2Styles'
// KINEO-ATOR-ANUNCIO-2026-10-09 — o cartão "Person talking about it" (ator de IA) mora ao lado da escolha de estilo.
import {
  ADS_V2_PRESENTER_COPY,
  ADS_V2_PRESENTER_POSTER,
  ADS_V2_PRESENTER_PREVIEW,
  ADS_V2_PRESENTER_PUBLIC,
  type AdsV2PresenterCopy,
} from '@/lib/ads/v2Presenter'

// KINEO-ADS-UX-MARCA-2026-10-10 — 15 estilos + o ator não cabem numa linha: a faixa rola também no computador; o
// seletor ganhou categorias (filtro) e setas de carrossel (só com mouse; no toque a rolagem já é o gesto).
const CSS = `
.kst-pick{margin:18px 0 0;min-width:0}
.kst-pick h3{margin:0;font-size:15px;font-weight:750;color:var(--ads-text,var(--text))}
.kst-pick .kst-hint{margin:4px 0 0;font-size:13px;line-height:1.45;color:var(--ads-muted,var(--muted))}
.kst-row{display:flex;gap:10px;margin:10px 0 0;padding:2px 2px 10px;border:0;min-width:0;max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
.kst-card{position:relative;flex:0 0 128px;scroll-snap-align:start;display:grid;align-content:start;gap:6px;padding:6px 6px 8px;border:1px solid var(--ads-line,var(--border));border-radius:14px;background:var(--ads-card,var(--card));color:var(--ads-text,var(--text));cursor:pointer;min-width:0}
.kst-card[data-on=true]{border-color:var(--ads-action,var(--accent));box-shadow:0 0 0 2px var(--ads-action,var(--accent))}
.kst-card[data-off=true]{cursor:not-allowed;opacity:.6}
.kst-card:focus-within{outline:3px solid var(--ads-action,var(--accent));outline-offset:2px}
.kst-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.kst-media{position:relative;aspect-ratio:9/16;border-radius:10px;overflow:hidden;background:var(--ads-bg,var(--card2,var(--card)))}
.kst-media video,.kst-media img{display:block;width:100%;height:100%;object-fit:cover}
.kst-auto{display:grid;place-items:center;height:100%;padding:10px;text-align:center;font-size:12px;line-height:1.35;color:var(--ads-muted,var(--muted))}
.kst-auto b{display:block;font-size:22px;line-height:1;margin:0 0 6px;color:var(--ads-text,var(--text))}
.kst-card .kst-name{font-size:13px;font-weight:700;line-height:1.25}
.kst-card .kst-for{font-size:11.5px;line-height:1.35;color:var(--ads-muted,var(--muted))}
.kst-tag{position:absolute;top:10px;left:10px;z-index:1;padding:2px 7px;border-radius:999px;background:var(--ads-action,var(--accent));color:var(--on-accent,#fff);font-size:10.5px;font-weight:750}
.kst-strip{margin:0;padding:2px 2px 10px;list-style:none;display:flex;gap:12px;min-width:0;max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.kst-strip li{flex:0 0 150px;scroll-snap-align:start;display:grid;gap:6px;min-width:0;border:1px solid var(--border);background:var(--card);border-radius:16px;padding:8px 8px 12px}
.kst-strip .kst-media{border-radius:11px}
.kst-strip b{font-size:14px;font-weight:700;color:var(--text)}
.kst-strip span{font-size:12.5px;line-height:1.4;color:var(--muted)}
@media (min-width:900px){.kst-strip li{flex:0 0 172px}}
.kst-cats{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0;min-width:0}
.kst-cat{min-height:32px;padding:4px 12px;border-radius:999px;border:1px solid var(--ads-line,var(--border));background:var(--ads-card,var(--card));color:var(--ads-secondary,var(--muted));font:inherit;font-size:12.5px;font-weight:650;cursor:pointer}
.kst-cat[aria-pressed=true]{border-color:var(--ads-action,var(--accent));color:var(--ads-text,var(--text));box-shadow:inset 0 0 0 1px var(--ads-action,var(--accent))}
.kst-cat:focus-visible,.kst-nav button:focus-visible{outline:2px solid var(--ads-action,var(--accent));outline-offset:2px}
.kst-carousel{position:relative;min-width:0}
.kst-nav{position:absolute;inset:0 0 auto 0;top:38%;display:flex;justify-content:space-between;pointer-events:none}
.kst-nav button{pointer-events:auto;width:34px;height:34px;border-radius:999px;border:1px solid var(--ads-line,var(--border));background:var(--ads-card,var(--card));color:var(--ads-text,var(--text));font-size:18px;line-height:1;cursor:pointer;box-shadow:0 6px 18px -8px rgba(0,0,0,.45)}
.kst-nav button:disabled{opacity:0;pointer-events:none}
@media (hover:none){.kst-nav{display:none}}
@media (prefers-reduced-motion: reduce){.kst-row{scroll-behavior:auto}}
.kst-pres{margin:14px 0 0;min-width:0}
.kst-pres .kst-card{display:grid;grid-template-columns:76px minmax(0,1fr);align-items:center;gap:12px;max-width:440px;padding:8px 12px 8px 8px}
.kst-pres .kst-txt{display:grid;gap:4px;min-width:0}
.kst-pres .kst-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kst-pres .kst-new{padding:1px 7px;border-radius:999px;background:var(--ads-action,var(--accent));color:var(--on-accent,#fff);font-size:10.5px;font-weight:750}
.kst-pres .kst-why{font-size:11.5px;line-height:1.35;color:var(--ads-muted,var(--muted));font-weight:650}
.kst-pres .kst-box{width:18px;height:18px;flex:0 0 18px;border-radius:5px;border:2px solid var(--ads-line,var(--border));display:grid;place-items:center;font-size:12px;line-height:1;color:var(--on-accent,#fff)}
.kst-pres .kst-card[data-on=true] .kst-box{background:var(--ads-action,var(--accent));border-color:var(--ads-action,var(--accent))}
.kst-strip li.kst-pres-li{border-color:var(--accent)}
`

/** Vídeo da prévia: mudo, em laço, só toca visível e nunca com "reduzir movimento" (o pôster fica). */
function StyleLoop({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let reduce = false
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      reduce = false
    }
    if (reduce || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => { /* autoplay bloqueado: fica o pôster */ })
        else el.pause()
      },
      { threshold: 0.2 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />
  )
}

/**
 * A escolha de estilo: "Auto" (sem efeito) + os 5 estilos, cada um com a prévia feita pelo próprio efeito. Rádio de
 * verdade por baixo (teclado e leitor de tela), um só valor por vez.
 */
export function AdsStylePicker({
  name,
  value,
  suggested,
  onChange,
  disabled,
  copy,
  note,
  carousel,
}: {
  name: string
  value: AdsV2StyleChoice
  suggested: AdsV2StyleChoice
  onChange: (next: AdsV2StyleChoice) => void
  disabled?: boolean
  copy: AdsV2StyleCopy
  /** Onde o efeito entra (modo simples: a 1ª foto; completo: a foto marcada como produto). */
  note: string
  /**
   * KINEO-ADS-UX-MARCA-2026-10-10 — opcional (modo simples): filtro por categoria, selo "Recommended for your product" e
   * setas de carrossel. Sem isto, o seletor de antes (modo completo), igual.
   */
  carousel?: { labels: Record<AdsV2StyleCategory | 'all', string>; recommended: string; prev: string; next: string }
}) {
  const titleId = `${name}-title`
  const [cat, setCat] = useState<AdsV2StyleCategory | 'all'>('all')
  const rowRef = useRef<HTMLFieldSetElement | null>(null)
  const [edges, setEdges] = useState({ start: true, end: false })
  const shown = carousel ? adsV2StylesIn(cat) : ADS_V2_STYLES.map((s) => s.key)
  const syncEdges = () => {
    const el = rowRef.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }
  useEffect(() => {
    if (!carousel) return
    const el = rowRef.current
    if (el) el.scrollLeft = 0
    syncEdges()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, !!carousel])
  const slide = (dir: 1 | -1) => {
    const el = rowRef.current
    if (!el) return
    let reduce = false
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { reduce = false }
    el.scrollBy({ left: dir * Math.max(140, el.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' })
  }
  const card = (key: AdsV2StyleChoice, media: ReactNode, label: string, bestFor: string) => (
    <label key={key} className="kst-card" data-on={value === key} data-off={!!disabled}>
      <input className="kst-sr" type="radio" name={name} value={key} checked={value === key} disabled={disabled} onChange={() => onChange(key)} />
      {suggested === key && key !== 'none' ? <span className="kst-tag">{carousel ? carousel.recommended : copy.suggested}</span> : null}
      <span className="kst-media">{media}</span>
      <span className="kst-name">{label}</span>
      <span className="kst-for">{bestFor}</span>
    </label>
  )
  const row = (
    <fieldset ref={rowRef} className="kst-row" aria-labelledby={titleId} onScroll={carousel ? syncEdges : undefined}>
      {card('none', <span className="kst-auto" aria-hidden="true"><span><b>∅</b>{copy.autoLabel}</span></span>, copy.autoLabel, copy.autoBestFor)}
      {ADS_V2_STYLES.filter((s) => shown.includes(s.key)).map((s) => card(s.key, <StyleLoop src={s.preview} poster={s.poster} />, copy.styles[s.key as AdsV2StyleKey].label, copy.styles[s.key as AdsV2StyleKey].bestFor))}
    </fieldset>
  )
  return (
    <div className="kst-pick" data-kineo="ads-styles-picker">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h3 id={titleId}>{copy.title}</h3>
      <p className="kst-hint">{copy.hint} {note}</p>
      {carousel ? (
        <>
          <div className="kst-cats" role="group" aria-labelledby={titleId}>
            {(['all', ...ADS_V2_STYLE_CATEGORY_IDS] as const).map((c) => (
              <button key={c} type="button" className="kst-cat" aria-pressed={cat === c} onClick={() => setCat(c)}>{carousel.labels[c]}</button>
            ))}
          </div>
          <div className="kst-carousel">
            {row}
            <div className="kst-nav">
              <button type="button" aria-label={carousel.prev} disabled={edges.start} onClick={() => slide(-1)}>‹</button>
              <button type="button" aria-label={carousel.next} disabled={edges.end} onClick={() => slide(1)}>›</button>
            </div>
          </div>
        </>
      ) : row}
    </div>
  )
}

/**
 * KINEO-ATOR-ANUNCIO-2026-10-09 — o cartão "Person talking about it": liga/desliga o ator de IA (caixa de seleção de
 * verdade por baixo). Desligado com o motivo à vista quando falta a narração ou a foto de produto; a prévia é o teste
 * aprovado pelo fundador (public/ads-styles/presenter.mp4, mudo, em laço, só toca visível).
 */
export function AdsPresenterToggle({
  name,
  checked,
  onChange,
  disabled,
  reason,
  note,
  copy,
}: {
  name: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  /** Por que está desligado (narração desligada / nenhuma foto de produto). null = disponível. */
  reason: string | null
  /** Onde o produto vem (modo simples: a 1ª foto; completo: a foto marcada como Product). */
  note: string
  copy: AdsV2PresenterCopy
}) {
  const off = !!disabled || !!reason
  return (
    <div className="kst-pres" data-kineo="ads-presenter-toggle">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <label className="kst-card" data-on={checked && !reason} data-off={off}>
        <input className="kst-sr" type="checkbox" name={name} checked={checked && !reason} disabled={off} onChange={(e) => onChange(e.target.checked)} />
        <span className="kst-media"><StyleLoop src={ADS_V2_PRESENTER_PREVIEW} poster={ADS_V2_PRESENTER_POSTER} /></span>
        <span className="kst-txt">
          <span className="kst-top">
            <span className="kst-box" aria-hidden="true">{checked && !reason ? '✓' : ''}</span>
            <span className="kst-name">{copy.title}</span>
            <span className="kst-new">{copy.badge}</span>
          </span>
          <span className="kst-for">{copy.line}</span>
          {reason ? <span className="kst-why">{reason}</span> : <span className="kst-for">{note}</span>}
        </span>
      </label>
    </div>
  )
}

/** A faixa das páginas públicas (/business, /ads): os 5 estilos com a prévia, o nome e para que servem. Em inglês. */
export function AdsStyleStrip() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <ul className="kst-strip" data-kineo="ads-styles-strip">
        {/* KINEO-ATOR-ANUNCIO-2026-10-09 — o ator de IA abre a faixa (interruptor único em lib/ads/v2Presenter.ts). */}
        {ADS_V2_PRESENTER_PUBLIC ? (
          <li key="presenter" className="kst-pres-li" data-kineo="ads-presenter-strip">
            <span className="kst-media"><StyleLoop src={ADS_V2_PRESENTER_PREVIEW} poster={ADS_V2_PRESENTER_POSTER} /></span>
            <b>{ADS_V2_PRESENTER_COPY.en.title}</b>
            <span>{ADS_V2_PRESENTER_COPY.en.line}.</span>
            <span>Best for: beauty, skincare, any product you can hold</span>
          </li>
        ) : null}
        {ADS_V2_STYLES.map((s) => (
          <li key={s.key}>
            <span className="kst-media"><StyleLoop src={s.preview} poster={s.poster} /></span>
            <b>{s.label}</b>
            <span>{s.oneLine}</span>
            <span>Best for: {s.bestFor}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
