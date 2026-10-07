// ═══ KINEO-COMPRA-SEM-LOGIN-2026-10-06 — QUEM NÃO TEM CONTA PAGA PRIMEIRO; A CONTA NASCE DEPOIS DO PAGAMENTO ═══════
//
// POR QUÊ (fundador 06/10: "pode fazer compra sem login, sem problema nenhum"). Medido em produção no mesmo dia:
//   · 06/10: 4 visitantes apertaram comprar sem sessão e caíram no "entre primeiro" (checkout_attempted +
//     checkout_auth_required com user_id nulo); em 8 dias houve 1 venda.
//   · 30 dias: 89 cliques anônimos em PLANO (46 com sessão de navegador). Das 37 sessões de navegador que bateram
//     na parede do cadastro, 13 voltaram logadas, 12 chegaram à Stripe e 3 pagaram — 24 (65%) sumiram no cadastro.
// A parede não é preço nem cartão: é a ordem. A pessoa decidiu comprar e a casa pediu uma conta antes do dinheiro.
//
// O DESENHO (quatro peças, um interruptor):
//   1. /api/stripe/checkout, sem sessão e com GUEST_CHECKOUT_LIVE → Checkout da Stripe SEM usuário. A Stripe coleta o
//      e-mail; a metadata leva plano, moeda, campanha, afiliado (o cookie sf_aff viaja na SESSÃO — o furo antigo dos
//      afiliados era exatamente o cookie não chegar ao webhook) e kineo_guest=1. Preço, moeda e oferta saem das MESMAS
//      funções do caminho logado (lib/stripe/guestCheckout.ts). Tudo que depende de saber QUEM compra (trial de cartão,
//      Plan Fit, volta da marca d'água, retomada, cupom e 1º mês com desconto) continua no caminho de hoje: cadastro antes.
//      Exceção (07/10, com interruptor próprio): a oferta de boas-vindas — ver KINEO-CUPOM-CONVIDADO-2026-10-07 abaixo.
//   2. Webhook: acha a conta pelo e-mail; se não existe, cria (admin) e aplica o MESMO grant do caminho logado
//      (o mesmo bloco Path B), idempotente pela sessão Stripe. Erro = 500 para a Stripe reenviar.
//   3. /checkout/guest: conta NOVA nascida desta compra → login de uso único, só no navegador que abriu o checkout,
//      só nos primeiros GUEST_LOGIN_WINDOW_MINUTES, uma vez. E-mail que JÁ tinha conta → NUNCA loga sozinho (seria
//      tomada de conta: alguém paga com o e-mail de outra pessoa); o plano entra na conta dela e vai um link por e-mail.
//   4. Eventos de servidor: checkout_guest_started, guest_account_created/matched, guest_login_link_used, e o
//      payment_success de sempre com o user_id da conta nova/existente.
//   5. Nunca pior que hoje: se a sessão de convidado não abrir na Stripe, o visitante volta ao caminho de hoje
//      (cadastro antes) e o motivo vai em guest_checkout_fallback.
//   6. Conta nascida assim: a 1ª entrada que prova o e-mail (Google/OAuth, link por e-mail, recuperação de senha)
//      derruba as OUTRAS sessões e troca a senha por uma aleatória, uma vez (guest_sessions_revoked) — fecha a tomada
//      de conta por e-mail alheio, inclusive a senha que a sessão sem prova tenha posto.
//   7. O webhook manda UM e-mail "sua conta está pronta" com link de entrada (cobre quem fechou a aba antes da volta).
//
// PURO DE PROPÓSITO: este arquivo não importa NADA. O cliente (PricingClient, KineoLanding, /ads, /checkout/guest) lê o
// interruptor e as frases daqui; o servidor lê as decisões; o guardião scripts/test-compra-sem-login-2026-10-06.mjs
// transpila e EXECUTA. Hash, Stripe, banco e e-mail moram em lib/stripe/guestCheckout.ts (só servidor).
//
// INTERRUPTOR ÚNICO. false = o caminho de hoje, sem exceção: nenhuma sessão de convidado nasce, toda tela fala
// "Sign up & continue". O webhook e a página de acesso NÃO olham o interruptor de propósito: uma sessão paga
// enquanto ele estava ligado precisa ser entregue mesmo que alguém o desligue no meio da janela de 24 h.
export const GUEST_CHECKOUT_LIVE = true

