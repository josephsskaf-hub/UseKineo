// KINEO-PRECOS-DOIS-PRODUTOS-2026-10-05 — as duas tabelas do /pricing: "Clips — per second" (produto 1, entrada) e
// "Narrated films — per film" (produto 2, premium), mais "quanto cada plano faz". Só MARCAÇÃO: todo número vem de
// lib/pricingTwoProducts.ts buildTwoProductsModel, que lê as funções que a rota cobra (clipCreditCost,
// creditCostForDuration). O preço do crédito sai de TIER_PRICES.basic / TIER_CREDITS.basic (Creator) — nunca digitado.
// Entra no /pricing só com PRECOS_DOIS_PRODUTOS_PUBLIC=true (decisão do fundador). Sem hooks e sem rede: o guardião
// renderiza a marcação no servidor.
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { DURACOES_CURTAS_PUBLIC, S25_PUBLIC, SEEDANCE_15S_PUBLIC, enginePaused } from '@/lib/engineLaunch'
import {
  TWO_PRODUCTS_CLIP_TARGETS,
  TWO_PRODUCTS_FILM_SECONDS,
  TWO_PRODUCTS_PLAN_FILM_SECONDS,
  buildTwoProductsModel,
  type PriceCell,
  type TwoProductsModel,
  type TwoProductsPlan,
} from '@/lib/pricingTwoProducts'

export const TWO_PRODUCTS_SECTION_ID = 'clips-and-films'

const PLANS: TwoProductsPlan[] = [
  { tier: 'starter', label: 'Starter', usdCentsMonthly: TIER_PRICES.starter.usd, credits: TIER_CREDITS.starter },
  { tier: 'basic', label: 'Creator', usdCentsMonthly: TIER_PRICES.basic.usd, credits: TIER_CREDITS.basic },
  { tier: 'pro', label: 'Studio', usdCentsMonthly: TIER_PRICES.pro.usd, credits: TIER_CREDITS.pro },
]

/** O modelo que a página mostra hoje (interruptores de lib/engineLaunch.ts; visitante = público). */
export function twoProductsModelForPage(): TwoProductsModel {
  return buildTwoProductsModel({
    creator: PLANS[1],
    plans: PLANS,
    visibility: {
      engineListed: (engine) => !enginePaused(engine) && (engine !== 's25' || S25_PUBLIC),
      shortDurations: DURACOES_CURTAS_PUBLIC,
      seedance15s: SEEDANCE_15S_PUBLIC,
    },
  })
}

const usd = (cents: number) => formatCheckoutMoney('usd', cents)

function Cell({ value, showSeconds, perSecond = false }: { value: PriceCell | null; showSeconds: boolean; perSecond?: boolean }) {
  if (!value) return <td className="px-3 py-2.5 text-center text-[var(--muted)]">—</td>
  return (
    <td className="px-3 py-2.5 text-center">
      <div className="font-black text-[var(--text)]">{value.credits} cr</div>
      <div className="text-[11.5px] text-[var(--muted)]">
        ≈ {usd(value.usdCents)}
        {showSeconds ? <> · {value.seconds} s</> : null}
      </div>
      {perSecond ? (
        <div className="text-[11px] text-[var(--muted)]">≈ ${(value.usdCents / 100 / value.seconds).toFixed(3)}/s</div>
      ) : null}
    </td>
  )
}

export function TwoProductsPricingView({ model }: { model: TwoProductsModel }) {
  const creditLabel = `$${model.usdPerCredit.toFixed(3)}`
  return (
    <section id={TWO_PRODUCTS_SECTION_ID} aria-labelledby={`${TWO_PRODUCTS_SECTION_ID}-title`} className="mx-auto mt-14 max-w-4xl scroll-mt-24" data-kineo="two-products-pricing">
      <div className="text-center">
        <div className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[var(--muted)]">Two ways to create</div>
        <h2 id={`${TWO_PRODUCTS_SECTION_ID}-title`} className="mt-2 text-[1.7rem] font-black tracking-tight text-[var(--text)]">
          Clips and narrated films, one credit balance
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Prices in credits. ≈ US$ uses the Creator plan rate ({creditLabel} per credit); Studio credits cost less.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6" data-kineo="pricing-clips">
        <h3 className="text-lg font-black text-[var(--text)]">Clips — per second</h3>
        <p className="mt-1 text-[13px] text-[var(--muted)]">One scene from your text or photo, no narration. The engine sets the exact length.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11.5px] uppercase tracking-wide text-[var(--muted)]">
                <th className="px-3 py-2 text-left font-extrabold">Engine</th>
                {TWO_PRODUCTS_CLIP_TARGETS.map((target) => (
                  <th key={target} className="px-3 py-2 text-center font-extrabold">~{target} s clip</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {model.clips.map((row) => (
                <tr key={row.engine} className="border-b border-[var(--border)] last:border-0">
                  <th scope="row" className="px-3 py-2.5 text-left font-bold text-[var(--text)]">{row.label}</th>
                  {row.cells.map((value, i) => (
                    <Cell key={i} value={value} perSecond showSeconds={value !== null && value.seconds !== TWO_PRODUCTS_CLIP_TARGETS[i]} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6" data-kineo="pricing-films">
        <h3 className="text-lg font-black text-[var(--text)]">Narrated films — per film</h3>
        <p className="mt-1 text-[13px] text-[var(--muted)]">Script, voice, scenes and captions, ready to post. — means that length is not offered on that engine.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11.5px] uppercase tracking-wide text-[var(--muted)]">
                <th className="px-3 py-2 text-left font-extrabold">Engine</th>
                {TWO_PRODUCTS_FILM_SECONDS.map((seconds) => (
                  <th key={seconds} className="px-3 py-2 text-center font-extrabold">{seconds} s film</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {model.films.map((row) => (
                <tr key={row.engine} className="border-b border-[var(--border)] last:border-0">
                  <th scope="row" className="px-3 py-2.5 text-left font-bold text-[var(--text)]">{row.label}</th>
                  {row.cells.map((value, i) => (
                    <Cell key={i} value={value} showSeconds={false} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6" data-kineo="pricing-plan-yield">
        <h3 className="text-lg font-black text-[var(--text)]">What each plan makes per month</h3>
        <ul className="mt-3 space-y-2 text-[13px] text-[var(--muted)]">
          {model.plans.map((plan) => (
            <li key={plan.tier}>
              <strong className="text-[var(--text)]">{plan.label}</strong> ({plan.credits} credits):{' '}
              {plan.clips.cheapest ? (
                <>up to {plan.clips.cheapest.count} {plan.clips.cheapest.engine} clips of {plan.clips.cheapest.seconds} s</>
              ) : null}
              {plan.clips.priciest && plan.clips.cheapest && plan.clips.priciest.engine !== plan.clips.cheapest.engine ? (
                <> ({plan.clips.priciest.count} on {plan.clips.priciest.engine})</>
              ) : null}
              {plan.films.cheapest ? (
                <>
                  {' '}· or {plan.films.cheapest.count} {plan.films.cheapest.engine} films of {TWO_PRODUCTS_PLAN_FILM_SECONDS} s
                </>
              ) : null}
              {plan.films.priciest && plan.films.cheapest && plan.films.priciest.engine !== plan.films.cheapest.engine ? (
                <> ({plan.films.priciest.count} on {plan.films.priciest.engine})</>
              ) : null}
              .
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11.5px] text-[var(--muted)]">Counts are rounded down. Mix clips and films freely — they share the same credits.</p>
      </div>
    </section>
  )
}

export default function TwoProductsPricing() {
  return <TwoProductsPricingView model={twoProductsModelForPage()} />
}
