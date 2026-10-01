'use client'

import { useCallback, useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import { MRR_NEAR_IDEA_ENABLED, MRR_STUDIO_VERSION } from './mrrStudio'

/**
 * Session comes from trackEvent; user_id comes from the authenticated event sink.
 * No prompt, email, user_id or free-form text in metadata. Deduplicate PEOPLE in
 * analysis (user_id column), never add these mount counts as customer counts.
 * The same version/ruler runs with the visual switch OFF as a control.
 */
export function useMrrStudioFunnel() {
  const attempted = useRef(new Set<string>())
  const record = useCallback((event: 'mrr_studio_viewed' | 'mrr_idea_entered' | 'mrr_generate_clicked') => {
    if (attempted.current.has(event)) return
    attempted.current.add(event)
    void trackEvent(event, {
      version: MRR_STUDIO_VERSION,
      variant: MRR_NEAR_IDEA_ENABLED ? 'near_idea' : 'control',
      surface: 'studio',
    }).then(stored => { if (!stored) attempted.current.delete(event) })
  }, [])
  useEffect(() => { record('mrr_studio_viewed') }, [record])
  return record
}
