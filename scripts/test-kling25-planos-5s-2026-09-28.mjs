// KINEO-KLING25-PLANOS-5S-2026-09-28 — guardião dos planos de 5 s do Kling 2.5.
// Fundador, 28/09, depois do canário c83074b6 ("The Mystery of Moving Rocks", 98 palavras verbatim, 35 s pedidos, 37,7 s
// entregues, 4 planos de 10 s): "gostei muito… a única coisa é mais variedade de cenas". O claim do canário também mostrou
// as cenas gravadas perdendo a palavra da fronteira ("…Behind | long trails…" sem "them"; "…Then | fitted rocks…" sem
// "scientists") e cortando no meio da frase.
// Este guardião EXECUTA fatias reais (readFileSync + transpile + vm, sem rede, sem banco, sem fornecedor) e prova:
//   (a) preço e fonte: US$ 0,07/s do Kling 2.5 em docs/PRECOS-MOTORES-V4.md = a constante da lib;
//   (b) lib/cinematic/klingShots: imagem ÚTIL (−0,16 s por plano), passo de planejamento ≤ 2,3 pal/s, 35/60/90 s no
//       modo IA, teto de 12 no modo IA (roteiro pronto: 12-18 desde [TRAVA 8.2] KLING25-60S-TETO — guardião próprio,
//       scripts/test-kling25-60s-teto-2026-09-28.mjs), o alinhamento do claim assinado (segundos e início da fala de cada
//       cena) para o compose;
//   (c) a rota: o dimensionamento real (Kling novo; Seedance/Veo idênticos à base), o builder real da fal ('5'/'10' no
//       t2v e no i2v; Seedance/Veo/Sora/hollywood byte a byte), o callback real do despacho, o plano do verbatim (cortes
//       e segundos juntos), os segundos por cena e o objeto de resposta assinado (clip_seconds e clip_word_starts só no
//       Kling);
//   (d) o compose real (lib/compose buildCreatomateSource via loader offline): com clip_seconds nenhum trecho passa do
//       comprimento do clipe; com clip_word_starts cada plano entra quando a SUA fala começa; sem os campos, a saída é
//       JSON-idêntica à da base;
//   (e) o canário: a base reproduz as 4 cenas do claim de produção (as palavras perdidas); o novo divide em planos que
//       somam o roteiro palavra por palavra e cabem, cada um, a própria fala;
//   (f) ensaio de $0 (imagem útil e fala × plano), supervisor fala×imagem e escritor de cenas com o dobro de cenas;
//   (g) mutantes: cada verificação central fica vermelha quando a peça que ela protege é desfeita;
//   (h) REVISÃO ADVERSARIAL (28/09): os três defeitos que a revisão reproduziu na 1ª versão (2a28b39d), medidos na FORMA
//       dos 30 filmes verbatim reais de 13 a 28/09 (só contagens de palavras entre pontuações e a duração exata do MP4 —
//       nenhuma palavra de cliente entra aqui): (1) imagem correndo na frente da narração (06fe798a: 5 de 12 planos com
//       menos de 25 % da própria fala, desvio de 7,9 s); (2) plano repetido onde a base não repetia (579f4b2b); (3) custo
//       a mais escondido. Cada verificação da seção (h) fica vermelha na 1ª versão (provado na sessão contra 2a28b39d e,
//       aqui dentro, pelos mutantes que devolvem o comportamento antigo).
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ) // o loader offline resolve '@/...' a partir do cwd
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const roda = (src, globals = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, Array, Object, Set, Map, process: { env: {} }, ...globals })
  return exp
}
const fatia = (src, ini, fim, incluiFim = true) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, incluiFim ? b + fim.length : b) }
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)))
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const palavras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean)

