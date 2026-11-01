// KINEO-RECARGA-PAGANTE-0111 — guardião do "pagante sem crédito recebe a oferta na hora" (fundador 01/11 "vai tudo, avulso 2,90").
// O caso: nikolmishukov (Creator, 1 crédito) abriu o /studio 4 vezes e saiu sem clicar — a parede com troca+recarga só existia
// DEPOIS do clique (no /studio/create). Prova: (1) a regra pura de quando o /studio pinta; (2) a fiação no cockpit, acima do
// Gerar, com recarga e troca (o MESMO SubscriberUpgradeNudge, que vai ao change-plan e nunca ao checkout de assinatura);
// (3) a telemetria subscriber_out_of_credits_offer_shown/clicked no cockpit (as paredes antigas seguem intactas); (4) a decisão do empurrão
// para um Creator ativo = subir ao Studio com +N créditos hoje + recarga; (5) o e-mail cap_hit é do muro grátis (não do assinante).
// Rodar: npx tsx scripts/test-recarga-pagante-0111.mts
import fs from 'node:fs'
import {
  subscriberOutOfCreditsVisible, SUBSCRIBER_OUT_OF_CREDITS_SHOWN_EVENT, SUBSCRIBER_OUT_OF_CREDITS_CLICKED_EVENT,
  SUBSCRIBER_OUT_OF_CREDITS_STUDIO_SURFACE,
} from '../lib/billing/subscriberOutOfCredits'
import { subscriberUpgradeOffer } from '../lib/billing/subscriberUpgrade'
import { TIER_CREDITS, TIER_PRICES } from '../lib/checkoutPricing'
import { canPurchaseCreditTopup } from '../lib/growth/topupEligibility'
import { creditCostForDuration } from '../lib/credits/engineCost'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

console.log('— regra pura do /studio')
const seedance60 = creditCostForDuration('cinematic_ai', true, 60)
ok(subscriberOutOfCreditsVisible({ paid: true, balance: 1, cost: seedance60, mode: 'idea' }) === true, `pagante com 1 cr e filme de ${seedance60} cr → pinta (o caso da Nikol)`)
ok(subscriberOutOfCreditsVisible({ paid: true, balance: seedance60, cost: seedance60, mode: 'idea' }) === false, 'saldo paga o filme → não pinta')
ok(subscriberOutOfCreditsVisible({ paid: false, balance: 1, cost: seedance60, mode: 'idea' }) === false, 'quem não pagou → não pinta (tem as paredes próprias)')
ok(subscriberOutOfCreditsVisible({ paid: null, balance: 1, cost: seedance60, mode: 'idea' }) === false, 'pagamento ainda não lido → não decide')
ok(subscriberOutOfCreditsVisible({ paid: true, balance: null, cost: seedance60, mode: 'idea' }) === false, 'saldo ainda não lido → não decide')
ok(subscriberOutOfCreditsVisible({ paid: true, balance: 0, cost: 0, mode: 'idea' }) === false, 'pedido grátis (custo 0) → não pinta')
ok(subscriberOutOfCreditsVisible({ paid: true, balance: 0, cost: 10, mode: 'clip' }) === false, 'clipe → não (tem a parede studio_clip_402)')

console.log('— decisão do empurrão para um Creator ativo')
const state = { subscribed: true, tier: 'basic', status: 'active' } as any
const offer = subscriberUpgradeOffer({ state, credits: TIER_CREDITS, pricesMinor: { starter: TIER_PRICES.starter.usd, basic: TIER_PRICES.basic.usd, pro: TIER_PRICES.pro.usd }, topupAllowed: canPurchaseCreditTopup('basic'), enabled: true })
ok(offer.kind === 'switch' && offer.to === 'pro' && offer.creditsToday === TIER_CREDITS.pro - TIER_CREDITS.basic, `Creator → Studio, +${TIER_CREDITS.pro - TIER_CREDITS.basic} créditos hoje (só a diferença)`)
ok(offer.kind === 'switch' && offer.topup === true, 'Creator também vê a recarga avulsa')
const studioOffer = subscriberUpgradeOffer({ state: { subscribed: true, tier: 'pro', status: 'active' } as any, credits: TIER_CREDITS, pricesMinor: { starter: TIER_PRICES.starter.usd, basic: TIER_PRICES.basic.usd, pro: TIER_PRICES.pro.usd }, topupAllowed: canPurchaseCreditTopup('pro'), enabled: true })
ok(studioOffer.kind === 'topup_only', 'Studio (topo) → só recarga')

