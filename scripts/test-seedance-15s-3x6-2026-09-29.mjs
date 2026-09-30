// KINEO-SEEDANCE-15S-3X6-2026-09-29 [TRAVA 8.2 — "vai" do 3x6] — guardião do filme de 15 s no Seedance 1.5 em 3 clipes.
// Fundador, 29/09: "3x6 gostei dessa opção bora fazer". Canário real de 29/09 04:34 UTC (conta interna, verbatim de 45
// palavras): 17,8 s com 2 clipes de 10 s e a montagem REPETIU o 1º clipe nos últimos 2,9 s.
// Este guardião EXECUTA o código real (readFileSync + transpile + vm; o loader offline resolve '@/...' lendo o arquivo —
// sem rede, sem banco, sem fornecedor) e prova:
//   1. módulo puro (lib/durationByEngine): 3 clipes; segundos por clipe ∈ {6, 7, 8}, o MENOR com 3 × s ≥ fala + 3 × perda
//      (perda = KLING25_CLIP_LOSS_SECONDS, lida da lib); toda fala que a guarda de 22,5 s deixa passar cabe em 8 s; o claim
//      de 15 s do Seedance é reconhecido e nenhum outro;
//   2. custo: o crédito continua 7 (creditCostForDuration, a função que debita) e o custo de clipe cai (3 × 6 < 2 × 10);
//   3. régua do escritor (lib/scriptWriterRate, a fonte que o /api/generate-script lê): faixa 36-41 com a conta mostrada
//      (reancorado 29/09, KINEO-ROTEIRO-15S-FRASE-INTEIRA: era 41-41); todo outro par (segundos, régua, cobertura)
//      idêntico à base — Kineo 1 a 15 s incluído;
//   4. rota (fatias reais): 15 s Seedance → EXATAMENTE 3 cenas (ideia e verbatim, prosa e roteiro marcado curto); 35/60/90
//      e os outros motores intocados; o builder real da fal e o callback real do despacho mandam duration '6'|'7'|'8' no
//      i2v E no t2v de reserva; o claim assinado leva clip_seconds + clip_word_starts; a rota só GANHOU linhas (diff);
//   5. /api/compose alinha o plano assinado do Seedance 15 s (e o do Kling/Veo continuam antes, literais);
//   6. compose real (lib/compose buildCreatomateSource) nos 4 casos — 16,0 s [6,6,6]; 17,8 s [7,7,7]; 20,5 s [8,8,8]; o
//      canário 17,8 s [10,10] — nenhum reuso, ordem das cenas, trim_start + duração ≤ segundos do clipe; a montagem
//      antiga (sem o plano assinado) reproduz o defeito do canário (clipe 0 de volta no fim);
//   7. ensaio de $0 (lib/cinematic/classicDryRun, real): o teto (41) e acima dão PASS em toda persona do catálogo; o piso
//      (36) dá PASS em toda persona até a régua da casa (2,5 pal/s);
//   8. mutantes em memória, todos VERMELHOS: sem a duração explícita; de volta ao slot fixo (2 clipes / 10 s); compose
//      reciclando (sem o alinhador do Seedance; sem o ramo assinado; nível d'água que deixa sobra); 35 s no 3x6; escritor
//      sem a régua do 15 s.
// CONSERTO DAS REVISÕES (29/09): (a) montagem — a escolha do passo tinha margem zero (fala 2 % mais lenta que a estimativa
// já devolvia o clipe 0 no fim); agora a lib exige fala × banda + o décimo do compose, conta palavras FALADAS ("1986" = 4)
// e o escritor mira o que cabe em 3 × 6 s com essa folga (41); provado na montagem real com fala 3,5 % mais lenta de 30 a
// 56 palavras. (b) a rota ganhou casos de borda (41/42/45 palavras, número, voz lenta) que matam o mutante "fala − perda"
// que passava verde. (c) o mutante do escritor passa pelo MESMO predicado da checagem principal (antes: "≠ 40", que o
// original também cumpria). (d) dinheiro — o resgate de roteiro todo entre colchetes também sai em 3 blocos.
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { desfaz3x6KlingShots } from './test-support/desfaz-3x6-klingshots.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ) // o loader offline resolve '@/...' a partir do cwd
const LF = String.fromCharCode(10), CR = String.fromCharCode(13)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').split(CR + LF).join(LF)
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ✓ ' + n) } else { falhas.push(n); console.log('  ✗ FALHOU: ' + n) } }
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
const linhas = (src) => src.split(LF).map((l) => l.trimEnd())
const temLinha = (src, l) => linhas(src).includes(l)
const trocaUma = (src, a, b) => (src.split(a).length === 2 ? src.split(a).join(b) : null)

