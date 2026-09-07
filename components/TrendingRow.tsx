'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import type { WallVideo } from '@/lib/engineWall'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { filterShowcase, showcaseEngines, showcasePoster, showcaseScrollState, shouldPlayShowcase, SHOWCASE_COPY } from '@/lib/ui/showcaseGallery'
import styles from './TrendingRow.module.css'

// Scoped to this gallery; other landing-page media players remain unchanged.
function GalleryMedia({ video, paused, limited }: { video: WallVideo; paused: boolean; limited: boolean }) {
  const box = useRef<HTMLSpanElement>(null)
  const player = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const copy = SHOWCASE_COPY[useInterfaceLanguage()]
  const poster = showcasePoster(video)
  const allowed = shouldPlayShowcase(visible, paused, limited, failed)
  useEffect(() => {
    const element = box.current
    if (!element || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (allowed) setMounted(true)
    else player.current?.pause()
  }, [allowed])
  useEffect(() => {
    if (!allowed || !mounted) return
    const element = player.current
    element?.play().catch(() => {}) // Blocked autoplay leaves the poster and explicit preview control.
    return () => { element?.pause() }
  }, [allowed, mounted])
  return <span ref={box} className={styles.media}>
    {poster && !posterFailed && <img src={poster} alt="" loading="lazy" decoding="async" className={styles.poster} onError={() => setPosterFailed(true)} />}
    {mounted && !failed && <video ref={player} src={video.videoUrl} muted loop playsInline preload="metadata"
      className={styles.tileVideo} style={{ opacity: playing ? 1 : 0 }}
      onPlaying={() => setPlaying(true)} onError={() => { setFailed(true); setPlaying(false) }} />}
    {failed && <span className={styles.mediaStatus}>{copy.unavailable}</span>}
  </span>
}

function PreviewDialog({ video, onClose }: { video: WallVideo; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [failed, setFailed] = useState(false)
  const copy = SHOWCASE_COPY[useInterfaceLanguage()]
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const previousOverflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
    onClose={onClose} onCancel={onClose}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const first = event.currentTarget.querySelector<HTMLButtonElement>('button')
      const last = event.currentTarget.querySelector<HTMLAnchorElement>('a[href]')
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className={styles.dialogInner}>
      <button type="button" autoFocus className={styles.close} onClick={onClose} aria-label={copy.close}>×</button>
      <div className={styles.previewMedia}>
        {failed ? <div role="status" className={styles.error}><strong>{copy.unavailable}</strong><p>{copy.fallback}</p></div>
          : <video src={video.videoUrl} poster={showcasePoster(video)} controls autoPlay muted playsInline preload="metadata"
              aria-label={copy.previewLabel} onError={() => setFailed(true)} />}
      </div>
      <div className={styles.dialogCopy}>
        <span className={styles.engine}>{video.badge} · {copy.previewLabel}</span>
        <h3 id={titleId}>{video.title}</h3>
        {video.href && <Link className={styles.create} href={video.href}>{copy.create} {video.badge} <span aria-hidden="true">↗</span></Link>}
      </div>
    </div>
  </dialog>
}

export default function TrendingRow({ videos }: { videos: WallVideo[] }) {
  const language = useInterfaceLanguage()
  const copy = SHOWCASE_COPY[language]
  const galleryId = useId()
  const row = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const [engine, setEngine] = useState('all')
  const [paused, setPaused] = useState(false)
  // Do not fetch video until the device policy is known.
  const [limited, setLimited] = useState(true)
  const [selected, setSelected] = useState<WallVideo | null>(null)
  const [bounds, setBounds] = useState({ back: false, next: false })
  const choices = showcaseEngines(videos)
  const filtered = filterShowcase(videos, engine)
  useEffect(() => {
    // The opener is inert while the dialog is mounted. Restore focus after removal.
    if (selected === null) opener.current?.focus({ preventScroll: true })
  }, [selected])
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean; effectiveType?: string } }).connection
    const sync = () => setLimited(motion.matches || Boolean(connection?.saveData) || (connection?.effectiveType ?? '').includes('2g'))
    sync()
    motion.addEventListener('change', sync)
    connection?.addEventListener('change', sync)
    return () => {
      motion.removeEventListener('change', sync)
      connection?.removeEventListener('change', sync)
    }
  }, [])
  useEffect(() => {
    const element = row.current
    if (!element) return
    element.scrollTo({ left: 0, behavior: 'auto' })
    const measure = () => setBounds(showcaseScrollState(element.scrollLeft, element.clientWidth, element.scrollWidth))
    measure()
    element.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => { element.removeEventListener('scroll', measure); observer.disconnect() }
  }, [engine, videos])
  const nudge = (direction: number) => {
    const element = row.current
    element?.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: limited ? 'auto' : 'smooth' })
  }
  const closePreview = () => {
    setSelected(null)
  }
  if (!videos.length) return null
  return <div className={styles.gallery} data-showcase="premium">
    <div className={styles.toolbar}>
      <label className={styles.filter}>
        <span className={styles.srOnly}>{copy.filter}</span>
        <select value={engine} onChange={event => setEngine(event.target.value)} aria-controls={galleryId}>
          <option value="all">{copy.all} ({videos.length})</option>
          {choices.map(choice => <option key={choice.engine} value={choice.engine}>{choice.badge} ({choice.count})</option>)}
        </select>
      </label>
      <div className={styles.tools}>
        <span className={styles.count} role="status">{filtered.length} {copy.count}</span>
        <button type="button" className={styles.motion} disabled={limited} aria-pressed={paused || limited}
          title={limited ? copy.reduced : undefined} onClick={() => setPaused(value => !value)}>
          <span aria-hidden="true">{paused || limited ? '▷' : 'Ⅱ'}</span> {paused || limited ? copy.resume : copy.pause}
        </button>
        <div className={styles.arrows}>
          <button type="button" disabled={!bounds.back} aria-label={copy.previous} aria-controls={galleryId} onClick={() => nudge(-1)}>←</button>
          <button type="button" disabled={!bounds.next} aria-label={copy.next} aria-controls={galleryId} onClick={() => nudge(1)}>→</button>
        </div>
      </div>
    </div>
    <div ref={row} id={galleryId} className={styles.row} role="region" aria-label={copy.gallery}
      tabIndex={0} onKeyDown={event => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault(); nudge(event.key === 'ArrowRight' ? 1 : -1)
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault(); event.currentTarget.scrollTo({ left: event.key === 'Home' ? 0 : event.currentTarget.scrollWidth, behavior: 'auto' })
        }
      }}>
      {filtered.map(video => <button key={video.id} type="button" className={styles.card}
        aria-label={copy.preview + ': ' + video.title} onClick={event => { opener.current = event.currentTarget; setSelected(video) }}>
        <GalleryMedia video={video} paused={paused || selected !== null} limited={limited} />
        <span className={styles.badge}>{video.badge}</span>
        <span className={styles.play} aria-hidden="true">▷</span>
        <span className={styles.caption}><span>{video.title}</span><span className={styles.watch}>{copy.preview} ↗</span></span>
      </button>)}
    </div>
    {selected && <PreviewDialog key={selected.id} video={selected} onClose={closePreview} />}
  </div>
}
