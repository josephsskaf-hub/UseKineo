// KINEO-VOZ-15S-MESMA-DA-MONTAGEM-2026-09-29 [TRAVA 8.2 — "vai conserta" do fundador, 29/09] — guardião: no filme grátis de
// 15 s (Seedance 1.5, 'cinematic_ai'), o portão de narração da rota do cinematic e a montagem (/api/compose) usam a MESMA voz.
//
// Defeito: o portão (fala >= 95 % de 15 s) media a persona escolhida sobre o PEDIDO INTEIRO (pistas [Pexels] inclusas), e a
// montagem (lib/compose.ts generateTTS) escolhe sobre a narração + `vertical` do corpo — sem `vertical` (análise nula,
// resgate do cron) fala em onyx × 1,0. Com ciência/IA o portão media futuristic-ai a 2,65 pal/s: 36 palavras (piso do
// escritor, faixa 36-41) = 13,6 s < 14,25 s → RECUSA — falsa quando a montagem falaria onyx (2,5 → 14,4 s) e verdadeira
// quando falaria a futuristic-ai (a voz real também era rápida demais para 36 palavras).
// Conserto (lib/vozDoFilmeCurto.ts + linhas só ACRESCENTADAS nas duas rotas; lib/compose.ts intocado): só no 15 s do Seedance
// 1.5 a rota escolhe a voz pela REGRA DO COMPOSE com o passo limitado à régua da casa (2,5 pal/s), mede o portão nela e grava
// no claim assinado (`narration_voice`) o `vertical` e o fator de velocidade; o /api/compose, só quando o campo existe, os
// põe no corpo antes de derivar `vertical`/`explicitSpeed` — e o generateTTS de sempre fala a voz que o portão mediu.
//
// Este guardião EXECUTA o código real — as fatias da rota (voz do 15 s → persona clássica → régua → portão; predicado do
// 15 s → campo no claim), as fatias do /api/compose (voz assinada → vertical/nível → explicitSpeed → régua → chave do cache →
// TTS principal → TTS corretivo) e o generateTTS/resolveTtsVoiceIdentity de lib/compose.ts com a OpenAI simulada (captura
// voz e velocidade) — na BASE (via git) e na árvore:
//   1. a tabela: tema → voz do portão → voz real da montagem, na base e agora (navegador, análise nula, resgate do cron);
//   2. portão e montagem usam a mesma voz nos 3 temas e em todo cenário; o espelho vozQueOComposeEscolhe ≡ generateTTS da base;
//   3. roteiro de 36 palavras de ciência não é recusado em falso (e a voz que fala enche 95 % de verdade); 36-41 palavras
//      passam em toda voz que o 15 s alcança;
//   4. 35/60/90 e os outros motores: rota e compose idênticos à base (persona, régua, portão, claim, voz do TTS, cache);
//   5. mutantes, todos VERMELHOS.
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
// ═══ Reancorado KINEO-DURACOES-CURTAS-2026-09-29 [TRAVA 8.2 — vai do fundador 29/09 'vai pra todas as 4'] ═══
// A entrega das durações curtas (15 s em todo motor de IA, 30 s na estrada hollywood) marca TODA linha que acrescenta à rota do
// cinematic (e às outras rotas travadas) com KINEO-DURACOES-CURTAS-2026-09-29, e troca de propósito SEIS linhas da base (a frase da
// recusa pelo motor, o resgate com as curtas, o "alvo fantasma" nas duas chamadas do portão, o piso 30 → 15 do alvo hollywood e o C1
// para roteiro curto). Este guardião aceita exatamente isso — nada fora do marcador, nenhuma outra linha da base trocada — e segue
// travando o que protegia. Prova das mudanças: scripts/test-duracoes-curtas-todos-motores-2026-09-29.mjs.
const MARCA_CURTAS = 'KINEO-DURACOES-CURTAS-2026-09-29'
const TROCADAS_CURTAS = [
  "        return NextResponse.json({ error: mensagemDaRecusaDeDuracao(checagemDuracao), reason: checagemDuracao.recusa, engine: typeof body.engine === 'string' ? body.engine : null, requested_seconds: duration, suggested_seconds: checagemDuracao.sugestao, retryable: false, charged: false, refunded: false }, { status: 422 })",
  '            duracoes: duracoesDoResgate,',
  '        oferecidas: SUPPORTED_DURATIONS,',
  '          oferecidas: SUPPORTED_DURATIONS,',
  '        const req = Math.max(30, Math.min(90, Math.round(duration || 60)))',
  '        if (totalWords >= 40 && sentences.length >= 3) {',
]
const semCurtas = (t) => (t == null ? t : t.split('\n').filter((l) => !l.includes(MARCA_CURTAS)).join('\n'))
const semTrocadas = (t) => (t == null ? t : t.split('\n').filter((l) => !TROCADAS_CURTAS.includes(l.replace(/\r$/, ''))).join('\n'))


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

// ═══ OpenAI simulada: o generateTTS real roda até a chamada e a chamada só grava voz/velocidade ═══
const capturas = []
const MOCKS = {
  '@/lib/openai': {
    openai: { audio: { speech: { create: async (p) => { capturas.push({ voice: p.voice, speed: p.speed, model: p.model, input: p.input }); return { arrayBuffer: async () => new ArrayBuffer(4) } } } } },
    OPENAI_TTS_TIMEOUT_MS: 1, OPENAI_WHISPER_TIMEOUT_MS: 1, buildCaptionSegments: () => [], pickHighlightWord: () => null,
  },
  // ElevenLabs desligado (flag de produção ausente): o ramo que a régua mede é o tts-1-hd
  '@/lib/narration/elevenlabs': { isElevenLabsEnabled: () => false, ttsModelForTier: () => 'tts-1-hd', synthesizeWithElevenLabs: async () => null, ELEVENLABS_DEFAULT_VOICE_ID: 'x' },
}
const L = createOfflineLoader({ mocks: MOCKS })
const SILENCIO = { log() {}, warn() {}, error() {} }
const roda = (src) => {
  if (src == null) throw new Error('fonte ausente')
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9, esModuleInterop: true } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, require: (n) => (Object.hasOwn(MOCKS, n) ? MOCKS[n] : L(n)), console: SILENCIO, process: { env: {} }, Buffer, URL, URLSearchParams, TextEncoder, TextDecoder, fetch: () => { throw new Error('rede proibida') } })
  return exports
}

