#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel, imports = {}) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => {
      if (id in imports) return imports[id]
      throw new Error(`${rel} imported unexpected module: ${id}`)
    },
    module,
    module.exports,
  )
  return module.exports
}

const quickstart = loadTs('lib/growth/chatgptQuickstart.ts')
const engineCost = loadTs('lib/credits/engineCost.ts')
const trialPolicy = loadTs('lib/growth/trialBalanceBridge.ts', {
  '@/lib/credits/engineCost': engineCost,
})
const trialFirstDeliveryVersion = trialPolicy.TRIAL_FIRST_DELIVERY_VERSION
const arbitration = loadTs('lib/growth/chatgptWelcomeArbitration.ts', {
  '@/lib/growth/trialBalanceBridge': trialPolicy,
})
const funnel = loadTs('lib/admin/chatgptQuickstartFunnel.ts', {
  '@/lib/growth/chatgptQuickstart': quickstart,
})
let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }
const at = (minute) => new Date(Date.UTC(2026, 7, 28, 12, minute)).toISOString()
const event = (name, minute, user, metadata = null, session = null) => ({
  name, created_at: at(minute), user_id: user, session_id: session, metadata,
})
const variant = { variant: quickstart.CHATGPT_QUICKSTART_VARIANT }

equal(quickstart.CHATGPT_QUICKSTART_VARIANT, 'chatgpt_quickstart_v5', 'always-visible paste continuation has an isolated measurement variant')
equal(quickstart.CHATGPT_QUICKSTARTS.length, 2, 'exactly two starting modes')
equal(quickstart.CHATGPT_QUICKSTARTS[0].choice, 'finished_script', 'finished script is the first choice')
equal(quickstart.CHATGPT_QUICKSTARTS[0].detail, 'Paste it exactly as ChatGPT wrote it', 'finished script explains the outcome')
ok(quickstart.CHATGPT_QUICKSTARTS[0].href.includes('script_mode=verbatim'), 'finished script preserves wording')
ok(quickstart.CHATGPT_QUICKSTARTS[0].href.includes('duration=35'), 'finished script uses the proven 35s handoff')
equal(quickstart.CHATGPT_QUICKSTARTS[1].choice, 'idea', 'idea is the second choice')
equal(quickstart.CHATGPT_QUICKSTARTS[1].detail, 'Kineo writes the hook, scenes and payoff', 'idea explains the outcome')
ok(quickstart.CHATGPT_QUICKSTARTS[1].href.includes('script_mode=ai'), 'idea asks AI to structure the input')
ok(quickstart.CHATGPT_QUICKSTARTS[1].href.includes('duration=60'), 'idea uses the premium-first 60s Seedance target')
for (const option of quickstart.CHATGPT_QUICKSTARTS) {
  const url = new URL(option.href, 'https://www.usekineo.com')
  equal(url.pathname, '/studio', `${option.choice}: opens the simple Studio input before generation`)
  equal(url.searchParams.get('engine'), 'seedance', `${option.choice}: visual promise and selected engine stay identical`)
  equal(url.searchParams.get('chatgpt_quickstart'), option.choice, `${option.choice}: choice survives the handoff`)
  equal(url.searchParams.get('intent_campaign'), quickstart.CHATGPT_QUICKSTART_VARIANT, `${option.choice}: campaign and event variant cannot drift`)
  ok(!url.searchParams.has('utm_source'), `${option.choice}: first-touch acquisition is not overwritten`)
}
equal(quickstart.isChatGptQuickstartChoice('finished_script'), true, 'finished script is an allow-listed continuation')
equal(quickstart.isChatGptQuickstartChoice('idea'), true, 'idea is an allow-listed continuation')
equal(quickstart.isChatGptQuickstartChoice('other'), false, 'unknown continuation fails closed')
equal(quickstart.normalizeChatGptQuickstartInput('  a useful idea  '), 'a useful idea', 'handoff trims surrounding whitespace')
equal(quickstart.normalizeChatGptQuickstartInput('x'.repeat(1200)).length, 1000, 'handoff enforces the Studio input limit')
equal(quickstart.buildChatGptQuickstartHref('idea', '  lighthouse mystery  '), `${quickstart.CHATGPT_QUICKSTARTS[1].href}&prompt=lighthouse%20mystery`, 'idea text crosses the same handoff')
equal(quickstart.buildChatGptQuickstartHref('finished_script', ''), null, 'empty script cannot pretend to be a completed selection')
equal(quickstart.buildChatGptQuickstartHref('idea', 'flood & fire').includes('prompt=flood%20%26%20fire'), true, 'customer text is URL encoded')

