'use client'

// KINEO-ATORES-IA-2026-10-13 — o seletor de APRESENTADOR de IA do Studio Ads (/ads/v2, modo simples e completo). Aparece logo
// abaixo do cartão "Person talking about it" quando o ator está ligado. Tudo vem de lib/ads/v2PresenterLibrary.ts (lista
// fechada de 12, frases nas 16 línguas).
//
// O que a pessoa faz aqui: olha os rostos, ouve a voz (~4 s, /ads/presenters/<id>-voice.mp3 — o botão só aparece quando a
// biblioteca marca a amostra em `voiceSample`; o guardião confere marca ⇔ arquivo), vê o vídeo de verdade do ator quando há um
// (passando o mouse no cartão, ou no destaque do escolhido), e escolhe. "Surprise me" (o 1º cartão, o padrão) = o sorteio de sempre:
// sem escolha, o pedido sai EXATAMENTE como antes.
//
// Honestidade: cada cartão e o destaque levam o selo "AI"; o texto do topo diz que ninguém é pessoa real nem cliente; nenhuma
// nota, avaliação ou depoimento aparece em lugar nenhum.
//
// Celular primeiro: uma fileira de cartões grandes com rolagem e encaixe; a partir de 720 px vira grade. Rádio de verdade por
// baixo (teclado e leitor de tela). Movimento só sem "reduzir movimento". Cores pelos tokens da tela (--ads-*), claro e escuro.
import { useEffect, useRef, useState } from 'react'
import {
  ADS_V2_PRESENTER_LIBRARY,
  ADS_V2_PRESENTER_TAGS,
  adsV2PresenterById,
  type AdsV2PresenterEntry,
  type AdsV2PresenterTag,
} from '@/lib/ads/v2Presenter'
import type { AdsV2PresenterPickerCopy } from '@/lib/ads/v2PresenterLibrary'

