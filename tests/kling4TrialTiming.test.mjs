// Offline behavioral contracts for narrated Kling multi-shot timing. No provider or production access.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const root = resolve(process.env.KLING4_TEST_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..'))
const ts = createRequire(import.meta.url)('typescript')
const read = path => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const forbidden = () => { throw new Error('Offline timing guard forbids unmocked network, timers and SDK access') }
const cache = new Map()
function load(path) {
  if (cache.has(path)) return cache.get(path)
  const exports = {}; cache.set(path, exports)
  const code = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, {
    exports, URL, AbortController, AbortSignal, Response, Request, console,
    fetch: forbidden, setTimeout: forbidden, clearTimeout() {}, process: { env: {} },
    require(specifier) {
      if (specifier.startsWith('@/')) return load(specifier.slice(2) + '.ts')
      if (specifier.startsWith('.')) return load(join(dirname(path), specifier) + '.ts')
      return forbidden()
    },
  }, { filename: path, timeout: 5000 })
  return exports
}
const lib = load('lib/kling4Trial.ts')
const words = count => new Array(count).fill('word').join(' ')
const json = value => JSON.parse(JSON.stringify(value))
const prompts = ['A red cabin opens.', 'A silver key turns.', 'A golden bird flies away.']
const voiceovers = [words(24), words(6), words(6)]
const timing = { voiceovers, wordsPerSecond: 2.5 }
const durations = (lines, rate = 2.5) => json(lib.kling4TrialSceneDurations(lines, rate))

test('one long spoken scene receives nine seconds and two short scenes retain three each', () => {
  assert.deepEqual(durations(voiceovers), [9, 3, 3])
  assert.deepEqual(durations([voiceovers[1], voiceovers[0], voiceovers[2]]), [3, 9, 3])
  assert.deepEqual(durations([voiceovers[1], voiceovers[2], voiceovers[0]]), [3, 3, 9])
})

test('all valid scene-count and narration shapes produce whole seconds, a three-second floor and exactly 15 total', () => {
  for (let count = 1; count <= 5; count++) {
    for (const counts of [new Array(count).fill(12), new Array(count).fill(0), Array.from({ length: count }, (_, i) => i * 7), Array.from({ length: count }, (_, i) => i === count - 1 ? 100 : 1)]) {
      const result = durations(counts.map(words))
      assert.equal(result.length, count)
      assert.equal(result.reduce((sum, value) => sum + value, 0), 15)
      assert.equal(result.every(value => Number.isInteger(value) && value >= 3 && value <= 15 - 3 * (count - 1)), true)
      for (let i = 0; i < count; i++) for (let j = 0; j < count; j++) if (counts[i] > counts[j]) assert.ok(result[i] >= result[j], JSON.stringify({ counts, result }))
      assert.deepEqual(durations(counts.map(words)), result, 'rounding is deterministic across retries')
    }
  }
})

test('balanced and entirely empty narration have deterministic rounding without adding or dropping scenes', () => {
  const expected = [[15], [8, 7], [5, 5, 5], [4, 4, 4, 3], [3, 3, 3, 3, 3]]
  for (let count = 1; count <= 5; count++) {
    assert.deepEqual(durations(new Array(count).fill(words(10))), expected[count - 1])
    assert.deepEqual(durations(new Array(count).fill('')), expected[count - 1])
  }
})

test('timing uses spoken words rather than English character length and accepts the resolved short-voice rate', () => {
  const { narrationWordCount } = load('lib/textLanguage.ts')
  const hindi = 'राजा अपने मित्र के साथ जंगल में पुरानी सुनहरी चाबी खोजने के लिए वापस आया और उसने एक सुंदर सुनहरी चिड़िया देखी'
  const count = narrationWordCount(hindi)
  assert.ok(count > 6)
  const actual = durations([hindi, words(6), words(6)], 1.98)
  assert.deepEqual(actual, durations([words(count), words(6), words(6)], 1.98))
  assert.ok(actual[0] > actual[1])
  // A single voice rate applies to every scene; changing that common rate must not reorder relative speech needs.
  for (const rate of [1.65, 1.98, 2.3, 2.5, 2.65]) assert.deepEqual(durations(voiceovers, rate), [9, 3, 3])
})

