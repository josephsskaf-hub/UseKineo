// Push #116 — global footer for public marketing surfaces (/, /start,
// /pricing, /login, /signup, /terms, /privacy, /not-found). Stays out
// of (dashboard)/* so signed-in surfaces don't pick up duplicated
// chrome — the sidebar there already carries the legal pointers.
//
// ROBO5-UX-2026-06-28 — expanded into an accessible <nav> with internal
// links to the high-intent pages (pricing, the topic→Short landing, the
// cheapest-AI page, the free tools, an alternatives comparison, and the
// free-start CTA). Improves SEO crawl depth (one hop from every public
// page to every money page) and keyboard/screen-reader navigation. Pure
// server component — no 'use client', same default export, styling tokens
// kept inline to match the rest of the marketing chrome.

import Link from 'next/link'
import CostCalculatorLink from '@/components/CostCalculatorLink'
// PROVA-SOCIAL-REAL-2026-07-02 — client badge with real DB counts; self-hides
// when the numbers are low or the stats API fails, so the footer stays honest.
import LiveStatsBadge from '@/components/LiveStatsBadge'

const linkStyle: React.CSSProperties = {
  color: '#86868b',
  textDecoration: 'none',
}

// Internal navigation grouped for crawl depth + human wayfinding.
const navGroups: { title: string; links: { href: string; label: string; costCalculator?: boolean }[] }[] = [
  {
    title: 'Product',
    links: [
      { href: '/viral-now', label: 'Trending Shorts ideas today' },
      { href: '/free-ai-shorts-generator', label: 'Free AI Shorts generator' },
      { href: '/faceless-video-generator', label: 'Faceless video generator' },
      { href: '/youtube-shorts-from-topic', label: 'YouTube Shorts from a topic' },
      { href: '/text-to-video-shorts', label: 'Text to video Shorts' },
      { href: '/cheapest-ai-shorts-maker', label: 'Cheapest AI Shorts maker', costCalculator: true },
      { href: '/ai-shorts-without-filming', label: 'Shorts without filming' },
      { href: '/faceless-channel-ideas', label: 'Faceless channel ideas (2026)' },
      { href: '/niche-picker', label: 'Faceless niche picker' },
      { href: '/widget', label: 'Shorts idea widget' },
      { href: '/state-of-ai-shorts-2026', label: 'State of AI Shorts 2026' },
      // KINEO-CASE-STUDY-2026-07-31 — prova viva: canal real no Autopilot, numeros semanais.
      { href: '/youtube-automation-case-study', label: 'Live case study: our channel on Autopilot' },
      { href: '/partners', label: 'Affiliate program - 40% recurring' },
      // ═══════════════════════════════════════════════════════════════════════
      // KINEO-AFFILIATE-DEDUPE-2026-07-30 — o segundo link foi REMOVIDO daqui.
      //
      // O que existia: duas linhas consecutivas no rodapé com rótulo praticamente
      // idêntico — 'Affiliate program - 40% recurring' (/partners) e
      // 'Affiliate Program — 40% recurring' (/affiliate). Para quem lê, é um bug
      // de duplicação; a diferença era só o hífen contra o travessão.
      //
      // Por que o de /affiliate saiu, e não o de /partners:
      //   1. /affiliate vive no route group (dashboard), que serve `noindex,
      //      follow` desde 29/07. Link de rodapé para página noindex não constrói
      //      nada — só gasta crawl num domínio onde 21 landing pages REAIS nunca
      //      foram rastreadas.
      //   2. É uma tela logada. O rodapé é lido majoritariamente por visitante
      //      anônimo, que clica e bate num muro de cadastro.
      //   3. /partners é a página pública, indexável, que explica o modelo.
      //
      // MEDIDO em 30/07, história inteira do banco: `affiliate_clicks` = 0 e
      // `affiliate_referrals` = 0. Zero cliques desde sempre, apesar de duas
      // linhas de rodapé, uma página de marketing, uma tela de dashboard e quatro
      // tabelas. Pela regra de morte do prompt diário, o programa de afiliados é
      // uma alavanca morta — está registrado no relatório da sprint.
      //
      // O programa NÃO foi desligado: dormente ele não custa nada, e desligar
      // uma promessa pública de 40% recorrente é decisão do fundador, não minha.
      // O que eu tirei é a duplicação e o link que não podia funcionar.
      //
      // (Contexto do PUSH #95, que adicionou este link: na época /affiliate não
      // tinha nenhum link interno no app. Isso continua verdade e continua certo
      // resolver — mas o lugar é a Sidebar do usuário LOGADO, que já tem um
      // (components/Sidebar.tsx), não o rodapé público.)
      // ═══════════════════════════════════════════════════════════════════════
      { href: '/pricing', label: 'Pricing' },
      { href: '/signup', label: 'Start free' },
    ],
  },
  {
    title: 'Free tools',
    links: [
      { href: '/free-ai-shorts-generator', label: 'Free AI Shorts generator' },
      { href: '/free-ai-shorts', label: 'Free AI Shorts by niche' },
      { href: '/free-script-generator', label: 'Free script generator' },
      { href: '/free-hook-generator', label: 'Free hook generator' },
      { href: '/viral-score', label: 'Free viral score' },
      { href: '/shorts-money-calculator', label: 'Shorts money calculator' },
    ],
  },
  {
    title: 'Shorts money & growth',
    links: [
      { href: '/how-much-do-youtube-shorts-pay', label: 'How much do Shorts pay?' },
      { href: '/youtube-shorts-rpm-by-niche', label: 'Shorts RPM by niche (2026)' },
      { href: '/best-ai-shorts-generators', label: 'Best AI Shorts generators' },
      { href: '/can-you-monetize-ai-videos', label: 'Can you monetize AI videos?' },
      { href: '/tiktok-vs-youtube-shorts-monetization', label: 'TikTok vs Shorts: which pays more?' },
    ],
  },
  {
    title: 'Compare',
    links: [
      { href: '/alternatives', label: 'All comparisons' },
      { href: '/alternatives/opusclip', label: 'Kineo vs OpusClip' },
      { href: '/alternatives/invideo', label: 'Kineo vs InVideo' },
      { href: '/alternatives/heygen', label: 'Kineo vs HeyGen' },
      { href: '/alternatives/quso', label: 'Vidyo.ai / Quso pricing' },
    ],
  },
]

