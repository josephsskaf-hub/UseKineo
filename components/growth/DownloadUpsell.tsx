'use client'
// KINEO-DOWNLOAD-OFERTA-2810 — o cartão "Remove watermark + HD" que nasce NO clique do download, e o botão
// "Make it HD" (o ✨ Enhance de sempre) para filme limpo de quem pagou. Decisões e copy: lib/growth/downloadUpsell.ts.
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  DOWNLOAD_UPSELL_VERSION,
  MAKE_IT_HD_COST,
  type DownloadUpsellCopy,
  type DownloadUpsellOption,
  type DownloadUpsellSurface,
} from '@/lib/growth/downloadUpsell'
// KINEO-AVULSO-GARANTIA-2810 — "refazemos ou devolvemos" sob os botões de compra (fonte única, pt/es onde a tela localiza).
import { firstFilmGuarantee } from '@/lib/growth/firstFilmGuarantee'

// Uma impressão por filme+superfície por carregamento de página (remontar o nó não conta de novo).
const viewedKeys = new Set<string>()

export function DownloadUpsellCard({
  copy,
  surface,
  videoId,
  thisFilm,
  pending,
  pendingOption,
  error,
  onBuy,
  onBuyOneTime,
  onDismiss,
  extra,
  lang,
}: {
  copy: DownloadUpsellCopy
  surface: DownloadUpsellSurface
  videoId: string | null
  thisFilm: boolean
  pending: boolean
  /** KINEO-AVULSO-GARANTIA-2810 — qual dos dois botões está abrindo a Stripe (o texto de espera vai só nele). */
  pendingOption?: DownloadUpsellOption | null
  error?: string | null
  onBuy: () => void
  /** KINEO-AVULSO-GARANTIA-2810 — o passe avulso (?pack=starter&return=wm). */
  onBuyOneTime: () => void
  onDismiss: () => void
  extra?: Record<string, unknown>
  /** Língua da tela, só para a frase da garantia (a copy já chega localizada). */
  lang?: string
}) {
  useEffect(() => {
    const key = `${surface}:${videoId ?? 'sem-id'}`
    if (viewedKeys.has(key)) return
    viewedKeys.add(key)
    void trackEvent('download_upsell_viewed', {
      version: DOWNLOAD_UPSELL_VERSION,
      surface,
      video_id: videoId,
      this_film: thisFilm,
      ...(extra ?? {}),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface, videoId])

  return (
    <div
      role="region"
      aria-label="Remove watermark and make it HD"
      data-download-upsell={DOWNLOAD_UPSELL_VERSION}
      data-download-upsell-surface={surface}
      style={{
        width: '100%',
        marginTop: 10,
        padding: '12px 12px 10px',
        borderRadius: 14,
        background: 'var(--card)',
        border: '1px solid var(--accent)',
        boxShadow: 'var(--sh-card)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.02em' }}>{copy.eyebrow}</div>
      <div style={{ marginTop: 4, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>{copy.title}</div>
      <button
        type="button"
        onClick={onBuy}
        disabled={pending}
        data-download-upsell-cta="plan"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: '100%', marginTop: 9, padding: '11px 12px', borderRadius: 11, border: '2px solid var(--accent)',
          background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 900, fontSize: '0.9rem',
          cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.7 : 1,
        }}
      >
        <span>{pending && pendingOption !== 'one_time' ? copy.pending : copy.button}</span>
        <span style={{ marginTop: 3, fontSize: '0.66rem', fontWeight: 700, lineHeight: 1.4 }}>{copy.sub}</span>
      </button>
      {/* KINEO-AVULSO-GARANTIA-2810 — a segunda opção, do MESMO tamanho e peso: só este filme, pagamento único. */}
      <button
        type="button"
        onClick={onBuyOneTime}
        disabled={pending}
        data-download-upsell-cta="one_time"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: '100%', marginTop: 8, padding: '11px 12px', borderRadius: 11, border: '2px solid var(--accent)',
          background: 'transparent', color: 'var(--text)', fontWeight: 900, fontSize: '0.9rem',
          cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.7 : 1,
        }}
      >
        <span>{pending && pendingOption === 'one_time' ? copy.pending : copy.oneTimeButton}</span>
        <span style={{ marginTop: 3, fontSize: '0.66rem', fontWeight: 700, lineHeight: 1.4, color: 'var(--muted)' }}>{copy.oneTimeSub}</span>
      </button>
      <p data-first-film-guarantee="1" style={{ margin: '7px 0 0', fontSize: '0.68rem', fontWeight: 600, lineHeight: 1.4, color: 'var(--muted)' }}>
        {firstFilmGuarantee(lang)}
      </p>
      {error ? (
        <p role="alert" style={{ margin: '6px 0 0', fontSize: '0.72rem', fontWeight: 600, color: 'var(--danger)' }}>{error}</p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          void trackEvent('download_upsell_dismissed', { version: DOWNLOAD_UPSELL_VERSION, surface, video_id: videoId, this_film: thisFilm })
          onDismiss()
        }}
        style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
      >
        {copy.dismiss}
      </button>
    </div>
  )
}

