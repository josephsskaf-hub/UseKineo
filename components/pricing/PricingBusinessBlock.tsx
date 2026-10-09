// KINEO-BUSINESS-84-2026-10-09 — o bloco "For businesses" do /pricing, EMBAIXO dos 3 cartões (que ficam intactos).
//
// Decisão do fundador (09/10, "sim pra as 4"): plano Business a US$ 84/mês, self-serve no Studio Ads. Todo número
// desta tela vem de lib/businessPlan.ts (que lê lib/checkoutPricing.ts e lib/ads/v2Tiers.ts): preço, créditos e a
// promessa "N product ads of 15 s per month" — nada digitado aqui. Cores só pelos tokens da página (var(--text),
// var(--card), var(--accent)…), que já trocam entre claro e escuro.
//
// O botão chama o MESMO handleBuy da página (onBuy): anti-duplo-clique, telemetria e o checkout ?tier=business.
// O link secundário leva à oferta "feito para você" (Kineo Empresas: Express / Pro, pagamento único).
import {
  BUSINESS_ADS_PROMISE,
  BUSINESS_BULLETS,
  BUSINESS_DFY_HREF,
  BUSINESS_MONTHLY_CREDITS,
  BUSINESS_PAGE_PATH,
  BUSINESS_PRICE_LABEL,
} from '@/lib/businessPlan'

const CSS = `
.kb-biz{margin:56px auto 0;max-width:64rem;scroll-margin-top:6rem}
.kb-biz-card{display:grid;grid-template-columns:1.1fr .9fr;gap:28px;align-items:center;border:1px solid var(--border2);background:var(--card);border-radius:22px;padding:30px 32px}
.kb-biz-eyebrow{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.kb-biz h2{margin:8px 0 0;font-size:clamp(1.5rem,3vw,2rem);font-weight:750;line-height:1.15;color:var(--text)}
.kb-biz-promise{margin:10px 0 0;font-size:15px;font-weight:650;color:var(--accent)}
.kb-biz-list{margin:18px 0 0;padding:0;list-style:none;display:grid;gap:8px}
.kb-biz-list li{display:flex;gap:10px;font-size:14px;line-height:1.45;color:var(--text2,var(--text))}
.kb-biz-list li::before{content:"✓";font-weight:800;color:var(--accent)}
.kb-biz-buy{border:1px solid var(--border);background:var(--card2,var(--card));border-radius:18px;padding:24px;text-align:center}
.kb-biz-price{font-size:44px;font-weight:800;line-height:1;color:var(--text)}
.kb-biz-price small{font-size:15px;font-weight:600;color:var(--muted)}
.kb-biz-note{margin:8px 0 0;font-size:12.5px;color:var(--muted)}
.kb-biz-cta{display:block;width:100%;margin:18px 0 0;border:0;border-radius:12px;padding:13px 16px;font-size:15px;font-weight:750;cursor:pointer;background:var(--accent);color:var(--on-accent,#fff)}
.kb-biz-cta[disabled]{opacity:.7;cursor:progress}
.kb-biz-links{margin:14px 0 0;display:grid;gap:6px;font-size:13px}
.kb-biz-links a{color:var(--accent);font-weight:650;text-decoration:none}
.kb-biz-links a:hover{text-decoration:underline}
@media (max-width:760px){.kb-biz-card{grid-template-columns:1fr;padding:22px 18px}.kb-biz-price{font-size:38px}}
`

export default function PricingBusinessBlock({ onBuy, pending }: { onBuy: () => void; pending: boolean }) {
  return (
    <section id="business" className="kb-biz" aria-labelledby="kb-biz-title" data-testid="pricing-business-block">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="kb-biz-card">
        <div>
          <div className="kb-biz-eyebrow">Business plan</div>
          <h2 id="kb-biz-title">For businesses</h2>
          <p className="kb-biz-promise">{BUSINESS_ADS_PROMISE}</p>
          <ul className="kb-biz-list">
            {BUSINESS_BULLETS.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
        <div className="kb-biz-buy">
          <div className="kb-biz-price">{BUSINESS_PRICE_LABEL}<small>/mo</small></div>
          <p className="kb-biz-note">{BUSINESS_MONTHLY_CREDITS} credits a month · billed monthly · cancel anytime</p>
          <button type="button" className="kb-biz-cta" disabled={pending} onClick={onBuy}>
            {pending ? 'Opening secure checkout…' : 'Get Business →'}
          </button>
          <div className="kb-biz-links">
            <a href={BUSINESS_DFY_HREF}>Prefer we make it for you? →</a>
            <a href={BUSINESS_PAGE_PATH}>How Business works</a>
          </div>
        </div>
      </div>
    </section>
  )
}
