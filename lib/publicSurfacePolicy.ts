/**
 * Temporary, fail-closed privacy policy for customer renders.
 *
 * The current schema has no versioned, auditable publication/visibility field.
 * Until that durable contract exists, a completed render is private and no
 * anonymous surface may look it up or enumerate it. Static founder-owned
 * examples live in `lib/publicExamples.ts` and do not pass through this policy.
 */
export const CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED = false as const
