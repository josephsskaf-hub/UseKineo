// KINEO-GARANTIA-ASSINATURA-0111 — guardião da garantia do 1º filme ("refazemos ou devolvemos") no checkout de ASSINATURA e
// no /pricing, perto do botão de assinar. Fundador, 01/11: "vai tudo".
//
// O QUE A RODADA ACHOU (e por que este commit é só guardião): a frase já tinha sido levada à assinatura MENSAL em 28/10
// (KINEO-AVULSO-GARANTIA-2810) — ela fecha checkoutValueContext.submitMessage (lib/growth/checkoutValueContext.ts), que é o
// custom_text.submit da sessão mode 'subscription' do caminho logado (app/api/stripe/checkout/route.ts) e do convidado
// (lib/stripe/guestCheckout.ts), e aparece sob o botão de cada cartão do /pricing (components/pricing/PlanValueStage.tsx).
// Faltava a PROVA de ponta a ponta: o guardião de 28/10 conferia a política isolada, não que a sessão de assinatura
// realmente a carrega. Este roda o construtor REAL da sessão do convidado e lê o objeto da sessão logada.
//
// Escopo que o suporte já honra (não ampliado): a promessa é a MESMA do avulso, honrada à mão quando a pessoa responde ao
// recibo. O ANUAL fica de fora de propósito — a política dele diz "integral em 14 dias, depois nenhum reembolso"
// (KINEO-ANUAL-40OFF-2026-10-05); o kids autopilot (lib/stripe/kidsVendaCheckout.ts) é outro produto e também fica de fora.
//
// Rodar: npx tsx scripts/test-garantia-assinatura-0111.mts
import fs from 'node:fs'
import { FIRST_FILM_GUARANTEE } from '../lib/growth/firstFilmGuarantee'
import { buildCheckoutValueContext } from '../lib/growth/checkoutValueContext'
import { buildGuestSubscriptionSessionParams, type GuestSessionInput } from '../lib/stripe/guestCheckout'
import { TIER_CREDITS as PLAN_CREDITS } from '../lib/checkoutPricing'
import { TRIAL_BALANCE_BRIDGE_VERSION } from '../lib/growth/trialBalanceBridge'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const FRASE = FIRST_FILM_GUARANTEE.en
const STRIPE_SUBMIT_MAX = 1200 // limite documentado do custom_text.submit.message da Stripe Checkout

console.log('1) a política do botão de pagar, em todas as variantes mensais')
const tiers = ['starter', 'basic', 'pro'] as const
for (const tier of tiers) {
  const credits = (PLAN_CREDITS as Record<string, number>)[tier]
  for (const kling4Promo of [false, true]) {
    const v = buildCheckoutValueContext({ billing: 'monthly', credits, intentCampaign: undefined, tier, kling4Promo, kling4Paid: kling4Promo })
    ok(v.submitMessage.includes(FRASE), `mensal ${tier}${kling4Promo ? ' + promo Kling 4' : ''}: a frase da fonte única está no texto do botão`)
    ok(v.submitMessage.length <= STRIPE_SUBMIT_MAX, `mensal ${tier}${kling4Promo ? ' + promo' : ''}: cabe no limite da Stripe (${v.submitMessage.length})`)
  }
}
const ponte = buildCheckoutValueContext({ billing: 'monthly', credits: (PLAN_CREDITS as Record<string, number>).basic, intentCampaign: TRIAL_BALANCE_BRIDGE_VERSION, tier: 'basic' })
ok(ponte.variant === 'trial_balance_seedance' && ponte.submitMessage.includes(FRASE), `variante ${ponte.variant} (ponte do saldo do trial): a frase também vai`)
const anual = buildCheckoutValueContext({ billing: 'annual', credits: (PLAN_CREDITS as Record<string, number>).basic, intentCampaign: undefined, tier: 'basic' })
ok(!anual.submitMessage.includes(FRASE), 'anual: SEM a frase (política do anual: depois de 14 dias, nenhum reembolso)')

