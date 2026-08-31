import type { AgencyDistributionEntry } from '@/lib/agencyDistribution'

export const AGENCY_BRIDGE_VISIBILITY_VERSION =
  'agency_volume_bridge_visibility_v1' as const
export const AGENCY_BRIDGE_VISIBLE_RATIO = 0.5
export const AGENCY_BRIDGE_GATE_ACTORS_PER_ENTRY = 20

export type AgencyBridgeTelemetryMetadata = {
  version: typeof AGENCY_BRIDGE_VISIBILITY_VERSION
  entry: AgencyDistributionEntry
  surface: 'agency_volume_bridge'
  destination: 'agency_packs'
}

export function agencyBridgeTelemetryMetadata(
  entry: AgencyDistributionEntry,
): AgencyBridgeTelemetryMetadata {
  return {
    version: AGENCY_BRIDGE_VISIBILITY_VERSION,
    entry,
    surface: 'agency_volume_bridge',
    destination: 'agency_packs',
  }
}

export function agencyBridgeViewMarker(entry: AgencyDistributionEntry): string {
  return `kineo:${AGENCY_BRIDGE_VISIBILITY_VERSION}:viewed:${entry}`
}
