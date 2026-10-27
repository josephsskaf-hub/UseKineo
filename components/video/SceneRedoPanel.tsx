'use client'
// KINEO-REFAZER-CENA-2710 [TRAVA 8.2 — vai do fundador 27/10 "refazer essa cena liberado"] — "Redo this scene — free" na
// TELA DO FILME PRONTO (Studio). Miniaturas das cenas (o clipe de cada cena, do claim assinado) com um botão cada; em
// andamento mostra o progresso; pronto → avisa a tela (evento DOM) e o player troca para a versão nova. A tela só mostra
// e pergunta: quem decide se cabe, se é grátis e qual cena vale é o servidor (/api/free-redo/film — 1× por filme, só o
// dono, só filme concluído, linha-trava idempotente, débito ZERO). Sem direito, o servidor responde 'unavailable' e o
// painel não pinta nada (Kineo 1, família hollywood, filme de antes de 19/10).
import { useCallback, useEffect, useRef, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { freeRedoCopy, freeRedoFill } from '@/lib/freeRedo/copy'
import { FREE_REDO_FILM_PATH } from '@/lib/freeRedo/public'
import {
  SCENE_REDO_POLL_MS,
  SCENE_REDO_SWAP_EVENT,
  cenasDoPainel,
  corpoDoPedidoDeCena,
  faseDoPainel,
  montarDetalheDaTroca,
  urlDeConsulta,
  type SceneRedoCena,
  type SceneRedoFase,
  type SceneRedoResposta,
} from '@/lib/cinematic/refazerCena'

export default function SceneRedoPanel({ videoId }: { videoId: string }) {
  const lang = useInterfaceLanguage()
  const t = freeRedoCopy(lang)
  const [fase, setFase] = useState<SceneRedoFase>('hidden')
  const [cenas, setCenas] = useState<SceneRedoCena[]>([])
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [nota, setNota] = useState<string | null>(null)
  const [novaUrl, setNovaUrl] = useState<string | null>(null)
  const [volta, setVolta] = useState(0)
  const avisadaRef = useRef<string | null>(null)

  const aplicar = useCallback((r: SceneRedoResposta | null) => {
    if (!r) return
    const f = faseDoPainel(r)
    setFase(f)
    const lista = cenasDoPainel(r)
    if (lista.length > 0) setCenas(lista)
    if (typeof r.new_video_url === 'string' && r.new_video_url) setNovaUrl(r.new_video_url)
    if (r.motivo === 'teto_do_dia') setNota(t.cap)
    else if (f === 'retry') setNota(t.failed)
    else setNota(null)
  }, [t.cap, t.failed])

  const consultar = useCallback(async (lite: boolean): Promise<SceneRedoResposta | null> => {
    try {
      const res = await fetch(urlDeConsulta(FREE_REDO_FILM_PATH, videoId, lite), { cache: 'no-store' })
      return (await res.json()) as SceneRedoResposta
    } catch { return null }
  }, [videoId])

  // Primeiro olhar: o estado (leve). Se cabe, a lista de cenas (com o claim) — é o que vira as miniaturas.
  useEffect(() => {
    let vivo = true
    setFase('hidden'); setCenas([]); setEscolhida(null); setNovaUrl(null); setNota(null)
    void (async () => {
      const leve = await consultar(true)
      if (!vivo || !leve) return
      aplicar(leve)
      const f = faseDoPainel(leve)
      if (f === 'pick' || f === 'retry' || f === 'working') {
        const cheia = await consultar(false)
        if (vivo && cheia) aplicar(cheia)
      }
    })()
    return () => { vivo = false }
  }, [videoId, consultar, aplicar])

  // Em andamento: a consulta é o que faz a refação andar (cena pronta → montagem → versão nova).
  useEffect(() => {
    if (fase !== 'working') return
    const timer = setTimeout(async () => {
      const r = await consultar(false)
      if (r) aplicar(r)
      setVolta((n) => n + 1)
    }, SCENE_REDO_POLL_MS)
    return () => clearTimeout(timer)
  }, [fase, volta, consultar, aplicar])

  // Versão nova pronta: avisa a tela UMA vez por filme — o player do Studio troca o link e retoma no mesmo ponto.
  useEffect(() => {
    if (fase !== 'done' || !novaUrl || avisadaRef.current === videoId || typeof window === 'undefined') return
    avisadaRef.current = videoId
    window.dispatchEvent(new CustomEvent(SCENE_REDO_SWAP_EVENT, { detail: montarDetalheDaTroca(videoId, novaUrl) }))
  }, [fase, novaUrl, videoId])

  const confirmar = useCallback(async () => {
    if (escolhida === null || ocupado) return
    const body = corpoDoPedidoDeCena(videoId, escolhida)
    if (!body) return
    setOcupado(true)
    setNota(null)
    try {
      // O corpo leva SÓ o filme e a cena; o duplo clique cai na mesma linha-trava do servidor (mesma resposta, 1 envio).
      const res = await fetch(FREE_REDO_FILM_PATH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      aplicar((await res.json()) as SceneRedoResposta)
    } catch { setNota(t.failed) }
    setOcupado(false)
  }, [escolhida, ocupado, videoId, aplicar, t.failed])

  if (fase === 'hidden') return null

  const caixa = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', background: 'var(--card2)', display: 'grid', gap: 8 } as const
  const titulo = { fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)' } as const
  const texto = { margin: 0, fontSize: '0.7rem', color: 'var(--text2)', lineHeight: 1.4 } as const

  if (fase === 'working') {
    return (
      <div data-kineo="scene-redo" style={caixa} role="status" aria-live="polite">
        <div style={titulo}>{t.panelTitle}</div>
        <p style={texto}>{t.working}</p>
      </div>
    )
  }

  if (fase === 'done') {
    return (
      <div data-kineo="scene-redo" style={caixa} role="status">
        <div style={titulo}><span style={{ color: '#34d399' }}>{t.done}</span> · {t.used}</div>
        <p style={texto}>
          {novaUrl ? <><a href={novaUrl} target="_blank" rel="noreferrer" style={{ color: '#a78bfa', fontWeight: 700 }}>{t.open}</a> · </> : null}
          {t.previous}
        </p>
      </div>
    )
  }

  return (
    <div data-kineo="scene-redo" style={caixa} role="group" aria-label={t.panelTitle}>
      <div style={titulo}>{t.panelTitle}</div>
      <p style={texto}>{t.panelHint}</p>
      {cenas.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {cenas.map((c) => {
            const ativa = escolhida === c.index
            return (
              <button
                key={c.index}
                type="button"
                onClick={() => setEscolhida(ativa ? null : c.index)}
                disabled={ocupado}
                aria-pressed={ativa}
                title={c.text || freeRedoFill(t.scene, c.number)}
                style={{
                  flex: '0 0 auto', width: 72, display: 'grid', gap: 4, padding: 0, background: 'transparent', border: 'none',
                  cursor: ocupado ? 'wait' : 'pointer', color: 'var(--text2)', fontSize: '0.62rem', fontWeight: 700, textAlign: 'center',
                }}
              >
                <video
                  src={c.clip_url}
                  muted
                  playsInline
                  preload="metadata"
                  style={{ width: 72, height: 128, objectFit: 'cover', borderRadius: 8, border: ativa ? '2px solid var(--indigo)' : '2px solid transparent', boxSizing: 'border-box' }}
                />
                <span>{freeRedoFill(t.scene, c.number)}</span>
                <span style={{ color: ativa ? 'var(--indigo)' : '#a78bfa' }}>{t.redoThis}</span>
              </button>
            )
          })}
        </div>
      ) : null}
      {escolhida !== null ? (
        <button
          type="button"
          className="kc-btn"
          onClick={confirmar}
          disabled={ocupado}
          style={{ minHeight: 38, borderRadius: 10, padding: '0 12px', background: 'var(--indigo)', color: 'var(--on-accent)', border: '1px solid var(--indigo)', fontSize: '0.74rem', fontWeight: 800, cursor: ocupado ? 'wait' : 'pointer' }}
        >
          {fase === 'retry' ? t.retry : freeRedoFill(t.redoScene, escolhida + 1)}
        </button>
      ) : null}
      {nota ? <p style={texto} role="status">{nota}</p> : null}
    </div>
  )
}
