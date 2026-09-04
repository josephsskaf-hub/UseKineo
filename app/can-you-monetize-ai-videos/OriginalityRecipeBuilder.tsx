'use client'

import { useMemo, useRef, useState } from 'react'
import { rememberSignupCampaign, trackEvent } from '@/lib/analytics'
import {
  buildOriginalityPrompt,
  ORIGINALITY_RECIPE_OPTIONS,
  type OriginalityRecipeId,
} from '@/lib/growth/originalityRecipe'

const CAMPAIGN = 'starter_monetization_originality_2026_08_28'

export default function OriginalityRecipeBuilder() {
  const [topic, setTopic] = useState('')
  const [recipeId, setRecipeId] = useState<OriginalityRecipeId>('surprising_explanation')
  const [copyStatus, setCopyStatus] = useState('')
  const [error, setError] = useState('')
  const briefRef = useRef<HTMLTextAreaElement | null>(null)
  const prompt = useMemo(() => buildOriginalityPrompt(topic, recipeId), [topic, recipeId])
  const hasTopic = topic.trim().length >= 3

  async function copyBrief() {
    if (!hasTopic) return
    try {
      await navigator.clipboard.writeText(prompt)
      setCopyStatus('Brief copied.')
      void trackEvent('monetization_originality_brief_copied', {
        source: CAMPAIGN,
        version: 'originality_brief_preview_v1',
        recipe_id: recipeId,
      })
    } catch {
      briefRef.current?.focus()
      briefRef.current?.select()
      setCopyStatus('Select and copy the brief below. You can still continue to signup.')
    }
  }

  return (
    <section
      id="monetization-originality-builder"
      aria-labelledby="monetization-originality-heading"
      style={{
        scrollMarginTop: 24,
        margin: '0 0 48px',
        padding: 22,
        border: '1px solid rgba(41,151,255,0.45)',
        borderRadius: 18,
        background: 'linear-gradient(145deg, rgba(41,151,255,0.12), rgba(255,255,255,0.025))',
      }}
    >
      <p style={{ color: '#2997ff', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
        Put the policy into practice
      </p>
      <h2 id="monetization-originality-heading" style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 8px' }}>
        Build an original angle for your next Short
      </h2>
      <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 18px' }}>
        Add your topic and choose what the viewer should get from it. Read and copy your brief here, then continue to Kineo when you are ready to make the video.
      </p>

      <form
        action="/signup"
        method="get"
        onSubmit={(event) => {
          if (!hasTopic) {
            event.preventDefault()
            setError('Add a topic with at least 3 characters.')
            return
          }
          rememberSignupCampaign(CAMPAIGN)
          const metadata = {
            source: CAMPAIGN,
            brief_version: 'originality_brief_preview_v1',
            placement: 'after_policy_checklist',
            recipe_id: recipeId,
            topic_length: topic.trim().length,
            duration_seconds: 45,
            destination: '/signup',
          }
          void trackEvent('monetization_originality_recipe_submitted', metadata)
          void trackEvent('organic_topic_submitted', metadata)
          void trackEvent('organic_cta_clicked', {
            ...metadata,
            mirrors: 'organic_topic_submitted',
          })
        }}
      >
        <label htmlFor="monetization-originality-topic" style={{ display: 'block', color: '#f5f5f7', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
          1. What is your video about?
        </label>
        <input
          id="monetization-originality-topic"
          value={topic}
          onChange={(event) => {
            setTopic(event.target.value)
            setCopyStatus('')
            setError('')
          }}
          required
          minLength={3}
          maxLength={180}
          placeholder="e.g. Why most people remember dreams incorrectly"
          style={{
            display: 'block',
            width: '100%',
            border: '1px solid #3a3a3d',
            borderRadius: 12,
            background: '#0b0b0d',
            color: '#f5f5f7',
            padding: '13px 14px',
            font: 'inherit',
            fontSize: 16,
          }}
        />
        {error ? <p role="alert" style={{ color: '#ffb86b', fontSize: 13 }}>{error}</p> : null}

        <fieldset style={{ border: 0, padding: 0, margin: '18px 0 0' }}>
          <legend style={{ color: '#f5f5f7', fontSize: 13, fontWeight: 800, marginBottom: 9 }}>
            2. What should the viewer get from it?
          </legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 9 }}>
            {ORIGINALITY_RECIPE_OPTIONS.map((option) => {
              const selected = option.id === recipeId
              return (
                <label
                  key={option.id}
                  style={{
                    display: 'block',
                    border: `1px solid ${selected ? '#2997ff' : '#343438'}`,
                    borderRadius: 12,
                    background: selected ? 'rgba(41,151,255,0.14)' : '#161618',
                    padding: '12px 13px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="originality_recipe"
                    value={option.id}
                    checked={selected}
                    onChange={() => {
                      setRecipeId(option.id)
                      setCopyStatus('')
                    }}
                    style={{ marginRight: 8 }}
                  />
                  <strong style={{ color: '#f5f5f7', fontSize: 13 }}>{option.label}</strong>
                  <span style={{ display: 'block', color: '#86868b', fontSize: 12, lineHeight: 1.45, margin: '5px 0 0 22px' }}>
                    {option.description}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {hasTopic ? (
          <div style={{ marginTop: 20 }}>
            <label htmlFor="originality-brief-preview" style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
              Your video brief — ready to keep
            </label>
            <p style={{ color: '#86868b', fontSize: 12, lineHeight: 1.5, margin: '0 0 10px' }}>
              This is the direction for your video, not a finished narration. The same text goes with you through signup.
            </p>
            <textarea
              ref={briefRef}
              id="originality-brief-preview"
              readOnly
              value={prompt}
              rows={7}
              style={{ boxSizing: 'border-box', width: '100%', resize: 'vertical', border: '1px solid #3a3a3d', borderRadius: 12, background: '#0b0b0d', color: '#d2d2d7', padding: 14, font: 'inherit', fontSize: 14, lineHeight: 1.6 }}
            />
            <button type="button" onClick={copyBrief} style={{ marginTop: 8, border: '1px solid #54545a', borderRadius: 10, background: 'transparent', color: '#f5f5f7', padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
              Copy brief
            </button>
            <p role="status" style={{ color: '#d2d2d7', fontSize: 12, minHeight: 18 }}>{copyStatus}</p>
          </div>
        ) : null}

        <input type="hidden" name="prompt" value={prompt} />
        <input type="hidden" name="create_intent" value="fast" />
        <input type="hidden" name="intent_campaign" value={CAMPAIGN} />
        <input type="hidden" name="utm_source" value="seo" />
        <input type="hidden" name="utm_medium" value="organic" />
        <input type="hidden" name="utm_campaign" value={CAMPAIGN} />
        <input type="hidden" name="language" value="en" />
        <input type="hidden" name="duration" value="45" />

        <button
          type="submit"
          style={{
            display: 'block',
            width: '100%',
            marginTop: 16,
            border: 0,
            borderRadius: 999,
            background: '#f5f5f7',
            color: '#000',
            padding: '14px 20px',
            fontSize: 15,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          Create this original Short →
        </button>
        <p style={{ color: '#86868b', fontSize: 12, lineHeight: 1.5, margin: '11px 0 0' }}>
          Your recipe stays attached through signup. The free Fast workflow requires no card. Original structure helps, but no tool can guarantee YouTube monetization.
        </p>
      </form>
    </section>
  )
}