// BASE = o "antes" deste trabalho (memória "trava por diff fica verde ao mergear"): o pai do commit mais antigo
// "SEEDANCE-15S-3X6" na história de HEAD; antes do commit existir, o próprio HEAD; senão origin/main. A base escolhida
// tem de NÃO conter o marcador na rota.
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
let BASE = null
{
  const candidatos = []
  try { const shas = git(['log', '--format=%H', '--grep=SEEDANCE-15S-3X6', 'HEAD']).trim().split(LF).filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:app/api/generate-video-cinematic/route.ts`]).includes('KINEO-SEEDANCE-15S-3X6')) { BASE = ref; break } } catch { /* próximo */ }
  }
}
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)
const rdBase = (p) => { if (!BASE) return null; try { return git(['show', `${BASE}:${p}`]).split(CR + LF).join(LF) } catch { return null } }
checa('a base (15 s em 2 clipes de 10 s) está disponível para as comparações', Boolean(BASE))

const loadLib = createOfflineLoader({ mocks: { '@/lib/narration/niche-mapping': { selectPersonaForScript: () => null } } })
const DUR_SRC = rd('lib/durationByEngine.ts')
const D = roda(DUR_SRC) // módulo puro, sem import
const K = loadLib('@/lib/cinematic/klingShots')
const PERDA = K.KLING25_CLIP_LOSS_SECONDS
const ROTA = rd('app/api/generate-video-cinematic/route.ts')
const ROTA_BASE = rdBase('app/api/generate-video-cinematic/route.ts')
const COMPOSE_ROTA = rd('app/api/compose/route.ts')

// ═══ 1. módulo puro ═══
console.log('1) lib/durationByEngine: 3 clipes, segundos por clipe ∈ {6,7,8} pela fala')
checa(`3 clipes; passos [6,7,8]; perda por clipe lida de klingShots (${PERDA} s)`, D.SEEDANCE_SHORT_CLIPS === 3 && eqJ([...D.SEEDANCE_SHORT_CLIP_STEPS], [6, 7, 8]) && PERDA > 0 && PERDA < 1)
const BANDA = D.SEEDANCE_SHORT_SPEECH_BAND, DECIMO = D.SEEDANCE_SHORT_TIMELINE_ROUNDING_SECONDS
checa(`folga da escolha do passo (lida da lib): fala × ${BANDA} + ${DECIMO} s do arredondamento do compose (⌈fala × 10⌉ ÷ 10 em lib/compose)`, BANDA > 1 && BANDA <= 1.1 && DECIMO > 0 && DECIMO <= 0.1 + 1e-9 && rd('lib/compose.ts').includes('let totalDuration = clamp(Math.ceil(masterDuration * 10) / 10,'))
// capacidade de cada passo, na conta INDEPENDENTE do guardião (os números vêm da lib; a fórmula não)
const capDe = (s) => (D.SEEDANCE_SHORT_CLIPS * (s - PERDA) - DECIMO) / BANDA
function provaSegundos(M) {
  const passos = [...M.SEEDANCE_SHORT_CLIP_STEPS], n = M.SEEDANCE_SHORT_CLIPS
  const r = []
  for (let f = 0; f <= 30; f += 0.01) {
    const s = M.seedanceShortClipSeconds(f, PERDA)
    r.push(passos.includes(s))
    const cabe = capDe(s) >= f - 1e-9 && n * (s - PERDA) >= f * BANDA + DECIMO - 1e-9
    const ultimo = s === passos[passos.length - 1]
    r.push(cabe || ultimo)
    const menor = passos.indexOf(s) === 0 || capDe(passos[passos.indexOf(s) - 1]) < f - 1e-9
    r.push(menor)
  }
  // 16,4 s = 41 palavras (6 s) · 16,8 s = 42 palavras (7 s: sem folga caberia em 6 s com 0,62 s de margem) · 17,52 s
  // (a imagem útil inteira de 3 × 6 s: margem zero → 7 s) · 19,6 → 7 · 20,5 → 8 · 22,5 (o limite da guarda) → 8
  r.push(M.seedanceShortClipSeconds(16.0, PERDA) === 6, M.seedanceShortClipSeconds(16.4, PERDA) === 6, M.seedanceShortClipSeconds(16.8, PERDA) === 7, M.seedanceShortClipSeconds(17.52, PERDA) === 7, M.seedanceShortClipSeconds(17.8, PERDA) === 7, M.seedanceShortClipSeconds(19.6, PERDA) === 7, M.seedanceShortClipSeconds(20.5, PERDA) === 8, M.seedanceShortClipSeconds(22.5, PERDA) === 8)
  r.push(M.seedanceShortClipSeconds(NaN, PERDA) === 6, M.seedanceShortClipSeconds(-3, PERDA) === 6)
  return r.every(Boolean)
}
checa('seedanceShortClipSeconds (0-30 s de fala, passo 0,01): sempre ∈ {6,7,8}, cobre fala × banda + décimo + 3 × perda (ou é o 8), e é o MENOR que cobre; 16,4→6 · 16,8→7 · 17,52→7 · 19,6→7 · 20,5→8 · 22,5→8', provaSegundos(D))
const limite = 15 * D.SHORT_FILM_SPEECH_FACTOR
checa(`toda fala que a guarda de roteiro longo deixa passar (≤ ${limite} s = ${D.maxWordsForShortFilm(15)} palavras ÷ ${D.VERBATIM_EST_WORDS_PER_SECOND}) cabe em 3 × 8 s úteis COM a folga (capacidade ${capDe(8).toFixed(2)} s)`, capDe(8) >= limite && D.seedanceShortSpeechCapacity(8, PERDA) >= limite && D.seedanceShortClipSeconds(limite, PERDA) === 8)
checa('palavrasFaladas: sem número = nº de palavras; número conta pelos dígitos (até 4), +1 com % $ € £ — "In 1986, a lake killed 1,700 people. 45% died" = 17', D.palavrasFaladas('a b c') === 3 && D.palavrasFaladas('In 1986, a lake killed 1,700 people. 45% died') === 17 && D.palavrasFaladas('') === 0 && D.palavrasFaladas(null) === 0 && D.palavrasFaladas('$3 7') === 3)
checa('seedanceShortSpeechSeconds: palavras faladas ÷ a régua MAIS LENTA entre 2,5 e a voz (voz rápida ou ausente não encurta a fala)', D.seedanceShortSpeechSeconds('a '.repeat(40), 2.5) === 16 && Math.abs(D.seedanceShortSpeechSeconds('a '.repeat(40), 2.3) - 40 / 2.3) < 1e-9 && D.seedanceShortSpeechSeconds('a '.repeat(40), 3.1) === 16 && D.seedanceShortSpeechSeconds('a '.repeat(40), 0) === 16 && D.seedanceShortSpeechSeconds('a '.repeat(40), NaN) === 16)
checa('estimarFalaSegundos é a régua da guarda (palavras ÷ 2,5) e checarFalaDoFilmeCurto a usa', D.estimarFalaSegundos(palavras('a '.repeat(40)).join(' ')) === 16 && D.checarFalaDoFilmeCurto({ engine: 'seedance', seconds: 15, verbatim: true, narration: 'a '.repeat(45) }).estSeconds === 18)
const SEED_T2V = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video', SEED_I2V = 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video'
checa('isSeedanceShortClaim: duration 15 + fal_model do Seedance (t2v ou i2v) = sim; Kling, Veo, 35 s, sem claim = não', D.isSeedanceShortClaim({ duration: 15, fal_model: SEED_T2V }) && D.isSeedanceShortClaim({ duration: 15, fal_model: SEED_I2V }) && !D.isSeedanceShortClaim({ duration: 35, fal_model: SEED_T2V }) && !D.isSeedanceShortClaim({ duration: 15, fal_model: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video' }) && !D.isSeedanceShortClaim({ duration: 15, fal_model: 'fal-ai/veo3.1/fast' }) && !D.isSeedanceShortClaim(null))
{
  const L_ESCOLHA = '    if (seedanceShortSpeechCapacity(s, clipLossSeconds) >= fala - 1e-9) return s'
  const mutMaior = trocaUma(DUR_SRC, L_ESCOLHA, L_ESCOLHA.replace('return s', 'return 8'))
  checa('mutante: sempre o passo mais longo (8 s) fica VERMELHO', mutMaior !== null && !provaSegundos(roda(mutMaior)))
  const L_CAP = '  return (SEEDANCE_SHORT_CLIPS * (stepSeconds - perda) - SEEDANCE_SHORT_TIMELINE_ROUNDING_SECONDS) / SEEDANCE_SHORT_SPEECH_BAND'
  const mutSemFolga = trocaUma(DUR_SRC, L_CAP, '  return SEEDANCE_SHORT_CLIPS * stepSeconds')
  checa('mutante: sem a perda do compose nem folga (3 × s ≥ fala, o 1º rascunho) fica VERMELHO', mutSemFolga !== null && !provaSegundos(roda(mutSemFolga)))
  const mutMargemZero = trocaUma(DUR_SRC, L_CAP, '  return SEEDANCE_SHORT_CLIPS * (stepSeconds - perda)')
  checa('mutante: margem zero (3 × (s − perda) ≥ fala — o commit 234e3593, que a revisão pegou) fica VERMELHO', mutMargemZero !== null && !provaSegundos(roda(mutMargemZero)))
  const mutSemBanda = trocaUma(DUR_SRC, 'export const SEEDANCE_SHORT_SPEECH_BAND = ', 'export const SEEDANCE_SHORT_SPEECH_BAND = 1 || ')
  checa('mutante: banda 1 (só o décimo do compose) fica VERMELHO', mutSemBanda !== null && !provaSegundos(roda(mutSemBanda)))
  const mutSemDecimo = trocaUma(DUR_SRC, 'export const SEEDANCE_SHORT_TIMELINE_ROUNDING_SECONDS = ', 'export const SEEDANCE_SHORT_TIMELINE_ROUNDING_SECONDS = 0 && ')
  checa('mutante: sem o décimo do arredondamento do compose fica VERMELHO', mutSemDecimo !== null && !provaSegundos(roda(mutSemDecimo)))
}

// ═══ 2. custo ═══
console.log('2) custo: crédito inalterado (7), clipe mais barato')
const E = roda(rd('lib/credits/engineCost.ts'))
const Eb = rdBase('lib/credits/engineCost.ts') ? roda(rdBase('lib/credits/engineCost.ts')) : null
const custo15 = E.creditCostForDuration('cinematic_ai', true, 15)
checa(`o filme de 15 s continua custando 7 cr pela função que debita (lido: ${custo15}) e engineCost.ts é o da base`, custo15 === 7 && rd('lib/credits/engineCost.ts') === rdBase('lib/credits/engineCost.ts') && Eb?.creditCostForDuration('cinematic_ai', true, 15) === 7)
const USD_S = Number(/export const SEEDANCE_720P_USD_PER_SECOND = ([\d.]+)/.exec(rd('lib/fastAiClips.ts'))?.[1])
const novo = Math.round(3 * 6 * USD_S * 100) / 100, antes = Math.round(2 * 10 * USD_S * 100) / 100
checa(`custo de clipe por filme (US$ ${USD_S}/s, 720p sem áudio): 3 × 6 s = US$ ${novo.toFixed(2)} < 2 × 10 s = US$ ${antes.toFixed(2)}; teto 3 × 8 s = US$ ${(24 * USD_S).toFixed(2)}`, USD_S > 0 && novo < antes && novo === 0.47 && antes === 0.52)

// ═══ 3. régua do escritor ═══
console.log('3) régua do escritor do 15 s (lib/scriptWriterRate, lida pelo /api/generate-script)')
const W = loadLib('@/lib/scriptWriterRate')
const SR = loadLib('@/lib/speechRate')
const NF = loadLib('@/lib/narrationFit')
const PERS = loadLib('@/lib/narration/personas')
const compilaW = (src) => { const exports = {}; vm.runInNewContext(ts.transpileModule(src, { compilerOptions: { module: 1, target: 9, esModuleInterop: true } }).outputText, { exports, require: (n) => loadLib(n), console: { log() {}, warn() {}, error() {} }, Math, Number, Array, Object, JSON, Set, Map, process: { env: {} } }); return exports }
const WB = rdBase('lib/scriptWriterRate.ts') ? compilaW(rdBase('lib/scriptWriterRate.ts')) : null
const reguaSeed = W.writerRateFor('cinematic_ai', 'tema', 'en')
const minS = W.minWordsFor(15, reguaSeed.wordsPerSecond, reguaSeed.coverage), maxS = W.maxWordsFor(15, reguaSeed.wordsPerSecond, reguaSeed.coverage)
const rapida = W.fastestClassicPersonaRate('en').wordsPerSecond
const taxas = PERS.VOICE_PERSONAS.map((p) => SR.speechRateFor({ family: 'classic', language: 'en', voice: p.voice, personaSpeed: p.defaultSpeed }).wordsPerSecond)
const media = taxas.reduce((a, b) => a + b, 0) / taxas.length
console.log(`     conta: piso ⌈15 × ${NF.MIN_COVERAGE} × ${D.VERBATIM_EST_WORDS_PER_SECOND}⌉ = ${minS} (era ⌈15 × ${NF.MIN_COVERAGE} × ${rapida}⌉ = 41, piso = teto) · teto ⌊(3 × (6 − ${PERDA}) − ${DECIMO}) ÷ ${BANDA} × ${D.VERBATIM_EST_WORDS_PER_SECOND}⌋ = ${maxS} · média das personas ${media.toFixed(3)} pal/s · canário 45/17,8 = ${(45 / 17.8).toFixed(3)}`)
// o MESMO predicado serve à checagem e aos mutantes (revisão 29/09: o mutante antigo exigia só "≠ 40", que o original cumpria)
function provaEscritor(Wx) {
  const r = Wx.writerRateFor('cinematic_ai', 'tema', 'en')
  const mn = Wx.minWordsFor(15, r.wordsPerSecond, r.coverage), mx = Wx.maxWordsFor(15, r.wordsPerSecond, r.coverage)
  // reancorado 29/09 (KINEO-ROTEIRO-15S-FRASE-INTEIRA): piso = C2 na régua da casa (36), não mais na voz mais rápida (41 = teto)
  return mn === Math.ceil(15 * NF.MIN_COVERAGE * D.VERBATIM_EST_WORDS_PER_SECOND - 1e-9) && mx === Math.floor(capDe(6) * D.VERBATIM_EST_WORDS_PER_SECOND + 1e-9) && mn === 36 && mx === 41 && mn < mx
}
checa(`Seedance a 15 s: ${minS}-${maxS} palavras (~40) — era ${WB ? `${WB.minWordsFor(15, 3.1, 1)}-${WB.maxWordsFor(15, 3.1, 1)}` : '?'} na régua genérica de 3,1; o teto é o que cabe em 3 × 6 s COM a folga do planejador`, provaEscritor(W) && minS === 36 && maxS === 41)
// reancorado 29/09 (KINEO-ROTEIRO-15S-FRASE-INTEIRA): o piso agora é o C2 (≥ 14,25 s na régua da casa), não ≥ 15 s
checa(`fala a ${D.VERBATIM_EST_WORDS_PER_SECOND} pal/s: ${(minS / 2.5).toFixed(1)}-${(maxS / 2.5).toFixed(1)} s (piso C2 14,25 s → 17,2 s); no ritmo do canário: ${(minS / (45 / 17.8)).toFixed(1)}-${(maxS / (45 / 17.8)).toFixed(1)} s (o teto passa de 15 s)`, minS / 2.5 >= 15 * NF.MIN_COVERAGE && maxS / 2.5 <= 17.2 + 1e-9 && maxS / (45 / 17.8) >= 15 && maxS / (45 / 17.8) <= 17.01)
checa('a régua de 2,5 é a da casa: média do catálogo de personas a ±0,05 e o canário a ±0,05', Math.abs(media - D.VERBATIM_EST_WORDS_PER_SECOND) <= 0.05 && Math.abs(45 / 17.8 - D.VERBATIM_EST_WORDS_PER_SECOND) <= 0.05)
// reancorado 29/09 (KINEO-ROTEIRO-15S-FRASE-INTEIRA): quem passa no C2 na voz mais rápida agora é o TETO; o piso passa na régua da casa
checa('o teto cabe em 3 × 6 s (o planejador pede 6 s para 43 palavras) e passa no piso C2 na voz mais rápida; o piso passa no C2 na régua da casa (2,5)', D.seedanceShortClipSeconds(D.estimarFalaSegundos('a '.repeat(maxS)), PERDA) === 6 && maxS / rapida >= 15 * NF.MIN_COVERAGE && minS / D.VERBATIM_EST_WORDS_PER_SECOND >= 15 * NF.MIN_COVERAGE)
{
  const pares = []
  for (const s of [15, 20, 30, 35, 45, 60, 90]) for (const w of [2.3, 2.45, 2.5, 2.8, 3.1, rapida, ...taxas]) for (const c of [1, 0.95]) {
    if (s === 15 && w === 3.1 && c === 1) continue
    pares.push(W.minWordsFor(s, w, c) === WB?.minWordsFor(s, w, c) && W.maxWordsFor(s, w, c) === WB?.maxWordsFor(s, w, c))
  }
  const motores = ['fast', 'cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood', 'cinematic_h3', '', undefined]
  const reguas = motores.every((m) => eqJ(W.writerRateFor(m, 'x', 'en'), WB?.writerRateFor(m, 'x', 'en')))
  const k1 = W.writerRateFor('fast', 'x', 'en')
  checa(`todo outro par (segundos × régua × cobertura, ${pares.length} casos) e writerRateFor de 8 motores idênticos à base — Kineo 1 a 15 s segue ${W.minWordsFor(15, k1.wordsPerSecond, 1)}-${W.maxWordsFor(15, k1.wordsPerSecond, 1)}`, Boolean(WB) && pares.every(Boolean) && reguas && W.minWordsFor(15, k1.wordsPerSecond, 1) === WB.minWordsFor(15, k1.wordsPerSecond, 1))
  const W_SRC = rd('lib/scriptWriterRate.ts')
  checa('o compilador dos mutantes do escritor, sobre o arquivo SEM mutação, passa no predicado (senão o vermelho dos mutantes não prova nada)', provaEscritor(compilaW(W_SRC)))
  // Reancorado 29/09 (KINEO-RITMO-POR-IDIOMA-15S-2026-09-29, [TRAVA 8.2 — "vai conserta" do fundador]): a linha ganhou a língua do filme curto do Seedance (idiomaDoRitmo / ritmo); o que ela protege não muda.
  const mutEscritor = trocaUma(W_SRC, '  if (isSeedanceShortWriter(seconds, wordsPerSecond, coverage)) return seedanceShortWriterWords(language).min // KINEO-SEEDANCE-15S-3X6-2026-09-29 · KINEO-RITMO-POR-IDIOMA-15S' + LF, '')
  checa('mutante: escritor sem o piso do 15 s (volta a 47 palavras) fica VERMELHO pelo mesmo predicado', mutEscritor !== null && !provaEscritor(compilaW(mutEscritor)))
  const mutTeto = trocaUma(W_SRC, '  if (isSeedanceShortWriter(seconds, wordsPerSecond, coverage)) return seedanceShortWriterWords(language).max // KINEO-SEEDANCE-15S-3X6-2026-09-29 · KINEO-RITMO-POR-IDIOMA-15S' + LF, '')
  checa('mutante: escritor sem o teto do 15 s (⌊41 × 1,2⌉ = 49) fica VERMELHO pelo mesmo predicado', mutTeto !== null && !provaEscritor(compilaW(mutTeto)))
  const mutTetoSemFolga = trocaUma(W_SRC, '  const cabe = seedanceShortSpeechCapacity(SEEDANCE_SHORT_CLIP_STEPS[0], KLING25_CLIP_LOSS_SECONDS)', '  const cabe = 3 * (SEEDANCE_SHORT_CLIP_STEPS[0] - KLING25_CLIP_LOSS_SECONDS)')
  checa('mutante: teto do escritor sem a folga (o 43 de 234e3593) fica VERMELHO pelo mesmo predicado', mutTetoSemFolga !== null && !provaEscritor(compilaW(mutTetoSemFolga)))
}
// Reancorado 29/09 (junção com a E2b): "igual byte a byte à base" valia na main, onde só o 3x6 mexia; na E2b a rota do
// escritor ganhou o corte do filme curto (trava 8.2, "vai" do 15 s) e deixa de ser igual à base por OUTRO trabalho. O que
// esta checagem protege continua exigido: a rota lê a faixa da lib (fonte única), o teto dela sai de maxWordsFor, e o 3x6
// não escreveu nada na rota (nenhum marcador dele, nenhuma faixa digitada).
{
  const GS = rd('app/api/generate-script/route.ts')
  // Reancorado 29/09 (KINEO-RITMO-POR-IDIOMA-15S-2026-09-29, [TRAVA 8.2 — "vai conserta" do fundador]): a linha do teto ganhou idiomaDoRitmo
  // (a língua do filme curto do Seedance); a fonte única (min/maxWordsFor da lib) continua a mesma.
  checa('o /api/generate-script continua lendo min/maxWordsFor da lib (fonte única; a rota dele não foi tocada aqui)', GS.includes("import { minWordsFor, maxWordsFor, writerRateFor } from '@/lib/scriptWriterRate'") && GS.includes('    const tetoFilmeCurto = Math.min(maxWordsFor(alvoSegundos, regua.wordsPerSecond, regua.coverage, idiomaDoRitmo), maxWordsForShortFilm(alvoSegundos))') && !GS.includes('KINEO-SEEDANCE-15S-3X6') && !GS.includes('seedanceShortWriterWords'))
}

// ═══ 4. rota ═══
console.log('4) rota do cinematic (fatias reais)')
const routeAst = (src) => ts.createSourceFile('route.ts', src, ts.ScriptTarget.Latest, true)
function acha(ast, pred) { let f; const v = (n) => { if (!f && pred(n)) f = n; if (!f) ts.forEachChild(n, v) }; v(ast); return f }
const funcaoDe = (src, nome) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isFunctionDeclaration(x) && x.name?.text === nome); return n ? n.getText(ast) : null }
const varDe = (src, nome) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isVariableDeclaration(x) && x.name.getText(ast) === nome); return n ? `const ${nome} = ${n.initializer.getText(ast)};` : null }
// (4a) dimensionamento: linha do Veo + #442 + bloco do Kling + as 2 linhas do 3x6, na ordem da rota
const L_PRED = "    const seedanceShortFilm = duration === SEEDANCE_SHORT_SECONDS && isSeedance15(typeof body.engine === 'string' ? body.engine : null) && !wantsKling && !wantsVeo && !wantsSora"
const L_OVR = '    if (seedanceShortFilm) clipCount = SEEDANCE_SHORT_CLIPS'
checa('as duas linhas do 3x6 existem inteiras e em sequência, depois do bloco do Kling e antes do escritor de cenas', temLinha(ROTA, L_PRED) && linhas(ROTA).indexOf(L_PRED) + 1 === linhas(ROTA).indexOf(L_OVR) && ROTA.indexOf('    let kling25Footage = 0') < ROTA.indexOf(L_PRED) && ROTA.indexOf(L_OVR) < ROTA.indexOf('    const classicWriterOptions = {'))
const veoLinha = (src) => { const m = src.match(/\n    if \(wantsVeo\) clipCount = Math\.max\(clipCount, Math\.min\(12, Math\.ceil\(duration \/ 8\) \+ 1\)\)\n/); return m ? m[0] : null }
const bloco442 = (src) => { const ast = routeAst(src); const n = acha(ast, (x) => ts.isIfStatement(x) && x.expression.getText(ast) === 'verbatim' && x.getText(ast).includes('SECONDS_PER_CLIP')); return n ? n.getText(ast) : null }
const blocoKlingDim = (src) => fatia(src, '    let kling25Footage = 0\n', '\n    }\n', true)
const clipCountForDuration = roda(`${funcaoDe(ROTA, 'clipCountForDuration')}\nObject.assign(exports, { clipCountForDuration })`).clipCountForDuration
function dimensiona(src, { engine, duration, verbatim = false, narration = '' }, comO3x6 = true) {
  const partes = [veoLinha(src), bloco442(src), blocoKlingDim(src)]
  if (partes.some((p) => !p)) return null
  const pred = linhas(src).find((l) => l.startsWith('    const seedanceShortFilm = '))
  const ovr = linhas(src).find((l) => l.startsWith('    if (seedanceShortFilm) clipCount = '))
  const tresXseis = comO3x6 ? `${pred ?? 'const seedanceShortFilm = false'}\n${ovr ?? ''}` : 'const seedanceShortFilm = false'
  return roda(`export function run() { let clipCount = clipCountForDuration(duration)\n${partes.join('\n')}\n${tresXseis}\n return { clipCount, seedanceShortFilm } }`, {
    clipCountForDuration, duration, verbatim, body: { engine }, parsedScript: { narration, segments: [] }, wantsKling: engine === 'kling', wantsVeo: engine === 'veo', wantsSora: engine === 'sora',
    narrationRate: { wordsPerSecond: 2.5 }, kling25FootageNeeded: K.kling25FootageNeeded, kling25ShotCount: K.kling25ShotCount,
    SEEDANCE_SHORT_SECONDS: D.SEEDANCE_SHORT_SECONDS, SEEDANCE_SHORT_CLIPS: D.SEEDANCE_SHORT_CLIPS, isSeedance15: D.isSeedance15,
  }).run()
}
const T40 = 'a '.repeat(40).trim(), T56 = 'a '.repeat(56).trim(), T12 = 'a '.repeat(12).trim()
function provaDimensao(src) {
  const r = []
  for (const engine of ['seedance', 'cinematic_ai', undefined]) for (const [verbatim, narration] of [[false, ''], [true, T40], [true, T56], [true, T12]]) {
    const d = dimensiona(src, { engine, duration: 15, verbatim, narration })
    r.push(d?.clipCount === 3 && d.seedanceShortFilm === true)
  }
  // 35/60/90 e todo outro motor: a contagem é a de sem o 3x6, e o 3x6 não liga
  for (const engine of ['seedance', 'kling', 'veo', 'sora', 'hollywood', 'h3', 'omni', 's25', undefined]) for (const duration of [35, 45, 60, 90]) for (const [verbatim, narration] of [[false, ''], [true, T56 + ' ' + T56 + ' ' + T56]]) {
    const com = dimensiona(src, { engine, duration, verbatim, narration }), sem = dimensiona(src, { engine, duration, verbatim, narration }, false)
    r.push(com?.clipCount === sem?.clipCount && com.seedanceShortFilm === false)
  }
  for (const engine of ['kling', 'veo', 'sora', 'hollywood', 'h3', 'omni', 's25']) r.push(dimensiona(src, { engine, duration: 15 })?.seedanceShortFilm === false)
  return r.every(Boolean)
}
checa('15 s Seedance → 3 cenas (ideia; verbatim de 12, 40 e 56 palavras); 35/45/60/90 em 9 motores = a contagem sem o 3x6; 15 s em outro motor não liga o 3x6', provaDimensao(ROTA))
checa('base: o 15 s do Seedance pedia 2 clipes (ideia e 40 palavras) — o "antes" medido pelo mesmo código', ROTA_BASE && dimensiona(ROTA_BASE, { engine: 'seedance', duration: 15 }, false)?.clipCount === 2 && dimensiona(ROTA_BASE, { engine: 'seedance', duration: 15, verbatim: true, narration: T40 }, false)?.clipCount === 2)
{
  const mut35 = trocaUma(ROTA, L_PRED, L_PRED.replace('duration === SEEDANCE_SHORT_SECONDS', 'duration <= 35'))
  checa('mutante: o 3x6 vazando para 35 s fica VERMELHO', mut35 !== null && !provaDimensao(mut35))
  const mutSlot = trocaUma(ROTA, L_OVR + LF, '')
  checa('mutante "de volta ao slot fixo" (sem a troca para 3 clipes: ⌈15/9⌉ = 2) fica VERMELHO', mutSlot !== null && !provaDimensao(mutSlot))
}
// (4b) roteiro marcado curto (HOOK + PAYOFF) também sai em 3 cenas; prosa já sai em 3 do divisor de sempre
const VB = loadLib('@/lib/cinematic/verbatimBeats')
const blocoMarcado = fatia(ROTA, '    if (seedanceShortFilm && verbatim && scenes.length > 0 && scenes.length < SEEDANCE_SHORT_CLIPS && parsedScript.narration) {\n', '        clipCount = scenes.length\n      }\n    }\n')
function marcado(parsed, count, bloco = blocoMarcado) {
  return roda(`export function run() { let clipCount = ${count}\n let scenes = resolveVerbatimSegments(parsedScript, clipCount).map((seg) => ({ description: seg.pexelsQuery, voiceover: seg.voiceover, caption: seg.voiceover, stockSearchQuery: seg.pexelsQuery }))\n${bloco ?? ''}\n return { scenes, clipCount } }`, {
    resolveVerbatimSegments: VB.resolveVerbatimSegments, parsedScript: parsed, verbatim: true, seedanceShortFilm: true, SEEDANCE_SHORT_CLIPS: 3, shortCaptionFromVoiceover: (t) => t,
  }).run()
}
{
  const narr = 'The ocean hides a river. It flows along the seabed for miles. Divers have swum right over it. Nobody knew it was there until sonar found it.'
  const m = marcado({ segments: [{ voiceover: 'The ocean hides a river. It flows along the seabed for miles.', pexelsQuery: 'river' }, { voiceover: 'Divers have swum right over it. Nobody knew it was there until sonar found it.', pexelsQuery: 'sonar' }], narration: narr }, 3)
  const p = marcado({ segments: [], narration: narr }, 3)
  checa('roteiro marcado com 2 blocos → 3 cenas que somam a narração palavra por palavra; prosa → 3 cenas do divisor de sempre', Boolean(blocoMarcado) && m.scenes.length === 3 && m.clipCount === 3 && m.scenes.map((s) => s.voiceover).join(' ') === narr && p.scenes.length === 3 && p.scenes.map((s) => s.voiceover).join(' ') === narr)
}
// (4c) segundos por clipe: o bloco real da rota
const blocoSegundos = fatia(ROTA, '    let seedanceClipSeconds: number[] | null = null\n', 'palavras)`)\n    }\n')
function segundosDaRota(bloco, { seedanceShortFilm = true, verbatim = true, narration, scenes, wps = 2.5 }, M = D) {
  return roda(`export function run() { let scenes = ctxScenes\n${bloco}\n return { scenes, seedanceClipSeconds } }`, {
    ctxScenes: scenes, seedanceShortFilm, verbatim, parsedScript: { narration }, narrationRate: { wordsPerSecond: wps },
    seedanceShortSpeechSeconds: M.seedanceShortSpeechSeconds, seedanceShortClipSeconds: M.seedanceShortClipSeconds, KLING25_CLIP_LOSS_SECONDS: PERDA, SEEDANCE_SHORT_CLIPS: 3, SEEDANCE_720P_USD_PER_SECOND: USD_S,
  }).run()
}
const POOL = 'In Death Valley the rocks move on their own and leave long trails across the cracked mud of a dry lake bed. For decades nobody ever saw a single one move, and the theories blamed wind, algae and pranksters. Then scientists fitted rocks with GPS trackers and finally caught them sliding on thin sheets of ice after a rare winter rain, pushed by a light breeze.'
const textoN = (n) => { const w = palavras(POOL).slice(0, n); if (w.length !== n) throw new Error('POOL curto'); w[n - 1] = w[n - 1].replace(/[,.]$/, '') + '.'; return w.join(' ') }
const tres = (t) => VB.resolveVerbatimSegments({ segments: [], narration: t }, 3).map((s) => ({ description: s.pexelsQuery, voiceover: s.voiceover, caption: s.voiceover }))
function provaSegundosDaRota(bloco, M = D) {
  if (!bloco) return false
  const t40 = textoN(40), t41 = textoN(41), t42 = textoN(42), t43 = textoN(43), t45 = textoN(45), t56 = textoN(56)
  const tAno = ['1986,', ...palavras(t40).slice(1)].join(' ') // 40 palavras escritas, 43 faladas ("1986" = 4)
  const caso = (narration, wps = 2.5) => segundosDaRota(bloco, { narration, scenes: tres(narration), wps }, M).seedanceClipSeconds
  const a = segundosDaRota(bloco, { narration: t40, scenes: tres(t40) }, M)
  const ia = segundosDaRota(bloco, { verbatim: false, narration: '', scenes: tres(t40) }, M)
  const fora = segundosDaRota(bloco, { seedanceShortFilm: false, narration: t40, scenes: tres(t40) }, M)
  return palavras(t40).length === 40 && palavras(t43).length === 43 && palavras(t56).length === 56 && palavras(tAno).length === 40 &&
    eqJ(a.seedanceClipSeconds, [6, 6, 6]) && a.scenes.every((s) => s.clipSeconds === 6) &&
    eqJ(caso(t41), [6, 6, 6]) && // 41 palavras (o teto do escritor): 16,4 s × 1,04 + 0,1 = 17,16 ≤ 17,52 úteis
    eqJ(caso(t42), [7, 7, 7]) && // 42 palavras: 16,8 × 1,04 + 0,1 = 17,57 > 17,52 — sem folga cairia em 6 s com margem de 0,72 s
    eqJ(caso(t45), [7, 7, 7]) && // o tamanho do canário de 04:34 UTC
    eqJ(caso(tAno), [7, 7, 7]) && // o número conta pelo que se fala
    eqJ(caso(t40, 2.3), [7, 7, 7]) && // voz lenta (2,3 pal/s): 40 palavras = 17,4 s
    eqJ(caso(t43, 2.3), [7, 7, 7]) &&
    eqJ(caso(t56), [8, 8, 8]) &&
    eqJ(ia.seedanceClipSeconds, [6, 6, 6]) &&
    fora.seedanceClipSeconds === null && fora.scenes.every((s) => !('clipSeconds' in s))
}
checa('segundos por clipe (bloco real): 40 e 41 palavras → [6,6,6]; 42, 45, "1986" + 39 e voz de 2,3 pal/s → [7,7,7]; 56 (teto da guarda) → [8,8,8]; modo IA pelas falas das cenas; fora do 15 s nada muda', provaSegundosDaRota(blocoSegundos))
{
  const L_FALA = '      const fala = seedanceShortSpeechSeconds(narracaoDoFilme, narrationRate.wordsPerSecond)'
  const L_SEG = '      const segundos = seedanceShortClipSeconds(fala, KLING25_CLIP_LOSS_SECONDS)'
  const mutFixo = blocoSegundos && trocaUma(blocoSegundos, L_SEG, '      const segundos = 10')
  checa('mutante "de volta ao slot fixo" (10 s por clipe) fica VERMELHO', Boolean(mutFixo) && !provaSegundosDaRota(mutFixo))
  const mutMenosPerda = blocoSegundos && trocaUma(blocoSegundos, L_FALA, L_FALA + ' - 3 * KLING25_CLIP_LOSS_SECONDS')
  checa('mutante da revisão: a rota desconta a perda do compose da fala (passava VERDE, 45/0) agora fica VERMELHO', Boolean(mutMenosPerda) && !provaSegundosDaRota(mutMenosPerda))
  const mutSemVoz = blocoSegundos && trocaUma(blocoSegundos, L_FALA, '      const fala = seedanceShortSpeechSeconds(narracaoDoFilme, 2.5)')
  checa('mutante: a rota ignora a voz que vai falar (só a régua de 2,5) fica VERMELHO', Boolean(mutSemVoz) && !provaSegundosDaRota(mutSemVoz))
  const mutPalavraEscrita = trocaUma(DUR_SRC, '    total += digitos > 0 ? Math.min(4, digitos) + (', '    total += digitos > 0 ? 1 + 0 * (')
  checa('mutante: número conta 1 palavra (a estimativa antiga: "1986" = 1) fica VERMELHO', mutPalavraEscrita !== null && !provaSegundosDaRota(blocoSegundos, roda(mutPalavraEscrita)))
  const mutMargemZeroRota = trocaUma(DUR_SRC, '  return (SEEDANCE_SHORT_CLIPS * (stepSeconds - perda) - SEEDANCE_SHORT_TIMELINE_ROUNDING_SECONDS) / SEEDANCE_SHORT_SPEECH_BAND', '  return SEEDANCE_SHORT_CLIPS * (stepSeconds - perda)')
  checa('mutante: margem zero na lib (o 234e3593) fica VERMELHO também pelo bloco da rota', mutMargemZeroRota !== null && !provaSegundosDaRota(blocoSegundos, roda(mutMargemZeroRota)))
}
// (4c') resgate de roteiro todo entre colchetes (KINEO-UNBRACKET): revisão de dinheiro de 29/09
{
  const blocoResgate = fatia(ROTA, '            if (seedanceShortFilm && recuperadas.length < SEEDANCE_SHORT_CLIPS) {\n', 'stockSearchQuery: seg.pexelsQuery }))\n            }\n')
  const narr = 'The ocean hides a river. It flows along the seabed for miles. Divers have swum right over it. Nobody knew it was there until sonar found it.'
  const reparse = { segments: [{ voiceover: 'The ocean hides a river. It flows along the seabed for miles.', pexelsQuery: 'river' }, { voiceover: 'Divers have swum right over it. Nobody knew it was there until sonar found it.', pexelsQuery: 'sonar' }], narration: narr }
  const resgate = (bloco, seedanceShortFilm = true) => roda(`export function run() { let recuperadas = resolveVerbatimSegments(reparse, 3).map((seg) => ({ description: seg.pexelsQuery, voiceover: seg.voiceover, caption: seg.voiceover, stockSearchQuery: seg.pexelsQuery }))\n${bloco ?? ''}\n return recuperadas }`, {
    resolveVerbatimSegments: VB.resolveVerbatimSegments, reparse, seedanceShortFilm, SEEDANCE_SHORT_CLIPS: 3, shortCaptionFromVoiceover: (t) => t,
  }).run()
  const provaResgate = (bloco) => { const r = resgate(bloco), f = resgate(bloco, false); return Boolean(bloco) && r.length === 3 && r.map((s) => s.voiceover).join(' ') === narr && f.length === 2 }
  checa('resgate de colchetes com HOOK + PAYOFF (2 blocos): o filme de 15 s sai com 3 cenas que somam a narração desembrulhada palavra por palavra; fora do 15 s, 2 como antes', Boolean(blocoResgate) && VB.resolveVerbatimSegments(reparse, 3).length === 2 && provaResgate(blocoResgate) && ROTA.indexOf("            via = 'unbracket'\n") < ROTA.indexOf(blocoResgate))
  checa('mutante: sem o bloco do resgate (2 cenas × segundos de 3 clipes = reuso) fica VERMELHO', !provaResgate(''))
}
// (4d) builder real da fal
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
const B = montaBuilder(ROTA)
const IMG = 'https://v3.fal.media/files/still-1.png'
checa('buildFalInput é o da base, byte a byte (o Seedance já honrava `seconds` 4-12; o 3x6 só passa a mandá-los)', funcaoDe(ROTA, 'buildFalInput') === funcaoDe(ROTA_BASE ?? '', 'buildFalInput') && Boolean(B))
checa("builder real: Seedance t2v e i2v com 6/7/8 s mandam duration '6'/'7'/'8'; sem segundos, '10' como sempre", [6, 7, 8].every((s) => B.buildFalInput(B.SEEDANCE_MODEL, 'shot', false, false, s, undefined, 7, false, '9:16', 'documentary_faceless').duration === String(s) && B.buildFalInput(B.SEEDANCE_I2V_MODEL, 'shot', false, false, s, IMG, 7, false, '9:16', 'documentary_faceless').duration === String(s)) && B.buildFalInput(B.SEEDANCE_MODEL, 'shot', false, false, undefined, undefined, 7, false, '9:16', 'documentary_faceless').duration === '10')
// (4e) o callback real do despacho: i2v e t2v de reserva
const cb = (src) => { const bloco = fatia(src, 'submit: async (m, promptForAttempt, onPost) => {', '\n        },\n', false); return bloco ? bloco.replace(/^submit: /, '') + '\n        }' : null }
const montaSubmit = (corpo, ctx) => roda(`export function fazer(ctx: any) {\n  const { hd, imageUrl, modelos, generationSeed, isStylizedLook, styleAnchor, aspectRequested, classicVisualMode, classicSceneInputs, sceneIndex, buildFalInput, submitFalQueueOnce, scene } = ctx\n  return ${corpo}\n}`).fazer(ctx)
async function despacha(corpo, { scene, modelos, imageUrl }) {
  const classicSceneInputs = [null, null, null]
  const posts = []
  const submit = montaSubmit(corpo, { hd: false, imageUrl, modelos, generationSeed: 4242, isStylizedLook: () => false, styleAnchor: {}, aspectRequested: '9:16', classicVisualMode: 'documentary_faceless', classicSceneInputs, sceneIndex: 1, buildFalInput: B.buildFalInput, scene,
    submitFalQueueOnce: async (m, input, onPost) => { onPost?.(); posts.push({ m, input: clone(input) }); return 'req-' + posts.length } })
  for (const m of modelos) await submit(m, 'A slow push-in over cracked mud', () => {})
  return { posts, gravado: clone(classicSceneInputs[1]) }
}
async function provaDespacho(corpo) {
  if (!corpo) return false
  const r = []
  for (const s of [6, 7, 8]) {
    const d = await despacha(corpo, { scene: { clipSeconds: s }, modelos: [B.SEEDANCE_I2V_MODEL, B.SEEDANCE_MODEL], imageUrl: IMG })
    r.push(d.posts.length === 2 && d.posts[0].m === B.SEEDANCE_I2V_MODEL && d.posts[0].input.duration === String(s) && d.posts[0].input.image_url === IMG && d.posts[1].m === B.SEEDANCE_MODEL && d.posts[1].input.duration === String(s) && !('image_url' in d.posts[1].input) && d.gravado?.duration === String(s))
    const t2v = await despacha(corpo, { scene: { clipSeconds: s }, modelos: [B.SEEDANCE_MODEL], imageUrl: undefined })
    r.push(t2v.posts[0].input.duration === String(s))
  }
  return r.every(Boolean)
}
checa("callback real do despacho: o clipe de 6/7/8 s vai com duration explícita no i2v, no t2v de reserva (o recuo do canário) e no t2v puro; o gravado em scene_fal_inputs (retomada) é o mesmo", await provaDespacho(cb(ROTA)))
{
  const c = cb(ROTA)
  const mutSemDuracao = c && trocaUma(c, 'buildFalInput(m, promptForAttempt, hd, false, scene.clipSeconds,', 'buildFalInput(m, promptForAttempt, hd, false, undefined,')
  checa("mutante: tirar a duração explícita do payload (volta o '10' do default) fica VERMELHO", Boolean(mutSemDuracao) && !(await provaDespacho(mutSemDuracao)))
}
// (4f) o claim assinado
const objResp = (src) => fatia(src, "\n    const response: Record<string, unknown> = {\n      mode: 'cinematic_ai',", '\n    }\n')
const VARS = ['generationId', 'prompt', 'duration', 'requestedDuration', 'aspectRequested', 'degrau', 'scenes', 'voiceoverScript', 'falRequestIds', 'usedModel', 'usedModels', 'claimQuality', 'verbatim', 'parsedScript', 'contratoRelatoClassico', 'formatoVisual', 'classicSceneInputs', 'anchorActive']
const montaResp = (src) => roda(`export function montar(ctx: any) {\n  const { ${VARS.join(', ')} } = ctx\n${src}\n  return response\n}`, { kling25SceneWordStarts: K.kling25SceneWordStarts }).montar
const T45 = textoN(45)
{
  const cenas = tres(T45).map((s) => ({ ...s, clipSeconds: 7 }))
  const ctx = { generationId: 'g', prompt: 'p', duration: 15, requestedDuration: 15, aspectRequested: '9:16', degrau: null, scenes: cenas, voiceoverScript: T45, falRequestIds: ['r0', 'r1', 'r2'], usedModel: SEED_T2V, usedModels: [SEED_I2V, SEED_T2V, SEED_I2V], claimQuality: 'cinematic_ai', verbatim: true, parsedScript: { speed: null }, contratoRelatoClassico: [], formatoVisual: { modo: 'documentary_faceless' }, classicSceneInputs: [null, null, null], anchorActive: true }
  const o = objResp(ROTA)
  const resp = o ? montaResp(o)(ctx) : null
  const urls = ['https://f/1.mp4', 'https://f/2.mp4', 'https://f/3.mp4']
  const plano = resp ? K.alignSignedClipPlanWith(resp, urls, urls, D.SEEDANCE_SHORT_CLIP_STEPS) : null
  const inicios = cenas.reduce((acc, c, i) => (i === 0 ? [0] : [...acc, acc[i - 1] + palavras(cenas[i - 1].voiceover).length]), [])
  checa(`claim assinado do Seedance 15 s: clip_seconds [7,7,7] + clip_word_starts [${inicios}] sobre voiceover_script; o compose alinha com {6,7,8}; o alinhador do Kling (5|10) devolve null`, Boolean(resp) && eqJ(resp.clip_seconds, [7, 7, 7]) && eqJ(resp.clip_word_starts, inicios) && D.isSeedanceShortClaim(resp) && eqJ(plano?.seconds, [7, 7, 7]) && eqJ(plano?.wordStarts, inicios) && K.alignSignedClipPlan(resp, urls, urls) === null)
  const semMeio = K.alignSignedClipPlanWith(resp ?? {}, [urls[0], null, urls[2]], [urls[0], urls[2]], D.SEEDANCE_SHORT_CLIP_STEPS)
  checa('cena perdida no meio: o plano alinha às URLs completas (segundos e início da fala da 1ª e da 3ª)', eqJ(semMeio?.seconds, [7, 7]) && eqJ(semMeio?.wordStarts, [inicios[0], inicios[2]]))
  checa('o Kling continua com os mesmos nomes e 5|10: alignSignedClipSeconds recusa 7 e aceita 5/10 (comportamento de antes)', K.alignSignedClipSeconds({ clip_seconds: [5, 10] }, ['u', 'v'], ['u', 'v'])?.join() === '5,10' && K.alignSignedClipSeconds({ clip_seconds: [5, 7] }, ['u', 'v'], ['u', 'v']) === null && K.alignSignedClipSeconds({ clip_seconds: ['5', 10] }, ['u', 'v'], ['u', 'v']) === null)
  checa('klingShots.ts: fora a generalização do alinhador (desfeita em memória), o arquivo é o da base byte a byte', desfaz3x6KlingShots(rd('lib/cinematic/klingShots.ts')) === rdBase('lib/cinematic/klingShots.ts'))
}
// (4g) ensaio de $0 na rota
checa('ensaio de $0 da rota: relatório do 15 s com os segundos reais de cada clipe e a perda do compose (linha inteira), por spread próprio', temLinha(ROTA, '        ? classicDryRunReport({ scenes: scenes.map((s, i) => ({ voiceover: s.voiceover, prompt: classicScenePrompts[i] })), targetSeconds: duration, secondsPerClip: seedanceClipSeconds[0], verbatim, wordsPerSecond: narrationRate.wordsPerSecond, sceneSeconds: seedanceClipSeconds, clipLossSeconds: KLING25_CLIP_LOSS_SECONDS })') && temLinha(ROTA, '        ...(relatorioSeedance ?? {}),'))
// (4h) a rota só GANHOU linhas
function soAcrescimos(p) {
  if (!BASE) return false
  const diff = execFileSync('git', ['diff', '--unified=0', '--no-color', BASE, '--', p], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 }).toString().split(CR + LF).join(LF)
  // Reancorado KINEO-DURACOES-CURTAS-2026-09-29 [TRAVA 8.2 — vai do fundador 29/09 'vai pra todas as 4']: as SEIS linhas da base que a
  // entrega das durações curtas trocou de propósito (a frase da recusa pelo motor; o resgate com as curtas; o "alvo fantasma" nas duas
  // chamadas do portão; o piso 30 → 15 do alvo hollywood; o C1 para roteiro curto) — cada substituta está marcada KINEO-DURACOES-CURTAS e
  // provada em scripts/test-duracoes-curtas-todos-motores-2026-09-29.mjs. Nenhuma outra linha da base pode sair.
  const TROCADAS = new Set([
    "        return NextResponse.json({ error: mensagemDaRecusaDeDuracao(checagemDuracao), reason: checagemDuracao.recusa, engine: typeof body.engine === 'string' ? body.engine : null, requested_seconds: duration, suggested_seconds: checagemDuracao.sugestao, retryable: false, charged: false, refunded: false }, { status: 422 })",
    '            duracoes: duracoesDoResgate,',
    '        oferecidas: SUPPORTED_DURATIONS,',
    '          oferecidas: SUPPORTED_DURATIONS,',
    '        const req = Math.max(30, Math.min(90, Math.round(duration || 60)))',
    '        if (totalWords >= 40 && sentences.length >= 3) {',
  ])
  const tiradas = diff.split(LF).filter((l) => l.startsWith('-') && !l.startsWith('---') && !(p.endsWith('generate-video-cinematic/route.ts') && TROCADAS.has(l.slice(1))))
  return { ok: tiradas.length === 0, n: diff.split(LF).filter((l) => l.startsWith('+') && !l.startsWith('+++')).length }
}
{
  const r = soAcrescimos('app/api/generate-video-cinematic/route.ts'), c = soAcrescimos('app/api/compose/route.ts')
  checa(`rota do cinematic e /api/compose: nenhuma linha da base foi alterada ou apagada (só ${r.n} + ${c.n} linhas acrescentadas, todas atrás de seedanceShortFilm / do claim de 15 s)`, r.ok && c.ok)
}

