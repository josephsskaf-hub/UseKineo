'use client'

import { UiLabel } from '@/components/InterfaceLanguage'
import { nearIdeaAction } from '@/lib/growth/mrrStudio'

type Props = Parameters<typeof nearIdeaAction>[0] & {
  engineName: string
  seconds: number
  onGenerate: () => void
}

/** Reuses the Studio's final cost and guarded handler, including any character surcharge. */
export default function StudioNearIdeaAction(props: Props) {
  const action = nearIdeaAction(props)
  return <div data-mrr-near-idea style={{ marginTop: 12 }}>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', fontSize: 12, color: 'var(--muted2)', marginBottom: 8 }}>
      <span>{props.engineName} · {props.seconds}s</span>
      <a href="#studio-generation-review" style={{ color: 'var(--accent)', textUnderlineOffset: 3 }}><UiLabel>Review settings</UiLabel></a>
    </div>
    <button type="button" className={`go ${action.disabled ? 'no' : 'ok'}`} disabled={action.disabled}
      onClick={() => { if (!action.disabled) props.onGenerate() }}>
      <UiLabel>{action.label}</UiLabel>
    </button>
  </div>
}
