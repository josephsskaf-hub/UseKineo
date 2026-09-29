'use client'

// KINEO-IMAGES-2026-08-17 — [STAGE] Kineo Images: a aba de imagens estilo
// Higgsfield, vestida com o Studio Kit. Multi-motor (FLUX Schnell/Dev +
// Recraft V3 pra texto perfeito), aspecto, geracao em grade com Download e
// Upscale 2x por imagem. Aprovado pra stage; sobe pra prod no ok do fundador.
import { UiLabel, useUiCopy } from '@/components/InterfaceLanguage'
import { useEffect, useState } from 'react'
import { STUDIO_KIT_CSS } from '@/components/studioKit'
import CreditsTopupModal from '@/components/CreditsTopupModal' // KINEO-TOPUP-POPUP-2026-08-18
// sprint-assinaturas #13 — o 402 so abre o popup de recarga para quem PODE
// comprar recarga (Creator/Studio, regra do checkout); trial/free/starter
// veem os 3 planos com "N images/mo" em vez de um pack que o checkout recusa.
import OutOfCreditsPlansModal from '@/components/OutOfCreditsPlansModal'
import { outOfCreditsDestination } from '@/lib/credits/outOfCreditsPlans'
// KINEO-FLUXO-NOVO-2026-09-25 — mede o clique em "Turn into video" (imagem → Animate).
import { trackEvent } from '@/lib/analytics'
import ControlIcon from '@/components/ControlIcon'
import ImageResultPreview from '@/components/ImageResultPreview'
import MobileCreationShortcut from '@/components/MobileCreationShortcut'
import { IMG_ENGINES, type ImgModelKey } from '@/lib/imageModels'

type ImgSize = 'square_hd' | 'portrait_16_9' | 'landscape_16_9'

const SIZES: { key: ImgSize; label: string }[] = [
  { key: 'portrait_16_9', label: '▯ 9:16 · Vertical' },
  { key: 'square_hd', label: '□ 1:1 · Square' },
  { key: 'landscape_16_9', label: '▭ 16:9 · Wide' },
]

type Item = { id?: string | null; url: string; model: ImgModelKey | string; upscaled?: string | null; upscaling?: boolean }

// KINEO-IMAGENS-FOTO-REFERENCIA-2026-09-29 — foto de referência no Nano Banana Pro (pedido do fundador: "meu amigo
// lutando na guerra de Troia como Aquiles", com o rosto do amigo). A foto sobe para a pasta da conta (/api/images/
// reference, moderada antes de ser guardada) e volta só o CAMINHO; ao gerar, o servidor assina a URL e usa o endpoint
// /edit do fal. A miniatura é local (object URL): a tela não pede a foto de volta ao servidor.
type RefPhoto = { key: string; path: string | null; preview: string; uploading: boolean }
const REF_MODEL: ImgModelKey = 'nanobanana'
const REF_MAX = 3
const REF_MAX_BYTES = 10 * 1024 * 1024
const REF_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// A Vercel corta corpo acima de ~4,5 MB: reduz para ≤ 2048 px em JPEG antes de enviar (rosto sobra; o motor sai a 1K).
// Se o navegador não conseguir decodificar, manda o arquivo como veio e o servidor decide.
async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 2048 / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (blob) return blob
  } catch {}
  return file
}

