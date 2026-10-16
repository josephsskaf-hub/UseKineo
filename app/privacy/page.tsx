// Push #116 — Privacy Policy. LGPD/GDPR-aware: lists exactly what we
// collect, why, and how to ask us to delete it. Static, server-rendered.

import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { HANDOFF_TTL_DAYS } from '@/lib/gptHandoff'
// KINEO-CONSENTIMENTO-1610 — o botão da seção de cookies abre o mesmo painel do banner e do rodapé.
import { PrivacyChoicesLink } from '@/components/ConsentManager'

export const metadata: Metadata = {
  title: 'Privacy Policy — Kineo',
  description:
    'How Kineo collects, uses, and protects your data. LGPD- and GDPR-aware: full deletion rights and a clear contact for requests.',
  // PUSH #92 — P0 canonical bug: without its own canonical this page
  // inherited the root layout's `https://www.usekineo.com`, telling Google
  // it was a duplicate of the homepage.
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
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
          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginBottom: 24,
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#86868b',
              textDecoration: 'none',
            }}
          >
            ← Back to Home
          </Link>
          <h1
            style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              margin: 0,
              marginBottom: 6,
            }}
          >
            Privacy Policy
          </h1>
          <p style={{ color: '#86868b', fontSize: 13, margin: 0, marginBottom: 28 }}>
            Last updated: October 2026
          </p>

          <Section title="What we collect">
            When you sign up we store your email address and an
            authentication identifier. When you use the Service we store
            the prompts you submit, the videos generated for you, the
            credit balance on your account, and basic usage events (page
            views, generation outcomes) so we can keep the product
            working and improving.
          </Section>

          <Section title="Scripts sent from AI assistants">
            When you send a script to Kineo from an AI assistant (the Kineo
            connector for Claude, the Kineo plugin for ChatGPT, the Kineo GPT, a Kineo link or the paste
            page), we store only what is sent: the script, the chosen length,
            frame, engine, language and optional title, plus a one-way hash of
            the calling IP address (or of the anonymized ChatGPT user identifier
            when it comes from a recognized OpenAI connection) and the user agent,
            used for rate limiting and abuse prevention. We do not request your
            conversation history, assistant memory or files; we receive the fields
            submitted to the tool. ChatGPT scripts are sent to OpenAI for a safety
            check before saving. Supabase stores the saved script and Vercel hosts
            the service. Anyone with the saved-script link can read its contents.
            The link works for {HANDOFF_TTL_DAYS} days and resending an unexpired script
            renews that period. Expiration disables the link; it does not delete
            the database record. Saved scripts and associated usage records have
            no automatic deletion schedule and remain until deleted. To request
            access or deletion, email support@usekineo.com with the saved-script link.
          </Section>

          <Section title="How we use it">
            Your data is used to operate the Service: authenticate you,
            generate and deliver videos, charge your subscription, and
            send you product emails (account confirmation, &ldquo;your
            Short is ready&rdquo; notifications). We don&apos;t sell your
            data. We don&apos;t use the content of your prompts to train
            third-party AI models.
          </Section>

          <Section title="Processors we rely on">
            We process data through trusted infrastructure providers:
            Supabase (database, auth), Stripe (payments), Resend
            (transactional email), Vercel (hosting), and the AI/stock
            providers required to render your video. Each processor has
            its own privacy policy. We pass them only the minimum data
            needed to perform their function.
          </Section>

          <Section title="Your rights (LGPD / GDPR)">
            You can request a copy of your data, correct anything that&apos;s
            wrong, or ask us to delete your account and everything we
            store about you. Email{' '}
            <a
              href="mailto:support@usekineo.com"
              style={{ color: '#2997ff', textDecoration: 'none' }}
            >
              support@usekineo.com
            </a>{' '}
            and we&apos;ll action the request within 30 days.
          </Section>

          {/* KINEO-CONSENTIMENTO-1610 — "Cookies and tracking": o que carrega, quando e como recusar. Espelha lib/consent.ts
              (regiões opt-in, GPC, cookie de 12 meses) e o que o layout raiz monta. */}
          <section id="cookies" style={{ marginBottom: 24 }}>
            <h2 style={SECTION_TITLE_STYLE}>Cookies and tracking</h2>
            <div style={SECTION_BODY_STYLE}>
              <p style={{ margin: 0 }}>We group the cookies and tags on usekineo.com in three kinds:</p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                <li>
                  <strong>Essential</strong> (always on): your sign-in session (Supabase), checkout and payment (Stripe),
                  your interface language and appearance, the record of your cookie choice, and Vercel Analytics, which
                  counts page views without cookies.
                </li>
                <li>
                  <strong>Marketing and analytics</strong> (only with your permission where the law requires it):
                  Google Ads (conversion measurement), TikTok Pixel (ad measurement) and Microsoft Clarity (session
                  recordings and heatmaps; never on sign-in, password or billing pages, and email and password fields
                  are masked).
                </li>
                <li>
                  <strong>Affiliate</strong>: Rewardful and our own partner links. They set a referral cookie only when
                  you arrive through a partner&apos;s link, so the partner gets credit if you subscribe. Visitors who did
                  not come from a partner link get no Rewardful cookie and send no Rewardful request.
                </li>
              </ul>
              <p style={{ margin: '8px 0 0' }}>
                In the European Economic Area, the United Kingdom, Switzerland and Brazil, the marketing and analytics
                tags stay off until you click &ldquo;Accept&rdquo; on the banner. Everywhere else they load by default,
                and you can turn them off. We honor the Global Privacy Control signal: if your browser sends it, these
                tags do not load. We keep your choice in a first-party cookie for 12 months.
              </p>
              <p style={{ margin: '8px 0 0' }}>
                To accept or refuse at any time, use{' '}
                <PrivacyChoicesLink style={{ color: '#2997ff', textDecoration: 'none' }}>Your privacy choices</PrivacyChoicesLink>{' '}
                (also in the footer of every page). You can also clear cookies in your browser, or email{' '}
                <a href="mailto:support@usekineo.com" style={{ color: '#2997ff', textDecoration: 'none' }}>support@usekineo.com</a>.
              </p>
            </div>
          </section>

          <Section title="Contact">
            Privacy questions?{' '}
            <a
              href="mailto:support@usekineo.com"
              style={{ color: '#2997ff', textDecoration: 'none' }}
            >
              support@usekineo.com
            </a>
            .
          </Section>
        </div>
      </main>
      <Footer />
    </>
  )
}

// KINEO-CONSENTIMENTO-1610 — os mesmos estilos de <Section/>, para a seção de cookies (que tem lista e não cabe num <p>).
const SECTION_TITLE_STYLE: React.CSSProperties = { fontSize: '1rem', fontWeight: 900, letterSpacing: '-0.01em', margin: 0, marginBottom: 8 }
const SECTION_BODY_STYLE: React.CSSProperties = { fontSize: '0.92rem', color: '#CBD5E1', lineHeight: 1.65, margin: 0 }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontSize: '1rem',
          fontWeight: 900,
          letterSpacing: '-0.01em',
          margin: 0,
          marginBottom: 8,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: '0.92rem',
          color: '#CBD5E1',
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        {children}
      </p>
    </section>
  )
}
