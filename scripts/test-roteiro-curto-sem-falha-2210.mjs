// KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — offline guardian: real files, AST extraction, VM and reversible disk mutants.
// No render, SDK, production, environment files, engineWall or homeVideoCuration are loaded.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const SELF = fileURLToPath(import.meta.url)
const require = createRequire(import.meta.url)
const ts = require('typescript')
const rootArg = process.argv.find((arg) => arg.startsWith('--root='))?.slice('--root='.length)
const ROOT = path.resolve(rootArg || process.env.TEST_ROOT || path.join(path.dirname(SELF), '..'))
const MUTANTS = process.argv.includes('--mutants')
const MARK = 'KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22'
const F = { generate: 'app/(dashboard)/generate/GenerateClient.tsx', studio: 'app/(dashboard)/studio/StudioClient.tsx', banner: 'components/ChatGptWelcomeBanner.tsx', input: 'lib/scriptInput.ts', admin: 'lib/admin/narrationCompletion.ts', live: 'app/api/admin/live/route.ts' }
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const parse = (rel, source = read(rel)) => ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
const nodes = (node, predicate) => { const found = []; const walk = (n) => { if (predicate(n)) found.push(n); ts.forEachChild(n, walk) }; walk(node); return found }
const sourceText = (node, sf) => node.getText(sf)
const calls = (node, name) => nodes(node, (n) => ts.isCallExpression(n) && n.expression.getText() === name)
const functionNode = (sf, name) => nodes(sf, (n) => (ts.isFunctionDeclaration(n) && n.name?.text === name) || (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))))[0]
const callable = (node) => ts.isVariableDeclaration(node) ? node.initializer : node
const declaration = (sf, name) => nodes(sf, (n) => ts.isVariableStatement(n) && n.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === name))[0]
const eventCalls = (node, event) => calls(node, 'trackEvent').filter((n) => n.arguments[0] && ts.isStringLiteral(n.arguments[0]) && n.arguments[0].text === event)
const effectFor = (sf, event) => calls(sf, 'useEffect').map((n) => n.arguments[0]).find((n) => n && eventCalls(n, event).length)
const transpile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText
const forbidden = (name) => () => { throw new Error('Offline guardian forbids ' + name) }
function sandbox(extra = {}) {
  return vm.createContext({ URL, URLSearchParams, console: { log() {}, warn() {}, error() {} }, fetch: forbidden('network'), setTimeout: forbidden('timer'), clearTimeout() {}, process: { env: { NODE_ENV: 'test' } }, ...extra })
}
function moduleFromDisk(rel) {
  const exports = {}
  const box = sandbox({ exports, require: forbidden('module import') })
  vm.runInContext(transpile(read(rel)), box, { timeout: 3000, filename: rel })
  return exports
}
function setup(extra = {}, sf = null) {
  const log = { setters: [], events: [], failures: [], writes: [], analyzes: [], generates: 0, expands: 0, requests: [], focus: 0 }
  const b = {
    phase: 'script_completion', mode: 'cinematic_ai', aiEngine: 'seedance', quality: 'cinematic_ai', duration: 60, language: 'en', prompt: 'An original idea', scriptMode: 'verbatim', authoring: false, expanding: false,
    authoredScript: null, authoredStillShort: null, expandedScript: null, expandedDurationAdjustment: null, expandState: null,
    scriptTooShort: { speechSeconds: 2, targetSeconds: 60, missingWords: 80 }, analysis: { title: 'Fresh analysis' },
    generationInFlightRef: { current: true }, approvedCompletionRef: { current: false }, completionClickRef: { current: false }, activationAutoGenerateRef: { current: true }, onboardingAutoGenerateRef: { current: true },
    structuredScriptRef: { current: null }, expandBaseRef: { current: null }, expandCandidateRef: { current: null }, expandRoundsRef: { current: { key: '', used: 0 } }, autoExpandFiredRef: { current: null }, completionOfferedRef: { current: null },
    generationAttemptRef: { current: 'old-released-attempt' }, preserveGenerationAttemptRef: { current: true },
    failedScreenLoggedRef: { current: '' }, sameFailureRef: { current: { signature: '', count: 0 } },
    largestFittingDuration: (seconds) => seconds >= 35 ? 35 : null, attemptKey: (base, seconds) => base + ':' + seconds, MAX_ROUNDS: 2,
    trackEvent: (name, metadata) => { log.events.push({ name, metadata }); return Promise.resolve() },
    trackGenerationFailure: (...args) => { log.failures.push(args) },
    handleWriteFullScript: (...args) => { log.writes.push(args); return Promise.resolve() },
    handleExpandScript: () => { log.expands++; return Promise.resolve() },
    handleAnalyze: (...args) => { log.analyzes.push(args); return Promise.resolve() },
    handleGenerate: () => { log.generates++; return Promise.resolve() },
    newGenerationAttemptId: () => 'new-approved-attempt',
    promptRef: { current: { focus: () => { log.focus++ } } },
  }
  if (sf) for (const call of nodes(sf, (n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && /^set[A-Z]/.test(n.expression.text))) {
    const name = call.expression.text
    if (!b[name]) b[name] = (value) => { log.setters.push([name, value]); b[name.slice(3, 4).toLowerCase() + name.slice(4)] = value }
  }
  Object.assign(b, extra)
  return { b, log, box: sandbox(b) }
}
function compiledFunction(sf, node, world, name = '__run') {
  if (!node) throw new Error('Missing AST function ' + name)
  const fn = callable(node)
  const expression = ts.isFunctionDeclaration(fn) ? fn.getText(sf).replace(/^(?:export\s+)?(?:default\s+)?/, '') : fn.getText(sf)
  const code = ts.isFunctionDeclaration(fn) ? expression + '\nglobalThis.__run = ' + fn.name.text : 'globalThis.__run = ' + expression
  vm.runInContext(transpile(code), world.box, { timeout: 3000 })
  return world.box.__run
}
async function invoke(sf, name, world, args = []) { return await compiledFunction(sf, functionNode(sf, name), world, name)(...args) }
async function effect(sf, node, world, args = []) { return await compiledFunction(sf, node, world)(...args) }
function executeStatements(sf, statements, world, expression) {
  if (statements.some((n) => !n)) throw new Error('Missing AST statement')
  vm.runInContext(transpile(statements.map((n) => n.getText(sf)).join('\n') + '\nglobalThis.__result = (' + expression + ')'), world.box, { timeout: 3000 })
  return world.box.__result
}

let passed = 0
const failures = []
const check = (condition, message) => { if (condition) passed++; else failures.push(message) }
async function group(name, run) { try { await run() } catch (e) { failures.push(name + ': ' + e.message) } }

async function checks() {
  const G = parse(F.generate), S = parse(F.studio), A = parse(F.live), B = parse(F.banner)
  const INPUT = moduleFromDisk(F.input), ADMIN = moduleFromDisk(F.admin)
  const withInput = (extra = {}, sf = G) => setup({ ...INPUT, ...extra }, sf)

  await group('URLs reais', async () => {
    const links = ['https://chatgpt.com/s/p_123', ' https://chatgpt.com/share/123\n', 'https://chat.openai.com/share/123', 'http://example.com/script', 'https://example.com/a?x=1#s', 'chatgpt.com/s/p_123', 'www.chatgpt.com/share/123', 'chat.openai.com/share/123', 'chatgpt.com/s/', 'chatgpt.com/share/', 'chat.openai.com/share/'] // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22
    for (const link of links) check(INPUT.isStandaloneHttpUrl(link) === true, 'URL isolada recusada: ' + link.trim())
    for (const text of ['A story about oceans https://example.com', 'https://example.com\nA story about oceans', 'A real script without links', '', null, undefined]) check(INPUT.isStandaloneHttpUrl(text) === false, 'Prosa/ausência continua utilizável: ' + String(text))
    check(INPUT.CHATGPT_LINK_MESSAGE === "We can't open ChatGPT links — paste the script text instead.", 'Mensagem de URL é a pedida pelo fundador')
    check(INPUT.originalIdeaFromArrival(new URLSearchParams({ idea: 'Original ocean idea', prompt: 'https://chatgpt.com/s/p_123', chatgpt_quickstart: 'finished_script' })) === 'Original ocean idea', 'Ideia original da chegada é preservada diante do link posterior')
    check(INPUT.originalIdeaFromArrival(new URLSearchParams({ idea: 'https://example.com', topic: 'Original forest idea' })) === 'Original forest idea', 'Fallback ignora URL e aceita ideia original válida')
    check(INPUT.originalIdeaFromArrival(new URLSearchParams({ prompt: 'https://example.com' })) === null && INPUT.usableOriginalIdea('https://chatgpt.com/s/p_123') === null, 'Nenhum fallback transforma URL em ideia')
    check(INPUT.originalIdeaFromArrival(new URLSearchParams({ prompt: 'finished script', chatgpt_quickstart: 'finished_script' })) === null, 'Roteiro pronto da chegada não é inventado como ideia original')
  })

  await group('Ramos 422 reais', async () => {
    const gen = callable(functionNode(G, 'handleGenerate'))
    const cinematic = nodes(gen, (n) => ts.isIfStatement(n) && n.expression.getText(G).includes('res.status === 422') && n.expression.getText(G).includes('narrationTooShort'))[0]
    const fast = nodes(gen, (n) => ts.isIfStatement(n) && n.expression.getText(G).includes('res.status === 422') && n.expression.getText(G).includes("'narration_too_short'"))[0]
    for (const [label, branch, data] of [['cinematic', cinematic, { narrationTooShort: true, speechSeconds: 2, missingWords: 100 }], ['Kineo 1', fast, { reason: 'narration_too_short', speech_seconds: 2, missing_words: 100 }]]) {
      check(Boolean(branch), label + ': ramo 422 existe no código real')
      if (!branch) continue
      const w = withInput({ res: { status: 422 }, data, offerScriptCompletion: (...args) => { w.log.writes.push(args) } })
      const wrapper = parse('branch.ts', 'async function branch(){' + branch.getText(G) + '\nglobalThis.__fellThrough = true }')
      await invoke(wrapper, 'branch', w)
      check(w.log.writes.length === 1 && w.log.writes[0][0] === 2 && w.log.writes[0][1] === 100, label + ': 422 chega à preparação neutra com medidas do servidor')
      check(!w.box.__fellThrough && w.log.failures.length === 0 && w.log.generates === 0 && !w.log.setters.some(([name, value]) => name === 'setPhase' && value === 'failed'), label + ': retorna sem falha, sem cair no erro genérico e sem render')
    }
  })

  await group('Oferta e escrita sem render', async () => {
    for (const seconds of [2, 20]) {
      const w = withInput()
      await invoke(G, 'offerScriptCompletion', w, [seconds, 100])
      check(w.log.setters.some(([n, v]) => n === 'setPhase' && v === 'script_completion') && !w.log.setters.some(([n, v]) => n === 'setPhase' && v === 'failed'), 'Oferta ' + seconds + 's: fase neutra sem failed')
      check(!w.box.approvedCompletionRef.current && !w.box.generationInFlightRef.current && !w.box.activationAutoGenerateRef.current && !w.box.onboardingAutoGenerateRef.current, 'Oferta ' + seconds + 's: nenhuma autorização automática fica armada')
      check(w.log.generates === 0 && w.log.failures.length === 0 && !w.log.events.some((e) => /^(?:video_generation_failed|generate_failed|generation_stage_error|generation_failed_screen_shown)$/.test(e.name)), 'Oferta ' + seconds + 's: zero render e zero telemetria de falha')
      check(w.log.writes.length === (seconds <= 12 ? 1 : 0), 'Oferta ' + seconds + 's: autor só para ideia curta; roteiro segue expansor')
    }
    const w = withInput({ fetchResilienteSemDinheiro: async (url, opts) => { w.log.requests.push([url, JSON.parse(opts.body)]); return { status: 200, ok: true, json: async () => ({ script: 'The complete approved story is ready.', stillShort: false, outcome: 'authored_ready', words: 7, minWords: 7, targetSeconds: 60 }) } } })
    await invoke(G, 'handleWriteFullScript', w, [{ speechSeconds: 2, targetSeconds: 60 }])
    check(w.log.requests.length === 1 && w.log.requests[0][0] === '/api/generate-script' && w.log.requests[0][1].forceAuthoring === true && w.log.requests[0][1].targetSeconds === 60, 'Autor executa request real de escrita com alvo e forceAuthoring')
    check(w.log.setters.some(([n, v]) => n === 'setAuthoredScript' && v === 'The complete approved story is ready.') && w.log.generates === 0 && w.log.analyzes.length === 0, 'Texto entregue fica disponível antes de qualquer análise/render')
    const expansion = effectFor(G, 'script_expand_autostarted')
    for (const [seconds, authoring, expected] of [[2, false, 0], [20, true, 0], [20, false, 1]]) {
      const world = withInput({ scriptTooShort: { speechSeconds: seconds, targetSeconds: 60, missingWords: 100 }, authoring })
      await effect(G, expansion, world)
      check(world.log.expands === expected, 'Sem corrida autor/expansor: fala=' + seconds + ', authoring=' + authoring)
    }
  })

  await group('Guardas reais antes da rede', async () => {
    for (const [name, extra, args] of [
      ['handleAnalyze', { overridePrompt: undefined }, ['https://chatgpt.com/s/p_123']],
      ['handleGenerate', {}, []],
      ['handleWriteFullScript', {}, [{ speechSeconds: 2, targetSeconds: 60 }]],
      ['handleExpandScript', {}, []],
    ]) {
      const w = withInput({ prompt: 'https://chatgpt.com/s/p_123', structuredScriptRef: { current: null }, fetchResilienteSemDinheiro: async () => { w.log.requests.push('writer'); throw new Error('URL reached writer') }, ...extra })
      await invoke(G, name, w, args)
      check(w.log.requests.length === 0 && w.log.generates === 0 && w.log.analyzes.length === 0 && w.log.setters.some(([n, v]) => n === 'setScriptLinkRejected' && v === true), name + ': URL retorna antes de escritor, análise ou despacho')
    }
    for (const field of ['expandBaseRef', 'expandCandidateRef']) {
      const w = withInput({ [field]: { current: 'https://example.com/script' } })
      await invoke(G, 'handleExpandScript', w)
      check(w.log.setters.some(([n, v]) => n === 'setScriptLinkRejected' && v === true), 'Expansão também recusa URL no ref ' + field)
    }
    for (const name of ['generate', 'generateClip']) {
      const w = withInput({ prompt: 'https://chatgpt.com/share/123', scriptMode: 'ai' }, S)
      await invoke(S, name, w)
      check(w.log.focus === 1 && w.log.requests.length === 0, 'Studio ' + name + ': URL não cria token, navega ou chama servidor')
    }
    const quickChoice = declaration(S, 'quickstartChoice')
    const w = withInput({ p: 'https://chatgpt.com/s/p_123', sp: new URLSearchParams({ chatgpt_quickstart: 'finished_script' }) }, S)
    check(executeStatements(S, [quickChoice], w, 'quickstartChoice') === null, 'Studio: URL da chegada nunca é classificada finished_script')
    const selectAttr = nodes(B, (n) => ts.isJsxAttribute(n) && n.name.getText(B) === 'onSelect' && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression && ts.isArrowFunction(n.initializer.expression))[0]
    const bw = withInput({ buildChatGptQuickstartHref: () => { bw.log.requests.push('classified'); return '/studio' }, router: { push: () => { bw.log.requests.push('navigated') } } }, B)
    await effect(B, selectAttr.initializer.expression, bw, ['finished_script', 'https://example.com'])
    check(bw.log.requests.length === 0 && bw.log.events.length === 0, 'Banner: URL não é classificada, registrada como roteiro pronto ou enviada ao Studio')
  })

  await group('C1: aceite, duração e nova tentativa', async () => {
    for (const [name, field] of [['acceptAuthoredScript', 'authoredScript'], ['acceptExpandedScript', 'expandedScript']]) {
      const text = 'The exact script visible to the customer.'
      const w = withInput({ [field]: text, expandedDurationAdjustment: name === 'acceptExpandedScript' ? { requestedSeconds: 60, effectiveSeconds: 35 } : null })
      await invoke(G, name, w)
      await invoke(G, name, w)
      const accepted = w.log.analyzes[0]
      check(w.log.analyzes.length === 1 && accepted[0] === text && accepted[1].completionApproved === true && accepted[1].skipPreview === true && accepted[1].scriptModeOverride === 'verbatim' && w.box.structuredScriptRef.current === text, name + ': só o clique aprova exatamente o texto mostrado')
      check(w.log.generates === 0 && w.log.setters.some(([n, v]) => n === 'setScriptMode' && v === 'verbatim'), name + ': análise vem antes do envio e modo literal é preservado')
      if (name === 'acceptExpandedScript') check(accepted[1].targetSeconds === 35 && w.log.setters.some(([n, v]) => n === 'setDuration' && v === 35), 'Expansão 60→35s: duração visível persistida no estado E no override da análise')
      for (const value of ['', 'https://chatgpt.com/s/p_123']) {
        const invalid = withInput({ [field]: value })
        await invoke(G, name, invalid)
        check(invalid.log.analyzes.length === 0 && invalid.log.generates === 0, name + ': texto vazio/URL não autoriza análise ou filme')
      }
    }
    const analyzer = callable(functionNode(G, 'handleAnalyze'))
    const attemptReset = nodes(analyzer, (n) => ts.isIfStatement(n) && n.thenStatement.getText(G).includes('generationAttemptRef.current = newGenerationAttemptId()'))[0]
    const w = withInput({ phase: 'script_completion' })
    executeStatements(G, [attemptReset], w, 'generationAttemptRef.current')
    check(w.box.generationAttemptRef.current === 'new-approved-attempt' && w.box.preserveGenerationAttemptRef.current === false, 'Aceite da conclusão ganha UUID novo: claim liberado nunca é reutilizado')
    const retry = withInput({ phase: 'options', preserveGenerationAttemptRef: { current: false } })
    executeStatements(G, [attemptReset], retry, 'generationAttemptRef.current')
    check(retry.box.generationAttemptRef.current === 'old-released-attempt', 'Análise/reconexão fora de conclusão mantém identidade existente')
    const continuation = calls(G, 'useEffect').map((n) => n.arguments[0]).find((n) => n && n.getText(G).includes('approvedCompletionRef.current') && calls(n, 'handleGenerate').length)
    for (const [phase, approved, hasAnalysis, expected] of [['script_completion', false, true, 0], ['options', false, true, 0], ['options', true, false, 0], ['options', true, true, 1]]) {
      const w = withInput({ phase, approvedCompletionRef: { current: approved }, analysis: hasAnalysis ? { title: 'Fresh' } : null })
      await effect(G, continuation, w)
      await effect(G, continuation, w)
      check(w.log.generates === expected, 'Continuação exige clique + análise e consome uma vez: ' + [phase, approved, hasAnalysis].join('/'))
    }
    const card = nodes(G, (n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && n.left.getText(G).includes("phase === 'script_completion'") && n.right.getText(G).includes('acceptAuthoredScript'))[0]
    check(Boolean(card) && card.getText(G).includes('value={authoredScript}') && card.getText(G).includes('value={expandedScript}') && card.getText(G).includes('onClick={acceptAuthoredScript}') && card.getText(G).includes('onClick={acceptExpandedScript}'), 'Card neutro mostra as duas caixas de texto antes dos botões de aprovação')
    let gatedByRender = false
    for (let ancestor = card?.parent; ancestor; ancestor = ancestor.parent) if (ts.isBinaryExpression(ancestor) && ancestor.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && ancestor.left.getText(G).includes('showRender')) gatedByRender = true
    check(Boolean(card) && !gatedByRender, 'Card de conclusão é visível fora do wrapper showRender')
  })

  await group('Telemetria offered e ausência de failed', async () => {
    const offered = effectFor(G, 'script_completion_offered')
    for (const kind of ['authored', 'expanded']) {
      const w = withInput({ authoredScript: kind === 'authored' ? 'One two three four.' : null, expandedScript: kind === 'expanded' ? 'One two three four.' : null, expandedDurationAdjustment: kind === 'expanded' ? { effectiveSeconds: 35 } : null })
      await effect(G, offered, w); await effect(G, offered, w)
      const events = w.log.events.filter((e) => e.name === 'script_completion_offered')
      check(events.length === 1 && events[0].metadata.speech_seconds === 2 && events[0].metadata.target_seconds === (kind === 'expanded' ? 35 : 60) && events[0].metadata.words_after === 4, kind + ': script_completion_offered uma vez com medidas reais e words_after')
    }
    for (const extra of [{ authoredScript: null }, { authoredScript: 'Too short', authoredStillShort: { words: 2, minWords: 60 } }, { phase: 'failed', authoredScript: 'Complete text' }]) {
      const w = withInput(extra); await effect(G, offered, w)
      check(w.log.events.length === 0, 'Sem roteiro pronto visível não há script_completion_offered: ' + JSON.stringify(extra))
    }
    const screen = declaration(G, 'failureScreenKind')
    const failureEffect = effectFor(G, 'generation_failed_screen_shown')
    const w = withInput({ phase: 'script_completion', qualityFailure: null, creditsHeld: null })
    const kind = executeStatements(G, [screen], w, 'failureScreenKind')
    w.box.failureScreenKind = kind
    await effect(G, failureEffect, w)
    check(kind === null && w.log.events.length === 0, 'Conclusão nunca emite generation_failed_screen_shown')
  })

  await group('Admin: histórico correto sem esconder falhas reais', async () => {
    const cases = [
      [{ name: 'script_completion_offered' }, true], [{ name: 'script_authoring_auto_started' }, true],
      [{ name: 'video_generation_failed', metadata: { narrationTooShort: true } }, true],
      [{ name: 'video_generation_failed', metadata: { reason: 'narration_too_short' } }, true],
      [{ name: 'generate_failed', metadata: { cause: 'narration_short' } }, true],
      [{ name: 'video_generation_failed', metadata: { error: 'Your script is about 2 seconds of narration' } }, true],
      [{ name: 'video_generation_failed', metadata: { error: 'no_detail:narration_too_short|stage=failed|http=none' } }, true],
      [{ name: 'video_generation_failed', metadata: { reason: 'provider_unavailable' } }, false],
      [{ name: 'video_generation_failed' }, false], [{ name: 'video_generation_started', metadata: { reason: 'narration_too_short' } }, false],
    ]
    for (const [event, expected] of cases) check(ADMIN.isNarrationCompletionEvent(event) === expected, 'Admin classifica evento real: ' + JSON.stringify(event))
    const vars = ['names', 'iCompletion', 'iAttempt', 'aguardandoRoteiro', 'tentouGerar', 'falhouNaJanela', 'newestIdx', 'iStart', 'iDoneCandidates', 'iDone', 'rendering', 'failed'].map((name) => declaration(A, name))
    const start = { name: 'video_generation_started' }, short = { name: 'video_generation_failed', metadata: { reason: 'narration_too_short' } }, real = { name: 'video_generation_failed', metadata: { reason: 'provider_unavailable' } }, offered = { name: 'script_completion_offered' }
    for (const [details, failed, rendering] of [[[short, start], 0, false], [[real, short, start], 1, false], [[{ name: 'video_generation_failed' }, short, start], 1, false], [[offered, start], 0, false], [[start, offered], 0, true]]) {
      const w = setup({ row: { details, events: details.map((e) => e.name) }, isNarrationCompletionEvent: ADMIN.isNarrationCompletionEvent })
      const actual = executeStatements(A, vars, w, '({failed, rendering, aguardandoRoteiro, falhouNaJanela})')
      check(actual.failed === failed && actual.rendering === rendering, 'Admin executa agregação real: ' + details.map((e) => e.name + ':' + (e.metadata?.reason ?? '')).join(',') + ' → failed=' + failed + ',rendering=' + rendering)
    }
    check(read(F.live).includes('created_at, metadata, is_bot:metadata->>is_bot') && read(F.live).includes('details: [row]'), 'Live carrega e conserva metadata por evento para não apagar falha da pessoa inteira')
  })
  return { passed, failures }
}

function replaceNode(source, sf, node, replacement) {
  if (!node) throw new Error('Mutant target missing')
  return source.slice(0, node.getStart(sf)) + replacement + source.slice(node.end)
}
function replaceOnce(source, before, after) {
  const at = source.indexOf(before)
  if (at < 0) throw new Error('Mutant anchor missing: ' + before)
  return source.slice(0, at) + after + source.slice(at + before.length)
}
function mutantFunctionBody(rel, name, replacement) {
  return (source) => { const sf = parse(rel, source), fn = callable(functionNode(sf, name)); return replaceNode(source, sf, fn.body, replacement) }
}
const mutants = [
  ['phase-failed', F.generate, (s) => replaceOnce(s, "setPhase('script_completion')", "setPhase('failed')")],
  ['failure-cause', F.generate, (s) => replaceOnce(s, 'function offerScriptCompletion(speechSeconds: number, missingWords: number) {', "function offerScriptCompletion(speechSeconds: number, missingWords: number) { trackGenerationFailure('generating', 'narration_too_short');")],
  ['url-false', F.input, mutantFunctionBody(F.input, 'isStandaloneHttpUrl', '{ return false }')],
  ['studio-url-bypass', F.studio, (s) => { const sf = parse(F.studio, s), fn = callable(functionNode(sf, 'generate')), guard = nodes(fn, (n) => ts.isIfStatement(n) && n.expression.getText(sf) === 'isStandaloneHttpUrl(prompt)')[0]; return replaceNode(s, sf, guard, '/* mutant: URL guard removed */') }],
  ['admin-counts-short', F.admin, mutantFunctionBody(F.admin, 'isNarrationCompletionEvent', '{ return false }')],
  ['c1-auto-render', F.generate, (s) => replaceOnce(s, 'function offerScriptCompletion(speechSeconds: number, missingWords: number) {', 'function offerScriptCompletion(speechSeconds: number, missingWords: number) { void handleGenerate();')],
  ['reuse-released-attempt', F.generate, (s) => replaceOnce(s, " || phase === 'script_completion') {", ') {')],
  ['stale-duration', F.generate, (s) => replaceOnce(s, 'if (ajusteDuracao) setDuration(ajusteDuracao.effectiveSeconds as Duration)', 'if (false && ajusteDuracao) setDuration(ajusteDuracao.effectiveSeconds as Duration)')],
  ['offered-wrong-words', F.generate, (s) => replaceOnce(s, "words_after: ready.trim().split(/\\s+/).filter(Boolean).length", 'words_after: 0')],
  ['writer-url-bypass', F.generate, (s) => { const sf = parse(F.generate, s), fn = callable(functionNode(sf, 'handleWriteFullScript')), guard = nodes(fn, (n) => ts.isIfStatement(n) && n.expression.getText(sf) === 'isStandaloneHttpUrl(ideia)')[0]; return replaceNode(s, sf, guard, '/* mutant: writer URL guard removed */') }],
]

function diskMutants() {
  let caught = 0
  const backups = new Map()
  try {
    for (const [name, rel, mutate] of mutants) {
      const target = path.resolve(ROOT, rel)
      if (!target.startsWith(ROOT + path.sep)) throw new Error('Mutant escaped workspace')
      const original = fs.readFileSync(target)
      backups.set(target, original)
      try {
        const changed = Buffer.from(mutate(original.toString('utf8')))
        if (changed.equals(original)) throw new Error('Mutant did not change bytes: ' + name)
        fs.writeFileSync(target, changed)
        if (!fs.readFileSync(target).equals(changed)) throw new Error('Mutant did not reach disk: ' + name)
        const child = spawnSync(process.execPath, [SELF, '--root=' + ROOT], { cwd: ROOT, encoding: 'utf8', timeout: 45000, windowsHide: true })
        if (child.error) throw child.error
        if (child.status === 0 || !String(child.stdout).includes('FAIL')) throw new Error('Mutant survived or failed without guardian assertion: ' + name + '\n' + child.stdout + child.stderr)
        caught++
        console.log('  mutant rejected: ' + name)
      } finally {
        fs.writeFileSync(target, original)
        if (!fs.readFileSync(target).equals(original)) throw new Error('Exact undo failed: ' + rel)
      }
    }
  } finally {
    for (const [target, original] of backups) {
      if (!fs.readFileSync(target).equals(original)) fs.writeFileSync(target, original)
      if (!fs.readFileSync(target).equals(original)) throw new Error('Final byte audit failed: ' + target)
    }
  }
  console.log('Disk mutants: ' + caught + '/' + mutants.length + ' rejected; exact Buffer undo verified.')
  if (caught !== mutants.length) throw new Error('Incomplete mutant set')
}

try {
  const result = await checks()
  for (const failure of result.failures) console.log('FAIL ' + failure)
  console.log(MARK + ': ' + result.passed + ' passed, ' + result.failures.length + ' failed.')
  if (result.failures.length) process.exitCode = 1
  else if (MUTANTS) {
    diskMutants()
    const positive = spawnSync(process.execPath, [SELF, '--root=' + ROOT], { cwd: ROOT, encoding: 'utf8', timeout: 45000, windowsHide: true })
    if (positive.status !== 0) throw new Error('Positive control failed after exact undo:\n' + positive.stdout + positive.stderr)
    console.log('Positive control after undo: ' + positive.stdout.trim())
  }
} catch (e) {
  console.log('FAIL ' + e.message)
  process.exitCode = 1
}