const CSS = `
.kpp{margin:12px 0 0;min-width:0;padding:14px;border:1px solid var(--ads-line,var(--border));border-radius:18px;background:linear-gradient(180deg,color-mix(in srgb,var(--ads-action,var(--accent)) 7%,var(--ads-card,var(--card))),var(--ads-card,var(--card)))}
.kpp h3{margin:0;font-size:16px;font-weight:780;color:var(--ads-text,var(--text))}
.kpp .kpp-hint{margin:4px 0 0;font-size:12.5px;line-height:1.45;color:var(--ads-muted,var(--muted))}
.kpp-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.kpp-ai{display:inline-flex;align-items:center;padding:2px 7px;border-radius:999px;background:rgba(10,10,14,.72);color:#fff;font-size:10.5px;font-weight:800;letter-spacing:.02em;line-height:1.3}
.kpp-spot{display:grid;grid-template-columns:104px minmax(0,1fr);gap:12px;align-items:center;margin:12px 0 0;padding:10px;border-radius:16px;background:var(--ads-card,var(--card));border:1px solid var(--ads-line,var(--border));animation:kpp-in .28s ease}
.kpp-spot .kpp-media{border-radius:12px}
@media (min-width:560px){.kpp-spot{grid-template-columns:150px minmax(0,1fr);gap:16px;padding:12px}}
.kpp-spot-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:18px;font-weight:800;color:var(--ads-text,var(--text))}
.kpp-spot-meta{margin:4px 0 0;font-size:12.5px;line-height:1.4;color:var(--ads-muted,var(--muted))}
.kpp-spot-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}
.kpp-btn{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:6px 14px;border-radius:999px;border:1px solid var(--ads-action,var(--accent));background:var(--ads-action,var(--accent));color:var(--on-accent,#fff);font:inherit;font-size:13px;font-weight:750;cursor:pointer;transition:transform .15s ease,filter .15s ease}
.kpp-btn:hover{filter:brightness(1.08)}
.kpp-btn:active{transform:scale(.97)}
.kpp-btn[data-ghost=true]{background:transparent;color:var(--ads-text,var(--text));border-color:var(--ads-line,var(--border))}
.kpp-soon{font-size:12px;color:var(--ads-muted,var(--muted));font-weight:650}
.kpp-cats{display:flex;gap:6px;margin:12px 0 0;overflow-x:auto;padding:0 0 2px;scrollbar-width:none;min-width:0}
.kpp-cat{flex:0 0 auto;min-height:32px;padding:4px 12px;border-radius:999px;border:1px solid var(--ads-line,var(--border));background:var(--ads-card,var(--card));color:var(--ads-secondary,var(--muted));font:inherit;font-size:12.5px;font-weight:650;cursor:pointer}
.kpp-cat[aria-pressed=true]{border-color:var(--ads-action,var(--accent));color:var(--ads-text,var(--text));box-shadow:inset 0 0 0 1px var(--ads-action,var(--accent))}
.kpp-grid{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(148px,44%);gap:12px;margin:12px 0 0;padding:4px 2px 12px;border:0;min-width:0;max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
@media (min-width:720px){.kpp-grid{grid-auto-flow:row;grid-auto-columns:auto;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));overflow:visible}}
.kpp-card{position:relative;scroll-snap-align:start;min-width:0;border-radius:16px;border:1px solid var(--ads-line,var(--border));background:var(--ads-card,var(--card));transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.kpp-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px -14px rgba(0,0,0,.55)}
.kpp-card[data-on=true]{border-color:var(--ads-action,var(--accent));box-shadow:0 0 0 2px var(--ads-action,var(--accent)),0 12px 28px -16px var(--ads-action,var(--accent));transform:translateY(-2px) scale(1.015)}
.kpp-card:focus-within{outline:3px solid var(--ads-action,var(--accent));outline-offset:2px}
.kpp-card label{display:grid;gap:6px;padding:6px 6px 10px;cursor:pointer;color:var(--ads-text,var(--text))}
.kpp-media{position:relative;display:block;aspect-ratio:3/4;border-radius:12px;overflow:hidden;background:var(--ads-bg,var(--card2,var(--card)))}
.kpp-media img,.kpp-media video{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:50% 22%}
.kpp-media .kpp-ai{position:absolute;top:8px;left:8px;z-index:2}
.kpp-check{position:absolute;top:8px;right:8px;z-index:2;width:24px;height:24px;border-radius:999px;display:grid;place-items:center;background:var(--ads-action,var(--accent));color:var(--on-accent,#fff);font-size:14px;font-weight:900;transform:scale(0);transition:transform .2s cubic-bezier(.3,1.6,.5,1)}
.kpp-card[data-on=true] .kpp-check{transform:scale(1)}
.kpp-ph{position:absolute;inset:0;display:grid;place-items:center;align-content:center;gap:6px;text-align:center;padding:10px;background:radial-gradient(120% 90% at 30% 15%,color-mix(in srgb,var(--ads-action,var(--accent)) 38%,transparent),transparent 60%),linear-gradient(160deg,color-mix(in srgb,var(--ads-action,var(--accent)) 22%,var(--ads-card,var(--card))),var(--ads-bg,var(--card)))}
.kpp-ph b{font-size:40px;line-height:1;font-weight:850;color:var(--ads-text,var(--text));opacity:.9}
.kpp-ph span{font-size:11px;font-weight:650;color:var(--ads-muted,var(--muted))}
.kpp-name{font-size:14.5px;font-weight:780;line-height:1.2}
.kpp-tag{font-size:11.5px;color:var(--ads-muted,var(--muted));font-weight:650}
.kpp-play{position:absolute;right:12px;bottom:58px;z-index:3;width:36px;height:36px;border-radius:999px;border:0;display:grid;place-items:center;background:rgba(10,10,14,.72);color:#fff;font-size:14px;cursor:pointer;transition:transform .15s ease,background .15s ease}
.kpp-play:hover{transform:scale(1.08);background:var(--ads-action,var(--accent))}
.kpp-play[data-on=true]{background:var(--ads-action,var(--accent))}
.kpp-play:focus-visible,.kpp-cat:focus-visible,.kpp-btn:focus-visible{outline:2px solid var(--ads-action,var(--accent));outline-offset:2px}
@keyframes kpp-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.kpp-card,.kpp-card:hover,.kpp-card[data-on=true],.kpp-check,.kpp-btn,.kpp-play{transition:none;transform:none}.kpp-spot{animation:none}.kpp-card[data-on=true] .kpp-check{transform:none}}
`

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** O rosto do cartão: retrato (ou o vídeo do ator ao passar o mouse), ou o marcador "prévia em breve". */
function Face({ p, copy, live }: { p: AdsV2PresenterEntry | null; copy: AdsV2PresenterPickerCopy; live?: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !live || reducedMotion()) return
    el.play().catch(() => { /* autoplay bloqueado: fica o retrato */ })
    return () => el.pause()
  }, [live, p?.id])
  if (!p) {
    return (
      <span className="kpp-ph" aria-hidden="true">
        <b>✦</b>
      </span>
    )
  }
  if (!p.portrait) {
    return (
      <span className="kpp-ph" aria-hidden="true">
        <b>{p.name.slice(0, 1)}</b>
        <span>{copy.previewSoon}</span>
      </span>
    )
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.portrait} alt="" loading="lazy" decoding="async" />
      {p.clip && live ? <video ref={ref} src={p.clip} poster={p.portrait} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} /> : null}
    </>
  )
}

