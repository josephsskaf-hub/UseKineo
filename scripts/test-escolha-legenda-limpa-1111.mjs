import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
function loader(over = {}) {
  const cache = new Map()
  const load = (path) => {
    if (cache.has(path)) return cache.get(path).exports
    const module = { exports: {} }; cache.set(path, module)
    const req = (name) => {
      if (name.startsWith('node:')) return nativeRequire(name)
      const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), name)) : null
      const target = base && [base, `${base}.ts`, `${base}.tsx`].find((p) => existsSync(join(root, p)))
      if (!target) return new Proxy({}, { get: () => () => ({}) })
      return load(target)
    }
    const js = ts.transpileModule(over[path] ?? read(path), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', 'process', 'fetch', js)(req, module, module.exports, { env: {} }, () => { throw new Error('rede proibida') })
    return module.exports
  }
  return load
}
// KINEO-ESCOLHA-LEGENDA-LIMPA-1111 — SPEC-ADS-PESSOA-FALANDO §6: a legenda das 4 fotos da Escolha mostrava o código interno do juiz
// ("anatomy·unassessed·no_reversed_knees"). Trava (Node puro): (a) na tela vão só as frases para gente, na mesma ordem; (b) a lista de fotos
// devolvida ao cliente passa pelo filtro; o registro de qualidade (admin) continua com os códigos. Mutante no fim.
const ST = 'lib/ads/cena/escolhaStills.ts'
const REAIS = ['Product label is clear and unchanged', 'anatomy:unassessed:no_reversed_knees', 'anatomy:five_fingers:false', 'Selected face or outfit differs; review before choosing.']
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let S
  try { const src = over[ST] ?? read(ST); const i = src.indexOf('export function escolhaMotivosParaCliente'); const j = src.indexOf('\n}\n', i) + 3; const m = { exports: {} }; new Function('module', 'exports', ts.transpileModule(src.slice(i, j), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(m, m.exports); S = m.exports } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const limpos = S.escolhaMotivosParaCliente(REAIS)
  no(JSON.stringify(limpos) !== JSON.stringify([REAIS[0], REAIS[3]]), `(a) → ${JSON.stringify(limpos)}`)
  const st = over[ST] ?? read(ST)
  no(!st.includes('reasons: escolhaMotivosParaCliente(j.verdict?.reasons ?? [])'), '(b) a lista do cliente não passa pelo filtro')
  no(!st.includes("reasons.push(`anatomy:unassessed:${unknown.join(',')}`)"), '(b) o registro do admin perdeu o código')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (a legenda das fotos sem código interno; o admin com tudo)')
const st = read(ST)
const MUT = [
  ['M1 o cliente volta a ver os códigos', { [ST]: st.replace('reasons: escolhaMotivosParaCliente(j.verdict?.reasons ?? [])', 'reasons: j.verdict?.reasons ?? []') }],
  ['M2 o filtro não tira nada', { [ST]: st.replace("!/^anatomy:/u.test(r.trim())", 'true') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
