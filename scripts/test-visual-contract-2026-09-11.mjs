// Offline executable checks: actual route AST/caller + actual builders/still
// code, mocked only at OpenAI/Fal I/O. No credentials, env files or network.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, createHmac } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(join(root, p), 'utf8')
const parse = p => ts.createSourceFile(p, read(p), ts.ScriptTarget.Latest, true)
const route = parse('app/api/generate-video-cinematic/route.ts')
const router = parse('lib/hollywood/router.ts')
let checks = 0
const check = (condition, message) => { assert.ok(condition, message); checks++ }
function find(source, predicate) {
  let found
  function visit(node) { if (!found && predicate(node)) found = node; if (!found) ts.forEachChild(node, visit) }
  visit(source)
  assert.ok(found, 'Actual source node missing')
  return found
}
const variable = (source, name) => find(source, n => ts.isVariableDeclaration(n) && n.name.getText(source) === name)
const varSource = (source, name) => `const ${name} = ${variable(source, name).initializer.getText(source)};`
const functionSource = (source, name) => find(source, n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(source)
const noNetwork = () => { throw new Error('Network is forbidden in this test') }
function execute(source, globals = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, console: { log() {}, warn() {}, error() {} }, process: { env: {} }, fetch: noNetwork, ...globals })
  return exports
}
const allowed = new Set(['lib/aspect.ts', 'lib/cinematic/sceneStyle.ts', 'lib/cinematic/visualMode.ts',
  'lib/cinematic/visualPromptPolicy.ts', 'lib/cinematic/sceneTruth.ts', 'lib/cinematic/sceneDisposition.ts', 'lib/cinematic/dispatchScenes.ts', 'lib/engineFit.ts'])
const cache = new Map()
function load(path) {
  path = path.replaceAll('\\', '/')
  if (cache.has(path)) return cache.get(path)
  assert.ok(allowed.has(path), `Unexpected dependency: ${path}`)
  const exports = execute(read(path), { require(id) {
    if (id === 'node:crypto') return { createHmac }
    return load(join(dirname(path), id + '.ts'))
  } })
  cache.set(path, exports)
  return exports
}
const style = load('lib/cinematic/sceneStyle.ts')
const policy = load('lib/cinematic/visualPromptPolicy.ts')
const aspect = load('lib/aspect.ts')
const visualMode = load('lib/cinematic/visualMode.ts')
const truth = load('lib/cinematic/sceneTruth.ts')
const dispatch = load('lib/cinematic/dispatchScenes.ts')
const routerNames = ['HOLLYWOOD_MODELS', 'KLING3_I2V_MODEL', 'H3_MODELS', 'H3_I2V_MODEL', 'H3_RESOLUTION',
  'OMNI_I2V_MODEL', 'S25_I2V_MODEL', 'S25_T2V_MODEL', 'S25_RESOLUTION',
  'CONTEMPORARY_FIGURE_RE', 'HISTORICAL_FIGURE_RE', 'HISTORICAL_TITLE_NAME_RE']
const providerConstants = execute(routerNames.map(n => varSource(router, n)).join('\n') + '\n' +
  functionSource(router, 'sanitizeRealPeople') + `\nObject.assign(exports, { ${routerNames.join(', ')} });`)
const modelNames = ['SEEDANCE_MODEL', 'KLING_MODEL', 'KLING_I2V_MODEL', 'VEO_MODEL', 'SORA_MODEL', 'KLING3_MODEL']
const routeHelpers = execute(modelNames.map(n => varSource(route, n)).join('\n') + '\n' +
  functionSource(route, 'buildFalInput') + `\nObject.assign(exports, { buildFalInput, ${modelNames.join(', ')} });`,
  { ...providerConstants, ...aspect, ...policy })

// Execute the actual mode/style resolution too, not just an injected policy.
const policyStart = variable(route, 'styleAnchor').parent.parent.getStart(route)
const policyEnd = variable(route, 'classicVisualPolicy').parent.parent.end
const policyCaller = route.text.slice(policyStart, policyEnd)
for (const test of [
  { prompt: 'An anime story about a young woman in Kyoto', expectedMode: 'character_story', expectedLook: 'anime' },
  { prompt: 'A presenter explains the Kyoto railway history in anime style', expectedMode: 'presenter', expectedLook: 'anime' },
  { prompt: '[faceless] Anime documentary about the Kyoto railway', expectedMode: 'documentary_faceless', expectedLook: 'anime' },
  { prompt: 'Film noir documentary about the Kyoto railway in 1930', expectedMode: 'documentary_faceless', expectedLook: 'noir' },
  { prompt: 'Documentary about Kyoto', explicit: ', anime cel shading', expectedMode: 'character_story', expectedLook: 'anime' },
]) {
  const tag = /\[faceless\]/i.test(test.prompt)
  const resolved = execute(policyCaller + '\nexports.policy = classicVisualPolicy;', {
    ...style, ...policy, ...load('lib/engineFit.ts'), prompt: test.prompt,
    planScenes: [{ brollPrompt: 'Kyoto railway' }], styleSuffix: test.explicit || '',
    formatoVisual: visualMode.decidirFormato(test.prompt, tag), tagFacelessPresente: tag, aspectRequested: '16:9',
  }).policy
  check(resolved.mode === test.expectedMode && resolved.style.look === test.expectedLook && resolved.aspect === '16:9', 'Actual resolution honors explicit mode/style and framing')
}

