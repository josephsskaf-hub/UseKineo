// KINEO-LEMBRETE-COM-A-IDEIA-2026-10-03 — guardião do lembrete de ~1 h ("seu filme está esperando") com a ideia.
//
// Medido (30d, países do filme grátis): dos 50 que não tentaram gerar na 1ª hora, 47 receberam o send-activation-nudge
// (mediana 89 min após o cadastro) e 5 fizeram filme depois. A carta chegava — sem a ideia da pessoa, e também para
// quem NÃO pode gerar (region_paid_only / blocked).
//
// Prova: (1) a régua pura EXECUTADA (quem pode gerar, ideia citável, assunto, bloco sem preço/crédito); (2) o modo
// nasce 'dry_run' (a carta que sai é a de sempre); (3) a rota: recusa quem não pode gerar, lê a ideia dos eventos de
// chegada, só troca a carta em 'live', ?dry_run=1 não envia nem carimba, evento por envio, link sem create_intent;
// (4) a ideia é gravada nos dois eventos de chegada; (5) o agendamento do vercel.json NÃO mudou; (6) mutantes.
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

const SRC = read('lib/lifecycle/lembreteComIdeia.ts')

function problems(M) {
  const p = []
  // quem pode gerar
  for (const ts of ['region_paid_only', 'blocked', ' REGION_PAID_ONLY ']) if (M.podeGerarParaLembrete({ trial_status: ts })) p.push(`${ts.trim()} recebe "seu filme grátis"`)
  for (const ts of [null, undefined, 'active', 'downgraded', 'converted']) if (!M.podeGerarParaLembrete({ trial_status: ts })) p.push(`${ts} perdeu o lembrete`)
  if (!M.podeGerarParaLembrete(null)) p.push('linha sem trial_status perdeu o lembrete')
  // ideia citável
  const IDEA = 'The lost city under Lake Titicaca'
  if (M.ideiaCitavel('  The lost   city under\nLake Titicaca ') !== IDEA) p.push('ideia não sai limpa')
  for (const bad of ['Create a 40-second Shorts video titled X', 'Absolutely. Below is a complete package', 'HOOK: something', 'see https://x.com/a', 'ab', '12345678', '', null, 42]) if (M.ideiaCitavel(bad) !== null) p.push(`ideia não citável passou: ${String(bad).slice(0, 30)}`)
  if ((M.ideiaCitavel('x'.repeat(10) + ' ' + 'y'.repeat(300)) ?? '').length > 120) p.push('ideia passou de 120')
  // a mais recente citável vence
  if (M.ideiaDoCadastro([{ metadata: { idea: null } }, { metadata: { idea: 'Create a video about cats' } }, { metadata: { idea: IDEA } }, { metadata: { idea: 'Older idea about volcanoes' } }]) !== IDEA) p.push('ideiaDoCadastro não pegou a mais recente citável')
  if (M.ideiaDoCadastro([]) !== null || M.ideiaDoCadastro([null, { metadata: 'x' }]) !== null) p.push('ideiaDoCadastro inventou ideia')
  // assunto
  const longa = 'Why the ancient builders of Sacsayhuamán cut stones that still fit perfectly today'
  const a = M.assuntoComIdeia(longa)
  if (!a.includes('…') || a.length > 110) p.push('assunto não corta ideia longa')
  if (M.assuntoComIdeia(IDEA) !== `Your film about “${IDEA}” is one click away`) p.push('assunto mudou')
  // bloco
  const b = M.blocoDaIdeia('<b>x</b> & "y"', 'https://www.usekineo.com/studio/create?prompt=x')
  if (b.html.includes('<b>x</b>') || !b.html.includes('&lt;b&gt;')) p.push('bloco HTML sem escape')
  if (/credit|\$|free|grátis|trial/i.test(b.text + b.html)) p.push('bloco da ideia promete crédito/preço/grátis')
  if (!b.text.includes('https://www.usekineo.com/studio/create?prompt=x')) p.push('bloco sem o link')
  if (M.LEMBRETE_COM_IDEIA !== 'live') p.push(`modo da ideia é '${M.LEMBRETE_COM_IDEIA}', não 'live' (decisão G do fundador, 05/10)`)
  return p
}

console.log('1-2 · a régua executada (e o modo nasce dry_run)')
const M = load(SRC)
const real = problems(M)
ok(real.length === 0, 'régua real: ' + (real.join(' | ') || 'limpa'))

