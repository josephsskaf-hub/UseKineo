#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { checks += 1; assert.ok(value, message) }
const equal = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message) }

function executeTs(file) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(output, { module: moduleBox, exports: moduleBox.exports, require() { throw new Error('unexpected import') }, URL, URLSearchParams })
  return moduleBox.exports
}

const helper = executeTs('lib/growth/businessPilotReview.ts')
const selection = { useCase: 'client_work', cadence: 'ongoing', reviewer: 'client_approver' }
const memo = helper.buildBusinessPilotReviewMemo(selection)

for (const text of [
  'Decide whether your team should run a limited self-service evaluation before considering a paid plan.',
  'Use case: Content for client work',
  'Cadence: Ongoing production',
  'Reviewer: Client approver',
  'one account; it does not include team seats, client approval routing or white-label software/client portal',
  'review by your team or client',
  'no SOC 2, ISO 27001 or enterprise SLA claim',
  'Not a contract, certification, legal approval or ROI forecast.',
]) check(memo.includes(text), `memo includes honest boundary: ${text}`)

const asset = helper.buildBusinessPilotReviewAsset(selection)
const url = new URL(asset.url)
equal(url.origin, 'https://www.usekineo.com', 'canonical production host')
equal(url.pathname, '/business-pilot-review', 'share returns to the decision tool')
equal([...url.searchParams.keys()].sort(), ['cadence', 'reviewer', 'use_case', 'utm_campaign', 'utm_medium', 'utm_source'], 'query has only closed categories and attribution')
equal(url.searchParams.get('utm_source'), 'business_pilot_review', 'closed referral source')
equal(url.searchParams.get('utm_medium'), 'referral', 'closed referral medium')
equal(url.searchParams.get('utm_campaign'), 'business_pilot_review_v1', 'closed campaign')
check(asset.clipboardText.endsWith(asset.url), 'clipboard asset ends in attributed URL')

const failedClosed = helper.readBusinessPilotReviewSearch(new URLSearchParams('use_case=private-secret&cadence=weekly&reviewer=bad'))
equal(failedClosed.useCase, 'own_brand', 'invalid use case fails closed')
equal(failedClosed.cadence, 'weekly', 'valid cadence survives sanitization')
equal(failedClosed.reviewer, 'marketing_lead', 'invalid reviewer fails closed')
equal(helper.buildBusinessPilotReviewPricingHref(), '/pricing?intent_campaign=business_pilot_review_pricing_v1', 'pricing link uses one exact intent campaign')

const baseMetadata = helper.businessPilotReviewMetadata(selection)
equal(Object.keys(baseMetadata).sort(), ['cadence', 'reviewer', 'source', 'use_case', 'variant'], 'base metadata is closed')
equal(baseMetadata.source, 'business_pilot_review_pricing_v1', 'metadata matches pricing source')
equal(Object.keys(helper.businessPilotReviewShareMetadata(selection, 'native')).sort(), ['cadence', 'method', 'reviewer', 'source', 'use_case', 'variant'], 'share metadata adds only method')

check(helper.isBusinessPilotReviewReferral(url.searchParams), 'exact proposal referral is recognized')
check(!helper.isBusinessPilotReviewReferral(new URLSearchParams('utm_source=business_pilot_review&utm_medium=referral&utm_campaign=forged')), 'forged proposal campaign is rejected')
equal(helper.readBusinessPilotDecisionSearch(new URLSearchParams('decision=needs_changes')), 'needs_changes', 'closed reviewer decision is read')
equal(helper.readBusinessPilotDecisionSearch(new URLSearchParams('decision=ship_everything')), null, 'unknown reviewer decision fails closed')

const response = helper.buildBusinessPilotResponse(selection, 'approve_limited_evaluation')
check(response.includes('Decision: Approve a limited evaluation'), 'response names the closed decision')
check(response.includes('does not route or certify an approval'), 'response does not promise approval routing')
const responseAsset = helper.buildBusinessPilotResponseAsset(selection, 'approve_limited_evaluation')
const responseUrl = new URL(responseAsset.url)
equal([...responseUrl.searchParams.keys()].sort(), ['cadence', 'decision', 'reviewer', 'use_case', 'utm_campaign', 'utm_medium', 'utm_source'], 'response URL has only closed fields')
equal(responseUrl.searchParams.get('utm_campaign'), 'business_pilot_review_response_v1', 'response uses a separate closed campaign')
check(helper.isBusinessPilotResponseReferral(responseUrl.searchParams), 'exact response referral is recognized')
equal(Object.keys(helper.businessPilotDecisionMetadata(selection, 'not_now')).sort(), ['cadence', 'decision', 'reviewer', 'source', 'use_case', 'variant'], 'decision metadata is closed')

{
  let calls = 0
  const outcome = await helper.requestBusinessPilotReviewShare(asset, {
    share: async () => { calls += 1 },
    clipboard: { writeText: async () => { throw new Error('must not run') } },
  })
  equal(outcome, 'native', 'native share is preferred')
  equal(calls, 1, 'native share is called once')
}
{
  let copied = null
  const outcome = await helper.requestBusinessPilotReviewShare(asset, {
    share: async () => { const error = new Error('cancel'); error.name = 'AbortError'; throw error },
    clipboard: { writeText: async (value) => { copied = value } },
  })
  equal(outcome, 'cancelled', 'cancel never becomes a successful share')
  equal(copied, null, 'cancel has no clipboard side effect')
}
{
  let copied = null
  const outcome = await helper.requestBusinessPilotReviewShare(asset, {
    share: async () => { throw new Error('unavailable') },
    clipboard: { writeText: async (value) => { copied = value } },
  })
  equal(outcome, 'clipboard', 'share failure falls back to clipboard')
  equal(copied, asset.clipboardText, 'clipboard receives the bounded asset')
}
equal(await helper.requestBusinessPilotReviewShare(asset, {}), 'manual', 'missing transports expose manual copy')

