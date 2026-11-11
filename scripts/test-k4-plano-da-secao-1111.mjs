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
// KINEO-K4-PLANO-DA-SECAO-1111 — revisão da CEO no teste pago dos 4 planos (Pompeia en, US$ 2,36): (a) o plano de cena fundida
// repetia a AÇÃO da cena inteira; (b) o teto de 512 cortava no meio da palavra e da proibição ("consistent color g", "signage Mout").
// Trava (Node puro: o caminho REAL — compactador, planos por seção e montador do pedido — sobre os prompts reais do JSON do teste):
// cada plano da cena fundida traz a ação da SUA seção e nenhuma da outra; nenhum plano termina no meio de palavra; a cauda
// "Mouth closed, no speaking." inteira ou ausente; ≤ 512. Mutantes no fim.
const SUF = ' 9:16 vertical framing, subject framed in the upper two-thirds with the lower third clear for captions, smooth camera motion, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, mysterious, cinematic_dark, documentary, consistent color grade across all scenes, characters act naturally within the scene without addressing the viewer'
const ERA = ', period piece set strictly in the year 79 AD: every person, building, street, vehicle and object belongs to that exact time — period clothing, period architecture and period transport only, as it really looked then'
const P = [
  'Film visual medium: photorealistic, ultra-detailed. Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. photorealistic, ultra-detailed. Setting: Mount Vesuvius (the real, recognizable landmark, accurately depicted). A wide shot captures the bustling ancient Roman amphitheater, filled with thousands cheering, while ominous smoke billows from Mount Vesuvius in the background. Never a different or generic place.',
  'Film visual medium: photorealistic, ultra-detailed. photorealistic, ultra-detailed. Setting: Mount Vesuvius (the real, recognizable landmark, accurately depicted). A close-up of Mount Vesuvius erupts violently, fiery rocks shooting into the sky amidst a cloud of ash and smoke. Never a different or generic place.',
  "Film visual medium: photorealistic, ultra-detailed. Clear well-lit shot of the final moment with the subject fully recognizable, slow pull-back. photorealistic, ultra-detailed. Setting: Mount Vesuvius (the real, recognizable landmark, accurately depicted). The camera shakes as the amphitheater collapses under a torrent of volcanic debris, chaos erupting as Pompeii succumbs to Vesuvius's fury. Never a different or generic place.",
].map((p) => p + SUF + ERA + ', 9:16 vertical framing')
const STILLS = ['https://x/s1.jpg', 'https://x/s2.jpg', 'https://x/s3.jpg']
const SECOES = [['ancient roman amphitheater', 'Thousands cheer—unaware of looming doom.'], ['mount vesuvius smoking', 'A plume rises from Mount Vesuvius... dark and menacing.'], ['volcanic eruption explosion', 'Vesuvius erupts violently, hurling fiery rocks.'], ['amphitheater collapsing under volcanic debris', "The amphitheater crumbles—engulfed in chaos... as Pompeii falls under Vesuvius's wrath."]].map(([q, v]) => ({ pexelsQuery: q, voiceover: v }))
const FALAS = [`${SECOES[0].voiceover} ${SECOES[1].voiceover}`, SECOES[2].voiceover, SECOES[3].voiceover]

