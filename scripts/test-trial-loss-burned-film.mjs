// sprint-assinaturas #20 — verificacoes do corpo `burned_with_film` do
// `downgraded_loss` (lib/lifecycle/trialFilmPlans.ts + o caller no cron).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }

const lib = readFileSync(path.join(root, 'lib/lifecycle/trialFilmPlans.ts'), 'utf8')
const route = readFileSync(path.join(root, 'app/api/cron/trial-lifecycle-emails/route.ts'), 'utf8')
const pricing = readFileSync(path.join(root, 'lib/checkoutPricing.ts'), 'utf8')

// TIER_CREDITS reais, lidos da fonte (nunca digitados aqui)
const tc = {}
for (const t of ['starter', 'basic', 'pro']) {
  const m = pricing.match(new RegExp(`^\\s*${t}:\\s*(\\d+),`, 'm'))
  tc[t] = m ? Number(m[1]) : NaN
}
ok(Number.isFinite(tc.starter) && Number.isFinite(tc.basic) && Number.isFinite(tc.pro), `TIER_CREDITS lidos: ${JSON.stringify(tc)}`)

// reimplementacao literal (fonte conferida por texto abaixo)
const isBurnedWithFilm = (i) => {
  if (i.status !== 'downgraded') return false
  if (!Number.isFinite(i.granted) || i.granted <= 0) return false
  if (!Number.isFinite(i.used) || i.used < i.granted) return false
  return Number.isFinite(i.videosMade) && i.videosMade >= 1
}
const sanitizeFilmCost = (c) => { if (typeof c !== 'number' || !Number.isFinite(c)) return null; const x = Math.floor(c); return x >= 1 ? x : null }
const filmsPerPlan = (cost) => {
  const c = sanitizeFilmCost(cost); if (c === null) return null
  const rows = ['starter', 'basic', 'pro'].map((tier) => ({ tier, films: Math.floor(tc[tier] / c) }))
  return rows.every((r) => r.films < 1) ? null : rows
}
const filmNoun = (d) => { if (typeof d !== 'number' || !Number.isFinite(d)) return 'film'; const s = Math.round(d); return s >= 1 ? `${s}-second film` : 'film' }

ok(lib.includes("if (input.status !== 'downgraded') return false"), 'fonte: so linha downgraded (revogacao provada)')
ok(lib.includes('input.used < input.granted) return false'), 'fonte: gasto >= concessao')
ok(lib.includes('input.videosMade >= 1'), 'fonte: exige video entregue')
ok(lib.includes('TIER_CREDITS[tier] / c'), 'fonte: filmes por plano derivados de TIER_CREDITS')
ok(!/\$\s?\d/.test(lib), 'fonte: nenhum preco literal no modulo')
ok(lib.includes("rows.every((r) => r.films < 1)) return null"), 'fonte: nenhum plano compra 1 -> sem linhas')

// decisao
ok(isBurnedWithFilm({ status: 'downgraded', granted: 25, used: 25, videosMade: 1 }) === true, 'zare (25/25, 1 video) -> burned_with_film')
ok(isBurnedWithFilm({ status: 'expired', granted: 25, used: 25, videosMade: 1 }) === false, "'expired' (saldo ainda na conta) -> nao")
ok(isBurnedWithFilm({ status: 'downgraded', granted: 25, used: 20, videosMade: 1 }) === false, 'sobrou credito -> e-mail padrao (lista de perdas com "5 unused")')
ok(isBurnedWithFilm({ status: 'downgraded', granted: 25, used: 25, videosMade: 0 }) === false, 'sem video -> never_ran')
ok(isBurnedWithFilm({ status: 'downgraded', granted: 0, used: 0, videosMade: 3 }) === false, 'sem concessao registrada -> nao afirma')
ok(isBurnedWithFilm({ status: 'downgraded', granted: 25, used: 30, videosMade: 2 }) === true, 'gastou mais que a concessao (saldo antigo) -> ainda burned')
ok(isBurnedWithFilm({ status: 'downgraded', granted: NaN, used: 25, videosMade: 1 }) === false, 'granted NaN -> nao')

