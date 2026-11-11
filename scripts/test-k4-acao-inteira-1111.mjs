// KINEO-K4-ACAO-INTEIRA-1111 — no prompt de cada plano do Kling 4 (teto 512), a AÇÃO da cena não é mais cortada pela cauda da ficha
// do personagem ("…, seen from behind or in profile, face not readable."). Trava (Node puro: as fontes reais transpiladas, sem rede):
// (a) o plano 3 REAL de Pompeia (claim de 11/11 07:33 UTC) sai com a ação inteira ("spectators flee") e ≤ 512; antes saía
// "crumbling stones falling fr"; (b) a ficha continua no plano, com o "de costas"; (c) filme sem a cauda (rosto visível) e sem
// ficha: o prompt de antes. Mutantes no fim.
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
const FICHA = 'Fiery, a person in their thirties with straight hair, high cheekbones and dark eyes, wearing an olive jacket and plain trousers, origin: a Roman person, with the natural features of Roman people'
const SUF = ', faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, mysterious, cinematic_dark, documentary, consistent color grade across all scenes, 9:16 vertical framing'
const PLANO3 = `Film visual medium: photorealistic, ultra-detailed. Named character in this shot: ${FICHA} — clearly visible in frame, seen from behind or in profile, face not readable. A close-up of crumbling stones falling from the arena's structure, as terrified spectators flee in all directions, panic etched on their faces.${SUF}`
const COM_ROSTO = PLANO3.replace(', seen from behind or in profile, face not readable', '')

function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let K, S
  try { const load = loader(over); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const style = S.deriveStyleAnchor('photorealistic documentary')
  for (const gratis of [true, false]) {
    const out = K.promptDaCenaKling4(PLANO3, style, 2, gratis)
    no(Array.from(out).length > 512, `Pompeia (${gratis ? 'grátis' : 'pago'}): passou de 512 (${Array.from(out).length})`)
    no(!/terrified spectators flee/.test(out), `Pompeia (${gratis ? 'grátis' : 'pago'}): a ação foi cortada → ${out.slice(0, 260)}`)
    no(!/Visible(?:, seen from behind)?: Fiery/.test(out) || !/seen from behind/.test(out), /* KINEO-K4-PLANO-DA-SECAO-1111: o "de costas" foi para o rótulo */ `Pompeia (${gratis ? 'grátis' : 'pago'}): a ficha ou o "de costas" sumiram`)
    no(/face not readable\.\s+A close-up/.test(out) && out.indexOf('face not readable') < out.indexOf('Visible:'), 'Pompeia: a cauda da ficha voltou para a ação')
    const rosto = K.promptDaCenaKling4(COM_ROSTO, style, 2, gratis)
    no(/seen from behind/.test(rosto), 'com rosto: ganhou "de costas" que o pedido não tem')
    no(!/terrified spectators flee/.test(rosto) || Array.from(rosto).length > 512, 'com rosto: ação cortada ou passou de 512')
  }
  return p
}

const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (Pompeia plano 3: a ação inteira cabe nos 512)')
const fq = read('lib/cinematic/filmQuality.ts')
const MUT = [
  ['M1 regex volta a parar antes da cauda', { 'lib/cinematic/filmQuality.ts': fq.replace('— clearly visible in frame(, seen from behind or in profile, face not readable)?\\.?/i', '— clearly visible in frame/i') /* KINEO-K4-PLANO-DA-SECAO-1111: \\. — a fonte agora tem o ponto escapado */ }],
  ['M2 a ficha perde o "de costas"', { 'lib/cinematic/filmQuality.ts': fq.replace("`Visible${deCostas ? ', seen from behind' : ''}: ${visible(budget)}. `", '`Visible: ${visible(budget)}. `') }], // KINEO-K4-PLANO-DA-SECAO-1111
]
for (const [nome, over] of MUT) {
  if (Object.values(over)[0] === fq) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const v = problems(over)
  if (!v.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${v[0].slice(0, 160)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
