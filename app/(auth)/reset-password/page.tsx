'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { trackCheckoutPasswordRecoveryStep } from '@/lib/authAnalytics'
import {
  buildCheckoutPasswordRecoveryHref,
  readCheckoutPasswordRecoveryFromSearch,
  type CheckoutPasswordRecoveryContext,
} from '@/lib/growth/checkoutPasswordRecovery'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const [recoveryContext, setRecoveryContext] = useState<CheckoutPasswordRecoveryContext | null>(null)

  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    setRecoveryContext(readCheckoutPasswordRecoveryFromSearch(window.location.search))
    // ═══════════════════════════════════════════════════════════════════
    // KINEO-RESET-PKCE-2026-08-03 — TODO RESET DE SENHA ESTAVA QUEBRADO.
    //
    // O bug (visto pelo fundador em 03/08, print do botão eternamente
    // desabilitado): este client é o createBrowserClient do @supabase/ssr,
    // que usa PKCE — o link do e-mail chega como /reset-password?code=XXX
    // (QUERY param). O código antigo só procurava token no HASH
    // (#access_token / type=recovery), o formato do fluxo implícito antigo.
    // Resultado: `ready` nunca virava true, o botão ficava desabilitado e o
    // aviso "looks stuck" era o estado permanente. Perda total da conta para
    // quem esqueceu a senha.
    //
    // O conserto cobre os TRÊS caminhos possíveis, em ordem:
    //  1. A lib já trocou o code sozinha na inicialização (detectSessionInUrl)
    //     → getSession() devolve sessão → pronto.
    //  2. O ?code= ainda está na URL → exchangeCodeForSession(code) manual.
    //     Falhou = link expirado/já usado → mensagem honesta + caminho de volta.
    //  3. Links antigos de hash (implicit flow) seguem funcionando.
    // O listener continua como rede de segurança para o evento chegar depois
    // do mount (PASSWORD_RECOVERY no implicit, SIGNED_IN no PKCE).
    // ═══════════════════════════════════════════════════════════════════
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })

    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData.session) {
        setReady(true)
        return
      }
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setLinkError(
            'This reset link has expired or was already used. Request a new one below — it only takes a second.',
          )
        } else {
          setReady(true)
        }
        return
      }
      const hash = window.location.hash
      if (hash.includes('type=recovery') || hash.includes('access_token')) {
        setReady(true)
      }
    })()

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const context = readCheckoutPasswordRecoveryFromSearch(window.location.search)
      setRecoveryContext(context)
      if (context) trackCheckoutPasswordRecoveryStep('completed', context)
      setSuccess(true)
      setTimeout(() => {
        if (context) {
          trackCheckoutPasswordRecoveryStep('resumed', context)
          window.location.assign(context.destination)
          return
        }
        router.push('/generate')
      }, 2000)
    }
  }

  const forgotPasswordHref = buildCheckoutPasswordRecoveryHref('/forgot-password', recoveryContext)
  const loginHref = buildCheckoutPasswordRecoveryHref('/login', recoveryContext)

  const inputStyle = {
    background: 'rgba(255,255,255,.03)',
    border: '1px solid var(--border2)',
    color: 'var(--text)',
    fontFamily: 'inherit',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="fixed rounded-full pointer-events-none" style={{ width: 600, height: 600, background: '#2997ff', top: -200, right: -150, opacity: 0.04, filter: 'blur(90px)', zIndex: 0 }} />
      <div className="fixed rounded-full pointer-events-none" style={{ width: 500, height: 500, background: '#2997ff', bottom: -150, left: 300, opacity: 0.035, filter: 'blur(90px)', zIndex: 0 }} />

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8" style={{ textDecoration: 'none' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#2997ff', boxShadow: '0 0 24px rgba(41,151,255,.45)' }}>
            ⚡
          </div>
          <div className="font-black text-sm tracking-tight" style={{ color: '#f5f5f7' }}>
            Kineo
          </div>
        </Link>

        <div className="rounded-2xl p-8" style={{ background: '#161618', border: '1px solid #2a2a2d', boxShadow: '0 0 80px rgba(41,151,255,.08)' }}>
          {success ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>Password updated!</h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {recoveryContext
                  ? 'Password updated. Returning you to secure checkout…'
                  : 'Redirecting you to the dashboard...'}
              </p>
            </div>
          ) : (
            <>
              {recoveryContext ? (
                <div role="status" className="rounded-xl px-4 py-3 text-sm mb-5" style={{ background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.3)', color: '#5cb3ff', fontWeight: 700 }}>
                  🔒 Your purchase is still saved
                </div>
              ) : null}
              <h1 className="text-2xl font-black mb-1 tracking-tight" style={{ color: 'var(--text)' }}>Set new password</h1>
              <p className="text-sm mb-7" style={{ color: 'var(--muted)' }}>
                {recoveryContext
                  ? 'Choose a strong password. We’ll return you to secure checkout after it is saved.'
                  : 'Choose a strong password for your account.'}
              </p>

              {/* KINEO-RESET-PKCE-2026-08-03 — o aviso genérico "looks stuck"
                  era a UI do bug (ver comentário no useEffect). Agora existem
                  dois estados honestos: verificando (transitório, some sozinho)
                  e link expirado (com o caminho de volta em um clique). */}
              {linkError ? (
                <div className="rounded-xl px-4 py-3 text-sm mb-5" style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', color: '#f59e0b' }}>
                  {linkError}{' '}
                  <Link href={forgotPasswordHref} style={{ color: '#2997ff', fontWeight: 700 }}>
                    Request a new link →
                  </Link>
                </div>
              ) : !ready ? (
                <div className="rounded-xl px-4 py-3 text-sm mb-5" style={{ background: 'rgba(41,151,255,.07)', border: '1px solid rgba(41,151,255,.2)', color: '#5cb3ff' }}>
                  Verifying your reset link…
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="reset-password" className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted2)' }}>
                    New Password
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Min. 6 characters"
                    aria-describedby={error ? 'reset-error' : undefined}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(41,151,255,.5)'; e.target.style.background = 'rgba(41,151,255,.04)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--border2)'; e.target.style.background = 'rgba(255,255,255,.03)' }}
                  />
                </div>

                <div>
                  <label htmlFor="reset-confirm-password" className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted2)' }}>
                    Confirm Password
                  </label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    aria-describedby={error ? 'reset-error' : undefined}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(41,151,255,.5)'; e.target.style.background = 'rgba(41,151,255,.04)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--border2)'; e.target.style.background = 'rgba(255,255,255,.03)' }}
                  />
                </div>

                {error && (
                  <div id="reset-error" role="alert" className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !ready}
                  className="w-full rounded-xl py-3.5 font-bold text-sm transition-all mt-1"
                  style={{
                    background: '#f5f5f7',
                    color: '#000',
                    boxShadow: '0 4px 22px rgba(41,151,255,.3)',
                    opacity: (loading || !ready) ? 0.7 : 1,
                    cursor: (loading || !ready) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Saving...' : '🔐 Update Password'}
                </button>
              </form>

              <p className="text-center text-sm mt-6" style={{ color: 'var(--muted)' }}>
                <Link href={loginHref} className="font-semibold" style={{ color: '#2997ff', textDecoration: 'none' }}>
                  ← Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
