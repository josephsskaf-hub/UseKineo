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

const policy = loadTs('lib/growth/publishKitBusinessPath.ts')
const client = read('app/youtube-shorts-title-generator/PublishKitClient.tsx')
const page = read('app/youtube-shorts-title-generator/page.tsx')
const eventSink = read('app/api/events/route.ts')
const planner = read('app/business-video-content-plan/BusinessContentPlanClient.tsx')

equal(policy.PUBLISH_KIT_BUSINESS_PATH_VERSION, 'publish_kit_business_path_v1', 'variant is stable and explicit')
equal(policy.PUBLISH_KIT_BUSINESS_PATH_DESTINATION, '/business-video-content-plan', 'destination reuses the live business planner')
ok(!policy.PUBLISH_KIT_BUSINESS_PATH_DESTINATION.includes('?'), 'destination does not invent attribution parameters')
ok(!policy.PUBLISH_KIT_BUSINESS_PATH_DESTINATION.includes('#'), 'destination does not hide state in a fragment')

equal(policy.shouldShowPublishKitBusinessPath('business', true), true, 'generated business result is eligible')
equal(policy.shouldShowPublishKitBusinessPath('business', false), false, 'tone alone cannot expose the path before value exists')
for (const tone of ['curiosity', 'clear', 'story', '', null, undefined]) {
  equal(policy.shouldShowPublishKitBusinessPath(tone, true), false, `${String(tone)} result remains on the creator path only`)
}
equal(policy.publishKitBusinessViewSettlement(false), 'retryable', 'stored=false keeps the impression eligible for a later observation')
equal(policy.publishKitBusinessViewSettlement(true), 'recorded', 'stored=true closes the impression latch')
let viewState = policy.publishKitBusinessViewSettlement(false)
equal(viewState, 'retryable', 'first failed write does not claim a recorded view')
viewState = policy.publishKitBusinessViewSettlement(true)
equal(viewState, 'recorded', 'a later successful write records the same view')

const plannerMetadata = policy.publishKitBusinessPathMetadata('planner')
const creatorMetadata = policy.publishKitBusinessPathMetadata('creator')
for (const [choice, metadata] of Object.entries({ planner: plannerMetadata, creator: creatorMetadata })) {
  equal(Object.keys(metadata).sort().join(','), 'destination,placement,surface,version', `${choice}: experiment-specific metadata has four allow-listed keys`)
  equal(metadata.version, policy.PUBLISH_KIT_BUSINESS_PATH_VERSION, `${choice}: telemetry uses the canonical version`)
  equal(metadata.surface, 'youtube_shorts_publish_kit', `${choice}: surface is stable`)
  const metadataText = JSON.stringify(metadata).toLowerCase()
  for (const forbidden of ['topic', 'takeaway', 'title', 'email', 'url', 'prompt']) {
    ok(!metadataText.includes(forbidden), `${choice}: experiment metadata excludes ${forbidden}`)
  }
}
equal(plannerMetadata.placement, 'post_value_secondary', 'planner is labeled as the secondary choice')
equal(plannerMetadata.destination, 'business_video_content_plan', 'planner destination is categorical, not a URL')
equal(creatorMetadata.placement, 'post_value_primary', 'creator is labeled as the primary choice')
equal(creatorMetadata.destination, 'creator_signup', 'creator click is not mislabeled as a planner visit')
assert.throws(() => policy.publishKitBusinessPathMetadata('other'), 'unknown choice fails closed instead of inventing a destination'); checks += 1

ok(client.includes("const [generatedTone, setGeneratedTone]"), 'client stores the tone used for the generated artifact')
ok(client.includes('setGeneratedTone(tone)'), 'generation freezes the selected tone with the result')
ok(client.includes('shouldShowPublishKitBusinessPath(generatedTone, Boolean(kit))'), 'visibility depends on generated tone, not the current select value')
ok(!client.includes('shouldShowPublishKitBusinessPath(tone,'), 'changing the select after generation cannot relabel an old result')
ok(client.includes('className="publish-create-cta"'), 'existing creator CTA remains explicit')
ok(client.includes('Turn this topic into a Short →'), 'existing creator CTA copy remains intact')
ok(client.indexOf('publish-create-cta') < client.indexOf('publish-business-path'), 'creator CTA stays before the business bridge')
ok(client.includes('{showBusinessPath ? ('), 'secondary path is conditionally rendered without truthy-value leakage')
ok(client.includes('Planning a business content batch?'), 'business intent is acknowledged without a new promise')
ok(client.includes('Build the free weekly plan →'), 'secondary CTA names the already-free planner')
ok(client.includes('href={PUBLISH_KIT_BUSINESS_PATH_DESTINATION}'), 'secondary CTA uses the canonical destination')