const client = read('app/business-pilot-review/BusinessPilotReviewClient.tsx')
const page = read('app/business-pilot-review/page.tsx')
const facts = read('lib/kineoFacts.ts')
const tools = read('app/tools/page.tsx')
const sitemap = read('app/sitemap.ts')
const report = read('scripts/b2b-subscription-truth-report.mjs')
const preview = read('docs/previews/BUSINESS-PILOT-REVIEW-V1-2026-09-03.html')

check(client.includes("trackClosedEvent('business_pilot_review_built'"), 'build event is dedicated')
check(client.includes("'business_pilot_review_handoff_prepared'"), 'handoff event does not overclaim delivery')
check(client.includes("trackClosedEvent('business_pilot_review_received'"), 'recipient arrival is measured separately')
check(client.includes("'business_pilot_review_decision_recorded'"), 'reviewer decision is measured')
check(client.includes("'business_pilot_review_response_prepared'"), 'response preparation is measured without claiming delivery')
check(client.includes("trackClosedEvent('business_pilot_review_pricing_clicked'"), 'pricing click is dedicated')
check(client.indexOf('await requestBusinessPilotReviewShare') < client.indexOf('void trackClosedEvent(eventName'), 'handoff is recorded after confirmed transport')
check(client.includes("if (outcome === 'native' || outcome === 'clipboard')"), 'only confirmed transports emit share success')
check(client.includes('shareInFlight.current'), 'same-tick duplicate shares are blocked')
check(client.includes('shareVersion.current += 1'), 'changed selection invalidates pending share')
check(client.includes('manualShareRef.current?.focus()'), 'manual fallback gets focus')
check(client.includes('noteTitleRef.current?.focus()'), 'newly built note gets focus')
check(client.includes('tabIndex={-1}'), 'note heading is programmatically focusable')
check(client.includes('role="status"'), 'outcome uses a live status')
check(client.includes('Besides fixed campaign labels, the shared link contains only these three choices.'), 'privacy boundary accounts for fixed attribution labels')
check(client.includes('Delivery to another person is not assumed.'), 'transport copy refuses sender-to-recipient causality')
check(client.indexOf("await trackClosedEvent('business_pilot_review_pricing_clicked'") < client.indexOf('window.location.assign('), 'pricing event persistence is awaited before navigation')
check(client.includes('Promise.race(['), 'telemetry wait has a bounded race')
check(client.includes("new Promise<'timeout'>"), 'telemetry timeout is an explicit closed state')
check(client.includes('arrival_persistence: arrivalState'), 'click records whether arrival persistence was confirmed')
check(client.includes("decision: decision ?? 'none'"), 'click carries an explicit closed decision')
check(client.includes('entry: entryMode'), 'builder, reviewer and response clicks remain distinguishable')
check(client.includes('responseTitleRef.current?.focus()'), 'new reviewer response receives focus')
check(client.indexOf('Response ready to return') < client.indexOf('<pre>{response}</pre>'), 'response heading precedes response content in the accessibility tree')
check(client.includes('The selected response is ready to review and send back.'), 'new response is announced')
check(client.includes('aria-pressed={decision === option.value}'), 'reviewer decisions expose selected state')
check(client.includes('This tool prepares a response; it does not route approvals.'), 'visible disclaimer denies approval routing')
check(!client.includes('trackEvent('), 'closed events cannot inherit free-form URL metadata')
check(page.includes('Free · no signup · no email · no card'), 'public access promise is explicit')
check(facts.includes("url: BASE + '/business-pilot-review'"), 'facts catalogue contains the tool')
check(tools.includes("'/business-pilot-review'"), 'tools hub distributes the tool')
check(sitemap.includes("{ path: '/business-pilot-review'"), 'sitemap distributes the tool')
check(report.includes('business_pilot_review_recurring'), 'canonical B2B report owns the path')
check(report.includes("journeyEntryRequirement: 'prior_exact_pilot_click_and_pricing_view'"), 'report requires ordered decision click and pricing view before checkout')
check(report.includes('matchesBusinessPilotStage'), 'report validates closed stage metadata')
check(tools.indexOf("'/cheapest-ai-shorts-maker'") < tools.lastIndexOf("'/business-pilot-review'"), 'new hub card is appended without reordering existing experiments')
for (const label of ['TOOLS HUB · BEFORE · DESKTOP', 'TOOLS HUB · AFTER · DESKTOP', 'DECISION NOTE · AFTER · DESKTOP', 'TOOLS HUB · BEFORE · MOBILE', 'TOOLS HUB · AFTER · MOBILE', 'DECISION NOTE · AFTER · MOBILE', 'MANUAL FALLBACK']) {
  check(preview.includes(label), `preview includes ${label}`)
}
check(!/<link\b|<script[^>]+src\s*=|<(?:img|iframe)[^>]+src\s*=|https?:\/\//i.test(preview), 'preview is self-contained and performs no network request')
check((preview.match(/Response ready to return/g) || []).length >= 2, 'preview shows response heading in desktop and mobile')
check((preview.match(/The selected response is ready to review and send back\./g) || []).length >= 2, 'preview shows response status in desktop and mobile')

console.log(`PASS — ${checks}/${checks} business pilot review checks`)
