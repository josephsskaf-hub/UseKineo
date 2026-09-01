#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')

let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }

function loadTs(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', output)(module, module.exports)
  return module.exports
}

const policy = loadTs('lib/growth/enterpriseAlternativeBusinessPath.ts')
const component = read('app/alternatives/[competitor]/EnterpriseAlternativeBusinessPath.tsx')
const page = read('app/alternatives/[competitor]/page.tsx')
const distribution = read('lib/agencyDistribution.ts')
const volumeBridge = read('components/AgencyVolumeBridge.tsx')
const eventSink = read('app/api/events/route.ts')

equal(
  policy.ENTERPRISE_ALTERNATIVE_BUSINESS_PATH_VERSION,
  'enterprise_alternative_business_path_v1',
  'experiment version is stable',
)
equal(policy.ENTERPRISE_ALTERNATIVE_BUSINESS_PATH_VISIBLE_RATIO, 0.5, 'view requires half the card')
equal(policy.ENTERPRISE_ALTERNATIVE_COMPETITORS, ['heygen'], 'only the ungated HeyGen comparison qualifies')

for (const competitor of ['heygen']) {
  equal(policy.isEnterpriseAlternativeCompetitor(competitor), true, `${competitor} qualifies`)
  equal(
    policy.enterpriseAlternativeEntry(competitor),
    `${competitor}_alternative`,
    `${competitor} keeps an attributable first-party entry`,
  )
  equal(
    policy.enterpriseAlternativeBusinessPathMarker('viewed', competitor),
    `kineo:enterprise_alternative_business_path_v1:${competitor}:viewed`,
    `${competitor} view marker is isolated`,
  )
  const metadata = policy.enterpriseAlternativeBusinessPathMetadata(competitor)
  equal(
    Object.keys(metadata).sort(),
    ['competitor', 'destination', 'intent', 'placement', 'version'],
    `${competitor} metadata is allow-listed`,
  )
  equal(metadata.competitor, competitor, `${competitor} metadata identifies the bounded comparison`)
  equal(metadata.destination, 'agency_packs', `${competitor} destination is categorical`)
  equal(metadata.intent, 'business', `${competitor} intent is categorical`)
  equal(metadata.placement, 'after_fit_decision', `${competitor} placement keeps creator choice first`)
  for (const forbidden of ['email', 'prompt', 'topic', 'url', 'price', 'session', 'user']) {
    ok(!JSON.stringify(metadata).toLowerCase().includes(forbidden), `${competitor} metadata excludes ${forbidden}`)
  }
}
for (const value of ['', 'invideo', 'opusclip', 'synthesia', 'HeyGen', null, undefined]) {
  equal(policy.isEnterpriseAlternativeCompetitor(value), false, `non-qualified competitor rejected: ${String(value)}`)
}
equal(policy.enterpriseAlternativeBusinessPathSettlement(true), 'recorded', 'stored event closes latch')
equal(policy.enterpriseAlternativeBusinessPathSettlement(false), 'retryable', 'failed event keeps retry open')

const storage = new Map()
const deliveries = []
let sendResult = true
let sendError = false
const recorder = policy.createEnterpriseAlternativeBusinessEventRecorder({
  read: (marker) => storage.get(marker) ?? null,
  write: (marker, value) => storage.set(marker, value),
  send: async (eventName, metadata) => {
    deliveries.push({ eventName, metadata })
    if (sendError) throw new Error('analytics unavailable')
    return sendResult
  },
})
const heygenView = policy.enterpriseAlternativeBusinessPathMarker('viewed', 'heygen')
equal(await recorder.record(heygenView, 'enterprise_alternative_business_path_viewed', 'heygen'), true, 'first stored event records')
equal(deliveries.length, 1, 'first stored event sends once')
equal(storage.get(heygenView), '1', 'stored event closes the session latch')
equal(await recorder.record(heygenView, 'enterprise_alternative_business_path_viewed', 'heygen'), false, 'repeat event is suppressed')
equal(deliveries.length, 1, 'repeat event creates no delivery')

const retryView = policy.enterpriseAlternativeBusinessPathMarker('clicked', 'heygen')
sendResult = false
equal(await recorder.record(retryView, 'enterprise_alternative_business_path_clicked', 'heygen'), false, 'stored:false remains open')
equal(await recorder.record(retryView, 'enterprise_alternative_business_path_clicked', 'heygen'), false, 'stored:false retries')
equal(deliveries.length, 3, 'stored:false makes two real attempts')
sendResult = true
equal(await recorder.record(retryView, 'enterprise_alternative_business_path_clicked', 'heygen'), true, 'later success closes retry')
equal(deliveries.length, 4, 'later success sends exactly once more')

const heygenClick = policy.enterpriseAlternativeBusinessPathMarker('viewed', 'heygen-extra')
sendError = true
equal(await recorder.record(heygenClick, 'enterprise_alternative_business_path_clicked', 'heygen'), false, 'analytics rejection fails open')
sendError = false
equal(await recorder.record(heygenClick, 'enterprise_alternative_business_path_clicked', 'heygen'), true, 'analytics rejection releases the latch for retry')

let releaseConcurrent
const concurrentRecorder = policy.createEnterpriseAlternativeBusinessEventRecorder({
  read: () => null,
  write: () => {},
  send: () => new Promise((resolve) => { releaseConcurrent = resolve }),
})
const concurrentMarker = 'kineo:enterprise_alternative_business_path_v1:heygen:concurrent'
const firstConcurrent = concurrentRecorder.record(concurrentMarker, 'enterprise_alternative_business_path_clicked', 'heygen')
equal(await concurrentRecorder.record(concurrentMarker, 'enterprise_alternative_business_path_clicked', 'heygen'), false, 'parallel duplicate is suppressed')
releaseConcurrent(true)
equal(await firstConcurrent, true, 'original concurrent delivery completes')

