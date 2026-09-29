'use client'

import { useEffect, useId, useRef } from 'react'
import { UiLabel, useUiCopy } from './InterfaceLanguage'
import type { FilmVersion } from '@/lib/ui/deliveryRefinement'

export function FilmVersionPicker({ value, onChange, disabled, resolution }: { value: FilmVersion; onChange: (value: FilmVersion) => void; disabled?: boolean; resolution?: string }) {
  const ui = useUiCopy()
  return <fieldset className="delivery-versions" disabled={disabled}>
    <legend><UiLabel>Preview and download</UiLabel></legend>
    <div>{(['original', 'enhanced'] as const).map(version => <button type="button" key={version} aria-pressed={value === version} onClick={() => onChange(version)}>{ui(version === 'original' ? 'Original file' : 'Enhanced file')}</button>)}</div>
    {resolution ? <small>{resolution}</small> : null}
  </fieldset>
}

export function ExpandableFilmTitle({ title }: { title: string }) {
  return <details className="delivery-title"><summary><span>{title}</span><small><UiLabel>Full title</UiLabel></small></summary><p dir="auto">{title}</p></details>
}

export function ManualCopyDialog({ text, onClose }: { text: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const title = useId(), help = useId()
  const ui = useUiCopy()
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.current?.showModal()
    input.current?.focus(); input.current?.select()
    const node = dialog.current
    return () => { node?.close(); previous?.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={dialog} className="delivery-copy" aria-labelledby={title} onCancel={onClose} onClose={onClose}>
    <header><h2 id={title}><UiLabel>Copy manually</UiLabel></h2><button type="button" onClick={onClose} aria-label={ui('Close preview')}>×</button></header>
    <p id={help}><UiLabel>Automatic copy was blocked. Select the text and copy it.</UiLabel></p>
    <textarea ref={input} readOnly value={text} dir="auto" aria-label={ui('Text to copy')} aria-describedby={help} />
  </dialog>
}
