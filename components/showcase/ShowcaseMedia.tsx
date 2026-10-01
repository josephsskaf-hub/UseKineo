'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { shouldPlayShowcasePreview, type PreviewIntent } from '@/lib/showcasePlayback'
import type { ShowcaseItem } from '@/lib/showcase'
import type { ShowcaseCopy } from '@/lib/showcaseCopy'

export default function ShowcaseMedia({ item, title, copy }: { item: ShowcaseItem; title: string; copy: ShowcaseCopy }) {
  const frame = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)
  const [documentVisible, setDocumentVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(true)
  const [saveData, setSaveData] = useState(false)
  const [intent, setIntent] = useState<PreviewIntent>('auto')
  const [playing, setPlaying] = useState(false)
  const [reveal, setReveal] = useState(50)
  const [manualReveal, setManualReveal] = useState(false)
  const play = shouldPlayShowcasePreview({ visible, documentVisible, reducedMotion, saveData, intent })

  useEffect(() => {
    const target = frame.current
    if (!target) return
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const preferences = () => setReducedMotion(motion.matches)
    const visibility = () => setDocumentVisible(document.visibilityState === 'visible')
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    setSaveData(connection?.saveData === true)
    preferences(); visibility()
    motion.addEventListener('change', preferences)
    document.addEventListener('visibilitychange', visibility)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25), { threshold: [0, 0.25] })
    observer.observe(target)
    return () => {
      observer.disconnect()
      motion.removeEventListener('change', preferences)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  useEffect(() => {
    const element = video.current
    if (!element) return
    let alive = true
    if (play) {
      // Source attached only when visible; no master URL or background downloads.
      element.play().catch(() => { if (alive) setPlaying(false) })
    } else element.pause()
    return () => { alive = false; element.pause() }
  }, [play, item.video])

  const moving = item.video ? playing : play && !manualReveal
  return <div ref={frame} className={`sc-media${item.before ? ' sc-comparison' : ''}`} data-playing={moving}>
    {item.video ? <video ref={video} src={play ? item.video : undefined} poster={item.poster}
      muted loop playsInline preload="none" aria-label={`${copy.preview}: ${title}`}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setPlaying(false)} /> : <>
      <Image src={item.after!} alt={`${copy.after}: ${title}`} fill unoptimized sizes="(max-width: 800px) 90vw, 60vw" />
      <div className="sc-before" style={{ '--reveal': `${reveal}%`, animationPlayState: moving ? 'running' : 'paused' } as CSSProperties}
        data-manual={manualReveal || reducedMotion}>
        <Image src={item.before!} alt={`${copy.before}: ${title}`} fill unoptimized sizes="(max-width: 800px) 90vw, 60vw" />
      </div>
      <span className="kps-tag l">{copy.before}</span><span className="kps-tag r">{copy.after}</span>
    </>}
    <span className="sc-preview-tag">{copy.preview}</span>
    <div className="sc-media-controls">
      {item.before && <input type="range" data-showcase-action="compare" min="0" max="100" value={reveal} aria-label={copy.reveal} dir="ltr"
        onChange={event => { setReveal(Number(event.target.value)); setManualReveal(true); setIntent('pause') }} />}
      <button type="button" data-showcase-action="preview" aria-label={moving ? copy.pause : copy.play} onClick={() => {
        if (item.before) setManualReveal(false)
        setIntent(moving ? 'pause' : 'play')
      }}>{moving ? 'Ⅱ' : '▶'}</button>
    </div>
  </div>
}
