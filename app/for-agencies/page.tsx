// KINEO-FOR-AGENCIES-2026-07-27 — a porta de entrada de atacado.
//
// POR QUE ESTA PÁGINA EXISTE
// As ~106 URLs públicas do site apontam todas para o funil self-serve, que em
// ~3 meses converteu 713 cadastros em 4 compras avulsas e ZERO assinaturas
// (docs/PROJECT_STATE.md). Quem compra 10–50 Shorts de uma vez chegava na home,
// via $9,90/mês de assinatura, e não tinha para onde ir. Esta é a primeira
// superfície indexável para o ICP C — ver docs/ROADMAP.md §5.1 e §5-bis.
//
// DE ONDE VEM CADA AFIRMAÇÃO
// Tudo o que a página promete sai de docs/PRODUCT_AND_OFFER.md §2 ("promessa
// permitida"). Tudo o que ela recusa a prometer sai de §3. Em particular:
//   · A publicação automática no canal do cliente (Autopilot) NÃO aparece como
//     benefício em lugar nenhum: §3.1 registra que `channels = 0` e que não há
//     nenhuma conexão bem-sucedida comprovada depois do fix do PUSH #103.
//     Vender isso aqui seria a maior exposição comercial da empresa.
//   · A divulgação de que a voz é gerada por IA não é decoração: é a exigência
//     dos termos da OpenAI que torna o uso comercial dos pacotes lícito
//     (§1.3.1). Se essa linha sair da página, a base da licença sai junto.
//   · O escopo é engine Fast apenas (§1.3). Nada de Seedance/Kling/Hollywood.
//
// FORMA
// CSS escopado em `.kag`, mesmos tokens que o `.klp` da home usa depois das
// rodadas 1 e 2 (raio, sombra, elevação, azul da marca), para que a página
// pareça o mesmo produto. A home NÃO usa Tailwind — ver docs/workstreams/
// DESIGN.md. A tabela de comparação reusa o padrão que a rodada 2 estabeleceu:
// tabela no desktop, cards empilhados no mobile via data-label, sem scroll cru.

import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { formatCheckoutMoney } from '@/lib/checkoutPricing'
import {
  AGENCY_BENCHMARKS,
  AGENCY_VERIFIED_ON,
  agencyCostForUsdMinor,
  agencyPerShortUsdMinor,
  timesMoreExpensive,
} from '@/lib/agencyBenchmark'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'

// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ HANDOFF PARA DEVELOPMENT — OS 4 SKUs DE ATACADO
// ═══════════════════════════════════════════════════════════════════════════
// A escada abaixo é a APROVADA em docs/PRODUCT_AND_OFFER.md §1.3 (decisão do
// fundador, 27/07/2026). Ela está aqui em CENTAVOS, e não como texto, por um
// motivo específico: `pricePerVideo` é DIVISÃO, nunca digitação. Foi digitar o
// preço e o derivado em dois lugares que produziu os três vazamentos que o
// AGENTS.md §2.3 registra — o mais recente anunciando $11,90 quando o cobrado
// era $9,90.
//
// Esta tabela é TEMPORÁRIA e não é fonte canônica. O Development está criando
// os 4 SKUs em lib/checkoutPricing.ts em paralelo. Quando eles existirem:
//
//   1. troque a constante abaixo pelo import, algo como
//        import { WHOLESALE_PACKAGES } from '@/lib/checkoutPricing'
//   2. apague este bloco inteiro
//   3. aponte `ctaHref` de cada pacote para a rota real de checkout
//
// NÃO criei o SKU aqui de propósito: SKU é preço cobrado, mora em
// checkoutPricing + rota de pagamento, e é território do Development.
// Enquanto o SKU não existe, o CTA é inbound (ver WHOLESALE_CTA abaixo).
type WholesalePackage = {
  id: string
  videos: number
  usdMinor: number
  /** O de 50 fica fora da rodada 1 do marketplace por capacidade (ROADMAP §5-bis). */
  highlight?: boolean
}

const WHOLESALE_PACKAGES: readonly WholesalePackage[] = [
  { id: 'w10', videos: 10, usdMinor: 9900 },
  { id: 'w20', videos: 20, usdMinor: 17900 },
  { id: 'w30', videos: 30, usdMinor: 24900, highlight: true },
  { id: 'w50', videos: 50, usdMinor: 37900 },
] as const

