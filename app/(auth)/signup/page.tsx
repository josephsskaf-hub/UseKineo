'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import GoogleSignInButton from '@/components/GoogleSignInButton'
import AppleSignInButton from '@/components/AppleSignInButton'
import { rememberSignupCampaign, trackEvent, trackSignupSource } from '@/lib/analytics'
import { isDisposableEmail } from '@/lib/emailValidation'
import { normalizeInternalRedirect } from '@/lib/authRedirect'
import { trackCheckoutAuthStep } from '@/lib/authAnalytics'
import {
  readBulkCheckoutAuthContext,
  type BulkCheckoutAuthContext,
} from '@/lib/growth/bulkCheckoutAuthContext'
import { useFreeTierOffer } from '@/components/FreeTierOfferProvider'
import AuthReel from '@/components/AuthReel'
import { swapFreeTierCopy as ft, TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import { carryCreationHandoff } from '@/lib/creationHandoff'
import { buildSignupCreationPreview } from '@/lib/growth/signupCreationPreview'
import { buildSignupProductDestinationPreview } from '@/lib/growth/signupProductDestinationPreview'
import {
  organicSignupHandoffContext,
  type OrganicSignupHandoffContext,
} from '@/lib/growth/organicSignupTruth'

type Strength = { level: 0 | 1 | 2 | 3 | 4; label: string; color: string }

// KINEO-CHECKOUT-RESUME-2026-07-07 — honor ?redirect (same-origin paths only) so
// buyers bounced off checkout resume their purchase after signup. Mirrors the
// safeRedirect guard in the login page.
function activationRedirectFromSearch(search: string): string {
  const params = new URLSearchParams(search)
  const explicitRedirect = normalizeInternalRedirect(params.get('redirect'))
  if (explicitRedirect) return explicitRedirect

  // Carry the homepage idea through auth on a local activation URL only.
  // URLSearchParams handles encoding; the cap avoids unbounded callback URLs.
  const activationParams = new URLSearchParams({ welcome: '1' })
  const handoff = carryCreationHandoff(params, activationParams)
  const prompt = handoff.prompt
  // Only explicit, allowlisted creation fields cross auth. A bare prompt
  // remains a prefill and keeps the normal manual flow.
  // Keep bounded organic attribution attached to the activation event after
  // email signup or OAuth without forwarding arbitrary query parameters.
  for (const key of ['intent_campaign', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const value = (params.get(key) ?? '').trim()
    if (/^[A-Za-z0-9._~-]{1,100}$/.test(value)) activationParams.set(key, value)
  }
  const language = params.get('language')
  if (language === 'en' || language === 'pt' || language === 'es') {
    activationParams.set('language', language)
  }
  // KINEO-POUSO-VITRINE-2026-08-25 b — COM prompt (ideia digitada na home) o
  // destino segue /generate: a ideia tem que virar render, é fluxo de dinheiro.
  // SEM prompt, o cadastro pousa na HOME (os 4 cards — ordem do fundador),
  // levando junto welcome/utm/intent pra atribuição continuar inteira.
  if (prompt) return `/generate?${activationParams.toString()}`
  return `/?${activationParams.toString()}`
}

/**
 * KINEO-SPRINT-12H-2026-07-29 — true when the page is running inside an app's
 * embedded webview rather than a real browser.
 *
 * Google rejects OAuth from these with `disallowed_useragent`, so any auto
 * redirect to Google from here is a guaranteed dead end for the buyer. Detected
 * by the vendor markers each app appends to its UA string:
 *   FBAN/FBAV — Facebook · Instagram — TikTok's `BytedanceWebview`/`musical_ly`
 *   LinkedInApp · Twitter · Snapchat · Pinterest
 * plus the generic Android `; wv)` webview flag and the iOS heuristic (Safari
 * on iOS always reports "Safari"; an in-app WKWebView does not).
 *
 * Deliberately conservative: a false NEGATIVE just restores the old behaviour,
 * while a false POSITIVE only means the buyer sees the ordinary signup form
 * with the Google button on it. Neither outcome can lose a sale.
 */
function isEmbeddedBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Snapchat|Pinterest|Line\/|MicroMessenger|BytedanceWebview|musical_ly|TikTok|Twitter/i.test(ua)) {
    return true
  }
  if (/\bwv\b/.test(ua) || /; wv\)/.test(ua)) return true
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  if (isIOS && !/Safari/i.test(ua)) return true
  return false
}

