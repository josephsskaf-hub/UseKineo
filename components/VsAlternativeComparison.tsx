// KINEO-VS-ALTERNATIVAS-1310 — a seção de comparação das 4 páginas /vs "alternativa a X". Mesmo visual da tabela da página do
// InVideo (classes kc-* de lib/ui/citationAnswerStyles), duas colunas: o concorrente (fato + fonte + data) e a Kineo (números
// das fontes únicas). Fecha com o botão de compra do Creator das "páginas que vendem" (BuyCreatorCta: o WELCOME20 só aparece
// com o interruptor do servidor ligado).
import Link from 'next/link'
import BuyCreatorCta from '@/components/BuyCreatorCta'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import {
  CITATION_CTA, CITATION_PLANS, CITATION_TRIAL, CITATION_WATERMARK, citationSignupHref, type CitationAnswer,
} from '@/lib/growth/citationAnswers'
import { buyCreatorCopy } from '@/lib/growth/buyCreatorOffer'
import { FREE_FILM_LABEL, getFreeTierOffer } from '@/lib/freeTierOffer'
import { dayMonthYear } from '@/lib/seo/engineCitation'
import { VS_ALT_REVIEWED_ISO, VS_COMPETITORS, type VsAlternativeId, type VsSourcedFact } from '@/lib/seo/vsAlternatives1310'

/** O botão grátis da primeira dobra: o MESMO destino e a MESMA campanha da página do InVideo (citationSignupHref →
 *  /signup?redirect=…&intent_campaign=citacoes_01_<id>, OrganicCtaLink source citacoes_01_<id>). Só o rótulo diz o que a
 *  pessoa ganha; se a entrada voltar a ser a porta paga (cardEntry), volta o rótulo canônico da oferta — "free" sumiria. */
export function VsAlternativeFreeCta({ answer }: { answer: CitationAnswer }) {
  const label = getFreeTierOffer().cardEntry ? CITATION_CTA : 'Make your first film free →'
  return <OrganicCtaLink className="kc-cta" href={citationSignupHref(answer)} source={`citacoes_01_${answer.id}`} placement="hero">{label}</OrganicCtaLink>
}

function Sourced({ fact }: { fact: VsSourcedFact }) {
  return <>{fact.text}<span className="kc-source"><br /><a href={fact.url} rel="nofollow noopener noreferrer">{fact.label}</a> ({fact.checkedOn})</span></>
}

export default function VsAlternativeComparison({ id }: { id: VsAlternativeId }) {
  const c = VS_COMPETITORS[id]
  const creator = buyCreatorCopy('en')
  const [starter, creatorPlan] = CITATION_PLANS
  const rows: { label: string; them: VsSourcedFact; kineo: string }[] = [
    { label: 'What you start with', them: c.start, kineo: 'One idea, or narration you paste. No footage, article or presenter needed.' },
    { label: 'What you get', them: c.output, kineo: 'A finished vertical film: narration, generated scenes and burned-in captions, delivered as an MP4.' },
    { label: 'Monthly entry price', them: c.price, kineo: `${starter.name} ${starter.price} (${starter.credits} credits). ${creatorPlan.name}: ${creator.priceLine} (${creatorPlan.credits} credits). Billed monthly.` },
    { label: 'Free option', them: c.free, kineo: `${CITATION_TRIAL} ${CITATION_WATERMARK}` },
  ]
  return <section className="kc-section" aria-labelledby="comparison-heading" data-kineo="vs-alternative-comparison" data-vs-alternative={id}>
    <h2 id="comparison-heading">{c.name} and Kineo, side by side</h2>
    <p>The two tools start from different material. Compare the starting point first, then the price; a tool built for another input is not a cheaper or dearer version of the same job.</p>
    <p className="kc-source">{c.name} facts read on its own pages on {dayMonthYear(VS_ALT_REVIEWED_ISO)}; prices use monthly billing. A fact we could not confirm is left out, not guessed. Kineo figures come from the <Link href="/llms.txt">public fact sheet</Link> and <Link href="/pricing">current plans</Link>; Brazilian customers pay in reais.</p>
    <div className="kc-table-scroll" role="region" aria-label={`${c.name} and Kineo comparison, scroll horizontally for all columns`} tabIndex={0}>
      <table className="kc-table">
        <caption>{c.name} and Kineo · sources checked {VS_ALT_REVIEWED_ISO}</caption>
        <thead><tr><th scope="col">&nbsp;</th><th scope="col">{c.name}</th><th scope="col">Kineo</th></tr></thead>
        <tbody>
          {rows.map((row) => <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td><Sourced fact={row.them} /></td>
            <td>{row.kineo}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <p className="kc-note">Your first Kineo film is a {FREE_FILM_LABEL}. When you want clean downloads and longer films, Creator is the monthly plan below; cancel anytime.</p>
    <BuyCreatorCta page={`vs_${id}_alternatives`} align="left" />
  </section>
}
