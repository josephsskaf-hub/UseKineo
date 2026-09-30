// KINEO-RITMO-POR-IDIOMA-15S-2026-09-29 [TRAVA 8.2 — "vai conserta" do fundador, 29/09] — guardião: no filme grátis de 15 s
// (Seedance 1.5, 'cinematic_ai') o escritor, a guarda de roteiro longo, o plano 3x6 e o portão de 95 % medem a fala na MESMA
// régua, e a régua fala a LÍNGUA do roteiro.
//
// Defeito (produção, 29/09 09:27 UTC, cadastro novo da Turquia, 1º filme): o escritor devolveu 27 palavras em turco; o portão
// da rota do cinematic mediu a 2,45 pal/s (persona documentary, echo × 0,96 — log da Vercel "KINEO-RITMO-POR-VOZ: persona
// documentary (echo 0.96) → régua 2.45") e recusou: 'narration_too_short' "speech=11s target=15s", faltam 8 palavras. A régua
// de ~2,5 pal/s foi calibrada em inglês; em turco a palavra é mais longa e a mesma fala tem menos palavras.
// Conserto: lib/durationByEngine ritmoDoFilmeCurto(língua) — 2,5 × (letras por palavra do francês ÷ as da língua), medido no
// texto PARALELO das páginas de idioma da casa (lib/seo) e conferido no único idioma de palavra longa com filme medido (ru).
//
// Este guardião EXECUTA o código real — as libs e as FATIAS das duas rotas (portão, guarda, mensagem, plano 3x6; faixa, teto
// duro e prompt do escritor) — na BASE (via git) e na árvore:
//   1. o caso turco reproduzido com os números do log (27 palavras, 2,45 pal/s, 11 s, faltam 8) e o que a régua nova diz;
//   2. tr, de, pt, en, es: um roteiro com fala real ~15 s não é recusado; um curto de verdade continua recusado;
//   3. as 16 línguas: escritor, guarda, plano 3x6 e portão medem o MESMO tempo; o piso do escritor passa no portão;
//   4. en/pt/es a 15 s e TODA língua a 35/60/90 (e os outros motores): idênticos à base, byte a byte;
//   5. a calibração: a tabela sai do texto paralelo da casa; o russo previsto bate com o medido;
//   6. mutantes, todos VERMELHOS.
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
const semCR = (s) => (s == null ? null : s.split(CR + LF).join(LF))
const rd = (p) => semCR(readFileSync(join(RAIZ, p), 'utf8'))
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ✓ ' + n) } else { falhas.push(n); console.log('  ✗ FALHOU: ' + n) } }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const trocaUma = (src, a, b) => (src != null && src.split(a).length === 2 ? src.split(a).join(b) : null)
const palavras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean)
const SILENCIO = { log() {}, warn() {}, error() {} }
const L = createOfflineLoader()

// ═══ BASE = as fontes sem o marcador: o pai do 1º commit com ele; antes do commit, HEAD; senão origin/main ═══
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
const MARCA = 'KINEO-RITMO-POR-IDIOMA-15S'
const D_P = 'lib/durationByEngine.ts', W_P = 'lib/scriptWriterRate.ts'
const ROTA_P = 'app/api/generate-video-cinematic/route.ts', GS_P = 'app/api/generate-script/route.ts'
let BASE = null
{
  const candidatos = []
  try { const shas = git(['log', '--format=%H', `--grep=${MARCA}`, 'HEAD']).trim().split(LF).filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (![D_P, W_P, ROTA_P, GS_P].some((p) => git(['show', `${ref}:${p}`]).includes(MARCA))) { BASE = ref; break } } catch { /* próximo */ }
  }
}
const rdBase = (p) => { if (!BASE) return null; try { return semCR(git(['show', `${BASE}:${p}`])) } catch { return null } }
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)
const SRC = { d: rd(D_P), w: rd(W_P), rota: rd(ROTA_P), gs: rd(GS_P) }
const SRC_BASE = { d: rdBase(D_P), w: rdBase(W_P), rota: rdBase(ROTA_P), gs: rdBase(GS_P) }
checa('a base (as 2 libs e as 2 rotas sem o conserto) está disponível e não tem o marcador', Object.values(SRC_BASE).every((s) => typeof s === 'string' && !s.includes(MARCA)))

// ═══ compilar uma fonte (árvore, base ou mutante) resolvendo '@/...' pelo loader, com trocas pontuais ═══
const compila = (src, trocas = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9, esModuleInterop: true } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, require: (n) => (Object.hasOwn(trocas, n) ? trocas[n] : L(n)), console: SILENCIO, process: { env: {} }, Math, Number, Array, Object, JSON, Set, Map, String, RegExp, Error })
  return exports
}
const SP = L('lib/scriptParser.ts')
const SR = L('lib/speechRate.ts')
const NM = L('lib/narration/niche-mapping.ts')
const V = L('lib/vozDoFilmeCurto.ts')
const PS = L('lib/pastedScript.ts')
const TL = L('lib/textLanguage.ts')
const NF = L('lib/narrationFit.ts')
const KS = L('lib/cinematic/klingShots.ts')
const SF = L('lib/shortFilmScript.ts')
const PERDA = KS.KLING25_CLIP_LOSS_SECONDS

