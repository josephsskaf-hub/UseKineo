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
// KINEO-METADE-COM-FICHA-1111 — reprise dos 6 filmes (CEO 11/11): o vizinho (f2e8cffc, italiano, 4 seções em 3 cenas) refeito com o código
// no ar dividia a cena fundida em 2 planos SEM a ficha do Luca, sem 1998 e sem a origem ("Photoreal film. Shot focus: moving boxes hallway…"):
// o motor sorteia roupa e rosto nessas metades (PERSONAGEM_TROCOU). Trava (Node puro, sem rede), com o roteiro e os 3 prompts REAIS do
// despacho: as duas metades levam a ficha, a época e a origem da cena, cada uma com a ação da SUA seção, ≤ 512, cauda inteira. Mutantes no fim.
const R = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-f2e8cffc-1111.json'), 'utf8'))
const secoes = [...String(R.roteiro).matchAll(/^(?:HOOK|MICRO REWARD \d|PAYOFF)[^:\n]*:\s*(?:\[Pexels:\s*([^\]]*)\])?\s*(.+)$/gmu)].map((m) => ({ pexelsQuery: (m[1] || '').trim(), voiceover: m[2].trim() }))
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let K, S, Q, T
  try { const load = loader(over); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts'); Q = load('lib/kling4QuatroPlanos.ts'); T = load('lib/kling4Trial.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const style = S.deriveStyleAnchor('photorealistic documentary')
  const compactos = R.plan.map((x, i) => K.promptDaCenaKling4(x.prompt, style, i, true))
  const q = Q.planosPorSecao({ prompts: compactos, stills: [null, null, null], falas: R.plan.map((x) => x.text), secoes })
  if (!q) return ['vizinho: não virou 4 planos']
  no(JSON.stringify(q.grupos) !== '[[0,1],[2],[3]]', `vizinho: grupos ${JSON.stringify(q.grupos)}`)
  const mp = T.buildKling4TrialInput(q.prompts, q.stills, { voiceovers: q.falas, wordsPerSecond: R.wps }).input.multi_prompt
  const [a, b] = mp.map((m) => m.prompt)
  for (const [nome, t] of [['metade 1', a], ['metade 2', b]]) {
    no(!/Visible, seen from behind: Luca, a man in his thirties with short hair/.test(t), `${nome}: sem a ficha do Luca → ${t.slice(0, 160)}`)
    no(!/Period setting: 1998 \(1990s\)\./.test(t), `${nome}: sem a época`)
    no(!/natural features of Italian people/.test(t), `${nome}: sem a origem`)
    no(Array.from(t).length > 512 || !t.endsWith(' Mouth closed, no speaking.'), `${nome}: passou de 512 ou perdeu a cauda`)
  }
  no(!/moving boxes hallway/.test(a) || /security camera/.test(a), 'metade 1: não é a ação da seção 1')
  no(!/security camera footage night/.test(b) || /moving boxes/.test(b), 'metade 2: não é a ação da seção 2')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (as metades do vizinho levam ficha, época e origem, cada uma com a sua ação)')
const qp = read('lib/kling4QuatroPlanos.ts')
const MUT = [
  ['M1 a metade perde a ficha', { 'lib/kling4QuatroPlanos.ts': qp.replace('${meio} ${luz} ${periodo} ${origem} ${quem} ${lugar}', '${meio} ${luz} ${periodo} ${origem} ${lugar}') }],
  ['M2 a metade perde a época', { 'lib/kling4QuatroPlanos.ts': qp.replace('${meio} ${luz} ${periodo} ${origem}', '${meio} ${luz} ${origem}') }],
  ['M3 a ficha só vale com ponto final', { 'lib/kling4QuatroPlanos.ts': qp.replace('(?:\\.(?=\\s)|(?=,?\\s*no readable text))', '\\.(?=\\s)') }],
]
for (const [nome, over] of MUT) {
  const novo = Object.values(over)[0]
  if (novo === qp) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const v = problems(over)
  if (!v.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${v[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
