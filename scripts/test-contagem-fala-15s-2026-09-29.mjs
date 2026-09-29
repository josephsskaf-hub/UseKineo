// KINEO-CONTAGEM-FALA-15S-2026-09-29 [TRAVA 8.2 — "vai" do 15 s] — guardião: escritor, guarda, plano 3x6 e ensaio de $0
// contam a MESMA fala do filme de 15 s, e nenhum bloco do roteiro some das cenas.
//
// Defeito medido em produção (d8bbbd6f, 29/09 ~08:05 UTC), caminho "Let AI structure it" do filme grátis de 15 s
// (Seedance 1.5): /api/generate-script devolveu words=40 para o roteiro do Lago Nyos (4 blocos: HOOK, MICRO REWARD 1,
// MICRO REWARD 2, PAYOFF) e o ensaio de $0 do cinematic respondeu "FAIL — narração de 11.8s … 29 palavras contra 37
// esperadas (-22%)", clip_seconds [7,7,7]. Em português: words=41 e o ensaio contou 33 (PASS com 14,3 s).
//
// CAUSA (provada aqui executando o código real): NÃO é contagem de palavra — reticências, "1,700", "CO2", "It's", o
// "(0-2s)" e as pistas [Pexels: …] contam igual no escritor, na guarda e no ensaio. É um BLOCO INTEIRO que sumia das
// cenas: com 4 blocos e 3 clipes, a rota do cinematic montava as cenas com resolveVerbatimSegments (lib/cinematic/
// verbatimBeats), que SORTEIA 3 blocos por índice (round(i × 3 ÷ 2) = 0, 2, 3) — o MICRO REWARD 1 (11 palavras em inglês,
// 8 em português) saía. 29 = 40 − 11; 33 = 41 − 8. O ensaio soma as falas das CENAS; a voz lê voiceover_script, que no
// verbatim é a narração INTEIRA (parsedScript.narration) — por isso a narração falada nunca perdeu palavra: o que se
// perdia era a imagem do bloco (a pista [Pexels: volcanic crater aerial] nunca virava clipe; o clipe do HOOK cobria a fala
// do bloco sumido) e o veredito do ensaio (FAIL falso em inglês; em português, PASS por sorte da voz mais lenta).
//
// CONSERTO: no filme de 15 s com mais blocos que os 3 clipes, os blocos VIZINHOS se juntam em 3 cenas
// (lib/durationByEngine seedanceShortMarkedScenes, bloco novo da rota logo depois do de "menos de 3 blocos"): a soma das
// falas das cenas é a narração inteira, palavra por palavra.
//
// Este guardião EXECUTA o código real (readFileSync + transpile + vm; loader offline, sem rede/banco/OpenAI) e prova:
//   1. a causa: na BASE (a rota sem o bloco novo, executada) o ensaio reproduz os números de produção — inglês 29 palavras
//      e o FAIL de 11.8s/37/-22% com [7,7,7]; português 33 palavras, PASS 14.3s — e as 11/8 palavras que faltam são
//      exatamente as do MICRO REWARD 1; os tokens suspeitos contam igual nas três réguas;
//   2. a voz: voiceover_script = parsedScript.narration (verbatim, ligado pelos marcadores mesmo com script_mode 'ai') e o
//      compose não reescala narração de claim verbatim — nenhuma frase sumia do áudio (antes ou agora);
//   3. o conserto, com as fatias REAIS da rota: 3 cenas cuja soma é a narração inteira; escritor = guarda = ensaio (40 em
//      inglês, 41 em português), PASS; toda frase do roteiro em exatamente uma cena; toda pista [Pexels] numa cena; o plano
//      3x6 mede a MESMA narração (palavras faladas = as mesmas + a expansão declarada dos números: "1,700" = 4);
//      clip_word_starts fatia a narração nas cenas; a maior cena é a menor possível;
//   4. fora do 15 s, e no 15 s com até 3 blocos ou prosa, nada muda;
//   5. a lib (pura) em casos gerados: 3 cenas, nenhuma palavra fora/fora de ordem, ótimo, fala antes do 1º marcador;
//   6. mutantes, todos VERMELHOS: rota sem o bloco; bloco que nunca liga; lib que sorteia; lib que fica só com o 1º bloco
//      do grupo; lib sem o critério da maior cena; lib que perde a fala antes do 1º marcador.
// O roteiro em português foi RECONSTRUÍDO (o texto literal não veio no relato): 4 blocos com 10/8/10/13 palavras — o
// escritor conta 41 e o ensaio antigo 33, a pista "misty mountain lake" leva à persona de 2,3 pal/s (luxury-narrator),
// e o ensaio antigo dá o mesmo PASS de 14,3 s de produção.
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
const trocaUma = (src, a, b) => (src != null && src.split(a).length === 2 ? src.split(a).join(b) : null)
const fatia = (src, ini, fim) => { if (src == null) return null; const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fim, a + ini.length); return b < 0 ? null : src.slice(a, b + fim.length) }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const palavras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean)
const L = createOfflineLoader()
const SILENCIO = { log() {}, warn() {}, error() {} }
/** Executa uma fonte TS (real ou mutante) com os imports resolvidos pelo loader offline. */
const roda = (src, globals = {}) => {
  if (src == null) throw new Error('fonte ausente')
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9, esModuleInterop: true } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, require: (n) => L(n), console: SILENCIO, Math, Number, Array, Object, JSON, Set, Map, String, RegExp, process: { env: {} }, ...globals })
  return exports
}

