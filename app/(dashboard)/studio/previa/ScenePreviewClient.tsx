'use client'

// KINEO-PREVIA-CENAS-2026-10-03 — a tela da prévia grátis (regras em lib/scenePreview.ts; travas no servidor em
// app/api/scene-preview). A pessoa vê o roteiro e as cenas em imagem; "Transformar em filme" grava o clique no servidor,
// guarda ideia + roteiro no navegador (lib/scenePreview PREVIA_RESUME_STORAGE_KEY) e leva aos planos. Depois de pagar, o
// aviso ScenePreviewResumeBanner (layout) devolve a pessoa ao Studio com o roteiro, a 1 clique de Gerar.
import { useCallback, useEffect, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { pickInterfaceCopy } from '@/lib/ui/interfaceLanguage'
import { PREVIA_COPY, PREVIA_IDEA_MAX, PREVIA_IDEA_MIN, PREVIA_RESUME_STORAGE_KEY, type PreviaResume } from '@/lib/scenePreview'
import { REGION_PAID_ONLY_PLANS_HREF } from '@/lib/freeFilmPolicy'

type Scene = { label: string; text: string; image: string }
type Preview = { script: string; scenes: Scene[]; idea: string; language: string }

const C = { card: 'var(--card)', border: '1px solid var(--border)', text: 'var(--text)', text2: 'var(--text2)', muted: 'var(--muted)', accent: 'var(--accent)', danger: 'var(--danger, #D93025)' }
const btn = (primary: boolean, disabled = false): React.CSSProperties => ({
  borderRadius: 12, padding: '12px 18px', fontSize: 15, fontWeight: 800, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
  border: primary ? '1px solid var(--accent)' : C.border, background: primary ? 'var(--accent)' : C.card, color: primary ? 'var(--on-accent)' : C.text,
})

export default function ScenePreviewClient({ initialIdea, from }: { initialIdea: string; from: string }) {
  const language = useInterfaceLanguage()
  const copy = pickInterfaceCopy(PREVIA_COPY, language)
  const scriptLanguage = language === 'pt' || language === 'es' ? language : 'en'
  const [idea, setIdea] = useState(initialIdea)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [left, setLeft] = useState<number | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)

  useEffect(() => {
    fetch('/api/scene-preview', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        if (typeof d.left === 'number') setLeft(d.left)
        // Volta à tela sem ideia nova: mostra a última prévia (ela não some ao recarregar nem em outro aparelho).
        if (!initialIdea && d.last && typeof d.last.script === 'string') {
          setPreview({ script: d.last.script, scenes: Array.isArray(d.last.scenes) ? d.last.scenes : [], idea: d.last.idea ?? '', language: d.last.language ?? 'en' })
          if (d.last.idea) setIdea(d.last.idea)
        }
      })
      .catch(() => undefined)
  }, [initialIdea])

  const run = useCallback(async () => {
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/scene-preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idea, language: scriptLanguage }) })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.script) { setError(typeof j?.error === 'string' ? j.error : copy.refused.busy); return }
      setPreview({ script: j.script, scenes: j.scenes ?? [], idea, language: scriptLanguage })
      if (typeof j.left === 'number') setLeft(j.left)
    } finally {
      setBusy(false)
    }
  }, [idea, scriptLanguage, copy])

  function toFilm(placement: string) {
    if (preview) {
      try {
        const saved: PreviaResume = { t: Date.now(), idea: preview.idea || idea, script: preview.script, language: preview.language }
        localStorage.setItem(PREVIA_RESUME_STORAGE_KEY, JSON.stringify(saved))
      } catch { /* sem armazenamento: o roteiro continua no servidor (GET /api/scene-preview) */ }
    }
    void fetch('/api/scene-preview/cta', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ placement, scenes: preview?.scenes.length ?? 0 }), keepalive: true }).catch(() => undefined)
    window.location.href = `${REGION_PAID_ONLY_PLANS_HREF}?from=scene_preview`
  }

  const tooShort = idea.trim().length < PREVIA_IDEA_MIN
  return (
    <div className="stu" style={{ padding: '30px clamp(16px, 2.4vw, 34px) 96px', display: 'grid', gap: 18, maxWidth: 980 }} data-kineo="scene-preview" data-from={from || undefined}>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, margin: '0 0 6px', letterSpacing: '-.01em' }}>{copy.title}</h1>
        <p style={{ fontSize: 15, color: C.text2, margin: 0, maxWidth: 680 }}>{copy.sub}</p>
      </header>

      <section style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
        <label htmlFor="previa-idea" style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>{copy.ideaLabel}</label>
        <textarea id="previa-idea" value={idea} maxLength={PREVIA_IDEA_MAX} onChange={(e) => setIdea(e.target.value)} rows={3}
          style={{ width: '100%', background: C.card, border: C.border, color: C.text, borderRadius: 12, padding: '12px 14px', fontSize: 15, fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={run} disabled={busy || tooShort || left === 0} style={btn(!preview, busy || tooShort || left === 0)}>{busy ? copy.working : copy.cta}</button>
          {left !== null ? <span style={{ fontSize: 13, color: C.muted }}>{copy.left.replace('{n}', String(left))}</span> : null}
        </div>
        {error ? <p role="alert" style={{ margin: 0, color: C.danger, fontSize: 14 }}>{error}</p> : null}
      </section>

      {preview ? (
        <>
          <section aria-label={copy.scenesTitle}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 10px' }}>{copy.scenesTitle}</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              {preview.scenes.map((s, i) => (
                <li key={`${s.label}-${i}`} style={{ border: C.border, borderRadius: 14, overflow: 'hidden', background: C.card }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt={s.text.slice(0, 120)} style={{ width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', display: 'block', background: '#000' }} />
                  <p style={{ margin: 0, padding: '8px 10px', fontSize: 13, color: C.text2, lineHeight: 1.45 }}>{s.text}</p>
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 12, color: C.muted, margin: '10px 0 0', maxWidth: 720 }}>{copy.honest}</p>
          </section>

          <section aria-label={copy.scriptTitle} style={{ maxWidth: 720 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>{copy.scriptTitle}</h2>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.55, color: C.text2, background: C.card, border: C.border, borderRadius: 12, padding: 14, margin: 0 }}>{preview.script.replace(/\[[^\]]*\]\s*/g, '')}</pre>
          </section>

          <section style={{ display: 'grid', gap: 6, maxWidth: 720 }}>
            <button type="button" onClick={() => toFilm('preview')} style={btn(true)} data-testid="scene-preview-to-film">{copy.toFilm} →</button>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{copy.toFilmHint}</p>
          </section>
        </>
      ) : null}
    </div>
  )
}