// ═══ as fatias REAIS das rotas ═══
const linhas = (src) => (src ?? '').split(LF)
const linhaCom = (src, trecho) => { const ls = linhas(src).filter((l) => l.includes(trecho)); return ls.length === 1 ? ls[0] : null }
const deAte = (src, ini, fimLinhaCom) => { if (!src) return null; const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fimLinhaCom, a); if (b < 0) return null; const c = src.indexOf(LF, b); return src.slice(a, c < 0 ? undefined : c) }
const JS_CACHE = new Map()
const js = (trecho) => { let o = JS_CACHE.get(trecho); if (o === undefined) { o = ts.transpileModule(trecho, { compilerOptions: { target: 9 } }).outputText; JS_CACHE.set(trecho, o) } return o }
const LINHA_RITMO = '    if (vozCurta) narrationRate.wordsPerSecond = ritmoDaVozNoIdioma('
const MARCA_RITMO = 'narrationRate.wordsPerSecond = ritmoDaVozNoIdioma(' // a fatia vai até a linha do ritmo, mutada ou não
// A guarda de roteiro longo: o bloco da língua (acrescentado, só na árvore) + o bloco de sempre, até o fecho dele.
const INI_GUARDA_LINGUA = '    // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-RITMO-POR-IDIOMA-15S-2026-09-29 — a guarda de roteiro longo no RITMO'
const INI_GUARDA = '    // ═══ KINEO-SEEDANCE-15S-2026-09-29 [TRAVA 8.2 — "vai" do 15 s] — roteiro longo pedido como filme curto ═══'
const MSG_GUARDA = 'error: scriptTooLongForShortFilmMessage(duration, falaCurta.estSeconds'
function blocoDaGuarda(src) {
  if (!src) return null
  const a = src.includes(INI_GUARDA_LINGUA) ? src.indexOf(INI_GUARDA_LINGUA) : src.indexOf(INI_GUARDA)
  const m = src.indexOf(MSG_GUARDA)
  const fimMsg = m < 0 ? -1 : src.indexOf(LF, m)
  const fecho = LF + '      }' + LF + '    }'
  if (a < 0 || fimMsg < 0 || src.slice(fimMsg, fimMsg + fecho.length) !== fecho) return null
  // o mock de writeServerEvent é síncrono: o bloco roda numa função comum (o await sai só aqui, no teste)
  return src.slice(a, fimMsg + fecho.length).split('await writeServerEvent(').join('writeServerEvent(')
}
function fatiasDaRota(src) {
  const fim = src && src.includes(MARCA_RITMO) ? MARCA_RITMO : '    const narrationRate = speechRateFor('
  return {
    voz: deAte(src, '    const vozCurta = ', fim),
    portao: linhaCom(src, '      let fit = narrationFitAt(parsedScript.narration, duration, narrationRate)'),
    guarda: blocoDaGuarda(src),
    plano: linhaCom(src, '      const fala = seedanceShortSpeechSeconds(narracaoDoFilme,'),
  }
}
function fatiasDoEscritor(src) {
  const a = src ? src.indexOf(LF + 'function buildSystemPrompt(') : -1
  const b = a < 0 ? -1 : src.indexOf(LF + '}' + LF, a + 1)
  return {
    regua: linhaCom(src, '    const regua = writerRateFor(body.engine, topic, language)'),
    idioma: linhaCom(src, '    const idiomaDoRitmo = ') ?? '', // ausente na base
    colado: linhaCom(src, '    const colado = detectPastedScript(topic)'),
    alvo: deAte(src, '    const alvoPalavras = colado.pasted', ': minWordsFor(alvoSegundos'),
    teto: linhaCom(src, '    const tetoFilmeCurto = Math.min(maxWordsFor(alvoSegundos'),
    piso: linhaCom(src, '    const pisoFilmeCurto = Math.min(alvoPalavras, tetoFilmeCurto)'),
    // reancorado KINEO-DURACOES-CURTAS-2026-09-29 [vai do fundador 29/09 'vai pra todas as 4']: o teto duro vale também no Kling 2.5 e no Veo a 15 s
    // (isClassicShortEngine + maxWordsCurtoDoMotor; no Seedance o MESMO maxWordsForShortFilm de antes) — a fatia é achada pelo nome da variável.
    duro: linhaCom(src, '    const tetoDuroFilmeCurto = '),
    sistema: linhaCom(src, '    const SYSTEM_PROMPT = buildSystemPrompt('),
    prompt: a < 0 || b < 0 ? null : src.slice(a + 1, b + 2),
  }
}
const HOLLY = new Set(['hollywood', 'h3', 'omni', 's25'])
/** Um "mundo" = as duas rotas + as duas libs de uma versão (árvore, base ou mutante). */
function mundo({ rota, gs, D, W }) {
  const fr = fatiasDaRota(rota), fe = fatiasDoEscritor(gs)
  const pronto = Object.values(fr).every(Boolean) && Object.entries(fe).every(([k, v]) => k === 'idioma' || Boolean(v))
  const runRota = (codigo, ctx) => { vm.runInNewContext(js(codigo), ctx); return ctx.globalThis.__o }
  /** portão: voz do 15 s → persona → régua (+ ritmo da língua) → a linha do portão */
  const portao = ({ prompt, engine = 'seedance', duration = 15, vertical, language = 'en' }) => {
    const parsedScript = SP.parseUserScript(prompt)
    const ctx = {
      globalThis: {}, console: SILENCIO, prompt, duration, parsedScript,
      body: { engine, duration, vertical, language }, narrationLanguage: { language },
      hollywoodPath: HOLLY.has(engine), selectPersonaForScript: NM.selectPersonaForScript, speechRateFor: SR.speechRateFor, narrationFitAt: SR.narrationFitAt,
      vozDoFilmeCurto: V.vozDoFilmeCurto, ritmoDaVozNoIdioma: D.ritmoDaVozNoIdioma,
    }
    const o = runRota(`${fr.voz}\n${fr.portao.trim()}\nglobalThis.__o = { narrationRate, classicPersona, vozCurta, fit }`, ctx)
    return { ...o, parsedScript, words: palavras(parsedScript.narration).length }
  }
  /** guarda de roteiro longo: os blocos da rota inteiros (o da língua, se existir, e o de sempre), com a recusa que devolvem */
  const guarda = ({ prompt, engine = 'seedance', duration = 15, language = 'en', verbatim = true }) => {
    const parsedScript = SP.parseUserScript(prompt)
    const chamadas = [], eventos = []
    const ctx = {
      globalThis: {}, console: SILENCIO, duration, verbatim, parsedScript, body: { engine }, narrationLanguage: { language }, user: { id: 'u' },
      checarFalaDoFilmeCurto: (a) => { const r = D.checarFalaDoFilmeCurto(a); chamadas.push(r); return r },
      scriptTooLongForShortFilmMessage: D.scriptTooLongForShortFilmMessage, fatorDoRitmoDoIdioma: D.fatorDoRitmoDoIdioma, ritmoDoFilmeCurto: D.ritmoDoFilmeCurto,
      creditCostForDuration: () => 15, NextResponse: { json: (b, i) => ({ ...b, __status: i?.status }) }, writeServerEvent: (e) => { eventos.push(e) },
    }
    const resp = runRota(`globalThis.__o = (() => { ${fr.guarda}\n return null })()`, ctx)
    return { est: chamadas[0]?.estSeconds, ok: resp === null, msg: resp?.error ?? null, status: resp?.__status ?? null, evento: eventos[0] ?? null }
  }
  /** plano 3x6: a linha da rota (fala) e o passo de cada clipe */
  const plano = ({ narracaoDoFilme, wordsPerSecond, language = 'en' }) => {
    const ctx = { globalThis: {}, console: SILENCIO, narracaoDoFilme, narrationRate: { wordsPerSecond }, narrationLanguage: { language }, seedanceShortSpeechSeconds: D.seedanceShortSpeechSeconds }
    const { fala } = runRota(`${fr.plano.trim()}\nglobalThis.__o = { fala }`, ctx)
    return { fala, passo: D.seedanceShortClipSeconds(fala, PERDA) }
  }
  /** escritor: régua → língua do ritmo → roteiro colado → alvo → teto → piso → teto duro → prompt (as linhas do /api/generate-script, e o buildSystemPrompt inteiro) */
  const faixa = ({ engine = 'cinematic_ai', language = 'en', topic = 'tema curto', alvoSegundos = 15 }) => {
    const ctx = {
      globalThis: {}, console: SILENCIO, body: { engine }, topic, language, alvoSegundos,
      writerRateFor: W.writerRateFor, minWordsFor: W.minWordsFor, maxWordsFor: W.maxWordsFor,
      detectPastedScript: PS.detectPastedScript, pastedScriptMinWords: PS.pastedScriptMinWords,
      maxWordsForShortFilm: D.maxWordsForShortFilm, isSeedance15: D.isSeedance15, isShortFilmTarget: SF.isShortFilmTarget,
      isClassicShortEngine: D.isClassicShortEngine, maxWordsCurtoDoMotor: D.maxWordsCurtoDoMotor, // KINEO-DURACOES-CURTAS-2026-09-29 (ausentes na base: a linha da base não as usa)
      LANGUAGE_NAMES: TL.LANGUAGE_NAMES, WORDS_PER_SECOND: NF.WORDS_PER_SECOND, MIN_COVERAGE: NF.MIN_COVERAGE,
    }
    return runRota(`${fe.prompt}\n${fe.regua}\n${fe.idioma}\n${fe.colado}\n${fe.alvo}\n${fe.teto}\n${fe.piso}\n${fe.duro}\n${fe.sistema}\nglobalThis.__o = { regua, alvoPalavras, tetoFilmeCurto, pisoFilmeCurto, tetoDuroFilmeCurto, SYSTEM_PROMPT }`, ctx)
  }
  return { pronto, portao, guarda, plano, faixa, D, W }
}
const D = L(D_P), W = L(W_P)
const AGORA = mundo({ rota: SRC.rota, gs: SRC.gs, D, W })
const D_BASE = SRC_BASE.d ? compila(SRC_BASE.d) : null
const W_BASE = SRC_BASE.w && D_BASE ? compila(SRC_BASE.w, { '@/lib/durationByEngine': D_BASE }) : null
const ANTES = D_BASE && W_BASE ? mundo({ rota: SRC_BASE.rota, gs: SRC_BASE.gs, D: D_BASE, W: W_BASE }) : null
checa('as fatias reais das duas rotas foram achadas (agora e na base)', AGORA.pronto && Boolean(ANTES?.pronto))
checa('a régua por idioma nasce em UMA fonte pura (lib/durationByEngine, sem import) e as quatro pontas a leem de lá',
  !/^import /m.test(SRC.d) && /export function ritmoDoFilmeCurto\(/.test(SRC.d) && SRC.w.includes("import { ritmoDoFilmeCurto } from '@/lib/durationByEngine'") && SRC.rota.includes("import { ritmoDaVozNoIdioma, fatorDoRitmoDoIdioma, ritmoDoFilmeCurto } from '@/lib/durationByEngine'"))

// roteiro de N palavras no formato do escritor do 15 s (4 blocos; fala = as palavras dadas)
const blocos = (falas) => [['HOOK (0-2s)', 'puppet theater stage'], ['MICRO REWARD 1', 'old workshop'], ['MICRO REWARD 2', 'museum archive'], ['PAYOFF', 'children watching']]
  .map(([h, q], i) => `${h}: [Pexels: ${q}] ${falas[i]}`).join('\n\n')
const nPalavras = (n, palavra = 'kelime') => { const w = Array.from({ length: n }, () => palavra); const q = Math.ceil(n / 4); return blocos([0, 1, 2, 3].map((i) => w.slice(i * q, (i + 1) * q).join(' ') + '.')) }
const letrasDe = (t) => (String(t).match(/\p{L}/gu) ?? []).length
// fala "real" por LETRAS (a calibração): a narração inglesa entregue tem 5,03–5,18 letras por palavra a 2,5 pal/s → 12,75 letras/s
const LETRAS_POR_SEGUNDO_EN = 2.5 * 5.1

// ═══ 1. o caso turco (29/09 09:27 UTC) ═══
console.log('1) o caso turco: 27 palavras, persona documentary (echo × 0,96 = 2,45 pal/s) — o log da Vercel')
// Reconstrução: o HOOK é o do evento (generation_attempt_opened.topic_hint); 27 palavras (script_written.words); o pedido
// montado tem 411 caracteres, como o prompt_length do generation_dispatch_received. O `vertical` 'Culture' escolhe a persona
// documentary, a mesma do log. O texto exato não foi gravado em lugar nenhum.
const CASO = `HOOK (0-2s): [Pexels: puppet theater stage] Kuklalar sadece oyuncak değildir!

MICRO REWARD 1: [Pexels: ancient shadow puppet] Karagöz gölge oyunu yüzyıllardır Osmanlı kahvehanelerinde sahnelendi.

MICRO REWARD 2: [Pexels: puppet maker workshop] Ustalar tasvirleri deve derisinden kesip elle boyardı.

PAYOFF: [Pexels: children watching puppet show] Bugün UNESCO bu sanatı insanlığın somut olmayan mirası saydı.`
function provaCaso(M, { verbose = false } = {}) {
  const antes = ANTES.portao({ prompt: CASO, vertical: 'Culture', language: 'tr' })
  const agora = M.portao({ prompt: CASO, vertical: 'Culture', language: 'tr' })
  if (verbose) {
    const letrasS = letrasDe(antes.parsedScript.narration) / (LETRAS_POR_SEGUNDO_EN * 2.45 / 2.5)
    console.log(`     pedido ${CASO.length} caracteres · ${antes.words} palavras · base: ${antes.classicPersona?.id} ${antes.narrationRate.wordsPerSecond} pal/s → ${antes.fit.speech.toFixed(2)} s, faltam ${antes.fit.missingWords} · agora: ${agora.narrationRate.wordsPerSecond} pal/s → ${agora.fit.speech.toFixed(2)} s, faltam ${agora.fit.missingWords} · pelas letras DESTA reconstrução: ${letrasS.toFixed(1)} s`)
  }
  const fb = ANTES.faixa({ language: 'tr', topic: 'k '.repeat(45) }), fa = M.faixa({ language: 'tr', topic: 'k '.repeat(45) })
  // a 2ª tentativa da pessoa (09:27:59, log: "words=37/40", nunca despachada): o portão já passava; o plano 3x6 punha 37
  // palavras turcas (≈ 18,7 s) em 3 × 6 s
  const n37 = SP.parseUserScript(nPalavras(37)).narration
  const p37b = ANTES.plano({ narracaoDoFilme: n37, wordsPerSecond: ANTES.portao({ prompt: nPalavras(37), vertical: 'Culture', language: 'tr' }).narrationRate.wordsPerSecond, language: 'tr' })
  const p37a = M.plano({ narracaoDoFilme: n37, wordsPerSecond: M.portao({ prompt: nPalavras(37), vertical: 'Culture', language: 'tr' }).narrationRate.wordsPerSecond, language: 'tr' })
  return {
    log: CASO.length === 411 && antes.words === 27 && antes.classicPersona?.id === 'documentary' && antes.narrationRate.wordsPerSecond === 2.45 && Math.round(antes.fit.speech) === 11 && antes.fit.missingWords === 8 && antes.fit.ok === false,
    ritmo: agora.narrationRate.wordsPerSecond === 1.98 && Math.abs(agora.fit.speech - 27 / 1.98) < 1e-9 && agora.fit.speech - antes.fit.speech > 2.5,
    honesto: agora.fit.ok === false && agora.fit.missingWords === 2,
    escritor: fb.pisoFilmeCurto === 40 && fb.tetoFilmeCurto === 41 && fa.pisoFilmeCurto === 34 && fa.tetoFilmeCurto === 34 && fa.tetoDuroFilmeCurto === 45,
    plano: p37b.passo === 6 && p37a.passo === 7 && Math.abs(p37a.fala - 37 / 1.98) < 1e-9,
    _txt: { fb, fa, p37b, p37a },
  }
}
{
  const c = provaCaso(AGORA, { verbose: true })
  const { fb, fa, p37b, p37a } = c._txt
  checa('a base reproduz o log: persona documentary a 2,45 pal/s, 27 palavras, "speech=11s", faltam 8, recusa (411 caracteres como o pedido real)', c.log)
  checa('agora a fala turca é medida no ritmo do turco (2,45 × 2,03 ÷ 2,5 = 1,98 pal/s): 13,6 s, não 11 — o erro de 2,6 s (19 %) sumiu', c.ritmo)
  checa('e o portão continua honesto: 27 palavras turcas (13,6 s na régua média do turco) seguem abaixo de 14,25 s — a recusa diz "faltam 2", não "faltam 8"', c.honesto)
  checa(`o escritor do caso (texto colado de 45 palavras → piso 40): base pedia ${fb.pisoFilmeCurto}–${fb.tetoFilmeCurto} palavras turcas (≈ ${(fb.pisoFilmeCurto / 2.03).toFixed(1)}–${(fb.tetoFilmeCurto / 2.03).toFixed(1)} s de fala turca); agora ${fa.pisoFilmeCurto}–${fa.tetoFilmeCurto}, teto duro ${fa.tetoDuroFilmeCurto}`, c.escritor)
  checa(`a 2ª versão (37 palavras turcas ≈ 18,7 s): a base planejava ${p37b.fala.toFixed(1)} s → clipes de ${p37b.passo} s (3 × 5,84 = 17,5 s de imagem: o compose reciclaria o 1º clipe); agora ${p37a.fala.toFixed(1)} s → ${p37a.passo} s`, c.plano)
}

// ═══ 2. tr, de, pt, en, es: fala real ~15 s passa; curto de verdade continua recusado ═══
console.log('2) roteiros de 15 s em cinco línguas (voz sem `vertical` = onyx × 1,0 e persona documentary)')
const TEXTOS = {
  tr: {
    quinze: ['Kuklalar sadece oyuncak değildir!', 'Karagöz gölge oyunu yüzyıllar boyunca İstanbul kahvehanelerinde sahnelendi.', 'Ustalar her figürü deve derisinden kesip elle boyardı.', 'Sonunda UNESCO bu eski sanatı insanlığın somut olmayan kültürel mirası olarak tanıdı.'],
    curto: ['Kuklalar sadece oyuncak değildir!', 'Karagöz gölge oyunu kahvehanelerde sahnelendi.', 'Ustalar figürleri deve derisinden kesti.', 'Sonunda UNESCO bu eski sanatı insanlığın mirası saydı.'],
  },
  de: {
    quinze: ['Diese Eisenbahnbrücke in Schottland lockt Hunde in den Tod.', 'Seit den Fünfzigerjahren sprangen Hunderte Hunde über die Brüstung.', 'Forscher fanden darunter Nester von Nerzen mit starkem Geruch.', 'Die Hunde folgten der Duftspur.'],
    curto: ['Diese Brücke lockt Hunde in den Tod.', 'Seit Jahrzehnten springen dort Hunde über die Brüstung.', 'Darunter leben Nerze.', 'Die Hunde folgten der Duftspur.'],
  },
  pt: {
    quinze: ['Em Veneza existe uma ilha onde ninguém pode pisar há cem anos.', 'Poveglia recebeu doentes da peste durante séculos de quarentena.', 'Depois virou um hospital psiquiátrico que fechou em silêncio.', 'Hoje o governo proíbe visitas à ilha abandonada.'],
    curto: ['Em Veneza existe uma ilha onde ninguém pode pisar há cem anos.', 'Poveglia recebeu doentes da peste.', 'Depois virou um hospital psiquiátrico.', 'Hoje o governo proíbe visitas.'],
  },
  en: {
    quinze: ['One night in Cameroon, a quiet lake killed more than a thousand villagers.', 'Lake Nyos had released a cloud of carbon dioxide trapped below its surface.', 'The gas rolled downhill, silent and invisible.', 'Today, pipes vent it daily.'],
    curto: ['One night in Cameroon, a lake killed more than a thousand villagers.', 'Lake Nyos released carbon dioxide.', 'The gas rolled downhill, invisible.', 'Today, pipes vent it daily.'],
  },
  es: {
    quinze: ['En México hay una isla llena de muñecas colgadas de los árboles.', 'Don Julián Santana las colgó durante cincuenta años.', 'Decía que calmaban el espíritu de una niña ahogada en el canal.', 'Él murió en el mismo lugar.'],
    curto: ['En México hay una isla llena de muñecas colgadas de los árboles.', 'Don Julián las colgó.', 'Decía que calmaban a una niña ahogada.', 'Él murió allí mismo.'],
  },
}
const ESPERADO = { tr: [32, 22], de: [32, 23], pt: [38, 27], en: [38, 27], es: [38, 27] }
const MUDA = new Set(['tr', 'de'])
function provaCincoLinguas(M, { verbose = false } = {}) {
  const res = []
  for (const [lang, t] of Object.entries(TEXTOS)) {
    for (const [tipo, falas] of Object.entries(t)) {
      const prompt = blocos(falas)
      for (const vertical of [undefined, 'Culture']) {
        const a = ANTES.portao({ prompt, vertical, language: lang }), b = M.portao({ prompt, vertical, language: lang })
        const letrasS = letrasDe(b.parsedScript.narration) / LETRAS_POR_SEGUNDO_EN
        res.push({ lang, tipo, vertical, words: b.words, antes: a, agora: b, letrasS })
        if (verbose && vertical === undefined) console.log(`     ${lang} ${tipo.padEnd(6)} ${String(b.words).padStart(2)} palavras (${(letrasDe(b.parsedScript.narration) / b.words).toFixed(2)} letras/pal.) · pelas letras ${letrasS.toFixed(1)} s · base ${a.narrationRate.wordsPerSecond} → ${a.fit.speech.toFixed(1)} s ${a.fit.ok ? 'PASSA' : 'RECUSA'} · agora ${b.narrationRate.wordsPerSecond} → ${b.fit.speech.toFixed(1)} s ${b.fit.ok ? 'PASSA' : 'RECUSA'}`)
      }
    }
  }
  const contagensOk = res.every((r) => r.words === ESPERADO[r.lang][r.tipo === 'quinze' ? 0 : 1])
  const quinzePassa = res.filter((r) => r.tipo === 'quinze').every((r) => r.agora.fit.ok)
  const curtoRecusa = res.filter((r) => r.tipo === 'curto').every((r) => !r.agora.fit.ok && !r.antes.fit.ok)
  const falsaRecusaNaBase = res.filter((r) => r.tipo === 'quinze' && MUDA.has(r.lang)).every((r) => !r.antes.fit.ok && r.letrasS >= 15 * NF.MIN_COVERAGE)
  const curtoDeVerdade = res.filter((r) => r.tipo === 'curto').every((r) => r.letrasS < 15 * NF.MIN_COVERAGE)
  const intocadas = res.filter((r) => !MUDA.has(r.lang)).every((r) => eqJ(r.antes.narrationRate, r.agora.narrationRate) && eqJ(r.antes.fit, r.agora.fit))
  return { contagensOk, quinzePassa, curtoRecusa, falsaRecusaNaBase, curtoDeVerdade, intocadas }
}
{
  const p = provaCincoLinguas(AGORA, { verbose: true })
  checa('as contagens dos 10 roteiros são as planejadas (tr 32/22, de 32/23, pt/en/es 38/27)', p.contagensOk)
  checa('tr e de com fala real ≥ 14,25 s (pelas letras do próprio texto) eram RECUSADOS na base — a recusa em falso, provada', p.falsaRecusaNaBase)
  checa('agora todo roteiro de ~15 s passa (tr, de, pt, en, es; nas duas vozes)', p.quinzePassa)
  checa('todo roteiro curto de verdade (< 14,25 s pelas letras) continua recusado, na base e agora', p.curtoDeVerdade && p.curtoRecusa)
  checa('pt, en e es: régua e portão idênticos à base (fala, cobertura, faltam), nas duas vozes', p.intocadas)
}

// ═══ 3. as 16 línguas: escritor, guarda, plano 3x6 e portão medem o MESMO tempo ═══
console.log('3) as quatro pontas no mesmo tempo, em cada língua do catálogo')
function provaQuatroPontas(M) {
  const erros = []
  for (const lang of TL.NARRATION_LANGUAGE_CODES) {
    const ritmo = M.D.ritmoDoFilmeCurto(lang)
    const f = M.faixa({ language: lang })
    const escritorWps = M.W.seedanceShortWriterWords(lang).wordsPerSecond
    if (escritorWps !== ritmo) erros.push(`${lang}: escritor ${escritorWps} ≠ ritmo ${ritmo}`)
    if (f.tetoDuroFilmeCurto !== M.D.maxWordsForShortFilm(15, lang)) erros.push(`${lang}: teto duro do escritor ${f.tetoDuroFilmeCurto} ≠ guarda ${M.D.maxWordsForShortFilm(15, lang)}`)
    for (const n of [f.pisoFilmeCurto - 1, f.pisoFilmeCurto, f.tetoFilmeCurto, f.tetoDuroFilmeCurto, f.tetoDuroFilmeCurto + 1]) {
      const prompt = nPalavras(n)
      const g = M.portao({ prompt, language: lang })
      const gd = M.guarda({ prompt, language: lang })
      const pl = M.plano({ narracaoDoFilme: g.parsedScript.narration, wordsPerSecond: g.narrationRate.wordsPerSecond, language: lang })
      const escritor = n / escritorWps
      const tempos = [escritor, gd.est, pl.fala, g.fit.speech]
      if (tempos.some((x) => Math.abs(x - escritor) > 1e-9)) erros.push(`${lang} ${n}: tempos ${tempos.map((x) => x.toFixed(3)).join('/')}`)
      if (n === f.pisoFilmeCurto && !g.fit.ok) erros.push(`${lang}: o piso do escritor (${n}) é recusado no portão`)
      if (n === f.pisoFilmeCurto - 1 && g.fit.ok) erros.push(`${lang}: abaixo do piso (${n}) passa no portão`)
      if (n === f.tetoFilmeCurto && pl.passo !== 6) erros.push(`${lang}: o teto do escritor (${n}) não cabe em 3 × 6 s`)
      if (n === f.tetoDuroFilmeCurto && !gd.ok) erros.push(`${lang}: o teto duro (${n}) é recusado pela guarda`)
      if (n === f.tetoDuroFilmeCurto + 1 && (gd.ok || gd.status !== 422 || gd.evento?.metadata?.charged !== false)) erros.push(`${lang}: acima do teto duro (${n}) passa na guarda`)
      if (n === f.tetoDuroFilmeCurto + 1 && !gd.msg.includes(`Shorten it to about ${f.tetoDuroFilmeCurto} words`)) erros.push(`${lang}: a mensagem da recusa não manda encurtar para ${f.tetoDuroFilmeCurto}`)
    }
    // voz mais lenta (persona documentary 2,45): o portão anda na voz × fator, o plano na mais lenta; o piso ainda passa
    const lenta = M.portao({ prompt: nPalavras(f.pisoFilmeCurto), vertical: 'Culture', language: lang })
    if (lenta.narrationRate.wordsPerSecond !== M.D.ritmoDaVozNoIdioma(2.45, lang) || !lenta.fit.ok) erros.push(`${lang}: persona documentary ${lenta.narrationRate.wordsPerSecond} / piso ${lenta.fit.ok}`)
  }
  return erros
}
{
  const erros = provaQuatroPontas(AGORA)
  const tabela = TL.NARRATION_LANGUAGE_CODES.map((l) => { const f = AGORA.faixa({ language: l }); return `${l} ${D.ritmoDoFilmeCurto(l)} (${f.pisoFilmeCurto}–${f.tetoFilmeCurto}/${f.tetoDuroFilmeCurto})` }).join(' · ')
  console.log(`     ritmo (faixa do escritor / teto da guarda): ${tabela}`)
  checa(`16 línguas × {piso−1, piso, teto, teto duro, teto duro+1}: escritor, guarda, plano 3x6 e portão dão o MESMO tempo; piso passa, piso−1 recusa, teto cabe em 3 × 6 s, teto duro é o da guarda (e a mensagem manda encurtar para ele)${erros.length ? ' — ' + erros.slice(0, 4).join('; ') : ''}`, erros.length === 0)
  checa('a língua desce o ritmo só onde a palavra é mais longa: tr 2,03 · de 2,12 · ru 2,14 · uk 2,15 · id 2,15 · pl 2,23 · nl 2,37; en/pt/es/fr/it/ar/ur/hi/vi 2,5; nenhuma sobe',
    eqJ(Object.fromEntries(TL.NARRATION_LANGUAGE_CODES.map((l) => [l, D.ritmoDoFilmeCurto(l)])), { en: 2.5, pt: 2.5, es: 2.5, hi: 2.5, fr: 2.5, de: 2.12, it: 2.5, nl: 2.37, pl: 2.23, tr: 2.03, ru: 2.14, uk: 2.15, ar: 2.5, ur: 2.5, id: 2.15, vi: 2.5 })
    && D.ritmoDoFilmeCurto(undefined) === 2.5 && D.ritmoDoFilmeCurto('xx') === 2.5 && D.ritmoDoFilmeCurto(' TR ') === 2.03)
  // Borda documentada (lib/durationByEngine seedanceShortSpeechSeconds): a linha do plano 3x6 na rota ficou byte a byte (a trava
  // do 3x6 exige só acréscimos); com `speed: 1.2` a voz turca acelera a 2,43 e o plano mede nela — a fala real — em min(2,5, voz).
  const rapido = AGORA.portao({ prompt: 'speed: 1.2\n' + nPalavras(40), language: 'tr' })
  const pl = AGORA.plano({ narracaoDoFilme: rapido.parsedScript.narration, wordsPerSecond: rapido.narrationRate.wordsPerSecond, language: 'tr' })
  checa(`borda: roteiro turco com "speed: 1.2" — a voz vai a ${rapido.narrationRate.wordsPerSecond} pal/s (2,5 × 1,2 × 0,812) e o plano mede nela (40 ÷ 2,43 = ${pl.fala.toFixed(2)} s → ${pl.passo} s); a linha do plano é a da base`,
    rapido.narrationRate.wordsPerSecond === 2.43 && Math.abs(pl.fala - 40 / 2.43) < 1e-9 && pl.passo === 6 && fatiasDaRota(SRC.rota).plano === fatiasDaRota(SRC_BASE.rota).plano)
}

// ═══ 4. en/pt/es a 15 s e toda língua a 35/60/90 e nos outros motores: idênticos à base ═══
console.log('4) o que não é o 15 s de uma língua de palavra longa: byte a byte a base')
function provaIntocado(M) {
  const erros = []
  const BASE_LANGS = ['en', 'pt', 'es']
  // portão, guarda, mensagem e plano, palavra a palavra
  for (const lang of [...BASE_LANGS, 'tr', 'de']) {
    for (const [engine, duration] of [['seedance', 15], ['seedance', 35], ['seedance', 60], ['seedance', 90], ['kling', 35], ['veo', 60], ['hollywood', 60], ['cinematic_ai', 90]]) {
      if (duration === 15 && !BASE_LANGS.includes(lang)) continue
      for (const vertical of [undefined, 'Culture', 'Technology']) {
        for (let n = 1; n <= (duration === 15 ? 70 : 240); n += duration === 15 ? 1 : 7) {
          const prompt = nPalavras(n)
          const a = ANTES.portao({ prompt, engine, duration, vertical, language: lang }), b = M.portao({ prompt, engine, duration, vertical, language: lang })
          if (!eqJ(a.narrationRate, b.narrationRate) || !eqJ(a.fit, b.fit)) { erros.push(`portão ${lang} ${engine} ${duration}s ${n}`); break }
          const ga = ANTES.guarda({ prompt, engine, duration, language: lang }), gb = M.guarda({ prompt, engine, duration, language: lang })
          if (duration === 15 && !eqJ(ga, gb)) { erros.push(`guarda ${lang} ${n}`); break }
          if (duration !== 15 && ga.ok !== gb.ok) { erros.push(`guarda ${lang} ${engine} ${duration}s ${n}`); break }
          if (duration === 15) {
            const pa = ANTES.plano({ narracaoDoFilme: a.parsedScript.narration, wordsPerSecond: a.narrationRate.wordsPerSecond, language: lang })
            const pb = M.plano({ narracaoDoFilme: b.parsedScript.narration, wordsPerSecond: b.narrationRate.wordsPerSecond, language: lang })
            if (!eqJ(pa, pb)) { erros.push(`plano ${lang} ${n}`); break }
          }
        }
      }
    }
  }
  // escritor: régua, alvo, teto, piso, teto duro e o prompt inteiro (SYSTEM_PROMPT) — 16 línguas × 15/35/60/90 × 8 motores × 3 temas
  // Fora da comparação só o 15 s do Seedance (cinematic_ai, seedance e o chamador sem motor, que a rota trata como Seedance) nas
  // línguas de palavra longa — o conserto. Sem motor (a autoria da tela), só o teto duro muda (espelha a guarda); faixa e prompt não.
  const motores = ['cinematic_ai', 'seedance', 'fast', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood', 'cinematic_h3', '']
  for (const lang of TL.NARRATION_LANGUAGE_CODES) {
    for (const alvoSegundos of [15, 35, 60, 90]) {
      for (const engine of motores) {
        const conserto = alvoSegundos === 15 && M.D.fatorDoRitmoDoIdioma(lang) < 1 && ['cinematic_ai', 'seedance', ''].includes(engine)
        // reancorado KINEO-DURACOES-CURTAS-2026-09-29: Kling 2.5 e Veo a 15 s entram no regime do 15 s (faixa na língua e teto duro da guarda
        // DO MOTOR, 46 em en) — fora desta comparação, provados em scripts/test-duracoes-curtas-todos-motores-2026-09-29.mjs
        if (alvoSegundos === 15 && ['cinematic_kling', 'cinematic_veo'].includes(engine)) continue
        for (const topic of ['tema curto', 'k '.repeat(45), 'k '.repeat(80)]) {
          const a = ANTES.faixa({ engine, language: lang, topic, alvoSegundos }), b = M.faixa({ engine, language: lang, topic, alvoSegundos })
          if (!conserto && !eqJ(a, b)) { erros.push(`escritor ${lang} ${engine || '(sem motor)'} ${alvoSegundos}s`); break }
          if (conserto && engine === '' && !eqJ({ ...a, tetoDuroFilmeCurto: 0 }, { ...b, tetoDuroFilmeCurto: 0 })) { erros.push(`escritor ${lang} (sem motor) 15s: mudou além do teto duro`); break }
        }
      }
    }
  }
  return erros
}
function provaPrompt(M) {
  const pa = ANTES.faixa({ language: 'tr' }).SYSTEM_PROMPT, pb = M.faixa({ language: 'tr' }).SYSTEM_PROMPT
  // split/join (nunca replace com '$'): as quatro trocas esperadas, e nada mais
  const troca = (s, a, b) => s.split(a).join(b)
  const esperado = [['COMPLETE in 41 words', 'COMPLETE in 34 words'], ['Total script: 36-41 spoken words', 'Total script: 29-34 spoken words'], ['words per second, 36 words is about', 'words per second, 29 words is about'], [LF + '  12 seconds of speech', LF + '  9 seconds of speech']]
    .reduce((s, [a, b]) => troca(s, a, b), pa)
  return pa !== pb && esperado === pb
}
{
  const erros = provaIntocado(AGORA)
  checa(`portão, guarda, mensagem e plano (en/pt/es a 15 s, palavra a palavra de 1 a 70; en/pt/es/tr/de a 35/60/90 no Seedance, Kling 2.5, Veo e hollywood) e escritor + prompt (16 línguas × 15/35/60/90 × 8 motores, fora o 15 s das línguas de palavra longa) idênticos à base${erros.length ? ' — ' + erros.slice(0, 4).join('; ') : ''}`, erros.length === 0)
  checa('o prompt do Seedance a 15 s em turco muda SÓ nos números da faixa (29-34 no lugar de 36-41) — nenhuma outra palavra', provaPrompt(AGORA))
  const sem = AGORA.faixa({ engine: '', language: 'tr' }), semB = ANTES.faixa({ engine: '', language: 'tr' })
  checa(`a autoria da tela (sem motor, régua de sempre ${sem.regua.wordsPerSecond} pal/s) a 15 s em turco: faixa e prompt iguais; o teto duro espelha a guarda (${semB.tetoDuroFilmeCurto} → ${sem.tetoDuroFilmeCurto})`,
    sem.tetoDuroFilmeCurto === 45 && semB.tetoDuroFilmeCurto === 56 && sem.SYSTEM_PROMPT === semB.SYSTEM_PROMPT && sem.pisoFilmeCurto === semB.pisoFilmeCurto)
}

// ═══ 5. a calibração ═══
console.log('5) calibração: letras por palavra do texto paralelo da casa (lib/seo) e a conferência no russo medido')
{
  const trechos = {}
  const junta = (v, acc) => {
    if (typeof v === 'string') acc.push(v)
    else if (typeof v === 'function') { try { junta(v({ engine: 'Seedance 1.5', credits: 7, trial: 10 }), acc) } catch { try { junta(v('$9'), acc) } catch { /* sem texto */ } } }
    else if (Array.isArray(v)) v.forEach((x) => junta(x, acc))
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!['code', 'locale', 'dir'].includes(k)) junta(x, acc) })
  }
  const FS = L('lib/seo/freeShortsGeneratorLangs.ts'), EP = L('lib/seo/enginePageLangs.ts')
  for (const l of FS.FREE_SHORTS_LANGS) junta(l, (trechos[l.code] ??= []))
  for (const [c, l] of Object.entries(EP.ENGINE_LANGS)) junta(l, (trechos[c] ??= []))
  const medida = Object.fromEntries(Object.entries(trechos).map(([c, arr]) => {
    const t = arr.join(' ')
    const ws = t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w))
    return [c, (t.match(/[\p{L}\p{M}]/gu) ?? []).length / ws.length]
  }))
  const tabela = D.LETRAS_POR_PALAVRA_DO_IDIOMA
  console.log('     medido agora: ' + Object.entries(medida).map(([c, v]) => `${c} ${v.toFixed(2)}`).join(' · '))
  checa('a tabela é a medida do texto paralelo (cada língua a ±0,10 letra por palavra; a âncora é o francês)', Object.entries(tabela).every(([c, v]) => Math.abs(medida[c] - v) <= 0.1) && D.IDIOMA_ANCORA_DO_RITMO === 'fr')
  // Medido em produção (29/09, render_delivered_measured × videos.script, Kineo 1): ru 2 filmes a 2,524 pal/s; en 165 filmes a 2,958.
  const MEDIDO_RU = 2.524 / 2.958
  checa(`conferência: o fator previsto do russo (${D.fatorDoRitmoDoIdioma('ru').toFixed(3)}) bate com o medido nos filmes entregues (${MEDIDO_RU.toFixed(3)}) a ±0,01`, Math.abs(D.fatorDoRitmoDoIdioma('ru') - MEDIDO_RU) <= 0.01)
  checa('árabe, urdu, hindi e vietnamita (letra não comparável) e o italiano (a < 3 % da âncora) ficam na régua da casa', ['ar', 'ur', 'hi', 'vi', 'it'].every((l) => D.fatorDoRitmoDoIdioma(l) === 1) && !('ar' in tabela) && Math.abs(1 - tabela.fr / tabela.it) < D.RUIDO_DO_RITMO)
}

