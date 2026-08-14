'use client'

// YouTube Shorts Money Calculator — pure in-memory state (no localStorage,
// no network). Inputs: views per Short, Shorts posted per week, and a niche
// that maps to an ESTIMATED RPM. Output: estimated monthly views, estimated
// monthly earnings (low/mid/high using RPM ±40%) and estimated yearly.
// Every figure is clearly labelled an estimate — real RPM varies widely.

import { useMemo, useState } from 'react'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { toolActivationHref } from '@/lib/toolActivationHref'

const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

// Weeks per month (365.25 / 7 / 12) — keeps monthly and yearly consistent.
const WEEKS_PER_MONTH = 4.345

// Estimated Shorts RPM bands by niche. These are deliberately conservative,
// order-of-magnitude estimates for the money paid per 1,000 monetized Shorts
// views (after the platform split) — NOT guaranteed rates. Advertiser demand,
// audience geography and season move these a lot.
type NicheId =
  | 'finance'
  | 'tech'
  | 'health'
  | 'education'
  | 'motivation'
  | 'history'
  | 'entertainment'

// KINEO-FERRAMENTAS-ORFAS-2026-08-14 — `topicSeed` é a ponte entre esta
// ferramenta e o produto. A calculadora não produz um roteiro, produz um NÚMERO,
// e um número não cabe num prompt. Mas o nicho que a pessoa escolheu cabe: ela
// declarou em qual assunto quer ganhar dinheiro, e é isso que a porta carrega
// para o /generate. O seed é um tema concreto do nicho — nunca "faça um vídeo
// sobre finanças", que devolveria o trabalho de decidir para quem acabou de
// dizer o que queria.
type Niche = { id: NicheId; label: string; rpm: number; topicSeed: string }

const NICHES: Niche[] = [
  { id: 'finance', label: 'Finance & business', rpm: 0.2, topicSeed: '5 money habits that quietly make you rich before 30' },
  { id: 'tech', label: 'Tech & software', rpm: 0.12, topicSeed: 'The free AI tool that replaced an entire job in 2026' },
  { id: 'health', label: 'Health & fitness', rpm: 0.09, topicSeed: 'The 10-minute morning habit that beats an hour at the gym' },
  { id: 'education', label: 'Education & facts', rpm: 0.07, topicSeed: 'The island humans are forbidden to enter' },
  { id: 'motivation', label: 'Motivation & self-improvement', rpm: 0.05, topicSeed: 'The 2-minute rule that ends procrastination for good' },
  { id: 'history', label: 'History & geography', rpm: 0.05, topicSeed: 'The country that pays you $2,000 a month just to move there' },
  { id: 'entertainment', label: 'Entertainment, gaming & animals', rpm: 0.03, topicSeed: 'The animal that is technically immortal' },
]

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const intFmt = (n: number) => Math.round(n).toLocaleString('en-US')

