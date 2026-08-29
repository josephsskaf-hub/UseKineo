'use client'

// sprint-ui #2 (2026-08-29) — irmao do app/error.tsx para falhas do layout
// raiz. So aparece quando o proprio layout quebra; precisa renderizar html/
// body proprios (regra do Next). Sem next/link aqui: com o app quebrado, um
// <a> puro e mais confiavel.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#050506',
          color: '#f5f5f7',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <p style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-0.04em', margin: 0, lineHeight: 1, color: '#2997ff' }}>
          Cut!
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '14px 0 8px' }}>
          Kineo hit a snag loading.
        </h1>
        <p style={{ color: '#a1a1a8', fontSize: 14.5, maxWidth: 440, margin: '0 0 26px', lineHeight: 1.6 }}>
          Your videos and credits are safe. Reloading usually fixes it.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{ background: '#2997ff', color: '#fff', fontWeight: 800, padding: '12px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15 }}
          >
            ↻ Try again
          </button>
          <a
            href="/"
            style={{ border: '1px solid rgba(255,255,255,.14)', color: '#f5f5f7', fontWeight: 700, padding: '12px 20px', borderRadius: 12, textDecoration: 'none', fontSize: 15 }}
          >
            Back home
          </a>
        </div>
        {error?.digest ? (
          <p style={{ marginTop: 22, fontSize: 12, color: '#86868b' }}>
            Error code: <code style={{ color: '#a1a1a8' }}>{error.digest}</code>
          </p>
        ) : null}
      </body>
    </html>
  )
}
