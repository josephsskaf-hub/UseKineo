// KINEO-PRECOS-CARTAO-VALOR-2026-10-09 — o cartão de plano que mostra o que o plano COMPRA (pedido do fundador, 09/10,
// prints da InVideo): créditos → imagens Nano Banana Pro, clipes e filmes por motor. Só MARCAÇÃO e estilo: os números saem
// de lib/pricingPlanValue.ts (que lê as funções que a rota cobra, pelo MESMO modelo das tabelas do /pricing) e o botão chama
// o MESMO handleBuy da página.
//
// KINEO-PRECOS-REFINO-2026-10-09 (fundador, madrugada de 09/10, print da InVideo ao lado): "mais refinado, menos cores, mais
// fácil da pessoa ver… texto mais amigável… o botão de comprar no meio do plano, abaixo do preço: Get Starter, Get Creator,
// Get Studio". O cartão segue o desenho da InVideo: painel do topo (nome, frase, créditos = o que eles compram), preço com o
// mensal riscado no anual, o botão logo abaixo do preço, a economia do anual, e depois a lista por motor e o que vem incluso.
// UMA família (a do site), seis tamanhos com papel fixo, e UMA cor de destaque por paleta (o plano popular e o botão dele).
// As 4 paletas são opções para o fundador escolher o norte: porcelana (a do site, segue o tema claro/escuro), cobalto,
// âmbar e tinta (palco escuro). A página escolhe por PRICING_VALUE_PALETTE (app/pricing/PricingClient.tsx); ?tema= mostra
// as outras só para quem abrir o link.
//
// O cartão calcula os próprios números (planValueFor + twoProductsModelForPage) em vez de recebê-los prontos: os harnesses
// de render do /pricing trocam todo import de @/components por um stub, e uma conta feita dentro do PricingClient com uma função
// importada de componente quebrava a página no teste.
import type { ReactNode } from 'react'
import { twoProductsModelForPage } from '@/components/pricing/TwoProductsPricing'
import { IMG_NANOBANANA_CR } from '@/lib/marketingPrice'
import { planValueCardLines, planValueFor, type PlanValue } from '@/lib/pricingPlanValue'

export type PlanValueTier = 'starter' | 'basic' | 'pro'

export const PLAN_VALUE_PALETTES = ['porcelana', 'cobalto', 'ambar', 'tinta'] as const
export type PlanValuePalette = (typeof PLAN_VALUE_PALETTES)[number]
export const isPlanValuePalette = (x: unknown): x is PlanValuePalette =>
  typeof x === 'string' && (PLAN_VALUE_PALETTES as readonly string[]).includes(x)

export const PLAN_VALUE_TAGLINES: Record<PlanValueTier, string> = {
  starter: 'For your first AI videos',
  basic: 'For creators who post every week',
  pro: 'For brands, agencies and daily posting',
}

/** A imagem do cartão: Nano Banana Pro ao custo da rota /api/images/generate (espelho em lib/marketingPrice.ts). */
export const PLAN_VALUE_IMAGE = { label: 'Nano Banana Pro', creditsEach: IMG_NANOBANANA_CR }

/** O que `credits` compra por mês, com o modelo que o /pricing mostra hoje. */
export function planValueForPage(credits: number): PlanValue {
  return planValueFor(credits, twoProductsModelForPage(), PLAN_VALUE_IMAGE)
}

