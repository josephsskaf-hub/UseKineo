'use client'

// KINEO-ADS-FLUXO-2026-10-13 — as peças do FLUXO NOVO do Studio Ads, no formato do Studio de filmes (fundador, 13/10:
// "o design do estúdio de fazer filme está muito bom; traz para o Ads"):
//   · AdsFlowTabs — "Um anúncio / Lote / Produção" no topo, como Filme/Clipe no Studio (links de página inteira);
//   · AdsStyleStage — o PALCO do estilo à direita: o equivalente do EngineHero do Studio (que não é exportado e mora com o
//     CSS do Studio — extrair mudaria a página do Studio). Usa as MESMAS classes do kit (.kps-stage/.kps-hero/.kps-frame/
//     .kps-thumbs de components/ProductStage.tsx): o vídeo do estilo no meio, nome e "ideal para" do lado, miniaturas para
//     trocar entre o estilo, a sua abertura e o quadro final. A cor do estilo pinta o brilho do palco (--stage-a/--stage-b);
//   · AdsReadCard — "Lemos sua página": nome, fotos e preço que a página deu, para corrigir;
//   · AdsStartFromRow — "Comece deste": anúncios da casa que copiam estilo + cena + pessoa (nunca o produto).
// Nada aqui chama rota, cobra ou decide preço: tudo chega pronto da sessão (AdsV2Simple.tsx). Texto só pelas frases das 16
// línguas (lib/ads/v2Flow.ts e as tabelas que já existiam). Movimento: nada toca com "reduzir movimento" (fica o pôster).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { focalPosition } from '@/lib/ads/v2Screen'
import { fill } from '@/lib/ads/v2Simple'
import { ADS_V2_FLOW_TABS, ADS_V2_START_FROM, type AdsV2FlowCopy, type AdsV2FlowTab } from '@/lib/ads/v2Flow'
import type { AdsV2StyleChoice } from '@/lib/ads/v2Styles'
import { ADS_HOUSE_STAGE } from '@/components/ProductStage'

