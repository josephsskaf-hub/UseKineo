// KINEO-H3-PALAVRAS-2026-09-15 — reprodução do H3 Lituya 41d9bb10 (15/09 04:31Z):
// o planejador escreveu 103 palavras para 68 s; a reescrita rendeu 117; a régua de
// silêncio (≤1,5 s/cena, ≤8 s total) barrou por ~21 palavras (9,1 s), 45 cr estornados,
// nenhum clipe enviado. Este guardião executa a FATIA REAL da rota (enche-silêncio →
// apara → continuação → teto-rede → piso → régua) com o fornecedor de texto mockado
// e prova: (a) sem a continuação o plano de ontem é barrado (reprodução); (b) com a
// continuação passa SEM tocar na régua, sem perder palavra e sem baixar segundos;
// (c) verbatim não passa por ali; (d) continuação inútil → o 422 continua barrando.
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
const TL = roda(rd('lib/cinematic/timelineContract.ts'))
const FID = roda(rd('lib/hollywood/fidelidade.ts'))
const rota = rd('app/api/generate-video-cinematic/route.ts')
const runway = rd('lib/runway.ts')
const wordsOf = (t) => (t ?? '').trim().split(/\s+/).filter(Boolean).length

console.log('== régua intocada ==')
const tl = rd('lib/cinematic/timelineContract.ts')
checa('SILENCE_SCENE_MAX_SECONDS = 1.5 e SILENCE_TOTAL_MAX_SECONDS = 8 continuam', tl.includes('export const SILENCE_SCENE_MAX_SECONDS = 1.5') && tl.includes('export const SILENCE_TOTAL_MAX_SECONDS = 8'))
checa('a rota ainda barra com 422 plan_silence_inside_scenes quando a régua reprova (estorno + evento)', rota.includes("releaseBirthClaim('plan_silence_inside_scenes')") && rota.includes("reason: 'plan_silence_inside_scenes'") && rota.includes("name: 'plan_silence_rejected'"))

console.log('== a fatia real da rota ==')
const ini = rota.indexOf("      let duracaoReconciliada: { reconciliado: boolean; aparado_s: number; excedente_s: number; base: 'estimate' } | null = null")
const fimTxt = "            sceneMax: SILENCE_SCENE_MAX_SECONDS, totalMax: SILENCE_TOTAL_MAX_SECONDS,\n          }, { status: 422 })\n        }\n      }"
const fim = rota.indexOf(fimTxt, ini)
checa('fatia enche-silêncio → régua existe na rota', ini > 0 && fim > ini)
const fatia = rota.slice(ini, fim + fimTxt.length)
checa('a régua é avaliada sobre o plano PROJETADO pelo piso (fitCinematicPlanFloor) antes de decidir', fatia.includes('const projetar = () => planSilenceReport(fitCinematicPlanFloor(plan.scenes, duration, SCENE_CAP), ritmoVoz)'))
checa('a continuação roda DENTRO do try do enche-silêncio (modo IA), depois da apara e antes do teto-rede', fatia.includes('KINEO-H3-PALAVRAS-2026-09-15') && fatia.indexOf('const apara = apararComFolga(') < fatia.indexOf('KINEO-H3-PALAVRAS-2026-09-15') && fatia.indexOf('KINEO-H3-PALAVRAS-2026-09-15') < fatia.indexOf("console.warn('[hollywood] enche-silencio pulado:'"))
checa('só cenas sem diálogo com folga > 0,9 s pedem continuação; segundos nunca descem nesse passo', fatia.includes(".filter((x) => x.sc.type !== 'dialogue' && x.silencio > 0.9)") && fatia.includes('if (w / ritmoVoz + FOLGA_MIN_S > (pd.x.sc.seconds || 0)) pd.x.sc.seconds = Math.min(pd.x.teto, Math.ceil(w / ritmoVoz + FOLGA_MIN_S))'))
checa('a linha aceita fica intacta: só entra continuação que começa pela linha original', fatia.includes("!nova.startsWith(base.trim().replace(/[.!?…]$/, ''))) return"))
checa('rota importa appendNarrationToTargets de @/lib/runway', rota.includes("expandVoiceoversToTargets, appendNarrationToTargets, FILLER_LINE_RE } from '@/lib/runway'"))

