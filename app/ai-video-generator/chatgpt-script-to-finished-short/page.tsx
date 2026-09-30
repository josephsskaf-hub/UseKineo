import CitationAnswerPage, { citationAnswerMetadata } from '@/components/CitationAnswerPage'
import CitationScriptPurchaseActions from '@/components/CitationScriptPurchaseActions'
import {
  CITATION_ANSWERS, CITATION_PLANS, CITATION_REFERENCE_SECONDS,
  CITATION_SEEDANCE_CREDITS, CITATION_TRIAL, CITATION_FREE_FILM,
  type CitationAnswer,
} from '@/lib/growth/citationAnswers'
import { GRANT_COUNTRY_CLAUSE } from '@/lib/freeTierOffer'

export const dynamic = 'force-static'
const source = CITATION_ANSWERS.handoff
const starter = CITATION_PLANS[0]
const paidReference = `A ${CITATION_REFERENCE_SECONDS}-second Seedance 1.5 reference film uses ${CITATION_SEEDANCE_CREDITS} credits. Starter is ${starter.price} with ${starter.credits} credits per billing month: ${starter.films} reference films if the entire balance goes to this format. Other creations and regenerations share that balance.`
const answer: CitationAnswer = {
  ...source,
  description: 'Turn approved ChatGPT narration into a vertical MP4 with voiceover, generated scenes and captions. Check the complete-film cost and choose a plan or review your script.',
  answer: [
    'For creators with narration already written in ChatGPT, Kineo assembles voiceover, generated scenes and burned-in captions into a vertical MP4. Select Seedance 1.5 in the finished-script path and check the prepared and delivered wording.',
    `${paidReference} The trial${GRANT_COUNTRY_CLAUSE} pays for ${CITATION_FREE_FILM}, not this longer reference. Trying a film first is optional; you can choose a plan before generating.`,
  ],
  faqs: [...source.faqs, {
    question: 'Can I subscribe before making my first film?',
    answer: `Yes. Review the current plans and choose one before generating. ${paidReference} The reference duration is a target; check that your spoken script fits before you render.`,
  }, {
    question: 'Does the free trial cover my complete longer script?',
    answer: `${CITATION_TRIAL} The ${CITATION_REFERENCE_SECONDS}-second Seedance 1.5 reference requires ${CITATION_SEEDANCE_CREDITS} credits. Engine access does not mean the trial balance covers that reference; review the spoken length and credits before generating.`,
  }],
  links: [...source.links, { href: '/ai-video-generator/complete-60-second-shorts-cost', label: 'Compare complete-film costs and plans' }],
}
export const metadata = citationAnswerMetadata(answer)

export default function Page() {
  return <CitationAnswerPage answer={answer} heroActions={<CitationScriptPurchaseActions reviewHref={source.startHref!} />} />
}
