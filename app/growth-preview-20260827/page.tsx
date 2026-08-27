import type { Metadata } from 'next'
import type { CSSProperties } from 'react'

export const metadata: Metadata = {
  title: 'Growth UI preview',
  robots: { index: false, follow: false },
}

const frame: CSSProperties = {
  border: '1px solid #272c36',
  borderRadius: 22,
  background: '#0b0d12',
  padding: 20,
  boxShadow: '0 20px 50px rgba(0,0,0,.4)',
}

function VideoStrip() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
      {[0, 1, 2].map((item) => (
        <div key={item} style={{ height: 125, borderRadius: 13, background: 'linear-gradient(145deg,#27334b,#151923 50%,#1d4f49)' }} />
      ))}
    </div>
  )
}

function Card({ kind }: { kind: 'episode' | 'subscription' | 'affiliate' }) {
  const affiliate = kind === 'affiliate'
  const subscription = kind === 'subscription'
  const accent = affiliate ? '#34d399' : '#5cb3ff'
  return (
    <section style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 18, borderRadius: 17, padding: 20, border: `1px solid ${affiliate ? 'rgba(52,211,153,.38)' : 'rgba(41,151,255,.45)'}`, background: affiliate ? 'linear-gradient(135deg,rgba(16,185,129,.13),rgba(41,151,255,.05))' : 'linear-gradient(135deg,rgba(41,151,255,.15),rgba(41,151,255,.05))' }}>
      <div style={{ flex: '1 1 420px' }}>
        <div style={{ color: accent, fontSize: 10, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 6 }}>
          {affiliate ? '3 videos complete · creator momentum' : subscription ? 'First Short complete · keep publishing' : 'First Short complete'}
        </div>
        <h2 style={{ margin: '0 0 6px', fontSize: 17 }}>
          {affiliate ? 'Turn your Kineo experience into recurring commission' : subscription ? 'Keep the workflow that made your first Short' : 'Turn it into episode 2'}
        </h2>
        <p style={{ margin: 0, color: '#a8b0bd', fontSize: 12, lineHeight: 1.55 }}>
          {affiliate
            ? 'Activate a partner link, send people to a useful free script tool, and earn 40% on eligible subscription payments you refer.'
            : subscription
              ? 'Starter includes monthly credits and clean exports for new videos. Cancel anytime. Your existing files stay available.'
              : 'Continue from your latest Short with a fresh hook, new facts and a new payoff.'}
        </p>
      </div>
      <div style={{ display: 'flex', flex: '1 1 220px', flexDirection: 'column', gap: 8 }}>
        <span style={{ textAlign: 'center', borderRadius: 12, padding: '12px 17px', color: affiliate ? '#04110c' : '#fff', background: affiliate ? '#34d399' : '#2997ff', fontWeight: 900 }}>
          {affiliate ? 'Activate my partner link →' : subscription ? 'Continue with Starter →' : 'Build Next Episode →'}
        </span>
        {subscription ? <span style={{ textAlign: 'center', borderRadius: 12, padding: '12px 17px', color: '#fff', border: '1px solid rgba(255,255,255,.14)', fontWeight: 900 }}>Build Next Episode First</span> : null}
      </div>
    </section>
  )
}

export default function GrowthPreviewPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#06080c', color: '#f8fafc', padding: '28px', fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 25 }}>My Videos · conversion and affiliate states</h1>
      <p style={{ margin: '0 0 26px', maxWidth: 850, color: '#9ca3af', lineHeight: 1.55 }}>Before/after visual gate. The product displays only one commercial decision: unpaid creators see Starter; subscribed repeat creators see the affiliate program.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 24 }}>
        <div><div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 900, letterSpacing: '.17em', textTransform: 'uppercase', marginBottom: 9 }}>Before · one completed video</div><div style={frame}><VideoStrip /><Card kind="episode" /></div></div>
        <div><div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 900, letterSpacing: '.17em', textTransform: 'uppercase', marginBottom: 9 }}>After · unpaid creator</div><div style={frame}><VideoStrip /><Card kind="subscription" /></div></div>
        <div><div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 900, letterSpacing: '.17em', textTransform: 'uppercase', marginBottom: 9 }}>After · subscribed repeat creator</div><div style={frame}><VideoStrip /><Card kind="affiliate" /></div></div>
      </div>
    </main>
  )
}