const params = ['plan', 'verbatim', 'duration', 'DIALOGUE_CAP', 'SCENE_CAP', 'FILLER_LINE_RE', 'expandVoiceoversToTargets', 'appendNarrationToTargets', 'hollywoodLanguage', 'prompt', 'apararComFolga', 'removerDatasInventadas' /* 15/09 R4 */, 'scrubInventedSetting' /* 15/09 R9 */, 'planSilenceReport', 'writeServerEvent', 'user', 'generationId', 'family', 'verbatimOverflowWords', 'MAX_VERBATIM_SCENES', 'hollywoodVoiceover', 'releaseBirthClaim', 'cinematicAdmin', 'body', 'NextResponse', 'hollywoodTarget', 'requestedDuration', 'degrau', 'formatoVisual', 'resolveCharacterVoice', 'cinematicSceneModel', 'buildFalInput', 'confirmCinematicRefund', 'SILENCE_SCENE_MAX_SECONDS', 'SILENCE_TOTAL_MAX_SECONDS', 'fitCinematicPlanFloor', 'console', 'resolveHollywoodVoice', 'hollywoodVertical', 'sceneNarrationsForPlan']
const montar = (fatiaSrc) => roda(`export async function rodar(ctx: any) {\n  const { ${params.join(', ')} } = ctx\n${fatiaSrc}\n  return { plan, duracaoReconciliada, rejeitado: null }\n}`).rodar
const executar = montar(fatia)
const NextResponse = { json: (b, init) => ({ rejeitado: b, status: init?.status ?? 200 }) }
const ctxBase = (plan, extra = {}) => ({
  plan, verbatim: false, duration: 60, DIALOGUE_CAP: 15, SCENE_CAP: 12, FILLER_LINE_RE: /^(here is something most people do not know about|imagine|what if|most people don'?t know)/i,
  hollywoodLanguage: 'en', prompt: 'Create a 60-second historical documentary short in English about the 1958 Lituya Bay megatsunami',
  apararComFolga: FID.apararComFolga, removerDatasInventadas: FID.removerDatasInventadas ?? ((t) => ({ texto: t, removidas: [] })), scrubInventedSetting: (t) => ({ text: t, removed: [] }), planSilenceReport: TL.planSilenceReport, writeServerEvent: async (e) => { (ctxBase.eventos ??= []).push(e); return true },
  user: { id: 'u1', email: 'cliente@example.com' }, generationId: 'g1', family: 'h3', verbatimOverflowWords: 0, MAX_VERBATIM_SCENES: 12, hollywoodVoiceover: '',
  releaseBirthClaim: async () => true, cinematicAdmin: { from: () => ({ insert: async () => ({}) }) }, body: {}, NextResponse, hollywoodTarget: 68, requestedDuration: 60, degrau: null,
  formatoVisual: { modo: 'documentary_faceless' }, resolveCharacterVoice: () => null, cinematicSceneModel: () => 'x', buildFalInput: () => ({}), confirmCinematicRefund: async () => true,
  SILENCE_SCENE_MAX_SECONDS: 1.5, SILENCE_TOTAL_MAX_SECONDS: 8, fitCinematicPlanFloor: TL.fitCinematicPlanFloor, console: { log: () => {}, warn: () => {} },
  // KINEO-RITMO-DA-VOZ-2026-09-15: persona neutra (1,0) → ritmo 2,3; o caso (f) troca pela persona idosa
  resolveHollywoodVoice: () => ({ personaId: 'dark-mystery', voice: 'onyx', defaultSpeed: 1.0 }), hollywoodVertical: 'history', sceneNarrationsForPlan: (scenes) => scenes.map((sc) => sc.voiceover ?? null),
  ...extra,
})
// o planejador de ontem: 7 cenas de apoio, 103 palavras, 55 s
const frase = (n, tema) => Array.from({ length: n }, (_, i) => `${tema}${i + 1}`).join(' ')
const planoOntem = () => {
  const words = [14, 15, 15, 14, 15, 15, 15]
  const secs = [8, 8, 8, 8, 8, 8, 7]
  return { characterSheet: '', environmentSheet: 'Lituya Bay', styleSheet: 'documentary', scenes: words.map((w, i) => ({ index: i + 1, type: 'support', seconds: secs[i], prompt: `scene ${i + 1}`, voiceover: frase(w, `w${i + 1}_`) + '.', caption: '' })) }
}
// a reescrita real rendeu ~85% do pedido: aqui cada linha ganha só 2 palavras (103 → 117), como no log da Vercel
const expandComoOntem = async (items) => items.map((it) => it.text.replace(/\.$/, '') + ' extra1 extra2.')
// continuação mockada: acrescenta exatamente add_words palavras factuais ao fim, sem mexer na base
const appendFiel = async (items) => items.map((it) => `${it.text.replace(/[.!?…]$/, '')}. ${Array.from({ length: it.addWords }, (_, i) => `fato${i + 1}`).join(' ')}.`)
const appendNulo = async (items) => items.map((it) => it.text)
const appendProibido = async () => { throw new Error('continuação chamada em verbatim') }

console.log('== (a) reprodução: sem continuação, o plano de ontem é barrado na régua ==')
{
  const plan = planoOntem()
  const r = await executar(ctxBase(plan, { expandVoiceoversToTargets: expandComoOntem, appendNarrationToTargets: appendNulo }))
  const sil = TL.planSilenceReport(plan.scenes, 2.3)
  checa(`reprodução: 117 palavras → 422 plan_silence_inside_scenes (silêncio ${sil.total}s > 8, estorno confirmado)`, r.status === 422 && r.rejeitado?.reason === 'plan_silence_inside_scenes' && sil.total > 8 && r.rejeitado?.refunded === true)
  checa('reprodução: nenhum clipe seria enviado (a rota devolve antes do POST) e a resposta traz palavras que faltam', typeof r.rejeitado?.wordsToAdd === 'number' && r.rejeitado.wordsToAdd >= 15)
}

console.log('== (b) com a continuação factual o mesmo plano PASSA — régua intacta ==')
{
  const plan = planoOntem()
  const originais = plan.scenes.map((sc) => sc.voiceover)
  const eventos = []
  const r = await executar(ctxBase(plan, { expandVoiceoversToTargets: expandComoOntem, appendNarrationToTargets: appendFiel, writeServerEvent: async (e) => { eventos.push(e); return true } }))
  const sil = TL.planSilenceReport(plan.scenes, 2.3)
  const total = plan.scenes.reduce((a, sc) => a + sc.seconds, 0)
  checa(`passa: sem 422, silêncio ${sil.total}s ≤ 8 e pior cena ${sil.worst}s ≤ 1,5`, r.status !== 422 && r.rejeitado === null && sil.ok)
  checa(`duração planejada ${total}s ≥ 60 pedidos (o piso continua respeitado)`, total >= 60)
  checa('nenhuma palavra da linha aceita se perdeu: toda fala final começa pela fala anterior (só acrescenta)', plan.scenes.every((sc, i) => sc.voiceover.startsWith(originais[i].replace(/\.$/, '').replace(/[.!?…]$/, '') + ' extra1 extra2') || sc.voiceover.startsWith(originais[i].replace(/[.!?…]$/, ''))))
  checa('palavras subiram (117 → ≥ 120, o mínimo aritmético para 60 s com ≤ 8 s de silêncio)', plan.scenes.reduce((a, sc) => a + wordsOf(sc.voiceover), 0) >= 120)
  checa('evento plan_silence_filled gravado com antes/depois e ok=true', eventos.some((e) => e.name === 'plan_silence_filled' && e.metadata.ok === true && e.metadata.before_total > 8 && e.metadata.after_total <= 8 && e.metadata.words_added >= 3))
  checa('nenhuma cena passou do teto da família (12 s) nem ficou com fala maior que o clipe + 1 s', plan.scenes.every((sc) => sc.seconds <= 12 && wordsOf(sc.voiceover) / 2.3 <= sc.seconds + 1))
}

console.log('== (c) verbatim: a continuação nunca é chamada ==')
{
  const plan = planoOntem()
  const r = await executar(ctxBase(plan, { verbatim: true, expandVoiceoversToTargets: appendProibido, appendNarrationToTargets: appendProibido }))
  checa('verbatim com o mesmo plano: nem reescrita nem continuação são chamadas (mock lançaria); o plano do autor é barrado honestamente (piso ou régua), sem mexer no roteiro', r.status === 422 && ['plan_silence_inside_scenes', 'plan_duration_below_request'].includes(r.rejeitado?.reason) && plan.scenes.every((sc, i) => sc.voiceover === planoOntem().scenes[i].voiceover))
}

console.log('== (d) continuação inútil ou quebrada: a proteção continua ==')
{
  const plan = planoOntem()
  const r = await executar(ctxBase(plan, { expandVoiceoversToTargets: expandComoOntem, appendNarrationToTargets: async () => [] }))
  checa('continuação devolve [] → sem crash, 422 plan_silence_inside_scenes continua (nada é enviado)', r.status === 422 && r.rejeitado?.reason === 'plan_silence_inside_scenes')
  const plan2 = planoOntem()
  const r2 = await executar(ctxBase(plan2, { expandVoiceoversToTargets: expandComoOntem, appendNarrationToTargets: async (items) => items.map(() => 'texto que nao comeca pela base') }))
  checa('continuação que REESCREVE (não começa pela base) é recusada: nenhuma linha recebe o texto estranho, cada uma ainda começa pela sua fala, e o 422 barra', r2.status === 422 && r2.rejeitado?.reason === 'plan_silence_inside_scenes' && plan2.scenes.every((sc, i) => sc.voiceover.startsWith(`w${i + 1}_1 `) && !sc.voiceover.includes('texto que nao')))
  const plan3 = planoOntem()
  const r3 = await executar(ctxBase(plan3, { expandVoiceoversToTargets: expandComoOntem, appendNarrationToTargets: async () => { throw new Error('openai down') } }))
  checa('continuação lança (fornecedor fora) → o try do enche-silêncio engole, e a régua barra com 422 (proteção intacta)', r3.status === 422 && r3.rejeitado?.reason === 'plan_silence_inside_scenes')
}

console.log('== (e) o PISO é quem cria o silêncio: cenas já dimensionadas pela fala, total abaixo do pedido ==')
{
  // 7 cenas × 17 palavras × 8 s (fala cabe: 0,6 s de folga cada; NÃO são "curtas") = 56 s < 60.
  // O piso (fitCinematicPlanFloor) estica 4 cenas para 9 s → 1,6 s de folga cada → a régua reprova.
  const plan = planoOntem()
  plan.scenes.forEach((sc, i) => { sc.voiceover = frase(17, `c${i + 1}_`) + '.'; sc.seconds = 8 })
  const pedidos = []
  const semNada = planoOntem(); semNada.scenes.forEach((sc, i) => { sc.voiceover = frase(17, `c${i + 1}_`) + '.'; sc.seconds = 8 })
  const r0 = await executar(ctxBase(semNada, { expandVoiceoversToTargets: async (items) => items.map((it) => it.text), appendNarrationToTargets: appendNulo }))
  checa('sem continuação: o piso estica 4 cenas a 9 s, pior cena 1,6 s → 422 (é o mecanismo de ontem)', r0.status === 422 && r0.rejeitado?.reason === 'plan_silence_inside_scenes' && r0.rejeitado?.worstSceneSilence >= 1.6)
  const r = await executar(ctxBase(plan, { expandVoiceoversToTargets: async (items) => items.map((it) => it.text), appendNarrationToTargets: async (items) => { pedidos.push(...items); return appendFiel(items) } }))
  const sil = TL.planSilenceReport(plan.scenes, 2.3)
  const total = plan.scenes.reduce((a, sc) => a + sc.seconds, 0)
  checa(`com continuação: só as cenas que o piso esticaria pedem fala (${pedidos.length} de 7), o plano passa (${sil.total}s, pior ${sil.worst}s) com ${total}s ≥ 60`, r.status !== 422 && pedidos.length >= 1 && pedidos.length <= 6 && sil.ok && total >= 60)
  checa('as cenas que não pediram continuação ficaram exatamente como estavam (17 palavras, 8 s)', plan.scenes.filter((sc) => !pedidos.some((pd) => sc.voiceover.startsWith(pd.text.replace(/[.!?…]$/, '')))).every((sc) => wordsOf(sc.voiceover) === 17 && sc.seconds === 8))
}
console.log('== helper: juntarContinuacao nunca perde a base ==')
{
  const RW = { juntarContinuacao: null }
  const m = runway.match(/export function juntarContinuacao[\s\S]*?\n\}/)
  checa('juntarContinuacao existe em lib/runway.ts', Boolean(m))
  if (m) {
    const J = roda(m[0]).juntarContinuacao
    checa('fecha a frase da base e junta: "The wave hit the bay" + "It rose 524 meters." → "The wave hit the bay. It rose 524 meters."', J('The wave hit the bay', 'It rose 524 meters.') === 'The wave hit the bay. It rose 524 meters.')
    checa('base com ponto final não ganha ponto duplo; aspas da continuação caem', J('The wave hit the bay.', '"It rose 524 meters."') === 'The wave hit the bay. It rose 524 meters.')
    checa('continuação vazia → base intacta', J('The wave hit the bay.', '   ') === 'The wave hit the bay.')
  }
  checa('appendNarrationToTargets só aceita candidata que começa pela linha aceita e respeita maxWords', runway.includes('if (wordsOf(candidata) <= wordsOf(out[i])) console.warn') && runway.includes('else if (wordsOf(candidata) > items[i].maxWords) console.warn') && runway.includes("else if (!candidata.startsWith(out[i].trim().replace(/[.!?…]$/, ''))) console.warn") && runway.includes('else out[i] = candidata') /* 15/09 KINEO-ESCRITOR-R2: as três recusas viraram avisos nomeados */)
  checa('o pedido ao modelo é de CONTINUAÇÃO (não repetir nem reescrever a linha), sem filler, sem 1ª pessoa', runway.includes('write ONLY the continuation') && runway.includes('Do not repeat or rephrase the given line') && runway.includes('no first person'))
}

