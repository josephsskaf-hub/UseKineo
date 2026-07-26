import type { Metadata } from 'next'

// PUSH #92 — P0 canonical bug: /checkout/cancelled and /checkout/success are
// both 'use client' pages, so neither can export its own `metadata`. Without
// this layout they shallow-merged the root layout's canonical (the
// homepage). These are transient, non-indexable post-checkout states (also
// already disallowed for crawling via the '/checkout/' rule in
// app/robots.ts) — noindex here mirrors the existing app/(auth)/layout.tsx
// pattern used for the same client-page-metadata problem.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
