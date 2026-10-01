'use client'

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import ControlIcon from './ControlIcon'
import { UiLabel, useUiCopy } from './InterfaceLanguage'
import type { FilmVersion } from '@/lib/ui/deliveryRefinement'
import styles from './FilmPreviewDialog.module.css'

type Props = {
  title: string
  src: string
  hasEnhanced: boolean
  version: FilmVersion
  resolution?: string
  downloading: boolean
  downloadLabel: string
  downloadNote?: string
  copied: boolean
  onVersionChange: (version: FilmVersion) => void
  onDownload: () => void
  onCopyTitle: () => void
  onMetadata: (player: HTMLVideoElement) => void
  onError: () => void
  onClose: () => void
  children?: ReactNode
}

/** The same owner-only preview is used by Library and History. */
export default function FilmPreviewDialog({ title, src, hasEnhanced, version, resolution, downloading, downloadLabel, downloadNote, copied, onVersionChange, onDownload, onCopyTitle, onMetadata, onError, onClose, children }: Props) {
  const ui = useUiCopy()
  const dialog = useRef<HTMLDivElement>(null)
  const player = useRef<HTMLVideoElement>(null)
  const more = useRef<HTMLDetailsElement>(null)
  const titleId = useId()
  const [ratio, setRatio] = useState(9 / 16)
  const [failed, setFailed] = useState(false)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setPortalRoot(document.body)
  }, [])

  useEffect(() => {
    if (!portalRoot) return
    const overflow = document.body.style.overflow
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      if (previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true })
    }
  }, [portalRoot])

  useEffect(() => {
    if (!portalRoot) return
    function onKeyDown(event: KeyboardEvent) {
      // The existing manual-copy dialog owns focus while it is open.
      if (document.querySelector('dialog[open]') || event.defaultPrevented) return
      if (event.key === 'Escape') {
        event.preventDefault()
        if (more.current?.open) closeMore()
        else onClose()
      }
      if (event.key !== 'Tab') return
      // The existing download recovery panel is attached to body. Keep its
      // manual link reachable instead of hiding it behind a native top layer.
      const roots = [dialog.current, document.getElementById('kineo-manual-download')]
      const controls = roots.flatMap(root => root ? [...root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary, video[controls]')] : [])
        .filter(element => {
          const collapsed = element.closest('details:not([open])')
          return (!collapsed || element === collapsed.querySelector('summary'))
            && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'
        })
      const first = controls[0], last = controls[controls.length - 1]
      if (!first || !last) return
      if (!controls.includes(document.activeElement as HTMLElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [portalRoot, onClose])

  useEffect(() => { setFailed(false); setRatio(9 / 16) }, [src])

  function closeMore() {
    if (more.current) {
      more.current.open = false
      more.current.querySelector('summary')?.focus()
    }
  }

  if (!portalRoot) return null

  return createPortal(
    <div className={styles.overlay} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={dialog} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} data-film-preview="essential">
      <div className={styles.closeDock}><button type="button" className={styles.close} onClick={onClose} aria-label={ui('Close preview')}>×</button></div>
      <div className={styles.layout}>
        <div className={styles.stage}>
          <div className={styles.frame} style={{ '--film-ratio': ratio } as CSSProperties}>
            <video ref={player} src={src} controls autoPlay playsInline controlsList="nodownload" disablePictureInPicture
              aria-label={title}
              onLoadedMetadata={event => {
                const video = event.currentTarget
                if (video.videoWidth > 0 && video.videoHeight > 0) setRatio(video.videoWidth / video.videoHeight)
                setFailed(false)
                onMetadata(video)
              }}
              onError={() => { setFailed(true); onError() }}
            />
          </div>
          {failed ? <div className={styles.loadError} role="alert">
            <p><UiLabel>Preview unavailable</UiLabel></p>
            <button type="button" onClick={() => { setFailed(false); player.current?.load() }}><UiLabel>Try again</UiLabel></button>
          </div> : null}
        </div>
        <div className={styles.content}>
          <div className={styles.breadcrumb}><UiLabel>Library</UiLabel><span aria-hidden="true">/</span><UiLabel>Preview</UiLabel></div>
          <h2 id={titleId} dir="auto" className={styles.title}>{title}</h2>
          <div className={styles.file}>
            {hasEnhanced ? <fieldset className={styles.versions} disabled={downloading}>
              <legend className={styles.srOnly}><UiLabel>Preview and download</UiLabel></legend>
              {(['original', 'enhanced'] as const).map(value => <button type="button" key={value} aria-pressed={version === value} onClick={() => onVersionChange(value)}>
                <UiLabel>{value === 'original' ? 'Original file' : 'Enhanced file'}</UiLabel>
              </button>)}
            </fieldset> : null}
            <div className={styles.metadata} dir="ltr">{resolution ? <><span>{resolution}</span><span aria-hidden="true">·</span></> : null}<span>MP4</span></div>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.download} onClick={onDownload} disabled={downloading}>
              <ControlIcon name="download" style={{ width: 15, height: 15 }} /><UiLabel>{downloadLabel}</UiLabel>
            </button>
            <details ref={more} className={styles.more}>
              <summary aria-label={ui('More actions')}>···</summary>
              <div className={styles.menu}>
                <button type="button" onClick={() => { closeMore(); onCopyTitle() }}><UiLabel>Copy title</UiLabel></button>
                <button type="button" onClick={() => {
                  closeMore()
                  const video = player.current
                  if (!video) return
                  video.currentTime = 0
                  void video.play().catch(() => { video.focus() })
                }}><UiLabel>Replay</UiLabel></button>
              </div>
            </details>
          </div>
          <div className={styles.status} role="status">{downloadNote ? <p>{downloadNote}</p> : null}{copied ? <p><UiLabel>Title copied</UiLabel></p> : null}</div>
          {children ? <div className={styles.offers}>{children}</div> : null}
          <details className={styles.wall}>
            <summary><UiLabel>Published it?</UiLabel><span aria-hidden="true">⌄</span></summary>
            <a href="/wall" target="_blank" rel="noopener noreferrer"><UiLabel>Paste the link and get on the wall →</UiLabel></a>
          </details>
        </div>
      </div>
    </div>
    </div>, portalRoot
  )
}
