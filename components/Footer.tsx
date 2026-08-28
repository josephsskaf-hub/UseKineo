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
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

const linkStyle: React.CSSProperties = {
  color: '#86868b',
  textDecoration: 'none',
}

// Internal navigation grouped for crawl depth + human wayfinding.
const navGroups: { title: string; links: { href: string; label: string; costCalculator?: boolean }[] }[] = [
  {
    title: 'Product',
    // ═══════════════════════════════════════════════════════════════════════
    // KINEO-ORPHAN-REVENUE-2026-08-06 — AUDITORIA DE ÓRFÃS (sprint 16h).
    //
    // Cruzando as 38 entradas do sitemap com os links internos REAIS do
    // repositório (sitemap e rotas /api não contam: nenhum dos dois passa
    // autoridade), TRÊS páginas tinham ZERO link interno — e as três são
    // páginas de RECEITA, o que é o oposto de coincidência:
    //   · /make-money-clipping-with-ai (0.9) — 389 linhas, intenção de dinheiro,
    //     e o destino das DMs de 03/08 para ~6.000 clippers do Whop;
    //   · /ai-avatar (0.8) — o próprio comentário do arquivo se descreve como
    //     "public sales landing for the AI Avatar add-on (revenue page)";
    //   · /facts (0.7) — a página AEO feita para ChatGPT/Perplexity, cujo
    //     comentário diz "Linked from /llms.txt and the sitemap", isto é, foi
    //     desenhada SEM link em HTML. E o canal de answer engine é o de melhor
    //     conversão já medido aqui (docs/growth 23/07: ChatGPT trouxe os DOIS
    //     checkouts da semana; o Google trouxe uma sessão e zero).
    //
    // Estar no sitemap não é ser linkada: sitemap é um convite, link interno é
    // um voto. Página que só recebe convite fica em "Discovered – currently not
    // indexed", que é exatamente o número que o placar diário persegue. A
    // correção é de uma linha por página e não publica NADA de novo — respeita
    // a regra de não lançar página de SEO enquanto houver órfã não rastreada;
    // ela ATACA essa regra pelo lado certo, que é irrigar o que já existe.
    //
    // Efeito medido (não estimado): 0 → 26 links internos para cada uma. 26 é o
    // número de páginas públicas que renderizam este rodapé, não as 54 públicas
    // do app — o Footer não está no layout raiz.
    // ═══════════════════════════════════════════════════════════════════════
    links: [
      // KINEO-NOITE-2026-08-17 — os produtos novos do dia entram no rodape
      // (26 paginas publicas linkando; nenhuma pagina nasce orfa).
      { href: '/images', label: 'AI image generator — 6 engines' },
      { href: '/audio', label: 'AI voice generator (text to speech)' },
      { href: '/ai-video-upscaler', label: 'AI video upscaler & enhancer' },
      { href: '/viral-now', label: 'Trending Shorts ideas today' },
      { href: '/ai-avatar', label: 'AI Avatar video — your face, any script' },
      // `&` literal, NÃO `&amp;`: isto é uma string JS renderizada como
      // {children}, não texto JSX — a entidade HTML sairia na tela como texto.
      { href: '/facts', label: 'Kineo facts & numbers (citable)' },
      { href: '/free-ai-shorts-generator', label: 'Free AI Shorts generator' },
      { href: '/faceless-video-generator', label: 'Faceless video generator' },
      { href: '/youtube-shorts-from-topic', label: 'YouTube Shorts from a topic' },
      { href: '/text-to-video-shorts', label: 'Text to video Shorts' },
      // KINEO-CHATGPT-INTENT-2026-08-10 — o rodapé é o que impede a página de
      // nascer órfã (mesma lógica do bloco no topo deste grupo): 26 páginas
      // públicas renderizam este Footer, então a nova entra com 26 links
      // internos em vez de 0. O canal `chatgpt` virou o maior de entrada
      // externa em 09/08 e não havia superfície falando com ele.
      { href: '/chatgpt-to-youtube-shorts', label: 'ChatGPT script to YouTube Short' },
      { href: '/cheapest-ai-shorts-maker', label: 'Cheapest AI Shorts maker', costCalculator: true },
      { href: '/ai-shorts-without-filming', label: 'Shorts without filming' },
      { href: '/faceless-channel-ideas', label: 'Faceless channel ideas (2026)' },
      { href: '/niche-picker', label: 'Faceless niche picker' },
      { href: '/widget', label: 'Shorts idea widget' },
      { href: '/state-of-ai-shorts-2026', label: 'State of AI Shorts 2026' },
      // KINEO-CASE-STUDY-2026-07-31 — prova viva: canal real no Autopilot, numeros semanais.
      { href: '/youtube-automation-case-study', label: 'Live case study: our channel on Autopilot' },
      { href: '/ai-shorts-for-agencies', label: 'AI Shorts for agencies & client work' },
      { href: '/trust', label: 'Trust Center — privacy, payments & ownership' },
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
      // KINEO-SCRIPT-LIBRARY-2026-08-03 — the single most valuable link added in
      // this change. /scripts is the parent of 575 previously ORPHAN /v/[id]
      // pages; putting it in the global footer means every public page on the
      // domain is one hop from the library, and the library is one hop from
      // every script. Without this the hub would itself be an orphan.
      { href: '/scripts', label: 'Free YouTube Shorts scripts' },
      { href: '/free-script-generator', label: 'Free script generator' },
      { href: '/comment-to-video', label: 'Comment to Short script' },
      { href: '/product-to-video-script', label: 'Product video ad script' },
      { href: '/free-hook-generator', label: 'Free hook generator' },
      { href: '/viral-score', label: 'Free viral score' },
      { href: '/shorts-money-calculator', label: 'Shorts money calculator' },
    ],
  },
  {
    title: 'Shorts money & growth',
    links: [
      // KINEO-ORPHAN-REVENUE-2026-08-06 — ver o bloco no topo do grupo 'Product'.
      // Esta é a página de intenção de DINHEIRO (prioridade 0.9 no sitemap) e o
      // destino das DMs enviadas em 03/08 para as 3 comunidades de clipping do
      // Whop (~6.000 clippers). Ela estava no sitemap e em NENHUM link interno.
      { href: '/make-money-clipping-with-ai', label: 'Make money clipping with AI' },
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
          AI voiceover, footage &amp; captions in a few minutes. {ft(OFFER, 'Create, download and share up to 3 watermarked Fast videos every 24h, no card.', OFFER.copy.headline)} Paid plans unlock clean MP4s.
        </p>
      </div>

      {/* Internal navigation — improves crawl depth + accessibility */}
      <nav
        aria-label="Footer"
        // KINEO-FOOTER-ALIGN-2026-08-15 — era flex-wrap com maxWidth 720: as 4
        // colunas nao cabiam, a COMPARE caia pra segunda linha centralizada e o
        // rodape parecia quebrado (print do fundador). Grid de colunas iguais,
        // topo alinhado; auto-fit empilha sozinho no mobile.
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          alignItems: 'start',
          gap: '28px 40px',
          maxWidth: 1060,
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
          <Link href="/trust" style={linkStyle}>
            Trust Center
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
