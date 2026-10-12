#!/usr/bin/env node
// KINEO-CLARITY-WELCOME20-2026-10-12 — guardião "a oferta dos 20% vale onde é anunciada".
// O /pricing anuncia na faixa do topo (components/pricing/PricingDealBar.tsx) "20% off your first month on Creator and
// Studio monthly plans"; até 12/10 só o botão do cartão do /pricing levava o ?promo=WELCOME20 e quem chegava pela home,
// por landing ou por link direto /api/stripe/checkout?tier=basic|pro pagava preço cheio. Prova:
//   1. EXECUTADA a régua pura welcome20AutoSkipReason (lib/growth/publicPromoTruth.ts) em todos os planos × períodos ×
//      descontos concorrentes: só Creator/Studio mensal sem nenhum outro desconto/cupom/afiliado/trial/intro/retomada;
//   2. um interruptor só: o /pricing (faixa + cartão) e o checkout leem WELCOME20_SITE_OFFER_LIVE;
//   3. a rota: a régua roda antes do checkout_attempted e do ramo de convidado; afiliado gravado na conta também tira;
//      o bloco automático vem DEPOIS de todo outro desconto e ANTES do campo manual e da criação da sessão; recusa da
//      Stripe = preço cheio sem erro (nenhum return no ramo recusado); o checkout_started diz public_promo_source;
//   4. o convidado: o automático vai como welcomePromo com auto:true e a recusa NÃO devolve ao cadastro;
//   5. o pedido explícito (?promo=WELCOME20) segue como antes: promessa que falha fechada, cancel_url com o código pedido;
//   6. mutantes: cada um deixa pelo menos uma verificação vermelha.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (rel) => readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')

const POLICY = 'lib/growth/publicPromoTruth.ts'
const ROUTE = 'app/api/stripe/checkout/route.ts'
const CLIENT = 'app/pricing/PricingClient.tsx'
const BAR = 'components/pricing/PricingDealBar.tsx'
const SRC = { [POLICY]: read(POLICY), [ROUTE]: read(ROUTE), [CLIENT]: read(CLIENT), [BAR]: read(BAR) }

function loadPolicy(text) {
  const output = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, POLICY),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error('publicPromoTruth importou ' + id) },
    module,
    module.exports,
  )
  return module.exports
}

const TIERS = ['starter', 'basic', 'pro', 'business', 'autopilot', 'autopilot_lite']
const BASE = { live: true, promoRequested: false, wantsTrial: false, introDiscount: false, checkoutRecovery: false, affiliatePresent: false }

