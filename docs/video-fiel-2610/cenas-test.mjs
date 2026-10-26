// Offline: real modules, only model I/O mocked. No SDK, credentials, env files,
// provider requests, database, clock or paid generation are available here.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createOfflineLoader } from '../../scripts/test-support/offline-ts-loader.mjs'

const root = process.cwd()
const read = p => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const equal = (a, b, message) => { assert.deepEqual(JSON.parse(JSON.stringify(a)), b, message); checks++ }
const scene = (description, voiceover, hint = description) => ({ description, voiceover, hint })
const plain = createOfflineLoader()
const P = plain('@/lib/cinematic/visualPromptPolicy')
const D = plain('@/lib/cinematic/sceneDescriptions')
const S = plain('@/lib/cinematic/sceneStyle')

function directionChecks(policy) {
  const direction = policy.visualDescriptionDirection({ mode: 'character_story', style: S.deriveStyleAnchor('anime'), aspect: '16:9' })
  for (const rule of [
    'customer request fixes the cast', 'spoken line fixes its action and current state',
    'same number, species, identity', 'Never merge two characters into one',
    'strike, block or dodge', 'not a portrait, heroic pose, static face-off',
    'Use one clear action beat per shot in the requested sequence',
    'Carry established states forward', 'final stated state',
    'Reusing the same subjects is correct', 'never replace them to create variety',
    'keep it unspecified', 'not words or objects to depict',
  ]) check(direction.includes(rule), `Shared actual description direction: ${rule}`)
  check(direction.includes('anime') && direction.includes('16:9'), 'Direction keeps chosen style and aspect')
  for (const mode of ['documentary_faceless', 'presenter']) {
    check(policy.visualDescriptionDirection({ mode, style: S.deriveStyleAnchor('photoreal'), aspect: '1:1' }).includes(policy.SCENE_FIDELITY_DIRECTION), `${mode} also receives the same direction`)
  }
}
directionChecks(P)

function fallbackChecks(api) {
  const scenes = Object.freeze([
    Object.freeze(scene('Wide shot of a white sock waiting on a rug, a dog watches beside it', 'The large sock is white.', 'wide shot of a white sock')),
    Object.freeze(scene('', 'The large sock is now completely blue.', 'Macro view of the large sock now completely blue')),
    Object.freeze(scene('Both socks fully white again on the same rug', 'Both socks become white again.')),
  ])
  const r = api.completeSceneDescriptions({ descriptions: [scenes[0].description, null, scenes[2].description], scenes, topic: 'Two socks change color on a rug.' })
  check(r.descriptions[1].includes('completely blue'), 'Missing model description uses its OWN current color')
  check(!/white sock|dog watches|waiting on a rug/.test(r.descriptions[1]), 'Neighbor subject, state, action and extra actor never leak into own-hint fallback')
  check(!r.reviewRequired, 'Distinct visual hint resolves without blocking a good scene')
  equal(r.fallbacks, [{ index: 1, source: 'own_hint_scrubbed' }], 'Fallback provenance names its own scene')
  check(r.descriptions[0] === scenes[0].description && r.descriptions[2] === scenes[2].description, 'Valid model descriptions stay byte-identical')
  check(scenes[1].voiceover === 'The large sock is now completely blue.', 'Narration is never rewritten')

  for (const hint of ['The large sock is now completely blue.', 'the large sock is now completely blue', 'Create a video about the large blue sock', 'Return exactly 3 scenes in JSON', '']) {
    const input = [{ voiceover: 'The large sock is white.', hint: 'white sock' }, { voiceover: 'The large sock is now completely blue.', hint }]
    const rr = api.completeSceneDescriptions({ descriptions: ['Wide shot of the large white sock on a rug', null], scenes: input, topic: 'Two socks change color.' })
    equal(rr.reviewRequired, [1], `Raw/missing/instruction hint requires review: ${hint || '(empty)'}`)
    check(rr.descriptions[1] === '', 'Unresolved description cannot masquerade as a known neighbor subject')
    equal(rr.fallbacks, [{ index: 1, source: 'requires_review' }], 'Unresolved provenance is explicit')
  }

  const fight = api.completeSceneDescriptions({
    descriptions: ['A red fox waits in a bamboo grove', null],
    scenes: [{ voiceover: 'The red fox waits.', hint: '' }, { voiceover: 'The blue fox ducks the red fox punch.', hint: 'Tracking shot of the blue fox ducking the red fox punch' }],
    topic: 'A red fox and a blue fox fight in a bamboo grove.',
  })
  check(fight.descriptions[1].includes('ducking') && !fight.descriptions[1].includes('waits'), 'Fight keeps current dodge instead of copying prior pose')
  const cta = api.completeSceneDescriptions({ descriptions: ['The large sock is fully blue, soft lighting', null], scenes: [{ voiceover: 'The large sock is blue.' }, { voiceover: 'Follow for the next one!', hint: 'Follow for the next one' }], topic: 'Two socks change color.' })
  check(!cta.reviewRequired && cta.descriptions[1].includes('fully blue') && !/follow/i.test(cta.descriptions[1]), 'Pure CTA can hold known current subject without inventing an event or blocking all endings')
  const noModel = api.completeSceneDescriptions({ descriptions: [], scenes: [{ voiceover: 'The blue fox dodges.', hint: 'The blue fox dodges.' }], topic: 'A red and a blue fox fight.' })
  equal(noModel.reviewRequired, [0], 'No model/no safe hint remains unknown instead of inventing a generic topic image')
  check(noModel.descriptions[0] === '', 'Unknown means review, not a provider prompt')
  const dragon = api.completeSceneDescriptions({ descriptions: [null], scenes: [{ voiceover: 'The dragon blocks the blow.', hint: 'Low angle shot of a green dragon blocking a wooden staff' }], topic: 'A green dragon blocks a wooden staff.' })
  check(dragon.descriptions[0].includes('green dragon') && !dragon.reviewRequired, 'Literal requested creature is kept instead of scrubbed into a subjectless sentence')
  const metaphor = api.completeSceneDescriptions({ descriptions: [null], scenes: [{ voiceover: 'A tsunami stops everything.', hint: 'An enormous monster looming over the sea' }], topic: 'A tsunami reaches a deserted coast.' })
  equal(metaphor.reviewRequired, [0], 'Unexplained creature is not silently rendered as a tsunami metaphor')
}
fallbackChecks(D)

