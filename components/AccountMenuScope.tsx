'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ACCOUNT_MENU_RELEASE, ACCOUNT_MENU_VISIBILITY_API } from '@/lib/ui/unifiedAccountMenu'
import type { RecargaAssinanteOffer } from '@/lib/billing/recargaAssinante'

export type AccountOffer = RecargaAssinanteOffer & { shownToken?: string }

export type AccountMenuScope = {
  credits?: Promise<Response>
  offer?: Promise<AccountOffer | null>
  seen: Set<string>
}

const Scope = createContext<AccountMenuScope | null>(null)

export function useAccountMenuScope() {
  return useContext(Scope)
}

export function AccountMenuScopeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [actor, setActor] = useState<string | null>(null)
  const [accountVersion, setAccountVersion] = useState(0)
  const [confirmedActor, setConfirmedActor] = useState<string | null>(null)
  const scope = useMemo<AccountMenuScope>(() => ({ seen: new Set() }), [pathname, accountVersion])

  useEffect(() => {
    let last: string | null | undefined
    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null
      if (last !== undefined && id !== last) setAccountVersion(version => version + 1)
      last = id
      setActor(id)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (ACCOUNT_MENU_RELEASE !== 'internal' || !actor) return
    const controller = new AbortController()
    void fetch(ACCOUNT_MENU_VISIBILITY_API, { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then((result: { enabled?: boolean } | null) => {
        if (!controller.signal.aborted) setConfirmedActor(result?.enabled === true ? actor : null)
      })
      .catch(() => { if (!controller.signal.aborted) setConfirmedActor(null) })
    return () => controller.abort()
  }, [actor])

  const enabled = ACCOUNT_MENU_RELEASE === 'public' || (ACCOUNT_MENU_RELEASE === 'internal' && actor !== null && confirmedActor === actor)
  return <Scope.Provider value={enabled ? scope : null}>{children}</Scope.Provider>
}

/** The badge and its open panel can independently consume the same read. */
export function readAccountMenuCredits(scope: AccountMenuScope, refresh = false): Promise<Response> {
  if (!scope.credits || refresh) {
    const read = fetch('/api/credits', { cache: 'no-store' })
    scope.credits = read
    const clear = () => { if (scope.credits === read) scope.credits = undefined }
    void read.then(response => { if (!response.ok) clear() }, clear)
  }
  return scope.credits.then(response => response.clone())
}
