// Founder 10/11 morning-merge block: internal canary first. Public path is ready but disabled.
// Client-safe release configuration: keep this module separate from the internal email allowlist.
export type InternalRelease = 'off' | 'internal' | 'public'
export const RECREATE_RELEASE: InternalRelease = 'internal'
// KINEO-RECREATE-TRAVA-1011 — the page and its photo effects (RECREATE_RELEASE) open separately from the face SWAP. With
// RECREATE_RELEASE='public' and this 'internal', customers see the page with the effects and NO swap format; the house sees all.
// Even 'public' shows customers only formats with swapApproved: true (lib/recreate/formats.ts).
export const RECREATE_SWAP_RELEASE: InternalRelease = 'internal'
export const SERIES_RELEASE: InternalRelease = 'internal'
export const RECREATE_MOTION_ENABLED = false
