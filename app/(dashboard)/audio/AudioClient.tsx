'use client'

// KINEO-AUDIO-2026-08-17 — [STAGE] Kineo Audio: texto→voz estilo Higgsfield
// (print do fundador: "quero esses motores de audio"), vestida com o Studio
// Kit. 4 motores (Eleven v3 / MiniMax Speech HD / Dia dialogo / Kokoro),
// voz selecionavel onde o motor suporta, custo vivo por tamanho do texto,
// player + download + galeria My Audio persistente (tabela audios + bucket).
import { useEffect, useMemo, useState } from 'react'
import { STUDIO_KIT_CSS } from '@/components/studioKit'
import CreditsTopupModal from '@/components/CreditsTopupModal' // KINEO-TOPUP-POPUP-2026-08-18
// sprint-assinaturas #13 — o 402 so abre o popup de recarga para quem PODE
// comprar recarga (Creator/Studio, regra do checkout); trial/free/starter
// veem os 3 planos com "N audio clips/mo" em vez de um pack que o checkout recusa.
import OutOfCreditsPlansModal from '@/components/OutOfCreditsPlansModal'
import { outOfCreditsDestination } from '@/lib/credits/outOfCreditsPlans'

type AudioModelKey = 'eleven' | 'minimax' | 'dia' | 'kokoro'

const AUDIO_ENGINES: { key: AudioModelKey; icon: string; name: string; tag?: string; desc: string; perK: number; voices: { id: string; label: string }[] }[] = [
  // KINEO-MOTORES-D1-2026-09-01 — selo honesto: o motor por trás virou o
  // Speech-2.8 HD (topo do Speech Arena), então o nome na tela diz 2.8.
  { key: 'minimax', icon: 'M', name: 'MiniMax 2.8 HD', tag: 'New', desc: 'Top-ranked narration voice (Speech Arena #1 tier)', perK: 2, voices: [] },
  {
    key: 'eleven', icon: '11', name: 'Eleven v3', tag: 'Studio', desc: 'Emotion control — (laughs), (whispers)', perK: 2,
    voices: [
      { id: 'Rachel', label: 'Rachel' }, { id: 'Aria', label: 'Aria' }, { id: 'Brian', label: 'Brian' },
      { id: 'Charlotte', label: 'Charlotte' }, { id: 'Daniel', label: 'Daniel' }, { id: 'Jessica', label: 'Jessica' },
    ],
  },
  { key: 'dia', icon: 'D', name: 'Dia Dialogue', desc: 'Two-speaker scenes — [S1] [S2] + laughs', perK: 1, voices: [] },
  {
    key: 'kokoro', icon: 'K', name: 'Kokoro', desc: 'Instant narration — lowest cost', perK: 1,
    voices: [
      { id: 'af_heart', label: 'Heart (F)' }, { id: 'af_bella', label: 'Bella (F)' }, { id: 'af_nova', label: 'Nova (F)' },
      { id: 'am_adam', label: 'Adam (M)' }, { id: 'am_michael', label: 'Michael (M)' }, { id: 'am_onyx', label: 'Onyx (M)' },
    ],
  },
]

const PLACEHOLDERS: Record<AudioModelKey, string> = {
  minimax: 'They found the ship 30 years after it vanished — and the logbook was still warm…',
  eleven: 'You won’t believe what happened next. (whispers) Nobody ever found the money.',
  dia: '[S1] Did you hear about the abandoned mine? [S2] The one they sealed in 1987? (laughs) [S1] They just reopened it.',
  kokoro: 'Five facts about money your bank hopes you never learn.',
}

type Item = { id?: string | null; url: string; model: string; voice?: string | null; text?: string | null }

