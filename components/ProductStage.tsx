'use client'
// KINEO-ABAS-PALCO-2026-10-01 — fundador: "gostei tanto do que você fez [no Studio] que queria estender para todas as
// outras abas — Imagens, Espaços e Ads — no mesmo formato… ficou perfeito para uma agência de marketing".
// O formato do Studio, em peças reutilizáveis:
//   · a cor do produto pinta a tela inteira e a barra lateral (html[data-studio-stage], o mesmo atributo do Studio);
//   · o "quadro de engenharia" na esquerda (.kps-panel) e o palco escuro na direita (.kps-stage), na altura da tela;
//   · a "reta" de exemplos da casa embaixo (.kps-row).
// Selo honesto: o palco só mostra peças da casa feitas na Kineo, e o selo diz o motor real de cada uma.
import { useEffect, useState, type ReactNode } from 'react'
import { UiLabel } from '@/components/InterfaceLanguage'

export type ProductStageKey = 'images' | 'spaces' | 'ads'

/** Par de cores de cada produto (mesmo papel do STAGE_TINT dos motores no Studio). */
export const PRODUCT_TINT: Record<ProductStageKey, [string, string]> = {
  images: ['#FF4D8D', '#FFB020'],
  spaces: ['#C2410C', '#E9B872'],
  ads: ['#2563EB', '#F43F5E'],
}

/** KINEO-ABAS-PALCO-2026-10-01 — anúncios da casa (o card da home): cada quadro = 3 variações do mesmo produto, feitas na
 *  Kineo com Nano Banana Pro + Kling 2.5 (conta do fundador, 30/09). */
export const ADS_HOUSE_STAGE: StageItem[] = [
  { title: 'Water bottle — 3 looks', badge: 'Nano Banana Pro + Kling 2.5', video: '/previews/promo-ads-3var-1.mp4', poster: '/posters/promo-ads-3var-1.webp' },
  { title: 'Headphones — 3 looks', badge: 'Nano Banana Pro + Kling 2.5', video: '/previews/promo-ads-3var-2.mp4', poster: '/posters/promo-ads-3var-2.webp' },
  { title: 'Sneakers — 3 looks', badge: 'Nano Banana Pro + Kling 2.5', video: '/previews/promo-ads-3var-3.mp4', poster: '/posters/promo-ads-3var-3.webp' },
]

/** Uma peça do palco: vídeo (com capa) ou par antes→depois. `badge` = motor real que fez a peça. */
export type StageItem = {
  title: string
  badge: string
  video?: string
  poster?: string
  before?: string
  after?: string
  /** imagem da própria conta (proporção livre): mostrar inteira, sem cortar */
  contain?: boolean
}

/** A raiz da página leva o produto (pinta a tela e a barra lateral); sai junto com a tela. */
export function useProductStage(key: ProductStageKey) {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.studioStage = key
    return () => { delete root.dataset.studioStage }
  }, [key])
}

const TINT_CSS = (Object.entries(PRODUCT_TINT) as [ProductStageKey, [string, string]][])
  .map(([k, [a, b]]) => `html[data-studio-stage="${k}"]{--stage-a:${a};--stage-b:${b}}`)
  .join('\n')

