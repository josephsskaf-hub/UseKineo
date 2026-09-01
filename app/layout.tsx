import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Inter, Space_Grotesk } from 'next/font/google'
import StructuredData from '@/components/StructuredData'
import SourceCapture from '@/components/SourceCapture'
import CheckoutResumeBanner from '@/components/CheckoutResumeBanner'
import AutopilotPilotResumeBanner from '@/components/AutopilotPilotResumeBanner'
// KINEO-CHECKOUT-REDIRECT-2026-08-08 — montado UMA vez, aqui, de propósito:
// existem 15 superfícies de checkout no repo e o fallback tem que valer para
// todas. Uma superfície esquecida seria exatamente a que perderia a venda.
import CheckoutStalledCta from '@/components/CheckoutStalledCta'
import { Analytics } from '@vercel/analytics/next'
import { FreeTierOfferProvider } from '@/components/FreeTierOfferProvider'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
import './globals.css'

// [KINEO-TRIAL-SWAP-2026-08-07] — a oferta do free tier (comportamento + copy)
// resolvida UMA vez no servidor. O provider abaixo leva o MESMO objeto para
// todos os client components; as metadata strings usam ft() (flag OFF = literal
// atual byte a byte). Na Vercel, virar a flag = setar env + REDEPLOY (o rebuild
// troca as páginas estáticas junto — ver lib/freeTierOffer.ts).
const OFFER = getFreeTierOffer()

// Push #92 — Core Web Vitals: self-host both families with next/font/google
// instead of the render-blocking googleapis.com @import that used to sit at
// the top of globals.css (CSS download -> parse -> discover googleapis ->
// discover gstatic -> font bytes, four round trips before text painted).
// Weights are the ones actually in use across app/ + components/ via
// font-weight/fontWeight (400/500/600/700/800 for body copy and buttons,
// 600/700 for Space Grotesk headings) — grepped repo-wide before picking
// these instead of shipping all nine original weights.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
})
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  weight: ['600', '700'],
  variable: '--font-space-grotesk',
})

// Push #117 — explicit viewport so iOS Safari renders pages at the
// device width (not 980px-zoomed-out) and the 16px input rule below
// can do its job. maximum-scale: 5 keeps pinch-to-zoom for
// accessibility — never lock it to 1.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  // Push #422 — PWA: paints the iOS/Android browser chrome in the brand
  // dark so the installed app feels native edge-to-edge.
  themeColor: '#0d0d14',
}

