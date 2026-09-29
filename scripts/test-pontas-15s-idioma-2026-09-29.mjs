// KINEO-PONTAS-15S-IDIOMA-2026-09-29 [TRAVA 8.2 — "vai conserta" do fundador, 29/09] — guardião: as quatro pontas que o
// ritmo por idioma do filme grátis de 15 s (Seedance 1.5, dc5196ba) deixou soltas.
//
// Caso que motivou (produção, 29/09 09:27 UTC, cadastro novo da Turquia, 1º filme): o escritor pediu 40–41 palavras, o GPT
// devolveu 27 duas vezes e o portão da rota do cinematic recusou ('narration_too_short'). O dc5196ba pôs a régua na língua;
// ficaram quatro pontas:
//   1. o ESCRITOR (app/api/generate-script, segundaEMelhor/notaDoFilmeCurto): entre duas versões, preferia a que fica ABAIXO do
//      piso (o portão recusa) a uma ACIMA do teto da faixa que a guarda do cinematic ainda aceita (até o teto duro). Agora, só
//      no 15 s do Seedance, a versão que o cinematic ACEITA vence; o tamanho das duas vai para o log e para o script_written;
//   2. os ESPELHOS da guarda sem língua (lib/gptHandoff validateHandoffInput e lib/growth/entradaSeedance15
//      roteiroCabeNoFilmeCurto) passam a medir na língua, como a guarda do cinematic — e os chamadores passam a língua;
//   3. a TELA: o contador (lib/contadorVoz) e a expansão automática (/api/expand-script) mediam o 15 s pela persona sem língua
//      e a 3,1 pal/s; agora medem na voz do portão, no ritmo da língua;
//   4. a CALIBRAÇÃO: `render_delivered_measured` grava a língua da narração (era null em 100 % das linhas).
//
// Este guardião EXECUTA o código real — as libs e as FATIAS das rotas (escritor, portão, guarda, régua da expansão, evento de
// entrega) — na árvore e na BASE (via git), e prova, com mutantes que PRECISAM ficar vermelhos:
//   1. o caso turco (27 palavras × uma versão de 40 que a guarda aceita) → fica a de 40; a base ficava com a de 27;
//   2. numa grade de pares de versões (tr/de/pt/en): quando o cinematic aceita só uma, fica ela; quando aceita as duas ou
//      nenhuma, a escolha é a da base; Kineo 1 a 15 s e alvos de 35 s: idênticos à base;
//   3. espelhos: aceitam exatamente o que a guarda da rota aceita, na língua; en/pt/es idênticos à base; chamadores com língua;
//   4. contador coerente com o portão da rota em tr/de/pt/en (nunca "curto" para o que o servidor aceita, nem "ok" para o que
//      ele recusa); fora do 15 s do Seedance, idêntico à base; a expansão mira o ritmo da língua e cabe na guarda;
//   5. o evento de entrega grava a língua (do claim, resolvida contra a fala); o resto do evento, idêntico à base.
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
const trocaUma = (src, a, b) => (src != null && src.split(a).length === 2 ? src.split(a).join(b) : null)
const SILENCIO = { log() {}, warn() {}, error() {} }
const L = createOfflineLoader()

// ═══ BASE = as fontes sem o marcador: o pai do 1º commit com ele; antes do commit, HEAD; senão origin/main ═══
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
const MARCA = 'KINEO-PONTAS-15S-IDIOMA'
const P = {
  gs: 'app/api/generate-script/route.ts', rota: 'app/api/generate-video-cinematic/route.ts', d: 'lib/durationByEngine.ts',
  cv: 'lib/contadorVoz.ts', gh: 'lib/gptHandoff.ts', en: 'lib/growth/entradaSeedance15.ts', ex: 'app/api/expand-script/route.ts',
  st: 'app/api/compose/status/[renderId]/route.ts', co: 'app/api/compose/route.ts', gen: 'app/(dashboard)/generate/GenerateClient.tsx',
  go: 'app/api/gpt/handoff/go/route.ts',
}
const COM_MARCA = ['gs', 'd', 'cv', 'gh', 'en', 'ex', 'st', 'co', 'gen', 'go']
let BASE = null
{
  const candidatos = []
  try { const shas = git(['log', '--format=%H', `--grep=${MARCA}`, 'HEAD']).trim().split(LF).filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!COM_MARCA.some((k) => git(['show', `${ref}:${P[k]}`]).includes(MARCA))) { BASE = ref; break } } catch { /* próximo */ }
  }
}
const rdBase = (p) => { if (!BASE) return null; try { return semCR(git(['show', `${BASE}:${p}`])) } catch { return null } }
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)
const SRC = Object.fromEntries(Object.entries(P).map(([k, p]) => [k, rd(p)]))
const SRC_BASE = Object.fromEntries(Object.entries(P).map(([k, p]) => [k, rdBase(p)]))
checa('a base (as fontes sem o conserto) está disponível e não tem o marcador', COM_MARCA.every((k) => typeof SRC_BASE[k] === 'string' && !SRC_BASE[k].includes(MARCA)))
checa('toda fonte do conserto carrega o marcador', COM_MARCA.every((k) => SRC[k].includes(MARCA)))

// ═══ compilar uma fonte (árvore, base ou mutante) resolvendo '@/...' pelo loader ═══
const compila = (src, trocas = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9, esModuleInterop: true } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, module: { exports }, require: (n) => (Object.hasOwn(trocas, n) ? trocas[n] : L(n)), console: SILENCIO, process: { env: {} }, URL, URLSearchParams, Buffer })
  return exports
}
const D = L(P.d), SP = L('lib/scriptParser.ts'), SR = L('lib/speechRate.ts'), NM = L('lib/narration/niche-mapping.ts')
const V = L('lib/vozDoFilmeCurto.ts'), TL = L('lib/textLanguage.ts'), NF = L('lib/narrationFit.ts'), W = L('lib/scriptWriterRate.ts')
const PS = L('lib/pastedScript.ts'), SF = L('lib/shortFilmScript.ts')
const CV = L(P.cv), GH = L(P.gh), EN = L(P.en)
const CV_B = compila(SRC_BASE.cv), GH_B = compila(SRC_BASE.gh), EN_B = compila(SRC_BASE.en)

