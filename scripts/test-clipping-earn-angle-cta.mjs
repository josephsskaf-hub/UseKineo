import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const libPath = path.join(root, 'lib/growth/clippingEarnAngleCta.ts')
const componentPath = path.join(root, 'app/make-money-clipping-with-ai/ClippingEarnAngleTelemetry.tsx')
const pagePath = path.join(root, 'app/make-money-clipping-with-ai/page.tsx')
const libSource = fs.readFileSync(libPath, 'utf8')
const componentSource = fs.readFileSync(componentPath, 'utf8')
const pageSource = fs.readFileSync(pagePath, 'utf8')

const transpiled = ts.transpileModule(libSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: libPath,
})
const module = { exports: {} }
vm.runInNewContext(`(function (module, exports, URL) { ${transpiled.outputText}\n})(module, module.exports, URL)`, {
  module,
  URL,
})
const policy = module.exports

let checks = 0
function check(condition, message) {
  assert.ok(condition, message)
  checks += 1
}

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, value) },
    removeItem(key) { values.delete(key) },
  }
}

check(policy.CLIPPING_EARN_ANGLE_VERSION === 'clipping_earn_angle_cta_v1', 'version is stable')
check(policy.CLIPPING_EARN_ANGLE_VISIBLE_RATIO === 0.6, 'view threshold is 60%')
check(policy.CLIPPING_EARN_ANGLE_TARGET_ID === 'clipping-earn-angle-cta-card', 'target id is stable')
check(policy.CLIPPING_EARN_ANGLE_VIEW_MARKER.includes(policy.CLIPPING_EARN_ANGLE_VERSION), 'view marker is versioned')
check(policy.CLIPPING_EARN_ANGLE_CLICK_MARKER.includes(policy.CLIPPING_EARN_ANGLE_VERSION), 'click marker is versioned')

const metadata = policy.clippingEarnAngleMetadata()
check(Object.keys(metadata).length === 5, 'metadata has exactly five closed keys')
check(metadata.version === policy.CLIPPING_EARN_ANGLE_VERSION, 'metadata carries version')
check(metadata.surface === 'make_money_clipping_with_ai', 'metadata surface is categorical')
check(metadata.placement === 'daily_volume_cta', 'metadata placement is categorical')
check(metadata.destination === 'free_ai_shorts_generator', 'metadata destination is categorical')
check(metadata.intent === 'earn_angle', 'metadata intent is categorical')
check(!('topic' in metadata), 'metadata excludes topic')
check(!('email' in metadata), 'metadata excludes email')
check(!('url' in metadata), 'metadata excludes raw URL')
check(!('utm_source' in metadata), 'closed metadata excludes inherited UTM')

const destination = policy.CLIPPING_EARN_ANGLE_DESTINATION
check(policy.isClippingEarnAngleDestination(destination), 'accepts the canonical relative destination')
check(policy.isClippingEarnAngleDestination(`https://www.usekineo.com${destination}`), 'accepts the canonical absolute destination')
check(!policy.isClippingEarnAngleDestination(null), 'rejects null destination')
check(!policy.isClippingEarnAngleDestination('/free-ai-shorts-generator'), 'rejects destination without attribution')
check(!policy.isClippingEarnAngleDestination(destination + '&topic=secret'), 'rejects extra free-form query')
check(!policy.isClippingEarnAngleDestination(destination.replace('earn-angle', 'other')), 'rejects another campaign')
check(!policy.isClippingEarnAngleDestination(destination.replace('clipping-page', 'homepage')), 'rejects another source')
check(!policy.isClippingEarnAngleDestination('https://evil.example/free-ai-shorts-generator?utm_source=clipping-page&utm_medium=seo&utm_campaign=earn-angle'), 'rejects another origin')
check(policy.shouldSampleClippingEarnAngleView({ isIntersecting: true, intersectionRatio: 0.6, documentVisible: true }), '60% visible qualifies')
check(!policy.shouldSampleClippingEarnAngleView({ isIntersecting: true, intersectionRatio: 0.599, documentVisible: true }), 'less than 60% does not qualify')
check(!policy.shouldSampleClippingEarnAngleView({ isIntersecting: false, intersectionRatio: 1, documentVisible: true }), 'non-intersecting target does not qualify')
check(!policy.shouldSampleClippingEarnAngleView({ isIntersecting: true, intersectionRatio: 1, documentVisible: false }), 'hidden document does not qualify')

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createClippingEarnAngleRecorder({
    storage,
    transport: async (eventName, sentMetadata) => {
      posts += 1
      check(storage.getItem('marker') === 'pending', 'claim is persisted before POST')
      check(eventName === 'clipping_earn_angle_cta_viewed', 'event name reaches transport')
      check(sentMetadata.version === policy.CLIPPING_EARN_ANGLE_VERSION, 'closed metadata reaches transport')
      return 'stored'
    },
  })
  check(await recorder.recordOnce('marker', 'clipping_earn_angle_cta_viewed') === 'stored', 'stored outcome is returned')
  check(storage.getItem('marker') === 'stored', 'stored outcome finalizes claim')
  check(await recorder.recordOnce('marker', 'clipping_earn_angle_cta_viewed') === 'duplicate', 'stored marker suppresses remount')
  check(posts === 1, 'stored event posts exactly once')

  const remounted = policy.createClippingEarnAngleRecorder({
    storage,
    transport: async () => { posts += 1; return 'stored' },
  })
  check(await remounted.recordOnce('marker', 'clipping_earn_angle_cta_viewed') === 'duplicate', 'new recorder instance respects persisted marker')
  check(posts === 1, 'remount cannot duplicate stored event')
}

