import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { PUBLIC_EXAMPLES } from '@/lib/publicExamples'
import { CITATION_ANSWER_CSS } from '@/lib/ui/citationAnswerStyles'
import {
  CITATION_BASE, CITATION_REVIEW_DATE, CITATION_CTA, CITATION_TRIAL,
  CITATION_WATERMARK, CITATION_TIME, CITATION_PLANS, CITATION_COMPETITORS,
  CITATION_REFERENCE_SECONDS, CITATION_FAST_CREDITS, CITATION_SEEDANCE_CREDITS,
  citationSignupHref, type CitationAnswer,
} from '@/lib/growth/citationAnswers'

export function citationAnswerMetadata(answer: CitationAnswer): Metadata {
  return {
    title: `${answer.label} | Kineo`,
    description: answer.description,
    alternates: { canonical: `${CITATION_BASE}${answer.path}` },
    openGraph: { title: answer.question, description: answer.description, url: `${CITATION_BASE}${answer.path}`, type: 'article' },
  }
}

export default function CitationAnswerPage({ answer, heroSecondaryAction, planComparison }: {
  answer: CitationAnswer
  heroSecondaryAction?: ReactNode
  planComparison?: ReactNode
}) {
  // Only an existing, founder-owned allowlisted example. No customer query,
  // new render, autoplay or background video download belongs on this page.
  const example = PUBLIC_EXAMPLES[0]
  const signupHref = citationSignupHref(answer)
  const competitors = answer.comparisonCandidates ?? CITATION_COMPETITORS
  const trialCta = <OrganicCtaLink className="kc-cta" href={signupHref} source={`citacoes_01_${answer.id}`} placement="hero">{CITATION_CTA}</OrganicCtaLink>
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: answer.faqs.map(({ question, answer: text }) => ({
      '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text },
    })),
  }
  return (
    <main className="kc-answer" data-citacoes-version="citacoes_01_20260910">
      <style dangerouslySetInnerHTML={{ __html: CITATION_ANSWER_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, '\\u003c') }} />
      <div className="kc-wrap">
        <nav className="kc-nav" aria-label="Main navigation">
          <Link className="kc-brand" href="/">Kineo</Link>
          <Link href="/ai-video-generator">Engines & video guides</Link>
        </nav>
        <header className="kc-hero">
          <div className="kc-eyebrow">A practical video guide · Reviewed {CITATION_REVIEW_DATE}</div>
          <h1>{answer.question}</h1>
          <div className="kc-direct">{answer.answer.map((sentence) => <p key={sentence}>{sentence}</p>)}</div>
          {heroSecondaryAction ? <div className="kccd-actions">{trialCta}{heroSecondaryAction}</div> : trialCta}
          <p className="kc-note">Trial videos are watermarked. A paid plan unlocks clean downloads.</p>
        </header>
        <hr className="kc-divider" />
        <section className="kc-section" aria-labelledby="decision-heading">
          <h2 id="decision-heading">{answer.decisionTitle}</h2>
          <p>{answer.decision}</p>
          {planComparison ?? <><div className="kc-plans">
            {CITATION_PLANS.map((plan) => <div className="kc-plan" key={plan.name}>
              <h3>{plan.name}</h3><strong>{plan.price}</strong>
              <p>{plan.credits} credits per billing month</p>
              <small>{plan.films} Kineo 1 reference videos if all credits go to that engine</small>
            </div>)}
          </div>
          <p className="kc-note">Reference: {CITATION_REFERENCE_SECONDS} seconds per video. Counts are alternatives by plan, not combined allowances. Brazilian customers pay in reais at checkout.</p></>}
        </section>
        {answer.checks?.map((check) => <section className="kc-section" key={check.heading}>
          <h2>{check.heading}</h2>
          <ol className="kc-steps">{check.items.map((item) => <li key={item}>{item}</li>)}</ol>
        </section>)}
        <section className="kc-section" aria-labelledby="comparison-heading">
          <h2 id="comparison-heading">Compare the workflow and its limits</h2>
          <p>Compare the starting point as well as the finished output. The four other tools' current price and export limits are not confirmed in this guide; [CONFIRMAR] means the field needs verification, not that the feature is absent.</p>
          <div className="kc-table-scroll" role="region" aria-label="Video tool comparison, scroll horizontally for all columns" tabIndex={0}>
            <table className="kc-table">
              <caption>Four competitors and Kineo · unknown limits are stated explicitly</caption>
              <thead><tr><th scope="col">Tool / workflow</th><th scope="col">Monthly entry price</th><th scope="col">Free trial</th><th scope="col">Engines</th><th scope="col">Maximum duration</th><th scope="col">Watermark</th></tr></thead>
              <tbody>
                <tr><th scope="row">Kineo<small>Text to a finished narrated video</small></th><td>{CITATION_PLANS[0].price}</td><td>{CITATION_TRIAL}</td><td>Kineo 1 stock footage; Seedance 1.5 generated scenes; further engines available subject to sufficient credits</td><td><span className="kc-unknown">[CONFIRMAR]</span><br />Costs here use a {CITATION_REFERENCE_SECONDS}-second reference, not a maximum.</td><td>{CITATION_WATERMARK}</td></tr>
                {competitors.map((competitor) => <tr key={competitor.name}>
                  <th scope="row"><a href={competitor.source} rel="noopener noreferrer">{competitor.name}</a><small>{competitor.kind}</small></th>
                  {['price', 'trial', 'engines', 'duration', 'watermark'].map((field) => <td key={field}><span className="kc-unknown">[CONFIRMAR]</span></td>)}
                </tr>)}
              </tbody>
            </table>
          </div>
          <p className="kc-source">Kineo source: <Link href="/llms.txt">the public fact sheet</Link>, reviewed {CITATION_REVIEW_DATE}. Provider links identify comparison candidates; their presence does not verify a feature or allowance. The current values marked [CONFIRMAR] still need verification at the provider before a purchase decision.</p>
        </section>
        <section className="kc-section" aria-labelledby="workflow-heading">
          <h2 id="workflow-heading">How Kineo does it</h2>
          <div className="kc-workflow">
            <div>
              <ol className="kc-steps">{answer.workflow.map((step) => <li key={step}>{step}</li>)}</ol>
              <p className="kc-time"><strong>Render time:</strong> {CITATION_TIME}</p>
              <p className="kc-note">One {CITATION_REFERENCE_SECONDS}-second reference: Kineo 1, {CITATION_FAST_CREDITS} credits; Seedance 1.5, {CITATION_SEEDANCE_CREDITS} credits. Different engines and durations change the cost.</p>
            </div>
            <figure className="kc-proof">
              <Link href={`/examples/${example.slug}`} aria-label={`View existing public example: ${example.shortTitle}`}>
                <Image src={example.posterPath} width={270} height={480} alt={`Poster from the existing public Kineo example, ${example.shortTitle}`} />
              </Link>
              <figcaption><strong>See an existing public example</strong><br />{example.shortTitle}: a {example.previewDurationSeconds}-second preview from a {example.outputDurationSeconds}-second Short. This is an existing sample, not a render made for this guide.</figcaption>
            </figure>
          </div>
        </section>
        <section className="kc-section" aria-labelledby="faq-heading">
          <h2 id="faq-heading">Frequently asked questions</h2>
          <div className="kc-faq">{answer.faqs.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
        </section>
        <section className="kc-section" aria-labelledby="next-heading">
          <h2 id="next-heading">Choose your next step</h2>
          <div className="kc-next">{answer.links.map((link) => <Link key={link.href} href={link.href}>{link.label} →</Link>)}</div>
        </section>
        <div className="kc-bottom">
          <OrganicCtaLink className="kc-cta" href={signupHref} source={`citacoes_01_${answer.id}`} placement="closing">{CITATION_CTA}</OrganicCtaLink>
          <p>{CITATION_TRIAL} {CITATION_WATERMARK}</p>
        </div>
        <footer className="kc-footer"><span>Kineo · Text into a finished video</span><span><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/pricing">Pricing</Link></span></footer>
      </div>
    </main>
  )
}
