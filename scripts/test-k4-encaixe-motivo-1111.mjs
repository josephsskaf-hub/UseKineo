// KINEO-K4-ENCAIXE-MOTIVO-1111 — quando o encaixe da fala do Kling 4 grátis desiste (o filme vai à reserva), o motivo vai ao banco
// (evento kling4_encaixe_falhou). Trava (Node puro: a lib real executada com encurtar/medir de mentira; sem rede): cada ponto de
// desistência relata o SEU motivo uma vez; sucesso não relata; o relato que lança nunca derruba o encaixe; a rota grava o evento.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
function loader(over = {}) {
  const cache = new Map()
  const load = (path) => {
    if (cache.has(path)) return cache.get(path).exports
    const module = { exports: {} }; cache.set(path, module)
    const req = (name) => {
      if (name.startsWith('node:')) return nativeRequire(name)
      const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), name)) : null
      const t = base && [base, `${base}.ts`, `${base}.tsx`].find((p) => existsSync(join(root, p)))
      if (!t) return nativeRequire(name)
      return load(t)
    }
    const js = ts.transpileModule(over[path] ?? read(path), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', 'process', 'fetch', js)(req, module, module.exports, { env: {} }, () => { throw new Error('rede proibida') })
    return module.exports
  }
  return load
}
const FALAS = ['The arena fills with thousands of spectators under the late sun today.', 'Vesuvius erupts and a column of ash rises high into the darkening sky.', 'Stones fall, the arena collapses and the terrified crowd runs for the exits.']
const fala = (seconds, cabe = seconds !== null && seconds <= 15.5) => ({ cabe, seconds, maxSeconds: 15.5, reason: cabe ? 'fits' : 'narration_over_kling4_15s' })
const curto = (l) => l.map((f) => f.split(' ').slice(0, 9).join(' ') + '.')

async function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let E
  try { E = loader(over)('lib/kling4TrialEncaixe.ts') } catch (e) { return [`lib não carrega: ${e.message}`] }
  no(E.ENCAIXE_FALHOU_EVENTO !== 'kling4_encaixe_falhou', 'evento com outro nome')
  const caso = async (nome, args, esperado) => {
    const motivos = []
    const r = await E.encaixarFalaNoKling4({ falas: FALAS, language: 'en', agora: () => 0, ...args, aoFalhar: (m) => motivos.push(m) })
    if (esperado === null) { no(!r || motivos.length !== 0, `${nome}: sucesso relatou falha (${motivos})`) }
    else { no(r !== null || motivos.length !== 1 || motivos[0] !== esperado, `${nome}: esperado ${esperado}, veio ${JSON.stringify(motivos)} (resultado ${r ? 'encaixou' : 'null'})`) }
  }
  await caso('sem medida', { fala: fala(null, false), medir: async () => fala(14), encurtar: async (l) => curto(l) }, 'sem_medida')
  await caso('encurtar não devolve', { fala: fala(19.3), medir: async () => fala(14), encurtar: async () => null }, 'encurtar_sem_texto')
  await caso('remedida falha', { fala: fala(19.3), medir: async () => fala(null, false), encurtar: async (l) => curto(l) }, 'remedida_falhou')
  await caso('curto demais', { fala: fala(19.3), medir: async () => fala(8), encurtar: async (l) => curto(l) }, 'curto_demais')
  const menos1 = (l) => l.map((f) => f.replace(/\s+\S+(?=\.$)/, ''))
  await caso('rodadas esgotadas', { fala: fala(19.3), medir: async () => fala(17), encurtar: async (l) => menos1(l) }, 'rodadas_esgotadas')
  await caso('erro', { fala: fala(19.3), medir: async () => { throw new Error('tts caiu') }, encurtar: async (l) => curto(l) }, 'erro')
  await caso('encaixou', { fala: fala(19.3), medir: async () => fala(14.2), encurtar: async (l) => curto(l) }, null)
  const r = await E.encaixarFalaNoKling4({ falas: FALAS, language: 'en', agora: () => 0, fala: fala(19.3), medir: async () => fala(17), encurtar: async (l) => menos1(l), aoFalhar: () => { throw new Error('banco caiu') } }).catch(() => 'lançou')
  no(r !== null, 'relato que lança derrubou o encaixe')
  const rota = read('app/api/generate-video-cinematic/route.ts')
  no(!/aoFalhar: \(motivo, detalhe\) => \{ void writeServerEvent\(\{ name: ENCAIXE_FALHOU_EVENTO,/.test(rota), 'rota: o motivo não vai ao banco')
  return p
}

const atual = await problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (6 motivos + sucesso sem relato)')
const src = read('lib/kling4TrialEncaixe.ts')
const MUT = [
  ['M1 rodadas esgotadas sem relato', src.replace("return falha('rodadas_esgotadas', { segundos })", 'return null')],
  ['M2 sucesso relata falha', src.replace('        return {\n          falas: novas, fala: medida,', "        a.aoFalhar?.('prazo')\n        return {\n          falas: novas, fala: medida,")],
]
for (const [nome, s2] of MUT) {
  if (s2 === src) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const v = await problems({ 'lib/kling4TrialEncaixe.ts': s2 })
  if (!v.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${v[0].slice(0, 140)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
