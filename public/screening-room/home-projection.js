// Leave the original link, copy, poster and video mounted. The decorative layer never owns a click.
export async function projectHome(root, placement, pageSignal) {
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
  field.placeholder = 'Type a phrase to see it in film'
  field.setAttribute('aria-label', 'Animate a phrase in the film preview')
  field.autocomplete = 'off'
  let debounce, monitor, sample, inView = false
  const visibility = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sample = undefined })
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
    caption.textContent = 'Lituya Bay · MiniMax H3'
    stage.append(caption)
    head.insertBefore(field, head.querySelector('.k3c-more'))
    field.addEventListener('input', () => {
      clearTimeout(debounce)
      debounce = setTimeout(() => session.words(Array.from(field.value.trim()).slice(-27).join('') || 'Lituya Bay'), 140)
    }, { signal })
    visibility.observe(stage)
    document.addEventListener('visibilitychange', () => { sample = undefined }, { signal })
    // Below a sustained 24 fps, expose the original card or its poster. A 30 Hz laptop stays animated.
    monitor = setInterval(() => {
      if (!inView || document.hidden) { sample = undefined; return }
      const now = performance.now(), frames = Number(stage.dataset.frames || 0)
      if (!sample) { sample = { now, frames }; return }
      if (now - sample.now < 4000) return
      if ((frames - sample.frames) * 1000 / (now - sample.now) < 24) clear()
      else sample = { now, frames }
    }, 500)
  } catch { clear() }
}
