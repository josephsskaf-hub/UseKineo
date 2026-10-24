// KINEO-CARDS-GIRO-2410 — two persistent buffers; only an ended event requests another clip.
import type { HomeCardClip } from './homeThreeCards'

export function attachHomeCardPlayback(root: HTMLElement, clips: readonly HomeCardClip[]): () => void {
  const videos = Array.from(root.querySelectorAll<HTMLVideoElement>('video'))
  if (videos.length !== 2 || !clips.length) return () => {}
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  let visible = false
  let disposed = false
  let active = 0
  let clipIndex = 0
  let pending: number | null = null
  let fading = false
  const failed = new Set<number>()
  const assigned: (number | null)[] = [null, null]
  const allowed = () => !disposed && visible && !motion?.matches && !document.hidden
  const pause = () => videos.forEach((video) => video.pause())
  const play = (slot: number) => {
    if (allowed()) void videos[slot].play().catch(() => { /* Keep the poster / last good frame. */ })
  }
  const nextIndex = () => {
    for (let offset = 1; offset < clips.length; offset++) {
      const index = (clipIndex + offset) % clips.length
      if (!failed.has(index)) return index
    }
    return clipIndex
  }
  const assign = (slot: number, index: number, next: boolean) => {
    const video = videos[slot]
    const clip = clips[index]
    video.pause()
    video.removeAttribute('data-on')
    video.style.zIndex = '0'
    video.style.setProperty('--home-clip-position', clip.objectPosition)
    video.style.setProperty('--home-clip-mobile-position', clip.mobileObjectPosition ?? clip.objectPosition)
    video.style.setProperty('--home-clip-fit', clip.objectFit ?? 'cover')
    video.style.setProperty('--home-clip-scale', String(clip.scale ?? 1))
    video.poster = clip.poster
    video.preload = next ? 'auto' : 'none'
    assigned[slot] = index
    video.src = clip.src
    video.load()
  }
  const prepareNext = () => {
    if (!allowed() || fading || pending !== null) return
    const index = nextIndex()
    if (index !== clipIndex && assigned[1 - active] !== index) assign(1 - active, index, true)
  }
  const advance = () => {
    if (!allowed() || pending !== null || fading) return
    const next = 1 - active
    const index = nextIndex()
    if (index === clipIndex) {
      if (!failed.has(clipIndex)) { videos[active].currentTime = 0; play(active) }
      return
    }
    if (assigned[next] !== index) assign(next, index, true)
    pending = next
    play(next)
  }
  const reset = () => {
    pause()
    active = 0
    clipIndex = 0
    pending = null
    fading = false
    failed.clear()
    videos.forEach((video, slot) => {
      assigned[slot] = null
      video.removeAttribute('data-on')
      video.removeAttribute('src')
      video.preload = 'none'
      video.load()
    })
  }
  const sync = () => {
    if (motion?.matches) { reset(); return }
    if (!allowed()) { pause(); return }
    if (assigned[active] === null) assign(active, clipIndex, false)
    play(pending ?? active)
    if (videos[active].hasAttribute('data-on')) prepareNext()
  }
  const listeners = videos.map((video, slot) => {
    const onPlaying = () => {
      if (!allowed()) { video.pause(); return }
      if (pending === slot) {
        videos[active].style.zIndex = '1'
        video.style.zIndex = '2'
        active = slot
        clipIndex = assigned[slot]!
        pending = null
        fading = true
        // The outgoing buffer retains its final frame until this opacity transition finishes.
        video.setAttribute('data-on', '')
      } else if (slot === active) {
        video.style.zIndex = '1'
        video.setAttribute('data-on', '')
        if (assigned[1 - active] === null) prepareNext()
      } else video.pause()
    }
    const onEnded = () => { if (slot === active) advance() }
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== video || event.propertyName !== 'opacity' || slot !== active || !fading) return
      const old = videos[1 - active]
      old.pause()
      old.removeAttribute('data-on')
      old.style.zIndex = '0'
      assigned[1 - active] = null
      fading = false
      prepareNext()
      if (video.ended) advance()
    }
    const onError = () => {
      const index = assigned[slot]
      if (index === null) return
      failed.add(index)
      if (slot === pending) { pending = null; advance() }
      // A bad hidden preview is skipped; a bad current preview leaves the SSR poster visible.
    }
    video.addEventListener('playing', onPlaying)
    video.addEventListener('ended', onEnded)
    video.addEventListener('transitionend', onTransitionEnd)
    video.addEventListener('error', onError)
    return () => {
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('transitionend', onTransitionEnd)
      video.removeEventListener('error', onError)
    }
  })
  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.3)
    sync()
  }, { threshold: 0.3 })
  if (observer) observer.observe(root)
  else { visible = true; sync() }
  motion?.addEventListener?.('change', sync)
  document.addEventListener('visibilitychange', sync)
  return () => {
    disposed = true
    observer?.disconnect()
    motion?.removeEventListener?.('change', sync)
    document.removeEventListener('visibilitychange', sync)
    listeners.forEach((remove) => remove())
    reset()
  }
}
