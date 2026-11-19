import { CITACOES_ROTINA_DATE } from '@/lib/seo/citacoesRotina1711'
import { TRAFFIC_CITATIONS, type TrafficCitationPage } from '@/lib/seo/trafficCitation2310'
import { PAGINAS_CITADAS_0511_ATUALIZADO, planosPorFilmeTexto0511 } from '@/lib/seo/paginasCitadas0511' // KINEO-PAGINAS-CITADAS-0511

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
@media(max-width:600px){.kc2310 table,.kc2310 caption,.kc2310 tbody,.kc2310 tr,.kc2310 td{display:block;width:100%;box-sizing:border-box}.kc2310 thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.kc2310 tr{border:1px solid #E4E4E0;border-radius:14px;overflow:hidden;margin-bottom:12px}.kc2310 td{border:0;border-bottom:1px solid #E4E4E0;padding:10px 14px}.kc2310 td:last-child{border-bottom:0}.kc2310 td::before{content:attr(data-label);display:block;font-size:12px;font-weight:650;color:#5A5F67;margin-bottom:3px}.kc2310 td:first-child{background:#EEF3FF}.kc2310{margin:28px 0}}
`

const HOME_STYLE = `
.kc2310-home{color:var(--txt)}
.kc2310-home table,.kc2310-home details{background:var(--card)}
.kc2310-home th,.kc2310-home td,.kc2310-home tr{border-color:var(--line)}
.kc2310-home th{background:var(--card2)}
.kc2310-home p,.kc2310-home td::before{color:var(--muted)}
.kc2310-home a{color:var(--blue)}
.kc2310-home :is(a,summary):focus-visible{outline:2px solid var(--blue);outline-offset:3px}
.kc2310-home details{border:1px solid var(--line);border-radius:12px;padding:12px 16px}
.kc2310-home summary{cursor:pointer;min-height:24px;font-weight:650}
.kc2310-home summary h3{display:inline;margin:0}
.kc2310-home details[open]>summary{margin-bottom:10px}
.kc2310-home .kc2310-plans{margin-top:14px}
@media(max-width:600px){.kc2310-home td:first-child{background:var(--card2)}}
`

export function CitationDirectAnswer({ page }: { page: TrafficCitationPage }) {
  return <p data-citation-answer={page} style={{ fontSize: '1.02rem', color: '#4D535C', lineHeight: 1.65, margin: '16px auto 0', maxWidth: 760 }}>{TRAFFIC_CITATIONS[page].answer}</p>
}

/** Static HTML: no network, client state or analytics changes. Mounted only on six selected entry pages. */
export function CitationDetails({ page }: { page: TrafficCitationPage }) {
  const citation = TRAFFIC_CITATIONS[page]
  const pt = page === 'portuguese'
  const home = page === 'home'
  const planos = planosPorFilmeTexto0511(pt, !home) // KINEO-PAGINAS-CITADAS-0511 — os 3 planos de 04/11 e o que um mês de créditos cobre
  const labels = pt ? ['O que você recebe', 'Duração do vídeo', 'Tempo de geração', 'Preço', 'Créditos'] : ['What you receive', 'Video duration', 'Generation time', 'Price', 'Credits']
  const captionColor = home ? 'var(--muted)' : '#5A5F67'
  const planContents = <>
    <h2 style={{ marginTop: home ? 0 : 30 }} data-citation-plans={page}>{planos.heading}</h2>
    <table>
      <caption style={{ textAlign: 'left', color: captionColor, fontSize: 13, marginBottom: 10 }}>{planos.caption}</caption>
      <thead><tr>{planos.labels.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{planos.rows.map((row) => <tr key={row[0]}>{row.map((cell, i) => <td key={planos.labels[i]} data-label={planos.labels[i]}>{cell}</td>)}</tr>)}</tbody>
    </table>
    <p style={{ marginTop: 12 }}>{planos.nota}</p>
    <p className="kc2310-updated">{pt ? 'Atualizado em: ' : 'Updated: '}<time dateTime={page === 'home' ? PAGINAS_CITADAS_0511_ATUALIZADO : CITACOES_ROTINA_DATE}>{planos.atualizadoEm}</time>. <a href="/pricing">{planos.termos}</a>.</p>
  </>
  return (
    <section className={home ? 'kc2310 kc2310-home' : 'kc2310'} aria-labelledby={`citation-${page}`} data-citation-details={page}>
      {/* KINEO-HIDRATACAO-1911 — CSS por dangerouslySetInnerHTML: como filho de <style>, o servidor escapa o ">" de HOME_STYLE para &gt; e o cliente não (React #425/#418/#423 em toda página com a seção da home). */}
      <style dangerouslySetInnerHTML={{ __html: home ? STYLE + HOME_STYLE : STYLE }} />
      <h2 id={`citation-${page}`}>{citation.heading}</h2>
      <table>
        <caption style={{ textAlign: 'left', color: captionColor, fontSize: 13, marginBottom: 10 }}>{pt ? 'A duração solicitada do vídeo é diferente do tempo de espera pela geração.' : 'Requested video duration is different from the wait for generation.'}</caption>
        <thead><tr>{labels.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{citation.rows.map((row) => <tr key={row[0]}>{row.map((cell, i) => <td key={labels[i]} data-label={labels[i]}>{cell}</td>)}</tr>)}</tbody>
      </table>
      <div className="kc2310-faq" aria-label={pt ? 'Perguntas frequentes' : 'Frequently asked questions'}>
        {citation.faq.map((item) => home
          ? <details key={item.q}><summary><h3>{item.q}</h3></summary><p>{item.a}</p></details>
          : <div key={item.q}><h3>{item.q}</h3><p>{item.a}</p></div>)}
      </div>
      {home ? <details className="kc2310-plans"><summary>See plans and cost per film</summary>{planContents}</details> : planContents}
    </section>
  )
}