const deniedStorageRecorder = policy.createEnterpriseAlternativeBusinessEventRecorder({
  read: () => { throw new Error('denied') },
  write: () => { throw new Error('denied') },
  send: async () => true,
})
equal(await deniedStorageRecorder.record('privacy-mode', 'enterprise_alternative_business_path_viewed', 'heygen'), true, 'storage denial never blocks the visitor')
equal(await deniedStorageRecorder.record('privacy-mode', 'enterprise_alternative_business_path_viewed', 'heygen'), false, 'memory latch still dedupes after storage denial')

ok(page.includes("import EnterpriseAlternativeBusinessPath from './EnterpriseAlternativeBusinessPath'"), 'real page imports the isolated client island')
ok(page.includes('isEnterpriseAlternativeCompetitor(params.competitor)'), 'real page uses the bounded allowlist')
ok(page.includes('<EnterpriseAlternativeBusinessPath competitor={params.competitor} />'), 'qualified page renders the business path')
ok(page.indexOf('{isEnterpriseAlternativeCompetitor') > page.indexOf('Which one should you pick?'), 'business choice follows the honest fit decision')
ok(page.indexOf('{isEnterpriseAlternativeCompetitor') < page.indexOf('{/* How it works */}'), 'business choice appears before generic product education')
equal((page.match(/Try Kineo free →/g) ?? []).length, 1, 'hero creator CTA is unchanged and unique')
equal((page.match(/Start free →/g) ?? []).length, 1, 'final creator CTA is unchanged and unique')
ok(page.includes('Pick HeyGen if you need enterprise avatar libraries'), 'HeyGen honesty remains intact')
ok(page.includes('Choose Synthesia when…'), 'Synthesia honesty remains intact')

ok(component.startsWith("'use client'"), 'telemetry stays in a client island')
ok(component.includes('useRef<HTMLElement | null>(null)'), 'component observes its own card')
ok(component.includes("typeof IntersectionObserver === 'undefined'"), 'unsupported browsers skip only measurement')
// The initial observer used an early-return `< threshold` anchor. The bounded
// retry needs an explicit `currentlyVisible` predicate, so the same behavioral
// contract is now expressed as `>= threshold` and checked at that source.
ok(component.includes('entry.intersectionRatio >= ENTERPRISE_ALTERNATIVE_BUSINESS_PATH_VISIBLE_RATIO'), 'view uses the policy threshold')
ok(component.includes('{ threshold: [ENTERPRISE_ALTERNATIVE_BUSINESS_PATH_VISIBLE_RATIO] }'), 'observer and policy thresholds match')
ok(component.includes("'enterprise_alternative_business_path_viewed'"), 'qualified view has a dedicated event')
ok(component.includes("'enterprise_alternative_business_path_clicked'"), 'business selection has a dedicated event')
ok(component.includes('createEnterpriseAlternativeBusinessEventRecorder({'), 'component uses the behavior-tested recorder')
ok(component.includes('eventRecorder.wasRecorded(viewMarker)'), 'observer reads the shared recorder latch')
ok(component.includes('eventRecorder.record('), 'view and click use the shared recorder')
ok(component.includes('window.sessionStorage.setItem(marker, value)'), 'successful event persists for the session')
ok(component.includes('currentlyVisible && retries < 1'), 'failed qualified view gets at most one bounded retry')
ok(component.includes('setTimeout(attemptView, 1_500)'), 'retry is delayed instead of spinning')
ok(component.includes('if (!currentlyVisible'), 'retry cannot count an impression after the card leaves view')
ok(component.includes('if (retryTimer) clearTimeout(retryTimer)'), 'retry timer is cleaned up on unmount')
ok(component.includes('observer.disconnect()'), 'observer disconnects after success and on cleanup')
ok(component.includes('agencyPacksHref(enterpriseAlternativeEntry(competitor))'), 'destination uses the existing first-party attribution helper')
ok(component.includes('For clients and business content'), 'card labels the B2B audience')
ok(component.includes('Producing short-form for clients or one business?'), 'card names the qualifying job')
ok(component.includes('one-time self-service packs for 10–50 Fast Shorts'), 'card reuses the existing product boundary')
ok(component.includes('do not include a team workspace, avatar governance or a managed service'), 'card states the exclusions honestly')
ok(component.includes('Compare business video packs →'), 'CTA names the existing comparison destination')

for (const entry of ['heygen_alternative']) {
  ok(distribution.includes(`'${entry}'`), `${entry} is accepted by the downstream allowlist`)
  ok(volumeBridge.includes(`${entry}:`), `${entry} has an explicit downstream bridge context`)
}
ok(distribution.includes("return `/ai-shorts-for-agencies?entry=${entry}#agency-pack-heading`"), 'destination preserves first-touch and deep-links to the existing shelf')

for (const eventName of [
  'enterprise_alternative_business_path_viewed',
  'enterprise_alternative_business_path_clicked',
]) {
  ok(!eventSink.includes(`'${eventName}',`), `${eventName} remains browser analytics, not server authority`)
}

const preview = read('docs/previews/ENTERPRISE-ALTERNATIVE-BUSINESS-PATH-V1-2026-09-01.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `preview includes ${label}`)
}
ok(preview.includes('Creator-only exit after enterprise fit guidance'), 'preview identifies the old contradiction')
ok(preview.includes('Compare business video packs'), 'preview contains the new secondary action')
ok(preview.includes('No team workspace, avatar governance or managed service.'), 'preview carries the honest limit')

console.log(`Enterprise alternative business path: ${checks}/${checks} checks passed`)
