'use client'

// KINEO-AUDIO-2026-08-17 — [STAGE] Kineo Audio: texto→voz estilo Higgsfield
// (print do fundador: "quero esses motores de audio"), vestida com o Studio
// Kit. 4 motores (Eleven v3 / MiniMax Speech HD / Dia dialogo / Kokoro),
// voz selecionavel onde o motor suporta, custo vivo por tamanho do texto,
// player + download + galeria My Audio persistente (tabela audios + bucket).
import { UiLabel } from '@/components/InterfaceLanguage'
import { useEffect, useMemo, useRef, useState } from 'react'
import { STUDIO_KIT_CSS } from '@/components/studioKit'
import { PremiereResult, PremiereStage, usePremiereBeacon } from '@/components/premiere/Premiere' // KINEO-ESTREIA-3110
import { trackEvent } from '@/lib/analytics'
import { TopupOuRecargaModal } from '@/components/billing/BuyCreditsEntry' // KINEO-RECARGA-TELAS-1211 — assinante sem saldo: a barra da recarga
// sprint-assinaturas #13 — o 402 so abre o popup de recarga para quem PODE
// comprar recarga (Creator/Studio, regra do checkout); trial/free/starter
// veem os 3 planos com "N audio clips/mo" em vez de um pack que o checkout recusa.
import OutOfCreditsPlansModal from '@/components/OutOfCreditsPlansModal'
import { outOfCreditsDestination } from '@/lib/credits/outOfCreditsPlans'
import { downloadHref } from '@/lib/downloadNosso' // KINEO-DOWNLOAD-NOSSO-1311 — baixar pelo nosso domínio, nunca o endereço do Supabase

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
  // KINEO-ESTREIA-3110 — a espera vira a estreia: o texto em voo (congelado no clique) e, quando volta, a URL do áudio.
  // Só tela — o POST, a cobrança e a lista "My Audio" seguem iguais.
  const [premiere, setPremiere] = useState<{ text: string; engine: string; voice: string | null; url: string | null } | null>(null)
  const textRef = useRef<HTMLTextAreaElement | null>(null)
  const premiereRef = useRef<HTMLDivElement | null>(null)

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
    setPremiere({ text: text.trim(), engine: eng.name, voice: eng.voices.find((v) => v.id === voice)?.label ?? null, url: null }) // KINEO-ESTREIA-3110
    try {
      const res = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), model, voice: voice ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data?.url) throw new Error(data?.error ?? 'Generation failed.')
      setItems((xs) => [{ id: (data.id as string | null) ?? null, url: data.url as string, model, voice, text: text.trim() }, ...xs])
      setPremiere((p) => (p ? { ...p, url: data.url as string } : p)) // KINEO-ESTREIA-3110
      setMadeThisSession((n) => n + 1)
      void refreshPlan()
    } catch (e) {
      setPremiere(null) // KINEO-ESTREIA-3110 — falhou: a sala sai e o erro de sempre aparece
      { const m = e instanceof Error ? e.message : 'Generation failed.'; setError(m); if (/not enough credits/i.test(m)) openCreditsWall() }
    } finally {
      setBusy(false)
    }
  }

  async function download(url: string, idx: number, from: 'grid' | 'premiere' = 'grid') {
    // KINEO-ESTREIA-3110 — o download de áudio não emitia evento nenhum; agora conta (lista e estreia).
    void trackEvent('audio_downloaded', { from, model: items[idx]?.model ?? null })
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
      window.open(downloadHref(url, `kineo-audio-${items.length - idx}.mp3`, 'audio'), '_blank', 'noopener')
    }
  }

  // KINEO-ESTREIA-3110 — a sala aparece no clique e a estreia quando o áudio chega; leva a tela até elas.
  usePremiereBeacon(!busy && !!premiere?.url, 'audio')
  useEffect(() => {
    if (!premiere) return
    premiereRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [busy, premiere?.url]) // eslint-disable-line react-hooks/exhaustive-deps
  const premiereIdx = premiere?.url ? items.findIndex((x) => x.url === premiere.url) : -1
  const voiceAnother = () => {
    textRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    textRef.current?.focus({ preventScroll: true })
  }

  return (
    <div className="stu">
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />

      <h1><UiLabel>Audio</UiLabel></h1>
      <p className="sub"><UiLabel>Type it. Hear it. Four voice engines, one screen.</UiLabel></p>

<div className="grid creation-grid">
<div className="card creation-input">
            <div className="lab"><span className="n">1</span><UiLabel>Your script</UiLabel></div>
            <textarea ref={textRef} aria-label="Your script" value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={2000}
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
            {showTopup && <TopupOuRecargaModal surface="audio_402" onClose={() => setShowTopup(false)} />}
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
                  <> <button type="button" onClick={openCreditsWall} style={{ color: '#7cc0ff', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><UiLabel>Add credits →</UiLabel></button></>
                )}
                {error.toLowerCase().includes('signed in') && (
                  <> <a href="/login?redirect=/audio" style={{ color: '#7cc0ff', fontWeight: 700 }}><UiLabel>Sign in →</UiLabel></a></>
                )}
              </p>
            )}
          </div>
