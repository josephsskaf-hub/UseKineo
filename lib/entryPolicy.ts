// KINEO-VERSAO-B-ENTRADA-1-DOLAR-2026-09-08 — a política de ENTRADA da casa.
//
// ORDEM DO FUNDADOR (08/09/2026 01:20 BRT, "Aprovado"): "Vamos fazer a B:
// tirar os 25 créditos de todos. Dar a eles os créditos do motor Creator, 80cr;
// se usarem ou depois de 1 semana viram cliente a 15 USD."
//
// O que isso significa, em uma frase: ACABOU o trial grátis. A única porta de
// entrada é o trial de cartão — $1 por 7 dias no Creator, 80 créditos no ato,
// $15/mês a partir do dia 8. Ninguém faz filme sem passar o cartão.
//
// Este arquivo é PURO (sem env, sem supabase) para poder ser importado por
// qualquer página de marketing, pelo provider client-side e pelos guardiões.
// Quem obedece a ele:
//   · lib/reverseTrial.ts  → maybeActivateReverseTrial NÃO concede 25 créditos;
//                            carimba trial_status='card_required' e emite evento.
//   · lib/freeTierOffer.ts → buildFreeTierOffer devolve CARD_ENTRY_OFFER
//                            (limit 0 = zero Fast grátis; copy da porta de $1).
//   · app/api/compose      → já recusa quando reservas > FREE_OFFER.limit (0).
//   · app/(dashboard)/layout.tsx → CardEntryBanner no topo do Studio para quem
//                            está em 'card_required'.
//   · app/api/stripe/webhook → markTrialConverted aceita 'card_required'.
//   · home/signup          → CTAs deixam de dizer "Start free".
//
// Para VOLTAR à versão A (grátis + $1): CARD_ENTRY_ONLY = false. Nada mais.
// (Contas já carimbadas 'card_required' continuam sem crédito — a volta não
// concede retroativamente; é decisão de gente, não de código.)

export const CARD_ENTRY_ONLY = true

/** trial_status de quem cadastrou sob a versão B e ainda não passou o cartão. */
export const CARD_ENTRY_TRIAL_STATUS = 'card_required' as const

/** Campanha carimbada no checkout quando a pessoa entra pela porta única. */
export const CARD_ENTRY_INTENT_CAMPAIGN = 'card_entry' as const

export const CARD_ENTRY_CHECKOUT_PATH =
  `/api/stripe/checkout?tier=basic&billing=monthly&trial=1&intent_campaign=${CARD_ENTRY_INTENT_CAMPAIGN}` as const

/** Evento gravado no cadastro (servidor) quando o grant é substituído pela porta. */
export const CARD_ENTRY_REQUIRED_EVENT = 'card_entry_required' as const

/**
 * Copy canônica da porta única. Os números vêm de lib/checkoutPricing
 * (CARD_TRIAL_ENTRY_FEE_MINOR=100, CARD_TRIAL_DAYS=7, CARD_TRIAL_GRANT_CREDITS=80,
 * TIER_PRICES.basic=1500); o guardião confere que estes literais batem com
 * aquelas constantes — moeda localizada fica com as superfícies que já
 * formatam por região (UpgradeModalTrialDoor, CardEntryBanner).
 */
export const CARD_ENTRY_COPY = {
  ctaShort: 'Try 7 days for $1',
  ctaLong: 'Try Creator 7 days for $1 →',
  chip: '$1 for 7 days — 80 credits, every engine',
  headline: 'Start for $1: 7 days of Creator with 80 credits and every engine unlocked. Then $15/month, cancel anytime.',
  sentence:
    'Every new account starts with the Creator trial: $1 for 7 days, 80 credits up front, every engine unlocked (Kling 3 included). After 7 days it continues at $15/month unless you cancel.',
  noFreeTier: 'There is no free tier: the $1 trial is the only way in.',
} as const
