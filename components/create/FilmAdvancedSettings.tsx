'use client'

import { useEffect, useRef, useState } from 'react'
import BrandLogoPicker from '@/components/BrandLogoPicker'
import { CAMERA_PRESETS } from '@/lib/create/filmCameraPresets'
import { uploadFilmStarReference } from '@/lib/create/uploadFilmStarReference'
import { ESTRELA_PUBLIC } from '@/lib/engineLaunch'
import { estrelaDisponivelNoMotor, estrelaSobretaxa } from '@/lib/estrelaDoFilme'
import { validKling4PaidAvailability } from '@/lib/kling4PaidPresentation'
import type { CaixaNaMoldura } from '@/components/studio/StudioSimples'

type Photo = { key: string; preview: string; path: string | null }

function SettingIcon({ kind }: { kind: 'camera' | 'person' | 'logo' }) {
  const paths = {
    camera: 'M3 7h12v10H3z M15 10l6-3v10l-6-3',
    person: 'M15.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0 M5 20v-1a7 7 0 0 1 14 0v1',
    logo: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M3 16l5-5 4 4 3-3 6 6 M15 8h.01',
  }
  return <span className="film-setting-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]} /></svg>
  </span>
}

export function useFilmAdvanced(c: CaixaNaMoldura) {
  const { camera, setCamera } = c
  const [permission, setPermission] = useState(false)
  const [starAllowed, setStarAllowed] = useState<boolean | null>(ESTRELA_PUBLIC ? true : null)
  const [opened, setOpened] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const previews = useRef(new Set<string>())
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    const urls = previews.current
    return () => { alive.current = false; urls.forEach(url => URL.revokeObjectURL(url)); urls.clear() }
  }, [])
  useEffect(() => {
    if (!opened || c.visitor || ESTRELA_PUBLIC) return
    let active = true
    fetch('/api/me/credits', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (active) setStarAllowed(data?.estrela === true) })
      .catch(() => { if (active) setStarAllowed(false) })
    return () => { active = false }
  }, [opened, c.visitor])

  const starSupported = estrelaDisponivelNoMotor(c.motor) && !(c.motor === 'hollywood' && (!validKling4PaidAvailability(c.kling4) || c.kling4.paidLive))
  const starEnabled = !c.visitor && starAllowed === true && starSupported
  const paths = photos.flatMap(photo => photo.path ? [photo.path] : [])
  const starActive = starEnabled && permission && paths.length > 0
  const surcharge = starActive ? estrelaSobretaxa(c.motor, c.duracao) : 0

  function removePhoto(photo: Photo) {
    URL.revokeObjectURL(photo.preview)
    previews.current.delete(photo.preview)
    setPhotos(current => current.filter(item => item.key !== photo.key))
  }
  async function addPhotos(files: File[]) {
    if (!permission || !starEnabled || busy.current || !files.length) return
    busy.current = true
    setUploading(true)
    setError('')
    try {
      for (const file of files.slice(0, 3 - photos.length)) {
        if (!alive.current) break
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
          setError('Choose a JPG, PNG or WebP up to 10 MB.'); continue
        }
        const key = crypto.randomUUID()
        const preview = URL.createObjectURL(file)
        previews.current.add(preview)
        const photo = { key, preview, path: null }
        setPhotos(current => [...current, photo])
        try {
          const path = await uploadFilmStarReference(file, 'Photo upload failed. Try again.')
          if (alive.current) setPhotos(current => current.map(item => item.key === key ? { ...item, path } : item))
        } catch {
          if (alive.current) { removePhoto(photo); setError('Photo upload failed. Try again.') }
        }
      }
    } finally {
      busy.current = false
      if (alive.current) setUploading(false)
    }
  }

  const panel = <section className="film-more-panel" data-film-advanced="">
    <div className="film-more-row"><label htmlFor="film-more-camera"><SettingIcon kind="camera" />Camera</label>
      <select id="film-more-camera" data-film-camera="" value={c.palavraPorPalavra ? '' : camera} disabled={c.palavraPorPalavra} onChange={event => setCamera(event.target.value)}>
        <option value="">Automatic</option>{CAMERA_PRESETS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
      </select>
      {c.palavraPorPalavra && <p>Camera directions are available in idea mode.</p>}
    </div>
    {!c.visitor && (starAllowed || photos.length > 0) && <details className="film-more-section" data-film-star-details=""><summary><SettingIcon kind="person" /><span className="film-setting-name">Person in the film<small>{photos.length ? `${photos.length} of 3 photos` : 'Reference photos'}</small></span></summary>
      <div className="film-setting-content">
      {starEnabled ? <>
        <label className="film-more-consent"><input type="checkbox" checked={permission} disabled={uploading} onChange={event => setPermission(event.target.checked)} />I have permission to use this person’s image.</label>
        <div className="film-more-photos">{photos.map(photo => <div key={photo.key}><img src={photo.preview} alt="Selected reference" /><button type="button" aria-label="Remove photo" onClick={() => removePhoto(photo)}>×</button></div>)}</div>
        {photos.length < 3 && <label className="film-more-upload"><span aria-hidden="true">＋</span> Add photos<input aria-label="Add reference photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!permission || uploading} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void addPhotos(files) }} /></label>}
        {photos.length > 0 && !permission && <p role="status">Confirm permission or remove the photos to generate.</p>}{uploading && <p role="status">Uploading photo…</p>}{error && <p role="alert">{error}</p>}
      </> : <><p>{starAllowed === null ? 'Checking photo availability…' : !starAllowed ? 'Reference photos are unavailable for this account.' : 'Reference photos are unavailable for this model.'}</p>{photos.map(photo => <button type="button" key={photo.key} onClick={() => removePhoto(photo)}>Remove reference photo</button>)}</>}
    </div>
    </details>}
    {!c.visitor && <details className="film-more-section"><summary><SettingIcon kind="logo" /><span className="film-setting-name">Brand logo<small>Applies to all your films</small></span></summary><div className="film-setting-content">{opened && <BrandLogoPicker />}</div></details>}
  </section>

  const blocked = uploading || (photos.length > 0 && !starActive)
  return { panel, open: () => setOpened(true), blocked, surcharge, generate: () => {
    if (blocked || busy.current) return
    if (!starActive) return c.gerar()
    c.gerarComReferencias(paths)
  } }
}
