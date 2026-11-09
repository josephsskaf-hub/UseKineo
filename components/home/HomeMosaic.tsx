// KINEO-HOME-MOSAICO-2910 — fundador 29/10: "criar uma coisa grande com tudo, sem separações… nenhum dos concorrentes faz
// separações. A única coisa que eu separaria são os 4 quadros iniciais." Depois dos 4 cards, a home vira UMA vitrine contínua
// (grade em mosaico, sem título entre blocos), com tudo misturado: clipes maiores, 6 filmes narrados, efeitos novos (mínimo 8,
// menores, alternando pessoa/pet/produto para não repetir a mesma foto lado a lado) e a galeria de imagens indo até o fim.
// Regras de sempre: nada novo é inventado aqui — clipes, filmes, efeitos e imagens vêm das MESMAS listas curadas das faixas
// antigas (lib/homeGaleria, lib/ui/homeFeaturedFilms, lib/clips/clipEffects, HomeImageGallery); selo honesto = o motor real;
// sem preço no cartão; vídeo só toca na tela (WallMedia); cada cartão leva ao lugar que já levava.
import Link from 'next/link'
import type { CSSProperties } from 'react'
import WallMedia from '@/components/WallMedia'
import { UiLabel } from '@/components/InterfaceLanguage'
import { HOME_NEW_CLIPS } from '@/components/home/HomeClipsStrip'
import { CLIP_ENGINES } from '@/lib/clips/clipCatalog'
import { faceRemixHref, hasFaceRemix } from '@/lib/clips/faceRemix'
import { viaSignup } from '@/lib/homeGaleria'
import { HOME_FEATURED_PLAYLISTS } from '@/lib/ui/homeFeaturedFilms'
import type { ClipEffect } from '@/lib/clips/clipEffects'
import { publicEffectPages, effectPagePath, effectSlug } from '@/lib/clips/clipEffectPages'
import { HOME_GALLERY_BIG, HOME_GALLERY_DIR, HOME_GALLERY_IMAGES, type HomeGalleryImage } from '@/components/home/HomeImageGallery'
import { clipsFirstFilmHref } from '@/lib/growth/homeClipsFirst'
import { cardStatFor, compactCount } from '@/lib/home/cardSocialStats' // KINEO-CARDS-VIEWS-0911
import { seasonalEffectKeys } from '@/lib/clips/clipSeason' // KINEO-VITRINE-ESTACAO-3110
import { FORA_DE_ESTACAO, afastaVizinhos, semLargoNoFim, clipeNovoDestino, clipeNovoPoster, clipeNovoVideo, clipesNovosDoDia, diaDaVitrine, embaralhaDoDia, intercala, type ClipeNovo } from '@/lib/clipesNos2Lugares' // KINEO-CLIPES-NOS-2-LUGARES-0411

/** Interruptor da vitrine contínua (false = a home volta às faixas separadas de antes, intactas no KineoLanding). */
export const HOME_MOSAIC_LIVE = true
export const HOME_MOSAIC_FILMS = 6
export const HOME_MOSAIC_EFFECTS = 8

/** Pasta das imagens novas da vitrine (a pasta /home-images/ continua sendo SÓ a da galeria antiga, guardião test-home-limpa-1410). */
export const HOME_MOSAIC_DIR = '/home-mosaic/'

/** 12 imagens novas de 29/10 (Kineo Images · Seedream, conta da casa, sem pessoa real, sem marca, sem texto). */
export const HOME_MOSAIC_EXTRA_IMAGES: readonly HomeGalleryImage[] = [
  { file: 'pumpkin.webp', w: 640, h: 1138, alt: 'A glowing carved jack-o-lantern on a wooden porch at dusk with autumn leaves' },
  { file: 'perfume-snow.webp', w: 640, h: 1138, alt: 'A glass perfume bottle with a gold cap on a snowy pine branch with Christmas lights' },
  { file: 'cabin.webp', w: 640, h: 1138, alt: 'A wooden cabin in a snowy forest at night under green northern lights' },
  { file: 'dog-sweater.webp', w: 640, h: 1138, alt: 'A golden retriever in a red knitted Christmas sweater by a fireplace' },
  { file: 'camper.webp', w: 900, h: 506, alt: 'A vintage camper van on an empty desert road at sunset' },
  { file: 'mug-rain.webp', w: 640, h: 1138, alt: 'A steaming ceramic mug on a rainy windowsill' },
  { file: 'roses.webp', w: 640, h: 1138, alt: 'White roses in a glass vase in soft morning light' },
  { file: 'alley.webp', w: 900, h: 506, alt: 'A rainy alley at night lit by hanging paper lanterns' },
  { file: 'jelly.webp', w: 640, h: 1138, alt: 'A glossy red jelly dessert with mint leaves on a white plate' },
  { file: 'boot-stream.webp', w: 640, h: 1138, alt: 'A hiking boot splashing through a mountain stream' },
  { file: 'matcha.webp', w: 640, h: 1138, alt: 'An iced matcha latte with swirling milk on a sunlit marble counter' },
  { file: 'canoe.webp', w: 640, h: 1138, alt: 'A wooden canoe on a misty mountain lake at dawn' },
]

