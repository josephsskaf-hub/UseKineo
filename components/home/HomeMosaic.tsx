// KINEO-HOME-MOSAICO-2910 — fundador 29/10: "criar uma coisa grande com tudo, sem separações… nenhum dos concorrentes faz
// separações. A única coisa que eu separaria são os 4 quadros iniciais." Depois dos 4 cards, a home vira UMA vitrine contínua
// (grade em mosaico, sem título entre blocos), com tudo misturado: clipes maiores, 6 filmes narrados, efeitos novos (mínimo 8,
// menores, alternando pessoa/pet/produto para não repetir a mesma foto lado a lado) e a galeria de imagens indo até o fim.
// Regras de sempre: nada novo é inventado aqui — clipes, filmes, efeitos e imagens vêm das MESMAS listas curadas das faixas
// antigas (lib/homeGaleria, lib/ui/homeFeaturedFilms, lib/clips/clipEffects, HomeImageGallery); selo honesto = o motor real;
// sem preço no cartão; vídeo só toca na tela (WallMedia); cada cartão leva ao lugar que já levava.
// KINEO-CARDS-SEM-MOTOR-0911 — fundador 09/11: "quero que você tire os nomes dos motores, porque eu não vejo em outros sites". Nenhum
// cartão mostra nome de motor (nem no texto, nem no aria-label): só o tipo (Clip, Multi-camera, Narrated film, Effect, Ad style,
// Trending format). O motor real segue gravado no dado (engine, badge) e no link (/clips?engine=…).
// KINEO-CARDS-SEM-ETIQUETA-0911 — fundador 09/11, sobre a etiqueta pequena do tipo em cima do título: "Só a etiqueta". O cartão fica só com o
// título (mais "Recreate", "⚡ NEW" e as views reais onde existem): nenhuma etiqueta de tipo nem nome de motor aparece na tela. O tipo continua
// no aria-label (leitor de tela) e no dado (selo, engine); nada mudou no link.
// KINEO-ENQUADRAMENTO-0911 — fundador 09/11 ("a gente não pode errar isso"): toda mídia nova desta vitrine (clipe, filme, efeito, estilo, foto,
// multicâmera) entra com o quadro conferido: node scripts/enquadra.mjs <id> → olhar a folha → focus aqui → linha em lib/vitrineEnquadramento.ts.
// O guardião scripts/test-enquadramento-vitrine-0911.mjs fica vermelho sem a linha, com focus diferente ou com arquivo trocado.
import Link from 'next/link'
import type { CSSProperties } from 'react'
import WallMedia from '@/components/WallMedia'
import { UiLabel } from '@/components/InterfaceLanguage'
import { HOME_NEW_CLIPS } from '@/components/home/HomeClipsStrip'
import { faceRemixHref, hasFaceRemix } from '@/lib/clips/faceRemix'
import { viaSignup } from '@/lib/homeGaleria'
import { HOME_FEATURED_PLAYLISTS } from '@/lib/ui/homeFeaturedFilms'
import type { ClipEffect } from '@/lib/clips/clipEffects'
import { publicEffectPages, effectPagePath, effectSlug } from '@/lib/clips/clipEffectPages'
import { HOME_GALLERY_BIG, HOME_GALLERY_DIR, HOME_GALLERY_IMAGES, type HomeGalleryImage } from '@/components/home/HomeImageGallery'
import { clipsFirstFilmHref } from '@/lib/growth/homeClipsFirst'
import { createEntryForSignupHref } from '@/lib/create/entry' // KINEO-ENTRADAS-TELA-NOVA-1011 [fundador 10/11: "1 sim, todas as telas vão pro modelo novo"]
import { cardStatFor, compactCount } from '@/lib/home/cardSocialStats' // KINEO-CARDS-VIEWS-0911
import { seasonalEffectKeys } from '@/lib/clips/clipSeason' // KINEO-VITRINE-ESTACAO-3110
import { publicRecreatePath } from '@/lib/recreate/entry'
import { CLIPES_NOVOS, CLIPES_NO_TOPO, FORA_DE_ESTACAO, afastaVizinhos, fechaOFim, semLargoNoFim, clipeNovoAbreStudio, clipeNovoAnuncio, clipeNovoDestino, clipeNovoPoster, clipeNovoVideo, clipesNovosDoDia, diaDaVitrine, embaralhaDoDia, intercala, type ClipeNovo } from '@/lib/clipesNos2Lugares' // KINEO-CLIPES-NOS-2-LUGARES-0411

