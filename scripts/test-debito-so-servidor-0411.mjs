// KINEO-DEBITO-SO-SERVIDOR-0411 — guardião.
// Caso: debit_video_credits era executável por qualquer logado e gravava o custo escolhido pelo cliente. Custo enorme numa chave
// inventada virava crédito no estorno automático; custo 0 numa chave previsível tornava grátis o débito real.
// Prova: a lib só chama a variante _service, nenhum outro arquivo chama RPC de débito direto, o userId das rotas vem de sessão
// verificada ou do CRON_SECRET, e mutantes ficam vermelhos. Offline: só lê fontes.
import fs from 'node:fs'
import path from 'node:path'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }

function fontes(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) fontes(p, acc)
    else if (/\.tsx?$/.test(e.name)) acc.push(p)
  }
  return acc
}

const LIB = 'lib/credits/debit.ts'
const debit = lf(fs.readFileSync(LIB, 'utf8'))
const todas = ['app', 'lib', 'components'].flatMap((d) => fontes(d)).map((p) => p.replace(/\\/g, '/'))
const lidas = new Map(todas.map((p) => [p, lf(fs.readFileSync(p, 'utf8'))]))
const chamadores = todas.filter((p) => p !== LIB && /\bdebitVideoCredits\(/.test(lidas.get(p)))

function provasLib(d) {
  const e = []
  if (/rpc\('debit_video_credits',/.test(d)) e.push('a lib chama o RPC de sessão')
  if (!/db\.rpc\('debit_video_credits_service', \{[^}]*p_cost: args\.cost,[^}]*p_user: args\.userId/.test(d)) e.push('a lib não chama a variante _service com o usuário explícito')
  if (!/const db = args\.service \? supabase : serviceDebitClient\(\)/.test(d)) e.push('o client do débito não é o admin')
  if (!/process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(d)) e.push('o client do débito não usa a chave de serviço')
  if (!/if \(!db\) \{[\s\S]{0,160}return \{ data: null, error:/.test(d)) e.push('sem chave de serviço o débito não falha fechado')
  return e
}
const base = provasLib(debit)
checa(`a lib só debita pela variante de serviço${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)

const diretos = todas.filter((p) => p !== LIB && /rpc\(\s*['"`]debit_(video_credits|video_credits_service|avatar_credit)['"`]/.test(lidas.get(p)))
checa(`nenhum outro arquivo chama RPC de débito direto${diretos.length ? ': ' + diretos.join(', ') : ''}`, diretos.length === 0)

// O usuário agora é parâmetro confiado: cada chamador tem de tirá-lo de sessão verificada ou do modo serviço com CRON_SECRET.
const ORIGEM_ACEITA = [/userId: user\.id\b/, /^\s*userId,\s*$/m, /userId: account\.userId\b/, /userId: args\.userId\b/, /userId,\s*renderId/, /\{ userId, renderId/]
const semOrigem = chamadores.filter((p) => !ORIGEM_ACEITA.some((re) => re.test(lidas.get(p).slice(lidas.get(p).search(/\bdebitVideoCredits\(/)))))
checa(`todo chamador passa um usuário de origem conhecida (${chamadores.length} arquivos)${semOrigem.length ? ': ' + semOrigem.join(', ') : ''}`, chamadores.length >= 15 && semOrigem.length === 0)

const avatar = lidas.get('app/api/generate-avatar/route.ts') ?? ''
checa('generate-avatar tira o userId da sessão', /const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\)/.test(avatar) && /const userId = user\.id/.test(avatar))
const clips = lidas.get('app/api/clips/route.ts') ?? ''
checa('clips monta a conta a partir do usuário da sessão', /await loadClipAccount\(supabase, user\)/.test(clips))
const compose = lidas.get('app/api/compose/status/[renderId]/route.ts') ?? ''
checa('o modo serviço de compose exige o segredo', /const isServiceFinish =\s*\n\s*!!svcSecret &&\s*\n\s*req\.headers\.get\('authorization'\) === `Bearer \$\{svcSecret\}`/.test(compose))

const MUTANTES = [
  ['volta ao RPC de sessão', debit.replace("db.rpc('debit_video_credits_service', {", "db.rpc('debit_video_credits', {")],
  ['usa o client de sessão', debit.replace('const db = args.service ? supabase : serviceDebitClient()', 'const db = supabase')],
  ['sem chave segue sem falhar', debit.replace("return { data: null, error: { message: 'debit service unavailable' } }", 'return { data: 0, error: null }')],
]
for (const [nome, m] of MUTANTES) checa(`mutante "${nome}" fica vermelho`, m !== debit && provasLib(m).length > 0)

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