// filmes por plano
const s25 = filmsPerPlan(25)
ok(s25 && s25[0].films === Math.floor(tc.starter / 25) && s25[1].films === Math.floor(tc.basic / 25) && s25[2].films === Math.floor(tc.pro / 25), `Seedance 60s (25cr): ${s25 && s25.map((r) => r.films).join('/')} filmes/mes`)
const k1 = filmsPerPlan(5)
ok(k1 && k1[0].films === Math.floor(tc.starter / 5), `Kineo 1 (5cr): ${k1 && k1.map((r) => r.films).join('/')}`)
ok(filmsPerPlan(0) === null, 'custo 0 -> null (credits_used=0 em resgate #18: nao afirma)')
ok(filmsPerPlan(null) === null, 'custo null -> null')
ok(filmsPerPlan(NaN) === null, 'custo NaN -> null')
ok(filmsPerPlan(-3) === null, 'custo negativo -> null')
ok(filmsPerPlan(10000) === null, 'custo maior que todo plano -> null (nunca "0 films")')
ok(filmsPerPlan(25.9)[0].films === Math.floor(tc.starter / 25), 'custo fracionado arredonda p/ baixo antes de dividir')

// substantivo
ok(filmNoun(62) === '62-second film', 'duracao 62 -> "62-second film"')
ok(filmNoun(null) === 'film', 'sem duracao -> "film"')
ok(filmNoun(0) === 'film', 'duracao 0 -> "film"')
ok(filmNoun(61.6) === '62-second film', 'arredonda')

// caller no cron
ok(route.includes("select('user_id, topic, created_at, credits_used, duration')"), 'cron: custo/duracao colhidos no mesmo laco de videos (zero consulta nova)')
ok(route.includes('burnedWithFilm: isBurnedWithFilm({ status, granted, used, videosMade })'), 'cron: decisao em dueKind com videosMade real')
ok(route.includes('burnedWithFilm: false,') , 'cron: base nasce false (falha fechada)')
ok(route.includes('if (c.burnedWithFilm) {'), 'cron: ramo novo existe')
const nrIdx = route.indexOf('if (neverRan) {')
const bfIdx = route.indexOf('if (c.burnedWithFilm) {')
ok(nrIdx > 0 && bfIdx > nrIdx, 'cron: never_ran decide ANTES (quem nao tem video nunca le "film")')
ok(route.includes("subject: c.videosMade === 1"), 'cron: assunto no singular/plural pelo numero real')
ok(route.includes("`${APP_URL}/library?${utm('trial_loss_burned_film_library')}`"), 'cron: CTA da Library com utm proprio')
ok(route.includes("`${APP_URL}/pricing?${utm('trial_loss_burned_film')}`"), 'cron: CTA de planos com utm proprio')
ok(route.includes('const rows = filmsPerPlan(c.lastCost)'), 'cron: linhas de plano derivadas do custo real do ultimo video')
ok(route.includes("? `\\nIf you want the next one, a plan is measured in films like that one:"), 'cron: sem custo -> sem linhas de plano (texto)')
ok(route.includes('videos_made: c.videosMade,') && route.includes('credits_lost: c.creditsLost,') && route.includes('...(body.body ? { body: body.body } : {})'), 'cron: evento grava videos_made/credits_lost/body (o que a pessoa leu)')
ok(!route.includes('COMEBACK50') || !/burned_with_film[\s\S]{0,3000}COMEBACK50/.test(route.slice(bfIdx, bfIdx + 4000)), 'cron: ramo novo sem cupom')
ok(!/burned[\s\S]{0,4000}\$\d/.test(route.slice(bfIdx, bfIdx + 4000)), 'cron: ramo novo sem preco literal')
ok(route.includes("Here's what closed with the trial:"), 'cron: as perdas continuam listadas (so deixam de ser manchete)')

console.log(`\n${n - fail}/${n} ok`)
if (fail) process.exit(1)
