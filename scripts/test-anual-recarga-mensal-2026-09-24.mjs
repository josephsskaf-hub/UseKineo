// KINEO-ANUAL-RECARGA-MENSAL-2026-09-24 — guardião da promessa "credits reset each month" para o plano ANUAL.
// Exercita o módulo puro (lib/billing/annualRefill) com as tabelas REAIS de lib/checkoutPricing lidas do arquivo,
// e trava a estrutura do cron (auth, dry-run por padrão, SET e não soma, razão antes do grant, guardas do webhook)
// e o agendamento no vercel.json com o token de escrita.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

// ── tabelas reais, lidas do arquivo que cobra ─────────────────────────────────
const pricing = rd('lib/checkoutPricing.ts')
function bloco(nome) {
  const m = pricing.match(new RegExp(`export const ${nome}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`))
  return m ? m[1] : ''
}
function tabelaNum(nome) {
  const out = {}
  for (const m of bloco(nome).matchAll(/^\s*(starter|basic|pro|autopilot|autopilot_lite):\s*(\d+)/gm)) out[m[1]] = Number(m[2])
  return out
}
function tabelaUsd(nome) {
  const out = {}
  for (const m of bloco(nome).matchAll(/^\s*(starter|basic|pro):\s*\{\s*usd:\s*(\d+)/gm)) out[m[1]] = { usd: Number(m[2]) }
  return out
}
const TIER_CREDITS = tabelaNum('TIER_CREDITS')
const LEGACY = tabelaNum('LEGACY_TIER_CREDITS_V6')
const ANNUAL = tabelaUsd('ANNUAL_PRICES')
checa('tabelas lidas do arquivo real (TIER_CREDITS, LEGACY, ANNUAL_PRICES com starter/basic/pro)',
  ['starter', 'basic', 'pro'].every((t) => TIER_CREDITS[t] > 0 && LEGACY[t] > 0 && ANNUAL[t]?.usd > 0))

// ── módulo puro, transpilado e executado com as tabelas injetadas no lugar do import ──
const src = rd('lib/billing/annualRefill.ts')
checa('o módulo só importa de @/lib/checkoutPricing (puro: sem stripe, supabase, crypto)',
  (src.match(/^import /gm) || []).length === 1 && /from '@\/lib\/checkoutPricing'/.test(src) && !/node:crypto|supabase|@\/lib\/stripe/.test(src))
const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
const exp = {}
vm.runInNewContext(js, {
  exports: exp, console, Date, Math, Number, String, Array, Object,
  require: (mod) => {
    if (mod !== '@/lib/checkoutPricing') throw new Error('import inesperado: ' + mod)
    return { ANNUAL_PRICES: ANNUAL, LEGACY_TIER_CREDITS_V6: LEGACY, TIER_CREDITS }
  },
})
const lib = exp
const D = (iso) => Date.parse(iso)

// addUtcMonths prende o dia
checa('31/01 + 1 mês = 28/02 (ano não bissexto), nunca 03/03', new Date(lib.addUtcMonths(D('2027-01-31T10:00:00Z'), 1)).toISOString() === '2027-02-28T10:00:00.000Z')
checa('31/01 + 1 mês = 29/02 em ano bissexto', new Date(lib.addUtcMonths(D('2028-01-31T10:00:00Z'), 1)).toISOString() === '2028-02-29T10:00:00.000Z')
checa('15/03 + 12 meses = 15/03 do ano seguinte', new Date(lib.addUtcMonths(D('2026-03-15T00:00:00Z'), 12)).toISOString() === '2027-03-15T00:00:00.000Z')

// meses vencidos
const now = D('2026-09-24T12:00:00Z')
const sec = (iso) => Math.floor(D(iso) / 1000)
checa('assinatura com 20 dias: nenhum mês vencido (o mês 0 veio com a fatura)', lib.annualRefillDueMonths(sec('2026-09-04T00:00:00Z'), now).length === 0)
checa('assinatura com ~100 dias: meses 1, 2 e 3 vencidos', JSON.stringify(lib.annualRefillDueMonths(sec('2026-06-16T00:00:00Z'), now)) === '[1,2,3]')
checa('assinatura com 400 dias: no máximo 11 meses (o 12 é a próxima fatura)', JSON.stringify(lib.annualRefillDueMonths(sec('2025-08-20T00:00:00Z'), now)) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))
checa('mês vence exatamente na data-aniversário (limite inclusivo)', lib.annualRefillDueMonths(sec('2026-08-24T12:00:00Z'), now).length === 1 && lib.annualRefillDueMonths(sec('2026-08-24T12:00:01Z'), now).length === 0)
checa('período inválido = nada a conceder', lib.annualRefillDueMonths(0, now).length === 0 && lib.annualRefillDueMonths(NaN, now).length === 0)

