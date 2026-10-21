'use client'

// KINEO-ADS-NOTA9-2110 — as peças da tela FOCO do Studio Ads (/ads/v2?entry=ugc | ?entry=product, os cards da home). Fundador 21/10:
// KINEO-ADS-NOTA9-2110 — "experiência do cliente no mínimo em 9" — a mesma sensação do filme: 1 escolha visual + 1 frase + Gerar.
//   · AdsNota9Faces — "Escolha quem apresenta o seu produto": os rostos APROVADOS em tiles grandes (+ "Me surpreenda" = o sorteio de sempre,
//     que só sorteia entre os aprovados no servidor). Mexe no MESMO presenterPick da tela; ▶ toca a voz que o anúncio vai usar
//     (adsV2PresenterV2SampleFor, a mesma do seletor completo).
//   · AdsNota9Stage — o palco da direita na tela foco: no UGC, o apresentador escolhido (vídeo de verdade quando há, senão o retrato) com a
//     foto do produto no canto; no produto, a foto da pessoa (ou o anúncio real da casa no Close do produto). SEM preço: a única linha de
//     custo mora em cima do Gerar.
//   · ADS_NOTA9_CSS — o desenho da tela foco e as regras que recolhem o "Avançado" (o resto da tela de sempre, nas mesmas posições do DOM:
//     nada muda de lugar no código, o pedido sai idêntico quando a pessoa não abre).
// Selo honesto: todo rosto leva "IA"; nenhum depoimento, nota ou avaliação aparece. Nada aqui chama rota, cobra ou decide preço.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ADS_V2_PRESENTER_LIBRARY, type AdsV2PresenterEntry } from '@/lib/ads/v2Presenter'
import { ADS_V2_PRESENTER_V2_APPROVED, adsV2PresenterV2SampleFor } from '@/lib/ads/v2PresenterV2'
import { adsNota9Faces, type AdsNota9Copy, type AdsNota9Focus } from '@/lib/ads/v2Nota9'

