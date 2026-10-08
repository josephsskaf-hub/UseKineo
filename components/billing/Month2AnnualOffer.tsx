'use client'

// KINEO-ANUAL-2o-MES-2026-10-08 — a oferta do anual (30%) para quem está no 2º mês da assinatura: um cartão na aba de
// cobrança da conta (variant 'card') e um aviso discreto e dispensável no /studio (variant 'notice'), com um modal que
// mostra a PRÉVIA da troca (o ensaio do servidor) antes do botão de confirmar, e o estado de sucesso.
// A decisão de pintar é do SERVIDOR (GET /api/stripe/switch-to-annual → eligible) e do interruptor único
// MONTH2_ANNUAL_OFFER_LIVE (lib/billing/month2AnnualOffer.ts): desligado, a peça nem chama a rota e não pinta nada.
// Nenhum número é digitado aqui: preço, desconto, créditos e prazo vêm da rota (que lê a assinatura e as regras da casa).
// Textos pelo useUiCopy (16 línguas em lib/ui/refinementCopy.json). Telemetria: month2_annual_offer_shown (1× por
// montagem, só quando pinta) · _clicked (abriu a prévia; origin 'email' quando veio do link do e-mail) · _dismissed ·
// month2_annual_preview_viewed · month2_annual_confirm_clicked. O fato que vale dinheiro é o razão do servidor.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useInterfaceLanguage, useUiCopy } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { fillCopy } from '@/lib/billing/subscriberUpgrade'
import {
  MONTH2_ANNUAL_API,
  MONTH2_ANNUAL_CLICKED_EVENT,
  MONTH2_ANNUAL_CONFIRM_EVENT,
  MONTH2_ANNUAL_COPY as COPY,
  MONTH2_ANNUAL_DISMISSED_EVENT,
  MONTH2_ANNUAL_DISMISS_KEY,
  MONTH2_ANNUAL_OFFER_LIVE,
  MONTH2_ANNUAL_PREVIEW_EVENT,
  MONTH2_ANNUAL_SHOWN_EVENT,
  MONTH2_ANNUAL_VERSION,
  month2ErrorCopyKey,
  month2Money,
  month2OfferVisible,
  type Month2AnnualPreview,
  type Month2AnnualStatus,
  type Month2AnnualSurface,
} from '@/lib/billing/month2AnnualOffer'

type Phase = 'idle' | 'loading' | 'preview' | 'switching' | 'done' | 'error'
type SwitchResult = { chargedNowMinor: number | null; creditsAfter: number | null; refundUntil: string }

const ACCENT = '#2997ff'

