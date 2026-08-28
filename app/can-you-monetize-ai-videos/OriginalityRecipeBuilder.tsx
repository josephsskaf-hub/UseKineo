'use client'

import { useMemo, useState } from 'react'
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
  const prompt = useMemo(() => buildOriginalityPrompt(topic, recipeId), [topic, recipeId])

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
        YouTube does not reward an AI label; it rewards a reason to watch. Add your topic, choose the value you want to give the viewer, and Kineo will carry that recipe into a free first draft.
      </p>

      <form
        action="/signup"
        method="get"
        onSubmit={() => {
          rememberSignupCampaign(CAMPAIGN)
          const metadata = {
            source: CAMPAIGN,
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
          onChange={(event) => setTopic(event.target.value)}
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
                    onChange={() => setRecipeId(option.id)}
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