// KINEO-ENQUADRA-2910 — fundador 29/10 ("tem outros que estão saindo do quadro, consegue verificar todos?"): cada vídeo da vitrine
// conferido quadro a quadro na janela do cartão (~5:6). Só os que perdiam cabeça, chapéu, estrela ou espada ganham foco próprio.
export const MOSAIC_CLIP_FOCUS: Record<string, string> = { 'pebble-castle': '50% 25%', 'knight-cat': '50% 15%', capybara: '50% 45%', 'wizard-cat': '50% 25%' }
export const MOSAIC_FILM_FOCUS: Record<string, string> = { 'robot-action': '50% 35%', 'volcano-scene': '50% 35%' }
export const MOSAIC_EFFECT_FOCUS: Record<string, string> = { witch: '50% 30%', pet_lion: '50% 25%', pet_xmas_tree: '50% 25%', pet_xmas_angel: '50% 30%', santa_cartoon: '50% 25%', snow_globe: '50% 35%' }
const assetOf = (url: string) => url.split('/').pop()?.replace(/\.mp4$/, '') ?? ''

type MosaicImage = HomeGalleryImage & { dir: string }

/** KINEO-MWK-MOSAICO-3110 — um estilo de anúncio no mosaico da página Made with Kineo (dados do antigo bloco do /trending). */
export interface MosaicStyle { key: string; title: string; engine: string | null; video: string; poster: string | null; href: string }

type MotionTile = { kind: 'motion'; title: string; video: string; poster: string; focus: string; desktopOnly?: true; desktopVideo?: string }

type Tile =
  | { kind: 'clip'; clip: (typeof HOME_NEW_CLIPS)[number] }
  | { kind: 'film'; title: string; badge: string; video: string; poster?: string; focus?: string }
  | MotionTile
  | { kind: 'effect'; effect: ClipEffect }
  | { kind: 'image'; img: MosaicImage }
  | { kind: 'style'; style: MosaicStyle } // KINEO-MWK-MOSAICO-3110 — estilo de anúncio (prévia feita pelo próprio estilo)
  | { kind: 'novo'; clip: ClipeNovo; grande: boolean } // KINEO-CLIPES-NOS-2-LUGARES-0411 — os clipes da lista compartilhada; grande = cartão de 2 colunas

// KINEO-CLIPES-NOS-2-LUGARES-0411 — efeitos que a data já passou saem da vitrine (lista em lib/clipesNos2Lugares.ts).
// KINEO-HOME-DOIS-EIXOS-0611 — uma fileira de seis clipes no desktop; abaixo de 1100px,
// os três clipes originais mantêm mídia e ordem. Alternar terra, água, rua, neve e ar.
export const HOME_MOTION_TILES: readonly MotionTile[] = [
  { kind: 'motion', title: 'Four cameras, one wave', video: '/previews/motion-surf-0611.mp4', poster: '/posters/motion-surf-0611.webp', focus: '50% 55%' },
  { kind: 'motion', title: 'An eagle soars over the cliffs', video: '/previews/motion-eagle-0611.mp4', poster: '/posters/motion-eagle-0611.webp', focus: '50% 50%', desktopOnly: true },
  { kind: 'motion', title: 'Camera pulls back', video: '/previews/motion-rua-0611.mp4', poster: '/posters/motion-rua-0611.webp', focus: '50% 75%' },
  { kind: 'motion', title: 'A manta ray glides underwater', video: '/previews/motion-manta-0611.mp4', poster: '/posters/motion-manta-0611.webp', focus: '50% 50%', desktopOnly: true },
  { kind: 'motion', title: 'One rider, one mountain', video: '/previews/motion-neve-0611.mp4', poster: '/posters/motion-neve-0611.webp', focus: '50% 50%' },
  { kind: 'motion', title: 'A horse runs along the coast', video: '/previews/motion-horse-0611.mp4', poster: '/posters/motion-horse-0611.webp', focus: '50% 50%', desktopOnly: true },
]

