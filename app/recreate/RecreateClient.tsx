'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { RECREATE_FORMATS, type RecreateFormat } from '@/lib/recreate/formats'
import { compressPhoto, cropFace, composePairPhoto } from '@/lib/recreate/photos'
import './recreate.css'

type Social = { count: number; liked: boolean }
type Quote = { id: string; credits: number | null; available: boolean }
type Photo = { file: File; url: string }
type Clip = { id: string; status: string; video_url?: string | null; credits_refunded?: number }

export default function RecreateClient({ initialId }: { initialId?: string }) {
  const [selected, setSelected] = useState(() => RECREATE_FORMATS.find(f => f.id === initialId) ?? null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [prompt, setPrompt] = useState(selected?.prompt ?? '')
  const [consent, setConsent] = useState(false)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [social, setSocial] = useState<Record<string, Social>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState<RecreateFormat | null>(null)
  const [report, setReport] = useState<RecreateFormat | null>(null)
  const [reason, setReason] = useState('rights')
  const [clip, setClip] = useState<Clip | null>(null)
  const [simulation, setSimulation] = useState<{ format: string; seconds: number; photos: number; mode: string } | null>(null)
  const [socialBusy, setSocialBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLElement>(null)
  const requestKey = useRef<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const photosRef = useRef(photos)
  photosRef.current = photos
  useEffect(() => () => { for (const photo of photosRef.current) URL.revokeObjectURL(photo.url) }, [])

  async function loadQuotes() {
    try {
      const res = await fetch('/api/recreate', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuotes(data.catalog)
    } catch { setMessage('Could not check availability. Retry before generating.') }
  }
  async function loadSocial() {
    try {
      const res = await fetch('/api/recreate/social', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSocial(Object.fromEntries(data.items.map((i: Social & { id: string }) => [i.id, { count: i.count, liked: i.liked }])))
    } catch { setMessage('Likes are unavailable. No counts are being estimated.') }
  }
  useEffect(() => { void loadQuotes(); void loadSocial() }, [])
  useEffect(() => {
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('.rc-grid video'))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement
        if (entry.isIntersecting && !reduced) void video.play().catch(() => {})
        else video.pause()
      }
    })
    for (const video of videos) observer.observe(video)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const dialog = dialogRef.current
    if (expanded || report) { if (dialog && !dialog.open) dialog.showModal() }
    else dialog?.close()
  }, [expanded, report])
  useEffect(() => {
    if (!clip || !['pending', 'processing'].includes(clip.status)) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recreate/status?id=${encodeURIComponent(clip.id)}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        if (!cancelled) { setClip(data.clip); if (['done', 'failed'].includes(data.clip.status)) void loadQuotes() }
      } catch { if (!cancelled) { setMessage('Status unavailable. Retry the status check; your clip will not be generated again.'); setClip({ ...clip }) } }
    }, 6000)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [clip])
  function choose(f: RecreateFormat) {
    if (busy) return
    setSelected(f); setPrompt(f.prompt); setPhotos([]); setConsent(false); setClip(null); setSimulation(null); setMessage(''); requestKey.current = null
    for (const photo of photos) URL.revokeObjectURL(photo.url)
    window.history.replaceState(null, '', `/recreate/${f.id}`)
    if (window.matchMedia('(max-width: 640px)').matches) window.requestAnimationFrame(() => document.querySelector('.rc-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  function removePhoto(index: number) {
    URL.revokeObjectURL(photos[index].url)
    setPhotos(photos.filter((_, i) => i !== index)); requestKey.current = null
  }
  async function addPhoto(file: File | undefined) {
    if (!selected || !file || photos.length >= selected.photoSlots) return
    setPhotoBusy(true); setMessage('')
    try {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP photo up to 8 MB.')
      const normalized = await compressPhoto(file, true)
      const prepared = selected.type === 'swap' ? await cropFace(normalized) : normalized
      if (!prepared) throw new Error('Could not crop your face. Try a clear selfie.')
      setPhotos(p => [...p, { file: prepared, url: URL.createObjectURL(prepared) }]); requestKey.current = null
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not read your photo.') }
    finally { setPhotoBusy(false) }
  }
  const uploaded = useRef(new WeakMap<File, string>())
  async function upload(file: File): Promise<string> {
    const cached = uploaded.current.get(file)
    if (cached) return cached
    const form = new FormData(); form.set('file', file); form.set('purpose', 'animate'); form.set('rights', 'true')
    const res = await fetch('/api/avatar/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok || typeof data.url !== 'string') throw new Error(data.error ?? 'Photo upload failed.')
    uploaded.current.set(file, data.url)
    return data.url
  }
  const pairCache = useRef<{ a: File; b: File; file: File } | null>(null)
  async function generate(simulate: boolean) {
    if (!selected || busy) return
    setBusy(true); setMessage(''); setSimulation(null)
    try {
      let payload: Record<string, unknown> = { format: selected.id, mode: 'swap', seconds: selected.seconds, prompt, consent, simulate }
      if (!simulate) {
        if (!consent || !photos.length || (selected.type === 'effect' && photos.length !== selected.photoSlots)) throw new Error('Add the required photos and confirm permission first.')
        if (selected.type === 'swap') payload.photos = await Promise.all(photos.map(p => upload(p.file)))
        else {
          let file = photos[0].file
          if (selected.photoSlots === 2) {
            const [a, b] = photos.map(p => p.file)
            if (pairCache.current?.a !== a || pairCache.current?.b !== b) pairCache.current = { a, b, file: await composePairPhoto(a, b) }
            file = pairCache.current.file
          }
          payload.image_url = await upload(file)
        }
      }
      if (!requestKey.current) requestKey.current = `recreate-${crypto.randomUUID()}`
      const res = await fetch('/api/recreate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey.current }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not start. Please retry.')
      if (simulate) setSimulation(data)
      else { setClip(data.clip); void loadQuotes() }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not confirm. Retry this request before changing the form.') }
    finally { setBusy(false) }
  }
  async function like(f: RecreateFormat) {
    if (!social[f.id] || socialBusy) return
    setSocialBusy(true)
    try {
      const res = await fetch('/api/recreate/social', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: f.id, action: 'like', liked: !social[f.id].liked }) })
      if (!res.ok) throw new Error()
      await loadSocial()
    } catch { setMessage('Your like was not saved. Please retry.') }
    finally { setSocialBusy(false) }
  }
  async function sendReport() {
    if (!report) return
    setSocialBusy(true)
    try {
      const res = await fetch('/api/recreate/social', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: report.id, action: 'report', reason }) })
      if (!res.ok) throw new Error()
      setReport(null); setMessage('Report saved. Thank you.')
    } catch { setMessage('Report was not saved. Please retry.') }
    finally { setSocialBusy(false) }
  }
  const quote = selected ? quotes.find(q => q.id === selected.id) : null
  const active = !!clip && ['pending', 'processing'].includes(clip.status)
  return <main className="recreate">
    <header className="rc-nav"><Link href="/" className="rc-brand">✦ <span>Kineo</span></Link><Link href="/recreate">Recreate</Link><Link href="/clips">My clips ↗</Link></header>
    {message && <div className="rc-notice" role="status">{message} <button onClick={() => { void loadQuotes(); void loadSocial() }}>Retry</button></div>}
    <div className={`rc-workspace ${selected ? '' : 'rc-library'}`}>
      {selected && <aside className="rc-panel" aria-label="Create your clip">
        <div className="rc-panel-heading"><span>Recreate</span><Link href="/recreate" onClick={e => { if (busy) e.preventDefault() }}>Motion Library ↗</Link></div>
        <div className="rc-selected"><video key={selected.id} src={selected.preview} poster={selected.poster} autoPlay muted loop playsInline controls aria-label={selected.title} /><div><strong>{selected.title}</strong><span>{selected.seconds} s</span></div><button disabled={busy} onClick={() => galleryRef.current?.scrollIntoView({ behavior: 'smooth' })}>Change ↗</button></div>
        {selected.type === 'swap' && <><div className="rc-mode"><span>Motion transfer</span><strong>Swap</strong></div><p className="rc-muted">Change only the face. Keep the clothing, scene and motion.</p></>}
        <div className="rc-field-heading"><label htmlFor="rc-photos">{selected.photoSlots === 2 ? 'Add a photo of each person' : 'Add your photo'}</label><span>{photos.length}/{selected.photoSlots}</span></div>
        {selected.type === 'swap' && <p className="rc-muted">Check the face crop below. Photos replace people from left to right.</p>}
        <div className="rc-photos" id="rc-photos">
          {photos.map((p, i) => <div className="rc-photo" key={p.url}><img src={p.url} alt={`Reference ${i + 1}`} /><button disabled={busy} aria-label={`Remove photo ${i + 1}`} onClick={() => removePhoto(i)}>×</button></div>)}
          {photos.length < selected.photoSlots && <button disabled={busy || photoBusy} className="rc-add" onClick={() => fileRef.current?.click()} aria-label="Add photo">{photoBusy ? '…' : '+'}</button>}
        </div>
        <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void addPhoto(e.target.files?.[0]); e.target.value = '' }} />
        <label className="rc-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />Use a photo of yourself or of someone who agreed to it.</label>
        <label className="rc-field-heading" htmlFor="rc-prompt">Prompt <span>{selected.type === 'effect' ? 'Preset' : 'Edit'}</span></label>
        <textarea id="rc-prompt" maxLength={550} value={prompt} readOnly={selected.type === 'effect'} disabled={busy} onChange={e => { setPrompt(e.target.value); requestKey.current = null }} />
        {selected.type === 'effect' && <p className="rc-muted">This effect uses its original preset.</p>}
        <div className="rc-generate-area">
          <button className="rc-generate" data-recreate-generate disabled={busy || photoBusy || active || !quote?.available || quote.credits === null || !consent || !photos.length || (selected.type === 'effect' && photos.length !== selected.photoSlots)} onClick={() => void generate(false)}>{busy ? 'Preparing…' : active ? 'Creating…' : 'Generate'}{quote?.credits !== null && quote?.credits !== undefined && <span>✦ {quote.credits}</span>}</button>
          {quote && !quote.available && <p className="rc-muted">This option is unavailable for your account.</p>}
          <button className="rc-simulate" disabled={busy} onClick={() => void generate(true)}>Simulate · no generation</button>
        </div>
        {simulation && <output className="rc-result"><strong>Simulation · no generation</strong><p>{simulation.format} · {simulation.seconds} s · {simulation.mode}</p><p>Up to {simulation.photos} photos. No upload, debit or render was made.</p></output>}
        {clip && <div className="rc-result" aria-live="polite"><strong>{clip.status === 'done' ? 'Your clip is ready' : clip.status === 'failed' ? 'Generation failed' : 'Creating your clip'}</strong>{clip.status === 'done' && clip.video_url && <><video src={clip.video_url} controls playsInline /><a href={clip.video_url} download>Download ↗</a></>}{clip.status === 'failed' && <p>{clip.credits_refunded ? 'Your credit refund was confirmed.' : 'Check your clips for the final billing status.'}</p>}<Link href="/clips">My clips ↗</Link></div>}
      </aside>}
      <section className="rc-gallery" ref={galleryRef} aria-label="Motion Library">
        <div className="rc-gallery-heading"><span className="rc-eyebrow">RECREATE</span><h1>Turn one video<br />into your next moment.</h1><p>Choose a Kineo format. Make it yours.</p></div>
        <div className="rc-tabs"><span aria-current="page">Kineo</span></div>
        <div className="rc-grid">{RECREATE_FORMATS.map((f, index) => <article key={f.id} className={`rc-card ${index % 4 === 1 ? 'rc-card-short' : ''} ${selected?.id === f.id ? 'rc-card-selected' : ''}`}>
          <video src={f.preview} poster={f.poster} autoPlay muted loop playsInline preload="metadata" aria-label={f.title} />
          <div className="rc-card-top"><button onClick={() => { setReport(f); setExpanded(null) }} aria-label={`Report ${f.title}`}>⋯</button><button onClick={() => { setExpanded(f); setReport(null) }} aria-label={`Expand ${f.title}`}>⤢</button></div>
          <div className="rc-card-bottom"><h2>{f.title}</h2><div><button className={social[f.id]?.liked ? 'rc-liked' : ''} disabled={!social[f.id] || socialBusy} aria-label={`Like ${f.title}`} aria-pressed={social[f.id]?.liked ?? false} onClick={() => void like(f)}>♡{social[f.id]?.count > 0 ? ` ${social[f.id].count}` : ''}</button><button disabled={busy} onClick={() => choose(f)}>Recreate ↗</button></div></div>
        </article>)}</div>
      </section>
    </div>
    <dialog ref={dialogRef} className="rc-dialog" onCancel={() => { setExpanded(null); setReport(null) }} onClick={e => { if (e.target === e.currentTarget) { setExpanded(null); setReport(null) } }}>
      <button className="rc-close" autoFocus aria-label="Close" onClick={() => { setExpanded(null); setReport(null) }}>×</button>
      {expanded && <><h2>{expanded.title}</h2><video src={expanded.preview} poster={expanded.poster} autoPlay muted loop playsInline controls /><button onClick={() => { choose(expanded); setExpanded(null) }}>Recreate ↗</button></>}
      {report && <><h2>Report {report.title}</h2><label>Reason<select value={reason} onChange={e => setReason(e.target.value)}><option value="rights">Rights or consent</option><option value="unsafe">Unsafe content</option><option value="other">Other</option></select></label><button disabled={socialBusy} onClick={() => void sendReport()}>Send report</button></>}
    </dialog>
  </main>
}