export const ADS_FLOW_CSS = `
@property --stage-a{syntax:'<color>';inherits:true;initial-value:#2563EB}
@property --stage-b{syntax:'<color>';inherits:true;initial-value:#F43F5E}
.adv2f-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 2px;padding:4px;border-radius:14px;border:1px solid var(--ads-line,var(--border));background:color-mix(in srgb,var(--ads-card,var(--card)) 70%,transparent);width:max-content;max-width:100%}
.adv2f-tabs a{display:inline-flex;align-items:center;min-height:40px;padding:8px 16px;border-radius:10px;border:1px solid transparent;color:var(--ads-secondary,var(--muted));font-size:13.5px;font-weight:650;text-decoration:none;transition:background .18s,color .18s,border-color .18s}
.adv2f-tabs a:hover{background:color-mix(in srgb,var(--stage-a) 8%,transparent);color:var(--ads-text,var(--text))}
.adv2f-tabs a[aria-current=page]{background:color-mix(in srgb,var(--stage-a) 14%,transparent);border-color:color-mix(in srgb,var(--stage-a) 45%,transparent);color:var(--ads-text,var(--text))}
.adv2f-tabs a:focus-visible{outline:2px solid var(--ads-action,var(--accent));outline-offset:2px}
.adv2f-stage{transition:--stage-a .6s ease,--stage-b .6s ease}
.adv2f-stage .kps-info{gap:8px}
.adv2f-stage .kps-chip{white-space:normal}
.adv2f-media .house{position:absolute;inset:0;display:block;transform:scale(1.18)}
.adv2f-eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in srgb,var(--stage-a) 55%,#fff)}
.adv2f-facts{margin:6px 0 0;display:grid;gap:7px}
.adv2f-facts dt{font-size:10.5px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;color:#ffffff8c}
.adv2f-facts dd{margin:1px 0 0;font-size:13px;line-height:1.4;color:#eef2f7;overflow-wrap:anywhere}
.adv2f-facts dd.muted{color:#9aa3b2;font-style:italic}
.adv2f-cost{margin-top:4px;padding:9px 12px;border-radius:13px;background:#ffffff14;border:1px solid #ffffff26;font-size:13px;font-weight:700;line-height:1.4;color:#fff;font-variant-numeric:tabular-nums}
.adv2f-cost .short{display:block;margin-top:3px;color:#ffcf8a;font-weight:650}
.adv2f-eta{font-size:12px;color:#ffffffa6}
.adv2f-media{position:absolute;inset:0;animation:adv2f-in .45s ease both}
.adv2f-media :is(video,img){position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.adv2f-media .kb{animation:adv2f-kb 9s ease-in-out infinite alternate}
.adv2f-media .empty{position:absolute;inset:0;display:grid;place-items:center;padding:22px;text-align:center;font-size:13px;line-height:1.45;color:#ffffffa6}
@keyframes adv2f-in{from{opacity:0;transform:scale(1.015)}to{opacity:1;transform:none}}
@keyframes adv2f-kb{from{transform:scale(1)}to{transform:scale(1.1)}}
.adv2f-stage .kps-thumbs button{position:relative}
.adv2f-stage .kps-thumbs .ph{display:grid;place-items:center;width:100%;height:100%;font-size:16px;color:#ffffff73}
.adv2f-cap{display:none;margin:0;color:#fff;font-size:15px;font-weight:750;letter-spacing:-.01em;text-align:center}
.adv2f-cap small{display:block;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in srgb,var(--stage-a) 55%,#fff)}
@container (max-width:520px){.adv2f-cap{display:block}}
@media(max-width:900px){
  .kps-grid>.adv2s-slot:not(:empty){display:block;order:-1;position:static;min-width:0}
  .adv2f-stage .kps-hero{gap:10px;padding:14px}
  .adv2f-stage .kps-frame{width:auto;height:min(44svh,400px);aspect-ratio:9/16}
  .adv2f-stage .kps-thumbs button{height:64px}
}
.adv2 .adv2f-link{margin:4px 0 0;padding:16px;border-radius:16px;border:1px solid color-mix(in srgb,var(--stage-a) 35%,var(--ads-line));background:color-mix(in srgb,var(--stage-a) 6%,var(--ads-card));display:grid;gap:8px}
.adv2 .adv2f-link label{font-size:16px;font-weight:750;color:var(--ads-text);letter-spacing:-.01em}
.adv2 .adv2f-link .adv2s-linkrow{flex-wrap:nowrap}
.adv2 .adv2f-link .adv2s-linkrow input{flex:1 1 140px;min-width:0;min-height:48px;font-size:15px}
.adv2 .adv2f-link .adv2s-linkrow .adsw-btn{flex:0 0 auto;min-height:48px}
.adv2 .adv2f-stores{display:flex;flex-wrap:wrap;gap:6px 10px;margin:0;font-size:12.5px;line-height:1.45;color:var(--ads-muted)}
.adv2 .adv2f-or{display:flex;align-items:center;gap:10px;margin:14px 0 10px;font-size:12.5px;font-weight:650;color:var(--ads-muted)}
.adv2 .adv2f-or::before,.adv2 .adv2f-or::after{content:'';flex:1 1 auto;height:1px;background:var(--ads-line)}
.adv2 .adv2f-read{margin:12px 0 0;padding:14px;border-radius:16px;border:1px solid var(--ads-line);background:var(--ads-bg);display:grid;gap:10px;animation:adv2f-in .35s ease both}
.adv2 .adv2f-read h3{margin:0;display:flex;align-items:center;gap:8px;font-size:15px;color:var(--ads-text)}
.adv2 .adv2f-read h3 i{width:22px;height:22px;border-radius:99px;display:grid;place-items:center;font-style:normal;font-size:12px;background:var(--ads-success,var(--ads-action));color:var(--on-accent,#fff)}
.adv2 .adv2f-read .row{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:10px}
.adv2 .adv2f-read .pics{display:flex;gap:8px;flex-wrap:wrap}
.adv2 .adv2f-read .pics img{width:54px;height:96px;object-fit:cover;border-radius:9px;border:1px solid var(--ads-line);background:var(--ads-card)}
.adv2 .adv2f-read small{font-size:12px;color:var(--ads-muted);line-height:1.45}
@media(max-width:520px){.adv2 .adv2f-read .row{grid-template-columns:minmax(0,1fr)}}
.adv2 .adv2f-sum{margin:0 0 14px;padding:12px;border-radius:14px;border:1px solid color-mix(in srgb,var(--stage-a) 28%,var(--ads-line));background:color-mix(in srgb,var(--stage-a) 5%,var(--ads-bg));display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 12px}
.adv2 .adv2f-sum div{min-width:0}
.adv2 .adv2f-sum dt{font-size:10.5px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;color:var(--ads-muted)}
.adv2 .adv2f-sum dd{margin:2px 0 0;font-size:13px;font-weight:650;line-height:1.35;color:var(--ads-text);overflow-wrap:anywhere}
.adv2 .adv2f-sum dd.muted{color:var(--ads-muted);font-weight:500}
.adv2 .adv2f-ai{display:inline-block;margin-inline-start:4px;padding:0 6px;border-radius:99px;background:var(--ads-action);color:var(--on-accent,#fff);font-size:10px;font-weight:800;vertical-align:1px}
@media(max-width:600px){.adv2 .adv2f-sum{grid-template-columns:repeat(2,minmax(0,1fr))}}
.adv2 .adv2f-next{margin:8px 0 0;font-size:12.5px;color:var(--ads-muted);font-variant-numeric:tabular-nums}
.adv2 .adv2f-scripts{margin:0 0 14px;padding:0;border:0;display:grid;gap:8px;min-width:0}
.adv2 .adv2f-scripts legend{padding:0;margin:0 0 4px;font-size:14px;font-weight:750;color:var(--ads-text)}
.adv2 .adv2f-scripts label{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:start;padding:10px 12px;border-radius:12px;border:1px solid var(--ads-line);background:var(--ads-bg);cursor:pointer;font-size:13px;line-height:1.45;color:var(--ads-text)}
.adv2 .adv2f-scripts label:has(input:checked){border-color:var(--ads-action);box-shadow:inset 0 0 0 1px var(--ads-action)}
.adv2 .adv2f-scripts b{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:var(--ads-tint);color:var(--ads-accent);font-size:13px}
.adv2 .adv2f-scripts small{display:block;color:var(--ads-muted);font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.adv2 .adv2s-bar .adv2f-gobtn{flex:0 0 auto;max-width:62%;min-height:44px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adv2 .adv2s-bar:has(.adv2f-gobtn) .tx{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700}
.adv2f-start{margin-top:30px;min-width:0}
.adv2f-start .kps-row-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.adv2f-tile{position:relative;display:block;width:100%;padding:0;border:0;border-radius:16px;overflow:hidden;aspect-ratio:9/14;background:#06080d;cursor:pointer;text-align:start;box-shadow:0 18px 44px -24px color-mix(in srgb,var(--tile-a,var(--stage-a)) 85%,transparent),0 0 0 1px #0000000f;transition:transform .2s ease,box-shadow .2s ease}
.adv2f-tile:hover{transform:translateY(-3px)}
.adv2f-tile:focus-visible{outline:3px solid var(--tile-a,var(--stage-a));outline-offset:3px}
.adv2f-tile:disabled{opacity:.5;cursor:default;transform:none}
.adv2f-tile :is(img,video){position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
.adv2f-tile::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 38%,#000000d6);pointer-events:none}
.adv2f-tile .foot{position:absolute;z-index:2;left:10px;right:10px;bottom:10px;display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.adv2f-tile .t{color:#fff;font-size:13.5px;font-weight:750;line-height:1.25;text-wrap:balance}
.adv2f-tile .chips{display:flex;flex-wrap:wrap;gap:4px}
.adv2f-tile .chips span{padding:2px 8px;border-radius:99px;background:#ffffff26;color:#fff;font-size:10.5px;font-weight:700}
.adv2f-tile .use{padding:4px 10px;border-radius:99px;background:color-mix(in srgb,var(--tile-a,var(--stage-a)) 85%,#000);color:#fff;font-size:11.5px;font-weight:800}
@media(max-width:900px){.adv2f-start .kps-row-grid{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;padding-bottom:6px}.adv2f-tile{flex:0 0 42%;scroll-snap-align:start}}
@media(prefers-reduced-motion:reduce){.adv2f-stage,.adv2f-tabs a,.adv2f-tile{transition:none}.adv2f-media,.adv2 .adv2f-read{animation:none}.adv2f-media .kb{animation:none}.adv2f-tile:hover{transform:none}}
`

function reducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

/** Vídeo mudo em laço; com "reduzir movimento" fica o pôster parado. */
function StageLoop({ src, poster }: { src: string; poster: string | null }) {
  const [still, setStill] = useState(true)
  useEffect(() => { setStill(reducedMotion()) }, [])
  // eslint-disable-next-line @next/next/no-img-element
  if (still) return poster ? <img src={poster} alt="" /> : null
  return <video src={src} poster={poster ?? undefined} muted loop playsInline autoPlay preload="metadata" aria-hidden="true" tabIndex={-1} />
}

// ─── as abas do topo ────────────────────────────────────────────────────────────────────────────────────────────────

export function AdsFlowTabs({ active, copy }: { active: AdsV2FlowTab | null; copy: AdsV2FlowCopy }) {
  return (
    <nav className="adv2f-tabs" aria-label={copy.tabs.label} data-kineo="ads-flow-tabs">
      {ADS_V2_FLOW_TABS.map((t) => (
        <a key={t.id} href={t.href} aria-current={active === t.id ? 'page' : undefined}>{copy.tabs[t.id]}</a>
      ))}
    </nav>
  )
}

// ─── o palco do estilo ──────────────────────────────────────────────────────────────────────────────────────────────

export type AdsStageView = 'style' | 'opening' | 'end'
export interface AdsStyleStageData {
  style: AdsV2StyleChoice
  tint: readonly [string, string]
  name: string
  desc: string
  bestFor: string | null
  /** o vídeo feito PELO PRÓPRIO efeito (public/ads-styles/<estilo>.mp4); null = Auto */
  preview: string | null
  poster: string | null
  photo: { srcUrl: string; fx: number; fy: number } | null
  cardUrl: string | null
  presenterPoster: string | null
  productName: string
  scene: { label: string; text: string; muted: boolean } | null
  voice: string
  costText: string
  shortText: string | null
}
export interface AdsStyleStageLabels {
  product: string
  voice: string
  delivery: string
  empty: string
  presenter: string
}

