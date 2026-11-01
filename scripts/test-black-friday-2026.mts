// KINEO-BLACK-FRIDAY-2026 — guardião da Black Friday 2026 (40% off o 1º ano de qualquer plano anual, 24/11 → 01/12 NY).
// Prova: (1) a janela — antes, dentro, depois, nas bordas exatas e no fuso de Nova York (EST, sem horário de verão);
// (2) o cupom só no anual de Starter/Creator/Studio (mensal, Business, Autopilot e teste com cartão nunca), e o checkout
// aplica pelo portão único, sem promotion code digitável; (3) a brecha do cupom manual na compra sem conta fechada
// (FIRST50/COMEBACK50 não entram no anual nem no Starter), espelho do caminho logado; (4) preços lidos das fontes
// únicas, sem número digitado na página nem na carta; (5) a carta em dry-run por padrão, recusa fora da janela, só nas
// datas certas pelo cron, deduplicada por pessoa+onda, excluindo quem não deve receber; (6) eventos, faixa, selo e pares.
// Rodar: npx tsx scripts/test-black-friday-2026.mts
import fs from 'node:fs'
import path from 'node:path'
import {
  BF2026_APP_ROUTE_PREFIXES, BF2026_CAMPAIGN, BF2026_COUPON_ID, BF2026_COUPON_REDEEM_BY_SECONDS, BF2026_EMAIL_BATCH_MAX,
  BF2026_EMAIL_CLAIM, BF2026_EMAIL_SENT, BF2026_ENDS_AT, BF2026_EVENTS, BF2026_PERCENT_OFF, BF2026_PROMO_CODE,
  BF2026_STARTS_AT, BF2026_TIER_NAMES, bf2026BannerHidden, bf2026CheckoutEligible, bf2026CheckoutHref, bf2026ClaimSeed,
  bf2026Countdown, bf2026DiscountMinor, bf2026EmailBody, bf2026EmailSkipReason, bf2026EmailUrl, bf2026NyDate, bf2026Open,
  bf2026PriceMinor, bf2026PriceRows, bf2026PricesMatchTable, bf2026SendDecision, bf2026State, bf2026Subject,
  bf2026UuidFromHex, bf2026WaveForDate, bf2026WorthAsking, isBf2026PromoCode,
} from '../lib/billing/blackFriday2026'
import { ANNUAL_PRICES, ANNUAL_REFUND_DAYS, TIER_CREDITS, TIER_PRICES, getAnnualPrice, planAcceptsPromotions } from '../lib/checkoutPricing'
import { ANNUAL_EARLY_OFFER_ENDS_AT } from '../lib/billing/annualEarlyOffer'
import { subscriptionAcceptsManualPromotions } from '../lib/affiliateDiscount'
import { buildGuestSubscriptionSessionParams, guestSubscriptionAcceptsManualPromotions } from '../lib/stripe/guestCheckout'
import { LIFECYCLE_EMAIL_EVENT_NAMES } from '../lib/lifecycle/emailEvents'
import { VALOR_TIER_NAMES } from '../lib/valorNoCheckout'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const T = (iso: string) => Date.parse(iso)

