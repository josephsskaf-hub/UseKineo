// KINEO-ADMIN-LEVE-2310 — private, bounded cache per warm server instance.
// No HTTP/CDN caching: every request must still pass the administrator check.
// The TTL starts when a complete snapshot succeeds. Concurrent misses share it;
// rejected refreshes are never cached and never serve an expired snapshot.
export function createLiveCache<T>(ttlMs = 60_000) {
  let cached: { value: T; expiresAt: number } | undefined
  let inFlight: Promise<T> | undefined

  return {
    get(load: () => Promise<T>): Promise<T> {
      if (cached && Date.now() < cached.expiresAt) return Promise.resolve(cached.value)
      if (inFlight) return inFlight
      inFlight = Promise.resolve().then(load).then((value) => {
        cached = { value, expiresAt: Date.now() + ttlMs }
        return value
      }).finally(() => { inFlight = undefined })
      return inFlight
    },
  }
}
