'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { rememberSignupCampaign, trackEvent } from '@/lib/analytics'

const HOME_PROMPT_CAMPAIGN = 'push69_home_one_click_starters'
const HOME_PROMPT_VIEW_MARKER = 'kineo_push69_home_one_click_starters_viewed'

const STARTER_TOPICS = [
  {
    id: 'mystery_island',
    label: 'Mystery island',
    topic: 'The island so dangerous that nobody is allowed to visit',
  },
  {
    id: 'money_habits',
    label: 'Money habits',
    topic: 'Three billionaire habits that quietly compound wealth',
  },
  {
    id: 'lost_city',
    label: 'Lost city',
    topic: 'The abandoned city that was frozen in time',
  },
] as const

const MIN_PROMPT_LENGTH = 8

export default function HomeTopicForm({ isSignedIn }: { isSignedIn: boolean }) {
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Prefills the composer with a starter topic instead of navigating away —
  // the label promises a prefill, so a click must never redirect. Actual
  // submission still goes through the form's own onSubmit below.
  function selectStarter(topic: string, starterId: string) {
    const metadata = {
      source: HOME_PROMPT_CAMPAIGN,
      placement: 'home_hero_starter',
      destination: isSignedIn ? '/generate' : '/signup',
      signed_in: isSignedIn,
      starter_id: starterId,
      topic_length: topic.length,
    }
    void trackEvent('home_topic_starter_clicked', metadata, '/')
    void trackEvent('organic_topic_submitted', metadata, '/')
    setPrompt(topic)
    setError(null)
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      const end = el.value.length
      el.setSelectionRange(end, end)
    })
  }

  useEffect(() => {
    try {
      if (sessionStorage.getItem(HOME_PROMPT_VIEW_MARKER)) return
      sessionStorage.setItem(HOME_PROMPT_VIEW_MARKER, '1')
    } catch {
      // Analytics must never affect the form.
    }

    void trackEvent('home_prompt_first_viewed', {
      source: HOME_PROMPT_CAMPAIGN,
      placement: 'home_hero',
      signed_in: isSignedIn,
    }, '/')
  }, [isSignedIn])

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
    if (!isSignedIn) rememberSignupCampaign(HOME_PROMPT_CAMPAIGN)
    void trackEvent('organic_topic_submitted', {
      source: HOME_PROMPT_CAMPAIGN,
      placement: 'home_hero',
      destination: isSignedIn ? '/generate' : '/signup',
      signed_in: isSignedIn,
      topic_length: trimmed.length,
    }, '/')
    // This is a real navigation (native form GET), so `pending` is
    // intentionally never reset — the page is leaving.
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  return (
    <form
      id="try-kineo"
      className="composer"
      ref={formRef}
      action={isSignedIn ? '/generate' : '/signup'}
      method="get"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="composer-head">
        <label htmlFor="home-short-topic">What should your Short be about?</label>
        <span>Free · no card</span>
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
          setPrompt(event.target.value)
          if (error) setError(null)
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
        </p>
      )}
      <div className="topic-starters" aria-label="One-click topic starters">
        <span>Not sure? Start with:</span>
        <div>
          {STARTER_TOPICS.map((starter) => (
            <button
              key={starter.id}
              type="button"
              title={starter.topic}
              onClick={() => selectStarter(starter.topic, starter.id)}
            >
              {starter.label} →
            </button>
          ))}
        </div>
      </div>
      <input type="hidden" name="create_intent" value="fast" />
      <input type="hidden" name="intent_campaign" value={HOME_PROMPT_CAMPAIGN} />
      <input type="hidden" name="utm_source" value="homepage" />
      <button className="btn btn-w cbtn" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? 'Starting…' : 'Create my free Short →'}
      </button>
      <p className="composer-proof">Full watermarked video: script, voice, footage and captions. It starts automatically after signup.</p>
    </form>
  )
}
