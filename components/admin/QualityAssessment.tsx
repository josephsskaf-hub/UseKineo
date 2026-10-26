import { evidenceReasonLabel, type JudgeReadout, type QualityJudge, type QualityReadout } from '@/lib/admin/qualityEvidence'

export type QualityAssessmentProps = {
  quality: QualityReadout
  judges: Partial<Record<QualityJudge, JudgeReadout>>
  findings?: string[]
}
const LABELS: Record<QualityJudge, string> = { coerencia: 'Texto e cenas planejadas', pixel: 'Quadros do vídeo', ugc: 'Apresentador e produto' }

/** Server-only display of saved evidence. No evaluation, feedback email, retry or purchase is triggered here. */
export default function QualityAssessment({ quality, judges, findings = [] }: QualityAssessmentProps) {
  const complete = quality.state === 'complete'
  const title = complete ? 'Inspeção técnica registrada' : quality.state === 'historical' ? 'Nota histórica — cobertura não validada' : 'Avaliação incompleta'
  const reasons = [...new Set(quality.required.flatMap((key) => judges[key]?.reasons ?? []))]
  return <section data-kineo="quality-assessment" aria-label="Evidências da avaliação" style={{ border: '1px solid #293548', borderRadius: 10, padding: '10px 12px', marginTop: 10, color: '#CBD5E1', background: '#101827', fontSize: 12, lineHeight: 1.45 }}>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
      <strong style={{ color: complete ? '#A7F3D0' : '#FDE68A' }}>{title}</strong>
      <span style={{ fontWeight: 800 }}>{quality.score === null ? 'Sem nota final validada' : `${quality.score}/100`}</span>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 6 }}>
      {quality.required.map((key) => {
        const judge = judges[key]
        const coverage = judge?.coverage
        return <span key={key}><b>{LABELS[key]}:</b> {judge?.score == null ? 'sem nota' : `${judge.score}/100`}{judge?.state === 'historical' ? ' · histórico' : judge?.state === 'incomplete' ? ' · parcial' : judge?.state === 'missing' || !judge ? ' · pendente' : ''}{coverage ? <span style={{ color: '#94A3B8' }}> · {coverage.judged_frames !== null ? `${coverage.judged_frames}/${coverage.expected_frames} quadros · ` : ''}{coverage.valid_readings}/{coverage.expected_readings} leituras</span> : null}</span>
      })}
    </div>
    {judges.coerencia?.fidelityBasis === 'supplied_script' && <p style={{ margin: '6px 0 0', color: '#CBD5E1' }}>Referência: roteiro fornecido. Esta nota não comprova fidelidade a uma ideia anterior.</p>}
    {judges.coerencia?.fidelityBasis === 'unverified_window' && <p style={{ margin: '6px 0 0', color: '#FDE68A' }}>A ligação entre a ideia e este vídeo ainda não foi confirmada.</p>}
    {findings.length > 0 && <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{findings.slice(0, 4).map((finding, i) => <li key={i}>{finding}</li>)}</ul>}
    {reasons.length > 0 && <details style={{ marginTop: 6 }}><summary style={{ color: '#93C5FD', cursor: 'pointer' }}>Por que a avaliação está limitada</summary><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{reasons.map((reason) => <li key={reason}>{evidenceReasonLabel(reason)}</li>)}</ul></details>}
    <p style={{ color: '#94A3B8', margin: '7px 0 0' }}>Áudio, ritmo e movimento contínuo não avaliados. Leituras do mesmo modelo não são revisões humanas independentes.</p>
  </section>
}
