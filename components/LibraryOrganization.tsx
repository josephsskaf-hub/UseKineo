'use client'

import { useEffect, useState } from 'react'
import ControlIcon from './ControlIcon'
import { UiLabel, useUiCopy } from './InterfaceLanguage'

// Stores only opaque asset IDs on this browser, never URLs, titles or account data.
const KEY = 'kineo:library:favorites:v1'
export type LibrarySort = 'newest' | 'oldest' | 'name'
export function libraryFormat(platform?: string | null): string {
  if (/(shorts|tiktok|reels|9:16)/i.test(platform ?? '')) return '9:16'
  if (/(youtube|landscape|16:9)/i.test(platform ?? '')) return '16:9'
  if (/(square|1:1)/i.test(platform ?? '')) return '1:1'
  if (/4:5/.test(platform ?? '')) return '4:5'
  return ''
}
export function organizeAssets<T extends { id: string }>(items: readonly T[], favorites: readonly string[], favoritesOnly: boolean, sort: LibrarySort, name: (item: T) => string): T[] {
  const result = items.filter(item => !favoritesOnly || favorites.includes(item.id))
  if (sort === 'oldest') result.reverse() // APIs supply newest first.
  if (sort === 'name') result.sort((a, b) => name(a).localeCompare(name(b)))
  return result
}
export function useLibraryOrganization() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<LibrarySort>('newest')
  useEffect(() => {
    const read = () => { try { const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]'); setFavorites(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string').slice(0, 3000) : []) } catch { setFavorites([]) } }
    read()
    window.addEventListener('storage', read)
    window.addEventListener('kineo:library-favorites', read)
    return () => { window.removeEventListener('storage', read); window.removeEventListener('kineo:library-favorites', read) }
  }, [])
  const toggle = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id].slice(-3000)
    setFavorites(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event('kineo:library-favorites')) } catch { /* Session still works when storage is unavailable. */ }
  }
  return { favorites, favoritesOnly, setFavoritesOnly, sort, setSort, toggle }
}
export function LibraryOrganization({ state }: { state: ReturnType<typeof useLibraryOrganization> }) {
  const ui = useUiCopy()
  return <div className="library-organization">
    <button type="button" aria-pressed={state.favoritesOnly} onClick={() => state.setFavoritesOnly(!state.favoritesOnly)}><ControlIcon name="star" /><UiLabel>Favorites</UiLabel></button>
    <select aria-label={ui('Sort projects')} value={state.sort} onChange={e => state.setSort(e.target.value as LibrarySort)}>
      <option value="newest">{ui('Newest first')}</option><option value="oldest">{ui('Oldest first')}</option><option value="name">{ui('Name A–Z')}</option>
    </select>
    <small><UiLabel>Favorites are saved in this browser.</UiLabel></small>
  </div>
}
export function FavoriteButton({ id, state }: { id: string; state: ReturnType<typeof useLibraryOrganization> }) {
  const ui = useUiCopy()
  return <button type="button" className="library-favorite" aria-pressed={state.favorites.includes(id)} aria-label={ui(state.favorites.includes(id) ? 'Remove from favorites' : 'Add to favorites')} onClick={() => state.toggle(id)}><ControlIcon name="star" /></button>
}