console.log('— 1. janela (relógio do servidor, America/New_York)')
ok(BF2026_STARTS_AT === '2026-11-24T05:00:00.000Z', 'início = 24/11 00:00 EST = 05:00 UTC')
ok(BF2026_ENDS_AT === '2026-12-02T05:00:00.000Z', 'fim exclusivo = 02/12 00:00 EST (cobre 01/12 23:59:59)')
ok(bf2026State(T('2026-11-01T12:00:00Z')) === 'before', 'hoje (01/11) = antes')
ok(bf2026State(T('2026-11-24T04:59:59.999Z')) === 'before', '23/11 23:59:59.999 em NY = antes')
ok(bf2026State(T('2026-11-24T05:00:00.000Z')) === 'open', '24/11 00:00:00 em NY = no ar')
ok(bf2026State(T('2026-11-27T15:00:00Z')) === 'open', 'Black Friday = no ar')
ok(bf2026State(T('2026-12-02T04:59:59.999Z')) === 'open', '01/12 23:59:59.999 em NY = no ar')
ok(bf2026State(T('2026-12-02T05:00:00.000Z')) === 'after', '02/12 00:00 em NY = acabou')
ok(bf2026State(T('2027-11-27T15:00:00Z')) === 'after', 'Black Friday de 2027 = acabou (o cron do ano que vem não faz nada)')
ok(bf2026State(Number.NaN) === 'after' && !bf2026Open(Number.NaN), 'relógio inválido nunca liga a oferta')
ok(bf2026NyDate(T('2026-11-24T05:00:00Z')) === '2026-11-24' && bf2026NyDate(T('2026-11-24T04:59:59Z')) === '2026-11-23', 'fuso: a virada do dia em NY é 05:00 UTC')
const nyHour = (iso: string) => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }).format(new Date(iso)))
ok(nyHour(BF2026_STARTS_AT) === 0 && nyHour(BF2026_ENDS_AT) === 0, 'início e fim caem à meia-noite de NY (sem horário de verão no meio)')
ok(Date.parse(ANNUAL_EARLY_OFFER_ENDS_AT) <= Date.parse(BF2026_STARTS_AT), 'a oferta antecipada do anual (21/11) já acabou quando a Black Friday começa: nunca somam')

console.log('— 2. cupom só no anual')
const IN = T('2026-11-27T15:00:00Z'), BEFORE = T('2026-11-20T15:00:00Z'), AFTER = T('2026-12-03T15:00:00Z')
for (const tier of ['starter', 'basic', 'pro'] as const) {
  ok(bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: IN }), `${tier} anual na janela → cupom`)
  ok(!bf2026CheckoutEligible({ tier, isAnnual: false, nowMs: IN }), `${tier} MENSAL na janela → sem desconto de BF`)
  ok(!bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: BEFORE }) && !bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: AFTER }), `${tier} anual fora da janela → ignorado`)
  ok(!bf2026CheckoutEligible({ tier, isAnnual: true, nowMs: IN, wantsTrial: true }), `${tier} anual com teste de cartão → sem cupom`)
}
ok(!planAcceptsPromotions('business') && !bf2026CheckoutEligible({ tier: 'business', isAnnual: true, nowMs: IN }), 'Business fica fora (planAcceptsPromotions)')
ok(!bf2026CheckoutEligible({ tier: 'autopilot', isAnnual: true, nowMs: IN }) && !bf2026CheckoutEligible({ tier: 'autopilot_lite', isAnnual: true, nowMs: IN }), 'Autopilot/Lite (sem anual) ficam fora')
ok(isBf2026PromoCode('BF2026') && isBf2026PromoCode(' bf2026 ') && !isBf2026PromoCode('FIRST50') && !isBf2026PromoCode(undefined), 'reconhece o ?promo=BF2026')
ok(BF2026_PERCENT_OFF === 40 && BF2026_COUPON_ID === 'KINEO_BF2026' && BF2026_PROMO_CODE === 'BF2026', '40% · KINEO_BF2026 · BF2026')
ok(BF2026_COUPON_REDEEM_BY_SECONDS * 1000 > Date.parse(BF2026_ENDS_AT), 'o cupom na Stripe só vence depois da janela (sessão aberta às 23:50 não quebra)')

