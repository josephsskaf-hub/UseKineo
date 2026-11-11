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
// KINEO-RELOGIO-PONTEIROS-1111 — reprise dos 6 filmes (CEO 11/11): o vizinho (f2e8cffc, nota 6,0) tinha no prompt "a clock on the wall showing
// 02:46" e o relógio saiu ~8:40 — toda cena leva "no readable text, letters, numbers…" e o motor não desenha 02:46 em dígitos. Trava (Node puro,
// sem rede), com o prompt REAL da cena do relógio: (a) vira relógio de ponteiros apontando para 2:46, mostrador sem dígitos; (b) o plano do
// Kling 4 leva isso; (c) controles: relógio sem hora, torre do relógio e texto sem relógio ficam iguais; "digital" sai; 23:59 → 11:59;
// (d) a rota aplica em toda cena. Mutantes no fim.
const R = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-f2e8cffc-1111.json'), 'utf8'))
const LIB = 'lib/cinematic/relogioComPonteiros.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let M, K, S
  try { const load = loader(over); M = load(LIB); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const real = R.plan[1].prompt
  no(!/clock on the wall showing 02:46/.test(real), 'premissa: o prompt real mudou')
  const novo = M.relogioComPonteiros(real)
  no(!novo.includes('clock on the wall whose hands point to 2:46 (an analog face with plain tick marks and no digits)') || /showing 02:46/.test(novo), `(a) vizinho: o relógio não virou de ponteiros → ${novo.slice(0, 200)}`)
  const plano = K.promptDaCenaKling4(novo, S.deriveStyleAnchor('photorealistic documentary'), 1, true)
  no(!/hands point to 2:46/.test(plano) || Array.from(plano).length > 512, `(b) o plano do Kling 4 perdeu a hora → ${plano.slice(0, 200)}`)
  for (const t of ['An old clock tower stands over the square at dawn.', 'A broken clock lies on the floor.', 'A man waits at the station for 20 minutes.'])
    no(M.relogioComPonteiros(t) !== t, `(c) mudou o que não é relógio com hora: ${t}`)
  no(M.relogioComPonteiros('A digital clock showing 23:59 on the nightstand.') !== 'A clock whose hands point to 11:59 (an analog face with plain tick marks and no digits) on the nightstand.', `(c) digital 23:59 → ${M.relogioComPonteiros('A digital clock showing 23:59 on the nightstand.')}`)
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes('classicScenePrompts[i] = relogioComPonteiros(classicScenePrompts[i])'), '(d) a rota não aplica o relógio de ponteiros')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (o 02:46 do vizinho vira ponteiros, sem dígitos, e chega ao plano do Kling 4)')
const lib = read(LIB), rota = read(ROTA)
const MUT = [
  ['M1 o relógio fica em dígitos', { [LIB]: lib.replace("return String(prompt ?? '').replace(RELOGIO_RE,", "return String(prompt ?? '') || String(prompt ?? '').replace(RELOGIO_RE,") }],
  ['M2 o "digital" fica', { [LIB]: lib.replace(".replace(/(?<![\\p{L}])digital\\s+/iu, '')", '') }],
  ['M3 a rota não aplica', { [ROTA]: rota.replace('classicScenePrompts[i] = relogioComPonteiros(classicScenePrompts[i])', 'classicScenePrompts[i] = classicScenePrompts[i]') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
