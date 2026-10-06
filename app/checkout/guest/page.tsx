'use client'

// ═══ KINEO-COMPRA-SEM-LOGIN-2026-10-06 — a volta da Stripe para quem pagou SEM conta ═══════════════════════════════
// success_url da sessão de convidado (buildGuestCheckoutSuccessUrl). Esta página só pergunta ao servidor
// (/api/stripe/checkout/guest-access) e mostra o estado que ele decidiu — nenhuma regra mora aqui:
//   · conta nova, deste navegador, na janela, 1ª vez → o servidor já devolve os cookies da sessão e a página segue
//     para o MESMO /checkout/success do caminho logado (créditos, pixel de compra, destino do Studio/Autopilot);
//   · e-mail que já tinha conta → NUNCA entra sozinho; o link foi para a caixa do dono;
//   · fora do navegador / fora da janela / já usado → o link vai por e-mail quando a pessoa pede.
// Importa só o módulo puro (lib/growth/guestCheckout.ts): nada de node:crypto no bundle do cliente.

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { guestSuccessDestination, isGuestStripeSessionId } from '@/lib/growth/guestCheckout'

type AccessState =
  | 'checking'
  | 'pending'
  | 'signed_in'
  | 'check_email'
  | 'conflict'
  | 'unavailable'

type AccessReply = {
  state?: string
  reason?: string
  email_hint?: string | null
  email_sent?: boolean
  email_limit?: boolean
  can_email?: boolean
}

// Espera entre perguntas (ms): o webhook costuma chegar antes do redirect; depois disso, cada vez mais espaçado.
const POLL_DELAYS_MS = [0, 1500, 2500, 4000, 6000, 9000, 13000, 18000, 25000, 35000, 50000, 70000]

const SUPPORT_EMAIL = 'support@usekineo.com'

