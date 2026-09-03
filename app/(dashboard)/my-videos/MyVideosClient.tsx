'use client'

// Push #082 — My Videos premium library.
// Each card now hover-previews the rendered MP4 (muted autoplay on
// pointer-enter, pause on leave) and shows a richer set of badges:
// status, format (YouTube Shorts 9:16), duration, quality (or "HD"
// fallback), credits used, and a numeric quality_score star rating
// when present. The grid still falls back gracefully on staging rows
// that don't have a video_url yet.
//
// Push #153 — two UX improvements:
// 1. Autoplay in viewport: VideoCard uses IntersectionObserver so the
//    video starts playing as soon as the card is 40% visible — no hover
//    needed. Hover/pin still work as before.
// 2. Auto-refresh: when any video is still processing, the page calls
//    router.refresh() every 12 seconds so newly completed renders appear
//    without a manual page reload.

import Link from 'next/link'
import { engineLabelFor } from '@/lib/engineLabel'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { trackCheckoutClick } from '@/lib/trackClick'
import { downloadVideoFile } from '@/lib/videoDownload'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
// KINEO-PRICING-V6-2026-08-19 — o botão de desbloqueio repetia "$9.90" três
// vezes (title, label e letra miúda). USD fixo aqui; a cobrança re-resolve a
// moeda pelo IP no servidor. O que não pode voltar é o dígito à mão.
import { TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'

const STARTER_PRICE_USD = formatCheckoutMoney('usd', TIER_PRICES.starter.usd)

export interface VideoRow {
  id: string
  title: string
  status: 'completed' | 'processing' | 'failed' | 'cancelled'
  video_url: string | null
  thumbnail_url: string | null
  duration: number | null
  platform: string
  created_at: string
  prompt: string | null
  credits_used: number | null
  quality_mode: string | null
  // Push #082 — quality text (e.g. "HD", "4K") + optional numeric
  // quality_score (e.g. 4.2 → ★★★★☆). Either can be null on staging.
  quality: string | null
  quality_score: number | null
}

type FilterKey = 'all' | 'completed' | 'processing' | 'failed'

function statusChip(s: VideoRow['status']) {
  if (s === 'completed')
    return {
      label: 'Ready',
      emoji: '✅',
      fg: '#2997ff',
      bg: 'rgba(41,151,255,.12)',
      border: 'rgba(41,151,255,.40)',
      pulse: false,
    }
  if (s === 'failed' || s === 'cancelled')
    return {
      label: 'Failed',
      emoji: '❌',
      fg: '#f87171',
      bg: 'rgba(248,113,113,.12)',
      border: 'rgba(248,113,113,.40)',
      pulse: false,
    }
  return {
    label: 'Processing...',
    emoji: '⏳',
    fg: '#fbbf24',
    bg: 'rgba(251,191,36,.12)',
    border: 'rgba(251,191,36,.40)',
    pulse: true,
  }
}

function cleanVideoTitle(raw: string): string {
  let t = raw.trim()
  t = t.replace(/^VIDEO\s*\d+\s*[-\u2013:]\s*/i, '')
  const colonIdx = t.indexOf(':')
  if (colonIdx > 0) t = t.slice(0, colonIdx).trim()
  t = t.replace(/\b([A-Z]{2,})\b/g, (w: string) =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  )
  return t.trim() || raw.trim()
}

function formatFullDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return 'Recent'
  }
}

// Render a 0–5 quality_score as filled/empty star glyphs. We round to the
// nearest half so 4.2 → ★★★★☆ and 4.7 → ★★★★★.
function starsFor(score: number): string {
  const clamped = Math.max(0, Math.min(5, score))
  const full = Math.round(clamped)
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full)
}

