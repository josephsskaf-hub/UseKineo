// [TRAVA 8.2] VEO-MODO-IA-2026-09-29 — guardião do Veo 3.1 em modo IA ("Let AI structure my text"): a imagem segue a fala.
// Palavra do fundador (29/09): "quero o Veo pronto pra amanhã, me entrega até amanhã". Até aqui, no modo IA, o escritor devolvia
// ⌈s/8⌉ + 1 cenas e a rota mandava '8s' FIXO para todas. Este guardião EXECUTA a lib real e fatias reais da rota (readFileSync +
// transpile + vm; sem rede, sem banco, sem fornecedor) e prova:
//   (a) lib/cinematic/veoShots (modo IA): escritor dimensionado para planos de ~6 s (35 s → 7 · 45 s → 9 · 60 s → 12 · 90 s → 12,
//       média 6/6/6/8); régua do escritor = min(voz, 2,3 × velocidade), nunca 3,1; 8 cenas com falas de 6/10/14/20 palavras →
//       4/6/8 s e a de 20 DIVIDIDA em 2 planos (10 + 10 → 6 + 6) na fronteira de frase; teto de planos respeitado (senão 8 s +
//       `transbordam`); cobertura de 60 s promovida do fim; nenhuma palavra some;
//   (b) fatias REAIS da rota: dimensionamento (Veo IA 7/9/12/12; Veo verbatim, Seedance, Kling e Sora idênticos à base em 32 casos),
//       opções do escritor (Veo IA: ~6 s e faixa no passo 2,3; os outros idênticos à base), bloco dos planos (clipSeconds em cada
//       plano, veoClipSeconds, clipCount, reindexação do supervisor; wantsVeo falso = nada muda), claim e ensaio;
//   (c) Seedance / Kling 2.5 / Sora / hollywood byte a byte: klingShots, compose, classicDryRun, runway, sceneWords, speechRate
//       intocados; buildFalInput e as fatias do Kling/Seedance/Veo-verbatim idênticas à base; TODA linha nova da rota mora nos
//       blocos do modo IA do Veo (diff contra a base);
//   (d) custo por filme de 60 s: antes 9 × 8 s = US$ 7,20; depois 12 planos de 6-8 s = US$ 7,20-9,60;
//   (e) mutantes: lib sem dividir → (a) vermelho; dimensionamento sem `wantsVeo` → Seedance muda → vermelho; bloco dos planos
//       sem `wantsVeo` → wantsVeo falso muda as cenas → vermelho.
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const roda = (src, globals = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, Array, Object, Set, Map, String, process: { env: {} }, ...globals })
  return exp
}
const fatia = (src, ini, fim) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, b + fim.length) }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const palavras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean)
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()

const MARCA = 'VEO-MODO-IA-2026-09-29'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
// BASE = o "antes" deste trabalho: o pai do commit mais antigo "VEO-MODO-IA" na história de HEAD; antes do commit existir,
// o próprio HEAD; senão origin/main. A base escolhida tem de NÃO conter o marcador.
let BASE = null
{
  const candidatos = []
  try { const shas = git(['log', '--format=%H', '--grep=VEO-MODO-IA', 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:${ROTA}`]).includes(MARCA)) { BASE = ref; break } } catch { /* tenta o próximo */ }
  }
}
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)
const rdBase = (p) => { if (!BASE) return null; try { return git(['show', `${BASE}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
checa('a base (o Veo em modo IA a 8 s fixos) está disponível para as comparações byte a byte', Boolean(BASE))

const rota = rd(ROTA)
const rotaBase = rdBase(ROTA)
const routeAst = (src) => ts.createSourceFile('route.ts', src, ts.ScriptTarget.Latest, true)
function acha(ast, pred) { let f; const v = (n) => { if (!f && pred(n)) f = n; if (!f) ts.forEachChild(n, v) }; v(ast); return f }
const funcaoDe = (src, nome) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isFunctionDeclaration(x) && x.name?.text === nome); return n ? n.getText(ast) : null }

// ═══ (a) a lib real ═══
console.log('== (a) lib/cinematic/veoShots — modo IA ==')
const load = createOfflineLoader({})
const V = load('@/lib/cinematic/veoShots')
const K = load('@/lib/cinematic/klingShots')
const libSrc = rd('lib/cinematic/veoShots.ts')
const rodaLib = (src) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, require: (n) => load(n === './klingShots' ? '@/lib/cinematic/klingShots' : n), console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, Array, Object, Set, Map, String, process: { env: {} } })
  return exp
}
const useful = (s) => K.kling25UsefulSeconds(s)
const fala = (n, virgulaEm = 0, pontoEm = 0) => { const a = []; for (let i = 1; i <= n; i++) a.push(`w${i}${i === virgulaEm ? ',' : ''}${i === pontoEm ? '.' : ''}`); a[n - 1] += '.'; return a.join(' ') }
// 8 cenas do escritor: 6 / 10 / 14 / 20 palavras, duas vezes (a de 20 tem vírgula na 9ª e fim de frase na 10ª)
const CENAS_8 = [fala(6), fala(10), fala(14), fala(20, 9, 10), fala(6), fala(10), fala(14), fala(20, 9, 10)]
const NEED_35 = V.veoFootageNeededAI(35)
const NEED_60 = V.veoFootageNeededAI(60)