// ═══ 5. /api/compose ═══
console.log('5) /api/compose: o plano assinado do Seedance 15 s chega ao lib/compose')
const L_KLING = '      signedClipPlan = alignSignedClipPlan(cinematicBirthClaim.response, cinematicBirthClaim.authorizedCompletedUrls, clipUrls)'
const L_VEO = '      if (!signedClipPlan && isVeoClaim(cinematicBirthClaim.response)) signedClipPlan = veoAlignSignedClipPlan(cinematicBirthClaim.response, cinematicBirthClaim.authorizedCompletedUrls, clipUrls)'
const L_SEED = '      if (!signedClipPlan && isSeedanceShortClaim(cinematicBirthClaim.response)) signedClipPlan = alignSignedClipPlanWith(cinematicBirthClaim.response, cinematicBirthClaim.authorizedCompletedUrls, clipUrls, SEEDANCE_SHORT_CLIP_STEPS)'
const provaCompose = (src) => { const L = linhas(src); const k = L.indexOf(L_KLING), v = L.indexOf(L_VEO), s = L.indexOf(L_SEED); return k > 0 && v > k && s > v && src.includes("import { isSeedanceShortClaim, SEEDANCE_SHORT_CLIP_STEPS } from '@/lib/durationByEngine'") && src.includes("import { alignSignedClipPlanWith } from '@/lib/cinematic/klingShots'") && temLinha(src, '        clipSeconds: composeClipUrls === clipUrls ? signedClipPlan?.seconds ?? null : null, // KINEO-KLING25-PLANOS-5S-2026-09-28 — plano de 5 s nunca ocupa mais de 5 s') }
checa('compose: Kling (literal) → Veo (literal) → Seedance 15 s, só quando os anteriores devolveram null; clipSeconds/clipSpeech seguem para o builder', provaCompose(COMPOSE_ROTA))
const mutSemAlinhador = trocaUma(COMPOSE_ROTA, L_SEED + LF, '')
checa('mutante "compose reciclando" (sem o alinhador do Seedance: o claim cai na montagem cega) fica VERMELHO', mutSemAlinhador !== null && !provaCompose(mutSemAlinhador))

