'use client'

// KINEO-CLIPES-2026-09-29 — /clips: UM clipe (5–15 s, uma cena, sem narração) em qualquer motor que a conta pode
// apertar. Visual do /images (cards de motor em cima, caixa de texto, ajustes na lateral, "Meus clipes" embaixo).
// O catálogo vem do servidor (GET /api/clips) — motor pausado, interno ou fora do plano nem aparece, e a rota recusa com
// a MESMA régua. Regras de tela do fundador (29/09): cada card mostra as durações REAIS que o motor faz antes do clique;
// escolher uma duração que o motor atual não faz NÃO troca nada em silêncio — mostra quais motores fazem e troca com 1 clique.
// KINEO-CLIP-EFEITOS-2026-10-05 — galeria de EFEITOS DE 1 CLIQUE em cima (lib/clips/clipEffects.ts, vinda do GET só para
// quem o interruptor deixa): escolher efeito → subir a foto (o MESMO upload/termo de direitos de sempre) → 1 clique. O
// navegador manda só { effect, image_url }; o servidor resolve prompt/motor/duração/formato. Clipe de efeito pronto
// ganha "Turn into a narrated film (60 s)", que passa por POST /api/clips/effect-upsell antes de abrir o Studio.
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { STUDIO_KIT_CSS } from '@/components/studioKit'
import { ProductStageStyles, useProductStage } from '@/components/ProductStage' // KINEO-CLIPS-CORES-2026-10-01
import CreditsTopupModal from '@/components/CreditsTopupModal'
import ControlIcon from '@/components/ControlIcon'
import { outOfCreditsDestination } from '@/lib/credits/outOfCreditsPlans'
import { clipCopy, type ClipCopyKey } from '@/lib/clips/clipCopy'

type Engine = {
  key: string
  label: string
  text: boolean
  photo: boolean
  seconds: number[]
  credits: Record<string, number>
  textAspects: string[]
  photoAspects: string[]
}

type Clip = {
  id: string
  engine: string
  label: string
  with_image: boolean
  seconds: number
  aspect: string
  prompt: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  video_url: string | null
  credits: number
  credits_refunded: number
  failure_reason: string | null
  created_at: string
  effect?: string | null
  film_href?: string | null
}

type EffectCard = {
  key: string
  title: string
  sub: string
  engine: string
  engine_label: string
  seconds: number
  credits: number
  person: boolean
  preview: { video: string; poster?: string; note: string } | null
}

const ASPECT_KEY: Record<string, ClipCopyKey> = { '9:16': 'vertical', '16:9': 'wide', '1:1': 'square' }
const ASPECT_ICON: Record<string, string> = { '9:16': '▯', '16:9': '▭', '1:1': '□' }
const ICON: Record<string, string> = { seedance: 'S', kling: 'K', hollywood: 'K3', veo: 'G', h3: 'H3', omni: 'OF', s25: 'S2' }

function newKey(): string {
  try { return `clip-ui-${crypto.randomUUID()}` } catch { return `clip-ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` }
}

