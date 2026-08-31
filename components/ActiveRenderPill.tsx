'use client'

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-GLOBAL-RENDER-PILL-2026-08-05 — "take me back to my render", anywhere.
//
// THE INCIDENT (05/08, the founder himself): he started a render, navigated
// away from /generate (viral-now, history, pricing — anywhere), and the video
// was simply GONE from the UI. It kept rendering server-side and it landed in
// `videos`, but nothing on screen said so and nothing offered a way back.
//
// The server truth already exists: /api/compose/active (KINEO-RESUME-RENDER-
// 2026-08-04) answers rendering | completed | none for the signed-in user.
// GenerateClient already consumes it — but ONLY on /generate. This component
// carries that same answer to every other dashboard page as a small floating
// pill.
//
// DELIBERATELY NOT A SECOND RENDER POLLER. The pill never talks to
// /api/compose/status and never touches Creatomate; the "Check progress"
// action just NAVIGATES to /generate, where the existing card + its
// resumeServerActiveRender() path take over the real polling. One render
// state machine, still, exactly where it already lives.
//
// Cost control (this thing is mounted on every authenticated page):
//   • one probe on mount and on route change (throttled to 1 per 10s)
//   • while a render is live: one probe every 15s
//   • state 'none' → NO interval at all (the common case costs nothing)
//   • tab hidden → interval torn down; a fresh probe fires on return
//     (visibilitychange), so a render that finished in the background shows
//     up the moment the user comes back.
//
// Suppressed on /generate: that page already renders the same two cards, and
// two copies of the same sentence on one screen is noise, not reassurance.
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { buildSeriesContinuationHref } from '@/lib/seriesContinuation'
// KINEO-SPRINT-V1V4-2026-08-31 (#15) — a fila da espera (#14) so existia numa
// tela. O proprio "Watch" desta pilula manda a pessoa para /history, onde a
// ideia guardada NAO aparece: a promessa "it'll be waiting" morria no primeiro
// clique. A pilula e a unica superficie global do produto autenticado — e
// portanto o unico lugar onde a fila pode cumprir a promessa em qualquer pagina.
import {
  lerIdeiaDaFila,
  limparFila,
  type IdeiaNaFila,
} from '@/lib/proximoEpisodioFila'

const POLL_MS = 15000
const MIN_PROBE_GAP_MS = 10000
// Remembers the LAST video the user waved away, so a dismissed "ready" pill
// never comes back for that video — but the next render still gets one.
const DISMISS_KEY = 'kineo_render_pill_dismissed'

type Probe =
  | { state: 'rendering'; renderId: string | null; startedAtMs: number }
  | { state: 'completed'; videoId: string | null; title: string | null; seriesSeed: string | null }
  | null