export const ADS_NOTA9_CSS = `
.adv2n-who{margin:0 0 4px}
.adv2n-who .adv2n-hint{margin:2px 0 10px;font-size:12.5px;line-height:1.45;color:var(--muted,var(--ads-muted))}
.adv2n-faces{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0;padding:0;border:0;min-width:0}
.adv2n-face{position:relative;min-width:0;border-radius:16px;border:1px solid var(--border,var(--ads-line));background:var(--card2,var(--ads-card));transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
.adv2n-face:hover{transform:translateY(-2px)}
.adv2n-face[data-on=true]{border-color:var(--accent,var(--ads-action));box-shadow:0 0 0 2px var(--accent,var(--ads-action)),0 14px 30px -18px var(--accent,var(--ads-action))}
.adv2n-face:focus-within{outline:3px solid var(--accent,var(--ads-action));outline-offset:2px}
.adv2n-face label{display:grid;gap:4px;padding:5px 5px 8px;cursor:pointer;color:var(--text,var(--ads-text))}
.adv2n-face .m{position:relative;display:block;aspect-ratio:1;border-radius:12px;overflow:hidden;background:#0b1018}
.adv2n-face .m img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 20%;display:block}
.adv2n-face .ai{position:absolute;top:6px;left:6px;padding:1px 6px;border-radius:999px;background:rgba(10,10,14,.72);color:#fff;font-size:10px;font-weight:800;line-height:1.4}
.adv2n-face .ck{position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:999px;display:grid;place-items:center;background:var(--accent,var(--ads-action));color:#fff;font-size:13px;font-weight:900;transform:scale(0);transition:transform .18s cubic-bezier(.3,1.6,.5,1)}
.adv2n-face[data-on=true] .ck{transform:scale(1)}
.adv2n-face .nm{font-size:13.5px;font-weight:750;line-height:1.2;padding:0 2px}
.adv2n-face .tg{display:none}
.adv2n-face .sp{position:absolute;inset:0;display:grid;place-items:center;align-content:center;gap:4px;text-align:center;background:radial-gradient(120% 90% at 30% 15%,color-mix(in srgb,var(--accent,#2563EB) 40%,transparent),transparent 62%),linear-gradient(160deg,color-mix(in srgb,var(--accent,#2563EB) 24%,#0b1018),#0b1018);color:#fff}
.adv2n-face .sp b{font-size:30px;line-height:1}
.adv2n-face .pl{position:absolute;right:10px;bottom:36px;z-index:2;width:30px;height:30px;border-radius:999px;border:0;display:grid;place-items:center;background:rgba(10,10,14,.72);color:#fff;font-size:12px;cursor:pointer}
.adv2n-face .pl[data-on=true],.adv2n-face .pl:hover{background:var(--accent,var(--ads-action))}
.adv2n-face .pl:focus-visible{outline:2px solid var(--accent,var(--ads-action));outline-offset:2px}
.adv2n-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:520px){.adv2n-faces{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.adv2n-face label{padding:3px 3px 6px}.adv2n-face .nm{font-size:12px}.adv2n-face .pl{right:6px;bottom:28px;width:26px;height:26px}}
.adv2n-count{margin:4px 2px 0;font-size:11.5px;text-align:end;color:var(--muted,var(--ads-muted));font-variant-numeric:tabular-nums}
.adv2n-count.adsw-warn{text-align:start;font-size:12.5px}
.adv2n-tiny{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0 0 8px}
.adv2n-opt{margin:-2px 0 8px;font-size:12px;line-height:1.4;color:var(--muted,var(--ads-muted))}
[data-kineo="ads-nota9-text"] .adv2q-prompt{width:100%;min-height:64px}
.adv2n-go{margin-top:14px}
.adv2n-cost{margin:0 0 8px;padding:10px 12px;border-radius:12px;border:1px solid var(--border,var(--ads-line));background:var(--card2,var(--ads-soft));font-size:13.5px;line-height:1.45;font-weight:650;color:var(--text,var(--ads-text));display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-variant-numeric:tabular-nums}
.adv2n-cost[data-kind=free]{border-color:color-mix(in srgb,#10B981 55%,transparent);background:color-mix(in srgb,#10B981 12%,transparent)}
.adv2n-cost[data-kind=short]{border-color:color-mix(in srgb,#F59E0B 60%,transparent);background:color-mix(in srgb,#F59E0B 12%,transparent)}
.adv2n-cost a{margin-inline-start:auto;display:inline-flex;align-items:center;min-height:32px;padding:4px 14px;border-radius:10px;background:#F59E0B;color:#111;font-weight:800;font-size:13px;text-decoration:none}
.adv2n-go .adv2n-script{display:block;margin:8px auto 0;background:none;border:0;padding:4px;color:var(--accent,var(--ads-accent));font:inherit;font-size:12.5px;font-weight:650;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.adv2n-adv{margin:14px 0 0}
.adv2n-adv>button{display:flex;align-items:center;gap:8px;width:100%;min-height:46px;padding:0 14px;border:1px solid var(--border,var(--ads-line));border-radius:13px;background:transparent;color:var(--text,var(--ads-text));font:inherit;font-size:13px;font-weight:700;cursor:pointer;text-align:start}
.adv2n-adv>button span{font-weight:500;color:var(--muted,var(--ads-muted));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.adv2n-adv>button::after{content:'';margin-inline-start:auto;flex:none;width:7px;height:7px;border-right:1.5px solid var(--muted,#8a8f98);border-bottom:1.5px solid var(--muted,#8a8f98);transform:rotate(45deg) translateY(-2px);transition:transform .15s}
.adv2n-adv>button[aria-expanded=true]::after{transform:rotate(225deg) translateY(-2px)}
.adv2n-adv .ways{margin:10px 2px 0;font-size:12.5px;line-height:1.7;color:var(--muted,var(--ads-muted))}
.adv2n-adv .ways a{margin-inline-start:10px;color:var(--text2,var(--ads-text));text-decoration:underline;text-underline-offset:3px}
.adv2-layout[data-nota9] [data-kineo="ads-quadro-go"],.adv2-layout[data-nota9] .adv2s-bar,.adv2-layout[data-nota9] .adv2-aside,.adv2-layout[data-nota9] #adv2s-sec2 .adv2q-text{display:none!important}
.adv2-layout[data-adv=closed] :is(#adv2s-sec2,#adv2s-sec3,[data-kineo="ads-quadro-level"],[data-kineo="ads-quadro-voice"],[data-kineo="ads-pronounce-ask"],#adv2q-styles-all,.adv2s-more,#adv2s-sec4){display:none!important}
.adv2-layout[data-adv=open] :is(#adv2s-sec2,#adv2s-sec3,[data-kineo="ads-quadro-level"],[data-kineo="ads-quadro-voice"],[data-kineo="ads-pronounce-ask"],#adv2q-styles-all,.adv2s-more,#adv2s-sec4){margin-inline-start:6px;padding-inline-start:12px;border-inline-start:2px solid var(--border,var(--ads-line))}
.adv2-layout[data-adv=open] #adv2s-sec2{margin-top:12px}
.adv2-layout[data-nota9] :is(#adv2s-sec2,#adv2s-sec3,#adv2s-sec4) :is(h2>.n,h2>.adv2-num){display:none}
.adv2n-adv .ways a{white-space:nowrap}
.adv2-layout[data-nota9] .kps-panel .adv2q-board>#adv2s-sec4,.kps-panel .adv2-layout[data-nota9] #adv2s-sec4{border-top:0}
.adv2.kps-page:has(.adv2-layout[data-nota9]) .adv2s-slot>[data-kineo="ads-style-stage"],[data-kineo="ads-nota9-stage"]~[data-kineo="ads-style-stage"]{display:none!important}
.adv2.kps-page:has(.adv2-layout[data-nota9]) .adv2f-rowslot{display:none!important}
.adv2n-stage .adv2n-inset{position:absolute;right:12px;bottom:12px;z-index:3;width:30%;aspect-ratio:1;border-radius:14px;overflow:hidden;border:2px solid #fff;box-shadow:0 10px 24px -10px #000;background:#fff;line-height:0}
.adv2n-stage .adv2n-inset img{width:100%;height:100%;object-fit:cover}
.adv2n-stage .adv2n-media{position:absolute;inset:0;line-height:0}
.adv2n-stage .adv2n-media :is(img,video){width:100%;height:100%;object-fit:cover;object-position:50% 22%;display:block}
.adv2n-stage .adv2n-empty{position:absolute;inset:0;display:grid;place-items:center;padding:20px;text-align:center;color:#c9d2e0;font-size:13px;line-height:1.5}
.adv2n-stage .kps-badge{left:12px;bottom:12px}
.adv2n-stage[data-focus=ugc] .kps-badge{bottom:auto;top:12px}
.adv2n-stage .adv2n-row{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 0}
.adv2n-stage .adv2n-row span{padding:5px 11px;border-radius:999px;background:#ffffff14;border:1px solid #ffffff26;font-size:12px;font-weight:700;color:#fff}
@media(prefers-reduced-motion:reduce){.adv2n-face,.adv2n-face:hover,.adv2n-face .ck{transition:none;transform:none}.adv2n-face[data-on=true] .ck{transform:none}}
`

