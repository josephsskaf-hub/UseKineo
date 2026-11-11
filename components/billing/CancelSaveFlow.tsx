'use client'

// KINEO-SALVA-CANCELAMENTO-3110 — a tela "Before you go", entre o botão "Cancel subscription" e o portal da Stripe.
// Uma pergunta (o motivo) e UMA oferta honesta por motivo, só com o que a casa já executa (regra inteira em
// lib/billing/salvaCancelamento.ts). Sem padrão escuro: "Continue to cancel" aparece em TODOS os passos, inclusive
// antes de escolher motivo, e leva direto à tela de cancelar do portal (POST /api/stripe/portal { flow: 'cancel' }).
// Renderiza em document.body: o cartão da conta tem backdrop-filter, que prenderia um overlay fixed dentro dele.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { trackEvent } from '@/lib/analytics'
import { formatCheckoutMoney } from '@/lib/checkoutPricing'
import {
  CANCEL_EVENTS,
  CANCEL_REASONS,
  CANCEL_REASON_LABELS,
  SALVA_CANCELAMENTO_VERSION,
  creditsCopy,
  downgradeTimingCopy,
  formatSaveDate,
  offerForReason,
  supportMailto,
  type CancelReason,
  type CreditsStory,
  type DowngradeDecision,
} from '@/lib/billing/salvaCancelamento'
import {
  PAUSA_VOLUNTARIA_1111_RELEASE,
  PAUSA_VOLUNTARIA_API,
  PAUSA_VOLUNTARIA_COPY,
  pausaDate,
  pausaFill,
  pausaParaMotivo,
} from '@/lib/billing/pausaVoluntaria' // KINEO-PAUSA-VOLUNTARIA-1111 — "Pause for 1 month", só dentro deste fluxo; o servidor decide

/** KINEO-PAUSA-VOLUNTARIA-1111 — o que GET /api/billing/pausa-voluntaria devolve quando há algo a mostrar. */
export interface PausaInfo {
  show: true
  qa: boolean
  possible: boolean
  skippedCharge: string | null
  nextCharge: string | null
  pausedNow: boolean
  pausedUntil: string | null
  credits: number | null
}
export type PausaPhase = 'idle' | 'working' | 'paused' | 'resumed'

export interface SaveInfo {
  tier: string | null
  inTrial: boolean
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
  credits: CreditsStory
  downgrade: DowngradeDecision
  cheapest: { tier: 'starter'; priceUsdMinor: number; creditsPerMonth: number }
  lastFilm: { id: string | null; title: string; createdAt: string | null; href: string } | null
  supportEmail: string
}

export type Phase = 'loading' | 'ready' | 'saving' | 'saved'

const CARD_BG = 'rgba(11,17,32,0.97)'
const BLUE = '#2997ff'

