'use client'

import { useEffect, useState } from 'react'
import { readServerVisibility } from '@/lib/auth/readServerVisibility'
import { CLIPS_PUBLIC } from '@/lib/clips/clipLaunch'
import { CREATE_SHELL_RELEASE, CLIP_RECREATE_JUNTOS_RELEASE } from './release'
import { CREATE_CLIP_INPLACE } from './clipNaMolduraRelease'
import { RECREATE_RELEASE } from '@/lib/recreate/release'

export type CreateNavigationVisibility = { showClip: boolean; showRecreate: boolean }

// Public fallback mirrors the existing server predicates without knowing private membership.
export function publicCreateNavigation(identity: string | null | undefined): CreateNavigationVisibility {
  const recreate = RECREATE_RELEASE === 'public'
  const clip = !!identity && CREATE_CLIP_INPLACE === 'public' && CREATE_SHELL_RELEASE !== 'off' && CLIPS_PUBLIC
  const joined = !!identity && CLIP_RECREATE_JUNTOS_RELEASE === 'public' && clip && recreate
  return { showClip: clip, showRecreate: recreate && !joined }
}

export function useCreateNavigationVisibility(identity: string | null | undefined): CreateNavigationVisibility {
  const [verified, setVerified] = useState<{ identity: string; flags: CreateNavigationVisibility } | null>(null)
  const needsPrivateRead = !!identity && (!CLIPS_PUBLIC || CREATE_CLIP_INPLACE === 'internal' || CLIP_RECREATE_JUNTOS_RELEASE === 'internal' || RECREATE_RELEASE === 'internal')
  useEffect(() => {
    if (!needsPrivateRead || !identity) return
    let active = true
    void readServerVisibility('/api/account/create-visibility')
      .then(result => { if (active) setVerified({ identity, flags: { showClip: result?.showClip === true, showRecreate: result?.showRecreate === true } }) })
      .catch(() => { if (active) setVerified({ identity, flags: { showClip: false, showRecreate: false } }) })
    return () => { active = false }
  }, [identity, needsPrivateRead])
  return needsPrivateRead && verified && verified.identity === identity ? verified.flags : publicCreateNavigation(identity)
}
