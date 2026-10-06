'use client'

// KINEO-DURACAO-REWARDS-2026-10-06 — a ilha do cliente da página /tiktok-creator-rewards-length-checker.
// Toda a conta vem de lib/growth/duracaoRewards.ts (a régua da casa, espelhada e provada pelo guardião
// scripts/test-duracao-rewards-2026-10-06.mjs). Enquanto a pessoa confere, NADA sai do navegador: nenhum fetch,
// nenhum evento por tecla. O único envio é o clique no CTA (ação dela), e leva só números — nunca o texto.

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { rememberSignupCampaign, trackEvent } from '@/lib/analytics'
import {
  DURACAO_REWARDS_CAMPAIGN,
  DURACAO_REWARDS_VERSION,
  REWARDS_EXAMPLES,
  REWARDS_MIN_SECONDS,
  REWARDS_SCRIPT_MAX_CHARS,
  checkRewardsLength,
  formatClock,
  rewardsStudioHref,
  type RewardsLengthCheck,
  type RewardsVoiceCheck,
} from '@/lib/growth/duracaoRewards'

const words = (n: number) => `${n.toLocaleString('en-US')} ${n === 1 ? 'word' : 'words'}`

/** O CTA para o Studio: guarda a campanha de cadastro e mede o clique (sem o texto da pessoa). */
export function RewardsStudioCta({
  script,
  placement,
  check,
  className,
  style,
  children,
}: {
  script: string
  placement: string
  check?: RewardsLengthCheck
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const href = rewardsStudioHref(script)
  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={() => {
        rememberSignupCampaign(DURACAO_REWARDS_CAMPAIGN)
        const metadata = {
          source: DURACAO_REWARDS_CAMPAIGN,
          version: DURACAO_REWARDS_VERSION,
          placement,
          destination: '/studio',
          has_script: Boolean(script.trim()),
          narrated_words: check?.narratedWords ?? null,
          reaches_brisk: check ? check.brisk.reaches : null,
          reaches_calm: check ? check.calm.reaches : null,
        }
        void trackEvent('rewards_length_cta_clicked', metadata)
        void trackEvent('organic_cta_clicked', { source: DURACAO_REWARDS_CAMPAIGN, placement, destination: '/studio' })
      }}
    >
      {children}
    </a>
  )
}

function VoiceTile({ name, note, voice }: { name: string; note: string; voice: RewardsVoiceCheck }) {
  const pct = Math.min(100, Math.max(0, (voice.seconds / REWARDS_MIN_SECONDS) * 100))
  return (
    <article className={`drw-voice ${voice.reaches ? 'is-ok' : 'is-short'}`}>
      <p className="drw-voice-name">{name}</p>
      <p className="drw-clock">{formatClock(voice.seconds)}</p>
      <p className="drw-voice-rate">{voice.wordsPerSecond} words/sec · {note}</p>
      <p className="drw-voice-verdict">
        {voice.reaches ? '✓ Reaches 1:00' : `Add ${words(voice.missingWords)} for 1:00`}
      </p>
      <div className="drw-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
    </article>
  )
}

function verdictOf(check: RewardsLengthCheck): { tone: 'ok' | 'info' | 'warn'; title: string; detail: string } {
  if (check.status === 'no_narration') {
    return {
      tone: 'warn',
      title: 'No narration found',
      detail: 'This text looks like headings, [directions] or production notes only. Add the words the voice will actually say.',
    }
  }
  const { brisk, calm } = check
  if (brisk.reaches && calm.reaches) {
    return {
      tone: 'ok',
      title: 'Long enough for 1:00 at either pace',
      detail: `The narration alone runs ${formatClock(brisk.seconds)} at a brisk pace and ${formatClock(calm.seconds)} at a calm one, which meets TikTok's 1-minute minimum for Creator Rewards. A few extra seconds of margin never hurts.`,
    }
  }
  if (brisk.reaches || calm.reaches) {
    return {
      tone: 'info',
      title: 'Long enough only at a calm pace',
      detail: `At a brisk pace it runs ${formatClock(brisk.seconds)}. Add about ${words(brisk.missingWords)} to clear 1:00 at any pace.`,
    }
  }
  return {
    tone: 'warn',
    title: 'Too short for 1:00',
    detail: `Add about ${words(brisk.missingWords)} to clear 1:00 at a brisk pace — or ${words(calm.missingWords)} at a calm pace.`,
  }
}