class FakeSubmitError extends Error {
  constructor(message, options) { super(message); Object.assign(this, options) }
}
const start = variable(route, 'contratoRelatoClassico').parent.parent.getStart(route)
const end = variable(route, 'submitScene').parent.parent.end
const actualClassicCaller = route.text.slice(start, end)
const runs = []
async function run({ look = 'photoreal', mode = 'character_story', frame = '16:9', model = routeHelpers.VEO_MODEL,
  anchored = false, responses = [{ ok: true }], visual = 'Mira, a young woman, opens a red parcel at the Kyoto train station in 1930',
  narration = 'Mira opens a red parcel at the Kyoto train station in 1930.',
  // CLASSICOS-R2 (14/09): scenes planned by the actual entry chain (below) may
  // replace the fixture pair; every existing call leaves this undefined.
  scenesOverride,
  // CLASSICOS-R5 (14/09): the entry chain derives the era with the actual
  // eraLockSuffix instead of the Kyoto-1930 fixture; every existing call
  // leaves this undefined and keeps the fixture string.
  eraSuffix = ', period piece set strictly in the year 1930, no modern objects' } = {}) {
  const scene = scenesOverride ? scenesOverride[0] : { description: visual, aiPrompt: visual, stockSearchQuery: 'generic landscape', voiceover: narration }
  const scenes = scenesOverride ?? [scene, { ...scene, aiPrompt: 'Mira carries the parcel across the same Kyoto station' }]
  const anchor = style.deriveStyleAnchor(look === 'anime' ? 'anime' : look === 'animated3d' ? '3D animated film' : look === 'noir' ? 'film noir' : '')
  const calls = [], stills = []
  const context = { outcomes: [], submittedPrompts: [], attempts: [], totalPosts: 0, balanceExhausted: false }
  const mockFal = { config() {}, queue: { status: async () => ({ status: 'COMPLETED' }), result: async () => ({ data: { images: [{ url: 'https://fixture.invalid/still.png' }] } }) } }
  const anchors = execute(read('lib/hollywood/anchors.ts'), {
    process: { env: { FAL_KEY: 'offline-fixture-not-a-secret' } },
    require(id) {
      if (id === '@fal-ai/client') return { fal: mockFal }
      if (id === '@/lib/aspect') return aspect
      if (id === '@/lib/falQueue') return { FalQueueSubmitError: FakeSubmitError, submitFalQueueOnce: async (m, input) => { stills.push({ model: m, input }); return 'fixture-still' } }
      throw new Error(`Unexpected still dependency ${id}`)
    },
  })
  const globals = { ...aspect, ...policy, ...truth, ...visualMode, ...dispatch, ...providerConstants, ...routeHelpers, ...style,
    body: { dry_run: false },
    scenes, classicVisualPolicy: { mode, style: anchor, character: mode === 'documentary_faceless' ? null : 'Mira, a young woman', aspect: frame },
    classicVisualMode: mode, storyCharacter: mode === 'documentary_faceless' ? null : 'Mira, a young woman', styleAnchor: anchor,
    eraSuffix, aspectRequested: frame,
    wantsKling: anchored, CINEMATIC_ANCHOR_ENABLED: anchored, generationId: 'offline-generation', generationSeed: 17,
    hd: false, KLING_CREDIT_COST: 50, ANCHORS_USD: anchors.ANCHORS_USD, providerSubmissionMayExist: false,
    generateCinematicSceneStill: anchors.generateCinematicSceneStill, FalQueueSubmitError: FakeSubmitError,
    ctxDespacho: () => context,
    submitFalQueueOnce: async (m, input, onPost) => {
      onPost(); calls.push({ model: m, input })
      const response = responses[Math.min(calls.length - 1, responses.length - 1)]
      if (!response.ok) throw new FakeSubmitError(response.message || 'provider rejected', { status: response.status, ambiguous: !!response.ambiguous })
      return 'fixture-accepted'
    },
  }
  const api = execute(`exports.run = async () => { ${actualClassicCaller}\n return { submitScene, classicScenePrompts, sceneStills, contratoRelatoClassico }; }`, globals)
  const prepared = await api.run()
  const result = await prepared.submitScene(scenes[0], model, 0, anchored ? prepared.sceneStills[0] : undefined)
  const run = { calls, stills, result, prepared, context, anchor, scene }
  runs.push(run)
  return run
}

for (const model of [routeHelpers.SEEDANCE_MODEL, routeHelpers.VEO_MODEL, routeHelpers.KLING_MODEL, routeHelpers.SORA_MODEL]) {
  for (const mode of ['documentary_faceless', 'character_story', 'presenter']) {
    for (const look of ['photoreal', 'anime']) {
      const r = await run({ model, mode, look })
      const input = r.calls[0].input
      check(r.calls.length === 1 && r.result.id === 'fixture-accepted', 'Successful clip is submitted once')
      check(input.prompt.includes('Kyoto') && input.prompt.includes('1930'), 'Actual caller preserves location/era')
      check(input.prompt.includes('16:9') && !input.prompt.includes('9:16'), 'Positive prompt matches payload orientation')
      check(input.prompt.includes('Opening shot:') && !r.prepared.classicScenePrompts[1].includes('Opening shot:'), 'Opening direction is only on first scene')
      check(!/empty scene|Show only an empty environment/i.test(input.prompt), 'No invented empty-landscape opening')
      check((input.seed === 17 || model === routeHelpers.SORA_MODEL) && input.generate_audio !== true, 'Classic seed/audio contract unchanged')
      if (mode !== 'documentary_faceless') {
        check(input.prompt.includes('Mira') && input.prompt.includes('young woman'), 'Protagonist survives the actual caller')
        check(!/(?:^|,\s*)(?:people|person|human|face|human face|crowd)(?:,|$)/.test(input.negative_prompt || ''), 'No blanket people ban in character/presenter payload')
      }
      if (look === 'anime') {
        check(input.prompt.includes('anime'), 'Requested anime survives the positive prompt')
        check(!/cartoon|anime|illustration|3d render/.test(input.negative_prompt || ''), 'Negative prompt does not prohibit the approved style')
      }
      if (mode === 'presenter') check(!/talking head|presenter|looking directly/.test(input.negative_prompt || ''), 'Presenter is not prohibited')
      if (model === routeHelpers.SEEDANCE_MODEL) check(!('negative_prompt' in input), 'Seedance schema gets no unsupported negative_prompt')
      if (model === routeHelpers.VEO_MODEL) check(input.safety_tolerance === '5', 'Veo moderation setting unchanged')
    }
  }
}

