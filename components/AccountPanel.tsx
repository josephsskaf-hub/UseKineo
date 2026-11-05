'use client'

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-MENU-CONTA-0411 — o painel de 1240×620 virou um menu compacto.
// ═══════════════════════════════════════════════════════════════════════════
// Fundador (04/11, olhando o menu da conta do Higgsfield): "quando abre o menu, a pessoa vê quantos créditos ela tem,
// Help Center, Affiliate Program, Join Community, Language. A gente pode fazer mais ou menos igual no nosso formato."
// Só a ideia: as cores e a forma são da casa (tokens do tema, nada de cor fixa).
//
// O QUE FICOU DO KINEO-ACCOUNT-PANEL-2026-08-19: o menu ainda RESPONDE em vez de só encaminhar. Plano, créditos e data
// de renovação vêm na cara, com os mesmos dados (saldo da barra lateral, /api/me/subscription só ao abrir, barra só com
// denominador honesto). O que saiu:
//   · top-up: o argumento antigo ("o pack mora ao lado do saldo") morreu em 04/11, fundador: "não quero mais top ups"
//     (TOPUP_SALES_OPEN=false, TOPUPS_LIVE=false). O botão levava a /pricing com a venda fechada, e abriria o modal de
//     recarga se a flag voltasse. O menu não vende crédito; quem pode subir de plano vê a linha "Upgrade".
//   · preço do plano: dizia "/mo" também para quem paga anual.
//   · bloco da biblioteca e medidor de armazenamento: viraram a linha "My videos". O medidor segue em /library
//     (KINEO-NOITE2-2026-08-17), e nenhum guardião pedia os números aqui.
//   · "Manage billing": virou o link "Billing" ao lado da data, para cancelar seguir a um clique.
//
// O QUE NÃO PODE VOLTAR:
//   · KINEO-PAINEL-PORTAL-2026-10-05: o menu fica no <body>, senão o conteúdo do Studio de vidro passa na frente dele.
//   · KINEO-SAIR-DA-CONTA-1510: o clique em Sign out não fecha o menu, ele fica aberto dizendo "Signing out…".
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

// KINEO-PAINEL-PORTAL-2026-10-05 — o painel nascia dentro da barra lateral; com o Studio de vidro (backdrop-filter) por cima,
// o conteúdo da página passava NA FRENTE do painel (print do fundador 05/10). Renderizar no <body> tira o painel de
// qualquer contexto de empilhamento de ancestral.
function portal(node: React.ReactNode) {
  if (typeof document === 'undefined') return null
  return createPortal(node, document.body)
}
import { AppearanceSettingsButton } from '@/components/AppearanceSettings'
import { InterfaceLanguageSelect, useInterfaceLanguage, useUiCopy } from '@/components/InterfaceLanguage'
import { TIER_CREDITS } from '@/lib/checkoutPricing'
import { READ_FAILED_LABEL } from '@/lib/creditsReadFailure'
import {
  ACCOUNT_MENU_LINKS,
  ACCOUNT_MENU_WIDTH_PX,
  accountCreditMeter,
  accountPlanCanUpgrade,
  accountPlanIsSubscribed,
  accountPlanName,
  accountRenewalLine,
  normalizeAccountPlan,
} from '@/lib/ui/accountMenu'
import type { MySubscription } from '@/app/api/me/subscription/route'

export interface AccountPanelProps {
  email: string
  displayName: string
  /** Valor cru de profiles.plan (vem de /api/credits); null = ainda não sabemos, e o menu não chuta. */
  plan: string | null
  credits: number | null
  /** KINEO-TELA-QUE-NAO-MENTE-2026-09-08 — "não consegui ler" não é zero. */
  creditsReadFailed?: boolean
  onClose: () => void
  onSignOut: () => void
  /** KINEO-SAIR-DA-CONTA-1510 — saída em curso: botão desligado com "Signing out…" (sem segundo clique). */
  signingOut?: boolean
  /** Fecha a sidebar no mobile junto com o painel. */
  onNavigate?: () => void
}

