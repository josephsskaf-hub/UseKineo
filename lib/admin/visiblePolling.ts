/** Admin reads stop outside a strictly visible tab and never overlap. */
export function startVisiblePolling(
  load: () => void | Promise<unknown>,
  intervalMs: number,
  options: { immediate?: boolean } = {},
): () => void {
  const delayMs = Number.isFinite(intervalMs) ? Math.max(60_000, intervalMs) : 60_000
  let timer: number | null = null
  let stopped = false
  let running = false

  const visible = () => document.visibilityState === 'visible'
  const clearTimer = () => {
    if (timer !== null) window.clearTimeout(timer)
    timer = null
  }

  const poll = async () => {
    clearTimer()
    if (stopped || !visible() || running) return
    running = true
    try {
      await load()
    } catch {
      // Clients keep their last successful data; a failed read must not stop polling.
    } finally {
      running = false
      if (!stopped && visible()) timer = window.setTimeout(() => void poll(), delayMs)
    }
  }

  const onVisibility = () => {
    clearTimer()
    if (!stopped && visible()) void poll()
  }
  document.addEventListener('visibilitychange', onVisibility)
  if (options.immediate === false) {
    // SSR-seeded panels already have data. Returning to the tab still refreshes immediately.
    if (visible()) timer = window.setTimeout(() => void poll(), delayMs)
  } else {
    void poll()
  }

  return () => {
    stopped = true
    clearTimer()
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
