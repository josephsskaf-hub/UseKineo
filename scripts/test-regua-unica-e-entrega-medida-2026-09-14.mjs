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
checa('o portão fica ANTES do dry-run (o dry-run exercita a decisão) e antes do hook pago da IA', iGate > 0 && iDry > iGate && iAiHook > iDry && rf.includes("gate: portao,") && rf.includes("if (!fit.ok && body.dry_run !== true) {"))
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

console.log('== 6) Kineo 1: o CAMINHO executado — roteiro curto → orientação → expandir OU duração menor → liberado ==')
{
  // o portão real, extraído da rota e executado com mocks (sem rede, sem POST pago)
  const ini = rf.indexOf('    let portao: {')
  const fim = rf.indexOf('    // Devolve as cenas planejadas e a narração ANTES do hook pago da IA')
  const trecho = rf.slice(ini, fim)
  const roda2 = (globals) => { const js = ts.transpileModule('export async function run() {' + trecho + '\n return { duration, portao } }', { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, ...globals }); return exp.run() }
  const eventos = []
  const base = (extra) => ({ verbatim: true, parsedScript: { segments: Array(5).fill({ voiceover: Array(10).fill('w').join(' ') }), speed: null }, narrationLanguage: { language: 'en' }, speechRateFor: SRX.speechRateFor, narrationFitAt: SRX.narrationFitAt, largestFittingDuration: (s) => [90, 60, 35].find((d) => s >= d * 0.95) ?? null, SUPPORTED_DURATIONS: [35, 60, 90], narrationTooShortMessage: () => 'Your script is short.', writeServerEvent: (e) => { eventos.push(e.name); return Promise.resolve(true) }, NextResponse: { json: (b, i) => ({ status: i?.status ?? 200, body: b }) }, user: { id: 'u' }, ...extra })
  // 50 palavras, 35 s, clássico: recusa 422 antes de qualquer POST, evento gravado, nada cobrado
  const r1 = await roda2({ ...base({ body: { dry_run: false } }), duration: 35 })
  checa('roteiro curto (50 pal / 35 s): 422 narration_too_short, com a duração menor que cabe e as palavras que faltam', r1.status === 422 && r1.body.reason === 'narration_too_short' && r1.body.shorter_duration === null && r1.body.missing_words > 0 && r1.body.retryable === false)
  checa('a recusa grava narration_guard_blocked com charged:false e nenhum outro evento', eventos.join(',') === 'narration_guard_blocked')
  // dry-run: mesma decisão, sem 422 — o relatório carrega gate.blocked
  eventos.length = 0
  const r2 = await roda2({ ...base({ body: { dry_run: true } }), duration: 35 })
  checa('dry-run exercita a MESMA decisão sem recusar nem gravar evento', r2.portao?.blocked === true && r2.portao?.reason === 'narration_too_short' && eventos.length === 0)
  // saída 1: expansão — 120 palavras para 35 s passam (38,7 s a 3,1)
  const r3 = await roda2({ ...base({ body: {}, parsedScript: { segments: Array(12).fill({ voiceover: Array(10).fill('w').join(' ') }), speed: null } }), duration: 35 })
  checa('depois de expandir (120 pal), o portão libera sem tocar no texto do autor', r3.portao?.blocked === false && r3.duration === 35)
  // saída 2: aceitar duração menor — 120 palavras pedindo 60 s: cabe 35 (38,7 s ≥ 33,25), só com consentimento
  eventos.length = 0
  const r4 = await roda2({ ...base({ body: { allow_shorter_duration: true }, parsedScript: { segments: Array(12).fill({ voiceover: Array(10).fill('w').join(' ') }), speed: null } }), duration: 60 })
  checa('com consentimento explícito, desce para 35 s e grava narration_autofit_down; libera', r4.duration === 35 && r4.portao?.blocked === false && r4.portao?.autofit_applied === true && eventos.join(',') === 'narration_autofit_down')
  const r5 = await roda2({ ...base({ body: {}, parsedScript: { segments: Array(12).fill({ voiceover: Array(10).fill('w').join(' ') }), speed: null } }), duration: 60 })
  checa('SEM consentimento a duração não muda sozinha: recusa honesta com shorter_duration 35', r5.status === 422 && r5.body.shorter_duration === 35)
  // sem loop: expandido na régua clássica (60 s × 3,1 × 0,95 = 177 pal) passa no portão clássico
  const expandido = Array(177).fill('w').join(' ')
  checa('a expansão medida a 3,1 (177 pal para 60 s) passa no portão clássico — sem loop', SRX.narrationFitAt(expandido, 60, C).ok === true)
  checa('a expansão medida a 2,3 (138 pal) NÃO passaria no portão clássico — era o loop', SRX.narrationFitAt(Array(138).fill('w').join(' '), 60, C).ok === false)
  const ex = rd('app/api/expand-script/route.ts')
  checa('expand-script mede na régua da família do motor (body.engine), fórmulas intactas', ex.includes('const regua = speechRateFor({ family: speechFamilyForQuality(body.engine) })') && ex.includes('const WORDS_PER_SECOND = regua.wordsPerSecond') && ex.includes('Math.min(palavrasTeto, Math.ceil(target * WORDS_PER_SECOND) + 8)'))
  const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
  checa('a tela trata a recusa do Kineo 1 na mesma caixa da cinematic (expandir ou duração menor), antes do erro genérico', gc.indexOf("if (res.status === 422 && data?.reason === 'narration_too_short') {") > 0 && gc.indexOf("if (res.status === 422 && data?.reason === 'narration_too_short') {") < gc.indexOf("console.error('[generate] fast-mode error:'"))
  checa('a tela manda o motor para a expansão e o preflight local usa a régua do motor', gc.includes('engine: quality,') && gc.includes('autofitDownAt(falaServidor, duration, speechRateFor({ family: speechFamilyForQuality(quality) }))'))
  checa('speechFamilyForQuality: cinematic_h3/hollywood/omni/s25 = hollywood; fast/seedance/kling/veo = classic', ['cinematic_h3', 'cinematic_hollywood', 'cinematic_omni', 'h3', 's25'].every((q) => SR.speechFamilyForQuality(q) === 'hollywood') && ['fast', 'cinematic_ai', 'cinematic_kling', 'cinematic_veo', undefined].every((q) => SR.speechFamilyForQuality(q) === 'classic'))
}

