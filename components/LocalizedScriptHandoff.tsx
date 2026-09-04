import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'

type LocalizedScriptHandoffProps = {
  campaign: string
  formId: string
  language: 'pt' | 'es'
  eyebrow: string
  heading: string
  description: string
  label: string
  placeholder: string
  submit: string
  note: string
}

export default function LocalizedScriptHandoff({
  campaign,
  formId,
  language,
  eyebrow,
  heading,
  description,
  label,
  placeholder,
  submit,
  note,
}: LocalizedScriptHandoffProps) {
  return (
    <section
      aria-labelledby={`${formId}-title`}
      style={{
        marginTop: 34,
        padding: '22px 20px',
        border: '1px solid rgba(41,151,255,0.42)',
        borderRadius: 22,
        background: 'linear-gradient(145deg, rgba(41,151,255,0.14), rgba(19,19,22,0.94) 56%)',
      }}
    >
      <p style={{ margin: '0 0 7px', color: '#2997ff', fontSize: 12, fontWeight: 850, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {eyebrow}
      </p>
      <h2 id={`${formId}-title`} style={{ margin: 0, fontSize: 'clamp(1.3rem, 3.5vw, 1.75rem)', lineHeight: 1.2, fontWeight: 850 }}>
        {heading}
      </h2>
      <p style={{ margin: '10px 0 0', color: '#a1a1a6', fontSize: '0.98rem', lineHeight: 1.6 }}>
        {description}
      </p>
      <TopicGeneratorForm
        campaign={campaign}
        source={campaign}
        placement="chatgpt_script_handoff"
        language={language}
        scriptMode="verbatim"
        duration={35}
        creationIntent="trial_best"
        preserveHandoffForSignedIn
        analyticsVariant={`localized_script_handoff_${language}_v1`}
        examples={[]}
        formId={formId}
        marginTop={18}
        copy={{ label, placeholder, submit, examplesLabel: '', note }}
      />
    </section>
  )
}
