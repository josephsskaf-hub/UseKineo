#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel) {
  const output = ts.transpileModule(read(rel), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', output)(module, module.exports)
  return module.exports
}

const policy = loadTs('lib/growth/footerBusinessDiscovery.ts')
const footer = read('components/Footer.tsx')
const link = read('components/FooterBusinessLink.tsx')

let checks = 0
const equal = (actual, expected, message) => {
  assert.deepEqual(actual, expected, message)
  checks += 1
}
const ok = (condition, message) => {
  assert.ok(condition, message)
  checks += 1
}

equal(policy.FOOTER_BUSINESS_DISCOVERY_VERSION, 'footer_business_discovery_v1', 'version is stable')
equal(policy.FOOTER_BUSINESS_VISIBLE_RATIO, 0.6, 'view requires 60 percent visibility')

const expected = {
  '/youtube-automation-case-study': 'autopilot_proof',
  '/ai-shorts-for-agencies': 'agency_packs',
  '/business-video-content-plan': 'business_plan',
  '/client-video-brief-generator': 'client_brief',
}
equal(policy.FOOTER_BUSINESS_DESTINATIONS, expected, 'allow-list contains only the four current B2B destinations')
for (const [href, destination] of Object.entries(expected)) {
  equal(policy.footerBusinessDestinationForHref(href), destination, `${href} maps to ${destination}`)
}
for (const href of [null, '', '/partners', '/trust', '/pricing', '/real-estate-video-maker', 'https://evil.example']) {
  equal(policy.footerBusinessDestinationForHref(href), null, `${String(href)} stays outside the experiment`)
}

equal(
  policy.footerBusinessDiscoveryMetadata('agency_packs'),
  {
    version: 'footer_business_discovery_v1',
    surface: 'global_footer',
    destination: 'agency_packs',
    measurement_unit: 'event_session_destination',
  },
  'metadata is categorical and declares the denominator',
)

const markers = new Set()
const sent = []
let shouldStore = true
const recorder = policy.createFooterBusinessEventRecorder({
  readMarker: (marker) => markers.has(marker),
  writeMarker: (marker) => markers.add(marker),
  send: async (eventName, metadata) => {
    sent.push({ eventName, metadata })
    return shouldStore
  },
})

equal(await recorder.record('footer_business_path_viewed', 'agency_packs'), true, 'first stored view succeeds')
equal(await recorder.record('footer_business_path_viewed', 'agency_packs'), false, 'same session and destination is deduplicated')
equal(sent.length, 1, 'deduplicated view is sent once')
equal(await recorder.record('footer_business_path_viewed', 'business_plan'), true, 'another destination has its own denominator')
equal(sent.length, 2, 'second destination is sent once')
equal(await recorder.record('footer_business_path_clicked', 'agency_packs'), true, 'click is independent from view')
equal(sent.length, 3, 'click is sent once')

shouldStore = false
equal(await recorder.record('footer_business_path_clicked', 'client_brief'), false, 'server rejection is not counted')
equal(recorder.wasRecorded('footer_business_path_clicked', 'client_brief'), false, 'server rejection stays retryable')
shouldStore = true
equal(await recorder.record('footer_business_path_clicked', 'client_brief'), true, 'retry records after the server stores it')

let release
const concurrentSends = []
const concurrent = policy.createFooterBusinessEventRecorder({
  readMarker: () => false,
  writeMarker: () => {},
  send: async (eventName, metadata) => {
    concurrentSends.push({ eventName, metadata })
    await new Promise((resolve) => { release = resolve })
    return true
  },
})
const first = concurrent.record('footer_business_path_viewed', 'autopilot_proof')
const second = concurrent.record('footer_business_path_viewed', 'autopilot_proof')
equal(await second, false, 'in-flight latch blocks observer races')
equal(concurrentSends.length, 1, 'observer race sends only one request')
release()
equal(await first, true, 'original in-flight request can complete')

const privateMode = policy.createFooterBusinessEventRecorder({
  readMarker: () => { throw new Error('denied') },
  writeMarker: () => { throw new Error('denied') },
  send: async () => true,
})
equal(await privateMode.record('footer_business_path_clicked', 'business_plan'), true, 'privacy mode cannot break the link')
equal(await privateMode.record('footer_business_path_clicked', 'business_plan'), false, 'memory still deduplicates in privacy mode')

const analyticsOutage = policy.createFooterBusinessEventRecorder({
  readMarker: () => false,
  writeMarker: () => {},
  send: async () => { throw new Error('offline') },
})
equal(
  await analyticsOutage.record('footer_business_path_clicked', 'autopilot_proof'),
  false,
  'analytics outage is failure-isolated from navigation',
)
equal(
  analyticsOutage.wasRecorded('footer_business_path_clicked', 'autopilot_proof'),
  false,
  'analytics outage remains retryable',
)

ok(footer.includes("import FooterBusinessLink from '@/components/FooterBusinessLink'"), 'footer imports the invisible instrumented link')
ok(footer.includes('footerBusinessDestinationForHref(link.href)'), 'footer derives destinations from the exact allow-list')
ok(footer.includes('<FooterBusinessLink'), 'footer renders the instrumented link only for allow-listed destinations')
for (const href of Object.keys(expected)) {
  equal((footer.match(new RegExp(href.replaceAll('/', '\\/'), 'g')) ?? []).length, 1, `${href} remains a single existing footer destination`)
}
ok(link.includes("'footer_business_path_viewed'"), 'client records qualified views')
ok(link.includes("'footer_business_path_clicked'"), 'client records clicks')
ok(link.includes('IntersectionObserver'), 'view is based on real visibility')
ok(link.includes('FOOTER_BUSINESS_VISIBLE_RATIO'), 'observer uses the canonical threshold')
ok(link.includes('window.sessionStorage'), 'events are deduplicated across remounts in the tab')
ok(link.includes('if (stored || footerBusinessRecorder.wasRecorded'), 'observer disconnects only after a recorded denominator')
ok(!link.includes('preventDefault'), 'telemetry never delays or blocks navigation')
equal(
  Object.keys(policy.footerBusinessDiscoveryMetadata('agency_packs')).sort(),
  ['destination', 'measurement_unit', 'surface', 'version'],
  'metadata exposes only the four categorical contract fields',
)
ok(
  Object.values(expected).every((destination) => !destination.includes('/') && !destination.includes(':')),
  'destination values are enums, never raw URLs',
)

console.log(`footer-business-discovery: ${checks}/${checks} checks passed`)
