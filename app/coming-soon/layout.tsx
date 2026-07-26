import type { Metadata } from 'next'

// PUSH #92 — P0 canonical bug: /coming-soon is a 'use client' page and
// cannot export its own `metadata`, so it shallow-merged the root layout's
// canonical (the homepage). Mirrors the existing app/(auth)/layout.tsx
// pattern used for the same client-page-metadata problem.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
}

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return children
}
