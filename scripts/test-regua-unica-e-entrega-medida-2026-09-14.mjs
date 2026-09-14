// KINEO-REGUA-UNICA + KINEO-ENTREGA-MEDIDA (14/09/2026) — direção do fundador:
// (1) planejamento e portão medem com a MESMA estimativa por configuração de voz;
// (2) roteiro próprio não é encurtado em silêncio (Kineo 1 entregou 18,7 s para 35 s);
// (3) a entrega grava a duração MEDIDA do arquivo e o método; ausência = unknown.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, require: () => ({}), ...globals }); return exp }

console.log('== 1) lib/speechRate: uma fonte, duas famílias, velocidade, estimativa ==')
const SR = roda(rd('lib/speechRate.ts'))
checa('clássico 3,1 · hollywood 2,3', SR.speechRateFor({ family: 'classic' }).wordsPerSecond === 3.1 && SR.speechRateFor({ family: 'hollywood' }).wordsPerSecond === 2.3)
checa('velocidade multiplica e é limitada a 0,5–2', SR.speechRateFor({ family: 'classic', speed: 1.2 }).wordsPerSecond === 3.72 && SR.speechRateFor({ family: 'hollywood', speed: 9 }).wordsPerSecond === 4.6)
checa('basis é sempre estimate (nunca áudio medido)', SR.speechRateFor({ family: 'classic' }).basis === 'estimate' && SR.speechRateFor({ family: 'hollywood', speed: 1, language: 'pt' }).basis === 'estimate')

