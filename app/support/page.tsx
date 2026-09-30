import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support — Kineo',
  description: 'Get help with Kineo and scripts saved from AI assistants.',
  alternates: { canonical: '/support' },
}

export default function SupportPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f7ff', padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <article style={{ maxWidth: 720, margin: '0 auto', lineHeight: 1.7 }}>
        <p style={{ color: '#a1a1aa' }}>Kineo</p>
        <h1>Support</h1>
        <p>For help with your account, a saved script or the Kineo tools in ChatGPT, email <a style={{ color: '#5cb3ff' }} href="mailto:support@usekineo.com">support@usekineo.com</a>.</p>
        <p>Include what you tried and the exact error. If your request concerns a saved script, include its link. Do not send passwords, payment card details or identity documents.</p>
        <h2>Saved scripts</h2>
        <p>The tools return the script and its duration assessment. Opening a saved-script link does not render a video. You can request access to or deletion of your saved script by email.</p>
        <nav aria-label="Policies" style={{ display: 'flex', gap: 24 }}>
          <a style={{ color: '#5cb3ff' }} href="/privacy">Privacy policy</a>
          <a style={{ color: '#5cb3ff' }} href="/terms">Terms of service</a>
        </nav>
      </article>
    </main>
  )
}
