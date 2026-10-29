// KINEO-QUALIDADE-REGRESSOES-2910 — execute the current route, not a copy of its rules.
// External I/O is stubbed; style, scene truth, story policy and retry are actual source.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = p => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
const cache = new Map()
const declarationCache = new Map()
const compile = src => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const quiet = { log() {}, warn() {}, error() {} }
export function loadSensitivePure(path) {
  if (cache.has(path)) return cache.get(path).exports
  const mod = { exports: {} }; cache.set(path, mod)
  const req = name => {
    const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), name)) : null
    const target = base && [base, `${base}.ts`].find(p => existsSync(join(root, p)))
    assert(target, `pure guard must not load external dependency ${name}`)
    return loadSensitivePure(target)
  }
  new Function('module', 'exports', 'require', 'process', 'fetch', compile(read(path)))(mod, mod.exports, req, { env: {} }, () => { throw new Error('network forbidden') })
  return mod.exports
}
function nodes(src, predicate) {
  const file = ts.createSourceFile('guard-route.ts', src, ts.ScriptTarget.Latest, true)
  const found = []
  const walk = n => { if (predicate(n)) found.push(n.getText(file)); ts.forEachChild(n, walk) }
  walk(file)
  return found
}
const declaration = (src, name) => {
  const key = name + '\0' + src
  if (declarationCache.has(key)) return declarationCache.get(key)
  const found = nodes(src, n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText() === name))
  assert.equal(found.length, 1, `unique declaration ${name}`)
  declarationCache.set(key, found[0])
  return found[0]
}
const func = (src, name) => {
  const found = nodes(src, n => ts.isFunctionDeclaration(n) && n.name?.text === name)
  assert.equal(found.length, 1, `unique function ${name}`)
  return found[0]
}

// The inherited source sheet deliberately has priority. Ordinary films must still
// derive the author's character, and noir alone must still remain faceless.
export function policyFromRoute(route, { prompt, mode = 'documentary_faceless', style, inherited = null, tagFaceless = false }) {
  const ss = loadSensitivePure('lib/cinematic/sceneStyle.ts')
  const vp = loadSensitivePure('lib/cinematic/visualPromptPolicy.ts')
  const fit = loadSensitivePure('lib/engineFit.ts')
  const declarations = ['storyMode', 'storyCharacter', 'classicVisualMode', 'classicVisualPolicy'].map(name => declaration(route, name)).join('\n')
  const globals = { ...ss, ...vp, ...fit, prompt, formatoVisual: { modo: mode }, styleAnchor: style ?? ss.deriveStyleAnchor(prompt), qualidadeHerdada: inherited, tagFacelessPresente: tagFaceless, aspectRequested: '9:16' }
  return new Function(...Object.keys(globals), compile(`${declarations}\nreturn { storyMode, storyCharacter, policy: classicVisualPolicy }`))(...Object.values(globals))
}

export function storyModeChecks(route) {
  const ss = loadSensitivePure('lib/cinematic/sceneStyle.ts')
  const prompt = 'An airline ticket lies on a table. Studies show the flight departed in 1953.'
  for (const [look, expected] of [['photoreal', false], ['noir', false], ['animated3d', true], ['anime', true], ['illustration', true]]) {
    const style = { ...ss.deriveStyleAnchor(prompt), look }
    assert.equal(policyFromRoute(route, { prompt, style }).storyMode, expected, `look ${look}`)
  }
  assert.equal(policyFromRoute(route, { prompt, mode: 'character_story' }).storyMode, true, 'explicit character_story')
  const fiction = 'Benny, the tiniest bunny, finds a mysterious golden egg. One day the little bunny discovers the egg glows.'
  const ordinary = policyFromRoute(route, { prompt: fiction })
  assert.equal(ordinary.storyMode, true, 'fiction alone')
  assert.equal(ordinary.policy.character, ss.deriveStoryCharacter(fiction), 'derived character reaches policy')
  const inherited = policyFromRoute(route, { prompt: fiction, inherited: { characterSheet: 'Benny, the approved blue bunny' } })
  assert.equal(inherited.policy.character, 'Benny, the approved blue bunny', 'source identity has priority')
  assert.equal(policyFromRoute(route, { prompt: fiction, tagFaceless: true }).policy.mode, 'documentary_faceless', 'explicit faceless still wins')
}

