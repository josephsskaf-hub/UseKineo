import Link from 'next/link'
import { HANDOFF_TTL_DAYS } from '@/lib/gptHandoff'

// ═══ KINEO-GPT-VERDADE-2026-09-07 — o visual compartilhado de /go/<token> ═══
//
// Extraído de page.tsx sem mudar um byte de estilo, para que page.tsx e
// not-found.tsx desenhem a MESMA página. Motivo: /go/<token falso> respondia
// HTTP 200 com a tela "expired" — soft-404 que deixava toda sonda futura sem
// controle de status e ensinava ao Google que lixo aleatório é página. Agora
// `missing` é notFound() de verdade (404, mesmo visual, via not-found.tsx);
// `expired` e `unavailable` continuam 200 (ver o comentário em page.tsx).
//
// Sem CSS novo: mesmo vocabulário inline de app/revive/[handle]/page.tsx e
// app/v/[id]/page.tsx (BLUE/MUTED/TEXT/SOFT, Shell, Wordmark).
export const BLUE = '#2997ff'
export const MUTED = '#86868b'
export const TEXT = '#f5f5f7'
export const SOFT = '#d2d2d7'

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: TEXT,
        padding: '22px 16px 64px',
        fontFamily: 'var(--font-sans), Arial, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>{children}</div>
    </main>
  )
}

export function Wordmark() {
  return (
    <Link href="/" style={{ color: BLUE, fontWeight: 800, fontSize: '1.02rem', letterSpacing: '-0.01em', textDecoration: 'none' }}>
      Kineo
    </Link>
  )
}

export const BUTTON: React.CSSProperties = {
  display: 'inline-block',
  background: BLUE,
  color: '#fff',
  fontWeight: 700,
  fontSize: '1.05rem',
  padding: '14px 26px',
  borderRadius: 12,
  textDecoration: 'none',
}

export function Expired({ reason }: { reason: 'expired' | 'missing' | 'unavailable' }) {
  const line =
    reason === 'unavailable'
      ? 'This page is temporarily unavailable. It will be back in a minute — please refresh.'
      : reason === 'missing'
        ? 'This link does not match any script. Links from the Kineo GPT look like /go/… and are valid for ' + HANDOFF_TTL_DAYS + ' days.'
        : `This link has expired. Scripts handed off by the Kineo GPT stay open for ${HANDOFF_TTL_DAYS} days.`
  return (
    <Shell>
      <header style={{ marginBottom: 26 }}>
        <Wordmark />
      </header>
      <h1 style={{ fontSize: 'clamp(1.6rem, 6vw, 2.2rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
        {reason === 'unavailable' ? 'One moment.' : 'This link has expired.'}
      </h1>
      <p style={{ color: SOFT, fontSize: '1.05rem', lineHeight: 1.6, margin: '0 0 24px' }}>{line}</p>
      <p style={{ color: SOFT, fontSize: '1rem', lineHeight: 1.6, margin: '0 0 24px' }}>
        You can still paste the script yourself: open the Studio, paste the text, choose &ldquo;Use my script as is&rdquo; and press Generate.
      </p>
      <Link href="/studio?utm_source=chatgpt_gpt&intent_campaign=kineo_gpt_store_expired" style={BUTTON}>
        Open the Studio
      </Link>
    </Shell>
  )
}
