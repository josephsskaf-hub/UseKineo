// KINEO-BRASIL-VOLTA-2026-10-03 — o Brasil de volta ao filme grátis (fundador, 03/10) e o recrédito das contas BR que
// nasceram 'region_paid_only' entre 29/09 e 03/10. Prova EXECUTANDO lib/freeFilmPolicy.ts e lib/brRecredit.ts:
//   (1) BR na lista em UMA linha reversível; MX e os demais de fora continuam fora;
//   (2) conta BR nova passa na régua do trial e na régua ESTRITA da cota semanal;
//   (3) recrédito: só BR, só region_paid_only, sem pagar, plano grátis, criada depois de 29/09; patch = o grant do trial;
//   (4) a rota é admin, DRY-RUN por padrão, só aplica com ?confirm=APPLY, compare-and-set, evento só-servidor;
//   (5) mutantes.
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
const POL_SRC = read('lib/freeFilmPolicy.ts')
const F = load(POL_SRC)
const B = load(read('lib/brRecredit.ts'))
const ROUTE = read('app/api/admin/br-recredit/route.ts')
const EVENTS = read('app/api/events/route.ts')

console.log('1 — a lista')
const linhaBR = POL_SRC.split('\n').filter((l) => /'BR'/.test(l))
ok(linhaBR.length === 1 && /^\s*'BR', \/\/ KINEO-BRASIL-VOLTA-2026-10-03/.test(linhaBR[0]), 'BR entra numa linha só, marcada (reverter = apagar a linha)')
ok(F.PAISES_FILME_GRATIS.includes('BR') && !F.PAISES_FILME_GRATIS.includes('MX') && new Set(F.PAISES_FILME_GRATIS).size === F.PAISES_FILME_GRATIS.length, 'BR dentro, MX fora, sem repetição')
ok(['PK', 'IN', 'NG', 'MX'].every((c) => F.filmeGratisPermitido(c) === false), 'quem estava fora (exceto BR) continua fora')
ok(F.filmeGratisPermitido('BR') && F.filmeGratisPermitido('br') && F.paisDaListaConfirmado('BR') === 'BR', 'conta BR: trial no cadastro e cota semanal (régua estrita)')
ok(F.FREE_FILM_COUNTRY_CLAUSE === ' in supported countries', 'o texto público continua "in supported countries" (verdadeiro)')
const semBR = load(POL_SRC.replace(/^\s*'BR', \/\/ KINEO-BRASIL-VOLTA[^\n]*\n/m, ''))
ok(!semBR.filmeGratisPermitido('BR') && semBR.PAISES_FILME_GRATIS.length === F.PAISES_FILME_GRATIS.length - 1, 'apagar a linha reverte por inteiro')

console.log('2 — recrédito')
const base = { id: 'aaaaaaaa-1111-2222-3333-444444444444', trial_status: 'region_paid_only', has_paid: false, plan: 'free', video_credits: 0, created_at: '2026-10-01T12:00:00Z' }
ok(B.brRecreditEligible(base, 'BR'), 'BR region_paid_only sem pagar, criada em 01/10 → entra')
ok(!B.brRecreditEligible(base, 'PK') && !B.brRecreditEligible(base, null), 'outro país ou país desconhecido → fora')
ok(!B.brRecreditEligible({ ...base, has_paid: true }, 'BR') && !B.brRecreditEligible({ ...base, plan: 'starter' }, 'BR') && !B.brRecreditEligible({ ...base, trial_status: 'active' }, 'BR'), 'quem pagou, tem plano ou já tem trial → fora')
ok(!B.brRecreditEligible({ ...base, created_at: '2026-09-20T00:00:00Z' }, 'BR'), 'conta anterior a 29/09 → fora')
const patch = B.brRecreditPatch({ balance: 3, grantCredits: 10, variantDays: 7, variant: '7d', now: Date.parse('2026-10-03T00:00:00Z') })
ok(patch.trial_status === 'active' && patch.video_credits === 13 && patch.trial_credits_granted === 10 && patch.trial_variant === '7d' && patch.trial_ends_at === '2026-10-10T00:00:00.000Z', 'patch = o grant do trial (status, fim, saldo + 10, trial_credits_granted)')
ok(B.brRecreditCreditsTotal(28, 10) === 280 && B.brRecreditCreditsTotal(-1, 10) === 0, 'créditos totais = contas × trial')
const RT = read('lib/reverseTrial.ts')
ok(/trial_status: 'active',\s*\n\s*trial_ends_at: endsAt,\s*\n\s*trial_variant: variant,\s*\n\s*video_credits: \(balance \?\? 0\) \+ TRIAL_GRANT_CREDITS,(\s*\n\s*\/\/[^\n]*)*\s*\n\s*trial_credits_granted: TRIAL_GRANT_CREDITS,/.test(RT), 'o grant do trial que o patch espelha continua o mesmo em lib/reverseTrial.ts')

function routeProblems(src) {
  const p = []
  if (!/if \(!user \|\| !isAdminEmail\(user\.email\)\) return NextResponse\.json\(\{ error: 'Forbidden' \}, \{ status: 403 \}\)/.test(src)) p.push('rota sem porta de admin')
  if (!/export async function GET\(req: NextRequest\) \{\s*\n\s*return handle\(req, false\)/.test(src)) p.push('GET não é dry-run')
  if (!/return handle\(req, req\.nextUrl\.searchParams\.get\('confirm'\) === BR_RECREDIT_CONFIRM\)/.test(src)) p.push('POST aplica sem ?confirm=APPLY')
  if (!/\.eq\('trial_status', 'region_paid_only'\)/.test(src) || !/eq\('video_credits', p\.video_credits\)/.test(src)) p.push('apply sem compare-and-set')
  if (!/if \(!apply\) return NextResponse\.json\(\{ dry_run: true/.test(src)) p.push('dry-run não volta antes de escrever')
  if (/email: p\.|\.email\b(?!\))/.test(src.replace(/user\.email/g, ''))) p.push('lista expõe e-mail de cliente')
  return p
}
console.log('3 — rota admin')
const rp = routeProblems(ROUTE)
ok(rp.length === 0, 'app/api/admin/br-recredit' + (rp.length ? ': ' + rp.join('; ') : ''))
ok(B.BR_RECREDIT_CONFIRM === 'APPLY' && B.BR_RECREDIT_MAX_PER_CALL === 200, 'confirmação literal APPLY e teto por chamada')
ok(EVENTS.includes("  'admin_br_trial_recredited',"), 'o evento do recrédito não pode ser forjado pelo navegador')

console.log('Mutantes')
const mut = (label, probs) => ok(probs.length > 0, 'mutante pego: ' + label)
mut('GET aplicando', routeProblems(ROUTE.replace('return handle(req, false)', 'return handle(req, true)')))
mut('POST sem confirm', routeProblems(ROUTE.replace("req.nextUrl.searchParams.get('confirm') === BR_RECREDIT_CONFIRM", 'true')))
mut('apply sem CAS', routeProblems(ROUTE.replace(".eq('trial_status', 'region_paid_only')", '')))
const B2 = load(read('lib/brRecredit.ts').replace("if (p.has_paid === true) return false", ''))
ok(B2.brRecreditEligible({ ...base, has_paid: true }, 'BR') === true, 'mutante pego: sem a guarda de has_paid o pagante seria recreditado')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
