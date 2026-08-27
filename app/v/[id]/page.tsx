import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import PublicVideoCtaLink from '@/components/PublicVideoCtaLink'
import ShareVideoButton from './ShareVideoButton'
import {
  getPublicVideoResult,
  metaDescriptionFor,
  PUBLIC_BASE_URL,
  type PublicVideo,
} from '@/lib/publicVideos'
import {
  generateFromScriptHref,
  getRelatedScripts,
  getScriptVertical,
  type LibraryScript,
} from '@/lib/scriptLibrary'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

// #459 — Public shareable video page (/v/[id]). Every generated video gets a
// public landing: the 9:16 player + a "make your own free" CTA. When a user
// shares their video, each share is a landing that brings a NEW visitor who has
// already SEEN the product working (warmer than cold traffic).
//
// PUSH #96+ — the page was a player and a button, and 564 of them were in no
// sitemap at all. Two problems, one fix:
//   1. Multiplying a player-plus-button template 564 times is precisely the
//      shape Google's scaled-content-abuse policy (updated 2026-05-15) demotes —
//      it applies "no matter how it's created" and has no user-generated
//      carve-out. So the page now carries the video's OWN script as readable
//      prose, its runtime, its description and hashtags: substance unique to
//      each URL that a human would actually read.
//   2. The historical public implementation used ISR. Privacy containment
//      below disables shared revalidation and returns the same denied result
//      for every session; owners use authenticated dashboard surfaces.
//
// Which videos are public, and which are indexable, is decided ONLY in
// lib/publicVideos.ts — shared with app/video-sitemap.xml/route.ts so the
// sitemap can never advertise a page that renders `noindex`.
// Universal fail-closed result: do not vary this anonymous page by owner
// session inside a shared ISR cache. Owners use authenticated dashboard pages.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const BLUE = '#2997ff'
const MUTED = '#86868b'

function signupHrefFor(v: PublicVideo | null): string {
  const query = new URLSearchParams({
    utm_source: 'public_video',
    utm_medium: 'share',
    utm_campaign: 'make_one_like_this',
  })
  // Signup already accepts `prompt` and carries it through email/OAuth to the
  // local /generate activation URL. URLSearchParams encodes untrusted text and
  // a short title-sized cap keeps the CTA URL bounded.
  // Remix the idea, not the entire stored script: seeding the whole script
  // would create a duplicate instead of a fresh episode.
  const prompt = v ? v.title.trim().slice(0, 160) : ''
  if (prompt) {
    query.set('prompt', prompt)
    // ONDA4 #1 (14/08) — com create_intent=fast o signup empurra o visitante
    // DIRETO para a geracao com o topico semeado (mesmo caminho rapido do CTA
    // secundario). Sem isso, o botao mais clicado da pagina caia num signup
    // generico.
    query.set('create_intent', 'fast')
  }
  query.set('intent_campaign', 'public_video_remix')
  return `/signup?${query.toString()}`
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const result = await getPublicVideoResult(params.id)
  const v = result.status === 'ok' ? result.video : null
  const title = v?.title ?? 'AI YouTube Short'
  const desc = v
    ? metaDescriptionFor(v)
    : `Made with Kineo — type any topic and AI writes the script, voiceover, captions and footage. ${ft(OFFER, 'Create up to 3 watermarked Fast videos every 24 hours with no card.', OFFER.copy.headline)}`

  return {
    metadataBase: new URL(PUBLIC_BASE_URL),
    title: `${title} · Kineo`,
    description: desc,
    // PUSH #92 — P0 canonical bug: this route had no canonical of its own, so
    // every shared video page shallow-merged the root layout's canonical
    // (the homepage), telling Google every `/v/[id]` page duplicates `/`.
    alternates: { canonical: `/v/${params.id}` },
    // A page that fails the quality gate still renders (the owner shared this
    // link and must see their video) but is never offered to the index.
    robots: v?.isIndexable ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description: desc,
      // ONDA4 #11/#12 (14/08) — Next SUBSTITUI (nao mescla) o openGraph do
      // root layout: sem siteName/url aqui o card sai sem a marca. E sem
      // type/width/height no video, Telegram/X nao montam o player inline.
      siteName: 'Kineo',
      url: `/v/${params.id}`,
      // ═══ KINEO-PREVIEW-COMPARTILHADO-2026-08-25 ═══════════════════════════
      // O LOOP VIRAL ESTAVA VAZANDO AQUI. Este objeto tinha `videos` mas NÃO
      // tinha `images` — e nenhuma rede monta card por vídeo: WhatsApp,
      // Telegram, X, Facebook, Slack e iMessage TODOS exigem og:image para
      // desenhar a miniatura. Resultado medido no HTML: cada filme que um
      // cliente compartilhava (o nosso canal de distribuição mais barato,
      // impulsionado pela marca d'água) chegava como link cinza sem imagem.
      // O card OG (1200×630) já era gerado e já era usado no JSON-LD do
      // schema — só faltava entregá-lo às redes sociais. Uma linha.
      images: v?.thumbnailUrl ? [{ url: v.thumbnailUrl, width: 1200, height: 630, alt: title }] : undefined,
      videos: v?.playbackUrl
        ? [{ url: v.playbackUrl, type: 'video/mp4', width: 1080, height: 1920 }]
        : undefined,
      type: 'video.other',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      // Mesmo motivo: sem images aqui o X cai no card de texto puro.
      images: v?.thumbnailUrl ? [v.thumbnailUrl] : undefined,
    },
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s ? `${m} min ${s} s` : `${m} min`
}

