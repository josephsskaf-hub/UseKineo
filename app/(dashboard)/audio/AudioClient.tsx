'use client'

// KINEO-AUDIO-2026-08-17 — [STAGE] Kineo Audio: texto→voz estilo Higgsfield
// (print do fundador: "quero esses motores de audio"), vestida com o Studio
// Kit. 4 motores (Eleven v3 / MiniMax Speech HD / Dia dialogo / Kokoro),
// voz selecionavel onde o motor suporta, custo vivo por tamanho do texto,
// player + download + galeria My Audio persistente (tabela audios + bucket).
import { useEffect, useMemo, useState } from 'react'
import { STUDIO_KIT_CSS } from '@/components/studioKit'

type AudioModelKey = 'eleven' | 'minimax' | 'dia' | 'kokoro'

const AUDIO_ENGINES: { key: AudioModelKey; name: string; tag?: string; desc: string; perK: number; voices: { id: string; label: string }[] }[] = [
  { key: 'minimax', name: 'MiniMax Speech HD', tag: 'Popular', desc: 'High-fidelity narration voice', perK: 2, voices: [] },
  {
    key: 'eleven', name: 'Eleven v3', tag: 'Studio', desc: 'Emotion control — (laughs), (whispers)', perK: 2,
    voices: [
      { id: 'Rachel', label: 'Rachel' }, { id: 'Aria', label: 'Aria' }, { id: 'Brian', label: 'Brian' },
      { id: 'Charlotte', label: 'Charlotte' }, { id: 'Daniel', label: 'Daniel' }, { id: 'Jessica', label: 'Jessica' },
    ],
  },
  { key: 'dia', name: 'Dia Dialogue', tag: 'New', desc: 'Two-speaker scenes — [S1] [S2] + laughs', perK: 1, voices: [] },
  {
    key: 'kokoro', name: 'Kokoro', desc: 'Instant narration — lowest cost', perK: 1,
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
  const [items, setItems] = useState<Item[]>([])

  const eng = AUDIO_ENGINES.find((e) => e.key === model)!
  const credits = useMemo(() => Math.max(1, Math.ceil(Math.max(text.trim().length, 1) / 1000)) * eng.perK, [text, eng])

  // Chegada via mega-menu (?engine=) ja seleciona o motor.
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('engine')
    if (e && AUDIO_ENGINES.some((x) => x.key === e)) setModel(e as AudioModelKey)
  }, [])

  // Galeria persistente (tabela audios).
  useEffect(() => {
    fetch('/api/audio', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { audios: [] }))
      .then((d) => {
        if (Array.isArray(d?.audios)) {
          setItems(d.audios.map((r: { id: string; url: string; model?: string; voice?: string | null; text?: string | null }) => ({
            id: r.id, url: r.url, model: r.model ?? 'minimax', voice: r.voice ?? null, text: r.text ?? null,
          })))
        }
      })
      .catch(() => {})
  }, [])

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.')
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>Audio</h1>
        <span className="soon" style={{ fontSize: 10, padding: '3px 8px' }}>STAGE</span>
      </div>
      <p className="sub">Type it. Hear it. Four voice engines, one screen.</p>

      <div className="grid">
        {/* rail esquerdo */}
        <div className="rail">
          <div style={{ position: 'relative' }}>
            <button type="button" className="mdlbtn" onClick={() => setPickerOpen((o) => !o)}>
              <span className="lab" style={{ marginBottom: 0 }}><span className="n">1</span>Engine</span>
              <span className="mdlname">
                <b>{eng.name}</b>
                <i>{eng.perK} cr / 1000 chars ▾</i>
              </span>
            </button>
            {pickerOpen && (
              <div className="picker">
                {AUDIO_ENGINES.map((e) => (
                  <button key={e.key} type="button" className={`pk${e.key === model ? ' on' : ''}`}
                    onClick={() => { setModel(e.key); setPickerOpen(false) }}>
                    <span className="t">
                      <b>{e.name}{e.tag && <span className="tag">{e.tag}</span>}</b>
                      <i>{e.perK} cr / 1k</i>
                    </span>
                    <span className="d">{e.desc}</span>
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
            {error && (
              <p role="alert" style={{ marginTop: 10, padding: '9px 12px', borderRadius: 10, background: 'rgba(255,107,107,.08)', border: '1px solid rgba(255,107,107,.35)', color: '#ffb4b4', fontSize: 12.5 }}>
                ⚠️ {error}
              </p>
            )}
          </div>

          {items.length > 0 && (
            <div>
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
