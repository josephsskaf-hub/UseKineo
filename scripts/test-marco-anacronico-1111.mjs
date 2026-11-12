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
// KINEO-MARCO-ANACRONICO-1111 — vigia 11/11 (Mona Lisa 1911, H3 Max, 6,5): a cena 1 pedia "the Louvre's grand exterior at dawn, soft morning light
// illuminating its iconic glass pyramid" num filme travado em 1913, e a pirâmide de vidro (1989) abriu o filme. Trava (Node puro, sem rede), com o prompt
// REAL: (a) a pirâmide sai e entra o que estava ali; o resto do prompt fica; (b) marco anterior à época fica (Torre Eiffel em 1913); marco
// posterior sai (Torre Eiffel em 1850); prompt sem ano ou de hoje fica byte a byte; pirâmide sem Louvre (Egito, estufa vitoriana de vidro) fica; (c) a rota aplica nas duas
// estradas, antes das imagens-chave. Mutantes no fim.
const R = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-monalisa-1111.json'), 'utf8'))
const M = 'lib/cinematic/marcoAnacronico.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const era = (ano) => `, period piece set strictly in the year ${ano}: every person, building, street, vehicle and object belongs to that exact time`
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let A
  try { A = loader(over)(M) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const c1 = R.cenas['1'], s1 = A.semMarcoAnacronico(c1)
  no(/glass pyramid/i.test(s1) || !/stone palace façade/.test(s1), `(a) cena 1 real → ${s1.slice(150, 330)}`)
  no(s1.replace("its long stone palace façade around the open courtyard", 'its iconic glass pyramid') !== c1, '(a) mudou mais que o marco')
  const eiffel1913 = `A street in Paris with the Eiffel Tower behind${era(1913)}`
  no(A.semMarcoAnacronico(eiffel1913) !== eiffel1913, '(b) a Torre Eiffel saiu de 1913 (ela é de 1889)')
  no(/Eiffel Tower/.test(A.semMarcoAnacronico(`A street in Paris with the Eiffel Tower behind${era(1850)}`)), '(b) a Torre Eiffel ficou em 1850')
  for (const t of ['The Louvre glass pyramid at night, modern Paris.', `The Louvre glass pyramid glowing${era(2020)}`, `The great pyramid of Giza at dawn${era(1913)}`, `A Victorian glass pyramid greenhouse in a London garden${era(1885)}`])
    no(A.semMarcoAnacronico(t) !== t, `(b) mudou sem precisar: ${t.slice(0, 60)}`)
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes('classicScenePrompts[i] = semMarcoAnacronico(classicScenePrompts[i])') || !rota.includes('plan.scenes.forEach((scene) => { scene.prompt = semMarcoAnacronico(scene.prompt) })'), '(c) a rota não aplica nas duas estradas')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (pirâmide de 1989 fora da cena de 1913; marco da época fica; sem ano = igual; nas duas estradas)')
const m = read(M), rota = read(ROTA)
const MUT = [
  ['M1 sem olhar o ano', { [M]: m.replace('if (ano >= m.ano || (m.quando && !m.quando.test(out))) continue', 'if (m.quando && !m.quando.test(out)) continue') }],
  ['M2 sem exigir o Louvre para a pirâmide', { [M]: m.replace('if (ano >= m.ano || (m.quando && !m.quando.test(out))) continue', 'if (ano >= m.ano) continue') }],
  ['M3 a rota clássica sem o conserto', { [ROTA]: rota.replace('classicScenePrompts[i] = semMarcoAnacronico(classicScenePrompts[i])', 'classicScenePrompts[i] = classicScenePrompts[i]') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
