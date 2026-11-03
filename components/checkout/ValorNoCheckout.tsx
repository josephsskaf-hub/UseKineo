'use client'

// KINEO-VALOR-NO-CHECKOUT-3110 — as três peças de tela do "valor na hora de pagar". Nenhum número é digitado aqui: toda
// conta sai de lib/valorNoCheckout.ts (a régua única), que usa as funções que cobram. Nenhuma peça muda preço ou plano.
//   · FilmsMadeProof — a prova social real (/api/stats/public, a régua única de lib/publicStats.ts), muda abaixo do piso ou em erro;
//   · FilmsLikeThisNote — "≈ N more films like this a month on Starter · …" a partir do filme que a pessoa já fez;
//   · PlanFinder — "Which plan fits me?": 3 perguntas → o plano mais barato que cobre, com a conta à vista.
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { formatCheckoutMoney } from '@/lib/checkoutPricing'
import { pricingTierCardId } from '@/lib/growth/pricingTierHandoff'
import {
  PLAN_FINDER_ENGINES, PLAN_FINDER_LENGTHS, PLAN_FINDER_OPENED_EVENT, PLAN_FINDER_PER_WEEK, PLAN_FINDER_RECOMMENDED_EVENT,
  VALOR_NO_CHECKOUT_VERSION, filmsLikeThis, filmsLikeThisLine, filmsLikeThisMath, filmsMadeLine, planFinderMathLine, planFinderVerdictLine,
  recommendPlan, type PlanFinderEngine,
} from '@/lib/valorNoCheckout'
import { PUBLIC_STATS_ENDPOINT, parsePublicStats } from '@/lib/publicStats'

