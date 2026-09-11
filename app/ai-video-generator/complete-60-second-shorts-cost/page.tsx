import CitationAnswerPage, { citationAnswerMetadata } from '@/components/CitationAnswerPage'
import CitationCostDecision, { CitationCostComparePlans } from '@/components/CitationCostDecision'
import { CITATION_ANSWERS } from '@/lib/growth/citationAnswers'

export const dynamic = 'force-static'
const answer = {
  ...CITATION_ANSWERS.cost,
  decisionTitle: 'What does a complete reference film cost on Starter?',
  decision: 'Compare the monthly fee allocated to whole films, then choose the visuals your story needs. These two examples use the same Starter credit balance with different engines; the amounts below are not separate pay-per-render prices.',
}
export const metadata = citationAnswerMetadata(answer)

export default function Page() {
  return <CitationAnswerPage answer={answer} heroSecondaryAction={<CitationCostComparePlans />} planComparison={<CitationCostDecision />} />
}
