// KINEO-1-HIBRIDO-2026-09-16 — guardião: cena que o banco de imagens não cobre vira still gerado (fundador 16/09:
// "Vai! Já é uma melhora significativa"). Prova: (a) a decisão é pura e nomeia o motivo; (b) a heurística de nome
// próprio pega os casos reais do dia (Bezos, Ayodhya, Strasbourg 1518) e não dispara em fala genérica; (c) o prompt
// do still proíbe texto legível e rosto de pessoa real; (d) a rota do Kineo 1 tenta o still ANTES do stock quando a
// cena está marcada e ANTES de reciclar clipe quando o Pixabay falha, com teto por filme e falha aberta; (e) o
// montador transforma URL de imagem em elemento de imagem com o mesmo Ken Burns; (f) o plano do cliente leva o
// 'source'; (g) a URL do fal nunca chega ao compose (persistência no nosso bucket).
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

// a lib sem os imports de rede (anchors + supabase) — só a parte pura
const libSrc = rd('lib/fastAiScene.ts')
const puro = libSrc.split('\n').filter((l) => !/^import /.test(l)).join('\n')
const roda = (src, env = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, process: { env }, Buffer, fetch: () => { throw new Error('rede') }, AbortSignal }); return exp }
const L = roda(puro)

console.log('== (a)(b) decisão e nome próprio ==')
checa('ligado por padrão; KINEO_FAST_AI_SCENES=off desliga', L.FAST_AI_SCENES_ENABLED === true && roda(puro, { KINEO_FAST_AI_SCENES: 'off' }).decideFastAiScene({ planSource: 'ai' }).ai === false)
checa('teto padrão 4 por filme (R2); env vale; máximo 6', L.fastAiScenesMax() === 4 && roda(puro, { KINEO_FAST_AI_SCENES_MAX: '2' }).fastAiScenesMax() === 2 && roda(puro, { KINEO_FAST_AI_SCENES_MAX: '40' }).fastAiScenesMax() === 6)
checa('plano diz ai → still (plan_ai)', L.decideFastAiScene({ planSource: 'ai' }).reason === 'plan_ai')
checa('relevância conhecida < 60 → still; 60+ não; desconhecida não', L.decideFastAiScene({ relevanceScore: 41 }).reason === 'low_relevance' && !L.decideFastAiScene({ relevanceScore: 60, voiceover: 'the sun rises over the sea' }).ai && !L.decideFastAiScene({ relevanceScore: null, voiceover: 'the sun rises over the sea' }).ai)
checa('"5 morning habits Jeff Bezos used" → named_entity Jeff Bezos', L.mentionsNamedEntity('Every morning, Jeff Bezos wakes up without an alarm.') === 'Jeff Bezos')
checa('"the sacred city of Ayodhya" → Ayodhya (capitalizada fora do início da frase)', L.mentionsNamedEntity('Golden light falls over the sacred city of Ayodhya.') === 'Ayodhya')
checa('"the Rama Setu shoals" → Rama Setu', L.mentionsNamedEntity('Satellite imagery shows the Rama Setu shoals between India and Sri Lanka.') === 'Rama Setu')
checa('"In July 1518, in Strasbourg" → entidade', L.mentionsNamedEntity('In July 1518, a woman stepped onto a street in Strasbourg and began to dance.') !== null)
checa('fala genérica não dispara ("Your brain stores bad memories…", "Imagine losing control…")', L.mentionsNamedEntity('Your brain stores bad memories with three times more detail than good ones.') === null && L.mentionsNamedEntity('Imagine losing total control of your own body. Nobody knows why.') === null)
checa('Pixabay sem resultado → still (pixabay_miss) mesmo sem entidade', L.decideFastAiScene({ voiceover: 'the sun rises over the sea', pixabayMiss: true }).reason === 'pixabay_miss')

