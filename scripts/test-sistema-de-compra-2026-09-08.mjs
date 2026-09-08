// KINEO-SISTEMA-DE-COMPRA-2026-09-08 — guardião do caminho de compra, elo por elo:
// entrada → carimbo → faixa → Generate → caixa ($1) → Stripe → webhook → créditos
// → filme → dia 8 → admin. "Cada falha é um cliente que a gente perde" (fundador).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
const comp = rd('app/api/compose/route.ts')
const ban = rd('components/CardEntryBanner.tsx')
const lay = rd('app/(dashboard)/layout.tsx')
const rt = rd('lib/reverseTrial.ts')
const co = rd('app/api/stripe/checkout/route.ts')
const wh = rd('app/api/stripe/webhook/route.ts')
const sp = rd('app/checkout/success/page.tsx')
const ent = rd('lib/growth/checkoutSuccessEntitlement.ts')

console.log('== 1. entrada e carimbo ==')
checa('conta nova nasce card_required (callback) e o carimbo é idempotente', /update\(\{ trial_status: CARD_ENTRY_TRIAL_STATUS \}\)[\s\S]{0,120}\.is\('trial_status', null\)/.test(rt))
checa('callback chama a ativação (todo cadastro OAuth/e-mail passa por aqui)', /maybeActivateReverseTrial\(\{/.test(rd('app/auth/callback/route.ts')))
checa('faixa aparece para card_required E para conta sem carimbo com 0 crédito', /status === CARD_ENTRY_TRIAL_STATUS \|\| semCarimboMasSemCredito/.test(ban) && /const semCarimboMasSemCredito = status === null && credits === 0/.test(ban))
checa('faixa falha fechada quando o saldo não foi lido (null)', /credits = null,/.test(ban) && /status === null && credits === 0/.test(ban))
checa('layout passa o saldo para a faixa', /<CardEntryBanner[\s\S]{0,400}credits=\{typeof \(profile as \{ video_credits\?: number \| null \} \| null\)\?\.video_credits === 'number'/.test(lay))

console.log('== 2. Generate cai no caixa, nunca numa mensagem ==')
checa('guarda de crédito conhece a versão B (fast incluído)', /if \(CARD_ENTRY_ONLY && !hasPaid && credits !== null && credits <= 0\) return true/.test(gc))
const iGuard = gc.indexOf('if (CARD_ENTRY_ONLY && !hasPaid && credits !== null && credits <= 0) return true')
const iFast = gc.indexOf("if (mode === 'fast') return false")
checa('a guarda nova vem ANTES da isenção do fast', iGuard > 0 && iFast > iGuard)
checa('handleGenerateGuarded abre o modal quando outOfCredits()', /function handleGenerateGuarded\(\) \{\n\s*if \(outOfCredits\(\)\) \{\n\s*openOutOfCreditsModal\(\)/.test(gc))
checa('402 do Fast com outOfCredits abre o caixa (backstop)', /if \(data\?\.outOfCredits === true\) openOutOfCreditsModal\('credits'\)/.test(gc))
checa('o modal NÃO oferece "primeiro filme grátis" sob a versão B', /firstFilmFree=\{!CARD_ENTRY_ONLY && firstFilmFreeAvailable\}/.test(gc))
checa('o modal carrega a porta de $1 (UpgradeModalTrialDoor)', /<UpgradeModalTrialDoor currency=\{currency\} region=\{region\} notPaidProven=\{notPaidProven\}/.test(gc))
checa('compose: a recusa é a porta (cardEntry + upgrade = checkout do $1)', /cardEntry: CARD_ENTRY_ONLY,/.test(comp) && /upgrade: CARD_ENTRY_ONLY \? CARD_ENTRY_CHECKOUT_PATH : '\/pricing',/.test(comp))
checa('compose: recusa vem com outOfCredits: true', /outOfCredits: true,\n\s*\/\/ KINEO-SISTEMA-DE-COMPRA/.test(comp))

console.log('== 3. o caixa ==')
checa('trial só com trial=1 no Creator mensal', /let wantsTrial = CARD_TRIAL_ENABLED && req\.nextUrl\.searchParams\.get\('trial'\) === '1' && tier === TRIAL_TIER/.test(co))
checa('quem já pagou não ganha o $1 (cai no preço cheio, sem erro)', /if \(wantsTrial && \(profile as \{ has_paid\?: boolean \| null \} \| null\)\?\.has_paid === true\) \{\n\s*wantsTrial = false/.test(co))
checa('$1 cobrado hoje (add_invoice_items) + 7 dias de trial', /trial_period_days: TRIAL_DAYS,/.test(co) && /unit_amount: TRIAL_ENTRY_FEE_CENTS,/.test(co) && /const TRIAL_ENTRY_FEE_CENTS = 100/.test(co))
checa('sem cartão no fim do trial → cancela (nunca cobra às cegas)', /missing_payment_method: 'cancel'/.test(co))
checa('deslogado: checkout manda para /signup com redirect', /reason=checkout/.test(co))

console.log('== 4. o webhook ==')
checa('$1 concede 80 (CARD_TRIAL_GRANT_CREDITS)', /const creditsToGrant = isCardTrial \? CARD_TRIAL_GRANT_CREDITS : isTrial \? TRIAL_GRANT_CREDITS : firstMonthCredits/.test(wh))
checa('plano vira basic_trial e has_paid true', /const expectedPlan = isTrial \? `\$\{tier\}_trial` : tier/.test(wh) && /has_paid: true, \/\/ KINEO-PACK-NOWM/.test(wh))
checa('trial_status card_required vira converted', /\.in\('trial_status', \['active', 'expired', CARD_ENTRY_TRIAL_STATUS\]\)/.test(wh))
checa('payment_success marca card_trial', /card_trial: session\.metadata\?\.card_trial === '1',/.test(wh))
checa('dia 8: fatura concede TIER_CREDITS e vira evento com trial_conversion', /const renewalCredits = TIER_CREDITS\[renewalTier\]/.test(wh) && /trial_conversion: previousPlanNormalized\.endsWith\('_trial'\),/.test(wh))

console.log('== 5. a volta ==')
checa('success só libera com has_paid true e plano pago (basic_trial incluso)', /if \(input\.hasPaid !== true\) return 'payment_pending'/.test(ent) && /SELF_SERVE_PAID_PLANS/.test(ent))
checa('basic_trial está na lista de planos do success', /basic_trial/.test(ent))
checa('volta cai no Studio com a ideia e dispara uma vez', /destination = '\/studio\/create\?resume=card_entry'/.test(sp) && /resumeFiredRef\.current = true/.test(gc))
checa('gate de motor: trial usa Kineo 1 + Seedance', /'seedance'\n\s*const engineGate = decideEngineGate/.test(rd('app/api/generate-video-cinematic/route.ts')))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — do cadastro ao dia 8, cada elo provado')
