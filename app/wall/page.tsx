// app/wall/page.tsx — KINEO-WALL-2026-08-03
//
// WALL OF PROOF. Página pública com os Shorts que usuários da Kineo realmente
// publicaram no YouTube, ranqueados pelas views reais.
//
// Dois trabalhos, um só artefato:
//   1) CONVERSÃO — prova social que não é depoimento escrito por nós: cada card
//      abre um vídeo vivo no YouTube, com o canal de quem postou. É a diferença
//      entre "clientes adoram" e "aqui está, clique e confira".
//   2) RETENÇÃO — D7 hoje é 0,4%. Um gerador não tem motivo de volta; um
//      ranking tem. O usuário cola o link, aparece aqui, e volta pra ver onde
//      ficou. O convite fica no fim do fluxo de download (GenerateClient).
//
// Estoque e regras de privacidade: lib/wallOfProof.ts. Coleta de views:
// app/api/wall/refresh/route.ts.
//
// HONESTIDADE: nada aqui é inventado. Sem linhas em `posted_shorts` a página
// mostra um empty state que convida a colar o primeiro link. Sem contagem de
// views (o caso enquanto não houver YOUTUBE_API_KEY no ambiente) a página
// ordena por data e DIZ que as views ainda estão chegando — em vez de exibir
// um zero que passaria por número real.

import type { Metadata } from 'next'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import WallSubmitLink from '@/components/wall/WallSubmitLink'
import {
  getWallData,
  formatViews,
  relativeDay,
  PUBLIC_BASE_URL,
  WALL_WEEK_DAYS,
  type WallRange,
  type WallShort,
} from '@/lib/wallOfProof'

const BLUE = '#2997ff'
const MUTED = '#86868b'

const TITLE = 'Wall of Proof — Shorts made with Kineo, ranked by real views'
const DESCRIPTION =
  'Real YouTube Shorts published by Kineo users, ranked by the views they actually got. Every card opens the live video on YouTube. Make yours free and get on the wall.'

// A página lê `searchParams`, então é renderizada sob demanda. Para não bater no
// Supabase a cada crawl, a leitura em si fica em cache por 10 minutos — o mesmo
// espírito do ISR de /v/[id], que também é público e indexável.
const loadWall = unstable_cache(
  async (range: WallRange) => getWallData(range),
  ['kineo-wall-of-proof'],
  { revalidate: 600, tags: ['wall-of-proof'] },
)