/** "Escolha quem apresenta o seu produto": os rostos aprovados (tiles grandes) + "Me surpreenda" (null = o sorteio de sempre). */
export function AdsNota9Faces({ value, onChange, disabled, copy, voiceLanguage = null, tags }: { value: string | null; onChange: (id: string | null) => void; disabled?: boolean; copy: AdsNota9Copy; voiceLanguage?: string | null; tags?: Partial<Record<string, string>> }) {
  const faces = adsNota9Faces(ADS_V2_PRESENTER_LIBRARY, ADS_V2_PRESENTER_V2_APPROVED)
  const [playing, setPlaying] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null }, [])
  const play = (p: AdsV2PresenterEntry) => {
    const src = adsV2PresenterV2SampleFor(p, voiceLanguage)
    if (!src) return
    audioRef.current?.pause()
    if (playing === p.id) { audioRef.current = null; setPlaying(null); return }
    const a = new Audio(src)
    audioRef.current = a
    a.onended = () => setPlaying((cur) => (cur === p.id ? null : cur))
    a.onerror = () => setPlaying((cur) => (cur === p.id ? null : cur))
    setPlaying(p.id)
    a.play().catch(() => setPlaying((cur) => (cur === p.id ? null : cur)))
  }
  const tile = (p: AdsV2PresenterEntry | null) => {
    const id = p ? p.id : 'auto'
    const on = p ? value === p.id : value === null
    const hear = p ? adsV2PresenterV2SampleFor(p, voiceLanguage) : null
    return (
      <div key={id} className="adv2n-face" data-on={on} data-kineo="ads-nota9-face" data-id={id}>
        <label>
          <input className="adv2n-sr" type="radio" name="adv2n-who" value={id} checked={on} disabled={disabled} onChange={() => onChange(p ? p.id : null)} />
          <span className="m">
            {p && p.portrait ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.portrait} alt="" loading="eager" decoding="async" />
            ) : (
              <span className="sp" aria-hidden="true"><b>✦</b></span>
            )}
            {p ? <span className="ai">{copy.ai}</span> : null}
            <span className="ck" aria-hidden="true">✓</span>
          </span>
          <span className="nm">{p ? p.name : copy.surprise}</span>
          <span className="tg">{p ? tags?.[p.tag] ?? '' : copy.surpriseLine}</span>
        </label>
        {p && hear ? (
          <button type="button" className="pl" data-on={playing === p.id} aria-label={`▶ ${p.name}`} onClick={() => play(p)}>{playing === p.id ? '■' : '▶'}</button>
        ) : null}
      </div>
    )
  }
  return (
    <fieldset className="adv2n-faces" aria-labelledby="adv2n-who-h" data-kineo="ads-nota9-faces">
      {faces.map((p) => tile(p))}
      {tile(null)}
    </fieldset>
  )
}

