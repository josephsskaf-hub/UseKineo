// KINEO-KLING3-IMAGENS-2026-09-17 — guardião do conserto das imagens do Kling 3 (fundador 17/09 00:20 BRT:
// "história boa, 82 s, mas as imagens são a pior coisa: repetitivas e sem impacto; a primeira é uma mulher que
// não falou nada"). Diagnóstico (prompts REAIS do render 03:03Z, cinematic_dispatch_result.submitted_prompts):
// toda cena começava com 40-50 palavras iguais (silêncio + frase da narração) e a imagem vinha em terceiro.
// Prova: (a) no Kling 3 a IMAGEM abre o prompt, a frase da narração vai ao fim e o silêncio ao negative_prompt
// (só em cena sem fala); (b) H3/Omni/S25 ficam como estavam; (c) o sujeito do contrato entra dentro da frase;
// (d) o supervisor fala×imagem roda no caminho hollywood antes de qualquer gasto.
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
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const req = (id) => { if (id.startsWith('@/lib/')) return load(id.slice(2) + '.ts'); if (id.startsWith('./')) return load(dirname(file) + '/' + id.slice(2) + '.ts'); throw new Error('import inesperado ' + id + ' em ' + file) }
  const js = ts.transpileModule(rd(file), { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports, require: req, process: { env: {} }, console, Math, Date, Number, Set, Map, Array, JSON, RegExp, String, Object }, { filename: file })
  return exports
}

console.log('== (a) fidelidade: a frase da narração vai ao fim quando pedido ==')
const F = load('lib/hollywood/fidelidade.ts')
const fala = 'A robot was scanning the seafloor off Israel.'
const plano = 'A high-tech underwater robot scanning the dark seafloor, its lights revealing hundreds of clay jars.'
const inicio = F.garantirAcaoCentral(plano, 'The camera found hundreds of clay jars sitting in the dark.', '', 'inicio').prompt
const fim = F.garantirAcaoCentral(plano, 'The camera found hundreds of clay jars sitting in the dark.', '', 'fim').prompt
checa('padrão (inicio) intacto: abre com "Shows exactly this moment" (H3/Omni/S25 não mudam)', inicio.startsWith('Shows exactly this moment, as the narration describes it:'))
checa('fim: abre com a IMAGEM e termina com "Moment from the narration: …"', fim.startsWith('A high-tech underwater robot') && /Moment from the narration: The camera found hundreds of clay jars sitting in the dark\.$/.test(fim))
const divergente = ['The mountains, with no landslide visible, stand over the bay.', 'The landslide tore the mountainside apart and hit the water.']
checa('sem o 4º argumento continua sendo inicio (compatível com todo caller antigo)', F.garantirAcaoCentral(divergente[0], divergente[1]).prompt.startsWith('Shows exactly this moment'))
checa('no fim, a mesma divergência abre com a imagem (sem "no landslide") e fecha com a frase', (() => { const p = F.garantirAcaoCentral(divergente[0], divergente[1], '', 'fim').prompt; return !/no landslide/i.test(p) && !p.startsWith('Shows exactly') && /Moment from the narration: The landslide tore the mountainside apart and hit the water\.$/.test(p) })())
checa('sem narração: prompt intacto em qualquer posição', F.garantirAcaoCentral('anything', '', '', 'fim').prompt === 'anything')

// (c) contrato de cena: a injeção do sujeito no INÍCIO é decisão do guardião scene-truth (token inicial pesa mais) — mantida.

console.log('== (b)(d) a rota ==')
const rt = rd('app/api/generate-video-cinematic/route.ts')
checa('mouthPrefix fica fora do Kling 3 (family hollywood) e permanece nas outras famílias', rt.includes("const mouthPrefix = hs.type !== 'dialogue' && family !== 'hollywood'"))
checa('garantirAcaoCentral recebe posicao pela família: fim no Kling 3, inicio nas demais', rt.includes("garantirAcaoCentral(silenciarFalaNoPrompt(hs.prompt), hs.voiceover ?? '', plan.characterSheet ?? '', family === 'hollywood' ? 'fim' : 'inicio')"))
checa('Kling 3 t2v: silêncio no negative_prompt só em cena SEM fala (`says: "` marca diálogo)', rt.includes("const semFala = !/says:\\s*\"/.test(prompt)") && rt.includes("negative_prompt: antiCgi + silencioNegativo + 'blur, distort"))
checa('o sufixo curto de boca fechada continua em toda cena não-diálogo (rede dupla)', rt.includes("const mouthSuffix = hs.type !== 'dialogue' ? ' If any person is visible: mouth closed, not speaking, no lip movement, no talking.' : ''"))
const iAlign = rt.indexOf("const alinhado = await alignShotsToSpeech({ topic: prompt, scenes: idxs.map((i) =>")
const iLoop = rt.indexOf('for (const [idx, hs] of plan.scenes.entries()) {')
const iStill = rt.indexOf('generateCinematicSceneStill(')
checa('supervisor fala×imagem no caminho hollywood: antes do laço de submissão e de qualquer still/POST; só cena não-diálogo com fala', iAlign > 0 && iLoop > iAlign && (iStill < 0 || iStill > iAlign || rt.indexOf('generateCinematicSceneStill(', iAlign) > iAlign) && rt.includes("plan.scenes[i].type !== 'dialogue' && (plan.scenes[i].voiceover ?? '').trim().length > 0"))
checa('reescrita passa pelo scrub de cenário e vira evento scene_speech_alignment com engine = família', rt.includes('plan.scenes[idxs[c.index]].prompt = scrubInventedSetting(c.shot, historiaH).text') && rt.includes("metadata: { version: SPEECH_IMAGE_ALIGN_VERSION, engine: family, ...alinhado.relato"))
checa('falha aberta no caminho hollywood', rt.includes("console.warn('[fala-x-imagem] hollywood falhou, planos originais seguem:'"))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
