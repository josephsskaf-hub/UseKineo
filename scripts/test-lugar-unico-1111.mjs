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
// KINEO-LUGAR-UNICO-1111 — vigia 11/11 (filme 4eb0c0c9, Kling 4 grátis em desenho, 7,0): o boneco lia na floresta, depois numa biblioteca e
// terminava num parque — nenhuma cena nem o pedido citavam lugar, e cada imagem-chave inventou o seu. Esta é a parte DETERMINÍSTICA (aprovada
// pela CEO em 5 filmes): sem lugar no pedido, a rota leva a toda cena clássica o ÚNICO lugar que alguma cena cita, com rótulo próprio ("Setting
// of this film:" — "as the customer asked" seria falso), e o plano do Kling 4 lê os dois rótulos. Trava (Node puro, sem rede): (a) um lugar numa
// cena vale para todas; (b) dois tipos, nenhum (as 3 cenas reais do 4eb0c0c9), toda cena com o seu, ou proibição = nada; (c) o rótulo é o
// próprio e vira "Place:" no plano do Kling 4; (d) a rota tenta o lugar do pedido primeiro. Hollywood fica de fora: environmentSheet comum.
const PED = 'lib/cinematic/pessoaDoPedido.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const REAIS = ['A stick man sits cross-legged, reading a book, eyes wide as a cartoonish fart cloud escapes, colorful and animated.', "The stick man's book flips rapidly between pages, each sound effect causing his eyes to pop open in surprise, vibrant colors surrounding him.", 'The stick man bursts into laughter, surrounded by comic bubbles depicting laughter, his joy exaggerated and animated in bright colors.']
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let P, K, S
  try { const load = loader(over); P = load(PED); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const uma = ['A stick man sits cross-legged in a sunny park, reading a book.', 'The book flips its pages, his eyes pop open.', 'He bursts into laughter, arms in the air.']
  no(P.lugarDasCenas(uma) !== 'a sunny park', `(a) um lugar numa cena → ${JSON.stringify(P.lugarDasCenas(uma))}`)
  for (const [nome, cenas] of [['dois tipos', ['He reads in the forest.', 'He reads in a library.', 'He laughs.']], ['nenhum (4eb0c0c9 real)', REAIS], ['toda cena com o seu', ['He reads in the park.', 'He runs in the park.']], ['proibição', ['He reads quietly. Never in the library.', 'He laughs.']]])
    no(P.lugarDasCenas(cenas) !== null, `(b) ${nome} → ${JSON.stringify(P.lugarDasCenas(cenas))}`)
  const cena = P.comLugarDoFilme('Film visual medium: stylized 3D animated film look. The book flips its pages, his eyes pop open, no readable text, letters, numbers, labels or signage anywhere in the frame', 'a sunny park')
  no(!cena.endsWith('Setting of this film: a sunny park.') || /customer asked/.test(cena), `(c) rótulo → ${cena.slice(-80)}`)
  const plano = K.promptDaCenaKling4(cena, S.deriveStyleAnchor('stylized 3D animated film'), 1, true)
  no(!plano.includes('Place: a sunny park.') || /Setting of this film/.test(plano), `(c) plano do Kling 4 → ${plano}`)
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes('const lugarFilme = qualidadeHerdada || lugarPedido ? null : (lugarDasCenas(scenes.map((s) => s.description), pedidoDoCliente /* KINEO-LUGAR-DA-FALA-1411 — a frase do lugar para na pontuação do roteiro colado */) ?? lugarAridoDosPlanos(scenes.map((s) => s.aiPrompt || s.stockSearchQuery || s.description))); /* KINEO-LUGAR-DO-ROTEIRO-1411 v2 — no roteiro colado a description é a fala; o lugar árido sai dos PLANOS (Racetrack) */ if (lugarFilme) for (let i = 0; i < classicScenePrompts.length; i++) classicScenePrompts[i] = comLugarDoFilme(classicScenePrompts[i], lugarFilme)'), '(d) a rota não usa o lugar das cenas depois do lugar do pedido') // reancorado (KINEO-LUGAR-DO-ROTEIRO-1411 v2): a 1ª leitura segue a das descrições; o árido dos planos só entra quando ela é null
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (a rota repete o único lugar das cenas com rótulo próprio; o Kling 4 lê; dois lugares ou nenhum = nada)')
const ped = read(PED), rota = read(ROTA), fq = read('lib/cinematic/filmQuality.ts')
const MUT = [
  ['M1 dois tipos de lugar valem', { [PED]: ped.replace('if (nomes.size !== 1 || porCena.every((s) => s.size > 0)) return null', 'if (nomes.size === 0 || porCena.every((s) => s.size > 0)) return null') }],
  ['M2 lugar em proibição vale', { [PED]: ped.replace("const textos = acoes.map((a) => String(a ?? '').split(/(?<=[.!?\\n])/u).filter((f) => !/^\\s*(?:no|not|never|without|don't|do not)\\b/iu.test(f)).join(' '))", "const textos = acoes.map((a) => String(a ?? ''))") }],
  ['M3 a rota sem o lugar das cenas', { [ROTA]: rota.replace('if (lugarFilme) for (let i = 0; i < classicScenePrompts.length; i++) classicScenePrompts[i] = comLugarDoFilme(classicScenePrompts[i], lugarFilme)', '') }],
  ['M4 o rótulo volta a dizer "as the customer asked"', { [PED]: ped.replace("export const MARCA_LUGAR_DO_FILME = 'Setting of this film:'", "export const MARCA_LUGAR_DO_FILME = 'Setting as the customer asked:'") }],
  ['M5 o Kling 4 não lê o rótulo do filme', { ['lib/cinematic/filmQuality.ts']: fq.replace('const lugarPedido = /(?:Setting as the customer asked|Setting of this film): ([^.]+)\\./', 'const lugarPedido = /(?:Setting as the customer asked): ([^.]+)\\./') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
