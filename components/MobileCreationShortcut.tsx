'use client'
import { useEffect, useState } from 'react'
import { UiLabel } from './InterfaceLanguage'

// Scrolls to the existing review and charge-confirming button. Never generates
// through a second handler or bypasses balance/validation/consent checks.
export default function MobileCreationShortcut({ targetId, cost }: { targetId: string; cost: string }) {
  const [shown, setShown] = useState(false)
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const target = document.getElementById(targetId)
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting))
    observer.observe(target)
    const sync = () => setTyping(!!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))
    document.addEventListener('focusin', sync)
    document.addEventListener('focusout', sync)
    return () => { observer.disconnect(); document.removeEventListener('focusin', sync); document.removeEventListener('focusout', sync) }
  }, [targetId])
  if (!shown || typing) return null
  return <div className="mobile-creation-shortcut"><span>{cost}</span><button type="button" onClick={() => {
    const target = document.getElementById(targetId)
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
    target?.focus({ preventScroll: true })
  }}><UiLabel>Review and generate</UiLabel> →</button></div>
}