// BASE = o "antes" deste conserto (memória "trava por diff fica verde ao mergear"): o pai do 1º commit com o marcador na
// história de HEAD; antes do commit, o próprio HEAD; senão origin/main — a que NÃO tem o marcador na rota.
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
const MARCA = 'KINEO-CONTAGEM-FALA-15S-2026-09-29'
const ROTA_P = 'app/api/generate-video-cinematic/route.ts'
let BASE = null
{
  const candidatos = []
  try { const shas = git(['log', '--format=%H', '--grep=CONTAGEM-FALA-15S', 'HEAD']).trim().split(LF).filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:${ROTA_P}`]).includes(MARCA)) { BASE = ref; break } } catch { /* próximo */ }
  }
}
const rdBase = (p) => { if (!BASE) return null; try { return git(['show', `${BASE}:${p}`]).split(CR + LF).join(LF) } catch { return null } }
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)

const D_SRC = rd('lib/durationByEngine.ts')
const D = roda(D_SRC) // módulo puro, sem import
const P = L('lib/scriptParser.ts')
const VB = L('lib/cinematic/verbatimBeats.ts')
const DR = L('lib/cinematic/classicDryRun.ts')
const SR = L('lib/speechRate.ts')
const NM = L('lib/narration/niche-mapping.ts')
const K = L('lib/cinematic/klingShots.ts')
const W = L('lib/scriptWriterRate.ts')
const SF = L('lib/shortFilmScript.ts')
const PERDA = K.KLING25_CLIP_LOSS_SECONDS
const GS = rd('app/api/generate-script/route.ts')
const ROTA = rd(ROTA_P)
const ROTA_BASE = rdBase(ROTA_P)
const D_BASE = rdBase('lib/durationByEngine.ts')
const COMPOSE = rd('app/api/compose/route.ts')
checa('a base (a rota sem o bloco novo) está disponível para reproduzir o defeito', Boolean(BASE && ROTA_BASE && D_BASE) && !ROTA_BASE.includes(MARCA))

// ═══ as réguas ═══
// ESCRITOR: /api/generate-script responde words = scriptWordCount(script) e mede o filme curto com palavrasDoFilmeCurto.
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
const falaNaReguaDaGuarda = (t) => P.parseUserScript(t).narration.split(/\s+/).filter(Boolean).length
const palavrasDoFilmeCurto = (t) => Math.max(scriptWordCount(t), falaNaReguaDaGuarda(t))
checa('as réguas do escritor são as da rota (scriptWordCount extraída da fonte; palavrasDoFilmeCurto e a resposta words: scriptWordCount(script), linhas inteiras)',
  Boolean(swcSrc) &&
  temLinha(GS, '    const falaNaReguaDaGuarda = (t: string) => parseUserScript(t).narration.split(/\\s+/).filter(Boolean).length') &&
  temLinha(GS, '    const palavrasDoFilmeCurto = (t: string) => Math.max(scriptWordCount(t), falaNaReguaDaGuarda(t))') &&
  temLinha(GS, '    return NextResponse.json({ script, alreadyStructured: false, wordsPerSecond: regua.wordsPerSecond, family: regua.family, targetSeconds: alvoSegundos, minWords: alvoPalavras, words: scriptWordCount(script), pastedScript: colado.pasted, pastedReason: colado.reason })'))
// GUARDA: a rota chama checarFalaDoFilmeCurto com parsedScript.narration (palavras ÷ 2,5 pal/s).
checa('a guarda de roteiro longo recebe parsedScript.narration (linha inteira da rota)', temLinha(ROTA, "      const falaCurta = checarFalaDoFilmeCurto({ engine: typeof body.engine === 'string' ? body.engine : null, seconds: duration, verbatim, narration: parsedScript.narration })"))
const palavrasDaGuarda = (narr) => Math.round(D.checarFalaDoFilmeCurto({ engine: 'seedance', seconds: 15, verbatim: true, narration: narr }).estSeconds * D.VERBATIM_EST_WORDS_PER_SECOND)
// A faixa do escritor do 15 s, como a rota a monta (lib/scriptWriterRate + a guarda).
const faixa = (lang) => {
  const regua = W.writerRateFor('cinematic_ai', 'x', lang)
  const teto = Math.min(W.maxWordsFor(15, regua.wordsPerSecond, regua.coverage), D.maxWordsForShortFilm(15))
  const piso = Math.min(W.minWordsFor(15, regua.wordsPerSecond, regua.coverage), teto)
  return { maxWords: teto, minWords: piso, countWords: palavrasDoFilmeCurto, hardMaxWords: Math.max(teto, D.maxWordsForShortFilm(15)) }
}
/** A expansão declarada do plano 3x6 (lib/durationByEngine palavrasFaladas): número conta pelos dígitos, até 4. */
const expansaoDosNumeros = (t) => palavras(t).reduce((a, w) => { const d = (w.match(/[0-9]/g) ?? []).length; return a + (d > 0 ? Math.min(4, d) - 1 + (/[%$€£]/.test(w) ? 1 : 0) : 0) }, 0)

// ═══ os dois roteiros ═══
const EN = "HOOK (0-2s): [Pexels: foggy lake surface] Lake Nyos killed 1,700 people... in one night.\n\nMICRO REWARD 1: [Pexels: volcanic crater aerial] It's a volcanic crater lake in Cameroon, charged with carbon dioxide.\n\nMICRO REWARD 2: [Pexels: gas bubbling water] That night, CO2 suddenly erupted, displacing oxygen, suffocating nearby villages.\n\nPAYOFF: [Pexels: eerie village morning] The silent gas cloud spread fast... taking 1,700 lives in minutes."
const PT = 'HOOK (0-2s): [Pexels: misty mountain lake] O Lago Nyos matou 1.700 pessoas... em uma única noite.\n\nMICRO REWARD 1: [Pexels: volcanic crater aerial] É um lago de cratera vulcânica em Camarões.\n\nMICRO REWARD 2: [Pexels: gas bubbling water] Naquela noite, o CO2 escapou de repente, sufocando as vilas.\n\nPAYOFF: [Pexels: eerie village morning] A nuvem silenciosa de gás desceu rápido... e levou 1.700 vidas em minutos.'
const CASOS = [
  { nome: 'en · Lago Nyos (produção)', lang: 'en', texto: EN, escritor: 40, blocos: [8, 11, 10, 11], antes: { palavras: 29, pass: false, fala: 11.8 }, depois: { pass: true, fala: 16.3 }, clipe: 7, grupos: [19, 10, 11] },
  { nome: 'pt · Lago Nyos (reconstruído)', lang: 'pt', texto: PT, escritor: 41, blocos: [10, 8, 10, 13], antes: { palavras: 33, pass: true, fala: 14.3 }, depois: { pass: true, fala: 17.8 }, clipe: 8, grupos: [10, 18, 13] },
]
const corposDe = (t) => t.split(/\n\s*\n/).map((b) => b.replace(/^[^\]]*\]\s*/, '').trim()).filter(Boolean)
const frasesDe = (t) => corposDe(t).flatMap((c) => c.split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}])/u).map((s) => s.trim()).filter(Boolean))
const pistasDe = (t) => [...t.matchAll(/\[Pexels:\s*([^\]]+?)\s*\]/g)].map((m) => m[1])

// A persona e a régua que a rota usa (selectPersonaForScript no texto do prompt, tier cinematic; speechRateFor clássico).
const reguaDaRota = (texto, lang) => {
  const pers = NM.selectPersonaForScript(texto, undefined, 'cinematic', lang)
  const parsed = P.parseUserScript(texto)
  return { persona: pers?.id ?? '-', rate: SR.speechRateFor({ family: 'classic', speed: parsed.speed, language: lang, voice: pers?.voice, personaSpeed: pers?.defaultSpeed }) }
}

// ═══ o harness: as FATIAS REAIS da rota, na ordem em que a rota as roda ═══
const INI_PICK = '      const picked = resolveVerbatimSegments(parsedScript, clipCount)\n'
const FIM_PICK = '      }))\n'
const INI_MENOR = '    if (seedanceShortFilm && verbatim && scenes.length > 0 && scenes.length < SEEDANCE_SHORT_CLIPS && parsedScript.narration) {\n'
const INI_MAIOR = '    if (seedanceShortFilm && verbatim && parsedScript.segments.length > SEEDANCE_SHORT_CLIPS) {\n'
const FIM_BLOCO = '        clipCount = scenes.length\n      }\n    }\n'
const INI_SEG = '    let seedanceClipSeconds: number[] | null = null\n'
const FIM_SEG = 'palavras)`)\n    }\n'
const INI_REL = '      const relatorioSeedance = seedanceClipSeconds\n'
const FIM_REL = '        : null\n'
const INI_VOZ = '    const voiceoverScript = verbatim && parsedScript.narration\n'
const FIM_VOZ = "      : scenes.map((s) => s.voiceover).filter(Boolean).join(' ')\n"
const fatiasDe = (src) => ({ pick: fatia(src, INI_PICK, FIM_PICK), menor: fatia(src, INI_MENOR, FIM_BLOCO), maior: fatia(src, INI_MAIOR, FIM_BLOCO), seg: fatia(src, INI_SEG, FIM_SEG), rel: fatia(src, INI_REL, FIM_REL), voz: fatia(src, INI_VOZ, FIM_VOZ) })
function rodaRota(src, Dx, { texto, lang, seedanceShortFilm = true, clipCount = 3 }) {
  const f = fatiasDe(src)
  if (!f.pick || !f.menor || !f.seg || !f.rel || !f.voz) return null
  const parsedScript = P.parseUserScript(texto)
  const { rate } = reguaDaRota(texto, lang)
  const modulo = `export function run() {\n let clipCount = ${clipCount}\n let scenes: any[] = []\n${f.pick}${f.menor}${f.maior ?? ''}${f.seg}\n const classicScenePrompts = scenes.map(() => 'x')\n${f.rel}${f.voz}\n return { scenes, clipCount, seedanceClipSeconds, relatorioSeedance, voiceoverScript }\n}`
  return roda(modulo, {
    parsedScript, verbatim: true, seedanceShortFilm, duration: 15, narrationRate: rate,
    resolveVerbatimSegments: VB.resolveVerbatimSegments, shortCaptionFromVoiceover: (t) => t,
    SEEDANCE_SHORT_CLIPS: Dx.SEEDANCE_SHORT_CLIPS, seedanceShortMarkedScenes: Dx.seedanceShortMarkedScenes,
    seedanceShortSpeechSeconds: Dx.seedanceShortSpeechSeconds, seedanceShortClipSeconds: Dx.seedanceShortClipSeconds,
    KLING25_CLIP_LOSS_SECONDS: PERDA, SEEDANCE_720P_USD_PER_SECOND: 0.026, classicDryRunReport: DR.classicDryRunReport,
  }).run()
}