let selectModel
function modelSelector() {
  if (selectModel) return selectModel
  const src = read('lib/hollywood/router.ts')
  const names = ['HOLLYWOOD_MODELS', 'KLING3_I2V_MODEL', 'H3_MODELS', 'H3_I2V_MODEL', 'H3MAX_MODELS', 'H3MAX_I2V_MODEL', 'OMNI_I2V_MODEL', 'S25_T2V_MODEL', 'S25_I2V_MODEL']
  const mod = { exports: {} }
  new Function('exports', compile(names.map(n => declaration(src, n)).join('\n') + '\n' + func(src, 'cinematicSceneModel')))(mod.exports)
  selectModel = mod.exports.cinematicSceneModel
  return selectModel
}
class SubmitError extends Error { constructor(message, status = 503) { super(message); this.status = status; this.ambiguous = false } }
class AvatarError extends Error {}
const dispatchBodies = new Map()

// Extract the WHOLE dispatch loop: host failure -> native fallback, missing Omni
// still -> Kling fallback, all native scene types, and the real retry helper.
// The submit capture asserts on the exact argument before any I/O can happen.
export async function hollywoodDispatch(route, { family = 'hollywood', type = 'support', still = true, retry = false, hostFailure = false, visual = 'Close-up of an airline ticket resting on a table.', stylePrompt = 'photorealistic film' } = {}) {
  const ss = loadSensitivePure('lib/cinematic/sceneStyle.ts')
  if (!dispatchBodies.has(route)) {
    const loops = nodes(route, n => ts.isForOfStatement(n) && n.expression.getText() === 'plan.scenes.entries()')
    assert.equal(loops.length, 1, 'unique actual Hollywood dispatch loop')
    dispatchBodies.set(route, compile(`${func(route, 'isTransientSubmitError')}\n${func(route, 'submitToFalWithOneRetry')}\nreturn (async () => { ${loops[0]} })()`))
  }
  const calls = [], hostCalls = [], context = { submittedPrompts: [], ultimaRecusa: null }
  const plan = { scenes: [{ index: 1, type, prompt: visual, voiceover: type === 'dialogue' ? '' : 'An airline ticket rests on a table.', dialogueLine: type === 'dialogue' ? 'This is the ticket.' : undefined, seconds: 5 }], environmentSheet: '', characterSheet: '', styleSheet: '', stylized: false }
  const globals = {
    ...ss, ...loadSensitivePure('lib/cinematic/filmQuality.ts'),
    ...loadSensitivePure('lib/cinematic/filmQualityReference.ts'),
    ...loadSensitivePure('lib/cinematic/sceneTruth.ts'), ...loadSensitivePure('lib/cinematic/visualMode.ts'),
    ...loadSensitivePure('lib/hollywood/fidelidade.ts'), ...loadSensitivePure('lib/hollywood/s25Cena.ts'),
    family, plan, styleAnchor: ss.deriveStyleAnchor(stylePrompt), formatoVisual: { modo: 'documentary_faceless' },
    anchors: hostFailure ? { portraitUrl: 'https://example.test/portrait.png', environmentUrl: 'https://example.test/world.png' } : null,
    cinematicSceneModel: modelSelector(), hostTtsEnabled: hostFailure, hostVoice: { voice: 'fixture', defaultSpeed: 1 }, hostUserSpeed: 1,
    synthesizeHostSpeech: async () => new Uint8Array(), estimateMp3DurationSeconds: () => 5,
    uploadVoiceoverToSupabase: async () => 'https://example.test/audio.mp3',
    submitAvatarJob: async input => { hostCalls.push(input); throw new AvatarError('explicit fixture failure') },
    HOST_PRESENTER_MODEL: 'fixture-presenter', hostPerformancePrompt: '', AvatarSubmitError: AvatarError, looksExhausted: () => false,
    eraSuffix: '', generationSeed: 1, generationId: 'fixture', user: { id: 'fixture' },
    qualidadeHerdada: null, fichasDaQualidade: () => [], estrelaHollywood: [],
    juizStillCena: null, criticoHCena: null, s25Plano: null, omniStillRetryMs: 0, OMNI_STILL_RETRY_BUDGET_MS: 30000,
    generateCinematicSceneStill: async () => still ? 'https://example.test/still.png' : null,
    writeServerEvent: async () => {}, ctxDespacho: () => context,
    hSceneAnchors: [], hHostAttempts: new Map(), hHeldByPolicy: new Set(), hRequestIds: [], hDispositions: [], hRecusas: [], hModels: [], hEngines: [], hSubmittedPrompts: [],
    fidelidadeRelato: [], contratoRelato: [], cinematicSubmissionUncertain: false, providerSubmissionMayExist: false,
    FalQueueSubmitError: SubmitError, console: quiet, setTimeout: fn => fn(),
    submitToFal: async (...args) => { calls.push(args); if (retry && calls.length === 1) throw new SubmitError('fixture transient'); return 'fixture-job' },
  }
  await new Function(...Object.keys(globals), dispatchBodies.get(route))(...Object.values(globals))
  return { calls, hostCalls, recorded: globals.hSubmittedPrompts }
}

