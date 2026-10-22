// KINEO-PAGINAS-MOTOR-1610 — as peças citáveis das páginas de motor premium, da página de custo e da comparação de motores.
// Componentes de SERVIDOR (sem 'use client', sem hook): o texto sai no HTML estático — é o que o OAI-SearchBot e o Bing leem.
// Todo número vem de lib/seo/paginasMotor1610.ts (creditCostForDuration / TIER_PRICES / TIER_CREDITS / fontes oficiais
// datadas). Sem <video> e sem resolução escrita (as páginas dos motores pagos têm exatamente duas prévias — test-paid-engine-proof).
// Cada bloco leva data-kineo próprio: é por ele que os guardiões de trava das páginas descontam SÓ esta mudança
// (scripts/test-support/paginas-motor-1610.mjs) e é por ele que scripts/test-paginas-motor-1610.mjs prova o conteúdo.
// KINEO-PAGINAS-IA-CLARAS-2110 — cores em var(--kpl-*, <cor de antes>): claras só dentro de <main className="kpl"> (as páginas de entrada do ChatGPT); nas outras páginas, a cor de antes.
import type { CSSProperties } from 'react'
import Link from 'next/link'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import {
  PAGINAS_MOTOR_1610_CHECKED_LABEL,
  REFERENCE_PLAN_LINE,
  cheapestAnswer,
  competitors1610,
  decisionRows1610,
  engineGuideFor,
  kineoCostRows,
  usd,
} from '@/lib/seo/paginasMotor1610'