// ═══ BASE = as fontes sem o marcador: o pai do 1º commit com o marcador; antes do commit, HEAD; senão origin/main ═══
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
const MARCA = 'KINEO-VOZ-15S-MESMA-DA-MONTAGEM'
const ROTA_P = 'app/api/generate-video-cinematic/route.ts'
const COMPOSE_P = 'app/api/compose/route.ts'
const LIB_P = 'lib/compose.ts'
const VOZ_P = 'lib/vozDoFilmeCurto.ts'
let BASE = null
{
  const candidatos = []
  try { const shas = git(['log', '--format=%H', '--grep=VOZ-15S-MESMA-DA-MONTAGEM', 'HEAD']).trim().split(LF).filter(Boolean); if (shas.length) candidatos.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  candidatos.push('HEAD', 'origin/main')
  for (const ref of candidatos) {
    try { if (!git(['show', `${ref}:${ROTA_P}`]).includes(MARCA) && !git(['show', `${ref}:${COMPOSE_P}`]).includes(MARCA)) { BASE = ref; break } } catch { /* próximo */ }
  }
}
const rdBase = (p) => { if (!BASE) return null; try { return semCR(git(['show', `${BASE}:${p}`])) } catch { return null } }
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)

const SRC = { rota: rd(ROTA_P), compose: rd(COMPOSE_P), lib: rd(LIB_P), voz: rd(VOZ_P) }
const SRC_BASE = { rota: rdBase(ROTA_P), compose: rdBase(COMPOSE_P), lib: rdBase(LIB_P), voz: null }
checa('a base (rota, compose e lib/compose sem o conserto) está disponível e não tem o marcador',
  Boolean(SRC_BASE.rota && SRC_BASE.compose && SRC_BASE.lib) && ![SRC_BASE.rota, SRC_BASE.compose, SRC_BASE.lib].some((s) => s.includes(MARCA)))
checa('lib/compose.ts (generateTTS, resolveTtsVoiceIdentity) é o da base, byte a byte: o conserto não mexe na voz do compose, só no que chega a ela', SRC.lib === SRC_BASE.lib)
const SP = L('lib/scriptParser.ts')
const SR = L('lib/speechRate.ts')
const NM = L('lib/narration/niche-mapping.ts')
const DBE = L('lib/durationByEngine.ts')

// ═══ as fatias REAIS ═══
const linhaCom = (src, trecho) => { const ls = src.split(LF).filter((l) => l.includes(trecho)); return ls.length === 1 ? ls[0] : null }
const deAte = (src, ini, fimLinhaCom) => { const a = src.indexOf(ini); if (a < 0) return null; const b = src.indexOf(fimLinhaCom, a); if (b < 0) return null; const c = src.indexOf(LF, b); return src.slice(a, c < 0 ? undefined : c) }
const js = (trecho) => ts.transpileModule(trecho, { compilerOptions: { target: 9 } }).outputText
function fatiasDaRota(src) {
  const iniVoz = src.indexOf('    const vozCurta = ') >= 0 ? '    const vozCurta = ' : '    const classicPersona = hollywoodPath ? null : (() => {'
  return {
    persona: deAte(src, iniVoz, '    const narrationRate = speechRateFor('),
    predicado15: linhaCom(src, '    const seedanceShortFilm = duration === SEEDANCE_SHORT_SECONDS'),
    campo: linhaCom(src, '    if (seedanceShortFilm && vozCurta) response.narration_voice = campoDaVozAssinada('), // reancorado KINEO-DURACOES-CURTAS-2026-09-29: agora há uma 2ª linha (Kling 2.5/Veo 15 s, marcada) — esta é a do Seedance // ausente na base
    portao: linhaCom(src, '      let fit = narrationFitAt(parsedScript.narration, duration, narrationRate)'),
    vozDaResposta: deAte(src, '    const voiceoverScript = verbatim && parsedScript.narration', '      : scenes.map((s) => s.voiceover).filter(Boolean).join'),
  }
}
function fatiasDoCompose(src) {
  const a = src.indexOf('    const composeRate = (() => {')
  const fimRate = a < 0 ? -1 : src.indexOf('    })()', a)
  return {
    vozAssinada: deAte(src, '    const vozAssinada = vozAssinadaDoClaim(', '    if (vozAssinada) {'), // ausente na base
    verticalENivel: deAte(src, "    const vertical = typeof body.vertical === 'string' && body.vertical.trim()", "? 'premium' : 'free'"),
    explicitSpeed: deAte(src, '    const explicitSpeed: number | null = (() => {', '    })()'),
    rate: a < 0 || fimRate < 0 ? null : src.slice(a, fimRate + '    })()'.length),
    identidade: deAte(src, '          const identity = resolveTtsVoiceIdentity(', '          )'),
    tts: linhaCom(src, 'audioBuffer = await generateTTS(scaledScript, explicitSpeed ?? 1.0,'),
    corretivo: linhaCom(src, 'retryBuffer = await generateTTS(scaledScript, correctiveSpeed,'),
  }
}
const HOLLY = new Set(['hollywood', 'h3', 'omni', 's25'])
function mundo(src) {
  const lib = roda(src.lib)
  const voz = src.voz ? roda(src.voz) : {}
  const fr = fatiasDaRota(src.rota), fc = fatiasDoCompose(src.compose)
  const pronto = Boolean(fr.persona && fr.predicado15 && fr.portao && fr.vozDaResposta && fc.verticalENivel && fc.explicitSpeed && fc.rate && fc.identidade && fc.tts && fc.corretivo)
  // A ROTA: voz do 15 s → persona → régua → portão; predicado do 15 s → campo no claim (depois do objeto da resposta)
  const rota = ({ prompt, engine, duration, vertical, language = 'en' }) => {
    const parsedScript = SP.parseUserScript(prompt)
    const verbatim = parsedScript.hasMarkers && parsedScript.segments.length > 0
    const ctx = {
      globalThis: {}, console: SILENCIO, prompt, duration, parsedScript, verbatim,
      body: { engine, duration, vertical, language }, narrationLanguage: { language },
      hollywoodPath: HOLLY.has(engine), wantsKling: engine === 'kling', wantsVeo: engine === 'veo', wantsSora: engine === 'sora',
      selectPersonaForScript: NM.selectPersonaForScript, speechRateFor: SR.speechRateFor, narrationFitAt: SR.narrationFitAt,
      vozDoFilmeCurto: voz.vozDoFilmeCurto, campoDaVozAssinada: voz.campoDaVozAssinada,
      SEEDANCE_SHORT_SECONDS: DBE.SEEDANCE_SHORT_SECONDS, isSeedance15: DBE.isSeedance15, scenes: [],
    }
    const campo = fr.campo ? `const response = {}\n${fr.campo.trim()}\nconst __resp = response` : 'const __resp = {}'
    vm.runInNewContext(js(`${fr.persona}\n${fr.predicado15}\n${fr.vozDaResposta}\n${campo}\nlet __fit = null\nif (verbatim && parsedScript.narration) { ${fr.portao.trim()}; __fit = fit }\nglobalThis.__o = { classicPersona, narrationRate, seedanceShortFilm, __resp, __fit, voiceoverScript }`), ctx)
    return { ...ctx.globalThis.__o, parsedScript, verbatim }
  }
  // O COMPOSE: o que o /api/compose faz com o claim assinado (resposta da rota) e o corpo que o cliente/cron manda
  const compose = async ({ response, bodyVertical, bodySpeed, quality = 'cinematic_ai', language = 'en' }) => {
    const body = { vertical: bodyVertical, ...(bodySpeed != null ? { speed: bodySpeed } : {}) }
    const ctx = {
      globalThis: {}, console: SILENCIO, body, quality, language,
      cinematicBirthClaim: response ? { response } : null, vozAssinadaDoClaim: voz.vozAssinadaDoClaim,
      speechFamilyForQuality: SR.speechFamilyForQuality, speechRateFor: SR.speechRateFor, selectPersonaForScript: NM.selectPersonaForScript,
      voiceoverScript: SP.stripScriptMarkers(response?.voiceover_script ?? ''),
    }
    vm.runInNewContext(js(`${fc.vozAssinada ?? ''}\n${fc.verticalENivel}\n${fc.explicitSpeed}\n${fc.rate}\nglobalThis.__o = { vertical, narrationTier, explicitSpeed, composeRate, vozAssinada: typeof vozAssinada === 'undefined' ? null : vozAssinada }`), ctx)
    const o = ctx.globalThis.__o
    const ctx2 = {
      globalThis: {}, console: SILENCIO, generateTTS: lib.generateTTS, resolveTtsVoiceIdentity: lib.resolveTtsVoiceIdentity,
      scaledScript: ctx.voiceoverScript, explicitSpeed: o.explicitSpeed, vertical: o.vertical, narrationTier: o.narrationTier, language, model: 'tts-1-hd',
      correctiveSpeed: 0.95,
    }
    capturas.length = 0
    await vm.runInNewContext(js(`(async () => { let audioBuffer = null, retryBuffer = null\n${fc.identidade}\n${fc.tts}\n${fc.corretivo}\nglobalThis.__o = { identity } })()`), ctx2)
    const [tts, corretivo] = capturas.slice(0, 2)
    return { ...o, identity: ctx2.globalThis.__o.identity, tts, corretivo, bodyDepois: { ...body } }
  }
  return { pronto, rota, compose, lib, voz }
}
// o claim assinado que a rota publica (o que importa aqui: voiceover_script, speed e o campo novo)
const claimDe = (r, duration) => ({ mode: 'cinematic_ai', duration, fal_model: 'fal-ai/bytedance/seedance/v1/pro/image-to-video', voiceover_script: r.voiceoverScript, verbatim: r.verbatim, speed: r.parsedScript.speed, ...r.__resp })
// velocidade que o cliente manda ao compose: `speed` da resposta (ttsSpeed; null = não manda)
const speedDoCliente = (r) => (typeof r.parsedScript.speed === 'number' ? r.parsedScript.speed : null)