function problems(rep = {}) {
  const p = []
  const src = (rel) => rep[rel] ?? SRC[rel]
  let policy
  try { policy = loadPolicy(src(POLICY)) } catch (e) { return ['policy não carrega: ' + e.message] }
  const skip = policy.welcome20AutoSkipReason
  if (typeof skip !== 'function') return ['welcome20AutoSkipReason não existe']

  // 1. a régua executada
  for (const tier of TIERS) {
    for (const isAnnual of [false, true]) {
      const r = skip({ ...BASE, tier, isAnnual })
      const devia = (tier === 'basic' || tier === 'pro') && !isAnnual ? null : 'plan_shape'
      if (r !== devia) p.push(`régua: ${tier}/${isAnnual ? 'anual' : 'mensal'} deu ${r}, devia ${devia}`)
    }
  }
  for (const tier of ['basic', 'pro']) {
    const casos = [
      ['live', false, 'switch_off'],
      ['promoRequested', true, 'promo_requested'],
      ['wantsTrial', true, 'card_trial'],
      ['introDiscount', true, 'intro_discount'],
      ['checkoutRecovery', true, 'checkout_recovery'],
      ['affiliatePresent', true, 'affiliate'],
    ]
    for (const [campo, valor, motivo] of casos) {
      const r = skip({ ...BASE, tier, isAnnual: false, [campo]: valor })
      if (r !== motivo) p.push(`régua: ${tier} mensal com ${campo}=${valor} deu ${r}, devia ${motivo}`)
    }
  }
  if (policy.WELCOME20_SITE_OFFER_LIVE !== true) p.push('interruptor WELCOME20_SITE_OFFER_LIVE desligado sem decisão do fundador')
  if (policy.WELCOME20_AUTO_SOURCE !== 'auto_banner') p.push("public_promo_source do automático deixou de ser 'auto_banner'")

  // 2. um interruptor só
  const client = src(CLIENT)
  if (!/^export const PRICING_WELCOME20_ON_CARD = WELCOME20_SITE_OFFER_LIVE$/m.test(client)) p.push('o /pricing voltou a ter interruptor próprio (a faixa pode anunciar o que o checkout não aplica)')
  const bar = src(BAR)
  if (!bar.includes('% off your first month on Creator and Studio monthly plans')) p.push('a faixa mudou o que anuncia — conferir se a régua do checkout ainda é a mesma promessa')

  // 3. a rota
  const route = src(ROUTE)
  const regraAt = route.indexOf('const welcome20AutoSkip = welcome20AutoSkipReason({')
  const attemptedAt = route.indexOf("await recordCheckoutEvent('checkout_attempted'")
  const guestAt = route.indexOf('const guestFallback = guestCheckoutFallbackReason({')
  if (regraAt < 0 || regraAt > attemptedAt || regraAt > guestAt) p.push('a régua do automático não roda antes do checkout_attempted e do convidado')
  const regra = regraAt >= 0 ? route.slice(regraAt, route.indexOf('})', regraAt)) : ''
  for (const must of [
    'live: WELCOME20_SITE_OFFER_LIVE,',
    'promoRequested: rawPromo.length > 0,',
    'wantsTrial,',
    'checkoutRecovery,',
    "normalizeAffiliateCode(req.cookies.get('sf_aff')?.value)",
    "req.cookies.get('rewardful_referral')?.value?.trim()",
    'introDiscountMinor(tier, currency, region) > 0',
  ]) if (!regra.includes(must)) p.push(`régua da rota perdeu: ${must}`)
  if (!route.includes('let autoWelcome20 = welcome20AutoSkip === null')) p.push('autoWelcome20 não nasce da régua')
  if (!/if \(autoWelcome20 && typeof profile\.affiliate_id === 'string' && profile\.affiliate_id\.length > 0\) \{\n\s+autoWelcome20 = false/.test(route)) p.push('conta atribuída a afiliado deixou de sair do automático')

  const finalGateAt = route.indexOf('if (promisedPublicPromo && !promisedPublicPromoVerified) {')
  const autoAt = route.indexOf('if (autoWelcome20 && !discountApplied && !promoBlocked && !privatePackPromo && !promisedPublicPromo) {')
  const manualAt = route.indexOf('sessionParams.allow_promotion_codes = true')
  const createAt = route.indexOf('() => stripe.checkout.sessions.create(', manualAt)
  const startedAt = route.indexOf("'checkout_started',", createAt)
  if (autoAt < 0) p.push('o bloco automático não exige "nenhum outro desconto" (discountApplied/promoBlocked/private/prometido)')
  if (!(autoAt > finalGateAt && autoAt < manualAt && autoAt < createAt)) p.push('o bloco automático saiu da ordem: depois de todo desconto, antes do campo manual e da sessão')
  const autoEnd = route.indexOf('// A recovery banner displays the exact price saved', autoAt)
  const bloco = autoAt >= 0 && autoEnd > autoAt ? route.slice(autoAt, autoEnd) : ''
  if (!bloco.includes('await resolvePromisedPublicPromo(')) p.push('o automático não passa pela MESMA prova do explícito (resolvePromisedPublicPromo)')
  if (!bloco.includes('code: WELCOME20_PROMOTION_CODE,')) p.push('o automático deixou de pedir o código WELCOME20')
  if (!bloco.includes("sessionParams.discounts = [{ promotion_code: autoResolution.promotionCodeId }]")) p.push('o automático não põe o desconto na sessão')
  if (!bloco.includes('currentCustomerId: customerId')) p.push('o automático não checa a restrição de cliente com o cliente real')
  const recusa = bloco.slice(bloco.indexOf('} else {'))
  if (bloco.indexOf('} else {') < 0 || /\breturn\b/.test(recusa)) p.push('recusa do automático virou erro (devia seguir a preço cheio)')
  if (!recusa.includes("public_promo_auto: 'fallback_full_price'")) p.push('recusa do automático sem motivo no evento')
  const started = startedAt > 0 ? route.slice(startedAt, startedAt + 900) : ''
  if (!started.includes('public_promo_applied: promisedPublicPromoVerified || autoWelcome20Applied')) p.push('checkout_started não conta o automático como desconto aplicado')
  if (!started.includes('public_promo_source: autoWelcome20Applied')) p.push('checkout_started sem public_promo_source')

  // 4. o convidado
  if (!route.includes("? { kind: 'welcome_first_month_20', requestedCode: WELCOME20_PROMOTION_CODE, auto: true }")) p.push('o convidado não recebe o automático')
  if (!route.includes(': autoWelcome20 && GUEST_WELCOME_PROMO_LIVE')) p.push('o automático do convidado ignora o interruptor do convidado')
  const guestFnAt = route.indexOf('async function buildGuestSubscriptionAndRedirect(')
  const guestFn = guestFnAt > 0 ? route.slice(guestFnAt, route.indexOf('const plan = TIERS[ctx.tier]', guestFnAt)) : ''
  const autoGuestAt = guestFn.indexOf('if (ctx.welcomePromo?.auto === true) {')
  const explicitGuestAt = guestFn.indexOf('} else if (ctx.welcomePromo) {')
  const autoGuest = autoGuestAt >= 0 && explicitGuestAt > autoGuestAt ? guestFn.slice(autoGuestAt, explicitGuestAt) : ''
  if (!autoGuest || /\breturn\b/.test(autoGuest) || !autoGuest.includes('autoWelcomeFallback = autoResolution.reason')) p.push('no convidado, a recusa do automático volta ao cadastro (devia seguir a preço cheio)')
  if (!autoGuest.includes('guestWelcomePromoShapeOk({ tier: ctx.tier, isAnnual: ctx.isAnnual })')) p.push('no convidado, o automático ignora o recorte Creator/Studio mensal')
  if (guestFn.split("return { ok: false, failure: { reason: 'welcome_promo_unavailable'").length - 1 !== 2) p.push('no convidado, o pedido explícito deixou de voltar ao cadastro na recusa')

  // 5. o explícito como antes
  if (!route.includes("const message = 'We could not verify the promised 20% welcome discount right now.")) p.push('o pedido explícito deixou de falhar fechado')
  if (!route.includes("${requestedPromo ? `&promo=${encodeURIComponent(requestedPromo)}` : ''}")) p.push('cancel_url deixou de levar só o código pedido')
  if (!route.includes("if (tier === 'business') {\n    billing = 'monthly'\n    intro = false\n    promo = undefined")) p.push('Business voltou a aceitar cupom')
  return p
}

let pass = 0
let fail = 0
const base = problems()
if (base.length === 0) { pass++; console.log('  ok  WELCOME20 vale onde é anunciado: régua executada, interruptor único, rota, convidado, explícito intacto') } else { fail++; for (const x of base) console.log('  FAIL ' + x) }

const troca = (rel, de, para) => {
  const s = SRC[rel]
  if (s.split(de).length !== 2) throw new Error(`mutante sem alvo único em ${rel}: ${de.slice(0, 70)}`)
  return { [rel]: s.replace(de, para) }
}
const MUTANTES = [
  ['automático vaza para o anual', troca(POLICY, "|| input.isAnnual !== false) return 'plan_shape'", ") return 'plan_shape'")],
  ['automático vaza para o Starter', troca(POLICY, "(input.tier !== 'basic' && input.tier !== 'pro')", "(input.tier !== 'basic' && input.tier !== 'pro' && input.tier !== 'starter')")],
  ['automático empilha com cupom pedido', troca(POLICY, "  if (input.promoRequested) return 'promo_requested'\n", '')],
  ['automático atropela o afiliado', troca(POLICY, "  if (input.affiliatePresent) return 'affiliate'\n", '')],
  ['automático em cima da retomada salva', troca(POLICY, "  if (input.checkoutRecovery) return 'checkout_recovery'\n", '')],
  ['interruptor desligado sem decisão', troca(POLICY, 'export const WELCOME20_SITE_OFFER_LIVE = true', 'export const WELCOME20_SITE_OFFER_LIVE = false')],
  ['/pricing com interruptor próprio', troca(CLIENT, 'export const PRICING_WELCOME20_ON_CARD = WELCOME20_SITE_OFFER_LIVE', 'export const PRICING_WELCOME20_ON_CARD = true')],
  ['rota esquece o cookie da Rewardful', troca(ROUTE, "      || Boolean(req.cookies.get('rewardful_referral')?.value?.trim()),\n", '\n')],
  ['rota esquece o afiliado da conta', troca(ROUTE, "  if (autoWelcome20 && typeof profile.affiliate_id === 'string' && profile.affiliate_id.length > 0) {\n    autoWelcome20 = false\n", "  if (false) {\n    autoWelcome20 = false\n")],
  ['automático empilha com desconto já posto', troca(ROUTE, 'if (autoWelcome20 && !discountApplied && !promoBlocked && !privatePackPromo && !promisedPublicPromo) {', 'if (autoWelcome20 && !promoBlocked && !privatePackPromo && !promisedPublicPromo) {')],
  ['recusa do automático vira erro', troca(ROUTE, "      console.warn('[stripe/checkout] WELCOME20 automático não confirmado; segue a preço cheio:', autoResolution.reason)\n", "      return rejectPromisedPublicPromo(autoResolution.reason)\n")],
  ['checkout_started esquece o automático', troca(ROUTE, 'public_promo_applied: promisedPublicPromoVerified || autoWelcome20Applied,', 'public_promo_applied: promisedPublicPromoVerified,')],
  ['convidado sem o automático', troca(ROUTE, "? { kind: 'welcome_first_month_20', requestedCode: WELCOME20_PROMOTION_CODE, auto: true }", '? null')],
  ['convidado volta ao cadastro na recusa do automático', troca(ROUTE, "      autoWelcomeFallback = autoResolution.reason\n", "      return { ok: false, failure: { reason: 'stripe_session_failed', detail: {} } }\n")],
  ['explícito do convidado vira preço cheio na recusa', troca(ROUTE, "    if (resolution.status === 'rejected') {\n      return { ok: false, failure: { reason: 'welcome_promo_unavailable', detail: publicPromoTruthMetadata(offer.kind, 'failed', resolution.reason) } }\n    }\n    welcome = {\n", "    if (resolution.status === 'rejected') {\n      welcome = null\n    } else welcome = {\n")],
]
for (const [nome, rep] of MUTANTES) {
  const m = problems(rep)
  if (m.length >= 1) { pass++; console.log(`  ok  mutante "${nome}" → vermelho (${m.length})`) } else { fail++; console.log(`  FAIL mutante "${nome}" passou verde`) }
}
console.log(`\n  verificações: ${pass + fail} · falhas: ${fail}`)
if (fail) process.exit(1)
console.log('OK — os 20% da faixa valem em qualquer porta do Creator/Studio mensal, sem empilhar e sem virar erro')
