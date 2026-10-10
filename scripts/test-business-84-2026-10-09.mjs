// KINEO-BUSINESS-84-2026-10-09 — guardião do plano Business (US$ 84/mês, 500 créditos, anúncios de produto) e do
// interruptor KINEO-AUTOPILOT-FORA-2026-10-09 (Autopilot fora da vitrine, backend intacto).
//
// Prova, EXECUTANDO os módulos pelo carregador offline da casa (scripts/test-support/offline-ts-loader.mjs) e lendo as
// rotas que não rodam fora do servidor (readFileSync):
//   (1) preço 8400 USD, mensal, price_data inline com recurring month; sem anual (o checkout força monthly);
//   (2) 500 créditos no 1º pagamento (TIER_CREDITS) e na renovação (renewalCreditsFor/renewalCreditsForInvoice, inclusive
//       fatura abaixo do preço e fatura em BRL) — nunca menos que o grant;
//   (3) o tier 'business' é reconhecido em TODOS os ramos do webhook que mapeiam metadata.tier (1º pagamento, evento
//       payment_success, troca de tier, renovação) e o token cinematográfico segue o Studio;
//   (4) MRR: PLAN_PRICE_USD.business = 84, isPayingPlan, planBase/planLabel = Business;
//   (5) Studio Ads abre para 'business' (ADS_SUBSCRIBER_PLANS), e os portões do Studio (enginePlanGate, kineo1Gate);
//   (6) afiliado: 20% SÓ no Business (40% nos outros, inclusive acordo especial maior que vale fora do Business);
//       o webhook passa o tier em toda comissão de assinatura;
//   (7) WELCOME20/cupom: o checkout descarta ?promo= e desliga o campo manual da Stripe para o Business (logado e convidado);
//   (8) copy derivada: N = floor(500 / custo Commercial 15 s) = 12, e as telas (pricing, /business, checkout) não digitam
//       84 / 500 / 12;
//   (9) Autopilot fora: AUTOPILOT_PUBLIC=false, checkout recusa tier=autopilot|autopilot_lite e pack=autopilot_pilot com
//       410 plan_unavailable (interna passa), PLAN_FACTS sem Autopilot, e o backend (webhook/MRR) continua mapeando;
//  (10) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Estilo readFileSync + transpile (molde scripts/test-ads-parede-2026-10-06.mjs). Nenhum import com alias @/ no guardião.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT) // o carregador offline resolve a partir do cwd
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const F = {
  PRICING: 'lib/checkoutPricing.ts',
  PLANS: 'lib/pricing.ts',
  BIZ: 'lib/businessPlan.ts',
  SETTLE: 'lib/settlementCurrency.ts',
  AFF: 'lib/affiliateCommission.ts',
  ADS: 'lib/ads/access.ts',
  GATE: 'lib/enginePlanGate.ts',
  K1: 'lib/kineo1Gate.ts',
  MRR: 'app/api/admin/_shared/mrr.ts',
  AP: 'lib/autopilotPublic.ts',
  FACTS: 'lib/kineoFacts.ts',
  CHECKOUT: 'app/api/stripe/checkout/route.ts',
  GUEST: 'lib/stripe/guestCheckout.ts',
  WEBHOOK: 'app/api/stripe/webhook/route.ts',
  BLOCK: 'components/pricing/PricingBusinessBlock.tsx',
  PAGE: 'app/business/page.tsx',
  PCLIENT: 'app/pricing/PricingClient.tsx',
  SITEMAP: 'app/sitemap.ts',
}

/** Carregador offline com fontes sobrepostas (mutantes). Stripe nunca é tocada: mock vazio. */
function offline(over = {}) {
  return createOfflineLoader({
    mocks: { '@/lib/stripe': { stripe: {} } },
    source: (rel, text) => (over[rel] !== undefined ? over[rel] : text),
  })
}
const src = (over, rel) => (over[rel] !== undefined ? over[rel] : read(rel))
/** Só as linhas de código (sem linhas de comentário): a varredura de número digitado não tropeça no histórico. */
const codeOnly = (t) => t.split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')

