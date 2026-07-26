import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  REVIVE_BASE_URL,
  REVIVE_PILOT_CHECKOUT_PATH,
  REVIVE_PILOT_DAYS,
  REVIVE_PILOT_PRICE_LABEL,
  formatNiche,
  formatSubscribers,
  formatUploadDate,
  getReviveProspect,
  isLikelyBotUserAgent,
  isSpeculativeRequest,
  markReviveView,
  normalizeReviveHandle,
  type ReviveProspect,
} from '@/app/revive/_lib/reviveProspect'

// KINEO-REVIVE-2026-07-26 — a página que aterrissa quando um canal dormente
// clica no email frio.
//
// POR QUE ELA É ASSIM (a evidência, não a estética):
//   713 signups → 3 pagantes → 0 canais conectados. A base atual não é o
//   comprador do Autopilot. O comprador é quem JÁ montou um canal de Shorts e
//   parou de exaustão. Essa pessoa não pede demo e não lê pitch — ela já sabe
//   quanto trabalho é. A única coisa que a convence é ver 3 episódios prontos,
//   no formato dela, tocando, sem formulário na frente.
//
// Por isso a ordem da página não é a de uma landing:
//   1. O ESPELHO   — o número dela, dito sem enfeite. É o motor psicológico:
//                    não é marketing, é um fato sobre o canal dela.
//   2. A ENTREGA   — os 3 vídeos, tocando. Se estivessem atrás de um form, a
//                    página não teria razão de existir.
//   3. A OFERTA    — o que acontece se ela disser sim, e o piloto como CTA.
//   4. A OBJEÇÃO   — "vocês querem acesso ao meu canal?". Essa é a que mata a
//                    conversão de verdade, e ela morre AQUI, não num email de
//                    follow-up que ela não vai abrir.
//
// REGRA DURA: todo número nesta página vem da linha do banco. Sem urgência
// falsa, sem depoimento inventado, sem estatística fabricada. E quando o dado
// não existe, a frase inteira desaparece — nunca "undefined days ago".
//
// `force-dynamic` é obrigatório: a página lê headers() para o filtro de robô e
// grava o pageview no servidor. Nada aqui pode ser cacheado entre prospects.
export const dynamic = 'force-dynamic'

// Sistema visual existente (idêntico a app/v/[id]/page.tsx e aos emails).
const BLUE = '#2997ff'
const MUTED = '#86868b'
const TEXT = '#f5f5f7'
const SOFT = '#d2d2d7'

// ⚠️ O destino do CTA e o rótulo de preço vivem em UMA constante cada, em
// app/revive/_lib/reviveProspect.ts. O SKU do piloto de $99/7 dias está sendo
// construído em paralelo por outro agente e ainda não existe; ver o bloco de
// aviso lá para saber por que o default aponta para /pricing e não para um
// `?tier=` chutado (chutar cobraria $24.90 em silêncio).
const CTA_PRICE = REVIVE_PILOT_PRICE_LABEL
const CTA_DAYS = REVIVE_PILOT_DAYS

// ═══════════════════════════════════════════════════════════════════════════
// Metadata — noindex, e nada do prospect no preview.
// ═══════════════════════════════════════════════════════════════════════════
// Estas páginas são privadas, uma por prospect, e a URL é adivinhável. Duas
// coisas não podem acontecer:
//   • entrar no índice do Google (viraria uma lista pública de quem a gente
//     está prospectando — e de canais parados, o que é constrangedor para eles);
//   • vazar o nome do canal num unfurl de link.
// Por isso o título é genérico e NÃO há leitura de banco aqui: generateMetadata
// roda numa passada separada do render, então personalizar custaria uma segunda
// consulta por visita em troca de zero conversão.
//
// `follow: false` (diferente de /v/[id], que usa follow: true): lá o objetivo é
// passar autoridade para o cluster interno; aqui não existe cluster para onde
// mandar crawler nenhum.
//
// Isto cobre a meta tag. O robots.txt NÃO cobre /revive hoje — ver o relatório:
// é preciso adicionar '/revive' ao array DISALLOW em app/robots.ts (arquivo de
// outro dono).
export const metadata: Metadata = {
  metadataBase: new URL(REVIVE_BASE_URL),
  title: 'Your next 3 episodes · Kineo',
  description: 'A private page. Three episodes made for one channel.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  openGraph: {
    title: 'Your next 3 episodes · Kineo',
    description: 'A private page. Three episodes made for one channel.',
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// Pedaços de UI
// ═══════════════════════════════════════════════════════════════════════════

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: TEXT,
        // Mobile first: 20px de respiro lateral. Outbound frio é lido no
        // celular, no meio de outra coisa.
        padding: '22px 16px 64px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>{children}</div>
    </main>
  )
}

