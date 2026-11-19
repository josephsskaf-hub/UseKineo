// Leave the original link, copy, poster and video mounted. The decorative layer never owns a click.
export function projectHome(root, placement, pageSignal, publicHome = false) {
  return mountProjection(root, placement, pageSignal, publicHome, publicHome)
}

// Count only time when the visitor can actually see the card.
function waitForRecovery(card, pageSignal, retry) {
  let remaining = 8000
  let started = null
  let timer
  let inView = false
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    sync()
  })
  function stop() {
    clearTimeout(timer)
    observer.disconnect()
    document.removeEventListener('visibilitychange', sync)
    pageSignal.removeEventListener('abort', stop)
  }
  function resume() {
    if (pageSignal.aborted || document.hidden || !inView) { sync(); return }
    stop()
    retry()
  }
  function sync() {
    if (started !== null) {
      remaining = Math.max(0, remaining - (performance.now() - started))
      started = null
      clearTimeout(timer)
    }
    if (pageSignal.aborted || document.hidden || !inView) return
    started = performance.now()
    timer = setTimeout(resume, remaining)
  }
  observer.observe(card)
  document.addEventListener('visibilitychange', sync)
  pageSignal.addEventListener('abort', stop, { once: true })
}

async function mountProjection(root, placement, pageSignal, publicHome, canRetry) {
  const head = root.querySelector('.k3c-head')
  const card = root.querySelector('[data-home-card="films"]')
  const media = card?.querySelector('.k3c-media')
  if (!head || !media || pageSignal.aborted) return
  const abort = new AbortController()
  const { signal } = abort
  const stage = document.createElement('div')
  stage.className = 'hp-stage'
  stage.setAttribute('aria-hidden', 'true')
  const originalPoster = media.querySelector('img')
  const still = document.createElement('img')
  if (placement === 'a' && originalPoster) {
    still.className = 'hp-still'
    still.alt = ''
    still.src = originalPoster.currentSrc || originalPoster.src
    // Attach this original home poster only when graphics fail to finish.
  }
  const target = placement === 'a' ? head : media
  target.append(stage)
  const field = document.createElement('input')
  field.type = 'text'
  field.className = 'hp-idea'
  field.placeholder = 'Animate text in this preview'
  field.setAttribute('aria-label', 'Animate text in the Lituya Bay preview')
  field.autocomplete = 'off'
  let debounce, monitor, sample, inView = false
  // KINEO-HOME-3D-PISO-1911 [CEO]: 60 era pedido errado da CEO; tela de 60 Hz mede 59,x e a película sumia para quase todos. Piso público = 45.
  const floor = publicHome ? 45 : 24
  const windowMs = publicHome ? 3000 : 4000
  const readFrames = () => ({ now: performance.now(), frames: Number(stage.dataset.frames || 0) })
  const resetSample = () => { sample = inView && !document.hidden ? readFrames() : undefined }
  const visibility = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resetSample() })
  const clear = () => {
    abort.abort()
    visibility.disconnect()
    clearTimeout(debounce)
    clearInterval(monitor)
    stage.remove()
    field.remove()
    delete root.dataset.playing
    if (!pageSignal.aborted && placement === 'a' && originalPoster && !still.isConnected) head.prepend(still)
  }
  pageSignal.addEventListener('abort', () => { clear(); still.remove() }, { once: true })
  try {
    const { enter } = await import('./scene.js')
    if (signal.aborted) return
    const session = await enter({
      host: stage, kind: 'b', films: [{ poster: '/screening-room/lituya-h3.webp', texture: '/screening-room/lituya-h3.mp4' }],
      initial: 0, idea: 'Lituya Bay', select() {}, open() {}, fail: clear, signal,
    })
    if (signal.aborted) return
    root.dataset.playing = ''
    const caption = document.createElement('span')
    caption.className = 'hp-caption'
    caption.textContent = 'Lituya Bay sample · MiniMax H3'
    stage.append(caption)
    head.insertBefore(field, head.querySelector('.k3c-more'))
    field.addEventListener('input', () => {
      clearTimeout(debounce)
      debounce = setTimeout(() => session.words(Array.from(field.value.trim()).slice(-27).join('') || 'Lituya Bay'), 140)
    }, { signal })
    visibility.observe(stage)
    document.addEventListener('visibilitychange', resetSample, { signal })
    // Count completed scene renders only during a full visible measurement window.
    monitor = setInterval(() => {
      if (!sample) return
      const current = readFrames()
      const elapsed = current.now - sample.now
      if (elapsed < windowMs) return
      const fps = (current.frames - sample.frames) * 1000 / elapsed
      if (fps >= floor) { sample = current; return }
      clear()
      if (canRetry && !pageSignal.aborted) {
        waitForRecovery(card, pageSignal, () => mountProjection(root, placement, pageSignal, publicHome, false))
      }
    }, 100)
  } catch { clear() }
}
