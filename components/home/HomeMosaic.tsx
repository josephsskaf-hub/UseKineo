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
import { HALLOWEEN_SKIN_ENDS_AT } from '@/components/home/HalloweenSkin'

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

type MosaicImage = HomeGalleryImage & { dir: string }

type Tile =
  | { kind: 'clip'; clip: (typeof HOME_NEW_CLIPS)[number] }
  | { kind: 'film'; title: string; badge: string; video: string; poster?: string; focus?: string }
  | { kind: 'effect'; effect: ClipEffect }
  | { kind: 'image'; img: MosaicImage }

/** Os efeitos da vitrine: os mais novos do catálogo (+ bruxa e zumbi até o fim do Halloween), alternando quem pede pessoa e quem não. */
export function homeMosaicEffects(now: number = Date.now()): ClipEffect[] {
  const pages = publicEffectPages()
  const halloween = now < Date.parse(HALLOWEEN_SKIN_ENDS_AT) ? (['witch', 'zombie'] as const).map((k) => pages.find((e) => e.key === k) ?? null) : []
  const newest = pages.slice(-HOME_MOSAIC_EFFECTS).reverse()
  const pool = [...halloween.filter((e): e is ClipEffect => !!e), ...newest].filter((e, i, all) => all.findIndex((x) => x.key === e.key) === i)
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
export function homeMosaicTiles(now: number = Date.now()): Tile[] {
  const big: Tile[] = []
  const clips = HOME_NEW_CLIPS.map((clip): Tile => ({ kind: 'clip', clip }))
  const films = homeMosaicFilms().map((f): Tile => ({ kind: 'film', title: f.title, badge: f.badge, video: f.previewUrl ?? f.videoUrl, poster: f.posterUrl, focus: f.focalPoint }))
  while (clips.length || films.length) {
    const c = clips.shift(); if (c) big.push(c)
    const f = films.shift(); if (f) big.push(f)
  }
  const effects = homeMosaicEffects(now).map((effect): Tile => ({ kind: 'effect', effect }))
  const images = [...HOME_GALLERY_IMAGES.map((i) => ({ ...i, dir: HOME_GALLERY_DIR })), ...HOME_MOSAIC_EXTRA_IMAGES.map((i) => ({ ...i, dir: HOME_MOSAIC_DIR }))].map((img): Tile => ({ kind: 'image', img }))
  const out: Tile[] = []
  while (big.length || effects.length || images.length) {
    const b = big.shift(); if (b) out.push(b)
    for (let i = 0; i < 2; i++) { const e = effects.shift(); if (e) out.push(e) }
    for (let i = 0; i < (big.length ? 2 : images.length); i++) { const m = images.shift(); if (m) out.push(m) }
  }
  return out
}

const CSS = `
.klp .kmz{padding:22px 0 10px}
.klp .kmz-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-rows:clamp(92px,8.6vw,138px);grid-auto-flow:row dense;gap:12px}
.klp .kmz-t{position:relative;display:block;min-width:0;grid-row:span 2;overflow:hidden;border:1px solid var(--line);border-radius:14px;background:#101821;color:#fff;text-decoration:none;isolation:isolate}
.klp .kmz-t:hover{border-color:var(--blue)}
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
.klp .kmz-cell{position:relative;min-width:0}
.klp .kmz-cell>.kmz-t{height:100%}
.klp .kmz-face{position:absolute;top:10px;left:10px;z-index:4;display:inline-flex;align-items:center;min-height:30px;padding:6px 12px;border-radius:999px;background:#fff;color:#0b1119;font-size:12px;font-weight:700;text-decoration:none}
.klp .kmz-face:hover{background:#eaf3ff}
@media(max-width:1099px){.klp .kmz-grid{grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:clamp(100px,15vw,150px)}}
@media(max-width:700px){.klp .kmz-grid{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:27vw;gap:8px}.klp .kmz-t{grid-row:span 2;border-radius:11px}.klp .kmz-big{grid-column:span 1;grid-row:span 3}.klp .kmz-wide{grid-column:span 2;grid-row:span 2}.klp .kmz-cell{grid-row:span 3}.klp .kmz-copy b,.klp .kmz-big .kmz-copy b{font-size:12px}.klp .kmz-face{top:6px;left:6px;min-height:24px;padding:4px 9px;font-size:10px}}
@media(prefers-reduced-motion:reduce){.klp .kmz-t img{transition:none}.klp .kmz-t:hover img{transform:none}}
`

function focusStyle(poster: string | undefined, focus: string | undefined): CSSProperties | undefined {
  const style: Record<string, string> = {}
  if (poster) style.backgroundImage = `url(${poster})`
  if (focus) style['--kmz-focus'] = focus
  return Object.keys(style).length ? (style as CSSProperties) : undefined
}

export default function HomeMosaic({ signedIn }: { signedIn: boolean }) {
  const tiles = homeMosaicTiles()
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
                  <div className="kmz-md" style={focusStyle(c.poster, c.focus)}><WallMedia src={c.video} /></div>
                  <span className="kmz-shade" aria-hidden="true" />
                  <span className="kmz-copy"><i><UiLabel>Clip</UiLabel> · {CLIP_ENGINES[c.engine].label}</i><b><UiLabel>{c.title}</UiLabel></b></span>
                </Link>
              )
              return hasFaceRemix(c.id) ? (
                <div key={c.id} className="kmz-cell kmz-big">
                  <Link href={faceRemixHref(c.id, signedIn)} className="kmz-face" data-home-cta="face_remix" aria-label={`Put your face in it — ${c.title}`}><UiLabel>Put your face in it</UiLabel></Link>
                  {card}
                </div>
              ) : card
            }
            if (t.kind === 'film') return (
              <Link key={t.video} href={filmHref} className="kmz-t kmz-big" data-home-cta="mosaic_film" aria-label={`${t.title} — narrated film`}>
                <div className="kmz-md" style={focusStyle(t.poster, t.focus)}><WallMedia src={t.video} /></div>
                <span className="kmz-shade" aria-hidden="true" />
                <span className="kmz-copy"><i><UiLabel>Narrated film</UiLabel> · {t.badge}</i><b><UiLabel>{t.title}</UiLabel></b></span>
              </Link>
            )
            if (t.kind === 'effect') {
              const e = t.effect
              return (
                <Link key={e.key} href={effectPagePath(effectSlug(e))} className="kmz-t" data-home-cta={`mosaic_effect_${e.key}`} aria-label={`${e.title} — effect`}>
                  <div className="kmz-md" style={focusStyle(e.preview?.poster, '50% 45%')}>{e.preview ? <WallMedia src={`${e.preview.video}#t=1.6`} /> : null}</div>
                  <span className="kmz-new">NEW</span>
                  <span className="kmz-shade" aria-hidden="true" />
                  <span className="kmz-copy"><i><UiLabel>Effect</UiLabel></i><b><UiLabel>{e.title}</UiLabel></b></span>
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
  return { clips: count('clip'), films: count('film'), effects: count('effect'), images: count('image') }
}

