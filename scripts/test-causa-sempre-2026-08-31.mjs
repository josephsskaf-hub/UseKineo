// ═══════════════════════════════════════════════════════════════════════════
// sprint-v1v4 #5 — KINEO-CAUSA-SEMPRE-2026-08-31
//
// Prova que nenhuma linha de `generation_stage_error` nasce muda.
//
// Medido no banco em 31/08 (7 dias, externos): 133 falhas, das quais 31 (23%,
// 12 pessoas) com `metadata.error = null`. Os quatro ramos culpados:
//   analyze_not_ok 18 · cinematic_gate_trial_stalled 8 ·
//   cinematic_gate_creator 3 · cinematic_provider_queued 2
//
// Duas famílias de verificação:
//   A. o helper `trackGenerationFailure` NUNCA emite `error: null`;
//   B. os ramos que tinham o texto do servidor na mão passam a entregá-lo.
//
// Nota de método herdada da rodada #4: checagem de "não encosta em dinheiro"
// e de ausência de `null` roda sobre o CÓDIGO, com comentários removidos —
// senão o próprio comentário que explica a regra reprova o arquivo.
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const CAMINHO = join(raiz, 'app', '(dashboard)', 'generate', 'GenerateClient.tsx')
const bruto = readFileSync(CAMINHO, 'utf8')

