// KINEO-PRECOS-CARTAO-VALOR-2026-10-09 — o cartão de plano que mostra o que o plano COMPRA (pedido do fundador, 09/10,
// prints da InVideo): créditos → imagens Nano Banana Pro, clipes por motor e filmes de 60 s, num palco escuro com uma cor
// por plano (Starter prata, Creator âmbar "Most popular", Studio verde-água). Só MARCAÇÃO e estilo: os números chegam
// prontos de lib/pricingPlanValue.ts (que lê as funções que a rota cobra) e o botão chama o MESMO handleBuy do /pricing.
// Interruptor: PRICING_VALUE_CARDS_PUBLIC em app/pricing/PricingClient.tsx (false = a página de hoje; ?preview=valor mostra
// este cartão só para quem abrir o link, para o fundador aprovar antes de ligar).
import type { ReactNode } from 'react'
import { planValueCardLines, type PlanValue } from '@/lib/pricingPlanValue'

export type PlanValueTier = 'starter' | 'basic' | 'pro'

export const PLAN_VALUE_TAGLINES: Record<PlanValueTier, string> = {
  starter: 'For your first AI videos',
  basic: 'For creators who post every week',
  pro: 'For studios, brands and agencies',
}

export const PLAN_VALUE_STAGE_CSS = `
.pv-stage{--pv-bg:#0b0e14;--pv-text:#f3f5f8;--pv-muted:#9aa4b2;--pv-faint:#6b7584;--pv-line:rgba(255,255,255,.08);--pv-line2:rgba(255,255,255,.16);
  position:relative;margin:8px auto 0;max-width:1120px;border-radius:28px;padding:34px 22px 26px;color:var(--pv-text);
  background:radial-gradient(1200px 420px at 50% -10%,rgba(245,165,36,.10),transparent 60%),radial-gradient(900px 380px at 100% 0%,rgba(45,212,191,.10),transparent 55%),linear-gradient(180deg,#0f131c 0%,#0b0e14 100%);
  box-shadow:0 30px 80px -40px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.06)}
.pv-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:stretch}
@media (max-width:900px){.pv-grid{grid-template-columns:1fr}.pv-stage{padding:26px 14px 20px;border-radius:22px}}
.pv-card{position:relative;display:flex;flex-direction:column;border-radius:20px;padding:22px 20px 18px;border:1px solid var(--pv-line);
  background:linear-gradient(180deg,#171b24 0%,#11141b 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.05);transition:transform .2s ease,border-color .2s ease}
.pv-card:hover{transform:translateY(-2px);border-color:var(--pv-line2)}
.pv-card[data-tier=basic]{border-color:rgba(245,165,36,.55);background:linear-gradient(180deg,#2a2015 0%,#15110b 62%,#120f0b 100%);
  box-shadow:0 0 0 1px rgba(245,165,36,.25),0 26px 70px -30px rgba(245,165,36,.45),inset 0 1px 0 rgba(255,255,255,.06)}
.pv-card[data-tier=pro]{border-color:rgba(45,212,191,.35);background:linear-gradient(180deg,#0f2b29 0%,#0d1a1b 62%,#0c1516 100%)}
.pv-card[data-requested=true]{outline:2px solid #6aa8ff;outline-offset:3px}
.pv-badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);border-radius:999px;padding:4px 12px;font-size:10px;font-weight:900;
  letter-spacing:.14em;text-transform:uppercase;color:#1a1206;background:linear-gradient(90deg,#ffd27a,#f5a524);box-shadow:0 8px 22px -8px rgba(245,165,36,.8)}
.pv-name{font-size:22px;font-weight:900;letter-spacing:.02em;text-transform:uppercase;line-height:1}
.pv-tag{margin-top:6px;font-size:12.5px;color:var(--pv-muted)}
.pv-box{margin-top:16px;border-radius:14px;padding:14px 14px 12px;background:rgba(255,255,255,.035);border:1px solid var(--pv-line)}
.pv-credits{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:800}
.pv-bolt{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:999px;font-size:12px;background:rgba(255,255,255,.08)}
.pv-card[data-tier=basic] .pv-bolt{background:rgba(245,165,36,.18);color:#ffcf73}
.pv-card[data-tier=pro] .pv-bolt{background:rgba(45,212,191,.16);color:#7ef0dc}
.pv-lines{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
.pv-line{display:flex;align-items:baseline;gap:8px;font-size:13px;color:#d9dee6}
.pv-sym{width:12px;flex:none;color:var(--pv-faint);font-weight:800;text-align:center}
.pv-count{font-weight:900;color:#fff;font-variant-numeric:tabular-nums}
.pv-card[data-tier=basic] .pv-count{color:#ffd27a}
.pv-card[data-tier=pro] .pv-count{color:#7ef0dc}
.pv-sec{color:var(--pv-faint);font-size:11.5px}
.pv-pool{margin-top:10px;font-size:11px;color:var(--pv-faint)}
.pv-price{margin-top:18px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.pv-amount{font-size:38px;font-weight:900;letter-spacing:-.02em;line-height:1}
.pv-per{font-size:12.5px;color:var(--pv-muted)}
.pv-note{margin-top:4px;font-size:11.5px;color:var(--pv-muted)}
.pv-cta{margin-top:16px;display:block;width:100%;border:0;border-radius:12px;padding:13px 16px;font-size:14.5px;font-weight:900;cursor:pointer;
  color:#0b0e14;background:#f3f5f8;transition:filter .15s ease,transform .15s ease}
.pv-cta:hover{filter:brightness(1.06);transform:translateY(-1px)}
.pv-cta:disabled{opacity:.6;cursor:wait}
.pv-cta:focus-visible{outline:3px solid #6aa8ff;outline-offset:2px}
.pv-card[data-tier=basic] .pv-cta{background:linear-gradient(180deg,#ffc14d,#f08c1a);color:#1a1206}
.pv-card[data-tier=pro] .pv-cta{background:linear-gradient(180deg,#9ff5e6,#34d3bd);color:#062420}
.pv-foot{margin-top:10px;font-size:11px;color:var(--pv-faint);text-align:center}
.pv-extra{margin-top:8px}
.pv-matrix{margin-top:26px;border-top:1px solid var(--pv-line);padding-top:20px}
.pv-mtitle{font-size:15px;font-weight:900;text-align:center}
.pv-msub{margin-top:4px;font-size:12px;color:var(--pv-muted);text-align:center}
.pv-mwrap{margin-top:14px;overflow-x:auto}
.pv-mtable{width:100%;min-width:560px;border-collapse:collapse;font-size:13px}
.pv-mtable th,.pv-mtable td{padding:9px 10px;border-bottom:1px solid var(--pv-line);text-align:center}
.pv-mtable th:first-child,.pv-mtable td:first-child{text-align:left}
.pv-mtable thead th{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--pv-muted)}
.pv-mtable thead th[data-tier=basic]{color:#ffd27a}
.pv-mtable thead th[data-tier=pro]{color:#7ef0dc}
.pv-mtable td{font-variant-numeric:tabular-nums;font-weight:800}
.pv-mtable .pv-msec{font-weight:600;color:var(--pv-faint);font-size:11.5px}
.pv-mtable .pv-mgroup td{padding-top:16px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--pv-faint);font-weight:900;text-align:left}
.pv-dash{color:var(--pv-faint);font-weight:600}
@media (prefers-reduced-motion:reduce){.pv-card,.pv-cta{transition:none}.pv-card:hover,.pv-cta:hover{transform:none}}
`

