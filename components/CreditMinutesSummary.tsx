'use client'

import { useInterfaceLanguage, useUiCopy } from '@/components/InterfaceLanguage'
import { minutesLine } from '@/lib/credits/creditMinutes'

/** Presentation only: quantities and rounding belong to the billing-backed source. */
export default function CreditMinutesSummary({ credits, live = false }: { credits: number; live?: boolean }) {
  const language = useInterfaceLanguage()
  const ui = useUiCopy()
  const line = minutesLine(credits, undefined, ({ minutes, label }) =>
    ui('{minutes} min of {engine}')
      .replace('{minutes}', new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(minutes))
      .replace('{engine}', label),
  )
  if (!line) return null
  return (
    <div
      data-kineo="credit-minutes"
      aria-live={live ? 'polite' : undefined}
      aria-atomic={live ? true : undefined}
      lang={language}
      style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--text)', overflowWrap: 'anywhere' }}
    >
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, fontWeight: 600 }}>{line}</p>
      <p style={{ margin: '5px 0 0', fontSize: 11, lineHeight: 1.55, color: 'var(--muted)' }}>
        {ui('Alternative uses of the same credits, not added together.')}
      </p>
    </div>
  )
}
