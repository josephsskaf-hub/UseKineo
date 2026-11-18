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
// KINEO-NEON-RUA-1811 — revisor 18/11 (render 37264253, H3 Max Turbo de reserva do filme grátis, nota 7): a cena 1 dizia "A close-up of a neon-lit
// city street at night" — sem a palavra "sign", nenhuma frase positiva entrava e a foto-chave nasceu com letreiros de neon de letra inventada (0 a 3 s).
// Trava (Node puro, sem rede), com o texto REAL que foi ao motor: (a) a cena da rua de neon ganha a frase da placa, só ANEXADA (o texto original fica
// inteiro, byte a byte, na frente); (b) a cena aérea sem neon fica byte a byte; (c) outras formas de rua/cidade de neon ganham; (d) neon como cor de
// roupa ou de luz, "signal", "assign", negado e frases em PT/ES/DE sem letreiro ficam byte a byte; (e) o plano do Kling 4 também recebe. Mutante no fim.
const R = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-neon-rua-1811.json'), 'utf8'))
const SUP = 'lib/cinematic/superficieSemTexto.ts'
const FRASE = 'Every sign is a plain block of colour.'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let U, K, S
  try { const load = loader(over); U = load(SUP); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const real = R.cenas['1']
  const saida = U.comSuperficieSemTexto(real)
  no(!saida.endsWith(FRASE), `(a) a rua de neon real não ganhou a frase → …${saida.slice(-90)}`)
  no(saida !== `${real}. ${FRASE}`, '(a) a saída não é o texto original inteiro + a frase: só pode anexar')
  no(U.comSuperficieSemTexto(saida) !== saida, '(a) a frase entra duas vezes')
  no(U.comSuperficieSemTexto(R.cenas['2']) !== R.cenas['2'], '(b) a cena aérea sem neon mudou')
  for (const t of ['A rainy neon street in Tokyo, a taxi passing', 'Neon-drenched alley behind a nightclub, steam rising', 'A wet boulevard lit by pink neon, palm trees swaying', 'The neon city skyline glows over the bay', 'Crowded neon nightlife, exotic cars cruising slowly', 'A street illuminated by cyan and magenta neon at midnight'])
    no(U.comSuperficieSemTexto(t) !== `${t}. ${FRASE}`, `(c) não ganhou ou reescreveu: ${t} → ${U.comSuperficieSemTexto(t)}`)
  no(U.frasesDeSuperficie('Neon signs above a neon-lit street.').length !== 1, '(c) placa + rua de neon: a frase tem de entrar uma vez só')
  for (const t of [
    'A runner in a neon green jacket crosses the park at dawn.', 'Neon pink and cyan lights wash over the dancer.', 'A girl with neon yellow sneakers jumps a puddle.',
    'The officer gives a hand signal to the driver.', 'The teacher will assign homework to the class.', 'A design studio at night, warm lamps.',
    'A quiet empty road, no neon-lit streets, only moonlight.',
    'Uma rua molhada à noite, um carro passa devagar.', 'Una calle mojada de noche, un coche pasa despacio.', 'Eine nasse Straße bei Nacht, ein Auto fährt langsam vorbei.',
    'Um homem assina o contrato na mesa.', 'Der Mann unterschreibt den Vertrag am Tisch.',
  ]) no(U.comSuperficieSemTexto(t) !== t, `(d) falso positivo: ${t} → …${U.comSuperficieSemTexto(t).slice(-60)}`)
  const plano = K.promptDaCenaKling4(real, S.deriveStyleAnchor('photorealistic, ultra-detailed'), 0, true)
  no(!/sign is a plain block of colour/i.test(plano), `(e) o plano do Kling 4 não recebeu a frase → ${plano.slice(-160)}`)
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (rua de neon ganha a frase da placa, só anexada; neon como cor, signal, assign, negado e PT/ES/DE ficam byte a byte)')
const sup = read(SUP)
const INI = sup.indexOf('|neon[-'), FIM = sup.indexOf('neon)\\b/i')
const MUT = [
  ['M1 a rua de neon deixa de ser superfície', { [SUP]: INI > 0 && FIM > INI ? sup.slice(0, INI) + sup.slice(FIM + 'neon'.length) : sup }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
