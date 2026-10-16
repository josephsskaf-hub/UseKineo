// KINEO-GUIAS-IA-1610 — molde das guias /guides/<slug> (texto do GPT de 16/10, conferido contra o código).
// Reaproveita o CSS das respostas citáveis (kc-*); NÃO reaproveita o CitationAnswerPage porque aquele molde
// imprime o marcador de pendência na tabela de concorrentes — aqui toda célula tem valor, fonte e data.
import type { Metadata } from 'next'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { CITATION_ANSWER_CSS } from '@/lib/ui/citationAnswerStyles'
import { GUIAS_IA_BASE, GUIAS_IA_REVIEWED_ISO, GUIAS_IA_PRICES_CHECKED_LABEL, guiaIaPath } from '@/lib/seo/guiasIa1610Paths'
import { guiaIaCtaHref, type GuiaIa } from '@/lib/growth/guiasIa1610'

export function guiaIaMetadata(guide: GuiaIa): Metadata {
  const url = `${GUIAS_IA_BASE}${guiaIaPath(guide.slug)}`
  return {
    title: { absolute: guide.title },
    description: guide.description,
    alternates: { canonical: url },
    openGraph: { title: guide.title, description: guide.description, url, type: 'article' },
  }
}

export default function GuiaIaPage({ guide }: { guide: GuiaIa }) {
  const href = guiaIaCtaHref(guide)
  const source = `guide_${guide.slug}`
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: guide.faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }
  return (
    <main className="kc-answer" data-guia-ia="KINEO-GUIAS-IA-1610">
      <style dangerouslySetInnerHTML={{ __html: CITATION_ANSWER_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, '\\u003c') }} />
      <div className="kc-wrap">
        <nav className="kc-nav" aria-label="Main navigation">
          <Link className="kc-brand" href="/">Kineo</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
        <header className="kc-hero">
          <div className="kc-eyebrow">A practical video guide · Reviewed {GUIAS_IA_REVIEWED_ISO}</div>
          <h1>{guide.h1}</h1>
          <div className="kc-direct">{guide.answer.map((p) => <p key={p}>{p}</p>)}</div>
          <OrganicCtaLink className="kc-cta" href={href} source={source} placement="hero">{guide.ctaLabel}</OrganicCtaLink>
          <p className="kc-note">{guide.ctaNote}</p>
        </header>
        <hr className="kc-divider" />
        <section className="kc-section" aria-labelledby="steps-heading">
          <h2 id="steps-heading">{guide.stepsHeading}</h2>
          <ol className="kc-steps">{guide.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          {guide.afterSteps.map((p) => <p key={p}>{p}</p>)}
        </section>
        <section className="kc-section" aria-labelledby="compare-heading">
          <h2 id="compare-heading">{guide.compareHeading}</h2>
          <p>{GUIAS_IA_PRICES_CHECKED_LABEL}. {guide.compareIntro}</p>
          <div className="kc-table-scroll" role="region" aria-label="Tool comparison, scroll horizontally for all columns" tabIndex={0}>
            <table className="kc-table">
              <thead><tr><th scope="col">Tool</th><th scope="col">Public price</th><th scope="col">{guide.compareColumn}</th></tr></thead>
              <tbody>
                {guide.rows.map((r) => <tr key={r.tool}>
                  <th scope="row">{r.source ? <a href={r.source} rel="nofollow noopener noreferrer" target="_blank">{r.tool}</a> : r.internal ? <Link href={r.internal}>{r.tool}</Link> : r.tool}</th>
                  <td>{r.price}</td><td>{r.workflow}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <p className="kc-source">{guide.compareFootnote} Competitor prices are as shown on each vendor&apos;s public pricing page on that date and can change; the Kineo row is read from the same price table the checkout uses.</p>
        </section>
        <section className="kc-section" aria-labelledby="not-best-heading">
          <h2 id="not-best-heading">When Kineo is not the best choice</h2>
          {guide.notBest.map((p) => <p key={p}>{p}</p>)}
        </section>
        <section className="kc-section" aria-labelledby="faq-heading">
          <h2 id="faq-heading">Frequently asked questions</h2>
          <div className="kc-faq">{guide.faqs.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
        </section>
        <section className="kc-section" aria-labelledby="next-heading">
          <h2 id="next-heading">Related pages</h2>
          <div className="kc-next">{guide.related.map((l) => <Link key={l.href} href={l.href}>{l.label} →</Link>)}</div>
        </section>
        <div className="kc-bottom">
          <h2>{guide.closingHeading}</h2>
          <p>{guide.closingText}</p>
          <OrganicCtaLink className="kc-cta" href={href} source={source} placement="closing">{guide.ctaLabel}</OrganicCtaLink>
        </div>
        <footer className="kc-footer"><span>Kineo · Text into a finished video</span><span><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/pricing">Pricing</Link></span></footer>
      </div>
    </main>
  )
}