checa('imagem necessária no modo IA = a régua do Kling (filme + 3 s): 35 s → 38 · 45 s → 48 · 60 s → 64,5 · 90 s → 93', NEED_35 === 38 && V.veoFootageNeededAI(45) === 48 && NEED_60 === 64.5 && V.veoFootageNeededAI(90) === 93)
checa('escritor dimensionado para planos de 6 s (5,84 úteis), entre 2 e 12: 35 s → 7 · 45 s → 9 · 60 s → 12 · 90 s → 12', V.veoShotCountAI(NEED_35) === 7 && V.veoShotCountAI(48) === 9 && V.veoShotCountAI(NEED_60) === 12 && V.veoShotCountAI(93) === 12 && V.veoShotCountAI(0) === 2)
checa('o escritor ouve a média REAL dos planos (uniformes, promovidos do fim até cobrir): 35 s → 6 · 45 s → 6 · 60 s → 6 · 90 s → 8', V.veoAverageShotSecondsAI(7, NEED_35) === 6 && V.veoAverageShotSecondsAI(9, 48) === 6 && V.veoAverageShotSecondsAI(12, NEED_60) === 6 && V.veoAverageShotSecondsAI(12, 93) === 8)
checa('régua do escritor = min(voz real, 2,3 × velocidade), nunca 3,1: 3,1 → 2,3 · 2,55 → 2,3 · 2,3 → 2,3 · 2,1 → 2,1 · 3,06 a 1,2 → 2,76 · sem voz → 2,3', V.veoWriterPaceAI(3.1, 1) === 2.3 && V.veoWriterPaceAI(2.55, 1) === 2.3 && V.veoWriterPaceAI(2.3) === 2.3 && V.veoWriterPaceAI(2.1, 1) === 2.1 && V.veoWriterPaceAI(3.06, 1.2) === 2.76 && V.veoWriterPaceAI(undefined, undefined) === 2.3)
checa('60 s a 2,3 pal/s = 138 palavras em 12 cenas = 12-13 por cena — cabem num plano de 6 s (fit 12) ou de 8 s (fit 17); a 3,1 seriam 186 (16 por cena, só 8 s)', (() => {
  const fit = V.veoFitWords(2.3)
  return eqJ(fit, [8, 12, 17]) && Math.ceil(138 / 12) === 12 && Math.ceil((138 * 1.1) / 12) === 13 && Math.ceil(186 / 12) > 12
})())

