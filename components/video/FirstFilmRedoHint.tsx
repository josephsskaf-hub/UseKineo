'use client'
// KINEO-REFAZER-GRATIS-2810 — a linha curta ACIMA do player do filme pronto, só no PRIMEIRO filme da conta e só enquanto
// sobra refação grátis: "Something off? Redo any scene for free on your first film." + "Pick a scene" (rola até o painel
// de miniaturas, components/video/SceneRedoPanel.tsx). A tela não decide nada: pergunta ao servidor (consulta leve do
// /api/free-redo/film) e só pinta quando ele responde first_film + free_left > 0. Volta a perguntar quando uma refação
// é entregue (o mesmo evento DOM que troca o player), para sumir quando as 2 grátis acabarem.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { FREE_REDO_FILM_PATH } from '@/lib/freeRedo/public'
import { SCENE_REDO_SWAP_EVENT, urlDeConsulta } from '@/lib/cinematic/refazerCena'
import {
  SCENE_REDO_FUNNEL_EVENTS,
  copyPrimeiroFilme,
  metaDoFunil,
  mostrarLinhaDoPrimeiroFilme,
  saldoDaResposta,
} from '@/lib/cinematic/refazerGratis2810'

export default function FirstFilmRedoHint({ videoId }: { videoId: string | null }) {
  const p = copyPrimeiroFilme(useInterfaceLanguage())
  const [mostrar, setMostrar] = useState(false)
  const [freeLeft, setFreeLeft] = useState(0)
  const vistaRef = useRef<string | null>(null)

  const perguntar = useCallback(async (vivo: () => boolean) => {
    if (!videoId) return
    try {
      const res = await fetch(urlDeConsulta(FREE_REDO_FILM_PATH, videoId, true), { cache: 'no-store' })
      const r = (await res.json()) as unknown
      if (!vivo()) return
      setMostrar(mostrarLinhaDoPrimeiroFilme(r))
      setFreeLeft(saldoDaResposta(r).freeLeft)
    } catch {
      if (vivo()) setMostrar(false)
    }
  }, [videoId])

  useEffect(() => {
    let vivo = true
    setMostrar(false)
    void perguntar(() => vivo)
    if (typeof window === 'undefined') return () => { vivo = false }
    const deNovo = () => { void perguntar(() => vivo) }
    window.addEventListener(SCENE_REDO_SWAP_EVENT, deNovo)
    return () => { vivo = false; window.removeEventListener(SCENE_REDO_SWAP_EVENT, deNovo) }
  }, [perguntar])

  useEffect(() => {
    if (!mostrar || !videoId || vistaRef.current === videoId) return
    vistaRef.current = videoId
    void trackEvent(SCENE_REDO_FUNNEL_EVENTS.offerViewed, metaDoFunil({ filmId: videoId, videoId, sceneIndex: null, firstFilm: true, freeLeft, surface: 'player_line' }))
  }, [mostrar, videoId, freeLeft])

  if (!mostrar || !videoId) return null

  const irAoPainel = () => {
    if (typeof document === 'undefined') return
    const el = document.querySelector('[data-kineo="scene-redo"]')
    if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <p
      data-kineo="first-film-redo-line"
      className="mx-auto"
      style={{ maxWidth: 'min(460px, 90vw)', margin: '10px auto 0', fontSize: '0.8rem', lineHeight: 1.4, color: 'var(--text2)', textAlign: 'center' }}
    >
      {p.line}{' '}
      <button
        type="button"
        onClick={irAoPainel}
        style={{ background: 'transparent', border: 'none', padding: 0, color: '#a78bfa', fontWeight: 800, cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline' }}
      >
        {p.action} ↓
      </button>
    </p>
  )
}
