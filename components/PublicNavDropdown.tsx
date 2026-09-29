'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { UiLabel } from '@/components/InterfaceLanguage'

/** Native click/keyboard disclosure: no hover gap and only one menu stays open. */
export default function PublicNavDropdown({ label, item, children }: { label: string; item: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) ref.current?.removeAttribute('open')
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  return <details ref={ref} className="nd nav-disclosure" data-nav-item={item}
    onToggle={event => { if (event.currentTarget.open) document.querySelectorAll<HTMLDetailsElement>('details.nav-disclosure[open]').forEach(menu => { if (menu !== event.currentTarget) menu.open = false }) }}
    onKeyDown={event => { if (event.key === 'Escape') { ref.current?.removeAttribute('open'); ref.current?.querySelector('summary')?.focus() } }}>
    <summary className={item === 'video' ? 'nav-primary' : undefined}><UiLabel>{label}</UiLabel><span className="nd-car" aria-hidden="true">▾</span></summary>
    {children}
  </details>
}
