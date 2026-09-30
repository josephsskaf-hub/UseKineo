// KINEO-ADMIN-AFILIADOS-2026-09-30 — guardião dos números do /admin/affiliates (lib/admin/affiliateDashboard.ts).
// Fundador: "reconstruir a página dos afiliados… pra eu conseguir enxergar os dados melhor".
// Prova: (1) janelas 7/30 d e semana anterior; (2) visitantes únicos por ip_hash; (3) funil cadastro/pagante;
// (4) dinheiro POR MOEDA e anulado fora das vendas; (5) série de 30 dias e sparkline de 14 dias no dia certo;
// (6) ordem: quem traz mais em 30 d primeiro; (7) a rota lê PAGINADO (fetchAllRows) e a tela lê os campos novos;
// (8) mutantes. Estilo readFileSync + transpile (roda sem alias `@/`).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}

const SRC = read('lib/admin/affiliateDashboard.ts')
const NOW = Date.parse('2026-09-30T20:00:00.000Z')
const iso = (daysAgo, h = 0) => new Date(NOW - daysAgo * 86_400_000 - h * 3_600_000).toISOString()
const A = { id: 'a1', name: 'Ana', email: 'ana@x.test', code: 'ana', status: 'active', commission_rate: 0.3, coupon_code: null, created_at: iso(60) }
const B = { id: 'b1', name: 'Bob', email: 'bob@x.test', code: 'bob', status: 'pending', commission_rate: 0.3, coupon_code: null, created_at: iso(10) }
const Z = { id: 'z1', name: 'Zé', email: 'ze@x.test', code: 'ze', status: 'active', commission_rate: 0.3, coupon_code: null, created_at: iso(90) }
// Conta da casa (o fundador testando a compra pelo próprio código): na tabela, fora de todo total.
const H = { id: 'h1', name: null, email: 'casa@x.test', code: 'casa', status: 'active', commission_rate: 0.3, coupon_code: null, created_at: iso(30) }
const clicks = [
  { affiliate_id: 'a1', landing_path: '/a/ana?to=script', referrer: 'https://www.youtube.com/', ip_hash: 'ip1', created_at: iso(0, 1) },
  { affiliate_id: 'a1', landing_path: '/a/ana?to=script', referrer: null, ip_hash: 'ip1', created_at: iso(2) },
  { affiliate_id: 'a1', landing_path: '/a/ana', referrer: null, ip_hash: 'ip2', created_at: iso(9) },
  { affiliate_id: 'a1', landing_path: '/a/ana', referrer: null, ip_hash: 'ip3', created_at: iso(20) },
  { affiliate_id: 'b1', landing_path: '/a/bob?to=video', referrer: null, ip_hash: 'ip9', created_at: iso(40) },
  { affiliate_id: 'h1', landing_path: '/a/casa?to=script', referrer: null, ip_hash: 'ipH', created_at: iso(0, 2) },
  { affiliate_id: 'zz', landing_path: '/a/x', referrer: null, ip_hash: 'ipX', created_at: iso(1) }, // afiliado apagado: ignora
]
const referrals = [
  { affiliate_id: 'a1', email: 'c1@x.test', status: 'paid', first_touch_at: iso(2), converted_at: iso(1) },
  { affiliate_id: 'a1', email: 'c2@x.test', status: 'signed_up', first_touch_at: iso(45), converted_at: null },
  { affiliate_id: 'h1', email: 'casa+teste@x.test', status: 'paid', first_touch_at: iso(1), converted_at: iso(1) },
]
const commissions = [
  { affiliate_id: 'a1', amount_gross: 1990, commission_amount: 597, currency: 'usd', status: 'pending', created_at: iso(1) },
  { affiliate_id: 'a1', amount_gross: 4990, commission_amount: 1497, currency: 'BRL', status: 'paid', created_at: iso(1) },
  { affiliate_id: 'a1', amount_gross: 1990, commission_amount: 597, currency: 'usd', status: 'void', created_at: iso(3) },
  { affiliate_id: 'h1', amount_gross: 4990, commission_amount: 1497, currency: 'brl', status: 'pending', created_at: iso(1) },
]
const bucketOf = (p) => { const m = /[?&]to=([a-z_]+)/.exec(p || ''); return m && ['script', 'video'].includes(m[1]) ? m[1] : 'legacy' }
const run = (M) => M.buildAffiliateDashboard({ affiliates: [H, Z, B, A], clicks, referrals, commissions, bucketOf, buckets: ['script', 'video', 'legacy'], internalEmails: ['CASA@x.test'], nowMs: NOW })

