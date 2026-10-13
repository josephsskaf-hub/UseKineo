// KINEO-VS-ALTERNATIVAS-1310 — página "alternativa a X" no MESMO molde da /vs/invideo-alternatives-faceless-shorts (a que
// converteu). Texto em lib/growth/vsAlternativeAnswers.ts; fatos do concorrente com fonte em lib/seo/vsAlternatives1310.ts.
import CitationAnswerPage, { citationAnswerMetadata } from '@/components/CitationAnswerPage'
import VsAlternativeComparison, { VsAlternativeFreeCta } from '@/components/VsAlternativeComparison'
import { VS_ALTERNATIVE_ANSWERS } from '@/lib/growth/vsAlternativeAnswers'
import { VS_ALT_REVIEWED_ISO } from '@/lib/seo/vsAlternatives1310'

export const dynamic = 'force-static'
const answer = VS_ALTERNATIVE_ANSWERS.opusclip
export const metadata = citationAnswerMetadata(answer)

export default function Page() {
  return <CitationAnswerPage answer={answer} heroActions={<VsAlternativeFreeCta answer={answer} />} comparisonSection={<VsAlternativeComparison id="opusclip" />} reviewDate={VS_ALT_REVIEWED_ISO} />
}