const visualPolicy = { mode: 'character_story', style: S.deriveStyleAnchor('anime'), aspect: '16:9' }
const requested = 'Two foxes fight in a bamboo grove: a red fox blocks the blue fox punch, then the blue fox dodges. No vehicle or extra fighter. Keep the same clothes.'
const response = [
  { description: 'The red fox blocks the blue fox punch in the bamboo grove', voiceover: 'The red fox blocks the blue fox punch in the grove.', stockSearchQuery: 'two foxes bamboo punch block', caption: 'The first block' },
  { description: 'The same blue fox ducks below the red fox strike', voiceover: 'The blue fox dodges the red fox strike in the same grove.', stockSearchQuery: 'blue fox dodges red fox strike', caption: 'A quick dodge' },
  { description: 'Both foxes stop fighting and lower their arms', voiceover: 'Both foxes stop fighting and lower their arms by the bamboo.', stockSearchQuery: 'two foxes bamboo rest', caption: 'The fight ends' },
]
function modelLoader(reply, source = null) {
  const requests = []
  const load = createOfflineLoader({ source, mocks: {
    '@/lib/openai': { openai: { chat: { completions: { create: async (input, options) => {
      requests.push({ input, options })
      return { choices: [{ message: { content: JSON.stringify(reply) } }] }
    } } } } },
    '@/lib/avatar/veed': { PRESENTER_MODEL: 'fixture/presenter', PRESENTER_USD_PER_SECOND: 0 },
  } })
  return { load, requests }
}
async function writerChecks(source = null) {
  const { load, requests } = modelLoader(response, source)
  const out = await load('@/lib/runway').generateScenes(requested, 3, visualPolicy, { wordsPerScene: [6, 22], language: 'pt', sceneSeconds: 5 })
  check(requests.length === 1, 'Scene writer retains one existing request; no new retry/model call')
  const { input, options } = requests[0]
  check(input.model === 'gpt-4o' && input.temperature === 0.4 && input.max_tokens === 1800 && options.timeout === 35000, 'Writer model, temperature, token ceiling and timeout unchanged')
  const text = input.messages.map(m => m.content).join('\n')
  check(text.includes(requested), 'The full requested cast/action order enters the existing writer')
  check(text.includes('SCENE FIDELITY') && text.includes('strike, block or dodge'), 'Existing writer receives fidelity/action contract')
  check(text.includes('Include a number, name, date, amount or comparison only when the input supplies it'), 'Current writer never forces a fabricated number/name into fiction')
  check(!text.includes('MUST include at least one SPECIFIC number'), 'Old demand for invented specificity is absent on current cinematic writer')
  check(text.includes('Portuguese') && text.includes('5-second scene') && text.includes('16:9'), 'Language, duration and format remain caller-owned')
  equal(out.map(s => s.voiceover), response.map(s => s.voiceover), 'Parser does not rewrite spoken lines from the writer')
}
await writerChecks()

