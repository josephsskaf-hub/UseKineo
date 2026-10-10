// KINEO-ASSINANTE-SOBE-2026-10-06 — ASSINANTE SEM CRÉDITO SOBE DE PLANO NA HORA (MRR de expansão).
//
// O defeito (auditoria de 06/10, sprint "MRR hoje"): a troca de plano sem cancelar existe desde 09/09
// (POST /api/stripe/change-plan — o upgrade de assinatura ativa rateia na próxima fatura e credita a
// diferença de grant NA HORA), mas só morava no /pricing. Na parede que o assinante de fato bate — o modal
// de "sem crédito" do /studio/create — as linhas de plano mandavam o assinante para
// /api/stripe/checkout?tier=…, que recusa a segunda assinatura e devolve ao /pricing com erro. Medido em
// 06/10: em 02/10 um Starter bateu duas vezes nessa parede com 7 créditos, 25 min depois de pagar, e saiu
// sem clicar; `plan_changed` nunca aconteceu (0 trocas na história); 4 dos 12 assinantes externos estão
// hoje abaixo de um filme Seedance de 60 s.
//
// Este módulo é a decisão PURA — o guardião scripts/test-assinante-sobe-2026-10-06.mjs o executa cru.
// Nenhum import de valor (só `import type`, apagado na compilação). Os números ENTRAM por argumento e o
// componente passa as fontes: TIER_CREDITS / TIER_PRICES de lib/checkoutPricing (as MESMAS tabelas com que
// /api/stripe/change-plan calcula o delta e grava o preço) e canPurchaseCreditTopup de
// lib/growth/topupEligibility (a régua com que o /api/stripe/checkout aceita a recarga).
//
// Regras:
//   · não assinante, ou assinatura que a troca não alcança (PayPal, autopilot, leitura que falhou) → nada;
//   · assinante ativo com degrau acima → "Switch to <próximo> now — +N credits today", onde N = grant do
//     degrau de cima − grant do atual (o delta que a rota credita) e o preço = TIER_PRICES do degrau de cima;
//   · Studio (topo) → só a recarga; teste de 7 dias (trialing) → só a recarga, porque a troca no teste não
//     credita nada hoje (o grant novo vem na 1ª fatura) e a parede de "sem crédito" só vende o que paga hoje;
//   · a recarga só aparece onde o cobrador a aceita (desde 16/09 o Starter também compra recarga).
import type { PlanSwitchState, SwitchableTier } from '@/lib/growth/planSwitch'

/** Interruptor de reversão: false = nenhuma parede pinta o empurrão e o modal do Studio volta às linhas de plano de antes. */
export const SUBSCRIBER_UPGRADE_ENABLED = true

export const SUBSCRIBER_UPGRADE_VERSION = 'subscriber_upgrade_v1'
/** Impressão: uma por montagem, só quando algo é pintado. */
export const SUBSCRIBER_UPGRADE_SHOWN_EVENT = 'subscriber_upgrade_shown'
/** Clique antes da confirmação (switch | topup | plans). A troca confirmada segue no evento do /pricing, `plan_switch_clicked`. */
export const SUBSCRIBER_UPGRADE_CLICKED_EVENT = 'subscriber_upgrade_clicked'

/** A escada, de baixo para cima. Depois do Studio não há degrau: o topo só recarrega. */
export const SUBSCRIBER_LADDER: readonly SwitchableTier[] = ['starter', 'basic', 'pro']

export function nextTierUp(tier: SwitchableTier | null | undefined): SwitchableTier | null {
  const i = tier ? SUBSCRIBER_LADDER.indexOf(tier) : -1
  return i >= 0 && i < SUBSCRIBER_LADDER.length - 1 ? SUBSCRIBER_LADDER[i + 1] : null
}

export type SubscriberUpgradeOffer =
  | { kind: 'none' }
  | { kind: 'topup_only'; from: SwitchableTier }
  | { kind: 'switch'; from: SwitchableTier; to: SwitchableTier; creditsToday: number; priceMinor: number; topup: boolean }

export function subscriberUpgradeOffer(input: {
  state: PlanSwitchState
  /** TIER_CREDITS (lib/checkoutPricing) — o mapa com que a rota de troca credita a diferença. */
  credits: Readonly<Record<SwitchableTier, number>>
  /** TIER_PRICES[t].usd (lib/checkoutPricing) — o preço, em centavos, que a troca grava na assinatura. */
  pricesMinor: Readonly<Record<SwitchableTier, number>>
  /** canPurchaseCreditTopup(plano) — a régua do /api/stripe/checkout para a recarga. */
  topupAllowed: boolean
  enabled?: boolean
}): SubscriberUpgradeOffer {
  const { state } = input
  if (!(input.enabled ?? SUBSCRIBER_UPGRADE_ENABLED)) return { kind: 'none' }
  // KINEO-TROCA-BUSINESS-2026-10-10 — o estado da troca agora também traz 'business' (fora da escada): continua 'none'.
  if (!state.subscribed || !state.tier || !(SUBSCRIBER_LADDER as readonly string[]).includes(state.tier)) return { kind: 'none' }
  const from = state.tier as SwitchableTier
  const topupOnly: SubscriberUpgradeOffer = input.topupAllowed ? { kind: 'topup_only', from } : { kind: 'none' }
  const to = nextTierUp(from)
  if (!to || state.status !== 'active') return topupOnly
  const creditsToday = Math.floor(input.credits[to]) - Math.floor(input.credits[from])
  const priceMinor = Math.round(input.pricesMinor[to])
  if (!Number.isFinite(creditsToday) || creditsToday <= 0 || !Number.isFinite(priceMinor) || priceMinor <= 0) return topupOnly
  return { kind: 'switch', from, to, creditsToday, priceMinor, topup: input.topupAllowed }
}

/** O plano no vocabulário do perfil ('starter' | 'starter_trial' | …), para a régua da recarga. null = sem assinatura. */
export function planFromSwitchState(state: PlanSwitchState): string | null {
  if (!state.subscribed || !state.tier) return null
  return state.status === 'trialing' ? `${state.tier}_trial` : state.tier
}

/** Preenche {chave} sem regex: um "$" no preço nunca vira retrovisor de replace. */
export function fillCopy(template: string, vars: Readonly<Record<string, string | number>>): string {
  let out = template
  for (const [key, value] of Object.entries(vars)) out = out.split(`{${key}}`).join(String(value))
  return out
}

/**
 * As frases da peça. Cada uma é chave de lib/ui/refinementCopy.json nas 16 línguas; `addCredits` já existe
 * nos dicionários da interface (lib/ui/interface/*, interfaceLabels, interfaceHindi). Os erros da troca vêm
 * de planSwitchErrorText (lib/growth/planSwitch.ts) e também estão traduzidos no refinementCopy.
 */
export const SUBSCRIBER_UPGRADE_COPY = {
  switchCta: 'Switch to {plan} now — +{credits} credits today',
  terms: '{price}/month · the difference is prorated on your next invoice',
  confirm: 'Switch to {plan} for {price}/month? It takes effect now: +{credits} credits today, and the price difference is prorated on your next invoice.',
  switching: 'Switching…',
  done: 'Done — you are now on {plan}. Balance: {credits} credits.',
  keepCreating: 'Keep creating →',
  comparePlans: 'Compare all plans →',
  addCredits: 'Add credits →',
} as const

/** "Compare all plans" vai ao /pricing, que para quem assina já troca de plano (nunca cobra uma segunda assinatura). */
export const SUBSCRIBER_UPGRADE_PLANS_HREF = '/pricing'
