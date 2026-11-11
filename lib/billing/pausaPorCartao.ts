// KINEO-PAUSA-POR-CARTAO-1111 [fundador 11/11: "pode fazer as coisas que você achar certas" — alternativa 1 de
// docs/MELHORIAS-RECEITA-E-CLIENTES-2026-11-11.md]: cartão recusado PAUSA a assinatura em vez de cancelar, e ela volta
// sozinha quando a pessoa paga. Este módulo é o LADO DO CÓDIGO; a chave que liga de verdade é do fundador, no painel da
// Stripe (ver PAUSA_POR_CARTAO_PASSOS abaixo). Módulo puro: webhook, script e guardião leem daqui.
//
// O NÚMERO: 3 das 6 saídas de pagantes em 90 dias foram cartão recusado (akajitin, valos87196, ytmeander) e a cintia está
// em recusa desde 02/10 — METADE das saídas. Hoje, quando todas as tentativas falham, a Stripe CANCELA: a pessoa perde a
// assinatura e, para voltar, passa de novo pelo pagamento do zero.
//
// COMO A STRIPE FAZ (docs.stripe.com/billing/revenue-recovery/smart-retries/pause-on-payment-failure, lido em 11/11):
//   · Billing > Revenue recovery > Retries > "Subscription status": "If all retries for a payment fail" → "Pause the
//     subscription"; "When the invoice that triggered the pause is paid or manually marked uncollectible" → "Resume the
//     subscription". A assinatura fica `paused` (status_details.paused.subscription.type = 'final_payment_failure'), a
//     fatura que causou a pausa fica `open`, nenhuma fatura nova é gerada; paga a fatura, a Stripe retoma.
//   · SÓ assinatura em billing mode FLEXÍVEL pausa; a classic, nessa situação, a Stripe CANCELA como hoje (cai no mesmo
//     lugar — por isso ligar a chave antes de migrar não piora nada). Flexível é irreversível.
//   · Migrar: POST /v1/subscriptions/{id}/migrate com billing_mode[type]=flexible (API 2025-06-30.basil ou mais nova). A
//     casa fala com a Stripe na 2024-06-20 (lib/stripe.ts): a migração vai por chamada própria com o cabeçalho
//     Stripe-Version da basil (lib/stripe/migrarFlexivel.ts), sem trocar a versão do resto da casa.
//
// O QUE O CÓDIGO PASSA A FAZER:
//   1. CRÉDITOS E ACESSO DURANTE A PAUSA (regra que já existia, conferida): `paused` = sem acesso de plano
//      (lib/billing/subscriptionAccess.ts — customer.subscription.updated grava plan='free' e zera cinematic_tokens);
//      o SALDO de créditos fica guardado e o que sobrou do mês já pago continua usável (has_paid segue true); nenhum
//      crédito novo entra enquanto pausada.
//   2. A VOLTA (o defeito que este arquivo conserta): paga a fatura, a Stripe manda invoice.payment_succeeded e retoma a
//      assinatura — em eventos separados, sem ordem garantida. O webhook relê a assinatura; se ainda estiver `paused`, a
//      regra antiga DESCARTAVA a renovação ('renewal_ignored_non_access'): a pessoa pagava e ficava sem plano e sem
//      créditos. Agora: `paused` na renovação = pedir à Stripe que reenvie depois (RetryableEntitlementError); quando a
//      Stripe já tiver retomado, a renovação de sempre devolve o plano e os créditos (renewalBalance) pelo guard de sempre.
//   3. MEDIDA: eventos de servidor subscription_paused / subscription_resumed (customer.subscription.paused/resumed).
//   4. ASSINATURAS NOVAS nascem classic (o checkout usa a 2024-06-20): com o interruptor abaixo em 'on', o webhook migra
//      cada assinatura nova para flexível em customer.subscription.created (melhor esforço: falha só registra, nunca
//      derruba a compra). Nasce 'off' = nenhuma chamada a mais à Stripe.

/** Interruptor da migração automática das assinaturas NOVAS para flexível. 'off' = nada muda. */
export type PausaPorCartaoRelease = 'off' | 'on'
export const PAUSA_POR_CARTAO_1111_MIGRA_NOVAS: PausaPorCartaoRelease = 'off'

export const PAUSA_POR_CARTAO_VERSION = 'pausa_por_cartao_v1_1111' as const
export const PAUSA_STRIPE_API_VERSION = '2025-06-30.basil' as const

export const PAUSA_POR_CARTAO_EVENTS = {
  paused: 'subscription_paused',
  resumed: 'subscription_resumed',
  migrated: 'subscription_billing_mode_migrated',
  migrateFailed: 'subscription_billing_mode_migrate_failed',
  renewalDeferred: 'renewal_deferred_paused',
} as const

/** Renovação paga com a assinatura relida como `paused`: esperar a Stripe retomar (reenviar), nunca descartar. */
export function renovacaoPausadaEspera(status: unknown): boolean {
  return status === 'paused'
}

/** O porquê da pausa, como a Stripe escreve (status_details.paused.subscription.type) — ou null. */
export function motivoDaPausa(sub: unknown): string | null {
  const t = (sub as { status_details?: { paused?: { subscription?: { type?: unknown } } } } | null)?.status_details?.paused?.subscription?.type
  return typeof t === 'string' && /^[a-z_]{1,40}$/.test(t) ? t : null
}

/** A assinatura nova deve ser migrada agora? Só com o interruptor 'on' e se ela ainda não for flexível. */
export function migrarNovaParaFlexivel(release: PausaPorCartaoRelease, billingMode: unknown): boolean {
  if (release !== 'on') return false
  const type = (billingMode as { type?: unknown } | null | undefined)?.type
  return type !== 'flexible'
}

/** O passo a passo do fundador, NA ORDEM (o que muda no painel da Stripe fica por último). */
export const PAUSA_POR_CARTAO_PASSOS = [
  '1. Publicar este código (o webhook passa a esperar a retomada em vez de descartar a renovação paga).',
  '2. No endpoint do webhook (Developers > Webhooks > o endpoint de usekineo.com/api/stripe/webhook), acrescentar os eventos customer.subscription.paused, customer.subscription.resumed e customer.subscription.created, se não estiverem na lista.',
  '3. Migrar as assinaturas ativas para flexível: node scripts/stripe-migrar-flexivel-1111.mjs (ensaio, só lista) e depois com --apply (a CEO roda, com o sim do fundador).',
  "4. Ligar a migração das novas: PAUSA_POR_CARTAO_1111_MIGRA_NOVAS = 'on' (lib/billing/pausaPorCartao.ts) e publicar.",
  '5. A CHAVE DO FUNDADOR, no painel: Billing > Revenue recovery > Retries > Subscription status — "If all retries for a payment fail": Pause the subscription; "When the invoice that triggered the pause is paid or manually marked uncollectible": Resume the subscription (deixar "Reset billing cycle anchor" desligado).',
] as const
