import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { CITATION_PLANS, CITATION_TRIAL, CITATION_WATERMARK, CITATION_REFERENCE_SECONDS } from '@/lib/growth/citationAnswers'
import {
  COMPARISON_CAMPAIGN, COMPARISON_REVIEW_DATE, COMPARISON_PROVIDERS,
  type ComparisonFact,
} from '@/lib/growth/citationComparisonSnapshot'

function SourcedFact({ fact }: { fact: ComparisonFact }) {
  return <>
    {fact.text.split(/(\[CONFIRMAR\])/).map((part, index) => part === '[CONFIRMAR]' ? <span className="kc-unknown" key={index}>{part}</span> : part)}
    <span className="kc-source"><br />{fact.sources.map((source, index) => <span key={source.url}>{index > 0 ? ' · ' : ''}<a href={source.url} rel="noopener noreferrer">{source.label}</a> ({source.checkedOn})</span>)}</span>
  </>
}

export function CitationComparisonPlans() {
  return <OrganicCtaLink className="kc-cta" href={`/pricing?intent_campaign=${COMPARISON_CAMPAIGN}`} source={COMPARISON_CAMPAIGN} placement="comparison_plans">Compare Kineo plans</OrganicCtaLink>
}

export default function CitationComparisonDecision() {
  return <section className="kc-section" aria-labelledby="comparison-heading" data-comparison-version={COMPARISON_CAMPAIGN}>
    <h2 id="comparison-heading">Compare the workflow and its limits</h2>
    <p>Start with the material you have: a script, an existing recording or an avatar presentation. The same monthly fee can buy different workflows and allowances; this table does not rank one tool as best for every task.</p>
    <p className="kc-source">Provider sources checked {COMPARISON_REVIEW_DATE}. Prices below use monthly billing in USD, not annual-plan equivalents. [CONFIRMAR] identifies an unverified limit or conflicting source, not a missing feature. Brazilian Kineo customers pay in reais.</p>
    <div className="kc-table-scroll" role="region" aria-label="Video tool comparison, scroll horizontally for all columns" tabIndex={0}>
      <table className="kc-table">
        <caption>Kineo and four alternatives · sources and limits checked {COMPARISON_REVIEW_DATE}</caption>
        <thead><tr><th scope="col">Tool / workflow</th><th scope="col">Monthly entry price</th><th scope="col">Free trial</th><th scope="col">Engines</th><th scope="col">Maximum duration</th><th scope="col">Watermark</th></tr></thead>
        <tbody>
          <tr><th scope="row">Kineo<small>Text to a finished narrated video</small><small><Link href="/llms.txt">Public fact sheet</Link> ({COMPARISON_REVIEW_DATE})</small></th><td>{CITATION_PLANS[0].price}<div className="kc-source">{CITATION_PLANS[0].name} · <Link href="/pricing">Current plans</Link></div></td><td>{CITATION_TRIAL}</td><td>Kineo 1 stock footage; Seedance 1.5 generated scenes; further engines available subject to sufficient credits</td><td><span className="kc-unknown">[CONFIRMAR]</span><br />A {CITATION_REFERENCE_SECONDS}-second cost reference is not a maximum duration.</td><td>{CITATION_WATERMARK}</td></tr>
          {COMPARISON_PROVIDERS.map((provider) => <tr key={provider.name}>
            <th scope="row">{provider.name}<small><SourcedFact fact={provider.workflow} /></small></th>
            {(['price', 'trial', 'engines', 'duration', 'watermark'] as const).map((field) => <td key={field}><SourcedFact fact={provider[field]} /></td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
    <CitationComparisonPlans />
    <p className="kc-note">Choose the workflow before comparing allowances. Monthly processing minutes, upload limits and clip-length presets do not establish a maximum finished-video duration.</p>
  </section>
}
