'use client'

import { ChatGptWelcomeCard } from '@/components/ChatGptWelcomeBanner'

export default function ChatGptQuickstartPreviewPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '28px 18px 56px', color: '#f5f5f7', background: '#08080a' }}>
      <div style={{ width: 'min(1180px, 100%)', margin: '0 auto' }}>
        <p style={{ margin: '0 0 8px', color: '#67e8f9', fontSize: 11, fontWeight: 900, letterSpacing: '.14em' }}>
          PREVIEW ONLY · CHATGPT QUICK-START V2
        </p>
        <h1 style={{ margin: '0 0 7px', fontSize: 28 }}>Real component · responsive inspection</h1>
        <p style={{ margin: '0 0 22px', color: '#9a9aa2', lineHeight: 1.5 }}>
          This route renders the production component without acquisition detection or analytics. It is removed before main.
        </p>
        <div style={{ padding: '2px 0 18px', border: '1px solid #29292e', borderRadius: 22, background: '#0b0b0d' }}>
          <ChatGptWelcomeCard onSelect={() => undefined} onDismiss={() => undefined} />
          <div style={{ padding: '34px 24px 22px', color: '#71717a', fontSize: 13 }}>
            Dashboard content continues here.
          </div>
        </div>
      </div>
    </main>
  )
}
