'use client'

import { useEffect } from 'react'

export default function HomeProjection({ placement, publicHome = false }: { placement: 'a' | 'b'; publicHome?: boolean }) {
  useEffect(() => {
    // The private comparison also renders HomePage. Only its own controller should run there.
    if (publicHome && location.pathname !== '/') return
    const root = document.querySelector<HTMLElement>(publicHome ? 'main.klp' : '[data-home-projection]')
    const card = root?.querySelector('[data-home-card="films"]')
    if (!root || !card) return
    const desktop = matchMedia('(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    if (!desktop.matches) return
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (connection?.saveData) {
      root.dataset.staticHome = ''
      return () => { delete root.dataset.staticHome }
    }
    const mount = root
    const controller = new AbortController()
    const { signal } = controller
    let stylesheet: HTMLLinkElement | undefined
    let idle = 0
    let timer = 0
    const url = '/screening-room/home-projection.js'
    async function start() {
      if (signal.aborted) return
      try {
        if (publicHome) {
          stylesheet = document.createElement('link')
          stylesheet.rel = 'stylesheet'
          stylesheet.href = '/screening-room/home-film.css'
          const ready = new Promise<void>((resolve, reject) => {
            stylesheet!.onload = () => resolve()
            stylesheet!.onerror = reject
            signal.addEventListener('abort', () => reject(signal.reason), { once: true })
          })
          document.head.append(stylesheet)
          await ready
        }
        if (signal.aborted) return
        const { projectHome } = await import(/* webpackIgnore: true */ url)
        if (!signal.aborted) await projectHome(mount, placement, signal, publicHome)
      } catch { /* The native film card remains interactive. */ }
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return
      observer.disconnect()
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(start, { timeout: 2500 })
      else timer = window.setTimeout(start, 150)
    })
    function afterLoad() { observer.observe(card!) }
    function stop() {
      controller.abort()
      observer.disconnect()
      if (idle) window.cancelIdleCallback(idle)
      window.clearTimeout(timer)
      stylesheet?.remove()
    }
    if (document.readyState === 'complete') afterLoad()
    else window.addEventListener('load', afterLoad, { once: true, signal })
    desktop.addEventListener('change', () => { if (!desktop.matches) stop() }, { signal })
    return stop
  }, [placement, publicHome])
  return null
}