// ⚠️ HANDOFF PARA GROWTH — DESTINO DO BOTÃO
// Não existe checkout de atacado ainda, e inventar uma URL de pagamento seria
// pior do que não ter botão. Até o SKU existir, o CTA é INBOUND: o comprador
// escreve, ninguém é contatado — o que respeita integralmente o gate de
// comunicação do AGENTS.md §3.2 e a regra do ROADMAP §5-bis ("a Kineo não
// inicia nenhuma mensagem"). hello@usekineo.com já é caixa real: é a identidade
// de envio de 4 crons de ciclo de vida (ROADMAP §5-bis).
const WHOLESALE_INBOX = 'hello@usekineo.com'

function ctaHref(pkg: WholesalePackage): string {
  const subject = `Kineo wholesale — ${pkg.videos} videos`
  return `mailto:${WHOLESALE_INBOX}?subject=${encodeURIComponent(subject)}`
}

// ⚠️ HANDOFF — SLOTS DE PROVA VISUAL
// 422 vídeos públicos passaram no portão de qualidade e vivem em /v/[id]. Três
// deles devem aparecer aqui. NÃO inventei id: enquanto a lista estiver vazia a
// página renderiza os slots reservados, o que é honesto e deixa óbvio o que
// falta. Basta colar os 3 ids e a galeria acende — nenhuma outra mudança.
const GALLERY_VIDEO_IDS: readonly string[] = []

const perVideoUsdMinor = (pkg: WholesalePackage) => pkg.usdMinor / pkg.videos
const money = (minor: number) => formatCheckoutMoney('usd', minor)

// A linha da tabela usa o maior pacote: é onde a diferença é mais brutal e é o
// tamanho de lote que uma agência real compra.
const ANCHOR = WHOLESALE_PACKAGES[WHOLESALE_PACKAGES.length - 1]

export const metadata: Metadata = {
  title: 'Bulk AI Shorts for Agencies — 10 to 50 Videos From $7.58 Each | Kineo',
  description:
    'Buy AI-generated YouTube Shorts in volume: 10, 20, 30 or 50 videos in one order. Vertical 9:16 MP4, no watermark, commercial use, white-label. A human editing agency charges 4x to 10x more for the same count.',
  alternates: { canonical: `${BASE}/for-agencies` },
  openGraph: {
    title: 'Bulk AI Shorts for Agencies — 10 to 50 Videos in One Order',
    description:
      'Vertical 9:16 MP4, no watermark, commercial use, white-label. You resell at your price; we stay invisible.',
    url: `${BASE}/for-agencies`,
    siteName: 'Kineo',
    type: 'website',
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: 'Kineo for agencies' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bulk AI Shorts for Agencies | Kineo',
    description: '10 to 50 AI Shorts in one order. White-label, commercial use, no watermark.',
    images: [`${BASE}/og-image.png`],
  },
}