export default function RewardsLengthClient() {
  const [script, setScript] = useState('')
  const check = useMemo(() => checkRewardsLength(script), [script])
  const verdict = check.status === 'empty' ? null : verdictOf(check)

  return (
    <section className="drw-tool" id="checker" aria-label="TikTok Creator Rewards length checker">
      <div className="drw-card drw-editor">
        <div className="drw-editor-head">
          <label htmlFor="drw-script">Your script</label>
          <span>
            {script.length.toLocaleString('en-US')} / {REWARDS_SCRIPT_MAX_CHARS.toLocaleString('en-US')}
          </span>
        </div>
        <textarea
          id="drw-script"
          value={script}
          onChange={(event) => setScript(event.target.value)}
          maxLength={REWARDS_SCRIPT_MAX_CHARS}
          rows={12}
          spellCheck
          placeholder="Paste the words you will narrate. HOOK labels and [B-roll] notes are fine — they are not counted."
        />
        <div className="drw-examples">
          <span>Try an example:</span>
          {REWARDS_EXAMPLES.map((example) => (
            <button key={example.id} type="button" onClick={() => setScript(example.script)}>
              {example.label}
            </button>
          ))}
          {script && (
            <button type="button" className="drw-clear" onClick={() => setScript('')}>
              Clear
            </button>
          )}
        </div>
        <p className="drw-privacy">Runs in your browser. Your script is not sent anywhere while you check.</p>
      </div>

      <div className="drw-card drw-result" aria-live="polite">
        {!verdict ? (
          <div className="drw-empty">
            <p className="drw-clock">0:00</p>
            <p>Paste a script to see how long it runs at a brisk and a calm narration pace — and how many words you still need for 1:00.</p>
          </div>
        ) : (
          <>
            <div className={`drw-verdict is-${verdict.tone}`}>
              <h2>{verdict.title}</h2>
              <p>{verdict.detail}</p>
            </div>

            {check.status === 'checked' && (
              <>
                <div className="drw-voices">
                  <VoiceTile name="Brisk pace" note="the stricter check" voice={check.brisk} />
                  <VoiceTile name="Calm pace" note="cinematic narration" voice={check.calm} />
                </div>

                <div className="drw-metrics">
                  <p>
                    <strong>{check.narratedWords.toLocaleString('en-US')}</strong>
                    <span>narrated words</span>
                  </p>
                  <p>
                    <strong>
                      {check.brisk.wordsToReach} / {check.calm.wordsToReach}
                    </strong>
                    <span>words for 1:00 (brisk / calm)</span>
                  </p>
                  <p>
                    <strong>{check.ignoredWords.toLocaleString('en-US')}</strong>
                    <span>not counted (labels, [notes])</span>
                  </p>
                </div>

                {check.calm.overShortFormMax && (
                  <p className="drw-note">
                    At a calm pace this runs {formatClock(check.calm.seconds)} — longer than a YouTube Short can be (3 minutes),
                    and Instagram does not recommend reels over 3 minutes to new audiences.
                  </p>
                )}

                <details className="drw-spoken">
                  <summary>See exactly what gets counted as narration</summary>
                  <p>{check.narration}</p>
                </details>

                <div className="drw-next">
                  <p className="drw-eyebrow">Make the video</p>
                  <h3>Type one sentence. Get a finished 60-second video — voice, captions and music included — in minutes.</h3>
                  <p>
                    Your script goes with you word for word: Kineo Studio opens with it and the 60-second length selected. Nothing
                    is generated until you press Generate, and you see the cost first.
                  </p>
                  <RewardsStudioCta script={script} placement="result" check={check} className="drw-cta">
                    Open this script in Kineo Studio →
                  </RewardsStudioCta>
                </div>
              </>
            )}
          </>
        )}
        <p className="drw-caveat">
          Estimate, not an audio measurement: voices, punctuation and pauses change the final length. Check the length TikTok
          shows when you upload.
        </p>
      </div>
    </section>
  )
}
