// Founder 10/11 morning-merge block: internal canary first. Public path is ready but disabled.
// Client-safe release configuration: keep this module separate from the internal email allowlist.
export type InternalRelease = 'off' | 'internal' | 'public'
export const RECREATE_RELEASE: InternalRelease = 'internal'
export const SERIES_RELEASE: InternalRelease = 'internal'
export const RECREATE_MOTION_ENABLED = false
