#!/usr/bin/env node
// KINEO-ORDEM-NARRADA-2026-09-07 — guardiao do aviso "a ordem que vira narracao".
//
// O DEFEITO (banco de producao, 14 dias, status=completed, contas com user_id):
// 7 pessoas colaram no Studio a ORDEM que mandaram ao ChatGPT ("Create a
// 30-second vertical YouTube Short...", "IMPORTANT: This is a completely visual
// story. NO narration...") com "Use my script as is" — e o produto narrou a
// ordem em voz alta, cobrando credito. So 3 das 7 viram o aviso; as 3 mandaram
// verbatim mesmo assim. Havia dois detectores e um aviso, ligado no detector
// errado (o do auto-start). Este teste prende o aviso ao detector da ANALISE.
//
// ESTILO: readFileSync do arquivo REAL, sem alias `@/` (guardiao com alias
// morre no import antes da 1a verificacao). A biblioteca pura e carregada de
// verdade via transpileModule; o componente e lido como texto e o PREDICADO e
// EXTRAIDO E EXECUTADO contra uma tabela-verdade — nao se conta texto. Um
// mutante que troque o `if` por `true`, ou que deixe so um dos dois lados,
// tem de ficar VERMELHO.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// CRLF no checkout do Windows: normalizar na leitura (memoria da casa).
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }
const countOf = (haystack, needle) => haystack.split(needle).length - 1

// Recorta `( … )` a partir da assinatura, casando parenteses de verdade.
function parens(texto, assinatura, desde = 0) {
  const ini = texto.indexOf(assinatura, desde)
  if (ini < 0) return ''
  const abre = texto.indexOf('(', ini + assinatura.length - 1)
  let prof = 0
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '(') prof++
    else if (texto[i] === ')') { prof--; if (prof === 0) return texto.slice(ini, i + 1) }
  }
  return ''
}

function loadTs(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(() => {
    throw new Error(`${path}: unexpected import`)
  }, module, module.exports)
  return module.exports
}

// ─── 1. A biblioteca pura: a frase que vai ser falada ───────────────────────
const libSource = read('lib/growth/instructionPasteNotice.ts')
ok(!/^import\s/m.test(libSource), 'instructionPasteNotice.ts continua PURO (sem import): e carregado por componente de cliente')
const lib = loadTs('lib/growth/instructionPasteNotice.ts')
const { verbatimOpeningLine, VERBATIM_OPENING_MAX_CHARS } = lib
equal(typeof verbatimOpeningLine, 'function', 'verbatimOpeningLine exportada')
equal(VERBATIM_OPENING_MAX_CHARS, 120, 'corte padrao em 120 caracteres')
equal(verbatimOpeningLine(''), '', 'texto vazio → frase vazia')
equal(verbatimOpeningLine(null), '', 'null → frase vazia')
equal(verbatimOpeningLine(undefined), '', 'undefined → frase vazia')
equal(verbatimOpeningLine('   \n\n  Create a 30-second vertical YouTube Short.  \nTopic: Earth stops spinning'),
  'Create a 30-second vertical YouTube Short.', 'primeira linha NAO VAZIA, aparada')
equal(verbatimOpeningLine('IMPORTANT: This is a completely visual story.\r\nNO narration'),
  'IMPORTANT: This is a completely visual story.', 'CRLF: corta na primeira quebra')
{
  const longa = 'USE THE UPLOADED STARTING FRAME AS THE EXACT REFERENCE FOR THE FIRST FRAME. Preserve the same rusty hydraulic press, the same lighting and the same camera angle throughout the whole clip'
  ok(longa.length > 120, 'amostra longa de verdade')
  const corte = verbatimOpeningLine(longa)
  ok(corte.length <= 120, `frase longa cortada a ≤120 (veio ${corte.length})`)
  ok(corte.endsWith('…'), 'frase longa termina em reticencias')
  ok(longa.startsWith(corte.slice(0, -1)), 'o corte e prefixo do texto original — nada reescrito')
}
{
  const exata = 'x'.repeat(120)
  equal(verbatimOpeningLine(exata), exata, 'exatamente 120 chars passa inteira')
  equal(verbatimOpeningLine('y'.repeat(121)).length, 120, '121 chars → 120 com reticencias')
  equal(verbatimOpeningLine('abcdefghij', 5), 'abcd…', 'max customizado respeitado')
}
equal(verbatimOpeningLine('<b>Create</b> a short'), '<b>Create</b> a short', 'devolve o texto como esta — quem escapa e o JSX (nunca dangerouslySetInnerHTML)')

