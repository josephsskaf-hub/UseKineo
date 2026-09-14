// KINEO-FALA-MAIOR-QUE-A-CENA-2026-09-13 — guardião do caso do fundador no H3.
//
// e26160a2 (13/09 22:34): 225 palavras verbatim, 9 cenas prontas em 9 min,
// US$ 5,56 na fal, e o compose recusou (scene_speech_exceeds_footage): o laço
// de sobra parava em 9 cenas e colava 61 palavras (22 s) num clipe de 12 s.
// O dry-run dizia PASS porque só media silêncio. Agora: até 12 cenas, sobra
// distribuída onde há espaço, recusa ANTES do POST, e o dry-run mede excesso.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const r = rd('app/api/generate-video-cinematic/route.ts')
checa('teto de cenas verbatim é constante (12), não 9 cravado', /const MAX_VERBATIM_SCENES = 12/.test(r) && /while \(si < sentences\.length && plan\.scenes\.length < MAX_VERBATIM_SCENES\) \{/.test(r) && !/plan\.scenes\.length < 9\) \{/.test(r))
checa('a sobra entra frase a frase na ÚLTIMA cena narrada (14/09: nunca para trás — auditoria item 2), teto = segundos × 2,3', /const capW = Math.floor(capSecs * 2.3)/.test(r) && /while (si < sentences.length && wordsIn(ultima.voiceover ?? '') + wordsIn(sentences[si]) <= capW)/.test(r))
checa('o que não coube vira verbatimOverflowWords, declarado fora do bloco', /let verbatimOverflowWords = 0/.test(r) && /verbatimOverflowWords = sentences\.slice\(si\)\.reduce/.test(r))
const iRecusa = r.indexOf("if (verbatimOverflowWords > 0) {")
const iFloor = r.indexOf('plan.scenes = fitCinematicPlanFloor(plan.scenes, duration, SCENE_CAP)')
const iSubmit = r.indexOf('await submitToFalWithOneRetry(') // a CHAMADA no laço hollywood, não a definição da função
checa('a recusa vem antes do piso de duração e antes de qualquer POST pago, com estorno', iRecusa > 0 && iRecusa < iFloor && iFloor < iSubmit && /releaseBirthClaim\('script_too_long_for_engine_no_charge'\)/.test(r))
checa('a recusa diz o teto em palavras e não é retryable', /reason: 'script_too_long_for_engine', script_words: scriptWordsVerbatim, max_words: maxWords, retryable: false/.test(r) && /Math\.floor\(MAX_VERBATIM_SCENES \* SCENE_CAP \* 2\.3\)/.test(r))
checa('a recusa deixa rastro (narration_guard_blocked reason script_too_long_for_engine)', /reason: 'script_too_long_for_engine', engine: body\.engine \?\? 'hollywood'/.test(r))
checa('o dry-run mede excesso de fala por cena (o inverso da régua de silêncio)', /if \(\(r\.seconds \?\? 0\) > 0 && fala > \(r\.seconds \?\? 0\) \+ 1\) preflightProblems\.push\(`cena \$\{r\.scene\}: \$\{r\.words\} palavras/.test(r))
// aritmética do caso: 225 palavras a 2,3 pal/s = 98 s; 12 cenas × 12 s = 144 s de teto → cabe; 9 × 12 = 108 com sobra colada era o defeito
checa('aritmética: 225 palavras cabem em 12 cenas de 12 s (teto 331 palavras); 400 palavras não cabem', Math.floor(12 * 12 * 2.3) === 331 && 225 <= 331 && 400 > 331)

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
