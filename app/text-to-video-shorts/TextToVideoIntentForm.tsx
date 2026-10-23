'use client'

// KINEO-PAGINAS-IA-CLARAS-2110 — cores em var(--kpl-*, <cor de antes>): claras só dentro de <main className="kpl"> (as páginas de entrada do ChatGPT); nas outras páginas, a cor de antes.
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
          border: '1px solid var(--kpl-accent-line, rgba(103,232,249,.28))',
          borderRadius: 18,
          background: 'linear-gradient(145deg, var(--kpl-accent-soft, rgba(103,232,249,.08)), var(--kpl-zebra, rgba(255,255,255,.02)))',
          padding: 16,
        }}
      >
        <p
          id={`${formId}-mode-heading`}
          style={{ color: 'var(--kpl-text, #f5f5f7)', fontSize: 13, fontWeight: 850, margin: '0 0 10px' }}
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
                  border: active ? '1px solid var(--kpl-accent, #67e8f9)' : '1px solid var(--kpl-line, #343438)',
                  background: active ? 'var(--kpl-accent-soft, rgba(103,232,249,.12))' : 'var(--kpl-card, #111114)',
                  color: 'var(--kpl-text, #f5f5f7)',
                  padding: '11px 13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: active ? '0 0 0 1px var(--kpl-accent-soft, rgba(103,232,249,.12)) inset' : 'none',
                }}
              >
                <span style={{ display: 'block', fontSize: 13, fontWeight: 900 }}>{mode.label}</span>
                <span style={{ display: 'block', color: active ? 'var(--kpl-accent, #bae6fd)' : 'var(--kpl-muted, #86868b)', fontSize: 11.5, lineHeight: 1.45, marginTop: 4 }}>
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
