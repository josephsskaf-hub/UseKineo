'use client'

import { useState } from 'react'
import { rememberSignupCampaign, trackEvent } from '@/lib/analytics'
import type { CreationIntent } from '@/lib/creationHandoff'

const TOPIC_EXAMPLES = [
  'The island too dangerous to visit',
  'Why the Door to Hell is still burning',
  'How compound interest grows $100',
] as const

type TopicGeneratorFormProps = {
  campaign?: string
  source?: string
  placement?: string
  utmSource?: string
  utmMedium?: string
  examples?: readonly string[]
  formId?: string
  language?: 'en' | 'pt' | 'es'
  scriptMode?: 'ai' | 'verbatim'
  duration?: 35 | 45 | 60 | 90
  creationIntent?: Exclude<CreationIntent, null>
  preserveHandoffForSignedIn?: boolean
  analyticsVariant?: string
  marginTop?: number
  copy?: {
    label: string
    placeholder: string
    submit: string
    examplesLabel: string
    note: string
  }
}

export default function TopicGeneratorForm({
  campaign = 'push70_youtube_topic_one_click',
  source = 'push70_youtube_topic_one_click',
  placement = 'hero_form',
  // Keep these opt-in. A blanket seo/organic default would overwrite the real
  // first touch when ChatGPT, a directory or another referral brought the
  // visitor to a public page. The campaign carries the page handoff while
  // acquisition UTMs remain truthful.
  utmSource,
  utmMedium,
  examples = TOPIC_EXAMPLES,
  formId = 'try-a-topic',
  language,
  scriptMode,
  duration,
  creationIntent = 'fast',
  preserveHandoffForSignedIn = false,
  analyticsVariant,
  marginTop = 30,
  copy = {
    label: 'What should your Short be about?',
    placeholder: 'Type one topic or paste your script',
    submit: 'Turn this topic into a Short →',
    examplesLabel: 'Example topics',
    note: 'Your topic stays attached through signup. No card required for the free Fast workflow.',
  },
}: TopicGeneratorFormProps = {}) {
  const [topic, setTopic] = useState('')
  const inputId = `${formId}-input`

  function authRedirectFor(promptValue: string): string | null {
    const boundedPrompt = promptValue.trim().slice(0, 1000)
    if (!preserveHandoffForSignedIn || !boundedPrompt) return null
    const destination = new URLSearchParams({
      welcome: '1',
      prompt: boundedPrompt,
      create_intent: creationIntent,
      intent_campaign: campaign,
    })
    if (language) destination.set('language', language)
    if (scriptMode) destination.set('script_mode', scriptMode)
    if (duration) destination.set('duration', String(duration))
    return `/studio/create?${destination.toString()}`
  }

  function startWithExample(example: string, exampleIndex: number) {
    rememberSignupCampaign(campaign)
    const metadata = {
      source,
      placement: 'topic_example_one_click',
      example_index: exampleIndex,
      topic_length: example.length,
      ...(language ? { language } : {}),
      ...(scriptMode ? { script_mode: scriptMode } : {}),
      ...(duration ? { duration_seconds: duration } : {}),
      creation_intent: creationIntent,
      ...(analyticsVariant ? { variant: analyticsVariant } : {}),
    }
    void trackEvent('organic_topic_example_started', metadata)
    void trackEvent('organic_topic_submitted', metadata)
    // KINEO-STARTER-EM-ARTIGO-2026-08-15 — este componente é a máquina de
    // ativação de 68% (push69/push70) e, até hoje, era INVISÍVEL para a única
    // métrica pela qual a casa julga página orgânica. O gate de 14/08 comparou
    // 13 páginas por `organic_cta_clicked` e leu `/cheapest-ai-shorts-maker`
    // como "0 cliques em 41 sessões" — mas aquela página TEM este starter
    // desde #78, e ele emitia `organic_topic_example_started` /
    // `organic_topic_submitted`, nunca `organic_cta_clicked`. O zero media o
    // instrumento, não a porta. Agora um clique no starter aparece na MESMA
    // consulta que a home, com `destination` no formato de OrganicCtaLink
    // (components/OrganicCtaLink.tsx:33-38) para que os dois sejam somáveis.
    // `keepalive: true` em trackEvent (lib/analytics.ts:428) é o que faz este
    // evento sobreviver ao window.location.assign logo abaixo.
    //
    // `mirrors` NÃO é enfeite: um clique escreve DUAS linhas para preservar a
    // consulta histórica por `organic_cta_clicked`. O painel do fundador
    // ignora o espelho e deduplica por pessoa; uma ação continua uma intenção.
    void trackEvent('organic_cta_clicked', {
      ...metadata,
      destination: '/signup',
      mirrors: 'organic_topic_submitted',
    })
    const params = new URLSearchParams({
      prompt: example,
      create_intent: creationIntent,
      intent_campaign: campaign,
    })
    if (utmSource) params.set('utm_source', utmSource)
    if (utmMedium) params.set('utm_medium', utmMedium)
    if (utmSource || utmMedium) params.set('utm_campaign', campaign)
    if (language) params.set('language', language)
    if (scriptMode) params.set('script_mode', scriptMode)
    if (duration) params.set('duration', String(duration))
    const authRedirect = authRedirectFor(example)
    if (authRedirect) params.set('redirect', authRedirect)
    window.location.assign(`/signup?${params.toString()}`)
  }

  return (
    <div
      id={formId}
      style={{
        marginTop,
        scrollMarginTop: 24,
        border: '1px solid rgba(41,151,255,0.35)',
        borderRadius: 18,
        background: 'linear-gradient(145deg, rgba(41,151,255,0.10), rgba(255,255,255,0.025))',
        padding: 18,
      }}
    >
      <form
        action="/signup"
        method="get"
        onSubmit={() => {
          rememberSignupCampaign(campaign)
          const submitMetadata = {
            source,
            placement,
            topic_length: topic.trim().length,
            ...(language ? { language } : {}),
            ...(scriptMode ? { script_mode: scriptMode } : {}),
            ...(duration ? { duration_seconds: duration } : {}),
            creation_intent: creationIntent,
            ...(analyticsVariant ? { variant: analyticsVariant } : {}),
          }
          void trackEvent('organic_topic_submitted', submitMetadata)
          // Mesma razão do starter acima: digitar o próprio tema e apertar o
          // botão é a saída para o produto, e precisa aparecer na consulta que
          // decide se uma página orgânica vive ou morre. `mirrors` preserva a
          // série histórica; o painel deduplica a intenção por pessoa.
          void trackEvent('organic_cta_clicked', {
            ...submitMetadata,
            destination: '/signup',
            mirrors: 'organic_topic_submitted',
          })
        }}
      >
        <label htmlFor={inputId} style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#f5f5f7', marginBottom: 9 }}>
          {copy.label}
        </label>
        <textarea
          id={inputId}
          name="prompt"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          required
          minLength={3}
          maxLength={1000}
          rows={3}
          placeholder={copy.placeholder}
          style={{
            display: 'block',
            width: '100%',
            resize: 'vertical',
            minHeight: 96,
            border: '1px solid #3a3a3d',
            borderRadius: 13,
            background: '#0b0b0d',
            color: '#f5f5f7',
            padding: '14px 15px',
            font: 'inherit',
            fontSize: 16,
            lineHeight: 1.45,
            outline: 'none',
          }}
        />
        <input type="hidden" name="create_intent" value={creationIntent} />
        <input type="hidden" name="intent_campaign" value={campaign} />
        {authRedirectFor(topic) && (
          <input type="hidden" name="redirect" value={authRedirectFor(topic) ?? ''} />
        )}
        {utmSource && <input type="hidden" name="utm_source" value={utmSource} />}
        {utmMedium && <input type="hidden" name="utm_medium" value={utmMedium} />}
        {(utmSource || utmMedium) && <input type="hidden" name="utm_campaign" value={campaign} />}
        {language && <input type="hidden" name="language" value={language} />}
        {scriptMode && <input type="hidden" name="script_mode" value={scriptMode} />}
        {duration && <input type="hidden" name="duration" value={duration} />}
        <button
          type="submit"
          style={{
            display: 'block',
            width: '100%',
            marginTop: 12,
            border: 0,
            borderRadius: 999,
            background: '#f5f5f7',
            color: '#000',
            padding: '14px 22px',
            fontSize: 15,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          {copy.submit}
        </button>
      </form>

      {examples.length > 0 && (
        <div aria-label={copy.examplesLabel} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 13 }}>
          {examples.map((example, exampleIndex) => (
            <button
              key={example}
              type="button"
              onClick={() => startWithExample(example, exampleIndex)}
              style={{
                border: '1px solid #343438',
                borderRadius: 999,
                background: '#161618',
                color: '#a1a1a6',
                padding: '7px 10px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {example} →
            </button>
          ))}
        </div>
      )}

      <p style={{ margin: '13px 0 0', color: '#86868b', fontSize: 12, lineHeight: 1.5 }}>
        {copy.note}
      </p>
    </div>
  )
}
