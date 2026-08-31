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

function loadTs(path, mocks = {}) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)((id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${path}: unexpected import ${id}`)
  }, module, module.exports)
  return module.exports
}

const policy = loadTs('lib/growth/homeB2bBridgeVisibility.ts')

equal(policy.HOME_B2B_BRIDGE_VISIBILITY_VERSION, 'home_b2b_bridge_visibility_v1', 'version is stable')
equal(policy.HOME_B2B_BRIDGE_VISIBLE_RATIO, 0.5, 'view requires half the block')
equal(policy.HOME_B2B_BRIDGE_GATE_PEOPLE, 20, 'gate counts twenty external people')
deepEqual(policy.homeB2bBridgeMetadata('home'), {
  version: 'home_b2b_bridge_visibility_v1',
  entry: 'home',
  surface: 'home',
}, 'home metadata is finite and PII-free')
equal(policy.homeB2bBridgeViewMarker('home'), 'kineo:home_b2b_bridge_visibility_v1:viewed:home', 'marker is versioned')

for (const entry of ['state_report', 'cost_page', 'pricing', 'comment_tool', 'product_tool', 'content_plan', 'real_estate', 'client_brief']) {
  equal(policy.homeB2bBridgeMetadata(entry), null, `${entry}: does not contaminate the home experiment`)
  equal(policy.homeB2bBridgeViewMarker(entry), null, `${entry}: receives no home-session marker`)
}

const bridge = read('components/AgencyVolumeBridge.tsx')
ok(bridge.includes('AgencyVolumeBridgeImpression'), 'real shared bridge mounts the observer')
ok(bridge.includes('AgencyVolumeBridgeLink'), 'real CTA mounts click telemetry')
ok(bridge.indexOf('<AgencyVolumeBridgeImpression') < bridge.indexOf('<AgencyVolumeBridgeLink'), 'view measurement is attached before the CTA')
ok(bridge.includes('agencyPacksHref(entry)'), 'canonical destination is unchanged')
ok(bridge.includes('See one-time volume packs →'), 'visible CTA copy is unchanged')

const telemetry = read('components/AgencyVolumeBridgeTelemetry.tsx')
ok(telemetry.includes("trackEvent('agency_volume_bridge_viewed'"), 'view event is wired')
ok(telemetry.includes("trackEvent('agency_volume_bridge_clicked'"), 'click event is wired')
ok(telemetry.includes('IntersectionObserver'), 'view relies on viewport observation')
ok(telemetry.includes('intersectionRatio >= HOME_B2B_BRIDGE_VISIBLE_RATIO'), 'observer enforces canonical ratio')
ok(telemetry.includes('const pendingViews = new Set<string>()'), 'in-memory guard closes the remount race')
ok(telemetry.includes('pendingViews.add(marker)'), 'pending guard starts immediately before storage')
ok(telemetry.includes('pendingViews.delete(marker)'), 'failed storage can be retried later in the same session')
ok(!telemetry.includes("sessionStorage.setItem(marker, 'pending')"), 'an interrupted request cannot leave a stale pending marker')
ok(!telemetry.includes('email'), 'telemetry contains no email field')
ok(!telemetry.includes('utm_'), 'telemetry does not rebuild acquisition attribution')

const home = read('app/KineoLanding.tsx')
ok(home.includes('<AgencyVolumeBridge entry="home" />'), 'home still mounts the established block')

console.log(`PASS — ${checks}/${checks} home B2B bridge visibility checks`)