// ═══ fatias reais ═══
const linhas = (src) => (src ?? '').split(LF)
const linhaCom = (src, trecho) => { const ls = linhas(src).filter((l) => l.includes(trecho)); return ls.length === 1 ? ls[0] : null }
const deAte = (src, ini, fimLinhaCom) => { if (!src) return null; const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fimLinhaCom, a); if (b < 0) return null; const c = src.indexOf(LF, b); return src.slice(a, c < 0 ? undefined : c) }
const ateFecho = (src, ini, fecho) => { if (!src) return null; const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fecho, a); return b < 0 ? null : src.slice(a, b + fecho.length) }
const funcao = (src, nome) => ateFecho(src, LF + 'function ' + nome + '(', LF + '}' + LF)
const JS_CACHE = new Map()
const jsDe = (codigo) => { let o = JS_CACHE.get(codigo); if (o === undefined) { o = ts.transpileModule(codigo, { compilerOptions: { target: 9 } }).outputText; JS_CACHE.set(codigo, o) } return o }
const roda = (codigo, ctx) => { vm.runInNewContext(jsDe(codigo), ctx); return ctx.globalThis.__o }

// ── a rota do cinematic (a mesma na árvore e na base — este conserto não a toca): portão e guarda do 15 s ──
const MARCA_RITMO = 'narrationRate.wordsPerSecond = ritmoDaVozNoIdioma('
const INI_GUARDA_LINGUA = '    // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-RITMO-POR-IDIOMA-15S-2026-09-29 — a guarda de roteiro longo no RITMO'
const MSG_GUARDA = 'error: scriptTooLongForShortFilmMessage(duration, falaCurta.estSeconds'
function blocoDaGuarda(src) {
  const a = src.indexOf(INI_GUARDA_LINGUA), m = src.indexOf(MSG_GUARDA)
  const fimMsg = m < 0 ? -1 : src.indexOf(LF, m)
  const fecho = LF + '      }' + LF + '    }'
  if (a < 0 || fimMsg < 0 || src.slice(fimMsg, fimMsg + fecho.length) !== fecho) return null
  return src.slice(a, fimMsg + fecho.length).split('await writeServerEvent(').join('writeServerEvent(')
}
checa('a rota do cinematic não foi tocada por este conserto (byte a byte com a base)', SRC.rota === SRC_BASE.rota)
const FR = { voz: deAte(SRC.rota, '    const vozCurta = ', MARCA_RITMO), portao: linhaCom(SRC.rota, '      let fit = narrationFitAt(parsedScript.narration, duration, narrationRate)'), guarda: blocoDaGuarda(SRC.rota) }
checa('as fatias da rota do cinematic (voz do 15 s + ritmo da língua, portão de 95 %, guarda de roteiro longo) foram achadas', Object.values(FR).every(Boolean))
const HOLLY = new Set(['hollywood', 'h3', 'omni', 's25'])
const CACHE_PORTAO = new Map()
/** o portão da rota: voz do 15 s → régua (× ritmo da língua) → narrationFitAt */
const portao = ({ prompt, engine = 'seedance', duration = 15, vertical = null, language = 'en' }) => {
  const k = JSON.stringify([prompt, engine, duration, vertical, language]); if (CACHE_PORTAO.has(k)) return CACHE_PORTAO.get(k)
  const parsedScript = SP.parseUserScript(prompt)
  const ctx = {
    globalThis: {}, console: SILENCIO, prompt, duration, parsedScript, body: { engine, duration, vertical: vertical ?? undefined, language }, narrationLanguage: { language },
    hollywoodPath: HOLLY.has(engine), selectPersonaForScript: NM.selectPersonaForScript, speechRateFor: SR.speechRateFor, narrationFitAt: SR.narrationFitAt,
    vozDoFilmeCurto: V.vozDoFilmeCurto, ritmoDaVozNoIdioma: D.ritmoDaVozNoIdioma,
  }
  const o = roda(`${FR.voz}\n${FR.portao.trim()}\nglobalThis.__o = { narrationRate, fit }`, ctx)
  CACHE_PORTAO.set(k, o); return o
}
/** a guarda de roteiro longo da rota (o bloco da língua e o de sempre): null = passa */
const guarda = ({ prompt, engine = 'seedance', duration = 15, language = 'en', verbatim = true }) => {
  const parsedScript = SP.parseUserScript(prompt)
  const ctx = {
    globalThis: {}, console: SILENCIO, duration, verbatim, parsedScript, body: { engine }, narrationLanguage: { language }, user: { id: 'u' },
    checarFalaDoFilmeCurto: D.checarFalaDoFilmeCurto, scriptTooLongForShortFilmMessage: D.scriptTooLongForShortFilmMessage, fatorDoRitmoDoIdioma: D.fatorDoRitmoDoIdioma,
    ritmoDoFilmeCurto: D.ritmoDoFilmeCurto, creditCostForDuration: () => 15, NextResponse: { json: (b, i) => ({ ...b, __status: i?.status }) }, writeServerEvent: () => {},
  }
  return roda(`globalThis.__o = (() => { ${FR.guarda}\n return null })()`, ctx) === null
}
/** o cinematic aceita o roteiro no 15 s: passa no portão de 95 % E na guarda de roteiro longo */
const cinematicAceita = (a) => portao(a).fit.ok && guarda(a)

