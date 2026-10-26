'use client'
import { useRef, useState } from 'react'
import type { TaskCanaryTarget } from '@/lib/admin/qualityEvidence'
import { readSavedTaskResult } from '@/lib/admin/qualityEvidence'
import type { FulfillmentResult } from '@/lib/regua95/taskFulfillmentCanary'

export type TaskCanaryControlProps = { enabled: boolean; target: TaskCanaryTarget | null; seconds: number | null; savedResult?: FulfillmentResult | null }
const DURATIONS = [15, 35, 45, 60, 90]

/** Manual canary only; the server repeats authorization, global budget and idempotency checks. */
export default function TaskCanaryControl({ enabled, target, seconds, savedResult }: TaskCanaryControlProps) {
  const [duration, setDuration] = useState(DURATIONS.includes(seconds ?? 0) ? seconds! : 15)
  const [mode, setMode] = useState<'idea' | 'script'>('script')
  const [confirmed, setConfirmed] = useState(false)
  const [state, setState] = useState<'idle' | 'running' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<FulfillmentResult | null>(savedResult ?? null)
  const inFlight = useRef(false)
  const ready = enabled && target !== null && confirmed && state !== 'running'
  const run = async () => {
    if (!ready || !target || inFlight.current) return
    inFlight.current = true
    setState('running'); setMessage('')
    try {
      const response = await fetch('/api/admin/coerencia/canario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cases: [{ ...target, confirmed: { source: 'admin_manual', seconds: duration, mode } }] }) })
      const body = await response.json().catch(() => null) as { cases?: Array<{ video_id?: string; result?: unknown }>; reason?: string } | null
      const next = readSavedTaskResult(body?.cases?.find((item) => item.video_id === target.videoId)?.result)
      if (!response.ok || !next) { setState('error'); setMessage('O teste não produziu um novo parecer. Pode estar desligado, já reservado ou sem evidência suficiente. Nenhuma repetição automática foi iniciada.'); return }
      setResult(next); setState('idle'); setConfirmed(false)
    } catch { setState('error'); setMessage('Não foi possível confirmar o resultado. Confira o parecer salvo antes de tentar novamente; não houve repetição automática.') }
    finally { inFlight.current = false }
  }
  return <section data-kineo="task-canary-control" style={{ marginTop: 10, borderTop: '1px solid #334155', paddingTop: 9, fontSize: 12, color: '#CBD5E1', lineHeight: 1.45 }}>
    <strong>Atendeu ao pedido?</strong>
    {!enabled ? <p style={{ margin: '4px 0', color: '#94A3B8' }}>Teste experimental preparado e desligado. Exige autorização de custo e calibração antes da ativação.</p> : !target ? <p style={{ margin: '4px 0', color: '#FDE68A' }}>Faltam rastros exatos para avaliar este vídeo com segurança.</p> : <div style={{ display: 'grid', gap: 7, marginTop: 6 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <label>Duração a avaliar <select value={duration} onChange={(e) => { setDuration(Number(e.target.value)); setConfirmed(false) }} disabled={state === 'running'} style={{ marginLeft: 5, color: '#E2E8F0', background: '#17263B', padding: 5, border: '1px solid #64748B', borderRadius: 5 }}>{DURATIONS.map((d) => <option key={d} value={d}>{d}s</option>)}</select></label>
        <label>Referência <select value={mode} onChange={(e) => { setMode(e.target.value as 'idea' | 'script'); setConfirmed(false) }} disabled={state === 'running'} style={{ marginLeft: 5, color: '#E2E8F0', background: '#17263B', padding: 5, border: '1px solid #64748B', borderRadius: 5 }}><option value="script">Roteiro fornecido</option><option value="idea">Ideia original</option></select></label>
      </div>
      <label><input type="checkbox" checked={confirmed} disabled={state === 'running'} onChange={(e) => setConfirmed(e.target.checked)} /> Confirmo esta configuração para o teste. Isso não comprova aceite histórico do cliente.</label>
      <button type="button" disabled={!ready} onClick={run} style={{ justifySelf: 'start', padding: '7px 12px', border: '1px solid #93C5FD', borderRadius: 7, color: '#BFDBFE', background: '#17263B', cursor: ready ? 'pointer' : 'default' }}>{state === 'running' ? 'Avaliando uma vez…' : 'Executar canário manual'}</button>
      <span style={{ color: '#94A3B8' }}>Usa os quadros já salvos. Limite global de três chamadas nesta versão; sem novo render ou repetição automática.</span>
    </div>}
    {message && <p role="status" style={{ margin: '6px 0', color: '#FDE68A' }}>{message}</p>}
    {result && <div data-kineo="task-canary-result" style={{ marginTop: 7 }}>
      <b>{result.task_fulfilled === 'yes' ? 'Pedido atendido na evidência analisada' : result.task_fulfilled === 'no' ? 'Pedido não atendido' : 'Evidência insuficiente para concluir'}</b>
      <p style={{ margin: '3px 0', color: '#FDE68A' }}>Nota experimental: {result.numerical_score === null ? 'não disponível' : `${result.numerical_score}/100`} · ainda não calibrada.</p>
      <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{result.findings.map((finding, i) => <li key={i}><b>Cena {finding.scene}{finding.frame !== null ? ` · quadro ${finding.frame}` : ''}{finding.time !== null ? ` · ${finding.time}s` : ''}:</b> pediu “{finding.requested}”; observado “{finding.observed}”. {finding.defect}</li>)}</ul>
      {result.incomplete_reasons.length > 0 && <p style={{ color: '#CBD5E1', margin: '4px 0' }}>O parecer não confirma todos os requisitos. Revise a origem do pedido e a cobertura da evidência.</p>}
      <span style={{ color: '#94A3B8' }}>Áudio não avaliado. Parecer experimental separado das notas históricas e de qualquer resultado comercial.</span>
    </div>}
  </section>
}
