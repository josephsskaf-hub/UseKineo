#!/usr/bin/env node
// Deterministic contract test: compiles and executes the same pure modules
// used by signup, GenerateClient and the admin funnel. No network or secrets.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = mkdtempSync(join(tmpdir(), 'kineo-chatgpt-handoff-'))
const requireCompiled = createRequire(join(out, 'entry.cjs'))
const read = (path) => readFileSync(join(root, path), 'utf8')
const localTsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc')
const tsc = existsSync(localTsc)
  ? localTsc
  : join(root, '..', '..', '..', 'node_modules', 'typescript', 'bin', 'tsc')

const page = read('app/chatgpt-to-youtube-shorts/page.tsx')
const topicForm = read('app/youtube-shorts-from-topic/TopicGeneratorForm.tsx')
const organicCta = read('components/OrganicCtaLink.tsx')
const signup = read('app/(auth)/signup/page.tsx')
const generate = read('app/(dashboard)/generate/GenerateClient.tsx')
const analyze = read('app/api/analyze-idea/route.ts')
const facts = read('lib/kineoFacts.ts')
const llms = read('app/llms.txt/route.ts')
const factsRoute = read('app/api/facts/route.ts')
const adminFunnel = read('app/api/admin/funnel/route.ts')
const funnelClient = read('app/(dashboard)/admin/funnel/FunnelClient.tsx')

let checks = 0
function ok(value, message) {
  assert.ok(value, message)
  checks += 1
}
function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message)
  checks += 1
}
function includes(source, needle, message) {
  ok(source.includes(needle), message)
}
function count(source, needle) {
  return source.split(needle).length - 1
}

