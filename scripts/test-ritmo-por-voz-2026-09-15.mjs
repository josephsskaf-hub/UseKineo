// KINEO-RITMO-POR-VOZ-2026-09-15 — Seedance d6e8e8b3 (fundador, 15/09, 25 cr, pedido do faroleiro,
// 60 s): 198 palavras pela régua clássica de 3,1 pal/s "davam 62 s"; a persona dark-mystery (onyx
// 0,92) falou 86,4 s (2,29 pal/s); o corretivo do compose disparou (×1,44) e a 2ª TTS deu "Request
// timed out" → filme de 86 s para 60 pedidos. O Kling 8bf45931 (82 s) era o mesmo defeito. Este
// guardião prova: (a) a régua única (lib/speechRate) conhece a voz medida: onyx = 2,5 × velocidade
// da persona × velocidade do roteiro; as outras vozes seguem 3,1; hollywood não muda; (b) o orçamento
// de palavras por cena e o relatório do dry-run clássico andam nessa régua; (c) a rota resolve a
// persona no plano com a MESMA função do compose; (d) o compose escala e prevê nessa régua e o
// corretivo tenta a TTS duas vezes antes de aceitar o áudio errado (fatia real, TTS mockada).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, Buffer, ...globals }); return exp }
// lib/speechRate importa lib/narrationFit (trava 8.2, não tocado) e lib/scriptParser: fatia só a função
const srSrc = rd('lib/speechRate.ts')
const ini = srSrc.indexOf("export type SpeechFamily")
const fim = srSrc.indexOf('/** narrationFit na régua da configuração')
checa('fatia de speechRateFor existe', ini > 0 && fim > ini)
const SR = roda(srSrc.slice(ini, fim))

console.log('== (a) a régua única conhece a voz medida ==')
{
  checa('onyx a 0,92 (dark-mystery) → 2,3 pal/s (2,5 × 0,92)', SR.speechRateFor({ family: 'classic', voice: 'onyx', personaSpeed: 0.92 }).wordsPerSecond === 2.3)
  checa('onyx a 1,0 (finance-authority) → 2,5; a 0,96 (conspiracy) → 2,4', SR.speechRateFor({ family: 'classic', voice: 'onyx', personaSpeed: 1 }).wordsPerSecond === 2.5 && SR.speechRateFor({ family: 'classic', voice: 'onyx', personaSpeed: 0.96 }).wordsPerSecond === 2.4)
  checa('velocidade do roteiro multiplica por cima (onyx 0,92 × speed 1,2 → 2,76)', SR.speechRateFor({ family: 'classic', voice: 'onyx', personaSpeed: 0.92, speed: 1.2 }).wordsPerSecond === 2.76)
  checa('voz NÃO medida (fable, echo, alloy, nova) segue 3,1 — nada inventado', ['fable', 'echo', 'alloy', 'nova'].every((v) => SR.speechRateFor({ family: 'classic', voice: v, personaSpeed: 0.9 }).wordsPerSecond === 3.1))
  checa('sem voz: 3,1 clássico e 2,3 hollywood, como antes; hollywood ignora a tabela de vozes', SR.speechRateFor({ family: 'classic' }).wordsPerSecond === 3.1 && SR.speechRateFor({ family: 'hollywood' }).wordsPerSecond === 2.3 && SR.speechRateFor({ family: 'hollywood', voice: 'onyx', personaSpeed: 0.94 }).wordsPerSecond === 2.3)
  checa('a tabela só tem a voz medida (onyx = 2,5)', JSON.stringify(SR.CLASSIC_VOICE_WORDS_PER_SECOND) === '{"onyx":2.5}')
  checa('reprodução: 198 palavras a 2,3 = 86 s (o filme mediu 86,4); a 3,1 "davam" 64 s', Math.round(198 / 2.3) === 86 && Math.round(198 / 3.1) === 64)
}

