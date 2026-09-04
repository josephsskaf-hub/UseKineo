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
const portuguesePage = read('app/gerador-de-shorts-gratis/page.tsx')
const spanishPage = read('app/generador-de-shorts-gratis/page.tsx')
const localizedHandoff = read('components/LocalizedScriptHandoff.tsx')
const topicForm = read('app/youtube-shorts-from-topic/TopicGeneratorForm.tsx')
const organicCta = read('components/OrganicCtaLink.tsx')
const signup = read('app/(auth)/signup/page.tsx')
const generate = read('app/(dashboard)/generate/GenerateClient.tsx')
const analyze = read('app/api/analyze-idea/route.ts')
const parser = read('lib/scriptParser.ts')
const facts = read('lib/kineoFacts.ts')
const llms = read('app/llms.txt/route.ts')
const factsRoute = read('app/api/facts/route.ts')
const adminFunnel = read('app/api/admin/funnel/route.ts')
const funnelClient = read('app/(dashboard)/admin/funnel/FunnelClient.tsx')
const middleware = read('lib/supabase/middleware.ts')

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
    join(root, 'lib', 'growth', 'organicSignupTruth.ts'),
    '--outDir', out,
    '--module', 'commonjs',
    '--target', 'es2022',
    '--moduleResolution', 'node',
    '--skipLibCheck',
  ], { stdio: 'pipe' })
  writeFileSync(join(out, 'package.json'), JSON.stringify({ type: 'commonjs' }))

  const handoff = requireCompiled(join(out, 'creationHandoff.js'))
  const organic = requireCompiled(join(out, 'organicFunnel.js'))
  const organicSignup = requireCompiled(join(out, 'growth', 'organicSignupTruth.js'))

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

  const signedInRedirect = handoff.buildAuthenticatedCreationRedirect({
    prompt: script,
    campaign: 'chatgpt_to_shorts',
    createIntent: 'trial_best',
    language: 'pt',
    scriptMode: 'verbatim',
    duration: 35,
  })
  ok(signedInRedirect, 'authenticated handoff builds a same-origin destination')
  const signedInDestination = new URL(signedInRedirect, 'https://www.usekineo.com')
  equal(signedInDestination.pathname, '/studio/create', 'authenticated handoff enters the current creation surface')
  equal(signedInDestination.searchParams.get('prompt'), script, 'authenticated handoff keeps the bounded script')
  equal(signedInDestination.searchParams.get('create_intent'), 'trial_best', 'authenticated handoff keeps the best eligible trial intent')
  equal(signedInDestination.searchParams.get('intent_campaign'), 'chatgpt_to_shorts', 'authenticated handoff keeps its campaign')
  equal(signedInDestination.searchParams.get('language'), 'pt', 'authenticated handoff keeps its language')
  equal(signedInDestination.searchParams.get('script_mode'), 'verbatim', 'authenticated handoff keeps verbatim mode')
  equal(signedInDestination.searchParams.get('duration'), '35', 'authenticated handoff keeps its duration')
  equal(handoff.buildAuthenticatedCreationRedirect({
    prompt: '   ', campaign: 'chatgpt_to_shorts', createIntent: 'trial_best',
  }), null, 'empty authenticated handoff cannot arm a redirect')
  const boundedSignedInRedirect = handoff.buildAuthenticatedCreationRedirect({
    prompt: `  ${'a'.repeat(1100)}  `,
    campaign: 'chatgpt_to_shorts',
    createIntent: 'trial_best',
  })
  ok(boundedSignedInRedirect, 'long authenticated handoff still builds a destination')
  equal(
    new URL(boundedSignedInRedirect, 'https://www.usekineo.com').searchParams.get('prompt').length,
    1000,
    'authenticated handoff enforces the advertised script limit',
  )

  const invalid = handoff.resolveActivationCreationContract(new URLSearchParams({
    prompt: 'bounded', create_intent: 'fast', script_mode: 'rewrite_everything', duration: '999',
  }))
  equal(invalid.scriptMode, 'ai', 'unknown script modes fail closed to the established default')
  equal(invalid.duration, 35, 'unknown durations fail closed to the current visible short target')
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
  equal(organic.summarizeOrganicActions(samePerson), {
    handoffOpenActors: 1,
    intentActors: 1,
    signupHandoffActors: 0,
    signupMethodActors: 0,
  }, 'scroll + submit is not double-counted and unrelated signup stages stay empty')
  equal(organic.uniqueOrganicActorCount(samePerson.slice(0, 3)), 1, 'three CTA placements dedupe to one visitor')
  const twoPeople = [...samePerson, { ...samePerson[3], session_id: 'session-b' }]
  equal(organic.summarizeOrganicActions(twoPeople).intentActors, 2, 'a second person remains a second intent')

  // One reused handoff form; no duplicate signup implementation.
  includes(page, "import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'", 'page reuses TopicGeneratorForm')
  equal(count(page, '<TopicGeneratorForm'), 1, 'exactly one handoff form is rendered')
  includes(page, "const CAMPAIGN = 'chatgpt_to_shorts'", 'campaign stays canonical')
  includes(page, "const HANDOFF_ID = 'chatgpt-script-handoff'", 'handoff has a stable anchor')
  includes(page, 'formId={HANDOFF_ID}', 'the rendered handoff form receives the stable anchor')
  includes(topicForm, 'id={formId}', 'the shared form attaches its supplied anchor to visible DOM')
  includes(page, 'scriptMode="verbatim"', 'landing explicitly requests verbatim handling')
  includes(page, 'duration={35}', 'landing explicitly requests its advertised duration')
  includes(page, 'creationIntent="trial_best"', 'landing explicitly requests the best eligible trial engine')
  includes(page, 'preserveHandoffForSignedIn', 'landing keeps the script when an authenticated visitor skips signup')
  includes(page, 'otherwise it falls back safely to Fast', 'landing tells the truth about the safe fallback')
  includes(page, 'CREATION_HANDOFF_PROMPT_MAX_CHARS.toLocaleString', 'landing derives the advertised limit from the handoff contract')
  includes(page, 'If your script contains at least two Voiceover: or Narration: labels', 'landing conditions speech-only mode on two labels')
  includes(page, 'recognized Visual:, Camera:, scene headers and timecodes stay out of narration', 'landing names only recognized production directions')
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
  includes(topicForm, 'promptLimitState(topic, CREATION_HANDOFF_PROMPT_MAX_CHARS)', 'visible form measures the canonical handoff limit')
  includes(topicForm, 'promptLimitPreservedMessage(limitLocale)', 'oversized paste remains visible until the person chooses')
  includes(topicForm, 'formatPromptLimitTrimAction(limit.excess, limitLocale)', 'explicit trim action reports the excess')
  includes(topicForm, 'formatPromptLimitTrimNotice(result.removed, limitLocale)', 'trim confirmation follows the visible language')
  includes(topicForm, 'formatLimitCounter(limit, limitLocale)', 'counter follows the visible language')
  ok(!topicForm.includes('maxLength={1000}'), 'browser no longer silently truncates the public form')
  includes(topicForm, "creationIntent = 'fast'", 'shared form preserves Fast as the default for every other caller')
  includes(topicForm, 'name="create_intent" value={creationIntent}', 'selected creation intent is explicit')
  includes(topicForm, 'create_intent: creationIntent', 'example clicks carry the selected creation intent too')
  includes(topicForm, 'name="intent_campaign" value={campaign}', 'intent campaign is explicit')
  includes(topicForm, 'name="script_mode" value={scriptMode}', 'script mode is explicit')
  includes(topicForm, 'name="duration" value={duration}', 'duration is explicit')
  includes(topicForm, 'if (!preserveHandoffForSignedIn) return null', 'authenticated handoff remains explicitly opt-in')
  includes(topicForm, 'buildAuthenticatedCreationRedirect({', 'form delegates its authenticated destination to the executable contract')
  includes(topicForm, 'name="redirect" value={authRedirectFor(topic)', 'typed scripts carry a safe authenticated redirect')
  includes(topicForm, 'name="utm_source" value={utmSource}', 'UTM source is explicit')
  includes(topicForm, 'name="utm_medium" value={utmMedium}', 'UTM medium is explicit')
  includes(topicForm, 'examples.length > 0', 'empty script examples do not render an empty control group')
  includes(signup, "import { carryCreationHandoff } from '@/lib/creationHandoff'", 'signup uses the executable carrier')
  includes(signup, 'carryCreationHandoff(params, activationParams)', 'signup forwards only allowlisted creation fields')
  includes(signup, 'return `/studio/create?${activationParams.toString()}`', 'script lands directly on the current creation surface')
  includes(middleware, "request.nextUrl.searchParams.get('redirect')", 'middleware reads the authenticated visitor redirect')
  includes(middleware, "resolveAuthRedirect(rawRedirect, '/dashboard')", 'middleware validates the authenticated redirect before following it')

  // The actual GenerateClient caller waits for state commitment, then passes
  // the resolved contract to handleAnalyze. The API receives both values.
  includes(generate, 'resolveActivationCreationContract(searchParams)', 'GenerateClient uses the executable resolver')
  includes(generate, 'setScriptMode(activationContract.scriptMode)', 'caller commits script mode')
  includes(generate, 'setDuration(activationContract.duration)', 'caller commits duration')
  includes(generate, 'scriptMode !== activationContract.scriptMode', 'caller waits for script mode state')
  includes(generate, 'duration !== activationContract.duration', 'caller waits for duration state')
  includes(generate, 'structureFirst: activationContract.structureFirst', 'caller disables the rewriter for verbatim handoffs')
  includes(generate, 'JSON.stringify({ prompt: source, duration: alvoAnalise, language, scriptMode })', 'analysis API receives the committed or safely fitted duration')
  includes(analyze, "body.scriptMode === 'verbatim'", 'API has the verbatim fast path')
  includes(analyze, 'normalizeWords(polished) === normalizeWords(text)', 'punctuation polish is rejected if the word sequence changes')
  includes(parser, 'if (rotulos < 2) return null', 'parser requires two speech labels before promising speech-only mode')
  includes(parser, 'STAGE_LABEL_LINE.test(u) || TIMECODE_LINE.test(u) || SCENE_HEADER_LINE.test(u)', 'parser recognizes the production directions named by the copy')

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
  includes(facts, "url: `${BASE}/chatgpt-to-youtube-shorts#chatgpt-script-handoff`", 'start-here opens directly at the stable paste-box anchor')
  includes(page, "const HANDOFF_ID = 'chatgpt-script-handoff'", 'machine link fragment resolves to the rendered handoff id')
  ok(!facts.includes("url: `${BASE}/signup`"), 'answer-engine start never drops a script-ready visitor on generic signup')
  includes(facts, "['script', 'campaign', 'trial_best_creation_intent', 'verbatim_mode', 'duration']", 'machine-readable contract lists all carried values')
  includes(facts, 'Seedance when an active trial balance covers it, otherwise Fast', 'public facts describe the same bounded router')
  includes(facts, 'startHere: START_HERE_FACT', '/api/facts payload includes start-here')
  includes(factsRoute, 'JSON.stringify(getKineoFacts()', '/api/facts serializes the shared payload')
  includes(llms, 'START_HERE_FACT', '/llms.txt imports the shared record')
  includes(llms, '## Start here if you already have a ChatGPT script', '/llms.txt labels the route as start-here')
  includes(llms, '/gerador-de-shorts-gratis#roteiro-chatgpt', '/llms.txt exposes the Portuguese launcher directly')
  includes(llms, '/generador-de-shorts-gratis#guion-chatgpt', '/llms.txt exposes the Spanish launcher directly')
  includes(adminFunnel, "'/chatgpt-to-youtube-shorts'", 'admin organic registry includes the route')
  includes(adminFunnel, "'/gerador-de-shorts-gratis'", 'admin organic denominator includes the Portuguese launcher page')
  includes(adminFunnel, "'/generador-de-shorts-gratis'", 'admin organic denominator includes the Spanish launcher page')

  // K18 partial: supported PT/ES doors reuse one executable launcher contract.
  for (const [locale, localizedPage, formId, campaign, localizedScript] of [
    ['pt', portuguesePage, 'roteiro-chatgpt', 'seo_chatgpt_to_shorts_pt', 'Narração: Coração & ação + ciência #1 🧠\nVisual: céu'],
    ['es', spanishPage, 'guion-chatgpt', 'seo_chatgpt_to_shorts_es', 'Narración: ¿Qué cambió? Niño & acción + ciencia #1 🧠\nVisual: cielo'],
  ]) {
    includes(localizedPage, "import LocalizedScriptHandoff from '@/components/LocalizedScriptHandoff'", `${locale}: page reuses the localized launcher`)
    includes(localizedPage, `const SCRIPT_HANDOFF_ID = '${formId}'`, `${locale}: machine fragment and rendered anchor share the same literal id`)
    includes(localizedPage, `formId={SCRIPT_HANDOFF_ID}`, `${locale}: page renders its stable launcher anchor`)
    includes(localizedPage, `campaign="${campaign}"`, `${locale}: page keeps a distinct measurable campaign`)
    includes(localizedPage, `language="${locale}"`, `${locale}: page passes the supported internal language code`)
    includes(localizedPage, locale === 'pt' ? '<main lang="pt-BR"' : '<main lang="es"', `${locale}: localized content exposes its language to assistive technology`)
    includes(localizedPage, 'Narra', `${locale}: visible copy names a supported speech label`)
    ok(!localizedPage.includes('utmSource="seo"'), `${locale}: launcher does not overwrite the real referring channel`)

    const redirect = handoff.buildAuthenticatedCreationRedirect({
      prompt: localizedScript,
      campaign,
      createIntent: 'trial_best',
      language: locale,
      scriptMode: 'verbatim',
      duration: 35,
    })
    ok(redirect, `${locale}: authenticated handoff builds a destination`)
    const destination = new URL(redirect, 'https://www.usekineo.com')
    equal(destination.pathname, '/studio/create', `${locale}: authenticated handoff enters the creation surface`)
    equal(destination.searchParams.get('prompt'), localizedScript, `${locale}: authenticated redirect keeps Unicode, punctuation and line breaks`)
    equal(destination.searchParams.get('create_intent'), 'trial_best', `${locale}: authenticated redirect keeps the trial router intent`)
    equal(destination.searchParams.get('language'), locale, `${locale}: authenticated redirect keeps the language`)
    equal(destination.searchParams.get('intent_campaign'), campaign, `${locale}: authenticated redirect keeps the campaign`)
    equal(destination.searchParams.get('script_mode'), 'verbatim', `${locale}: authenticated redirect keeps verbatim mode`)
    equal(destination.searchParams.get('duration'), '35', `${locale}: authenticated redirect keeps the short target`)
    equal(destination.searchParams.get('welcome'), '1', `${locale}: authenticated redirect keeps the creation welcome state`)
    const organicContext = organicSignup.organicSignupHandoffContext(destination.searchParams)
    ok(organicContext, `${locale}: signup telemetry recognizes the localized organic campaign without fake UTMs`)
    equal(organicContext.campaign, campaign, `${locale}: signup telemetry keeps the localized campaign`)
  }
  includes(localizedHandoff, 'placement="chatgpt_script_handoff"', 'localized launcher identifies its visible placement')
  includes(localizedHandoff, 'analyticsVariant={`localized_script_handoff_${language}_v1`}', 'localized launcher keeps a versioned analytics variant')
  includes(localizedHandoff, 'scriptMode="verbatim"', 'localized launcher preserves the writer wording contract')
  includes(localizedHandoff, 'duration={35}', 'localized launcher uses the visible short target')
  includes(localizedHandoff, 'creationIntent="trial_best"', 'localized launcher requests the best eligible trial engine')
  includes(localizedHandoff, 'preserveHandoffForSignedIn', 'localized launcher keeps work for authenticated visitors')
  includes(topicForm, "const limitLocale = language ?? 'en'", 'shared form selects Portuguese and Spanish limit feedback from its public language')
  ok(!localizedHandoff.includes('utmSource='), 'localized launcher does not overwrite the real referring source')
  ok(!localizedHandoff.includes('utmMedium='), 'localized launcher does not overwrite the real referring medium')
  ok(!localizedHandoff.includes("'de' | 'fr'"), 'unsupported German and French launchers stay fail-closed')
  includes(portuguesePage, 'Seedance se o saldo do teste ativo cobrir; senão, usa Fast', 'Portuguese copy names the bounded trial router')
  includes(spanishPage, 'Seedance si el saldo de la prueba activa alcanza; si no, usa Fast', 'Spanish copy names the bounded trial router')
  includes(spanishPage, "'pt-BR': `${BASE}/gerador-de-shorts-gratis`", 'Spanish hreflang sends Portuguese visitors to the Portuguese page')

  for (const preview of [
    'docs/previews/CHATGPT-SCRIPT-HANDOFF-2026-08-27.html',
    'docs/previews/CHATGPT-SCRIPT-HANDOFF-2026-08-27.svg',
    'docs/previews/CHATGPT-SCRIPT-HANDOFF-2026-08-27.png',
    'docs/previews/CHATGPT-DIRECT-PASTE-2026-09-04.html',
    'docs/previews/CHATGPT-DIRECT-PASTE-2026-09-04.svg',
    'docs/previews/CHATGPT-DIRECT-PASTE-2026-09-04.png',
    'docs/previews/K18-PT-ES-SCRIPT-LAUNCHERS-2026-09-04.html',
    'docs/previews/K18-PT-ES-SCRIPT-LAUNCHERS-2026-09-04.png',
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
