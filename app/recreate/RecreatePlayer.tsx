'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import './studio-media.css'

interface PlayerProps {
  src: string
  poster?: string
  label: string
  preview?: boolean
  stage?: { kind: string; title: string; detail?: string; action?: ReactNode }
}

/** The gallery loads covers first. Selecting one uses the existing mode-specific callback. */
export function ExampleCover({ src, poster, label, disabled, onSelect }: {
  src: string; poster: string; label: string; disabled?: boolean; onSelect: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  return <button type="button" className="rc-example-cover" aria-label={label} disabled={disabled}
    onClick={onSelect}
    onPointerEnter={event => {
      if (event.pointerType === 'mouse' && !disabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        void video.current?.play().catch(() => {})
      }
    }}
    onPointerLeave={() => video.current?.pause()}>
    <video ref={video} src={src} poster={poster} muted loop playsInline preload="none" aria-hidden="true" />
  </button>
}

export default function RecreatePlayer({ src, poster, label, preview = false, stage }: PlayerProps) {
  const video = useRef<HTMLVideoElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(preview)
  const [error, setError] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  useEffect(() => {
    if (preview && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) void video.current?.play().catch(() => {})
    setCanExpand(Boolean(document.fullscreenEnabled))
    const update = () => setFullscreen(document.fullscreenElement === frame.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [preview, src])
  async function togglePlayback() {
    const player = video.current
    if (!player) return
    setError('')
    if (player.paused) {
      try { await player.play() } catch { setError('Could not play. Try again.') }
    } else player.pause()
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === frame.current) await document.exitFullscreen()
      else await frame.current?.requestFullscreen()
    } catch { setError('Could not expand the preview.') }
  }
  return <div className="rc-player" data-presentation={stage ? 'stage' : 'inline'} ref={frame}>
    <video ref={video} src={src} poster={poster} muted={muted} loop={preview} playsInline preload="metadata" aria-label={label}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onVolumeChange={() => setMuted(video.current?.muted ?? true)} />
    <div className="rc-media-info">
      {stage && <><p className="rc-media-kind">{stage.kind}</p><h2>{stage.title}</h2>{stage.detail && <p className="rc-media-detail">{stage.detail}</p>}{stage.action}</>}
      <div className="rc-player-controls">
        <button type="button" onClick={() => void togglePlayback()} aria-label={`${playing ? 'Pause' : 'Play'} ${label}`} title={playing ? 'Pause' : 'Play'}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M8 5v14m8-14v14" strokeWidth="3" /> : <path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none" />}</svg>
          <span className="rc-sr-only">{playing ? 'Pause' : 'Play'}</span>
        </button>
        <button type="button" onClick={() => { if (video.current) video.current.muted = !muted }} aria-label={`${muted ? 'Unmute' : 'Mute'} ${label}`} title={muted ? 'Unmute' : 'Mute'} aria-pressed={!muted}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9z" />{muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />}</svg>
        </button>
        {canExpand && <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? 'Exit fullscreen' : 'Expand preview'} title={fullscreen ? 'Exit fullscreen' : 'Expand preview'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5m6 0h5v5m0 6v5h-5M9 20H4v-5" /></svg>
        </button>}
      </div>
      <span className="rc-player-error" role="status">{error}</span>
    </div>
  </div>
}
