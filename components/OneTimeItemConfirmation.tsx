'use client'

// KINEO-COMPRA-AVULSA-2410 — a Stripe redirect is not a receipt. Continue only after the server confirms fulfillment.
import { useEffect, useState } from 'react'

export type ItemConfirmationState = 'confirming' | 'pending' | 'auth' | 'unavailable'
export const ITEM_CONFIRMATION_POLL_MS = 1500
export const ITEM_CONFIRMATION_TIMEOUT_MS = 30000

export function oneTimeItemConfirmedDestination(value: unknown, origin: string): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null
  try {
    const url = new URL(value, origin)
    if (url.origin !== origin || !['/ads/v2', '/studio'].includes(url.pathname)) return null
    return url.pathname + url.search + url.hash
  } catch { return null }
}
export function oneTimeItemConfirmationLoginHref(sessionId: string): string {
  return `/login?redirect=${encodeURIComponent(`/checkout/item?session_id=${encodeURIComponent(sessionId)}`)}`
}

/** Read-only confirmation loop. Dependencies are injectable for the offline payment guardian. */
export function startOneTimeItemConfirmation({ sessionId, origin, onState, onFulfilled, fetcher = fetch, schedule = setTimeout, cancel = clearTimeout }: {
  sessionId: string
  origin: string
  onState: (state: ItemConfirmationState) => void
  onFulfilled: (next: string) => void
  fetcher?: typeof fetch
  schedule?: typeof setTimeout
  cancel?: typeof clearTimeout
}): () => void {
  let active = true, poll: ReturnType<typeof setTimeout> | null = null
  const controller = new AbortController()
  const clear = () => { if (poll !== null) cancel(poll); cancel(deadline); controller.abort() }
  const finish = (state: ItemConfirmationState) => { if (!active) return; active = false; clear(); onState(state) }
  const deadline = schedule(() => finish('pending'), ITEM_CONFIRMATION_TIMEOUT_MS)
  onState('confirming')
  const again = () => { if (active) poll = schedule(() => { poll = null; void check() }, ITEM_CONFIRMATION_POLL_MS) }
  async function check() {
    try {
      const response = await fetcher(`/api/stripe/checkout/item?session_id=${encodeURIComponent(sessionId)}`, { method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      if (!active) return
      if (response.status === 401) { finish('auth'); return }
      if (response.status === 400 || response.status === 403 || response.status === 404) { finish('unavailable'); return }
      if (response.status === 200) {
        const body = await response.json() as { state?: unknown; next?: unknown }
        if (!active) return
        if (body.state === 'fulfilled') {
          const next = oneTimeItemConfirmedDestination(body.next, origin)
          if (!next) { finish('unavailable'); return }
          active = false; clear(); onFulfilled(next); return
        }
      }
    } catch { /* Transient confirmation errors may retry; a retry never opens a checkout or grants credits. */ }
    again()
  }
  void check()
  return () => { active = false; clear() }
}

export const ITEM_CONFIRMATION_CSS = `
.item-confirm-page{min-height:70vh;display:grid;place-items:center;padding:36px 20px;color:var(--text,#21302b);font-family:var(--font-sans,Arial,sans-serif)}.item-confirm-card{width:100%;max-width:470px;padding:32px;border:1px solid var(--border,#d9dedb);border-radius:22px;background:var(--card,#fff);text-align:center}.item-confirm-brand{display:inline-block;margin-bottom:25px;color:var(--accent,#4062e8);font-weight:850;letter-spacing:-.05em;font-size:24px;text-decoration:none}.item-confirm-symbol{display:grid;place-items:center;width:52px;height:52px;margin:0 auto 20px;border:1px solid var(--border,#d9dedb);border-radius:50%;background:var(--card2,#f0f3f0);font-size:22px;color:var(--accent,#4062e8)}.item-confirm-card h1{font-size:25px;line-height:1.25;letter-spacing:-.035em;margin:0}.item-confirm-card p{font-size:14px;line-height:1.6;margin:14px 0 0;color:var(--muted,#65756f)}.item-confirm-card .item-confirm-action{display:block;width:100%;margin-top:24px;padding:13px 18px;border:0;border-radius:11px;background:var(--accent,#4062e8);color:#fff;font:inherit;font-size:14px;font-weight:750;text-decoration:none;cursor:pointer;line-height:1.4}.item-confirm-action:focus-visible,.item-confirm-support:focus-visible{outline:3px solid var(--accent,#4062e8);outline-offset:4px}.item-confirm-support{display:inline-block;margin-top:22px;font-size:12px;color:var(--muted,#65756f);text-underline-offset:3px}@media(max-width:600px){.item-confirm-page{padding:24px 16px}.item-confirm-card{padding:27px 21px;border-radius:18px}.item-confirm-card h1{font-size:23px}}
`
export function OneTimeItemConfirmationView({ state, loginHref, onRetry }: { state: ItemConfirmationState; loginHref?: string; onRetry?: () => void }) {
  const title = state === 'confirming' ? 'Confirming your purchase' : state === 'pending' ? 'Your purchase is still being confirmed' : state === 'auth' ? 'Sign in to confirm your purchase' : 'We could not confirm this purchase yet'
  return <main className="item-confirm-page"><style dangerouslySetInnerHTML={{ __html: ITEM_CONFIRMATION_CSS }} /><section className="item-confirm-card" aria-labelledby="item-confirm-title" data-state={state}>
    <a className="item-confirm-brand" href="/">Kineo</a><div className="item-confirm-symbol" aria-hidden="true">{state === 'confirming' ? '…' : '↻'}</div>
    <h1 id="item-confirm-title">{title}</h1>
    <div role="status" aria-live="polite"><p>{state === 'confirming' ? 'Keep this page open. We are checking that your item is ready before taking you back to create.' : state === 'pending' ? 'You will not be charged again. Check the same purchase again in a moment.' : state === 'auth' ? 'Sign in with the account used at checkout. We will check the same purchase without starting another payment.' : 'Check this purchase again or contact support. Checking again does not start another payment.'}</p></div>
    {state === 'auth' && loginHref ? <a className="item-confirm-action" href={loginHref}>Sign in and check purchase</a> : state === 'pending' || state === 'unavailable' ? <button className="item-confirm-action" type="button" onClick={onRetry}>Check purchase again</button> : null}
    <a className="item-confirm-support" href="mailto:support@usekineo.com">Contact support</a>
  </section></main>
}

export default function OneTimeItemConfirmation() {
  const [state, setState] = useState<ItemConfirmationState>('confirming'), [attempt, setAttempt] = useState(0), [sessionId, setSessionId] = useState('')
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('session_id') ?? ''
    setSessionId(id)
    if (!/^cs_[A-Za-z0-9_]{8,240}$/.test(id)) { setState('unavailable'); return }
    return startOneTimeItemConfirmation({ sessionId: id, origin: window.location.origin, onState: setState, onFulfilled: next => window.location.replace(next) })
  }, [attempt])
  return <OneTimeItemConfirmationView state={state} loginHref={sessionId ? oneTimeItemConfirmationLoginHref(sessionId) : undefined} onRetry={() => setAttempt(value => value + 1)} />
}
