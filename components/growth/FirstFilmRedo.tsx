'use client'

// KINEO-REFAZER-1O-FILME-3010 [vai do fundador 30/10 "D sim — limite de 1 por conta"] — o cartão "Não ficou como pediu? Refazer
// grátis" na tela do filme pronto. Só aparece quando o servidor diz que é o 1º vídeo da conta (regra em lib/growth/
// refazerPrimeiroFilme.ts); a pessoa marca o defeito, os créditos voltam e ela vai ao Studio com a ideia preenchida.
import { useEffect, useRef, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics'
import { refazerCopy, REFAZER_DEFEITOS, REFAZER_EVENTOS, type DefeitoDoRefazer } from '@/lib/growth/refazerPrimeiroFilme'

export default function FirstFilmRedo({ videoId }: { videoId: string | null }) {
  const copy = refazerCopy(useInterfaceLanguage())
  const [eligible, setEligible] = useState(false)
  const [defect, setDefect] = useState<DefeitoDoRefazer | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const shownRef = useRef<string | null>(null)

  useEffect(() => {
    setEligible(false); setDefect(null); setMsg(null)
    if (!videoId) return
    let alive = true
    fetch(`/api/first-film-redo?video_id=${encodeURIComponent(videoId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.eligible) return
        setEligible(true)
        if (shownRef.current !== videoId) { shownRef.current = videoId; void trackEvent(REFAZER_EVENTOS.shown, { video_id: videoId, credits: d.credits }) }
      })
      .catch(() => undefined)
    return () => { alive = false }
  }, [videoId])

  if (!eligible || !videoId) return null

  async function redo() {
    if (!defect || busy) return
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/first-film-redo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ video_id: videoId, defect }) })
      const d = await r.json().catch(() => null)
      if (r.ok && d?.ok && typeof d.href === 'string') {
        setMsg(copy.done)
        window.location.assign(d.href)
        return
      }
      setMsg(typeof d?.error === 'string' ? d.error : 'Something went wrong. Please try again.')
      if (d?.reason === 'already_used') setEligible(false)
    } catch {
      setMsg('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl p-4 mb-4" data-first-film-redo="" style={{ background: 'rgba(41,151,255,.08)', border: '1px solid rgba(41,151,255,.35)' }}>
      <div className="font-black text-sm" style={{ color: 'var(--text)' }}>{copy.title}</div>
      <div className="text-xs mt-1 mb-3" style={{ color: 'var(--muted)' }}>{copy.body}</div>
      <div className="flex flex-wrap gap-2 mb-3" role="radiogroup" aria-label={copy.title}>
        {REFAZER_DEFEITOS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={defect === k} onClick={() => setDefect(k)}
            className="rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ cursor: 'pointer', border: defect === k ? '1px solid #2997ff' : '1px solid var(--border)', background: defect === k ? 'rgba(41,151,255,.18)' : 'rgba(255,255,255,.04)', color: 'var(--text)' }}>
            {copy.defects[k]}
          </button>
        ))}
      </div>
      <button type="button" disabled={!defect || busy} onClick={() => void redo()} className="rounded-xl px-5 py-2.5 font-black text-sm"
        style={{ background: defect ? '#2997ff' : 'rgba(255,255,255,.08)', color: '#fff', border: 'none', cursor: defect && !busy ? 'pointer' : 'default', opacity: busy ? 0.6 : 1 }}>
        {busy ? '…' : `↻ ${copy.go}`}
      </button>
      {msg && <div className="text-xs mt-2" role="status" style={{ color: 'var(--muted)' }}>{msg}</div>}
    </section>
  )
}