try {
  execFileSync(process.execPath, [
    tsc,
    join(root, 'lib', 'creationHandoff.ts'),
    join(root, 'lib', 'organicFunnel.ts'),
    '--outDir', out,
    '--module', 'commonjs',
    '--target', 'es2022',
    '--moduleResolution', 'node',
    '--skipLibCheck',
  ], { stdio: 'pipe' })
  writeFileSync(join(out, 'package.json'), JSON.stringify({ type: 'commonjs' }))

  const handoff = requireCompiled(join(out, 'creationHandoff.js'))
  const organic = requireCompiled(join(out, 'organicFunnel.js'))

  // Real public form → shared signup carrier → real activation resolver.
  const script = 'HOOK: The radio went silent. MICRO REWARD: The clock kept moving. ESCALATION: Nobody knew why. RHYTHM: Then it rang. PAYOFF: The call came from inside.'
  const publicQuery = new URLSearchParams({
    prompt: script,
    create_intent: 'trial_best',
    intent_campaign: 'chatgpt_to_shorts',
    script_mode: 'verbatim',
    duration: '35',
  })
  const authDestination = new URLSearchParams({ welcome: '1' })
  const carried = handoff.carryCreationHandoff(publicQuery, authDestination)
  const activation = handoff.resolveActivationCreationContract(authDestination)

  equal(carried.prompt, script, 'signup carrier keeps the bounded script')
  equal(authDestination.get('create_intent'), 'trial_best', 'best eligible trial intent crosses signup')
  equal(authDestination.get('script_mode'), 'verbatim', 'verbatim mode crosses signup')
  equal(authDestination.get('duration'), '35', '35-second target crosses signup')
  equal(activation.prompt, script, 'activation receives the same script')
  equal(activation.createIntent, 'trial_best', 'activation receives the best eligible trial intent')
  equal(activation.scriptMode, 'verbatim', 'activation commits verbatim mode')
  equal(activation.duration, 35, 'activation commits the requested duration')
  equal(activation.structureFirst, false, 'verbatim activation cannot call the structure-first rewriter')

  const invalid = handoff.resolveActivationCreationContract(new URLSearchParams({
    prompt: 'bounded', create_intent: 'fast', script_mode: 'rewrite_everything', duration: '999',
  }))
  equal(invalid.scriptMode, 'ai', 'unknown script modes fail closed to the established default')
  equal(invalid.duration, 45, 'unknown durations fail closed to the established default')
  equal(invalid.structureFirst, true, 'generic legacy handoffs preserve prior structure-first behavior')
  equal(
    handoff.readCreationHandoff(new URLSearchParams({ prompt: '   ', create_intent: 'fast' })).createIntent,
    null,
    'empty prompt cannot arm autostart',
  )

  // One person may open the handoff three times and submit once. That is one
  // interested person and one intent person, never four conversions.
  const samePerson = [
    ...['hero', 'mid', 'final'].map((placement) => ({
      name: 'organic_handoff_opened', user_id: null, session_id: 'session-a',
      created_at: `2026-08-27T10:0${placement.length}:00Z`, metadata: { placement },
    })),
    { name: 'organic_topic_submitted', user_id: null, session_id: 'session-a', created_at: '2026-08-27T10:10:00Z', metadata: null },
    { name: 'organic_cta_clicked', user_id: null, session_id: 'session-a', created_at: '2026-08-27T10:10:00Z', metadata: { mirrors: 'organic_topic_submitted' } },
  ]
  equal(organic.summarizeOrganicActions(samePerson), { handoffOpenActors: 1, intentActors: 1 }, 'scroll + submit is not double-counted')
  equal(organic.uniqueOrganicActorCount(samePerson.slice(0, 3)), 1, 'three CTA placements dedupe to one visitor')
  const twoPeople = [...samePerson, { ...samePerson[3], session_id: 'session-b' }]
  equal(organic.summarizeOrganicActions(twoPeople).intentActors, 2, 'a second person remains a second intent')

  // One reused handoff form; no duplicate signup implementation.
  includes(page, "import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'", 'page reuses TopicGeneratorForm')
  equal(count(page, '<TopicGeneratorForm'), 1, 'exactly one handoff form is rendered')
  includes(page, "const CAMPAIGN = 'chatgpt_to_shorts'", 'campaign stays canonical')
  includes(page, "const HANDOFF_ID = 'chatgpt-script-handoff'", 'handoff has a stable anchor')
  includes(page, 'scriptMode="verbatim"', 'landing explicitly requests verbatim handling')
  includes(page, 'duration={35}', 'landing explicitly requests its advertised duration')
  includes(page, 'creationIntent="trial_best"', 'landing explicitly requests the best eligible trial engine')
  includes(page, 'otherwise it falls back safely to Fast', 'landing tells the truth about the safe fallback')
  includes(page, 'RHYTHM:', 'published prompt contains the fifth supported section')
  ok(!page.includes('Your exact text'), 'copy does not promise byte-for-byte punctuation')
  ok(!page.includes('goes in as-is'), 'copy does not claim an unqualified as-is path')
  includes(page, 'will not rewrite your wording', 'copy promises only the enforced word-sequence contract')

  // Three scroll CTAs have their own semantic event and the same focus target.
  equal(count(page, 'href={`#${HANDOFF_ID}`}'), 3, 'hero, middle and final CTAs share the handoff anchor')
  equal(count(page, 'focusTargetId={HANDOFF_ID}'), 3, 'all three CTAs request focus')
  equal(count(page, 'analyticsEvent="organic_handoff_opened"'), 3, 'all scroll CTAs use the non-conversion event')
  includes(organicCta, "analyticsEvent = 'organic_cta_clicked'", 'ordinary CTA analytics remain backward compatible')
  includes(organicCta, 'trackEvent(analyticsEvent', 'CTA emits the selected semantic event')
  includes(organicCta, 'target.scrollIntoView', 'CTA scrolls to the handoff')
  includes(organicCta, 'control?.focus({ preventScroll: true })', 'CTA focuses the form control')

  // Form fields and signup both use the shared contract.
  includes(topicForm, 'name="prompt"', 'script is submitted as prompt')
  includes(topicForm, "creationIntent = 'fast'", 'shared form preserves Fast as the default for every other caller')
  includes(topicForm, 'name="create_intent" value={creationIntent}', 'selected creation intent is explicit')
  includes(topicForm, 'create_intent: creationIntent', 'example clicks carry the selected creation intent too')
  includes(topicForm, 'name="intent_campaign" value={campaign}', 'intent campaign is explicit')
  includes(topicForm, 'name="script_mode" value={scriptMode}', 'script mode is explicit')
  includes(topicForm, 'name="duration" value={duration}', 'duration is explicit')
  includes(topicForm, 'name="utm_source" value={utmSource}', 'UTM source is explicit')
  includes(topicForm, 'name="utm_medium" value={utmMedium}', 'UTM medium is explicit')
  includes(topicForm, 'examples.length > 0', 'empty script examples do not render an empty control group')
  includes(signup, "import { carryCreationHandoff } from '@/lib/creationHandoff'", 'signup uses the executable carrier')
  includes(signup, 'carryCreationHandoff(params, activationParams)', 'signup forwards only allowlisted creation fields')
  includes(signup, 'return `/generate?${activationParams.toString()}`', 'script lands on the creation surface')

  // The actual GenerateClient caller waits for state commitment, then passes
  // the resolved contract to handleAnalyze. The API receives both values.
  includes(generate, 'resolveActivationCreationContract(searchParams)', 'GenerateClient uses the executable resolver')
  includes(generate, 'setScriptMode(activationContract.scriptMode)', 'caller commits script mode')
  includes(generate, 'setDuration(activationContract.duration)', 'caller commits duration')
  includes(generate, 'scriptMode !== activationContract.scriptMode', 'caller waits for script mode state')
  includes(generate, 'duration !== activationContract.duration', 'caller waits for duration state')
  includes(generate, 'structureFirst: activationContract.structureFirst', 'caller disables the rewriter for verbatim handoffs')
  includes(generate, 'JSON.stringify({ prompt: source, duration, language, scriptMode })', 'analysis API receives committed mode and duration')
  includes(analyze, "body.scriptMode === 'verbatim'", 'API has the verbatim fast path')
  includes(analyze, 'normalizeWords(polished) === normalizeWords(text)', 'punctuation polish is rejected if the word sequence changes')

  // Admin separates the two actions and uses the same executable deduper.
  includes(adminFunnel, "'organic_handoff_opened'", 'admin query includes handoff-open events')
  includes(adminFunnel, 'summarizeOrganicActions(organicEventRows)', 'admin aggregates semantic actions by actor')
  includes(adminFunnel, 'uniqueOrganicActorCount(organicLandingRows)', 'landing denominator counts people')
  includes(adminFunnel, 'intentActors: organicActions.intentActors', 'API exposes unique intent people')
  includes(funnelClient, 'label="Script handoff opens"', 'admin displays handoff interest separately')
  includes(funnelClient, 'label="Organic intent people"', 'admin labels the conversion numerator as people')

  // Answer engines and the CEO organic registry recognize the exact route and
  // its complete, honest contract.
  includes(facts, 'export const START_HERE_FACT', 'facts expose a shared start-here record')
  includes(facts, "url: `${BASE}/chatgpt-to-youtube-shorts`", 'start-here points at the handoff page')
  includes(facts, "['script', 'campaign', 'trial_best_creation_intent', 'verbatim_mode', 'duration']", 'machine-readable contract lists all carried values')
  includes(facts, 'Seedance when an active trial balance covers it, otherwise Fast', 'public facts describe the same bounded router')
  includes(facts, 'startHere: START_HERE_FACT', '/api/facts payload includes start-here')
  includes(factsRoute, 'JSON.stringify(getKineoFacts()', '/api/facts serializes the shared payload')
  includes(llms, 'START_HERE_FACT', '/llms.txt imports the shared record')
  includes(llms, '## Start here if you already have a ChatGPT script', '/llms.txt labels the route as start-here')
  includes(adminFunnel, "'/chatgpt-to-youtube-shorts'", 'admin organic registry includes the route')

  for (const preview of [
    'docs/previews/CHATGPT-SCRIPT-HANDOFF-2026-08-27.html',
    'docs/previews/CHATGPT-SCRIPT-HANDOFF-2026-08-27.svg',
    'docs/previews/CHATGPT-SCRIPT-HANDOFF-2026-08-27.png',
  ]) {
    ok(existsSync(join(root, preview)), `${preview} exists`)
  }

  const trialBestPreviewPath = 'docs/previews/CHATGPT-TRIAL-BEST-HANDOFF-2026-08-29.html'
  ok(existsSync(join(root, trialBestPreviewPath)), `${trialBestPreviewPath} exists`)
  const trialBestPreview = read(trialBestPreviewPath)
  includes(trialBestPreview, 'Before · desktop', 'trial-best preview contains the old desktop state')
  includes(trialBestPreview, 'After · desktop', 'trial-best preview contains the new desktop state')
  includes(trialBestPreview, 'After · mobile', 'trial-best preview contains the new mobile state')

  console.log(`chatgpt-script-handoff: ${checks}/${checks} checks passed`)
} finally {
  rmSync(out, { recursive: true, force: true })
}
