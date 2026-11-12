// KINEO-AUTH-LETRA-12-1211 [CEO 12/11, entrada como visitante no celular]: no /signup e no /login (par fixo: mexeu num, mexe no outro)
// nenhum texto abaixo de 12 px e os links pequenos com área de toque maior sem mudar o desenho. A raiz do site é 14 px, então o
// text-xs do Tailwind (0,75 rem) dava 10,5 px nos rótulos Email/Password, em "or sign up with email" e em "← Back to Home".
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const SIGNUP = 'app/(auth)/signup/page.tsx'
const LOGIN = 'app/(auth)/login/page.tsx'
let passed = 0
const ok = (c, m) => { assert(c, m); passed++ }
const semComentario = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

function all(o = {}) {
  const src = p => (o[p] ?? read(p)).replace(/\r\n/g, '\n')
  for (const f of [SIGNUP, LOGIN]) {
    const s = semComentario(src(f))
    const classes = [...s.matchAll(/className="([^"]*)"/g)].map(m => m[1])
    ok(classes.length > 20, `${f}: classes lidas (${classes.length})`)
    const pequenas = classes.filter(c => /\btext-(?:xs|\[(?:[0-9]|1[01])(?:\.\d+)?px\])(?:\s|$)/.test(c))
    ok(pequenas.length === 0, `${f}: classe de letra abaixo de 12 px → ${pequenas.join(' | ')}`)
    // px direto, número solto (px no React) ou rem/em (× 14, a raiz do site)
    const px = [...s.matchAll(/fontSize:\s*'?(\d+(?:\.\d+)?)(px|rem|em)?'?(?=\s*[,}])/g)].map(m => Number(m[1]) * (m[2] === 'rem' || m[2] === 'em' ? 14 : 1)).filter(v => v < 12)
    ok(px.length === 0, `${f}: fontSize abaixo de 12 → ${px.join(', ')}`)
    ok(/className="inline-block text-\[12px\] font-bold -mt-2 mb-2 py-2"/.test(s), `${f}: "← Back to Home" com área de toque (py-2) e o mesmo espaço de antes (-mt-2 mb-2)`)
  }
  ok(/href=\{loginHref\}\n\s*className="inline-block -my-2 py-2 font-semibold/.test(src(SIGNUP)), 'signup: "Sign in" com área de toque sem mudar a linha')
  const l = src(LOGIN)
  ok(/href=\{`\/signup\$\{authSearch\}`\}\n\s*className="inline-block -my-2 py-2 font-semibold/.test(l), 'login: "Sign up" com área de toque')
  ok(/href=\{forgotPasswordHref\}\n\s*className="inline-block -my-2 py-2 text-\[12px\] font-semibold"/.test(l), 'login: "Forgot password?" com área de toque')
}

all()
const real = passed
const mutants = [
  ['rótulo Email volta ao text-xs', { [SIGNUP]: read(SIGNUP).replace('className="block text-[12px] font-bold mb-2 uppercase tracking-wider"', 'className="block text-xs font-bold mb-2 uppercase tracking-wider"') }],
  ['login com text-[10px]', { [LOGIN]: read(LOGIN).replace('className="text-[12px] font-semibold uppercase tracking-wider"', 'className="text-[10px] font-semibold uppercase tracking-wider"') }],
  ['Back to Home perde a área de toque', { [LOGIN]: read(LOGIN).replace('inline-block text-[12px] font-bold -mt-2 mb-2 py-2', 'inline-block text-[12px] font-bold mb-4') }],
  ['Sign in volta a 17 px de altura', { [SIGNUP]: read(SIGNUP).replace('className="inline-block -my-2 py-2 font-semibold transition-colors"', 'className="font-semibold transition-colors"') }],
  ['aviso pós-cadastro volta a 0.78rem (10,9 px)', { [SIGNUP]: read(SIGNUP).replace("fontSize: '12px', fontWeight: 900", "fontSize: '0.78rem', fontWeight: 900") }],
  ['Forgot password volta pequeno', { [LOGIN]: read(LOGIN).replace('className="inline-block -my-2 py-2 text-[12px] font-semibold"', 'className="text-[12px] font-semibold"') }],
]
let bitten = 0
for (const [name, o] of mutants) {
  if (Object.entries(o).some(([p, v]) => v === read(p))) throw new Error(`mutante não aplicou: ${name}`)
  passed = 0
  let died = false
  try { all(o) } catch { died = true }
  assert(died, `MUTANTE SOBREVIVEU: ${name}`)
  bitten++
}
console.log(`test-auth-letra-12-1211: ${real} verificações verdes · ${bitten}/${mutants.length} mutantes mortos`)
