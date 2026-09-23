'use client'

// DIRETOR-KINEO-20260923 — "Improve for this video": sugestão opcional abaixo da entrada e antes do Generate,
// no desenho aprovado pelo fundador (DIRETOR-KINEO-PREVIEW.html, SHA256 85da8b12…). Regras que este componente
// cumpre (guardião scripts/test-diretor-kineo-2026-09-23.mjs):
//  · sugerir/aplicar NUNCA gera, cobra, navega nem toca o token do Generate — só chama /api/diretor/suggest;
//  · o original fica guardado: "Keep original" não muda nada, "Undo" devolve o texto exato;
//  · resposta que chega depois de a pessoa editar texto/configuração é descartada (não sobrescreve a edição);
//  · modo literal: sem a caixa de consentimento marcada (começa desmarcada), nenhuma palavra muda;
//  · erro deixa o texto como estava e o fluxo normal segue.
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { UiLabel } from '@/components/InterfaceLanguage'
import {
  DIRETOR_CLIENT_EVENTS, type DiretorDuration, type DiretorSuggestion, diretorFit, diretorInputKey, diretorScope,
} from '@/lib/diretor/suggest'

type Props = {
  text: string
  mode: 'ai' | 'verbatim' | 'clip'
  engine: string
  engineName: string
  duration: DiretorDuration
  language: string
  aspect: string
  onApply: (text: string) => void
}
type Phase = 'idle' | 'loading' | 'ready' | 'editing' | 'applied' | 'error'

const ERRORS: Record<string, string> = {
  daily_limit: 'You have used today’s suggestions. Your text is unchanged — you can still generate.',
  no_suggestion: 'No useful change found for this text. Your text is unchanged.',
}