console.log('== 7) evento de entrega, executado no caminho real (mocks): medido, desconhecido, claim ausente, uma emissão ==')
{
  const ini = st.indexOf('        // ═══ KINEO-ENTREGA-MEDIDA-2026-09-14')
  const fim = st.indexOf("          console.warn('[entrega-medida] evento não gravado:'")
  const fimReal = st.indexOf('\n', st.indexOf('}', fim)) + 1
  const bloco = st.slice(ini, fimReal)
  const executa = async ({ measuredDelivery, claim, falhaClaim }) => {
    const eventos = []
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => { if (falhaClaim) throw new Error('db down'); return { data: claim } } }) }) }) }) }) }) }
    const js = ts.transpileModule('export async function run() {' + bloco + '\n }', { compilerOptions: { module: 1, target: 9 } }).outputText
    const exp = {}; vm.runInNewContext(js, { exports: exp, console: { warn: () => {}, log: () => {} }, supabase, COMPOSE_CLAIM_EVENT: 'compose_submission_claim', renderId: 'r1', user: { id: 'u1' }, quality: 'cinematic_h3', duration: 62, measuredDelivery, writeServerEvent: (e) => { eventos.push(e); return Promise.resolve(true) } })
    await exp.run()
    return eventos
  }
  const ok1 = await executa({ measuredDelivery: { measuredSeconds: 61.5, measureMethod: 'mvhd' }, claim: { metadata: { duration: 60, narration: 'one two three' } } })
  checa('entrega medida: 1 evento com pedido 60, planejado 62, medido 61,5 (mvhd), 3 palavras', ok1.length === 1 && ok1[0].name === 'render_delivered_measured' && ok1[0].metadata.requested_seconds === 60 && ok1[0].metadata.planned_seconds === 62 && ok1[0].metadata.measured_seconds === 61.5 && ok1[0].metadata.measure_method === 'mvhd' && ok1[0].metadata.narration_words === 3)
  const ok2 = await executa({ measuredDelivery: { measuredSeconds: null, measureMethod: 'unknown' }, claim: { metadata: { duration: 60 } } })
  checa('medição falhou: measured null + unknown — nunca o pedido nem o planejado no lugar', ok2.length === 1 && ok2[0].metadata.measured_seconds === null && ok2[0].metadata.measure_method === 'unknown' && ok2[0].metadata.requested_seconds === 60 && ok2[0].metadata.planned_seconds === 62)
  const ok3 = await executa({ measuredDelivery: { measuredSeconds: 61.5, measureMethod: 'mvhd' }, claim: null })
  checa('claim ausente: requested null, narration_words null, evento ainda sai', ok3.length === 1 && ok3[0].metadata.requested_seconds === null && ok3[0].metadata.narration_words === null)
  const ok4 = await executa({ measuredDelivery: { measuredSeconds: 61.5, measureMethod: 'mvhd' }, claim: null, falhaClaim: true })
  checa('banco fora do ar na leitura do claim: nenhum evento, nenhuma exceção (a entrega segue)', ok4.length === 0)
  checa('uma emissão por filme: o bloco vive dentro do ramo do primeiro done (deductedParam=false) e o nome aparece uma vez', (st.match(/name: 'render_delivered_measured'/g) || []).length === 1 && st.indexOf('// ═══ KINEO-ENTREGA-MEDIDA-2026-09-14') > st.indexOf('Only on the first "done" response (deductedParam=false)'))
  checa('cache (sem download) fica unknown: persistRenderAssets só mede quando baixa (onBytes)', ra.includes('let measuredSeconds: number | null = null') && ra.includes('onBytes: (buf) => { measuredSeconds = probeMp4DurationSeconds(buf) },') && !/measuredSeconds = videoTimeoutMs|measuredSeconds = duration/.test(ra))
}
console.log('== 8) cobertura 60/90 s (14/09): as três correções direcionadas que a matriz achou ==')
{
  const SP = roda(rd('lib/scriptParser.ts').split('\n').filter((l) => !/^import /.test(l)).join('\n'))
  const segs = Array.from({ length: 21 }, (_, i) => ({ pexelsQuery: 'q' + i, voiceover: `S${i + 1} a b c d e f g h i j k` }))
  const cap = SP.capSegmentsKeepingWords(segs, 12)
  const antes = segs.map((s) => s.voiceover).join(' ').split(' ').length
  const depois = cap.map((s) => s.voiceover).join(' ').split(' ').length
  checa('Kineo 1: 21 blocos viram 12 e NENHUMA palavra do autor some (era: 9 blocos jogados fora)', cap.length === 12 && antes === depois && cap[11].voiceover.startsWith('S12 ') && cap[11].voiceover.endsWith('S21 a b c d e f g h i j k'))
  checa('abaixo do teto nada muda', SP.capSegmentsKeepingWords(segs.slice(0, 8), 12).length === 8)
  checa('a rota usa o teto sem corte no lugar do slice', rf.includes('scenes = capSegmentsKeepingWords(parsedScript.segments, 12).map((seg) => ({') && !rf.includes('parsedScript.segments.slice(0, 12)'))
  checa('Kineo 1 modo IA: terceira passada por cena quando o total fica abaixo de 95% do alvo (texto da IA, nunca do autor)', rf.includes('if (scenes.length > 0 && total < alvoTotal * 0.95) {') && rf.includes('expandVoiceoversToTargets(curtas.map(({ s }) => ({ text: s.voiceover ??') && rf.indexOf('KINEO-TERCEIRA-PASSADA-2026-09-14') > rf.indexOf('} else {\n      try {'))
  checa('Veo/Sora a 90 s: clipes suficientes para o footage cobrir a fala (teto 12), só acima de 64 s', rc.includes('if ((wantsVeo || wantsSora) && duration > 64) clipCount = Math.max(clipCount, Math.min(12, Math.ceil(duration / 8) + 1))'))
  // aritmética do Veo: 90 s → 12 clipes × 8 = 96 s ≥ 88,7 s de fala; 60 s → intocado (7 × 8 = 56 + piso)
  const veo = (d) => Math.max(Math.max(2, Math.min(9, Math.ceil(d / 9))), Math.min(12, Math.ceil(d / 8) + 1))
  checa('Veo 90 s → 12 clipes (96 s de footage ≥ 88,7 s de fala)', veo(90) === 12 && veo(90) * 8 >= 88.7)
}
console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
