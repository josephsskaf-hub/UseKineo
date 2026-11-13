import { clipeNovoPoster } from '@/lib/clipesNos2Lugares'

/** Approved static previews from 36f9f2309. Originals and downloads remain intact. */
export const WATCH_PREVIEW_MAP: Readonly<Record<string, string>> = Object.freeze({
  '/previews/home-clean-sep24/castle.mp4': '/previews/leve-1111/castle.mp4',
  '/previews/home-clean-sep24/lituya-h3.mp4': '/previews/leve-1111/lituya-h3.mp4',
  '/previews/home-clean-sep24/volcano-scene.mp4': '/previews/leve-1111/volcano-scene.mp4',
  '/previews/home-clean-sep24/robot-action.mp4': '/previews/leve-1111/robot-action.mp4',
  '/previews/home-clean-sep24/lighthouse-scene.mp4': '/previews/leve-1111/lighthouse-scene.mp4',
  '/previews/home-clean-sep24/tunguska-globe.mp4': '/previews/leve-1111/tunguska-globe.mp4',
  '/previews/efeito-pet_xmas_angel.mp4': '/previews/leve-1111/efeito-pet_xmas_angel.mp4',
  '/previews/efeito-pet_bee.mp4': '/previews/leve-1111/efeito-pet_bee.mp4',
  '/previews/studio-kling4-werewolf-kid.mp4': '/previews/leve-1111/studio-kling4-werewolf-kid.mp4',
  '/previews/motion-surf-0611.mp4': '/previews/leve-1111/motion-surf-0611.mp4',
  '/previews/efeito-pet_lion.mp4': '/previews/leve-1111/efeito-pet_lion.mp4',
  '/previews/efeito-snow_globe.mp4': '/previews/leve-1111/efeito-snow_globe.mp4',
  '/previews/efeito-kiss.mp4': '/previews/leve-1111/efeito-kiss.mp4',
  '/previews/motion-rua-0611.mp4': '/previews/leve-1111/motion-rua-0611.mp4',
  '/previews/motion-manta-0611.mp4': '/previews/leve-1111/motion-manta-0611.mp4',
  '/previews/motion-horse-0611.mp4': '/previews/leve-1111/motion-horse-0611.mp4',
  '/previews/motion-neve-0611.mp4': '/previews/leve-1111/motion-neve-0611.mp4',
  '/previews/efeito-pet_xmas_tree.mp4': '/previews/leve-1111/efeito-pet_xmas_tree.mp4',
  '/previews/motion-eagle-0611.mp4': '/previews/leve-1111/motion-eagle-0611.mp4',
  '/previews/efeito-santa_cartoon.mp4': '/previews/leve-1111/efeito-santa_cartoon.mp4',
  '/previews/efeito-giant_product.mp4': '/previews/leve-1111/efeito-giant_product.mp4',
  '/previews/galeria/pebble-castle.mp4': '/previews/leve-1111/pebble-castle.mp4',
  '/previews/galeria/wizard-cat.mp4': '/previews/leve-1111/wizard-cat.mp4',
  '/previews/efeito-hug.mp4': '/previews/leve-1111/efeito-hug.mp4',
})

