#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (path) => readFileSync(join(root, path), 'utf8')

let checks = 0
function ok(value, label) { assert.ok(value, label); checks += 1 }
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks += 1 }

function loadTs(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${path}: unexpected import ${id}`) },
    module,
    module.exports,
  )
  return module.exports
}

const policy = loadTs('lib/growth/examplesBusinessProof.ts')
const component = read('app/examples/ExamplesBusinessProofBridge.tsx')
const page = read('app/examples/page.tsx')
const agency = read('app/ai-shorts-for-agencies/page.tsx')
const eventSink = read('app/api/events/route.ts')

equal(policy.EXAMPLES_BUSINESS_PROOF_VERSION, 'examples_business_proof_bridge_v1', 'variant is stable and explicit')
equal(policy.EXAMPLES_BUSINESS_PROOF_DESTINATION, '/ai-shorts-for-agencies#agency-pack-heading', 'destination is the existing pack shelf')
equal(policy.EXAMPLES_BUSINESS_PROOF_VISIBLE_RATIO, 0.5, 'half the card must be visible')
ok(!policy.EXAMPLES_BUSINESS_PROOF_DESTINATION.includes('?'), 'destination does not add query attribution')
ok(!policy.EXAMPLES_BUSINESS_PROOF_DESTINATION.includes('utm_'), 'destination cannot overwrite first-touch attribution')
ok(policy.isExamplesBusinessProofDestination(policy.EXAMPLES_BUSINESS_PROOF_DESTINATION), 'canonical destination is accepted')
for (const unsafe of ['', '/pricing', '/ai-shorts-for-agencies', 'https://evil.example', null, undefined]) {
  equal(policy.isExamplesBusinessProofDestination(unsafe), false, `non-canonical destination is rejected: ${String(unsafe)}`)
}
equal(policy.examplesBusinessProofViewSettlement(false), 'retryable', 'failed storage leaves the view eligible')
equal(policy.examplesBusinessProofViewSettlement(true), 'recorded', 'successful storage closes the view latch')

const metadata = policy.examplesBusinessProofMetadata()
equal(Object.keys(metadata).sort().join(','), 'destination,placement,surface,version', 'metadata has four allow-listed keys')
equal(metadata.version, policy.EXAMPLES_BUSINESS_PROOF_VERSION, 'metadata uses the canonical version')
equal(metadata.surface, 'examples_index', 'surface distinguishes the index from detail pages')
equal(metadata.placement, 'after_creator_cta', 'placement declares the business card secondary')
equal(metadata.destination, 'agency_packs', 'destination is categorical instead of a URL')
for (const forbidden of ['email', 'topic', 'prompt', 'slug', 'video', 'url', 'price', 'session']) {
  ok(!JSON.stringify(metadata).toLowerCase().includes(forbidden), `metadata excludes ${forbidden}`)
}

ok(page.includes("import ExamplesBusinessProofBridge from './ExamplesBusinessProofBridge'"), 'examples index imports the dedicated island')
ok(page.includes('<ExamplesBusinessProofBridge />'), 'examples index renders the business bridge')
ok(!page.startsWith("'use client'"), 'examples page remains a Server Component')
ok(page.includes('Watch what Kineo actually makes.'), 'proof headline remains intact')
ok(page.includes('Bring your own topic.'), 'creator card remains intact')
ok(page.includes('Create a Fast video →'), 'visitor creator CTA remains intact')
ok(page.includes('Open Studio →'), 'signed-in creator CTA remains intact')
ok(page.indexOf('Bring your own topic.') < page.indexOf('<ExamplesBusinessProofBridge />'), 'creator action stays before the business bridge')
ok(page.indexOf('</figure>') < page.indexOf('<ExamplesBusinessProofBridge />'), 'subscriber proof remains before the bridge')

ok(agency.includes('<Link href="/examples"'), 'agency page still sends buyers to the proof index')
ok(agency.indexOf('Watch real outputs') > agency.indexOf('<Link href="/examples"'), 'agency proof CTA is still live')

ok(component.startsWith("'use client'"), 'telemetry is isolated in a Client Component')
ok(component.includes('useRef<HTMLElement | null>(null)'), 'component observes its own rendered card')
ok(component.includes("typeof IntersectionObserver === 'undefined'"), 'unsupported observers skip measurement')
ok(component.includes('entry.intersectionRatio < EXAMPLES_BUSINESS_PROOF_VISIBLE_RATIO'), 'view requires the policy threshold')
ok(component.includes('{ threshold: [EXAMPLES_BUSINESS_PROOF_VISIBLE_RATIO] }'), 'observer threshold matches policy')
ok(component.includes("'examples_business_proof_bridge_viewed'"), 'qualified view has a dedicated event')
ok(component.includes("'examples_business_proof_bridge_clicked'"), 'business click has a dedicated event')
ok(component.includes('href={EXAMPLES_BUSINESS_PROOF_DESTINATION}'), 'link uses the exact policy destination')
ok(component.includes('recorded.add(marker)'), 'successful event latches in memory')
ok(component.includes("window.sessionStorage.setItem(marker, '1')"), 'successful event latches for the browser session')
ok(component.includes('if (wasRecorded(marker) || inFlight.has(marker)) return false'), 'parallel and repeated writes are suppressed')
ok(component.includes("examplesBusinessProofViewSettlement(stored) === 'retryable'"), 'failed writes do not falsely close the gate')
ok(component.includes('observer.disconnect()'), 'observer is cleaned up')
ok(component.includes('For client work'), 'card labels the B2B audience')
ok(component.includes('Making Shorts for clients?'), 'card names the job without a new promise')
ok(component.includes('one-time self-service packs for 10–50 Fast Shorts'), 'card states the existing pack boundary')
ok(component.includes('one Kineo account and no recurring contract'), 'card states existing offer limits')
ok(component.includes('Compare one-time client packs →'), 'secondary CTA names the destination')
ok(component.includes('focus-visible:outline'), 'keyboard focus remains visible')
ok(component.includes('sm:flex sm:items-center sm:justify-between'), 'desktop layout is explicit')
ok(component.includes('mt-4 inline-flex'), 'mobile action has its own row before the desktop breakpoint')

for (const eventName of ['examples_business_proof_bridge_viewed', 'examples_business_proof_bridge_clicked']) {
  ok(!eventSink.includes(`'${eventName}',`), `${eventName} remains a browser event, not server authority`)
  const caller = component.indexOf(`'${eventName}'`)
  ok(caller >= 0, `${eventName} caller exists`)
  const payload = component.slice(caller - 120, caller + 180).toLowerCase()
  for (const forbidden of ['email', 'topic', 'prompt', 'example_slug', 'video_id']) {
    ok(!payload.includes(forbidden), `${eventName} caller excludes ${forbidden}`)
  }
}

console.log(`Examples business proof bridge: ${checks}/${checks} checks passed`)
