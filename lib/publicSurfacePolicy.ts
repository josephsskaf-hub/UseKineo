/**
 * Temporary, fail-closed privacy policy for customer renders.
 *
 * The current schema has no versioned, auditable publication/visibility field.
 * Until that durable contract exists, a completed render is private and no
 * anonymous surface may look it up or enumerate it. Static founder-owned
 * examples and founder-confirmed owned engine previews live in the two
 * explicit allowlists in `lib/publicExamples.ts`; neither path may
 * enumerate customer rows or infer publication consent from `completed`.
 */
export const CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED = false as const
