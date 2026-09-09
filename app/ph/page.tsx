// KINEO-PH-2026-09-10 — TAREFA 7: a página de pouso do lançamento no Product Hunt
// (quinta 10/09, 00:01 PT). Plano: docs/LANCAMENTO-PRODUCT-HUNT-2026-09-10.md.
//
// O que ela faz, e só isso: (1) a promessa em uma frase; (2) o robô do Omni
// rodando; (3) a porta de $1 na frente (mesma URL do trial, campanha própria);
// (4) 12 filmes do fundador com o motor real de cada um; (5) os três preços em
// texto puro pela fonte única; (6) FAQ curto e honesto. Nada de número inventado:
// filmes e pagantes não aparecem aqui (o primeiro comentário do maker cita os
// números do dia, lidos do banco na hora).
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import PhLandingBeacon from '@/components/PhLandingBeacon'
import { FOUNDER_SHOWCASE } from '@/lib/publicExamples'
import { engineDisplayName } from '@/lib/enginePlanGate'
import { CARD_TRIAL_DAYS, CARD_TRIAL_GRANT_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { CARD_ENTRY_COPY, FREE_ENTRY_CREDITS } from '@/lib/entryPolicy'
// KINEO-PH-CONTAGEM-2026-09-09 — a contagem de motores É DERIVADA. Esta página
// era o ÚNICO lugar do site que digitava "Nine" à mão, em três lugares (título
// social, descrição social e o parágrafo do herói) enquanto
// `VIDEO_ENGINE_COUNT_WORD` valia 'Eight' — o nono (Seedance 2.5) está em
// canário, `S25_PUBLIC=false`, e não aparece para ninguém de fora. Pior: dois
// desses três lugares são a METADATA, ou seja, o texto que o Product Hunt e o
// X puxam como prévia do link. O site dizia oito e o cartão de compartilhamento
// do lançamento dizia nove.
import { VIDEO_ENGINE_COUNT_WORD } from '@/lib/engineLaunch'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
// KINEO-RESTAURACAO-2026-09-09 — o trial de $1 morreu; a entrada é o cadastro grátis.
const CTA = '/signup?utm_source=producthunt&utm_medium=launch&utm_campaign=ph_sep10&intent_campaign=ph_sep10'
const ROBOT = '/previews/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.mp4'
const ROBOT_POSTER = '/posters/hero-opening-sep07/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.webp'
const ENGINES = VIDEO_ENGINE_COUNT_WORD.toLowerCase()

// KINEO-PH-FICHA-2026-09-09 — a ficha do Product Hunt AINDA NÃO EXISTE: o
// fundador cria a conta e sobe o produto na quinta. Até lá, o selo "Live on
// Product Hunt" apontava para `producthunt.com/products/kineo-ai`, que hoje é
// 404 — e link plausível e errado é exatamente o erro que já custou duas
// reviews pagas à casa em 19/08 e 24/08 (foram parar em
// `producthunt.com/products/kineo`, que é de um concorrente homônimo).
//
// Enquanto esta constante for `null` o selo não é renderizado. No dia do
// lançamento, com a ficha no ar, troque por ela — uma linha, e o selo volta.
// Nunca preencha com uma URL que você não abriu.
const PH_LISTING_URL: string | null = null

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'Kineo on Product Hunt — type an idea, get a cinematic short in 3 minutes',
  description: `${VIDEO_ENGINE_COUNT_WORD} video engines behind one button. ${CARD_ENTRY_COPY.chip}.`,
  alternates: { canonical: `${BASE}/ph` },
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Kineo — type an idea, get a cinematic short in 3 minutes',
    description: `${VIDEO_ENGINE_COUNT_WORD} engines behind one button. ${CARD_ENTRY_COPY.chip}.`,
    url: `${BASE}/ph`,
    images: [{ url: `${BASE}${ROBOT_POSTER}`, width: 1400, height: 782 }],
  },
}

const ENGINE_KEY: Record<string, string> = {
  cinematic_ai: 'Seedance 1.5',
  fast: 'Kineo 1',
}

function engineLabel(engine: string): string {
  return ENGINE_KEY[engine] ?? engineDisplayName(engine)
}

