import { RECREATE_RELEASE, RECREATE_SWAP_RELEASE, RECREATE_MOVIMENTO_RELEASE } from './release'
import { recreateFormat, recreateSwapPriced } from './formats'
import { RECREATE_FLOW_ENABLED } from './flowRelease'

/** Only catalog items can become Recreate links; the switch restores all legacy destinations when closed. */
export function publicRecreatePath(id: string): string | null {
  const f = recreateFormat(id)
  // KINEO-RECREATE-TRAVA-1011 — a public link to a SWAP needs the swap switch public AND the format approved and priced.
  // KINEO-RECREATE-MOVIMENTO-1411 — o movimento só ganha link público com o interruptor dele 'public' E o molde aprovado (nunca pela regra do efeito).
  const open = !!f && (f.type === 'motion' ? RECREATE_MOVIMENTO_RELEASE === 'public' && f.movimentoAprovado === true && recreateSwapPriced(f)
    : f.type !== 'swap' || (RECREATE_SWAP_RELEASE === 'public' && f.swapApproved === true && recreateSwapPriced(f)))
  return RECREATE_RELEASE === 'public' && open ? `/recreate/${id}` : null
}
export function recreateEntryHref(id: string, signedIn: boolean): string | null {
  const path = recreateFormat(id) ? `/recreate/${id}` : null
  return path === null ? null : signedIn || (RECREATE_FLOW_ENABLED && publicRecreatePath(id)) ? path : '/signup?' + new URLSearchParams({ redirect: path }).toString()
}