export default function DiretorKineo({ text, mode, engine, engineName, duration, language, aspect, onApply }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [consent, setConsent] = useState(false)
  const [suggestion, setSuggestion] = useState<DiretorSuggestion | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [requestKey, setRequestKey] = useState('')
  const original = useRef('')
  const appliedText = useRef('')
  const liveKey = useRef('')
  const staleSent = useRef(false)

  const literal = mode === 'verbatim'
  const key = mode === 'clip' ? '' : diretorInputKey({ text, mode, engine, duration, language, aspect, rewriteConsent: consent })
  liveKey.current = key
  const meta = { mode, engine, duration, language, aspect, consent }

  // Depois de aplicar, qualquer edição da pessoa encerra o "Undo" (desfazer apagaria a edição dela).
  useEffect(() => {
    if (phase === 'applied' && text !== appliedText.current) setPhase('idle')
  }, [text, phase])

  if (mode === 'clip' || !text.trim()) return null

  const scope = diretorScope({ mode: literal ? 'verbatim' : 'ai', engine, rewriteConsent: consent })
  const fit = literal ? diretorFit(text, engine, duration) : null
  const stale = (phase === 'ready' || phase === 'editing') && requestKey !== key
  if (stale && !staleSent.current) { staleSent.current = true; void trackEvent(DIRETOR_CLIENT_EVENTS.stale, { ...meta, when: 'shown' }) }

  async function ask() {
    if (phase === 'loading') return
    const sentKey = key
    original.current = text
    staleSent.current = false
    setRequestKey(sentKey)
    setError('')
    setPhase('loading')
    void trackEvent(DIRETOR_CLIENT_EVENTS.requested, meta)
    try {
      const res = await fetch('/api/diretor/suggest', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, mode, engine, duration, language, aspect, rewriteConsent: consent }),
      })
      const data = (await res.json().catch(() => ({}))) as { suggestion?: DiretorSuggestion; error?: string }
      if (liveKey.current !== sentKey) {
        // A pessoa mudou algo enquanto esperava: a resposta é de outro contexto e não entra.
        void trackEvent(DIRETOR_CLIENT_EVENTS.stale, { ...meta, when: 'late_response' })
        setPhase('idle')
        return
      }
      if (!res.ok || !data.suggestion) {
        setError(ERRORS[data.error ?? ''] ?? 'The suggestion did not come through. Your text is unchanged.')
        setPhase('error')
        void trackEvent(DIRETOR_CLIENT_EVENTS.failed, { ...meta, status: res.status, error: data.error ?? null })
        return
      }
      setSuggestion(data.suggestion)
      setDraft(data.suggestion.text)
      setPhase('ready')
      void trackEvent(DIRETOR_CLIENT_EVENTS.shown, { ...meta, text_changed: data.suggestion.textChanged, changes: data.suggestion.changes.length })
    } catch {
      if (liveKey.current !== sentKey) { setPhase('idle'); return }
      setError('The suggestion did not come through. Your text is unchanged.')
      setPhase('error')
      void trackEvent(DIRETOR_CLIENT_EVENTS.failed, { ...meta, status: 0, error: 'network' })
    }
  }

  function apply(next: string) {
    const edited = next !== suggestion?.text
    appliedText.current = next
    onApply(next)
    setPhase('applied')
    void trackEvent(DIRETOR_CLIENT_EVENTS.applied, { ...meta, edited })
  }
  function undo() {
    onApply(original.current)
    setPhase('idle')
    void trackEvent(DIRETOR_CLIENT_EVENTS.undone, meta)
  }
  function keep() {
    setPhase('idle')
    void trackEvent(DIRETOR_CLIENT_EVENTS.kept, meta)
  }

  const context = `${engineName} · ${duration}s · ${language.toUpperCase()} · ${aspect}`
  const box: React.CSSProperties = { marginTop: 10, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(41,151,255,.35)', background: 'rgba(41,151,255,.06)' }
  // Literal que já cabe e sem orientação visual ligada: o Diretor não tem o que mexer — fica calado.
  if (literal && fit?.fits && !scope.mayAddVisual && phase === 'idle') return null

  return (
    <div data-kineo="diretor" data-phase={stale ? 'stale' : phase} style={box} aria-live="polite">
      {phase === 'idle' || phase === 'loading' || phase === 'error' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.86rem' }}><UiLabel>Kineo Director</UiLabel> <span className="val" style={{ fontWeight: 600, fontSize: '0.74rem' }}>· <UiLabel>optional</UiLabel></span></div>
              <div className="val" style={{ fontSize: '0.76rem', marginTop: 2, lineHeight: 1.45 }}>
                {literal && fit
                  ? `Your script is about ${fit.speechSeconds}s of narration for a ${duration}s video. It is narrated word for word — nothing changes unless you allow it.`
                  : 'A suggestion tuned to this engine and length. Nothing is generated or charged — you decide.'}
              </div>
            </div>
            <button type="button" className="pill on" disabled={phase === 'loading' || (literal && !scope.mayRewriteText)} onClick={() => { void ask() }} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {phase === 'loading' ? 'Thinking…' : literal ? `✨ Fit my script to ${duration}s` : '✨ Improve for this video'}
            </button>
          </div>
          {literal && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8, fontSize: '0.76rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={phase === 'loading'} />
              <span>Allow Kineo to rewrite my words to fit {duration}s. You will see both versions before anything changes.</span>
            </label>
          )}
          {phase === 'error' && <div role="alert" style={{ marginTop: 8, fontSize: '0.78rem', color: '#fb923c' }}>{error}</div>}
        </>
      ) : null}

      {(phase === 'ready' || phase === 'editing') && suggestion && (
        stale ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span className="val" style={{ fontSize: '0.78rem' }}>Your text or settings changed, so this suggestion is out of date.</span>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="pill on" style={{ fontSize: 12 }} onClick={() => { void ask() }}>Suggest again</button>
              <button type="button" className="pill" style={{ fontSize: 12 }} onClick={keep}>Dismiss</button>
            </div>
          </div>
        ) : (
          <>
            <div className="val" style={{ fontSize: '0.72rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Suggestion for {context}</div>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 8 }}>
              <div>
                <div className="val" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Original</div>
                <div style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', opacity: 0.75, maxHeight: 180, overflow: 'auto' }}>{original.current}</div>
              </div>
              <div>
                <div className="val" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Suggestion</div>
                {phase === 'editing'
                  ? <textarea aria-label="Edit suggestion" value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} style={{ width: '100%', fontSize: '0.8rem' }} />
                  : <div style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto' }}>{suggestion.text}</div>}
              </div>
            </div>
            {suggestion.changes.length > 0 && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: '0.76rem', lineHeight: 1.5 }}>
                {suggestion.changes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            )}
            <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="pill on" style={{ fontSize: 12 }} onClick={() => apply(phase === 'editing' ? draft : suggestion.text)}>
                {phase === 'editing' ? 'Use my edit' : 'Use suggestion'}
              </button>
              {phase === 'ready' && <button type="button" className="pill" style={{ fontSize: 12 }} onClick={() => setPhase('editing')}>Edit</button>}
              <button type="button" className="pill" style={{ fontSize: 12 }} onClick={keep}>Keep original</button>
            </div>
            <div className="val" style={{ fontSize: '0.72rem', marginTop: 6 }}>Using it only changes the text above. Nothing is generated until you press Generate.</div>
          </>
        )
      )}

      {phase === 'applied' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span className="val" style={{ fontSize: '0.78rem' }}>Suggestion applied to your text. Review it, then Generate when you are ready.</span>
          <button type="button" className="pill" style={{ fontSize: 12 }} onClick={undo}>Undo</button>
        </div>
      )}
    </div>
  )
}
