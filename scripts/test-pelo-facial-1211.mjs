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
      if (!target) return {}
      return load(target)
    }
    const js = ts.transpileModule(over[path] ?? read(path), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', 'process', 'fetch', js)(req, module, module.exports, { env: {} }, () => { throw new Error('rede proibida') })
    return module.exports
  }
  return load
}
// KINEO-PELO-FACIAL-1211 — vigia 11/11 (Mona Lisa 1911, H3 Max, 6,5): o Peruggia saiu de barba cheia numa cena e de bigode na outra, com a MESMA folha. A
// leitura da folha (lerAncorasDaFolha, gpt-4o-mini, a chamada que já existe) não perguntava o pelo facial. Trava (Node puro): (a) o pedido de visão pede
// "facial_hair"; (b) "thick dark moustache" entra na ficha como "facial hair: …"; "none" vira "clean-shaven" (também trava); (c) bicho e resposta sem o
// campo ficam como antes. Mutantes no fim.
const ET = 'lib/cinematic/elencoTrava.ts'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let E
  try { E = loader(over)(ET) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const msgs = E.mensagensDasAncoras({ tipo: 'humano', canonica: 'Vincenzo Peruggia, an Italian handyman' }, 'https://x/folha.jpg')
  no(!/"facial_hair"/.test(String(msgs[0].content)), '(a) o pedido de visão não pede o pelo facial')
  const bigode = E.lerAncoras(JSON.stringify({ age_range: '30-40', hair: 'short dark hair', facial_hair: 'thick dark moustache', skin_tone: 'light', clothing: 'three-piece suit, tie' }))
  no(!/facial hair: thick dark moustache/.test(E.fraseDasAncoras('humano', bigode)), `(b) bigode → ${E.fraseDasAncoras('humano', bigode)}`)
  const liso = E.lerAncoras(JSON.stringify({ age_range: '30-40', hair: 'short dark hair', facial_hair: 'none', skin_tone: 'light', clothing: 'suit' }))
  no(!/clean-shaven/.test(E.fraseDasAncoras('humano', liso)), `(b) sem pelo → ${E.fraseDasAncoras('humano', liso)}`)
  const antigo = E.lerAncoras(JSON.stringify({ age_range: '30-40', hair: 'short dark hair', skin_tone: 'light', clothing: 'suit' }))
  no(E.fraseDasAncoras('humano', antigo) !== 'appearance anchors: 30-40, short dark hair, light skin, wearing suit', `(c) sem o campo mudou → ${E.fraseDasAncoras('humano', antigo)}`)
  const cao = E.lerAncoras(JSON.stringify({ coat: 'golden', size: 'medium dog', facial_hair: 'none' }))
  no(/clean-shaven|facial hair/.test(E.fraseDasAncoras('animal', cao)), '(c) o bicho ganhou pelo facial')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (a folha diz o pelo facial e a ficha de toda cena repete)')
const et = read(ET)
const MUT = [
  ['M1 a ficha ignora o pelo facial', { [ET]: et.replace("a.barba ? (a.barba === 'clean-shaven' ? 'clean-shaven' : `facial hair: ${a.barba}`) : '', ", '') }],
  ['M2 o pedido de visão não pergunta', { [ET]: et.replace('"facial_hair": "", ', '') }],
  ['M3 "none" não vira clean-shaven', { [ET]: et.replace("barba: semPelo ? 'clean-shaven' : campo(j.facial_hair)", 'barba: campo(j.facial_hair)') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