console.log('== (f) KINEO-RITMO-DA-VOZ: a régua anda no passo da voz pinada (render H3 7bb62a29, 15/09) ==')
{
  // O plano de 15/09: 7 cenas de apoio, 65 s, 130 palavras — a 2,3 pal/s toda cena tem 1,0–1,3 s de
  // folga; a voz pinada (character:male:elderly, onyx 0,94) fala a ~2,16 pal/s.
  const idosa = () => ({ personaId: 'character:male:elderly', voice: 'onyx', defaultSpeed: 0.94 })
  const plano15 = () => {
    const words = [20, 20, 20, 20, 18, 16, 16]
    const secs = [10, 10, 10, 10, 9, 8, 8]
    return { characterSheet: 'a weathered elderly fisherman with a white beard', environmentSheet: 'Lituya Bay', styleSheet: 'documentary', scenes: words.map((w, i) => ({ index: i + 1, type: 'support', seconds: secs[i], prompt: `scene ${i + 1}`, voiceover: frase(w, `p${i + 1}_`) + '.', caption: '' })) }
  }
  const identidade = async (items) => items.map((it) => it.text)
  const RITMO_REAL = Math.round(2.3 * 0.94 * 100) / 100
  checa('ritmo esperado da persona idosa: 2,3 × 0,94 = 2,16 pal/s', RITMO_REAL === 2.16)
  checa('rota: o ritmo nasce da MESMA resolução que o compose usa (resolveHollywoodVoice com a ficha) e a folga mínima do plano é 0,3 s', fatia.includes('resolveHollywoodVoice(falas || prompt, hollywoodLanguage, hollywoodVertical, plan.characterSheet)') && fatia.includes('return Math.round(2.3 * Math.max(0.85, Math.min(1.1, voz.defaultSpeed)) * 100) / 100') && fatia.includes('const FOLGA_MIN_S = 0.3'))
  checa('rota: a apara e a régua final também andam no ritmo da voz', fatia.includes("const apara = apararComFolga(plan.scenes, (sc) => wordsOfLine(lineOf(sc)), duration, ritmoVoz)") && fatia.includes('const silence = planSilenceReport(plan.scenes, ritmoVoz)'))
  // reprodução na main: régua fixa em 2,3 e apara com folga ≥ 1,25 s → duas cenas de 20 palavras caem para 9 s (0,3 s de folga a 2,3) e a voz real (2,16) NÃO cabe
  let rotaMain = null, fidMain = null
  try { rotaMain = execFileSync('git', ['show', 'origin/main:app/api/generate-video-cinematic/route.ts'], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n'); fidMain = execFileSync('git', ['show', 'origin/main:lib/hollywood/fidelidade.ts'], { cwd: RAIZ, maxBuffer: 16 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n') } catch {}
  if (rotaMain && fidMain && rotaMain.includes('KINEO-H3-PALAVRAS-2026-09-15') && !rotaMain.includes('KINEO-RITMO-DA-VOZ-2026-09-15')) {
    const iniM = rotaMain.indexOf("      let duracaoReconciliada: { reconciliado: boolean; aparado_s: number; excedente_s: number; base: 'estimate' } | null = null")
    const fimM = rotaMain.indexOf(fimTxt, iniM)
    const execMain = montar(rotaMain.slice(iniM, fimM + fimTxt.length))
    const FM = roda(fidMain)
    const plan = plano15()
    const r = await execMain(ctxBase(plan, { expandVoiceoversToTargets: identidade, appendNarrationToTargets: appendNulo, apararComFolga: FM.apararComFolga, resolveHollywoodVoice: idosa }))
    const estouram = plan.scenes.filter((sc) => wordsOf(sc.voiceover) / RITMO_REAL > sc.seconds)
    checa(`reprodução (origin/main): o plano passa na régua de 2,3 (sem 422) mas ${estouram.length} cena(s) ficam com fala REAL (2,16 pal/s) maior que o clipe — é o 422 pago do compose`, r.status !== 422 && estouram.length >= 1 && plan.scenes.some((sc) => sc.seconds === 9 && wordsOf(sc.voiceover) === 20))
  } else {
    checa('reprodução na main pulada (origin/main já traz o ritmo da voz, ou git indisponível)', true)
  }
  // candidato: mesmo plano, persona idosa → nenhuma apara sem folga ≥ 2 s, toda cena cabe no ritmo real com ≥ 0,3 s
  {
    const plan = plano15()
    const eventos = []
    const r = await executar(ctxBase(plan, { expandVoiceoversToTargets: identidade, appendNarrationToTargets: appendNulo, resolveHollywoodVoice: idosa, writeServerEvent: async (e) => { eventos.push(e); return true } }))
    const total = plan.scenes.reduce((a, sc) => a + sc.seconds, 0)
    const cabeReal = plan.scenes.every((sc) => wordsOf(sc.voiceover) / RITMO_REAL + 0.3 <= sc.seconds + 1e-9)
    checa(`candidato: sem 422, ${total}s ≥ 60, e TODA cena cabe no ritmo real da voz com ≥ 0,3 s de folga (nenhuma apara sem folga ≥ 2 s)`, r.status !== 422 && r.rejeitado === null && total === 65 && cabeReal && plan.scenes.every((sc) => sc.seconds >= 8))
    checa('candidato: nenhuma palavra do plano mudou (130) e o excedente de 2 s fica REGISTRADO (reconciliado=false), não aparado', plan.scenes.reduce((a, sc) => a + wordsOf(sc.voiceover), 0) === 130 && r.duracaoReconciliada?.excedente_s === 2 && r.duracaoReconciliada?.reconciliado === false)
    const silReal = TL.planSilenceReport(plan.scenes, RITMO_REAL)
    checa(`candidato: a régua no ritmo real aprova (${silReal.total}s ≤ 8, pior ${silReal.worst}s ≤ 1,5) — a mesma régua, no passo certo`, silReal.ok)
  }
  // persona neutra (1,0): o ritmo continua 2,3 — e a 2,3 este plano tem 8,45 s de silêncio (7 cenas com 1,0–1,3 s).
  // Na main a apara tirava 2 s de folga (e a voz real estourava); agora a folga fica e a CONTINUAÇÃO acrescenta palavras.
  {
    const plan = plano15()
    const pedidos = []
    const r = await executar(ctxBase(plan, { expandVoiceoversToTargets: identidade, appendNarrationToTargets: async (items) => { pedidos.push(...items); return appendFiel(items) } }))
    const total = plan.scenes.reduce((a, sc) => a + sc.seconds, 0)
    checa(`persona neutra (2,3): nenhuma cena perde segundos (folga < 2 s), ${pedidos.length} cena(s) ganham palavras em vez disso, e o plano passa (${total}s ≥ 65, sem 422)`, r.status !== 422 && pedidos.length >= 1 && total >= 65 && plan.scenes.every((sc, i) => sc.seconds >= [10, 10, 10, 10, 9, 8, 8][i]) && plan.scenes.reduce((a, sc) => a + wordsOf(sc.voiceover), 0) > 130)
    const semPalavras = plano15()
    const r0 = await executar(ctxBase(semPalavras, { expandVoiceoversToTargets: identidade, appendNarrationToTargets: appendNulo }))
    checa('persona neutra sem continuação: a régua barra a $0 (422 plan_silence_inside_scenes) — nunca mais se paga clipe para a voz estourar', r0.status === 422 && r0.rejeitado?.reason === 'plan_silence_inside_scenes' && semPalavras.scenes.reduce((a, sc) => a + sc.seconds, 0) === 65)
  }
  // resolução da voz quebrada → ritmo 2,3 (fail-open), nunca crash
  {
    const plan = plano15()
    const r = await executar(ctxBase(plan, { expandVoiceoversToTargets: identidade, appendNarrationToTargets: appendFiel, resolveHollywoodVoice: () => { throw new Error('voz indisponível') } }))
    checa('resolução da voz lança → ritmo 2,3 (fail-open), o passo continua e não há crash', r.status !== 422 && plan.scenes.reduce((a, sc) => a + sc.seconds, 0) >= 65)
  }
}

