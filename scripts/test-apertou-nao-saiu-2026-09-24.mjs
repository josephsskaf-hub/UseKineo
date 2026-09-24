// KINEO-APERTOU-E-NAO-SAIU-2026-09-24 — guardião dos 4 consertos do "apertou Gerar e não saiu filme".
// Medido em 24/09 (7 d): 13 pessoas dispararam Gerar e não receberam filme; 12 por defeito nosso, 11 via ChatGPT.
// Causa nº 1 (6 pessoas): o aviso de encaixe do Kineo 1 (409) + o cron que refazia o pedido SEM o "manter Kineo 1".
// Estilo da casa: readFileSync + regex; o módulo puro roda por transpile + vm; `checa(nome, condicao)`.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, condicao) => { if (condicao) ok++; else falhas.push(nome) }

// ── 1. cron: o replay leva engineFitOverride (executado, não só lido) ─────────────────────────
const rjSrc = rd('lib/renderJobs.ts')
const js = ts.transpileModule(rjSrc, { compilerOptions: { module: 1, target: 9 } }).outputText
const RJ = {}
vm.runInNewContext(js, { exports: RJ, console, Number, String, RegExp, Object, Array, Math, Date })
const job = RJ.sanitizeRenderJobPayload({ attempt_id: '11111111-2222-4333-8444-555555555555', engine: 'fast', prompt: 'A cartoon about a brave little dragon', duration: 60, language: 'en', aspect: '9:16', script_mode: 'ai' })
const corpo = job ? RJ.fastRequestFromJob(job) : {}
checa('1a. o corpo do replay do cron leva engineFitOverride: true (o 409 de encaixe é escolha com botão; quem saiu não aperta)', corpo.engineFitOverride === true && corpo.orphan_job === true)
checa('1b. o replay continua levando só o que a rota entende (prompt, duration, language, orphan_job, engineFitOverride)', JSON.stringify(Object.keys(corpo).sort()) === JSON.stringify(['duration', 'engineFitOverride', 'language', 'orphan_job', 'prompt']))
const route = rd('app/api/generate-video-fast/route.ts')
checa('1c. a rota que o cron chama honra exatamente essa chave (body.engineFitOverride !== true → 409)', /if \(engineFit\.verdict === 'stock_cannot_tell' && body\.engineFitOverride !== true\) \{/.test(route))

// ── 2. auto-start: a escolha do próprio produto não é recusada pelo próprio produto ───────────
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('2a. ref própria do auto-start, separada da ref de sessão do botão "Keep Kineo 1"', /const engineFitOverrideRef = useRef\(false\)[\s\S]{0,700}const autostartFitOverrideRef = useRef\(false\)/.test(gc))
checa('2b. o auto-start marca a ref SÓ quando o motor que ele escolheu é o Kineo 1, logo antes de disparar', /autostartFitOverrideRef\.current = activationEngine === 'fast'[^\n]*\n\s*void handleGenerate\(\)\n\s*return\n\s*\}/.test(gc))
checa('2c. a ref é consumida UMA vez antes do laço do fast e volta a false', /const sendEngineFitOverride = engineFitOverrideRef\.current \|\| autostartFitOverrideRef\.current\n\s*autostartFitOverrideRef\.current = false\n\s*let fastDispatchRetries = 0/.test(gc))
checa('2d. o corpo do fetch usa o valor capturado (o retry do mesmo despacho leva o mesmo) e não lê mais a ref crua', /\.\.\.\(sendEngineFitOverride \? \{ engineFitOverride: true \} : \{\}\) \}\),/.test(gc) && !/\.\.\.\(engineFitOverrideRef\.current \? \{ engineFitOverride: true \}/.test(gc))
checa('2e. só o botão "Keep Kineo 1 anyway" e o auto-start ligam o override (nenhum terceiro caminho)', (gc.match(/engineFitOverrideRef\.current = true/g) || []).length === 1 && (gc.match(/autostartFitOverrideRef\.current = /g) || []).length === 2)

// ── 3. cortina do Studio não esconde o aviso de encaixe ────────────────────────────────────────
checa('3. a cortina "Directing your film…" exige !engineFit (o 409 põe phase idle sem erro)', /\(phase === 'options' && studioAutoFirePendingRef\.current\)\) &&\n\s*!error &&\n\s*!showUpgradeModal &&\n\s*!engineFit /.test(gc))

// ── 4. "You used your whole trial" só com saldo zero ───────────────────────────────────────────
checa('4a. trial_spent exige saldo <= 0', /trialActive === true && trialUi\?\.phase === 'active' && trialBalance <= 0\n\s*\? 'trial_spent'/.test(gc) && /const trialBalance = typeof credits === 'number' \? credits : 0/.test(gc))
checa('4b. trial ativo com saldo e motor de IA vê a frase do motor que pede plano (creator = Seedance, studio = premium), nunca "gastou tudo"', /const trialEngineShortfall: 'creator' \| 'studio' \| null =[\s\S]{0,400}trialBalance > 0 && mode !== 'fast' && mode !== 'creator'\n\s*\? \(aiEngine === 'seedance' \? 'creator' : 'studio'\)/.test(gc) && /const resolvedReason = trialReasonHere \?\? trialEngineShortfall \?\? reason/.test(gc))
checa('4c. conta paga nunca cai nessas frases de trial (paidAccount segue excluindo)', /reason !== 'credits' \|\| !trialGranted \|\| paidAccount/.test(gc) && /trialGranted && !paidAccount &&/.test(gc))

// ── 5. nada disto toca a trava 8.2 ─────────────────────────────────────────────────────────────
checa('5. a rota do Kineo 1 continua com o aviso intacto (o conserto é no chamador, não no portão)', /engineFit\.verdict === 'stock_cannot_tell' && body\.engineFitOverride !== true/.test(route) && /if \(body\.engineFitOverride === true && engineFit\.verdict === 'stock_cannot_tell'\) \{/.test(route))

console.log(`test-apertou-nao-saiu-2026-09-24: ${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  FAIL ' + f)
process.exit(falhas.length ? 1 : 0)
