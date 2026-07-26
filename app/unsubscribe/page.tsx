// KINEO-UNSUBSCRIBE-2026-07-26 — tela de descadastro.
//
// Server component puro, sem JavaScript de cliente: o botão é um <form> HTML
// nativo com method="post". Menos coisa para quebrar num fluxo que PRECISA
// funcionar sempre — e funciona até com JS desligado.
//
// O link do rodapé dos emails traz a pessoa para cá (nunca direto para a API),
// porque scanners corporativos fazem GET em todo link do email; aqui o GET não
// tem efeito colateral nenhum, o opt-out só acontece no POST do botão.
import type { Metadata } from 'next'
import Link from 'next/link'
import { verifyUnsubscribeToken } from '@/lib/emailSuppression'

export const metadata: Metadata = {
  title: 'Unsubscribe — Kineo',
  description: 'Stop receiving emails from Kineo.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type SearchParams = {
  done?: string
  error?: string
  u?: string
  t?: string
}

const PAGE_STYLE: React.CSSProperties = {
  minHeight: '100vh',
  background: '#000',
  color: '#F5F7FF',
  fontFamily: 'var(--font-inter), Inter, system-ui, -apple-system, sans-serif',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px 20px',
}

const CARD_STYLE: React.CSSProperties = {
  width: '100%',
  maxWidth: 460,
  background: '#0f0f11',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20,
  padding: '36px 32px',
  textAlign: 'center',
}

const TITLE_STYLE: React.CSSProperties = {
  fontSize: 'clamp(1.4rem, 4vw, 1.8rem)',
  fontWeight: 900,
  letterSpacing: '-0.02em',
  margin: '0 0 10px',
}

const BODY_STYLE: React.CSSProperties = {
  color: '#86868b',
  fontSize: 14,
  lineHeight: 1.65,
  margin: '0 0 24px',
}

const BUTTON_STYLE: React.CSSProperties = {
  display: 'inline-block',
  background: '#2997ff',
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 800,
  border: 'none',
  borderRadius: 12,
  padding: '14px 30px',
  cursor: 'pointer',
}

const BACK_LINK_STYLE: React.CSSProperties = {
  display: 'inline-block',
  marginTop: 22,
  fontSize: 13,
  fontWeight: 700,
  color: '#86868b',
  textDecoration: 'none',
}

export default function UnsubscribePage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ?? {}
  const userId = (params.u ?? '').trim()
  const token = (params.t ?? '').trim()
  const done = params.done === '1'
  const failed = params.error === '1'
  const canUnsubscribe = !!userId && verifyUnsubscribeToken(userId, token)

  return (
    <main style={PAGE_STYLE}>
      <div style={CARD_STYLE}>
        <p
          style={{
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: '-0.01em',
            color: '#F5F7FF',
            margin: '0 0 22px',
          }}
        >
          Kineo
        </p>

        {done ? (
          <>
            <h1 style={TITLE_STYLE}>You&apos;ve been unsubscribed</h1>
            <p style={BODY_STYLE}>
              You won&apos;t receive marketing emails from Kineo anymore. It can take a few minutes
              for anything already queued to stop. Your account and your videos are untouched.
            </p>
          </>
        ) : failed ? (
          <>
            <h1 style={TITLE_STYLE}>This link didn&apos;t work</h1>
            <p style={BODY_STYLE}>
              The unsubscribe link looks incomplete or was altered in transit. Email{' '}
              <a href="mailto:joseph@usekineo.com" style={{ color: '#2997ff', textDecoration: 'none' }}>
                joseph@usekineo.com
              </a>{' '}
              and we&apos;ll remove you by hand.
            </p>
          </>
        ) : canUnsubscribe ? (
          <>
            <h1 style={TITLE_STYLE}>Unsubscribe from Kineo emails</h1>
            <p style={BODY_STYLE}>
              Confirm below and we&apos;ll stop sending you marketing and product emails. Your
              account stays active and you keep all your videos and credits.
            </p>
            <form method="post" action={`/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${encodeURIComponent(token)}`}>
              {/* Marca o POST como vindo do navegador: a API responde com um
                  redirect para a tela de confirmação em vez do corpo vazio que
                  o one-click do RFC 8058 espera. */}
              <input type="hidden" name="web" value="1" />
              <button type="submit" style={BUTTON_STYLE}>
                Unsubscribe me
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 style={TITLE_STYLE}>Unsubscribe from Kineo emails</h1>
            <p style={BODY_STYLE}>
              To unsubscribe, open the Unsubscribe link at the bottom of any email we sent you — it
              carries the code that identifies your account. If you can&apos;t find it, email{' '}
              <a href="mailto:joseph@usekineo.com" style={{ color: '#2997ff', textDecoration: 'none' }}>
                joseph@usekineo.com
              </a>{' '}
              and we&apos;ll remove you by hand.
            </p>
          </>
        )}

        <Link href="/" style={BACK_LINK_STYLE}>
          ← Back to Kineo
        </Link>
      </div>
    </main>
  )
}