const efeitosDaVitrine = () => publicEffectPages().filter((e) => !FORA_DE_ESTACAO.efeitos.includes(e.key))

// KINEO-VITRINE-ESTACAO-3110 — a lista da estação mora em lib/clips/clipSeason.ts (a mesma do "Trending this week" do Clipe).
// KINEO-MWK-MOSAICO-3110 — o selo "⚡ NEW" é honesto: só os efeitos da estação e os 8 mais novos do catálogo o recebem.
export function mosaicNewEffectKeys(now: number = Date.now()): Set<string> {
  const pages = efeitosDaVitrine() // KINEO-CLIPES-NOS-2-LUGARES-0411
  return new Set([...seasonalEffectKeys(now), ...pages.slice(-HOME_MOSAIC_EFFECTS).map((e) => e.key)])
}

/** Os efeitos da vitrine: os da estação primeiro, depois os mais novos do catálogo, alternando quem pede pessoa e quem não. */
export function homeMosaicEffects(now: number = Date.now(), limit: number = HOME_MOSAIC_EFFECTS): ClipEffect[] { // KINEO-MWK-MOSAICO-3110 — limit: a página Made with Kineo mostra TODOS
  const pages = efeitosDaVitrine() // KINEO-CLIPES-NOS-2-LUGARES-0411
  const dia = diaDaVitrine(now) // KINEO-CLIPES-NOS-2-LUGARES-0411 — a estação segue abrindo; dentro de cada grupo a ordem muda 1 vez por dia
  const seasonal = embaralhaDoDia(seasonalEffectKeys(now).map((k) => pages.find((e) => e.key === k) ?? null), dia, 'efeitos-estacao') // KINEO-CLIPES-NOS-2-LUGARES-0411
  const newest = embaralhaDoDia(pages.slice(-Math.max(0, Math.min(limit, pages.length))).reverse(), dia, 'efeitos') // KINEO-CLIPES-NOS-2-LUGARES-0411
  const pool = [...seasonal.filter((e): e is ClipEffect => !!e), ...newest].filter((e, i, all) => all.findIndex((x) => x.key === e.key) === i)
  const people = pool.filter((e) => e.person)
  const others = pool.filter((e) => !e.person)
  const mixed: ClipEffect[] = []
  while (people.length || others.length) {
    const a = people.shift(); if (a) mixed.push(a)
    const b = others.shift(); if (b) mixed.push(b)
  }
  return mixed
}

export function homeMosaicFilms() {
  return HOME_FEATURED_PLAYLISTS.flat().slice(0, HOME_MOSAIC_FILMS)
}

