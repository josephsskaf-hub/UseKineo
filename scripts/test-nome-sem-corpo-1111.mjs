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
// KINEO-NOME-SEM-CORPO-1111 — vigia 11/11 (filme 2120f018, 7,0): "This manifestation is God, yet not all of God" virou a ficha "God, exactly as the
// author wrote: "manifestation is God"; a living creature…" + "The only person in this shot is the same main character (God…" e o filme acabou
// com uma pessoa de costas. Mesma família do argentinossauro (e9418905): "Argentinosaurus, a person in their thirties" (KINEO-ESPECIE-NAO-E-GENTE).
// Trava (Node puro, sem rede), com os textos REAIS dos dois despachos: (a) o elenco do roteiro (personagemAjuste.elencoDoRoteiro) não tem "God";
// (b) o elenco de época (elencoEpoca.personagensNomeados) não tem "God" nem gente chamada "Argentinosaurus"; (c) nomeSemCorpo: God, Yahweh,
// the Lord, Allah, Holy Spirit sim; Jesus, Moses, Lord Krishna, Godfrey, Gordon não; (d) a leitura semântica com "God" de protagonista cai
// para o elenco de sempre. Mutantes no fim.
const ROTEIRO_DEUS = "HOOK: [Pexels: ancient scrolls turning] Yahweh's first act was  the revelation about f his presence in a tangible form\n\nMICRO REWARD 1: [Pexels: sunrise over mountains] This manifestation is God, yet not all of God.\n\nMICRO REWARD 2: [Pexels: waves crashing on rocks] It begins a narrative, creating everything else.\n\nPAYOFF: [Pexels: stars in night sky] Romans 1:20 shows through creation, God's attributes are seen."
const TRADUZIDO_DINO = 'Who knew dinosaurs could weigh more than 10 buses? Argentinosaurus was 35 meters long — a huge giant. Argentinosaurus weighed up to 100 tons, like 10 school buses together.'
const NSC = 'lib/cinematic/nomeSemCorpo.ts', AJ = 'lib/cinematic/personagemAjuste.ts', EE = 'lib/cinematic/elencoEpoca.ts', ES = 'lib/cinematic/elencoSemantico.ts'
function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let N, A, E, S
  try { const load = loader(over); N = load(NSC); A = load(AJ); E = load(EE); S = load(ES) } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const el = A.elencoDoRoteiro(ROTEIRO_DEUS)
  no(el.some((f) => /^(?:god|yahweh)$/i.test(f.nome)), `(a) elenco do roteiro com divindade → ${JSON.stringify(el.map((f) => f.nome))}`)
  const nomeados = [...E.personagensNomeados(ROTEIRO_DEUS.replace(/^[A-Z ]+\d?:\s*\[[^\]]*\]\s*/gmu, '')), ...E.personagensNomeados(TRADUZIDO_DINO)]
  no(nomeados.some((x) => /^(?:god|yahweh)$/i.test(x.nome) || (/argentinosaurus/i.test(x.nome) && x.tipo === 'humano')), `(b) elenco de época → ${JSON.stringify(nomeados.map((x) => [x.nome, x.tipo]))}`)
  for (const n of ['God', 'Yahweh', 'the Lord', 'Allah', 'Holy Spirit', 'Jehovah', 'the Almighty']) no(!N.nomeSemCorpo(n), `(c) ${n} devia ser sem corpo`)
  for (const n of ['Jesus', 'Moses', 'Lord Krishna', 'Godfrey', 'Gordon', 'Mara', 'Zeus']) no(N.nomeSemCorpo(n), `(c) ${n} não é sem corpo`)
  const base = [{ nome: 'God', nucleo: 'God', tipo: 'criatura', origem: 'deterministica', canonica: 'God, a living creature', protagonista: true }]
  const lido = S.aplicarElencoSemantico(base, { protagonist: { name: 'God', role: 'deity', kind: 'creature', species: 'deity', species_text: 'God', role_text: 'God' }, supporting: [], places_and_orgs: [] }, ROTEIRO_DEUS)
  no(lido && lido.elenco.some((f) => /^god$/i.test(f.nome)), `(d) a leitura semântica manteve God → ${JSON.stringify(lido?.elenco.map((f) => f.nome))}`)
  return p
}
const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (God/Yahweh e Argentinosaurus não viram gente em nenhum elenco)')
const aj = read(AJ), ee = read(EE), es = read(ES), nsc = read(NSC)
const MUT = [
  ['M1 o elenco do roteiro volta a pôr God', { [AJ]: aj.replace('(?:god|yahweh|jehovah|', '(?:nunca|') }],
  ['M2 a semântica volta a pôr God', { [ES]: es.replace('(?:god|yahweh|jehovah|', '(?:nunca|') }],
  ['M3 Jesus vira sem corpo', { [NSC]: nsc.replace('(?:god|yahweh|', '(?:jesus|god|yahweh|') }],
]
for (const [nome, over] of MUT) {
  const [k, v] = Object.entries(over)[0]
  if (v === read(k)) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const r = problems(over)
  if (!r.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${r[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
