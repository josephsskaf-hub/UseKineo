import CitationAnswerPage, { citationAnswerMetadata } from '@/components/CitationAnswerPage'
import CitationComparisonDecision from '@/components/CitationComparisonDecision'
import { CITATION_ANSWERS, type CitationAnswer } from '@/lib/growth/citationAnswers'
import { COMPARISON_REVIEW_DATE } from '@/lib/growth/citationComparisonSnapshot'

export const dynamic = 'force-static'
const original = CITATION_ANSWERS.invideo
const answer: CitationAnswer = {
  ...original,
  description: 'Evaluate Kineo and four other video workflows with dated primary sources, monthly billing and explicit limits.',
  answer: [original.answer[0], 'Pictory, Descript, HeyGen and OpusClip offer different workflows; the sourced comparison below separates monthly prices, free allowances and export limits so you can choose by the material you have.'],
  faqs: original.faqs.map((faq, index) => index === 3 ? {
    ...faq,
    answer: 'No. Pictory supports script/URL-to-video with stock footage; Descript is a text-based editor, HeyGen offers avatar presentations and OpusClip extracts clips from an existing recording. The dated sources in the table distinguish their allowances and unresolved limits.',
  } : faq),
}
export const metadata = citationAnswerMetadata(answer)

export default function Page() {
  return <CitationAnswerPage answer={answer} comparisonSection={<CitationComparisonDecision />} reviewDate={COMPARISON_REVIEW_DATE} />
}