/** Preserve unknown media and attribution/query/hash; never invent a lighter new-top file. */
export function watchPreviewSrc(src: string): string {
  const boundary = src.search(/[?#]/)
  const path = boundary < 0 ? src : src.slice(0, boundary)
  const suffix = boundary < 0 ? '' : src.slice(boundary)
  return (WATCH_PREVIEW_MAP[path] ?? path) + suffix
}

/** Keep the canonical poster for a new clip; legacy callers supply their current poster. */
export function watchPosterSrc(src: string, poster?: string): string | undefined {
  if (poster) return poster
  const match = src.match(/^\/previews\/galeria\/([^/?#]+)\.mp4(?:[?#].*)?$/)
  return match ? clipeNovoPoster({ id: match[1] }) : undefined
}

export type WatchPlaybackState = { playing: boolean; canPlay: boolean }
export type WatchMediaController = { requestPlay: () => void; setPaused: (paused: boolean) => void; destroy: () => void }
type NetworkPolicy = EventTarget & { saveData?: boolean; effectiveType?: string }
const mediaOwners = new WeakMap<HTMLVideoElement, object>()

/**
 * Browser-only controller, invoked by a component effect. No video source exists
 * before >=60% intersection. Leaving/policy changes unload it instead of merely
 * pausing. Poster loading remains the separate native image policy.
 */
export function createWatchMediaController(
  box: Element,
  video: HTMLVideoElement,
  src: string,
  onState: (state: WatchPlaybackState) => void = () => {},
  initialPaused = false,
): WatchMediaController {
  const pageDocument = document
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const connection = (navigator as Navigator & { connection?: NetworkPolicy }).connection
  const resolvedSrc = watchPreviewSrc(src)
  const owner = {}
  mediaOwners.set(video, owner)
  let visible = false
  let destroyed = false
  let sequence = 0
  let playing = false
  let manuallyPaused = initialPaused

  video.preload = 'none'
  video.muted = true
  video.defaultMuted = true
  video.loop = true
  video.playsInline = true

  const allowed = () => visible && !manuallyPaused && !pageDocument.hidden && !motion.matches
    && !connection?.saveData && !(connection?.effectiveType ?? '').includes('2g')
  const notify = (playing: boolean, canPlay: boolean) => {
    if (!destroyed && mediaOwners.get(video) === owner) onState({ playing, canPlay })
  }
  const unload = () => {
    if (mediaOwners.get(video) !== owner) return
    playing = false
    video.pause()
    if (video.getAttribute('src') !== null) {
      video.removeAttribute('src')
      video.load()
    }
  }
  const requestPlay = () => {
    if (destroyed) return
    if (!allowed()) {
      sequence++
      unload()
      notify(false, false)
      return
    }
    if (video.getAttribute('src') !== resolvedSrc) {
      video.setAttribute('src', resolvedSrc)
      video.load()
    }
    video.muted = true
    const attempt = ++sequence
    let result: Promise<void> | void
    try {
      result = video.play()
    } catch {
      video.pause()
      notify(false, true)
      return
    }
    Promise.resolve(result).then(() => {
      if (mediaOwners.get(video) !== owner) return
      // A late play promise must not resurrect media after exit or unmount.
      if (destroyed || !allowed()) {
        unload()
        return
      }
      // Do not pause a newer valid play when an older attempt settles.
      if (attempt === sequence) {
        playing = true
        notify(true, true)
      }
    }, () => {
      if (!destroyed && attempt === sequence) {
        video.pause()
        notify(false, allowed())
      }
    })
  }
  const sync = () => {
    if (destroyed) return
    if (!allowed()) {
      sequence++
      unload()
      notify(false, false)
      return
    }
    if (video.getAttribute('src') === resolvedSrc && playing && !video.paused) {
      notify(true, true)
      return
    }
    requestPlay()
  }
  const observer = typeof IntersectionObserver === 'undefined' ? null
    : new IntersectionObserver((entries) => {
      const entry = entries.find(item => item.target === box)
      if (!entry) return
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.6
      sync()
    }, { rootMargin: '0px', threshold: [0, 0.6] })

  observer?.observe(box)
  pageDocument.addEventListener('visibilitychange', sync)
  motion.addEventListener('change', sync)
  connection?.addEventListener('change', sync)
  notify(false, false)

  return {
    requestPlay,
    setPaused(paused) {
      if (destroyed) return
      manuallyPaused = paused
      sync()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      sequence++
      observer?.disconnect()
      pageDocument.removeEventListener('visibilitychange', sync)
      motion.removeEventListener('change', sync)
      connection?.removeEventListener('change', sync)
      unload()
      if (mediaOwners.get(video) === owner) mediaOwners.delete(video)
    },
  }
}