// Vai para a página por <style dangerouslySetInnerHTML> (string fixa, sem dado de fora): como filho de <style>, o React
// escapa o '>' do seletor no servidor, o navegador recebe outro CSS e a hidratação da página inteira quebra.
export const PLAN_VALUE_STAGE_CSS = `
.pv-stage{--pv-card-bg:var(--card);--pv-head-bg:var(--card2);--pv-line:var(--border);--pv-text:var(--text);--pv-muted:var(--muted);
  --pv-faint:var(--muted2);--pv-accent:var(--indigo);--pv-chip-bg:var(--accent-soft);--pv-chip-text:var(--indigo);--pv-pop-line:var(--indigo);
  --pv-pop-bg:var(--card);--pv-pop-shadow:0 26px 60px -36px rgba(10,92,255,.55);--pv-cta-bg:var(--text);--pv-cta-text:var(--bg);
  --pv-cta-pop-bg:var(--indigo);--pv-cta-pop-text:var(--on-accent);
  position:relative;margin:4px auto 0;max-width:1120px;color:var(--pv-text);font-family:var(--font-sans)}
.pv-stage[data-palette=cobalto],.pv-stage[data-palette=ambar],.pv-stage[data-palette=tinta]{color-scheme:dark;
  --pv-card-bg:#0F131A;--pv-head-bg:#171C26;--pv-line:#232A37;--pv-text:#F2F4F7;--pv-muted:#A3ABB8;--pv-faint:#707A8A;
  --pv-cta-bg:#F2F4F7;--pv-cta-text:#07090D;padding:28px 20px 24px;border-radius:28px;background:#07090D}
.pv-stage[data-palette=cobalto]{--pv-accent:#4D8DFF;--pv-chip-bg:rgba(77,141,255,.16);--pv-chip-text:#A9C6FF;--pv-pop-line:rgba(77,141,255,.7);
  --pv-pop-bg:linear-gradient(180deg,#132036 0%,#0F131A 52%);--pv-pop-shadow:0 30px 70px -38px rgba(77,141,255,.6);--pv-cta-pop-bg:#0A5CFF;--pv-cta-pop-text:#FFFFFF;
  background:radial-gradient(900px 340px at 50% -14%,rgba(77,141,255,.16),transparent 62%),#07090D}
.pv-stage[data-palette=ambar]{--pv-accent:#F5A524;--pv-chip-bg:rgba(245,165,36,.16);--pv-chip-text:#FFD27A;--pv-pop-line:rgba(245,165,36,.62);
  --pv-pop-bg:linear-gradient(180deg,#241A0D 0%,#0F131A 55%);--pv-pop-shadow:0 30px 70px -38px rgba(245,165,36,.5);--pv-cta-pop-bg:#F5A524;--pv-cta-pop-text:#1A1206;
  background:radial-gradient(900px 340px at 50% -14%,rgba(245,165,36,.11),transparent 62%),#07090D}
.pv-stage[data-palette=tinta]{--pv-accent:#F2F4F7;--pv-chip-bg:#F2F4F7;--pv-chip-text:#07090D;--pv-pop-line:rgba(242,244,247,.6);--pv-pop-bg:#131821;
  --pv-pop-shadow:none;--pv-cta-pop-bg:#F2F4F7;--pv-cta-pop-text:#07090D;--pv-cta-bg:transparent;--pv-cta-text:#F2F4F7}
.pv-stage[data-palette=tinta] .pv-cta:not(.pv-cta-pop){box-shadow:inset 0 0 0 1px rgba(242,244,247,.3)}
.pv-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:stretch}
.pv-card{position:relative;display:flex;flex-direction:column;min-width:0;border-radius:22px;padding:8px;background:var(--pv-card-bg);border:1px solid var(--pv-line)}
.pricing-blue #plans>.pv-card[data-popular=true]{border-color:var(--pv-pop-line);background:var(--pv-pop-bg);box-shadow:var(--pv-pop-shadow)!important}
.pv-card[data-requested=true]{outline:2px solid var(--pv-accent);outline-offset:3px}
.pv-head{border-radius:16px;padding:18px 18px 16px;background:var(--pv-head-bg)}
.pv-title{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.pv-name{font-size:20px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;line-height:1.1}
.pv-chip{border-radius:6px;padding:3px 7px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;line-height:1.2;background:var(--pv-chip-bg);color:var(--pv-chip-text)}
.pv-chip.pv-deal{background:var(--pv-cta-pop-bg);color:var(--pv-cta-pop-text)}
.pv-tag{margin:6px 0 0;font-size:13px;font-weight:500;color:var(--pv-muted)}
.pv-rule{height:1px;margin:14px 0;border:0;background:var(--pv-line)}
.pv-credits{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700}
.pv-credits svg{width:18px;height:18px;flex:none}
.pv-lines{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px}
.pv-line{display:flex;gap:8px;font-size:13.5px;font-weight:500;line-height:1.4}
.pv-sym{width:14px;flex:none;text-align:center;color:var(--pv-faint);font-weight:700}
.pv-n{font-weight:700;font-variant-numeric:tabular-nums}
.pv-dim{color:var(--pv-muted)}
.pv-mix{margin:10px 0 0;font-size:12px;color:var(--pv-faint)}
.pv-buy{padding:18px 10px 4px}
.pv-price{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px}
.pv-was{font-size:18px;font-weight:600;color:var(--pv-faint);text-decoration:line-through}
.pv-amount{font-size:40px;font-weight:800;letter-spacing:-.02em;line-height:1;font-variant-numeric:tabular-nums}
.pv-per{font-size:13px;font-weight:500;color:var(--pv-muted)}
.pv-note{margin:6px 0 0;font-size:12px;color:var(--pv-muted)}
.pv-cta{margin-top:14px;display:block;width:100%;min-height:48px;border:0;border-radius:12px;padding:12px 16px;font:inherit;font-size:15px;font-weight:700;
  cursor:pointer;background:var(--pv-cta-bg);color:var(--pv-cta-text);transition:filter var(--dur-fast) var(--ease-swift),transform var(--dur-fast) var(--ease-swift)}
.pv-cta.pv-cta-pop{background:var(--pv-cta-pop-bg);color:var(--pv-cta-pop-text)}
.pv-cta:hover{filter:brightness(1.08);transform:translateY(-1px)}
.pv-cta:disabled{opacity:.6;cursor:wait}
.pv-cta:focus-visible{outline:2px solid var(--pv-accent);outline-offset:3px}
.pv-save{margin:10px 0 0;text-align:center;font-size:12.5px;font-weight:500;color:var(--pv-muted)}
.pv-save b{color:var(--pv-text);font-weight:700}
.pv-extra{margin-top:8px}
.pv-sec{margin:16px 10px 0;padding-top:14px;border-top:1px solid var(--pv-line)}
.pv-label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--pv-muted)}
.pv-table{width:100%;margin-top:6px;border-collapse:collapse;font-size:13.5px}
.pv-table th{padding:4px 0 6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pv-faint);text-align:right;white-space:nowrap}
.pv-table th:first-child,.pv-table td:first-child{text-align:left}
.pv-table td{padding:5px 0;font-weight:500;text-align:right;white-space:nowrap}
.pv-table td+td,.pv-table th+th{padding-left:14px}
.pv-table td b{font-weight:700;font-variant-numeric:tabular-nums}
.pv-none{color:var(--pv-faint)}
.pv-caption{margin:8px 0 0;font-size:12px;line-height:1.45;color:var(--pv-faint)}
.pv-inc{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:2px}
.pv-inc li{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13.5px;font-weight:500}
.pv-inc svg{width:15px;height:15px;flex:none;color:var(--pv-accent)}
.pv-stage[data-palette=porcelana] .pv-inc svg{color:var(--pv-text)}
.pv-foot{margin:auto 10px 6px;padding-top:14px;font-size:12px;color:var(--pv-faint);text-align:center}
@media (max-width:900px){.pv-grid{grid-template-columns:1fr;gap:20px}
  .pv-card[data-popular=true]{order:-1}
  .pv-stage[data-palette=cobalto],.pv-stage[data-palette=ambar],.pv-stage[data-palette=tinta]{padding:18px 12px;border-radius:22px}}
@media (prefers-reduced-motion:reduce){.pv-cta{transition:none}.pv-cta:hover{transform:none}}
`