// ── o escritor (/api/generate-script): as linhas da rota, da régua até a escolha entre as duas versões ──
function escritor(gs) {
  const f = {
    helpers: [funcao(gs, 'missingElements'), funcao(gs, 'scriptWordCount'), funcao(gs, 'payoffIsEmpty')],
    regua: linhaCom(gs, '    const regua = writerRateFor(body.engine, topic, language)'),
    idioma: linhaCom(gs, '    const idiomaDoRitmo = '),
    colado: linhaCom(gs, '    const colado = detectPastedScript(topic)'),
    alvo: deAte(gs, '    const alvoPalavras = colado.pasted', ': minWordsFor(alvoSegundos'),
    filmeCurto: linhaCom(gs, '    const filmeCurto = isShortFilmTarget(alvoSegundos)'),
    fala: linhaCom(gs, '    const falaNaReguaDaGuarda = '),
    palavras: linhaCom(gs, '    const palavrasDoFilmeCurto = '),
    teto: linhaCom(gs, '    const tetoFilmeCurto = Math.min(maxWordsFor(alvoSegundos'),
    piso: linhaCom(gs, '    const pisoFilmeCurto = Math.min(alvoPalavras, tetoFilmeCurto)'),
    duro: linhaCom(gs, '    const tetoDuroFilmeCurto = isSeedance15('),
    fechar: ateFecho(gs, '    const fecharFilmeCurto = ', LF + '    }' + LF),
    nota: ateFecho(gs, '    const notaDoFilmeCurto = ', LF + '    }' + LF),
    melhor: ateFecho(gs, '    const segundaEMelhor = ', LF + '    }' + LF),
  }
  // ausentes na base: a faixa do cinematic, o predicado, o rastro das versões e a linha de log
  const novas = {
    faixa: linhaCom(gs, '    const faixaDoCinematic = ') ?? '',
    aceita: linhaCom(gs, '    const oCinematicAceita = ') ?? '',
    versao: linhaCom(gs, '    const versaoDoFilmeCurto = ') ?? '',
    log: linhaCom(gs, '[generate-script] KINEO-PONTAS-15S-IDIOMA duas versões do filme curto') ?? '',
  }
  const pronto = Object.values(f).every((v) => (Array.isArray(v) ? v.every(Boolean) : Boolean(v)))
  const codigo = [...f.helpers, f.regua, f.idioma, f.colado, f.alvo, f.filmeCurto, f.fala, f.palavras, f.teto, f.piso, f.duro, novas.faixa, novas.aceita, novas.versao,
    'const secoesCortadas = []', f.fechar, f.nota, f.melhor,
    'const a = fecharTudo ? fecharFilmeCurto(v1).script : v1', 'const b = fecharTudo ? fecharFilmeCurto(v2).script : v2',
    'const script = a; const fimDaTentativa = { script: b }', novas.log,
    'globalThis.__o = { a, b, segunda: segundaEMelhor(a, b), teto: tetoFilmeCurto, piso: pisoFilmeCurto, duro: tetoDuroFilmeCurto, faixa: typeof faixaDoCinematic === "undefined" ? null : faixaDoCinematic, pa: palavrasDoFilmeCurto(a), pb: palavrasDoFilmeCurto(b), nota: [notaDoFilmeCurto(a), notaDoFilmeCurto(b)] }'].join(LF)
  /** a escolha entre as duas versões (v1 = a que já estava; v2 = a nova tentativa), com o fecho da rota ou sem ele */
  const escolhe = ({ engine = 'cinematic_ai', language = 'tr', topic = 'Kuklalar', alvoSegundos = 15, v1, v2, fechar = false }) => {
    const logs = []
    const ctx = {
      globalThis: {}, console: { log: (m) => logs.push(String(m)), warn() {}, error() {} }, body: { engine }, topic, language, alvoSegundos, v1, v2, fecharTudo: fechar,
      writerRateFor: W.writerRateFor, minWordsFor: W.minWordsFor, maxWordsFor: W.maxWordsFor, detectPastedScript: PS.detectPastedScript, pastedScriptMinWords: PS.pastedScriptMinWords,
      maxWordsForShortFilm: D.maxWordsForShortFilm, isSeedance15: D.isSeedance15, faixaAceitaNoFilmeCurto: D.faixaAceitaNoFilmeCurto, isShortFilmTarget: SF.isShortFilmTarget,
      finishShortFilmScript: SF.finishShortFilmScript, parseUserScript: SP.parseUserScript, MIN_COVERAGE: NF.MIN_COVERAGE, idiomaDoRitmo: undefined,
    }
    const o = roda(codigo, ctx)
    return { ...o, fica: o.segunda ? o.b : o.a, ficaPalavras: o.segunda ? o.pb : o.pa, logs }
  }
  return { pronto, escolhe, novas }
}
const ESC = escritor(SRC.gs), ESC_B = escritor(SRC_BASE.gs)
checa('as fatias do escritor (régua → faixa → teto duro → faixa do cinematic → fecho → nota → escolha) foram achadas, agora e na base', ESC.pronto && ESC_B.pronto && Object.values(ESC.novas).every(Boolean) && Object.values(ESC_B.novas).every((v) => v === ''))

// roteiros no formato do escritor do 15 s
const blocos = (falas) => [['HOOK (0-2s)', 'puppet theater stage'], ['MICRO REWARD 1', 'old workshop'], ['MICRO REWARD 2', 'museum archive'], ['PAYOFF', 'children watching']]
  .map(([h, q], i) => `${h}: [Pexels: ${q}] ${falas[i]}`).join('\n\n')
const nPalavras = (n, palavra = 'kelime') => { const q = Math.ceil(n / 4); const tam = [0, 1, 2, 3].map((i) => Math.max(0, Math.min(q, n - i * q))); return blocos(tam.map((t) => Array.from({ length: t }, () => palavra).join(' ') + '.')) }
const falaDe = (t) => SP.parseUserScript(t).narration.split(/\s+/).filter(Boolean).length