// ═══ KINEO-CUPOM-CONVIDADO-2026-10-07 — A OFERTA DE BOAS-VINDAS TAMBÉM COMPRA SEM CONTA ════════════════════════════
// POR QUÊ (fundador 07/10: "vai para cupom"). O modal "Your first month is 20% off" (components/WelcomeOfferModal.tsx,
// ?promo=WELCOME20, public_promo_kind = welcome_first_month_20) era o único caminho de compra da home que ainda
// mandava o visitante sem conta para o /signup: a régua abaixo devolvia 'promo' para QUALQUER cupom. Em 30 dias, 32
// sessões anônimas (~30% das que tentaram comprar sem conta) chegaram por essa oferta.
// O DESENHO: só o desconto de boas-vindas passa, e com a MESMA verificação do caminho logado (resolvePromisedPublicPromo
// em lib/growth/publicPromoTruth.ts: código WELCOME20 ativo, cupom KINEO_WELCOME20 de 20% "once", sem restrição) e o
// MESMO recorte (Creator/Studio, mensal). Qualquer outro cupom, recuperação, intro, trial e Plan Fit continuam no
// cadastro. Se a Stripe não confirmar o desconto, o visitante volta ao cadastro (nunca pior que hoje).
// O RISCO ACEITO: "um desconto de boas-vindas por cliente" não tem como ser checado antes de pagar sem conta, e a
// Stripe não checa por e-mail (sessão sem `customer` conta como primeira transação). O webhook mede: compra de
// convidado com o desconto numa conta que JÁ pagou grava guest_welcome_promo_reused e avisa o fundador.
// Decisão e números: docs/DECISAO-COMPRA-SEM-LOGIN-2026-10-06.md, seção "07/10 — cupom de boas-vindas".
//
// INTERRUPTOR ÚNICO desta exceção. false = hoje: todo ?promo= (WELCOME20 inclusive) cai no cadastro, byte a byte.
export const GUEST_WELCOME_PROMO_LIVE = false

export const GUEST_CHECKOUT_VERSION = 'guest_checkout_v1' as const

// ─── Metadata da sessão/assinatura Stripe ────────────────────────────────────────────────────────────────────────────
export const GUEST_CHECKOUT_METADATA_FLAG = 'kineo_guest' as const
export const GUEST_CHECKOUT_VERSION_KEY = 'guest_checkout_version' as const
/** sha256 (hex) do segredo do navegador que abriu o checkout. O segredo em si só existe no cookie httpOnly. */
export const GUEST_CHECKOUT_NONCE_HASH_KEY = 'kineo_guest_nonce_sha256' as const
/** Código de afiliado (cookie sf_aff) e prova do clique (cookie sf_aff_click), já normalizados no servidor. */
export const GUEST_CHECKOUT_AFFILIATE_CODE_KEY = 'aff_code' as const
export const GUEST_CHECKOUT_AFFILIATE_CLICK_KEY = 'aff_click' as const

// ─── Cookie do navegador que abriu o checkout ────────────────────────────────────────────────────────────────────────
export const GUEST_CHECKOUT_NONCE_COOKIE = 'kineo_guest_checkout' as const
/** A sessão de assinatura vive até 24 h (RECURRING_CHECKOUT_WINDOW_HOURS); o cookie sobra um dia. */
export const GUEST_CHECKOUT_NONCE_MAX_AGE_SECONDS = 48 * 60 * 60

