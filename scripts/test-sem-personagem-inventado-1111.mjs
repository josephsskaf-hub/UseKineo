// KINEO-SEM-PERSONAGEM-INVENTADO-1111 — o roteiro de 15 s do filme 657ad797 (11/11, Kling 4 grátis, nota 6,5) inventou um homem ("he's finally
// here") num pedido que só tinha uma mulher sozinha num café. Trava (Node puro, a fonte real transpilada, sem rede): (a) o leitor acha o homem
// inventado no PEDIDO e no ROTEIRO reais; (b) não acusa quando o pedido já tem a pessoa, quando o pedido não cita ninguém, nem em outra língua;
// (c) a rota do roteirista tem a regra no prompt e grava a medida no script_written; (d) mutantes no fim.
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
const R = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-657ad797-1111.json'), 'utf8'))
const LIB = 'lib/pessoaInventadaNoRoteiro.ts', ROTA = 'app/api/generate-script/route.ts'

function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let M
  try { M = loader(over)(LIB) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const real = M.pessoaInventadaNoRoteiro(R.original, R.roteiro)
  no(!real || real.genero !== 'masculino' || !real.palavras.includes("he's"), `(a) 657ad797: o homem inventado não foi achado → ${JSON.stringify(real)}`)
  const controles = [
    ['o pedido já tem o homem', 'A young man and his grandmother walk to the market in the rain.', 'HOOK: He holds her hand. PAYOFF: She smiles at him.'],
    ['o pedido não cita ninguém', 'The history of the Eiffel Tower and the secrets of its construction in Paris.', 'HOOK: In 1889, a man named Gustave Eiffel changed Paris. PAYOFF: His tower stands.'],
    ['outra língua', 'Una mujer sola en un café de Madrid espera un mensaje.', 'HOOK: Ella espera. PAYOFF: Él llega por fin.'],
    ['o roteiro fica com a mesma mulher', R.original, 'HOOK: Alone at a café, her eyes tell a deeper story. PAYOFF: She smiles at the message — her wait ends.'],
  ]
  for (const [nome, ped, rot] of controles) no(M.pessoaInventadaNoRoteiro(ped, rot) !== null, `(b) ${nome}: acusou → ${JSON.stringify(M.pessoaInventadaNoRoteiro(ped, rot))}`)
  const fem = M.pessoaInventadaNoRoteiro('A tired mechanic fixes an old truck in his garage at night.', 'HOOK: He works alone. PAYOFF: His daughter walks in with coffee.')
  no(!fem || fem.genero !== 'feminino', `(b) o caso inverso (mulher inventada) não foi achado → ${JSON.stringify(fem)}`)
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes('those are the ONLY people: never add a partner, lover, stranger, friend, rival or anyone else who arrives, appears or is revealed'), '(c) a regra saiu do prompt do roteirista')
  no(!rota.includes('script_head: script.slice(0, 200), pessoa_inventada: pessoaInventadaNoRoteiro(topic, script),'), '(c) a medida saiu do script_written')
  return p
}

const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (o homem inventado do 657ad797 é achado; controles quietos; regra e medida na rota)')
const lib = read(LIB), rota = read(ROTA)
const MUT = [
  ['M1 o leitor nunca acha', { [LIB]: lib.replace('if (noPedido > 0) continue', 'continue') }],
  ['M2 o pedido sem ninguém também acusa', { [LIB]: lib.replace('if (pm + pf === 0) return null', 'if (false) return null') }],
  ['M3 a regra sai do prompt', { [ROTA]: rota.replace('those are the ONLY people: never add', 'those are the people: you may add') }],
  ['M4 o leitor ignora o pedido', { [LIB]: lib.replace('if (noPedido > 0) continue', '') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
