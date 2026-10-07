// ═══ KINEO-COMPRA-SEM-LOGIN-2026-10-06 — o lado SERVIDOR da compra sem login ════════════════════════════════════════
// O porquê, o interruptor e as decisões puras estão em lib/growth/guestCheckout.ts. Aqui fica só o que precisa de
// servidor: o segredo do navegador (node:crypto), a sessão Stripe do convidado, o dono da compra no webhook e o
// e-mail com link de entrada. NUNCA importar isto de um componente 'use client' (node:crypto quebra o build).
//
// Três regras de dinheiro, todas herdadas do caminho logado e não reinventadas:
//   1. PREÇO E MOEDA: o preço de lista chega pronto da rota (as mesmas variáveis do caminho logado) e a moeda de
//      liquidação sai de resolveSettlementCurrency + planSettlementAmountMinor/settlementAmountMinor — a MESMA conta
//      da linha "chargeAmount" de app/api/stripe/checkout/route.ts. O guardião executa as duas e compara.
//   2. GRANT: este arquivo não concede nada. Ele só descobre QUEM é o dono; o webhook segue pelo MESMO bloco Path B
//      do caminho logado (créditos, plano, has_paid, idempotência por sessão/assinatura).
//   3. ERRO: toda falha do dono lança GuestCheckoutOwnerError; o webhook transforma em RetryableEntitlementError → 500
//      → a Stripe reenvia. Nada de 200 mudo (memória webhook-200-mudo-perde-pedido). Reexecutar é seguro: achar/criar a
//      conta é idempotente pelo e-mail + carimbo em app_metadata, e os eventos têm id determinístico.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  GUEST_ACCOUNT_SESSION_APP_METADATA_KEY,
  GUEST_CHECKOUT_AFFILIATE_CLICK_KEY,
  GUEST_CHECKOUT_AFFILIATE_CODE_KEY,
  GUEST_CHECKOUT_EVENTS,
  GUEST_CHECKOUT_METADATA_FLAG,
  GUEST_CHECKOUT_NONCE_HASH_KEY,
  GUEST_CHECKOUT_STRIPE_NOTE,
  GUEST_CHECKOUT_VERSION,
  GUEST_CHECKOUT_VERSION_KEY,
  GUEST_READY_LINK_TTL_HOURS,
  buildGuestCheckoutSuccessUrl,
  guestPurchaseConflict,
  guestReadyEmailClaimId,
  guestWelcomePromoReuse,
  normalizeGuestEmail,
  type GuestConflictReason,
  type GuestWelcomePromoReuse,
} from '@/lib/growth/guestCheckout'
// KINEO-CUPOM-CONVIDADO-2026-10-07 — a oferta de boas-vindas sem conta usa o MESMO contrato do caminho logado.
import {
  publicPromoTruthMetadata,
  type LoadedPublicPromoCandidate,
  type PromisedPublicPromoKind,
} from '@/lib/growth/publicPromoTruth'
import {
  planSettlementAmountMinor,
  resolveSettlementCurrency,
  settlementAmountMinor,
  type SettlementCurrency,
  type SettlementReason,
} from '@/lib/settlementCurrency'
import { attributeAffiliateForUser } from '@/lib/affiliateAttribution'
import { recordResendResponse, recordEmailSend } from '@/lib/email/quota'
import { signGuestReadyToken } from '@/lib/auth/guestAccess'

// ─── Segredo do navegador que abriu o checkout ──────────────────────────────────────────────────────────────────────
const NONCE_PATTERN = /^[A-Za-z0-9_-]{43}$/

/** 32 bytes aleatórios em base64url (43 caracteres). Vai SÓ no cookie httpOnly; a Stripe guarda o sha256. */
export function mintGuestNonce(): string {
  return randomBytes(32).toString('base64url')
}

export function readGuestNonce(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim()
  return NONCE_PATTERN.test(value) ? value : null
}

export function guestNonceHash(nonce: string): string {
  return createHash('sha256').update(`kineo-guest-checkout:${nonce}`).digest('hex')
}

/** Comparação em tempo constante do cookie com o hash gravado na sessão. Qualquer formato estranho = false. */
export function guestNonceMatches(rawCookie: string | null | undefined, expectedHash: string | null | undefined): boolean {
  const nonce = readGuestNonce(rawCookie)
  const expected = (expectedHash ?? '').trim().toLowerCase()
  if (!nonce || !/^[0-9a-f]{64}$/.test(expected)) return false
  const actual = Buffer.from(guestNonceHash(nonce), 'hex')
  const wanted = Buffer.from(expected, 'hex')
  return actual.length === wanted.length && timingSafeEqual(actual, wanted)
}

