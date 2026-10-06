// KINEO-MOTORES-GEO-2026-10-06 — a camada citável das páginas de motor (TAREFA 12, slug motores-geo2).
//
// Componentes de SERVIDOR (sem 'use client', sem hook): o texto sai no HTML estático da página — é o que o robô do
// ChatGPT (OAI-SearchBot) e o Bing leem. Todo número vem de lib/growth/enginePageCatalog.ts ENGINE_GEO, que deriva de
// lib/seo/engineCitation.ts (clipCreditCost / creditCostForDuration / TIER_PRICES / TIER_CREDITS). Nada digitado aqui.
//
// O que cada peça entrega:
//   · EngineAnswerLead — a PRIMEIRA frase depois do H1: onde usar o motor online e quanto custa por vídeo.
//   · EnginePriceCard  — a tabela de preço (clipe de ~5 s, filme de 35 s e de 60 s, quantos por plano), a comparação
//                        com usar o modelo direto (só fonte oficial, datada) e o CTA para o Studio com o motor
//                        pré-selecionado e a campanha seo_engine_<slug>, com a frase da marca como linha de apoio.
// Sem <video> e sem resolução escrita (a página dos motores pagos é travada assim por scripts/test-paid-engine-proof).
import type { CSSProperties } from 'react'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { ENGINE_GEO } from '@/lib/growth/enginePageCatalog'
import {
  ENGINE_GEO_BRAND_LINE,
  ENGINE_GEO_REWARDS_LINE,
  money,
  pausedAccessNote,
  usd,
  type CitationPriceRow,
  type EngineCitation,
} from '@/lib/seo/engineCitation'

export { pausedAccessNote }

/** A camada citável do slug; null = motor pausado, oculto ou aposentado (a página segue no modo antigo). */
export function engineGeoFor(slug: string): EngineCitation | null {
  return Object.prototype.hasOwnProperty.call(ENGINE_GEO, slug) ? ENGINE_GEO[slug] : null
}

const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d' }
const MUTED = '#86868b'

export function EngineAnswerLead({ geo }: { geo: EngineCitation }) {
  return (
    <p data-kineo="engine-answer" style={{ fontSize: '1.06rem', color: '#d2d2d7', lineHeight: 1.6, margin: '14px auto 0', maxWidth: 720 }}>
      {geo.answerLead} {geo.planLine}
    </p>
  )
}

function rowLabel(r: CitationPriceRow): { title: string; detail: string } {
  return r.key === 'clip'
    ? { title: `${r.seconds}-second clip`, detail: 'One scene from text or a photo, no narration' }
    : { title: `${r.seconds}-second video`, detail: 'Script, voice, captions and music, ready to post' }
}