// ─── Login de uso único ──────────────────────────────────────────────────────────────────────────────────────────────
/** "Poucos minutos": contados a partir do nascimento da conta (o webhook cria a conta segundos depois do pagamento). */
export const GUEST_LOGIN_WINDOW_MINUTES = 15
/** Relógios diferentes (banco × função): uma conta "do futuro" até este limite ainda é desta compra. */
export const GUEST_LOGIN_CLOCK_SKEW_MS = 2 * 60 * 1000
/** Teto de e-mails de link por sessão Stripe (o 1º sai sozinho para conta existente). */
export const GUEST_SIGNIN_EMAIL_MAX_PER_SESSION = 3
/** Carimbo em app_metadata (só o admin escreve) da conta criada por esta compra: o fato não depende de adivinhar. */
export const GUEST_ACCOUNT_SESSION_APP_METADATA_KEY = 'kineo_guest_checkout_session' as const
/** Id da sessão do Auth emitida pelo login de uso único (claim session_id do JWT): a ÚNICA sessão sem prova de e-mail. */
export const GUEST_AUTO_LOGIN_SESSION_KEY = 'kineo_guest_auto_session_id' as const
/** Quando e por onde a 1ª entrada com prova de e-mail derrubou as outras sessões (uma vez por conta). */
export const GUEST_SESSIONS_REVOKED_AT_KEY = 'kineo_guest_sessions_revoked_at' as const
export const GUEST_SESSIONS_REVOKED_VIA_KEY = 'kineo_guest_sessions_revoked_via' as const
/** Quando a senha da conta virou uma aleatória que ninguém conhece (na mesma 1ª entrada com prova; uma vez por conta). */
export const GUEST_PASSWORD_SCRAMBLED_AT_KEY = 'kineo_guest_password_scrambled_at' as const
/** Validade do link do e-mail "sua conta está pronta" (uso único; depois, Google ou "Forgot password"). */
export const GUEST_READY_LINK_TTL_HOURS = 72

// ─── Marcadores em stripe_events (id texto, único) ───────────────────────────────────────────────────────────────────
/** ESPELHO do literal do webhook (`checkout_fulfilled:${session.id}`): o guardião confere que os dois batem. */
export function checkoutFulfilledMarkerId(stripeSessionId: string): string {
  return `checkout_fulfilled:${stripeSessionId}`
}
export function guestLoginClaimId(stripeSessionId: string): string {
  return `guest_login_used:${stripeSessionId}`
}
export function guestConflictMarkerId(stripeSessionId: string): string {
  return `guest_checkout_conflict:${stripeSessionId}`
}
export function guestSignInEmailSlotId(stripeSessionId: string, slot: number): string {
  return `guest_signin_email:${stripeSessionId}:${slot}`
}
/** O e-mail "sua conta está pronta" sai UMA vez por sessão Stripe (reentrega do webhook não repete). */
export function guestReadyEmailClaimId(stripeSessionId: string): string {
  return `guest_ready_email:${stripeSessionId}`
}
/** O link desse e-mail entra UMA vez. */
export function guestReadyLinkClaimId(stripeSessionId: string): string {
  return `guest_ready_link_used:${stripeSessionId}`
}

// ─── Eventos (todos SERVER_ONLY em app/api/events/route.ts) ─────────────────────────────────────────────────────────
export const GUEST_CHECKOUT_EVENTS = {
  started: 'checkout_guest_started',
  accountCreated: 'guest_account_created',
  accountMatched: 'guest_account_matched',
  loginUsed: 'guest_login_link_used',
  loginRefused: 'guest_login_refused',
  conflict: 'guest_checkout_conflict',
  emailSent: 'guest_signin_email_sent',
  /** Pedido que podia ser de convidado e voltou ao caminho de hoje (régua ou falha ao abrir a sessão), com o motivo. */
  fallback: 'guest_checkout_fallback',
  /** A 1ª entrada com prova de e-mail numa conta de convidado derrubou as outras sessões (uma vez por conta). */
  sessionsRevoked: 'guest_sessions_revoked',
  readyEmailSent: 'guest_account_ready_email_sent',
  readyEmailFailed: 'guest_account_ready_email_failed',
  /** Compra de convidado com o desconto de boas-vindas numa conta que JÁ tinha pago (risco aceito em 07/10, medido). */
  welcomePromoReused: 'guest_welcome_promo_reused',
} as const

// ─── Quem pode comprar sem conta ─────────────────────────────────────────────────────────────────────────────────────
export type GuestCheckoutFallbackReason =
  | 'switch_off'
  | 'not_navigation'
  | 'resumed_after_signup'
  | 'card_trial'
  | 'plan_fit'
  | 'watermark_return'
  | 'checkout_recovery'
  | 'promo'
  | 'intro_discount'
  | 'bot_suspected'

