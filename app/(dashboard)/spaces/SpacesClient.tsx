'use client'

// KINEO-ESPACOS-2026-09-30 — tela do "Espaços" (lib/spaces/spaces.ts tem o porquê e as regras).
// 4 passos, todos sobre endpoints que já cobram, moderam e guardam no nosso storage:
//   1. fotos do espaço vazio (ou um vídeo: a tela tira 3 quadros dele) — /api/images/reference (moderado, pasta da conta);
//   2. o que vai dentro + curadoria pesquisada na web — /api/spaces/brief (a pessoa ajusta antes de gerar);
//   3. o espaço pronto, foto a foto (Nano Banana Pro com a foto como referência) — /api/images/generate, "Refazer" por foto;
//   4. o vídeo antes → depois: clipe de cada foto pronta (/api/avatar/upload + /api/clips, Kling 2.5, 5 s) e a montagem
//      com selo de IA e assinatura de quem apresenta — /api/spaces/montage.
// Nada fica só no navegador: fotos e clipes aparecem na Biblioteca; o vídeo final vai para o nosso storage.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SPACE_DESCRIPTION_MAX,
  SPACE_KINDS,
  SPACE_KIND_LABEL,
  SPACE_MAX_PHOTOS,
  SPACE_NOTES_MAX,
  SPACE_SIGNATURE_MAX,
  SPACE_CONTACT_MAX,
  SPACES_DISCLAIMER,
  buildSpaceMotionPrompt,
  buildStagingPrompt,
  type SpaceKind,
} from '@/lib/spaces/spaces'

type PhotoState = 'idle' | 'uploading' | 'staging' | 'staged' | 'animating' | 'clip' | 'failed'
interface Photo {
  key: string
  blob: Blob
  preview: string
  refPath: string | null
  stagedUrl: string | null
  clipId: string | null
  clipUrl: string | null
  beforeUrl: string | null
  state: PhotoState
  error: string | null
}

const NANO_CREDITS = 5
const MAX_SIDE = 2048