export function EnginePriceCard({ geo, ctaHref, campaign }: { geo: EngineCitation; ctaHref: string; campaign: string }) {
  // KINEO-S25-ABRE-2026-10-06 — sem clipe avulso à venda (o Seedance 2.5), a tabela não tem linha de clipe.
  const rows = [geo.rows.clip, geo.rows.film35, geo.rows.film60].filter((r): r is CitationPriceRow => r !== null)
  const th: CSSProperties = { textAlign: 'left', padding: '11px 10px', fontWeight: 700, color: MUTED, whiteSpace: 'nowrap' }
  const td: CSSProperties = { padding: '11px 10px', verticalAlign: 'top', lineHeight: 1.45 }
  return (
    <section data-kineo="engine-price-card" aria-labelledby={`engine-price-${geo.slug}`} style={{ marginTop: 40 }}>
      <h2 id={`engine-price-${geo.slug}`} style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 6px' }}>
        {geo.name} price per video on Kineo
      </h2>
      <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.9rem', margin: '0 auto 16px', maxWidth: 660, lineHeight: 1.6 }}>
        {`Kineo prices as of ${geo.reviewedLabel}. Credits are charged by the same price function that bills your account; clips and videos share one balance.`}
      </p>
      <div style={{ ...CARD, borderRadius: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: 620 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              <th style={th}>{geo.name}</th>
              <th style={th}>Credits</th>
              <th style={th}>About US$*</th>
              {geo.plans.map((p) => (
                <th key={p.tier} style={th}>{`${p.label} (${money(p.usdCents)}/mo · ${p.credits} cr)`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const label = rowLabel(r)
              return (
                <tr key={r.key} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ ...td, minWidth: 190 }}>
                    <div style={{ fontWeight: 800, color: '#f5f5f7' }}>{label.title}</div>
                    <div style={{ color: MUTED, fontSize: '0.8rem' }}>{label.detail}</div>
                  </td>
                  <td style={{ ...td, fontWeight: 800, color: '#f5f5f7' }}>{`${r.credits} cr`}</td>
                  <td style={{ ...td, color: '#d2d2d7' }}>{usd(r.usdCents)}</td>
                  {r.perPlan.map((pp) => (
                    <td key={pp.tier} style={{ ...td, color: pp.count > 0 ? '#d2d2d7' : '#6e6e73' }}>{pp.count > 0 ? `${pp.count} per month` : '—'}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.78rem', color: '#6e6e73', margin: '10px 0 0', lineHeight: 1.55 }}>
        {`* At the ${geo.reference.label} plan’s credit price (${money(geo.reference.usdCents)} for ${geo.reference.credits} credits). Counts are whole items per monthly credit grant, rounded down.`}
      </p>

      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '26px 0 8px' }}>{`Using ${geo.name} directly instead`}</h3>
      {geo.direct.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18, color: '#d2d2d7', fontSize: '0.9rem', lineHeight: 1.65 }}>
          <li>
            <strong>Kineo</strong>
            {geo.rows.clip
              ? ` — ${geo.rows.clip.credits} credits for a ${geo.rows.clip.seconds}-second clip (about ${usd(geo.rows.clip.usdCents)}), or ${geo.rows.film60.credits} credits for a finished 60-second video with voice, captions and music.`
              : ` — no raw ${geo.name} clips: ${geo.rows.film35.credits} credits for a finished 35-second video (about ${usd(geo.rows.film35.usdCents)}) or ${geo.rows.film60.credits} credits for 60 seconds, with voice, captions and music${geo.paidPlansOnly ? ', on any paid plan' : ''}.`}
          </li>
          {geo.direct.map((r) => (
            <li key={r.who}>
              <strong>{r.who}</strong>
              {` — ${r.terms}.${r.clipUsdCents !== null ? ` About ${usd(r.clipUsdCents)} for ${r.seconds} seconds of raw video.` : ''} `}
              {r.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 ? ' · ' : ''}
                  <a href={s.url} target="_blank" rel="nofollow noopener noreferrer" style={{ color: '#2997ff', textDecoration: 'none' }}>{s.label}</a>
                </span>
              ))}
            </li>
          ))}
        </ul>
      ) : null}
      {geo.directNote ? (
        <p style={{ color: '#d2d2d7', fontSize: '0.9rem', lineHeight: 1.65, margin: '0 0 6px' }}>
          {`${geo.directNote.text} (${geo.directCheckedLabel}). `}
          <a href={geo.directNote.source.url} target="_blank" rel="nofollow noopener noreferrer" style={{ color: '#2997ff', textDecoration: 'none' }}>{geo.directNote.source.label}</a>
        </p>
      ) : null}
      {geo.direct.length > 0 ? (
        <p style={{ color: MUTED, fontSize: '0.82rem', lineHeight: 1.6, margin: '8px 0 0' }}>
          {`Provider prices as published in ${geo.directCheckedLabel}; they change. Those are raw clips: the script, narration, captions, music and the edit are still yours. Kineo’s video price includes all of that in one render.`}
        </p>
      ) : null}

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <OrganicCtaLink
          href={ctaHref}
          source={campaign}
          placement="price_card"
          style={{ display: 'inline-block', background: '#2997ff', color: '#fff', fontWeight: 900, padding: '14px 28px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}
        >
          {geo.ctaLabel}
        </OrganicCtaLink>
        <p style={{ color: '#d2d2d7', fontSize: '0.95rem', margin: '12px auto 0', maxWidth: 560, lineHeight: 1.55 }}>{ENGINE_GEO_BRAND_LINE}</p>
        <p style={{ color: MUTED, fontSize: '0.82rem', margin: '6px 0 0' }}>{ENGINE_GEO_REWARDS_LINE}</p>
      </div>
    </section>
  )
}
