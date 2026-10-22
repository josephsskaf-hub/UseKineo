'use client'

// KINEO-BEBE-QUE-FALA-2010 — a tela do "AI Baby Podcast" (/baby-podcast), o 2º modo. Regras e textos em lib/kidsCartoon/babyPodcast.ts;
// quem valida, modera, escreve e prepara o retrato é o servidor (/api/baby-podcast/prepare). O vídeo sai pelo caminho do /avatar
// (o mesmo do teste nota 8): /api/generate-avatar (presenter, verbatim, sem B-roll, voz MiniMax) → /api/avatar-status → /api/compose
// (quality 'presenter', legenda queimada) → /api/compose/status. O preço (engineCost 'presenter') aparece SÓ no botão de gerar.
import { useEffect, useRef, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { creditCostFor } from '@/lib/credits/engineCost'
import {
  BABY_PODCAST_DURATION,
  BABY_PODCAST_ENGINE,
  BABY_PODCAST_ENGINE_LABEL,
  BABY_PODCAST_LANGUAGES,
  BABY_PODCAST_QUALITY,
  BABY_TOPIC_MAX_CHARS,
  babiesReady,
  babyAvatarPayload,
  babyTemplateCopy,
  isBabyPodcastLanguage,
  type BabyId,
  type BabyPodcastLanguage,
} from '@/lib/kidsCartoon/babyPodcast'
import { KIDS_TEMPLATE_CSS } from '@/components/kidsCartoon/KidsCartoonTemplate'

const LAST_BABY_KEY = 'kineo:baby-podcast:last'
const POLL_MS = 5000
const DEADLINE_MS = 20 * 60 * 1000
type Stage = 'idle' | 'preparing' | 'ready' | 'rendering' | 'composing' | 'done' | 'failed'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function BabyPodcastTemplate() {
  const ui = useInterfaceLanguage()
  const t = babyTemplateCopy(ui)
  const babies = babiesReady()
  const [baby, setBaby] = useState<BabyId | null>(babies[0]?.id ?? null)
  const [lastBaby, setLastBaby] = useState<BabyId | null>(null)
  const [language, setLanguage] = useState<BabyPodcastLanguage>(isBabyPodcastLanguage(ui) ? ui : 'en')
  const [mode, setMode] = useState<'write' | 'verbatim'>('write')
  const [topic, setTopic] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [prep, setPrep] = useState<{ script: string; avatarImageUrl: string; caption: string } | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const alive = useRef(true)
  const price = creditCostFor(BABY_PODCAST_QUALITY, true)

  useEffect(() => {
    alive.current = true
    try { const v = localStorage.getItem(LAST_BABY_KEY); if (v && babies.some((b) => b.id === v)) { setLastBaby(v as BabyId); setBaby(v as BabyId) } } catch { /* sem armazenamento */ }
    return () => { alive.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function prepare() {
    if (!baby) return
    setStage('preparing'); setError(null); setPrep(null); setVideoUrl(null)
    try {
      const res = await fetch('/api/baby-podcast/prepare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baby, language, topic: topic.trim(), mode }) })
      const data = await res.json().catch(() => ({})) as { script?: string; avatarImageUrl?: string; caption?: string; error?: string }
      if (!res.ok || !data.script || !data.avatarImageUrl) { setError(data.error ?? 'Something went wrong. Nothing was charged.'); setStage('idle'); return }
      setPrep({ script: data.script, avatarImageUrl: data.avatarImageUrl, caption: data.caption ?? '' })
      setStage('ready')
      try { localStorage.setItem(LAST_BABY_KEY, baby) } catch { /* sem armazenamento */ }
    } catch {
      setError('Network error. Nothing was charged.'); setStage('idle')
    }
  }

  /** POST com a reconexão de sempre (409/503 pending = o MESMO pedido ainda sendo aceito; o generationId é a chave). */
  async function postJson(url: string, body: unknown): Promise<{ res: Response; data: Record<string, unknown> }> {
    for (let i = 0; ; i++) {
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const data = await res.json().catch(() => ({})) as Record<string, unknown>
        if ((res.status === 409 || res.status === 503) && data.pending === true && i < 30) { await sleep(typeof data.retry_after_ms === 'number' ? Math.min(10000, Math.max(1000, data.retry_after_ms)) : 3000); continue }
        return { res, data }
      } catch {
        if (i >= 10) throw new Error('network')
        await sleep(3000)
      }
    }
  }

  async function make() {
    if (!prep) return
    const generationId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `baby-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const startedAt = Date.now()
    setStage('rendering'); setError(null)
    void trackEvent('baby_podcast_make_clicked', { baby, language, engine: BABY_PODCAST_ENGINE })
    try {
      const { res, data } = await postJson('/api/generate-avatar', babyAvatarPayload({ generationId, script: prep.script, language, avatarImageUrl: prep.avatarImageUrl }))
      const requestId = typeof data.avatar_request_id === 'string' ? data.avatar_request_id : ''
      const voiceoverUrl = typeof data.voiceover_url === 'string' ? data.voiceover_url : ''
      if (!res.ok || !requestId || !voiceoverUrl) { setError(typeof data.error === 'string' ? data.error : 'The baby could not start. If anything was charged, it is returned automatically.'); setStage('failed'); return }
      const realAudio = typeof data.real_audio_duration === 'number' ? data.real_audio_duration : null
      let avatarUrl = ''
      while (alive.current && !avatarUrl) {
        if (Date.now() - startedAt > DEADLINE_MS) { setError('This is taking far longer than usual. Any credits taken are returned automatically if it fails.'); setStage('failed'); return }
        await sleep(POLL_MS)
        const s = await fetch(`/api/avatar-status?request_id=${encodeURIComponent(requestId)}&engine=${BABY_PODCAST_ENGINE}`, { cache: 'no-store' }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) as Record<string, unknown> })).catch(() => null)
        if (!s) continue
        if (s.ok && s.data.status === 'done' && typeof s.data.video_url === 'string') avatarUrl = s.data.video_url
        else if (s.data.status === 'failed' || (!s.ok && s.status < 500 && s.status !== 408 && s.status !== 425 && s.status !== 429)) { setError(typeof s.data.error === 'string' ? s.data.error : 'The baby video failed. You were not charged.'); setStage('failed'); return }
      }
      if (!alive.current) return
      setStage('composing')
      const c = await postJson('/api/compose', {
        generationId, clip_urls: [], voiceover_script: prep.script, scene_captions: [], duration: BABY_PODCAST_DURATION, topic: prep.script.slice(0, 500),
        quality: BABY_PODCAST_QUALITY, language, avatar_url: avatarUrl, voiceover_url: voiceoverUrl, ...(realAudio != null ? { real_audio_duration: realAudio } : {}),
      })
      const renderId = typeof c.data.render_id === 'string' ? c.data.render_id : ''
      if (!c.res.ok || !renderId) { setError(typeof c.data.error === 'string' ? c.data.error : 'Adding captions failed. Any credits taken are returned automatically.'); setStage('failed'); return }
      const q = new URLSearchParams({ quality: BABY_PODCAST_QUALITY, resume: '1', duration: String(BABY_PODCAST_DURATION), topic: prep.script.slice(0, 500), ytdesc: prep.caption.slice(0, 600) })
      while (alive.current) {
        if (Date.now() - startedAt > DEADLINE_MS) { setError('This is taking far longer than usual. You will find the video in your library when it finishes.'); setStage('failed'); return }
        await sleep(POLL_MS)
        const s = await fetch(`/api/compose/status/${encodeURIComponent(renderId)}?${q.toString()}`, { cache: 'no-store' }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) as Record<string, unknown> })).catch(() => null)
        if (!s) continue
        if (s.ok && s.data.phase === 'done' && typeof s.data.final_video_url === 'string') {
          setVideoUrl(s.data.final_video_url); setStage('done')
          try { window.dispatchEvent(new Event('creditsChanged')) } catch { /* nada */ }
          void trackEvent('baby_podcast_ready', { baby, language, ms: Date.now() - startedAt })
          return
        }
        if (!s.ok && (s.status === 400 || s.status === 403 || s.status === 404 || s.status === 410 || s.status === 422)) { setError(typeof s.data.error === 'string' ? s.data.error : 'This render can no longer be resumed.'); setStage('failed'); return }
      }
    } catch {
      setError('Network error. Any credits taken are returned automatically if the video fails.'); setStage('failed')
    }
  }

  const busy = stage === 'preparing' || stage === 'rendering' || stage === 'composing'
  return (
    <main className="kkc" data-baby-podcast="template">
      <style dangerouslySetInnerHTML={{ __html: KIDS_TEMPLATE_CSS }} />
      <span className="kkc-badge">{BABY_PODCAST_ENGINE_LABEL} · AI-GENERATED</span>
      <h1>{t.title}</h1>
      <p className="kkc-lead">{t.lead}</p>
      {babies.length === 0 ? <section className="kkc-sec"><p className="kkc-note">{t.noBabies}</p></section> : (
        <>
          <section className="kkc-sec" aria-label={t.baby}>
            <h2>{t.baby}</h2>
            <div className="kkc-chars">
              {babies.map((b) => (
                <button key={b.id} type="button" className="kkc-char" aria-pressed={baby === b.id} onClick={() => setBaby(b.id)} disabled={busy} data-baby={b.id}>
                  <span className="kkc-face" aria-hidden="true"><img src={b.portrait} alt="" /></span>
                  <b>{b.label[language]}</b>
                  {lastBaby === b.id ? <span>{t.series}</span> : null}
                </button>
              ))}
            </div>
          </section>
          <section className="kkc-sec" aria-label={t.topic}>
            <h2>{t.topic}</h2>
            <div className="kkc-seg" style={{ marginBottom: 10 }}>
              <button type="button" aria-pressed={mode === 'write'} onClick={() => setMode('write')} disabled={busy}>{t.write}</button>
              <button type="button" aria-pressed={mode === 'verbatim'} onClick={() => setMode('verbatim')} disabled={busy}>{t.verbatim}</button>
            </div>
            <textarea value={topic} maxLength={BABY_TOPIC_MAX_CHARS} placeholder={t.topicPh} onChange={(e) => setTopic(e.target.value)} disabled={busy} />
            <div className="kkc-row" style={{ marginTop: 12 }}>
              <div>
                <h2>{t.language}</h2>
                <div className="kkc-seg">{BABY_PODCAST_LANGUAGES.map((l) => <button key={l} type="button" aria-pressed={language === l} onClick={() => setLanguage(l)} disabled={busy}>{l === 'pt' ? 'Português' : 'English'}</button>)}</div>
              </div>
            </div>
            <p className="kkc-note">{t.rules}</p>
          </section>
          {stage === 'idle' || stage === 'preparing' ? (
            <div>
              <button type="button" className="kkc-go" onClick={prepare} disabled={busy || !baby || topic.trim().length < 6}>{stage === 'preparing' ? t.preparing : t.prepare} <span aria-hidden="true">→</span></button>
              {error ? <p className="kkc-err" role="alert">{error}</p> : null}
            </div>
          ) : (
            <section className="kkc-sec" aria-label={t.script} data-baby-script="1">
              <h2>{t.script}</h2>
              <p className="kkc-story">{prep?.script}</p>
              {stage === 'ready' ? (
                <div className="kkc-row" style={{ gap: 12, alignItems: 'center' }}>
                  <button type="button" className="kkc-go" onClick={make}>{t.make} · {price} credits <span aria-hidden="true">→</span></button>
                  <button type="button" className="kkc-ghost" onClick={prepare}>{t.again}</button>
                </div>
              ) : null}
              {stage === 'ready' ? <p className="kkc-note">{t.note}</p> : null}
              {stage === 'rendering' ? <p className="kkc-note" role="status">{t.rendering}</p> : null}
              {stage === 'composing' ? <p className="kkc-note" role="status">{t.composing}</p> : null}
              {stage === 'done' && videoUrl ? (
                <div>
                  <h2 style={{ marginTop: 14 }}>{t.done}</h2>
                  <video src={videoUrl} controls playsInline style={{ width: '100%', maxWidth: 320, borderRadius: 16, display: 'block' }} />
                  <p><a className="kkc-go" href={videoUrl} download>{t.download}</a></p>
                </div>
              ) : null}
              {stage === 'failed' && error ? <p className="kkc-err" role="alert">{error}</p> : null}
              {prep?.caption ? <div className="kkc-cap"><p><b>{t.caption}</b><br />{prep.caption}<br /><small>{t.label}</small></p></div> : null}
            </section>
          )}
        </>
      )}
    </main>
  )
}
