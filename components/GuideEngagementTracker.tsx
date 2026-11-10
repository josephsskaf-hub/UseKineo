'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import { attachGuideEngagement } from '@/lib/seo/guideEngagement'

export default function GuideEngagementTracker({ path }: { path: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-guia-ia="KINEO-GUIAS-IA-1610"]')
    if (!root) return
    try { return attachGuideEngagement(root, path, trackEvent, window, document) }
    catch { /* analytics cannot break the guide */ }
  }, [path])
  return null
}
