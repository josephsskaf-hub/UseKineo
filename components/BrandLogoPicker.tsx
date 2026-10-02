'use client'
// KINEO-LOGO-DA-MARCA-2026-10-01 — "Seu logo": a pessoa sobe o logo da empresa uma vez e ele sai no canto superior
// esquerdo de TODO filme (qualquer motor), até ela remover. O servidor guarda em avatars/<uid>/brand-logo.* e o
// /api/compose resolve sozinho (lib/brandLogo.ts) — esta tela só sobe, mostra e remove.
import { useEffect, useState } from 'react'
import { UiLabel } from '@/components/InterfaceLanguage'

export default function BrandLogoPicker() {
  const [url, setUrl] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    fetch('/api/brand-logo', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d && typeof d.url === 'string') setUrl(d.url) })
      .catch(() => undefined)
    return () => { vivo = false }
  }, [])

  async function subir(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setErro(null)
    if (!['image/png', 'image/jpeg'].includes(file.type)) { setErro('Use a PNG or JPG logo.'); return }
    if (file.size > 5 * 1024 * 1024) { setErro('Logo is too large — max 5 MB.'); return }
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('rights', 'true')
      const r = await fetch('/api/brand-logo', { method: 'POST', body: form })
      const d = await r.json().catch(() => null) as { url?: string; error?: string } | null
      if (!r.ok || !d?.url) { setErro(d?.error || 'Logo upload failed. Please try again.'); return }
      setUrl(d.url)
    } catch {
      setErro('Logo upload failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remover() {
    setErro(null)
    setBusy(true)
    try {
      const r = await fetch('/api/brand-logo', { method: 'DELETE' })
      if (r.ok) setUrl(null)
      else setErro('Could not remove the logo. Please try again.')
    } catch {
      setErro('Could not remove the logo. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div data-kineo="logo-da-marca" style={{ marginTop: 12, padding: 14, border: '1px solid var(--border)', borderRadius: 13, background: 'var(--card2)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}><UiLabel>Your logo</UiLabel> <span style={{ fontWeight: 500, opacity: 0.7 }}>· <UiLabel>optional</UiLabel></span></div>
      <p className="val" style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.45 }}>
        <UiLabel>Add your company logo and it appears in the top corner of every film, on any engine. No extra credits.</UiLabel>
      </p>
      {url ? (
        <div className="row" style={{ marginTop: 10, gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 96, height: 56, borderRadius: 10, border: '1px solid var(--border2)', background: 'repeating-conic-gradient(rgba(128,128,128,.18) 0% 25%, transparent 0% 50%) 50% / 14px 14px', display: 'grid', placeItems: 'center', padding: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
          </div>
          <span className="val" style={{ fontSize: 12, color: 'var(--accent)' }}><UiLabel>On in every film</UiLabel></span>
          <label className="pill" style={{ cursor: busy ? 'wait' : 'pointer' }}>
            <input type="file" accept="image/png,image/jpeg" hidden disabled={busy} onChange={(e) => { void subir(e.target.files); e.target.value = '' }} />
            <UiLabel>Replace</UiLabel>
          </label>
          <button type="button" className="pill" disabled={busy} onClick={() => { void remover() }}><UiLabel>Remove</UiLabel></button>
        </div>
      ) : (
        <>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10, fontSize: 12.5, lineHeight: 1.45, color: 'var(--text2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
            <span><UiLabel>This logo belongs to me or my company.</UiLabel></span>
          </label>
          <div className="row" style={{ marginTop: 10, gap: 8, alignItems: 'center' }}>
            <label className="pill" aria-disabled={!consent || busy} style={{ cursor: consent && !busy ? 'pointer' : 'not-allowed', opacity: consent && !busy ? 1 : 0.5 }}>
              <input type="file" accept="image/png,image/jpeg" hidden disabled={!consent || busy} onChange={(e) => { void subir(e.target.files); e.target.value = '' }} />
              + <UiLabel>Add logo</UiLabel>
            </label>
            <span className="val" style={{ fontSize: 12, opacity: 0.8 }}><UiLabel>PNG with transparent background works best · max 5 MB</UiLabel></span>
          </div>
        </>
      )}
      {busy && <p className="val" style={{ margin: '6px 0 0', fontSize: 12 }}><UiLabel>Saving logo…</UiLabel></p>}
      {erro && <p role="alert" style={{ margin: '6px 0 0', fontSize: 12, color: '#fb923c' }}>{erro}</p>}
    </div>
  )
}
