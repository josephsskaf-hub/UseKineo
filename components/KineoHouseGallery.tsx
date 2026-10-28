'use client'

// KINEO-GALERIA-HOME-2710 — a grade do "Made with Kineo" (/made-with-kineo): clipes, imagens e filmes narrados misturados,
// filtro All · Clips · Images · Films, tudo de cara e a última fileira sempre cheia (KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810). Curadoria em lib/homeGaleria.ts; cartões montados no servidor
// (lib/homeGaleriaItems.ts) — aqui só tela e medição.
//
// Peso: a página não toca nada antes de aparecer. Vídeo = WallMedia (o mesmo da vitrine da home: o <video> só nasce quando o
// cartão entra na tela, preload="none", mudo, em laço, pausa fora da tela / aba escondida / reduced-motion / economia de dados);
// pôster e imagem = <img loading="lazy">. Cartão com proporção fixa 9:16 (sem layout shift).
// Cartão = selo do motor + título curto; SEM preço/crédito (o preço mora no botão de gerar de cada ferramenta).
import { useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import WallMedia from '@/components/WallMedia'
import { UiLabel } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { GALERIA_CLICK_EVENT, GALERIA_FILTERS, galeriaFiltered, galeriaPreenchimento, galeriaPreenchimentoCss, type GaleriaFilter, type GaleriaItem } from '@/lib/homeGaleria' // KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810

const CSS = `
.mwk{--mwk-gap:12px}
.mwk-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
.mwk-chip{display:inline-flex;align-items:center;min-height:40px;padding:8px 16px;border:1px solid var(--border,#d5e0ec);border-radius:999px;background:var(--card,#fff);color:var(--text,#17273b);font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.mwk-chip:hover{border-color:var(--accent,#1766d3)}
.mwk-chip[aria-pressed=true]{background:var(--text,#17273b);border-color:var(--text,#17273b);color:var(--bg,#fff)}
.mwk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--mwk-gap)}
@media(min-width:700px){.mwk{--mwk-gap:14px}.mwk-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(min-width:1000px){.mwk-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(min-width:1300px){.mwk{--mwk-gap:16px}.mwk-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}
@media(min-width:1700px){.mwk-grid{grid-template-columns:repeat(6,minmax(0,1fr))}}
.mwk-card{position:relative;display:block;min-width:0;aspect-ratio:9/16;overflow:hidden;border:1px solid var(--border,#d5e0ec);border-radius:14px;background:#0b1119;color:#fff;text-decoration:none;isolation:isolate}
.mwk-card:hover{border-color:var(--accent,#1766d3)}
.mwk-card:focus-visible{outline:3px solid #06b6d4;outline-offset:3px}
.mwk-md{position:absolute;inset:0}
.mwk-md img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--mwk-focus,50% 50%);transition:transform .35s ease}
.mwk-md video{object-position:var(--mwk-focus,50% 50%)}
.mwk-card.mwk-image:hover .mwk-md img{transform:scale(1.03)}
.mwk-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent 48%,rgba(3,9,18,.88) 100%)}
.mwk-copy{position:absolute;left:12px;right:12px;bottom:12px;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:4px;transition:transform .2s ease}
.mwk-copy i{font-style:normal;font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#c8ddf1}
.mwk-copy b{font-size:14px;line-height:1.25;font-weight:600;color:#fff;text-wrap:balance;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mwk-cta{position:absolute;left:12px;right:12px;bottom:12px;z-index:3;display:flex;align-items:center;justify-content:center;min-height:38px;padding:8px 10px;border-radius:10px;background:#fff;color:#0b1119;font-size:13px;font-weight:700;opacity:0;transform:translateY(6px);transition:opacity .2s ease,transform .2s ease;pointer-events:none}
.mwk-card:hover .mwk-cta,.mwk-card:focus-visible .mwk-cta{opacity:1;transform:none}
.mwk-card:hover .mwk-copy,.mwk-card:focus-visible .mwk-copy{transform:translateY(-48px)}
@media(hover:none){.mwk-cta{opacity:1;transform:none;min-height:32px;font-size:12px;left:8px;right:8px;bottom:8px}.mwk-copy{bottom:48px;left:10px;right:10px}.mwk-card:hover .mwk-copy{transform:none}}
.mwk-cell{position:relative;min-width:0} /* KINEO-ROSTO-NO-CLIPE-2810 */
.mwk-face{position:absolute;top:10px;left:10px;z-index:4;display:inline-flex;align-items:center;gap:5px;min-height:32px;padding:6px 12px;border-radius:999px;background:#fff;color:#0b1119;font-size:12px;font-weight:700;line-height:1.1;text-decoration:none;box-shadow:0 2px 10px rgba(0,0,0,.28)} /* KINEO-ROSTO-NO-CLIPE-2810 */
.mwk-face:hover{background:#eaf3ff} /* KINEO-ROSTO-NO-CLIPE-2810 */
.mwk-face:focus-visible{outline:3px solid #06b6d4;outline-offset:2px} /* KINEO-ROSTO-NO-CLIPE-2810 */
@media(max-width:560px){.mwk-face{top:8px;left:8px;min-height:28px;padding:5px 9px;font-size:11px}} /* KINEO-ROSTO-NO-CLIPE-2810 */
.mwk-more{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 14px;margin:26px 0 0}
/* KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810 — .mwk-more-btn sem uso desde 28/10 (o "See more" saiu) */ .mwk-more-btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:10px 26px;border:0;border-radius:999px;background:var(--accent,#1766d3);color:var(--on-accent,#fff);font:inherit;font-size:15px;font-weight:700;cursor:pointer}
.mwk-more-btn:hover{filter:brightness(1.07)}
.mwk-more a{display:inline-flex;align-items:center;min-height:40px;padding:8px 14px;border:1px solid var(--border,#d5e0ec);border-radius:999px;color:var(--text,#17273b);font-size:13px;font-weight:600;text-decoration:none}
.mwk-more a:hover{border-color:var(--accent,#1766d3)}
.mwk-count{width:100%;text-align:center;margin:0;font-size:12px;color:var(--muted,#586c83)}
@media(max-width:560px){.mwk-card{border-radius:12px}.mwk-copy b{font-size:13px}.mwk-copy i{font-size:8px;letter-spacing:.4px}}
@media(prefers-reduced-motion:reduce){.mwk-md img,.mwk-cta,.mwk-copy{transition:none}.mwk-card.mwk-image:hover .mwk-md img{transform:none}}
`

function mediaStyle(focus: string | undefined): CSSProperties | undefined {
  return focus ? ({ '--mwk-focus': focus } as CSSProperties) : undefined
}

export default function KineoHouseGallery({ items, surface = 'page' }: { items: readonly GaleriaItem[]; surface?: 'page' | 'home' }) {
  const [filter, setFilter] = useState<GaleriaFilter>('all')
  const list = useMemo(() => galeriaFiltered(items, filter), [items, filter])
  // KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810 — tudo de cara; no fim, os enchimentos (do começo do filtro atual) que fecham a última fileira em cada largura
  const enche = useMemo(() => galeriaPreenchimento(list.length), [list.length]) // KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810
  const filtros = GALERIA_FILTERS.filter((f) => f.key === 'all' || items.some((i) => i.kind === f.key)) // KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810 — tipo sem cartão (ex.: filmes, todos com marca) não vira botão vazio

  return (
    <div className="mwk" data-galeria={surface}>
      <style dangerouslySetInnerHTML={{ __html: CSS + galeriaPreenchimentoCss() }} />{/* KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810 */}
      <div className="mwk-chips" role="group" aria-label="Filter">
        {filtros.map((f) => ( // KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810
          <button key={f.key} type="button" className="mwk-chip" aria-pressed={filter === f.key} data-galeria-filter={f.key}
            onClick={() => { setFilter(f.key) }}>{/* KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810 */}
            <UiLabel>{f.label}</UiLabel>
          </button>
        ))}
      </div>
      <div className="mwk-grid">
        {[...list.map((it) => ({ it, fill: null as number[] | null })), ...enche.map((e) => ({ it: list[e.idx], fill: e.cols }))].map(({ it, fill }, k) => ( // KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810
          <div key={fill ? `fill-${k}` : it.id} className={fill ? `mwk-cell mwk-fill ${fill.map((c) => `mwk-f${c}`).join(' ')}` : 'mwk-cell'} aria-hidden={fill ? true : undefined} data-galeria-fill={fill ? it.id : undefined}>{/* KINEO-ROSTO-NO-CLIPE-2810 — o cartão e o botão do rosto lado a lado (link dentro de link não existe) · KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810 — enchimento repetido: fora do leitor de tela e do Tab */}
          <Link
            tabIndex={fill ? -1 : undefined} /* KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810 */
            href={it.href}
            className={`mwk-card mwk-${it.kind}`}
            data-galeria-kind={it.kind}
            data-galeria-id={it.id}
            aria-label={`${it.title} — ${it.engine}. Make one like this`}
            onClick={() => { void trackEvent(GALERIA_CLICK_EVENT, { kind: it.kind, id: it.id, surface, filter }) }}
          >
            <span className="mwk-md" style={mediaStyle(it.focus)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.poster} alt="" width={540} height={960} loading="lazy" decoding="async" />
              {it.video ? <WallMedia src={it.video} /> : null}
            </span>
            <span className="mwk-shade" aria-hidden="true" />
            <span className="mwk-copy"><i>{it.engine}</i><b><UiLabel>{it.title}</UiLabel></b></span>
            <span className="mwk-cta" aria-hidden="true"><UiLabel>Make one like this</UiLabel> →</span>
          </Link>
          {it.faceHref ? <Link tabIndex={fill ? -1 : undefined} href={it.faceHref} className="mwk-face" data-face-remix={it.id} aria-label={`Put your face in it — ${it.title}`}><UiLabel>Put your face in it</UiLabel></Link> : null}{/* KINEO-ROSTO-NO-CLIPE-2810 · KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810 */}
          </div> // KINEO-ROSTO-NO-CLIPE-2810
        ))}
      </div>
      <div className="mwk-more">{/* KINEO-GALERIA-HOME-2710 · KINEO-GALERIA-CHEIA-2810 — só a fileira de links no fim; nenhum botão revela cartão escondido */}
            <Link href="/clips" data-galeria-link="clips"><UiLabel>Open Clips</UiLabel> ↗</Link>
            <Link href="/images" data-galeria-link="images"><UiLabel>Open Images</UiLabel> ↗</Link>
            <Link href="/examples" data-galeria-link="examples"><UiLabel>All films</UiLabel> ↗</Link>
      </div>
    </div>
  )
}
