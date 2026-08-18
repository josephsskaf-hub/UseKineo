// KINEO-NOITE2-2026-08-17 (#10) — 404 com a cara da casa. Antes: o 404
// default do Next (branco, sem marca). Agora: dark, azul Kineo, e transforma
// o beco sem saida em porta — Studio, Images, Audio, Home.
import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
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
      <p style={{ position: 'relative', fontSize: 84, fontWeight: 900, letterSpacing: '-0.04em', margin: 0, lineHeight: 1, background: 'linear-gradient(180deg,#f5f5f7,#2997ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        404
      </p>
      <h1 style={{ position: 'relative', fontSize: 22, fontWeight: 800, margin: '14px 0 8px', letterSpacing: '-0.01em' }}>
        This scene didn’t make the final cut.
      </h1>
      <p style={{ position: 'relative', color: '#a1a1a8', fontSize: 14.5, maxWidth: 420, margin: '0 0 26px', lineHeight: 1.6 }}>
        The page you’re looking for doesn’t exist — but your next film does.
      </p>
      <div style={{ position: 'relative', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/studio" style={{ background: '#2997ff', color: '#fff', fontWeight: 800, padding: '12px 20px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 8px 24px rgba(41,151,255,.35)' }}>
          🎬 Open the Studio
        </Link>
        <Link href="/" style={{ border: '1px solid rgba(255,255,255,.14)', color: '#f5f5f7', fontWeight: 700, padding: '12px 20px', borderRadius: 12, textDecoration: 'none' }}>
          ← Back home
        </Link>
      </div>
      <p style={{ position: 'relative', marginTop: 22, fontSize: 12.5, color: '#86868b' }}>
        Or jump to: <Link href="/images" style={{ color: '#2997ff' }}>Images</Link> ·{' '}
        <Link href="/audio" style={{ color: '#2997ff' }}>Audio</Link> ·{' '}
        <Link href="/examples" style={{ color: '#2997ff' }}>Examples</Link> ·{' '}
        <Link href="/pricing" style={{ color: '#2997ff' }}>Pricing</Link>
      </p>
    </div>
  )
}
