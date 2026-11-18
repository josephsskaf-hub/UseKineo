'use client'

import { useEffect, useRef, useState, type VideoHTMLAttributes } from 'react'

// A neutral cover, not a frame extracted from the customer's video (no download).
const EMPTY_POSTER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 240"><rect width="180" height="240" fill="#181b20"/><path d="m77 104 28 16-28 16z" fill="#c9ced7"/></svg>')

/** No src in SSR or before visibility. Unload on exit; old clips still require Play. */
export default function VisibleClipVideo({ src, poster, autoPlay, ...props }: Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'preload'> & { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)
  const [hover, setHover] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const active = pageVisible && (visible || hover || focused)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const changed = () => setPageVisible(!document.hidden)
    changed()
    document.addEventListener('visibilitychange', changed)
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      const inView = entry.isIntersecting && entry.intersectionRatio > 0
      setVisible(inView)
      if (!inView) { setHover(false); setFocused(false) }
    }, { rootMargin: '0px', threshold: 0.01 })
    observer?.observe(el)
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', changed); el.pause() }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!active) { el.pause(); el.removeAttribute('src'); el.load(); return }
    el.load()
    if (autoPlay) void el.play().catch(() => { /* The cover remains if autoplay is blocked. */ })
  }, [active, src, autoPlay])

  return <video {...props} ref={ref} data-clip-visible-media="" data-video-src={src} src={active ? src : undefined} poster={poster || (autoPlay ? EMPTY_POSTER : undefined)} preload={active && props.controls && !autoPlay ? "metadata" : "none"} autoPlay={!!autoPlay && active}
    onPointerEnter={event => { setHover(true); props.onPointerEnter?.(event) }}
    onPointerLeave={event => { setHover(false); props.onPointerLeave?.(event) }}
    onFocus={event => { setFocused(true); props.onFocus?.(event) }}
    onBlur={event => { setFocused(false); props.onBlur?.(event) }}
    onTouchStart={event => { setHover(true); props.onTouchStart?.(event) }}
    onTouchEnd={event => { setHover(false); props.onTouchEnd?.(event) }} />
}
