'use client'

// KINEO-STUDIO-V4-2026-08-16 — [STAGE] Generation numa tela só (spec do fundador).
// KINEO-STUDIO-POLISH-2026-08-17 — passe de design pedido pelo fundador
// ("intuitividade + harmonia, mais gostoso de mexer, melhorar as fontes"):
//   · inline-styles → classes CSS reais (hover/focus/transições vivas)
//   · controles agrupados em CARDS numerados (1 Engine · 2 Format · 3 Image
//     · 4 Idea · 5 Camera) — o olho segue o fluxo sem pensar
//   · escala tipográfica única (títulos -.02em, labels 10.5 caps, corpo 13.5)
//   · "fase 2" vira chip SOON (copy do cliente 100% inglês; explicação
//     interna fica no title/tooltip)
//   · pills com estado selecionado em glow, hover com lift de 1px
//   · resumo vivo no card de custo: motor · duração · resolução · aspecto
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type EngineKey = 'fast' | 'seedance' | 'kling' | 'veo' | 'hollywood'

const ENGINES: {
  key: EngineKey
  name: string
  tag?: string
  desc: string
  res: string
  clip: string
  credits: string
  supportsRef: boolean
  supports1080: 'yes' | 'always' | 'fase2'
}[] = [
  { key: 'fast', name: 'Kineo 1', desc: 'Kineo’s own engine — stock + captions', res: '1080p', clip: '35–60s direct', credits: 'Free', supportsRef: false, supports1080: 'always' },
  { key: 'seedance', name: 'Seedance 1.5', tag: 'Popular', desc: 'The workhorse AI video engine', res: '1080p', clip: '4–12s/clip', credits: '20 cr', supportsRef: false, supports1080: 'always' },
  { key: 'kling', name: 'Kling 2.5', tag: 'Studio', desc: 'Cinematic motion and camera work', res: 'HD native', clip: '5–10s/clip', credits: '50 cr', supportsRef: false, supports1080: 'always' },
  { key: 'veo', name: 'Veo 3.1', tag: 'Studio', desc: 'Google’s flagship cinematic engine', res: '1080p', clip: '4–8s/clip', credits: '90 cr', supportsRef: false, supports1080: 'always' },
  { key: 'hollywood', name: 'Kling 3', tag: 'Studio', desc: 'Film scenes, native voice & lip sync', res: '1080p native', clip: '3–15s/clip', credits: '150 cr', supportsRef: true, supports1080: 'always' },
]

const CAMERA_PRESETS: { key: string; label: string; emoji: string; prompt: string }[] = [
  { key: 'dolly', label: 'Slow Dolly-In', emoji: '🎥', prompt: 'slow cinematic dolly-in toward the subject' },
  { key: 'crash', label: 'Crash Zoom', emoji: '⚡', prompt: 'sudden dramatic crash zoom onto the focal point' },
  { key: 'orbit', label: 'Orbit', emoji: '🌀', prompt: 'smooth 180-degree orbital camera move around the subject' },
  { key: 'fpv', label: 'FPV Drone', emoji: '🚁', prompt: 'fast FPV drone fly-through shot' },
  { key: 'crane', label: 'Crane Up', emoji: '🏗️', prompt: 'majestic crane shot rising to reveal the scene' },
  { key: 'handheld', label: 'Handheld', emoji: '🎬', prompt: 'gritty handheld documentary camera with subtle shake' },
  { key: 'macro', label: 'Macro Detail', emoji: '🔬', prompt: 'extreme macro close-up with shallow depth of field' },
  { key: 'static', label: 'Locked Tripod', emoji: '🗿', prompt: 'perfectly static tripod shot, movement inside the frame' },
]