export default function GuestCheckoutPage() {
  const [state, setState] = useState<AccessState>('checking')
  const [reason, setReason] = useState<string | null>(null)
  const [emailHint, setEmailHint] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [emailLimit, setEmailLimit] = useState(false)
  const [canEmail, setCanEmail] = useState(false)
  const [sending, setSending] = useState(false)
  const [slow, setSlow] = useState(false)
  const sessionIdRef = useRef<string | null>(null)
  const destinationRef = useRef<string | null>(null)

  const ask = useCallback(async (action: 'status' | 'email'): Promise<AccessReply | null> => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return null
    try {
      const res = await fetch('/api/stripe/checkout/guest-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ session_id: sessionId, action }),
        signal: AbortSignal.timeout(15_000),
      })
      return (await res.json().catch(() => null)) as AccessReply | null
    } catch {
      return null
    }
  }, [])

  const apply = useCallback((data: AccessReply | null): boolean => {
    if (!data || typeof data.state !== 'string') return false
    if (typeof data.email_hint === 'string') setEmailHint(data.email_hint)
    if (data.state === 'signed_in') {
      setState('signed_in')
      // Navegação de verdade: o middleware e o /checkout/success leem os cookies novos na próxima requisição.
      window.location.replace(destinationRef.current ?? '/studio')
      return true
    }
    if (data.state === 'check_email') {
      setState('check_email')
      setReason(typeof data.reason === 'string' ? data.reason : null)
      setEmailSent(data.email_sent === true)
      setEmailLimit(data.email_limit === true)
      setCanEmail(data.can_email === true)
      return true
    }
    if (data.state === 'conflict' || data.state === 'unavailable') {
      setState(data.state)
      return true
    }
    setState('pending')
    return false
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = (params.get('session_id') ?? '').trim()
    if (!isGuestStripeSessionId(sessionId)) {
      setState('unavailable')
      return
    }
    sessionIdRef.current = sessionId
    destinationRef.current = guestSuccessDestination(params)

    let cancelled = false
    void (async () => {
      for (const delay of POLL_DELAYS_MS) {
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
        if (cancelled) return
        const done = apply(await ask('status'))
        if (cancelled || done) return
      }
      if (!cancelled) setSlow(true)
    })()
    return () => {
      cancelled = true
    }
  }, [apply, ask])

  async function requestEmail() {
    setSending(true)
    const data = await ask('email')
    setSending(false)
    if (data?.state === 'check_email') {
      setEmailSent(data.email_sent === true)
      setEmailLimit(data.email_limit === true)
    } else {
      apply(data)
    }
  }

  const title =
    state === 'signed_in' ? 'You are in.'
      : state === 'check_email' ? (reason === 'existing_account' ? 'Your plan is on your account.' : 'Your plan is active.')
        : state === 'conflict' ? 'This email already has a Kineo plan.'
          : state === 'unavailable' ? 'We could not find this checkout.'
            : 'Payment received.'

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      <div
        data-kineo="guest-checkout"
        data-state={state}
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'rgba(11,17,32,0.85)',
          border: '1px solid var(--border)',
          borderRadius: 22,
          padding: 'clamp(24px, 5vw, 36px)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 1.9rem)', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>

        {(state === 'checking' || state === 'pending') && (
          <p style={{ marginTop: 12, color: 'var(--muted2)', lineHeight: 1.55 }}>
            {slow
              ? `Your payment is safe. Your account is still being set up — refresh this page in a minute. If it keeps waiting, write to ${SUPPORT_EMAIL} with the email you paid with.`
              : `Setting up your Kineo account${emailHint ? ` for ${emailHint}` : ''}…`}
          </p>
        )}

        {state === 'signed_in' && (
          <p style={{ marginTop: 12, color: 'var(--muted2)', lineHeight: 1.55 }}>Opening Kineo…</p>
        )}

        {state === 'check_email' && reason === 'existing_account' && (
          <p style={{ marginTop: 12, color: 'var(--muted2)', lineHeight: 1.55 }}>
            {`This email already had a Kineo account, so the plan went to it. For your security we never sign anyone in automatically here. `}
            {emailSent
              ? `We sent a sign-in link to ${emailHint ?? 'your email'}.`
              : 'Sign in with your email to start using it.'}
          </p>
        )}

        {state === 'check_email' && reason === 'other_account_signed_in' && (
          <p style={{ marginTop: 12, color: 'var(--muted2)', lineHeight: 1.55 }}>
            This browser is signed in to a different Kineo account. Sign out, then sign in with the email you paid with.
          </p>
        )}

        {state === 'check_email' && reason !== 'existing_account' && reason !== 'other_account_signed_in' && (
          <p style={{ marginTop: 12, color: 'var(--muted2)', lineHeight: 1.55 }}>
            {emailSent
              ? `We sent a sign-in link to ${emailHint ?? 'the email you paid with'}.`
              : 'For your security, the automatic sign-in works once, in the browser where you paid, for a few minutes. Get a sign-in link by email instead.'}
          </p>
        )}

        {state === 'conflict' && (
          <p style={{ marginTop: 12, color: 'var(--muted2)', lineHeight: 1.55 }}>
            {`${emailHint ?? 'This email'} already has an active Kineo plan, so we did not add a second one to it. Sign in with that email to keep using Kineo, and write to ${SUPPORT_EMAIL} about this payment.`}
          </p>
        )}

        {state === 'unavailable' && (
          <p style={{ marginTop: 12, color: 'var(--muted2)', lineHeight: 1.55 }}>
            {`If you paid, your plan is safe. Sign in with the email you used, or write to ${SUPPORT_EMAIL}.`}
          </p>
        )}

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {state === 'check_email' && canEmail && (
            <button
              type="button"
              disabled={sending || emailLimit}
              onClick={() => { void requestEmail() }}
              style={{
                display: 'block',
                width: '100%',
                padding: '14px 22px',
                borderRadius: 14,
                fontSize: '0.95rem',
                fontWeight: 900,
                color: '#fff',
                background: '#2997ff',
                border: 'none',
                cursor: sending || emailLimit ? 'default' : 'pointer',
                opacity: sending || emailLimit ? 0.6 : 1,
              }}
            >
              {sending ? 'Sending…' : emailLimit ? 'Link already sent — check your inbox' : emailSent ? 'Send the link again' : 'Email me a sign-in link'}
            </button>
          )}
          {(state === 'check_email' || state === 'conflict' || state === 'unavailable') && (
            <Link
              href="/login?redirect=%2Fstudio"
              style={{
                display: 'block',
                textAlign: 'center',
                textDecoration: 'none',
                padding: '12px 22px',
                borderRadius: 14,
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--muted2)',
                background: 'rgba(255,255,255,.03)',
                border: '1px solid var(--border)',
              }}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