/** Grant mensal do plano — denominador da barra de créditos. Trial não entra: o crédito dele não é o grant do plano. */
const PLAN_GRANT: Record<string, number> = {
  starter: TIER_CREDITS.starter, basic: TIER_CREDITS.basic,
  pro: TIER_CREDITS.pro, autopilot: TIER_CREDITS.autopilot,
  business: TIER_CREDITS.business, // KINEO-BUSINESS-84-2026-10-09
}

function RowIcon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export default function AccountPanel({
  email, displayName, plan, credits, creditsReadFailed = false,
  onClose, onSignOut, onNavigate, signingOut = false,
}: AccountPanelProps) {
  const t = useUiCopy()
  const language = useInterfaceLanguage()
  const [sub, setSub] = useState<MySubscription | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Só busca quando o painel abre — é uma chamada à Stripe, não vale gastar
  // em toda navegação.
  useEffect(() => {
    let cancelled = false
    void fetch('/api/me/subscription', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<MySubscription>) : Promise.reject()))
      .then((d) => { if (!cancelled) setSub(d) })
      .catch(() => { if (!cancelled) setSub({ renewsAt: null, cancelsAtPeriodEnd: false, provider: null, amountMinor: null, status: null, payUrl: null }) })
    return () => { cancelled = true }
  }, [])

  // KINEO-SAIR-DA-CONTA-1510 — com a saída em curso nada fecha o menu: ele fica dizendo "Signing out…" até a navegação.
  const dismiss = useCallback(() => { if (!signingOut) onClose() }, [signingOut, onClose])
  const go = () => { onClose(); onNavigate?.() }

  // O foco entra no menu ao abrir e volta para quem abriu ao fechar.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.querySelector<HTMLElement>('a[href],button:not([disabled]),select')?.focus({ preventScroll: true })
    return () => { if (opener && opener !== document.body && opener.isConnected) opener.focus({ preventScroll: true }) }
  }, [])

  // Esc fecha e Tab dá a volta aqui dentro. O seletor de aparência é um <dialog> nativo por cima: com ele aberto, o
  // Esc e o Tab são dele, senão um Esc fecharia os dois de uma vez.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return
      if (event.key === 'Escape') { event.preventDefault(); dismiss(); return }
      if (event.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),select'))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dismiss])

  const planKey = normalizeAccountPlan(plan)
  const planName = accountPlanName(planKey)
  const grant = planKey && Object.prototype.hasOwnProperty.call(PLAN_GRANT, planKey) ? PLAN_GRANT[planKey] : null
  const meter = accountCreditMeter(credits, grant)
  const renewal = accountRenewalLine(sub, accountPlanIsSubscribed(planKey))
  const dateOf = (at: Date) => at.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' })

  return portal(
    <>
      <style dangerouslySetInnerHTML={{ __html: MENU_CSS }} />
      {/* Fora do menu: esta camada transparente recebe o clique. Ela cobre também a engrenagem, então clicar nela fecha
          sem reabrir; e o <dialog> de aparência fica acima dela, então escolher um tema não fecha o menu. */}
      <div className="kmc-backdrop" onClick={dismiss} aria-hidden="true" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={t('Account')} className="kmc">
        <div className="kmc-head">
          <div className="kmc-avatar" aria-hidden="true">{(displayName || email || 'U')[0]?.toUpperCase()}</div>
          <div className="kmc-who">
            <div className="kmc-name" data-clarity-mask="true">{displayName || email}</div>
            {planName && <div className="kmc-plan" data-paid={accountPlanIsSubscribed(planKey) || undefined}>{planName}</div>}
          </div>
        </div>

        <div className="kmc-credits">
          {creditsReadFailed ? (
            <div className="kmc-credits-line"><span className="kmc-credits-of">{t(READ_FAILED_LABEL)}</span></div>
          ) : (
            <div className="kmc-credits-line" data-low={meter.low || undefined}>
              <b className="kmc-credits-n">{meter.left ?? '…'}</b>
              {meter.of !== null && <span className="kmc-credits-of">/ {meter.of}</span>}
              <span className="kmc-credits-of">{t(meter.left === 1 ? 'credit left' : 'credits left')}</span>
            </div>
          )}
          {/* A barra só existe quando existe denominador honesto. Conta grátis não tem grant mensal, e desenhar uma
              barra cheia ali seria inventar um limite. */}
          {!creditsReadFailed && meter.pct !== null && (
            <span className="kmc-bar" data-low={meter.low || undefined} aria-hidden="true"><span style={{ width: `${meter.pct}%` }} /></span>
          )}
          {renewal && (
            <div className="kmc-renew">
              {renewal.kind === 'renews' && <span>{t('Renews')} <b>{dateOf(renewal.at)}</b></span>}
              {renewal.kind === 'cancels' && <span data-warn="true">{t('Cancels on')} <b>{dateOf(renewal.at)}</b> · {t('access until then')}</span>}
              {renewal.kind === 'due' && <span data-warn="true">{t('Payment issue — update your card')}</span>}
              {renewal.kind === 'active' && <span>{t('Active subscription')}</span>}
              <Link href="/account?tab=billing" onClick={go} className="kmc-billing">{t('Billing')}</Link>
            </div>
          )}
        </div>

        {accountPlanCanUpgrade(planKey) && (
          <Link href="/pricing" onClick={go} className="kmc-row kmc-row-accent">
            <RowIcon d="M12 19V5M6 11l6-6 6 6" />
            <span>{t('Upgrade')}</span>
          </Link>
        )}

        <div className="kmc-sep" />
        {ACCOUNT_MENU_LINKS.map((row) => (
          <Link key={row.id} href={row.href} onClick={go} className="kmc-row">
            <RowIcon d={row.icon} />
            <span>{t(row.label)}</span>
          </Link>
        ))}
        <div className="kmc-sep" />
        <label className="kmc-row kmc-row-control">
          <RowIcon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
          <span>{t('Language')}</span>
          <InterfaceLanguageSelect />
        </label>
        <AppearanceSettingsButton compact={false} className="kmc-row" />
        <div className="kmc-sep" />
        <button
          // KINEO-SAIR-DA-CONTA-1510 — o painel NÃO fecha mais no clique: fechava antes de qualquer resposta e a
          // pessoa, sem ver nada acontecer, clicava de novo. Agora fica aberto, desligado, dizendo "Signing out…".
          type="button"
          onClick={() => { if (!signingOut) onSignOut() }}
          disabled={signingOut}
          aria-busy={signingOut}
          className="kmc-row kmc-row-out"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3H9" />
            <path d="m15 16.5 4.5-4.5L15 7.5M19.5 12H9" />
          </svg>
          <span>{t(signingOut ? 'Signing out…' : 'Sign out')}</span>
        </button>
      </div>
    </>
  )
}

