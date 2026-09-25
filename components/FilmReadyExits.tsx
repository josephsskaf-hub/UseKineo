'use client'

// KINEO-FLUXO-NOVO-2026-09-25 — Peça A (fundador, 25/09): o filme pronto termina em EXATAMENTE 3 saídas —
// próximo filme · mais créditos · assinar/trocar de plano. As decisões moram em lib/growth/filmReadyExits.ts (puras,
// testadas); aqui só se executa. Marcação simples de propósito: o Codex veste no padrão v5 (film-ready.html).
// Medição: film_ready_exits_shown quando o bloco ENTRA NA TELA (não na montagem — no celular ele fica abaixo do player)
// e film_ready_exit_clicked por saída. A barra de créditos é a MESMA de sempre (CreditsTopupModal), não uma cópia.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import CreditsTopupModal from '@/components/CreditsTopupModal'
import { createPortal } from 'react-dom'
import { trackEvent } from '@/lib/analytics'
import {
  FILM_READY_TOPUP_SURFACE,
  filmReadyCreditsExit,
  filmReadyExitClickedMetadata,
  filmReadyExitsShownMetadata,
  filmReadyNextFilmHref,
  filmReadyPlanLabel,
  filmReadyPlansHref,
  type FilmReadyExit,
} from '@/lib/growth/filmReadyExits'

export default function FilmReadyExits({ videoId, plan }: { videoId: string | null; plan: string | null }) {
  const [topupOpen, setTopupOpen] = useState(false)
  // O href do SSR é o padrão sem escolhas; no navegador ganha motor/duração/modo da URL atual.
  const [nextFilmHref, setNextFilmHref] = useState(() => filmReadyNextFilmHref(''))
  const rootRef = useRef<HTMLDivElement | null>(null)
  const shownForRef = useRef<string | null>(null)
  const creditsExit = filmReadyCreditsExit(plan)
  const plansHref = filmReadyPlansHref()

  useEffect(() => {
    setNextFilmHref(filmReadyNextFilmHref(window.location.search))
  }, [videoId])

  // Uma impressão por filme, quando o bloco aparece de verdade (≥ 50% visível).
  useEffect(() => {
    const key = videoId ?? 'sem-id'
    if (shownForRef.current === key) return
    const el = rootRef.current
    if (!el) return
    const emit = () => {
      if (shownForRef.current === key) return
      shownForRef.current = key
      void trackEvent('film_ready_exits_shown', filmReadyExitsShownMetadata({ videoId, plan }))
    }
    if (typeof IntersectionObserver === 'undefined') {
      emit()
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        emit()
        observer.disconnect()
      }
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [videoId, plan])

  const track = (exit: FilmReadyExit) => {
    void trackEvent('film_ready_exit_clicked', filmReadyExitClickedMetadata({ exit, videoId, plan }))
  }

  return (
    <>
    <div
      ref={rootRef}
      data-kineo="film-ready-exits"
      role="group"
      aria-label="What next"
      className="w-full grid grid-cols-1 gap-2 sm:grid-cols-3"
    >
      <Link
        href={nextFilmHref}
        onClick={() => track('next_film')}
        className="rounded-xl px-4 py-3 text-center text-sm font-bold"
        style={{ border: '1px solid #2b3e52', color: '#edf4fc', textDecoration: 'none' }}
      >
        Next film
      </Link>
      {creditsExit === 'topup' ? (
        <button
          type="button"
          onClick={() => {
            track('more_credits')
            setTopupOpen(true)
          }}
          className="rounded-xl px-4 py-3 text-center text-sm font-bold"
          style={{ border: '1px solid #2b3e52', color: '#edf4fc', background: 'transparent', cursor: 'pointer' }}
        >
          More credits
        </button>
      ) : (
        <a
          href={plansHref}
          onClick={() => track('more_credits')}
          className="rounded-xl px-4 py-3 text-center text-sm font-bold"
          style={{ border: '1px solid #2b3e52', color: '#edf4fc', textDecoration: 'none' }}
        >
          More credits
        </a>
      )}
      <a
        href={plansHref}
        onClick={() => track('subscribe')}
        className="rounded-xl px-4 py-3 text-center text-sm font-bold"
        style={{ border: '1px solid #2b3e52', color: '#edf4fc', textDecoration: 'none' }}
      >
        {filmReadyPlanLabel(plan)}
      </a>
    </div>
    {/* Portal no <body>: o cartão do filme pronto tem transform (animação fadeUp com fill both), que prende o
        position:fixed do modal dentro do cartão (revisão adversarial de 25/09). */}
    {topupOpen && (typeof document !== 'undefined'
      ? createPortal(<CreditsTopupModal surface={FILM_READY_TOPUP_SURFACE} onClose={() => setTopupOpen(false)} />, document.body)
      : <CreditsTopupModal surface={FILM_READY_TOPUP_SURFACE} onClose={() => setTopupOpen(false)} />)}
    </>
  )
}