/** O palco da direita (computador) e do topo (celular), pelo portal que o invólucro oferece. Sem vaga = nada. */
export function AdsStyleStage({ slot, data, copy, labels }: { slot: HTMLElement | null; data: AdsStyleStageData; copy: AdsV2FlowCopy; labels: AdsStyleStageLabels }) {
  if (!slot) return null
  return createPortal(<AdsStyleStageView data={data} copy={copy} labels={labels} />, slot)
}

export function AdsStyleStageView({ data, copy, labels }: { data: AdsStyleStageData; copy: AdsV2FlowCopy; labels: AdsStyleStageLabels }) {
  const [view, setView] = useState<AdsStageView>('style')
  // Estilo novo = o palco volta ao vídeo do estilo (é a escolha que acabou de mudar).
  useEffect(() => { setView('style') }, [data.style])
  const house = ADS_HOUSE_STAGE[0]
  const views: AdsStageView[] = ['style', 'opening', 'end']
  const viewLabel: Record<AdsStageView, string> = { style: copy.stage.style, opening: copy.stage.opening, end: copy.stage.end }
  let media: ReactNode
  let badge: string
  if (view === 'style') {
    if (data.preview) {
      media = <StageLoop src={data.preview} poster={data.poster} />
      badge = `${copy.stage.badge} · ${data.name}`
    } else if (data.photo) {
      // eslint-disable-next-line @next/next/no-img-element
      media = <img className="kb" src={data.photo.srcUrl} alt="" style={{ objectPosition: focalPosition(data.photo.fx, data.photo.fy) }} />
      badge = data.name
    } else {
      // Auto e sem foto: o anúncio da casa (3 looks lado a lado; o do meio enche o 9:16), com o selo do motor REAL que o fez.
      media = <span className="house"><StageLoop src={house.video ?? ''} poster={house.poster ?? null} /></span>
      badge = house.badge
    }
  } else if (view === 'opening') {
    // eslint-disable-next-line @next/next/no-img-element
    media = data.photo ? <img src={data.photo.srcUrl} alt="" style={{ objectPosition: focalPosition(data.photo.fx, data.photo.fy) }} /> : <span className="empty">{labels.empty}</span>
    badge = data.presenterPoster ? labels.presenter : copy.stage.opening
  } else {
    // eslint-disable-next-line @next/next/no-img-element
    media = data.cardUrl ? <img src={data.cardUrl} alt="" /> : <span className="empty">{copy.stage.end}</span>
    badge = copy.stage.end
  }
  const thumb = (v: AdsStageView): ReactNode => {
    const src = v === 'style' ? data.poster ?? (data.photo ? data.photo.srcUrl : house.poster ?? null) : v === 'opening' ? data.photo?.srcUrl ?? null : data.cardUrl
    // eslint-disable-next-line @next/next/no-img-element
    return src ? <img src={src} alt="" loading="lazy" /> : <span className="ph" aria-hidden="true">·</span>
  }
  const style = { '--stage-a': data.tint[0], '--stage-b': data.tint[1] } as CSSProperties
  return (
    <aside className="kps-stage adv2f-stage" aria-label={`${copy.stage.eyebrow}: ${data.name}`} data-kineo="ads-style-stage" data-style={data.style} style={style}>
      <div className="kps-hero">
        <div className="kps-info">
          <span className="adv2f-eyebrow">{copy.stage.eyebrow}</span>
          <h2 className="kps-name">{data.name}</h2>
          <p className="kps-desc">{data.desc}</p>
          {data.bestFor ? <p className="kps-chip">{copy.stage.bestFor}: {data.bestFor}</p> : null}
          <dl className="adv2f-facts">
            <div><dt>{labels.product}</dt><dd>{data.productName || '—'}</dd></div>
            {data.scene ? <div data-kineo="ads-live-scene"><dt>{data.scene.label}</dt><dd className={data.scene.muted ? 'muted' : undefined}>{data.scene.text}</dd></div> : null}
          </dl>
          <span className="adv2f-eta">🎙 {fill(labels.voice, { lang: data.voice })}</span>
          <div className="adv2f-cost" role="status">
            {data.costText}
            {data.shortText ? <span className="short">{data.shortText}</span> : null}
          </div>
          <span className="adv2f-eta">⏱ {labels.delivery}</span>
        </div>
        <div className="kps-frame">
          <div key={`${view}:${data.style}:${view === 'style' ? data.preview ?? '' : ''}`} className="adv2f-media">{media}</div>
          <span className="kps-badge">{badge}</span>
        </div>
        <p className="adv2f-cap"><small>{copy.stage.eyebrow}</small>{data.name}</p>
        <div className="kps-thumbs" role="tablist" aria-label={data.name}>
          {views.map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} aria-label={viewLabel[v]} title={viewLabel[v]} className={view === v ? 'on' : undefined} onClick={() => setView(v)}>
              {thumb(v)}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

// ─── "Lemos sua página" ─────────────────────────────────────────────────────────────────────────────────────────────

export function AdsReadCard({
  copy,
  host,
  photos,
  name,
  namePlaceholder,
  onName,
  price,
  onPrice,
  pricePlaceholder,
  priceFound,
  disabled,
}: {
  copy: AdsV2FlowCopy
  host: string
  photos: string[]
  name: string
  namePlaceholder: string
  onName: (v: string) => void
  price: string
  onPrice: (v: string) => void
  pricePlaceholder: string
  priceFound: boolean
  disabled: boolean
}) {
  return (
    <div className="adv2f-read" role="group" aria-labelledby="adv2f-read-h" data-kineo="ads-link-read">
      <h3 id="adv2f-read-h"><i aria-hidden="true">✓</i>{copy.read.title}</h3>
      <small>{fill(copy.read.from, { host, n: photos.length })} · {copy.read.fix}</small>
      {photos.length ? (
        <div className="pics">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photos.map((u) => <img key={u} src={u} alt="" />)}
        </div>
      ) : null}
      <div className="row">
        <label className="adsw-f" style={{ margin: 0 }}>
          <span>{copy.read.name}</span>
          <input type="text" value={name} maxLength={60} disabled={disabled} placeholder={namePlaceholder} onChange={(e) => onName(e.target.value)} />
        </label>
        <label className="adsw-f" style={{ margin: 0 }}>
          <span>{copy.read.price}</span>
          <input type="text" value={price} maxLength={60} disabled={disabled} placeholder={pricePlaceholder} onChange={(e) => onPrice(e.target.value)} />
        </label>
      </div>
      {!priceFound && !price.trim() ? <small>{copy.read.priceNone}</small> : null}
    </div>
  )
}

// ─── "Comece deste" ─────────────────────────────────────────────────────────────────────────────────────────────────

function TileMedia({ video, poster }: { video: string; poster: string }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const [live, setLive] = useState(false)
  useEffect(() => { setLive(!reducedMotion()) }, [])
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" loading="lazy" decoding="async" />
      {live ? <video ref={ref} data-tile-video="" src={video} poster={poster} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} /> : null}
    </>
  )
}