function problems(over) {
  const p = []
  const no = (bad, msg) => { if (bad) p.push(msg) }
  let K, S, Q, T
  try { const load = loader(over); K = load('lib/cinematic/cenaKling4.ts'); S = load('lib/cinematic/sceneStyle.ts'); Q = load('lib/kling4QuatroPlanos.ts'); T = load('lib/kling4Trial.ts') } catch (e) { return [`fonte não carrega: ${e.message}`] }
  const style = S.deriveStyleAnchor('photorealistic documentary')
  const prompts = P.map((x, i) => K.promptDaCenaKling4(x, style, i, true))
  const q = Q.planosPorSecao({ prompts, stills: STILLS, falas: FALAS, secoes: SECOES })
  if (!q) return ['Pompeia: não virou 4 planos']
  const mp = T.buildKling4TrialInput(q.prompts, q.stills, { voiceovers: q.falas, wordsPerSecond: 2.45 }).input.multi_prompt
  no(mp.length !== 4, `Pompeia: ${mp.length} planos`)
  const [a, b] = mp.map((m) => m.prompt)
  no(!/Thousands cheer/.test(a) || /plume rises/i.test(a), 'plano 1: não é a ação da seção 1 (ou traz a da seção 2)')
  no(!/plume rises from Mount Vesuvius/.test(b), 'plano 2: não traz a ação da SUA seção (fumaça do Vesúvio)')
  no(/bustling ancient Roman amphitheater/i.test(b), 'plano 2: repete a ação da cena inteira (o anfiteatro do plano 1)')
  no(!/ancient roman amphitheater/i.test(a) || !/mount vesuvius smoking/i.test(b), 'pista da seção fora do plano')
  no(!/Setting: Mount Vesuvius/.test(b) || !/period piece set strictly in the year 79 AD/.test(b), 'plano 2: perdeu o lugar ou a época da cena')
  for (const [k, m] of mp.entries()) {
    const t = m.prompt
    no(Array.from(t).length > 512, `plano ${k + 1}: passou de 512`)
    no(/Mout\b|Mouth(?! closed, no speaking\.$)/.test(t) && !t.endsWith(' Mouth closed, no speaking.'), `plano ${k + 1}: cauda da boca cortada → …${t.slice(-40)}`)
    const corpo = t.replace(/ Mouth closed, no speaking\.$/, '')
    no(!t.endsWith(' Mouth closed, no speaking.'), `plano ${k + 1}: sem a cauda da boca inteira → …${t.slice(-40)}`)
    no(!/(?:[.!?]|signage|frame|subtitles|watermarks|blurred|unreadable)$/.test(corpo), `plano ${k + 1}: o corte não caiu em fronteira → …${corpo.slice(-40)}`)
    no(/color g|, (?:no|never|not)s*$/.test(t), `plano ${k + 1}: palavra partida ou proibição decapitada no meio → ${t.slice(0, 80)}`)
    no(/color g$|signage Mout$/.test(corpo), `plano ${k + 1}: termina no meio da palavra → …${corpo.slice(-40)}`)
  }
  const longo = `Scene 9: use middle keyframe 1. ${'Photoreal film. Setting: Mount Vesuvius (the real, recognizable landmark, accurately depicted). '.repeat(4)}, no readable text, letters, numbers, labels or signage anywhere in the frame, consistent color grade across all scenes Mouth closed, no speaking.`
  const c = T.cabeNoTetoDoPlano(longo)
  const viaMontador = T.buildKling4TrialInput([longo.replace(/^Scene 9: use middle keyframe 1. /, '')], [null], { voiceovers: ['one two three'], wordsPerSecond: 2 }).input.multi_prompt[0].prompt
  no(Array.from(viaMontador).length > 512 || !viaMontador.endsWith(' Mouth closed, no speaking.') || /color g|Mout$/.test(viaMontador), `montador: o plano longo saiu cortado no meio → …${viaMontador.slice(-60)}`)
  no(Array.from(c).length > 512 || !c.endsWith(' Mouth closed, no speaking.') || /Mout$|color g/.test(c), `cortador: …${c.slice(-60)}`)
  return p
}

const atual = problems({})
assert.deepEqual(atual, [], `violações:\n  ${atual.join('\n  ')}`)
let n = 1, falhas = 0
console.log('ok  estado atual limpo (4 planos: cada um com a ação da sua seção; corte em fronteira de frase)')
const qp = read('lib/kling4QuatroPlanos.ts'), kt = read('lib/kling4Trial.ts')
const MUT = [
  ['M1 metade volta a levar a cena inteira', { 'lib/kling4QuatroPlanos.ts': qp.replace('prompts.push(g.length === 1 ? a.prompts[i] : promptDaSecao(a.prompts[i], secao, { objetoConcreto: a.objetoConcreto === true }))' /* KINEO-SECAO-COM-FALA-REESCRITA-1111: a seção pode vir com a fala real */, 'prompts.push(g.length === 1 ? a.prompts[i] : `Shot focus: ${pista(a.secoes[j])}. ${a.prompts[i]}`)') }],
  ['M2 corte volta ao code point 512', { 'lib/kling4Trial.ts': kt.replace('const bounded = cabeNoTetoDoPlano(reference + prompt)', "const bounded = Array.from(reference + prompt).slice(0, 512).join('')") }],
  ['M3 cortador ignora a cauda', { 'lib/kling4Trial.ts': kt.replace('const temCauda = texto.endsWith(CAUDA_DA_BOCA)', 'const temCauda = false') }],
]
for (const [nome, over] of MUT) {
  const novo = Object.values(over)[0]
  if (novo === qp || novo === kt) { console.log(`FALHA ${nome}: não aplicou`); falhas++; continue }
  const v = problems(over)
  if (!v.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++ } else { console.log(`ok  ${nome}: vermelho (${v[0].slice(0, 150)})`); n++ }
}
console.log(`${n} ok · ${falhas} falha(s)`)
if (falhas) process.exit(1)