// ═══ 1. a causa ═══
console.log('1) a causa: na base, um bloco inteiro sai das cenas (não é contagem de palavra)')
{
  const suspeitos = "HOOK (0-2s): [Pexels: foggy lake surface] people... 1,700 CO2 It's fast..."
  checa('reticências, "1,700", "CO2", "It\'s", "(0-2s)" e [Pexels: …] contam igual no escritor, na guarda e no ensaio (5 palavras nos três)',
    scriptWordCount(suspeitos) === 5 && palavrasDaGuarda(P.parseUserScript(suspeitos).narration) === 5 &&
    DR.classicDryRunReport({ scenes: [{ voiceover: P.parseUserScript(suspeitos).narration, prompt: 'x' }], targetSeconds: 15, secondsPerClip: 6, verbatim: true }).total_words === 5)
}
for (const c of CASOS) {
  const parsed = P.parseUserScript(c.texto)
  const fim = SF.finishShortFilmScript(c.texto, faixa(c.lang))
  const base = ROTA_BASE ? rodaRota(ROTA_BASE, roda(D_BASE), c) : null
  const rel = base?.relatorioSeedance
  const { persona, rate } = reguaDaRota(c.texto, c.lang)
  const faltou = parsed.segments.filter((s) => !(base?.scenes ?? []).some((sc) => sc.voiceover === s.voiceover))
  console.log(`     ${c.nome}: escritor ${scriptWordCount(c.texto)} · blocos ${JSON.stringify(parsed.segments.map((s) => palavras(s.voiceover).length))} · persona ${persona} ${rate.wordsPerSecond} pal/s · base: ${rel?.total_words} palavras nas cenas, ${rel?.verdict?.slice(0, 64)}…`)
  checa(`${c.nome}: o escritor conta ${c.escritor} (scriptWordCount = narração por espaço = soma dos blocos ${c.blocos.join('+')}) e o fecho do 15 s devolve o texto INTACTO (corte 'none')`,
    scriptWordCount(c.texto) === c.escritor && falaNaReguaDaGuarda(c.texto) === c.escritor && eqJ(parsed.segments.map((s) => palavras(s.voiceover).length), c.blocos) && fim.script === c.texto && fim.cut === 'none' && fim.words === c.escritor)
  checa(`${c.nome}: a base (rota sem o bloco novo, executada) reproduz produção — ${c.antes.palavras} palavras nas cenas, ${c.antes.pass ? 'PASS' : 'FAIL'} com ${c.antes.fala}s, clipes [${c.clipe},${c.clipe},${c.clipe}]`,
    Boolean(rel) && rel.total_words === c.antes.palavras && rel.pass === c.antes.pass && rel.speech_seconds === c.antes.fala && eqJ(base.seedanceClipSeconds, [c.clipe, c.clipe, c.clipe]))
  checa(`${c.nome}: as ${c.escritor - c.antes.palavras} palavras que faltam são EXATAMENTE as do MICRO REWARD 1 (o bloco que o sorteio 0,2,3 pulou)`,
    Boolean(base) && faltou.length === 1 && faltou[0] === parsed.segments[1] && palavras(faltou[0].voiceover).length === c.escritor - c.antes.palavras && eqJ(base.scenes.map((s) => s.stockSearchQuery), [0, 2, 3].map((i) => parsed.segments[i].pexelsQuery)))
}
{
  const rel = ROTA_BASE ? rodaRota(ROTA_BASE, roda(D_BASE), CASOS[0])?.relatorioSeedance : null
  checa('o veredito da base é o de produção, byte a byte: "FAIL — narração de 11.8s para um alvo de 15s (piso 14s) … 29 palavras contra 37 esperadas (-22%)"',
    Boolean(rel) && rel.verdict.startsWith('FAIL — narração de 11.8s para um alvo de 15s (piso 14s): o filme sairia curto ou o compose reescreveria o texto · 29 palavras contra 37 esperadas (-22%)'))
}

