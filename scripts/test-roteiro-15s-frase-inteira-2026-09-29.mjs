// KINEO-ROTEIRO-15S-FRASE-INTEIRA-2026-09-29 [TRAVA 8.2 — "vai" do 15 s] — guardião: o roteiro do filme de 15 s nunca
// sai com frase cortada no meio nem com CTA de rede social.
//
// Defeito no ar (produção c55bab53, 29/09 ~06:55 UTC): o filme grátis de 15 s ("Let AI structure it", português, um
// apartamento em São Paulo) saiu com "Localizado a poucos passos do metrô em São." e "Espaço surpreendente e bem
// distribuído, perfeito para." — e "Seguir para mais!" no PAYOFF. Causa: faixa do escritor 41–41 (piso = teto,
// lib/scriptWriterRate) e, sem frase inteira que coubesse, o último recurso de lib/shortFilmScript aparava PALAVRAS.
//
// Este guardião EXECUTA o código real (readFileSync + transpile + vm, loader offline que resolve '@/' por caminho — sem
// rede, sem banco, sem OpenAI) e prova:
//   1. faixa do escritor 36–41 (piso C2 na régua da casa, teto que cabe em 3 × 6 s) com a conta mostrada; tudo o mais
//      da régua idêntico;
//   2. o exemplo REAL (reconstruído): o corte ANTIGO (o arquivo da base, executado) reproduz byte a byte o texto que saiu
//      em produção; o fecho NOVO sai com frases inteiras, sem CTA, HOOK e PAYOFF intactos, dentro da faixa, e passa na
//      guarda do filme curto, no portão de narração e no ensaio de $0 do cinematic (persona que a rota escolheria);
//   3. o mesmo para 2 exemplos em inglês e 1 em espanhol; borda: sem combinação na faixa, passa do teto até o que a
//      guarda aceita em vez de cair abaixo do piso; abaixo do piso, nada é picado nem enchido;
//   4. CTA de rede social: detector (pt/en/es) sem falso positivo nas frases de conteúdo; o prompt de ≤ 20 s não pede CTA
//      (e o de 60 s continua pedindo); o reforço da nova tentativa leva a contagem explícita;
//   5. a rota: o fecho corre logo depois da 1ª geração e depois da nova tentativa (fica a melhor), com o teto duro;
//   6. mutantes, todos VERMELHOS: de volta ao corte por palavra (a base e um mutante em memória); piso = teto; CTA de
//      volta (no fecho e no prompt).
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ) // o loader offline resolve '@/...' a partir do cwd
const LF = String.fromCharCode(10), CR = String.fromCharCode(13)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').split(CR + LF).join(LF)
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ✓ ' + n) } else { falhas.push(n); console.log('  ✗ FALHOU: ' + n) } }
const linhas = (src) => src.split(LF).map((l) => l.trimEnd())
const temLinha = (src, l) => linhas(src).includes(l)
const trocaUma = (src, a, b) => (src.split(a).length === 2 ? src.split(a).join(b) : null)
const L = createOfflineLoader()
/** Executa uma fonte TS (real ou mutante) com os imports resolvidos pelo loader offline. */
const roda = (src) => {
  if (src == null) throw new Error('mutante sem âncora')
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9, esModuleInterop: true } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, require: (n) => L(n), console: { log() {}, warn() {}, error() {} }, Math, Number, Array, Object, JSON, Set, Map, String, RegExp, process: { env: {} } })
  return exports
}