const TEMAS = {
  'ciência/IA': `HOOK (0-2s): [Pexels: robot arm laboratory] An AI just found a new antibiotic in hours.
MICRO REWARD 1: [Pexels: scientist microscope bacteria] MIT researchers trained it on thousands of molecules.
MICRO REWARD 2: [Pexels: petri dish closeup] It flagged one compound humans had ignored for years.
PAYOFF: [Pexels: hospital hallway] Its name... halicin, and it killed superbugs nothing else could.`,
  imóvel: `HOOK (0-2s): [Pexels: city skyline apartments] Tokyo homes lose value the moment you buy them.
MICRO REWARD 1: [Pexels: old japanese house] Most houses there are demolished after about thirty years.
MICRO REWARD 2: [Pexels: construction crane] Earthquake codes keep changing, so buyers want brand new builds.
PAYOFF: [Pexels: empty land lot] The real asset... is only the land underneath.`,
  história: `HOOK (0-2s): [Pexels: ancient roman ruins] Roman concrete gets stronger with every passing century.
MICRO REWARD 1: [Pexels: harbor waves stone] Their harbor walls have survived seawater for two thousand years.
MICRO REWARD 2: [Pexels: volcanic ash closeup] Builders mixed volcanic ash with lime and seawater.
PAYOFF: [Pexels: crystal closeup macro] The secret... seawater grows new crystals that seal every crack.`,
}
// o nicho de uma palavra que o analyze-idea devolve (GPT) e o que viaja como `vertical` para a rota E para o compose
const NICHOS = { 'ciência/IA': ['Technology', 'Science', ''], imóvel: ['Real Estate', 'Finance', ''], história: ['History', ''] }
// cenários do compose: o navegador manda o mesmo `vertical` que mandou à rota; o resgate do cron (finish-stranded) manda nenhum
const CENARIOS = [['navegador', (v) => v], ['resgate do cron', () => undefined]]
const vozDe = (c) => (c ? `${c.voice}×${Number(c.speed).toFixed(2)}` : '—')
const passoDe = (c) => (c ? SR.speechRateFor({ family: 'classic', language: 'en', voice: c.voice, personaSpeed: c.speed }).wordsPerSecond : NaN)
const mesmaVoz = (r, tts) => Boolean(r.classicPersona && tts) && r.classicPersona.voice === tts.voice && Math.abs(r.classicPersona.defaultSpeed * (r.parsedScript.speed ?? 1) - tts.speed) < 1e-9 && r.narrationRate.wordsPerSecond === SR.speechRateFor({ family: 'classic', language: 'en', voice: tts.voice, personaSpeed: tts.speed }).wordsPerSecond

