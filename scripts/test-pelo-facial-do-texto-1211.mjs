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
      if (!target) return new Proxy({}, { get: () => () => ({}) })
      return load(target)
    }
    const js = ts.transpileModule(over[path] ?? read(path), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', 'process', 'fetch', js)(req, module, module.exports, { env: {} }, () => { throw new Error('rede proibida') })
    return module.exports
  }
  return load
}
// KINEO-PELO-FACIAL-DO-TEXTO-1211 — CEO 12/11 02:25 ("as DUAS camadas"): a barba, o bigode ou o barbeado que o pedido ou o roteiro citam entram na ficha
// ANTES da folha; sem menção, vale a leitura da folha (KINEO-PELO-FACIAL-1211). Trava (Node puro), com o dry-run do elenco REAL da Mona Lisa: (a) o
// roteiro real não cita pelo facial → a ficha do Peruggia fica byte a byte (vale a leitura da folha); (b) "with a thick grey beard" entra na ficha do
// personagem citado, antes da folha; (c) a menção de OUTRO personagem não entra; (d) a rota passa o elenco do pedido por aqui antes do casting. Mutantes.
const PF = 'lib/cinematic/peloFacialDoTexto.ts', PA = 'lib/cinematic/personagemAjuste.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const MONA = 'The Mona Lisa vanished... and nobody noticed until the next day. Vincenzo Peruggia, an Italian handyman, hid in a storage closet. On Monday, he slipped the painting under his white work smock. Crowds lined up to see... four empty iron hooks. Paris panicked. Picasso questioned. Apollinaire jailed. Two years. Hidden. In a trunk. In 1913, Peruggia tried selling her in Florence... The dealer called the police.'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let F, A
  try { const load = loader(over); F = load(PF); A = load(PA) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const antes = A.elencoDoRoteiro(MONA)
  no(!antes.some((x) => /Peruggia/.test(x.nome)), `(a) o elenco real não tem o Peruggia → ${JSON.stringify(antes.map((x) => x.nome))}`)
  const depois = F.comPeloFacialDoTexto(antes, MONA)
  no(JSON.stringify(depois) !== JSON.stringify(antes), '(a) a Mona Lisa (sem menção) mudou a ficha')
  const comBarba = MONA.replace('Vincenzo Peruggia, an Italian handyman,', 'Vincenzo Peruggia, an Italian handyman with a thick dark moustache,')
  const fichaB = F.comPeloFacialDoTexto(A.elencoDoRoteiro(comBarba), comBarba).find((x) => /Peruggia/.test(x.nome))
  no(!fichaB || !fichaB.canonica.includes('facial hair as written: thick dark moustache'), `(b) a menção não entrou → ${fichaB?.canonica?.slice(0, 200)}`)
  const dois = [{ nome: 'Tom', nucleo: 'Tom', tipo: 'humano', canonica: 'Tom, a young sailor' }, { nome: 'Ahab', nucleo: 'Ahab', tipo: 'humano', canonica: 'Ahab, an old captain' }]
  const r = F.comPeloFacialDoTexto(dois, 'Tom climbed the mast. Ahab, with a long grey beard, stared at the sea.')
  no(r[0].canonica !== 'Tom, a young sailor' || !r[1].canonica.includes('facial hair as written: long grey beard'), `(c) atribuição → ${JSON.stringify(r.map((x) => x.canonica))}`)
  const liso = F.comPeloFacialDoTexto([{ nome: 'Ben', nucleo: 'Ben', tipo: 'humano', canonica: 'Ben, a young chef' }], 'Ben, clean-shaven and nervous, opens his restaurant.')
  no(!liso[0].canonica.includes('facial hair as written: clean-shaven'), '(b) "clean-shaven" não entrou')
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes('const elencoDoPedido: FichaDePersonagem[] = comPeloFacialDoTexto(elencoSemantico ? elencoSemantico.elenco : baseConferida.elenco,'), '(d) a rota não passa o elenco por aqui')
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (Mona Lisa sem menção = ficha igual; barba/bigode citados entram antes da folha, no personagem certo)')
const pf = read(PF), rota = read(ROTA)
const MUT = [
  ['M1 a menção de outro personagem entra', { [PF]: pf.replace('    if (!unicoHumano && !palavrasDoNome.some(', '    if (false && !palavrasDoNome.some(') }],
  ['M2 a rota não aplica', { [ROTA]: rota.replace('const elencoDoPedido: FichaDePersonagem[] = comPeloFacialDoTexto(elencoSemantico ? elencoSemantico.elenco : baseConferida.elenco,', 'const elencoDoPedido: FichaDePersonagem[] = ((x: FichaDePersonagem[], _t: string) => x)(elencoSemantico ? elencoSemantico.elenco : baseConferida.elenco,') }],
  ['M3 a ficha ignora o pelo', { [PF]: pf.replace('    if (!pelo) return f\n', '    return f\n') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