async function compressPhoto(file: File): Promise<File> {
  // Mesmo tratamento do /animate: o upload aceita JPG/PNG ≤ 8 MB; webp ou foto grande vira JPEG ≤ 1600 px.
  const needs = file.size >= 2 * 1024 * 1024 || !/^image\/(jpeg|png)$/.test(file.type)
  if (!needs) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

export default function ClipsClient() {
  const language = useInterfaceLanguage()
  const t = useCallback((key: ClipCopyKey, vars?: Record<string, string | number>) => clipCopy(language, key, vars), [language])
  useProductStage('clips') // KINEO-CLIPS-CORES-2026-10-01 — fundo e barra lateral na cor da aba, como Imagens/Espaços/Ads

  const [engines, setEngines] = useState<Engine[]>([])
  const [effects, setEffects] = useState<EffectCard[]>([])
  const [effectKey, setEffectKey] = useState<string | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [plan, setPlan] = useState('free')

  const [engineKey, setEngineKey] = useState<string>('')
  const [seconds, setSeconds] = useState<number>(5)
  const [aspect, setAspect] = useState<string>('9:16')
  const [prompt, setPrompt] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ text: string; credits: boolean } | null>(null)
  const [showTopup, setShowTopup] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadFailed(false)
    fetch('/api/clips', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (Array.isArray(d?.engines)) setEngines(d.engines)
        if (Array.isArray(d?.effects)) setEffects(d.effects)
        if (typeof d?.balance === 'number') setBalance(d.balance)
        if (!r.ok) { setLoadFailed(true); return }
        if (Array.isArray(d?.clips)) setClips(d.clips)
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false))
    fetch('/api/credits', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (typeof d?.plan === 'string') setPlan(d.plan) })
      .catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  // Primeiro motor da lista (ou ?engine= vindo do menu) e a primeira duração dele.
  useEffect(() => {
    if (engineKey || engines.length === 0) return
    const wanted = new URLSearchParams(window.location.search).get('engine')
    const first = engines.find((e) => e.key === wanted) ?? engines[0]
    setEngineKey(first.key)
    setSeconds(first.seconds[0])
  }, [engines, engineKey])

  // ?effect=<chave> (ex.: vindo da home "clips-first") já abre com o efeito escolhido — só se a galeria o trouxe.
  const effectFromUrlRef = useRef(false)
  useEffect(() => {
    if (effectFromUrlRef.current || effects.length === 0) return
    effectFromUrlRef.current = true
    const wanted = new URLSearchParams(window.location.search).get('effect')
    if (wanted && effects.some((fx) => fx.key === wanted)) setEffectKey(wanted)
  }, [effects])

  const effect = effects.find((fx) => fx.key === effectKey) ?? null
  const engine = engines.find((e) => e.key === engineKey) ?? null
  const withPhoto = !!photoUrl
  const allSeconds = useMemo(() => Array.from(new Set(engines.flatMap((e) => e.seconds))).sort((a, b) => a - b), [engines])
  const aspectChoices = engine ? (withPhoto ? engine.photoAspects : engine.textAspects) : []
  const effectiveAspect = aspectChoices.length === 0 ? 'image' : aspectChoices.includes(aspect) ? aspect : aspectChoices[0]
  const lengthOk = !!engine && engine.seconds.includes(seconds)
  const modeProblem: ClipCopyKey | null = !engine ? null : withPhoto && !engine.photo ? 'noPhoto' : !withPhoto && !engine.text ? 'needsPhoto' : null
  const cost = engine && lengthOk ? engine.credits[String(seconds)] : null
  const alternatives = engines.filter((e) => e.key !== engineKey && e.seconds.includes(seconds) && (withPhoto ? e.photo : e.text))
  const textOk = withPhoto ? prompt.trim().length === 0 || prompt.trim().length >= 3 : prompt.trim().length >= 3
  const canGenerate = !!engine && lengthOk && !modeProblem && textOk && !busy && !uploading && cost !== null

  function chooseEngine(next: Engine) {
    setEngineKey(next.key)
    setError(null)
    // Trocar de MOTOR com uma duração que ele não faz: vai para a duração mais próxima que o card acabou de mostrar.
    if (!next.seconds.includes(seconds)) {
      const nearest = next.seconds.reduce((best, s) => (Math.abs(s - seconds) < Math.abs(best - seconds) || (Math.abs(s - seconds) === Math.abs(best - seconds) && s > best) ? s : best), next.seconds[0])
      setSeconds(nearest)
    }
  }

  async function onPhoto(file: File | null) {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', await compressPhoto(file))
      fd.append('rights', 'true')
      fd.append('purpose', 'animate')
      const res = await fetch('/api/avatar/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data?.url !== 'string') throw new Error(typeof data?.error === 'string' ? data.error : 'Upload failed. Please try again.')
      setPhotoUrl(data.url)
    } catch (e) {
      setError({ text: e instanceof Error ? e.message : 'Upload failed. Please try again.', credits: false })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function chooseEffect(key: string) {
    setEffectKey((current) => (current === key ? null : key))
    setError(null)
    window.requestAnimationFrame(() => document.getElementById('clip-effect-panel')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  async function generate() {
    if (!engine || !canGenerate) return
    await send({ engine: engine.key, seconds, aspect: effectiveAspect === 'image' ? null : effectiveAspect, prompt: prompt.trim(), image_url: photoUrl })
  }

  // Efeito: só a chave e a foto. Prompt, motor, duração e formato quem decide é o servidor (pelo catálogo).
  async function generateEffect() {
    if (!effect || !photoUrl || busy || uploading) return
    await send({ effect: effect.key, image_url: photoUrl })
  }

  async function send(payload: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    const key = newKey()
    try {
      const res = await fetch('/api/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ ...payload, idempotency_key: key }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.clip) setClips((xs) => [data.clip as Clip, ...xs.filter((c) => c.id !== data.clip.id)])
      if (typeof data?.balance === 'number') setBalance(data.balance)
      if (!res.ok) {
        setError({ text: typeof data?.error === 'string' ? data.error : 'Could not start the clip.', credits: data?.code === 'credits' || res.status === 402 })
        return
      }
      window.dispatchEvent(new Event('creditsChanged'))
    } catch {
      setError({ text: 'Connection lost. Check “My clips” before trying again.', credits: false })
    } finally {
      setBusy(false)
    }
  }

  // Poll só dos clipes em andamento (no máximo 3 por conta), a cada 6 s.
  const inFlight = clips.filter((c) => c.status === 'pending' || c.status === 'processing').map((c) => c.id).join(',')
  useEffect(() => {
    if (!inFlight) return
    const ids = inFlight.split(',')
    const timer = window.setInterval(() => {
      for (const id of ids) {
        fetch(`/api/clips/status?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (!d?.clip) return
            setClips((xs) => xs.map((c) => (c.id === id ? d.clip : c)))
            if (d.clip.status === 'failed' && d.clip.credits_refunded > 0) window.dispatchEvent(new Event('creditsChanged'))
          })
          .catch(() => {})
      }
    }, 6000)
    return () => window.clearInterval(timer)
  }, [inFlight])

  async function download(url: string, name: string) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    } catch {
      window.open(url, '_blank', 'noopener')
    }
  }

  // Upsell do clipe de efeito: grava o clique no servidor (clip_effect_film_upsell_clicked) e abre o Studio com a ideia.
  // Se a rota falhar ou demorar, navega mesmo assim pelo link que já veio no clipe — métrica não trava o cliente.
  function filmClick(event: ReactMouseEvent<HTMLAnchorElement>, clip: Clip) {
    const fallback = clip.film_href
    if (!fallback) return
    const record: Promise<{ href?: unknown } | null> = fetch('/api/clips/effect-upsell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip_id: clip.id }),
      keepalive: true,
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    // Ctrl/⌘/meio-clique abre em outra aba pelo próprio link; o clique já foi gravado acima (keepalive).
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500))
    void Promise.race([record, timeout]).then((d) => {
      const href = d && typeof d.href === 'string' && d.href.startsWith('/studio?') ? d.href : fallback
      window.location.assign(href)
    })
  }

  const minCost = (e: Engine) => Math.min(...Object.values(e.credits))

  const photoRow = (
    <div className="photo-row">
      {photoUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <><img src={photoUrl} alt="" /><button type="button" className="pill" onClick={() => setPhotoUrl(null)}>{t('removePhoto')}</button></>
        : <button type="button" className="pill" disabled={uploading} onClick={() => fileRef.current?.click()}><ControlIcon name="image" /> {uploading ? t('uploading') : t('addPhoto')}</button>}
      <span className="clip-meta" style={{ marginTop: 0 }}>{effect ? t('effectPhoto') : <>{t('photo')} · {t('photoHint')}</>}</span>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void onPhoto(e.target.files?.[0] ?? null)} />
    </div>
  )

  const errorBlock = error && (
    <p role="alert" style={{ marginTop: 10, padding: '9px 12px', borderRadius: 10, background: 'rgba(255,107,107,.08)', border: '1px solid rgba(255,107,107,.35)', color: 'var(--text)', fontSize: 12.5 }}>
      ⚠️ {error.text}{' '}
      {error.credits && (outOfCreditsDestination(plan) === 'topup'
        ? <button type="button" onClick={() => setShowTopup(true)} style={{ color: 'var(--indigo)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{t('addCredits')}</button>
        : <a href="/pricing" style={{ color: 'var(--indigo)', fontWeight: 700 }}>{t('addCredits')}</a>)}
      {/signed in/i.test(error.text) && <a href="/login?redirect=/clips" style={{ color: 'var(--indigo)', fontWeight: 700 }}>{t('signIn')}</a>}
    </p>
  )

  return (
    <div className="stu clips-workspace kps-page">
      <ProductStageStyles />
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />
      <style>{`
        .stu.clips-workspace{width:100%;min-width:0;max-width:none;background:var(--bg);color:var(--text);container:clips-studio / inline-size}
        .stu.clips-workspace .sub{color:var(--muted2);margin-bottom:24px}
        .stu.clips-workspace .grid.creation-grid{width:100%;max-width:none;grid-template-columns:minmax(0,1fr) minmax(260px,320px);gap:24px}
        .stu.clips-workspace .card{background:color-mix(in srgb,var(--card) 78%,transparent);border-color:color-mix(in srgb,var(--stage-a) 22%,var(--border));border-radius:var(--r-md,18px);-webkit-backdrop-filter:blur(18px) saturate(1.25);backdrop-filter:blur(18px) saturate(1.25)}
        .stu.clips-workspace .creation-input{padding:22px}
        .stu.clips-workspace textarea{min-height:clamp(170px,22vh,260px);background:var(--card2);border-color:var(--border);color:var(--text);font-size:16px}
        .stu.clips-workspace .pill{background:var(--card2);border-color:var(--border);color:var(--text2);min-height:40px}
        .stu.clips-workspace .pill.on{background:var(--indigo);border-color:var(--indigo);color:var(--on-accent,#fff)}
        .stu.clips-workspace .pill.off{opacity:.55}
        .stu.clips-workspace .go.ok{background:var(--indigo);color:var(--on-accent,#fff);box-shadow:none;border-radius:var(--r-sm,13px)}
        .stu.clips-workspace .go.no{background:var(--card2);color:var(--muted);border:1px solid var(--border);border-radius:var(--r-sm,13px)}
        .stu.clips-workspace .clip-engines{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:0 0 28px}
        .stu.clips-workspace .clip-engine{display:flex;flex-direction:column;gap:8px;padding:14px;border:1px solid var(--border);border-radius:var(--r-sm,13px);background:var(--card);color:var(--text);text-align:start;cursor:pointer;min-width:0}
        .stu.clips-workspace .clip-engine[aria-pressed="true"]{border-color:var(--indigo);background:var(--accent-soft,var(--card2));box-shadow:inset 0 0 0 1px var(--indigo)}
        .stu.clips-workspace .clip-engine .ic{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid var(--border);border-radius:9px;background:var(--card2);font-size:12px;font-weight:800}
        .stu.clips-workspace .clip-engine .nm{font-size:13px;font-weight:700}
        .stu.clips-workspace .clip-engine .sec{font-size:12px;color:var(--text2);font-variant-numeric:tabular-nums}
        .stu.clips-workspace .clip-engine .pr{font-size:11px;color:var(--muted2)}
        .stu.clips-workspace .clip-engine .tag{font-size:10px;color:var(--muted2);border:1px solid var(--border);border-radius:6px;padding:1px 6px;align-self:flex-start}
        .stu.clips-workspace .notice{margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid rgba(251,191,36,.35);background:rgba(251,191,36,.06);font-size:12.5px;color:var(--text)}
        .stu.clips-workspace .notice .row{margin-top:8px}
        .stu.clips-workspace .photo-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px}
        .stu.clips-workspace .photo-row img{width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--border)}
        .stu.clips-workspace .clip-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
        .stu.clips-workspace .clip-card video{width:100%;border-radius:10px;display:block;background:#000;max-height:420px}
        .stu.clips-workspace .clip-meta{font-size:12px;color:var(--muted2);margin-top:8px;overflow-wrap:anywhere}
        .stu.clips-workspace .clip-wait{aspect-ratio:9/16;max-height:320px;border-radius:10px;border:1px dashed var(--border2);display:flex;align-items:center;justify-content:center;text-align:center;padding:14px;font-size:12.5px;color:var(--muted2)}
        .stu.clips-workspace .fx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin:0 0 28px}
        .stu.clips-workspace .fx-card{display:flex;flex-direction:column;gap:6px;padding:8px 8px 12px;border:1px solid var(--border);border-radius:var(--r-sm,13px);background:var(--card);color:var(--text);text-align:start;cursor:pointer;min-width:0}
        .stu.clips-workspace .fx-card[aria-pressed="true"]{border-color:var(--indigo);box-shadow:inset 0 0 0 1px var(--indigo)}
        .stu.clips-workspace .fx-media{display:block;position:relative;aspect-ratio:9/16;max-height:260px;border-radius:9px;overflow:hidden;background:var(--card2)}
        .stu.clips-workspace .fx-media video{width:100%;height:100%;object-fit:cover;display:block}
        .stu.clips-workspace .fx-soon{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;font-size:12px;font-weight:700;color:var(--muted2);border:1px dashed var(--border2);border-radius:9px}
        .stu.clips-workspace .fx-title{font-size:13px;font-weight:700;padding:0 4px}
        .stu.clips-workspace .fx-sub{font-size:12px;color:var(--text2);padding:0 4px}
        .stu.clips-workspace .fx-foot{display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;padding:0 4px}
        .stu.clips-workspace .fx-foot .tag{font-size:10px;color:var(--muted2);border:1px solid var(--border);border-radius:6px;padding:1px 6px}
        .stu.clips-workspace .fx-foot .pr{font-size:12px;font-weight:700;font-variant-numeric:tabular-nums}
        .stu.clips-workspace .fx-note{font-size:10.5px;color:var(--muted2);padding:0 4px}
        .stu.clips-workspace .film-upsell{text-decoration:none;font-weight:700}
        @container clips-studio (max-width:700px){.stu.clips-workspace .grid.creation-grid{grid-template-columns:minmax(0,1fr)}.stu.clips-workspace .creation-input{padding:16px}}
        @media(max-width:900px){.stu.clips-workspace .grid.creation-grid{grid-template-columns:minmax(0,1fr);gap:18px}}
      `}</style>

      <h1>{t('title')}</h1>
      <p className="sub">{t('sub')}</p>

      {effects.length > 0 && (
        <section aria-labelledby="clip-effects-title">
          <div className="lab" id="clip-effects-title">{t('effectsTitle')}</div>
          <p className="clip-meta" style={{ marginTop: 0, marginBottom: 12 }}>{t('effectsSub')}</p>
          <div className="fx-grid" role="group" aria-labelledby="clip-effects-title">
            {effects.map((fx) => (
              <button key={fx.key} type="button" className="fx-card" aria-pressed={fx.key === effectKey} onClick={() => chooseEffect(fx.key)}>
                <span className="fx-media">
                  {fx.preview
                    ? <video src={fx.preview.video} poster={fx.preview.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
                    : <span className="fx-soon">{t('previewSoon')}</span>}
                </span>
                <span className="fx-title">{fx.title}</span>
                <span className="fx-sub">{fx.sub}</span>
                <span className="fx-foot">
                  <span className="tag">{t('madeWith', { engine: fx.engine_label })} · {fx.seconds} s</span>
                  <span className="pr">{fx.credits} cr</span>
                </span>
                {fx.preview && <span className="fx-note">{fx.preview.note}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {!effect && <div className="lab"><span className="n">1</span>{t('engine')}</div>}
      {!effect && <div className="clip-engines" role="group" aria-label={t('engine')}>
        {engines.map((e) => (
          <button key={e.key} type="button" className="clip-engine" aria-pressed={e.key === engineKey} onClick={() => chooseEngine(e)}>
            <span className="ic" aria-hidden="true">{ICON[e.key] ?? '•'}</span>
            <span className="nm">{e.label}</span>
            <span className="sec">{e.seconds.join(' · ')} s</span>
            <span className="pr">{t('from', { n: minCost(e) })}</span>
            {!e.text && <span className="tag">{t('photoOnly')}</span>}
          </button>
        ))}
      </div>}

      <div className="grid creation-grid">
        {effect ? (
          <>
            <div className="card creation-input" id="clip-effect-panel">
              <div className="lab"><span className="n">1</span>{t('effectLabel')} · {effect.title}</div>
              <p className="clip-meta" style={{ marginTop: 0 }}>{effect.sub}</p>
              <div className="lab" style={{ marginTop: 14 }}><span className="n">2</span>{t('effectAddPhoto')}</div>
              {photoRow}
              {effect.person && <p className="notice" role="note">{t('effectPersonHint')}</p>}
              {errorBlock}
              <div className="row" style={{ marginTop: 14 }}>
                <button type="button" className="pill" onClick={() => { setEffectKey(null); setError(null) }}>← {t('effectBack')}</button>
              </div>
            </div>
            <div className="rail creation-settings">
              <div className="cost" id="clip-effect-review" tabIndex={-1}>
                <div className="sum">{effect.title} · {t('madeWith', { engine: effect.engine_label })} · {effect.seconds} s</div>
                <div className="val"><span>{t('cost')}</span><b>{effect.credits}</b></div>
                {balance !== null && <div className="gnote">{balance} {t('credits')}</div>}
                <button type="button" disabled={busy || uploading} className={`go ${busy || uploading ? 'no' : 'ok'}`}
                  onClick={() => (photoUrl ? void generateEffect() : fileRef.current?.click())}>
                  {busy ? t('creating') : uploading ? t('uploading') : photoUrl ? t('generate') : t('effectAddPhoto')}
                </button>
              </div>
            </div>
          </>
        ) : (<>
        <div className="card creation-input">
          <div className="lab"><span className="n">2</span>{t('yourClip')}</div>
          <textarea aria-label={t('yourClip')} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} maxLength={1000}
            placeholder={withPhoto ? t('placeholderMotion') : t('placeholder')} />
          {photoRow}
          {engine && modeProblem && <p className="notice" role="status">{t(modeProblem, { engine: engine.label })}</p>}
          {errorBlock}
        </div>

        <div className="rail creation-settings">
          <div className="card">
            <div className="lab"><span className="n">3</span>{t('length')}</div>
            <div className="row">
              {allSeconds.map((s) => (
                <button key={s} type="button" className={`pill${seconds === s ? ' on' : ''}${engine && !engine.seconds.includes(s) ? ' off' : ''}`} onClick={() => { setSeconds(s); setError(null) }}>
                  {s} s
                </button>
              ))}
            </div>
            {engine && !lengthOk && (
              <div className="notice" role="status">
                {t('notLength', { engine: engine.label, s: seconds })}
                <div className="row">
                  {alternatives.map((alt) => (
                    <button key={alt.key} type="button" className="pill" onClick={() => setEngineKey(alt.key)}>
                      {alt.label} · {alt.credits[String(seconds)]} cr
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="lab"><span className="n">4</span>{t('format')}</div>
            {aspectChoices.length === 0
              ? <p className="clip-meta" style={{ marginTop: 0 }}>{t('samePhoto')}</p>
              : <div className="row">
                  {aspectChoices.map((a) => (
                    <button key={a} type="button" className={`pill${effectiveAspect === a ? ' on' : ''}`} onClick={() => setAspect(a)}>
                      {ASPECT_ICON[a]} {a} · {t(ASPECT_KEY[a] ?? 'vertical')}
                    </button>
                  ))}
                </div>}
          </div>

          <div className="cost" id="clip-generation-review" tabIndex={-1}>
            <div className="sum">{engine ? `${engine.label} · ${seconds} s · ${effectiveAspect === 'image' ? t('samePhoto') : effectiveAspect}` : '—'}</div>
            <div className="val"><span>{t('cost')}</span><b>{cost ?? '—'}</b></div>
            {balance !== null && <div className="gnote">{balance} {t('credits')}</div>}
            <button type="button" onClick={generate} disabled={!canGenerate} className={`go ${canGenerate ? 'ok' : 'no'}`}>
              {busy ? t('creating') : (withPhoto || prompt.trim().length >= 3) ? t('generate') : t('describeFirst')}
            </button>
          </div>
        </div>
        </>)}
        {showTopup && <CreditsTopupModal surface="clips_402" onClose={() => setShowTopup(false)} />}

        <div className="creation-results" style={{ gridColumn: '1 / -1' }}>
          {loadFailed && (
            <div role="alert" className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', border: '1px solid rgba(251,191,36,.35)', background: 'rgba(251,191,36,.06)' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{t('loadFailed')}</span>
              <button type="button" className="pill" onClick={load}>↻ {t('tryAgain')}</button>
            </div>
          )}
          <div className="lab" style={{ marginTop: 18 }}>{t('myClips')}</div>
          {!loading && !loadFailed && clips.length === 0 && <p className="clip-meta">{t('empty')}</p>}
          <div className="clip-grid">
            {clips.map((c) => (
              <div key={c.id} className="card clip-card" style={{ padding: 10 }}>
                {c.status === 'done' && c.video_url
                  ? <video src={c.video_url} controls playsInline preload="metadata" />
                  : <div className="clip-wait">{c.status === 'failed' ? (c.credits_refunded > 0 ? t('failedRefunded', { n: c.credits_refunded }) : t('failed')) : t('inProgress')}</div>}
                <div className="clip-meta">{c.label} · {c.seconds} s · {c.aspect === 'image' ? t('samePhoto') : c.aspect} · {c.credits} cr</div>
                {c.effect
                  ? <div className="clip-meta" style={{ marginTop: 4 }}>{t('effectLabel')} · {effects.find((fx) => fx.key === c.effect)?.title ?? c.effect}</div>
                  : c.prompt && <div className="clip-meta" style={{ marginTop: 4 }}>{c.prompt.slice(0, 120)}</div>}
                {c.status === 'done' && c.video_url && (
                  <div className="row" style={{ marginTop: 8 }}>
                    <button type="button" className="pill" onClick={() => void download(c.video_url!, `kineo-clip-${c.id.slice(0, 8)}.mp4`)}><ControlIcon name="download" /> {t('download')}</button>
                    {c.effect && c.film_href && (
                      <a className="pill on film-upsell" href={c.film_href} onClick={(event) => filmClick(event, c)}>{t('filmUpsell')} →</a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