const AGORA = mundo(SRC)
const ANTES = SRC_BASE.rota ? mundo(SRC_BASE) : null
checa('as fatias reais da rota e do compose foram achadas (agora e na base; a voz assinada só agora)', AGORA.pronto && Boolean(ANTES?.pronto) && Boolean(fatiasDoCompose(SRC.compose).vozAssinada) && !fatiasDoCompose(SRC_BASE.compose ?? '').vozAssinada)

// ═══ 1. a tabela ═══
console.log('1) tabela (15 s, Seedance 1.5, 36 palavras): tema → voz do portão → voz real da montagem')
const LINHAS = []
{
  const W = []
  for (const [tema, prompt] of Object.entries(TEMAS)) {
    for (const vertical of NICHOS[tema]) {
      for (const [cen, vComp] of CENARIOS) {
        if (vertical === '' && cen !== 'navegador') continue // análise nula: o navegador já não manda nada
        const a = ANTES.rota({ prompt, engine: 'seedance', duration: 15, vertical })
        const ac = await ANTES.compose({ response: claimDe(a, 15), bodyVertical: vComp(vertical), bodySpeed: speedDoCliente(a) })
        const g = AGORA.rota({ prompt, engine: 'seedance', duration: 15, vertical })
        const gc = await AGORA.compose({ response: claimDe(g, 15), bodyVertical: vComp(vertical), bodySpeed: speedDoCliente(g) })
        W.push(palavras(g.parsedScript.narration).length)
        const antesFala = SR.narrationFitAt(a.parsedScript.narration, 15, SR.speechRateFor({ family: 'classic', voice: ac.tts.voice, personaSpeed: ac.tts.speed }))
        LINHAS.push({ tema, vertical, cen, antes: { portao: a, montagem: ac, falaMontagem: antesFala }, agora: { portao: g, montagem: gc } })
        console.log(`   ${tema.padEnd(10)} vertical=${JSON.stringify(vertical).padEnd(13)} ${cen.padEnd(15)} | ANTES portão ${a.classicPersona.id} ${a.classicPersona.voice}×${a.classicPersona.defaultSpeed} = ${a.narrationRate.wordsPerSecond} pal/s (${a.__fit.speech.toFixed(2)} s, ${a.__fit.ok ? 'passa' : 'RECUSA'}) · montagem ${vozDe(ac.tts)} = ${passoDe(ac.tts)} pal/s (${antesFala.speech.toFixed(2)} s) | AGORA portão ${g.classicPersona.voice}×${g.classicPersona.defaultSpeed} = ${g.narrationRate.wordsPerSecond} (${g.__fit.speech.toFixed(2)} s, ${g.__fit.ok ? 'passa' : 'RECUSA'}) · montagem ${vozDe(gc.tts)} = ${passoDe(gc.tts)}`)
      }
    }
  }
  checa('os 3 roteiros do teste têm 36 palavras (o piso do escritor do 15 s)', W.every((n) => n === 36) && DBE.SEEDANCE_SHORT_SECONDS === 15)
  const ciencia = LINHAS.filter((l) => l.tema === 'ciência/IA')
  checa('ANTES (a causa): ciência/IA — o portão media futuristic-ai (alloy×1,04 = 2,65 pal/s) e RECUSAVA 36 palavras (13,6 s < 14,25 s)',
    ciencia.every((l) => l.antes.portao.classicPersona.id === 'futuristic-ai' && l.antes.portao.narrationRate.wordsPerSecond === 2.65 && l.antes.portao.__fit.ok === false))
  checa('ANTES: a recusa era FALSA onde a montagem falava outra voz (resgate do cron / análise nula: onyx×1,00 = 2,5 → 14,4 s, cabe)',
    ciencia.filter((l) => l.cen === 'resgate do cron' || l.vertical === '').every((l) => l.antes.montagem.tts.voice === 'onyx' && l.antes.montagem.tts.speed === 1 && l.antes.falaMontagem.ok === true))
  checa('ANTES: e VERDADEIRA com `vertical` no navegador — a montagem também falava futuristic-ai (2,65): 36 palavras não enchiam 95 % de 15 s',
    ciencia.filter((l) => l.cen === 'navegador' && l.vertical !== '').every((l) => l.antes.montagem.tts.voice === 'alloy' && Math.abs(l.antes.montagem.tts.speed - 1.04) < 1e-9 && l.antes.falaMontagem.ok === false))
  checa('ANTES: portão e montagem divergiam em pelo menos um cenário de cada tema',
    Object.keys(TEMAS).every((t) => LINHAS.some((l) => l.tema === t && !mesmaVoz(l.antes.portao, l.antes.montagem.tts))))
}

