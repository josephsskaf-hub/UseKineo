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
// KINEO-ESPECIE-NAO-E-GENTE-1111 — reprise dos 6 filmes (CEO 11/11): o argentinossauro (e9418905, russo, 6,5) teve no plano 1 "Visible:
// Argentinosaurus, a person in their thirties with curly black hair… brown coat" — o elenco de época (texto traduzido) tomou o nome do gênero
// do dinossauro por uma pessoa e inventou um homem. Trava (Node puro, sem rede): (a) o texto traduzido do roteiro real não dá personagem
// nomeado humano; (b) nomes de gênero científico são reconhecidos; nomes de gente (Gordon, Sheldon, Brandon, Rex, Titania) não; (c) um herói
// humano de nome comum continua personagem. Mutantes no fim.
const EE = 'lib/cinematic/elencoEpoca.ts'
const TRADUZIDO = 'Who knew dinosaurs could weigh more than 10 buses? Argentinosaurus was 35 meters long — a huge giant. Argentinosaurus weighed up to 100 tons, like 10 school buses together.'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let E
  try { E = loader(over)(EE) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const nomeados = E.personagensNomeados(TRADUZIDO)
  no(nomeados.some((x) => /argentinosaurus/i.test(x.nome) && x.tipo === 'humano'), `(a) Argentinosaurus virou gente → ${JSON.stringify(nomeados.map((x) => [x.nome, x.tipo]))}`)
  for (const n of ['Argentinosaurus', 'Velociraptor', 'Triceratops', 'Megalodon', 'Deinotherium', 'Australopithecus', 'Archaeopteryx', 'Patagotitan']) no(!E.nomeDeEspecie(n), `(b) ${n} não foi lido como espécie`)
  for (const n of ['Gordon', 'Sheldon', 'Brandon', 'Rex', 'Titania', 'Mara', 'Odon']) no(E.nomeDeEspecie(n), `(b) ${n} foi lido como espécie`)
  const heroi = E.personagensNomeados('Gordon opens the old door. Gordon finds a map and runs to the harbor.')
  no(!heroi.some((x) => x.nome === 'Gordon' && x.tipo === 'humano'), `(c) Gordon deixou de ser personagem → ${JSON.stringify(heroi.map((x) => [x.nome, x.tipo]))}`)
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (Argentinosaurus é o bicho, não gente; Gordon continua personagem)')
const ee = read(EE)
const MUT = [
  ['M1 o filtro de espécie sai', { [EE]: ee.replace('lista.splice(0, lista.length, ...lista.filter((c) => !nomeDeEspecie(c.nome)))', 'void 0') }],
  ['M2 sufixo curto de nome de gente vale', { [EE]: ee.replace('(?:saurus|sauros|raptor', '(?:don|saurus|sauros|raptor') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