function dateLabel(iso: string | null | undefined, language: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return d.toLocaleDateString(language, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
}

export default function Month2AnnualOffer({ variant, surface }: { variant: 'card' | 'notice'; surface: Month2AnnualSurface }) {
  const ui = useUiCopy()
  const language = useInterfaceLanguage()
  const [status, setStatus] = useState<Month2AnnualStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [modal, setModal] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [preview, setPreview] = useState<Month2AnnualPreview | null>(null)
  const [result, setResult] = useState<SwitchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState<Month2AnnualSurface>(surface)
  const shownRef = useRef(false)
  const autoRef = useRef(false)

  useEffect(() => {
    if (!MONTH2_ANNUAL_OFFER_LIVE) return
    if (variant === 'notice') {
      try { if (localStorage.getItem(MONTH2_ANNUAL_DISMISS_KEY)) setDismissed(true) } catch { /* navegador sem storage: o aviso aparece */ }
    }
    let alive = true
    void fetch(MONTH2_ANNUAL_API, { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: unknown) => { if (alive && j && typeof j === 'object') setStatus(j as Month2AnnualStatus) })
      .catch(() => { /* sem estado, sem oferta — nunca derruba a tela */ })
    return () => { alive = false }
  }, [variant])

  const offerVisible = month2OfferVisible({ live: MONTH2_ANNUAL_OFFER_LIVE, status, variant, dismissed })
  const visible = offerVisible || phase === 'done'
  const meta = { version: MONTH2_ANNUAL_VERSION, surface, variant, tier: status?.tier ?? null, monthly_minor: status?.monthlyMinor ?? null, annual_minor: status?.annualMinor ?? null }

  useEffect(() => {
    if (!offerVisible || shownRef.current) return
    shownRef.current = true
    try { void trackEvent(MONTH2_ANNUAL_SHOWN_EVENT, meta) } catch { /* telemetria nunca derruba a peça */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerVisible])

  // Chegada pelo link do e-mail (?offer=annual na conta): a prévia abre sozinha. Nada é cobrado sem o "Confirm".
  useEffect(() => {
    if (variant !== 'card' || !offerVisible || autoRef.current) return
    let fromEmail = false
    try { fromEmail = new URLSearchParams(window.location.search).get('offer') === 'annual' } catch { fromEmail = false }
    if (!fromEmail) return
    autoRef.current = true
    void openPreview('email')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, offerVisible])

  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && phase !== 'switching') setModal(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, phase])

  async function openPreview(from: Month2AnnualSurface) {
    setOrigin(from)
    setModal(true)
    setPhase('loading')
    setError(null)
    setPreview(null)
    try { void trackEvent(MONTH2_ANNUAL_CLICKED_EVENT, { ...meta, origin: from }) } catch { /* ignore */ }
    try {
      const r = await fetch(MONTH2_ANNUAL_API, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ surface: from }),
      })
      const j = (await r.json().catch(() => null)) as { preview?: Month2AnnualPreview; error?: string } | null
      if (r.ok && j?.preview) {
        setPreview(j.preview)
        setPhase('preview')
        try { void trackEvent(MONTH2_ANNUAL_PREVIEW_EVENT, { ...meta, origin: from, charged_now_minor: j.preview.chargedNowMinor, proration_credit_minor: j.preview.prorationCreditMinor }) } catch { /* ignore */ }
        return
      }
      setError(j?.error ?? `http_${r.status}`)
      setPhase('error')
    } catch {
      setError('preview_failed')
      setPhase('error')
    }
  }

  async function confirmSwitch() {
    if (!preview || phase !== 'preview') return
    setPhase('switching')
    setError(null)
    try { void trackEvent(MONTH2_ANNUAL_CONFIRM_EVENT, { ...meta, origin, charged_now_minor: preview.chargedNowMinor }) } catch { /* ignore */ }
    try {
      const r = await fetch(MONTH2_ANNUAL_API, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: 'SEND', annualAmountUsd: preview.annualUsd, surface: origin }),
      })
      const j = (await r.json().catch(() => null)) as { switched?: boolean; result?: SwitchResult; error?: string } | null
      if (r.ok && j?.switched && j.result) {
        setResult(j.result)
        setPhase('done')
        try { window.dispatchEvent(new Event('creditsChanged')) } catch { /* o saldo da tela relê no próximo evento */ }
        return
      }
      setError(j?.error ?? `http_${r.status}`)
      setPhase('error')
    } catch {
      // A resposta se perdeu: a troca pode ter acontecido. Nunca dizer "nada foi cobrado" sem saber.
      setError('network')
      setPhase('error')
    }
  }

  function dismiss() {
    setDismissed(true)
    try { void trackEvent(MONTH2_ANNUAL_DISMISSED_EVENT, meta) } catch { /* ignore */ }
    try { localStorage.setItem(MONTH2_ANNUAL_DISMISS_KEY, String(Date.now())) } catch { /* só nesta visita */ }
  }

  if (!visible) return null

  const percent = status?.offer?.percentOff ?? 0
  const annual = month2Money(status?.annualMinor ?? 0)
  const monthly = month2Money(status?.monthlyMinor ?? 0)
  const title = fillCopy(ui(COPY.title), { percent })
  const pitch = fillCopy(ui(COPY.pitch), { annual, monthly, days: status?.refundDays ?? 0 })
  const same = typeof status?.creditsPerMonth === 'number' ? fillCopy(ui(COPY.same), { credits: status.creditsPerMonth }) : ''
  const doneLine = ui(COPY.done)
  const doneDetail = result
    ? fillCopy(ui(COPY.doneDetail), { charged: month2Money(result.chargedNowMinor ?? 0), credits: result.creditsAfter ?? '—', date: dateLabel(result.refundUntil, language) })
    : ''

  const primary: CSSProperties = {
    display: 'inline-block', padding: '10px 16px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff',
    fontSize: '0.86rem', fontWeight: 900, cursor: 'pointer', textAlign: 'center',
  }
  const quiet: CSSProperties = {
    display: 'inline-block', padding: '9px 14px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border, rgba(255,255,255,.18))',
    color: 'var(--text, #fff)', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', textAlign: 'center',
  }

  const dialog = modal ? (
    <div
      data-kineo="month2-annual-modal"
      onClick={() => { if (phase !== 'switching') setModal(false) }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="month2-annual-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 420, borderRadius: 16, padding: 20, background: 'var(--card, #0b1120)', border: '1px solid rgba(41,151,255,.35)', color: 'var(--text, #fff)', boxShadow: '0 24px 60px rgba(0,0,0,.45)' }}
      >
        <h2 id="month2-annual-title" style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 900 }}>{ui(COPY.modalTitle)}</h2>
        {phase === 'loading' && <p role="status" style={{ margin: 0, color: 'var(--muted, #a1a1a8)', fontSize: '0.88rem' }}>{ui(COPY.loading)}</p>}
        {(phase === 'preview' || phase === 'switching') && preview && (
          <>
            <dl data-kineo="month2-annual-preview" style={{ margin: 0 }}>
              {[
                [ui(COPY.rowAnnual), fillCopy(ui(COPY.perYear), { annual: month2Money(preview.annualMinor) })],
                [ui(COPY.rowCredit), `− ${month2Money(preview.prorationCreditMinor)}`],
                [ui(COPY.rowDue), month2Money(preview.chargedNowMinor)],
                [ui(COPY.rowCredits), `${preview.creditsBefore} → ${preview.creditsAfter}`],
                [ui(COPY.rowMonthly), fillCopy(ui(COPY.creditsValue), { credits: preview.creditsPerMonth })],
                [ui(COPY.rowRefund), dateLabel(preview.refundUntil, language)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border, rgba(255,255,255,.08))', fontSize: '0.86rem' }}>
                  <dt style={{ color: 'var(--muted, #a1a1a8)' }}>{label}</dt>
                  <dd style={{ margin: 0, fontWeight: 800, textAlign: 'right' }}>{value}</dd>
                </div>
              ))}
            </dl>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              <button type="button" data-kineo="month2-annual-confirm" disabled={phase === 'switching'} onClick={() => void confirmSwitch()} style={{ ...primary, flex: '1 1 200px', opacity: phase === 'switching' ? 0.7 : 1, cursor: phase === 'switching' ? 'wait' : 'pointer' }}>
                {phase === 'switching' ? ui(COPY.switching) : fillCopy(ui(COPY.confirm), { charged: month2Money(preview.chargedNowMinor) })}
              </button>
              <button type="button" disabled={phase === 'switching'} onClick={() => setModal(false)} style={{ ...quiet, flex: '0 0 auto' }}>{ui(COPY.notNow)}</button>
            </div>
          </>
        )}
        {phase === 'done' && (
          <>
            <p role="status" data-kineo="month2-annual-done" style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem' }}>{doneLine}</p>
            <p style={{ margin: '8px 0 0', color: 'var(--muted, #a1a1a8)', fontSize: '0.86rem', lineHeight: 1.5 }}>{doneDetail}</p>
            <button type="button" onClick={() => setModal(false)} style={{ ...primary, marginTop: 16 }}>{ui(COPY.close)}</button>
          </>
        )}
        {phase === 'error' && (
          <>
            <p role="alert" data-kineo="month2-annual-error" style={{ margin: 0, color: '#f87171', fontSize: '0.88rem', lineHeight: 1.5 }}>{ui(COPY[month2ErrorCopyKey(error)])}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {error === 'price_changed' && <button type="button" onClick={() => void openPreview(origin)} style={primary}>{ui(COPY.open)}</button>}
              <button type="button" onClick={() => setModal(false)} style={quiet}>{ui(COPY.close)}</button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null
  const portal = dialog && typeof document !== 'undefined' ? createPortal(dialog, document.body) : dialog

  if (variant === 'notice') {
    return (
      <div
        data-kineo="month2-annual-notice"
        data-version={MONTH2_ANNUAL_VERSION}
        role="region"
        aria-label={title}
        style={{ margin: '10px 0 14px', padding: '10px 12px', borderRadius: 12, background: 'var(--card2, rgba(41,151,255,.06))', border: '1px solid rgba(41,151,255,.35)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}
      >
        <div style={{ flex: '1 1 280px', minWidth: 0, fontSize: '0.84rem', lineHeight: 1.45, color: 'var(--text, #fff)' }}>
          {phase === 'done' ? (
            <b role="status">{doneLine}</b>
          ) : (
            <>
              <b>{title}</b>
              <span style={{ color: 'var(--muted, #a1a1a8)' }}> — {pitch}</span>
            </>
          )}
        </div>
        {phase !== 'done' && (
          <>
            <button type="button" data-kineo="month2-annual-open" onClick={() => void openPreview(surface)} style={{ ...primary, padding: '8px 12px', fontSize: '0.8rem' }}>{ui(COPY.open)}</button>
            <button type="button" data-kineo="month2-annual-dismiss" aria-label={ui(COPY.dismiss)} title={ui(COPY.dismiss)} onClick={dismiss} style={{ background: 'transparent', border: 'none', color: 'var(--muted, #a1a1a8)', fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: '2px 6px' }}>×</button>
          </>
        )}
        {portal}
      </div>
    )
  }

  return (
    <div
      data-kineo="month2-annual-card"
      data-version={MONTH2_ANNUAL_VERSION}
      className="acc-card rounded-2xl p-6"
      style={{ background: 'rgba(11,17,32,0.85)', border: '1px solid rgba(41,151,255,.35)', backdropFilter: 'blur(12px)' }}
    >
      {phase === 'done' ? (
        <>
          <p role="status" style={{ margin: 0, fontWeight: 900, color: 'var(--text, #fff)' }}>{doneLine}</p>
          {doneDetail && <p style={{ margin: '6px 0 0', color: 'var(--muted, #a1a1a8)', fontSize: '0.82rem', lineHeight: 1.5 }}>{doneDetail}</p>}
        </>
      ) : (
        <>
          <div style={{ fontSize: '0.63rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, marginBottom: 8 }}>{ui(COPY.rowAnnual)}</div>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 900, color: 'var(--text, #fff)' }}>{title}</h2>
          <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--muted, #a1a1a8)' }}>{pitch}</p>
          {same && <p style={{ margin: '6px 0 0', fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--muted, #a1a1a8)' }}>{same}</p>}
          <button type="button" data-kineo="month2-annual-open" onClick={() => void openPreview(surface)} style={{ ...primary, marginTop: 14 }}>{ui(COPY.open)}</button>
        </>
      )}
      {portal}
    </div>
  )
}