// ═══ 2. mesma voz ═══
console.log('2) agora: portão e montagem falam a MESMA voz (3 temas × nicho × navegador/resgate do cron)')
{
  checa('em todas as linhas da tabela a voz do portão = a voz que o TTS recebe (voz, velocidade e régua)', LINHAS.length >= 12 && LINHAS.every((l) => mesmaVoz(l.agora.portao, l.agora.montagem.tts)))
  checa('a chave do cache (resolveTtsVoiceIdentity) é a MESMA voz do TTS — um áudio de outra voz nunca volta do cache',
    LINHAS.every((l) => l.agora.montagem.identity.voice === l.agora.montagem.tts.voice && Math.abs(l.agora.montagem.identity.speed - l.agora.montagem.tts.speed) < 1e-9))
  checa('o corretivo (2ª síntese) também fala a voz do portão (mesmo vertical)',
    LINHAS.every((l) => l.agora.montagem.corretivo?.voice === l.agora.montagem.tts.voice))
  checa('a régua do compose (escala/previsão/corretivo) anda no passo da voz do portão sempre que há vertical (navegador e resgate)',
    LINHAS.filter((l) => l.agora.montagem.vertical).length >= 10 && LINHAS.filter((l) => l.agora.montagem.vertical).every((l) => l.agora.montagem.composeRate.wordsPerSecond === l.agora.portao.narrationRate.wordsPerSecond))
  // Fora do escopo, registrado: SEM vertical o compose já escolhia a régua por palavra-chave (composeRate) enquanto o TTS fala
  // onyx × 1,0 — divergência antiga do próprio compose, idêntica à base. No 15 s ela não toca a voz nem o portão: o filme
  // guiado é verbatim (sem reescala nem corretivo, os dois únicos usos dessa régua).
  checa('sem vertical, a régua do compose é a MESMA da base (divergência antiga composeRate × TTS onyx, não introduzida aqui) e o claim desses filmes é verbatim',
    LINHAS.filter((l) => !l.agora.montagem.vertical).every((l) => l.agora.montagem.composeRate.wordsPerSecond === l.antes.montagem.composeRate.wordsPerSecond && l.agora.portao.verbatim === true))
  checa('o claim do 15 s carrega narration_voice (vertical + fator) e o resgate do cron (sem vertical no corpo) fala a mesma voz que o navegador',
    LINHAS.every((l) => l.agora.portao.__resp.narration_voice?.voice === l.agora.montagem.tts.voice && 'vertical' in l.agora.portao.__resp.narration_voice && typeof l.agora.portao.__resp.narration_voice.speed_factor === 'number') &&
    LINHAS.filter((l) => l.cen === 'resgate do cron').every((l) => { const par = LINHAS.find((x) => x.tema === l.tema && x.vertical === l.vertical && x.cen === 'navegador'); return Boolean(par) && vozDe(par.agora.montagem.tts) === vozDe(l.agora.montagem.tts) }))
  checa('a voz é a da REGRA do compose, só com o passo limitado: ciência/IA = alloy (futuristic-ai) a 0,98; história = echo 0,96 (intacta); sem vertical = onyx 1,0',
    LINHAS.filter((l) => l.tema === 'ciência/IA' && l.vertical !== '').every((l) => l.agora.montagem.tts.voice === 'alloy' && Math.abs(l.agora.montagem.tts.speed - 0.98) < 1e-9) &&
    LINHAS.filter((l) => l.tema === 'história' && l.vertical !== '').every((l) => l.agora.montagem.tts.voice === 'echo' && Math.abs(l.agora.montagem.tts.speed - 0.96) < 1e-9) &&
    LINHAS.filter((l) => l.vertical === '').every((l) => l.agora.montagem.tts.voice === 'onyx' && l.agora.montagem.tts.speed === 1))
  checa('no navegador o compose usa o MESMO vertical que já usava (só o resgate do cron ganha o vertical do pedido); a trilha, que lê o vertical, não muda no navegador',
    LINHAS.filter((l) => l.cen === 'navegador').every((l) => l.agora.montagem.vertical === l.antes.montagem.vertical))
  // espelho: vozQueOComposeEscolhe (nível da persona, velocidade 1) ≡ o generateTTS e o resolveTtsVoiceIdentity da BASE
  const V = AGORA.voz
  const NARR = [...Object.values(TEMAS).map((t) => SP.parseUserScript(t).narration), 'Did you know most people blink twenty times a minute?', 'The mystery of the vanished ship still haunts sailors.', 'A quiet morning in a small village by the sea.', 'Compound interest makes the rich richer every single year.']
  const VERT = ['Technology', 'Science', 'Real Estate', 'Finance', 'History', 'mystery', 'geography', 'travel', 'luxury', 'learning', '  Country  ', 'General', '', '   ', undefined]
  let casos = 0, iguais = 0
  const difs = []
  for (const n of NARR) for (const v of VERT) for (const tier of ['cinematic', 'premium', 'free']) for (const lang of ['en', 'pt', 'es']) {
    casos++
    const eu = V.vozQueOComposeEscolhe({ narration: n, vertical: v, tier, language: lang })
    const vNorm = typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : undefined
    capturas.length = 0
    await ANTES.lib.generateTTS(n, 1.0, vNorm, tier, lang)
    const idt = ANTES.lib.resolveTtsVoiceIdentity(n, 1.0, vNorm, tier, lang, 'tts-1-hd')
    const c = capturas[0]
    if (c && c.voice === eu.voice && Math.abs(c.speed - eu.defaultSpeed) < 1e-9 && idt.voice === eu.voice && Math.abs(idt.speed - eu.defaultSpeed) < 1e-9 && V.verticalComoOCompose(v) === vNorm) iguais++
    else if (difs.length < 4) difs.push(`${JSON.stringify(v)}/${tier}/${lang}: eu ${eu.voice}×${eu.defaultSpeed} × base ${vozDe(c)}`)
  }
  checa(`espelho: vozQueOComposeEscolhe ≡ generateTTS e resolveTtsVoiceIdentity da BASE em ${casos} casos (narração × nicho × nível × idioma)${difs.length ? ' — difere: ' + difs.join('; ') : ''}`, casos === NARR.length * VERT.length * 9 && casos > 800 && iguais === casos)
}