equal(
  arbitration.decideChatGptWelcome({
    intentCampaign: trialFirstDeliveryVersion,
    dismissed: false,
    firstTouchIsChatGpt: true,
    shownAlready: false,
  }),
  { visible: false, recordShown: false, reason: 'trial_first_delivery_intent' },
  'reserved first-delivery route suppresses Quickstart without recording an impression',
)
equal(
  arbitration.decideChatGptWelcome({
    intentCampaign: quickstart.CHATGPT_QUICKSTART_VARIANT,
    dismissed: false,
    firstTouchIsChatGpt: true,
    shownAlready: false,
  }),
  { visible: true, recordShown: true, reason: 'eligible' },
  'ordinary ChatGPT route keeps Quickstart eligible and records its first impression',
)
equal(
  arbitration.decideChatGptWelcome({
    intentCampaign: null,
    dismissed: false,
    firstTouchIsChatGpt: true,
    shownAlready: true,
  }),
  { visible: true, recordShown: false, reason: 'already_recorded' },
  'returning to an ordinary route restores Quickstart without duplicating the shown event',
)
equal(
  arbitration.decideChatGptWelcome({
    intentCampaign: null,
    dismissed: true,
    firstTouchIsChatGpt: true,
    shownAlready: false,
  }),
  { visible: false, recordShown: false, reason: 'dismissed' },
  'a genuine dismissal still wins on ordinary routes',
)
equal(
  arbitration.decideChatGptWelcome({
    intentCampaign: null,
    dismissed: false,
    firstTouchIsChatGpt: false,
    shownAlready: false,
  }),
  { visible: false, recordShown: false, reason: 'not_chatgpt_first_touch' },
  'non-ChatGPT visitors never receive the source-specific banner',
)
equal(arbitration.trialFirstDeliveryOwnsRoute(trialFirstDeliveryVersion), true, 'exact shared campaign owns the route')
equal(arbitration.trialFirstDeliveryOwnsRoute(`${trialFirstDeliveryVersion}-other`), false, 'lookalike campaign cannot suppress Quickstart')

const result = funnel.buildChatGptQuickstartFunnel([
  event('chatgpt_welcome_banner_shown', 0, 'script-user', variant),
  event('chatgpt_welcome_banner_shown', 1, 'script-user', variant),
  event('chatgpt_quickstart_selected', 2, 'script-user', { ...variant, input_type: 'finished_script' }),
  event('chatgpt_quickstart_studio_ready', 3, 'script-user', { ...variant, input_type: 'finished_script' }),
  event('generate_started', 4, 'script-user'),
  event('generate_completed', 5, 'script-user'),
  event('checkout_started', 6, 'script-user'),
  event('payment_success', 7, 'script-user'),

  event('chatgpt_welcome_banner_shown', 10, 'idea-user', variant),
  event('chatgpt_quickstart_selected', 11, 'idea-user', { ...variant, input_type: 'idea' }),
  event('chatgpt_quickstart_studio_ready', 12, 'idea-user', { ...variant, input_type: 'idea' }),
  event('generate_started', 13, 'idea-user'),
  event('generate_completed', 14, 'idea-user'),

  event('chatgpt_welcome_banner_shown', 20, 'viewer-only', variant),

  event('chatgpt_quickstart_selected', 30, 'no-view', { ...variant, input_type: 'idea' }),
  event('generate_started', 31, 'no-view'),
  event('chatgpt_welcome_banner_shown', 40, 'old-variant', { variant: 'legacy' }),
  event('chatgpt_quickstart_selected', 41, 'old-variant', { ...variant, input_type: 'idea' }),
])

