// KINEO-VS-NOVOS-1610 — página "alternativa a X" no MESMO molde das irmãs de 13/10 (CitationAnswerPage + tabela com fonte).
// Texto em lib/growth/vsAlternativeAnswers.ts (VS_NOVOS_ANSWERS); fatos do concorrente com fonte e data em lib/seo/vsNovos1610.ts.
import CitationAnswerPage, { citationAnswerMetadata } from '@/components/CitationAnswerPage'
import VsAlternativeComparison, { VsAlternativeFreeCta } from '@/components/VsAlternativeComparison'
import { VS_NOVOS_ANSWERS } from '@/lib/growth/vsAlternativeAnswers'
import { VS_NOVOS_REVIEWED_ISO } from '@/lib/seo/vsNovos1610'

export const dynamic = 'force-static'
const answer = VS_NOVOS_ANSWERS.flow
export const metadata = citationAnswerMetadata(answer)

export default function Page() {
  return <CitationAnswerPage answer={answer} heroActions={<VsAlternativeFreeCta answer={answer} />} comparisonSection={<VsAlternativeComparison id="flow" />} reviewDate={VS_NOVOS_REVIEWED_ISO} />
}
