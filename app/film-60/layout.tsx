import type { Metadata } from 'next'

// KINEO-VERSAO-60S-2026-10-13 — /film-60 é uma ponte transitória (e-mail → checkout), 'use client' sem metadata própria.
// Mesmo padrão de app/checkout/layout.tsx: noindex, para não herdar o canonical da home.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function Film60Layout({ children }: { children: React.ReactNode }) {
  return children
}