{
  const storage = fakeStorage()
  let release
  let posts = 0
  const recorder = policy.createClippingEarnAngleRecorder({
    storage,
    transport: () => {
      posts += 1
      return new Promise((resolve) => { release = resolve })
    },
  })
  const first = recorder.recordOnce('concurrent', 'clipping_earn_angle_cta_viewed')
  const second = await recorder.recordOnce('concurrent', 'clipping_earn_angle_cta_viewed')
  check(second === 'duplicate', 'concurrent call is suppressed')
  check(posts === 1, 'concurrent calls create one POST')
  release('stored')
  check(await first === 'stored', 'first concurrent call settles stored')
}

{
  const storage = fakeStorage()
  let release
  let posts = 0
  const firstRecorder = policy.createClippingEarnAngleRecorder({
    storage,
    transport: () => {
      posts += 1
      return new Promise((resolve) => { release = resolve })
    },
  })
  const remountedRecorder = policy.createClippingEarnAngleRecorder({
    storage,
    transport: async () => { posts += 1; return 'stored' },
  })
  const first = firstRecorder.recordOnce('shared', 'clipping_earn_angle_cta_viewed')
  check(await remountedRecorder.recordOnce('shared', 'clipping_earn_angle_cta_viewed') === 'duplicate', 'pending claim suppresses a second recorder')
  check(posts === 1, 'two recorder instances share one POST through storage claim')
  release('stored')
  check(await first === 'stored', 'shared pending claim settles stored')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createClippingEarnAngleRecorder({
    storage,
    transport: async () => {
      posts += 1
      return posts === 1 ? 'not_stored' : 'stored'
    },
  })
  check(await recorder.recordOnce('retry', 'clipping_earn_angle_cta_viewed') === 'not_stored', 'confirmed rejection is retryable')
  check(storage.getItem('retry') === null, 'confirmed rejection removes pending claim')
  check(await recorder.recordOnce('retry', 'clipping_earn_angle_cta_viewed') === 'stored', 'one later retry can store')
  check(posts === 2, 'retry performs a bounded second POST')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createClippingEarnAngleRecorder({
    storage,
    transport: async () => { posts += 1; return 'ambiguous' },
  })
  check(await recorder.recordOnce('ambiguous', 'clipping_earn_angle_cta_viewed') === 'ambiguous', 'ambiguous outcome is explicit')
  check(storage.getItem('ambiguous') === 'pending', 'ambiguous outcome keeps pending claim')
  check(await recorder.recordOnce('ambiguous', 'clipping_earn_angle_cta_viewed') === 'duplicate', 'ambiguous response is not retried')
  check(posts === 1, 'ambiguous response cannot duplicate a possibly stored event')
}