console.log('— fiação no /studio')
const studio = rd('app/(dashboard)/studio/StudioClient.tsx')
const goIdx = studio.indexOf('<button type="button" onClick={generate}')
const nudgeIdx = studio.indexOf(`surface={SUBSCRIBER_OUT_OF_CREDITS_STUDIO_SURFACE}`)
ok(goIdx > 0 && nudgeIdx > 0 && nudgeIdx < goIdx, 'empurrão do assinante mora ANTES do botão Gerar no cockpit')
const nudgeTag = studio.slice(studio.lastIndexOf('<SubscriberUpgradeNudge', nudgeIdx), studio.indexOf('/>', nudgeIdx))
ok(/\btopup\b/.test(nudgeTag), 'cockpit oferece a recarga (prop topup)')
ok(/subscriberOutOfCreditsVisible\(\{ paid: contaPaga, balance, cost, mode: scriptMode \}\)/.test(studio), 'cockpit decide pela regra pura com has_paid do servidor, saldo e o MESMO custo do botão')
ok(/onShown=\{/.test(nudgeTag) && /onChoice=\{/.test(nudgeTag), 'cockpit mede impressão e clique')
ok(SUBSCRIBER_OUT_OF_CREDITS_STUDIO_SURFACE === 'studio_cockpit_short', 'superfície studio_cockpit_short')

console.log('— telemetria nas paredes do assinante')
ok(SUBSCRIBER_OUT_OF_CREDITS_SHOWN_EVENT === 'subscriber_out_of_credits_offer_shown' && SUBSCRIBER_OUT_OF_CREDITS_CLICKED_EVENT === 'subscriber_out_of_credits_offer_clicked', 'nomes dos eventos')
const nudge = rd('components/billing/SubscriberUpgradeNudge.tsx')
ok(/onShown\?\.\(/.test(nudge) && /onChoice\?\.\(/.test(nudge), 'SubscriberUpgradeNudge avisa impressão e clique a quem montou')
ok(/switchPlan\(offer\.to\)/.test(nudge) && !/\/api\/stripe\/checkout\?tier=/.test(nudge), 'troca vai pelo change-plan (switchPlan), nunca pelo checkout de assinatura')
// As paredes que já existiam (studio_clip_402 e o modal do /studio/create) continuam intocadas: elas já gravam
// subscriber_upgrade_shown/clicked com a própria surface (e o guardião de 06/10 pina as linhas exatas).
ok(/SUBSCRIBER_UPGRADE_SHOWN_EVENT/.test(nudge) && /surface,/.test(nudge), 'paredes antigas seguem medindo subscriber_upgrade_shown com a surface')
const gen = rd('app/(dashboard)/generate/GenerateClient.tsx')
ok(gen.includes('{isSubscriber && <SubscriberUpgradeNudge surface="generate_upgrade_modal" tone="dark" onDone={onClose} />}'), 'parede do /studio/create (troca + pacotes) intacta')
ok(studio.includes(`<SubscriberUpgradeNudge surface="studio_clip_402" topup`), 'parede do clipe intacta')

console.log('— e-mail cap_hit (não é do assinante)')
const cap = rd('app/api/cron/send-cap-hit/route.ts')
const vercel = rd('vercel.json')
ok(/"\/api\/cron\/send-cap-hit"/.test(vercel), 'cap_hit está agendado no vercel.json')
ok(/skips test\/founder accounts, paid plans/.test(cap), 'cap_hit pula planos pagos: é o muro GRÁTIS, não o do assinante')

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
