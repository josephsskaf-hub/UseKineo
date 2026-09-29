'use client'

import { useRef, useState } from 'react'
import { UiLabel, useUiCopy } from './InterfaceLanguage'
import { planChanges, type ComparablePlan } from '@/lib/ui/deliveryRefinement'

// Only successful plans from this creation session; never persisted or submitted.
export function usePlanComparison() {
  const last = useRef<ComparablePlan | null>(null)
  const [previousPlan, setPreviousPlan] = useState<ComparablePlan | null>(null)
  function rememberPlan(next: ComparablePlan) { setPreviousPlan(last.current); last.current = next }
  return { previousPlan, rememberPlan }
}

export default function AdsPlanChanges({ before, after }: { before: ComparablePlan | null; after: ComparablePlan }) {
  const ui = useUiCopy()
  if (!before) return null
  const changes = planChanges(before, after)
  const changed = changes.narration || changes.overlays || changes.shots.length > 0
  const pair = (oldText: string, newText: string) => <div className="plan-change-pair"><div><small><UiLabel>Previous plan</UiLabel></small><p dir="auto">{oldText || '—'}</p></div><div><small><UiLabel>Current plan</UiLabel></small><p dir="auto">{newText || '—'}</p></div></div>
  return <details className="plan-changes" open>
    <summary><UiLabel>Changes since your last plan</UiLabel></summary>
    {!changed ? <p><UiLabel>No changes to narration, on-screen text or shots.</UiLabel></p> : <>
      {changes.narration ? <section><h4><UiLabel>Narration</UiLabel></h4>{pair(before.narration ?? '', after.narration ?? '')}</section> : null}
      {changes.overlays ? <section><h4><UiLabel>On-screen text</UiLabel></h4>{pair(...[before, after].map(p => p.overlays.map(o => `${o.start}–${o.end}s · ${o.text}`).join('\n')) as [string,string])}</section> : null}
      {changes.shots.map(idx => {
        const old = before.shots.find(s => s.idx === idx), next = after.shots.find(s => s.idx === idx)
        return <section key={idx}><h4><UiLabel>Shot</UiLabel> {idx + 1}</h4>
          {pair(...[old,next].map(s => s ? `${s.cut_seconds}s · ${ui(s.kind === 'user_video' ? 'Source video' : s.kind === 'text' ? 'Still image' : s.source === 'generated_scene' ? 'AI scene' : 'Animated photo')}` : '—') as [string,string])}
          {old && next && (old.photo !== next.photo || old.source !== next.source) ? <p><UiLabel>Source media changed.</UiLabel></p> : null}
          {old && next && (old.role !== next.role || old.beat !== next.beat || old.kind !== next.kind) ? <p><UiLabel>Scene direction changed.</UiLabel></p> : null}
        </section>
      })}
    </>}
  </details>
}
