import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { createHash } from 'node:crypto'
// KINEO-PRICING-V3D-2026-07-26 — credit grants come from the single price
// source. They used to be typed out as literals in three places (checkout
// route, this webhook, lib/pricing.ts) and drifted at every reprice.
import {
  AUTOPILOT_PILOT_CREDITS,
  AUTOPILOT_PILOT_DAYS,
  AUTOPILOT_PILOT_PRICES,
  BULK_PACKS,
  PACK_CREDITS,
  TIER_CREDITS,
  isAmbiguousOneTimeUsdAmount,
  isBulkPackId,
  type CheckoutCurrency,
  type CheckoutPlanTier,
} from '@/lib/checkoutPricing'
// KINEO-PILOT-99-2026-07-26 — o nome do plano e o cálculo do prazo são os MESMOS
// que o cron lê. Se divergirem, o piloto ou nunca expira ou nunca gera.
import { AUTOPILOT_PILOT_PLAN, autopilotPilotExpiresAt } from '@/lib/autopilot/config'
// KINEO-REVERSE-TRIAL-P2-2026-08-07 — fase 2, item webhook: pagamento
// bem-sucedido carimba trial_status='converted' na hora (markTrialConverted
// abaixo). A flag e o evento seguem o padrão do resto do trial.
import { REVERSE_TRIAL_ENABLED } from '@/lib/reverseTrial'
import { writeServerEvent } from '@/lib/serverEvents'
import { TRIAL_GRANT_CREDITS } from '@/lib/reverseTrial'
import {
  AffiliateLedgerIntegrityError,
  calculateAffiliateCommission,
  commitAffiliateCommission,
  normalizeAffiliateCurrency,
  type AffiliateCommissionRecord,
  type ExistingAffiliateCommission,
} from '@/lib/affiliateLedger'

// KINEO-PILOT-99-2026-07-26 — fallback por valor para o piloto de $99, QUALIFICADO
// POR MOEDA. Sem a moeda isto seria um bug de caixa: topup40 em INR custa 49900 e
// o piloto em BRL custa 49900 — o mesmo inteiro. Um top-up indiano cairia aqui e
// receberia um plano Autopilot de 7 dias de graça.
function isAutopilotPilotAmount(amount: number, currency: string | null | undefined): boolean {
  const code = (currency ?? '').toLowerCase().trim() as CheckoutCurrency
  const expected = AUTOPILOT_PILOT_PRICES[code]
  return typeof expected === 'number' && amount === expected
}

// Use service role key for webhook — bypasses RLS
function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Push #416 — owner/admin accounts are managed manually (e.g. Joseph's
// account is set to Studio by hand for testing all engines). Webhook events
// from his legacy real subscription kept overwriting that back to
// starter/free. Any plan-changing event for these emails is skipped.
const PROTECTED_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'josephskaf@hotmail.com',
  'joseph-test@shortsforgeai.com',
])

type AdminClient = ReturnType<typeof getAdminClient>

class RetryableEntitlementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RetryableEntitlementError'
  }
}

class RetryableAffiliateLedgerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RetryableAffiliateLedgerError'
  }
}

async function isProtectedProfile(
  supabase: AdminClient,
  filter: { userId?: string; customerId?: string }
): Promise<boolean> {
  let query = supabase.from('profiles').select('email').limit(1)
  if (filter.userId) query = query.eq('id', filter.userId)
  else if (filter.customerId) query = query.eq('stripe_customer_id', filter.customerId)
  else return false

  const { data, error } = await query.single()
  if (error) {
    // No matching profile means the account is simply not protected; retain
    // the previous behavior while propagating actual database failures.
    if (error.code === 'PGRST116') return false
    throw new RetryableEntitlementError(
      `Failed to check protected profile: ${error.code ?? 'unknown'} ${error.message}`
    )
  }
  return PROTECTED_EMAILS.has((data?.email ?? '').toLowerCase())
}

// ═══ KINEO-CUPOM-AFILIADO-2026-08-21 — ATRIBUIÇÃO SEM LINK ══════════════
//
// O buraco: nosso afiliado só ganha se o comprador CLICAR no link /a/CODIGO.
// Isso funciona em post de blog e newsletter, e falha exatamente onde estão
// os criadores que queremos — TikTok, Reels e Shorts, onde não há link
// clicável no vídeo. O criador fala "usa JOAO20", a pessoa digita no
// checkout, paga, e o criador não ganha nada. Ele descobre, para de divulgar.
//
// A trava não era falta de tabela: `affiliates.coupon_code` JÁ EXISTE e o
// admin JÁ deixa preencher. O que faltava é ninguém LER na hora do dinheiro.
//
// Como funciona agora: se o comprador não tem link (affiliate_id null), a
// gente olha o código promocional que ele digitou na Stripe, traduz o ID
// para o texto do cupom, e procura um afiliado dono daquele texto. Achou →
// comissão paga E o perfil fica carimbado, então TODA RENOVAÇÃO futura já
// credita sozinha (recorrência não passa por cupom nenhum).
//
// Ordem de precedência deliberada: LINK GANHA DO CUPOM. Quem clicou primeiro
// é o dono da indicação (first-touch, mesma regra do /a/[code]). O cupom é
// só a rede de segurança de quem chegou sem link.
async function resolveAffiliateByCoupon(
  supabase: AdminClient,
  session: Stripe.Checkout.Session,
  compradorUserId: string
): Promise<string | null> {
  try {
    // Atalho barato: `amount_discount` JÁ vem no corpo do webhook. A maioria
    // esmagadora dos pagamentos não usa cupom nenhum, e sem esta linha toda
    // compra pagaria duas chamadas extras à Stripe por nada.
    if (!session.total_details?.amount_discount) return null

    // ⚠ CUIDADO AO MEXER: `session.discounts` NÃO EXISTE nesta versão do SDK
    // (stripe 16, apiVersion 2024-06-20) — escrevi assim na primeira tentativa
    // e o tsc pegou. O desconto só aparece em `total_details.breakdown`, que
    // NÃO vem no corpo do webhook: precisa de um retrieve com expand. Como
    // `ignoreBuildErrors` está ligado no next.config, um acesso a campo
    // inexistente compilaria e viraria `undefined` calado em produção — o
    // trilho inteiro nunca dispararia e ninguém perceberia.
    const cheia = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['total_details.breakdown.discounts'],
    })
    const promoRaw = cheia.total_details?.breakdown?.discounts?.[0]?.discount?.promotion_code
    if (!promoRaw) return null
    // Pode vir expandido (objeto) ou como id cru (promo_xxx). O texto que a
    // pessoa digitou ("KINEOABC123") é o `.code`.
    const code =
      typeof promoRaw === 'string'
        ? ((await stripe.promotionCodes.retrieve(promoRaw))?.code ?? '').trim()
        : (promoRaw.code ?? '').trim()
    if (!code) return null

    // ⚠ COMPARAÇÃO EXATA, NÃO `ilike`. O texto vem do cliente e o `ilike` do
    // PostgREST trata `%` e `_` como CURINGAS: um código digitado como "KINEO%"
    // casaria com o cupom de QUALQUER afiliado. Os códigos que nós cunhamos são
    // [A-Z0-9] e nunca teriam esse problema, mas o admin grava `coupon_code` em
    // texto livre — a porta existia.
    const codeUpper = code.toUpperCase()
    if (!/^[A-Z0-9]{4,24}$/.test(codeUpper)) return null
    const { data: candidatos, error: buscaErro } = await supabase
      .from('affiliates')
      .select('id, user_id, status, coupon_code')
      .eq('coupon_code', codeUpper)
      .limit(2)
    if (buscaErro) {
      throw new AffiliateLedgerIntegrityError('Could not resolve affiliate coupon owner')
    }
    // Dois afiliados com o mesmo texto = ambiguidade. Pagar ao "primeiro" seria
    // sortear o dono do dinheiro; melhor não pagar e deixar rastro no log.
    if (!candidatos || candidatos.length !== 1) {
      if (candidatos && candidatos.length > 1) {
        console.error(`[affiliate coupon] AMBIGUO: ${candidatos.length} afiliados com o cupom ${codeUpper}`)
        throw new AffiliateLedgerIntegrityError('Affiliate coupon has more than one owner')
      }
      return null
    }
    const aff = candidatos[0]
    if (aff.status !== 'active') return null

    // ⚠ AUTO-INDICAÇÃO. Sem isto, qualquer pessoa vira afiliado em dois cliques
    // (apply nasce 'active'), abre /affiliate para o cupom ser cunhado, e assina
    // com o próprio código — levando 40% de si mesma, TODO MÊS, para sempre.
    // A margem do Creator é ~$10; menos $6 de comissão sobra $4, e quem consumir
    // os créditos todos vira prejuízo permanente. O guard equivalente já existia
    // em /api/affiliate/attribute e não tinha sido espelhado aqui.
    if (aff.user_id && aff.user_id === compradorUserId) {
      console.warn(`[affiliate coupon] auto-indicacao bloqueada: user ${compradorUserId}`)
      return null
    }
    return aff.id as string
  } catch (err) {
    if (err instanceof AffiliateLedgerIntegrityError) throw err
    throw new AffiliateLedgerIntegrityError('Could not verify Stripe affiliate coupon')
  }
}