// Remove comentários de bloco e de linha para que o texto explicativo nunca
// seja lido como código.
function semComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((linha) => linha.replace(/(^|[^:"'`\\])\/\/.*$/, '$1'))
    .join('\n')
}
const codigo = semComentarios(bruto)
const ts = createRequire(join(raiz, 'package.json'))('typescript')
const ast = ts.createSourceFile('GenerateClient.tsx', bruto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const nodes = []
function visit(node) { nodes.push(node); ts.forEachChild(node, visit) }
visit(ast)
const helperNode = nodes.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'trackGenerationFailure')
const ledgerSource = readFileSync(join(raiz, 'lib/failureLedger.ts'), 'utf8')
const ledgerCode = semComentarios(ledgerSource)

let ok = 0
const falhas = []
function checar(nome, condicao) {
  if (condicao) ok += 1
  else falhas.push(nome)
}
function trecho(codigoFonte, marcador, linhasDepois) {
  const i = codigoFonte.indexOf(marcador)
  if (i < 0) return ''
  return codigoFonte.slice(i).split('\n').slice(0, linhasDepois).join('\n')
}

// ── A. O HELPER NUNCA EMITE error: null ────────────────────────────────────
checar('A1 carimbo KINEO-CAUSA-SEMPRE-2026-08-31 presente', bruto.includes('KINEO-CAUSA-SEMPRE-2026-08-31'))
checar('A2 função sintetizarCausa existe', /function sintetizarCausa\(/.test(codigo))
checar('A3 sintetizarCausa recebe stage, reason e httpStatus',
  /function sintetizarCausa\(\s*stage: Phase,\s*reason: string,\s*httpStatus: number \| null,\s*\): string/.test(codigo))
checar('A4 a síntese compartilhada usa o prefixo no_detail:', ledgerCode.includes('`no_detail:${reason}`'))
checar('A5 a síntese compartilhada carrega o stage', ledgerCode.includes('`stage=${stage}`'))
checar('A6 a síntese carrega o http (ou a palavra none)',
  ledgerCode.includes("`http=${typeof httpStatus === 'number' ? httpStatus : 'none'}`"))
checar('A7 a síntese é truncada em180 e o caller usa a fonte canonica', ledgerCode.includes('.slice(0, 180)') && codigo.includes('return sintetizarCausaCompartilhada(stage, reason, httpStatus)'))

// Later signal/telemetry additions exceeded the old sixty-line cut. Scope the
// actual function, so assertions cannot pass on an unrelated event elsewhere.
const helper = helperNode ? semComentarios(helperNode.getText(ast)) : ''
checar('A8 helper calcula detalhe a partir de extra.detail', /const detalhe =/.test(helper))
checar('A9 helper calcula mensagem a partir de extra.message', /const mensagem =/.test(helper))
checar('A10 detalhe exige string não-vazia (trim)', helper.includes("typeof extra?.detail === 'string' && extra.detail.trim().length > 0"))
checar('A11 mensagem exige string não-vazia (trim)', helper.includes("typeof extra?.message === 'string' && extra.message.trim().length > 0"))
checar('A12 causa cai na síntese quando não há detalhe nem mensagem',
  helper.includes('sintetizarCausa(stage, reason, httpStatusValue)'))
checar('A13 a ordem é detalhe → mensagem → síntese',
  /const causa = detalhe \?\? \(mensagem \? mensagem\.slice\(0, 180\) : sintetizarCausa\(/.test(helper))
checar('A14 error_source existe e tem os três valores',
  /causaOrigem: 'detail' \| 'message' \| 'synthesized'/.test(helper))
checar('A15 error_source segue a mesma ordem da causa',
  /causaOrigem[\s\S]{0,80}= detalhe\s*\?\s*'detail'\s*:\s*mensagem\s*\?\s*'message'\s*:\s*'synthesized'/.test(helper))
checar('A16 o evento publica error: causa', helper.includes('error: causa,'))
checar('A17 o evento publica error_source: causaOrigem', helper.includes('error_source: causaOrigem,'))
checar('A18 o helper NÃO tem mais o antigo error: ... : null', !/error: extra\?\.detail \? extra\.detail\.slice\(0, 180\) : null/.test(codigo))
checar('A19 detalhe é truncado em 180', helper.includes('.trim().slice(0, 180)'))
checar('A20 mensagem é truncada em 200', helper.includes('.trim().slice(0, 200)'))
checar('A21 http_status continua aceitando null explícito',
  helper.includes('const httpStatusValue = ') && helper.includes('http_status: httpStatusValue,'))
checar('A22 o helper continua dentro de try/catch (analytics nunca quebra render)',
  helperNode && ts.isTryStatement(helperNode.body.statements[0]) && !!helperNode.body.statements[0].catchClause)
checar('A23 nenhuma atribuição literal error: null sobrou no arquivo inteiro',
  !/\berror:\s*null\b/.test(codigo))

// ── B. OS RAMOS QUE TINHAM O TEXTO NA MÃO AGORA O ENTREGAM ─────────────────
const analyzeCall = nodes.find(node => ts.isCallExpression(node) && node.expression.getText(ast) === 'trackGenerationFailure' && node.arguments[1]?.getText(ast) === "'analyze_not_ok'")
const bAnalyze = analyzeCall ? semComentarios(analyzeCall.getText(ast)) : ''
checar('B1 analyze_not_ok passa httpStatus', bAnalyze.includes('httpStatus: res.status'))
checar('B2 analyze_not_ok leva o texto do servidor como detail',
  bAnalyze.includes('detail: servidorDisse') && bAnalyze.includes('prompt_len=') &&
  nodes.some(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === 'servidorDisse' && node.initializer?.getText(ast).includes("typeof data?.error === 'string' && data.error.trim().length > 0 ? data.error.trim() : ''")))
checar('B3 analyze_not_ok marca responded: true', bAnalyze.includes('responded: true'))
checar('B4 analyze_not_ok segue sendo emitido pelo helper',
  codigo.includes("trackGenerationFailure('analyzing', 'analyze_not_ok', {"))

const bFila = trecho(codigo, "'cinematic_provider_queued'", 8)
checar('B5 provider_queued mantém o 503', bFila.includes('httpStatus: 503'))
checar('B6 provider_queued leva o texto da fila', bFila.includes("typeof data?.error === 'string' ? data.error"))
checar('B7 provider_queued tem fallback quando o corpo vem vazio', bFila.includes("'provider_queued_no_body'"))
checar('B8 provider_queued marca responded: true', bFila.includes('responded: true'))

const bGate = trecho(codigo, '`cinematic_gate_${gateReason}`', 16)
checar('B9 gate mantém o 402', bGate.includes('httpStatus: 402'))
checar('B10 gate leva o gateReason resolvido', bGate.includes('`gate=${gateReason}`'))
checar('B11 gate leva o reason cru do servidor', bGate.includes('`server_reason=${data.reason}`'))
checar('B12 gate leva o degrau de upsell', bGate.includes('`upsell=${data.upsell}`'))
checar('B13 gate leva o saldo', bGate.includes('`balance=${data.balance}`'))
checar('B14 gate filtra os campos ausentes antes de juntar', bGate.includes(".filter(Boolean).join('|')"))
checar('B15 gate marca responded: true', bGate.includes('responded: true'))

const bRestore = trecho(codigo, "'active_render_restore_auth_unavailable'", 6)
checar('B16 o emissor solto de restore ganhou error', bRestore.includes('error: `no_detail:active_render_restore_auth_unavailable'))
checar('B17 o emissor solto de restore ganhou error_source', bRestore.includes("error_source: 'synthesized'"))

// ── C. O QUE NÃO PODE TER MUDADO ───────────────────────────────────────────
checar('C1 openOutOfCreditsModal continua sendo chamado antes do evento do gate',
  codigo.indexOf('openOutOfCreditsModal(gateReason)') < codigo.indexOf('`cinematic_gate_${gateReason}`'))
checar('C2 o ramo credits_held continua NÃO abrindo o modal',
  /credits_held_by_render'\)\s*\{[\s\S]{0,400}?cinematic_gate_credits_held/.test(codigo))
checar('C3 redirectToLoginPreservingPrompt do 401 do analyze intacto',
  codigo.includes("trackGenerationFailure('analyzing', 'analyze_unauthenticated', { httpStatus: 401 })"))
checar('C4 o bloco tocado não introduz preço/checkout/stripe',
  !/stripe|checkout|priceId|createCheckout/i.test(
    trecho(codigo, 'function sintetizarCausa(', 70) + bAnalyze + bFila + bGate,
  ))
checar('C5 nenhum e-mail/prompt viaja como detail',
  !/detail:\s*(prompt|topic|email|userEmail)/.test(codigo))
checar('C6 setError do gate continua mostrando o texto do servidor',
  codigo.includes("setError(typeof data?.error === 'string' ? data.error : `This needs more credits."))
checar('C7 o campo message continua existindo no evento', helper.includes('message: mensagem,'))
checar('C8 elapsed_ms preservado', helper.includes('elapsed_ms:'))
checar('C9 responded preservado', helper.includes('responded:'))
checar('C10 attempt_id preservado', helper.includes('attempt_id: generationAttemptRef.current,'))

const executeLedger = source => {
  const module = { exports: {} }
  new Function('module', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(module, module.exports)
  return module.exports
}
const ledger = executeLedger(ledgerSource)
checar('runtime: causa sem detalhe conserva motivo, estagio e HTTP', ledger.sintetizarCausa('clips_ready', 'provider_queued', 503) === 'no_detail:provider_queued|stage=clips_ready|http=503')
checar('runtime: HTTP desconhecido e none, nunca null', ledger.sintetizarCausa('idle', 'missing', null) === 'no_detail:missing|stage=idle|http=none')
checar('runtime: causa longa respeita180', ledger.sintetizarCausa('idle', 'x'.repeat(500), null).length === 180)
const longMutant = executeLedger(ledgerSource.replace('partes.join(\'|\').slice(0, 180)', 'partes.join(\'|\').slice(0, 181)'))
checar('mutante: teto incorreto reprova a fixture longa', longMutant.sintetizarCausa('idle', 'x'.repeat(500), null).length !== 180)

console.log(`\n[causa-sempre] ${ok} verificações ok, ${falhas.length} falhas`)
if (falhas.length) {
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('[causa-sempre] nenhuma linha de generation_stage_error pode nascer muda.\n')
