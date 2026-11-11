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
// KINEO-BALAO-SEM-LETRA-1111 — vigia 11/11 (filme 4eb0c0c9, Kling 4 grátis em desenho, nota 7,0): o plano final pedia "surrounded by comic
// bubbles depicting laughter" e saiu com balões "HA HA!" e "SOOM!". Balão de quadrinho não era superfície de texto, e a metade da cena fundida
// nasce da pista da seção DEPOIS da proteção de superfície. Trava (Node puro, sem rede), com os prompts REAIS: (a) a cena ganha a frase do
// balão e o balão "que mostra riso" vira desenho; (b) o plano compactado do Kling 4 leva isso dentro de 512 e com a cauda; (c) a metade com
// a pista "…with comic bubbles of laughter" ganha o mesmo; (d) plano que já tem a frase, ou sem superfície, fica byte a byte; (e) o teto de
// 512 nunca passa; (f) a rota passa todo plano do Kling 4 grátis por comSuperficieNoPlano. Mutantes no fim.
const R = JSON.parse(readFileSync(join(root, 'scripts/test-support/pedido-4eb0c0c9-1111.json'), 'utf8'))
const SUP = 'lib/cinematic/superficieSemTexto.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const secoes = [...String(R.roteiro).matchAll(/^(?:HOOK|MICRO REWARD \d|PAYOFF)[^:\n]*:\s*(?:\[Pexels:\s*([^\]]*)\])?\s*(.+)$/gmu)].map((m) => ({ pexelsQuery: (m[1] || '').trim(), voiceover: m[2].trim() }))
const BALAO = 'Every comic bubble holds only simple drawn stars, hearts and swirls.'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let U, K, S, Q
  try { const load = loader(over); U = load(SUP); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts'); Q = load('lib/kling4QuatroPlanos.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const cena = U.comSuperficieSemTexto(R.cena3)
  no(/depicting laughter/.test(cena) || !/comic bubbles filled with drawn stars, hearts and swirls/.test(cena) || !cena.includes(BALAO), `(a) cena 3 → ${cena.slice(-260)}`)
  const style = S.deriveStyleAnchor('stylized 3D animated film')
  const plano = K.promptDaCenaKling4(cena, style, 2, true)
  no(/depicting laughter/.test(plano) || !plano.includes(BALAO) || Array.from(plano).length > 512 || !plano.endsWith(' Mouth closed, no speaking.'), `(b) plano da cena 3 → ${plano}`)
  for (const concreto of [true, false]) {
    const metade = U.comSuperficieNoPlano(Q.promptDaSecao(R.planos[1].replace(/^Scene \d+: [^.]+\. /, ''), secoes[3], { objetoConcreto: concreto }))
    no(/bubbles of laughter/.test(metade) || !/filled with drawn stars, hearts and swirls/.test(metade) || (concreto && !metade.includes(BALAO)) || Array.from(metade).length > 512 || !metade.endsWith(' Mouth closed, no speaking.'), `(c) metade com a pista do payoff (objeto ${concreto}) → ${metade}`)
  }
  no(U.comSuperficieNoPlano(R.planos[0]) !== R.planos[0], '(d) o plano 1 (já com a frase da página) mudou')
  const livro = 'Photoreal film. A girl reads a book by the window. Every page shows only aged texture and faint decorative lines. Mouth closed, no speaking.'
  no(U.comSuperficieNoPlano(livro) !== livro, '(d) plano curto que já tem a frase da página mudou')
  const praia = 'Photoreal film. A man walks along the beach at dawn, no readable text, letters, numbers, labels or signage Mouth closed, no speaking.'
  no(U.comSuperficieNoPlano(praia) !== praia, '(d) plano sem superfície mudou')
  const cheio = 'Photoreal film. ' + 'A boy laughs among comic bubbles in the park, '.repeat(11).slice(0, 460) + ' Mouth closed, no speaking.'
  no(Array.from(cheio).length !== 503 || Array.from(U.comSuperficieNoPlano(cheio)).length > 512, `(e) passou de 512 (${Array.from(U.comSuperficieNoPlano(cheio)).length})`)
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes('const r2 = { ...r, prompts: r.prompts.map((p) => comSuperficieNoPlano(p)) }'), '(f) a rota não passa os planos do Kling 4 por comSuperficieNoPlano')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (balão de quadrinho sem letra na cena, no plano e na metade; o resto byte a byte; teto de 512)')
const sup = read(SUP), rota = read(ROTA)
const MUT = [
  ['M1 balão não é superfície', { [SUP]: sup.replace("{ re: /\\b(?:speech|comic|thought|word|cartoon|chat)\\s+(?:bubbles?|balloons?)\\b|\\bonomatopoeias?\\b/i, frase: 'every comic bubble holds only simple drawn stars, hearts and swirls' },", '') }],
  ['M2 o balão que mostra riso fica', { [SUP]: sup.replace('.replace(BALAO_DE_TEXTO_RE, (_m, balao: string) => `${balao} filled with drawn stars, hearts and swirls`)', '') }],
  ['M3 a frase repete no plano que já a tem', { [SUP]: sup.replace('const faltam = todas.filter((f) => !corpo.toLowerCase().includes(f.toLowerCase()))', 'const faltam = todas') }],
  ['M4 sem o teto', { [SUP]: sup.replace('if (Array.from(novo).length <= teto) return novo', 'return novo') }],
  ['M5 a rota não aplica', { [ROTA]: rota.replace('prompts: r.prompts.map((p) => comSuperficieNoPlano(p)) }', 'prompts: r.prompts }') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
