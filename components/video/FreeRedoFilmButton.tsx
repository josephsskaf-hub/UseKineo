'use client'
// KINEO-META95-REFAZER-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — "Refazer uma cena (grátis, 1×)" no
// cartão do filme pronto. A tela só mostra e pergunta: quem decide se é grátis, se ainda dá e qual cena vale é o servidor
// (/api/free-redo/film). Depois de usada, o botão some (filme não tem refação paga). A versão anterior fica na biblioteca.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { freeRedoCopy, freeRedoFill } from '@/lib/freeRedo/copy'
import { FREE_REDO_FILM_PATH, filmMayHaveFreeRedo } from '@/lib/freeRedo/public'

type Estado = 'available' | 'unavailable' | 'working' | 'done' | 'failed_retry' | 'used'
type Cena = { index: number; number: number; text: string; clip_url: string; seconds: number | null }
type Resposta = { ok?: boolean; estado?: Estado; motivo?: string; scenes?: Cena[]; new_video_url?: string | null; retry?: boolean }

const POLL_MS = 7000

export default function FreeRedoFilmButton({ videoId, qualityMode, createdAt }: { videoId: string; qualityMode?: string | null; createdAt?: string | null }) {
  const lang = useInterfaceLanguage()
  const t = freeRedoCopy(lang)
  const coberto = filmMayHaveFreeRedo(qualityMode, createdAt)
  const [estado, setEstado] = useState<Estado | null>(null)
  const [cenas, setCenas] = useState<Cena[] | null>(null)
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [nota, setNota] = useState<string | null>(null)
  const [novaUrl, setNovaUrl] = useState<string | null>(null)
  const [volta, setVolta] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const aplicar = useCallback((r: Resposta) => {
    if (r.estado) setEstado(r.estado)
    if (r.new_video_url) setNovaUrl(r.new_video_url)
    if (r.motivo === 'teto_do_dia') setNota(t.cap)
    else if (r.estado === 'failed_retry') setNota(t.failed)
    else if (r.estado === 'unavailable') setNota(null)
  }, [t.cap, t.failed])

  const consultar = useCallback(async (lite: boolean): Promise<Resposta | null> => {
    try {
      const res = await fetch(`${FREE_REDO_FILM_PATH}?videoId=${encodeURIComponent(videoId)}${lite ? '&lite=1' : ''}`, { cache: 'no-store' })
      return (await res.json()) as Resposta
    } catch { return null }
  }, [videoId])

  useEffect(() => {
    if (!coberto) return
    let vivo = true
    consultar(true).then((r) => { if (vivo && r) aplicar(r) })
    return () => { vivo = false }
  }, [coberto, consultar, aplicar])

  // Em andamento: a consulta é o que faz a refação andar (cena pronta → montagem → versão nova).
  useEffect(() => {
    if (estado !== 'working') return
    timer.current = setTimeout(async () => {
      const r = await consultar(false)
      if (r) aplicar(r)
      setVolta((n) => n + 1) // mesma resposta "working" também agenda a próxima consulta
    }, POLL_MS)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [estado, volta, consultar, aplicar])

  const abrir = useCallback(async () => {
    setOcupado(true)
    setNota(null)
    const r = await consultar(false)
    setOcupado(false)
    if (!r) return
    if (r.scenes && r.scenes.length > 0) {
      setCenas(r.scenes)
      setEscolhida(r.scenes[0].index)
      setAberto(true)
    }
    aplicar(r)
  }, [consultar, aplicar])

  const confirmar = useCallback(async () => {
    if (escolhida === null) return
    setOcupado(true)
    try {
      const res = await fetch(FREE_REDO_FILM_PATH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId, sceneIndex: escolhida }) })
      const r = (await res.json()) as Resposta
      setAberto(false)
      aplicar(r)
    } catch { setNota(t.failed) }
    setOcupado(false)
  }, [escolhida, videoId, aplicar, t.failed])

  if (!coberto || estado === null || estado === 'unavailable') return null // KINEO-REFAZER-CENA-2710 — "usada" deixa de sumir: a tela diz "Free redo used"

  const chip = {
    gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 38,
    padding: '0 8px', borderRadius: 10, background: 'var(--card2)', border: '1px solid #a78bfa8c',
    color: 'var(--text2)', fontSize: '0.66rem', fontWeight: 700, cursor: ocupado ? 'wait' : 'pointer',
  } as const

  if (estado === 'used') { // KINEO-REFAZER-CENA-2710 — a vez acabou (2 tentativas gastas): dizer, em vez de sumir
    return <div style={{ gridColumn: '1 / -1', fontSize: '0.68rem', color: 'var(--text2)', lineHeight: 1.35 }} role="status">{t.used}</div> // KINEO-REFAZER-CENA-2710
  } // KINEO-REFAZER-CENA-2710
  if (estado === 'done') {
    return (
      <div style={{ gridColumn: '1 / -1', fontSize: '0.68rem', color: 'var(--text2)', lineHeight: 1.35 }} role="status">
        <b style={{ color: '#34d399' }}>{t.done}</b> · {t.used}{novaUrl ? <> · <a href={novaUrl} target="_blank" rel="noreferrer" style={{ color: '#a78bfa' }}>{t.open}</a></> : null}{/* KINEO-REFAZER-CENA-2710 — "Free redo used" ao lado */}
        <div style={{ opacity: 0.8 }}>{t.previous}</div>
      </div>
    )
  }
  if (estado === 'working') {
    return <div style={{ gridColumn: '1 / -1', fontSize: '0.68rem', color: 'var(--text2)', lineHeight: 1.35 }} role="status">{t.working}</div>
  }

  return (
    <div style={{ gridColumn: '1 / -1', display: 'grid', gap: 6 }}>
      {!aberto ? (
        <button type="button" className="kc-btn" onClick={abrir} disabled={ocupado} title={t.hint} aria-label={t.button} style={chip}>
          <span>{estado === 'failed_retry' ? t.retry : t.button}</span>
        </button>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 8, background: 'var(--card2)', display: 'grid', gap: 6 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text)' }}>{t.pick}</div>
          <div style={{ fontSize: '0.64rem', color: 'var(--text2)', lineHeight: 1.35 }}>{t.hint}</div>
          <div style={{ display: 'grid', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
            {(cenas ?? []).map((c) => (
              <label key={c.index} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.64rem', color: 'var(--text2)', cursor: 'pointer' }}>
                <input type="radio" name={`free-redo-${videoId}`} checked={escolhida === c.index} onChange={() => setEscolhida(c.index)} />
                <video src={c.clip_url} muted playsInline preload="metadata" style={{ width: 36, height: 64, objectFit: 'cover', borderRadius: 4, flex: '0 0 auto' }} />
                <span style={{ minWidth: 0 }}><b>{freeRedoFill(t.scene, c.number)}</b>{c.text ? ` — ${c.text}` : ''}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="kc-btn" onClick={confirmar} disabled={ocupado || escolhida === null} style={{ ...chip, gridColumn: undefined, flex: 1, background: 'var(--indigo)', color: 'var(--on-accent)', border: '1px solid var(--indigo)' }}>{t.confirm}</button>
            <button type="button" className="kc-btn" onClick={() => setAberto(false)} disabled={ocupado} style={{ ...chip, gridColumn: undefined }}>{t.cancel}</button>
          </div>
        </div>
      )}
      {nota ? <p style={{ margin: 0, fontSize: '0.64rem', color: 'var(--text2)' }} role="status">{nota}</p> : null}
    </div>
  )
}
