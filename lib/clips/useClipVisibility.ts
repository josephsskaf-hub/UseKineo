'use client'

import { useEffect, useState } from 'react'
import { CLIPS_PUBLIC } from './clipLaunch'

// Never derive private membership from an address in browser code.
export function useClipVisibility(loggedIn: boolean, identity: string | null | undefined): boolean {
  const [verified, setVerified] = useState<{ identity: string; visible: boolean } | null>(null)
  useEffect(() => {
    if (CLIPS_PUBLIC || !loggedIn || !identity) return
    let active = true
    void fetch('/api/account/clip-visibility', { cache: 'no-store', credentials: 'same-origin' })
      .then(async response => response.ok ? response.json() : null)
      .then(result => { if (active) setVerified({ identity, visible: result?.visible === true }) })
      .catch(() => { if (active) setVerified({ identity, visible: false }) })
    return () => { active = false }
  }, [loggedIn, identity])
  return CLIPS_PUBLIC || (!!loggedIn && !!identity && !!verified && verified.identity === identity && verified.visible)
}
