// KINEO-FALA-CABE-2026-09-15 — reprodução do H3 7bb62a29 (fundador, 15/09 18:46Z): 7 clipes
// aceitos e PAGOS ao fal (~$4,36), plano [8,12,10,11,9,10,11] s, voz pinada
// character:male:elderly (onyx 0,94). No compose a narração medida + 0,6 s passou da footage
// em 3 cenas por 0,3–1,2 s; o TAIL-GROW para na footage e o filme foi RECUSADO com
// scene_speech_exceeds_footage (45 cr estornados, clipes perdidos). Este guardião executa a
// FATIA REAL do compose (medição → FALA-CABE → encolhe/cresce → recusa) com a voz mockada e prova:
//   (a) na origin/main a mesma medição termina em 422 (reprodução, falha herdada por nome);
//   (b) no candidato as 3 cenas são re-sintetizadas na velocidade exata que cabe (≤ ×1,08),
//       texto idêntico, ordem intacta, nenhuma cena passa da footage (o builder usa loop:true —
//       além da footage o clipe recomeçaria), e o filme segue para a montagem;
//   (c) estouro > 8 % NÃO é acelerado: a recusa honesta continua;
//   (d) re-síntese que falha ou não melhora mantém o original — e, desde 25/09 (KINEO-FALA-ATRAVESSA-O-CORTE), a fala
//       atravessa o corte (J/L-cut) em vez de recusar o filme pago; a recusa fica só para quem não tem de onde tirar.
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

const INI = '      const measured: Array<{ sceneIdx: number; url: string; dur: number; text: string; words?: WhisperWord[] }> = []'
const FIM = "          qualityCheckFailed: true, reason: 'scene_speech_exceeds_footage', retryable: false, generationId,\n        }, { status: 422 }))\n      }"
const PARAMS = ['pendingScenes', 'hollywoodPinnedVoice', 'synthesizeHostSpeech', 'explicitSpeed', 'estimateMp3DurationSeconds', 'transcribeTTSWithTimestamps', 'verifyObservedSpeech', 'uploadVoiceoverToSupabase', 'user', 'rejectBeforeProviderSubmission', 'NextResponse', 'hollywoodClips', 'quality', 'trimNarratedSupport', 'duration', 'secondsOf', 'originalFootageSeconds', 'generationId', 'console', 'logComposeRefusal', 'authenticatedUserId' /* KINEO-FALA-ATRAVESSA-O-CORTE-2026-09-25: a recusa passou a deixar evento */]
function fatiaDe(src) { const a = src.indexOf(INI); const b = src.indexOf(FIM, a); return a < 0 || b < a ? null : src.slice(a, b + FIM.length) }
function montar(fatia) {
  return roda(`export async function rodar(ctx: any) {\n  const { ${PARAMS.join(', ')} } = ctx\n  const composeCtx = ctx.composeCtx ?? { stage: '' } // KINEO-COMPOSE-FALHA-COM-NOME-2026-09-22\n${fatia}\n  return { measured, hollywoodClips, rejeitado: null, status: 200, janelas: typeof janelas !== 'undefined' ? janelas : null /* KINEO-FALA-ATRAVESSA-O-CORTE-2026-09-25 */ }\n}`).rodar
}
const wordsOf = (t) => (t ?? '').trim().split(/\s+/).filter(Boolean).length
const frase = (n, tema) => Array.from({ length: n }, (_, i) => `${tema}${i + 1}`).join(' ') + '.'

