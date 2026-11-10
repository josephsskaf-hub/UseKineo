import { RECREATE_RELEASE } from './release'
import { recreateFormat } from './formats'

/** Only catalog items can become Recreate links; the switch restores all legacy destinations when closed. */
export function publicRecreatePath(id: string): string | null {
  return RECREATE_RELEASE === 'public' && recreateFormat(id) ? `/recreate/${id}` : null
}
export function recreateEntryHref(id: string, signedIn: boolean): string | null {
  const path = recreateFormat(id) ? `/recreate/${id}` : null
  return path === null ? null : signedIn ? path : '/signup?' + new URLSearchParams({ redirect: path }).toString()
}