export default function PhPage() {
  const usd = (minor: number) => formatCheckoutMoney('usd', minor)
  const monthly = usd(TIER_PRICES.basic.usd)
  return (
    <div style={{ background: '#000', color: '#f5f5f7', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <PhLandingBeacon />
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 20px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 900, fontSize: 18 }}>Kineo</Link>
          {PH_LISTING_URL ? (
            <a
              href={PH_LISTING_URL}
              rel="noopener nofollow"
              target="_blank"
              data-testid="ph-badge"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,.18)', borderRadius: 999, padding: '7px 14px', color: '#ff6154', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}
            >
              <span aria-hidden>▲</span> Live on Product Hunt
            </a>
          ) : null}
        </div>

        {/* KINEO-PH-DOBRA-2026-09-09 (sprint frio, r4) — A ORDEM DA DOBRA MUDOU
            PORQUE O DADO MANDOU, não por gosto. Medido no bundle `ph_sep10_v3`,
            das 34 pessoas do Reddit que caíram aqui entre 13:15 e 15:37 BRT,
            97% em celular: 23 (68%) NUNCA passaram de `depth: 25` e ZERO
            clicaram o CTA (o instrumento de clique foi provado vivo às 17:07 —
            uma sonda gravou `ph_cta_clicked` com `position: top`).
            Duas terças partes morriam antes de rolar ~300px.

            O que elas viam em 375px, com as posições reais do documento:
              h1 em 97 · parágrafo de 7 linhas em 201 (175px de prosa densa) ·
              botão de $1 em 376 · e o FILME só em 545, cortado.
            Ou seja: a prova de que o produto existe vinha DEPOIS do pedido de
            cartão, atrás de um parágrafo que nomeia cinco motores para quem
            nunca ouviu falar de nenhum.

            A ordem agora é: manchete → FILME → porta de $1 → letra miúda →
            e só então a prosa dos motores. O parágrafo não foi cortado nem
            reescrito (copy honesta continua valendo); ele saiu do caminho.
            No desktop a grade continua com duas colunas — o filme passa para a
            esquerda e a coluna de texto para a direita, arranjo normal de herói.

            A `<h1>` sai de dentro da grade para poder ficar ACIMA das duas
            colunas: sem isso não há como intercalar filme e texto quando a
            grade colapsa em uma coluna só no celular. */}
        <h1 style={{ fontSize: 'clamp(2rem, 4.6vw, 3.4rem)', lineHeight: 1.05, fontWeight: 900, letterSpacing: '-.02em', margin: '40px 0 0' }}>
          Type an idea.<br />Get a cinematic short in 3 minutes.
        </h1>
        <section style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, alignItems: 'center' }}>
          <div data-testid="ph-hero-film" style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,.12)', aspectRatio: '500 / 280', background: '#0b0b0e' }}>
            <video src={ROBOT} poster={ROBOT_POSTER} autoPlay muted loop playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div data-testid="ph-hero-copy">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <a
                href={CTA}
                rel="nofollow"
                data-testid="ph-cta-trial"
                style={{ background: '#2997ff', color: '#000', fontWeight: 900, fontSize: 16, padding: '14px 24px', borderRadius: 999, textDecoration: 'none' }}
              >
                {CARD_ENTRY_COPY.ctaLong}
              </a>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>
                {FREE_ENTRY_CREDITS} credits free · every engine unlocked · no card · plans from {usd(TIER_PRICES.starter.usd)}/mo
              </span>
            </div>
            <p style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,.5)' }}>{CARD_ENTRY_COPY.noFreeTier}</p>
            <p style={{ marginTop: 16, fontSize: 17, color: 'rgba(255,255,255,.78)', lineHeight: 1.5, maxWidth: 520 }}>
              Kineo writes the script, directs every shot, narrates, scores and edits — {ENGINES} video engines behind one
              button (Veo 3.1, Kling 3, Seedance, MiniMax H3, Omni Flash). Every clip on this page was made this way,
              from one paragraph of text.
            </p>
          </div>
        </section>

        <section style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px' }}>Made with Kineo — real renders, real engine on every card</h2>
          <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,.6)', fontSize: 14 }}>Each one started as one paragraph of text. The badge is the engine that actually rendered it.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {FOUNDER_SHOWCASE.slice(0, 12).map((v) => (
              <Link key={v.id} href="/examples" style={{ position: 'relative', display: 'block', aspectRatio: '9 / 16', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)', background: '#111' }}>
                {/* KINEO-PH-MARCA-2026-09-09 — pôster CORTADO. Os arquivos de
                    `public/posters/ex-<id>.webp` foram tirados dos masters antes
                    do corte e trazem `usekineo.com/free` no topo; esta página
                    diz "There is no free tier" no mesmo scroll e mostrava a
                    marca do free tier em doze cards. `scripts/ph-posters.sh`
                    gera as cópias sem a faixa; os originais ficam intactos
                    porque são curadoria do fundador em outras telas. */}
                <img src={`/posters/ph/${v.id}.webp`} alt={v.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: '#fff', background: 'rgba(0,0,0,.55)', border: '1px solid rgba(255,255,255,.22)', borderRadius: 999, padding: '3px 7px' }}>
                  {engineLabel(v.engine)}
                </span>
                <span style={{ position: 'absolute', insetInline: 0, bottom: 0, padding: '22px 9px 9px', fontSize: 11.5, fontWeight: 700, lineHeight: 1.3, color: '#fff', background: 'linear-gradient(0deg, rgba(0,0,0,.85), transparent)' }}>
                  {v.title}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {([
            ['Starter', TIER_PRICES.starter.usd, '3 films a week', 'Kineo 1 + Seedance 1.5'],
            ['Creator', TIER_PRICES.basic.usd, '1 film a day', 'Kineo 1 + Seedance 1.5'],
            ['Studio', TIER_PRICES.pro.usd, 'Every engine', 'Kling 3, Veo 3.1, MiniMax H3, Omni Flash, Avatar'],
          ] as Array<[string, number, string, string]>).map(([name, minor, promise, engines]) => (
            <div key={name} style={{ border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,.6)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{name}</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{usd(minor)}<span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>/mo</span></div>
              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700 }}>{promise}</div>
              <div style={{ marginTop: 2, fontSize: 12.5, color: 'rgba(255,255,255,.6)' }}>{engines}</div>
            </div>
          ))}
        </section>
        <p style={{ marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,.55)' }}>
          Every account starts free with {FREE_ENTRY_CREDITS} credits (one Seedance film and one Kineo 1 film of 60 seconds), every engine unlocked, no card. Full details on the <Link href="/pricing" style={{ color: '#7cc0ff' }}>pricing page</Link>.
        </p>

        <section style={{ marginTop: 48, maxWidth: 720 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 12px' }}>Honest answers</h2>
          {[
            ['Is it really free to start?', `Yes. Sign up and you get ${FREE_ENTRY_CREDITS} credits — one Seedance 1.5 film and one Kineo 1 film of 60 seconds — with every engine unlocked. No card. Plans start at ${usd(TIER_PRICES.starter.usd)}/month when you want more.`],
            ['Is there a free tier?', `Yes: ${FREE_ENTRY_CREDITS} credits on signup, no card. Trial films are watermarked; any paid plan unlocks clean downloads.`],
            ['How long does a film take?', 'About 3 minutes on Kineo 1 and Seedance; cinematic engines (Kling 3, Veo 3.1) take longer, sometimes 10–15 minutes when the provider is busy.'],
            ['Who owns the videos?', 'You do. Download the MP4 and post it anywhere.'],
          ].map(([q, a]) => (
            <details key={q} style={{ borderTop: '1px solid rgba(255,255,255,.1)', padding: '12px 0' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 15 }}>{q}</summary>
              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,.7)', fontSize: 14, lineHeight: 1.55 }}>{a}</p>
            </details>
          ))}
        </section>

        <div style={{ marginTop: 40 }}>
          <a href={CTA} rel="nofollow" data-testid="ph-cta-trial-bottom" style={{ background: '#2997ff', color: '#000', fontWeight: 900, fontSize: 16, padding: '14px 24px', borderRadius: 999, textDecoration: 'none', display: 'inline-block' }}>
            {CARD_ENTRY_COPY.ctaLong}
          </a>
        </div>
      </main>
      <Footer showStats={false} />
    </div>
  )
}
