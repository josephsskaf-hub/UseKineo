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
// KINEO-PEDIDO-DO-CLIENTE-1111 — tabela de cobertura (CEO 11/11): a pessoa do pedido e a luz do pedido liam SÓ body.original_idea, que só o
// /generate manda; ideia solta escrita no servidor, conector e roteiro colado chegavam sem ele e os dois consertos ficavam desligados em
// todo motor. Trava (Node puro, sem rede): (a) a rota calcula o pedido do cliente UMA vez — original_idea quando vem, senão o texto que o
// cliente mandou (intake, antes do escritor), nunca o pedido de continuação de série — e a pessoa e a luz o usam; (b) a declaração REAL da
// rota, executada com dublês: com original_idea usa ela; sem ela usa o intake; continuação de série = null; (c) com o texto cru de uma ideia
// solta real, a pessoa e a luz são lidas. Mutantes no fim.
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const declaracao = (rota) => (rota.split('\n').find((l) => l.startsWith('    const pedidoDoCliente = ')) ?? '').replace(/\s*\/\/.*$/, '')
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  const rota = over[ROTA] ?? read(ROTA)
  let P
  try { P = loader(over)('lib/cinematic/pessoaDoPedido.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  no(!rota.includes('const pessoaPedida = pessoaDoPedido(pedidoDoCliente)'), '(a) a pessoa do pedido não usa o pedido do cliente')
  no(!rota.includes('luzDoPedido(pedidoDoCliente)'), '(a) a luz do pedido não usa o pedido do cliente')
  no(/pessoaDoPedido\(body\.original_idea\)|luzDoPedido\(body\.original_idea\)/.test(rota), '(a) sobrou leitura só de body.original_idea')
  const dec = declaracao(rota)
  no(!dec, '(b) a rota não declara pedidoDoCliente')
  if (dec) {
    const rodar = (body, texto) => new Function('body', 'intake', 'isSeriesContinuationPrompt', `${dec.trim()}\nreturn pedidoDoCliente`)(body, { text: texto }, (t) => /^\s*\[?(?:next episode|continue the series|continuação)/i.test(t))
    no(rodar({ original_idea: 'A tall man in a red coat.' }, 'HOOK: roteiro') !== 'A tall man in a red coat.', '(b) com original_idea não usou ela')
    no(rodar({}, 'A little girl with red pigtails and a yellow raincoat walks home.') !== 'A little girl with red pigtails and a yellow raincoat walks home.', '(b) sem original_idea não usou o texto do cliente')
    no(rodar({ original_idea: '   ' }, 'texto do cliente') !== 'texto do cliente', '(b) original_idea vazia não caiu no texto do cliente')
    no(rodar({}, 'Continue the series: episode 2') !== null, '(b) continuação de série virou pedido do cliente')
  }
  // (c) uma ideia solta real (a do 657ad797, como chegaria por um conector, sem original_idea): pessoa e luz são lidas do texto cru
  const R = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-657ad797-1111.json'), 'utf8'))
  no(!/long neat black braids/.test(String(P.pessoaDoPedido(R.original))) || P.luzDoPedido(R.original) !== 'Natural sunlight enters through large glass windows', '(c) do texto cru não saem a pessoa e a luz')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (pessoa e luz leem o pedido do cliente: original_idea, senão o texto que ele mandou)')
const rota = read(ROTA)
const MUT = [
  ['M1 a pessoa volta a ler só original_idea', { [ROTA]: rota.replace('const pessoaPedida = pessoaDoPedido(pedidoDoCliente)', 'const pessoaPedida = pessoaDoPedido(body.original_idea)') }],
  ['M2 a luz volta a ler só original_idea', { [ROTA]: rota.replace('luzDoPedido(pedidoDoCliente)', 'luzDoPedido(body.original_idea)') }],
  ['M3 sem original_idea não há pedido', { [ROTA]: rota.replace(': isSeriesContinuationPrompt(intake.text) ? null : intake.text // KINEO-PEDIDO-DO-CLIENTE-1111', ': null // KINEO-PEDIDO-DO-CLIENTE-1111') }],
  ['M4 continuação de série vira pedido', { [ROTA]: rota.replace('isSeriesContinuationPrompt(intake.text) ? null : intake.text // KINEO-PEDIDO-DO-CLIENTE-1111', 'intake.text // KINEO-PEDIDO-DO-CLIENTE-1111') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
