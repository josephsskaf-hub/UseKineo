'use client'

// KINEO-LOGIN-QUADRO-0411 — entrar com Microsoft. No Supabase o provedor se chama 'azure' e precisa do escopo de e-mail.
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackCheckoutAuthStep, type AuthSurface } from '@/lib/authAnalytics'

type Props = {
  redirectTo?: string
  onError?: (message: string) => void
  onSelect?: () => void
  label?: string
  analyticsSurface?: AuthSurface
}

export default function MicrosoftSignInButton({ redirectTo, onError, onSelect, label, analyticsSurface }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    try { onSelect?.() } catch { /* authentication remains available */ }
    setLoading(true)
    if (redirectTo && analyticsSurface) trackCheckoutAuthStep('method_selected', analyticsSurface, redirectTo, 'microsoft')
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const callback = `${origin}/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ''}`
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'azure', options: { redirectTo: callback, scopes: 'email' } })
      if (error) {
        onError?.(error.message)
        setLoading(false)
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Microsoft sign-in failed.')
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full rounded-xl py-3 px-4 font-bold text-sm transition-all flex items-center justify-center gap-3"
      style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border2)', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="0" y="0" width="7.5" height="7.5" fill="#F25022" />
        <rect x="8.5" y="0" width="7.5" height="7.5" fill="#7FBA00" />
        <rect x="0" y="8.5" width="7.5" height="7.5" fill="#00A4EF" />
        <rect x="8.5" y="8.5" width="7.5" height="7.5" fill="#FFB900" />
      </svg>
      <span>{loading ? 'Connecting…' : label ?? 'Continue with Microsoft'}</span>
    </button>
  )
}