/** Ordem da vitrine: um clipe ou filme grande a cada 5 blocos, efeitos e imagens preenchendo; o que sobra de imagem vai até o fim. */
export function homeMosaicTiles(now: number = Date.now(), opts: { full?: boolean; styles?: readonly MosaicStyle[] } = {}): Tile[] { // KINEO-MWK-MOSAICO-3110 — full = página Made with Kineo (todos os efeitos + estilos de anúncio)
  const dia = diaDaVitrine(now) // KINEO-CLIPES-NOS-2-LUGARES-0411 — fundador 05/11 "embaralhar": cada grupo muda de ordem 1 vez por dia; a cadência de cartões grandes e pequenos é a de sempre
  const novos = clipesNovosDoDia(dia) // KINEO-CLIPES-NOS-2-LUGARES-0411
  const big0: Tile[] = [] // KINEO-CLIPES-NOS-2-LUGARES-0411
  const clips = embaralhaDoDia(HOME_NEW_CLIPS.filter((c) => !FORA_DE_ESTACAO.clipes.includes(c.id)), dia, 'clipes').map((clip): Tile => ({ kind: 'clip', clip })) // KINEO-CLIPES-NOS-2-LUGARES-0411
  const films = embaralhaDoDia(homeMosaicFilms(), dia, 'filmes').map((f): Tile => ({ kind: 'film', title: f.title, badge: f.badge, video: f.previewUrl ?? f.videoUrl, poster: f.posterUrl, focus: MOSAIC_FILM_FOCUS[assetOf(f.previewUrl ?? f.videoUrl)] ?? f.focalPoint })) // KINEO-CLIPES-NOS-2-LUGARES-0411
  while (clips.length || films.length) {
    const c = clips.shift(); if (c) big0.push(c)
    const f = films.shift(); if (f) big0.push(f)
  }
  const big = intercala(big0, novos.grandes.map((clip): Tile => ({ kind: 'novo', clip, grande: true }))) // KINEO-CLIPES-NOS-2-LUGARES-0411
  const fx = homeMosaicEffects(now, opts.full ? Number.MAX_SAFE_INTEGER : HOME_MOSAIC_EFFECTS).map((effect): Tile => ({ kind: 'effect', effect }))
  const st = embaralhaDoDia(opts.styles ?? [], dia, 'estilos').map((style): Tile => ({ kind: 'style', style })) // KINEO-CLIPES-NOS-2-LUGARES-0411
  const effects0: Tile[] = [] // KINEO-MWK-MOSAICO-3110 — efeitos e estilos se alternam (2 efeitos, 1 estilo) para a grade não virar blocos
  while (fx.length || st.length) { for (let i = 0; i < 2; i++) { const e = fx.shift(); if (e) effects0.push(e) } const s = st.shift(); if (s) effects0.push(s) }
  const effects = intercala(effects0, novos.pequenos.map((clip): Tile => ({ kind: 'novo', clip, grande: false }))) // KINEO-CLIPES-NOS-2-LUGARES-0411
  const imagensDaVitrine = [...HOME_GALLERY_IMAGES.map((i) => ({ ...i, dir: HOME_GALLERY_DIR })), ...HOME_MOSAIC_EXTRA_IMAGES.map((i) => ({ ...i, dir: HOME_MOSAIC_DIR }))].filter((i) => !FORA_DE_ESTACAO.imagens.includes(i.file)) // KINEO-CLIPES-NOS-2-LUGARES-0411
  const images = [...imagensDaVitrine.filter((i) => HOME_GALLERY_BIG.has(i.file)), ...semLargoNoFim(embaralhaDoDia(imagensDaVitrine.filter((i) => !HOME_GALLERY_BIG.has(i.file)), dia, 'imagens'), (i) => i.w > i.h, 8)].map((img): Tile => ({ kind: 'image', img })) // KINEO-CLIPES-NOS-2-LUGARES-0411 — a imagem grande segue na 1ª fileira: ela segura o desenho da 1ª tela e o número de vídeos que nascem ali
  const out: Tile[] = []
  while (big.length || effects.length || images.length) {
    const b = big.shift(); if (b) out.push(b)
    for (let i = 0; i < 2; i++) { const e = effects.shift(); if (e) out.push(e) }
    for (let i = 0; i < (big.length ? 2 : images.length); i++) { const m = images.shift(); if (m) out.push(m) }
  }
  const eGrande = (t: Tile) => t.kind === 'clip' || t.kind === 'film' || (t.kind === 'novo' && t.grande) // KINEO-CLIPES-NOS-2-LUGARES-0411
  const ePequeno = (t: Tile) => t.kind === 'effect' || t.kind === 'style' || (t.kind === 'novo' && !t.grande) // KINEO-CLIPES-NOS-2-LUGARES-0411
  const mesmoTamanho = (a: Tile, b: Tile) => (eGrande(a) && eGrande(b)) || (ePequeno(a) && ePequeno(b)) // KINEO-CLIPES-NOS-2-LUGARES-0411
  const semBloco = afastaVizinhos(out, (t) => t.kind === 'novo', mesmoTamanho, 2) // KINEO-CLIPES-NOS-2-LUGARES-0411 — misturado, nunca 3 clipes novos em bloco
  const ordem = afastaVizinhos(semBloco, (t) => t.kind === 'novo' && t.clip.pessoa, (a, b) => mesmoTamanho(a, b) && b.kind !== 'novo') // KINEO-CLIPES-NOS-2-LUGARES-0411 — a mesma pessoa nunca colada nela mesma
  if (opts.full) return ordem // KINEO-HOME-DOIS-EIXOS-0611
  return [...HOME_MOTION_TILES, ...ordem] // KINEO-HOME-DOIS-EIXOS-0611 — fileira própria e cheia, sem tirar nada da grade
}

