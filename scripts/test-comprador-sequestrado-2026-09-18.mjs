// KINEO-COMPRADOR-SEQUESTRADO-2026-09-18 — guardião: o Google não é mais auto-iniciado para quem clicou num plano.
// Medido: clique explícito 94% de volta; auto-início 23%. Sem rede, sem banco; decisão pura com mutante + montagem.
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

console.log('1) decisão pura')
const libSrc = rd('lib/growth/checkoutOauthAutostart.ts')
const lib = roda(libSrc)
const base = { checkoutReason: true, noauto: false, embedded: false, alreadyStarted: false }
checa('interruptor DESLIGADO', lib.CHECKOUT_OAUTH_AUTOSTART_ENABLED === false)
checa('comprador em navegador normal: NÃO auto-inicia, motivo medido', lib.decideCheckoutOauthAutostart(base).start === false && lib.decideCheckoutOauthAutostart(base).reason === 'disabled_by_measurement')
checa('sem reason=checkout: não é o caso', lib.decideCheckoutOauthAutostart({ ...base, checkoutReason: false }).reason === 'not_checkout')
checa('noauto=1 continua honrado', lib.decideCheckoutOauthAutostart({ ...base, noauto: true }).reason === 'noauto_param')
checa('webview embutido continua com o motivo antigo (Google recusa lá)', lib.decideCheckoutOauthAutostart({ ...base, embedded: true }).reason === 'embedded_webview')
checa('trava anti-loop antiga vem antes do interruptor', lib.decideCheckoutOauthAutostart({ ...base, alreadyStarted: true }).reason === 'already_started')

console.log('2) mutante: religar o interruptor volta a sequestrar (o guardião pegaria)')
const mut = libSrc.replace('export const CHECKOUT_OAUTH_AUTOSTART_ENABLED = false', 'export const CHECKOUT_OAUTH_AUTOSTART_ENABLED = true')
checa('mutante aplicou', mut !== libSrc)
checa('com o interruptor ligado o comprador seria sequestrado de novo', roda(mut).decideCheckoutOauthAutostart(base).start === true)

console.log('3) montagem no cadastro')
const pg = rd('app/(auth)/signup/page.tsx')
checa('cadastro importa a decisão', pg.includes("import { decideCheckoutOauthAutostart } from '@/lib/growth/checkoutOauthAutostart'"))
checa('a decisão roda ANTES do signInWithOAuth automático e devolve a tela quando diz não', /const autostart = decideCheckoutOauthAutostart\(\{[\s\S]{0,600}\}\)\s*\n\s*if \(!autostart\.start && autostart\.reason === 'disabled_by_measurement'\) \{[\s\S]{0,600}return\s*\n\s*\}/.test(pg) && pg.indexOf('const autostart = decideCheckoutOauthAutostart(') < pg.indexOf(".signInWithOAuth({ provider: 'google', options: { redirectTo: callback } })"))
checa('a supressão é medida com o motivo e a versão', /checkout_oauth_autostart_suppressed', \{ reason: autostart\.reason, version: autostart\.version \}/.test(pg))
checa('a tela de escolha continua: plano salvo + botão do Google explícito', pg.includes('{checkoutChoice.summary}') && pg.includes('<GoogleSignInButton') && pg.includes("analyticsSurface=\"signup_page\""))
checa('o botão explícito continua marcando method_selected google (a medição de 7 dias depende disso)', rd('components/GoogleSignInButton.tsx').includes("trackCheckoutAuthStep('method_selected', analyticsSurface, redirectTo, 'google')"))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