// ═══ 3. 36 palavras de ciência não são recusadas em falso ═══
console.log('3) roteiro de 36 palavras de ciência: o portão deixa passar — e a voz que fala enche 95 % de verdade')
{
  const ciencia = LINHAS.filter((l) => l.tema === 'ciência/IA')
  checa('36 palavras de ciência/IA: o portão PASSA em todo nicho e cenário (antes recusava em todos)', ciencia.every((l) => l.agora.portao.__fit.ok === true && l.antes.portao.__fit.ok === false))
  checa('e não é aprovação de mentira: a voz que o compose vai falar dá >= 14,25 s (95 % de 15 s) com as mesmas 36 palavras',
    LINHAS.every((l) => SR.narrationFitAt(l.agora.portao.parsedScript.narration, 15, SR.speechRateFor({ family: 'classic', voice: l.agora.montagem.tts.voice, personaSpeed: l.agora.montagem.tts.speed })).speech >= 15 * 0.95))
  // toda voz que o 15 s alcança, 36..41 palavras (a faixa do escritor): passa, com a voz real
  // (vertical vazio = o legado do compose, onyx × 1,0; a emotional-storyteller só vem por palavra-chave e precisa de algum vertical)
  const PERSONA_POR = { 'dark-mystery': 'The ship vanished without a trace. ', 'luxury-narrator': '', documentary: '', 'futuristic-ai': '', 'emotional-storyteller': 'Did you know this? ', 'onyx-legacy': '' }
  const VERT_POR = { 'dark-mystery': 'mystery', 'luxury-narrator': 'luxury', documentary: 'history', 'futuristic-ai': 'technology', 'emotional-storyteller': 'General', 'onyx-legacy': '' }
  const vistos = new Set()
  let todos = true
  for (const pid of Object.keys(PERSONA_POR)) {
    for (let k = 0; k <= 5; k++) {
      const corpo = palavras(`${PERSONA_POR[pid]}alpha beta gamma delta epsilon zeta eta theta iota kappa lambda omicron sigma tau upsilon phi chi psi omega one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty north south east west`).slice(0, 36 + k)
      const prompt = `HOOK (0-2s): [Pexels: sky] ${corpo.slice(0, 12).join(' ')}.\nMICRO REWARD 1: [Pexels: sea] ${corpo.slice(12, 24).join(' ')}.\nPAYOFF: [Pexels: land] ${corpo.slice(24).join(' ')}.`
      for (const [, vComp] of CENARIOS) {
        const g = AGORA.rota({ prompt, engine: 'seedance', duration: 15, vertical: VERT_POR[pid] })
        const gc = await AGORA.compose({ response: claimDe(g, 15), bodyVertical: vComp(VERT_POR[pid]) })
        vistos.add(g.classicPersona.id)
        const real = SR.narrationFitAt(g.parsedScript.narration, 15, SR.speechRateFor({ family: 'classic', voice: gc.tts.voice, personaSpeed: gc.tts.speed }))
        if (!(g.classicPersona.id === pid && palavras(g.parsedScript.narration).length === 36 + k && g.__fit.ok && real.ok && mesmaVoz(g, gc.tts) && g.narrationRate.wordsPerSecond <= 2.5)) todos = false
      }
    }
  }
  checa(`36-41 palavras em cada voz que o 15 s alcança (${[...vistos].sort().join(', ')}), no navegador e no resgate: o portão passa, a voz real enche 95 % e o passo fica <= 2,5 pal/s`,
    todos && Object.keys(PERSONA_POR).every((p) => vistos.has(p)))
  // Reancorado 29/09 (KINEO-RITMO-POR-IDIOMA-15S-2026-09-29, [TRAVA 8.2 — "vai conserta" do fundador]): o escritor do 15 s devolve
  // `wordsPerSecond: ritmo`, com ritmo = ritmoDoFilmeCurto(língua) — 2,5 (VERBATIM_EST_WORDS_PER_SECOND) em inglês, a língua destes
  // testes; nas línguas de palavra longa o ritmo desce junto na guarda e no portão (scripts/test-ritmo-por-idioma-15s-2026-09-29.mjs).
  checa('a régua de 2,5 é a MESMA do escritor do 15 s (seedanceShortWriterWords) e da guarda do filme curto (VERBATIM_EST_WORDS_PER_SECOND)',
    /VERBATIM_EST_WORDS_PER_SECOND \/ passo/.test(SRC.voz) && DBE.VERBATIM_EST_WORDS_PER_SECOND === 2.5 && /const ritmo = ritmoDoFilmeCurto\(language\)[^\n]*\n[\s\S]*return \{ min, max, wordsPerSecond: ritmo, fastestFloor \}/.test(rd('lib/scriptWriterRate.ts')) && DBE.ritmoDoFilmeCurto('en') === DBE.VERBATIM_EST_WORDS_PER_SECOND)
  const curto = AGORA.rota({ prompt: TEMAS['ciência/IA'].replace('Its name... halicin, and it killed superbugs nothing else could.', 'Its name... halicin.'), engine: 'seedance', duration: 15, vertical: 'Technology' })
  checa('o portão continua de pé: 29 palavras (11,6 s na voz que fala) seguem recusadas — o conserto não afrouxa, só mede a voz certa', palavras(curto.parsedScript.narration).length === 29 && curto.__fit.ok === false)
  const com11 = AGORA.rota({ prompt: 'speed: 1.1\n' + TEMAS['ciência/IA'], engine: 'seedance', duration: 15, vertical: 'Technology' })
  const com11c = await AGORA.compose({ response: claimDe(com11, 15), bodyVertical: 'Technology', bodySpeed: speedDoCliente(com11) })
  const com11r = await AGORA.compose({ response: claimDe(com11, 15), bodyVertical: undefined }) // o resgate do cron não manda speed nem vertical
  checa('`speed: 1.1` escrito no roteiro: portão e montagem multiplicam a MESMA voz (0,98 × 1,1), no navegador e no resgate',
    mesmaVoz(com11, com11c.tts) && Math.abs(com11c.tts.speed - 0.98 * 1.1) < 1e-9 && mesmaVoz(com11, com11r.tts))
}

