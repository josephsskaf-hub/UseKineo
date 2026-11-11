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
// KINEO-SECAO-COM-FALA-REESCRITA-1111 — vigia 11/11 17:00 (filme 2120f018, Kling 4 grátis, 7,0): 4 seções e só 3 planos com o plano por seção
// 'public'. O encaixe do Kling 4 tinha REESCRITO a fala ("This manifestation is God, not all of God. It begins creating everything else."), e
// secoesDasCenas (texto igual) devolvia null. Trava (Node puro, sem rede), com o roteiro e as falas REAIS do despacho: (a) as seções casam com
// as cenas pela ordem e pelas palavras → [[0],[1,2],[3]]; (b) a cena fundida vira 2 planos com a fala REAL dividida por frase; (c) fala que
// não casa com nada = null (nunca adivinha); (d) o caso de texto igual continua pelo caminho exato. Mutantes no fim.
const ROTEIRO = "HOOK: [Pexels: ancient scrolls turning] Yahweh's first act was  the revelation about f his presence in a tangible form\n\nMICRO REWARD 1: [Pexels: sunrise over mountains] This manifestation is God, yet not all of God.\n\nMICRO REWARD 2: [Pexels: waves crashing on rocks] It begins a narrative, creating everything else.\n\nPAYOFF: [Pexels: stars in night sky] Romans 1:20 shows through creation, God's attributes are seen."
const FALAS = ["Yahweh's first act was revealing his presence in tangible form.", 'This manifestation is God, not all of God. It begins creating everything else.', "Romans 1:20 shows through creation, God's attributes are seen."]
const secoes = [...ROTEIRO.matchAll(/^(?:HOOK|MICRO REWARD \d|PAYOFF)[^:\n]*:\s*(?:\[Pexels:\s*([^\]]*)\])?\s*(.+)$/gmu)].map((m) => ({ pexelsQuery: (m[1] || '').trim(), voiceover: m[2].trim() }))
const PROMPTS = ['Photoreal film. Scrolls on a table. no readable text Mouth closed, no speaking.', 'Photoreal film. A glowing orb rises over the sea. no readable text Mouth closed, no speaking.', 'Photoreal film. A starry night sky. no readable text Mouth closed, no speaking.']
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let Q
  try { Q = loader(over)('lib/kling4QuatroPlanos.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  no(Q.secoesDasCenas(secoes, FALAS) !== null, 'premissa: o texto igual passou a casar (reveja o guardião)')
  const q = Q.planosPorSecao({ prompts: PROMPTS, stills: [null, null, null], falas: FALAS, secoes })
  no(!q || JSON.stringify(q.grupos) !== '[[0],[1,2],[3]]', `(a) grupos → ${JSON.stringify(q?.grupos)}`)
  if (q) {
    no(q.prompts.length !== 4, `(b) ${q.prompts.length} planos`)
    no(q.falas[1] !== 'This manifestation is God, not all of God.' || q.falas[2] !== 'It begins creating everything else.', `(b) falas das metades → ${JSON.stringify(q.falas.slice(1, 3))}`)
    no(q.falas[0] !== FALAS[0] || q.falas[3] !== FALAS[2], '(b) a fala real das cenas inteiras mudou')
    no(!/waves crashing on rocks/.test(q.prompts[2]) || !/This shot shows only this moment: It begins creating everything else\./.test(q.prompts[2]), `(b) metade 2 → ${q.prompts[2]}`)
  }
  no(Q.planosPorSecao({ prompts: PROMPTS, stills: [null, null, null], falas: ['A cat sleeps.', 'The market opens at dawn.', 'Rain falls on the city.'], secoes }) !== null, '(c) fala que não casa com nada virou plano')
  no(Q.planosPorSecao({ prompts: PROMPTS, stills: [null, null, null], falas: [FALAS[0], 'God begins a long journey across the stormy oceans and ancient mountains far away.', FALAS[2]], secoes }) !== null, '(c) cena que só divide 1 palavra com cada seção virou 2 planos (o limiar de 60 % não segurou)')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (fala reescrita: 4 planos, a fundida dividida pela fala real)')
const qp = read('lib/kling4QuatroPlanos.ts')
const MUT = [
  ['M1 só o texto igual vale', { 'lib/kling4QuatroPlanos.ts': qp.replace('const grupos = exatos ?? secoesPorPalavras(a.secoes, a.falas)', 'const grupos = exatos') }],
  ['M2 a metade usa a fala do roteiro', { 'lib/kling4QuatroPlanos.ts': qp.replace('const reais = !exatos && g.length > 1 ?', 'const reais = false ?') }],
  ['M3 o limiar some', { 'lib/kling4QuatroPlanos.ts': qp.replace('const LIMIAR_DA_CENA = 0.6', 'const LIMIAR_DA_CENA = 0') }],
]
for (const [nome, over] of MUT) {
  const novo = Object.values(over)[0]
  if (novo === qp) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const v = problems(over)
  if (!v.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${v[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
