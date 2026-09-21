// KINEO-RADAR-DE-QUALIDADE-2026-09-20 — guardião: o juiz roda sozinho, pagante com filme ruim vira alerta, resumo diário.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, () => { throw new Error('sem imports') })
  return m.exports
}

console.log('1) decisão de alerta')
const src = rd('lib/qualityRadar.ts')
const R = roda(src)
checa('pagante com nota 50 (caso Axel/meias com o juiz v4) → alerta', R.decideRadarAlert({ score: 50, hasPaid: true, internal: false, alreadyAlerted: false }).reason === 'alert_paid')
checa('pagante com nota 75 → ok', R.decideRadarAlert({ score: 75, hasPaid: true, internal: false, alreadyAlerted: false }).alert === false)
checa('trial com 50 → não alerta (piso do trial é mais baixo: o motor pede conserto, não crédito)', R.decideRadarAlert({ score: 50, hasPaid: false, internal: false, alreadyAlerted: false }).reason === 'score_ok')
checa('trial com 30 → alerta', R.decideRadarAlert({ score: 30, hasPaid: false, internal: false, alreadyAlerted: false }).reason === 'alert_trial')
checa('conta da casa → nunca', R.decideRadarAlert({ score: 10, hasPaid: true, internal: true, alreadyAlerted: false }).reason === 'internal_account')
checa('já alertado → nunca duas vezes', R.decideRadarAlert({ score: 10, hasPaid: true, internal: false, alreadyAlerted: true }).reason === 'already_alerted')
checa('sem nota → espera', R.decideRadarAlert({ score: null, hasPaid: true, internal: false, alreadyAlerted: false }).reason === 'no_score')
const mut = src.replace('if (input.hasPaid && input.score < ALERTA_PAGANTE) return { alert: true, reason: \'alert_paid\' }', '')
checa('mutante (pagante nunca alerta) é pego', roda(mut).decideRadarAlert({ score: 50, hasPaid: true, internal: false, alreadyAlerted: false }).alert === false)

console.log('2) textos')
const filme = { video_id: 'v1', email: 'axel@x.com', engine: 'cinematic_veo', topic: 'duas meias', score: 50, visual: 40, texto: 100, problems: ['cena 4: meia grande branca quando devia ser azul'], created_at: '2026-09-19T03:44:06Z', hasPaid: true, credits: 101 }
const a = R.radarAlertText(filme, 'https://www.usekineo.com')
checa('alerta nomeia PAGANTE, e-mail, motor e nota no assunto', a.subject.includes('PAGANTE') && a.subject.includes('axel@x.com') && a.subject.includes('Veo 3.1') && a.subject.includes('50'))
checa('alerta traz problemas, painel e botão de crédito', a.text.includes('cena 4') && a.text.includes('/admin/coerencia') && a.text.includes('/admin/people'))
const d = R.radarDigestText([filme, { ...filme, video_id: 'v2', engine: 'fast', score: 90, visual: 85, hasPaid: false, email: 'b@x.com' }], 'https://www.usekineo.com')
checa('resumo: contagem, média, abaixo de 70, por motor, piores', d.subject.includes('2 filmes') && d.subject.includes('média 70') && d.text.includes('Kineo 1: 1 filme') && d.text.includes('Os 5 piores'))

console.log('3) cron')
const cron = rd('app/api/cron/quality-radar/route.ts')
checa('CRON_SECRET fail-closed', cron.includes("if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })"))
checa('julga filmes novos com teto por rodada e sem contas da casa', cron.includes('maxCompute: RADAR_MAX_JUDGE_PER_RUN') && cron.includes('excludeEmails: INTERNAL'))
checa('alerta 1× por filme (marcador quality_radar_alert por video_id)', cron.includes(".eq('name', RADAR_ALERT_EVENT).in('session_id', ids)") && cron.includes('session_id: f.video_id'))
checa('pagante = has_paid OU plano pago não-trial', cron.includes("(plan !== 'free' && !plan.endsWith('_trial'))"))
checa('radar: fetchCache force-no-store + freshFetch (leitura de cron nunca vem de cache)', cron.includes("export const fetchCache = 'force-no-store'") && cron.includes('global: { fetch: freshFetch }'))
const vj = rd('vercel.json')
checa('agendado: a cada 15 min + resumo 08:05 BRT (11:05 UTC)', /"path": "\/api\/cron\/quality-radar",\s*\n\s*"schedule": "4,19,34,49 \* \* \* \*"/.test(vj) /* minuto 18 é da carta de afiliados (test-afiliados-acordam) */ && /"path": "\/api\/cron\/quality-radar\?digest=1",\s*\n\s*"schedule": "5 11 \* \* \*"/.test(vj))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