export async function hollywoodSafetyChecks(route) {
  for (const family of ['hollywood', 'h3', 'h3max', 'omni', 's25']) {
    for (const type of ['support', 'cinematic', 'dialogue']) {
      if (family === 's25' && type === 'dialogue') continue // intentionally held, no silent native submit
      for (const still of [false, true]) {
        const result = await hollywoodDispatch(route, { family, type, still, retry: true })
        assert.equal(result.calls.length, 2, `${family}/${type}/${still}: real retry executed`)
        for (const [prompt, , , hollywood] of result.calls) {
          assert.equal(hollywood, true)
          assert.match(prompt, /any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers/, `${family}/${type}/${still}: suffix before every native submit`)
        }
        assert.equal(result.calls[0][0], result.calls[1][0], 'retry retains exact protected prompt')
        assert.equal(result.recorded[0], result.calls[1][0], 'claim/salvage records exact protected prompt')
      }
    }
  }
  for (const family of ['hollywood', 'h3', 'h3max', 'omni']) {
    const result = await hollywoodDispatch(route, { family, type: 'dialogue', hostFailure: true, retry: true })
    assert.equal(result.hostCalls.length, 1, `${family}: host attempted before fallback`)
    assert.equal(result.calls.length, 2, `${family}: native fallback plus retry`)
    assert(result.calls.every(([p]) => p.includes('any writing on it is intentionally out of focus and unreadable')), `${family}: protected host fallback`)
  }
  const held = await hollywoodDispatch(route, { family: 's25', type: 'dialogue', hostFailure: true })
  assert.equal(held.hostCalls.length, 1); assert.equal(held.calls.length, 0, 'S25 failed host never falls back to silent video')
  for (const stylePrompt of ['black and white film noir', '3D animated cartoon']) {
    const result = await hollywoodDispatch(route, { stylePrompt })
    assert.match(result.calls[0][0], /any writing on it is intentionally out of focus and unreadable/, 'style lock preserves suffix')
  }
  assert.match(route, /scene_prompts: hSubmittedPrompts/)
  assert.match(route, /const sPrompts = \(storedResp\.scene_prompts as string\[\]\) \?\? \[\]/)
  assert.match(route, /submitToFal\(sPrompts\[i\], storedModels\[i\], false, true/)
}

export async function sensitiveMutationChecks(route) {
  const mutate = (from, to) => { assert(route.includes(from), `mutation anchor ${from}`); return route.replace(from, to) }
  const noSafety = mutate('scenePrompt + textSafetySuffix(scenePrompt)', 'scenePrompt')
  await assert.rejects(() => hollywoodSafetyChecks(noSafety), /suffix before every native submit/)
  const noirStory = mutate('isStylizedLook(styleAnchor) ||', "styleAnchor.look !== 'photoreal' ||")
  assert.throws(() => storyModeChecks(noirStory), /look noir/)
  const noCharacter = mutate('storyMode ? deriveStoryCharacter(prompt) : null', 'storyMode ? null : null')
  assert.throws(() => storyModeChecks(noCharacter), /derived character reaches policy/)
  const noPolicy = mutate('character: storyCharacter, aspect:', 'character: null, aspect:')
  assert.throws(() => storyModeChecks(noPolicy), /derived character reaches policy/)
}

// Frozen origin/main before this delivery. Execute its paid-scene/chunk source
// against the same valid scene, then today's route + quality adapter. This is a
// behavioral loss (b), independent of the old guard's stale text anchor (a).
export function kling4TextSafetyChecks(route, compact = loadSensitivePure('lib/cinematic/filmQuality.ts').promptCurtoDoFilmeKling4) {
  const baseline = execFileSync('git', ['show', 'f0cf94914:app/api/generate-video-cinematic/route.ts'], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).replace(/\r\n/g, '\n')
  const router = read('lib/hollywood/router.ts')
  const noText = /const NO_TEXT_SUFFIX =\n\s*'([^']+)'/.exec(router)?.[1]
  assert(noText, 'actual router text direction')
  const S = loadSensitivePure('lib/cinematic/sceneStyle.ts'), Q = loadSensitivePure('lib/cinematic/filmQuality.ts')
  const K = loadSensitivePure('lib/kling4PaidFilm.ts'), F = loadSensitivePure('lib/hollywood/fidelidade.ts')
  const trial = loadSensitivePure('lib/kling4Trial.ts')
  const styleAnchor = S.deriveStyleAnchor('photorealistic film')
  const identity = 'a middle-aged keeper with a short gray beard, a dark yellow raincoat, a black knit cap, weathered tan skin and heavy rubber boots, carrying an old brass lantern'
  const speech = 'A keeper examines a ticket.'
  const scene = `${speech} The same main character appears in this scene, consistent design: ${identity}.${noText}`
  const chunks = (src, prompt, approved = false) => {
    const globals = { ...F, ...K, promptCurtoDoFilmeKling4: compact, styleAnchor,
      plan: { scenes: [{ prompt, seconds: 15, voiceover: speech }], styleSheet: '' }, eraSuffix: '',
      duration: 15, narration: speech, qualidadeHerdada: null, fichasDaQualidade: () => [],
      ancoraHerdadaDaCena: () => approved ? 'https://example.test/keeper.png' : null }
    return new Function(...Object.keys(globals), compile(`${declaration(src, 'paidScenes')}\n${declaration(src, 'chunks')}\nreturn chunks`))(...Object.values(globals))
  }
  const before = chunks(baseline, scene)[0].input.multi_prompt[0].prompt
  assert(before.includes(noText.trim()), 'main payload carried full no-text direction before the refactor')
  const prepare = p => Q.prepararQualidadeDoFilme({ prompts: [p], falas: [speech], contextoOriginal: speech,
    contextoFiltro: speech, modo: 'character_story', tagFaceless: false, style: styleAnchor }).prompts[0]
  const afterShort = chunks(route, prepare(scene))[0].input.multi_prompt[0].prompt
  assert(afterShort.includes(noText.trim()), 'K4 retains complete original direction when it fits')
  const objectSafety = S.textSafetySuffix('a ticket')
  for (const long of [false, true]) {
    for (const approved of [false, true]) {
      const source = (long ? scene.replace(speech, speech + ' The keeper carefully follows the edges of the paper on the wooden table.'.repeat(16)) : scene) + objectSafety
      const after = chunks(route, prepare(source), approved)[0].input.multi_prompt[0].prompt
      assert(Array.from(after).length <= 512, 'K4 final Unicode payload budget includes keyframe directive')
      assert.match(after, /no readable text/i, 'K4 compact must retain text protection')
      assert.match(after, /no subtitles/i, 'K4 retains subtitle prohibition')
      assert.match(after, /no watermarks/i, 'K4 retains watermark prohibition')
      assert.match(after, /screen (?:is )?off or blurred/i, 'K4 retains phone-screen direction')
      assert.match(after, /out of focus and unreadable/i, 'K4 retains object text direction')
      assert.match(after, /keeper examines a ticket/i, 'K4 retains the action')
      assert.match(after, /gray beard/i, 'K4 retains identity')
      assert.match(after, /Mouth closed, no speaking\./, 'K4 retains closed-mouth direction')
    }
  }
  const raw = compact(prepare(scene + objectSafety), styleAnchor)
  const longestKeyframe = trial.buildKling4TrialInput([raw, raw], ['https://example.test/first.png', null]).input.multi_prompt[1].prompt
  assert.match(longestKeyframe, /^Scene 2: text-directed shot, no new keyframe for this scene\./)
  assert(Array.from(longestKeyframe).length <= 512)
  for (const rule of [/no readable text/i, /no subtitles/i, /no watermarks/i, /screen (?:is )?off or blurred/i, /out of focus and unreadable/i, /Mouth closed, no speaking\./]) assert.match(longestKeyframe, rule)
  assert(!/no readable text/i.test(compact('A keeper examines a ticket.', styleAnchor)), 'no new text rule when the source carried none')
  const longCast = 'Period setting: Lituya Bay, Alaska, 1958 with period clothes. Characters in this shot: A weathered fisherman with a heavy gray beard, a yellow raincoat, black wool cap, dark rubber boots, aged hands, blue eyes and a patched sweater beside his small wooden fishing boat — clearly visible in frame. The fisherman steers the boat into the giant wave.' + noText
  const longCastPrompt = compact(longCast, styleAnchor)
  const longCastFinal = trial.buildKling4TrialInput([longCastPrompt, longCastPrompt], ['https://example.test/first.png', null]).input.multi_prompt[1].prompt
  assert.match(longCastFinal, /The fisherman steers the boat into the giant wave\./, 'long cast/era cannot displace complete action to make room for safety')
  assert.match(longCastFinal, /Visible: A weathered fisherman/)
  for (const rule of [/no readable text/i, /no subtitles/i, /no watermarks/i, /screen (?:is )?off or blurred/i, /Mouth closed, no speaking\./]) assert.match(longCastFinal, rule)
  assert(Array.from(longCastFinal).length <= 512)
  const twoCast = 'Period setting: London, England, 1910 with period clothes. Characters in this shot: A little girl with a long yellow coat and brown shoes holding the glowing teddy bear; A tiny friendly robot with a dented silver body and bright blue eyes beside the bicycle — clearly visible in frame. The little girl hands the glowing teddy bear to the robot beside the bicycle.' + noText + objectSafety
  const twoCastPrompt = compact(twoCast, styleAnchor)
  const twoCastFinal = trial.buildKling4TrialInput([twoCastPrompt, twoCastPrompt], ['https://example.test/first.png', null]).input.multi_prompt[1].prompt
  assert.match(twoCastFinal, /The little girl hands the glowing teddy bear to the robot beside the bicycle\./, 'multiple cast relation minimum cannot displace the action or recipient')
  assert.match(twoCastFinal, /Visible: A little girl[^;]*holding the glowing teddy bear; A tiny friendly robot[^.]*beside the bicycle/, 'both cast subjects and their relations stay whole')
  for (const rule of [/no readable text/i, /no subtitles/i, /no watermarks/i, /screen (?:is )?off or blurred/i, /out of focus and unreadable/i, /Mouth closed, no speaking\./]) assert.match(twoCastFinal, rule)
  assert(Array.from(twoCastFinal).length <= 512)
  // Remove protection from the real helper's return: the old tail-loss must
  // become observable, even though style/identity/action assertions still pass.
  const src = read('lib/cinematic/filmQuality.ts')
  const currentReturn = 'return `${take(core, coreBudget)}${textProtection} Mouth closed, no speaking.`'
  assert(src.includes(currentReturn), 'K4 mutation applied to real helper')
  const mutated = func(src.replace(currentReturn, 'return `${take(core, coreBudget)} Mouth closed, no speaking.`'), 'promptCurtoDoFilmeKling4')
  const exports = {}
  new Function('exports', 'NO_READABLE_TEXT_SUFFIX', 'textSafetySuffix', compile(mutated))(exports, S.NO_READABLE_TEXT_SUFFIX, S.textSafetySuffix)
  const broken = exports.promptCurtoDoFilmeKling4(prepare(scene), styleAnchor)
  assert(!/no readable text/i.test(broken), 'old compact return demonstrably loses previously protected tail')
}