function problems(M) {
  const p = []
  let d
  try { d = run(M) } catch (e) { return ['quebrou: ' + e.message] }
  const a = d.affiliates.find((x) => x.id === 'a1')
  const h = d.affiliates.find((x) => x.id === 'h1')
  const t = d.totals
  if (t.clicks !== 5) p.push(`total de cliques ${t.clicks} ≠ 5 (afiliado apagado ou conta da casa contou?)`)
  if (a.clicks7 !== 2 || a.clicks30 !== 4 || t.clicksPrev7 !== 1 || t.clicks7 !== 2) p.push(`janelas erradas (7d=${a.clicks7} 30d=${a.clicks30} prev7=${t.clicksPrev7} t7=${t.clicks7})`)
  if (a.visitors !== 3 || t.visitors !== 4 || t.hashedClicks !== 5) p.push(`visitantes únicos errados (${a.visitors}/${t.visitors}/${t.hashedClicks})`)
  if (t.signups !== 2 || t.paid !== 1 || a.signups30 !== 1) p.push(`funil cadastro/pagante errado (${t.signups}/${t.paid})`)
  if (a.gross.usd !== 1990 || a.gross.brl !== 4990) p.push(`vendas por moeda erradas ${JSON.stringify(a.gross)} (anulada entrou? moeda somada?)`)
  if (a.owed.usd !== 597 || a.owed.brl !== undefined) p.push(`a pagar errado ${JSON.stringify(a.owed)}`)
  if (a.paidOut.brl !== 1497 || a.voided.usd !== 597) p.push('pago/anulado errado')
  if (t.owed.usd !== 597 || t.owed.brl !== undefined) p.push(`a pagar total errado ${JSON.stringify(t.owed)} (comissão da casa entrou?)`)
  if (t.working30 !== 1) p.push(`afiliados trazendo gente em 30 d = ${t.working30} ≠ 1`)
  if (d.daily.length !== 30 || d.daily[29].day !== '2026-09-30' || d.daily[29].clicks !== 1 || d.daily[27].signups !== 1 || d.daily[28].signups !== 0) p.push('série de 30 dias fora do dia (ou com a casa)')
  if (a.spark.length !== 14 || a.spark[13] !== 1 || a.spark[11] !== 1 || a.spark[4] !== 1) p.push(`sparkline fora do dia ${JSON.stringify(a.spark)}`)
  if (d.destinationClicks.script !== 2 || d.destinationClicks.video !== 1 || d.destinationClicks.legacy !== 2) p.push(`destinos errados ${JSON.stringify(d.destinationClicks)}`)
  if (d.affiliates[0].id !== 'a1') p.push('ordem: quem traz mais em 30 d não está primeiro')
  if (a.lastClickAt !== clicks[0].created_at || a.recentClicks[0].at !== clicks[0].created_at) p.push('último clique errado')
  if (t.pending !== 1 || t.active !== 2) p.push('contagem por status errada')
  if (!h.internal || t.internal !== 1 || t.affiliates !== 3 || d.affiliates[d.affiliates.length - 1].id !== 'h1' || h.clicks !== 1 || h.paid !== 1) p.push('conta da casa: selo/posição/contagem própria errados')
  return p
}

const M = load(SRC)
const pr = problems(M)
ok(pr.length === 0, `(1-6) janelas, pessoas, funil, moeda, série, ordem, conta da casa fora (${pr.join('; ') || 'ok'})`)
ok(!/^\s*import\s/m.test(SRC), '(0) lib pura (nenhum import)')
const route = read('app/api/admin/affiliates/route.ts')
ok(/fetchAllRows<DashClickRow>\(admin, 'affiliate_clicks', 'affiliate_id, landing_path/.test(route) && !/\.from\('affiliate_clicks'\)\.select/.test(route), '(7a) a rota lê os cliques paginado (sem corte silencioso em 1000)')
ok(/affiliateDestinationBucket\(landingPath\)/.test(route) && /isAdminEmail\(user\.email\)/.test(route), '(7b) destino pelo helper canônico; portão de admin')
ok(route.includes('internalEmails: [...ADMIN_EMAILS],'), '(7f) a rota tira a conta da casa dos totais')
const page = read('app/(dashboard)/admin/affiliates/page.tsx')
ok(/fetch\('\/api\/admin\/affiliates'/.test(page) && /a\.owedByCurrency/.test(page) && /data\.daily/.test(page) && /a\.recentClicks/.test(page), '(7c) a tela lê a série, os cliques recentes e o a-pagar por moeda')
ok(page.includes('const peopleOk = !!t && (t.clicks === 0 || t.hashedClicks / t.clicks >= 0.9)'), '(7e) "Pessoas" só aparece com IP anonimizado em ≥ 90% dos cliques')
ok(!/#000'|#161618|#2997ff/i.test(page), '(7d) tela sem as cores fixas do tema escuro antigo (usa os tokens do site)')

// (8) mutantes
ok(problems(load(SRC.replace("    if (s === 'void') { addMoney(a.voided, c.currency, c.commission_amount); continue }", "    if (s === 'void') { addMoney(a.voided, c.currency, c.commission_amount) }"))).length > 0, '(M1) venda anulada contada como venda → vermelho')
ok(problems(load(SRC.replace("  const k = (currency ?? 'usd').trim().toLowerCase() || 'usd'", "  const k = 'usd'"))).length > 0, '(M2) moedas somadas juntas → vermelho')
ok(problems(load(SRC.replace('      if (t > since7) a.clicks7++', '      if (t > since30) a.clicks7++'))).length > 0, '(M3) janela de 7 d vira 30 d → vermelho')
ok(problems(load(SRC.replace('    if (c.ip_hash) { ipsByAff.get(a.id)!.add(c.ip_hash); if (!a.internal) { allIps.add(c.ip_hash); hashedClicks++ } }', '    ipsByAff.get(a.id)!.add(String(Math.random())); if (!a.internal) { allIps.add(String(Math.random())); hashedClicks++ }'))).length > 0, '(M4) pessoas = cliques → vermelho')
ok(problems(load(SRC.replace('Number(x.internal) - Number(y.internal) || y.clicks30 - x.clicks30 ||', 'Number(x.internal) - Number(y.internal) || x.clicks30 - y.clicks30 ||'))).length > 0, '(M5) quem traz menos primeiro → vermelho')
ok(problems(load(SRC.replace('      const idx = 13 - Math.floor(', '      const idx = 12 - Math.floor('))).length > 0, '(M6) sparkline um dia fora → vermelho')
ok(problems(load(SRC.replace('  const ext = list.filter((a) => !a.internal)', '  const ext = list'))).length > 0, '(M7) conta da casa volta aos totais → vermelho')
ok(problems(load(SRC.replace('      if (d && !a.internal) d.clicks++', '      if (d) d.clicks++'))).length > 0, '(M8) clique da casa entra na série → vermelho')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
