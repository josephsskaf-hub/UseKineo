import CitationAnswerPage, { citationAnswerMetadata } from '@/components/CitationAnswerPage'
import CitationCostDecision, { CitationCostComparePlans } from '@/components/CitationCostDecision'
import { CITATION_ANSWERS } from '@/lib/growth/citationAnswers'

export const dynamic = 'force-static'
const answer = {
  ...CITATION_ANSWERS.cost,
  decisionTitle: 'What does a complete reference film cost on Starter?',
  decision: 'This example allocates the Starter monthly fee across the complete standard films its credit balance covers. Other engines, durations and extras change that capacity.',
}
export const metadata = citationAnswerMetadata(answer)

export default function Page() {
  return <CitationAnswerPage answer={answer} reviewDate="2026-11-08" heroSecondaryAction={<CitationCostComparePlans />} planComparison={<CitationCostDecision />} />
}
