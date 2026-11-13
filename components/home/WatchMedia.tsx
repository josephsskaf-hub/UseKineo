'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createWatchMediaController,
  watchPosterSrc,
  type WatchMediaController,
  type WatchPlaybackState,
} from '@/lib/home/watchMedia'

export type WatchMediaProps = {
  src: string
  poster?: string
  focus?: string
  /** Leave false inside a product Link. Enable only outside a link. */
  showPlayButton?: boolean
}

export default function WatchMedia({ src, poster, focus = '50% 50%', showPlayButton = false }: WatchMediaProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controllerRef = useRef<WatchMediaController | null>(null)
  const [playback, setPlayback] = useState<WatchPlaybackState>({ playing: false, canPlay: false })
  const resolvedPoster = watchPosterSrc(src, poster)

  useEffect(() => {
    const box = boxRef.current
    const video = videoRef.current
    if (!box || !video) return
    const controller = createWatchMediaController(box, video, src, setPlayback)
    controllerRef.current = controller
    return () => {
      controllerRef.current = null
      controller.destroy()
    }
  }, [src])

  return (
    <div ref={boxRef} data-watch-media style={{ position: 'relative', width: '100%', aspectRatio: '5 / 6', overflow: 'hidden', background: 'var(--card, #101113)' }}>
      {resolvedPoster && <img
        src={resolvedPoster}
        alt=""
        width={540}
        height={648}
        loading="lazy"
        decoding="async"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: focus }}
      />}
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="none"
        aria-label="Silent video preview"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: focus, opacity: playback.playing ? 1 : 0 }}
      />
      {showPlayButton && !playback.playing && <button
        type="button"
        aria-label="Play silent preview"
        disabled={!playback.canPlay}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          controllerRef.current?.requestPlay()
        }}
        style={{ position: 'absolute', right: 12, bottom: 12, minWidth: 44, minHeight: 44, padding: '10px 14px', borderRadius: 99, border: '1px solid var(--border, #555)', background: 'var(--card, #101113)', color: 'var(--text, #fff)', fontSize: 12, cursor: playback.canPlay ? 'pointer' : 'not-allowed' }}
      >Play preview</button>}
    </div>
  )
}