for (const frame of ['9:16', '16:9', '1:1', '4:5']) {
  const r = await run({ model: routeHelpers.KLING_MODEL, anchored: true, look: 'anime', frame })
  check(r.stills.length === 2 && r.calls.length === 1, 'Anchor count unchanged; no extra paid calls')
  check(r.stills[0].input.prompt.startsWith(r.prepared.classicScenePrompts[0]), 'Actual still caller uses the corrected clip prompt before submission')
  check(r.stills[0].input.image_size === aspect.aspectSpec(frame).fluxImageSize, 'FLUX image dimensions match the requested frame')
  check(r.stills[0].input.enable_safety_checker === true, 'FLUX moderation guard retained')
  check(r.stills[0].input.prompt.includes('Mira') && r.stills[0].input.prompt.includes('anime'), 'Still retains protagonist and anime')
  check(!/portrait, photorealistic|no people|empty scene/.test(r.stills[0].input.prompt), 'Still cannot overwrite story with old faceless photoreal suffix')
  check(r.calls[0].model === routeHelpers.KLING_I2V_MODEL && r.calls[0].input.image_url, 'Actual clip uses its still')
}

for (const status of [400, 422]) {
  const r = await run({ look: 'anime', responses: [{ status }, { ok: true }] })
  check(r.calls.length === 2 && r.result.id === 'fixture-accepted', 'Explicit payload rejection permits existing one safe retry')
  const p = r.calls[1].input.prompt
  for (const expected of ['Mira', 'parcel', 'Kyoto', '1930', 'anime', '16:9', 'Opening shot:']) check(p.includes(expected), `Fallback preserves ${expected}`)
  check(!/generic landscape|empty environment|no people/.test(p), 'Fallback prioritizes scene visual over stock keyword fallback')
}
for (const response of [{ status: 403, message: 'content policy violation' }, { status: 403 }, { status: 429 }, { status: 500, ambiguous: true }, { status: null, ambiguous: true }]) {
  const r = await run({ responses: [response, { ok: true }] })
  const allowedRetry = response.message === 'content policy violation'
  check(r.calls.length === (allowedRetry ? 2 : 1), 'Retry/moderation/ambiguity spend-safety gate unchanged')
}
{
  const r = await run({ model: routeHelpers.KLING_MODEL, anchored: true, look: 'anime', responses: [{ status: 422 }, { ok: true }] })
  check(r.calls.length === 2 && r.calls[0].model === routeHelpers.KLING_I2V_MODEL && r.calls[1].model === routeHelpers.KLING_MODEL, 'Rejected i2v uses the existing t2v fallback, not a new engine')
  check(r.calls[1].input.image_url === undefined && r.calls[1].input.prompt === r.calls[0].input.prompt, 't2v keeps the same corrected scene without an invalid image param')
  check(!/anime/.test(r.calls[1].input.negative_prompt), 't2v fallback keeps the approved animation policy')
  const ambiguous = await run({ model: routeHelpers.KLING_MODEL, anchored: true, responses: [{ status: 500, ambiguous: true }] })
  check(ambiguous.calls.length === 1 && ambiguous.result.kind === 'ambiguous', 'Ambiguous i2v never spends on another clip')
}
const empty = dispatch.buildContextualSafeVisualPrompt('https://fixture.invalid')
check(empty === '', 'No context does not invent a generic replacement scene')
const safe = dispatch.buildContextualSafeVisualPrompt('Mira sees a bloody murder with a gun in Kyoto https://fixture.invalid x@fixture.invalid', {
  mode: 'character_story', style: style.deriveStyleAnchor('anime'), character: 'Mira', aspect: '16:9', opening: true,
})
check(!/bloody|murder|\bgun\b|https|@/.test(safe), 'Safe retry retains sensitive-term and URL removal')
check(safe.includes('Mira') && safe.includes('Kyoto') && safe.includes('anime'), 'Moderation neutralization retains safe context/style')
const oversized = dispatch.buildContextualSafeVisualPrompt('x'.repeat(10000), {
  mode: 'character_story', style: { look: 'anime', lookPhrase: 'x'.repeat(10000), suffix: 'x'.repeat(10000) },
  character: 'x'.repeat(10000), eraSuffix: 'x'.repeat(10000), opening: true,
})
check(oversized.length < 2800, 'Safe fallback is bounded even for oversized single words in every input field')
check(style.deriveStyleAnchor('ordinary photoreal landscape', ', anime cel shading').look === 'anime', 'Explicit client style governs the look')
check(!policy.isStylizedLook(style.deriveStyleAnchor('film noir')), 'Noir is not incorrectly treated as cartoon')
check(!/vertical|9:16|portrait/.test(policy.applyVisualFraming('Cinematic vertical 9:16 portrait shot of Kyoto', '16:9')), 'Legacy planner orientation cannot contradict widescreen')
const volcanoNarration = 'Anak Krakatau released an ash plume above the Sunda Strait in 2018.'
const volcano = await run({ mode: 'documentary_faceless', visual: 'Anak Krakatau crater releasing an ash plume above the Sunda Strait in 2018', narration: volcanoNarration, responses: [{ status: 422 }, { ok: true }] })
check(volcano.calls.every(c => /Anak Krakatau/.test(c.input.prompt) && /Sunda Strait/.test(c.input.prompt) && /Opening shot:/.test(c.input.prompt)), 'Named hook subject/location survive initial and safe fallback payloads')
check(volcano.scene.voiceover === volcanoNarration, 'Visual preparation never rewrites narration')

const openaiCalls = []
const descriptions = execute(functionSource(route, 'generateCinematicDescriptions') + '\nexports.generate = generateCinematicDescriptions;', {
  ...aspect, ...policy, openai: { chat: { completions: { create: async input => {
    openaiCalls.push(input); return { choices: [{ message: { content: '{"descriptions":["Mira opens the parcel in Kyoto"]}' } }] }
  } } } },
})
await descriptions.generate([{ voiceover: 'Mira opens the parcel.', description: 'Mira in Kyoto' }], 'Mira story', {
  mode: 'character_story', style: style.deriveStyleAnchor('anime'), aspect: '16:9',
})
const instructions = openaiCalls[0].messages[0].content
check(openaiCalls.length === 1, 'Description pass remains one existing call, not additional generation')
check(instructions.includes('anime') && instructions.includes('16:9') && instructions.includes('scene 1'), 'Actual description payload carries style/frame/opening')
check(!/FACELESS only|Vertical 9:16|same dark cinematic mood/.test(instructions), 'Descriptions do not reintroduce the old forced format')