const co = rd('app/api/stripe/checkout/route.ts')
const bfAt = co.indexOf('KINEO-BLACK-FRIDAY-2026 — 40% no 1º ano de qualquer plano ANUAL')
ok(bfAt > 0, 'checkout: bloco da Black Friday presente')
ok(/const bf2026Eligible = !privatePackPromo && bf2026CheckoutEligible\(\{ tier, isAnnual, wantsTrial \}\)/.test(co), 'checkout: portão único bf2026CheckoutEligible (sem link privado)')
ok(/if \(bf2026Requested && !bf2026Eligible\) \{[\s\S]{0,300}resolvedPromo = null\n\s+promoBlocked = true/.test(co), 'checkout: ?promo=BF2026 fora do portão é ignorado com segurança (promoBlocked, preço cheio)')
ok(/sessionParams\.discounts = \[\{ coupon: BF2026_COUPON_ID \}\]/.test(co), 'checkout: o cupom entra direto por `discounts` (sem promotion code)')
ok(!/promotionCodes\.create\(\{[^}]*BF2026/.test(co) && !/code: 'BF2026'/.test(co), 'checkout: nenhum promotion code BF2026 é criado (ninguém o digita no campo manual)')
ok(/coupons\.create\(\{\n\s+id: BF2026_COUPON_ID,\n\s+percent_off: BF2026_PERCENT_OFF,\n\s+duration: 'once',\n\s+redeem_by: BF2026_COUPON_REDEEM_BY_SECONDS,/.test(co), "checkout: cupom auto-provisionado 40% 'once' (a 1ª fatura anual) com redeem_by")
ok(/coupon!\.percent_off === BF2026_PERCENT_OFF && coupon!\.duration === 'once'/.test(co), 'checkout: cupom existente só vale se for exatamente 40% once')
ok(/else if \(bf2026Requested\) \{[\s\S]{0,400}You have not been charged/.test(co), 'checkout: promessa clicada e cupom não confirmado → para com aviso, nunca cobra cheio calado')
const genericAt = co.indexOf('if (!discountApplied && requestedPromo && !promoBlocked) { // KINEO-FIRST50-2026-08-18: gate')
const introAt = co.indexOf('// KINEO-INTRO-MONTH-2026-07-13 — desconto de 1º mês.')
ok(bfAt > 0 && introAt > bfAt && genericAt > bfAt, 'checkout: a Black Friday decide antes do intro e do bloco genérico de ?promo= (nunca empilha)')
ok(/amount: bf2026PriceMinor\(chargeAmount\)/.test(co), 'checkout: a volta do sucesso leva o valor cobrado com desconto')
ok(/if \(bf2026Applied\) \{\n\s+await recordCheckoutEvent\(\n\s+BF2026_EVENTS\.checkoutStarted,/.test(co) && co.indexOf('BF2026_EVENTS.checkoutStarted,') > co.indexOf("    'checkout_started',\n    user.id,"), 'checkout: bf2026_checkout_started só depois da sessão com cupom existir')
ok(/const bf2026GuestNeedsAccount = guestFallback === null && !privatePackPromo && bf2026CheckoutEligible\(\{ tier, isAnnual, wantsTrial \}\)/.test(co) && co.includes('if (guestFallback === null && !bf2026GuestNeedsAccount) {'), 'checkout: sem conta, o anual da janela vai ao cadastro (não vira convidado a preço cheio)')
ok(co.includes('      promoRequested: rawPromo.length > 0 && !welcomeYieldedToPartner,\n'), 'checkout: a régua do convidado segue byte a byte (guardiões da compra sem login)')
ok(/name === 'bf2026_checkout_started'/.test(co), 'checkout: o evento da BF tem id determinístico por sessão (sem contagem dupla)')

console.log('— 3. mensal sem desconto e brecha do cupom manual fechada')
for (const tier of ['starter', 'basic', 'pro', 'business', 'autopilot']) for (const isAnnual of [false, true]) {
  ok(guestSubscriptionAcceptsManualPromotions(tier, isAnnual) === subscriptionAcceptsManualPromotions(tier, isAnnual), `campo manual: convidado = logado (${tier}, ${isAnnual ? 'anual' : 'mensal'})`)
}
const gBase = {
  appUrl: 'https://www.usekineo.com', tier: 'basic', billing: 'monthly', interval: 'month', unitAmount: TIER_PRICES.basic.usd, listCurrency: 'usd', region: 'standard', chargeCurrency: 'usd', chargeAmount: TIER_PRICES.basic.usd,
  settlementReason: 'default', ipCountry: 'US', planName: 'Kineo — Creator', lineItemDescription: 'x', imageUrl: 'https://x/i.png', planCredits: TIER_CREDITS.basic, introRequested: false,
  intentCampaign: null, valueContext: { version: 'v', variant: 'standard_result_count', outputCount: 3, submitMessage: 'm' }, paymentGuidanceVersion: 'g', visualProofVersion: 'p',
  windowHours: 24, windowVersion: 'w', expiresAt: 1, nonceHash: 'a'.repeat(64), affiliateCode: null, affiliateClickId: null, rewardfulReferral: null, autopilotPriceId: null,
} as unknown as Parameters<typeof buildGuestSubscriptionSessionParams>[0]
const g = (o: Record<string, unknown>) => buildGuestSubscriptionSessionParams({ ...gBase, ...o } as typeof gBase).params
const closed = (p: ReturnType<typeof g>) => !('allow_promotion_codes' in p) && p.after_expiration?.recovery?.allow_promotion_codes === false
ok(closed(g({ billing: 'annual', interval: 'year' })), 'convidado Creator ANUAL: sem campo manual (FIRST50/COMEBACK50 não entram), nem na recuperação')
ok(closed(g({ tier: 'pro', billing: 'annual', interval: 'year' })), 'convidado Studio ANUAL: sem campo manual')
ok(closed(g({ tier: 'starter' })) && closed(g({ tier: 'starter', billing: 'annual', interval: 'year' })), 'convidado Starter (mensal e anual): sem campo manual')
ok(closed(g({ tier: 'business' })), 'convidado Business: sem campo manual (como antes)')
const open = g({})
ok(open.allow_promotion_codes === true && open.after_expiration?.recovery?.allow_promotion_codes === true && !('discounts' in open), 'convidado Creator MENSAL: campo manual segue aberto (como hoje)')
ok(g({ tier: 'pro' }).allow_promotion_codes === true, 'convidado Studio MENSAL: campo manual segue aberto')
ok(/if \(!discountApplied && subscriptionAcceptsManualPromotions\(tier, isAnnual\)\) \{\n\s+sessionParams\.allow_promotion_codes = true/.test(co), 'logado: o campo manual continua só no Creator/Studio mensal')

console.log('— 4. preços lidos da fonte')
ok(bf2026PricesMatchTable(), 'getAnnualPrice = ANNUAL_PRICES nos três planos')
const rows = bf2026PriceRows()
ok(rows.length === 3 && rows.map((r) => r.tier).join() === 'starter,basic,pro', 'três linhas: Starter, Creator, Studio')
for (const r of rows) {
  ok(r.annualMinor === getAnnualPrice(r.tier, 'usd') && r.twelveMonthlyMinor === TIER_PRICES[r.tier].usd * 12 && r.credits === TIER_CREDITS[r.tier], `${r.name}: anual, 12 mensais e créditos da fonte única`)
  ok(r.bfMinor === r.annualMinor - Math.round(r.annualMinor * 0.4) && r.savedMinor + r.bfMinor === r.annualMinor, `${r.name}: 1º ano = anual − 40% (arredondado como a Stripe)`)
  ok(r.bfMinor < r.annualMinor && r.bfMinor < ANNUAL_PRICES[r.tier].usd, `${r.name}: preço da BF abaixo do anual de tabela`)
  ok(r.name === VALOR_TIER_NAMES[r.tier] && BF2026_TIER_NAMES[r.tier] === r.name, `${r.name}: nome igual ao da régua do checkout`)
}
ok(bf2026DiscountMinor(0) === 0 && bf2026PriceMinor(-5) === 0 && bf2026DiscountMinor(12345) === 4938, 'aritmética do desconto (inválido = 0; meio centavo arredonda)')
const page = rd('app/black-friday/page.tsx')
const strip = (s: string) => s.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
ok(!/\$\s?\d/.test(strip(page)) && !/\b\d{2,3}\.\d{2}\b/.test(strip(page)), 'página: nenhum preço digitado')
ok(page.includes('bf2026PriceRows()') && page.includes('bf2026Usd(r.annualMinor)') && page.includes('bf2026Usd(r.bfMinor)'), 'página: antes/depois lidos de bf2026PriceRows')
ok(page.includes('ANNUAL_REFUND_POLICY') && page.includes('CHECKOUT_CURRENCY_DISCLOSURE'), 'página: garantia e moeda pelas frases únicas da casa')
ok(page.includes("export const dynamic = 'force-dynamic'") && page.includes('bf2026State(nowMs)'), 'página: estado pelo relógio do servidor a cada pedido')
ok(page.includes("state === 'open' ?") && page.includes('bf2026CheckoutHref(r.tier, \'page\')') && page.includes('Available Nov 24'), 'página: CTA do checkout só no ar; antes, só a data')
ok(page.includes('Black Friday has ended'), 'página: depois da janela, sem oferta (só os planos de sempre)')
ok(bf2026CheckoutHref('basic') === '/api/stripe/checkout?tier=basic&billing=annual&promo=BF2026&intent_campaign=bf2026_page', 'CTA abre o checkout ANUAL com o ?promo=BF2026')
const cd = bf2026Countdown(BF2026_ENDS_AT, T('2026-11-30T05:00:00Z'))
ok(cd.days === 2 && cd.hours === 0 && cd.minutes === 0 && bf2026Countdown(BF2026_ENDS_AT, AFTER).totalMs === 0, 'contagem regressiva real até o fim (e para em zero)')
const countdown = rd('components/BlackFridayCountdown.tsx')
ok(countdown.includes('serverNowMs + elapsed') && countdown.includes('router.refresh()'), 'contagem: relógio do servidor + tempo decorrido; vira a página no servidor ao zerar')

console.log('— 5. e-mail')
ok(bf2026SendDecision({ nowMs: BEFORE }).ok === false && (bf2026SendDecision({ nowMs: BEFORE }) as { reason: string }).reason === 'outside_window', 'antes da janela: recusa (outside_window)')
ok((bf2026SendDecision({ nowMs: AFTER, requestedWave: 'cyber' }) as { reason: string }).reason === 'outside_window', 'depois da janela: recusa mesmo com ?wave=')
ok((bf2026SendDecision({ nowMs: T('2026-11-01T15:00:00Z'), requestedWave: 'bf' }) as { reason: string }).reason === 'outside_window', 'hoje (01/11) com ?wave=bf: recusa')
ok((bf2026SendDecision({ nowMs: T('2026-11-25T15:00:00Z') }) as { reason: string }).reason === 'not_a_send_day', 'na janela, dia comum, sem ?wave= (cron): nada')
const d27 = bf2026SendDecision({ nowMs: T('2026-11-27T15:00:00Z') }), d30 = bf2026SendDecision({ nowMs: T('2026-11-30T15:00:00Z') })
ok(d27.ok && d27.wave === 'bf' && d30.ok && d30.wave === 'cyber', 'cron: 27/11 = Black Friday, 30/11 = Cyber Monday')
ok(bf2026WaveForDate(T('2026-11-28T04:30:00Z')) === 'bf' && bf2026WaveForDate(T('2026-11-27T04:30:00Z')) === null, 'onda pela data de NY (23:30 de 27/11 em NY ainda é BF; 23:30 de 26/11 não)')
const manual = bf2026SendDecision({ nowMs: T('2026-11-25T15:00:00Z'), requestedWave: 'cyber' })
ok(manual.ok && manual.wave === 'cyber' && (bf2026SendDecision({ nowMs: IN, requestedWave: 'xmas' }) as { reason: string }).reason === 'invalid_wave', 'link do fundador repõe uma onda dentro da janela; onda inventada = recusa')
const ctx = { isInternal: (e: string) => e.endsWith('@kineo-internal.test'), neverEmail: ['den.higgins'], annualBuyer: false, alreadyGotWave: false }
ok(bf2026EmailSkipReason({ email: 'ana@gmail.com', plan: 'free' }, ctx) === null, 'free com e-mail válido recebe')
ok(bf2026EmailSkipReason({ email: 'ex@gmail.com', plan: 'free', email_opted_out: false }, ctx) === null, 'ex-assinante (plano free) recebe')
ok(bf2026EmailSkipReason({ email: 'x@gmail.com', plan: 'free', email_opted_out: true }, ctx) === 'opted_out', 'saiu da lista = fora')
ok(bf2026EmailSkipReason({ email: 'josephsskaf@gmail.com' }, ctx) === 'internal' && bf2026EmailSkipReason({ email: 'qa@kineo-internal.test' }, ctx) === 'internal', 'conta da casa = fora')
ok(bf2026EmailSkipReason({ email: 'den.higgins@x.com' }, ctx) === 'blocked' && bf2026EmailSkipReason({ email: 'a@mailinator.com' }, ctx) === 'blocked', 'nunca-escrever e descartável = bloqueado')
ok(['basic', 'pro', 'starter', 'business', 'autopilot', 'starter_trial'].every((plan) => bf2026EmailSkipReason({ email: 'p@gmail.com', plan }, ctx) === 'paying_plan'), 'quem já assina (inclusive anual) = fora')
ok(bf2026EmailSkipReason({ email: 'b@gmail.com', plan: 'free' }, { ...ctx, annualBuyer: true }) === 'annual_buyer', 'Cyber Monday: quem comprou o anual = fora')
ok(bf2026EmailSkipReason({ email: 'c@gmail.com', plan: 'free' }, { ...ctx, alreadyGotWave: true }) === 'already_got_wave', 'dedupe: quem já recebeu a onda = fora')
ok(bf2026EmailSkipReason({ email: 'not-an-email' }, ctx) === 'bad_email', 'e-mail inválido = fora')
ok(bf2026ClaimSeed('u1', 'bf') === bf2026ClaimSeed('u1', 'bf') && bf2026ClaimSeed('u1', 'bf') !== bf2026ClaimSeed('u1', 'cyber') && bf2026ClaimSeed('u1', 'bf') !== bf2026ClaimSeed('u2', 'bf'), 'reserva determinística: 1 por pessoa por onda')
ok(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(bf2026UuidFromHex('0123456789abcdef0123456789abcdef0123')), 'id da reserva vira uuid')
ok(bf2026EmailUrl('bf') === 'https://www.usekineo.com/black-friday?utm_source=email&utm_medium=email&utm_campaign=bf2026&utm_content=bf', 'link com utm_source=email e utm_campaign=bf2026')
const body = bf2026EmailBody('bf', rows, { text: '\n--footer', html: '<p>footer</p>' })
ok(rows.every((r) => body.text.includes(r.name)) && body.text.includes(bf2026EmailUrl('bf')) && body.html.includes(bf2026EmailUrl('bf')), 'corpo: os três planos e o link')
ok(body.text.includes(`within ${ANNUAL_REFUND_DAYS} days`) && body.text.endsWith('--footer') && body.html.endsWith('<p>footer</p>'), 'corpo: garantia da constante e rodapé de descadastro')
ok(bf2026Subject('bf').includes('Black Friday') && bf2026Subject('cyber').includes('Cyber Monday') && bf2026Subject('bf').length <= 60, 'assuntos curtos, um por onda')
const lib = rd('lib/billing/blackFriday2026.ts')
const emailFns = lib.slice(lib.indexOf('export function bf2026EmailBody'))
ok(!/\$\s?\d/.test(emailFns), 'carta: nenhum preço digitado (tudo de bf2026PriceRows)')
const route = rd('app/api/admin/send-black-friday-2026/route.ts')
ok(/const confirm = req\.nextUrl\.searchParams\.get\('confirm'\) === 'SEND'/.test(route), 'rota: dry-run por padrão (só envia com ?confirm=SEND)')
const decAt = route.indexOf('const decision = bf2026SendDecision({ nowMs, requestedWave })')
ok(decAt > 0 && decAt < route.indexOf("readAll(() => admin\n      .from('profiles')"), 'rota: a trava da data vem antes de qualquer leitura')
ok(/if \(confirm && !decision\.ok\) \{[\s\S]{0,400}status: 409/.test(route), 'rota: ?confirm=SEND fora da janela = 409, nada enviado')
ok(route.indexOf('if (!confirm) {') > 0 && route.indexOf('if (!confirm) {') < route.indexOf('https://api.resend.com/emails'), 'rota: o dry-run devolve antes de qualquer envio')
ok(route.indexOf('name: BF2026_EMAIL_CLAIM, path: ROUTE') < route.indexOf('https://api.resend.com/emails') && route.includes("if (reserva.error) { pulados++; resultados.push({ email: a.email, outcome: 'skipped_claim_exists' }); continue }"), 'rota: reserva ANTES do envio; reserva existente = pula (dedupe entre corridas)')
ok(route.includes('if (m.wave === wave) jaRecebeu.add('), 'rota: dedupe pela onda pedida')
ok(route.includes('loadLifecycleSuppression') && route.includes("from '@/lib/email/quota'") && route.includes("'bf2026_emailed'"), 'rota: trava de 24 h, cota diária e carimbo literal (visível para as outras campanhas)')
ok(route.includes('inteiro(req.nextUrl.searchParams.get(\'limit\'), BF2026_EMAIL_BATCH_DEFAULT, BF2026_EMAIL_BATCH_MAX)') && BF2026_EMAIL_BATCH_MAX <= 250, 'rota: teto de envios por execução')
ok(route.includes("email_opted_out") && route.includes('isInternalEmail') && route.includes('WINBACK_NEVER'), 'rota: opt-out, contas internas e bloqueados')
ok(route.includes('function autorizadoPorCron') && route.includes("ADMIN_EMAILS.has(adminEmail)) && !porCron) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })"), 'rota: só admin logado ou o cron com CRON_SECRET')
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8')) as { crons: Array<{ path: string; schedule: string }> }
const bfCrons = vercel.crons.filter((c) => c.path.startsWith('/api/admin/send-black-friday-2026?'))
ok(bfCrons.length === 2 && bfCrons.every((c) => c.path.includes('confirm=SEND')), 'vercel.json: 2 agendamentos com ?confirm=SEND')
ok(bfCrons.some((c) => c.schedule === '0 15 27 11 *') && bfCrons.some((c) => c.schedule === '0 15 30 11 *'), 'vercel.json: 27/11 e 30/11 às 15:00 UTC (10:00 ET)')
ok(bfCrons.every((c) => !c.path.includes('wave=')), 'vercel.json: o cron não força a onda (quem decide é a data de NY)')
ok(new Set(vercel.crons.map((c) => c.path)).size === vercel.crons.length, 'vercel.json: nenhum caminho de cron repetido')

console.log('— 6. eventos, faixa, selo e pares')
ok(BF2026_EVENTS.bannerShown === 'bf2026_banner_shown' && BF2026_EVENTS.bannerClicked === 'bf2026_banner_clicked' && BF2026_EVENTS.pageView === 'bf2026_page_view' && BF2026_EVENTS.checkoutStarted === 'bf2026_checkout_started', 'nomes dos eventos')
const ev = rd('app/api/events/route.ts')
ok(["'bf2026_checkout_started'", "'bf2026_email_claimed'", "'bf2026_emailed'"].every((n) => ev.slice(0, ev.indexOf('])') + 2).includes(n)), 'SERVER_ONLY: checkout da BF, reserva e carimbo da carta (o navegador não forja)')
// A trava de 24 h vê a carta pelo LEDGER (recordResendResponse grava email_send_log com user_id, que
// loadLifecycleSuppression lê): lib/lifecycle/emailEvents.ts não é tocado (camada KINEO-LEVA-2410 confere por hash).
ok(route.includes("recordResendResponse({ kind: BF2026_CAMPAIGN, priority: 'growth', userId: a.id, res, admin })") && rd('lib/email/quota.ts').includes("from('email_send_log').insert") && rd('lib/lifecycle/suppression.ts').includes("from('email_send_log')"), 'supressão: cada envio entra no ledger email_send_log, que a trava de 24 h lê')
ok(!(LIFECYCLE_EMAIL_EVENT_NAMES as readonly string[]).includes(BF2026_EMAIL_CLAIM), 'supressão: a reserva nunca conta como envio')
// O webhook NÃO é tocado (camada desfaz-compra-avulsa-2410 confere o arquivo por hash): a compra da BF se reconhece pela
// sessão — bf2026_checkout_started.stripe_session_id = payment_success.stripe_session_id — e a sessão/assinatura levam
// metadata promo_campaign=bf2026 na Stripe.
ok(/Object\.assign\(sessionParams\.metadata!, \{ promo_campaign: BF2026_CAMPAIGN, public_promo_source: BF2026_PROMO_SOURCE \}\)/.test(co) && /Object\.assign\(sessionParams\.subscription_data!\.metadata!, \{ promo_campaign: BF2026_CAMPAIGN \}\)/.test(co) && BF2026_CAMPAIGN === 'bf2026', 'sessão e assinatura da Stripe carimbadas promo_campaign=bf2026')
ok(!rd('app/api/stripe/webhook/route.ts').includes('KINEO-BLACK-FRIDAY-2026'), 'webhook intocado')
ok(!bf2026WorthAsking(T('2026-11-01T12:00:00Z')) && bf2026WorthAsking(IN) && !bf2026WorthAsking(T('2026-12-10T00:00:00Z')), 'faixa: o navegador nem pergunta fora de época')
ok(bf2026BannerHidden('/black-friday', 'site') && bf2026BannerHidden('/login', 'site') && bf2026BannerHidden('/admin/people', 'app') && bf2026BannerHidden('/terms', 'site'), 'faixa: escondida na própria página, login, admin e páginas não comerciais')
ok(bf2026BannerHidden('/studio', 'site') && !bf2026BannerHidden('/studio', 'app') && !bf2026BannerHidden('/', 'site') && !bf2026BannerHidden('/pricing', 'site'), 'faixa: no app só a do DashboardShell; no site, home e /pricing')
const dashDirs = fs.readdirSync('app/(dashboard)', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `/${d.name}`)
const missing = dashDirs.filter((d) => !(BF2026_APP_ROUTE_PREFIXES as readonly string[]).includes(d))
ok(missing.length === 0, `faixa: toda rota de app/(dashboard) está na lista do app${missing.length ? ` (faltam ${missing.join(', ')})` : ''}`)
const banner = rd('components/BlackFridayBanner.tsx')
ok(banner.includes("fetch('/api/offers/bf2026'") && banner.includes("setOpen(s === 'open')"), 'faixa/selo: pintam só com o servidor dizendo open')
ok(banner.includes('BF2026_EVENTS.bannerShown') && banner.includes('BF2026_EVENTS.bannerClicked'), 'faixa/selo: shown e clicked')
ok(rd('components/BlackFridayCountdown.tsx').includes('BF2026_EVENTS.pageView'), 'página: page_view')
const offerRoute = rd('app/api/offers/bf2026/route.ts')
ok(offerRoute.includes('bf2026State(nowMs)') && !offerRoute.includes('supabase'), 'rota de estado: só relógio do servidor, sem banco')
const provider = rd('components/FreeTierOfferProvider.tsx'), shell = rd('app/(dashboard)/DashboardShell.tsx'), pricing = rd('app/pricing/PricingClient.tsx')
ok(provider.includes('<FreeTierOfferContext.Provider value={offer}><BlackFridayBanner />{children}</FreeTierOfferContext.Provider>') && rd('app/layout.tsx').includes('<FreeTierOfferProvider offer={OFFER}><SourceCapture />'), 'faixa do site no topo do <body> (pelo provider que envolve o layout raiz)')
ok(!rd('app/layout.tsx').includes('BlackFriday'), 'app/layout.tsx intocado (camadas desfaz-* conferem a linha do <body>)')
ok(shell.includes('<BlackFridayBanner placement="app" />'), 'DashboardShell: faixa do app dentro da coluna (o shell é h-screen)')
ok(pricing.includes("{billing === 'annual' ? <Bf2026PricingBadge /> : null}"), '/pricing: selo só na aba anual')
ok(!rd('components/Sidebar.tsx').includes('black-friday') && !rd('components/MobileNav.tsx').includes('black-friday'), 'pares de navegação (Sidebar/MobileNav) sem item novo: a faixa não é menu')
ok(banner.includes(`{BF2026_PERCENT_OFF}% off your first year of any annual plan`) && !/\$\s?\d/.test(banner), 'faixa: copy honesta, sem preço digitado')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
