// KINEO-VS-RIVAIS-0311 — página "alternativa a X" no MESMO molde das irmãs (CitationAnswerPage + tabela com fonte e data).
// Texto em lib/growth/vsRivaisAnswers.ts; fatos do concorrente com fonte e data em lib/seo/vsRivais0311.ts.
import CitationAnswerPage, { citationAnswerMetadata } from '@/components/CitationAnswerPage'
import VsRivalComparison, { VsRivalHero, VsRivalPricing } from '@/components/VsRivalComparison'
import { VS_RIVAL_ANSWERS } from '@/lib/growth/vsRivaisAnswers'
import { VS_RIVAIS_CHECKED_ISO } from '@/lib/seo/vsRivais0311'

export const dynamic = 'force-static'
const answer = VS_RIVAL_ANSWERS.fliki
export const metadata = citationAnswerMetadata(answer)

export default function Page() {
  return <CitationAnswerPage answer={answer} heroActions={<VsRivalHero id="fliki" answer={answer} />} planComparison={<VsRivalComparison id="fliki" />} comparisonSection={<VsRivalPricing id="fliki" />} reviewDate={VS_RIVAIS_CHECKED_ISO} />
}
