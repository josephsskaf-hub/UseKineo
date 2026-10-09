'use client'
import { useState } from 'react'
import { mrrFilmCapacity, MRR_PRICING_PROOF_ENABLED, MRR_PRICING_VERSION, MRR_TIERS } from '@/lib/growth/mrrRevenueFollowthrough'
import { planName } from '@/lib/growth/planFit'
import { useMrrVisible } from '@/lib/growth/useMrrVisible'

// KINEO-PRECOS-REFINO-2026-10-09 — fundador, com o print desta caixa: "mudar a fonte e melhorar a comunicação… ser mais
// amigável". A pergunta que a caixa responde vira o título; o <select> vira três botões; a letra miúda vira uma linha só, com
// as MESMAS garantias (crédito de volta se o render falhar; dinheiro de volta em 7 dias no 1º mês pago). Fonte e cores do site.
const LENGTHS = [15, 35, 60] as const
type Length = (typeof LENGTHS)[number]

const CSS = `
.mpp{max-width:760px;margin:28px auto 0;padding:24px 22px 20px;border-radius:22px;background:var(--card);border:1px solid var(--border);color:var(--text);font-family:var(--font-sans)}
.mpp-title{margin:0;font-size:20px;font-weight:700;letter-spacing:-.01em;text-wrap:balance}
.mpp-sub{margin:6px 0 0;font-size:14px;color:var(--muted)}
.mpp-seg{display:inline-flex;gap:4px;margin-top:14px;padding:4px;border-radius:999px;background:var(--card2);border:1px solid var(--border)}
.mpp-opt{min-height:36px;border:0;border-radius:999px;padding:6px 14px;font:inherit;font-size:13.5px;font-weight:600;color:var(--muted);background:transparent;cursor:pointer}
.mpp-opt[aria-pressed=true]{background:var(--text);color:var(--bg)}
.mpp-opt:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.mpp-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:16px}
.mpp-tile{display:flex;flex-direction:column;gap:2px;padding:14px;border-radius:14px;background:var(--card2)}
.mpp-plan{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.mpp-films{font-size:14px;font-weight:500}
.mpp-films b{font-size:24px;font-weight:800;letter-spacing:-.01em;font-variant-numeric:tabular-nums}
.mpp-price{font-size:12.5px;color:var(--muted)}
.mpp-film{margin:16px 0 0;font-size:14px}
.mpp-film a{font-weight:700;color:var(--accent)}
.mpp-fine{margin:10px 0 0;font-size:12px;line-height:1.55;color:var(--muted2)}
.mpp-fine a{color:var(--muted)}
@media (max-width:600px){.mpp{padding:20px 16px 16px}.mpp-tiles{grid-template-columns:1fr}.mpp-tile{flex-direction:row;align-items:baseline;justify-content:space-between;flex-wrap:wrap}}
`

export default function MrrPricingProof() {
  const [seconds, setSeconds] = useState<Length>(35)
  const { root, gesture } = useMrrVisible('mrr_pricing_proof', MRR_PRICING_VERSION, MRR_PRICING_PROOF_ENABLED)
  if (!MRR_PRICING_PROOF_ENABLED) return null
  return <section ref={root} data-mrr-pricing-proof className="mpp" aria-labelledby="mpp-title" onClickCapture={event => {
    if ((event.target as HTMLElement).closest('a')) gesture()
  }}>
    <style dangerouslySetInnerHTML={{ __html: CSS }} />
    <h2 id="mpp-title" className="mpp-title">How many films do I get?</h2>
    <p className="mpp-sub">It depends on how long your films are. Pick a length:</p>
    <div className="mpp-seg" role="group" aria-label="Film length">
      {LENGTHS.map(s => <button key={s} type="button" className="mpp-opt" aria-pressed={seconds === s} onClick={() => { setSeconds(s); gesture() }}>{s} seconds</button>)}
    </div>
    <div className="mpp-tiles" aria-live="polite">
      {MRR_TIERS.map(tier => { const p = mrrFilmCapacity(tier, 'cinematic_ai', seconds); return p ?
        <div key={tier} className="mpp-tile"><span className="mpp-plan">{planName(tier)}</span><span className="mpp-films"><b>{p.films}</b> {p.films === 1 ? 'film' : 'films'} a month</span><span className="mpp-price">{p.price}/month</span></div> : null })}
    </div>
    <p className="mpp-film">▶ <a href="/v/83db8b63-b654-491e-a0aa-86ce1bc1f3d7">Watch Lituya Bay</a>, a narrated film made in Kineo with Seedance.</p>
    <p className="mpp-fine">Counts use Seedance 1.5 on a monthly plan, with all its credits on films of that length. If a render fails, its credits come back to you — a credit refund, not an automatic refund of your subscription payment. Your first paid month has a 7-day money-back guarantee: write to support@usekineo.com within 7 days of the first charge. <a href="/terms">Terms</a>.</p>
  </section>
}
