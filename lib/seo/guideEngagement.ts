// KINEO-GUIAS-MEDICAO-1011: fixed observation cohort; no content, layout or offer changes.
export const GUIDE_MEASUREMENT_VERSION = 'guides_20261113_v2'
export const MEASURED_GUIDE_PATHS: readonly string[] = [
  '/guides/ai-product-video-accuracy', '/guides/ai-dropshipping-video-ads',
  '/guides/ai-personal-care-product-ads', '/guides/ai-clothing-brand-video',
  '/guides/ai-tech-product-ads', '/guides/elevenlabs-alternatives-narrated-video',
  '/guides/multilingual-video-narration', '/guides/weekly-video-ads-approval',
]
const DEPTHS = [25, 50, 75, 100] as const
const TIME_CHECKPOINTS = [15, 30, 60, 120, 300, 600, 1200, 1800] as const
type Emit = (name: string, metadata: Record<string, unknown>, path: string) => unknown
type Visit = {
  path: string; id: string; viewed: boolean; active: boolean; since: number; visibleMs: number
  depths: Set<number>; clicked: boolean; reportedMs: number; checkpoint: number
}
// React Strict Mode keeps the same DOM root during its effect replay. Retain only
// that root's visit; a real remount/new document gets a new visit, not a new person.
const visits = new WeakMap<HTMLElement, Visit>()

export function attachGuideEngagement(root: HTMLElement, path: string, emit: Emit, win: Window, doc: Document): () => void {
  if (!MEASURED_GUIDE_PATHS.includes(path) || win.location.pathname !== path) return () => {}
  const now = () => win.performance.now()
  const foreground = () => doc.visibilityState === 'visible' && doc.hasFocus()
  let visit = visits.get(root)
  if (!visit || visit.path !== path) {
    visit = { path, id: win.crypto.randomUUID(), viewed: false, active: false, since: now(), visibleMs: 0,
      depths: new Set(), clicked: false, reportedMs: 0, checkpoint: 0 }
    visits.set(root, visit)
  }
  const state = visit
  const sample = () => {
    const t = now()
    if (state.active) state.visibleMs += Math.max(0, t - state.since)
    state.since = t
    state.active = foreground()
  }
  const send = (name: string, fields: Record<string, unknown>) => {
    try {
      // No prompts, link query strings or free-form page content. The existing
      // collector supplies the session, real attribution and server bot label.
      const result = emit(name, { measurement_version: GUIDE_MEASUREMENT_VERSION, visit_id: state.id,
        source: `guide_${path.split('/').pop()}`, visible_ms: Math.floor(state.visibleMs), ...fields }, path)
      void Promise.resolve(result).catch(() => {})
    } catch { /* best effort; never break reading or navigation */ }
  }
  const startView = () => {
    if (!state.viewed && foreground()) {
      state.viewed = true
      send('guide_page_viewed', { viewport_height: win.innerHeight })
    }
  }
  const checkDepth = () => {
    if (!foreground()) return
    const scrollingElement = doc.scrollingElement || doc.documentElement
    const body = doc.body
    // Global mobile CSS can make body an independent scroll container while
    // scrollingElement stays html and window.scrollY remains zero.
    const bodyOverflow = body && win.getComputedStyle(body).overflowY
    const metrics = body && body !== scrollingElement && body.clientHeight > 0
      && body.scrollHeight > body.clientHeight && (bodyOverflow === 'auto' || bodyOverflow === 'scroll')
      ? { scrollHeight: body.scrollHeight, viewportHeight: body.clientHeight, top: body.scrollTop, scrollRoot: 'body' }
      : { scrollHeight: scrollingElement.scrollHeight, viewportHeight: win.innerHeight, top: win.scrollY, scrollRoot: 'document' }
    const { scrollHeight, viewportHeight, top, scrollRoot } = metrics
    const maxScroll = scrollHeight - viewportHeight
    if (maxScroll <= 0) return // a non-scrollable page is not four scroll events
    const percent = (top + 2 >= maxScroll) ? 100 : Math.max(0, top / maxScroll * 100)
    for (const depth of DEPTHS) {
      if (percent < depth || state.depths.has(depth)) continue
      state.depths.add(depth)
      send('guide_scroll_depth', { depth_percent: depth, scroll_height: scrollHeight, viewport_height: viewportHeight, scroll_root: scrollRoot })
    }
  }
  const flush = (reason: string) => {
    const ms = Math.floor(state.visibleMs)
    if (!state.viewed || ms <= state.reportedMs) return
    state.reportedMs = ms
    send('guide_visible_time', { reason }) // cumulative: aggregate MAX, never SUM
  }
  const onScroll = () => { sample(); startView(); checkDepth() }
  const onElementScroll = (event: Event) => {
    // Element scroll does not bubble. Capture only page roots; horizontal
    // tables and other nested scrollers must not become article depth.
    if (event.target === doc.body || event.target === doc.documentElement) onScroll()
  }
  const onVisibility = () => {
    sample(); startView(); checkDepth()
    if (!foreground()) flush('hidden_or_blurred')
  }
  const onPageHide = () => { sample(); state.active = false; flush('pagehide') }
  const onPageShow = () => { sample(); startView(); checkDepth() }
  const onClick = (event: MouseEvent) => {
    if (!event.isTrusted || !foreground() || state.clicked) return
    const first = root.querySelector('.kc-hero .kc-cta')
    if (!first || !event.target || !first.contains(event.target as Node)) return
    sample(); startView(); state.clicked = true
    send('guide_first_cta_clicked', { placement: 'hero' })
  }
  sample(); startView(); checkDepth()
  win.addEventListener('scroll', onScroll, { passive: true })
  doc.addEventListener('scroll', onElementScroll, { capture: true, passive: true })
  win.addEventListener('resize', onScroll)
  win.addEventListener('focus', onVisibility)
  win.addEventListener('blur', onVisibility)
  win.addEventListener('pagehide', onPageHide)
  win.addEventListener('pageshow', onPageShow)
  doc.addEventListener('visibilitychange', onVisibility)
  root.addEventListener('click', onClick, true)
  const timer = win.setInterval(() => {
    sample(); startView()
    if (!foreground()) return
    const checkpoint = TIME_CHECKPOINTS.filter(s => state.visibleMs >= s * 1000).pop() || 0
    if (checkpoint > state.checkpoint) { state.checkpoint = checkpoint; flush('checkpoint') }
  }, 5000)
  return () => {
    sample(); state.active = false; flush('unmount')
    win.clearInterval(timer)
    win.removeEventListener('scroll', onScroll)
    doc.removeEventListener('scroll', onElementScroll, true)
    win.removeEventListener('resize', onScroll)
    win.removeEventListener('focus', onVisibility)
    win.removeEventListener('blur', onVisibility)
    win.removeEventListener('pagehide', onPageHide)
    win.removeEventListener('pageshow', onPageShow)
    doc.removeEventListener('visibilitychange', onVisibility)
    root.removeEventListener('click', onClick, true)
  }
}
