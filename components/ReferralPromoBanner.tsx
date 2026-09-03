'use client'

// Push #452 — Referral growth banner. The referral loop (#443) is live but
// nobody knows it exists. This dismissible banner on the dashboard surfaces it
// so users actually grab their link and invite friends (free top-of-funnel
// growth → more conversion candidates). Mirrors InstallAppBanner/EnablePush
// pattern: localStorage dismiss so it never nags after the user acts/dismisses.
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const DISMISS_KEY = 'sf_referral_promo_dismissed'

// PUSH #100 — o banner é montado no layout do dashboard (app/(dashboard)/
// layout.tsx), logo aparece em TODA rota autenticada. Duas delas já têm uma
// superfície de indicação melhor posicionada, e mostrar as duas ao mesmo tempo
// é ruído:
//   /referral  — é a própria página do programa; o banner viraria um link para
//                a página em que o usuário já está.
//   /generate  — a tela de sucesso pós-render já traz o card inline
//                "Give 30 credits · Get 30 credits" (GenerateClient.tsx), que
//                aparece no momento certo (vídeo pronto na mão). O banner fica
//                no fim do conteúdo e apareceria junto com o card.
// Prefixo, não igualdade: /generate/... e /referral/... também contam.
// KINEO-SEM-PORTEIRO-2026-09-02 b — a supressão existia para não poluir a tela
// de criar. Com a mudança de 24/08 ela deixou de valer e o banner voltou a
// aparecer justamente ali, no meio do trabalho da pessoa.
const SUPPRESSED_PREFIXES = ['/referral', '/studio', '/generate']

export default function ReferralPromoBanner() {
  const [show, setShow] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISS_KEY)) setShow(true)
    } catch {
      // localStorage blocked — just don't show, never crash
    }
  }, [])

  const suppressed = SUPPRESSED_PREFIXES.some(
    (prefix) => pathname === prefix || (pathname?.startsWith(prefix + '/') ?? false),
  )

  if (!show || suppressed) return null

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
    setShow(false)
  }

  return (
    <div
      role="status"
      className="mx-auto mt-4 flex w-full max-w-3xl items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: '#161618',
        border: '1px solid #2a2a2d',
      }}
    >
      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🎁</span>
      <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, color: '#f5f5f7', lineHeight: 1.4 }}>
        Invite a friend — you <span style={{ color: 'var(--blue, #2997ff)' }}>both get 30 free credits</span> when they
        make their first video. Earn referral rewards for up to 20 friends.
      </span>
      <Link
        href="/referral"
        onClick={dismiss}
        className="shrink-0 rounded-lg px-4 py-2 text-xs font-extrabold"
        style={{ background: '#f5f5f7', color: '#000', borderRadius: 980 }}
      >
        Get my link →
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0"
        style={{
          width: 26, height: 26, borderRadius: 8,
          background: 'transparent', border: '1px solid #3a3a3d',
          color: '#86868b', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ×
      </button>
    </div>
  )
}
