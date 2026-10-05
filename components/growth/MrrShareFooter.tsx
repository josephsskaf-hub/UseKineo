'use client'
import { mrrShareHref, MRR_SHARE_ENABLED, MRR_SHARE_VERSION } from '@/lib/growth/mrrRevenueFollowthrough'
import { useMrrVisible } from '@/lib/growth/useMrrVisible'

export default function MrrShareFooter() {
  const { root, gesture } = useMrrVisible('mrr_share', MRR_SHARE_VERSION, MRR_SHARE_ENABLED)
  if (!MRR_SHARE_ENABLED) return null
  return <div ref={root} data-mrr-share style={{ margin: '12px 0', textAlign: 'center', fontSize: 12, lineHeight: 1.5 }}>
    <a href={mrrShareHref()} onClick={gesture} style={{ color: 'var(--accent, #2997ff)', fontWeight: 600 }}>Made with Kineo — make yours free</a>
    <small style={{ display: 'block', color: 'var(--muted2, #9fb3c8)' }}>Free Seedance 15s film in supported countries. Eligibility and available trial credits apply.</small>
  </div>
}
