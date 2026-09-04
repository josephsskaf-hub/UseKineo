'use client'

// Push #323 - My Videos: show first frame via preload=metadata; no more black cards

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { trackCheckoutClick } from '@/lib/trackClick'
import { trackClosedEvent, trackEvent } from '@/lib/analytics'
import { downloadVideoFile } from '@/lib/videoDownload'
import { fitLightboxFrame } from '@/lib/frameFit'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { buildSeriesContinuationHref } from '@/lib/seriesContinuation'
import {
  buildPublicVideoSharePath,
  PUBLIC_VIDEO_SHARE_VERSION,
  PUBLIC_VIDEO_SHARING_ENABLED,
} from '@/lib/videoShare'
import { FreeTierCopy } from '@/components/FreeTierOfferProvider'
import AffiliateMomentumCard from '@/components/AffiliateMomentumCard'
// KINEO-HISTORICO-RENDER-VIVO-2026-09-04 (#10) — o render que ainda esta no
// motor NAO tem linha em `videos` (a linha nasce no fim, no compose). Sem
// este cartao esta tela recebia a promessa do #9 ("the film saves to My
// Videos on its own") e mostrava a lista velha — ou "No videos yet".
import HistoryActiveRenderCard from '@/components/HistoryActiveRenderCard'
import {
  isAffiliateMomentumEligible,
  isHistorySubscriptionOfferEligible,
} from '@/lib/affiliateActivation'
import { resolveHistoryMilestoneMode } from '@/lib/growth/historyMilestone'
// KINEO-PRICING-V6-2026-08-19 — esta tela vendia Starter com "$9.90/month" e
// "60 credits" DIGITADOS em três lugares, e os três estavam errados no dia
// seguinte ao reprice. USD fixo aqui (o checkout re-resolve a moeda pelo IP no
// servidor), mas nunca mais um dígito à mão.
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import {
  HISTORY_REFERRAL_MISSION_VARIANT,
  historyReferralMissionCopy,
  normalizeReferralInviteUrl,
  normalizeReferralRewardCredits,
} from '@/lib/historyReferralMission'
import {
  createHistoryFirstVideoOfferDwellController,
  createHistoryFirstVideoOfferRecorder,
  HISTORY_FIRST_VIDEO_OFFER_DWELL_MS,
  HISTORY_FIRST_VIDEO_OFFER_RETRY_DELAY_MS,
  HISTORY_FIRST_VIDEO_OFFER_VISIBLE_RATIO,
  shouldDwellOnHistoryFirstVideoOffer,
} from '@/lib/growth/historyFirstVideoOfferHumanView'

const STARTER_PRICE_USD = formatCheckoutMoney('usd', TIER_PRICES.starter.usd)

interface Video {
  id: string
  video_url: string
  thumbnail_url: string | null
  topic: string | null
  youtube_description: string | null
  hashtags: string[] | null
  status: string
  quality_mode: string | null
  credits_used: number | null
  created_at: string
  // KINEO-ENHANCE-VISIVEL-2026-08-17 (fundador: "como eu sei que virou HD?")
  enhanced_url?: string | null
  enhance_request_id?: string | null
}

function isWatermarkedFastAsset(video: Video): boolean {
  return video.quality_mode === 'fast' && Number(video.credits_used ?? 0) === 0
}

