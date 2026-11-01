// KINEO-AVULSO-290-2CHECKOUT-0111 — guardião da saída de US$ 2,90 para quem travou no checkout (fundador 01/11 "vai tudo, avulso 2,90").
// Prova: (1) a elegibilidade nova (pagou→não; usou→não; sem checkout anterior→não; 1 checkout sem pagar→sim), crua e pelo
// leitor do banco com um cliente falso; (2) o banner antigo das 24 h continua desligado; (3) a superfície e o caixa usam o SKU
// starter290 e a MESMA regra; (4) a copy lê os segundos de PACK_ADVERTISED_SECONDS e o preço da linha que a Stripe cobra;
// (5) a margem: o crédito paga o filme anunciado e o invariante de preço segue verde.
// Rodar: npx tsx scripts/test-avulso-290-resgate-0111.mts
import fs from 'node:fs'
import {
  decideOffer290Rescue, offer290RescueEligibility, offer290RescueCopy, offer290RescuePriceLabel,
  OFFER290_RESCUE_SKU, OFFER290_RESCUE_CHECKOUT_HREF, OFFER290_RESCUE_SHOWN_EVENT, OFFER290_RESCUE_CLICKED_EVENT, OFFER290_RESCUE_CHECKOUT_EVENT,
} from '../lib/offers/offer290Rescue'
import { OFFER_290_ENABLED, OFFER_290_RESGATE_ENABLED } from '../lib/flags'
import { PACK_ADVERTISED_SECONDS, PACK_CREDITS, PACK290_PRICE_MINOR, checkPricingInvariants, netAfterStripeUsd } from '../lib/checkoutPricing'
import { creditCostForDuration } from '../lib/credits/engineCost'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

console.log('— interruptores')
ok(OFFER_290_RESGATE_ENABLED === true, 'OFFER_290_RESGATE_ENABLED está ligado')
ok(OFFER_290_ENABLED === false, 'OFFER_290_ENABLED (banner antigo das 24 h) continua desligado')

console.log('— elegibilidade pura')
const base = { enabled: true, userId: 'u1', hasPaid: false, plan: 'free', offer290Used: false, paymentSuccessCount: 0, checkoutStartedCount: 1 }
ok(decideOffer290Rescue(base).eligible === true, '1 checkout sem pagar → elegível')
ok(decideOffer290Rescue({ ...base, checkoutStartedCount: 5 }).eligible === true, '5 checkouts sem pagar → elegível')
ok(decideOffer290Rescue({ ...base, hasPaid: true }).reason === 'paid', 'has_paid → não (paid)')
ok(decideOffer290Rescue({ ...base, paymentSuccessCount: 1 }).reason === 'paid', 'payment_success no histórico → não (paid)')
ok(decideOffer290Rescue({ ...base, plan: 'basic' }).reason === 'paid', 'plano pago (basic) sem has_paid → não (paid)')
ok(decideOffer290Rescue({ ...base, plan: 'starter_trial' }).reason === 'paid', 'teste pago (starter_trial) → não (paid)')
ok(decideOffer290Rescue({ ...base, offer290Used: true }).reason === 'used', 'offer290_used → não (used)')
ok(decideOffer290Rescue({ ...base, checkoutStartedCount: 0 }).reason === 'no_checkout_attempt', 'sem checkout anterior → não')
ok(decideOffer290Rescue({ ...base, userId: null }).reason === 'no_user', 'sem conta → não')
ok(decideOffer290Rescue({ ...base, enabled: false }).reason === 'disabled', 'interruptor desligado → não')

console.log('— leitor do banco (cliente falso)')
type Rows = { profile: Record<string, unknown> | null; paid: number; starts: number; err?: boolean }
function fakeAdmin(rows: Rows) {
  const asked: Array<{ table: string; filters: Array<[string, unknown]> }> = []
  return {
    asked,
    from(table: string) {
      const filters: Array<[string, unknown]> = []
      asked.push({ table, filters })
      const q: any = {
        select() { return q },
        eq(col: string, val: unknown) { filters.push([col, val]); return q },
        limit() {
          const name = filters.find(([c]) => c === 'name')?.[1]
          const n = name === 'payment_success' ? rows.paid : rows.starts
          return Promise.resolve(rows.err ? { data: null, error: { message: 'x' } } : { data: Array.from({ length: n }, (_, i) => ({ id: i })), error: null })
        },
        maybeSingle() { return Promise.resolve(rows.err ? { data: null, error: { message: 'x' } } : { data: rows.profile, error: null }) },
      }
      return q
    },
  }
}
const freeProfile = { has_paid: false, plan: 'free', offer290_used: false }
{
  const a = fakeAdmin({ profile: freeProfile, paid: 0, starts: 1 })
  const e = await offer290RescueEligibility(a as any, 'u1')
  ok(e.eligible && e.checkoutStarts === 1, 'banco: 1 checkout_started sem pagar → elegível')
  const ev = a.asked.find((x) => x.table === 'events' && x.filters.some(([c, v]) => c === 'name' && v === OFFER290_RESCUE_CHECKOUT_EVENT))
  ok(ev && ev.filters.some(([c, v]) => c === 'user_id' && v === 'u1'), 'banco: conta checkout_started PELO user_id')
}
ok((await offer290RescueEligibility(fakeAdmin({ profile: { ...freeProfile, has_paid: true }, paid: 0, starts: 3 }) as any, 'u1')).reason === 'paid', 'banco: pagou → não')
ok((await offer290RescueEligibility(fakeAdmin({ profile: { ...freeProfile, offer290_used: true }, paid: 0, starts: 3 }) as any, 'u1')).reason === 'used', 'banco: usou → não')
ok((await offer290RescueEligibility(fakeAdmin({ profile: freeProfile, paid: 0, starts: 0 }) as any, 'u1')).reason === 'no_checkout_attempt', 'banco: sem checkout anterior → não')
ok((await offer290RescueEligibility(fakeAdmin({ profile: freeProfile, paid: 1, starts: 2 }) as any, 'u1')).reason === 'paid', 'banco: payment_success → não')
ok((await offer290RescueEligibility(fakeAdmin({ profile: freeProfile, paid: 0, starts: 2, err: true }) as any, 'u1')).eligible === false, 'banco: leitura com erro → sem oferta (fail closed)')
ok((await offer290RescueEligibility(fakeAdmin({ profile: null, paid: 0, starts: 2 }) as any, 'u1')).eligible === false, 'banco: perfil ausente → sem oferta')

