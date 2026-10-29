'use client'
// KINEO-REFAZER-CENA-2710 [TRAVA 8.2 — vai do fundador 27/10 "refazer essa cena liberado"] — "Redo this scene — free" na
// TELA DO FILME PRONTO (Studio). Miniaturas das cenas (o clipe de cada cena, do claim assinado) com um botão cada; em
// andamento mostra o progresso; pronto → avisa a tela (evento DOM) e o player troca para a versão nova. A tela só mostra
// e pergunta: quem decide se cabe, se é grátis e qual cena vale é o servidor (/api/free-redo/film — 1× por filme, só o
// dono, só filme concluído, linha-trava idempotente, débito ZERO). Sem direito, o servidor responde 'unavailable' e o
// painel não pinta nada (Kineo 1, família hollywood, filme de antes de 19/10).
// KINEO-REFAZER-GRATIS-2810 — no PRIMEIRO filme da conta o servidor concede 2 refações grátis: a 1ª no filme, a 2ª na
// versão nova (que nasce com a própria linha-trava). O painel de fora (SceneRedoPanel) só segue a cadeia: quando a versão
// nova fica pronta e o servidor diz que ainda sobra refação grátis, o painel passa a perguntar pela versão nova. O painel
// de dentro (PainelDaVersao) é o mesmo de 27/10, por versão. Eventos do funil: scene_redo_offer_viewed (painel com cenas
// na tela) e scene_redo_clicked (o pedido), com film_id e scene_index. Nenhum preço aqui: grátis é decisão do servidor.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { trackEvent } from '@/lib/analytics' // KINEO-REFAZER-GRATIS-2810
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
import {
  SCENE_REDO_FUNNEL_EVENTS,
  copyPrimeiroFilme,
  metaDoFunil,
  proximaVersao,
  saldoDaResposta,
  textoDoSaldo,
} from '@/lib/cinematic/refazerGratis2810' // KINEO-REFAZER-GRATIS-2810

type Saldo = { firstFilm: boolean; freeLeft: number }

/** KINEO-REFAZER-GRATIS-2810 — segue a cadeia do primeiro filme (filme → versão nova) sem nunca decidir preço. */
export default function SceneRedoPanel({ videoId }: { videoId: string }) {
  const [alvo, setAlvo] = useState(videoId)
  const [saldo, setSaldo] = useState<Saldo>({ firstFilm: false, freeLeft: 0 })
  const recusadasRef = useRef<Set<string>>(new Set())
  const pendenteRef = useRef<string | null>(null)

  useEffect(() => {
    setAlvo(videoId)
    setSaldo({ firstFilm: false, freeLeft: 0 })
    recusadasRef.current = new Set()
    pendenteRef.current = null
  }, [videoId])

  const aoResponder = useCallback((r: SceneRedoResposta) => {
    if (r && typeof (r as { free_left?: unknown }).free_left === 'number') setSaldo(saldoDaResposta(r))
    const prox = proximaVersao(r)
    pendenteRef.current = prox && !recusadasRef.current.has(prox) ? prox : null
  }, [])

  // Só DEPOIS de o player trocar para a versão nova (o painel da versão avisou a tela) o painel passa a olhar para ela.
  const aoTrocar = useCallback(() => {
    const prox = pendenteRef.current
    pendenteRef.current = null
    if (prox) setAlvo(prox)
  }, [])

  // A versão nova não tem a refação (o servidor disse 'unavailable'): volta ao filme e não tenta de novo.
  const aoSumir = useCallback((vid: string) => {
    if (vid === videoId) return
    recusadasRef.current.add(vid)
    setAlvo(videoId)
  }, [videoId])

  return <PainelDaVersao key={alvo} videoId={alvo} filmId={videoId} saldo={saldo} aoResponder={aoResponder} aoSumir={aoSumir} aoTrocar={aoTrocar} />
}