// O root layout NÃO declara `robots` nem `alternates.canonical` (ver o comentário
// PUSH #92 em app/layout.tsx), então esta página não herda noindex nenhum. Ainda
// assim o index:true é declarado explicitamente: /wall é exatamente o tipo de
// rota que alguém "protege" por engano num futuro sweep de robots.
export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_BASE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // Canonical único para os dois recortes: /wall?range=all é a MESMA página com
  // outro filtro, não uma URL nova para indexar.
  alternates: { canonical: '/wall' },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${PUBLIC_BASE_URL}/wall`,
    siteName: 'Kineo',
    type: 'website',
    images: [{ url: `${PUBLIC_BASE_URL}/og-card.png`, width: 1200, height: 630, alt: 'Kineo Wall of Proof' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [`${PUBLIC_BASE_URL}/og-card.png`],
  },
}

function ctaHref(placement: 'top' | 'bottom' | 'empty'): string {
  const query = new URLSearchParams({
    utm_source: 'wall',
    utm_medium: 'proof',
    utm_campaign: 'wall_of_proof',
    utm_content: placement,
  })
  return `/signup?${query.toString()}`
}

function itemListJsonLd(items: WallShort[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Shorts made with Kineo',
    description: DESCRIPTION,
    url: `${PUBLIC_BASE_URL}/wall`,
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: items.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: s.watchUrl,
      name: s.title ?? `A YouTube Short by ${s.author}`,
    })),
  }
}

function Cta({ placement, label }: { placement: 'top' | 'bottom' | 'empty'; label: string }) {
  return (
    <Link
      href={ctaHref(placement)}
      style={{
        display: 'inline-block',
        background: BLUE,
        color: '#000',
        fontWeight: 900,
        padding: '13px 26px',
        borderRadius: 12,
        textDecoration: 'none',
        fontSize: '1rem',
      }}
    >
      {label}
    </Link>
  )
}

function RangeTabs({ range }: { range: WallRange }) {
  const tabs: { key: WallRange; label: string; href: string }[] = [
    { key: 'week', label: 'This week', href: '/wall' },
    { key: 'all', label: 'All time', href: '/wall?range=all' },
  ]
  return (
    // Links reais, não botões com JS: as abas funcionam sem hidratação e um
    // crawler consegue ver os dois recortes.
    <nav
      aria-label="Ranking range"
      style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }}
    >
      {tabs.map((t) => {
        const active = t.key === range
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: '0.85rem',
              fontWeight: 800,
              textDecoration: 'none',
              color: active ? '#000' : '#d2d2d7',
              background: active ? BLUE : 'transparent',
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

function ShortCard({ short, rank }: { short: WallShort; rank: number }) {
  return (
    <li style={{ listStyle: 'none' }}>
      <a
        href={short.watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '9 / 16',
            borderRadius: 14,
            overflow: 'hidden',
            background: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* hqdefault.jpg é 480x360 com o quadro vertical CENTRALIZADO entre
              barras pretas. Um crop 9:16 centrado corta exatamente as barras
              (360 x 9/16 = 202,5px de 480), então o card mostra o Short e não
              um retângulo com tarjas. `unoptimized`/<img> de propósito: o host
              i.ytimg.com não está em next.config images.remotePatterns e
              adicionar um domínio ao pipeline de otimização por causa de uma
              thumbnail não se paga. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={short.thumbnailUrl}
            alt={short.title ?? `YouTube Short by ${short.author}`}
            loading="lazy"
            width={480}
            height={360}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              minWidth: 26,
              textAlign: 'center',
              padding: '3px 7px',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.72)',
              color: rank <= 3 ? BLUE : '#f5f5f7',
              fontSize: '0.72rem',
              fontWeight: 900,
            }}
          >
            #{rank}
          </span>
          {short.views != null && (
            <span
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                padding: '4px 9px',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.72)',
                color: '#f5f5f7',
                fontSize: '0.76rem',
                fontWeight: 900,
              }}
            >
              {formatViews(short.views)} views
            </span>
          )}
        </div>
        <p
          style={{
            margin: '10px 0 2px',
            fontSize: '0.86rem',
            fontWeight: 700,
            lineHeight: 1.4,
            color: '#f5f5f7',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {short.title ?? 'Watch on YouTube'}
        </p>
        <p style={{ margin: 0, fontSize: '0.76rem', color: MUTED }}>
          {short.author} · {relativeDay(short.addedAt)}
        </p>
      </a>
    </li>
  )
}

function EmptyState({ range }: { range: WallRange }) {
  return (
    <div
      style={{
        marginTop: 28,
        padding: '34px 22px',
        borderRadius: 18,
        textAlign: 'center',
        background: 'rgba(41,151,255,0.06)',
        border: '1px dashed rgba(41,151,255,0.35)',
      }}
    >
      <p style={{ margin: '0 0 8px', fontWeight: 900, fontSize: '1.05rem' }}>
        {range === 'week' ? 'No Shorts on the board this week — yet.' : 'The wall is still empty.'}
      </p>
      <p style={{ margin: '0 auto 18px', maxWidth: 460, color: '#d2d2d7', fontSize: '0.92rem', lineHeight: 1.6 }}>
        Every Short here was published by a real person who made it with Kineo and pasted the link. Nothing is
        seeded, nothing is staged. Make one, post it, drop the link — and you are the first name on the board.
      </p>
      <Cta placement="empty" label="Make a free Short →" />
      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'left' }}>
        <WallSubmitLink />
      </div>
    </div>
  )
}

export default async function WallOfProofPage({
  searchParams,
}: {
  searchParams?: { range?: string }
}) {
  const range: WallRange = searchParams?.range === 'all' ? 'all' : 'week'
  const data = await loadWall(range)
  const { items, totalAllTime, viewsPending, totalViews } = data

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#f5f5f7',
        padding: '24px 16px 64px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {items.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(items)).replace(/</g, '\\u003c') }}
        />
      )}

      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 20 }}>
          <Link href="/" style={{ color: BLUE, fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>
            Kineo
          </Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}>Wall of Proof</span>
        </nav>

        <header style={{ marginBottom: 22 }}>
          <p
            style={{
              margin: '0 0 8px',
              color: BLUE,
              fontSize: '0.72rem',
              fontWeight: 900,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Wall of Proof
          </p>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, lineHeight: 1.2, margin: '0 0 10px', maxWidth: 760 }}>
            Shorts made with Kineo — ranked by real views
          </h1>
          <p style={{ margin: '0 0 18px', color: '#d2d2d7', fontSize: '0.98rem', lineHeight: 1.6, maxWidth: 700 }}>
            Every video below was generated with Kineo, published to YouTube by the person who made it, and added by
            pasting the link. Click any card to watch it on YouTube.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
            <RangeTabs range={range} />
            <Cta placement="top" label="Make a free Short →" />
          </div>

          {/* Contador honesto: só afirma o que os dados sustentam. */}
          {totalAllTime > 0 && (
            <p style={{ margin: '14px 0 0', fontSize: '0.82rem', color: MUTED }}>
              {totalAllTime} Short{totalAllTime === 1 ? '' : 's'} published by Kineo users
              {totalViews > 0 ? ` · ${formatViews(totalViews)} views counted` : ''}
              {range === 'week' ? ` · showing the last ${WALL_WEEK_DAYS} days` : ''}
            </p>
          )}
        </header>

        {/* Enquanto não houver contagem de views nenhuma, a ordem é por data e a
            página diz isso. Chamar isso de "ranked by views" seria mentira. */}
        {items.length > 0 && viewsPending && (
          <p
            role="status"
            style={{
              margin: '0 0 18px',
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#d2d2d7',
              fontSize: '0.83rem',
            }}
          >
            View counts are coming soon — for now this board is ordered by newest first.
          </p>
        )}

        {items.length === 0 ? (
          <EmptyState range={range} />
        ) : (
          <ul
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 18,
              margin: 0,
              padding: 0,
            }}
          >
            {items.map((short, i) => (
              <ShortCard key={short.id} short={short} rank={i + 1} />
            ))}
          </ul>
        )}

        {/* id="paste" — destino do botão "Paste my link" do e-mail
            send-post-nudge. Sem a âncora, quem clica no e-mail cai no TOPO da
            página e precisa rolar até 60 cards para achar o campo que o botão
            prometeu. Mexer neste id quebra aquele e-mail. */}
        <section
          id="paste"
          style={{
            marginTop: 44,
            padding: 24,
            borderRadius: 18,
            textAlign: 'center',
            background: 'rgba(41,151,255,0.08)',
            border: '1px solid rgba(41,151,255,0.3)',
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 900 }}>Get your Short on this wall</h2>
          <p style={{ margin: '0 auto 18px', maxWidth: 520, color: '#d2d2d7', fontSize: '0.94rem', lineHeight: 1.6 }}>
            Type a topic, get a finished 9:16 Short with script, voiceover, footage and captions. Publish it, paste
            the link on the finish screen, and it shows up here.
          </p>
          <Cta placement="bottom" label="Make a free Short →" />
          {/* O loop de retenção fecha aqui: quem já publicou cola o link na
              própria página do ranking, sem precisar gerar outro vídeo só para
              alcançar o campo da tela de sucesso. */}
          <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'left' }}>
            <WallSubmitLink />
          </div>
        </section>

        {/* Links internos para o cluster que já existe — a página não pode ser
            uma folha órfã no grafo do site. */}
        <nav aria-label="More from Kineo" style={{ marginTop: 34 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 10px' }}>More from Kineo</h2>
          <ul style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.9, margin: 0, paddingLeft: 20 }}>
            <li>
              <Link href="/examples" style={{ color: BLUE, textDecoration: 'none' }}>
                Example Shorts made with Kineo
              </Link>
            </li>
            <li>
              <Link href="/youtube-shorts-from-topic" style={{ color: BLUE, textDecoration: 'none' }}>
                Turn any topic into a YouTube Short
              </Link>
            </li>
            <li>
              <Link href="/faceless-video-generator" style={{ color: BLUE, textDecoration: 'none' }}>
                Faceless video generator
              </Link>
            </li>
            <li>
              <Link href="/pricing" style={{ color: BLUE, textDecoration: 'none' }}>
                Pricing
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </main>
  )
}
