'use client'

// KINEO-PREVIA-CENAS-2026-10-03 — a volta em 1 clique depois de pagar. A prévia guardou ideia + roteiro no navegador
// (lib/scenePreview.ts PREVIA_RESUME_STORAGE_KEY) quando a pessoa clicou "Transformar em filme". O layout só monta isto
// para conta que JÁ pode fazer filme (pagou ou tem plano); com o roteiro guardado há menos de 14 dias, o aviso leva ao
// Studio com o roteiro, verbatim, no motor da prévia — a pessoa só aperta Gerar. Nada é gerado sozinho.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { pickInterfaceCopy } from '@/lib/ui/interfaceLanguage'
import { PREVIA_COPY, PREVIA_RESUME_STORAGE_KEY, previaResumeStudioHref, previaResumeValid, type PreviaResume } from '@/lib/scenePreview'

export default function ScenePreviewResumeBanner() {
  const language = useInterfaceLanguage()
  const copy = pickInterfaceCopy(PREVIA_COPY, language)
  const [saved, setSaved] = useState<PreviaResume | null>(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREVIA_RESUME_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      if (previaResumeValid(parsed, Date.now())) setSaved(parsed)
      else if (raw) localStorage.removeItem(PREVIA_RESUME_STORAGE_KEY)
    } catch { /* sem armazenamento: sem aviso */ }
  }, [])
  if (!saved) return null
  const clear = () => { try { localStorage.removeItem(PREVIA_RESUME_STORAGE_KEY) } catch { /* ignore */ } }
  return (
    <div role="status" data-kineo="scene-preview-resume" style={{ margin: '12px 16px 0', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--accent)', background: 'var(--accent-soft, rgba(41,151,255,.08))', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ minWidth: 220, flex: '1 1 320px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{copy.resumeTitle}</div>
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: 'var(--text2)' }}>{copy.resumeBody}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link href={previaResumeStudioHref(saved)} prefetch={false} onClick={clear} style={{ background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 999, padding: '11px 18px', fontSize: 14, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>{copy.resumeCta}</Link>
        <button type="button" aria-label="Dismiss" onClick={() => { clear(); setSaved(null) }} style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: 20, cursor: 'pointer', minWidth: 36, minHeight: 36 }}>×</button>
      </div>
    </div>
  )
}