// #480 — Affiliate commission. If the paying user was attributed to an affiliate
// (profiles.affiliate_id), record a PENDING commission (rate × amount paid).
// Idempotent via unique(provider, external_id). Stays 'pending' until the admin
// approves it (so refunds inside the window simply never get approved/paid).
async function recordAffiliateCommission(
  supabase: AdminClient,
  args: { userId: string; externalId: string; amountGross: number; currency: string; type: 'initial' | 'recurring'; attributionSystem?: string | null; session?: Stripe.Checkout.Session }
): Promise<void> {
  // Rewardful owns this charge. Suppress the custom ledger so the same
  // initial payment or renewal can never create two affiliate liabilities.
  if (args.attributionSystem === 'rewardful') return
  if (!args.userId || !args.externalId) return

  try {
    const { data: prof, error: profileError } = await supabase
      .from('profiles')
      .select('affiliate_id')
      .eq('id', args.userId)
      .single()
    if (profileError) {
      throw new AffiliateLedgerIntegrityError('Could not read paying user affiliate attribution')
    }
    let affiliateId = (prof?.affiliate_id as string | null | undefined) ?? null

    // ⚠ ESTE BLOCO FICA ANTES DO GUARD DE VALOR, DE PROPÓSITO.
    // O `amountGross <= 0` morava três linhas acima e matava a atribuição por
    // cupom antes dela acontecer. Numa sessão que fecha em ZERO — cupom que
    // cobre o valor todo, ou trial sem cobrança — a função retornava cedo, o
    // perfil NUNCA era carimbado, e como a renovação só sabe ler
    // `profiles.affiliate_id`, o criador ficava sem receber PARA SEMPRE. Sem
    // erro, sem log, sem ninguém perceber. O carimbo é atribuição, não
    // pagamento: tem que acontecer mesmo quando não entrou dinheiro hoje.
    if (!affiliateId && args.session) {
      affiliateId = await resolveAffiliateByCoupon(supabase, args.session, args.userId)
      if (affiliateId) {
        // First-touch: a busca é por PESSOA, não por afiliado. Filtrar por
        // afiliado (como estava) não enxergava a indicação de OUTRO criador e
        // deixava o cupom sequestrar uma indicação que já tinha dono — o link
        // de A viraria comissão vitalícia de B por um código digitado.
        const { data: indicacaoExistente, error: indicacaoErro } = await supabase
          .from('affiliate_referrals')
          .select('id, affiliate_id')
          .eq('referred_user_id', args.userId)
          .maybeSingle()
        if (indicacaoErro) {
          throw new AffiliateLedgerIntegrityError('Could not verify first-touch affiliate referral')
        }

        if (indicacaoExistente && indicacaoExistente.affiliate_id !== affiliateId) {
          // Já tem dono e é outro. First-touch vence: honra o primeiro e
          // ignora o cupom. O comprador fica com o desconto; a comissão vai
          // para quem trouxe a pessoa.
          console.warn(
            `[affiliate coupon] cupom de ${affiliateId} ignorado: user ${args.userId} ja indicado por ${indicacaoExistente.affiliate_id}`
          )
          affiliateId = indicacaoExistente.affiliate_id as string
        } else {
          if (!indicacaoExistente) {
            const { error: insErro } = await supabase
              .from('affiliate_referrals')
              .insert({ affiliate_id: affiliateId, referred_user_id: args.userId, status: 'signup' })
            if (insErro && insErro.code !== '23505') {
              throw new AffiliateLedgerIntegrityError('Could not create coupon affiliate referral')
            }
            if (insErro?.code === '23505') {
              const { data: raceWinner, error: raceError } = await supabase
                .from('affiliate_referrals')
                .select('id, affiliate_id')
                .eq('referred_user_id', args.userId)
                .single()
              if (raceError || !raceWinner?.affiliate_id) {
                throw new AffiliateLedgerIntegrityError('Could not reconcile affiliate referral race')
              }
              affiliateId = raceWinner.affiliate_id as string
            }
          }
        }

        // Stamp the canonical first-touch owner, including the case where a
        // coupon lost to an older referral. Renewals only know this profile
        // field, so skipping the repair loses every later commission.
        const { data: stampedProfile, error: carimboErro } = await supabase
          .from('profiles')
          .update({ affiliate_id: affiliateId })
          .eq('id', args.userId)
          .select('id')
          .maybeSingle()
        if (carimboErro || !stampedProfile?.id) {
          throw new AffiliateLedgerIntegrityError('Could not persist canonical affiliate attribution')
        }
        console.log(`[affiliate coupon] user ${args.userId} → affiliate ${affiliateId} (sem link, via cupom)`)
      }
    }
    if (!affiliateId) return
    // Só AGORA o valor importa: atribuição já está gravada acima, e o que este
    // guard evita é lançar uma comissão de valor zero ou negativo.
    if (!args.amountGross || args.amountGross <= 0) return
    const currency = normalizeAffiliateCurrency(args.currency || 'usd')
    const { data: aff, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, commission_rate, status')
      .eq('id', affiliateId)
      .single()
    if (affiliateError) {
      throw new AffiliateLedgerIntegrityError('Could not read affiliate commission terms')
    }
    if (!aff || aff.status !== 'active') return
    const rate = Number(aff.commission_rate ?? 0)
    const commission = calculateAffiliateCommission(args.amountGross, rate)

    const { data: ref, error: referralError } = await supabase
      .from('affiliate_referrals')
      .select('id, status')
      .eq('affiliate_id', affiliateId)
      .eq('referred_user_id', args.userId)
      .maybeSingle()
    if (referralError) {
      throw new AffiliateLedgerIntegrityError('Could not read affiliate referral for commission')
    }

    const row: AffiliateCommissionRecord = {
      affiliate_id: affiliateId,
      referral_id: ref?.id ?? null,
      provider: 'stripe',
      external_id: args.externalId,
      type: args.type,
      amount_gross: args.amountGross,
      currency,
      commission_amount: commission,
      status: 'pending',
      period: new Date().toISOString().slice(0, 10),
    }

    const outcome = await commitAffiliateCommission({
      async find(provider, externalId) {
        const { data, error } = await supabase
          .from('affiliate_commissions')
          .select('affiliate_id, referral_id, provider, external_id, type, amount_gross, currency, commission_amount')
          .eq('provider', provider)
          .eq('external_id', externalId)
          .maybeSingle()
        if (error) throw new AffiliateLedgerIntegrityError('Could not reconcile affiliate commission')
        return (data as ExistingAffiliateCommission | null) ?? null
      },
      async insert(value) {
        const { error } = await supabase.from('affiliate_commissions').insert(value)
        if (!error) return 'inserted'
        if (error.code === '23505') return 'duplicate'
        throw new AffiliateLedgerIntegrityError('Could not insert affiliate commission')
      },
      async markReferralPaid(referralId, convertedAt) {
        const { data, error } = await supabase
          .from('affiliate_referrals')
          .update({ status: 'paid', converted_at: convertedAt })
          .eq('id', referralId)
          .select('id')
          .maybeSingle()
        if (error || !data?.id) {
          throw new AffiliateLedgerIntegrityError('Could not reconcile paid affiliate referral')
        }
      },
    }, row, new Date().toISOString())

    if (outcome === 'inserted') {
      console.log(`[affiliate commission] +${commission} (${args.type}) affiliate ${affiliateId} ← user ${args.userId}`)
    }
  } catch (err) {
    const reason = err instanceof AffiliateLedgerIntegrityError ? err.message : 'Unexpected affiliate ledger failure'
    console.error('[affiliate commission] retry required:', reason)
    throw new RetryableAffiliateLedgerError(reason)
  }
}

// KINEO-PAYMENT-EVENT-2026-07-15 — the checkout success page used to be the
// only writer of `payment_success`. Buyers who closed that tab were invisible
// to the funnel, while refreshes could create duplicates. Stripe is the source
// of truth: one verified, deduped webhook event now writes the canonical row.
async function recordPaymentSuccess(
  supabase: AdminClient,
  stripeEventId: string,
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.payment_status !== 'paid') return

  // Entitlement failures intentionally release the stripe_events guard so
  // Stripe can retry. Keep this analytics row idempotent across that retry.
  const { data: existingRows, error: existingError } = await supabase
    .from('events')
    .select('id')
    .eq('name', 'payment_success')
    .contains('metadata', { stripe_session_id: session.id })
    .limit(1)
  if (!existingError && existingRows && existingRows.length > 0) return
  if (existingError) {
    console.error('[stripe webhook] payment_success dedupe lookup error:', existingError.code, existingError.message)
  }

  const userId = session.metadata?.supabase_user_id ?? session.client_reference_id ?? null
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id ?? null
  const rawBrowserSessionId = session.metadata?.browser_session_id ?? ''
  let browserSessionId: string | null = /^[A-Za-z0-9_-]{8,64}$/.test(rawBrowserSessionId)
    ? rawBrowserSessionId
    : null
  // Checkout idempotency deliberately ignores the originating tab. Keeping a
  // tab id in Stripe metadata would make otherwise-identical requests use the
  // same key with different parameters. Recover attribution from the
  // deterministic checkout_started event instead.
  if (!browserSessionId) {
    const { data: checkoutRows, error: checkoutLookupError } = await supabase
      .from('events')
      .select('session_id')
      .eq('name', 'checkout_started')
      .contains('metadata', { stripe_session_id: session.id })
      .limit(1)
    if (checkoutLookupError) {
      console.error('[stripe webhook] checkout_started attribution lookup error:', checkoutLookupError.code, checkoutLookupError.message)
    } else {
      const recoveredSessionId = checkoutRows?.[0]?.session_id
      if (typeof recoveredSessionId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(recoveredSessionId)) {
        browserSessionId = recoveredSessionId
      }
    }
  }
  const eventHex = createHash('sha256').update(`payment_success:${session.id}`).digest('hex').slice(0, 32)
  const row = {
    id: `${eventHex.slice(0, 8)}-${eventHex.slice(8, 12)}-${eventHex.slice(12, 16)}-${eventHex.slice(16, 20)}-${eventHex.slice(20)}`,
    name: 'payment_success',
    user_id: userId,
    path: '/api/stripe/webhook',
    session_id: browserSessionId,
    metadata: {
      source: 'stripe_webhook',
      stripe_event_id: stripeEventId,
      stripe_session_id: session.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      checkout_mode: session.mode,
      tier: session.metadata?.tier ?? null,
      billing: session.metadata?.billing ?? null,
      pack: session.metadata?.pack ?? null,
      checkout_origin: session.metadata?.checkout_origin ?? null,
      intent_campaign: session.metadata?.intent_campaign ?? null,
      checkout_value_context: session.metadata?.checkout_value_context ?? null,
      checkout_value_variant: session.metadata?.checkout_value_variant ?? null,
      checkout_value_output_count: session.metadata?.checkout_value_output_count ?? null,
      plan_fit_planned_engine: session.metadata?.plan_fit_planned_engine ?? null,
      plan_fit_monthly_videos: session.metadata?.plan_fit_monthly_videos ?? null,
      plan_fit_monthly_credits: session.metadata?.plan_fit_monthly_credits ?? null,
      plan_fit_seconds: session.metadata?.plan_fit_seconds ?? null,
      plan_fit_recommended_tier: session.metadata?.plan_fit_recommended_tier ?? null,
      plan_fit_selected_tier_matches: session.metadata?.plan_fit_selected_tier_matches ?? null,
      plan_fit_video_id: session.metadata?.plan_fit_video_id ?? null,
      intro: session.metadata?.intro === '1',
      amount_total: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
    },
  }

  const { error } = await supabase.from('events').insert(row)
  if (!error || error.code === '23505') return

  // A deleted auth user should not make us lose the revenue event. If the
  // user_id foreign key rejects the row, preserve the payment with user=null.
  if (userId && error.code === '23503') {
    const { error: anonymousError } = await supabase
      .from('events')
      .insert({ ...row, user_id: null })
    if (!anonymousError || anonymousError.code === '23505') return
    console.error('[stripe webhook] payment_success fallback insert error:', anonymousError.code, anonymousError.message)
    return
  }

  console.error('[stripe webhook] payment_success insert error:', error.code, error.message)
}

// KINEO-BULK-2026-07-27 — evento de compra de atacado, com nome próprio.
//
// POR QUE UM EVENTO NOVO, se `payment_success` já grava esta sessão: porque
// `payment_success` é o balde de TODA receita, e a única forma de tirar atacado
// de lá é filtrar `metadata->>'pack'` linha a linha. O atacado é o primeiro canal
// de receita desenhado desta empresa — ele precisa de um par contável
// (`bulk_checkout_started` → `bulk_purchase_completed`) para que a taxa de
// conversão exista sem ninguém reconstruir coorte na mão.
//
// Ambos são SERVER_ONLY (app/api/events/route.ts): um burst forjado no sink do
// browser inflaria o topo do funil e faria a conversão mentir para baixo — o
// mesmo estrago que já aconteceu com viral_onboarding_viewed (9,7x) e
// generate_arrived_server (2,7x).
//
// Idempotente pelo mesmo desenho de recordPaymentSuccess: o id da linha é
// derivado do id da sessão Stripe, então uma retentativa colide em 23505 em vez
// de inflar a contagem de vendas.
async function recordBulkPurchase(
  supabase: AdminClient,
  args: {
    userId: string
    session: Stripe.Checkout.Session
    videos: number
    credits: number
    sku: string
  },
): Promise<void> {
  try {
    const { session } = args
    const eventHex = createHash('sha256')
      .update(`bulk_purchase_completed:${session.id}`)
      .digest('hex')
      .slice(0, 32)
    const row = {
      id: `${eventHex.slice(0, 8)}-${eventHex.slice(8, 12)}-${eventHex.slice(12, 16)}-${eventHex.slice(16, 20)}-${eventHex.slice(20)}`,
      name: 'bulk_purchase_completed',
      user_id: args.userId,
      path: '/api/stripe/webhook',
      metadata: {
        source: 'stripe_webhook',
        sku: args.sku,
        bulk_videos: args.videos,
        credits_granted: args.credits,
        stripe_session_id: session.id,
        amount_total: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
      },
    }

    const { error } = await supabase.from('events').insert(row)
    if (!error || error.code === '23505') return

    // Usuário apagado no auth não pode custar o evento de receita — mesma
    // recuperação que payment_success faz.
    if (error.code === '23503') {
      const { error: anonymousError } = await supabase.from('events').insert({ ...row, user_id: null })
      if (!anonymousError || anonymousError.code === '23505') return
      console.error('[stripe webhook] bulk_purchase_completed fallback insert error:', anonymousError.code, anonymousError.message)
      return
    }
    console.error('[stripe webhook] bulk_purchase_completed insert error:', error.code, error.message)
  } catch (err) {
    // Telemetria nunca derruba uma concessão de crédito já confirmada.
    console.error('[stripe webhook] bulk_purchase_completed threw:', err)
  }
}