const CSS = `
.stu{min-height:100vh;background:radial-gradient(110% 60% at 50% -8%,rgba(41,151,255,.10),transparent 55%),radial-gradient(70% 50% at 100% 100%,rgba(41,151,255,.05),transparent 60%),#0a0a0c;color:#fafafa;padding:26px 34px 60px;font-family:var(--font-inter),'Inter',sans-serif}
.stu *{box-sizing:border-box}
.stu .stage{display:flex;align-items:center;gap:10px;margin-bottom:20px}
.stu .stage b{font-size:10px;font-weight:900;letter-spacing:.18em;padding:4px 10px;border-radius:999px;background:rgba(255,180,40,.14);border:1px solid rgba(255,180,40,.5);color:#ffb428}
.stu .stage i{font-style:normal;font-size:12px;color:rgba(255,255,255,.45)}
.stu h1{font-size:34px;font-weight:700;letter-spacing:-.02em;margin:0 0 4px;font-family:var(--font-display),var(--font-inter),sans-serif;background:linear-gradient(92deg,#fff 30%,#7cc0ff 85%);-webkit-background-clip:text;background-clip:text;color:transparent;width:fit-content}
.stu .sub{color:rgba(255,255,255,.52);font-size:14px;margin:0 0 26px}
.stu .grid{display:grid;grid-template-columns:352px 1fr;gap:22px;align-items:start}
@media(max-width:900px){.stu .grid{grid-template-columns:1fr}}
.stu .rail{position:sticky;top:20px;display:flex;flex-direction:column;gap:14px}
.stu .card{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:15px 16px;transition:border-color .18s ease}
.stu .card:hover{border-color:rgba(255,255,255,.16)}
.stu .lab{display:flex;align-items:center;gap:8px;font-size:10.5px;color:rgba(255,255,255,.55);font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px;font-family:var(--font-display),var(--font-inter),sans-serif}
.stu .lab .n{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:6px;background:linear-gradient(140deg,#2997ff,#1668c7);color:#fff;font-size:10px;font-weight:900;box-shadow:0 2px 8px rgba(41,151,255,.4)}
.stu .row{display:flex;gap:8px;flex-wrap:wrap}
.stu .pill{padding:9px 14px;border-radius:999px;font-size:13px;font-weight:700;font-family:var(--font-display),var(--font-inter),sans-serif;cursor:pointer;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.72);transition:all .16s ease;position:relative}
.stu .pill:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.28);color:#fff}
.stu .pill.on{background:linear-gradient(140deg,#2997ff,#1a72d8);border-color:rgba(120,190,255,.9);color:#fff;box-shadow:0 4px 18px rgba(41,151,255,.4),inset 0 1px 0 rgba(255,255,255,.25)}
.stu .pill.off{opacity:.42;cursor:not-allowed}
.stu .pill.off:hover{transform:none;border-color:rgba(255,255,255,.12);color:rgba(255,255,255,.72)}
.stu .soon{font-size:8.5px;font-weight:900;letter-spacing:.08em;margin-left:6px;padding:1.5px 5px;border-radius:99px;background:rgba(255,180,40,.16);color:#ffb428;vertical-align:1px}
.stu .hint{font-size:11.5px;color:rgba(255,255,255,.42);margin-top:8px;line-height:1.45}
.stu .mdlbtn{width:100%;text-align:left;padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.12);cursor:pointer;color:#fff;transition:border-color .18s ease}
.stu .mdlbtn:hover{border-color:rgba(41,151,255,.5)}
.stu .mdlname{display:flex;align-items:center;justify-content:space-between;margin-top:5px}
.stu .mdlname b{font-size:17px;font-weight:700;letter-spacing:-.01em;font-family:var(--font-display),var(--font-inter),sans-serif}
.stu .mdlname i{font-style:normal;font-size:12px;color:#5cb3ff}
.stu .picker{position:absolute;z-index:40;top:104%;left:0;right:0;background:#131318;border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:6px;box-shadow:0 24px 60px rgba(0,0,0,.65)}
.stu .pk{width:100%;text-align:left;padding:11px 12px;border-radius:11px;background:transparent;border:1px solid transparent;cursor:pointer;color:#fff;transition:all .14s ease}
.stu .pk:hover{background:rgba(255,255,255,.05)}
.stu .pk.on{background:rgba(41,151,255,.12);border-color:rgba(41,151,255,.35);box-shadow:inset 3px 0 0 #2997ff}
.stu .pk .t{display:flex;justify-content:space-between;align-items:center}
.stu .pk .t b{font-weight:700;font-size:14px}
.stu .pk .t i{font-style:normal;font-size:11.5px;color:rgba(255,255,255,.55);font-weight:700}
.stu .pk .d{font-size:11px;color:rgba(255,255,255,.45);margin-top:3px}
.stu .tag{font-size:9px;font-weight:800;color:#5cb3ff;border:1px solid rgba(41,151,255,.4);border-radius:999px;padding:2px 7px;margin-left:6px;vertical-align:1px}
.stu .upl{width:100%;padding:16px 14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.22);font-size:13px;transition:all .16s ease}
.stu .upl.ok{cursor:pointer;color:rgba(255,255,255,.78)}
.stu .upl.ok:hover{border-color:rgba(41,151,255,.6);background:rgba(41,151,255,.05)}
.stu .upl.no{cursor:not-allowed;color:rgba(255,255,255,.35)}
.stu .cost{padding:17px 16px;border-radius:18px;background:linear-gradient(160deg,#0d1e3c,#0a0f1c);border:1px solid rgba(41,151,255,.4);position:relative;overflow:hidden}
.stu .cost::before{content:'';position:absolute;top:0;left:8%;right:8%;height:1px;background:linear-gradient(90deg,transparent,rgba(124,192,255,.7),transparent)}
.stu .cost .sum{font-size:12.5px;color:#8fc6ff;margin-bottom:5px;font-weight:600}
.stu .cost .val{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px}
.stu .cost .val span{font-size:13px;color:rgba(255,255,255,.6)}
.stu .cost .val b{color:#5cb3ff;font-weight:800;font-size:15px}
.stu .go{width:100%;padding:15px 0;border-radius:999px;font-size:15px;font-weight:800;border:none;transition:all .18s ease}
.stu .go.ok{background:linear-gradient(140deg,#3aa0ff,#1a72d8);color:#fff;cursor:pointer;box-shadow:0 8px 26px rgba(41,151,255,.4);font-family:var(--font-display),var(--font-inter),sans-serif;letter-spacing:.01em}
.stu .go.ok:hover{transform:translateY(-1px);box-shadow:0 12px 36px rgba(41,151,255,.55)}
.stu .go.no{background:rgba(255,255,255,.16);color:rgba(255,255,255,.5);cursor:not-allowed}
.stu .gnote{font-size:10.5px;color:rgba(255,255,255,.4);margin-top:9px;text-align:center}
.stu textarea{width:100%;resize:vertical;padding:17px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:#fff;font-size:15px;line-height:1.55;outline:none;font-family:inherit;transition:border-color .18s ease}
.stu textarea{caret-color:#2997ff}
.stu textarea::selection{background:rgba(41,151,255,.35)}
.stu textarea:focus{border-color:rgba(41,151,255,.55);box-shadow:0 0 0 3px rgba(41,151,255,.12)}
.stu .cnt{font-size:11px;color:rgba(255,255,255,.35);text-align:right;margin-top:5px}
.stu .cams{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
@media(max-width:700px){.stu .cams{grid-template-columns:repeat(2,1fr)}}
.stu .cam{padding:14px 10px;border-radius:14px;text-align:center;cursor:pointer;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);color:#fff;transition:all .16s ease}
.stu .cam:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.3)}
.stu .cam.on{background:rgba(41,151,255,.14);border-color:rgba(41,151,255,.65);box-shadow:0 6px 22px rgba(41,151,255,.22)}
.stu .cam .e{font-size:21px}
.stu .cam .l{font-size:12px;font-weight:700;margin-top:5px;letter-spacing:-.01em;font-family:var(--font-display),var(--font-inter),sans-serif}
.stu .camline{margin-top:10px;font-size:12.5px;color:#5cb3ff;background:rgba(41,151,255,.08);border:1px solid rgba(41,151,255,.25);border-radius:10px;padding:8px 12px}
.stu .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:4px}
@media(max-width:700px){.stu .steps{grid-template-columns:1fr}}
.stu .step{padding:16px;border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-top:2px solid rgba(41,151,255,.45)}
.stu .step b{display:block;font-size:11px;font-weight:800;letter-spacing:.1em;color:#5cb3ff;margin-bottom:6px}
.stu .step p{margin:0;font-size:13px;color:rgba(255,255,255,.65);line-height:1.5}
`