// créditos: vigente × legado
checa('anual pago ao preço vigente → grant vigente do plano', ['starter', 'basic', 'pro'].every((t) => lib.annualRefillCredits(t, ANNUAL[t].usd, 'usd') === TIER_CREDITS[t]))
checa('anual pago abaixo do vigente (assinante antigo) → grant antigo', ['starter', 'basic', 'pro'].every((t) => lib.annualRefillCredits(t, ANNUAL[t].usd - 100, 'usd') === LEGACY[t]))
checa('fatura em BRL não tem legado a honrar → grant vigente', lib.annualRefillCredits('pro', 1, 'brl') === TIER_CREDITS.pro)
checa('valor ausente → grant vigente', lib.annualRefillCredits('starter', null, 'usd') === TIER_CREDITS.starter)
checa('só starter/basic/pro têm anual', lib.annualTierFromMetadata('pro') === 'pro' && lib.annualTierFromMetadata('autopilot') === null && lib.annualTierFromMetadata(undefined) === null)
checa('cinematic_tokens: Studio 1, demais 0 (Push #088)', lib.annualRefillCinematicTokens('pro') === 1 && lib.annualRefillCinematicTokens('basic') === 0)
checa('chave idempotente muda por assinatura, período e mês', new Set([lib.annualRefillEventKey('sub_a', 1, 1), lib.annualRefillEventKey('sub_a', 1, 2), lib.annualRefillEventKey('sub_a', 2, 1), lib.annualRefillEventKey('sub_b', 1, 1)]).size === 4)

// ── o cron ───────────────────────────────────────────────────────────────────
const cron = rd('app/api/cron/annual-credit-refill/route.ts')
checa('auth fail-closed pelo CRON_SECRET (Bearer) e 401', /process\.env\.CRON_SECRET/.test(cron) && /Bearer \$\{cronSecret\}/.test(cron) && /status: 401/.test(cron))
checa("dry-run por padrão: só escreve com ?confirm=SEND", /searchParams\.get\('confirm'\) === 'SEND'/.test(cron) && /if \(!write\) \{ planned\.push/.test(cron))
checa('cron nasce com force-dynamic + force-no-store (memória: cron novo lido do Data Cache virou laço)', /export const dynamic = 'force-dynamic'/.test(cron) && /export const fetchCache = 'force-no-store'/.test(cron))
checa('só assinaturas com preço de intervalo year', /price\?\.recurring\?\.interval === 'year'/.test(cron))
// KINEO-RENOVACAO-PRESERVA-CREDITO-COMPRADO-2026-09-25 — a cota do plano continua zerando (sem rollover), mas o que passa de uma cota (comprado/dado) sobrevive: o UPDATE grava o saldo da regra renewalBalance, nunca uma soma cega.
checa('cota do plano zera (sem rollover) e o comprado sobrevive: UPDATE grava o saldo da regra, nunca soma cega', /const renovacao = renewalBalance\(profile\.video_credits, credits\)/.test(cron) && /update\(\{ video_credits: renovacao\.balance, is_pro: true, plan: tier, cinematic_tokens: annualRefillCinematicTokens\(tier\) \}\)/.test(cron) && !/video_credits \+|video_credits: .*\+ credits/.test(cron))
checa('razão em events ANTES do grant, com id determinístico da chave', cron.indexOf("from('events').insert(") < cron.indexOf('.update({ video_credits: renovacao.balance') && /eventIdFor\(annualRefillEventKey\(sub\.id, periodStart, month\)\)/.test(cron))
checa('já concedido (granted) não concede de novo; grant que falhou fica granted:false para a próxima rodada', /if \(alreadyGranted\) continue/.test(cron) && /granted: false/.test(cron) && /granted: true, granted_at/.test(cron))
checa('guardas do webhook: conta interna fora e assinatura superada não reseta a nova', /isInternalEmail\(profile\.email\)/.test(cron) && /profile\.stripe_subscription_id !== sub\.id/.test(cron))
checa('teto por rodada (sem laço infinito)', /MAX_GRANTS_PER_RUN = 50/.test(cron) && /grants >= MAX_GRANTS_PER_RUN/.test(cron))
checa('user_id só em formato uuid (events.user_id é uuid)', /UUID\.test\(userId\)/.test(cron))

// ── agendado com o token de escrita ──────────────────────────────────────────
const vercel = JSON.parse(rd('vercel.json'))
const entry = (vercel.crons || []).find((c) => String(c.path).startsWith('/api/cron/annual-credit-refill'))
checa('vercel.json agenda o cron diariamente COM ?confirm=SEND', Boolean(entry) && /confirm=SEND/.test(entry.path) && /^\d+ \d+ \* \* \*$/.test(entry.schedule))

// ── a promessa continua escrita no FAQ (agora verdadeira) ────────────────────
const faq = rd('app/pricing/PricingClient.tsx')
checa('o FAQ do /pricing segue prometendo reset mensal (agora coberto pelo cron)', /reset each month/.test(faq))

console.log(`test-anual-recarga-mensal-2026-09-24: ${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  FAIL ' + f)
process.exit(falhas.length ? 1 : 0)
