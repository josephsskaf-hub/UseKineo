// KINEO-STRIPE-SEM-MOTOR-1211 — guardião: a descrição do produto que vai para a página da Stripe não cita motor.
// Regra do fundador (11/11: "Tira, com certeza" / "Tira também"). Prova: (1) a linha da "ponte do saldo do trial" diz "standard Ns films"
// (era "MiniMax H3 Turbo Ns films"); (2) a linha do "plano que cabe" diz "Covers your N video(s)/month plan" sem o nome do motor;
// (3) a conta (outputCount), o preço e a promo do Kling 4 (que promete o motor que o cliente recebe, e está desligada) intocados.
// Rodar: node scripts/test-stripe-sem-motor-1211.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const CTX = 'lib/growth/checkoutValueContext.ts'
const ROUTE = 'app/api/stripe/checkout/route.ts'
const SRC = { [CTX]: rd(CTX), [ROUTE]: rd(ROUTE) }

function battery(src) {
  const p = []
  const c = src[CTX]
  if (!c.includes('`${input.credits} credits a month · up to ${outputCount} standard ${TRIAL_BALANCE_BRIDGE_DURATION}s films · Cancel anytime`')) p.push('a ponte do saldo não diz "standard Ns films"')
  if (c.includes('MiniMax H3 Turbo ${TRIAL_BALANCE_BRIDGE_DURATION}s films')) p.push('a ponte do saldo voltou a citar o motor')
  if (!c.includes('const outputCount = Math.floor(input.credits / TRIAL_BALANCE_BRIDGE_COST)')) p.push('a conta de quantos filmes mudou')
  if (!c.includes("export const CHECKOUT_KLING4_PROMO_LINE = 'Kling 4.0 free for 30 days (up to 3 films a day)'")) p.push('a promo do Kling 4 foi reescrita (era para só listar)')
  const r = src[ROUTE]
  if (!r.includes('· Covers your ${planFitContext.plan_fit_monthly_videos} video${planFitContext.plan_fit_monthly_videos')) p.push('a linha do plano que cabe não ficou "Covers your N video(s)"')
  if (r.includes('engineName(planFitContext.plan_fit_planned_engine)')) p.push('a linha do plano que cabe ainda cita o motor')
  if (r.includes("import { engineName } from '@/lib/growth/planFit'")) p.push('import do engineName ficou sobrando')
  if (!r.includes("planFitContext?.plan_fit_selected_tier_matches === '1'")) p.push('a condição da linha do plano que cabe mudou')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS Stripe sem nome de motor: ponte do saldo "standard", plano-que-cabe sem motor; conta e promo intocadas' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from.slice(0, 80)}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['MiniMax volta na ponte', muta(CTX, 'up to ${outputCount} standard ${TRIAL_BALANCE_BRIDGE_DURATION}s films', 'up to ${outputCount} MiniMax H3 Turbo ${TRIAL_BALANCE_BRIDGE_DURATION}s films')],
  ['motor volta no plano que cabe', muta(ROUTE, '· Covers your ${planFitContext.plan_fit_monthly_videos} video', '· Covers your ${planFitContext.plan_fit_monthly_videos} ${engineName(planFitContext.plan_fit_planned_engine)} video')],
  ['conta mudou', muta(CTX, 'const outputCount = Math.floor(input.credits / TRIAL_BALANCE_BRIDGE_COST)', 'const outputCount = Math.ceil(input.credits / TRIAL_BALANCE_BRIDGE_COST)')],
  ['promo reescrita', muta(CTX, "'Kling 4.0 free for 30 days (up to 3 films a day)'", "'Premium films free for 30 days (up to 3 films a day)'")],
]
let killed = 0
for (const [nome, src] of MUTANTES) {
  let p
  try { p = battery(src) } catch (e) { p = [`lançou: ${e.message}`] }
  if (p.length > 0) killed++
  else { failed++; console.log(`SOBREVIVEU mutante: ${nome}`) }
}
console.log(`mutantes: ${killed}/${MUTANTES.length} mortos`)
if (failed) { console.log('FAIL'); process.exit(1) }
console.log('OK')
