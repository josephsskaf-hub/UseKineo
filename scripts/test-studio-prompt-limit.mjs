// sprint-assinaturas #9 (02/09): o teto de 5.000 do analyze-idea aparece no
// /studio (onde a pessoa escreve), o Generate nao navega com texto acima do
// teto, e existe um corte de 1 clique que respeita fronteira de frase.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
let checks = 0
const ok = (v, l) => { assert.ok(v, l); checks += 1 }
const eq = (a, b, l) => { assert.equal(a, b, l); checks += 1 }

function loadTs(p, mocks = {}) {
  const out = ts.transpileModule(read(p), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: p }).outputText
  const module = { exports: {} }
  const req = (id) => { if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]; throw new Error(`${p}: unexpected import ${id}`) }
  new Function('require', 'module', 'exports', out)(req, module, module.exports)
  return module.exports
}

const limits = loadTs('lib/analyzeLimits.ts')
const lib = loadTs('lib/studioPromptLimit.ts', { '@/lib/analyzeLimits': limits })
const MAX = limits.ANALYZE_PROMPT_MAX_CHARS
eq(MAX, 5000, 'teto unico continua 5000')

// ── promptLimitState ────────────────────────────────────────────────────────
{
  const s = lib.promptLimitState('hello')
  eq(s.over, false, 'curto nao passa do teto'); eq(s.excess, 0, 'excesso 0')
  const exact = lib.promptLimitState('a'.repeat(MAX))
  eq(exact.over, false, 'exatamente o teto ainda cabe')
  const over = lib.promptLimitState('a'.repeat(6228))
  eq(over.over, true, 'caso real 6228 passa'); eq(over.excess, 1228, 'excesso = 1228 (o numero da tela do adrianwells)')
  const padded = lib.promptLimitState('   ' + 'a'.repeat(MAX) + '  \n')
  eq(padded.over, false, 'espacos das pontas nao contam (mesma regua do analyze)')
  eq(lib.formatLimitCounter(over), '6,228 / 5,000 characters — 1,228 over the limit', 'contador com o numero exato')
  eq(lib.formatLimitCounter(s), '5 / 5,000 characters', 'contador abaixo do teto sem alarme')
}

// ── trimPromptToLimit ───────────────────────────────────────────────────────
{
  const r0 = lib.trimPromptToLimit('short text.')
  eq(r0.removed, 0, 'abaixo do teto nao corta'); eq(r0.boundary, 'none', 'boundary none')

  // roteiro de frases de ~60 chars ate ~6200 chars
  const sentence = 'The ocean hides a mountain taller than Everest beneath its waves. '
  const script = sentence.repeat(95).trim() // ~6270
  ok(script.length > MAX, 'fixture passa do teto')
  const r = lib.trimPromptToLimit(script)
  ok(r.text.length <= MAX, 'resultado cabe no teto')
  eq(r.boundary, 'sentence', 'corta em fronteira de frase')
  ok(/\.$/.test(r.text), 'termina com ponto final (frase inteira)')
  eq(r.removed, script.length - r.text.length, 'removed bate com a diferenca')
  ok(r.text.length > MAX - sentence.length - 1, 'usa a ULTIMA frase que cabe, nao uma la atras')
  ok(script.startsWith(r.text), 'so tira do fim — nunca reescreve o inicio')

  // quebra de linha como fronteira (formato ChatGPT com rubricas)
  const lines = Array.from({ length: 120 }, (_, i) => `[SCENE ${i + 1}] VISUAL: slow dolly over ruins. NARRATION: line ${i + 1}`).join('\n')
  const rl = lib.trimPromptToLimit(lines)
  ok(rl.text.length <= MAX, 'formato com linhas cabe')
  ok(!rl.text.endsWith('\n'), 'sem quebra pendurada no fim')
  ok(rl.text.split('\n').every((l) => l.startsWith('[SCENE')), 'nenhuma linha partida ao meio')

  // sem pontuacao → fronteira de palavra
  const words = ('lorem ipsum dolor sit amet ').repeat(300).trim()
  const rw = lib.trimPromptToLimit(words)
  eq(rw.boundary, 'word', 'sem frase = palavra inteira')
  ok(rw.text.length <= MAX && !rw.text.endsWith(' '), 'cabe e nao termina em espaco')
  ok(words.startsWith(rw.text + ' '), 'palavra nao partida')

  // sem espacos → corte duro (nunca trava)
  const blob = 'x'.repeat(7000)
  const rb = lib.trimPromptToLimit(blob)
  eq(rb.boundary, 'hard', 'sem espaco = corte duro'); eq(rb.text.length, MAX, 'corte duro no teto exato')

  // frase util la atras demais (antes da metade) nao vale — cai em palavra
  const early = 'Intro. ' + ('word '.repeat(1500)).trim()
  const re = lib.trimPromptToLimit(early)
  eq(re.boundary, 'word', 'fronteira de frase antes da metade e ignorada')
  ok(re.text.length > MAX / 2, 'resultado nao encolhe para 6 chars')

  // teto reduzido (sufixo [camera: ...]) respeitado
  const rc = lib.trimPromptToLimit(script, MAX - 80)
  ok(rc.text.length <= MAX - 80, 'teto menor para deixar espaco ao sufixo do preset')
}