// Acima das faixas de instalar (70) e de notificação (69), que no celular cobririam o menu; abaixo dos modais de oferta.
// Só tokens do tema: claro e escuro saem daqui sem regra própria.
const MENU_CSS = `
.kmc-backdrop{position:fixed;inset:0;z-index:75;background:transparent}
.kmc{position:fixed;left:14px;bottom:72px;z-index:76;width:min(${ACCOUNT_MENU_WIDTH_PX}px,calc(100vw - 24px));max-height:calc(100vh - 86px);max-height:calc(100dvh - 86px);overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:1px;padding:8px;background:var(--card);border:1px solid var(--border);border-radius:16px;box-shadow:var(--modal-shadow);color:var(--text);animation:kmc-in .12s ease-out}
@keyframes kmc-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.kmc-head{display:flex;align-items:center;gap:11px;padding:6px 8px 10px;min-width:0}
.kmc-avatar{width:38px;height:38px;flex-shrink:0;border-radius:11px;display:flex;align-items:center;justify-content:center;background:var(--accent);color:var(--on-accent);font-size:.95rem;font-weight:800}
.kmc-who{min-width:0;flex:1}
.kmc-name{font-size:.88rem;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kmc-plan{margin-top:1px;font-size:.74rem;font-weight:600;color:var(--muted)}
.kmc-plan[data-paid]{color:var(--accent)}
.kmc-credits{margin:0 2px 5px;padding:10px 12px;border-radius:12px;background:var(--card2)}
.kmc-credits-line{display:flex;align-items:baseline;flex-wrap:wrap;gap:5px;min-width:0}
.kmc-credits-n{font-size:1.3rem;font-weight:800;line-height:1.1;letter-spacing:-.02em;color:var(--text)}
.kmc-credits-line[data-low] .kmc-credits-n{color:var(--warning)}
.kmc-credits-of{font-size:.78rem;font-weight:500;color:var(--muted)}
.kmc-bar{display:block;height:4px;margin-top:8px;border-radius:99px;background:var(--border);overflow:hidden}
.kmc-bar>span{display:block;height:100%;border-radius:99px;background:var(--accent);transition:width .35s ease}
.kmc-bar[data-low]>span{background:var(--warning)}
.kmc-renew{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:9px;font-size:.73rem;line-height:1.35;color:var(--muted)}
.kmc-renew b{font-weight:600;color:var(--text2)}
.kmc-renew [data-warn],.kmc-renew [data-warn] b{color:var(--warning)}
.kmc-billing{flex-shrink:0;font-weight:600;color:var(--accent);text-decoration:none;border-radius:4px}
.kmc-billing:hover{text-decoration:underline}
.kmc-sep{flex-shrink:0;height:1px;margin:4px 8px;background:var(--border)}
.kmc .kmc-row{display:flex;align-items:center;gap:11px;flex-shrink:0;width:100%;min-height:38px;padding:7px 10px;border:0;border-radius:9px;background:transparent;color:var(--text2);font:inherit;font-size:.84rem;font-weight:500;line-height:1.2;text-align:start;text-decoration:none;cursor:pointer}
.kmc .kmc-row>svg{width:16px;height:16px;flex-shrink:0;color:var(--muted)}
.kmc .kmc-row:hover{background:var(--card2);color:var(--text)}
.kmc .kmc-row:hover>svg{color:var(--text)}
.kmc .kmc-row-accent,.kmc .kmc-row-accent>svg,.kmc .kmc-row-accent:hover,.kmc .kmc-row-accent:hover>svg{color:var(--accent);font-weight:600}
.kmc .kmc-row-control{cursor:default;padding-block:3px}
.kmc .kmc-row-control:hover{background:transparent;color:var(--text2)}
.kmc .kmc-row-control:hover>svg{color:var(--muted)}
.kmc .kmc-row-control .kineo-interface-language{margin-inline-start:auto}
.kmc .kmc-row-out:hover:not(:disabled),.kmc .kmc-row-out:hover:not(:disabled)>svg{color:var(--danger)}
.kmc .kmc-row-out:disabled{cursor:progress;opacity:.7}
.kmc a:focus-visible,.kmc button:focus-visible,.kmc select:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.kmc .kmc-billing:focus-visible{outline-offset:2px}
@media(max-width:767px){
.kmc-backdrop{background:var(--modal-overlay)}
.kmc{left:12px;bottom:max(12px,env(safe-area-inset-bottom));max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px)}
.kmc .kmc-row{min-height:44px}
}
@media(prefers-reduced-motion:reduce){.kmc{animation:none}.kmc-bar>span{transition:none}}
`