/** A prova social real perto do botão de pagar; null enquanto carrega, em erro ou abaixo do piso. */
export function FilmsMadeProof({ surface }: { surface: 'pricing' | 'upgrade' }) {
  const [line, setLine] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    // KINEO-COPIA-ORCAMENTO-CONTADOR-0211 — a mesma leitura do selo do rodapé e da faixa da home (lib/publicStats.ts):
    // um número só no site inteiro; zero, erro ou abaixo do piso = nada na tela.
    void fetch(PUBLIC_STATS_ENDPOINT)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw: unknown) => {
        const s = parsePublicStats(raw)
        const text = s ? filmsMadeLine({ films: s.films30d, creators: s.creators30d }) : null
        if (alive && text) setLine(text)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  if (!line) return null
  return (
    <p data-valor-no-checkout="films-made" data-surface={surface} style={{ margin: '10px 0', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', textAlign: 'center' }}>
      <span aria-hidden="true" style={{ color: 'var(--accent)' }}>● </span>{line}
    </p>
  )
}

/** "≈ N more films like this a month on Starter · …" + a conta; null quando o filme não dá base honesta. */
export function FilmsLikeThisNote({ qualityMode, seconds }: { qualityMode: string | null | undefined; seconds: number | null | undefined }) {
  const value = filmsLikeThis(qualityMode, seconds)
  const line = filmsLikeThisLine(value)
  if (!line) return null
  return (
    <span data-valor-no-checkout="films-like-this" style={{ display: 'block', marginTop: 4 }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{line}</span>
      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)' }}>{filmsLikeThisMath(value)}</span>
    </span>
  )
}

const CSS = `
.vnc{max-width:760px;margin:22px auto 0;padding:18px 20px;border-radius:20px;background:var(--card);border:1px solid var(--border);color:var(--text)}
.vnc-open{display:block;width:100%;min-height:44px;border:0;background:transparent;color:var(--text);font:inherit;font-size:15px;font-weight:700;text-align:left;cursor:pointer;padding:0}
.vnc-open span{color:var(--accent)}
.vnc-q{margin:14px 0 6px;font-size:13px;font-weight:700;color:var(--muted)}
.vnc-seg{display:flex;flex-wrap:wrap;gap:6px}
.vnc-opt{min-height:40px;border:1px solid var(--border);border-radius:999px;padding:6px 14px;font:inherit;font-size:13.5px;font-weight:600;color:var(--text);background:var(--card2);cursor:pointer}
.vnc-opt small{display:block;font-size:11px;font-weight:500;color:var(--muted)}
.vnc-opt[aria-pressed=true]{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.vnc-opt:focus-visible,.vnc-go:focus-visible,.vnc-open:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.vnc-out{margin-top:16px;padding:14px;border-radius:14px;background:var(--card2)}
.vnc-plan{margin:0;font-size:18px;font-weight:800}
.vnc-verdict{margin:4px 0 0;font-size:14px}
.vnc-math{margin:6px 0 0;font-size:12px;color:var(--muted)}
.vnc-go{margin-top:10px;min-height:44px;border:0;border-radius:12px;padding:10px 16px;font:inherit;font-size:14px;font-weight:800;background:var(--accent);color:var(--on-accent);cursor:pointer}
`

/** "Which plan fits me?" — 3 perguntas, o plano mais barato que cobre, a conta à vista. Só cliente; nada vai ao servidor. */
export function PlanFinder() {
  const [open, setOpen] = useState(false)
  const [perWeek, setPerWeek] = useState<number | null>(null)
  const [seconds, setSeconds] = useState<number | null>(null)
  const [engine, setEngine] = useState<PlanFinderEngine | null>(null)
  const sentKey = useRef<string | null>(null)
  const result = perWeek !== null && seconds !== null && engine !== null ? recommendPlan({ perWeek, seconds, engine }) : null

  useEffect(() => {
    if (!result) return
    const key = `${perWeek}|${seconds}|${engine}`
    if (sentKey.current === key) return
    sentKey.current = key
    void trackEvent(PLAN_FINDER_RECOMMENDED_EVENT, {
      version: VALOR_NO_CHECKOUT_VERSION, surface: 'pricing', per_week: perWeek, seconds, engine,
      films_per_month: result.filmsPerMonth, credits_needed: result.creditsNeeded, tier: result.tier, covers: result.covers,
    })
  }, [result, perWeek, seconds, engine])

  return (
    <section className="vnc" data-valor-no-checkout="plan-finder" aria-label="Which plan fits me?">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <button type="button" className="vnc-open" aria-expanded={open} onClick={() => {
        if (!open) void trackEvent(PLAN_FINDER_OPENED_EVENT, { version: VALOR_NO_CHECKOUT_VERSION, surface: 'pricing' })
        setOpen(!open)
      }}>
        Which plan fits me? <span>{open ? 'Hide' : 'Answer 3 quick questions →'}</span>
      </button>
      {open ? (
        <>
          <p className="vnc-q">1. How many videos do you want to post?</p>
          <div className="vnc-seg" role="group" aria-label="Videos per week">
            {PLAN_FINDER_PER_WEEK.map((o) => <button key={o.value} type="button" className="vnc-opt" aria-pressed={perWeek === o.value} onClick={() => setPerWeek(o.value)}>{o.label}</button>)}
          </div>
          <p className="vnc-q">2. How long is each video?</p>
          <div className="vnc-seg" role="group" aria-label="Video length">
            {PLAN_FINDER_LENGTHS.map((s) => <button key={s} type="button" className="vnc-opt" aria-pressed={seconds === s} onClick={() => setSeconds(s)}>{s} seconds</button>)}
          </div>
          <p className="vnc-q">3. Which look?</p>
          <div className="vnc-seg" role="group" aria-label="Engine">
            {PLAN_FINDER_ENGINES.map((e) => <button key={e.key} type="button" className="vnc-opt" aria-pressed={engine === e.key} onClick={() => setEngine(e.key)}>{e.label}<small>{e.hint}</small></button>)}
          </div>
          {result ? (
            <div className="vnc-out" aria-live="polite" data-tier={result.tier} data-covers={result.covers ? '1' : '0'}>
              <p className="vnc-plan">{result.name} · {formatCheckoutMoney('usd', result.monthlyUsdMinor)}/month</p>
              <p className="vnc-verdict">{planFinderVerdictLine(result)}</p>
              <p className="vnc-math">{planFinderMathLine(result)}. Credits come back if a render fails.</p>
              <button type="button" className="vnc-go" onClick={() => {
                const card = typeof document !== 'undefined' ? document.getElementById(pricingTierCardId(result.tier)) : null
                if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' })
                else if (typeof window !== 'undefined') window.location.hash = 'plans'
              }}>See {result.name} →</button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
