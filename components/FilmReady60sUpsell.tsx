'use client'

// KINEO-VERSAO-60S-2026-10-13 — o bloco "Make the 60-second version of this film", logo abaixo do download do filme
// pronto (deliver-first intacto: o arquivo vem antes). Quem decide se aparece, o link, o preço e a volta é
// lib/growth/filmReady60s.ts (puro, com guardião); aqui só se executa.
// · Impressão (film_ready_60s_upsell_shown) quando o bloco ENTRA NA TELA (≥ 50% visível), uma vez por filme.
// · Clique (film_ready_60s_upsell_clicked) grava o bilhete da volta na sessionStorage ANTES de a navegação seguir para
//   o checkout do Creator mensal. Sem o bilhete (storage bloqueado) a compra continua igual; só a volta não preenche.
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import {
  FILM60_CLICKED_EVENT,
  FILM60_HANDOFF_KEY,
  FILM60_SHOWN_EVENT,
  film60CheckoutHref,
  film60Copy,
  film60ShownMetadata,
  serializeFilm60Handoff,
} from '@/lib/growth/filmReady60s'

export default function FilmReady60sUpsell({
  videoId,
  plan,
  seconds,
  prompt,
}: {
  videoId: string | null
  plan: string | null
  seconds: number | null
  /** O texto do filme que acabou de sair (o roteiro limpo da caixa). Vai para o bilhete, nunca para a URL. */
  prompt: string
}) {
  const language = useInterfaceLanguage()
  const copy = film60Copy(language)
  const href = film60CheckoutHref()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const shownForRef = useRef<string | null>(null)

  useEffect(() => {
    const key = videoId ?? 'sem-id'
    if (shownForRef.current === key) return
    const el = rootRef.current
    if (!el) return
    const emit = () => {
      if (shownForRef.current === key) return
      shownForRef.current = key
      void trackEvent(FILM60_SHOWN_EVENT, film60ShownMetadata({ videoId, plan, surface: 'film_ready', seconds }))
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
  }, [videoId, plan, seconds])

  const onClick = () => {
    try {
      sessionStorage.setItem(FILM60_HANDOFF_KEY, serializeFilm60Handoff({ prompt, videoId, surface: 'film_ready', at: Date.now() }))
    } catch { /* storage bloqueado: a compra segue; a volta abre o Studio em 60 s sem o texto */ }
    void trackEvent(FILM60_CLICKED_EVENT, {
      ...film60ShownMetadata({ videoId, plan, surface: 'film_ready', seconds }),
      prompt_words: prompt.trim() ? prompt.trim().split(/\s+/).length : 0,
    })
  }

  return (
    <div
      ref={rootRef}
      data-kineo="film-ready-60s-upsell"
      className="w-full rounded-2xl px-5 py-4"
      style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', boxShadow: 'var(--sh-card)' }}
    >
      <p className="font-black tracking-tight" style={{ margin: 0, fontSize: '1.02rem', color: 'var(--text)', lineHeight: 1.3 }}>
        {copy.title}
      </p>
      <p style={{ margin: '6px 0 12px', fontSize: '0.78rem', color: 'var(--muted2)', lineHeight: 1.5 }}>
        {copy.subtitle}
      </p>
      <a
        href={href}
        onClick={onClick}
        className="flex w-full items-center justify-center rounded-xl px-5 py-3 text-center text-sm font-black"
        style={{ background: 'var(--accent)', color: 'var(--on-accent)', textDecoration: 'none', boxShadow: 'var(--sh-card)' }}
      >
        {copy.button}
      </a>
    </div>
  )
}
