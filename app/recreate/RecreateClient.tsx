'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { KineoBrandIcon } from '@/components/KineoBolt'
import { RECREATE_FORMATS, recreateFormat, type RecreateFormat } from '@/lib/recreate/formats'
import { ownedClipImageUrl } from '@/lib/clips/clipCatalog'
import { publicRecreatePath } from '@/lib/recreate/entry'
import { recreatePublicMedia } from '@/lib/recreate/catalogPublic'
import { cadastroComVolta } from '@/lib/growth/visitanteEscreveAntes'
import { clearRecreateFlowDraft, expireRecreateFlowDrafts, loadRecreateFlowDraft, saveRecreateFlowDraft } from '@/lib/recreate/flowDraft'
import { compressPhoto, cropFace, composePairPhoto } from '@/lib/recreate/photos'
import RecreatePlayer, { ExampleCover } from './RecreatePlayer'
import CreateTabs from '@/components/create/CreateTabs' // KINEO-TELA-NOVA-1011
import CreateNavConta from '@/components/create/CreateNavConta' // KINEO-TELA-NOVA-CABECALHO-1011 — saldo · Pricing · My videos, só com as abas
import './recreate.css'
import './currentFlow.css'
import { downloadVideoFile } from '@/lib/videoDownload' // KINEO-DOWNLOAD-NOSSO-1311
import { downloadHref } from '@/lib/downloadNosso'

// KINEO-RECREATE-TRAVA-1011 — the provider returned the base video without the customer: the server refunded and failed the clip.
const NOT_SWAPPED_MESSAGE = "We couldn't put you in this video. Nothing was charged. Try a clearer, front-facing photo or another video."
type Social = { count: number; liked: boolean }
export type Quote = { id: string; credits: number | null; available: boolean; shortfall: number }
type Photo = { file: File; url: string }
type Clip = { id: string; status: string; video_url?: string | null; credits_refunded?: number; reason?: string; queued?: boolean; queue_position?: number; message?: string; needs_status?: boolean }
type FlowBasePath = '/recreate' | '/recreate-flow-preview'
type Attempt = { key: string; model: string; payload: Record<string, unknown> }
const attemptStorage = (account: string, model: string) => `kineo:recreate:flow:attempt:${account}:${model}`
function savedAttempt(value: unknown, account: string, model: string): Attempt | null {
  if (!value || typeof value !== 'object') return null
  const saved = value as Record<string, unknown>, payload = saved.payload as Record<string, unknown> | undefined
  const format = recreateFormat(model)
  if (!format || !publicRecreatePath(model) || saved.account !== account || saved.model !== model || typeof saved.key !== 'string' || !/^[A-Za-z0-9._:-]{8,100}$/.test(saved.key) || !payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const allowed = ['format', 'mode', 'seconds', 'prompt', 'consent', 'simulate', format.type === 'swap' ? 'photos' : 'image_url']
  if (Object.keys(payload).length !== allowed.length || Object.keys(payload).some(key => !allowed.includes(key)) || payload.format !== model || payload.mode !== 'swap' || payload.seconds !== format.seconds || payload.consent !== true || payload.simulate !== false || typeof payload.prompt !== 'string' || payload.prompt.length > 550) return null
  const urls = format.type === 'swap' ? payload.photos : [payload.image_url]
  if (!Array.isArray(urls) || urls.length !== (format.type === 'swap' ? format.photoSlots : 1) || urls.some(url => typeof url !== 'string' || !ownedClipImageUrl(url, account, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''))) return null
  return { key: saved.key, model, payload }
}
async function flowJson(url: string, init: RequestInit = {}): Promise<{ response: Response; data: Record<string, any> }> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      (async () => { const response = await fetch(url, { ...init, signal: controller.signal }); const value = await response.json(); return { response, data: value && typeof value === 'object' && !Array.isArray(value) ? value : {} } })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('This step timed out.')) }, 30_000) }),
    ])
  } finally { if (timer !== undefined) clearTimeout(timer) }
}