const C = {
  card: 'var(--card)',
  soft: 'var(--card2)',
  border: '1px solid var(--border)',
  text: 'var(--text)',
  text2: 'var(--text2)',
  muted: 'var(--muted)',
  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  danger: 'var(--danger, #D93025)',
}
const box: React.CSSProperties = { background: C.card, border: C.border, borderRadius: 16, padding: 20 }
const input: React.CSSProperties = { width: '100%', background: C.card, border: C.border, color: C.text, borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }
const btn = (primary = false, disabled = false): React.CSSProperties => ({
  borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
  border: primary ? '1px solid var(--accent)' : C.border, background: primary ? 'var(--accent)' : C.card, color: primary ? 'var(--on-accent)' : C.text,
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let seq = 0
const newKey = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`

/** Reduz a foto para ≤ 2048 px (JPEG). */
async function shrink(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob)
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), 'image/jpeg', 0.9))
}

/** Tira 3 quadros de um vídeo (15 %, 50 %, 85 %) no próprio navegador. */
async function framesFromVideo(file: File, count: number): Promise<Blob[]> {
  const url = URL.createObjectURL(file)
  try {
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.src = url
    await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error('video')) })
    const out: Blob[] = []
    const marks = [0.15, 0.5, 0.85].slice(0, count)
    for (const m of marks) {
      await new Promise<void>((res) => { v.onseeked = () => res(); v.currentTime = Math.max(0, v.duration * m) })
      const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(v.videoWidth * scale)
      canvas.height = Math.round(v.videoHeight * scale)
      canvas.getContext('2d')!.drawImage(v, 0, 0, canvas.width, canvas.height)
      out.push(await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), 'image/jpeg', 0.9)))
    }
    return out
  } finally {
    URL.revokeObjectURL(url)
  }
}

function errorText(status: number, json: { error?: string } | null): string {
  if (status === 402) return 'Créditos insuficientes para esta etapa.'
  if (status === 422) return 'A moderação recusou esta foto ou este pedido.'
  if (status === 429) return 'Limite diário atingido. Tente amanhã.'
  return json?.error ? `Não deu certo (${json.error}). Tente de novo.` : 'Não deu certo. Tente de novo.'
}

async function uploadAnimate(blob: Blob, name: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', new File([blob], name, { type: blob.type || 'image/jpeg' }))
  fd.append('rights', 'true')
  fd.append('purpose', 'animate')
  const r = await fetch('/api/avatar/upload', { method: 'POST', body: fd })
  const j = await r.json().catch(() => null)
  if (!r.ok || !j?.url) throw new Error(errorText(r.status, j))
  return j.url as string
}

function Compare({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50)
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '9 / 16', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
      <img src={after} alt="Espaço pronto" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <img src={before} alt="Espaço vazio" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 2, background: '#fff', boxShadow: '0 0 6px #0008' }} />
      <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 11, fontWeight: 800, color: '#fff', background: '#0009', padding: '3px 8px', borderRadius: 6 }}>ANTES</span>
      <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, fontWeight: 800, color: '#fff', background: '#0009', padding: '3px 8px', borderRadius: 6 }}>DEPOIS</span>
      <input
        type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Comparar antes e depois"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 10, width: '90%', margin: '0 5%' }}
      />
    </div>
  )
}

export default function SpacesClient() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [kind, setKind] = useState<SpaceKind>('food')
  const [description, setDescription] = useState('')
  const [brief, setBrief] = useState('')
  const [notes, setNotes] = useState('')
  const [researching, setResearching] = useState(false)
  const [researched, setResearched] = useState(false)
  const [signature, setSignature] = useState('')
  const [contact, setContact] = useState('')
  const [rights, setRights] = useState(false)
  const [busy, setBusy] = useState<'photos' | 'video' | null>(null)
  const [video, setVideo] = useState<{ status: string; url: string | null; progress: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clipCredits, setClipCredits] = useState<number>(5)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/clips', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { engines?: { key: string; credits?: Record<string, number> }[] }) => {
        const k = j.engines?.find((e) => e.key === 'kling')
        if (k?.credits?.['5']) setClipCredits(k.credits['5'])
      })
      .catch(() => undefined)
  }, [])

  const patch = (key: string, p: Partial<Photo>) => setPhotos((list) => list.map((x) => (x.key === key ? { ...x, ...p } : x)))
  const briefLines = useMemo(() => brief.split('\n').map((s) => s.trim()).filter(Boolean), [brief])
  const prompt = useMemo(() => buildStagingPrompt({ description, kind, brief: briefLines, notes }), [description, kind, briefLines, notes])
  const staged = photos.filter((p) => p.stagedUrl)
  const allStaged = photos.length > 0 && staged.length === photos.length

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    const room = SPACE_MAX_PHOTOS - photos.length
    const blobs: Blob[] = []
    for (const f of Array.from(files)) {
      if (blobs.length >= room) break
      try {
        if (f.type.startsWith('video/')) blobs.push(...(await framesFromVideo(f, Math.min(3, room - blobs.length))))
        else if (f.type.startsWith('image/')) blobs.push(await shrink(f))
      } catch {
        setError('Não consegui ler um dos arquivos. Use JPG, PNG, WEBP ou um vídeo MP4/MOV.')
      }
    }
    setPhotos((list) => [
      ...list,
      ...blobs.slice(0, room).map((b) => ({ key: newKey(), blob: b, preview: URL.createObjectURL(b), refPath: null, stagedUrl: null, clipId: null, clipUrl: null, beforeUrl: null, state: 'idle' as const, error: null })),
    ])
    setVideo(null)
  }

  async function research() {
    setResearching(true)
    setError(null)
    try {
      const r = await fetch('/api/spaces/brief', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ description, kind }) })
      const j = await r.json().catch(() => null)
      if (!r.ok) { setError(errorText(r.status, j)); return }
      setBrief((j.brief as string[]).join('\n'))
      setResearched(true)
      if (!(j.brief as string[]).length) setError('A pesquisa não achou detalhes confiáveis. Escreva você mesmo como o espaço deve ficar, ou gere só com a descrição.')
    } finally {
      setResearching(false)
    }
  }

  async function stageOne(p: Photo) {
    patch(p.key, { state: p.refPath ? 'staging' : 'uploading', error: null })
    try {
      let refPath = p.refPath
      if (!refPath) {
        const fd = new FormData()
        fd.append('file', new File([p.blob], `${p.key}.jpg`, { type: 'image/jpeg' }))
        fd.append('rights', 'true')
        const r = await fetch('/api/images/reference', { method: 'POST', body: fd })
        const j = await r.json().catch(() => null)
        if (!r.ok || !j?.path) throw new Error(errorText(r.status, j))
        refPath = j.path as string
        patch(p.key, { refPath, state: 'staging' })
      }
      const r = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'nanobanana', size: 'portrait_16_9', prompt, reference_paths: [refPath], reference_consent: true }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.url) throw new Error(errorText(r.status, j))
      patch(p.key, { stagedUrl: j.url as string, clipId: null, clipUrl: null, state: 'staged' })
      window.dispatchEvent(new Event('creditsChanged'))
    } catch (e) {
      patch(p.key, { state: 'failed', error: e instanceof Error ? e.message : 'Falhou.' })
    }
  }

  async function stageAll() {
    setBusy('photos')
    setVideo(null)
    await Promise.all(photos.filter((p) => !p.stagedUrl).map((p) => stageOne(p)))
    setBusy(null)
  }

  async function clipOne(p: Photo): Promise<{ before: string; clip: string } | null> {
    try {
      patch(p.key, { state: 'animating', error: null })
      const beforeUrl = p.beforeUrl ?? (await uploadAnimate(p.blob, `${p.key}-antes.jpg`))
      let clipUrl = p.clipUrl
      if (!clipUrl) {
        const stagedBlob = await (await fetch(p.stagedUrl!)).blob()
        const stagedAnim = await uploadAnimate(stagedBlob, `${p.key}-pronto.png`)
        const r = await fetch('/api/clips', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': `spaces-${p.key}-${p.stagedUrl!.slice(-12)}` },
          body: JSON.stringify({ engine: 'kling', seconds: 5, aspect: '9:16', image_url: stagedAnim, prompt: buildSpaceMotionPrompt(kind) }),
        })
        const j = await r.json().catch(() => null)
        if (!r.ok || !j?.clip?.id) throw new Error(errorText(r.status, j))
        const clipId = j.clip.id as string
        patch(p.key, { clipId, beforeUrl })
        window.dispatchEvent(new Event('creditsChanged'))
        for (let i = 0; i < 120 && !clipUrl; i++) {
          await sleep(5000)
          const s = await fetch(`/api/clips/status?id=${clipId}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null)
          const c = s?.clip
          if (c?.status === 'done' && c.video_url) clipUrl = c.video_url as string
          else if (c?.status === 'failed') throw new Error('O clipe falhou (crédito devolvido). Tente de novo.')
        }
        if (!clipUrl) throw new Error('O clipe está demorando. Ele vai aparecer na Biblioteca; tente montar de novo depois.')
      }
      patch(p.key, { clipUrl, beforeUrl, state: 'clip' })
      return { before: beforeUrl, clip: clipUrl }
    } catch (e) {
      patch(p.key, { state: 'failed', error: e instanceof Error ? e.message : 'Falhou.' })
      return null
    }
  }

  async function makeVideo() {
    setBusy('video')
    setError(null)
    setVideo({ status: 'clips', url: null, progress: 0 })
    try {
      const done = await Promise.all(staged.map((p) => clipOne(p)))
      const pairs = done.filter((x): x is { before: string; clip: string } => !!x)
      if (pairs.length !== staged.length) { setError('Algum clipe não ficou pronto. Corrija a foto marcada e monte de novo.'); setVideo(null); return }
      setVideo({ status: 'montage', url: null, progress: 0 })
      const r = await fetch('/api/spaces/montage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pairs: pairs.map((x) => ({ before_url: x.before, clip_url: x.clip })), signature, contact }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.render_id) { setError(errorText(r.status, j)); setVideo(null); return }
      for (let i = 0; i < 90; i++) {
        await sleep(4000)
        const s = await fetch(`/api/spaces/montage?id=${encodeURIComponent(j.render_id)}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null)
        if (s?.status === 'succeeded' && s.url) { setVideo({ status: 'done', url: s.url, progress: 1 }); return }
        if (s?.status === 'failed' || s?.status === 'cancelled') { setError('A montagem falhou. Tente de novo.'); setVideo(null); return }
        setVideo({ status: 'montage', url: null, progress: typeof s?.progress === 'number' ? s.progress : 0 })
      }
      setError('A montagem está demorando. Tente de novo em alguns minutos.')
    } finally {
      setBusy(null)
    }
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
  const photosCost = photos.filter((p) => !p.stagedUrl).length * NANO_CREDITS
  const videoCost = staged.filter((p) => !p.clipUrl).length * clipCredits

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 16px 96px', display: 'grid', gap: 16 }}>
      <header>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: '.08em', textTransform: 'uppercase' }}>Novo · só para a casa</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: C.text, margin: '4px 0 6px', letterSpacing: '-.01em' }}>Espaços</h1>
        <p style={{ fontSize: 15, color: C.text2, margin: 0, maxWidth: 680 }}>
          Fotografe um espaço vazio, diga o que vai dentro dele, e receba o espaço pronto em foto e em vídeo antes → depois,
          com a mesma câmera e a mesma estrutura.
        </p>
      </header>

      {/* 1. Fotos */}
      <section style={box}>
        {step(1, 'Fotos do espaço vazio', `Até ${SPACE_MAX_PHOTOS} fotos em pé (vertical), ou um vídeo andando pelo espaço — a tela tira 3 quadros dele.`)}
        <input ref={fileRef} id="spaces-files" type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {photos.map((p) => (
            <div key={p.key} style={{ position: 'relative' }}>
              <img src={p.preview} alt="" style={{ width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', borderRadius: 12, display: 'block' }} />
              <button
                type="button" disabled={!!busy} aria-label="Remover foto"
                onClick={() => setPhotos((l) => l.filter((x) => x.key !== p.key))}
                style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 999, border: 'none', background: '#000a', color: '#fff', cursor: 'pointer' }}
              >×</button>
            </div>
          ))}
          {photos.length < SPACE_MAX_PHOTOS ? (
            <button
              type="button" onClick={() => fileRef.current?.click()} disabled={!!busy}
              style={{ aspectRatio: '9 / 16', borderRadius: 12, border: '1.5px dashed var(--border2)', background: C.soft, color: C.text2, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              + Adicionar fotos ou vídeo
            </button>
          ) : null}
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 14, fontSize: 13, color: C.text2 }}>
          <input id="spaces-rights" type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} style={{ marginTop: 3 }} />
          Tenho autorização para usar estas fotos (o espaço é meu ou do meu cliente).
        </label>
      </section>

      {/* 2. O que vai dentro */}
      <section style={box}>
        {step(2, 'O que vai dentro do espaço', 'Pode citar uma marca ou um estilo. A Kineo pesquisa na web como esse espaço é de verdade e monta a curadoria.')}
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SPACE_KINDS.map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} style={{ ...btn(kind === k), borderRadius: 999, padding: '7px 14px', fontSize: 13 }}>
                {SPACE_KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <input
            id="spaces-description" style={input} maxLength={SPACE_DESCRIPTION_MAX} value={description}
            onChange={(e) => { setDescription(e.target.value); setResearched(false) }}
            placeholder="Ex.: uma cafeteria Starbucks · uma loja Burger King · apartamento decorado em estilo japandi"
          />
          <div>
            <button type="button" onClick={research} disabled={researching || description.trim().length < 3} style={btn(false, researching || description.trim().length < 3)}>
              {researching ? 'Pesquisando…' : researched ? 'Pesquisar de novo' : 'Pesquisar e montar a curadoria'}
            </button>
          </div>
          {researched || brief ? (
            <div>
              <label htmlFor="spaces-brief" style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>Curadoria (um detalhe por linha — edite à vontade)</label>
              <textarea id="spaces-brief" style={{ ...input, minHeight: 150, marginTop: 6, fontSize: 13, lineHeight: 1.5 }} value={brief} onChange={(e) => setBrief(e.target.value)} />
            </div>
          ) : null}
          <div>
            <label htmlFor="spaces-notes" style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>Pedidos seus (opcional)</label>
            <input id="spaces-notes" style={{ ...input, marginTop: 6 }} maxLength={SPACE_NOTES_MAX} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: balcão à esquerda, mais plantas, piso de madeira" />
          </div>
        </div>
      </section>

      {/* 3. Espaço pronto */}
      <section style={box}>
        {step(3, 'O espaço pronto, foto a foto', `Nano Banana Pro · ${NANO_CREDITS} créditos por foto. Arraste para comparar antes e depois; refaça só a que não gostar.`)}
        <button
          type="button" onClick={stageAll}
          disabled={!!busy || !rights || photos.length === 0 || description.trim().length < 3 || photosCost === 0}
          style={btn(true, !!busy || !rights || photos.length === 0 || description.trim().length < 3 || photosCost === 0)}
        >
          {busy === 'photos' ? 'Gerando…' : photosCost ? `Gerar o espaço pronto · ${photosCost} créditos` : photos.length ? 'Tudo gerado' : 'Gerar o espaço pronto'}
        </button>
        {!rights && photos.length ? <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 0' }}>Marque a autorização das fotos no passo 1.</p> : null}
        {photos.some((p) => p.stagedUrl || p.state !== 'idle') ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginTop: 16 }}>
            {photos.map((p) => (
              <div key={p.key} style={{ display: 'grid', gap: 8 }}>
                {p.stagedUrl ? <Compare before={p.preview} after={p.stagedUrl} /> : (
                  <div style={{ aspectRatio: '9 / 16', borderRadius: 12, background: C.soft, display: 'grid', placeItems: 'center', color: C.muted, fontSize: 13, textAlign: 'center', padding: 12 }}>
                    {p.state === 'failed' ? p.error : p.state === 'uploading' ? 'Enviando a foto…' : p.state === 'staging' ? 'Montando o espaço…' : 'Aguardando'}
                  </div>
                )}
                {p.stagedUrl || p.state === 'failed' ? (
                  <button type="button" disabled={!!busy} onClick={async () => { setBusy('photos'); await stageOne({ ...p, stagedUrl: null }); setBusy(null) }} style={btn(false, !!busy)}>
                    Refazer esta · {NANO_CREDITS} créditos
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* 4. Vídeo */}
      <section style={box}>
        {step(4, 'O vídeo antes → depois', `Kling 2.5 · ${clipCredits} créditos por foto. O vídeo leva o selo "${SPACES_DISCLAIMER}" do começo ao fim.`)}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <div>
            <label htmlFor="spaces-signature" style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>Apresentado por</label>
            <input id="spaces-signature" style={{ ...input, marginTop: 6 }} maxLength={SPACE_SIGNATURE_MAX} value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Seu nome ou da sua empresa" />
            <p style={{ fontSize: 12, color: C.muted, margin: '6px 0 0' }}>Só o nome de quem apresenta. Não use outra pessoa ou marca como autora do projeto.</p>
          </div>
          <div>
            <label htmlFor="spaces-contact" style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>Contato no fim (opcional)</label>
            <input id="spaces-contact" style={{ ...input, marginTop: 6 }} maxLength={SPACE_CONTACT_MAX} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Ex.: (11) 99999-0000 · site.com.br" />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button type="button" onClick={makeVideo} disabled={!!busy || !allStaged} style={btn(true, !!busy || !allStaged)}>
            {busy === 'video'
              ? video?.status === 'montage' ? `Montando o vídeo… ${Math.round((video.progress ?? 0) * 100)}%` : 'Gerando os clipes (1–3 min)…'
              : videoCost ? `Gerar o vídeo · ${videoCost} créditos` : allStaged ? 'Montar o vídeo de novo' : 'Gerar o vídeo'}
          </button>
          {!allStaged ? <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 0' }}>Gere o espaço pronto de todas as fotos primeiro.</p> : null}
        </div>
        {video?.url ? (
          <div style={{ display: 'grid', gap: 10, marginTop: 16, maxWidth: 360 }}>
            <video src={video.url} controls playsInline style={{ width: '100%', aspectRatio: '9 / 16', borderRadius: 12, background: '#000' }} />
            <a href={video.url} download target="_blank" rel="noreferrer" style={{ ...btn(true), textAlign: 'center', textDecoration: 'none' }}>Baixar o vídeo</a>
          </div>
        ) : null}
      </section>

      {error ? <div role="alert" style={{ ...box, borderColor: 'rgba(217,48,37,.45)', color: C.danger, fontSize: 14 }}>{error}</div> : null}
    </div>
  )
}