async function hollywoodChecks(source = null) {
  const reply = {
    genre: 'fantasy', hostFits: false, stylized: true,
    characterSheet: 'A red fox in a gray jacket; a blue fox in a cream jacket.',
    environmentSheet: 'A bamboo grove.', styleSheet: 'Anime cel shading, consistent palette.',
    scenes: response.map((s, i) => ({ index: i + 1, type: 'support', beat: i === 0 ? 'HOOK' : i === 2 ? 'PAYOFF' : 'ESCALATION', seconds: 5, prompt: s.description, voiceover: s.voiceover, caption: s.caption })),
  }
  const { load, requests } = modelLoader(reply, source)
  const out = await load('@/lib/hollywood/router').planHollywoodScenes({ idea: requested, voiceoverScript: response.map(s => s.voiceover).join(' '), durationSeconds: 15, language: 'pt', faceless: true, aspect: '16:9' })
  check(requests.length === 1, 'Hollywood keeps its existing one planner request on the fixture')
  const text = requests[0].input.messages.map(m => m.content).join('\n')
  for (const instruction of ['preserve the input\'s cast', 'never replace them with one invented human', 'strike, block, dodge, contact or consequence', 'Event order and current state take priority over variety', 'SCENE FIDELITY']) check(text.includes(instruction), `Hollywood actual request: ${instruction}`)
  for (const contrary of ['invent EXACTLY ONE fictional person', 'Every non-dialogue scene depicts a DIFFERENT primary subject', 'no stunts, sports moves or acrobatics on human actors']) check(!text.includes(contrary), `Contradictory planner rule removed: ${contrary}`)
  check(requests[0].input.model === 'gpt-4o' && requests[0].input.max_tokens === 2200 && requests[0].options.maxRetries === 1, 'Hollywood model and existing request budget unchanged')
  check(out.hostFits === false && out.scenes.every(s => s.type !== 'dialogue'), 'Existing faceless mode remains in force')
  check(out.scenes.every(s => /16:9/.test(s.prompt)), 'Existing aspect backstop remains in force')
}
await hollywoodChecks()

