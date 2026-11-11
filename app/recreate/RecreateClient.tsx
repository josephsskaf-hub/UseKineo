'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { KineoBrandIcon } from '@/components/KineoBolt'
import { RECREATE_FORMATS, type RecreateFormat } from '@/lib/recreate/formats'
import { compressPhoto, cropFace, composePairPhoto } from '@/lib/recreate/photos'
import RecreatePlayer, { ExampleCover } from './RecreatePlayer'
import CreateTabs from '@/components/create/CreateTabs' // KINEO-TELA-NOVA-1011
import CreateNavConta from '@/components/create/CreateNavConta' // KINEO-TELA-NOVA-CABECALHO-1011 — saldo · Pricing · My videos, só com as abas
import './recreate.css'

// KINEO-RECREATE-TRAVA-1011 — the provider returned the base video without the customer: the server refunded and failed the clip.
const NOT_SWAPPED_MESSAGE = "We couldn't put you in this video. Nothing was charged. Try a clearer, front-facing photo or another video."
type Social = { count: number; liked: boolean }
type Quote = { id: string; credits: number | null; available: boolean; shortfall: number }
type Photo = { file: File; url: string }
type Clip = { id: string; status: string; video_url?: string | null; credits_refunded?: number; reason?: string }

export default function RecreateClient({ initialId, internalTools = false, formatIds, createTabs = false }: { initialId?: string; internalTools?: boolean; formatIds?: string[]; createTabs?: boolean }) {
  // KINEO-RECREATE-TRAVA-1011 — the server pages pass the formats this account may request (unapproved swaps: house only).
  const catalog = formatIds ? RECREATE_FORMATS.filter(f => formatIds.includes(f.id)) : RECREATE_FORMATS
  const [selected, setSelected] = useState(() => catalog.find(f => f.id === initialId) ?? null)
  const [photos, setPhotos] = useState<(Photo | null)[]>([])
  const [prompt, setPrompt] = useState(selected?.prompt ?? '')
  // KINEO-RECREATE-ELEVADOR-1011 [fundador 10/11: "não quero esse termo de agree"] — no checkbox: pressing Generate with the notice below is the confirmation.
  const [consent] = useState(true)
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
  const [photoErrors, setPhotoErrors] = useState<string[]>([])
  const [dragging, setDragging] = useState<number | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [createError, setCreateError] = useState(false)
  const photoLock = useRef(false)
  const photoSlot = useRef(0)
  const photoTask = useRef(0)
  const photosRef = useRef(photos)
  photosRef.current = photos
  useEffect(() => () => { photoTask.current++; for (const photo of photosRef.current) if (photo) URL.revokeObjectURL(photo.url) }, [])

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
    if (busy || photoLock.current || (clip && ['pending', 'processing'].includes(clip.status))) return
    if (f.id === selected?.id) return
    setSelected(f); setPrompt(f.prompt); setPhotos([]); setClip(null); setSimulation(null); setMessage(''); requestKey.current = null
    setPhotoErrors([]); setDragging(null); setDetailsOpen(false); setCreateError(false)
    for (const photo of photos) if (photo) URL.revokeObjectURL(photo.url)
    window.history.replaceState(null, '', `/recreate/${f.id}`)
    if (window.matchMedia('(max-width: 640px)').matches) window.requestAnimationFrame(() => document.querySelector('.rc-reference')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  function removePhoto(index: number) {
    if (busy || photoLock.current) return
    const photo = photos[index]
    if (photo) URL.revokeObjectURL(photo.url)
    setPhotos(previous => previous.map((p, i) => i === index ? null : p)); requestKey.current = null
    setPhotoErrors(previous => previous.map((error, i) => i === index ? '' : error))
  }
  function pickPhoto(index: number) {
    if (busy || photoLock.current) return
    photoSlot.current = index
    fileRef.current?.click()
  }
  async function addPhoto(file: File | undefined, index: number) {
    if (!selected || !file || photoLock.current || busy || index < 0 || index >= selected.photoSlots) return
    photoLock.current = true
    const task = ++photoTask.current
    photoSlot.current = index
    setPhotoBusy(true); setPhotoErrors(previous => previous.map((error, i) => i === index ? '' : error)); setDragging(null)
    try {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP photo up to 8 MB.')
      const normalized = await compressPhoto(file, true)
      const prepared = selected.type === 'swap' ? await cropFace(normalized) : normalized
      if (task !== photoTask.current) return
      if (!prepared) throw new Error('Could not crop your face. Try a clear selfie.')
      const previous = photosRef.current[index]
      if (previous) URL.revokeObjectURL(previous.url)
      const photo = { file: prepared, url: URL.createObjectURL(prepared) }
      setPhotos(previous => Array.from({ length: selected.photoSlots }, (_, slot) => slot === index ? photo : previous[slot] ?? null)); requestKey.current = null
    } catch (error) { if (task === photoTask.current) setPhotoErrors(previous => Array.from({ length: selected.photoSlots }, (_, slot) => slot === index ? error instanceof Error ? error.message : 'Could not read your photo.' : previous[slot] ?? '')) }
    finally { photoLock.current = false; if (task === photoTask.current) setPhotoBusy(false) }
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
    if (!selected || busy || (simulate && !internalTools)) return
    setBusy(true); setMessage(''); setSimulation(null); setCreateError(false)
    try {
      let payload: Record<string, unknown> = { format: selected.id, mode: 'swap', seconds: selected.seconds, prompt, consent, simulate }
      if (!simulate) {
        const readyPhotos = photos.filter((p): p is Photo => p !== null)
        const currentQuote = quotes.find(q => q.id === selected.id)
        if (!currentQuote?.available || currentQuote.credits === null) throw new Error('Check availability before generating.')
        if (currentQuote.shortfall > 0) throw new Error(`You need ${currentQuote.shortfall} more credits.`)
        if (!consent || readyPhotos.length !== selected.photoSlots) throw new Error('Add the required photos and confirm permission first.')
        if (selected.type === 'swap') payload.photos = await Promise.all(readyPhotos.map(p => upload(p.file)))
        else {
          let file = readyPhotos[0].file
          if (selected.photoSlots === 2) {
            const [a, b] = readyPhotos.map(p => p.file)
            if (pairCache.current?.a !== a || pairCache.current?.b !== b) pairCache.current = { a, b, file: await composePairPhoto(a, b) }
            file = pairCache.current.file
          }
          payload.image_url = await upload(file)
        }
      }
      if (!requestKey.current) requestKey.current = `recreate-${crypto.randomUUID()}`
      const res = await fetch('/api/recreate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey.current }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'credits') {
          if (typeof data.shortfall === 'number' && data.shortfall > 0) setQuotes(previous => previous.map(q => q.id === selected.id ? { ...q, shortfall: data.shortfall } : q))
          await loadQuotes()
        }
        throw new Error(data.error ?? 'Could not start. Please retry.')
      }
      if (simulate) setSimulation(data)
      else { setClip(data.clip); void loadQuotes() }
    } catch (error) { setCreateError(true); setMessage(error instanceof Error ? error.message : 'Could not confirm. Retry this request before changing the form.') }
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
  const photoCount = photos.filter(Boolean).length
  const photosReady = !!selected && photoCount === selected.photoSlots
  const editingDisabled = busy || photoBusy || active
  const photoIssue = photoErrors.some(Boolean)
  const photosDone = photosReady && consent && !photoIssue
  type StepState = 'todo' | 'active' | 'done' | 'error'
  const states: StepState[] = [photoIssue ? 'error' : photosDone ? 'done' : 'active', photosDone ? detailsOpen ? 'active' : 'done' : 'todo', createError || clip?.status === 'failed' ? 'error' : clip?.status === 'done' ? 'done' : active || photosDone && !detailsOpen ? 'active' : 'todo']
  const stateLabel = (state: StepState) => ({ todo: 'To do', active: 'Active', done: 'Done', error: 'Needs attention' })[state]
  const marker = (step: number) => <span className="rc-step-number" aria-hidden="true">{states[step - 1] === 'done' ? '✓' : states[step - 1] === 'error' ? '!' : step}</span>
  const blocker = busy || photoBusy ? 'Preparing your photos…' : active ? 'Your version is being created.' : !quote ? 'Checking availability…' : !quote.available || quote.credits === null ? 'This option is currently unavailable.' : quote.shortfall > 0 ? `You need ${quote.shortfall} more credits.` : photoIssue ? 'Replace the highlighted photo.' : !photosReady ? selected?.photoSlots === 2 ? 'Add both photos to continue.' : 'Add your photo to continue.' : !consent ? 'Confirm photo permission to continue.' : 'Ready when you are.'
  function showTemplates() {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    galleryRef.current?.querySelector<HTMLElement>('h1, h2')?.focus({ preventScroll: true })
  }
  return <main className="recreate">
    <header className={createTabs ? 'rc-nav ct-nav' : 'rc-nav'}><Link href="/" className="rc-brand"><KineoBrandIcon size={28} /><span>Kineo</span></Link>{createTabs ? <CreateTabs active="recreate" /> : <Link href="/recreate" onClick={e => { if (editingDisabled) e.preventDefault() }}>Recreate</Link>}{createTabs ? <CreateNavConta /> : <Link href="/clips">My videos ↗</Link>}</header>
    {message && <div className="rc-notice" role="status">{message} <button onClick={() => { void loadQuotes(); void loadSocial() }}>Retry</button></div>}
    <div className={`rc-workspace ${selected ? '' : 'rc-library-only'}`}>
      {selected && <aside className="rc-panel" aria-label="Create your version">
        <div className="rc-panel-intro"><span className="rc-eyebrow">Recreate</span>{createTabs ? <h1>Your version</h1> : <h1>Your version, step by step.</h1>}</div>
        {createTabs && <div className="ct-base-choice">
          <img src={selected.poster} alt="" width={44} height={50} />
          <div><small>Base video</small><strong>{selected.title}</strong></div>
          <button type="button" onClick={showTemplates} disabled={editingDisabled} aria-label="Change base video">Change ↗</button>
        </div>}
        <div className="rc-progress"><span>{states.includes('error') ? 'Check the highlighted step' : clip?.status === 'done' ? 'Your version is ready' : photosDone ? 'Your photos are ready' : 'Start with your photos'}</span><div role="progressbar" aria-label="Creation steps completed" aria-valuemin={0} aria-valuemax={3} aria-valuenow={states.filter(state => state === 'done').length}>{states.map((state, index) => <i key={index} className={`rc-progress-${state}`} />)}</div></div>
        <section className={`rc-step rc-step-${states[0]}`} data-step-state={states[0]} aria-labelledby="rc-photo-heading">
          <div className="rc-step-heading">{marker(1)}<h2 id="rc-photo-heading">{selected.photoSlots > 1 ? 'Your photos' : 'Your photo'}</h2><span className="rc-step-status">{photosDone && photos[0] && <img src={photos[0].url} alt="" />}{stateLabel(states[0])}</span></div>
          <p className="rc-muted">{selected.photoSlots > 1 ? 'One photo for each person in the video.' : selected.swapSubject ? `Add a clear photo of your face. Only ${selected.swapSubject} in the video is replaced.` : 'Add a clear photo of your face.'}</p>
          <div className={`rc-photos ${selected.photoSlots === 1 ? 'rc-photos-single' : ''}`} aria-busy={photoBusy}>
            {Array.from({ length: selected.photoSlots }, (_, index) => {
              const photo = photos[index]
              const side = index === 0 ? 'Left' : 'Right'
              const label = selected.photoSlots > 1 ? `${side} person` : 'Add your photo'
              return <div className="rc-photo-slot" key={index}>
                <button className={`rc-upload ${photo ? 'rc-upload-filled' : ''} ${dragging === index ? 'rc-upload-dragging' : ''}`} disabled={editingDisabled} onClick={() => pickPhoto(index)} onDragOver={e => { e.preventDefault(); if (!editingDisabled) { e.dataTransfer.dropEffect = 'copy'; setDragging(index) } }} onDragLeave={() => setDragging(null)} onDrop={e => { e.preventDefault(); setDragging(null); if (!editingDisabled) void addPhoto(e.dataTransfer.files[0], index) }} aria-invalid={!!photoErrors[index]} aria-describedby={photoErrors[index] ? `rc-photo-error-${index}` : undefined} aria-label={photo ? `Change photo ${index + 1}` : selected.photoSlots > 1 ? `Add photo of person ${index + 1}` : 'Add your photo'}>
                  {photo ? <img src={photo.url} alt={`Prepared photo ${index + 1}`} /> : <><span className="rc-upload-plus" aria-hidden="true">+</span><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M12 18v-5a5 5 0 0 1 5-5h3m8 0h3a5 5 0 0 1 5 5v5M12 30v5a5 5 0 0 0 5 5h3m8 0h3a5 5 0 0 0 5-5v-5" /><circle cx="24" cy="21" r="7" /><path d="M15 34c1-7 17-7 18 0" /></svg></>}
                  <span className="rc-upload-label"><strong>{photoBusy && photoSlot.current === index ? 'Preparing…' : photo ? 'Change photo' : label}</strong><small>{photo && selected.photoSlots === 2 ? `${side} in the video` : 'Choose photo'}</small></span>
                </button>
                {photo && <button className="rc-remove-photo" disabled={editingDisabled} aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(index)}>×</button>}
                {photoErrors[index] && <p className="rc-photo-error" id={`rc-photo-error-${index}`} role="alert">{photoErrors[index]}</p>}
              </div>
            })}
          </div>
          <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a reference photo" onChange={e => { void addPhoto(e.target.files?.[0], photoSlot.current); e.target.value = '' }} />
          <p className="rc-photo-guide">{selected.type === 'swap' ? 'Check the face crop after adding each photo.' : 'One clear face per photo.'}<br />Drop a JPG, PNG or WebP · Up to 8 MB</p>
          <p className="rc-consent">Only upload photos you have the right to use.</p>
        </section>
        <section className={`rc-step rc-step-${states[1]}`} data-step-state={states[1]} aria-label="Adjustments"><details className="rc-adjustments" key={selected.id} open={detailsOpen} onToggle={e => setDetailsOpen(e.currentTarget.open)}>
          <summary>{marker(2)}<span>{selected.type === 'effect' ? 'Effect preset' : 'Face instructions'}</span><small>{stateLabel(states[1])} · {selected.type === 'effect' ? 'Preset' : 'Optional'} <span aria-hidden="true">＋</span></small></summary>
          <div className="rc-detail-body"><label htmlFor="rc-prompt">Prompt</label><textarea id="rc-prompt" maxLength={550} value={prompt} readOnly={selected.type === 'effect'} disabled={editingDisabled} onChange={e => { setPrompt(e.target.value); requestKey.current = null }} />{selected.type === 'effect' && <p className="rc-muted">This effect uses its original preset.</p>}</div>
        </details></section>
        <section className={`rc-step rc-generate-area rc-step-${states[2]}`} data-step-state={states[2]} aria-labelledby="rc-create-heading">
          <div className="rc-step-heading">{marker(3)}<h2 id="rc-create-heading">Create your version</h2><span className="rc-step-status">{stateLabel(states[2])}</span></div>
          <div className="ct-action-dock">
            <button className="rc-generate" data-recreate-generate aria-describedby="rc-generate-reason" disabled={editingDisabled || !quote?.available || quote.credits === null || quote.shortfall > 0 || !photosDone} onClick={() => void generate(false)}>{busy ? 'Preparing…' : active ? 'Creating…' : 'Generate'}{quote?.credits !== null && quote?.credits !== undefined && <span>✦ {quote.credits}</span>}</button>
            <p className="rc-next-note" id="rc-generate-reason" role="status">{blocker}{quote?.available && quote.shortfall > 0 && <> <Link href="/pricing">See plans ↗</Link></>}</p>
          </div>
          {internalTools && <button className="rc-simulate" disabled={busy} onClick={() => void generate(true)}>Simulate · no generation</button>}
        </section>
        {simulation && <output className="rc-result"><strong>Simulation · no generation</strong><p>{simulation.format} · {simulation.seconds} s · {simulation.mode}</p><p>Up to {simulation.photos} photos. No upload, debit or render was made.</p></output>}
        {clip && <div className="rc-result" aria-live="polite"><strong>{clip.status === 'done' ? 'Your version is ready' : clip.status === 'failed' ? 'Generation failed' : 'Creating your version'}</strong>{clip.status === 'done' && clip.video_url && <><RecreatePlayer src={clip.video_url} label="Your version" /><a href={clip.video_url} download>Download ↗</a></>}{clip.status === 'failed' && <p>{clip.reason === 'not_swapped' ? clip.credits_refunded ? NOT_SWAPPED_MESSAGE : "We couldn't put you in this video. Check your videos for the final billing status." : clip.credits_refunded ? 'Your credit refund was confirmed.' : 'Check your videos for the final billing status.'}</p>}<Link href="/clips">My videos ↗</Link></div>}
      </aside>}
      {selected && <section className="rc-reference" aria-label="Base video">
        <div className="rc-stage"><RecreatePlayer key={selected.id} src={selected.preview} poster={selected.poster} preview label={`Base video: ${selected.title}`}
          stage={{ kind: 'Base video', title: selected.title,
            detail: `${selected.type === 'swap' ? 'Face swap' : 'Photo effect'} · ${selected.seconds} s · ${selected.photoSlots} ${selected.photoSlots === 1 ? 'photo' : 'photos'}`,
            action: !createTabs && <button className="rc-change" disabled={editingDisabled} onClick={showTemplates}>Change video ↗</button> }} /></div>
      </section>}
      <section className="rc-gallery" ref={galleryRef} aria-label="Video templates">
        <div className="rc-gallery-heading">{selected ? <><h2 tabIndex={-1}>Video templates</h2><p>Choose a different starting point.</p></> : <><span className="rc-eyebrow">RECREATE</span><h1 tabIndex={-1}>Video templates</h1><p>Choose a Kineo format. Make it yours.</p></>}</div>
        <div className="rc-grid">{catalog.map((f, index) => <article key={f.id} className={`rc-card ${index % 4 === 1 ? 'rc-card-short' : ''} ${selected?.id === f.id ? 'rc-card-selected' : ''}`}>
          <ExampleCover src={f.preview} poster={f.poster} label={`Choose ${f.title}`} disabled={editingDisabled} onSelect={() => choose(f)} />
          <div className="rc-card-top"><button onClick={() => { setReport(f); setExpanded(null) }} aria-label={`Report ${f.title}`}>⋯</button><button onClick={() => { setExpanded(f); setReport(null) }} aria-label={`Expand ${f.title}`}>⤢</button></div>
          <div className="rc-card-bottom"><h3>{f.title}</h3><div><button className={social[f.id]?.liked ? 'rc-liked' : ''} disabled={!social[f.id] || socialBusy} aria-label={`Like ${f.title}`} aria-pressed={social[f.id]?.liked ?? false} onClick={() => void like(f)}>♡{social[f.id]?.count > 0 ? ` ${social[f.id].count}` : ''}</button><button disabled={editingDisabled} onClick={() => choose(f)} aria-label={`Use ${f.title}`}>{selected?.id === f.id ? 'Selected ✓' : 'Recreate ↗'}</button></div></div>
        </article>)}</div>
      </section>
    </div>
    <dialog ref={dialogRef} className="rc-dialog" onCancel={() => { setExpanded(null); setReport(null) }} onClick={e => { if (e.target === e.currentTarget) { setExpanded(null); setReport(null) } }}>
      <button className="rc-close" autoFocus aria-label="Close" onClick={() => { setExpanded(null); setReport(null) }}>×</button>
      {expanded && <><h2>{expanded.title}</h2><RecreatePlayer key={expanded.id} src={expanded.preview} poster={expanded.poster} preview label={expanded.title} /><button onClick={() => { choose(expanded); setExpanded(null) }}>Recreate ↗</button></>}
      {report && <><h2>Report {report.title}</h2><label>Reason<select value={reason} onChange={e => setReason(e.target.value)}><option value="rights">Rights or consent</option><option value="unsafe">Unsafe content</option><option value="other">Other</option></select></label><button disabled={socialBusy} onClick={() => void sendReport()}>Send report</button></>}
    </dialog>
  </main>
}
