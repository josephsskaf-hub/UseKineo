// B2C #134 — deterministic; no network, database, credentials or production writes.
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
function findTsc(base) {
  let dir = base
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, 'node_modules', 'typescript', 'bin', 'tsc')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('TypeScript compiler not found')
}
const temp = mkdtempSync(join(tmpdir(), 'kineo-result-value-'))
const sourceDir = join(temp, 'src')
const outDir = join(temp, 'out')
mkdirSync(sourceDir, { recursive: true })
writeFileSync(join(sourceDir, 'resultVideoValueSample.ts'), readFileSync(join(root, 'lib/growth/resultVideoValueSample.ts'), 'utf8'))
execFileSync(process.execPath, [findTsc(root), join(sourceDir, 'resultVideoValueSample.ts'), '--outDir', outDir,
  '--rootDir', sourceDir, '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--skipLibCheck'], { stdio: 'pipe' })
writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))
const requireFromTemp = createRequire(join(outDir, 'runner.cjs'))
const sample = requireFromTemp(join(outDir, 'resultVideoValueSample.js'))

let total = 0
let failed = 0
function check(name, condition, detail = '') {
  total += 1
  if (condition) return
  failed += 1
  console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`)
}
const flush = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve() }

function harness(overrides = {}) {
  let clock = 0
  let nextId = 1
  const timers = new Map()
  const emitted = []
  const controller = sample.createResultVideoValueSampler({
    attemptId: 'attempt-134', initialVisible: true,
    context: () => ({ attemptId: 'attempt-134', quality: 'cinematic_h3', durationSeconds: 60, firstDeliveryStatus: 'confirmed' }),
    emit: (metadata) => { emitted.push(metadata); return true }, now: () => clock,
    schedule: (callback, delay) => { const id = nextId++; timers.set(id, { callback, due: clock + delay }); return id },
    cancel: (id) => timers.delete(id), ...overrides,
  })
  const advance = (milliseconds) => {
    clock += milliseconds
    let due
    do {
      due = [...timers.entries()].filter(([, timer]) => timer.due <= clock).sort((a, b) => a[1].due - b[1].due)[0]
      if (due) { timers.delete(due[0]); due[1].callback() }
    } while (due)
  }
  return { controller, advance, emitted, timers }
}

console.log('\nKINEO B2C #134 — result video value sampled\n')
const exact = harness()
exact.controller.playing(0); exact.advance(4_999); exact.controller.progress(4.999)
check('4.999 decoded seconds does not emit', exact.emitted.length === 0)
exact.advance(1); exact.controller.progress(5)
check('5.000 visible decoded seconds emits once', exact.emitted.length === 1)
exact.advance(20_000); exact.controller.progress(25); exact.controller.pause(); exact.controller.playing(25); exact.advance(5_000); exact.controller.progress(30)
check('same mounted attempt stays single-shot', exact.emitted.length === 1)

const cumulative = harness()
cumulative.controller.playing(0); cumulative.advance(2_000); cumulative.controller.progress(2); cumulative.controller.pause(); cumulative.advance(10_000)
check('paused wall time is excluded', cumulative.emitted.length === 0 && cumulative.controller.sampledMilliseconds() === 2_000)
cumulative.controller.playing(2); cumulative.advance(3_000); cumulative.controller.progress(5)
check('decoded playback accumulates across segments', cumulative.emitted.length === 1)

const hidden = harness()
hidden.controller.playing(0); hidden.advance(3_000); hidden.controller.progress(3); hidden.controller.visibility(false, 3)
hidden.advance(30_000); hidden.controller.progress(33)
check('hidden media progress is excluded', hidden.emitted.length === 0 && hidden.controller.sampledMilliseconds() === 3_000)
hidden.controller.visibility(true, 33); hidden.advance(2_000); hidden.controller.progress(35)
check('visible return resumes from a fresh baseline', hidden.emitted.length === 1)

const buffering = harness()
buffering.controller.playing(0); buffering.advance(2_500); buffering.controller.progress(2.5); buffering.controller.waiting(); buffering.advance(20_000)
check('buffering wall time is excluded', buffering.emitted.length === 0)
buffering.controller.playing(2.5); buffering.advance(2_500); buffering.controller.progress(5)
check('playing after buffering resumes accumulation', buffering.emitted.length === 1)

const noProgress = harness()
noProgress.controller.playing(0); noProgress.advance(20_000); noProgress.controller.progress(0)
check('thread delay without media progress contributes zero', noProgress.emitted.length === 0 && noProgress.controller.sampledMilliseconds() === 0)
const seekJump = harness()
seekJump.controller.playing(0); seekJump.advance(100); seekJump.controller.progress(50)
check('seek jump is capped by visible wall time', seekJump.emitted.length === 0 && seekJump.controller.sampledMilliseconds() === 100)
seekJump.controller.waiting(); seekJump.advance(10_000); seekJump.controller.playing(50); seekJump.advance(5_000); seekJump.controller.progress(55)
check('real playback after seek reaches five cumulative seconds', seekJump.emitted.length === 1)

const ended = harness()
ended.controller.playing(0); ended.advance(4_000); ended.controller.progress(4); ended.controller.ended(); ended.advance(20_000); ended.controller.progress(24)
check('ended media cannot reach threshold', ended.emitted.length === 0)
const destroyed = harness()
destroyed.controller.playing(0); destroyed.advance(5_000); destroyed.controller.progress(5); destroyed.controller.destroy(); destroyed.advance(20_000)
check('cleanup leaves no retry timer', destroyed.timers.size === 0)

let retryCalls = 0
const retry = harness({ emit: () => { retryCalls += 1; return retryCalls === 2 } })
retry.controller.playing(0); retry.advance(5_000); retry.controller.progress(5)
check('stored=false does not pretend success', retryCalls === 1)
retry.advance(1_999); check('failed persistence waits before retry', retryCalls === 1)
retry.advance(1); check('one bounded retry can store the sample', retryCalls === 2)
let failedCalls = 0
const bounded = harness({ emit: () => { failedCalls += 1; return false } })
bounded.controller.playing(0); bounded.advance(5_000); bounded.controller.progress(5); bounded.advance(2_000); bounded.advance(30_000)
check('persistent failure stops after two writes', failedCalls === 2 && bounded.timers.size === 0)

let resolvePending
let concurrentCalls = 0
const pendingWrite = new Promise((resolve) => { resolvePending = resolve })
const singleFlight = harness({ emit: () => { concurrentCalls += 1; return pendingWrite } })
singleFlight.controller.playing(0); singleFlight.advance(5_000); singleFlight.controller.progress(5)
singleFlight.controller.pause(); singleFlight.controller.playing(5); singleFlight.advance(5_000); singleFlight.controller.progress(10)
check('in-flight write suppresses concurrent emission', concurrentCalls === 1)
resolvePending(true); await flush()
check('confirmed async write completes without retry', concurrentCalls === 1 && singleFlight.timers.size === 0)

const sharedStorage = new Map()
let lockTail = Promise.resolve()
const requestLock = (_name, callback) => {
  const result = lockTail.then(callback)
  lockTail = result.catch(() => false)
  return result
}
let underlyingPosts = 0
const makeEmitter = () => sample.createCrossTabResultVideoEmitter({
  attemptId: 'attempt-tabs', requestLock,
  readLatch: (key) => sharedStorage.get(key) ?? null,
  writeLatch: (key, value) => sharedStorage.set(key, value),
  removeLatch: (key) => sharedStorage.delete(key),
  emit: async () => { underlyingPosts += 1; return 'stored' },
})
const tabOne = harness({ attemptId: 'attempt-tabs', emit: makeEmitter(), context: () => ({ attemptId: 'attempt-tabs', quality: 'fast', durationSeconds: 35, firstDeliveryStatus: 'unresolved' }) })
const tabTwo = harness({ attemptId: 'attempt-tabs', emit: makeEmitter(), context: () => ({ attemptId: 'attempt-tabs', quality: 'fast', durationSeconds: 35, firstDeliveryStatus: 'unresolved' }) })
tabOne.controller.playing(0); tabTwo.controller.playing(0)
tabOne.advance(5_000); tabTwo.advance(5_000); tabOne.controller.progress(5); tabTwo.controller.progress(5)
await flush()
check('concurrent tabs serialize before POST', underlyingPosts === 1)
check('cross-tab success leaves one shared latch', sharedStorage.size === 1)
let unsupportedPosts = 0
const unsupportedEmitter = sample.createCrossTabResultVideoEmitter({
  attemptId: 'attempt-unsupported', readLatch: () => null, writeLatch: () => {},
  removeLatch: () => {},
  emit: async () => { unsupportedPosts += 1; return 'stored' },
})
check('browser without atomic lock fails closed', await unsupportedEmitter({}) === false && unsupportedPosts === 0)
let writeDeniedPosts = 0
const writeDeniedEmitter = sample.createCrossTabResultVideoEmitter({
  attemptId: 'attempt-write-denied', requestLock: async (_name, callback) => callback(),
  readLatch: () => null, writeLatch: () => { throw new Error('denied') },
  removeLatch: () => {},
  emit: async () => { writeDeniedPosts += 1; return 'stored' },
})
check('failed pre-claim prevents the POST', await writeDeniedEmitter({}) === false && writeDeniedPosts === 0)
const retryStorage = new Map()
let coordinatedAttempts = 0
const coordinatedRetry = sample.createCrossTabResultVideoEmitter({
  attemptId: 'attempt-coordinated-retry', requestLock: async (_name, callback) => callback(),
  readLatch: (key) => retryStorage.get(key) ?? null,
  writeLatch: (key, value) => retryStorage.set(key, value),
  removeLatch: (key) => retryStorage.delete(key),
  emit: async () => { coordinatedAttempts += 1; return coordinatedAttempts === 2 ? 'stored' : 'not_stored' },
})
check('confirmed failure releases pending claim', await coordinatedRetry({}) === false && retryStorage.size === 0)
check('released claim permits one successful retry', await coordinatedRetry({}) === true && coordinatedAttempts === 2 && [...retryStorage.values()][0] === 'stored')
const ambiguousStorage = new Map()
let ambiguousPosts = 0
const ambiguousEmitter = sample.createCrossTabResultVideoEmitter({
  attemptId: 'attempt-ambiguous', requestLock: async (_name, callback) => callback(),
  readLatch: (key) => ambiguousStorage.get(key) ?? null,
  writeLatch: (key, value) => ambiguousStorage.set(key, value),
  removeLatch: (key) => ambiguousStorage.delete(key),
  emit: async () => { ambiguousPosts += 1; return 'ambiguous' },
})
check('ambiguous response keeps pending claim', await ambiguousEmitter({}) === true && [...ambiguousStorage.values()][0] === 'pending')
check('pending claim suppresses retry after lost response', await ambiguousEmitter({}) === true && ambiguousPosts === 1)

const metadata = exact.emitted[0]
check('event version is explicit', metadata.version === 'result_video_value_sampled_v1')
check('attempt ID is retained', metadata.attempt_id === 'attempt-134')
check('threshold is explicit', metadata.threshold_seconds === 5)
check('quality is a closed bucket', metadata.quality_bucket === 'cinematic')
check('duration is a closed bucket', metadata.duration_bucket === '60_89s')
check('first delivery is a tri-state', metadata.first_delivery_status === 'confirmed')
check('metadata has only approved keys', JSON.stringify(Object.keys(metadata).sort()) === JSON.stringify([
  'attempt_id', 'duration_bucket', 'first_delivery_status', 'quality_bucket', 'threshold_seconds', 'version',
]))
check('metadata has no URL content or email', !/https?:|signed|prompt|script|title|email|@/i.test(JSON.stringify(metadata)))
check('future quality fails closed', sample.resultVideoQualityBucket('future-engine') === 'unknown')
check('non-numeric duration fails closed', sample.resultVideoDurationBucket('60') === 'unknown')
check('safe attempt alphabet is accepted', sample.normalizeResultVideoAttemptId('abc-123_DEF.ghi~') === 'abc-123_DEF.ghi~')
check('whitespace attempt is rejected', sample.normalizeResultVideoAttemptId('abc 123') === null)
check('pending history stays unresolved', sample.resultVideoValueMetadata({
  attemptId: 'attempt-unresolved', quality: 'fast', durationSeconds: 35, firstDeliveryStatus: 'unresolved',
}).first_delivery_status === 'unresolved')

const source = readFileSync(join(root, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
const playerMatch = source.match(/<video\s+ref=\{videoRef\}[\s\S]*?\/>/)
const player = playerMatch?.[0] ?? ''
const effectStart = source.indexOf('const lockManager =')
const effectEnd = source.indexOf('const planFitOfferCandidate', effectStart)
const wiring = source.slice(effectStart, effectEnd)
check('controller uses the real result player ref', Boolean(playerMatch) && source.slice(effectStart - 1_000, effectStart).includes('const el = videoRef.current'))
check('real playing event starts the baseline', wiring.includes("addEventListener('playing', onPlaying)"))
check('timeupdate supplies decoded media progress', wiring.includes("addEventListener('timeupdate', onTimeUpdate)"))
check('pause waiting stalled seeking and ended stop sampling', ['pause', 'waiting', 'stalled', 'seeking', 'ended'].every((event) => wiring.includes(`addEventListener('${event}'`)))
check('seeked resumes only with playable future data', wiring.includes("addEventListener('seeked', onSeeked)") && /!el\.paused && !el\.ended && !el\.seeking && el\.readyState >= 3/.test(wiring))
check('visibility supplies a fresh media baseline', wiring.includes("document.addEventListener('visibilitychange', onVisibility)"))
check('all media listeners are removed', ['playing', 'timeupdate', 'pause', 'waiting', 'stalled', 'seeking', 'seeked', 'ended'].every((event) => wiring.includes(`removeEventListener('${event}'`)))
check('autoplay bootstrap requires decoded future data', /!el\.paused && !el\.ended && !el\.seeking && el\.readyState >= 3/.test(wiring))
check('caller requires Web Locks and shared localStorage', wiring.includes('navigator.locks') && wiring.includes('localStorage.getItem') && wiring.includes('localStorage.setItem'))
check('player remains autoplay with native controls', /controls/.test(player) && /autoPlay/.test(player) && /playsInline/.test(player))
const analyticsSource = readFileSync(join(root, 'lib/analytics.ts'), 'utf8')
const closedStart = analyticsSource.indexOf('export async function trackClosedEvent')
const closedBody = analyticsSource.slice(closedStart, analyticsSource.indexOf('\n}', closedStart) + 2)
check('caller uses privacy-closed analytics sink', wiring.includes('trackClosedEvent(RESULT_VIDEO_VALUE_SAMPLED_EVENT'))
check('closed sink does not merge stored UTMs', closedStart >= 0 && !closedBody.includes('storedUtms') && !closedBody.includes('captureUtmsOnce'))

if (failed > 0) { console.error(`\n${failed}/${total} checks failed`); process.exit(1) }
console.log(`PASS ${total}/${total}`)
