import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

// KINEO-LUGAR-SUBTERRANEO-1811 — filme pago 426e783f (H3 Max Turbo, nota 5): o pedido andava da rua de paralelepípedos para o esgoto e
// "Setting as the customer asked: the cobblestone street." foi às 7 cenas, inclusive às do esgoto. A lista de lugares não conhecia "sewer",
// então a regra de "um lugar só" contava um. Trava (Node puro, sem rede): (a) o pedido REAL não dá mais lugar do filme e os 7 planos reais
// ficam byte a byte sem a rua; (b) controles: o que já dava lugar continua dando o mesmo; (c) corpus real de 20 pedidos: só o d225bcd9 muda;
// (d) desligado = o de antes; (e) mutantes.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
function carregar(over = {}) {
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
const PED = 'lib/cinematic/pessoaDoPedido.ts'
const C = JSON.parse(readFileSync(join(root, 'scripts/test-support/corpus-lugar-subterraneo-1811.json'), 'utf8'))
const ped = read(PED)
const DESLIGA = [`export const LUGAR_SUBTERRANEO_1811: ModoLugarDoRoteiro = 'all'`, `export const LUGAR_SUBTERRANEO_1811: ModoLugarDoRoteiro = 'off'`]
assert(ped.includes(DESLIGA[0]), 'o interruptor LUGAR_SUBTERRANEO_1811 não está ligado')
const ANTES = carregar({ [PED]: ped.replace(DESLIGA[0], DESLIGA[1]) })(PED)
const REAL = C.alvo.d225bcd9
// a rota: lugar do pedido; sem ele, o das cenas (a fala) ou o árido dos planos
const rota = (m, pedido, falas, planos) => { const p = m.lugarDoPedido(pedido); if (p) return 'P:' + p; const c = m.lugarDasCenas(falas, pedido) ?? m.lugarAridoDosPlanos(planos); return c ? 'F:' + c : null }
const FALAS = C.alvo['05e57901'].split(/\n\n/u)
const METRO = 'A commuter rides in the subway at night. The train car stops in a dark tunnel.'

function problemas(over) {
  const p = []
  const no = (ruim, msg) => { if (ruim) p.push(msg) }
  let m
  try { m = carregar(over)(PED) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  // (a) o caso real
  no(m.lugarDoPedido(REAL) !== null, `(a) o pedido da rua + esgoto ainda dá lugar do filme → ${JSON.stringify(m.lugarDoPedido(REAL))}`)
  no(rota(m, REAL, FALAS, C.planos_426e783f) !== null, `(a) a rota ainda fixa um lugar no filme do esgoto → ${rota(m, REAL, FALAS, C.planos_426e783f)}`)
  const planos = C.planos_426e783f.map((x) => m.comLugarDoFilme(m.comLugarDoPedido(x, m.lugarDoPedido(REAL)), m.lugarDasCenas(FALAS, REAL)))
  no(planos.some((x, i) => x !== C.planos_426e783f[i]), `(a) algum dos 7 planos reais mudou → ${planos.find((x, i) => x !== C.planos_426e783f[i])}`)
  no(planos.some((x) => /cobblestone street/.test(x)), '(a) a rua foi a um plano do esgoto')
  // as cenas (lugarDasCenas): rua numa cena, esgoto em outra, uma sem lugar = dois lugares
  no(m.lugarDasCenas(['A hooded man waits on the cobblestone street.', 'He climbs down into the dark sewer.', 'Rats scatter from the light.']) !== null, '(a) cenas com rua e esgoto deram um lugar só')
  // (b) controles: o que já valia continua
  no(m.lugarDoPedido('A man drinks coffee at a stylish Johannesburg coffee shop.') !== 'a stylish Johannesburg coffee shop', '(b) o lugar de sempre mudou')
  no(m.lugarDoPedido('A busker plays violin on the cobblestone street while people pass by.') !== 'the cobblestone street', '(b) a rua sozinha deixou de ser o lugar')
  no(m.lugarDoPedido(METRO) !== ANTES.lugarDoPedido(METRO), `(b) metrô + trem + túnel mudou → ${JSON.stringify(m.lugarDoPedido(METRO))}`)
  no(m.lugarDoPedido('A boy explores inside a cave and crawls through a narrow tunnel.') !== 'a cave', '(b) caverna + túnel virou dois lugares')
  no(m.lugarDoPedido('A woman reads a letter in the kitchen. No sewer, no tunnel.') !== 'the kitchen', '(b) esgoto em frase de proibição contou como lugar')
  no(m.lugarDoPedido('A rat chef cooks a tiny meal deep in the sewers of Paris.') !== null, '(b) o subterrâneo sozinho virou a frase do lugar (só conta, não ancora)')
  no(m.lugarDoPedido('A knight walks through the castle and down into the dungeon.') !== null, '(b) castelo + masmorra deu um lugar só')
  no(m.lugarDasCenas(['A fox sleeps in the forest.', 'It wakes and stretches.', 'The fox runs between the trees.']) !== 'the forest', '(b) o lugar das cenas de sempre mudou')
  // (c) corpus real: 8 com subterrâneo + 12 sem; só o d225bcd9 muda (de rua para nada)
  const mudou = []
  for (const [id, t] of [...Object.entries(C.alvo), ...Object.entries(C.controle)]) if (m.lugarDoPedido(t) !== ANTES.lugarDoPedido(t)) mudou.push(`${id}: ${JSON.stringify(ANTES.lugarDoPedido(t))} → ${JSON.stringify(m.lugarDoPedido(t))}`)
  no(mudou.join(' | ') !== 'd225bcd9: "the cobblestone street" → null', `(c) o corpus mudou diferente do ensaio → ${mudou.join(' | ') || 'nada mudou'}`)
  no(Object.values(C.controle).filter((t) => m.lugarDoPedido(t) !== null).length < 6, '(c) os controles deixaram de dar lugar')
  return p
}

const atual = problemas({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
console.log('ok  estado atual limpo (rua + esgoto = dois lugares; controles e corpus real como no ensaio)')
// (d) desligado = o de antes: a rua volta às cenas do esgoto (o defeito)
assert.equal(ANTES.lugarDoPedido(REAL), 'the cobblestone street', '(d) desligado devia reproduzir o defeito')
assert.equal(ANTES.comLugarDoPedido(C.planos_426e783f[3], ANTES.lugarDoPedido(REAL)), `${C.planos_426e783f[3]} Setting as the customer asked: the cobblestone street.`)
console.log('ok  desligado reproduz o defeito ("In the dark sewer… Setting as the customer asked: the cobblestone street.")')
if (process.argv.includes('--ensaio')) for (const [g, o] of [['alvo', C.alvo], ['controle', C.controle]]) for (const [id, t] of Object.entries(o)) console.log(`${g} ${id}: ${JSON.stringify(ANTES.lugarDoPedido(t))} → ${JSON.stringify(carregar({})(PED).lugarDoPedido(t))}`)
let n = 2, falhas = 0
const MUT = [
  ['M1 desligado', { [PED]: ped.replace(DESLIGA[0], DESLIGA[1]) }],
  ['M2 o pedido não conta o subterrâneo', { [PED]: ped.replace('if (subterraneoConta1811(comSubterraneo1811(semProibicao, new Set(nomes)))) return null', 'if (false) return null') }],
  ['M3 as cenas não contam o subterrâneo', { [PED]: ped.replace('if (subterraneoConta1811(textos.reduce((soma, t) => comSubterraneo1811(t, soma), new Set(nomes)))) return null', 'if (false) return null') }],
  ['M4 "sewer" sai da lista', { [PED]: ped.replace('(?:sewers?|storm drains?|tunnels?|', '(?:storm drains?|tunnels?|') }],
  ['M5 túnel conta ao lado de caverna e metrô', { [PED]: ped.replace('n !== TIPO_SUBTERRANEO_1811 && !JA_SUBTERRANEO_RE_1811.test(n)', 'n !== TIPO_SUBTERRANEO_1811') }],
  ['M6 a frase de proibição conta', { [PED]: ped.replace('if (subterraneoConta1811(comSubterraneo1811(semProibicao, new Set(nomes)))) return null', 'if (subterraneoConta1811(comSubterraneo1811(pedido, new Set(nomes)))) return null') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problemas(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