/**
 * null = esta compra pode nascer sem conta. Qualquer motivo = o caminho de hoje (cadastro antes), intacto.
 * Cada motivo é algo que só funciona sabendo QUEM compra: trial de cartão (1 por conta: has_paid), Plan Fit (o filme
 * do dono), volta da marca d'água (o render do dono), retomada (a sessão salva do dono), cupom/1º mês (restrição por
 * cliente e "1 intro por cliente"). Robô: um scanner de link não pode cunhar sessão de pagamento (ver
 * isSpeculativeRequest/recordBotSuspicion na rota) — para ele fica exatamente a resposta de hoje.
 * KINEO-CUPOM-CONVIDADO-2026-10-07 — a única exceção de cupom é a oferta de boas-vindas (welcomePromo), e só com
 * GUEST_WELCOME_PROMO_LIVE (welcomePromoLive); todos os outros motivos continuam valendo para ela.
 */
export function guestCheckoutFallbackReason(input: {
  live: boolean
  isGet: boolean
  resumed: boolean
  wantsTrial: boolean
  planFit: boolean
  returnToWatermark: boolean
  checkoutRecovery: boolean
  promoRequested: boolean
  /** GUEST_WELCOME_PROMO_LIVE, passado pela rota (os cenários do guardião forçam o valor que precisam). */
  welcomePromoLive: boolean
  /** O ?promo= é EXATAMENTE a oferta de boas-vindas (WELCOME20 → welcome_first_month_20) e nada mais. */
  welcomePromo: boolean
  introDiscount: boolean
  botSuspected: boolean
}): GuestCheckoutFallbackReason | null {
  if (input.live !== true) return 'switch_off'
  if (!input.isGet) return 'not_navigation'
  if (input.resumed) return 'resumed_after_signup'
  if (input.wantsTrial) return 'card_trial'
  if (input.planFit) return 'plan_fit'
  if (input.returnToWatermark) return 'watermark_return'
  if (input.checkoutRecovery) return 'checkout_recovery'
  if (input.promoRequested && !guestWelcomePromoReleased(input)) return 'promo'
  if (input.introDiscount) return 'intro_discount'
  if (input.botSuspected) return 'bot_suspected'
  return null
}

/** O único cupom que compra sem conta: a oferta de boas-vindas, com o interruptor ligado. Todo o resto é 'promo'. */
function guestWelcomePromoReleased(input: { welcomePromoLive?: boolean; welcomePromo?: boolean }): boolean {
  return input.welcomePromoLive === true && input.welcomePromo === true
}

/**
 * O recorte da oferta de boas-vindas: Creator ('basic') ou Studio ('pro'), mensal — o MESMO gate do caminho logado
 * (KINEO-WELCOME20-2026-08-25 em app/api/stripe/checkout/route.ts). Fora dele o caminho logado recusa o desconto; o
 * convidado volta ao cadastro (e de lá cai na MESMA recusa de hoje). O guardião executa os dois caminhos em todos os
 * planos × períodos e exige que concordem.
 */
export function guestWelcomePromoShapeOk(input: { tier: string; isAnnual: boolean }): boolean {
  return (input.tier === 'basic' || input.tier === 'pro') && input.isAnnual !== true
}

/**
 * Falha ao abrir a sessão de convidado (exceção ou 4xx da Stripe, ou sessão sem URL). A regra é "nunca pior que hoje":
 * o visitante volta ao caminho de hoje (cadastro antes, mesmo redirect, mesmo checkout_auth_required) e o motivo vai
 * num evento guest_checkout_fallback — nunca uma tela de erro que hoje não existiria.
 * 'welcome_promo_unavailable' = o desconto de boas-vindas não pôde ser confirmado na Stripe (código ausente/inativo,
 * cupom diferente do prometido, consulta que falhou, plano fora do recorte): o motivo exato vai junto, no formato do
 * caminho logado (public_promo_state 'failed' + public_promo_failure_reason).
 */
export type GuestCheckoutFailureReason =
  | 'stripe_session_failed'
  | 'stripe_session_without_url'
  | 'guest_session_threw'
  | 'welcome_promo_unavailable'

