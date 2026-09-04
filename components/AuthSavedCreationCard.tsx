import type { SignupCreationPreview } from '@/lib/growth/signupCreationPreview'

type Props = {
  preview: SignupCreationPreview
  headingId?: string
}

export default function AuthSavedCreationCard({
  preview,
  headingId = 'saved-creation-heading',
}: Props) {
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl mb-5 p-4"
      style={{
        background: 'linear-gradient(145deg, rgba(41,151,255,.12), rgba(41,151,255,.035))',
        border: '1px solid rgba(41,151,255,.3)',
        boxShadow: '0 14px 36px rgba(0,0,0,.22)',
      }}
    >
      <div
        className="text-[10px] font-black uppercase tracking-[.12em] mb-1.5"
        style={{ color: '#7cc0ff' }}
      >
        {preview.eyebrow}
      </div>
      <h2
        id={headingId}
        className="text-sm font-black mb-2"
        style={{ color: '#f5f5f7' }}
      >
        {preview.heading}
      </h2>
      <div className="flex flex-col gap-1.5 mb-3" aria-label={`Saved ${preview.kind} preview`}>
        {preview.excerpt.map((line, index) => (
          <p
            key={`${index}-${line.slice(0, 24)}`}
            className="text-xs leading-relaxed m-0"
            style={{ color: index === 0 ? '#e5e7eb' : '#aeb2ba' }}
          >
            {line}
          </p>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed m-0" style={{ color: '#8f949e' }}>
        {preview.description}
      </p>
    </section>
  )
}