export const PRODUCT_STAGE_CSS = `
@property --stage-a{syntax:'<color>';inherits:true;initial-value:#0A5CFF}
@property --stage-b{syntax:'<color>';inherits:true;initial-value:#22D3EE}
html{--stage-a:#0A5CFF;--stage-b:#22D3EE;transition:--stage-a .7s ease,--stage-b .7s ease}
main:has(.kps-page){background:radial-gradient(1100px 820px at 16% 58%,color-mix(in srgb,var(--stage-b) 20%,transparent),transparent 72%),radial-gradient(1100px 640px at 86% 2%,color-mix(in srgb,var(--stage-a) 18%,transparent),transparent 70%),radial-gradient(1000px 640px at 70% 100%,color-mix(in srgb,var(--stage-a) 12%,transparent),transparent 72%),radial-gradient(900px 560px at 30% -6%,color-mix(in srgb,var(--stage-a) 14%,transparent),transparent 72%),linear-gradient(135deg,color-mix(in srgb,var(--stage-b) 10%,var(--bg)),color-mix(in srgb,var(--stage-a) 10%,var(--bg)))}
html .kps-page{background:transparent!important}
html[data-studio-stage] aside:has(>nav[data-nav-surface=sidebar]){--sidebar-bg:radial-gradient(130% 55% at 0% 0%,color-mix(in srgb,var(--stage-a) 46%,transparent),transparent 72%),radial-gradient(130% 50% at 100% 100%,color-mix(in srgb,var(--stage-b) 40%,transparent),transparent 72%),#06080d;--text:#F2F4F7;--text2:#D5DBE4;--muted:#A3ADBB;--muted2:#8A93A3;--border:#ffffff1c;--border2:#ffffff2e;--card:#ffffff12;--card2:#ffffff1a;--accent:#FFFFFF;--accent-soft:color-mix(in srgb,var(--stage-a) 34%,transparent);--indigo:color-mix(in srgb,var(--stage-a) 65%,#fff);color-scheme:dark;color:var(--text);border-right-color:#ffffff14!important}
html[data-studio-stage]{--header-bg:color-mix(in srgb,var(--stage-b) 9%,var(--bg))}
.kps-grid{display:grid;grid-template-columns:minmax(460px,1fr) minmax(0,1.6fr);gap:20px;align-items:start;width:100%;min-width:0}
.kps-panel{min-width:0;padding:24px;border-radius:18px;background:color-mix(in srgb,var(--card) 78%,transparent);border:1px solid color-mix(in srgb,var(--stage-a) 22%,var(--border));-webkit-backdrop-filter:blur(18px) saturate(1.25);backdrop-filter:blur(18px) saturate(1.25);box-shadow:var(--sh-card)}
.kps-panel .card{background:transparent;border:0;border-top:1px solid var(--border);border-radius:0;box-shadow:none;padding:14px 0 4px}
.kps-panel>.card:first-child,.kps-panel>:first-child>.card:first-child{border-top:0;padding-top:0}
.kps-stage{position:sticky;top:16px;align-self:start;min-width:0;height:clamp(460px,calc(100svh - 280px),820px);border-radius:26px;overflow:hidden;background:#06080d;isolation:isolate;container-type:inline-size;box-shadow:0 30px 80px -30px color-mix(in srgb,var(--stage-a) 55%,transparent),0 1px 0 #ffffff14 inset}
.kps-stage::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(60% 55% at 50% 28%,color-mix(in srgb,var(--stage-a) 40%,transparent),transparent 72%),radial-gradient(55% 50% at 92% 100%,color-mix(in srgb,var(--stage-b) 40%,transparent),transparent 70%),radial-gradient(45% 45% at 0% 100%,color-mix(in srgb,var(--stage-a) 28%,transparent),transparent 70%)}
.kps-stage::after{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(70% 70% at 50% 40%,#000,transparent)}
.kps-hero{position:absolute;inset:24px;display:flex;align-items:center;justify-content:space-between;gap:clamp(18px,3cqw,40px);color:#eef2f7}
.kps-hero.is-wide{flex-direction:column;align-items:stretch;justify-content:center}
.kps-info{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:10px;justify-content:center;max-width:340px}
.kps-hero.is-wide .kps-info{flex:none;max-width:none;flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:6px 14px}
.kps-stage .kps-name{margin:0;font-size:clamp(26px,2.4vw,40px);line-height:1.05;letter-spacing:-.03em;font-weight:750;color:#fff!important;text-wrap:balance}
.kps-stage .kps-desc{margin:0;font-size:14px;line-height:1.5;color:#d7deea!important}
.kps-hero.is-wide .kps-desc{font-size:13px;max-width:60ch}
.kps-stage .kps-chip{margin:4px 0 0;color:#fff!important;align-self:flex-start;white-space:nowrap;padding:6px 12px;border-radius:999px;background:#ffffff14;border:1px solid #ffffff26;font-size:12px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums}
.kps-stage .kps-title{margin:6px 0 0;font-size:13px;line-height:1.45;color:#ffffffb3!important;font-style:italic}
.kps-frame{position:relative;flex:none;height:100%;aspect-ratio:9/16;border-radius:20px;overflow:hidden;background:#05070b;line-height:0;box-shadow:0 24px 60px -20px #000c,0 0 0 1px #ffffff1f}
.kps-hero.is-wide .kps-frame{height:auto;width:100%;aspect-ratio:768/522;flex:0 1 auto;min-height:0;max-height:calc(100% - 120px);margin:0 auto}
.kps-frame :is(video,img){position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.kps-frame .kps-before{clip-path:inset(0 50% 0 0);animation:kps-wipe 6s ease-in-out infinite}
@keyframes kps-wipe{0%,12%{clip-path:inset(0 0 0 0)}45%,62%{clip-path:inset(0 100% 0 0)}92%,100%{clip-path:inset(0 0 0 0)}}
.kps-tag{position:absolute;z-index:2;top:12px;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.62);color:#fff;font-size:11px;font-weight:800;letter-spacing:.08em;line-height:1.2}
.kps-tag.l{left:12px}.kps-tag.r{right:12px}
.kps-badge{position:absolute;left:12px;bottom:12px;z-index:2;line-height:1.2;background:rgba(0,0,0,.62);color:#f5f5f7;border-radius:999px;padding:5px 11px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.kps-thumbs{flex:1 1 0;height:100%;display:flex;flex-direction:column;gap:10px;align-items:flex-end;justify-content:center}
.kps-hero.is-wide .kps-thumbs{flex:none;height:auto;flex-direction:row;justify-content:flex-start}
.kps-thumbs button{height:min(104px,calc((100% - 30px) / 4));aspect-ratio:9/16;padding:0;border:0;border-radius:10px;overflow:hidden;cursor:pointer;background:#0b0f17;opacity:.55;box-shadow:0 0 0 1px #ffffff26;transition:opacity .15s,box-shadow .15s,transform .15s}
.kps-hero.is-wide .kps-thumbs button{height:58px;aspect-ratio:768/522}
.kps-thumbs button:hover{opacity:.85}
.kps-thumbs button.on{opacity:1;box-shadow:0 0 0 2px #fff;transform:scale(1.04)}
.kps-thumbs button:focus-visible{outline:2px solid #fff;outline-offset:3px}
.kps-thumbs img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
@container (max-width:720px){.kps-desc,.kps-title{display:none}.kps-name{font-size:26px}.kps-hero{gap:16px}}
@container (max-width:520px){.kps-hero:not(.is-wide) .kps-info{display:none}.kps-hero{justify-content:center}}
.kps-row{margin-top:30px;min-width:0}
.kps-row h2{margin:0;font-size:22px;line-height:1.2;letter-spacing:-.02em;color:var(--text)}
.kps-row>p{margin:4px 0 16px;font-size:13px;color:var(--muted)}
.kps-row-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
.kps-tile{position:relative;display:block;border-radius:16px;overflow:hidden;aspect-ratio:4/5;background:#06080d;box-shadow:0 18px 44px -24px color-mix(in srgb,var(--stage-a) 80%,transparent),0 0 0 1px #0000000f;transition:transform .2s ease}
.kps-tile:hover{transform:translateY(-3px)}
.kps-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 0}
.kps-tile::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,#000000c7);pointer-events:none}
.kps-row.is-wide .kps-row-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.kps-row.is-wide .kps-tile{aspect-ratio:768/522}
.kps-row.is-wide .kps-tile img{object-position:50% 50%}
.kps-tile span{position:absolute;z-index:2;left:12px;right:12px;bottom:12px;color:#fff;font-size:13px;font-weight:700;line-height:1.25}
@media(max-width:900px){.kps-grid{grid-template-columns:minmax(0,1fr)}.kps-stage{position:relative;top:auto;order:-1;height:auto;border-radius:20px}.kps-hero,.kps-hero.is-wide{position:static;flex-direction:column;align-items:center;padding:16px;gap:14px}.kps-frame{height:auto;width:min(100%,calc(62svh * .5625))}.kps-hero.is-wide .kps-frame{width:100%;max-height:none}.kps-info,.kps-hero.is-wide .kps-info{order:3;max-width:none;align-items:center;text-align:center}.kps-thumbs,.kps-hero.is-wide .kps-thumbs{order:2;flex-direction:row;height:auto;justify-content:center}.kps-thumbs button{height:82px}.kps-panel{padding:16px}.kps-row-grid{display:flex;overflow-x:auto;scroll-snap-type:x mandatory}.kps-tile{flex:0 0 42%;scroll-snap-align:start}}
@media(prefers-reduced-motion:reduce){html{transition:none}.kps-frame .kps-before{animation:none}.kps-tile{transition:none}}
`