export interface AdsNota9StageData {
  focus: AdsNota9Focus
  tint: readonly [string, string]
  /** o apresentador escolhido (null = "Me surpreenda") */
  presenter: AdsV2PresenterEntry | null
  /** o vídeo do card da home (o anúncio real da casa no formato), quando não há escolha/foto */
  houseClip: { src: string; poster: string }
  photo: { srcUrl: string; position: string } | null
  productName: string
  voice: string
}

/** O palco da direita na tela foco (portal na vaga do palco; null = sem palco). Sem preço. */
export function AdsNota9Stage({ slot, data, copy }: { slot: HTMLElement | null; data: AdsNota9StageData; copy: AdsNota9Copy }) {
  if (!slot) return null
  return createPortal(<AdsNota9StageView data={data} copy={copy} />, slot)
}

export function AdsNota9StageView({ data, copy }: { data: AdsNota9StageData; copy: AdsNota9Copy }) {
  const ugc = data.focus === 'ugc'
  const p = ugc ? data.presenter : null
  let media
  if (ugc) {
    media = p && p.clip
      ? <video key={p.id} src={p.clip} poster={p.portrait ?? undefined} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
      : p && p.portrait
        // eslint-disable-next-line @next/next/no-img-element
        ? <img key={p.id} src={p.portrait} alt="" />
        : <video key="house" src={data.houseClip.src} poster={data.houseClip.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
  } else {
    media = data.photo
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={data.photo.srcUrl} alt="" style={{ objectPosition: data.photo.position }} />
      : <video key="house" src={data.houseClip.src} poster={data.houseClip.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
  }
  const name = ugc ? (p ? p.name : copy.surprise) : data.productName || copy.titleProduct
  const style = { '--stage-a': data.tint[0], '--stage-b': data.tint[1] } as CSSProperties
  return (
    <aside className="kps-stage adv2f-stage adv2n-stage" data-kineo="ads-nota9-stage" data-focus={data.focus} aria-label={`${ugc ? copy.eyebrowUgc : copy.eyebrowProduct}: ${name}`} style={style}>
      <div className="kps-hero">
        <div className="kps-info">
          <span className="adv2f-eyebrow">{ugc ? copy.eyebrowUgc : copy.eyebrowProduct}</span>
          <h2 className="kps-name">{name}{ugc && p ? <span className="kpp-ai" style={{ marginInlineStart: 10, fontSize: 12, verticalAlign: 'middle', padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,.14)' }}>{copy.ai}</span> : null}</h2>
          <p className="kps-desc">{ugc ? (p ? `${p.name} ${copy.holds}.` : copy.surpriseLine) : copy.productDesc}</p>
          <div className="adv2n-row">
            {data.productName && ugc ? <span>{data.productName}</span> : null}
            <span>🎙 {data.voice}</span>
            <span>⏱ {copy.delivery}</span>
          </div>
        </div>
        <div className="kps-frame">
          <div className="adv2n-media">{media}</div>
          {ugc && data.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <span className="adv2n-inset"><img src={data.photo.srcUrl} alt="" style={{ objectPosition: data.photo.position }} /></span>
          ) : null}
          {!ugc && !data.photo ? <span className="kps-badge">Studio Ads</span> : null}
          {ugc ? <span className="kps-badge">{copy.ai} · {copy.eyebrowUgc}</span> : null}
        </div>
      </div>
    </aside>
  )
}
