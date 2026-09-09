#!/usr/bin/env node
// KINEO-RESTAURACAO-2026-09-09 — APOSENTADO ENQUANTO A FONTE DISSER QUE ISTO ESTÁ DESLIGADO.
// Fundador (09/09 18h): "tira esse negócio de 1 dólar" / "voltar na minha melhor fase". Este guardião
// guarda o trial pago de $1. Se a fonte religar, o preâmbulo deixa de disparar e as verificações voltam.
import { readFileSync as __rf } from 'node:fs'
import { join as __j, dirname as __d } from 'node:path'
import { fileURLToPath as __f } from 'node:url'
{
  const __raiz = __j(__d(__f(import.meta.url)), '..')
  const __src = __rf(__j(__raiz, 'lib/checkoutPricing.ts'), 'utf8').replace(/\r\n/g, '\n')
  if (/export const CARD_TRIAL_LIVE = false/.test(__src)) {
    console.log('APOSENTADO (restauração 09/09/2026): o trial pago de $1 está desligado na fonte (lib/checkoutPricing.ts). Volta a valer sozinho no dia em que religar.')
    process.exit(0)
  }
}
// KINEO-TRIAL-1DOLAR-LIGADO-2026-09-07 — guardião do trial pago de $1 (7 dias, Creator).
// Le os arquivos REAIS: checkout (interruptor, elegibilidade, carimbo na sessao),
// webhook (reconhece o carimbo, concede 80), pricing (o unico botao que leva la).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const ck = readFileSync(join(RAIZ, 'app/api/stripe/checkout/route.ts'), 'utf8')
const wh = readFileSync(join(RAIZ, 'app/api/stripe/webhook/route.ts'), 'utf8')
const pr = readFileSync(join(RAIZ, 'app/pricing/PricingClient.tsx'), 'utf8')
const cp = readFileSync(join(RAIZ, 'lib/checkoutPricing.ts'), 'utf8')
let ok = 0
const falhas = []
const checa = (n, c, d = '') => { if (c) { ok++; console.log(`  ok  ${n}`) } else { falhas.push(n); console.log(`  XX  ${n}${d ? ' — ' + d : ''}`) } }