const rota = rd('app/api/compose/route.ts')
const fatia = fatiaDe(rota)
checa('fatia medição → recusa existe no compose', Boolean(fatia))
checa('candidato: KINEO-FALA-CABE re-sintetiza até ×1,10 com respiro de 0,4 s (persona × fator), com o MESMO texto, antes do encolhe/cresce', fatia.includes('const FALA_CABE_MAX_FATOR = 1.1') && fatia.includes('const FALA_CABE_RESPIRO_S = 0.4') && fatia.includes('const need = m.dur + FALA_CABE_RESPIRO_S') && fatia.includes('speed: hollywoodPinnedVoice.defaultSpeed * (explicitSpeed ?? 1.0) * fator') && fatia.indexOf('KINEO-FALA-CABE-2026-09-15') < fatia.indexOf('KINEO-H3-DURACAO-2026-08-20'))
checa('candidato: só cenas narradas (support/cinematic) entram; estouro maior que o teto NÃO é acelerado', fatia.includes("if (!c || (c.engine !== 'support' && c.engine !== 'dialogue' && c.engine !== 'cinematic') || !hollywoodPinnedVoice) continue".replace(" && c.engine !== 'dialogue'", '')) && fatia.includes('if (fator > FALA_CABE_MAX_FATOR) {'))
checa('candidato: a re-síntese que não encurta a fala é descartada (dur >= m.dur → mantém o original)', fatia.includes('if (!(dur > 0.3) || dur >= m.dur) {'))
// KINEO-FALA-ATRAVESSA-O-CORTE-2026-09-25: a recusa passou a nascer da travessia (recusaTravessia) — só quando nem a cauda da
// cena anterior nem a cabeça da seguinte absorvem a fala; o reason, o estorno e o lugar (antes do builder) são os mesmos.
checa('a recusa honesta (scene_speech_exceeds_footage, estorno) continua no lugar — depois da travessia do corte', fatia.includes('if (recusaTravessia) {') && fatia.indexOf('if (recusaTravessia) {') > fatia.indexOf('KINEO-FALA-ATRAVESSA-O-CORTE-2026-09-25 (parte 2)') && fatia.includes("reason: 'scene_speech_exceeds_footage'"))
const lib = rd('lib/compose.ts')
checa('lib/compose: o builder hollywood monta cena narrada com loop:true — por isso a cena NUNCA cresce além da footage (o clipe recomeçaria)', lib.includes("loop: clip.engine !== 'host' && clip.engine !== 'dialogue',"))
checa('o TAIL-GROW não promete mais um "hold do último frame" que o builder não faz', !rota.includes('o Creatomate segura o último\n        // frame pelo excedente') && !rota.includes('o Creatomate segura o último frame, e um hold de 0.5-2s'))
checa('TAIL-GROW meio e última cena continuam limitados pela footage', fatia.includes('const need = Math.min(originalFootageSeconds[m.sceneIdx], Math.round((m.dur + 0.6) * 10) / 10)') && fatia.includes('last.seconds = Math.min(originalFootageSeconds[lastIdx], Math.round((secondsOf(last) + grow) * 10) / 10)'))

// ── o mundo do render 7bb62a29: 7 cenas de apoio H3, voz idosa a 2,3 × 0,94 = 2,162 pal/s ──
const PERSONA = { personaId: 'character:male:elderly', voice: 'onyx', defaultSpeed: 0.94 }
const SECS = [8, 12, 10, 11, 9, 10, 11]
const WORDS = [15, 26, 20, 24, 18, 20, 23] // cenas 2, 4 e 7 estouram (medida + 0,4 > footage)
function mundo(opts = {}) {
  const words = opts.words ?? WORDS
  const clips = SECS.map((s, i) => ({ engine: 'support', seconds: s, url: `https://fal/c${i + 1}.mp4` }))
  const pending = words.map((w, i) => ({ sceneIdx: i, text: frase(w, `s${i + 1}_`) }))
  const sinteses = []
  const paceOf = (speed) => 2.3 * speed
  const synth = opts.synth ?? (async ({ text, speed }) => { sinteses.push({ text, speed }); return Buffer.from(JSON.stringify({ dur: Math.round((wordsOf(text) / paceOf(speed)) * 1000) / 1000, speed })) })
  const recusas = [], eventos = []
  const ctx = {
    pendingScenes: pending, hollywoodPinnedVoice: PERSONA, synthesizeHostSpeech: synth, explicitSpeed: null,
    estimateMp3DurationSeconds: (buf) => JSON.parse(buf.toString()).dur, transcribeTTSWithTimestamps: async () => [], verifyObservedSpeech: () => ({ ok: false }),
    uploadVoiceoverToSupabase: async (_u, buf) => `https://voz/${JSON.parse(buf.toString()).speed}.mp3`, user: { id: 'u1' },
    rejectBeforeProviderSubmission: async (r) => { recusas.push(r); return r }, NextResponse: { json: (b, init) => ({ rejeitado: b, status: init?.status ?? 200 }) },
    hollywoodClips: clips, quality: 'cinematic_h3', trimNarratedSupport: (_c, i) => clips[i].seconds, duration: 60, secondsOf: (c) => c.seconds,
    originalFootageSeconds: clips.map((c) => c.seconds), generationId: '7bb62a29', console: { log: () => {}, warn: () => {} },
    logComposeRefusal: async (reason, _u, meta) => { eventos.push({ reason, meta }) }, authenticatedUserId: 'u1', // KINEO-FALA-ATRAVESSA-O-CORTE-2026-09-25
    ...(opts.ctx ?? {}),
  }
  return { ctx, sinteses, recusas, eventos, clips, pending }
}
const RITMO = 2.3 * 0.94
const estouros = WORDS.map((w, i) => Math.round((w / RITMO + 0.4 - SECS[i]) * 100) / 100)
checa(`o mundo reproduz o render: 3 cenas com fala medida + 0,4 s acima da footage (${estouros.filter((e) => e > 0).length}: ${estouros.map((e, i) => e > 0 ? `cena ${i + 1} +${e}s` : null).filter(Boolean).join(', ')})`, estouros.filter((e) => e > 0).length === 3 && estouros[1] > 0 && estouros[3] > 0 && estouros[6] > 0)

