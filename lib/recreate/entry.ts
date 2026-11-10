import { RECREATE_RELEASE, RECREATE_SWAP_RELEASE } from './release'
import { recreateFormat, recreateSwapPriced } from './formats'

/** Only catalog items can become Recreate links; the switch restores all legacy destinations when closed. */
export function publicRecreatePath(id: string): string | null {
  const f = recreateFormat(id)
  // KINEO-RECREATE-TRAVA-1011 — a public link to a SWAP needs the swap switch public AND the format approved and priced.
  const open = !!f && (f.type !== 'swap' || (RECREATE_SWAP_RELEASE === 'public' && f.swapApproved === true && recreateSwapPriced(f)))
  return RECREATE_RELEASE === 'public' && open ? `/recreate/${id}` : null
}
export function recreateEntryHref(id: string, signedIn: boolean): string | null {
  const path = recreateFormat(id) ? `/recreate/${id}` : null
  return path === null ? null : signedIn ? path : '/signup?' + new URLSearchParams({ redirect: path }).toString()
}
