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
// KINEO-SUPERFICIE-NEGADA-1111 — vigia 11/11 (Mona Lisa 1911, H3 Max, 6,5): a trava de época termina em "absolutely no present-day smartphones… no
// LED screens", e a proteção de superfície contava a tela NEGADA como presente — as 3 cenas sem tela nenhuma (o Louvre, o avental, o baú) ganharam
// "Every screen glows with soft abstract light and colour." e o motor desenhou uma tela colorida brilhando no baú e na moldura. Trava (Node puro,
// sem rede), com os prompts REAIS: (a) cena de época sem superfície fica byte a byte; (b) tela/celular/placa citados em positivo continuam ganhando a
// frase; (c) negado em qualquer forma ("without a phone", "never a sign") não conta; (d) o plano do Kling 4 também não ganha a tela. Mutante no fim.
const R = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-monalisa-1111.json'), 'utf8'))
const SUP = 'lib/cinematic/superficieSemTexto.ts'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let U, K, S
  try { const load = loader(over); U = load(SUP); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  for (const [cena, prompt] of Object.entries(R.cenas)) {
    no(U.comSuperficieSemTexto(prompt) !== prompt, `(a) cena ${cena}: a tela negada virou superfície → …${U.comSuperficieSemTexto(prompt).slice(-90)}`)
    const plano = K.promptDaCenaKling4(prompt, S.deriveStyleAnchor('photorealistic documentary'), 0, true)
    no(/Every screen glows/.test(plano), `(d) cena ${cena}: o plano do Kling 4 ganhou a tela`)
  }
  for (const [nome, t, frase] of [['celular na mão', 'A man in 2024 checks his smartphone at the bus stop.', 'Every screen glows'], ['placa', 'A neon sign above the bar flickers.', 'Every sign is a plain block of colour'], ['lousa', 'A teacher writes on the chalkboard.', 'The board is covered only']])
    no(!U.comSuperficieSemTexto(t).includes(frase), `(b) ${nome}: a superfície em positivo perdeu a frase`)
  for (const t of ['A girl walks home without a phone, smiling.', 'An empty street, never a sign in sight.', 'A quiet room with no screens and no books.'])
    no(U.comSuperficieSemTexto(t) !== t, `(c) negado contou: ${t}`)
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (tela negada na trava de época não vira tela brilhando; a positiva continua)')
const sup = read(SUP)
const MUT = [
  ['M1 a negação volta a contar', { [SUP]: sup.replace(".replace(/\\b(?:absolutely\\s+)?(?:no|without|never)\\b[^,;.]*/giu, ' ')", '') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
