import CitationAnswerPage, { citationAnswerMetadata } from '@/components/CitationAnswerPage'
import CitationComparisonDecision from '@/components/CitationComparisonDecision'
import { CITATION_ANSWERS, type CitationAnswer } from '@/lib/growth/citationAnswers'
import { COMPARISON_REVIEW_DATE } from '@/lib/growth/citationComparisonSnapshot'
// KINEO-VISIBILIDADE-CHATGPT-2026-10-06 — a pergunta 11 da rodada 1 ("InVideo alternatives for YouTube Shorts") citou páginas
// com preço por vídeo em tabela e data; esta página, que é a nossa resposta para ela, comparava quatro alternativas e não
// mostrava o próprio InVideo. Entra a linha de base do InVideo (invideo.io/pricing, lido em 06/10) e o preço por Short da
// Kineo por motor (ENGINE_GEO). Não se estima preço por vídeo do InVideo: a página dele não publica crédito por vídeo.
import { money, usd } from '@/lib/seo/engineCitation'
import { HUB_REVIEWED_DAY, INVIDEO_FACTS, hubEngines, hubPlans } from '@/lib/seo/citableHubPages'

export const dynamic = 'force-static'
const original = CITATION_ANSWERS.invideo
const answer: CitationAnswer = {
  ...original,
  description: 'Evaluate Kineo and four other video workflows with dated primary sources, monthly billing and explicit limits.',
  answer: [original.answer[0], 'Pictory, Descript, HeyGen and OpusClip offer different workflows; the sourced comparison below separates monthly prices, free allowances and export limits so you can choose by the material you have.'],
  faqs: original.faqs.map((faq, index) => index === 3 ? {
    ...faq,
    answer: 'No. Pictory supports script/URL-to-video with stock footage; Descript is a text-based editor, HeyGen offers avatar presentations and OpusClip extracts clips from an existing recording. The dated sources in the table distinguish their allowances and unresolved limits.',
  } : faq.answer.startsWith('[CONFIRMAR]') && /InVideo project/.test(faq.question) ? {
    // KINEO-VISIBILIDADE-CHATGPT-2026-10-06 — a tag interna saía crua na FAQ (e no FAQPage JSON-LD). Resposta direta.
    ...faq,
    answer: 'No. Kineo does not import InVideo projects. Start from a text idea or paste your script, and Kineo builds the narrated video from it.',
  } : faq),
}
export const metadata = citationAnswerMetadata(answer)

function InVideoBaseline() {
  const engines = hubEngines()
  const plans = hubPlans()
  const starter = plans[0]
  const iv = INVIDEO_FACTS
  return (
    <section className="kc-section" aria-labelledby="invideo-baseline-heading" data-kineo="invideo-baseline">
      <h2 id="invideo-baseline-heading">InVideo AI and Kineo: price per Short</h2>
      <p>
        {`InVideo AI (checked ${HUB_REVIEWED_DAY}): ${iv.starter.plan} from ${iv.starter.perSeatMonthBilledYearly}/seat/month billed yearly with ${iv.starter.credits} credits (${iv.starter.models}); ${iv.plus.plan} from ${iv.plus.perSeatMonthBilledYearly}/seat/month billed yearly with ${iv.plus.credits} credits (${iv.plus.models}). ${iv.perVideoNote} `}
        <a href={iv.url} rel="nofollow noopener noreferrer">InVideo pricing</a>
      </p>
      <p>
        {`Kineo: ${plans.map((p) => `${p.label} ${money(p.usdCents)}/month (${p.credits} credits)`).join(', ')}, billed monthly, no seats. A finished 60-second Short costs ${engines.map((e) => `${e.geo.rows.film60.credits} credits on ${e.name} (about ${usd(e.geo.rows.film60.usdCents)})`).join(', ')} — so ${starter.label} covers ${Math.floor(starter.credits / engines[0].geo.rows.film60.credits)} 60-second ${engines[0].name} Short a month. Prices as of ${HUB_REVIEWED_DAY}.`}
      </p>
    </section>
  )
}

export default function Page() {
  return <CitationAnswerPage answer={answer} comparisonSection={<><InVideoBaseline /><CitationComparisonDecision /></>} reviewDate={COMPARISON_REVIEW_DATE} />
}
