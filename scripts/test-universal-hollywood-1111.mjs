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
// KINEO-UNIVERSAL-HOLLYWOOD-1111 — tabela de cobertura (CEO 11/11): a luz do pedido (f909f7662) e o relógio de ponteiros (c3fa9437d) só
// existiam na estrada clássica (Kling 4 grátis, H3 Turbo, reserva); o Kling 4 pago, o H3, o H3 Max e o S25 vão pela estrada hollywood.
// Trava (Node puro, sem rede): as DUAS linhas reais da rota (a luz do pedido + o forEach das cenas do plano hollywood), executadas com dublês
// e as funções reais: (a) a cena ganha a luz e o relógio vira ponteiros; (b) passou de 2500: sai a frase da superfície, a luz e o relógio
// ficam; (c) qualidade herdada = sem luz; (d) sem luz no pedido = a cena de sempre. Mutantes no fim.
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const linhas = (rota) => { const L = rota.split('\n'); const i = L.findIndex((l) => l.startsWith('        const luzHollywood = ')); return i < 0 ? null : [L[i], L[i + 1]].map((l) => l.replace(/\s*\/\/ KINEO-UNIVERSAL-HOLLYWOOD-1111.*$/, '')).join('\n') }
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  const rota = over[ROTA] ?? read(ROTA)
  let P, Rl, Su
  try { const load = loader(over); P = load('lib/cinematic/pessoaDoPedido.ts'); Rl = load('lib/cinematic/relogioComPonteiros.ts'); Su = load('lib/cinematic/superficieSemTexto.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const codigo = linhas(rota)
  if (!codigo) return ['a rota não tem a luz do pedido na estrada hollywood']
  const rodar = (prompts, pedido, herdada = null) => {
    const plan = { scenes: prompts.map(() => ({ prompt: '' })) }
    new Function('plan', 'quality', 'qualidadeHerdada', 'pedidoDoCliente', 'luzDoPedido', 'comLuzDoPedido', 'relogioComPonteiros', 'comSuperficieSemTexto', codigo)(plan, { prompts }, herdada, pedido, P.luzDoPedido, P.comLuzDoPedido, Rl.relogioComPonteiros, Su.comSuperficieSemTexto)
    return plan.scenes.map((s) => s.prompt)
  }
  const PED = 'A quiet apartment in Milan. Natural sunlight enters through large glass windows.'
  const [c1, c2] = rodar(['A man checks his phone in a dimly lit kitchen.', 'A close-up of a clock on the wall showing 02:46.'], PED)
  no(!c1.includes('Lighting as the customer asked: Natural sunlight enters through large glass windows.') || /dimly lit/.test(c1), `(a) cena 1 sem a luz → ${c1}`)
  no(!/Every screen glows/.test(c1), '(a) cena 1 perdeu a superfície sem texto')
  no(!/clock on the wall whose hands point to 2:46/.test(c2) || !c2.includes('Lighting as the customer asked:'), `(a) cena 2: relógio ou luz → ${c2}`)
  const longa = `A man checks his phone. ${'Very long scene description. '.repeat(81)}`
  const [l1] = rodar([longa], PED)
  no(l1.length > 2500 || !l1.includes('Lighting as the customer asked:') || /Every screen glows/.test(l1), `(b) passou de 2500: ${l1.length} car., luz ${l1.includes('Lighting as the customer asked:')}`)
  const [h1] = rodar(['A man checks his phone.'], PED, { herdada: true })
  no(/Lighting as the customer asked/.test(h1), '(c) qualidade herdada ganhou luz')
  const [s1] = rodar(['A man walks in the park.'], 'The history of Rome.')
  no(s1 !== 'A man walks in the park.', `(d) sem luz no pedido a cena mudou → ${s1}`)
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (estrada hollywood: luz do pedido e relógio de ponteiros em toda cena, superfície sai primeiro no teto)')
const rota = read(ROTA)
const MUT = [
  ['M1 a hollywood sem a luz', { [ROTA]: rota.replace('const comSuperficie = comLuzDoPedido(comSuperficieSemTexto(base), luzHollywood)', 'const comSuperficie = comSuperficieSemTexto(base)') }],
  ['M2 a hollywood sem o relógio', { [ROTA]: rota.replace('const base = relogioComPonteiros(quality.prompts[i])', 'const base = quality.prompts[i]') }],
  ['M3 no teto a luz cai junto', { [ROTA]: rota.replace(': comLuz.length <= 2500 ? comLuz : base })', ': base })') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
