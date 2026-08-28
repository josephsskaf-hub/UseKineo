'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import {
  EXAMPLE_REMIX_CAMPAIGN,
  MAX_EXAMPLE_REMIX_TOPIC_LENGTH,
  exampleRemixHref,
  sanitizeExampleRemixTopic,
} from '@/lib/growth/exampleRemix'

export default function ExampleRemixForm({
  slug,
  referencePrompt,
}: {
  slug: string
  referencePrompt: string
}) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [topic, setTopic] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const element = rootRef.current
    if (!element) return
    const marker = `${EXAMPLE_REMIX_CAMPAIGN}:viewed:${slug}`
    try {
      if (sessionStorage.getItem(marker)) return
    } catch { /* the event can still be emitted once in this mount */ }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return
      observer.disconnect()
      try { sessionStorage.setItem(marker, '1') } catch { /* best effort */ }
      void trackEvent('example_remix_form_viewed', {
        version: EXAMPLE_REMIX_CAMPAIGN,
        example_slug: slug,
      })
    }, { threshold: 0.5 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [slug])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const safeTopic = sanitizeExampleRemixTopic(topic)
    if (!safeTopic) {
      setError('Add the topic for your version first.')
      return
    }
    setError(null)
    const href = exampleRemixHref({ slug, referencePrompt, topic: safeTopic })
    void trackEvent('example_remix_topic_submitted', {
      version: EXAMPLE_REMIX_CAMPAIGN,
      example_slug: slug,
      topic_length: safeTopic.length,
      destination: '/generate',
    })
    router.push(href)
  }

  return (
    <div
      ref={rootRef}
      id="remix-this-example"
      className="mt-7 scroll-mt-6 rounded-[22px] border border-cyan-300/25 bg-cyan-300/[0.06] p-5 sm:p-6"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Your version</p>
      <h2 className="mt-2 text-xl font-black tracking-tight">Keep the format. Change the story.</h2>
      <p className="mt-2 text-sm leading-6 text-white/60">
        Name your topic. Kineo carries the hook, pacing and visual structure into your Studio handoff.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <label htmlFor={`example-remix-topic-${slug}`} className="sr-only">Topic for your version</label>
          <input
            id={`example-remix-topic-${slug}`}
            value={topic}
            onChange={(event) => {
              setTopic(event.target.value)
              if (error) setError(null)
            }}
            maxLength={MAX_EXAMPLE_REMIX_TOPIC_LENGTH}
            placeholder="e.g. the Bermuda Triangle"
            className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/70"
          />
          {error ? <p className="mt-2 text-xs font-bold text-amber-300" role="alert">{error}</p> : null}
        </div>
        <button
          type="submit"
          className="rounded-xl bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-200 sm:shrink-0"
        >
          Build my version →
        </button>
      </form>
      <p className="mt-3 text-[11px] leading-5 text-white/40">No card required to start. You can edit the prompt before generating.</p>
    </div>
  )
}