// ═══ 2. a voz ═══
console.log('2) a voz: lia a narração inteira antes e continua lendo (o defeito não tirava frase do áudio)')
{
  const L_VERB = '    const verbatim = (parsedScript.hasMarkers && parsedScript.segments.length > 0) || (userSaysVerbatim && !briefDetected)'
  checa('roteiro marcado liga o verbatim mesmo com script_mode "ai" (linha inteira da rota); o claim assina voiceover_script = parsedScript.narration',
    temLinha(ROTA, L_VERB) && temLinha(ROTA, '    const voiceoverScript = verbatim && parsedScript.narration') && temLinha(ROTA, '      ? parsedScript.narration') && temLinha(ROTA, '      voiceover_script: voiceoverScript,'))
  checa('o compose não reescala narração de claim verbatim: a TTS lê voiceover_script como veio (linhas inteiras de /api/compose)',
    temLinha(COMPOSE, '    const claimVerbatim = cinematicBirthClaim?.response?.verbatim === true') && temLinha(COMPOSE, '    } else if (explicitSpeed != null || claimVerbatim) {') && temLinha(COMPOSE, '      scaledScript = voiceoverScript'))
  for (const c of CASOS) {
    const parsed = P.parseUserScript(c.texto)
    const base = ROTA_BASE ? rodaRota(ROTA_BASE, roda(D_BASE), c) : null
    const agora = rodaRota(ROTA, D, c)
    checa(`${c.nome}: voiceover_script (base e agora) = a narração inteira, com todas as ${frasesDe(c.texto).length} frases do roteiro`,
      Boolean(base && agora) && base.voiceoverScript === parsed.narration && agora.voiceoverScript === parsed.narration && frasesDe(c.texto).every((f) => parsed.narration.includes(f)))
  }
}