export default function Footer({ showStats = true }: { showStats?: boolean }) {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255,255,255,.06)',
        padding: '32px 16px 28px',
        marginTop: 24,
        background: 'transparent',
        color: '#86868b',
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      {/* Brand + positioning tagline */}
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <Link
          href="/"
          style={{ ...linkStyle, color: '#FAFAFA', fontWeight: 800, fontSize: 15 }}
        >
          ⚡ Kineo
        </Link>
        <p style={{ margin: '6px auto 0', maxWidth: 460, color: '#86868b' }}>
          Turn one idea into a ready-to-post faceless YouTube Short — script,
          AI voiceover, footage &amp; captions in a few minutes. Create, download and share
          up to 3 watermarked Fast videos every 24h, no card. Paid plans unlock clean MP4s.
        </p>
      </div>

      {/* Internal navigation — improves crawl depth + accessibility */}
      <nav
        aria-label="Footer"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '28px 48px',
          maxWidth: 720,
          margin: '0 auto 24px',
          textAlign: 'left',
        }}
      >
        {navGroups.map((group) => (
          <div key={group.title}>
            <h2
              style={{
                margin: '0 0 10px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#71717A',
              }}
            >
              {group.title}
            </h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {group.links.map((link) => (
                <li key={link.href} style={{ marginBottom: 7 }}>
                  {link.costCalculator ? (
                    <CostCalculatorLink placement="global_footer" style={linkStyle}>
                      {link.label}
                    </CostCalculatorLink>
                  ) : (
                    <Link href={link.href} style={linkStyle}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Legal + contact (preserved) */}
      <div style={{ textAlign: 'center' }}>
        {/* Real live stats — renders nothing when unavailable/low */}
        {showStats && (
          <div style={{ marginBottom: 10 }}>
            <LiveStatsBadge />
          </div>
        )}
        <div style={{ fontWeight: 600 }}>
          © 2026 Kineo · All rights reserved
        </div>
        <div
          style={{
            marginTop: 6,
            display: 'inline-flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0 14px',
          }}
        >
          <Link href="/terms" style={linkStyle}>
            Terms of Service
          </Link>
          <span aria-hidden style={{ opacity: 0.4 }}>
            ·
          </span>
          <Link href="/privacy" style={linkStyle}>
            Privacy Policy
          </Link>
          <span aria-hidden style={{ opacity: 0.4 }}>
            ·
          </span>
          <a href="mailto:support@usekineo.com" style={linkStyle}>
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