equal(result.views, 3, 'duplicate impressions count one actor and old variants are excluded')
equal(result.selections, 2, 'selection requires a matching prior view')
equal(result.scriptSelections, 1, 'script selection is separated')
equal(result.ideaSelections, 1, 'idea selection is separated')
equal(result.studioReady, 2, 'Studio ready requires the matching selected mode')
equal(result.starts, 2, 'starts require selection first')
equal(result.completions, 2, 'completions require start first')
equal(result.checkoutStarts, 1, 'checkout requires completion first')
equal(result.payments, 1, 'payment requires attributed checkout first')
equal(result.viewToSelectionRate, '66.7%', 'view to choice is person-level')
equal(result.selectionToStudioReadyRate, '100.0%', 'choice to Studio is causal')
equal(result.studioReadyToStartRate, '100.0%', 'Studio to start is causal')
equal(result.selectionToStartRate, '100.0%', 'choice to start is causal')
equal(result.startToCompleteRate, '100.0%', 'start to completion is causal')
equal(result.completeToCheckoutRate, '50.0%', 'completion to checkout is causal')
equal(result.checkoutToPaidRate, '100.0%', 'checkout to payment is causal')

const outOfOrder = funnel.buildChatGptQuickstartFunnel([
  event('generate_started', 0, 'u'),
  event('generate_completed', 1, 'u'),
  event('checkout_started', 2, 'u'),
  event('payment_success', 3, 'u'),
  event('chatgpt_welcome_banner_shown', 4, 'u', variant),
  event('chatgpt_quickstart_selected', 5, 'u', { ...variant, input_type: 'finished_script' }),
])
equal(outOfOrder.starts, 0, 'old generation is never attributed')
equal(outOfOrder.completions, 0, 'old completion is never attributed')
equal(outOfOrder.checkoutStarts, 0, 'old checkout is never attributed')
equal(outOfOrder.payments, 0, 'old payment is never attributed')

const invalidChoice = funnel.buildChatGptQuickstartFunnel([
  event('chatgpt_welcome_banner_shown', 0, null, variant, 'session-a'),
  event('chatgpt_quickstart_selected', 1, null, { ...variant, input_type: 'other' }, 'session-a'),
])
equal(invalidChoice.views, 1, 'anonymous session can be a viewer')
equal(invalidChoice.selections, 0, 'unknown choice cannot enter the funnel')

const empty = funnel.buildChatGptQuickstartFunnel([])
equal(empty.viewToSelectionRate, '—', 'empty denominator is honest')
equal(empty.checkoutToPaidRate, '—', 'empty payment denominator is honest')

