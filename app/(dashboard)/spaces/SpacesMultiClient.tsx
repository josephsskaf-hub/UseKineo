'use client'

// KINEO-NUVEM-A5-2026-10-02 — Espaços "vários destinos": UMA foto do ponto vazio → 2 a 4 negócios rotulados (café ·
// farmácia · clínica) → UM vídeo antes → depois em que o "Depois" vira o nome de cada negócio. As etapas pagas são as de
// sempre, por destino: foto pronta (/api/images/generate, Nano Banana Pro, 5 cr) e clipe (/api/clips, Kling 2.5) — o
// preço é a soma das etapas, mostrado antes do clique (lib/spaces/spaces.ts spacesMultiCredits). A pesquisa de curadoria
// (/api/spaces/brief) roda por destino, porque um café e uma farmácia não têm o mesmo brief. Montagem: /api/spaces/montage
// com `label` por par (a rota só aceita com SPACES_MULTI_PUBLIC ou conta da casa). O fluxo de uma foto por negócio
// (SpacesClient) não muda.
import { useCallback, useEffect, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import {
  SPACE_DESCRIPTION_MAX,
  SPACE_KINDS,
  SPACE_SIGNATURE_MAX,
  SPACES_DESTINATION_LABEL_MAX,
  SPACES_MULTI_MAX,
  SPACES_MULTI_MIN,
  buildSpaceMotionPrompt,
  buildStagingPrompt,
  spacesMultiCredits,
  type SpaceKind,
} from '@/lib/spaces/spaces'
import { spacesCopy, type SpacesCopyKey } from '@/lib/spaces/spacesCopy'
import { ProductStageStyles, useProductStage } from '@/components/ProductStage'
import { Compare, framesFromVideo, shrink } from './SpacesClient'

const NANO_CREDITS = 5
type DestState = 'idle' | 'researching' | 'staging' | 'staged' | 'animating' | 'clip' | 'failed'
interface Destination {
  key: string
  label: string
  kind: SpaceKind
  description: string
  brief: string[]
  stagedUrl: string | null
  clipUrl: string | null
  state: DestState
  error: string | null
}

const C = { card: 'var(--card)', soft: 'var(--card2)', border: '1px solid var(--border)', text: 'var(--text)', text2: 'var(--text2)', muted: 'var(--muted)', accent: 'var(--accent)', accentSoft: 'var(--accent-soft)', danger: 'var(--danger, #D93025)' }
const part: React.CSSProperties = { padding: '16px 0 4px', borderTop: C.border }
const input: React.CSSProperties = { width: '100%', background: C.card, border: C.border, color: C.text, borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }
const btn = (primary = false, disabled = false): React.CSSProperties => ({
  borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
  border: primary ? '1px solid var(--accent)' : C.border, background: primary ? 'var(--accent)' : C.card, color: primary ? 'var(--on-accent)' : C.text,
})
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let seq = 0
const newKey = () => `d${Date.now().toString(36)}${(seq++).toString(36)}`
const blank = (kind: SpaceKind): Destination => ({ key: newKey(), label: '', kind, description: '', brief: [], stagedUrl: null, clipUrl: null, state: 'idle', error: null })

export default function SpacesMultiClient() {
  const language = useInterfaceLanguage()
  const t = useCallback((key: SpacesCopyKey, vars?: Record<string, string | number>) => spacesCopy(language, key, vars), [language])
  const [photo, setPhoto] = useState<{ blob: Blob; preview: string } | null>(null)
  const [refPath, setRefPath] = useState<string | null>(null)
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null)
  const [rights, setRights] = useState(false)
  const [dests, setDests] = useState<Destination[]>([blank('food'), blank('store')])
  const [signature, setSignature] = useState('')
  const [seal, setSeal] = useState(false)
  const [busy, setBusy] = useState<'research' | 'photos' | 'video' | null>(null)
  const [video, setVideo] = useState<{ status: string; url: string | null; progress: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clipCredits, setClipCredits] = useState(5)
  useProductStage('spaces')

  useEffect(() => {
    fetch('/api/clips', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { engines?: { key: string; credits?: Record<string, number> }[] }) => {
        const k = j.engines?.find((e) => e.key === 'kling')
        if (k?.credits?.['5']) setClipCredits(k.credits['5'])
      })
      .catch(() => undefined)
  }, [])

  const errorText = useCallback((status: number) => (status === 402 ? t('errCredits') : status === 422 ? t('errModeration') : status === 429 ? t('errLimit') : t('errGeneric')), [t])
  const patch = (key: string, p: Partial<Destination>) => setDests((l) => l.map((d) => (d.key === key ? { ...d, ...p } : d)))
  const ready = dests.every((d) => d.label.trim() && d.description.trim().length >= 3)
  const total = spacesMultiCredits(dests.length, NANO_CREDITS, clipCredits)
  const allStaged = dests.every((d) => d.stagedUrl)
  const compareLabels = (d: Destination) => ({ before: t('before'), after: d.label || t('after'), compare: t('compare'), emptyAlt: t('emptyAlt'), readyAlt: t('readyAlt') })

  async function pickFile(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    setError(null)
    try {
      // Vídeo: o quadro do meio (50 %), onde a caminhada costuma mostrar o espaço inteiro.
      const blob = f.type.startsWith('video/') ? (await framesFromVideo(f, 2)).pop() : await shrink(f)
      if (!blob) throw new Error('frame')
      setPhoto({ blob, preview: URL.createObjectURL(blob) })
      setRefPath(null); setBeforeUrl(null)
      setDests((l) => l.map((d) => ({ ...d, stagedUrl: null, clipUrl: null, state: 'idle', error: null })))
    } catch { setError(t('errFile')) }
  }

  async function researchAll() {
    setBusy('research'); setError(null)
    for (const d of dests) {
      if (d.description.trim().length < 3) continue
      patch(d.key, { state: 'researching' })
      const r = await fetch('/api/spaces/brief', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ description: d.description, kind: d.kind }) })
      const j = await r.json().catch(() => null)
      if (!r.ok) { patch(d.key, { state: 'idle' }); setError(errorText(r.status)); break }
      patch(d.key, { brief: Array.isArray(j?.brief) ? (j.brief as string[]) : [], state: 'idle' })
    }
    setBusy(null)
  }

  async function ensureRef(): Promise<string> {
    if (refPath) return refPath
    const fd = new FormData()
    fd.append('file', new File([photo!.blob], 'space.jpg', { type: 'image/jpeg' }))
    fd.append('rights', 'true')
    const r = await fetch('/api/images/reference', { method: 'POST', body: fd })
    const j = await r.json().catch(() => null)
    if (!r.ok || !j?.path) throw new Error(errorText(r.status))
    setRefPath(j.path as string)
    return j.path as string
  }

  async function stageOne(d: Destination, ref: string) {
    patch(d.key, { state: 'staging', error: null })
    try {
      const prompt = buildStagingPrompt({ description: d.description, kind: d.kind, brief: d.brief })
      const r = await fetch('/api/images/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'nanobanana', size: 'portrait_16_9', prompt, reference_paths: [ref], reference_consent: true }) })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.url) throw new Error(errorText(r.status))
      patch(d.key, { stagedUrl: j.url as string, clipUrl: null, state: 'staged' })
      window.dispatchEvent(new Event('creditsChanged'))
    } catch (e) { patch(d.key, { state: 'failed', error: e instanceof Error ? e.message : t('errGeneric') }) }
  }

  async function stageAll(only?: Destination) {
    setBusy('photos'); setVideo(null); setError(null)
    try {
      const ref = await ensureRef()
      await Promise.all((only ? [only] : dests.filter((d) => !d.stagedUrl)).map((d) => stageOne(d, ref)))
    } catch (e) { setError(e instanceof Error ? e.message : t('errGeneric')) }
    setBusy(null)
  }

  async function uploadAnimate(blob: Blob, name: string): Promise<string> {
    const fd = new FormData()
    fd.append('file', new File([blob], name, { type: blob.type || 'image/jpeg' }))
    fd.append('rights', 'true')
    fd.append('purpose', 'animate')
    const r = await fetch('/api/avatar/upload', { method: 'POST', body: fd })
    const j = await r.json().catch(() => null)
    if (!r.ok || !j?.url) throw new Error(errorText(r.status))
    return j.url as string
  }

  async function clipOne(d: Destination): Promise<string | null> {
    if (d.clipUrl) return d.clipUrl
    try {
      patch(d.key, { state: 'animating', error: null })
      const stagedAnim = await uploadAnimate(await (await fetch(d.stagedUrl!)).blob(), `${d.key}-after.png`)
      const r = await fetch('/api/clips', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': `spaces-multi-${d.key}-${d.stagedUrl!.slice(-12)}` },
        body: JSON.stringify({ engine: 'kling', seconds: 5, aspect: '9:16', image_url: stagedAnim, prompt: buildSpaceMotionPrompt(d.kind) }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.clip?.id) throw new Error(errorText(r.status))
      window.dispatchEvent(new Event('creditsChanged'))
      for (let i = 0; i < 120; i++) {
        await sleep(5000)
        const s = await fetch(`/api/clips/status?id=${j.clip.id}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null)
        if (s?.clip?.status === 'done' && s.clip.video_url) { patch(d.key, { clipUrl: s.clip.video_url, state: 'clip' }); return s.clip.video_url as string }
        if (s?.clip?.status === 'failed') throw new Error(t('errClip'))
      }
      throw new Error(t('errClipSlow'))
    } catch (e) { patch(d.key, { state: 'failed', error: e instanceof Error ? e.message : t('errGeneric') }); return null }
  }

  async function makeVideo() {
    setBusy('video'); setError(null); setVideo({ status: 'clips', url: null, progress: 0 })
    try {
      const before = beforeUrl ?? (await uploadAnimate(photo!.blob, 'space-before.jpg'))
      setBeforeUrl(before)
      const clips = await Promise.all(dests.map((d) => clipOne(d)))
      if (clips.some((c) => !c)) { setError(t('errSomeClips')); setVideo(null); return }
      setVideo({ status: 'montage', url: null, progress: 0 })
      const r = await fetch('/api/spaces/montage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pairs: dests.map((d, i) => ({ before_url: before, clip_url: clips[i], label: d.label.trim() })), signature, language, seal }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.render_id) { setError(errorText(r.status)); setVideo(null); return }
      for (let i = 0; i < 90; i++) {
        await sleep(4000)
        const s = await fetch(`/api/spaces/montage?id=${encodeURIComponent(j.render_id)}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null)
        if (s?.status === 'succeeded' && s.url) { setVideo({ status: 'done', url: s.url, progress: 1 }); return }
        if (s?.status === 'failed' || s?.status === 'cancelled') { setError(t('errMontage')); setVideo(null); return }
        setVideo({ status: 'montage', url: null, progress: typeof s?.progress === 'number' ? s.progress : 0 })
      }
      setError(t('errMontageSlow'))
    } catch (e) { setError(e instanceof Error ? e.message : t('errGeneric')); setVideo(null) } finally { setBusy(null) }
  }

  const step = (n: number, title: string, hint?: string) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 14 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: C.accent, background: C.accentSoft, borderRadius: 999, padding: '2px 9px' }}>{n}</span>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: 0 }}>{title}</h2>
        {hint ? <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}>{hint}</p> : null}
      </div>
    </div>
  )
  const photosCost = dests.filter((d) => !d.stagedUrl).length * NANO_CREDITS
  const videoCost = dests.filter((d) => !d.clipUrl).length * clipCredits
  const canStage = !busy && rights && !!photo && ready && photosCost > 0

  return (
    <div className="stu kps-page" style={{ padding: '30px clamp(16px, 2.4vw, 34px) 96px', display: 'grid', gap: 16, maxWidth: 980 }}>
      <ProductStageStyles />
      <header>
        <p style={{ margin: '0 0 6px', fontSize: 13 }}><a href="/spaces" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>{t('backToSingle')}</a></p>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: C.text, margin: '4px 0 6px', letterSpacing: '-.01em' }}>{t('multiTitle')}</h1>
        <p style={{ fontSize: 15, color: C.text2, margin: 0, maxWidth: 680 }}>{t('multiSub')}</p>
        <p style={{ fontSize: 13, color: C.accent, margin: '8px 0 0', fontWeight: 700 }} data-kineo="spaces-multi-total">{t('multiTotal', { n: total })}</p>
      </header>

      <section style={{ padding: '0 0 4px' }}>
        {step(1, t('s1Title'), t('multiS1Hint'))}
        <label style={{ display: 'inline-block' }}>
          <input type="file" accept="image/*,video/*" hidden onChange={(e) => { void pickFile(e.target.files); e.target.value = '' }} />
          {photo
            ? <img src={photo.preview} alt={t('emptyAlt')} style={{ width: 140, aspectRatio: '9 / 16', objectFit: 'cover', borderRadius: 12, display: 'block', cursor: 'pointer' }} />
            : <span style={{ display: 'grid', placeItems: 'center', width: 140, aspectRatio: '9 / 16', borderRadius: 12, border: '1.5px dashed var(--border2)', background: C.soft, color: C.text2, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', padding: 8 }}>{t('addPhotos')}</span>}
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 14, fontSize: 13, color: C.text2 }}>
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} style={{ marginTop: 3 }} />
          {t('rights')}
        </label>
      </section>

      <section style={part}>
        {step(2, t('multiS2Title'), t('multiS2Hint', { n: SPACES_MULTI_MAX }))}
        <div style={{ display: 'grid', gap: 12 }}>
          {dests.map((d) => (
            <div key={d.key} style={{ display: 'grid', gap: 8, border: C.border, borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8 }}>
                <input style={input} maxLength={SPACES_DESTINATION_LABEL_MAX} value={d.label} onChange={(e) => patch(d.key, { label: e.target.value, stagedUrl: null, clipUrl: null })} placeholder={t('destLabelPlaceholder')} aria-label={t('destLabelPlaceholder')} />
                {dests.length > SPACES_MULTI_MIN ? <button type="button" disabled={!!busy} onClick={() => setDests((l) => l.filter((x) => x.key !== d.key))} aria-label={t('remove')} style={btn(false, !!busy)}>×</button> : null}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SPACE_KINDS.map((k) => (
                  <button key={k} type="button" onClick={() => patch(d.key, { kind: k, stagedUrl: null, clipUrl: null })} style={{ ...btn(d.kind === k), borderRadius: 999, padding: '6px 12px', fontSize: 12 }}>{t(`kind_${k}` as SpacesCopyKey)}</button>
                ))}
              </div>
              <input style={input} maxLength={SPACE_DESCRIPTION_MAX} value={d.description} onChange={(e) => patch(d.key, { description: e.target.value, brief: [], stagedUrl: null, clipUrl: null })} placeholder={t('placeholder')} />
              {d.brief.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{d.brief.map((b) => <li key={b}>{b}</li>)}</ul> : null}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {dests.length < SPACES_MULTI_MAX ? <button type="button" disabled={!!busy} onClick={() => setDests((l) => [...l, blank('other')])} style={btn(false, !!busy)}>{t('addDestination')}</button> : null}
            <button type="button" disabled={!!busy || !ready} onClick={researchAll} style={btn(false, !!busy || !ready)}>{busy === 'research' ? t('researching') : t('research')}</button>
          </div>
        </div>
      </section>

      <section style={part}>
        {step(3, t('s3Title'), t('s3Hint', { n: NANO_CREDITS }))}
        <button type="button" onClick={() => void stageAll()} disabled={!canStage} style={btn(true, !canStage)}>
          {busy === 'photos' ? t('generating') : photosCost ? t('generatePhotos', { n: photosCost }) : t('allDone')}
        </button>
        {photo && dests.some((d) => d.stagedUrl || d.state !== 'idle') ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginTop: 16 }}>
            {dests.map((d) => (
              <div key={d.key} style={{ display: 'grid', gap: 8 }}>
                {d.stagedUrl ? <Compare before={photo.preview} after={d.stagedUrl} labels={compareLabels(d)} /> : (
                  <div style={{ aspectRatio: '9 / 16', borderRadius: 12, background: C.soft, display: 'grid', placeItems: 'center', color: C.muted, fontSize: 13, textAlign: 'center', padding: 12 }}>
                    {d.state === 'failed' ? d.error : d.state === 'staging' ? t('staging') : t('waiting')}
                  </div>
                )}
                {d.stagedUrl || d.state === 'failed' ? <button type="button" disabled={!!busy} onClick={() => void stageAll({ ...d, stagedUrl: null })} style={btn(false, !!busy)}>{t('redo', { n: NANO_CREDITS })}</button> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section style={part}>
        {step(4, t('s4Title'), t('s4Hint', { n: clipCredits }))}
        <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
          <div>
            <label htmlFor="spaces-multi-signature" style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>{t('presentedByLabel')}</label>
            <input id="spaces-multi-signature" style={{ ...input, marginTop: 6 }} maxLength={SPACE_SIGNATURE_MAX} value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={t('presentedByPlaceholder')} />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: C.text2 }}>
            <input type="checkbox" checked={seal} onChange={(e) => setSeal(e.target.checked)} style={{ marginTop: 3 }} />
            {t('sealLabel')}
          </label>
        </div>
        <div style={{ marginTop: 14 }}>
          <button type="button" onClick={makeVideo} disabled={!!busy || !allStaged || !ready} style={btn(true, !!busy || !allStaged || !ready)}>
            {busy === 'video' ? (video?.status === 'montage' ? t('montage', { n: Math.round((video.progress ?? 0) * 100) }) : t('makingClips')) : videoCost ? t('makeVideo', { n: videoCost }) : allStaged ? t('remake') : t('makeVideoIdle')}
          </button>
          {!allStaged ? <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 0' }}>{t('needStaged')}</p> : null}
        </div>
        {video?.url ? (
          <div style={{ display: 'grid', gap: 10, marginTop: 16, maxWidth: 360 }}>
            <video src={video.url} controls playsInline style={{ width: '100%', aspectRatio: '9 / 16', borderRadius: 12, background: '#000' }} />
            <a href={video.url} download target="_blank" rel="noreferrer" style={{ ...btn(true), textAlign: 'center', textDecoration: 'none' }}>{t('download')}</a>
          </div>
        ) : null}
      </section>
      {error ? <div role="alert" style={{ border: '1px solid rgba(217,48,37,.45)', borderRadius: 12, padding: 12, color: C.danger, fontSize: 14 }}>{error}</div> : null}
    </div>
  )
}
