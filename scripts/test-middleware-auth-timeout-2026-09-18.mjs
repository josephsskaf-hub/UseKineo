// KINEO-MIDDLEWARE-AUTH-TIMEOUT-2026-09-18 — guardião: o middleware não espera a autenticação para sempre.
// Incidente de 18/09: Supabase Auth degradado → 504 em toda página por 25 s de espera. Sem rede, sem banco.
// Transpila lib/supabase/middleware.ts com stubs e prova o comportamento com relógio falso.
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

const src = rd('lib/supabase/middleware.ts')
console.log('1) a regra está escrita onde decide')
checa('limite de 4 s exportado e marcador de log nomeado', src.includes('export const AUTH_TIMEOUT_MS = 4000') && src.includes("export const AUTH_TIMEOUT_MARK = '[middleware] auth timeout — served as anonymous'"))
checa('getUser passa pelo limite (não há mais await direto em auth.getUser)', src.includes('const user = await getUserWithTimeout(() => supabase.auth.getUser(), pathname)') && !/=\s*await supabase\.auth\.getUser\(\)/.test(src))
checa('estourou → visitante (null), nunca lança; erro → visitante; timer sempre limpo', src.includes("if (result === 'timeout') {") && src.includes('return null') && src.includes('} catch (e) {') && src.includes('if (timer) clearTimeout(timer)'))
checa('cookies não são tocados no caminho de falha (setAll só via o cliente do Supabase)', (src.match(/supabaseResponse\.cookies\.set/g) || []).length === 1)

console.log('2) comportamento com relógio falso')
// Stubs: o cliente do Supabase é substituído por um leitor que demora N ms; NextResponse é um objeto mínimo.
function carregar(delayMs, falha = false) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  const stubs = {
    '@supabase/ssr': { createServerClient: () => ({ auth: { getUser: () => new Promise((res, rej) => setTimeout(() => falha ? rej(new Error('AuthRetryableFetchError')) : res({ data: { user: { id: 'u1' } } }), delayMs)) } }) },
    'next/server': { NextResponse: { next: () => ({ cookies: { set() {} }, kind: 'next' }), redirect: (u) => ({ kind: 'redirect', url: typeof u === 'string' ? u : `${u.pathname ?? ''}?${u.searchParams ? u.searchParams.toString() : ''}` }) } },
    '@/lib/authRedirect': { resolveAuthRedirect: (r, d) => r || d },
  }
  new Function('module', 'exports', 'require', js)(m, m.exports, (id) => { if (!(id in stubs)) throw new Error('unexpected import ' + id); return stubs[id] })
  return m.exports
}
const req = (pathname) => ({ cookies: { getAll: () => [], set() {} }, nextUrl: { pathname, searchParams: new URLSearchParams(), clone() { return { pathname, searchParams: new URLSearchParams(), search: '' } } } })
const warns = []
const origWarn = console.warn; console.warn = (...a) => warns.push(a.join(' '))
try {
  const rapido = carregar(10)
  const r1 = await rapido.updateSession(req('/history'))
  checa('auth rápida: usuário lido, rota protegida NÃO redireciona', r1.kind === 'next')
  const lento = carregar(rapido.AUTH_TIMEOUT_MS + 300)
  const t0 = Date.now()
  const r2 = await lento.updateSession(req('/studio'))
  const dt = Date.now() - t0
  checa('auth lenta: página pública responde em ~4 s como visitante (não 25 s)', r2.kind === 'next' && dt < rapido.AUTH_TIMEOUT_MS + 250)
  const r3 = await lento.updateSession(req('/history'))
  checa('auth lenta em rota protegida: manda para o login em vez de cair', r3.kind === 'redirect' && r3.url.includes('/login'))
  const quebrado = carregar(5, true)
  const r4 = await quebrado.updateSession(req('/studio'))
  checa('auth com erro: página pública responde como visitante', r4.kind === 'next')
  checa('cada falha vira um warn com o marcador (3 ocorrências: lento×2 + erro)', warns.filter((w) => w.includes(rapido.AUTH_TIMEOUT_MARK)).length === 3)
} finally { console.warn = origWarn }

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
