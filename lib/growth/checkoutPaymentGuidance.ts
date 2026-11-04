export const CHECKOUT_PAYMENT_GUIDANCE_VERSION = 'checkout_payment_guidance_v3' as const // KINEO-CHECKOUT-FINO-0411 — a linha saiu da descrição; v3 separa a coorte

export const CHECKOUT_PAYMENT_GUIDANCE_COMPACT =
  'Card, or Apple Pay / Google Pay when available · Link sign-in is optional'

/** A Stripe recusa descrição vazia; nenhum plano chega aqui vazio, mas a compra não pode morrer por isso. */
export const CHECKOUT_LINE_ITEM_FALLBACK = 'Cancel anytime'

/**
 * KINEO-CHECKOUT-FINO-0411 [fundador 04/11: "mais fino, mais profissional, mais minimalista"] — a descrição do produto é uma linha só.
 * A frase "Charged in USD worldwide…" saiu daqui: era falsa para quem paga em reais, e a própria página da Stripe mostra a moeda e os meios de pagamento.
 */
export function withCheckoutPaymentGuidance(description: string): string {
  return description.trim() || CHECKOUT_LINE_ITEM_FALLBACK
}
