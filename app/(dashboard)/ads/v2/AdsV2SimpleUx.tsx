'use client'

// KINEO-ADS-UX-MARCA-2026-10-10 — as peças novas da tela do anúncio (modo simples do /ads/v2): o passo a passo com ✓, a
// área de soltar arquivos, o editor de enquadramento (a janela 9:16 por cima da foto inteira), o que cada nível inclui, a
// PRÉVIA AO VIVO num celular 9:16 (no palco da direita, pelo portal que o invólucro AdsV2Client oferece) e, no celular, a
// barra de custo que gruda embaixo + a prévia em folha.
//
// Nada aqui chama rota, cobra ou decide preço: tudo chega pronto da sessão (AdsV2Simple.tsx). Texto só pelas frases das 16
// línguas (lib/ads/v2SimpleUx.ts). Cores só pelos tokens --ads-* (claro/escuro) — o palco é escuro nos dois temas, como o
// palco da casa (components/ProductStage.tsx). Movimento: nada gira nem toca com "reduzir movimento".
import { useEffect, useRef, useState, type DragEvent as ReactDragEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { clampFocal, focalPosition } from '@/lib/ads/v2Screen'
import { adsV2CropWindowPct, adsV2MoveCropWindow, type AdsV2UxCopy } from '@/lib/ads/v2SimpleUx'
import { fill } from '@/lib/ads/v2Simple'

export const SIMPLE_UX_CSS = `
.adv2s-slot{position:sticky;top:16px;align-self:start;min-width:0}
.adv2s-slot:empty{display:none}
.adv2s-slot .kps-stage{position:relative;top:auto}
@media(max-width:900px){.adv2s-slot{display:none}}
.adv2 .adv2s-steps{position:sticky;top:0;z-index:5;margin:0 0 4px;padding:10px 0;background:color-mix(in srgb,var(--ads-card) 92%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.adv2 .adv2s-steps ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.adv2 .adv2s-steps button{width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:52px;padding:6px 4px;border:1px solid var(--ads-line);border-radius:12px;background:var(--ads-bg);color:var(--ads-secondary);font:inherit;font-size:11.5px;font-weight:650;line-height:1.2;cursor:pointer;text-align:center;min-width:0}
.adv2 .adv2s-steps button>span{max-width:100%;overflow-wrap:anywhere;min-width:0}
.adv2 .adv2s-steps i{flex:0 0 22px;width:22px;height:22px;border-radius:99px;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:750;background:var(--ads-tint);color:var(--ads-accent)}
.adv2 .adv2s-steps [data-done=true] i{background:var(--ads-success,var(--ads-action));color:var(--on-accent,#fff)}
.adv2 .adv2s-steps [aria-current=step]{border-color:var(--ads-accent);color:var(--ads-text);box-shadow:inset 0 0 0 1px var(--ads-accent)}
.adv2 [id^=adv2s-sec]{scroll-margin-top:84px}
.adv2 .adv2s-drop{display:grid;justify-items:center;gap:6px;padding:18px 14px;border:1.5px dashed var(--ads-line-strong);border-radius:16px;background:var(--ads-bg);text-align:center;transition:border-color .15s,background .15s}
.adv2 .adv2s-drop[data-over=true]{border-color:var(--ads-accent);background:var(--ads-tint)}
.adv2 .adv2s-drop b{font-size:14.5px;color:var(--ads-text)}
.adv2 .adv2s-drop small{font-size:12.5px;color:var(--ads-muted);line-height:1.45}
.adv2 .adv2s-drop .adv2-add{width:auto;min-height:44px;padding:8px 18px;border-style:solid}
.adv2 .adv2s-items{grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px}
.adv2 .adv2s-item .row .adsw-btn{flex:1 1 100%;min-height:32px;padding:4px 8px;font-size:12px}
.adv2 .adv2s-item[data-dragging=true]{opacity:.4}
.adv2 .adv2s-item[data-target=true] .adv2-frame{box-shadow:0 0 0 3px var(--ads-accent)}
.adv2 .adv2s-grip{position:absolute;right:6px;top:6px;z-index:2;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:rgba(0,0,0,.6);color:#fff;cursor:grab;font-size:14px;line-height:1;user-select:none;border:0}
.adv2 .adv2s-first{position:absolute;left:6px;top:6px;z-index:2;padding:2px 8px;border-radius:99px;background:var(--ads-action);color:var(--on-accent,#fff);font-size:10.5px;font-weight:750}
.adv2 .adv2s-crop{margin:12px 0 0;padding:12px;border:1px solid var(--ads-line);border-radius:14px;background:var(--ads-bg);display:grid;gap:10px}
.adv2 .adv2s-crop .pic{position:relative;max-width:100%;margin:0 auto;line-height:0;border-radius:10px;overflow:hidden;touch-action:none;user-select:none}
.adv2 .adv2s-crop .pic img{display:block;max-width:100%;max-height:360px;width:auto;height:auto;pointer-events:none}
.adv2 .adv2s-crop .win{position:absolute;box-shadow:0 0 0 9999px rgba(0,0,0,.55);outline:2px solid #fff;outline-offset:-1px;border-radius:6px;cursor:grab}
.adv2 .adv2s-crop .win:focus-visible{outline:3px solid var(--ads-accent)}
.adv2 .adv2s-crop .win::after{content:'';position:absolute;inset:33.3% 0;border-top:1px solid #ffffff59;border-bottom:1px solid #ffffff59;pointer-events:none}
.adv2 .adv2s-crop p{margin:0;font-size:12.5px;color:var(--ads-muted);line-height:1.45}
.adv2 .adv2s-inc{list-style:none;margin:0;padding:0;display:grid;gap:3px;font-size:12.5px;color:var(--ads-secondary);line-height:1.4}
.adv2 .adv2s-inc li{display:flex;gap:6px;align-items:flex-start}
.adv2 .adv2s-rec{position:absolute;top:-9px;right:12px;padding:2px 9px;border-radius:99px;background:var(--ads-action);color:var(--on-accent,#fff);font-size:10.5px;font-weight:750}
.adv2 .adv2s-kit{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px;padding:6px 8px 6px 12px;border-radius:999px;border:1px solid var(--ads-line);background:var(--ads-tint);color:var(--ads-text);font-size:12.5px;font-weight:650}
.adv2 .adv2s-kit .sw{width:14px;height:14px;border-radius:4px;border:1px solid var(--ads-line)}
.adv2 .adv2s-kit img{width:22px;height:22px;object-fit:contain;border-radius:5px;background:var(--ads-card)}
.adv2 .adv2s-kit button{min-height:28px;padding:2px 10px;border-radius:999px;border:1px solid var(--ads-line-strong);background:var(--ads-card);color:var(--ads-text);font:inherit;font-size:12px;font-weight:650;cursor:pointer}
.adv2 .adv2s-save{display:flex;gap:8px;align-items:flex-start;margin:12px 0 0;font-size:13px;color:var(--ads-text);line-height:1.45}
.adv2 .adv2s-save input{margin-top:3px;accent-color:var(--ads-action)}
.adv2 .adv2s-save small{display:block;color:var(--ads-muted);font-size:12px}
.adv2 .adv2s-eta{margin:8px 0 0;font-size:12.5px;color:var(--ads-muted)}
.adv2 .adv2s-bar{display:none}
@media(max-width:900px){
  .adv2 .adv2s-bar{position:sticky;bottom:12px;z-index:40;display:flex;align-items:center;gap:10px;margin:8px 0 0;padding:8px 10px;border:1px solid var(--ads-line);border-radius:16px;background:color-mix(in srgb,var(--ads-card) 94%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:0 12px 30px -14px rgba(0,0,0,.45);min-width:0}
  .adv2 .adv2s-bar .th{flex:0 0 34px;height:60px;border-radius:7px;overflow:hidden;background:#05070b}
  .adv2 .adv2s-bar .th img{width:100%;height:100%;object-fit:cover;display:block}
  .adv2 .adv2s-bar .tx{flex:1 1 auto;min-width:0;font-size:12.5px;line-height:1.35;color:var(--ads-text)}
  .adv2 .adv2s-bar .tx span{display:block;color:var(--ads-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .adv2 .adv2s-bar button{flex:0 0 auto}
}
@media(max-width:767px){.adv2 .adv2s-bar{bottom:calc(76px + env(safe-area-inset-bottom))}}
@media(max-width:360px){.adv2 .adv2s-steps button>span{font-size:10.5px}}
.adv2s-sheet{position:fixed;inset:0;z-index:90;display:grid;place-items:end center;background:rgba(0,0,0,.6);padding:12px}
.adv2s-sheet .in{position:relative;width:min(100%,420px);height:min(92svh,760px);border-radius:22px;overflow:hidden}
.adv2s-sheet .x{position:absolute;right:10px;top:10px;z-index:5;min-height:36px;padding:4px 12px;border-radius:999px;border:1px solid #ffffff40;background:rgba(0,0,0,.55);color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.adv2s-sheet .kps-stage{position:relative;top:auto;height:100%;border-radius:22px}
.adv2s-live{position:absolute;inset:20px;display:flex;gap:clamp(14px,3cqw,32px);align-items:stretch;justify-content:center;color:#eef2f7}
.adv2s-live .info{flex:1 1 0;min-width:0;max-width:300px;display:flex;flex-direction:column;justify-content:center;gap:12px}
.adv2s-live .info h2{margin:0;font-size:clamp(22px,2vw,30px);line-height:1.1;letter-spacing:-.02em;font-weight:750;color:#fff}
.adv2s-live .info dl{margin:0;display:grid;gap:8px}
.adv2s-live .info dt{font-size:11px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;color:#ffffff99}
.adv2s-live .info dd{margin:2px 0 0;font-size:13.5px;line-height:1.4;color:#eef2f7;overflow-wrap:anywhere}
.adv2s-live .cost{padding:10px 12px;border-radius:14px;background:#ffffff14;border:1px solid #ffffff26;font-size:13px;font-weight:700;line-height:1.4;color:#fff;font-variant-numeric:tabular-nums}
.adv2s-live .cost .short{display:block;margin-top:4px;color:#ffcf8a;font-weight:650}
.adv2s-live .eta{font-size:12.5px;color:#ffffffb3}
.adv2s-live .col{flex:none;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:0;min-width:0}
.adv2s-phone{position:relative;flex:none;height:calc(100% - 96px);width:auto;max-width:100%;aspect-ratio:9/16;border-radius:26px;padding:7px;background:#11151d;box-shadow:0 24px 60px -20px #000c,0 0 0 1px #ffffff26}
.adv2s-phone .scr{position:relative;width:100%;height:100%;border-radius:20px;overflow:hidden;background:#05070b;line-height:0}
.adv2s-phone .scr :is(img,video){position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.adv2s-phone .notch{position:absolute;top:13px;left:50%;transform:translateX(-50%);width:28%;height:14px;border-radius:99px;background:#11151d;z-index:3}
.adv2s-phone .empty{position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center;font-size:13px;line-height:1.45;color:#ffffffa6}
.adv2s-phone .kb{animation:adv2s-kb 9s ease-in-out infinite alternate}
@keyframes adv2s-kb{from{transform:scale(1)}to{transform:scale(1.12)}}
.adv2s-phone .chip{position:absolute;z-index:2;left:10px;right:10px;padding:5px 9px;border-radius:10px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;font-weight:700;line-height:1.3}
.adv2s-phone .chip.top{top:34px}
.adv2s-phone .chip.bot{bottom:12px;display:flex;align-items:center;gap:8px}
.adv2s-phone .chip.bot img{position:static;width:26px;height:26px;border-radius:99px;object-fit:cover;flex:0 0 26px}
.adv2s-tabs{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.adv2s-tabs button{min-height:32px;padding:4px 12px;border-radius:999px;border:1px solid #ffffff2e;background:#ffffff10;color:#ffffffc7;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.adv2s-tabs button[aria-pressed=true]{background:#fff;color:#05070b;border-color:#fff}
.adv2s-tabs button:focus-visible{outline:2px solid #fff;outline-offset:2px}
.adv2s-thumbs{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;max-width:100%}
.adv2s-thumbs span{width:26px;height:46px;border-radius:5px;overflow:hidden;opacity:.75;box-shadow:0 0 0 1px #ffffff2e;line-height:0}
.adv2s-thumbs span:first-child{opacity:1;box-shadow:0 0 0 2px #fff}
.adv2s-thumbs img{width:100%;height:100%;object-fit:cover}
.adv2s-live .mcost{display:none}
@container (max-width:560px){.adv2s-live .info{display:none}.adv2s-live .mcost{display:block;max-width:100%;text-align:center;font-size:12.5px;font-weight:700;color:#fff;line-height:1.4}.adv2s-live .mcost b{display:block;color:#ffcf8a;font-weight:650}}
@media(prefers-reduced-motion:reduce){.adv2s-phone .kb{animation:none}.adv2 .adv2s-drop{transition:none}}
`

// ─── passo a passo ────────────────────────────────────────────────────────────────────────────────────────────────────

export type SimpleStepId = 'product' | 'message' | 'look' | 'review'

/** Rola até a seção (suave, menos com "reduzir movimento") e põe o foco no título dela. */
export function goToSection(id: string) {
  const el = typeof document !== 'undefined' ? document.getElementById(id) : null
  if (!el) return
  let reduce = false
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { reduce = false }
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  const h = el.querySelector<HTMLElement>('h2')
  if (h) {
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1')
    h.focus({ preventScroll: true })
  }
}

export function SimpleStepper({ copy, steps }: { copy: AdsV2UxCopy; steps: { id: SimpleStepId; section: string; done: boolean }[] }) {
  const current = steps.find((s) => !s.done)?.id ?? 'review'
  return (
    <nav className="adv2s-steps" aria-label={copy.stepper}>
      <ol>
        {steps.map((s, i) => (
          <li key={s.id}>
            <button type="button" data-done={s.done} aria-current={current === s.id ? 'step' : undefined} onClick={() => goToSection(s.section)}>
              <i aria-hidden="true">{s.done ? '✓' : i + 1}</i>
              <span>{copy.steps[s.id]}{s.done ? <span className="adv2-sr">{` (${copy.stepDone})`}</span> : null}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

// ─── área de soltar arquivos ──────────────────────────────────────────────────────────────────────────────────────────

export function DropZone({ copy, disabled, onFiles, button }: { copy: AdsV2UxCopy; disabled: boolean; onFiles: (list: FileList) => void; button: ReactNode }) {
  const [over, setOver] = useState(false)
  const depth = useRef(0)
  const hasFiles = (e: ReactDragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
  return (
    <div
      className="adv2s-drop"
      data-over={over}
      data-kineo="ads-dropzone"
      onDragEnter={(e) => { if (disabled || !hasFiles(e)) return; e.preventDefault(); depth.current += 1; setOver(true) }}
      onDragOver={(e) => { if (disabled || !hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
      onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (depth.current === 0) setOver(false) }}
      onDrop={(e) => {
        if (disabled || !hasFiles(e)) return
        e.preventDefault()
        depth.current = 0
        setOver(false)
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>⬆</span>
      <b>{over ? copy.drop.over : copy.drop.title}</b>
      {button}
      <small>{copy.drop.hint}</small>
    </div>
  )
}

// ─── editor de enquadramento: a janela 9:16 por cima da foto inteira ──────────────────────────────────────────────────

export function CropEditor({
  item,
  copy,
  label,
  onFocal,
  onDone,
}: {
  item: { srcUrl: string; w: number; h: number; fx: number; fy: number }
  copy: AdsV2UxCopy
  label: string
  onFocal: (fx: number, fy: number) => void
  onDone: () => void
}) {
  const picRef = useRef<HTMLDivElement | null>(null)
  const winRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ x: number; y: number; fx: number; fy: number; id: number } | null>(null)
  const win = adsV2CropWindowPct({ w: item.w, h: item.h }, item.fx, item.fy)
  useEffect(() => { winRef.current?.focus({ preventScroll: true }) }, [])
  function down(e: ReactPointerEvent<HTMLDivElement>) {
    drag.current = { x: e.clientX, y: e.clientY, fx: item.fx, fy: item.fy, id: e.pointerId }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }
  function move(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current
    const box = picRef.current?.getBoundingClientRect()
    if (!d || !box || d.id !== e.pointerId) return
    const next = adsV2MoveCropWindow({ fx: d.fx, fy: d.fy }, { dx: e.clientX - d.x, dy: e.clientY - d.y }, { w: box.width, h: box.height }, { w: item.w, h: item.h })
    onFocal(next.fx, next.fy)
  }
  function up(e: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null
  }
  function key(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 0.2 : 0.05
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); onDone(); return }
    const m = map[e.key]
    if (!m) return
    e.preventDefault()
    onFocal(clampFocal(item.fx + m[0]), clampFocal(item.fy + m[1]))
  }
  return (
    <div className="adv2s-crop" data-kineo="ads-crop-editor">
      <div ref={picRef} className="pic">
        <img src={item.srcUrl} alt="" draggable={false} />
        <div
          ref={winRef}
          className="win"
          role="group"
          tabIndex={0}
          aria-label={label}
          style={{ left: `${win.left}%`, top: `${win.top}%`, width: `${win.width}%`, height: `${win.height}%` }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={key}
        />
      </div>
      <p>{copy.cropHint}</p>
      <div className="adv2-actions" style={{ marginTop: 0 }}>
        <button type="button" className="adsw-btn ghost small" onClick={onDone}>{copy.adjustDone}</button>
      </div>
    </div>
  )
}

// ─── o que cada nível inclui ──────────────────────────────────────────────────────────────────────────────────────────

export function TierIncludes({ copy, inc }: { copy: AdsV2UxCopy; inc: { shots: number; scenes: number; closeups: number } }) {
  return (
    <ul className="adv2s-inc">
      <li><span aria-hidden="true">🎞</span><span>{fill(copy.tiers.shots, { n: inc.shots })}</span></li>
      {inc.scenes > 0 ? (
        <li><span aria-hidden="true">🧑</span><span>{fill(copy.tiers.scenes, { n: inc.scenes })}</span></li>
      ) : (
        <li><span aria-hidden="true">📷</span><span>{copy.tiers.yourPhotos}</span></li>
      )}
      {inc.closeups > 0 ? <li><span aria-hidden="true">✨</span><span>{fill(copy.tiers.closeups, { n: inc.closeups })}</span></li> : null}
    </ul>
  )
}

// ─── a prévia ao vivo ─────────────────────────────────────────────────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

/** Vídeo mudo em laço; com "reduzir movimento" fica o pôster parado. */
function Loop({ src, poster }: { src: string; poster: string }) {
  const [still, setStill] = useState(true)
  useEffect(() => { setStill(prefersReducedMotion()) }, [])
  return still ? <img src={poster} alt="" /> : <video key={src} src={src} poster={poster} muted loop playsInline autoPlay preload="metadata" aria-hidden="true" tabIndex={-1} />
}

export type LiveView = 'opening' | 'style' | 'end'

export interface LivePreviewData {
  photos: { key: string; srcUrl: string; fx: number; fy: number }[]
  productName: string
  style: { label: string; oneLine: string; preview: string; poster: string } | null
  presenter: { poster: string } | null
  cardUrl: string | null
  voice: string
  tierName: string | null
  costText: string
  shortText: string | null
}

function Phone({ data, view, copy }: { data: LivePreviewData; view: LiveView; copy: AdsV2UxCopy }) {
  const first = data.photos[0]
  let screen: ReactNode
  if (!first) screen = <span className="empty">{copy.preview.empty}</span>
  else if (view === 'end') screen = data.cardUrl ? <img src={data.cardUrl} alt="" /> : <span className="empty">{copy.preview.end}</span>
  else if (view === 'style') {
    screen = data.style ? (
      <>
        <Loop src={data.style.preview} poster={data.style.poster} />
        <span className="chip bot">✨ {data.style.label}</span>
      </>
    ) : (
      <>
        <img className="kb" src={first.srcUrl} alt="" style={{ objectPosition: focalPosition(first.fx, first.fy) }} />
        <span className="chip bot">{copy.preview.noStyle}</span>
      </>
    )
  } else {
    screen = (
      <>
        <img src={first.srcUrl} alt="" style={{ objectPosition: focalPosition(first.fx, first.fy) }} />
        {data.productName ? <span className="chip top">{data.productName}</span> : null}
        {data.presenter ? (
          <span className="chip bot"><img src={data.presenter.poster} alt="" />{copy.preview.presenter}</span>
        ) : null}
      </>
    )
  }
  return (
    <div className="adv2s-phone">
      <span className="notch" aria-hidden="true" />
      <div className="scr">{screen}</div>
    </div>
  )
}

/** O conteúdo do palco: o resumo do lado, o celular 9:16 no meio, as abas e as miniaturas embaixo. */
export function LivePreview({ data, copy }: { data: LivePreviewData; copy: AdsV2UxCopy }) {
  const [view, setView] = useState<LiveView>('opening')
  const [manual, setManual] = useState(false)
  const views: LiveView[] = ['opening', 'style', 'end']
  // Gira sozinha a cada 4 s até a pessoa tocar numa aba; nunca gira com "reduzir movimento" nem sem foto.
  useEffect(() => {
    if (manual || !data.photos.length || prefersReducedMotion()) return
    const t = window.setInterval(() => setView((v) => views[(views.indexOf(v) + 1) % views.length]), 4000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manual, data.photos.length])
  const label: Record<LiveView, string> = { opening: copy.preview.opening, style: copy.preview.style, end: copy.preview.end }
  return (
    <div className="adv2s-live" data-kineo="ads-live-preview">
      <div className="info">
        <h2>{copy.preview.title}</h2>
        <dl>
          <div><dt>{copy.preview.product}</dt><dd>{data.productName || '—'}</dd></div>
          <div><dt>{copy.preview.look}</dt><dd>{data.style ? `${data.style.label} — ${data.style.oneLine}` : copy.preview.noStyle}</dd></div>
        </dl>
        <span className="eta">🎙 {fill(copy.preview.voice, { lang: data.voice })}</span>
        <div className="cost" role="status">
          {data.costText}
          {data.shortText ? <span className="short">{data.shortText}</span> : null}
        </div>
        <span className="eta">⏱ {copy.preview.delivery}</span>
      </div>
      <div className="col">
        <Phone data={data} view={view} copy={copy} />
        <div className="adv2s-tabs" role="group" aria-label={copy.preview.title}>
          {views.map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => { setManual(true); setView(v) }}>{label[v]}</button>
          ))}
        </div>
        <span className="mcost">{data.costText}{data.shortText ? <b>{data.shortText}</b> : null}</span>
        {data.photos.length > 1 ? (
          <div className="adv2s-thumbs" aria-hidden="true">
            {data.photos.map((p) => <span key={p.key}><img src={p.srcUrl} alt="" style={{ objectPosition: focalPosition(p.fx, p.fy) }} /></span>)}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** O palco da direita (computador), pelo portal que o invólucro oferece. Sem vaga = nada (o celular usa a barra). */
export function LiveStage({ slot, data, copy }: { slot: HTMLElement | null; data: LivePreviewData; copy: AdsV2UxCopy }) {
  if (!slot) return null
  return createPortal(
    <aside className="kps-stage" aria-label={copy.preview.title}>
      <LivePreview data={data} copy={copy} />
    </aside>,
    slot,
  )
}

/** Celular/tablet: a barra que gruda embaixo (miniatura + custo) e a prévia em folha. */
export function MobilePreviewBar({ data, copy }: { data: LivePreviewData; copy: AdsV2UxCopy }) {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const openRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  const first = data.photos[0]
  return (
    <>
      <div className="adv2s-bar" data-kineo="ads-mobile-bar">
        <span className="th" aria-hidden="true">{first ? <img src={first.srcUrl} alt="" style={{ objectPosition: focalPosition(first.fx, first.fy) }} /> : null}</span>
        <span className="tx" role="status">
          {data.costText}
          <span>{data.shortText ?? copy.preview.delivery}</span>
        </span>
        <button ref={openRef} type="button" className="adsw-btn ghost small" onClick={() => setOpen(true)}>{copy.preview.open}</button>
      </div>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div className="adv2s-sheet" role="dialog" aria-modal="true" aria-label={copy.preview.title} onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); openRef.current?.focus() } }}>
              <div className="in">
                <button ref={closeRef} type="button" className="x" onClick={() => { setOpen(false); openRef.current?.focus() }}>{copy.preview.close}</button>
                <div className="kps-stage">
                  <LivePreview data={data} copy={copy} />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