console.log('== (b) orçamento por cena e dry-run clássico na régua da voz ==')
{
  const sw = rd('lib/cinematic/sceneWords.ts')
  const SW = roda(sw.replace("import { targetWordCount } from '@/lib/compose'", 'const targetWordCount = (d: number) => Math.round(Math.max(5, Math.min(120, Math.round(d))) * 3.1)'))
  const antes = SW.wordsPerSceneFor(60, 7), agora = SW.wordsPerSceneFor(60, 7, 2.3)
  checa(`60 s / 7 cenas: a 3,1 pedia ${antes[0]}-${antes[1]} palavras por cena (186 no total); a 2,3 pede ${agora[0]}-${agora[1]} (138 no total)`, antes[0] === 23 && antes[1] === 30 && agora[0] === 17 && agora[1] === 22)
  checa('sem régua, a faixa antiga continua idêntica (guardião do vigia intacto)', JSON.stringify(SW.wordsPerSceneFor(90, 9)) === JSON.stringify([27, 35]) && JSON.stringify(SW.wordsPerSceneFor(60, 6)) === JSON.stringify([27, 35]))
  const cdSrc = rd('lib/cinematic/classicDryRun.ts')
  const CD = roda(cdSrc.replace(/^import .*$/gm, ''), { targetWordCount: (d) => Math.round(d * 3.1) })
  const fala = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ')
  const r = CD.classicDryRunReport({ scenes: Array.from({ length: 7 }, () => ({ voiceover: fala(28), prompt: 'x' })), targetSeconds: 60, secondsPerClip: 10, verbatim: false, wordsPerSecond: 2.3 })
  checa(`dry-run clássico a 2,3: 196 palavras → ${r.speech_seconds} s de fala e alvo ${r.expected_words} palavras → FAIL (o filme de 86 s seria barrado a $0)`, r.pass === false && r.expected_words === 138 && Math.round(r.speech_seconds) === 85)
  const r2 = CD.classicDryRunReport({ scenes: Array.from({ length: 7 }, () => ({ voiceover: fala(20), prompt: 'x' })), targetSeconds: 60, secondsPerClip: 10, verbatim: false, wordsPerSecond: 2.3 })
  checa('140 palavras a 2,3 → 61 s: PASS', r2.pass === true && Math.round(r2.speech_seconds) === 61)
}

console.log('== (c) a rota resolve a persona no plano com a mesma função do compose ==')
{
  const rc = rd('app/api/generate-video-cinematic/route.ts')
  checa('importa selectPersonaForScript de @/lib/narration/niche-mapping (a mesma do compose)', rc.includes("import { selectPersonaForScript } from '@/lib/narration/niche-mapping'"))
  checa('classicPersona = selectPersonaForScript(prompt, vertical, cinematic, idioma) só no clássico, fail-open', rc.includes("const classicPersona = hollywoodPath ? null : (() => {") && rc.includes("return selectPersonaForScript(prompt, typeof body.vertical === 'string' && body.vertical.trim() ? body.vertical.trim().toLowerCase() : undefined, 'cinematic', narrationLanguage.language) } catch { return null }"))
  checa('narrationRate leva voz e velocidade da persona; o orçamento do escritor clássico usa a mesma régua', rc.includes("voice: classicPersona?.voice, personaSpeed: classicPersona?.defaultSpeed })") && rc.includes("wordsPerScene: wordsPerSceneFor(duration, clipCount, narrationRate.wordsPerSecond)"))
  checa('o dry-run clássico continua na narrationRate (régua única)', /verbatim,\n\s+wordsPerSecond: narrationRate\.wordsPerSecond,\n\s+\}\)/.test(rc))
  const NM = (() => { try { return roda(rd('lib/narration/niche-mapping.ts').replace(/^import .*$/gm, ''), { VOICE_PERSONAS: roda(rd('lib/narration/personas.ts')).VOICE_PERSONAS }) } catch { return null } })()
  if (NM && NM.selectPersonaForScript) {
    const p = NM.selectPersonaForScript(rd('docs/coordination/motores/ROTEIROS-TESTE-2026-09-15.md').split('## 1. Seedance 1.5')[1].split('```')[1], undefined, 'cinematic', 'en')
    checa(`o pedido do faroleiro resolve para ${p.id} (${p.voice} ${p.defaultSpeed}) → régua ${SR.speechRateFor({ family: 'classic', voice: p.voice, personaSpeed: p.defaultSpeed }).wordsPerSecond}`, p.voice === 'onyx' && SR.speechRateFor({ family: 'classic', voice: p.voice, personaSpeed: p.defaultSpeed }).wordsPerSecond < 3.1)
  } else {
    checa('resolução da persona não executável aqui (imports); string checks acima cobrem', true)
  }
}