// ═══ 3. o conserto ═══
console.log('3) o conserto (fatias reais da rota): escritor = guarda = ensaio; o plano 3x6 mede a mesma narração')
function provaRota(src, Dx, { log = false } = {}) {
  const r = []
  for (const c of CASOS) {
    const parsed = P.parseUserScript(c.texto)
    const x = rodaRota(src, Dx, c)
    if (!x) { r.push(false); continue }
    const rel = x.relatorioSeedance
    const falas = x.scenes.map((s) => s.voiceover)
    const escritor = scriptWordCount(c.texto), guarda = palavrasDaGuarda(parsed.narration), ensaio = rel?.total_words
    const faladas = D.palavrasFaladas(parsed.narration)
    const starts = K.kling25SceneWordStarts(x.voiceoverScript, falas)
    const nw = palavras(x.voiceoverScript)
    const fatiado = starts.map((a, i) => nw.slice(a, i + 1 < starts.length ? starts[i + 1] : nw.length).join(' '))
    const provas = {
      tres: x.scenes.length === 3 && x.clipCount === 3,
      soma: falas.join(' ') === parsed.narration && falas.join(' ') === x.voiceoverScript,
      contagem: escritor === c.escritor && guarda === escritor && ensaio === escritor,
      veredito: rel?.pass === true && rel.speech_seconds === c.depois.fala && rel.verdict.startsWith(`PASS — 3 cenas, ${c.escritor} palavras`),
      frases: frasesDe(c.texto).every((f) => falas.filter((v) => v.includes(f)).length === 1),
      pistas: pistasDe(c.texto).every((q) => x.scenes.filter((s) => String(s.stockSearchQuery).split(', ').includes(q)).length === 1),
      plano: eqJ(x.seedanceClipSeconds, [c.clipe, c.clipe, c.clipe]) && faladas === escritor + expansaoDosNumeros(parsed.narration) && faladas === Dx.palavrasFaladas(falas.join(' ')),
      inicios: starts[0] === 0 && starts.every((a, i) => i === 0 || a > starts[i - 1]) && eqJ(fatiado, falas),
      grupos: eqJ(falas.map((v) => palavras(v).length), c.grupos),
    }
    if (log) {
      console.log(`     ${c.nome}: escritor ${escritor} · guarda ${guarda} (${(guarda / 2.5).toFixed(1)} s × 2,5) · ensaio ${ensaio} (base ${c.antes.palavras}) · plano 3x6 ${faladas} faladas = ${escritor} + ${expansaoDosNumeros(parsed.narration)} dos números → [${x.seedanceClipSeconds}] · cenas ${JSON.stringify(falas.map((v) => palavras(v).length))} · inícios ${JSON.stringify(starts)}`)
      console.log(`       ${rel?.verdict?.slice(0, 120)}`)
      for (const [k, v] of Object.entries(provas)) if (!v) console.log(`       (falhou: ${k})`)
    }
    r.push(Object.values(provas).every(Boolean))
  }
  return r.every(Boolean)
}
checa('inglês e português: 3 cenas cuja soma é a narração inteira; escritor = guarda = ensaio (40/41), PASS (16,3 s/17,8 s); cada frase numa cena; cada pista [Pexels] numa cena; plano 3x6 sobre a MESMA narração (46/47 faladas = 40/41 + 6 dos dois "1,700"/"1.700") → [7,7,7]/[8,8,8]; clip_word_starts fatia a narração nas cenas',
  provaRota(ROTA, D, { log: true }))
{
  // A maior cena é a menor possível (força bruta independente sobre todos os cortes em 3 grupos vizinhos).
  const otimoDe = (ws) => { let m = Infinity; for (let a = 1; a < ws.length - 1; a++) for (let b = a + 1; b < ws.length; b++) { const s = [ws.slice(0, a), ws.slice(a, b), ws.slice(b)].map((g) => g.reduce((x, y) => x + y, 0)); m = Math.min(m, Math.max(...s)) } return m }
  checa('a maior cena é a menor possível (força bruta): inglês 19 (HOOK+MR1 | MR2 | PAYOFF), português 18 (HOOK | MR1+MR2 | PAYOFF) — PAYOFF sempre sozinho no último clipe',
    CASOS.every((c) => Math.max(...c.grupos) === otimoDe(c.blocos)) && CASOS.every((c) => { const x = rodaRota(ROTA, D, c); return x && x.scenes[2].voiceover === P.parseUserScript(c.texto).segments[3].voiceover }))
}

