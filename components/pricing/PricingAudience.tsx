'use client'
// KINEO-PLANOS-ABAS-0411 [fundador 04/11: "planos pessoa física e pessoa jurídica, na verdade planos, teams plans e business plans"] — as duas portas do /pricing.
//
// Referência: invideo.io/pricing abre em "Team plans" e "Business plans" (lido em 04/11). Aqui, para quem cria sozinho e para empresa, sem preço novo:
// a aba de empresas mostra o Business que já existe (US$ 84, 3 colegas) e leva quem precisa de mais à conversa com a gente, sem número na tela.
// Preço público é decisão do fundador: nenhum valor é digitado neste arquivo.
import type { PricingAudience } from '@/lib/pricingAudience'

const CSS = `
.kp-aud{display:flex;justify-content:center;margin:0 0 26px}
.kp-aud-box{display:inline-flex;gap:4px;padding:4px;border:1px solid var(--border);background:var(--card2,var(--card));border-radius:14px;max-width:100%}
.kp-aud-tab{border:0;background:transparent;color:var(--muted);font-size:14px;font-weight:750;padding:10px 18px;border-radius:10px;cursor:pointer;white-space:nowrap}
.kp-aud-tab:hover{color:var(--text)}
.kp-aud-tab[aria-selected="true"]{background:var(--text);color:var(--bg,#fff)}
.kp-aud-tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.kp-teams{margin:20px auto 0;max-width:64rem;display:flex;flex-wrap:wrap;gap:16px 28px;align-items:center;justify-content:space-between;border:1px solid var(--border);background:var(--card);border-radius:18px;padding:22px 28px}
.kp-teams h3{margin:0;font-size:18px;font-weight:750;color:var(--text)}
.kp-teams p{margin:6px 0 0;font-size:14px;line-height:1.5;color:var(--muted);max-width:40rem}
.kp-teams a{flex:none;border:1px solid var(--border2);border-radius:12px;padding:11px 18px;font-size:14px;font-weight:750;color:var(--text);text-decoration:none}
.kp-teams a:hover{border-color:var(--accent);color:var(--accent)}
@media (max-width:760px){.kp-aud-tab{padding:9px 12px;font-size:13px}.kp-teams{padding:20px 18px}.kp-teams a{width:100%;text-align:center}}
`

const ABAS: ReadonlyArray<{ id: PricingAudience; rotulo: string }> = [
  { id: 'individual', rotulo: 'For individuals' },
  { id: 'team', rotulo: 'For teams & business' },
]

export function PricingAudienceTabs({ audience, onChange }: { audience: PricingAudience; onChange: (a: PricingAudience) => void }) {
  return (
    <div className="kp-aud" data-testid="pricing-audience-tabs">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="kp-aud-box" role="tablist" aria-label="Who the plan is for">
        {ABAS.map((a) => (
          <button key={a.id} type="button" role="tab" className="kp-aud-tab" aria-selected={audience === a.id} data-kineo={`pricing-audience-${a.id}`} onClick={() => onChange(a.id)}>
            {a.rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Quem precisa de mais do que o Business: conversa, sem preço na tela. */
export function PricingTeamsBlock() {
  return (
    <div className="kp-teams" data-testid="pricing-teams-block">
      <div>
        <h3>Need more seats or higher volume?</h3>
        <p>For agencies and larger teams: more teammates, more credits and a video pipeline built around your brand. Tell us what you need and we will reply with a plan.</p>
      </div>
      <a href="/agencies" data-kineo="pricing-teams-contact">Talk to us →</a>
    </div>
  )
}