console.log('== (c) prompt do still ==')
const p1 = L.buildFastStillPrompt({ description: 'a founder at a wooden desk at sunrise', voiceover: 'Jeff Bezos starts the day slowly.', entity: 'Jeff Bezos' })
checa('proíbe texto legível, logos e rosto de pessoa real; nome famoso vira cena simbólica', /No readable text/.test(p1) && /no real person's face/.test(p1) && /never a recognizable face/.test(p1) && /Jeff Bezos/.test(p1))
checa('sem descrição, usa a query e depois a fala', /rain over old streets/.test(L.buildFastStillPrompt({ query: 'rain over old streets' })) && /the sun rises/.test(L.buildFastStillPrompt({ voiceover: 'the sun rises over the sea' })))
checa('seed estável por prompt', L.fastStillSeed('abc') === L.fastStillSeed('abc') && L.fastStillSeed('abc') !== L.fastStillSeed('abd'))
checa('a URL do fal nunca passa (persistFastStill devolve só bucket próprio); falha aberta', /if \(!durable \|\| FAL_URL_RE\.test\(durable\)\) return null/.test(libSrc) && /catch \{\n    return null\n  \}/.test(libSrc))
checa('o still vem da mesma peça das âncoras (generateCinematicSceneStill) com janela de 10 s e 9:16', libSrc.includes("import { generateCinematicSceneStill } from '@/lib/hollywood/anchors'") && libSrc.includes('FAST_AI_STILL_WINDOW_MS = 10_000') && libSrc.includes("aspect: args.aspect ?? '9:16'"))

console.log('== (d) rota do Kineo 1 ==')
const rt = rd('app/api/generate-video-fast/route.ts')
checa('rota importa a decisão, o prompt, o gerador, a seed e o teto', /import \{[^}]*decideFastAiScene[^}]*buildFastStillPrompt[^}]*generateFastSceneStill[^}]*fastStillSeed[^}]*fastAiScenesMax[^}]*\} from '@\/lib\/fastAiScene'/.test(rt))
checa('teto por filme: tentarStill devolve null quando aiStillsUsed >= aiStillsMax', rt.includes('if (aiStillsUsed >= aiStillsMax) return null'))
checa('still ANTES do stock quando plano/relevância/nome próprio marcam a cena (não no pixabay_miss aqui)', rt.includes("if (dec.ai && dec.reason !== 'pixabay_miss') {") && rt.indexOf("if (dec.ai && dec.reason !== 'pixabay_miss') {") < rt.indexOf('const sceneNeedsPeople = sceneHasPeopleVocabulary('))
checa('still ANTES de reciclar clipe quando o Pixabay não acha nada', rt.indexOf('Pixabay miss — falling through to FALLBACK-A/B') < rt.indexOf('pixabayMiss: true }') && rt.indexOf('pixabayMiss: true }') < rt.indexOf('// FALLBACK-A: cycle through previous valid clips'))
checa('R2: o still da cena marcada SOMA ao stock (sem continue); só no Pixabay-miss o still fecha a cena', (rt.match(/clipSources\.push\('aiStill'\)\n\s+continue/g) || []).length === 1 && (rt.match(/clipSources\.push\('aiStill'\)/g) || []).length === 2 && rt.includes("| 'aiStill'"))
checa('R2: seed varia por tentativa (2ª imagem da mesma cena não repete a 1ª)', rt.includes('seed: aiStillSeed + sceneNo * 7 + aiStillsUsed * 101'))
console.log('== (g) legenda: "5 AM" não vira "A M" ==')
{
  const cp2 = rd('lib/compose.ts')
  const a = cp2.indexOf('export function buildCaptionsFromWhisperWords('); const b = cp2.indexOf('\n}\n', a) + 3
  const fn = roda('const CAPTION_SYNC_OFFSET = 0.15\nconst FAST_EMPHASIS_RE = /never-matches-in-guardian/\nconst round3 = (n) => Math.round(n * 1000) / 1000\nconst pickHighlightWord = () => null\nexport interface WhisperWord { word: string; start: number; end: number; sentenceEnd?: boolean }\nfunction normalizeCaptionWord(w) { return (w ?? "").toLowerCase().replace(/^[^\\p{L}\\p{N}\']+|[^\\p{L}\\p{N}\']+$/gu, "").trim() }\n' + cp2.slice(a, b)).buildCaptionsFromWhisperWords
  const ws = [['He', 0, 0.2], ['wakes', 0.2, 0.5], ['at', 0.5, 0.6], ['5', 0.6, 0.9], ['A', 0.9, 1.0], ['M', 1.0, 1.2], ['daily', 1.3, 1.7]].map(([word, start, end]) => ({ word, start, end }))
  const caps = fn(ws, 10, 0, 4)
  const texto = caps.map((c) => c.text).join(' | ')
  checa(`"5 A M" vira "5 AM" na legenda (${texto})`, /\b5 AM\b/.test(texto) && !/\bA M\b/.test(texto))
  const pm = fn([['at', 0, 0.2], ['9', 0.2, 0.4], ['P.', 0.4, 0.5], ['M.', 0.5, 0.7], ['sharp', 0.8, 1.1]].map(([word, start, end]) => ({ word, start, end })), 10, 0, 4)
  checa('"P. M." vira "PM"', /\b9 PM\b/.test(pm.map((c) => c.text).join(' ')))
}
checa('o plano do cliente chega (source) e só aceita ai|stock', rt.includes("source: entry.source === 'ai' || entry.source === 'stock' ? entry.source : undefined"))
checa('rastro de medição fast_ai_still com denominador (cenas) e teto', rt.includes("name: 'fast_ai_still'") && rt.includes('metadata: { scenes: scenes.length, tried: aiStillLog.length, used: aiStillsUsed, max: aiStillsMax'))
checa('o custo em créditos do Kineo 1 não mudou (nenhum creditCost novo na rota)', !/creditCostFor\('fast'\)\s*\+/.test(rt))

console.log('== (e) montador ==')
const cp = rd('lib/compose.ts')
checa('URL de imagem vira elemento image com o mesmo Ken Burns (cover 100%, sem loop/trim/volume)', cp.includes("const isStillImage = /\\.(png|jpe?g|webp)(\\?|#|$)/i.test(url)") && cp.includes("type: isStillImage ? 'image' : 'video',") && cp.includes("...(isStillImage ? {} : { loop: true, trim_start: clipTrimStart })") && cp.includes("...(isStillImage ? {} : { volume: '0%' })") && cp.includes("type: 'video' | 'audio' | 'text' | 'shape' | 'image'"))

console.log('== (f) cliente ==')
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa("o plano enviado ao Kineo 1 carrega 'source' da cena", gc.includes('source: (s as { source?: string }).source,'))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