/** Todas as checagens; devolve a lista de rótulos que falharam (o caminho real exige lista vazia). */
function runChecks(over = {}, verbose = false) {
  const failed = []
  const check = (c, m) => { if (verbose) ok(c, m); if (!c) failed.push(m) }
  const load = offline(over)
  let P, PL, B, S, A, AD, G, K, M, AP, FA
  try {
    P = load('@/' + F.PRICING); PL = load('@/' + F.PLANS); B = load('@/' + F.BIZ); S = load('@/' + F.SETTLE)
    A = load('@/' + F.AFF); AD = load('@/' + F.ADS); G = load('@/' + F.GATE); K = load('@/' + F.K1)
    M = load('@/' + F.MRR); AP = load('@/' + F.AP); FA = load('@/' + F.FACTS)
  } catch (e) {
    check(false, 'carregar os módulos: ' + (e && e.message))
    return failed
  }

  // (1) preço
  check(P.BUSINESS_PRICES?.usd === 8400, '(1) BUSINESS_PRICES.usd = 8400 (US$ 84)')
  check(P.monthlyPriceMinor('business', 'usd') === 8400, '(1) monthlyPriceMinor(business) = 8400')
  check(PL.PLANS?.business?.price === 84 && PL.PLANS.business.href === '/api/stripe/checkout?tier=business', '(1) PLANS.business = $84 → checkout tier=business')
  check(!PL.PLAN_LIST.some((p) => p.tier === 'business'), '(1) Business fora do PLAN_LIST (os 3 cartões ficam intactos)')
  const co = src(over, F.CHECKOUT)
  const norm = co.match(/if \(tier === 'business'\) \{\n\s+billing = 'monthly'\n\s+intro = false\n\s+promo = undefined\n\s+\}/)
  check(Boolean(norm), '(1)(7) checkout normaliza business: mensal, sem intro, sem promo')
  check(/const unitAmount = isAnnual && tier !== 'autopilot' && tier !== 'autopilot_lite' && tier !== 'business'/.test(co), '(1) unitAmount nunca usa anual para business')
  check(/recurring: \{ interval \}/.test(co) && /price_data: \{\n\s+currency: chargeCurrency,/.test(co), '(1) assinatura em price_data inline com recurring (molde dos outros tiers)')
  check(/: tierParam === 'business' \? 'business'/.test(co), '(1) GET ?tier=business vira tier business (não cai em basic)')
  check(/  business: \{\n    name: 'Kineo — Business',\n    description: `\$\{BUSINESS_ADS_PROMISE\}/.test(co), '(1)(8) TIERS.business no checkout com descrição derivada')
  check(S.planSettlementAmountMinor('business', 'monthly', 'usd', 8400) === 8400, '(1) liquidação USD = 8400')

  // (2) créditos
  check(P.TIER_CREDITS.business === 500, '(2) TIER_CREDITS.business = 500')
  check(P.renewalCreditsFor('business', 8400) === 500, '(2) renovação a 8400 → 500')
  check(P.renewalCreditsFor('business', 7000) === 500 && P.renewalCreditsFor('business', null) === 500, '(2) renovação abaixo do preço / sem valor → 500 (nunca subconcede)')
  check(S.renewalCreditsForInvoice('business', S.usdToBrlMinor(8400), 'brl') === 500, '(2) renovação em BRL → 500')
  check(P.LEGACY_TIER_CREDITS_V5.business === 500 && P.LEGACY_TIER_CREDITS_V6.business === 500, '(2) escadas legadas do business = 500')
  check(P.checkPricingInvariants().length === 0, '(2) invariantes de preço (inclui plan:business no pior motor) sem violação')

  // (3) webhook — todo ramo que mapeia metadata.tier conhece business
  const wh = src(over, F.WEBHOOK)
  check((wh.match(/session\.metadata\?\.tier === 'business' \? 'business'/g) || []).length === 2, '(3) webhook: 1º pagamento + payment_success mapeiam business (2 ramos de sessão)')
  check(/currentSubscription\.metadata\?\.tier === 'business'\n\s+\? 'business'/.test(wh), '(3) webhook: troca de tier (assinatura viva) conhece business')
  check(/subscription\.metadata\?\.tier === 'business' \? 'business'/.test(wh), '(3) webhook: renovação (invoice.payment_succeeded) mapeia business')
  check(/renewalCreditsForInvoice\(renewalTier, invoice\.amount_paid, invoice\.currency\)/.test(wh), '(3) renovação concede pela régua da fatura (renewalCreditsForInvoice)')
  // O token cinematográfico do Studio NÃO foi estendido ao Business (as linhas da fórmula de renovação são fixas,
  // guardião KINEO-STRIPE-ATRASO; e o token não fazia parte da decisão do fundador).
  check(/const renewalCinematicTokens = \(renewalTier === 'pro' \|\| renewalTier === 'autopilot'\) \? 1 : 0\n/.test(wh), '(3) fórmula da renovação intacta (token cinematográfico como antes)')
  check(/checkout_fulfilled:\$\{session\.id\}/.test(wh) && /renewal_granted:\$\{invoice\.id\}/.test(wh), '(3) idempotência de sempre (checkout_fulfilled / renewal_granted) intacta')

  // (4) MRR
  check(M.PLAN_PRICE_USD.business === 84, '(4) PLAN_PRICE_USD.business = 84')
  check(M.isPayingPlan('business') && M.isPaidPlan('business') && !M.isTrialPlan('business'), '(4) business é pagante (não trial)')
  check(M.planBase('business') === 'business' && M.planLabel('business') === 'Business', '(4) planBase/planLabel = Business')
  check(M.mrrForPlan('business') === 84, '(4) mrrForPlan(business) = 84')

  // (5) acesso
  check(AD.adsAccessReason({ plan: 'business', ads_access_until: null }, 'cliente@empresa.com') === 'subscriber', '(5) Studio Ads abre para business')
  check(AD.adsAccessReason({ plan: 'free', ads_access_until: null }, 'cliente@empresa.com') === 'none', '(5) controle: free continua fora do Studio Ads')
  check(G.decideEngineGate({ engine: 'cinematic_hollywood', plan: 'business', profileCreatedAt: '2100-01-01T00:00:00Z' }).allowed === true, '(5) portão de motor do Studio abre para business (conta nova)')
  check(G.decideEngineGate({ engine: 'cinematic_hollywood', plan: 'basic', profileCreatedAt: '2100-01-01T00:00:00Z' }).allowed === false, '(5) controle: Creator continua barrado no motor Studio')
  check(K.kineo1DispatchAllowed({ plan: 'business', hasPaid: false }), '(5) Kineo 1 abre para business')

  // (6) afiliado
  check(A.BUSINESS_AFFILIATE_COMMISSION_RATE === 0.2, '(6) taxa Business = 0.2')
  check(A.affiliateCommissionRateForPlan(0.3, 'business') === 0.2, '(6) Business paga 20% (piso de 40% não vale)')
  check(A.affiliateCommissionRateForPlan(0.5, 'business') === 0.2, '(6) Business paga 20% mesmo com acordo especial maior')
  check(A.affiliateCommissionRateForPlan(0.3, 'pro') === 0.4 && A.affiliateCommissionRateForPlan(null, null) === 0.4, '(6) outros planos / sem plano = 40%')
  check(A.affiliateCommissionRateForPlan(0.5, 'basic') === 0.5, '(6) acordo especial maior segue valendo fora do Business')
  check(/const chargeRate = isBusinessCommissionPlan\(args\.plan\) \? BUSINESS_AFFILIATE_COMMISSION_RATE : rate\n\s+const commission = calculateAffiliateCommission\(args\.amountGross, chargeRate\)/.test(wh), '(6) webhook calcula a comissão pela taxa por plano')
  check(A.isBusinessCommissionPlan('business') && !A.isBusinessCommissionPlan('pro') && !A.isBusinessCommissionPlan(null), '(6) isBusinessCommissionPlan só reconhece business')
  const subCalls = wh.match(/recordAffiliateCommission\(supabase, \{[^\n]*paymentKind: 'subscription'[^\n]*\}\)/g) || []
  // KINEO-TROCA-BUSINESS-2026-10-10 — re-ancorado: +1 comissão (a fatura da subida para o Business, cobrada na hora), que passa o tier da assinatura viva.
  check(subCalls.length === 8 && subCalls.every((c) => /plan: (session|subscription|trocaSubscription)\.metadata\?\.tier \}\)$/.test(c)), `(6) as 8 comissões de assinatura passam o tier (${subCalls.length})`)

  // (7) cupom
  check(P.planAcceptsPromotions('business') === false && P.planAcceptsPromotions('pro') === true, '(7) planAcceptsPromotions: business não, pro sim')
  check(/if \(!discountApplied && planAcceptsPromotions\(tier\)\) \{\n\s+sessionParams\.allow_promotion_codes = true/.test(co), '(7) campo manual da Stripe desligado para business (logado)')
  check(/allow_promotion_codes: !discountApplied && planAcceptsPromotions\(tier\)/.test(co), '(7) recuperação da sessão sem campo manual para business (logado)')
  const gu = src(over, F.GUEST)
  check(/if \(input\.tier === 'business'\) \{\n\s+delete params\.allow_promotion_codes\n\s+params\.after_expiration = \{ recovery: \{ enabled: true, allow_promotion_codes: false \} \}\n\s+\}\n\s+return \{ params, affiliateSystem \}/.test(gu), '(7) convidado: sem campo manual para business (sessão e recuperação)')
  check(/\(tier !== 'basic' && tier !== 'pro'\) \|\| isAnnual\)/.test(co), '(7) WELCOME20 segue restrito a Creator/Studio mensal')

  // (8) copy derivada
  const commercial = 41
  check(B.BUSINESS_AD_CREDITS === commercial && B.BUSINESS_ADS_PER_MONTH === Math.floor(500 / commercial) && B.BUSINESS_ADS_PER_MONTH === 12, '(8) 12 anúncios = floor(500 / 41)')
  check(B.BUSINESS_ADS_PROMISE === '12 product ads of 15 s per month', '(8) promessa: "12 product ads of 15 s per month"')
  check(B.BUSINESS_PRICE_LABEL === '$84', '(8) rótulo de preço "$84" derivado')
  check(B.BUSINESS_BULLETS.includes('3 variations to A/B test'), '(8) variações A/B derivadas das vagas do Studio Ads')
  const bizSrc = read(F.BIZ)
  check(!/\b(8400|500|12|84)\b/.test(codeOnly(bizSrc)),'(8) lib/businessPlan.ts não digita 84/500/12 em código')
  for (const rel of [F.BLOCK, F.PAGE]) {
    const t = codeOnly(src(over, rel))
    check(!/\$84|84\/|\b500 credits|\b12 (product )?ads|\b41 credits/.test(t), `(8) ${rel} não digita preço/créditos/contagem`)
    check(/BUSINESS_ADS_PROMISE/.test(t) && /BUSINESS_PRICE_LABEL/.test(t), `(8) ${rel} lê promessa e preço da fonte`)
  }
  const pc = src(over, F.PCLIENT)
  check(/<PricingBusinessBlock onBuy=\{\(\) => handleBuy\('business'\)\}/.test(pc), '(8) /pricing renderiza o bloco Business com handleBuy(business)')
  check(/const promoParam = promo && !isBusiness \?/.test(pc), '(7) /pricing não manda cupom para o Business')
  const page = src(over, F.PAGE)
  check(/alternates: \{ canonical: BUSINESS_PAGE_PATH \}/.test(page) && /href="\/ads\?from=business_page"/.test(page) && /href=\{BUSINESS_DFY_HREF\}/.test(page), '(8) /business: canonical, CTA /ads e link do feito-para-você')
  check(/\{ path: '\/business', priority: 0\.9, freq: 'weekly' \}/.test(src(over, F.SITEMAP)), '(8) /business no sitemap')

  // (9) Autopilot fora da vitrine, backend intacto
  check(AP.AUTOPILOT_PUBLIC === false, '(9) AUTOPILOT_PUBLIC = false')
  check(AP.autopilotCheckoutOpen('autopilot', false) === false && AP.autopilotCheckoutOpen('autopilot_lite', false) === false && AP.autopilotCheckoutOpen('autopilot_pilot', false) === false, '(9) compra nova da família Autopilot fechada')
  check(AP.autopilotCheckoutOpen('autopilot', true) === true, '(9) conta interna passa')
  check(AP.autopilotCheckoutOpen('business', false) === true && AP.autopilotCheckoutOpen('pro', false) === true, '(9) controle: business/pro seguem abertos')
  check(/const closedTier = await refuseClosedAutopilotCheckout\(req, tier\)\n\s+if \(closedTier\) return closedTier/.test(co), '(9) checkout recusa ?tier=autopilot|autopilot_lite')
  check(/const closed = await refuseClosedAutopilotCheckout\(req, packParam\)[^\n]*\n\s+if \(closed\) return closed\n\s+return await buildAutopilotPilotAndRedirect/.test(co), '(9) checkout recusa ?pack=autopilot_pilot')
  check(/\{ status: 410 \}/.test(co) && /error: AUTOPILOT_UNAVAILABLE_REASON/.test(co) && AP.AUTOPILOT_UNAVAILABLE_REASON === 'plan_unavailable', '(9) recusa = 410 plan_unavailable')
  check(!FA.PLAN_FACTS.some((p) => String(p.id).startsWith('autopilot')) && FA.PLAN_FACTS.some((p) => p.id === 'business'), '(9) fatos para LLM: sem Autopilot, com Business')
  check(/export const PRICING_SHOW_AUTOPILOT = AUTOPILOT_PUBLIC/.test(pc), '(9) /pricing: seção Autopilot amarrada ao interruptor')
  check(/session\.metadata\?\.tier === 'autopilot' \? 'autopilot'/.test(wh) && M.PLAN_PRICE_USD.autopilot === 299, '(9) backend: webhook e MRR seguem conhecendo autopilot')

  return failed
}

console.log('— caminho real')
const real = runChecks({}, true)
ok(real.length === 0, `caminho real: ${real.length} falhas`)

// ── mutantes ────────────────────────────────────────────────────────────────────────────────────────────────────────
function mutate(rel, from, to) {
  const orig = read(rel)
  if (!orig.includes(from)) return { applied: false }
  const next = orig.split(from).join(to)
  return { applied: next !== orig, over: { [rel]: next } }
}
const MUTANTS = [
  ['preço 8400 → 8500', F.PRICING, '  usd: 8400,', '  usd: 8500,', /\(1\) BUSINESS_PRICES/],
  ['grant 500 → 410 (a promessa muda junto)', F.PRICING, '  business: 500,\n}', '  business: 410,\n}', /\(8\) 12 anúncios|\(2\) TIER_CREDITS/],
  ['renovação esquece o business', F.WEBHOOK, "                  : subscription.metadata?.tier === 'business' ? 'business'", "                  : subscription.metadata?.tier === 'x_business' ? 'business'", /\(3\) webhook: renovação/],
  ['1º pagamento esquece o business', F.WEBHOOK, "                  : session.metadata?.tier === 'business' ? 'business'", "                  : session.metadata?.tier === 'x_business' ? 'business'", /\(3\) webhook: 1º pagamento/],
  ['checkout volta a aceitar cupom no business', F.CHECKOUT, "    intro = false\n    promo = undefined\n  }", "    intro = false\n  }", /\(1\)\(7\) checkout normaliza/],
  ['campo manual da Stripe ligado para todos', F.CHECKOUT, 'if (!discountApplied && planAcceptsPromotions(tier)) {', 'if (!discountApplied) {', /\(7\) campo manual/],
  ['Studio Ads sem business', F.ADS, ", 'autopilot_lite', 'business']", ", 'autopilot_lite']", /\(5\) Studio Ads abre/],
  ['afiliado do Business volta a 40%', F.AFF, "plan.trim().toLowerCase() === 'business'", "plan.trim().toLowerCase() === 'x_business'", /\(6\) Business paga 20%/],
  ['webhook ignora o plano na comissão', F.WEBHOOK, 'calculateAffiliateCommission(args.amountGross, chargeRate)', 'calculateAffiliateCommission(args.amountGross, rate)', /\(6\) webhook calcula/],
  ['MRR sem business', F.MRR, '  business: PLANS.business.price,\n', '', /\(4\) PLAN_PRICE_USD/],
  ['copy digitada no bloco do /pricing', F.BLOCK, '{BUSINESS_PRICE_LABEL}<small>', '$84<small>', /\(8\) components\/pricing\/PricingBusinessBlock\.tsx não digita/],
  ['Autopilot volta à vitrine', F.AP, 'export const AUTOPILOT_PUBLIC = false', 'export const AUTOPILOT_PUBLIC = true', /\(9\) AUTOPILOT_PUBLIC|\(9\) compra nova/],
  ['checkout deixa de recusar o tier autopilot', F.CHECKOUT, '    if (closedTier) return closedTier\n', '', /\(9\) checkout recusa \?tier/],
]
console.log('— mutantes')
for (const [name, rel, from, to, expect] of MUTANTS) {
  const m = mutate(rel, from, to)
  ok(m.applied, `mutante aplicou: ${name}`)
  if (!m.applied) continue
  const failed = runChecks(m.over)
  ok(failed.some((f) => expect.test(f)), `mutante fica vermelho: ${name} → [${failed.slice(0, 3).join(' | ')}]`)
}

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
