'use client'

// KINEO-STUDIO-V4-2026-08-16 — [STAGE] Generation numa tela só (pedido do
// fundador, prints do Higgsfield como referência):
//   1. 720p/1080p escolhível
//   2. duração 15/45/60 (15s marcado FASE 2 — precisa do backend afiado)
//   3. imagem de referência (ativa no Kling 3, que já tem i2v pronto)
//   4. aspecto 9:16 / 16:9 (16:9 FASE 2 — template de legendas horizontal)
//   5. seletor de motor com badges honestos: resolução nativa + faixa de
//      segundos POR CLIPE que o modelo gera (não é tempo de render)
//   6. presets de câmera — movimentos pré-testados que viram prompt validado
//
// v1 DE APROVAÇÃO: a tela configura tudo e entrega no fluxo de geração
// existente (comprovado). Itens FASE 2 ficam visíveis mas honestamente
// marcados. Aprovado o desenho → ligo o backend (1 dia) e o Generate roda
// aqui dentro.
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
  { key: 'fast', name: 'Kineo 1', desc: 'Kineo’s own engine — stock + captions', res: '1080p', clip: '35–60s direto', credits: 'Free · watermark', supportsRef: false, supports1080: 'always' },
  { key: 'seedance', name: 'Seedance 1.5', tag: 'Popular', desc: 'The workhorse AI video engine', res: '720p · 1080p', clip: '4–15s/clipe', credits: '20 cr', supportsRef: false, supports1080: 'fase2' },
  { key: 'kling', name: 'Kling 2.5', tag: 'Studio', desc: 'Cinematic motion and camera work', res: 'HD nativo', clip: '5–10s/clipe', credits: '50 cr', supportsRef: false, supports1080: 'always' },
  { key: 'veo', name: 'Veo 3.1', tag: 'Studio', desc: 'Google’s flagship cinematic engine', res: '1080p ✓', clip: '4–8s/clipe', credits: '90 cr', supportsRef: false, supports1080: 'always' },
  { key: 'hollywood', name: 'Kling 3', tag: 'Studio', desc: 'Film scenes, native voice & lip sync', res: '1080p nativo', clip: '3–15s/clipe', credits: '150 cr', supportsRef: true, supports1080: 'always' },
]

// #6 — presets de câmera: strings CURADAS que apendam ao prompt. O cliente
// clica no movimento em vez de torcer pra câmera se mexer.
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

const pill = (active: boolean, disabled = false): React.CSSProperties => ({
  padding: '9px 14px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.45 : 1,
  background: active ? '#2997ff' : 'rgba(255,255,255,.05)',
  border: `1px solid ${active ? 'rgba(41,151,255,.8)' : 'rgba(255,255,255,.12)'}`,
  color: active ? '#fff' : 'rgba(255,255,255,.7)',
  transition: 'all .15s ease',
})