console.log('== (g) KINEO-FALA-NO-TETO: cena cinematic de 8 s com uma frase de 23 palavras (ensaio do S25, 15/09) ==')
{
  // 7 cenas: 6 de apoio com 20 palavras/10 s (cabem) + 1 cinematic de 8 s com UMA frase de 23 palavras (10 s de fala)
  const plan = { characterSheet: 'a broad-shouldered man in his fifties with a gray beard', environmentSheet: 'ice', styleSheet: 'cinematic', scenes: [] }
  for (let i = 0; i < 6; i++) plan.scenes.push({ index: i + 1, type: 'support', seconds: 10, prompt: `scene ${i + 1}`, voiceover: frase(22, `g${i + 1}_`) + '.', caption: '' })
  plan.scenes.splice(4, 0, { index: 5, type: 'cinematic', seconds: 8, prompt: 'wide shot of the frozen lighthouse', voiceover: frase(23, 'longa_') + '.', caption: '' })
  plan.scenes.forEach((sc, i) => { sc.index = i + 1 })
  const antes = plan.scenes.reduce((a, sc) => a + wordsOf(sc.voiceover), 0)
  const r = await executar(ctxBase(plan, { expandVoiceoversToTargets: async (items) => items.map((it) => it.text), appendNarrationToTargets: appendNulo, SCENE_CAP: 12 }))
  const cin = plan.scenes.find((sc) => sc.type === 'cinematic')
  const idx = plan.scenes.indexOf(cin)
  const cauda = plan.scenes[idx + 1]
  checa(`a cena cinematic ficou com ≤ 17 palavras (${wordsOf(cin.voiceover)}) em 8 s e a cauda virou apoio novo logo depois (${cauda ? wordsOf(cauda.voiceover) : '-'} palavras, ${cauda?.seconds}s)`, wordsOf(cin.voiceover) <= 17 && cin.seconds === 8 && cauda && cauda.type === 'support' && wordsOf(cauda.voiceover) === 23 - wordsOf(cin.voiceover) && wordsOf(cauda.voiceover) >= 4 && cauda.seconds >= 4)
  checa(`nenhuma palavra cortada (${antes} antes, ${plan.scenes.reduce((a, sc) => a + wordsOf(sc.voiceover), 0)} depois) e a ordem da história intacta (longa_1 … longa_23 em sequência)`, plan.scenes.reduce((a, sc) => a + wordsOf(sc.voiceover), 0) === antes && (cin.voiceover + ' ' + cauda.voiceover).replace(/\./g, '').split(/\s+/).join(' ') === frase(23, 'longa_').replace(/\./g, ''))
  checa('sem 422: a fala que não cabia no clipe de 8 s não vira recusa paga', r.status !== 422)
  checa('rota: a rede divide pela FALA no ritmo da voz (cap − 0,3 s), não só pelos segundos, e a cauda tem ≥ 4 palavras', fatia.includes('const fits = Math.max(1, Math.floor((cap - 0.3) * ritmoVoz))') && fatia.includes('if ((sc.seconds ?? 0) <= cap && speech.length <= fits) continue') && fatia.includes('const corte = Math.max(1, Math.min(fits, speech.length - 4))'))
  // R2: frase de 17 palavras CABE em 8 s (7,4 s + 0,3) → não é dividida; 19 palavras → cauda de 4, não de 2
  const plan17 = { characterSheet: '', environmentSheet: 'ice', styleSheet: 'cinematic', scenes: [] }
  for (let i = 0; i < 6; i++) plan17.scenes.push({ index: i + 1, type: 'support', seconds: 10, prompt: `scene ${i + 1}`, voiceover: frase(22, `h${i + 1}_`) + '.', caption: '' })
  plan17.scenes.splice(2, 0, { index: 3, type: 'cinematic', seconds: 8, prompt: 'wide shot', voiceover: frase(17, 'dezessete_') + '.', caption: '' })
  plan17.scenes.splice(5, 0, { index: 6, type: 'cinematic', seconds: 8, prompt: 'wide shot', voiceover: frase(19, 'dezenove_') + '.', caption: '' })
  plan17.scenes.forEach((sc, i) => { sc.index = i + 1 })
  await executar(ctxBase(plan17, { expandVoiceoversToTargets: async (items) => items.map((it) => it.text), appendNarrationToTargets: appendNulo, SCENE_CAP: 12 }))
  const c17 = plan17.scenes.find((sc) => /dezessete_1\b/.test(sc.voiceover))
  const c19 = plan17.scenes.find((sc) => /dezenove_1\b/.test(sc.voiceover))
  const cauda19 = plan17.scenes[plan17.scenes.indexOf(c19) + 1]
  checa('17 palavras em 8 s cabem (7,4 s + 0,3): a cena NÃO é dividida', wordsOf(c17.voiceover) === 17 && !plan17.scenes.some((sc) => /^dezessete_\d+\.?$/.test(sc.voiceover.trim())))
  checa(`19 palavras: cabeça de ${wordsOf(c19.voiceover)}; a cauda de 4 entra no COMEÇO da próxima cena de apoio (${wordsOf(cauda19.voiceover)} palavras, ${cauda19.seconds}s ≤ 12) — R4, nunca uma cena de 4 palavras`, wordsOf(c19.voiceover) === 15 && cauda19.type === 'support' && /^dezenove_16 dezenove_17 dezenove_18 dezenove_19. h/.test(cauda19.voiceover) && wordsOf(cauda19.voiceover) === 26 && cauda19.seconds <= 12)
  // R4 (KINEO-CAUDA-NA-PROXIMA): a cauda entra no COMEÇO da próxima cena quando cabe — nenhuma cena nova, nenhum clipe a mais
  const planM = { characterSheet: '', environmentSheet: 'ice', styleSheet: 'cinematic', scenes: [] }
  planM.scenes.push({ index: 1, type: 'support', seconds: 10, prompt: 'a', voiceover: frase(22, 'a_') + '.', caption: '' })
  planM.scenes.push({ index: 2, type: 'cinematic', seconds: 8, prompt: 'wide', voiceover: frase(20, 'vinte_') + '.', caption: '' })
  planM.scenes.push({ index: 3, type: 'support', seconds: 10, prompt: 'b', voiceover: frase(8, 'oito_') + '.', caption: '' })
  for (let i = 0; i < 4; i++) planM.scenes.push({ index: 4 + i, type: 'support', seconds: 10, prompt: `s${i}`, voiceover: frase(22, `s${i}_`) + '.', caption: '' })
  const nAntes = planM.scenes.length
  await executar(ctxBase(planM, { expandVoiceoversToTargets: async (items) => items.map((it) => it.text), appendNarrationToTargets: appendNulo, SCENE_CAP: 12 }))
  const cM = planM.scenes.find((sc) => /vinte_1\b/.test(sc.voiceover))
  const pM = planM.scenes[planM.scenes.indexOf(cM) + 1]
  checa(`cauda de 4 palavras entra no começo da próxima cena (${wordsOf(pM.voiceover)} palavras, ${pM.seconds}s) e o plano não ganha cena (${planM.scenes.length} = ${nAntes})`, wordsOf(cM.voiceover) === 16 && /^vinte_17 vinte_18 vinte_19 vinte_20\. oito_1/.test(pM.voiceover) && wordsOf(pM.voiceover) === 12 && planM.scenes.length === nAntes)
  // KINEO-CAUDA-CHEIA (ensaio do Omni com gpt-4o, 15/09): 21 palavras em 8 s → cabeça de 17 + cauda de 4; com continuação disponível, a cauda cresce até caber nos seus 4 s
  const planC = { characterSheet: '', environmentSheet: 'ice', styleSheet: 'cinematic', scenes: [] }
  for (let i = 0; i < 6; i++) planC.scenes.push({ index: i + 1, type: 'support', seconds: 10, prompt: `c${i + 1}`, voiceover: frase(24, `c${i + 1}_`) + '.', caption: '' }) // vizinhas cheias: a cauda NÃO cabe na próxima
  planC.scenes.splice(4, 0, { index: 5, type: 'cinematic', seconds: 8, prompt: 'wide', voiceover: frase(21, 'cheia_') + '.', caption: '' })
  planC.scenes.forEach((sc, i) => { sc.index = i + 1 })
  await executar(ctxBase(planC, { expandVoiceoversToTargets: async (items) => items.map((it) => it.text), appendNarrationToTargets: appendFiel, SCENE_CAP: 12 }))
  const cC = planC.scenes.find((sc) => /cheia_1\b/.test(sc.voiceover))
  const tC = planC.scenes[planC.scenes.indexOf(cC) + 1]
  checa(`KINEO-CAUDA-CHEIA: a cauda de 4 palavras vira cena nova (vizinhas cheias) e ganha continuação até caber nos seus segundos (${wordsOf(tC?.voiceover)} palavras em ${tC?.seconds}s ≤ 5), começando pelas 4 originais e sem cortar a cabeça (${wordsOf(cC.voiceover)})`, !!tC && tC.type === 'support' && /^cheia_18 cheia_19 cheia_20 cheia_21\.? fato1\b/.test(tC.voiceover) && wordsOf(tC.voiceover) >= 7 && wordsOf(tC.voiceover) <= 12 && (tC.seconds ?? 0) <= 5 && wordsOf(cC.voiceover) <= 17 && planC.scenes.length === 8)
  checa('rota: a cauda nova é preenchida ANTES de virar cena (KINEO-CAUDA-CHEIA depois da cauda-na-próxima e antes do splice), e a recusa do modelo mantém a cauda original', fatia.indexOf('KINEO-CAUDA-CHEIA-2026-09-15') > fatia.indexOf('KINEO-CAUDA-NA-PROXIMA-2026-09-15') && fatia.indexOf('KINEO-CAUDA-CHEIA-2026-09-15') < fatia.indexOf('plan.scenes.splice(i + 1, 0, {') && fatia.includes('w <= cabeCauda + 2 && cheia.startsWith(tail.replace('))
  const rt4 = rd('app/api/generate-video-cinematic/route.ts')
  checa('varredura FINAL de datas inventadas depois de toda reescrita (antes do OMNI-ALVO e da régua)', rt4.includes('KINEO-DATA-INVENTADA (final)') && rt4.indexOf('KINEO-DATA-INVENTADA-2026-09-15 (varredura final)') > rt4.indexOf('KINEO-FALA-NO-TETO-2026-09-15 — ensaio') && rt4.indexOf('KINEO-DATA-INVENTADA-2026-09-15 (varredura final)') < rt4.indexOf('KINEO-OMNI-ALVO-CRAVADO-2026-08-25 (V6.1') && rt4.includes("import { garantirAcaoCentral, silenciarFalaNoPrompt, apararComFolga, removerDatasInventadas } from '@/lib/hollywood/fidelidade'"))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
