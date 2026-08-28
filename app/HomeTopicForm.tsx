'use client'

// PUSH #101 — kill the pre-value auth wall on the home hero.
//
// Before: an anonymous submit was a native GET to /signup. A stranger was asked
// to create an account before seeing this product do ANYTHING. Measured cost:
// 113 hero views → 10 actions (95.7% loss at this component).
//
// Now: an anonymous submit generates the visitor's real Short script INLINE, in
// the hero, with no account, using the already-public /api/demo-script route
// (no auth, per-IP capped, gpt-4o-mini, no DB writes, no credits — see
// app/api/demo-script/route.ts, whose own header comment says it exists so
// "visitors feel the magic BEFORE signing up" on the home hero). Only once the
// script is on screen does the wall appear, in its honest form: rendering the
// VIDEO needs a free account. That is the moment the requirement becomes true.
//
// Signed-in behaviour is untouched: the form still performs its native GET to
// /generate with the same hidden fields, same button label, same proof line.
//
// The post-script CTA reuses the EXISTING signup hand-off — /signup?prompt=…&
// create_intent=fast&intent_campaign=…&utm_source=homepage — which
// activationRedirectFromSearch() in app/(auth)/signup/page.tsx already forwards
// into /generate. No second carry-forward mechanism is invented here. The FACT
// labels are translated into the engine's section markers (HOOK / MICRO REWARD
// n / ESCALATION / PAYOFF) exactly as app/free-script-generator/FreeScriptClient.tsx
// does, so analyze-idea takes its verbatim pre-written-script path instead of
// rewriting the script the visitor just approved.

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { rememberSignupCampaign, trackEvent } from '@/lib/analytics'

const HOME_PROMPT_CAMPAIGN = 'push69_home_one_click_starters'
const HOME_PROMPT_VIEW_MARKER = 'kineo_push69_home_one_click_starters_viewed'

const MIN_PROMPT_LENGTH = 8

// app/(auth)/signup/page.tsx slices the forwarded ?prompt= at 1000 chars, so the
// script we hand off must already fit — a mid-sentence truncation would reach
// /generate as a broken PAYOFF.
const ACTIVATION_PROMPT_MAX = 1000
const ACTIVATION_LINE_MAX = 200

type ScriptLine = { label: string; text: string }

function parseScript(raw: string): ScriptLine[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf(':')
      if (i > 0 && i < 16) {
        return { label: line.slice(0, i).toUpperCase(), text: line.slice(i + 1).trim() }
      }
      return { label: '', text: line }
    })
    .filter((line) => line.text.length > 0)
}

// The public demo returns reader-friendly FACT labels. /generate and
// /api/analyze-idea recognise the engine's own section markers, so translate
// before hand-off — same mapping as the free script generator page.
function markerFor(label: string): string {
  const normalized = label.replace(/\s+/g, ' ').trim().toUpperCase()
  if (normalized === 'HOOK') return 'HOOK'
  if (normalized === 'FACT 1') return 'MICRO REWARD 1'
  if (normalized === 'FACT 2') return 'MICRO REWARD 2'
  if (normalized === 'FACT 3') return 'ESCALATION'
  if (normalized === 'PAYOFF') return 'PAYOFF'
  return label
}

function buildActivationPrompt(lines: ScriptLine[]): string {
  const out: string[] = []
  let used = 0
  for (const line of lines.slice(0, 5)) {
    const marker = markerFor(line.label)
    const text = line.text.slice(0, ACTIVATION_LINE_MAX)
    const rendered = marker ? `${marker}: ${text}` : text
    // +1 for the newline join. Drop whole lines rather than cutting a sentence.
    const cost = rendered.length + (out.length > 0 ? 1 : 0)
    if (used + cost > ACTIVATION_PROMPT_MAX) break
    out.push(rendered)
    used += cost
  }
  return out.join('\n')
}

// Reuses the homepage's existing signup hand-off contract: the same hidden
// fields the form has always submitted, with the generated script standing in
// for the raw topic so nothing is retyped after signup.
function signupHref(prompt: string): string {
  const params = new URLSearchParams({
    prompt,
    create_intent: 'fast',
    intent_campaign: HOME_PROMPT_CAMPAIGN,
    utm_source: 'homepage',
  })
  return `/signup?${params.toString()}`
}

type HomeTopicFormProps = {
  isSignedIn: boolean
  acquisitionSource?: 'chatgpt' | 'taaft' | null
}