const CSS = `
.kag{--bg:#000;--card:#161618;--card2:#1d1d1f;--line:#26262a;--line2:#3a3a3d;--txt:#f5f5f7;--muted:#a1a1a8;--muted2:#8f8f96;--blue:#2997ff;--ok:#3ddc97;--no:#ff7b72;--r-lg:22px;--r-md:18px;--sh-card:inset 0 1px 0 rgba(255,255,255,.045),0 18px 44px -30px rgba(0,0,0,.95);--sh-card-h:inset 0 1px 0 rgba(255,255,255,.07),0 26px 60px -30px rgba(0,0,0,1);--sh-cta:0 1px 0 rgba(255,255,255,.5) inset,0 10px 28px -12px rgba(255,255,255,.32);background:#000;color:var(--txt);font-family:var(--font-inter),'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;line-height:1.5;min-height:100vh}
.kag *{box-sizing:border-box;margin:0;padding:0}
.kag a{text-decoration:none;color:inherit}
.kag .wrap{max-width:1000px;margin:0 auto;padding:0 24px}
.kag section{padding:88px 0}
.kag section[id]{scroll-margin-top:24px}
.kag .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:650;font-size:16px;letter-spacing:-.01em;padding:14px 30px;border-radius:980px;cursor:pointer;border:1px solid transparent;transition:transform .18s cubic-bezier(.2,.7,.3,1),background .18s ease,box-shadow .18s ease}
.kag .btn-w{background:var(--txt);color:#000;box-shadow:var(--sh-cta)}
.kag .btn-w:hover{background:#fff;transform:translateY(-1px);box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 14px 34px -12px rgba(255,255,255,.42)}
.kag .btn-w:active{transform:translateY(0) scale(.985)}
.kag .btn-g{background:transparent;color:var(--txt);border-color:var(--line2)}
.kag .btn-g:hover{border-color:var(--blue);color:#fff}
.kag .btn:focus-visible{outline:2px solid var(--blue);outline-offset:3px}
.kag .eyebrow{display:inline-flex;align-items:center;height:28px;padding:0 13px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:var(--blue);background:rgba(41,151,255,.12);border:1px solid rgba(41,151,255,.3)}
.kag .crumb{font-size:13px;color:var(--muted2);padding-top:26px}
.kag .crumb a:hover{color:var(--blue)}
.kag .gtxt{background:linear-gradient(180deg,#fff 0%,#fff 58%,#c7c7cd 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}

.kag .hero{position:relative;overflow:hidden;padding:52px 0 84px}
.kag .hero .glow{position:absolute;width:980px;height:600px;left:50%;top:-200px;transform:translateX(-50%);background:radial-gradient(ellipse at 50% 45%,rgba(41,151,255,.16),transparent 62%),radial-gradient(ellipse at 50% 30%,rgba(255,255,255,.05),transparent 58%);pointer-events:none}
.kag .hero-in{position:relative;z-index:1;max-width:760px}
.kag h1{margin-top:20px;font-size:clamp(2.6rem,6.2vw,4.4rem);font-weight:640;line-height:1.02;letter-spacing:-.042em;text-wrap:balance}
.kag .lede{margin-top:20px;font-size:clamp(1.06rem,2vw,1.26rem);color:var(--muted);line-height:1.55;max-width:600px;text-wrap:balance}
.kag .hero-cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.kag .hero-note{margin-top:18px;font-size:13px;line-height:1.7;color:var(--muted2)}

/* Ancora numerica — o argumento inteiro em tres numeros. */
.kag .anchor{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:44px;position:relative;z-index:1}
.kag .anchor .a{background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);padding:22px;box-shadow:var(--sh-card)}
.kag .anchor .a.us{background:linear-gradient(180deg,rgba(41,151,255,.13),rgba(41,151,255,.05));border-color:rgba(41,151,255,.4)}
.kag .anchor .k{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--muted2)}
.kag .anchor .a.us .k{color:var(--blue)}
.kag .anchor .v{margin-top:9px;font-size:clamp(1.7rem,3.6vw,2.3rem);font-weight:720;letter-spacing:-.035em;line-height:1}
.kag .anchor .s{margin-top:7px;font-size:12.5px;color:var(--muted2);line-height:1.5}

.kag .sec-h{max-width:660px;margin-bottom:44px}
.kag .sec-h h2{font-size:clamp(1.9rem,4vw,2.7rem);font-weight:620;letter-spacing:-.03em;line-height:1.07;text-wrap:balance}
.kag .sec-h p{margin-top:16px;color:var(--muted);font-size:1.06rem;line-height:1.6}

/* Tabela de comparacao — o mesmo padrao da rodada 2. */
.kag .cmp{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);overflow-x:auto;position:relative;box-shadow:var(--sh-card)}
.kag .cmp table{width:100%;min-width:600px;border-collapse:collapse;font-size:14.5px}
.kag .cmp th,.kag .cmp td{padding:16px 18px;text-align:right;border-bottom:1px solid rgba(255,255,255,.055)}
.kag .cmp th:first-child,.kag .cmp td:first-child{text-align:left}
.kag .cmp thead th{font-weight:650;color:var(--muted);font-size:12.5px;letter-spacing:.03em;text-transform:uppercase;padding-top:18px;padding-bottom:18px}
.kag .cmp tbody td:first-child{font-weight:650;color:var(--txt)}
.kag .cmp tbody td:first-child small{display:block;font-weight:450;color:var(--muted2);font-size:12.5px;margin-top:3px}
.kag .cmp .big{font-size:19px;font-weight:720;letter-spacing:-.02em;white-space:nowrap}
.kag .cmp tr.us td{background:linear-gradient(90deg,rgba(41,151,255,.14),rgba(41,151,255,.07));box-shadow:inset 0 1px 0 rgba(41,151,255,.28),inset 0 -1px 0 rgba(41,151,255,.28)}
.kag .cmp tr.us td:first-child{color:#fff}
.kag .cmp tr.us .big{color:#fff}
.kag .cmp tr:last-child td{border-bottom:none}
.kag .cmp .save{display:inline-block;margin-left:8px;font-size:11.5px;font-weight:800;letter-spacing:.05em;color:var(--blue);background:rgba(41,151,255,.14);border:1px solid rgba(41,151,255,.3);border-radius:999px;padding:3px 9px;white-space:nowrap}
.kag .fine{margin-top:16px;font-size:12.5px;line-height:1.65;color:var(--muted2);max-width:760px}

/* Pacotes */
.kag .packs{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;align-items:stretch}
.kag .pack{position:relative;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:26px 22px;box-shadow:var(--sh-card);transition:transform .2s cubic-bezier(.2,.7,.3,1),border-color .2s ease,box-shadow .2s ease}
.kag .pack:hover{transform:translateY(-4px);border-color:var(--blue);box-shadow:0 0 0 1.5px var(--blue),0 18px 44px -18px rgba(41,151,255,.32)}
.kag .pack.pop{background:linear-gradient(180deg,#212124,#1a1a1d);border-color:#4d4d50;box-shadow:var(--sh-card-h);padding-top:38px}
.kag .pack .tag{position:absolute;top:-12px;left:50%;transform:translateX(-50%);white-space:nowrap;color:#fff;background:var(--blue);border-radius:999px;padding:6px 15px;font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;box-shadow:0 6px 20px -6px rgba(41,151,255,.85)}
.kag .pack .qty{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--muted2)}
.kag .pack .tot{margin-top:10px;font-size:2.5rem;font-weight:720;letter-spacing:-.035em;line-height:1}
/* O numero que comprador de volume realmente le. */
.kag .pack .each{margin-top:12px;padding-top:14px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
.kag .pack .each b{display:block;font-size:1.32rem;font-weight:700;letter-spacing:-.02em;color:var(--blue);margin-top:3px}
.kag .pack .btn{margin-top:auto;width:100%;padding:12px 18px;font-size:14.5px}
.kag .pack .btn-w{margin-top:22px}

/* Entra / nao entra */
.kag .two{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}
.kag .box{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:28px 26px;box-shadow:var(--sh-card)}
.kag .box.no{background:#141416}
.kag .box h3{display:flex;align-items:center;gap:10px;font-size:1.12rem;font-weight:680;letter-spacing:-.02em}
.kag .box .mk{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:800;flex:none}
.kag .box.yes .mk{color:var(--ok);background:rgba(61,220,151,.14);border:1px solid rgba(61,220,151,.34)}
.kag .box.no .mk{color:var(--no);background:rgba(255,123,114,.12);border:1px solid rgba(255,123,114,.32)}
.kag .box ul{list-style:none;margin-top:20px;display:flex;flex-direction:column;gap:14px}
.kag .box li{display:flex;gap:11px;font-size:14.5px;line-height:1.55;color:var(--muted)}
.kag .box li b{color:var(--txt);font-weight:650}
.kag .box li i{font-style:normal;flex:none;margin-top:1px;font-weight:800}
.kag .box.yes li i{color:var(--ok)}
.kag .box.no li i{color:var(--no)}
.kag .box .why{margin-top:20px;padding-top:18px;border-top:1px solid var(--line);font-size:12.5px;line-height:1.65;color:var(--muted2)}

/* Galeria */
.kag .gal{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.kag .shot{aspect-ratio:9/16;border-radius:var(--r-md);border:1px solid var(--line);background:radial-gradient(120% 80% at 50% 0%,#26262a,#0c0c0e 72%);box-shadow:var(--sh-card);position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:16px;transition:transform .22s cubic-bezier(.2,.7,.3,1),border-color .22s ease,box-shadow .22s ease}
.kag a.shot:hover{transform:translateY(-5px);border-color:rgba(41,151,255,.4);box-shadow:var(--sh-card-h),0 0 0 1px rgba(41,151,255,.18)}
.kag .shot .lbl{font-size:13px;font-weight:700;color:#fff;position:relative;z-index:2}
.kag .shot.slot{border-style:dashed;border-color:var(--line2);align-items:center;justify-content:center;text-align:center;color:var(--muted2)}
.kag .shot.slot .n{font-size:26px;font-weight:750;color:var(--line2);letter-spacing:-.03em}
.kag .shot.slot .t{margin-top:8px;font-size:12.5px;line-height:1.5;max-width:150px}

/* White-label */
.kag .wl{position:relative;overflow:hidden;border-radius:26px;padding:56px 40px;background:linear-gradient(180deg,#19191c,#131315);border:1px solid var(--line);box-shadow:var(--sh-card-h)}
.kag .wl .glow{position:absolute;width:680px;height:380px;left:50%;top:-160px;transform:translateX(-50%);background:radial-gradient(ellipse at center,rgba(41,151,255,.16),transparent 66%);pointer-events:none}
.kag .wl-in{position:relative;z-index:1;max-width:660px}
.kag .wl h2{font-size:clamp(1.8rem,3.6vw,2.5rem);font-weight:620;letter-spacing:-.03em;line-height:1.1;text-wrap:balance}
.kag .wl p{margin-top:16px;color:var(--muted);font-size:1.05rem;line-height:1.62}
.kag .wl ul{list-style:none;margin-top:22px;display:flex;flex-direction:column;gap:11px}
.kag .wl li{display:flex;gap:10px;font-size:14.5px;color:var(--muted);line-height:1.55}
.kag .wl li i{font-style:normal;color:var(--blue);flex:none;font-weight:800}

/* FAQ */
.kag .faq{display:flex;flex-direction:column;gap:14px;max-width:800px}
.kag .qa{background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);padding:24px 26px;box-shadow:var(--sh-card);transition:border-color .2s ease,box-shadow .2s ease}
.kag .qa:hover{border-color:var(--line2);box-shadow:var(--sh-card-h)}
.kag .qa h3{font-size:1.08rem;font-weight:650;letter-spacing:-.018em;line-height:1.35}
.kag .qa p{margin-top:9px;color:var(--muted);font-size:.98rem;line-height:1.62}

.kag .final{text-align:center;padding-bottom:96px}
.kag .final h2{font-size:clamp(1.9rem,4vw,2.7rem);font-weight:620;letter-spacing:-.03em;text-wrap:balance}
.kag .final p{margin:14px auto 0;max-width:520px;color:var(--muted);font-size:1.06rem;line-height:1.6}
.kag .final .row{display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin-top:28px}

@media(max-width:920px){
.kag .packs{grid-template-columns:repeat(2,1fr);gap:26px}
.kag .anchor{grid-template-columns:1fr;gap:12px}
.kag .two{grid-template-columns:1fr}
.kag .wl{padding:44px 28px}
}
@media(max-width:640px){
.kag .wrap{padding:0 20px}
.kag section{padding:64px 0}
.kag .hero{padding:40px 0 60px}
.kag .packs{grid-template-columns:1fr;gap:28px}
.kag .gal{grid-template-columns:1fr;max-width:300px;margin:0 auto}
.kag .sec-h{margin-bottom:34px}
.kag .btn{width:100%}
.kag .wl{padding:36px 22px;border-radius:20px}
.kag .qa{padding:20px 20px}
/* Sem scroll horizontal cru: cada linha vira card, igual a home depois da
   rodada 2. O rotulo sai do data-label, que espelha o <th>. */
.kag .cmp{background:transparent;border:none;border-radius:0;overflow:visible;box-shadow:none}
.kag .cmp table,.kag .cmp tbody,.kag .cmp tr,.kag .cmp td{display:block;width:100%;min-width:0}
.kag .cmp thead{display:none}
.kag .cmp tr{background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--sh-card);margin-bottom:12px;overflow:hidden}
.kag .cmp tr:last-child{margin-bottom:0}
.kag .cmp tr.us{border-color:rgba(41,151,255,.45)}
.kag .cmp td{display:flex;align-items:center;justify-content:space-between;gap:16px;text-align:right;padding:11px 16px;border-bottom:1px solid rgba(255,255,255,.05)}
.kag .cmp td::before{content:attr(data-label);color:var(--muted);font-weight:500;font-size:12.5px;text-align:left;flex:none}
.kag .cmp td:first-child{display:block;text-align:left;background:rgba(255,255,255,.03);padding:14px 16px}
.kag .cmp tr.us td:first-child{background:rgba(41,151,255,.12)}
.kag .cmp td:first-child::before{content:none}
.kag .cmp tr td:last-child{border-bottom:none}
.kag .cmp tr.us td{box-shadow:none}
}
@media(prefers-reduced-motion:reduce){
.kag *,.kag *::before,.kag *::after{transition-duration:.01ms!important;animation-duration:.01ms!important}
.kag .btn-w:hover,.kag .pack:hover,.kag a.shot:hover{transform:none}
}
`