export interface PlanValueCardProps {
  tier: PlanValueTier
  name: string
  popular: boolean
  requested: boolean
  cardId?: string
  value: PlanValue
  amount: string
  per: string
  note?: ReactNode
  ctaLabel: string
  ctaDisabled: boolean
  onBuy: () => void
  extra?: ReactNode
  footnote?: string
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export function PlanValueCard(props: PlanValueCardProps) {
  const lines = planValueCardLines(props.value)
  return (
    <div className="pv-card" data-tier={props.tier} data-requested={props.requested ? 'true' : undefined} id={props.cardId}>
      {props.popular ? <div className="pv-badge">Most popular</div> : null}
      <div className="pv-name">{props.name}</div>
      <div className="pv-tag">{PLAN_VALUE_TAGLINES[props.tier]}</div>
      <div className="pv-box">
        <div className="pv-credits">
          <span className="pv-bolt" aria-hidden="true">⚡</span>
          <span>
            <span className="pv-count">{props.value.credits}</span> credits / month
          </span>
        </div>
        <ul className="pv-lines">
          <li className="pv-line">
            <span className="pv-sym" aria-hidden="true">=</span>
            <span>
              <span className="pv-count">{lines.images.count}</span> {lines.images.label} {plural(lines.images.count, 'image', 'images')}
            </span>
          </li>
          {lines.clips.map((c) => (
            <li className="pv-line" key={c.engine}>
              <span className="pv-sym" aria-hidden="true">≈</span>
              <span>
                <span className="pv-count">{c.count}</span> {c.label} {plural(c.count, 'clip', 'clips')} <span className="pv-sec">· {c.seconds} s</span>
              </span>
            </li>
          ))}
          {lines.film ? (
            <li className="pv-line">
              <span className="pv-sym" aria-hidden="true">≈</span>
              <span>
                <span className="pv-count">{lines.film.count}</span> finished {lines.film.seconds} s {plural(lines.film.count, 'film', 'films')} <span className="pv-sec">· {lines.film.label}, narrated</span>
              </span>
            </li>
          ) : null}
        </ul>
        <div className="pv-pool">One credit pool: mix images, clips and films any way you like.</div>
      </div>
      <div className="pv-price">
        <span className="pv-amount">{props.amount}</span>
        <span className="pv-per">{props.per}</span>
      </div>
      {props.note ? <div className="pv-note">{props.note}</div> : null}
      <div style={{ flex: 1 }} />
      <button type="button" className="pv-cta" disabled={props.ctaDisabled} onClick={props.onBuy}>
        {props.ctaLabel}
      </button>
      {props.extra ? <div className="pv-extra">{props.extra}</div> : null}
      {props.footnote ? <div className="pv-foot">{props.footnote}</div> : null}
    </div>
  )
}

export interface PlanValueMatrixPlan {
  tier: PlanValueTier
  name: string
  value: PlanValue
}

/** A tabela completa: tudo o que cada plano faz por mês, motor por motor (contagem = créditos ÷ custo, arredondado para baixo). */
export function PlanValueMatrix({ plans }: { plans: PlanValueMatrixPlan[] }) {
  if (plans.length === 0) return null
  const ref = plans[0].value
  const cell = (n: number) => (n >= 1 ? n : <span className="pv-dash">—</span>)
  return (
    <div className="pv-matrix" id="what-each-plan-makes">
      <div className="pv-mtitle">What each plan makes in a month</div>
      <div className="pv-msub">Counts are whole items per monthly credit grant, rounded down. One credit pool: mix them.</div>
      <div className="pv-mwrap">
        <table className="pv-mtable">
          <thead>
            <tr>
              <th scope="col">Output</th>
              {plans.map((p) => (
                <th scope="col" key={p.tier} data-tier={p.tier}>{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {ref.images.label} images <span className="pv-msec">· {ref.images.creditsEach} cr each</span>
              </td>
              {plans.map((p) => <td key={p.tier}>{cell(p.value.images.count)}</td>)}
            </tr>
            <tr className="pv-mgroup"><td colSpan={plans.length + 1}>AI clips (one scene, no narration)</td></tr>
            {ref.clips.map((c) => (
              <tr key={`clip-${c.engine}`}>
                <td>
                  {c.label} <span className="pv-msec">· {c.seconds} s · {c.creditsEach} cr</span>
                </td>
                {plans.map((p) => {
                  const mine = p.value.clips.find((x) => x.engine === c.engine)
                  return <td key={p.tier}>{cell(mine ? mine.count : 0)}</td>
                })}
              </tr>
            ))}
            <tr className="pv-mgroup"><td colSpan={plans.length + 1}>Finished narrated films · {ref.films[0]?.seconds ?? ''} s</td></tr>
            {ref.films.map((f) => (
              <tr key={`film-${f.engine}`}>
                <td>
                  {f.label} <span className="pv-msec">· {f.creditsEach} cr</span>
                </td>
                {plans.map((p) => {
                  const mine = p.value.films.find((x) => x.engine === f.engine)
                  return <td key={p.tier}>{cell(mine ? mine.count : 0)}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