// BASE = o pai deste trabalho (a ponta travada de 28/09); sem ele, origin/main. Os dois têm o Kling a 10 s.
// Resolução robusta a rebase/merge (memória "trava por diff fica verde ao mergear"): (1) o pai do commit mais antigo
// "KLING25-PLANOS-5S:" na história de HEAD — o "antes" verdadeiro, onde quer que a fila o tenha rebaseado; (2) antes do
// commit existir, o próprio HEAD; (3) origin/main. A base escolhida tem de NÃO conter o marcador (senão não é "antes").
let BASE = null
{
  const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
  const candidatos = []
  try { const shas = git(['log', '--format=%H', '--grep=KLING25-PLANOS-5S:', 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:app/api/generate-video-cinematic/route.ts`]).includes('KINEO-KLING25-PLANOS-5S')) { BASE = ref; break } } catch { /* tenta o próximo */ }
  }
}
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)
const rdBase = (p) => { if (!BASE) return null; try { return execFileSync('git', ['show', `${BASE}:${p}`], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n') } catch { return null } }
checa('a base (pai do commit, com o Kling a 10 s) está disponível para as comparações byte a byte', Boolean(BASE))

const ROTA = 'app/api/generate-video-cinematic/route.ts'
const rota = rd(ROTA)
const rotaBase = rdBase(ROTA)
const routeAst = (src) => ts.createSourceFile('route.ts', src, ts.ScriptTarget.Latest, true)
function acha(ast, pred) { let f; const v = (n) => { if (!f && pred(n)) f = n; if (!f) ts.forEachChild(n, v) }; v(ast); return f }
const funcaoDe = (src, nome) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isFunctionDeclaration(x) && x.name?.text === nome); return n ? n.getText(ast) : null }
const varDe = (src, nome) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isVariableDeclaration(x) && x.name.getText(ast) === nome); return n ? `const ${nome} = ${n.initializer.getText(ast)};` : null }

// ═══ (a) preço e fonte ═══
console.log('== (a) preço do fornecedor e fonte ==')
const precos = rd('docs/PRECOS-MOTORES-V4.md')
const libSrc = rd('lib/cinematic/klingShots.ts')
const K = roda(libSrc)
checa('docs/PRECOS-MOTORES-V4.md diz US$ 0,07/s para o Kling 2.5 Turbo (a fal cobra por segundo)', /\|\s*Kling 2\.5 Turbo\s*\|\s*atual\s*\|\s*\$0\.07\/s\s*\|/.test(precos))
checa('a lib usa o mesmo preço (0,07/s) e só os valores do schema (5 e 10)', K.KLING25_USD_PER_SECOND === 0.07 && K.KLING25_SHOT_SECONDS === 5 && K.KLING25_LONG_SHOT_SECONDS === 10)
checa('dois planos de 5 s custam o mesmo que um de 10 s (US$ 0,70)', K.kling25ClipsUsd([5, 5]) === 0.7 && K.kling25ClipsUsd([10]) === 0.7)
checa('lib pura: nenhum import (a rota, o compose e este guardião leem a mesma régua)', !/^\s*import\s/m.test(libSrc))
{
  // a perda por plano é a do compose (CLIP_TRIM_START + CLIP_GAP_OVERLAP), não um número inventado
  const comp = rd('lib/compose.ts')
  const trim = Number(comp.match(/\n  const CLIP_TRIM_START = ([\d.]+)\n/)?.[1])
  const ov = Number(comp.match(/\n  const CLIP_GAP_OVERLAP = ([\d.]+)\n/)?.[1])
  checa('perda por plano = CLIP_TRIM_START + CLIP_GAP_OVERLAP do compose (0,1 + 0,06 = 0,16 s): a lib mede a imagem ÚTIL', Math.abs(trim + ov - K.KLING25_CLIP_LOSS_SECONDS) < 1e-9 && K.kling25UsefulSeconds(5) === 4.84)
}

// ═══ (b) a régua da lib ═══
console.log('== (b) lib/cinematic/klingShots ==')
const clipCountForDuration = roda(`export ${funcaoDe(rota, 'clipCountForDuration')}`).clipCountForDuration
const planoIA = (L, d) => { const need = L.kling25FootageNeeded({ durationSeconds: d }); const n = L.kling25ShotCount(need); const sec = L.kling25SceneSeconds(Array.from({ length: n }, (_, i) => 'palavra '.repeat(14 + (i % 3)).trim()), need); return { need, n, sec, soma: sec.reduce((a, b) => a + b, 0), usd: L.kling25ClipsUsd(sec) } }
const tabela = {}
for (const d of [35, 45, 60, 90]) tabela[d] = planoIA(K, d)
checa('modo IA 35 s: 8 planos de 5 s = 40 s de imagem, US$ 2,80 — o mesmo custo de clipe de antes (4 × 10 s)', tabela[35].n === 8 && tabela[35].sec.every((s) => s === 5) && tabela[35].soma === 40 && tabela[35].usd === 2.8 && clipCountForDuration(35) * 10 === 40)
checa('modo IA 45 s: 10 planos de 5 s = 50 s (antes 5 × 10 s = 50 s)', tabela[45].n === 10 && tabela[45].soma === 50 && clipCountForDuration(45) * 10 === 50)
checa('modo IA 60 s: teto de 12 planos, 2 deles de 10 s = 70 s, US$ 4,90 (antes 7 × 10 s = 70 s)', tabela[60].n === 12 && tabela[60].sec.filter((s) => s === 10).length === 2 && tabela[60].soma === 70 && tabela[60].usd === 4.9 && clipCountForDuration(60) * 10 === 70)
checa('modo IA 90 s: teto de 12 planos, 7 deles de 10 s = 95 s, US$ 6,65 (antes 9 × 10 s = 90 s: +US$ 0,35 e o filme de 90 s deixa de reciclar)', tabela[90].n === 12 && tabela[90].sec.filter((s) => s === 10).length === 7 && tabela[90].soma === 95 && tabela[90].usd === 6.65 && clipCountForDuration(90) * 10 === 90)
// KINEO-KLING25-PLANOS-5S-2026-09-28 (revisão adversarial) — re-ancorado: a imagem passou a ser medida em segundos ÚTEIS
// (o compose tira 0,16 s de cada plano) e o verbatim no passo de planejamento de 2,3 pal/s (a régua de 2,5 deixava metade
// dos filmes reais sem imagem). Os números de plano e de custo acima não mudaram.
checa('imagem ÚTIL necessária: modo IA = filme + 3 s (35 → 38; 60 → 61,5 + 3 = 64,5; 90 → 93); verbatim = o roteiro a ≤ 2,3 pal/s, cortado em 90 s como o compose corta (1.000 palavras em 60 s → 90)', K.kling25FootageNeeded({ durationSeconds: 35 }) === 38 && K.kling25FootageNeeded({ durationSeconds: 60 }) === 64.5 && K.kling25FootageNeeded({ durationSeconds: 90 }) === 93 && K.kling25FootageNeeded({ durationSeconds: 60, verbatimWords: 1000 }) === 90)
checa('verbatim: passo de planejamento = min(voz, 2,3) — 98 palavras = 42,6 s (9 planos provisórios) com voz de 3,1 ou 2,55; voz a 2,1 → 46,7 s', K.kling25FootageNeeded({ durationSeconds: 35, verbatimWords: 98, wordsPerSecond: 3.1 }) === 42.6 && K.kling25FootageNeeded({ durationSeconds: 35, verbatimWords: 98, wordsPerSecond: 2.55 }) === 42.6 && K.kling25ShotCount(42.6) === 9 && K.kling25FootageNeeded({ durationSeconds: 35, verbatimWords: 98, wordsPerSecond: 2.1 }) === 46.7)
checa('teto: nunca mais de 12 planos nem menos de 2', K.kling25ShotCount(500) === 12 && K.kling25ShotCount(0) === 2 && K.kling25ShotCount(7) === 2)
// re-ancorado (revisão adversarial): com a imagem útil, 5 cenas de 5 s dão 24,2 s — para 2 planos longos a necessidade é 30
// (35 exigiria 3). O que se protege é o MESMO: os planos de 10 s vão para as cenas com mais fala.
const maisFala = (L) => { const vo = ['a b c', 'a b c d e f g h i j k l m n o p q r s t', 'a b', 'a b c d e f g h i j k l', 'a']; const s = L.kling25SceneSeconds(vo, 30); return s[1] === 10 && s[3] === 10 && s.filter((x) => x === 10).length === 2 && s.every((x) => x === 5 || x === 10) }
checa('modo IA: se a imagem não cobre, os planos de 10 s vão para as cenas com MAIS fala (5 cenas, 30 s úteis → as 2 mais faladas)', maisFala(K))
{
  const s = K.kling25SceneSeconds(new Array(12).fill('x y z'), 64.5)
  const longos = s.map((v, i) => (v === 10 ? i : -1)).filter((i) => i >= 0)
  checa('empate de fala: os planos longos se espalham pelo filme (não ficam colados)', longos.length === 2 && Math.abs(longos[0] - longos[1]) >= 3)
}
checa('menos cenas que o pedido (escritor devolveu 3 para 40 s) → as 3 viram 10 s e ainda assim só 5|10', eqJ(K.kling25SceneSeconds(['a', 'b', 'c'], 40), [10, 10, 10]))
{
  // verbatim marcado (fitFirst): a cena cuja fala não cabe em 4,84 s nasce com 10 s; a cobertura que faltar promove do fim
  const fit = K.kling25WordsFit(5, 2.3)
  const s1 = K.kling25SceneSeconds(['a', 'b', 'c'], 10, { wordCounts: [8, 15, 11], fitFirst: true, fitWords: fit })
  const s2 = K.kling25SceneSeconds(['a', 'b', 'c'], 20, { wordCounts: [8, 9, 10], fitFirst: true, fitWords: fit })
  checa('verbatim marcado: 11 palavras cabem em 5 s a 2,3 pal/s, 15 não (→ 10 s); cauda que falta é paga no ÚLTIMO plano', fit === 11 && K.kling25WordsFit(10, 2.3) === 22 && eqJ(s1, [5, 10, 5]) && eqJ(s2, [5, 10, 10]))
}
checa('duration da fal: 5 → "5", 10 → "10", sem segundos → "10" (o de sempre)', K.kling25FalDuration(5) === '5' && K.kling25FalDuration(10) === '10' && K.kling25FalDuration(undefined) === '10' && K.kling25FalDuration(null) === '10')
const alinhaOk = (L) => {
  const resp = { clip_seconds: [5, 10, 5, 5] }
  const auth = ['https://f/1.mp4', null, 'https://f/3.mp4', 'https://f/4.mp4']
  const a = L.alignSignedClipSeconds(resp, auth, ['https://f/1.mp4', 'https://f/3.mp4', 'https://f/4.mp4'])
  const semCampo = L.alignSignedClipSeconds({}, auth, ['https://f/1.mp4', 'https://f/3.mp4', 'https://f/4.mp4'])
  const tamanho = L.alignSignedClipSeconds({ clip_seconds: [5, 10, 5, 5, 5] }, auth, ['https://f/1.mp4', 'https://f/3.mp4', 'https://f/4.mp4'])
  const valor = L.alignSignedClipSeconds({ clip_seconds: [5, 10, 7, 5] }, auth, ['https://f/1.mp4', 'https://f/3.mp4', 'https://f/4.mp4'])
  const url = L.alignSignedClipSeconds(resp, auth, ['https://f/1.mp4', 'https://f/4.mp4', 'https://f/3.mp4'])
  return eqJ(a, [5, 5, 5]) && semCampo === null && tamanho === null && valor === null && url === null
}
checa('claim → compose: alinha pelo índice da cena (buraco null pulado); sem campo, tamanho errado, valor fora de 5|10 ou URL fora de ordem = null (montagem de hoje)', alinhaOk(K))
const alinhaPlanoOk = (L) => {
  if (typeof L.alignSignedClipPlan !== 'function') return false
  const auth = ['https://f/1.mp4', null, 'https://f/3.mp4']
  const urlsOk = ['https://f/1.mp4', 'https://f/3.mp4']
  const resp = { clip_seconds: [5, 5, 10], clip_word_starts: [0, 4, 9], voiceover_script: 'a b c d. e f g h i. j k l m n o.' }
  const p = L.alignSignedClipPlan(resp, auth, urlsOk)
  const semInicio = L.alignSignedClipPlan({ ...resp, clip_word_starts: undefined }, auth, urlsOk)
  const decresce = L.alignSignedClipPlan({ ...resp, clip_word_starts: [0, 9, 4] }, auth, urlsOk)
  const fora = L.alignSignedClipPlan({ ...resp, clip_word_starts: [0, 4, 99] }, auth, urlsOk)
  return eqJ(p?.seconds, [5, 10]) && eqJ(p?.wordStarts, [0, 9]) && p?.narrationWords.length === 15 &&
    eqJ(semInicio?.seconds, [5, 10]) && semInicio.wordStarts === null && decresce.wordStarts === null && fora.wordStarts === null &&
    L.alignSignedClipPlan({}, auth, urlsOk) === null
}
checa('claim → compose: o início da fala de cada cena (clip_word_starts sobre voiceover_script, ambos assinados) se alinha às URLs; início ausente/decrescente/fora da narração = só os segundos (nunca inventa)', alinhaPlanoOk(K))
checa('orçamento do escritor (>9 cenas) e do supervisor crescem com as cenas; até 9 cenas o escritor fica no padrão', K.kling25WriterBudget(12).maxTokens >= 12 * 150 + 200 && K.kling25WriterBudget(12).timeoutMs === 50000 && K.kling25WriterBudget(8).maxTokens === 1800 && K.kling25WriterBudget(8).timeoutMs === 35000 && K.kling25AlignBudget(12).maxTokens >= 1900 && K.kling25AlignBudget(12).timeoutMs > 9000 && K.kling25AlignBudget(4).maxTokens === 1400 && K.kling25AlignBudget(4).timeoutMs === 9000)
checa('escritor do modo IA recebe a média REAL dos planos (revisão: no 90 s 7 de 12 planos são de 10 s e ele ouvia "~5-second"): 35 s → 5; 60 s → 6; 90 s → 8', K.kling25AverageShotSeconds(8, 38) === 5 && K.kling25AverageShotSeconds(10, 48) === 5 && K.kling25AverageShotSeconds(12, 64.5) === 6 && K.kling25AverageShotSeconds(12, 93) === 8)
{
  const narr = 'One two three. Four five six seven. Eight nine. Ten eleven twelve.'
  const prosa = K.kling25SceneWordStarts(narr, ['One two three.', 'Four five six seven.', 'Eight nine. Ten eleven twelve.'])
  const amostrado = K.kling25SceneWordStarts(narr, ['One two three.', 'Eight nine.', 'Ten eleven twelve.'])
  const reescrito = K.kling25SceneWordStarts(narr, ['One two three.', 'Totally different words here', 'Ten eleven twelve.'])
  checa('início da fala de cada cena: prosa = soma acumulada; roteiro marcado amostrado acha o bloco adiante (a fala pulada fica com a cena anterior); texto não achado continua do fim da anterior; nunca decresce', eqJ(prosa, [0, 3, 7]) && eqJ(amostrado, [0, 7, 9]) && eqJ(reescrito, [0, 3, 9]))
}
checa('passo de planejamento: min(voz, 2,3); roteiro que passaria de 90 s nesse passo (o compose corta em 90) sobe até caber — 400 palavras → 4,444 pal/s', K.kling25PlanPace(2.55) === 2.3 && K.kling25PlanPace(2.1) === 2.1 && K.kling25PlanPace(undefined) === 2.3 && K.kling25PlanPace(2.55, 400) === 4.444 && K.kling25PlanPace(2.55, 200) === 2.3)

// ═══ (c) a rota ═══
console.log('== (c) rota: dimensionamento, builder da fal, plano do verbatim, segundos, despacho e resposta assinada ==')
checa('a rota importa a régua da lib', rota.includes("from '@/lib/cinematic/klingShots' // KINEO-KLING25-PLANOS-5S-2026-09-28"))
// (c1) dimensionamento real: linha do Veo + bloco #442 + bloco novo
const veoLinha = (src) => { const m = src.match(/\n    if \(wantsVeo\) clipCount = Math\.max\(clipCount, Math\.min\(12, Math\.ceil\(duration \/ 8\) \+ 1\)\)\n/); return m ? m[0] : null }
const bloco442 = (src) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isIfStatement(x) && x.expression.getText(ast) === 'verbatim' && x.getText(ast).includes('SECONDS_PER_CLIP')); return n ? n.getText(ast) : null }
const blocoKlingDim = (src) => fatia(src, '    let kling25Footage = 0\n', '\n    }\n', true)
function dimensiona(src, { engine, duration, verbatim = false, narration = '', wps = 3.1 }, lib = K) {
  const partes = [veoLinha(src), bloco442(src), blocoKlingDim(src) ?? 'let kling25Footage = 0']
  if (!partes[0] || !partes[1]) return null
  return roda(`export function run() { let clipCount = clipCountForDuration(duration)\n${partes.join('\n')}\n return { clipCount, kling25Footage } }`, {
    clipCountForDuration, duration, verbatim, parsedScript: { narration, segments: [] }, wantsKling: engine === 'kling', wantsVeo: engine === 'veo', wantsSora: engine === 'sora',
    narrationRate: { wordsPerSecond: wps }, kling25FootageNeeded: lib.kling25FootageNeeded, kling25ShotCount: lib.kling25ShotCount,
  }).run()
}
const CANARIO = 'In Death Valley there is a dry lakebed called Racetrack Playa, and its rocks move on their own. Some weigh hundreds of pounds. Behind them, long trails are carved into the cracked mud. For decades nobody ever saw one move. Theories blamed hurricane-force winds, slick algae, even pranksters. Then scientists fitted rocks with GPS trackers, and in December 2013 they finally caught them moving. After rain, a thin layer of ice forms on the playa. When the sun breaks that ice into floating panels, a light breeze pushes them, and the panels shove the rocks across the mud.'
checa('o canário tem as 98 palavras do claim de produção', palavras(CANARIO).length === 98)
// re-ancorado (revisão adversarial): no verbatim o número do dimensionamento é provisório (passo 2,3 → 42,6 s → 9 planos);
// o plano de verdade sai do divisor que decide cortes e segundos juntos (c3).
const dimOk = (src) => {
  const k35 = dimensiona(src, { engine: 'kling', duration: 35 }), k60 = dimensiona(src, { engine: 'kling', duration: 60 }), k90 = dimensiona(src, { engine: 'kling', duration: 90 })
  const kc = dimensiona(src, { engine: 'kling', duration: 35, verbatim: true, narration: CANARIO, wps: 2.5 })
  return k35?.clipCount === 8 && k60?.clipCount === 12 && k90?.clipCount === 12 && kc?.clipCount === 9 && kc.kling25Footage === 42.6
}
checa('rota real: Kling 2.5 pede 8 planos a 35 s, 12 a 60 s e a 90 s; o canário verbatim (98 palavras a 2,3 pal/s = 42,6 s) pede 9 provisórios', dimOk(rota))
if (rotaBase) {
  const iguais = []
  for (const engine of ['seedance', 'veo', 'sora']) for (const duration of [35, 45, 60, 90]) for (const verbatim of [false, true]) {
    const caso = { engine, duration, verbatim, narration: verbatim ? CANARIO + ' ' + CANARIO : '' }
    iguais.push(dimensiona(rota, caso)?.clipCount === dimensiona(rotaBase, caso)?.clipCount)
  }
  checa('Seedance, Veo e Sora: contagem de cenas idêntica à base em 35/45/60/90 s, ideia e verbatim (24 casos)', iguais.length === 24 && iguais.every(Boolean))
  checa('base (Kling a 10 s): 35 s = 4, 60 s = 7, 90 s = 9 — o "antes" medido pelo mesmo código', dimensiona(rotaBase, { engine: 'kling', duration: 35 })?.clipCount === 4 && dimensiona(rotaBase, { engine: 'kling', duration: 60 })?.clipCount === 7 && dimensiona(rotaBase, { engine: 'kling', duration: 90 })?.clipCount === 9)
}

// (c2) builder real da fal
const loadLib = createOfflineLoader({})
const aspect = loadLib('@/lib/aspect')
const policy = loadLib('@/lib/cinematic/visualPromptPolicy')
const router = rd('lib/hollywood/router.ts')
const routerNames = ['HOLLYWOOD_MODELS', 'KLING3_I2V_MODEL', 'H3_MODELS', 'H3_I2V_MODEL', 'H3_RESOLUTION', 'OMNI_I2V_MODEL', 'S25_I2V_MODEL', 'S25_T2V_MODEL', 'S25_RESOLUTION']
const R = roda(routerNames.map((n) => `export ${varDe(router, n)}`).join('\n'))
const modelNames = ['SEEDANCE_MODEL', 'KLING_MODEL', 'KLING_I2V_MODEL', 'SEEDANCE_I2V_MODEL', 'VEO_I2V_MODEL', 'VEO_MODEL', 'SORA_MODEL', 'KLING3_MODEL']
const montaBuilder = (src) => {
  const fn = funcaoDe(src, 'buildFalInput')
  if (!fn) return null
  return roda(modelNames.map((n) => varDe(src, n)).join('\n') + '\n' + fn + `\nObject.assign(exports, { buildFalInput, ${modelNames.join(', ')} });`,
    { ...R, H3_PROMPT_EXPANSION: 'disabled', aspectSpec: aspect.aspectSpec, classicVisualNegativePrompt: policy.classicVisualNegativePrompt })
}
const B = montaBuilder(rota)
const Bb = rotaBase ? montaBuilder(rotaBase) : null
const IMG = 'https://v3.fal.media/files/still-1.png'
const builderKlingOk = (b) => {
  if (!b) return false
  const t5 = b.buildFalInput(b.KLING_MODEL, 'shot', false, false, 5, undefined, 17, false, '9:16', 'documentary_faceless')
  const t10 = b.buildFalInput(b.KLING_MODEL, 'shot', false, false, 10, undefined, 17, false, '9:16', 'documentary_faceless')
  const tx = b.buildFalInput(b.KLING_MODEL, 'shot', false, false, undefined, undefined, 17, false, '9:16', 'documentary_faceless')
  const i5 = b.buildFalInput(b.KLING_I2V_MODEL, 'shot', false, false, 5, IMG, 17, false, '9:16', 'documentary_faceless')
  const i10 = b.buildFalInput(b.KLING_I2V_MODEL, 'shot', false, false, 10, IMG, 17, false, '9:16', 'documentary_faceless')
  const ix = b.buildFalInput(b.KLING_I2V_MODEL, 'shot', false, false, undefined, IMG, 17, false, '9:16', 'documentary_faceless')
  return t5.duration === '5' && t10.duration === '10' && tx.duration === '10' && i5.duration === '5' && i10.duration === '10' && ix.duration === '10' && i5.image_url === IMG && t5.cfg_scale === 0.6 && i5.cfg_scale === 0.6 && t5.seed === 17 && typeof i5.negative_prompt === 'string'
}
checa('buildFalInput real: Kling 2.5 t2v e i2v mandam "5" no plano de 5 s, "10" no de 10 s e "10" sem segundos', builderKlingOk(B))
if (Bb) {
  const casos = []
  const modelos = [['SEEDANCE_MODEL'], ['SEEDANCE_I2V_MODEL', IMG], ['VEO_MODEL'], ['VEO_I2V_MODEL', IMG], ['SORA_MODEL'], ['KLING_MODEL'], ['KLING_I2V_MODEL', IMG]]
  for (const [nome, img] of modelos) for (const aspecto of ['9:16', '16:9', null]) for (const modo of ['documentary_faceless', 'character_story', 'presenter']) for (const stylized of [false, true]) {
    casos.push(eqJ(B.buildFalInput(B[nome], 'A basalt coast at dusk', false, false, undefined, img, 4242, stylized, aspecto, modo), Bb.buildFalInput(Bb[nome], 'A basalt coast at dusk', false, false, undefined, img, 4242, stylized, aspecto, modo)))
  }
  checa(`caminho clássico sem segundos (Seedance t2v/i2v, Veo t2v/i2v, Sora, Kling legado): payload JSON-idêntico à base em ${casos.length} combinações`, casos.length === 126 && casos.every(Boolean))
  const holly = []
  for (const m of [R.KLING3_I2V_MODEL, R.HOLLYWOOD_MODELS.dialogue, R.H3_I2V_MODEL, R.H3_MODELS.dialogue, R.OMNI_I2V_MODEL, R.S25_I2V_MODEL, R.S25_T2V_MODEL, B.SEEDANCE_MODEL, B.VEO_MODEL]) for (const s of [5, 8, 10, undefined]) {
    holly.push(eqJ(B.buildFalInput(m, 'Mira says: "hello"', true, true, s, IMG, undefined, false, '9:16'), Bb.buildFalInput(m, 'Mira says: "hello"', true, true, s, IMG, undefined, false, '9:16')))
  }
  checa('família hollywood (Kling 3, H3, Omni, S25) e ramos hollywood de Seedance/Veo: payload idêntico à base com 5/8/10/sem segundos', holly.length === 36 && holly.every(Boolean))
}
checa('a regra do builder espelha kling25FalDuration (mesmo limiar: ≤ 5 → "5")', (rota.match(/duration: typeof seconds === 'number' && seconds > 0 && seconds <= 5 \? '5' : '10'/g) || []).length === 2)

// (c3) plano do verbatim (bloco real) e segundos por cena (bloco real)
const vb = roda(rd('lib/cinematic/verbatimBeats.ts'))
const vbBaseSrc = rdBase('lib/cinematic/verbatimBeats.ts')
const vbBase = vbBaseSrc ? roda(vbBaseSrc) : null
checa('lib/cinematic/verbatimBeats.ts é o da base, byte a byte: o divisor de Seedance/Veo/Sora não mudou (o plano do Kling mora em klingShots)', Boolean(vbBaseSrc) && rd('lib/cinematic/verbatimBeats.ts') === vbBaseSrc)
const blocoDivisao = (src) => fatia(src, '    if (wantsKling && verbatim && parsedScript.segments.length === 0 && scenes.length > 0) {\n', '\n    }\n\n    // ═══ KINEO-ZERO-SCENES-FALLBACK-2026-09-04', false)
const blocoSegundos = (src) => fatia(src, '    let kling25ClipSeconds: number[] | null = null\n', 'de clipe (necessário ${kling25Footage}s)`)\n    }\n', true)
const shortCaption = (t) => palavras(t).slice(0, 8).join(' ')
// Executa, na ordem da rota: divisor genérico (o de Seedance) → bloco do Kling (se houver) → bloco dos segundos. Todos os
// nomes das duas versões da lib entram como globais: a mesma harness roda a versão atual e a 1ª (2a28b39d).
function planejaCenas(src, { engine, narration, clipCount, footage, wps = 2.55, duration = 35 }, libVb = vb, libK = K) {
  const inicial = libVb.resolveVerbatimSegments({ segments: [], narration }, clipCount).map((seg) => ({ description: seg.pexelsQuery, voiceover: seg.voiceover, caption: shortCaption(seg.voiceover), stockSearchQuery: seg.pexelsQuery }))
  const d = blocoDivisao(src), s = blocoSegundos(src)
  if (!d || !s) return null
  try { return roda(`export function run() { let scenes = cenas\n let clipCount = cc\n${d}\n    }\n${s}\n return { scenes, kling25ClipSeconds, clipCount } }`, {
    cenas: inicial, cc: clipCount, wantsKling: engine === 'kling', verbatim: true, parsedScript: { narration, segments: [] }, duration, narrationRate: { wordsPerSecond: wps },
    kling25Footage: engine === 'kling' ? footage : 0, resolveVerbatimSegments: libVb.resolveVerbatimSegments, shortCaptionFromVoiceover: shortCaption,
    ...Object.fromEntries(Object.entries(libK).filter(([k]) => /^(kling25|KLING25_)/.test(k))),
  }).run() } catch { return null }
}
const FIM_FRASE = /[.!?…]["'”’)\]]*$/u
const VIRGULA = /[,;:—–]["'”’)\]]*$/u
function frasesDe(texto) { const out = []; let cur = []; for (const w of palavras(texto)) { cur.push(w); if (FIM_FRASE.test(w)) { out.push(cur); cur = [] } } if (cur.length) out.push(cur); return out }
// cada corte: fim de frase; vírgula/ponto-e-vírgula; palavra só dentro de uma frase que não cabe num plano de 5 s
function cortesOk(cenas, texto, fitShort) {
  const tamFrase = []
  for (const f of frasesDe(texto)) for (let i = 0; i < f.length; i++) tamFrase.push(f.length)
  let pos = 0
  return cenas.slice(0, -1).every((c) => {
    const ws = palavras(c.voiceover ?? c)
    pos += ws.length
    const ultima = ws[ws.length - 1]
    return FIM_FRASE.test(ultima) || VIRGULA.test(ultima) || tamFrase[pos - 1] > fitShort
  })
}
// a fala de cada plano cabe no seu útil no passo de planejamento (a regra da revisão adversarial)
const cabeNoPlano = (cenas, segundos, pace = 2.3) => cenas.length === segundos.length && cenas.every((c, i) => palavras(c.voiceover ?? c).length / pace <= segundos[i] - 0.16 + 1e-9)
const semPontuacao = (t) => palavras(String(t).normalize('NFKC').replace(/[^\p{L}\p{N}\s'-]/gu, ' '))
function canarioOk(src, libK = K) {
  const r = planejaCenas(src, { engine: 'kling', narration: CANARIO, clipCount: 9, footage: 42.6 }, vb, libK)
  if (!r) return false
  const somaFala = r.scenes.map((c) => c.voiceover).join(' ') === CANARIO
  const somaPista = eqJ(r.scenes.flatMap((c) => semPontuacao(c.description)), semPontuacao(CANARIO))
  // re-ancorado ([TRAVA 8.2] KLING25-60S-TETO, 28/09): o bloco de 5 s do divisor reserva 0,3 s de folga (≤ 10 palavras a
  // 2,3 pal/s, era 11) — corte de palavra só dentro de frase que não cabe nesse bloco. A regra é a mesma; o número segue a lib.
  const fitCurto = libK.kling25WordsFit(5 - (libK.KLING25_SHORT_FIT_SLACK_SECONDS ?? 0), 2.3)
  return r.scenes.length >= 8 && r.scenes.length <= 12 && somaFala && somaPista && cortesOk(r.scenes, CANARIO, fitCurto) && cabeNoPlano(r.scenes, r.kling25ClipSeconds) &&
    r.scenes.every((c, i) => c.clipSeconds === r.kling25ClipSeconds[i]) && r.clipCount === r.scenes.length
}
checa('canário no Kling (blocos reais da rota): 8 a 12 planos que somam o roteiro palavra por palavra, pista visual sem palavra perdida, cortes em fim de frase ou vírgula, e CADA plano cabe a própria fala a 2,3 pal/s (5 s ≤ 10 palavras com a folga de 0,3 s, 10 s ≤ 22)', canarioOk(rota))
{
  const r = planejaCenas(rota, { engine: 'kling', narration: CANARIO, clipCount: 9, footage: 42.6 })
  console.log('   planos do canário: ' + (r?.scenes ?? []).map((c, i) => `${i + 1}) [${c.clipSeconds}s] ${c.voiceover}`).join(' | '))
  checa('as fronteiras do canário: nenhum plano acaba no meio de "Behind them," nem de "Then scientists" (as palavras que o claim antigo perdia ficam com a sua frase)', Boolean(r) && !r.scenes.some((c) => /\b(Behind|Then)$/.test(c.voiceover)) && r.scenes.some((c) => c.voiceover.includes('Behind them, long trails')) && r.scenes.some((c) => c.voiceover.includes('Then scientists fitted rocks')))
  const s = planejaCenas(rota, { engine: 'seedance', narration: CANARIO, clipCount: 4, footage: 0 })
  const sBase = vbBase ? vbBase.resolveVerbatimSegments({ segments: [], narration: CANARIO }, 4) : null
  checa('Seedance: os dois blocos novos não rodam — cenas = divisor de sempre, sem clipSeconds, kling25ClipSeconds null', Boolean(s) && s.kling25ClipSeconds === null && s.scenes.every((c) => !('clipSeconds' in c)) && (!sBase || eqJ(s.scenes.map((c) => [c.voiceover, c.description]), sBase.map((x) => [x.voiceover, x.pexelsQuery]))))
}
// o defeito de produção reproduzido na base
const CLAIM_PRODUCAO = [
  'In Death Valley there is a dry lakebed called Racetrack Playa and its rocks move on their own Some weigh hundreds of pounds Behind',
  'long trails are carved into the cracked mud For decades nobody ever saw one move Theories blamed hurricane-force winds slick algae even pranksters Then',
  'fitted rocks with GPS trackers and in December 2013 they finally caught them moving After rain a thin layer of ice forms on the',
  'playa When the sun breaks that ice into floating panels a light breeze pushes them and the panels shove the rocks across the mud',
]
if (vbBase) {
  const base4 = vbBase.resolveVerbatimSegments({ segments: [], narration: CANARIO }, 4)
  checa('base reproduz o claim de produção do canário (cfee6787): as 4 cenas gravadas são as pistas de 24 palavras', eqJ(base4.map((b) => b.pexelsQuery), CLAIM_PRODUCAO))
  checa('causa raiz: a FALA da base está inteira (soma = roteiro); quem perde "them" e "scientists" é a pista visual de 24 palavras de uma cena de 25', base4.map((b) => b.voiceover).join(' ') === CANARIO && !CLAIM_PRODUCAO.join(' ').split(' ').includes('scientists') && CLAIM_PRODUCAO[0].endsWith('Behind') && palavras(base4[0].voiceover).length === 25)
}
// roteiros aleatórios: a soma é sempre o roteiro, cada plano cabe a sua fala, cortes em fim de frase/vírgula
{
  let semPerda = true, emFrase = true, contagem = true, cabe = true, cobre = true
  let seed = 20260928
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  for (let caso = 0; caso < 300; caso++) {
    const frases = Array.from({ length: 3 + Math.floor(rnd() * 20) }, () => { const n = 3 + Math.floor(rnd() * 22); return Array.from({ length: n }, (_, i) => `w${Math.floor(rnd() * 999)}${i === Math.floor(n / 2) && rnd() < 0.5 ? ',' : ''}`).join(' ') + (rnd() < 0.15 ? '!' : '.') })
    const texto = frases.join(' ')
    const d = rnd() < 0.4 ? 60 : 35
    const p = K.kling25VerbatimPlan(texto, { durationSeconds: d, wordsPerSecond: 2.3 + rnd() * 0.8 })
    if (p.chunks.join(' ') !== texto) semPerda = false
    if (!eqJ(p.chunks.flatMap((c) => semPontuacao(K.kling25VisualHint(c))), semPontuacao(texto))) semPerda = false
    // re-ancorado ([TRAVA 8.2] KLING25-60S-TETO, 28/09): o teto do roteiro pronto passou a acompanhar a imagem do filme (12-18);
    // o que se protege é o mesmo — nunca acima do teto físico da lib, nunca menos de 2, só 5|10 s.
    if (p.chunks.length < Math.min(2, palavras(texto).length) || p.chunks.length > K.KLING25_MAX_SHOTS || p.chunks.length > K.kling25MaxShots({ verbatim: true, footageSeconds: p.needSeconds }) || p.seconds.length !== p.chunks.length || !p.seconds.every((s) => s === 5 || s === 10)) contagem = false
    if (!p.chunks.every((c, i) => palavras(c).length <= (p.seconds[i] === 5 ? p.fitShort : p.fitLong))) cabe = false
    if (p.seconds.reduce((a, s) => a + s - 0.16, 0) + 1e-6 < p.needSeconds) cobre = false
    if (!cortesOk(p.chunks, texto, p.fitShort)) emFrase = false
  }
  checa('300 roteiros aleatórios: a fala somada é o roteiro e a pista visual não perde palavra', semPerda)
  checa('300 roteiros aleatórios: de 2 ao teto do filme (12-18, nunca acima do teto físico 18), só 5|10 s', contagem)
  checa('300 roteiros aleatórios: CADA plano cabe a própria fala no passo de planejamento (5 s ≤ fitShort, 10 s ≤ fitLong)', cabe)
  checa('300 roteiros aleatórios: a imagem útil cobre o filme (inclusive os 61,5 s do TIKTOK-61 nos pedidos de 60 s)', cobre)
  checa('300 roteiros aleatórios: todo corte cai em fim de frase ou vírgula; palavra só dentro de frase maior que um plano de 5 s', emFrase)
}

// (c4) o callback real do despacho
// Cherry-pick sobre origin/main b99717a6 (28/09): a main NÃO tem a CENA-CLASSICA parte 2 (classicSceneInputs), então o
// callback do despacho clássico é a EXPRESSÃO `=> submitFalQueueOnce(m, buildFalInput(..., scene.clipSeconds, ...), onPost)`.
// O harness fatia as DUAS formas (expressão da main; bloco da parte 2, quando ela entrar) e prova o mesmo: o payload que
// vai ao POST leva duration '5' no plano de 5 s e '10' no de 10 s, no i2v e no t2v de reserva. Na forma em bloco também
// confere que o gravado (scene_fal_inputs, que a retomada reenvia) é o enviado.
const cb = (src) => {
  const bloco = fatia(src, 'submit: async (m, promptForAttempt, onPost) => {', '\n        },\n', false)
  if (bloco) return { corpo: bloco.replace(/^submit: /, '') + '\n        }', forma: 'bloco' }
  const expr = fatia(src, 'submit: async (m, promptForAttempt, onPost) => submitFalQueueOnce(', '\n        ),\n', false)
  return expr ? { corpo: expr.replace(/^submit: /, '') + '\n        )', forma: 'expressao' } : null
}
checa('callback real do despacho clássico: a fatia existe (expressão da main ou bloco da parte 2) e lê scene.clipSeconds no 5º argumento do buildFalInput', Boolean(cb(rota)) && cb(rota).corpo.includes('buildFalInput(m, promptForAttempt, hd, false, scene.clipSeconds,'))
const montaSubmit = (cbSrc, ctx) => roda(`export function fazer(ctx: any) {\n  const { hd, imageUrl, modelos, generationSeed, isStylizedLook, styleAnchor, aspectRequested, classicVisualMode, classicSceneInputs, sceneIndex, buildFalInput, submitFalQueueOnce, scene } = ctx\n  return ${cbSrc.corpo}\n}`).fazer(ctx)
async function despacha(cbSrc, builder, { scene, modelos, imageUrl, sceneIndex = 1 }) {
  const classicSceneInputs = [null, null, null]
  const posts = []
  const submit = montaSubmit(cbSrc, { hd: false, imageUrl, modelos, generationSeed: 4242, isStylizedLook: () => false, styleAnchor: {}, aspectRequested: '9:16', classicVisualMode: 'documentary_faceless', classicSceneInputs, sceneIndex, buildFalInput: builder.buildFalInput, scene,
    submitFalQueueOnce: async (m, input, onPost) => { onPost?.(); posts.push({ m, input: clone(input) }); return 'req-' + posts.length } })
  const out = []
  for (const m of modelos) { await submit(m, 'A slow push-in over cracked mud on Racetrack Playa', () => {}); out.push(clone(cbSrc.forma === 'bloco' ? classicSceneInputs[sceneIndex] : posts[posts.length - 1].input)) }
  return { out, posts }
}
const despachoOk = async (src) => {
  const c = cb(src)
  if (!c || !B) return false
  const k5 = await despacha(c, B, { scene: { clipSeconds: 5 }, modelos: [B.KLING_I2V_MODEL, B.KLING_MODEL], imageUrl: IMG })
  const k10 = await despacha(c, B, { scene: { clipSeconds: 10 }, modelos: [B.KLING_I2V_MODEL, B.KLING_MODEL], imageUrl: IMG })
  return k5.out[0].duration === '5' && k5.out[0].image_url === IMG && k5.out[1].duration === '5' && !('image_url' in k5.out[1]) && k10.out.every((x) => x.duration === '10') && eqJ(k5.posts.map((p) => p.input), k5.out)
}
checa('callback real do despacho: plano de 5 s envia duration "5" no i2v e no t2v de reserva; plano de 10 s envia "10"; o enviado é o payload do buildFalInput (na forma em bloco da parte 2, também o gravado em scene_fal_inputs)', await despachoOk(rota))
if (rotaBase && Bb) {
  const iguais = []
  for (const [modelos, img] of [[[B.SEEDANCE_I2V_MODEL, B.SEEDANCE_MODEL], IMG], [[B.SEEDANCE_MODEL], undefined], [[B.VEO_I2V_MODEL, B.VEO_MODEL], IMG], [[B.VEO_MODEL], undefined], [[B.SORA_MODEL], undefined], [[B.KLING_I2V_MODEL, B.KLING_MODEL], IMG]]) {
    const novo = await despacha(cb(rota), B, { scene: { voiceover: 'x', description: 'y' }, modelos, imageUrl: img })
    const velho = await despacha(cb(rotaBase), Bb, { scene: { voiceover: 'x', description: 'y' }, modelos, imageUrl: img })
    iguais.push(eqJ(novo.posts, velho.posts))
  }
  checa('cena sem clipSeconds (Seedance, Veo, Sora e Kling de antes): os POSTs do callback novo são idênticos aos da base', iguais.length === 6 && iguais.every(Boolean))
}

// (c5) o objeto de resposta assinado
const objResp = (src) => fatia(src, "\n    const response: Record<string, unknown> = {\n      mode: 'cinematic_ai',", '\n    }\n')
const VARS = ['generationId', 'prompt', 'duration', 'requestedDuration', 'aspectRequested', 'degrau', 'scenes', 'voiceoverScript', 'falRequestIds', 'usedModel', 'usedModels', 'claimQuality', 'verbatim', 'parsedScript', 'contratoRelatoClassico', 'formatoVisual', 'classicSceneInputs', 'anchorActive']
const montaResp = (src, libK = K) => roda(`export function montar(ctx: any) {\n  const { ${VARS.join(', ')} } = ctx\n${src}\n  return response\n}`, { kling25SceneWordStarts: libK.kling25SceneWordStarts }).montar
const ctxResp = (cenas, voz = cenas.map((c) => c.voiceover ?? '').join(' ')) => ({ generationId: 'g', prompt: 'p', duration: 35, requestedDuration: 35, aspectRequested: '9:16', degrau: null, scenes: cenas, voiceoverScript: voz, falRequestIds: cenas.map((_, i) => 'r' + i), usedModel: 'm', usedModels: cenas.map(() => 'm'), claimQuality: 'cinematic_kling', verbatim: true, parsedScript: { speed: null }, contratoRelatoClassico: [], formatoVisual: { modo: 'documentary_faceless' }, classicSceneInputs: cenas.map(() => null), anchorActive: false })
const respostaOk = (src) => {
  const o = objResp(src)
  if (!o) return false
  const kling = montaResp(o)(ctxResp([{ description: 'a', caption: 'A', voiceover: 'One two three.', clipSeconds: 5 }, { description: 'b', caption: 'B', voiceover: 'Four five six seven.', clipSeconds: 10 }, { description: 'c', caption: 'C', voiceover: 'Eight nine.', clipSeconds: 5 }]))
  const seed = montaResp(o)(ctxResp([{ description: 'a', caption: 'A', voiceover: 'x' }, { description: 'b', caption: 'B', voiceover: 'y' }]))
  return eqJ(kling.clip_seconds, [5, 10, 5]) && eqJ(kling.clip_word_starts, [0, 3, 7]) && kling.voiceover_script === 'One two three. Four five six seven. Eight nine.' && !('clip_seconds' in seed) && !('clip_word_starts' in seed)
}
checa('resposta assinada: clip_seconds e clip_word_starts (início da fala de cada cena em voiceover_script) no Kling 2.5; ausentes quando a cena não tem segundos (Seedance/Veo/Sora)', respostaOk(rota))
if (rotaBase) {
  const o = objResp(rota), ob = objResp(rotaBase)
  const cenas = [{ description: 'a', caption: 'A', voiceover: 'x' }, { description: 'b', caption: 'B', voiceover: 'y' }]
  checa('resposta de Seedance/Veo/Sora JSON-idêntica à base (nenhum campo novo)', Boolean(o && ob) && eqJ(montaResp(o)(ctxResp(cenas)), montaResp(ob)(ctxResp(cenas))))
}
checa('o claim clássico vira plano → compose: o alinhamento aceita a resposta real com cena perdida no meio (segundos E início da fala)', (() => { const r = montaResp(objResp(rota))(ctxResp([{ description: 'a', caption: 'A', voiceover: 'a b c.', clipSeconds: 5 }, { description: 'b', caption: 'B', voiceover: 'd e.', clipSeconds: 5 }, { description: 'c', caption: 'C', voiceover: 'f g h i.', clipSeconds: 10 }])); const p = K.alignSignedClipPlan(r, ['u1', null, 'u3'], ['u1', 'u3']); return eqJ(p?.seconds, [5, 10]) && eqJ(p?.wordStarts, [0, 5]) })())

// ═══ (d) o compose real ═══
console.log('== (d) compose real: nenhum plano de 5 s passa de 5 s; cada plano entra na sua fala; sem os campos, montagem idêntica à base ==')
const C = loadLib('@/lib/compose')
const compoe = (src) => {
  const exports = {}
  const code = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { exports, require: (n) => loadLib(n), Buffer, URL, URLSearchParams, TextEncoder, TextDecoder, process: { env: {} }, console: { log() {}, warn() {}, error() {} }, fetch: () => { throw new Error('rede proibida') }, setTimeout: () => { throw new Error('timer proibido') }, clearTimeout() {} }, { timeout: 5000 })
  return exports
}
const Cb = rdBase('lib/compose.ts') ? compoe(rdBase('lib/compose.ts')) : null
// Whisper sintético: palavras sem pontuação (como o Whisper real) e sentenceEnd do segmento
const falaDe = (texto, total) => { const ws = palavras(texto); const passo = (total - 0.5) / ws.length; return ws.map((w, i) => ({ word: w.replace(/[^\p{L}\p{N}'-]/gu, ''), start: Math.round(i * passo * 1000) / 1000, end: Math.round((i * passo + passo * 0.85) * 1000) / 1000, sentenceEnd: FIM_FRASE.test(w) })) }
const urls = (n) => Array.from({ length: n }, (_, i) => `https://v3b.fal.media/files/b/kling/clip-${i + 1}.mp4`)
const entrada = (over) => ({ clipUrls: urls(8), voiceoverUrl: 'https://x.invalid/vo.mp3', voiceoverScript: CANARIO, sceneCaptions: [], duration: 35, quality: 'cinematic_kling', realAudioDuration: 37.7, whisperWords: falaDe(CANARIO, 37.7), musicUrl: null, watermark: false, endCard: false, ...over })
const trechosDe = (source) => (source.elements ?? []).filter((e) => e.track === 2 && e.type === 'video')
const OVERLAP = 0.06
function invariantes(source, clipSeconds, clipUrls, total, { exigeSemReuso }) {
  const t = trechosDe(source)
  if (t.length === 0) return { ok: false, motivo: 'sem trechos' }
  let cursor = 0
  const usos = new Map()
  for (const e of t) {
    const idx = clipUrls.indexOf(e.source)
    if (idx < 0) return { ok: false, motivo: 'fonte desconhecida' }
    const trim = typeof e.trim_start === 'number' ? e.trim_start : 0
    if (trim + e.duration > clipSeconds[idx] + 1e-6) return { ok: false, motivo: `clipe ${idx + 1} (${clipSeconds[idx]} s) pedido até ${(trim + e.duration).toFixed(3)} s` }
    if (e.loop !== false) return { ok: false, motivo: 'loop ligado' }
    if (Math.abs(e.time - cursor) > 0.002) return { ok: false, motivo: `buraco/sobreposição em ${cursor}` }
    cursor = e.time + e.duration - OVERLAP
    usos.set(idx, (usos.get(idx) ?? 0) + 1)
  }
  if (cursor < total - 0.002) return { ok: false, motivo: `imagem acaba em ${cursor.toFixed(3)} de ${total}` }
  if (exigeSemReuso && [...usos.values()].some((u) => u > 1)) return { ok: false, motivo: 'clipe repetido com imagem de sobra' }
  const ordem = t.map((e) => clipUrls.indexOf(e.source))
  if (exigeSemReuso && !eqJ(ordem, [...ordem].sort((a, b) => a - b))) return { ok: false, motivo: 'ordem das cenas trocada' }
  return { ok: true, n: t.length }
}
const canarioCompose = (Cx) => {
  const src = Cx.buildCreatomateSource(entrada({ clipSeconds: new Array(8).fill(5) }))
  const inv = invariantes(src, new Array(8).fill(5), urls(8), 37.7, { exigeSemReuso: true })
  const t = trechosDe(src)
  return inv.ok && t.length === 8 && t.every((e) => e.duration <= 5) ? inv : { ...inv, ok: false }
}
{
  const r = canarioCompose(C)
  checa(`sem início de fala (nível d'água): canário no compose real (37,7 s, 8 × 5 s): 8 trechos em ordem, nenhum passa de 5 s (trim + duração ≤ 5), loop desligado, sem buraco${r.ok ? '' : ' — ' + r.motivo}`, r.ok)
}
function aleatoriosCompose(Cx, casos = 400, comFala = false) {
  let seed = 90281
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const falhasL = []
  for (let k = 0; k < casos; k++) {
    const n = 2 + Math.floor(rnd() * 11)
    const secs = Array.from({ length: n }, () => (rnd() < 0.8 ? 5 : 10))
    const soma = secs.reduce((a, b) => a + b, 0) - n * 0.16
    const total = Math.round(Math.max(6, Math.min(89.5, soma * (0.55 + rnd() * 0.75))) * 10) / 10
    const nPal = Math.max(8, Math.round(total * (2 + rnd() * 1.2)))
    const texto = Array.from({ length: nPal }, (_, i) => `w${i}${rnd() < 0.12 ? '.' : ''}`).join(' ') + '.'
    const pedido = rnd() < 0.3 ? 60 : 35
    const fala = comFala ? { narrationWords: palavras(texto), wordStarts: Array.from({ length: n }, (_, i) => Math.floor((i * nPal) / n)) } : null
    const src = Cx.buildCreatomateSource(entrada({ clipUrls: urls(n), clipSeconds: secs, clipSpeech: fala, realAudioDuration: total, duration: pedido, voiceoverScript: texto, whisperWords: rnd() < 0.8 ? falaDe(texto, total) : [] }))
    // o relógio do filme como o montador calcula: fala medida (5-90 s), esticada a 61,5 s quando o pedido é ≥ 60 (TIKTOK-61)
    let esperado = Math.min(90, Math.max(5, Math.ceil(total * 10) / 10))
    if (pedido >= 60 && esperado < 61.5) esperado = 61.5
    const inv = invariantes(src, secs, urls(n), esperado, { exigeSemReuso: soma >= esperado - 0.001 })
    if (!inv.ok) falhasL.push(`caso ${k}: n=${n} secs=${secs.join(',')} total=${esperado} → ${inv.motivo}`)
  }
  return falhasL
}
{
  const f = aleatoriosCompose(C)
  checa(`400 narrações aleatórias sem início de fala (2-12 clipes de 5|10 s, 6-90 s, com e sem Whisper): nenhum trecho passa do clipe, sem buraco, e sem reuso quando a imagem cobre o filme${f.length ? ' — ' + f.slice(0, 2).join(' / ') : ''}`, f.length === 0)
  const g = aleatoriosCompose(C, 400, true)
  checa(`as mesmas 400 COM o início de fala de cada clipe (a linha do tempo nova): nenhum trecho passa do clipe, sem buraco, e sem reuso quando a imagem cobre o filme${g.length ? ' — ' + g.slice(0, 2).join(' / ') : ''}`, g.length === 0)
}
if (Cb) {
  const casos = [
    entrada({ clipUrls: urls(4) }),
    entrada({ clipUrls: urls(4), whisperWords: [] }),
    entrada({ quality: 'cinematic_ai', clipUrls: urls(7), realAudioDuration: 61.2, duration: 60 }),
    entrada({ quality: 'cinematic_veo', clipUrls: urls(9), realAudioDuration: 58, duration: 60 }),
    entrada({ quality: 'cinematic_kling', clipUrls: urls(8), clipSeconds: [5, 5, 5] }),
    entrada({ quality: 'cinematic_kling', clipUrls: urls(8), clipSeconds: null }),
    entrada({ quality: 'fast', clipUrls: urls(10), clipSeconds: new Array(10).fill(5) }),
    entrada({ quality: 'cinematic_kling', clipUrls: urls(3), clipSeconds: [5, 5, 99] }),
    entrada({ quality: 'cinematic_kling', clipUrls: urls(8), clipSpeech: { narrationWords: palavras(CANARIO), wordStarts: [0, 12, 24, 36, 48, 60, 72, 84] } }),
    entrada({ quality: 'cinematic_ai', clipUrls: urls(4), clipSpeech: { narrationWords: palavras(CANARIO), wordStarts: [0, 25, 50, 75] } }),
  ]
  const iguais = casos.map((c) => { const { clipSeconds, clipSpeech, ...semCampo } = c; return eqJ(C.buildCreatomateSource(c), Cb.buildCreatomateSource(semCampo)) })
  checa('sem clip_seconds válido (Kling de antes, Seedance, Veo, Kineo 1, tamanho errado, valor absurdo — com ou sem início de fala) a montagem é JSON-idêntica à da base (10 casos)', iguais.every(Boolean))
  const esticados = trechosDe(Cb.buildCreatomateSource(entrada({}))).filter((e) => (e.trim_start ?? 0) + e.duration > 5 + 1e-6)
  checa(`a base (corte de 10 s do Kling) com os mesmos 8 clipes de 5 s estica ${esticados.length} plano(s) além de 5 s com loop:true — o defeito que o campo evita`, esticados.length > 0 && esticados.every((e) => e.loop === true))
}
{
  // âncoras (lib real): Whisper com "hurricane-force" em DUAS palavras e o número por extenso — o índice proporcional se
  // corrige pela mesma palavra/início de frase a até 4 palavras
  const narr = palavras('Alpha beta gamma. Delta hurricane-force winds blew. Epsilon zeta eta theta. Iota kappa.')
  const ww = ['Alpha', 'beta', 'gamma', 'Delta', 'hurricane', 'force', 'winds', 'blew', 'Epsilon', 'zeta', 'eta', 'theta', 'Iota', 'kappa'].map((w, i) => ({ word: w, start: i, end: i + 0.8, sentenceEnd: ['gamma', 'blew', 'theta', 'kappa'].includes(w) }))
  const a = C.clipSpeechAnchors({ narrationWords: narr, wordStarts: [0, 3, 7, 11], whisperWords: ww, speechSeconds: 14 })
  const semWhisper = C.clipSpeechAnchors({ narrationWords: narr, wordStarts: [0, 3, 7, 11], whisperWords: [], speechSeconds: 13 })
  checa('âncoras da fala (lib/compose real): cada corte na pausa antes da 1ª palavra da cena mesmo com o Whisper tokenizando diferente (Delta 3 s, Epsilon 8 s, Iota 12 s); sem Whisper, posição proporcional', eqJ(a, [0, 2.85, 7.85, 11.85]) && eqJ(semWhisper, [0, 3, 7, 11]))
}

// (d2) a entrada do compose: só do claim assinado, em todo caminho
const compose = rd('app/api/compose/route.ts')
const iQual = compose.indexOf('      quality = trustedQuality\n')
const iAlign = compose.indexOf('      signedClipPlan = alignSignedClipPlan(cinematicBirthClaim.response, cinematicBirthClaim.authorizedCompletedUrls, clipUrls)')
const iInputs = compose.indexOf('        !inputsMatch\n')
// re-ancorado (revisão adversarial): o compose passou a ler o plano inteiro (segundos + início da fala) pela mesma porta
checa('compose: clip_seconds e clip_word_starts lidos SÓ do claim assinado, depois da igualdade URL a URL (inputsMatch) e da quality confiável — cliente, cron de resgate e retomada passam por aqui', iAlign > iQual && iQual > iInputs && iInputs > 0 && compose.includes("import { alignSignedClipPlan } from '@/lib/cinematic/klingShots'"))
checa('compose: o corpo do cliente nunca fornece segundos de clipe nem início de fala', !/body\.clip_seconds|body\.clipSeconds|body\.clip_word_starts|body\.clipSpeech/.test(compose))
checa('compose: o montador recebe segundos e início de fala só com a lista original de clipes (o encaixe do Kineo 1 muda a lista → null)', compose.includes('        clipSeconds: composeClipUrls === clipUrls ? signedClipPlan?.seconds ?? null : null,') && compose.includes('        clipSpeech: composeClipUrls === clipUrls && signedClipPlan?.wordStarts ? { narrationWords: signedClipPlan.narrationWords, wordStarts: signedClipPlan.wordStarts } : null,'))
const cron = rd('app/api/cron/finish-stranded-renders/route.ts')
checa('cron de resgate: segue mandando só as URLs; o plano vem do claim dentro do compose (nenhum campo novo no corpo)', !cron.includes('clip_seconds') && !cron.includes('clip_word_starts') && cron.includes("import { POST as composePost } from '@/app/api/compose/route'"))
const retry = rd('app/api/retry-hollywood-scene/route.ts')
checa('retomada de cena clássica: reenvia o payload assinado (scene_fal_inputs, com duration "5") sem reescrever a duração', retry.includes('scene_fal_inputs') && !/duration\s*:\s*['"]10['"]/.test(retry))

// ═══ (f) ensaio de $0, supervisor e escritor ═══
console.log('== (f) ensaio de $0, supervisor fala×imagem, escritor ==')
const DR = roda(rd('lib/cinematic/classicDryRun.ts'))
const DRb = rdBase('lib/cinematic/classicDryRun.ts') ? roda(rdBase('lib/cinematic/classicDryRun.ts')) : null
const planoCanario = planejaCenas(rota, { engine: 'kling', narration: CANARIO, clipCount: 9, footage: 42.6 })
const cenasDry = planoCanario?.scenes ?? []
const somaCanario = cenasDry.reduce((a, c) => a + c.clipSeconds, 0)
{
  const dry = DR.classicDryRunReport({ scenes: cenasDry.map((c) => ({ voiceover: c.voiceover, prompt: 'p' })), targetSeconds: 35, secondsPerClip: 5, verbatim: true, wordsPerSecond: 2.5, sceneSeconds: cenasDry.map((c) => c.clipSeconds), clipLossSeconds: 0.16, sceneFitWordsPerSecond: 2.3, sceneFitStrict: true })
  checa(`ensaio de $0 (lib real): o Kling mostra os mesmos planos do caminho pago (${cenasDry.length} planos, ${somaCanario} s brutos, ${Math.round((somaCanario - 0.16 * cenasDry.length) * 10) / 10} s úteis), todos cabendo a própria fala → PASS`, dry.pass && dry.scenes.length === cenasDry.length && dry.footage_seconds === somaCanario && dry.footage_useful_seconds === Math.round((somaCanario - 0.16 * cenasDry.length) * 10) / 10 && dry.scenes.every((s) => s.fits_plan === true))
}
if (DRb) {
  const entradaDry = { scenes: [{ voiceover: 'a b c d', prompt: 'x' }, { voiceover: 'e f g', prompt: 'y' }], targetSeconds: 35, secondsPerClip: 10, verbatim: false, wordsPerSecond: 3.1 }
  checa('ensaio sem sceneSeconds (Seedance/Veo) idêntico à base; sceneSeconds de tamanho errado é ignorado', eqJ(DR.classicDryRunReport(entradaDry), DRb.classicDryRunReport(entradaDry)) && eqJ(DR.classicDryRunReport({ ...entradaDry, sceneSeconds: [5], clipLossSeconds: 0.16, sceneFitWordsPerSecond: 2.3, sceneFitStrict: true }), DRb.classicDryRunReport(entradaDry)))
}
{
  // a fatia real do ensaio: no Kling o relatório é refeito com os segundos de cada plano; fora dele é o relatório de sempre
  const ens = fatia(rota, '      const relatorioDoEnsaio = kling25ClipSeconds\n', '        : classicReport\n')
  const rodaEnsaio = (klingSecs) => roda(`export function run() {\n${ens}\n return relatorioDoEnsaio }`, {
    kling25ClipSeconds: klingSecs, scenes: cenasDry, classicScenePrompts: cenasDry.map(() => 'p'), duration: 35, verbatim: true, narrationRate: { wordsPerSecond: 2.5 },
    classicDryRunReport: DR.classicDryRunReport, classicReport: 'RELATORIO-DE-SEMPRE', KLING25_CLIP_LOSS_SECONDS: K.KLING25_CLIP_LOSS_SECONDS, kling25Passo: 2.3,
  }).run()
  const rk = ens ? rodaEnsaio(cenasDry.map((c) => c.clipSeconds)) : null
  checa('rota (fatia real do ensaio): Kling → os planos reais, imagem útil e fala × plano no passo 2,3 (verbatim reprova o que não cabe); Seedance/Veo/Sora → o relatório de sempre, intocado', Boolean(rk) && rk.pass && rk.footage_seconds === somaCanario && rk.scenes.every((s) => s.fits_plan === true) && rodaEnsaio(null) === 'RELATORIO-DE-SEMPRE')
  checa('rota: a resposta do ensaio devolve o relatório do plano real e clip_seconds, custo de clipe, imagem necessária e o passo de planejamento', rota.includes('        ...relatorioDoEnsaio,\n') && rota.includes('...(kling25ClipSeconds ? { clip_seconds: kling25ClipSeconds, clips_usd: kling25ClipsUsd(kling25ClipSeconds), footage_needed_seconds: kling25Footage, plan_words_per_second: kling25Passo } : {}),'))
}
{
  // lib pura (sem import): executada inteira, com uma chave falsa e um fetch que só registra o corpo
  const A = roda(rd('lib/cinematic/speechImageAlign.ts'), { process: { env: { OPENAI_API_KEY: 'offline-fixture' } }, setTimeout, clearTimeout, AbortController, Date })
  const corpos = []
  const fake = async (_u, init) => { corpos.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ choices: [{ message: { content: '{"scenes":[]}' } }] }) } }
  const cenas12 = Array.from({ length: 12 }, (_, i) => ({ voiceover: `line ${i}`, shot: `a shot of thing ${i}` }))
  const r1 = await A.alignShotsToSpeech({ topic: 't', scenes: cenas12 }, { fetchImpl: fake, ...K.kling25AlignBudget(12) })
  const r2 = await A.alignShotsToSpeech({ topic: 't', scenes: cenas12 }, { fetchImpl: fake })
  checa('supervisor fala×imagem (lib real): 12 cenas do Kling ganham teto de tokens proporcional; sem opção continua 1.400', Boolean(r1 && r2) && corpos.length === 2 && corpos[0].max_tokens === K.kling25AlignBudget(12).maxTokens && corpos[0].max_tokens > 1400 && corpos[1].max_tokens === 1400)
  checa('rota: o supervisor recebe o orçamento só no Kling (Seedance/Veo: segundo argumento undefined)', rota.includes('      }, wantsKling ? kling25AlignBudget(scenes.length) : undefined)'))
}
{
  const runway = rd('lib/runway.ts')
  const ast = routeAst(runway)
  const fnGen = acha(ast, (x) => ts.isFunctionDeclaration(x) && x.name?.text === 'generateScenes')
  const fnCap = acha(ast, (x) => ts.isFunctionDeclaration(x) && x.name?.text === 'shortCaptionFromVoiceover')
  const chamadas = []
  const api = roda(`${fnCap.getText(ast)}\n${fnGen.getText(ast)}\nexports.generateScenes = generateScenes`, {
    detectVisualCategory: () => undefined, LANGUAGE_NAMES: { en: 'English' }, classicVisualNegativePrompt: () => 'x', isStylizedLook: () => false, visualDescriptionDirection: () => 'y', aspectSpec: () => ({ promptFraming: '9:16' }), NO_TEXT_OBJECT_DIRECTION: 'z',
    openai: { chat: { completions: { create: async (input, opts) => { chamadas.push({ max: input.max_tokens, timeout: opts?.timeout, sistema: input.messages.find((m) => m.role === 'system')?.content ?? '' }); return { choices: [{ message: { content: JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ description: `scene ${i} description here`, voiceover: `line ${i} of the story told`, caption: 'c' }))) } }] } } } } },
  })
  // as opções do escritor montadas pelas linhas REAIS da rota (definição + ajuste do Kling)
  const linhaOpcoes = rota.match(/\n    const classicWriterOptions = \{ wordsPerScene: wordsPerSceneFor\(duration, clipCount, narrationRate\.wordsPerSecond\), language: narrationLanguage\.language \}[^\n]*\n/)?.[0] ?? ''
  // re-ancorado (revisão adversarial): o escritor recebe a média real dos planos (kling25AverageShotSeconds), não "5" fixo
  const linhaKling = rota.match(/\n    if \(wantsKling\) Object\.assign\(classicWriterOptions, \{ sceneSeconds: kling25AverageShotSeconds\(clipCount, kling25Footage\) \}, kling25WriterBudget\(clipCount\)\)\n/)?.[0] ?? ''
  const opcoesDaRota = (wantsKling, clipCount, kling25Footage) => roda(`export function run() {${linhaOpcoes}${linhaKling}\n return classicWriterOptions }`, {
    wantsKling, clipCount, kling25Footage, duration: 60, narrationRate: { wordsPerSecond: 3.1 }, narrationLanguage: { language: 'en' },
    wordsPerSceneFor: (d, n, w) => [Math.ceil((d * w) / n), Math.ceil((d * w * 1.1) / n)], kling25AverageShotSeconds: K.kling25AverageShotSeconds, kling25WriterBudget: K.kling25WriterBudget,
  }).run()
  const oK12 = opcoesDaRota(true, 12, 93), oK60 = opcoesDaRota(true, 12, 64.5), oK8 = opcoesDaRota(true, 8, 38), oS = opcoesDaRota(false, 7, 0)
  checa('rota (linhas reais): no Kling o escritor recebe a média real dos planos (8 cenas/35 s → 5; 12/60 s → 6; 12/90 s → 8) e o orçamento; Seedance/Veo recebem só wordsPerScene + language, como antes', Boolean(linhaOpcoes && linhaKling) && oK8.sceneSeconds === 5 && oK60.sceneSeconds === 6 && oK12.sceneSeconds === 8 && oK12.maxTokens === K.kling25WriterBudget(12).maxTokens && oK8.maxTokens === 1800 && eqJ(Object.keys(oS).sort(), ['language', 'wordsPerScene']))
  await api.generateScenes('An idea', 12, undefined, oK12)
  await api.generateScenes('An idea', 7, undefined, oS)
  await api.generateScenes('An idea', 8, undefined, oK8)
  const regra = (i) => chamadas[i]?.sistema.split('\n').find((l) => l.startsWith('8. "voiceover"')) ?? ''
  checa('escritor de cenas (função real): 12 cenas do Kling com teto e prazo proporcionais; opções de sempre = 1.800 tokens e 35 s', chamadas.length === 3 && chamadas[0].max === K.kling25WriterBudget(12).maxTokens && chamadas[0].timeout === 50000 && chamadas[1].max === 1800 && chamadas[1].timeout === 35000)
  checa('escritor de cenas (função real): Kling de 90 s ouve "~8-second scene", de 35 s "~5-second"; o Seedance continua "~10-second scene" (texto de sempre)', regra(0).includes('must fill its ~8-second scene when spoken') && regra(2).includes('must fill its ~5-second scene when spoken') && regra(1).includes('must fill its ~10-second scene when spoken') && !regra(1).includes('~5-second'))
}
checa('âncoras: o teto de stills FLUX por filme continua 6 (orçamento limitado; plano 7+ sai em t2v com a mesma seed)', rota.includes('      const MAX_ANCHORED_SCENES = 6\n'))

// ═══ (e) duração: o que o fundador perguntou ═══
console.log('== (e) duração: imagem vs fala ==')
{
  const linhas = []
  for (const d of [35, 60, 90]) {
    const t = tabela[d]
    const filme = d >= 60 ? Math.max(d, 61.5) : d
    const util = t.sec.reduce((a, s) => a + s - 0.16, 0)
    linhas.push(`${d}s ideia: ${t.n} planos [${t.sec.join(',')}] = ${t.soma}s (US$ ${t.usd.toFixed(2)}); antes ${clipCountForDuration(d)}×10 s = ${clipCountForDuration(d) * 10}s; sobra útil sobre o filme ≈ ${(util - Math.min(filme, 90)).toFixed(1)}s`)
  }
  const utilCanario = somaCanario - 0.16 * cenasDry.length
  linhas.push(`canário 98 palavras: ${cenasDry.length} planos [${cenasDry.map((c) => c.clipSeconds).join(',')}] = ${somaCanario}s (US$ ${K.kling25ClipsUsd(cenasDry.map((c) => c.clipSeconds)).toFixed(2)}); filme medido 37,7 s → sobra útil ${(utilCanario - 37.7).toFixed(1)}s (antes: 4 × 10 s, sobra ${(4 * 9.84 - 37.7).toFixed(1)}s)`)
  linhas.forEach((l) => console.log('   ' + l))
  // a sobra do canário é o preço do passo conservador: a voz do canário falou a 2,6 pal/s e o plano mede a 2,3 (≈ 5 s) + o
  // encaixe em frases (≈ 5 s). Teto: um plano de 10 s útil + 2 s.
  checa('a imagem útil cobre o filme sem reciclar: 35 s e 60 s no modo IA; o canário (37,7 s) no plano verbatim, sobra ≤ um plano de 10 s + 2 s', [35, 60].every((d) => { const sobra = tabela[d].sec.reduce((a, s) => a + s - 0.16, 0) - (d >= 60 ? 61.5 : d); return sobra >= 0 && sobra <= 7 }) && utilCanario - 37.7 >= 0 && utilCanario - 37.7 <= 9.84 + 2)
}

// ═══ (h) revisão adversarial: forma dos 30 filmes verbatim reais ═══
console.log('== (h) revisão adversarial: 30 filmes verbatim reais (forma e duração exata) ==')
// [id, botão, duração exata do MP4 (null = esticado a 61,5 pelo TIKTOK-61: fala a 2,45 pal/s), forma: palavras até cada
// vírgula (",") ou fim de frase (".")]. Só contagens — nenhuma palavra de cliente.
const FILMES = [
  ['962b509e', 35, 37.709, '11,7.5.2,8.7.4,2,2.7,9.2,9.9,5,9.'],
  ['80e87ff4', 60, 76.709, '4,5.2,7,5.1,2.3.6,3,6,6.7,5.3,8.7,5.2,4.7.2,6.5.5.3,5.9,5.16.2.10,10.10.8.6.'],
  ['6a31627f', 60, 65.417, '12.2,6.4.10,8.9,7.4.7,5.5.6.6,9.4.13,7.11.3,3,5.2.2.4.4.3.2,2,2,2,7,5.4.5.'],
  ['4140caed', 60, 78.417, '2,9.3,14.2,1.4,2.8.4.4,6.6,7.2,5.10.12,1.7,1.3.6.5.8,7.6.6,12.5.7.4,9.7.5.'],
  ['b9646f95', 60, 83.917, '12.3,5.2.7.7,2,11.4,8.3.4.3,8.4.3,2,10.5,6.6.5,8.1,16.1.9.10.2,4.11.15.5.'],
  ['5093864c', 60, 82.584, '10.1,13.2,8,10,1.6,4.3,3,5.7,3,2.4.5.3,9.6.2,12.8.2,3.11,11.4.9,12.9.6.7.7.5.'],
  ['1f5979f7', 60, 72.709, '4.11.3,11.6.13.5.15.6.2,4,5.5.4,10.1,11,9.6.13.12.5.5,10.'],
  ['6aefaead', 60, 77, '6,13.3.6.4.8,5.2,8,5.1,7,9.8.9,6.5.7.13,2.3.3,6.3,7.7,9.8.4.8.1,8,8.1.'],
  ['0cd18ddd', 60, 82.584, '3,15.3,5.2.3.3,5,3,7,8.7.9.5.4,16.2,3.3,1,1,1.8.4.6,4,6.4.7.6.7.3,9.14,12.1.1,2,4,5.'],
  ['5fc4781a', 60, 85.584, '2,14.1.4.5,5,5.3,5,11,8.4.4.11.2,6.9,2,4.7,10.2,3,4,4.10.2.2,2.5.5.3,5.6,6.12.9,3,6.1.6.'],
  ['a44cd5d3', 60, 87.917, '2,13.4.4,4.11.9,4,3.1,5.3.2.4,2.4.5,2,7.8,2,9.7.10,12.7.8.3.4,4,7.13,3,2.10.10.1.3.'],
  ['6ece6380', 60, 78.584, '2,8.3.3.6,2,4.11,9.5,3.1.1.6,4.2,2,2.3.1.3.6.6.2,11.3,4.7.3,9.9.3,13.1,2.5.8,4.2.5.1.6.'],
  ['579f4b2b', 35, 44.917, '4,3,2,5,11,4.3,2,1,18.5,4,4,4.12.3,7.10,3.2,5.'],
  ['630e3f64', 35, 34.292, '4,3,2,5,11,4.3,2,7.5,4,4,4.7.3,7.5,3.'],
  ['64f02e9c', 60, 90, '14,7.2,5.7,10.8.9.2,3,8.6.16.5.4.2,6.7.7.3,2.17.2,16.9.5.11.1.1.1.4.2.4.5.3,13.'],
  ['fcc534db', 60, 77.209, '11.12.10.15.2,6,11.7,7.2,7,9.14,8.11,6.10,2.1.1.1.6,9.7.12.5.'],
  ['71d70f50', 60, 77.584, '7.14,8.9,5.2,6.5.17.14.8.3,12,4.8,7.9.7.4,2.6,9.1.1.1.1,6.3.9,5.5.'],
  ['21071ced', 60, 68.709, '5.2.4,6,5.10,1,4.3,3,6,11.8,8.4,6.8.16.1,8,7,8.4,10.4.5.1,4.5.6,3.5.'],
  ['06fe798a', 60, 78.792, '9.10,6.8,9.3,9,4,6.12,5.6,10,4.7,4,6.13,6.7,1,4,4.1.1.1.7.6,11.5.'],
  ['5a668d77', 35, 52.292, '9.3,8.11.3,6,5.5.2.7.6.12.7.1.1.1.6.4.4,9.1.5.5.'],
  ['96748a2d', 35, 45.292, '4,2.5.3.2,5.6.2.1,2.3.3.5.3,2.8,7.10,5.1,3.2,1.3.4.2,4.5.5.'],
  ['a1509cf1', 35, 53.792, '8.3,2.4.6,6.3.6.12.1,3,6.1,10.4.8.10.1.1.1.10.6.10.5.'],
  ['236becc4', 35, 31.584, '3.6.10.3.4,3.3,6.3.5.6.1.1.1.4.7.3,4.5.'],
  ['f0eea4f2', 60, null, '4,7.8.7.5.9.5.7.3.2,10,10.3.5.8.3.9.5.7.3.7.5.5.5,4.2,2.'],
  ['67c683a6', 60, 82.209, '14.4,1,1,6.4,4.1.2,4,5.9.1.2,10.1.2,10.8.7.4,2,1,4.7.8.2,7.4.1.4.2.2.1.3,2.9.7.3.2.5.6.2.10.2.4.4.'],
  ['c589a6a5', 60, 75.584, '8.9.10.6,9.12.3,12.12.3.6,2,4.10.1,14.8,7,10.4.12.'],
  ['bc8aee9b', 60, 67.917, '9.5,7.13,7.7.5.10,4.8,2.14.4,9.9,8.1.1.1.8.6,6.4.6.5.5.'],
  ['ca8a4598', 60, 64.792, '2,8.3,4.1,8.6.10.1.4,1,8,1.3.7.2.1.1.3.8.2.1,10.6.6.1.1.7.2,1.1.4.5.1,1.1.2.2.4.'],
  ['69dc468e', 60, 67.084, '5.3.11.9.3,6.11,4.3,7.9,2.2,1,7.5,6.1.1.1.10.3.4.3.5.9.2.3.5.'],
  ['9bbf4917', 35, 37.917, '7.4.5,6.15.10,4.8.2.1.1.1.3,2,8,4.8.7.4.'],
]
const textoDaForma = (forma) => { const out = []; let k = 0; for (const m of forma.matchAll(/(\d+)([.,])/g)) { const n = Number(m[1]); for (let i = 0; i < n; i++) out.push(`p${k++}${i === n - 1 ? m[2] : ''}`) } return out.join(' ') }
checa('as 30 formas somam as palavras dos filmes medidos (06fe798a = 185; 962b509e = o canário, 98; 64f02e9c = 227)', FILMES.length === 30 && palavras(textoDaForma(FILMES.find((f) => f[0] === '06fe798a')[3])).length === 185 && palavras(textoDaForma(FILMES[0][3])).length === 98 && palavras(textoDaForma(FILMES.find((f) => f[0] === '64f02e9c')[3])).length === 227)
const VOZ_PERSONA = 2.55 // lib/speechRate: fable/alloy/echo/nova/shimmer a 1,0 (o passo de planejamento é min(voz, 2,3) de todo jeito)
// Um filme, de ponta a ponta, pelo código REAL: dimensionamento → divisor genérico → bloco do Kling → segundos → resposta
// assinada → alinhamento do claim → compose. Mede o que a revisão mediu: parcela da própria fala que cada plano mostra,
// desvio entre o plano entrar e a sua fala começar, e segundos de clipe repetido.
const REPROVADO = { n: 0, segundos: [], pior: 0, desvio: Infinity, reuso: Infinity, usd: Infinity, cabe: false, cenas: [] }
function filmeDePontaAPonta(forma, pedido, exato, opcoes = {}) {
  try { return filmeDePontaAPontaSemRede(forma, pedido, exato, opcoes) ?? REPROVADO } catch { return REPROVADO }
}
function filmeDePontaAPontaSemRede(forma, pedido, exato, { src = rota, libK = K, Cx = C, libVb = vb } = {}) {
  const texto = textoDaForma(forma)
  const W = palavras(texto).length
  const S = exato ?? W / 2.45
  const dim = dimensiona(src, { engine: 'kling', duration: pedido, verbatim: true, narration: texto, wps: VOZ_PERSONA }, libK)
  const plano = planejaCenas(src, { engine: 'kling', narration: texto, clipCount: dim.clipCount, footage: dim.kling25Footage, wps: VOZ_PERSONA, duration: pedido }, libVb, libK)
  if (!plano) return null
  const resp = montaResp(objResp(src), libK)(ctxResp(plano.scenes, texto))
  const n = plano.scenes.length
  const u = urls(n)
  const assinado = typeof libK.alignSignedClipPlan === 'function' ? libK.alignSignedClipPlan(resp, u, u) : { seconds: libK.alignSignedClipSeconds(resp, u, u), wordStarts: null, narrationWords: palavras(texto) }
  const source = Cx.buildCreatomateSource({ clipUrls: u, voiceoverUrl: 'x', voiceoverScript: texto, sceneCaptions: [], duration: pedido, quality: 'cinematic_kling', realAudioDuration: S, whisperWords: falaDe(texto, S), musicUrl: null, watermark: false, clipSeconds: assinado?.seconds ?? null, clipSpeech: assinado?.wordStarts ? { narrationWords: assinado.narrationWords, wordStarts: assinado.wordStarts } : null })
  // fala de cada cena no relógio do Whisper sintético (o mesmo que o compose recebeu)
  const inicios = []
  { let acc = 0; for (const c of plano.scenes) { inicios.push(acc); acc += palavras(c.voiceover).length } }
  const passo = (S - 0.5) / W
  const fala = inicios.map((k) => k * passo).concat([S])
  const tela = Array.from({ length: n }, () => [])
  const primeira = new Map()
  let reuso = 0
  for (const e of trechosDe(source)) { const j = u.indexOf(e.source); const t0 = e.time, t1 = e.time + e.duration - OVERLAP; if (primeira.has(j)) reuso += t1 - t0; else primeira.set(j, t0); tela[j].push([t0, t1]) }
  let pior = 1, desvio = 0
  for (let j = 0; j < n; j++) {
    let ov = 0
    for (const [t0, t1] of tela[j]) ov += Math.max(0, Math.min(t1, fala[j + 1]) - Math.max(t0, fala[j]))
    pior = Math.min(pior, ov / Math.max(1e-6, fala[j + 1] - fala[j]))
    if (j > 0) desvio = Math.max(desvio, Math.abs((primeira.get(j) ?? Infinity) - fala[j]))
  }
  const segundos = plano.kling25ClipSeconds
  // o passo do próprio plano: min(voz, 2,3), ou o que cabe em 90 s quando o compose corta o filme ali (64f02e9c)
  const passoDoPlano = typeof libK.kling25PlanPace === 'function' ? libK.kling25PlanPace(VOZ_PERSONA, W) : 2.3
  return { n, segundos, pior, desvio, reuso, usd: libK.kling25ClipsUsd(segundos), cabe: cabeNoPlano(plano.scenes, segundos, passoDoPlano), total: S, texto, cenas: plano.scenes }
}
// a base de verdade (6583b709): Kling a 10 s, #442, divisor de palavras iguais, compose de sempre
function filmeDaBase(forma, pedido, exato) {
  if (!rotaBase || !vbBase || !Cb) return null
  const texto = textoDaForma(forma)
  const W = palavras(texto).length
  const S = exato ?? W / 2.45
  const n = dimensiona(rotaBase, { engine: 'kling', duration: pedido, verbatim: true, narration: texto, wps: VOZ_PERSONA }).clipCount
  const u = urls(n)
  const source = Cb.buildCreatomateSource({ clipUrls: u, voiceoverUrl: 'x', voiceoverScript: texto, sceneCaptions: [], duration: pedido, quality: 'cinematic_kling', realAudioDuration: S, whisperWords: falaDe(texto, S), musicUrl: null, watermark: false })
  const vistos = new Set()
  let reuso = 0
  for (const e of trechosDe(source)) { const j = u.indexOf(e.source); if (vistos.has(j)) reuso += e.duration - OVERLAP; else vistos.add(j) }
  return { n, reuso, usd: Math.round(n * 10 * 0.07 * 100) / 100 }
}
const medidos = FILMES.map(([id, pedido, exato, forma]) => ({ id, ...filmeDePontaAPonta(forma, pedido, exato), base: filmeDaBase(forma, pedido, exato) }))
for (const m of medidos) console.log(`   ${m.id}: ${m.n} planos [${m.segundos.join(',')}] US$ ${m.usd.toFixed(2)}${m.base ? ` (base ${m.base.n}×10 US$ ${m.base.usd.toFixed(2)}, reuso ${m.base.reuso.toFixed(1)}s)` : ''} · pior plano ${(100 * m.pior).toFixed(0)}% da própria fala · desvio ${m.desvio.toFixed(2)}s · reuso ${m.reuso.toFixed(1)}s`)
// (h1) defeito 1 — a imagem acompanha a própria frase
const d06 = medidos.find((m) => m.id === '06fe798a')
checa(`(h1) 06fe798a (185 palavras, 78,8 s): todo plano mostra ≥ 75 % da própria fala e entra a ≤ 0,5 s dela (a 1ª versão: 5 de 12 abaixo de 25 %, desvio 7,9 s) — agora pior ${(100 * d06.pior).toFixed(0)}%, desvio ${d06.desvio.toFixed(2)} s`, d06.pior >= 0.75 && d06.desvio <= 0.5)
checa(`(h1) 30 filmes reais: nenhum plano mostra menos de 25 % da própria fala (a 1ª versão: 12 de 30 filmes na revisão; 14 nesta medição, seção h5) — pior caso ${(100 * Math.min(...medidos.map((m) => m.pior))).toFixed(0)}%`, medidos.every((m) => m.pior >= 0.25))
checa(`(h1) 30 filmes reais: desvio máximo entre o plano entrar e a sua fala começar ≤ 2 s, mesmo nas vozes mais lentas que a régua (c589a6a5 a 2,14 pal/s) — pior ${Math.max(...medidos.map((m) => m.desvio)).toFixed(2)} s`, medidos.every((m) => m.desvio <= 2))
checa('(h1) 30 filmes reais: cada plano cabe a própria fala no passo de planejamento (palavras ÷ 2,3 ≤ segundos − 0,16; no roteiro cortado em 90 s, o passo que cabe em 90 s)', medidos.every((m) => m.cabe))
// (h2) defeito 2 — repetição
if (medidos.every((m) => m.base)) {
  const novosReusos = medidos.filter((m) => m.reuso > 0.01 && m.base.reuso <= 0.01).map((m) => m.id)
  checa(`(h2) nenhum filme repete plano onde a base não repetia (a 1ª versão repetia no 579f4b2b, 1,44 s) — ${novosReusos.length ? novosReusos.join(', ') : 'nenhum'}`, novosReusos.length === 0)
  const rNovo = medidos.reduce((a, m) => a + m.reuso, 0), rBase = medidos.reduce((a, m) => a + m.base.reuso, 0)
  checa(`(h2) repetição total nos 30 filmes cai: ${rBase.toFixed(1)} s na base → ${rNovo.toFixed(1)} s (só onde a voz fala mais devagar que 2,3 pal/s)`, rNovo < rBase / 10)
  const d579 = medidos.find((m) => m.id === '579f4b2b')
  checa(`(h2) 579f4b2b (112 palavras, 44,9 s): zero repetição (a 1ª versão planejava 9 × 5 s = 43,56 s úteis e voltava ao clip-1)`, d579.reuso <= 0.01)
  // (h3) defeito 3 — custo declarado, com teto
  const uNovo = medidos.reduce((a, m) => a + m.usd, 0), uBase = medidos.reduce((a, m) => a + m.base.usd, 0)
  const deltas = medidos.map((m) => Math.round((m.usd - m.base.usd) * 100) / 100)
  console.log(`   custo de clipe nos 30 filmes: base US$ ${uBase.toFixed(2)} → US$ ${uNovo.toFixed(2)} (+US$ ${((uNovo - uBase) / medidos.length).toFixed(2)} por filme; faixa ${Math.min(...deltas).toFixed(2)} a +${Math.max(...deltas).toFixed(2)})`)
  // re-ancorado ([TRAVA 8.2] KLING25-60S-TETO, 28/09) — medido nos mesmos 30 filmes: teto 12 = +US$ 0,54/filme (máx +1,05);
  // teto 12-18 sem folga = +0,71 (máx +1,40) e c589a6a5 (voz a 2,14 pal/s) atrasava 3,1 s; teto 12-18 com a folga de 0,3 s
  // no bloco de 5 s = +0,94 (máx +1,75) e o pior atraso volta a 0,43 s. O preço continua DECLARADO e com teto; o que se
  // compra com ele é o pedido do fundador (mais variedade) sem a imagem correr na frente da voz.
  checa(`(h3) o preço da sincronia fica declarado e com teto: média ≤ +US$ 1,00 por filme e nenhum filme acima de +US$ 1,75 contra a base (medido: +US$ ${((uNovo - uBase) / medidos.length).toFixed(2)}, máx +${Math.max(...deltas).toFixed(2)}; com o teto 12 era +0,54/+1,05)`, (uNovo - uBase) / medidos.length <= 1.0 && Math.max(...deltas) <= 1.75 + 1e-9)
  const d64 = medidos.find((m) => m.id === '64f02e9c')
  checa(`(h3) 64f02e9c (60 s, 227 palavras, filme cortado em 90 s): o passo sobe para caber em 90 s — ${d64.segundos.reduce((a, b) => a + b, 0)} s de imagem (US$ ${d64.usd.toFixed(2)}, base US$ ${d64.base.usd.toFixed(2)}), nunca 227 ÷ 2,3 = 98,7 s de fala (teto 12: 100 s; 12-18 com folga: 105 s = 21 unidades de 5 s)`, d64.segundos.reduce((a, b) => a + b, 0) <= 105 && d64.segundos.reduce((a, s) => a + s - 0.16, 0) >= 90)
}
// (h4) o ensaio de $0 aponta o defeito que a revisão achou (o da 1ª versão dava PASS no 06fe798a)
{
  const cenas = d06.cenas.map((c) => ({ voiceover: c.voiceover, prompt: 'p' }))
  const ok06 = DR.classicDryRunReport({ scenes: cenas, targetSeconds: 60, secondsPerClip: 5, verbatim: true, wordsPerSecond: VOZ_PERSONA, sceneSeconds: d06.segundos, clipLossSeconds: 0.16, sceneFitWordsPerSecond: 2.3, sceneFitStrict: true })
  const umDe15 = [{ voiceover: Array.from({ length: 15 }, (_, i) => `w${i}`).join(' ') + '.', prompt: 'p' }, { voiceover: 'a b c d e f g h.', prompt: 'p' }]
  const reprova = DR.classicDryRunReport({ scenes: umDe15, targetSeconds: 7, secondsPerClip: 5, verbatim: true, wordsPerSecond: 3.1, sceneSeconds: [5, 5], clipLossSeconds: 0.16, sceneFitWordsPerSecond: 2.3, sceneFitStrict: true })
  const avisaIA = DR.classicDryRunReport({ scenes: umDe15, targetSeconds: 7, secondsPerClip: 5, verbatim: false, wordsPerSecond: 3.1, sceneSeconds: [5, 5], clipLossSeconds: 0.16, sceneFitWordsPerSecond: 2.3, sceneFitStrict: false })
  checa('(h4) ensaio de $0: o plano novo do 06fe798a passa, e uma cena de 15 palavras num plano de 5 s REPROVA no verbatim ("fala maior que o plano") — no modo IA só avisa', ok06.pass && !reprova.pass && reprova.problems.some((p) => p.includes('fala maior que o plano')) && avisaIA.pass && (avisaIA.notes ?? []).some((p) => p.includes('fala maior que o plano')))
  const curta = DR.classicDryRunReport({ scenes: Array.from({ length: 8 }, () => ({ voiceover: 'a b c d e f g h i j', prompt: 'p' })), targetSeconds: 35, secondsPerClip: 5, verbatim: false, wordsPerSecond: 2.05, sceneSeconds: new Array(8).fill(5), clipLossSeconds: 0.16 })
  checa('(h4) ensaio de $0: a cobertura se mede pelo ÚTIL — 8 × 5 s = 38,72 s úteis para 39 s de fala reprova (a 1ª versão comparava os 40 s brutos)', !curta.pass && curta.footage_useful_seconds === 38.7 && curta.footage_seconds === 40 && curta.problems.some((p) => p.includes('úteis')))
}

// (h5) A 1ª versão (2a28b39d), quando o objeto existe neste clone (o reflog de quem fez a emenda o guarda): as MESMAS
// medições da seção (h), rodadas no código dela, ficam vermelhas. Em clone sem o objeto a prova permanente de que as
// medições mordem são os mutantes (g), que devolvem cada peça antiga.
{
  const PRIMEIRA = '2a28b39de5fa5ac84e08bb4ab979020956eb04bf'
  let tem = false
  try { execFileSync('git', ['cat-file', '-e', `${PRIMEIRA}^{commit}`], { cwd: RAIZ, stdio: 'ignore' }); tem = true } catch { /* sem o objeto */ }
  if (!tem) console.log('   (h5) 1ª versão ausente neste clone — a prova de que as medições mordem fica com os mutantes (g)')
  else {
    const show = (arq) => execFileSync('git', ['show', `${PRIMEIRA}:${arq}`], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n')
    const src1 = show(ROTA), K1 = roda(show('lib/cinematic/klingShots.ts')), vb1 = roda(show('lib/cinematic/verbatimBeats.ts')), C1 = compoe(show('lib/compose.ts')), DR1 = roda(show('lib/cinematic/classicDryRun.ts'))
    const v1 = FILMES.map(([id, pedido, exato, forma]) => ({ id, ...filmeDePontaAPonta(forma, pedido, exato, { src: src1, libK: K1, libVb: vb1, Cx: C1 }) }))
    const v06 = v1.find((m) => m.id === '06fe798a')
    const abaixo25 = v1.filter((m) => m.pior < 0.25).map((m) => m.id)
    const rodou = v1.filter((m) => m.n > 0).length
    checa(`(h5) a 1ª versão (rodou em ${rodou}/30 filmes) reprova nas medições (h1): ${abaixo25.length} filme(s) com plano abaixo de 25 % da própria fala (${abaixo25.slice(0, 4).join(', ')}…), 06fe798a com desvio de ${v06.desvio.toFixed(1)} s e plano que não cabe a fala`, rodou === 30 && abaixo25.length > 0 && !(v06.pior >= 0.75 && v06.desvio <= 0.5) && !v1.every((m) => m.cabe))
    if (medidos.every((m) => m.base)) {
      const novos1 = v1.filter((m, i) => m.reuso > 0.01 && medidos[i].base.reuso <= 0.01).map((m) => m.id)
      checa(`(h5) a 1ª versão reprova na (h2): repete plano onde a base não repetia (${novos1.join(', ') || 'nenhum'})`, novos1.length > 0)
    }
    const umDe15 = [{ voiceover: Array.from({ length: 15 }, (_, i) => `w${i}`).join(' ') + '.', prompt: 'p' }, { voiceover: 'a b c d e f g h.', prompt: 'p' }]
    const passa15 = DR1.classicDryRunReport({ scenes: umDe15, targetSeconds: 7, secondsPerClip: 5, verbatim: true, wordsPerSecond: 3.1, sceneSeconds: [5, 5], clipLossSeconds: 0.16, sceneFitWordsPerSecond: 2.3, sceneFitStrict: true }).pass
    const passaBruto = DR1.classicDryRunReport({ scenes: Array.from({ length: 8 }, () => ({ voiceover: 'a b c d e f g h i j', prompt: 'p' })), targetSeconds: 35, secondsPerClip: 5, verbatim: false, wordsPerSecond: 2.05, sceneSeconds: new Array(8).fill(5), clipLossSeconds: 0.16 }).pass
    checa('(h5) o ensaio da 1ª versão deixa passar a cena de 15 palavras em 5 s e mede a imagem bruta — as duas coisas que a (h4) reprova', passa15 && passaBruto)
  }
}

// ═══ (g) mutantes ═══
console.log('== (g) mutantes: cada peça desfeita derruba a verificação que a protege ==')
const troca = (src, a, b) => { if (!src.includes(a)) throw new Error('âncora de mutante sumiu: ' + a.slice(0, 60)); return src.split(a).join(b) }
{
  const m = troca(rota, "duration: typeof seconds === 'number' && seconds > 0 && seconds <= 5 ? '5' : '10'", "duration: '10'")
  checa('mutante: builder volta ao "10" fixo → verificação do builder falha', !builderKlingOk(montaBuilder(m)))
}
{
  const m = troca(rota, 'buildFalInput(m, promptForAttempt, hd, false, scene.clipSeconds,', 'buildFalInput(m, promptForAttempt, hd, false, undefined,')
  checa('mutante: despacho sem os segundos da cena → verificação do despacho falha', !(await despachoOk(m)))
}
{
  const m = troca(rota, '      clipCount = planos\n', '')
  checa('mutante: dimensionamento sem aplicar os planos → verificação da contagem falha', !dimOk(m))
}
{
  const m = troca(rota, "...(scenes.some((s) => typeof s.clipSeconds === 'number') ? { clip_seconds: scenes.map((s) => s.clipSeconds ?? null), clip_word_starts: kling25SceneWordStarts(voiceoverScript, scenes.map((s) => s.voiceover)) } : {}),", 'clip_seconds: scenes.map((s) => s.clipSeconds ?? null), clip_word_starts: kling25SceneWordStarts(voiceoverScript, scenes.map((s) => s.voiceover)),')
  checa('mutante: clip_seconds/clip_word_starts incondicionais → a verificação "ausente em Seedance" falha', !respostaOk(m))
}
{
  const m = roda(troca(libSrc, '.sort((a, b) => words[b] - words[a] || rank[a] - rank[b])', '.sort((a, b) => words[a] - words[b] || rank[a] - rank[b])'))
  checa('mutante: planos de 10 s para as cenas com MENOS fala → verificação falha', !maisFala(m))
}
{
  const m = roda(troca(libSrc, 'if (!Array.isArray(raw) || raw.length !== authorizedUrls.length) return null', 'if (!Array.isArray(raw)) return null'))
  checa('mutante: alinhamento sem conferir o tamanho → verificação falha', !alinhaOk(m))
}
{
  const m = roda(troca(libSrc, '(i === 0 || (x as number) >= (raw[i - 1] as number))', 'true'))
  checa('mutante: início de fala decrescente aceito → verificação do alinhamento do plano falha', !alinhaPlanoOk(m))
}
// A 1ª versão, de volta, peça por peça — cada verificação da seção (h) fica vermelha
const composeSrc = rd('lib/compose.ts')
const mutarCompose = (a, b) => compoe(troca(composeSrc, a, b))
{
  // (h1) compose da 1ª versão: nível d'água cego à cena (sem âncoras)
  const semAncora = mutarCompose('      anchors: ancorasDaFala,\n', '      anchors: null,\n')
  const m06 = filmeDePontaAPonta(FILMES.find((f) => f[0] === '06fe798a')[3], 60, 78.792, { Cx: semAncora })
  const mTodos = FILMES.map(([, p, e, f]) => filmeDePontaAPonta(f, p, e, { Cx: semAncora }))
  checa(`mutante (h1): compose sem o início da fala (o corte por nível d'água da 1ª versão) → o 06fe798a volta a desviar (${m06.desvio.toFixed(1)} s, pior plano ${(100 * m06.pior).toFixed(0)}%) e a verificação dos 30 filmes fica vermelha`, !(m06.pior >= 0.75 && m06.desvio <= 0.5) && !mTodos.every((m) => m.desvio <= 2))
}
{
  // (h1) planejador sem a regra "cada plano cabe a sua fala" (5 s para qualquer bloco, como a 1ª versão)
  const semCaber = roda(troca(libSrc, '    const shots = len <= fitShort ? 1 : 2\n', '    const shots = 1\n').split("fitFirst: true, fitWords: fitShort })").join('fitFirst: false })'))
  const m06 = filmeDePontaAPonta(FILMES.find((f) => f[0] === '06fe798a')[3], 60, 78.792, { libK: semCaber })
  checa(`mutante (h1): planejador sem "cada plano cabe a sua fala" → o canário e o 06fe798a ficam vermelhos (plano de 5 s com ${Math.max(...m06.cenas.map((c) => palavras(c.voiceover).length))} palavras)`, !canarioOk(rota, semCaber) && !m06.cabe)
}
{
  // (h1) resposta assinada da 1ª versão: sem clip_word_starts → o compose não sabe onde cada fala começa
  const m = troca(rota, ', clip_word_starts: kling25SceneWordStarts(voiceoverScript, scenes.map((s) => s.voiceover)) } : {}),', ' } : {}),')
  const m06 = filmeDePontaAPonta(FILMES.find((f) => f[0] === '06fe798a')[3], 60, 78.792, { src: m })
  checa(`mutante (h1): claim sem clip_word_starts → o 06fe798a perde a sincronia (desvio ${m06.desvio.toFixed(1)} s) e a verificação da resposta falha`, !respostaOk(m) && !(m06.desvio <= 0.5))
}
{
  // (h2) a régua de 2,5 pal/s da 1ª versão no lugar do passo de 2,3 → planos que não cabem / repetição
  const m = roda(troca(libSrc, 'export const KLING25_PLAN_WPS = 2.3\n', 'export const KLING25_PLAN_WPS = 2.5\n'))
  const mTodos = FILMES.map(([id, p, e, f]) => ({ id, ...filmeDePontaAPonta(f, p, e, { libK: m }) }))
  checa('mutante (h2): passo de planejamento de volta a 2,5 pal/s → algum filme real sai com plano que não cabe a fala a 2,3 ou com desvio > 2 s', !mTodos.every((x) => x.cabe && x.desvio <= 2))
}
{
  // (h4) ensaio sem a régua fala × plano (a 1ª versão) e sem o útil
  const drSrc = rd('lib/cinematic/classicDryRun.ts')
  const semCaber = roda(troca(drSrc, '    if (input.sceneFitStrict) problems.push(txt)\n', '    if (false) problems.push(txt)\n'))
  const umDe15 = [{ voiceover: Array.from({ length: 15 }, (_, i) => `w${i}`).join(' ') + '.', prompt: 'p' }, { voiceover: 'a b c d e f g h.', prompt: 'p' }]
  checa('mutante (h4): ensaio sem reprovar a fala maior que o plano → a cena de 15 palavras em 5 s volta a passar', semCaber.classicDryRunReport({ scenes: umDe15, targetSeconds: 7, secondsPerClip: 5, verbatim: true, wordsPerSecond: 3.1, sceneSeconds: [5, 5], clipLossSeconds: 0.16, sceneFitWordsPerSecond: 2.3, sceneFitStrict: true }).pass)
  const bruto = roda(troca(drSrc, '  if (!input.elasticFootage && scenes.length > 0 && footageUseful < speechSeconds) {', '  if (!input.elasticFootage && scenes.length > 0 && footageTotal < speechSeconds) {'))
  checa('mutante (h4): ensaio medindo a imagem bruta → 8 × 5 s para 39 s de fala volta a passar', bruto.classicDryRunReport({ scenes: Array.from({ length: 8 }, () => ({ voiceover: 'a b c d e f g h i j', prompt: 'p' })), targetSeconds: 35, secondsPerClip: 5, verbatim: false, wordsPerSecond: 2.05, sceneSeconds: new Array(8).fill(5), clipLossSeconds: 0.16 }).pass)
}
{
  const semTeto = mutarCompose('  const caps = input.clipSeconds.map((s) => Math.max(0.5, floor3(s - trim - overlap)))\n', '  const caps = input.clipSeconds.map(() => 10)\n')
  checa('mutante: linha do tempo sem o comprimento real do clipe (teto 10 para todos) → canário e aleatórios ficam vermelhos', !canarioCompose(semTeto).ok && aleatoriosCompose(semTeto, 120).length > 0)
  const semRamo = mutarCompose('  } else if (signedClipSeconds) {\n', '  } else if (false && signedClipSeconds) {\n')
  checa('mutante: montador ignora os segundos assinados → o canário volta a esticar plano além de 5 s', !canarioCompose(semRamo).ok)
  const semReuso = mutarCompose('  while (cursor < total - 0.001 && r < 400) {\n', '  while (false) {\n')
  checa('mutante: sem o reuso dentro do teto → filme com imagem curta fica com buraco preto no fim (aleatórios vermelhos)', aleatoriosCompose(semReuso, 200).length > 0)
  const semLimiteDeTras = mutarCompose('        const lo = Math.max(cursor + Math.min(MIN_LEN, caps[i]), total - suffix[i + 1])\n', '        const lo = cursor + Math.min(MIN_LEN, caps[i])\n')
  checa("mutante: linha do tempo nova sem o limite de trás (os clipes restantes cobrem o resto) → aleatórios com início de fala ficam vermelhos", aleatoriosCompose(semLimiteDeTras, 400, true).length > 0)
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
