'use client'

// KINEO-PRODUCAO-ADS-2026-10-01 — tela da "Produção" (lib/ads/producao.ts tem o porquê e as regras).
// Formato kps do Studio: quadro de engenharia à esquerda, palco à direita (components/ProductStage.tsx).
// Passos, todos sobre endpoints que já cobram, moderam e guardam no nosso storage — o preço aparece ANTES de cada clique:
//   0. modelos prontos no topo: Depoimento (UGC) · Mascote da marca · Seu app no celular;
//   1. o personagem: foto da pessoa (com autorização) → /api/images/reference, ou criado por IA (Nano Banana Pro, 5 cr),
//      ou um personagem salvo (/api/characters); "Save character" guarda para reusar;
//   2. a ideia → /api/ads/producao/plan propõe 3 a 5 planos (editáveis): título, prompt de imagem, movimento, clipe ou fala;
//   3. prévia das cenas: SÓ as imagens (5 cr cada, com a referência do personagem) — aprovar ou trocar ANTES de qualquer vídeo;
//   4. dar vida a cada plano aprovado: clipe (/api/clips, motor e duração com o preço real do catálogo) ou fala para a
//      câmera (/api/generate-avatar, fabric, voz feminina ou masculina, pt/en/es, ≥ 12 s de fala);
//   5. montar: ordem, narração opcional (/api/audio/generate), cartão final de 3 s com o logo da conta, slogan e linha de
//      apoio → /api/ads/producao/montage (MP4 1080×1920). Montagem: "preço a definir" (decisão do fundador).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UiLabel, useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { ADS_HOUSE_STAGE, ProductRow, ProductStage, ProductStageStyles, useProductStage, type StageItem } from '@/components/ProductStage'
import {
  PRODUCAO_AVATAR_CREDITS,
  PRODUCAO_AVATAR_ENGINE,
  PRODUCAO_AVATAR_MIN_SECONDS,
  PRODUCAO_CHARACTER_KINDS,
  PRODUCAO_IDEA_MAX,
  PRODUCAO_IDEA_MIN,
  PRODUCAO_IMAGE_CREDITS,
  PRODUCAO_IMAGE_MODEL,
  PRODUCAO_IMAGE_SIZE,
  PRODUCAO_LINE_MAX,
  PRODUCAO_MAX_SHOTS,
  PRODUCAO_MONTAGE_CREDITS,
  PRODUCAO_NARRATION_MODEL,
  PRODUCAO_SLOGAN_MAX,
  PRODUCAO_SUPPORT_MAX,
  PRODUCAO_TEMPLATES,
  buildCharacterPrompt,
  buildShotImagePrompt,
  estimateTalkSeconds,
  narrationCredits,
  producaoTemplate,
  type ProducaoCharacterKind,
  type ProducaoLanguage,
  type ProducaoShot,
  type ProducaoShotMode,
  type ProducaoTemplateKey,
  type ProducaoVoice,
} from '@/lib/ads/producao'

type Busy = null | 'character' | 'plan' | 'images' | 'life' | 'narration' | 'montage'
type ImgState = 'idle' | 'working' | 'done' | 'failed'
interface Shot extends ProducaoShot {
  key: string
  voice: ProducaoVoice
  engine: string
  seconds: number
  imageUrl: string | null
  imageState: ImgState
  approved: boolean
  clipId: string | null
  talkGenId: string | null
  lifeUrl: string | null
  lifeFor: string | null
  lifeState: ImgState
  error: string | null
}
interface ClipEngine { key: string; label: string; photo: boolean; seconds: number[]; credits: Record<string, number> }
interface SavedCharacter { id: string; name: string; image_url: string }

const C = {
  border: '1px solid var(--border)', text: 'var(--text)', text2: 'var(--text2)', muted: 'var(--muted)',
  accent: 'var(--accent)', accentSoft: 'var(--accent-soft)', soft: 'var(--card2)', card: 'var(--card)', danger: 'var(--danger, #D93025)',
}
const part: React.CSSProperties = { padding: '16px 0 6px', borderTop: C.border }
const input: React.CSSProperties = { width: '100%', background: C.card, border: C.border, color: C.text, borderRadius: 10, padding: '9px 11px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }
const small: React.CSSProperties = { fontSize: 12, color: C.muted, margin: '6px 0 0' }
const btn = (primary = false, disabled = false): React.CSSProperties => ({
  borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
  border: primary ? '1px solid var(--accent)' : C.border, background: primary ? 'var(--accent)' : C.card, color: primary ? 'var(--on-accent)' : C.text,
})
const chip = (on: boolean): React.CSSProperties => ({ ...btn(on), borderRadius: 999, padding: '6px 12px', fontSize: 12 })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let seq = 0
const newKey = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const publicRendersUrl = (path: string) => `${SUPABASE}/storage/v1/object/public/renders/${path}`

function errorFor(status: number, j: { error?: unknown } | null): string {
  if (status === 402) return 'Not enough credits.'
  if (status === 429) return 'Daily limit reached. Try again later.'
  if (typeof j?.error === 'string' && j.error.length > 3 && j.error.length < 400 && /\s/.test(j.error)) return j.error
  if (status === 422) return 'This was blocked by our safety check.'
  return 'Something went wrong. Nothing extra was charged — try again.'
}

async function postJson(url: string, body: unknown, headers?: Record<string, string>) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...(headers ?? {}) }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => null)
  return { r, j }
}

