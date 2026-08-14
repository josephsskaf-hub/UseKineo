'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

interface ExampleCtaProps {
  href: string
  slug: string
  target: 'generate' | 'pricing'
  children: React.ReactNode
  secondary?: boolean
  /** Texto puro, sem moldura de botao — usado para rebaixar a oferta de preco. */
  plain?: boolean
  placement?: string
}

// KINEO-EXAMPLES-PROVA-SEM-PORTA-2026-08-14 — este componente postava direto em
// `/api/events` com um `fetch` cru, sem `session_id`. Consequencia medida hoje:
// os 16 cliques e as 153 reproducoes das paginas de exemplo nasceram ORFAOS de
// sessao (`session_id` NULL em 100% das linhas), enquanto `landing_session_started`
// tem 0% de orfandade. Toda consulta de funil da operacao agrupa por `session_id`,
// entao a superficie de MAIOR engajamento organico da casa (82% de play) aparecia
// em todo documento como "187 sessoes -> 1 video" e ninguem nunca viu o play.
//
// `trackEvent` e o unico caminho que carrega `session_id` + UTMs de first-touch.
// Os NOMES dos eventos ficam identicos de proposito: o historico desde 21/07
// continua comparavel, so passa a ser ligavel a sessao daqui para a frente.
export default function ExampleCta({
  href,
  slug,
  target,
  children,
  secondary = false,
  plain = false,
  placement = 'below_video',
}: ExampleCtaProps) {
  return (
    <Link
      href={href}
      onClick={() => {
        void trackEvent('example_watch_cta_click', {
          version: 'push31',
          example_slug: slug,
          target,
          placement,
        })
        // Mesmo nome usado por toda porta organica da casa (OrganicCtaLink), para
        // que as paginas de exemplo entrem no MESMO placar das paginas de SEO em
        // vez de viverem num evento proprio que so esta rota conhece.
        void trackEvent('organic_cta_clicked', {
          source: `example_${slug}`,
          placement,
          destination: href.split('?')[0],
        })
      }}
      className={
        plain
          ? 'text-center text-sm font-bold text-white/50 underline underline-offset-4 transition hover:text-white sm:text-left'
          : secondary
            ? 'rounded-full border border-white/15 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-white/35 hover:bg-white/5'
            : 'rounded-full bg-white px-5 py-3 text-center text-sm font-black text-black transition hover:bg-cyan-200'
      }
    >
      {children}
    </Link>
  )
}