const plano35 = V.veoAiPlan(CENAS_8, { footageSeconds: NEED_35, wordsPerSecond: 2.55 })
checa('passo do plano = min(voz, 2,3) (2,55 → 2,3); palavras que cabem em 4/6/8 s = 8/12/17', plano35.pace === 2.3 && eqJ(plano35.fit, [8, 12, 17]))
checa('8 cenas (6/10/14/20 palavras): 6 → 4 s · 10 → 6 s · 14 → 8 s · 20 → DIVIDIDA em 2 planos de 10 palavras (6 s + 6 s); 10 planos', eqJ(plano35.seconds, [4, 6, 8, 6, 6, 4, 6, 8, 6, 6]) && plano35.shots.length === 10 && eqJ(plano35.divididas, [3, 7]) && eqJ(plano35.transbordam, []))
checa('a divisão corta no FIM DE FRASE (w10.), não na vírgula (w9,) nem no meio da palavra; as duas metades têm 10 palavras', plano35.shots[3].split && plano35.shots[4].split && plano35.shots[3].voiceover.endsWith('w10.') && palavras(plano35.shots[3].voiceover).length === 10 && palavras(plano35.shots[4].voiceover).length === 10 && plano35.shots[3].scene === 3 && plano35.shots[4].scene === 3)
checa('cada plano cabe a própria fala no passo, no útil e com folga: palavras ≤ fit(passo)', plano35.shots.every((s) => palavras(s.voiceover).length <= plano35.fit[V.VEO_SHOT_STEPS.indexOf(s.seconds)]))
checa('nenhuma palavra some nem muda de ordem: os planos unidos = as cenas unidas; cenas não divididas mantêm o texto original', plano35.shots.map((s) => s.voiceover).join(' ') === CENAS_8.join(' ') && plano35.shots[0].voiceover === CENAS_8[0])
checa('a soma útil dos planos cobre a imagem de 35 s (38 s)', plano35.seconds.reduce((a, s) => a + useful(s), 0) >= NEED_35)
const plano60 = V.veoAiPlan(CENAS_8, { footageSeconds: NEED_60, wordsPerSecond: 2.55 })
checa('60 s: cobertura que falta é promovida do FIM para trás (a cauda do TIKTOK-61), um degrau por vez; soma útil ≥ 64,5; os primeiros planos ficam no menor passo', plano60.seconds.reduce((a, s) => a + useful(s), 0) >= NEED_60 && eqJ(plano60.seconds.slice(0, 5), [4, 6, 8, 6, 6]) && plano60.seconds.every((s) => V.VEO_SHOT_STEPS.includes(s)) && plano60.seconds[9] === 8)
const planoTeto = V.veoAiPlan(CENAS_8, { footageSeconds: NEED_35, wordsPerSecond: 2.55, maxShots: 9 })
checa('teto de planos (9 para 8 cenas): só UMA cena de 20 palavras é dividida; a outra fica com 8 s e vai a `transbordam`', planoTeto.shots.length === 9 && eqJ(planoTeto.divididas, [3]) && eqJ(planoTeto.transbordam, [7]) && planoTeto.seconds[8] === 8)
checa('sem teto (default 18 = VEO_MAX_SHOTS) e 12 cenas de 13 palavras: nenhuma dividida, todas em 8 s (13 > fit 12 do plano de 6 s)', (() => { const p = V.veoAiPlan(new Array(12).fill(fala(13)), { footageSeconds: NEED_60, wordsPerSecond: 2.55 }); return p.shots.length === 12 && p.seconds.every((s) => s === 8) && V.VEO_MAX_SHOTS === 18 })())
checa('fala de 40 palavras sem corte que caiba em 2 × 17: não divide, 8 s e `transbordam` (a fala transborda, o compose corta na próxima)', (() => { const p = V.veoAiPlan([fala(40), fala(6)], { footageSeconds: 10, wordsPerSecond: 2.55 }); return p.shots.length === 2 && eqJ(p.transbordam, [0]) && p.seconds[0] === 8 })())
checa('cena vazia (0 palavras) recebe o menor passo (4 s) e não quebra', (() => { const p = V.veoAiPlan(['', 'w1 w2 w3.'], { footageSeconds: 5, wordsPerSecond: 2.55 }); return p.seconds.length === 2 && p.seconds[0] === 4 })())

