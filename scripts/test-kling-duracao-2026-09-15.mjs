// KINEO-KLING-DURACAO-2026-09-15 — Kling 2.5, render 8bf45931 (fundador, 15/09, nota 8,8,
// "entregou 82 s quando pedi 60"). Log da Vercel do compose: "voiceover generation started:
// script_words=193 duration=60s", "Narration Engine: persona=dark-mystery voice=onyx speed=0.92",
// "estimated TTS duration: 81.9s (requested 60s)" — e NENHUM "re-synthesizing": o atalho
// "scriptWellSized" (193 palavras ÷ 3,1 = 62 s previstos) calou o passe corretivo do
// Push #234. Este guardião executa a FATIA REAL do compose (previsão → atalho → corretivo)
// com TTS mockado e prova: (a) na main o corretivo NÃO dispara e o áudio fica em 81,9 s;
// (b) no candidato dispara na velocidade medido/pedido e o áudio volta para ~60 s;
// (c) deriva pequena continua sem re-síntese (economia preservada); (d) verbatim e cache
// continuam intocados; (e) corretivo que não melhora mantém o original.
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
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, ...globals }); return exp }

const INI = '    const scaledWordCount = scaledScript.split(/\\s+/).filter(Boolean).length'
const FIM = "        console.warn('[compose] corrective TTS pass failed — keeping original:', msg)\n      }\n    }"
function fatiaDe(rota) {
  const a = rota.indexOf(INI); const b = rota.indexOf(FIM, a)
  if (a < 0 || b < a) return null
  return rota.slice(a, b + FIM.length)
}
function montar(fatia) {
  return roda(`export async function rodar(ctx: any) {\n  const { scaledScript, predictTtsSecondsFromWords, DURATION_TOLERANCE_SECONDS, cachedVoiceover, avatarMode, hasUserVoice, clonedVoiceUsed, explicitSpeed, claimVerbatim, duration, generateTTS, estimateMp3DurationSeconds, vertical, narrationTier, language, console } = ctx\n  let realAudioDuration: number = ctx.realAudioDuration\n  let audioBuffer: any = ctx.audioBuffer\n${fatia}\n  return { realAudioDuration, audioBuffer }\n}`).rodar
}
const rota = rd('app/api/compose/route.ts')
const fatia = fatiaDe(rota)
checa('fatia previsão → atalho → corretivo existe no compose', Boolean(fatia))
checa('candidato: o atalho de custo exige que o MEDIDO também esteja perto (≤ 2× tolerância)', fatia.includes('const measuredNearRequest = realAudioDuration > 4 && Math.abs(realAudioDuration - duration) <= 2 * DURATION_TOLERANCE_SECONDS') && fatia.includes('<= DURATION_TOLERANCE_SECONDS && measuredNearRequest'))
checa('candidato: o corretivo continua o do Push #234 (velocidade = medido / pedido, só se melhorar)', fatia.includes('const correctiveSpeed = realAudioDuration / duration') && fatia.includes('Math.abs(retryDuration - duration) < Math.abs(realAudioDuration - duration)'))
const rodar = montar(fatia)

// o mundo do Kling 2.5 de ontem: 193 palavras, onyx a 0,92 → 81,9 s; re-síntese a velocidade v → 81,9 × 0,92 / clamp(0,92 × v, 0,7, 1,3)
const script193 = Array.from({ length: 193 }, (_, i) => `w${i}`).join(' ')
const mundo = (over = {}) => {
  const chamadas = []
  const ctx = {
    scaledScript: script193, predictTtsSecondsFromWords: (w) => w / 3.1, DURATION_TOLERANCE_SECONDS: 3,
    cachedVoiceover: null, avatarMode: false, hasUserVoice: false, clonedVoiceUsed: false, explicitSpeed: null, claimVerbatim: false,
    duration: 60, realAudioDuration: 81.9, audioBuffer: Buffer.from('original'),
    generateTTS: async (_s, speed) => { chamadas.push(speed); return Buffer.from('retry@' + speed) },
    estimateMp3DurationSeconds: (buf) => { const m = /retry@([\d.]+)/.exec(String(buf)); if (!m) return 81.9; const v = Number(m[1]); return Math.round((81.9 * 0.92 / Math.max(0.7, Math.min(1.3, 0.92 * v))) * 10) / 10 },
    vertical: 'mystery', narrationTier: 'cinematic', language: 'en', console: { log: () => {}, warn: () => {} },
    ...over,
  }
  return { ctx, chamadas }
}

