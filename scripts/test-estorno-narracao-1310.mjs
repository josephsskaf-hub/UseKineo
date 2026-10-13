// KINEO-ESTORNO-NARRACAO-2026-10-13 — guardião do conserto "narração falhou depois do débito e o crédito ficou preso".
//
// O caso (13/10 10:28–10:29 UTC, conta region_paid_only, Seedance 15 s, filme grátis de região de 9 cr, render
// cinematic-aee83c6e) e o irmão (11/10 12:53 UTC, cinematic-a9159832): o roteiro só tinha letra latina MAIÚSCULA
// ("CEO" no meio do urdu; "AI COPILOT"). O saneador estrito come a linha como "cabeçalho em MAIÚSCULAS"; o /api/compose
// resgatava pelo tolerante, mas generateTTS re-saneava pelo estrito → input '' → OpenAI 400 string_too_short → 502
// "Voiceover generation failed" DETERMINÍSTICO (o cron repetiu 2× e levou o mesmo). E esse 502 só soltava o mutex: o débito
// do nascimento ficava vivo até a varredura de 100 min.
//
// Prova, EXECUTANDO o código real pelo carregador offline (OpenAI de mentira, nada de rede):
//   (1) o defeito existe no saneador estrito (urdu+CEO e AI COPILOT viram '') e o tolerante devolve o texto;
//   (2) generateTTS manda à OpenAI o texto NÃO vazio nos dois casos reais, e texto que o estrito aceita sai byte a byte igual;
//   (3) generateTTS nunca chama a OpenAI com '' (lança antes);
//   (4) resolveTtsVoiceIdentity (chave do cache de voz) usa a mesma escada;
//   (5) /api/compose: as duas recusas de narração do caminho clássico levam code 'cinematic_voice_unavailable' SÓ com débito
//       upstream AMARRÁVEL (narracaoNoFinalizador: débito upstream e custo do nascimento == custo do claim do compose —
//       resgate com custo antigo e Estrela com sobretaxa ficam no 502 de sempre, que a varredura de 100 min estorna), e esse code cai em rejectCinematicQuality (estorno idempotente + claim liberado);
//       sem débito upstream a resposta é a de sempre;
//   (6) o finalizador estorna pelo RPC idempotente (refundRenderCredits) e aceita 'scene_narration_failed';
//   (7) filme grátis de região: a trava conta débito cinematic-* NÃO estornado — estornado, o direito volta;
//   (8) mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Nenhum import com alias @/ no guardião (readFileSync + carregador offline).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const F = {
  PARSER: 'lib/scriptParser.ts',
  COMPOSE_LIB: 'lib/compose.ts',
  ROUTE: 'app/api/compose/route.ts',
  QUALITY: 'lib/cinematic/qualityRejection.ts',
  REGION: 'lib/freeFilmPolicy.ts',
}

// Os textos reais (o de 13/10 é o voiceover assinado no claim; o de 11/10 tinha 11 caracteres: "AI COPILOT" + 1).
const URDU = 'ایک امیر CEO اور غریب لڑکے کی دلچسپ کہانی! یونا، خوبصورت اور ذہین، کمپنی کی مغرور CEO ہے۔ حان جون اپنی اصل شناخت چھپائے رکھتا ہے۔ اس کے پاس ایک خفیہ فائل ہے... جو پوری کمپنی کی قسمت بدل سکتی ہے!'
const CAPS = 'AI COPILOT'
const NORMAL = 'The ocean hides a canyon deeper than Everest is tall. Nobody saw its floor until 1960.'

const src = (over, rel) => (over[rel] !== undefined ? over[rel] : read(rel))
const codeOnly = (t) => t.split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')
function fnBody(text, signature) {
  const i = text.indexOf(signature)
  if (i < 0) return ''
  const j = text.indexOf('\nexport ', i + signature.length)
  return text.slice(i, j < 0 ? undefined : j)
}

