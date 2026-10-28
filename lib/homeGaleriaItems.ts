// KINEO-GALERIA-HOME-2710 — monta os cartões do "Made with Kineo" a partir da curadoria (lib/homeGaleria.ts) e das fontes de
// verdade que o site já serve: nenhum caminho de mídia nem selo de motor é digitado aqui.
//   · filmes  → lib/publicExamples.ts FOUNDER_SHOWCASE (dono confirmado) + engineLabelFor (o único mapa quality → motor);
//   · clipes  → lib/clips/clipTrends.ts (vitrine "Trending this week"), lib/clips/clipEffectPages.ts publicEffectPages() +
//               clipEffectEngineLabel (efeitos), lib/clips/clipCatalog.ts CLIP_ENGINES (selo dos clipes por texto);
//   · imagens → components/home/HomeImageGallery.tsx HOME_GALLERY_IMAGES (fotos da casa, servidas de public/home-images).
// Chave da curadoria que não existe mais na fonte = cartão some (nunca quadro vazio, nunca selo inventado).
import { FOUNDER_SHOWCASE } from '@/lib/publicExamples'
import { engineLabelFor } from '@/lib/engineLabel'
import { STUDIO_ENGINE_FOR_QUALITY } from '@/lib/navigation/reviewVideoRetry'
import { enginePaused, engineOffered } from '@/lib/engineLaunch'
import { CLIP_TRENDS, CLIP_TRENDS_PUBLIC } from '@/lib/clips/clipTrends'
import { publicEffectPages } from '@/lib/clips/clipEffectPages'
import { clipEffectEngineLabel } from '@/lib/clips/clipEffects'
import { CLIP_ENGINES } from '@/lib/clips/clipCatalog'
import { CLIPS_PUBLIC } from '@/lib/clips/clipLaunch'
import { faceRemixHref, hasFaceRemix } from '@/lib/clips/faceRemix' // KINEO-ROSTO-NO-CLIPE-2810
import { HOME_GALLERY_DIR, HOME_GALLERY_IMAGES } from '@/components/home/HomeImageGallery'
import {
  GALERIA_EFFECT_KEYS,
  GALERIA_FILM_IDS,
  GALERIA_IMAGE_ENGINE_LABEL,
  GALERIA_IMAGES,
  GALERIA_NEW_CLIPS,
  GALERIA_TEXT_CLIPS,
  GALERIA_TREND_KEYS,
  galeriaClipEffectHref,
  galeriaClipPromptHref,
  galeriaClipTrendHref,
  galeriaFilmHref,
  galeriaImageHref,
  galeriaMix,
  type GaleriaItem,
} from '@/lib/homeGaleria'

function clipItems(signedIn: boolean): GaleriaItem[] {
  if (!CLIPS_PUBLIC) return []
  const fresh: GaleriaItem[] = GALERIA_NEW_CLIPS.map((c) => ({
    id: c.id, kind: 'clip', title: c.title, engine: CLIP_ENGINES[c.engine].label, video: c.video, poster: c.poster,
    href: galeriaClipPromptHref(c.engine, c.prompt, signedIn),
    ...(hasFaceRemix(c.id) ? { faceHref: faceRemixHref(c.id, signedIn) } : {}), // KINEO-ROSTO-NO-CLIPE-2810 — clipe de pessoa: botão "Put your face in it"
  }))
  const trends: GaleriaItem[] = CLIP_TRENDS_PUBLIC
    ? GALERIA_TREND_KEYS.flatMap((key) => {
        const t = CLIP_TRENDS.find((x) => x.key === key)
        const engine = t ? CLIP_ENGINES[t.engine as keyof typeof CLIP_ENGINES]?.label : null
        return t && engine ? [{ id: t.key, kind: 'clip' as const, title: t.title, engine, video: t.preview.video, poster: t.preview.poster, href: galeriaClipTrendHref(t.key, signedIn) }] : []
      })
    : []
  const effects = publicEffectPages()
  const fx: GaleriaItem[] = GALERIA_EFFECT_KEYS.flatMap((key) => {
    const e = effects.find((x) => x.key === key)
    return e?.preview?.video && e.preview.poster
      ? [{ id: e.key, kind: 'clip' as const, title: e.title, engine: clipEffectEngineLabel(e), video: e.preview.video, poster: e.preview.poster, href: galeriaClipEffectHref(e.key, signedIn) }]
      : []
  })
  const text: GaleriaItem[] = GALERIA_TEXT_CLIPS.map((c) => ({
    id: c.id, kind: 'clip', title: c.title, engine: CLIP_ENGINES[c.engine].label, video: c.video, poster: c.poster,
    href: galeriaClipPromptHref(c.engine, c.prompt, signedIn), ...(c.focus ? { focus: c.focus } : {}),
  }))
  // Os novos primeiro; depois a vitrine, os efeitos e os clipes de texto, alternando para o feed não ficar em blocos.
  const rest: GaleriaItem[] = []
  const lanes = [trends, fx, text].map((l) => [...l])
  while (lanes.some((l) => l.length > 0)) for (const l of lanes) { const n = l.shift(); if (n) rest.push(n) }
  return [...fresh, ...rest]
}

function imageItems(signedIn: boolean): GaleriaItem[] {
  return GALERIA_IMAGES.flatMap(({ file, title }) => {
    const img = HOME_GALLERY_IMAGES.find((x) => x.file === file)
    return img && img.h > img.w
      ? [{ id: 'img-' + file.replace(/\.webp$/, ''), kind: 'image' as const, title, engine: GALERIA_IMAGE_ENGINE_LABEL, video: null, poster: HOME_GALLERY_DIR + img.file, href: galeriaImageHref(signedIn) }]
      : []
  })
}

function filmItems(): GaleriaItem[] {
  return GALERIA_FILM_IDS.flatMap((id) => {
    const f = FOUNDER_SHOWCASE.find((x) => x.id === id)
    const label = f ? engineLabelFor(f.engine) : null
    if (!f || !label) return []
    const key = STUDIO_ENGINE_FOR_QUALITY[f.engine] ?? null
    // Motor fora da oferta (ex.: Omni Flash) ou pausado: o selo continua o real; o Studio abre no motor padrão.
    const studioEngine = key && engineOffered(key) && !enginePaused(key) ? key : null
    return [{ id: 'film-' + f.id.slice(0, 8), kind: 'film' as const, title: f.title, engine: label, video: f.previewPath, poster: f.posterPath, href: galeriaFilmHref(f.title, studioEngine) }]
  })
}

/** Todos os cartões, já na ordem misturada do "All". */
export function galeriaItems(signedIn: boolean): GaleriaItem[] {
  return galeriaMix({ clip: clipItems(signedIn), image: imageItems(signedIn), film: filmItems() })
}
