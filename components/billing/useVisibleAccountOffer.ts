'use client'

import { useEffect, useState, type RefObject } from 'react'
import { useAccountMenuScope, type AccountMenuScope, type AccountOffer } from '@/components/AccountMenuScope'
import { RECARGA_ASSINANTE_API, RECARGA_ASSINANTE_1111_RELEASE } from '@/lib/billing/recargaAssinante'
import { ACCOUNT_CREDITS_OFFER_SURFACE } from '@/lib/ui/unifiedAccountMenu'

function readOffer(scope: AccountMenuScope) {
  if (!scope.offer) {
    scope.offer = fetch(`${RECARGA_ASSINANTE_API}?surface=${ACCOUNT_CREDITS_OFFER_SURFACE}`, { cache: 'no-store', credentials: 'same-origin' })
      .then(async response => {
        if (!response.ok) throw new Error('Credit offer request failed')
        const offer = await response.json() as AccountOffer | { show: false } | null
        if (offer?.show === false) return null
        if (offer?.show === true && typeof offer.qa === 'boolean' &&
          offer.go === `${RECARGA_ASSINANTE_API}?go=1&surface=${ACCOUNT_CREDITS_OFFER_SURFACE}`) return offer
        throw new Error('Invalid credit offer response')
      })
      .catch(() => {
        scope.offer = undefined
        return null
      })
  }
  return scope.offer
}

function whenVisible(element: HTMLElement, notify: () => void, fallback = false): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    if (fallback) notify()
    return () => {}
  }
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting || entry.intersectionRatio < 0.5 || entry.boundingClientRect.width <= 0 ||
      entry.boundingClientRect.height <= 0 || getComputedStyle(element).visibility !== 'visible') return
    observer.disconnect()
    notify()
  }, { threshold: 0.5 })
  observer.observe(element)
  return () => observer.disconnect()
}

/** Visible entries share an in-flight read and cache valid results. The next entry can retry after a failure. */
export function useVisibleAccountOffer(surface: string, enabled: boolean, region: RefObject<HTMLElement>): AccountOffer | null {
  const scope = useAccountMenuScope()
  const [current, setCurrent] = useState<{ scope: AccountMenuScope; offer: AccountOffer | null }>()
  useEffect(() => {
    if (!scope || !enabled || RECARGA_ASSINANTE_1111_RELEASE === 'off' || !region.current) return
    let active = true
    const stop = whenVisible(region.current, () => {
      void readOffer(scope).then(offer => { if (active) setCurrent({ scope, offer }) })
    }, true)
    return () => { active = false; stop() }
  }, [scope, enabled, region])

  if (!enabled || !scope || current?.scope !== scope || !current.offer) return null
  const go = new URLSearchParams(current.offer.go.split('?')[1])
  go.set('surface', surface)
  return { ...current.offer, go: `${RECARGA_ASSINANTE_API}?${go}` }
}

export function useAccountOfferImpression(surface: string, offer: AccountOffer | null, button: RefObject<HTMLElement>) {
  const scope = useAccountMenuScope()
  const token = offer?.shownToken
  useEffect(() => {
    if (!scope || !token || scope.seen.has(surface) || !button.current) return
    return whenVisible(button.current, () => {
      if (scope.seen.has(surface)) return
      scope.seen.add(surface)
      void fetch(RECARGA_ASSINANTE_API, {
        method: 'POST', credentials: 'same-origin', keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, surface }),
      }).catch(() => {})
    })
  }, [scope, token, surface, button])
}
