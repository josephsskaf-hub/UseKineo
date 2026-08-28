'use client'

// KINEO-LIBRARY-2026-08-17 — a estante do usuario (fundador: "a pessoa clicar
// e ver os projetos que ela tem: videos, imagens, audios"). Padrao InVideo
// (aba Library) vestido no Studio Kit: contadores no topo (primeiro passo do
// medidor de storage do pricing V4), abas Videos/Images/Audio, grades com
// play/download, links pros ambientes de criacao quando a aba esta vazia.
import { useEffect, useState } from 'react'
import { engineLabelFor } from '@/lib/engineLabel'
import Link from 'next/link'
import { STUDIO_KIT_CSS } from '@/components/studioKit'

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

  useEffect(() => {
    Promise.all([
      fetch('/api/videos', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { videos: [] })).catch(() => ({ videos: [] })),
      fetch('/api/images', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { images: [] })).catch(() => ({ images: [] })),
      fetch('/api/audio', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { audios: [] })).catch(() => ({ audios: [] })),
    ]).then(([v, i, a]) => {
      if (Array.isArray(v?.videos)) setVids(v.videos.filter((x: Vid) => x.video_url))
      if (Array.isArray(i?.images)) setImgs(i.images)
      if (Array.isArray(a?.audios)) setAuds(a.audios)
      setLoaded(true)
    })
  }, [])

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'videos', label: 'Videos', count: vids.length },
    { key: 'images', label: 'Images', count: imgs.length },
    { key: 'audio', label: 'Audio', count: auds.length },
  ]

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

      <div className="row" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`pill${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} · {t.count}
          </button>
        ))}
      </div>

      {!loaded && <p className="sub">Loading your library…</p>}

      {loaded && tab === 'videos' && (
        vids.length === 0 ? (
          <p className="sub">No videos yet — <Link href="/studio" style={{ color: '#2997ff' }}>open the Studio</Link> and make your first film.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
            {vids.map((v) => (
              <Link key={v.id} href={`/history#v-${v.id}`} className="card" style={{ padding: 8, textDecoration: 'none' }}>
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
            ))}
          </div>
        )
      )}

      {loaded && tab === 'images' && (
        imgs.length === 0 ? (
          <p className="sub">No images yet — <Link href="/images" style={{ color: '#2997ff' }}>create your first image</Link>.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
            {imgs.map((im) => (
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
          <p className="sub">No audio yet — <Link href="/audio" style={{ color: '#2997ff' }}>generate your first voiceover</Link>.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720 }}>
            {auds.map((a) => (
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
