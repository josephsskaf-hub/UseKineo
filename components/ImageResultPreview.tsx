'use client'

import { useEffect, useId, useRef } from 'react'
import { UiLabel, useUiCopy } from './InterfaceLanguage'

export default function ImageResultPreview({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const title = useId()
  const ui = useUiCopy()
  useEffect(() => {
    const dialog = ref.current
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog?.showModal()
    return () => { dialog?.close(); focus?.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={ref} className="refine-image-dialog" aria-labelledby={title} onCancel={onClose} onClose={onClose} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <header><div><small><UiLabel>Your generated image</UiLabel></small><h2 id={title}>{name}</h2></div><button type="button" autoFocus onClick={onClose} aria-label={ui('Close preview')}>×</button></header>
    <img src={src} alt={name} />
  </dialog>
}