const CSS = `
.klp .kmz{padding:22px 0 10px}
.klp .kmz-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-rows:clamp(92px,8.6vw,138px);grid-auto-flow:row dense;gap:12px}
.klp .kmz-t{position:relative;display:block;min-width:0;grid-row:span 2;overflow:hidden;border:1px solid var(--line,rgba(127,140,160,.25));border-radius:14px;background:#101821;color:#fff;text-decoration:none;isolation:isolate}
.klp .kmz-t:hover{border-color:var(--blue,#2f7cff)}
.klp .kmz-t:focus-visible{outline:2px solid var(--home-action,#0A5CFF);outline-offset:3px}
.klp .kmz-big{grid-column:span 2;grid-row:span 4}
.klp .kmz-wide{grid-column:span 2}
.klp .kmz-md{position:absolute;inset:0;background-color:#101821;background-repeat:no-repeat;background-size:cover;background-position:var(--kmz-focus,50% 50%)}
.klp .kmz-md video{object-position:var(--kmz-focus,50% 50%)}
.klp .kmz-t img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .35s ease}
.klp .kmz-t:hover img{transform:scale(1.03)}
.klp .kmz-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent 50%,rgba(3,9,18,.82) 100%)}
.klp .kmz-copy{position:absolute;left:12px;right:12px;bottom:10px;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:3px}
.klp .kmz-copy i{font-style:normal;font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#c8ddf1}
.klp .kmz-copy b{font-size:13px;line-height:1.2;font-weight:650;color:#fff;text-wrap:balance}
.klp .kmz-big .kmz-copy{left:16px;bottom:14px}
.klp .kmz-big .kmz-copy b{font-size:clamp(16px,1.3vw,20px)}
.klp .kmz-new{position:absolute;top:8px;left:8px;z-index:2;background:#ff3b6b;color:#fff;font-size:10px;font-weight:800;letter-spacing:.06em;padding:2px 7px;border-radius:999px}
.klp .kmz-re{position:absolute;top:8px;right:8px;z-index:3;display:inline-flex;align-items:center;gap:5px;padding:4px 10px 4px 8px;border-radius:999px;background:rgba(8,14,24,.62);border:1px solid rgba(255,255,255,.22);color:#fff;font-size:11px;font-weight:700;letter-spacing:.01em;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:background .2s ease,color .2s ease}
.klp .kmz-re svg{width:12px;height:12px;flex:none}
.klp .kmz-t:hover .kmz-re,.klp .kmz-t:focus-visible .kmz-re{background:#fff;color:#0b1119;border-color:#fff}
.klp .kmz-views{display:inline-flex;align-items:center;gap:4px;margin-top:2px;font-size:11px;font-weight:650;color:rgba(255,255,255,.88)}
.klp .kmz-views svg{width:13px;height:13px;flex:none}
.klp .kmz-cell{position:relative;min-width:0}
.klp .kmz-cell>.kmz-t{height:100%}
.klp .kmz-face{position:absolute;top:10px;left:10px;z-index:4;display:inline-flex;align-items:center;min-height:30px;padding:6px 12px;border-radius:999px;background:#fff;color:#0b1119;font-size:12px;font-weight:700;text-decoration:none}
.klp .kmz-face:hover{background:#eaf3ff}
@media(max-width:1099px){.klp .kmz-grid{grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:clamp(100px,15vw,150px)}}
@media(max-width:700px){.klp .kmz-re{top:6px;right:6px;padding:3px 8px 3px 6px;font-size:10px}.klp .kmz-grid{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:27vw;gap:8px}.klp .kmz-t{grid-row:span 2;border-radius:11px}.klp .kmz-big{grid-column:span 1;grid-row:span 3}.klp .kmz-wide{grid-column:span 2;grid-row:span 2}.klp .kmz-cell{grid-row:span 3}.klp .kmz-copy b,.klp .kmz-big .kmz-copy b{font-size:12px}.klp .kmz-face{top:6px;left:6px;min-height:24px;padding:4px 9px;font-size:10px}}
@media(prefers-reduced-motion:reduce){.klp .kmz-t img{transition:none}.klp .kmz-t:hover img{transform:none}}
`