type AdsStartFromProps = {
  copy: AdsV2FlowCopy
  titleOf: (id: string) => string
  chipsOf: (id: string) => string[]
  tintOf: (id: string) => string
  onUse: (id: string) => void
  disabled: boolean
}

/** A fileira embaixo do quadro, pelo portal que o invólucro oferece. Sem vaga = nada. */
export function AdsStartFromRow({ slot, ...props }: AdsStartFromProps & { slot: HTMLElement | null }) {
  if (!slot) return null
  return createPortal(<AdsStartFromView {...props} />, slot)
}

export function AdsStartFromView({ copy, titleOf, chipsOf, tintOf, onUse, disabled }: AdsStartFromProps) {
  const play = (el: HTMLElement, on: boolean) => {
    const v = el.querySelector<HTMLVideoElement>('video[data-tile-video]')
    if (!v) return
    if (on) void v.play().catch(() => undefined)
    else v.pause()
  }
  return (
    <section className="kps-row adv2f-start" aria-labelledby="adv2f-start-h" data-kineo="ads-start-from">
      <h2 id="adv2f-start-h">{copy.start.title}</h2>
      <p>{copy.start.sub}</p>
      <div className="kps-row-grid">
        {ADS_V2_START_FROM.map((it) => {
          const title = titleOf(it.id)
          return (
            <button
              key={it.id}
              type="button"
              className="adv2f-tile"
              data-start-from={it.id}
              disabled={disabled}
              aria-label={`${copy.start.use}: ${title}`}
              style={{ ['--tile-a' as string]: tintOf(it.id) } as CSSProperties}
              onPointerEnter={(e) => play(e.currentTarget, true)}
              onPointerLeave={(e) => play(e.currentTarget, false)}
              onFocus={(e) => play(e.currentTarget, true)}
              onBlur={(e) => play(e.currentTarget, false)}
              onClick={() => onUse(it.id)}
            >
              <TileMedia video={it.video} poster={it.poster} />
              <span className="foot">
                <span className="t">{title}</span>
                <span className="chips">{chipsOf(it.id).map((c) => <span key={c}>{c}</span>)}</span>
                <span className="use">{copy.start.use} →</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