const banner = source('components/ChatGptWelcomeBanner.tsx')
const arbitrationSource = source('lib/growth/chatgptWelcomeArbitration.ts')
const dashboardLayout = source('app/(dashboard)/layout.tsx')
const studio = source('app/(dashboard)/studio/StudioClient.tsx')
const admin = source('app/api/admin/funnel/route.ts')
const client = source('app/(dashboard)/admin/funnel/FunnelClient.tsx')
ok(banner.includes('Paste the answer. Make the Short.'), 'card continues the job started in ChatGPT')
ok(banner.includes('Paste the answer from ChatGPT'), 'paste field is named before any branching decision')
ok(banner.includes('Paste up to 1,000 characters with the labels intact.'), 'card states the real input boundary')
ok(banner.includes('If the script contains at least two Voiceover: or'), 'card conditions speech-only mode on two labels')
ok(banner.includes('recognized Visual:, Camera:, scene headers and'), 'card names recognized production directions')
ok(banner.includes('Have only an idea? Kineo can write the hook, scenes and payoff instead.'), 'idea path remains explained beside its CTA')
ok(!banner.includes('CHATGPT_QUICKSTARTS.map'), 'the old choice-before-input gate is gone')
ok(banner.includes("onClick={() => onSelect('finished_script', input)}"), 'the observed script path is the primary action')
ok(banner.includes("onClick={() => onSelect('idea', input)}"), 'idea authoring remains an explicit alternative')
ok(banner.includes("import styles from './ChatGptWelcomeBanner.module.css'"), 'button and editor styles stay scoped to the component')
ok(banner.includes('maxLength={CHATGPT_QUICKSTART_INPUT_LIMIT}'), 'the component uses the same input limit as the handoff builder')
ok(banner.includes("trackEvent('chatgpt_quickstart_selected'"), 'selection event is emitted')
ok(banner.includes("trackEvent('chatgpt_quickstart_input_opened'"), 'input opening is measurable without customer content')
ok(banner.includes('onFocus={trackInputOpened}'), 'the visible input records genuine interaction instead of a mode click')
ok(banner.includes('inputOpenedTracked.current'), 'focus measurement is deduplicated per mounted card')
ok(banner.includes('buildChatGptQuickstartHref(choice, input)'), 'the real caller builds the prompt-preserving Studio URL')
ok(banner.includes('disabled={!ready}'), 'blank content cannot leave the card as a false selection')
ok(banner.includes('Your text stays editable in Studio before anything is generated.'), 'the card preserves user control')
ok(banner.includes('input_type: choice'), 'telemetry contains only the typed card choice')
ok(banner.includes('input_length: input.trim().length'), 'telemetry records length but not content')
ok(banner.includes('SHOWN_EVENT_KEY'), 'banner impression has a session dedupe marker')
ok(banner.includes("variant: CHATGPT_QUICKSTART_VARIANT"), 'new impressions are versioned')
ok(!banner.includes('prompt: input'), 'banner telemetry never stores a prompt or script')
ok(banner.includes('useSearchParams()'), 'persistent dashboard layout reacts to query-only navigation')
ok(banner.includes('trialFirstDeliveryOwnsRoute(intentCampaign)'), 'render guard synchronously protects the reserved route')
ok(banner.includes('decideChatGptWelcome({'), 'the real caller uses the executable arbitration policy')
ok(banner.includes('}, [intentCampaign])'), 'route arbitration reruns when the query campaign changes')
ok(arbitrationSource.includes("import { TRIAL_FIRST_DELIVERY_VERSION }"), 'arbitration imports the canonical trial version')
ok(!arbitrationSource.includes("'trial_first_seedance_35s_v2'"), 'arbitration never duplicates the campaign literal')
ok(dashboardLayout.includes("import { Suspense } from 'react'"), 'dashboard imports the required Suspense boundary')
ok(dashboardLayout.includes('<Suspense fallback={null}>\n        <ChatGptWelcomeBanner />\n      </Suspense>'), 'only the query-reading banner is wrapped in a null Suspense fallback')
ok(studio.includes("trackEvent('chatgpt_quickstart_studio_ready'"), 'the real Studio caller measures a ready continuation')
ok(studio.includes('isChatGptQuickstartChoice(quickstartChoice)'), 'Studio accepts only allow-listed ChatGPT modes')
ok(studio.includes('setScriptMode(requestedScriptMode)'), 'Studio applies the requested script mode')
ok(studio.includes('setDuration(requestedDuration)'), 'Studio applies a supported requested duration')
ok(studio.includes('setChatGptQuickstart(null)'), 'Studio clears stale ChatGPT context when the query is absent')
ok(studio.includes('promptRef.current?.focus()'), 'Studio focuses the paste field after the handoff')
ok(studio.includes('useSearchParams()'), 'Studio observes query changes even when the route component is reused')
ok(studio.includes('}, [searchSignature])'), 'same-page quick-start navigation reapplies the handoff')
ok(studio.includes('Paste the complete script from ChatGPT here'), 'finished-script continuation names the exact next action')
ok(studio.includes('Paste the idea from ChatGPT here'), 'idea continuation names the exact next action')
ok(admin.includes("'chatgpt_welcome_banner_shown', 'chatgpt_quickstart_selected', 'chatgpt_quickstart_studio_ready'"), 'admin fetches the full quick-start handoff')
ok(admin.includes("'checkout_started', 'payment_success'"), 'admin fetches commercial outcomes')
ok(admin.includes('buildChatGptQuickstartFunnel(retentionEventRows)'), 'executed route calls the causal helper')
ok(admin.includes('eventsAvailable: retentionEventsAvailable'), 'admin distinguishes missing data from zero')
ok(client.includes('ChatGPT quick-start · source → right input mode → video'), 'admin renders the causal section')
ok(client.includes('CHATGPT_QUICKSTART_VARIANT'), 'admin names the current measured variant')
ok(client.includes('Attributed payments'), 'admin does not mislabel a generic payment event as a subscription')

console.log(`chatgpt-quickstart: ${checks}/${checks} checks passed`)