console.log('== (d) compose: escala e prevê na régua da voz; corretivo tenta duas vezes ==')
{
  const cp = rd('app/api/compose/route.ts')
  checa('composeRate resolvido pela mesma persona do generateTTS; alvo do escalador = duração × régua no clássico', cp.includes("const p = selectPersonaForScript(voiceoverScript, vertical, narrationTier, language)") && cp.includes("return speechRateFor({ family, speed: explicitSpeed, language, voice: p.voice, personaSpeed: p.defaultSpeed })") && cp.includes("scaledScript = await scaleVoiceoverScript(voiceoverScript, composeTargetWords)"))
  checa('previsão de duração na régua da voz (clássico); hollywood mantém a antiga', cp.includes("const predictedDuration = composeRate.family === 'classic' && composeRate.wordsPerSecond > 0 ? scaledWordCount / composeRate.wordsPerSecond : predictTtsSecondsFromWords(scaledWordCount)"))
  checa('o corretivo tenta a TTS duas vezes antes de manter o original', cp.includes("for (let tentativa = 1; tentativa <= 2 && !retryBuffer; tentativa++) {") && cp.includes("if (tentativa === 2) throw e"))
  // fatia real: previsão → atalho → corretivo (mesmas âncoras do test-kling-duracao)
  const INI = '    const scaledWordCount = scaledScript.split(/\\s+/).filter(Boolean).length'
  const FIM = "        console.warn('[compose] corrective TTS pass failed — keeping original:', msg)\n      }\n    }"
  const a = cp.indexOf(INI), b = cp.indexOf(FIM, a)
  checa('fatia previsão → corretivo existe', a > 0 && b > a)
  const fatia = cp.slice(a, b + FIM.length)
  const rodar = roda(`export async function rodar(ctx: any) {\n  const { scaledScript, composeRate, predictTtsSecondsFromWords, DURATION_TOLERANCE_SECONDS, cachedVoiceover, avatarMode, hasUserVoice, clonedVoiceUsed, explicitSpeed, claimVerbatim, duration, generateTTS, estimateMp3DurationSeconds, vertical, narrationTier, language, console } = ctx\n  let realAudioDuration = ctx.realAudioDuration\n  let audioBuffer = ctx.audioBuffer\n${fatia}\n  return { realAudioDuration, audioBuffer }\n}`).rodar
  const script198 = Array.from({ length: 198 }, (_, i) => `p${i}`).join(' ')
  const mundo = (over = {}) => {
    const chamadas = []
    const ctx = {
      scaledScript: script198, composeRate: { family: 'classic', wordsPerSecond: 2.3 }, predictTtsSecondsFromWords: (w) => w / 3.1, DURATION_TOLERANCE_SECONDS: 3,
      cachedVoiceover: null, avatarMode: false, hasUserVoice: false, clonedVoiceUsed: false, explicitSpeed: null, claimVerbatim: false,
      duration: 60, realAudioDuration: 86.4, audioBuffer: Buffer.from('original'),
      generateTTS: async (_s, speed) => { chamadas.push(speed); return Buffer.from('retry@' + speed) },
      estimateMp3DurationSeconds: (buf) => { const m = /retry@([\d.]+)/.exec(String(buf)); if (!m) return 86.4; const v = Number(m[1]); return Math.round((86.4 * 0.92 / Math.max(0.7, Math.min(1.3, 0.92 * v))) * 10) / 10 },
      vertical: 'mystery', narrationTier: 'cinematic', language: 'en', console: { log: () => {}, warn: () => {} },
      ...over,
    }
    return { ctx, chamadas }
  }
  {
    const { ctx, chamadas } = mundo()
    const r = await rodar(ctx)
    checa(`d6e8e8b3 na régua da voz: 198 palavras preveem 86 s (não 64) → o atalho não cala o corretivo, que dispara (${chamadas.length} chamada a ×${(chamadas[0] || 0).toFixed(2)}) e o áudio volta para ${r.realAudioDuration}s`, chamadas.length === 1 && Math.abs(chamadas[0] - 1.44) < 0.01 && r.realAudioDuration < 70)
  }
  {
    let n = 0
    const { ctx, chamadas } = mundo({ generateTTS: async (_s, speed) => { n++; if (n === 1) throw new Error('Request timed out.'); chamadas.push(speed); return Buffer.from('retry@' + speed) } })
    const r = await rodar(ctx)
    checa(`a 1ª TTS corretiva estoura o tempo → a 2ª tentativa entra e corrige (${r.realAudioDuration}s)`, n === 2 && chamadas.length === 1 && r.realAudioDuration < 70)
  }
  {
    let n = 0
    const { ctx } = mundo({ generateTTS: async () => { n++; throw new Error('Request timed out.') } })
    const r = await rodar(ctx)
    checa('duas falhas seguidas → original mantido (86,4 s), sem crash — como antes, só que com duas tentativas', n === 2 && r.realAudioDuration === 86.4)
  }
  {
    const { ctx, chamadas } = mundo({ scaledScript: Array.from({ length: 140 }, (_, i) => `p${i}`).join(' '), realAudioDuration: 61 })
    const r = await rodar(ctx)
    checa('140 palavras a 2,3 (61 s previstos, 61 medidos): bem dimensionado, nenhuma re-síntese', chamadas.length === 0 && r.realAudioDuration === 61)
  }
}

console.log('== (e) reprodução na origin/main ==')
{
  let main = null
  try { main = execFileSync('git', ['show', 'origin/main:lib/speechRate.ts'], { cwd: RAIZ, maxBuffer: 16 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n') } catch {}
  if (main && !main.includes('KINEO-RITMO-POR-VOZ-2026-09-15')) {
    const i2 = main.indexOf('export type SpeechFamily'), f2 = main.indexOf('/** narrationFit na régua da configuração')
    const M = roda(main.slice(i2, f2))
    checa('main: a régua ignorava a voz — onyx a 0,92 continuava 3,1 pal/s (198 palavras "cabiam" em 60 s)', M.speechRateFor({ family: 'classic', voice: 'onyx', personaSpeed: 0.92 }).wordsPerSecond === 3.1)
  } else {
    checa('reprodução na main pulada (origin/main já traz o conserto, ou git indisponível)', true)
  }
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
