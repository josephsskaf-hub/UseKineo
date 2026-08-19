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
import { useEffect, useMemo, useRef, useState } from 'react'
import { STUDIO_KIT_CSS } from '@/components/studioKit'
import { useRouter } from 'next/navigation'
// KINEO-H3-2026-08-19 — custo por motor vem da fonte única, nunca de string.
import { creditCostFor } from '@/lib/credits/engineCost'

// KINEO-H3-2026-08-19 — 'h3' entra aqui. ⚠️ LIÇÃO: o motor foi adicionado ao
// seletor do /generate e NÃO apareceu para o fundador, porque a tela que ele
// usa é o /studio — que mantém a PRÓPRIA lista de motores. São dois seletores
// para a mesma decisão, e é o mesmo defeito estrutural do dia: a mesma verdade
// morando em dois lugares. Unificar os dois fica no backlog; hoje o conserto é
// o motor existir nos dois.
type EngineKey = 'fast' | 'seedance' | 'kling' | 'veo' | 'hollywood' | 'h3'

// KINEO-STUDIO-SPECS-2026-08-17 (fundador: 'so 1080p — as pessoas nao
// precisam saber a quantidade de clips'): a ficha tecnica interna
// (segundos por clipe) saiu da vitrine; todo entregavel final e 1080x1920
// (verificado por ffprobe), entao a spec visivel e uma so: 1080p.
const ENGINES: {
  key: EngineKey
  /** KINEO-NOITE2-2026-08-17 (#4) — clipe de 8s no hover do picker. */
  preview?: string
  icon: string
  name: string
  tag?: string
  desc: string
  res: string
  credits: string
  supportsRef: boolean
}[] = [
  // ⚠️ 'credits' saiu de string chumbada para creditCostFor(): o Kineo 1 dizia
  // "Free" e desde hoje custa 2 créditos para quem paga (dizer Free e cobrar 2
  // é cobrança-surpresa, a mesma classe de erro que passamos o dia caçando em
  // preço). Free continua vendo "Free" — para ele o custo É zero.
  { key: 'fast', icon: '⚡', name: 'Kineo 1', desc: 'Kineo’s own engine — stock + captions', res: '1080p', credits: `${creditCostFor('fast', true)} cr`, supportsRef: false },
  { key: 'seedance', preview: '/previews/75728dfb-3b29-47fa-aea8-b806d549a2b9.mp4', icon: 'S', name: 'Seedance 1.5', tag: 'Popular', desc: 'The workhorse AI video engine', res: '1080p', credits: `${creditCostFor('cinematic_ai', true)} cr`, supportsRef: false },
  { key: 'kling', preview: '/previews/c4e4fbab-0978-4daa-9fcf-119096370210.mp4', icon: 'K', name: 'Kling 2.5', tag: 'Studio', desc: 'Cinematic motion and camera work', res: '1080p', credits: `${creditCostFor('cinematic_kling', true)} cr`, supportsRef: false },
  { key: 'veo', preview: '/previews/9bbd5d98-33e5-423f-b9cb-82f7af6c67ba.mp4', icon: 'G', name: 'Veo 3.1', tag: 'Studio', desc: 'Google’s flagship cinematic engine', res: '1080p', credits: `${creditCostFor('cinematic_veo', true)} cr`, supportsRef: false },
  { key: 'hollywood', preview: '/previews/4b12925e-16e6-4b56-af5a-7047f9ae7a28.mp4', icon: 'K3', name: 'Kling 3', tag: 'Studio', desc: 'Film scenes, native voice & lip sync', res: '1080p', credits: `${creditCostFor('cinematic_hollywood', true)} cr`, supportsRef: true },
  // KINEO-H3-2026-08-19 — MiniMax H3. Sem preview ainda (entra depois do
  // primeiro render de validação; vitrine com clipe de outro motor seria
  // quebrar o selo honesto). É o filme carro-chefe que CABE no plano: o
  // Creator (90cr) não fecha um Kling 3 de 150, e fecha DOIS H3 de 45.
  { key: 'h3', icon: 'H3', name: 'MiniMax H3', tag: 'New', desc: 'Cinematic film that fits your plan — 9-image consistency', res: '768p', credits: `${creditCostFor('cinematic_h3', true)} cr`, supportsRef: true },
]

