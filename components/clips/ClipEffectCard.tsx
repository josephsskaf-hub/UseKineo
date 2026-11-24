'use client'

import type { ComponentPropsWithoutRef } from 'react'
import VisibleClipVideo from './VisibleClipVideo'

type Props = ComponentPropsWithoutRef<'button'> & {
  separatePlayback: boolean
  preview?: { video: string; poster?: string } | null
  previewLabel: string
  unavailableText?: string
  selectionLabel?: string
}

export default function ClipEffectCard({
  separatePlayback, preview, previewLabel, unavailableText, selectionLabel, className = 'fx-card', children, ...choice
}: Props) {
  const player = <span className="fx-media">
    {preview
      ? <VisibleClipVideo src={preview.video} poster={preview.poster} autoPlay={!separatePlayback} controls={separatePlayback} muted loop={!separatePlayback}
          playsInline aria-hidden={!separatePlayback} aria-label={separatePlayback ? previewLabel : undefined} />
      : <span className="fx-soon">{unavailableText}</span>}
  </span>

  if (!separatePlayback) return <button {...choice} type="button" className={className}>{player}{children}</button>

  return <article className={className + ' fx-card-with-playback'}>
    {player}
    <button {...choice} type="button" className="fx-selection">
      {children}
      {selectionLabel && <span className="fx-selection-label">{selectionLabel}</span>}
    </button>
  </article>
}
