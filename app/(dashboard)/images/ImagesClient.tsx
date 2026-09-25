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
import { IMG_ENGINES, type ImgModelKey } from '@/lib/imageModels'

type ImgSize = 'square_hd' | 'portrait_16_9' | 'landscape_16_9'

const SIZES: { key: ImgSize; label: string }[] = [
  { key: 'portrait_16_9', label: '▯ 9:16 · Vertical' },
  { key: 'square_hd', label: '□ 1:1 · Square' },
  { key: 'landscape_16_9', label: '▭ 16:9 · Wide' },
]

type Item = { id?: string | null; url: string; model: ImgModelKey | string; upscaled?: string | null; upscaling?: boolean }

export default function ImagesClient() {
  const ui = useUiCopy()
  const [model, setModel] = useState<ImgModelKey>('dev')
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
        @media(max-width:900px){.stu.images-workspace .grid.creation-grid{grid-template-columns:minmax(0,1fr);gap:18px}.stu.images-workspace .creation-input textarea{min-height:230px}}
      `}</style>

      <h1><UiLabel>Images</UiLabel></h1>
      <p className="sub"><UiLabel>Type it. See it. Six image engines, one screen.</UiLabel></p>

      <fieldset className="image-engine-picker">
        <legend className="lab"><span className="n">1</span><UiLabel>Engine</UiLabel></legend>
        <div className="image-engines">
          {IMG_ENGINES.map((engine) => (
            <label key={engine.key} className="image-engine-option">
              <input className="image-engine-choice" type="radio" name="image-engine" value={engine.key}
                checked={model === engine.key} onChange={() => setModel(engine.key)} />
              <span className="image-engine-card">
                <span className="image-engine-top" aria-hidden="true">
                  <span className="image-engine-icon">{engine.icon}</span>
                  <span className="image-engine-check">✓</span>
                </span>
                <span className="image-engine-name">{engine.name}</span>
                <span className="image-engine-desc"><UiLabel>{engine.desc}</UiLabel></span>
              </span>
            </label>
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

          <div className="cost">
            <div className="sum">{eng.name} · {SIZES.find((s) => s.key === size)?.label}</div>
            <div className="val"><span><UiLabel>Cost per image</UiLabel></span><b>{eng.credits}</b></div>
            <button type="button" onClick={generate} disabled={!prompt.trim() || busy} className={`go ${prompt.trim() && !busy ? 'ok' : 'no'}`}>
              <UiLabel>{busy ? 'Creating…' : prompt.trim() ? 'Generate image →' : 'Describe your image first'}</UiLabel>
            </button>
            <div className="gnote"><UiLabel>Upscale any result to 2x for 1 credit.</UiLabel></div>
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
                    <img src={it.upscaled ?? it.url} alt="" style={{ width: '100%', borderRadius: 10, display: 'block' }} />
                    <div className="row" style={{ marginTop: 9 }}>
                      <button type="button" className="pill" onClick={() => downloadImage(it.upscaled ?? it.url, i)}><UiLabel>⬇ Download</UiLabel></button>
                      <button type="button" className={`pill${it.upscaled ? ' on' : ''}`} disabled={!!it.upscaled || it.upscaling} onClick={() => upscale(i)}>
                        {it.upscaled ? '2x ✓' : it.upscaling ? 'Upscaling…' : '✨ Upscale 2x · 1 cr'}
                      </button>
                      {/* KINEO-CEO-HOUR-2026-08-17 (#4) — flywheel: imagem → filme */}
                      {/* KINEO-FLUXO-NOVO-2026-09-25 — "Turn into video" LEVA esta imagem ao Animate pelo
                          id da linha em `images` (nunca a URL do storage, que tem o uid no caminho); o
                          Animate resolve o id em /api/images e a imagem já chega como referência. É um
                          clipe, não um filme — a copy não promete filme nem digita crédito. Sem id (a
                          cópia para o nosso storage falhou e a URL é do fal) fica o link genérico. */}
                      {it.id ? (
                        <a className="pill" style={{ textDecoration: 'none' }} href={`/animate?from_image=${encodeURIComponent(it.id)}`}
                          onClick={() => { void trackEvent('image_to_video_clicked', { image_id: it.id, model: it.model, upscaled: !!it.upscaled }) }}><UiLabel>🎬 Turn into video</UiLabel></a>
                      ) : (
                        <a className="pill" style={{ textDecoration: 'none' }} href="/animate"><UiLabel>🎬 Animate</UiLabel></a>
                      )}
                      <button type="button" className={`pill${editIdx === i ? ' on' : ''}`} onClick={() => { setEditIdx(editIdx === i ? null : i); setEditTxt('') }}><UiLabel>✏️ Edit · 3 cr</UiLabel></button>
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
