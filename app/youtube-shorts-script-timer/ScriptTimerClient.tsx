'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  SCRIPT_TIMER_TARGETS,
  timeShortsScript,
  type ScriptTimerTarget,
} from '@/lib/growth/shortsScriptTimer'

const CAMPAIGN = 'growth_script_timer_20260828'
const SAMPLE = `HOOK
The last message from Flight 19 was not a distress call.

[Pexels: vintage military aircraft over ocean]
Five Navy bombers left Florida on a routine training flight in 1945. Their compasses failed, the weather closed in, and every aircraft vanished.

PAYOFF
The official report could not name a cause. Seventy years later, the Atlantic still has not returned a single confirmed piece of the five planes.`

function formatSeconds(value: number): string {
  const rounded = Math.max(0, Math.round(value))
  const minutes = Math.floor(rounded / 60)
  const seconds = rounded % 60
  return minutes ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`
}

function formatCoverage(value: number): string {
  const percent = value * 100
  return percent < 100 ? `${percent.toFixed(1)}%` : `${Math.round(percent)}%`
}

function creationHref(script: string, duration: ScriptTimerTarget): string {
  const params = new URLSearchParams({
    prompt: script.trim(),
    create_intent: 'fast',
    script_mode: 'verbatim',
    duration: String(duration),
    intent_campaign: CAMPAIGN,
    utm_source: 'seo',
    utm_medium: 'organic',
    utm_campaign: CAMPAIGN,
  })
  return `/signup?${params.toString()}`
}

export default function ScriptTimerClient() {
  const [script, setScript] = useState('')
  const [target, setTarget] = useState<ScriptTimerTarget>(60)
  const timing = useMemo(() => timeShortsScript(script, target), [script, target])
  const progress = Math.min(100, Math.max(0, timing.coverage * 100))
  const hasResult = timing.status !== 'empty'

  const verdict = (() => {
    if (timing.status === 'no_narration') {
      return {
        label: 'No spoken narration found',
        detail: 'The text appears to contain only headings, stage directions or production notes. Add the words the voice should actually say.',
        tone: 'warning',
      }
    }
    if (timing.status === 'short') {
      const wordLabel = timing.missingWords === 1 ? 'word' : 'words'
      return {
        label: `Add about ${timing.missingWords} spoken ${wordLabel}`,
        detail: `This draft covers ${formatCoverage(timing.coverage)} of a ${target}-second slot. The Kineo planning floor is 95%, leaving room only for brief natural pauses.`,
        tone: 'warning',
      }
    }
    if (timing.status === 'long') {
      return {
        label: `Likely ${formatSeconds(timing.estimatedSeconds)}, not ${target}s`,
        detail: `Trim roughly ${timing.excessWords} words for the selected slot, or expect the spoken video to run longer.`,
        tone: 'long',
      }
    }
    return {
      label: `Ready for a ${target}-second slot`,
      detail: 'The estimated narration fills the selected duration without counting production directions as speech.',
      tone: 'ready',
    }
  })()

  return (
    <section className="timer-tool" aria-label="YouTube Shorts script timer">
      <div className="timer-editor">
        <div className="timer-editor-head">
          <label htmlFor="timer-script">Paste your script</label>
          <span>{script.length}/1000 characters</span>
        </div>
        <textarea
          id="timer-script"
          value={script}
          onChange={(event) => setScript(event.target.value)}
          maxLength={1000}
          rows={13}
          placeholder="Paste the full script — HOOK, PAYOFF and [Pexels: ...] directions are okay."
        />
        <div className="timer-actions">
          <button type="button" onClick={() => setScript(SAMPLE)}>Try a structured example</button>
          {script && <button type="button" onClick={() => setScript('')}>Clear</button>}
        </div>
        <p className="timer-privacy">Timing stays in your browser · your script is not sent while you calculate · no account or AI call</p>
      </div>

      <div className="timer-result" aria-live="polite">
        <div className="timer-target-row">
          <div>
            <p className="timer-eyebrow">Target length</p>
            <h2>What slot should this fill?</h2>
          </div>
          <div className="timer-targets" aria-label="Target duration">
            {SCRIPT_TIMER_TARGETS.map((seconds) => (
              <button
                type="button"
                key={seconds}
                className={target === seconds ? 'is-active' : ''}
                aria-pressed={target === seconds}
                onClick={() => setTarget(seconds)}
              >
                {seconds}s
              </button>
            ))}
          </div>
        </div>

        {!hasResult ? (
          <div className="timer-empty">
            <div className="timer-clock">0:00</div>
            <p>Your spoken duration, word budget and exact next step will appear here.</p>
          </div>
        ) : (
          <>
            <div className={`timer-verdict timer-verdict-${verdict.tone}`}>
              <div className="timer-clock">{formatSeconds(timing.estimatedSeconds)}</div>
              <div>
                <p className="timer-eyebrow">Estimated voiceover</p>
                <h3>{verdict.label}</h3>
                <p>{verdict.detail}</p>
              </div>
            </div>

            <div className="timer-progress" aria-label={`${formatCoverage(timing.coverage)} of target`}>
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="timer-metrics">
              <article><strong>{timing.spokenWords}</strong><span>spoken words</span></article>
              <article><strong>{timing.minimumWords}</strong><span>safe minimum</span></article>
              <article><strong>{formatCoverage(timing.coverage)}</strong><span>of target</span></article>
              <article><strong>{timing.ignoredWords}</strong><span>direction words ignored</span></article>
            </div>

            {timing.narration && (
              <details className="timer-spoken">
                <summary>See what counts as spoken narration</summary>
                <p>{timing.narration}</p>
              </details>
            )}

            {timing.narration && (
              <div className="timer-next">
                <div>
                  <p className="timer-eyebrow">Keep your exact wording</p>
                  <h3>Carry this script into Kineo.</h3>
                  <p>The script and {target}-second choice stay attached through signup. Kineo uses verbatim mode instead of silently rewriting your narration.</p>
                </div>
                <Link href={creationHref(script, target)}>Turn this script into a Short →</Link>
              </div>
            )}
          </>
        )}

        <p className="timer-caveat">Planning estimate: 2.3 spoken words per second. Voice, punctuation and delivery can change the measured audio length.</p>
      </div>
    </section>
  )
}
