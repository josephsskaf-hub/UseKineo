'use client'

// KINEO-IMAGES-2026-08-17 — [STAGE] Kineo Images: a aba de imagens estilo
// Higgsfield, vestida com o Studio Kit. Multi-motor (FLUX Schnell/Dev +
// Recraft V3 pra texto perfeito), aspecto, geracao em grade com Download e
// Upscale 2x por imagem. Aprovado pra stage; sobe pra prod no ok do fundador.
import { useEffect, useState } from 'react'
import { STUDIO_KIT_CSS } from '@/components/studioKit'

type ImgModelKey = 'schnell' | 'dev' | 'recraft' | 'nanobanana' | 'seedream' | 'grok'
type ImgSize = 'square_hd' | 'portrait_16_9' | 'landscape_16_9'

const IMG_ENGINES: { key: ImgModelKey; icon: string; name: string; tag?: string; desc: string; credits: string }[] = [
  { key: 'schnell', icon: 'F', name: 'FLUX Schnell', desc: 'Instant drafts — ~2 seconds', credits: '1 cr' },
  { key: 'dev', icon: 'F+', name: 'FLUX Dev', tag: 'Popular', desc: 'Sharp, detailed, photorealistic', credits: '2 cr' },
  { key: 'seedream', icon: 'S', name: 'Seedream 5.0 Pro', desc: 'Deep prompt understanding, native text', credits: '3 cr' },
  { key: 'grok', icon: '𝕏', name: 'Grok Imagine 2.0', tag: 'New', desc: 'Highly aesthetic images by xAI', credits: '3 cr' },
  { key: 'recraft', icon: 'R', name: 'Recraft V3', tag: 'Studio', desc: 'Perfect text rendering (thumbnails!)', credits: '4 cr' },
  { key: 'nanobanana', icon: '🍌', name: 'Nano Banana Pro', tag: 'Studio', desc: 'Google’s best 4K image model', credits: '5 cr' },
]

const SIZES: { key: ImgSize; label: string }[] = [
  { key: 'portrait_16_9', label: '▯ 9:16 · Vertical' },
  { key: 'square_hd', label: '□ 1:1 · Square' },
  { key: 'landscape_16_9', label: '▭ 16:9 · Wide' },
]

type Item = { id?: string | null; url: string; model: ImgModelKey | string; upscaled?: string | null; upscaling?: boolean }

export default function ImagesClient() {
  const [model, setModel] = useState<ImgModelKey>('dev')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [size, setSize] = useState<ImgSize>('portrait_16_9')
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])

  // KINEO-IMAGES-PROD-2026-08-17 — o mega-menu Image aponta motores pra ca
  // (?engine=), igual ao padrao do Studio: chegada ja cai com o motor certo.
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('engine')
    if (e && IMG_ENGINES.some((x) => x.key === e)) setModel(e as ImgModelKey)
  }, [])

  // KINEO-IMAGES-STORE-2026-08-17 (fundador: "precisa ter o storage, obvio"):
  // as imagens agora persistem no nosso bucket + tabela `images` — a grade
  // virou "My Images" e sobrevive ao refresh.
  useEffect(() => {
    fetch('/api/images', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((d) => {
        if (Array.isArray(d?.images)) {
          setItems(d.images.map((r: { id: string; url: string; upscaled_url?: string | null; model?: string }) => ({
            id: r.id, url: r.url, model: (r.model ?? 'dev') as ImgModelKey, upscaled: r.upscaled_url ?? null,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const eng = IMG_ENGINES.find((e) => e.key === model)!

  async function generate() {
    if (!prompt.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), model, size }),
      })
      const data = await res.json()
      if (!res.ok || !data?.url) throw new Error(data?.error ?? 'Generation failed.')
      setItems((xs) => [{ id: (data.id as string | null) ?? null, url: data.url as string, model }, ...xs])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.')
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
      setError(e instanceof Error ? e.message : 'Upscale failed.')
      setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, upscaling: false } : x)))
    }
  }

  return (
    <div className="stu">
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />

      <h1>Images</h1>
      <p className="sub">Type it. See it. Six image engines, one screen.</p>

      <div className="grid">
        {/* rail esquerdo */}
        <div className="rail">
          <div style={{ position: 'relative' }}>
            <button type="button" className="mdlbtn" onClick={() => setPickerOpen((o) => !o)}>
              <span className="lab" style={{ marginBottom: 0 }}><span className="n">1</span>Engine</span>
              <span className="mdlname" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="eng-ic" aria-hidden="true">{eng.icon}</span>
                <b>{eng.name}</b>
                <i style={{ marginLeft: 'auto' }}>{eng.credits} ▾</i>
              </span>
            </button>
            {pickerOpen && (
              <div className="picker">
                {IMG_ENGINES.map((e) => (
                  <button key={e.key} type="button" className={`pk${e.key === model ? ' on' : ''}`}
                    onClick={() => { setModel(e.key); setPickerOpen(false) }}>
                    <span className="eng-ic" aria-hidden="true">{e.icon}</span>
                    <span className="pk-tx">
                      <span className="t">
                        <b>{e.name}{e.tag && <span className="tag">{e.tag}</span>}</b>
                        <i>{e.credits}</i>
                      </span>
                      <span className="d">{e.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="lab"><span className="n">2</span>Format</div>
            <div className="row">
              {SIZES.map((s) => (
                <button key={s.key} type="button" className={`pill${size === s.key ? ' on' : ''}`} onClick={() => setSize(s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cost">
            <div className="sum">{eng.name} · {SIZES.find((s) => s.key === size)?.label}</div>
            <div className="val"><span>Cost per image</span><b>{eng.credits}</b></div>
            <button type="button" onClick={generate} disabled={!prompt.trim() || busy} className={`go ${prompt.trim() && !busy ? 'ok' : 'no'}`}>
              {busy ? 'Creating…' : prompt.trim() ? 'Generate image →' : 'Describe your image first'}
            </button>
            <div className="gnote">Upscale any result to 2x for 1 credit.</div>
          </div>
        </div>

        {/* direita: prompt + resultados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="lab"><span className="n">3</span>Your image</div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
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
            {error && (
              <p role="alert" style={{ marginTop: 10, padding: '9px 12px', borderRadius: 10, background: 'rgba(255,107,107,.08)', border: '1px solid rgba(255,107,107,.35)', color: '#ffb4b4', fontSize: 12.5 }}>
                ⚠️ {error}
              </p>
            )}
          </div>

          {items.length > 0 && (
            <div>
              <div className="lab">My Images</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                {items.map((it, i) => (
                  <div key={it.url} className="card" style={{ padding: 10 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.upscaled ?? it.url} alt="" style={{ width: '100%', borderRadius: 10, display: 'block' }} />
                    <div className="row" style={{ marginTop: 9 }}>
                      <button type="button" className="pill" onClick={() => downloadImage(it.upscaled ?? it.url, i)}>⬇ Download</button>
                      <button type="button" className={`pill${it.upscaled ? ' on' : ''}`} disabled={!!it.upscaled || it.upscaling} onClick={() => upscale(i)}>
                        {it.upscaled ? '2x ✓' : it.upscaling ? 'Upscaling…' : '✨ Upscale 2x · 1 cr'}
                      </button>
                      {/* KINEO-CEO-HOUR-2026-08-17 (#4) — flywheel: imagem → filme */}
                      <a className="pill" style={{ textDecoration: 'none' }} href="/animate">🎬 Animate</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
