// KINEO-TRIAL-CTA-STARTER-PRIMEIRO-2026-09-27 — TESTE REVERSÍVEL POR CONSTANTE
//
// O QUE MUDA: o botão PRINCIPAL das duas superfícies de trial que pedem
// dinheiro — o banner do trial ativo (components/TrialActiveBanner.tsx) e o
// modal de fim de trial (components/TrialDowngradeModal.tsx) — passa a vender
// o Starter. O Creator continua na tela, como link secundário ("need more?
// Creator · N cr"), com o mesmo destino de sempre.
//
// O QUE NÃO MUDA: preço, créditos por plano, trial, cota e oferta. Tudo que as
// duas telas imprimem continua DERIVADO de lib/checkoutPricing.ts
// (getTierPrice / formatCheckoutMoney / TIER_CREDITS) — esta constante só
// decide QUAL plano vem primeiro.
//
// POR QUE EXISTE: sprint de 16h de 27/09/2026 (alvo MRR). Hipótese a medir:
// quem chega ao fim do trial converte mais quando o primeiro preço que vê é o
// menor. Os eventos de clique (`trial_active_banner_cta`,
// `trial_downgrade_modal_cta`) gravam o `tier` REAL do botão e `cta_role`
// ('primary' | 'secondary'), então o placar compara starter × basic por
// superfície sem ambiguidade.
//
// COMO REVERTER: trocar 'starter' por 'basic' na linha abaixo. Só isso. As
// duas telas leem daqui; com 'basic' o link secundário de Creator some
// sozinho (seria o mesmo plano duas vezes) e tudo volta ao que era antes.
//
// Arquivo PURO de propósito (sem import): os guardiões o carregam por
// readFileSync + transpile (memória `guardioes-com-alias-nao-rodam`).

export type TrialCtaTier = 'starter' | 'basic'

export const TRIAL_CTA_PRIMARY_TIER: 'starter' | 'basic' = 'starter'

// Nome de vitrine de cada tier, como /pricing e o cobrador o chamam. Não há
// função em lib/ que faça esta tradução; lib/growth/mobileStickyBillingTruth.ts
// mantém a mesma tabela.
export const TRIAL_CTA_TIER_NAME: Record<TrialCtaTier, string> = {
  starter: 'Starter',
  basic: 'Creator',
}