export default function ProducaoClient() {
  const ui = useInterfaceLanguage()
  useProductStage('ads')
  const [template, setTemplate] = useState<ProducaoTemplateKey>('ugc')
  const [kind, setKind] = useState<ProducaoCharacterKind>('woman')
  const [charDesc, setCharDesc] = useState('')
  const [charName, setCharName] = useState('')
  const [refPaths, setRefPaths] = useState<string[]>([])
  const [charPreview, setCharPreview] = useState<string | null>(null)
  const [charSaved, setCharSaved] = useState(false)
  const [consent, setConsent] = useState(false)
  const [saved, setSaved] = useState<SavedCharacter[]>([])
  const [productRef, setProductRef] = useState<{ path: string; preview: string } | null>(null)
  const [idea, setIdea] = useState('')
  const [language, setLanguage] = useState<ProducaoLanguage>(ui === 'pt' ? 'pt' : ui === 'es' ? 'es' : 'en')
  const [shots, setShots] = useState<Shot[]>([])
  const [planSource, setPlanSource] = useState<string | null>(null)
  const [engines, setEngines] = useState<ClipEngine[]>([])
  const [narration, setNarration] = useState({ text: '', id: null as string | null, url: null as string | null, seconds: null as number | null })
  const [slogan, setSlogan] = useState('')
  const [support, setSupport] = useState('')
  const [cardTheme, setCardTheme] = useState<'light' | 'dark'>('light')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [montage, setMontage] = useState<{ status: string; url: string | null; progress: number } | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const productInputRef = useRef<HTMLInputElement>(null)

  const tpl = producaoTemplate(template)
  const photoEngines = useMemo(() => engines.filter((e) => e.photo && e.seconds.length > 0), [engines])
  const defaultEngine = photoEngines.find((e) => e.key === 'kling') ?? photoEngines[0] ?? null

  useEffect(() => {
    fetch('/api/clips', { cache: 'no-store' }).then((r) => r.json()).then((j: { engines?: ClipEngine[] }) => setEngines(j.engines ?? [])).catch(() => undefined)
    fetch('/api/characters', { cache: 'no-store' }).then((r) => r.json()).then((j: { characters?: SavedCharacter[] }) => setSaved(j.characters ?? [])).catch(() => undefined)
    fetch('/api/brand-logo', { cache: 'no-store' }).then((r) => r.json()).then((j: { url?: string | null }) => setLogoUrl(j.url ?? null)).catch(() => undefined)
  }, [])

  const patch = (key: string, p: Partial<Shot>) => setShots((l) => l.map((s) => (s.key === key ? { ...s, ...p } : s)))
  const creditsChanged = () => window.dispatchEvent(new Event('creditsChanged'))

  function pickTemplate(k: ProducaoTemplateKey) {
    setTemplate(k)
    setKind(producaoTemplate(k).characterKind)
  }

  // ── 1. Personagem ────────────────────────────────────────────────────────
  const uploadReference = useCallback(async (blob: Blob, name: string): Promise<string> => {
    const fd = new FormData()
    fd.append('file', new File([blob], name, { type: blob.type || 'image/jpeg' }))
    fd.append('rights', 'true')
    const r = await fetch('/api/images/reference', { method: 'POST', body: fd })
    const j = await r.json().catch(() => null)
    if (!r.ok || !j?.path) throw new Error(errorFor(r.status, j))
    return j.path as string
  }, [])

  async function onCharacterPhotos(files: FileList | null) {
    if (!files?.length || !consent) return
    setBusy('character'); setError(null)
    try {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 2)
      const paths: string[] = []
      for (const f of list) paths.push(await uploadReference(f, f.name))
      setRefPaths(paths)
      setCharPreview(publicRendersUrl(paths[0]))
      setCharSaved(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.') } finally { setBusy(null) }
  }

  async function createCharacter() {
    setBusy('character'); setError(null)
    try {
      const { r, j } = await postJson('/api/images/generate', { model: PRODUCAO_IMAGE_MODEL, size: PRODUCAO_IMAGE_SIZE, prompt: buildCharacterPrompt(kind, charDesc) })
      if (!r.ok || !j?.url) throw new Error(errorFor(r.status, j))
      creditsChanged()
      const blob = await (await fetch(j.url as string)).blob()
      const path = await uploadReference(blob, 'character.png')
      setRefPaths([path]); setCharPreview(j.url as string); setCharSaved(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create the character.') } finally { setBusy(null) }
  }

  async function useSaved(c: SavedCharacter) {
    setBusy('character'); setError(null)
    try {
      const blob = await (await fetch(c.image_url)).blob()
      const path = await uploadReference(blob, 'character.jpg')
      setRefPaths([path]); setCharPreview(c.image_url); setCharName(c.name); setCharSaved(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load this character.') } finally { setBusy(null) }
  }

  async function saveCharacter() {
    if (!charPreview || !/^https:\/\//.test(charPreview)) return
    setBusy('character'); setError(null)
    try {
      const { r, j } = await postJson('/api/characters', { name: charName.trim() || 'My character', imageUrl: charPreview, source: 'other' })
      if (!r.ok || !j?.character) throw new Error(errorFor(r.status, j))
      setSaved((l) => [j.character as SavedCharacter, ...l]); setCharSaved(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the character.') } finally { setBusy(null) }
  }

  async function onProductPhoto(files: FileList | null) {
    const f = files?.[0]
    if (!f || !f.type.startsWith('image/')) return
    setBusy('character'); setError(null)
    try {
      const path = await uploadReference(f, f.name)
      setProductRef({ path, preview: URL.createObjectURL(f) })
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.') } finally { setBusy(null) }
  }

  // ── 2. Planos ────────────────────────────────────────────────────────────
  async function plan() {
    setBusy('plan'); setError(null); setMontage(null)
    try {
      const { r, j } = await postJson('/api/ads/producao/plan', { idea, template, character_kind: kind, character_description: charDesc, language, product_photo: Boolean(productRef) })
      if (!r.ok || !Array.isArray(j?.shots)) throw new Error(errorFor(r.status, j))
      setPlanSource(j.source as string)
      setShots((j.shots as ProducaoShot[]).map((s) => ({
        ...s, key: newKey(), voice: kind === 'man' ? 'male' : 'female', engine: defaultEngine?.key ?? 'kling', seconds: defaultEngine?.seconds[0] ?? 5,
        imageUrl: null, imageState: 'idle', approved: false, clipId: null, talkGenId: null, lifeUrl: null, lifeFor: null, lifeState: 'idle', error: null,
      })))
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not plan the shots.') } finally { setBusy(null) }
  }
  function addShot() {
    if (shots.length >= PRODUCAO_MAX_SHOTS) return
    setShots((l) => [...l, { key: newKey(), title: `Shot ${l.length + 1}`, imagePrompt: '', motionPrompt: 'slow cinematic push-in, natural movement', mode: 'clip', line: '', voice: kind === 'man' ? 'male' : 'female', engine: defaultEngine?.key ?? 'kling', seconds: defaultEngine?.seconds[0] ?? 5, imageUrl: null, imageState: 'idle', approved: false, clipId: null, talkGenId: null, lifeUrl: null, lifeFor: null, lifeState: 'idle', error: null }])
  }
  function move(key: string, d: -1 | 1) {
    setShots((l) => {
      const i = l.findIndex((s) => s.key === key)
      const j = i + d
      if (i < 0 || j < 0 || j >= l.length) return l
      const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c
    })
  }

  // ── 3. Prévia das cenas (só imagens) ─────────────────────────────────────
  async function imageOne(s: Shot) {
    patch(s.key, { imageState: 'working', error: null, approved: false })
    try {
      const refs = [...refPaths.slice(0, productRef ? 2 : 3), ...(productRef ? [productRef.path] : [])].slice(0, 3)
      const { r, j } = await postJson('/api/images/generate', {
        model: PRODUCAO_IMAGE_MODEL, size: PRODUCAO_IMAGE_SIZE, reference_paths: refs, reference_consent: true,
        prompt: buildShotImagePrompt({ kind, shot: s, productPhoto: Boolean(productRef) }),
      })
      if (!r.ok || !j?.url) throw new Error(errorFor(r.status, j))
      patch(s.key, { imageUrl: j.url as string, imageState: 'done', clipId: null, talkGenId: null, lifeUrl: null, lifeFor: null, lifeState: 'idle' })
      creditsChanged()
    } catch (e) { patch(s.key, { imageState: 'failed', error: e instanceof Error ? e.message : 'Image failed.' }) }
  }
  async function imagesAll() {
    setBusy('images'); setError(null)
    await Promise.all(shots.filter((s) => !s.imageUrl && s.imagePrompt.trim().length >= 8).map((s) => imageOne(s)))
    setBusy(null)
  }

  // ── 4. Dar vida ──────────────────────────────────────────────────────────
  const clipCost = useCallback((s: Shot) => photoEngines.find((e) => e.key === s.engine)?.credits[String(s.seconds)] ?? null, [photoEngines])
  const shotLifeCost = (s: Shot) => (s.mode === 'talk' ? PRODUCAO_AVATAR_CREDITS : clipCost(s) ?? 0)
  const lifeKey = (s: Shot) => `${s.mode}|${s.imageUrl}|${s.mode === 'talk' ? `${s.voice}|${language}|${s.line}` : `${s.engine}|${s.seconds}|${s.motionPrompt}`}`

  async function clipOne(s: Shot) {
    const { r, j } = await postJson('/api/clips', { engine: s.engine, seconds: s.seconds, aspect: '9:16', image_url: s.imageUrl, prompt: s.motionPrompt }, { 'idempotency-key': `producao-${s.key}-${(s.imageUrl ?? '').slice(-12).replace(/[^A-Za-z0-9._:-]/g, '')}-${s.engine}-${s.seconds}` })
    if (!r.ok || !j?.clip?.id) throw new Error(errorFor(r.status, j))
    creditsChanged()
    const clipId = j.clip.id as string
    patch(s.key, { clipId })
    for (let i = 0; i < 150; i++) {
      await sleep(6000)
      const st = await fetch(`/api/clips/status?id=${encodeURIComponent(clipId)}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null)
      if (st?.clip?.status === 'done' && st.clip.video_url) return { url: st.clip.video_url as string, clipId }
      if (st?.clip?.status === 'failed') throw new Error('The clip failed. Its credits were refunded.')
    }
    throw new Error('The clip is taking longer than usual. Check back in a few minutes.')
  }

  async function talkOne(s: Shot) {
    // O avatar só aceita foto da pasta avatars/<uid>/: a imagem aprovada sobe pelo upload do avatar (moderado, confere rosto).
    const blob = await (await fetch(s.imageUrl!)).blob()
    const fd = new FormData()
    fd.append('file', new File([blob], 'shot.jpg', { type: blob.type || 'image/jpeg' }))
    fd.append('rights', 'true')
    const up = await fetch('/api/avatar/upload', { method: 'POST', body: fd })
    const uj = await up.json().catch(() => null)
    if (!up.ok || !uj?.url) throw new Error(errorFor(up.status, uj))
    const generationId = `producao_${s.key}_${Math.random().toString(36).slice(2, 10)}`
    const { r, j } = await postJson('/api/generate-avatar', {
      generationId, prompt: s.line, duration: Math.max(3, Math.round(estimateTalkSeconds(s.line))), language, avatarImageUrl: uj.url,
      engine: PRODUCAO_AVATAR_ENGINE, scriptMode: 'verbatim', noBroll: true, voiceGender: s.voice,
    })
    if (!r.ok || !j?.avatar_request_id) throw new Error(errorFor(r.status, j))
    creditsChanged()
    patch(s.key, { talkGenId: generationId })
    for (let i = 0; i < 120; i++) {
      await sleep(8000)
      const st = await fetch(`/api/avatar-status?request_id=${encodeURIComponent(j.avatar_request_id)}&engine=${PRODUCAO_AVATAR_ENGINE}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null)
      if (st?.status === 'done' && st.video_url) return { url: st.video_url as string, generationId }
      if (st?.status === 'failed') throw new Error(typeof st.error === 'string' ? st.error : 'The talking shot failed.')
    }
    throw new Error('The talking shot is taking longer than usual. Check back in a few minutes.')
  }

  async function lifeOne(s: Shot) {
    patch(s.key, { lifeState: 'working', error: null })
    try {
      if (s.mode === 'talk') {
        const out = await talkOne(s)
        patch(s.key, { lifeUrl: out.url, talkGenId: out.generationId, clipId: null, lifeFor: lifeKey(s), lifeState: 'done' })
      } else {
        const out = await clipOne(s)
        patch(s.key, { lifeUrl: out.url, clipId: out.clipId, talkGenId: null, lifeFor: lifeKey(s), lifeState: 'done' })
      }
    } catch (e) { patch(s.key, { lifeState: 'failed', error: e instanceof Error ? e.message : 'Failed.' }) }
  }
  const approved = shots.filter((s) => s.approved && s.imageUrl)
  const needLife = approved.filter((s) => s.lifeFor !== lifeKey(s))
  const lifeCost = needLife.reduce((n, s) => n + shotLifeCost(s), 0)
  const talkTooShort = needLife.some((s) => s.mode === 'talk' && estimateTalkSeconds(s.line) < PRODUCAO_AVATAR_MIN_SECONDS)
  async function lifeAll() {
    setBusy('life'); setError(null); setMontage(null)
    await Promise.all(needLife.map((s) => lifeOne(s)))
    setBusy(null)
  }

  // ── 5. Montar ────────────────────────────────────────────────────────────
  async function makeNarration() {
    setBusy('narration'); setError(null)
    try {
      const { r, j } = await postJson('/api/audio/generate', { text: narration.text, model: PRODUCAO_NARRATION_MODEL })
      if (!r.ok || !j?.url) throw new Error(errorFor(r.status, j))
      setNarration((n) => ({ ...n, id: (j.id as string) ?? null, url: j.url as string }))
      creditsChanged()
    } catch (e) { setError(e instanceof Error ? e.message : 'Narration failed.') } finally { setBusy(null) }
  }
  const ready = approved.filter((s) => s.lifeFor === lifeKey(s) && s.lifeUrl && (s.clipId || s.talkGenId))
  async function assemble() {
    setBusy('montage'); setError(null)
    setMontage({ status: 'submitting', url: null, progress: 0 })
    try {
      const { r, j } = await postJson('/api/ads/producao/montage', {
        shots: ready.map((s) => (s.mode === 'talk' ? { kind: 'talk', generation_id: s.talkGenId } : { kind: 'clip', clip_id: s.clipId })),
        narration_id: narration.id ?? undefined, narration_seconds: narration.seconds ?? undefined, slogan, support, card_theme: cardTheme,
      })
      if (!r.ok || !j?.render_id) throw new Error(errorFor(r.status, j))
      for (let i = 0; i < 100; i++) {
        await sleep(4000)
        const st = await fetch(`/api/ads/producao/montage?id=${encodeURIComponent(j.render_id)}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null)
        if (st?.status === 'succeeded' && st.url) { setMontage({ status: 'done', url: st.url, progress: 1 }); return }
        if (st?.status === 'failed' || st?.status === 'cancelled') throw new Error('The montage failed. Try again.')
        setMontage({ status: 'rendering', url: null, progress: typeof st?.progress === 'number' ? st.progress : 0 })
      }
      throw new Error('The montage is taking longer than usual. Try again in a minute.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Montage failed.'); setMontage(null) } finally { setBusy(null) }
  }

  // ── Palco ────────────────────────────────────────────────────────────────
  const stageItems: StageItem[] = [
    ...(montage?.url ? [{ title: 'Your production', badge: 'Kineo montage', video: montage.url }] : []),
    ...shots.filter((s) => s.lifeUrl && s.lifeFor === lifeKey(s)).map((s) => ({ title: s.title, badge: s.mode === 'talk' ? 'VEED Fabric' : (photoEngines.find((e) => e.key === s.engine)?.label ?? s.engine), video: s.lifeUrl!, poster: s.imageUrl ?? undefined })),
    ...shots.filter((s) => s.imageUrl).map((s) => ({ title: s.title, badge: 'Nano Banana Pro', after: s.imageUrl!, poster: s.imageUrl! })),
  ]
  const imagesToMake = shots.filter((s) => !s.imageUrl && s.imagePrompt.trim().length >= 8).length
  const hasCharacter = refPaths.length > 0
  const montagePrice = PRODUCAO_MONTAGE_CREDITS === null ? 'Montage: price to be set — free while in preview' : `Montage · ${PRODUCAO_MONTAGE_CREDITS} cr`

  const step = (n: number, title: string, hint?: string) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: C.accent, background: C.accentSoft, borderRadius: 999, padding: '2px 9px' }}>{n}</span>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}><UiLabel>{title}</UiLabel></h2>
        {hint ? <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}><UiLabel>{hint}</UiLabel></p> : null}
      </div>
    </div>
  )

  return (
    <div className="stu kps-page" style={{ padding: '30px clamp(16px, 2.4vw, 34px) 96px', display: 'grid', gap: 16 }}>
      <ProductStageStyles />
      <header>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: '.08em', textTransform: 'uppercase' }}><UiLabel>Studio Ads</UiLabel> · <a href="/ads/v2" style={{ color: 'inherit' }}><UiLabel>Ads</UiLabel></a></div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: C.text, margin: '4px 0 6px', letterSpacing: '-.01em' }}><UiLabel>Production</UiLabel></h1>
        <p style={{ fontSize: 15, color: C.text2, margin: 0, maxWidth: 680 }}><UiLabel>One consistent character, shot by shot: preview the scenes, bring them to life, and assemble the ad with your logo.</UiLabel></p>
      </header>

      {/* 0. Modelos prontos */}
      <section aria-label="Templates" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {PRODUCAO_TEMPLATES.map((t) => (
          <button key={t.key} type="button" onClick={() => pickTemplate(t.key)} aria-pressed={template === t.key}
            style={{ textAlign: 'left', padding: 16, borderRadius: 16, cursor: 'pointer', background: template === t.key ? C.accentSoft : C.card, border: template === t.key ? '1px solid var(--accent)' : C.border, color: C.text }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}><UiLabel>{t.title}</UiLabel></div>
            <div style={{ fontSize: 13, color: C.text2, marginTop: 4 }}><UiLabel>{t.sub}</UiLabel></div>
          </button>
        ))}
      </section>

      <div className="kps-grid">
        <div className="kps-panel">
          {/* 1. Personagem */}
          <section style={{ padding: '0 0 6px' }}>
            {step(1, 'Your character', 'The same face, hair and outfit in every shot.')}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {PRODUCAO_CHARACTER_KINDS.map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} style={chip(kind === k)}><UiLabel>{k === 'woman' ? 'Woman' : k === 'man' ? 'Man' : 'Mascot'}</UiLabel></button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 12, alignItems: 'start' }}>
              <div style={{ width: 96, aspectRatio: '9 / 16', borderRadius: 12, overflow: 'hidden', background: C.soft, border: C.border }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {charPreview ? <img src={charPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <input id="producao-char-desc" style={input} maxLength={300} value={charDesc} onChange={(e) => setCharDesc(e.target.value)} placeholder="Describe the character (style, clothes, vibe)" />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={createCharacter} disabled={!!busy} style={btn(true, !!busy)}><UiLabel>{`Create with AI · ${PRODUCAO_IMAGE_CREDITS} cr`}</UiLabel></button>
                  <button type="button" onClick={() => photoRef.current?.click()} disabled={!!busy || !consent} style={btn(false, !!busy || !consent)}><UiLabel>Use a photo · free</UiLabel></button>
                  <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { onCharacterPhotos(e.target.files); e.target.value = '' }} />
                </div>
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: C.text2 }}>
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
                  <UiLabel>I have permission from the person in the photo to use their image in ads.</UiLabel>
                </label>
                {charPreview && /^https:\/\//.test(charPreview) && !charSaved ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...input, maxWidth: 200 }} maxLength={60} value={charName} onChange={(e) => setCharName(e.target.value)} placeholder="Character name" />
                    <button type="button" onClick={saveCharacter} disabled={!!busy} style={btn(false, !!busy)}><UiLabel>Save character · free</UiLabel></button>
                  </div>
                ) : null}
              </div>
            </div>
            {saved.length ? (
              <div style={{ marginTop: 10 }}>
                <p style={{ ...small, marginTop: 0 }}><UiLabel>My characters</UiLabel></p>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingTop: 6 }}>
                  {saved.slice(0, 12).map((c) => (
                    <button key={c.id} type="button" title={c.name} disabled={!!busy} onClick={() => useSaved(c)} style={{ flex: '0 0 56px', aspectRatio: '9 / 16', padding: 0, borderRadius: 10, overflow: 'hidden', border: C.border, cursor: 'pointer', background: C.soft }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.image_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {/* 2. Ideia → planos */}
          <section style={part}>
            {step(2, 'Your idea', 'We propose 3 to 5 shots. Edit anything before generating.')}
            <textarea id="producao-idea" style={{ ...input, minHeight: 84, lineHeight: 1.45 }} maxLength={PRODUCAO_IDEA_MAX} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={tpl.ideaExample} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: C.muted }}><UiLabel>Spoken language</UiLabel></span>
              {(['pt', 'en', 'es'] as ProducaoLanguage[]).map((l) => (
                <button key={l} type="button" onClick={() => setLanguage(l)} style={chip(language === l)}>{l === 'pt' ? 'Português' : l === 'es' ? 'Español' : 'English'}</button>
              ))}
              <button type="button" onClick={() => productInputRef.current?.click()} disabled={!!busy} style={chip(Boolean(productRef))}>
                <UiLabel>{productRef ? 'Product/app photo added' : tpl.productPhoto === 'recommended' ? 'Add your app screenshot (recommended)' : 'Add a product photo (optional)'}</UiLabel>
              </button>
              <input ref={productInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { onProductPhoto(e.target.files); e.target.value = '' }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <button type="button" onClick={plan} disabled={!!busy || idea.trim().length < PRODUCAO_IDEA_MIN} style={btn(true, !!busy || idea.trim().length < PRODUCAO_IDEA_MIN)}>
                <UiLabel>{busy === 'plan' ? 'Planning…' : shots.length ? 'Plan again · free' : 'Plan the shots · free'}</UiLabel>
              </button>
              {planSource === 'fallback' ? <p style={small}><UiLabel>The planner is busy — we used the template shots. Edit them freely.</UiLabel></p> : null}
            </div>
            {shots.length ? (
              <ol style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 12 }}>
                {shots.map((s, i) => (
                  <li key={s.key} style={{ border: C.border, borderRadius: 12, padding: 12, display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <strong style={{ fontSize: 12, color: C.muted }}>{i + 1}</strong>
                      <input style={{ ...input, fontWeight: 700 }} maxLength={60} value={s.title} onChange={(e) => patch(s.key, { title: e.target.value })} aria-label="Shot title" />
                      <button type="button" onClick={() => move(s.key, -1)} disabled={i === 0} style={btn(false, i === 0)} aria-label="Move up">↑</button>
                      <button type="button" onClick={() => move(s.key, 1)} disabled={i === shots.length - 1} style={btn(false, i === shots.length - 1)} aria-label="Move down">↓</button>
                      <button type="button" onClick={() => setShots((l) => l.filter((x) => x.key !== s.key))} style={btn(false)} aria-label="Remove shot">×</button>
                    </div>
                    <textarea style={{ ...input, minHeight: 54, fontSize: 13 }} maxLength={600} value={s.imagePrompt} onChange={(e) => patch(s.key, { imagePrompt: e.target.value })} aria-label="Image prompt (English)" placeholder="Image prompt (English)" />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(['clip', 'talk'] as ProducaoShotMode[]).map((m) => (
                        <button key={m} type="button" onClick={() => patch(s.key, { mode: m })} style={chip(s.mode === m)}><UiLabel>{m === 'clip' ? 'Clip' : 'Talks to camera'}</UiLabel></button>
                      ))}
                    </div>
                    {s.mode === 'clip' ? (
                      <input style={{ ...input, fontSize: 13 }} maxLength={300} value={s.motionPrompt} onChange={(e) => patch(s.key, { motionPrompt: e.target.value })} aria-label="Motion prompt (English)" placeholder="Motion prompt (English)" />
                    ) : (
                      <>
                        <textarea style={{ ...input, minHeight: 64, fontSize: 13 }} maxLength={PRODUCAO_LINE_MAX} value={s.line} onChange={(e) => patch(s.key, { line: e.target.value })} aria-label="What the character says" placeholder="What the character says" />
                        <p style={{ ...small, color: estimateTalkSeconds(s.line) < PRODUCAO_AVATAR_MIN_SECONDS ? C.danger : C.muted }}>
                          <UiLabel>{`≈ ${estimateTalkSeconds(s.line)} s of speech · minimum ${PRODUCAO_AVATAR_MIN_SECONDS} s`}</UiLabel>
                        </p>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            ) : null}
            {shots.length && shots.length < PRODUCAO_MAX_SHOTS ? <button type="button" onClick={addShot} style={{ ...btn(false), marginTop: 10 }}><UiLabel>+ Add a shot</UiLabel></button> : null}
          </section>

          {/* 3. Prévia das cenas */}
          <section style={part}>
            {step(3, 'Scene preview', `Images only, ${PRODUCAO_IMAGE_CREDITS} cr each (Nano Banana Pro). Approve or redo each one before any video.`)}
            <button type="button" onClick={imagesAll} disabled={!!busy || !hasCharacter || imagesToMake === 0} style={btn(true, !!busy || !hasCharacter || imagesToMake === 0)}>
              <UiLabel>{busy === 'images' ? 'Generating images…' : imagesToMake ? `Generate ${imagesToMake} images · ${imagesToMake * PRODUCAO_IMAGE_CREDITS} cr` : 'All images ready'}</UiLabel>
            </button>
            {!hasCharacter ? <p style={small}><UiLabel>Add your character first (step 1).</UiLabel></p> : null}
            {shots.some((s) => s.imageUrl || s.imageState !== 'idle') ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginTop: 14 }}>
                {shots.map((s) => (
                  <div key={s.key} style={{ display: 'grid', gap: 6 }}>
                    <div style={{ position: 'relative', aspectRatio: '9 / 16', borderRadius: 12, overflow: 'hidden', background: C.soft, outline: s.approved ? '2px solid var(--accent)' : 'none', display: 'grid', placeItems: 'center', color: C.muted, fontSize: 12, textAlign: 'center' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {s.imageUrl ? <img src={s.imageUrl} alt={s.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ padding: 8 }}>{s.imageState === 'working' ? '…' : s.imageState === 'failed' ? s.error : s.title}</span>}
                    </div>
                    {s.imageUrl ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => patch(s.key, { approved: !s.approved })} style={{ ...btn(s.approved), flex: 1, padding: '7px 8px' }}><UiLabel>{s.approved ? 'Approved' : 'Approve'}</UiLabel></button>
                        <button type="button" disabled={!!busy} onClick={async () => { setBusy('images'); await imageOne(s); setBusy(null) }} style={{ ...btn(false, !!busy), padding: '7px 8px' }}><UiLabel>{`Redo · ${PRODUCAO_IMAGE_CREDITS} cr`}</UiLabel></button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* 4. Dar vida */}
          <section style={part}>
            {step(4, 'Bring it to life', 'Each approved shot becomes a clip or the character talking to the camera.')}
            {approved.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {approved.map((s) => {
                  const eng = photoEngines.find((e) => e.key === s.engine)
                  return (
                    <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '54px 1fr', gap: 10, alignItems: 'center', border: C.border, borderRadius: 12, padding: 10 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.imageUrl!} alt="" style={{ width: 54, aspectRatio: '9 / 16', objectFit: 'cover', borderRadius: 8 }} />
                      <div style={{ display: 'grid', gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.title} · <UiLabel>{s.mode === 'talk' ? 'Talks to camera' : 'Clip'}</UiLabel></div>
                        {s.mode === 'clip' ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <select value={s.engine} onChange={(e) => { const ne = photoEngines.find((x) => x.key === e.target.value); patch(s.key, { engine: e.target.value, seconds: ne?.seconds.includes(s.seconds) ? s.seconds : ne?.seconds[0] ?? 5 }) }} style={{ ...input, width: 'auto', padding: '6px 8px', fontSize: 12 }} aria-label="Engine">
                              {photoEngines.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
                            </select>
                            <select value={s.seconds} onChange={(e) => patch(s.key, { seconds: Number(e.target.value) })} style={{ ...input, width: 'auto', padding: '6px 8px', fontSize: 12 }} aria-label="Seconds">
                              {(eng?.seconds ?? [s.seconds]).map((n) => <option key={n} value={n}>{`${n} s · ${eng?.credits[String(n)] ?? '?'} cr`}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            {(['female', 'male'] as ProducaoVoice[]).map((v) => (
                              <button key={v} type="button" onClick={() => patch(s.key, { voice: v })} style={chip(s.voice === v)}><UiLabel>{v === 'female' ? 'Female voice' : 'Male voice'}</UiLabel></button>
                            ))}
                            <span style={{ fontSize: 12, color: C.muted }}><UiLabel>{`VEED Fabric · ${PRODUCAO_AVATAR_CREDITS} cr`}</UiLabel></span>
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: s.lifeState === 'failed' ? C.danger : C.muted }}>
                          {s.lifeState === 'working' ? <UiLabel>Working… this takes a few minutes.</UiLabel> : s.lifeState === 'failed' ? s.error : s.lifeFor === lifeKey(s) ? <UiLabel>Ready</UiLabel> : <UiLabel>{`${shotLifeCost(s)} cr`}</UiLabel>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div>
                  <button type="button" onClick={lifeAll} disabled={!!busy || needLife.length === 0 || talkTooShort} style={btn(true, !!busy || needLife.length === 0 || talkTooShort)}>
                    <UiLabel>{busy === 'life' ? 'Bringing shots to life…' : needLife.length ? `Bring ${needLife.length} shots to life · ${lifeCost} cr` : 'All approved shots are ready'}</UiLabel>
                  </button>
                  {talkTooShort ? <p style={{ ...small, color: C.danger }}><UiLabel>{`A talking shot needs at least ${PRODUCAO_AVATAR_MIN_SECONDS} seconds of speech — make the line longer.`}</UiLabel></p> : null}
                </div>
              </div>
            ) : <p style={small}><UiLabel>Approve at least one image in step 3.</UiLabel></p>}
          </section>

          {/* 5. Montar */}
          <section style={part}>
            {step(5, 'Assemble the ad', 'Shots in your order, 0.4 s transitions, and a 3-second end card with your logo. MP4 1080×1920.')}
            <div style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
              <div>
                <label htmlFor="producao-narration" style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}><UiLabel>Narration (optional)</UiLabel></label>
                <textarea id="producao-narration" style={{ ...input, minHeight: 56, marginTop: 6, fontSize: 13 }} maxLength={2000} value={narration.text} onChange={(e) => setNarration({ text: e.target.value, id: null, url: null, seconds: null })} placeholder="Plays over the clips before the first talking shot" />
                {narration.text.trim().length >= 3 && !narration.url ? (
                  <button type="button" onClick={makeNarration} disabled={!!busy} style={{ ...btn(false, !!busy), marginTop: 6 }}><UiLabel>{`Generate narration · ${narrationCredits(narration.text)} cr (MiniMax Speech 2.8 HD)`}</UiLabel></button>
                ) : null}
                {narration.url ? <audio src={narration.url} controls onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (Number.isFinite(d)) setNarration((n) => ({ ...n, seconds: d })) }} style={{ width: '100%', marginTop: 6 }} /> : null}
              </div>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
                <input style={input} maxLength={PRODUCAO_SLOGAN_MAX} value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Slogan" aria-label="Slogan" />
                <input style={input} maxLength={PRODUCAO_SUPPORT_MAX} value={support} onChange={(e) => setSupport(e.target.value)} placeholder="Support line (site, phone, offer)" aria-label="Support line" />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: C.muted }}><UiLabel>End card</UiLabel></span>
                <button type="button" onClick={() => setCardTheme('light')} style={chip(cardTheme === 'light')}><UiLabel>Light</UiLabel></button>
                <button type="button" onClick={() => setCardTheme('dark')} style={chip(cardTheme === 'dark')}><UiLabel>Dark</UiLabel></button>
                <span style={{ fontSize: 12, color: logoUrl ? C.muted : C.danger }}>
                  <UiLabel>{logoUrl ? 'Your logo fills the end card.' : 'No logo yet — add it in Studio (Your logo) to show it on the end card.'}</UiLabel>
                </span>
              </div>
              <div>
                <button type="button" onClick={assemble} disabled={!!busy || ready.length === 0} style={btn(true, !!busy || ready.length === 0)}>
                  <UiLabel>{busy === 'montage' ? (montage?.status === 'rendering' ? `Assembling… ${Math.round((montage.progress ?? 0) * 100)}%` : 'Sending…') : `Assemble ${ready.length} shots`}</UiLabel>
                </button>
                <p style={small}><UiLabel>{montagePrice}</UiLabel></p>
              </div>
              {montage?.url ? (
                <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
                  <video src={montage.url} controls playsInline style={{ width: '100%', aspectRatio: '9 / 16', borderRadius: 12, background: '#000' }} />
                  <a href={montage.url} download target="_blank" rel="noreferrer" style={{ ...btn(true), textAlign: 'center', textDecoration: 'none' }}><UiLabel>Download MP4</UiLabel></a>
                </div>
              ) : null}
            </div>
          </section>

          {error ? <div role="alert" style={{ marginTop: 12, border: '1px solid rgba(217,48,37,.45)', borderRadius: 12, padding: 12, color: C.danger, fontSize: 14 }}>{error}</div> : null}
        </div>
        <ProductStage
          name="Production"
          desc="Character, shots, clips, talking shots and your logo — one ad."
          meta={`${PRODUCAO_IMAGE_CREDITS} cr / image · Nano Banana Pro`}
          items={stageItems.length ? stageItems : ADS_HOUSE_STAGE}
          wide={stageItems.length === 0}
        />
      </div>
      <ProductRow title="Made on Kineo" sub="House ads made with Kineo." items={ADS_HOUSE_STAGE.map((x) => ({ title: x.title, image: x.poster! }))} wide />
    </div>
  )
}
