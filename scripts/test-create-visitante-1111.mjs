// KINEO-CREATE-VISITANTE-1111 [CEO 11/11, ronda de estabilização: "/create sem aba, visitante: em vez da tela antiga
// 'Generate a Short in one click', vai para /signup?redirect=/create/film. Não apague a tela antiga; só o destino do visitante."]
// Roda a página de verdade (app/(dashboard)/create/page.tsx) com o usuário e o redirect simulados. Offline: sem rede, sem banco.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { loader, read, ROOT } = require('../docs/recreate-0911/test-recreate.cjs')
const React = require(join(ROOT, 'node_modules/react'))

const PAGE = 'app/(dashboard)/create/page.tsx'
const RELEASE = 'lib/create/release.ts'
const CUSTOMER = 'customer@example.org'
let passed = 0
const ok = (cond, msg) => { assert(cond, msg); passed++ }

async function visit(user, o = {}) {
  const OldScreen = () => null
  const stubs = {
    'next/navigation': { redirect: href => { throw Object.assign(new Error('NEXT_REDIRECT'), { href }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    './CreateClient': { __esModule: true, default: OldScreen },
  }
  const page = loader(stubs, o)(PAGE.replace(/\.tsx$/, ''))
  try {
    const el = await page.default()
    const kids = React.Children.toArray(el.props.children)
    return { screen: kids.some(k => k.type === OldScreen) ? 'old' : 'other' }
  } catch (e) {
    if (e.message === 'NEXT_REDIRECT') return { redirect: e.href }
    throw e
  }
}

const withRelease = (o, value) => ({ ...o, [RELEASE]: (o[RELEASE] ?? read(RELEASE)).replace(/CREATE_SHELL_RELEASE: InternalRelease = '[a-z]+'/, `CREATE_SHELL_RELEASE: InternalRelease = '${value}'`) })

async function all(o = {}) {
  // Interruptor no ar ('public'): visitante → cadastro com /create/film de destino; conta logada → /create/film.
  ok((await visit(null, o)).redirect === '/signup?redirect=%2Fcreate%2Ffilm', "visitante em /create vai a /signup?redirect=/create/film (não à tela antiga)")
  ok((await visit({ email: CUSTOMER }, o)).redirect === '/create/film', 'conta logada em /create vai a /create/film')
  // A tela antiga não foi apagada: segue para conta logada fora do interruptor ('internal' e 'off').
  for (const value of ['internal', 'off']) {
    ok((await visit({ email: CUSTOMER }, withRelease(o, value))).screen === 'old', `'${value}': conta de fora segue na tela antiga`)
    ok((await visit(null, withRelease(o, value))).screen === 'old', `'${value}': sem a porta nova, o visitante não é mandado a uma aba fechada`)
  }
  const src = o[PAGE] ?? read(PAGE)
  ok(src.includes('<CreateClient />') && src.includes("import CreateClient from './CreateClient'"), 'a tela antiga continua no arquivo')
  ok(src.includes("export const metadata = { title: 'Create — Kineo' }"), 'título da aba intacto')
}

await all()
const real = passed

const src = read(PAGE)
const mutants = [
  ['porta do visitante removida', { [PAGE]: src.replace('if (!user) {', 'if (false) {') }],
  ['visitante mandado à aba errada', { [PAGE]: src.replace("createShellDecision('film', null)", "createShellDecision('cartoon', null)") }],
  ['visitante vai direto a /create/film sem cadastro', { [PAGE]: src.replace('if (porta.kind === \'signup\') redirect(porta.href)', "redirect('/create/film')") }],
  ['tela antiga apagada', { [PAGE]: src.replace('<CreateClient />', '<></>') }],
  ['conta logada perde o /create/film', { [PAGE]: src.replace("if (createShellVisible(user?.email)) redirect('/create/film')", '') }],
]
let bitten = 0
for (const [name, o] of mutants) {
  passed = 0
  let died = false
  try { await all(o) } catch (e) { died = true; if (process.env.VERBOSE) console.log(`  ${name} → ${String(e.message).split('\n')[0]}`) }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-create-visitante-1111: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
