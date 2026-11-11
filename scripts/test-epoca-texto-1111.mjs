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
      assert(target, `dependência externa: ${name}`)
      return load(target)
    }
    const js = ts.transpileModule(over[path] ?? read(path), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', 'process', 'fetch', js)(req, module, module.exports, { env: {} }, () => { throw new Error('rede proibida') })
    return module.exports
  }
  return load
}
// KINEO-EPOCA-TEXTO-1111 — tabela de cobertura (CEO 11/11): a regra da casa (KINEO-EPOCA-POSITIVA-1111) é falar a época em POSITIVO — o motor
// desenha o que é nomeado (Pompeia saiu com tanques depois de "no tanks"). Dois textos ainda nomeavam o proibido: o exemplo do planejador de
// cenas ("— NEVER tanks, cars, helicopters or modern uniforms", app/api/analyze-idea) e a frase de época do S25 ("…, no modern items",
// lib/hollywood/s25Cena.ts). Trava (Node puro, sem rede): (a) o exemplo do planejador só nomeia o que existia; (b) a época do S25, executada,
// não nega nada e descreve "exactly as it looked then". Mutantes no fim.
const AI = 'app/api/analyze-idea/route.ts', S25 = 'lib/hollywood/s25Cena.ts'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  const ai = over[AI] ?? read(AI)
  const linha = ai.split('\n').find((l) => l.includes('PERIOD ACCURACY (KINEO-ERA-LOCK-2026-07-09)')) ?? ''
  no(!linha, '(a) a regra de época do planejador sumiu')
  no(/NEVER tanks|tanks, cars, helicopters|modern uniforms/i.test(linha), '(a) o exemplo do planejador voltou a nomear objeto moderno')
  no(!/dirt roads and horse-drawn carts/.test(linha), '(a) o exemplo positivo sumiu')
  let S
  try { S = loader(over)(S25) } catch (e) { return [...p, `s25 não carrega: ${e.message}`] }
  const e1 = S.epocaDoFilmeS25('In 79 AD, Mount Vesuvius buried Pompeii under ash.')
  no(/no modern|modern items|\bno\b/i.test(String(e1)) || !/exactly as it looked then/.test(String(e1)), `(b) S25 79 AD → ${e1}`)
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (planejador e S25 falam a época só em positivo)')
const ai = read(AI), s25 = read(S25)
const MUT = [
  ['M1 o exemplo volta a nomear tanques', { [AI]: ai.replace('dirt roads and horse-drawn carts (KINEO-EPOCA-TEXTO-1111', 'dirt roads — NEVER tanks, cars, helicopters or modern uniforms (KINEO-EPOCA-TEXTO-1111') }],
  ['M2 o S25 volta a negar', { [S25]: s25.replace('buildings only, everything exactly as it looked then.`', 'buildings only, no modern items.`') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