function formatElapsedShort(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`
}

function probeIdentity(probe: Probe): string {
  if (!probe) return ''
  return probe.state === 'rendering'
    ? `r:${probe.renderId ?? 'pending'}`
    : `v:${probe.videoId ?? 'unknown'}`
}

export default function ActiveRenderPill() {
  const pathname = usePathname()
  const router = useRouter()
  // /generate owns this information already (server-truth resume cards).
  // KINEO-STUDIO-PORTA-UNICA-2026-08-25: o GenerateClient mora agora em
  // /studio/create (o /generate virou porteiro) — a supressão acompanha a
  // mudança, senão o card de resume e a pílula aparecem JUNTOS na mesma tela.
  const suppressed =
    (pathname ?? '').startsWith('/generate') || (pathname ?? '').startsWith('/studio/create')

  const [probe, setProbe] = useState<Probe>(null)
  const [tick, setTick] = useState(() => Date.now())
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const [visible, setVisible] = useState(true)
  const inFlightRef = useRef(false)
  const lastProbeAtRef = useRef(0)
  const shownRef = useRef<string>('')
  // #15 — a ideia guardada na espera, lida do localStorage. Relida a cada
  // troca de rota e a cada volta de aba: a fila pode ter sido escrita (ou
  // usada) em OUTRA aba, e uma pilula que promete uma ideia que ja foi gasta
  // seria pior do que nenhuma pilula.
  const [fila, setFila] = useState<IdeiaNaFila | null>(null)
  const filaShownRef = useRef<string>('')

  useEffect(() => {
    try {
      setDismissedId(localStorage.getItem(DISMISS_KEY))
    } catch {
      /* private mode — the pill just stays dismissible per session */
    }
  }, [])

  useEffect(() => {
    if (suppressed) {
      // Em /studio/create o cartao da propria tela e o dono da fila; duas
      // vozes falando da mesma ideia na mesma tela e ruido.
      setFila(null)
      return
    }
    setFila(lerIdeiaDaFila())
    const onVisible = () => {
      if (document.visibilityState === 'visible') setFila(lerIdeiaDaFila())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [suppressed, pathname])

  const runProbe = useCallback(
    async (force: boolean) => {
      if (suppressed) return
      if (inFlightRef.current) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      const now = Date.now()
      if (!force && now - lastProbeAtRef.current < MIN_PROBE_GAP_MS) return
      inFlightRef.current = true
      lastProbeAtRef.current = now
      try {
        const res = await fetch('/api/compose/active', { cache: 'no-store' })
        if (!res.ok) {
          // 401 (signed out) or a degraded probe: show nothing, never a wrong
          // claim about someone's video.
          setProbe(null)
          return
        }
        const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
        let next: Probe = null
        if (data && data.state === 'rendering') {
          const startedAtMs = Date.parse(typeof data.started_at === 'string' ? data.started_at : '')
          next = {
            state: 'rendering',
            renderId:
              typeof data.render_id === 'string' && data.render_id.trim() ? data.render_id.trim() : null,
            startedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : Date.now(),
          }
        } else if (data && data.state === 'completed') {
          next = {
            state: 'completed',
            videoId: typeof data.video_id === 'string' && data.video_id ? data.video_id : null,
            title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : null,
            seriesSeed:
              typeof data.series_seed === 'string' && data.series_seed.trim()
                ? data.series_seed.trim()
                : typeof data.title === 'string' && data.title.trim()
                  ? data.title.trim()
                  : null,
          }
        }
        setProbe(next)
        setTick(Date.now())
      } catch {
        // silent — a floating hint must never break the page it floats over
      } finally {
        inFlightRef.current = false
      }
    },
    [suppressed],
  )

  // Mount + every route change. A render started on /generate is picked up the
  // moment the user navigates away — which is exactly when they need the pill.
  useEffect(() => {
    void runProbe(false)
  }, [pathname, runProbe])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVisibility = () => {
      const isVisible = document.visibilityState === 'visible'
      setVisible(isVisible)
      if (isVisible) void runProbe(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [runProbe])

  // Poll ONLY while something is actually happening and the tab is in front.
  // Keyed on a boolean, not on the probe object, so a probe that confirms the
  // same state does not tear down and rebuild the interval every 15s.
  const hasActiveRender = probe !== null
  useEffect(() => {
    if (suppressed || !visible || !hasActiveRender) return
    const id = setInterval(() => void runProbe(true), POLL_MS)
    return () => clearInterval(id)
  }, [suppressed, visible, hasActiveRender, runProbe])

  // Local 1s clock for the elapsed label — no network involved.
  useEffect(() => {
    if (suppressed || !visible || probe?.state !== 'rendering') return
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [suppressed, visible, probe?.state])

  const identity = probeIdentity(probe)
  const hidden =
    suppressed || !probe || (probe.state === 'completed' && dismissedId != null && dismissedId === identity)

  useEffect(() => {
    if (hidden || !probe) return
    if (shownRef.current === identity) return
    shownRef.current = identity
    void trackEvent('active_render_pill_shown', {
      state: probe.state,
      render_id: probe.state === 'rendering' ? probe.renderId : null,
      video_id: probe.state === 'completed' ? probe.videoId : null,
      path: pathname ?? null,
    })
  }, [hidden, probe, identity, pathname])

  // Impressao da pilula de fila. Chave = a propria semente, para uma troca de
  // rota nao recontar a mesma ideia.
  const filaPillVisible = !suppressed && fila !== null && probe?.state !== 'rendering'
  useEffect(() => {
    if (!filaPillVisible || !fila) return
    if (filaShownRef.current === fila.seed) return
    filaShownRef.current = fila.seed
    void trackEvent('next_idea_pill_shown', {
      chars: fila.seed.length,
      queued_at_stage: fila.stage ?? null,
      with_ready_video: probe?.state === 'completed',
      path: pathname ?? null,
    })
  }, [filaPillVisible, fila, probe?.state, pathname])

  // #15 — a fila so pode virar botao quando NAO ha render em voo. Com um render
  // rodando, o gate de render ativo recusaria o segundo, e o botao seria mentira
  // (a mesma trava que a #14 respeitou na tela de espera).
  const filaVisivel = !suppressed && fila !== null && probe?.state !== 'rendering'

  function handleFilaGo(ideia: IdeiaNaFila) {
    void trackEvent('next_idea_started', {
      source: 'render_pill',
      waited_s: Math.max(0, Math.floor((Date.now() - ideia.savedAt) / 1000)),
      queued_at_stage: ideia.stage ?? null,
      path: pathname ?? null,
    })
    limparFila()
    setFila(null)
    // Mesmo endereco que a tela de video pronto usa (idea_source distingue de
    // onde partiu), para existir UM caminho de "2o video pela fila" no produto.
    router.push(
      `/generate?${new URLSearchParams({
        prompt: ideia.seed,
        autoanalyze: '1',
        idea_source: 'wait_queue_pill',
      }).toString()}`,
    )
  }

  function handleFilaDismiss() {
    void trackEvent('next_idea_cleared', { source: 'render_pill', path: pathname ?? null })
    limparFila()
    setFila(null)
  }

  if (hidden || !probe) {
    // Sem render e sem aviso de pronto — mas com uma ideia guardada. Este e o
    // caminho de volta que os 31 medidos (presentes no site depois do 1o video,
    // zero cliques em gerar) nao tinham em pagina nenhuma.
    if (!filaVisivel || !fila) return null
    return <FilaLinedUpPill ideia={fila} onGo={handleFilaGo} onDismiss={handleFilaDismiss} />
  }

  const isRendering = probe.state === 'rendering'
  const accent = isRendering ? '#2997ff' : '#22c55e'

  function handleAction() {
    if (!probe) return
    void trackEvent('active_render_pill_clicked', {
      state: probe.state,
      action: probe.state === 'rendering' ? 'resume' : 'watch',
      render_id: probe.state === 'rendering' ? probe.renderId : null,
      video_id: probe.state === 'completed' ? probe.videoId : null,
      path: pathname ?? null,
    })
    // O card de resume (dono do polling real) mora em /studio/create desde a
    // porta única — mandar para /generate sem query cairia no SELETOR do
    // /studio e o resume sumiria da tela. /history é onde o vídeo pronto vive.
    router.push(probe.state === 'rendering' ? '/studio/create' : '/history')
  }

  function handleDismiss() {
    if (!probe) return
    void trackEvent('active_render_pill_clicked', {
      state: probe.state,
      action: 'dismiss',
      video_id: probe.state === 'completed' ? probe.videoId : null,
      path: pathname ?? null,
    })
    try {
      localStorage.setItem(DISMISS_KEY, probeIdentity(probe))
    } catch {
      /* private mode — it reappears next session, which is the safe side */
    }
    setDismissedId(probeIdentity(probe))
  }

  // KINEO-SPRINT-V1V4-2026-08-31 (#3) — a terceira saida. "Watch" leva ao que
  // ja acabou; esta leva ao proximo, com o tema ja escrito. Mesmo helper do
  // /history, do /studio e da Library: uma unica definicao de "episodio 2".
  function handleNextEpisode(seed: string) {
    void trackEvent('series_continue_clicked', {
      source: 'render_pill',
      seed_length: seed.length,
      video_id: probe && probe.state === 'completed' ? probe.videoId : null,
      path: pathname ?? null,
    })
    // Some junto com o "Watch": quem escolheu o proximo episodio nao precisa
    // do aviso do anterior perseguindo ele pela proxima tela.
    try {
      localStorage.setItem(DISMISS_KEY, probeIdentity(probe))
    } catch {
      /* private mode */
    }
    setDismissedId(probeIdentity(probe))
    router.push(buildSeriesContinuationHref(seed, 'render_pill'))
  }

  const nextSeed = probe.state === 'completed' ? probe.seriesSeed : null

  // Vertical quando ha duas acoes: a pilula horizontal nao cabe em telefone
  // com "Watch" + "Next episode" lado a lado sem truncar os dois.
  // #15 — o cartao vertical passa a valer tambem quando NAO ha semente de serie
  // mas HA ideia guardada: a fila e um motivo de cartao por si so.
  if (!isRendering && (nextSeed || (filaVisivel && fila))) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed z-40 right-3 md:right-6 bottom-20 md:bottom-6 flex flex-col gap-2"
        style={{
          width: 'min(300px, calc(100vw - 24px))',
          padding: 14,
          borderRadius: 18,
          background: 'rgba(11,17,32,0.97)',
          border: '1px solid rgba(34,197,94,0.45)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-start gap-2">
          <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1.2 }}>
            🎉
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold" style={{ color: '#fff' }}>
              Your video is ready
            </div>
            <div
              className="text-xs truncate"
              style={{ color: 'rgba(255,255,255,0.62)', marginTop: 2 }}
              title={filaVisivel && fila ? fila.seed : (nextSeed ?? undefined)}
            >
              {filaVisivel && fila ? `Next: ${fila.seed}` : nextSeed}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss video ready notification"
            className="flex items-center justify-center flex-shrink-0 rounded-full"
            style={{
              width: 32,
              height: 32,
              marginTop: -4,
              marginRight: -4,
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.72)',
              fontSize: 18,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAction}
            className="text-xs font-bold rounded-full flex-shrink-0"
            style={{
              minHeight: 40,
              padding: '0 14px',
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Watch
          </button>
          {/* #15 — quando ha ideia guardada ela e a acao PRIMARIA, na mesma
              ordem da tela de video pronto: a ideia que ELA escreveu ganha do
              "mesmo tema, novo gancho" que o produto sugeriu. */}
          {nextSeed && !(filaVisivel && fila) ? (
            <button
              type="button"
              onClick={() => handleNextEpisode(nextSeed)}
              className="text-xs font-bold rounded-full flex-1 min-w-0"
              style={{
                minHeight: 40,
                padding: '0 12px',
                background: '#22c55e',
                border: 'none',
                color: '#06220f',
                cursor: 'pointer',
              }}
            >
              Next episode →
            </button>
          ) : null}
          {nextSeed && filaVisivel && fila ? (
            <button
              type="button"
              onClick={() => handleNextEpisode(nextSeed)}
              className="text-xs font-bold rounded-full flex-shrink-0"
              style={{
                minHeight: 40,
                padding: '0 12px',
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Series
            </button>
          ) : null}
          {filaVisivel && fila ? (
            <button
              type="button"
              onClick={() => handleFilaGo(fila)}
              className="text-xs font-bold rounded-full flex-1 min-w-0"
              style={{
                minHeight: 40,
                padding: '0 12px',
                background: '#22c55e',
                border: 'none',
                color: '#06220f',
                cursor: 'pointer',
              }}
            >
              Make it now →
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      // Mobile: sits ABOVE the 64px MobileNav so it never covers a primary
      // action. Desktop: bottom-right, clear of the content column.
      className="fixed z-40 right-3 md:right-6 bottom-20 md:bottom-6 flex items-center gap-2"
      style={{
        maxWidth: 'calc(100vw - 24px)',
        padding: '8px 8px 8px 14px',
        borderRadius: 999,
        background: 'rgba(11,17,32,0.97)',
        border: `1px solid ${isRendering ? 'rgba(41,151,255,0.45)' : 'rgba(34,197,94,0.45)'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {isRendering ? (
        <span
          aria-hidden="true"
          className="animate-spin flex-shrink-0"
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '2px solid rgba(41,151,255,0.25)',
            borderTopColor: accent,
          }}
        />
      ) : (
        <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>
          🎉
        </span>
      )}

      <button
        type="button"
        onClick={handleAction}
        className="flex items-center gap-2 min-w-0"
        style={{ minHeight: 44, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <span
          className="text-sm font-bold truncate"
          style={{ color: '#fff', maxWidth: '46vw' }}
        >
          {probe.state === 'rendering'
            ? `Rendering… ${formatElapsedShort(tick - probe.startedAtMs)}`
            : 'Your video is ready'}
        </span>
        <span
          className="text-xs font-bold px-3 rounded-full flex items-center flex-shrink-0"
          style={{
            minHeight: 32,
            background: accent,
            color: isRendering ? '#fff' : '#06220f',
          }}
        >
          {isRendering ? 'Open' : 'Watch'}
        </span>
      </button>

      {!isRendering && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss video ready notification"
          className="flex items-center justify-center flex-shrink-0 rounded-full"
          style={{
            width: 44,
            height: 44,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.72)',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// #15 — A PILULA DA IDEIA GUARDADA (sem render, sem aviso de pronto).
//
// Ela existe para UM caso medido em 31/08: 60 pessoas externas fizeram
// exatamente 1 video em 7 dias; 31 delas estiveram no site DEPOIS desse video
// e nao clicaram em gerar uma unica vez. Nao sumiram — ficaram sem porta.
//
// Nao promete nada que nao cumpre: nao fala em creditos, plano, preco nem
// upgrade (fronteira do Codex), nao dispara render nenhum e nao escreve no
// banco. Um clique = ir para o compositor com o tema JA escrito.
// ═══════════════════════════════════════════════════════════════════════════
function FilaLinedUpPill({
  ideia,
  onGo,
  onDismiss,
}: {
  ideia: IdeiaNaFila
  onGo: (ideia: IdeiaNaFila) => void
  onDismiss: () => void
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-40 right-3 md:right-6 bottom-20 md:bottom-6 flex flex-col gap-2"
      style={{
        width: 'min(300px, calc(100vw - 24px))',
        padding: 14,
        borderRadius: 18,
        background: 'rgba(11,17,32,0.97)',
        border: '1px solid rgba(34,197,94,0.45)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1.2 }}>
          📌
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold" style={{ color: '#fff' }}>
            Video #2 is lined up
          </div>
          <div
            className="text-xs truncate"
            style={{ color: 'rgba(255,255,255,0.62)', marginTop: 2 }}
            title={ideia.seed}
          >
            {ideia.seed}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Discard saved idea"
          className="flex items-center justify-center flex-shrink-0 rounded-full"
          style={{
            width: 32,
            height: 32,
            marginTop: -4,
            marginRight: -4,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.72)',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      <button
        type="button"
        onClick={() => onGo(ideia)}
        className="text-xs font-bold rounded-full w-full"
        style={{
          minHeight: 40,
          padding: '0 12px',
          background: '#22c55e',
          border: 'none',
          color: '#06220f',
          cursor: 'pointer',
        }}
      >
        Make it now →
      </button>
    </div>
  )
}
