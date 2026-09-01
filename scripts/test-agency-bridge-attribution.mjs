#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }
const deepEqual = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }

function loadTs(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)((id) => {
    if (id === '@/lib/agencyDistribution') return {}
    throw new Error(`${path}: unexpected import ${id}`)
  }, module, module.exports)
  return module.exports
}

const policy = loadTs('lib/growth/agencyBridgeTelemetry.ts')
const entries = [
  'home', 'state_report', 'cost_page', 'pricing', 'comment_tool',
  'product_tool', 'content_plan', 'real_estate', 'client_brief', 'kineo1_engine',
  'text_to_video',
]

equal(policy.AGENCY_BRIDGE_VISIBILITY_VERSION, 'agency_volume_bridge_visibility_v1', 'version is stable')
equal(policy.AGENCY_BRIDGE_VISIBLE_RATIO, 0.5, 'view requires half the bridge')
equal(policy.AGENCY_BRIDGE_GATE_ACTORS_PER_ENTRY, 20, 'gate is twenty actors per entry, never twenty aggregate events')
equal(policy.KINEO1_BRIDGE_GATE_IDENTIFIED_PEOPLE, 5, 'Kineo 1 gate counts five identified external people')
equal(policy.KINEO1_BRIDGE_GATE_ANONYMOUS_SESSIONS, 20, 'Kineo 1 gate keeps anonymous sessions separate from people')

for (const entry of entries) {
  deepEqual(policy.agencyBridgeTelemetryMetadata(entry), {
    version: 'agency_volume_bridge_visibility_v1',
    entry,
    surface: 'agency_volume_bridge',
    destination: 'agency_packs',
  }, `${entry}: metadata is finite and PII-free`)
  equal(
    policy.agencyBridgeViewMarker(entry),
    `kineo:agency_volume_bridge_visibility_v1:viewed:${entry}`,
    `${entry}: view marker is isolated by source`,
  )
}

const bridge = read('components/AgencyVolumeBridge.tsx')
ok(bridge.includes('AgencyVolumeBridgeImpression'), 'real shared bridge mounts the observer')
ok(bridge.includes('AgencyVolumeBridgeLink'), 'real CTA mounts click telemetry')
ok(bridge.indexOf('<AgencyVolumeBridgeImpression') < bridge.indexOf('<AgencyVolumeBridgeLink'), 'view measurement is attached before the CTA')
ok(bridge.includes('agencyPacksHref(entry)'), 'canonical destination is unchanged')
ok(bridge.includes('See one-time volume packs →'), 'visible CTA copy is unchanged')
ok(bridge.includes('Self-service · one account · no recurring contract'), 'visible commercial boundary is unchanged')

// Rebase can materialize tracked files as CRLF on Windows. These assertions
// verify call order and event wiring, not an operating-system newline choice.
const telemetry = read('components/AgencyVolumeBridgeTelemetry.tsx').replace(/\r\n/g, '\n')
ok(telemetry.includes("trackEvent(\n          'agency_volume_bridge_viewed'"), 'view event is wired')
ok(telemetry.includes("trackEvent(\n          'agency_volume_bridge_clicked'"), 'click event is wired')
ok(telemetry.includes('IntersectionObserver'), 'view relies on viewport observation')
ok(telemetry.includes('intersectionRatio >= AGENCY_BRIDGE_VISIBLE_RATIO'), 'observer enforces canonical ratio')
ok(telemetry.includes('const pendingViews = new Set<string>()'), 'in-flight guard closes observer races')
ok(telemetry.includes('const recordedViews = new Set<string>()'), 'in-memory guard closes React remount inflation')
ok(telemetry.indexOf("trackEvent(\n          'agency_volume_bridge_viewed'") < telemetry.indexOf("sessionStorage.setItem(marker, '1')"), 'persistent marker is written only after the event call')
ok(telemetry.includes('if (!stored) return'), 'failed analytics remains retryable')
ok(telemetry.includes('return null'), 'telemetry adds no visual UI')
for (const forbidden of ['email', 'prompt', 'script', 'topic', 'user_id', 'session_id', 'utm_']) {
  ok(!telemetry.includes(forbidden), `telemetry excludes ${forbidden}`)
}

const callers = {
  home: read('app/KineoLanding.tsx'),
  state_report: read('app/state-of-ai-shorts-2026/page.tsx'),
  cost_page: read('app/cheapest-ai-shorts-maker/page.tsx'),
  pricing: read('app/pricing/PricingClient.tsx'),
  text_to_video: read('app/text-to-video-shorts/page.tsx'),
}
for (const [entry, source] of Object.entries(callers)) {
  equal((source.match(new RegExp(`<AgencyVolumeBridge entry="${entry}" \\/>`, 'g')) ?? []).length, 1, `${entry}: existing live caller remains singular`)
}

const enginePage = read('app/ai-video-generator/[engine]/page.tsx').replace(/\r\n/g, '\n')
equal((enginePage.match(/<AgencyVolumeBridge entry="kineo1_engine" \/>/g) ?? []).length, 1, 'Kineo 1 engine page mounts one B2B bridge')
ok(enginePage.includes("params.engine === 'kineo-1'"), 'engine bridge is gated to the Kineo 1 slug')
ok(!enginePage.includes("e.param === 'seedance' ? (\n          <AgencyVolumeBridge"), 'Seedance never receives the Fast pack bridge')
ok(enginePage.indexOf('<AgencyVolumeBridge entry="kineo1_engine" />') > enginePage.indexOf("['Trade-off', e.tradeoff]"), 'bridge appears after the Kineo 1 technical facts')
ok(enginePage.indexOf('<AgencyVolumeBridge entry="kineo1_engine" />') < enginePage.indexOf('{/* Como funciona */}'), 'bridge stays secondary before the general how-it-works section')

const textToVideoPage = read('app/text-to-video-shorts/page.tsx')
equal((textToVideoPage.match(/<AgencyVolumeBridge entry="text_to_video" \/>/g) ?? []).length, 1, 'text-to-video page mounts one B2B bridge')
ok(textToVideoPage.indexOf('<AgencyVolumeBridge entry="text_to_video" />') > textToVideoPage.indexOf('id="real-output"'), 'text-to-video bridge follows real output proof')
ok(textToVideoPage.indexOf('<AgencyVolumeBridge entry="text_to_video" />') < textToVideoPage.indexOf('How text becomes a Short'), 'text-to-video bridge stays secondary before education')

const preview = read('docs/previews/KINEO1-B2B-BRIDGE-2026-08-31.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `visual comparison includes ${label}`)
}
ok(preview.includes('No recurring contract'), 'preview keeps the one-time purchase boundary visible')

console.log(`PASS — ${checks}/${checks} agency bridge attribution checks`)