// Push #297 — meta title + description rewritten for Google Ads Quality
// Score alignment. Matching keyword density between ad copy and landing
// page increases relevance score → better Ad Rank → higher CTR.
export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  // KINEO-BRAND-SERP-2026-07-29 — reescrito para INTENÇÃO DE MARCA.
  //
  // O QUE OS DADOS DIZEM (Search Console, 28 dias encerrando 27/07):
  //   231 impressões · 8 cliques · posição média 22,4. E as consultas com mais
  //   impressão são TODAS a própria marca:
  //     kineo 10 · cineo 10 (erro de digitação) · kineo ai 9 · compare kineo 7
  //     · creeo 3  →  ~39 impressões de marca, ZERO clique.
  //
  // Busca de marca converte a 30–60% de CTR em qualquer produto saudável.
  // A da Kineo é 0%. Quem digita o nome já decidiu procurar a empresa; se não
  // clica, é porque o resultado não parece ser a empresa que ele procura.
  //
  // Três defeitos no título antigo, todos no momento exato de verificação:
  //   1. Liderava com DESCONTO ("$4.90 First Month"). Lê como anúncio, não como
  //      site oficial.
  //   2. Preço como STRING LITERAL em metadata — o padrão que AGENTS.md §2.3
  //      proíbe, e que já produziu três vazamentos. Concretamente: a ficha do
  //      TAAFT foi corrigida para "$9.90/mo" em 29/07, então quem vinha de lá
  //      via $9,90 e depois $4,90, um contradizendo o outro.
  //   3. A descrição vendia mecânica do free tier ("3 watermarked Fast videos
  //      every 24h") em vez de responder "sim, é esta empresa e ela faz isto".
  //
  // O novo lidera com o nome (casa com a consulta), diz o que é em linguagem
  // simples, marca "Official Site" como âncora de confiança para busca de
  // marca, e não carrega preço nenhum — preço vive em lib/checkoutPricing.ts e
  // em /pricing, que é onde ele pode mudar sem mentir em quatro lugares.
  title: 'Kineo — AI YouTube Shorts Generator (Official Site)',
  description:
    `Kineo turns one topic into a finished faceless YouTube Short — script, AI voiceover, matched footage and burned-in captions, usually in 3–7 minutes. ${ft(OFFER, '3 free videos every 24h, no card.', OFFER.copy.headline)}`,
  // PUSH #92 — P0 canonical bug fix: a root-level `alternates.canonical` was
  // shallow-merged onto every page in the tree that doesn't declare its own,
  // which told Google every un-canonicalized page is a duplicate of `/`
  // (de-indexing them). Canonical now lives ONLY on pages that declare it
  // themselves (see app/page.tsx for the homepage's own `canonical: '/'`).
  keywords: [
    'YouTube Shorts generator',
    'AI YouTube Shorts creator',
    'AI short video generator',
    'make YouTube Shorts automatically',
    'YouTube Shorts maker AI',
    'AI video generator',
    'viral shorts creator',
    'YouTube automation tool',
    'short form video AI',
    'ai youtube shorts generator',
    'faceless youtube',
    'opus clip alternative',
    'text to video shorts',
    'make shorts without filming',
  ],
  openGraph: {
    // KINEO-BRAND-SERP-2026-07-29 — alinhado ao <title>. Ficaram divergentes
    // quando o title foi reescrito para intencao de marca: o Google mostrava
    // "Kineo — ... (Official Site)" e todo compartilhamento social mostrava outra
    // coisa. Para uma marca que ninguem ainda reconhece (e que 13 impressoes por
    // mes escrevem errado), dois nomes diferentes e um custo que nao da para pagar.
    title: 'Kineo — AI YouTube Shorts Generator (Official Site)',
    description:
      `Launch a repeatable AI Shorts show with the same face, voice and style. ${ft(OFFER, 'Try up to 3 watermarked Fast videos every 24h, no card; paid plans unlock clean MP4s.', OFFER.copy.headline)}`,
    url: 'https://www.usekineo.com',
    siteName: 'Kineo',
    images: [
      {
        url: 'https://www.usekineo.com/og-card.png',
        width: 1200,
        height: 630,
        alt: 'Kineo AI YouTube Shorts Generator',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    // KINEO-BRAND-SERP-2026-07-29 — alinhado ao <title>. Ficaram divergentes
    // quando o title foi reescrito para intencao de marca: o Google mostrava
    // "Kineo — ... (Official Site)" e todo compartilhamento social mostrava outra
    // coisa. Para uma marca que ninguem ainda reconhece (e que 13 impressoes por
    // mes escrevem errado), dois nomes diferentes e um custo que nao da para pagar.
    title: 'Kineo — AI YouTube Shorts Generator (Official Site)',
    description:
      `Launch a repeatable AI Shorts show with the same face, voice and style. ${ft(OFFER, 'Up to 3 watermarked Fast videos every 24h, no card; paid plans unlock clean MP4s.', OFFER.copy.headline)}`,
    images: ['https://www.usekineo.com/og-card.png'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    // Push #422 — real PNG for iOS home screen (Safari ignores SVG here
    // and would fall back to a screenshot-gray tile).
    apple: '/apple-touch-icon.png',
  },
  // Push #422 — PWA: lets the installed web app run full-screen on iOS
  // ("Add to Home Screen") with a black-translucent status bar.
  appleWebApp: {
    capable: true,
    title: 'Kineo',
    statusBarStyle: 'black-translucent',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18156258081"
          strategy="afterInteractive"
        />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18156258081');
          `}
        </Script>
        {/* #375 — TikTok Pixel base code (Pixel ID D8EJ1S3C77U8POE02SBG).
            Fires PageView automatically via ttq.page(). CompleteRegistration
            is tracked on signup, Purchase on checkout success.
            Push #92 — Core Web Vitals: this isn't attribution-critical the
            way gtag is, so it's deferred to lazyOnload to keep it off the
            main thread during the LCP window. */}
        <Script id="tiktok-pixel" strategy="lazyOnload">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

              ttq.load('D8EJ1S3C77U8POE02SBG');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
        {/* #481 — Rewardful affiliate tracking. The queue snippet defines
            window.rewardful; rw.js (async) captures the ?via=CODE referral and
            sets a 60-day first-party cookie. The 'ready' callback mirrors the
            referral id into a server-readable cookie so /api/stripe/checkout can
            pass it to Stripe as client_reference_id. API key 55bff9 is public.
            Push #92 — Core Web Vitals: deferred to lazyOnload — referral
            attribution only needs to be captured before checkout, not before
            the page is interactive. */}
        <Script id="rewardful-queue" strategy="lazyOnload">
          {`(function(w,r){w._rwq=r;w[r]=w[r]||function(){(w[r].q=w[r].q||[]).push(arguments)}})(window,'rewardful');`}
        </Script>
        <Script async src="https://r.wdfl.co/rw.js" data-rewardful="55bff9" strategy="lazyOnload" />
        <Script id="rewardful-cookie" strategy="lazyOnload">
          {`
            window.rewardful && window.rewardful('ready', function(){
              try {
                if (window.Rewardful && window.Rewardful.referral) {
                  document.cookie = 'rewardful_referral=' + window.Rewardful.referral + ';path=/;max-age=5184000;samesite=lax;secure';
                }
              } catch (e) {}
            });
          `}
        </Script>
      </head>
      {/* PUSH #98 — Web Analytics estava LIGADO no painel da Vercel desde
          sempre, mas o <Analytics/> nunca existiu no app e o pacote
          @vercel/analytics nem estava no package.json. Por isso o painel
          mostrava a tela "Get Started" e zero pageview: nao havia nada
          enviando dado. Sem isso nao existe numero nenhum de trafego pra
          medir se as mudancas de SEO funcionaram. */}
      {/* [KINEO-TRIAL-SWAP-2026-08-07] — FreeTierOfferProvider envolve TODO o
          conteúdo: é o único caminho pelo qual client components leem a oferta
          do free tier (a env da flag não existe no browser). */}
      <body><StructuredData /><FreeTierOfferProvider offer={OFFER}><SourceCapture /><CheckoutResumeBanner /><AutopilotPilotResumeBanner /><CheckoutStalledCta />{children}</FreeTierOfferProvider><Analytics /></body>
    </html>
  )
}