export default function StudioClient() {
  const router = useRouter()
  const [engine, setEngine] = useState<EngineKey>('seedance')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [duration, setDuration] = useState<15 | 45 | 60>(60)
  const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16')
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p')
  const [preset, setPreset] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [refName, setRefName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const eng = useMemo(() => ENGINES.find((e) => e.key === engine)!, [engine])

  const finalPrompt = useMemo(() => {
    const p = CAMERA_PRESETS.find((c) => c.key === preset)
    return p && prompt.trim() ? `${prompt.trim()}\n\n[camera: ${p.prompt}]` : prompt.trim()
  }, [prompt, preset])

  const generate = () => {
    const q = new URLSearchParams({ engine, prompt: finalPrompt, intent_campaign: 'studio_v4' })
    router.push(`/generate?${q.toString()}`)
  }

  return (
    <div className="stu">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="stage">
        <b>STAGE · AGUARDANDO APROVAÇÃO DO FUNDADOR</b>
        <i>Nada disto está em produção.</i>
      </div>

      <h1>Studio</h1>
      <p className="sub">Every control on one screen. Pick, type, generate.</p>

      <div className="grid">
        {/* ===== RAIL ESQUERDO — controles em cards numerados ===== */}
        <div className="rail">
          {/* 1 · Engine */}
          <div style={{ position: 'relative' }}>
            <button type="button" className="mdlbtn" onClick={() => setPickerOpen((o) => !o)}>
              <span className="lab" style={{ marginBottom: 0 }}><span className="n">1</span>Engine</span>
              <span className="mdlname">
                <b>{eng.name}</b>
                <i>{eng.res} · {eng.clip} ▾</i>
              </span>
            </button>
            {pickerOpen && (
              <div className="picker">
                {ENGINES.map((e) => (
                  <button key={e.key} type="button" className={`pk${e.key === engine ? ' on' : ''}`}
                    onClick={() => { setEngine(e.key); setPickerOpen(false) }}>
                    <span className="t">
                      <b>{e.name}{e.tag && <span className="tag">{e.tag}</span>}</b>
                      <i>{e.credits}</i>
                    </span>
                    <span className="d">{e.res} · {e.clip} — {e.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2 · Format — duração + aspecto + resolução num card só */}
          <div className="card">
            <div className="lab"><span className="n">2</span>Format</div>
            <div className="row" style={{ marginBottom: 12 }}>
              <button type="button" className="pill off" title="Fase 2 — precisa do backend de 2 cenas afiado antes de ligar">15s<span className="soon">SOON</span></button>
              <button type="button" className={`pill${duration === 45 ? ' on' : ''}`} onClick={() => setDuration(45)}>45s</button>
              <button type="button" className={`pill${duration === 60 ? ' on' : ''}`} onClick={() => setDuration(60)}>60s ⭐</button>
            </div>
            <div className="row" style={{ marginBottom: 12 }}>
              <button type="button" className={`pill${aspect === '9:16' ? ' on' : ''}`} onClick={() => setAspect('9:16')}>9:16 · Shorts</button>
              <button type="button" className="pill off" title="Fase 2 — falta o template horizontal de legendas no compose">16:9<span className="soon">SOON</span></button>
            </div>
            <div className="row">
              <button type="button" className="pill off" title="Todos os motores já saem em Full HD — 720p não é mais necessário">720p</button>
              <button type="button" className={`pill${resolution === '1080p' ? ' on' : ''}`} onClick={() => setResolution('1080p')}>1080p Full HD</button>
            </div>
            <div className="hint">{eng.name} renders in Full HD at no extra cost.</div>
          </div>

          {/* 3 · Reference image */}
          <div className="card">
            <div className="lab"><span className="n">3</span>Reference image <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>optional</span></div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(ev) => setRefName(ev.target.files?.[0]?.name ?? null)} />
            <button type="button" disabled={!eng.supportsRef} onClick={() => fileRef.current?.click()}
              className={`upl ${eng.supportsRef ? 'ok' : 'no'}`}>
              {refName ? `🖼️ ${refName} — anchors scene 1` : eng.supportsRef ? '🖼️ Upload an image — your video starts from it' : `🖼️ Available on Kling 3`}
            </button>
          </div>

          {/* Custo + Generate */}
          <div className="cost">
            <div className="sum">{eng.name} · {duration}s · {resolution} · {aspect}{preset ? ` · ${CAMERA_PRESETS.find((c) => c.key === preset)?.label}` : ''}</div>
            <div className="val"><span>Estimated cost</span><b>{eng.credits}</b></div>
            <button type="button" onClick={generate} disabled={!prompt.trim()} className={`go ${prompt.trim() ? 'ok' : 'no'}`}>
              {prompt.trim() ? 'Generate →' : 'Type your idea first'}
            </button>
            <div className="gnote">v1: entrega no fluxo comprovado · fase 2 roda aqui dentro</div>
          </div>
        </div>

        {/* ===== DIREITA — ideia + câmera ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="lab"><span className="n">4</span>Your idea</div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={7}
              placeholder="What’s your video about? One idea in — a finished film out: voiced, scored and captioned." />
            <div className="cnt">{prompt.trim() ? `${prompt.trim().split(/\s+/).length} words` : 'a single line is enough'}</div>
          </div>

          <div>
            <div className="lab"><span className="n">5</span>Camera preset <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>optional — a pre-tested move added to your prompt</span></div>
            <div className="cams">
              {CAMERA_PRESETS.map((c) => (
                <button key={c.key} type="button" className={`cam${preset === c.key ? ' on' : ''}`}
                  onClick={() => setPreset(preset === c.key ? null : c.key)}>
                  <div className="e">{c.emoji}</div>
                  <div className="l">{c.label}</div>
                </button>
              ))}
            </div>
            {preset && (
              <div className="camline">camera: {CAMERA_PRESETS.find((c) => c.key === preset)?.prompt}</div>
            )}
          </div>

          <div className="steps">
            {[
              ['1 · CONFIGURE', 'Engine, length, resolution and camera — all on this screen.'],
              ['2 · TYPE', 'One idea. Kineo writes the script and directs every scene.'],
              ['3 · GET YOUR FILM', 'Voice, karaoke captions and score included. Download and post.'],
            ].map(([t, d]) => (
              <div key={t} className="step"><b>{t}</b><p>{d}</p></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
