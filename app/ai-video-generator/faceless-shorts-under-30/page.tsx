import CitationAnswerPage, { citationAnswerMetadata } from '@/components/CitationAnswerPage'
import { CITATION_ANSWERS } from '@/lib/growth/citationAnswers'

export const dynamic = 'force-static'
const answer = CITATION_ANSWERS.budget
export const metadata = citationAnswerMetadata(answer)

export default function Page() {
  return <CitationAnswerPage answer={answer} />
}