/** UUID determinístico (mesmo desenho de payment_success/checkout_started): reentrega colide em 23505. */
export function deterministicEventUuid(name: string, key: string): string {
  const hex = createHash('sha256').update(`${name}:${key}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// ─── Moeda de liquidação (espelho da conta do caminho logado) ──────────────────────────────────────────────────────
export type GuestPlanTier = 'starter' | 'basic' | 'pro' | 'autopilot' | 'autopilot_lite'

/**
 * A MESMA conta de app/api/stripe/checkout/route.ts (bloco KINEO-MOEDA-LOCAL-2026-09-09), com uma diferença que é
 * fato e não escolha: sem conta não existe histórico de recusa de cartão brasileiro (priorBrazilianCardFailure lê
 * eventos do user_id), então ela é false. IP do Brasil e navegador em pt-BR continuam abrindo em reais.
 */
export function guestSettlement(input: {
  tier: GuestPlanTier
  isAnnual: boolean
  unitAmount: number
  ipCountry: string | null
  acceptLanguage: string | null
  forcedCurrency: string | null
}): { chargeCurrency: SettlementCurrency; chargeAmount: number; settlementReason: SettlementReason } {
  const settlement = resolveSettlementCurrency({
    ipCountry: input.ipCountry,
    acceptLanguage: input.acceptLanguage,
    forced: input.forcedCurrency,
    priorBrazilianCardFailure: false,
  })
  const chargeCurrency = settlement.currency
  const chargeAmount = input.tier === 'autopilot'
    ? settlementAmountMinor(input.unitAmount, chargeCurrency)
    : planSettlementAmountMinor(input.tier, input.isAnnual ? 'annual' : 'monthly', chargeCurrency, input.unitAmount)
  return { chargeCurrency, chargeAmount, settlementReason: settlement.reason }
}

// ─── Sessão Stripe do convidado ─────────────────────────────────────────────────────────────────────────────────────
export type GuestAffiliateSystem = 'custom' | 'rewardful' | 'none'

export type GuestSessionInput = {
  appUrl: string
  tier: GuestPlanTier
  billing: 'monthly' | 'annual'
  interval: 'month' | 'year'
  /** Preço de LISTA em USD (o mesmo `unitAmount` do caminho logado). */
  unitAmount: number
  listCurrency: string
  region: string
  chargeCurrency: SettlementCurrency
  chargeAmount: number
  settlementReason: SettlementReason
  ipCountry: string
  planName: string
  /** Já passada por withCheckoutPaymentGuidance, como no caminho logado. */
  lineItemDescription: string
  imageUrl: string
  planCredits: number
  introRequested: boolean
  intentCampaign: string | null
  valueContext: { version: string; variant: string; outputCount: number | null; submitMessage: string }
  paymentGuidanceVersion: string
  visualProofVersion: string
  windowHours: number
  windowVersion: string
  expiresAt: number
  nonceHash: string
  affiliateCode: string | null
  affiliateClickId: string | null
  rewardfulReferral: string | null
  autopilotPriceId: string | null
  /** KINEO-CUPOM-CONVIDADO-2026-10-07 — oferta de boas-vindas JÁ verificada pela rota; ausente = compra sem desconto. */
  welcomePromo?: GuestWelcomePromoApplied | null
}

/** O desconto de boas-vindas confirmado na Stripe pela MESMA verificação do caminho logado (resolvePromisedPublicPromo). */
export type GuestWelcomePromoApplied = {
  kind: PromisedPublicPromoKind
  /** O código como veio no ?promo= (o cancel_url do caminho logado repete o mesmo texto). */
  requestedCode: string
  /** O promo_… que a verificação confirmou. */
  promotionCodeId: string
  /** O 1º mês que o caminho logado põe na volta (publicPromoFirstChargeMinor sobre o preço de lista). */
  firstChargeMinor: number
}

/**
 * O caminho logado, menos o que só existe com conta: sem `customer` (a Stripe cria um e coleta o e-mail), sem
 * supabase_user_id (o webhook descobre o dono), sem trial/Plan Fit/cupom/1º mês (a rota manda esses para o cadastro).
 * Campos iguais aos do logado, na mesma ordem, para a comparação do guardião ser direta.
 * Exceção (KINEO-CUPOM-CONVIDADO-2026-10-07): a oferta de boas-vindas, quando a rota já a confirmou na Stripe.
 */
export function buildGuestSubscriptionSessionParams(input: GuestSessionInput): {
  params: Stripe.Checkout.SessionCreateParams
  affiliateSystem: GuestAffiliateSystem
} {
  const isAnnual = input.billing === 'annual'
  // KINEO-CUPOM-CONVIDADO-2026-10-07 — espelho de markPromisedPublicPromoApplied (caminho logado): o carimbo 'applied'
  // na sessão E na assinatura, o 1º mês na volta, o código no cancel_url e o desconto em `discounts` — com o campo
  // manual de cupom desligado, porque a Stripe não aceita os dois juntos. Sem a oferta, o objeto sai idêntico ao de antes.
  const welcome = input.welcomePromo ?? null
  const welcomeMetadata: Record<string, string> = welcome
    ? {
        ...publicPromoTruthMetadata(welcome.kind, 'applied'),
        public_promo_first_charge_minor: String(welcome.firstChargeMinor),
      }
    : {}
  // Mesma precedência do caminho logado (PUSH #68): atribuição própria vence a Rewardful. Sem conta, "própria" só
  // pode nascer de código + prova de clique (attributeAffiliateForUser exige os dois para uma conta nova).
  const affiliateSystem: GuestAffiliateSystem = input.affiliateCode && input.affiliateClickId
    ? 'custom'
    : input.rewardfulReferral ? 'rewardful' : 'none'

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = input.autopilotPriceId
    ? { price: input.autopilotPriceId, quantity: 1 }
    : {
        price_data: {
          currency: input.chargeCurrency,
          product_data: {
            name: isAnnual ? `${input.planName} (Annual)` : input.planName,
            description: input.lineItemDescription,
            images: [input.imageUrl],
          },
          unit_amount: input.chargeAmount,
          recurring: { interval: input.interval },
        },
        quantity: 1,
      }

  const intentCampaignParam = input.intentCampaign
    ? `&intent_campaign=${encodeURIComponent(input.intentCampaign)}`
    : ''

  const sharedMetadata: Record<string, string> = {
    tier: input.tier,
    price_region: input.region,
    plan_credits: String(input.planCredits),
    checkout_origin: 'standard',
    checkout_recovery: '0',
    checkout_value_context: input.valueContext.version,
    checkout_value_variant: input.valueContext.variant,
    checkout_payment_guidance: input.paymentGuidanceVersion,
    checkout_visual_proof: input.visualProofVersion,
    ...(input.valueContext.outputCount !== null
      ? { checkout_value_output_count: String(input.valueContext.outputCount) }
      : {}),
    ...(input.intentCampaign ? { intent_campaign: input.intentCampaign } : {}),
    affiliate_system: affiliateSystem,
    checkout_session_window_hours: String(input.windowHours),
    checkout_session_window_version: input.windowVersion,
    [GUEST_CHECKOUT_METADATA_FLAG]: '1',
    [GUEST_CHECKOUT_VERSION_KEY]: GUEST_CHECKOUT_VERSION,
  }

  const params: Stripe.Checkout.SessionCreateParams = {
    line_items: [lineItem],
    mode: 'subscription',
    custom_text: {
      submit: { message: input.valueContext.submitMessage },
      after_submit: { message: GUEST_CHECKOUT_STRIPE_NOTE },
    },
    success_url: buildGuestCheckoutSuccessUrl({
      appUrl: input.appUrl,
      tier: input.tier,
      currency: input.chargeCurrency,
      amount: welcome ? welcome.firstChargeMinor : input.chargeAmount,
    }),
    // Mesmo formato do cancel_url logado; os pedaços de trial/marca d'água/Plan Fit não existem aqui porque essas
    // compras nunca viram convidado (guestCheckoutFallbackReason). O de promo só existe para a oferta de boas-vindas.
    cancel_url: `${input.appUrl}/checkout/cancelled?tier=${input.tier}&billing=${input.billing}&currency=${input.listCurrency}&settle=${input.chargeCurrency}&region=${input.region}${input.introRequested ? '&intro=1' : ''}${welcome ? `&promo=${encodeURIComponent(welcome.requestedCode)}` : ''}${intentCampaignParam}`,
    metadata: {
      billing: input.billing,
      settlement_currency: input.chargeCurrency,
      settlement_reason: input.settlementReason,
      list_price_usd_minor: String(input.unitAmount),
      ip_country: input.ipCountry,
      [GUEST_CHECKOUT_NONCE_HASH_KEY]: input.nonceHash,
      ...(input.affiliateCode ? { [GUEST_CHECKOUT_AFFILIATE_CODE_KEY]: input.affiliateCode } : {}),
      ...(input.affiliateClickId ? { [GUEST_CHECKOUT_AFFILIATE_CLICK_KEY]: input.affiliateClickId } : {}),
      ...sharedMetadata,
      ...welcomeMetadata,
    },
    subscription_data: {
      metadata: { ...sharedMetadata, ...welcomeMetadata },
    },
    // Igual ao logado sem desconto aplicado: campo manual de cupom ligado, e a sessão recuperável também aceita.
    // Com a oferta de boas-vindas (igual ao logado com desconto): `discounts` e nenhum campo manual, nem na recuperação.
    ...(welcome ? { discounts: [{ promotion_code: welcome.promotionCodeId }] } : { allow_promotion_codes: true }),
    after_expiration: {
      recovery: { enabled: true, allow_promotion_codes: welcome === null },
    },
    expires_at: input.expiresAt,
    ...(affiliateSystem === 'rewardful' && input.rewardfulReferral
      ? { client_reference_id: input.rewardfulReferral }
      : {}),
  }
  return { params, affiliateSystem }
}

/** Um clique = uma sessão (mesmo desenho do kineo-sub-v6): mesma compra, mesmo navegador, mesma janela de 5 min. */
export function guestCheckoutIdempotencyKey(
  params: Stripe.Checkout.SessionCreateParams,
  input: { nonceHash: string; window: number; unitAmount: number; listCurrency: string; introRequested: boolean },
): string {
  const signature = JSON.stringify({
    version: 1,
    nonce_hash: input.nonceHash,
    unit_amount: input.unitAmount,
    list_currency: input.listCurrency,
    intro_requested: input.introRequested,
    line_items: params.line_items,
    custom_text: params.custom_text,
    success_url: params.success_url,
    cancel_url: params.cancel_url,
    metadata: params.metadata,
    subscription_metadata: params.subscription_data?.metadata ?? null,
    client_reference_id: params.client_reference_id ?? null,
    allow_promotion_codes: params.allow_promotion_codes ?? false,
    // KINEO-CUPOM-CONVIDADO-2026-10-07 — o desconto entra na assinatura da chave só quando existe: as chaves das
    // compras sem desconto (todas as de hoje) continuam exatamente as mesmas.
    ...(params.discounts ? { discounts: params.discounts } : {}),
    after_expiration: params.after_expiration,
    expires_at: params.expires_at,
    window: input.window,
  })
  return `kineo-guest-sub-v1:${createHash('sha256').update(signature).digest('hex')}`
}

// ─── Oferta de boas-vindas sem conta (KINEO-CUPOM-CONVIDADO-2026-10-07) ────────────────────────────────────────────
/** Sessão de convidado não tem `customer`: um código restrito a um cliente nunca vale aqui (customer_mismatch). */
const GUEST_WITHOUT_CUSTOMER = ''

/**
 * O MESMO retrato que o caminho logado monta antes de aplicar o desconto prometido (o loader de
 * resolvePromisedPublicPromo em app/api/stripe/checkout/route.ts): o código ativo pelo texto pedido e o cupom por trás
 * dele. SÓ LEITURA: o convidado nunca cria cupom nem código na Stripe (o caminho logado auto-provisiona desde 25/08);
 * se o código não estiver lá, a verificação recusa e o visitante volta ao cadastro, onde o caminho logado segue igual.
 */
export async function loadGuestWelcomePromoCandidate(
  stripeClient: Pick<Stripe, 'promotionCodes' | 'coupons'>,
  input: { kind: PromisedPublicPromoKind; code: string; nowMs: number },
): Promise<LoadedPublicPromoCandidate | null> {
  const pc = (await stripeClient.promotionCodes.list({ code: input.code, active: true, limit: 1 })).data[0]
  if (!pc) return null
  const restrictedCustomerId = typeof pc.customer === 'string'
    ? pc.customer
    : pc.customer?.id ?? null
  const coupon = typeof pc.coupon === 'string'
    ? await stripeClient.coupons.retrieve(pc.coupon)
    : pc.coupon
  // Mesma leitura do logado: um cupom apagado volta com `deleted: true` na mesma forma.
  const couponDeleted = (coupon as { deleted?: boolean }).deleted === true
  return {
    kind: input.kind,
    promotionCodeId: pc.id,
    promotionCode: pc.code,
    promotionActive: pc.active,
    promotionExpiresAtSeconds: pc.expires_at,
    promotionMaxRedemptions: pc.max_redemptions,
    promotionTimesRedeemed: pc.times_redeemed,
    promotionFirstTimeTransaction: pc.restrictions.first_time_transaction,
    promotionMinimumAmount: pc.restrictions.minimum_amount,
    promotionMinimumAmountCurrency: pc.restrictions.minimum_amount_currency,
    promotionCurrencyOptionCodes: Object.keys(pc.restrictions.currency_options ?? {}),
    restrictedCustomerId,
    currentCustomerId: GUEST_WITHOUT_CUSTOMER,
    couponId: coupon.id ?? null,
    couponDeleted,
    couponValid: couponDeleted ? false : coupon.valid,
    couponPercentOff: couponDeleted ? null : coupon.percent_off,
    couponAmountOff: couponDeleted ? null : coupon.amount_off,
    couponDuration: couponDeleted ? null : coupon.duration,
    couponRedeemBySeconds: couponDeleted ? null : coupon.redeem_by,
    couponCurrencyOptionCodes: couponDeleted ? [] : Object.keys(coupon.currency_options ?? {}),
    couponProductIds: couponDeleted ? [] : coupon.applies_to?.products ?? [],
    nowMs: input.nowMs,
  }
}

/** O carimbo exato que a rota grava na sessão e na assinatura quando o desconto de boas-vindas foi aplicado. */
const GUEST_WELCOME_APPLIED_STAMP = publicPromoTruthMetadata('welcome_first_month_20', 'applied')

/** A sessão de convidado levou o desconto de boas-vindas (o carimbo 'applied' inteiro, não só o nome da oferta). */
export function guestWelcomePromoApplied(metadata: { [key: string]: string } | null | undefined): boolean {
  return Object.entries(GUEST_WELCOME_APPLIED_STAMP).every(([key, value]) => metadata?.[key] === value)
}

/**
 * O que os eventos do webhook registram da oferta de boas-vindas. Vazio para compra sem o desconto: as linhas de hoje
 * (payment_success, guest_account_created/matched) não mudam de forma.
 */
export function guestWelcomePromoEventMetadata(
  metadata: { [key: string]: string } | null | undefined,
): Record<string, string | number | boolean | null> {
  if (!guestWelcomePromoApplied(metadata)) return {}
  const firstCharge = Number(metadata?.public_promo_first_charge_minor)
  return {
    ...GUEST_WELCOME_APPLIED_STAMP,
    public_promo_first_charge_minor: Number.isInteger(firstCharge) && firstCharge > 0 ? firstCharge : null,
    guest_welcome_promo: true,
  }
}

// ─── O dono da compra (webhook) ─────────────────────────────────────────────────────────────────────────────────────
export class GuestCheckoutOwnerError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'GuestCheckoutOwnerError'
    this.code = code
  }
}

export type GuestOwnerProfile = {
  id: string
  email: string | null
  is_pro: boolean | null
  plan: string | null
  has_paid: boolean | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  paypal_subscription_id: string | null
}

export const GUEST_OWNER_PROFILE_COLUMNS =
  'id, email, is_pro, plan, has_paid, stripe_customer_id, stripe_subscription_id, paypal_subscription_id'

export type GuestAuthUser = {
  id: string
  email: string | null
  created_at: string | null
  app_metadata: Record<string, unknown> | null
}

export type GuestCheckoutOwner = {
  userId: string
  email: string
  /** Conta nascida DESTA sessão Stripe (carimbo em app_metadata) — a única que pode receber login de uso único. */
  created: boolean
  /** Criada nesta entrega do webhook (na reentrega é false, mas `created` continua true). */
  createdNow: boolean
  createdAt: string | null
  conflict: GuestConflictReason | null
  affiliate: { attempted: boolean; ok: boolean; reason: string | null }
  /** KINEO-CUPOM-CONVIDADO-2026-10-07 — a compra levou o desconto de boas-vindas (carimbo 'applied' na sessão). */
  welcomePromo: boolean
  /** 'paid_before' = desconto de boas-vindas numa conta que JÁ tinha pago: o webhook grava o evento e avisa o fundador. */
  welcomePromoReuse: GuestWelcomePromoReuse | null
}

export interface GuestOwnerDeps {
  findProfilesByEmail(email: string): Promise<{ rows: GuestOwnerProfile[]; error: string | null }>
  readProfile(userId: string): Promise<{ profile: GuestOwnerProfile | null; error: string | null }>
  getAuthUser(userId: string): Promise<{ user: GuestAuthUser | null; error: string | null }>
  createAuthUser(input: {
    email: string
    appMetadata: Record<string, unknown>
    userMetadata: Record<string, unknown>
  }): Promise<{ user: GuestAuthUser | null; error: { code: string | null; message: string } | null }>
  /** Rede de segurança rara: o perfil não achou o e-mail mas o Auth diz que ele existe (corrida ou divergência). */
  findAuthUserByEmail(email: string): Promise<{ user: GuestAuthUser | null; error: string | null }>
  retrieveCustomer(customerId: string): Promise<{ email: string | null; metadata: Record<string, string>; deleted: boolean }>
  updateCustomerMetadata(customerId: string, metadata: Record<string, string>): Promise<void>
  retrieveSubscriptionMetadata(subscriptionId: string): Promise<Record<string, string>>
  updateSubscriptionMetadata(subscriptionId: string, metadata: Record<string, string>): Promise<void>
  updateCheckoutSessionMetadata(sessionId: string, metadata: Record<string, string>): Promise<void>
  attributeAffiliate(
    code: string | null,
    user: { id: string; email: string; createdAt: string | null },
    clickId: string | null,
  ): Promise<{ ok: boolean; reason: string | null }>
  /** 'duplicate' = a linha determinística já existia. Qualquer outro erro LANÇA (vira reenvio). */
  insertEventOnce(row: {
    id: string
    name: string
    user_id: string | null
    path: string
    metadata: Record<string, unknown>
  }): Promise<'inserted' | 'duplicate'>
  warn(message: string): void
}

type GuestSessionLike = Pick<Stripe.Checkout.Session, 'id' | 'customer' | 'subscription' | 'customer_email' | 'metadata'> & {
  customer_details?: { email?: string | null } | null
}

function stripeRef(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' && id.trim() ? id : null
  }
  return null
}

function isEmailExistsError(error: { code: string | null; message: string } | null): boolean {
  if (!error) return false
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return true
  return /already (?:been )?registered|already exists|email.*exists/i.test(error.message ?? '')
}

/**
 * Acha (pelo e-mail que a Stripe coletou) ou cria a conta dona desta compra, carimba o dono no Customer e na
 * Assinatura da Stripe (renovação, troca de plano e cancelamento leem `supabase_user_id` de lá) e registra o fato.
 * Não concede nada: o grant é o Path B do webhook, idêntico ao do caminho logado.
 */
export async function resolveGuestCheckoutOwner(
  deps: GuestOwnerDeps,
  session: GuestSessionLike,
): Promise<GuestCheckoutOwner> {
  const sessionId = session.id
  const customerId = stripeRef(session.customer)
  const subscriptionId = stripeRef(session.subscription)
  if (!customerId || !subscriptionId) {
    throw new GuestCheckoutOwnerError('missing_ids', `Guest Checkout without Customer/Subscription (${sessionId})`)
  }

  // 1. O e-mail que a pessoa digitou na Stripe. O Customer é a segunda fonte (mesma digitação).
  let customer: { email: string | null; metadata: Record<string, string>; deleted: boolean } | null = null
  let email = normalizeGuestEmail(session.customer_details?.email ?? session.customer_email ?? null)
  if (!email) {
    customer = await deps.retrieveCustomer(customerId)
    email = normalizeGuestEmail(customer.email)
  }
  if (!email) throw new GuestCheckoutOwnerError('email_missing', `Guest Checkout without a usable email (${sessionId})`)

  // 2. Conta existente pelo e-mail; senão, nasce agora (e-mail confirmado: a pessoa acabou de pagar com ele).
  let profile: GuestOwnerProfile | null = null
  let authUser: GuestAuthUser | null = null
  let createdNow = false
  const found = await deps.findProfilesByEmail(email)
  if (found.error) throw new GuestCheckoutOwnerError('profile_lookup_failed', `Guest owner lookup failed (${sessionId}): ${found.error}`)
  if (found.rows.length > 1) throw new GuestCheckoutOwnerError('email_ambiguous', `More than one profile for the guest email (${sessionId})`)
  if (found.rows.length === 1) {
    profile = found.rows[0]
  } else {
    const created = await deps.createAuthUser({
      email,
      appMetadata: {
        [GUEST_ACCOUNT_SESSION_APP_METADATA_KEY]: sessionId,
        [GUEST_CHECKOUT_VERSION_KEY]: GUEST_CHECKOUT_VERSION,
      },
      userMetadata: { signup_source: 'guest_checkout' },
    })
    if (created.user) {
      authUser = created.user
      createdNow = true
    } else if (isEmailExistsError(created.error)) {
      // Outra entrega criou a conta neste instante, ou o perfil guarda um e-mail diferente do Auth (0 casos em 06/10).
      const again = await deps.findProfilesByEmail(email)
      if (again.error) throw new GuestCheckoutOwnerError('profile_lookup_failed', `Guest owner re-lookup failed (${sessionId}): ${again.error}`)
      if (again.rows.length > 1) throw new GuestCheckoutOwnerError('email_ambiguous', `More than one profile for the guest email (${sessionId})`)
      if (again.rows.length === 1) {
        profile = again.rows[0]
      } else {
        const byAuth = await deps.findAuthUserByEmail(email)
        if (byAuth.error || !byAuth.user) {
          throw new GuestCheckoutOwnerError('owner_unresolved', `Auth reports the email exists but no owner was found (${sessionId})`)
        }
        authUser = byAuth.user
      }
    } else {
      throw new GuestCheckoutOwnerError('create_failed', `Guest account creation failed (${sessionId}): ${created.error?.message ?? 'no user'}`)
    }
  }

  const userId = profile?.id ?? authUser?.id ?? null
  if (!userId) throw new GuestCheckoutOwnerError('owner_unresolved', `Guest owner id missing (${sessionId})`)
  if (!authUser) {
    const read = await deps.getAuthUser(userId)
    if (read.error || !read.user) throw new GuestCheckoutOwnerError('auth_user_unreadable', `Guest owner auth read failed (${sessionId}): ${read.error ?? 'missing'}`)
    authUser = read.user
  }
  if (!profile) {
    // O gatilho on_auth_user_created cria o perfil na mesma transação do Auth; ausente = soluço → reenvio.
    const read = await deps.readProfile(userId)
    if (read.error || !read.profile) throw new GuestCheckoutOwnerError('profile_missing', `Guest owner profile missing (${sessionId}): ${read.error ?? 'missing'}`)
    profile = read.profile
  }
  const bornFromThisSession = authUser.app_metadata?.[GUEST_ACCOUNT_SESSION_APP_METADATA_KEY] === sessionId

  // 3. Conta que já tinha plano ativo vindo de OUTRA assinatura: o caminho logado teria recusado antes de cobrar.
  const conflict = bornFromThisSession ? null : guestPurchaseConflict(profile, subscriptionId)
  // 3b. KINEO-CUPOM-CONVIDADO-2026-10-07 — desconto de boas-vindas numa conta que JÁ pagou: MEDIDO (evento + aviso no
  //     webhook), nunca bloqueado — a pessoa pagou o que a tela prometeu e o risco foi aceito (20% de UM mês). Lido do
  //     perfil de ANTES do grant (o mesmo que decide o conflito).
  const welcomePromoApplied = guestWelcomePromoApplied(session.metadata)
  const welcomePromoReuse = guestWelcomePromoReuse({ welcomePromoApplied, bornFromThisSession, profile, subscriptionId })

  // 4. Dono carimbado na Stripe. Customer e Assinatura são OBRIGATÓRIOS (renovação/updated/deleted e a própria
  //    checagem de identidade do Path B leem de lá); divergência é corrupção → lança e nunca adota.
  customer = customer ?? await deps.retrieveCustomer(customerId)
  if (customer.deleted) throw new GuestCheckoutOwnerError('customer_deleted', `Guest Checkout Customer deleted (${sessionId})`)
  const customerOwner = customer.metadata?.supabase_user_id ?? ''
  if (customerOwner && customerOwner !== userId) {
    throw new GuestCheckoutOwnerError('customer_owner_mismatch', `Guest Customer belongs to another account (${sessionId})`)
  }
  if (!customerOwner) {
    await deps.updateCustomerMetadata(customerId, { supabase_user_id: userId, [GUEST_CHECKOUT_METADATA_FLAG]: '1' })
  }
  const subscriptionMetadata = await deps.retrieveSubscriptionMetadata(subscriptionId)
  const subscriptionOwner = subscriptionMetadata?.supabase_user_id ?? ''
  if (subscriptionOwner && subscriptionOwner !== userId) {
    throw new GuestCheckoutOwnerError('subscription_owner_mismatch', `Guest Subscription belongs to another account (${sessionId})`)
  }
  if (!subscriptionOwner) {
    await deps.updateSubscriptionMetadata(subscriptionId, { supabase_user_id: userId })
  }
  // A sessão carimbada deixa o pixel de compra (verifiedCheckoutPurchase) reconhecer o dono sem regra nova.
  // Opcional: a conversão de anúncio não pode prender o grant.
  if (session.metadata?.supabase_user_id !== userId) {
    try {
      await deps.updateCheckoutSessionMetadata(sessionId, { supabase_user_id: userId })
    } catch (error) {
      deps.warn(`[guest-checkout] session owner stamp skipped (${sessionId}): ${error instanceof Error ? error.message : 'unknown'}`)
    }
  }

  // 5. Afiliado: o MESMO primitivo do caminho logado (resolveCustomAffiliateBeforeSubscription), com o código e a
  //    prova de clique que viajaram na sessão. Conta nova nasce depois do clique → elegível; conta antiga só repara.
  //    Falha não bloqueia o grant (mesma regra do logado: "preserve established behavior").
  let affiliate: GuestCheckoutOwner['affiliate'] = { attempted: false, ok: false, reason: null }
  if (!conflict) {
    try {
      const result = await deps.attributeAffiliate(
        session.metadata?.[GUEST_CHECKOUT_AFFILIATE_CODE_KEY] ?? null,
        { id: userId, email, createdAt: authUser.created_at },
        session.metadata?.[GUEST_CHECKOUT_AFFILIATE_CLICK_KEY] ?? null,
      )
      affiliate = { attempted: true, ok: result.ok, reason: result.reason }
    } catch {
      affiliate = { attempted: true, ok: false, reason: 'threw' }
    }
  }

  // 6. O fato, com dono. Id determinístico: reentrega = 23505 = nada duplicado.
  const eventName = bornFromThisSession ? GUEST_CHECKOUT_EVENTS.accountCreated : GUEST_CHECKOUT_EVENTS.accountMatched
  await deps.insertEventOnce({
    id: deterministicEventUuid(eventName, sessionId),
    name: eventName,
    user_id: userId,
    path: '/api/stripe/webhook',
    metadata: {
      source: 'stripe_webhook',
      version: GUEST_CHECKOUT_VERSION,
      stripe_session_id: sessionId,
      tier: session.metadata?.tier ?? null,
      billing: session.metadata?.billing ?? null,
      settlement_currency: session.metadata?.settlement_currency ?? null,
      intent_campaign: session.metadata?.intent_campaign ?? null,
      affiliate_attempted: affiliate.attempted,
      affiliate_ok: affiliate.ok,
      affiliate_reason: affiliate.reason,
      conflict,
      // Só na compra com o desconto de boas-vindas (as linhas sem desconto não mudam de forma).
      ...(welcomePromoApplied
        ? { ...guestWelcomePromoEventMetadata(session.metadata), welcome_promo_reuse: welcomePromoReuse }
        : {}),
    },
  })

  return {
    userId,
    email,
    created: bornFromThisSession,
    createdNow,
    createdAt: authUser.created_at,
    conflict,
    affiliate,
    welcomePromo: welcomePromoApplied,
    welcomePromoReuse,
  }
}

function toAuthUser(user: { id: string; email?: string | null; created_at?: string | null; app_metadata?: unknown } | null | undefined): GuestAuthUser | null {
  if (!user?.id) return null
  return {
    id: user.id,
    email: user.email ?? null,
    created_at: user.created_at ?? null,
    app_metadata: user.app_metadata && typeof user.app_metadata === 'object'
      ? user.app_metadata as Record<string, unknown>
      : null,
  }
}

const AUTH_LIST_PAGE_SIZE = 1000
const AUTH_LIST_MAX_PAGES = 20

/** As dependências reais do webhook: o service role do Supabase e a Stripe com a chave do servidor. */
export function guestOwnerDepsFor(admin: SupabaseClient, stripeClient: Stripe): GuestOwnerDeps {
  return {
    async findProfilesByEmail(email) {
      const { data, error } = await admin
        .from('profiles')
        .select(GUEST_OWNER_PROFILE_COLUMNS)
        .eq('email', email)
        .limit(2)
      return { rows: (data ?? []) as GuestOwnerProfile[], error: error ? `${error.code ?? ''} ${error.message}` : null }
    },
    async readProfile(userId) {
      const { data, error } = await admin
        .from('profiles')
        .select(GUEST_OWNER_PROFILE_COLUMNS)
        .eq('id', userId)
        .maybeSingle()
      return { profile: (data as GuestOwnerProfile | null) ?? null, error: error ? `${error.code ?? ''} ${error.message}` : null }
    },
    async getAuthUser(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId)
      return { user: toAuthUser(data?.user), error: error ? error.message : null }
    },
    async createAuthUser(input) {
      const { data, error } = await admin.auth.admin.createUser({
        email: input.email,
        email_confirm: true,
        app_metadata: input.appMetadata,
        user_metadata: input.userMetadata,
      })
      return {
        user: toAuthUser(data?.user),
        error: error ? { code: (error as { code?: string }).code ?? null, message: error.message } : null,
      }
    },
    async findAuthUserByEmail(email) {
      for (let page = 1; page <= AUTH_LIST_MAX_PAGES; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: AUTH_LIST_PAGE_SIZE })
        if (error) return { user: null, error: error.message }
        const users = data?.users ?? []
        const match = users.find((u) => (u.email ?? '').trim().toLowerCase() === email)
        if (match) return { user: toAuthUser(match), error: null }
        if (users.length < AUTH_LIST_PAGE_SIZE) break
      }
      return { user: null, error: null }
    },
    async retrieveCustomer(customerId) {
      const customer = await stripeClient.customers.retrieve(customerId)
      if ('deleted' in customer && customer.deleted) return { email: null, metadata: {}, deleted: true }
      const live = customer as Stripe.Customer
      return { email: live.email ?? null, metadata: live.metadata ?? {}, deleted: false }
    },
    async updateCustomerMetadata(customerId, metadata) {
      await stripeClient.customers.update(customerId, { metadata })
    },
    async retrieveSubscriptionMetadata(subscriptionId) {
      const subscription = await stripeClient.subscriptions.retrieve(subscriptionId)
      return subscription.metadata ?? {}
    },
    async updateSubscriptionMetadata(subscriptionId, metadata) {
      await stripeClient.subscriptions.update(subscriptionId, { metadata })
    },
    async updateCheckoutSessionMetadata(sessionId, metadata) {
      await stripeClient.checkout.sessions.update(sessionId, { metadata })
    },
    async attributeAffiliate(code, user, clickId) {
      const result = await attributeAffiliateForUser(code, user, { allowNewAttribution: true, clickId })
      return { ok: result.ok, reason: result.ok ? null : result.reason }
    },
    async insertEventOnce(row) {
      const { error } = await admin.from('events').insert(row)
      if (!error) return 'inserted'
      if (error.code === '23505') return 'duplicate'
      throw new GuestCheckoutOwnerError('event_insert_failed', `${row.name} not recorded: ${error.code ?? ''} ${error.message}`)
    },
    warn(message) {
      console.warn(message)
    },
  }
}

// ─── E-mail com link de entrada (conta existente, ou conta nova fora do navegador/da janela) ─────────────────────────
export const GUEST_SIGNIN_EMAIL_KIND = 'guest_checkout_signin' as const
export const GUEST_SIGNIN_EMAIL_TIMEOUT_MS = 8000
export const GUEST_SIGNIN_LINK_PATH = '/auth/guest-link'

/** Link para a rota que troca o token do Auth por sessão (verifyOtp com token_hash), sem PKCE: funciona em outro aparelho. */
export function guestSignInLink(origin: string, tokenHash: string, next = '/studio'): string {
  return `${origin}${GUEST_SIGNIN_LINK_PATH}?token_hash=${encodeURIComponent(tokenHash)}&next=${encodeURIComponent(next)}`
}

export function guestSignInEmailMessage(link: string): { subject: string; text: string; html: string } {
  const subject = 'Your Kineo sign-in link'
  const text =
    'Your Kineo plan is active on this email.\n\n' +
    `Sign in here (one use, expires soon): ${link}\n\n` +
    'If you did not buy a Kineo plan, you can ignore this email — nobody can sign in without this link.\n\n' +
    'Kineo · usekineo.com'
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;color:#0E1116;line-height:1.6;max-width:480px;">' +
    '<p>Your Kineo plan is active on this email.</p>' +
    `<p><a href="${link}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0A5CFF;color:#ffffff;font-weight:700;text-decoration:none;">Sign in to Kineo</a></p>` +
    '<p style="color:#5A5F67;font-size:13px;">One use, expires soon. If you did not buy a Kineo plan, you can ignore this email — nobody can sign in without this link.</p>' +
    '<p style="margin:0;color:#5A5F67;font-size:13px;">Kineo · <a href="https://www.usekineo.com" style="color:#0A5CFF;">usekineo.com</a></p>' +
    '</div>'
  return { subject, text, html }
}

// ─── E-mail "sua conta Kineo está pronta" (webhook, conta NASCIDA desta compra, 1× por sessão Stripe) ───────────────
// Cobre quem fechou a aba antes da volta da Stripe: sem ele, a conta paga existe e a pessoa não sabe como entrar.
// Conta que já existia NÃO recebe este e-mail (ela recebe só o link da página /checkout/guest, como antes).
// Mesmo padrão dos transacionais da casa (Resend, ledger 'revenue', evento de desfecho) e três regras do webhook:
//   1. NUNCA LANÇA — e-mail que falha não pode virar 500 nem reenvio de um pagamento já concedido.
//   2. AWAIT em tudo, com teto no Resend (void antes do return morre na Vercel).
//   3. Uma vez por sessão: reserva guest_ready_email:<sessão> em stripe_events ANTES de enviar; falhou o envio, a
//      reserva é devolvida (um reenvio do evento pode tentar de novo) e o fracasso vira evento.
// Sem preço no texto (regra da casa: moeda não localiza em e-mail). O link é o token NOSSO (lib/auth/guestAccess.ts),
// que não morre quando o login de uso único gera outro link do Auth logo depois.
export const GUEST_READY_EMAIL_KIND = 'guest_account_ready' as const
export const GUEST_READY_EMAIL_PATH = '/auth/guest-link'
/** Origem pública fixa: o webhook não sabe em que host a pessoa comprou (mesma escolha de /api/send-welcome). */
export const GUEST_EMAIL_APP_ORIGIN = 'https://www.usekineo.com'

export function guestReadyLink(origin: string, token: string): string {
  return `${origin}${GUEST_READY_EMAIL_PATH}?ready=${encodeURIComponent(token)}`
}

export function guestAccountReadyEmailMessage(link: string): { subject: string; text: string; html: string } {
  const days = Math.max(1, Math.round(GUEST_READY_LINK_TTL_HOURS / 24))
  const validity = `This button works once and expires in ${days} day${days === 1 ? '' : 's'}.`
  const after = 'After that, sign in with this email: continue with Google, or use “Forgot password” on the sign-in page to set a password.'
  const subject = 'Your Kineo account is ready'
  const text =
    'Your Kineo account is ready and your plan is active on this email.\n\n' +
    `Sign in to start creating: ${link}\n\n` +
    `${validity} ${after}\n\n` +
    'If you did not buy a Kineo plan, reply to this email and we will sort it out.\n\n' +
    'Kineo · usekineo.com'
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
  const html =
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F7F7F5" style="background-color:#F7F7F5;">' +
    '<tr><td align="center" style="padding:32px 16px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#FFFFFF;border:1px solid #E3E6EC;border-radius:16px;">' +
    `<tr><td style="padding:28px 28px 8px;font-family:${font};color:#0E1116;font-size:20px;font-weight:800;">Your Kineo account is ready</td></tr>` +
    `<tr><td style="padding:0 28px 18px;font-family:${font};color:#5A5F67;font-size:15px;line-height:22px;">Your plan is active on this email. Sign in to start creating.</td></tr>` +
    `<tr><td style="padding:0 28px 22px;"><a href="${link}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#0A5CFF;color:#FFFFFF;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;">Sign in to Kineo</a></td></tr>` +
    `<tr><td style="padding:0 28px 24px;font-family:Arial,sans-serif;color:#5A5F67;font-size:13px;line-height:20px;">${validity} ${after}<br><br>If you did not buy a Kineo plan, reply to this email and we will sort it out.</td></tr>` +
    '</table>' +
    '<p style="margin:16px 0 0;font-family:Arial,sans-serif;color:#5A5F67;font-size:12px;">Kineo · <a href="https://www.usekineo.com" style="color:#0A5CFF;">usekineo.com</a></p>' +
    '</td></tr></table>'
  return { subject, text, html }
}

export async function sendGuestAccountReadyEmailOnce(input: {
  admin: SupabaseClient
  stripeSessionId: string
  userId: string
  email: string
  secret: string | null | undefined
  resendKey: string | null | undefined
  from: string
  origin?: string
  nowMs?: number
}): Promise<'sent' | 'duplicate' | 'skipped' | 'failed'> {
  const event = async (name: string, metadata: Record<string, unknown>) => {
    try {
      await input.admin.from('events').insert({
        name,
        user_id: input.userId,
        path: '/api/stripe/webhook',
        metadata: { version: GUEST_CHECKOUT_VERSION, stripe_session_id: input.stripeSessionId, ...metadata },
      })
    } catch {
      // evento é registro; o desfecho já foi decidido
    }
  }
  try {
    if (!input.resendKey || !input.secret) {
      await event(GUEST_CHECKOUT_EVENTS.readyEmailFailed, { reason: !input.resendKey ? 'sender_unconfigured' : 'secret_missing' })
      return 'skipped'
    }
    const claimId = guestReadyEmailClaimId(input.stripeSessionId)
    const { error: claimError } = await input.admin.from('stripe_events').insert({ id: claimId })
    if (claimError?.code === '23505') return 'duplicate'
    if (claimError) {
      console.error('[guest-checkout] ready email not sent (claim failed):', input.stripeSessionId.slice(0, 16), claimError.code)
      await event(GUEST_CHECKOUT_EVENTS.readyEmailFailed, { reason: 'claim_failed' })
      return 'failed'
    }
    const release = async () => {
      try {
        await input.admin.from('stripe_events').delete().eq('id', claimId)
      } catch {
        // reserva presa = nenhum 2º e-mail, nunca um a mais
      }
    }
    const nowMs = input.nowMs ?? Date.now()
    const token = signGuestReadyToken({
      userId: input.userId,
      stripeSessionId: input.stripeSessionId,
      expiresAtSeconds: Math.floor(nowMs / 1000) + GUEST_READY_LINK_TTL_HOURS * 3600,
      secret: input.secret,
    })
    const message = guestAccountReadyEmailMessage(guestReadyLink(input.origin ?? GUEST_EMAIL_APP_ORIGIN, token))
    let res: Response
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(GUEST_SIGNIN_EMAIL_TIMEOUT_MS),
        headers: { Authorization: `Bearer ${input.resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: input.from, to: [input.email], subject: message.subject, text: message.text, html: message.html }),
      })
    } catch (sendError) {
      const detail = (sendError instanceof Error ? sendError.message : String(sendError)).slice(0, 200)
      await recordEmailSend({ kind: GUEST_READY_EMAIL_KIND, priority: 'revenue', userId: input.userId, ok: false, detail, admin: input.admin })
      await release()
      await event(GUEST_CHECKOUT_EVENTS.readyEmailFailed, { reason: 'send_threw' })
      return 'failed'
    }
    await recordResendResponse({ kind: GUEST_READY_EMAIL_KIND, priority: 'revenue', userId: input.userId, res, admin: input.admin })
    if (!res.ok) {
      await release()
      await event(GUEST_CHECKOUT_EVENTS.readyEmailFailed, { reason: 'resend_rejected', http_status: res.status })
      return 'failed'
    }
    await event(GUEST_CHECKOUT_EVENTS.readyEmailSent, { link_ttl_hours: GUEST_READY_LINK_TTL_HOURS })
    return 'sent'
  } catch (error) {
    console.error('[guest-checkout] ready email threw (webhook continues):', error instanceof Error ? error.message : String(error))
    return 'failed'
  }
}