/** schema.org VideoObject — the structured data that makes the page eligible
 *  for a video result in Search. Only emitted for indexable pages. */
function videoJsonLd(v: PublicVideo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: v.title,
    description: metaDescriptionFor(v),
    thumbnailUrl: [v.thumbnailUrl],
    uploadDate: v.publishedAt,
    contentUrl: v.playbackUrl ?? undefined,
    embedUrl: v.pageUrl,
    duration: v.isoDuration ?? undefined,
    isFamilyFriendly: true,
    publisher: {
      '@type': 'Organization',
      name: 'Kineo',
      url: PUBLIC_BASE_URL,
    },
  }
}

// KINEO-SCRIPT-LIBRARY-2026-08-03 — the breadcrumb used to point at /examples,
// a page of four hardcoded demos that has nothing to do with this video. It now
// mirrors the REAL hierarchy the page sits in: Home › Shorts Script Library ›
// <topic> › this script. That matters twice over — it is the trail Google
// renders in the SERP, and it is the path authority now flows along.
function breadcrumbJsonLd(v: PublicVideo, vertical: string | null) {
  const trail: Array<{ name: string; item: string }> = [
    { name: 'Home', item: PUBLIC_BASE_URL },
    { name: 'Shorts Script Library', item: `${PUBLIC_BASE_URL}/scripts` },
  ]
  const meta = vertical ? getScriptVertical(vertical) : null
  if (meta) trail.push({ name: meta.label, item: `${PUBLIC_BASE_URL}/scripts/${meta.slug}` })
  trail.push({ name: v.title, item: v.pageUrl })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((entry, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: entry.name,
      item: entry.item,
    })),
  }
}

