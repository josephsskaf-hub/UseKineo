// KINEO-DUNNING-ACCOUNT-2026-09-25 — quem recebe o aviso de renovação recusada vai a /account trocar o cartão no
// "Manage billing". Deslogado, /account mandava a /login SEM destino e o login pousava na home. Prova: a página devolve
// /login?redirect=%2Faccount e o resolvedor REAL do login (lib/authRedirect.ts) transforma isso em /account.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let passou = 0
const falhas = []
const ok = (cond, nome) => { if (cond) passou++; else falhas.push(nome) }

const pagina = rd('app/(dashboard)/account/page.tsx')
const alvo = (pagina.match(/if \(!user\) redirect\('([^']+)'\)/) || [])[1] ?? null
ok(alvo === '/login?redirect=%2Faccount', `1. /account deslogado vai a /login levando o destino (${alvo})`)
const mod = { exports: {} }
vm.runInNewContext(ts.transpileModule(rd('lib/authRedirect.ts'), { compilerOptions: { module: 1, target: 9 } }).outputText, { module: mod, exports: mod.exports, URL })
const destino = alvo ? new URL(alvo, 'https://www.usekineo.com').searchParams.get('redirect') : null
ok(mod.exports.resolveAuthRedirect(destino, '/') === '/account', `2. o resolvedor do login devolve /account para esse destino (${destino})`)
ok(/\?redirect=%2Faccount|\/account\?utm_source=lifecycle/.test(rd('app/api/admin/send-renewal-declined/route.ts')), '3. a carta de renovação recusada segue apontando para /account (que agora leva o destino pelo login)')

console.log(`test-dunning-account-2026-09-25: ${passou} ok · ${falhas.length} falhas`)
for (const x of falhas) console.log('  FAIL ' + x)
process.exit(falhas.length ? 1 : 0)