async function runChecks(over = {}, verbose = false) {
  const failed = []
  const check = (c, m) => { if (verbose) ok(c, m); if (!c) failed.push(m) }
  const calls = []
  const load = createOfflineLoader({
    mocks: {
      '@/lib/openai': {
        OPENAI_TTS_TIMEOUT_MS: 1, OPENAI_WHISPER_TIMEOUT_MS: 1, buildCaptionSegments: () => [], pickHighlightWord: () => '',
        openai: { audio: { speech: { create: async (b) => {
          calls.push(b.input)
          if (typeof b.input !== 'string' || b.input.length < 1) { const e = new Error('400 string_too_short'); e.status = 400; throw e }
          return { arrayBuffer: async () => new ArrayBuffer(8) }
        } } } },
      },
    },
    source: (rel, text) => (over[rel] !== undefined ? over[rel] : text),
  })

  // (1) o saneador
  let P = null
  try { P = load(F.PARSER) } catch (e) { check(false, `(1) scriptParser carrega offline: ${e.message}`) }
  if (P) {
    check(P.stripScriptMarkers(URDU) === '' && P.stripScriptMarkers(CAPS) === '', '(1) defeito reproduzido: o estrito come urdu+CEO e AI COPILOT (vira \'\')')
    check(P.salvageScriptNarration(URDU).length === URDU.length && P.salvageScriptNarration(CAPS) === CAPS, '(1) o tolerante devolve o texto inteiro (194 e 10 caracteres)')
  }

  // (2)(3)(4) generateTTS e a chave de cache, executados
  let C = null
  try { C = load(F.COMPOSE_LIB) } catch (e) { check(false, `(2) lib/compose carrega offline: ${e.message}`) }
  if (C && P) {
    const tts = async (t, vertical) => { calls.length = 0; try { const b = await C.generateTTS(t, 1, vertical, 'cinematic', 'en'); return { ok: b.length > 0, inputs: [...calls] } } catch (e) { return { ok: false, err: e.message, inputs: [...calls] } } }
    const u = await tts(URDU, 'drama')
    check(u.ok && u.inputs.length >= 1 && u.inputs.every((s) => s.length > 0) && u.inputs.join(' ').includes('CEO'), `(2) generateTTS(urdu+CEO) manda texto não vazio à OpenAI (${JSON.stringify(u.inputs.map((s) => s.length))}${u.err ? ' ' + u.err : ''})`)
    const c = await tts(CAPS, 'business')
    check(c.ok && c.inputs.length === 1 && c.inputs[0] === CAPS, `(2) generateTTS("AI COPILOT") manda "AI COPILOT" (${JSON.stringify(c.inputs)})`)
    const n = await tts(NORMAL, undefined)
    check(n.ok && n.inputs.length === 1 && n.inputs[0] === P.stripScriptMarkers(NORMAL), '(2) texto que o estrito aceita sai byte a byte igual (sem o tolerante)')
    const e = await tts('— VOICE —\nspeed: 1.1', undefined)
    check(!e.ok && e.inputs.length === 0, `(3) nada para narrar → lança ANTES de chamar a OpenAI (chamadas=${e.inputs.length})`)
  }
  const lib = codeOnly(src(over, F.COMPOSE_LIB))
  const gen = fnBody(lib, 'export async function generateTTS(')
  check(/const cleaned = stripScriptMarkers\(script\) \|\| salvageScriptNarration\(script\)/.test(gen), '(2) generateTTS: escada estrito → tolerante (mesma ordem do /api/compose)')
  check(gen.indexOf("throw new Error('TTS input is empty after sanitization')") > 0 &&
    gen.indexOf("throw new Error('TTS input is empty after sanitization')") < gen.indexOf('openai.audio.speech.create'), '(3) a trava de input vazio vem antes da primeira chamada à OpenAI')
  const ident = fnBody(lib, 'export function resolveTtsVoiceIdentity(')
  check(/const cleaned = stripScriptMarkers\(script\) \|\| salvageScriptNarration\(script\)/.test(ident), '(4) resolveTtsVoiceIdentity espelha a escada (mesma persona = mesma chave de cache)')

  // (5) /api/compose
  const route = src(over, F.ROUTE)
  const narr = route.indexOf("const planoB = await narrarPeloPlanoB(err, 'primary', inicioTts)")
  const blocoFalha = narr > 0 ? route.slice(narr, route.indexOf('ttsFallbackUsed = true', narr)) : ''
  check(/narracaoNoFinalizador \/\/ KINEO-ESTORNO-NARRACAO-2026-10-13\n\s*\? \{ error: 'Voiceover generation failed\. [^']*', code: 'cinematic_voice_unavailable' \}/.test(blocoFalha),
    '(5) TTS falhou com débito upstream → code cinematic_voice_unavailable (finalizador)')
  check(/:\s*\/\/ KINEO-ESTORNO-NARRACAO-2026-10-13\n\s*\{ error: 'Voiceover generation failed\. Please try again\.' \},\n\s*\{ status: 502 \}/.test(blocoFalha),
    '(5) sem débito upstream a resposta é a de sempre (502, mesma frase, sem code)')
  check(/'voiceover generation failed'/.test(read('app/(dashboard)/generate/GenerateClient.tsx')) && /error: 'Voiceover generation failed\./.test(blocoFalha),
    '(5) a frase nova começa igual: a tela segue classificando como voiceover_provider')
  const vazio = route.indexOf("console.error('[compose] TTS produced an empty buffer — refusing to upload.')")
  const blocoVazio = vazio > 0 ? route.slice(vazio, route.indexOf('\n    }\n', vazio)) : ''
  check(/narracaoNoFinalizador \/\/ KINEO-ESTORNO-NARRACAO-2026-10-13[^\n]*\n\s*\? \{ error: 'Voiceover generation returned no audio\.[^']*', code: 'cinematic_voice_unavailable' \}/.test(blocoVazio) &&
    /\{ error: 'Voiceover generation returned no audio\. Please try again\.' \}/.test(blocoVazio), '(5) TTS sem áudio: mesmo par (com débito → finalizador; sem → o de sempre)')
  check(/const narracaoNoFinalizador = cinematicUpstreamDebited && cinematicBirthClaim\?\.creditCost === creditCostForDuration\(quality, true, duration\) \/\/ KINEO-ESTORNO-NARRACAO-2026-10-13/.test(route) &&
    route.indexOf('const narracaoNoFinalizador') > 0 &&
    route.indexOf('const narracaoNoFinalizador') < route.indexOf("const planoB = await narrarPeloPlanoB(err, 'primary', inicioTts)"),
    '(5) só vai ao finalizador com débito upstream AMARRÁVEL (custo do nascimento == custo do claim do compose); senão o 502 de sempre')
  check(/cinematic_voice_unavailable: 'scene_narration_failed',/.test(route), '(5) o mapa de razões leva cinematic_voice_unavailable → scene_narration_failed')
  const rej = route.indexOf('async function rejectBeforeProviderSubmission(')
  const rejBody = rej > 0 ? route.slice(rej, route.indexOf('async function reserveFreeFastPreviewSlot', rej)) : ''
  check(/if \(reason && cinematicUpstreamDebited\) \{\n\s*const facts = await rejectCinematicQuality\(\{/.test(rejBody) &&
    /ownsComposeClaim: ownsSubmissionClaim, composeProviderAttempted, reason,/.test(rejBody), '(5) razão + débito upstream → rejectCinematicQuality com o mutex e o "nenhum POST ao Creatomate"')
  // A falha de TTS acontece ANTES do POST final: composeProviderAttempted só vira true no submit ao Creatomate.
  const ttsAt = route.indexOf("const planoB = await narrarPeloPlanoB(err, 'primary', inicioTts)")
  const classicSubmit = route.indexOf('composeProviderAttempted = true', ttsAt)
  check(ttsAt > 0 && classicSubmit > ttsAt, '(5) no caminho clássico o TTS roda antes de composeProviderAttempted = true')

  // (6) o finalizador
  const q = src(over, F.QUALITY)
  const reasonsSet = q.slice(q.indexOf('const REASONS: ReadonlySet<string> = new Set(['), q.indexOf('])', q.indexOf('const REASONS: ReadonlySet<string> = new Set([')))
  check(/'scene_narration_failed'/.test(reasonsSet) && /await refundRenderCredits\(billingReference\)/.test(q) &&
    /reason: RELEASE_REASON, reference: billingReference/.test(q), '(6) finalizador: scene_narration_failed aceito, estorno pelo RPC idempotente, claim liberado')

  // (7) filme grátis de região
  let R = null
  try { R = load(F.REGION) } catch (e) { check(false, `(7) freeFilmPolicy carrega: ${e.message}`) }
  if (R) {
    check(R.regionFreeFilmExclusive({ otherActiveHold: false, lifetimeCinematicDebits: 1 }) === false, '(7) débito cinematic NÃO estornado queima o direito (por isso a concessão à mão não devolvia o filme)')
    check(R.regionFreeFilmExclusive({ otherActiveHold: false, lifetimeCinematicDebits: 0 }) === true, '(7) estornado (refunded_at) → o direito volta')
  }
  return failed
}

console.log('— caminho real')
const realFailed = await runChecks({}, true)

function mutate(rel, from, to) {
  const orig = read(rel)
  if (!orig.includes(from)) return { applied: false }
  const next = orig.split(from).join(to)
  return { applied: next !== orig, over: { [rel]: next } }
}
const MUTANTS = [
  ['generateTTS volta ao estrito puro', F.COMPOSE_LIB, '  const cleaned = stripScriptMarkers(script) || salvageScriptNarration(script) // KINEO-ESTORNO-NARRACAO-2026-10-13\n', '  const cleaned = stripScriptMarkers(script)\n', /\(2\) generateTTS\(urdu/],
  ['generateTTS sem a trava de vazio', F.COMPOSE_LIB, "  if (!cleaned.trim()) throw new Error('TTS input is empty after sanitization')", '  if (false) throw new Error(\'\')', /\(3\) nada para narrar/],
  ['tolerante antes do estrito', F.COMPOSE_LIB, '  const cleaned = stripScriptMarkers(script) || salvageScriptNarration(script) // KINEO-ESTORNO-NARRACAO-2026-10-13\n', '  const cleaned = salvageScriptNarration(script) || stripScriptMarkers(script) // KINEO-ESTORNO-NARRACAO-2026-10-13\n', /\(2\) generateTTS: escada/],
  ['cache fora do espelho', F.COMPOSE_LIB, '  const cleaned = stripScriptMarkers(script) || salvageScriptNarration(script) // KINEO-ESTORNO-NARRACAO-2026-10-13 — espelho', '  const cleaned = stripScriptMarkers(script) // — espelho', /\(4\) resolveTtsVoiceIdentity espelha/],
  ['TTS falhou sem o code', F.ROUTE, "? { error: 'Voiceover generation failed. No film was assembled; see the credit details below. Your script is kept.', code: 'cinematic_voice_unavailable' }", "? { error: 'Voiceover generation failed. No film was assembled; see the credit details below. Your script is kept.' }", /\(5\) TTS falhou com débito/],
  ['code também sem débito upstream', F.ROUTE, "              { error: 'Voiceover generation failed. Please try again.' },", "              { error: 'Voiceover generation failed. Please try again.', code: 'cinematic_voice_unavailable' },", /\(5\) sem débito upstream/],
  ['sem áudio sem o code', F.ROUTE, "? { error: 'Voiceover generation returned no audio. No film was assembled; see the credit details below. Your script is kept.', code: 'cinematic_voice_unavailable' }", "? { error: 'Voiceover generation returned no audio. No film was assembled; see the credit details below. Your script is kept.' }", /\(5\) TTS sem áudio/],
  ['finalizador sem amarração de custo', F.ROUTE, 'const narracaoNoFinalizador = cinematicUpstreamDebited && cinematicBirthClaim?.creditCost === creditCostForDuration(quality, true, duration)', 'const narracaoNoFinalizador = cinematicUpstreamDebited', /\(5\) só vai ao finalizador/],
  ['mapa perde a voz', F.ROUTE, "        cinematic_voice_unavailable: 'scene_narration_failed',\n", '', /\(5\) o mapa de razões/],
  ['finalizador recusa narração', F.QUALITY, "'native_dialogue_unverified', 'scene_narration_missing', 'scene_narration_failed',\n])", "'native_dialogue_unverified', 'scene_narration_missing',\n])", /\(6\) finalizador/],
]
console.log('— mutantes')
for (const [name, rel, from, to, expect] of MUTANTS) {
  const m = mutate(rel, from, to)
  ok(m.applied, `mutante aplicou: ${name}`)
  if (!m.applied) continue
  const failed = await runChecks(m.over)
  ok(failed.some((f) => expect.test(f)), `mutante fica vermelho: ${name} → [${failed.slice(0, 3).join(' | ')}]`)
}

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail === 0 && realFailed.length === 0 ? 0 : 1)
