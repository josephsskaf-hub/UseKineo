// KINEO-PAUSA-POR-CARTAO-1111 — migra UMA assinatura da Stripe para billing mode flexível (pré-requisito da pausa por
// cartão recusado). Chamada própria (fetch) com Stripe-Version 2025-06-30.basil, porque a casa fala com a Stripe na
// 2024-06-20 e o SDK dessa versão não conhece o endpoint /migrate. IRREVERSÍVEL na Stripe: só é chamada com o interruptor
// PAUSA_POR_CARTAO_1111_MIGRA_NOVAS em 'on' (webhook) ou pelo script com --apply. Nunca lança: devolve o desfecho.
import { PAUSA_STRIPE_API_VERSION } from '@/lib/billing/pausaPorCartao'

export type MigracaoFlexivel = { ok: true } | { ok: false; status: number | null; code: string | null }

export async function migrarAssinaturaParaFlexivel(subscriptionId: string, secretKey: string | undefined, fetchImpl: typeof fetch = fetch): Promise<MigracaoFlexivel> {
  if (!secretKey || !/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) return { ok: false, status: null, code: 'invalid_input' }
  try {
    const res = await fetchImpl(`https://api.stripe.com/v1/subscriptions/${subscriptionId}/migrate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': PAUSA_STRIPE_API_VERSION,
      },
      body: 'billing_mode[type]=flexible',
      signal: AbortSignal.timeout(8_000),
    })
    if (res.ok) return { ok: true }
    let code: string | null = null
    try { const j = (await res.json()) as { error?: { code?: unknown } }; code = typeof j?.error?.code === 'string' ? j.error.code : null } catch { /* corpo ilegível */ }
    return { ok: false, status: res.status, code }
  } catch {
    return { ok: false, status: null, code: 'network' }
  }
}