console.log('3 · a rota send-activation-nudge')
const R = read('app/api/cron/send-activation-nudge/route.ts')
ok(/export const fetchCache = 'force-no-store'/.test(R), 'rota segue force-no-store')
ok(/\.select\('id, email, plan, created_at, activation_nudge_sent_at, trial_status'\)/.test(R), 'coorte lê trial_status')
const iPode = R.indexOf('if (!podeGerarParaLembrete(')
ok(iPode > 0 && iPode < R.indexOf("const res = await fetch('https://api.resend.com/emails'"), 'quem não pode gerar é recusado ANTES do envio')
ok(/semFilmePulados\+\+\s*\n\s*await carimbarPulo\(u\.id as string\)\s*\n\s*continue/.test(R), 'recusa carimba o SENTINELA (não um envio) e segue')
ok(/const carimbarPulo = async \(id: string\) => \{\s*\n\s*if \(dryRun\) return/.test(R), '?dry_run=1 não carimba nem o sentinela')
ok(!/await admin\s*\n\s*\.from\('profiles'\)\s*\n\s*\.update\(\{ activation_nudge_sent_at: LIFECYCLE_SKIP_STAMP \}\)\s*\n\s*\.eq\('id', u\.id\)/.test(R), 'nenhum carimbo de pulo escapa do helper (dry-run vale para todos)')
ok(/if \(dryRun\) continue\s*\n\s*\n\s*const \{ text, html \} = buildEmail\(/.test(R), '?dry_run=1 para antes de montar e enviar')
ok(/const dryRun = req\.nextUrl\.searchParams\.get\('dry_run'\) === '1'/.test(R), 'dry_run só por parâmetro explícito')
ok(/const usarIdeia = LEMBRETE_COM_IDEIA === 'live' && ideia !== null/.test(R), "a carta só muda em 'live'")
ok(/\.in\('name', \['auth_callback_completed', 'email_signup_completed'\]\)\s*\n\s*\.order\('created_at', \{ ascending: false \}\)/.test(R), 'ideia lida dos eventos de chegada, mais nova primeiro')
ok(/composerUrl\(\{ base: APP_URL, campaign: LEMBRETE_IDEIA_CAMPAIGN, prompt: ideia \}\)/.test(R), 'o botão da ideia usa composerUrl (prefill, nunca create_intent)')
ok(!/create_intent|autoanalyze/.test(R.replace(/^\s*\/\/.*$/gm, '')), 'a carta nunca arma auto-start')
ok(/name: 'activation_nudge_sent'/.test(R) && R.indexOf("name: 'activation_nudge_sent'") > R.indexOf('if (res.ok) {'), 'evento activation_nudge_sent só depois de envio confirmado')
ok(/with_idea: Boolean\(ideiaNaCarta\)/.test(R) && !/email: email|to: \[email\][^\n]*metadata/.test(R.slice(R.indexOf("name: 'activation_nudge_sent'"), R.indexOf("name: 'activation_nudge_sent'") + 600)), 'evento sem e-mail (PII)')
ok(/if \(!LIFECYCLE_EMAILS_ENABLED && !dryRun\)/.test(R), 'portão de e-mail de ciclo de vida continua valendo para envio real')

console.log('4 · a ideia é gravada nos dois eventos de chegada do cadastro')
const CB = read('app/auth/callback/route.ts')
ok(/idea: trechoDaIdeia\(destinoAntesDaIdeia\)/.test(CB), 'auth_callback_completed.metadata.idea (Google/Apple + confirmação de e-mail)')
const AC = read('app/api/auth/activation-completed/route.ts')
ok(/idea: trechoDaIdeia\(destination\)/.test(AC), 'email_signup_completed.metadata.idea (cadastro auto-confirmado)')

console.log('5 · agendamento intocado (decisão do fundador)')
const V = JSON.parse(read('vercel.json'))
const nudge = V.crons.filter((c) => c.path.startsWith('/api/cron/send-activation-nudge'))
ok(nudge.length === 1 && nudge[0].path === '/api/cron/send-activation-nudge' && nudge[0].schedule === '40 * * * *', 'send-activation-nudge segue "40 * * * *", sem parâmetro novo')

console.log('6 · mutantes (cada um tem que ser pego)')
const mut = (name, from, to) => {
  if (!SRC.includes(from)) { ok(false, `mutante "${name}" não aplicou`); return }
  let caught
  try { caught = problems(load(SRC.replace(from, to))).length > 0 } catch { caught = true }
  ok(caught, `mutante pego: ${name}`)
}
mut("modo volta a 'dry_run'", `LembreteComIdeiaModo = 'live'`, `LembreteComIdeiaModo = 'dry_run'`)
mut('region_paid_only volta a receber', `['region_paid_only', 'blocked']`, `['blocked']`)
mut('filtro de instrução some', `if (INSTRUCAO.test(t)) return null`, '')
mut('a ideia MAIS ANTIGA vence', `for (const l of linhas ?? []) {`, `for (const l of [...(linhas ?? [])].reverse()) {`)
mut('bloco sem escape', `“${'$'}{esc(ideia)}”`, `“${'$'}{ideia}”`)
mut('teto da ideia some', `.slice(0, IDEIA_MAX)`, '')

console.log(`\n${pass} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
