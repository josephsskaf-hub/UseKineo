// KINEO-VERSAO-B-CONTINUE-NOW-2026-09-08 — guardião: "gastou os 80 → vira cliente na hora".
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const r = rd('app/api/stripe/end-trial-now/route.ts')
const b = rd('components/TrialContinueNowBanner.tsx')
const lay = rd('app/(dashboard)/layout.tsx')
const wh = rd('app/api/stripe/webhook/route.ts')

console.log('== a rota ==')
checa('só POST autenticado (401 sem usuário)', /export async function POST\(\)/.test(r) && /if \(!user\) return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)/.test(r))
checa('arquivo de rota não exporta constante solta (build da Vercel)', !/^export const (?!dynamic|maxDuration|runtime|revalidate)/m.test(r) && /^export const dynamic/m.test(r))
checa('exige plano *_trial e assinatura na Stripe', /if \(!plan\.endsWith\('_trial'\) \|\| !subscriptionId\)/.test(r))
checa('exige status trialing (idempotente: 2ª chamada dá 409)', /if \(subscription\.status !== 'trialing'\)/.test(r) && /status: 409/.test(r))
checa('encerra o trial AGORA sem proration', /trial_end: 'now', proration_behavior: 'none'/.test(r))
checa('a rota NÃO concede crédito (quem concede é o webhook)', !/video_credits:\s*[^,}]*\+/.test(r) && !/\.update\(\{ video_credits/.test(r))
checa('grava evento com resultado e saldo anterior', /name: END_TRIAL_NOW_EVENT/.test(r) && /credits_before/.test(r))
checa('números vêm da fonte única', /TIER_CREDITS\.basic/.test(r) && /TIER_PRICES\.basic\.usd/.test(r))
checa('falha na cobrança devolve 402 e não muda nada', /return NextResponse\.json\(\{ error: 'charge_failed' \}, \{ status: 402 \}\)/.test(r))

console.log('== o webhook que concede ==')
checa('renovação por subscription_cycle concede o grant pela régua (renewalCreditsFor)', /const renewalCredits = renewalCreditsFor(Invoice)?\(renewalTier, invoice\.amount_paid(, invoice\.currency)?\)/.test(wh))
checa('subscription_create é ignorado (o $1 já foi pago na sessão)', /if \(billingReason === 'subscription_create'\) break/.test(wh))

console.log('== a faixa ==')
checa('só para plano *_trial', /plan\.toLowerCase\(\)\.endsWith\('_trial'\)/.test(b))
checa('só com saldo baixo (< 20)', /export const CONTINUE_NOW_LOW_CREDITS = 20/.test(b) && /credits < CONTINUE_NOW_LOW_CREDITS/.test(b))
checa('preço e créditos pela fonte única', /formatCheckoutMoney\('usd', TIER_PRICES\.basic\.usd\)/.test(b) && /TIER_CREDITS\.basic/.test(b))
checa('chama a rota certa', /fetch\('\/api\/stripe\/end-trial-now', \{ method: 'POST'/.test(b))
checa('diz que esperar também funciona (sem urgência falsa)', /your plan starts automatically when the trial ends/.test(b))
checa('erro não mente: trial segue igual', /Your trial is unchanged/.test(b))
checa('três eventos (clique, ok, falha)', /card_trial_continue_now_clicked/.test(b) && /card_trial_continue_now_ok/.test(b) && /card_trial_continue_now_failed/.test(b))

console.log('== o layout ==')
checa('layout lê plan e video_credits', /select\('is_pro, email, trial_status, has_paid, plan, video_credits'\)/.test(lay))
checa('layout monta a faixa', /<TrialContinueNowBanner/.test(lay))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — continue now: o trial vira cliente na hora, e quem concede é o webhook')