// ═══ 1. o caso turco ═══
console.log('1) o caso turco (29/09 09:27 UTC): 27 palavras × uma versão de 40 que a guarda da língua aceita')
// A 1ª versão é a reconstrução do caso (a mesma do guardião do ritmo por idioma: 27 palavras, vertical 'Culture' = persona
// documentary). A 2ª tem 40 palavras em 4 frases de 10: nenhuma combinação de frases inteiras cai na faixa 34–34 do texto
// colado (tirar um MICRO REWARD dá 30, abaixo do piso) — o fecho da rota a mantém inteira, acima do teto, dentro do teto duro.
const CASO = `HOOK (0-2s): [Pexels: puppet theater stage] Kuklalar sadece oyuncak değildir!

MICRO REWARD 1: [Pexels: ancient shadow puppet] Karagöz gölge oyunu yüzyıllardır Osmanlı kahvehanelerinde sahnelendi.

MICRO REWARD 2: [Pexels: puppet maker workshop] Ustalar tasvirleri deve derisinden kesip elle boyardı.

PAYOFF: [Pexels: children watching puppet show] Bugün UNESCO bu sanatı insanlığın somut olmayan mirası saydı.`
const V40 = `HOOK (0-2s): [Pexels: puppet theater stage] Kuklalar sadece oyuncak değil, yüzyıllardır anlatılan canlı hikâyelerin ta kendisidir.

MICRO REWARD 1: [Pexels: ancient shadow puppet] Karagöz gölge oyunu Osmanlı kahvehanelerinde her gece yüzlerce kişiyi güldürürdü.

MICRO REWARD 2: [Pexels: puppet maker workshop] Ustalar tasvirleri deve derisinden kesip ışık geçsin diye elle boyardı.

PAYOFF: [Pexels: children watching puppet show] Bugün UNESCO bu sanatı insanlığın somut olmayan mirası olarak korur.`
const COLADO_45 = 'k '.repeat(45) // o pedido real era um texto colado de 45 palavras (piso 40 → 34 no ritmo do turco)
{
  const agora = ESC.escolhe({ language: 'tr', topic: COLADO_45, v1: CASO, v2: V40, fechar: true })
  const antes = ESC_B.escolhe({ language: 'tr', topic: COLADO_45, v1: CASO, v2: V40, fechar: true })
  console.log(`     faixa ${agora.piso}–${agora.teto}, teto duro ${agora.duro}, o cinematic aceita ${agora.faixa?.min}–${agora.faixa?.max} · versões ${agora.pa} × ${agora.pb} · base fica com ${antes.ficaPalavras}, agora com ${agora.ficaPalavras}`)
  checa('o fecho da rota mantém as duas versões como vieram (27 abaixo do piso; 40 acima do teto 34, dentro do teto duro 45)', agora.pa === 27 && agora.pb === 40 && agora.piso === 34 && agora.teto === 34 && agora.duro === 45 && agora.a === CASO && agora.b === V40)
  checa('o cinematic (fatias reais da rota, persona documentary do caso e voz sem vertical): RECUSA a de 27 no portão e ACEITA a de 40', ['Culture', null].every((vertical) => !cinematicAceita({ prompt: CASO, vertical, language: 'tr' }) && portao({ prompt: CASO, vertical, language: 'tr' }).fit.ok === false && cinematicAceita({ prompt: V40, vertical, language: 'tr' })))
  checa('a base ficava com a de 27 — o filme que o portão recusa (o defeito)', antes.segunda === false && antes.ficaPalavras === 27)
  checa('agora fica a de 40 — a que o cinematic aceita', agora.segunda === true && agora.ficaPalavras === 40 && agora.fica === V40)
  checa('faixa do cinematic no 15 s do Seedance em turco = 29–45 (o piso do portão na voz mais rápida; o teto da guarda)', agora.faixa && agora.faixa.min === 29 && agora.faixa.max === 45 && agora.faixa.max === D.maxWordsForShortFilm(15, 'tr') && agora.faixa.min === W.minWordsFor(15, 3.1, 1, 'tr'))
  const log = agora.logs.find((l) => l.includes('KINEO-PONTAS-15S-IDIOMA duas versões'))
  checa(`o log registra o tamanho das duas versões e qual ficou: "${log ?? '(nenhum)'}"`, Boolean(log) && log.includes('1ª 27 palavras (o cinematic recusa)') && log.includes('2ª 40 (o cinematic aceita)') && log.includes('→ fica a 2ª') && log.includes('o cinematic aceita 29-45') && log.includes('língua tr'))
  const idxL = linhas(SRC.gs).findIndex((l) => l.includes('KINEO-PONTAS-15S-IDIOMA duas versões do filme curto'))
  const idxT = linhas(SRC.gs).indexOf('            const fimDaTentativa = fecharFilmeCurto(retryScript)')
  const idxM = linhas(SRC.gs).indexOf('            if (segundaEMelhor(script, fimDaTentativa.script)) { script = fimDaTentativa.script; fimDoFilmeCurto = fimDaTentativa }')
  checa('na rota, o log fica entre o fecho da 2ª tentativa e a escolha (o `script` ainda é a 1ª versão)', idxT > 0 && idxL > idxT && idxM > idxL)
  checa('o script_written leva as duas versões (palavras + se o cinematic aceita) e a faixa do cinematic', SRC.gs.includes('short_film_truncated_sentences: truncatedSentences(script).length, short_film_versions: versoesDoFilmeCurto, short_film_cinematic_range: faixaDoCinematic } : {}) },') &&
    SRC.gs.includes('      versoesDoFilmeCurto.push(versaoDoFilmeCurto(script)) // KINEO-PONTAS-15S-IDIOMA: a 1ª versão, já fechada') && SRC.gs.includes('            versoesDoFilmeCurto.push(versaoDoFilmeCurto(fimDaTentativa.script))'))
  // mutantes do escritor
  const mut = (a, b) => { const s = trocaUma(SRC.gs, a, b); return s ? escritor(s) : null }
  const M1 = mut('oCinematicAceita(t) ? 1 : 0, ', '')
  checa('mutante: a nota sem o critério "o cinematic aceita" → VERMELHO (volta a ficar a de 27)', M1 !== null && M1.escolhe({ language: 'tr', topic: COLADO_45, v1: CASO, v2: V40, fechar: true }).ficaPalavras === 27)
  const M2 = mut('falaNaReguaDaGuarda(t) >= faixaDoCinematic.min && ', '')
  checa('mutante: "aceita" sem o piso do portão → VERMELHO (a de 27 passa por aceita e fica)', M2 !== null && M2.escolhe({ language: 'tr', topic: COLADO_45, v1: CASO, v2: V40, fechar: true }).ficaPalavras === 27)
}

