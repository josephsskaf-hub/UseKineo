// KINEO-VS-RIVAIS-0311 — as seções das páginas "alternativa a X" dos rivais do mesmo porte. Mesmo visual das irmãs (classes
// kc-* de lib/ui/citationAnswerStyles): a primeira dobra com o carimbo "Checked November 2026", a tabela de duas colunas (o rival
// com fato + fonte + data; a Kineo com os números das fontes únicas) e os preços lado a lado. O JSON-LD de data vive aqui:
// dateModified é o dia da leitura, nunca a hora do build, que afirmaria um frescor não conquistado.
import Link from 'next/link'
import BuyCreatorCta from '@/components/BuyCreatorCta'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { CITATION_BASE, CITATION_CTA, CITATION_PLANS, CITATION_REFERENCE_SECONDS, CITATION_TRIAL, CITATION_WATERMARK, type CitationAnswer } from '@/lib/growth/citationAnswers'
import { KINEO_FREE_FILM_LINE, KINEO_REFERENCE_COSTS, KINEO_ROWS } from '@/lib/growth/vsRivaisAnswers'
import { getFreeTierOffer } from '@/lib/freeTierOffer'
import { dayMonthYear } from '@/lib/seo/engineCitation'
import { VS_RIVAIS_CHECKED_ISO, VS_RIVAIS_CHECKED_LABEL, VS_RIVALS, VS_RIVAL_PAGES, type VsRivalFact, type VsRivalId } from '@/lib/seo/vsRivais0311'

function Sourced({ fact }: { fact: VsRivalFact }) {
  return <>{fact.text}<span className="kc-source"><br /><a href={fact.url} rel="nofollow noopener noreferrer">{fact.label}</a> ({fact.checkedOn})</span></>
}

/** Os fatos da página, sem repetir URL: viram `citation` no JSON-LD. */
function factUrls(id: VsRivalId): string[] {
  const c = VS_RIVALS[id]
  return Array.from(new Set([c.start, c.output, c.visuals, c.publish, c.price, c.plans, c.free].map((f) => f.url)))
}

/** A primeira dobra: o botão grátis com a campanha da página, o carimbo visível e o JSON-LD com as datas. */
export function VsRivalHero({ id, answer }: { id: VsRivalId; answer: CitationAnswer }) {
  const c = VS_RIVALS[id]
  const url = `${CITATION_BASE}${VS_RIVAL_PAGES[id].path}`
  const label = getFreeTierOffer().cardEntry ? CITATION_CTA : 'Make your first film free →'
  const page = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': url,
    url,
    name: answer.question,
    description: answer.description,
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: 'Kineo', url: CITATION_BASE },
    about: [{ '@type': 'SoftwareApplication', name: c.name, url: c.homepage }, { '@type': 'SoftwareApplication', name: 'Kineo', url: CITATION_BASE }],
    datePublished: VS_RIVAIS_CHECKED_ISO,
    dateModified: VS_RIVAIS_CHECKED_ISO,
    publisher: { '@type': 'Organization', name: 'Kineo', url: CITATION_BASE },
    citation: factUrls(id),
  }
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: CITATION_BASE },
      { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${CITATION_BASE}/vs` },
      { '@type': 'ListItem', position: 3, name: VS_RIVAL_PAGES[id].label, item: url },
    ],
  }
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(page).replace(/</g, '\\u003c') }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
    <OrganicCtaLink className="kc-cta" href={answer.startHref ?? '/signup'} source={answer.ctaSource ?? `seo_vs_${id}`} placement="hero">{label}</OrganicCtaLink>
    <p className="kc-source" data-vs-rival-checked={id}>{VS_RIVAIS_CHECKED_LABEL}: {c.name} facts were read on its own pages on {dayMonthYear(VS_RIVAIS_CHECKED_ISO)} and are linked next to each one.</p>
  </>
}

/** A tabela (entra logo abaixo da decisão, antes do "When to choose"). */
export default function VsRivalComparison({ id }: { id: VsRivalId }) {
  const c = VS_RIVALS[id]
  const rows: { label: string; them: VsRivalFact; kineo: string }[] = [
    { label: 'What you start with', them: c.start, kineo: KINEO_ROWS.start },
    { label: 'What you get', them: c.output, kineo: KINEO_ROWS.output },
    { label: 'Visuals and models', them: c.visuals, kineo: KINEO_ROWS.visuals },
    { label: 'Publishing', them: c.publish, kineo: KINEO_ROWS.publish },
    { label: 'Monthly entry price', them: c.price, kineo: KINEO_ROWS.price },
    { label: 'Free option', them: c.free, kineo: `${CITATION_TRIAL} ${CITATION_WATERMARK}` },
  ]
  return <div data-kineo="vs-rival-comparison" data-vs-rival={id}>
    <p className="kc-source">{VS_RIVAIS_CHECKED_LABEL}. Prices use monthly billing unless stated. A fact we could not confirm on {c.name}’s own pages is left out, not guessed; vendors change tiers, so confirm before you pay. Kineo figures come from the <Link href="/llms.txt">public fact sheet</Link> and <Link href="/pricing">current plans</Link>.</p>
    <div className="kc-table-scroll" role="region" aria-label={`${c.name} and Kineo comparison, scroll horizontally for all columns`} tabIndex={0}>
      <table className="kc-table">
        <caption>{c.name} and Kineo · sources checked {VS_RIVAIS_CHECKED_ISO}</caption>
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
  </div>
}

/** Os preços lado a lado (o último antes de "How Kineo does it"). Fecha com o botão de compra do Creator das irmãs. */
export function VsRivalPricing({ id }: { id: VsRivalId }) {
  const c = VS_RIVALS[id]
  return <section className="kc-section" aria-labelledby="pricing-heading" data-kineo="vs-rival-pricing" data-vs-rival={id}>
    <h2 id="pricing-heading">Pricing compared</h2>
    <p>The two tools sell different units, so a lower monthly number is not automatically a cheaper film. Compare what you would actually make in a month.</p>
    <div className="kc-table-scroll" role="region" aria-label={`${c.name} and Kineo pricing, scroll horizontally for all columns`} tabIndex={0}>
      <table className="kc-table">
        <caption>Published plans · sources checked {VS_RIVAIS_CHECKED_ISO}</caption>
        <thead><tr><th scope="col">{c.name}</th><th scope="col">Kineo</th></tr></thead>
        <tbody>
          <tr>
            <td><Sourced fact={c.plans} /></td>
            <td>{CITATION_PLANS.map((plan) => `${plan.name}: ${plan.price}, ${plan.credits} credits a month.`).join(' ')} A finished {CITATION_REFERENCE_SECONDS}-second film uses {KINEO_REFERENCE_COSTS}. Credits refresh monthly and do not roll over.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p className="kc-note">On Kineo, {KINEO_FREE_FILM_LINE}. When you want clean downloads and longer films, Creator is the monthly plan below; cancel anytime.</p>
    <BuyCreatorCta page={`vs_${id}_alternative`} align="left" />
  </section>
}
