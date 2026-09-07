// ═══════════════════════════════════════════════════════════════════════════
// KINEO-DODO-2026-09-07 — concessão de direito (crédito/plano) por trilho
// ═══════════════════════════════════════════════════════════════════════════
// ESPELHO, NÃO EXTRAÇÃO. app/api/stripe/webhook/route.ts está fora do alcance
// desta rotação (outra pista mexe nele), então as escritas de coluna abaixo
// foram COPIADAS do que o webhook da Stripe faz em `checkout.session.completed`
// (pack: lê video_credits, soma, grava {video_credits, has_paid:true}; plano:
// {is_pro, plan, video_credits somado uma vez por subscription id,
// cinematic_tokens 1 só no pro, has_paid:true}) e de `invoice.payment_succeeded`
// (renovação = saldo ABSOLUTO = TIER_CREDITS). A Stripe ainda NÃO chama este
// arquivo; quem quiser unificar, troca o miolo de lá por estas funções.
//
// TODA falha aqui é `RetryableGrantError`: o chamador (webhook) SOLTA o guard
// de idempotência e responde 500 para o fornecedor reenviar. Nunca engolir —
// é exatamente o bug que a auditoria de 28/08 achou no webhook do PayPal
// ("claim antes do grant, erro engolido").
import type { SupabaseClient } from '@supabase/supabase-js'
import { TIER_CREDITS, type CheckoutTier } from '@/lib/checkoutPricing'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminClient = SupabaseClient<any, any, any>

export class RetryableGrantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RetryableGrantError'
  }
}

/** Coluna que guarda o id da assinatura no fornecedor. Só a Dodo usa esta lib hoje. */
export type SubscriptionColumn = 'dodo_subscription_id'

export type GrantResult = { userId: string; before: number; after: number; resumed: boolean }

/** Pacote único: SOMA créditos e marca pagante (saída sem marca d'água). */
export async function grantOneTimePackCredits(
  admin: AdminClient,
  input: { userId: string; credits: number },
): Promise<GrantResult> {
  if (!Number.isFinite(input.credits) || input.credits <= 0) {
    throw new RetryableGrantError(`pack credits must be > 0, got ${input.credits}`)
  }
  const { data: profile, error: fetchErr } = await admin
    .from('profiles')
    .select('video_credits')
    .eq('id', input.userId)
    .single()
  if (fetchErr) {
    throw new RetryableGrantError(`Failed to fetch profile for pack grant (${input.userId}): ${fetchErr.message}`)
  }
  const before = typeof profile?.video_credits === 'number' ? profile.video_credits : 0
  const after = before + input.credits
  const { data: updated, error: updateErr } = await admin
    .from('profiles')
    .update({ video_credits: after, has_paid: true })
    .eq('id', input.userId)
    .select('id')
    .maybeSingle()
  if (updateErr || !updated?.id) {
    throw new RetryableGrantError(
      `Pack credit grant failed (${input.userId}): ${updateErr?.message ?? 'profile row missing'}`,
    )
  }
  return { userId: input.userId, before, after, resumed: false }
}

/**
 * Assinatura ATIVADA: idempotente por subscription id. A primeira concessão é
 * aditiva (créditos de pacote pagos ficam); um reenvio com o MESMO id vê o
 * plano já gravado e não soma de novo.
 */
export async function grantSubscriptionPlan(
  admin: AdminClient,
  input: {
    userId: string
    tier: CheckoutTier
    subscriptionId: string
    subscriptionColumn: SubscriptionColumn
  },
): Promise<GrantResult> {
  const credits = TIER_CREDITS[input.tier]
  const { data: current, error: readErr } = await admin
    .from('profiles')
    .select(`video_credits, plan, is_pro, ${input.subscriptionColumn}`)
    .eq('id', input.userId)
    .single()
  if (readErr) {
    throw new RetryableGrantError(`Failed to read subscription profile (${input.userId}): ${readErr.message}`)
  }
  const row = (current ?? {}) as Record<string, unknown>
  const before = typeof row.video_credits === 'number' ? row.video_credits : 0
  const resumed =
    row[input.subscriptionColumn] === input.subscriptionId &&
    row.plan === input.tier &&
    row.is_pro === true
  const after = resumed ? before : before + credits
  if (resumed) return { userId: input.userId, before, after, resumed: true }

  // Push #088 espelhado: só o pro ganha 1 token cinematográfico/mês.
  const cinematicTokens = input.tier === 'pro' ? 1 : 0
  const patch: Record<string, unknown> = {
    is_pro: true,
    plan: input.tier,
    video_credits: after,
    cinematic_tokens: cinematicTokens,
    has_paid: true,
    [input.subscriptionColumn]: input.subscriptionId,
  }
  const { data: updated, error: updateErr } = await admin
    .from('profiles')
    .update(patch)
    .eq('id', input.userId)
    .select('id')
    .maybeSingle()
  if (updateErr || !updated?.id) {
    throw new RetryableGrantError(
      `Subscription grant failed (${input.userId}): ${updateErr?.message ?? 'profile row missing'}`,
    )
  }
  return { userId: input.userId, before, after, resumed: false }
}

/** Renovação: saldo ABSOLUTO = créditos do plano (espelho de invoice.payment_succeeded). */
export async function renewSubscriptionCredits(
  admin: AdminClient,
  input: { userId: string; tier: CheckoutTier; subscriptionId: string; subscriptionColumn: SubscriptionColumn },
): Promise<GrantResult> {
  const credits = TIER_CREDITS[input.tier]
  const { data: current, error: readErr } = await admin
    .from('profiles')
    .select('video_credits')
    .eq('id', input.userId)
    .single()
  if (readErr) {
    throw new RetryableGrantError(`Failed to read profile for renewal (${input.userId}): ${readErr.message}`)
  }
  const before = typeof current?.video_credits === 'number' ? current.video_credits : 0
  const { data: updated, error: updateErr } = await admin
    .from('profiles')
    .update({
      is_pro: true,
      plan: input.tier,
      video_credits: credits,
      cinematic_tokens: input.tier === 'pro' ? 1 : 0,
      has_paid: true,
      [input.subscriptionColumn]: input.subscriptionId,
    })
    .eq('id', input.userId)
    .select('id')
    .maybeSingle()
  if (updateErr || !updated?.id) {
    throw new RetryableGrantError(
      `Renewal grant failed (${input.userId}): ${updateErr?.message ?? 'profile row missing'}`,
    )
  }
  return { userId: input.userId, before, after: credits, resumed: false }
}

/** Assinatura cancelada/expirada: volta para free SÓ quem tem ESTE id gravado. */
export async function revokeSubscriptionPlan(
  admin: AdminClient,
  input: { subscriptionId: string; subscriptionColumn: SubscriptionColumn },
): Promise<{ revoked: number }> {
  const { data, error } = await admin
    .from('profiles')
    .update({ is_pro: false, plan: 'free', [input.subscriptionColumn]: null })
    .eq(input.subscriptionColumn, input.subscriptionId)
    .select('id')
  if (error) {
    throw new RetryableGrantError(`Subscription revoke failed (${input.subscriptionId}): ${error.message}`)
  }
  return { revoked: Array.isArray(data) ? data.length : 0 }
}