// BASE = o "antes" deste conserto (memória "trava por diff fica verde ao mergear"): o pai do 1º commit com o marcador
// na história de HEAD; antes do commit, o próprio HEAD; senão origin/main — a que NÃO tem o marcador na lib.
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
let BASE = null
{
  const candidatos = []
  try { const shas = git(['log', '--format=%H', '--grep=ROTEIRO-15S-FRASE-INTEIRA', 'HEAD']).trim().split(LF).filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:lib/shortFilmScript.ts`]).includes('KINEO-ROTEIRO-15S-FRASE-INTEIRA')) { BASE = ref; break } } catch { /* próximo */ }
  }
}
const rdBase = (p) => { if (!BASE) return null; try { return git(['show', `${BASE}:${p}`]).split(CR + LF).join(LF) } catch { return null } }
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)

const SF_SRC = rd('lib/shortFilmScript.ts')
const SF = roda(SF_SRC)
const W_SRC = rd('lib/scriptWriterRate.ts')
const W = roda(W_SRC)
const D = L('lib/durationByEngine.ts')
const P = L('lib/scriptParser.ts')
const NF = L('lib/narrationFit.ts')
const SR = L('lib/speechRate.ts')
const NM = L('lib/narration/niche-mapping.ts')
const PERS = L('lib/narration/personas.ts')
const VB = L('lib/cinematic/verbatimBeats.ts')
const DR = L('lib/cinematic/classicDryRun.ts')
const K = L('lib/cinematic/klingShots.ts')
const PERDA = K.KLING25_CLIP_LOSS_SECONDS
const GS = rd('app/api/generate-script/route.ts')

// A régua de palavras da ROTA (generate-script): max(scriptWordCount, parseUserScript(...).narration por espaço).
const astDe = (src) => ts.createSourceFile('route.ts', src, ts.ScriptTarget.Latest, true)
function funcaoDe(src, nome) {
  const ast = astDe(src)
  let achou = null
  const v = (n) => { if (!achou && ts.isFunctionDeclaration(n) && n.name?.text === nome) achou = n.getText(ast); if (!achou) ts.forEachChild(n, v) }
  v(ast)
  return achou
}
const swcSrc = funcaoDe(GS, 'scriptWordCount')
const scriptWordCount = (() => { const ctx = {}; vm.runInNewContext(ts.transpileModule(`${swcSrc}; this.f = scriptWordCount`, { compilerOptions: { target: 9 } }).outputText, ctx); return ctx.f })()
const falaDaGuarda = (t) => P.parseUserScript(t).narration.split(/\s+/).filter(Boolean).length
const conta = (t) => Math.max(scriptWordCount(t), falaDaGuarda(t))
checa('a régua de palavras é a da rota (scriptWordCount extraída da fonte + a da guarda, como palavrasDoFilmeCurto)', Boolean(swcSrc) && temLinha(GS, '    const palavrasDoFilmeCurto = (t: string) => Math.max(scriptWordCount(t), falaNaReguaDaGuarda(t))') && temLinha(GS, '    const falaNaReguaDaGuarda = (t: string) => parseUserScript(t).narration.split(/\\s+/).filter(Boolean).length'))

// ═══ 1. faixa ═══
console.log('1) faixa do escritor do 15 s (lib/scriptWriterRate)')
const regua = W.writerRateFor('cinematic_ai', 'apartamento', 'pt')
const TETO = Math.min(W.maxWordsFor(15, regua.wordsPerSecond, regua.coverage), D.maxWordsForShortFilm(15)) // a linha da rota
const PISO = Math.min(W.minWordsFor(15, regua.wordsPerSecond, regua.coverage), TETO)
const DURO = Math.max(TETO, D.maxWordsForShortFilm(15)) // tetoDuroFilmeCurto da rota no Seedance
const capDe6 = (D.SEEDANCE_SHORT_CLIPS * (6 - PERDA) - D.SEEDANCE_SHORT_TIMELINE_ROUNDING_SECONDS) / D.SEEDANCE_SHORT_SPEECH_BAND
const pisoConta = Math.ceil(15 * NF.MIN_COVERAGE * D.VERBATIM_EST_WORDS_PER_SECOND - 1e-9)
const tetoConta = Math.floor(capDe6 * D.VERBATIM_EST_WORDS_PER_SECOND + 1e-9)
console.log(`     conta: piso ⌈15 × ${NF.MIN_COVERAGE} × ${D.VERBATIM_EST_WORDS_PER_SECOND}⌉ = ⌈${(15 * NF.MIN_COVERAGE * D.VERBATIM_EST_WORDS_PER_SECOND).toFixed(3)}⌉ = ${pisoConta} · teto ⌊(3 × (6 − ${PERDA}) − ${D.SEEDANCE_SHORT_TIMELINE_ROUNDING_SECONDS}) ÷ ${D.SEEDANCE_SHORT_SPEECH_BAND} × ${D.VERBATIM_EST_WORDS_PER_SECOND}⌋ = ⌊${(capDe6 * 2.5).toFixed(2)}⌋ = ${tetoConta} · teto duro da guarda ${DURO}`)
function provaFaixa(Wx) {
  const r = Wx.writerRateFor('cinematic_ai', 'x', 'pt')
  const mn = Wx.minWordsFor(15, r.wordsPerSecond, r.coverage), mx = Wx.maxWordsFor(15, r.wordsPerSecond, r.coverage)
  return mn === pisoConta && mx === tetoConta && mn === 36 && mx === 41 && mn < mx
}
checa(`faixa ${PISO}–${TETO} (piso < teto): ${(PISO / 2.5).toFixed(1)}–${(TETO / 2.5).toFixed(1)} s de fala na régua da casa; o piso é o C2 (≥ ${15 * NF.MIN_COVERAGE} s)`, provaFaixa(W) && PISO === 36 && TETO === 41 && PISO / 2.5 >= 15 * NF.MIN_COVERAGE && W.seedanceShortWriterWords('pt').fastestFloor === 41)
{
  const WB = rdBase('lib/scriptWriterRate.ts') ? roda(rdBase('lib/scriptWriterRate.ts')) : null
  const pares = []
  const taxas = PERS.VOICE_PERSONAS.map((p) => SR.speechRateFor({ family: 'classic', language: 'en', voice: p.voice, personaSpeed: p.defaultSpeed }).wordsPerSecond)
  for (const s of [15, 20, 30, 35, 45, 60, 90]) for (const w of [2.3, 2.5, 2.8, 3.1, ...taxas]) for (const c of [1, 0.95]) {
    if (s === 15 && w === 3.1 && c === 1) continue
    pares.push(W.minWordsFor(s, w, c) === WB?.minWordsFor(s, w, c) && W.maxWordsFor(s, w, c) === WB?.maxWordsFor(s, w, c))
  }
  const k1 = W.writerRateFor('fast', 'x', 'en')
  checa(`fora do 15 s do Seedance, a régua é a da base (${pares.length} pares; Kineo 1 a 15 s segue ${W.minWordsFor(15, k1.wordsPerSecond, 1)}–${W.maxWordsFor(15, k1.wordsPerSecond, 1)}); base: teto ${WB?.maxWordsFor(15, 3.1, 1)}, piso ${WB?.minWordsFor(15, 3.1, 1)}`, Boolean(WB) && pares.every(Boolean) && WB.maxWordsFor(15, 3.1, 1) === 41 && WB.minWordsFor(15, 3.1, 1) === 41)
}
const mutPisoTeto = trocaUma(W_SRC, '  const min = Math.min(max, Math.ceil(SEEDANCE_SHORT_SECONDS * MIN_COVERAGE * VERBATIM_EST_WORDS_PER_SECOND - 1e-9))', '  const min = max')
checa('o compilador de mutantes, sobre o arquivo SEM mutação, passa no predicado (senão o vermelho não prova nada)', provaFaixa(roda(W_SRC)))
checa('mutante: piso = teto (41–41, o do defeito) fica VERMELHO pelo mesmo predicado', mutPisoTeto !== null && !provaFaixa(roda(mutPisoTeto)))

// ═══ helpers dos exemplos ═══
const SPLIT = /(?<=[^.][.!?])\s+(?=[\p{Lu}\p{N}"'“¿¡])/u
const corpos = (t) => t.split(/\n\s*\n/).map((b) => b.replace(/^\s*(HOOK|MICRO REWARD \d|PAYOFF|ESCALATION|RHYTHM)\s*(\([^)]*\))?\s*:\s*(\[[^\]]*\]\s*)*/, '').trim()).filter(Boolean)
const frasesDe = (t) => corpos(t).flatMap((c) => c.split(SPLIT).map((s) => s.trim()).filter(Boolean))
const cabecalhos = (t) => t.split(LF).map((l) => (/^(HOOK|MICRO REWARD \d|ESCALATION|RHYTHM|PAYOFF)\b/.exec(l.trim()) || [])[1]).filter(Boolean)
const CTA_RE = /\b(follow|subscribe|seguir|siga|sígueme|síguenos|sigue|inscreva|suscríbete)\b/i
const primeiraDe = (t, cab) => { const l = t.split(LF).find((x) => x.startsWith(cab)); return l ? l.replace(/^[^\]]*\]\s*/, '').split(SPLIT)[0] : null }
function planoDoCinematic(texto, lang) {
  const narr = P.parseUserScript(texto).narration
  const pers = NM.selectPersonaForScript(texto, undefined, 'cinematic', lang)
  const rate = SR.speechRateFor({ family: 'classic', language: lang, voice: pers?.voice, personaSpeed: pers?.defaultSpeed })
  const gate = SR.narrationFitAt(narr, 15, rate)
  const guarda = D.checarFalaDoFilmeCurto({ engine: 'cinematic_ai', seconds: 15, verbatim: true, narration: narr })
  const s = D.seedanceShortClipSeconds(D.seedanceShortSpeechSeconds(narr, rate.wordsPerSecond), PERDA)
  const cenas = VB.resolveVerbatimSegments({ segments: [], narration: narr }, D.SEEDANCE_SHORT_CLIPS)
  const ensaio = DR.classicDryRunReport({ scenes: cenas.map((c) => ({ voiceover: c.voiceover, prompt: c.pexelsQuery ?? 'x' })), targetSeconds: 15, secondsPerClip: s, verbatim: true, wordsPerSecond: rate.wordsPerSecond, sceneSeconds: cenas.map(() => s), clipLossSeconds: PERDA })
  return { persona: pers?.id ?? '-', wps: rate.wordsPerSecond, gate, guarda, s, cenas: cenas.length, ensaio }
}
const ARGS = { maxWords: TETO, minWords: PISO, countWords: conta, hardMaxWords: DURO }

// ═══ 2. o exemplo real ═══
console.log('2) o exemplo real de produção (29/09 ~06:55 UTC, português)')
const PROD = 'HOOK (0-2s): [Pexels: skyline city view] Três quartos, metrô próximo... e 120 m² à sua espera!\n\nMICRO REWARD 1: [Pexels: city subway entrance] Localizado a poucos passos do metrô em São.\n\nMICRO REWARD 2: [Pexels: modern apartment interior] Espaço surpreendente e bem distribuído, perfeito para.\n\nPAYOFF: [Pexels: luxury apartment balcony] Além dos 120 m²... uma vista deslumbrante da cidade. Descubra seu novo lar. Seguir para mais!'
// O que o GPT escreveu antes do corte (reconstrução: o corte antigo, executado, tem de devolver o PROD byte a byte).
const PT = 'HOOK (0-2s): [Pexels: skyline city view] Três quartos, metrô próximo... e 120 m² à sua espera!\n\nMICRO REWARD 1: [Pexels: city subway entrance] Localizado a poucos passos do metrô em São Paulo, você chega a qualquer lugar em minutos.\n\nMICRO REWARD 2: [Pexels: modern apartment interior] Espaço surpreendente e bem distribuído, perfeito para receber a família e os amigos.\n\nPAYOFF: [Pexels: luxury apartment balcony] Além dos 120 m²... uma vista deslumbrante da cidade. Descubra seu novo lar.\nSeguir para mais!'
const SFB_SRC = rdBase('lib/shortFilmScript.ts')
const SFB = SFB_SRC ? roda(SFB_SRC) : null
const WB2 = rdBase('lib/scriptWriterRate.ts') ? roda(rdBase('lib/scriptWriterRate.ts')) : null
const velho = (t) => { const so4 = SFB.keepShortFilmSections(t); return SFB.fitShortFilmScript(so4.script, { maxWords: WB2.maxWordsFor(15, 3.1, 1), minWords: WB2.minWordsFor(15, 3.1, 1), countWords: conta }).script }
checa('a base está disponível e é a do corte por palavra (faixa 41–41)', Boolean(SFB && WB2) && WB2.minWordsFor(15, 3.1, 1) === 41)
checa('o corte ANTIGO sobre o roteiro reconstruído devolve o texto de produção BYTE A BYTE (a reconstrução é fiel)', Boolean(SFB) && velho(PT) === PROD)
const inteiras = (saida, original) => { const ok = new Set(frasesDe(original)); return frasesDe(saida).every((f) => ok.has(f)) }
checa('o texto de produção tem frase que não existe no original (cortada) e o detector acusa "perfeito para."', !inteiras(PROD, PT) && SF.truncatedSentences(PROD).includes('Espaço surpreendente e bem distribuído, perfeito para.'))

const EXEMPLOS = [
  { nome: 'pt · apartamento (o real)', lang: 'pt', texto: PT, cta: 'Seguir para mais!' },
  { nome: 'en · Death Valley', lang: 'en', cta: 'Follow for more.', texto: 'HOOK (0-2s): [Pexels: desert dry lake bed] Rocks in Death Valley move on their own.\n\nMICRO REWARD 1: [Pexels: rock trail cracked mud] They leave trails hundreds of meters long across a dry lake bed. For decades, nobody ever saw one move.\n\nMICRO REWARD 2: [Pexels: wind blowing desert sand] Theories blamed wind, algae and even pranksters. None of them explained the heaviest stones.\n\nPAYOFF: [Pexels: thin ice sheet sunrise] In 2014, GPS trackers finally caught them... sliding on thin sheets of winter ice.\nFollow for more.' },
  { nome: 'en · Lake Nyos', lang: 'en', cta: 'Like and follow for part 2!', texto: 'HOOK (0-2s): [Pexels: calm lake at night] One night in 1986, a lake killed 1,746 people. Nobody heard a sound.\n\nMICRO REWARD 1: [Pexels: volcanic crater lake aerial] Lake Nyos in Cameroon sits inside a volcanic crater that leaks carbon dioxide.\n\nMICRO REWARD 2: [Pexels: deep dark water] For centuries the gas stayed trapped under the cold bottom layer of water.\n\nPAYOFF: [Pexels: fog rolling over valley] Then a landslide flipped the layers... and a silent cloud rolled downhill, smothering everyone asleep.\nLike and follow for part 2!' },
  { nome: 'es · Salar de Uyuni', lang: 'es', cta: 'Sígueme para más datos.', texto: 'HOOK (0-2s): [Pexels: salt flat mirror sky] El espejo más grande del mundo está en Bolivia.\n\nMICRO REWARD 1: [Pexels: white salt flat aerial] El Salar de Uyuni cubre más de diez mil kilómetros cuadrados de sal. Es tan plano que los satélites lo usan para calibrarse.\n\nMICRO REWARD 2: [Pexels: lithium brine pools] Bajo la costra duerme casi la mitad del litio conocido del planeta, una reserva que vale una fortuna.\n\nPAYOFF: [Pexels: sky reflection water] Y cuando llueve... una capa de agua lo convierte en un espejo perfecto del cielo.\nSígueme para más datos.' },
]

/** O predicado de cada exemplo (o mesmo para o código real e para os mutantes). */
function provaExemplo(fecho, ex) {
  const r = fecho(ex.texto)
  const out = r.script
  const cabs = cabecalhos(out)
  const payoffOriginal = primeiraDe(ex.texto, 'PAYOFF')
  const semCta = !out.includes(ex.cta) && !frasesDe(out).some((f) => CTA_RE.test(f) && f.split(/\s+/).length <= 8)
  const blocos = cabs[0] === 'HOOK' && cabs[cabs.length - 1] === 'PAYOFF' && cabs.some((c) => c.startsWith('MICRO REWARD')) && primeiraDe(out, 'HOOK') === primeiraDe(ex.texto, 'HOOK') && primeiraDe(out, 'PAYOFF') === payoffOriginal
  const n = conta(out)
  return { r, out, n, inteiras: inteiras(out, ex.texto) && SF.truncatedSentences(out).length === 0, semCta, blocos, faixa: n >= PISO && n <= TETO }
}
const fechoNovo = (t) => SF.finishShortFilmScript(t, ARGS)

console.log('3) os 4 exemplos (pt real + 2 en + 1 es): frases inteiras, sem CTA, blocos, faixa, guarda/portão/ensaio do cinematic')
for (const ex of EXEMPLOS) {
  const p = provaExemplo(fechoNovo, ex)
  const c = planoDoCinematic(p.out, ex.lang)
  console.log(`     ${ex.nome}: ${conta(ex.texto)} → ${p.n} palavras · corte ${p.r.cut} · blocos fora ${JSON.stringify(p.r.droppedBlocks)} · CTA fora ${JSON.stringify(p.r.ctaRemoved)} · persona ${c.persona} ${c.wps} pal/s · 3 × ${c.s} s`)
  checa(`${ex.nome}: nenhuma frase truncada (toda frase é do original, inteira; detector limpo)`, p.inteiras)
  checa(`${ex.nome}: sem CTA de rede social ("${ex.cta}" saiu)`, p.semCta && p.r.ctaRemoved.includes(ex.cta))
  checa(`${ex.nome}: HOOK e PAYOFF preservados (1ª frase intacta), ao menos um MICRO REWARD, na ordem`, p.blocos)
  checa(`${ex.nome}: ${p.n} palavras dentro da faixa ${PISO}–${TETO}`, p.faixa && !p.r.belowFloor && !p.r.overCeiling)
  checa(`${ex.nome}: a guarda do filme curto aceita, o portão de narração passa (${c.gate.speech.toFixed(1)} s ≥ ${(15 * NF.MIN_COVERAGE).toFixed(2)} s) e o ensaio de $0 dá PASS em ${c.cenas} cenas`, c.guarda.ok === true && c.gate.ok === true && c.ensaio.pass === true && c.cenas === 3)
}
{
  // A tabela por persona do exemplo real (o portão do cinematic mede na voz da persona; a rota a escolhe pelo roteiro).
  const out = fechoNovo(PT).script
  const narr = P.parseUserScript(out).narration
  const tabela = PERS.VOICE_PERSONAS.map((p) => { const rate = SR.speechRateFor({ family: 'classic', language: 'pt', voice: p.voice, personaSpeed: p.defaultSpeed }); return `${p.id} ${rate.wordsPerSecond}:${SR.narrationFitAt(narr, 15, rate).ok ? 'ok' : 'curto'}` })
  console.log(`     portão por persona, exemplo real consertado: ${tabela.join(' · ')}`)
}

// ═══ 4. bordas ═══
console.log('4) bordas: acima do teto vence abaixo do piso; abaixo do piso nada é picado nem enchido')
{
  const frase = (k, n) => Array.from({ length: n }, (_, i) => (i === 0 ? `${k.toUpperCase()}` : `${k}${i}`)).join(' ') + '.'
  const BORDA = [`HOOK: [Pexels: a] ${frase('h', 10)}`, `MICRO REWARD 1: [Pexels: b] ${frase('m', 20)}`, `MICRO REWARD 2: [Pexels: c] ${frase('n', 20)}`, `PAYOFF: [Pexels: d] ${frase('p', 16)}`].join('\n\n')
  const r = SF.fitShortFilmScript(BORDA, ARGS)
  checa(`frases longas demais (10/20/20/16): nenhuma combinação na faixa → ${r.words} palavras com um MICRO REWARD (≤ teto duro ${DURO}), não ${10 + 16} só com HOOK+PAYOFF`, r.words === 46 && r.overCeiling === true && r.words <= DURO && cabecalhos(r.script).includes('MICRO REWARD 1') && inteiras(r.script, BORDA))
  const semDuro = SF.fitShortFilmScript(BORDA, { ...ARGS, hardMaxWords: undefined })
  checa('sem o teto duro (o que a rota passa no Seedance), a mesma borda cairia abaixo do piso — o argumento da rota importa', semDuro.words === 26 && semDuro.belowFloor === true)
  const CURTO = 'HOOK: [Pexels: a] Short hook here.\n\nMICRO REWARD 1: [Pexels: b] One small fact.\n\nPAYOFF: [Pexels: c] The answer lands now.'
  const rc = SF.finishShortFilmScript(CURTO, ARGS)
  checa('roteiro abaixo do piso: sai intacto (belowFloor) — a rota pede 1 nova tentativa e, se ainda faltar, aceita frases inteiras', rc.script === CURTO && rc.belowFloor === true && rc.cut === 'none')
  checa('a rota aceita o roteiro abaixo do piso depois da nova tentativa (segue "degraded", nunca pica nem enche)', GS.includes('still imperfect after retry — using it anyway (degraded)'))
}

// ═══ 5. CTA ═══
console.log('5) CTA de rede social: detector, prompt de ≤ 20 s, reforço da nova tentativa')
{
  const ctas = ['Follow for more.', 'Follow for more', 'Seguir para mais!', 'Siga para mais dicas como esta.', 'Sígueme para más datos.', 'Like and follow for part 2!', 'Subscribe!', 'Inscreva-se já!', 'Síguenos para más.', 'Follow Kineo for daily facts.']
  const conteudo = ['Follow the money.', 'Siga pela Avenida Ibirapuera e chegue ao parque em cinco minutos.', 'Scientists follow the rocks for more than a decade.', 'Seguir as regras salvou a tripulação.', 'Curta a vista da varanda.', 'Sigue el río hasta la costa.', 'Descubra seu novo lar.']
  checa(`detector: ${ctas.length} CTAs em pt/en/es reconhecidos`, ctas.every((c) => SF.isSocialCta(c)))
  checa(`detector: ${conteudo.length} frases de conteúdo com follow/siga/seguir/sigue NÃO são CTA`, conteudo.every((c) => !SF.isSocialCta(c)))
  const fn = funcaoDe(GS, 'buildSystemPrompt')
  const monta = (src) => {
    const ctx = { LANGUAGE_NAMES: { pt: 'Brazilian Portuguese', es: 'Spanish', en: 'English' }, WORDS_PER_SECOND: 2.3, MIN_COVERAGE: NF.MIN_COVERAGE, minWordsFor: W.minWordsFor, maxWordsFor: W.maxWordsFor }
    vm.runInNewContext(ts.transpileModule(`${src}; this.f = buildSystemPrompt`, { compilerOptions: { target: 9 } }).outputText, ctx)
    return ctx.f
  }
  const provaPrompt = (f) => {
    const p15 = f('pt', 15, 3.1, 1), p60 = f('pt', 60, 3.1, 1)
    return !/follow CTA|follow\/save CTA is SEPARATE|revelation and the CTA/.test(p15) && p15.includes('Do NOT add any follow/subscribe/like call to action') && p15.includes('NO follow/subscribe/like call to action anywhere') && p15.includes(`Total script: ${PISO}-${TETO} spoken words`) &&
      p60.includes('Then, on its OWN line, a short follow CTA in the chosen language.') && p60.includes('- The follow/save CTA is SEPARATE and comes AFTER the payoff reveal — it never replaces it.')
  }
  const PROMPT = fn ? monta(fn) : null
  checa(`prompt de 15 s: sem pedido de CTA, "NO follow… call to action", faixa ${PISO}-${TETO}; o de 60 s continua pedindo o CTA (intocado)`, Boolean(PROMPT) && provaPrompt(PROMPT))
  const mutPrompt = fn && trocaUma(fn, "${targetSeconds <= 20 ? ' Do NOT add any follow/subscribe/like call to action — this film ends on the reveal.' : ' Then, on its OWN line, a short follow CTA in the chosen language.'}", ' Then, on its OWN line, a short follow CTA in the chosen language.')
  checa('mutante: o prompt de 15 s volta a pedir o CTA → VERMELHO', mutPrompt !== null && !provaPrompt(monta(mutPrompt)))
  const reforco = SF.shortFilmRetryInstruction(TETO, PISO, 15)
  checa('reforço da nova tentativa: contagem explícita (at least/at most/aim for), frases completas, sem CTA', reforco.includes(`Use at least ${PISO} and at most ${TETO} spoken words`) && reforco.includes(`aim for about ${TETO}`) && reforco.includes('Every sentence must be complete') && reforco.includes('Do NOT add any follow/subscribe/like call to action'))
}

// ═══ 6. a rota ═══
console.log('6) /api/generate-script: o fecho corre depois da 1ª geração e da nova tentativa, com o teto duro')
{
  const L_DURO = "    const tetoDuroFilmeCurto = isSeedance15(typeof body.engine === 'string' ? body.engine : null) ? Math.max(tetoFilmeCurto, maxWordsForShortFilm(alvoSegundos)) : tetoFilmeCurto"
  const L_FECHO = '      const fim = finishShortFilmScript(t, { maxWords: tetoFilmeCurto, minWords: pisoFilmeCurto, countWords: palavrasDoFilmeCurto, hardMaxWords: tetoDuroFilmeCurto })'
  const L_1A = '      fimDoFilmeCurto = fecharFilmeCurto(so4.script)'
  const L_DECIDE = '    if (missing.length > 0 || payoffIsEmpty(script) || curtoParaOAlvo(script) || longoParaOFilmeCurto(script)) {'
  const L_2A = '            const fimDaTentativa = fecharFilmeCurto(retryScript)'
  const L_MELHOR = '            if (segundaEMelhor(script, fimDaTentativa.script)) { script = fimDaTentativa.script; fimDoFilmeCurto = fimDaTentativa }'
  const L_PRONTO = "        const so4Pronto = keepShortFilmSections(stripSocialCta(topic).script) // KINEO-ROTEIRO-15S-FRASE-INTEIRA: sem \"Follow for more\""
  const todas = [L_DURO, L_FECHO, L_1A, L_DECIDE, L_2A, L_MELHOR, L_PRONTO, '        const semCtaPronto = stripSocialCta(topic)', '    const tetoFilmeCurto = Math.min(maxWordsFor(alvoSegundos, regua.wordsPerSecond, regua.coverage), maxWordsForShortFilm(alvoSegundos))']
  const idx = (l) => linhas(GS).indexOf(l)
  checa('linhas inteiras presentes: teto duro (só Seedance), fecho com hardMaxWords, 1ª geração → decisão → nova tentativa → a melhor das duas; texto pronto sem CTA', todas.every((l) => temLinha(GS, l)) && idx(L_1A) < idx(L_DECIDE) && idx(L_DECIDE) < idx(L_2A) && idx(L_2A) < idx(L_MELHOR))
  checa('nenhum corte por palavra sobrevive: o tipo do corte é "none" | "sentences" na lib e na rota', !SF_SRC.includes("'words'") && GS.includes("let corteDoFilmeCurto: 'none' | 'sentences' = fimDoFilmeCurto?.cut ?? 'none'") && !GS.includes("'none' | 'sentences' | 'words'"))
  checa('o rastro script_written ganha piso, abaixo do piso, blocos tirados, CTA tirado e frases truncadas', GS.includes('short_film_floor: pisoFilmeCurto, short_film_below_floor: palavrasDoFilmeCurto(script) < pisoFilmeCurto, short_film_blocks_dropped: fimDoFilmeCurto?.droppedBlocks ?? [], short_film_cta_removed: fimDoFilmeCurto?.ctaRemoved.length ?? 0, short_film_truncated_sentences: truncatedSentences(script).length'))
}

// ═══ 7. mutantes ═══
console.log('7) mutantes (todos precisam ficar VERMELHOS)')
{
  const todosVerdes = (fecho) => EXEMPLOS.every((ex) => { const p = provaExemplo(fecho, ex); return p.inteiras && p.semCta && p.blocos && p.faixa })
  checa('controle: o fecho real passa no predicado dos 4 exemplos (senão o vermelho dos mutantes não prova nada)', todosVerdes(fechoNovo))
  // a) de volta ao corte por palavra — a BASE executada (o código que estava no ar)
  const fechoBase = (t) => { const so4 = SFB.keepShortFilmSections(t); return SFB.fitShortFilmScript(so4.script, { maxWords: WB2.maxWordsFor(15, 3.1, 1), minWords: WB2.minWordsFor(15, 3.1, 1), countWords: conta }) }
  checa('mutante: o corte da base (por palavra, 41–41) → VERMELHO no exemplo real (frase picada e CTA)', Boolean(SFB) && (() => { const p = provaExemplo((t) => ({ ...fechoBase(t), ctaRemoved: [], droppedBlocks: [] }), EXEMPLOS[0]); return !p.inteiras && !p.semCta })())
  // b) de volta ao corte por palavra — em memória no código novo (cada palavra vira "frase")
  const mutPalavra = trocaUma(SF_SRC, '  return body.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean)', '  return body.split(/\\s+/).map((s) => s.trim()).filter(Boolean)')
  checa('mutante: o fecho novo cortando por palavra → VERMELHO (frases picadas em algum exemplo)', mutPalavra !== null && (() => { const M = roda(mutPalavra); return EXEMPLOS.some((ex) => !provaExemplo((t) => M.finishShortFilmScript(t, ARGS), ex).inteiras) })())
  // c) piso = teto: o fecho recebe a faixa do mutante — o exemplo real (39) fica abaixo do piso
  const Wm = roda(mutPisoTeto)
  const pisoM = Wm.minWordsFor(15, 3.1, 1), tetoM = Wm.maxWordsFor(15, 3.1, 1)
  const rM = SF.finishShortFilmScript(PT, { ...ARGS, minWords: pisoM, maxWords: tetoM })
  checa(`mutante: piso = teto (${pisoM}–${tetoM}) → VERMELHO (sem combinação de frases em 41 exatas, o exemplo real sai com ${rM.words} palavras, fora da faixa ${PISO}–${TETO})`, pisoM === tetoM && (rM.words < PISO || rM.words > TETO || rM.overCeiling || rM.belowFloor))
  // d) CTA de volta no fecho
  const mutCta = trocaUma(SF_SRC, '  const semCta = stripSocialCta(so4.script)', '  const semCta = { script: so4.script, removed: [] as string[] }')
  checa('mutante: o fecho sem tirar o CTA → VERMELHO (o CTA volta em algum exemplo — o corte por frases só o tira quando precisa caber)', mutCta !== null && (() => { const M = roda(mutCta); return EXEMPLOS.some((ex) => !provaExemplo((t) => M.finishShortFilmScript(t, ARGS), ex).semCta) })())
  // e) sem a combinação que prefere a faixa: o fecho escolhe o menor texto (tira tudo o que pode)
  const mutMinimo = trocaUma(SF_SRC, "    return { tirar, faixa, chave: [RANK[faixa], payoffInteiro, vivos, faixa === 'acima' ? -palavras : palavras, -quantas, tarde] }", '    return { tirar, faixa, chave: [quantas] }')
  checa('mutante: o corte que tira o máximo de frases (sem preferir a faixa) → VERMELHO', mutMinimo !== null && (() => { const M = roda(mutMinimo); return EXEMPLOS.some((ex) => { const p = provaExemplo((t) => M.finishShortFilmScript(t, ARGS), ex); return !p.faixa || !p.blocos }) })())
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) { console.log('FALHOU:\n - ' + falhas.join('\n - ')); process.exit(1) }
console.log('PASS — o roteiro do filme de 15 s sai com frases inteiras, sem CTA de rede social, dentro da faixa 36–41.')
