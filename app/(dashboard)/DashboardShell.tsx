'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import MobileNav from '@/components/MobileNav'
import AvatarLaunchBanner from '@/components/AvatarLaunchBanner'
// KINEO-REBASE-2026-07-10 — one-time 2:1 credit-rebase notice (self-expires 24/07)
import CreditRebaseBanner from '@/components/CreditRebaseBanner'
import { usePathname } from 'next/navigation'

interface DashboardShellProps {
  children: React.ReactNode
  userEmail: string
  isPro: boolean
  generationsUsed: number
  isLoggedIn: boolean
}

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Creator Hub',
  '/create': 'Create Video',
  '/generate': 'Generate New Short',
  '/my-videos': 'My Videos',
  '/viral-now': 'Viral Now',
  '/avatar': 'AI Avatar Studio',
  '/animate': 'Animate a Photo',
  '/examples': 'Examples',
  '/history': 'My Videos',
  '/pricing': 'Pricing',
  '/templates': 'Viral Templates',
  '/account': 'Account',
  '/video': 'Video Studio',
  '/channel': 'Channel Builder',
  '/autopilot': 'Autopilot',
  '/admin/metrics': 'Admin · Metrics',
  '/thumbnail-generator': 'AI Thumbnail Generator',
  '/referral': 'Invite & Earn',
  '/affiliate': 'Affiliate Dashboard',
  '/admin/ceo': 'Admin · CEO',
  '/admin/funnel': 'Admin · Funnel',
  '/admin/users': 'Admin · Users',
  '/admin/affiliates': 'Admin · Affiliates',
  '/v2': 'Create (V2 Beta)',
}

export default function DashboardShell({
  children,
  userEmail,
  isPro,
  generationsUsed,
  isLoggedIn,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Dashboard'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Glow orbs */}
      <div
        className="fixed rounded-full pointer-events-none"
        style={{ width: 600, height: 600, background: '#2997ff', top: -200, right: -150, opacity: 0.07, filter: 'blur(120px)', zIndex: 0 }}
      />
      <div
        className="fixed rounded-full pointer-events-none"
        style={{ width: 500, height: 500, background: '#2997ff', bottom: -150, left: 300, opacity: 0.05, filter: 'blur(110px)', zIndex: 0 }}
      />

      {/* Desktop sidebar spacer — must match Sidebar width (248px) */}
      <div className="hidden md:block flex-shrink-0" style={{ width: 248 }} />

      {/* Desktop sidebar (always open).
          Push #052 — wrapped in `hidden md:block` so the fixed 248px aside
          no longer overlays mobile content. The mobile-toggle path below
          inside `md:hidden` is the only one that renders on small screens. */}
      <div className="hidden md:block">
        <Sidebar
          userEmail={userEmail}
          isPro={isPro}
          generationsUsed={generationsUsed}
          isLoggedIn={isLoggedIn}
          isOpen={true}
          onClose={() => {}}
        />
      </div>

      {/* Mobile sidebar overlay (toggle) */}
      {sidebarOpen && (
        <div className="md:hidden">
          <Sidebar
            userEmail={userEmail}
            isPro={isPro}
            generationsUsed={generationsUsed}
            isLoggedIn={isLoggedIn}
            isOpen={true}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-w-0">
        <TopBar
          title={title}
          isPro={isPro}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />
        {/* KINEO-REBASE-2026-07-10 — credit-rebase conversion notice (dismissible,
            localStorage kineo_rebase_seen, hard-stops after 2026-07-24) */}
        <CreditRebaseBanner />
        {/* AI Avatar launch banner — dismissible, links to /generate?avatar=1 */}
        <AvatarLaunchBanner />
        {/* KINEO-PRELAUNCH-PATH-2026-08-08 — pb-16 (64px) era MENOR que a barra
            que ele existe para compensar. MobileNav e fixed bottom:0 com uma
            linha de 62px MAIS paddingBottom: max(env(safe-area-inset-bottom),
            6px) — ou seja 68px no pior caso sem notch e ~96px num iPhone com
            home indicator. Os ultimos ~32px de TODA tela do dashboard ficavam
            permanentemente embaixo da nav no celular, inclusive a borda de
            baixo do botao de download e a ultima linha do card de oferta.
            pb-28 (112px) e classe padrao do Tailwind (nao e valor arbitrario,
            entao nao depende do JIT gerar nada novo) e cobre 62+34+6=102px com
            folga. `md:pb-0` inalterado: no desktop a MobileNav e md:hidden e
            nada muda. */}
        <main className="flex-1 overflow-y-auto pb-28 md:pb-0">{children}</main>
        <MobileNav isLoggedIn={isLoggedIn} />
      </div>
    </div>
  )
}