console.log('== (a) reprodução na MAIN: o atalho cala o corretivo e o áudio fica em 81,9 s ==')
{
  let rotaMain = null
  try { rotaMain = execFileSync('git', ['show', 'origin/main:app/api/compose/route.ts'], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n') } catch { rotaMain = null }
  const fm = rotaMain ? fatiaDe(rotaMain) : null
  if (fm && !fm.includes('measuredNearRequest')) {
    const { ctx, chamadas } = mundo()
    const r = await montar(fm)(ctx)
    checa(`main: 193 palavras prevêem ${(193 / 3.1).toFixed(1)}s ("bem dimensionado") → corretivo NÃO dispara → áudio segue 81,9 s para 60 pedidos (o defeito)`, chamadas.length === 0 && r.realAudioDuration === 81.9)
  } else {
    checa('main já contém o candidato (ou git indisponível): reprodução da base não aplicável nesta árvore', Boolean(fm) && fm.includes('measuredNearRequest'))
  }
}

console.log('== (b) candidato: o corretivo dispara e o áudio volta para o pedido ==')
{
  const { ctx, chamadas } = mundo()
  const r = await rodar(ctx)
  checa(`corretivo chamado uma vez com speed = 81,9/60 = ${(81.9 / 60).toFixed(3)}`, chamadas.length === 1 && Math.abs(chamadas[0] - 81.9 / 60) < 0.001)
  checa(`áudio corrigido: ${r.realAudioDuration}s (≤ 63 = 60 + tolerância)`, r.realAudioDuration >= 57 && r.realAudioDuration <= 63 && String(r.audioBuffer).startsWith('retry@'))
}

console.log('== (b2) Board: palavras, ordem, legendas e sincronia preservadas; sem acelerar demais ==')
{
  const recebidos = []
  const { ctx } = mundo({ generateTTS: async (s, speed) => { recebidos.push({ s, speed }); return Buffer.from('retry@' + speed) } })
  await rodar(ctx)
  checa('a re-síntese recebe EXATAMENTE o mesmo roteiro (193 palavras, mesma ordem): nenhuma palavra cortada', recebidos.length === 1 && recebidos[0].s === script193)
  const lib = rd('lib/compose.ts')
  const efetiva = Math.max(0.7, Math.min(1.3, 0.92 * recebidos[0].speed))
  checa(`velocidade efetiva limitada pela banda natural do generateTTS (0,7–1,3): 0,92 × ${recebidos[0].speed.toFixed(3)} → ${efetiva.toFixed(3)} ≤ 1,3`, lib.includes('const safeSpeed = Math.max(0.7, Math.min(1.3, Number.isFinite(baseSpeed) ? baseSpeed : 1.0))') && efetiva <= 1.3)
  checa('o corretivo NÃO existe fora dessa banda: nunca pede 1,5× ou mais ao TTS', /Math\.max\(0\.7, Math\.min\(1\.3/.test(lib))
  const iFim = rota.indexOf(FIM)
  const depois = rota.slice(iFim)
  checa('legendas e sincronia: o Whisper transcreve o MESMO buffer corrigido (transcribeTTSWithTimestamps(audioBuffer)) depois do corretivo, e o upload usa o mesmo buffer', depois.includes('transcribeTTSWithTimestamps(audioBuffer)') && depois.includes('uploadVoiceoverToSupabase(user.id, audioBuffer as Buffer)'))
  checa('a duração real usada pelo compose passa a ser a corrigida (realAudioDuration = retryDuration), não a prevista', fatia.includes('realAudioDuration = retryDuration'))
}

console.log('== (c) deriva pequena com previsão certa: sem re-síntese (a economia do cache continua) ==')
{
  const { ctx, chamadas } = mundo({ realAudioDuration: 64.5 })
  const r = await rodar(ctx)
  checa('64,5 s medidos para 60 (dentro de 2× tolerância) e previsão 62 s → nenhuma 2ª síntese; áudio original mantido', chamadas.length === 0 && r.realAudioDuration === 64.5)
}
{
  const { ctx, chamadas } = mundo({ realAudioDuration: 66.5 })
  await rodar(ctx)
  checa('66,5 s (fora de 2× tolerância) → corretivo dispara (a fronteira é 66 s)', chamadas.length === 1)
}

console.log('== (d) verbatim e cache continuam intocados ==')
{
  const { ctx, chamadas } = mundo({ claimVerbatim: true })
  const r = await rodar(ctx)
  checa('roteiro verbatim: 81,9 s medidos e NENHUMA re-síntese (o texto literal não muda de ritmo)', chamadas.length === 0 && r.realAudioDuration === 81.9)
  const c2 = mundo({ cachedVoiceover: { audioDuration: 81.9 } })
  await rodar(c2.ctx)
  checa('cache hit: nenhuma re-síntese', c2.chamadas.length === 0)
  const c3 = mundo({ explicitSpeed: 1.1 })
  await rodar(c3.ctx)
  checa('velocidade explícita do autor: nenhuma re-síntese', c3.chamadas.length === 0)
}

console.log('== (e) corretivo que não melhora mantém o original; falha do TTS não derruba ==')
{
  const { ctx, chamadas } = mundo({ estimateMp3DurationSeconds: () => 95 })
  const r = await rodar(ctx)
  checa('re-síntese pior (95 s) → mantém 81,9 s e o buffer original', chamadas.length === 1 && r.realAudioDuration === 81.9 && String(r.audioBuffer) === 'original')
  const c2 = mundo({ generateTTS: async () => { throw new Error('tts down') } })
  const r2 = await rodar(c2.ctx)
  checa('TTS lança → mantém original, sem exceção', r2.realAudioDuration === 81.9)
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
