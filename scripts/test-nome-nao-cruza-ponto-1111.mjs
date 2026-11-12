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
// KINEO-NOME-NAO-CRUZA-PONTO-1111 — vigia 11/11 (filme do Leo, /kids-cartoon, H3 Max, o único pagante do dia, nota 7,0): "…said Leo. Playing was so
// much fun" virou o personagem "Leo. Playing" (o prefixo de título "Dr. "/"St. " aceitava qualquer palavra de até 4 letras com ponto), com outra cara
// — "a boy about nine years old with curly black hair… purple sweater" —, que entrou como "Named character in this shot" nas cenas 1 e 5: o
// menino de roxo apareceu ao lado e o Leo trocou no fim (a cena 5 foi refeita sem a folha e a ficha errada venceu). Trava (Node puro, sem
// rede), com o roteiro REAL: (a) só "Leo" sai do elenco, adulto e infantil; (b) título de verdade e inicial seguem inteiros ("Dr. Watson",
// "Mr. Darcy", "J. Smith"); (c) nome nunca atravessa o ponto final de uma frase. Mutante no fim.
const E = 'lib/cinematic/elencoEpoca.ts'
const LEO = 'Leo was playing hide and seek with his favorite letters in the sunny garden. Leo covered his eyes, counting, one, two, three! The letter A giggled and hid behind a tall tree. Leo looked around, smiling. "Where could A be?" asked Leo, pretending not to see. Suddenly, from behind the tree, A peeked out, saying "Ah!" Leo clapped his hands and laughed. "I found you, A!" Leo cheered. Next, B was up to hide, and it chose a fluffy cloud in the bright sky. Leo squinted up, seeing a little blue bump. "Ah, there you are, B!" said Leo. Playing was so much fun. Sometimes, even letters need a little break! What letter will you play with next?'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let M
  try { M = loader(over)(E) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  for (const infantil of [false, true]) {
    const nomes = M.personagensNomeados(LEO, null, infantil).map((x) => x.nome)
    no(JSON.stringify(nomes) !== '["Leo"]', `(a) Leo (infantil ${infantil}) → ${JSON.stringify(nomes)}`)
  }
  const doutor = M.personagensNomeados('Dr. Watson opened the door. Dr. Watson looked at the body and frowned. Later, Dr. Watson wrote the report.').map((x) => x.nome)
  no(!doutor.includes('Dr. Watson'), `(b) "Dr. Watson" → ${JSON.stringify(doutor)}`)
  const darcy = M.personagensNomeados('Mr. Darcy walked into the ballroom. Mr. Darcy refused to dance. Elizabeth watched Mr. Darcy leave.').map((x) => x.nome)
  no(!darcy.includes('Mr. Darcy'), `(b) "Mr. Darcy" → ${JSON.stringify(darcy)}`)
  const curto = M.personagensNomeados('The bell rang for Max. Running home, Max laughed. Max opened the gate and Max waved.').map((x) => x.nome)
  no(curto.some((n) => /\.\s/.test(n) && !/^(?:\p{Lu}|Dr|Mr|Mrs|Ms|St)\.\s/u.test(n)), `(c) nome atravessou o ponto → ${JSON.stringify(curto)}`)
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (o roteiro do Leo dá um Leo só; Dr. Watson e Mr. Darcy inteiros; nome não cruza ponto)')
const e = read(E)
const MUT = [
  ['M1 o prefixo volta a aceitar qualquer palavra curta com ponto', { [E]: e.replace('(?:${TITULO_COM_PONTO_1111})?${PALAVRA_NOME}', '(?:\\p{Lu}[\\p{Ll}]{0,3}\\. )?${PALAVRA_NOME}') }],
  ['M2 o prefixo some (título deixa de valer)', { [E]: e.replace('(?:${TITULO_COM_PONTO_1111})?${PALAVRA_NOME}', '${PALAVRA_NOME}') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