// The entry film has the same fidelity contract but its OWN existing budget:
// 3 shots at a 5-second spoken beat, with provider steps 6|7|8 by real speech.
// A 60-second film keeps its seven initial shots. No duration/cost code changes.
const duration = plain('@/lib/durationByEngine')
const coverage = plain('@/lib/cinematic/seedanceCobreAFala')
const wordsLoad = createOfflineLoader({ mocks: { '@/lib/compose': { targetWordCount() { throw new Error('Caller must supply its measured voice rate') } } } })
const words = wordsLoad('@/lib/cinematic/sceneWords')
check(duration.SEEDANCE_SHORT_CLIPS === 3, 'Seedance 15s still has exactly three planned clips')
equal(duration.SEEDANCE_SHORT_CLIP_STEPS, [6, 7, 8], 'Provider duration steps stay unchanged')
for (const target of [15, 60]) {
  const count = target === 15 ? duration.SEEDANCE_SHORT_CLIPS : Math.max(2, Math.min(9, Math.ceil(target / 9)))
  const range = words.wordsPerSceneFor(target, count, 2.5)
  const fixture = Array.from({ length: count }, (_, i) => ({
    ...response[i % response.length],
    voiceover: Array.from({ length: range[0] }, (_, j) => j === 0 ? `beat${i + 1}` : 'bamboo').join(' ') + '.',
  }))
  const { load, requests } = modelLoader(fixture)
  const out = await load('@/lib/runway').generateScenes(requested, count, visualPolicy, { wordsPerScene: range, language: 'en', ...(target === 15 ? { sceneSeconds: target / count } : {}) })
  const text = requests[0].input.messages.map(m => m.content).join('\n')
  check(requests.length === 1 && out.length === count, `${target}s retains its original scene count and no added model request`)
  check(text.includes(target === 15 ? 'SHORT STORY' : 'CONNECTED STORY'), `${target}s gets the appropriate beginning-to-ending direction`)
  check(text.includes('stated resolution or final state') || text.includes('stated ending and final state'), `${target}s reserves an ending rather than a generic CTA`)
  check(text.includes('Do not add scenes or lengthen the film'), `${target}s cannot silently expand its budget`)
  check(text.includes('Never merge two characters') && text.includes('strike, block or dodge'), `${target}s has the same cast/action realism contract`)
  equal(out.map(s => s.voiceover), fixture.map(s => s.voiceover), `${target}s preserves the mocked accepted narration byte-for-byte`)
  if (target === 15) {
    check(text.includes('5-second scene'), '15s writer is not accidentally using a one-minute/10s beat budget')
    for (const [wordCount, expectedStep] of [[36, 6], [45, 7], [54, 8]]) {
      const spoken = duration.seedanceShortSpeechSeconds(new Array(wordCount).fill('bamboo').join(' '), 2.5)
      check(duration.seedanceShortClipSeconds(spoken, 0.16) === expectedStep, `15s: ${wordCount} spoken words retain provider step ${expectedStep}`)
    }
  } else {
    const before = fixture.map(s => ({ voiceover: s.voiceover, description: s.description }))
    const covered = coverage.cobrirFalaComImagem(before, { wordsPerSecond: 2.5, fazerCena: (base, voiceover) => ({ ...base, voiceover }) })
    check(covered.cenas === before && !covered.ainda_curta, '60s narration that fits retains the same array; no additional paid clip is planned')
  }
  const beats = Array.from({ length: count + 1 }, (_, i) => ({ voiceover: `Subject beat${i + 1} ${i === count ? 'ends in final blue state.' : 'continues the requested action.'}`, pexelsQuery: `same subject beat${i + 1}` }))
  const narration = beats.map(s => s.voiceover).join(' ')
  const merged = duration.seedanceShortMarkedScenes({ segments: beats, narration }, count, { alinharFatias: target !== 15 })
  check(merged.length === count && merged.map(s => s.voiceover).join(' ') === narration, `${target}s marked story keeps every word and event in order within its existing count`)
  check(merged.at(-1).voiceover.endsWith('final blue state.'), `${target}s payoff/final state is never dropped when blocks are merged`)
}

// Metamorphic proof: delete or reverse one relevant clause in memory, then run
// the same assertions against real code. Nothing on disk is rewritten.
let rejected = 0
async function mustReject(name, file, before, after, proof) {
  check(read(file).includes(before), `Mutation anchor exists: ${name}`)
  const source = (p, text) => p === file ? text.replace(before, after) : text
  let caught = false
  try { await proof(source) } catch { caught = true }
  check(caught, `Mutation rejected: ${name}`)
  rejected++
}
await mustReject('drop shared direction from actual descriptor', 'lib/cinematic/visualPromptPolicy.ts', '. ${SCENE_FIDELITY_DIRECTION}`', '.`', source => directionChecks(createOfflineLoader({ source })('@/lib/cinematic/visualPromptPolicy')))
await mustReject('force a number on fiction', 'lib/runway.ts', '${specificityRule} Exact TTS text.', 'MUST include at least one SPECIFIC number. Exact TTS text.', writerChecks)
await mustReject('reintroduce invented single human', 'lib/hollywood/router.ts', 'preserve the input\'s cast, including multiple characters, animals or objects; never replace them with one invented human.', 'invent EXACTLY ONE fictional person.', hollywoodChecks)
await mustReject('allow raw narration as fallback hint', 'lib/cinematic/sceneDescriptions.ts', '!hintIsSpeech && !instruction', '!instruction', source => fallbackChecks(createOfflineLoader({ source })('@/lib/cinematic/sceneDescriptions')))
await mustReject('drop reviewRequired evidence', 'lib/cinematic/sceneDescriptions.ts', 'reviewRequired.push(i)', 'void i', source => fallbackChecks(createOfflineLoader({ source })('@/lib/cinematic/sceneDescriptions')))
await mustReject('copy neighbor subject over changed state', 'lib/cinematic/sceneDescriptions.ts', "describeFromSubject(i, pista, 'preserve the established lighting and art style', rawHint)", "describeFromSubject(i, sceneSubjectOf(src || ''), shotTailOf(src || ''), rawHint)", source => fallbackChecks(createOfflineLoader({ source })('@/lib/cinematic/sceneDescriptions')))

console.log(JSON.stringify({ status: 'PASS', checks, rejectedMutations: rejected, network: 'disabled', modelCalls: 'mocked only', productionValidation: false }))