// ═══ 2. a grade de pares ═══
console.log('2) grade: quando o cinematic aceita só uma versão, fica ela; senão, a escolha da base; fora do 15 s do Seedance, idêntico')
const GRADE = []
for (let n = 20; n <= 62; n += 3) GRADE.push(n)
const aceitaN = new Map()
const aceita = (language, n) => { const k = language + ':' + n; if (!aceitaN.has(k)) aceitaN.set(k, cinematicAceita({ prompt: nPalavras(n), language })); return aceitaN.get(k) }
function grade(E, { language, engine = 'cinematic_ai', alvoSegundos = 15, topic = 'Kuklalar' }) {
  const r = { soUma: 0, soUmaCerta: 0, iguais: 0, iguaisComoBase: 0, difereDaBase: 0 }
  for (const n1 of GRADE) for (const n2 of GRADE) {
    if (n1 === n2) continue
    const v1 = nPalavras(n1), v2 = nPalavras(n2)
    const t = E.escolhe({ engine, language, alvoSegundos, topic, v1, v2 }), b = ESC_B.escolhe({ engine, language, alvoSegundos, topic, v1, v2 })
    if (t.segunda !== b.segunda) r.difereDaBase++
    const a1 = aceita(language, n1), a2 = aceita(language, n2)
    if (a1 !== a2) { r.soUma++; if ((t.segunda ? a2 : a1) === true) r.soUmaCerta++ } else { r.iguais++; if (t.segunda === b.segunda) r.iguaisComoBase++ }
  }
  return r
}
{
  for (const language of ['tr', 'de', 'pt', 'en']) {
    const g = grade(ESC, { language })
    checa(`${language}: ${g.soUma} pares em que o cinematic aceita só uma → fica ela em todos (${g.soUmaCerta}); ${g.iguais} pares iguais → a escolha da base em todos (${g.iguaisComoBase})`, g.soUma > 0 && g.soUmaCerta === g.soUma && g.iguaisComoBase === g.iguais)
  }
  const k1 = grade(ESC, { language: 'tr', engine: 'fast' }), k1en = grade(ESC, { language: 'en', engine: 'fast' })
  checa(`Kineo 1 a 15 s (a cota grátis): a escolha é a da base em todos os pares (tr ${k1.difereDaBase} e en ${k1en.difereDaBase} diferenças)`, k1.difereDaBase === 0 && k1en.difereDaBase === 0)
  const s35 = grade(ESC, { language: 'tr', alvoSegundos: 35 })
  checa(`Seedance a 35 s: a escolha é a da base em todos os pares (${s35.difereDaBase} diferenças; o escritor de 35/60/90 nem passa por ela)`, s35.difereDaBase === 0)
  const mut = (a, b) => { const s = trocaUma(SRC.gs, a, b); return s ? escritor(s) : null }
  const M3 = mut('const faixaDoCinematic = idiomaDoRitmo !== undefined ? faixaAceitaNoFilmeCurto(alvoSegundos, MIN_COVERAGE, idiomaDoRitmo) : null', 'const faixaDoCinematic = faixaAceitaNoFilmeCurto(alvoSegundos, MIN_COVERAGE, idiomaDoRitmo)')
  checa('mutante: a faixa do cinematic vale para todo motor → VERMELHO (o Kineo 1 a 15 s muda de escolha)', M3 !== null && grade(M3, { language: 'en', engine: 'fast' }).difereDaBase > 0)
  const M4 = mut('faixaAceitaNoFilmeCurto(alvoSegundos, MIN_COVERAGE, idiomaDoRitmo) : null', 'faixaAceitaNoFilmeCurto(alvoSegundos, MIN_COVERAGE) : null')
  checa('mutante: a faixa do cinematic sem a língua → VERMELHO (em turco fica a versão que a guarda da língua recusa)', M4 !== null && (() => { const g = grade(M4, { language: 'tr' }); return g.soUmaCerta < g.soUma || g.iguaisComoBase < g.iguais })())
}

// ═══ 3. os espelhos da guarda ═══
console.log('3) espelhos: o handoff do GPT e a entrada curta aceitam exatamente o que a guarda da rota aceita, na língua')
const roteiroGPT = (n) => `HOOK: ${Array.from({ length: n }, (_, i) => `w${i}`).join(' ')}`
const ALEMAO = ['der', 'die', 'und', 'ist', 'nicht', 'ein', 'das', 'mit', 'auf', 'für', 'sich', 'auch']
const alemao = (n) => Array.from({ length: n }, (_, i) => ALEMAO[i % ALEMAO.length]).join(' ')
const idiomaComoARota = (pedido, texto) => TL.resolveNarrationLanguage(TL.narrationLanguage(typeof pedido === 'string' ? pedido.slice(0, 2).toLowerCase() : null), texto).language
{
  let iguais = 0, total = 0
  for (const pedido of ['tr', 'de', 'ru', 'pl', 'nl', 'en', 'pt', 'es', 'pt-BR', undefined]) for (let n = 30; n <= 62; n++) {
    const script = roteiroGPT(n)
    const g = GH.validateHandoffInput({ script, durationSec: 15, engineHint: 'seedance', ...(pedido ? { language: pedido } : {}) })
    total++; if (g.ok === guarda({ prompt: script, language: idiomaComoARota(pedido, script) })) iguais++
  }
  checa(`handoff do GPT a 15 s: ${iguais}/${total} casos (10 línguas pedidas × 30–62 palavras) aceitos/recusados exatamente como a guarda da rota`, iguais === total)
  const t45 = GH.validateHandoffInput({ script: roteiroGPT(45), durationSec: 15, engineHint: 'seedance', language: 'tr' }), t46 = GH.validateHandoffInput({ script: roteiroGPT(46), durationSec: 15, engineHint: 'seedance', language: 'tr' })
  checa('turco: 45 palavras aceitas; 46 recusadas com "at most 45 spoken words" (a base aceitava até 56)', t45.ok === true && t46.ok === false && t46.error.includes('at most 45 spoken words') && GH_B.validateHandoffInput({ script: roteiroGPT(56), durationSec: 15, engineHint: 'seedance', language: 'tr' }).ok === true)
  const de = GH.validateHandoffInput({ script: `HOOK: ${alemao(48)}`, durationSec: 15, engineHint: 'seedance', language: 'en' })
  checa('texto alemão com language "en": a língua é resolvida como na rota (detectada: de) → 48 palavras recusadas, "at most 47"', idiomaComoARota('en', `HOOK: ${alemao(48)}`) === 'de' && de.ok === false && de.error.includes('at most 47 spoken words'))
  let iguaisBase = 0, totalBase = 0
  for (const pedido of ['en', 'pt', 'es', 'pt-BR', undefined]) for (let n = 1; n <= 70; n++) { const a = { script: roteiroGPT(n), durationSec: 15, engineHint: 'seedance', ...(pedido ? { language: pedido } : {}) }; totalBase++; if (JSON.stringify(GH.validateHandoffInput(a)) === JSON.stringify(GH_B.validateHandoffInput(a))) iguaisBase++ }
  checa(`handoff em en/pt/es (e sem língua): idêntico à base em ${iguaisBase}/${totalBase} casos`, iguaisBase === totalBase)
  const GHm = compila(trocaUma(SRC.gh, 'maxWordsForShortFilm(SEEDANCE_ONLY_DURATION, idiomaDaFala)', 'maxWordsForShortFilm(SEEDANCE_ONLY_DURATION)') ?? '')
  checa('mutante: o handoff sem a língua → VERMELHO (46 palavras turcas aceitas)', typeof GHm.validateHandoffInput === 'function' && GHm.validateHandoffInput({ script: roteiroGPT(46), durationSec: 15, engineHint: 'seedance', language: 'tr' }).ok === true)

  let iguaisE = 0, totalE = 0
  for (const pedido of ['tr', 'de', 'ru', 'en', 'pt', 'es', undefined]) for (let n = 30; n <= 62; n++) {
    const texto = Array.from({ length: n }, () => 'kelime').join(' ')
    totalE++; if (EN.roteiroCabeNoFilmeCurto(texto, 15, pedido) === guarda({ prompt: texto, language: TL.resolveNarrationLanguage(pedido, texto).language })) iguaisE++
  }
  checa(`entrada curta (roteiroCabeNoFilmeCurto): ${iguaisE}/${totalE} casos iguais à guarda da rota, na língua`, iguaisE === totalE)
  checa('entrada curta: 46 palavras turcas não cabem (vira o teaser de 15 s em modo IA); texto alemão sem língua → detectado → 48 não cabem', EN.roteiroCabeNoFilmeCurto(Array(46).fill('kelime').join(' '), 15, 'tr') === false && EN_B.roteiroCabeNoFilmeCurto(Array(46).fill('kelime').join(' '), 15) === true && EN.roteiroCabeNoFilmeCurto(alemao(48)) === false && EN.roteiroCabeNoFilmeCurto(alemao(47)) === true)
  let iguaisEB = 0, totalEB = 0
  for (const pedido of ['en', 'pt', 'es', undefined]) for (let n = 1; n <= 70; n++) { const texto = Array.from({ length: n }, () => 'word').join(' '); totalEB++; if (EN.roteiroCabeNoFilmeCurto(texto, 15, pedido) === EN_B.roteiroCabeNoFilmeCurto(texto, 15)) iguaisEB++ }
  checa(`entrada curta em en/pt/es (e sem língua): idêntica à base em ${iguaisEB}/${totalEB} casos`, iguaisEB === totalEB)
  const ENm = compila(trocaUma(SRC.en, 'return palavras <= maxWordsForShortFilm(segundos, idioma)', 'return palavras <= maxWordsForShortFilm(segundos)') ?? '')
  checa('mutante: a entrada curta sem a língua → VERMELHO (46 palavras turcas "cabem")', typeof ENm.roteiroCabeNoFilmeCurto === 'function' && ENm.roteiroCabeNoFilmeCurto(Array(46).fill('kelime').join(' '), 15, 'tr') === true)
  const GEN = SRC.gen, GO = SRC.go
  checa('os 4 chamadores da tela passam a língua da tela', GEN.includes('promptFitsShort: roteiroCabeNoFilmeCurto(contratoPedido.prompt, SEEDANCE_SHORT_SECONDS, language),') && GEN.includes("duration === SEEDANCE_SHORT_SECONDS && !roteiroCabeNoFilmeCurto(sp, SEEDANCE_SHORT_SECONDS, language)) {") &&
    GEN.includes('      !roteiroCabeNoFilmeCurto(s, SEEDANCE_SHORT_SECONDS, language) &&') && GEN.includes("if (scriptMode === 'verbatim' && !roteiroCabeNoFilmeCurto(prompt, SEEDANCE_SHORT_SECONDS, language)) setScriptMode('ai')") && !/roteiroCabeNoFilmeCurto\([^)]*\)/.test(GEN.split(LF).filter((l) => l.includes('roteiroCabeNoFilmeCurto(') && !l.includes('language')).join(LF)))
  checa('o clique do /go passa a língua do link (os 2 primeiros caracteres, como buildStudioDestination)', GO.includes('fitsShort: roteiroCabeNoFilmeCurto(row.script, SEEDANCE_SHORT_SECONDS, String(row.language ?? \'\').slice(0, 2).toLowerCase()) }') && SRC.gh.includes("const lang = narrationLanguage(String(row.language ?? '').slice(0, 2).toLowerCase())"))
}

