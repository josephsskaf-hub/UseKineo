// KINEO-GEO-RODADA3-2026-10-08 — a seção citável das 4 páginas que respondem as perguntas da rodada 3 de GEO: a tabela com os
// números MEDIDOS da Kineo (os mesmos do /ai-video-index) e os preços públicos dos concorrentes (com link e data), os filmes
// da casa com "Make one like this" e os links internos (motor, /pricing, /studio). Os dados vêm de lib/seo/geoRodada3Answers.ts.
// Componente de SERVIDOR (sem hook): o texto sai no HTML estático — é o que o OAI-SearchBot e o Bing leem.
// Sem <video> (capa leve em <img>, carregamento tardio): as páginas que recebem esta seção não ganham mídia pesada.
import type { CSSProperties } from 'react'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import type { Round3Answer, Round3Row } from '@/lib/seo/geoRodada3Answers'
import { HOUSE_FILM_REMIX_LABEL, HOUSE_FILM_REMIX_PLACEMENT, houseFilmRemixHref } from '@/lib/seo/geoRodada3'

const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d' }
const MUTED = '#86868b'
const TH: CSSProperties = { textAlign: 'left', padding: '11px 12px', fontWeight: 700, color: MUTED, verticalAlign: 'bottom' }
const TD: CSSProperties = { padding: '11px 12px', verticalAlign: 'top', lineHeight: 1.45, color: '#d2d2d7' }

function Table({ columns, rows, minWidth }: { columns: string[]; rows: Round3Row[]; minWidth: number }) {
  return (
    <div style={{ ...CARD, borderRadius: 16, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
            {columns.map((c, i) => <th key={`${c}-${i}`} scope="col" style={TH}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <th scope="row" style={{ ...TD, fontWeight: 800, color: '#f5f5f7', textAlign: 'left', minWidth: 150 }}>{r.label}</th>
              {r.cells.map((cell, i) => <td key={i} style={TD}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function GeoRodada3Section({ answer }: { answer: Round3Answer }) {
  const sources = answer.sources
  return (
    <section data-kineo={`geo-r3-${answer.key}`} aria-labelledby={`geo-r3-${answer.key}-title`} style={{ marginTop: 44 }}>
      <h2 id={`geo-r3-${answer.key}-title`} style={{ fontSize: '1.3rem', fontWeight: 900, margin: '0 0 8px' }}>{answer.heading}</h2>
      <p style={{ color: MUTED, fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 16px' }}>{answer.intro}</p>
      <Table columns={answer.columns} rows={answer.rows} minWidth={answer.columns.length > 3 ? 720 : 560} />
      {answer.priceTable ? (
        <div style={{ marginTop: 22 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 10px' }}>{answer.priceTable.heading}</h3>
          <Table columns={answer.priceTable.columns} rows={answer.priceTable.rows} minWidth={560} />
        </div>
      ) : null}
      {sources.length ? (
        <p data-kineo="geo-r3-sources" style={{ fontSize: '0.78rem', color: '#6e6e73', margin: '10px 0 0', lineHeight: 1.6 }}>
          {'Official sources, '}
          {sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 ? ' · ' : ''}
              <a href={s.url} target="_blank" rel="nofollow noopener noreferrer" style={{ color: MUTED }}>{s.label}</a>
              {` (checked on ${s.checkedOn})`}
            </span>
          ))}
          {'. Prices change; check them before you buy.'}
        </p>
      ) : null}

      {answer.films.length > 0 ? (
        <div data-kineo="geo-r3-films" style={{ marginTop: 26 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 6px' }}>Films made in Kineo</h3>
          <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 12px', lineHeight: 1.55 }}>
            Kineo-owned films — the badge is the engine that rendered each one. Customer videos stay private.
          </p>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {answer.films.map((f) => (
              <div key={f.id} style={{ ...CARD, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- capa estática leve (webp da vitrine), sem otimizador */}
                <img src={f.posterPath} alt={`${f.title} — a film rendered on ${f.engineName} in Kineo`} loading="lazy" decoding="async" width={240} height={427} style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '9 / 16', objectFit: 'cover', background: '#000' }} />
                <p style={{ margin: 0, padding: '9px 10px 2px', fontSize: '11.5px', fontWeight: 700, lineHeight: 1.35, color: 'rgba(255,255,255,0.85)' }}>{f.title}</p>
                <p style={{ margin: 0, padding: '0 10px 8px', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: MUTED }}>{f.engineName}</p>
                <OrganicCtaLink
                  href={houseFilmRemixHref(f, answer.campaign)}
                  source={answer.campaign}
                  placement={HOUSE_FILM_REMIX_PLACEMENT}
                  style={{ margin: 'auto 10px 10px', display: 'block', textAlign: 'center', background: '#f5f5f7', color: '#000', fontWeight: 900, fontSize: '0.8rem', padding: '8px 10px', borderRadius: 980, textDecoration: 'none' }}
                >
                  {HOUSE_FILM_REMIX_LABEL}
                </OrganicCtaLink>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <nav aria-label="Related" data-kineo="geo-r3-links" style={{ marginTop: 18, fontSize: '0.86rem', lineHeight: 2 }}>
        {answer.links.map((l, i) => (
          <span key={l.href}>
            {i > 0 ? ' · ' : ''}
            <Link href={l.href} style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>{l.label}</Link>
          </span>
        ))}
      </nav>
    </section>
  )
}
