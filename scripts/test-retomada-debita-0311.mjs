// KINEO-RETOMADA-DEBITA-0311 [TRAVA 8.2 — fundador 03/11 "universalizar"; fal sem saldo 16:26] — guardião.
// Caso: a fila que retoma o filme estacionado quando a fal volta (app/api/cron/resume-parked-renders → POST da rota em modo serviço,
// sem sessão) NUNCA debitou: o RPC de sessão debit_video_credits levanta 'not authenticated' (log da Vercel 03/11 19:43 UTC) e a rota
// devolvia 503 "Your credit charge could not be confirmed". Medido: 449 render_parked_taken retry_later em 10 dias, 0 'resumed'
// (enzojimcua, 1º filme, ES, 03/11 16:26). Prova: a rota passa service: isServiceJob ao débito; a lib usa a variante _service com o
// usuário explícito só nesse caso; o caminho do clique (cookie) continua no RPC de sessão; mutantes ficam vermelhos.
import fs from 'node:fs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
const debit = lf(fs.readFileSync('lib/credits/debit.ts', 'utf8'))

function provas(r, d) {
  const e = []
  const i = r.indexOf('const { data, error } = await debitVideoCredits(supabase, {'), j = r.indexOf('})', i)
  if (i < 0 || !r.slice(i, j).includes('service: isServiceJob,')) e.push('o débito da rota não usa o modo serviço na retomada')
  if (!/const isServiceJob = !!process\.env\.CRON_SECRET && req\.headers\.get\('authorization'\) === `Bearer \$\{process\.env\.CRON_SECRET\}`/.test(r)) e.push('isServiceJob deixou de exigir o CRON_SECRET')
  if (!/args\.service \? supabase : serviceDebitClient\(\)/.test(d)) e.push('o modo serviço deixou de usar o client admin do chamador')
  if (!/db\.rpc\('debit_video_credits_service', \{[^}]*p_user: args\.userId/.test(d)) e.push('a lib não chama debit_video_credits_service com o usuário explícito')
  // KINEO-DEBITO-SO-SERVIDOR-0411 — o clique também passou para a variante _service; o RPC de sessão foi revogado.
  if (/rpc\('debit_video_credits',/.test(d)) e.push('a lib voltou a chamar o RPC de sessão')
  return e
}
const base = provas(rota, debit)
checa(`todas as provas verdes${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
const MUTANTES = [
  ['retomada volta ao RPC de sessão', () => provas(rota.replace('service: isServiceJob, // KINEO-RETOMADA-DEBITA-0311', ''), debit)],
  ['modo serviço sem segredo', () => provas(rota.replace("const isServiceJob = !!process.env.CRON_SECRET && ", 'const isServiceJob = '), debit)],
]
for (const [nome, fn] of MUTANTES) checa(`mutante "${nome}" fica vermelho`, fn().length > 0)
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
