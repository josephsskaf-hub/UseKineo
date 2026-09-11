// KINEO-SILENCIO-NA-CENA-2026-09-11 — guardião da régua de silêncio DENTRO da cena.
//
// Aprovado pelo fundador em 11/09 ("está aprovado, pode fazer"). O portão só
// media cena SEM texto; o canário do faroleiro (Kling 3) passou com mute 0 e
// saiu com ~17,5 s sem narração — uma cena de 4 s carregava "I didn't" (2
// palavras). Agora: (1) frase curta não abre cena própria; (2) silêncio por
// cena = segundos − palavras ÷ wps, reprova >1,5 s numa cena ou >8 s no total,
// no render PAGO (estorna e diz quantas palavras faltam) e no dry-run de $0.
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
const roda = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp }); return exp }

console.log('== a régua, executada ==')
const T = roda(rd('lib/cinematic/timelineContract.ts'))
checa('constantes: 1,5 s por cena, 8 s no total', T.SILENCE_SCENE_MAX_SECONDS === 1.5 && T.SILENCE_TOTAL_MAX_SECONDS === 8)
checa('cena de 4 s com "I didn\'t" (2 palavras) = 3,1 s calada', T.sceneSilenceSeconds({ type: 'support', seconds: 4, voiceover: "I didn't." }, 2.3) === 3.1)
checa('cena de 10 s com 23 palavras = 0 s calada', T.sceneSilenceSeconds({ type: 'support', seconds: 10, voiceover: Array(23).fill('word').join(' ') }, 2.3) === 0)
checa('cena de diálogo mede pela fala (dialogueLine), não pelo voiceover', T.sceneSilenceSeconds({ type: 'dialogue', seconds: 5, dialogueLine: 'ten words here to fill five seconds of speech ok', voiceover: '' }, 2.3) === 0.7)
checa('cena sem texto = toda muda', T.sceneSilenceSeconds({ type: 'support', seconds: 6, voiceover: '' }, 2.3) === 6)
{
  // o plano REAL do canário (claim 6a000eb0): 8 cenas, uma delas curta
  const plano = [
    { type: 'support', seconds: 8, voiceover: 'My name is Tomás, and I was the last lighthouse keeper on Ilha das Cabras.' },
    { type: 'support', seconds: 4, voiceover: "I didn't." },
    { type: 'support', seconds: 12, voiceover: 'Every night for thirty years I climbed the ninety-two steps and lit the lamp by hand, because one fishing boat still came home this way.' },
    { type: 'support', seconds: 12, voiceover: 'People in the village said I was stubborn. Maybe. But a light is a promise, and I don\'t break promises. Storms came. The stairs cracked.' },
  ]
  const r = T.planSilenceReport(plano, 2.3)
  checa('o plano do canário REPROVA na cena 2 (3,1 s > 1,5 s)', r.ok === false && r.worstScene === 2 && r.worst === 3.1)
  checa('diz quantas palavras faltam (total × wps, arredondado para cima)', r.wordsToAdd === Math.ceil(r.total * 2.3) && r.wordsToAdd > 0)
  const bom = plano.map((s, i) => i === 1 ? { ...s, seconds: 2 } : s)
  const r2 = T.planSilenceReport(bom, 2.3)
  checa('o mesmo plano com a cena curta em 2 s PASSA', r2.ok === true && r2.wordsToAdd === 0)
  checa('total > 8 s reprova mesmo sem cena acima de 1,5 s', T.planSilenceReport(Array(8).fill({ type: 'support', seconds: 5, voiceover: Array(9).fill('w').join(' ') }), 2.3).ok === false && T.planSilenceReport(Array(7).fill({ type: 'support', seconds: 5, voiceover: Array(9).fill('w').join(' ') }), 2.3).ok === true)
}

console.log('== a rota: frase curta não abre cena, portão pago, dry-run ==')
const rt = rd('app/api/generate-video-cinematic/route.ts')
checa('frase de < 5 palavras é absorvida no bloco atual mesmo passando da cota', /if \(chunk\.length > 0 && \(w \+ nw > capWords\(sc\) \|\| \(w >= share && nw >= 5\)\)\) break/.test(rt))
checa('rota importa a régua', /import \{ fitCinematicPlanFloor, planSilenceReport, SILENCE_SCENE_MAX_SECONDS, SILENCE_TOTAL_MAX_SECONDS \} from '@\/lib\/cinematic\/timelineContract'/.test(rt))
checa('portão pago: roda depois do portão de duração e antes das âncoras (nada foi pago ainda)', (() => { const a = rt.indexOf("reason: 'plan_duration_below_request'"); const b = rt.indexOf("const silence = planSilenceReport(plan.scenes, 2.3)\n        if (!silence.ok)"); const c = rt.indexOf('let anchors: HollywoodAnchors | null = null'); return a > 0 && b > a && c > b })())
checa('portão pago: estorna, libera o claim e responde 422 com o motivo', /releaseBirthClaim\('plan_silence_inside_scenes'\)/.test(rt) && /reason: 'plan_silence_inside_scenes',/.test(rt) && /\}, \{ status: 422 \}\)\n\s+\}\n\s+\}\n\s+let anchors/.test(rt))
checa('portão pago: a mensagem diz a cena, os segundos e quantas palavras faltam', /Scene \$\{silence\.worstScene\} would sit \$\{silence\.worst\.toFixed\(1\)\} seconds with no narration/.test(rt) && /Add about \$\{silence\.wordsToAdd\} more words, or choose a shorter length/.test(rt))
checa('portão pago: grava plan_silence_rejected com per_scene e words_to_add', /name: 'plan_silence_rejected'/.test(rt) && /per_scene: silence\.perScene, words_to_add: silence\.wordsToAdd/.test(rt))
checa('dry-run: mesma régua, campos por cena e veredito', /silence_inside_scenes_seconds: silence\.total,\n\s+silence_worst_scene: silence\.worstScene,/.test(rt) && /preflightProblems\.length === 0 && silence\.ok\n/.test(rt) && /FAIL — cena \$\{silence\.worstScene\} fica \$\{silence\.worst\}s sem fala/.test(rt))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