{
  const storage = fakeStorage()
  let posts = 0
  const recorder = policy.createClippingEarnAngleRecorder({
    storage,
    transport: async () => { posts += 1; throw new Error('response lost') },
  })
  check(await recorder.recordOnce('thrown', 'clipping_earn_angle_cta_clicked') === 'ambiguous', 'transport exception is ambiguous')
  check(storage.getItem('thrown') === 'pending', 'transport exception preserves claim')
  check(await recorder.recordOnce('thrown', 'clipping_earn_angle_cta_clicked') === 'duplicate', 'transport exception cannot re-POST')
  check(posts === 1, 'transport exception posts at most once')
}

{
  const deniedStorage = {
    getItem() { throw new Error('denied') },
    setItem() { throw new Error('denied') },
    removeItem() { throw new Error('denied') },
  }
  let posts = 0
  const recorder = policy.createClippingEarnAngleRecorder({
    storage: deniedStorage,
    transport: async () => { posts += 1; return 'stored' },
  })
  check(await recorder.recordOnce('denied', 'clipping_earn_angle_cta_clicked') === 'unavailable', 'storage denial fails closed')
  check(await recorder.recordOnce('denied', 'clipping_earn_angle_cta_clicked') === 'unavailable', 'storage denial remains closed across attempts')
  check(posts === 0, 'storage denial produces zero unowned POSTs')
}

{
  let posts = 0
  const recorder = policy.createClippingEarnAngleRecorder({
    storage: null,
    transport: async () => { posts += 1; return 'stored' },
  })
  check(await recorder.recordOnce('missing', 'clipping_earn_angle_cta_viewed') === 'unavailable', 'missing storage fails closed')
  check(posts === 0, 'missing storage performs zero POSTs')
}

{
  const storage = fakeStorage({ pending: 'pending', stored: 'stored' })
  let posts = 0
  const recorder = policy.createClippingEarnAngleRecorder({
    storage,
    transport: async () => { posts += 1; return 'stored' },
  })
  check(recorder.wasSettled('pending'), 'pending marker is terminal against duplicate POST')
  check(recorder.wasSettled('stored'), 'stored marker is terminal')
  check(await recorder.recordOnce('pending', 'clipping_earn_angle_cta_viewed') === 'duplicate', 'pending marker suppresses remount')
  check(posts === 0, 'existing terminal markers perform no POST')
}

check(pageSource.includes("import ClippingEarnAngleTelemetry from './ClippingEarnAngleTelemetry'"), 'server page wires telemetry caller')
check(pageSource.includes('id={CLIPPING_EARN_ANGLE_TARGET_ID}'), 'existing CTA card owns target id')
check(pageSource.includes('href={CLIPPING_EARN_ANGLE_DESTINATION}'), 'existing CTA uses canonical destination constant')
check(pageSource.includes('Generate a free Short →'), 'visible CTA copy is preserved')
check((pageSource.match(/<ClippingEarnAngleTelemetry \/>/g) ?? []).length === 1, 'telemetry mounts exactly once')
check(componentSource.includes("'clipping_earn_angle_cta_viewed'"), 'caller emits view event')
check(componentSource.includes("'clipping_earn_angle_cta_clicked'"), 'caller emits click event')
check(componentSource.includes('trackClosedEvent(eventName, metadata)'), 'caller uses closed metadata transport')
check(componentSource.includes('shouldSampleClippingEarnAngleView({'), 'caller executes shared visibility policy')
check(componentSource.includes("document.visibilityState === 'hidden'"), 'hidden tab cannot emit view')
check(componentSource.includes("anchor.getAttribute('href')"), 'click verifies actual anchor destination')
check(componentSource.includes("target.addEventListener('click', handleClick)"), 'click listener is attached to existing card')
check(componentSource.includes("target.removeEventListener('click', handleClick)"), 'click listener is cleaned up')
check(componentSource.includes('observer?.disconnect()'), 'observer is cleaned up')
check(componentSource.includes('clearRetry()'), 'retry timer is cleaned up')
check(!componentSource.includes('preventDefault'), 'telemetry never changes navigation')
check(!componentSource.includes('checkout'), 'telemetry does not touch checkout')
check(!componentSource.includes('price'), 'telemetry does not introduce price')
check(!componentSource.includes('credit'), 'telemetry does not touch credits')
check(pageSource.includes('small, invisible client telemetry island'), 'page comment no longer claims zero client JS')

console.log(`PASS ${checks}/${checks} — clipping earn-angle CTA contract`)