<div className="rail creation-settings">
          {/* KINEO-AUDIO-DETAILS-1111 [CEO 11/11, regra do dono para toda tela: motor = escolha opcional e FECHADA dentro de "Details"; preço só
              no botão de gerar] — o motor e a voz moram num <details> fechado; o resumo fechado diz só a voz e o tamanho do texto. */}
          <details className="card aud-details" data-kineo="audio-details">
          <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, listStyle: 'none' }}><span className="lab" style={{ marginBottom: 0 }}><span className="n">2</span><UiLabel>Details</UiLabel></span><span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--txt2,#9aa0a6)' }}>{voice ? `${voice} · ` : ''}{text.trim().length}<UiLabel> chars</UiLabel> <span aria-hidden="true">▾</span></span></summary>
          <div style={{ position: 'relative', marginTop: 12 }}>
            <button type="button" className="mdlbtn" onClick={() => setPickerOpen((o) => !o)}>
              <span className="lab" style={{ marginBottom: 0 }}><span className="n">2</span><UiLabel>Engine</UiLabel></span>
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
            <div style={{ marginTop: 12 }}>
              <div className="lab"><UiLabel>Voice</UiLabel></div>
              <div className="row">
                {eng.voices.map((v) => (
                  <button key={v.id} type="button" className={`pill${voice === v.id ? ' on' : ''}`} onClick={() => setVoice(v.id)}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          </details>

          <div className="cost">
            <button type="button" onClick={generate} disabled={!text.trim() || busy} className={`go ${text.trim() && !busy ? 'ok' : 'no'}`}>
              {busy ? <UiLabel>Creating…</UiLabel> : text.trim() ? <><UiLabel>Generate audio</UiLabel> · {credits} cr →</> : <UiLabel>Type your script first</UiLabel>}{/* KINEO-AUDIO-DETAILS-1111 — o custo mora só aqui */}
            </button>
            <div className="gnote"><UiLabel>MP3 download included.</UiLabel></div>
          </div>
        </div>
<div className="creation-results">
{/* KINEO-ESTREIA-3110 — a espera vira a estreia: a mesma sala/estreia de todas as telas de geração (components/premiere).
    O áudio novo continua entrando primeiro em "My Audio" logo abaixo. */}
{premiere && (busy || premiere.url) ? (
            <div ref={premiereRef} style={{ width: '100%', maxWidth: 720, marginBottom: 16, scrollMarginTop: 80 }}>
              {busy ? (
                <PremiereStage
                  surface="audio"
                  kind="audio"
                  kicker="Your audio is being made"
                  title={premiere.voice ? `${premiere.voice} is voicing it` : 'Voicing your script'} /* KINEO-AUDIO-DETAILS-1111 — sem nome de motor */
                  items={[{ key: 'audio', label: 'Your audio', status: 'working' }]}
                  now={{ label: 'Voicing', text: premiere.text.length > 140 ? `${premiere.text.slice(0, 140).trimEnd()}…` : premiere.text }}
                  notify={false}
                  footnote="Usually ready in under a minute."
                />
              ) : premiere.url ? (
                <PremiereResult
                  surface="audio"
                  kind="audio"
                  url={premiere.url}
                  title={premiere.text.length > 110 ? `${premiere.text.slice(0, 110).trimEnd()}…` : premiere.text}
                  meta={`Ready${premiere.voice ? ` · ${premiere.voice}` : ''}`} /* KINEO-AUDIO-DETAILS-1111 */
                  onDownload={() => { void download(premiere.url!, premiereIdx >= 0 ? premiereIdx : 0, 'premiere') }}
                  next={{
                    label: 'Make it a film',
                    title: 'The Studio builds the whole film around this script — visuals, captions and score.',
                    cta: 'Make a film from this script',
                    href: `/studio?prompt=${encodeURIComponent(premiere.text.slice(0, 500))}`,
                    hint: 'Opens the Studio filled in — credits only when you press Generate.',
                  }}
                >
                  <div className="row">
                    <button type="button" className="pill" onClick={voiceAnother}><UiLabel>Voice another line</UiLabel></button>
                  </div>
                </PremiereResult>
              ) : null}
            </div>
          ) : null}
{galleryFailed && (
            <div role="alert" className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', border: '1px solid rgba(251,191,36,.35)', background: 'rgba(251,191,36,.06)' }}>
              <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700 }}><UiLabel>We couldn’t load your audio right now.</UiLabel></span>
              <span style={{ fontSize: 12.5, color: 'var(--txt2,#9aa0a6)' }}><UiLabel>Your audio and credits are safe — this is just a temporary read hiccup.</UiLabel></span>
              <button type="button" className="pill" onClick={loadGallery}><UiLabel>↻ Try again</UiLabel></button>
            </div>
          )}
{galleryLoading && !galleryFailed && items.length === 0 && (
            <div aria-label="Loading your audio" aria-busy="true">
              <style>{`@keyframes audsk{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
              <div className="lab"><UiLabel>My Audio</UiLabel></div>
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
                <span style={{ fontSize: 13, color: 'var(--txt2,#9aa0a6)' }}><UiLabel>Like a voice? The Studio builds the whole film around it — visuals, captions and score.</UiLabel></span>
                <a className="pill on" style={{ textDecoration: 'none' }} href="/studio"><UiLabel>Open Studio →</UiLabel></a>
              </div>
              <div className="lab"><UiLabel>My Audio</UiLabel></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((it, i) => (
                  <div key={it.url} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <audio controls preload="none" src={it.url} style={{ flex: '1 1 260px', height: 36 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--txt2,#9aa0a6)' }}>
                        {it.voice ?? ''}{/* KINEO-AUDIO-DETAILS-1111 — sem nome de motor no cartão */}
                      </span>
                      <button type="button" className="pill" onClick={() => download(it.url, i)}><UiLabel>⬇ Download</UiLabel></button>
                      {it.text && <a className="pill" style={{ textDecoration: 'none' }} href={`/studio?prompt=${encodeURIComponent(it.text.slice(0, 500))}`}><UiLabel>🎬 Use in Studio</UiLabel></a>}
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
