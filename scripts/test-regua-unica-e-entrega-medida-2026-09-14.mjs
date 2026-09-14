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
const SPX = roda(rd('lib/scriptParser.ts'))
const SRX = roda(rd('lib/speechRate.ts').replace(/import \{[\s\S]*?\} from '@\/lib\/narrationFit'/, '').replace(/import \{ parseSpeed, parseUserScript \} from '@\/lib\/scriptParser'/, ''), { parseSpeed: SPX.parseSpeed, parseUserScript: SPX.parseUserScript, narrationFit: NF.narrationFit, autofitDown: NF.autofitDown, WORDS_PER_SECOND: NF.WORDS_PER_SECOND, MIN_COVERAGE: NF.MIN_COVERAGE, MIN_AUTOFIT_DOWN_COVERAGE: NF.MIN_AUTOFIT_DOWN_COVERAGE, AUTOFIT_DOWN_FLOOR_SECONDS: NF.AUTOFIT_DOWN_FLOOR_SECONDS, AUTOFIT_DOWN_STEP_SECONDS: NF.AUTOFIT_DOWN_STEP_SECONDS })
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
const iDry = rf.indexOf('    if (dryRunAutorizado) {\n      const fastReport = classicDryRunReport({')
const iAiHook = rf.indexOf('// KINEO-AI-HOOK — FIRST-VIDEO cinematic opener.')
checa('o portão fica ANTES do dry-run (o dry-run exercita a decisão) e antes do hook pago da IA; a autorização do ensaio é conferida antes de tudo', iGate > 0 && iDry > iGate && iAiHook > iDry && rf.indexOf('const dryRunAutorizado = body.dry_run === true && isDryRunAccount(user.email)') < iGate + 1600 && rf.indexOf('const dryRunAutorizado = body.dry_run === true && isDryRunAccount(user.email)') > 0 && rf.includes("gate: portao,") && rf.includes("if (!fit.ok && !dryRunAutorizado) {"))
checa('só o roteiro próprio (verbatim) passa pelo portão; a IA escreve do tamanho certo', /if \(verbatim\) \{\n\s+\/\/ KINEO-TETO-EXPLICITO-2026-09-14[\s\S]{0,1400}const falaDoAutor = parsedScript\.segments\.map/.test(rf))
checa('régua clássica com a velocidade do roteiro, UMA para o portão e para o relatório', rf.includes("const narrationRate = speechRateFor({ family: 'classic', speed: parsedScript.speed, language: narrationLanguage.language })") && rf.includes('wordsPerSecond: narrationRate.wordsPerSecond, // Board 14/09'))
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

console.log('== 6) Kineo 1: o CAMINHO executado — dry-run só autorizado; >12 blocos recusa explícita; curto → expandir OU duração menor ==')
const eventos = []
const gateSlice = (() => { const ini = rf.indexOf('    const dryRunAutorizado = body.dry_run === true && isDryRunAccount(user.email)'); const fim = rf.indexOf('    // Devolve as cenas planejadas e a narração ANTES do hook pago da IA'); return rf.slice(ini, fim) })()
const rodaGate = (globals) => { const js = ts.transpileModule('export async function run() {' + gateSlice + '\n return { duration, portao } }', { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, ...globals }); return exp.run() }
const segs = (n, w = 10) => Array(n).fill(null).map((_, i) => ({ pexelsQuery: 'q' + i, voiceover: Array(w).fill('w').join(' ') }))
const base = (extra) => ({ verbatim: true, parsedScript: { segments: segs(5), speed: null }, narrationLanguage: { language: 'en' }, speechRateFor: SRX.speechRateFor, narrationFitAt: SRX.narrationFitAt, largestFittingDuration: (s) => [90, 60, 35].find((d) => s >= d * 0.95) ?? null, SUPPORTED_DURATIONS: [35, 60, 90], narrationTooShortMessage: () => 'Your script is short.', writeServerEvent: (e) => { eventos.push(e.name); return Promise.resolve(true) }, NextResponse: { json: (b, i) => ({ status: i?.status ?? 200, body: b }) }, user: { id: 'u', email: 'x@y.z' }, isDryRunAccount: () => false, duration: 35, ...extra })
{
  // ── segurança: interno/externo × true/false ──
  const casos = [
    ['externo dry_run=false', { body: { dry_run: false }, isDryRunAccount: () => false }, 422],
    ['interno dry_run=false', { body: { dry_run: false }, isDryRunAccount: () => true }, 422],
    ['interno dry_run=true', { body: { dry_run: true }, isDryRunAccount: () => true }, 'ensaio'],
  ]
  for (const [nome, extra, esperado] of casos) {
    eventos.length = 0
    const r = await rodaGate(base(extra))
    if (esperado === 422) checa(`${nome}: roteiro curto é RECUSADO (422) e grava narration_guard_blocked — nunca chega à seção paga`, r.status === 422 && r.body.reason === 'narration_too_short' && eventos.join(',') === 'narration_guard_blocked')
    else checa(`${nome}: ensaio autorizado — mesma decisão no relatório (gate.blocked), sem 422 e sem evento`, r.status === undefined && r.portao?.blocked === true && eventos.length === 0)
  }
  // ── >12 blocos: recusa explícita antes do gasto (nada fundido em silêncio) ──
  eventos.length = 0
  const r21 = await rodaGate(base({ body: {}, parsedScript: { segments: segs(21, 14), speed: null }, duration: 90 }))
  checa('21 blocos [Pexels]: 422 too_many_clips com clips=21 e max=12, nada cobrado, evento gravado', r21.status === 422 && r21.body.reason === 'too_many_clips' && r21.body.clips === 21 && r21.body.max_clips === 12 && eventos.join(',') === 'narration_guard_blocked')
  const r21d = await rodaGate(base({ body: { dry_run: true }, isDryRunAccount: () => true, parsedScript: { segments: segs(21, 14), speed: null }, duration: 90 }))
  checa('21 blocos no ensaio autorizado: relatório diz too_many_clips, sem 422', r21d.status === undefined && r21d.portao?.reason === 'too_many_clips')
  const r12 = await rodaGate(base({ body: {}, parsedScript: { segments: segs(12, 24), speed: null }, duration: 90 }))
  checa('12 blocos de 24 palavras (288 pal, 93 s) passam a 90 s', r12.status === undefined && r12.portao?.blocked === false)
  checa('a fusão silenciosa de blocos morreu (capSegmentsKeepingWords não existe mais; a rota mapeia os segmentos como são)', !rd('lib/scriptParser.ts').includes('capSegmentsKeepingWords') && rf.includes('scenes = parsedScript.segments.map((seg) => ({'))
  // ── curto → expandir OU duração menor ──
  const r3 = await rodaGate(base({ body: {}, parsedScript: { segments: segs(12), speed: null } }))
  checa('depois de expandir (120 pal), o portão libera sem tocar no texto do autor', r3.status === undefined && r3.portao?.blocked === false && r3.duration === 35)
  eventos.length = 0
  const r4 = await rodaGate(base({ body: { allow_shorter_duration: true }, parsedScript: { segments: segs(12), speed: null }, duration: 60 }))
  checa('com consentimento explícito, desce para 35 s, grava narration_autofit_down e libera', r4.duration === 35 && r4.portao?.blocked === false && r4.portao?.autofit_applied === true && eventos.join(',') === 'narration_autofit_down')
  const r5 = await rodaGate(base({ body: {}, parsedScript: { segments: segs(12), speed: null }, duration: 60 }))
  checa('SEM consentimento a duração não muda sozinha: recusa honesta com shorter_duration 35', r5.status === 422 && r5.body.shorter_duration === 35)
  // ── velocidade entra na régua (Board): 177 palavras passam a 1×, não a 1,2× ──
  const r6 = await rodaGate(base({ body: {}, parsedScript: { segments: segs(12, 15), speed: 1.2 }, duration: 60 }))
  const r7 = await rodaGate(base({ body: {}, parsedScript: { segments: segs(12, 15), speed: null }, duration: 60 }))
  checa('180 palavras a 60 s: passam a 1× (58 s) e são recusadas a 1,2× (48 s)', r7.status === undefined && r7.portao?.blocked === false && r6.status === 422 && Math.abs(r6.body.speech_seconds - 48) <= 1)
  checa('speechRateForScript lê a velocidade do roteiro (speed: 1.2) e a família do motor', SRX.speechRateForScript('fast', 'speed: 1.2\nsome text').wordsPerSecond === 3.72 && SRX.speechRateForScript('cinematic_h3', 'text').wordsPerSecond === 2.3)
  checa('138 palavras: 60 s na régua hollywood, 44,5 s na clássica — a tela e o servidor agora usam a mesma', Math.abs(SRX.speechSecondsAt(Array(138).fill('w').join(' '), SRX.speechRateForScript('cinematic_h3', '')) - 60) < 0.1 && Math.abs(SRX.speechSecondsAt(Array(138).fill('w').join(' '), SRX.speechRateForScript('fast', '')) - 44.5) < 0.1)
  const ex = rd('app/api/expand-script/route.ts')
  checa('expand-script mede na configuração real (motor + velocidade do roteiro), fórmulas intactas', ex.includes('const regua = speechRateForScript(body.engine, original)') && ex.includes('const WORDS_PER_SECOND = regua.wordsPerSecond') && ex.includes('Math.min(palavrasTeto, Math.ceil(target * WORDS_PER_SECOND) + 8)'))
  const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
  checa('a tela: contador e checagem local medem a narração EXTRAÍDA (speechSecondsOfScript), preflight na mesma régua — nenhum speechSeconds() antigo sobrou', gc.includes('speechSecondsOfScript(quality, baseChecagem).seconds') && gc.includes('const medidaTela = speechSecondsOfScript(quality, prompt)') && gc.includes('* reguaTela.wordsPerSecond)') && gc.includes('autofitDownAt(falaServidor, duration, speechRateForScript(quality, baseChecagem))') && !/\bspeechSeconds\(/.test(gc))
  checa('a tela trata a recusa do Kineo 1 na mesma caixa da cinematic, antes do erro genérico', gc.indexOf("if (res.status === 422 && data?.reason === 'narration_too_short') {") > 0 && gc.indexOf("if (res.status === 422 && data?.reason === 'narration_too_short') {") < gc.indexOf("console.error('[generate] fast-mode error:'") && gc.includes('engine: quality,'))
  checa('rota cinematic: o salvage só é pulado por ensaio AUTORIZADO', rc.includes('if (salvageDb && !(body.dry_run === true && isDryRunAccount(user.email))) {'))
}

console.log('== 6b) terceira passada do Kineo 1 (modo IA): coerência fala/legenda; resposta curta e erro não tocam a cena ==')
{
  const ini = rf.indexOf('        // ═══ KINEO-TERCEIRA-PASSADA-2026-09-14')
  const warn = rf.indexOf("          console.warn('[generate-fast] terceira passada pulada:'", ini)
  const fim = rf.indexOf('\n', rf.indexOf('        }', warn)) + 1
  const slice = rf.slice(ini, fim)
  const executa = async (expand, cenas) => { const js = ts.transpileModule('export async function run() {' + slice + '\n return scenes }', { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console: { log: () => {}, warn: () => {} }, scenes: cenas, duration: 90, targetWordCount: (d) => Math.round(d * 3.1), narrationLanguage: { language: 'en' }, prompt: 'topic', expandVoiceoversToTargets: expand, shortCaptionFromVoiceover: (t) => 'CAP:' + t.split(' ').slice(0, 3).join(' ') }); return exp.run() }
  const cena = (w) => ({ description: 'wave hits bay', searchKeywords: 'wave bay', stockSearchQuery: 'giant wave', voiceover: Array(w).fill('w').join(' '), caption: 'CAP:w w w' })
  const longo = await executa(async (items) => items.map((it) => Array(it.targetWords).fill('x').join(' ')), Array(9).fill(null).map(() => cena(20)))
  checa('180 pal para 279: cada cena reescrita, legenda acompanha a fala nova, consulta visual e descrição intactas', longo.every((s) => s.voiceover.startsWith('x x') && s.caption === 'CAP:x x x' && s.stockSearchQuery === 'giant wave' && s.description === 'wave hits bay'))
  const igual = await executa(async (items) => items.map((it) => it.text), Array(9).fill(null).map(() => cena(20)))
  checa('resposta igual/curta: nada muda (fala e legenda originais)', igual.every((s) => s.voiceover === Array(20).fill('w').join(' ') && s.caption === 'CAP:w w w'))
  const erro = await executa(async () => { throw new Error('openai down') }, Array(9).fill(null).map(() => cena(20)))
  checa('erro na reescrita: fail-open, cenas intactas, sem exceção', erro.every((s) => s.voiceover === Array(20).fill('w').join(' ')))
  let chamou = 0
  const cheio = await executa(async (items) => { chamou++; return items.map((it) => it.text) }, Array(9).fill(null).map(() => cena(31)))
  checa('total já ≥95% do alvo: a terceira passada nem é chamada', chamou === 0 && cheio.every((s) => s.voiceover.split(' ').length === 31))
}

console.log('== 7) evento de entrega: executado no caminho real — uma emissão por filme, com polling repetido e concorrente ==')
{
  const ini = st.indexOf('          // ═══ KINEO-ENTREGA-MEDIDA-2026-09-14 — o placar por motor nasce aqui ═══')
  const fim = st.indexOf('          // ═══ FIM KINEO-ENTREGA-MEDIDA ═══')
  const bloco = st.slice(ini, fim)
  checa('o evento sai DEPOIS da linha de videos nascer e só quando ela nasceu agora (ok && !duplicate)', ini > st.indexOf('const result = await persistCompletedVideo({') && bloco.includes('if (result.ok && !result.duplicate) {') && (st.match(/name: 'render_delivered_measured'/g) || []).length === 1)
  const executa = async ({ result, measuredDelivery, claim, falhaClaim, eventos }) => {
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => { if (falhaClaim) throw new Error('db down'); return { data: claim } } }) }) }) }) }) }) }
    const js = ts.transpileModule('export async function run() {' + bloco + '\n }', { compilerOptions: { module: 1, target: 9 } }).outputText
    const exp = {}; vm.runInNewContext(js, { exports: exp, console: { warn: () => {}, log: () => {} }, supabase, COMPOSE_CLAIM_EVENT: 'compose_submission_claim', renderId: 'r1', user: { id: 'u1' }, quality: 'cinematic_h3', duration: 62, result, measuredDelivery, writeServerEvent: (e) => { eventos.push(e); return Promise.resolve(true) } })
    await exp.run()
  }
  const ev1 = []
  await executa({ result: { ok: true, id: 'v1' }, measuredDelivery: { measuredSeconds: 61.5, measureMethod: 'mvhd' }, claim: { metadata: { duration: 60, narration: 'one two three' } }, eventos: ev1 })
  checa('linha nova: 1 evento com pedido 60, planejado 62, medido 61,5 (mvhd), 3 palavras, video_id', ev1.length === 1 && ev1[0].metadata.requested_seconds === 60 && ev1[0].metadata.planned_seconds === 62 && ev1[0].metadata.measured_seconds === 61.5 && ev1[0].metadata.measure_method === 'mvhd' && ev1[0].metadata.narration_words === 3 && ev1[0].metadata.video_id === 'v1')
  const ev2 = []
  await executa({ result: { ok: true, id: 'v1' }, measuredDelivery: { measuredSeconds: null, measureMethod: 'unknown' }, claim: { metadata: { duration: 60 } }, eventos: ev2 })
  checa('medição falhou: measured null + unknown — nunca o pedido nem o planejado no lugar', ev2.length === 1 && ev2[0].metadata.measured_seconds === null && ev2[0].metadata.measure_method === 'unknown')
  const ev3 = []
  await executa({ result: { ok: true, duplicate: true, id: 'v1' }, measuredDelivery: { measuredSeconds: 61.5, measureMethod: 'mvhd' }, claim: { metadata: { duration: 60 } }, eventos: ev3 })
  checa('polling repetido (a linha já existia → duplicate): ZERO evento', ev3.length === 0)
  // concorrência: dois polls simultâneos; o banco (índice único por render_id) devolve ok para um e duplicate para o outro
  const ev4 = []
  let inseriu = false
  const persistSimulado = () => { if (inseriu) return { ok: true, duplicate: true, id: 'v1' }; inseriu = true; return { ok: true, id: 'v1' } }
  await Promise.all([0, 1, 2].map(() => executa({ result: persistSimulado(), measuredDelivery: { measuredSeconds: 61.5, measureMethod: 'mvhd' }, claim: { metadata: { duration: 60 } }, eventos: ev4 })))
  checa('três polls concorrentes: exatamente 1 evento (o ancoradouro é a linha de videos, não a memória do processo)', ev4.length === 1)
  const ev5 = []
  await executa({ result: { ok: true, id: 'v1' }, measuredDelivery: { measuredSeconds: 61.5, measureMethod: 'mvhd' }, claim: null, falhaClaim: true, eventos: ev5 })
  checa('banco fora na leitura do claim: nenhum evento, nenhuma exceção (a entrega segue)', ev5.length === 0)
  const ev6 = []
  await executa({ result: { ok: false }, measuredDelivery: { measuredSeconds: 61.5, measureMethod: 'mvhd' }, claim: null, eventos: ev6 })
  checa('persistência falhou (ok:false): sem evento — o placar nunca conta filme que não existe na tabela', ev6.length === 0)
  checa('cache (sem download) fica unknown: persistRenderAssets só mede quando baixa (onBytes)', ra.includes('let measuredSeconds: number | null = null') && ra.includes('onBytes: (buf) => { measuredSeconds = probeMp4DurationSeconds(buf) },') && !/measuredSeconds = videoTimeoutMs|measuredSeconds = duration/.test(ra))
}

