// KINEO-PORTA-FORMATO-2026-09-24 — guardião da porta do formato colado no Kineo 1 (fundador: "vai", trava 8.2
// liberada nominalmente para esta porta). Medido em 30 d antes: 22 recusas "Prompt is too long (5000 chars max)" de
// 4 pessoas e 14 recusas "shot plan" de 3 pessoas, todas com texto colado do ChatGPT (coorte que paga 3×).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const num = (src, name) => Number((src.match(new RegExp(`${name}\\s*=\\s*(\\d+)`)) || [])[1])

const rota = rd('app/api/generate-video-fast/route.ts')
const limites = rd('lib/analyzeLimits.ts')
const jobs = rd('lib/renderJobs.ts')

// 1. teto por modo, da fonte única — nunca mais 5000 cravado na rota
checa('a rota lê o teto de analyzePromptMaxChars(body.script_mode)', /const promptMaxChars = analyzePromptMaxChars\(body\.script_mode\)/.test(rota) && /if \(prompt\.length > promptMaxChars\)/.test(rota))
checa('o literal "prompt.length > 5000" e a mensagem cravada saíram do CÓDIGO da rota (o comentário histórico pode citá-los)', !/prompt\.length > 5000/.test(rota) && !/error: 'Prompt is too long \(5000 chars max\)\.'/.test(rota))
checa('a recusa diz o teto do modo e o motivo', /error: `Prompt is too long \(\$\{promptMaxChars\} chars max\)\.`, reason: 'prompt_too_long', max_chars: promptMaxChars/.test(rota))
checa('a recusa continua registrando só o tamanho (nunca o texto)', /recordFastFailure\('generating', 'prompt_too_long', 400, user\.id, \{ prompt_length: prompt\.length, max_chars: promptMaxChars, script_mode: body\.script_mode \?\? null \}\)/.test(rota))
checa('import da fonte única na rota', /import \{ SCENE_WRITER_INPUT_MAX_CHARS, analyzePromptMaxChars \} from '@\/lib\/analyzeLimits'/.test(rota))
checa('fonte única: verbatim 5.000 (o texto é o filme), demais 20.000, clipe 6.000', num(limites, 'ANALYZE_PROMPT_MAX_CHARS') === 5000 && num(limites, 'ANALYZE_PROMPT_MAX_CHARS_SOURCE') === 20000 && num(limites, 'CLIP_PROMPT_MAX_CHARS') === 6000 && /return scriptMode === 'verbatim' \? ANALYZE_PROMPT_MAX_CHARS : ANALYZE_PROMPT_MAX_CHARS_SOURCE/.test(limites))

// 2. acima do que o escritor lê, mede-se (não se esconde)
checa('texto acima de SCENE_WRITER_INPUT_MAX_CHARS grava prompt_over_writer_cap com tamanho, teto e modo', /if \(prompt\.length > SCENE_WRITER_INPUT_MAX_CHARS\) \{\s*void writeServerEvent\(\{ name: 'prompt_over_writer_cap'/.test(rota) && /writer_cap: SCENE_WRITER_INPUT_MAX_CHARS, script_mode: body\.script_mode \?\? null, version: 'porta_formato_v1'/.test(rota))
checa('o escritor de cenas continua lendo até SCENE_WRITER_INPUT_MAX_CHARS (6.000)', /prompt\.slice\(0, SCENE_WRITER_INPUT_MAX_CHARS\)/.test(rota) && num(limites, 'SCENE_WRITER_INPUT_MAX_CHARS') === 6000)

// 3. plano de clipe com FALA rotulada não é recusado
checa('a rota importa screenplaySpeechOnly de lib/scriptParser', /import \{ parseUserScript, screenplaySpeechOnly \} from '@\/lib\/scriptParser'/.test(rota))
checa('a fala dentro do plano é lida SÓ quando o detector diz plano', /const speechInsideShotPlan = shot\.isShotSpec \? screenplaySpeechOnly\(prompt\) : null/.test(rota))
checa('com fala rotulada: evento shot_spec_with_speech_admitted e a rota SEGUE', /if \(shot\.isShotSpec && speechInsideShotPlan\) \{\s*void writeServerEvent\(\{ name: 'shot_spec_with_speech_admitted'/.test(rota))
checa('sem fala: a recusa 422 continua exatamente como era', /if \(shot\.isShotSpec && !speechInsideShotPlan\) \{\s*await writeServerEvent\(\{ name: 'shot_spec_detected'/.test(rota) && /reason: 'shot_spec_detected', clip_seconds: shot\.seconds/.test(rota))
checa('mutante (recusa incondicional de volta) é pego', !/if \(shot\.isShotSpec\) \{\s*await writeServerEvent/.test(rota))

// 4. o resgate pelo servidor aceita o mesmo teto do Studio
checa('RENDER_JOB_PROMPT_MAX === ANALYZE_PROMPT_MAX_CHARS_SOURCE (20.000)', num(jobs, 'RENDER_JOB_PROMPT_MAX') === num(limites, 'ANALYZE_PROMPT_MAX_CHARS_SOURCE'))
checa('lib/renderJobs segue puro (sem import)', !/^import /m.test(jobs))

// 5. o portão de fala (o que não cabe em 90 s) continua de pé — a porta só tirou a régua errada
checa('o portão de fala verbatim/prosa própria continua na rota', /if \(ownScript\) \{ \/\/ KINEO1-VERBATIM-ESTICA/.test(rota) && /largestFittingDuration\(fit\.speech\)/.test(rota))
checa('screenplaySpeechOnly exige ≥2 linhas com rótulo de fala (não pega qualquer dois-pontos)', /if \(rotulos < 2\) return null/.test(rd('lib/scriptParser.ts')))

console.log(`test-porta-formato-colado-2026-09-24: ${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  FAIL ' + f)
process.exit(falhas.length ? 1 : 0)