// ═══ (b) fatias reais da rota ═══
console.log('== (b) rota: dimensionamento, escritor, planos, claim e ensaio ==')
checa('a rota importa as funções do modo IA da lib do Veo numa linha PRÓPRIA e marcada (o import de VEO-PLANOS fica intocado)', /\nimport \{ veoFootageNeededAI, veoShotCountAI, veoAverageShotSecondsAI, veoWriterPaceAI, veoAiPlan, VEO_MAX_SHOTS \} from '@\/lib\/cinematic\/veoShots' \/\/ \[TRAVA 8\.2\] VEO-MODO-IA-2026-09-29 — só wantsVeo && !verbatim/.test(rota) && rota.includes("import { veoVerbatimPlan, veoVisualHint, veoSceneSeconds, veoAssignedWords, veoClipsUsd, veoApplyShotAxis, veoStripShotAxis, veoFilmSeconds } from '@/lib/cinematic/veoShots' // [TRAVA 8.2] VEO-PLANOS-2026-09-29 — só wantsVeo\n"))
const veoLinha = (src) => { const m = src.match(/\n    if \(wantsVeo\) clipCount = Math\.max\(clipCount, Math\.min\(12, Math\.ceil\(duration \/ 8\) \+ 1\)\)\n/); return m ? m[0] : null }
const bloco442 = (src) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isIfStatement(x) && x.expression.getText(ast) === 'verbatim' && x.getText(ast).includes('SECONDS_PER_CLIP')); return n ? n.getText(ast) : null }
const blocoKlingDim = (src) => fatia(src, '    let kling25Footage = 0\n', '\n    }\n')
const blocoVeoDim = (src) => fatia(src, '    let veoFootage = 0\n', '\n    }\n')
const clipCountForDuration = roda(`${funcaoDe(rota, 'clipCountForDuration')}\nObject.assign(exports, { clipCountForDuration })`).clipCountForDuration
function dimensiona(src, { engine, duration, verbatim = false, narration = '', wps = 2.55 }) {
  const partes = [veoLinha(src), bloco442(src), blocoKlingDim(src), blocoVeoDim(src) ?? '    let veoFootage = 0']
  if (partes.some((p) => !p)) return null
  return roda(`export function run() { let clipCount = clipCountForDuration(duration)\n${partes.join('\n')}\n return { clipCount, kling25Footage, veoFootage } }`, {
    clipCountForDuration, duration, verbatim, parsedScript: { narration, segments: [] }, wantsKling: engine === 'kling', wantsVeo: engine === 'veo', wantsSora: engine === 'sora',
    narrationRate: { wordsPerSecond: wps }, kling25FootageNeeded: K.kling25FootageNeeded, kling25ShotCount: K.kling25ShotCount,
    veoFootageNeededAI: V.veoFootageNeededAI, veoShotCountAI: V.veoShotCountAI, veoAverageShotSecondsAI: V.veoAverageShotSecondsAI,
  }).run()
}
const ROTEIRO = 'In 1942, the sky above Los Angeles lit up with anti-aircraft fire. For over an hour, gunners fired more than fourteen hundred shells at something no one could identify. Searchlights converged on a single object drifting slowly over the coast. Witnesses described a glowing shape that never changed course, even under direct fire. Not a single bomb fell, and no wreckage was ever recovered. The next morning, newspapers printed photographs of the beams crossing in the dark. The Army said it was nerves; the Navy said there was nothing there at all. Five people died that night, from car accidents and heart attacks during the blackout. Decades later, declassified memos still disagree about what the gunners were shooting at. Some say a weather balloon; others say the fog itself was the enemy. Whatever it was, the city fired for an hour and hit nothing. The mystery of the Battle of Los Angeles has never been solved, and it probably never will be.'
checa('o bloco de dimensionamento do modo IA existe, sob wantsVeo && !verbatim, DEPOIS do bloco do Kling e ANTES das linhas do 3x6', (() => {
  const b = blocoVeoDim(rota)
  return b && b.includes('if (wantsVeo && !verbatim) {') && rota.indexOf('    let kling25Footage = 0') < rota.indexOf('    let veoFootage = 0') && rota.indexOf('    let veoFootage = 0') < rota.indexOf('    const seedanceShortFilm = ')
})())
checa('rota real: Veo em modo IA pede 7 cenas a 35 s, 9 a 45 s, 12 a 60 s e 12 a 90 s (antes: 6 / 7 / 9 / 12), com a imagem necessária 38 / 48 / 64,5 / 93', (() => {
  const r = [35, 45, 60, 90].map((d) => dimensiona(rota, { engine: 'veo', duration: d }))
  return eqJ(r.map((x) => x?.clipCount), [7, 9, 12, 12]) && eqJ(r.map((x) => x?.veoFootage), [38, 48, 64.5, 93])
})())
const contagensIguais = (src, srcBase, engines) => {
  const iguais = []
  for (const engine of engines) for (const duration of [35, 45, 60, 90]) for (const verbatim of [false, true]) {
    const caso = { engine, duration, verbatim, narration: verbatim ? ROTEIRO : '' }
    const a = dimensiona(src, caso), b = dimensiona(srcBase, caso)
    iguais.push(a && b && a.clipCount === b.clipCount && a.kling25Footage === b.kling25Footage)
  }
  return iguais.length === engines.length * 8 && iguais.every(Boolean)
}
if (rotaBase) {
  checa('Seedance, Kling 2.5 e Sora: contagem de cenas e imagem do Kling idênticas à base em 35/45/60/90 s, ideia e verbatim (24 casos)', contagensIguais(rota, rotaBase, ['seedance', 'kling', 'sora']))
  checa('Veo com roteiro pronto (verbatim): contagem idêntica à base em 35/45/60/90 s (o divisor de VEO-PLANOS segue mandando)', [35, 45, 60, 90].every((d) => { const c = { engine: 'veo', duration: d, verbatim: true, narration: ROTEIRO }; return dimensiona(rota, c)?.clipCount === dimensiona(rotaBase, c)?.clipCount }))
  checa('base (o "antes" medido pelo mesmo código): Veo em modo IA pedia 6 / 7 / 9 / 12 cenas de 8 s', eqJ([35, 45, 60, 90].map((d) => dimensiona(rotaBase, { engine: 'veo', duration: d })?.clipCount), [6, 7, 9, 12]))
}