console.log('— copy e SKU')
const copy = offer290RescueCopy()
const secs = PACK_ADVERTISED_SECONDS.starter290
ok(OFFER290_RESCUE_SKU === 'starter290' && OFFER290_RESCUE_CHECKOUT_HREF === '/api/stripe/checkout?pack=starter290', 'o botão leva ao SKU starter290')
ok(offer290RescuePriceLabel() === `$${(PACK290_PRICE_MINOR.usd / 100).toFixed(2)}` && offer290RescuePriceLabel() === '$2.90', 'preço da linha que a Stripe cobra ($2.90)')
ok(copy.headline === 'Just want one film?' && copy.body.includes(`${secs}-second`) && /no subscription/i.test(copy.body), `copy: "Just want one film?" + ${secs}-second + no subscription`)
const lib = rd('lib/offers/offer290Rescue.ts')
ok(!/['"`][^'"`]*\b35-second/.test(lib), 'copy não traz "35-second" literal (lê PACK_ADVERTISED_SECONDS)')
ok(OFFER290_RESCUE_SHOWN_EVENT === 'offer290_rescue_shown' && OFFER290_RESCUE_CLICKED_EVENT === 'offer290_rescue_clicked', 'eventos offer290_rescue_shown / offer290_rescue_clicked')

console.log('— margem')
const filmCost = creditCostForDuration('cinematic_ai', true, secs)
ok(PACK_CREDITS.starter290 >= filmCost, `créditos (${PACK_CREDITS.starter290}) pagam o filme anunciado (${filmCost} cr)`)
const net = netAfterStripeUsd(PACK290_PRICE_MINOR.usd / 100)
const filmUsd = filmCost * (3.3 / creditCostForDuration('cinematic_ai', true, 60)) // custo de fornecedor do Seedance (US$ 3,30 por 60 s)
ok(net - filmUsd > 0, `filme anunciado dá lucro (líquido $${net.toFixed(2)} − custo ≈ $${filmUsd.toFixed(2)})`)
ok(checkPricingInvariants().length === 0, 'checkPricingInvariants() verde')

console.log('— caixa (checkout) e superfícies')
const route = rd('app/api/stripe/checkout/route.ts')
const fn = route.slice(route.indexOf('async function buildStarter290AndRedirect'), route.indexOf('// ─── KINEO-TOPUP-2026-07-06'))
ok(fn.length > 500, 'achou buildStarter290AndRedirect')
ok(/if \(!OFFER_290_ENABLED && !OFFER_290_RESGATE_ENABLED\)/.test(fn), 'SKU segue 410 com os DOIS interruptores desligados')
ok(/offer290RescueEligibility\(/.test(fn) && /if \(!OFFER_290_ENABLED\)/.test(fn), 'com o banner antigo desligado, o caixa exige a regra do resgate')
ok(fn.indexOf('profile?.offer290_used === true || profile?.has_paid === true') > -1 && fn.indexOf('profile?.offer290_used === true || profile?.has_paid === true') < fn.indexOf('offer290RescueEligibility('), 'guard antigo (1 por conta / já pagou) continua ANTES da regra nova')
ok(fn.indexOf('offer290RescueEligibility(') < fn.indexOf('stripe.checkout.sessions.create'), 'a regra roda antes de criar a sessão Stripe')
const card = rd('components/Offer290RescueCard.tsx')
ok(/\/api\/offers\/offer290-rescue/.test(card) && /OFFER290_RESCUE_CHECKOUT_HREF/.test(card) && /OFFER290_RESCUE_SKU/.test(card), 'card pergunta ao servidor e lança o starter290')
const apiRoute = rd('app/api/offers/offer290-rescue/route.ts')
ok(/offer290RescueEligibility\(admin, user\.id\)/.test(apiRoute), 'rota da tela usa a MESMA função do caixa')
const cancelled = rd('app/checkout/cancelled/page.tsx')
ok(/<Offer290RescueCard surface="cancelled" \/>/.test(cancelled), '/checkout/cancelled (cancel_url da assinatura) mostra o card')
ok(/cancel_url: `\$\{appUrl\}\/checkout\/cancelled\?/.test(route), 'o cancel_url da assinatura é mesmo /checkout/cancelled')
const pricing = rd('app/pricing/PricingClient.tsx')
ok(/<Offer290RescueCard surface="pricing" \/>/.test(pricing), '/pricing (2º checkout) mostra o card')

console.log('— banner antigo das 24 h')
const old = rd('app/(dashboard)/generate/Offer290Banner.tsx')
ok(/const enabled = OFFER_290_ENABLED/.test(old) && !/OFFER_290_RESGATE_ENABLED|offer290Rescue/.test(old), 'Offer290Banner segue preso ao OFFER_290_ENABLED (desligado), sem a regra nova')
const credits = rd('app/api/credits/route.ts')
ok(/offer290Enabled: OFFER_290_ENABLED,/.test(credits), '/api/credits continua anunciando offer290Enabled = flag antiga')

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
