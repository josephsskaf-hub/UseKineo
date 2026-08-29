'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import {
  buildShortsPublishKit,
  type PublishKitPlatform,
  type PublishKitTone,
  type ShortsPublishKit,
} from '@/lib/growth/shortsPublishKit'

const CAMPAIGN = 'growth_publish_kit_20260828'
const EXAMPLES = [
  'The mystery of Flight 19',
  'Why compound interest feels slow at first',
  'What AI changes for small businesses',
] as const

function creationHref(topic: string): string {
  const params = new URLSearchParams({
    prompt: topic.trim().slice(0, 140),
    create_intent: 'fast',
    intent_campaign: CAMPAIGN,
    utm_source: 'seo',
    utm_medium: 'organic',
    utm_campaign: CAMPAIGN,
  })
  return `/signup?${params.toString()}`
}

export default function PublishKitClient() {
  const [topic, setTopic] = useState('')
  const [takeaway, setTakeaway] = useState('')
  const [tone, setTone] = useState<PublishKitTone>('curiosity')
  const [platform, setPlatform] = useState<PublishKitPlatform>('youtube')
  const [kit, setKit] = useState<ShortsPublishKit | null>(null)
  const [generatedTopic, setGeneratedTopic] = useState('')
  const [selectedTitle, setSelectedTitle] = useState('')
  const [copied, setCopied] = useState('')

  function generate(nextTopic = topic) {
    const cleanTopic = nextTopic.trim()
    if (cleanTopic.length < 3) return
    const result = buildShortsPublishKit({ topic: cleanTopic, takeaway, tone, platform })
    setKit(result)
    setGeneratedTopic(cleanTopic)
    setSelectedTitle(result.titles[0] ?? '')
    setCopied('')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    generate()
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(''), 1800)
    } catch {
      setCopied('Copy unavailable — select the text instead')
    }
  }

  const fullPack = kit
    ? `${selectedTitle || kit.titles[0]}\n\n${kit.description}\n\n${kit.hashtags.join(' ')}`
    : ''

  return (
    <>
      <form className="publish-form" onSubmit={submit}>
        <label htmlFor="publish-topic">What is the Short about?</label>
        <textarea
          id="publish-topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          required
          minLength={3}
          maxLength={140}
          rows={2}
          placeholder="e.g. The mystery of Flight 19"
        />

        <div className="publish-row">
          <label>
            Tone
            <select value={tone} onChange={(event) => setTone(event.target.value as PublishKitTone)}>
              <option value="curiosity">Curiosity</option>
              <option value="clear">Clear explainer</option>
              <option value="story">Story</option>
              <option value="business">Business</option>
            </select>
          </label>
          <label>
            Publishing on
            <select value={platform} onChange={(event) => setPlatform(event.target.value as PublishKitPlatform)}>
              <option value="youtube">YouTube Shorts</option>
              <option value="tiktok">TikTok</option>
              <option value="both">Both</option>
            </select>
          </label>
        </div>

        <label htmlFor="publish-takeaway">Main takeaway <span>(optional)</span></label>
        <input
          id="publish-takeaway"
          value={takeaway}
          onChange={(event) => setTakeaway(event.target.value)}
          maxLength={220}
          placeholder="The one fact your video actually proves"
        />

        <button type="submit">Build my publishing kit →</button>

        <div className="publish-examples" aria-label="Example topics">
          {EXAMPLES.map((example) => (
            <button
              type="button"
              key={example}
              onClick={() => {
                setTopic(example)
                generate(example)
              }}
            >
              {example} →
            </button>
          ))}
        </div>
        <p className="publish-privacy">Runs entirely in your browser · no signup · no upload · no API call</p>
      </form>

      {kit && (
        <section className="publish-results" aria-live="polite" aria-labelledby="publish-results-title">
          <div className="publish-result-head">
            <div>
              <p className="publish-eyebrow">Ready to edit and post</p>
              <h2 id="publish-results-title">Your Shorts publishing kit</h2>
            </div>
            <button type="button" onClick={() => copy('Full kit copied', fullPack)}>
              {copied === 'Full kit copied' ? 'Copied ✓' : 'Copy full kit'}
            </button>
          </div>

          <div className="publish-section">
            <div className="publish-section-title">
              <h3>Choose one title</h3>
              <span>{selectedTitle.length}/72 characters</span>
            </div>
            <div className="publish-title-list">
              {kit.titles.map((title, index) => (
                <button
                  type="button"
                  key={title}
                  className={selectedTitle === title ? 'is-selected' : ''}
                  onClick={() => setSelectedTitle(title)}
                >
                  <span>{index + 1}</span>
                  {title}
                </button>
              ))}
            </div>
          </div>

          <div className="publish-output-grid">
            <article className="publish-output-card">
              <div className="publish-section-title"><h3>Description</h3></div>
              <textarea readOnly value={kit.description} rows={6} aria-label="Generated description" />
              <button type="button" onClick={() => copy('Description copied', kit.description)}>
                {copied === 'Description copied' ? 'Copied ✓' : 'Copy description'}
              </button>
            </article>
            <article className="publish-output-card">
              <div className="publish-section-title"><h3>Hashtags</h3><span>{kit.hashtags.length} focused tags</span></div>
              <textarea readOnly value={kit.hashtags.join(' ')} rows={6} aria-label="Generated hashtags" />
              <button type="button" onClick={() => copy('Hashtags copied', kit.hashtags.join(' '))}>
                {copied === 'Hashtags copied' ? 'Copied ✓' : 'Copy hashtags'}
              </button>
            </article>
          </div>

          <p className="publish-honesty">A title cannot make a video viral. Keep only wording that your Short actually supports; do not turn curiosity into a false claim.</p>

          <div className="publish-next">
            <div>
              <p className="publish-eyebrow">Need the video too?</p>
              <h3>Carry “{generatedTopic}” into Kineo.</h3>
              <p>The topic stays attached through signup so you do not type it twice. The free Fast test does not require a card.</p>
            </div>
            <Link href={creationHref(generatedTopic)}>Turn this topic into a Short →</Link>
          </div>
        </section>
      )}
    </>
  )
}