// (b2) opções do escritor
const linhaOpcoes = (src) => src.match(/\n    const classicWriterOptions = \{ wordsPerScene: wordsPerSceneFor\(duration, clipCount, narrationRate\.wordsPerSecond\), language: narrationLanguage\.language \}[^\n]*\n/)?.[0] ?? null
const linhaKling = (src) => src.match(/\n    if \(wantsKling\) Object\.assign\(classicWriterOptions,[^\n]*\n/)?.[0] ?? null
const linhaSeedance = (src) => src.match(/\n    if \(seedanceShortFilm\) Object\.assign\(classicWriterOptions,[^\n]*\n/)?.[0] ?? null
const linhaVeo = (src) => src.match(/\n    if \(wantsVeo && !verbatim\) Object\.assign\(classicWriterOptions, \{ wordsPerScene: wordsPerSceneFor\(duration, clipCount, veoWriterPaceAI\(narrationRate\.wordsPerSecond, narrationRate\.speed\)\), sceneSeconds: veoAverageShotSecondsAI\(clipCount, veoFootage\) \}\)\n/)?.[0] ?? null
const wordsPerSceneForReal = load('@/lib/cinematic/sceneWords').wordsPerSceneFor
function opcoes(src, { engine, verbatim = false, duration = 60, clipCount, footage = 0, wps = 2.55, speed = 1, seedanceShortFilm = false }) {
  const partes = [linhaOpcoes(src), linhaKling(src), linhaSeedance(src), linhaVeo(src) ?? '\n']
  if (partes.slice(0, 3).some((p) => !p)) return null
  return roda(`export function run() {${partes.join('')} return classicWriterOptions }`, {
    duration, clipCount, verbatim, seedanceShortFilm, wantsKling: engine === 'kling', wantsVeo: engine === 'veo', narrationRate: { wordsPerSecond: wps, speed }, narrationLanguage: { language: 'en' },
    kling25Footage: footage, veoFootage: footage, wordsPerSceneFor: wordsPerSceneForReal, kling25AverageShotSeconds: K.kling25AverageShotSeconds, kling25WriterBudget: K.kling25WriterBudget,
    veoWriterPaceAI: V.veoWriterPaceAI, veoAverageShotSecondsAI: V.veoAverageShotSecondsAI,
  }).run()
}
checa('a linha do escritor do Veo em modo IA existe, depois da do Kling e da do 3x6, antes do escritor de cenas', linhaVeo(rota) !== null && rota.indexOf(linhaSeedance(rota)) < rota.indexOf(linhaVeo(rota)) && rota.indexOf(linhaVeo(rota)) < rota.indexOf('const generated = await generateScenes('))
checa('rota real: Veo IA a 60 s (12 cenas, voz 2,55) ouve "~6-second scene" e 12-13 palavras por cena (a 2,3); a 90 s (12 cenas) ouve ~8 s e 18-19 palavras', (() => {
  const o60 = opcoes(rota, { engine: 'veo', clipCount: 12, footage: 64.5 })
  const o90 = opcoes(rota, { engine: 'veo', clipCount: 12, footage: 93, duration: 90 })
  return o60?.sceneSeconds === 6 && eqJ([...o60.wordsPerScene], [12, 13]) && o90?.sceneSeconds === 8 && eqJ([...o90.wordsPerScene], [18, 19])
})())
checa('rota real: sem persona (3,1) o Veo IA escreve a 2,3 (12-13 por cena em 60 s), não a 3,1 (16-18)', (() => { const o = opcoes(rota, { engine: 'veo', clipCount: 12, footage: 64.5, wps: 3.1 }); return eqJ([...o.wordsPerScene], [12, 13]) && eqJ([...wordsPerSceneForReal(60, 12, 3.1)], [16, 18]) })())
if (rotaBase) {
  const casos = [{ engine: 'seedance', clipCount: 7 }, { engine: 'kling', clipCount: 12, footage: 64.5 }, { engine: 'sora', clipCount: 7 }, { engine: 'veo', clipCount: 9, verbatim: true }, { engine: 'seedance', clipCount: 3, duration: 15, seedanceShortFilm: true }]
  checa('opções do escritor idênticas à base para Seedance, Kling, Sora, Seedance 15 s e Veo verbatim', casos.every((c) => eqJ(opcoes(rota, c), opcoes(rotaBase, c))))
}

// (b3) o bloco dos planos do modo IA
const INI_PLANO = '    let veoAiRelato: '
const FIM_PLANO = "transbordam em 8 s: ${veoAiRelato.transbordam.join(',')}` : ''})`)\n    }\n"
const blocoPlano = (src) => fatia(src, INI_PLANO, FIM_PLANO)
const blocoVerbatimVeo = (src) => fatia(src, 'if (wantsVeo && verbatim && scenes.length > 0) {', '(antes: ${scenes.length} × 8 s)`)\n    }')
checa('o bloco dos planos do modo IA existe, logo DEPOIS do bloco do verbatim do Veo e ANTES do scrub de cenário / supervisor / prompts', (() => {
  const b = blocoPlano(rota)
  return b && b.includes('if (wantsVeo && !verbatim && scenes.length > 0) {') && rota.indexOf(blocoVerbatimVeo(rota)) < rota.indexOf(INI_PLANO) && rota.indexOf(INI_PLANO) < rota.indexOf('const classicScenePrompts = scenes.map(') && rota.indexOf('const alinhado = await alignShotsToSpeech(', rota.indexOf(INI_PLANO)) > 0 && rota.indexOf('const alinhado = await alignShotsToSpeech(', rota.indexOf(INI_PLANO)) < rota.indexOf('const classicScenePrompts = scenes.map(')
})())
function rodaPlano(src, { wantsVeo = true, verbatim = false, cenas = CENAS_8, footage = NEED_60, wps = 2.55, semDescricao = [3, 7], duration = 60 } = {}) {
  const b = blocoPlano(src)
  if (!b) return null
  const set = new Set(semDescricao)
  const g = {
    wantsVeo, verbatim, veoFootage: footage, narrationRate: { wordsPerSecond: wps }, duration, VEO_MAX_SHOTS: V.VEO_MAX_SHOTS, veoAiPlan: V.veoAiPlan, veoClipsUsd: V.veoClipsUsd,
    shortCaptionFromVoiceover: (t) => palavras(t).slice(0, 8).join(' '), cenasSemDescricaoDoModelo: set,
  }
  const out = roda(`export function run() { let scenes = ${JSON.stringify(cenas.map((v, i) => ({ description: `desc ${i}`, voiceover: v, caption: `cap ${i}`, aiPrompt: `ai ${i}` })))}; let clipCount = scenes.length; let veoPasso = 0; let veoClipSeconds = null\n${b}\n return { scenes, clipCount, veoPasso, veoClipSeconds, veoAiRelato } }`, g).run()
  return { ...out, set: [...set].sort((a, b) => a - b) }
}
const r = rodaPlano(rota)
checa('rota real (Veo IA, 60 s, 8 cenas de 6/10/14/20 palavras): 10 planos com clipSeconds 4|6|8, veoClipSeconds = os mesmos, passo 2,3, clipCount = 10', r && r.scenes.length === 10 && eqJ(r.scenes.map((s) => s.clipSeconds), r.veoClipSeconds) && r.veoClipSeconds.every((s) => [4, 6, 8].includes(s)) && r.veoPasso === 2.3 && r.clipCount === 10)
checa('as duas metades da cena dividida herdam descrição/aiPrompt da cena de origem, cada uma com a própria fala e legenda; a narração unida não muda', r && r.scenes[3].description === 'desc 3' && r.scenes[4].description === 'desc 3' && r.scenes[4].aiPrompt === 'ai 3' && palavras(r.scenes[3].voiceover).length === 10 && palavras(r.scenes[4].voiceover).length === 10 && r.scenes[4].caption !== 'cap 3' && r.scenes.map((s) => s.voiceover).join(' ') === CENAS_8.join(' '))
checa('o conjunto das cenas sem descrição do modelo é reindexado para os planos ({3,7} → {3,4,8,9}); o relato traz divididas 1-based [4, 8] e o custo de antes (9 × 8 s = US$ 7,20)', r && eqJ(r.set, [3, 4, 8, 9]) && eqJ(r.veoAiRelato.divididas, [4, 8]) && eqJ(r.veoAiRelato.transbordam, []) && r.veoAiRelato.cenas === 8 && r.veoAiRelato.planos === 10 && r.veoAiRelato.clips_usd_before_ai === 7.2)
const rNao = rodaPlano(rota, { wantsVeo: false })
const rVerb = rodaPlano(rota, { verbatim: true })
checa('wantsVeo falso (Seedance/Kling/Sora) ou verbatim: o bloco não roda — cenas intactas, sem clipSeconds, veoClipSeconds null, relato null', [rNao, rVerb].every((x) => x && x.scenes.length === 8 && x.scenes.every((s) => s.clipSeconds === undefined) && x.veoClipSeconds === null && x.veoAiRelato === null && x.clipCount === 8 && eqJ(x.set, [3, 7])))
checa('a rota só chama veoSceneSeconds no verbatim (uma vez) — o modo IA passa por veoAiPlan (uma vez, no bloco novo)', (rota.match(/veoSceneSeconds\(/g) || []).length === 1 && (rota.match(/veoAiPlan\(/g) || []).length === 1 && blocoPlano(rota).includes('veoAiPlan('))
checa('claim assinado: clip_seconds + clip_word_starts para toda cena com clipSeconds (a mesma linha do Kling/Veo-verbatim, intocada) — o plano do modo IA entra por ela', rota.includes("...(scenes.some((s) => typeof s.clipSeconds === 'number') ? { clip_seconds: scenes.map((s) => s.clipSeconds ?? null), clip_word_starts: kling25SceneWordStarts(voiceoverScript, scenes.map((s) => s.voiceover)) } : {})") && rota.includes("const voiceoverScript = verbatim && parsedScript.narration\n      ? parsedScript.narration\n      : scenes.map((s) => s.voiceover).filter(Boolean).join(' ')"))
checa('ensaio de $0: o relatório do Veo (relatorioVeo, sceneSeconds: veoClipSeconds) cobre o modo IA (sceneFitStrict: verbatim = só avisa) e a resposta traz veo_ai_plan', rota.includes('sceneSeconds: veoClipSeconds, clipLossSeconds: KLING25_CLIP_LOSS_SECONDS, sceneFitWordsPerSecond: veoPasso, sceneFitStrict: verbatim') && rota.includes('...(veoAiRelato ? { veo_ai_plan: veoAiRelato } : {}),') && rota.indexOf('...(relatorioVeo ?? {}),') < rota.indexOf('...(veoAiRelato ? { veo_ai_plan: veoAiRelato } : {}),'))
checa('o plano do modo IA viaja pelo builder da fal do Veo (scene.clipSeconds → duration 4s|6s|8s), o mesmo do verbatim', rota.includes("const input = buildFalInput(m, promptForAttempt, hd, false, scene.clipSeconds,") && rota.includes("duration: typeof seconds === 'number' && seconds > 0 && seconds <= 4 ? '4s' : typeof seconds === 'number' && seconds > 0 && seconds <= 6 ? '6s' : '8s',"))

// ═══ (c) byte a byte ═══
console.log('== (c) Seedance / Kling 2.5 / Sora / hollywood byte a byte ==')
for (const p of ['lib/cinematic/klingShots.ts', 'lib/compose.ts', 'lib/cinematic/classicDryRun.ts', 'lib/runway.ts', 'lib/cinematic/sceneWords.ts', 'lib/speechRate.ts', 'lib/narrationFit.ts', 'app/api/compose/route.ts', 'lib/cinematic/speechImageAlign.ts', 'lib/cinematic/sceneDescriptions.ts']) {
  checa(`${p} byte a byte igual à base`, rdBase(p) !== null && rdBase(p) === rd(p))
}
const fatiasIntocadas = [
  ['let kling25Footage = 0', 'clipCount = planos\n    }'],
  ['if (wantsKling && verbatim && parsedScript.segments.length === 0', 'clipCount = scenes.length\n      }\n    }'],
  ['let kling25ClipSeconds: number[] | null = null', 'necessário ${kling25Footage}s)`)\n    }'],
  ['if (wantsVeo && verbatim && parsedScript.segments.length === 0 && scenes.length > 0) {', 'clipCount = scenes.length\n      }\n    }'],
  ['if (wantsVeo && verbatim && scenes.length > 0) {', '(antes: ${scenes.length} × 8 s)`)\n    }'],
  ['let seedanceClipSeconds: number[] | null = null', 'palavras)`)\n    }'],
  ['if (verbatim) {\n      const SECONDS_PER_CLIP', 'clipCount = sized\n      }\n    }'],
  ['    const seedanceShortFilm = duration === SEEDANCE_SHORT_SECONDS', '    if (seedanceShortFilm) clipCount = SEEDANCE_SHORT_CLIPS\n'],
  ['    const cenasSemDescricaoDoModelo = new Set<number>()', "prompt visual nasceu do sujeito, nunca da fala: ${completas.fallbacks.map((f) => `cena ${f.index + 1} (${f.source})`).join(', ')}`)\n    }\n"],
  ['    let alinhamentoFalaImagem: AlignReport | null = null', 'const classicScenePrompts = scenes.map('],
  ['    if (hollywoodPath) {', '    // ── end KINEO-HOLLYWOOD-2026-07-09'],
  ['    if (anchorActive) {\n', '(user credits unchanged; kling=${KLING_CREDIT_COST}cr)`,\n      )\n    }\n'],
]
for (const [ini, fim] of fatiasIntocadas) {
  const a = fatia(rota, ini, fim), b = rotaBase ? fatia(rotaBase, ini, fim) : null
  checa(`fatia da rota "${ini.slice(0, 44).replace(/\n/g, ' ').trim()}…" idêntica à base`, a !== null && a === b)
}
checa('buildFalInput (Seedance, Kling, Sora, Veo t2v/i2v, hollywood) byte a byte igual à base', rotaBase !== null && funcaoDe(rota, 'buildFalInput') === funcaoDe(rotaBase, 'buildFalInput'))
if (rotaBase) {
  // TODA linha que mudou na rota mora nos blocos do modo IA do Veo: import, dimensionamento, escritor, planos, ensaio.
  const diff = git(['diff', '--no-color', '-U0', BASE, 'HEAD', '--', ROTA]).replace(/\r/g, '')
  const worktreeDiff = git(['diff', '--no-color', '-U0', BASE, '--', ROTA]).replace(/\r/g, '')
  const d = worktreeDiff.length ? worktreeDiff : diff
  const adicionadas = d.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1))
  const removidas = d.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1))
  const permitidas = [blocoVeoDim(rota), linhaVeo(rota), blocoPlano(rota), fatia(rota, '        // [TRAVA 8.2] VEO-MODO-IA-2026-09-29 — modo IA: cenas do escritor', '...(veoAiRelato ? { veo_ai_plan: veoAiRelato } : {}),\n'), fatia(rota, '    // ═══ [TRAVA 8.2] VEO-MODO-IA-2026-09-29 — o escritor do Veo 3.1', '    let veoFootage = 0\n'), fatia(rota, '    // [TRAVA 8.2] VEO-MODO-IA-2026-09-29 — no Veo em modo IA o escritor ouve', '    if (wantsVeo && !verbatim) Object.assign('), fatia(rota, '    // ═══ [TRAVA 8.2] VEO-MODO-IA-2026-09-29 — os segundos de CADA plano', '    let veoAiRelato: '), rota.split('\n').find((l) => l.startsWith('import {') && l.includes("from '@/lib/cinematic/veoShots'") && l.includes(MARCA))].filter(Boolean).join('\n')
  const foraDoLugar = adicionadas.filter((l) => l.trim() && !permitidas.includes(l))
  checa(`diff da rota contra a base: ${adicionadas.length} linhas novas, todas dentro dos blocos do modo IA do Veo (${foraDoLugar.length} fora: ${foraDoLugar.slice(0, 2).map((l) => l.trim().slice(0, 60)).join(' | ')})`, adicionadas.length > 0 && foraDoLugar.length === 0)
  checa(`diff da rota contra a base: NENHUMA linha da base alterada ou apagada — a rota só ganhou linhas (${removidas.length} removida(s))`, removidas.length === 0)
}

