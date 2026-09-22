// KINEO-JUIZ-VE-A-CENA-1 + KINEO-PREFIXO-SEM-PESSOA — 2026-09-22 (render H3 19e317fe, juiz 80 / visual 60).
// (1) `submitted_prompts` da estrada hollywood era gravado em hs.index (1-based) → [null, p1..pN]; o juiz lê 0-based e
//     dizia "Cena 1 não tem conteúdo visual" / "Cena 6 sem visual" em TODO filme hollywood — visual sempre rebaixado.
// (2) o prefixo de silêncio "Every visible person is silent, mouth closed…" presumia uma pessoa: o H3 desenhou um homem
//     de celular na cena "whole forests were stripped from the slopes".
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const rt = rd('app/api/generate-video-cinematic/route.ts')

console.log('== (1) o prompt de cada cena hollywood cai no índice que o juiz lê ==')
checa('as 3 gravações hollywood usam hs.index - 1 (0-based, como scene_index e como o clássico)', (rt.match(/ctxDespacho\(\)\.submittedPrompts\[hs\.index - 1\] = submittedPrompt\.slice\(0, 240\)/g) || []).length === 3 && !/submittedPrompts\[hs\.index\] =/.test(rt))
checa('o clássico segue 0-based (c.submittedPrompts[sceneIndex])', rt.includes('c.submittedPrompts[sceneIndex] = cinematic.slice(0, 240)'))
// O leitor do painel: com os prompts alinhados, a cena 1 tem prompt e a última também (sem buraco no 0).
function roda(file, requireMap = {}) {
  const exports = {}
  const js = ts.transpileModule(rd(file), { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: (m) => requireMap[m] ?? {}, process: { env: {} }, console: { log() {}, warn() {}, error() {} }, Math, Date, Number, Set, Map, Array, JSON, Object, RegExp, String, Promise }, { filename: file })
  return exports
}
const LA = roda('lib/admin/fastCoherence.ts', { '@/lib/fastCoherence': { FAST_COHERENCE_VERSION: 'x', scoreFastCoherence: async () => null }, '@/lib/serverEvents': { writeServerEvent: async () => true }, '@/lib/fastAiClips': { parsePendingAiClips: () => [] } })
const ev = LA.evidenceFromDispatch({ submitted_prompts: ['p1', 'p2', 'p3'], scenes: [{ scene_index: 0, disposition: 'accepted' }, { scene_index: 1, disposition: 'accepted' }, { scene_index: 2, disposition: 'accepted' }] })
checa('juiz: 3 prompts 0-based → cena 1 e cena 3 com prompt (era null na 1 e prompt sobrando fora do filme)', ev.length === 3 && ev[0].query === 'p1' && ev[2].query === 'p3')
const antigo = LA.evidenceFromDispatch({ submitted_prompts: [null, 'p1', 'p2', 'p3'], scenes: [{ scene_index: 0, disposition: 'accepted' }, { scene_index: 1, disposition: 'accepted' }, { scene_index: 2, disposition: 'accepted' }] })
checa('a forma antiga ([null, p1…]) de fato cegava a cena 1 — o defeito era real', antigo[0].query === null)

console.log('== (2) o prefixo de silêncio não presume uma pessoa ==')
checa('prefixo novo nas famílias sem negative_prompt (h3/omni/s25)', rt.includes("? 'Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. '"))
checa('a frase antiga ("Every visible person is silent") morreu', !rt.includes('Every visible person is silent'))
checa('continua só em cena não-diálogo e fora do Kling 3 (que tem negative_prompt)', rt.includes("const mouthPrefix = hs.type !== 'dialogue' && family !== 'hollywood'"))

console.log('== mutante ==')
checa('mutante (uma gravação volta a hs.index) é pego', (rt.replace('ctxDespacho().submittedPrompts[hs.index - 1] = submittedPrompt.slice(0, 240)', 'ctxDespacho().submittedPrompts[hs.index] = submittedPrompt.slice(0, 240)').match(/submittedPrompts\[hs\.index - 1\]/g) || []).length === 2)

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