const FAQ = [
  {
    q: 'What exactly do I send you to start an order?',
    a: 'One line of topic per video. That is the whole input. "Three habits that quietly compound wealth" is enough — the engine writes the script, records the voiceover, matches the footage and burns in the captions.',
  },
  {
    q: 'Can I resell these to my own clients?',
    a: 'Yes. Commercial use is included and there is no Kineo watermark, logo, outro or credit anywhere in the file. You set your own price and your client never learns we exist.',
  },
  {
    q: 'Is the voice a real person?',
    a: 'No. Every voiceover in these packages is AI-generated text-to-speech. You are free to use it commercially, and platforms increasingly require that AI-generated media be labelled as such — plan to disclose it wherever you publish.',
  },
  {
    q: 'What happens if a video comes out wrong?',
    a: 'A render that fails returns its credit automatically — no ticket, no waiting. A render that succeeds but is not what you wanted is a different thing: tell us the topic again with more direction and we run it again inside your package.',
  },
  {
    q: 'Do you post the videos to my channel?',
    a: 'No. You receive files. Scheduling and publishing stay entirely on your side, in whatever tool you already use.',
  },
] as const

export default function ForAgenciesPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'For agencies', item: `${BASE}/for-agencies` },
    ],
  }

  // Serviço + faixa de preço, derivada da mesma tabela que a página renderiza,
  // para que o rich result nunca anuncie um preço que a página não mostra.
  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Kineo bulk AI Shorts for agencies',
    serviceType: 'AI-generated short-form video production',
    provider: { '@type': 'Organization', name: 'Kineo', url: BASE },
    areaServed: 'Worldwide',
    url: `${BASE}/for-agencies`,
    offers: WHOLESALE_PACKAGES.map((p) => ({
      '@type': 'Offer',
      name: `${p.videos} AI Shorts`,
      price: (p.usdMinor / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    })),
  }

  const cheapestPerVideo = Math.min(...WHOLESALE_PACKAGES.map(perVideoUsdMinor))

  return (
    <>
      <main className="kag">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd).replace(/</g, '\\u003c') }}
        />

        <header className="hero">
          <div className="glow" />
          <div className="wrap">
            <nav aria-label="Breadcrumb" className="crumb">
              <Link href="/">Home</Link> <span aria-hidden="true">/</span> For agencies
            </nav>
            <div className="hero-in">
              <span className="eyebrow" style={{ marginTop: 26 }}>Volume orders</span>
              <h1 className="gtxt">Buy Shorts by the batch, not by the seat.</h1>
              <p className="lede">
                Ten to fifty finished vertical videos in a single order — scripted, voiced,
                captioned and delivered as clean MP4s you resell under your own name.
              </p>
              <div className="hero-cta">
                <a className="btn btn-w" href={ctaHref(ANCHOR)}>Start a volume order →</a>
                <a className="btn btn-g" href="#packages">See the four packages</a>
              </div>
              <p className="hero-note">
                No seats · No monthly minimum · No Kineo branding on anything you receive
              </p>
            </div>

            <div className="anchor">
              {AGENCY_BENCHMARKS.map((b) => (
                <div className="a" key={b.id}>
                  <div className="k">{b.name} · {ANCHOR.videos} videos</div>
                  <div className="v">{money(agencyCostForUsdMinor(b, ANCHOR.videos))}</div>
                  <div className="s">
                    {money(agencyPerShortUsdMinor(b))} per short · {b.producedBy}
                  </div>
                </div>
              ))}
              <div className="a us">
                <div className="k">Kineo · {ANCHOR.videos} videos</div>
                <div className="v">{money(ANCHOR.usdMinor)}</div>
                <div className="s">
                  {money(perVideoUsdMinor(ANCHOR))} per short · Generated, delivered as files
                </div>
              </div>
            </div>
          </div>
        </header>

        <section id="compare">
          <div className="wrap">
            <div className="sec-h">
              <h2>The same fifty videos, three ways to buy them.</h2>
              <p>
                Agency rates below are the monthly price each vendor publishes, divided by the
                number of Shorts that price covers.
              </p>
            </div>

            <div className="cmp">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Where you buy</th>
                    <th scope="col">Per short</th>
                    <th scope="col">{ANCHOR.videos} videos</th>
                  </tr>
                </thead>
                <tbody>
                  {AGENCY_BENCHMARKS.map((b) => (
                    <tr key={b.id}>
                      <td>
                        {b.name}
                        <small>{b.producedBy}</small>
                      </td>
                      <td className="big" data-label="Per short">{money(agencyPerShortUsdMinor(b))}</td>
                      <td className="big" data-label={`${ANCHOR.videos} videos`}>
                        {money(agencyCostForUsdMinor(b, ANCHOR.videos))}
                      </td>
                    </tr>
                  ))}
                  <tr className="us">
                    <td>
                      Kineo
                      <small>AI-generated, delivered as files</small>
                    </td>
                    <td className="big" data-label="Per short">{money(perVideoUsdMinor(ANCHOR))}</td>
                    <td className="big" data-label={`${ANCHOR.videos} videos`}>
                      {money(ANCHOR.usdMinor)}
                      <span className="save">
                        {timesMoreExpensive(
                          agencyCostForUsdMinor(AGENCY_BENCHMARKS[0], ANCHOR.videos),
                          ANCHOR.usdMinor,
                        ).toFixed(1)}
                        ×–
                        {timesMoreExpensive(
                          agencyCostForUsdMinor(AGENCY_BENCHMARKS[1], ANCHOR.videos),
                          ANCHOR.usdMinor,
                        ).toFixed(1)}
                        × less
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="fine">
              Vendor prices read from each vendor&rsquo;s own published page on {AGENCY_VERIFIED_ON}.
              The {ANCHOR.videos}-video column extrapolates each published per-short rate — it is
              arithmetic, not a quote those vendors gave. They staff human editors, which is a
              different product at a different price; the comparison is what the same output count
              costs you, not a claim that the work is identical.
            </p>
          </div>
        </section>

        <section id="packages">
          <div className="wrap">
            <div className="sec-h">
              <h2>Four sizes. The bigger the batch, the cheaper each video.</h2>
              <p>Pay once per batch. Nothing renews, nothing expires into a subscription.</p>
            </div>
            <div className="packs">
              {WHOLESALE_PACKAGES.map((p) => (
                <div className={p.highlight ? 'pack pop' : 'pack'} key={p.id}>
                  {p.highlight && <div className="tag">Most ordered</div>}
                  <div className="qty">{p.videos} videos</div>
                  <div className="tot">{money(p.usdMinor)}</div>
                  <div className="each">
                    Per video
                    <b>{money(perVideoUsdMinor(p))}</b>
                  </div>
                  <a className="btn btn-w" href={ctaHref(p)}>Order {p.videos} →</a>
                </div>
              ))}
            </div>
            <p className="fine">
              Every package uses the same engine and delivers the same file format. The only
              difference between them is how many videos you get and what each one ends up costing.
            </p>
          </div>
        </section>

        <section id="scope">
          <div className="wrap">
            <div className="sec-h">
              <h2>Exactly what you get — and what you don&rsquo;t.</h2>
              <p>
                The second column matters more than the first. If any of it is a dealbreaker, we
                would rather you know now than after you have paid.
              </p>
            </div>
            <div className="two">
              <div className="box yes">
                <h3><span className="mk" aria-hidden="true">✓</span> Included</h3>
                <ul>
                  <li><i>✓</i><span><b>You send one line of topic per video.</b> That is the entire input we need from you.</span></li>
                  <li><i>✓</i><span><b>A finished vertical 9:16 MP4</b>, around 45 seconds, ready to upload anywhere.</span></li>
                  <li><i>✓</i><span><b>Script, AI voiceover and burned-in captions</b>, written and produced automatically.</span></li>
                  <li><i>✓</i><span><b>Stock B-roll</b> matched to each scene, from commercially licensed libraries.</span></li>
                  <li><i>✓</i><span><b>No watermark</b> — no logo, no outro, no credit anywhere in the file.</span></li>
                  <li><i>✓</i><span><b>Commercial use and resale rights.</b> The files are yours to sell on.</span></li>
                  <li><i>✓</i><span><b>Minutes per video, not days.</b> Turnaround is machine time, not a queue behind other clients.</span></li>
                  <li><i>✓</i><span><b>A failed render refunds itself</b> automatically and re-runs inside your package.</span></li>
                </ul>
                <p className="why">
                  Render time measured on a sample of 12 videos in the week ending 23 July 2026:
                  median 2.3 minutes, 90th percentile 3.5. Small sample — treat it as the order of
                  magnitude, not a service level.
                </p>
              </div>

              <div className="box no">
                <h3><span className="mk" aria-hidden="true">✕</span> Not included</h3>
                <ul>
                  <li><i>✕</i><span><b>No human editor.</b> Nobody sits in a timeline. That is precisely why it costs what it costs.</span></li>
                  <li><i>✕</i><span><b>We cannot use your footage.</b> These packages run on stock B-roll only — your clips, logos and brand assets do not go in.</span></li>
                  <li><i>✕</i><span><b>No AI-generated video.</b> The visuals are stock footage, not generated scenes.</span></li>
                  <li><i>✕</i><span><b>We do not publish to your channel.</b> You get files; scheduling and uploading stay with you.</span></li>
                  <li><i>✕</i><span><b>The voice is synthetic</b>, not a human narrator — and you should label it as AI wherever you publish.</span></li>
                  <li><i>✕</i><span><b>No bespoke art direction.</b> Every video in a batch comes out of the same pipeline.</span></li>
                </ul>
                <p className="why">
                  If you need a person editing to a brief, your client&rsquo;s own footage on screen,
                  or someone managing the upload calendar, this is the wrong product and one of the
                  agencies in the table above is the right one.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="samples">
          <div className="wrap">
            <div className="sec-h">
              <h2>See three before you send a cent.</h2>
              <p>Real exports from the same pipeline your batch would run through.</p>
            </div>
            <div className="gal">
              {GALLERY_VIDEO_IDS.length > 0
                ? GALLERY_VIDEO_IDS.slice(0, 3).map((id, i) => (
                    <Link className="shot" href={`/v/${id}`} key={id}>
                      <span className="lbl">Sample {i + 1} — watch →</span>
                    </Link>
                  ))
                : /* Slots reservados. Enquanto GALLERY_VIDEO_IDS estiver vazio a
                     pagina mostra o espaco honestamente em vez de linkar para um
                     id inventado. Colar 3 ids acende a galeria, sem mais nada. */
                  [0, 1, 2].map((i) => (
                    <div className="shot slot" key={i}>
                      <div className="n">{i + 1}</div>
                      <div className="t">Sample slot — awaiting video id</div>
                    </div>
                  ))}
            </div>
            <p className="fine">
              <Link href="/examples" style={{ color: '#2997ff', fontWeight: 600 }}>
                Browse more finished examples →
              </Link>
            </p>
          </div>
        </section>

        <section id="white-label">
          <div className="wrap">
            <div className="wl">
              <div className="glow" />
              <div className="wl-in">
                <span className="eyebrow">White-label</span>
                <h2 style={{ marginTop: 18 }}>You resell at your price. We stay invisible.</h2>
                <p>
                  Nothing you hand to a client points back here. There is no branding in the file,
                  nothing in the metadata that names us, and we never contact anyone you deliver to.
                </p>
                <ul>
                  <li><i>✓</i><span>No Kineo logo, watermark, outro or on-screen credit</span></li>
                  <li><i>✓</i><span>Your margin is yours — we have no view of, and no say in, what you charge</span></li>
                  <li><i>✓</i><span>We never contact your clients, for any reason</span></li>
                  <li><i>✓</i><span>Order under your agency name; one invoice per batch</span></li>
                </ul>
                <div style={{ marginTop: 28 }}>
                  <a className="btn btn-w" href={ctaHref(ANCHOR)}>Start a volume order →</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq">
          <div className="wrap">
            <div className="sec-h"><h2>Questions volume buyers ask.</h2></div>
            <div className="faq">
              {FAQ.map((f) => (
                <div className="qa" key={f.q}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="final">
          <div className="wrap">
            <h2 className="gtxt">Tell us how many, and the topics.</h2>
            <p>
              From {money(cheapestPerVideo)} per finished video. No seats, no subscription, no
              minimum commitment.
            </p>
            <div className="row">
              <a className="btn btn-w" href={ctaHref(ANCHOR)}>Start a volume order →</a>
              <Link className="btn btn-g" href="/pricing">Just want one video? See plans</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer showStats={false} />
    </>
  )
}
