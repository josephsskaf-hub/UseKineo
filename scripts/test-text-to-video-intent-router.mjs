#!/usr/bin/env node
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = mkdtempSync(join(tmpdir(), 'kineo-text-to-video-intent-'))
const requireCompiled = createRequire(join(out, 'entry.cjs'))
const read = (path) => readFileSync(join(root, path), 'utf8')
const localTsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc')
const tsc = existsSync(localTsc)
  ? localTsc
  : join(root, '..', '..', '..', 'node_modules', 'typescript', 'bin', 'tsc')

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }
const ok = (value, message) => { assert.ok(value, message); checks += 1 }
const includes = (source, needle, message) => ok(source.includes(needle), message)

try {
  execFileSync(process.execPath, [
    tsc,
    join(root, 'lib', 'growth', 'textToVideoIntent.ts'),
    join(root, 'lib', 'growth', 'answerEngineCreationRouter.ts'),
    join(root, 'lib', 'creationHandoff.ts'),
    '--outDir', out,
    '--module', 'commonjs',
    '--target', 'es2022',
    '--moduleResolution', 'node',
    '--skipLibCheck',
  ], { stdio: 'pipe' })
  writeFileSync(join(out, 'package.json'), JSON.stringify({ type: 'commonjs' }))

  const intent = requireCompiled(join(out, 'growth', 'textToVideoIntent.js'))
  const answerRouter = requireCompiled(join(out, 'growth', 'answerEngineCreationRouter.js'))
  const handoff = requireCompiled(join(out, 'creationHandoff.js'))

  equal(intent.TEXT_TO_VIDEO_CAMPAIGN, 'push58_text_to_video_shorts', 'existing campaign remains stable')
  equal(intent.TEXT_TO_VIDEO_INPUT_MODES.length, 2, 'router has exactly two truthful input modes')
  equal(intent.getTextToVideoInputMode(null).id, 'idea', 'legacy visitors keep the established AI default')
  equal(intent.getTextToVideoInputMode('unknown').id, 'idea', 'unknown input modes fail closed to AI')

  const idea = intent.getTextToVideoInputMode('idea')
  equal(idea.scriptMode, 'ai', 'idea mode explicitly requests AI authoring')
  equal(idea.duration, 45, 'idea mode keeps the established 45-second default')
  const script = intent.getTextToVideoInputMode('finished_script')
  equal(script.scriptMode, 'verbatim', 'finished script explicitly requests verbatim handling')
  equal(script.duration, 35, 'finished script uses the proven 35-second target')

  equal(answerRouter.ANSWER_ENGINE_CREATION_ROUTER.modes.length, 2, 'answer engines receive the same two choices')
  equal(answerRouter.ANSWER_ENGINE_CREATION_ROUTER.campaign, intent.TEXT_TO_VIDEO_CAMPAIGN, 'answer-engine campaign is the real campaign')
  equal(answerRouter.ANSWER_ENGINE_CREATION_ROUTER.modes[0].scriptMode, idea.scriptMode, 'idea fact derives the UI mode')
  equal(answerRouter.ANSWER_ENGINE_CREATION_ROUTER.modes[0].durationSeconds, idea.duration, 'idea fact derives the UI duration')
  equal(answerRouter.ANSWER_ENGINE_CREATION_ROUTER.modes[1].scriptMode, script.scriptMode, 'script fact derives the UI mode')
  equal(answerRouter.ANSWER_ENGINE_CREATION_ROUTER.modes[1].durationSeconds, script.duration, 'script fact derives the UI duration')
  includes(answerRouter.ANSWER_ENGINE_CREATION_ROUTER.path, '#try-text-to-video-mode-heading', 'machine route lands on the visible decision')

  for (const mode of intent.TEXT_TO_VIDEO_INPUT_MODES) {
    const publicQuery = new URLSearchParams({
      prompt: mode.id === 'idea' ? 'Why the ocean glows at night' : 'HOOK: The ocean lit up. PAYOFF: It was alive.',
      create_intent: 'fast',
      intent_campaign: intent.TEXT_TO_VIDEO_CAMPAIGN,
      script_mode: mode.scriptMode,
      duration: String(mode.duration),
    })
    const authDestination = new URLSearchParams({ welcome: '1' })
    handoff.carryCreationHandoff(publicQuery, authDestination)
    const activation = handoff.resolveActivationCreationContract(authDestination)
    equal(activation.scriptMode, mode.scriptMode, `${mode.id}: mode survives signup`)
    equal(activation.duration, mode.duration, `${mode.id}: duration survives signup`)
    equal(activation.structureFirst, mode.scriptMode === 'ai', `${mode.id}: writer policy matches the choice`)
  }

  const page = read('app/text-to-video-shorts/page.tsx')
  const router = read('app/text-to-video-shorts/TextToVideoIntentForm.tsx')
  const sharedForm = read('app/youtube-shorts-from-topic/TopicGeneratorForm.tsx')
  const facts = read('lib/kineoFacts.ts')
  const llms = read('app/llms.txt/route.ts')
  includes(page, "import TextToVideoIntentForm from './TextToVideoIntentForm'", 'production page imports the router')
  equal(page.split('<TextToVideoIntentForm').length - 1, 1, 'production page renders one router')
  ok(!page.includes('<TopicGeneratorForm'), 'production page no longer sends both input types through one implicit mode')
  includes(router, 'TEXT_TO_VIDEO_INPUT_MODES.map', 'both allow-listed choices render from one source')
  includes(router, 'aria-pressed={active}', 'mode buttons expose their selected state')
  includes(router, "useState<TextToVideoInputMode>('idea')", 'legacy AI path remains the default')
  includes(router, "examples={isFinishedScript ? [] : IDEA_EXAMPLES}", 'idea examples cannot masquerade as finished scripts')
  includes(router, 'scriptMode={selected.scriptMode}', 'selected mode reaches the real form')
  includes(router, 'duration={selected.duration}', 'selected duration reaches the real form')
  includes(router, 'analyticsVariant={TEXT_TO_VIDEO_INTENT_VARIANT}', 'submissions are versioned without a new event name')
  includes(sharedForm, 'script_mode: scriptMode', 'existing submit telemetry records the allow-listed mode')
  includes(sharedForm, 'duration_seconds: duration', 'existing submit telemetry records the bounded duration')
  includes(sharedForm, 'variant: analyticsVariant', 'existing submit telemetry records the experiment variant')
  includes(sharedForm, 'name="script_mode" value={scriptMode}', 'script mode is carried in the signup GET')
  includes(sharedForm, 'name="duration" value={duration}', 'duration is carried in the signup GET')
  ok(!router.includes('trackEvent('), 'selection alone is not inflated into a conversion event')
  ok(!sharedForm.includes('prompt: topic'), 'telemetry never stores the topic or script')
  includes(facts, 'creationRouter: typeof ANSWER_ENGINE_CREATION_ROUTER', '/api/facts contract exposes the shared router')
  includes(facts, '...ANSWER_ENGINE_CREATION_ROUTER', '/api/facts payload derives from the executable router')
  includes(llms, 'ANSWER_ENGINE_CREATION_ROUTER.modes.map', '/llms.txt renders the executable modes instead of copying them')
  includes(llms, 'Choose the creation path from what the user already has', '/llms.txt labels the decision for answer engines')

  const preview = join(root, 'docs', 'previews', 'TEXT-TO-VIDEO-INTENT-ROUTER-2026-08-28.html')
  ok(existsSync(preview), 'required before/after preview exists')
  const previewSource = read('docs/previews/TEXT-TO-VIDEO-INTENT-ROUTER-2026-08-28.html')
  for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
    includes(previewSource, label, `preview includes ${label}`)
  }

  console.log(`text-to-video-intent-router: ${checks}/${checks} checks passed`)
} finally {
  rmSync(out, { recursive: true, force: true })
}
