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
// KINEO-PLANO-COM-ACAO-1111 — reprise dos 6 filmes (CEO 11/11): no argentinossauro (e9418905, 6,5) os planos 2 e 3 saíram iguais e sem ação —
// a ordem do protagonista ("The only person in this shot is the same main character (…); any other person…") e o look do meio repetido
// ocupavam o plano, e o gancho que o planejador escreveu ("measuring tape … 35 meters", "ten yellow school buses") caía no corte. No vizinho
// (f2e8cffc) o sujeito obrigatório ("Main subject clearly visible in frame: a new palace.") virava a 1ª frase e a ação real sumia.
// Trava (Node puro, sem rede), com os prompts REAIS dos dois despachos. Mutantes no fim.
const A = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-e9418905-1111.json'), 'utf8'))
const V = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-f2e8cffc-1111.json'), 'utf8'))
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let K, S
  try { const load = loader(over); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const tresD = S.deriveStyleAnchor('stylized 3D animated film'), foto = S.deriveStyleAnchor('photorealistic documentary')
  const pa = A.plan.map((x, i) => K.promptDaCenaKling4(x.prompt, tresD, i, true))
  no(!/measuring tape alongside it/.test(pa[1]), `argentino plano 2: o gancho (fita de 35 m) caiu → ${pa[1].slice(0, 260)}`)
  no(!/ten yellow school buses/.test(pa[2]), `argentino plano 3: o gancho (10 ônibus) caiu → ${pa[2].slice(0, 260)}`)
  no(pa[1] === pa[2], 'argentino: planos 2 e 3 iguais')
  for (const [i, t] of pa.entries()) {
    no(/The only person in this shot is the same main character/.test(t), `argentino plano ${i + 1}: a ordem do protagonista voltou a ocupar o plano`)
    no(/not photorealistic\.\s+(?:A |The |Medium)/.test(t), `argentino plano ${i + 1}: o look do meio repetido na ação`)
    no(Array.from(t).length > 512 - 61 || !t.endsWith(' Mouth closed, no speaking.'), `argentino plano ${i + 1}: tamanho ou cauda`)
  }
  const v1 = K.promptDaCenaKling4(V.plan[0].prompt, foto, 0, true)
  no(!/A tracking shot follows a stack of moving boxes/.test(v1), `vizinho cena 1: a ação real caiu → ${v1.slice(0, 260)}`)
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (argentino: fita de 35 m e 10 ônibus nos planos 2 e 3, diferentes; vizinho: a ação real na cena 1)')
const fq = read('lib/cinematic/filmQuality.ts')
const MUT = [
  ['M1 a ordem do protagonista fica', { 'lib/cinematic/filmQuality.ts': fq.replace("if (identity || cast) action = action.replace(/The only person", "if (false) action = action.replace(/The only person") }],
  ['M2 o look do meio fica na ação', { 'lib/cinematic/filmQuality.ts': fq.replace("if (lookDoMeio) action = action.split(", "if (false) action = action.split(") }],
  ['M3 o sujeito obrigatório volta à frente', { 'lib/cinematic/filmQuality.ts': fq.replace("if (sujeitoNaFrente && !", "if (false && !") }],
]
for (const [nome, over] of MUT) {
  const novo = Object.values(over)[0]
  if (novo === fq) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const v = problems(over)
  if (!v.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${v[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
