'use client'

// KINEO-GEO-RODADA3-2026-10-08 — o timer passa a medir por FAMÍLIA DE MOTOR (o passo que cada motor de fato aplica, de
// lib/growth/scriptTimerEngines.ts) e mostra quantas palavras cabem em 35, 60 e 90 s. Tudo no navegador: nenhuma chamada de
// API, nenhum crédito. "Make this film" abre o Studio com o roteiro já preenchido (modo "Use my script as is", Seedance 1.5,
// a duração escolhida) pelo contrato de cadastro → Studio (lib/seo/geoRodada3.ts studioScriptHref): nada renderiza sozinho.
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { COMPOSE_RESCALE_TOLERANCE } from '@/lib/cinematic/classicDryRun'
import { FILM_SECONDS, estimateByEngineFamily, type FilmSeconds } from '@/lib/growth/scriptTimerEngines'
import { STUDIO_HANDOFF_MAX_CHARS, studioScriptHref } from '@/lib/seo/geoRodada3'
import { LANGUAGE_NAMES } from '@/lib/textLanguage'

const CAMPAIGN = 'growth_script_timer_20260828'
/** utm_content do botão (o mesmo nome no evento organic_cta_clicked não existe aqui: a medida é a URL). */
const MAKE_FILM_CONTENT = 'script_timer_make_film'
/** O roteiro inteiro cabe no Studio até este tamanho; a ferramenta mede até o mesmo teto. */
const TIMER_MAX_CHARS = 5000
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

function nextDuration(target: FilmSeconds): FilmSeconds | null {
  const i = FILM_SECONDS.indexOf(target)
  return i >= 0 && i < FILM_SECONDS.length - 1 ? FILM_SECONDS[i + 1] : null
}

