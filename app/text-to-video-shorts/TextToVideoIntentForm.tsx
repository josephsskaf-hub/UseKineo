'use client'

import { useState } from 'react'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import {
  getTextToVideoInputMode,
  TEXT_TO_VIDEO_CAMPAIGN,
  TEXT_TO_VIDEO_INPUT_MODES,
  TEXT_TO_VIDEO_INTENT_VARIANT,
  type TextToVideoInputMode,
} from '@/lib/growth/textToVideoIntent'

const IDEA_EXAMPLES = [
  'Why the Door to Hell is still burning',
  'The money mistake most people repeat',
  'Three facts that make the ocean terrifying',
] as const

const FORM_COPY = {
  idea: {
    label: 'What should your Short be about?',
    placeholder: 'Type a topic, hook, or rough idea',
    submit: 'Write and generate my Short',
    examplesLabel: 'Text to video examples',
    note: 'Your idea crosses signup in AI mode so Kineo can write the hook, story and payoff.',
  },
  finished_script: {
    label: 'Paste the complete narration',
    placeholder: 'Paste the words you want spoken in the video',
    submit: 'Build scenes around my script',
    examplesLabel: 'Text to video examples',
    note: 'Your spoken word sequence crosses signup in Verbatim mode. Kineo builds the visual scenes around it.',
  },
} as const

export default function TextToVideoIntentForm({ formId }: { formId: string }) {
  const [inputMode, setInputMode] = useState<TextToVideoInputMode>('idea')
  const selected = getTextToVideoInputMode(inputMode)
  const isFinishedScript = selected.id === 'finished_script'

  return (
    <section
      aria-labelledby={`${formId}-mode-heading`}
      data-variant={TEXT_TO_VIDEO_INTENT_VARIANT}
      style={{ marginTop: 30 }}
    >
      <div
        style={{
          border: '1px solid rgba(103,232,249,.28)',
          borderRadius: 18,
          background: 'linear-gradient(145deg, rgba(103,232,249,.08), rgba(255,255,255,.02))',
          padding: 16,
        }}
      >
        <p
          id={`${formId}-mode-heading`}
          style={{ color: '#f5f5f7', fontSize: 13, fontWeight: 850, margin: '0 0 10px' }}
        >
          What are you starting with?
        </p>
        <div
          role="group"
          aria-labelledby={`${formId}-mode-heading`}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 9 }}
        >
          {TEXT_TO_VIDEO_INPUT_MODES.map((mode) => {
            const active = mode.id === inputMode
            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={active}
                onClick={() => setInputMode(mode.id)}
                style={{
                  minHeight: 74,
                  borderRadius: 13,
                  border: active ? '1px solid #67e8f9' : '1px solid #343438',
                  background: active ? 'rgba(103,232,249,.12)' : '#111114',
                  color: '#f5f5f7',
                  padding: '11px 13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: active ? '0 0 0 1px rgba(103,232,249,.12) inset' : 'none',
                }}
              >
                <span style={{ display: 'block', fontSize: 13, fontWeight: 900 }}>{mode.label}</span>
                <span style={{ display: 'block', color: active ? '#bae6fd' : '#86868b', fontSize: 11.5, lineHeight: 1.45, marginTop: 4 }}>
                  {mode.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <TopicGeneratorForm
        campaign={TEXT_TO_VIDEO_CAMPAIGN}
        source={TEXT_TO_VIDEO_CAMPAIGN}
        formId={formId}
        examples={isFinishedScript ? [] : IDEA_EXAMPLES}
        scriptMode={selected.scriptMode}
        duration={selected.duration}
        analyticsVariant={TEXT_TO_VIDEO_INTENT_VARIANT}
        marginTop={10}
        copy={FORM_COPY[selected.id]}
      />
    </section>
  )
}