// ═══ (d) custo por filme ═══
console.log('== (d) custo por filme de 60 s ==')
{
  const antes = V.veoClipsUsd(new Array(9).fill(8))
  const piso = V.veoAiPlan(new Array(12).fill(fala(12)), { footageSeconds: NEED_60, wordsPerSecond: 2.55 })
  const teto = V.veoAiPlan(new Array(12).fill(fala(13)), { footageSeconds: NEED_60, wordsPerSecond: 2.55 })
  const custoPiso = V.veoClipsUsd(piso.seconds), custoTeto = V.veoClipsUsd(teto.seconds)
  console.log(`   60 s antes: 9 × 8 s = US$ ${antes.toFixed(2)} · depois: 12 cenas de 12 palavras → [${piso.seconds.join(',')}] = US$ ${custoPiso.toFixed(2)} · 12 cenas de 13 palavras → [${teto.seconds.join(',')}] = US$ ${custoTeto.toFixed(2)}`)
  checa('custo do clipe a 60 s: antes US$ 7,20 (9 × 8 s); depois entre US$ 7,20 (12 × 6 s) e US$ 9,60 (12 × 8 s) — 12 planos em vez de 9, cada um do tamanho da própria fala', antes === 7.2 && custoPiso === 7.2 && custoTeto === 9.6 && piso.seconds.every((s) => s === 6) && teto.seconds.every((s) => s === 8))
}

