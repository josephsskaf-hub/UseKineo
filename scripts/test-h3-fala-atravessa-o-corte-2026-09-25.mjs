// KINEO-FALA-ATRAVESSA-O-CORTE-2026-09-25 + KINEO-MESMA-REGUA-DO-ESCRITOR-2026-09-25 — render H3 7127d8b4 (fundador,
// 25/09 17:18Z, furacão Polo, roteiro pronto de 191 palavras, 60 s, verbatim): 12 clipes aceitos e PAGOS ao fal (~US$ 5,70),
// e o compose recusou o filme inteiro (422 scene_speech_exceeds_footage): a cena 7 mediu 10,9 s de fala num clipe de 10 s
// (×1,13 > ×1,10 do FALA-CABE). A cena nasceu com 11 s; a apara do respiro do C1 mediu a folga a 2,3 pal/s (1,43 s) e tirou
// 1 s — a voz pinada (luxury-narrator, 0,9) fala a 2,07. Na tela: "failed" sem motivo; no banco: `unreported_stage_failure`.
// Este guardião executa as DUAS fatias reais (compose: medição → FALA-CABE → travessia → recusa; planejador: apara do C1 →
// FRASE-MAIOR) com o mundo do Polo e prova:
//   (a) origin/main reproduz a recusa (compose) e a apara a 2,3 (planejador) — falha herdada por nome;
//   (b) candidato/compose: a cena 7 é acelerada até ×1,10 e o filme segue; com TTS fora na correção a fala ATRAVESSA o corte
//       (J-cut na cauda muda da cena 6 + L-cut sobre a cabeça da cena 8, narração da 8 adiada com respiro), nenhuma palavra
//       cortada, nenhum clipe encolhido ou repetido, nenhuma voz sobre outra; o Polo com a voz real (6 cenas em cascata)
//       também fecha, apertando o respiro até 0,2 s onde a vizinha está justa;
//   (c) sem folga em vizinha nenhuma (ou vizinhas de voz nativa) a recusa honesta continua — agora com evento compose_refused
//       (motivo, cena, estouro) e mensagem que nomeia a cena;
//   (d) tela: os 3 ramos que aceitam a recusa de qualidade relatam a causa (trackGenerationFailure com o reason) e continuam
//       saindo com um `return` seco (test-quality-failure-ui).
// A parte do ESCRITOR (a apara do C1 no ritmo da voz, o ensaio de $0 com a tolerância da montagem) vive em
// scripts/test-h3-mesma-regua-do-escritor-2026-09-25.mjs (arquivo da trava 8.2: sobe com a palavra do fundador).
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
const roda = (src, globals = {}) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp, console, Buffer, JSON, Math, ...globals }); return exp }
const r3 = (v) => Math.round(v * 1000) / 1000
const wordsOf = (t) => (t ?? '').trim().split(/\s+/).filter(Boolean).length
const frase = (n, tema) => Array.from({ length: n }, (_, i) => `${tema}${i + 1}`).join(' ') + '.'
let rotaMainCompose = null, rotaMainPlanner = null
try { rotaMainCompose = execFileSync('git', ['show', 'origin/main:app/api/compose/route.ts'], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n') } catch {}
try { rotaMainPlanner = execFileSync('git', ['show', 'origin/main:app/api/generate-video-cinematic/route.ts'], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n') } catch {}

// ═══════════════════════ COMPOSE ═══════════════════════
const compose = rd('app/api/compose/route.ts')
const INI = '      const measured: Array<{ sceneIdx: number; url: string; dur: number; text: string; words?: WhisperWord[] }> = []'
const FIM = "          qualityCheckFailed: true, reason: 'scene_speech_exceeds_footage', retryable: false, generationId,\n        }, { status: 422 }))\n      }"
const PARAMS = ['pendingScenes', 'hollywoodPinnedVoice', 'synthesizeHostSpeech', 'explicitSpeed', 'estimateMp3DurationSeconds', 'transcribeTTSWithTimestamps', 'verifyObservedSpeech', 'uploadVoiceoverToSupabase', 'user', 'rejectBeforeProviderSubmission', 'NextResponse', 'hollywoodClips', 'quality', 'trimNarratedSupport', 'duration', 'secondsOf', 'originalFootageSeconds', 'generationId', 'console', 'logComposeRefusal', 'authenticatedUserId']
const fatiaDe = (src) => { const a = src.indexOf(INI); const b = src.indexOf(FIM, a); return a < 0 || b < a ? null : src.slice(a, b + FIM.length) }
const montar = (fatia) => roda(`export async function rodar(ctx: any) {\n  const { ${PARAMS.join(', ')} } = ctx\n  const composeCtx = ctx.composeCtx ?? { stage: '' }\n${fatia}\n  return { measured, hollywoodClips, rejeitado: null, status: 200, janelas: typeof janelas !== 'undefined' ? janelas : null }\n}`).rodar

console.log('== âncoras do compose ==')
const fatia = fatiaDe(compose)
checa('fatia medição → recusa existe no compose', Boolean(fatia))
checa('parte 1: dentro de ×1,10 a cena é re-sintetizada como antes; acima do teto quem decide é a travessia (parte 3)', fatia.includes('const resintetizar = async (m: (typeof measured)[number], fator: number, footage: number): Promise<boolean> => {') && fatia.includes('acima do teto: a travessia do corte decide') && fatia.includes('await resintetizar(m, fator, footage)') && !fatia.includes('folgaVizinha'))
checa('parte 2: a travessia (J-cut na cauda da anterior, L-cut sobre a cabeça da seguinte) roda sobre a timeline final, depois do TAIL, antes da recusa', fatia.includes('KINEO-FALA-ATRAVESSA-O-CORTE-2026-09-25 (parte 2)') && fatia.indexOf('if (!recusaTravessia) break') > fatia.indexOf('KINEO-TAIL-2026-08-20') && fatia.indexOf('if (recusaTravessia) {') > fatia.indexOf('if (!recusaTravessia) break'))
checa('parte 3: recusa numa cena acima do teto → re-síntese a ×1,10 só se a sobra couber no vão que a travessia mediu (capacidade), uma vez por cena, e a montagem é refeita do slot pós-verificação', fatia.includes('KINEO-FALA-ATRAVESSA-O-CORTE-2026-09-25 (parte 3)') && fatia.includes('if (rodada > 1) hollywoodClips.forEach((c, i) => { c.seconds = originalFootageSeconds[i] })') && fatia.includes('if (sobra > rt.capacidade + 0.01) {') && fatia.includes('aceleradasNaTravessia.has(rt.sceneIdx)') && fatia.includes('if (!(await resintetizar(m, FALA_CABE_MAX_FATOR, footage))) break'))
checa('só cenas narradas por TTS cedem ou recebem (diálogo/host de voz nativa nunca)', fatia.includes("const vaoAnterior = adiado === 0 && prev && ant && (prev.engine === 'support' || prev.engine === 'cinematic') ? r3(secondsOf(prev) - (atraso.get(i - 1) ?? 0) - ant.dur) : null") && fatia.includes("const vaoSeguinte = next && prox && (next.engine === 'support' || next.engine === 'cinematic') ? r3(secondsOf(next) - prox.dur) : null"))
checa('respiro entre falas: 0,4 s de preferência nos dois lados, 0,2 s no aperto, nunca menos (duas passadas); a narração seguinte espera o avanço + respiro', fatia.includes('const RESPIRO_TRAVESSIA_S = FALA_CABE_RESPIRO_S') && fatia.includes('const RESPIRO_MINIMO_S = 0.2') && fatia.includes('for (const respiro of [RESPIRO_TRAVESSIA_S, RESPIRO_MINIMO_S]) {') && fatia.includes('tomar(falta, vaoSeguinte, avanca, respiro + respiro)') && fatia.includes('Math.max(RESPIRO_MINIMO_S, vaoSeguinte - avanca - RESPIRO_MINIMO_S)') && fatia.includes('if (falta <= 0.01 && narradaTts && next) {') && fatia.includes('if (faltaRespiro > 0.01 && vaoSeguinte !== null && avanca === 0) {'))
checa('a recusa honesta continua (reason scene_speech_exceeds_footage, estorno via rejectBeforeProviderSubmission) e agora deixa evento compose_refused com cena e estouro', fatia.includes("reason: 'scene_speech_exceeds_footage'") && fatia.includes("await logComposeRefusal('scene_speech_exceeds_footage', authenticatedUserId, {") && fatia.includes('scene: rt.sceneIdx + 1, scene_seconds: rt.slot, speech_seconds:'))
checa('os blocos de narração usam as janelas da travessia (time/endCap)', compose.includes('const janela = janelas.get(m.sceneIdx)') && compose.includes('endCap: janela?.endCap ?? Math.round((time + secondsOf(c)) * 1000) / 1000,'))
checa('FALA-CABE intacto: respiro 0,4 s e teto ×1,10', fatia.includes('const FALA_CABE_RESPIRO_S = 0.4') && fatia.includes('const FALA_CABE_MAX_FATOR = 1.1'))
checa('H3 nunca encolhe (KINEO-H3-DURACAO intacto) e a cena nunca cresce além da footage (loop:true)', fatia.includes("if (c && c.engine === 'support' && quality !== 'cinematic_h3') {") && fatia.includes('const need = Math.min(originalFootageSeconds[m.sceneIdx], Math.round((m.dur + 0.6) * 10) / 10)'))

// ── o mundo do Polo: 12 cenas de apoio H3 [4,9,6,11,7,10,10,9,5,10,7,7] s, voz luxury-narrator (alloy, 0,9) a 2,07 pal/s.
// WORDS = as palavras reais das 12 narrações; a 2,07 seis cenas ficam 0,1-0,3 s acima do clipe (o FALA-CABE acelera cada uma).
// WORDS_CALMO = o mesmo plano com as vizinhas folgadas, para isolar a cena 7 (10,9 s medidos, ×1,13).
const SECS = [4, 9, 6, 11, 7, 10, 10, 9, 5, 10, 7, 7]
const WORDS = [7, 19, 12, 22, 15, 19, 22, 16, 9, 21, 12, 13]
const WORDS_CALMO = [7, 17, 11, 21, 13, 19, 22, 16, 9, 19, 12, 13]
const PERSONA = { personaId: 'luxury-narrator', voice: 'alloy', defaultSpeed: 0.9 }
const RITMO = 2.3 * 0.9
function mundo(opts = {}) {
  const words = opts.words ?? WORDS_CALMO
  const secs = opts.secs ?? SECS
  const engines = opts.engines ?? secs.map(() => 'support')
  const durs = opts.durs ?? {} // duração medida por cena na velocidade base (sobrescreve palavras/ritmo)
  const clips = secs.map((s, i) => ({ engine: engines[i], seconds: s, url: `https://fal/c${i + 1}.mp4` }))
  const pending = words.map((w, i) => ({ sceneIdx: i, text: frase(w, `s${i + 1}_`) })).filter((p) => clips[p.sceneIdx].engine === 'support' || clips[p.sceneIdx].engine === 'cinematic')
  const idxDe = (text) => Number(text.match(/^s(\d+)_/)[1]) - 1
  const sinteses = []
  let chamadas = 0
  const synth = async ({ text, speed }) => {
    chamadas++
    if (opts.ttsForaDepoisDe !== undefined && chamadas > opts.ttsForaDepoisDe) throw new Error('tts down')
    sinteses.push({ text, speed })
    const i = idxDe(text)
    const base = durs[i] ?? wordsOf(text) / RITMO
    return Buffer.from(JSON.stringify({ dur: r3(base / (speed / PERSONA.defaultSpeed)), speed }))
  }
  const recusas = [], eventos = []
  const ctx = {
    pendingScenes: pending, hollywoodPinnedVoice: PERSONA, synthesizeHostSpeech: synth, explicitSpeed: null,
    estimateMp3DurationSeconds: (buf) => JSON.parse(buf.toString()).dur, transcribeTTSWithTimestamps: async () => [], verifyObservedSpeech: () => ({ ok: false }),
    uploadVoiceoverToSupabase: async (_u, buf) => `https://voz/${JSON.parse(buf.toString()).speed}.mp3`, user: { id: 'u1' },
    rejectBeforeProviderSubmission: async (r) => { recusas.push(r); return r }, NextResponse: { json: (b, init) => ({ rejeitado: b, status: init?.status ?? 200 }) },
    hollywoodClips: clips, quality: 'cinematic_h3', trimNarratedSupport: (_c, i) => clips[i].seconds, duration: 60, secondsOf: (c) => c.seconds,
    originalFootageSeconds: clips.map((c) => c.seconds), generationId: '7127d8b4', console: { log: () => {}, warn: () => {} },
    logComposeRefusal: async (reason, userId, meta) => { eventos.push({ reason, userId, meta }) }, authenticatedUserId: 'u1',
    ...(opts.ctx ?? {}),
  }
  return { ctx, sinteses, recusas, eventos, clips, pending }
}
const POLO = { durs: { 6: 10.9 } }
const startsDe = (clips) => { const s = []; let cur = 0; for (const c of clips) { s.push(cur); cur = r3(cur + c.seconds) } return s }
// invariantes de um filme que seguiu: toda fala cabe na própria janela; nenhuma fala começa antes de a anterior acabar; em TODA
// fronteira entre duas narrações que a travessia tocou (antecipou, avançou ou foi adiada) sobra ≥ 0,19 s; no modo estrito
// (mundos onde toda cena tem folga) TODA fronteira guarda ≥ 0,19 s; a última narração guarda ≥ 0,79 s de fim de filme quando
// foi adiada (nunca no último frame); footage intacta. (Revisão adversarial de 25/09: a 1ª versão só olhava as fronteiras do lado que
// tomou, e a narração adiada terminava colada na próxima.)
const invariantes = (r, clips, secs, estrito = false) => {
  const j = r.janelas
  if (!j) return { janelaOk: false, semSobreposicao: false, footageOk: false }
  const starts = startsDe(clips)
  const total = r3(clips.reduce((a, c) => a + c.seconds, 0))
  const janelaOk = r.measured.every((m) => { const w = j.get(m.sceneIdx); return w && m.dur <= r3(w.endCap - w.time) + 0.01 })
  const ord = [...r.measured].sort((a, b) => a.sceneIdx - b.sceneIdx)
  let semSobreposicao = true
  for (let i = 1; i < ord.length; i++) {
    const wa = j.get(ord[i - 1].sceneIdx), wb = j.get(ord[i].sceneIdx)
    const gap = r3(wb.time - (wa.time + ord[i - 1].dur))
    const adiadaA = wa.time > starts[ord[i - 1].sceneIdx] + 1e-9
    const tocada = wb.antecipa > 0 || wa.avanca > 0 || wa.antecipa > 0 || adiadaA
    if (gap < -0.011) semSobreposicao = false // a mesma tolerância de 0,01 s que o compose sempre aceitou (rabo do mp3)
    if ((estrito || tocada) && gap < 0.19) semSobreposicao = false
  }
  const ultima = ord[ord.length - 1]
  if (ultima) { const w = j.get(ultima.sceneIdx); if (w.time > starts[ultima.sceneIdx] + 1e-9 && r3(total - (w.time + ultima.dur)) < 0.19) semSobreposicao = false }
  // a ÚLTIMA cena pode ter sido aparada pelo KINEO-TAIL (rabo mudo acima do piso) antes da travessia; as outras não mudam
  const footageOk = clips.every((cl, i) => (i === clips.length - 1 ? cl.seconds <= secs[i] + 1e-9 : cl.seconds === secs[i]))
  return { janelaOk, semSobreposicao, footageOk }
}
checa(`o mundo reproduz o render: a cena 7 estoura (10,9 + 0,4 = 11,3 s num clipe de 10 s, ×1,13 > 1,10); no mundo calmo só ela; as vizinhas têm cauda ${r3(10 - 19 / RITMO - 0.4)}s e cabeça ${r3(9 - 16 / RITMO - 0.4)}s`, r3((10.9 + 0.4) / 10) === 1.13 && WORDS_CALMO.every((w, i) => i === 6 || w / RITMO + 0.4 <= SECS[i] + 1e-9) && WORDS.filter((w, i) => i !== 6 && w / RITMO + 0.4 > SECS[i]).length === 5 && r3(10 - 19 / RITMO - 0.4) > 0.4 && r3(9 - 16 / RITMO - 0.4) > 0.8)

console.log('== (a) reprodução na origin/main: o compose de lá recusa o Polo depois de pagar ==')
{
  const fm = rotaMainCompose ? fatiaDe(rotaMainCompose) : null
  if (fm && !fm.includes('KINEO-FALA-ATRAVESSA-O-CORTE-2026-09-25')) {
    const { ctx, sinteses, recusas } = mundo(POLO)
    const r = await montar(fm)(ctx)
    checa(`main: ${sinteses.length} sínteses (12 medições, nenhuma correção: ×1,13 passa do teto) e o filme é RECUSADO com scene_speech_exceeds_footage (é o 7127d8b4)`, sinteses.length === 12 && r.status === 422 && r.rejeitado?.reason === 'scene_speech_exceeds_footage' && recusas.length === 1)
  } else {
    checa('reprodução na main pulada (origin/main já traz a travessia, ou git indisponível)', true)
  }
}

console.log('== (b) candidato: com vizinhas folgadas a cena 7 atravessa o corte sem mexer na voz ==')
{
  const { ctx, sinteses, recusas, eventos, clips, pending } = mundo(POLO)
  const r = await montar(fatia)(ctx)
  const corrigidas = sinteses.slice(12)
  const j = r.janelas
  const w6 = j?.get(6)
  checa(`sem 422 e sem síntese extra: ${sinteses.length} sínteses = 12 medições + ${corrigidas.length} correção (a travessia bastou), nenhuma recusa, nenhum evento`, r.status !== 422 && r.rejeitado === null && corrigidas.length === 0 && recusas.length === 0 && eventos.length === 0)
  checa('a cena 7 (10,9 s) começa 0,42 s antes e avança 0,47 s; a voz fica como foi gravada', w6 && w6.antecipa === r3(10 - 19 / RITMO - 0.4) && w6.avanca === r3(9 - 16 / RITMO - 0.8) && r.measured[6].dur === 10.9)
  checa('ordem intacta, texto ORIGINAL em toda cena (nenhuma palavra cortada)', r.measured.map((m) => m.sceneIdx).join(',') === '0,1,2,3,4,5,6,7,8,9,10,11' && r.measured.every((m) => m.text === pending[m.sceneIdx].text))
  checa('H3: nenhuma cena encolheu nem passou da footage', clips.every((c, i) => c.seconds === SECS[i]))
  const inv = invariantes(r, clips, SECS, true)
  checa('toda fala cabe na janela, respiro ≥ 0,2 s em toda fronteira', inv.janelaOk && inv.semSobreposicao && inv.footageOk)
}

console.log('== (b2) vizinhas apertadas: a travessia não fecha, a cena 7 acelera a ×1,10 e a montagem é refeita ==')
{
  // cena 6 mede 9,7 s (cauda 0,3 s; ×1,01: re-síntese do FALA-CABE, dentro do teto); cena 8 mede 8,6 s em 9 s (cabeça 0,4 s)
  const { ctx, sinteses, recusas, eventos, clips } = mundo({ durs: { 5: 9.7, 6: 10.9, 7: 8.6 } })
  const r = await montar(fatia)(ctx)
  const corr = sinteses.slice(12).map((s) => s.text.split('_')[0] + '@' + s.speed.toFixed(3))
  const j = r.janelas
  checa(`sem 422: correções ${JSON.stringify(corr)} — a 6 dentro do teto (parte 1) e a 7 a ×1,10 (parte 3), depois da travessia recusar por falta de vão`, r.status !== 422 && recusas.length === 0 && eventos.length === 0 && corr.length === 2 && corr[0].startsWith('s6@') && corr[1] === 's7@' + (PERSONA.defaultSpeed * 1.1).toFixed(3))
  checa('a fala corrigida da cena 7 cabe no clipe (9,9 s em 10 s) e só recua ≤ 0,2 s para o respiro; nada avança', r.measured[6].dur <= 10 && r.measured[6].dur > 9.5 && j?.get(6) && j.get(6).avanca === 0 && j.get(6).antecipa > 0 && j.get(6).antecipa <= 0.2)
  const inv = invariantes(r, clips, SECS, true)
  checa('H3 intacto, toda fala cabe, respiro ≥ 0,2 s em toda fronteira', clips.every((c, i) => c.seconds === SECS[i]) && inv.janelaOk && inv.semSobreposicao)
}

console.log('== (c) candidato com TTS fora na correção: a fala de 10,9 s ATRAVESSA o corte ==')
{
  const { ctx, recusas, eventos, clips } = mundo({ ...POLO, ttsForaDepoisDe: 12 })
  const r = await montar(fatia)(ctx)
  const j = r.janelas
  const starts = startsDe(clips)
  const w6 = j?.get(6), w7 = j?.get(7), w5 = j?.get(5)
  const cauda6 = r3(10 - 19 / RITMO - 0.4) // 0.421 — a cauda muda da cena 6 guardando o respiro cheio
  const avanca = r3(Math.min(0.9 - cauda6, 9 - 16 / RITMO - 0.4 - 0.4)) // 0.471: a cabeça da 8 menos o respiro antes E depois da narração dela; os 0,008 s que sobram cabem na tolerância
  checa(`sem recusa: a cena 7 (10,9 s) começa ${cauda6}s antes (J-cut) e avança ${avanca}s sobre a cena 8 (L-cut)`, r.status !== 422 && recusas.length === 0 && eventos.length === 0 && w6 && w6.antecipa === cauda6 && w6.avanca === avanca)
  checa('a narração da cena 8, adiada, ainda guarda ≥ 0,4 s antes da narração da cena 9 (a cabeça inteira nunca é entregue ao L-cut)', w7 && r3((j.get(8)?.time ?? starts[8]) - (w7.time + r.measured[7].dur)) >= 0.39)
  checa('janela da cena 7: começa na cauda da 6 e o endCap cobre a fala inteira (nenhuma palavra guilhotinada)', w6 && w6.time === r3(starts[6] - cauda6) && w6.endCap >= r3(w6.time + 10.9) && w6.endCap <= r3(starts[6] + 10 + avanca + 0.05))
  checa(`a narração da cena 8 espera ${r3(avanca + 0.4)}s (avanço + respiro cheio) e ainda cabe na própria cena`, w7 && w7.time === r3(starts[7] + avanca + 0.4) && r3(w7.time + r.measured[7].dur) <= r3(starts[7] + 9) + 0.01)
  const fim5 = r3((w5?.time ?? starts[5]) + r.measured[5].dur)
  checa('respiro de 0,4 s entre a fala da cena 6 e a da 7, e entre a da 7 e a da 8 — nunca duas vozes', w6 && w7 && r3(w6.time - fim5) >= 0.39 && r3(w7.time - (w6.time + 10.9)) >= 0.39)
  const inv = invariantes(r, clips, SECS)
  checa('as 12 narrações cabem nas próprias janelas; H3: nenhuma cena encolheu nem passou da footage — a imagem não muda, só a voz atravessa', inv.janelaOk && inv.semSobreposicao && inv.footageOk)
}

console.log('== (c2) o Polo com a voz real: 6 cenas estouram por 0,1-0,3 s em cascata, TTS fora nas correções ==')
{
  const { ctx, recusas, clips } = mundo({ words: WORDS, durs: { 6: 10.9 }, ttsForaDepoisDe: 12 })
  const r = await montar(fatia)(ctx)
  const inv = invariantes(r, clips, SECS)
  const j = r.janelas
  checa(`sem recusa (até 24/09 morria a 0,03 s do fim): ${[...(j?.values() ?? [])].filter((w) => w.antecipa > 0 || w.avanca > 0).length} cenas atravessam o corte, toda fala cabe, respiro ≥ 0,2 s, footage intacta`, r.status !== 422 && recusas.length === 0 && inv.janelaOk && inv.semSobreposicao && inv.footageOk && j && j.get(6) && (j.get(6).antecipa > 0 || j.get(6).avanca > 0))
}

console.log('== (d) sem folga em vizinha nenhuma: a recusa honesta continua, agora com nome ==')
{
  // toda cena com a fala medida a 0,15 s do fim do clipe (menos que o respiro mínimo) e a cena 7 com 10,9 s
  const durs = Object.fromEntries(SECS.map((s, i) => [i, i === 6 ? 10.9 : r3(s - 0.15)]))
  const { ctx, recusas, eventos } = mundo({ durs, ttsForaDepoisDe: 12 })
  const r = await montar(fatia)(ctx)
  checa('recusa honesta: 422 scene_speech_exceeds_footage, 1 rejectBeforeProviderSubmission (estorno)', r.status === 422 && r.rejeitado?.reason === 'scene_speech_exceeds_footage' && recusas.length === 1)
  checa('evento compose_refused com motivo, cena 7, segundos do clipe e da fala e o estouro', eventos.length === 1 && eventos[0].reason === 'scene_speech_exceeds_footage' && eventos[0].userId === 'u1' && eventos[0].meta.scene === 7 && eventos[0].meta.scene_seconds === 10 && eventos[0].meta.overflow_seconds > 0 && eventos[0].meta.generation_id === '7127d8b4')
  checa('a mensagem nomeia a cena e o estouro em centésimos', /^Scene 7's narration runs \d+\.\d\ds longer than its generated clip/.test(String(r.rejeitado?.error)))
}

console.log('== (e) vizinhas de voz nativa (diálogo/host) nunca cedem ==')
{
  const engines = SECS.map((_, i) => (i === 5 ? 'dialogue' : i === 7 ? 'host' : 'support'))
  const { ctx, recusas } = mundo({ ...POLO, engines, ttsForaDepoisDe: 10 })
  const r = await montar(fatia)(ctx)
  checa('cena 7 entre diálogo e host, correção fora: nem J-cut nem L-cut → recusa honesta', r.status === 422 && r.rejeitado?.reason === 'scene_speech_exceeds_footage' && recusas.length === 1)
}

console.log('== (e2) J-cut antes de um diálogo: a fala nunca termina colada na primeira palavra do personagem ==')
{
  // cena 2 estoura (11,11 s em 10 s, ×1,15); a cena 3 é diálogo (voz nativa desde o primeiro frame); a cena 1 tem cauda de 1,0 s
  const { ctx, recusas, clips } = mundo({ words: [7, 22, 5], secs: [10, 10, 8], engines: ['support', 'support', 'dialogue'], durs: { 0: 9.0, 1: 11.11 } })
  const r = await montar(fatia)(ctx)
  const starts = startsDe(clips)
  const w1 = r.janelas?.get(1)
  checa('acelera até ×1,10 (10,1 s) e recua na cauda da cena 1 o suficiente para terminar ≥ 0,2 s antes do diálogo', r.status !== 422 && recusas.length === 0 && w1 && r3(starts[2] - (w1.time + r.measured[1].dur)) >= 0.19 && w1.antecipa >= 0.29)
}

console.log('== (e3) L-cut sobre a última cena: a narração final nunca termina no último frame ==')
{
  const secs = [10, 10, 10, 10, 10, 10, 10]
  const { ctx, recusas, clips } = mundo({ words: secs.map(() => 18), secs, durs: { 0: 9, 1: 9, 2: 9, 3: 9, 4: 9.9, 5: 11.44, 6: 5.0 } })
  const r = await montar(fatia)(ctx)
  const total = r3(clips.reduce((a, c) => a + c.seconds, 0))
  const w6 = r.janelas?.get(6)
  checa(`última cena aparada pelo TAIL (${clips[6].seconds}s), a 6 acelera e avança sobre ela, e a narração final ainda termina ≥ 0,2 s antes do fim (${w6 ? r3(total - (w6.time + r.measured[6].dur)) : '?'}s) — nunca no último frame`, r.status !== 422 && recusas.length === 0 && w6 && r3(total - (w6.time + r.measured[6].dur)) >= 0.19 && r.janelas.get(5).avanca > 0)
}

console.log('== (g) cenários da revisão adversarial: nenhuma síntese desperdiçada; o filme que cabe é entregue ==')
{
  const W7 = [18, 18, 18, 18, 18, 18, 18], S7 = [10, 10, 10, 10, 10, 10, 10]
  const roda7 = async (durs) => { const m = mundo({ words: W7, secs: S7, durs }); const r = await montar(fatia)(m.ctx); return { r, corr: m.sinteses.slice(7).map((s) => s.text.split('_')[0] + '@' + s.speed.toFixed(3)), recusas: m.recusas, clips: m.clips } }
  // (i) cena 4 acelera (parte 3) e avança sobre a 5; a 6 (12,0 s) não cabe nem a ×1,10 (as vizinhas cedem 0,4 s) → recusa honesta SEM sintetizar a 6
  const i = await roda7({ 0: 9, 1: 9, 2: 9.9, 3: 11.5, 4: 9.0, 5: 12.0, 6: 5.0 })
  checa(`(i) recusa honesta na cena 6 com ${JSON.stringify(i.corr)}: a 3 dentro do teto, a 4 a ×1,10 (cabia), e NENHUMA síntese da 6 (não caberia)`, i.r.status === 422 && i.recusas.length === 1 && i.corr.length === 2 && i.corr[0].startsWith('s3@') && i.corr[1] === 's4@' + (PERSONA.defaultSpeed * 1.1).toFixed(3) && String(i.r.rejeitado?.error).startsWith("Scene 6's narration"))
  // (ii) a última cena NÃO é aparada pelo TAIL (rabo 0,6 s): a 6 acelera a ×1,10 e avança sobre a 7 — o filme é entregue (a estimativa antiga recusava)
  const ii = await roda7({ 0: 9, 1: 9, 2: 9, 3: 9, 4: 9.9, 5: 11.8, 6: 8.6 })
  const invii = invariantes(ii.r, ii.clips, S7, true)
  checa(`(ii) filme entregue com ${JSON.stringify(ii.corr)}: última cena intacta (${ii.clips[6].seconds}s), a 6 acelera e avança sobre a 7, respiro ≥ 0,2 s em toda fronteira`, ii.r.status !== 422 && ii.recusas.length === 0 && ii.corr.length === 2 && ii.corr[1] === 's6@' + (PERSONA.defaultSpeed * 1.1).toFixed(3) && ii.clips[6].seconds === 10 && invii.janelaOk && invii.semSobreposicao && ii.r.janelas.get(5).avanca > 0)
  // (iii) o cenário original do revisor: a 6 (11,99 s) não cabe nem a ×1,10 (0,9 s de sobra, 0,4 s de vão) → recusa honesta sem sintetizar a 6
  const iii = await roda7({ 0: 9, 1: 9, 2: 9, 3: 9, 4: 9.9, 5: 11.99, 6: 5.0 })
  checa(`(iii) recusa honesta com ${JSON.stringify(iii.corr)}: só a 5 (dentro do teto); a 6 não é sintetizada à toa`, iii.r.status === 422 && iii.recusas.length === 1 && iii.corr.length === 1 && iii.corr[0].startsWith('s5@') && String(iii.r.rejeitado?.error).startsWith("Scene 6's narration"))
}

console.log('== (f) fuzz do compose: 300 filmes H3 com uma cena estourando 1-14 % ==')
{
  let seed = 20260925
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  let filmes = 0, seguiram = 0, recusados = 0, ruins = []
  for (let k = 0; k < 300; k++) {
    const n = 6 + Math.floor(rnd() * 7)
    const secs = Array.from({ length: n }, () => 4 + Math.floor(rnd() * 9))
    const words = secs.map((s) => Math.max(1, Math.floor((s - 0.4 - rnd() * 1.2) * RITMO)))
    const alvo = Math.floor(rnd() * n)
    const durs = { [alvo]: r3(secs[alvo] * (1.01 + rnd() * 0.13)) }
    const ttsFora = rnd() < 0.5
    const { ctx, recusas, clips } = mundo({ words, secs, durs, ...(ttsFora ? { ttsForaDepoisDe: n } : {}) })
    const r = await montar(fatia)(ctx)
    filmes++
    if (r.status === 422) { recusados++; if (recusas.length !== 1) ruins.push({ k, motivo: 'recusa sem estorno' }); continue }
    seguiram++
    const inv = invariantes(r, clips, secs, true)
    if (!inv.janelaOk || !inv.semSobreposicao || !inv.footageOk) ruins.push({ k, ...inv })
  }
  checa(`fuzz: ${filmes} filmes, ${seguiram} seguiram (fala cabe na janela, nenhuma voz sobre outra, respiro ≥ 0,19 s em TODA fronteira e ≥ 0,19 s no fim quando a última foi adiada, footage intacta) e ${recusados} recusados com estorno; ${ruins.length} inválidos` + (ruins.length ? ' ' + JSON.stringify(ruins[0]) : ''), filmes === 300 && ruins.length === 0 && seguiram > recusados)
}

// ═══════════════════════ TELA ═══════════════════════
console.log('== (d) a tela relata a causa da recusa de qualidade ==')
{
  const tela = rd('app/(dashboard)/generate/GenerateClient.tsx')
  const sites = tela.split('acceptQualityFailure(data, ').length - 1
  const saidasSecas = (tela.match(/if \(!res\.ok && acceptQualityFailure\(data, [A-Za-z]+\)\) return\n/g) ?? []).length
  const relatos = [
    "const recusaDaRetomada = !res.ok ? parseVideoQualityFailure(data, payloadGenerationId) : null\n            if (recusaDaRetomada) trackGenerationFailure('composing', recusaDaRetomada.reason, { httpStatus: res.status,",
    "const recusaDoCompose = !res.ok ? parseVideoQualityFailure(data, composeGenerationId) : null\n          if (recusaDoCompose) trackGenerationFailure('clips_ready', recusaDoCompose.reason, { httpStatus: res.status,",
    "if (recusaTerminal && !saidaDaRecusa) trackGenerationFailure('generating', recusaTerminal.reason, { httpStatus: res.status,",
  ].filter((s) => tela.includes(s)).length
  checa(`os ${sites} ramos que aceitam a recusa de qualidade relatam a causa antes de sair (${relatos} relatos) — nunca mais unreported_stage_failure para um 422 com reason`, sites === 3 && relatos === 3)
  checa(`a saída continua um return seco nos ${saidasSecas} ramos (test-quality-failure-ui: a recusa terminal sai, nunca reconecta)`, saidasSecas === 3)
  checa('o ramo do despacho não relata duas vezes: com saída, o bloco antigo relata; sem saída, o novo', tela.includes("if (recusaTerminal && !saidaDaRecusa) trackGenerationFailure(") && tela.includes("if (recusaTerminal && saidaDaRecusa) {\n            trackGenerationFailure('generating', recusaTerminal.reason, {") && !tela.includes('recusaJaRelatada'))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