test('impossible scene counts and invalid voice rates fail before any paid submission', () => {
  for (const rate of [0, -1, NaN, Infinity, -Infinity]) assert.throws(() => lib.kling4TrialSceneDurations(voiceovers, rate))
  assert.throws(() => lib.kling4TrialSceneDurations([], 2.5))
  assert.throws(() => lib.kling4TrialSceneDurations(new Array(6).fill(words(3)), 2.5))
  assert.throws(() => lib.buildKling4TrialInput(prompts, [], { voiceovers: voiceovers.slice(0, 2), wordsPerSecond: 2.5 }))
})

test('builder preserves scene, narration and still order while passing the 9/3/3 timing plan to multi_prompt', () => {
  const images = ['https://fal.media/test/first.png', null, 'https://fal.media/test/third.png']
  const originalLines = voiceovers.slice(), originalImages = images.slice(), originalPrompts = prompts.slice()
  const { model, input } = lib.buildKling4TrialInput(prompts, images, timing)
  assert.equal(model, lib.KLING4_I2V_MODEL)
  assert.deepEqual(json(input.multi_prompt.map(shot => shot.duration)), [9, 3, 3])
  assert.equal(input.multi_prompt.every((shot, i) => shot.prompt.includes(prompts[i])), true)
  assert.equal(input.start_image_url, images[0])
  assert.deepEqual(json(input.middle_image_urls), [images[2]])
  assert.match(input.multi_prompt[1].prompt, /no(?: new)? keyframe/i)
  assert.match(input.multi_prompt[2].prompt, /middle keyframe\s*1/i)
  assert.equal(input.duration, 15)
  assert.equal(input.resolution, '720p')
  assert.equal('aspect_ratio' in input, false)
  assert.deepEqual(voiceovers, originalLines); assert.deepEqual(images, originalImages); assert.deepEqual(prompts, originalPrompts)
  const textOnly = lib.buildKling4TrialInput(prompts, [], timing)
  assert.deepEqual(json(textOnly.input.multi_prompt.map(shot => shot.duration)), [9, 3, 3])
  assert.equal(textOnly.input.aspect_ratio, '9:16')
})

test('actual birth submit sends narration timing in a single POST, and malformed timing sends nothing', async () => {
  const calls = []
  const deps = { apiKey: 'offline-placeholder', fetchImpl: async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ request_id: 'offline-timed-kling' })) } }
  await lib.submitKling4TrialVideo({ prompts, timing }, deps)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].options.method, 'POST')
  const payload = JSON.parse(calls[0].options.body)
  assert.deepEqual(payload.multi_prompt.map(shot => shot.duration), [9, 3, 3])
  assert.equal(payload.duration, 15)
  await assert.rejects(() => lib.submitKling4TrialVideo({ prompts, timing: { ...timing, voiceovers: [] } }, deps))
  await assert.rejects(() => lib.submitKling4TrialVideo({ prompts, timing: { ...timing, wordsPerSecond: 0 } }, deps))
  await assert.rejects(() => lib.submitKling4TrialVideo({ prompts: new Array(6).fill('An impossible sixth scene'), timing: { voiceovers: new Array(6).fill(words(2)), wordsPerSecond: 2.5 } }, deps))
  assert.equal(calls.length, 1, 'invalid timing must not reach the provider')
})