// ═══ (e) mutantes ═══
console.log('== (e) mutantes ==')
{
  const m = libSrc.replace('.filter((i) => falas[i].length > fitLong)', '.filter(() => false)')
  if (m === libSrc) throw new Error('mutante da lib não aplicou')
  const M = rodaLib(m)
  const p = M.veoAiPlan(CENAS_8, { footageSeconds: NEED_35, wordsPerSecond: 2.55 })
  checa('mutante da lib (nunca divide): a cena de 20 palavras ficaria em 8 s com a fala transbordando → (a) vermelho', p.shots.length === 8 && !eqJ(p.seconds, [4, 6, 8, 6, 6, 4, 6, 8, 6, 6]) && p.divididas.length === 0)
}
if (rotaBase) {
  const m = rota.replace('    if (wantsVeo && !verbatim) {\n      veoFootage = veoFootageNeededAI(duration)', '    if (!verbatim) {\n      veoFootage = veoFootageNeededAI(duration)')
  if (m === rota) throw new Error('mutante do dimensionamento não aplicou')
  checa('mutante do dimensionamento (sem wantsVeo): Seedance/Kling/Sora deixariam de ser idênticos à base → vermelho', !contagensIguais(m, rotaBase, ['seedance', 'kling', 'sora']))
}
{
  const m = rota.replace('    if (wantsVeo && !verbatim && scenes.length > 0) {\n      const palavrasDoFilme', '    if (!verbatim && scenes.length > 0) {\n      const palavrasDoFilme')
  if (m === rota) throw new Error('mutante do bloco dos planos não aplicou')
  const x = rodaPlano(m, { wantsVeo: false })
  checa('mutante do bloco dos planos (sem wantsVeo): com wantsVeo falso as cenas ganhariam clipSeconds → vermelho', x && (x.scenes.length !== 8 || x.veoClipSeconds !== null))
}

console.log(`\n${ok} verificações OK · ${falhas.length} falha(s)`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
