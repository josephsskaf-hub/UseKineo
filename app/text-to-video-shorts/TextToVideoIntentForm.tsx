'use client'

// KINEO-PAGINAS-IA-CLARAS-2110 — cores em var(--kpl-*, <cor de antes>): claras só dentro de <main className="kpl"> (as páginas de entrada do ChatGPT); nas outras páginas, a cor de antes.
import { useState, type ComponentProps, type ReactNode } from 'react'
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

export default function TextToVideoIntentForm({ formId, campaign = TEXT_TO_VIDEO_CAMPAIGN, placement = 'hero_form', preserveHandoffForSignedIn = false, topicOptions, renderInput }: { formId: string; campaign?: string; placement?: string; preserveHandoffForSignedIn?: boolean; topicOptions?: ComponentProps<typeof TopicGeneratorForm>; renderInput?: (mode: { scriptMode: 'ai' | 'verbatim' }) => ReactNode }) {
  const [inputMode, setInputMode] = useState<TextToVideoInputMode>('idea')
  const selected = getTextToVideoInputMode(inputMode)
  const isFinishedScript = selected.id === 'finished_script'

  return (
    <section
      aria-labelledby={`${formId}-mode-heading`}
      data-variant={TEXT_TO_VIDEO_INTENT_VARIANT}
      data-citation-film-controls-2411={topicOptions || renderInput ? '' : undefined}
      style={{ marginTop: topicOptions || renderInput ? 18 : 30 }}
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
          style={{ display: 'grid', gridTemplateColumns: topicOptions || renderInput ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 9 }}
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
                <span style={{ display: 'block', fontSize: 13, fontWeight: 900 }}>{topicOptions || renderInput ? mode.id === 'idea' ? 'An idea or topic' : 'A finished script' : mode.label}</span>
                <span style={{ display: 'block', color: active ? 'var(--kpl-accent, #bae6fd)' : 'var(--kpl-muted, #86868b)', fontSize: topicOptions || renderInput ? 12 : 11.5, lineHeight: 1.45, marginTop: 4 }}>
                  {topicOptions || renderInput ? mode.id === 'idea' ? 'Let AI write the script.' : 'Keep my spoken words.' : mode.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {renderInput ? renderInput({ scriptMode: selected.scriptMode }) : (
      <TopicGeneratorForm
        {...topicOptions}
        reviewInStudio={!!topicOptions}
        campaign={campaign}
        source={topicOptions?.source ?? campaign}
        placement={placement}
        preserveHandoffForSignedIn={preserveHandoffForSignedIn}
        formId={formId}
        examples={isFinishedScript ? [] : topicOptions?.examples ?? IDEA_EXAMPLES}
        scriptMode={selected.scriptMode}
        duration={topicOptions ? topicOptions.duration : selected.duration}
        analyticsVariant={topicOptions?.analyticsVariant ?? TEXT_TO_VIDEO_INTENT_VARIANT}
        marginTop={topicOptions?.marginTop ?? 10}
        copy={isFinishedScript ? FORM_COPY.finished_script : topicOptions?.copy ? { ...topicOptions.copy, label: "What's your film about?" } : FORM_COPY.idea}
      />
      )}
    </section>
  )
}