export default function AudioClient() {
  const [model, setModel] = useState<AudioModelKey>('minimax')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [voice, setVoice] = useState<string | null>(null)
  const [text, setText] = useState('')
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
  // KINEO-SPRINT-UI-5-2026-08-29 — falha de leitura NAO vira galeria vazia.
  const [galleryFailed, setGalleryFailed] = useState(false)
  // KINEO-SPRINT-UI7-2026-08-30 — mesma regra do /images: enquanto o acervo
  // carrega, mostrar a FORMA das fileiras (shimmer) em vez de nada.
  const [galleryLoading, setGalleryLoading] = useState(true)

  const eng = AUDIO_ENGINES.find((e) => e.key === model)!
  const credits = useMemo(() => Math.max(1, Math.ceil(Math.max(text.trim().length, 1) / 1000)) * eng.perK, [text, eng])

  // Chegada via mega-menu (?engine=) ja seleciona o motor.
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('engine')
    if (e && AUDIO_ENGINES.some((x) => x.key === e)) setModel(e as AudioModelKey)
  }, [])

  // Galeria persistente (tabela audios).
  function loadGallery() {
    setGalleryFailed(false)
    setGalleryLoading(true)
    fetch('/api/audio', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d) => {
        if (Array.isArray(d?.audios)) {
          setItems(d.audios.map((r: { id: string; url: string; model?: string; voice?: string | null; text?: string | null }) => ({
            id: r.id, url: r.url, model: r.model ?? 'minimax', voice: r.voice ?? null, text: r.text ?? null,
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

  // Troca de motor: reseta a voz pro default do novo motor.
  useEffect(() => { setVoice(eng.voices[0]?.id ?? null) }, [model]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    if (!text.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), model, voice: voice ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data?.url) throw new Error(data?.error ?? 'Generation failed.')
      setItems((xs) => [{ id: (data.id as string | null) ?? null, url: data.url as string, model, voice, text: text.trim() }, ...xs])
      setMadeThisSession((n) => n + 1)
      void refreshPlan()
    } catch (e) {
      { const m = e instanceof Error ? e.message : 'Generation failed.'; setError(m); if (/not enough credits/i.test(m)) openCreditsWall() }
    } finally {
      setBusy(false)
    }
  }

  async function download(url: string, idx: number) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `kineo-audio-${items.length - idx}.mp3`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    } catch {
      window.open(url, '_blank', 'noopener')
    }
  }

  return (
    <div className="stu">
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />

      <h1>Audio</h1>
      <p className="sub">Type it. Hear it. Four voice engines, one screen.</p>

      <div className="grid">
        {/* rail esquerdo */}
        <div className="rail">
          <div style={{ position: 'relative' }}>
            <button type="button" className="mdlbtn" onClick={() => setPickerOpen((o) => !o)}>
              <span className="lab" style={{ marginBottom: 0 }}><span className="n">1</span>Engine</span>
              <span className="mdlname" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="eng-ic" aria-hidden="true">{eng.icon}</span>
                <b>{eng.name}</b>
                <i style={{ marginLeft: 'auto' }}>▾</i>
              </span>
            </button>
            {pickerOpen && (
              <div className="picker">
                {AUDIO_ENGINES.map((e) => (
                  <button key={e.key} type="button" className={`pk${e.key === model ? ' on' : ''}`}
                    onClick={() => { setModel(e.key); setPickerOpen(false) }}>
                    <span className="eng-ic" aria-hidden="true">{e.icon}</span>
                    <span className="pk-tx">
                      <span className="t">
                        <b>{e.name}{e.tag && <span className="tag">{e.tag}</span>}</b>
                      </span>
                      <span className="d">{e.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {eng.voices.length > 0 && (
            <div className="card">
              <div className="lab"><span className="n">2</span>Voice</div>
              <div className="row">
                {eng.voices.map((v) => (
                  <button key={v.id} type="button" className={`pill${voice === v.id ? ' on' : ''}`} onClick={() => setVoice(v.id)}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="cost">
            <div className="sum">{eng.name}{voice ? ` · ${voice}` : ''} · {text.trim().length} chars</div>
            <div className="val"><span>Cost</span><b>{credits} cr</b></div>
            <button type="button" onClick={generate} disabled={!text.trim() || busy} className={`go ${text.trim() && !busy ? 'ok' : 'no'}`}>
              {busy ? 'Creating…' : text.trim() ? 'Generate audio →' : 'Type your script first'}
            </button>
            <div className="gnote">{eng.perK} cr per 1000 characters · MP3 download included.</div>
          </div>
        </div>

        {/* direita: texto + resultados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div className="lab"><span className="n">{eng.voices.length > 0 ? 3 : 2}</span>Your script</div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={2000}
              placeholder={PLACEHOLDERS[model]} />
            {!text.trim() && (
              <div className="row" style={{ marginTop: 10 }}>
                {(['minimax', 'eleven', 'dia', 'kokoro'] as const).map((k) => (
                  <button key={k} type="button" className="pill" style={{ fontSize: 11 }} onClick={() => setText(PLACEHOLDERS[k])}>
                    {PLACEHOLDERS[k].slice(0, 36)}…
                  </button>
                ))}
              </div>
            )}
            {showTopup && <CreditsTopupModal surface="audio_402" onClose={() => setShowTopup(false)} />}
            {showPlans && (
              <OutOfCreditsPlansModal
                product="audio"
                unitCost={credits}
                credits={balance}
                plan={plan}
                madeThisSession={madeThisSession}
                onClose={() => setShowPlans(false)}
              />
            )}
            {error && (
              <p role="alert" style={{ marginTop: 10, padding: '9px 12px', borderRadius: 10, background: 'rgba(255,107,107,.08)', border: '1px solid rgba(255,107,107,.35)', color: '#ffb4b4', fontSize: 12.5 }}>
                ⚠️ {error}
                {/* KINEO-AUDIT-401-2026-08-18: 401 vira porta, nao beco */}
                {error.toLowerCase().includes('credits') && (
                  <> <button type="button" onClick={openCreditsWall} style={{ color: '#7cc0ff', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Add credits →</button></>
                )}
                {error.toLowerCase().includes('signed in') && (
                  <> <a href="/login?redirect=/audio" style={{ color: '#7cc0ff', fontWeight: 700 }}>Sign in →</a></>
                )}
              </p>
            )}
          </div>

          {galleryFailed && (
            <div role="alert" className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', border: '1px solid rgba(251,191,36,.35)', background: 'rgba(251,191,36,.06)' }}>
              <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700 }}>We couldn’t load your audio right now.</span>
              <span style={{ fontSize: 12.5, color: 'var(--txt2,#9aa0a6)' }}>Your audio and credits are safe — this is just a temporary read hiccup.</span>
              <button type="button" className="pill" onClick={loadGallery}>↻ Try again</button>
            </div>
          )}

          {galleryLoading && !galleryFailed && items.length === 0 && (
            <div aria-label="Loading your audio" aria-busy="true">
              <style>{`@keyframes audsk{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
              <div className="lab">My Audio</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ height: 60, borderRadius: 12, border: '1px solid rgba(255,255,255,.06)', background: 'linear-gradient(100deg, rgba(255,255,255,.035) 40%, rgba(255,255,255,.09) 50%, rgba(255,255,255,.035) 60%)', backgroundSize: '200% 100%', animation: 'audsk 1.4s linear infinite', animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div>
              {/* KINEO-CEO-HOUR-2026-08-17 (#4) — flywheel: voz → filme completo */}
              <div className="card" style={{ padding: '11px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--txt2,#9aa0a6)' }}>Like a voice? The Studio builds the whole film around it — visuals, captions and score.</span>
                <a className="pill on" style={{ textDecoration: 'none' }} href="/studio">Open Studio →</a>
              </div>
              <div className="lab">My Audio</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((it, i) => (
                  <div key={it.url} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <audio controls preload="none" src={it.url} style={{ flex: '1 1 260px', height: 36 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--txt2,#9aa0a6)' }}>
                        {AUDIO_ENGINES.find((e) => e.key === it.model)?.name ?? it.model}{it.voice ? ` · ${it.voice}` : ''}
                      </span>
                      <button type="button" className="pill" onClick={() => download(it.url, i)}>⬇ Download</button>
                      {it.text && <a className="pill" style={{ textDecoration: 'none' }} href={`/studio?prompt=${encodeURIComponent(it.text.slice(0, 500))}`}>🎬 Use in Studio</a>}
                    </div>
                    {it.text && <div style={{ flexBasis: '100%', fontSize: 12, color: 'var(--txt2,#9aa0a6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.text}</div>}
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
