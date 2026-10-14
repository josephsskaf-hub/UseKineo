'use client'
// KINEO-ADS-POS-ENTREGA-1510 — o painel DEPOIS DA ENTREGA do anúncio v2 (fundador 15/10: agência usando sozinha). Três ferramentas
// sobre os MESMOS clipes (nada volta à fal): Editar (frases, cartão final, música, ordem das cenas) · Enviar para aprovação (link
// privado para o cliente da agência) · Baixar 9:16 + 4:5 + 1:1. Cada aplicação vira uma versão nova; as anteriores ficam na
// biblioteca. Componente autônomo: entra no resultado das duas telas (simples e completa) com uma linha.
// Rotas: /api/ads/v2/edit · /versions · /formats · /approval (lib/ads/v2PostDelivery.ts tem o porquê de cada regra).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { drawEndCard, loadLogoImage, toPngFile } from '@/lib/ads/endCard'
import { uploadFootage } from '@/lib/ads/uploadFootage'
import { adsV2PosEntregaCopy, fillPosEntrega, type AdsV2PosEntregaCopy } from '@/lib/ads/v2PostDeliveryCopy'
import { ADS_V2_APPROVAL_DAYS, ADS_V2_EDIT_OVERLAY_MAX_CHARS } from '@/lib/ads/v2PostDelivery'
import { INTERFACE_LANGUAGE_OPTIONS, type InterfaceLanguage } from '@/lib/ui/interfaceLanguage'

type EditData = {
  order_id: string
  editable: boolean
  reason?: string
  format?: string
  overlays?: { text: string }[]
  shots?: { idx: number; kind: string; url: string; seconds: number; nine_only: boolean; packshot: boolean }[]
  music?: { current: string; tracks: string[] }
  voice_locked?: boolean
  has_voice?: boolean
  presenter?: boolean
  card?: { url: string; business: string; price: string; contact: string; logo_url: string | null; photo_url: string | null }
  credits?: number
}
type VersionView = { id: string; version: number; kind: 'edit' | 'format' | 'original'; format: string; status: 'rendering' | 'delivered' | 'failed'; video_url: string | null; error?: string | null; batch_id?: string | null }
type ApprovalView = { id: string; order_id: string; version_id: string | null; status: string; comment: string | null; brand_name: string; created_at: string; decided_at: string | null; viewed: boolean }
type Api<T> = { ok: true; data: T } | { ok: false; status: number; code: string; body: Record<string, unknown> }

async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<Api<T>> {
  try {
    const r = await fetch(url, { method: init?.method ?? 'GET', headers: init?.body !== undefined ? { 'content-type': 'application/json' } : undefined, body: init?.body !== undefined ? JSON.stringify(init.body) : undefined, cache: 'no-store' })
    const body = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (r.ok) return { ok: true, data: body as T }
    return { ok: false, status: r.status, code: typeof body.error === 'string' ? body.error : 'failed', body }
  } catch {
    return { ok: false, status: 0, code: 'network', body: {} }
  }
}

function errText(c: AdsV2PosEntregaCopy, r: { code: string; body: Record<string, unknown> }): string {
  if (r.code === 'not_ready') return c.errNotReady
  if (r.code === 'too_many_rendering') return c.errBusy
  if (r.code === 'max_versions') return c.errMax
  if (r.code === 'voice_too_long') return c.errVoice
  if (r.code === 'bad_brand_name') return c.errBrand
  if (r.code === 'nothing_changed') return c.nothing
  if (r.code === 'moderation' && typeof r.body.message === 'string') return r.body.message
  return c.errGeneric
}

function trackLabel(c: AdsV2PosEntregaCopy, t: string): string {
  const m = /^([a-z]+)-(\d{2})\.mp3$/.exec(t)
  if (!m) return t
  const mood = m[1] === 'emotional' ? c.moodEmotional : m[1] === 'epic' ? c.moodEpic : m[1] === 'tech' ? c.moodTech : m[1]
  return `${mood} ${Number(m[2])}`
}