export default function RecreateClient({ initialId, internalTools = false, formatIds, createTabs = false, currentFlow = false, signedIn = true, accountKey = null, draftRef, flowBasePath = '/recreate-flow-preview', guestQuotes = [] }: { initialId?: string; internalTools?: boolean; formatIds?: string[]; createTabs?: boolean; currentFlow?: boolean; signedIn?: boolean; accountKey?: string | null; draftRef?: string; flowBasePath?: FlowBasePath; guestQuotes?: readonly Quote[] }) {
  // KINEO-RECREATE-TRAVA-1011 — the server pages pass the formats this account may request (unapproved swaps: house only).
  const permitted = formatIds ? RECREATE_FORMATS.filter(f => formatIds.includes(f.id)) : RECREATE_FORMATS
  const catalog = currentFlow && !signedIn ? permitted.filter(f => publicRecreatePath(f.id) !== null) : permitted
  const [selected, setSelected] = useState(() => catalog.find(f => f.id === initialId) ?? null)
  const [photos, setPhotos] = useState<(Photo | null)[]>([])
  const [prompt, setPrompt] = useState(selected?.prompt ?? '')
  // KINEO-RECREATE-ELEVADOR-1011 [fundador 10/11: "não quero esse termo de agree"] — no checkbox: pressing Generate with the notice below is the confirmation.
  const [consent] = useState(true)
  const [quotes, setQuotes] = useState<Quote[]>(() => currentFlow && !signedIn ? [...guestQuotes] : [])
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
  const [restoring, setRestoring] = useState(currentFlow && !!draftRef)
  const [uncertain, setUncertain] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [authRetry, setAuthRetry] = useState(false)
  const [flowQuoteReady, setFlowQuoteReady] = useState(!currentFlow || !signedIn)
  const [statusPaused, setStatusPaused] = useState(false)
  const [availabilityRetry, setAvailabilityRetry] = useState(false)
  const flowBusy = useRef(false)
  const attempt = useRef<Attempt | null>(null)
  const activeDraft = useRef<string | undefined>(draftRef)
  const flowAlive = useRef(true)
  const handoffApproved = useRef(false)
  const canEdit = !currentFlow || (!restoring && !uncertain)
  const mediaFor = (f: RecreateFormat) => currentFlow && publicRecreatePath(f.id) ? recreatePublicMedia(f) : { video: f.preview, poster: f.poster }
  const selectedMedia = selected ? mediaFor(selected) : null
  function clearAttempt(model: string) {
    attempt.current = null
    if (accountKey) try { sessionStorage.removeItem(attemptStorage(accountKey, model)) } catch { /* Memory still protects this page. */ }
  }
  useEffect(() => { flowAlive.current = true; return () => { flowAlive.current = false } }, [])
  useEffect(() => {
    if (!currentFlow) return
    void expireRecreateFlowDrafts().catch(() => {})
    const timer = setInterval(() => void expireRecreateFlowDrafts().catch(() => {}), 60_000)
    return () => clearInterval(timer)
  }, [currentFlow])
  useEffect(() => {
    if (!currentFlow || !signedIn || !accountKey || !selected) return
    try {
      const storageKey = attemptStorage(accountKey, selected.id)
      const raw = sessionStorage.getItem(storageKey)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (typeof saved.key === 'string' && typeof saved.at === 'number' && Date.now() - saved.at >= 0 && Date.now() - saved.at < 24 * 60 * 60 * 1000) {
        const restored = savedAttempt(saved, accountKey, selected.id)
        attempt.current = restored
        requestKey.current = restored?.key ?? null
        setUncertain(true)
        setMessage(restored ? 'Your earlier request is ready to retry unchanged. Local photo files were not restored. Nothing starts until you press Retry same request.' : 'An earlier request may have started. Check My videos before creating another. This page will not send it again.')
      } else sessionStorage.removeItem(storageKey)
    } catch { /* A missing pointer never starts a request. */ }
  }, [currentFlow, signedIn, accountKey, selected?.id])
  useEffect(() => {
    if (!currentFlow || !draftRef || !initialId) return
    let cancelled = false
    const restoreTask = photoTask.current
    setRestoring(true)
    void loadRecreateFlowDraft(draftRef, initialId, accountKey).then(draft => {
      if (cancelled || photoTask.current !== restoreTask) return
      if (!draft) { setMessage('This saved draft is unavailable or has expired. Choose your photos again.'); return }
      const next = draft.photos.map(file => ({ file, url: URL.createObjectURL(file) }))
      for (const photo of photosRef.current) if (photo) URL.revokeObjectURL(photo.url)
      setPhotos(next); setPrompt(draft.prompt); requestKey.current = draft.requestKey ?? null
      activeDraft.current = draftRef
      setMessage('Your photos are back. Review your version, then press Generate.')
    }).catch(() => { if (!cancelled) setMessage('Could not restore your photos. Keep the originals and choose them again.') }).finally(() => { if (!cancelled) setRestoring(false) })
    return () => { cancelled = true }
  }, [currentFlow, draftRef, initialId, accountKey])
  // KINEO-DOWNLOAD-NOSSO-1311 [dono 13/11 ~20:10: "a URL ainda tá parecendo Supabase lá em cima"] — Download BAIXA com o nome da Kineo pelo
  // baixador da casa (conta video_download_clicked / video_downloaded, surface 'recreate'); o href é a rota do nosso domínio (/api/download).
  const downloadName = `kineo-recreate-${selected?.id ?? 'video'}.mp4`
  function onDownload(event: { preventDefault: () => void }) {
    if (!clip?.video_url) return
    event.preventDefault()
    void downloadVideoFile({ url: clip.video_url, filename: downloadName, exportType: 'current_asset', surface: 'recreate', videoId: clip.id, extra: { format: selected?.id ?? null } })
  }
  useEffect(() => () => { photoTask.current++; for (const photo of photosRef.current) if (photo) URL.revokeObjectURL(photo.url) }, [])

  async function loadQuotes() {
    if (currentFlow && !signedIn) { setQuotes([...guestQuotes]); setFlowQuoteReady(true); return }
    if (currentFlow) { setFlowQuoteReady(false); setAvailabilityRetry(false) }
    try {
      const result = currentFlow ? await flowJson('/api/recreate', { cache: 'no-store' }) : null
      const res = result?.response ?? await fetch('/api/recreate', { cache: 'no-store' })
      const data = result?.data ?? await res.json()
      if (!res.ok) throw Object.assign(new Error(data.error), { status: res.status })
      if (currentFlow && !Array.isArray(data.catalog)) throw new Error('Availability response missing.')
      setQuotes(data.catalog)
      if (currentFlow) { setFlowQuoteReady(true); setAuthRetry(false); setMessage(previous => previous === 'Could not check availability. Retry before generating.' ? '' : previous) }
    } catch (error) { setMessage('Could not check availability. Retry before generating.'); if (currentFlow) { setAvailabilityRetry(true); if ((error as { status?: number }).status === 401 || (error as { status?: number }).status === 404) setAuthRetry(true) } }
  }
  async function loadSocial() {
    if (currentFlow && !signedIn) return
    try {
      const res = await fetch('/api/recreate/social', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSocial(Object.fromEntries(data.items.map((i: Social & { id: string }) => [i.id, { count: i.count, liked: i.liked }])))
    } catch { setMessage('Likes are unavailable. No counts are being estimated.') }
  }
  useEffect(() => { void loadQuotes(); void loadSocial() }, [currentFlow, signedIn])
  useEffect(() => {
    const dialog = dialogRef.current
    if (expanded || report) { if (dialog && !dialog.open) dialog.showModal() }
    else dialog?.close()
  }, [expanded, report])
  useEffect(() => {
    if (!clip || (!['pending', 'processing'].includes(clip.status) && !(currentFlow && clip.needs_status)) || (currentFlow && statusPaused)) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const statusUrl = `/api/recreate/status?id=${encodeURIComponent(clip.id)}`
        const result = currentFlow ? await flowJson(statusUrl, { cache: 'no-store' }) : null
        const res = result?.response ?? await fetch(statusUrl, { cache: 'no-store' })
        const data = result?.data ?? await res.json()
        if (!res.ok) throw new Error(data.error)
        if (currentFlow && (!data.clip || data.clip.id !== clip.id || !['pending', 'processing', 'done', 'failed'].includes(data.clip.status) || (data.clip.status === 'done' && typeof data.clip.video_url !== 'string') || (data.clip.status === 'failed' && typeof data.clip.credits_refunded !== 'number'))) throw new Error('Status details unavailable.')
        if (!cancelled) { setClip(data.clip); if (['done', 'failed'].includes(data.clip.status)) void loadQuotes() }
      } catch { if (!cancelled) { setMessage('Status unavailable. Retry the status check; your clip will not be generated again.'); if (currentFlow) setStatusPaused(true); else setClip({ ...clip }) } }
    }, 6000)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [clip, currentFlow, statusPaused])
  function choose(f: RecreateFormat) {
    if (!canEdit) return
    if (busy || photoLock.current || (clip && ['pending', 'processing'].includes(clip.status))) return
    if (f.id === selected?.id) return
    if (currentFlow && photos.some(Boolean) && !window.confirm('Changing the template clears these photos. Continue?')) return
    setSelected(f); setPrompt(f.prompt); setPhotos([]); setClip(null); setSimulation(null); setMessage(''); requestKey.current = null
    handoffApproved.current = false
    setPhotoErrors([]); setDragging(null); setDetailsOpen(false); setCreateError(false)
    if (currentFlow) { attempt.current = null; activeDraft.current = undefined; setAuthRetry(false) }
    for (const photo of photos) if (photo) URL.revokeObjectURL(photo.url)
    window.history.replaceState(null, '', `${currentFlow ? flowBasePath : '/recreate'}/${f.id}`)
    if (currentFlow) window.requestAnimationFrame(() => document.querySelector('.rc-current-flow .rc-panel')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }))
    if (!currentFlow && window.matchMedia('(max-width: 640px)').matches) window.requestAnimationFrame(() => document.querySelector('.rc-reference')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  function removePhoto(index: number) {
    if (!canEdit) return
    if (busy || photoLock.current) return
    photoTask.current++
    handoffApproved.current = false
    const photo = photos[index]
    if (photo) URL.revokeObjectURL(photo.url)
    setPhotos(previous => previous.map((p, i) => i === index ? null : p)); requestKey.current = null
    setPhotoErrors(previous => previous.map((error, i) => i === index ? '' : error))
  }
  function pickPhoto(index: number) {
    if (!canEdit) return
    if (busy || photoLock.current) return
    photoSlot.current = index
    fileRef.current?.click()
  }
  async function addPhoto(file: File | undefined, index: number) {
    if (!canEdit || !selected || !file || photoLock.current || busy || index < 0 || index >= selected.photoSlots) return
    photoLock.current = true
    handoffApproved.current = false
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
    const result = currentFlow ? await flowJson('/api/avatar/upload', { method: 'POST', body: form }) : null
    const res = result?.response ?? await fetch('/api/avatar/upload', { method: 'POST', body: form })
    const data = result?.data ?? await res.json()
    if (!res.ok || typeof data.url !== 'string') throw Object.assign(new Error(data.error ?? 'Photo upload failed.'), { status: res.status })
    uploaded.current.set(file, data.url)
    return data.url
  }
  const pairCache = useRef<{ a: File; b: File; file: File } | null>(null)
  async function goToSignup() {
    if (!selected) return
    if (uncertain && attempt.current) {
      handoffApproved.current = true
      window.location.assign(cadastroComVolta(`${flowBasePath}/${selected.id}`))
      return
    }
    const files = photos.filter((photo): photo is Photo => photo !== null).map(photo => photo.file)
    const ref = await saveRecreateFlowDraft(selected.id, files, prompt, requestKey.current ?? undefined, accountKey)
    if (!flowAlive.current) return
    if (!ref) throw new Error('Could not save your photos on this device. Keep this page open and try again.')
    activeDraft.current = ref
    handoffApproved.current = true
    window.location.assign(cadastroComVolta(`${flowBasePath}/${selected.id}?${new URLSearchParams({ draft: ref })}`))
  }
  async function generateCurrentFlow() {
    if (!selected || flowBusy.current || photoLock.current || restoring || (clip && ['pending', 'processing'].includes(clip.status))) return
    if (signedIn && !accountKey) { setMessage('Could not verify your account. Sign in again before generating.'); setAuthRetry(true); return }
    if (uncertain && !attempt.current) { setMessage('Check My videos for the earlier request before starting another.'); return }
    const currentQuote = quotes.find(q => q.id === selected.id)
    const readyPhotos = photos.filter((photo): photo is Photo => photo !== null)
    if (!uncertain && (!flowQuoteReady || !currentQuote?.available || currentQuote.credits === null || readyPhotos.length !== selected.photoSlots || photoErrors.some(Boolean))) return
    const retrying = uncertain && attempt.current !== null
    flowBusy.current = true; setBusy(true); setMessage(''); setCreateError(false)
    try {
      if (!requestKey.current) requestKey.current = `recreate-${crypto.randomUUID()}`
      if (!signedIn) { await goToSignup(); return }
      if (!uncertain && (currentQuote?.shortfall ?? 0) > 0) throw new Error(`You need ${currentQuote!.shortfall} more credits.`)
      let sent = attempt.current
      if (!sent) {
        setUploading(true)
        const payload: Record<string, unknown> = { format: selected.id, mode: 'swap', seconds: selected.seconds, prompt, consent, simulate: false }
        if (selected.type === 'swap') payload.photos = await Promise.all(readyPhotos.map(photo => upload(photo.file)))
        else {
          let file = readyPhotos[0].file
          if (selected.photoSlots === 2) {
            const [a, b] = readyPhotos.map(photo => photo.file)
            if (pairCache.current?.a !== a || pairCache.current?.b !== b) pairCache.current = { a, b, file: await composePairPhoto(a, b) }
            file = pairCache.current.file
          }
          payload.image_url = await upload(file)
        }
        sent = { key: requestKey.current, model: selected.id, payload }
        attempt.current = sent
      }
      if (!flowAlive.current) return
      setUploading(false)
      if (accountKey) {
        try {
          const storageKey = attemptStorage(accountKey, sent.model), snapshot = JSON.stringify({ ...sent, account: accountKey, at: Date.now() })
          sessionStorage.setItem(storageKey, snapshot)
          if (sessionStorage.getItem(storageKey) !== snapshot) throw new Error('Snapshot not saved.')
        } catch {
          if (!retrying) { clearAttempt(sent.model); requestKey.current = null }
          throw Object.assign(new Error('Could not save this request for safe retry. Keep this page open and try again, or check My videos.'), { uncertain: retrying })
        }
      }
      let response: Response
      let data: Record<string, any>
      try {
        const result = await flowJson('/api/recreate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': sent.key }, body: JSON.stringify(sent.payload) })
        response = result.response; data = result.data
      } catch { throw Object.assign(new Error('Could not confirm whether this request started. Retry the same request or check My videos.'), { uncertain: true }) }
      if (!response.ok) {
        const knownRefusal = ['storage', 'moderation_unavailable', 'moderation_unprocessable', 'provider_rejected', 'provider_failed', 'engine_refused', 'not_swapped', 'swap_unchanged'].includes(data.code)
        const authDuringRetry = retrying && (response.status === 401 || response.status === 404)
        const ambiguous = authDuringRetry || data.code === 'idempotency_conflict' || data.code === 'submit_ambiguous' || (response.status >= 500 && !knownRefusal)
        if (!ambiguous) { clearAttempt(sent.model); requestKey.current = null; setUncertain(false); if (data.code === 'credits') void loadQuotes() }
        throw Object.assign(new Error(typeof data.error === 'string' ? data.error : 'Could not start. Check your photos and try again.'), { status: response.status, uncertain: ambiguous })
      }
      if (!data.clip || typeof data.clip.id !== 'string' || !['pending', 'processing', 'done', 'failed'].includes(data.clip.status)) throw Object.assign(new Error('Could not confirm this request. Retry it unchanged or check My videos.'), { uncertain: true })
      const needsStatus = (data.clip.status === 'done' && typeof data.clip.video_url !== 'string') || (data.clip.status === 'failed' && typeof data.clip.credits_refunded !== 'number')
      clearAttempt(sent.model); setUncertain(false); setStatusPaused(false); setClip(needsStatus ? { ...data.clip, needs_status: true } : data.clip)
      if (activeDraft.current) { const ref = activeDraft.current; activeDraft.current = undefined; void clearRecreateFlowDraft(ref).catch(() => {}) }
      void loadQuotes()
    } catch (error) {
      if (!flowAlive.current) return
      const failure = error as Error & { status?: number; uncertain?: boolean }
      setCreateError(true); setMessage(failure.message || 'This step could not finish. Please try again.')
      if (retrying && (failure.status === 401 || failure.status === 404)) {
        setUncertain(true); setAuthRetry(true)
        setMessage('This option is unavailable or your session has expired. Your earlier request is unchanged. Sign in again or check My videos.')
        if (failure.status === 401) {
          try { await goToSignup() } catch (saved) { if (flowAlive.current) setMessage(saved instanceof Error ? saved.message : 'Keep this page open and sign in again.') }
        }
      }
      else if (failure.uncertain) setUncertain(true)
      else if (failure.status === 404) { setAuthRetry(true); setMessage('This option is unavailable or your session has expired. Your photos are still here.') }
      else if (failure.status === 401) {
        try { await goToSignup() } catch (saved) { if (flowAlive.current) setMessage(saved instanceof Error ? saved.message : 'Keep this page open. Your photos could not be saved.') }
      }
    } finally { flowBusy.current = false; if (flowAlive.current) { setBusy(false); setUploading(false) } }
  }
  async function generate(simulate: boolean) {
    if (currentFlow && !simulate) { await generateCurrentFlow(); return }
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
    if (!report || (currentFlow && !signedIn)) return
    setSocialBusy(true)
    try {
      const res = await fetch('/api/recreate/social', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ format: report.id, action: 'report', reason }) })
      if (!res.ok) throw new Error()
      setReport(null); setMessage('Report saved. Thank you.')
    } catch { setMessage('Report was not saved. Please retry.') }
    finally { setSocialBusy(false) }
  }
  const quote = selected ? quotes.find(q => q.id === selected.id) : null
  const active = !!clip && (['pending', 'processing'].includes(clip.status) || (currentFlow && clip.needs_status === true))
  // KINEO-CAMINHOS-DO-VIDEO-1311 — no celular o resultado nascia no fim do painel, atrás do botão fixo: quando fica pronto (ou falha), a tela rola até ele.
  const fimDoClipe = clip && ['done', 'failed'].includes(clip.status) ? clip.status : null
  useEffect(() => { if (!currentFlow && fimDoClipe) document.querySelector('.rc-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [fimDoClipe, currentFlow])
  const photoCount = photos.filter(Boolean).length
  const photosReady = !!selected && photoCount === selected.photoSlots
  const editingDisabled = busy || photoBusy || active || (currentFlow && (restoring || uncertain))
  const photoIssue = photoErrors.some(Boolean)
  const photosDone = photosReady && consent && !photoIssue
  type StepState = 'todo' | 'active' | 'done' | 'error'
  const states: StepState[] = [photoIssue ? 'error' : photosDone ? 'done' : 'active', photosDone ? detailsOpen ? 'active' : 'done' : 'todo', createError || clip?.status === 'failed' ? 'error' : clip?.status === 'done' ? 'done' : active || photosDone && !detailsOpen ? 'active' : 'todo']
  const stateLabel = (state: StepState) => ({ todo: 'To do', active: 'Active', done: 'Done', error: 'Needs attention' })[state]
  const marker = (step: number) => <span className="rc-step-number" aria-hidden="true">{states[step - 1] === 'done' ? '✓' : states[step - 1] === 'error' ? '!' : step}</span>
  const blocker = busy || photoBusy ? 'Preparing your photos…' : active ? 'Creating your version: about 3 minutes. You can leave this page; it will be in My videos.' : !quote ? 'Checking availability…' : !quote.available || quote.credits === null ? 'This option is currently unavailable.' : quote.shortfall > 0 ? `You need ${quote.shortfall} more credits.` : photoIssue ? 'Replace the highlighted photo.' : !photosReady ? selected?.photoSlots === 2 ? 'Add both photos to continue.' : 'Add your photo to continue.' : !consent ? 'Confirm photo permission to continue.' : 'Ready when you are.'
  const queuePosition = clip?.queued === true && Number.isInteger(clip.queue_position) && (clip.queue_position ?? 0) > 0 ? clip.queue_position : null
  const flowState = uncertain ? 'Request not confirmed' : busy ? signedIn ? uploading ? 'Uploading your photos…' : 'Sending your request…' : 'Saving your photos…' : clip?.needs_status ? 'Checking your version…' : clip?.status === 'done' ? 'Your version is ready' : clip?.status === 'failed' ? 'This version could not be completed' : clip?.queued ? queuePosition === null ? 'In line' : `In line · position ${queuePosition}` : active ? 'Creating your version' : ''
  const flowFailure = clip?.credits_refunded ? clip.reason === 'not_swapped' ? NOT_SWAPPED_MESSAGE : 'Your credit refund was confirmed. Try another photo or template.' : 'Check My videos for the final billing status before starting another.'
  function leaveFlow(event: { preventDefault(): void }) {
    if (currentFlow && photos.some(Boolean) && !clip && !window.confirm('Your photos are still on this page. Leave this version?')) event.preventDefault()
  }
  async function signInAgain() {
    if (flowBusy.current || busy) return
    flowBusy.current = true; setBusy(true)
    try { await goToSignup() } catch (error) { setMessage(error instanceof Error ? error.message : 'Keep this page open and try again.') }
    finally { flowBusy.current = false; if (flowAlive.current) setBusy(false) }
  }
  useEffect(() => {
    if (!currentFlow || (!photos.some(Boolean) && !uncertain) || clip) return
    const warn = (event: BeforeUnloadEvent) => { if (handoffApproved.current) return; event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [currentFlow, photos, uncertain, clip])
  function showTemplates() {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    galleryRef.current?.querySelector<HTMLElement>('h1, h2')?.focus({ preventScroll: true })
  }
  const formFields = selected ? <>
        <div className="rc-panel-intro"><span className="rc-eyebrow">Recreate</span>{createTabs || currentFlow ? <h1>Your version</h1> : <h1>Your version, step by step.</h1>}</div>
        {currentFlow && <div className="rc-flow-template"><img src={selectedMedia!.poster} alt="" /><div><strong>{selected.title}</strong><button type="button" onClick={showTemplates} disabled={editingDisabled}>Change video ↗</button></div><Link href={`${flowBasePath}/your-video`} onClick={leaveFlow}>Use your video</Link></div>}
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
                <button className={`rc-upload ${photo ? 'rc-upload-filled' : ''} ${dragging === index ? 'rc-upload-dragging' : ''}`} disabled={editingDisabled} onClick={() => pickPhoto(index)} onPaste={currentFlow ? e => { const file = Array.from(e.clipboardData.items).find(item => item.kind === 'file')?.getAsFile(); if (file) { e.preventDefault(); if (!editingDisabled) void addPhoto(file, index) } } : undefined} onDragOver={e => { e.preventDefault(); if (!editingDisabled) { e.dataTransfer.dropEffect = 'copy'; setDragging(index) } }} onDragLeave={() => setDragging(null)} onDrop={e => { e.preventDefault(); setDragging(null); if (!editingDisabled) void addPhoto(e.dataTransfer.files[0], index) }} aria-invalid={!!photoErrors[index]} aria-describedby={photoErrors[index] ? `rc-photo-error-${index}` : undefined} aria-label={photo ? `Change photo ${index + 1}` : selected.photoSlots > 1 ? `Add photo of person ${index + 1}` : 'Add your photo'}>
                  {photo ? <img src={photo.url} alt={`Prepared photo ${index + 1}`} /> : <><span className="rc-upload-plus" aria-hidden="true">+</span><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M12 18v-5a5 5 0 0 1 5-5h3m8 0h3a5 5 0 0 1 5 5v5M12 30v5a5 5 0 0 0 5 5h3m8 0h3a5 5 0 0 0 5-5v-5" /><circle cx="24" cy="21" r="7" /><path d="M15 34c1-7 17-7 18 0" /></svg></>}
                  <span className="rc-upload-label"><strong>{photoBusy && photoSlot.current === index ? 'Preparing…' : photo ? 'Change photo' : label}</strong><small>{photo && selected.photoSlots === 2 ? `${side} in the video` : 'Choose photo'}</small></span>
                </button>
                {photo && <button className="rc-remove-photo" disabled={editingDisabled} aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(index)}>×</button>}
                {photoErrors[index] && <p className="rc-photo-error" id={`rc-photo-error-${index}`} role="alert">{photoErrors[index]}</p>}
              </div>
            })}
          </div>
          <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a reference photo" onChange={e => { void addPhoto(e.target.files?.[0], photoSlot.current); e.target.value = '' }} />
          <p className="rc-photo-guide">{currentFlow ? 'Tap, drop or paste · JPG, PNG or WebP · Up to 8 MB' : <>{selected.type === 'swap' ? 'Check the face crop after adding each photo.' : 'One clear face per photo.'}<br />Drop a JPG, PNG or WebP · Up to 8 MB</>}</p>
          <p className="rc-consent">Only upload photos you have the right to use.</p>
        </section>
        <section className={`rc-step rc-step-${states[1]}`} data-step-state={states[1]} aria-label="Adjustments"><details className="rc-adjustments" key={selected.id} open={detailsOpen} onToggle={e => setDetailsOpen(e.currentTarget.open)}>
          <summary>{marker(2)}<span>{selected.type === 'effect' ? 'Effect preset' : 'Face instructions'}</span><small>{stateLabel(states[1])} · {selected.type === 'effect' ? 'Preset' : 'Optional'} <span aria-hidden="true">＋</span></small></summary>
          <div className="rc-detail-body"><label htmlFor="rc-prompt">Prompt</label><textarea id="rc-prompt" maxLength={550} value={prompt} readOnly={selected.type === 'effect'} disabled={editingDisabled} onChange={e => { if (currentFlow && !canEdit) return; photoTask.current++; handoffApproved.current = false; setPrompt(e.target.value); requestKey.current = null }} />{selected.type === 'effect' && <p className="rc-muted">This effect uses its original preset.</p>}</div>
        </details></section>
  </> : null
  return <main className={`recreate${currentFlow ? ' rc-current-flow' : ''}`} data-recreate-current-flow={currentFlow ? true : undefined} aria-busy={currentFlow ? busy || restoring : undefined}>
    <header className={createTabs ? 'rc-nav ct-nav' : 'rc-nav'}><Link href="/" className="rc-brand" onClick={currentFlow ? leaveFlow : undefined}><KineoBrandIcon size={28} /><span>Kineo</span></Link>{createTabs ? <CreateTabs active="recreate" {...(currentFlow ? { recreateHref: flowBasePath } : {})} /> : <Link href={currentFlow ? flowBasePath : '/recreate'} onClick={e => { if (editingDisabled) e.preventDefault(); else if (currentFlow) leaveFlow(e) }}>Recreate</Link>}{createTabs ? <CreateNavConta /> : <Link href="/library">My videos ↗</Link>}</header>
    {message && <div className="rc-notice" role="status">{message} {currentFlow ? <>{uncertain && <Link href="/library">My videos ↗</Link>}{authRetry && <button type="button" disabled={busy} onClick={() => void signInAgain()}>Sign in again</button>}{availabilityRetry && <button type="button" disabled={busy} onClick={() => void loadQuotes()}>Retry availability</button>}</> : <button onClick={() => { void loadQuotes(); void loadSocial() }}>Retry</button>}</div>}
    <div className={`rc-workspace ${selected ? '' : 'rc-library-only'}`}>
      {selected && <aside className="rc-panel" aria-label="Create your version">
        {currentFlow ? <div className="rc-flow-fields">{formFields}</div> : formFields}
        <section className={`rc-step rc-generate-area rc-step-${states[2]}`} data-step-state={states[2]} aria-labelledby="rc-create-heading">
          <div className="rc-step-heading">{marker(3)}<h2 id="rc-create-heading">Create your version</h2><span className="rc-step-status">{stateLabel(states[2])}</span></div>
          <div className="ct-action-dock">
            {/* KINEO-RECREATE-PRONTO-NA-CARA-1311 [dono 13/11 05:45, pelo celular: "o que não veio ainda foi meu vídeo… se uma pessoa estivesse tentando, não estaria
                conseguindo também"] — o vídeo ficava pronto no fim do painel, atrás deste botão fixo. Pronto = o botão vira o aviso e leva ao vídeo. */}
            {currentFlow ? <>
              {clip?.status === 'done' && clip.video_url ? <><a className="rc-generate" href={downloadHref(clip.video_url, downloadName, 'recreate')} onClick={onDownload}>Download ↓</a><p className="rc-next-note"><Link href="/library">My videos ↗</Link> · <button type="button" className="rc-outro" onClick={() => { setClip(null); requestKey.current = null }}>Make another</button></p></> : <>
                <button className="rc-generate" data-recreate-generate aria-describedby="rc-generate-reason" disabled={busy || photoBusy || active || restoring || (uncertain ? !attempt.current : !flowQuoteReady || !quote?.available || quote.credits === null || (signedIn && quote.shortfall > 0) || !photosDone)} onClick={() => void generate(false)}>{restoring ? 'Restoring…' : busy ? uploading ? 'Uploading…' : 'Preparing…' : active ? clip?.needs_status ? 'Checking…' : clip?.queued ? 'In line…' : 'Creating…' : uncertain ? 'Retry same request' : 'Generate'}{quote?.credits != null && <span data-flow-quote={signedIn ? 'confirmed' : 'estimated'}>{signedIn ? '' : 'Estimated '}✦ {quote.credits}</span>}</button>
                <p className="rc-next-note" id="rc-generate-reason" role="status">{uncertain ? 'Keep this request unchanged, or check My videos.' : restoring ? 'Restoring your saved photos…' : active || busy ? flowState : blocker}{signedIn && !!quote?.shortfall && <> <Link href="/pricing">See plans ↗</Link></>}</p>
              </>}
            </> : clip?.status === 'done' && clip.video_url ? <>
              <button className="rc-generate" data-recreate-ready onClick={() => document.querySelector('.rc-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Your version is ready · Watch ↓</button>
              <p className="rc-next-note" role="status"><a href={downloadHref(clip.video_url, downloadName, 'recreate')} onClick={onDownload}>Download ↓</a> · <Link href="/library">My videos ↗</Link> · <button type="button" className="rc-outro" onClick={() => { setClip(null); requestKey.current = null }}>Make another</button></p>
            </> : <>
            <button className="rc-generate" data-recreate-generate aria-describedby="rc-generate-reason" disabled={editingDisabled || !quote?.available || quote.credits === null || quote.shortfall > 0 || !photosDone} onClick={() => void generate(false)}>{busy ? 'Preparing…' : active ? 'Creating…' : 'Generate'}{quote?.credits !== null && quote?.credits !== undefined && <span>✦ {quote.credits}</span>}</button>
            <p className="rc-next-note" id="rc-generate-reason" role="status">{blocker}{quote?.available && quote.shortfall > 0 && <> <Link href="/pricing">See plans ↗</Link></>}</p>
            </>}
          </div>
          {internalTools && <button className="rc-simulate" disabled={busy} onClick={() => void generate(true)}>Simulate · no generation</button>}
        </section>
        {simulation && <output className="rc-result"><strong>Simulation · no generation</strong><p>{simulation.format} · {simulation.seconds} s · {simulation.mode}</p><p>Up to {simulation.photos} photos. No upload, debit or render was made.</p></output>}
        {!currentFlow && clip && <div className="rc-result" aria-live="polite"><strong>{clip.status === 'done' ? 'Your version is ready' : clip.status === 'failed' ? 'Generation failed' : 'Creating your version'}</strong>{clip.status === 'done' && clip.video_url && <><RecreatePlayer src={clip.video_url} label="Your version" /><a href={downloadHref(clip.video_url, downloadName, 'recreate')} onClick={onDownload}>Download ↓</a></>}{clip.status === 'failed' && <p>{clip.reason === 'not_swapped' ? clip.credits_refunded ? NOT_SWAPPED_MESSAGE : "We couldn't put you in this video. Check your videos for the final billing status." : clip.credits_refunded ? 'Your credit refund was confirmed.' : 'Check your videos for the final billing status.'}</p>}<Link href="/library">My videos ↗</Link></div>}
      </aside>}
      {selected && <section className="rc-reference" aria-label="Base video">
        <div className="rc-stage" data-recreate-flow-stage={currentFlow ? true : undefined}>{currentFlow && (flowState || clip) ? <div className="rc-flow-output" aria-live="polite" data-flow-status={uncertain ? 'unknown' : busy ? 'uploading' : clip?.queued ? 'queued' : clip?.status}>
          <h2>{flowState}</h2>{clip?.status === 'done' && clip.video_url ? <RecreatePlayer key={clip.id} src={clip.video_url} label="Your version" stage={{ kind: 'Your version', title: selected.title }} /> : <div className="rc-flow-status">{clip?.status === 'failed' ? <p>{flowFailure}</p> : uncertain ? <p>Keep this page open to retry the same request. If you leave, check My videos before starting another.</p> : <><progress aria-label={flowState} /><p>{active ? 'Your version will also be in My videos.' : 'Keep this page open.'}</p></>}</div>}
          <Link href="/library">My videos ↗</Link>{statusPaused && <button type="button" className="rc-change" onClick={() => setStatusPaused(false)}>Refresh status</button>}
        </div> : <RecreatePlayer key={selected.id} src={selectedMedia!.video} poster={selectedMedia!.poster} preview label={`Base video: ${selected.title}`}
          stage={{ kind: 'Base video', title: selected.title,
            detail: `${selected.type === 'swap' ? 'Face swap' : 'Photo effect'} · ${selected.seconds} s · ${selected.photoSlots} ${selected.photoSlots === 1 ? 'photo' : 'photos'}`,
            action: !createTabs && <button className="rc-change" disabled={editingDisabled} onClick={showTemplates}>Change video ↗</button> }} />}</div>
      </section>}
      <section className="rc-gallery" ref={galleryRef} aria-label="Video templates">
        <div className="rc-gallery-heading">{selected ? <><h2 tabIndex={-1}>Video templates</h2><p>Choose a different starting point.</p></> : <><span className="rc-eyebrow">RECREATE</span><h1 tabIndex={-1}>Video templates</h1><p>Choose a Kineo format. Make it yours.</p></>}{currentFlow && <Link className="rc-flow-own" href={`${flowBasePath}/your-video`} onClick={leaveFlow}>Use your video ↗</Link>}</div>
        <div className="rc-grid">{catalog.map((f, index) => <article key={f.id} className={`rc-card ${index % 4 === 1 ? 'rc-card-short' : ''} ${selected?.id === f.id ? 'rc-card-selected' : ''}`}>
          <ExampleCover src={mediaFor(f).video} poster={mediaFor(f).poster} label={`Choose ${f.title}`} disabled={editingDisabled} onSelect={() => choose(f)} />
          <div className="rc-card-top"><button disabled={currentFlow && !signedIn} onClick={() => { setReport(f); setExpanded(null) }} aria-label={`Report ${f.title}`}>⋯</button><button onClick={() => { setExpanded(f); setReport(null) }} aria-label={`Expand ${f.title}`}>⤢</button></div>
          <div className="rc-card-bottom"><h3>{f.title}</h3><div><button className={social[f.id]?.liked ? 'rc-liked' : ''} disabled={!social[f.id] || socialBusy} aria-label={`Like ${f.title}`} aria-pressed={social[f.id]?.liked ?? false} onClick={() => void like(f)}>♡{social[f.id]?.count > 0 ? ` ${social[f.id].count}` : ''}</button><button className="rc-template-action" disabled={editingDisabled} onClick={() => choose(f)} aria-label={`Use ${f.title}`}>{selected?.id === f.id ? 'Selected ✓' : 'Recreate ↗'}</button></div></div>
        </article>)}</div>
      </section>
    </div>
    <dialog ref={dialogRef} className="rc-dialog" onCancel={() => { setExpanded(null); setReport(null) }} onClick={e => { if (e.target === e.currentTarget) { setExpanded(null); setReport(null) } }}>
      <button className="rc-close" autoFocus aria-label="Close" onClick={() => { setExpanded(null); setReport(null) }}>×</button>
      {expanded && <><h2>{expanded.title}</h2><RecreatePlayer key={expanded.id} src={mediaFor(expanded).video} poster={mediaFor(expanded).poster} preview label={expanded.title} /><button onClick={() => { choose(expanded); setExpanded(null) }}>Recreate ↗</button></>}
      {report && <><h2>Report {report.title}</h2><label>Reason<select value={reason} onChange={e => setReason(e.target.value)}><option value="rights">Rights or consent</option><option value="unsafe">Unsafe content</option><option value="other">Other</option></select></label><button disabled={socialBusy} onClick={() => void sendReport()}>Send report</button></>}
    </dialog>
  </main>
}
