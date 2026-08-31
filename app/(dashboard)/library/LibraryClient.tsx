'use client'

// KINEO-LIBRARY-2026-08-17 — a estante do usuario (fundador: "a pessoa clicar
// e ver os projetos que ela tem: videos, imagens, audios"). Padrao InVideo
// (aba Library) vestido no Studio Kit: contadores no topo (primeiro passo do
// medidor de storage do pricing V4), abas Videos/Images/Audio, grades com
// play/download, links pros ambientes de criacao quando a aba esta vazia.
import { useCallback, useEffect, useState } from 'react'
import { engineLabelFor } from '@/lib/engineLabel'
import Link from 'next/link'
import { STUDIO_KIT_CSS } from '@/components/studioKit'
import { trackEvent } from '@/lib/analytics'
import { buildSeriesContinuationHref } from '@/lib/seriesContinuation'

type Tab = 'videos' | 'images' | 'audio'

type Vid = { id: string; title: string | null; video_url: string | null; thumbnail_url: string | null; enhanced_url?: string | null; quality_mode?: string | null }
type Img = { id: string; url: string; upscaled_url?: string | null; model?: string }
type Aud = { id: string; url: string; model?: string; voice?: string | null; text?: string | null }

export default function LibraryClient() {
  const [tab, setTab] = useState<Tab>('videos')
  const [vids, setVids] = useState<Vid[]>([])
  const [imgs, setImgs] = useState<Img[]>([])
  const [auds, setAuds] = useState<Aud[]>([])
  const [loaded, setLoaded] = useState(false)
  // KINEO-SPRINT-UI3-2026-08-29 — licao do incidente JWT-skew (28/08): a
  // Library mostrava "No videos yet" quando a LEITURA falhava, com os videos
  // intactos no banco. Erro de leitura agora tem cara de erro, nao de vazio.
  const [loadFailed, setLoadFailed] = useState(false)
  // KINEO-NOITE2-2026-08-17 (#2) — o medidor de storage tambem na estante.
  const [usage, setUsage] = useState<{ total: number; limit: number | null; retention: string } | null>(null)
  useEffect(() => {
    fetch('/api/storage-usage', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && typeof d.total === 'number') setUsage(d) })
      .catch(() => {})
  }, [])
  // KINEO-NOITE2-2026-08-17 (#1) — download de verdade (blob) na estante.
  async function dl(url: string, filename: string) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    } catch { window.open(url, '_blank', 'noopener') }
  }

  const loadAll = useCallback(() => {
    setLoaded(false)
    setLoadFailed(false)
    Promise.all([
      fetch('/api/videos', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/images', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/audio', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([v, i, a]) => {
      if (v === null || i === null || a === null) setLoadFailed(true)
      if (Array.isArray(v?.videos)) setVids(v.videos.filter((x: Vid) => x.video_url))
      if (Array.isArray(i?.images)) setImgs(i.images)
      if (Array.isArray(a?.audios)) setAuds(a.audios)
      setLoaded(true)
    })
  }, [])
  useEffect(() => { loadAll() }, [loadAll])

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'videos', label: 'Videos', count: vids.length },
    { key: 'images', label: 'Images', count: imgs.length },
    { key: 'audio', label: 'Audio', count: auds.length },
  ]

  // KINEO-SPRINT-UI10-2026-08-30 — busca na estante (continuacao do sprint
  // #9): /history e /my-videos ganharam busca; a Library — a UNICA tela que
  // junta videos, imagens e audio — ficou de fora. Filtro instantaneo em
  // memoria (zero rede), por aba: video=titulo, imagem=motor, audio=texto/
  // voz/motor. Contadores das abas seguem contando o acervo TOTAL.
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const fVids = needle ? vids.filter((v) => (v.title ?? '').toLowerCase().includes(needle)) : vids
  const fImgs = needle ? imgs.filter((im) => (im.model ?? '').toLowerCase().includes(needle)) : imgs
  const fAuds = needle ? auds.filter((a) => [a.text, a.voice, a.model].filter(Boolean).join(' ').toLowerCase().includes(needle)) : auds
  const activeCount = tab === 'videos' ? vids.length : tab === 'images' ? imgs.length : auds.length
  const clearBtn = (
    <button type="button" className="pill" onClick={() => setQ('')} style={{ color: '#2997ff', borderColor: 'rgba(41,151,255,.4)' }}>
      Clear search
    </button>
  )

  return (
    <div className="stu">
      <style dangerouslySetInnerHTML={{ __html: STUDIO_KIT_CSS }} />

      <h1>Library</h1>
      <p className="sub">
        Everything you’ve created, in one place.
        {usage && (
          <span style={{ marginLeft: 10, fontSize: 12, color: '#7cc0ff', fontWeight: 700 }}>
            {usage.limit ? `${usage.total} of ${usage.limit} projects` : `${usage.total} projects · unlimited`} · {usage.retention}
          </span>
        )}
      </p>

      {/* KINEO-SPRINT-V1V4-2026-08-31 (#1) — CAMINHO DE VOLTA PARA CRIAR.
          A Library e a unica tela do acervo que so oferecia link de criacao
          no ESTADO VAZIO (o link em prosa logo abaixo, na aba de videos):
          aparecia quando nao servia para retencao e sumia no instante em que
          passaria a servir — logo depois do 1o video. Agora o botao de criar
          e fixo no topo, e vem com a contagem honesta do proprio acervo. */}
      {loaded && !loadFailed && (
        <div
          className="row"
          style={{ marginBottom: 18, alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
        >
          <Link
            href="/studio"
            className="pill on"
            style={{ textDecoration: 'none', fontWeight: 800 }}
            onClick={() => {
              void trackEvent('library_create_clicked', {
                tab,
                video_count: vids.length,
                placement: 'header',
              })
            }}
          >
            ⚡ New video
          </Link>
          {vids.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span aria-hidden="true" style={{ display: 'inline-flex', gap: 4 }}>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 99,
                      background: i < Math.min(vids.length, 4) ? '#34d399' : 'rgba(255,255,255,.16)',
                    }}
                  />
                ))}
              </span>
              <span style={{ fontSize: 12, color: 'var(--txt2,#9aa0a6)', fontWeight: 700 }}>
                {vids.length >= 4
                  ? `${vids.length} Shorts made`
                  : `${vids.length} of your first 4 Shorts`}
              </span>
            </span>
          )}
        </div>
      )}

      <div className="row" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`pill${tab === t.key ? ' on' : ''}`} onClick={() => { setTab(t.key); setQ('') }}>
            {t.label} · {t.count}
          </button>
        ))}
      </div>

      {loaded && activeCount >= 6 && (
        <div style={{ position: 'relative', maxWidth: 420, marginBottom: 16 }}>
          <span aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.55 }}>🔍</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === 'videos' ? 'Search your videos…' : tab === 'images' ? 'Search your images…' : 'Search your audio…'}
            aria-label={tab === 'videos' ? 'Search your videos by title' : tab === 'images' ? 'Search your images by engine' : 'Search your audio by text or voice'}
            style={{ width: '100%', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', color: '#f5f5f7', fontSize: 16, padding: '11px 14px 11px 38px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      )}

      {!loaded && (
        <div aria-label="Loading your library" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
          <style>{'@keyframes libsk{0%{background-position:200% 0}100%{background-position:-200% 0}}'}</style>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '9/16', borderRadius: 12, border: '1px solid rgba(255,255,255,.06)', background: 'linear-gradient(100deg, rgba(255,255,255,.035) 40%, rgba(255,255,255,.09) 50%, rgba(255,255,255,.035) 60%)', backgroundSize: '200% 100%', animation: 'libsk 1.4s linear infinite', animationDelay: `${(i % 3) * 120}ms` }} />
          ))}
        </div>
      )}

      {loaded && loadFailed && (
        <div role="alert" className="card" style={{ padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', border: '1px solid rgba(251,191,36,.35)', background: 'rgba(251,191,36,.06)' }}>
          <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700 }}>We couldn’t load part of your library right now.</span>
          <span style={{ fontSize: 12.5, color: 'var(--txt2,#9aa0a6)' }}>Your videos and credits are safe — this is just a temporary read hiccup.</span>
          <button type="button" className="pill" onClick={loadAll}>↻ Try again</button>
        </div>
      )}

      {loaded && tab === 'videos' && (
        vids.length === 0 ? (
          loadFailed ? null : <p className="sub">No videos yet — <Link href="/studio" style={{ color: '#2997ff' }}>open the Studio</Link> and make your first film.</p>
        ) : fVids.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <p className="sub" style={{ marginBottom: 14 }}>No videos match &ldquo;{q.trim()}&rdquo;.</p>
            {clearBtn}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
            {fVids.map((v) => (
              <div key={v.id} className="card" style={{ padding: 8 }}>
                <Link href={`/history#v-${v.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                <div style={{ position: 'relative', aspectRatio: '9/16', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
                  {v.enhanced_url && (
                    <span style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 99, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.45)', color: '#34d399' }}>✨ HD</span>
                  )}
                  {/* KINEO-SELO-MOTOR-2026-08-28 — o motor real do vídeo,
                      mapa único em lib/engineLabel.ts (pedido do fundador). */}
                  {engineLabelFor(v.quality_mode) && (
                    <span style={{ position: 'absolute', top: 6, left: 6, zIndex: 2, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 99, background: 'rgba(41,151,255,0.2)', border: '1px solid rgba(41,151,255,0.5)', color: '#7cc0ff' }}>{engineLabelFor(v.quality_mode)}</span>
                  )}
                  <video
                    src={v.enhanced_url ?? v.video_url ?? undefined}
                    poster={v.thumbnail_url ?? undefined}
                    muted
                    playsInline
                    preload="metadata"
                    onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                {v.title && (
                  <div style={{ marginTop: 7, fontSize: 11.5, color: 'var(--txt2,#9aa0a6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.title}
                  </div>
                )}
                </Link>
                {/* KINEO-SPRINT-V1V4-2026-08-31 (#1) — cada card era um beco:
                    levava para /history e acabava ali. Agora o card devolve o
                    TEMA para o Studio (mesmo motor do /history e da tela de
                    "video pronto": buildSeriesContinuationHref), para o 2o
                    video nao exigir escrever tudo de novo. */}
                {v.title && (
                  <Link
                    href={buildSeriesContinuationHref(v.title, 'library_video_card')}
                    className="pill"
                    style={{ marginTop: 8, display: 'block', textAlign: 'center', textDecoration: 'none', fontSize: 11.5, fontWeight: 700, color: '#7cc0ff', borderColor: 'rgba(41,151,255,.35)' }}
                    onClick={() => {
                      void trackEvent('series_continue_clicked', {
                        source: 'library_video_card',
                        video_id: v.id,
                        completed_video_count: vids.length,
                      })
                    }}
                  >
                    Next episode →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {loaded && tab === 'images' && (
        imgs.length === 0 ? (
          loadFailed ? null : <p className="sub">No images yet — <Link href="/images" style={{ color: '#2997ff' }}>create your first image</Link>.</p>
        ) : fImgs.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <p className="sub" style={{ marginBottom: 14 }}>No images match &ldquo;{q.trim()}&rdquo;.</p>
            {clearBtn}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
            {fImgs.map((im) => (
              <div key={im.id} className="card" style={{ padding: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.upscaled_url ?? im.url} alt="" style={{ width: '100%', borderRadius: 10, display: 'block' }} />
                <div className="row" style={{ marginTop: 8 }}>
                  <button type="button" className="pill" onClick={() => dl(im.upscaled_url ?? im.url, `kineo-image-${im.id.slice(0, 6)}.png`)}>⬇ Download</button>
                  <a className="pill" style={{ textDecoration: 'none' }} href="/animate">🎬 Animate</a>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {loaded && tab === 'audio' && (
        auds.length === 0 ? (
          loadFailed ? null : <p className="sub">No audio yet — <Link href="/audio" style={{ color: '#2997ff' }}>generate your first voiceover</Link>.</p>
        ) : fAuds.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <p className="sub" style={{ marginBottom: 14 }}>No audio matches &ldquo;{q.trim()}&rdquo;.</p>
            {clearBtn}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720 }}>
            {fAuds.map((a) => (
              <div key={a.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <audio controls preload="none" src={a.url} style={{ flex: '1 1 260px', height: 36 }} />
                <span style={{ fontSize: 11.5, color: 'var(--txt2,#9aa0a6)' }}>{a.model}{a.voice ? ` · ${a.voice}` : ''}</span>
                <button type="button" className="pill" onClick={() => dl(a.url, `kineo-audio-${a.id.slice(0, 6)}.mp3`)}>⬇</button>
                {a.text && <div style={{ flexBasis: '100%', fontSize: 12, color: 'var(--txt2,#9aa0a6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.text}</div>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