function scorePassword(pw: string): Strength {
  if (!pw) return { level: 0, label: '', color: '#475569' }
  if (pw.length < 6)
    return { level: 1, label: 'Too short', color: '#ef4444' }

  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { level: 2, label: 'Weak', color: '#f59e0b' }
  if (score === 2 || score === 3)
    return { level: 3, label: 'Good', color: '#2997ff' }
  return { level: 4, label: 'Strong', color: '#2997ff' }
}

export default function SignupPage() {
  // [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier via contexto (client).
  const OFFER = useFreeTierOffer()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  // ONDA1 #14 (13/08) — true enquanto o auto-OAuth do fluxo de checkout esta
  // redirecionando para o Google; mostra um interstitial em vez do formulario.
  const [autoOauthInFlight, setAutoOauthInFlight] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  // KINEO-CHECKOUT-RESUME-2026-07-07 — query string forwarded to /login so a
  // pending checkout redirect survives the hop (state avoids SSR mismatch).
  const [authSearch, setAuthSearch] = useState('')
  const [activationRedirect, setActivationRedirect] = useState('/generate?welcome=1')
  const [bulkCheckoutContext, setBulkCheckoutContext] = useState<BulkCheckoutAuthContext | null>(null)
  const organicHandoffRef = useRef<OrganicSignupHandoffContext | null>(null)
  useEffect(() => {
    const nextDestination = activationRedirectFromSearch(window.location.search)
    setAuthSearch(window.location.search)
    setActivationRedirect(nextDestination)
    setBulkCheckoutContext(readBulkCheckoutAuthContext(nextDestination))

    // KINEO-RECOVERY-2026-07-15 — the landing form is a plain GET for maximum
    // resilience. Count its arrival here, once per browser navigation, so the
    // hero → signup rate is measurable without risking a blocked submit.
    const params = new URLSearchParams(window.location.search)
    const organicHandoff = organicSignupHandoffContext(params)
    organicHandoffRef.current = organicHandoff
    if (organicHandoff) {
      const navigationId = Math.round(performance.timeOrigin).toString(36)
      const marker = `kineo_organic_signup_view:${navigationId}`
      let alreadyTracked = false
      try {
        alreadyTracked = sessionStorage.getItem(marker) === '1'
        sessionStorage.setItem(marker, '1')
      } catch { /* analytics remains best-effort */ }
      if (!alreadyTracked) {
        void trackEvent('organic_signup_handoff_viewed', {
          version: organicHandoff.version,
          campaign: organicHandoff.campaign,
          source: organicHandoff.source,
          medium: organicHandoff.medium,
          create_intent: organicHandoff.createIntent,
          saved_creation: Boolean((params.get('prompt') ?? '').trim()),
        })
      }
    }
    const intentCampaign = params.get('intent_campaign')
    if (intentCampaign) rememberSignupCampaign(intentCampaign)
    if (params.get('reason') === 'checkout') {
      trackCheckoutAuthStep('page_view', 'signup_page', nextDestination)
    }
    const prompt = (params.get('prompt') ?? '').trim()
    if (params.get('utm_source') === 'homepage' && prompt) {
      const marker = `kineo_hero_submit:${prompt.slice(0, 120)}`
      try {
        if (!sessionStorage.getItem(marker)) {
          sessionStorage.setItem(marker, '1')
          void trackEvent('hero_submit', { destination: 'signup' }, '/')
        }
      } catch { /* analytics must never block signup */ }
    }
  }, [])

  function trackOrganicMethod(method: 'google' | 'email'): void {
    const organicHandoff = organicHandoffRef.current
    if (!organicHandoff) return
    void trackEvent('organic_signup_method_selected', {
      version: organicHandoff.version,
      campaign: organicHandoff.campaign,
      source: organicHandoff.source,
      medium: organicHandoff.medium,
      create_intent: organicHandoff.createIntent,
      method,
    })
  }

  // KINEO-CHECKOUT-NOLOGIN-2026-07-23 — "sem login": when a logged-out buyer lands
  // here from a plan click (?reason=checkout), auto-start Google one-click so paying
  // feels login-free — they never see this form unless Google is unavailable. Reuses
  // the exact proven OAuth -> /auth/callback?next=<checkout> -> resume path. Fires once
  // per browser session (guard) so a Google cancel/return never loops; ?noauto=1 or the
  // email form below remain as fallbacks.
  //
  // KINEO-SPRINT-12H-2026-07-29 — the autostart is now SUPPRESSED inside
  // embedded browsers, and this is a revenue fix, not a preference.
  //
  // Google has blocked OAuth inside embedded webviews since 2021: the request
  // is rejected with `disallowed_useragent` before any account chooser renders.
  // Kineo sells a SHORT-FORM VIDEO product — a large share of its traffic
  // arrives from the in-app browsers of Instagram, TikTok, Facebook and
  // LinkedIn, which are exactly those webviews. For every one of those buyers
  // the old code path was a guaranteed dead end: they tapped a price, the page
  // redirected to Google, Google refused, and they landed on an error screen
  // holding a credit card. The email form underneath worked the whole time and
  // they never saw it.
  //
  // The autostart stays enabled where it actually helps (real browsers), so the
  // one-click win from 2026-07-23 is preserved rather than reverted.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    if (p.get('reason') !== 'checkout') return
    if (p.get('noauto') === '1') return
    if (isEmbeddedBrowser()) {
      // Recorded as the ordinary signup surface with the EMAIL method, because
      // that is literally what the buyer is now shown. `AuthSurface` is a
      // closed union consumed by the checkout-auth funnel
      // (lib/authAnalytics.ts:4) and widening it here would silently split
      // every existing funnel report in two. The webview detail belongs in
      // its own event, not smuggled into the surface name.
      try {
        trackCheckoutAuthStep('method_selected', 'signup_page', activationRedirectFromSearch(window.location.search), 'email')
        void trackEvent('checkout_oauth_autostart_suppressed', { reason: 'embedded_webview' })
      } catch { /* ignore */ }
      return
    }
    try { if (sessionStorage.getItem('kineo_checkout_google_autostart') === '1') return } catch { /* ignore */ }
    const nextDestination = activationRedirectFromSearch(window.location.search)
    const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextDestination)}`
    try { sessionStorage.setItem('kineo_checkout_google_autostart', '1') } catch { /* ignore */ }
    try { trackCheckoutAuthStep('method_selected', 'signup_page', nextDestination, 'google') } catch { /* ignore */ }
    // ONDA1 #14 (13/08) — avisa ANTES de sequestrar para o Google: overlay
    // explicando o passo, em vez de pintar o formulario e sumir com a tela.
    setAutoOauthInFlight(true)
    void supabase.auth
      .signInWithOAuth({ provider: 'google', options: { redirectTo: callback } })
      .catch(() => { setAutoOauthInFlight(false) /* stay on the form as a fallback */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const strength = scorePassword(password)
  const isCheckoutResume = new URLSearchParams(authSearch).get('reason') === 'checkout'
  const savedCreation = useMemo(() => {
    const params = new URLSearchParams(authSearch)
    // An explicit, validated redirect owns the post-auth journey. Never show a
    // saved-work promise when that destination would intentionally win.
    if (isCheckoutResume || normalizeInternalRedirect(params.get('redirect'))) return null
    return buildSignupCreationPreview(params)
  }, [authSearch, isCheckoutResume])
  const savedProductDestination = useMemo(() => {
    if (isCheckoutResume) return null
    const params = new URLSearchParams(authSearch)
    return buildSignupProductDestinationPreview(params.get('redirect'))
  }, [authSearch, isCheckoutResume])
  const loginParams = new URLSearchParams({ redirect: activationRedirect })
  if (isCheckoutResume) loginParams.set('reason', 'checkout')
  const loginHref = `/login?${loginParams.toString()}`

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    trackOrganicMethod('email')
    setLoading(true)
    setError(null)
    const nextDestination = activationRedirectFromSearch(window.location.search)
    trackCheckoutAuthStep('method_selected', 'signup_page', nextDestination, 'email')

    // KINEO-DISPOSABLE-BLOCK-2026-07-06 — reject temp-mail signups BEFORE they
    // hit Supabase. Free access allows up to 3 watermarked Fast videos per
    // 24h, so throwaway inboxes still create pure provider abuse. Only gates
    // the email path — Google/Apple OAuth
    // identities can't be disposable, so those flows are untouched.
    if (isDisposableEmail(email)) {
      setError(
        "Please use a permanent email address — disposable inboxes aren't allowed."
      )
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Confirm through the PKCE callback, then resume the exact activation
        // target (homepage prompt or a pending checkout).
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextDestination)}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Supabase returns a successful response with an empty identities array
    // when the email is already registered.
    const identities = data.user?.identities
    if (data.user && Array.isArray(identities) && identities.length === 0) {
      setSuccess(true)
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      trackCheckoutAuthStep('confirmation_required', 'signup_page', nextDestination, 'email')
      setSuccess(true)
      setLoading(false)
      return
    }

    fetch('/api/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, activationPath: nextDestination }),
    }).catch(() => {
      /* non-blocking */
    })

    // Push #188 / #378 — Google Ads "Signup - Free Trial" conversion on success.
    // Label fixed to SXGYCK (was SXGYCk — case mismatch = never registered →
    // "Inativo"). transaction_id = Supabase user id dedups across reloads.
    try {
      if (typeof window !== 'undefined' && typeof (window as unknown as { gtag?: Function }).gtag === 'function') {
        ;(window as unknown as { gtag: Function }).gtag('event', 'conversion', {
          send_to: 'AW-18156258081/SXGYCK_VlrEcEKGGytFD',
          value: 1.0,
          currency: 'BRL',
          transaction_id: 'signup_' + (data.user?.id ?? ''),
        })
      }
    } catch {
      /* non-blocking */
    }

    // #375 — TikTok Pixel: CompleteRegistration on successful signup
    try {
      const ttq = (window as unknown as { ttq?: { track: Function } }).ttq
      if (typeof window !== 'undefined' && ttq && typeof ttq.track === 'function') {
        ttq.track('CompleteRegistration', { content_name: 'signup' })
      }
    } catch {
      /* non-blocking */
    }

    // #383 — record signup attribution (gclid / utm_source / country). Fire-and-
    // forget; never awaited, never throws — cannot block or break the signup.
    trackSignupSource()
    trackCheckoutAuthStep('completed', 'signup_page', nextDestination, 'email')
    const organicHandoff = organicHandoffRef.current
    if (organicHandoff) {
      void trackEvent('organic_signup_completed', {
        version: organicHandoff.version,
        campaign: organicHandoff.campaign,
        method: 'email',
      })
    }

    // PUSH #21 — prove the direct email-auth hop on the server before leaving
    // the page. OAuth/email-confirmation callbacks have their own authoritative
    // event; this covers the auto-confirm + password sign-in path.
    try {
      await fetch('/api/auth/activation-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: nextDestination }),
        keepalive: true,
      })
    } catch {
      // Funnel proof must never block a successful signup.
    }

    // Activation-first onboarding: resume the homepage prompt in /generate.
    // A validated explicit redirect still takes priority for pending checkout.
    window.location.assign(nextDestination)
  }

  return (
    <>
      {/* KINEO-AUTH-SPLIT-2026-08-17 (fundador: 'a tela de entrada nao ficou
          no modelo novo') — signup ganha o MESMO split-screen do login:
          vitrine AuthReel a esquerda (Maracaibo HD + avalanche + Tunguska +
          Lituya), formulario em coluna fixa a direita, azul Kineo. */}
      <div className="min-h-screen flex relative" style={{ background: '#050506' }}>
        <div className="hidden md:flex flex-1 flex-col items-center justify-center relative overflow-hidden px-10 py-12 gap-8">
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 700, height: 700, background: '#2997ff', top: -260, left: -180, opacity: 0.10, filter: 'blur(100px)' }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 520, height: 520, background: '#2997ff', bottom: -200, right: -120, opacity: 0.07, filter: 'blur(100px)' }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '22px 22px', opacity: 0.05 }}
          />
          <div className="relative z-10 text-center" style={{ maxWidth: 640 }}>
            <h2 className="text-3xl font-black tracking-tight mb-2" style={{ color: '#f5f5f7', letterSpacing: '-0.02em' }}>
              Type an idea. Watch it become a film.
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted2)' }}>
              Real renders from Kineo engines — voice, score and captions included.
            </p>
          </div>
          <div className="relative z-10 w-full flex justify-center">
            <AuthReel />
          </div>
          <ul className="relative z-10 flex items-center gap-6 flex-wrap justify-center">
            {[
              'AI writes the script',
              'Films · images · voices',
              ft(OFFER, '3 free videos / 24h', `Free trial — ${TRIAL_GRANT_CREDITS_COPY} credits`),
            ].map((line) => (
              <li key={line} className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text2)' }}>
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(41,151,255,.18)', border: '1px solid rgba(41,151,255,.35)', color: '#2997ff', fontSize: '0.6rem', fontWeight: 800 }}
                >
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT — form panel */}
        <div
          className="w-full md:w-[440px] flex-shrink-0 flex flex-col justify-center p-8 md:p-10 animate-fade-in-up relative z-10 min-h-screen"
          style={{ background: '#0e0e10', borderLeft: '1px solid #1d1d20' }}
        >
            <Link
              href="/"
              className="inline-block text-xs font-bold mb-4"
              style={{
                color: 'var(--muted)',
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              ← Back to Home
            </Link>

            {/* Mobile-only logo */}
            <Link
              href="/"
              className="flex items-center gap-3 mb-6"
              style={{ textDecoration: 'none' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{
                  background: '#2997ff',
                  boxShadow: '0 0 24px rgba(41,151,255,.45)',
                }}
              >
                ⚡
              </div>
              <div
                className="font-black text-sm tracking-tight"
                style={{ color: '#f5f5f7' }}
              >
                Kineo
              </div>
            </Link>

            {success ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h2
                  className="text-xl font-black mb-2"
                  style={{ color: 'var(--text)' }}
                >
                  Check your email!
                </h2>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  We sent a confirmation link to{' '}
                  <strong style={{ color: 'var(--text2)' }}>{email}</strong>.
                  Click it to activate your account.
                </p>
                {savedCreation && (
                  <p className="text-sm mt-3" style={{ color: '#7cc0ff' }}>
                    Your {savedCreation.kind} is still saved. The confirmation link opens it in Kineo.
                  </p>
                )}
                {savedProductDestination && (
                  <p className="text-sm mt-3" style={{ color: '#7cc0ff' }}>
                    Your destination is still saved. The confirmation link opens {savedProductDestination.destinationLabel}.
                  </p>
                )}
                <Link
                  href={loginHref}
                  className="inline-block mt-6 text-sm font-semibold"
                  style={{ color: '#2997ff' }}
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <>
                <h1
                  className="text-2xl font-black mb-1 tracking-tight"
                  style={{ color: 'var(--text)' }}
                >
                  {isCheckoutResume
                    ? bulkCheckoutContext
                      ? `Your ${bulkCheckoutContext.videos}-video pack is saved`
                      : 'Create your account to continue'
                    : savedProductDestination
                      ? savedProductDestination.heading
                      : savedCreation
                        ? `Your ${savedCreation.kind} is ready to continue`
                        : 'Create your AI Short'}
                </h1>
                <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                  {isCheckoutResume
                    ? bulkCheckoutContext
                      ? `${bulkCheckoutContext.priceLabel} USD one time · no subscription. Create your account and continue without choosing the pack again.`
                      : 'Your selected plan and intro price are saved. Continue securely below.'
                    : savedProductDestination
                      ? 'Create a free account and continue to the product you chose.'
                      : savedCreation
                        ? 'Create a free account and continue without starting over.'
                        : ft(OFFER, 'Create, watch, download and share up to 3 watermarked Fast videos every 24h, no card.', OFFER.copy.headline)}
                </p>

                {savedCreation && (
                  <section
                    aria-labelledby="saved-creation-heading"
                    className="rounded-2xl mb-5 p-4"
                    style={{
                      background: 'linear-gradient(145deg, rgba(41,151,255,.12), rgba(41,151,255,.035))',
                      border: '1px solid rgba(41,151,255,.3)',
                      boxShadow: '0 14px 36px rgba(0,0,0,.22)',
                    }}
                  >
                    <div
                      className="text-[10px] font-black uppercase tracking-[.12em] mb-1.5"
                      style={{ color: '#7cc0ff' }}
                    >
                      {savedCreation.eyebrow}
                    </div>
                    <h2
                      id="saved-creation-heading"
                      className="text-sm font-black mb-2"
                      style={{ color: '#f5f5f7' }}
                    >
                      {savedCreation.heading}
                    </h2>
                    <div className="flex flex-col gap-1.5 mb-3" aria-label={`Saved ${savedCreation.kind} preview`}>
                      {savedCreation.excerpt.map((line, index) => (
                        <p
                          key={`${index}-${line.slice(0, 24)}`}
                          className="text-xs leading-relaxed m-0"
                          style={{ color: index === 0 ? '#e5e7eb' : '#aeb2ba' }}
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                    <p className="text-[11px] leading-relaxed m-0" style={{ color: '#8f949e' }}>
                      {savedCreation.description}
                    </p>
                  </section>
                )}

                {savedProductDestination && (
                  <section
                    aria-labelledby="saved-product-destination-heading"
                    className="rounded-2xl mb-5 p-4"
                    style={{
                      background: 'linear-gradient(145deg, rgba(52,211,153,.12), rgba(41,151,255,.035))',
                      border: '1px solid rgba(52,211,153,.3)',
                      boxShadow: '0 14px 36px rgba(0,0,0,.22)',
                    }}
                  >
                    <div
                      className="text-[10px] font-black uppercase tracking-[.12em] mb-1.5"
                      style={{ color: '#6ee7b7' }}
                    >
                      {savedProductDestination.eyebrow}
                    </div>
                    <h2
                      id="saved-product-destination-heading"
                      className="text-sm font-black mb-2"
                      style={{ color: '#f5f5f7' }}
                    >
                      {savedProductDestination.destinationLabel}
                    </h2>
                    <p className="text-xs leading-relaxed m-0" style={{ color: '#aeb2ba' }}>
                      {savedProductDestination.description}
                    </p>
                  </section>
                )}

                {/* KINEO-CHECKOUT-RESUME-2026-07-07 — OAuth signups also resume
                    a pending checkout via the auth callback's ?next param. */}
                <GoogleSignInButton
                  redirectTo={activationRedirect}
                  analyticsSurface="signup_page"
                  onSelect={() => trackOrganicMethod('google')}
                  onError={(msg) => setError(msg)}
                />

                {/* Apple Sign In — kept in code, hidden until Apple Developer is configured.
                    Reactivate by setting NEXT_PUBLIC_ENABLE_APPLE=true (see docs/oauth-setup.md). */}
                {process.env.NEXT_PUBLIC_ENABLE_APPLE === 'true' && (
                  <div className="mt-3">
                    <AppleSignInButton redirectTo={activationRedirect} onError={(msg) => setError(msg)} />
                  </div>
                )}

                <div className="flex items-center gap-3 my-5">
                  <div
                    className="flex-1 h-px"
                    style={{ background: 'var(--border2)' }}
                  />
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--muted)' }}
                  >
                    or sign up with email
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: 'var(--border2)' }}
                  />
                </div>

                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="signup-email"
                      className="block text-xs font-bold mb-2 uppercase tracking-wider"
                      style={{ color: 'var(--muted2)' }}
                    >
                      Email
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      aria-describedby={error ? 'signup-error' : undefined}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      style={{
                        background: 'rgba(255,255,255,.03)',
                        border: '1px solid var(--border2)',
                        color: 'var(--text)',
                        fontFamily: 'inherit',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(41,151,255,.5)'
                        e.target.style.background = 'rgba(41,151,255,.04)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border2)'
                        e.target.style.background = 'rgba(255,255,255,.03)'
                      }}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="signup-password"
                      className="block text-xs font-bold mb-2 uppercase tracking-wider"
                      style={{ color: 'var(--muted2)' }}
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="Min. 6 characters"
                        aria-describedby={error ? 'signup-error' : undefined}
                        className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all"
                        style={{
                          background: 'rgba(255,255,255,.03)',
                          border: '1px solid var(--border2)',
                          color: 'var(--text)',
                          fontFamily: 'inherit',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'rgba(41,151,255,.5)'
                          e.target.style.background = 'rgba(41,151,255,.04)'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border2)'
                          e.target.style.background = 'rgba(255,255,255,.03)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                        style={{
                          color: 'var(--muted2)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {showPassword ? (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="h-1 flex-1 rounded-full transition-colors"
                              style={{
                                background:
                                  strength.level >= i
                                    ? strength.color
                                    : 'rgba(255,255,255,.08)',
                              }}
                            />
                          ))}
                        </div>
                        {strength.label && (
                          <p
                            className="text-xs mt-1.5 font-semibold"
                            style={{ color: strength.color }}
                          >
                            {strength.label}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {error && (
                    <div
                      id="signup-error"
                      role="alert"
                      className="rounded-xl px-4 py-3 text-sm"
                      style={{
                        background: 'rgba(239,68,68,.08)',
                        border: '1px solid rgba(239,68,68,.2)',
                        color: '#f87171',
                      }}
                    >
                      {error}
                      {/* KINEO-STARTFREE-SIGNUP-2026-08-07 — "User already
                          registered" was a dead end: the signup screen never
                          linked to sign-in or password recovery (only /login
                          and the modal did), so someone who forgot the password
                          had nowhere to go from here. Shown only for that
                          error, so a real validation message stays clean. */}
                      {/already\s*registered|already\s*exists/i.test(error) && (
                        <div style={{ marginTop: 8, color: 'var(--muted2)' }}>
                          <Link href={loginHref} style={{ color: '#2997ff', fontWeight: 700 }}>
                            Sign in instead
                          </Link>
                          {' · '}
                          <Link href="/forgot-password" style={{ color: '#2997ff', fontWeight: 700 }}>
                            Forgot your password?
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ONDA1 #14 (13/08) — interstitial do auto-OAuth: quem veio
                      do checkout ve o que esta acontecendo em vez de um
                      formulario que some sozinho para o seletor do Google. */}
                  {autoOauthInFlight && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(8,8,11,.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                      <div style={{ background: '#131316', border: '1px solid rgba(41,151,255,.35)', borderRadius: 18, padding: '28px 26px', maxWidth: 380, textAlign: 'center', boxShadow: '0 18px 60px rgba(0,0,0,.6)' }}>
                        <div style={{ fontSize: '1.6rem', marginBottom: 10 }} aria-hidden="true">🔐</div>
                        <div style={{ fontWeight: 800, color: '#f5f5f7', marginBottom: 6 }}>Taking you to Google sign-in…</div>
                        <div style={{ fontSize: '0.85rem', color: '#a1a1a8', lineHeight: 1.5 }}>
                          {bulkCheckoutContext
                            ? `Your ${bulkCheckoutContext.videos}-video pack is saved. One tap takes you back to its one-time checkout.`
                            : 'One tap and we\'ll bring you straight back to secure checkout.'}
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl py-3.5 font-bold text-sm transition-all mt-1"
                    style={{
                      background: '#f5f5f7',
                      color: '#000',
                      boxShadow: '0 4px 22px rgba(41,151,255,.3)',
                      opacity: loading ? 0.7 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {/* ONDA1 #13 (13/08) — quem chegou aqui escolhendo um plano
                        PAGO nao pode ler "Free Account" no botao. */}
                    {loading
                      ? 'Creating account...'
                      : isCheckoutResume
                        ? bulkCheckoutContext
                          ? `Continue to ${bulkCheckoutContext.videos}-video checkout →`
                          : 'Continue to secure checkout →'
                        : '⚡ Create Free Account'}
                  </button>
                </form>

                <p
                  className="text-center text-sm mt-6"
                  style={{ color: 'var(--muted)' }}
                >
                  Already have an account?{' '}
                  {/* KINEO-CHECKOUT-RESUME-2026-07-07 — keep pending checkout alive */}
                  <Link
                    href={loginHref}
                    className="font-semibold transition-colors"
                    style={{ color: '#2997ff' }}
                  >
                    Sign in
                  </Link>
                </p>
              </>
            )}
        </div>
      </div>
      {/* ONDA3 #17 (14/08) — Footer de marketing removido da tela de auth:
          2 campos e 1 objetivo, sem 278 linhas de links de distracao. */}
    </>
  )
}