// ═══ 4. a tela: contador e expansão ═══
console.log('4) a tela: o contador diz o que o portão da rota vai dizer; a expansão mira o ritmo da língua')
{
  const VERTICAIS = [null, 'Culture', 'mystery', 'finance']
  const res = {}
  let incoerentesBase = { curtoAceito: 0, okRecusado: 0 }
  for (const language of ['tr', 'de', 'pt', 'en']) {
    let total = 0, coerentes = 0, mesmaRegua = 0
    for (const vertical of VERTICAIS) for (let n = 18; n <= 62; n++) {
      const script = nPalavras(n)
      const server = portao({ prompt: script, vertical, language })
      const regua = CV.reguaDoServidorNaTela({ engine: 'seedance', script, language, vertical, seconds: 15 })
      const v = CV.contadorVoz({ script, regua, requestedSeconds: 15 })
      const telaOk = v !== null && (v.kind === 'fits' || v.kind === 'up')
      total++; if (telaOk === server.fit.ok) coerentes++
      if (regua.rate.wordsPerSecond === server.narrationRate.wordsPerSecond) mesmaRegua++
      const rb = CV_B.reguaDoServidorNaTela({ engine: 'seedance', script, language, vertical })
      const vb = CV_B.contadorVoz({ script, regua: rb, requestedSeconds: 15 })
      const baseOk = vb !== null && (vb.kind === 'fits' || vb.kind === 'up')
      if (!baseOk && server.fit.ok) incoerentesBase.curtoAceito++
      if (baseOk && !server.fit.ok) incoerentesBase.okRecusado++
    }
    res[language] = { total, coerentes, mesmaRegua }
    checa(`${language}: contador × portão da rota coerentes em ${coerentes}/${total} casos (4 verticais × 18–62 palavras), mesma régua em ${mesmaRegua}`, coerentes === total && mesmaRegua === total)
  }
  checa(`a base era incoerente nos dois sentidos: ${incoerentesBase.curtoAceito} "curto" que o servidor aceita, ${incoerentesBase.okRecusado} "ok" que ele recusa`, incoerentesBase.curtoAceito > 0 && incoerentesBase.okRecusado > 0)
  const t30 = CV.contadorVoz({ script: nPalavras(30), regua: CV.reguaDoServidorNaTela({ engine: 'seedance', script: nPalavras(30), language: 'tr', vertical: null, seconds: 15 }), requestedSeconds: 15 })
  const t30b = CV_B.contadorVoz({ script: nPalavras(30), regua: CV_B.reguaDoServidorNaTela({ engine: 'seedance', script: nPalavras(30), language: 'tr', vertical: null }), requestedSeconds: 15 })
  checa(`30 palavras turcas (fala real ~15 s): a base dizia "${t30b?.kind}", agora "${t30?.kind}" — e o portão aceita`, t30b?.kind === 'too_short' && t30?.kind === 'fits' && portao({ prompt: nPalavras(30), language: 'tr' }).fit.ok === true)
  // fora do 15 s do Seedance: idêntico à base
  let iguais = 0, total = 0
  for (const engine of ['seedance', 'fast', 'kling', 'veo', 'hollywood', 'h3']) for (const seconds of [15, 35, 60, 90]) for (const language of ['tr', 'en', 'pt']) for (const n of [30, 90, 160]) {
    if (engine === 'seedance' && seconds === 15) continue
    const script = nPalavras(n)
    const a = CV.reguaDoServidorNaTela({ engine, script, language, vertical: 'Culture', seconds }), b = CV_B.reguaDoServidorNaTela({ engine, script, language, vertical: 'Culture' })
    total++; if (JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(CV.contadorVoz({ script, regua: a, requestedSeconds: seconds })) === JSON.stringify(CV_B.contadorVoz({ script, regua: b, requestedSeconds: seconds }))) iguais++
  }
  checa(`fora do 15 s do Seedance (Kineo 1, Kling, Veo, hollywood; 35/60/90): régua e veredito idênticos à base em ${iguais}/${total} casos`, iguais === total)
  const semSeconds = ['tr', 'en'].every((language) => JSON.stringify(CV.reguaDoServidorNaTela({ engine: 'seedance', script: nPalavras(30), language, vertical: null })) === JSON.stringify(CV_B.reguaDoServidorNaTela({ engine: 'seedance', script: nPalavras(30), language, vertical: null })))
  checa('sem `seconds` (chamador antigo), o Seedance fica como na base', semSeconds)
  const coerente = (M, language) => [null, 'Culture'].every((vertical) => { for (let n = 18; n <= 62; n += 2) { const script = nPalavras(n); const v = M.contadorVoz({ script, regua: M.reguaDoServidorNaTela({ engine: 'seedance', script, language, vertical, seconds: 15 }), requestedSeconds: 15 }); if ((v !== null && (v.kind === 'fits' || v.kind === 'up')) !== portao({ prompt: script, vertical, language }).fit.ok) return false } return true })
  const CVm1 = compila(trocaUma(SRC.cv, 'wordsPerSecond: ritmoDaVozNoIdioma(rate.wordsPerSecond, args.language)', 'wordsPerSecond: rate.wordsPerSecond') ?? '')
  checa('mutante: o contador sem o ritmo da língua → VERMELHO (turco incoerente com o portão)', typeof CVm1.contadorVoz === 'function' && coerente(CV, 'tr') && !coerente(CVm1, 'tr'))
  const CVm2 = compila(trocaUma(SRC.cv, '  if (vozCurta) {', '  if (false) {') ?? '')
  checa('mutante: o contador sem a voz do 15 s (persona sem língua, como antes) → VERMELHO', typeof CVm2.contadorVoz === 'function' && (!coerente(CVm2, 'tr') || !coerente(CVm2, 'en')))
  const GEN = SRC.gen
  checa('a tela passa `seconds: duration` ao contador e à checagem da análise', GEN.includes('const reguaVoz = reguaDoServidorNaTela({ engine: motorContador, script: prompt, language, vertical: analysis?.niche ?? null, seconds: duration })') && GEN.includes("const reguaAnalise = reguaDoServidorNaTela({ engine: mode === 'fast' || mode === 'creator' ? 'fast' : aiEngine, script: baseChecagem, language, vertical: analysis?.niche ?? null, seconds: duration })"))

  // a expansão automática (/api/expand-script): a régua que entra nas fórmulas da rota
  const reguaEx = (src) => deAte(src, '    const regua = speechRateForScript(body.engine, original)', '    const WORDS_PER_SECOND = regua.wordsPerSecond')
  const exRoda = (src, { engine, target, language, original }) => roda(`${reguaEx(src)}\nglobalThis.__o = WORDS_PER_SECOND`, {
    globalThis: {}, console: SILENCIO, body: { engine, language }, target, original, speechRateForScript: SR.speechRateForScript,
    SEEDANCE_SHORT_SECONDS: D.SEEDANCE_SHORT_SECONDS, VERBATIM_EST_WORDS_PER_SECOND: D.VERBATIM_EST_WORDS_PER_SECOND, isSeedance15: D.isSeedance15, ritmoDaVozNoIdioma: D.ritmoDaVozNoIdioma,
    resolveNarrationLanguage: TL.resolveNarrationLanguage, parseUserScript: SP.parseUserScript,
  })
  checa('as fatias da régua da expansão foram achadas (agora e na base)', Boolean(reguaEx(SRC.ex)) && Boolean(reguaEx(SRC_BASE.ex)))
  const LINGUAS = TL.NARRATION_LANGUAGES.map((l) => l.code)
  const cabe = LINGUAS.every((language) => {
    const wps = exRoda(SRC.ex, { engine: 'cinematic_ai', target: 15, language, original: nPalavras(20) })
    const alvo = Math.ceil(15 * wps), f = D.faixaAceitaNoFilmeCurto(15, NF.MIN_COVERAGE, language)
    return wps === D.ritmoDoFilmeCurto(language) && alvo >= f.min && alvo + 8 <= f.max
  })
  checa(`expansão no 15 s do Seedance, nas ${LINGUAS.length} línguas: régua = ritmo da língua (tr 2,03 · de 2,12 · en 2,5); o alvo (100 %) e o orçamento (+8) cabem no que o cinematic aceita`, cabe && exRoda(SRC.ex, { engine: 'cinematic_ai', target: 15, language: 'tr', original: 'x' }) === 2.03)
  const baseTr = exRoda(SRC_BASE.ex, { engine: 'cinematic_ai', target: 15, language: 'tr', original: 'x' })
  checa(`a base media o 15 s a ${baseTr} pal/s: alvo de ${Math.ceil(15 * baseTr)} palavras turcas — acima do teto de ${D.maxWordsForShortFilm(15, 'tr')} da guarda (422)`, baseTr === 3.1 && Math.ceil(15 * baseTr) > D.maxWordsForShortFilm(15, 'tr'))
  checa('velocidade escrita no roteiro entra como no portão (speed: 1.2 → 2,5 × 1,2 no ritmo do turco)', exRoda(SRC.ex, { engine: 'seedance', target: 15, language: 'tr', original: 'speed: 1.2\nKuklalar' }) === D.ritmoDaVozNoIdioma(3, 'tr'))
  checa('texto alemão com language "en": a língua resolvida como na rota (de → 2,12)', exRoda(SRC.ex, { engine: 'cinematic_ai', target: 15, language: 'en', original: alemao(30) }) === 2.12)
  let iguaisEx = 0, totalEx = 0
  for (const engine of ['fast', 'cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_h3', '', undefined]) for (const target of [15, 35, 60, 90]) for (const language of ['tr', 'en']) {
    if (target === 15 && (engine === 'cinematic_ai')) continue
    totalEx++; if (exRoda(SRC.ex, { engine, target, language, original: nPalavras(40) }) === exRoda(SRC_BASE.ex, { engine, target, language, original: nPalavras(40) })) iguaisEx++
  }
  checa(`fora do 15 s do Seedance (35/60/90, Kineo 1, Kling, Veo, hollywood, motor ausente): a régua da expansão é a da base em ${iguaisEx}/${totalEx} casos`, iguaisEx === totalEx)
  const exM = trocaUma(SRC.ex, 'resolveNarrationLanguage(body.language, parseUserScript(original).narration || original).language', "'en'")
  checa('mutante: a expansão sem a língua → VERMELHO (turco medido a 2,5)', exM !== null && exRoda(exM, { engine: 'cinematic_ai', target: 15, language: 'tr', original: 'x' }) === 2.5)
  const fetchEx = ateFecho(GEN, "      const res = await fetch('/api/expand-script', {", '      const data = await res.json()')
  checa('a tela manda a língua na expansão automática', Boolean(fetchEx) && fetchEx.includes('          engine: quality,') && fetchEx.includes('\n          language,\n'))
}