ok(/trackEvent\(\s*'publish_kit_business_path_viewed'/.test(client), 'real exposure has a dedicated event')
ok(client.includes("'publish_kit_business_creator_clicked'"), 'the preserved creator choice is measurable inside the business variant')
ok(client.includes("'publish_kit_business_path_clicked'"), 'secondary click has a dedicated event')
ok(client.includes('businessPathViewPendingRef.current'), 'view event prevents parallel duplicate writes')
ok(client.includes('businessPathViewedRef.current = true'), 'view event has a confirmed in-page dedupe latch')
ok(client.indexOf("publishKitBusinessViewSettlement(stored) === 'retryable'") < client.indexOf('businessPathViewedRef.current = true'), 'view latch closes only after stored=true')
ok(client.indexOf('businessPathViewedRef.current = true') < client.indexOf('observer.disconnect()', client.indexOf('businessPathViewedRef.current = true')), 'observer disconnects only after confirmed storage')
ok(client.includes('new IntersectionObserver('), 'view waits for real viewport visibility')
ok(client.includes('entry.intersectionRatio >= 0.5'), 'at least half the bridge must be visible')
ok(client.includes('{ threshold: [0.5] }'), 'observer threshold matches the gate')
ok(client.includes('observer.disconnect()'), 'observer stops after the qualified impression')
ok(client.includes("if (typeof IntersectionObserver === 'undefined') return"), 'unsupported observers skip measurement instead of inventing visibility')
ok(client.includes('void trackEvent('), 'analytics remains non-blocking')
ok(client.includes("publishKitBusinessPathMetadata('creator')"), 'creator event executes the primary destination metadata')
equal((client.match(/publishKitBusinessPathMetadata\('planner'\)/g) ?? []).length, 2, 'planner metadata executes for view and planner click')

function eventCallerIndex(name) {
  const match = new RegExp(`trackEvent\\(\\s*'${name}'`).exec(client)
  ok(match, `${name}: real trackEvent caller is located`)
  return match.index
}

const viewEventStart = eventCallerIndex('publish_kit_business_path_viewed')
const creatorEventStart = eventCallerIndex('publish_kit_business_creator_clicked')
const clickEventStart = eventCallerIndex('publish_kit_business_path_clicked')
for (const start of [viewEventStart, creatorEventStart, clickEventStart]) {
  const payload = client.slice(start, start + 220).toLowerCase()
  for (const forbidden of ['generatedtopic', 'topic,', 'takeaway', 'selectedtitle', 'fullpack']) {
    ok(!payload.includes(forbidden), `${forbidden} is absent from event payload near caller`)
  }
}

ok(!eventSink.includes("'publish_kit_business_path_viewed',"), 'browser sink does not misclassify the view as server authority')
ok(!eventSink.includes("'publish_kit_business_creator_clicked',"), 'browser sink does not misclassify the creator choice as server authority')
ok(!eventSink.includes("'publish_kit_business_path_clicked',"), 'browser sink does not misclassify the click as server authority')

const analytics = read('lib/analytics.ts')
ok(analytics.includes("const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'ref'] as const"), 'shared analytics may add only its declared attribution fields')
ok(analytics.includes('metadata: { ...storedUtms(), ...(metadata ?? {}) }'), 'test acknowledges global attribution is merged with experiment metadata')
ok(!analytics.includes('metadata: { ...metadata, ...storedUtms()'), 'experiment metadata cannot be overwritten by a stored attribution key')
for (const downstream of [
  'business_content_plan_viewed',
  'business_content_plan_generated',
  'business_content_plan_activation_clicked',
  'business_content_plan_packs_clicked',
]) {
  ok(planner.includes(`trackEvent('${downstream}'`), `${downstream} already measures the downstream handoff`)
}

ok(page.includes('.publish-next-actions{'), 'desktop action group has an explicit layout')
ok(page.includes('.publish-business-path{'), 'secondary path has distinct low-emphasis styling')
ok(page.includes('rgba(52,211,153,.06)'), 'secondary path is visually distinct from the primary blue action')
ok(page.includes('.publish-next-actions{width:100%;box-sizing:border-box}'), 'mobile action group becomes full width without overflow')
ok(page.includes('.publish-next a:focus-visible'), 'both actions retain visible keyboard focus')

console.log(`Publish Kit business path: ${checks}/${checks} checks passed`)
