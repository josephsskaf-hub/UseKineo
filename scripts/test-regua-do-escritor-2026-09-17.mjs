// KINEO-REGUA-DO-ESCRITOR-2026-09-17 — guardião do "vai pro item 1" do fundador (17/09): a parede "narração
// curta" do Kineo 1 (90 recusas/7 d, 38 pessoas, 10 nunca fizeram filme) nascia no ESCRITOR, que dimensionava
// todo roteiro a 2,3 pal/s (régua hollywood) e 60 s, enquanto o portão do Kineo 1 mede na voz da persona (~2,8).
// Prova: (a) a régua do escritor é a MESMA função do portão (lib/speechRate) e, com motor conhecido, o piso é
// a duração inteira (folga de 5% sobre os 0,95 do portão); (b) o roteiro de 60 s para o Kineo 1 nasce com
// palavras suficientes para PASSAR no portão na régua da persona; (c) sem `engine` nada muda (2,3 × 0,95);
// (d) o cliente manda duração e motor; (e) a rota usa a régua no prompt, no alvo e no rastro `script_written`
// com await; (f) o portão C1 do roteiro PRÓPRIO continua onde estava (não reescrevemos o autor em silêncio).
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
function transpile(file) { return ts.transpileModule(rd(file), { compilerOptions: { module: 1, target: 9 } }).outputText }
function loadWith(file, requireMap, env = {}) {
  const exports = {}
  vm.runInNewContext(transpile(file), { exports, require: (m) => requireMap[m] ?? {}, process: { env }, console, Math, Date, Number, Set, Map, Array, JSON, Promise }, { filename: file })
  return exports
}

console.log('== (a) a régua do escritor é a régua do portão ==')
const narrationFit = loadWith('lib/narrationFit.ts', {})
const speechRate = loadWith('lib/speechRate.ts', { '@/lib/narrationFit': narrationFit, './narrationFit': narrationFit })
// Persona do Kineo 1 como a rota fast a resolve (fable ×1,1 = a que aparece no log "→ 2.81 pal/s").
const personaFable = { selectPersonaForScript: () => ({ id: 'energetic-facts', voice: 'fable', defaultSpeed: 1.1 }) }
const W = loadWith('lib/scriptWriterRate.ts', { '@/lib/narrationFit': narrationFit, '@/lib/speechRate': speechRate, '@/lib/narration/niche-mapping': personaFable })
const portaoFast = speechRate.speechRateFor({ family: 'classic', language: 'en', voice: 'fable', personaSpeed: 1.1 })
const reguaFast = W.writerRateFor('fast', '5 shocking facts about money', 'en')
checa('Kineo 1: mesma régua do portão (persona fable ×1,1 ≈ 2,8 pal/s) e piso = duração inteira', reguaFast.family === 'classic' && reguaFast.wordsPerSecond === portaoFast.wordsPerSecond && reguaFast.wordsPerSecond >= 2.8 && reguaFast.coverage === 1 && reguaFast.voice === 'fable')
checa('clássico sem persona (Seedance) = 3,1 pal/s; hollywood (Kling 3/H3/Omni/S25) = 2,3', W.writerRateFor('cinematic_ai', 't', 'en').wordsPerSecond === 3.1 && W.writerRateFor('cinematic_hollywood', 't', 'en').wordsPerSecond === 2.3 && W.writerRateFor('cinematic_h3', 't', 'en').family === 'hollywood')
checa('sem engine: régua histórica (2,3 × 0,95), chamadores antigos intocados', W.writerRateFor(undefined, 't', 'en').family === 'legacy' && W.writerRateFor('', 't', 'en').wordsPerSecond === 2.3 && W.writerRateFor(undefined, 't', 'en').coverage === narrationFit.MIN_COVERAGE && W.minWordsFor(60) === Math.ceil(60 * 0.95 * 2.3))

console.log('== (b) o roteiro de 60 s nasce passando no portão ==')
const min60 = W.minWordsFor(60, reguaFast.wordsPerSecond, reguaFast.coverage)
const fala60 = min60 / portaoFast.wordsPerSecond
checa(`60 s: piso ${min60} palavras → ${fala60.toFixed(1)} s na régua do portão ≥ 57 s (0,95 × 60)`, fala60 >= 60 * narrationFit.MIN_COVERAGE)
checa('35 s e 90 s: idem (o pedido de 90 s deixou de nascer como roteiro de 60)', W.minWordsFor(35, reguaFast.wordsPerSecond, 1) / portaoFast.wordsPerSecond >= 35 * 0.95 && W.minWordsFor(90, reguaFast.wordsPerSecond, 1) / portaoFast.wordsPerSecond >= 90 * 0.95)
checa('o piso ANTIGO (2,3 × 0,95) NÃO passava no portão do Kineo 1 — é a causa, provada em número', W.minWordsFor(60) / portaoFast.wordsPerSecond < 60 * narrationFit.MIN_COVERAGE)
checa('teto = 1,2 × piso (folga sem convidar outro tamanho)', W.maxWordsFor(60, 2.8, 1) === Math.round(W.minWordsFor(60, 2.8, 1) * 1.2))

console.log('== (d) o cliente manda duração e motor ==')
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('chamada principal do estruturador leva targetSeconds e engine (fast | quality)', gc.includes("body: JSON.stringify({ topic: rawSource, language, targetSeconds: duration, engine: mode === 'fast' || mode === 'creator' ? 'fast' : quality }),"))

console.log('== (e) a rota usa a régua ==')
const rt = rd('app/api/generate-script/route.ts')
checa('rota importa a régua da lib (route.ts não exporta função solta — quebraria o build)', rt.includes("import { minWordsFor, maxWordsFor, writerRateFor } from '@/lib/scriptWriterRate'") && !/^export function (minWordsFor|maxWordsFor|writerRateFor)/m.test(rt))
checa('alvo de palavras nasce da régua do motor pedido', rt.includes('const regua = writerRateFor(body.engine, topic, language)') && rt.includes('const alvoPalavras = minWordsFor(alvoSegundos, regua.wordsPerSecond, regua.coverage)'))
checa('o prompt fala na régua certa (palavras/s e piso) e não mais em 2,3 fixo', rt.includes('const SYSTEM_PROMPT = buildSystemPrompt(language, alvoSegundos, regua.wordsPerSecond, regua.coverage)') && rt.includes('at the measured narration rate of ${wordsPerSecond} words per second') && !rt.includes('at the measured narration rate of ${WORDS_PER_SECOND}'))
checa('rastro script_written com AWAIT (void antes do return morre na Vercel), com régua, alvo e fits', rt.includes("await writeServerEvent({ // await: `void` antes do return morre na Vercel (memória da casa)\n      name: 'script_written',") && rt.includes('fits: scriptWordCount(script) >= alvoPalavras'))
checa('resposta devolve wordsPerSecond/family/minWords/words (medição no cliente e no dry-run)', rt.includes("return NextResponse.json({ script, alreadyStructured: false, wordsPerSecond: regua.wordsPerSecond, family: regua.family, targetSeconds: alvoSegundos, minWords: alvoPalavras, words: scriptWordCount(script) })"))

console.log('== (f) o portão do roteiro PRÓPRIO segue (C1: não reescrever o autor em silêncio) ==')
const fast = rd('app/api/generate-video-fast/route.ts')
checa('portão narration_too_short continua na rota fast, 422 antes do gasto, sem expansão automática', fast.includes("reason: 'narration_too_short',") && fast.includes('retryable: false,\n        }, { status: 422 })') && !fast.includes('/api/expand-script'))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