// ═══ 5. o evento de entrega ═══
console.log('5) render_delivered_measured grava a língua da narração')
{
  const bloco = (st) => { const a = st.indexOf('          // ═══ KINEO-ENTREGA-MEDIDA-2026-09-14 — o placar por motor nasce aqui ═══'), b = st.indexOf('          // ═══ FIM KINEO-ENTREGA-MEDIDA ═══'); return a < 0 || b < 0 ? null : st.slice(a, b) }
  const executa = async (st, claim) => {
    const eventos = []
    const db = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: claim }) }) }) }) }) }) }) }
    const js = ts.transpileModule('export async function run() {' + bloco(st) + '\n }', { compilerOptions: { module: 1, target: 9 } }).outputText
    const exp = {}
    vm.runInNewContext(js, { exports: exp, console: SILENCIO, supabase: db, createAdminClient: () => db, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://x', SUPABASE_SERVICE_ROLE_KEY: 'k' } }, COMPOSE_CLAIM_EVENT: 'compose_submission_claim', renderId: 'r1', user: { id: 'u1' }, quality: 'cinematic_ai', duration: 15, result: { ok: true, id: 'v1' }, measuredDelivery: { measuredSeconds: 15.4, measureMethod: 'mvhd' }, writeServerEvent: (e) => { eventos.push(e); return Promise.resolve(true) }, narrationLanguage: TL.narrationLanguage, resolveNarrationLanguage: TL.resolveNarrationLanguage })
    await exp.run()
    return eventos
  }
  const TURCO = SP.parseUserScript(CASO).narration
  const casos = [
    [{ duration: 15, language: 'tr', narration: TURCO }, 'tr', 'turco pedido → tr'],
    [{ duration: 15, language: 'ru', narration: 'Это был самый странный город в мире.' }, 'ru', 'russo pedido → ru'],
    [{ duration: 15, language: 'en', narration: alemao(30) }, 'de', 'pedido en com fala alemã → de (a rota do cinematic troca sozinha; o evento acompanha)'],
    [{ duration: 35, language: 'en', narration: 'The lake killed 1,700 people in one night and nobody heard a sound.' }, 'en', 'inglês → en'],
    [{ duration: 60, language: 'pt', narration: 'O lago matou mil e setecentas pessoas em uma noite.' }, 'pt', 'português → pt'],
    [{ duration: 60, narration: 'one two three' }, null, 'claim sem a língua (anterior a este deploy) → null, como antes'],
    [{ duration: 60, language: 'xx', narration: 'one two three' }, null, 'língua fora do catálogo → null'],
  ]
  for (const [claim, esperado, nome] of casos) {
    const ev = await executa(SRC.st, { metadata: claim }), evB = await executa(SRC_BASE.st, { metadata: claim })
    const semLingua = (e) => JSON.stringify({ ...e[0], metadata: { ...e[0].metadata, language: '·' } })
    checa(`${nome}; o resto do evento idêntico à base`, ev.length === 1 && ev[0].metadata.language === esperado && evB.length === 1 && evB[0].metadata.language === null && semLingua(ev) === semLingua(evB))
  }
  const stM = trocaUma(SRC.st, 'language: idiomaDaNarracao, voice: null', 'language: null, voice: null')
  checa('mutante: o evento volta a gravar language null → VERMELHO', stM !== null && (await executa(stM, { metadata: { duration: 15, language: 'tr', narration: TURCO } }))[0]?.metadata.language === null)
  // o /api/compose grava a língua no claim CONCLUÍDO — o objeto que SUBSTITUI o metadata inteiro e o único que a busca por
  // render_id do /api/compose/status encontra. O claim pendente (claimGenerationSubmission, executado por outros guardiões)
  // fica byte a byte o da base.
  const co = SRC.co
  const LINHA_CO = linhaCom(co, 'KINEO-PONTAS-15S-IDIOMA-2026-09-29')
  const pendente = (s) => ateFecho(s, '    async function claimGenerationSubmission(', '          authority: signComposeClaim(serviceRoleKey, {')
  const completo = (s) => ateFecho(s, '    async function completeGenerationClaim(', '        completed_at: new Date().toISOString(),')
  checa('o /api/compose grava `language` no claim concluído (a língua da própria rota), numa linha só, marcada', Boolean(LINHA_CO) && LINHA_CO.startsWith('        language, // [TRAVA 8.2 — "vai conserta" do fundador, 29/09] KINEO-PONTAS-15S-IDIOMA-2026-09-29') && Boolean(completo(co)) && completo(co).includes(LF + LINHA_CO + LF) && co.includes("    const language = narrationLanguage(body.language) ?? 'en' // KINEO-IDIOMAS-15: qualquer código do catálogo"))
  checa('o claim pendente (claimGenerationSubmission) ficou byte a byte o da base; o resto do /api/compose também, fora a linha marcada', Boolean(pendente(co)) && pendente(co) === pendente(SRC_BASE.co) && co.split(LF).filter((l) => l !== LINHA_CO).join(LF) === SRC_BASE.co)
  const coM = LINHA_CO && co.split(LF).filter((l) => l !== LINHA_CO).join(LF)
  checa('mutante: o claim concluído sem a língua → VERMELHO (a busca por render_id acharia o claim sem ela)', Boolean(completo(coM)) && !/\n {8}language,/.test(completo(coM)))
}

console.log(`\n${ok}/${ok + falhas.length} verificações`)
if (falhas.length) { console.log('FALHARAM:\n - ' + falhas.join('\n - ')); process.exit(1) }
console.log('PASS — KINEO-PONTAS-15S-IDIOMA: o escritor fica com o filme que o cinematic aceita; espelhos, contador, expansão e o evento de entrega falam a língua.')