// ═══ 6. mutantes ═══
console.log('6) mutantes (todos VERMELHOS)')
const mutD = (a, b) => { const s = trocaUma(SRC.d, a, b); return s ? compila(s) : null }
const mundoCom = ({ d, w, rota, gs }) => { const Dm = d ?? D; const Wm = w ? compila(w, { '@/lib/durationByEngine': Dm }) : (d ? compila(SRC.w, { '@/lib/durationByEngine': Dm }) : W); return mundo({ rota: rota ?? SRC.rota, gs: gs ?? SRC.gs, D: Dm, W: Wm }) }
const vermelho = (nome, M, prova) => { let r; try { r = M && M.pronto ? prova(M) : false } catch { r = false } checa(`mutante: ${nome} → VERMELHO`, M !== null && r === false) }
const cincoOk = (M) => { const p = provaCincoLinguas(M); return Object.values(p).every(Boolean) }
const quatroOk = (M) => provaQuatroPontas(M).length === 0
const intocadoOk = (M) => provaIntocado(M).length === 0
const casoOk = (M) => { const c = provaCaso(M); return c.log && c.ritmo && c.honesto && c.escritor && c.plano }
checa('os predicados dos mutantes passam na árvore sem mutação (senão o vermelho não prova nada)', cincoOk(AGORA) && quatroOk(AGORA) && intocadoOk(AGORA) && casoOk(AGORA) && provaPrompt(AGORA))
{
  const Dm = mutD('  return fator >= 1 - RUIDO_DO_RITMO ? 1 : fator', '  return 1')
  vermelho('régua sem a língua (fator sempre 1: o turco volta a 2,5)', Dm ? mundoCom({ d: Dm }) : null, cincoOk)
}
vermelho('rota sem a linha do ritmo da língua no portão', mundoCom({ rota: trocaUma(SRC.rota, LINHA_RITMO, '    if (false) narrationRate.wordsPerSecond = ritmoDaVozNoIdioma(') }), cincoOk)
vermelho('ritmo da língua aplicado fora do 15 s (35/60/90 e os outros motores)', mundoCom({ rota: trocaUma(SRC.rota, LINHA_RITMO, '    if (true) narrationRate.wordsPerSecond = ritmoDaVozNoIdioma(') }), intocadoOk)
vermelho('guarda de roteiro longo da língua sem a língua (46 palavras turcas = 22,7 s passariam)', mundoCom({ rota: trocaUma(SRC.rota, 'narration: parsedScript.narration, language: narrationLanguage.language })', 'narration: parsedScript.narration })') }), quatroOk)
vermelho('guarda de roteiro longo da língua desligada (a de 2,5 pal/s decidiria sozinha)', mundoCom({ rota: trocaUma(SRC.rota, '    if (fatorDoRitmoDoIdioma(narrationLanguage.language) < 1) {', '    if (fatorDoRitmoDoIdioma(narrationLanguage.language) < 0) {') }), quatroOk)
vermelho('guarda de roteiro longo da língua ligada em todas (en/pt/es passariam por duas guardas e o evento mudaria)', mundoCom({ rota: trocaUma(SRC.rota, '    if (fatorDoRitmoDoIdioma(narrationLanguage.language) < 1) {', '    if (fatorDoRitmoDoIdioma(narrationLanguage.language) <= 1) {') }), intocadoOk)
vermelho('mensagem da recusa sem a língua (mandaria encurtar para 56 palavras turcas)', mundoCom({ rota: trocaUma(SRC.rota, "creditCostForDuration('cinematic_ai', true, falaCurtaNaLingua.sugestao), narrationLanguage.language)", "creditCostForDuration('cinematic_ai', true, falaCurtaNaLingua.sugestao))") }), quatroOk)
vermelho('escritor (lib) com a faixa sem a língua (turco volta a 36–41)', mundoCom({ w: trocaUma(SRC.w, 'return seedanceShortWriterWords(language).min', 'return seedanceShortWriterWords().min') }), quatroOk)
vermelho('/api/generate-script com o alvo sem a língua (piso turco 36)', mundoCom({ gs: trocaUma(SRC.gs, ': minWordsFor(alvoSegundos, regua.wordsPerSecond, regua.coverage, idiomaDoRitmo)', ': minWordsFor(alvoSegundos, regua.wordsPerSecond, regua.coverage)') }), quatroOk)
// reancorado KINEO-DURACOES-CURTAS-2026-09-29: o teto duro agora é maxWordsCurtoDoMotor (no Seedance, o MESMO maxWordsForShortFilm) — o mutante bate na linha nova
vermelho('/api/generate-script com o teto duro sem a língua (56, não 45)', mundoCom({ gs: trocaUma(SRC.gs, "maxWordsCurtoDoMotor(typeof body.engine === 'string' ? body.engine : null, alvoSegundos, idiomaDoRitmo)) : tetoFilmeCurto", "maxWordsCurtoDoMotor(typeof body.engine === 'string' ? body.engine : null, alvoSegundos)) : tetoFilmeCurto") }), quatroOk)
{
  const Dm = mutD('  return Math.floor(voiceWordsPerSecond * (ritmo / VERBATIM_EST_WORDS_PER_SECOND) * 100 + 1e-9) / 100', '  return ritmo')
  vermelho('portão no ritmo da língua ignorando a voz (a persona documentary do caso mediria 2,03, não 1,98)', Dm ? mundoCom({ d: Dm }) : null, casoOk)
}
// reancorado KINEO-DURACOES-CURTAS-2026-09-29: o predicado passou a ser isClassicShortEngine (Kling 2.5 e Veo a 15 s entraram, de propósito);
// o mutante continua provando que a língua NÃO vaza para 35/60/90, Kineo 1 e a estrada hollywood.
vermelho('/api/generate-script com a língua em todo motor e duração (35/60/90, Kineo 1 e hollywood mudariam)', mundoCom({ gs: trocaUma(SRC.gs, "    const idiomaDoRitmo = isShortFilmTarget(alvoSegundos) && isClassicShortEngine(typeof body.engine === 'string' ? body.engine : null) ? language : undefined // KINEO-DURACOES-CURTAS-2026-09-29: + Kling 2.5 e Veo 3.1", '    const idiomaDoRitmo = language') }), intocadoOk)
vermelho('prompt do escritor sem a língua (turco a 15 s ouviria "36-41 words")', mundoCom({ gs: trocaUma(SRC.gs, '${minWordsFor(targetSeconds, wordsPerSecond, coverage, ritmoLanguage)}-${maxWordsFor(targetSeconds, wordsPerSecond, coverage, ritmoLanguage)}', '${minWordsFor(targetSeconds, wordsPerSecond, coverage)}-${maxWordsFor(targetSeconds, wordsPerSecond, coverage)}') }), provaPrompt)
{
  const Dm = mutD('tr: 5.65 }', 'tr: 5.0 }')
  vermelho('tabela com o turco fora da medida (5,0 letras por palavra)', Dm ? mundoCom({ d: Dm }) : null, (M) => Math.abs(M.D.LETRAS_POR_PALAVRA_DO_IDIOMA.tr - 5.65) <= 0.1 && M.D.ritmoDoFilmeCurto('tr') === 2.03)
}

console.log(`\n${ok} verificações · ${falhas.length} falha(s)`)
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