export function AdsPresenterPicker({
  name,
  value,
  onChange,
  copy,
  disabled,
}: {
  name: string
  /** null = "Surprise me" (o sorteio de sempre). */
  value: string | null
  onChange: (next: string | null) => void
  copy: AdsV2PresenterPickerCopy
  disabled?: boolean
}) {
  const titleId = `${name}-title`
  const [cat, setCat] = useState<AdsV2PresenterTag | 'all'>('all')
  // Amostra que falhou ao tocar nesta visita (arquivo sumido, rede): o botão some e fica o "em breve".
  const [broken, setBroken] = useState<Record<string, true>>({})
  const [playing, setPlaying] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chosen = adsV2PresenterById(value)
  const sampleOf = (p: AdsV2PresenterEntry | null): string | null => (p && p.voiceSample && !broken[p.id] ? p.voiceSample : null)

  useEffect(() => () => {
    audioRef.current?.pause()
    audioRef.current = null
  }, [])

  const stop = () => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlaying(null)
  }
  const play = (p: AdsV2PresenterEntry) => {
    const src = sampleOf(p)
    if (!src) return
    if (playing === p.id) return stop()
    stop()
    const a = new Audio(src)
    audioRef.current = a
    a.onended = () => setPlaying((cur) => (cur === p.id ? null : cur))
    a.onerror = () => {
      setPlaying((cur) => (cur === p.id ? null : cur))
      setBroken((b) => ({ ...b, [p.id]: true }))
    }
    setPlaying(p.id)
    a.play().catch(() => setPlaying((cur) => (cur === p.id ? null : cur)))
  }
  const voiceLabel = (p: AdsV2PresenterEntry) => (p.gender === 'man' ? copy.voiceMan : copy.voiceWoman)
  const shown = ADS_V2_PRESENTER_LIBRARY.filter((p) => cat === 'all' || p.tag === cat)

  const card = (p: AdsV2PresenterEntry | null) => {
    const id = p ? p.id : 'auto'
    const on = p ? value === p.id : value === null
    const canHear = !!sampleOf(p)
    return (
      <div key={id} className="kpp-card" data-on={on} data-kineo="ads-presenter-card" onMouseEnter={() => setHovered(id)} onMouseLeave={() => setHovered((h) => (h === id ? null : h))}>
        <label>
          <input className="kpp-sr" type="radio" name={name} value={id} checked={on} disabled={disabled} onChange={() => onChange(p ? p.id : null)} />
          <span className="kpp-media">
            <Face p={p} copy={copy} live={hovered === id} />
            <span className="kpp-ai">{copy.ai}</span>
            <span className="kpp-check" aria-hidden="true">✓</span>
          </span>
          <span className="kpp-name">{p ? p.name : copy.autoName}</span>
          <span className="kpp-tag">{p ? copy.tags[p.tag] : copy.autoLine}</span>
        </label>
        {canHear && p ? (
          <button type="button" className="kpp-play" data-on={playing === p.id} aria-label={`${playing === p.id ? copy.stop : copy.hear}: ${p.name}`} onClick={() => play(p)}>
            {playing === p.id ? '■' : '▶'}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <section className="kpp" data-kineo="ads-presenter-picker" aria-labelledby={titleId}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h3 id={titleId}>{copy.title}</h3>
      <p className="kpp-hint">{copy.hint} {copy.vary}</p>

      {chosen ? (
        <div className="kpp-spot" key={chosen.id} data-kineo="ads-presenter-spotlight" aria-live="polite">
          <span className="kpp-media">
            <Face p={chosen} copy={copy} live />
            <span className="kpp-ai">{copy.ai}</span>
          </span>
          <span>
            <span className="kpp-spot-name">{chosen.name} <span className="kpp-ai">{copy.ai}</span></span>
            <span className="kpp-spot-meta" style={{ display: 'block' }}>{copy.tags[chosen.tag]} · {voiceLabel(chosen)} · {copy.selected}</span>
            <span className="kpp-spot-actions">
              {sampleOf(chosen) ? (
                <button type="button" className="kpp-btn" onClick={() => play(chosen)}>{playing === chosen.id ? `■ ${copy.stop}` : `▶ ${copy.hear}`}</button>
              ) : (
                <span className="kpp-soon">{copy.voiceSoon}</span>
              )}
              <button type="button" className="kpp-btn" data-ghost="true" disabled={disabled} onClick={() => { stop(); onChange(null) }}>✦ {copy.autoName}</button>
            </span>
          </span>
        </div>
      ) : null}

      <div className="kpp-cats" role="group" aria-labelledby={titleId}>
        {(['all', ...ADS_V2_PRESENTER_TAGS] as const).map((c) => (
          <button key={c} type="button" className="kpp-cat" aria-pressed={cat === c} onClick={() => setCat(c)}>{copy.tags[c]}</button>
        ))}
      </div>
      <fieldset className="kpp-grid" aria-labelledby={titleId}>
        {cat === 'all' ? card(null) : null}
        {shown.map((p) => card(p))}
      </fieldset>
    </section>
  )
}