export default function ScriptTimerClient() {
  const [script, setScript] = useState('')
  const [target, setTarget] = useState<FilmSeconds>(60)
  const result = useMemo(() => estimateByEngineFamily(script), [script])
  const classic = result.families[0]
  const cap = classic.capacity.find((c) => c.seconds === target) ?? classic.capacity[0]
  const ceiling = Math.floor(cap.words * (1 + COMPOSE_RESCALE_TOLERANCE))
  const hasResult = script.trim().length > 0
  const progress = Math.min(100, Math.max(0, cap.words > 0 ? (result.spokenWords / cap.words) * 100 : 0))

  const verdict = (() => {
    if (!result.narration.trim()) {
      return { tone: 'warning', label: 'No spoken narration found', detail: 'The text looks like headings, stage directions or production notes only. Add the words the voice should actually say.' }
    }
    if (result.spokenWords < cap.minimum) {
      const missing = cap.minimum - result.spokenWords
      return { tone: 'warning', label: `Add about ${missing} spoken ${missing === 1 ? 'word' : 'words'}`, detail: `Below ${cap.minimum} words the ${target}-second film comes out shorter — Kineo never stretches a short script.` }
    }
    if (result.spokenWords > ceiling) {
      const next = nextDuration(target)
      return { tone: 'long', label: next ? `Too long for ${target}s — try ${next}s` : `About ${formatSeconds(classic.seconds)} of narration`, detail: `Past ${ceiling} words a ${target}-second film gets its narration condensed. ${next ? `Pick ${next} seconds, or trim about ${result.spokenWords - ceiling} words.` : `Trim about ${result.spokenWords - ceiling} words to keep every word.`}` }
    }
    return { tone: 'ready', label: `Ready for a ${target}-second film`, detail: result.spokenWords > cap.words ? 'It runs a little past the target — that is fine: a story that finishes beats a story that is cut.' : 'The narration fills the length without counting labels or visual directions as speech.' }
  })()

  const fits = script.trim().length <= STUDIO_HANDOFF_MAX_CHARS
  const makeFilmHref = studioScriptHref({ text: fits ? script : '', campaign: CAMPAIGN, utmContent: MAKE_FILM_CONTENT, engine: 'seedance', scriptMode: 'verbatim', duration: target })

  return (
    <section className="timer-tool" aria-label="YouTube Shorts script timer">
      <div className="timer-editor">
        <div className="timer-editor-head">
          <label htmlFor="timer-script">Paste your script</label>
          <span>{script.length}/{TIMER_MAX_CHARS} characters</span>
        </div>
        <textarea
          id="timer-script"
          value={script}
          onChange={(event) => setScript(event.target.value)}
          maxLength={TIMER_MAX_CHARS}
          rows={13}
          placeholder="Paste the full script — HOOK, PAYOFF and [Pexels: ...] directions are okay."
        />
        <div className="timer-actions">
          <button type="button" onClick={() => setScript(SAMPLE)}>Try a structured example</button>
          {script && <button type="button" onClick={() => setScript('')}>Clear</button>}
        </div>
        <p className="timer-privacy">Runs in your browser · your script is not sent anywhere while you time it · no account, no AI call, no credits</p>
      </div>

      <div className="timer-result" aria-live="polite">
        <div className="timer-target-row">
          <div>
            <p className="timer-eyebrow">Target length</p>
            <h2>What length should this fill?</h2>
          </div>
          <div className="timer-targets" aria-label="Target duration">
            {FILM_SECONDS.map((seconds) => (
              <button type="button" key={seconds} className={target === seconds ? 'is-active' : ''} aria-pressed={target === seconds} onClick={() => setTarget(seconds)}>
                {seconds}s
              </button>
            ))}
          </div>
        </div>

        {!hasResult ? (
          <div className="timer-empty">
            <div className="timer-clock">0:00</div>
            <p>Your word count, the estimated seconds on each engine family and the next step will appear here.</p>
          </div>
        ) : (
          <>
            <div className={`timer-verdict timer-verdict-${verdict.tone}`}>
              <div className="timer-clock">{formatSeconds(classic.seconds)}</div>
              <div>
                <p className="timer-eyebrow">Estimate · {classic.engines.join(' · ')}</p>
                <h3>{verdict.label}</h3>
                <p>{verdict.detail}</p>
              </div>
            </div>

            <div className="timer-progress" aria-label={`${Math.round(progress)}% of the ${target}-second word target`}>
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="timer-metrics">
              <article><strong>{result.spokenWords}</strong><span>spoken words</span></article>
              <article><strong>{cap.minimum}–{cap.words}</strong><span>words for {target}s</span></article>
              <article><strong>{result.ignoredWords}</strong><span>direction words ignored</span></article>
              <article><strong>{LANGUAGE_NAMES[result.language] ?? result.language}</strong><span>language read</span></article>
            </div>

            <div className="timer-families" data-kineo="timer-families">
              {result.families.map((f) => (
                <article key={f.family} className="timer-family">
                  <p className="timer-eyebrow">{f.engines.join(' · ')}</p>
                  <h3>{formatSeconds(f.seconds)} <small>estimate</small></h3>
                  <p className="timer-family-voice">{f.voice} · about {f.wordsPerSecond} words per second</p>
                  <table className="timer-capacity">
                    <thead><tr><th scope="col">Length</th><th scope="col">Words that fit</th><th scope="col">Minimum</th></tr></thead>
                    <tbody>
                      {f.capacity.map((c) => (
                        <tr key={c.seconds}><th scope="row">{c.seconds}s</th><td>{c.words}</td><td>{c.minimum}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              ))}
            </div>

            {result.narration && (
              <details className="timer-spoken">
                <summary>See what counts as spoken narration</summary>
                <p>{result.narration}</p>
              </details>
            )}

            {result.narration && (
              <div className="timer-next">
                <div>
                  <p className="timer-eyebrow">Keep your exact wording</p>
                  <h3>Make this film in the Studio.</h3>
                  <p>
                    {fits
                      ? `Opens the Studio with this script, Seedance 1.5, ${target} seconds and “Use my script as is” — nothing renders until you press Generate.`
                      : `This script is longer than ${STUDIO_HANDOFF_MAX_CHARS} characters, the most a link can carry: the Studio opens on Seedance 1.5 at ${target} seconds — paste it there.`}
                  </p>
                </div>
                <Link href={makeFilmHref} data-kineo="make-this-film">Make this film →</Link>
              </div>
            )}
          </>
        )}

        <p className="timer-caveat">
          Estimates, not audio measurements: {classic.engines.join(', ')} are timed at the pace of the Kineo narrator voice your script would get ({classic.wordsPerSecond} words per second for this one); {result.families[1].engines.join(', ')} at {result.families[1].wordsPerSecond}. The “minimum” is the floor Kineo checks before it renders.
        </p>
      </div>
    </section>
  )
}