// ═══ 4. fora do 15 s / sem blocos a mais: nada muda ═══
console.log('4) fora do 15 s, e no 15 s com até 3 blocos ou prosa, as cenas são as de sempre')
{
  const CINCO = 'HOOK: [Pexels: a] One two three.\n\nMICRO REWARD 1: [Pexels: b] Four five six.\n\nMICRO REWARD 2: [Pexels: c] Seven eight nine.\n\nESCALATION: [Pexels: d] Ten eleven twelve.\n\nPAYOFF: [Pexels: e] Thirteen fourteen fifteen.'
  const TRES = 'HOOK: [Pexels: a] One two three four.\n\nMICRO REWARD 1: [Pexels: b] Five six seven eight.\n\nPAYOFF: [Pexels: c] Nine ten eleven twelve.'
  const PROSA = 'Lake Nyos killed 1,700 people in one night. It is a volcanic crater lake in Cameroon. That night the gas erupted. The cloud took 1,700 lives in minutes.'
  const igual = (a, b) => Boolean(a && b) && eqJ(a.scenes.map((s) => [s.voiceover, s.stockSearchQuery]), b.scenes.map((s) => [s.voiceover, s.stockSearchQuery])) && a.clipCount === b.clipCount
  const ok4 = ROTA_BASE && [
    [CINCO, { seedanceShortFilm: false, clipCount: 4 }], [CINCO, { seedanceShortFilm: false, clipCount: 3 }], [EN, { seedanceShortFilm: false, clipCount: 3 }],
    [TRES, { seedanceShortFilm: true, clipCount: 3 }], [PROSA, { seedanceShortFilm: true, clipCount: 3 }],
  ].every(([texto, o]) => igual(rodaRota(ROTA, D, { texto, lang: 'en', ...o }), rodaRota(ROTA_BASE, roda(D_BASE), { texto, lang: 'en', ...o })))
  checa('35/60/90 (seedanceShortFilm falso, 3 e 4 cenas, 5 blocos e o roteiro do Nyos) e o 15 s com 3 blocos ou prosa: cenas idênticas às da base', Boolean(ok4))
  const cinco15 = rodaRota(ROTA, D, { texto: CINCO, lang: 'en' })
  checa('15 s com 5 blocos (HOOK, MR1, MR2, ESCALATION, PAYOFF): 3 cenas com as 15 palavras, nenhum bloco fora', Boolean(cinco15) && cinco15.scenes.length === 3 && cinco15.scenes.map((s) => s.voiceover).join(' ') === P.parseUserScript(CINCO).narration)
}

