// KINEO-GOOGLE-FAXINA-1011 [fundador 10/11: "escrever no google… com dados, e motivos reais, sem erros"] — /refund dava
// 404 e o revisor do Google Ads procura a política de reembolso. NADA de política nova: a frase é a MESMA constante que o
// /pricing, o modal de upgrade e a faixa de confiança já mostram (MONEY_BACK_GUARANTEE, lib/checkoutPricing.ts), e o
// texto completo continua na seção 4 dos Termos. Guardião: scripts/test-google-faxina-1011.mjs.
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import AdvertiserIdentity from '@/components/AdvertiserIdentity'
import { MONEY_BACK_GUARANTEE } from '@/lib/checkoutPricing'

export const metadata: Metadata = {
  title: 'Refund policy — Kineo',
  description: MONEY_BACK_GUARANTEE,
  alternates: { canonical: '/refund' },
}

const LINK: React.CSSProperties = { color: '#2997ff', textDecoration: 'none' }
const BODY: React.CSSProperties = { fontSize: '0.92rem', color: '#CBD5E1', lineHeight: 1.65, margin: '0 0 16px' }

export default function RefundPage() {
  return (
    <>
      <main
        style={{
          minHeight: '100vh',
          background: '#000',
          color: '#F5F7FF',
          fontFamily: 'var(--font-inter), Inter, system-ui, -apple-system, sans-serif',
          padding: '24px 20px 32px',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <Link href="/" style={{ display: 'inline-block', marginBottom: 24, fontSize: '0.8rem', fontWeight: 700, color: '#86868b', textDecoration: 'none' }}>
            ← Back to Home
          </Link>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 20px' }}>Refund policy</h1>
          <p data-refund-policy="" style={BODY}>{MONEY_BACK_GUARANTEE}</p>
          <p style={BODY}>
            To request it, email{' '}
            <a href="mailto:support@usekineo.com" style={LINK}>support@usekineo.com</a>.
          </p>
          <p style={BODY}>
            The full terms are in section 4 of the <Link href="/terms" style={LINK}>Terms of Service</Link>. For anything
            else, see <Link href="/support" style={LINK}>Support</Link>.
          </p>
          <AdvertiserIdentity style={{ ...BODY, margin: 0 }} />
        </div>
      </main>
      <Footer />
    </>
  )
}
