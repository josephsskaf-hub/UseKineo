import { TRAFFIC_CITATIONS, TRAFFIC_CITATION_UPDATED, type TrafficCitationPage } from '@/lib/seo/trafficCitation2310'

const STYLE = `
.kc2310{color:#0E1116;text-align:left;margin:36px 0;font-family:inherit}
.kc2310 h2{font-size:clamp(1.25rem,3vw,1.65rem);font-weight:650;line-height:1.2;margin:0 0 16px}
.kc2310 table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.55;background:#fff}
.kc2310 th,.kc2310 td{padding:13px 12px;border:1px solid #E4E4E0;text-align:left;vertical-align:top;overflow-wrap:anywhere}
.kc2310 th{background:#EEF3FF;font-weight:650}.kc2310 td:first-child{font-weight:600}
.kc2310 .kc2310-faq{display:grid;gap:10px;margin-top:22px}
.kc2310 .kc2310-faq div{padding:15px 17px;border:1px solid #E4E4E0;border-radius:14px;background:#fff}
.kc2310 h3{font-size:15px;font-weight:650;margin:0 0 6px;line-height:1.4}
.kc2310 p{font-size:14px;line-height:1.6;color:#4D535C;margin:0}
.kc2310 .kc2310-updated{font-size:12px;margin-top:16px}.kc2310 a{color:#0A5CFF;text-decoration:underline}
.kc2310 a:focus-visible{outline:2px solid #0A5CFF;outline-offset:3px}
@media(max-width:600px){.kc2310 table,.kc2310 caption,.kc2310 tbody,.kc2310 tr,.kc2310 td{display:block;width:100%;box-sizing:border-box}.kc2310 thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.kc2310 tr{border:1px solid #E4E4E0;border-radius:14px;overflow:hidden;margin-bottom:12px}.kc2310 td{border:0;border-bottom:1px solid #E4E4E0;padding:10px 14px}.kc2310 td:last-child{border-bottom:0}.kc2310 td::before{content:attr(data-label);display:block;font-size:11px;font-weight:650;color:#5A5F67;margin-bottom:3px}.kc2310 td:first-child{background:#EEF3FF}.kc2310{margin:28px 0}}
`

export function CitationDirectAnswer({ page }: { page: TrafficCitationPage }) {
  return <p data-citation-answer={page} style={{ fontSize: '1.02rem', color: '#4D535C', lineHeight: 1.65, margin: '16px auto 0', maxWidth: 760 }}>{TRAFFIC_CITATIONS[page].answer}</p>
}

/** Static HTML: no network, client state or analytics changes. Mounted only on six selected entry pages. */
export function CitationDetails({ page }: { page: TrafficCitationPage }) {
  const citation = TRAFFIC_CITATIONS[page]
  const pt = page === 'portuguese'
  const labels = pt ? ['O que você recebe', 'Duração do vídeo', 'Tempo de geração', 'Preço', 'Créditos'] : ['What you receive', 'Video duration', 'Generation time', 'Price', 'Credits']
  return (
    <section className="kc2310" aria-labelledby={`citation-${page}`} data-citation-details={page}>
      <style>{STYLE}</style>
      <h2 id={`citation-${page}`}>{citation.heading}</h2>
      <table>
        <caption style={{ textAlign: 'left', color: '#5A5F67', fontSize: 13, marginBottom: 10 }}>{pt ? 'A duração solicitada do vídeo é diferente do tempo de espera pela geração.' : 'Requested video duration is different from the wait for generation.'}</caption>
        <thead><tr>{labels.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{citation.rows.map((row) => <tr key={row[0]}>{row.map((cell, i) => <td key={labels[i]} data-label={labels[i]}>{cell}</td>)}</tr>)}</tbody>
      </table>
      <div className="kc2310-faq" aria-label={pt ? 'Perguntas frequentes' : 'Frequently asked questions'}>
        {citation.faq.map((item) => <div key={item.q}><h3>{item.q}</h3><p>{item.a}</p></div>)}
      </div>
      <p className="kc2310-updated">{pt ? 'Atualizado em: ' : 'Updated: '}<time dateTime={TRAFFIC_CITATION_UPDATED}>{pt ? '23 de outubro de 2026' : 'October 23, 2026'}</time>. <a href="/pricing">{pt ? 'Preços e condições atuais do teste' : 'Current prices and trial terms'}</a>.</p>
    </section>
  )
}
