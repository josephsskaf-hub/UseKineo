'use client'

import { useEffect, useRef, useState } from 'react'

export default function RecreatePlayer({ src, poster, label, preview = false }: { src: string; poster?: string; label: string; preview?: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(preview)
  const [error, setError] = useState('')
  useEffect(() => {
    if (preview && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) void video.current?.play().catch(() => {})
  }, [preview, src])
  async function togglePlayback() {
    const player = video.current
    if (!player) return
    setError('')
    if (player.paused) {
      try { await player.play() } catch { setError('Could not play. Try again.') }
    } else player.pause()
  }
  return <div className="rc-player">
    <video ref={video} src={src} poster={poster} muted={muted} loop={preview} playsInline preload="metadata" aria-label={label} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onVolumeChange={() => setMuted(video.current?.muted ?? true)} />
    <div className="rc-player-controls">
      <button type="button" onClick={() => void togglePlayback()} aria-label={`${playing ? 'Pause' : 'Play'} ${label}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M7 5h3v14H7zm7 0h3v14h-3z" /> : <path d="m8 5 11 7-11 7z" />}</svg>
        <span>{playing ? 'Pause' : 'Play'}</span>
      </button>
      <span className="rc-player-error" role="status">{error}</span>
      <button type="button" onClick={() => { if (video.current) video.current.muted = !muted }} aria-label={`${muted ? 'Unmute' : 'Mute'} ${label}`} aria-pressed={!muted}>
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M4 9v6h4l5 4V5L8 9z" />{muted ? <path d="m17 9 5 6m0-6-5 6" /> : <path d="M17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />}</svg>
      </button>
    </div>
  </div>
}
