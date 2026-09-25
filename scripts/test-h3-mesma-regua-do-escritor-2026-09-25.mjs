// KINEO-MESMA-REGUA-DO-ESCRITOR-2026-09-25 — render H3 7127d8b4 (fundador, 25/09 17:18Z, furacão Polo, roteiro pronto de
// 191 palavras, 60 s, verbatim): a cena 7 (22 palavras) nasceu com 11 s; a apara do respiro do C1 (KINEO-APARA-RESPIRO)
// mediu a folga A 2,3 PAL/S FIXO (1,43 s) e tirou 1 s — a voz pinada (luxury-narrator 0,9) fala a 2,07 (folga real 0,37 s).
// A montagem mediu 10,9 s num clipe de 10 s e recusou o filme depois de pagar 12 clipes. Quatro réguas para a mesma fala:
// a mais frouxa decidia primeiro. Este guardião executa a fatia real do C1 (apara → FRASE-MAIOR) e prova:
//   (a) origin/main reproduz a apara a 2,3 (cena 7: 11 → 10 s) — falha herdada por nome;
//   (b) candidato: a cena 7 fica com 11 s e toda cena narrada guarda a fala inteira no ritmo da voz (fuzz 300 planos);
//   (c) espelhos: a conta de ritmoC1 == a de ritmoVoz; o ensaio de $0 decide como a montagem (cabeNaMontagem) — EXECUTADO
//       contra a fatia real do compose com os mesmos planos (revisão adversarial de 25/09: constantes iguais não são decisão igual).
// A parte da montagem (a fala atravessa o corte) e da tela vive em scripts/test-h3-fala-atravessa-o-corte-2026-09-25.mjs.
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
let rotaMain = null
try { rotaMain = execFileSync('git', ['show', 'origin/main:app/api/generate-video-cinematic/route.ts'], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n') } catch {}

const planner = rd('app/api/generate-video-cinematic/route.ts')
const compose = rd('app/api/compose/route.ts')
const WORDS = [7, 19, 12, 22, 15, 19, 22, 16, 9, 21, 12, 13] // as 12 narrações do Polo
const PERSONA = { personaId: 'luxury-narrator', voice: 'alloy', defaultSpeed: 0.9 }
const RITMO = 2.3 * 0.9

console.log('== espelhos e âncoras ==')
{
  const corpo = (src, ini, fim) => { const a = src.indexOf(ini); const b = src.indexOf(fim, a); return a < 0 || b < a ? null : src.slice(a + ini.length, b).split('\n').map((l) => l.trim()).filter(Boolean).join('\n') }
  const espelhoC1 = corpo(planner, '// ═══ MIRROR: ritmoDaVoz ═══', '// ═══ END MIRROR: ritmoDaVoz ═══')
  const original = corpo(planner, '      const ritmoVoz = (() => {', '      })()')
  checa('MIRROR ritmoDaVoz: a conta do C1 (ritmoC1) é idêntica à de ritmoVoz (2,3 × velocidade da persona, 0,85-1,1)', Boolean(espelhoC1) && Boolean(original) && espelhoC1.replace(/^const ritmoC1 = \(\(\) => \{\n/, '').replace(/\n\}\)\(\)$/, '') === original)
  checa('a apara do respiro do C1 mede no ritmo da voz (não mais a 2,3 fixo)', planner.includes("const silencio = (sc: PlanScene) => (sc.seconds || 0) - wordsIn((sc.type === 'dialogue' ? sc.dialogueLine : sc.voiceover) ?? '') / ritmoC1") && !planner.includes("const silencio = (sc: PlanScene) => (sc.seconds || 0) - wordsIn((sc.type === 'dialogue' ? sc.dialogueLine : sc.voiceover) ?? '') / 2.3"))
  checa('FRASE-MAIOR: a cena cresce até a fala inteira no ritmo da voz; acima do teto o teto-rede divide; a conta da sobra (2,3) continua', planner.includes('const precisaNoRitmo = Math.ceil(palavras / ritmoC1)') && planner.includes('if (palavras > 0 && palavras / ritmoC1 > (sc.seconds || 0)) sc.seconds = Math.max(sc.seconds || 0, Math.min(teto, precisaNoRitmo))') && /if \(fala > \(sc\.seconds \|\| 0\) \+ 1\) verbatimOverflowWords \+= /.test(planner))
  checa('as aparas no ritmo da voz (APARA-NO-RITMO e apara final) ficam como a rotação de 23/09 deixou (> 1,0 s)', planner.includes('mudoDe(sc) > 1.0)') && planner.includes('mudoFinal(sc) > 1.0)'))
  const respiro = planner.match(/const RESPIRO_MONTAGEM_S = ([\d.]+)/)?.[1], acel = planner.match(/const ACELERA_MAX_MONTAGEM = ([\d.]+)/)?.[1]
  const respiroC = compose.match(/const FALA_CABE_RESPIRO_S = ([\d.]+)/)?.[1], acelC = compose.match(/const FALA_CABE_MAX_FATOR = ([\d.]+)/)?.[1]
  checa(`ensaio de $0 espelha a montagem: respiro ${respiro} == ${respiroC}, aceleração máxima ${acel} == ${acelC}, no ritmo da voz, decisão em cabeNaMontagem`, respiro === respiroC && acel === acelC && planner.includes('const fala = r.words / ritmoVoz') && planner.includes('// ═══ MIRROR: cabeNaMontagem ═══') && planner.includes('!cabeNaMontagem(fala, r.seconds ?? 0)'))
}

console.log('== (a)+(b) a fatia real do C1 (apara do respiro → FRASE-MAIOR) com o plano do Polo ==')
const C1_INI = '          // ═══ KINEO-MESMA-REGUA-DO-ESCRITOR-2026-09-25 — o C1 mede no passo da voz que VAI falar ═══'
const C1_INI_MAIN = "          {\n            const silencio = (sc: PlanScene) => (sc.seconds || 0) - wordsIn((sc.type === 'dialogue' ? sc.dialogueLine : sc.voiceover) ?? '') / 2.3"
const C1_FIM = '            if (fala > (sc.seconds || 0) + 1) verbatimOverflowWords += Math.ceil((fala - (sc.seconds || 0) - 1) * 2.3)\n          }'
const fatiaC1De = (src, ini) => { const a = src.indexOf(ini); const b = src.indexOf(C1_FIM, a); return a < 0 || b < a ? null : src.slice(a, b + C1_FIM.length) }
const montarC1 = (f) => roda(`export function rodar(ctx: any) {\n  const { plan, wordsIn, sceneNarrationsForPlan, resolveHollywoodVoice, prompt, hollywoodLanguage, hollywoodVertical, DIALOGUE_CAP, SCENE_CAP, console } = ctx\n  let verbatimOverflowWords = 0\n${f}\n  return { plan, verbatimOverflowWords }\n}`).rodar
const nascido = (w) => Math.max(4, Math.min(12, Math.round(w / 2.3) + 1)) // como o C1 dimensiona a cena verbatim
const planoDe = (words, speed = 0.9) => ({
  plan: { scenes: words.map((w, i) => ({ index: i + 1, type: 'support', seconds: nascido(w), voiceover: frase(w, `s${i + 1}_`), needsNarration: true })), characterSheet: null },
  wordsIn: wordsOf, sceneNarrationsForPlan: (scenes) => scenes.map((sc) => sc.voiceover ?? null), resolveHollywoodVoice: () => ({ ...PERSONA, defaultSpeed: speed }),
  prompt: 'On Sunday it was barely a storm.', hollywoodLanguage: 'en', hollywoodVertical: 'science', DIALOGUE_CAP: 15, SCENE_CAP: 12, console: { log: () => {}, warn: () => {} },
})
const fc1 = fatiaC1De(planner, C1_INI)
checa('fatia do C1 (apara do respiro → FRASE-MAIOR) existe no planejador', Boolean(fc1))
checa(`o plano nasce como no render: cena 7 com ${nascido(22)} s para 22 palavras e ${WORDS.reduce((a, w) => a + nascido(w), 0)} s no total`, nascido(22) === 11)
{
  const fm = rotaMain ? fatiaC1De(rotaMain, C1_INI_MAIN) : null
  if (fm && !rotaMain.includes('KINEO-MESMA-REGUA-DO-ESCRITOR-2026-09-25')) {
    const r = montarC1(fm)(planoDe(WORDS))
    checa(`main: a apara a 2,3 pal/s tira 1 s da cena 7 (11 → ${r.plan.scenes[6].seconds} s) — a voz a 2,07 precisa de 10,63 s: é o estouro do 7127d8b4`, r.plan.scenes[6].seconds === 10 && 22 / RITMO > r.plan.scenes[6].seconds)
  } else {
    checa('reprodução da apara na main pulada (origin/main já traz a régua do escritor, ou git indisponível)', true)
  }
  const r = montarC1(fc1)(planoDe(WORDS))
  const cabe = (sc) => wordsOf(sc.voiceover) / RITMO <= sc.seconds + 1e-9
  checa(`candidato: a cena 7 fica com ${r.plan.scenes[6].seconds} s (≥ 11) e TODAS as 12 cenas guardam a fala inteira a 2,07 pal/s`, r.plan.scenes[6].seconds >= 11 && r.plan.scenes.every(cabe) && r.verbatimOverflowWords === 0)
  checa('nenhuma palavra mexida, ordem intacta, nenhuma cena abaixo de 4 s ou acima do teto', r.plan.scenes.map((sc) => wordsOf(sc.voiceover)).join(',') === WORDS.join(',') && r.plan.scenes.every((sc) => sc.seconds >= 4 && sc.seconds <= 12))
  const rN = montarC1(fc1)(planoDe(WORDS, 1.0))
  checa('voz neutra (1,0 → 2,3 pal/s): a mesma fatia continua aparando o respiro (não é uma régua mais frouxa, é a mesma régua no ritmo certo)', rN.plan.scenes.reduce((a, sc) => a + sc.seconds, 0) < WORDS.reduce((a, w) => a + nascido(w), 0) && rN.plan.scenes.every((sc) => wordsOf(sc.voiceover) / 2.3 <= sc.seconds + 1e-9))
}

console.log('== fuzz do C1: 300 roteiros prontos, 6-12 cenas, vozes 0,85-1,1 ==')
{
  let seed = 7127
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  let n = 0, ruins = []
  for (let k = 0; k < 300; k++) {
    const nCenas = 6 + Math.floor(rnd() * 7)
    const words = Array.from({ length: nCenas }, () => 6 + Math.floor(rnd() * 21))
    const speed = r3(0.85 + rnd() * 0.25)
    const ritmo = Math.round(2.3 * speed * 100) / 100
    const r = montarC1(fc1)(planoDe(words, speed))
    n++
    const invariante = r.plan.scenes.every((sc) => wordsOf(sc.voiceover) / ritmo <= sc.seconds + 1e-9 || sc.seconds >= 12)
    const intacto = r.plan.scenes.map((sc) => wordsOf(sc.voiceover)).join(',') === words.join(',') && r.plan.scenes.every((sc) => sc.seconds >= 4 && sc.seconds <= 12)
    if (!invariante || !intacto) ruins.push({ k, speed, secs: r.plan.scenes.map((sc) => sc.seconds), words })
  }
  checa(`fuzz: ${n}/300 planos saem com toda cena guardando a fala inteira no ritmo da voz (ou no teto de 12 s, onde o teto-rede divide), palavras e ordem intactas` + (ruins.length ? ' ' + JSON.stringify(ruins[0]) : ''), n === 300 && ruins.length === 0)
}

console.log('== (d) EXECUTADO: o ensaio decide como a montagem — mesmos planos nos dois lados ==')
{
  const corpo = (src, ini, fim) => { const a = src.indexOf(ini); const b = src.indexOf(fim, a); return a < 0 || b < a ? null : src.slice(a + ini.length, b) }
  const espelho = corpo(planner, '// ═══ MIRROR: cabeNaMontagem ═══', '// ═══ END MIRROR: cabeNaMontagem ═══')
  checa('MIRROR cabeNaMontagem existe no ensaio', Boolean(espelho))
  const { cabeNaMontagem } = roda(`export function fabrica() {\n${espelho}\n  return { cabeNaMontagem }\n}`).fabrica()
  // a fatia real do compose (medição → FALA-CABE → encolhe/cresce → TAIL → travessia → recusa), como em test-h3-fala-atravessa-o-corte
  const INI = '      const measured: Array<{ sceneIdx: number; url: string; dur: number; text: string; words?: WhisperWord[] }> = []'
  const FIM = "          qualityCheckFailed: true, reason: 'scene_speech_exceeds_footage', retryable: false, generationId,\n        }, { status: 422 }))\n      }"
  const PARAMS = ['pendingScenes', 'hollywoodPinnedVoice', 'synthesizeHostSpeech', 'explicitSpeed', 'estimateMp3DurationSeconds', 'transcribeTTSWithTimestamps', 'verifyObservedSpeech', 'uploadVoiceoverToSupabase', 'user', 'rejectBeforeProviderSubmission', 'NextResponse', 'hollywoodClips', 'quality', 'trimNarratedSupport', 'duration', 'secondsOf', 'originalFootageSeconds', 'generationId', 'console', 'logComposeRefusal', 'authenticatedUserId']
  const a = compose.indexOf(INI), b = compose.indexOf(FIM, a)
  checa('fatia do compose existe', a >= 0 && b > a)
  const montarCompose = roda(`export async function rodar(ctx: any) {\n  const { ${PARAMS.join(', ')} } = ctx\n  const composeCtx = ctx.composeCtx ?? { stage: '' }\n${compose.slice(a, b + FIM.length)}\n  return { measured, status: 200 }\n}`).rodar
  // mundo: [diálogo 10 s, apoio S s com a fala F, diálogo 10 s] — vizinhas de voz nativa: a travessia não tem de onde tirar
  const decideCompose = async (F, S) => {
    const clips = [{ engine: 'dialogue', seconds: 10, url: 'https://fal/1.mp4' }, { engine: 'support', seconds: S, url: 'https://fal/2.mp4' }, { engine: 'dialogue', seconds: 10, url: 'https://fal/3.mp4' }]
    const ctx = {
      pendingScenes: [{ sceneIdx: 1, text: 'fala da cena dois' }], hollywoodPinnedVoice: PERSONA, explicitSpeed: null,
      synthesizeHostSpeech: async ({ speed }) => Buffer.from(JSON.stringify({ dur: r3(F / (speed / PERSONA.defaultSpeed)), speed })),
      estimateMp3DurationSeconds: (buf) => JSON.parse(buf.toString()).dur, transcribeTTSWithTimestamps: async () => [], verifyObservedSpeech: () => ({ ok: false }),
      uploadVoiceoverToSupabase: async () => 'https://voz/x.mp3', user: { id: 'u1' }, rejectBeforeProviderSubmission: async (r) => r,
      NextResponse: { json: (body, init) => ({ rejeitado: body, status: init?.status ?? 200 }) }, hollywoodClips: clips, quality: 'cinematic_h3',
      trimNarratedSupport: (_c, i) => clips[i].seconds, duration: 30, secondsOf: (c) => c.seconds, originalFootageSeconds: clips.map((c) => c.seconds),
      generationId: 'g1', console: { log: () => {}, warn: () => {} }, logComposeRefusal: async () => {}, authenticatedUserId: 'u1',
    }
    const r = await montarCompose(ctx)
    return r.status !== 422
  }
  let seed = 2207, n = 0, iguais = 0, divergem = []
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  const casos = [[10.63, 10], [10.6, 10], [11.0, 10], [11.01, 10], [9.6, 10], [9.61, 10], [4.4, 4], [4.41, 4], [13.2, 12], [13.21, 12]]
  for (let k = 0; k < 240; k++) { const S = 4 + Math.floor(rnd() * 9); casos.push([r3(S * (0.6 + rnd() * 0.7)), S]) }
  for (const [F, S] of casos) {
    n++
    const ensaio = cabeNaMontagem(F, S)
    const montagem = await decideCompose(F, S)
    if (ensaio === montagem) iguais++; else divergem.push({ F, S, ensaio, montagem })
  }
  checa(`${iguais}/${n} planos: o ensaio de $0 (cabeNaMontagem) decide EXATAMENTE como a fatia real do compose quando as vizinhas não cedem (fronteiras 10,6/11,0 s em 10 s; 4,4 s em 4 s; 13,2 s em 12 s)` + (divergem.length ? ' ' + JSON.stringify(divergem[0]) : ''), n === casos.length && divergem.length === 0)
  checa('a cena 7 do Polo (22 palavras a 2,07 = 10,63 s em 10 s) CABE para o ensaio e para a montagem (acelera a ×1,10) — o conserto do C1 é não deixar a cena precisar disso', cabeNaMontagem(22 / RITMO, 10) === true)
  checa('17 palavras em 7 s a 2,07 (8,2 s, ×1,17): a régua antiga aprovava (7,4 s ≤ 8 s a 2,3) e a nova reprova, como a montagem', !cabeNaMontagem(17 / RITMO, 7) && (17 / 2.3 <= 7 + 1))
}

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
