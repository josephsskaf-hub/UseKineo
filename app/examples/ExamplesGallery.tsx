'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import type { WallVideo } from '@/lib/engineWall'
import { searchExamples } from '@/lib/ui/examplesGallery'
import { showcaseEngines, showcasePoster } from '@/lib/ui/showcaseGallery'
import styles from './ExamplesGallery.module.css'

function FeaturedMedia({ video, paused }: { video: WallVideo; paused: boolean }) {
  const container = useRef<HTMLSpanElement>(null)
  const player = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean; effectiveType?: string } }).connection
    const sync = () => setAllowed(!motion.matches && !connection?.saveData && !(connection?.effectiveType ?? '').includes('2g'))
    sync()
    motion.addEventListener('change', sync)
    connection?.addEventListener('change', sync)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .25 })
    if (container.current) observer.observe(container.current)
    return () => { observer.disconnect(); motion.removeEventListener('change', sync); connection?.removeEventListener('change', sync) }
  }, [])
  const active = visible && allowed && !paused && !failed
  useEffect(() => { if (active) setMounted(true); else player.current?.pause() }, [active])
  useEffect(() => {
    const media = player.current
    if (active && mounted) media?.play().catch(() => {})
    return () => { media?.pause() }
  }, [active, mounted])
  return <span className={styles.featuredMedia} ref={container}>
    <img src={video.posterUrl} alt="" loading="eager" style={{ objectPosition: video.focalPoint }} />
    {mounted && !failed && <video ref={player} src={video.previewUrl ?? video.videoUrl} muted loop playsInline preload="none"
      style={{ opacity: playing ? 1 : 0, objectPosition: video.focalPoint }} onPlaying={() => setPlaying(true)} onError={() => setFailed(true)} />}
  </span>
}

function ExamplePreview({ video, onClose }: { video: WallVideo; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useId()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const previousOverflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => { element.close(); document.body.style.overflow = previousOverflow }
  }, [])
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={title} onClose={onClose} onCancel={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className={styles.dialogInner}>
      <button type="button" autoFocus onClick={onClose} className={styles.close} aria-label="Close preview">×</button>
      <div className={styles.player}>
        {failed ? <p role="status">This preview is unavailable. You can still explore this style in the Studio.</p>
          : <video src={video.videoUrl} poster={video.posterUrl ?? showcasePoster(video)} controls autoPlay muted playsInline preload="metadata"
              aria-label={`Preview: ${video.title}`} onError={() => setFailed(true)} />}
      </div>
      <div className={styles.previewInfo}>
        <span className={styles.eyebrow}>{video.badge} · Preview</span>
        <h2 id={title}>{video.title}</h2>
        <p>A short preview from a film made with Kineo.</p>
        {video.href && <Link className={styles.action} href={video.href}>
          {video.engine === 'static_example' ? 'Explore this example' : `Create with ${video.badge}`} <span aria-hidden="true">→</span>
        </Link>}
      </div>
    </div>
  </dialog>
}

export default function ExamplesGallery({ videos, startPaused = false, separateFeatured = false }: { videos: WallVideo[]; startPaused?: boolean; separateFeatured?: boolean }) {
  const [query, setQuery] = useState('')
  const [engine, setEngine] = useState('all')
  const [selected, setSelected] = useState<WallVideo | null>(null)
  const [paused, setPaused] = useState(startPaused)
  const opener = useRef<HTMLButtonElement | null>(null)
  const searchId = useId()
  const collection = separateFeatured && videos.length >= 3 ? videos.slice(3) : videos
  const filtered = searchExamples(collection, query, engine)
  const choices = showcaseEngines(collection)
  const open = (video: WallVideo, button: HTMLButtonElement) => { opener.current = button; setSelected(video) }
  useEffect(() => { if (!selected) opener.current?.focus({ preventScroll: true }) }, [selected])
  return <div className={styles.gallery}>
    {videos.length >= 3 && <section className={styles.featuredSection} aria-label="Featured examples">
      <div className={styles.sectionTop}><span className={styles.eyebrow}>The Kineo selection</span>
        <button type="button" className={styles.quietButton} onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? 'Play preview' : 'Pause preview'}</button>
      </div>
      <div className={styles.featured}>
        {videos.slice(0, 3).map((video, index) => <button type="button" className={index === 0 ? styles.lead : styles.featureCard}
          key={video.id} onClick={event => open(video, event.currentTarget)} aria-label={`Watch preview: ${video.title}`}>
          {index < 2 ? <FeaturedMedia video={video} paused={paused || selected !== null} />
            : <img src={video.posterUrl} alt="" loading="eager" className={styles.featurePoster} />}
          <span className={styles.featureShade} />
          <span className={styles.featureCopy}><span className={styles.featureBadge}>{video.badge}</span><strong>{video.title}</strong>
            <span className={styles.watch}><span aria-hidden="true">▶</span> Watch preview</span>
          </span>
        </button>)}
      </div>
    </section>}
    <section className={styles.collection} aria-labelledby="examples-collection-heading">
      <div className={styles.collectionTop}>
        <div><span className={styles.eyebrow}>Made with Kineo</span><h2 id="examples-collection-heading">Explore the collection</h2></div>
        <div className={styles.search}><label className={styles.srOnly} htmlFor={searchId}>Search examples</label>
          <span aria-hidden="true">⌕</span><input id={searchId} type="search" placeholder="Search films or engines…" value={query} onChange={event => setQuery(event.target.value)} />
        </div>
      </div>
      <div className={styles.filters} role="group" aria-label="Filter by engine">
        <button type="button" aria-pressed={engine === 'all'} onClick={() => setEngine('all')}>All engines</button>
        {choices.map(choice => <button type="button" key={choice.engine} aria-pressed={engine === choice.engine} onClick={() => setEngine(choice.engine)}>{choice.badge}</button>)}
      </div>
      <div className={styles.results} role="status">{filtered.length} {filtered.length === 1 ? 'example' : 'examples'}{engine !== 'all' || query ? ' found' : ' to explore'}</div>
      {filtered.length ? <div className={styles.grid}>
        {filtered.map(video => <button type="button" className={styles.card} key={video.id} onClick={event => open(video, event.currentTarget)} aria-label={`Watch preview: ${video.title}`}>
          <span className={styles.poster}>
            <img src={video.posterUrl ?? showcasePoster(video)} alt="" loading="lazy" decoding="async" />
            <span className={styles.badge}>{video.badge}</span><span className={styles.play} aria-hidden="true">▶</span>
          </span>
          <span className={styles.cardTitle}>{video.title}</span><span className={styles.cardHint}>Watch preview <span aria-hidden="true">↗</span></span>
        </button>)}
      </div> : <div className={styles.empty}><h3>No matching examples</h3><p>Try a different title or engine.</p>
        <button type="button" className={styles.action} onClick={() => { setQuery(''); setEngine('all') }}>Show all examples</button>
      </div>}
    </section>
    {selected && <ExamplePreview key={selected.id} video={selected} onClose={() => setSelected(null)} />}
  </div>
}