// ═══ 5. a lib (pura) ═══
console.log('5) lib/durationByEngine seedanceShortMarkedScenes (pura): casos gerados')
function provaLib(Dx) {
  const r = { gerados: true, otimo: true, preambulo: true, guloso: true, curto: true }
  let semente = 7
  const aleatorio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648 }
  const otimoDe = (ws, k) => { let m = Infinity; const v = (i, g, mx) => { if (g === k - 1) { m = Math.min(m, Math.max(mx, ws.slice(i).reduce((a, b) => a + b, 0))); return } for (let j = i + 1; j <= ws.length - (k - 1 - g); j++) v(j, g + 1, Math.max(mx, ws.slice(i, j).reduce((a, b) => a + b, 0))) }; v(0, 0, 0); return m }
  for (let caso = 0; caso < 120; caso++) {
    const n = 4 + (caso % 9)
    const segs = Array.from({ length: n }, (_, i) => ({ voiceover: Array.from({ length: 1 + Math.floor(aleatorio() * 14) }, (_, j) => `w${i}_${j}`).join(' ') + '.', pexelsQuery: `cue ${i}` }))
    const narration = segs.map((s) => s.voiceover).join(' ')
    const out = Dx.seedanceShortMarkedScenes({ segments: segs, narration }, 3)
    const ws = segs.map((s) => palavras(s.voiceover).length)
    if (!(out.length === 3 && out.map((s) => s.voiceover).join(' ') === narration && out.every((s) => s.voiceover.length > 0) && out.map((s) => s.pexelsQuery).join(', ') === segs.map((s) => s.pexelsQuery).join(', '))) r.gerados = false
    if (Math.max(...out.map((s) => palavras(s.voiceover).length)) !== otimoDe(ws, 3)) r.otimo = false
  }
  {
    const segs = [{ voiceover: 'Hook here now.', pexelsQuery: 'a' }, { voiceover: 'One more fact.', pexelsQuery: 'b' }, { voiceover: 'Another fact here.', pexelsQuery: 'c' }, { voiceover: 'The answer lands.', pexelsQuery: 'd' }]
    const narration = 'Before the first cue. ' + segs.map((s) => s.voiceover).join(' ')
    const out = Dx.seedanceShortMarkedScenes({ segments: segs, narration }, 3)
    r.preambulo = out.length === 3 && out.map((s) => s.voiceover).join(' ') === narration && out[0].voiceover.startsWith('Before the first cue. Hook here now.')
  }
  {
    const segs = Array.from({ length: 250 }, (_, i) => ({ voiceover: `p${i}`, pexelsQuery: `q${i}` }))
    const narration = segs.map((s) => s.voiceover).join(' ')
    const out = Dx.seedanceShortMarkedScenes({ segments: segs, narration }, 3)
    const tam = out.map((s) => palavras(s.voiceover).length)
    r.guloso = out.length === 3 && out.map((s) => s.voiceover).join(' ') === narration && Math.max(...tam) - Math.min(...tam) <= 1
  }
  {
    const segs = [{ voiceover: 'A b c.', pexelsQuery: 'x' }, { voiceover: 'D e f.', pexelsQuery: 'y' }]
    const out = Dx.seedanceShortMarkedScenes({ segments: segs, narration: 'A b c. D e f.' }, 3)
    r.curto = eqJ(out, segs)
  }
  return r
}
{
  const r = provaLib(D)
  checa('120 roteiros gerados (4 a 12 blocos): sempre 3 cenas, nenhuma sem fala, soma = narração na ordem, pistas na ordem', r.gerados)
  checa('120 roteiros gerados: a maior cena é sempre a menor possível (força bruta independente)', r.otimo)
  checa('fala antes do 1º marcador entra na 1ª cena (a soma continua sendo a narração inteira)', r.preambulo)
  checa('250 blocos (acima do limite de comparação): divisão por fala acumulada, 3 cenas equilibradas, nenhuma palavra fora', r.guloso)
  checa('até 3 blocos: devolve os blocos como estão (a rota nem chama)', r.curto)
  checa('lib/durationByEngine continua pura (zero import)', !/^\s*import\s/m.test(D_SRC))
}

