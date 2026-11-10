// Publication candidate approved 10/11/2026. Local preparation only; apply deployment gates before shipping.
// Client-safe release configuration: keep this module separate from the internal email allowlist.
export type InternalRelease = 'off' | 'internal' | 'public'
export const RECREATE_RELEASE: InternalRelease = 'public'
export const SERIES_RELEASE: InternalRelease = 'internal'
export const RECREATE_MOTION_ENABLED = false