console.log('\n== checkout ==')
checa('o interruptor esta LIGADO', /const CARD_TRIAL_ENABLED = true/.test(ck))
checa('trial so no Creator mensal via ?trial=1 (tier === TRIAL_TIER, e TRIAL_TIER e basic)', /let wantsTrial = CARD_TRIAL_ENABLED && req\.nextUrl\.searchParams\.get\('trial'\) === '1' && tier === TRIAL_TIER/.test(ck) && /const TRIAL_TIER = 'basic' as const/.test(ck))
checa('quem ja pagou (has_paid) NAO entra no trial — cai no checkout normal', /if \(wantsTrial && \(profile as \{ has_paid\?: boolean \| null \} \| null\)\?\.has_paid === true\) \{\s*wantsTrial = false/.test(ck))
checa('o perfil passa a ler has_paid', /trial_credits_used, has_paid'\)/.test(ck))
checa('a metadata da SESSAO carrega card_trial (o webhook le session.metadata)', /metadata: \{\s*supabase_user_id: user\.id,\s*tier,\s*billing,[\s\S]{0,600}\.\.\.\(wantsTrial && !isAnnual \? \{ card_trial: '1', trial_days: String\(TRIAL_DAYS\) \} : \{\}\),/.test(ck))
checa('a assinatura nasce com trial_period_days=7, item avulso de $1 e cartao obrigatorio', /trial_period_days: TRIAL_DAYS/.test(ck) && /unit_amount: TRIAL_ENTRY_FEE_CENTS/.test(ck) && /const TRIAL_ENTRY_FEE_CENTS = 100/.test(ck) && /payment_method_collection: 'always'/.test(ck))
checa('cartao que falha no dia 8 CANCELA (missing_payment_method: cancel)', /missing_payment_method: 'cancel'/.test(ck))
checa('anual nunca vira trial (wantsTrial && !isAnnual)', (ck.match(/wantsTrial && !isAnnual/g) || []).length >= 3)

console.log('\n== webhook ==')
checa("isTrial reconhece o carimbo card_trial (a sessao fecha 'paid' com $1, nao 'no_payment_required')", /const isTrial = session\.payment_status === 'no_payment_required' \|\| session\.metadata\?\.card_trial === '1'/.test(wh))
checa('trial de cartao concede CARD_TRIAL_GRANT_CREDITS (80), nao os 25 do trial gratis', /const isCardTrial = session\.metadata\?\.card_trial === '1'/.test(wh) && /isCardTrial \? CARD_TRIAL_GRANT_CREDITS : isTrial \? TRIAL_GRANT_CREDITS : firstMonthCredits/.test(wh))
checa('CARD_TRIAL_GRANT_CREDITS = 80 exportado de checkoutPricing e importado no webhook', /export const CARD_TRIAL_GRANT_CREDITS = 80/.test(cp) && /CARD_TRIAL_GRANT_CREDITS,/.test(wh))
checa('o dia 8 continua pelo caminho existente: invoice.payment_succeeded ignora subscription_create e concede o grant pela régua (renewalCreditsFor) no cycle', /if \(billingReason === 'subscription_create'\) break/.test(wh) && /const renewalCredits = renewalCreditsFor\(renewalTier, invoice\.amount_paid\)/.test(wh))

console.log('\n== pricing ==')
checa('o link existe e esta ligado', /const CARD_TRIAL_LINK_ENABLED = true/.test(pr))
checa('a URL do link pede trial=1 no Creator mensal com intent_campaign', /\/api\/stripe\/checkout\?tier=basic&billing=monthly&trial=1&intent_campaign=trial_1usd/.test(pr))
checa('o botao so aparece no Creator com faturamento mensal', /CARD_TRIAL_LINK_ENABLED && billing === 'monthly' && p\.tier === 'basic' &&/.test(pr))
checa('passa pelo checkout.launch (mesma telemetria de todo checkout) e emite pricing_trial_1usd_clicked', /checkout\.launch\('basic', CARD_TRIAL_CHECKOUT_URL/.test(pr) && /pricing_trial_1usd_clicked/.test(pr))
checa('a copy diz o preco do dia 8 pela fonte unica (CARD_TRIAL_SECONDARY_LABEL, nunca digitado)', /CARD_TRIAL_SECONDARY_LABEL/.test(pr))
checa('o botao principal do Creator ($15) continua la — o trial e a segunda opcao, nao substitui', /onClick=\{\(\) => handleBuy\(p\.tier as PaidTier\)\}/.test(pr))

console.log('\n== cards do app (PricingCards) ==')
const cards = readFileSync(join(RAIZ, 'components/PricingCards.tsx'), 'utf8')
checa('PlanCard aceita secondary e renderiza abaixo do CTA', /secondary\?: \{ label: string; onClick: \(\) => void; testId\?: string \} \| null/.test(cards) && /\{cta && secondary \? \(/.test(cards))
checa('o Creator carrega a secondary do trial pela mesma URL do /pricing', /handleTrial\(\) \{[\s\S]*?tier=basic&billing=monthly&trial=1&intent_campaign=trial_1usd_app/.test(cards) && /secondary=\{planSwitch\.subscribed \? null : \{ label: CARD_TRIAL_SECONDARY_LABEL, onClick: handleTrial/.test(cards))
checa('o CTA principal do Creator (handleBuy) continua', /onClick: \(\) => handleBuy\('basic'\),/.test(cards))
checa('so o Creator tem secondary (Starter e Studio nao)', (cards.match(/secondary=\{planSwitch\.subscribed \? null : \{/g) || []).length === 1 && !/secondary=\{\{/.test(cards))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { console.log('\nFALHOU:'); falhas.forEach((f) => console.log(`  - ${f}`)); process.exit(1) }
console.log('\nOK — trial de $1 ligado, com porta unica, 1 por conta e credito proprio\n')