// Optional initial-planner contract. Goldens were captured from the unchanged
// legacy generateScenes at c5ed4776 on 2026-09-11 and RECAPTURED on 2026-09-15 after
// KINEO-SEM-ENCHIMENTO (padding no longer narrates the whole prompt: a missing scene is a
// sentence split of the longest scene, or a ≤12-word topic filler); hash covers actual request,
// request options AND returned scene fields. No git/network needed to rerun.
const runway = parse('lib/runway.ts')
const legacyFixtures = [
  { count: 4, response: [{ description: 'Mira at Kyoto station', voiceover: 'Mira finds a parcel.', caption: 'Mira finds a parcel', negativeVisualPrompt: 'rain', visualIntent: 'Warm light', visualCategory: 'general_documentary', scenePurpose: 'HOOK', stockSearchQuery: 'Kyoto station parcel', searchKeywords: 'Kyoto parcel' }], hash: 'd6a388e630abf6ff1257026b1e718f7743cf160dedacc89b934789cacfc64c29' },
  { count: 4, response: ['Mira at Kyoto station'], hash: 'bca73b603eb13fe48e9528f1e7d7a0e3f5ed932e3479784e35b38bb61b57bf59' },
  { count: 0, response: [], hash: 'cb376108885901783199240cce4e1d6dc6c7db663e97bf405c538288a5a40b56' },
  // 15/09 (KINEO-VEO-COBRE-A-FALA): o teto do escritor passou de 9 para 12 (Veo a 90 s pede 12 clipes), então count 100 → 'Plan 12 scenes'; hash recapturado (era 8fcda46c…).
  { count: 100, response: [{ description: 'Mira at Kyoto station', voiceover: 'Mira finds a parcel.' }], hash: '7f195129e50821ad45bc3f010d7e519f89734e9e1f82308c393c3df7562ce444' }, // + regra de contagem (≥ 7 cenas), KINEO-ESCRITOR-R2
]
async function planner(fixture, contract) {
  let request, calls = 0
  const api = execute(functionSource(runway, 'shortCaptionFromVoiceover') + '\n' + functionSource(runway, 'generateScenes'), {
    ...aspect, ...policy, detectVisualCategory: () => undefined,
    openai: { chat: { completions: { create: async (input, options) => {
      calls++; request = { input, options }
      return { choices: [{ message: { content: fixture.raw ?? JSON.stringify(fixture.response) } }] }
    } } } },
  })
  const result = await api.generateScenes('Mira, a young woman, enters Kyoto in 1930.', fixture.count, contract)
  return { request, result, calls }
}
for (const fixture of legacyFixtures) {
  const { request, result, calls } = await planner(fixture)
  const digest = createHash('sha256').update(JSON.stringify({ request, result })).digest('hex')
  check(digest === fixture.hash, `No-option legacy provider payload and scene output remain byte-identical (fixture ${legacyFixtures.indexOf(fixture)}, count ${fixture.count}: got ${digest})`)
  check(calls === 1, 'Legacy planner call count unchanged')
}
for (const mode of ['documentary_faceless', 'character_story', 'presenter']) {
  const contract = { mode, style: style.deriveStyleAnchor('anime'), aspect: '16:9' }
  const r = await planner(legacyFixtures[2], contract)
  const text = r.request.input.messages.map(m => m.content).join('\n')
  check(r.calls === 1 && r.request.input.model === 'gpt-4o' && r.request.input.max_tokens === 1800, 'New visual contract uses the same existing model/call budget')
  check(text.includes('anime') && text.includes('16:9') && text.includes('Scene 1 is the HOOK'), 'Initial planner receives approved style/orientation/opening')
  check(!/premium faceless|stunning real footage|Example PERFECT|negativeVisualPrompt MUST include/.test(text), 'Classic planner receives no opposing stock documentary examples')
  check(!/cartoon|anime|animation/.test(r.result[0].negativeVisualPrompt), 'Planner parse/padding fallback preserves animated style')
  check(r.result[0].description.includes('16:9') && r.result[0].description.includes('Mira'), 'Empty-result visual fallback preserves framing and subject')
}
for (const [raw, expected] of [['', 'OpenAI returned no scenes.'], ['invalid', 'Failed to parse scenes JSON from OpenAI.'], ['{}', 'Scenes response was not an array.']]) {
  for (const contract of [undefined, { mode: 'character_story', style: style.deriveStyleAnchor('anime'), aspect: '16:9' }]) {
    let message = ''
    try { await planner({ count: 4, raw }, contract) } catch (e) { message = e.message }
    check(message === expected, 'Planner malformed/empty response behavior is unchanged')
  }
}
const initialPlannerCalls = []
function collectPlannerCalls(node) {
  if (ts.isCallExpression(node) && node.expression.getText(route) === 'generateScenes') initialPlannerCalls.push(node)
  ts.forEachChild(node, collectPlannerCalls)
}
collectPlannerCalls(route)
check(initialPlannerCalls.length === 2, 'Both cinematic initial-planner callsites are covered')
for (const node of initialPlannerCalls) {
  for (const hollywoodPath of [false, true]) {
    let args
    const contract = { mode: 'character_story', style: style.deriveStyleAnchor('anime'), aspect: '16:9' }
    const writerOptions = Object.freeze({ language: 'en', wordsPerScene: Object.freeze([24, 30]) })
    const caller = execute(`exports.run = async () => ${node.getText(route)};`, {
      prompt: 'Mira in Kyoto', clipCount: 4, hollywoodPath, classicVisualPolicy: contract,
      classicWriterOptions: writerOptions,
      generateScenes: async (...values) => { args = values; return [] },
    })
    await caller.run()
    check(args[2] === (hollywoodPath ? undefined : contract), 'Actual initial/fallback caller supplies policy only to classic generation')
    check(args[3] === (hollywoodPath ? undefined : writerOptions), 'Actual initial/fallback caller supplies writer options only to classic generation')
  }
}
// ═══ CLASSICOS-R2 (14/09) — Kling 2.5 · 60 s · ideia / roteiro próprio / brief → payload ═══
// The Board asked for the ENTRY → PAYLOAD link for Kling 2.5 (the caller above
// starts from already-planned scenes). Chain executed here, all actual code:
//   route decision block (parseUserScript → looksLikeBrief → verbatim)
//   → route clipCountForDuration + verbatim clip re-size block
//   → route scene constructor (resolveVerbatimSegments | generateScenes w/ mocked OpenAI)
//   → actual classic caller (run) → buildFalInput → payload that WOULD be sent.
// Mocked only at OpenAI/Fal I/O and at speechRateFor/writeServerEvent (not the
// property under test). Durations other than 60 s stay structural elsewhere.
const scriptParser = execute(read('lib/scriptParser.ts'))
const verbatimBeats = execute(read('lib/cinematic/verbatimBeats.ts'))
const clipCountForDuration = execute(functionSource(route, 'clipCountForDuration') + '\nexports.f = clipCountForDuration;').f
const decisionStart = variable(route, 'parsedScript').parent.parent.getStart(route)
const decisionEnd = variable(route, 'verbatim').parent.parent.end
const decisionBlock = route.text.slice(decisionStart, decisionEnd)
const resizeBlock = find(route, n => ts.isIfStatement(n) && n.expression.getText(route) === 'verbatim' && n.getText(route).includes('SECONDS_PER_CLIP')).getText(route)
const constructorBlock = find(route, n => ts.isIfStatement(n) && n.expression.getText(route) === 'verbatim' && n.getText(route).includes('resolveVerbatimSegments')).getText(route)
check(decisionBlock.includes('looksLikeBrief(prompt)') && resizeBlock.includes('parsedScript.narration') && constructorBlock.includes('generateScenes('), 'Actual route decision/re-size/constructor blocks located by AST')