// KINEO-CEO-HOUR-2026-08-17 (#3) — 'Surprise me': mata a paralisia da pagina
// em branco com ideias do padrao viral da casa (verticais que ja performaram).
const SURPRISE_IDEAS = [
  'The lake in Venezuela where lightning strikes 28 times a minute — and never stops',
  'The wave in Alaska that was taller than the Empire State Building',
  'A diver knocks on a submarine window 100 meters down — true story',
  'The town that has been on fire underground since 1962',
  'Why airplane windows are round — the crashes that taught us',
  'The man who survived two atomic bombs in three days',
  'The door in the ocean floor scientists refuse to open',
  'How Rolex watches are made — inside the most secretive factory on Earth',
  'The island where landing is illegal — and what lives there',
  'The 1939 photo that should not exist — a smartphone in the crowd',
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

// KINEO-STUDIO-KIT-2026-08-17 — o CSS local virou o kit compartilhado
// (components/studioKit) que veste TODOS os ambientes. Ajuste aprovado pelo
// fundador entra LA, uma vez, e atualiza o produto inteiro.

export default function StudioClient() {
  const router = useRouter()
  const [engine, setEngine] = useState<EngineKey>('seedance')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [duration, setDuration] = useState<15 | 45 | 60>(60)
  const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16')
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p')
  const [preset, setPreset] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  // KINEO-STUDIO-SCRIPTMODE-2026-08-17 (fundador: 'faltou usar a script do
  // jeito que ela esta ou AI ajudar a escrever'): mesmo par de modos do
  // fluxo classico — 'ai' estrutura o texto, 'verbatim' narra palavra por
  // palavra (scripts prontos, como os do canal do fundador).
  const [scriptMode, setScriptMode] = useState<'ai' | 'verbatim'>('ai')
  const [refName, setRefName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const campaignRef = useRef('studio_v4')
  // KINEO-STUDIO-MYVIDS-2026-08-17 (pedido do fundador na aprovacao: "colocar
  // na parte de baixo os meus ultimos videos — e o que falta pra completar"):
  // os 6 renders mais recentes do usuario, hover da play, clique abre o filme.
  // KINEO-CEO-HOUR-2026-08-17 (#8) — reativacao da base: banner UMA VEZ
  // anunciando o que nasceu esta semana (Images/Audio/Enhance). ~1.300 contas
  // antigas nunca souberam que isso existe.
  const [showNews, setShowNews] = useState(false)
  useEffect(() => {
    try { if (!localStorage.getItem('kineo:news:2026-08-17')) setShowNews(true) } catch {}
  }, [])
  const dismissNews = () => {
    setShowNews(false)
    try { localStorage.setItem('kineo:news:2026-08-17', '1') } catch {}
  }
  const [myVids, setMyVids] = useState<{ id: string; title: string | null; video_url: string | null; thumbnail_url: string | null; enhanced_url?: string | null }[]>([])
  useEffect(() => {
    fetch('/api/videos', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { videos: [] }))
      .then((d) => { if (Array.isArray(d?.videos)) setMyVids(d.videos.filter((v: { video_url?: string | null }) => v.video_url).slice(0, 6)) })
      .catch(() => {})
  }, [])

  // KINEO-STUDIO-ENTRADA-2026-08-17 — o Studio virou a porta principal (menus
  // do topo apontam pra ca): le ?engine= e ?prompt= da URL pra chegada dos
  // cards do hero/bento/mega-menu ja cair com o motor certo selecionado.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const e = sp.get('engine')
    if (e && ENGINES.some((x) => x.key === e)) setEngine(e as EngineKey)
    const p = sp.get('prompt')
    if (p) setPrompt(p)
    // KINEO-AUDIT-CAMPAIGN-2026-08-18: a campanha da landing (nav_mega/
    // engine_tile/hero_engine) atravessa o Studio em vez de virar 'studio_v4'.
    const ic = sp.get('intent_campaign')
    if (ic) campaignRef.current = ic
  }, [])

  const eng = useMemo(() => ENGINES.find((e) => e.key === engine)!, [engine])

  const finalPrompt = useMemo(() => {
    const p = CAMERA_PRESETS.find((c) => c.key === preset)
    return p && prompt.trim() ? `${prompt.trim()}\n\n[camera: ${p.prompt}]` : prompt.trim()
  }, [prompt, preset])

  // KINEO-STUDIO-ONECLICK-2026-08-17 (degrau 2): o clique AQUI e o
  // consentimento de gasto — o usuario viu motor + custo e apertou Generate.
  // Token de uso unico via sessionStorage (mesma origem, 2 min de validade)
  // autoriza o /generate a disparar o render sozinho ao fim da analise; a
  // chegada ja roda ?autoanalyze=1 (primitivo do Viral Now). Resultado: UM
  // clique no Studio → analise → render → filme, sem parada na tela antiga.
  const generate = () => {
    try {
      sessionStorage.setItem('kineo:studio:go:v1', JSON.stringify({ t: Date.now(), engine, prompt: finalPrompt }))
    } catch {}
    const q = new URLSearchParams({ engine, prompt: finalPrompt, duration: String(duration), script_mode: scriptMode, autoanalyze: '1', studio: '1', intent_campaign: campaignRef.current })
    router.push(`/generate?${q.toString()}`)
  }

  return (
    <div className="stu">
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />

      {showNews && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', border: '1px solid rgba(41,151,255,0.35)', background: 'rgba(41,151,255,0.06)' }}>
          <span style={{ fontSize: 13.5, color: 'var(--txt2,#c7c7cc)' }}>
            <b style={{ color: '#7cc0ff' }}>NEW this week:</b> 🖼 <a href="/images" style={{ color: '#f5f5f7' }}>AI Images</a> (6 engines) · 🎙 <a href="/audio" style={{ color: '#f5f5f7' }}>Audio studio</a> (4 voices engines) · ✨ <a href="/history" style={{ color: '#f5f5f7' }}>HD Enhance</a> on every video
          </span>
          <button type="button" onClick={dismissNews} aria-label="Dismiss" className="pill" style={{ marginLeft: 'auto' }}>✕</button>
        </div>
      )}
      <h1>Studio</h1>
      <p className="sub">Every control on one screen. Pick, type, generate.</p>

      <div className="grid">
        {/* ===== RAIL ESQUERDO — controles em cards numerados ===== */}
        <div className="rail">
          {/* 1 · Engine */}
          <div style={{ position: 'relative' }}>
            <button type="button" className="mdlbtn" onClick={() => setPickerOpen((o) => !o)}>
              <span className="lab" style={{ marginBottom: 0 }}><span className="n">1</span>Engine</span>
              <span className="mdlname" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="eng-ic" aria-hidden="true">{eng.icon}</span>
                <b>{eng.name}</b>
                <i style={{ marginLeft: 'auto' }}>{eng.res} ▾</i>
              </span>
            </button>
            {pickerOpen && (
              <div className="picker">
                {ENGINES.map((e) => (
                  <button key={e.key} type="button" className={`pk${e.key === engine ? ' on' : ''}`}
                    onClick={() => { setEngine(e.key); setPickerOpen(false) }}>
                    <span className="eng-ic" aria-hidden="true">{e.icon}</span>
                    <span className="pk-tx">
                      {/* KINEO-PRECO-NO-COMPROMISSO-2026-08-18 (fundador +
                          averiguacao Higgsfield/InVideo: preco nao mora no
                          seletor — so no cartao de gerar e no /pricing). */}
                      <span className="t">
                        <b>{e.name}{e.tag && <span className="tag">{e.tag}</span>}</b>
                        <i>{e.res}</i>
                      </span>
                      <span className="d">{e.desc}</span>
                    </span>
                    {e.preview && (
                      <span className="pkv" aria-hidden="true">
                        <video src={e.preview} muted loop playsInline preload="none"
                          onMouseEnter={(ev) => { const v = ev.currentTarget; v.currentTime = 0; v.play().catch(() => {}) }} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2 · Format — duração + aspecto + resolução num card só */}
          <div className="card">
            <div className="lab"><span className="n">2</span>Format</div>
            <div className="row" style={{ marginBottom: 12 }}>
              <button type="button" className="pill off" title="Coming soon">15s<span className="soon">SOON</span></button>
              <button type="button" className={`pill${duration === 45 ? ' on' : ''}`} onClick={() => setDuration(45)}>45s</button>
              <button type="button" className={`pill${duration === 60 ? ' on' : ''}`} onClick={() => setDuration(60)}>60s ⭐</button>
            </div>
            <div className="row" style={{ marginBottom: 12 }}>
              <button type="button" className={`pill${aspect === '9:16' ? ' on' : ''}`} onClick={() => setAspect('9:16')}>9:16 · Shorts</button>
              <button type="button" className="pill off" title="Coming soon">16:9<span className="soon">SOON</span></button>
            </div>
            <div className="row">
              <button type="button" disabled className="pill off" title="Every engine already renders in Full HD at no extra cost">720p<span className="soon">SOON</span></button>
              <button type="button" className={`pill${resolution === '1080p' ? ' on' : ''}`} onClick={() => setResolution('1080p')}>1080p Full HD</button>
            </div>
            <div className="hint">{eng.name} renders in Full HD at no extra cost.</div>
          </div>

          {/* 3 · Reference image */}
          <div className="card">
            <div className="lab"><span className="n">3</span>Reference image <span className="soon">SOON</span></div>
            {/* KINEO-STUDIO-AUDIT-2026-08-17 — auditoria de botoes do fundador
                flagrou: o upload aceitava o arquivo mas NAO viajava pro render
                (botao morto = promessa falsa). Ate o pipe de upload ligar,
                vira SOON honesto — selo honesto vale dentro do produto tambem. */}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(ev) => setRefName(ev.target.files?.[0]?.name ?? null)} />
            <button type="button" disabled className="upl no" title="Coming soon">
              🖼️ Start your video from an image — coming soon
            </button>
          </div>

          {/* Custo + Generate */}
          <div className="cost">
            <div className="sum" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="eng-ic" style={{ width: 24, height: 24, borderRadius: 7, fontSize: 10.5 }} aria-hidden="true">{eng.icon}</span>{eng.name} · {duration}s · {resolution} · {aspect}{preset ? ` · ${CAMERA_PRESETS.find((c) => c.key === preset)?.label}` : ''}</div>
            <div className="val"><span>Estimated cost</span><b>{eng.credits}</b></div>
            <button type="button" onClick={generate} disabled={!prompt.trim()} className={`go ${prompt.trim() ? 'ok' : 'no'}`}>
              {prompt.trim() ? 'Generate →' : 'Type your idea first'}
            </button>
            <div className="gnote">Voice, karaoke captions and score included.</div>
          </div>
        </div>

        {/* ===== DIREITA — ideia + câmera ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="lab" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span><span className="n">4</span>Your idea</span>
              <button
                type="button"
                className="pill"
                style={{ fontSize: 11 }}
                onClick={() => setPrompt(SURPRISE_IDEAS[Math.floor(Math.random() * SURPRISE_IDEAS.length)])}
              >
                🎲 Surprise me
              </button>
            </div>
            {/* KINEO-TEMPLATES-2026-08-18 (roubo com critério dos format cards
                do InVideo): um clique arma o formato — esqueleto de prompt +
                modo de script certo. */}
            <div className="row" style={{ marginBottom: 8 }}>
              {([
                ['📊 Facts', '5 shocking facts about ', 'ai'],
                ['🕵️ Mystery', 'The unsolved mystery of ', 'ai'],
                ['📖 True Story', 'The incredible true story of ', 'ai'],
                ['📝 My Script', '', 'verbatim'],
              ] as const).map(([label, seed, mode]) => (
                <button key={label} type="button" className="pill" style={{ fontSize: 11.5 }}
                  onClick={() => { setScriptMode(mode as 'ai' | 'verbatim'); if (seed) setPrompt(seed) }}>
                  {label}
                </button>
              ))}
            </div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={7}
              placeholder="What’s your video about? One idea in — a finished film out: voiced, scored and captioned." />
            <div className="row" style={{ marginTop: 10 }}>
              <button type="button" className={`pill${scriptMode === 'ai' ? ' on' : ''}`} onClick={() => setScriptMode('ai')}>✨ Let AI structure it</button>
              <button type="button" className={`pill${scriptMode === 'verbatim' ? ' on' : ''}`} onClick={() => setScriptMode('verbatim')}>📝 Use my script as is</button>
            </div>
            <div className="cnt">{prompt.trim() ? `${prompt.trim().split(/\s+/).length} words${scriptMode === 'verbatim' ? ' · narrated word for word' : ''}` : 'a single line is enough — or paste a full script'}</div>
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

          {/* KINEO-STUDIO-MYVIDS-2026-08-17 — os ultimos renders do usuario. */}
          {myVids.length > 0 && (
            <div className="myv">
              <div className="hd">
                <div className="lab" style={{ marginBottom: 0 }}>Your latest videos</div>
                <a href="/history">See all →</a>
              </div>
              <div className="vrow">
                {myVids.map((v) => (
                  <a key={v.id} className="vtile" href={(v.enhanced_url ?? v.video_url) ?? '#'} target="_blank" rel="noreferrer" style={{ position: 'relative' }}>
                    {v.enhanced_url && <span style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 99, background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.5)', color: '#34d399' }}>✨ HD</span>}
                    <video
                      src={`${v.enhanced_url ?? v.video_url}#t=0.1`}
                      poster={v.thumbnail_url ?? undefined}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                      onMouseLeave={(e) => { e.currentTarget.pause() }}
                    />
                    {v.title && <span className="vt">{v.title}</span>}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
