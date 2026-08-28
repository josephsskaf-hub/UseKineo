'use client'

import { useState } from 'react'
import { rememberSignupCampaign, trackEvent } from '@/lib/analytics'
import {
  decidePlatformRoute,
  type PlatformContentType,
  type PlatformGoal,
} from '@/lib/platformDecision'

const CAMPAIGN = 'platform_decision_route'

const GOALS: { id: PlatformGoal; label: string; note: string }[] = [
  { id: 'reach', label: 'Grow reach fast', note: 'Learn from distribution quickly' },
  { id: 'revenue', label: 'Build creator revenue', note: 'Create an evergreen content library' },
  { id: 'customers', label: 'Win customers', note: 'Turn expertise into trust and leads' },
]

const CONTENT_TYPES: { id: PlatformContentType; label: string }[] = [
  { id: 'stories', label: 'Stories & mysteries' },
  { id: 'expertise', label: 'How-to & expertise' },
  { id: 'business', label: 'Products & businesses' },
]

const buttonBase = {
  border: '1px solid #3a3a3d',
  borderRadius: 12,
  background: '#0b0b0d',
  color: '#f5f5f7',
  padding: '12px 14px',
  textAlign: 'left' as const,
  cursor: 'pointer',
}

export default function PlatformDecisionClient() {
  const [goal, setGoal] = useState<PlatformGoal | null>(null)
  const [contentType, setContentType] = useState<PlatformContentType | null>(null)
  const decision = goal && contentType ? decidePlatformRoute(goal, contentType) : null

  function chooseGoal(nextGoal: PlatformGoal) {
    setGoal(nextGoal)
    setContentType(null)
    void trackEvent('platform_route_goal_selected', {
      source: CAMPAIGN,
      goal: nextGoal,
    })
  }

  function chooseContent(nextContentType: PlatformContentType) {
    if (!goal) return
    setContentType(nextContentType)
    const nextDecision = decidePlatformRoute(goal, nextContentType)
    void trackEvent('platform_route_completed', {
      source: CAMPAIGN,
      goal,
      content_type: nextContentType,
      recommendation: nextDecision.primary,
      duration_seconds: nextDecision.duration,
    })
  }

  const signupHref = decision
    ? `/signup?${new URLSearchParams({
        prompt: decision.prompt,
        create_intent: 'fast',
        intent_campaign: CAMPAIGN,
        utm_source: 'tiktok-vs-youtube-shorts',
        utm_medium: 'organic',
        utm_campaign: CAMPAIGN,
        duration: String(decision.duration),
      }).toString()}`
    : '/signup'

  return (
    <div>
      <div>
        <p style={{ color: '#f5f5f7', fontSize: 13, fontWeight: 800, margin: '0 0 9px' }}>
          1. What matters most right now?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
          {GOALS.map((item) => {
            const selected = goal === item.id
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseGoal(item.id)}
                style={{
                  ...buttonBase,
                  borderColor: selected ? '#2997ff' : '#3a3a3d',
                  background: selected ? 'rgba(41,151,255,0.14)' : '#0b0b0d',
                }}
              >
                <strong style={{ display: 'block', fontSize: 14 }}>{item.label}</strong>
                <span style={{ display: 'block', color: '#86868b', fontSize: 12, lineHeight: 1.4, marginTop: 4 }}>
                  {item.note}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {goal && (
        <div style={{ marginTop: 18 }}>
          <p style={{ color: '#f5f5f7', fontSize: 13, fontWeight: 800, margin: '0 0 9px' }}>
            2. What do you publish?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CONTENT_TYPES.map((item) => {
              const selected = contentType === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseContent(item.id)}
                  style={{
                    ...buttonBase,
                    flex: '1 1 160px',
                    borderColor: selected ? '#2997ff' : '#3a3a3d',
                    background: selected ? 'rgba(41,151,255,0.14)' : '#0b0b0d',
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {decision && goal && contentType && (
        <div
          aria-live="polite"
          style={{
            marginTop: 20,
            border: '1px solid #2997ff',
            borderRadius: 14,
            background: 'linear-gradient(145deg, rgba(41,151,255,0.14), rgba(255,255,255,0.025))',
            padding: 18,
          }}
        >
          <span style={{ color: '#76baff', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Your first lane
          </span>
          <h3 style={{ fontSize: 22, margin: '6px 0 8px' }}>{decision.primary}</h3>
          <p style={{ color: '#d2d2d7', fontSize: 14, lineHeight: 1.55, margin: '0 0 8px' }}>
            {decision.reason}
          </p>
          <p style={{ color: '#86868b', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px' }}>
            Next move: {decision.secondMove}
          </p>
          <a
            href={signupHref}
            onClick={() => {
              rememberSignupCampaign(CAMPAIGN)
              const metadata = {
                source: CAMPAIGN,
                placement: 'decision_result',
                goal,
                content_type: contentType,
                recommendation: decision.primary,
                duration_seconds: decision.duration,
                destination: '/signup',
              }
              void trackEvent('platform_route_cta_clicked', metadata)
              void trackEvent('organic_cta_clicked', metadata)
            }}
            style={{
              display: 'inline-block',
              background: '#2997ff',
              color: '#000',
              fontWeight: 900,
              padding: '12px 18px',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            Create the recommended first video →
          </a>
          <p style={{ color: '#86868b', fontSize: 11, lineHeight: 1.5, margin: '10px 0 0' }}>
            A starter concept and {decision.duration}-second format travel with you. Edit everything before generating.
          </p>
        </div>
      )}
    </div>
  )
}