/** Interruptor da vitrine contínua (false = a home volta às faixas separadas de antes, intactas no KineoLanding). */
export const HOME_MOSAIC_LIVE = true
export const HOME_MOSAIC_FILMS = 6
export const HOME_MOSAIC_EFFECTS = 8

/** KINEO-EFEITO-DIRETO-1011 [fundador 10/11: "Tá caindo nessa página aqui, que era anterior, acho que deveria não cair mais"] — o cartão de
 *  efeito leva DIRETO à criação no Recreate (/recreate/effect-<slug>; visitante passa pelo cadastro e volta para lá, como os outros cartões).
 *  publicRecreatePath devolve null com o Recreate fechado ('internal') ou efeito fora do catálogo: aí volta a página pública do efeito, que
 *  continua no ar para busca e IA. Só o clique de dentro do site deixa de passar por ela. */
export function effectCardHref(e: Pick<ClipEffect, 'key'>, signedIn: boolean): string {
  const recreate = publicRecreatePath(`effect-${effectSlug(e)}`)
  return recreate ? viaSignup(recreate, signedIn) : effectPagePath(effectSlug(e))
}

// KINEO-ETIQUETA-UNICA-1111 [CEO 11/11, tarefa 2: "todo cartão da home com nome" — batom, pote de creme, capa amarela, cabana com aurora
// não tinham]: o nome curto de cada foto da vitrine (o que está na foto, sem marca e sem motor). A curadoria (quais fotos) não muda.
export const MOSAIC_IMAGE_TITLE: Readonly<Record<string, string>> = {
  'puddle.webp': 'Puddle jump', 'ad-01.webp': 'Amber perfume on stone', 'ad-02.webp': 'Sneaker over a splash', 'clock-blue.webp': 'Blue alarm clock',
  'ad-03.webp': 'Skincare jar on marble', 'lighthouse.webp': 'Lighthouse in a storm', 'sneaker-white.webp': 'White running sneaker',
  'ad-04.webp': 'Coffee bag and espresso', 'raincoat.webp': 'Yellow raincoat on the cliffs', 'ad-05.webp': 'Smartwatch at golden hour',
  'coffee.webp': 'Cozy coffee shop', 'perfume-splash.webp': 'Perfume in a splash', 'apple.webp': 'Red apple by the window',
  'ad-06.webp': 'Red lipstick on satin', 'boutique.webp': 'Sneaker boutique', 'ad-07.webp': 'Cream headphones', 'astronaut.webp': 'Astronaut in sunflowers',
  'ad-08.webp': 'Drink can on ice', 'cube.webp': 'Puzzle cube', 'ad-09.webp': 'Leather tote bag', 'coworking.webp': 'Coworking office',
  'ad-10.webp': 'Tortoiseshell sunglasses', 'clock-brass.webp': 'Brass alarm clock', 'toycar.webp': 'Red toy car',
  'pumpkin.webp': 'Jack-o’-lantern', 'perfume-snow.webp': 'Perfume in the snow', 'cabin.webp': 'Cabin under the aurora',
  'dog-sweater.webp': 'Dog in a Christmas sweater', 'camper.webp': 'Camper van at sunset', 'mug-rain.webp': 'Mug on a rainy sill',
  'roses.webp': 'White roses', 'alley.webp': 'Lantern alley in the rain', 'jelly.webp': 'Red jelly dessert', 'boot-stream.webp': 'Boot in a stream',
  'matcha.webp': 'Iced matcha latte', 'canoe.webp': 'Canoe on a misty lake',
}
/** O nome curto da foto; foto nova sem nome na lista cai no começo da descrição (nunca cartão mudo). */
export function mosaicImageTitle(file: string, alt = ''): string {
  return MOSAIC_IMAGE_TITLE[file] ?? alt.replace(/^(An?|The) /, '').split(/ (?:on|in|with|by|at|under|over) /)[0]
}

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
// KINEO-ENQUADRAMENTO-0911 — fundador 09/11: "tem muitos que estão fora de quadro… a gente não pode errar isso… rever todos os vídeos".
// A janela de 5:6 de 29/10 não era a pior: na home do computador (app/appearance.css, #samples) a fileira é (max(300, (alto−244)/2)−24)/3 e o
// cartão fica DEITADO — 297×230 (1,29) numa tela 1920×1080 —, mostrando só 43% da altura do vídeo 9:16. Cada mídia foi revista quadro a
// quadro nessa janela (scripts/enquadra.mjs) e o foco abaixo é o conferido; o registro (lib/vitrineEnquadramento.ts) guarda o mesmo valor, e
// scripts/test-enquadramento-vitrine-0911.mjs fica vermelho se um dos dois mudar sem o outro, ou se entrar mídia sem conferência.
export const MOSAIC_CLIP_FOCUS: Record<string, string> = { 'golden-ball': '50% 12%', lion: '50% 22%', 'cake-kitten': '50% 20%', 'pebble-castle': '50% 18%', 'knight-cat': '50% 15%', capybara: '50% 32%', 'wizard-cat': '50% 16%' }
export const MOSAIC_FILM_FOCUS: Record<string, string> = { 'robot-action': '50% 12%', 'volcano-scene': '50% 48%', 'lighthouse-scene': '50% 14%' }
export const MOSAIC_EFFECT_FOCUS: Record<string, string> = { witch: '50% 30%', pet_lion: '50% 14%', pet_xmas_tree: '50% 8%', pet_xmas_angel: '50% 18%', santa_cartoon: '50% 10%', snow_globe: '50% 8%', giant_product: '50% 28%', pet_bee: '50% 12%', kiss: '50% 22%', hug: '50% 22%', storm_behind: '50% 40%', wings: '50% 18%', restore_old_photo: '50% 22%', melt: '50% 33%', dollar_rain: '50% 25%', muscle_surge: '50% 22%', secret_cake: '50% 40%', color_burst: '50% 15%', cinematic_slowmo: '50% 28%', bring_to_life: '50% 38%', product_360: '50% 32%' }
/** KINEO-ENQUADRAMENTO-0911 — estilos de anúncio do /made-with-kineo (antes, todos em 50% 45%). */
export const MOSAIC_STYLE_FOCUS: Record<string, string> = { dreamlike_cloud: '50% 55%', lighting_ad: '50% 55%', boom_drop: '50% 38%', mechanical_assembly: '50% 40%', poster_ad: '50% 50%', package_explosion: '50% 60%', graffiti_ad: '50% 62%' }
/** KINEO-ENQUADRAMENTO-0911 — fotos da vitrine (antes, todas no centro): o homem que pula a poça e o cachorro de suéter perdiam a cabeça. */
export const MOSAIC_IMAGE_FOCUS: Record<string, string> = { 'puddle.webp': '50% 32%', 'raincoat.webp': '50% 44%', 'matcha.webp': '50% 35%', 'dog-sweater.webp': '50% 25%', 'roses.webp': '50% 30%', 'ad-04.webp': '50% 38%', 'perfume-snow.webp': '50% 37%', 'ad-09.webp': '50% 37%', 'ad-08.webp': '50% 41%', 'ad-01.webp': '50% 45%', 'lighthouse.webp': '50% 30%', 'perfume-splash.webp': '50% 28%' }
const assetOf = (url: string) => url.split('/').pop()?.replace(/\.mp4$/, '') ?? ''