/** Estilos do formato + cores por produto (o CSS grande é estático; as cores vêm da tabela). */
export function ProductStageStyles() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRODUCT_STAGE_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: TINT_CSS }} />
    </>
  )
}

/** O palco: o exemplo da casa grande no meio, nome e custo do lado, miniaturas para trocar. */
export function ProductStage({ name, desc, meta, items, wide = false, labels, extra }: {
  name: string
  desc?: string
  meta?: string
  items: StageItem[]
  /** peças largas (anúncios 3:2) em vez de 9:16 */
  wide?: boolean
  labels?: { before: string; after: string }
  extra?: ReactNode
}) {
  const [i, setI] = useState(0)
  const v = items[Math.min(i, items.length - 1)]
  return (
    <aside className="kps-stage" aria-label={name}>
      <div className={`kps-hero${wide ? ' is-wide' : ''}`}>
        <div className="kps-info">
          <h2 className="kps-name">{name}</h2>
          {desc && <p className="kps-desc"><UiLabel>{desc}</UiLabel></p>}
          {meta && <p className="kps-chip">{meta}</p>}
          {v && <p className="kps-title">“{v.title}”</p>}
          {extra}
        </div>
        {v && (
          <div className="kps-frame">
            {v.video ? (
              <video key={v.video} src={v.video} poster={v.poster} autoPlay muted loop playsInline preload="metadata" aria-label={v.title} />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.after} alt={v.title} style={v.contain ? { objectFit: 'contain' } : undefined} />
                {v.before && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="kps-before" src={v.before} alt="" aria-hidden="true" />
                    <span className="kps-tag l">{labels?.before ?? 'BEFORE'}</span>
                    <span className="kps-tag r">{labels?.after ?? 'AFTER'}</span>
                  </>
                )}
              </>
            )}
            <span className="kps-badge"><UiLabel>Made with</UiLabel> {v.badge}</span>
          </div>
        )}
        {items.length > 1 && (
          <div className="kps-thumbs" role="tablist" aria-label={name}>
            {items.map((x, k) => (
              <button key={`${x.title}-${k}`} type="button" role="tab" aria-selected={k === i} aria-label={x.title} className={k === i ? 'on' : undefined} onClick={() => setI(k)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.poster ?? x.after} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

/** A "reta" de exemplos da casa embaixo do quadro. */
export function ProductRow({ title, sub, items, wide = false }: { title: string; sub?: string; items: { title: string; image: string; href?: string }[]; wide?: boolean }) {
  return (
    <section className={`kps-row${wide ? ' is-wide' : ''}`} aria-label={title}>
      <h2><UiLabel>{title}</UiLabel></h2>
      {sub && <p><UiLabel>{sub}</UiLabel></p>}
      <div className="kps-row-grid">
        {items.map((x) => {
          const body = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.image} alt="" loading="lazy" />
              <span>{x.title}</span>
            </>
          )
          return x.href
            ? <a key={x.title} className="kps-tile" href={x.href}>{body}</a>
            : <div key={x.title} className="kps-tile">{body}</div>
        })}
      </div>
    </section>
  )
}
