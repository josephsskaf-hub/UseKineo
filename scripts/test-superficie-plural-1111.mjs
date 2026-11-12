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
// KINEO-SUPERFICIE-PLURAL-1111 — prova paga do 2120f018 (11/11, 7,5): o pergaminho saiu coberto de letra inventada nítida em 2 de 8 quadros. O
// prompt pedia "ancient scrolls unfurling, revealing intricate text and symbols": a regra de superfície casava "scroll" e não "scrolls", e o
// pedido de texto em positivo vencia o "no readable text" do fim. Trava (Node puro, sem rede), com o prompt REAL do despacho: (a) a cena ganha a
// frase da página e o pedido de texto vira marcas ilegíveis; (b) o plano do Kling 4 leva a frase da página na proteção e não pede texto;
// (c) plurais de tela e placa casam; cena sem superfície fica igual; "letters" (palavra da proteção) não vira superfície. Mutantes no fim.
const R = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-2120f018-1111.json'), 'utf8'))
const SUP = 'lib/cinematic/superficieSemTexto.ts'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let U, K, S
  try { const load = loader(over); U = load(SUP); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const cena = U.comSuperficieSemTexto(R.plan[0].prompt)
  no(!/Every page shows only aged texture and faint decorative lines\./.test(cena), '(a) a cena do pergaminho não ganhou a frase da página')
  no(/revealing intricate text and symbols/.test(cena) || !/revealing faint marks too small to read/.test(cena), `(a) o pedido de texto ficou → ${cena.slice(0, 260)}`)
  const plano = K.promptDaCenaKling4(cena, S.deriveStyleAnchor('photorealistic documentary', ', mysterious, cinematic_dark, documentary, consistent color grade across all scenes'), 0, true)
  no(!/Every page shows only aged texture/.test(plano) || /intricate text/.test(plano), `(b) plano do Kling 4 → ${plano}`)
  // KINEO-PERGAMINHO-CURTO-1111 [CEO 11/11] — a frase sem letra cabe sem cortar a ação: o plano do pergaminho (sem os blocos de "God", como a rota
  // despacha desde 53f35bdc1) termina a luz inteira, "illuminated by a warm, flickering candlelight" (era cortado em "by a warm").
  const semDeus = R.plan[0].prompt.replace(/The only person in this shot is the same main character \((?:[^()]|\([^()]*\))*\); any other person described below is replaced by this same character\.\s*/g, '').replace(/\s*The same main character appears in this scene, consistent design: God, exactly as the author wrote:[^\n]*?natural light\./g, '')
  const plano2 = K.promptDaCenaKling4(U.comSuperficieSemTexto(semDeus), S.deriveStyleAnchor('photorealistic documentary', ', mysterious, cinematic_dark, documentary, consistent color grade across all scenes'), 0, true)
  no(!/illuminated by a warm, flickering candlelight/.test(plano2), `(b) a ação do pergaminho foi cortada → ${plano2.slice(0, 240)}`)
  // KINEO-PONTUACAO-SOLTA-1111 — o que se tira da ação deixava ", ." órfão antes da proteção ("…candlelight. , . no readable text")
  no(/[.!?]\s*[,;:.]/.test(plano2.split(' no readable text')[0]), `(b) pontuação solta no fim da ação → ${plano2.slice(0, 200)}`)
  no(U.fraseUnicaDeSuperficie('Two old phones on a table, their screens lit.') !== 'Every screen glows with soft abstract light and colour.', '(c) plural de tela não casou')
  no(U.fraseUnicaDeSuperficie('Neon signs above the street at night.') !== 'Every sign is a plain block of colour.', '(c) plural de placa não casou')
  const nada = 'A man walks along the beach at dawn.'
  no(U.comSuperficieSemTexto(nada) !== nada, '(c) cena sem superfície mudou')
  no(U.fraseUnicaDeSuperficie('A quiet street, no legible words, no letters, no numbers.') !== '', '(c) "letters" da proteção virou superfície')
  // KINEO-SUPERFICIE-NEGADA-1111 — a negação ("no letters") já sai antes da regra; "letters" em positivo (as letras do conto infantil) também não é página
  no(U.fraseUnicaDeSuperficie('Colorful cartoon letters float around the happy child in the garden.') !== '', '(c) "letters" em positivo virou superfície')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (o pergaminho no plural ganha a página sem letra; o pedido de texto vira marcas ilegíveis)')
const sup = read(SUP), fq = read('lib/cinematic/filmQuality.ts')
const MUT = [
  ['M1 o plural volta a escapar', { [SUP]: sup.replace('(?:scrolls?|parchments?|', '(?:scroll|parchment|') }],
  ['M2 o pedido de texto fica', { [SUP]: sup.replace('const semPedido = semTextoPedidoNaSuperficie(prompt)', 'const semPedido = prompt') }],
  ['M4 a frase sem letra volta a ser longa', { [SUP]: sup.replace('faint marks too small to read`)', 'faint marks and symbols too small and soft to read`)') }],
  ['M5 a pontuação solta volta', { 'lib/cinematic/filmQuality.ts': fq.replace("  action = action.replace(/([.!?])(?:\\s*[,;:.])+\\s*$/u, '$1')\n", '') }],
  ['M3 "letters" vira superfície', { [SUP]: sup.replace('|page|pages|letter|', '|page|pages|letters?|') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