// ─── 2. O predicado, extraido do componente e EXECUTADO ─────────────────────
const client = read('app/(dashboard)/generate/GenerateClient.tsx')
const iAnalyze = client.indexOf('async function handleAnalyze(')
ok(iAnalyze > 0, 'handleAnalyze existe')
const iLeitura = client.indexOf('const leituraColada = readPastedDirectives(expandBaseRef.current)', iAnalyze)
ok(iLeitura > iAnalyze, 'o detector da analise (readPastedDirectives) roda dentro de handleAnalyze')
const iChecagem = client.indexOf('const baseChecagem = expandBaseRef.current', iLeitura)
ok(iChecagem > iLeitura, 'o espelho verbatim vem depois do detector')
const janela = client.slice(iLeitura, iChecagem)

// o `if` que acende o aviso: tem de vir IMEDIATAMENTE antes da acao
const reIf = /if \(([^\n]+)\) \{\n\s*verbatimOrderHoldRef\.current = true\n\s*setShowInstructionPasteNotice\(true\)\n/
const mIf = janela.match(reIf)
ok(mIf, 'na janela do detector existe `if (PREDICADO) { hold = true; setShowInstructionPasteNotice(true) }`')
const predicado = mIf[1]
ok(predicado.includes('leituraColada.looksPasted'), `o predicado le leituraColada.looksPasted (veio: ${predicado})`)
ok(predicado.includes("scriptMode === 'verbatim'"), `o predicado le scriptMode === 'verbatim' (veio: ${predicado})`)

// tabela-verdade: o predicado e uma funcao de (looksPasted, scriptMode) e so e
// verdadeiro no cruzamento colado × verbatim.
const avalia = new Function('leituraColada', 'scriptMode', `return Boolean(${predicado})`)
const tabela = [
  [true, 'verbatim', true],
  [true, 'ai', false],
  [false, 'verbatim', false],
  [false, 'ai', false],
]
for (const [looksPasted, modo, esperado] of tabela) {
  equal(avalia({ looksPasted }, modo), esperado, `predicado(looksPasted=${looksPasted}, scriptMode=${modo}) === ${esperado}`)
}

// o aviso NAO pode estar dentro de `if (directives.length > 0)`: a ordem
// "IMPORTANT: ... NO narration" nao tem duracao nenhuma e mesmo assim e narrada.
const iDirectives = janela.indexOf('if (leituraColada.directives.length > 0) {')
ok(iDirectives >= 0, 'o bloco de diretivas continua existindo')
const iFechaDirectives = janela.indexOf('script_mode: scriptMode,\n      })\n    }\n', iDirectives)
ok(iFechaDirectives > iDirectives, 'o evento pasted_directives_detected fecha o bloco de diretivas como antes')
ok(janela.indexOf(mIf[0]) > iFechaDirectives, 'o `if` do aviso vem DEPOIS de fechar o bloco de diretivas (looksPasted sem diretiva tambem avisa)')
ok(janela.indexOf('verbatimOrderHoldRef.current = false') < janela.indexOf(mIf[0]), 'o hold e zerado a cada analise, antes do predicado')

// o corpo do `if`: hold + aviso + evento com os campos combinados
const corpoIf = janela.slice(janela.indexOf(mIf[0]))
ok(corpoIf.includes("trackEvent('verbatim_order_warned'"), 'evento verbatim_order_warned ao acender')
for (const campo of ['first_line_chars', 'shape', 'words', 'script_mode']) {
  ok(corpoIf.includes(`${campo}:`), `verbatim_order_warned carrega ${campo}`)
}
ok(corpoIf.includes('verbatimOpeningLine(expandBaseRef.current)'), 'a primeira linha medida e a do texto que a pessoa mandou analisar')
ok(corpoIf.includes('classifyInstructionPaste(expandBaseRef.current)'), 'shape vem do classificador existente — que escolhe a copy, nao o portao')
ok(!/expandBaseRef\.current,\n/.test(corpoIf) && !/prompt:\s*expandBaseRef/.test(corpoIf), 'o texto do cliente NAO viaja no evento (so tamanhos e forma)')
equal(countOf(janela, 'setShowInstructionPasteNotice(true)'), 1, 'um unico acendimento na janela do detector')
ok(!corpoIf.includes("setScriptMode('ai')"), 'a analise NAO troca o modo sozinha (decisao mantida: a pessoa clica)')

// o resto de handleAnalyze segue lendo o MESMO scriptMode (os guardioes
// vizinhos test-script-preflight e test-chatgpt-script-handoff prendem isto)
ok(client.slice(iChecagem, iChecagem + 200).includes("if (scriptMode === 'verbatim' && baseChecagem)"), 'espelho de roteiro longo intacto')
ok(client.includes('JSON.stringify({ prompt: source, duration: alvoAnalise, language, scriptMode })'), '/api/analyze-idea recebe o scriptMode como antes')

// ─── 3. O one-click do Studio nao gasta por cima do aviso ───────────────────
const iEfeito = client.indexOf("if (phase !== 'options' || studioOneClickFiredRef.current) return")
ok(iEfeito > 0, 'efeito do one-click do Studio existe')
const iFire = client.indexOf('handleGenerateGuarded()', iEfeito)
ok(iFire > iEfeito, 'o efeito dispara handleGenerateGuarded')
const efeito = client.slice(iEfeito, iFire)
const iHold = efeito.indexOf('if (verbatimOrderHoldRef.current) {')
ok(iHold > 0, 'o efeito consulta o hold ANTES de disparar')
const bloqueio = efeito.slice(iHold, efeito.indexOf('return', iHold) + 6)
ok(bloqueio.includes('studioOneClickFiredRef.current = true'), 'hold marca o one-click como consumido')
ok(bloqueio.includes('studioAutoFirePendingRef.current = false'), 'hold levanta a cortina do Studio')
ok(bloqueio.includes('setVerbatimOrderHeldTick'), 'hold forca o re-render (a cortina le um ref)')
ok(bloqueio.includes("trackEvent('verbatim_order_autofire_held'"), 'hold e medido: verbatim_order_autofire_held')
ok(bloqueio.trimEnd().endsWith('return'), 'hold devolve sem disparar o render')

// ─── 4. A UI: primeira linha entre aspas + saida de um clique ───────────────
const iDetalhe = client.indexOf('function renderVerbatimOrderDetails()')
ok(iDetalhe > 0, 'o pedaco decisivo do aviso vive num lugar so (renderVerbatimOrderDetails)')
const iDetalheFim = client.indexOf('// KINEO-STUDIO-CORTINA-2026-08-17', iDetalhe)
ok(iDetalheFim > iDetalhe, 'o bloco termina antes da cortina do Studio')
const detalhe = client.slice(iDetalhe, iDetalheFim)
ok(!detalhe.includes('dangerouslySetInnerHTML'), 'a frase colada NUNCA vira HTML')
ok(detalhe.includes("if (scriptMode !== 'verbatim') return null"), 'o pedaco decisivo so existe em verbatim (em ai a frase seria falsa)')
ok(detalhe.includes('const aberturaFalada = verbatimOpeningLine(prompt)'), 'a primeira linha vem do texto que esta na caixa')
ok(detalhe.includes('Your video will open by saying out loud'), 'diz o que vai acontecer: o video abre falando isto')
ok(detalhe.includes('“{aberturaFalada}”'), 'a primeira linha aparece entre aspas, como texto JSX')
ok(/\{aberturaFalada && \(/.test(detalhe), 'sem primeira linha, sem bloco (texto vazio nao vira aspas vazias)')
ok(/<button[\s\S]*?onClick=\{switchVerbatimOrderToAi\}/.test(detalhe), 'o botao chama a saida de um clique')
ok(detalhe.includes('Let AI write the script'), 'o botao diz o que faz: a IA escreve o roteiro')
ok(!detalhe.includes("setScriptMode('verbatim')"), 'nada no aviso empurra para verbatim')

const iSwitch = client.indexOf('function switchVerbatimOrderToAi()')
ok(iSwitch > 0 && iSwitch < iDetalhe, 'switchVerbatimOrderToAi definida')
const troca = client.slice(iSwitch, iDetalhe)
const corpoTroca = troca.slice(0, troca.indexOf('useEffect('))
ok(corpoTroca.includes("setScriptMode('ai')"), 'a troca leva ao modo em que a IA escreve (ai)')
ok(corpoTroca.includes("trackEvent('verbatim_order_switched_to_ai'"), 'a troca e medida: verbatim_order_switched_to_ai')
for (const campo of ['first_line_chars', 'shape', 'words']) {
  ok(corpoTroca.includes(`${campo}:`), `verbatim_order_switched_to_ai carrega ${campo}`)
}
ok(corpoTroca.includes('verbatimOrderReanalyzeRef.current = true'), 'a troca ARMA a reanalise')
ok(corpoTroca.includes('setShowInstructionPasteNotice(false)'), 'depois da troca o aviso sai — o motivo dele acabou')
ok(corpoTroca.indexOf("trackEvent('verbatim_order_switched_to_ai'") < corpoTroca.indexOf("setScriptMode('ai')"), 'o evento le o estado ANTES da troca')
ok(!/handleGenerate|submitToFal/.test(troca), 'a troca NUNCA dispara render (so analise, Contrato C1)')

// a reanalise: efeito em [scriptMode], so quando armado e ja em 'ai'
const iReanalise = troca.indexOf('useEffect(')
ok(iReanalise > 0, 'existe o efeito de reanalise logo apos a troca')
const reanalise = troca.slice(iReanalise, troca.indexOf('}, [scriptMode])', iReanalise) + 16)
ok(reanalise.endsWith('}, [scriptMode])'), 'o efeito depende de scriptMode (o estado novo e que dispara)')
ok(reanalise.includes('if (!verbatimOrderReanalyzeRef.current) return'), 'sem armar, o efeito nao faz nada (trocar o modo a mao nao reanalisa)')
ok(reanalise.includes("if (scriptMode !== 'ai') return"), 'o efeito so reanalisa quando o estado ja e ai')
ok(reanalise.indexOf('verbatimOrderReanalyzeRef.current = false') < reanalise.indexOf('handleAnalyze('), 'desarma ANTES de chamar (nunca duas analises)')
ok(/handleAnalyze\(undefined, \{ skipPreview: searchParams\?\.get\('studio'\) === '1' \}\)/.test(reanalise), 'reanalisa o texto que esta na caixa; Studio pula o preview como na chegada')

// ─── 5. Onde aparece: Step 1 (bloco inline existente) e Step 2 (brief)
const GATE = '{showInstructionPasteNotice && prompt.trim() && ('
const avisoStep1 = parens(client, GATE)
ok(avisoStep1.length > 0, 'o bloco inline do Step 1 continua gated por showInstructionPasteNotice && prompt.trim()')
ok(avisoStep1.includes('{renderVerbatimOrderDetails()}'), 'Step 1 renderiza o pedaco decisivo dentro do aviso existente')
ok(avisoStep1.indexOf('instructionPasteNoticeFor(classifyInstructionPaste(prompt)).body') < avisoStep1.indexOf('{renderVerbatimOrderDetails()}'), 'no Step 1 a frase vem depois da copy e antes do CTA')
ok(avisoStep1.indexOf('{renderVerbatimOrderDetails()}') < avisoStep1.indexOf("trackEvent('instruction_notice_cta_clicked'"), 'a porta /chatgpt (CTA existente) continua no bloco, depois do pedaco decisivo')
equal(countOf(client, "'instruction_notice_cta_clicked'"), 1, 'o CTA do /chatgpt continua num lugar so (guardiao vizinho)')

const gateStep2 = "{showInstructionPasteNotice && scriptMode === 'verbatim' && prompt.trim() && ("
const iStep2 = client.indexOf('{showStep2 && analysis && (')
ok(iStep2 > 0, 'Step 2 (options) existe')
const avisoStep2 = parens(client, gateStep2, iStep2)
ok(avisoStep2.length > 0, 'Step 2 renderiza o aviso — gated em verbatim (em ai a frase seria falsa)')
const iEditIdea = client.indexOf('← Edit idea', iStep2)
const iStep2Chamada = client.indexOf(gateStep2, iStep2)
ok(iStep2Chamada > iEditIdea && iStep2Chamada - iEditIdea < 1500, 'no Step 2 o aviso vem logo abaixo do cabecalho, antes do botao que gasta credito')
ok(avisoStep2.includes('instructionPasteNoticeFor(classifyInstructionPaste(prompt)).title') && avisoStep2.includes('instructionPasteNoticeFor(classifyInstructionPaste(prompt)).body'), 'Step 2 usa a MESMA copy do classificador')
ok(avisoStep2.includes('{renderVerbatimOrderDetails()}'), 'Step 2 renderiza o pedaco decisivo')
ok(avisoStep2.includes('role="status"') && avisoStep2.includes('aria-live="polite"'), 'Step 2 anuncia o aviso como o Step 1')
equal(countOf(client, 'renderVerbatimOrderDetails()'), 3, 'definicao + 2 chamadas: nenhuma copia solta do pedaco decisivo')
equal(countOf(client, 'Your video will open by saying out loud'), 1, 'a frase vive num lugar so')

// ─── 6. Regressao: o outro detector continua vivo, e looksPasted continua existindo
ok(client.includes("trackEvent('activation_instruction_notice_viewed'"), 'o aviso do auto-start (19 pessoas) segue no lugar')
ok(client.includes("consumeAndSkip('prompt_looks_like_instruction')"), 'auto-start continua nao renderizando instrucao')
ok(client.includes('if (showInstructionPasteNotice) setShowInstructionPasteNotice(false)'), 'editar a caixa continua apagando o aviso')
const pasted = read('lib/pastedDirectives.ts')
ok(pasted.includes('looksPasted: boolean'), 'PastedDirectivesReading expoe looksPasted')
ok(pasted.includes('export function readPastedDirectives('), 'readPastedDirectives exportada')

console.log(`test-verbatim-order-warning: ${checks} verificacoes OK`)
