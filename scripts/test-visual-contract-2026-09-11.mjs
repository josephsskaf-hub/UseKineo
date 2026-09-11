// Offline executable checks: actual route AST/caller + actual builders/still
// code, mocked only at OpenAI/Fal I/O. No credentials, env files or network.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHmac } from 'node:crypto'
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
    scenes: [{ description: 'Kyoto railway', voiceover: '' }], styleSuffix: test.explicit || '',
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
  narration = 'Mira opens a red parcel at the Kyoto train station in 1930.' } = {}) {
  const scene = { description: visual, aiPrompt: visual, stockSearchQuery: 'generic landscape', voiceover: narration }
  const scenes = [scene, { ...scene, aiPrompt: 'Mira carries the parcel across the same Kyoto station' }]
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
    scenes, classicVisualPolicy: { mode, style: anchor, character: mode === 'documentary_faceless' ? null : 'Mira, a young woman', aspect: frame },
    classicVisualMode: mode, storyCharacter: mode === 'documentary_faceless' ? null : 'Mira, a young woman', styleAnchor: anchor,
    eraSuffix: ', period piece set strictly in the year 1930, no modern objects', aspectRequested: frame,
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
console.log(`${checks} executable visual-contract checks passed; ${runs.length} actual classic-caller simulations; network disabled.`)