/**
 * Compra de convidado com o desconto de boas-vindas numa conta que JÁ tinha pago: 'paid_before'. null = primeira vez
 * (conta nascida desta compra, ou conta antiga que nunca pagou) ou compra sem o desconto.
 * "Já usou o WELCOME20" está contido em "já pagou": toda compra concluída com o desconto passa pelo grant do webhook,
 * que grava has_paid=true — e nada no código volta has_paid para false.
 * Reentrega do webhook DEPOIS do grant: o perfil já aponta para ESTA assinatura, então o has_paid é desta compra e
 * não conta (sem isto, toda reentrega de uma 1ª compra legítima viraria um falso "reuso").
 */
export type GuestWelcomePromoReuse = 'paid_before'

export function guestWelcomePromoReuse(input: {
  welcomePromoApplied: boolean
  bornFromThisSession: boolean
  profile: { has_paid?: boolean | null; stripe_subscription_id?: string | null } | null | undefined
  subscriptionId: string | null | undefined
}): GuestWelcomePromoReuse | null {
  if (input.welcomePromoApplied !== true) return null
  if (input.bornFromThisSession) return null
  const profile = input.profile
  if (!profile) return null
  if (profile.stripe_subscription_id && input.subscriptionId && profile.stripe_subscription_id === input.subscriptionId) return null
  if (profile.has_paid === true) return 'paid_before'
  return null
}

/** A tela só promete "sem cadastro" quando o servidor vai mesmo abrir a Stripe sem conta (mesma régua, lado cliente). */
export function guestCheckoutCoversPlanClick(input: {
  live: boolean
  promoRequested: boolean
  introDiscount: boolean
  trial?: boolean
}): boolean {
  return input.live === true && !input.promoRequested && !input.introDiscount && input.trial !== true
}

export const GUEST_CHECKOUT_ANON_NOTE =
  'Secure Stripe checkout. No sign-up first: your Kineo account is created with the email you pay with.'

/** Texto que a Stripe mostra embaixo do botão de pagar (custom_text.after_submit, até 1200 caracteres). */
export const GUEST_CHECKOUT_STRIPE_NOTE =
  'Your Kineo plan is tied to this email. New to Kineo? Your account is created with it and you are signed in ' +
  'right after paying. Already have an account with this email? The plan goes to that account.'

// ─── Sessão Stripe de convidado ──────────────────────────────────────────────────────────────────────────────────────
type MetadataLike = { [key: string]: string } | null | undefined

export function isGuestCheckoutSession(session: { mode?: string | null; metadata?: MetadataLike }): boolean {
  return session.mode === 'subscription' && session.metadata?.[GUEST_CHECKOUT_METADATA_FLAG] === '1'
}

// ─── E-mail ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Minúsculas e sem espaços (o Auth guarda assim; medido 06/10: 2.398 de 2.398 e-mails em minúsculas). */
export function normalizeGuestEmail(raw: string | null | undefined): string | null {
  const email = (raw ?? '').trim().toLowerCase()
  if (email.length < 3 || email.length > 254) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

/** "jo•••@gmail.com" — só para quem provou ser o navegador da compra. */
export function maskGuestEmail(email: string | null | undefined): string | null {
  const normalized = normalizeGuestEmail(email)
  if (!normalized) return null
  const at = normalized.lastIndexOf('@')
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2)
  return `${visible}•••@${domain}`
}

// ─── Conta existente com plano ativo ────────────────────────────────────────────────────────────────────────────────
export type GuestConflictReason = 'active_stripe_plan' | 'active_paypal_plan' | 'manual_paid_access'

/**
 * O caminho logado RECUSA a segunda assinatura (rota de checkout: "You already have a Kineo subscription"). Sem conta,
 * ninguém pôde recusar antes de pagar. Se o e-mail já tem acesso pago vindo de OUTRA assinatura, o webhook não
 * sobrescreve nada: registra o conflito, avisa o fundador e a página diz a verdade. Mesma assinatura = retomada.
 */
export function guestPurchaseConflict(
  profile: {
    is_pro?: boolean | null
    stripe_subscription_id?: string | null
    paypal_subscription_id?: string | null
  } | null | undefined,
  subscriptionId: string | null | undefined,
): GuestConflictReason | null {
  if (!profile || profile.is_pro !== true) return null
  const stripeSub = profile.stripe_subscription_id ?? null
  if (stripeSub && subscriptionId && stripeSub === subscriptionId) return null
  if (stripeSub) return 'active_stripe_plan'
  if (profile.paypal_subscription_id) return 'active_paypal_plan'
  return 'manual_paid_access'
}

