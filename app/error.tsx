'use client'

// sprint-ui #2 (2026-08-29) — pagina de erro da casa. Antes: qualquer excecao
// de tela caia no error screen default do Next (branco, sem marca, sem acao).
// Divida anotada no incidente JWT-skew de 28/08: 4 telas esconderam o mesmo
// erro de leitura de 4 jeitos e nenhuma disse "instavel, tente de novo".
// Agora: dark, azul Kineo, diz que os dados estao a salvo e da o botao de
// tentar de novo (reset re-renderiza o segmento sem reload).
import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Rastro no console p/ suporte; digest e o id que a Vercel loga no server.
    console.error('[kineo-error-boundary]', error?.digest || '', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '70vh',
        background: '#050506',
        color: '#f5f5f7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: 'absolute', width: 600, height: 600, background: '#2997ff', top: -250, left: '50%', transform: 'translateX(-50%)', opacity: 0.09, filter: 'blur(100px)' }}
      />
      <p style={{ position: 'relative', fontSize: 64, fontWeight: 900, letterSpacing: '-0.04em', margin: 0, lineHeight: 1, background: 'linear-gradient(180deg,#f5f5f7,#2997ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Cut!
      </p>
      <h1 style={{ position: 'relative', fontSize: 22, fontWeight: 800, margin: '14px 0 8px', letterSpacing: '-0.01em' }}>
        Something glitched on this screen.
      </h1>
      <p style={{ position: 'relative', color: '#a1a1a8', fontSize: 14.5, maxWidth: 440, margin: '0 0 26px', lineHeight: 1.6 }}>
        Your videos and credits are safe — this was just a hiccup loading the
        page. Trying again usually fixes it.
      </p>
      <div style={{ position: 'relative', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => reset()}
          style={{ background: '#2997ff', color: '#fff', fontWeight: 800, padding: '12px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, boxShadow: '0 8px 24px rgba(41,151,255,.35)' }}
        >
          ↻ Try again
        </button>
        <Link href="/dashboard" style={{ border: '1px solid rgba(255,255,255,.14)', color: '#f5f5f7', fontWeight: 700, padding: '12px 20px', borderRadius: 12, textDecoration: 'none', fontSize: 15 }}>
          Go to dashboard
        </Link>
      </div>
      {error?.digest ? (
        <p style={{ position: 'relative', marginTop: 22, fontSize: 12, color: '#86868b' }}>
          Error code: <code style={{ color: '#a1a1a8' }}>{error.digest}</code> —
          include it if you contact support.
        </p>
      ) : null}
    </div>
  )
}
