// KINEO-WATCH-ETAPA1-1311 — public example identity travels; customer text never enters a card URL.
// Presentation only. No account, generation, request, price or storage decision belongs here.
import { CLIPES_NOVOS, clipeNovoDestino, type ClipeNovo } from '@/lib/clipesNos2Lugares'
import { viaSignup } from '@/lib/homeGaleria'
import { publicRecreatePath } from '@/lib/recreate/entry'
import { recreateFormat } from '@/lib/recreate/formats'
import { HOME_FEATURED_PLAYLISTS } from '@/lib/ui/homeFeaturedFilms'
import { seuVideoCatalogItem } from '@/lib/recreate/seuVideoCatalog'
import { SEU_VIDEO_PREVIEW_ENABLED, SEU_VIDEO_PREVIEW_PATH } from '@/lib/recreate/seuVideoPreviewRelease'
import { SEU_VIDEO_RELEASE } from '@/lib/recreate/seuVideoRelease'
import { WATCH_PUBLIC_STARTERS } from './watchStarters'

export const WATCH_FEATURED_FILMS = HOME_FEATURED_PLAYLISTS.flat().slice(0, 6)
export function watchFilmExampleHref(id: string): string {
  return '/studio?' + new URLSearchParams({intent_campaign:'home_card',example:'home-'+id}).toString()
}

export type WatchProduct = 'film' | 'cartoon' | 'ads'

/** Reject unknown/repeated IDs and examples from another product; no text supplied by the URL becomes a seed. */
export function watchExample(example: unknown, produto: WatchProduct): ClipeNovo | null {
  if (typeof example !== 'string') return null
  return CLIPES_NOVOS.find(clip => clip.id === example && clip.produto === produto) ?? null
}

/** A public starter, never a claim that this exact manually produced video can be reproduced. */
export function watchExampleIdea(example: unknown, produto: WatchProduct): string {
  const clip = watchExample(example, produto)
  if (!clip) {
    const film = produto==='film' && typeof example==='string'
      ? WATCH_FEATURED_FILMS.find(f=>'home-'+f.id===example) : null
    return film ? (WATCH_PUBLIC_STARTERS['home-' + film.id] || film.title) : ''
  }
  const max = produto === 'cartoon' ? 300 : produto === 'ads' ? 1200 : 2000
  return (clip.prompt || WATCH_PUBLIC_STARTERS[clip.id] || clip.title).trim().slice(0, max)
}

/** Presentation-only entry; generation eligibility and costs remain enforced by the destination/server. */
function watchRecreatePath(id: string): string | null {
  return SEU_VIDEO_RELEASE === 'public' && SEU_VIDEO_PREVIEW_ENABLED && seuVideoCatalogItem(id)
    ? SEU_VIDEO_PREVIEW_PATH + '?' + new URLSearchParams({ example: id }).toString()
    : null
}

/** A draft or an explicit arrival idea always wins. Safe for React's functional setters. */
export function watchExampleText(current: string, example: unknown, produto: WatchProduct): string {
  return current.trim() ? current : watchExampleIdea(example, produto)
}

export function watchClipHref(clip: ClipeNovo, signedIn = false): string {
  const canonical = CLIPES_NOVOS.find(item => item.id === clip.id)
  if (!canonical) return '/recreate'
  if (canonical.produto === 'film') return '/studio?' + new URLSearchParams({ intent_campaign: 'home_card', example: canonical.id }).toString()
  if (canonical.produto === 'cartoon') return '/kids-cartoon?' + new URLSearchParams({ utm_source: 'home_card', example: canonical.id }).toString()
  if (canonical.produto === 'ads') return '/ads/v2?' + new URLSearchParams({ entry: canonical.adsEntry ?? 'product', utm_source: 'home_card', example: canonical.id }).toString()
  const recreate = watchRecreatePath(canonical.id)
  if (recreate) return recreate
  const publicPath = publicRecreatePath(canonical.id)
  if (publicPath) return publicPath
  return viaSignup(clipeNovoDestino(canonical), signedIn)
}

export function watchClipLabel(clip: ClipeNovo): string {
  const canonical = CLIPES_NOVOS.find(item => item.id === clip.id)
  if (!canonical) return 'Make a video'
  if (canonical.produto === 'film') return 'Make a film'
  if (canonical.produto === 'cartoon') return 'Make a cartoon'
  if (canonical.produto === 'ads') return 'Make your ad'
  if (watchRecreatePath(canonical.id)) return 'Recreate'
  if (publicRecreatePath(canonical.id)) return recreateFormat(canonical.id)?.type === 'effect' ? 'Use effect' : 'Recreate' // KINEO-RECREATE-MOVIMENTO-1411 — era: type === 'swap' ? 'Recreate' : 'Use effect' (o movimento também é 'Recreate')
  return canonical.prompt ? 'Use idea' : 'Make a video'
}