// ─── Página de acesso pós-pagamento ─────────────────────────────────────────────────────────────────────────────────
export type GuestCheckEmailReason =
  | 'existing_account'
  | 'other_browser'
  | 'expired'
  | 'already_used'
  | 'other_account_signed_in'

export type GuestAccessDecision =
  | { state: 'unavailable' }
  | { state: 'pending' }
  | { state: 'conflict' }
  | { state: 'signed_in' }
  | { state: 'sign_in' }
  | { state: 'check_email'; reason: GuestCheckEmailReason }

export type GuestAccessInput = {
  session: null | { isGuest: boolean; status: string | null; paymentStatus: string | null }
  /** Dono carimbado pelo webhook no Customer da Stripe (metadata.supabase_user_id). */
  ownerUserId: string | null
  /** stripe_events tem checkout_fulfilled:<sessão> — o grant terminou. */
  fulfilled: boolean
  /** stripe_events tem guest_checkout_conflict:<sessão>. */
  conflict: boolean
  /** emailProven = o dono já entrou com prova de e-mail (as outras sessões caíram; carimbo em app_metadata). */
  owner: null | { bornFromThisSession: boolean; createdAtMs: number | null; emailProven?: boolean }
  /** O cookie httpOnly deste navegador bate com o hash gravado na sessão Stripe. */
  browserProof: boolean
  loginAlreadyUsed: boolean
  signedInUserId: string | null
  nowMs: number
  windowMinutes?: number
}

/** A ordem é a regra: nada loga quem não for conta nova, deste navegador, desta compra, na janela, pela 1ª vez. */
export function decideGuestAccess(input: GuestAccessInput): GuestAccessDecision {
  const session = input.session
  if (!session || session.isGuest !== true) return { state: 'unavailable' }
  if (session.status === 'expired') return { state: 'unavailable' }
  const settled = session.paymentStatus === 'paid' || session.paymentStatus === 'no_payment_required'
  if (session.status !== 'complete' || !settled) return { state: 'pending' }
  if (input.conflict) return { state: 'conflict' }
  if (!input.ownerUserId || !input.fulfilled || !input.owner) return { state: 'pending' }
  if (input.signedInUserId && input.signedInUserId === input.ownerUserId) return { state: 'signed_in' }
  if (input.signedInUserId) return { state: 'check_email', reason: 'other_account_signed_in' }
  if (input.owner.bornFromThisSession !== true) return { state: 'check_email', reason: 'existing_account' }
  if (input.browserProof !== true) return { state: 'check_email', reason: 'other_browser' }
  if (input.loginAlreadyUsed) return { state: 'check_email', reason: 'already_used' }
  // O dono do e-mail já entrou com prova (Google, link por e-mail, recuperação): o login sem prova não abre mais — a
  // ordem dos cliques não pode reabrir a porta que a derrubada única fechou.
  if (input.owner.emailProven === true) return { state: 'check_email', reason: 'already_used' }
  const createdAtMs = input.owner.createdAtMs
  const windowMs = (input.windowMinutes ?? GUEST_LOGIN_WINDOW_MINUTES) * 60 * 1000
  if (
    typeof createdAtMs !== 'number' ||
    !Number.isFinite(createdAtMs) ||
    input.nowMs - createdAtMs > windowMs ||
    createdAtMs - input.nowMs > GUEST_LOGIN_CLOCK_SKEW_MS
  ) {
    return { state: 'check_email', reason: 'expired' }
  }
  return { state: 'sign_in' }
}

// ─── Tomada de conta: a 1ª entrada com prova de e-mail derruba as outras sessões ────────────────────────────────────
// O login de uso único entra sem provar o e-mail (quem pagou pode ter digitado o e-mail de outra pessoa). Se o dono
// real do e-mail entrar depois por um meio que prova a caixa (Google/OAuth, link por e-mail, recuperação de senha), as
// OUTRAS sessões caem — inclusive a do login de uso único — uma única vez por conta.
export type GuestSessionRevocationDecision =
  | 'not_guest_account'
  | 'already_revoked'
  | 'no_session'
  | 'auto_login_session'
  | 'not_proven'
  | 'revoke'

