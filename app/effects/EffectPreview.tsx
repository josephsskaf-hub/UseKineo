'use client'
import { useEffect, useRef, useState } from 'react'

export default function EffectPreview({ video, poster, label }: { video: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let intersects = false
    const update = () => setVisible(intersects && document.visibilityState === 'visible')
    const observer = new IntersectionObserver(entries => { intersects = entries[0]?.isIntersecting ?? false; update() }, { threshold: 0.15 })
    observer.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!visible) { el.pause(); return }
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    if (!saveData && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) void el.play().catch(() => {})
  }, [visible, video])
  return <video ref={ref} src={visible ? video : undefined} poster={poster} aria-label={label} muted loop playsInline controls preload="none" />
}