export default async function PublicVideoPage({ params }: { params: { id: string } }) {
  const result = await getPublicVideoResult(params.id)
  // A genuinely absent id is a real 404, not a 200 "not available" template.
  // A Supabase outage falls through to the friendly noindex render below so an
  // incident can't 404 the entire public surface.
  if (result.status === 'missing') notFound()

  const v = result.status === 'ok' ? result.video : null
  const ready = !!v?.playbackUrl
  const title = v?.title ?? 'AI YouTube Short'
  const signupHref = signupHrefFor(v)

  // KINEO-SCRIPT-LIBRARY-2026-08-03 — sibling scripts. Only members of the
  // library are returned and every member has already cleared the quality gate
  // in lib/publicVideos.ts, so this rail can never link to a `noindex` page or
  // a dead id. When Supabase is unreachable the library resolves to empty and
  // the whole block simply does not render.
  const { vertical, related } = await getRelatedScripts(params.id, 9)
  const verticalMeta = vertical ? getScriptVertical(vertical) : null

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#000',
        color: '#f5f5f7',
        padding: '24px 16px 120px',
        fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif',
      }}
    >
      {v?.isIndexable && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd(v)).replace(/</g, '\\u003c') }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(breadcrumbJsonLd(v, vertical)).replace(/</g, '\\u003c'),
            }}
          />
        </>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 18 }}>
          <Link href="/" style={{ color: BLUE, fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>
            Kineo
          </Link>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <Link href="/scripts" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>
            Shorts Script Library
          </Link>
          {verticalMeta && (
            <>
              <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
              <Link
                href={`/scripts/${verticalMeta.slug}`}
                style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}
              >
                {verticalMeta.label}
              </Link>
            </>
          )}
        </nav>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.28, margin: '0 0 10px' }}>{title}</h1>

        <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 20px' }}>
          A faceless AI Short generated with Kineo
          {v?.durationSeconds ? ` · ${formatDuration(v.durationSeconds)}` : ''}
          {v?.publishedAt ? ` · ${new Date(v.publishedAt).toISOString().slice(0, 10)}` : ''}
        </p>

        <div style={{ maxWidth: 380 }}>
          {/* ONDA4 #17 (14/08) — quem vem de link social espera reproducao
              imediata: autoplay mudo em loop, controles na mao para o som.
              preload continua metadata: o peso so desce quando visivel. */}
          {ready ? (
            <video
              src={v!.playbackUrl!}
              poster={v!.posterUrl ?? undefined}
              controls
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              style={{
                width: '100%',
                aspectRatio: '9 / 16',
                borderRadius: 18,
                background: '#000',
                border: '1px solid rgba(41,151,255,0.25)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '9 / 16',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: 20,
                color: MUTED,
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {/* ONDA4 #7 (14/08) — ~10% dos links caem aqui (URL expirada).
                  O beco sem saida agora tem a unica porta que importa. */}
              <span>This preview expired.</span>
              <PublicVideoCtaLink
                href={signupHref}
                videoId={params.id}
                placement="expired_preview"
                style={{
                  display: 'inline-block',
                  background: BLUE,
                  color: '#000',
                  fontWeight: 900,
                  padding: '11px 20px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                }}
              >
                Make yours — free →
              </PublicVideoCtaLink>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 22,
            padding: 18,
            borderRadius: 16,
            background: 'rgba(41,151,255,0.08)',
            border: '1px solid rgba(41,151,255,0.3)',
          }}
        >
          {/* ONDA4 #3 (14/08) — o pitch implicito vira explicito: sem camera,
              sem edicao, minutos. E o convite e "voce tambem consegue". */}
          <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>
            No camera. No editing. Made with AI in minutes.
          </p>
          <p style={{ margin: '6px 0 14px', color: '#CBD5E1', fontSize: '0.9rem', lineHeight: 1.5 }}>
            This Short was generated from a single topic — script, voiceover, captions and footage.{' '}
            {ft(OFFER, 'Create, share and download up to 3 watermarked Fast videos every 24 hours — upgrade only when you want a clean export.', OFFER.copy.headline + ' Upgrade only when you want more.')}
          </p>
          <PublicVideoCtaLink
            href={signupHref}
            videoId={params.id}
            placement="under_player"
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
            Make one like this →
          </PublicVideoCtaLink>
          <ShareVideoButton title={v?.title ?? 'A Short made with Kineo'} />
        </div>

        {v && v.paragraphs.length > 0 && (
          <section style={{ marginTop: 34 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 12px' }}>
              {v.isStructuredScript ? 'Full script' : 'The brief behind this video'}
            </h2>
            {/* Honest labelling: only rows carrying HOOK/MICRO REWARD/PAYOFF
                markers hold a real beat-by-beat script. The rest store the
                creator's own brief, which is still text unique to this URL. */}
            {v.paragraphs.map((p, i) => (
              <p key={i} style={{ color: '#d2d2d7', fontSize: '0.98rem', lineHeight: 1.65, margin: '0 0 12px' }}>
                {p}
              </p>
            ))}
            {/* KINEO-SCRIPT-LIBRARY-2026-08-03 — the conversion moment. A reader
                who just finished the script has the idea in their head RIGHT
                NOW; asking here converts better than the generic hero CTA. Uses
                the same /signup?prompt=…&create_intent=fast contract that
                app/HomeTopicForm.tsx already builds — no new querystring. */}
            <PublicVideoCtaLink
              href={generateFromScriptHref(v.title, 'script_library_video_page')}
              videoId={params.id}
              placement="after_script"
              style={{
                display: 'inline-block',
                marginTop: 6,
                background: 'rgba(41,151,255,0.12)',
                border: `1px solid ${BLUE}`,
                color: BLUE,
                fontWeight: 800,
                padding: '12px 22px',
                borderRadius: 12,
                textDecoration: 'none',
                fontSize: '0.95rem',
              }}
            >
              Generate a Short from this script →
            </PublicVideoCtaLink>
          </section>
        )}

        {v?.youtubeDescription && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 12px' }}>Video description</h2>
            <p style={{ color: '#d2d2d7', fontSize: '0.95rem', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>
              {v.youtubeDescription}
            </p>
          </section>
        )}

        {v && v.hashtags.length > 0 && (
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 10px' }}>Hashtags</h2>
            <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{v.hashtags.join(' ')}</p>
          </section>
        )}

        {/* KINEO-SCRIPT-LIBRARY-2026-08-03 — "More scripts like this".
            THIS is the block that de-orphans the surface. Before it, every
            /v/[id] page was a leaf with zero outbound links to any other
            /v/[id]: the sitemap announced 575 URLs that nothing on the site
            pointed to, and an orphan does not rank no matter how good its
            JSON-LD is. Now each page links to up to 9 siblings in the same
            vertical, so the pages form a connected graph a crawler can walk. */}
        {related.length > 0 && (
          <section style={{ marginTop: 34 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px' }}>More scripts like this</h2>
            <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 14px', lineHeight: 1.6 }}>
              {verticalMeta ? (
                <>
                  From the{' '}
                  <Link href={`/scripts/${verticalMeta.slug}`} style={{ color: BLUE, textDecoration: 'none' }}>
                    {verticalMeta.label}
                  </Link>{' '}
                  shelf of the{' '}
                  <Link href="/scripts" style={{ color: BLUE, textDecoration: 'none' }}>
                    Shorts Script Library
                  </Link>
                  . Full narration on every page, free to read.
                </>
              ) : (
                <>
                  From the{' '}
                  <Link href="/scripts" style={{ color: BLUE, textDecoration: 'none' }}>
                    Shorts Script Library
                  </Link>
                  . Full narration on every page, free to read.
                </>
              )}
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
              {related.map((s: LibraryScript) => (
                <li
                  key={s.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    padding: '11px 14px',
                  }}
                >
                  <Link
                    href={s.href}
                    style={{ color: '#e5e7eb', textDecoration: 'none', fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.45 }}
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
            <p style={{ margin: '14px 0 0', fontSize: '0.88rem' }}>
              <Link href="/scripts" style={{ color: BLUE, textDecoration: 'none', fontWeight: 800 }}>
                Browse every free Shorts script →
              </Link>
            </p>
          </section>
        )}

        <section style={{ marginTop: 34 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 12px' }}>How this Short was made</h2>
          <p style={{ color: '#d2d2d7', fontSize: '0.95rem', lineHeight: 1.7, margin: '0 0 12px' }}>
            Kineo turned a single topic line into this vertical video: it wrote the script, generated the voiceover,
            burned in the captions and matched stock footage to every beat. No camera, no editing timeline, no
            voice recording — the render finishes in a few minutes.
          </p>
          {/* Internal links so these pages are not orphan leaves: each one
              points back into the acquisition cluster that already ranks. */}
          <ul style={{ color: MUTED, fontSize: '0.92rem', lineHeight: 1.9, margin: 0, paddingLeft: 20 }}>
            <li>
              <Link href="/scripts" style={{ color: BLUE, textDecoration: 'none' }}>
                Free YouTube Shorts scripts library
              </Link>
            </li>
            {verticalMeta && (
              <li>
                <Link href={`/free-ai-shorts/${verticalMeta.slug}`} style={{ color: BLUE, textDecoration: 'none' }}>
                  Free {verticalMeta.label} Shorts generator
                </Link>
              </li>
            )}
            <li>
              <Link href="/examples" style={{ color: BLUE, textDecoration: 'none' }}>
                See more example Shorts made with Kineo
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
              <Link href="/free-ai-shorts-generator" style={{ color: BLUE, textDecoration: 'none' }}>
                Free AI Shorts generator
              </Link>
            </li>
            <li>
              <Link href="/faceless-channel-ideas" style={{ color: BLUE, textDecoration: 'none' }}>
                Faceless channel ideas
              </Link>
            </li>
            <li>
              <Link href="/pricing" style={{ color: BLUE, textDecoration: 'none' }}>
                Pricing
              </Link>
            </li>
          </ul>
        </section>
      </div>

      {/* ONDA4 #2 (14/08) — no mobile o CTA nascia fora da tela (player 9:16
          empurra tudo para baixo). Barra fixa: a porta de entrada acompanha o
          visitante a pagina inteira. */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          padding: '10px 14px calc(10px + env(safe-area-inset-bottom))',
          background: 'rgba(0,0,0,0.82)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: '1px solid rgba(41,151,255,0.25)',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <PublicVideoCtaLink
          href={signupHref}
          videoId={params.id}
          placement="sticky_bar"
          style={{
            display: 'block',
            width: 'min(420px, 100%)',
            textAlign: 'center',
            background: BLUE,
            color: '#000',
            fontWeight: 900,
            padding: '13px 26px',
            borderRadius: 999,
            textDecoration: 'none',
            fontSize: '1rem',
          }}
        >
          Make one like this — free →
        </PublicVideoCtaLink>
      </div>

      {/* ═══ #291 — KINEO-CTA-ALCANCAVEL-2026-08-23 ═══════════════════════════
          O DENOMINADOR QUE O OBSERVER DE 17/08 FOI BUSCAR (ver a nota longa em
          components/PublicVideoCtaLink.tsx): 234 sessões → 7 cliques → 0 contas.
          Aquele commit instrumentou a pergunta "ela não quis, ou ela nunca
          viu?" e a própria nota já dizia que a geometria era suspeita POR
          CONSTRUÇÃO: acima da primeira CTA existem breadcrumb, H1, subtítulo e
          um player 9:16 que, num telefone de 380px, tem ~675px de altura — a
          CTA começa depois da dobra, sempre.
          Esta barra resolve a geometria sem tocar no conteúdo: fixa no rodapé,
          SÓ no celular (`media (max-width: 768px)`), sempre alcançável com o
          polegar. `placement="sticky_mobile"` mantém a medição separada das
          outras três posições — se ela converter e as outras não, a resposta
          era geometria; se nenhuma converter, era a oferta. A instrumentação
          continua respondendo a pergunta, agora com a variável certa isolada.
          `pb` extra no <main> impede que a barra cubra o último parágrafo. */}
      <style>{`
        .kineo-sticky-cta { display: none; }
        @media (max-width: 768px) {
          .kineo-sticky-cta {
            display: block;
            position: fixed;
            left: 0; right: 0; bottom: 0;
            z-index: 60;
            padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
            background: rgba(0,0,0,0.92);
            backdrop-filter: blur(12px);
            border-top: 1px solid rgba(255,255,255,0.1);
          }
          .kineo-sticky-cta a { width: 100%; text-align: center; }
        }
      `}</style>
      <div className="kineo-sticky-cta">
        <PublicVideoCtaLink
          href={signupHref}
          videoId={params.id}
          placement="sticky_mobile"
          style={{
            display: 'block',
            background: BLUE,
            color: '#000',
            fontWeight: 900,
            padding: '14px 18px',
            borderRadius: 12,
            textDecoration: 'none',
            fontSize: '0.95rem',
          }}
        >
          Make one like this — free →
        </PublicVideoCtaLink>
      </div>
    </main>
  )
}
