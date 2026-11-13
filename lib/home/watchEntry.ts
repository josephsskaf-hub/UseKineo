// KINEO-WATCH-ETAPA1-1311 — public example identity travels; customer text never enters a card URL.
// Presentation only. No account, generation, request, price or storage decision belongs here.
import { CLIPES_NOVOS, clipeNovoDestino, type ClipeNovo } from '@/lib/clipesNos2Lugares'
import { viaSignup } from '@/lib/homeGaleria'
import { publicRecreatePath } from '@/lib/recreate/entry'
import { recreateFormat } from '@/lib/recreate/formats'
import { HOME_FEATURED_PLAYLISTS } from '@/lib/ui/homeFeaturedFilms'

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
    return film?.title || ''
  }
  const max = produto === 'cartoon' ? 300 : produto === 'ads' ? 1200 : 2000
  return (clip.prompt || clip.title).trim().slice(0, max)
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
  return viaSignup(publicRecreatePath(canonical.id) ?? clipeNovoDestino(canonical), signedIn)
}

export function watchClipLabel(clip: ClipeNovo): string {
  if (clip.produto === 'film') return 'Make a film'
  if (clip.produto === 'cartoon') return 'Make a cartoon'
  if (clip.produto === 'ads') return 'Make your ad'
  if (publicRecreatePath(clip.id)) return recreateFormat(clip.id)?.type === 'swap' ? 'Recreate' : 'Use effect'
  return clip.prompt ? 'Use idea' : 'Make a video'
}
