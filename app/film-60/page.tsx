'use client'

// KINEO-VERSAO-60S-2026-10-13 — a ponte do e-mail "seu filme está pronto" para a versão de 60 s.
// O e-mail não pode gravar a sessionStorage da aba que vai comprar; esta página faz isso: lê ?v=<id do filme>, pede à
// lista da PRÓPRIA conta (/api/videos, sessão do cookie; outra conta não enxerga o filme) o título daquele filme, grava o
// bilhete da volta (lib/growth/filmReady60s.ts) e segue para o checkout do Creator mensal com intent_campaign do e-mail.
// O texto nunca viaja na URL do e-mail — só o id. Sem login / filme não achado / rede caída: o bilhete vai sem texto e
// a volta abre o Studio em Seedance · 60 s · Let AI structure com a caixa vazia. Nada é gerado aqui nem na volta.
import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  FILM60_CLICKED_EVENT,
  FILM60_EMAIL_CAMPAIGN,
  FILM60_HANDOFF_KEY,
  film60CheckoutHref,
  film60ShownMetadata,
  serializeFilm60Handoff,
} from '@/lib/growth/filmReady60s'

const VIDEO_ID = /^[A-Za-z0-9-]{1,64}$/

async function titleOfOwnFilm(videoId: string): Promise<string> {
  try {
    const res = await fetch('/api/videos?limit=100', { cache: 'no-store', signal: AbortSignal.timeout(4_000) })
    if (!res.ok) return ''
    const data = (await res.json()) as { videos?: Array<{ id?: unknown; title?: unknown }> }
    const found = (data.videos ?? []).find((v) => v && v.id === videoId)
    const title = typeof found?.title === 'string' ? found.title.trim() : ''
    return title === 'Untitled Short' ? '' : title
  } catch {
    return ''
  }
}

export default function Film60Bridge() {
  useEffect(() => {
    let alive = true
    const raw = new URLSearchParams(window.location.search).get('v') ?? ''
    const videoId = VIDEO_ID.test(raw) ? raw : null
    void (async () => {
      const prompt = videoId ? await titleOfOwnFilm(videoId) : ''
      if (!alive) return
      try {
        sessionStorage.setItem(FILM60_HANDOFF_KEY, serializeFilm60Handoff({ prompt, videoId, surface: 'email', at: Date.now() }))
      } catch { /* sem storage: a compra segue igual */ }
      void trackEvent(FILM60_CLICKED_EVENT, {
        ...film60ShownMetadata({ videoId, plan: null, surface: 'email', seconds: null }),
        prompt_found: Boolean(prompt),
      })
      window.location.replace(film60CheckoutHref(FILM60_EMAIL_CAMPAIGN))
    })()
    return () => { alive = false }
  }, [])

  return (
    <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)', color: 'var(--text)' }}>
      <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Opening secure checkout…</p>
    </main>
  )
}
