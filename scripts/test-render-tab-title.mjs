// sprint-ui #12 (2026-08-30) — prova estatica do titulo de aba dinamico do
// render em GenerateClient.tsx. Nao ha jsdom no repo; verificamos o contrato
// no fonte: os 4 estados, a captura unica do titulo base, o restore no
// unmount e o guard de SSR.
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8')
let pass = 0, fail = 0
const check = (name, ok) => { ok ? pass++ : (fail++, console.error('FAIL: ' + name)); if (ok) console.log('ok: ' + name) }

const block = src.split('sprint-ui #12')[1] ?? ''
check('bloco do sprint #12 existe', block.length > 0)
check('captura o titulo base UMA vez (null-check antes de gravar)', block.includes('if (baseTabTitleRef.current === null) baseTabTitleRef.current = document.title'))
check('fallback do base e o title estatico do sprint #11', block.includes("'Create a Video — Kineo'"))
check('estado escrevendo (scripting/analyzing) antes do processing generico', block.indexOf("phase === 'scripting' || phase === 'analyzing'") > -1 && block.indexOf("phase === 'scripting'") < block.indexOf('isProcessingPhase(phase)'))
check('estado renderizando usa isProcessingPhase (cobre fal_polling/avatar/composing)', block.includes('isProcessingPhase(phase)'))
check('estado pronto (done)', block.includes("phase === 'done'") && block.includes('Your Short is ready'))
check('estado falha (failed)', block.includes("phase === 'failed'") && block.includes('Render issue'))
check('repouso restaura o titulo base (else final)', /else\s*\{\s*document\.title = base/.test(block))
check('guard SSR (typeof document)', block.includes("typeof document === 'undefined'"))
check('efeito re-roda por fase', block.includes('}, [phase])'))
check('unmount restaura o titulo original', /return \(\) => \{[\s\S]*?document\.title = baseTabTitleRef\.current/.test(block))
check('toda marca de titulo termina em — Kineo', ['Writing your script', 'Rendering your Short', 'Your Short is ready', 'Render issue'].every(t => new RegExp(t + '[^\']*— Kineo').test(block)))
// contra-regressao: o bloco vive DEPOIS da telemetria de fase (nao intercepta trackEvent)
check('inserido apos o efeito de telemetria generation_stage_reached', src.indexOf('generation_stage_reached') < src.indexOf('sprint-ui #12'))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
