// sprint-assinaturas #4 (02/09) — o e-mail "Your video is ready" saía até 16x
// para a mesma pessoa. Este teste lê o arquivo REAL do cron e prova que todo
// envio passa por uma confirmação direta por geração, fail-closed.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ts from 'typescript'
const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '..', 'app', 'api', 'cron', 'finish-stranded-renders', 'route.ts'), 'utf8').replace(/\r\n/g, '\n') // KINEO-LEVA-REBASE-2610: LF anchors must apply before AST mutant rejection on Windows.
let pass = 0, fail = 0
function check(name, ok) { if (ok) { pass++; console.log('  ok  ' + name) } else { fail++; console.log('  FAIL ' + name) } }

check('helper alreadySentDirect existe', /async function alreadySentDirect\(/.test(src))
check('helper consulta por .eq(session_id) e NÃO por lista', /\.eq\('name', args\.eventName\)\s*\.eq\('session_id', args\.genId\)\s*\.limit\(1\)/.test(src))
check('helper é fail-closed: erro da consulta => send:false', /if \(error\) \{[\s\S]*?return \{ send: false, reason: 'lookup_failed' \}/.test(src))
check('helper grava stranded_dedupe_miss quando o lote perdeu o marcador', /name: 'stranded_dedupe_miss'/.test(src) && /found && !args\.batchHad/.test(src))

// Os três avisos por geração têm confirmação direta; a carta posterior de
// tentativa perdida é condicionada por flag e dedupe por pessoa. Delimitar os
// blocos reais pela AST evita depender de quantas linhas de comentário há entre eles.
function sendingGates(text) {
  const ast = ts.createSourceFile('stranded.ts', text, 99, true), calls = []
  function walk(n) { if (ts.isCallExpression(n) && n.expression.getText(ast) === 'sendEmail') calls.push(n); ts.forEachChild(n, walk) }
  walk(ast)
  const compact = n => n?.getText(ast).replace(/\s+/g, '') ?? ''
  const containing = (node, predicate) => { for (let p = node.parent; p; p = p.parent) if (predicate(p)) return p; return null }
  const checked = [], conditional = []
  for (const call of calls) {
    const ternary = call.parent && ts.isAwaitExpression(call.parent) && ts.isConditionalExpression(call.parent.parent) ? call.parent.parent : null
    const block = containing(call, ts.isBlock)
    if (!block) return { valid: false }
    let statement = call; while (statement.parent !== block) statement = statement.parent
    const sendIndex = block.statements.indexOf(statement)
    if (ternary) {
      const personQueryIndex = block.statements.findIndex(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => ts.isObjectBindingPattern(d.name) && d.name.elements.some(e => e.name.getText(ast) === 'priorCount')))
      const query = personQueryIndex >= 0 ? compact(block.statements[personQueryIndex]) : ''
      const guardIndex = block.statements.findIndex(n => ts.isIfStatement(n) && compact(n.expression) === 'priorErr||(priorCount??0)>0' && ts.isContinueStatement(n.thenStatement))
      conditional.push(compact(ternary.condition) === 'ATTEMPT_LOST_SEND_ENABLED' && ternary.whenFalse.kind === ts.SyntaxKind.FalseKeyword && personQueryIndex >= 0 && guardIndex > personQueryIndex && guardIndex < sendIndex && query.includes(".eq('name',ATTEMPT_LOST_EVENT)") && query.includes(".eq('user_id',userId)") && query.includes(".eq('metadata->>sent','true')"))
      continue
    }
    const verdictIndex = block.statements.findIndex(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(ast) === 'verdict' && ts.isAwaitExpression(d.initializer) && ts.isCallExpression(d.initializer.expression) && d.initializer.expression.expression.getText(ast) === 'alreadySentDirect'))
    const guardIndex = block.statements.findIndex(n => ts.isIfStatement(n) && compact(n.expression) === '!verdict.send' && ts.isBlock(n.thenStatement) && n.thenStatement.statements.some(ts.isContinueStatement))
    const verdict = verdictIndex >= 0 ? block.statements[verdictIndex].declarationList.declarations.find(d => d.name.getText(ast) === 'verdict').initializer.expression : null
    const args = verdict?.arguments[1]
    const event = args && ts.isObjectLiteralExpression(args) ? args.properties.find(n => ts.isPropertyAssignment(n) && n.name.getText(ast) === 'eventName')?.initializer.getText(ast) : null
    checked.push({ event, valid: verdictIndex >= 0 && verdictIndex < guardIndex && guardIndex < sendIndex })
  }
  return { valid: !ast.parseDiagnostics.length && calls.length === 4 && checked.length === 3 && checked.every(x => x.valid) && ['READY_EVENT','RESCUE_EVENT','FAST_READY_EVENT'].every(name => checked.filter(x => x.event === name).length === 1) && conditional.length === 1 && conditional[0], calls, ast }
}
const gates = sendingGates(src)
check('os quatro envios reais têm seus portões completos, no mesmo bloco e antes do envio', gates.valid)
check('READY (fase 2) confere READY_EVENT', /alreadySentDirect\(admin, \{ eventName: READY_EVENT, genId, userId, batchHad: readySent\.has\(genId\)/.test(src))
check('RESCUE (fase 1) confere RESCUE_EVENT', /alreadySentDirect\(admin, \{ eventName: RESCUE_EVENT, genId, userId/.test(src))
check('FAST (fase 3) confere FAST_READY_EVENT', /alreadySentDirect\(admin, \{ eventName: FAST_READY_EVENT, genId, userId, batchHad: alreadyFast\.has\(genId\)/.test(src))
check('verdict negativo => continue antes de cada um dos três envios por geração', gates.valid)
for (const [name, before, after] of [
  ['verdict negativo ignorado', 'if (!verdict.send)', 'if (false)'],
  ['evento READY trocado', 'eventName: READY_EVENT, genId, userId', 'eventName: RESCUE_EVENT, genId, userId'],
  ['envio de tentativa sem flag', 'const ok = ATTEMPT_LOST_SEND_ENABLED', 'const ok = true'],
  ['erro de dedupe por pessoa ignorado', 'if (priorErr || (priorCount ?? 0) > 0) continue', 'if ((priorCount ?? 0) > 0) continue'],
  ['dedupe por pessoa sem o usuário', ".eq('name', ATTEMPT_LOST_EVENT)\n          .eq('user_id', userId)", ".eq('name', ATTEMPT_LOST_EVENT)"],
]) check('mutante recusado: ' + name, src.includes(before) && !sendingGates(src.replace(before, after)).valid)
const lost = gates.calls?.find(n => ts.isConditionalExpression(n.parent?.parent))?.parent.parent
if (lost) {
  const code = ts.transpileModule('(async () => ' + lost.getText(gates.ast) + ')()', { compilerOptions: { target: 9 } }).outputText
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
  for (const enabled of [false, true]) {
    let sends = 0
    const run = new AsyncFunction('ATTEMPT_LOST_SEND_ENABLED','sendEmail','email','userId','attemptLostText','attemptLostHtml','startUrl','topic', 'return ' + code)
    await run(enabled, async () => { sends++; return true }, 'offline@example.invalid', 'user', () => '', () => '', '/studio', null)
    check(`flag de tentativa ${enabled}: ${enabled ? 'um envio' : 'zero envio'}`, sends === (enabled ? 1 : 0))
  }
} else check('ternário real da tentativa foi localizado', false)
check('erro do lote de marcadores deixou de ser engolido', /const \{ data: markerRows, error: markerErr \}/.test(src) && /const markerBatchError = markerErr/.test(src))
check('erro do lote fast deixou de ser engolido', /const \{ data: fastMarkers, error: fastMarkerErr \}/.test(src))
check('lookup_failed vira stranded_outcome (SILENT_TERMINAL)', /SILENT_TERMINAL = \/\^\(ready_dedupe_lookup_failed\|rescue_dedupe_lookup_failed\|fast_dedupe_lookup_failed\|/.test(src))
// Nada de novo toca preço/plano/crédito
const added = src.split('\n').filter((l) => /sprint-assinaturas #4|alreadySentDirect|dedupe/i.test(l))
check('nenhuma linha nova fala de preço/plano/crédito/checkout', added.every((l) => !/price|plan_|checkout|credit_cost|debit/i.test(l)))
check('decisão de compor não mudou (MAX_COMPOSE_PER_RUN=3, MAX_COMPOSE_ATTEMPTS=2)', /MAX_COMPOSE_PER_RUN = 3/.test(src) && /MAX_COMPOSE_ATTEMPTS = 2/.test(src))
console.log(`\n${pass} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