const BOX: CSSProperties = { background: 'var(--kpl-card, #161618)', border: '1px solid var(--kpl-line, #2a2a2d)', borderRadius: 16 }
const SOFT = 'var(--kpl-muted, #a1a1a8)'
const H2: CSSProperties = { fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 14px' }
const H3: CSSProperties = { fontSize: '1.02rem', fontWeight: 800, margin: '26px 0 10px' }
const TH: CSSProperties = { textAlign: 'left', padding: '10px 11px', fontWeight: 700, color: SOFT, whiteSpace: 'nowrap' }
const TD: CSSProperties = { padding: '10px 11px', verticalAlign: 'top', lineHeight: 1.45, color: 'var(--kpl-body, #d2d2d7)' }
const LIST: CSSProperties = { margin: 0, paddingLeft: 18, color: 'var(--kpl-body, #d2d2d7)', fontSize: '0.92rem', lineHeight: 1.65 }

/** O resumo citável de 3 frases (uma por linha, como o artigo do GPT entrega). */
function Summary({ lines, kind }: { lines: readonly string[]; kind: string }) {
  return (
    <div data-kineo={`summary-1610-${kind}`} style={{ ...BOX, borderColor: 'var(--kpl-accent-line, rgba(41,151,255,0.35))', background: 'var(--kpl-accent-soft, rgba(41,151,255,0.06))', padding: '16px 18px' }}>
      {lines.map((l) => (
        <p key={l} style={{ margin: '0 0 6px', color: 'var(--kpl-text, #f5f5f7)', fontSize: '0.98rem', lineHeight: 1.6 }}>{l}</p>
      ))}
    </div>
  )
}

/** O guia de UMA página de motor: resumo, preço por duração ao lado do motor irmão, limites, quando não usar, links. */
export function EngineBuyerGuide({ slug, ctaHref, campaign }: { slug: string; ctaHref: string; campaign: string }) {
  const g = engineGuideFor(slug)
  if (!g) return null
  return (
    <section data-kineo="engine-guide-1610" aria-labelledby={`engine-guide-${g.slug}`} style={{ marginTop: 44 }}>
      <h2 id={`engine-guide-${g.slug}`} style={H2}>{`${g.name} on Kineo, in three lines`}</h2>
      <Summary lines={g.summary} kind="engine" />

      <h3 style={H3}>{`Price by length: ${g.name} next to ${g.compare.name}`}</h3>
      <div style={{ ...BOX, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: 560 }}>
          <thead>
            <tr style={{ background: 'var(--kpl-zebra, rgba(255,255,255,0.04))' }}>
              <th style={TH}>Finished film</th>
              <th style={TH}>{`${g.name}`}</th>
              <th style={TH}>About US$*</th>
              <th style={TH}>Smallest monthly plan</th>
              <th style={TH}>{`${g.compare.name}`}</th>
            </tr>
          </thead>
          <tbody>
            {g.rows.map((r) => (
              <tr key={r.seconds} style={{ borderTop: '1px solid var(--kpl-hair, rgba(255,255,255,0.06))' }}>
                <td style={{ ...TD, fontWeight: 800, color: 'var(--kpl-text, #f5f5f7)' }}>{`${r.seconds} seconds`}</td>
                <td style={{ ...TD, fontWeight: 800, color: 'var(--kpl-text, #f5f5f7)' }}>{`${r.credits} cr`}</td>
                <td style={TD}>{usd(r.usdCents)}</td>
                <td style={TD}>{r.smallestPlan}</td>
                <td style={TD}>{r.compareCredits === null ? '—' : `${r.compareCredits} cr (${usd(r.compareUsdCents as number)})`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--kpl-muted, #6e6e73)', margin: '8px 0 0', lineHeight: 1.55 }}>
        {`* What the credits are worth at the ${REFERENCE_PLAN_LINE()}, not a per-video checkout price. Each film includes the script, narration, captions and music; ${g.paidPlansOnly ? `${g.name} runs on paid plans only` : 'every engine shares one credit balance'}.`}
      </p>

      <h3 style={H3}>Limits to know before you buy</h3>
      <ul data-kineo="engine-guide-limits" style={LIST}>
        {g.limits.map((l) => <li key={l}>{l}</li>)}
      </ul>

      <h3 style={H3}>{`When NOT to use ${g.name}`}</h3>
      <ul data-kineo="engine-guide-when-not" style={LIST}>
        {g.whenNot.map((l) => <li key={l}>{l}</li>)}
      </ul>

      <p style={{ margin: '18px 0 0', fontSize: '0.9rem', lineHeight: 1.9 }}>
        {g.links.map((l, i) => (
          <span key={l.href}>
            {i > 0 ? ' · ' : ''}
            <Link href={l.href} style={{ color: 'var(--kpl-accent, #2997ff)', textDecoration: 'none', fontWeight: 700 }}>{l.label}</Link>
          </span>
        ))}
      </p>
      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <OrganicCtaLink
          href={ctaHref}
          source={campaign}
          placement="engine_guide_1610"
          style={{ display: 'inline-block', border: '1px solid var(--kpl-accent, #2997ff)', color: 'var(--kpl-accent, #2997ff)', fontWeight: 800, padding: '12px 24px', borderRadius: 980, textDecoration: 'none', fontSize: '0.98rem' }}
        >
          {g.paidPlansOnly ? `Start a ${g.name} film on a paid plan →` : `Start a ${g.name} film →`}
        </OrganicCtaLink>
      </div>
    </section>
  )
}

/** Fora da Kineo: o que cada ferramenta entrega, preço público com fonte e data, o que falta, 60 s calculados. */
export function CompetitorTable1610() {
  const rows = competitors1610()
  return (
    <section data-kineo="competitors-1610" style={{ marginTop: 44 }}>
      <h2 style={{ ...H2, textAlign: 'left' }}>Outside Kineo: Google Flow, Seedance.tv, Dreamina, CapCut and the Kling app</h2>
      <p style={{ color: SOFT, fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 14px' }}>
        {`What each tool delivers and what it publicly charges, read on its official page on ${PAGINAS_MOTOR_1610_CHECKED_LABEL}. Prices change and some vary by country; follow the links for today’s terms. The 60-second column is our arithmetic from those published numbers.`}
      </p>
      <div style={{ ...BOX, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: 760 }}>
          <thead>
            <tr style={{ background: 'var(--kpl-zebra, rgba(255,255,255,0.04))' }}>
              <th style={TH}>Tool</th>
              <th style={TH}>What you get</th>
              <th style={TH}>Public price (official page)</th>
              <th style={TH}>60 seconds of video</th>
              <th style={TH}>What is left to do</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--kpl-hair, rgba(255,255,255,0.06))' }}>
                <td style={{ ...TD, fontWeight: 800, color: 'var(--kpl-text, #f5f5f7)', minWidth: 120 }}>
                  {r.name}
                  {r.sources.map((s) => (
                    <div key={s.url}>
                      <a href={s.url} target="_blank" rel="nofollow noopener noreferrer" style={{ color: 'var(--kpl-accent, #2997ff)', fontWeight: 600, fontSize: '0.78rem', textDecoration: 'none' }}>{s.label}</a>
                    </div>
                  ))}
                </td>
                <td style={{ ...TD, minWidth: 170 }}>{r.delivers}</td>
                <td style={{ ...TD, minWidth: 220 }}>{r.publicPrice}</td>
                <td style={{ ...TD, minWidth: 150 }}>{r.sixtySeconds ?? 'Not computable from the public page'}</td>
                <td style={{ ...TD, minWidth: 170 }}>{r.gap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: 'var(--kpl-body, #d2d2d7)', fontSize: '0.92rem', lineHeight: 1.65, margin: '14px 0 0' }}>
        No tool here is the cheapest for everyone. If you have time to edit and want to spend nothing, a free clip allowance plus a free editor costs the least money. If you want the finished, narrated Short from one render, compare against Kineo’s price per film below — clip prices cover raw seconds of video only.
      </p>
    </section>
  )
}

/** A resposta da página de custo: 3 linhas + a tabela de custo por motor e duração (Kineo). */
export function CheapestAnswer1610() {
  const a = cheapestAnswer()
  const rows = kineoCostRows()
  return (
    <section data-kineo="cheapest-answer-1610" style={{ margin: '26px 0 0' }}>
      <Summary lines={a.summary} kind="cheapest" />
      <h2 style={{ ...H2, textAlign: 'left', margin: '30px 0 10px' }}>What a finished Short costs on Kineo, by engine and length</h2>
      <div style={{ ...BOX, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: 520 }}>
          <thead>
            <tr style={{ background: 'var(--kpl-zebra, rgba(255,255,255,0.04))' }}>
              <th style={TH}>Engine</th>
              {rows[0]?.cells.map((c) => <th key={c.seconds} style={TH}>{`${c.seconds}-second film`}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} style={{ borderTop: '1px solid var(--kpl-hair, rgba(255,255,255,0.06))' }}>
                <td style={{ ...TD, fontWeight: 800 }}>
                  <Link href={r.path} style={{ color: 'var(--kpl-text, #f5f5f7)', textDecoration: 'none' }}>{r.name}</Link>
                </td>
                {r.cells.map((c) => (
                  <td key={c.seconds} style={TD}>{c.credits === null ? '—' : `${c.credits} cr · ≈${usd(c.usdCents as number)}`}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--kpl-muted, #6e6e73)', margin: '8px 0 0', lineHeight: 1.55 }}>
        {`≈ US$ = what the credits are worth at the ${REFERENCE_PLAN_LINE()}; you pay for a plan, not per video. Credits come from the same function that bills your account. Each film includes the script, narration, captions and music.`}
      </p>
    </section>
  )
}

/** A comparação de motores: para que história serve cada um (créditos derivados; ajuste editorial, não ranking de qualidade). */
export function EngineDecision1610({ whenNot }: { whenNot: readonly string[] }) {
  const rows = decisionRows1610()
  return (
    <section data-kineo="engine-decision-1610" style={{ marginTop: 44 }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px' }}>Which engine for which story</h2>
      <p style={{ color: SOFT, fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 14px' }}>
        An editorial guide from how each engine works inside Kineo — not a measured quality ranking. Choose by the story, not the model name.
      </p>
      <div style={{ ...BOX, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: 640 }}>
          <thead>
            <tr style={{ background: 'var(--kpl-zebra, rgba(255,255,255,0.04))' }}>
              <th style={TH}>Engine</th>
              <th style={TH}>Consider it for</th>
              <th style={TH}>60-second film</th>
              <th style={TH}>Main limit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} style={{ borderTop: '1px solid var(--kpl-hair, rgba(255,255,255,0.06))' }}>
                <td style={{ ...TD, fontWeight: 800 }}><Link href={r.path} style={{ color: 'var(--kpl-text, #f5f5f7)', textDecoration: 'none' }}>{r.name}</Link></td>
                <td style={TD}>{r.considerFor}</td>
                <td style={{ ...TD, whiteSpace: 'nowrap' }}>{`${r.credits60} cr · ≈${usd(r.usdCents60)}`}</td>
                <td style={TD}>{r.limitation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--kpl-muted, #6e6e73)', margin: '8px 0 0', lineHeight: 1.55 }}>{`≈ US$ at the ${REFERENCE_PLAN_LINE()}.`}</p>
      <h3 style={H3}>When NOT to use this comparison</h3>
      <ul style={LIST}>
        {whenNot.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </section>
  )
}
