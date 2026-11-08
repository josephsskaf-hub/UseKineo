import CitationAnswerPage, { citationAnswerMetadata } from '@/components/CitationAnswerPage'
import CitationCostDecision, { CitationCostComparePlans } from '@/components/CitationCostDecision'
import { CITATION_ANSWERS } from '@/lib/growth/citationAnswers'
import Link from 'next/link'

export const dynamic = 'force-static'
const answer = {
  ...CITATION_ANSWERS.cost,
  decisionTitle: 'What does a complete reference film cost on Starter?',
  decision: 'This example allocates the Starter monthly fee across the complete standard films its credit balance covers. Other engines, durations and extras change that capacity.',
}
export const metadata = citationAnswerMetadata(answer)

export default function Page() {
  return <CitationAnswerPage
    answer={answer}
    reviewDate="2026-11-08"
    heroSecondaryAction={<CitationCostComparePlans />}
    planComparison={<CitationCostDecision />}
    comparisonSection={<section className="kc-section" aria-labelledby="standard-film-limits">
      <h2 id="standard-film-limits">Limits of the standard film workflow</h2>
      <p>{answer.engineSummary}</p>
      <p>Generated faces, hands, text and continuity can need another attempt. Character identity and exact product reproduction can vary between scenes. Review the delivered film before publishing.</p>
      <p>The workflow adds narration over generated scenes. Lip-synced dialogue, a fixed completion time and audience results are not guaranteed.</p>
      <Link href="/models-pricing">Review current engines and credit costs →</Link>
    </section>}
  />
}