console.log('== 9) terceira revisão do Board: dry-run não autorizado é rejeitado; relatório nunca PASS com portão bloqueando; narração extraída ==')
{
  // 1) rejeição explícita — curto E suficiente — executada no trecho real (do dryRunAutorizado até antes do hook pago)
  const ini = rf.indexOf('    const dryRunAutorizado = body.dry_run === true && isDryRunAccount(user.email)')
  const fim = rf.indexOf('    // KINEO-AI-HOOK — FIRST-VIDEO cinematic opener.')
  const trecho = rf.slice(ini, fim)
  const ev = []
  const run = (globals) => { const js = ts.transpileModule('export async function run() {' + trecho + '\n return { duration, portao, status: undefined } }', { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console: { log: () => {}, warn: () => {} }, ...globals }); return exp.run() }
  const segs = (n, w = 10) => Array(n).fill(null).map((_, i) => ({ pexelsQuery: 'q' + i, voiceover: Array(w).fill('w').join(' ') }))
  const g = (extra) => ({ body: {}, user: { id: 'u', email: 'x@y.z' }, isDryRunAccount: () => false, verbatim: true, parsedScript: { segments: segs(12), speed: null }, narrationLanguage: { language: 'en' }, speechRateFor: SRX.speechRateFor, narrationFitAt: SRX.narrationFitAt, largestFittingDuration: (s) => [90, 60, 35].find((d) => s >= d * 0.95) ?? null, SUPPORTED_DURATIONS: [35, 60, 90], narrationTooShortMessage: () => 'short', writeServerEvent: (e) => { ev.push(e.name); return Promise.resolve(true) }, NextResponse: { json: (b, i) => ({ status: i?.status ?? 200, body: b }) }, duration: 35, scenes: [{ voiceover: 'a', description: 'd' }], clipCount: 4, classicDryRunReport: () => ({ verdict: 'PASS — tudo certo', pass: true, problems: [] }), wordsPerSceneFor: () => [27, 35], ...extra })
  // Board 4ª revisão: a rejeição mora logo depois do body — o trecho real, executado, e a prova de que NADA de fornecedor vem antes
  const iRej = rf.indexOf('    // ═══ KINEO-DRY-RUN-AUTORIZADO-2026-09-14 (posição, Board 4ª revisão) ═══════')
  const fRej = rf.indexOf('    // ═══ FIM KINEO-DRY-RUN-AUTORIZADO (posição) ═══')
  const rej = rf.slice(iRej, fRej)
  const runRej = async (globals) => { const js = ts.transpileModule('export async function run() {' + rej + '\n return undefined }', { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, ...globals }); return exp.run() }
  const chamadas = []
  const mocks = (extra) => ({ user: { id: 'u', email: 'x@y.z' }, isDryRunAccount: () => false, writeServerEvent: (e) => { chamadas.push('evento:' + e.name); return Promise.resolve(true) }, NextResponse: { json: (b, i) => ({ status: i?.status ?? 200, body: b }) }, generateScenes: () => { chamadas.push('planejador'); throw new Error('nunca') }, expandVoiceoversToTargets: () => { chamadas.push('expansor'); throw new Error('nunca') }, getPixabayClipsForScene: () => { chamadas.push('pixabay'); throw new Error('nunca') }, classifyEngineFit: () => { chamadas.push('classificador'); return {} }, ...extra })
  chamadas.length = 0
  const rj1 = await runRej(mocks({ body: { dry_run: true } }))
  checa('externo dry_run=true (modo IA ou roteiro, tanto faz — ainda não há cenas): 403 dry_run_not_authorized e a ÚNICA chamada é o evento', rj1?.status === 403 && rj1.body.reason === 'dry_run_not_authorized' && chamadas.join(',') === 'evento:dry_run_not_authorized')
  chamadas.length = 0
  const rj2 = await runRej(mocks({ body: { dry_run: true }, isDryRunAccount: () => true }))
  checa('interno dry_run=true: segue (undefined), nenhuma chamada', rj2 === undefined && chamadas.length === 0)
  const rj3 = await runRej(mocks({ body: { dry_run: false } }))
  checa('externo dry_run=false: segue (undefined), nenhuma chamada', rj3 === undefined && chamadas.length === 0)
  // posição: depois do body, antes de classificar/planejar/expandir/Pixabay/relatório/portão
  const iBody = rf.indexOf('body = await req.json()')
  checa('a rejeição vem depois do body e ANTES de classifyEngineFit, generateScenes, expandVoiceoversToTargets, getPixabayClipsForScene, classicDryRunReport e do portão', iBody > 0 && iRej > iBody && ['classifyEngineFit(prompt)', 'await generateScenes(', 'expandVoiceoversToTargets(', 'getPixabayClipsForScene(', 'classicDryRunReport({', 'let portao: {'].every((s) => rf.indexOf(s, iRej) > 0 && rf.lastIndexOf(s, iRej) < rf.indexOf('} = await supabase.auth.getUser()') || rf.indexOf(s, iRej) > 0 && !rf.slice(rf.indexOf('} = await supabase.auth.getUser()'), iRej).includes(s)))
  const marcaAuth = '} = await supabase.auth.getUser()'
  const entreAuthEReje = rf.slice(rf.indexOf(marcaAuth) + marcaAuth.length, iRej)
  checa('entre a autenticação e a rejeição não há NENHUMA chamada a fornecedor (só a leitura do body)', (entreAuthEReje.match(/await /g) || []).length === 1 && entreAuthEReje.includes('await req.json()'))
  checa('a rejeição antiga (depois do planejamento) foi removida — existe uma só, na posição nova', (rf.match(/reason: 'dry_run_not_authorized'/g) || []).length === 1)
  const r3 = await run(g({ body: { dry_run: true }, isDryRunAccount: () => true, parsedScript: { segments: segs(12), speed: null } }))
  checa('interno dry_run=true com roteiro suficiente: relatório 200 com PASS e gate.blocked=false', r3.status === 200 && r3.body.dry_run === true && r3.body.pass === true && r3.body.gate?.blocked === false)
  // 2) reprodução do Board: 180 palavras, speed 1,2, 60 s → portão bloqueia (48 s) e o relatório NÃO pode dizer PASS
  const r4 = await run(g({ body: { dry_run: true }, isDryRunAccount: () => true, parsedScript: { segments: segs(12, 15), speed: 1.2 }, duration: 60 }))
  checa('180 pal / 1,2× / 60 s no ensaio: gate.blocked e veredito FAIL (o mock do relatório dizia PASS)', r4.status === 200 && r4.body.gate?.blocked === true && /^FAIL — portão/.test(r4.body.verdict) && r4.body.pass === false && r4.body.problems[0] === r4.body.verdict)
  const r5 = await run(g({ body: { dry_run: true }, isDryRunAccount: () => true, parsedScript: { segments: segs(21, 14), speed: null }, duration: 90 }))
  checa('21 blocos no ensaio: veredito FAIL por excesso de blocos, mesmo com o relatório PASS', r5.body.gate?.reason === 'too_many_clips' && /^FAIL — portão: 21 blocos/.test(r5.body.verdict) && r5.body.pass === false)
  let wpsRecebido = null
  await run(g({ body: { dry_run: true }, isDryRunAccount: () => true, parsedScript: { segments: segs(12, 20), speed: 1.2 }, duration: 60, classicDryRunReport: (a) => { wpsRecebido = a.wordsPerSecond; return { verdict: 'PASS', pass: true, problems: [] } } }))
  checa('o relatório recebe a MESMA velocidade efetiva do portão (3,72 a 1,2×)', wpsRecebido === 3.72)
  checa('rota cinematic: rejeição explícita do dry-run não autorizado ANTES de qualquer reserva (releaseBirthClaim vem depois)', rc.includes("if (body.dry_run === true && !isDryRunAccount(user.email)) {") && rc.indexOf("reason: 'dry_run_not_authorized'") < rc.indexOf('const releaseBirthClaim = async'))
  // 3) narração extraída, velocidade do texto original
  const original = 'speed: 1.2\nVisual: slow drone over the bay\nNarration:\n' + Array(60).fill('w').join(' ')
  const m = SRX.speechSecondsOfScript('fast', original)
  checa('60 palavras de narração + diretivas: conta só a narração (60), velocidade 1,2 lida do original → 16,1 s', m.narration.split(' ').length === 60 && m.rate.wordsPerSecond === 3.72 && Math.abs(m.seconds - 60 / 3.72) < 0.05)
  const semDiretiva = SRX.speechSecondsOfScript('fast', Array(60).fill('w').join(' '))
  checa('sem diretiva: 1× (19,4 s) — a velocidade nunca é recuperada da narração extraída', semDiretiva.rate.speed === 1 && Math.abs(semDiretiva.seconds - 60 / 3.1) < 0.05)
}
console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
