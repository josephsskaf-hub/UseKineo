'use client'

import { useEffect, useRef, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { SHOWCASE_COPY } from '@/lib/madeWithKineoCopy'
import type { ShowcaseLocale } from '@/lib/madeWithKineo'

/** Mounted only after a delivered download, or by the owner on the privacy page. */
export default function ShowcaseConsent({ videoId, onPublishedChange }: {
  videoId: string; onPublishedChange?: (published: boolean) => void
}) {
  const language = useInterfaceLanguage()
  const locale: ShowcaseLocale = language === 'pt' || language === 'es' ? language : 'en'
  const copy = SHOWCASE_COPY[locale]
  const [saved, setSaved] = useState<{ published: boolean; path: string | null } | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading')
  const [revision, setRevision] = useState(0)
  const mutationController = useRef<AbortController | null>(null)
  useEffect(() => () => mutationController.current?.abort(), [])
  useEffect(() => {
    const controller = new AbortController()
    setSaved(null)
    setState('loading')
    fetch(`/api/video/showcase?videoId=${encodeURIComponent(videoId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('privacy unavailable')
        const body = await response.json()
        if (typeof body.published !== 'boolean') throw new Error('invalid privacy state')
        if (!controller.signal.aborted) {
          setSaved({ published: body.published, path: typeof body.path === 'string' ? body.path : null })
          setState('ready')
        }
      }).catch(() => { if (!controller.signal.aborted) setState('error') })
    return () => controller.abort()
  }, [videoId, revision])

  async function change() {
    if (!saved || state !== 'ready') return
    setState('saving')
    const controller = new AbortController()
    mutationController.current = controller
    try {
      const response = await fetch('/api/video/showcase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ videoId, action: saved.published ? 'unpublish' : 'publish' }),
      })
      const body = await response.json()
      if (controller.signal.aborted) return
      if (!response.ok || typeof body.published !== 'boolean') throw new Error('change unconfirmed')
      setSaved({ published: body.published, path: typeof body.path === 'string' ? body.path : null })
      setState('ready')
      onPublishedChange?.(body.published)
    } catch { if (!controller.signal.aborted) setState('error') }
  }

  return <section aria-label={copy.manageTitle} style={{ width: '100%', maxWidth: 520, padding: 20, margin: '20px auto', border: '1px solid var(--border, #303746)', borderRadius: 16, background: 'var(--surface, #111722)', color: 'var(--text, #f6f8fc)' }}>
    <p style={{ margin: '0 0 8px', fontWeight: 650 }}>{copy.title} <span style={{ fontSize: 12, color: 'var(--muted, #a5b7cf)' }}>· {saved ? saved.published ? copy.on : copy.off : copy.loading}</span></p>
    <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: 'var(--muted, #a5b7cf)' }}>{copy.explain}</p>
    <button type="button" aria-pressed={saved?.published ?? false} disabled={state !== 'ready'} onClick={change} style={{ padding: '11px 17px', borderRadius: 10, border: '1px solid #466d9c', background: '#182c44', color: '#e6f2ff', cursor: state === 'ready' ? 'pointer' : 'wait', font: 'inherit', fontWeight: 600 }}>
      {state === 'saving' ? copy.saving : saved?.published ? copy.remove : copy.publish}
    </button>
    {state === 'error' ? <p role="alert" style={{ fontSize: 13, lineHeight: 1.6 }}>{copy.error} <button type="button" onClick={() => setRevision(n => n + 1)} style={{ textDecoration: 'underline', color: 'inherit' }}>{copy.retry}</button></p> : null}
    {saved?.published ? <>
      <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--muted, #a5b7cf)' }}>{copy.removeExplain}</p>
      {saved.path?.startsWith('/made-with-kineo/') ? <a href={saved.path} style={{ color: '#69b5ff', marginRight: 14 }}>{copy.view}</a> : null}
    </> : null}
    <p style={{ margin: '12px 0 0', fontSize: 12 }}><a href={`/made-with-kineo/manage?videoId=${encodeURIComponent(videoId)}`} style={{ color: '#69b5ff' }}>{copy.manage}</a></p>
  </section>
}
