import assert from 'node:assert/strict'
import { read, ts } from './upsell-filme15-harness-2610.mjs'

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
const effect = (source, begin, end) => {
  const start = source.indexOf(begin), finish = source.indexOf(end, start)
  assert.ok(start >= 0 && finish >= 0, 'actual React effect anchors exist')
  return compile(source.slice(start, finish + end.length))
}

export async function film15UiFixtures() {
  const watched = effect(read('app/(dashboard)/generate/GenerateClient.tsx'), '  useEffect(() => {\n    const evidence = film15PlaybackEvidenceRef.current', '}, [film15PlaybackTick, fullVersionOfferEligible, publicVideoId, phase, finalVideoUrl])')
  const run = new Function('useEffect', 'film15PlaybackEvidenceRef', 'fullVersionOfferEligible', 'publicVideoId', 'generationAttemptRef', 'navigator', 'FILM_COMPLETE_VERSION', 'film15WatchAttemptsRef', 'localStorage', 'trackClosedEvent', 'FILM_COMPLETE_TARGET_SECONDS', 'setTimeout', 'clearTimeout', 'setFilm15PlaybackTick', 'film15PlaybackTick', 'phase', 'finalVideoUrl', watched)
  const id = '00000000-0000-4000-8000-000000000001', store = new Map(), events = [], promises = [], timers = [], cleanups = []
  const attempts = { current: { key: '', count: 0 } }, sample = { current: { attempt_id: 'attempt1', threshold_seconds: 5, duration_bucket: 'under_35s' } }
  function scene(eligible = true, attemptId = 'attempt1') {
    run(fn => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup) }, sample, eligible, id, { current: attemptId },
      { locks: { request: (_name, fn) => { const promise = Promise.resolve().then(fn); promises.push(promise); return promise } } },
      'upsell_filme15_2610_v1', attempts, { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) },
      async (name, metadata) => { events.push({ name, metadata }); return 'stored' }, 35,
      fn => { timers.push(fn); return timers.length }, () => {}, () => {}, 1, 'done', 'https://example.test/film.mp4')
  }
  scene(false); await Promise.all(promises)
  assert.equal(events.length, 0, 'unresolved profile does not fabricate a watch')
  scene(true); await Promise.all(promises)
  assert.equal(events.length, 1, 'late source/profile hydration preserves the real playback evidence')
  assert.equal(events[0].metadata.source_video_id, id)
  assert.equal(events[0].metadata.threshold_seconds, 5)
  scene(true); await Promise.all(promises)
  assert.equal(events.length, 1, 'rerender does not duplicate watched person/film evidence')
  store.clear(); scene(true, 'another-attempt'); await Promise.all(promises)
  assert.equal(events.length, 1, 'old playback cannot leak into another generation attempt')
  sample.current = { attempt_id: 'attempt1', threshold_seconds: 4 }; scene(true); await Promise.all(promises)
  assert.equal(events.length, 1, 'less than five seconds is not accepted')
  cleanups.forEach(fn => fn())

  const postPay = effect(read('app/film-complete/page.tsx'), '  useEffect(() => {\n    setStatus(null)', '}, [intentId, cancelled, retry])')
  const execute = new Function('useEffect', 'intentId', 'cancelled', 'retry', 'setStatus', 'setNeedsLogin', 'setNetworkError', 'STATES', 'fetch', 'AbortController', 'Date', 'setTimeout', 'clearTimeout', postPay)
  const flush = () => new Promise(resolve => setImmediate(resolve)), statusTimers = new Map(), states = [], signals = []
  let timerId = 0, gets = 0, posts = 0, cleanup
  const fakeFetch = (url, init) => {
    signals.push(init.signal)
    if (url.endsWith('/start')) { posts++; return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Error('aborted')))) }
    gets++; return Promise.resolve({ status: 200, ok: true, json: async () => ({ intentId: id, state: 'starting' }) })
  }
  execute(fn => { cleanup = fn() }, id, false, 0, value => states.push(value), () => {}, () => {}, new Set(['awaiting_payment', 'waiting_entitlement', 'starting', 'processing', 'completed', 'failed', 'unavailable']), fakeFetch, AbortController, Date,
    (fn, ms) => { const n = ++timerId; statusTimers.set(n, { fn, ms }); return n }, n => statusTimers.delete(n))
  await flush(); await flush()
  const poll = [...statusTimers.values()].find(timer => timer.ms === 3000)
  assert.ok(poll, 'slow launch never blocks the three-second status poll')
  assert.equal(gets, 1); assert.equal(posts, 1)
  poll.fn(); await flush(); await flush()
  assert.equal(gets, 2)
  assert.equal(posts, 1, 'second status poll does not overlap the in-flight launch')
  cleanup(); await flush()
  assert.ok(signals.some(signal => signal.aborted), 'unmount aborts outstanding requests')
  let checks404 = 0, cleanup404; const timers404 = new Map()
  execute(fn => { cleanup404 = fn() }, id, false, 0, value => states.push(value), () => {}, () => {}, new Set(['unavailable']), async () => { checks404++; return { status: 404, ok: false } }, AbortController, Date,
    (fn, ms) => { const n = ++timerId; timers404.set(n, { fn, ms }); return n }, n => timers404.delete(n))
  await flush(); await flush()
  assert.equal(checks404, 1)
  assert.equal(states.at(-1)?.state, 'unavailable')
  assert.equal([...timers404.values()].some(timer => timer.ms === 3000), false, 'missing/foreign intent stops polling')
  cleanup404()
}
