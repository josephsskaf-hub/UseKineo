'use client'

// KINEO-FLUXO-NOVO-2026-09-25 — Peça A (fundador, 25/09): o filme pronto termina em EXATAMENTE 3 saídas —
// próximo filme · mais créditos · assinar/trocar de plano. As decisões moram em lib/growth/filmReadyExits.ts (puras,
// testadas); aqui só se executa. Marcação simples de propósito: o Codex veste no padrão v5 (film-ready.html).
// Medição: film_ready_exits_shown quando o bloco ENTRA NA TELA (não na montagem)
// e film_ready_exit_clicked por saída. A barra de créditos é a MESMA de sempre (CreditsTopupModal), não uma cópia.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BuyCreditsModal, BUY_CREDITS_OPENED_EVENT, TopupOuRecargaModal, useRecargaEntrada } from '@/components/billing/BuyCreditsEntry' // KINEO-RECARGA-TELAS-1211 — assinante sem saldo: a barra da recarga
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
  type FilmReadyDestination,
  type FilmReadyExit,
} from '@/lib/growth/filmReadyExits'

export default function FilmReadyExits({ videoId, plan }: { videoId: string | null; plan: string | null }) {
  const [topupOpen, setTopupOpen] = useState(false)
  // KINEO-FILME-PRONTO-RECARGA-2311 [dono 12/11: "quero TODOS que são sub podendo comprar"; 23/11: recarga SÓ para assinante] —
  // quem decide é o SERVIDOR (GET da recarga, superfície film_ready; grava recarga_assinante_shown UMA vez, aqui). Com oferta, "More
  // credits" abre a barra da recarga com a oferta já lida (sem 2ª leitura). Sem oferta, lendo, ou leitura que falhou: o link de sempre.
  const recarga = useRecargaEntrada(FILM_READY_TOPUP_SURFACE)
  const [recargaOpen, setRecargaOpen] = useState(false)
  // O href do SSR é o padrão sem escolhas; no navegador ganha motor/duração/modo da URL atual.
  const [nextFilmHref, setNextFilmHref] = useState(() => filmReadyNextFilmHref(''))
  const rootRef = useRef<HTMLDivElement | null>(null)
  const shownForRef = useRef<string | null>(null)
  const creditsExit = filmReadyCreditsExit(plan)
  const plansHref = filmReadyPlansHref()
  const actionClass = 'flex min-h-[44px] items-center justify-center rounded-lg px-2 py-2 text-center text-sm font-bold leading-tight'

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

  const track = (exit: FilmReadyExit, destination?: FilmReadyDestination) => {
    void trackEvent('film_ready_exit_clicked', filmReadyExitClickedMetadata({ exit, videoId, plan, destination }))
  }

  return (
    <>
    <div
      ref={rootRef}
      data-kineo="film-ready-exits"
      role="group"
      aria-label="What next"
      className="mt-2 grid w-full grid-cols-3 gap-2"
    >
      <Link
        href={nextFilmHref}
        onClick={() => track('next_film')}
        className={actionClass}
        style={{ border: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none' }}
      >
        Next film
      </Link>
      {recarga ? (
        <button
          type="button"
          data-kineo="film-ready-recarga"
          onClick={() => {
            track('more_credits', 'topup_modal')
            void trackEvent(BUY_CREDITS_OPENED_EVENT, { surface: FILM_READY_TOPUP_SURFACE })
            setRecargaOpen(true)
          }}
          className={actionClass}
          style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'transparent', cursor: 'pointer' }}
        >
          More credits
        </button>
      ) : creditsExit === 'topup' ? (
        <button
          type="button"
          onClick={() => {
            track('more_credits')
            setTopupOpen(true)
          }}
          className={actionClass}
          style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'transparent', cursor: 'pointer' }}
        >
          More credits
        </button>
      ) : (
        <a
          href={plansHref}
          onClick={() => track('more_credits', 'pricing')}
          className={actionClass}
          style={{ border: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none' }}
        >
          More credits
        </a>
      )}
      <a
        href={plansHref}
        onClick={() => track('subscribe')}
        className={actionClass}
        style={{ border: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none' }}
      >
        {filmReadyPlanLabel(plan)}
      </a>
    </div>
    {/* Portal no <body>: o cartão do filme pronto tem transform (animação fadeUp com fill both), que prende o
        position:fixed do modal dentro do cartão (revisão adversarial de 25/09). */}
    {topupOpen && (typeof document !== 'undefined'
      ? createPortal(<TopupOuRecargaModal surface={FILM_READY_TOPUP_SURFACE} onClose={() => setTopupOpen(false)} />, document.body)
      : <TopupOuRecargaModal surface={FILM_READY_TOPUP_SURFACE} onClose={() => setTopupOpen(false)} />)}
    {/* A barra da recarga: BuyCreditsModal já vai por portal no <body> sozinho (o mesmo motivo do transform acima). */}
    {recargaOpen && recarga ? <BuyCreditsModal offer={recarga} surface={FILM_READY_TOPUP_SURFACE} onClose={() => setRecargaOpen(false)} /> : null}
    </>
  )
}
