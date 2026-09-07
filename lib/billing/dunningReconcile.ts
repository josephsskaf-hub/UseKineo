// A graça de cobrança (lib/billing/subscriptionAccess.ts, 07/09/2026 02:51 BRT)
// parou o sangramento PARA A FRENTE — e nunca curou as duas vítimas que o
// cabeçalho dela mesma nomeia.
//
// Medido em produção em 07/09/2026 (18h BRT):
//  · As duas assinaturas (US$ 24,90 AU e US$ 9,90 NG) continuam com
//    `has_paid=true`, `plan='free'`, `is_pro=false` e `stripe_subscription_id`
//    INTACTO. A Stripe ainda cobra as duas.
//  · Às 17:26:28Z a Stripe tentou a de NG DE NOVO e recusou. Um segundo depois
//    o ramo da graça escreveu `subscription_access_held_during_dunning`
//    dizendo "acesso preservado" — para uma pessoa cujo acesso já tinha sido
//    tirado em 03/09, antes de a graça existir. E o evento saiu sem `user_id`.
//  · O caminho de VOLTA nunca reescreve `plan`: o `customer.subscription.updated`
//    só escreve `plan` quando revoga, e o `invoice.payment_failed` da graça dá
//    `break` sem tocar no perfil. Quem já era `free` quando a graça chegou
//    fica `free` até a próxima fatura PAGA — que, em `insufficient_funds`, pode
//    nunca vir. A casa tem 13 pagantes na vida inteira; 2 deles estão nisto.
//
// Este arquivo é a DECISÃO pura de "esta pessoa deveria ter o plano de volta?".
// Quem a executa (o webhook, e a rota admin de reconciliação) só faz o
// update de DOIS campos: `plan` e `is_pro`.
//
// ⛔ NUNCA MEXE EM CRÉDITO. Crédito é dinheiro. Ele só é recarregado quando a
// fatura de fato for paga (`invoice.payment_succeeded`, que SETA o saldo do
// ciclo). Esta peça restaura DIREITO DE ACESSO (o tier que a pessoa contratou
// e a Stripe ainda cobra), não saldo. Devolver crédito aqui seria pagar um
// ciclo que a Stripe ainda não recebeu.
//
// Regras deste arquivo, iguais às do vizinho subscriptionAccess.ts: sem rede,
// sem banco, ZERO import com alias `@/` — o guardião importa este arquivo DE
// VERDADE com o node 24 (que só tira os tipos e não resolve alias).

import { stripeSubscriptionKeepsAccess } from './subscriptionAccess'

/**
 * Os 4 tiers que o checkout grava em `subscription.metadata.tier`.
 * Mesmo conjunto de `CheckoutPlanTier` (lib/checkoutPricing.ts) — repetido
 * aqui como literal porque este arquivo não pode importar por alias e o
 * guardião precisa executá-lo com node puro.
 */
export const DUNNING_RECONCILE_TIERS = ['starter', 'basic', 'pro', 'autopilot'] as const
export type DunningReconcileTier = (typeof DUNNING_RECONCILE_TIERS)[number]

/**
 * Lê o tier de `subscription.metadata.tier` FALHANDO FECHADO.
 *
 * Só as 4 strings exatas contam. `undefined`, `''`, `'Pro'`, lixo → `null`.
 *
 * Por que o default `'basic'` da escada do `invoice.payment_succeeded` NÃO
 * pode ser copiado para cá: lá a escada nasce de uma fatura que a Stripe
 * acabou de RECEBER — se o tier vier vazio, dar `basic` é dar o menor plano a
 * quem comprovadamente pagou algo. Aqui a Stripe ainda NÃO recebeu nada deste
 * ciclo; restaurar plano é CONCEDER um direito de acesso, e conceder o tier
 * errado por causa de um default é pior do que não restaurar: um `basic`
 * indevido para quem contratou `starter` abre as portas erradas, e um `basic`
 * para quem tem metadata quebrada esconde a metadata quebrada. Tier
 * desconhecido → `skip`, e a razão fica gravada para uma pessoa decidir.
 */