// KINEO-UI-DIARIO-2026-08-17 (roadmap Higgsfield, item 23) — O PESO SEGUE O
// OLHAR, NAO O PAGELOAD.
//
// Antes: os 100 cards montavam `<video preload="metadata">` de uma vez. Medido
// no DOM de producao hoje, com a conta do fundador: **100 <video>, preload
// "metadata" declarado em 100/100, poster em 0/100, 91 abaixo da dobra** — e o
// bucket `renders` guarda **1.027 arquivos de 29,4 MB em media**. Sao 91
// requisicoes de metadados a objetos de ~29 MB que ninguem vai olhar naquela
// tela. `<video>` nao tem `loading="lazy"`: quem nao gasta o byte e quem nao
// monta o elemento.
//
// NAO REPETIR O ERRO DE MEDICAO QUE ESTE COMENTARIO QUASE CONGELOU: a leitura
// de 14/08 dizia "`readyState 0` e `networkState 2` em 100/100 dois segundos
// depois do load" e concluia starvation de conexao. Refeito hoje, e falso — a
// aba estava em `visibilityState: "hidden"`, e o Chrome **congela o preload de
// midia em aba de fundo**. Prova: um `load()` explicito num card VISIVEL na
// viewport, com a aba escondida, ficou 5 s em `readyState 0` e 0 byte, enquanto
// um `fetch` com `Range` no MESMO arquivo respondeu **206 na hora**. A rede e o
// CDN estavam livres; o elemento de midia e que estava suspenso. Toda medicao
// de `<video>`/`loading="lazy"` tem que ler `document.visibilityState` antes de
// acreditar em si mesma.
//
// Depois: o <video> so MONTA quando o card entra no viewport (rootMargin 300px,
// entao ele chega pintado, nao pintando na frente da pessoa). Ate la o box e um
// gradiente da marca — nunca o preto de antes.
//
// O QUE ESTE ITEM NAO FAZ, E POR QUE: o backlog mandava usar `thumbnail_url`
// como `poster` ("o asset ja esta pago", commit #320). MEDIDO NO BANCO HOJE:
// `select count(thumbnail_url) from videos` = **0 de 1129** — a coluna existe,
// e lida em 4 telas (`/library`, `/my-videos`, `/studio`, `/generate`) e nunca
// foi gravada uma vez. Nao ha poster para pedir. Por isso o primeiro frame
// continua vindo do proprio MP4 (`preload="metadata"`), so que agora sob
// demanda. Gerar a thumbnail e trabalho de pipeline, nao de sprint de UI: fica
// registrado como dependencia no backlog.
//
// Save-Data e 2g: nao montam nada — o gradiente fica, zero byte de MP4.
// prefers-reduced-motion: o crossfade morre sozinho pelo `0.01ms !important`
// global do `globals.css` (regra `!important` de folha vence `style` inline);
// o frame continua aparecendo, so que sem transicao.
function HistoryCardFrame({ src }: { src: string }) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [armed, setArmed] = useState(false)
  const [painted, setPainted] = useState(false)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
    const conn = nav.connection
    if (conn?.saveData || (conn?.effectiveType ?? '').includes('2g')) return
    // Sem IntersectionObserver (browser antigo): monta tudo, que e exatamente o
    // comportamento de antes desta mudanca — degradacao para o estado conhecido.
    if (typeof IntersectionObserver !== 'function') {
      setArmed(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setArmed(true)
        observer.disconnect()
      },
      { rootMargin: '300px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // O src troca quando o HD (enhanced_url) fica pronto: o frame antigo sai de
  // cena ate o novo carregar, em vez de piscar o do arquivo anterior.
  useEffect(() => {
    setPainted(false)
  }, [src])

  return (
    <div
      ref={boxRef}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(155deg, #141416 0%, #1d1d1f 52%, #141416 100%)',
      }}
    >
      {armed && (
        <video
          // `#t=0.1` NAO e enfeite: `preload="metadata"` so garante readyState 1
          // (HAVE_METADATA) pela especificacao, e em readyState 1 nao existe
          // frame decodificado para pintar — o card ficaria no gradiente para
          // sempre e o `loadeddata` nunca dispararia. O fragmento de midia
          // manda o browser buscar aquele instante, o que leva o elemento a
          // readyState 2 e faz o frame existir de verdade. E o mesmo truque que
          // o `/studio` ja roda em producao contra este mesmo storage, entao
          // nao e aposta. O fragmento nao vai para o servidor (e resolvido no
          // cliente), logo a URL requisitada continua identica.
          src={src.includes('#') ? src : `${src}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          onLoadedData={() => setPainted(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            opacity: painted ? 1 : 0,
            transition: 'opacity var(--dur-base, 250ms) var(--ease-swift, cubic-bezier(.2,0,0,1))',
          }}
        />
      )}
    </div>
  )
}

function extractTitle(topic: string | null): string {
  if (!topic) return 'Untitled Short'
  // Try HOOK line: "HOOK (0-2s): [Pexels: ...] Actual hook text"
  const hookMatch = topic.match(/HOOK[^:]*:\s*(?:\[Pexels:[^\]]*\]\s*)?(.+?)(?:\n|$)/)
  if (hookMatch) {
    const t = hookMatch[1].replace(/\[Pexels:[^\]]*\]/g, '').trim()
    return t.length > 90 ? t.slice(0, 87) + '…' : t
  }
  // Fallback: first non-header line, stripping any [Pexels: ...] tags
  const lines = topic.split('\n').map((l) => {
    return l.trim().replace(/\[Pexels:[^\]]*\]/gi, '').trim()
  }).filter(
    (l) => l.length > 15 && !l.startsWith('YouTube Short') && !l.startsWith('HOOK') && !l.startsWith('MICRO')
  )
  if (lines[0]) return lines[0].slice(0, 90)
  return 'Untitled Short'
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// PUSH #92 — recovery surfaces. /history now receives every status (not just
// 'completed'), so every row needs a distinct, honest card treatment instead
// of silently vanishing. Statuses confirmed against the live `videos` table
// (Supabase project cqqukkvjjrguayiyjvhh): 'completed' (564 rows), 'failed'
// (3 rows), 'cancelled' (1 row). The app's own GenerationStatus type
// (lib/generations.ts) also defines 'processing' as the in-flight state, and
// generate-video/active + generate-video/cancel both read/write it live, so
// it's treated as a real status here even though no row currently shows it.
// 'pending' / 'rendering' aren't used by this pipeline today but are handled
// defensively since other pipelines in this codebase (avatar/cinematic) use
// them for analogous in-flight states. Any other/unrecognized status falls
// back to the processing treatment (never crashes), and is promoted to the
// timeout treatment once it's old enough that it almost certainly died
// silently server-side.
const PROCESSING_STATUSES = new Set(['processing', 'pending', 'rendering'])
const FAILED_STATUSES = new Set(['failed', 'error', 'cancelled'])
const STALE_PROCESSING_MS = 30 * 60 * 1000 // display-only guard; never mutates the row

type VideoState = 'completed' | 'processing' | 'failed' | 'timeout'

function classifyVideoState(video: Video): VideoState {
  const status = (video.status ?? '').toLowerCase().trim()
  if (status === 'completed') return 'completed'
  if (FAILED_STATUSES.has(status)) return 'failed'
  const ageMs = Date.now() - new Date(video.created_at).getTime()
  if (ageMs > STALE_PROCESSING_MS) return 'timeout'
  return 'processing'
}

function formatStarted(dateStr: string): string {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (minutes < 1) return 'Started just now'
  if (minutes < 60) return `Started ${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Started ${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `Started ${days} day${days === 1 ? '' : 's'} ago`
}

function failedCardCopy(video: Video, state: 'failed' | 'timeout'): string {
  if (state === 'timeout') return 'This render timed out. Your credits were returned — try again.'
  if ((video.status ?? '').toLowerCase().trim() === 'cancelled') {
    return 'This render was cancelled. Your credits were returned.'
  }
  return "This one didn't finish. Your credits were returned."
}

// GenerateClient reads `?prompt=` (falling back to the legacy `?topic=`) to
// prefill the composer — see app/(dashboard)/generate/GenerateClient.tsx,
// which does `searchParams.get('prompt') ?? searchParams.get('topic')` and
// caps the stored prompt at 1000 chars.
function tryAgainHref(video: Video): string {
  const topic = (video.topic ?? '').trim()
  if (!topic) return '/studio'
  return `/studio/create?prompt=${encodeURIComponent(topic.slice(0, 1000))}`
}

interface Props {
  videos: Video[]
  // true quando o select da page falhou — a lista vazia NAO significa "sem videos".
  loadError?: boolean
}

// Push #421 — per-video YouTube summary (title + description + hashtags),
// generated on demand by /api/video-summary and cached in the videos row.
interface VideoSummary {
  title: string | null
  description: string
  hashtags: string[]
}

export default function MyVideosClient({ videos: initialVideos, loadError = false }: Props) {
  const [videos] = useState(initialVideos)
  // PUSH #92 — `videos` now holds every status. Anything that assumes a
  // finished, playable asset (the share spotlight, the "N Shorts complete"
  // milestone copy, the repeat-creator upsell gate) must key off completed
  // rows only, or it'll try to share/caption a video that doesn't exist yet.
  const completedVideos = videos.filter((v) => v.status === 'completed')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [errors, setErrors] = useState<Set<string>>(new Set())
  // Push #421 — summary panel state
  const [summaries, setSummaries] = useState<Record<string, VideoSummary>>({})
  const [summaryLoading, setSummaryLoading] = useState<string | null>(null)
  const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  // Push #098 — open a video in the big player overlay (the large view the
  // user expects when clicking a card), and a proper blob download that works
  // from My Videos any time — not just once on the result page.
  const [lightbox, setLightbox] = useState<string | null>(null)
  // sprint-ui #9 (29-30/08) — busca por titulo/tema. O fundador tem 327 videos
  // e achar um era rolagem infinita; cliente com 20+ sofre igual. Client-side.
  const [query, setQuery] = useState('')
  const visibleVideos = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return videos
    return videos.filter((v) => `${extractTitle(v.topic)} ${v.topic ?? ''}`.toLowerCase().includes(q))
  }, [videos, query])
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  // KINEO-ENHANCE-2026-08-17 — pos-producao Topaz por video (10cr): status e
  // URL final por id. 'processing' vira polling de 6s ate done/failed.
  const [enhStatus, setEnhStatus] = useState<Record<string, 'processing' | 'done' | 'failed'>>({})
  const [enhUrls, setEnhUrls] = useState<Record<string, string>>({})
  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — the Starter upsell was a bare
  // window.location.href: no latch (repeat taps = repeat Stripe sessions), no
  // pending state and no error if the redirect never landed.
  const checkout = useCheckoutLaunch('history_starter_upgrade')
  // #459 — share the public /v/[id] page (native share on mobile, copy on desktop)
  const [sharedId, setSharedId] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralRewardCredits, setReferralRewardCredits] = useState<number | null>(null)
  const [referralInviteUrl, setReferralInviteUrl] = useState<string | null>(null)
  const [referralInviteCopied, setReferralInviteCopied] = useState(false)
  const sharePromptRef = useRef<HTMLElement | null>(null)
  const sharePromptTrackedKeyRef = useRef<string | null>(null)
  const referralMissionRef = useRef<HTMLElement | null>(null)
  const referralMissionTrackedRef = useRef(false)
  // Commercial truth: the current MP4 is always downloadable. For free users
  // that asset carries the Kineo watermark; payment unlocks a clean export.
  // Fail open so a plan lookup problem never hides an owned file.
  const [cleanExportLocked, setCleanExportLocked] = useState<boolean | null>(null)
  const [subscriptionOfferEligible, setSubscriptionOfferEligible] = useState<boolean | null>(null)
  const [affiliateMomentumEligible, setAffiliateMomentumEligible] = useState(false)
  const subscriptionOfferTracked = useRef(false)
  const firstVideoOfferCtaRef = useRef<HTMLButtonElement | null>(null)
  const firstVideoOfferHumanViewStopRef = useRef<(() => void) | null>(null)
  const latestVideo = completedVideos[0] ?? null
  useEffect(() => {
    let cancelled = false
    fetch('/api/credits', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return
        const balance = Math.max(0, Number(d.credits ?? 0))
        // KINEO-TRIAL-BLOCKERS-2026-08-07 — trial ativo tem export limpo (o
        // servidor deixou de marcar os renders do trial). Sem este termo a
        // biblioteca continuaria vendendo "desbloqueie o export limpo" para
        // quem já baixa limpo — e o selo "⬇ WM" apareceria em vídeo sem marca.
        // /api/credits já devolve `trialActive` (isTrialActive server-side);
        // com a flag OFF ele é sempre false e nada muda.
        const cleanAccess =
          d.isStarter === true || d.isCreator === true || d.isStudio === true ||
          d.trialActive === true ||
          (d.hasPaid === true && balance > 0)
        setCleanExportLocked(!cleanAccess)
        setSubscriptionOfferEligible(isHistorySubscriptionOfferEligible({
          completedVideoCount: completedVideos.length,
          isStarter: d.isStarter === true,
          isCreator: d.isCreator === true,
          isStudio: d.isStudio === true,
        }))
        // Affiliate activation belongs after proven value and a real payment,
        // never while the subscription decision is still the primary job.
        setAffiliateMomentumEligible(isAffiliateMomentumEligible({
          completedVideoCount: completedVideos.length,
          isStarter: d.isStarter === true,
          isCreator: d.isCreator === true,
          isStudio: d.isStudio === true,
        }))
      })
      .catch(() => {/* fail open */})
    if (latestVideo) {
      fetch('/api/referral', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled) return
          const code = typeof d?.code === 'string' ? d.code.trim() : ''
          const rewardCredits = normalizeReferralRewardCredits(d?.rewardCredits)
          const inviteUrl = normalizeReferralInviteUrl(d?.url, code)
          if (inviteUrl && rewardCredits !== null) {
            setReferralCode(code)
            setReferralRewardCredits(rewardCredits)
            setReferralInviteUrl(inviteUrl)
          }
        })
        .catch(() => {/* keep the existing private notice if referral is unavailable */})
    }
    return () => { cancelled = true }
  }, [])

  // PUSH #29 — expose the latest finished asset as a distribution action to
  // every returning creator, including the existing back-catalogue. Count the
  // prompt only when the spotlight actually enters the viewport.
  useEffect(() => {
    if (!PUBLIC_VIDEO_SHARING_ENABLED) return
    const element = sharePromptRef.current
    const key = latestVideo?.id ?? null
    if (!element || !key || sharePromptTrackedKeyRef.current === key) return

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return
      sharePromptTrackedKeyRef.current = key
      void trackEvent('video_share_prompt_viewed', {
        version: PUBLIC_VIDEO_SHARE_VERSION,
        video_id: key,
        where: 'history_spotlight',
        referral_attached: !!referralCode,
      })
      observer.disconnect()
    }, { threshold: [0.5] })
    observer.observe(element)
    return () => observer.disconnect()
  }, [latestVideo?.id, referralCode])

  // KINEO-HISTORY-REFERRAL-MISSION-2026-08-28 — public /v links are disabled
  // for privacy containment. This is a separate acquisition action: it shares
  // only the creator's root referral URL and never exposes a video id or asset.
  useEffect(() => {
    if (
      PUBLIC_VIDEO_SHARING_ENABLED || referralMissionTrackedRef.current ||
      !latestVideo || !referralInviteUrl || referralRewardCredits === null
    ) return
    const element = referralMissionRef.current
    if (!element) return

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return
      referralMissionTrackedRef.current = true
      void trackEvent('video_share_prompt_viewed', {
        version: PUBLIC_VIDEO_SHARE_VERSION,
        variant: HISTORY_REFERRAL_MISSION_VARIANT,
        where: 'history_private_referral',
        referral_attached: true,
        incentive_available: true,
        incentive_credits_each: referralRewardCredits,
      })
      observer.disconnect()
    }, { threshold: [0.5] })
    observer.observe(element)
    return () => observer.disconnect()
  }, [latestVideo, referralInviteUrl, referralRewardCredits])

  useEffect(() => {
    if (subscriptionOfferTracked.current || subscriptionOfferEligible !== true || completedVideos.length < 1) return
    // Keep a separately named technical denominator. It proves the eligible
    // CTA rendered; the human-view event below proves the person actually had
    // a visible, actionable decision surface. Counting people by event name
    // separates eligibility/rendering from position and attention.
    if (completedVideos.length === 1) {
      if (!firstVideoOfferCtaRef.current) return
      subscriptionOfferTracked.current = true
      void trackClosedEvent('history_first_video_offer_rendered', {
        version: 'history_first_video_rendered_v1',
        surface: 'history_milestone',
        placement: 'secondary',
        actor_unit: 'authenticated_user',
        event_unit: 'first_completed_video_offer_rendered',
        completed_video_count: 1,
      })
      return
    }
    subscriptionOfferTracked.current = true
    void trackEvent('history_repeat_offer_viewed', {
      version: 'push28_repeat_creator',
      completed_video_count: completedVideos.length,
    })
  }, [completedVideos.length, subscriptionOfferEligible])

  // The old first-video viewed event fired as soon as eligibility resolved,
  // even when the secondary CTA was below the fold. V2 measures the decision
  // surface itself: >=50% visible for one continuous second, visible tab,
  // actionable button, once per first completed video in this tab. The marker
  // only closes after /api/events confirms storage; a confirmed reject gets
  // one bounded retry.
  useEffect(() => {
    if (
      subscriptionOfferEligible !== true
      || completedVideos.length !== 1
      || !latestVideo?.id
      || checkout.pending !== null
      || lightbox !== null
      || typeof IntersectionObserver === 'undefined'
    ) return
    const target = firstVideoOfferCtaRef.current
    if (!target) return
    const lockManager = navigator.locks
    if (!lockManager) return

    let storage: Storage | null = null
    try {
      storage = window.sessionStorage
    } catch {
      // Without a reliable session marker, fail closed instead of inflating it.
    }
    if (!storage) return

    const recorder = createHistoryFirstVideoOfferRecorder({
      videoKey: latestVideo.id,
      storage,
      withExclusiveClaim: async (claimName, task) => await lockManager.request(claimName, task),
      transport: (eventName, metadata) => trackClosedEvent(eventName, metadata),
    })
    if (recorder.wasSettled()) return

    let isIntersecting = false
    let intersectionRatio = 0
    let observer: IntersectionObserver | null = null
    let retryTimer: number | null = null
    let retryUsed = false
    let stopped = false

    const qualifies = () => shouldDwellOnHistoryFirstVideoOffer({
      eligible:
        subscriptionOfferEligible === true
        && completedVideos.length === 1
        && lightbox === null,
      ctaActionable: !target.disabled,
      isIntersecting,
      intersectionRatio,
      documentVisible: document.visibilityState === 'visible',
    })
    let dwell: ReturnType<typeof createHistoryFirstVideoOfferDwellController> | null = null
    const clearRetry = () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer)
      retryTimer = null
    }
    const handleVisibility = () => {
      dwell?.update({ documentVisible: document.visibilityState === 'visible' })
    }
    const stop = () => {
      if (stopped) return
      stopped = true
      dwell?.stop()
      clearRetry()
      observer?.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      if (firstVideoOfferHumanViewStopRef.current === stop) {
        firstVideoOfferHumanViewStopRef.current = null
      }
    }

    dwell = createHistoryFirstVideoOfferDwellController({
      dwellMs: HISTORY_FIRST_VIDEO_OFFER_DWELL_MS,
      setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimer: (timerId) => window.clearTimeout(timerId),
      onDwell: () => {
        if (!qualifies()) return
        void recorder.recordOnce().then((result) => {
          if (stopped || !dwell?.canContinue()) return
          if (result === 'not_stored' && !retryUsed) {
            retryUsed = true
            retryTimer = window.setTimeout(() => {
              retryTimer = null
              dwell?.rearm()
            }, HISTORY_FIRST_VIDEO_OFFER_RETRY_DELAY_MS)
            return
          }
          stop()
        })
      },
    })

    observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      isIntersecting = Boolean(entry?.isIntersecting)
      intersectionRatio = entry?.intersectionRatio ?? 0
      dwell?.update({
        ctaActionable: !target.disabled,
        isIntersecting,
        intersectionRatio,
      })
    }, { threshold: [HISTORY_FIRST_VIDEO_OFFER_VISIBLE_RATIO] })

    dwell.update({
      eligible: true,
      ctaActionable: !target.disabled,
      documentVisible: document.visibilityState === 'visible',
    })
    firstVideoOfferHumanViewStopRef.current = stop
    observer.observe(target)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => stop()
  }, [checkout.pending, completedVideos.length, latestVideo?.id, lightbox, subscriptionOfferEligible])

  function handleStarterCheckout(source: 'history_first_video_offer' | 'history_repeat_offer' | 'history_lightbox' = 'history_lightbox') {
    const started = checkout.launch(source, '/api/stripe/checkout?tier=starter&intro=1', {
      tier: 'starter',
      intro: true,
      pricing_surface: source,
    })
    if (!started) return
    if (source === 'history_first_video_offer') firstVideoOfferHumanViewStopRef.current?.()
    const firstVideo = source === 'history_first_video_offer'
    void trackEvent(firstVideo ? 'history_first_video_offer_clicked' : 'history_repeat_offer_clicked', {
      version: firstVideo ? 'growth_first_video_recovery_2026_08_27' : 'push28_repeat_creator',
      source,
      completed_video_count: completedVideos.length,
    })
    trackCheckoutClick('starter')
  }

  // Push #098 — blob download with a real filename (the video's title). The
  // native <a download> / the player's ⋮ "download" menu both ignore the
  // attribute on cross-origin CDN URLs and save the raw UUID file, so we fetch
  // the bytes and name them ourselves. controlsList="nodownload" hides the ⋮
  // download path so users always get the correctly-named file.
  // KINEO-DOWNLOAD-TRUTH-2026-08-04 — passa a usar lib/videoDownload, a única
  // implementação de download do produto. O que muda: o clique agora é contado
  // (`video_download_clicked`), a falha do blob deixa de ser muda e o fallback
  // deixa de ser mudo (a ENTREGA continua idêntica à de produção).
  async function handleDownload(video: Video) {
    if (!video.video_url || downloadingId) return
    setDownloadingId(video.id)
    const safeTitle = extractTitle(video.topic)
      .replace(/[\\/:*?"<>|]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80)
    const filename = safeTitle && safeTitle !== 'Untitled_Short'
      ? `${safeTitle}.mp4`
      : `shortsforge-${video.id.slice(0, 8)}.mp4`
    try {
      await downloadVideoFile({
        url: enhUrls[video.id] ?? video.video_url,
        filename,
        exportType: isWatermarkedFastAsset(video) ? 'watermarked' : 'clean',
        surface: 'history',
        videoId: video.id,
      })
      showToast('Download started')
    } finally {
      setDownloadingId(null)
    }
  }

  // KINEO-ENHANCE-VISIVEL-2026-08-17 (fundador: "cliquei no HD mas como sei
  // que virou?"): o estado agora NASCE do banco — video ja enhanced chega
  // 'done' com selo, video com job em andamento chega 'processing' e retoma
  // o polling sozinho, mesmo depois de refresh/fechar a aba.
  useEffect(() => {
    const done: Record<string, string> = {}
    const status: Record<string, 'processing' | 'done' | 'failed'> = {}
    const pending: string[] = []
    for (const v of videos) {
      if (v.enhanced_url) {
        done[v.id] = v.enhanced_url
        status[v.id] = 'done'
      } else if (v.enhance_request_id) {
        status[v.id] = 'processing'
        pending.push(v.id)
      }
    }
    if (Object.keys(status).length) {
      setEnhUrls((m) => ({ ...done, ...m }))
      setEnhStatus((m) => ({ ...status, ...m }))
    }
    pending.forEach((id) => {
      const poll = async () => {
        try {
          const r = await fetch(`/api/enhance?videoId=${id}`)
          const d = await r.json()
          if (d.status === 'done' && d.url) {
            setEnhUrls((m) => ({ ...m, [id]: d.url }))
            setEnhStatus((m) => ({ ...m, [id]: 'done' }))
            return
          }
          if (d.status === 'failed') {
            setEnhStatus((m) => ({ ...m, [id]: 'failed' }))
            return
          }
          setTimeout(poll, 7000)
        } catch {
          setTimeout(poll, 9000)
        }
      }
      poll()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // KINEO-ENHANCE-2026-08-17 — dispara o Topaz e faz polling ate o resultado.
  async function handleEnhance(video: Video, quality: 'hd' | '4k' = 'hd') {
    const cur = enhStatus[video.id]
    if (cur === 'processing') return
    if (cur === 'done' && enhUrls[video.id]) {
      await downloadVideoFile({
        url: enhUrls[video.id],
        filename: `kineo-enhanced-${video.id.slice(0, 8)}.mp4`,
        exportType: 'clean',
        surface: 'history',
        videoId: video.id,
      })
      showToast('Enhanced download started')
      return
    }
    setEnhStatus((m) => ({ ...m, [video.id]: 'processing' }))
    try {
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, quality: quality === '4k' ? '4k' : undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Enhance failed.')
      if (data.status === 'done' && data.url) {
        setEnhUrls((m) => ({ ...m, [video.id]: data.url }))
        setEnhStatus((m) => ({ ...m, [video.id]: 'done' }))
        showToast('✨ Enhanced — click HD to download')
        return
      }
      const poll = async () => {
        try {
          const r = await fetch(`/api/enhance?videoId=${video.id}`)
          const d = await r.json()
          if (d.status === 'done' && d.url) {
            setEnhUrls((m) => ({ ...m, [video.id]: d.url }))
            setEnhStatus((m) => ({ ...m, [video.id]: 'done' }))
            showToast('✨ Enhanced — click HD to download')
            return
          }
          if (d.status === 'failed') {
            setEnhStatus((m) => ({ ...m, [video.id]: 'failed' }))
            showToast(d.error ?? 'Enhance failed — credits refunded')
            return
          }
          setTimeout(poll, 6000)
        } catch {
          setTimeout(poll, 8000)
        }
      }
      setTimeout(poll, 8000)
    } catch (e) {
      setEnhStatus((m) => ({ ...m, [video.id]: 'failed' }))
      showToast(e instanceof Error ? e.message : 'Enhance failed.')
    }
  }

  function publicSharePath(video: Video): string | null {
    return buildPublicVideoSharePath(video.id, referralCode)
  }

  function publicShareUrl(video: Video): string | null {
    const path = publicSharePath(video)
    return path ? new URL(path, window.location.origin).toString() : null
  }

  // #459/#464/#PUSH29 — share the public video page by COPYING the link. WhatsApp only
  // renders the rich preview reliably when a link is PASTED (the native share
  // sheet doesn't trigger it), so we copy + the user pastes. Each shared link is
  // a landing that brings a new (pre-warmed) visitor.
  async function handleShare(video: Video, where: 'history' | 'history_spotlight' = 'history') {
    const url = publicShareUrl(video)
    if (!url) return
    const metadata = {
      version: PUBLIC_VIDEO_SHARE_VERSION,
      video_id: video.id,
      where,
      channel: 'copy_link',
      referral_attached: !!referralCode,
    }
    trackEvent('video_share_clicked', metadata)
    let copied = false
    try {
      await navigator.clipboard.writeText(url)
      copied = true
    } catch {
      // clipboard blocked (rare) — show the link so it can be copied manually
      try { window.prompt('Copy this link:', url) } catch {}
    }
    setSharedId(video.id)
    setTimeout(() => setSharedId((cur) => (cur === video.id ? null : cur)), 1800)
    trackEvent(copied ? 'video_shared' : 'video_share_manual_copy_shown', {
      ...metadata,
      method: copied ? 'clipboard' : 'manual_prompt',
    })
  }

  function handleShareChannel(video: Video, channel: 'whatsapp' | 'x') {
    const url = publicShareUrl(video)
    if (!url) return
    const metadata = {
      version: PUBLIC_VIDEO_SHARE_VERSION,
      video_id: video.id,
      where: 'history_spotlight',
      channel,
      referral_attached: !!referralCode,
    }
    void trackEvent('video_share_clicked', metadata)
    const destination = channel === 'whatsapp'
      // KINEO-SHARE-PEDE-IMITACAO-2026-08-17 — par do GenerateClient: mesma
      // troca de "peça um veredito" para "mostre o mecanismo". Ver o comentário
      // longo lá; os dois textos têm de andar juntos ou a medição mistura duas
      // mensagens diferentes no mesmo evento.
      ? `https://wa.me/?text=${encodeURIComponent(`I made this Short with AI — no camera, no editing. Watch it: ${url}`)}`
      : `https://twitter.com/intent/tweet?text=${encodeURIComponent('I made this Short with Kineo. Watch it here:')}&url=${encodeURIComponent(url)}`
    window.open(destination, '_blank', 'noopener,noreferrer')
    void trackEvent('video_share_channel_opened', metadata)
  }

  function historyReferralMetadata(channel: 'whatsapp' | 'copy_link') {
    return {
      version: PUBLIC_VIDEO_SHARE_VERSION,
      variant: HISTORY_REFERRAL_MISSION_VARIANT,
      where: 'history_private_referral',
      channel,
      referral_attached: true,
      incentive_available: true,
      incentive_credits_each: referralRewardCredits,
    }
  }

  async function handleReferralInviteCopy() {
    if (!referralInviteUrl || referralRewardCredits === null) return
    const metadata = historyReferralMetadata('copy_link')
    void trackEvent('video_share_clicked', metadata)
    let copied = false
    try {
      await navigator.clipboard.writeText(referralInviteUrl)
      copied = true
    } catch {
      try { window.prompt('Copy your Kineo invite link:', referralInviteUrl) } catch {}
    }
    setReferralInviteCopied(true)
    setTimeout(() => setReferralInviteCopied(false), 1800)
    void trackEvent(copied ? 'video_shared' : 'video_share_manual_copy_shown', {
      ...metadata,
      method: copied ? 'clipboard' : 'manual_prompt',
    })
  }

  function handleReferralInviteWhatsApp() {
    if (!referralInviteUrl || referralRewardCredits === null) return
    const metadata = historyReferralMetadata('whatsapp')
    const copy = historyReferralMissionCopy(referralRewardCredits)
    void trackEvent('video_share_clicked', metadata)
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${copy.whatsappMessage} ${referralInviteUrl}`)}`,
      '_blank',
      'noopener,noreferrer',
    )
    void trackEvent('video_share_channel_opened', metadata)
  }

  // Push #421 — open (or fetch, then open) the YouTube summary panel.
  // 1st click on an old video calls /api/video-summary (GPT generates and the
  // row caches it); every later click — this session or any future one — is
  // served from state or straight from the videos row. Zero pipeline changes.
  async function handleSummary(video: Video) {
    if (expanded === video.id) {
      setExpanded(null)
      return
    }
    if (summaries[video.id]) {
      setExpanded(video.id)
      return
    }
    // Row already has cached metadata (generated on a previous visit) —
    // no network call needed.
    if (video.youtube_description && video.hashtags && video.hashtags.length > 0) {
      setSummaries((prev) => ({
        ...prev,
        [video.id]: {
          title: extractTitle(video.topic),
          description: video.youtube_description as string,
          hashtags: video.hashtags as string[],
        },
      }))
      setExpanded(video.id)
      return
    }
    setSummaryLoading(video.id)
    setSummaryErrors((prev) => {
      const next = { ...prev }
      delete next[video.id]
      return next
    })
    try {
      const res = await fetch('/api/video-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to generate summary')
      setSummaries((prev) => ({
        ...prev,
        [video.id]: {
          title: typeof data.title === 'string' ? data.title : extractTitle(video.topic),
          description: String(data.description ?? ''),
          hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
        },
      }))
      setExpanded(video.id)
    } catch (err) {
      setSummaryErrors((prev) => ({
        ...prev,
        [video.id]: err instanceof Error ? err.message : 'Failed to generate summary',
      }))
    } finally {
      setSummaryLoading(null)
    }
  }

  function copyToClipboard(key: string, text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedKey(key)
        setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1600)
        showToast('Copied to clipboard')
      })
      .catch(() => {/* clipboard denied — nothing useful to do */})
  }

  // KINEO-HIGGSFIELD-20D dia 9 (13/08) — microconfirmacao: download e copy
  // agora respondem com um toast slide-in com check, em vez de silencio (o
  // botao ja mudava, mas o olho esta no video, nao no botao). Um por vez,
  // some sozinho em 2.2s. Rollback: remover showToast + o JSX do fim.
  const [toast, setToast] = useState<string | null>(null)
  const historyReferralCopy = referralRewardCredits === null
    ? null
    : historyReferralMissionCopy(referralRewardCredits)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  /* ── Read-failure state (KINEO-SPRINT-UI4-2026-08-29) ──
     Licao do incidente JWT-skew (28/08): ESTA tela mostrou "No videos yet" ao
     fundador com 327 videos intactos. Falha de leitura tem cara de erro. */
  if (loadError && videos.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-7">
        <div role="alert" className="rounded-2xl p-8 sm:p-12 text-center mx-auto" style={{ maxWidth: 560, marginTop: 40, background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.35)' }}>
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

  /* ── Empty state ── */
  if (videos.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-7">
        <header className="mb-7">
          <div
            className="font-black uppercase tracking-[.18em] mb-2 flex items-center gap-2"
            style={{ fontSize: '0.65rem', color: '#2997ff' }}
          >
            <span style={{ display: 'inline-block', width: 18, height: 1, background: '#2997ff', verticalAlign: 'middle' }} />
            My Videos
            <span style={{ display: 'inline-block', width: 18, height: 1, background: '#2997ff', verticalAlign: 'middle' }} />
          </div>
          <h1
            className="font-black tracking-tight"
            style={{ fontSize: 'clamp(1.55rem, 4vw, 2rem)', color: 'var(--text)', lineHeight: 1.1 }}
          >
            Your{' '}
            <span style={{ background: 'linear-gradient(180deg,#fff 35%,#a1a1a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Videos
            </span>
          </h1>
        </header>
        {/* #10 — a tela vazia e onde a promessa do #9 doia mais: quem chega
            aqui com o PRIMEIRO filme ainda no motor lia "No videos yet". */}
        <HistoryActiveRenderCard />
        {/* KINEO-HIGGSFIELD-20D dia 16 (13/08) — empty state com identidade:
            sai o fundo navy legado + emoji, entra a superficie padrao
            (#131316) e uma ilustracao no traco da marca (tres molduras 9:16
            em cascata, play azul na frente). Acabamento e o que acontece nos
            cantos vazios. */}
        <div
          className="rounded-2xl p-10 sm:p-16 text-center"
          style={{ background: '#131316', border: '1px solid var(--border)' }}
        >
          <svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden="true" style={{ display: 'block', margin: '0 auto 18px' }}>
            <rect x="14" y="14" width="38" height="66" rx="8" stroke="rgba(255,255,255,.14)" strokeWidth="1.5" transform="rotate(-6 33 47)" />
            <rect x="38" y="8" width="40" height="70" rx="8" stroke="rgba(255,255,255,.24)" strokeWidth="1.5" transform="rotate(-2 58 43)" />
            <rect x="64" y="6" width="42" height="74" rx="9" fill="rgba(41,151,255,.07)" stroke="rgba(41,151,255,.55)" strokeWidth="1.5" />
            <circle cx="85" cy="43" r="13" fill="rgba(41,151,255,.16)" stroke="#2997ff" strokeWidth="1.5" />
            <path d="M81.5 37.5v11l9-5.5z" fill="#2997ff" />
            <rect x="70" y="64" width="30" height="4" rx="2" fill="rgba(255,255,255,.16)" />
            <rect x="70" y="71" width="20" height="4" rx="2" fill="rgba(255,255,255,.09)" />
          </svg>
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>No videos yet</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Generate your first AI Short and it’ll appear here automatically.
          </p>
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white"
            style={{ background: '#2997ff', textDecoration: 'none', boxShadow: '0 6px 28px rgba(41,151,255,.4)' }}
          >
            ⚡ Generate Video
          </Link>
        </div>
      </div>
    )
  }

  const totalCredits = videos.reduce((a, v) => a + (v.credits_used ?? 1), 0)
  // RETENTION-P0-2026-07-15 — the biggest activation leak is immediately after
  // the first completed render. Turn that otherwise generic library visit into
  // a concrete episode-two action while the user's original topic is available.
  // autoanalyze keeps the next step short but still lets the user review before
  // rendering; this never spends credits or starts a render by itself.
  const firstVideoTitle = extractTitle(completedVideos[0]?.topic ?? null)
  const followUpHref = firstVideoTitle === 'Untitled Short'
    ? '/studio'
    : buildSeriesContinuationHref(firstVideoTitle, 'history_milestone')
  const showSubscriptionOffer = subscriptionOfferEligible === true && completedVideos.length >= 1
  const firstVideoSubscriptionRecovery = showSubscriptionOffer && completedVideos.length === 1
  const milestoneMode = resolveHistoryMilestoneMode({
    completedVideoCount: completedVideos.length,
    subscriptionOfferEligible: showSubscriptionOffer,
  })
  const subscriptionIsPrimary = milestoneMode === 'subscription_primary'
  const episodeIsPrimary = milestoneMode === 'episode_primary' || milestoneMode === 'episode_only'

  /* ── Main ── */
  return (
    <div className="px-4 md:px-6 py-7 pb-28">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div
            className="font-black uppercase tracking-[.18em] mb-2 flex items-center gap-2"
            style={{ fontSize: '0.65rem', color: '#2997ff' }}
          >
            <span style={{ display: 'inline-block', width: 18, height: 1, background: '#2997ff', verticalAlign: 'middle' }} />
            My Videos
            <span style={{ display: 'inline-block', width: 18, height: 1, background: '#2997ff', verticalAlign: 'middle' }} />
          </div>
          <h1
            className="font-black tracking-tight"
            style={{ fontSize: 'clamp(1.55rem, 4vw, 2rem)', color: 'var(--text)', lineHeight: 1.1 }}
          >
            Your{' '}
            <span style={{ background: 'linear-gradient(180deg,#fff 35%,#a1a1a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Videos
            </span>
          </h1>
        </div>
        <Link
          href="/studio"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white flex-shrink-0"
          style={{ background: '#2997ff', textDecoration: 'none', boxShadow: '0 4px 18px rgba(41,151,255,.35)' }}
        >
          ⚡ New Video
        </Link>
      </div>

      {/* #10 — antes de qualquer oferta: "o meu filme esta vivo?". Mesma
          ordem do KINEO-ESPERA-VENDE-2026-08-21 na tela de espera: entrega
          primeiro, oferta depois. */}
      <HistoryActiveRenderCard />

      {/* One completed video keeps episode two primary. Once a free creator has
          completed 2+ videos, repeat value is proven: make the honest recurring
          offer primary while preserving episode creation as a secondary path.
          Existing files are never presented as retroactively watermark-free. */}
      {completedVideos.length >= 1 && (
        <section
          aria-label={subscriptionIsPrimary
            ? 'Continue creating with Starter'
            : completedVideos.length === 1
              ? 'Create your second Short'
              : 'Create your next episode'}
          className="rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{
            background: subscriptionIsPrimary
              ? 'linear-gradient(135deg, rgba(41,151,255,.15), rgba(41,151,255,.05))'
              : 'linear-gradient(135deg, rgba(41,151,255,.14), rgba(41,151,255,.04))',
            border: subscriptionIsPrimary
              ? '1px solid rgba(41,151,255,.45)'
              : '1px solid rgba(41,151,255,.42)',
            boxShadow: '0 10px 32px rgba(41,151,255,.10)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              className="font-black uppercase tracking-[.16em] mb-1.5"
              style={{ fontSize: '0.62rem', color: '#5cb3ff' }}
            >
              {milestoneMode === 'episode_primary'
                ? 'First Short complete · build momentum'
                : subscriptionIsPrimary
                  ? `${completedVideos.length} Shorts complete · repeat creator`
                : completedVideos.length === 1
                  ? 'First Short complete'
                  : 'Keep your show moving'}
            </div>
            <h2 className="font-black tracking-tight mb-1.5" style={{ color: 'var(--text)', fontSize: '1.05rem' }}>
              {milestoneMode === 'episode_primary'
                ? 'Turn your first Short into episode 2'
                : subscriptionIsPrimary
                  ? 'Publish your next Short without the Kineo watermark'
                : completedVideos.length === 1
                  ? 'Turn it into episode 2'
                  : 'Create the next episode'}
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted2)', margin: 0, maxWidth: 620 }}>
              {subscriptionIsPrimary
                ? `Starter includes ${TIER_CREDITS.starter} credits each month and clean exports for new videos. ${STARTER_PRICE_USD}/month. Cancel anytime.`
                : 'Continue from your latest Short with a fresh hook, new facts and a new payoff. Review the brief and settings before rendering.'}
            </p>
            {milestoneMode === 'episode_primary' ? (
              <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--muted)', marginBottom: 0 }}>
                Prefer clean exports now? Starter includes {TIER_CREDITS.starter} credits each month for {STARTER_PRICE_USD}/month. Cancel anytime.
              </p>
            ) : subscriptionIsPrimary ? (
              <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--muted)', marginBottom: 0 }}>
                Your existing files stay available. Starter applies to new exports after checkout.
              </p>
            ) : cleanExportLocked === true ? (
              <p className="text-xs leading-relaxed mt-2" style={{ color: '#5cb3ff', marginBottom: 0 }}>
                <FreeTierCopy legacy="Fast includes up to 3 watermarked previews per 24 hours. Download and share them free; Starter unlocks clean watermark-free exports." on="Free accounts include 1 watermarked Fast video per month. Download and share it free; Starter unlocks clean watermark-free exports." />
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto flex-shrink-0">
            {episodeIsPrimary && (
              <Link
                href={followUpHref}
                onClick={() => {
                  void trackEvent('series_continue_clicked', {
                    source: 'history_milestone',
                    video_id: completedVideos[0]?.id ?? null,
                    completed_video_count: completedVideos.length,
                  })
                }}
                className="flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black text-white"
                style={{
                  background: 'linear-gradient(135deg, #2997ff, #1d6fe0)',
                  border: '1px solid transparent',
                  textDecoration: 'none',
                  boxShadow: '0 6px 22px rgba(41,151,255,.30)',
                }}
              >
                {completedVideos.length === 1 ? 'Build Episode 2 →' : 'Build Next Episode →'}
              </Link>
            )}
            {showSubscriptionOffer && (
              <button
                ref={firstVideoSubscriptionRecovery ? firstVideoOfferCtaRef : undefined}
                type="button"
                onClick={() => handleStarterCheckout(firstVideoSubscriptionRecovery ? 'history_first_video_offer' : 'history_repeat_offer')}
                disabled={checkout.pending !== null}
                className="flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black text-white"
                style={{
                  background: subscriptionIsPrimary ? '#2997ff' : 'rgba(255,255,255,.08)',
                  border: subscriptionIsPrimary ? 'none' : '1px solid rgba(255,255,255,.14)',
                  cursor: checkout.pending ? 'wait' : 'pointer',
                  opacity: checkout.pending ? 0.7 : 1,
                  boxShadow: subscriptionIsPrimary ? '0 6px 22px rgba(41,151,255,.30)' : 'none',
                }}
              >
                {checkout.pending === (firstVideoSubscriptionRecovery ? 'history_first_video_offer' : 'history_repeat_offer')
                  ? 'Loading…'
                  : subscriptionIsPrimary
                    ? `Continue with Starter · ${STARTER_PRICE_USD} →`
                    : `See Starter · ${STARTER_PRICE_USD}/month`}
              </button>
            )}
            {showSubscriptionOffer && checkout.error && (
              <p role="alert" className="text-xs font-semibold" style={{ color: '#ff6b6b' }}>
                {checkout.error}
              </p>
            )}
            {subscriptionIsPrimary && (
              <Link
                href={followUpHref}
                onClick={() => {
                  void trackEvent('series_continue_clicked', {
                    source: 'history_milestone',
                    video_id: completedVideos[0]?.id ?? null,
                    completed_video_count: completedVideos.length,
                  })
                }}
                className="flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black text-white"
                style={{
                  background: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(255,255,255,.14)',
                  textDecoration: 'none',
                  boxShadow: 'none',
                }}
              >
                Build Next Episode First
              </Link>
            )}
          </div>
        </section>
      )}

      {affiliateMomentumEligible ? (
        <AffiliateMomentumCard completedVideoCount={completedVideos.length} />
      ) : null}

      {latestVideo && PUBLIC_VIDEO_SHARING_ENABLED && (
        <section
          ref={sharePromptRef}
          aria-label="Share your latest Short for feedback"
          className="rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,.14), rgba(41,151,255,.05))',
            border: '1px solid rgba(167,139,250,.42)',
            boxShadow: '0 10px 32px rgba(139,92,246,.09)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              className="font-black uppercase tracking-[.16em] mb-1.5"
              style={{ fontSize: '0.62rem', color: '#c4b5fd' }}
            >
              Free distribution · latest Short
            </div>
            <h2 className="font-black tracking-tight mb-1.5" style={{ color: 'var(--text)', fontSize: '1.05rem' }}>
              Send it to one person for feedback
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted2)', margin: 0, maxWidth: 620 }}>
              Copy a public watch page for your finished video. Your friend can watch it without logging in, then use “Make one like this” if the idea inspires them.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => handleShare(latestVideo, 'history_spotlight')}
              className="flex-1 sm:flex-none rounded-xl px-5 py-3 text-sm font-black text-white"
              style={{
                minWidth: 150,
                background: 'linear-gradient(135deg, #7c3aed, #2997ff)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 22px rgba(124,58,237,.28)',
              }}
            >
              {sharedId === latestVideo.id ? '✓ Watch page copied' : 'Copy watch page →'}
            </button>
            <button
              type="button"
              onClick={() => handleShareChannel(latestVideo, 'whatsapp')}
              className="rounded-xl px-4 py-3 text-sm font-black"
              style={{
                background: 'rgba(37,211,102,.11)',
                border: '1px solid rgba(37,211,102,.38)',
                color: '#25D366',
                cursor: 'pointer',
              }}
            >
              WhatsApp
            </button>
            <a
              href={publicSharePath(latestVideo) ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl px-4 py-3 text-sm font-black"
              style={{
                background: 'rgba(255,255,255,.06)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                textDecoration: 'none',
              }}
            >
              Preview
            </a>
          </div>
        </section>
      )}

      {latestVideo && !PUBLIC_VIDEO_SHARING_ENABLED && historyReferralCopy && referralInviteUrl ? (
        <section
          ref={referralMissionRef}
          aria-label="Invite one creator while keeping your video private"
          className="rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(37,211,102,.15), rgba(41,151,255,.08))',
            border: '1px solid rgba(37,211,102,.46)',
            boxShadow: '0 10px 32px rgba(37,211,102,.10)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="font-black uppercase tracking-[.16em] mb-1.5" style={{ fontSize: '0.62rem', color: '#5cb3ff' }}>
              {historyReferralCopy.eyebrow}
            </div>
            <h2 className="font-black tracking-tight mb-1.5" style={{ color: 'var(--text)', fontSize: '1.05rem' }}>
              {historyReferralCopy.headline}
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted2)', margin: 0, maxWidth: 680 }}>
              {historyReferralCopy.description}
            </p>
            <p className="text-xs leading-relaxed mt-2" style={{ color: '#8ecbff', marginBottom: 0, maxWidth: 680 }}>
              🔒 {historyReferralCopy.privacyNote}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto flex-shrink-0">
            <button
              type="button"
              onClick={handleReferralInviteWhatsApp}
              className="flex-1 sm:flex-none rounded-xl px-5 py-3 text-sm font-black text-white"
              style={{
                minWidth: 150,
                background: 'linear-gradient(135deg, #25D366, #128C4A)',
                border: '1px solid rgba(37,211,102,.45)',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(37,211,102,.24)',
              }}
            >
              {historyReferralCopy.primaryAction}
            </button>
            <button
              type="button"
              onClick={handleReferralInviteCopy}
              className="flex-1 sm:flex-none rounded-xl px-4 py-3 text-sm font-black"
              style={{
                background: 'rgba(255,255,255,.06)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              {referralInviteCopied ? '✓ Invite link copied' : 'Copy invite link'}
            </button>
          </div>
        </section>
      ) : latestVideo && !PUBLIC_VIDEO_SHARING_ENABLED ? (
        <section
          aria-label="Private sharing notice"
          className="rounded-2xl p-5 sm:p-6 mb-6"
          style={{
            background: 'rgba(41,151,255,.06)',
            border: '1px solid rgba(41,151,255,.24)',
          }}
        >
          <div className="font-black uppercase tracking-[.16em] mb-1.5" style={{ fontSize: '0.62rem', color: '#7cc0ff' }}>
            Private by default
          </div>
          <h2 className="font-black tracking-tight mb-1.5" style={{ color: 'var(--text)', fontSize: '1.05rem' }}>
            Public watch links are temporarily paused
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted2)', margin: 0, maxWidth: 680 }}>
            Your video stays in your account. Download the MP4 if you want to send it directly; Kineo will not publish a public page without an explicit visibility choice.
          </p>
        </section>
      ) : null}

      {/* Stats */}
      <div
        className="inline-flex items-center gap-px mb-6 rounded-2xl overflow-hidden"
        style={{ background: '#161618', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {[
          { val: String(videos.length), label: 'Videos' },
          { val: String(totalCredits), label: 'Credits Used' },
        ].map((s, i) => (
          <div
            key={s.label}
            className="flex flex-col items-center px-5 py-2.5"
            style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
          >
            <span
              className="font-black text-lg leading-none"
              style={{ background: 'linear-gradient(180deg,#fff 35%,#a1a1a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              {s.val}
            </span>
            <span style={{ fontSize: '0.67rem', color: 'var(--muted)', marginTop: 2 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* sprint-ui #9 — busca por titulo/tema (so aparece com acervo de verdade) */}
      {videos.length >= 6 && (
        <div className="mb-5" style={{ position: 'relative', maxWidth: 420 }}>
          <span aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.55 }}>🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your videos…"
            aria-label="Search your videos by title or topic"
            className="w-full rounded-xl"
            style={{ background: '#161618', border: '1px solid rgba(255,255,255,0.09)', color: 'var(--text, #f5f5f7)', fontSize: 16, padding: '11px 14px 11px 38px', outline: 'none' }}
          />
        </div>
      )}

      {query.trim() && visibleVideos.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: '#161618', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)', margin: 0 }}>
            No videos match &ldquo;{query.trim()}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-bold"
            style={{ background: 'rgba(41,151,255,.12)', border: '1px solid rgba(41,151,255,.4)', color: '#2997ff', cursor: 'pointer' }}
          >
            Clear search
          </button>
        </div>
      )}

      {/* Video grid — compact 9:16 cards, 2-3 per row on mobile */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
          gap: '12px',
        }}
      >
        {visibleVideos.map((video) => {
          const title = extractTitle(video.topic)
          const isExpanded = expanded === video.id
          const state = classifyVideoState(video)

          // PUSH #92 — processing / failed / timed-out renders get a small,
          // honest card instead of being hidden. Only 'completed' renders the
          // full card (preview, download, share, summary panel) below, since
          // that's the only state guaranteed to have a playable video_url.
          if (state !== 'completed') {
            const isProcessing = state === 'processing'
            return (
              <div
                key={video.id}
                style={{
                  background: '#161618',
                  border: `1px solid ${isProcessing ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.25)'}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0,0,0,.3)',
                }}
              >
                <div
                  className={isProcessing ? 'shimmer-overlay' : undefined}
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '177.78%',
                    overflow: 'hidden',
                    background: isProcessing
                      ? 'linear-gradient(135deg, rgba(41,151,255,.10), #161618)'
                      : 'rgba(239,68,68,0.06)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: 16,
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '1.6rem' }} aria-hidden="true">
                      {isProcessing ? '⏳' : '⚠️'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: isProcessing ? '#5cb3ff' : '#f87171',
                        lineHeight: 1.35,
                      }}
                    >
                      {isProcessing
                        ? "Still rendering — we'll email you when it's ready"
                        : failedCardCopy(video, state)}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '7px 8px 8px' }}>
                  <p
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--text)',
                      lineHeight: 1.3,
                      marginBottom: 5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {title}
                  </p>

                  {isProcessing ? (
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>
                      {formatStarted(video.created_at)}
                    </span>
                  ) : (
                    <Link
                      href={tryAgainHref(video)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 8px',
                        borderRadius: 7,
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.32)',
                        color: '#f87171',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        textDecoration: 'none',
                      }}
                    >
                      Try again →
                    </Link>
                  )}
                </div>
              </div>
            )
          }

          return (
            <div
              key={video.id}
              style={{
                background: '#161618',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,.3)',
              }}
            >
              {/* 9:16 video area */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  paddingTop: '177.78%',
                  background: '#000',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', inset: 0 }}>
                  {errors.has(video.id) ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#161618',
                        gap: 10,
                        padding: 16,
                      }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                      <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700, textAlign: 'center' }}>
                        Video unavailable
                      </span>
                      <a
                        href={video.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        style={{ fontSize: '0.7rem', color: '#2997ff', textDecoration: 'underline' }}
                      >
                        ⬇ Download
                      </a>
                    </div>
                  ) : (
                    <div
                      id={`v-${video.id}`}
                      onClick={() => setLightbox(video.id)}
                      style={{
                        scrollMarginTop: 80,
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        cursor: 'pointer',
                        background: '#000',
                      }}
                    >
                      {/* Video preview — first frame shown via preload="metadata".
                          KINEO-ENHANCE-VISIVEL-2026-08-17: com HD pronto, o
                          card passa a tocar a VERSAO ENHANCED + selo HD.
                          KINEO-UI-DIARIO-2026-08-17 (item 23): o <video> agora
                          monta no IntersectionObserver — ver HistoryCardFrame. */}
                      <HistoryCardFrame src={enhUrls[video.id] ?? video.video_url} />
                      {enhStatus[video.id] === 'done' && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 2,
                            fontSize: '0.55rem',
                            fontWeight: 800,
                            letterSpacing: '0.06em',
                            padding: '2px 7px',
                            borderRadius: 99,
                            background: 'rgba(52,211,153,0.15)',
                            border: '1px solid rgba(52,211,153,0.45)',
                            color: '#34d399',
                          }}
                        >
                          ✨ HD
                        </span>
                      )}
                      {/* Dark overlay so play button is always visible */}
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
                      {/* Play button */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'rgba(41,151,255,0.18)',
                            border: '2px solid rgba(41,151,255,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 18px rgba(41,151,255,0.3)',
                          }}
                        >
                          <span style={{ fontSize: 15, marginLeft: 2, color: '#2997ff' }}>▶</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Info below video */}
              <div style={{ padding: '7px 8px 8px' }}>
                <p
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    lineHeight: 1.3,
                    marginBottom: 5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {title}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{formatDate(video.created_at)}</span>
                  {video.quality_mode && (
                    <span
                      style={{
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: 4,
                        background: 'rgba(41,151,255,0.12)',
                        border: '1px solid rgba(41,151,255,0.25)',
                        color: '#2997ff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {video.quality_mode === 'cinematic' ? '✨ AI' : '⚡'}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleDownload(video)}
                    disabled={downloadingId === video.id}
                    title={isWatermarkedFastAsset(video) ? 'Download MP4 with Kineo watermark' : 'Download clean MP4'}
                    aria-label={isWatermarkedFastAsset(video) ? 'Download MP4 with Kineo watermark' : 'Download clean MP4'}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                      padding: '5px 4px',
                      borderRadius: 6,
                      background: 'rgba(41,151,255,0.08)',
                      border: '1px solid rgba(41,151,255,0.2)',
                      color: '#2997ff',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      cursor: downloadingId === video.id ? 'wait' : 'pointer',
                    }}
                  >
                    {downloadingId === video.id ? '…' : isWatermarkedFastAsset(video) ? '⬇ WM' : '⬇'}
                  </button>
                  {/* KINEO-ENHANCE-2026-08-17 — Topaz film polish, 10 cr */}
                  <button
                    onClick={() => handleEnhance(video)}
                    disabled={enhStatus[video.id] === 'processing'}
                    title="Enhance — Topaz film polish (sharper, cleaner, film grain) · 10 credits"
                    aria-label="Enhance video · 10 credits"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                      padding: '5px 4px',
                      borderRadius: 6,
                      background: enhStatus[video.id] === 'done' ? 'rgba(52,211,153,0.10)' : 'rgba(41,151,255,0.08)',
                      border: enhStatus[video.id] === 'done' ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(41,151,255,0.2)',
                      color: enhStatus[video.id] === 'done' ? '#34d399' : '#2997ff',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      cursor: enhStatus[video.id] === 'processing' ? 'wait' : 'pointer',
                    }}
                  >
                    {enhStatus[video.id] === 'processing' ? '✨…' : enhStatus[video.id] === 'done' ? '✨ HD ✓' : '✨ HD'}
                  </button>
                  {/* KINEO-4K-2026-08-18 — Export 4K (Topaz 2x) antes do 1º enhance */}
                  {!enhStatus[video.id] && (
                    <button
                      onClick={() => handleEnhance(video, '4k')}
                      title="Export in 4K — Topaz 2x upscale (2160×3840) · 40 credits"
                      aria-label="Export 4K · 40 credits"
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                        padding: '5px 4px', borderRadius: 6,
                        background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)',
                        color: '#c084fc', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      4K
                    </button>
                  )}

                  {/* #459 — share the public /v/[id] page */}
                  {PUBLIC_VIDEO_SHARING_ENABLED ? (
                    <button
                      onClick={() => handleShare(video)}
                      title="Share public link"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                        padding: '5px 4px',
                        borderRadius: 6,
                        background: 'rgba(41,151,255,0.1)',
                        border: '1px solid rgba(41,151,255,0.25)',
                        color: '#2997ff',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {sharedId === video.id ? '✓ Copied' : '🔗 Copy'}
                    </button>
                  ) : (
                    <span
                      title="Public links are paused; download the MP4 to share directly"
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '5px 4px', borderRadius: 6, background: 'rgba(255,255,255,.05)',
                        border: '1px solid var(--border)', color: 'var(--muted2)', fontSize: '0.6rem', fontWeight: 700,
                      }}
                    >
                      Private
                    </span>
                  )}

                  <a
                    href="https://studio.youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                      padding: '5px 4px',
                      borderRadius: 6,
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#F87171',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    ▶ YT
                  </a>

                  {/* Push #421 — YouTube summary (title + description + hashtags) */}
                  <button
                    onClick={() => handleSummary(video)}
                    disabled={summaryLoading === video.id}
                    title="YouTube title, description & hashtags"
                    aria-label="YouTube title, description & hashtags"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                      padding: '5px 4px',
                      borderRadius: 6,
                      background: isExpanded ? 'rgba(41,151,255,0.18)' : 'rgba(41,151,255,0.08)',
                      border: '1px solid rgba(41,151,255,0.25)',
                      color: '#2997ff',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      cursor: summaryLoading === video.id ? 'wait' : 'pointer',
                    }}
                  >
                    {summaryLoading === video.id ? '…' : '📋'}
                  </button>
                </div>

                <Link
                  href={buildSeriesContinuationHref(title, 'history_video_card')}
                  onClick={() => {
                    void trackEvent('series_continue_clicked', {
                      source: 'history_video_card',
                      video_id: video.id,
                    })
                  }}
                  style={{
                    marginTop: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 8px',
                    borderRadius: 7,
                    background: 'rgba(41,151,255,0.12)',
                    border: '1px solid rgba(41,151,255,0.32)',
                    color: '#5cb3ff',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                  }}
                >
                  Next episode →
                </Link>

                {isWatermarkedFastAsset(video) && (
                  <p style={{ margin: '5px 0 0', color: 'var(--muted2)', fontSize: '0.54rem', textAlign: 'center', lineHeight: 1.25 }}>
                    Free MP4 includes the Kineo watermark
                  </p>
                )}

                {/* Push #421 — summary fetch error */}
                {summaryErrors[video.id] && !isExpanded && (
                  <p style={{ marginTop: 6, fontSize: '0.6rem', color: '#f87171', lineHeight: 1.4 }}>
                    {summaryErrors[video.id]}
                  </p>
                )}

                {/* Push #421 — expanded YouTube summary panel */}
                {isExpanded && summaries[video.id] && (() => {
                  const s = summaries[video.id]
                  const hashtagLine = s.hashtags.join(' ')
                  const copyAll = [s.title, '', s.description, '', hashtagLine]
                    .filter((part) => part !== null)
                    .join('\n')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim()
                  const section = (key: string, label: string, text: string) => (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2997ff' }}>
                          {label}
                        </span>
                        <button
                          onClick={() => copyToClipboard(key, text)}
                          style={{
                            padding: '2px 7px',
                            borderRadius: 5,
                            background: copiedKey === key ? 'rgba(41,151,255,0.15)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${copiedKey === key ? 'rgba(41,151,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            color: copiedKey === key ? '#4ADE80' : 'var(--muted)',
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {copiedKey === key ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <p
                        style={{
                          fontSize: '0.66rem',
                          color: 'var(--text)',
                          lineHeight: 1.45,
                          whiteSpace: 'pre-wrap',
                          maxHeight: 110,
                          overflowY: 'auto',
                          margin: 0,
                        }}
                      >
                        {text}
                      </p>
                    </div>
                  )
                  return (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '9px 10px',
                        borderRadius: 8,
                        background: 'rgba(41,151,255,0.05)',
                        border: '1px solid rgba(41,151,255,0.18)',
                      }}
                    >
                      {s.title && section(`${video.id}-title`, 'Title', s.title)}
                      {section(`${video.id}-desc`, 'Description', s.description)}
                      {s.hashtags.length > 0 && section(`${video.id}-tags`, 'Hashtags', hashtagLine)}
                      <button
                        onClick={() => copyToClipboard(`${video.id}-all`, copyAll)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 7,
                          border: 'none',
                          background: copiedKey === `${video.id}-all`
                            ? '#2997ff'
                            : '#2997ff',
                          color: '#fff',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        {copiedKey === `${video.id}-all` ? '✓ Copied!' : '📋 Copy All'}
                      </button>
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Push #098 — big-player overlay (the large view). Clicking a card opens
          the Short here with a download button that always saves the correctly
          named MP4. controlsList="nodownload" removes the ⋮ menu's raw download. */}
      {lightbox && (() => {
        const v = videos.find((x) => x.id === lightbox)
        if (!v) return null
        return (
          <div
            onClick={() => setLightbox(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.86)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            {/* KINEO-QUADRO-QUE-SE-AJUSTA-2026-09-02 — a coluna do lightbox e a
                moldura abaixo nasciam verticais e ficavam verticais. Com o
                multi-formato no ar, `data-kineo-frame` deixa lib/frameFit
                reajustar as duas ao quadro real do arquivo. */}
            <div onClick={(e) => e.stopPropagation()} data-kineo-frame-shell style={{ width: 'min(420px, 92vw)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div data-kineo-frame data-kineo-frame-wide="min(820px, 94vw)" style={{ position: 'relative', width: '100%', aspectRatio: '9 / 16', borderRadius: 16, overflow: 'hidden', background: '#000', border: '1px solid rgba(41,151,255,0.4)', boxShadow: '0 18px 60px rgba(41,151,255,0.25)' }}>
                <video
                  src={enhUrls[v.id] ?? v.video_url}
                  controls
                  autoPlay
                  playsInline
                  controlsList="nodownload"
                  disablePictureInPicture
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onLoadedMetadata={(e) => fitLightboxFrame(e.currentTarget)}
                  onError={() => setErrors((prev) => new Set([...prev, v.id]))}
                />
              </div>
              <button
                onClick={() => handleDownload(v)}
                disabled={downloadingId === v.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: downloadingId === v.id ? 'wait' : 'pointer', background: '#2997ff', color: '#fff', fontWeight: 800, fontSize: '0.95rem', boxShadow: '0 8px 28px rgba(41,151,255,0.35)' }}
              >
                {downloadingId === v.id
                  ? 'Downloading…'
                  : isWatermarkedFastAsset(v)
                    ? '⬇ Download with Kineo watermark (MP4)'
                    : '⬇ Download clean MP4'}
              </button>
              {isWatermarkedFastAsset(v) && cleanExportLocked === true && (
                <button
                  onClick={() => handleStarterCheckout('history_lightbox')}
                  disabled={checkout.pending !== null}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, width: '100%', padding: '13px 10px', borderRadius: 14, cursor: checkout.pending ? 'wait' : 'pointer', opacity: checkout.pending ? 0.7 : 1, background: 'linear-gradient(135deg, #2997ff, #1d6fe0)', border: '1px solid transparent', color: '#fff', fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 8px 28px rgba(41,151,255,0.35)' }}
                >
                  {checkout.pending === 'history_lightbox' ? (
                    <span>Loading…</span>
                  ) : (
                    <>
                      <span>Unlock clean exports — Start Starter for {STARTER_PRICE_USD}</span>
                      {/* KINEO-PRICING-V6-2026-08-19 — "then $X/month" insinuava
                          um preço de entrada diferente do de renovação. Não há
                          intro em nenhum plano: é o MESMO valor todo mês. */}
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.9 }}>For new videos · {STARTER_PRICE_USD}/month · cancel anytime</span>
                    </>
                  )}
                </button>
              )}
              {isWatermarkedFastAsset(v) && cleanExportLocked === true && checkout.error && (
                <p role="alert" style={{ color: '#ff6b6b', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', margin: 0 }}>
                  {checkout.error}
                </p>
              )}
              {/* KINEO-WALL-2026-08-03 — gancho de retenção, uma linha, logo
                  depois do download: quem acabou de baixar é exatamente quem
                  está prestes a postar. Leva ao mesmo fluxo que já existe (o
                  campo "cola o link" na tela de sucesso do /generate) e à
                  página pública /wall. Sem estado novo, sem redesenho, sem
                  encostar em paywall ou créditos. */}
              <p style={{ margin: 0, textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Published it?{' '}
                <a
                  href="/wall"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}
                >
                  Paste the link and get on the wall →
                </a>
              </p>
              <button
                onClick={() => setLightbox(null)}
                style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--muted)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        )
      })()}
      {/* Dia 9 — toast de confirmacao (download/copy) */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '11px 18px',
            borderRadius: 999,
            background: 'rgba(20,20,22,.92)',
            border: '1px solid rgba(41,151,255,.35)',
            boxShadow: '0 12px 40px rgba(0,0,0,.55)',
            color: '#f5f5f7',
            fontSize: '0.85rem',
            fontWeight: 700,
            backdropFilter: 'blur(10px)',
            animation: 'ktoast-in 250ms cubic-bezier(.16,1,.3,1) both',
          }}
        >
          <style>{'@keyframes ktoast-in{from{opacity:0;transform:translate(-50%,14px)}to{opacity:1;transform:translate(-50%,0)}}@keyframes ktoast-check{from{stroke-dashoffset:20}to{stroke-dashoffset:0}}'}</style>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="#2997ff" strokeWidth="1.5" />
            <path
              d="M4.8 8.2l2.2 2.2 4.2-4.6"
              stroke="#2997ff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeDasharray: 20, animation: 'ktoast-check 300ms 120ms cubic-bezier(.16,1,.3,1) both' }}
            />
          </svg>
          {toast}
        </div>
      )}
    </div>
  )
}
