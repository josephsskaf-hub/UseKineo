// sprint-assinaturas #4 (02/09) — o e-mail "Your video is ready" saía até 16x
// para a mesma pessoa. Este teste lê o arquivo REAL do cron e prova que todo
// envio passa por uma confirmação direta por geração, fail-closed.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '..', 'app', 'api', 'cron', 'finish-stranded-renders', 'route.ts'), 'utf8')
let pass = 0, fail = 0
function check(name, ok) { if (ok) { pass++; console.log('  ok  ' + name) } else { fail++; console.log('  FAIL ' + name) } }

check('helper alreadySentDirect existe', /async function alreadySentDirect\(/.test(src))
check('helper consulta por .eq(session_id) e NÃO por lista', /\.eq\('name', args\.eventName\)\s*\.eq\('session_id', args\.genId\)\s*\.limit\(1\)/.test(src))
check('helper é fail-closed: erro da consulta => send:false', /if \(error\) \{[\s\S]*?return \{ send: false, reason: 'lookup_failed' \}/.test(src))
check('helper grava stranded_dedupe_miss quando o lote perdeu o marcador', /name: 'stranded_dedupe_miss'/.test(src) && /found && !args\.batchHad/.test(src))

// Todo sendEmail de cliente é precedido por um verdict
const sends = [...src.matchAll(/await sendEmail\(/g)].length
const verdicts = [...src.matchAll(/const verdict = await alreadySentDirect\(/g)].length
check(`todo envio tem confirmação direta (sendEmail=${sends}, verdicts=${verdicts})`, sends === verdicts && sends === 3)
check('READY (fase 2) confere READY_EVENT', /alreadySentDirect\(admin, \{ eventName: READY_EVENT, genId, userId, batchHad: readySent\.has\(genId\)/.test(src))
check('RESCUE (fase 1) confere RESCUE_EVENT', /alreadySentDirect\(admin, \{ eventName: RESCUE_EVENT, genId, userId/.test(src))
check('FAST (fase 3) confere FAST_READY_EVENT', /alreadySentDirect\(admin, \{ eventName: FAST_READY_EVENT, genId, userId, batchHad: alreadyFast\.has\(genId\)/.test(src))
check('verdict negativo => continue ANTES do sendEmail (3x)', [...src.matchAll(/if \(!verdict\.send\) \{ results\.push\([^\n]*\); continue \}\n[^\n]*\n?[^\n]*sendEmail\(/g)].length >= 2)
check('erro do lote de marcadores deixou de ser engolido', /const \{ data: markerRows, error: markerErr \}/.test(src) && /const markerBatchError = markerErr/.test(src))
check('erro do lote fast deixou de ser engolido', /const \{ data: fastMarkers, error: fastMarkerErr \}/.test(src))
check('lookup_failed vira stranded_outcome (SILENT_TERMINAL)', /SILENT_TERMINAL = \/\^\(ready_dedupe_lookup_failed\|rescue_dedupe_lookup_failed\|fast_dedupe_lookup_failed\|/.test(src))
// Nada de novo toca preço/plano/crédito
const added = src.split('\n').filter((l) => /sprint-assinaturas #4|alreadySentDirect|dedupe/i.test(l))
check('nenhuma linha nova fala de preço/plano/crédito/checkout', added.every((l) => !/price|plan_|checkout|credit_cost|debit/i.test(l)))
check('decisão de compor não mudou (MAX_COMPOSE_PER_RUN=3, MAX_COMPOSE_ATTEMPTS=2)', /MAX_COMPOSE_PER_RUN = 3/.test(src) && /MAX_COMPOSE_ATTEMPTS = 2/.test(src))
console.log(`\n${pass} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