const LITUYA_IDEA = 'Create a 60-second short about the Lituya Bay megatsunami of 1958, when a landslide raised a 524-meter wave in Alaska.'
const LITUYA_SCRIPT = [
  'In July 1958, an earthquake shook Lituya Bay in Alaska and forty million cubic meters of rock fell into the water.',
  'The splash climbed five hundred and twenty-four meters up the opposite slope, the tallest wave ever recorded on Earth.',
  'Three fishing boats were anchored in the bay that night. One was lifted over the spit of land and carried out to sea.',
  'A fisherman and his young son watched the mountain fall apart and felt their boat rise like an elevator.',
  'They rode the crest above the treetops and came down on the far side, alive, with the hull still in one piece.',
  'Another boat vanished with both people on board. Nothing of it was ever found.',
  'The forest along the shoreline was stripped to bare rock for kilometers, a scar still visible from the air today.',
  'Geologists measured the trimline for years and confirmed the number that nobody believed at first.',
  'No wave that tall has been measured anywhere since, and the survivors told the same story until they died.',
  'Lituya Bay is quiet again, but the same fault still runs beneath it, waiting.',
].join(' ')
const LITUYA_BRIEF = [
  'Captain Ulrich: a weathered Alaskan fisherman in his sixties, wearing a yellow raincoat, gray hair and a deep voice.',
  'Voice: calm, deep, documentary tone.',
  'Create a 60-second video about the night the mountain fell into Lituya Bay.',
  'Generate the narration in a calm documentary tone and end with the fault still active.',
].join('\n')
check(LITUYA_SCRIPT.split(/\s+/).length >= 175 && LITUYA_SCRIPT.split(/\s+/).length <= 195, 'Author script sits in the classic 60 s word band (175-195)')

// CLASSICOS-R5 (14/09) — the engine is now a parameter. The model id comes
// from the route's own `usedModel` line (wantsKling/wantsVeo/wantsSora → slug)
// and the era from the route's own `eraSuffix` line + eraLockSuffix, both
// executed, so the Lituya cases never inherit the Kyoto-1930 fixture era.
const usedModelLine = variable(route, 'usedModel').parent.parent.getText(route)
const eraSuffixLine = variable(route, 'eraSuffix').parent.parent.getText(route)
const eraApi = execute([varSource(route, 'ERA_YEAR_RE'), varSource(route, 'ERA_WORD_RE'), functionSource(route, 'eraLockSuffix'),
  'exports.eraLockSuffix = eraLockSuffix;'].join('\n'))
check(usedModelLine.includes('wantsVeo ? VEO_MODEL') && eraSuffixLine.includes('eraLockSuffix(') && eraSuffixLine.includes('s.voiceover'), 'Actual usedModel / eraSuffix lines located by AST')
const ENGINE_FLAGS = engine => ({ wantsKling: engine === 'kling', wantsVeo: engine === 'veo', wantsSora: engine === 'sora' })
const modelForEngine = engine => execute(`${usedModelLine}\nexports.usedModel = usedModel;`, { ...ENGINE_FLAGS(engine), ...routeHelpers }).usedModel