export default function CalculatorClient() {
  const [viewsPerShort, setViewsPerShort] = useState<string>('10000')
  const [shortsPerWeek, setShortsPerWeek] = useState<string>('7')
  const [nicheId, setNicheId] = useState<NicheId>('finance')

  const niche = NICHES.find((n) => n.id === nicheId) ?? NICHES[0]
  // O número que a pessoa DIGITOU, devolvido para ela na porta. Guardado contra
  // entrada vazia/negativa/NaN porque o input é livre e a copy não pode dizer
  // "os NaN Shorts".
  const shortsNeeded = Math.max(0, Math.round(Number(shortsPerWeek) || 0))

  const result = useMemo(() => {
    const views = Math.max(0, Number(viewsPerShort) || 0)
    const perWeek = Math.max(0, Number(shortsPerWeek) || 0)
    const monthlyViews = views * perWeek * WEEKS_PER_MONTH

    const mid = (monthlyViews * niche.rpm) / 1000
    const low = mid * 0.6 // RPM −40%
    const high = mid * 1.4 // RPM +40%

    return {
      monthlyViews,
      monthlyLow: low,
      monthlyMid: mid,
      monthlyHigh: high,
      yearlyLow: low * 12,
      yearlyMid: mid * 12,
      yearlyHigh: high * 12,
    }
  }, [viewsPerShort, shortsPerWeek, niche])

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#1d1d20',
    border: '1px solid #2a2a2d',
    borderRadius: 10,
    padding: '12px 14px',
    color: '#f5f5f7',
    fontFamily: 'inherit',
    fontSize: '1rem',
    fontWeight: 600,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: MUTED,
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    margin: '0 0 8px',
  }

  return (
    <section style={{ margin: '0 0 48px' }}>
      {/* Inputs */}
      <div style={{ ...CARD, padding: '24px 22px', margin: '0 0 14px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          <div>
            <label htmlFor="viewsPerShort" style={labelStyle}>
              Average views per Short
            </label>
            <input
              id="viewsPerShort"
              type="number"
              inputMode="numeric"
              min={0}
              value={viewsPerShort}
              onChange={(e) => setViewsPerShort(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="shortsPerWeek" style={labelStyle}>
              Shorts posted per week
            </label>
            <input
              id="shortsPerWeek"
              type="number"
              inputMode="numeric"
              min={0}
              value={shortsPerWeek}
              onChange={(e) => setShortsPerWeek(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="niche" style={labelStyle}>
              Niche (sets estimated RPM)
            </label>
            <select
              id="niche"
              value={nicheId}
              onChange={(e) => setNicheId(e.target.value as NicheId)}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
            >
              {NICHES.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p style={{ color: MUTED, fontSize: '0.82rem', lineHeight: 1.55, margin: '16px 0 0' }}>
          Estimated RPM for{' '}
          <span style={{ color: '#d2d2d7', fontWeight: 600 }}>{niche.label}</span>:{' '}
          <span style={{ color: ACCENT, fontWeight: 700 }}>${niche.rpm.toFixed(2)}</span> per 1,000
          views. This is a rough estimate only — your real RPM depends on audience country,
          advertiser demand and the season.
        </p>
      </div>

      {/* Result */}
      <div style={{ ...CARD, padding: '28px 24px', border: `1px solid ${ACCENT}` }}>
        <p
          style={{
            color: ACCENT,
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 6px',
          }}
        >
          Estimated earnings
        </p>

        <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 4px' }}>
          Estimated monthly views
        </p>
        <p style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 20px' }}>
          {intFmt(result.monthlyViews)}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 14,
            margin: '0 0 20px',
          }}
        >
          <div>
            <p style={{ color: MUTED, fontSize: '0.8rem', margin: '0 0 4px' }}>Monthly (mid)</p>
            <p style={{ color: ACCENT, fontSize: '2.2rem', fontWeight: 800, margin: 0, lineHeight: 1.05 }}>
              {usd(result.monthlyMid)}
            </p>
            <p style={{ color: MUTED, fontSize: '0.82rem', margin: '4px 0 0' }}>
              range {usd(result.monthlyLow)} – {usd(result.monthlyHigh)}
            </p>
          </div>
          <div>
            <p style={{ color: MUTED, fontSize: '0.8rem', margin: '0 0 4px' }}>Yearly (mid)</p>
            <p style={{ color: ACCENT, fontSize: '2.2rem', fontWeight: 800, margin: 0, lineHeight: 1.05 }}>
              {usd(result.yearlyMid)}
            </p>
            <p style={{ color: MUTED, fontSize: '0.82rem', margin: '4px 0 0' }}>
              range {usd(result.yearlyLow)} – {usd(result.yearlyHigh)}
            </p>
          </div>
        </div>

        <p style={{ color: MUTED, fontSize: '0.8rem', lineHeight: 1.55, margin: '0 0 18px' }}>
          All figures are estimates. The low–high range applies the estimated RPM at ±40% to
          reflect how much real payouts swing. Only monetized views earn ad revenue, so actual
          earnings are usually lower than raw view counts suggest.
        </p>

        {/* KINEO-FERRAMENTAS-ORFAS-2026-08-14 — a porta.
            Antes: <a> cru, URL absoluta, destino = OUTRA página de SEO
            (/free-ai-shorts-generator), sem organic_cta_clicked. A pessoa
            acabava de ver quanto poderia ganhar e era mandada para mais um
            artigo. Agora: <Link> instrumentado para o produto, carregando o
            nicho que ela mesma escolheu, e a copy nomeia o número DELA — o
            pedido é o próximo passo do que ela acabou de fazer, não uma oferta
            nova. Uma oferta só por tela: nenhum link para preço aqui. */}
        <OrganicCtaLink
          href={toolActivationHref({
            prompt: niche.topicSeed,
            campaign: 'acq5_money_calculator',
          })}
          source="acq5_money_calculator"
          placement="result"
          style={{
            display: 'inline-block',
            background: ACCENT,
            color: '#000',
            fontWeight: 700,
            fontSize: '0.98rem',
            padding: '13px 24px',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          {shortsNeeded > 0
            ? `Make the first of those ${intFmt(shortsNeeded)} Shorts — free →`
            : 'Make your first Short — free →'}
        </OrganicCtaLink>
        <p style={{ color: MUTED, fontSize: '0.82rem', lineHeight: 1.55, margin: '12px 0 0' }}>
          {shortsNeeded > 0 ? (
            <>
              {usd(result.monthlyMid)}/month needs {intFmt(shortsNeeded)} Shorts posted every week.
              That is the actual job. Kineo makes them from a topic — voiceover, footage and
              captions, ready to post.
            </>
          ) : (
            <>Kineo makes finished 9:16 Shorts from a topic — voiceover, footage and captions.</>
          )}
        </p>
      </div>
    </section>
  )
}