test('actual birth wiring signs the same narration timing and intervals while preserving the separate Seedance fallback plan', () => {
  const filename = 'app/api/generate-video-cinematic/route.ts'
  const ast = ts.createSourceFile(filename, read(filename), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  let timingInitializer, promptInitializer, markerBlock, submitTimingArgument
  const walk = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === 'kling4Timing') timingInitializer = node.initializer?.getText(ast)
      if (node.name.text === 'kling4Prompts') promptInitializer = node.initializer?.getText(ast)
    }
    if (ts.isIfStatement(node) && node.expression.getText(ast) === 'kling4Trial' && node.thenStatement.getText(ast).includes('response.kling4_trial =')) markerBlock = node.getText(ast)
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'submitKling4TrialVideo') {
      const field = node.arguments[0]?.properties?.find(property => ts.isPropertyAssignment(property) && property.name.getText(ast) === 'timing')
      submitTimingArgument = field?.initializer.getText(ast)
    }
    ts.forEachChild(node, walk)
  }
  walk(ast)
  assert.ok(timingInitializer && promptInitializer && markerBlock, 'real timing and signed birth marker wiring must be present')
  assert.equal(submitTimingArgument, 'kling4Timing', 'provider submission consumes the same final timing object')
  const exports = {}
  const code = ts.transpileModule(`export function birth(scenes, classicScenePrompts, kling4ApprovedStills, wordsPerSecond) {
    const narrationRate = { wordsPerSecond }
    const kling4Timing = ${timingInitializer}
    const kling4Prompts = ${promptInitializer}
    const kling4Trial = { engineUsed: 'kling4', costUsd: 2.355, job: { requestId: 'offline-timed-job', model: 'kling/v4/image-to-video', submittedAt: '2026-10-28T12:00:00.000Z' } }
    const response = { scenes: scenes.map(scene => scene.description), scene_captions: ['caption one', 'caption two', 'caption three'], clip_seconds: scenes.map(scene => scene.clipSeconds), clip_word_starts: [0, 24, 30] }
    const req = { headers: {} }
    const paisDoRequest = () => 'BR'
    ${markerBlock}
    return { response, timing: kling4Timing }
  }`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  // KINEO-QUALIDADE-TODOS-MOTORES-2910 — execute the actual compact quality helper and its real dependency graph; only I/O is forbidden.
  vm.runInNewContext(code, {
    exports, kling4TrialSceneDurations: lib.kling4TrialSceneDurations, buildKling4TrialInput: lib.buildKling4TrialInput,
    promptCurtoDoFilmeKling4: load('lib/cinematic/filmQuality.ts').promptCurtoDoFilmeKling4,
    styleAnchor: load('lib/cinematic/sceneStyle.ts').deriveStyleAnchor('stylized 3D animated film'),
  }, { timeout: 5000 })
  const scenes = voiceovers.map((voiceover, i) => ({ voiceover, aiPrompt: prompts[i], description: 'Description ' + i, clipSeconds: 6 + i }))
  const images = ['https://fal.media/test/first.png', null, 'https://fal.media/test/third.png']
  const result = json(exports.birth(scenes, prompts.map(prompt => prompt + ' Style-only boilerplate unrelated to spoken word count.'), images, 1.98))
  assert.deepEqual(result.timing, { voiceovers, wordsPerSecond: 1.98 })
  const marker = result.response.kling4_trial
  assert.deepEqual(marker.scene_plan.map(scene => scene.duration_seconds), [9, 3, 3])
  assert.deepEqual(marker.scene_plan.map(scene => scene.start_seconds), [0, 9, 12])
  assert.deepEqual(marker.scene_plan.map(scene => scene.text), voiceovers)
  assert.deepEqual(marker.scene_plan.map(scene => scene.still_url), images)
  assert.deepEqual(marker.scene_plan.map(scene => scene.description), scenes.map(scene => scene.description))
  assert.equal(marker.voice_words_per_second, 1.98)
  assert.equal(marker.timing_basis, 'narration_words_per_voice_pace')
  assert.deepEqual(marker.fallback_scenes.map(scene => scene.duration), [6, 7, 8], 'Seedance provider durations are independent from Kling shot timing')
  assert.deepEqual(marker.fallback_response.clip_seconds, [6, 7, 8])
  assert.deepEqual(result.response.clip_seconds, [15], 'compose receives the full continuous Kling video')
  assert.deepEqual(result.response.clip_word_starts, [0])
  assert.deepEqual(result.response.scene_fal_inputs[0].multi_prompt.map(shot => shot.duration), [9, 3, 3])
  assert.equal(result.response.scenes.length, 1)
})