console.log('== 2) lib/speechRate envolve lib/narrationFit (trava 8.2: intocado) — mesma aritmética ==')
const NF = roda(rd('lib/narrationFit.ts'))
const SRX = roda(rd('lib/speechRate.ts').replace(/import \{[\s\S]*?\} from '@\/lib\/narrationFit'/, ''), { narrationFit: NF.narrationFit, autofitDown: NF.autofitDown, WORDS_PER_SECOND: NF.WORDS_PER_SECOND, MIN_COVERAGE: NF.MIN_COVERAGE, MIN_AUTOFIT_DOWN_COVERAGE: NF.MIN_AUTOFIT_DOWN_COVERAGE, AUTOFIT_DOWN_FLOOR_SECONDS: NF.AUTOFIT_DOWN_FLOOR_SECONDS, AUTOFIT_DOWN_STEP_SECONDS: NF.AUTOFIT_DOWN_STEP_SECONDS })
const H = SRX.speechRateFor({ family: 'hollywood' })
const C = SRX.speechRateFor({ family: 'classic' })
const brief66 = Array(66).fill('word').join(' ')
checa('lib/narrationFit.ts não foi tocado (trava 8.2): narrationFit(script, alvo) segue com 2 argumentos', /export function narrationFit\(script: string, targetSeconds: number\): NarrationFit \{/.test(rd('lib/narrationFit.ts')))
checa('a 2,3 o envelope É a narrationFit (mesmo objeto de saída)', JSON.stringify(SRX.narrationFitAt(brief66, 30, H)) === JSON.stringify(NF.narrationFit(brief66, 30)))
checa('66 palavras enchem 30 s a 2,3 (hollywood)', SRX.narrationFitAt(brief66, 30, H).ok === true)
checa('66 palavras NÃO enchem 30 s a 3,1 (clássico): 21,3 s', SRX.narrationFitAt(brief66, 30, C).ok === false && Math.abs(SRX.narrationFitAt(brief66, 30, C).speech - 21.29) < 0.05)
checa('missingWords usa a régua da configuração', SRX.narrationFitAt(brief66, 30, C).missingWords === Math.ceil((30 * 0.95 - 66 / 3.1) * 3.1))
const af = SRX.autofitDownAt(Array(120).fill('w').join(' '), 60, C)
checa('autofitDownAt na régua clássica (120 pal a 3,1 = 38,7 s → desce para 35)', af.applied === true && af.effectiveSeconds === 35 && Math.abs(af.speechSeconds - 120 / 3.1) < 0.05)
for (const [w, t] of [[110, 60], [40, 35], [20, 90], [140, 60], [0, 60]]) checa(`espelho fiel: autofitDownAt a 2,3 === autofitDown (${w} pal, ${t} s)`, JSON.stringify(SRX.autofitDownAt(Array(w).fill('w').join(' '), t, H)) === JSON.stringify(NF.autofitDown(Array(w).fill('w').join(' '), t)))

console.log('== 3) rota cinematic: a régua da família entra no portão, no degrau e no dry-run ==')
const rc = rd('app/api/generate-video-cinematic/route.ts')
checa('narrationRate nasce da família (classic/hollywood) e da velocidade do roteiro', rc.includes("const narrationRate = speechRateFor({ family: hollywoodPath ? 'hollywood' : 'classic', speed: parsedScript.speed, language: narrationLanguage.language })"))
checa('as 3 medições do portão verbatim usam narrationFitAt com a régua da família', (rc.match(/narrationFitAt\(parsedScript\.narration, duration, narrationRate\)/g) || []).length === 3 && !/narrationFit\(parsedScript\.narration, duration\)/.test(rc))
checa('o degrau usa a mesma régua (autofitDownAt), com o consentimento explícito de 11/09 intacto', /body\.allow_shorter_duration === true && verbatim && parsedScript\.narration\n\s+\? autofitDownAt\(parsedScript\.narration, requestedDuration, narrationRate, \{/.test(rc))
checa('o dry-run clássico usa a mesma régua', /verbatim,\n\s+wordsPerSecond: narrationRate\.wordsPerSecond,\n\s+\}\)/.test(rc))

console.log('== 4) rota fast (Kineo 1): roteiro próprio curto → recusa com saída, antes do gasto ==')
const rf = rd('app/api/generate-video-fast/route.ts')
const iGate = rf.indexOf('KINEO-REGUA-UNICA-2026-09-14 — O KINEO 1 ENCURTAVA SEM AVISAR')
const iDry = rf.indexOf('if (body.dry_run === true && isDryRunAccount(user.email)) {')
const iAiHook = rf.indexOf('// KINEO-AI-HOOK — FIRST-VIDEO cinematic opener.')
checa('o portão fica depois do dry-run (que segue reportando) e antes do hook pago da IA', iDry > 0 && iGate > iDry && iAiHook > iGate)
checa('só o roteiro próprio (verbatim) passa pelo portão; a IA escreve do tamanho certo', /if \(verbatim\) \{\n\s+const falaDoAutor = parsedScript\.segments\.map/.test(rf))
checa('régua clássica com a velocidade do roteiro', rf.includes("speechRateFor({ family: 'classic', speed: parsedScript.speed, language: narrationLanguage.language })"))
checa('duração menor só com allow_shorter_duration, escolhida da lista do seletor', /if \(!fit\.ok && body\.allow_shorter_duration === true\) \{\n\s+const menor = largestFittingDuration\(fit\.speech\)/.test(rf) && rf.includes("name: 'narration_autofit_down'"))
checa('recusa 422 com a mensagem acionável, motivo, segundos e a duração menor que cabe — nada cobrado', rf.includes("error: narrationTooShortMessage(fit, SUPPORTED_DURATIONS),") && rf.includes("reason: 'narration_too_short',") && rf.includes("shorter_duration: largestFittingDuration(fit.speech),") && rf.includes("name: 'narration_guard_blocked', userId: user.id, path: '/api/generate-video-fast'"))
checa('duration virou let (o degrau precisa descer)', rf.includes('let duration: Duration = SUPPORTED_DURATIONS.includes(requestedDuration as Duration)'))
// executa a régua nova no caso real medido: 50 palavras pedindo 35 s no Kineo 1
const caso515 = SRX.narrationFitAt(Array(50).fill('w').join(' '), 35, C)
checa('515c188b (50 palavras, 35 s) agora é barrado: 16,1 s de fala, cobertura 46%', caso515.ok === false && Math.abs(caso515.speech - 16.13) < 0.05)

console.log('== 5) entrega medida: lib/renderAssets + compose/status ==')
const ra = rd('lib/renderAssets.ts')
checa('a sonda mvhd roda nos MESMOS bytes da cópia (onBytes), sem segundo download', ra.includes('try { args.onBytes?.(buffer) } catch') && ra.includes('onBytes: (buf) => { measuredSeconds = probeMp4DurationSeconds(buf) },'))
checa('persistRenderAssets devolve measuredSeconds + measureMethod; sem leitura = unknown, nunca um número', ra.includes("measureMethod: measuredSeconds != null ? 'mvhd' : 'unknown'") && ra.includes("return { videoUrl, thumbnailUrl: snapshotUrl, measuredSeconds: null, measureMethod: 'unknown' }"))
const st = rd('app/api/compose/status/[renderId]/route.ts')
checa('o evento render_delivered_measured sai no ponto de entrega com pedido, planejado, medido e método', st.includes("name: 'render_delivered_measured'") && st.includes('requested_seconds: Number.isFinite(requested) && requested > 0 ? requested : null,') && st.includes('planned_seconds: duration,') && st.includes('measured_seconds: measuredDelivery.measuredSeconds,') && st.includes('measure_method: measuredDelivery.measureMethod,'))
checa('medição ausente fica null/unknown — nunca preenchida com a duração pedida', st.includes("let measuredDelivery: { measuredSeconds: number | null; measureMethod: 'mvhd' | 'unknown' } = { measuredSeconds: null, measureMethod: 'unknown' }") && !/measured_seconds: duration/.test(st) && !/measured_seconds: requested/.test(st))
checa('o que a rota não sabe vai como desconhecido (idioma/voz/velocidade/legenda/trilha/modo)', st.includes('language: null, voice: null, speed: null,') && st.includes('captions_configured: null, music_configured: null,') && st.includes('input_mode: null,'))
// a sonda em si, executada, sobre um MP4 sintético
{
  const mp4 = roda(rd('lib/mp4Duration.ts'))
  const box = (type, payload) => { const b = Buffer.alloc(8 + payload.length); b.writeUInt32BE(8 + payload.length, 0); b.write(type, 4, 'ascii'); payload.copy(b, 8); return b }
  const mvhd = Buffer.alloc(100); mvhd.writeUInt32BE(600, 12); mvhd.writeUInt32BE(600 * 61.5, 16)
  checa('sonda: 61,5 s lidos do cabeçalho', mp4.probeMp4DurationSeconds(Buffer.concat([box('ftyp', Buffer.from('isom')), box('moov', box('mvhd', mvhd))])) === 61.5)
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
