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

// ═══ KINEO-RESTAURACAO-2026-09-09 — VERSÃO B DESLIGADA (fundador, 09/09 18h) ═══
// A Versão B (08/09) cortou a entrada de ~22 para 7 cadastros/dia e a porta de
// $1 nasceu quebrada. Volta o trial GRÁTIS (30 créditos = 1 Seedance de 60 s +
// 1 Kineo 1 de 60 s, ver lib/reverseTrial.ts) com todo motor aberto. O $1 morreu
// inteiro (lib/checkoutPricing.ts CARD_TRIAL_LIVE = false).
export const CARD_ENTRY_ONLY = false

/** Créditos do trial grátis — espelho de TRIAL_CREDIT_CAP (lib/reverseTrial.ts); guardião confere. */
export const FREE_ENTRY_CREDITS = 30

/** trial_status de quem cadastrou sob a versão B e ainda não passou o cartão. */
export const CARD_ENTRY_TRIAL_STATUS = 'card_required' as const

/** Campanha carimbada no checkout quando a pessoa entra pela porta única. */
export const CARD_ENTRY_INTENT_CAMPAIGN = 'card_entry' as const

// KINEO-RESTAURACAO-2026-09-09 — com a entrada grátis, o caminho de entrada é o
// cadastro. O checkout com trial=1 fica registrado só como histórico.
export const CARD_ENTRY_CHECKOUT_PATH_V_B =
  `/api/stripe/checkout?tier=basic&billing=monthly&trial=1&intent_campaign=${CARD_ENTRY_INTENT_CAMPAIGN}` as const
export const CARD_ENTRY_CHECKOUT_PATH = CARD_ENTRY_ONLY ? CARD_ENTRY_CHECKOUT_PATH_V_B : ('/signup?intent_campaign=free_entry' as const)

/** Evento gravado no cadastro (servidor) quando o grant é substituído pela porta. */
export const CARD_ENTRY_REQUIRED_EVENT = 'card_entry_required' as const

/** Créditos do trial de $1 — espelho de CARD_TRIAL_GRANT_CREDITS (lib/checkoutPricing); o guardião confere. */
export const CARD_ENTRY_TRIAL_CREDITS = 80

/**
 * Copy canônica da porta única. Os números vêm de lib/checkoutPricing
 * (CARD_TRIAL_ENTRY_FEE_MINOR=100, CARD_TRIAL_DAYS=7, CARD_TRIAL_GRANT_CREDITS=80,
 * TIER_PRICES.basic=2900 desde 09/09 — V7); o guardião confere que estes literais batem com
 * aquelas constantes — moeda localizada fica com as superfícies que já
 * formatam por região (UpgradeModalTrialDoor, CardEntryBanner).
 */
// Copy da Versão B (histórico; só vale com CARD_ENTRY_ONLY = true).
export const CARD_ENTRY_COPY_V_B = {
  ctaShort: 'Try 7 days for $1',
  ctaLong: 'Try Creator 7 days for $1 →',
  chip: '$1 for 7 days — 80 credits, then $19.90/mo',
  headline: 'Start for $1: 7 days of Creator with 80 credits, Kineo 1 and Seedance unlocked. Then $19.90/month, cancel anytime.',
  sentence:
    'Every new account starts with the Creator trial: $1 for 7 days, 80 credits up front, Kineo 1 and Seedance unlocked. After 7 days it continues at $19.90/month (about one film a day) unless you cancel.',
  noFreeTier: 'There is no free tier: the $1 trial is the only way in.',
} as const
// KINEO-RESTAURACAO-2026-09-09 — a copy da ENTRADA GRÁTIS. Mantém as mesmas
// chaves porque ~25 páginas públicas leem `CARD_ENTRY_COPY.ctaLong/ctaShort`
// no botão principal: trocar aqui troca todas de uma vez, sem redigitar.
export const FREE_ENTRY_COPY = {
  ctaShort: 'Start free',
  ctaLong: `Start free — ${FREE_ENTRY_CREDITS} credits →`,
  chip: `Free to start — ${FREE_ENTRY_CREDITS} credits, every engine, no card`,
  headline: `Start free: ${FREE_ENTRY_CREDITS} credits on signup, every engine unlocked, no card required.`,
  sentence:
    `Every new account starts free with ${FREE_ENTRY_CREDITS} credits — enough for one Seedance film and one Kineo 1 film of 60 seconds — with every engine unlocked and no card required. Plans start at $9.90/month when you want more.`,
  noFreeTier: `Kineo is free to start: ${FREE_ENTRY_CREDITS} credits on signup, no card.`,
} as const
export const CARD_ENTRY_COPY = CARD_ENTRY_ONLY ? CARD_ENTRY_COPY_V_B : FREE_ENTRY_COPY