export default function ImagesClient() {
  const ui = useUiCopy()
  const [model, setModel] = useState<ImgModelKey>('dev')
  const [sample, setSample] = useState<{ src: string; name: string } | null>(null)
  const [size, setSize] = useState<ImgSize>('portrait_16_9')
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // KINEO-TOPUP-POPUP-2026-08-18 — 402 'Not enough credits' abre o popup de
  // recarga (packs one-time) em vez de morrer num texto de erro.
  const [showTopup, setShowTopup] = useState(false)
  // sprint-assinaturas #13 — plano/saldo de /api/credits decidem a parede do
  // 402 (recarga vs planos); madeThisSession da o numero real ao titulo.
  const [showPlans, setShowPlans] = useState(false)
  const [plan, setPlan] = useState<string>('free')
  const [balance, setBalance] = useState<number | null>(null)
  const [madeThisSession, setMadeThisSession] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [refs, setRefs] = useState<RefPhoto[]>([])
  const [refConsent, setRefConsent] = useState(false)
  // KINEO-SPRINT-UI-5-2026-08-29 — falha de leitura da galeria NAO pode se
  // disfarcar de galeria vazia (mesma mascara do incidente JWT-skew).
  const [galleryFailed, setGalleryFailed] = useState(false)
  // KINEO-SPRINT-UI7-2026-08-30 — primeiro carregamento sem salto: a estante
  // "My Images" nao existia ate o fetch voltar e POPava na tela. Agora o
  // load mostra a FORMA da grade (shimmer), igual library/my-videos.
  const [galleryLoading, setGalleryLoading] = useState(true)

  // KINEO-IMAGES-PROD-2026-08-17 — o mega-menu Image aponta motores pra ca
  // (?engine=), igual ao padrao do Studio: chegada ja cai com o motor certo.
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('engine')
    if (e && IMG_ENGINES.some((x) => x.key === e)) setModel(e as ImgModelKey)
  }, [])

  // KINEO-IMAGES-STORE-2026-08-17 (fundador: "precisa ter o storage, obvio"):
  // as imagens agora persistem no nosso bucket + tabela `images` — a grade
  // virou "My Images" e sobrevive ao refresh.
  function loadGallery() {
    setGalleryFailed(false)
    setGalleryLoading(true)
    fetch('/api/images', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d) => {
        if (Array.isArray(d?.images)) {
          setItems(d.images.map((r: { id: string; url: string; upscaled_url?: string | null; model?: string }) => ({
            id: r.id, url: r.url, model: (r.model ?? 'dev') as ImgModelKey, upscaled: r.upscaled_url ?? null,
          })))
        }
      })
      .catch(() => setGalleryFailed(true))
      .finally(() => setGalleryLoading(false))
  }
  useEffect(() => { loadGallery() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // sprint-assinaturas #13 — best effort; sem resposta a parede assume 'free'
  // (= planos), que e o destino seguro: nunca manda ninguem a um pack recusado.
  async function refreshPlan() {
    try {
      const r = await fetch('/api/credits', { cache: 'no-store' })
      if (!r.ok) return
      const d = await r.json()
      if (typeof d?.plan === 'string') setPlan(d.plan)
      if (typeof d?.credits === 'number') setBalance(d.credits)
    } catch {}
  }
  useEffect(() => { void refreshPlan() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreditsWall() {
    if (outOfCreditsDestination(plan) === 'topup') setShowTopup(true)
    else setShowPlans(true)
    void refreshPlan()
  }

  const eng = IMG_ENGINES.find((e) => e.key === model)!
  const unitCost = Number.parseInt(eng.credits, 10) || 1
  // Referência só vai no Nano Banana Pro; nos outros motores as fotos ficam guardadas na tela mas não são enviadas.
  const readyRefs = refs.filter((r) => r.path)
  const refsUploading = model === REF_MODEL && refs.some((r) => r.uploading)
  const sendRefs = model === REF_MODEL && readyRefs.length > 0
  const needsConsent = sendRefs && !refConsent
  const canGenerate = !!prompt.trim() && !busy && !refsUploading && !needsConsent

  async function addRefPhotos(list: FileList | null) {
    const files = Array.from(list ?? []).slice(0, Math.max(0, REF_MAX - refs.length))
    if (!refConsent || files.length === 0) return
    setError(null)
    for (const file of files) {
      if (!REF_TYPES.includes(file.type)) { setError(ui('Only JPG, PNG or WEBP photos.')); continue }
      if (file.size > REF_MAX_BYTES) { setError(ui('Photo is too large — max 10 MB.')); continue }
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const preview = URL.createObjectURL(file)
      setRefs((xs) => [...xs, { key, path: null, preview, uploading: true }])
      try {
        const blob = await shrinkPhoto(file)
        const form = new FormData()
        form.append('file', blob, blob === file ? file.name : 'reference.jpg')
        form.append('rights', 'true')
        const res = await fetch('/api/images/reference', { method: 'POST', body: form })
        const data = await res.json().catch(() => null)
        if (!res.ok || typeof data?.path !== 'string') throw new Error(data?.error ?? 'Photo upload failed. Please try again.')
        setRefs((xs) => xs.map((x) => (x.key === key ? { ...x, path: data.path as string, uploading: false } : x)))
      } catch (e) {
        URL.revokeObjectURL(preview)
        setRefs((xs) => xs.filter((x) => x.key !== key))
        setError(e instanceof Error ? e.message : 'Photo upload failed. Please try again.')
      }
    }
  }

  function removeRefPhoto(key: string) {
    setRefs((xs) => {
      const gone = xs.find((x) => x.key === key)
      if (gone) URL.revokeObjectURL(gone.preview)
      return xs.filter((x) => x.key !== key)
    })
  }

  async function generate() {
    if (!canGenerate) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(), model, size,
          ...(sendRefs ? { reference_paths: readyRefs.map((r) => r.path), reference_consent: refConsent } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.url) throw new Error(data?.error ?? 'Generation failed.')
      setItems((xs) => [{ id: (data.id as string | null) ?? null, url: data.url as string, model }, ...xs])
      setMadeThisSession((n) => n + 1)
      void refreshPlan()
    } catch (e) {
      { const m = e instanceof Error ? e.message : 'Generation failed.'; setError(m); if (/not enough credits/i.test(m)) openCreditsWall() }
    } finally {
      setBusy(false)
    }
  }

  // KINEO-IMAGES-DL-2026-08-17 (fundador: 'assim e o melhor modelo de
  // entrega?' — nao): o link cru abria o PNG no dominio do fal. Agora o
  // Download busca o blob e salva direto como kineo-image-N.png, sem sair do
  // site. Fallback: se o CORS do CDN negar, abre em nova aba como antes.
  async function downloadImage(url: string, idx: number) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `kineo-image-${items.length - idx}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    } catch {
      window.open(url, '_blank', 'noopener')
    }
  }

  // KINEO-EDIT-2026-08-18 — "✏️ Edit" por instrução (FLUX Kontext, 3cr):
  // "make it sunset", "change the palette to teal", "remove the text"…
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editTxt, setEditTxt] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  async function applyEdit(idx: number) {
    const item = items[idx]
    if (!item || !editTxt.trim() || editBusy) return
    setEditBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/images/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.upscaled ?? item.url, instruction: editTxt.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data?.url) throw new Error(data?.error ?? 'Edit failed.')
      setItems((xs) => [{ id: (data.id as string | null) ?? null, url: data.url as string, model: 'kontext' }, ...xs])
      setEditIdx(null)
      setEditTxt('')
    } catch (e) {
      { const m = e instanceof Error ? e.message : 'Edit failed.'; setError(m); if (/not enough credits/i.test(m)) openCreditsWall() }
    } finally {
      setEditBusy(false)
    }
  }

  async function upscale(idx: number) {
    const item = items[idx]
    if (!item || item.upscaling || item.upscaled) return
    setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, upscaling: true } : x)))
    try {
      const res = await fetch('/api/images/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, id: item.id ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data?.url) throw new Error(data?.error ?? 'Upscale failed.')
      setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, upscaled: data.url as string, upscaling: false } : x)))
    } catch (e) {
      { const m = e instanceof Error ? e.message : 'Upscale failed.'; setError(m); if (/not enough credits/i.test(m)) openCreditsWall() }
      setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, upscaling: false } : x)))
    }
  }

  return (
    <div className="stu images-workspace">
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />
      <style>{`
        .stu.images-workspace{width:100%;min-width:0;max-width:none;background:var(--bg);color:var(--text);container:images-studio / inline-size}
        .stu.images-workspace h1{color:var(--text)}
        .stu.images-workspace .sub{color:var(--muted2);margin-bottom:24px}
        .stu.images-workspace .grid.creation-grid{width:100%;max-width:none;grid-template-columns:minmax(0,1fr) minmax(260px,320px);gap:24px}
        .stu.images-workspace .card{background:var(--card);border-color:var(--border);border-radius:var(--r-md,18px)}
        .stu.images-workspace .lab{color:var(--text2)}
        .stu.images-workspace .creation-input{padding:22px}
        .stu.images-workspace textarea{min-height:clamp(260px,32vh,400px);background:var(--card2);border-color:var(--border);color:var(--text);font-size:16px}
        .stu.images-workspace textarea::placeholder{color:var(--muted2);opacity:1}
        .stu.images-workspace .pill{background:var(--card2);border-color:var(--border);color:var(--text2);min-height:40px}
        .stu.images-workspace .pill:hover{border-color:var(--border2);color:var(--text)}
        .stu.images-workspace .pill.on{background:var(--indigo);border-color:var(--indigo);color:var(--on-accent,#fff)}
        .stu.images-workspace .cost{background:var(--accent-soft,var(--card));border-color:var(--border2);border-radius:var(--r-md,18px)}
        .stu.images-workspace .cost::before{display:none}
        .stu.images-workspace .cost .sum,.stu.images-workspace .cost .val b{color:var(--indigo)}
        .stu.images-workspace .cost .val span,.stu.images-workspace .gnote{color:var(--muted2)}
        .stu.images-workspace .go.ok{background:var(--indigo);color:var(--on-accent,#fff);box-shadow:none;border-radius:var(--r-sm,13px)}
        .stu.images-workspace .go.no{background:var(--card2);color:var(--muted);border:1px solid var(--border);border-radius:var(--r-sm,13px)}
        .stu.images-workspace .creation-results{border-color:var(--border);padding-top:24px}
        .stu.images-workspace .image-engine-picker{border:0;padding:0;margin:0 0 28px;min-width:0}
        .stu.images-workspace .image-engine-picker legend{padding:0;margin-bottom:12px}
        .stu.images-workspace .image-engines{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .stu.images-workspace .image-engine-option{position:relative;min-width:0;cursor:pointer}
        .stu.images-workspace .image-engine-choice{position:absolute;width:1px;height:1px;opacity:0}
        .stu.images-workspace .image-engine-card{display:flex;flex-direction:column;gap:10px;min-height:134px;height:100%;padding:15px;border:1px solid var(--border);border-radius:var(--r-sm,13px);background:var(--card);transition:border-color var(--dur-fast,150ms),background var(--dur-fast,150ms);text-align:start}
        .stu.images-workspace .image-engine-option:hover .image-engine-card{border-color:var(--border2);background:var(--card2)}
        .stu.images-workspace .image-engine-choice:checked+.image-engine-card{border-color:var(--indigo);background:var(--accent-soft,var(--card2));box-shadow:inset 0 0 0 1px var(--indigo)}
        .stu.images-workspace .image-engine-choice:focus-visible+.image-engine-card{outline:2px solid var(--indigo);outline-offset:3px}
        .stu.images-workspace .image-engine-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .stu.images-workspace .image-engine-icon{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:30px;height:30px;border:1px solid var(--border);border-radius:9px;background:var(--card2);color:var(--text);font-size:12px;font-weight:800}
        .stu.images-workspace .image-engine-check{display:grid;place-items:center;width:18px;height:18px;border:1px solid var(--border2);border-radius:50%;color:transparent;font-size:11px}
        .stu.images-workspace .image-engine-choice:checked+.image-engine-card .image-engine-check{border-color:var(--indigo);background:var(--indigo);color:var(--on-accent,#fff)}
        .stu.images-workspace .image-engine-name{font-size:13px;font-weight:700;line-height:1.4;color:var(--text);overflow-wrap:anywhere}
        .stu.images-workspace .image-engine-desc{font-size:11px;line-height:1.45;color:var(--muted2);overflow-wrap:anywhere}
        @container images-studio (min-width:1150px){.stu.images-workspace .image-engines{grid-template-columns:repeat(6,minmax(0,1fr))}}
        @container images-studio (max-width:700px){.stu.images-workspace .grid.creation-grid{grid-template-columns:minmax(0,1fr)}.stu.images-workspace .creation-input{padding:16px}}
        @container images-studio (max-width:550px){.stu.images-workspace .image-engines{grid-template-columns:repeat(2,minmax(0,1fr))}.stu.images-workspace .image-engine-card{padding:12px;min-height:126px;gap:8px}}
        .stu.images-workspace .image-ref{margin-top:14px;padding:14px;border:1px solid var(--border);border-radius:var(--r-sm,13px);background:var(--card2)}
        .stu.images-workspace .image-ref-head{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--text)}
        .stu.images-workspace .image-ref-help,.stu.images-workspace .image-ref-limits{margin:6px 0 0;font-size:12px;line-height:1.45;color:var(--muted2)}
        .stu.images-workspace .image-ref-consent{display:flex;align-items:flex-start;gap:8px;margin-top:10px;font-size:12.5px;line-height:1.45;color:var(--text2);cursor:pointer}
        .stu.images-workspace .image-ref-consent input{margin-top:2px;accent-color:var(--indigo);flex-shrink:0}
        .stu.images-workspace .image-ref-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}
        .stu.images-workspace .image-ref-thumb{position:relative;width:64px;height:64px;border-radius:10px;overflow:hidden;border:1px solid var(--border2);background:var(--card)}
        .stu.images-workspace .image-ref-thumb img{width:100%;height:100%;object-fit:cover;display:block}
        .stu.images-workspace .image-ref-thumb.busy img{opacity:.45}
        .stu.images-workspace .image-ref-x{position:absolute;top:3px;inset-inline-end:3px;width:22px;height:22px;border-radius:50%;border:0;background:rgba(0,0,0,.65);color:#fff;font-size:13px;line-height:22px;padding:0;cursor:pointer}
        .stu.images-workspace .image-ref-add{cursor:pointer}
        .stu.images-workspace .image-ref-add.off{opacity:.5;cursor:not-allowed}
        .stu.images-workspace .image-ref-off{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted2)}
        @media(max-width:900px){.stu.images-workspace .grid.creation-grid{grid-template-columns:minmax(0,1fr);gap:18px}.stu.images-workspace .creation-input textarea{min-height:230px}}
      `}</style>

      <h1><UiLabel>Images</UiLabel></h1>
      <p className="sub"><UiLabel>Type it. See it. Six image engines, one screen.</UiLabel></p>

      <fieldset className="image-engine-picker">
        <legend className="lab"><span className="n">1</span><UiLabel>Engine</UiLabel></legend>
        <p className="image-reference-note"><UiLabel>References from your own generated images.</UiLabel></p>
        <div className="image-engines">
          {IMG_ENGINES.map((engine) => (
            <div key={engine.key} className="image-engine-option">
            <label>
              <input className="image-engine-choice" type="radio" name="image-engine" value={engine.key}
                checked={model === engine.key} onChange={() => setModel(engine.key)} />
              <span className="image-engine-card">
                <span className="image-engine-top" aria-hidden="true">
                  <span className="image-engine-icon"><ControlIcon name="image" /></span>
                  <span className="image-engine-check">✓</span>
                </span>
                <span className="image-engine-name">{engine.name}</span>
                <span className="image-engine-desc"><UiLabel>{engine.desc}</UiLabel></span>
                <span className="image-engine-price">{engine.credits} / <UiLabel>image</UiLabel></span>
              </span>
            </label>
            {items.find(item => item.model === engine.key) ? <button type="button" className="engine-real-sample" aria-label={`${ui('Preview')}: ${engine.name}`} onClick={() => {
              const item = items.find(item => item.model === engine.key)!
              setSample({ src: item.upscaled ?? item.url, name: engine.name })
            }}><img src={items.find(item => item.model === engine.key)!.upscaled ?? items.find(item => item.model === engine.key)!.url} alt="" loading="lazy" decoding="async" /><span><ControlIcon name="expand" /><UiLabel>Your latest result</UiLabel></span></button>
              : <div className="engine-sample-empty"><ControlIcon name="image" /><UiLabel>No sample yet</UiLabel></div>}
            </div>
          ))}
        </div>
      </fieldset>

<div className="grid creation-grid">
<div className="card creation-input">
            <div className="lab"><span className="n">2</span><UiLabel>Your image</UiLabel></div>
            <textarea aria-label={ui('Your image')} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={7} maxLength={2000}
              placeholder="A lighthouse on a cliff at dusk, storm rolling in, cinematic light — or a YouTube thumbnail with the text “ABANDONED”." />
            {/* KINEO-NOITE2-2026-08-17 (#5) — chips de ideia matam a pagina em
                branco: um clique preenche o prompt. */}
            {!prompt.trim() && (
              <div className="row" style={{ marginTop: 10 }}>
                {[
                  'A lighthouse on a cliff at dusk, storm rolling in, cinematic light',
                  'YouTube thumbnail, shocked man pointing at a burning safe, bold text “HE VANISHED”',
                  'Macro shot of a chameleon eye, iridescent scales, studio lighting',
                ].map((s) => (
                  <button key={s} type="button" className="pill" style={{ fontSize: 11 }} onClick={() => setPrompt(s)}>
                    {s.slice(0, 38)}…
                  </button>
                ))}
              </div>
            )}
            {model === REF_MODEL ? (
              <div className="image-ref">
                <div className="image-ref-head"><ControlIcon name="image" /> <UiLabel>Reference photo (optional)</UiLabel></div>
                <p className="image-ref-help"><UiLabel>The face and look of the person in the photo go into the image.</UiLabel></p>
                <label className="image-ref-consent">
                  <input type="checkbox" checked={refConsent} onChange={(e) => setRefConsent(e.target.checked)} />
                  <span><UiLabel>I have permission from the person in the photo to use their image.</UiLabel></span>
                </label>
                <div className="row image-ref-row">
                  {refs.map((r) => (
                    <div key={r.key} className={`image-ref-thumb${r.uploading ? ' busy' : ''}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.preview} alt="" />
                      <button type="button" className="image-ref-x" aria-label={ui('Remove photo')} onClick={() => removeRefPhoto(r.key)}>×</button>
                    </div>
                  ))}
                  {refs.length < REF_MAX && (
                    <label className={`pill image-ref-add${refConsent ? '' : ' off'}`} aria-disabled={!refConsent}>
                      <input type="file" accept={REF_TYPES.join(',')} multiple hidden disabled={!refConsent}
                        onChange={(e) => { void addRefPhotos(e.target.files); e.target.value = '' }} />
                      + <UiLabel>Add photo</UiLabel>
                    </label>
                  )}
                </div>
                <p className="image-ref-limits"><UiLabel>{refConsent ? 'Up to 3 photos · JPG, PNG or WEBP · max 10 MB each' : 'Check the box above to add a photo.'}</UiLabel></p>
              </div>
            ) : (
              <div className="image-ref image-ref-off">
                <span><UiLabel>Reference photo · Available on Nano Banana Pro</UiLabel></span>
                <button type="button" className="pill" onClick={() => setModel(REF_MODEL)}><UiLabel>Use Nano Banana Pro</UiLabel></button>
              </div>
            )}
            {showTopup && <CreditsTopupModal surface="images_402" onClose={() => setShowTopup(false)} />}
            {showPlans && (
              <OutOfCreditsPlansModal
                product="images"
                unitCost={unitCost}
                credits={balance}
                plan={plan}
                madeThisSession={madeThisSession}
                onClose={() => setShowPlans(false)}
              />
            )}
            {error && (
              <p role="alert" style={{ marginTop: 10, padding: '9px 12px', borderRadius: 10, background: 'rgba(255,107,107,.08)', border: '1px solid rgba(255,107,107,.35)', color: 'var(--text)', fontSize: 12.5 }}>
                ⚠️ {error}
                {/* KINEO-AUDIT-401-2026-08-18: 401 vira porta, nao beco */}
                {error.toLowerCase().includes('credits') && (
                  <> <button type="button" onClick={openCreditsWall} style={{ color: 'var(--indigo)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><UiLabel>Add credits →</UiLabel></button></>
                )}
                {error.toLowerCase().includes('signed in') && (
                  <> <a href="/login?redirect=/images" style={{ color: 'var(--indigo)', fontWeight: 700 }}><UiLabel>Sign in →</UiLabel></a></>
                )}
              </p>
            )}
          </div>
<div className="rail creation-settings">
          <div className="card">
            <div className="lab"><span className="n">3</span><UiLabel>Format</UiLabel></div>
            <div className="row">
              {SIZES.map((s) => (
                <button key={s.key} type="button" className={`pill${size === s.key ? ' on' : ''}`} onClick={() => setSize(s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cost" id="image-generation-review" tabIndex={-1}>
            <div className="sum">{eng.name} · {SIZES.find((s) => s.key === size)?.label}{sendRefs ? ` · 📷 ${readyRefs.length}` : ''}</div>
            <div className="val"><span><UiLabel>Cost per image</UiLabel></span><b>{eng.credits}</b></div>
            <button type="button" onClick={generate} disabled={!canGenerate} className={`go ${canGenerate ? 'ok' : 'no'}`}>
              <UiLabel>{busy ? 'Creating…' : refsUploading ? 'Uploading photo…' : needsConsent ? 'Confirm permission for the photo first' : prompt.trim() ? 'Generate image →' : 'Describe your image first'}</UiLabel>
            </button>
            <details className="refine-details"><summary><UiLabel>Enhancement options</UiLabel></summary><div className="gnote"><UiLabel>Upscale any result to 2x for 1 credit.</UiLabel></div></details>
          </div>
        </div>
<div className="creation-results">
{galleryFailed && (
            <div role="alert" className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', border: '1px solid rgba(251,191,36,.35)', background: 'rgba(251,191,36,.06)' }}>
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700 }}><UiLabel>We couldn’t load your images right now.</UiLabel></span>
              <span style={{ fontSize: 12.5, color: 'var(--muted2)' }}><UiLabel>Your images and credits are safe — this is just a temporary read hiccup.</UiLabel></span>
              <button type="button" className="pill" onClick={loadGallery}><UiLabel>↻ Try again</UiLabel></button>
            </div>
          )}
{galleryLoading && !galleryFailed && items.length === 0 && (
            <div aria-label="Loading your images" aria-busy="true">
              <style>{`@keyframes imgsk{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
              <div className="lab"><UiLabel>My Images</UiLabel></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ aspectRatio: '3/4', borderRadius: 12, border: '1px solid var(--border)', background: 'linear-gradient(100deg, var(--card) 40%, var(--card2) 50%, var(--card) 60%)', backgroundSize: '200% 100%', animation: 'imgsk 1.4s linear infinite', animationDelay: `${(i % 3) * 120}ms` }} />
                ))}
              </div>
            </div>
          )}
{items.length > 0 && (
            <div>
              <div className="lab"><UiLabel>My Images</UiLabel></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                {items.map((it, i) => (
                  <div key={it.url} className="card" style={{ padding: 10 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <button type="button" className="image-result-open" aria-label={ui('Preview')} onClick={() => setSample({ src: it.upscaled ?? it.url, name: IMG_ENGINES.find(engine => engine.key === it.model)?.name ?? it.model })}><img src={it.upscaled ?? it.url} alt="" loading="lazy" decoding="async" style={{ width: '100%', borderRadius: 10, display: 'block' }} /></button>
                    <div className="row" style={{ marginTop: 9 }}>
                      <button type="button" className="pill" onClick={() => downloadImage(it.upscaled ?? it.url, i)}><ControlIcon name="download" /> <UiLabel>Download</UiLabel></button>
                      {/* KINEO-CEO-HOUR-2026-08-17 (#4) — flywheel: imagem → filme */}
                      {/* KINEO-FLUXO-NOVO-2026-09-25 — "Turn into video" LEVA esta imagem ao Animate pelo
                          id da linha em `images` (nunca a URL do storage, que tem o uid no caminho); o
                          Animate resolve o id em /api/images e a imagem já chega como referência. É um
                          clipe, não um filme — a copy não promete filme nem digita crédito. Sem id (a
                          cópia para o nosso storage falhou e a URL é do fal) fica o link genérico. */}
                      {it.id ? (
                        <a className="pill" style={{ textDecoration: 'none' }} href={`/animate?from_image=${encodeURIComponent(it.id)}`}
                          onClick={() => { void trackEvent('image_to_video_clicked', { image_id: it.id, model: it.model, upscaled: !!it.upscaled }) }}><ControlIcon name="film" /> <UiLabel>Turn into video</UiLabel></a>
                      ) : (
                        <a className="pill" style={{ textDecoration: 'none' }} href="/animate"><ControlIcon name="film" /> <UiLabel>Animate</UiLabel></a>
                      )}
                    </div>
                    <details className="refine-details"><summary><UiLabel>Enhancement options</UiLabel></summary>
                    <div className="row">
                      <button type="button" className={`pill${it.upscaled ? ' on' : ''}`} disabled={!!it.upscaled || it.upscaling} onClick={() => upscale(i)}>
                        {it.upscaled ? '2x ✓' : it.upscaling ? 'Upscaling…' : ui('Upscale 2x · 1 cr')}
                      </button>
                      <button type="button" className={`pill${editIdx === i ? ' on' : ''}`} onClick={() => { setEditIdx(editIdx === i ? null : i); setEditTxt('') }}><ControlIcon name="edit" /> <UiLabel>Edit · 3 cr</UiLabel></button>
                    </div>
                    {editIdx === i && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <input
                          value={editTxt}
                          onChange={(e) => setEditTxt(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') applyEdit(i) }}
                          placeholder="make it sunset · teal palette · remove text…"
                          style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 9, background: 'var(--card2)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 16 }}
                        />
                        <button type="button" className="pill on" disabled={editBusy || !editTxt.trim()} onClick={() => applyEdit(i)}>
                          {editBusy ? '…' : 'Go'}
                        </button>
                      </div>
                    )}
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}
</div>
</div>
      <MobileCreationShortcut targetId="image-generation-review" cost={`${eng.name} · ${eng.credits}`} />
      {sample && <ImageResultPreview {...sample} onClose={() => setSample(null)} />}
    </div>
  )
}
