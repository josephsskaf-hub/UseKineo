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

equal(quickstart.CHATGPT_QUICKSTART_VARIANT, 'chatgpt_quickstart_v2', 'new card has an isolated measurement variant')
equal(quickstart.CHATGPT_QUICKSTARTS.length, 2, 'exactly two starting modes')
equal(quickstart.CHATGPT_QUICKSTARTS[0].choice, 'finished_script', 'finished script is the first choice')
equal(quickstart.CHATGPT_QUICKSTARTS[0].detail, 'Paste it exactly as ChatGPT wrote it', 'finished script explains the outcome')
ok(quickstart.CHATGPT_QUICKSTARTS[0].href.includes('script_mode=verbatim'), 'finished script preserves wording')
ok(quickstart.CHATGPT_QUICKSTARTS[0].href.includes('duration=35'), 'finished script uses the proven 35s handoff')
equal(quickstart.CHATGPT_QUICKSTARTS[1].choice, 'idea', 'idea is the second choice')
equal(quickstart.CHATGPT_QUICKSTARTS[1].detail, 'Kineo writes the hook, scenes and payoff', 'idea explains the outcome')
ok(quickstart.CHATGPT_QUICKSTARTS[1].href.includes('script_mode=ai'), 'idea asks AI to structure the input')
ok(quickstart.CHATGPT_QUICKSTARTS[1].href.includes('duration=45'), 'idea keeps the generic 45s default')
for (const option of quickstart.CHATGPT_QUICKSTARTS) {
  const url = new URL(option.href, 'https://www.usekineo.com')
  equal(url.pathname, '/studio/create', `${option.choice}: uses the canonical Studio creator`)
  equal(url.searchParams.get('chatgpt_quickstart'), option.choice, `${option.choice}: choice survives the handoff`)
  ok(!url.searchParams.has('utm_source'), `${option.choice}: first-touch acquisition is not overwritten`)
}

const result = funnel.buildChatGptQuickstartFunnel([
  event('chatgpt_welcome_banner_shown', 0, 'script-user', variant),
  event('chatgpt_welcome_banner_shown', 1, 'script-user', variant),
  event('chatgpt_quickstart_selected', 2, 'script-user', { ...variant, input_type: 'finished_script' }),
  event('generate_started', 3, 'script-user'),
  event('generate_completed', 4, 'script-user'),
  event('checkout_started', 5, 'script-user'),
  event('payment_success', 6, 'script-user'),

  event('chatgpt_welcome_banner_shown', 10, 'idea-user', variant),
  event('chatgpt_quickstart_selected', 11, 'idea-user', { ...variant, input_type: 'idea' }),
  event('generate_started', 12, 'idea-user'),
  event('generate_completed', 13, 'idea-user'),

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
equal(result.starts, 2, 'starts require selection first')
equal(result.completions, 2, 'completions require start first')
equal(result.checkoutStarts, 1, 'checkout requires completion first')
equal(result.payments, 1, 'payment requires attributed checkout first')
equal(result.viewToSelectionRate, '66.7%', 'view to choice is person-level')
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
const admin = source('app/api/admin/funnel/route.ts')
const client = source('app/(dashboard)/admin/funnel/FunnelClient.tsx')
ok(banner.includes('Turn that answer into a finished Short'), 'card continues the job started in ChatGPT')
ok(banner.includes('Choose what ChatGPT gave you'), 'card asks the branching question')
ok(banner.includes('CHATGPT_QUICKSTARTS.map'), 'both allow-listed choices are rendered')
ok(banner.includes('cgpt-option-detail'), 'choices explain the result instead of looking like unexplained chips')
ok(banner.includes("trackEvent('chatgpt_quickstart_selected'"), 'selection event is emitted')
ok(banner.includes('input_type: option.choice'), 'telemetry contains only the allow-listed choice')
ok(banner.includes('SHOWN_EVENT_KEY'), 'banner impression has a session dedupe marker')
ok(banner.includes("variant: CHATGPT_QUICKSTART_VARIANT"), 'new impressions are versioned')
ok(!banner.includes('prompt:'), 'banner telemetry never stores a prompt or script')
ok(admin.includes("'chatgpt_welcome_banner_shown', 'chatgpt_quickstart_selected'"), 'admin fetches quick-start events')
ok(admin.includes("'checkout_started', 'payment_success'"), 'admin fetches commercial outcomes')
ok(admin.includes('buildChatGptQuickstartFunnel(retentionEventRows)'), 'executed route calls the causal helper')
ok(admin.includes('eventsAvailable: retentionEventsAvailable'), 'admin distinguishes missing data from zero')
ok(client.includes('ChatGPT quick-start · source → right input mode → video'), 'admin renders the causal section')
ok(client.includes('CHATGPT_QUICKSTART_VARIANT'), 'admin names the current measured variant')
ok(client.includes('Attributed payments'), 'admin does not mislabel a generic payment event as a subscription')

console.log(`chatgpt-quickstart: ${checks}/${checks} checks passed`)
