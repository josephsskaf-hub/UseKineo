import type { AgencyDistributionEntry } from '@/lib/agencyDistribution'

export const HOME_B2B_BRIDGE_VISIBILITY_VERSION = 'home_b2b_bridge_visibility_v1' as const
export const HOME_B2B_BRIDGE_VISIBLE_RATIO = 0.5
export const HOME_B2B_BRIDGE_GATE_PEOPLE = 20

export type HomeB2bBridgeMetadata = {
  version: typeof HOME_B2B_BRIDGE_VISIBILITY_VERSION
  entry: 'home'
  surface: 'home'
}

/**
 * Only the home placement belongs to this experiment. Other callers keep the
 * exact link and presentation they had before, without contaminating its gate.
 */
export function homeB2bBridgeMetadata(
  entry: AgencyDistributionEntry,
): HomeB2bBridgeMetadata | null {
  if (entry !== 'home') return null
  return {
    version: HOME_B2B_BRIDGE_VISIBILITY_VERSION,
    entry: 'home',
    surface: 'home',
  }
}

export function homeB2bBridgeViewMarker(entry: AgencyDistributionEntry): string | null {
  if (entry !== 'home') return null
  return `kineo:${HOME_B2B_BRIDGE_VISIBILITY_VERSION}:viewed:${entry}`
}
