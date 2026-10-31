'use client'

// KINEO-PUBLICAR-GANHAR-3110 — "Publish your film — get 10 credits each time someone makes their own version".
// O cartão da tela de filme pronto. Nada fica público sem o CLIQUE da pessoa: montar o cartão só registra que ele foi
// visto (publish_cta_shown); o botão registra o clique (publish_cta_clicked) e chama a rota de visibilidade que já existe
// (POST /api/video/visibility, dono logado, compare-and-set, grava video_published_v1 com source 'publish_earn' — o fato
// "filme publicado" é do servidor). Publicado, o cartão mostra o link /v/<id> com Copiar e Compartilhar.
// Quem paga os créditos é o cron /api/cron/remix-reward (lib/publicarGanhar3110Server.ts), nunca esta tela.
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { buildPublishedVideoSharePath } from '@/lib/videoShare'
import { PUBLICAR_GANHAR_3110_VERSION, PUBLISH_EARN_COPY as C, PUBLISH_EARN_SOURCE } from '@/lib/publicarGanhar3110'

export default function PublishEarnCta(props: {
  videoId: string
  published: boolean
  onPublished: () => void
  referralCode?: string | null
}) {
  const { videoId, published } = props
  const [state, setState] = useState<'idle' | 'publishing' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const shownRef = useRef<string | null>(null)

  useEffect(() => {
    if (shownRef.current === videoId) return
    shownRef.current = videoId
    void trackEvent('publish_cta_shown', { video_id: videoId, already_published: published, version: PUBLICAR_GANHAR_3110_VERSION })
    // published entra só como contexto da 1ª impressão deste filme
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])
  useEffect(() => { setState('idle'); setCopied(false) }, [videoId])

  const path = buildPublishedVideoSharePath(videoId, props.referralCode) ?? `/v/${videoId}`
  const url = typeof window === 'undefined' ? path : new URL(path, window.location.origin).toString()

  async function publish() {
    if (state === 'publishing' || published) return
    setState('publishing')
    void trackEvent('publish_cta_clicked', { video_id: videoId, version: PUBLICAR_GANHAR_3110_VERSION })
    try {
      const res = await fetch('/api/video/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'publish', source: PUBLISH_EARN_SOURCE }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setState('idle')
      props.onPublished()
    } catch {
      setState('error')
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
      void trackEvent('publish_cta_link_copied', { video_id: videoId, version: PUBLICAR_GANHAR_3110_VERSION })
    } catch { /* sem área de transferência: o link continua visível para copiar à mão */ }
  }

  async function share() {
    void trackEvent('publish_cta_shared', { video_id: videoId, version: PUBLICAR_GANHAR_3110_VERSION })
    try {
      if (navigator.share) { await navigator.share({ title: 'Made with Kineo', text: 'I made this film with AI — make your own version:', url }); return }
      await copy()
    } catch { /* cancelado pela pessoa */ }
  }

  const btn = { borderRadius: 12, padding: '12px 16px', fontSize: '0.9rem', fontWeight: 900, cursor: 'pointer' } as const

  return (
    <div
      data-publicar-ganhar={PUBLICAR_GANHAR_3110_VERSION}
      className="w-full rounded-2xl px-5 py-5"
      style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', boxShadow: 'var(--sh-card)' }}
    >
      <div className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: 'var(--accent)' }}>{C.eyebrow}</div>
      <h3 className="mt-1.5 font-black tracking-tight" style={{ color: 'var(--text)', fontSize: '1.12rem', lineHeight: 1.25 }}>
        {published ? C.live : C.headline}
      </h3>
      <p className="mt-2 text-xs" style={{ color: 'var(--muted2)', lineHeight: 1.5 }}>{published ? C.liveBody : C.body}</p>

      {published ? (
        <>
          <div
            className="mt-3 truncate rounded-xl px-3 py-2.5 text-xs font-bold"
            style={{ background: 'var(--card2)', border: '1px solid var(--border2)', color: 'var(--text)' }}
            title={url}
          >
            {url}
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={share} className="flex-1" style={{ ...btn, background: 'var(--accent)', color: 'var(--on-accent)', border: '1px solid var(--border)' }}>
              ↗ Share
            </button>
            <button type="button" onClick={copy} className="flex-1" style={{ ...btn, background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border2)' }}>
              {copied ? '✓ Link copied' : '⧉ Copy link'}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={publish}
          disabled={state === 'publishing'}
          className="mt-3 w-full"
          style={{ ...btn, background: 'var(--accent)', color: 'var(--on-accent)', border: '1px solid var(--border)', cursor: state === 'publishing' ? 'wait' : 'pointer', opacity: state === 'publishing' ? 0.7 : 1 }}
        >
          {state === 'publishing' ? C.publishing : C.button}
        </button>
      )}
      <p className="mt-2 text-center" aria-live="polite" style={{ color: 'var(--muted)', fontSize: '0.64rem', lineHeight: 1.4 }}>
        {state === 'error' ? C.error : published ? 'You can make it private again anytime in My Videos.' : C.fine}
      </p>
    </div>
  )
}