// KINEO-CARDS-RECREATE-0911 — fundador 09/11 (print do Higgsfield): todo cartão de vídeo mostra "Recreate" para a pessoa já ver que
// dá para refazer. É um selo dentro do próprio cartão (sem <a> dentro de <a>): o clique no cartão inteiro já leva ao lugar de refazer
// (o /clips com motor e texto, a página do efeito, o Studio). Imagem não recebe: o /images ainda não aceita o texto pronto.
function Recreate() {
  return (
    <span className="kmz-re" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" /><path d="M13.5 2.5v3h-3" /></svg>
      <UiLabel>Recreate</UiLabel>
    </span>
  )
}

// KINEO-CARDS-VIEWS-0911 — views reais do post do mesmo vídeo na @usekineo (lib/home/cardSocialStats.ts); sem post, sem número.
function Views({ video }: { video?: string }) {
  const stat = cardStatFor(video)
  if (!stat) return null
  return (
    <span className="kmz-views" title={`${stat.views.toLocaleString('en-US')} views on ${stat.source}`}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" /><circle cx="8" cy="8" r="2" /></svg>
      {compactCount(stat.views)}<span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}> views on {stat.source}</span>
    </span>
  )
}

function focusStyle(poster: string | undefined, focus: string | undefined): CSSProperties | undefined {
  const style: Record<string, string> = {}
  if (poster) style.backgroundImage = `url(${poster})`
  if (focus) style['--kmz-focus'] = focus
  return Object.keys(style).length ? (style as CSSProperties) : undefined
}