console.log('== (a) reprodução na origin/main: a fatia de lá recusa depois de pagar ==')
{
  let rotaMain = null
  try { rotaMain = execFileSync('git', ['show', 'origin/main:app/api/compose/route.ts'], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n') } catch {}
  const fm = rotaMain ? fatiaDe(rotaMain) : null
  if (fm && !fm.includes('KINEO-FALA-CABE-2026-09-15')) {
    const { ctx, sinteses, recusas } = mundo()
    const r = await montar(fm)(ctx)
    checa(`main: 1 síntese por cena (${sinteses.length}), nenhuma correção, e o filme é RECUSADO com scene_speech_exceeds_footage (é o 7bb62a29)`, sinteses.length === 7 && r.status === 422 && r.rejeitado?.reason === 'scene_speech_exceeds_footage' && recusas.length === 1)
  } else {
    checa('reprodução na main pulada (origin/main já traz o FALA-CABE, ou git indisponível)', true)
  }
}

console.log('== (b) candidato: as 3 cenas falam um fio mais rápido e o filme segue ==')
{
  const { ctx, sinteses, recusas, clips, pending } = mundo()
  const r = await montar(fatia)(ctx)
  const corrigidas = sinteses.slice(7)
  checa(`sem 422: ${sinteses.length} sínteses = 7 medições + ${corrigidas.length} correções (cenas 2, 4 e 7), nenhuma recusa`, r.status !== 422 && r.rejeitado === null && corrigidas.length === 3 && recusas.length === 0)
  checa('cada correção usa persona × fator e nunca passa de 0,94 × 1,10 = 1,034 (voz natural)', corrigidas.every((s) => s.speed > 0.94 && s.speed <= 0.94 * 1.1 + 1e-9))
  const idx = r.measured.map((m) => m.sceneIdx)
  checa('ordem das cenas intacta e cada fala é o TEXTO ORIGINAL da cena (nenhuma palavra cortada)', idx.join(',') === '0,1,2,3,4,5,6' && r.measured.every((m) => m.text === pending[m.sceneIdx].text))
  checa('as 3 cenas corrigidas apontam para o áudio novo; as outras 4 ficam com o áudio da medição', r.measured.filter((m) => m.url !== 'https://voz/0.94.mp3').map((m) => m.sceneIdx + 1).join(',') === '2,4,7')
  checa('toda fala cabe no clipe e NENHUMA cena passa da própria footage (o clipe nunca recomeça)', r.measured.every((m) => m.dur <= clips[m.sceneIdx].seconds + 0.01) && clips.every((c, i) => c.seconds <= SECS[i] + 1e-9))
  checa('H3: nenhuma cena encolheu abaixo do plano (KINEO-H3-DURACAO intacto)', clips.every((c, i) => c.seconds >= SECS[i] - 1e-9))
}

console.log('== (c) estouro grande NÃO é acelerado: a recusa honesta continua ==')
{
  const words = [...WORDS]; words[2] = 30 // 30 palavras em 10 s: 13,9 s + 0,6 → ×1,45
  const { ctx, sinteses, recusas } = mundo({ words })
  const r = await montar(fatia)(ctx)
  const corrigidas = sinteses.slice(7)
  checa(`estouro de 45 % na cena 3: ela NÃO é re-sintetizada (${corrigidas.length} correções, só as pequenas), e o filme é recusado com scene_speech_exceeds_footage + estorno`, corrigidas.length === 3 && !corrigidas.some((s) => wordsOf(s.text) === 30) && r.status === 422 && r.rejeitado?.reason === 'scene_speech_exceeds_footage' && recusas.length === 1)
}

console.log('== (d) re-síntese que falha ou não melhora mantém o original ==')
{
  let n = 0
  const { ctx, recusas } = mundo({ synth: async ({ text, speed }) => { n++; if (n > 7) throw new Error('tts down'); return Buffer.from(JSON.stringify({ dur: Math.round((wordsOf(text) / (2.3 * speed)) * 1000) / 1000, speed })) } })
  const r = await montar(fatia)(ctx)
  // KINEO-FALA-ATRAVESSA-O-CORTE-2026-09-25: até 24/09 este caso terminava em 422. Os estouros aqui são de 0,03-0,10 s e as
  // vizinhas têm cauda/cabeça de sobra: a fala atravessa o corte (J-cut) e o filme pago segue — a recusa só fica para quem
  // não tem de onde tirar (test-h3-fala-atravessa-o-corte, casos d/e).
  checa('TTS fora na correção → sem crash, original mantido, e a fala atravessa o corte em vez de recusar o filme pago', r.status !== 422 && recusas.length === 0 && r.measured.every((m) => m.url === 'https://voz/0.94.mp3') && r.janelas && [...r.janelas.values()].some((w) => w.antecipa > 0 || w.avanca > 0))
  const w2 = mundo({ synth: async ({ text, speed }) => Buffer.from(JSON.stringify({ dur: Math.round((wordsOf(text) / (2.3 * 0.94)) * 1000) / 1000, speed })) }) // ignora a velocidade: não melhora
  const r2 = await montar(fatia)(w2.ctx)
  checa('correção que não encurta a fala é descartada (dur ≥ original) → a fala atravessa o corte (sem recusa)', r2.status !== 422 && w2.recusas.length === 0 && r2.measured.every((m) => m.dur <= (r2.janelas?.get(m.sceneIdx)?.endCap ?? 0) - (r2.janelas?.get(m.sceneIdx)?.time ?? 0) + 0.01))
}

console.log('== (f) a cena 1 do a791cb45 (15/09 19:29Z): 8,2 s de fala num clipe de 8 s ==')
{
  // A 1ª versão media com respiro de 0,6 s e teto ×1,08: (8,2 + 0,6) / 8 = 1,10 → recusada depois de 3 correções boas.
  checa('aritmética do caso real: com 0,6 s de respiro a cena 1 dava ×1,10 (> 1,08, recusada); com 0,4 s dá ×1,075 (≤ 1,10, cabe)', Math.round((8.2 + 0.6) / 8 * 1000) / 1000 === 1.1 && Math.round((8.2 + 0.4) / 8 * 1000) / 1000 === 1.075)
  // 18 palavras a 2,162 pal/s = 8,33 s num clipe de 8 s → ×1,091: re-sintetizada uma vez a 0,94 × 1,091 = 1,026
  const w18 = [...WORDS]; w18[0] = 18
  const a = mundo({ words: w18 })
  const ra = await montar(fatia)(a.ctx)
  const corrA = a.sinteses.slice(7)
  checa(`cena 1 com 8,33 s de fala em 8 s (×1,091): re-sintetizada (${corrA.length} correções no total), filme segue, velocidade ≤ 1,034`, ra.status !== 422 && corrA.length === 4 && corrA.every((s) => s.speed <= 0.94 * 1.1 + 1e-9) && ra.measured.every((m) => m.dur <= a.clips[m.sceneIdx].seconds + 0.01))
  // 19 palavras = 8,79 s + 0,4 = 9,19 s → ×1,149 > 1,10. KINEO-FALA-ATRAVESSA-O-CORTE-2026-09-25: a ×1,10 a fala vira
  // 7,99 s e CABE (sobra −0,01 s ≤ folga das vizinhas) → a cena é acelerada até o teto natural e o filme segue; até 24/09
  // era recusa honesta (o compose pulava a correção e o 422 vinha depois de pagar 7 clipes).
  const w19 = [...WORDS]; w19[0] = 19
  const b = mundo({ words: w19 })
  const rb = await montar(fatia)(b.ctx)
  checa('cena 1 com 8,79 s em 8 s (×1,149): acelerada até ×1,10 (0,94 × 1,1 = 1,034), a fala cabe e o filme segue', rb.status !== 422 && b.recusas.length === 0 && b.sinteses.slice(7).some((s) => wordsOf(s.text) === 19 && Math.abs(s.speed - 0.94 * 1.1) < 1e-9) && rb.measured[0].dur <= 8 + 0.01)
}

console.log('== (e) cena que já cabe não é tocada ==')
{
  const { ctx, sinteses } = mundo({ words: [15, 24, 20, 22, 18, 20, 21] })
  const r = await montar(fatia)(ctx)
  checa('nenhum estouro → 7 sínteses apenas, sem correção, sem recusa', r.status !== 422 && sinteses.length === 7)
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