// ═══ 6. a rota: linhas, ordem, diff ═══
console.log('6) a rota: import em linha própria, bloco depois do de "menos de 3 blocos" e antes dos segundos e do ensaio; só ganhou linhas')
{
  const L_IMPORT = "import { seedanceShortMarkedScenes } from '@/lib/durationByEngine' // [TRAVA 8.2 — \"vai\" do 15 s] KINEO-CONTAGEM-FALA-15S-2026-09-29 (linha própria: a rota só GANHA linhas)"
  const L_CHAMA = '      const juntos = seedanceShortMarkedScenes(parsedScript, SEEDANCE_SHORT_CLIPS)'
  const i = (t) => ROTA.indexOf(t)
  checa('import em linha própria; o bloco chama a lib com parsedScript e 3; ordem: sorteio → menos de 3 blocos → mais de 3 blocos → segundos dos clipes → ensaio → voiceover_script',
    temLinha(ROTA, L_IMPORT) && temLinha(ROTA, L_CHAMA) && i(INI_PICK) > 0 && i(INI_PICK) < i(INI_MENOR) && i(INI_MENOR) < i(INI_MAIOR) && i(INI_MAIOR) < i(INI_SEG) && i(INI_SEG) < i(INI_REL) && i(INI_REL) < i(INI_VOZ))
  if (ROTA_BASE && BASE) {
    // Depois do commit, o diff é BASE → o próprio commit do marcador (merges futuros da main não entram); antes, BASE → árvore.
    let commitDoMarcador = null
    try { const shas = git(['log', '--format=%H', '--grep=CONTAGEM-FALA-15S', 'HEAD']).trim().split(LF).filter(Boolean); if (shas.length) commitDoMarcador = shas[shas.length - 1] } catch { /* sem commit */ }
    const diff = git(['diff', '--no-color', '-U0', BASE, ...(commitDoMarcador ? [commitDoMarcador] : []), '--', ROTA_P]).replace(/\r/g, '')
    const removidas = diff.split(LF).filter((l) => l.startsWith('-') && !l.startsWith('---'))
    const adicionadas = diff.split(LF).filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1))
    const permitidas = [fatia(ROTA, INI_MAIOR, FIM_BLOCO), fatia(ROTA, '    // [TRAVA 8.2 — "vai" do 15 s] KINEO-CONTAGEM-FALA-15S-2026-09-29 — roteiro marcado', INI_MAIOR), L_IMPORT].filter(Boolean).join(LF).split(LF)
    checa(`diff da rota contra a base: ${adicionadas.length} linhas novas, todas do import e do bloco; nenhuma linha da base alterada (${removidas.length} removida(s))`, adicionadas.length > 0 && removidas.length === 0 && adicionadas.every((l) => !l.trim() || permitidas.includes(l)))
  }
}

// ═══ 7. mutantes ═══
console.log('7) mutantes (todos VERMELHOS)')
{
  checa('o compilador de mutantes, sobre os arquivos SEM mutação, passa nos predicados (senão o vermelho não prova nada)', provaRota(ROTA, roda(D_SRC)) && Object.values(provaLib(roda(D_SRC))).every(Boolean))
  const semBloco = (() => { const b = fatia(ROTA, INI_MAIOR, FIM_BLOCO); return b ? ROTA.split(b).join('') : null })()
  checa('mutante: a rota sem o bloco novo (volta o sorteio 0,2,3) → VERMELHO', semBloco !== null && !provaRota(semBloco, D))
  const nuncaLiga = trocaUma(ROTA, INI_MAIOR, INI_MAIOR.replace('parsedScript.segments.length > SEEDANCE_SHORT_CLIPS', 'parsedScript.segments.length > 9'))
  checa('mutante: o bloco que só liga acima de 9 blocos → VERMELHO', nuncaLiga !== null && !provaRota(nuncaLiga, D))
  const mutantesLib = [
    ['a lib volta a sortear blocos por índice', trocaUma(D_SRC, '  if (n <= count) return segs\n', '  if (n > 0) return Array.from({ length: Math.min(n, count) }, (_, i) => segs[Math.round((i * (n - 1)) / Math.max(1, count - 1))])\n'), ['rota', 'gerados']],
    ['a cena fica só com o 1º bloco do grupo', trocaUma(D_SRC, "    return { voiceover: grupo.map((s) => s.voiceover).filter(Boolean).join(' '), pexelsQuery: pistas.join(', ') }", "    return { voiceover: grupo[0].voiceover, pexelsQuery: pistas.join(', ') }"), ['rota', 'gerados']],
    ['sem o critério da maior cena (só HOOK/PAYOFF sozinhos)', trocaUma(D_SRC, '      Math.max(...somas),\n', ''), ['rota', 'otimo']],
    ['a fala antes do 1º marcador se perde', trocaUma(D_SRC, '    if (antes) cenas[0] = { ...cenas[0], voiceover: norm(`${antes} ${cenas[0].voiceover}`) }\n', ''), ['preambulo']],
  ]
  for (const [nome, src, alvos] of mutantesLib) {
    let vermelho = false
    if (src !== null) {
      try {
        const M = roda(src)
        const lib = provaLib(M)
        vermelho = alvos.every((k) => (k === 'rota' ? !provaRota(ROTA, M) : lib[k] === false))
      } catch { vermelho = true }
    }
    checa(`mutante: ${nome} → VERMELHO em ${alvos.join(', ')}`, src !== null && vermelho)
  }
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
if (falhas.length) { console.log('FALHOU:\n - ' + falhas.join('\n - ')); process.exit(1) }
console.log('PASS — no filme de 15 s, escritor, guarda e ensaio contam a mesma fala (o plano 3x6 mede a mesma narração, com os números por extenso) e nenhum bloco do roteiro some das cenas.')