export default function CancelSaveFlow({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('loading')
  const [info, setInfo] = useState<SaveInfo | null>(null)
  const [reason, setReason] = useState<CancelReason | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const opened = useRef(false)
  // KINEO-PAUSA-VOLUNTARIA-1111 — a pausa (null = não há o que mostrar). 'off' = nenhuma leitura.
  const [pausa, setPausa] = useState<PausaInfo | null>(null)
  const [pausaPhase, setPausaPhase] = useState<PausaPhase>('idle')
  const pausaOffered = useRef(false)

  useEffect(() => {
    if (PAUSA_VOLUNTARIA_1111_RELEASE === 'off') return
    let cancelled = false
    fetch(PAUSA_VOLUNTARIA_API, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.show === true) setPausa(d as PausaInfo) })
      .catch(() => { /* sem pausa: a tela segue como antes */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (opened.current) return
    opened.current = true
    void trackEvent(CANCEL_EVENTS.opened, { surface: 'account_billing', version: SALVA_CANCELAMENTO_VERSION })
    let cancelled = false
    fetch('/api/stripe/cancel-save', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data?.ok) setInfo(data as SaveInfo)
        setPhase('ready')
      })
      .catch(() => { if (!cancelled) setPhase('ready') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function pickReason(r: CancelReason) {
    // KINEO-PAUSA-VOLUNTARIA-1111 — a impressão da oferta é gravada no SERVIDOR, uma vez, quando o cartão aparece de fato.
    if (pausa?.possible && pausaParaMotivo(r) && !pausaOffered.current) {
      pausaOffered.current = true
      void fetch(`${PAUSA_VOLUNTARIA_API}?offer=1`, { cache: 'no-store' }).catch(() => {})
    }
    setReason(r)
    setError(null)
    void trackEvent(CANCEL_EVENTS.reasonSelected, { reason: r, tier: info?.tier ?? null, version: SALVA_CANCELAMENTO_VERSION })
  }

  async function continueToCancel() {
    if (leaving) return
    setLeaving(true)
    setError(null)
    void trackEvent(CANCEL_EVENTS.continued, { reason: reason ?? 'none', tier: info?.tier ?? null, version: SALVA_CANCELAMENTO_VERSION })
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow: 'cancel' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.url) {
        window.location.href = data.url
        return
      }
      setError(data?.error || `Could not open the cancellation page. Email ${info?.supportEmail ?? 'support@usekineo.com'} and we'll cancel it for you.`)
    } catch {
      setError(`Could not open the cancellation page. Email ${info?.supportEmail ?? 'support@usekineo.com'} and we'll cancel it for you.`)
    }
    setLeaving(false)
  }

  async function switchToCheapest() {
    if (!info || !info.downgrade.possible || phase === 'saving') return
    setPhase('saving')
    setError(null)
    try {
      const res = await fetch('/api/stripe/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: info.downgrade.to }),
      })
      const data = await res.json().catch(() => ({})) as { ok?: boolean; effective_at?: string; error?: string }
      if (res.ok && data?.ok) {
        void trackEvent(CANCEL_EVENTS.savedDowngrade, {
          reason: reason ?? 'none',
          from: info.tier,
          to: info.downgrade.to,
          timing: info.downgrade.timing,
          version: SALVA_CANCELAMENTO_VERSION,
        })
        const when = formatSaveDate(data.effective_at ?? null)
        setSavedNote(when
          ? `Done — Starter starts on ${when}. Your current plan and credits stay until then.`
          : 'Done — you are on Starter now. Every credit you had is still in your balance.')
        setPhase('saved')
        return
      }
      setError(data?.error === 'annual_needs_support'
        ? `Annual plans are switched by our team — email ${info.supportEmail}.`
        : `The switch didn't go through. Nothing was changed. Try again or email ${info.supportEmail}.`)
    } catch {
      setError(`The switch didn't go through. Nothing was changed. Try again or email ${info.supportEmail}.`)
    }
    setPhase('ready')
  }

  // KINEO-PAUSA-VOLUNTARIA-1111 — pausar / voltar antes: o servidor re-decide; a conferência da casa não muda a Stripe.
  async function pausaAction(action: 'pause' | 'resume') {
    if (!pausa || pausaPhase === 'working') return
    setPausaPhase('working')
    setError(null)
    try {
      const res = await fetch(PAUSA_VOLUNTARIA_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const data = await res.json().catch(() => ({})) as { ok?: boolean }
      if (res.ok && data?.ok) {
        setPausaPhase(action === 'pause' ? 'paused' : 'resumed')
        setSavedNote(action === 'pause'
          ? pausaFill(PAUSA_VOLUNTARIA_COPY.done, { skipped: pausaDate(pausa.skippedCharge), next: pausaDate(pausa.nextCharge) })
          : PAUSA_VOLUNTARIA_COPY.resumed)
        setPhase('saved')
        return
      }
    } catch { /* cai no erro abaixo */ }
    setError(pausaFill(PAUSA_VOLUNTARIA_COPY.failed, { email: info?.supportEmail ?? 'support@usekineo.com' }))
    setPausaPhase('idle')
  }

  if (!mounted) return null

  return createPortal(
    <CancelSaveView
      phase={phase}
      info={info}
      reason={reason}
      error={error}
      savedNote={savedNote}
      leaving={leaving}
      onClose={onClose}
      onPickReason={pickReason}
      onSwitch={switchToCheapest}
      onContinue={continueToCancel}
      pausa={pausa}
      pausaPhase={pausaPhase}
      onPause={() => void pausaAction('pause')}
      onResume={() => void pausaAction('resume')}
    />,
    document.body,
  )
}

export interface CancelSaveViewProps {
  phase: Phase
  info: SaveInfo | null
  reason: CancelReason | null
  error: string | null
  savedNote: string | null
  leaving: boolean
  onClose: () => void
  onPickReason: (r: CancelReason) => void
  onSwitch: () => void
  onContinue: () => void
  /** KINEO-PAUSA-VOLUNTARIA-1111 — opcionais: sem eles a tela é a de antes. */
  pausa?: PausaInfo | null
  pausaPhase?: PausaPhase
  onPause?: () => void
  onResume?: () => void
}

/** A tela, sem estado: o guardião (scripts/test-salva-cancelamento-3110.mjs) renderiza cada motivo por aqui. */
export function CancelSaveView({ phase, info, reason, error, savedNote, leaving, onClose, onPickReason, onSwitch, onContinue, pausa = null, pausaPhase = 'idle', onPause, onResume }: CancelSaveViewProps) {
  const periodLabel = formatSaveDate(info?.periodEnd ?? null)
  const offer = reason ? offerForReason(reason) : null
  const starterPrice = info ? formatCheckoutMoney('usd', info.cheapest.priceUsdMinor) : null

  const downgradeCard = info && info.downgrade.possible ? (
    <div className="rounded-xl p-4" style={{ background: 'rgba(41,151,255,.07)', border: '1px solid rgba(41,151,255,.3)' }} data-testid="cancel-save-downgrade">
      <div className="text-sm font-black mb-1" style={{ color: 'var(--text)' }}>
        Switch to Starter — {starterPrice}/mo, {info.cheapest.creditsPerMonth} credits every month
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
        {downgradeTimingCopy(info.downgrade.timing, periodLabel)} You keep your films and your library.
      </p>
      <button
        type="button"
        onClick={onSwitch}
        disabled={phase === 'saving'}
        className="w-full rounded-xl py-2.5 text-sm font-black"
        style={{ background: BLUE, color: '#fff', cursor: phase === 'saving' ? 'wait' : 'pointer', opacity: phase === 'saving' ? 0.7 : 1 }}
      >
        {phase === 'saving' ? 'Switching…' : 'Switch to Starter instead'}
      </button>
    </div>
  ) : null

  // KINEO-PAUSA-VOLUNTARIA-1111 — "Pause for 1 month": só depois do motivo (sem acúmulo de créditos; ver o módulo).
  const pausaCard = pausa && pausa.possible && !pausa.pausedNow && pausaParaMotivo(reason) && onPause ? (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.04)', border: pausa.qa ? '2px dashed #d93025' : '1px solid rgba(255,255,255,.12)' }} data-testid="cancel-save-pause" data-qa={pausa.qa ? '1' : undefined}>
      {pausa.qa && <div className="text-xs font-black mb-1" style={{ color: '#d93025', textTransform: 'uppercase', letterSpacing: '.04em' }}>{PAUSA_VOLUNTARIA_COPY.qa}</div>}
      <div className="text-sm font-black mb-1" style={{ color: 'var(--text)' }}>{PAUSA_VOLUNTARIA_COPY.title}</div>
      <p className="text-xs mb-3" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
        {pausaFill(PAUSA_VOLUNTARIA_COPY.body, { skipped: pausaDate(pausa.skippedCharge), next: pausaDate(pausa.nextCharge), credits: pausa.credits ?? info?.credits.balance ?? null })}
      </p>
      <button
        type="button"
        onClick={onPause}
        disabled={pausaPhase === 'working'}
        className="w-full rounded-xl py-2.5 text-sm font-black"
        style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)', color: 'var(--text)', cursor: pausaPhase === 'working' ? 'wait' : 'pointer' }}
      >
        {pausaPhase === 'working' ? PAUSA_VOLUNTARIA_COPY.pausing : PAUSA_VOLUNTARIA_COPY.cta}
      </button>
    </div>
  ) : null
  // KINEO-PAUSA-VOLUNTARIA-1111 — já pausada: voltar antes, dentro do mesmo fluxo.
  const pausadaCard = pausa && pausa.pausedNow && onResume ? (
    <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(41,151,255,.07)', border: '1px solid rgba(41,151,255,.3)' }} data-testid="cancel-save-paused">
      <p className="text-xs mb-3" style={{ color: 'var(--text2)', lineHeight: 1.6 }}>
        {pausaFill(PAUSA_VOLUNTARIA_COPY.pausedNow, { until: pausaDate(pausa.pausedUntil) })}
      </p>
      <button type="button" onClick={onResume} disabled={pausaPhase === 'working'} className="w-full rounded-xl py-2.5 text-sm font-black" style={{ background: BLUE, color: '#fff' }}>
        {pausaPhase === 'working' ? '…' : PAUSA_VOLUNTARIA_COPY.resumeCta}
      </button>
    </div>
  ) : null

  const noDowngradeNote = info && !info.downgrade.possible ? (
    info.downgrade.block === 'already_cheapest' ? (
      <p className="text-xs" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
        You're already on Starter, our lowest plan ({starterPrice}/mo).
      </p>
    ) : info.downgrade.block === 'annual' ? (
      <p className="text-xs" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
        Annual plans are switched by our team — email{' '}
        <a href={`mailto:${info.supportEmail}`} style={{ color: '#7cc0ff' }}>{info.supportEmail}</a> and we'll move you to a cheaper plan.
      </p>
    ) : null
  ) : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-save-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      data-kineo-tag="KINEO-SALVA-CANCELAMENTO-3110"
    >
      <div
        className="rounded-2xl p-6"
        style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,.1)', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 id="cancel-save-title" className="font-black text-lg" style={{ color: 'var(--text)' }}>
            {phase === 'saved' ? "You're all set" : 'Before you go'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ color: 'var(--muted)', fontSize: 20, lineHeight: 1, background: 'none', border: 0, cursor: 'pointer' }}>×</button>
        </div>

        {phase === 'saved' ? (
          <>
            <p className="text-sm mb-4" style={{ color: 'var(--text2)', lineHeight: 1.6 }} role="status">{savedNote}</p>
            <button type="button" onClick={() => { onClose(); window.location.reload() }} className="w-full rounded-xl py-2.5 text-sm font-black" style={{ background: BLUE, color: '#fff' }}>
              Back to my account
            </button>
          </>
        ) : (
          <>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
              {info?.cancelAtPeriodEnd && periodLabel
                ? `Your subscription is already set to end on ${periodLabel}.`
                : 'What made you want to cancel? One tap — it helps us fix it.'}
            </p>

            {pausadaCard}
            {phase === 'loading' ? (
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Loading your plan…</p>
            ) : (
              <div className="flex flex-col gap-2 mb-4" role="radiogroup" aria-label="Reason for cancelling">
                {CANCEL_REASONS.map((r) => {
                  const active = r === reason
                  return (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onPickReason(r)}
                      className="text-left rounded-xl px-3.5 py-2.5 text-sm font-semibold"
                      style={{
                        background: active ? 'rgba(41,151,255,.14)' : 'rgba(255,255,255,.04)',
                        border: active ? '1px solid rgba(41,151,255,.45)' : '1px solid rgba(255,255,255,.08)',
                        color: active ? '#7cc0ff' : 'var(--text2)',
                        cursor: 'pointer',
                      }}
                    >
                      {CANCEL_REASON_LABELS[r]}
                    </button>
                  )
                })}
              </div>
            )}

            {offer === 'downgrade' && (
              <div className="flex flex-col gap-3 mb-4">
                {downgradeCard}
                {noDowngradeNote}
              </div>
            )}

            {offer === 'credits' && info && (
              <div className="flex flex-col gap-3 mb-4">
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }} data-testid="cancel-save-credits">
                  <div className="text-2xl font-black" style={{ color: BLUE, lineHeight: 1 }}>{info.credits.balance}</div>
                  <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>credits in your balance</div>
                  <p className="text-xs" style={{ color: 'var(--text2)', lineHeight: 1.6 }}>
                    {creditsCopy(info.credits, periodLabel, info.inTrial)}
                  </p>
                  <a href="/studio" className="inline-block mt-3 text-xs font-bold" style={{ color: '#7cc0ff' }}>Make a film with them now →</a>
                </div>
                {downgradeCard}
              </div>
            )}

            {offer === 'support' && (
              <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }} data-testid="cancel-save-support">
                <p className="text-xs mb-3" style={{ color: 'var(--text2)', lineHeight: 1.6 }}>
                  Tell us what went wrong — a person reads every message and we'll look at your film.
                </p>
                <a
                  href={supportMailto(info?.lastFilm?.id ?? null)}
                  className="block w-full text-center rounded-xl py-2.5 text-sm font-black mb-2"
                  style={{ background: BLUE, color: '#fff', textDecoration: 'none' }}
                >
                  Email {info?.supportEmail ?? 'support@usekineo.com'}
                </a>
                {info?.lastFilm && (
                  <a href={info.lastFilm.href} target="_blank" rel="noopener noreferrer" className="block text-xs font-bold" style={{ color: '#7cc0ff' }}>
                    Your last film: {info.lastFilm.title}
                    {info.lastFilm.createdAt ? ` · ${formatSaveDate(info.lastFilm.createdAt)}` : ''} →
                  </a>
                )}
              </div>
            )}

            {pausaCard && <div className="mb-4">{pausaCard}</div>}

            {error && <p className="text-xs mb-3" style={{ color: '#f87171' }} role="alert">{error}</p>}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: 'var(--text2)' }}>
                Keep my plan
              </button>
              <button
                type="button"
                onClick={onContinue}
                disabled={leaving}
                className="text-sm font-semibold underline"
                style={{ color: 'var(--muted2)', background: 'none', border: 0, cursor: leaving ? 'wait' : 'pointer' }}
                data-testid="cancel-save-continue"
              >
                {leaving ? 'Opening…' : 'Continue to cancel'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