export function stripeSubscriptionTier(metadataTier: unknown): DunningReconcileTier | null {
  if (typeof metadataTier !== 'string') return null
  return (DUNNING_RECONCILE_TIERS as readonly string[]).includes(metadataTier)
    ? (metadataTier as DunningReconcileTier)
    : null
}

export type DunningReconcileInput = {
  /** `profiles.has_paid` — alguma vez houve dinheiro nesta conta. */
  hasPaid: boolean
  /** `profiles.plan` como está agora. */
  plan: string | null | undefined
  /** `profiles.is_pro` como está agora. */
  isPro: boolean
  /** `profiles.stripe_subscription_id` — a assinatura que o perfil reconhece. */
  profileSubscriptionId: string | null | undefined
  /** O id da assinatura VIVA lida da Stripe agora. */
  liveSubscriptionId: string | null | undefined
  /** O status VIVO da assinatura na Stripe agora. */
  liveStatus: unknown
  /** `subscription.metadata.tier` cru, como veio da Stripe. */
  metadataTier: unknown
}

export type DunningReconcileReason =
  | 'nunca_pagou'
  | 'assinatura_diferente'
  | 'stripe_revogou'
  | 'tier_desconhecido'
  | 'ja_correto'
  | 'restaurar'

export type DunningReconcileDecision = {
  action: 'restore' | 'already_ok' | 'skip'
  reason: DunningReconcileReason
  tier: DunningReconcileTier | null
}

/**
 * A pergunta "esta pessoa deveria ter o plano de volta?", em ordem, TODAS as
 * portas falhando FECHADAS (skip). Só chega em `restore` quem passa por todas.
 */
export function decideDunningReconcile(input: DunningReconcileInput): DunningReconcileDecision {
  // 1. Quem nunca pagou não tem o que ser restaurado. `past_due` só existe
  //    para quem já pagou um ciclo, mas o perfil é a fonte que a casa cobra.
  if (!input.hasPaid) {
    return { action: 'skip', reason: 'nunca_pagou', tier: null }
  }

  // 2. A assinatura viva tem de ser A MESMA que o perfil reconhece. Uma
  //    assinatura antiga ou duplicada (a mesma trava que o ramo de renovação
  //    já tem: "stale renewal ignored for superseded subscription") não pode
  //    reescrever o tier do perfil.
  const profileSub = typeof input.profileSubscriptionId === 'string' ? input.profileSubscriptionId : ''
  const liveSub = typeof input.liveSubscriptionId === 'string' ? input.liveSubscriptionId : ''
  if (!profileSub || !liveSub || profileSub !== liveSub) {
    return { action: 'skip', reason: 'assinatura_diferente', tier: null }
  }

  // 3. Se a Stripe desistiu (canceled/unpaid/...), `free` está CERTO. A
  //    pergunta é a MESMA que os pontos de revogação fazem — importada, não
  //    redigitada (memória: predicado do cobrador não se redigita).
  if (!stripeSubscriptionKeepsAccess(input.liveStatus)) {
    return { action: 'skip', reason: 'stripe_revogou', tier: null }
  }

  // 4. Tier fechado: sem os 4 nomes exatos, ninguém ganha plano.
  const tier = stripeSubscriptionTier(input.metadataTier)
  if (tier === null) {
    return { action: 'skip', reason: 'tier_desconhecido', tier: null }
  }

  // 5. Já está como deveria — nada a escrever, e o evento não deve sugerir
  //    que houve cura onde não houve ferida.
  if (input.plan === tier && input.isPro) {
    return { action: 'already_ok', reason: 'ja_correto', tier }
  }

  // 6. Pagou, é a mesma assinatura, a Stripe ainda cobra, o tier é conhecido
  //    e o perfil diz outra coisa: o perfil está errado. Restaurar `plan` e
  //    `is_pro` — e SÓ isso.
  return { action: 'restore', reason: 'restaurar', tier }
}