// ═══ 6. compose real ═══
console.log('6) compose real (lib/compose buildCreatomateSource): 4 casos, nenhum reuso')
const COMPOSE_LIB = rd('lib/compose.ts')
const compoe = (src) => {
  const exports = {}
  const code = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { exports, require: (n) => loadLib(n), Buffer, URL, URLSearchParams, TextEncoder, TextDecoder, process: { env: {} }, console: { log() {}, warn() {}, error() {} }, fetch: () => { throw new Error('rede proibida') }, setTimeout: () => { throw new Error('timer proibido') }, clearTimeout() {} }, { timeout: 5000 })
  return exports
}
const C = compoe(COMPOSE_LIB)
checa('lib/compose.ts é o da base (o conserto é o plano assinado chegar; o ramo assinado já existia)', COMPOSE_LIB === rdBase('lib/compose.ts'))
const FIM_FRASE = /[.!?…]["'”’)\]]*$/u
const falaDe = (texto, total) => { const ws = palavras(texto); const passo = (total - 0.5) / ws.length; return ws.map((w, i) => ({ word: w.replace(/[^\p{L}\p{N}'-]/gu, ''), start: Math.round(i * passo * 1000) / 1000, end: Math.round((i * passo + passo * 0.85) * 1000) / 1000, sentenceEnd: FIM_FRASE.test(w) })) }
const urlsDe = (n) => Array.from({ length: n }, (_, i) => `https://v3b.fal.media/files/b/seedance/clip-${i + 1}.mp4`)
const trechosDe = (source) => (source.elements ?? []).filter((e) => e.track === 2 && e.type === 'video')
const OVERLAP = 0.06
// Texto com frases que começam nos instantes do canário (7,3 s e 15,0 s a 17,8 s de fala): 19 + 20 + 6 palavras.
const frase = (n, fim) => Array.from({ length: n }, (_, i) => (i === 0 ? 'Word' : 'word') + (i === n - 1 ? fim : '')).join(' ')
const textoDe = (n) => {
  if (n === 45) return [frase(19, '.'), frase(20, '.'), frase(6, '.')].join(' ')
  const a = Math.round(n * 0.42), b = Math.round(n * 0.44)
  return [frase(a, '.'), frase(b, '.'), frase(n - a - b, '.')].join(' ')
}
function monta(Cx, { total, secs, palavrasN, comPlano = true, comFala = true }) {
  const texto = textoDe(palavrasN)
  const n = secs.length
  const cenas = VB.resolveVerbatimSegments({ segments: [], narration: texto }, n).map((s) => s.voiceover)
  const wordStarts = K.kling25SceneWordStarts(texto, cenas)
  const urls = urlsDe(n)
  const source = Cx.buildCreatomateSource({ clipUrls: urls, voiceoverUrl: 'https://x.invalid/vo.mp3', voiceoverScript: texto, sceneCaptions: [], duration: 15, quality: 'cinematic_ai', realAudioDuration: total, whisperWords: falaDe(texto, total), musicUrl: null, watermark: false, endCard: false,
    clipSeconds: comPlano ? secs : null, clipSpeech: comPlano && comFala ? { narrationWords: palavras(texto), wordStarts } : null })
  return { source, urls, wordStarts }
}
function invariantes(source, clipSeconds, urls, total) {
  const t = trechosDe(source)
  if (t.length === 0) return { ok: false, motivo: 'sem trechos' }
  let cursor = 0
  const ordem = []
  for (const e of t) {
    const idx = urls.indexOf(e.source)
    if (idx < 0) return { ok: false, motivo: 'fonte desconhecida' }
    const trim = typeof e.trim_start === 'number' ? e.trim_start : 0
    if (trim + e.duration > clipSeconds[idx] + 1e-6) return { ok: false, motivo: `clipe ${idx + 1} (${clipSeconds[idx]} s) pedido até ${(trim + e.duration).toFixed(3)} s` }
    if (Math.abs(e.time - cursor) > 0.002) return { ok: false, motivo: `buraco/sobreposição em ${cursor}` }
    cursor = e.time + e.duration - OVERLAP
    ordem.push(idx)
  }
  if (cursor < total - 0.002) return { ok: false, motivo: `imagem acaba em ${cursor.toFixed(3)} de ${total}` }
  const semReuso = new Set(ordem).size === ordem.length
  return { ok: semReuso && eqJ(ordem, urls.map((_, i) => i)), motivo: semReuso ? `ordem ${ordem.join(',')}` : `reuso: ${ordem.join(',')}`, ordem }
}
const CASOS = [
  { nome: 'fala 16,0 s, [6,6,6]', total: 16.0, secs: [6, 6, 6], palavrasN: 40 },
  { nome: 'fala 17,8 s, [7,7,7]', total: 17.8, secs: [7, 7, 7], palavrasN: 45 },
  { nome: 'fala 20,5 s, [8,8,8]', total: 20.5, secs: [8, 8, 8], palavrasN: 51 },
  { nome: 'canário 17,8 s, [10,10]', total: 17.8, secs: [10, 10], palavrasN: 45 },
]
function provaComposeReal(Cx, fala = true) {
  const r = []
  for (const c of CASOS) for (const comFala of [true, false]) {
    const { source, urls } = monta(Cx, { ...c, comFala })
    const inv = invariantes(source, c.secs, urls, c.total)
    r.push(inv.ok)
    if (!inv.ok && fala) console.log(`     ${c.nome}${comFala ? ' (corte no início da fala)' : " (nível d'água)"}: ${inv.motivo}`)
  }
  return r.every(Boolean)
}
{
  const ok6 = provaComposeReal(C)
  checa('compose real, 4 casos × (corte no início da fala assinado | nível d\'água): 1 trecho por clipe, em ordem, nenhum reuso, trim_start + duração ≤ segundos do clipe, imagem até o fim da fala', ok6)
  for (const c of CASOS) {
    const { source, urls } = monta(C, c)
    const t = trechosDe(source)
    console.log(`     ${c.nome}: ${t.map((e) => `clipe ${urls.indexOf(e.source) + 1} ${e.time.toFixed(2)}→${(e.time + e.duration - OVERLAP).toFixed(2)} (até ${((e.trim_start ?? 0) + e.duration).toFixed(2)}/${c.secs[urls.indexOf(e.source)]} s)`).join(' · ')}`)
  }
  const canario = CASOS[3]
  const antigo = monta(C, { ...canario, comPlano: false })
  const invA = invariantes(antigo.source, canario.secs, antigo.urls, canario.total)
  checa(`sem o plano assinado (a montagem de antes), o canário reproduz o defeito: ${invA.motivo} — o clipe 1 volta no fim`, !invA.ok && invA.ordem?.[invA.ordem.length - 1] === 0 && invA.ordem.length === 3)
  const planCapped = C.planCappedClipTimeline
  const direto = CASOS.every((c) => { const s = planCapped({ totalDuration: c.total, clipSeconds: c.secs, trimStart: 0.1, overlap: OVERLAP }); return s.length === c.secs.length && s.every((x, i) => x.clip === i && x.trimStart + x.len + OVERLAP <= c.secs[i] + 1e-6) })
  checa("planCappedClipTimeline (nível d'água puro, sem Whisper): 1 trecho por clipe nos 4 casos, dentro do teto", direto)
  // mutantes do compose
  const mutRamo = trocaUma(COMPOSE_LIB, '  } else if (signedClipSeconds) {', '  } else if (false) {')
  checa('mutante "compose reciclando" (o ramo assinado desligado: volta o corte cego) fica VERMELHO', mutRamo !== null && !provaComposeReal(compoe(mutRamo), false))
  const mutNivel = trocaUma(COMPOSE_LIB, '    let segLen = r3(Math.min(caps[i], level, remaining))', '    let segLen = r3(Math.min(caps[i] * 0.6, level, remaining))')
  checa("mutante \"compose reciclando\" (nível d'água que deixa imagem sem usar e recicla no fim) fica VERMELHO", mutNivel !== null && !provaComposeReal(compoe(mutNivel), false))
}
// (6b) a folga provada na montagem REAL (revisão 29/09: com margem zero, fala 17,53 s em [6,6,6] → 0,1,2,0)
{
  const LENTA = 1.035 // a voz real 3,5 % mais lenta que a estimativa
  function provaFolga(M) {
    const ruins = []
    for (let n = 30; n <= D.maxWordsForShortFilm(15); n++) {
      const texto = textoDe(n)
      const s = M.seedanceShortClipSeconds(M.seedanceShortSpeechSeconds(texto, D.VERBATIM_EST_WORDS_PER_SECOND), PERDA)
      const total = Math.round((n / D.VERBATIM_EST_WORDS_PER_SECOND) * LENTA * 1000) / 1000
      for (const comFala of [true, false]) {
        const { source, urls } = monta(C, { total, secs: [s, s, s], palavrasN: n, comFala })
        const inv = invariantes(source, [s, s, s], urls, total)
        if (!inv.ok) ruins.push(`${n} pal [${s}] ${total}s: ${inv.motivo}`)
      }
    }
    return ruins
  }
  const ruins = provaFolga(D)
  if (ruins.length) console.log('     ' + ruins.slice(0, 4).join(' | '))
  checa(`folga na montagem real: ${D.maxWordsForShortFilm(15) - 29} tamanhos (30-${D.maxWordsForShortFilm(15)} palavras) com a fala REAL 3,5 % mais lenta que a estimativa, no passo que a lib escolhe: 1 trecho por clipe, em ordem, sem reuso`, ruins.length === 0)
  const borda = monta(C, { total: 17.53, secs: [6, 6, 6], palavrasN: 43 })
  const invB = invariantes(borda.source, [6, 6, 6], borda.urls, 17.53)
  checa(`a borda da revisão reproduz (sensibilidade do teste): 43 palavras, fala 17,53 s em [6,6,6] → ${invB.motivo}`, !invB.ok)
  const mutZero = trocaUma(DUR_SRC, '  return (SEEDANCE_SHORT_CLIPS * (stepSeconds - perda) - SEEDANCE_SHORT_TIMELINE_ROUNDING_SECONDS) / SEEDANCE_SHORT_SPEECH_BAND', '  return SEEDANCE_SHORT_CLIPS * (stepSeconds - perda)')
  checa('mutante: margem zero (o 234e3593) fica VERMELHO na montagem real', mutZero !== null && provaFolga(roda(mutZero)).length > 0)
}

// ═══ 7. ensaio de $0 ═══
console.log('7) ensaio de $0 (lib/cinematic/classicDryRun real): o teto (41) e acima dão PASS em toda persona; o piso (36) nas vozes até 2,5 pal/s')
const DR = roda(rd('lib/cinematic/classicDryRun.ts'))
{
  const r = []
  const n40 = []
  for (const n of [40, 41, 42, 43]) {
    const texto = textoN(n)
    for (const wps of taxas) {
      const fala = D.seedanceShortSpeechSeconds(texto, wps)
      const s = D.seedanceShortClipSeconds(fala, PERDA)
      const rel = DR.classicDryRunReport({ scenes: tres(texto).map((c) => ({ voiceover: c.voiceover, prompt: 'x' })), targetSeconds: 15, secondsPerClip: s, verbatim: true, wordsPerSecond: wps, sceneSeconds: [s, s, s], clipLossSeconds: PERDA })
      if (n >= maxS) r.push(rel.pass); else n40.push(rel.pass) // reancorado 29/09: o "sempre PASS" é do TETO (41); 40 fica abaixo dele
      if (!rel.pass) console.log(`     ${n} palavras a ${wps} pal/s: ${rel.verdict}`)
    }
  }
  checa(`o teto do escritor (${maxS} palavras) e acima dele (42, 43) em 3 clipes, nas ${taxas.length} personas do catálogo (${Math.min(...taxas)}-${Math.max(...taxas)} pal/s): PASS em todas (${r.length} ensaios); 40 palavras: PASS em ${n40.filter(Boolean).length} de ${n40.length} (a persona mais rápida fica a 0,05 s do C2)`, r.length > 0 && r.every(Boolean) && n40.filter(Boolean).length >= n40.length - 1)
  // KINEO-ROTEIRO-15S-FRASE-INTEIRA (29/09): o piso novo do escritor (36) passa no ensaio em toda voz até a régua da casa
  const piso = taxas.filter((w) => w <= D.VERBATIM_EST_WORDS_PER_SECOND).map((wps) => {
    const texto = textoN(minS)
    const s = D.seedanceShortClipSeconds(D.seedanceShortSpeechSeconds(texto, wps), PERDA)
    return DR.classicDryRunReport({ scenes: tres(texto).map((c) => ({ voiceover: c.voiceover, prompt: 'x' })), targetSeconds: 15, secondsPerClip: s, verbatim: true, wordsPerSecond: wps, sceneSeconds: [s, s, s], clipLossSeconds: PERDA }).pass
  })
  checa(`o piso do escritor (${minS} palavras) em 3 clipes: PASS nas ${piso.length} personas até ${D.VERBATIM_EST_WORDS_PER_SECOND} pal/s`, piso.length >= 5 && piso.every(Boolean))
}

// ═══ 8. o roteiro do canário do doc ═══
console.log('8) docs/CANARIO-SEEDANCE-15S-2026-09-29.md: o roteiro do canário do 3x6 é da faixa e dá 3 × 6 s')
{
  const doc = rd('docs/CANARIO-SEEDANCE-15S-2026-09-29.md')
  const m = /const SCRIPT41 = "([^"]+)"/.exec(doc)
  const t = m ? m[1] : ''
  const n = palavras(t).length
  const cenas = tres(t)
  const inicios = K.kling25SceneWordStarts(t, cenas.map((c) => c.voiceover))
  const s = D.seedanceShortClipSeconds(D.seedanceShortSpeechSeconds(t, D.VERBATIM_EST_WORDS_PER_SECOND), PERDA)
  const fimDeFrase = cenas.every((c) => /[.!?]$/.test(c.voiceover.trim()))
  checa(`roteiro do canário: ${n} palavras escritas = ${D.palavrasFaladas(t)} faladas (sem número; faixa ${minS}-${maxS}) → ${s} s por clipe, ${cenas.length} cenas terminando em fim de frase, inícios [${inicios}] (o que o doc manda conferir no claim)`, n >= minS && n <= maxS && D.palavrasFaladas(t) === n && s === 6 && cenas.length === 3 && fimDeFrase && eqJ(inicios, [0, 14, 28]) && doc.includes('inicios [0,14,28]') && doc.includes('clip_seconds [6,6,6]') && !doc.includes('const SCRIPT42 ='))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) process.exit(1)
