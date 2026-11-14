import { INTERNAL_EXACT_EMAILS } from '@/lib/internalAccounts'

import { RECREATE_RELEASE, RECREATE_SWAP_RELEASE, SERIES_RELEASE, RECREATE_MOVIMENTO_RELEASE, type InternalRelease } from './release'
import { RECREATE_FORMATS, recreateSwapPriced, type RecreateFormat } from './formats'
export { RECREATE_RELEASE, RECREATE_SWAP_RELEASE, SERIES_RELEASE, RECREATE_MOTION_ENABLED, RECREATE_MOVIMENTO_RELEASE, type InternalRelease } from './release'

// Visibility only: recreateSession still requires an authenticated user for every API and private asset.
// Metric exclusion patterns such as test% are NOT an authorization allowlist in internal mode.
export function releaseVisible(email: string | null | undefined, release: InternalRelease): boolean {
  return release === 'public' || (release === 'internal' && !!email && INTERNAL_EXACT_EMAILS.includes(email.trim().toLowerCase()))
}
export const recreateVisible = (email?: string | null) => releaseVisible(email, RECREATE_RELEASE)
export const seriesVisible = (email?: string | null) => releaseVisible(email, SERIES_RELEASE)

/**
 * KINEO-RECREATE-TRAVA-1011 — may this account see (and request) this catalog format? Effects follow the page switch. A swap needs
 * swapApproved + an approved tariff + the SWAP switch; a swap still in test is seen only by the exact house allowlist.
 */
export function recreateFormatVisible(f: RecreateFormat, email: string | null | undefined): boolean {
  if (!releaseVisible(email, RECREATE_RELEASE)) return false
  // KINEO-RECREATE-MOVIMENTO-1411 — o movimento NUNCA cai na regra do efeito (que mostra a todos): ao público só com o interruptor 'public' E o molde
  // aprovado; sem aprovação, só a allowlist exata da casa, e nada com o interruptor 'off'. Sempre com tarifa da tabela.
  if (f.type === 'motion') return recreateSwapPriced(f) && RECREATE_MOVIMENTO_RELEASE !== 'off' && (f.movimentoAprovado === true ? releaseVisible(email, RECREATE_MOVIMENTO_RELEASE) : releaseVisible(email, 'internal'))
  if (f.type !== 'swap') return true
  if (f.swapApproved === true && recreateSwapPriced(f) && releaseVisible(email, RECREATE_SWAP_RELEASE)) return true
  return f.swapInTest === true && RECREATE_SWAP_RELEASE !== 'off' && releaseVisible(email, 'internal')
}
export const visibleRecreateFormats = (email: string | null | undefined) => RECREATE_FORMATS.filter(f => recreateFormatVisible(f, email))