// Derive a human-readable generation-engine label from credits_used.
// Mirrors the credit-cost tiers documented in app/pricing/page.tsx's FAQ:
// Fast (smart stock) = 1 credit, AI Generated (Seedance) = ~30-45 credits,
// Cinematic (Kling) = ~50-65 credits. Returns null when credits_used is
// missing/zero/outside known ranges so the caller can skip the badge
// instead of guessing.
// KINEO-SELO-MOTOR-2026-08-28 — aqui morava um adivinhador: deduzia o motor
// pela FAIXA DE PREÇO (credits<=2 = Fast, 20-45 = "AI Generated"...). Era
// exatamente a adivinhação que o fundador mandou matar — e mentia: Kling 3
// (150cr) e Veo (100cr) não casavam com faixa nenhuma e ficavam SEM selo, e
// qualquer mudança de preço rebatizava vídeos antigos. O selo agora vem do
// quality_mode real via lib/engineLabel.ts (fonte única) — selo honesto é
// ativo de marca.

function isWatermarkedFastAsset(video: VideoRow): boolean {
  return video.quality_mode === 'fast' && Number(video.credits_used ?? 0) === 0
}

export default function MyVideosClient({ videos, loadError = false }: { videos: VideoRow[]; loadError?: boolean }) {
  const [filter, setFilter] = useState<FilterKey>('all')
  // sprint-ui #9 (29-30/08) — busca por titulo/prompt. Com dezenas (o fundador
  // tem 327) de videos, achar UM era rolagem infinita. Client-side, zero rede.
  const [query, setQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  // Push #100 — mobile tap-to-play: only one card pinned at a time so
  // tapping a new card auto-pauses the previously playing one.
  const [playingId, setPlayingId] = useState<string | null>(null)

  // The current asset is always available: free users download/share the
  // watermarked MP4, while Starter unlocks a clean watermark-free export.
  // Fail open so a plan lookup problem never hides an owned file.
  const [cleanExportLocked, setCleanExportLocked] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    async function fetchPlan() {
      try {
        const res = await fetch('/api/credits')
        if (!res.ok) return
        const data = await res.json()
        const balance = Math.max(0, Number(data.credits ?? 0))
        // KINEO-TRIAL-BLOCKERS-2026-08-07 — ver HistoryClient: trial ativo tem
        // export limpo, então não pode receber o paywall de export limpo.
        const cleanAccess =
          data.isStarter === true || data.isCreator === true || data.isStudio === true ||
          data.trialActive === true ||
          (data.hasPaid === true && balance > 0)
        if (!cancelled) setCleanExportLocked(!cleanAccess)
      } catch {
        /* fail open */
      }
    }
    fetchPlan()
    window.addEventListener('creditsChanged', fetchPlan)
    return () => {
      cancelled = true
      window.removeEventListener('creditsChanged', fetchPlan)
    }
  }, [])

  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — bare window.location.href before: every
  // watermarked card shows this CTA, so repeat taps across cards each minted a
  // Stripe session. One shared launcher latch now covers all of them.
  const checkout = useCheckoutLaunch('my_videos_unlock_clean_export')

  function handleStarterCheckout() {
    const started = checkout.launch('starter', '/api/stripe/checkout?tier=starter&intro=1', {
      tier: 'starter',
      intro: true,
      pricing_surface: 'my_videos_unlock_clean_export',
    })
    if (!started) return
    trackCheckoutClick('starter')
  }

  // Push #153 — auto-refresh while any video is still processing so the
  // user doesn't have to manually reload to see a completed render.
  const router = useRouter()
  const hasProcessing = useMemo(() => videos.some((v) => v.status === 'processing'), [videos])
  useEffect(() => {
    if (!hasProcessing) return
    const id = setInterval(() => router.refresh(), 12_000)
    return () => clearInterval(id)
  }, [hasProcessing, router])

  const counts = useMemo(() => {
    const c = { all: videos.length, completed: 0, processing: 0, failed: 0 }
    for (const v of videos) {
      if (v.status === 'completed') c.completed += 1
      else if (v.status === 'failed' || v.status === 'cancelled') c.failed += 1
      else c.processing += 1
    }
    return c
  }, [videos])

  const filtered = useMemo(() => {
    let base = videos
    if (filter === 'completed') base = videos.filter((v) => v.status === 'completed')
    else if (filter === 'processing') base = videos.filter((v) => v.status === 'processing')
    else if (filter === 'failed')
      base = videos.filter((v) => v.status === 'failed' || v.status === 'cancelled')
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter((v) => `${v.title} ${v.prompt ?? ''}`.toLowerCase().includes(q))
  }, [videos, filter, query])

  async function handleCopyLink(v: VideoRow) {
    if (!v.video_url) return
    try {
      await navigator.clipboard.writeText(v.video_url)
      setCopiedId(v.id)
      setTimeout(() => setCopiedId((c) => (c === v.id ? null : c)), 1800)
    } catch {
      // clipboard denied — silent no-op
    }
  }

  // Native <a download> doesn't work for cross-origin CDN URLs — the browser
  // ignores the attribute and opens the MP4 in a new tab. Fetch the bytes
  // ourselves and trigger a blob download so the file actually saves locally.
  //
  // KINEO-DOWNLOAD-TRUTH-2026-08-04 — a implementação foi para lib/videoDownload
  // (única no produto). Push #154 continua valendo: o nome do arquivo é o título.
  // A entrega não mudou; o que mudou é que clique, falha e popup barrado agora
  // deixam rastro.
  async function handleDownload(v: VideoRow) {
    if (!v.video_url || downloadingId) return
    setDownloadingId(v.id)
    const safeTitle = v.title
      .replace(/[\\/:*?"<>|]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80)
    const filename = safeTitle ? `${safeTitle}.mp4` : `shortsforge-${v.id.slice(0, 8)}.mp4`
    try {
      await downloadVideoFile({
        url: v.video_url,
        filename,
        exportType: isWatermarkedFastAsset(v) ? 'watermarked' : 'clean',
        surface: 'my_videos',
        videoId: v.id,
      })
    } finally {
      setDownloadingId(null)
    }
  }

  /* KINEO-SPRINT-UI4-2026-08-29 — falha de leitura nao veste a roupa de
     "No videos yet" (licao do incidente JWT-skew de 28/08). */
  if (loadError && videos.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-7 pb-20">
        <Header count={0} />
        <div role="alert" className="rounded-2xl p-8 sm:p-12 text-center" style={{ background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.35)' }}>
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-xl font-black mb-2" style={{ color: '#fbbf24' }}>We couldn’t load your videos right now</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Your videos and credits are safe — this is a temporary read hiccup, not a lost library.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white"
            style={{ background: '#2997ff', boxShadow: '0 6px 28px rgba(41,151,255,.4)', border: 'none', cursor: 'pointer' }}
          >
            ↻ Try again
          </button>
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-7 pb-20">
        <Header count={0} />
        <div
          className="rounded-2xl p-8 sm:p-14 text-center"
          style={{
            background: '#161618',
            border: '1px solid rgba(41,151,255,.18)',
            boxShadow: '0 0 80px rgba(41,151,255,.08)',
          }}
        >
          <div className="text-5xl mb-4">⚡</div>
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>
            No videos yet — let&apos;s make your first Short!
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Generate your first AI Short, usually in 3–7 minutes. It&apos;s free.
          </p>
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
            style={{
              background: '#2997ff',
              color: '#FFFFFF',
              boxShadow: '0 4px 22px rgba(41,151,255,.4)',
              textDecoration: 'none',
            }}
          >
            Generate Now →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-7 pb-20">
      <Header count={videos.length} />

      {videos.length >= 6 && (
        <div className="mb-4" style={{ position: 'relative', maxWidth: 420 }}>
          <span aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.55 }}>🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your videos…"
            aria-label="Search your videos by title"
            className="w-full rounded-xl"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--fg, #f5f5f7)', fontSize: 16, padding: '11px 14px 11px 38px', outline: 'none' }}
          />
        </div>
      )}

      <FilterTabs filter={filter} counts={counts} onChange={setFilter} />

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {query.trim() ? <>No videos match &ldquo;{query.trim()}&rdquo;.</> : 'No videos match this filter.'}
          </p>
          {query.trim() && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-4 rounded-xl px-4 py-2 text-sm font-bold"
              style={{ background: 'rgba(41,151,255,.12)', border: '1px solid rgba(41,151,255,.4)', color: '#2997ff', cursor: 'pointer' }}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="mv-grid">
          {filtered.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              isCopied={copiedId === v.id}
              onCopy={() => handleCopyLink(v)}
              onDownload={() => handleDownload(v)}
              isDownloading={downloadingId === v.id}
              cleanExportLocked={cleanExportLocked}
              onUnlock={handleStarterCheckout}
              unlockPending={checkout.pending !== null}
              unlockError={checkout.error}
              isPinned={playingId === v.id}
              onTogglePin={() =>
                setPlayingId((curr) => (curr === v.id ? null : v.id))
              }
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .mv-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 1280px) {
          .mv-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        }
        @media (max-width: 900px) {
          .mv-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        }
        @media (max-width: 600px) {
          .mv-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        }
      `}</style>
    </div>
  )
}

function VideoCard({
  video: v,
  isCopied,
  onCopy,
  onDownload,
  isDownloading,
  isPinned,
  onTogglePin,
  cleanExportLocked,
  onUnlock,
  unlockPending,
  unlockError,
}: {
  video: VideoRow
  isCopied: boolean
  onCopy: () => void
  onDownload: () => void
  isDownloading: boolean
  isPinned: boolean
  onTogglePin: () => void
  cleanExportLocked: boolean | null
  onUnlock: () => void
  unlockPending: boolean
  unlockError: string | null
}) {
  const chip = statusChip(v.status)
  const playable = v.status === 'completed' && !!v.video_url
  // Push #102 — kick the analyze step off immediately when a video has a
  // saved prompt, so "Generate Similar" feels like one click. Falls back to
  // a plain /generate redirect for staging rows that never stored a prompt.
  const generateSimilarHref = v.prompt
    ? `/studio/create?prompt=${encodeURIComponent(v.prompt)}&autoanalyze=1`
    : '/studio'

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  // Push #153 — autoplay when card is visible in viewport (threshold
  // lowered to 0.1 so multi-column grid cards start playing as soon as
  // they're barely on screen, instead of waiting for 40% visibility).
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const el = cardRef.current
    if (!el || !playable) return
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [playable])

  // Push #100 — single source of truth for "should the preview be playing".
  // Push #153 — isVisible adds viewport-based autoplay on top of hover/pin.
  const shouldPlay = (isVisible || hovered || isPinned) && playable && !previewFailed

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (shouldPlay) {
      if (!el.src && v.video_url) el.src = v.video_url
      el.muted = true
      el.play().catch(() => {/* autoplay blocked — silent */})
    } else {
      el.pause()
      try { el.currentTime = 0 } catch { /* not seekable yet */ }
      // Drop the src so an idle, off-screen card doesn't hold a decoder.
      if (el.src) {
        el.removeAttribute('src')
        el.load()
      }
    }
  }, [shouldPlay, v.video_url])

  function handlePreviewClick() {
    if (!playable || previewFailed) return
    onTogglePin()
  }

  // Duration label — show the real seconds when known, otherwise the
  // expected ~35s for a Shorts render so the card never reads "0s".
  const durationLabel = v.duration && v.duration > 0 ? `${Math.round(v.duration)}s` : '~35s'

  // Quality badge — prefer the numeric quality_score (rendered as stars),
  // fall back to the `quality` text column, finally show "HD" so every
  // completed card carries some kind of quality signal.
  const hasScore = typeof v.quality_score === 'number' && v.quality_score > 0
  const qualityText = hasScore
    ? `${(v.quality_score as number).toFixed(1)} ${starsFor(v.quality_score as number)}`
    : v.quality && v.quality.trim().length > 0
      ? v.quality.toUpperCase()
      : 'HD'

  // Engine badge — which AI engine generated this video (Fast/AI Generated/
  // Cinematic), derived from credits_used. Distinct from the quality badge
  // above: this answers "which engine made it", not "how good is it".
  // Renders nothing when credits_used is null/0/unrecognized.
  const engineText = engineLabelFor(v.quality_mode)

  const isActive = hovered || isPinned

  return (
    <div
      ref={cardRef}
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') setHovered(true) }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') setHovered(false) }}
      className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
      style={{
        background: '#161618',
        border: isActive
          ? '1px solid rgba(41,151,255,0.55)'
          : '1px solid rgba(255,255,255,0.06)',
        boxShadow: isActive
          ? '0 0 32px rgba(41,151,255,0.22), 0 18px 40px rgba(0,0,0,0.45)'
          : '0 8px 22px rgba(0,0,0,0.35)',
        transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div
        className="relative"
        onClick={handlePreviewClick}
        style={{
          background: v.thumbnail_url
            ? `center / cover no-repeat url(${v.thumbnail_url})`
            : 'linear-gradient(135deg, rgba(41,151,255,.18), rgba(41,151,255,.08))',
          aspectRatio: '9 / 16',
          overflow: 'hidden',
          cursor: playable && !previewFailed ? 'pointer' : 'default',
        }}
      >
        {/* Hover/tap preview — the rendered MP4 plays muted while the user
            is on (desktop) or has tapped (mobile) the card. preload="none"
            and dynamic src mean nothing is fetched until interaction. */}
        {playable && !previewFailed && (
          <video
            ref={videoRef}
            poster={v.thumbnail_url ?? undefined}
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setPreviewFailed(true)}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 pointer-events-none"
            style={{ opacity: shouldPlay ? 1 : 0 }}
          />
        )}

        {/* Center play-circle overlay — visible on completed cards, fades
            out while the preview is playing. Matches the Canva/InVideo
            pattern. */}
        {playable && !previewFailed && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              opacity: shouldPlay ? 0 : 1,
              transition: 'opacity 0.25s ease',
            }}
            aria-hidden="true"
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(11,17,32,.55)',
                backdropFilter: 'blur(8px)',
                border: '2px solid rgba(255,255,255,.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.35rem',
                paddingLeft: 4,
                boxShadow: '0 6px 22px rgba(0,0,0,.45)',
              }}
            >
              ▶
            </div>
          </div>
        )}

        {/* Fallback glyph for rows without a thumbnail and not playable
            (processing/failed). Hidden once the preview is up. */}
        {!v.thumbnail_url && !playable && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ color: 'rgba(110,231,183,.7)', fontSize: '2.6rem' }}
          >
            🎬
          </div>
        )}

        {/* Top-left: engine badge (which AI engine generated this video) +
            quality badge (how good it is), stacked vertically. */}
        {playable && (
          <div
            className="absolute flex flex-col items-start"
            style={{ top: 8, left: 8, gap: 4 }}
          >
            {engineText && (
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: 'rgba(41,151,255,.1)',
                  border: '1px solid rgba(41,151,255,.3)',
                  color: '#2997ff',
                  fontSize: '0.6rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  backdropFilter: 'blur(8px)',
                }}
                title="Generation engine"
              >
                {engineText}
              </span>
            )}
            <span
              style={{
                padding: '3px 9px',
                borderRadius: 6,
                background: 'rgba(41,151,255,.1)',
                border: '1px solid rgba(41,151,255,.3)',
                color: '#2997ff',
                fontSize: '0.6rem',
                fontWeight: 900,
                letterSpacing: '0.06em',
                backdropFilter: 'blur(8px)',
              }}
              title="Output quality"
            >
              {qualityText}
            </span>
          </div>
        )}

        {/* Top-right: status badge — Ready / Processing... / Failed.
            Processing pulses to signal an in-flight render. */}
        <span
          className={`absolute${chip.pulse ? ' animate-pulse' : ''}`}
          style={{
            top: 8,
            right: 8,
            padding: '3px 9px',
            borderRadius: 999,
            background: chip.bg,
            border: `1px solid ${chip.border}`,
            color: chip.fg,
            fontSize: '0.62rem',
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            backdropFilter: 'blur(8px)',
          }}
        >
          {chip.emoji} {chip.label}
        </span>

        {/* Bottom-left: format badge */}
        <span
          className="absolute"
          style={{
            bottom: 8,
            left: 8,
            padding: '3px 8px',
            borderRadius: 6,
            background: 'rgba(11,17,32,.7)',
            border: '1px solid rgba(255,255,255,.12)',
            color: '#F1F5F9',
            fontSize: '0.58rem',
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            backdropFilter: 'blur(8px)',
          }}
        >
          YouTube Shorts · 9:16
        </span>

        {/* KINEO-SELO-MOTOR-2026-08-28 — o motor que REALMENTE rodou este
            vídeo, do mapa único em lib/engineLabel.ts. Pedido do fundador:
            "hoje a pessoa tem que adivinhar". Selo honesto é ativo de marca:
            sem quality_mode conhecido, nenhum selo — nunca chutar. */}
        {engineLabelFor(v.quality_mode) && (
          <span
            className="absolute"
            style={{
              top: 8,
              right: 8,
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(41,151,255,.85)',
              color: '#fff',
              fontSize: '0.62rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              backdropFilter: 'blur(8px)',
            }}
          >
            {engineLabelFor(v.quality_mode)}
          </span>
        )}

        {/* Bottom-right: duration */}
        <span
          className="absolute"
          style={{
            bottom: 8,
            right: 8,
            padding: '3px 8px',
            borderRadius: 6,
            background: 'rgba(0,0,0,.65)',
            color: '#fff',
            fontSize: '0.62rem',
            fontWeight: 800,
            backdropFilter: 'blur(8px)',
          }}
        >
          {durationLabel}
        </span>
      </div>

      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <p
          className="text-[14px] font-bold tracking-tight"
          style={{
            color: 'var(--text)',
            lineHeight: 1.35,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {cleanVideoTitle(v.title)}
        </p>

        <div
          className="text-[11px] flex flex-wrap items-center gap-x-1.5 gap-y-1"
          style={{ color: 'var(--muted)' }}
        >
          <span>{formatFullDate(v.created_at)}</span>
          {v.credits_used != null && (
            <>
              <span>·</span>
              <span>{v.credits_used} credits</span>
            </>
          )}
        </div>

        {playable && v.video_url ? (
          <div className="flex flex-col gap-2 mt-auto pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={v.video_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-3 py-2 text-xs font-bold flex-1 text-center transition-all"
                style={{
                  background: '#2997ff',
                  color: '#fff',
                  textDecoration: 'none',
                  boxShadow: '0 4px 18px rgba(41,151,255,.35)',
                }}
              >
                ▶ Open
              </a>
              <button
                type="button"
                onClick={onDownload}
                disabled={isDownloading}
                title={isWatermarkedFastAsset(v) ? 'Download MP4 with Kineo watermark' : 'Download clean MP4'}
                className="rounded-lg px-3 py-2 text-xs font-bold"
                style={{
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid var(--border)',
                  color: 'var(--text2)',
                  cursor: isDownloading ? 'wait' : 'pointer',
                  opacity: isDownloading ? 0.6 : 1,
                }}
              >
                {isDownloading ? '…' : isWatermarkedFastAsset(v) ? '⬇ Watermarked MP4' : '⬇ Download clean MP4'}
              </button>
            </div>
            {isWatermarkedFastAsset(v) && cleanExportLocked === true && (
              <button
                type="button"
                onClick={onUnlock}
                disabled={unlockPending}
                title={`Starter: ${STARTER_PRICE_USD}/month`}
                className="rounded-lg px-3 py-2 text-xs font-black w-full flex flex-col items-center"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  color: '#fff',
                  cursor: unlockPending ? 'wait' : 'pointer',
                  opacity: unlockPending ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(245,158,11,.35)',
                }}
              >
                {unlockPending ? (
                  <span>Loading…</span>
                ) : (
                  <>
                    <span>Unlock clean exports — Starter {STARTER_PRICE_USD}</span>
                    {/* KINEO-PRICING-V6-2026-08-19 — "then $X/mo" sugeria preço
                        de entrada. Não existe intro: é o mesmo valor sempre. */}
                    <span style={{ fontSize: '0.58rem', opacity: 0.9 }}>for new videos · {STARTER_PRICE_USD}/mo · cancel anytime</span>
                  </>
                )}
              </button>
            )}
            {isWatermarkedFastAsset(v) && cleanExportLocked === true && unlockError && (
              <p role="alert" style={{ color: '#ff6b6b', fontSize: '0.65rem', fontWeight: 600, margin: 0 }}>
                {unlockError}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onCopy}
                className="rounded-lg px-3 py-2 text-xs font-bold flex-1"
                style={{
                  background: isCopied
                    ? 'rgba(41,151,255,.12)'
                    : 'rgba(255,255,255,.04)',
                  border: isCopied
                    ? '1px solid rgba(41,151,255,.45)'
                    : '1px solid var(--border)',
                  color: isCopied ? '#2997ff' : 'var(--text2)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {isCopied ? '✓ Copied!' : '🔗 Copy Link'}
              </button>
              <Link
                href={generateSimilarHref}
                className="rounded-lg px-3 py-2 text-xs font-bold flex-1 text-center"
                style={{
                  background: 'rgba(41,151,255,.10)',
                  border: '1px solid rgba(41,151,255,.32)',
                  color: '#2997ff',
                  textDecoration: 'none',
                }}
              >
                ⚡ Generate Similar
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="text-[11px] mt-auto pt-2"
            style={{ color: 'var(--muted)' }}
          >
            {v.status === 'processing' ? 'Rendering…' : 'Not available'}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterTabs({
  filter,
  counts,
  onChange,
}: {
  filter: FilterKey
  counts: { all: number; completed: number; processing: number; failed: number }
  onChange: (f: FilterKey) => void
}) {
  const tabs: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'completed', label: 'Completed', count: counts.completed },
    { key: 'processing', label: 'Processing', count: counts.processing },
    { key: 'failed', label: 'Failed', count: counts.failed },
  ]
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {tabs.map((t) => {
        const active = filter === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className="rounded-full px-3.5 py-1.5 text-xs font-bold"
            style={{
              background: active
                ? '#2997ff'
                : 'rgba(255,255,255,.04)',
              border: active ? '1px solid #2997ff' : '1px solid var(--border)',
              color: active ? '#fff' : 'var(--muted)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
            <span
              className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                background: active ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.06)',
                color: active ? '#fff' : 'var(--muted2)',
              }}
            >
              {t.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Header({ count }: { count: number }) {
  return (
    <div className="mb-6">
      <div
        className="font-black uppercase tracking-widest mb-1"
        style={{ fontSize: '0.62rem', color: 'var(--indigo-light)' }}
      >
        Library
      </div>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="font-black tracking-tight mb-1"
            style={{ fontSize: '1.65rem', color: 'var(--text)', letterSpacing: '-0.02em' }}
          >
            My <span className="grad-text">Videos</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            {count} video{count === 1 ? '' : 's'} in your library
          </p>
        </div>
        <Link
          href="/studio"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold flex-shrink-0"
          style={{
            background: '#2997ff',
            color: '#FFFFFF',
            boxShadow: '0 4px 18px rgba(41,151,255,.35)',
            textDecoration: 'none',
          }}
        >
          ⚡ Generate Video
        </Link>
      </div>
    </div>
  )
}