function Wordmark() {
  return (
    <div style={{ color: BLUE, fontWeight: 800, fontSize: '1.02rem', letterSpacing: '-0.01em' }}>Kineo</div>
  )
}

/** Uma linha da lista de fatos. Cada uma é uma frase, não um bullet de slide. */
function Fact({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ color: SOFT, fontSize: '0.97rem', lineHeight: 1.62, margin: '0 0 10px' }}>{children}</li>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// A página
// ═══════════════════════════════════════════════════════════════════════════

export default async function RevivePage({ params }: { params: { handle: string } }) {
  const result = await getReviveProspect(params.handle)

  // Handle que realmente não existe = 404 de verdade (app/not-found.tsx), não
  // um template 200 dizendo "não encontrado".
  if (result.status === 'missing') notFound()

  // Queda do Supabase (ou migration 022 ainda não aplicada). NÃO pode virar 404:
  // este lead clica UMA vez, vindo de um email que a gente mandou. Um 404 aqui
  // queima o prospect para sempre; uma tela neutra pede 30 segundos.
  if (result.status === 'unavailable') {
    return (
      <Shell>
        <Wordmark />
        <p style={{ color: SOFT, fontSize: '1.05rem', lineHeight: 1.6, marginTop: 28 }}>
          This page is temporarily unavailable. It will be back in a minute — please refresh.
        </p>
      </Shell>
    )
  }

  const p: ReviveProspect = result.prospect
  const handle = normalizeReviveHandle(params.handle) ?? p.handle

  // ── Pageview: SERVIDOR, não beacon ────────────────────────────────────────
  // Um beacon no cliente subconta (JS bloqueado, aba fechada antes do flush) e
  // é forjável — e sem view→click confiável esta campanha é inauditável, que é
  // exatamente como 504 códigos de referral viraram 1 uso.
  //
  // Mas gravar TUDO que chega é pior que não gravar: 100% deste tráfego vem de
  // email, e o email passa por scanner corporativo antes da pessoa clicar (o
  // PUSH #97 já documentou 39 eventos de checkout que eram robô). Robô e
  // prefetch são descartados ANTES de tocar no contador.
  const h = headers()
  const isNoise = isSpeculativeRequest(h) || isLikelyBotUserAgent(h.get('user-agent'))
  if (!isNoise) {
    // A janela de dedupe é resolvida dentro do UPDATE (revive_mark_view na
    // migration 022), então dois renders concorrentes não contam duas vezes.
    // O evento em `events` só é escrito quando a linha foi de fato contada —
    // assim as duas contagens nunca divergem.
    const counted = await markReviveView(handle)
    if (counted) {
      await writeServerEvent({
        name: 'revive_page_viewed',
        path: `/revive/${handle}`,
        sessionId: cookies().get('kineo_event_session_id')?.value ?? null,
        metadata: {
          handle,
          niche: p.niche,
          days_dormant: p.daysDormant,
          subscriber_count: p.subscriberCount,
          videos: p.videos.length,
        },
      })
    }
  }

  // ── Dados derivados, todos com degradação explícita ───────────────────────
  const days = p.daysDormant
  const subs = formatSubscribers(p.subscriberCount)
  const lastUpload = formatUploadDate(p.lastUploadAt)
  const niche = formatNiche(p.niche)
  const videos = p.videos
  const n = videos.length

  // O h1 muda de forma quando não temos a data. NUNCA imprime um número vazio.
  const headline =
    days != null ? `${p.channelTitle} stopped ${days} days ago.` : `${p.channelTitle} stopped posting.`

  const ctaHref = `/api/revive/click?handle=${encodeURIComponent(handle)}`

  return (
    <Shell>
      {/* Sem navegação: esta página tem exatamente um caminho para a frente.
          Um menu aqui só oferece saídas para alguém que veio de um email frio. */}
      <header style={{ marginBottom: 26 }}>
        <Wordmark />
      </header>

      {/* ═══ 1. O ESPELHO ═══════════════════════════════════════════════════
          O motor da página inteira. Não suavizar para voz de marketing: a força
          está em ser um fato sobre o canal dele, verificável em 5 segundos. */}
      <section>
        <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 12px', letterSpacing: '0.01em' }}>
          {p.channelUrl ? (
            <a
              href={p.channelUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              style={{ color: MUTED, textDecoration: 'none' }}
            >
              @{handle}
            </a>
          ) : (
            <>@{handle}</>
          )}
          {/* Cada segmento só aparece se o dado existir. */}
          {subs ? ` · ${subs} subscribers` : ''}
          {niche ? ` · ${niche}` : ''}
        </p>

        <h1
          style={{
            fontSize: 'clamp(1.7rem, 7vw, 2.6rem)',
            fontWeight: 800,
            lineHeight: 1.14,
            letterSpacing: '-0.02em',
            margin: '0 0 16px',
          }}
        >
          {headline}
        </h1>

        {days != null && (
          <p style={{ fontSize: '1.06rem', lineHeight: 1.55, color: TEXT, margin: '0 0 10px', fontWeight: 600 }}>
            Your last upload was {days} days ago{lastUpload ? ` — ${lastUpload}` : ''}. You&apos;ve published 0
            videos since.
          </p>
        )}

        {subs && (
          <p style={{ fontSize: '1.02rem', lineHeight: 1.6, color: SOFT, margin: '0 0 10px' }}>
            {subs} people subscribed to that channel. Nothing has reached them since.
          </p>
        )}

        {/* Não sobra nenhuma linha factual? A página ainda faz sentido: ela diz
            o que é, sem fingir que sabe um número que não tem. */}
        {days == null && !subs && (
          <p style={{ fontSize: '1.02rem', lineHeight: 1.6, color: SOFT, margin: '0 0 10px' }}>
            The channel is still up. Nothing new has been posted to it in a while.
          </p>
        )}
      </section>

      {/* ═══ 2. A ENTREGA ═══════════════════════════════════════════════════ */}
      <section style={{ marginTop: 38 }}>
        <h2 style={{ fontSize: '1.28rem', fontWeight: 800, lineHeight: 1.3, margin: '0 0 8px' }}>
          {n > 0
            ? `Here ${n === 1 ? 'is the next episode' : `are the next ${n} episodes`}. Already made.`
            : 'Your next episodes are still rendering.'}
        </h2>
        <p style={{ color: MUTED, fontSize: '0.94rem', lineHeight: 1.6, margin: '0 0 20px' }}>
          {n > 0 ? (
            <>
              In your format{niche ? `, in ${niche.toLowerCase()}` : ''}. No signup, no form, nothing to fill in —
              press play.
            </>
          ) : (
            <>Give it a few minutes and refresh this page. Nothing here needs a signup.</>
          )}
        </p>

        {n > 0 && (
          <div
            style={{
              display: 'grid',
              // auto-fit sem media query: 1 coluna no celular, 3 no desktop.
              // Sem CSS novo, sem dependência nova.
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 230px))',
              justifyContent: 'center',
              gap: 14,
            }}
          >
            {videos.map((v, i) => (
              <figure key={v.id} style={{ margin: 0 }}>
                <video
                  src={v.url}
                  poster={v.posterUrl ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  // Só o PRIMEIRO com autoplay, e mudo — é o que os navegadores
                  // permitem sem gesto do usuário e é o que faz a página parecer
                  // uma ENTREGA e não uma oferta: já tem coisa se mexendo quando
                  // ele chega. `controls` continua ali, então tirar o mudo é um
                  // toque. Os outros dois não tocam sozinhos: três áudios
                  // disputando no celular seria motivo para fechar a aba.
                  autoPlay={i === 0}
                  muted={i === 0}
                  loop={i === 0}
                  style={{
                    width: '100%',
                    aspectRatio: '9 / 16',
                    borderRadius: 16,
                    background: '#000',
                    border: '1px solid rgba(41,151,255,0.25)',
                    boxShadow: '0 16px 44px rgba(0,0,0,0.5)',
                    display: 'block',
                  }}
                />
                {v.title && (
                  <figcaption
                    style={{
                      color: MUTED,
                      fontSize: '0.78rem',
                      lineHeight: 1.45,
                      marginTop: 8,
                      textAlign: 'center',
                    }}
                  >
                    {v.title}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        {n > 0 && (
          <p style={{ color: MUTED, fontSize: '0.82rem', textAlign: 'center', margin: '14px 0 0' }}>
            The first one is muted so it can start on its own. Tap the speaker for sound.
          </p>
        )}
      </section>

      {/* ═══ 3. A OFERTA ════════════════════════════════════════════════════ */}
      <section
        style={{
          marginTop: 40,
          padding: '22px 18px',
          borderRadius: 18,
          background: 'rgba(41,151,255,0.08)',
          border: '1px solid rgba(41,151,255,0.3)',
        }}
      >
        <h2 style={{ fontSize: '1.22rem', fontWeight: 800, lineHeight: 1.3, margin: '0 0 14px' }}>
          Say the word and they go live.
        </h2>
        <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none' }}>
          {n > 0 && (
            <Fact>
              <strong style={{ color: TEXT }}>
                {n === 1 ? 'This episode goes' : `These ${n} go`} live on your channel tomorrow
              </strong>
              , at a posting time you choose.
            </Fact>
          )}
          <Fact>
            <strong style={{ color: TEXT }}>Then one more, every single day after that.</strong> You don&apos;t
            write, record, edit, or upload anything.
          </Fact>
          <Fact>
            {/* Sem nicho a frase tem que continuar gramatical — nada de
                "same  lane" com dois espaços onde a palavra deveria estar. */}
            Same vertical format, same length, {niche ? `same ${niche.toLowerCase()} lane` : 'same lane'} you
            already built. We match what the channel already does — that&apos;s what you just watched.
          </Fact>
          <Fact>You choose whether each one goes out public, unlisted, or private.</Fact>
        </ul>

        {/* Plain <a>, não next/link, e nofollow: (a) o destino é uma rota de
            API, (b) o <Link> do Next faz prefetch e o prefetch registraria um
            clique que ninguém deu — o erro exato que o PUSH #97 encontrou em
            produção. A rota de destino também rejeita prefetch, mas a primeira
            defesa é não gerar a requisição. */}
        <a
          href={ctaHref}
          rel="nofollow"
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            textAlign: 'center',
            background: BLUE,
            color: '#000',
            fontWeight: 900,
            fontSize: '1.05rem',
            // 16px vertical → alvo de toque ≥ 48px. Isto é lido no celular.
            padding: '16px 22px',
            borderRadius: 14,
            textDecoration: 'none',
          }}
        >
          Start the {CTA_DAYS}-day pilot — {CTA_PRICE}
        </a>
        <p style={{ color: MUTED, fontSize: '0.84rem', lineHeight: 1.55, margin: '12px 0 0', textAlign: 'center' }}>
          {CTA_PRICE} covers {CTA_DAYS} days: {CTA_DAYS} videos published to your channel. The exact terms are on
          the checkout page before you pay anything.
        </p>
      </section>

      {/* ═══ 4. A OBJEÇÃO QUE REALMENTE TRAVA ═══════════════════════════════
          Um estranho pedindo permissão de publicação no YouTube tem que
          responder isso NA PÁGINA. Num email de follow-up já é tarde: a pessoa
          já fechou a aba com a dúvida na cabeça.
          Os três escopos abaixo são exatamente YOUTUBE_SCOPES em lib/youtube.ts
          (youtube.upload, youtube.readonly, yt-analytics.readonly) — conferidos
          no código, não estimados. Se aquela lista mudar, esta seção mente. */}
      <section style={{ marginTop: 42 }}>
        <h2 style={{ fontSize: '1.16rem', fontWeight: 800, lineHeight: 1.35, margin: '0 0 6px' }}>
          &ldquo;So you want access to my channel?&rdquo;
        </h2>
        <p style={{ color: MUTED, fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Yes. You should not hand that over on vibes, so here is exactly what it is.
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          <Fact>
            You connect on <strong style={{ color: TEXT }}>Google&apos;s own permission screen</strong>. We never
            see, receive or store your password.
          </Fact>
          <Fact>
            We request three things and nothing else:{' '}
            <strong style={{ color: TEXT }}>upload videos</strong>, read your channel&apos;s basic info, and read
            your own analytics so we can tell you what worked.
          </Fact>
          <Fact>
            What that does <strong style={{ color: TEXT }}>not</strong> allow: we cannot delete or edit the videos
            you already published, cannot rename or rebrand your channel, cannot touch your monetization or payout
            settings, and cannot read your email or anything outside YouTube.
          </Fact>
          <Fact>
            Everything we publish appears in your YouTube Studio like any other upload — yours, on your channel,
            under your name.
          </Fact>
          <Fact>
            You revoke it in one click at{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer nofollow"
              style={{ color: BLUE, textDecoration: 'none', fontWeight: 700 }}
            >
              myaccount.google.com/permissions
            </a>
            . That is Google&apos;s page, not ours. We cannot stop you and we don&apos;t have to be involved.
          </Fact>
        </ul>
      </section>

      {/* ═══ 5. POR QUE VOCÊ RECEBEU ISSO ═══════════════════════════════════
          "Como vocês me acharam?" é a segunda objeção de todo outbound frio, e
          responder mal custa mais que não responder. A resposta honesta também
          é o argumento mais forte da página, então ela fica escrita. */}
      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: '1.02rem', fontWeight: 800, margin: '0 0 10px' }}>Why you got this</h2>
        <p style={{ color: SOFT, fontSize: '0.94rem', lineHeight: 1.68, margin: '0 0 12px' }}>
          You didn&apos;t ask for it, and we know that. We looked through public YouTube data for
          {niche ? ` ${niche.toLowerCase()} ` : ' '}
          channels between 1,000 and 50,000 subscribers that had stopped uploading. Yours came up.
        </p>
        <p style={{ color: SOFT, fontSize: '0.94rem', lineHeight: 1.68, margin: 0 }}>
          Then we made the {n > 0 ? (n === 1 ? 'episode' : `${n} episodes`) : 'episodes'} before writing to you,
          because arguing about whether this would work for <em>your</em> channel is a waste of your time and ours.
          You just watched the answer.
        </p>
      </section>

      <footer
        style={{
          marginTop: 44,
          paddingTop: 18,
          borderTop: '1px solid rgba(255,255,255,0.09)',
          color: MUTED,
          fontSize: '0.82rem',
          lineHeight: 1.65,
        }}
      >
        <p style={{ margin: '0 0 10px' }}>
          Not interested? Reply to the email with a single word and we delete this page and never contact you
          again.
        </p>
        <p style={{ margin: 0 }}>
          Kineo ·{' '}
          <a href="/terms" rel="nofollow" style={{ color: MUTED }}>
            Terms
          </a>{' '}
          ·{' '}
          <a href="/privacy" rel="nofollow" style={{ color: MUTED }}>
            Privacy
          </a>
        </p>
      </footer>
    </Shell>
  )
}