// ═══ 4. 35/60/90 e os outros motores: idênticos à base ═══
console.log('4) 35/60/90 e os outros motores (e o 15 s fora do Seedance): rota e compose idênticos à base')
{
  const MOTORES = ['seedance', 'cinematic_ai', undefined, 'kling', 'veo', 'sora', 'hollywood', 'h3', 'omni', 's25', 'fast']
  const PROMPTS = [...Object.values(TEMAS), 'speed: 1.1\n' + TEMAS['história'], 'why do octopuses have three hearts', 'The old lighthouse keeper climbed the stairs every night for forty years, and nobody ever asked him why he kept the lamp burning after the ships stopped coming. The answer was in a letter.']
  let casos = 0
  const difsRota = [], difsCompose = []
  for (const engine of MOTORES) for (const duration of [15, 35, 60, 90]) for (const prompt of PROMPTS) for (const vertical of ['Technology', 'History', '', undefined]) for (const language of ['en', 'pt']) {
    if (duration === 15 && DBE.isSeedance15(engine ?? null)) continue // o único pedido que muda
    if (duration === 15 && (engine === 'kling' || engine === 'veo')) continue // reancorado KINEO-DURACOES-CURTAS-2026-09-29 [vai do fundador 29/09 'vai pra todas as 4']: o Kling 2.5 e o Veo a 15 s falam a MESMA voz do 15 s (provado em scripts/test-duracoes-curtas-todos-motores-2026-09-29.mjs)
    casos++
    const a = ANTES.rota({ prompt, engine, duration, vertical, language })
    const g = AGORA.rota({ prompt, engine, duration, vertical, language })
    const pa = a.classicPersona && { id: a.classicPersona.id, voice: a.classicPersona.voice, s: a.classicPersona.defaultSpeed }
    const pg = g.classicPersona && { id: g.classicPersona.id, voice: g.classicPersona.voice, s: g.classicPersona.defaultSpeed }
    if (!eqJ([pa, a.narrationRate, a.__resp, a.__fit], [pg, g.narrationRate, g.__resp, g.__fit]) && difsRota.length < 4) difsRota.push(`${engine}/${duration}/${JSON.stringify(vertical)}`)
    if (HOLLY.has(engine)) continue // o hollywood não passa pelo generateTTS do clássico
    for (const bodyVertical of [vertical, undefined]) {
      const ac = await ANTES.compose({ response: claimDe(a, duration), bodyVertical, bodySpeed: speedDoCliente(a), language })
      const gc = await AGORA.compose({ response: claimDe(g, duration), bodyVertical, bodySpeed: speedDoCliente(g), language })
      if (!eqJ([ac.vertical, ac.explicitSpeed, ac.composeRate, ac.identity, ac.tts, ac.corretivo], [gc.vertical, gc.explicitSpeed, gc.composeRate, gc.identity, gc.tts, gc.corretivo]) || gc.vozAssinada !== null) { if (difsCompose.length < 4) difsCompose.push(`${engine}/${duration}/${JSON.stringify(bodyVertical)}`) }
    }
  }
  checa(`${casos} pedidos fora do 15 s do Seedance (${MOTORES.length} motores × 15/35/60/90 × ${PROMPTS.length} roteiros × nicho × idioma): persona, régua, portão e claim da rota byte a byte iguais à base${difsRota.length ? ' — difere: ' + difsRota.join('; ') : ''}`, casos > 1500 && difsRota.length === 0)
  checa(`e o /api/compose desses filmes: vertical, velocidade, régua, chave do cache, voz do TTS e do corretivo iguais à base, sem voz assinada${difsCompose.length ? ' — difere: ' + difsCompose.join('; ') : ''}`, difsCompose.length === 0)
  // campo inválido (claim adulterado não passaria na assinatura; isto é a validação de defesa): ignorado
  const r = AGORA.rota({ prompt: TEMAS['história'], engine: 'seedance', duration: 60, vertical: 'History' })
  const lixo = [{ vertical: 5, speed_factor: 1 }, { vertical: null, speed_factor: 2 }, { vertical: null, speed_factor: 0 }, { vertical: 'x'.repeat(65), speed_factor: 0.9 }, { vertical: null, speed_factor: 'x' }, 'onyx', [1], null]
  const base = await ANTES.compose({ response: claimDe(r, 60), bodyVertical: 'History' })
  const todosIguais = []
  for (const v of lixo) { const gc = await AGORA.compose({ response: { ...claimDe(r, 60), narration_voice: v }, bodyVertical: 'History' }); todosIguais.push(eqJ([gc.tts, gc.identity, gc.composeRate, gc.bodyDepois], [base.tts, base.identity, base.composeRate, base.bodyDepois]) && gc.vozAssinada === null) }
  checa('campo narration_voice inválido (vertical não-texto ou longo, fator fora de (0, 1], tipo errado): ignorado — o corpo do cliente intacto', todosIguais.every(Boolean))
  checa('sem claim (Kineo 1 / fast): nenhuma voz assinada, TTS igual à base', await (async () => { const g = await AGORA.compose({ response: null, bodyVertical: 'History', quality: 'fast' }); const a = await ANTES.compose({ response: null, bodyVertical: 'History', quality: 'fast' }); return g.vozAssinada === null && eqJ(g.tts, a.tts) && eqJ(g.bodyDepois, a.bodyDepois) })())
  // as duas rotas só GANHARAM linhas (a trava do 3x6 exige; e nenhuma chamada de TTS do compose mudou)
  const soAcrescimos = (p) => { try { const d = semCR(execFileSync('git', ['diff', '--unified=0', '--no-color', BASE, '--', p], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 }).toString()); return d.split(LF).filter((l) => l.startsWith('-') && !l.startsWith('---') && !TROCADAS_CURTAS.includes(l.slice(1))).length === 0 } /* reancorado KINEO-DURACOES-CURTAS: as 6 trocas marcadas */ catch { return false } }
  checa('rota do cinematic e /api/compose: nenhuma linha da base alterada ou apagada — só acréscimos', Boolean(BASE) && soAcrescimos(ROTA_P) && soAcrescimos(COMPOSE_P))
}

