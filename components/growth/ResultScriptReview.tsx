'use client'

import { useState } from 'react'
import { UiLabel, useUiCopy } from '@/components/InterfaceLanguage'
import { POST_VIDEO_CAPACITY_VERSION } from '@/lib/growth/postVideoCapacity'

export interface ResultScriptReviewProps {
  initialScript: string
  onReview: (script: string) => void
}

/** A local draft only. The existing form owns cost, mode and explicit generation. */
export default function ResultScriptReview({ initialScript, onReview }: ResultScriptReviewProps) {
  const [draft, setDraft] = useState(initialScript)
  const t = useUiCopy()
  return <section
    data-result-script-review={POST_VIDEO_CAPACITY_VERSION}
    style={{ width: '100%', maxWidth: 460, margin: '14px auto 0', padding: 14, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', color: 'var(--text)', textAlign: 'left', minWidth: 0 }}
  >
    <h3 style={{ margin: '0 0 5px', fontSize: 14, fontWeight: 750 }}><UiLabel>Want to change the story?</UiLabel></h3>
    <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.5, color: 'var(--muted2)' }}><UiLabel>Adjust the script for a new version.</UiLabel></p>
    <details>
      <summary style={{ cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 12px', fontSize: 13, fontWeight: 700, color: 'var(--accent)', minHeight: 44 }}><UiLabel>Review and adjust my script</UiLabel></summary>
      <label style={{ display: 'block', marginTop: 12 }}>
        <span style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--muted2)' }}><UiLabel>Your idea or script for the next version</UiLabel></span>
        <textarea
          value={draft}
          onChange={event => setDraft(event.target.value)}
          rows={5}
          aria-label={t('Your idea or script for the next version')}
          style={{ display: 'block', width: '100%', minWidth: 0, maxWidth: '100%', minHeight: 110, border: '1px solid var(--border)', borderRadius: 9, padding: 10, font: 'inherit', fontSize: 16, lineHeight: 1.5, color: 'var(--text)', background: 'var(--card2)', resize: 'vertical' }}
        />
      </label>
      <p style={{ margin: '8px 0 10px', fontSize: 12, lineHeight: 1.5, color: 'var(--muted2)' }}><UiLabel>This changes the script, not your finished file. Review the engine, duration and cost before generating a new version.</UiLabel></p>
      <button
        type="button"
        disabled={!draft.trim()}
        onClick={() => { if (draft.trim()) onReview(draft) }}
        style={{ display: 'block', width: '100%', minHeight: 44, padding: '11px 12px', background: 'var(--accent)', color: 'var(--on-accent)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, fontWeight: 750, cursor: draft.trim() ? 'pointer' : 'not-allowed', opacity: draft.trim() ? 1 : 0.55 }}
      ><UiLabel>Review this new version →</UiLabel></button>
    </details>
  </section>
}
