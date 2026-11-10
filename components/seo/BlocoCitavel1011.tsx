// KINEO-PAGINAS-CITAVEIS-1011 — o bloco citável (resposta direta, fatos numerados, tabela de planos, data). HTML estático do servidor:
// sem rede, sem estado de cliente. Os textos e números vêm de lib/seo/paginasCitaveis1011.ts (nada digitado aqui).
import type { BlocoCitavel } from '@/lib/seo/paginasCitaveis1011'

const STYLE = `
.kc1011{text-align:left;margin:32px 0;font-family:inherit;color:inherit}
.kc1011 h2{font-size:clamp(1.2rem,3vw,1.55rem);font-weight:650;line-height:1.2;margin:0 0 14px}
.kc1011 .kc1011-answer{font-size:1.02rem;line-height:1.65;margin:0 0 16px}
.kc1011 ol{margin:0 0 22px;padding-left:22px;line-height:1.6}.kc1011 ol li{margin:0 0 8px}
.kc1011 table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.55}
.kc1011 th,.kc1011 td{padding:12px;border:1px solid rgba(128,128,128,.35);text-align:left;vertical-align:top;overflow-wrap:anywhere}
.kc1011 th{font-weight:650;background:rgba(10,92,255,.10)}.kc1011 td:first-child{font-weight:600}
.kc1011 caption{text-align:left;font-size:13px;opacity:.8;margin-bottom:10px}
.kc1011 p{font-size:14px;line-height:1.6;margin:12px 0 0}
.kc1011 .kc1011-updated{font-size:12px;opacity:.85}.kc1011 a{color:#3D7BFF;text-decoration:underline}
@media(max-width:600px){.kc1011 table,.kc1011 caption,.kc1011 tbody,.kc1011 tr,.kc1011 td{display:block;width:100%;box-sizing:border-box}.kc1011 thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.kc1011 tr{border:1px solid rgba(128,128,128,.35);border-radius:12px;overflow:hidden;margin-bottom:12px}.kc1011 td{border:0;border-bottom:1px solid rgba(128,128,128,.25);padding:10px 14px}.kc1011 td:last-child{border-bottom:0}.kc1011 td::before{content:attr(data-label);display:block;font-size:11px;font-weight:650;opacity:.75;margin-bottom:3px}}
`

export function BlocoCitavel1011({ bloco, id, pt = false, heading }: { bloco: BlocoCitavel; id: string; pt?: boolean; heading?: string }) {
  const t = bloco.tabela
  return (
    <section className="kc1011" aria-labelledby={`${id}-h`} data-citable-1011={id}>
      <style>{STYLE}</style>
      {heading ? <h2 id={`${id}-h`}>{heading}</h2> : null}
      <p className="kc1011-answer" data-citation-answer={id} {...(heading ? {} : { id: `${id}-h` })}>{bloco.answer}</p>
      {bloco.facts.length > 0 ? <ol>{bloco.facts.map((f) => <li key={f}>{f}</li>)}</ol> : null}
      <h2 data-citation-plans={id}>{t.heading}</h2>
      <table>
        <caption>{t.caption}</caption>
        <thead><tr>{t.labels.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{t.rows.map((row) => <tr key={row[0]}>{row.map((cell, i) => <td key={t.labels[i]} data-label={t.labels[i]}>{cell}</td>)}</tr>)}</tbody>
      </table>
      <p>{t.nota}</p>
      <p className="kc1011-updated">{pt ? 'Atualizado em: ' : 'Updated: '}<time dateTime={bloco.atualizadoIso}>{bloco.atualizadoEm}</time>. <a href="/pricing">{pt ? 'Preços atuais' : 'Current prices'}</a>.</p>
    </section>
  )
}