// ── StudioClient: fiacao ────────────────────────────────────────────────────
{
  const src = read('app/(dashboard)/studio/StudioClient.tsx')
  const ast = ts.createSourceFile('StudioClient.tsx', src, 99, true, 4)
  const declarations = new Map(), buttons = []
  function walk(n) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) declarations.set(n.name.text, n)
    if (ts.isJsxOpeningElement(n) && n.tagName.getText(ast) === 'button') buttons.push(n)
    ts.forEachChild(n, walk)
  }
  walk(ast)
  const evaluate = (expression, context) => {
    const code = ts.transpileModule('exports.value = (' + expression + ')', { compilerOptions: { target: 9 } }).outputText
    const exports = {}; new Function('exports', ...Object.keys(context), code)(exports, ...Object.values(context)); return exports.value
  }
  ok(src.includes("from '@/lib/studioPromptLimit'"), 'StudioClient importa a lib')
  ok(src.includes('const promptMax = useMemo(() => analyzePromptMaxChars(scriptMode), [scriptMode])') && src.includes('const limit = useMemo(() => promptLimitState(finalPrompt, promptMax), [finalPrompt, promptMax])'), 'teto medido no finalPrompt e no modo real (inclui sufixo da câmera)')
  for (const [mode, max] of [['verbatim', 5000], ['ai', 20000], ['clip', 6000]]) {
    const context = { useMemo: fn => fn(), scriptMode: mode, analyzePromptMaxChars: limits.analyzePromptMaxChars }
    const promptMax = evaluate(declarations.get('promptMax').initializer.getText(ast), context)
    eq(promptMax, max, 'teto atual por modo: ' + mode)
    for (const extra of [0, 1]) {
      const finalPrompt = 'a'.repeat(max + extra)
      const state = evaluate(declarations.get('limit').initializer.getText(ast), { useMemo: fn => fn(), promptLimitState: lib.promptLimitState, finalPrompt, promptMax })
      eq(state.over, extra === 1, 'memo real usa o teto do modo e texto final: ' + mode + '/' + extra)
    }
  }
  const generate = declarations.get('generate').initializer
  const limitIndex = generate.body.statements.findIndex(n => ts.isIfStatement(n) && n.expression.getText(ast) === 'limit.over')
  ok(limitIndex >= 2, 'bloqueio de limite do caminho principal vem após URL e modo clipe')
  const prefix = generate.body.statements.slice(0, limitIndex + 1).map(n => n.getText(ast)).join('\n')
  const { isStandaloneHttpUrl } = loadTs('lib/scriptInput.ts')
  function dispatchAllowed(code, { prompt = 'A complete story.', scriptMode = 'ai', over = false } = {}) {
    let dispatched = 0, focused = 0
    const run = evaluate('() => {\n' + code + '\n dispatch() }', { prompt, scriptMode, limit: { over }, isStandaloneHttpUrl, promptRef: { current: { focus: () => { focused++ } } }, generateClip: () => { dispatched++ }, dispatch: () => { dispatched++ } })
    run(); return { dispatched, focused }
  }
  for (const mode of ['ai','verbatim','clip']) eq(dispatchAllowed(prefix, { scriptMode: mode, over: true }).dispatched, 0, 'generate real bloqueia excesso antes de navegar/renderizar: ' + mode)
  for (const mode of ['ai','verbatim','clip']) eq(dispatchAllowed(prefix, { scriptMode: mode }).dispatched, 1, 'controle abaixo do teto despacha uma vez: ' + mode)
  for (const mode of ['ai','verbatim','clip']) { const result = dispatchAllowed(prefix, { scriptMode: mode, prompt: 'https://example.invalid/script' }); eq(result.dispatched, 0, 'URL isolada não gera: ' + mode); eq(result.focused, 1, 'URL devolve foco para o texto: ' + mode) }
  eq(dispatchAllowed(prefix.replace('if (limit.over) return', 'if (false) return'), { scriptMode: 'clip', over: true }).dispatched, 1, 'mutante que ignora limite do clipe seria detectado')
  eq(dispatchAllowed(prefix.replaceAll('if (limit.over) return', 'if (false) return'), { scriptMode: 'ai', over: true }).dispatched, 1, 'mutante que ignora limite principal seria detectado')
  eq(dispatchAllowed(prefix.replace('if (isStandaloneHttpUrl(prompt))', 'if (false)'), { prompt: 'https://example.invalid/script' }).dispatched, 1, 'mutante que ignora URL seria detectado')
  const button = buttons.find(n => n.attributes.properties.some(a => ts.isJsxAttribute(a) && a.name.text === 'onClick' && a.initializer?.expression?.getText(ast) === 'generate'))
  const disabled = button?.attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.text === 'disabled')?.initializer?.expression.getText(ast)
  ok(disabled === '!prompt.trim() || limit.over || linkOnlyInput', 'botão Generate liga limite e bloqueio de URL reais')
  for (const [prompt, over, linkOnlyInput, expected] of [['',false,false,true],['story',true,false,true],['https://example.invalid',false,true,true],['story',false,false,false]]) eq(evaluate(disabled,{prompt,limit:{over},linkOnlyInput}),expected,'estado real do botão bloqueia só entradas recusadas')
  ok(src.includes('? `Trim ${limit.excess.toLocaleString(\'en-US\')} characters to continue`'), 'rotulo do botao diz quantos cortar')
  ok(src.includes('formatLimitCounter(limit)'), 'contador na caixa')
  ok(src.includes('✂ Trim to fit'), 'botao de corte de 1 clique')
  ok(src.includes('trimPromptToLimit(prompt, limit.max - suffixLen)'), 'corte deixa espaco para o sufixo da camera')
  ok(src.includes("trackEvent('studio_prompt_over_limit_shown'"), 'evento de medicao ao passar do teto')
  ok(src.includes("trackEvent('studio_prompt_trimmed_to_limit'"), 'evento de medicao do corte')
  ok(!/<textarea ref=\{promptRef\}[^>]*maxLength/.test(src), 'textarea SEM maxLength: colagem nunca e truncada em silencio')
  ok(src.includes('delete scene labels and visual notes'), 'dica honesta para roteiro verbatim com rubricas')
  // a tela seguinte continua com a propria regua (defesa em profundidade)
  const gen = read('app/(dashboard)/generate/GenerateClient.tsx')
  const genAst = ts.createSourceFile('GenerateClient.tsx', gen, 99, true, 4)
  let defense
  function findDefense(n) { if (ts.isIfStatement(n) && n.expression.getText(genAst) === 'sourceLen > promptMaxAqui') defense = n; ts.forEachChild(n, findDefense) }
  findDefense(genAst)
  ok(defense && ts.isBlock(defense.parent), 'GenerateClient mantém o próprio bloqueio real por modo')
  const block = defense.parent, index = block.statements.indexOf(defense)
  ok(block.statements[index - 1]?.getText(genAst) === 'const promptMaxAqui = analyzePromptMaxChars(scriptMode)' && block.statements[index + 1]?.getText(genAst).startsWith('const analyzeBody = JSON.stringify('), 'bloqueio usa a régua única e precede o payload/rede')
  for (const mode of ['ai','verbatim','clip']) for (const extra of [0,1]) {
    let errors = 0, failures = 0, idle = 0, dispatch = 0
    const run = evaluate('() => {\n' + defense.getText(genAst) + '\n dispatch() }', { sourceLen: limits.analyzePromptMaxChars(mode) + extra, promptMaxAqui: limits.analyzePromptMaxChars(mode), scriptMode: mode, setError: () => { errors++ }, trackGenerationFailure: () => { failures++ }, setPhase: p => { if(p==='idle')idle++ }, dispatch: () => { dispatch++ } })
    run()
    eq(dispatch, extra ? 0 : 1, 'Generate bloqueia antes da rede só acima do teto: ' + mode + '/' + extra)
    eq(errors + failures + idle, extra ? 3 : 0, 'excesso real informa erro, mede recusa e volta a idle: ' + mode + '/' + extra)
  }
}

console.log(`test-studio-prompt-limit: ${checks} verificacoes OK`)
