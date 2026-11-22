import { BUYER_2011, BUYER_REVIEW_DATE_2011, type BuyerPage2011, type BuyerKind2011 } from '@/lib/seo/buyerAnswers2011'

const css = `
.buyer2011{--b-bg:#fff;--b-text:#0e1116;--b-muted:#4d535c;--b-line:#d5d9e1;--b-head:#eef3ff;text-align:left;color:var(--b-text);font-size:16px;line-height:1.6}
html[data-theme=dark] .buyer2011{--b-bg:#151a23;--b-text:#f2f4f7;--b-muted:#b7c0cf;--b-line:#394457;--b-head:#202c41}
.buyer2011-lead{margin:18px auto 0;max-width:760px;padding:16px 18px;border-left:3px solid #5186ff;border-radius:8px;background:var(--b-bg)}
.buyer2011-decision{margin:28px 0;padding:20px;background:var(--b-bg);border:1px solid var(--b-line);border-radius:16px}
.buyer2011 h2{font-size:clamp(20px,3vw,26px);line-height:1.25;margin:0 0 14px}
.buyer2011 table{width:100%;border-collapse:collapse;font-size:14px;text-align:left}
.buyer2011 caption{color:var(--b-muted);text-align:left;margin-bottom:10px}
.buyer2011 th,.buyer2011 td{padding:12px;border:1px solid var(--b-line);vertical-align:top;overflow-wrap:anywhere}
.buyer2011 th{background:var(--b-head)}.buyer2011 p{margin:14px 0 0;color:var(--b-muted)}
.buyer2011 a{color:#5186ff;text-decoration:underline}.buyer2011 a:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.buyer2011 .buyer2011-date{font-size:13px}
@media(max-width:600px){.buyer2011-decision{padding:16px}.buyer2011 table,.buyer2011 caption,.buyer2011 tbody,.buyer2011 tr,.buyer2011 td{display:block;width:100%;box-sizing:border-box}.buyer2011 thead{position:absolute;clip:rect(0,0,0,0);width:1px;height:1px;overflow:hidden}.buyer2011 tr{margin-bottom:14px}.buyer2011 td+td{border-top:0}.buyer2011 td::before{content:attr(data-label);display:block;font-weight:650;font-size:13px;color:var(--b-muted)}}
`

export function BuyerLead2011({ kind }: { kind: BuyerKind2011 }) {
  return <><style>{css}</style><p className="buyer2011 buyer2011-lead" data-buyer-answer={kind}>{BUYER_2011[kind].answer}</p></>
}

export function BuyerDecision2011({ kind }: { kind: BuyerKind2011 }) {
  const page: BuyerPage2011 = BUYER_2011[kind], pt = kind === 'portuguese'
  const reviewed = page.reviewed ?? BUYER_REVIEW_DATE_2011
  const dateLabel = new Intl.DateTimeFormat(pt ? 'pt-BR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(reviewed))
  const schema = { '@context': 'https://schema.org', '@type': 'WebPage', '@id': `https://www.usekineo.com${page.path}#webpage`, url: `https://www.usekineo.com${page.path}`, name: page.q, dateModified: reviewed }
  return <section className="buyer2011 buyer2011-decision" aria-labelledby={`buyer2011-${kind}`} data-buyer-decision={kind}>
    <h2 id={`buyer2011-${kind}`}>{page.heading}</h2>
    <table>
      <caption>{pt ? 'Escolha pelo que você já tem; confira a duração e o custo antes de gerar.' : 'Choose by what you already have; review duration and cost before generation.'}</caption>
      <thead><tr>{page.labels.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{page.rows.map(row => <tr key={row[0]}>{row.map((cell,i) => <td key={page.labels[i]} data-label={page.labels[i]}>{cell}</td>)}</tr>)}</tbody>
    </table>
    <p>{page.note}</p>
    <p className="buyer2011-date">{pt ? 'Fatos revistos em ' : 'Facts reviewed '}<time dateTime={reviewed}>{dateLabel}</time> · <a href="/pricing">{pt ? 'Planos e condições atuais' : 'Current plan and trial terms'}</a></p>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
  </section>
}

export function BuyerFaq2011({ kind }: { kind: BuyerKind2011 }) {
  const page = BUYER_2011[kind]
  const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: page.q, acceptedAnswer: { '@type': 'Answer', text: page.answer } }] }
  return <section className="buyer2011 buyer2011-decision"><h2>Questions, answered</h2><h3>{page.q}</h3><p>{page.answer}</p><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} /></section>
}