console.log('2) a sessão REAL de assinatura do convidado (construtor executado)')
const vc = buildCheckoutValueContext({ billing: 'monthly', credits: (PLAN_CREDITS as Record<string, number>).basic, intentCampaign: undefined, tier: 'basic' })
const input = {
  appUrl: 'https://www.usekineo.com', tier: 'basic', billing: 'monthly', interval: 'month', unitAmount: 1, listCurrency: 'usd',
  region: 'default', chargeCurrency: 'usd', chargeAmount: 1, settlementReason: 'default', ipCountry: 'US', planName: 'Creator',
  lineItemDescription: 'x', imageUrl: 'https://www.usekineo.com/x.png', planCredits: (PLAN_CREDITS as Record<string, number>).basic,
  introRequested: false, intentCampaign: null, valueContext: vc, paymentGuidanceVersion: 'v', visualProofVersion: 'v',
  windowHours: 24, windowVersion: 'v', expiresAt: 2_000_000_000, nonceHash: 'h', affiliateCode: null, affiliateClickId: null,
  rewardfulReferral: null, autopilotPriceId: null,
} as unknown as GuestSessionInput
const { params } = buildGuestSubscriptionSessionParams(input)
ok(params.mode === 'subscription', 'a sessão do convidado é mode subscription')
ok(params.custom_text?.submit?.message === vc.submitMessage, 'custom_text.submit = o texto da política (sem cópia digitada)')
ok(String(params.custom_text?.submit?.message ?? '').includes(FRASE), 'custom_text.submit carrega a frase da fonte única')

console.log('3) a sessão de assinatura do caminho logado (app/api/stripe/checkout/route.ts)')
const route = rd('app/api/stripe/checkout/route.ts')
const iSub = route.indexOf("    mode: 'subscription',\n")
const objSub = iSub > 0 ? route.slice(route.lastIndexOf('const sessionParams: Stripe.Checkout.SessionCreateParams = {', iSub), iSub + 1200) : ''
ok(iSub > 0 && /custom_text: \{\s*submit: \{\s*message: checkoutValueContext\.submitMessage,/.test(objSub), 'o objeto da sessão mode subscription nasce com custom_text.submit = checkoutValueContext.submitMessage')
ok(/const checkoutValueContext = buildCheckoutValueContext\(/.test(route), 'checkoutValueContext vem do construtor da política')
const reatrib = [...route.matchAll(/(?:sessionParams|params)\.custom_text!\.submit = \{\n\s*message: `([^`]*)`/g)].map((m) => m[1])
ok(reatrib.length >= 3, `as substituições do parceiro existem (${reatrib.length})`)
ok(reatrib.every((m) => /\$\{(?:ctx\.)?checkoutValueContext\.submitMessage\}$/.test(m)), 'toda substituição do texto (parceiro 50%) TERMINA com o texto da política — a frase não some com desconto')
const guestRoute = route.indexOf('submitMessage: ctx.checkoutValueContext.submitMessage')
ok(guestRoute > 0, 'a rota entrega ao convidado o MESMO submitMessage')

console.log('4) /pricing: perto do botão de assinar')
const stage = rd('components/pricing/PlanValueStage.tsx')
const pricing = rd('app/pricing/PricingClient.tsx')
const iBotao = stage.indexOf('className={props.selected ? \'pv-cta pv-cta-pop\' : \'pv-cta\'}')
const iFrase = stage.indexOf('data-testid="plan-first-film-guarantee">{FIRST_FILM_GUARANTEE.en}</p>')
ok(iBotao > 0 && iFrase > iBotao && iFrase < stage.indexOf('<div className="pv-sec">', iBotao), 'a frase vem logo sob o botão, dentro do bloco de compra do cartão')
ok(stage.includes("import { FIRST_FILM_GUARANTEE } from '@/lib/growth/firstFilmGuarantee'"), 'lida da fonte única')
ok(/<PlanValueCard[\s>]/.test(pricing), 'o /pricing renderiza o cartão que carrega a frase')

console.log('5) mutante: a frase some da política e o guardião pega')
const carregaFrase = (p: { custom_text?: { submit?: { message?: string } | null } | null }) => String(p.custom_text?.submit?.message ?? '').includes(FRASE)
const semFrase = { ...vc, submitMessage: vc.submitMessage.replace(FRASE, '') }
ok(semFrase.submitMessage !== vc.submitMessage, 'mutante aplicou (a política sem a frase)')
ok(carregaFrase(params) && !carregaFrase(buildGuestSubscriptionSessionParams({ ...input, valueContext: semFrase }).params), 'mutante é pego: a sessão montada com a política mutada não carrega a frase')

console.log(`\n═══ ${pass} passaram, ${fail} falharam ═══`)
process.exit(fail ? 1 : 0)