type HdState = 'idle' | 'starting' | 'processing' | 'done' | 'no_credits' | 'error'

/** "Make it HD" — o mesmo POST/GET de /api/enhance que o card do /history usa (Topaz, 10 créditos, idempotente). */
export function MakeItHdButton({ videoId, surface }: { videoId: string; surface: string }) {
  const [state, setState] = useState<HdState>('idle')
  const [hdUrl, setHdUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const viewedRef = useRef<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (viewedRef.current === videoId) return
    viewedRef.current = videoId
    void trackEvent('make_it_hd_viewed', { version: DOWNLOAD_UPSELL_VERSION, surface, video_id: videoId })
  }, [videoId, surface])

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current) }, [])

  function poll(attempt: number) {
    if (attempt > 90) return // ~12 min nesta aba; o HD continua e aparece na Library
    pollRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/enhance?videoId=${encodeURIComponent(videoId)}`, { cache: 'no-store' })
        const d = await r.json().catch(() => null) as { status?: string; url?: string; error?: string } | null
        if (d?.status === 'done' && d.url) { setHdUrl(d.url); setState('done'); return }
        if (d?.status === 'processing') { poll(attempt + 1); return }
        setState('error'); setMessage(d?.error ?? 'HD failed — credits refunded.')
      } catch { poll(attempt + 1) }
    }, 8000)
  }

  async function start() {
    if (state === 'starting' || state === 'processing') return
    void trackEvent('make_it_hd_clicked', { version: DOWNLOAD_UPSELL_VERSION, surface, video_id: videoId })
    setState('starting'); setMessage(null)
    try {
      const res = await fetch('/api/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId }) })
      const d = await res.json().catch(() => null) as { status?: string; url?: string; error?: string; code?: string } | null
      if (res.status === 402 || d?.code === 'credits') { setState('no_credits'); return }
      if (!res.ok) { setState('error'); setMessage(d?.error ?? 'HD could not start. Try again.'); return }
      if (d?.status === 'done' && d.url) { setHdUrl(d.url); setState('done'); return }
      setState('processing'); poll(0)
    } catch {
      setState('error'); setMessage('HD could not start. Try again.')
    }
  }

  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8,
    padding: '8px 14px', borderRadius: 10, fontSize: '0.84rem', fontWeight: 800, textDecoration: 'none',
    border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)',
  } as const

  if (state === 'done' && hdUrl) {
    return (
      <a href={hdUrl} target="_blank" rel="noreferrer" download data-make-it-hd="done" style={base}>
        ⬇ Download HD
      </a>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button type="button" onClick={start} disabled={state === 'starting' || state === 'processing'} data-make-it-hd={state}
        style={{ ...base, cursor: state === 'starting' || state === 'processing' ? 'wait' : 'pointer' }}>
        {state === 'starting' ? 'Starting HD…' : state === 'processing' ? 'Making it HD… (a few minutes)' : `✨ Make it HD · ${MAKE_IT_HD_COST} credits`}
      </button>
      {state === 'processing' && (
        <p style={{ margin: '5px 0 0', fontSize: '0.7rem', color: 'var(--muted)' }}>
          You can leave — the HD file will also be in your <a href="/library" style={{ color: 'var(--accent)' }}>Library</a>.
        </p>
      )}
      {state === 'no_credits' && (
        <p role="alert" style={{ margin: '5px 0 0', fontSize: '0.72rem', color: 'var(--warning)' }}>
          HD needs {MAKE_IT_HD_COST} credits. <a href="/pricing#plans" style={{ color: 'var(--accent)' }}>Get more credits</a>
        </p>
      )}
      {state === 'error' && message && (
        <p role="alert" style={{ margin: '5px 0 0', fontSize: '0.72rem', color: 'var(--danger)' }}>{message}</p>
      )}
    </div>
  )
}