export default function StudioClient() {
  const router = useRouter()
  const [engine, setEngine] = useState<EngineKey>('seedance')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [duration, setDuration] = useState<15 | 45 | 60>(45)
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
    // v1 de aprovação: entrega no fluxo comprovado do /generate já configurado.
    // Fase 2 (pós-aprovação): a máquina roda aqui dentro com os params novos.
    const q = new URLSearchParams({ engine, prompt: finalPrompt, intent_campaign: 'studio_v4' })
    router.push(`/generate?${q.toString()}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0c', color: '#fafafa', padding: '28px 32px' }}>
      {/* Faixa STAGE — inconfundível */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.18em', padding: '4px 10px', borderRadius: 999, background: 'rgba(255,180,40,.15)', border: '1px solid rgba(255,180,40,.5)', color: '#ffb428' }}>STAGE · AGUARDANDO APROVAÇÃO DO FUNDADOR</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Nada disto está em produção.</span>
      </div>

      <h1 style={{ fontSize: 30, fontWeight: 650, letterSpacing: '-.02em', marginBottom: 4 }}>Studio</h1>
      <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, marginBottom: 26 }}>Every control on one screen. Pick, type, generate.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 22, alignItems: 'start' }}>
        {/* ===== RAIL ESQUERDO — controles ===== */}
        <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Motor (#5 — badges honestos) */}
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => setPickerOpen((o) => !o)} style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer', color: '#fff' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Model</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{eng.name}</span>
                <span style={{ fontSize: 12, color: '#5cb3ff' }}>{eng.res} · {eng.clip} ▾</span>
              </div>
            </button>
            {pickerOpen && (
              <div style={{ position: 'absolute', zIndex: 40, top: '104%', left: 0, right: 0, background: '#131318', border: '1px solid rgba(255,255,255,.14)', borderRadius: 14, padding: 6, boxShadow: '0 24px 60px rgba(0,0,0,.6)' }}>
                {ENGINES.map((e) => (
                  <button key={e.key} type="button" onClick={() => { setEngine(e.key); setPickerOpen(false); if (e.supports1080 === 'fase2') setResolution('720p') }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, background: e.key === engine ? 'rgba(41,151,255,.12)' : 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{e.name} {e.tag && <span style={{ fontSize: 9, fontWeight: 800, color: '#5cb3ff', border: '1px solid rgba(41,151,255,.4)', borderRadius: 999, padding: '2px 7px', marginLeft: 6, verticalAlign: '1px' }}>{e.tag}</span>}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{e.credits}</span>
                    </div>
                    {/* badge = resolução de saída + faixa de segundos que o MODELO gera por clipe */}
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{e.res} · {e.clip} — {e.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Duração (#2) */}
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Duration</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={pill(duration === 15, true)} title="FASE 2 — precisa do backend de 2 cenas afiado antes de ligar">15s · fase 2</button>
              <button type="button" style={pill(duration === 45)} onClick={() => setDuration(45)}>45s ⭐</button>
              <button type="button" style={pill(duration === 60)} onClick={() => setDuration(60)}>60s</button>
            </div>
          </div>

          {/* Aspecto (#4) */}
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Aspect ratio</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={pill(aspect === '9:16')} onClick={() => setAspect('9:16')}>9:16 · Shorts</button>
              <button type="button" style={pill(aspect === '16:9', true)} title="FASE 2 — os motores já aceitam 16:9; falta o template horizontal de legendas no compose">16:9 · fase 2</button>
            </div>
          </div>

          {/* Resolução (#1) */}
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Resolution</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={pill(resolution === '720p', eng.supports1080 === 'always')} onClick={() => eng.supports1080 !== 'always' && setResolution('720p')}>720p</button>
              <button type="button" style={pill(resolution === '1080p', eng.supports1080 === 'fase2')} onClick={() => eng.supports1080 !== 'fase2' && setResolution('1080p')}
                title={eng.supports1080 === 'fase2' ? 'FASE 2 neste motor — custo 2x no fornecedor, créditos a definir com o fundador' : ''}>1080p</button>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>
              {eng.supports1080 === 'always' ? `${eng.name} já sai em Full HD — sem custo extra.` : '1080p no Seedance chega na fase 2 (+créditos, a aprovar).'}
            </div>
          </div>

          {/* Imagem de referência (#3) */}
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Reference image</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(ev) => setRefName(ev.target.files?.[0]?.name ?? null)} />
            <button type="button" disabled={!eng.supportsRef} onClick={() => fileRef.current?.click()}
              style={{ width: '100%', padding: '16px 14px', borderRadius: 14, background: 'rgba(255,255,255,.03)', border: '1px dashed rgba(255,255,255,.22)', color: eng.supportsRef ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.35)', cursor: eng.supportsRef ? 'pointer' : 'not-allowed', fontSize: 13 }}>
              {refName ? `🖼️ ${refName} — vira a âncora da cena 1` : eng.supportsRef ? '🖼️ Upload an image — the video starts from it' : `🖼️ ${eng.name} ainda não lê imagem — use Kling 3`}
            </button>
          </div>

          {/* Custo + Generate */}
          <div style={{ marginTop: 6, padding: 16, borderRadius: 16, background: 'linear-gradient(160deg,#0b1830,#0a0f1c)', border: '1px solid rgba(41,151,255,.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 10 }}>
              <span>Estimated cost</span>
              <span style={{ color: '#5cb3ff', fontWeight: 800 }}>{eng.credits}{duration === 60 ? ' · 60s' : ''}</span>
            </div>
            <button type="button" onClick={generate} disabled={!prompt.trim()}
              style={{ width: '100%', padding: '14px 0', borderRadius: 999, fontSize: 15, fontWeight: 800, background: prompt.trim() ? '#fff' : 'rgba(255,255,255,.25)', color: '#000', border: 'none', cursor: prompt.trim() ? 'pointer' : 'not-allowed' }}>
              Generate →
            </button>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.4)', marginTop: 8, textAlign: 'center' }}>v1: entrega no fluxo comprovado · fase 2 roda aqui dentro</div>
          </div>
        </div>

        {/* ===== DIREITA — prompt + presets ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Your idea</div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={7}
              placeholder={'What’s your video about? One idea in — a finished video out.'}
              style={{ width: '100%', resize: 'vertical', padding: 16, borderRadius: 16, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', color: '#fff', fontSize: 15, lineHeight: 1.5, outline: 'none' }} />
          </div>

          {/* #6 — presets de câmera */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Camera preset</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.4)' }}>movimento pré-testado — entra no prompt como instrução validada</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {CAMERA_PRESETS.map((c) => (
                <button key={c.key} type="button" onClick={() => setPreset(preset === c.key ? null : c.key)}
                  style={{ padding: '14px 10px', borderRadius: 14, textAlign: 'center', cursor: 'pointer', background: preset === c.key ? 'rgba(41,151,255,.15)' : 'rgba(255,255,255,.03)', border: `1px solid ${preset === c.key ? 'rgba(41,151,255,.65)' : 'rgba(255,255,255,.1)'}`, color: '#fff' }}>
                  <div style={{ fontSize: 20 }}>{c.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{c.label}</div>
                </button>
              ))}
            </div>
            {preset && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: '#5cb3ff', background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.25)', borderRadius: 10, padding: '8px 12px' }}>
                camera: {CAMERA_PRESETS.find((c) => c.key === preset)?.prompt}
              </div>
            )}
          </div>

          {/* Como funciona — 3 passos, estilo Higgsfield */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 6 }}>
            {[
              ['1 · CONFIGURE', 'Motor, duração, resolução, aspecto e câmera — tudo nesta tela.'],
              ['2 · TYPE', 'Uma ideia. O Kineo escreve o roteiro e dirige cada cena.'],
              ['3 · GET VIDEO', 'Voz, legendas e música prontos. Baixa e posta.'],
            ].map(([t, d]) => (
              <div key={t} style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: '#5cb3ff', marginBottom: 6 }}>{t}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', lineHeight: 1.5 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
