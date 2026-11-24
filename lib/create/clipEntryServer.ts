import type { InternalRelease } from '@/lib/recreate/release'
import { parse } from './entry'
import { clipNaMolduraVisivel } from './clipNaMoldura'
import { CLIP_TAB_HREF, LEGACY_CLIPS_PATH } from './clipNaMolduraRelease'

export function clipEntryHref(legacyHref: string, email: string | null | undefined, release?: InternalRelease): string {
  if (!clipNaMolduraVisivel(email, release)) return legacyHref
  const u = parse(legacyHref)
  if (!u || u.pathname !== LEGACY_CLIPS_PATH) return legacyHref
  return CLIP_TAB_HREF + u.search
}