export interface PlanValueCardProps {
  tier: PlanValueTier
  name: string
  popular: boolean
  requested: boolean
  cardId?: string
  /** Créditos do plano por mês (TIER_CREDITS): o cartão calcula o que eles compram. */
  credits: number
  /** O preço grande. */
  amount: string
  /** O preço cheio riscado ao lado do preço com desconto (anual, ou o 1º mês com cupom). */
  was?: string
  /** O selo do desconto ao lado do nome (KINEO-WELCOME20-NO-CARTAO-2026-10-09: "20% off" no 1º mês). */
  deal?: string
  per: string
  note?: ReactNode
  ctaLabel: string
  ctaDisabled: boolean
  onBuy: () => void
  /** A linha logo abaixo do botão (economia do anual, ou "Cancel anytime"). */
  save?: ReactNode
  extra?: ReactNode
  /** O que vem incluso, uma frase por item (a página monta: marca d'água, uso comercial, armazenamento…). */
  included: string[]
  footnote?: string
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M13 6.8 8.6 13H12l-1 4.2 4.4-6.2H12l1-4.2Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  )
}

const seconds = (list: number[]) => {
  const lo = Math.min(...list)
  const hi = Math.max(...list)
  return lo === hi ? `${lo} s` : `${lo}–${hi} s`
}