function PainelDaVersao({ videoId, filmId, saldo, aoResponder, aoSumir, aoTrocar }: {
  videoId: string
  filmId: string
  saldo: Saldo
  aoResponder: (r: SceneRedoResposta) => void
  aoSumir: (videoId: string) => void
  aoTrocar: () => void
}) {
  const lang = useInterfaceLanguage()
  const t = freeRedoCopy(lang)
  const p = copyPrimeiroFilme(lang) // KINEO-REFAZER-GRATIS-2810
  const [fase, setFase] = useState<SceneRedoFase>('hidden')
  const [cenas, setCenas] = useState<SceneRedoCena[]>([])
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [nota, setNota] = useState<string | null>(null)
  const [novaUrl, setNovaUrl] = useState<string | null>(null)
  const [volta, setVolta] = useState(0)
  const avisadaRef = useRef<string | null>(null)
  const vistaRef = useRef<string | null>(null) // KINEO-REFAZER-GRATIS-2810 — uma impressão por versão
  const ganchosRef = useRef({ aoResponder, aoSumir, aoTrocar }) // KINEO-REFAZER-GRATIS-2810
  ganchosRef.current = { aoResponder, aoSumir, aoTrocar } // KINEO-REFAZER-GRATIS-2810

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
    ganchosRef.current.aoResponder(r) // KINEO-REFAZER-GRATIS-2810 — o saldo e a cadeia (o painel de fora decide para onde olhar)
    if (f === 'hidden') ganchosRef.current.aoSumir(videoId) // KINEO-REFAZER-GRATIS-2810
  }, [t.cap, t.failed, videoId])

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
      if (!vivo) return
      if (!leve) { ganchosRef.current.aoSumir(videoId); return } // KINEO-REFAZER-GRATIS-2810 — versão nova sem resposta: o painel volta ao filme
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
    ganchosRef.current.aoTrocar() // KINEO-REFAZER-GRATIS-2810 — primeiro filme com refação sobrando: o painel segue para a versão nova
  }, [fase, novaUrl, videoId])

  // KINEO-REFAZER-GRATIS-2810 — scene_redo_offer_viewed: o painel com as miniaturas está na tela (uma vez por versão).
  useEffect(() => {
    if (fase !== 'pick' || cenas.length === 0 || vistaRef.current === videoId) return
    vistaRef.current = videoId
    void trackEvent(SCENE_REDO_FUNNEL_EVENTS.offerViewed, metaDoFunil({ filmId, videoId, sceneIndex: null, sceneCount: cenas.length, firstFilm: saldo.firstFilm, freeLeft: saldo.freeLeft, surface: 'scene_panel' }))
  }, [fase, cenas.length, videoId, filmId, saldo.firstFilm, saldo.freeLeft])

  const confirmar = useCallback(async () => {
    if (escolhida === null || ocupado) return
    const body = corpoDoPedidoDeCena(videoId, escolhida)
    if (!body) return
    setOcupado(true)
    setNota(null)
    void trackEvent(SCENE_REDO_FUNNEL_EVENTS.clicked, metaDoFunil({ filmId, videoId, sceneIndex: escolhida, sceneCount: cenas.length, firstFilm: saldo.firstFilm, freeLeft: saldo.freeLeft, surface: 'scene_panel' })) // KINEO-REFAZER-GRATIS-2810
    try {
      // O corpo leva SÓ o filme e a cena; o duplo clique cai na mesma linha-trava do servidor (mesma resposta, 1 envio).
      const res = await fetch(FREE_REDO_FILM_PATH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      aplicar((await res.json()) as SceneRedoResposta)
    } catch { setNota(t.failed) }
    setOcupado(false)
  }, [escolhida, ocupado, videoId, aplicar, t.failed, filmId, cenas.length, saldo.firstFilm, saldo.freeLeft])

  if (fase === 'hidden') return null

  const primeiro = saldo.firstFilm && saldo.freeLeft > 0 // KINEO-REFAZER-GRATIS-2810 — o primeiro filme ganha o painel em destaque
  const caixa = { width: '100%', border: primeiro ? '1px solid var(--indigo)' : '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', background: 'var(--card2)', display: 'grid', gap: 8 } as const
  const titulo = { fontSize: primeiro ? '0.92rem' : '0.8rem', fontWeight: 800, color: 'var(--text)' } as const
  const texto = { margin: 0, fontSize: '0.7rem', color: 'var(--text2)', lineHeight: 1.4 } as const

  if (fase === 'working') {
    return (
      <div data-kineo="scene-redo" style={caixa} role="status" aria-live="polite">
        <div style={titulo}>{primeiro ? p.panelTitle : t.panelTitle}</div>
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
    <div data-kineo="scene-redo" style={caixa} role="group" aria-label={primeiro ? p.panelTitle : t.panelTitle}>
      <div style={titulo}>{primeiro ? p.panelTitle : t.panelTitle}</div>
      <p style={texto}>{primeiro ? textoDoSaldo(p, saldo.freeLeft) : t.panelHint}</p>
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
                  flex: '0 0 auto', width: 84, display: 'grid', gap: 4, padding: 0, background: 'transparent', border: 'none',
                  cursor: ocupado ? 'wait' : 'pointer', color: 'var(--text2)', fontSize: '0.62rem', fontWeight: 700, textAlign: 'center',
                }}
              >
                <video
                  src={c.clip_url}
                  muted
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={event => {
                    if (c.preview_start !== undefined) {
                      try { event.currentTarget.currentTime = c.preview_start } catch { /* The same existing preview remains usable if seeking is unavailable. */ }
                    }
                  }}
                  style={{ width: 84, height: 150, objectFit: 'cover', borderRadius: 8, border: ativa ? '2px solid var(--indigo)' : '2px solid transparent', boxSizing: 'border-box' }}
                />
                <span>{freeRedoFill(t.scene, c.number)}</span>
                <span style={{ color: ativa ? 'var(--on-accent)' : '#a78bfa', background: ativa ? 'var(--indigo)' : 'transparent', border: '1px solid #a78bfa', borderRadius: 999, padding: '3px 4px', lineHeight: 1.2 }}>{t.redoThis}</span>
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