type MosaicImage = HomeGalleryImage & { dir: string }

/** KINEO-MWK-MOSAICO-3110 — um estilo de anúncio no mosaico da página Made with Kineo (dados do antigo bloco do /trending). */
export interface MosaicStyle { key: string; title: string; engine: string | null; video: string; poster: string | null; href: string }

type MotionTile = { kind: 'motion'; title: string; video: string; poster: string; focus: string; desktopOnly?: true; desktopVideo?: string; /** KINEO-HOME-TOPO-CLIPES-1311 — o clipe da lista compartilhada que este cartão do topo mostra */ clip?: ClipeNovo }

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
// KINEO-HOME-TOPO-CLIPES-1311 — a fileira de cima passa a ser os clipes novos (CLIPES_NO_TOPO), em cartão grande. As seis paisagens de 06/11 saem da home; os
// arquivos public/previews/motion-*-0611.mp4 ficam no disco.
export const HOME_MOTION_TILES: readonly MotionTile[] = CLIPES_NO_TOPO.flatMap((id): MotionTile[] => {
  const clip = CLIPES_NOVOS.find((c) => c.id === id)
  return clip ? [{ kind: 'motion', title: clip.title, video: clipeNovoVideo(clip), poster: clipeNovoPoster(clip), focus: clip.focus, clip }] : []
})
const NO_TOPO = new Set(HOME_MOTION_TILES.map((t) => t.clip?.id))

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
  const ordem0 = afastaVizinhos(semBloco, (t) => t.kind === 'novo' && t.clip.pessoa, (a, b) => mesmoTamanho(a, b) && b.kind !== 'novo') // KINEO-CLIPES-NOS-2-LUGARES-0411 — a mesma pessoa nunca colada nela mesma
  // KINEO-OUTFIT-MORPH-HOME-0911 — com 16 clipes o último cartão grande às vezes sobrava sozinho e deixava um degrau vazio no fim da grade:
  // adianta um dos 2 últimos grandes só se fechar o degrau no computador (6 colunas) sem piorar tablet (4) nem celular (2), e sem colar pessoa
  // nem juntar 3 clipes novos. Os tamanhos são os do CSS abaixo (.kmz-big 2×4 / 1×3 no celular, .kmz-wide 2×2, cartão 1×2).
  const largo = (t: Tile) => t.kind === 'image' && t.img.w > t.img.h
  const alto = (t: Tile) => eGrande(t) || (t.kind === 'image' && HOME_GALLERY_BIG.has(t.img.file))
  const tamanhoDesk = (t: Tile): readonly [number, number] => (alto(t) ? [2, 4] : largo(t) ? [2, 2] : [1, 2])
  const tamanhoCel = (t: Tile): readonly [number, number] => (alto(t) ? [1, 3] : largo(t) ? [2, 2] : [1, 2])
  const semColar = (fila: readonly Tile[]) => {
    let novos = 0; let pessoa = -9
    for (let i = 0; i < fila.length; i++) {
      const t = fila[i]
      novos = t.kind === 'novo' ? novos + 1 : 0
      if (novos > 2) return false
      if (t.kind === 'novo' && t.clip.pessoa) { if (i - pessoa < 2) return false; pessoa = i }
    }
    return true
  }
  const ordem = fechaOFim(ordem0, alto, [{ colunas: 6, tamanho: tamanhoDesk }, { colunas: 4, tamanho: tamanhoDesk }, { colunas: 2, tamanho: tamanhoCel }], semColar) // KINEO-OUTFIT-MORPH-HOME-0911
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
.klp .kmz-copy b{font-size:13px;line-height:1.2;font-weight:650;color:#fff;text-wrap:balance}
.klp .kmz-big .kmz-copy{left:16px;bottom:14px}
.klp .kmz-big .kmz-copy b{font-size:clamp(16px,1.3vw,20px)}
/* KINEO-ETIQUETA-UNICA-1111 [CEO 11/11, tarefa 2 do fundador "design mais bonito"] — UM desenho de etiqueta para NEW, Recreate, Make your ad e Put your face in it (antes eram 4: rosa, vidro escuro, branco grande e branco pequeno), todas numa fileira que quebra linha em vez de sobrepor; no cartão com "Put your face in it" a fileira desce para baixo dela */
.klp .kmz-chips{position:absolute;top:8px;left:8px;right:8px;z-index:3;display:flex;flex-wrap:wrap;align-items:flex-start;gap:6px;pointer-events:none}
.klp .kmz-chip{display:inline-flex;align-items:center;gap:5px;min-height:28px;padding:4px 11px 4px 9px;border-radius:999px;background:rgba(8,14,24,.66);border:1px solid rgba(255,255,255,.24);color:#fff;font-size:12px;font-weight:700;line-height:1;letter-spacing:.01em;white-space:nowrap;text-decoration:none;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:background .2s ease,color .2s ease,border-color .2s ease}
.klp .kmz-chip svg{width:12px;height:12px;flex:none}
.klp .kmz-cell .kmz-t .kmz-chips{top:44px}
.klp .kmz-t:hover .kmz-chip,.klp .kmz-t:focus-visible .kmz-chip,.klp a.kmz-chip:hover,.klp a.kmz-chip:focus-visible{background:#fff;color:#0b1119;border-color:#fff}
.klp .kmz-views{display:inline-flex;align-items:center;gap:4px;margin-top:2px;font-size:12px;font-weight:650;color:rgba(255,255,255,.88)}
.klp .kmz-views svg{width:13px;height:13px;flex:none}
.klp .kmz-cell{position:relative;min-width:0}
.klp .kmz-cell>.kmz-t{height:100%}
.klp .kmz-face{position:absolute;top:8px;left:8px;z-index:4}
@media(max-width:1099px){.klp .kmz-grid{grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:clamp(100px,15vw,150px)}}
@media(max-width:700px){.klp .kmz-chips{top:6px;left:6px;right:6px;gap:4px}.klp .kmz-chip{min-height:26px;gap:4px;padding:4px 7px 4px 6px;letter-spacing:0}.klp .kmz-cell .kmz-t .kmz-chips{top:38px}.klp .kmz-grid{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:27vw;gap:8px}.klp .kmz-t{grid-row:span 2;border-radius:11px}.klp .kmz-big{grid-column:span 1;grid-row:span 3}.klp .kmz-wide{grid-column:span 2;grid-row:span 2}.klp .kmz-cell{grid-row:span 3}.klp .kmz-copy b,.klp .kmz-big .kmz-copy b{font-size:12px}.klp .kmz-face{top:6px;left:6px}}
@media(prefers-reduced-motion:reduce){.klp .kmz-t img{transition:none}.klp .kmz-t:hover img{transform:none}}
`

// KINEO-CARDS-RECREATE-0911 — fundador 09/11 (print do Higgsfield): todo cartão de vídeo mostra "Recreate" para a pessoa já ver que
// dá para refazer. É um selo dentro do próprio cartão (sem <a> dentro de <a>): o clique no cartão inteiro já leva ao lugar de refazer
// (o /clips com motor e texto, a página do efeito, o Studio). Imagem não recebe: o /images ainda não aceita o texto pronto.
// KINEO-RECREATE-SO-ONDE-RECRIA-1011 — fundador 10/11: "tem vários lugares que tá o botão Recreate… mas tem alguns que não são de Recreate.
// Tipo quatro câmeras na onda, não dá para recriar… Acho que tem que colocar só os que recriam." A regra mora SÓ aqui: o selo aparece apenas
// no cartão cujo clique abre a criação já pronta para fazer aquele mesmo vídeo.
//   · sim: clipe com o texto no link (/clips?engine=…&prompt=…), clipe novo com prompt, efeito (a página aplica aquele efeito na foto da
//     pessoa), estilo de anúncio (abre o anúncio naquele estilo);
//   · não: multicâmera e filme narrado (abrem o Studio em branco), clipe novo sem prompt (clipe por foto e os de formato, como o outfit-morph
//     e os 7 de 09/11: abrem o /clips vazio) e imagem.
// Quando existir a página pública de Recreate e o cartão de formato levar a ela, o selo volta para esses cartões — aqui.
// KINEO-ADS-NATAL-VITRINE-1011 — o exemplo de anúncio é um caso À PARTE e explícito: nunca "Recreate" (o clique não refaz aquele vídeo),
// e sim o convite "Make your ad" (podeFazerAnuncio), que abre a criação de anúncio.
export function podeRecriar(t: Tile): boolean {
  if (t.kind === 'clip') return !!t.clip.prompt
  if (t.kind === 'novo') return !clipeNovoAnuncio(t.clip) && (!!publicRecreatePath(t.clip.id) || !!t.clip.prompt)
  return t.kind === 'effect' || t.kind === 'style'
}

// KINEO-ADS-NATAL-VITRINE-1011 — fundador 10/11: "Pode colocar todos na página inicial como anúncios, né? E daí a gente vai usar 'faça seu
// anúncio aqui', né? Em vez de Recreate, a pessoa vai fazer o anúncio dela." Só o cartão de exemplo de anúncio ('Ad example' na lista
// compartilhada) mostra o convite; o cartão inteiro leva à criação de anúncio (o mesmo /ads/new do item "Product ads" do menu do topo). O
// convite chama a pessoa a fazer o DELA: nada no cartão diz que este vídeo saiu da ferramenta de Ads (não saiu: foi feito à mão).
export function podeFazerAnuncio(t: Tile): boolean {
  return t.kind === 'novo' && clipeNovoAnuncio(t.clip)
}

function Recreate() {
  return (
    <span className="kmz-chip kmz-re" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" /><path d="M13.5 2.5v3h-3" /></svg>
      <UiLabel>Recreate</UiLabel>
    </span>
  )
}

/** KINEO-ADS-NATAL-VITRINE-1011 — o convite do exemplo de anúncio, no lugar do "Recreate" (mesmo desenho; o clique é o do cartão inteiro). */
function MakeYourAd() {
  return (
    <span className="kmz-chip kmz-re kmz-mkad" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v10" /><path d="M3 8h10" /></svg>
      <UiLabel>Make your ad</UiLabel>
    </span>
  )
}

// KINEO-ETIQUETA-UNICA-1111 [CEO 11/11, tarefa 2] — as etiquetas do cartão numa fileira só (um desenho, quebra linha, nunca sobrepõe).
function Chips({ novo = false, recreate = false, ad = false }: { novo?: boolean; recreate?: boolean; ad?: boolean }) {
  if (!novo && !recreate && !ad) return null
  return (
    <span className="kmz-chips">
      {novo ? <span className="kmz-chip kmz-new">⚡ NEW</span> : null}
      {recreate ? <Recreate /> : null}
      {ad ? <MakeYourAd /> : null}
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
  const filmHref = createEntryForSignupHref(clipsFirstFilmHref(signedIn), signedIn) // KINEO-ENTRADAS-TELA-NOVA-1011 — logado: a aba Film da tela nova (mesma campanha); visitante: o de hoje
  return (
    <section className="kmz" aria-label="Made with Kineo" data-home-section="mosaic">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">
        <div className="kmz-grid">
          {tiles.map((t) => {
            if (t.kind === 'clip') {
              const c = t.clip
              const card = (
                <Link key={c.id} href={viaSignup('/clips?' + new URLSearchParams({ engine: c.engine, prompt: c.prompt }).toString(), signedIn)} className="kmz-t kmz-big" data-home-cta="mosaic_clip" aria-label={`${c.title} — clip`}>
                  <div className="kmz-md" style={focusStyle(c.poster, MOSAIC_CLIP_FOCUS[c.id] ?? c.focus)}><WallMedia src={c.video} /></div>
                  <Chips recreate={podeRecriar(t)} />
                <span className="kmz-shade" aria-hidden="true" />
                  <span className="kmz-copy"><b><UiLabel>{c.title}</UiLabel></b><Views video={c.video} /></span>
                </Link>
              )
              return hasFaceRemix(c.id) ? (
                <div key={c.id} className="kmz-cell kmz-big">
                  <Link href={faceRemixHref(c.id, signedIn)} className="kmz-chip kmz-face" data-home-cta="face_remix" aria-label={`Put your face in it — ${c.title}`}><UiLabel>Put your face in it</UiLabel></Link>
                  {card}
                </div>
              ) : card
            }
            if (t.kind === 'novo') { // KINEO-CLIPES-NOS-2-LUGARES-0411 — selo = o motor real; o pôster é <img loading="lazy">: os 15 não somam nada ao 1º carregamento, e o vídeo só nasce na tela (WallMedia)
              const c = t.clip
              if (!full && NO_TOPO.has(c.id)) return null // KINEO-HOME-TOPO-CLIPES-1311 — já abre a home no topo; no /made-with-kineo (full) segue na grade
              const tipo = c.selo ?? 'Clip' // KINEO-CARDS-SEM-MOTOR-0911 — o TIPO (Clip / Trending format), nunca o motor; o motor real segue no dado e no link · KINEO-CARDS-SEM-ETIQUETA-0911 — o tipo vive só no aria-label
              return ( // KINEO-ADS-NATAL-VITRINE-1011 — exemplo de anúncio: clipeNovoDestino dá /ads/new (via viaSignup), medido à parte como mosaic_ad
                <Link key={'novo-' + c.id} href={clipeNovoAbreStudio(c) ? filmHref /* KINEO-VITRINE-10-1011 — filme do Studio: o link dos filmes */ : createEntryForSignupHref(viaSignup(publicRecreatePath(c.id) ?? clipeNovoDestino(c), signedIn), signedIn) /* KINEO-ENTRADAS-TELA-NOVA-1011 — logado: só /ads/new seco vira /create/ads */} className={`kmz-t${t.grande ? ' kmz-big' : ''}`} data-home-cta={podeFazerAnuncio(t) ? 'mosaic_ad' : 'mosaic_clip'} data-clip-novo={c.id} aria-label={`${c.title} — ${tipo}`}>
                  <div className="kmz-md" style={focusStyle(undefined, c.focus)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={clipeNovoPoster(c)} width={540} height={960} alt="" loading="lazy" decoding="async" style={{ objectPosition: c.focus, transform: 'none' }} />
                    <WallMedia src={clipeNovoVideo(c)} />
                  </div>
                  <Chips recreate={podeRecriar(t)} ad={podeFazerAnuncio(t)} />{/* KINEO-ADS-NATAL-VITRINE-1011 · KINEO-ETIQUETA-UNICA-1111 */}
                <span className="kmz-shade" aria-hidden="true" />
                  <span className="kmz-copy"><b><UiLabel>{c.title}</UiLabel></b><Views video={clipeNovoVideo(c)} /></span>{/* KINEO-OUTFIT-MORPH-HOME-0911 */}
                </Link>
              )
            }
            if (t.kind === 'motion' && t.clip) { // KINEO-HOME-TOPO-CLIPES-1311 — cartão do topo = o cartão de clipe novo, grande
              const c = t.clip
              const nt: Tile = { kind: 'novo', clip: c, grande: true }
              return (
                <Link key={'topo-' + c.id} href={clipeNovoAbreStudio(c) ? filmHref : createEntryForSignupHref(viaSignup(publicRecreatePath(c.id) ?? clipeNovoDestino(c), signedIn), signedIn)} className="kmz-t kmz-big kmz-topo" data-home-cta={podeFazerAnuncio(nt) ? 'mosaic_ad' : 'mosaic_clip'} data-clip-novo={c.id} data-home-topo="1" aria-label={`${c.title} — ${c.selo ?? 'Clip'}`}>
                  <div className="kmz-md" style={focusStyle(undefined, c.focus)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={clipeNovoPoster(c)} width={540} height={960} alt="" loading="lazy" decoding="async" style={{ objectPosition: c.focus, transform: 'none' }} />
                    <WallMedia src={clipeNovoVideo(c)} />
                  </div>
                  <Chips recreate={podeRecriar(nt)} ad={podeFazerAnuncio(nt)} />
                  <span className="kmz-shade" aria-hidden="true" />
                  <span className="kmz-copy"><b><UiLabel>{c.title}</UiLabel></b><Views video={clipeNovoVideo(c)} /></span>
                </Link>
              )
            }
            if (t.kind === 'motion') return (
              <Link key={t.video} href={filmHref} className="kmz-t kmz-big" data-home-cta="mosaic_motion"
                style={t.desktopOnly ? { display: 'none' } : undefined} aria-label={t.title + ' — multi-camera'}>
                <div className="kmz-md" style={focusStyle(t.poster, t.focus)}>
                  {t.desktopVideo ? (
                    <>
                      <div className="kmz-motion-original"><WallMedia src={t.video} /></div>
                      <div className="kmz-motion-desktop" style={{ display: 'none' }}><WallMedia src={t.desktopVideo} /></div>
                    </>
                  ) : <WallMedia src={t.video} />}
                </div>
                <Chips recreate={podeRecriar(t)} />
                <span className="kmz-shade" aria-hidden="true" />
                <span className="kmz-copy"><b>{t.title}</b><Views video={t.video} /></span>
              </Link>
            )
            if (t.kind === 'film') return (
              <Link key={t.video} href={filmHref} className="kmz-t kmz-big" data-home-cta="mosaic_film" aria-label={`${t.title} — narrated film`}>
                <div className="kmz-md" style={focusStyle(t.poster, t.focus)}><WallMedia src={t.video} /></div>
                <Chips recreate={podeRecriar(t)} />
                <span className="kmz-shade" aria-hidden="true" />
                <span className="kmz-copy"><b><UiLabel>{t.title}</UiLabel></b><Views video={t.video} /></span>
              </Link>
            )
            if (t.kind === 'effect') {
              const e = t.effect
              return (
                <Link key={e.key} href={effectCardHref(e, signedIn)} className="kmz-t" data-home-cta={`mosaic_effect_${e.key}`} aria-label={`${e.title} — effect`}>
                  <div className="kmz-md" style={focusStyle(e.preview?.poster, MOSAIC_EFFECT_FOCUS[e.key] ?? '50% 45%')}>{e.preview ? <WallMedia src={`${e.preview.video}#t=1.6`} /> : null}</div>
                  <Chips novo={newKeys.has(e.key)} recreate={podeRecriar(t)} />{/* KINEO-ETIQUETA-UNICA-1111 */}
                <span className="kmz-shade" aria-hidden="true" />
                  <span className="kmz-copy"><b><UiLabel>{e.title}</UiLabel></b><Views video={e.preview?.video} /></span>
                </Link>
              )
            }
            if (t.kind === 'style') { // KINEO-MWK-MOSAICO-3110
              const st = t.style
              return (
                <Link key={'style-' + st.key} href={st.href} className="kmz-t" data-home-cta={`mosaic_style_${st.key}`} aria-label={`${st.title} — ad style`}>
                  <div className="kmz-md" style={focusStyle(st.poster ?? undefined, MOSAIC_STYLE_FOCUS[st.key] ?? '50% 45%')}><WallMedia src={st.video} /></div>
                  <Chips recreate={podeRecriar(t)} />
                <span className="kmz-shade" aria-hidden="true" />
                  <span className="kmz-copy"><b><UiLabel>{st.title}</UiLabel></b></span>
                </Link>
              )
            }
            const img = t.img
            return (
              <Link key={img.file} href="/images" className={`kmz-t ${img.w > img.h ? 'kmz-wide' : HOME_GALLERY_BIG.has(img.file) ? 'kmz-big' : ''}`} data-home-cta="mosaic_image" aria-label={`${img.alt}. Open Kineo Images`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${img.dir}${img.file}`} width={img.w} height={img.h} alt={img.alt} loading="lazy" decoding="async" style={MOSAIC_IMAGE_FOCUS[img.file] ? { objectPosition: MOSAIC_IMAGE_FOCUS[img.file] } : undefined} />{/* KINEO-ENQUADRAMENTO-0911 */}
                <span className="kmz-shade" aria-hidden="true" />
                <span className="kmz-copy"><b>{mosaicImageTitle(img.file, img.alt)}</b></span>{/* KINEO-ETIQUETA-UNICA-1111 — toda foto com nome, como os vídeos */}
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