export default function HomeTopicForm({
  isSignedIn,
  acquisitionSource = null,
}: HomeTopicFormProps) {
  const trackingPlacement = acquisitionSource ? 'home_referral_bridge' : 'home_hero'
  const resultPlacement = acquisitionSource
    ? 'home_referral_bridge_script_result'
    : 'home_hero_script_result'
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [lines, setLines] = useState<ScriptLine[]>([])
  const [scriptTopic, setScriptTopic] = useState('')
  const formRef = useRef<HTMLFormElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const resultRef = useRef<HTMLDivElement | null>(null)

  const hasScript = lines.length > 0
  const activationPrompt = hasScript ? buildActivationPrompt(lines) : ''
  // Fallback destination when the free script cannot be written: degrade to the
  // pre-#101 behaviour (raw topic → signup) instead of leaving a dead end.
  const fallbackHref = signupHref(prompt.trim().slice(0, ACTIVATION_PROMPT_MAX))

  useEffect(() => {
    try {
      if (sessionStorage.getItem(HOME_PROMPT_VIEW_MARKER)) return
      sessionStorage.setItem(HOME_PROMPT_VIEW_MARKER, '1')
    } catch {
      // Analytics must never affect the form.
    }

    void trackEvent('home_prompt_first_viewed', {
      source: HOME_PROMPT_CAMPAIGN,
      placement: trackingPlacement,
      acquisition_source: acquisitionSource,
      signed_in: isSignedIn,
    }, '/')
  }, [acquisitionSource, isSignedIn, trackingPlacement])

  // Anonymous inline generation. Never throws — every exit path clears `pending`
  // and either shows a script or shows an error with a working way forward.
  async function runFreeScript(topic: string) {
    void trackEvent('home_free_script_requested', {
      source: HOME_PROMPT_CAMPAIGN,
      placement: trackingPlacement,
      acquisition_source: acquisitionSource,
      topic_length: topic.length,
    }, '/')

    try {
      const res = await fetch('/api/demo-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      const data = await res.json().catch(() => ({} as { script?: string; error?: string }))

      if (!res.ok) {
        setError(typeof data?.error === 'string' && data.error ? data.error : 'Could not write your script. Try again.')
        void trackEvent('home_free_script_failed', {
          source: HOME_PROMPT_CAMPAIGN,
          placement: trackingPlacement,
          acquisition_source: acquisitionSource,
          reason: res.status === 429 ? 'rate_limited' : 'http_error',
          status: res.status,
        }, '/')
        return
      }

      const parsed = parseScript(typeof data?.script === 'string' ? data.script : '')
      if (parsed.length === 0) {
        setError('Could not write your script. Try again.')
        void trackEvent('home_free_script_failed', {
          source: HOME_PROMPT_CAMPAIGN,
          placement: trackingPlacement,
          acquisition_source: acquisitionSource,
          reason: 'empty_script',
        }, '/')
        return
      }

      setLines(parsed)
      setScriptTopic(topic)
      void trackEvent('home_free_script_succeeded', {
        source: HOME_PROMPT_CAMPAIGN,
        placement: trackingPlacement,
        acquisition_source: acquisitionSource,
        topic_length: topic.length,
        line_count: parsed.length,
      }, '/')
      requestAnimationFrame(() => {
        try {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        } catch {
          // Scrolling is a nicety — never let it break the result.
        }
      })
    } catch {
      setError('Network error. Try again.')
      void trackEvent('home_free_script_failed', {
        source: HOME_PROMPT_CAMPAIGN,
        placement: trackingPlacement,
        acquisition_source: acquisitionSource,
        reason: 'network_error',
      }, '/')
    } finally {
      setPending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) {
      // Guard against double-submit (e.g. Enter + a click landing together).
      event.preventDefault()
      return
    }
    const trimmed = prompt.trim()
    if (trimmed.length < MIN_PROMPT_LENGTH) {
      event.preventDefault()
      setError(
        trimmed.length === 0
          ? 'Type a topic for your Short first.'
          : `Give us a bit more detail — at least ${MIN_PROMPT_LENGTH} characters.`,
      )
      textareaRef.current?.focus()
      return
    }
    setError(null)
    setPending(true)

    if (isSignedIn) {
      void trackEvent('organic_topic_submitted', {
        source: HOME_PROMPT_CAMPAIGN,
        placement: trackingPlacement,
        acquisition_source: acquisitionSource,
        destination: '/generate',
        signed_in: true,
        topic_length: trimmed.length,
      }, '/')
      // Unchanged signed-in path: this is a real navigation (native form GET),
      // so `pending` is intentionally never reset — the page is leaving.
      return
    }

    // Anonymous: no navigation, no auth wall. Deliver the script here.
    event.preventDefault()
    rememberSignupCampaign(HOME_PROMPT_CAMPAIGN)
    void trackEvent('organic_topic_submitted', {
      source: HOME_PROMPT_CAMPAIGN,
      placement: trackingPlacement,
      acquisition_source: acquisitionSource,
      destination: 'inline_script',
      signed_in: false,
      topic_length: trimmed.length,
    }, '/')
    setLines([])
    setScriptTopic('')
    void runFreeScript(trimmed)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  function handleCtaClick() {
    rememberSignupCampaign(HOME_PROMPT_CAMPAIGN)
    void trackEvent('home_free_script_cta_clicked', {
      source: HOME_PROMPT_CAMPAIGN,
      placement: resultPlacement,
      acquisition_source: acquisitionSource,
      destination: '/signup',
      line_count: lines.length,
      script_length: activationPrompt.length,
    }, '/')
    void trackEvent('organic_cta_clicked', {
      source: HOME_PROMPT_CAMPAIGN,
      placement: resultPlacement,
      acquisition_source: acquisitionSource,
    }, '/')
  }

  const submitLabel = isSignedIn
    ? (pending ? 'Starting…' : 'Create my free Short →')
    : (pending ? 'Writing your script…' : hasScript ? 'Write a new script →' : 'Write my script — free, no signup →')

  // KINEO-HERO-NO-CHIPS-2026-08-05 — os três atalhos de tópico ("Mystery
  // island" etc.) e a legenda "Not sure? Start with:" foram REMOVIDOS por
  // decisão do fundador após ver no ar: as "bolhas na lateral" poluíam o hero.
  // O <form> continua sendo o SHELL (sem moldura) com o card .composer como
  // filho — mas agora, sem as colunas laterais, o card ocupa a largura toda do
  // shell no desktop. Nada muda em eventos restantes, querystring, submit ou
  // estados; só o evento home_topic_starter_clicked deixa de existir na home.
  return (
    <form
      id="try-kineo"
      className="composer-shell"
      ref={formRef}
      action={isSignedIn ? '/generate' : '/signup'}
      method="get"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="composer">
        <div className="composer-head">
          <label htmlFor="home-short-topic">What should your Short be about?</label>
          <span>{isSignedIn ? 'Free · no card' : 'Free · no signup'}</span>
        </div>
        <textarea
          id="home-short-topic"
          className="ci"
          name="prompt"
          rows={3}
          required
          minLength={MIN_PROMPT_LENGTH}
          maxLength={1000}
          value={prompt}
          ref={textareaRef}
          onChange={(event) => {
            const next = event.target.value
            setPrompt(next)
            if (error) setError(null)
            // The result belongs to the topic that produced it — drop it once the
            // visitor edits away from that topic so nothing stale is handed off.
            if (hasScript && next.trim() !== scriptTopic) {
              setLines([])
              setScriptTopic('')
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a topic — e.g. the island too dangerous to visit"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'home-short-topic-error' : undefined}
        />
        {error && (
          <p
            id="home-short-topic-error"
            role="alert"
            style={{ color: '#ff6b6b', fontSize: '0.85rem', margin: '6px 0 0' }}
          >
            {error}
            {!isSignedIn && prompt.trim().length >= MIN_PROMPT_LENGTH && (
              <>
                {' '}
                <a href={fallbackHref} style={{ color: '#2997ff', fontWeight: 700 }}>
                  Create my Short anyway →
                </a>
              </>
            )}
          </p>
        )}
        <input type="hidden" name="create_intent" value="fast" />
        <input type="hidden" name="intent_campaign" value={HOME_PROMPT_CAMPAIGN} />
        <input type="hidden" name="utm_source" value="homepage" />
        <button className="btn btn-w cbtn" type="submit" disabled={pending} aria-busy={pending}>
          {submitLabel}
        </button>

        {/* Anonymous-only: the script itself, then the honest wall. */}
        {!isSignedIn && (
          <div ref={resultRef} aria-live="polite">
            {pending && (
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 13,
                  padding: 16,
                  background: 'rgba(255,255,255,0.02)',
                  fontSize: 13,
                  color: '#86868b',
                }}
              >
                Writing your hook, three facts and the payoff…
              </div>
            )}
            {!pending && hasScript && (
              <div
                style={{
                  border: '1px solid rgba(41,151,255,0.25)',
                  borderRadius: 13,
                  padding: 18,
                  background: 'rgba(41,151,255,0.06)',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#2997ff',
                    marginBottom: 12,
                  }}
                >
                  Your script · free, no account
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {lines.map((line, i) => (
                    <div key={i}>
                      {line.label && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: '0.06em',
                            color: '#2997ff',
                            marginBottom: 2,
                          }}
                        >
                          {line.label}
                        </div>
                      )}
                      <div style={{ fontSize: 14.5, lineHeight: 1.5, color: '#f5f5f7' }}>{line.text}</div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#86868b', margin: '0 0 10px' }}>
                    This script is yours to keep. Rendering it into a video — AI voice, footage and
                    captions — needs a free account. No card. Your script comes with you.
                  </p>
                  <a
                    className="btn btn-w"
                    href={signupHref(activationPrompt)}
                    onClick={handleCtaClick}
                    style={{ textDecoration: 'none' }}
                  >
                    Turn this into a video — free, no card →
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* KINEO-HERO-DECLUTTER-2026-07-30 — esta linha dizia, com 148 caracteres,
            duas coisas que a página já dizia acima dela. O subtítulo do herói é
            "Script, voice, captions and scenes in a few minutes" e o próprio card
            se chama "What should your Short be about?". Repetir "script, voice,
            footage and captions" aqui era a terceira vez na mesma dobra.
            Do texto antigo sobrou só o que era informação NOVA: quanto tempo
            demora. Menos texto no momento da ação, e nada perdido. */}
        <p className="composer-proof">
          {isSignedIn
            ? 'Starts rendering instantly — usually 3–7 minutes.'
            : 'Full script in seconds — no account, no card.'}
        </p>
      </div>
    </form>
  )
}
