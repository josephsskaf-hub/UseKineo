'use client'

import { useEffect } from 'react'

export default function HomeProjection({ placement }: { placement: 'a' | 'b' }) {
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const desktop = matchMedia('(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (!desktop.matches) return
    const root = document.querySelector<HTMLElement>('[data-home-projection]')
    if (!root) return
    if (connection?.saveData) {
      root.dataset.staticHome = ''
      return () => { delete root.dataset.staticHome }
    }
    const mount = root
    const url = '/screening-room/home-projection.js'
    async function start() {
      if (signal.aborted || !desktop.matches) return
      try {
        const { projectHome } = await import(/* webpackIgnore: true */ url)
        if (!signal.aborted) await projectHome(mount, placement, signal)
      } catch { /* The original media remains visible. */ }
    }
    let idle = 0
    let timer = 0
    function afterLoad() {
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(start, { timeout: 2500 })
      else timer = window.setTimeout(start, 150)
    }
    if (document.readyState === 'complete') afterLoad()
    else window.addEventListener('load', afterLoad, { once: true, signal })
    desktop.addEventListener('change', () => { if (!desktop.matches) controller.abort() }, { signal })
    return () => {
      controller.abort()
      if (idle) window.cancelIdleCallback(idle)
      window.clearTimeout(timer)
    }
  }, [placement])
  return null
}