// KINEO-REVERSE-TRIAL-P2-2026-08-07 — REVERSE TRIAL, FASE 2 (webhook):
// pagamento bem-sucedido fecha o trial como 'converted' NA HORA, sem esperar a
// próxima passada do cron de downgrade (que já faz o mesmo por isPayingProfile,
// mas só de hora em hora — e o A/B 3d/7d conta conversão por esta coluna).
//
// Decisões que a revisão adversarial obrigou a escrever aqui:
//
// 1. SÓ 'active' e 'expired' viram 'converted' — NUNCA 'converted' (retry do
//    Stripe acha 0 linhas e não duplica o evento: idempotente por construção) e
//    NUNCA 'downgraded' (estado terminal escrito pelo cron; uma compra tardia é
//    conversão dos e-mails D3+, não do trial — reabrir o estado corromperia o
//    braço do A/B que já contou aquele trial como churn).
//    ⚠️ ATUALIZADO POR KINEO-TRIAL-REVIVE-RACE-2026-08-11 — esta regra continua
//    valendo AQUI, e a lista `.in(['active','expired'])` abaixo NÃO muda. Mas a
//    frase "estado terminal" deixou de ser verdadeira em termos absolutos:
//    recordReverseTrialRefundForRender (lib/reverseTrial.ts) agora reabre
//    'downgraded' → 'active' num caso e só um — estorno de falha de FORNECEDOR
//    que derruba o consumo abaixo do teto com o relógio vivo, atrás de 6
//    guardas. Consequência para ESTE arquivo: uma conta revivida chega aqui
//    como 'active' e é convertida normalmente, o que está certo do ponto de
//    vista do produto (ela comprou de um trial vivo) mas NÃO do ponto de vista
//    do A/B — ela passou por um churn no meio e o painel, que bucketiza por
//    `trial_status`, a contaria como conversão limpa. O evento
//    `trial_cap_refunded` carrega `ab_cohort_note='revived_after_provider_failure'`
//    para permitir identificá-la.
//    ✅ PAGO em KINEO-AB-CENSORING-2026-08-11. Duas correções ao texto acima:
//    (a) o painel do A/B é **/admin/trial-abuse**, não /admin/trial-cohort —
//    a dívida ficou registrada contra a tela errada desde o começo; (b) a
//    revivida NÃO é excluída, e sim CONTADA e exibida: "foi revivida" é uma
//    variável pós-tratamento e remover linhas por ela seleciona a amostra pelo
//    desfecho. O que o painel passou a fazer é maior que o join: o denominador
//    deixou de ser status (que anda para trás) e virou maturidade por âncora
//    imutável. Ler o cabeçalho de lá antes de citar qualquer taxa do 3d×7d.
// 2. BEST-EFFORT, nunca lança: roda DEPOIS do entitlement confirmado, e um
//    carimbo de experimento não pode custar retry de webhook nem atrasar a
//    resposta ao Stripe. Se falhar, o cron converte na rodada seguinte — a
//    rede de segurança registrada em downgradeExpiredTrial.
// 3. Atrás da flag, como todo o trial: com a flag OFF nenhum perfil tem
//    trial_status para converter (o gate poupa o round-trip). Rollback (flag
//    OFF com trials vivos) continua coberto: o cron decide SEM flag, de
//    propósito — ver o cabeçalho de trialNeedsDowngrade.
// 4. O evento 'trial_converted' só sai quando a UPDATE afetou uma linha — é o
//    par do 'trial_expired'/'trial_downgraded': acontece UMA vez por trial.
async function markTrialConverted(
  supabase: AdminClient,
  userId: string | null | undefined,
  context: { source: string; stripeRef: string | null },
): Promise<void> {
  if (!REVERSE_TRIAL_ENABLED) return
  if (!userId) return
  try {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ trial_status: 'converted' })
      .eq('id', userId)
      .in('trial_status', ['active', 'expired'])
      .select('id')
    if (error) {
      console.error('[stripe webhook] trial_converted update failed:', error.message, userId)
      return
    }
    if (!updated || updated.length === 0) return
    console.log(`[stripe webhook] TRIAL CONVERTED user=${userId.slice(0, 8)} via=${context.source}`)
    // AWAIT pelo mesmo motivo do grant e do trial_expired (lib/reverseTrial.ts):
    // acontece uma vez por trial e é o dado que o A/B 3d vs 7d mede. Nunca lança
    // (reporta false), então o await é seguro.
    await writeServerEvent({
      name: 'trial_converted',
      userId,
      path: '/api/stripe/webhook',
      metadata: { source: context.source, stripe_ref: context.stripeRef },
    })
  } catch (err) {
    console.error('[stripe webhook] trial_converted threw:', err)
  }
}

