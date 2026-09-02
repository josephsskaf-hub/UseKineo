// sprint-assinaturas #18 — verificacoes da parte pura do resgate de filmes montados.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', n, msg) } else console.log('ok  ', n, msg) }

// reimplementacao literal para nao depender de transpiler (a fonte e conferida por texto abaixo)
const src = readFileSync(path.join(root, 'lib/admin/rescueComposedFilms.ts'), 'utf8')
const decideRescue = (a) => {
  if (a.internal) return 'internal'
  if (a.alreadyPersisted) return 'already_persisted'
  if (!a.state) return 'lookup_failed'
  if (a.state.status !== 'succeeded') return 'not_succeeded'
  if (!a.state.url) return 'file_gone'
  return 'persist'
}
ok(src.includes("if (args.internal) return 'internal'"), 'fonte: interno sai primeiro')
ok(src.includes("if (args.alreadyPersisted) return 'already_persisted'"), 'fonte: ja persistido = skip')
ok(src.includes("if (!args.state) return 'lookup_failed'"), 'fonte: sem resposta = lookup_failed')
ok(src.includes("if (args.state.status !== 'succeeded') return 'not_succeeded'"), 'fonte: so succeeded')
ok(src.includes("if (!args.state.url) return 'file_gone'"), 'fonte: sem url = arquivo sumiu')
ok(decideRescue({ internal: false, alreadyPersisted: false, state: { status: 'succeeded', url: 'https://x/y.mp4' } }) === 'persist', 'succeeded+url -> persist')
ok(decideRescue({ internal: true, alreadyPersisted: false, state: { status: 'succeeded', url: 'https://x' } }) === 'internal', 'conta interna nunca persiste')
ok(decideRescue({ internal: false, alreadyPersisted: true, state: { status: 'succeeded', url: 'https://x' } }) === 'already_persisted', 'ja na Library -> skip')
ok(decideRescue({ internal: false, alreadyPersisted: false, state: null }) === 'lookup_failed', 'Creatomate fora -> lookup_failed')
ok(decideRescue({ internal: false, alreadyPersisted: false, state: { status: 'failed', url: 'https://x' } }) === 'not_succeeded', 'render failed nunca persiste')
ok(decideRescue({ internal: false, alreadyPersisted: false, state: { status: 'succeeded', url: '' } }) === 'file_gone', 'succeeded sem url -> file_gone')

const route = readFileSync(path.join(root, 'app/api/admin/rescue-composed-films/route.ts'), 'utf8')
ok(route.includes("export const fetchCache = 'force-no-store'"), 'rota GET com interruptor do #17')
ok(route.includes("searchParams.get('confirm') === 'PERSIST'"), 'dry-run por padrao; ?confirm=PERSIST grava')
ok(route.includes("credits_used: 0"), 'linha resgatada nasce com credits_used=0 (credito ja voltou)')
ok(route.includes("if (verdict === 'persist' && confirm && state?.url)"), 'so grava com veredito persist + confirm + url')
ok(route.includes("error.code !== '23505'"), 'duplicata pelo indice unico nao e erro')
ok(route.includes("name: STAMP") && route.includes("const STAMP = 'rescued_film_persisted'"), 'evento rescued_film_persisted')
ok(!route.includes('resend') && !route.includes('sendEmail'), 'nao envia e-mail')
ok(route.includes("ADMIN_EMAILS.has(adminEmail)"), 'so admin')
console.log(`\n${n - fail}/${n} verificacoes ok`)
process.exit(fail ? 1 : 0)
