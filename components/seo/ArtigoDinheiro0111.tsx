// KINEO-PAGINAS-IA-0111 — molde dos 2 artigos de dinheiro para o Bing (/when-does-youtube-pay-you e
// /youtube-shorts-revenue-sharing-explained). O Bing manda gente para artigo de dinheiro (/how-much-do-youtube-shorts-pay: 96
// visitas em 14 d); estes respondem as perguntas vizinhas com a resposta direta logo abaixo do H1, uma tabela em que cada número
// leva a sua fonte OFICIAL (YouTube/AdSense Help) com data de leitura, e o CTA para o Studio. Preço da Kineo só de
// lib/marketingPrice; o filme grátis de lib/freeTierOffer. Nenhuma promessa de monetização.
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { PaginaClaraTopo } from '@/components/seo/PaginaClara'
import { PAGINA_CLARA_CLASSE, PAGINA_CLARA_FUNDO } from '@/lib/seo/paginasIaClaras2110'
import { FREE_FILM_LABEL } from '@/lib/freeTierOffer'
import { STARTER_MONTH } from '@/lib/marketingPrice'
import { getMoneyArticle0111, PAGINAS_IA_0111_REVIEWED_ISO } from '@/lib/seo/paginasIa0111'

const BASE = 'https://www.usekineo.com'
const CARD = { background: '#FFFFFF', border: '1px solid #E4E4E0', borderRadius: 14 } as const
const REVIEWED_LABEL = new Date(`${PAGINAS_IA_0111_REVIEWED_ISO}T12:00:00.000Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

export function artigoDinheiroMetadata(path: string): Metadata {
  const a = getMoneyArticle0111(path)
  const url = `${BASE}${a.path}`
  return {
    metadataBase: new URL(BASE),
    title: a.title,
    description: a.description,
    alternates: { canonical: url },
    openGraph: { title: a.title, description: a.description, url, type: 'article' },
    twitter: { card: 'summary_large_image', title: a.title, description: a.description },
  }
}

/** Studio com a ideia na caixa; sem motor e sem duração cravados: o Studio escolhe o que o saldo paga (o trial abre no filme grátis). */
function studioHref(path: string, prompt: string): string {
  const campaign = `money_${path.replace(/^\//, '')}`.slice(0, 100)
  const studio = new URLSearchParams({ prompt, script_mode: 'ai', intent_campaign: campaign })
  const signup = new URLSearchParams({ utm_campaign: campaign, intent_campaign: campaign, redirect: `/studio?${studio.toString()}` })
  return `/signup?${signup.toString()}`
}

export default function ArtigoDinheiro0111({ path }: { path: string }) {
  const a = getMoneyArticle0111(path)
  const url = `${BASE}${a.path}`
  const campaign = `money_${a.path.replace(/^\//, '')}`
  const cta = studioHref(a.path, a.studioPrompt)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: a.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kineo', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: a.h1, item: url },
    ],
  }
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    datePublished: PAGINAS_IA_0111_REVIEWED_ISO,
    dateModified: PAGINAS_IA_0111_REVIEWED_ISO,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'Kineo', url: BASE },
    publisher: { '@type': 'Organization', name: 'Kineo', url: BASE },
    citation: a.sources.map((s) => s.url),
  }
  const ld = (o: unknown) => ({ __html: JSON.stringify(o).replace(/</g, '\\u003c') })

  return (
    <main className={PAGINA_CLARA_CLASSE} style={{ minHeight: '100vh', background: PAGINA_CLARA_FUNDO, color: '#0E1116', fontFamily: 'var(--font-sans), Arial, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(faqJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(breadcrumbJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(articleJsonLd)} />
      <PaginaClaraTopo />
      <article style={{ maxWidth: 780, margin: '0 auto', padding: '28px 18px 64px' }}>
        <nav aria-label="Breadcrumb" style={{ color: '#5A5F67', fontSize: 13 }}>
          <Link href="/" style={{ color: '#0A5CFF', fontWeight: 800, textDecoration: 'none' }}>Kineo</Link>
          <span aria-hidden> / </span>
          <span>Creator money</span>
        </nav>

        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 650, lineHeight: 1.15, margin: '22px 0 0' }}>{a.h1}</h1>
        <p data-kineo="resposta-direta" style={{ fontSize: '1.05rem', color: '#2A2F37', lineHeight: 1.65, margin: '16px 0 0' }}>{a.answer}</p>
        <p style={{ fontSize: '0.8rem', color: '#5A5F67', margin: '10px 0 0' }}>
          Checked against YouTube’s and AdSense’s own help pages on {REVIEWED_LABEL}. Sources are linked next to each number.
        </p>

        <section style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 650, margin: '0 0 12px' }}>The numbers, with sources</h2>
          <div style={{ ...CARD, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
              <tbody>
                {a.rows.map((r) => (
                  <tr key={r.label} style={{ borderTop: '1px solid #EEEEEA' }}>
                    <th scope="row" style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, verticalAlign: 'top', width: '38%' }}>{r.label}</th>
                    <td style={{ padding: '12px 14px', color: '#2A2F37', verticalAlign: 'top' }}>
                      {r.value}{' '}
                      <a href={r.source.url} rel="noopener" target="_blank" style={{ color: '#0A5CFF', fontSize: '0.8rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>source ↗</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {a.sections.map((s) => (
          <section key={s.h2} style={{ marginTop: 34 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 650, margin: '0 0 12px' }}>{s.h2}</h2>
            {s.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} style={{ color: '#2A2F37', fontSize: '0.98rem', lineHeight: 1.7, margin: '0 0 12px' }}>{p}</p>
            ))}
          </section>
        ))}

        <section style={{ marginTop: 34, ...CARD, padding: '22px 20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 650, margin: 0 }}>Make the Shorts first</h2>
          <p style={{ color: '#2A2F37', margin: '8px 0 16px', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Kineo turns one idea or your own script into a finished vertical Short — script, AI voice, scenes and captions. Start with a {FREE_FILM_LABEL}, no card; plans start at {STARTER_MONTH}. Whether a channel earns is always YouTube’s decision.
          </p>
          <OrganicCtaLink href={cta} source={campaign} placement="article" style={{ display: 'inline-block', background: '#0A5CFF', color: '#fff', fontWeight: 750, padding: '14px 28px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}>
            Make my first Short free →
          </OrganicCtaLink>
        </section>

        <section style={{ marginTop: 34 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 650, margin: '0 0 12px' }}>Questions</h2>
          {a.faq.map((f) => (
            <details key={f.q} style={{ ...CARD, padding: '12px 16px', marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 800 }}>{f.q}</summary>
              <p style={{ margin: '8px 0 0', color: '#2A2F37', lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </section>

        <section style={{ marginTop: 30 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 650, color: '#5A5F67', margin: '0 0 8px' }}>Sources (official, read {REVIEWED_LABEL})</h2>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, fontSize: '0.88rem' }}>
            {a.sources.map((s) => (
              <li key={s.url}><a href={s.url} rel="noopener" target="_blank" style={{ color: '#0A5CFF', textDecoration: 'none' }}>{s.label}</a></li>
            ))}
          </ul>
          <p style={{ marginTop: 18, fontSize: '0.88rem', color: '#2A2F37' }}>
            Related:{' '}
            {a.related.map((r, i) => (
              <span key={r.href}>{i > 0 && ' · '}<Link href={r.href} style={{ color: '#0A5CFF', textDecoration: 'none', fontWeight: 700 }}>{r.label}</Link></span>
            ))}
          </p>
        </section>
      </article>
      <Footer showStats={false} />
    </main>
  )
}