// KINEO-SPRINT-EVENTS-2026-07-15 — payment_success server-side tracking is
// ALREADY handled by recordPaymentSuccess() above (called at the top of the
// shared Checkout fulfillment case, covering immediate and delayed payment,
// subscription and pack paths. Session-level idempotency prevents double grant.

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getAdminClient()
  let dedupeRowAcquired = false
  let entitlementPending = false
  let entitlementConfirmed = false
  let checkoutFulfillmentGuard: string | null = null
  let checkoutFulfillmentGuardAcquired = false

  // Idempotency guard. Stripe retries the same event on 5xx (or if our
  // response is slow), and this handler has read-modify-write paths that
  // would double-credit a user on retry. We dedupe on event.id by inserting
  // into `stripe_events` — duplicate inserts fail and we exit early.
  // Run this once in the Supabase SQL editor:
  //   create table if not exists public.stripe_events (
  //     id text primary key,
  //     received_at timestamptz default now()
  //   );
  try {
    const { error: dedupeErr } = await supabase
      .from('stripe_events')
      .insert({ id: event.id })
    if (!dedupeErr) {
      dedupeRowAcquired = true
    } else {
      // 23505 = unique_violation — we've already processed this event.
      if (dedupeErr.code === '23505') {
        const duplicateCheckout =
          event.type === 'checkout.session.completed' ||
          event.type === 'checkout.session.async_payment_succeeded'
        const duplicateSession = duplicateCheckout
          ? event.data.object as Stripe.Checkout.Session
          : null
        // Subscription fulfillment below is idempotent by subscription id and
        // an absolute balance write. Let it resume after a process crash even
        // when event.id was already claimed. Additive legacy packs retain the
        // strict event-level early return.
        if (duplicateSession?.mode !== 'subscription') {
          return NextResponse.json({ received: true, duplicate: true })
        }
        console.warn('[stripe webhook] resuming idempotent subscription event:', event.id, duplicateSession.id)
      }
      if (dedupeErr.code !== '23505') {
        // Fulfillment without its ledger is unsafe. A 5xx asks Stripe to retry
        // after the database recovers instead of risking a duplicate grant.
        console.error('[stripe webhook] dedupe insert error:', dedupeErr.code, dedupeErr.message)
        return NextResponse.json({ error: 'Webhook idempotency unavailable' }, { status: 500 })
      }
    }
  } catch (err) {
    console.error('[stripe webhook] dedupe threw:', err)
    return NextResponse.json({ error: 'Webhook idempotency unavailable' }, { status: 500 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session

        // Delayed methods can complete Checkout while payment is still pending.
        // Grant access only after Stripe confirms settlement.
        const checkoutSettled = session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
        if (!checkoutSettled) {
          console.log('[stripe webhook] checkout payment pending; entitlement deferred:', session.id, session.payment_status)
          break
        }

        // Canonical conversion tracking happens before entitlement updates, so
        // a paid checkout remains visible even if a later profile write fails.
        // Tracking is ancillary: a temporary analytics failure must never stop
        // the paid user from receiving their entitlement.
        try {
          await recordPaymentSuccess(supabase, event.id, session)
        } catch (trackingError) {
          console.error('[stripe webhook] payment_success tracking threw:', trackingError)
        }

        // Both immediate and delayed success converge on this session key. A
        // legacy pack claims it before its additive grant; recurring checkout
        // publishes it only after the idempotent entitlement update succeeds.
        checkoutFulfillmentGuard = `checkout_fulfilled:${session.id}`

        // ── Path A: Legacy one-time credit-pack purchase via Payment Link ──
        // Push #020 moved off Payment Links onto Stripe Checkout subscriptions,
        // but old links may still exist in the wild. Keep the legacy mapping
        // so refunds / late webhooks don't lose users their pack.
        if (session.mode === 'payment') {
          // #473 — Starter Pack ($4.90 → 10 Shorts) + legacy credit packs.
          // Prefer metadata.pack_credits (currency-proof) over the amount map,
          // and accept metadata.supabase_user_id as well as client_reference_id.
          const userId = session.metadata?.supabase_user_id ?? session.client_reference_id
          if (!userId) {
            console.warn('[stripe webhook] payment session has no user id', session.id)
            break
          }

          // KINEO-AVATAR-PACKS-RETIRED-2026-07-06 — the metadata.avatar_credits
          // crediting block (which topped up the SEPARATE profiles.avatar_credits
          // balance for the retired avatar packs) was removed here. No checkout
          // path sets metadata.avatar_credits anymore — avatar videos now cost
          // 120 universal video_credits — so the block was dead. Existing
          // profiles.avatar_credits balances are left untouched in the DB.
          // The Starter Pack / top-ups keep using metadata.pack_credits below.

          const metaCredits = Number(session.metadata?.pack_credits ?? 0)
          const amount = session.amount_total ?? 0

          // KINEO-PILOT-99-2026-07-26 — o piloto de $99 é a ÚNICA compra one-time
          // que também muda `plan`, então o reconhecimento aqui é o mais estrito
          // dos três fallbacks deste bloco:
          //   1. metadata.pack / metadata.plan_grant → caminho normal, exato;
          //   2. valor + moeda → só quando NÃO há metadata.pack alguma, isto é,
          //      numa sessão que perdeu a metadata.
          // A condição (2) precisa da guarda `packMeta === ''` porque o preço do
          // piloto COLIDE com o Starter anual em USD (9900) e em BRL (49900).
          // Hoje o anual é mode:'subscription' e nem chega neste bloco, mas se um
          // dia virar pagamento único, sem esta guarda um comprador de plano anual
          // de $99 sairia daqui com plan='autopilot_pilot'.
          const packMeta = (session.metadata?.pack ?? '').trim()

          // KINEO-BULK-2026-07-27 — os pacotes de atacado colidem em VALOR com o
          // piloto: bulk10 e autopilot_pilot custam os dois 9900 em USD (e
          // bulk50 empata com o Starter anual em 37900). O fallback por valor
          // deste bloco não consegue desempatar, e errar aqui significa entregar
          // um plano Autopilot de $299/mês para quem comprou 10 vídeos.
          //
          // Por isso o fallback do piloto agora exige, além de não haver
          // metadata.pack, que o valor NÃO esteja na lista de valores ambíguos
          // (lib/checkoutPricing.ts::AMBIGUOUS_ONE_TIME_USD_AMOUNTS, cuja
          // completude é checada por checkPricingInvariants). Uma sessão de $99
          // sem metadata deixa de ser adivinhada e passa a ser recusada com log
          // — dá para consertar à mão em minutos, ao contrário de uma concessão
          // errada, que ninguém descobre.
          const amountIsAmbiguous = isAmbiguousOneTimeUsdAmount(amount, session.currency)
          const isAutopilotPilot =
            packMeta === 'autopilot_pilot' ||
            session.metadata?.plan_grant === AUTOPILOT_PILOT_PLAN ||
            (packMeta === '' && !amountIsAmbiguous && isAutopilotPilotAmount(amount, session.currency))

          // Atacado: reconhecido SÓ por metadata.pack exata. Não há e não pode
          // haver fallback por valor para estes quatro SKUs.
          const bulkPack = isBulkPackId(packMeta) ? BULK_PACKS[packMeta] : null

          if (packMeta === '' && amountIsAmbiguous) {
            console.error(
              '[stripe webhook] AMBIGUOUS one-time amount with no metadata.pack — refusing to guess:',
              amount, session.currency, session.id,
              '(bulk pack vs autopilot pilot vs annual plan share this amount; grant it by hand)',
            )
            break
          }

          let creditsToAdd = metaCredits > 0 ? metaCredits : 0
          if (creditsToAdd === 0) {
            // Legacy Payment-Link amounts (USD): $9 → 10, $19 → 25, $4.90 → 30.
            // These only fire for sessions with NO metadata.pack_credits, i.e.
            // hosted Payment Links created before the inline-price_data route
            // existed. Every session this app creates carries pack_credits.
            if (amount === 900) creditsToAdd = 10
            else if (amount === 1900) creditsToAdd = 25
            // KINEO-PRICING-V3D-2026-07-26 — mirrors PACK_CREDITS.starter (10 → 30).
            else if (amount === 490) creditsToAdd = PACK_CREDITS.starter
            // KINEO-PRICING-V3D-2026-07-26 — $2.90 had no legacy fallback at
            // all: a starter290 session that somehow lost its metadata would
            // have been logged as "unexpected amount_total" and the buyer would
            // have paid and received nothing.
            else if (amount === 290) creditsToAdd = PACK_CREDITS.starter290
            // KINEO-PILOT-99-2026-07-26 — o bug de $2.90 (branch para 490, nenhum
            // para 290 → cartão cobrado, zero creditado) não se repete aqui: todo
            // valor que o checkout pode cobrar por este SKU tem branch, nas TRÊS
            // moedas, e nenhum deles colide com outro SKU na mesma moeda.
            else if (isAutopilotPilot) creditsToAdd = AUTOPILOT_PILOT_CREDITS
            // KINEO-BULK-2026-07-27 — sessão de atacado que manteve
            // metadata.pack mas perdeu metadata.pack_credits. Derivar do id do
            // SKU é seguro (não depende do valor) e evita o bug do $2.90:
            // cartão cobrado, zero creditado.
            else if (bulkPack) creditsToAdd = bulkPack.credits
          }

          if (creditsToAdd === 0) {
            console.warn('[stripe webhook] unexpected amount_total for credit pack:', amount, session.id)
            break
          }

          entitlementPending = true
          // Legacy packs are additive and have no transaction-capable purchase
          // ledger, so retain the conservative pre-write session marker here.
          const { error: packGuardError } = await supabase
            .from('stripe_events')
            .insert({ id: checkoutFulfillmentGuard })
          if (!packGuardError) {
            checkoutFulfillmentGuardAcquired = true
          } else if (packGuardError.code === '23505') {
            entitlementConfirmed = true
            entitlementPending = false
            console.log('[stripe webhook] credit pack already fulfilled:', session.id)
            break
          } else {
            throw new RetryableEntitlementError(
              `Failed to acquire credit-pack fulfillment guard (${session.id}): ${packGuardError.message}`
            )
          }

          // Legacy pack grants are additive. Record/reconcile the idempotent
          // commission before changing the balance, so a ledger failure can
          // safely release both guards and ask Stripe to retry without adding
          // the same credits twice.
          await recordAffiliateCommission(supabase, {
            userId,
            externalId: session.id,
            amountGross: session.amount_total ?? 0,
            currency: session.currency ?? 'usd',
            type: 'initial',
            attributionSystem: session.metadata?.affiliate_system,
            session,
          })

          const { data: profile, error: fetchErr } = await supabase
            .from('profiles')
            .select('video_credits')
            .eq('id', userId)
            .single()

          if (fetchErr) {
            throw new RetryableEntitlementError(
              `Failed to fetch profile for credit top-up (${userId}): ${fetchErr.message}`
            )
          }

          const current = profile?.video_credits ?? 0
          const next = current + creditsToAdd

          // KINEO-OFFER290-2026-07-07 — the first-purchase $2.90 offer is one per
          // account. When this session is the starter290 offer, also stamp
          // offer290_used=true so the buyer can never claim it again (checkout
          // rejects on that flag). Idempotent: this whole block only runs once
          // per event.id (stripe_events dedupe above).
          const isOffer290 = session.metadata?.pack === 'starter290'
          const profileUpdate: Record<string, unknown> = { video_credits: next, has_paid: true }
          if (isOffer290) profileUpdate.offer290_used = true

          // KINEO-PILOT-99-2026-07-26 — este é o único ponto do Path A que escreve
          // `plan`. Duas regras:
          //  1) plan e plan_expires_at são escritos JUNTOS, no mesmo UPDATE. Se a
          //     coluna plan_expires_at não existir, o UPDATE inteiro falha e o
          //     plano NÃO é concedido — em vez de conceder um Autopilot eterno
          //     por $99. É o fail-closed que a migration exige.
          //  2) PROTECTED_EMAILS: o Path A nunca mexia em `plan`, então nunca
          //     checou. Agora mexe, então checa — os créditos continuam.
          if (isAutopilotPilot) {
            if (await isProtectedProfile(supabase, { userId })) {
              console.warn('[stripe webhook] autopilot_pilot: protected account, credits only, plan untouched:', userId)
            } else {
              profileUpdate.plan = AUTOPILOT_PILOT_PLAN
              profileUpdate.plan_expires_at = autopilotPilotExpiresAt().toISOString()
            }
          }

          const { error: updateErr } = await supabase
            .from('profiles')
            // KINEO-PACK-NOWM-2026-07-06 — mark buyer as paid so their free-plan
            // Fast renders come out watermark-free (the point of the $4.90 pack).
            .update(profileUpdate)
            .eq('id', userId)

          if (updateErr) {
            // KINEO-PILOT-99-2026-07-26 — 42703 = coluna inexistente. Se for isto,
            // a migration não foi aplicada e o SKU está INERTE. Erro retentável
            // (o guard de fulfillment é liberado no finally), então o Stripe
            // reenvia e o pagamento se resolve sozinho assim que a migration rodar.
            if (isAutopilotPilot && ((updateErr as { code?: string }).code === '42703' || /plan_expires_at/.test(updateErr.message ?? ''))) {
              console.error(
                '[stripe webhook] autopilot_pilot NOT GRANTED: profiles.plan_expires_at is missing. ' +
                'Apply migrations_pending/2026-07-26_autopilot_pilot_plan_expiry.sql — the customer HAS BEEN CHARGED ' +
                `and this event will keep retrying until the column exists (session ${session.id}).`
              )
            }
            throw new RetryableEntitlementError(
              `Failed to add credits (${userId}): ${updateErr.message}`
            )
          } else {
            entitlementConfirmed = true
            entitlementPending = false
            console.log(`[stripe webhook] +${creditsToAdd} credits → user ${userId} (now ${next})`)
            if (isAutopilotPilot) {
              console.log(`[stripe webhook] autopilot_pilot granted → user ${userId}, expires in ${AUTOPILOT_PILOT_DAYS}d`)
            }
            // KINEO-BULK-2026-07-27 — o momento do dinheiro, com nome próprio.
            // `payment_success` já registra esta sessão (com pack e amount_total),
            // mas contar atacado a partir dele exige filtrar metadata. Este evento
            // fecha o funil bulk_checkout_started → bulk_purchase_completed sem
            // ninguém precisar reconstruir a coorte na mão. Escrito DEPOIS do
            // grant confirmado: um evento de compra que não corresponde a crédito
            // concedido é pior que evento nenhum.
            if (bulkPack) {
              await recordBulkPurchase(supabase, {
                userId,
                session,
                videos: bulkPack.videos,
                credits: creditsToAdd,
                sku: packMeta,
              })
              console.log(`[stripe webhook] bulk pack ${packMeta}: ${bulkPack.videos} videos → user ${userId}`)
            }
          }
          // KINEO-REVERSE-TRIAL-P2-2026-08-07 — chegar aqui = crédito CONCEDIDO
          // (o ramo de erro lança antes). Um pack/piloto comprado durante ou
          // logo após o trial também é conversão.
          await markTrialConverted(supabase, userId, { source: 'checkout_payment', stripeRef: session.id })
          break
        }

        // ── Path B: Subscription checkout ──
        const userId = session.metadata?.supabase_user_id
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null
        // KINEO-AUTOPILOT-299-2026-07-26 — 'autopilot' added. Unknown values
        // still collapse to 'basic', unchanged.
        const tier: CheckoutPlanTier =
          session.metadata?.tier === 'pro' ? 'pro'
            : session.metadata?.tier === 'starter' ? 'starter'
              : session.metadata?.tier === 'autopilot' ? 'autopilot'
                : 'basic'

        entitlementPending = true
        if (!userId || !customerId || !subscriptionId) {
          throw new RetryableEntitlementError(
            `Settled subscription Checkout missing authoritative ids (${session.id})`
          )
        }

        // Conversion — 3-day trial: if payment_status is 'no_payment_required'
        // the subscription is in trial. Grant 5 preview credits so the user
        // can experience the product before paying; full credits are granted
        // by the invoice.payment_succeeded handler on Day 4 first charge.
        const isTrial = session.payment_status === 'no_payment_required'
        // KINEO-STUDIO-400-2026-07-06 — Studio(pro)=400 (aligned with pricing.ts
        // + UI; was 600 here, 360 there → margin leak). Creator(basic) 240, Starter 50.
        // KINEO-PRICING-V3B-2026-07-10 — Creator $24.90 grants 150 credits
        // (1 Hollywood film/month included). pro/starter ALINHADOS ao rebase
        // 2:1 (200/25, iguais ao lib/pricing.ts) — fecha o leak de margem.
        // KINEO-PRICING-V3D-2026-07-26 — single source (lib/checkoutPricing).
        const planCredits = TIER_CREDITS[tier]
        // KINEO-PRICING-V3D-2026-07-26 — DEFECT (b). A discounted first month
        // gets a discounted grant. The checkout route writes the reduced number
        // into session.metadata.intro_credits (and plan_credits) whenever the
        // intro coupon is actually applied; it is read HERE, at
        // checkout.session.completed, and NOWHERE ELSE.
        //
        // This deliberately does NOT read subscription.metadata.intro. That
        // flag is permanent — it is the anti-abuse marker meaning "this
        // customer has used their one intro" — so keying the reduced grant off
        // it would under-grant every renewal for the life of the subscription.
        // invoice.payment_succeeded (the renewal path) grants TIER_CREDITS.
        const introCreditsRaw = Number(session.metadata?.intro_credits ?? 0)
        const introApplied = session.metadata?.intro === '1' &&
          Number.isFinite(introCreditsRaw) &&
          introCreditsRaw > 0 &&
          introCreditsRaw <= planCredits
        const firstMonthCredits = introApplied ? Math.floor(introCreditsRaw) : planCredits
        // ⚠️ KINEO-TRIAL-CARTAO-2026-08-20 — os 5 créditos eram do trial de 3
        // dias que nunca chegou a rodar (5cr não compram NADA: um Seedance
        // custa 20). O trial novo é de 7 dias COM CARTÃO e o grant precisa
        // valer o que a página prometeu: TRIAL_GRANT_CREDITS (80 = 4 filmes).
        // Se a pessoa deu o cartão e recebeu 5 créditos, ela cancela no mesmo
        // dia — e com razão. O restante do plano entra no dia 8, quando a
        // primeira fatura é paga (invoice.payment_succeeded, caminho que já
        // existe e concede TIER_CREDITS).
        const creditsToGrant = isTrial ? TRIAL_GRANT_CREDITS : firstMonthCredits
        const subscriptionFulfillmentId = `checkout_fulfilled:${session.id}`
        const publishSubscriptionFulfillment = async (): Promise<void> => {
          const { error: fulfillmentCompleteError } = await supabase
            .from('stripe_events')
            .insert({ id: subscriptionFulfillmentId })
          if (fulfillmentCompleteError && fulfillmentCompleteError.code !== '23505') {
            throw new RetryableEntitlementError(
              `Failed to publish Checkout fulfillment (${session.id}): ${fulfillmentCompleteError.message}`
            )
          }
        }

        const { data: fulfilledSession, error: fulfilledLookupError } = await supabase
          .from('stripe_events')
          .select('id')
          .eq('id', subscriptionFulfillmentId)
          .maybeSingle()
        if (fulfilledLookupError) {
          throw new RetryableEntitlementError(
            `Failed to verify Checkout fulfillment (${session.id}): ${fulfilledLookupError.message}`
          )
        }
        if (fulfilledSession?.id === subscriptionFulfillmentId) {
          entitlementConfirmed = true
          entitlementPending = false
          await recordAffiliateCommission(supabase, { userId, externalId: session.id, amountGross: session.amount_total ?? 0, currency: session.currency ?? 'usd', type: 'initial', attributionSystem: session.metadata?.affiliate_system, session })
          // KINEO-REVERSE-TRIAL-P2-2026-08-07 — cobre a janela de crash entre
          // o publish do fulfillment e o carimbo da primeira execução: o resume
          // idempotente passa por aqui, e a UPDATE guardada faz 0 linhas quando
          // já convertido.
          await markTrialConverted(supabase, userId, { source: 'checkout_subscription_resumed', stripeRef: session.id })
          console.log('[stripe webhook] subscription Checkout already fulfilled:', session.id)
          break
        }

        let currentSubscription: Stripe.Subscription
        try {
          currentSubscription = await stripe.subscriptions.retrieve(subscriptionId)
        } catch (subscriptionLookupError) {
          const message = subscriptionLookupError instanceof Error
            ? subscriptionLookupError.message
            : String(subscriptionLookupError)
          throw new RetryableEntitlementError(
            `Failed to verify current subscription state (${subscriptionId}): ${message}`
          )
        }
        const currentSubscriptionCustomerId = typeof currentSubscription.customer === 'string'
          ? currentSubscription.customer
          : currentSubscription.customer?.id ?? null
        const currentSubscriptionUserId = currentSubscription.metadata?.supabase_user_id
        if (
          currentSubscriptionCustomerId !== customerId ||
          currentSubscriptionUserId !== userId
        ) {
          throw new RetryableEntitlementError(
            `Subscription identity mismatch for settled Checkout (${session.id})`
          )
        }
        const subscriptionGrantsAccess =
          currentSubscription.status === 'active' || currentSubscription.status === 'trialing'
        if (!subscriptionGrantsAccess) {
          // A late/replayed Checkout event must never reactivate a subscription
          // that Stripe now reports as canceled, unpaid, paused or otherwise
          // non-access. The original payment remains recorded for analytics and
          // affiliate accounting, then this stale event is closed permanently.
          await recordAffiliateCommission(supabase, { userId, externalId: session.id, amountGross: session.amount_total ?? 0, currency: session.currency ?? 'usd', type: 'initial', attributionSystem: session.metadata?.affiliate_system, session })
          await publishSubscriptionFulfillment()
          entitlementConfirmed = true
          entitlementPending = false
          console.warn('[stripe webhook] stale Checkout replay ignored for non-access subscription:', session.id, subscriptionId, currentSubscription.status)
          break
        }
        // KINEO-AUTOPILOT-299-2026-07-26 — 'autopilot' added. Unlike the parse
        // above this one keeps `null` as its fallback: null means "the live
        // subscription carries no recognizable tier", which must NOT be treated
        // as a tier change.
        const currentSubscriptionTier: CheckoutPlanTier | null =
          currentSubscription.metadata?.tier === 'pro'
            ? 'pro'
            : currentSubscription.metadata?.tier === 'starter'
              ? 'starter'
              : currentSubscription.metadata?.tier === 'basic'
                ? 'basic'
                : currentSubscription.metadata?.tier === 'autopilot'
                  ? 'autopilot'
                  : null
        if (currentSubscriptionTier && currentSubscriptionTier !== tier) {
          // The same Stripe subscription can be changed to another tier after
          // its original Checkout. A delayed replay of that old Checkout must
          // not add the old grant or downgrade the account back to its historic
          // tier. The live subscription metadata is authoritative here.
          await recordAffiliateCommission(supabase, { userId, externalId: session.id, amountGross: session.amount_total ?? 0, currency: session.currency ?? 'usd', type: 'initial', attributionSystem: session.metadata?.affiliate_system, session })
          await publishSubscriptionFulfillment()
          entitlementConfirmed = true
          entitlementPending = false
          console.warn('[stripe webhook] stale Checkout replay ignored after subscription tier change:', session.id, tier, currentSubscriptionTier)
          break
        }

        const { data: currentProfile, error: currentProfileErr } = await supabase
          .from('profiles')
          .select('video_credits, stripe_subscription_id, plan, is_pro')
          .eq('id', userId)
          .single()

        if (currentProfileErr) {
          throw new RetryableEntitlementError(
            `Failed to read subscription profile (${userId}): ${currentProfileErr.message}`
          )
        }

        const current = currentProfile?.video_credits ?? 0
        const expectedPlan = isTrial ? `${tier}_trial` : tier
        const resumedGrant =
          currentProfile?.stripe_subscription_id === subscriptionId &&
          (currentProfile?.plan === expectedPlan || (isTrial && currentProfile?.plan === tier)) &&
          currentProfile?.is_pro === true
        // The first grant is additive so paid pack credits remain in the
        // account. A retry sees the same subscription id and writes the current
        // absolute balance unchanged; concurrent first events read the same
        // balance and converge on the same absolute next value.
        const next = resumedGrant ? current : current + creditsToGrant

        // Push #088 — Pro plan also includes 1 cinematic token / month.
        // KINEO-AUTOPILOT-299-2026-07-26 — Autopilot gets one too: at $299 it
        // sits above Studio, and withholding a $0-marginal-cost token from the
        // most expensive plan would be indefensible if anyone noticed.
        const cinematicTokensForTier = (tier === 'pro' || tier === 'autopilot') ? 1 : 0

        if (!resumedGrant) {
          const { data: updatedProfile, error: subUpdErr } = await supabase
            .from('profiles')
            .update({
              is_pro: true,
              plan: expectedPlan,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              video_credits: next,
              cinematic_tokens: isTrial ? 0 : cinematicTokensForTier,
              has_paid: true, // KINEO-PACK-NOWM-2026-07-06 — clean output for paid users
            })
            .eq('id', userId)
            .select('id')
            .maybeSingle()

          if (subUpdErr || !updatedProfile?.id) {
            throw new RetryableEntitlementError(
              `Subscription credit grant failed (${userId}): ${subUpdErr?.message ?? 'profile row missing'}`
            )
          }
        }

        // Commission insert is independently idempotent by external_id. Run it
        // before publishing fulfillment so a crash cannot leave a permanent
        // completed marker with the commission missing.
        await recordAffiliateCommission(supabase, { userId, externalId: session.id, amountGross: session.amount_total ?? 0, currency: session.currency ?? 'usd', type: 'initial', attributionSystem: session.metadata?.affiliate_system, session })

        // This marker means completed, so publish it only after the idempotent
        // profile update. If publication fails, Stripe retries; the same
        // subscription id + absolute balance write is harmless on that retry.
        await publishSubscriptionFulfillment()

        entitlementConfirmed = true
        entitlementPending = false
        console.log(`[stripe webhook] ${isTrial ? 'TRIAL' : 'subscription'} start: ${tier} (${resumedGrant ? 'resumed idempotently' : `balance ${current}→${next}`}) → user ${userId}`)

        // KINEO-REVERSE-TRIAL-P2-2026-08-07 — assinatura criada = conversão do
        // reverse trial. Vale também para isTrial (sub em trial do Stripe): o
        // plano vira `${tier}_trial`, que isPayingProfile já conta como pagante
        // — o webhook e o cron dão o MESMO veredito sobre a mesma linha.
        await markTrialConverted(supabase, userId, { source: 'checkout_subscription', stripeRef: session.id })

        break
      }

      case 'checkout.session.expired': {
        // Push #259 — track abandoned checkouts so we can measure drop-off.
        // Supabase SQL to create the table (run once in the SQL editor):
        //
        //   create table if not exists public.checkout_abandoned (
        //     id uuid default gen_random_uuid() primary key,
        //     user_id uuid references auth.users(id),
        //     tier text,
        //     currency text,
        //     amount_total bigint,
        //     stripe_session_id text unique,
        //     expired_at timestamptz default now()
        //   );
        const expiredSession = event.data.object as Stripe.Checkout.Session
        const abandonedUserId = expiredSession.metadata?.supabase_user_id ?? null
        const abandonedTier = expiredSession.metadata?.tier ?? null

        try {
          const { error: abanErr } = await supabase
            .from('checkout_abandoned')
            .insert({
              user_id: abandonedUserId,
              tier: abandonedTier,
              currency: expiredSession.currency,
              amount_total: expiredSession.amount_total,
              stripe_session_id: expiredSession.id,
            })
          if (abanErr && abanErr.code !== '42P01' && abanErr.code !== '23505') {
            // 42P01 = table doesn't exist yet (migration not applied — non-fatal)
            // 23505 = duplicate — already recorded
            console.error('[stripe webhook] checkout_abandoned insert error:', abanErr.code, abanErr.message)
          } else {
            console.log(`[stripe webhook] checkout abandoned: session=${expiredSession.id} user=${abandonedUserId} tier=${abandonedTier}`)
          }
        } catch (abanCatch) {
          console.warn('[stripe webhook] checkout_abandoned insert threw:', abanCatch)
        }

        // ═══════════════════════════════════════════════════════════════════
        // KINEO-PAREDE-CHECKOUT-2026-08-16 — a expiração também vira EVENTO.
        // ═══════════════════════════════════════════════════════════════════
        // POR QUE: `checkout_abandoned` é o livro-caixa VERDADEIRO de quem
        // chegou na página de pagamento (o webhook escreve, o servidor da
        // Stripe manda), e `events` só conhecia `checkout_started`, que é
        // emitido pelo BROWSER. As duas contagens divergem por ~2x: para INR,
        // `events` conhecia 11 pessoas em 42 dias e o livro-caixa conhece 27.
        // Todo funil da operação foi lido em `events`, logo todo funil
        // SUBCONTOU o abandono de checkout. Este evento fecha o par
        // `checkout_started` → `checkout_session_expired` dentro da MESMA
        // tabela, para que a taxa de fechamento exista sem ninguém
        // reconstruir coorte na mão em duas fontes.
        //
        // ⚠️ DESCONTINUIDADE: esta linha nasce hoje. Um salto em
        // `checkout_session_expired` a partir deste deploy é o INSTRUMENTO
        // nascendo, não abandono novo. O histórico verdadeiro está em
        // `checkout_abandoned` desde 25/05/2026 e continua lá.
        //
        // SERVER_ONLY (app/api/events/route.ts): se o sink do browser pudesse
        // cunhar isto, um burst forjado faria a parede do checkout parecer
        // maior do que é e mandaria a operação consertar o lugar errado.
        let expiredWritten = false
        try {
          expiredWritten = await writeServerEvent({
            name: 'checkout_session_expired',
            userId: abandonedUserId,
            path: '/api/stripe/webhook',
            metadata: {
              source: 'stripe_webhook',
              stripe_event_id: event.id,
              stripe_session_id: expiredSession.id,
              tier: abandonedTier,
              billing: expiredSession.metadata?.billing ?? null,
              pack: expiredSession.metadata?.pack ?? null,
              checkout_origin: expiredSession.metadata?.checkout_origin ?? null,
              plan_fit_planned_engine: expiredSession.metadata?.plan_fit_planned_engine ?? null,
              plan_fit_monthly_videos: expiredSession.metadata?.plan_fit_monthly_videos ?? null,
              plan_fit_monthly_credits: expiredSession.metadata?.plan_fit_monthly_credits ?? null,
              plan_fit_seconds: expiredSession.metadata?.plan_fit_seconds ?? null,
              plan_fit_recommended_tier: expiredSession.metadata?.plan_fit_recommended_tier ?? null,
              plan_fit_selected_tier_matches: expiredSession.metadata?.plan_fit_selected_tier_matches ?? null,
              plan_fit_video_id: expiredSession.metadata?.plan_fit_video_id ?? null,
              intro: expiredSession.metadata?.intro === '1',
              currency: expiredSession.currency ?? null,
              amount_total: expiredSession.amount_total ?? null,
              checkout_mode: expiredSession.mode ?? null,
              // `payment_status` separa duas mortes MUITO diferentes:
              // 'unpaid' = nunca digitou cartão; 'no_payment_required' = sessão
              // de valor zero. Sem isto, "expirou" mistura quem desistiu com
              // quem tentou e foi recusado.
              payment_status: expiredSession.payment_status ?? null,
              customer_country:
                expiredSession.customer_details?.address?.country ?? null,
              // ═══════════════════════════════════════════════════════════
              // KINEO-PAIS-DA-PAREDE-2026-08-17 — o campo acima é null SEMPRE
              // nesta parede, e isso foi MEDIDO, não suposto: as 10 primeiras
              // leituras do instrumento (17/08, 04:10Z–14:10Z) trouxeram
              // `customer_country: null` nas 10. A Stripe só preenche
              // `customer_details.address` quando a pessoa DIGITA o endereço,
              // e a parede é precisamente o lugar onde ninguém digita nada.
              //
              // `ip_country` vem da metadata que a rota de checkout carimba na
              // CRIAÇÃO da sessão (x-vercel-ip-country — o mesmo header que
              // resolve moeda e região). Ele existe para toda sessão criada
              // após o deploy de 17/08, inclusive as que morrem sem um
              // caractere digitado.
              //
              // Os dois campos ficam LADO A LADO de propósito: são coisas
              // diferentes e vão discordar. `customer_country` é declaração do
              // comprador (raro, mas verdadeiro); `ip_country` é inferência de
              // rede (sempre presente, e uma VPN mente). Colapsar os dois num
              // campo só apagaria essa diferença exatamente quando ela importa.
              //
              // ⚠️ DESCONTINUIDADE: sessões criadas ANTES deste deploy não têm
              // a metadata e continuarão com `ip_country: null` até expirarem
              // (janela de 2h). Um null depois de 17/08 + 2h é defeito; antes
              // disso é só idade.
              ip_country: expiredSession.metadata?.ip_country ?? null,
              // ═══════════════════════════════════════════════════════════
              // KINEO-SEGUNDA-TENTATIVA-2026-08-17 — O ATIVO QUE ESTÁVAMOS
              // JOGANDO FORA (leitura pura; NENHUM e-mail muda aqui).
              // ═══════════════════════════════════════════════════════════
              // Medição de 17/08 (30 dias, contas internas fora): 84% das
              // pessoas tocam a Stripe UMA vez e somem; quem tenta de novo
              // converte ~3x mais e responde por metade dos pagantes do mês.
              // A alavanca não é a página de pagamento — é fazer existir uma
              // SEGUNDA TENTATIVA.
              //
              // `after_expiration.recovery.enabled` está ligado desde
              // 03/08 (rota de checkout, linha ~1003), o que significa que a
              // Stripe MINTA uma URL de retomada para CADA sessão que expira.
              // `grep -rn "recovered_url\|recovery.url"` em app/ e lib/
              // devolvia zero: nunca foi lida por ninguém. Toda expiração
              // desde 03/08 gerou esse ativo e o descartou.
              //
              // Isso importa porque `KINEO-RECOVERY-NO-MINT-LINK-2026-08-11`
              // (cron send-recovery) documentou as DUAS armadilhas que
              // impediam um link de retomada no e-mail — preço (um link
              // `/api/stripe/checkout?tier=X` sem `intro=1` cobra 2,0–2,5x o
              // que a pessoa viu) e scanner corporativo (Outlook Safe Links
              // MINTA sessão a cada GET, sujando `checkout_attempted`). A URL
              // da própria Stripe **não tem nenhuma das duas**: ela É a sessão
              // original, com o preço original, e não cria sessão nova.
              //
              // ⚠️ POR QUE UM BOOLEANO E NÃO A URL: essa URL é uma credencial
              // de pagamento viva. `events` hoje bloqueia leitura anônima
              // (policy `no_public_read`, qual=false), mas guardar link de
              // pagamento em repouso o faz vazar para todo export de
              // analytics futuro, e essa é uma decisão de segurança que
              // ninguém pediu. O booleano responde à única pergunta que a
              // decisão precisa ("o ativo existe e quanto dura?"); quando o
              // fundador liberar o GATE #H, o remetente busca a URL fresca na
              // Stripe pelo `stripe_session_id`, que já está aqui do lado.
              //
              // NÃO ligo o link no e-mail nesta sprint DE PROPÓSITO: mexer em
              // e-mail do fluxo de pagamento é GATE #H do fundador, e o autor
              // de 11/08 já tinha parado exatamente aqui. Isto carrega a arma;
              // o gatilho continua sendo dele.
              recovery_url_available: Boolean(
                expiredSession.after_expiration?.recovery?.url,
              ),
              recovery_url_expires_at:
                expiredSession.after_expiration?.recovery?.expires_at ?? null,
            },
          })
          // A linha de `checkout_abandoned` tem FK em auth.users: uma conta
          // apagada derruba o INSERT inteiro e leva junto a MOEDA, que é a
          // única coisa que esta instrumentação existe para contar. Se o
          // evento não entrou com dono, ele entra sem dono. Perder o nome é
          // barato; perder o denominador corrompe o funil.
          if (!expiredWritten) {
            await writeServerEvent({
              name: 'checkout_session_expired',
              userId: null,
              path: '/api/stripe/webhook',
              metadata: {
                source: 'stripe_webhook',
                stripe_event_id: event.id,
                stripe_session_id: expiredSession.id,
                orphaned_user: true,
                tier: abandonedTier,
                checkout_origin: expiredSession.metadata?.checkout_origin ?? null,
                plan_fit_monthly_videos: expiredSession.metadata?.plan_fit_monthly_videos ?? null,
                plan_fit_planned_engine: expiredSession.metadata?.plan_fit_planned_engine ?? null,
                currency: expiredSession.currency ?? null,
                amount_total: expiredSession.amount_total ?? null,
                payment_status: expiredSession.payment_status ?? null,
                // KINEO-PAIS-DA-PAREDE-2026-08-17 — mesma razão pela qual a
                // moeda sobrevive a este ramo: o país é DENOMINADOR, não
                // adorno. Uma conta apagada é justamente o caso em que o
                // perfil não pode mais informar a região depois; se o país
                // não vier aqui, ele não vem de lugar nenhum.
                ip_country: expiredSession.metadata?.ip_country ?? null,
              },
            })
          }
        } catch (expiredEventThrown) {
          console.warn('[stripe webhook] checkout_session_expired event threw:', expiredEventThrown)
        }
        break
      }

      // ═════════════════════════════════════════════════════════════════════
      // KINEO-PAREDE-CHECKOUT-2026-08-16 — O EVENTO QUE RESPONDE "POR QUÊ".
      // ═════════════════════════════════════════════════════════════════════
      // Medido em 16/08: 84 pessoas externas abriram uma sessão de checkout ao
      // vivo e foram embora; a empresa tem 7 pagantes na vida inteira. Dessas
      // 84, 27 (32%) são INR — e o histórico de `payment_success` é 100% USD:
      // nunca entrou uma rupia.
      //
      // O problema é que HOJE não dá para distinguir as duas causas, que pedem
      // remédios opostos:
      //   (a) o cartão foi RECUSADO  → é defeito técnico/regulatório nosso
      //       (RBI e-mandate: conta Stripe fora da Índia precisa registrar
      //        mandato para cobrança recorrente em cartão indiano — sem ele a
      //        cobrança off-session é recusada);
      //   (b) a pessoa MUDOU DE IDEIA → é preço/oferta.
      // Os dois deixam exatamente o mesmo rastro: `checkout_started` e silêncio.
      // Toda coorte definida por AUSÊNCIA passa por `events` antes de virar
      // decisão — e esta não tinha por onde passar.
      //
      // Estes dois casos são ADITIVOS: nenhum caminho existente é tocado,
      // nenhum crédito é concedido ou revogado, nenhum plano muda. É leitura
      // pura. Seguro para o dia do TAAFT.
      //
      // ⚠️ AÇÃO DE 30 SEGUNDOS DO FUNDADOR (está em docs/PAREDE-DO-CHECKOUT-
      // 2026-08-16.md): o endpoint de webhook na Stripe precisa estar inscrito
      // em `payment_intent.payment_failed` e `charge.failed`. Se não estiver,
      // este código é inerte — não quebra nada, apenas nunca roda. `stripe_events`
      // recebe 2-8 eventos/dia, compatível com uma lista curta de inscrição.
      case 'payment_intent.payment_failed': {
        const failedIntent = event.data.object as Stripe.PaymentIntent
        const lastError = failedIntent.last_payment_error ?? null
        const intentCustomerId =
          typeof failedIntent.customer === 'string'
            ? failedIntent.customer
            : failedIntent.customer?.id ?? null
        // `invoice` saiu do tipo público do PaymentIntent em versões recentes
        // da API mas continua vindo no payload das cobranças de fatura — ler
        // por acesso indexado mantém o discriminador sem `any` solto.
        const intentInvoiceRaw = (failedIntent as unknown as { invoice?: string | { id?: string } | null }).invoice
        const intentInvoiceId =
          typeof intentInvoiceRaw === 'string'
            ? intentInvoiceRaw
            : intentInvoiceRaw?.id ?? null

        let failedUserId: string | null =
          failedIntent.metadata?.supabase_user_id ?? null
        if (!failedUserId && intentCustomerId) {
          try {
            const { data: byCustomer } = await supabase
              .from('profiles')
              .select('id')
              .eq('stripe_customer_id', intentCustomerId)
              .limit(1)
            failedUserId = byCustomer?.[0]?.id ?? null
          } catch (lookupThrown) {
            console.warn('[stripe webhook] payment_failed customer lookup threw:', lookupThrown)
          }
        }

        try {
          await writeServerEvent({
            name: 'checkout_payment_failed',
            userId: failedUserId,
            path: '/api/stripe/webhook',
            metadata: {
              source: 'stripe_webhook',
              stripe_event_id: event.id,
              object: 'payment_intent',
              stripe_payment_intent_id: failedIntent.id,
              stripe_customer_id: intentCustomerId,
              currency: failedIntent.currency ?? null,
              amount: failedIntent.amount ?? null,
              // SEM ISTO A MÉTRICA MENTE EM 30 DIAS. Uma recusa de RENOVAÇÃO
              // (cartão de assinante que venceu) não é a parede do checkout —
              // é churn, e cai no mesmo evento. `invoice` presente ⇒ cobrança
              // de fatura ⇒ renovação; ausente ⇒ primeira compra. Quem ler
              // este evento SEMPRE filtra por `is_renewal=false` para medir a
              // parede, e por `true` para medir churn involuntário.
              is_renewal: Boolean(intentInvoiceId),
              stripe_invoice_id: intentInvoiceId,
              // O par que decide entre (a) e (b): `decline_code` é o veredito
              // do EMISSOR do cartão. 'transaction_not_allowed' /
              // 'do_not_honor' em cartão indiano é a assinatura do mandato RBI.
              error_code: lastError?.code ?? null,
              decline_code: lastError?.decline_code ?? null,
              error_type: lastError?.type ?? null,
              error_message: lastError?.message ?? null,
              card_country: lastError?.payment_method?.card?.country ?? null,
              card_brand: lastError?.payment_method?.card?.brand ?? null,
              card_funding: lastError?.payment_method?.card?.funding ?? null,
              payment_method_type: lastError?.payment_method?.type ?? null,
            },
          })
        } catch (failedEventThrown) {
          console.warn('[stripe webhook] checkout_payment_failed (intent) threw:', failedEventThrown)
        }
        break
      }

      case 'charge.failed': {
        // `charge.failed` traz o `outcome` (network_status / seller_message),
        // que o PaymentIntent não expõe. Os dois eventos chegam para a mesma
        // recusa; guardar os dois é de propósito — `outcome.network_status`
        // separa "o emissor recusou" de "a Stripe bloqueou antes de tentar",
        // e essa diferença muda quem tem de consertar.
        const failedCharge = event.data.object as Stripe.Charge
        const chargeCustomerId =
          typeof failedCharge.customer === 'string'
            ? failedCharge.customer
            : failedCharge.customer?.id ?? null

        const chargeInvoiceRaw = (failedCharge as unknown as { invoice?: string | { id?: string } | null }).invoice
        const chargeInvoiceId =
          typeof chargeInvoiceRaw === 'string'
            ? chargeInvoiceRaw
            : chargeInvoiceRaw?.id ?? null

        let chargeUserId: string | null = failedCharge.metadata?.supabase_user_id ?? null
        if (!chargeUserId && chargeCustomerId) {
          try {
            const { data: byCustomer } = await supabase
              .from('profiles')
              .select('id')
              .eq('stripe_customer_id', chargeCustomerId)
              .limit(1)
            chargeUserId = byCustomer?.[0]?.id ?? null
          } catch (lookupThrown) {
            console.warn('[stripe webhook] charge.failed customer lookup threw:', lookupThrown)
          }
        }

        try {
          await writeServerEvent({
            name: 'checkout_payment_failed',
            userId: chargeUserId,
            path: '/api/stripe/webhook',
            metadata: {
              source: 'stripe_webhook',
              stripe_event_id: event.id,
              object: 'charge',
              stripe_charge_id: failedCharge.id,
              stripe_customer_id: chargeCustomerId,
              currency: failedCharge.currency ?? null,
              amount: failedCharge.amount ?? null,
              // Ver a nota em payment_intent.payment_failed: renovação recusada
              // é CHURN, não parede de checkout. Sempre filtrar por este campo.
              is_renewal: Boolean(chargeInvoiceId),
              stripe_invoice_id: chargeInvoiceId,
              error_code: failedCharge.failure_code ?? null,
              error_message: failedCharge.failure_message ?? null,
              decline_code: failedCharge.outcome?.reason ?? null,
              network_status: failedCharge.outcome?.network_status ?? null,
              seller_message: failedCharge.outcome?.seller_message ?? null,
              risk_level: failedCharge.outcome?.risk_level ?? null,
              card_country: failedCharge.payment_method_details?.card?.country ?? null,
              card_brand: failedCharge.payment_method_details?.card?.brand ?? null,
              card_funding: failedCharge.payment_method_details?.card?.funding ?? null,
              payment_method_type: failedCharge.payment_method_details?.type ?? null,
            },
          })
        } catch (chargeEventThrown) {
          console.warn('[stripe webhook] checkout_payment_failed (charge) threw:', chargeEventThrown)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        // Handles two cases:
        // 1. Monthly renewal (billing_reason='subscription_cycle') — refill credits.
        // 2. First real payment after 3-day trial (billing_reason='subscription_cycle')
        //    — upgrades user from 5 trial credits to full plan credits.
        // Skip subscription_create: non-trial subscriptions already get full
        // credits via checkout.session.completed (payment_status='paid').
        const invoice = event.data.object as Stripe.Invoice & { billing_reason?: string; subscription?: string }
        const billingReason = invoice.billing_reason
        if (billingReason === 'subscription_create') break

        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null
        if (!subscriptionId) break

        entitlementPending = true
        let subscription: Stripe.Subscription
        try {
          subscription = await stripe.subscriptions.retrieve(subscriptionId)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          throw new RetryableEntitlementError(
            `Failed to load subscription for renewal (${subscriptionId}): ${msg}`
          )
        }

        const renewalUserId = subscription.metadata?.supabase_user_id
        // KINEO-AUTOPILOT-299-2026-07-26 — 'autopilot' added.
        const renewalTier: CheckoutPlanTier =
          subscription.metadata?.tier === 'pro' ? 'pro'
            : subscription.metadata?.tier === 'starter' ? 'starter'
              : subscription.metadata?.tier === 'autopilot' ? 'autopilot'
                : 'basic'
        // KINEO-STUDIO-400-2026-07-06 — renewal credits are SET (not added)
        // each cycle → no rollover between months.
        // KINEO-PRICING-V3D-2026-07-26 — single source (lib/checkoutPricing).
        // NOTE: this is the FULL grant even for a subscription that started on
        // the discounted intro month. subscription.metadata.intro stays '1'
        // forever (it is the one-intro-per-customer marker), so reading it here
        // would permanently under-grant every renewal. The reduced intro grant
        // is applied only once, at checkout.session.completed.
        const renewalCredits = TIER_CREDITS[renewalTier]
        if (!renewalUserId) {
          entitlementPending = false
          break
        }
        const renewalCustomerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id ?? null
        if (!renewalCustomerId) {
          throw new RetryableEntitlementError(
            `Renewal subscription missing Customer (${subscriptionId})`
          )
        }
        if (await isProtectedProfile(supabase, { userId: renewalUserId })) {
          entitlementConfirmed = true
          entitlementPending = false
          console.log('[stripe webhook] renewal skipped for protected admin account:', renewalUserId)
          break
        }
        if (subscription.status !== 'active' && subscription.status !== 'trialing') {
          // Stripe events can arrive out of order. A historical paid invoice
          // must not reactivate/refill a subscription whose live state is now
          // canceled, unpaid, paused or otherwise non-access.
          entitlementConfirmed = true
          entitlementPending = false
          console.warn('[stripe webhook] stale renewal ignored for non-access subscription:', invoice.id, subscriptionId, subscription.status)
          break
        }

        const { data: renewalProfile, error: renewalProfileError } = await supabase
          .from('profiles')
          .select('id, stripe_customer_id, stripe_subscription_id')
          .eq('id', renewalUserId)
          .maybeSingle()
        if (renewalProfileError || !renewalProfile?.id) {
          throw new RetryableEntitlementError(
            `Failed to verify renewal profile (${renewalUserId}): ${renewalProfileError?.message ?? 'profile row missing'}`
          )
        }
        if (renewalProfile.stripe_customer_id && renewalProfile.stripe_customer_id !== renewalCustomerId) {
          throw new RetryableEntitlementError(
            `Renewal Customer identity mismatch (${renewalUserId}, ${subscriptionId})`
          )
        }
        if (
          renewalProfile.stripe_subscription_id &&
          renewalProfile.stripe_subscription_id !== subscriptionId
        ) {
          // A paid invoice for an older duplicate subscription must never reset
          // the balance/tier belonging to the profile's newer subscription.
          entitlementConfirmed = true
          entitlementPending = false
          await recordAffiliateCommission(supabase, { userId: renewalUserId, externalId: invoice.id ?? subscriptionId, amountGross: invoice.amount_paid ?? 0, currency: invoice.currency ?? 'usd', type: 'recurring', attributionSystem: subscription.metadata?.affiliate_system })
          console.warn('[stripe webhook] stale renewal ignored for superseded subscription:', invoice.id, subscriptionId, renewalProfile.stripe_subscription_id)
          break
        }

        // On renewal we set the balance to the plan amount rather than adding,
        // so unused credits from the prior cycle don't pile up indefinitely.
        // Push #088 — also reset cinematic_tokens on renewal: Pro = 1,
        // Basic = 0. Resetting (not adding) keeps the monthly cap honest
        // even if the user never spent the prior month's token.
        const renewalCinematicTokens = (renewalTier === 'pro' || renewalTier === 'autopilot') ? 1 : 0
        // Push #416 — never let a legacy subscription renewal overwrite a
        // manually-managed admin account.
        const { data: renewedProfile, error: renewErr } = await supabase
          .from('profiles')
          .update({
            video_credits: renewalCredits,
            is_pro: true,
            plan: renewalTier,
            cinematic_tokens: renewalCinematicTokens,
            stripe_customer_id: renewalCustomerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('id', renewalUserId)
          .select('id')
          .maybeSingle()

        if (renewErr || !renewedProfile?.id) {
          throw new RetryableEntitlementError(
            `Renewal credit refill failed (${renewalUserId}): ${renewErr?.message ?? 'profile row missing'}`
          )
        } else {
          entitlementConfirmed = true
          entitlementPending = false
          console.log(`[stripe webhook] renewal: ${renewalTier} (${renewalCredits}, cin=${renewalCinematicTokens}) → user ${renewalUserId}`)
        }

        // KINEO-REVERSE-TRIAL-P2-2026-08-07 — cobre pagamento que só chega como
        // invoice (ex.: primeira cobrança do dia 4 pós-trial do Stripe, ou sub
        // criada fora do Checkout). Quase sempre 0 linhas (o Checkout já
        // carimbou); idempotente e barato.
        await markTrialConverted(supabase, renewalUserId, { source: 'invoice_payment_succeeded', stripeRef: invoice.id ?? subscriptionId })
        await recordAffiliateCommission(supabase, { userId: renewalUserId, externalId: invoice.id ?? subscriptionId, amountGross: invoice.amount_paid ?? 0, currency: invoice.currency ?? 'usd', type: 'recurring', attributionSystem: subscription.metadata?.affiliate_system })

        break
      }

      // ═══ KINEO-TRIAL-AVISO-2026-08-20 — O E-MAIL QUE PROTEGE A CONTA ═════
      // O Stripe dispara este evento 3 dias antes de o trial virar cobrança.
      // Mandar o aviso NÃO é gentileza: trial que cobra de surpresa vira
      // contestação de cartão, e contestação em volume derruba a conta Stripe
      // inteira. Ou seja, este e-mail é o que torna o modelo sustentável — e é
      // também o que faz a pessoa que VAI ficar se sentir respeitada.
      // Deliberadamente sem venda: só o fato, a data, o valor e como cancelar.
      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as Stripe.Subscription
        const trialUserId = sub.metadata?.supabase_user_id ?? null
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : null
        if (trialUserId && trialEnd && process.env.RESEND_API_KEY) {
          try {
            const { data: prof } = await supabase
              .from('profiles').select('email, email_opted_out').eq('id', trialUserId).maybeSingle()
            const to = (prof?.email ?? '') as string
            if (to && !prof?.email_opted_out) {
              const amount = ((sub.items.data[0]?.price?.unit_amount ?? 0) / 100).toFixed(2)
              const when = trialEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
              const manage = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'}/account`
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  from: 'Kineo Team <hello@usekineo.com>',
                  to: [to],
                  reply_to: 'hello@usekineo.com',
                  subject: `Your Kineo trial ends ${when} — $15 unless you cancel`,
                  text: `Hey,\n\nQuick heads up, no surprises: your free week of Kineo ends on ${when}, and your card will be charged $${amount} for the first month.\n\nIf Kineo is working for you, there is nothing to do — your credits renew and you keep going.\n\nIf it is not, cancel in one click here and you will not be charged: ${manage}\n\nEither way, thanks for giving it a real try.\n\nKineo Team\nusekineo.com`,
                  html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:480px;"><p>Hey,</p><p>Quick heads up, no surprises: your free week of Kineo ends on <strong>${when}</strong>, and your card will be charged <strong>$${amount}</strong> for the first month.</p><p>If Kineo is working for you, there is nothing to do — your credits renew and you keep going.</p><p>If it is not, <a href="${manage}" style="color:#2997ff">cancel in one click here</a> and you will not be charged.</p><p>Either way, thanks for giving it a real try.</p><p style="margin:0 0 2px">Kineo Team</p><p style="margin:0"><a href="https://www.usekineo.com" style="color:#2997ff">usekineo.com</a></p></div>`,
                }),
              })
              await supabase.from('events').insert({ user_id: trialUserId, name: 'card_trial_ending_emailed', metadata: { amount, ends: trialEnd.toISOString() } })
              console.log('[stripe webhook] trial_will_end aviso enviado:', trialUserId.slice(0, 8))
            }
          } catch (e) {
            // Nunca derruba o webhook: falha de e-mail não pode virar retry infinito na Stripe.
            console.error('[stripe webhook] trial_will_end email falhou:', e instanceof Error ? e.message : String(e))
          }
        }
        entitlementConfirmed = true
        break
      }

      case 'customer.subscription.updated': {
        entitlementPending = true
        const eventSubscription = event.data.object as Stripe.Subscription
        let subscription: Stripe.Subscription
        try {
          // Delivery order is not authority for current access. Read Stripe's
          // live state so an old `active` event cannot undo a later cancel.
          subscription = await stripe.subscriptions.retrieve(eventSubscription.id)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          throw new RetryableEntitlementError(
            `Failed to verify subscription update (${eventSubscription.id}): ${message}`
          )
        }
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id ?? null
        if (!customerId) {
          throw new RetryableEntitlementError(
            `Subscription update missing Customer (${subscription.id})`
          )
        }
        const isActive =
          subscription.status === 'active' || subscription.status === 'trialing'

        // Push #416 — protected admin accounts are managed manually.
        if (await isProtectedProfile(supabase, { customerId })) {
          entitlementConfirmed = true
          entitlementPending = false
          console.log('[stripe webhook] subscription.updated skipped for protected admin:', customerId)
          break
        }

        const { data: subscriptionProfile, error: subscriptionProfileError } = await supabase
          .from('profiles')
          .select('id, stripe_subscription_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()
        if (subscriptionProfileError) {
          throw new RetryableEntitlementError(
            `Failed to locate subscription profile (${customerId}): ${subscriptionProfileError.message}`
          )
        }
        if (!subscriptionProfile?.id) {
          // Checkout fulfillment owns the initial profile link. If its event
          // has not arrived yet, this lifecycle event has nothing safe to edit.
          entitlementConfirmed = true
          entitlementPending = false
          console.warn('[stripe webhook] subscription update has no linked profile:', customerId, subscription.id)
          break
        }
        const subscriptionOwnerId = subscription.metadata?.supabase_user_id
        if (!subscriptionOwnerId || subscriptionOwnerId !== subscriptionProfile.id) {
          // A mutable/corrupted Customer pointer must not let one account adopt
          // another user's live subscription. Kineo subscriptions always carry
          // their authenticated Supabase owner in Stripe metadata.
          entitlementConfirmed = true
          entitlementPending = false
          console.error('[stripe webhook] subscription owner/profile mismatch ignored:', subscription.id, subscriptionOwnerId, subscriptionProfile.id)
          break
        }
        if (
          subscriptionProfile.stripe_subscription_id &&
          subscriptionProfile.stripe_subscription_id !== subscription.id
        ) {
          entitlementConfirmed = true
          entitlementPending = false
          console.warn('[stripe webhook] stale subscription update ignored for superseded subscription:', subscription.id, subscriptionProfile.stripe_subscription_id)
          break
        }
        if (!subscriptionProfile.stripe_subscription_id && !isActive) {
          entitlementConfirmed = true
          entitlementPending = false
          console.warn('[stripe webhook] unlinked non-access subscription update ignored:', subscription.id, subscription.status)
          break
        }

        const subscriptionPatch: Record<string, unknown> = {
          is_pro: isActive,
          stripe_subscription_id: subscription.id,
        }
        if (!isActive) {
          subscriptionPatch.plan = 'free'
          subscriptionPatch.cinematic_tokens = 0
        }
        const { data: updatedSubscriptionProfile, error: subscriptionUpdateErr } = await supabase
          .from('profiles')
          .update(subscriptionPatch)
          .eq('id', subscriptionProfile.id)
          .select('id')
          .maybeSingle()

        if (subscriptionUpdateErr || !updatedSubscriptionProfile?.id) {
          throw new RetryableEntitlementError(
            `Failed to apply subscription update (${customerId}): ${subscriptionUpdateErr?.message ?? 'profile row missing'}`
          )
        }
        entitlementConfirmed = true
        entitlementPending = false

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id ?? null

        entitlementPending = true
        if (!customerId) {
          throw new RetryableEntitlementError(
            `Deleted subscription missing Customer (${subscription.id})`
          )
        }
        // Push #416 — protected admin accounts are managed manually.
        if (await isProtectedProfile(supabase, { customerId })) {
          entitlementConfirmed = true
          entitlementPending = false
          console.log('[stripe webhook] subscription.deleted skipped for protected admin:', customerId)
          break
        }

        // Push #088 — wipe cinematic_tokens on cancellation so a former
        // Pro user can't keep a stranded Runway token after their plan
        // lapses. Regular credits stay (they were already paid for).
        const { data: deletedSubscriptionProfile, error: subscriptionDeleteErr } = await supabase
          .from('profiles')
          .update({
            is_pro: false,
            plan: 'free',
            stripe_subscription_id: null,
            cinematic_tokens: 0,
          })
          .eq('stripe_customer_id', customerId)
          .eq('stripe_subscription_id', subscription.id)
          .select('id')
          .maybeSingle()

        if (subscriptionDeleteErr) {
          throw new RetryableEntitlementError(
            `Failed to revoke deleted subscription (${customerId}): ${subscriptionDeleteErr.message}`
          )
        }
        entitlementConfirmed = true
        entitlementPending = false
        if (!deletedSubscriptionProfile?.id) {
          console.warn('[stripe webhook] stale subscription deletion ignored for superseded subscription:', subscription.id, customerId)
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null
        }
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id ?? null
        const failedSubscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id ?? null

        if (!customerId || !failedSubscriptionId) {
          console.warn('[stripe webhook] payment_failed without authoritative customer/subscription id')
          break
        }

        entitlementPending = true
        // Push #416 — protected admin accounts are managed manually.
        if (await isProtectedProfile(supabase, { customerId })) {
          entitlementConfirmed = true
          entitlementPending = false
          console.log('[stripe webhook] payment_failed skipped for protected admin:', customerId)
          break
        }

        let failedSubscription: Stripe.Subscription
        try {
          failedSubscription = await stripe.subscriptions.retrieve(failedSubscriptionId)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          throw new RetryableEntitlementError(
            `Failed to verify payment_failed subscription (${failedSubscriptionId}): ${message}`
          )
        }
        const failedSubscriptionCustomerId = typeof failedSubscription.customer === 'string'
          ? failedSubscription.customer
          : failedSubscription.customer?.id ?? null
        if (failedSubscriptionCustomerId !== customerId) {
          throw new RetryableEntitlementError(
            `payment_failed subscription identity mismatch (${failedSubscriptionId})`
          )
        }
        if (failedSubscription.status === 'active' || failedSubscription.status === 'trialing') {
          // A later successful retry may already have restored the subscription
          // before this older failure event arrives. Live Stripe state wins.
          entitlementConfirmed = true
          entitlementPending = false
          console.warn('[stripe webhook] stale payment_failed ignored for live access subscription:', failedSubscriptionId, failedSubscription.status)
          break
        }

        const { data: revokedProfile, error: revokeErr } = await supabase
          .from('profiles')
          .update({ is_pro: false, plan: 'free' })
          .eq('stripe_customer_id', customerId)
          .eq('stripe_subscription_id', failedSubscriptionId)
          .select('id')
          .maybeSingle()

        if (revokeErr) {
          throw new RetryableEntitlementError(
            `Failed to revoke access on payment_failed (${customerId}): ${revokeErr.message}`
          )
        } else {
          entitlementConfirmed = true
          entitlementPending = false
          if (revokedProfile?.id) {
            console.log('[stripe webhook] revoked access for current failed subscription:', customerId, failedSubscriptionId)
          } else {
            console.warn('[stripe webhook] stale payment_failed ignored for superseded subscription:', customerId, failedSubscriptionId)
          }
        }
        break
      }

      default:
        // Unhandled event type — log and continue
        console.log('Unhandled webhook event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const shouldRetryEntitlement =
      error instanceof RetryableEntitlementError &&
      entitlementPending &&
      !entitlementConfirmed
    const shouldRetryAffiliateLedger = error instanceof RetryableAffiliateLedgerError
    const shouldRetryWebhook = shouldRetryEntitlement || shouldRetryAffiliateLedger

    let checkoutGuardReleased = !checkoutFulfillmentGuardAcquired
    if (shouldRetryWebhook && checkoutFulfillmentGuardAcquired && checkoutFulfillmentGuard) {
      try {
        const { error: fulfillmentReleaseError } = await supabase
          .from('stripe_events')
          .delete()
          .eq('id', checkoutFulfillmentGuard)
        if (fulfillmentReleaseError) {
          console.error(
            '[stripe webhook] failed to release Checkout Session fulfillment guard:',
            fulfillmentReleaseError.code,
            fulfillmentReleaseError.message,
            checkoutFulfillmentGuard,
          )
        } else {
          checkoutFulfillmentGuardAcquired = false
          checkoutGuardReleased = true
        }
      } catch (fulfillmentReleaseThrown) {
        console.error('[stripe webhook] fulfillment guard release threw:', fulfillmentReleaseThrown, checkoutFulfillmentGuard)
      }
    }

    if (shouldRetryWebhook && dedupeRowAcquired && checkoutGuardReleased) {
      try {
        const { error: releaseError } = await supabase
          .from('stripe_events')
          .delete()
          .eq('id', event.id)

        if (releaseError) {
          console.error(
            '[stripe webhook] failed to release dedupe row for retry:',
            releaseError.code,
            releaseError.message,
            event.id
          )
        } else {
          dedupeRowAcquired = false
          console.warn('[stripe webhook] released dedupe row; Stripe retry required:', event.id)
        }
      } catch (releaseThrown) {
        console.error('[stripe webhook] dedupe release threw:', releaseThrown, event.id)
      }
    }

    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