async function localImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null
  try {
    const r = await fetch(url, { cache: 'force-cache' })
    if (!r.ok) return null
    return await loadLogoImage(URL.createObjectURL(await r.blob()))
  } catch {
    return null
  }
}

const CSS = `
.adv2pe{margin-top:26px;padding-top:22px;border-top:1px solid var(--ads-line)}
.adv2pe h3{margin:0 0 4px}
.adv2pe .pe-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 16px}
.adv2pe .pe-tab{min-height:40px;padding:8px 14px;border-radius:10px;border:1px solid var(--ads-line);background:transparent;color:var(--ads-text);font:inherit;font-weight:650;cursor:pointer}
.adv2pe .pe-tab[aria-selected="true"]{border-color:var(--ads-accent);background:var(--ads-tint);color:var(--ads-accent)}
.adv2pe .pe-grid{display:grid;gap:18px}
.adv2pe fieldset{margin:0;padding:0;border:0;min-width:0}
.adv2pe legend{font-weight:700;margin-bottom:8px;padding:0}
.adv2pe .pe-field{display:grid;gap:4px;margin-bottom:10px;font-size:14px;font-weight:600}
.adv2pe .pe-field input[type=text],.adv2pe select,.adv2pe .pe-field input:not([type]){min-height:40px;padding:6px 10px;border-radius:9px;border:1px solid var(--ads-line);background:var(--ads-card);color:var(--ads-text);font:inherit;font-weight:500;width:100%}
.adv2pe .pe-shots{display:grid;gap:8px;list-style:none;margin:0;padding:0}
.adv2pe .pe-shot{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:10px;align-items:center;padding:6px;border:1px solid var(--ads-line);border-radius:11px;background:var(--ads-card)}
.adv2pe .pe-shot[data-drag="over"]{border-color:var(--ads-accent)}
.adv2pe .pe-shot.off{opacity:.55}
.adv2pe .pe-thumb{width:52px;height:72px;border-radius:7px;object-fit:cover;background:#000;display:block}
.adv2pe .pe-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.adv2pe .pe-mini{min-height:34px;min-width:34px;padding:4px 10px;border-radius:8px;border:1px solid var(--ads-line);background:transparent;color:var(--ads-text);font:inherit;font-size:13px;cursor:pointer}
.adv2pe .pe-mini:disabled{opacity:.4;cursor:default}
.adv2pe .pe-card{display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:14px;align-items:start}
.adv2pe .pe-card canvas,.adv2pe .pe-card img{width:120px;aspect-ratio:9/16;border-radius:9px;border:1px solid var(--ads-line);display:block;object-fit:cover}
@media (max-width:560px){.adv2pe .pe-card{grid-template-columns:1fr}.adv2pe .pe-card canvas,.adv2pe .pe-card img{width:110px}}
.adv2pe .pe-versions{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:10px}
.adv2pe .pe-ver{border:1px solid var(--ads-line);border-radius:12px;padding:8px;background:var(--ads-card);display:grid;gap:6px;min-width:0}
.adv2pe .pe-ver video{width:100%;aspect-ratio:9/16;object-fit:contain;background:#000;border-radius:8px}
.adv2pe .pe-ver[data-format="1:1"] video{aspect-ratio:1/1}
.adv2pe .pe-ver[data-format="4:5"] video{aspect-ratio:4/5}
.adv2pe .pe-ver b{font-size:14px}
.adv2pe .pe-small{font-size:12.5px;color:var(--ads-muted,#6b7480)}
.adv2pe .pe-link{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.adv2pe .pe-link input{flex:1 1 220px;min-height:40px;padding:6px 10px;border-radius:9px;border:1px solid var(--ads-line);background:var(--ads-bg);color:var(--ads-text);font:inherit;font-size:13px}
.adv2pe .pe-appr{display:grid;gap:8px;list-style:none;margin:8px 0 0;padding:0}
.adv2pe .pe-appr li{border:1px solid var(--ads-line);border-radius:11px;padding:10px 12px;display:grid;gap:4px}
.adv2pe .pe-chip{display:inline-block;padding:2px 9px;border-radius:99px;font-size:12.5px;font-weight:700;border:1px solid var(--ads-line)}
.adv2pe .pe-chip[data-s="approved"]{color:#0f8a4b;border-color:#0f8a4b}
.adv2pe .pe-chip[data-s="changes_requested"]{color:#b4530a;border-color:#b4530a}
`