export function PlanValueCard(props: PlanValueCardProps) {
  const value = planValueForPage(props.credits)
  const lines = planValueCardLines(value)
  const topClip = lines.clips[0] ?? null
  // Uma linha por motor, na ordem do cartão (clipes); o filme do mesmo motor na coluna ao lado.
  const engines: Array<{ engine: string; label: string; clip: number | null; film: number | null }> = value.clips.map((c) => ({
    engine: c.engine,
    label: c.label,
    clip: c.count,
    film: value.films.find((f) => f.engine === c.engine)?.count ?? null,
  }))
  for (const f of value.films) if (!engines.some((e) => e.engine === f.engine)) engines.push({ engine: f.engine, label: f.label, clip: null, film: f.count })
  const clipSeconds = value.clips.length ? seconds(value.clips.map((c) => c.seconds)) : ''
  const filmSeconds = value.films.length ? seconds(value.films.map((f) => f.seconds)) : ''
  const cell = (n: number | null) => (typeof n === 'number' && n >= 1 ? <b>{n}</b> : <span className="pv-none">—</span>)
  return (
    <div className="pv-card" data-tier={props.tier} data-popular={props.popular ? 'true' : undefined} data-requested={props.requested ? 'true' : undefined} id={props.cardId}>
      <div className="pv-head">
        <div className="pv-title">
          <span className="pv-name">{props.name}</span>
          {props.popular ? <span className="pv-chip">Most popular</span> : null}
          {props.deal ? <span className="pv-chip pv-deal">{props.deal}</span> : null}
        </div>
        <p className="pv-tag">{PLAN_VALUE_TAGLINES[props.tier]}</p>
        <hr className="pv-rule" />
        <div className="pv-credits">
          <BoltIcon />
          <span>
            <span className="pv-n">{value.credits}</span> credits a month
          </span>
        </div>
        <ul className="pv-lines">
          <li className="pv-line">
            <span className="pv-sym" aria-hidden="true">=</span>
            <span>
              <span className="pv-n">{lines.images.count}</span> {lines.images.label} {plural(lines.images.count, 'image', 'images')}
            </span>
          </li>
          {topClip ? (
            <li className="pv-line">
              <span className="pv-sym" aria-hidden="true">≈</span>
              <span>
                <span className="pv-n">{topClip.count}</span> {topClip.label} {plural(topClip.count, 'clip', 'clips')} <span className="pv-dim">· {topClip.seconds} s</span>
              </span>
            </li>
          ) : null}
          {lines.film ? (
            <li className="pv-line">
              <span className="pv-sym" aria-hidden="true">≈</span>
              <span>
                <span className="pv-n">{lines.film.count}</span> narrated {plural(lines.film.count, 'film', 'films')} <span className="pv-dim">· {lines.film.seconds} s, {lines.film.label}</span>
              </span>
            </li>
          ) : null}
        </ul>
        <p className="pv-mix">One credit balance. Mix them any way you like.</p>
      </div>

      <div className="pv-buy">
        <div className="pv-price">
          {props.was ? <span className="pv-was">{props.was}</span> : null}
          <span className="pv-amount">{props.amount}</span>
          <span className="pv-per">{props.per}</span>
        </div>
        {props.note ? <p className="pv-note">{props.note}</p> : null}
        <button type="button" className={props.popular ? 'pv-cta pv-cta-pop' : 'pv-cta'} disabled={props.ctaDisabled} onClick={props.onBuy}>
          {props.ctaLabel}
        </button>
        {props.save ? <p className="pv-save">{props.save}</p> : null}
        {props.extra ? <div className="pv-extra">{props.extra}</div> : null}
      </div>

      <div className="pv-sec">
        <div className="pv-label">Each month, by engine</div>
        <table className="pv-table">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Engine</span></th>
              <th scope="col">Clips · {clipSeconds}</th>
              <th scope="col">Films · {filmSeconds}</th>
            </tr>
          </thead>
          <tbody>
            {engines.map((e) => (
              <tr key={e.engine}>
                <td>{e.label}</td>
                <td>{cell(e.clip)}</td>
                <td>{cell(e.film)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="pv-caption">A clip is one AI scene. A film is a finished Short with voice, captions and music.</p>
      </div>

      <div className="pv-sec">
        <div className="pv-label">Included</div>
        <ul className="pv-inc">
          {props.included.map((item) => (
            <li key={item}>
              <CheckIcon />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      {props.footnote ? <div className="pv-foot">{props.footnote}</div> : <div className="pv-foot" aria-hidden="true" />}
    </div>
  )
}
