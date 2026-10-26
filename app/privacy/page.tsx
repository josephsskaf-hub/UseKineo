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

          {/* KINEO-PRIVACIDADE-PLUGIN-2610 — a revisão da OpenAI recusou o plugin em 21/10 porque a política não dizia
              "dados coletados, finalidades, destinatários, retenção e controles". Cada um virou uma seção explícita. */}
          <Section title="Who we are">
            Kineo (usekineo.com) is an AI video service. Kineo is the controller of the personal data described
            here. For any privacy request, write to support@usekineo.com.
          </Section>

          <ListSection
            title="What we collect"
            intro="We collect only what we need to run the Service:"
            items={[
              <><strong>Account data</strong>: your email address, your sign-in method (email link, password or Google) and an internal account ID.</>,
              <><strong>What you create with</strong>: the ideas, scripts and prompts you type, the settings you choose (length, engine, language, voice, format), and any file you upload, such as product photos, a reference face, a logo or brand details.</>,
              <><strong>What we create for you</strong>: the videos, images, narration audio, captions and thumbnails generated from your input.</>,
              <><strong>Billing data</strong>: your plan, credit balance and payment history. Card details are entered on Stripe and never reach our servers; we keep only the Stripe customer ID and payment status.</>,
              <><strong>Usage and device data</strong>: product events (pages visited, generations started, finished or failed), a one-way hash of your IP address, your browser user agent and approximate country, used for security, abuse prevention and fixing errors.</>,
              <><strong>Connected accounts</strong>: only if you choose to connect YouTube, we store the access tokens Google issues so we can upload the videos you pick and show their view counts.</>,
              <><strong>Messages to us</strong>: emails you send to support and our replies.</>,
            ]}
          />

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

          {/* KINEO-PRIVACIDADE-PLUGIN-2610 — entradas e saídas das ferramentas do plugin/conector, como a revisão pediu. */}
          <ListSection
            title="What the ChatGPT plugin and Claude connector receive and return"
            intro="The Kineo plugin and connector only see the fields the assistant fills in when it calls a Kineo tool:"
            items={[
              <><strong>Inputs</strong>: an idea or a script, the length, format (such as film), aspect ratio, engine, narration language, script mode and an optional title. Status tools receive only a job ID.</>,
              <><strong>Outputs</strong>: a Kineo link to review the script, or, if you signed in to your Kineo account through the connector, a job ID, the render status, the credits used and links to your finished videos. Fact tools return public information about Kineo, such as plans and engines.</>,
              <><strong>Account access</strong>: signing in through the connector lets the assistant read your credit balance and recent videos and start a video that spends your credits. You can revoke this access at any time in the assistant&apos;s connector settings.</>,
              <><strong>What we never receive</strong>: your chat history, assistant memory, other files or anything outside those fields.</>,
            ]}
          />

          {/* KINEO-PRIVACIDADE-PLUGIN-2610 — finalidades. */}
          <ListSection
            title="Why we use it"
            intro="We use your data only for these purposes:"
            items={[
              <>To sign you in and keep your account secure.</>,
              <>To write, render and deliver the videos, images and audio you ask for, and to keep them in your library.</>,
              <>To charge your plan, apply credits and send receipts.</>,
              <>To send service emails, such as account confirmation and &ldquo;your video is ready&rdquo;, and, if you have not opted out, occasional product news. Every marketing email has an unsubscribe link.</>,
              <>To prevent abuse and fraud, enforce limits and fix errors.</>,
              <>To measure and improve the product with aggregated usage numbers.</>,
            ]}
            outro="We don't sell your personal data, and we don't use your content to train our own AI models."
          />

          {/* KINEO-PRIVACIDADE-PLUGIN-2610 — destinatários nomeados, um por um (antes era uma frase genérica). */}
          <ListSection
            title="Who receives it"
            intro="We share data only with the providers that run the Service, and only what each one needs:"
            items={[
              <><strong>Supabase</strong> (database, sign-in, file storage) and <strong>Vercel</strong> (hosting): all account data and media.</>,
              <><strong>Stripe</strong>: billing and payment data.</>,
              <><strong>Resend</strong>: your email address and the content of service emails.</>,
              <><strong>OpenAI</strong>: your idea or script, to write and check scripts, plan scenes, create narration and transcribe captions.</>,
              <><strong>fal.ai</strong> and the AI models it hosts (such as Seedance, Kling, Veo, MiniMax and FLUX): scene descriptions, narration text and any photos you upload for that video, to generate images, video clips, voice and music.</>,
              <><strong>ElevenLabs</strong>: narration text, when that voice is used.</>,
              <><strong>Creatomate</strong>: the clips, audio and captions, to assemble the final video.</>,
              <><strong>Pixabay and Pexels</strong>: only short search terms, to find stock footage. No personal data.</>,
              <><strong>Google (YouTube)</strong>: the video and title you choose to publish, only if you connect YouTube.</>,
              <><strong>Advertising, analytics and affiliate tools</strong> (Google Ads, TikTok, Microsoft Clarity, Rewardful): as described under &ldquo;Cookies and tracking&rdquo; below.</>,
            ]}
            outro="We may also disclose data when the law requires it or to protect users and the Service. Most of these providers are in the United States, so your data may be processed outside your country under their standard data-protection terms."
          />

          {/* KINEO-PRIVACIDADE-PLUGIN-2610 — retenção. */}
          <ListSection
            title="How long we keep it"
            items={[
              <><strong>Account data, creations and media</strong>: while your account exists. When you delete an item in the app, or ask us to delete an item or close your account, we remove it from our systems within 30 days, including backups.</>,
              <><strong>Scripts sent from AI assistants</strong>: as described above, until deleted on request.</>,
              <><strong>Usage events</strong>: while your account exists, then deleted or kept only in anonymized, aggregated form.</>,
              <><strong>YouTube tokens</strong>: until you disconnect YouTube or close your account.</>,
              <><strong>Payment records</strong>: as long as tax and accounting law requires.</>,
              <><strong>Support emails</strong>: up to 3 years, to handle follow-ups.</>,
            ]}
          />

          {/* KINEO-PRIVACIDADE-PLUGIN-2610 — controles do usuário. */}
          <ListSection
            title="Your controls and rights"
            intro="You stay in control of your data:"
            items={[
              <>Delete your saved characters, brands, logos and uploaded footage in the app at any time, and ask us to delete any video, image or audio we generated for you.</>,
              <>Disconnect YouTube from your account settings, or revoke Kineo in your Google account.</>,
              <>Revoke the ChatGPT plugin or Claude connector in that assistant&apos;s settings.</>,
              <>Turn marketing cookies on or off with &ldquo;Your privacy choices&rdquo;, and unsubscribe from product emails with one click.</>,
              <>Ask for a copy of your data, a correction, or the deletion of your account and everything we store about you. Under the LGPD, the GDPR and US state privacy laws you may also object to or restrict some processing.</>,
            ]}
            outro="Email support@usekineo.com from your account address and we will answer within 30 days. You can also complain to your local data-protection authority."
          />

          <Section title="Security">
            Data travels over HTTPS and is stored with access controls. Only the people who operate Kineo can reach
            it, and only to run and support the Service. No system is perfectly secure, so we will tell you without
            undue delay if a breach affects your data.
          </Section>

          <Section title="Children">
            Kineo is not directed to children under 13, or under 16 where local law sets that age. We do not knowingly
            collect their data; if you believe a child has given us data, write to us and we will delete it.
          </Section>

          <Section title="Changes to this policy">
            When we change this policy we update the date at the top. If a change materially affects how we use your
            data, we will tell you by email or in the product before it takes effect.
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

// KINEO-PRIVACIDADE-PLUGIN-2610 — seção com lista (o <Section/> só tem um <p>), nos mesmos estilos.
function ListSection({ title, intro, items, outro }: { title: string; intro?: string; items: React.ReactNode[]; outro?: string }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={SECTION_TITLE_STYLE}>{title}</h2>
      <div style={SECTION_BODY_STYLE}>
        {intro ? <p style={{ margin: 0 }}>{intro}</p> : null}
        <ul style={{ margin: intro ? '8px 0 0' : 0, paddingLeft: 20 }}>
          {items.map((item, i) => <li key={i} style={{ marginTop: i ? 4 : 0 }}>{item}</li>)}
        </ul>
        {outro ? <p style={{ margin: '8px 0 0' }}>{outro}</p> : null}
      </div>
    </section>
  )
}

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