export default function AdsV2AfterDelivery({ orderId, lang }: { orderId: string; lang: InterfaceLanguage }) {
  const c = adsV2PosEntregaCopy(lang)
  const [tab, setTab] = useState<'edit' | 'share' | 'formats'>('edit')
  const [data, setData] = useState<EditData | null>(null)
  const [original, setOriginal] = useState<VersionView | null>(null)
  const [versions, setVersions] = useState<VersionView[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<null | 'apply' | 'formats' | 'share'>(null)
  // edição
  const [overlays, setOverlays] = useState<string[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [removed, setRemoved] = useState<number[]>([])
  const [music, setMusic] = useState('keep')
  const [cardMode, setCardMode] = useState<'keep' | 'redraw'>('keep')
  const [card, setCard] = useState({ title: '', cta: '', contact: '', price: '', color: '#2997ff' })
  const [logoMode, setLogoMode] = useState<'keep' | 'change' | 'remove'>('keep')
  const [logoFileUrl, setLogoFileUrl] = useState<string | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // aprovação
  const [shareVersion, setShareVersion] = useState('original')
  const [brand, setBrand] = useState('')
  const [shareLang, setShareLang] = useState<InterfaceLanguage>(lang)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [approvals, setApprovals] = useState<ApprovalView[]>([])

  const loadVersions = useCallback(async () => {
    const r = await api<{ original: VersionView | null; versions: VersionView[] }>(`/api/ads/v2/versions?order_id=${encodeURIComponent(orderId)}`)
    if (!r.ok) return
    setOriginal(r.data.original)
    setVersions(Array.isArray(r.data.versions) ? r.data.versions : [])
  }, [orderId])
  const loadApprovals = useCallback(async () => {
    const r = await api<{ approvals: ApprovalView[] }>('/api/ads/v2/approval')
    if (r.ok) setApprovals(Array.isArray(r.data.approvals) ? r.data.approvals : [])
  }, [])

  useEffect(() => {
    let stop = false
    void (async () => {
      const r = await api<EditData>(`/api/ads/v2/edit?order_id=${encodeURIComponent(orderId)}`)
      if (stop) return
      if (!r.ok) { setErr(errText(c, r)); return }
      setData(r.data)
      setOverlays((r.data.overlays ?? []).map((o) => o.text))
      setOrder((r.data.shots ?? []).map((s) => s.idx))
      setCard((cur) => ({ ...cur, title: r.data.card?.business ?? '', contact: r.data.card?.contact ?? '', price: r.data.card?.price ?? '' }))
      setBrand(r.data.card?.business ?? '')
    })()
    void loadVersions()
    void loadApprovals()
    return () => { stop = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  // Montagem em andamento: a lista se atualiza sozinha (a rota consulta o Creatomate e grava a versão pronta).
  const rendering = versions.some((v) => v.status === 'rendering')
  useEffect(() => {
    if (!rendering) return
    const t = window.setInterval(() => void loadVersions(), 6000)
    return () => window.clearInterval(t)
  }, [rendering, loadVersions])

  // Prévia do cartão novo (o MESMO desenho que sobe).
  const drawCard = useCallback(async (canvas: HTMLCanvasElement) => {
    const logo = logoMode === 'remove' ? null : logoMode === 'change' ? (logoFileUrl ? await loadLogoImage(logoFileUrl).catch(() => null) : null) : await localImage(data?.card?.logo_url ?? null)
    const productImage = await localImage(data?.card?.photo_url ?? null)
    drawEndCard(canvas, { logo, business: card.title.trim(), offer: card.price.trim(), ctaLabel: card.cta.trim(), contact: card.contact.trim(), accent: card.color, brandBg: true, productImage })
  }, [card, logoMode, logoFileUrl, data])
  useEffect(() => {
    if (cardMode !== 'redraw' || !canvasRef.current) return
    const t = window.setTimeout(() => { if (canvasRef.current) void drawCard(canvasRef.current).catch(() => null) }, 160)
    return () => window.clearTimeout(t)
  }, [cardMode, drawCard])

  const shotsByIdx = useMemo(() => new Map((data?.shots ?? []).map((s) => [s.idx, s] as const)), [data])
  const baseOrder = useMemo(() => (data?.shots ?? []).map((s) => s.idx), [data])
  const overlaysChanged = (data?.overlays ?? []).some((o, i) => o.text !== (overlays[i] ?? ''))
  const orderChanged = JSON.stringify(order) !== JSON.stringify(baseOrder)
  const changed = overlaysChanged || orderChanged || music !== 'keep' || cardMode === 'redraw'

  function move(pos: number, delta: number) {
    setOrder((cur) => {
      const next = [...cur]
      const to = pos + delta
      if (to < 0 || to >= next.length) return cur
      ;[next[pos], next[to]] = [next[to], next[pos]]
      return next
    })
  }
  function dropOn(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) return
    setOrder((cur) => {
      const from = cur.indexOf(dragIdx)
      const to = cur.indexOf(targetIdx)
      if (from < 0 || to < 0) return cur
      const next = [...cur]
      next.splice(from, 1)
      next.splice(to, 0, dragIdx)
      return next
    })
    setDragIdx(null)
  }
  function removeShot(idx: number) {
    if (order.length <= 1) return
    setOrder((cur) => cur.filter((i) => i !== idx))
    setRemoved((cur) => [...cur, idx])
  }
  function restoreShot(idx: number) {
    setRemoved((cur) => cur.filter((i) => i !== idx))
    setOrder((cur) => [...cur, idx])
  }

  async function apply() {
    if (!data || busy || !changed) { if (!changed) setErr(c.nothing); return }
    setBusy('apply')
    setErr(null)
    try {
      let cardFootageId: string | null = null
      if (cardMode === 'redraw') {
        const canvas = document.createElement('canvas')
        await drawCard(canvas)
        const up = await uploadFootage(await toPngFile(canvas))
        cardFootageId = up.footageId
      }
      const r = await api<{ version: VersionView }>('/api/ads/v2/edit', {
        method: 'POST',
        body: { order_id: orderId, ...(overlaysChanged ? { overlays } : {}), ...(orderChanged ? { order } : {}), music, ...(cardFootageId ? { card_footage_id: cardFootageId } : {}) },
      })
      if (!r.ok) { setErr(errText(c, r)); return }
      setVersions((cur) => [...cur, r.data.version])
    } catch {
      setErr(c.errGeneric)
    } finally {
      setBusy(null)
    }
  }

  async function getFormats() {
    if (busy) return
    setBusy('formats')
    setErr(null)
    const r = await api<{ versions: VersionView[] }>('/api/ads/v2/formats', { method: 'POST', body: { order_id: orderId } })
    setBusy(null)
    if (!r.ok) { setErr(errText(c, r)); return }
    await loadVersions()
  }

  async function share() {
    if (busy) return
    setBusy('share')
    setErr(null)
    setLink(null)
    setCopied(false)
    const r = await api<{ url: string }>('/api/ads/v2/approval', { method: 'POST', body: { order_id: orderId, version_id: shareVersion, brand_name: brand, lang: shareLang } })
    setBusy(null)
    if (!r.ok) { setErr(errText(c, r)); return }
    setLink(r.data.url)
    void loadApprovals()
  }
  async function revoke(id: string) {
    const r = await api('/api/ads/v2/approval', { method: 'POST', body: { action: 'revoke', approval_id: id } })
    if (!r.ok) { setErr(errText(c, r)); return }
    void loadApprovals()
  }

  const delivered = [original, ...versions].filter((v): v is VersionView => !!v && v.status === 'delivered')
  const label = (v: VersionView) => (v.kind === 'original' ? c.original : fillPosEntrega(c.versionN, { n: v.version })) + (v.format && v.format !== '9:16' ? ` · ${v.format}` : '')
  const statusText = (s: string) => (s === 'approved' ? c.stApproved : s === 'changes_requested' ? c.stChanges : s === 'revoked' || s === 'expired' ? c.stRevoked : c.stPending)
  const mine = approvals.filter((a) => a.order_id === orderId)
  const others = approvals.filter((a) => a.order_id !== orderId)

  if (data && !data.editable) return null
  return (
    <section className="adv2pe" aria-labelledby="adv2pe-title" data-kineo="ads-after-delivery">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h3 id="adv2pe-title">{c.title}</h3>
      <p className="adsw-hint" style={{ margin: 0 }}>{c.lead} {c.free}</p>
      <div className="pe-tabs" role="tablist" aria-label={c.title}>
        {(['edit', 'share', 'formats'] as const).map((t) => (
          <button key={t} type="button" role="tab" className="pe-tab" aria-selected={tab === t} data-kineo={`ads-pe-tab-${t}`} onClick={() => { setTab(t); setErr(null) }}>
            {t === 'edit' ? c.tabEdit : t === 'share' ? c.tabShare : c.tabFormats}
          </button>
        ))}
      </div>

      {tab === 'edit' && data ? (
        <div className="pe-grid" role="tabpanel" data-kineo="ads-pe-editor">
          {(data.overlays ?? []).length ? (
            <fieldset>
              <legend>{c.phrases}</legend>
              {overlays.map((t, i) => (
                <label key={i} className="pe-field">
                  {fillPosEntrega(c.phraseN, { n: i + 1 })}
                  <input type="text" value={t} maxLength={ADS_V2_EDIT_OVERLAY_MAX_CHARS} onChange={(e) => setOverlays((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))} />
                </label>
              ))}
            </fieldset>
          ) : null}

          <fieldset>
            <legend>{c.order}</legend>
            <p className="adsw-hint" style={{ margin: '0 0 8px' }}>{c.orderHint}</p>
            <ol className="pe-shots">
              {order.map((idx, pos) => {
                const s = shotsByIdx.get(idx)
                if (!s) return null
                return (
                  <li key={idx} className="pe-shot" draggable onDragStart={() => setDragIdx(idx)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropOn(idx)} data-drag={dragIdx !== null && dragIdx !== idx ? 'over' : undefined}>
                    {s.kind === 'text' ? <img className="pe-thumb" src={s.url} alt="" /> : <video className="pe-thumb" src={`${s.url}#t=0.5`} muted playsInline preload="metadata" />}
                    <span>{fillPosEntrega(c.shotN, { n: baseOrder.indexOf(idx) + 1 })} <span className="pe-small">· {s.seconds}s</span></span>
                    <span className="pe-row">
                      <button type="button" className="pe-mini" aria-label={c.up} disabled={pos === 0} onClick={() => move(pos, -1)}>↑</button>
                      <button type="button" className="pe-mini" aria-label={c.down} disabled={pos === order.length - 1} onClick={() => move(pos, 1)}>↓</button>
                      <button type="button" className="pe-mini" disabled={order.length <= 1} onClick={() => removeShot(idx)}>{c.remove}</button>
                    </span>
                  </li>
                )
              })}
              {removed.map((idx) => {
                const s = shotsByIdx.get(idx)
                if (!s) return null
                return (
                  <li key={`off-${idx}`} className="pe-shot off">
                    {s.kind === 'text' ? <img className="pe-thumb" src={s.url} alt="" /> : <video className="pe-thumb" src={`${s.url}#t=0.5`} muted playsInline preload="metadata" />}
                    <span>{fillPosEntrega(c.shotN, { n: baseOrder.indexOf(idx) + 1 })}</span>
                    <button type="button" className="pe-mini" onClick={() => restoreShot(idx)}>{c.restore}</button>
                  </li>
                )
              })}
            </ol>
          </fieldset>

          <fieldset>
            <legend>{c.music}</legend>
            <select aria-label={c.music} value={music} onChange={(e) => setMusic(e.target.value)}>
              <option value="keep">{c.musicKeep}</option>
              <option value="none">{c.musicNone}</option>
              {(data.music?.tracks ?? []).map((t) => <option key={t} value={t}>{trackLabel(c, t)}</option>)}
            </select>
          </fieldset>

          <fieldset>
            <legend>{c.card}</legend>
            <div className="pe-row" role="radiogroup" aria-label={c.card} style={{ marginBottom: 10 }}>
              <label className="pe-row"><input type="radio" name="pe-card" checked={cardMode === 'keep'} onChange={() => setCardMode('keep')} /> {c.cardKeep}</label>
              <label className="pe-row"><input type="radio" name="pe-card" checked={cardMode === 'redraw'} onChange={() => setCardMode('redraw')} /> {c.cardRedraw}</label>
            </div>
            <div className="pe-card">
              {cardMode === 'redraw' ? (
                <div>
                  <label className="pe-field">{c.cardTitle}<input type="text" value={card.title} maxLength={80} onChange={(e) => setCard({ ...card, title: e.target.value })} /></label>
                  <label className="pe-field">{c.cardPrice}<input type="text" value={card.price} maxLength={60} onChange={(e) => setCard({ ...card, price: e.target.value })} /></label>
                  <label className="pe-field">{c.cardCta}<input type="text" value={card.cta} maxLength={40} onChange={(e) => setCard({ ...card, cta: e.target.value })} /></label>
                  <label className="pe-field">{c.cardContact}<input type="text" value={card.contact} maxLength={80} onChange={(e) => setCard({ ...card, contact: e.target.value })} /></label>
                  <label className="pe-field">{c.cardColor}<input type="color" value={card.color} onChange={(e) => setCard({ ...card, color: e.target.value })} style={{ width: 64, height: 36 }} /></label>
                  <div className="pe-field">
                    {c.cardLogo}
                    <div className="pe-row">
                      <label className="pe-mini" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {c.cardLogoChange}
                        <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setLogoFileUrl(URL.createObjectURL(f)); setLogoMode('change') } }} />
                      </label>
                      <button type="button" className="pe-mini" onClick={() => { setLogoMode('remove'); setLogoFileUrl(null) }}>{c.cardLogoRemove}</button>
                    </div>
                  </div>
                </div>
              ) : <div />}
              {cardMode === 'redraw' ? <canvas ref={canvasRef} aria-label={c.card} /> : data.card?.url ? <img src={data.card.url} alt={c.card} /> : null}
            </div>
          </fieldset>

          {data.presenter ? <p className="adv2-note" role="note">{c.presenterLocked}</p> : data.has_voice ? <p className="adv2-note" role="note">{c.voiceLocked}</p> : null}
          <div className="adv2-actions" style={{ marginTop: 0 }}>
            <button type="button" className="adsw-btn" disabled={busy !== null} onClick={() => void apply()} data-kineo="ads-pe-apply">{busy === 'apply' ? c.applying : c.apply}</button>
          </div>
        </div>
      ) : null}

      {tab === 'share' ? (
        <div className="pe-grid" role="tabpanel" data-kineo="ads-pe-share">
          <p className="adsw-hint" style={{ margin: 0 }}>{c.shareLead}</p>
          <label className="pe-field">{c.video}
            <select value={shareVersion} onChange={(e) => setShareVersion(e.target.value)}>
              {delivered.map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
            </select>
          </label>
          <label className="pe-field">{c.brand}<input type="text" value={brand} maxLength={60} onChange={(e) => setBrand(e.target.value)} /></label>
          <label className="pe-field">{c.pageLang}
            <select value={shareLang} onChange={(e) => setShareLang(e.target.value as InterfaceLanguage)}>
              {INTERFACE_LANGUAGE_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.native}</option>)}
            </select>
          </label>
          <div className="adv2-actions" style={{ marginTop: 0 }}>
            <button type="button" className="adsw-btn" disabled={busy !== null || !brand.trim()} onClick={() => void share()} data-kineo="ads-pe-share-create">{c.create}</button>
          </div>
          {link ? (
            <div>
              <div className="pe-link">
                <input readOnly value={link} aria-label={c.share} onFocus={(e) => e.currentTarget.select()} />
                <button type="button" className="pe-mini" onClick={() => { void navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => null) }}>{copied ? c.copied : c.copy}</button>
              </div>
              <p className="pe-small">{fillPosEntrega(c.linkNote, { days: ADS_V2_APPROVAL_DAYS })}</p>
            </div>
          ) : null}
          <div>
            <b>{c.approvals}</b>
            {mine.length + others.length === 0 ? <p className="pe-small">{c.noApprovals}</p> : null}
            <ul className="pe-appr">
              {[...mine, ...others].map((a) => (
                <li key={a.id} data-kineo="ads-pe-approval">
                  <span className="pe-row"><span className="pe-chip" data-s={a.status}>{statusText(a.status)}</span> <span className="pe-small">{a.brand_name} · {new Date(a.created_at).toLocaleDateString()}</span>{a.order_id !== orderId ? <a className="adsw-link" href={`/ads/v2?order=${a.order_id}`}>↗</a> : null}</span>
                  {a.comment ? <span><span className="pe-small">{c.clientSaid}: </span>{a.comment}</span> : null}
                  {a.status === 'pending' ? <span><button type="button" className="pe-mini" onClick={() => void revoke(a.id)}>{c.revoke}</button></span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === 'formats' ? (
        <div className="pe-grid" role="tabpanel" data-kineo="ads-pe-formats">
          <p className="adsw-hint" style={{ margin: 0 }}>{c.formatsLead}</p>
          <div className="adv2-actions" style={{ marginTop: 0 }}>
            <button type="button" className="adsw-btn" disabled={busy !== null} onClick={() => void getFormats()} data-kineo="ads-pe-formats-btn">{busy === 'formats' ? c.formatsBusy : c.formatsBtn}</button>
          </div>
        </div>
      ) : null}

      {err ? <p className="adsw-err" role="alert">{err}</p> : null}

      {original || versions.length ? (
        <div style={{ marginTop: 20 }}>
          <b>{c.versions}</b> <span className="pe-small">{c.inLibrary}</span>
          <div className="pe-versions">
            {[original, ...versions].filter((v): v is VersionView => !!v).map((v) => (
              <div key={v.id} className="pe-ver" data-format={v.format} data-kineo="ads-pe-version">
                <b>{label(v)}</b>
                {v.status === 'delivered' && v.video_url ? <video src={v.video_url} controls playsInline preload="metadata" /> : null}
                {v.status === 'rendering' ? <span className="pe-small" role="status">{c.rendering}</span> : null}
                {v.status === 'failed' ? <span className="pe-small">{c.failed}</span> : null}
                {v.status === 'delivered' && v.video_url ? <a className="adsw-link" href={v.video_url} download>{c.download}</a> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
