const motionPreference = () => matchMedia('(prefers-reduced-motion: reduce)')
const film = { poster: '/screening-room/lituya-h3.webp', texture: '/screening-room/lituya-h3.mp4' }

// The particle print fits 27 characters. Follow the edit position while Generate keeps the complete draft.
function wordsAtCursor(field) {
  const prefix = field.value.slice(0, field.selectionEnd ?? field.value.length)
  return Array.from(prefix.trim() || field.value.trim()).slice(-27).join('')
}

// The lifecycle element releases the GPU and media when React navigates away.
export function mountProjection(owner, field) {
  if (!field.value.trim() || motionPreference().matches) {
    delete owner.dataset.requested
    return
  }
  const tag = 'kineo-film-projection'
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {
      disconnectedCallback() { this.controller?.abort() }
    })
  }
  const lifecycle = document.createElement(tag)
  lifecycle.hidden = true
  lifecycle.controller = new AbortController()
  owner.append(lifecycle)
  void projectIdea(field, lifecycle.controller.signal)
}

async function projectIdea(field, pageSignal) {
  const box = field.closest('.ksx-box')
  const motion = motionPreference()
  if (!box || pageSignal.aborted || motion.matches || !field.value.trim()) return

  const controller = new AbortController()
  const { signal } = controller
  const panel = document.createElement('section')
  panel.setAttribute('aria-label', 'Words into frames')
  panel.dataset.studioFilmProjection = ''
  const shadow = panel.attachShadow({ mode: 'open' })
  shadow.innerHTML = `<style>
    :host { display:block; order:2; margin-top:12px; color:var(--text); }
    :host([hidden]) { display:none; }
    section { border:1px solid var(--border); border-radius:16px; overflow:hidden; background:var(--card); }
    header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:6px 12px; }
    strong { font-family:inherit; font-size:13px; font-weight:700; line-height:1.3; }
    button { color:var(--text); background:transparent; border:0; cursor:pointer; font:inherit; font-size:12px; min-height:32px; padding:4px 8px; }
    button:focus-visible { outline:2px solid currentColor; }
    .projection { position:relative; isolation:isolate; height:clamp(134px,22vh,220px); overflow:hidden;
      background:radial-gradient(ellipse at 50% 42%,#433a56,#242333 60%,#161824); }
    canvas { display:block; width:100%; height:100%; }
    figcaption { position:absolute; left:10px; bottom:6px; pointer-events:none; font:600 10px/1.4 system-ui,sans-serif;
      color:#f7f5ed; background:#141321bb; padding:2px 5px; border-radius:3px; }
    figure { margin:0; position:relative; }
  </style><section><header><strong>Words into frames</strong><button type="button">Hide preview</button></header>
    <figure><div class="projection" aria-hidden="true"></div><figcaption>Lituya Bay · Kineo film</figcaption></figure></section>`
  const host = shadow.querySelector('.projection')
  let session
  let timer
  let sampling
  let value = field.value
  let visible = false
  const changed = new MutationObserver(syncWords)
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    resetSample()
  })
  function stop() {
    if (signal.aborted) return
    controller.abort()
    pageSignal.removeEventListener('abort', stop)
    clearTimeout(timer)
    clearInterval(sampling)
    changed.disconnect()
    visibility.disconnect()
    panel.remove()
  }
  pageSignal.addEventListener('abort', stop, { once: true })
  motion.addEventListener('change', () => { if (motion.matches) stop() }, { signal })
  shadow.querySelector('button').addEventListener('click', () => { stop(); field.focus({ preventScroll: true }) }, { signal })

  // Compile out of flow. Unsupported graphics and failed initialization leave the original layout intact.
  panel.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
  panel.style.width = box.clientWidth + 'px'
  box.after(panel)
  let sample
  function resetSample() { sample = null }
  function checkRate() {
    if (!visible || document.hidden || panel.hidden) { resetSample(); return }
    const frames = Number(host.dataset.frames || 0)
    const now = performance.now()
    if (!sample) { sample = { now, frames }; return }
    const elapsed = now - sample.now
    if (elapsed < 3000) return
    const fps = (frames - sample.frames) * 1000 / elapsed
    const floor = matchMedia('(max-width: 767px)').matches ? 30 : 60
    // Compare whole frames/s so a 59.94 Hz display can meet the 60 fps target.
    if (Math.round(fps) < floor) stop()
    else sample = { now, frames }
  }
  function syncWords() {
    if (!session || signal.aborted || field.value === value) return
    value = field.value
    clearTimeout(timer)
    const hidden = !value.trim()
    if (hidden !== panel.hidden) {
      panel.hidden = hidden
      session.pause(hidden)
      resetSample()
    }
    if (hidden) return
    timer = setTimeout(() => session.words(wordsAtCursor(field)), 120)
  }
  try {
    const { enter } = await import('./scene.js')
    if (signal.aborted) return
    session = await enter({ host, kind: 'b', films: [film], initial: 0, idea: wordsAtCursor(field),
      select() {}, open() {}, fail: stop, signal })
    if (signal.aborted) return
    value = field.value
    session.words(wordsAtCursor(field))
    panel.hidden = !value.trim()
    session.pause(panel.hidden)
    panel.removeAttribute('style')
    // React's controlled textarea reflects programmatic example choices in its default text as well.
    changed.observe(field, { childList: true, characterData: true, subtree: true })
    field.addEventListener('input', syncWords, { signal })
    visibility.observe(host)
    document.addEventListener('visibilitychange', resetSample, { signal })
    sampling = setInterval(checkRate, 250)
  } catch { stop() }
}