async function entryToPayload({ prompt, scriptMode, anchored = false, engine = 'kling' }) {
  const events = [], plannerCalls = []
  let resolveCalls = 0
  const decision = execute(`exports.run = async () => { ${decisionBlock}\n return { parsedScript, verbatim, briefDetected, userSaysVerbatim }; }`, {
    ...scriptParser, prompt, body: { script_mode: scriptMode, engine }, hollywoodPath: false,
    narrationLanguage: { language: 'en' }, user: { id: 'offline-user' },
    speechRateFor: () => 3.1, writeServerEvent: async e => { events.push(e) },
  })
  const d = await decision.run()
  const duration = 60
  const sizing = execute(`exports.run = () => { let clipCount = clipCountForDuration(duration);\n ${resizeBlock}\n return clipCount; }`, {
    clipCountForDuration, duration, verbatim: d.verbatim, parsedScript: d.parsedScript, ...ENGINE_FLAGS(engine), console: { log() {} },
  })
  const clipCount = sizing.run()
  const anchor = style.deriveStyleAnchor('')
  const classicVisualPolicy = { mode: 'documentary_faceless', style: anchor, character: null, aspect: '9:16' }
  const classicWriterOptions = { wordsPerScene: [24, 30], language: 'en' }
  const plannerApi = execute(functionSource(runway, 'shortCaptionFromVoiceover') + '\n' + functionSource(runway, 'generateScenes'), {
    ...aspect, ...policy, detectVisualCategory: () => undefined, LANGUAGE_NAMES: { en: 'English' },
    openai: { chat: { completions: { create: async (input) => {
      plannerCalls.push(input)
      const n = clipCount
      return { choices: [{ message: { content: JSON.stringify(Array.from({ length: n }, (_, i) => ({
        description: `Lituya Bay, Alaska, 1958: scene ${i + 1}, the mountainside collapsing into the fjord under a gray sky`,
        voiceover: `Planned narration ${i + 1} about Lituya Bay.`, caption: `Lituya ${i + 1}`, stockSearchQuery: 'Lituya Bay Alaska fjord',
      }))) } }] }
    } } } },
  })
  const constructed = execute(`exports.run = async () => { let scenes;\n ${constructorBlock}\n return scenes; }`, {
    prompt, clipCount, hollywoodPath: false, classicVisualPolicy, classicWriterOptions, parsedScript: d.parsedScript, verbatim: d.verbatim,
    resolveVerbatimSegments: (...a) => { resolveCalls++; return verbatimBeats.resolveVerbatimSegments(...a) },
    generateScenes: plannerApi.generateScenes, shortCaptionFromVoiceover: plannerApi.shortCaptionFromVoiceover,
    // 15/09 (KINEO-FALA-CLASSICA-FIEL): a varredura de datas/lugares na fala clássica roda dentro do construtor; aqui é identidade (o texto do fixture não tem data inventada)
    removerDatasInventadas: (t) => ({ texto: t, removidas: [] }), scrubInventedSetting: (t) => ({ text: t, removed: [] }),
  })
  const scenes = await constructed.run()
  const model = modelForEngine(engine)
  const eraSuffix = execute(`${eraSuffixLine}\nexports.eraSuffix = eraSuffix;`, { ...eraApi, prompt, scenes }).eraSuffix
  const r = await run({ model, mode: 'documentary_faceless', frame: '9:16', anchored, scenesOverride: scenes, eraSuffix })
  return { ...d, clipCount, scenes, plannerCalls, resolveCalls, events, model, eraSuffix, r }
}
function checkKlingPayload(call, label) {
  const i = call.input
  check(call.model === routeHelpers.KLING_MODEL && call.model === 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video', `${label}: payload targets the actual Kling 2.5 t2v model id`)
  check(i.duration === '10' && i.aspect_ratio === '9:16' && i.cfg_scale === 0.6 && i.seed === 17, `${label}: Kling 2.5 payload carries duration/aspect/cfg/seed as the builder defines`)
  check(typeof i.negative_prompt === 'string' && i.negative_prompt.length > 0 && !('image_url' in i) && i.generate_audio !== true, `${label}: t2v payload has negative prompt, no image, no native audio`)
  check(/Lituya/.test(i.prompt) && /9:16|vertical/i.test(i.prompt) && i.prompt.length <= 7000, `${label}: prompt keeps the subject and orientation within the provider limit`)
}

// 1) IDEIA (script_mode 'ai') → AI planner path
const idea = await entryToPayload({ prompt: LITUYA_IDEA, scriptMode: 'ai' })
check(idea.verbatim === false && idea.briefDetected === false && idea.userSaysVerbatim === false, 'Idea: actual decision block routes to the AI planner')
check(idea.clipCount === clipCountForDuration(60) && idea.clipCount === 7, 'Idea: 60 s → 7 clips from the actual clipCountForDuration')
check(idea.plannerCalls.length === 1 && idea.resolveCalls === 0 && idea.scenes.length === 7, 'Idea: one planner call, no verbatim split, 7 planned scenes')
check(/Lituya Bay megatsunami/.test(idea.plannerCalls[0].messages.map(m => m.content).join('\n')), 'Idea: the author idea reaches the actual planner request')
check(idea.r.calls.length === 1, 'Idea: exactly one provider POST for scene 1')
checkKlingPayload(idea.r.calls[0], 'Idea')

// 2) ROTEIRO PRÓPRIO (script_mode 'verbatim', clean prose without markers)
const script = await entryToPayload({ prompt: LITUYA_SCRIPT, scriptMode: 'verbatim' })
check(script.verbatim === true && script.briefDetected === false && script.parsedScript.hasMarkers === false, 'Script: clean prose + "as is" is verbatim, not a brief')
check(script.clipCount > clipCountForDuration(60) && script.clipCount <= 9 && script.scenes.length === script.clipCount, `Script: ${LITUYA_SCRIPT.split(/\s+/).length} words re-size the clip count above the 60 s button (7 → ${script.clipCount}); scenes follow the count`)
check(script.plannerCalls.length === 0 && script.resolveCalls === 1, 'Script: no planner call; the verbatim splitter runs once')
const norm = s => s.replace(/\s+/g, ' ').trim()
check(norm(script.scenes.map(s => s.voiceover).join(' ')) === norm(LITUYA_SCRIPT), 'Script: scene voiceovers concatenate back to the author text word for word')
check(script.scenes.every(s => s.voiceover.length > 0 && !s.aiPrompt), 'Script: every scene carries author words; no AI prose replaces them')
check(script.r.calls.length === 1, 'Script: exactly one provider POST for scene 1')
checkKlingPayload(script.r.calls[0], 'Script')
check(script.r.calls[0].input.prompt.includes('Lituya Bay') && !/^["“]/.test(script.r.calls[0].input.prompt), 'Script: the visual prompt is built from the author words, not sent as a quotation')

// 3) BRIEF (ficha + instruções, sent with script_mode 'verbatim')
const brief = await entryToPayload({ prompt: LITUYA_BRIEF, scriptMode: 'verbatim' })
check(brief.userSaysVerbatim === true && brief.briefDetected === true && brief.verbatim === false, 'Brief: "as is" + character sheet is demoted to AI mode by the actual decision block')
check(brief.events.length === 1 && brief.events[0].name === 'brief_detected_ai_mode' && brief.events[0].metadata.engine === 'kling', 'Brief: the demotion is recorded with the engine')
check(brief.plannerCalls.length === 1 && brief.resolveCalls === 0 && brief.scenes.length === 7, 'Brief: planner runs on the brief; the sheet is never split into narration')
check(/yellow raincoat/.test(brief.plannerCalls[0].messages.map(m => m.content).join('\n')), 'Brief: the whole brief reaches the planner')
check(brief.scenes.every(s => !/Voice: calm|Captain Ulrich:/.test(s.voiceover)), 'Brief: no sheet line is narrated')
checkKlingPayload(brief.r.calls[0], 'Brief')

// 4) The same idea with the anchor flag → i2v with still, t2v id kept as fallback
const anchoredIdea = await entryToPayload({ prompt: LITUYA_IDEA, scriptMode: 'ai', anchored: true })
// The actual anchor loop caps stills at MAX_ANCHORED_SCENES (6): a 60 s / 7-scene
// film gets 6 anchored scenes and scene 7 goes t2v. Declared here, not hidden.
const MAX_ANCHORED = Number(variable(route, 'MAX_ANCHORED_SCENES').initializer.getText(route))
check(MAX_ANCHORED === 6 && anchoredIdea.scenes.length === 7 && anchoredIdea.r.stills.length === MAX_ANCHORED, 'Anchored idea: 7 planned scenes, 6 stills (actual MAX_ANCHORED_SCENES cap); scene 7 is unanchored t2v')
check(anchoredIdea.r.calls.length === 1 && anchoredIdea.r.calls[0].model === routeHelpers.KLING_I2V_MODEL, 'Anchored idea: scene 1 reaches Kling 2.5 i2v with its still')
check(anchoredIdea.r.calls[0].input.image_url && anchoredIdea.r.calls[0].input.duration === '10' && !('aspect_ratio' in anchoredIdea.r.calls[0].input), 'Anchored idea: i2v payload follows the still (no aspect param), duration 10')
check(/Lituya/.test(anchoredIdea.r.stills[0].input.prompt) && anchoredIdea.r.stills[0].input.image_size === aspect.aspectSpec('9:16').fluxImageSize, 'Anchored idea: still prompt keeps the subject and 9:16 dimensions')

// ═══ CLASSICOS-R5 (14/09) — Seedance 1.5 and Veo 3.1 · 60 s · ideia / roteiro / brief → payload ═══
// Same chain as the Kling block above, parameterized by `engine` (the key the
// Studio client sends: 'seedance' | 'veo'). Nothing is reused from the Kling
// expectations: clip counts, model ids and payload fields come from the actual
// route constants for each engine. Declared limits (not hidden): only scene 1
// is POSTed; visual policy/writer options are injected; the era comes from the
// actual eraLockSuffix (window 1000–1939 + era words) — Lituya 1958 is OUTSIDE
// that window, so the product sends NO period lock for it. That is the
// product's behavior, recorded here, not corrected. Veo 5b2dc929 (90 s) is
// not touched: this block only exercises the existing 60 s path.
const WORDS = LITUYA_SCRIPT.split(/\s+/).length
check(eraApi.eraLockSuffix(LITUYA_IDEA) === '' && eraApi.eraLockSuffix(LITUYA_SCRIPT) === '' && eraApi.eraLockSuffix('Rome in 1912') !== '', 'Era lock: the actual eraLockSuffix is silent for 1958 and active for 1912 (window 1000–1939)')
function checkSeedancePayload(call, label) {
  const i = call.input
  check(call.model === routeHelpers.SEEDANCE_MODEL && call.model === 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video', `${label}: payload targets the actual Seedance 1.5 Pro t2v model id`)
  check(i.duration === '10' && i.aspect_ratio === '9:16' && i.resolution === '720p' && i.generate_audio === false && i.seed === 17, `${label}: Seedance payload carries duration '10' / 9:16 / 720p / audio off / seed as the builder defines`)
  check(!('negative_prompt' in i) && !('image_url' in i) && !('cfg_scale' in i) && !('safety_tolerance' in i), `${label}: Seedance payload has no negative prompt (schema has none), no image, no Kling/Veo-only fields`)
  check(/Lituya/.test(i.prompt) && /9:16|vertical/i.test(i.prompt) && i.prompt.length <= 7000, `${label}: prompt keeps the subject and orientation within the provider limit`)
  check(!/1930|period piece/.test(i.prompt), `${label}: no fixture era leaks into the prompt (1958 is outside the era-lock window)`)
}
function checkVeoPayload(call, label) {
  const i = call.input
  check(call.model === routeHelpers.VEO_MODEL && call.model === 'fal-ai/veo3.1/fast', `${label}: payload targets the actual Veo 3.1 Fast model id`)
  check(i.duration === '8s' && i.aspect_ratio === '9:16' && i.resolution === '1080p' && i.generate_audio === false && i.safety_tolerance === '5' && i.seed === 17, `${label}: Veo payload carries duration '8s' / 9:16 / 1080p / audio off / safety 5 / seed as the builder defines`)
  check(typeof i.negative_prompt === 'string' && i.negative_prompt.length > 0 && !('image_url' in i) && !('cfg_scale' in i), `${label}: Veo payload has the classic negative prompt, no image, no Kling-only cfg`)
  check(/Lituya/.test(i.prompt) && /9:16|vertical/i.test(i.prompt) && i.prompt.length <= 7000, `${label}: prompt keeps the subject and orientation within the provider limit`)
  check(!/1930|period piece/.test(i.prompt), `${label}: no fixture era leaks into the prompt (1958 is outside the era-lock window)`)
}
const ENGINES = {
  seedance: { model: routeHelpers.SEEDANCE_MODEL, secondsPerClip: 10, checkPayload: checkSeedancePayload },
  veo: { model: routeHelpers.VEO_MODEL, secondsPerClip: 8, checkPayload: checkVeoPayload },
}
check(modelForEngine('seedance') === routeHelpers.SEEDANCE_MODEL && modelForEngine('veo') === routeHelpers.VEO_MODEL && modelForEngine('kling') === routeHelpers.KLING_MODEL && modelForEngine('sora') === routeHelpers.SORA_MODEL, 'Actual usedModel line maps every classic engine key to its own slug')
check(new Set([routeHelpers.SEEDANCE_MODEL, routeHelpers.VEO_MODEL, routeHelpers.KLING_MODEL]).size === 3, 'The three classic slugs are distinct')
const perEngine = {}
for (const [engine, spec] of Object.entries(ENGINES)) {
  const E = engine === 'seedance' ? 'Seedance' : 'Veo'
  // 1) IDEIA
  const idea = await entryToPayload({ prompt: LITUYA_IDEA, scriptMode: 'ai', engine })
  check(idea.model === spec.model && idea.verbatim === false && idea.briefDetected === false, `${E} idea: engine identified by the actual usedModel line; decision block routes to the AI planner`)
  check(idea.clipCount === clipCountForDuration(60) && idea.scenes.length === 7 && idea.plannerCalls.length === 1 && idea.resolveCalls === 0, `${E} idea: 60 s → 7 planned scenes, one planner call, no verbatim split`)
  check(/Lituya Bay megatsunami/.test(idea.plannerCalls[0].messages.map(m => m.content).join('\n')), `${E} idea: the author idea reaches the actual planner request`)
  check(idea.eraSuffix === '' && idea.r.calls.length === 1 && idea.r.stills.length === 0, `${E} idea: no era lock for 1958, exactly one provider POST for scene 1, no still (anchors are Kling-only)`)
  spec.checkPayload(idea.r.calls[0], `${E} idea`)
  // 2) ROTEIRO PRÓPRIO
  const script = await entryToPayload({ prompt: LITUYA_SCRIPT, scriptMode: 'verbatim', engine })
  const needed = Math.ceil(WORDS / 2.5 / spec.secondsPerClip)
  const expectedClips = Math.max(clipCountForDuration(60), Math.min(9, needed))
  check(script.model === spec.model && script.verbatim === true && script.briefDetected === false, `${E} script: clean prose + "as is" is verbatim on this engine`)
  check(script.clipCount === expectedClips && script.scenes.length === script.clipCount, `${E} script: ${WORDS} words at 2.5 w/s over ${spec.secondsPerClip} s clips need ${needed} → route sizes ${expectedClips} (cap 9); scenes follow the count`)
  check(script.plannerCalls.length === 0 && script.resolveCalls === 1, `${E} script: no planner call; the verbatim splitter runs once`)
  check(norm(script.scenes.map(s => s.voiceover).join(' ')) === norm(LITUYA_SCRIPT), `${E} script: scene voiceovers concatenate back to the author text word for word`)
  check(script.scenes.every(s => s.voiceover.length > 0 && !s.aiPrompt), `${E} script: every scene carries author words; no AI prose replaces them`)
  check(script.r.calls.length === 1 && !/^["“]/.test(script.r.calls[0].input.prompt), `${E} script: one POST for scene 1; the visual prompt is not a quotation`)
  spec.checkPayload(script.r.calls[0], `${E} script`)
  // 3) BRIEF
  const brief = await entryToPayload({ prompt: LITUYA_BRIEF, scriptMode: 'verbatim', engine })
  check(brief.model === spec.model && brief.userSaysVerbatim === true && brief.briefDetected === true && brief.verbatim === false, `${E} brief: "as is" + character sheet is demoted to AI mode on this engine`)
  check(brief.events.length === 1 && brief.events[0].name === 'brief_detected_ai_mode' && brief.events[0].metadata.engine === engine, `${E} brief: the demotion event names the engine key '${engine}'`)
  check(brief.plannerCalls.length === 1 && brief.resolveCalls === 0 && brief.scenes.length === 7 && /yellow raincoat/.test(brief.plannerCalls[0].messages.map(m => m.content).join('\n')), `${E} brief: planner runs once on the whole brief; the sheet is never split into narration`)
  check(brief.scenes.every(s => !/Voice: calm|Captain Ulrich:/.test(s.voiceover)) && brief.r.calls.length === 1, `${E} brief: no sheet line is narrated; one POST for scene 1`)
  spec.checkPayload(brief.r.calls[0], `${E} brief`)
  perEngine[engine] = { idea, script, brief }
}
// SECONDS_PER_CLIP is engine-dependent in the actual re-size block: Veo (8 s)
// needs more clips than Seedance (10 s) for the same 186-word script. Declared
// finding: Veo's need (10) exceeds the route cap (9) → 9 × 8 s = 72 s of
// footage against the route's own 74.4 s conservative estimate. At the classic
// 3.1 w/s the narration is ~60 s, so the cap is harmless in practice; recorded,
// not changed (no product edit in this delta).
check(perEngine.veo.script.clipCount === 9 && perEngine.seedance.script.clipCount === 8 && perEngine.veo.script.clipCount > perEngine.seedance.script.clipCount, 'Verbatim re-size: Veo 8 s clips → 9 (cap), Seedance 10 s clips → 8; the engine changes SECONDS_PER_CLIP')
check(perEngine.veo.script.r.calls[0].input.prompt !== perEngine.seedance.script.r.calls[0].input.prompt || perEngine.veo.script.r.calls[0].model !== perEngine.seedance.script.r.calls[0].model, 'The same author script reaches two different provider targets')

console.log(`${checks} executable visual-contract checks passed; ${runs.length} actual classic-caller simulations; network disabled.`)
