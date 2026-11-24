'use client'

import { useState, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react'
import VisibleClipVideo from './VisibleClipVideo'

type Dimensions = { src: string | null | undefined; ratio: number }

export default function SavedClipCard({ src, aspect, lazy, children, style, className }: {
  src?: string | null
  aspect?: string
  lazy?: boolean
  children?: ReactNode
  style?: CSSProperties
  className?: string
}) {
  const [dimensions, setDimensions] = useState<Dimensions | null>(null)
  const declaredRatio = aspect === '16:9' ? 16 / 9 : aspect === '9:16' ? 9 / 16 : 1
  const ratio = dimensions && dimensions.src === src ? dimensions.ratio : declaredRatio
  const wide = Boolean(src) && ratio > 1

  function measure(event: SyntheticEvent<HTMLVideoElement>) {
    const { videoWidth, videoHeight } = event.currentTarget
    if (videoWidth > 0 && videoHeight > 0) setDimensions({ src, ratio: videoWidth / videoHeight })
  }

  const videoStyle = { width: '100%', aspectRatio: ratio, objectFit: 'contain', display: 'block', borderRadius: 10, background: '#000' } as const
  return <div className={className} data-clip-shape={wide ? 'wide' : 'standard'} style={wide ? { ...style, gridColumn: '1 / -1', width: '100%', maxWidth: 720 } : style}>
    {src && (lazy
      ? <VisibleClipVideo src={src} controls playsInline onLoadedMetadata={measure} style={videoStyle} />
      : <video src={src} controls playsInline preload="metadata" onLoadedMetadata={measure} style={videoStyle} />)}
    {children}
  </div>
}