/**
 * Métodos de entrada (claim `amr` do JWT do Auth; medidos em auth.mfa_amr_claims/auth.flow_state em 06/10: oauth,
 * otp, recovery, password) que PROVAM a caixa de e-mail. 'password' NUNCA prova: a sessão sem prova pode pôr uma
 * senha direto na API do Auth e entrar com ela — se senha contasse, ela mesma gastaria a derrubada única.
 */
export const GUEST_EMAIL_PROVING_AMR = ['oauth', 'otp', 'magiclink', 'recovery', 'email/signup', 'invite', 'email_change', 'sso/saml'] as const

export function guestSessionRevocation(input: {
  appMetadata: Record<string, unknown> | null | undefined
  currentSessionId: string | null | undefined
  /** Métodos (amr) da sessão nova. */
  authMethods: readonly string[]
  /** Quais métodos valem como prova nesta porta (padrão: GUEST_EMAIL_PROVING_AMR). */
  acceptedMethods?: readonly string[]
}): GuestSessionRevocationDecision {
  const meta = input.appMetadata ?? {}
  const born = meta[GUEST_ACCOUNT_SESSION_APP_METADATA_KEY]
  if (typeof born !== 'string' || !born) return 'not_guest_account'
  if (meta[GUEST_SESSIONS_REVOKED_AT_KEY]) return 'already_revoked'
  const current = typeof input.currentSessionId === 'string' ? input.currentSessionId : ''
  if (!current) return 'no_session'
  // A própria sessão do login de uso único nunca dispara a derrubada (ela é a que não provou o e-mail).
  if (meta[GUEST_AUTO_LOGIN_SESSION_KEY] === current) return 'auto_login_session'
  const accepted: readonly string[] = input.acceptedMethods ?? GUEST_EMAIL_PROVING_AMR
  if (!input.authMethods.some((method) => accepted.includes(method))) return 'not_proven'
  return 'revoke'
}

// ─── URLs de volta da Stripe ─────────────────────────────────────────────────────────────────────────────────────────
const STRIPE_SESSION_ID = /^cs_(?:live|test)_[A-Za-z0-9]{10,200}$/

/** success_url do convidado: a página de acesso primeiro; ela devolve o comprador ao /checkout/success de sempre. */
export function buildGuestCheckoutSuccessUrl(input: {
  appUrl: string
  tier: string
  currency: string
  amount: number
}): string {
  const autopilotTier = input.tier === 'autopilot' ? '&tier=autopilot' : ''
  return `${input.appUrl}/checkout/guest?currency=${input.currency}&amount=${input.amount}${autopilotTier}&session_id={CHECKOUT_SESSION_ID}`
}

/**
 * Depois do login, o MESMO destino que o caminho logado recebe da Stripe (buildSubscriptionCheckoutSuccessUrl em
 * lib/growth/checkoutSuccessFlow.ts): /checkout/success?success=true&currency=…&amount=…[&tier=autopilot]&session_id=…
 * Só repassa o que reconhece; o resto da URL é descartado.
 */
export function guestSuccessDestination(params: Pick<URLSearchParams, 'get'>): string | null {
  const sessionId = (params.get('session_id') ?? '').trim()
  if (!STRIPE_SESSION_ID.test(sessionId)) return null
  const currency = (params.get('currency') ?? '').trim().toLowerCase()
  const amount = (params.get('amount') ?? '').trim()
  const safeCurrency = /^[a-z]{3}$/.test(currency) ? currency : 'usd'
  const safeAmount = /^\d{1,9}$/.test(amount) ? amount : '0'
  const autopilotTier = params.get('tier') === 'autopilot' ? '&tier=autopilot' : ''
  return `/checkout/success?success=true&currency=${safeCurrency}&amount=${safeAmount}${autopilotTier}&session_id=${sessionId}`
}

export function isGuestStripeSessionId(value: string | null | undefined): boolean {
  return STRIPE_SESSION_ID.test((value ?? '').trim())
}