// ═══ 5. mutantes ═══
console.log('5) mutantes (cada um tem de ficar VERMELHO)')
{
  // o veredito: o que os checks 2-4 exigem, reexecutado num mundo mutado
  async function verde(src) {
    let m
    try { m = mundo(src) } catch { return false }
    if (!m.pronto) return false
    try {
      const prompts = [...Object.entries(TEMAS), ['ciência/IA', 'speed: 1.1\n' + TEMAS['ciência/IA']]]
      for (const [tema, prompt] of prompts) for (const vertical of NICHOS[tema]) for (const [, vComp] of CENARIOS) {
        const g = m.rota({ prompt, engine: 'seedance', duration: 15, vertical })
        const gc = await m.compose({ response: claimDe(g, 15), bodyVertical: vComp(vertical), bodySpeed: speedDoCliente(g) })
        if (!mesmaVoz(g, gc.tts) || g.narrationRate.wordsPerSecond > 2.5 * (g.parsedScript.speed ?? 1) + 1e-9 || gc.identity.voice !== gc.tts.voice || Math.abs(gc.identity.speed - gc.tts.speed) > 1e-9 || gc.corretivo?.voice !== gc.tts.voice) return false
        if (g.parsedScript.speed == null && (!g.__fit.ok || !SR.narrationFitAt(g.parsedScript.narration, 15, SR.speechRateFor({ family: 'classic', voice: gc.tts.voice, personaSpeed: gc.tts.speed })).ok)) return false
        if (gc.vertical && gc.composeRate.wordsPerSecond !== g.narrationRate.wordsPerSecond) return false
      }
      for (const engine of ['seedance', 'kling', 'veo', 'hollywood']) for (const duration of [35, 60, 90]) for (const vertical of ['Technology', undefined]) {
        const a = ANTES.rota({ prompt: TEMAS['ciência/IA'], engine, duration, vertical })
        const g = m.rota({ prompt: TEMAS['ciência/IA'], engine, duration, vertical })
        if (!eqJ([a.classicPersona?.voice, a.classicPersona?.defaultSpeed, a.narrationRate, a.__resp], [g.classicPersona?.voice, g.classicPersona?.defaultSpeed, g.narrationRate, g.__resp])) return false
        if (HOLLY.has(engine)) continue
        const ac = await ANTES.compose({ response: claimDe(a, duration), bodyVertical: vertical })
        const gc = await m.compose({ response: claimDe(g, duration), bodyVertical: vertical })
        if (!eqJ([ac.tts, ac.identity, ac.composeRate], [gc.tts, gc.identity, gc.composeRate])) return false
      }
      for (const n of Object.values(TEMAS).map((t) => SP.parseUserScript(t).narration)) for (const v of ['Technology', 'History', '', '   ', undefined]) {
        const eu = m.voz.vozQueOComposeEscolhe({ narration: n, vertical: v, tier: 'cinematic', language: 'en' })
        const vNorm = typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : undefined
        capturas.length = 0; await ANTES.lib.generateTTS(n, 1.0, vNorm, 'cinematic', 'en')
        if (capturas[0].voice !== eu.voice || Math.abs(capturas[0].speed - eu.defaultSpeed) > 1e-9) return false
      }
    } catch { return false }
    return true
  }
  checa('controle: as fontes reais passam no veredito dos mutantes', await verde(SRC))
  const MUT = [
    ['rota: o portão volta a escolher a persona sobre o pedido (sem a voz do 15 s)', 'rota', '      if (vozCurta) return vozCurta\n', ''],
    ['rota: a voz não vai assinada no claim', 'rota', '    if (seedanceShortFilm && vozCurta) response.narration_voice = campoDaVozAssinada(vozCurta)\n', ''],
    ['rota: o campo vai em todo filme clássico (não só no 15 s)', 'rota', 'if (seedanceShortFilm && vozCurta) response.narration_voice = campoDaVozAssinada(vozCurta)', 'if (classicPersona) response.narration_voice = campoDaVozAssinada({ ...classicPersona, vertical: null, speedFactor: 1 })'],
    ['compose: não aplica a voz assinada ao corpo', 'compose', '    if (vozAssinada) { body.vertical = vozAssinada.vertical; body.speed = vozAssinada.speed }\n', ''],
    ['compose: aplica só o vertical (sem o fator de velocidade)', 'compose', '{ body.vertical = vozAssinada.vertical; body.speed = vozAssinada.speed }', '{ body.vertical = vozAssinada.vertical }'],
    ['compose: aplica só a velocidade (o resgate do cron, sem vertical, fala onyx)', 'compose', '{ body.vertical = vozAssinada.vertical; body.speed = vozAssinada.speed }', '{ body.speed = vozAssinada.speed }'],
    ['compose: não lê o campo do claim', 'compose', 'const vozAssinada = vozAssinadaDoClaim(cinematicBirthClaim?.response)', 'const vozAssinada = null as null | { vertical?: string; speed?: number }'],
    ['vozDoFilmeCurto: sem o limite de 2,5 pal/s (a futuristic-ai volta a 2,65)', 'voz', '  if (base.defaultSpeed <= teto + 1e-9) return { ...base, vertical, speedFactor: 1 }', '  return { ...base, vertical, speedFactor: 1 }'],
    ['vozDoFilmeCurto: arredonda para CIMA (0,99 → 2,52 pal/s, acima da régua)', 'voz', 'Math.floor(teto * 100 + 1e-9) / 100', 'Math.ceil(teto * 100) / 100'],
    ['vozDoFilmeCurto: o fator assinado não é o da voz medida (velocidade limitada em vez de limitada ÷ persona)', 'voz', 'speedFactor: limitada / base.defaultSpeed', 'speedFactor: limitada'],
    ['vozDoFilmeCurto: vale para toda duração', 'voz', 'if (args.seconds !== SEEDANCE_SHORT_SECONDS || !isClassicShortEngine(', 'if (!isClassicShortEngine('], // reancorado KINEO-DURACOES-CURTAS: o predicado virou isClassicShortEngine (Seedance, Kling 2.5, Veo)
    ['vozDoFilmeCurto: assina o vertical cru (o compose deriva aparado/minúsculo)', 'voz', '  const vertical = verticalComoOCompose(args.vertical) ?? null\n', '  const vertical = typeof args.vertical === \'string\' && args.vertical ? args.vertical : null\n'],
    ['vozQueOComposeEscolhe: sem vertical escolhe por palavra-chave (não é o legado onyx do compose)', 'voz', '  if (vertical) {\n    try {', '  {\n    try {'],
    ['verticalComoOCompose: vertical só de espaços vira persona (o compose o trata como ausente → onyx)', 'voz', "return typeof vertical === 'string' && vertical.trim() ? vertical.trim().toLowerCase() : undefined", "return typeof vertical === 'string' && vertical ? vertical : undefined"],
    ['vozAssinadaDoClaim: ignora a velocidade do roteiro assinada (`speed: 1.1`)', 'voz', '(doRoteiro ?? 1) * fator', 'fator'],
    ['vozAssinadaDoClaim: aceita fator acima de 1 (acelerar a voz)', 'voz', 'fator <= 0 || fator > 1', 'fator <= 0'],
  ]
  for (const [nome, arq, de, para] of MUT) {
    const mut = trocaUma(SRC[arq], de, para)
    if (mut == null) { checa(`mutante APLICADO: ${nome}`, false); continue }
    let vermelho = !(await verde({ ...SRC, [arq]: mut }))
    // o mutante de validação precisa do caso inválido: roda o lixo direto
    if (!vermelho && /aceita fator/.test(nome)) vermelho = roda(mut).vozAssinadaDoClaim({ narration_voice: { vertical: null, speed_factor: 1.5 } }) !== null
    // o vertical cru só aparece com caixa/espaços: roda direto (a normalização do compose o salvaria no TTS, mas o claim mentiria)
    if (!vermelho && /vertical cru/.test(nome)) vermelho = roda(mut).vozDoFilmeCurto({ engine: 'seedance', seconds: 15, narration: 'x', vertical: '  Technology ', language: 'en' })?.vertical !== 'technology'
    checa(`mutante VERMELHO: ${nome}`, vermelho)
  }
}

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { for (const f of falhas) console.log('  - ' + f); process.exit(1) }