export default function HomeMosaic({ signedIn, full = false, styles = [] }: { signedIn: boolean; full?: boolean; styles?: readonly MosaicStyle[] }) {
  const tiles = homeMosaicTiles(Date.now(), { full, styles })
  const newKeys = mosaicNewEffectKeys()
  const filmHref = clipsFirstFilmHref(signedIn)
  return (
    <section className="kmz" aria-label="Made with Kineo" data-home-section="mosaic">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">
        <div className="kmz-grid">
          {tiles.map((t) => {
            if (t.kind === 'clip') {
              const c = t.clip
              const card = (
                <Link key={c.id} href={viaSignup('/clips?' + new URLSearchParams({ engine: c.engine, prompt: c.prompt }).toString(), signedIn)} className="kmz-t kmz-big" data-home-cta="mosaic_clip" aria-label={`${c.title} — ${CLIP_ENGINES[c.engine].label}`}>
                  <div className="kmz-md" style={focusStyle(c.poster, MOSAIC_CLIP_FOCUS[c.id] ?? c.focus)}><WallMedia src={c.video} /></div>
                  <Recreate />
                <span className="kmz-shade" aria-hidden="true" />
                  <span className="kmz-copy"><i><UiLabel>Clip</UiLabel> · {CLIP_ENGINES[c.engine].label}</i><b><UiLabel>{c.title}</UiLabel></b><Views video={c.video} /></span>
                </Link>
              )
              return hasFaceRemix(c.id) ? (
                <div key={c.id} className="kmz-cell kmz-big">
                  <Link href={faceRemixHref(c.id, signedIn)} className="kmz-face" data-home-cta="face_remix" aria-label={`Put your face in it — ${c.title}`}><UiLabel>Put your face in it</UiLabel></Link>
                  {card}
                </div>
              ) : card
            }
            if (t.kind === 'novo') { // KINEO-CLIPES-NOS-2-LUGARES-0411 — selo = o motor real; o pôster é <img loading="lazy">: os 15 não somam nada ao 1º carregamento, e o vídeo só nasce na tela (WallMedia)
              const c = t.clip
              const motor = CLIP_ENGINES[c.engine].label
              return (
                <Link key={'novo-' + c.id} href={viaSignup(clipeNovoDestino(c), signedIn)} className={`kmz-t${t.grande ? ' kmz-big' : ''}`} data-home-cta="mosaic_clip" data-clip-novo={c.id} aria-label={`${c.title} — ${motor}`}>
                  <div className="kmz-md" style={focusStyle(undefined, c.focus)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={clipeNovoPoster(c)} width={540} height={960} alt="" loading="lazy" decoding="async" style={{ objectPosition: c.focus, transform: 'none' }} />
                    <WallMedia src={clipeNovoVideo(c)} />
                  </div>
                  <Recreate />
                <span className="kmz-shade" aria-hidden="true" />
                  <span className="kmz-copy"><i><UiLabel>Clip</UiLabel> · {motor}</i><b><UiLabel>{c.title}</UiLabel></b><Views video={clipeNovoVideo(c)} /></span>
                </Link>
              )
            }
            if (t.kind === 'motion') return (
              <Link key={t.video} href={filmHref} className="kmz-t kmz-big" data-home-cta="mosaic_motion"
                style={t.desktopOnly ? { display: 'none' } : undefined} aria-label={t.title + ' — Kling 3'}>
                <div className="kmz-md" style={focusStyle(t.poster, t.focus)}>
                  {t.desktopVideo ? (
                    <>
                      <div className="kmz-motion-original"><WallMedia src={t.video} /></div>
                      <div className="kmz-motion-desktop" style={{ display: 'none' }}><WallMedia src={t.desktopVideo} /></div>
                    </>
                  ) : <WallMedia src={t.video} />}
                </div>
                <Recreate />
                <span className="kmz-shade" aria-hidden="true" />
                <span className="kmz-copy"><i>Multi-camera · Kling 3</i><b>{t.title}</b><Views video={t.video} /></span>
              </Link>
            )
            if (t.kind === 'film') return (
              <Link key={t.video} href={filmHref} className="kmz-t kmz-big" data-home-cta="mosaic_film" aria-label={`${t.title} — narrated film`}>
                <div className="kmz-md" style={focusStyle(t.poster, t.focus)}><WallMedia src={t.video} /></div>
                <Recreate />
                <span className="kmz-shade" aria-hidden="true" />
                <span className="kmz-copy"><i><UiLabel>Narrated film</UiLabel> · {t.badge}</i><b><UiLabel>{t.title}</UiLabel></b><Views video={t.video} /></span>
              </Link>
            )
            if (t.kind === 'effect') {
              const e = t.effect
              return (
                <Link key={e.key} href={effectPagePath(effectSlug(e))} className="kmz-t" data-home-cta={`mosaic_effect_${e.key}`} aria-label={`${e.title} — effect`}>
                  <div className="kmz-md" style={focusStyle(e.preview?.poster, MOSAIC_EFFECT_FOCUS[e.key] ?? '50% 45%')}>{e.preview ? <WallMedia src={`${e.preview.video}#t=1.6`} /> : null}</div>
                  {newKeys.has(e.key) ? <span className="kmz-new">⚡ NEW</span> : null}
                  <Recreate />
                <span className="kmz-shade" aria-hidden="true" />
                  <span className="kmz-copy"><i><UiLabel>Effect</UiLabel></i><b><UiLabel>{e.title}</UiLabel></b><Views video={e.preview?.video} /></span>
                </Link>
              )
            }
            if (t.kind === 'style') { // KINEO-MWK-MOSAICO-3110
              const st = t.style
              return (
                <Link key={'style-' + st.key} href={st.href} className="kmz-t" data-home-cta={`mosaic_style_${st.key}`} aria-label={`${st.title} — ad style`}>
                  <div className="kmz-md" style={focusStyle(st.poster ?? undefined, '50% 45%')}><WallMedia src={st.video} /></div>
                  <Recreate />
                <span className="kmz-shade" aria-hidden="true" />
                  <span className="kmz-copy"><i><UiLabel>Ad style</UiLabel>{st.engine ? ` · ${st.engine}` : ''}</i><b><UiLabel>{st.title}</UiLabel></b></span>
                </Link>
              )
            }
            const img = t.img
            return (
              <Link key={img.file} href="/images" className={`kmz-t ${img.w > img.h ? 'kmz-wide' : HOME_GALLERY_BIG.has(img.file) ? 'kmz-big' : ''}`} data-home-cta="mosaic_image" aria-label={`${img.alt}. Open Kineo Images`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${img.dir}${img.file}`} width={img.w} height={img.h} alt={img.alt} loading="lazy" decoding="async" />
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/** Usado pelo guardião: quantos de cada tipo a vitrine mostra. */
export function homeMosaicCounts(now: number = Date.now()) {
  const tiles = homeMosaicTiles(now)
  const count = (k: Tile['kind']) => tiles.filter((t) => t.kind === k).length
  return { clips: count('clip'), novos: count('novo'), films: count('film'), effects: count('effect'), images: count('image') } // KINEO-CLIPES-NOS-2-LUGARES-0411
}

